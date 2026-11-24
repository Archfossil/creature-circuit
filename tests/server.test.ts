// The online server's protocol, end to end: two simulated browsers create and join a room, start a
// match, pass turns, and exercise the host's skip / play-for controls, the turn timer and prompts.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import WebSocket from 'ws';
import { createServer } from 'node:http';
import { createDecipheriv, createECDH, createHmac, createPublicKey, randomBytes, verify } from 'node:crypto';
// @ts-expect-error plain JavaScript
import { cleanSubscription, encrypt, vapidHeader } from '../server/push.mjs';

const PORT = 18000 + Math.floor(Math.random() * 1000);
let proc: ChildProcess;

beforeAll(async () => {
  proc = spawn(process.execPath, ['server/index.mjs'], { env: { ...process.env, PORT: String(PORT), PUSH_TEST: '1' }, stdio: 'pipe' });
  await new Promise<void>((resolve, reject) => {
    proc.stdout!.on('data', (d) => { if (String(d).includes('Creature Circuit server')) resolve(); });
    proc.on('error', reject);
    setTimeout(() => reject(new Error('server did not start')), 8000);
  });
});
afterAll(() => { proc?.kill(); });

type Msg = { type: string; [k: string]: unknown };
class Client {
  ws: WebSocket;
  inbox: Msg[] = [];
  code = '';
  private waiters: { pred: (m: Msg) => boolean; resolve: (m: Msg) => void }[] = [];
  constructor(public id: string) {
    this.ws = new WebSocket(`ws://localhost:${PORT}/ws?id=${id}`);
    this.ws.on('message', (d) => {
      const m = JSON.parse(String(d)) as Msg;
      const w = this.waiters.findIndex((x) => x.pred(m));
      if (w >= 0) { this.waiters[w].resolve(m); this.waiters.splice(w, 1); } else this.inbox.push(m);
    });
  }
  open() { return new Promise<void>((r) => this.ws.once('open', () => r())); }
  send(m: Record<string, unknown>) { this.ws.send(JSON.stringify({ ...m, code: this.code })); }
  /** The next message matching `pred` (already received, or still to come). */
  wait(pred: (m: Msg) => boolean, ms = 4000): Promise<Msg> {
    const i = this.inbox.findIndex(pred);
    if (i >= 0) return Promise.resolve(this.inbox.splice(i, 1)[0]);
    return new Promise((resolve, reject) => {
      this.waiters.push({ pred, resolve });
      setTimeout(() => reject(new Error(`timed out waiting (${this.id})`)), ms);
    });
  }
  close() { this.ws.close(); }
}

const trainer = (name: string) => ({ trainer: { name, color: '#fff' }, turn: 1, roster: [], reserve: [] });
const match = (current = 0, turn = 1) => ({ version: 1, players: [{ ...trainer('Ann'), turn }, { ...trainer('Bo'), turn }], current, rolls: {} });

describe('static files', () => {
  const get = (path: string, headers: Record<string, string> = {}) => fetch(`http://localhost:${PORT}/${path}`, { headers });
  // (dist/ may not be built where the tests run)
  const built = existsSync(new URL('../dist/assets/icons/coin.png', import.meta.url));
  it.runIf(built)('icons and type art are rechecked, and cost nothing when unchanged', async () => {
    for (const path of ['assets/icons/coin.png', 'assets/types/fire.png']) {
      const r = await get(path);
      expect([r.status, r.headers.get('cache-control'), r.headers.get('content-type')]).toEqual([200, 'no-cache', 'image/png']);
      const tag = r.headers.get('etag')!;
      expect((await get(path, { 'if-none-match': tag })).status).toBe(304);
      expect((await get(path, { 'if-none-match': `W/${tag}` })).status).toBe(304);
      expect((await get(path, { 'if-none-match': '"old"' })).status).toBe(200);
    }
  });
  it.runIf(built)('built code, which has a new name whenever it changes, is kept', async () => {
    for (const ext of ['js', 'css']) {
      const name = readdirSync(new URL('../dist/assets', import.meta.url)).find((f) => f.endsWith(`.${ext}`))!;
      expect((await get(`assets/${name}`)).headers.get('cache-control')).toContain('immutable');
    }
  });
  it('a missing icon is a 404, never the page', async () => {
    const r = await get('assets/icons/nope.png');
    expect([r.status, r.headers.get('cache-control')]).toEqual([404, 'no-store']);
  });
});

describe('online server', () => {
  it('serves a health check', async () => {
    const r = await fetch(`http://localhost:${PORT}/health`);
    expect(await r.text()).toBe('ok');
  });

  it('runs a room: lobby, start, turn hand-over, controller-only pushes, prompts, host controls and the timer', async () => {
    const a = new Client('host-a'), b = new Client('guest-b');
    await Promise.all([a.open(), b.open()]);

    // host creates a room, guest joins with the code
    a.send({ type: 'create' });
    const created = await a.wait((m) => m.type === 'created');
    a.code = b.code = String(created.code);
    expect(a.code).toMatch(/^[A-Z]{5}$/);
    b.send({ type: 'join' });
    await a.wait((m) => m.type === 'room' && (m.seats as unknown[]).length === 0);

    // both take seats; host sets a timer and starts
    a.send({ type: 'seat', trainer: trainer('Ann') });
    await a.wait((m) => m.type === 'room' && (m.seats as unknown[]).length === 1);
    b.send({ type: 'seat', trainer: trainer('Bo') });
    await a.wait((m) => m.type === 'room' && (m.seats as unknown[]).length === 2);
    b.send({ type: 'start', match: match() }); // only the host may start
    a.send({ type: 'start', match: match() });
    const started = await b.wait((m) => m.type === 'room' && m.started === true);
    expect(started.controller).toBe('host-a'); // seat 0 belongs to the host
    await b.wait((m) => m.type === 'state');

    // a waiting trainer tends their own creatures: the edit goes to whoever runs the turn
    b.send({ type: 'edit', seat: 1, edit: { uid: 'x1', op: 'unlock', node: 'a' } });
    expect((await a.wait((m) => m.type === 'edit')).edit).toEqual({ uid: 'x1', op: 'unlock', node: 'a' });
    b.send({ type: 'edit', seat: 0, edit: { uid: 'x1', op: 'unlock', node: 'a' } }); // not b's seat: ignored
    a.send({ type: 'feed', item: { kind: 'toast', text: 'marker' } });
    await b.wait((m) => m.type === 'feed' && (m.item as { text: string }).text === 'marker');
    expect(a.inbox.some((m) => m.type === 'edit')).toBe(false);

    // only the controller's pushes count; a push that moves the turn hands control to seat 1
    b.send({ type: 'state', match: match(1) });
    a.send({ type: 'feed', item: { kind: 'toast', text: 'hello' } });
    expect((await b.wait((m) => m.type === 'feed')).item).toMatchObject({ text: 'hello' });
    a.send({ type: 'state', match: match(1) });
    expect((await b.wait((m) => m.type === 'state')).match).toMatchObject({ current: 1 });
    expect((await a.wait((m) => m.type === 'room' && m.controller === 'guest-b')).controller).toBe('guest-b');

    // the controller can ask another seat (trade / duel); the answer comes back
    b.send({ type: 'ask', id: 'q1', seat: 0, from: 'Bo', title: 'Trade?', text: 'A trade', yes: 'Yes', no: 'No' });
    const asked = await a.wait((m) => m.type === 'ask');
    expect(asked.title).toBe('Trade?');
    a.send({ type: 'answer', id: 'q1', yes: true });
    expect((await b.wait((m) => m.type === 'answer')).yes).toBe(true);

    // a duel pick: the defender's chosen action comes back as the answer's value
    b.send({ type: 'ask', id: 'q2', seat: 0, from: 'Bo', title: '', text: '', yes: '', no: '', pick: { kind: 'duel', round: 1, moves: ['tackle'] } });
    const pickAsk = await a.wait((m) => m.type === 'ask' && m.id === 'q2');
    expect(pickAsk.pick).toMatchObject({ kind: 'duel' });
    a.send({ type: 'answer', id: 'q2', yes: true, value: { kind: 'move', move: 'tackle' } });
    expect((await b.wait((m) => m.type === 'answer' && m.id === 'q2')).value).toEqual({ kind: 'move', move: 'tackle' });
    b.send({ type: 'ask-cancel', id: 'q3', seat: 0 }); // an unanswered prompt is taken down again
    expect((await a.wait((m) => m.type === 'ask-cancel')).id).toBe('q3');

    // host skips Bo's turn: the host gets "do-skip" and control
    a.send({ type: 'host-skip' });
    expect((await a.wait((m) => m.type === 'do-skip')).seat).toBe(1);
    await a.wait((m) => m.type === 'room' && m.controller === 'host-a');
    a.send({ type: 'state', match: match(0, 2) }); // host ends it → back to seat 0
    await b.wait((m) => m.type === 'state');

    // host plays for someone
    a.send({ type: 'state', match: match(1, 2) });
    await a.wait((m) => m.type === 'room' && m.controller === 'guest-b');
    a.send({ type: 'host-play' });
    expect((await a.wait((m) => m.type === 'do-play')).seat).toBe(1);

    // a 1-second turn timer: when it runs out, the host is told to end the turn
    a.send({ type: 'settings', turnSeconds: 1 });
    expect((await a.wait((m) => m.type === 'do-skip', 4000)).reason).toBe('timeout');

    a.close(); b.close();
  });

  it('a seat owner who reconnects on their own turn takes control again', async () => {
    const a = new Client('host-c'), b = new Client('guest-d');
    await Promise.all([a.open(), b.open()]);
    a.send({ type: 'create' });
    a.code = b.code = String((await a.wait((m) => m.type === 'created')).code);
    b.send({ type: 'join' });
    a.send({ type: 'seat', trainer: trainer('Ann') });
    await a.wait((m) => m.type === 'room' && (m.seats as unknown[]).length === 1);
    b.send({ type: 'seat', trainer: trainer('Bo') });
    await a.wait((m) => m.type === 'room' && (m.seats as unknown[]).length === 2);
    a.send({ type: 'start', match: match(1) });
    await a.wait((m) => m.type === 'room' && m.controller === 'guest-d');
    b.close();
    await a.wait((m) => m.type === 'room' && m.controller === null);
    const b2 = new Client('guest-d');
    await b2.open();
    b2.code = a.code;
    b2.send({ type: 'join' });
    expect((await b2.wait((m) => m.type === 'state')).match).toMatchObject({ current: 1 });
    await b2.wait((m) => m.type === 'room' && m.controller === 'guest-d');
    a.close(); b2.close();
  });
});

describe('the Creature Circuit online', () => {
  it('isn’t timed, and each decided match goes to the trainer it belongs to', async () => {
    const a = new Client('circ-a'), b = new Client('circ-b');
    await Promise.all([a.open(), b.open()]);
    a.send({ type: 'create' });
    a.code = b.code = String((await a.wait((m) => m.type === 'created')).code);
    b.send({ type: 'join' });
    a.send({ type: 'seat', trainer: trainer('Ann') });
    await a.wait((m) => m.type === 'room' && (m.seats as unknown[]).length === 1);
    b.send({ type: 'seat', trainer: trainer('Bo') });
    await a.wait((m) => m.type === 'room' && (m.seats as unknown[]).length === 2);
    a.send({ type: 'settings', turnSeconds: 60 });
    const at = (current: number, phase: string, done: number) => ({ ...match(current), players: match(current).players.map((p: object) => ({ ...p, phase })), ...(done < 0 ? {} : { circuit: { entrants: [], winners: Array.from({ length: 7 }, (_, i) => (i < done ? 0 : null)) } }) });
    a.send({ type: 'start', match: at(0, 'map', -1) });
    expect((await a.wait((m) => m.type === 'room' && m.started === true && m.controller === 'circ-a')).deadline).toBeTruthy();
    a.send({ type: 'state', match: at(0, 'endgame', 0) });
    expect((await a.wait((m) => m.type === 'room' && m.started === true && m.deadline === null)).controller).toBe('circ-a');
    a.send({ type: 'state', match: at(1, 'endgame', 1) });
    await b.wait((m) => m.type === 'room' && m.controller === 'circ-b');
    a.send({ type: 'host-skip' }); // away: the host sends in a bot for them…
    expect((await a.wait((m) => m.type === 'do-skip')).seat).toBe(1);
    await b.wait((m) => m.type === 'room' && m.controller === 'circ-a');
    a.send({ type: 'state', match: at(1, 'endgame', 2) }); // …and their next match is theirs again
    await b.wait((m) => m.type === 'room' && m.controller === 'circ-b');
    a.ws.close(); b.ws.close();
  });
});

describe('server push', () => {
  const b64 = (b: Uint8Array) => Buffer.from(b).toString('base64url');
  const un64 = (t: string) => Buffer.from(t, 'base64url');
  it('encrypts exactly as the published example (RFC 8291, appendix A)', () => {
    const sub = { keys: { p256dh: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4', auth: 'BTBZMqHH6r4Tts7J_aSIgg' } };
    const out = encrypt(sub, 'When I grow up, I want to be a watermelon', { privateKey: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw', salt: 'DGv6ra1nlYgDCS1FRnbzlw' });
    expect(b64(out)).toBe('DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN');
  });
  it('signs with a key the push service can check', () => {
    const m = /^vapid t=([\w-]+)\.([\w-]+)\.([\w-]+), k=([\w-]+)$/.exec(vapidHeader('https://fcm.googleapis.com/fcm/send/abc'))!;
    const claims = JSON.parse(un64(m[2]).toString());
    expect(claims.aud).toBe('https://fcm.googleapis.com');
    expect(claims.exp * 1000).toBeGreaterThan(Date.now());
    expect(claims.sub).toMatch(/^(https|mailto):/);
    const pub = un64(m[4]);
    const key = createPublicKey({ format: 'jwk', key: { kty: 'EC', crv: 'P-256', x: b64(pub.subarray(1, 33)), y: b64(pub.subarray(33)) } });
    expect(verify('sha256', Buffer.from(`${m[1]}.${m[2]}`), { key, dsaEncoding: 'ieee-p1363' }, un64(m[3]))).toBe(true);
  });
  it('only posts to real push services', () => {
    const ec = createECDH('prime256v1'); ec.generateKeys();
    const keys = { p256dh: b64(ec.getPublicKey()), auth: b64(randomBytes(16)) };
    const ok = (endpoint: string, k: unknown = keys) => !!cleanSubscription({ endpoint, keys: k }, false);
    for (const e of ['https://fcm.googleapis.com/fcm/send/x', 'https://updates.push.services.mozilla.com/wpush/v2/x', 'https://wns2-by3p.notify.windows.com/w/?token=x', 'https://web.push.apple.com/x']) expect(ok(e), e).toBe(true);
    for (const e of ['http://fcm.googleapis.com/x', 'https://evil.com/fcm.googleapis.com', 'https://fcm.googleapis.com.evil.com/x', 'https://localhost/x', 'http://169.254.169.254/latest', 'https://fcm.googleapis.com:8443/x', 'https://a@fcm.googleapis.com/x', 'https://notify.windows.com.evil.com/', 'nonsense']) expect(ok(e), e).toBe(false);
    expect(ok('https://fcm.googleapis.com/x', { p256dh: 'AAAA', auth: 'BBBB' })).toBe(false);
    expect(cleanSubscription(null, false)).toBeNull();
  });
  it('pushes a turn and an offer to whoever asked, even with their tab closed, and stops when told', async () => {
    const got: { path: string; text: string }[] = [];
    const mk = () => { const ec = createECDH('prime256v1'); ec.generateKeys(); return { ec, auth: randomBytes(16) }; };
    const bo = mk();
    const hmac = (k: Uint8Array, d: Uint8Array) => createHmac('sha256', k).update(d).digest();
    const open = (body: Buffer) => { // as the browser does
      const salt = body.subarray(0, 16), theirs = body.subarray(21, 86), data = body.subarray(86);
      const ikm = hmac(hmac(bo.auth, bo.ec.computeSecret(theirs)), Buffer.concat([Buffer.from('WebPush: info\0'), bo.ec.getPublicKey(), theirs, Buffer.from([1])]));
      const prk = hmac(salt, ikm);
      const d = createDecipheriv('aes-128-gcm', hmac(prk, Buffer.from('Content-Encoding: aes128gcm\0\x01')).subarray(0, 16), hmac(prk, Buffer.from('Content-Encoding: nonce\0\x01')).subarray(0, 12));
      d.setAuthTag(data.subarray(-16));
      return Buffer.concat([d.update(data.subarray(0, -16)), d.final()]).subarray(0, -1).toString();
    };
    let gone = false;
    const service = createServer((req, res) => { const parts: Buffer[] = []; req.on('data', (x) => parts.push(x)); req.on('end', () => { if (gone) { res.writeHead(410); res.end(); return; } got.push({ path: req.url!, text: open(Buffer.concat(parts)) }); res.writeHead(201); res.end(); }); });
    await new Promise<void>((r) => service.listen(0, r));
    const port = (service.address() as { port: number }).port;
    const until = async (n: number) => { for (let i = 0; i < 60 && got.length < n; i++) await new Promise((r) => setTimeout(r, 50)); };
    const a = new Client('host-p'), b = new Client('guest-p');
    await Promise.all([a.open(), b.open()]);
    a.send({ type: 'create' });
    a.code = b.code = String((await a.wait((m) => m.type === 'created')).code);
    expect(String((await a.wait((m) => m.type === 'push-key')).key).length).toBeGreaterThan(80);
    b.send({ type: 'join' });
    await b.wait((m) => m.type === 'push-key');
    a.send({ type: 'seat', trainer: trainer('Ann') });
    await a.wait((m) => m.type === 'room' && (m.seats as unknown[]).length === 1);
    b.send({ type: 'seat', trainer: trainer('Bo') });
    await a.wait((m) => m.type === 'room' && (m.seats as unknown[]).length === 2);
    b.send({ type: 'push-sub', sub: { endpoint: `http://localhost:${port}/bo`, keys: { p256dh: b64(bo.ec.getPublicKey()), auth: b64(bo.auth) } } });
    a.send({ type: 'start', match: match(0) });
    await a.wait((m) => m.type === 'room' && m.controller === 'host-p');
    a.send({ type: 'ask', id: 'q', seat: 1, from: 'Ann', title: '', text: '', yes: '', no: '' });
    await until(1);
    expect(JSON.parse(got[0].text)).toEqual({ text: 'Ann is waiting for your answer.', room: a.code });
    b.close();
    await a.wait((m) => m.type === 'room' && (m.seats as { online: boolean }[])[1]?.online === false);
    a.send({ type: 'state', match: match(1) });
    await until(2);
    expect(got[1]).toEqual({ path: '/bo', text: JSON.stringify({ text: 'Bo, it’s your turn!', room: a.code }) });
    // told to stop
    const b2 = new Client('guest-p'); await b2.open(); b2.code = a.code; b2.send({ type: 'join' });
    await b2.wait((m) => m.type === 'room' && m.controller === 'guest-p');
    b2.send({ type: 'push-sub', sub: null });
    b2.send({ type: 'state', match: match(0, 2) });
    await a.wait((m) => m.type === 'room' && m.controller === 'host-p');
    a.send({ type: 'state', match: match(1, 2) });
    await new Promise((r) => setTimeout(r, 400));
    expect(got.length).toBe(2);
    gone = true;
    a.close(); b2.close(); service.close();
  });
});
