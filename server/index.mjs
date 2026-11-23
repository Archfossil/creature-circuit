// Creature Circuit online server: serves the built game (dist/) and relays turn-based multiplayer
// over WebSockets at /ws. Game rules run in the browsers; the server keeps each room's latest match
// snapshot, decides who controls the turn (the seat's owner, or the host when they "play for" or
// skip someone), runs the optional turn timer, and forwards spectator feeds and trade/duel prompts.
//
// Rooms live in memory: a restart (or a sleeping free Render instance) forgets them, so every
// browser also keeps the match locally and the host can re-open the room from that copy.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT) || 8787;
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const MAX_MSG = 4 * 1024 * 1024; // a full 6-trainer match snapshot is well under this
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

// ── Static files ────────────────────────────────────────────────
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  if (url.pathname === '/health') { res.writeHead(200, { 'content-type': 'text/plain' }); res.end('ok'); return; }
  let path = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
  if (path.includes('..')) { res.writeHead(400); res.end(); return; }
  let file = join(DIST, path || 'index.html');
  try { if ((await stat(file)).isDirectory()) file = join(file, 'index.html'); } catch { file = join(DIST, 'index.html'); }
  try {
    const body = await readFile(file);
    const type = MIME[extname(file).toLowerCase()] ?? 'application/octet-stream';
    res.writeHead(200, { 'content-type': type, 'cache-control': file.includes('assets') ? 'public, max-age=31536000, immutable' : 'no-cache' });
    res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
});

// ── Rooms ───────────────────────────────────────────────────────
/** @type {Map<string, Room>} */
const rooms = new Map();
/**
 * @typedef {{ clientId: string, name: string, trainer: object | null }} Seat
 * @typedef {{ code: string, host: string, seats: Seat[], started: boolean, match: any, controller: string | null,
 *   turnSeconds: number, deadline: number | null, timer: NodeJS.Timeout | null, sockets: Map<string, import('ws').WebSocket>, touched: number }} Room
 */
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const newCode = () => { let c; do { c = Array.from({ length: 5 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join(''); } while (rooms.has(c)); return c; };

const send = (ws, msg) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg)); };
const broadcast = (room, msg, except) => { for (const [id, ws] of room.sockets) if (id !== except) send(ws, msg); };
const connected = (room, clientId) => room.sockets.has(clientId);

/** Room info everyone needs: seats, who's connected, host, controller, timer. (No match: that's sent separately.) */
function roomInfo(room) {
  return {
    type: 'room', code: room.code, host: room.host, started: room.started, controller: room.controller,
    turnSeconds: room.turnSeconds, deadline: room.deadline,
    seats: room.seats.map((s) => ({ clientId: s.clientId, name: s.name, trainer: s.trainer, online: connected(room, s.clientId) })),
  };
}

/** Whose seat is it now, and who controls it: its owner if they're here, otherwise nobody until the host steps in. */
function resetControl(room) {
  const seat = room.match ? room.seats[room.match.current] : null;
  room.controller = seat && connected(room, seat.clientId) ? seat.clientId : null;
  armTimer(room);
  flushEdits(room);
}

/**
 * Creature edits from trainers who aren't playing (progression, playbooks) go to whoever runs the
 * current turn, who applies them to the match. With nobody in control they wait here.
 */
function flushEdits(room) {
  if (!room.controller || !connected(room, room.controller) || !room.edits?.length) return;
  const ws = room.sockets.get(room.controller);
  for (const e of room.edits.splice(0)) send(ws, { type: 'edit', seat: e.seat, edit: e.edit });
}

function armTimer(room) {
  if (room.timer) clearTimeout(room.timer);
  room.timer = null;
  room.deadline = room.started && room.turnSeconds > 0 ? Date.now() + room.turnSeconds * 1000 : null;
  if (room.deadline) room.timer = setTimeout(() => timeUp(room), room.turnSeconds * 1000);
}

/** The turn timer ran out: the host (or anyone still here) ends the turn on the player's behalf. */
function timeUp(room) {
  const executor = connected(room, room.host) ? room.host : [...room.sockets.keys()][0];
  if (!executor || !room.match) return;
  room.controller = executor;
  room.deadline = null;
  // tell the executor first, so it ends the turn instead of starting to play it
  send(room.sockets.get(executor), { type: 'do-skip', seat: room.match.current, reason: 'timeout' });
  broadcast(room, roomInfo(room));
  flushEdits(room);
}

function handle(ws, clientId, msg) {
  const room = msg.code ? rooms.get(msg.code) : null;
  switch (msg.type) {
    case 'ping': send(ws, { type: 'pong' }); return null; // a returning browser checking its connection is real
    case 'create': {
      const r = { code: newCode(), host: clientId, seats: [], started: false, match: null, controller: null, turnSeconds: 0, deadline: null, timer: null, sockets: new Map(), touched: Date.now() };
      // re-opening a saved online match: seats come back with their owners
      if (msg.match && Array.isArray(msg.match.players) && Array.isArray(msg.owners)) {
        r.match = msg.match;
        r.started = true;
        r.turnSeconds = Number(msg.turnSeconds) || 0;
        r.seats = msg.match.players.map((p, i) => ({ clientId: msg.owners[i] ?? '', name: p.trainer?.name ?? `Trainer ${i + 1}`, trainer: null }));
      }
      rooms.set(r.code, r);
      r.sockets.set(clientId, ws);
      send(ws, { type: 'created', code: r.code });
      if (r.started) { resetControl(r); send(ws, { type: 'state', match: r.match }); }
      send(ws, roomInfo(r));
      return r;
    }
    case 'join': {
      if (!room) { send(ws, { type: 'error', text: 'No room with that code. Check it, or ask the host to open it again.' }); return null; }
      room.sockets.set(clientId, ws);
      if (room.started && room.match) {
        // a seat owner coming back while it's their turn takes control again
        const seat = room.seats[room.match.current];
        if (seat?.clientId === clientId && !room.controller) room.controller = clientId;
      }
      // who's in control first, so a browser coming back knows whether its own copy is the live one
      broadcast(room, roomInfo(room));
      if (room.started && room.match) send(ws, { type: 'state', match: room.match });
      flushEdits(room);
      return room;
    }
    default:
      if (!room || !room.sockets.has(clientId)) { send(ws, { type: 'error', text: 'Join a room first.' }); return null; }
  }
  room.touched = Date.now();
  const isHost = clientId === room.host;
  switch (msg.type) {
    case 'seat': { // lobby: add or update my trainer
      if (room.started) return room;
      const mine = room.seats.find((s) => s.clientId === clientId);
      if (mine) { mine.trainer = msg.trainer; mine.name = msg.trainer?.trainer?.name ?? mine.name; }
      else if (room.seats.length < 6) room.seats.push({ clientId, name: msg.trainer?.trainer?.name ?? 'Trainer', trainer: msg.trainer });
      broadcast(room, roomInfo(room));
      return room;
    }
    case 'leave-seat': {
      if (room.started) return room;
      room.seats = room.seats.filter((s) => s.clientId !== clientId);
      broadcast(room, roomInfo(room));
      return room;
    }
    case 'settings': {
      if (!isHost) return room;
      room.turnSeconds = Math.max(0, Math.min(3600, Number(msg.turnSeconds) || 0));
      if (room.started) armTimer(room);
      broadcast(room, roomInfo(room));
      return room;
    }
    case 'start': {
      if (!isHost || room.started || !msg.match) return room;
      room.match = msg.match;
      room.started = true;
      resetControl(room);
      broadcast(room, { type: 'state', match: room.match });
      broadcast(room, roomInfo(room));
      return room;
    }
    case 'state': { // the controller pushes the match after every action
      if (clientId !== room.controller || !msg.match) return room;
      const turnChanged = !room.match || room.match.current !== msg.match.current || room.match.players[room.match.current]?.turn !== msg.match.players[room.match.current]?.turn;
      const seatChanged = !room.match || room.match.current !== msg.match.current;
      room.match = msg.match;
      broadcast(room, { type: 'state', match: room.match }, clientId);
      if (seatChanged || turnChanged) { resetControl(room); broadcast(room, roomInfo(room)); }
      return room;
    }
    case 'feed': { // spectator feed: toasts, dice, hops, battle events
      if (clientId !== room.controller) return room;
      broadcast(room, { type: 'feed', item: msg.item }, clientId);
      return room;
    }
    case 'ask': { // a trade or duel prompt for another seat's owner
      const seat = room.seats[msg.seat];
      if (clientId !== room.controller || !seat) return room;
      if (!connected(room, seat.clientId)) { send(ws, { type: 'answer', id: msg.id, yes: false, offline: true }); return room; }
      send(room.sockets.get(seat.clientId), { type: 'ask', id: msg.id, from: msg.from, title: msg.title, text: msg.text, yes: msg.yes, no: msg.no, pick: msg.pick });
      return room;
    }
    case 'answer': {
      if (room.controller) send(room.sockets.get(room.controller), { type: 'answer', id: msg.id, yes: !!msg.yes, value: msg.value });
      return room;
    }
    case 'edit': { // a seat owner tends their own creatures while someone else plays
      const seat = Number(msg.seat);
      if (!room.started || room.seats[seat]?.clientId !== clientId || !msg.edit || typeof msg.edit !== 'object') return room;
      (room.edits ??= []).push({ seat, edit: msg.edit });
      if (room.edits.length > 200) room.edits.shift();
      flushEdits(room);
      return room;
    }
    case 'host-skip':
    case 'host-play': {
      if (!isHost || !room.started || !room.match) return room;
      room.controller = clientId;
      if (msg.type === 'host-skip') room.deadline = null;
      send(ws, { type: msg.type === 'host-skip' ? 'do-skip' : 'do-play', seat: room.match.current, reason: 'host' });
      broadcast(room, roomInfo(room));
      flushEdits(room);
      return room;
    }
    default:
      return room;
  }
}

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: MAX_MSG });
wss.on('connection', (ws, req) => {
  const clientId = new URL(req.url ?? '/ws', 'http://x').searchParams.get('id')?.slice(0, 40) || Math.random().toString(36).slice(2);
  let room = null;
  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(String(data)); } catch { return; }
    if (!msg || typeof msg.type !== 'string') return;
    const r = handle(ws, clientId, msg);
    if (r) room = r;
  });
  ws.on('close', () => {
    if (!room || room.sockets.get(clientId) !== ws) return;
    room.sockets.delete(clientId);
    if (room.controller === clientId) room.controller = null; // the host can step in (skip or play for them)
    broadcast(room, roomInfo(room));
  });
});

// forget rooms nobody has touched for a day
setInterval(() => {
  const cutoff = Date.now() - 24 * 3600 * 1000;
  for (const [code, r] of rooms) if (!r.sockets.size && r.touched < cutoff) { if (r.timer) clearTimeout(r.timer); rooms.delete(code); }
}, 3600 * 1000).unref();

server.listen(PORT, () => console.log(`Creature Circuit server on http://localhost:${PORT} (WebSocket /ws)`));
