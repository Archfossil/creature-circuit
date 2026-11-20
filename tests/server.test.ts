// The online server's protocol, end to end: two simulated browsers create and join a room, start a
// match, pass turns, and exercise the host's skip / play-for controls, the turn timer and prompts.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import WebSocket from 'ws';

const PORT = 18000 + Math.floor(Math.random() * 1000);
let proc: ChildProcess;

beforeAll(async () => {
  proc = spawn(process.execPath, ['server/index.mjs'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'pipe' });
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
