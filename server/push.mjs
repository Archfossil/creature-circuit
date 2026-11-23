// Web Push: tells a browser's push service to wake its service worker, so a turn reaches a player whose tab
// is closed or asleep. Built on Node's own crypto (no dependency): messages are encrypted for the
// subscriber (RFC 8291, aes128gcm) and signed with this server's VAPID key (RFC 8292).
import { createCipheriv, createECDH, createHmac, createPrivateKey, randomBytes, sign } from 'node:crypto';

const b64 = (buf) => Buffer.from(buf).toString('base64url');
const un64 = (text) => Buffer.from(String(text), 'base64url');
const hmac = (key, data) => createHmac('sha256', key).update(data).digest();

// ── Who may be told ─────────────────────────────────────────────
/** The browsers' push services. Subscriptions come from clients, so the server won't post anywhere else. */
const SERVICES = [/^fcm\.googleapis\.com$/, /^([\w-]+\.)*push\.services\.mozilla\.com$/, /^([\w-]+\.)+notify\.windows\.com$/, /^([\w-]+\.)*push\.apple\.com$/];
/** A subscription in the shape we store, or null if it isn't a real one. `test` also allows this computer (tests). */
export function cleanSubscription(sub, test = !!process.env.PUSH_TEST) {
  try {
    const url = new URL(sub.endpoint);
    const local = test && url.hostname === 'localhost';
    if (String(sub.endpoint).length > 1000 || url.username || url.password || (!local && (url.protocol !== 'https:' || url.port || !SERVICES.some((s) => s.test(url.hostname))))) return null;
    const p256dh = un64(sub.keys.p256dh), auth = un64(sub.keys.auth);
    if (p256dh.length !== 65 || p256dh[0] !== 4 || auth.length !== 16) return null;
    return { endpoint: url.href, keys: { p256dh: b64(p256dh), auth: b64(auth) } };
  } catch { return null; }
}

// ── Keys ────────────────────────────────────────────────────────
/**
 * This server's signing key. Rooms are only in memory, so a fresh key each start is fine (browsers
 * subscribe again when it changes); set VAPID_PRIVATE (32 bytes, base64url) to keep one.
 */
function makeKeys() {
  const ec = createECDH('prime256v1');
  const given = process.env.VAPID_PRIVATE ? un64(process.env.VAPID_PRIVATE) : null;
  if (given?.length === 32) ec.setPrivateKey(given); else ec.generateKeys();
  const pub = ec.getPublicKey(), priv = Buffer.alloc(32);
  const d = ec.getPrivateKey();
  d.copy(priv, 32 - d.length); // (leading zeros are dropped)
  return { pub: b64(pub), key: createPrivateKey({ format: 'jwk', key: { kty: 'EC', crv: 'P-256', d: b64(priv), x: b64(pub.subarray(1, 33)), y: b64(pub.subarray(33)) } }) };
}
const keys = makeKeys();
/** The public key browsers subscribe with. */
export const publicKey = keys.pub;

/** The Authorization header a push service checks. */
export function vapidHeader(endpoint, now = Date.now()) {
  const part = (o) => b64(JSON.stringify(o));
  const subject = process.env.VAPID_SUBJECT || process.env.RENDER_EXTERNAL_URL || 'https://creature-circuit.onrender.com';
  const text = `${part({ typ: 'JWT', alg: 'ES256' })}.${part({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: subject })}`;
  return `vapid t=${text}.${b64(sign('sha256', Buffer.from(text), { key: keys.key, dsaEncoding: 'ieee-p1363' }))}, k=${keys.pub}`;
}

// ── Encryption (RFC 8291) ───────────────────────────────────────
/** The body to post: `text` encrypted so only that browser can read it. (`fixed` is for the published test vector.) */
export function encrypt(sub, text, fixed = {}) {
  const ec = createECDH('prime256v1');
  if (fixed.privateKey) ec.setPrivateKey(un64(fixed.privateKey)); else ec.generateKeys();
  const salt = fixed.salt ? un64(fixed.salt) : randomBytes(16);
  const theirs = un64(sub.keys.p256dh), ours = ec.getPublicKey();
  const ikm = hmac(hmac(un64(sub.keys.auth), ec.computeSecret(theirs)), Buffer.concat([Buffer.from('WebPush: info\0'), theirs, ours, Buffer.from([1])]));
  const prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.from('Content-Encoding: aes128gcm\0\x01')).subarray(0, 16);
  const nonce = hmac(prk, Buffer.from('Content-Encoding: nonce\0\x01')).subarray(0, 12);
  const c = createCipheriv('aes-128-gcm', cek, nonce);
  const body = Buffer.concat([c.update(Buffer.concat([Buffer.from(text), Buffer.from([2])])), c.final(), c.getAuthTag()]);
  const head = Buffer.alloc(21);
  salt.copy(head);
  head.writeUInt32BE(4096, 16);
  head[20] = ours.length;
  return Buffer.concat([head, ours, body]);
}

/** Send a push. Resolves 'sent', 'gone' (the subscription has ended) or 'failed'. */
export async function push(sub, payload, ttl = 3600) {
  try {
    const res = await fetch(sub.endpoint, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10_000),
      headers: { authorization: vapidHeader(sub.endpoint), 'content-encoding': 'aes128gcm', 'content-type': 'application/octet-stream', ttl: String(ttl), urgency: 'high' },
      body: encrypt(sub, JSON.stringify(payload)),
    });
    return res.ok ? 'sent' : res.status === 404 || res.status === 410 || res.status === 403 ? 'gone' : 'failed';
  } catch { return 'failed'; }
}
