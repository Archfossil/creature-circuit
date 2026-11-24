// Elemental attacks in battle, one look per type: a fireball, lightning from above, a moonbeam, zig-zagging
// charm wisps, vines and leaves, a water jet, falling rocks, and spinning steel blades. Each builds what it
// needs in its own group, plays, and is thrown away.
import * as THREE from 'three';
import { isMobile } from './engine';
import type { ElementType } from '../data/schema';

/** What an effect needs from the battle scene. */
export interface FxStage {
  scene: THREE.Scene;
  tween: (dur: number, fn: (k: number) => void) => Promise<void>;
  burst: (at: THREE.Vector3, color: string, count: number, speed: number, life?: number, up?: boolean) => void;
  shake: (n: number) => void;
}
type Effect = (fx: FxStage, g: THREE.Group, from: THREE.Vector3, to: THREE.Vector3) => Promise<void>;

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const few = (n: number) => (isMobile ? Math.ceil(n * 0.6) : n);
const rnd = (n: number) => (Math.random() - 0.5) * 2 * n;
const ease = (k: number) => 1 - Math.pow(1 - k, 3);
const UP = V(0, 1, 0);

// (plain blending: added light turns every colour white against a daytime arena)
const glow = (color: string, opacity = 0.9) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
const solid = (color: string, emissive = 0, metal = 0) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: metal ? 0.35 : 0.8, metalness: metal, emissive: new THREE.Color(color), emissiveIntensity: emissive, side: THREE.DoubleSide, transparent: true });
const add = <T extends THREE.Object3D>(g: THREE.Group, o: T): T => { g.add(o); return o; };
const fade = (o: THREE.Object3D, n: number) => { const m = (o as THREE.Mesh).material as THREE.Material | undefined; if (m) m.opacity = n; };

/** A crescent, flat, about `r` across. */
function crescent(r: number): THREE.ShapeGeometry {
  const s = new THREE.Shape();
  s.absarc(0, 0, r, 0.6, Math.PI * 2 - 0.6, false);
  s.absarc(r * 0.42, 0, r * 0.72, Math.PI * 2 - 0.85, 0.85, true);
  return new THREE.ShapeGeometry(s, 20);
}
function heart(r: number): THREE.ShapeGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, -r);
  s.bezierCurveTo(-r * 1.5, r * 0.1, -r * 0.8, r * 1.1, 0, r * 0.35);
  s.bezierCurveTo(r * 0.8, r * 1.1, r * 1.5, r * 0.1, 0, -r);
  return new THREE.ShapeGeometry(s, 8);
}
function leaf(r: number): THREE.ShapeGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, -r);
  s.quadraticCurveTo(r * 0.75, 0, 0, r);
  s.quadraticCurveTo(-r * 0.75, 0, 0, -r);
  return new THREE.ShapeGeometry(s, 6);
}

const fire: Effect = async (fx, g, from, to) => {
  const core = add(g, new THREE.Mesh(new THREE.IcosahedronGeometry(0.33, 1), new THREE.MeshBasicMaterial({ color: '#ffc21a' })));
  const shell = add(g, new THREE.Mesh(new THREE.IcosahedronGeometry(0.52, 1), glow('#ff3a00', 0.42)));
  core.add(new THREE.PointLight('#ff8a2a', 10, 7));
  // embers left behind along the way: each swells, then burns out
  const embers = Array.from({ length: few(22) }, () => { const m = add(g, new THREE.Mesh(new THREE.TetrahedronGeometry(0.3), glow('#ffb03a'))); m.visible = false; return { m, born: -1, v: V(0, 0, 0) }; });
  let next = 0;
  const trail = (k: number) => {
    for (const e of embers) {
      if (e.born < 0) continue;
      const a = (k - e.born) * 3;
      if (a > 1) { e.m.visible = false; continue; }
      e.m.position.addScaledVector(e.v, 0.02);
      e.m.scale.setScalar(1.2 - a); e.m.rotation.x += 0.2;
      (e.m.material as THREE.MeshBasicMaterial).color.set(a < 0.4 ? '#ffd25a' : a < 0.7 ? '#ff6a1a' : '#b02a10');
      fade(e.m, 0.9 * (1 - a));
    }
  };
  // gather, then throw
  await fx.tween(0.16, (k) => { for (const m of [core, shell]) { m.position.copy(from); m.scale.setScalar(ease(k)); } });
  await fx.tween(0.4, (k) => {
    const p = from.clone().lerp(to, k * k * 0.35 + k * 0.65);
    p.y += Math.sin(k * Math.PI) * 0.9;
    core.position.copy(p); shell.position.copy(p);
    core.rotation.set(k * 9, k * 6, 0); shell.rotation.set(-k * 7, k * 8, 0);
    shell.scale.setScalar(1 + Math.sin(k * 40) * 0.16);
    const e = embers[next++ % embers.length];
    e.m.visible = true; e.born = k; e.m.position.copy(p).add(V(rnd(0.18), rnd(0.18), rnd(0.18))); e.v.set(rnd(1), 1 + Math.random(), rnd(1));
    trail(k);
  });
  core.visible = shell.visible = false;
  fx.shake(0.22);
  fx.burst(to, '#ff8a2a', few(46), 5); fx.burst(to, '#ffe07a', few(20), 3, 0.5); fx.burst(to.clone().setY(0.2), '#ff5a1a', few(16), 2.4, 0.8, true);
  const ball = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), glow('#ff9a3a', 0.8)));
  ball.position.copy(to);
  await fx.tween(0.22, (k) => { ball.scale.setScalar(0.6 + ease(k) * 2.2); fade(ball, 0.8 * (1 - k)); for (const e of embers) fade(e.m, 0); });
};

/** A jagged bolt between two points, as a chain of thin boxes. */
function boltParts(a: THREE.Vector3, b: THREE.Vector3, jag: number, n: number): [THREE.Vector3, THREE.Vector3][] {
  const pts = Array.from({ length: n + 1 }, (_, i) => a.clone().lerp(b, i / n).add(i === 0 || i === n ? V(0, 0, 0) : V(rnd(jag), rnd(jag * 0.3), rnd(jag))));
  return pts.slice(1).map((p, i) => [pts[i], p]);
}
const electric: Effect = async (fx, g, from, to) => {
  const box = new THREE.BoxGeometry(1, 1, 1);
  const core = new THREE.MeshBasicMaterial({ color: '#fffbe0', transparent: true, depthTest: false }), halo = glow('#f5b400', 0.8);
  const light = add(g, new THREE.PointLight('#fff2a0', 0, 14)); light.position.copy(to).setY(2.4);
  const layer = add(g, new THREE.Group());
  const draw = (strokes: [THREE.Vector3, THREE.Vector3, number][]) => {
    layer.clear();
    for (const [a, b, w] of strokes) for (const [m, k] of [[core, 1], [halo, 3]] as const) {
      const s = new THREE.Mesh(box, m);
      s.position.copy(a).lerp(b, 0.5);
      s.scale.set(w * k, a.distanceTo(b) * 1.04, w * k);
      s.quaternion.setFromUnitVectors(UP, b.clone().sub(a).normalize());
      s.renderOrder = k === 1 ? 2 : 1;
      layer.add(s);
    }
  };
  // crackle on the caster
  await fx.tween(0.16, () => { const c = from.clone(); draw(Array.from({ length: 4 }, (): [THREE.Vector3, THREE.Vector3, number] => [c.clone().add(V(rnd(0.6), rnd(0.6), rnd(0.6))), c.clone().add(V(rnd(0.6), rnd(0.6), rnd(0.6))), 0.02])); });
  // three strikes, the last the biggest
  for (let i = 0; i < 3; i++) {
    const top = to.clone().add(V(rnd(1.2), 5.2, rnd(0.8) - 0.4)), w = i === 2 ? 0.08 : 0.05;
    fx.shake(i === 2 ? 0.26 : 0.1);
    fx.burst(to.clone().setY(0.3), '#ffe95c', few(i === 2 ? 34 : 12), 4, 0.5);
    let last = -1;
    await fx.tween(i === 2 ? 0.2 : 0.1, (k) => {
      const f = Math.floor(k * 4);
      if (f !== last) {
        last = f;
        const main = boltParts(top, to.clone().setY(0.1), 0.42, 9);
        const fork = boltParts(main[4][0], main[4][0].clone().add(V(rnd(1.4), -1.6, rnd(1))), 0.25, 4);
        draw([...main.map(([a, b]): [THREE.Vector3, THREE.Vector3, number] => [a, b, w]), ...fork.map(([a, b]): [THREE.Vector3, THREE.Vector3, number] => [a, b, w * 0.5])]);
      }
      light.intensity = (1 - k) * 40;
      layer.visible = k < 0.9;
    });
  }
  // sparks crawl over the target
  await fx.tween(0.16, (k) => { light.intensity = 0; layer.visible = true; draw(Array.from({ length: 5 }, (): [THREE.Vector3, THREE.Vector3, number] => { const a = to.clone().add(V(rnd(0.7), rnd(0.6), rnd(0.7))); return [a, a.clone().add(V(rnd(0.5), rnd(0.5), rnd(0.5))), 0.025 * (1 - k)]; })); });
};

const astral: Effect = async (fx, g, _from, to) => {
  const sky = to.clone().setY(3.1);
  const moon = add(g, new THREE.Mesh(crescent(0.75), new THREE.MeshBasicMaterial({ color: '#fff6c8', transparent: true, side: THREE.DoubleSide })));
  const ring = add(g, new THREE.Mesh(new THREE.CircleGeometry(1.25, 32), glow('#4a2a8a', 0.55)));
  moon.position.copy(sky); ring.position.copy(sky).add(V(0, 0, -0.05));
  const beam = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.0, 3.1, 24, 1, true), Object.assign(glow('#9a5cff', 0), { side: THREE.DoubleSide })));
  const inner = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.55, 3.1, 20, 1, true), Object.assign(glow('#e6d6ff', 0), { side: THREE.DoubleSide })));
  for (const b of [beam, inner]) b.position.copy(to).setY(1.55);
  const pool = add(g, new THREE.Mesh(new THREE.RingGeometry(0.2, 1.2, 32), Object.assign(glow('#8a4dff', 0), { side: THREE.DoubleSide })));
  pool.rotation.x = -Math.PI / 2; pool.position.copy(to).setY(0.04);
  const stars = Array.from({ length: few(18) }, () => ({ m: add(g, new THREE.Mesh(new THREE.OctahedronGeometry(0.07 + Math.random() * 0.06), glow('#fff0a8'))), a: Math.random() * 6.28, r: 0.2 + Math.random() * 0.7, o: Math.random() }));
  const starsAt = (k: number, show: number) => { for (const s of stars) { const t = (k * 1.6 + s.o) % 1; s.m.position.set(to.x + Math.cos(s.a + t * 3) * s.r, 3 * (1 - t), to.z + Math.sin(s.a + t * 3) * s.r); s.m.rotation.y = t * 8; fade(s.m, show); } };
  // the moon rises
  await fx.tween(0.26, (k) => { const e = ease(k); moon.scale.setScalar(e); ring.scale.setScalar(e); moon.rotation.z = (1 - e) * 1.2 + 0.4; starsAt(0, 0); });
  // and its beam pours down
  let hit = false;
  await fx.tween(0.55, (k) => {
    const n = Math.min(1, k * 4) * (k > 0.75 ? (1 - k) * 4 : 1);
    fade(beam, 0.42 * n); fade(inner, 0.4 * n); fade(pool, 0.7 * n);
    beam.scale.set(1 + Math.sin(k * 22) * 0.05, 1, 1 + Math.sin(k * 22) * 0.05);
    pool.scale.setScalar(0.6 + ease(k) * 0.7);
    starsAt(k, n);
    if (!hit && k > 0.25) { hit = true; fx.shake(0.15); fx.burst(to, '#c9a8ff', few(34), 3.4, 0.8); fx.burst(to.clone().setY(0.2), '#ffffff', few(16), 2, 0.8, true); }
  });
  await fx.tween(0.12, (k) => { moon.scale.setScalar(1 - k * 0.4); fade(moon, 1 - k); fade(ring, 0.55 * (1 - k)); });
};

const charm: Effect = async (fx, g, from, to) => {
  const dir = to.clone().sub(from), side = V(-dir.z, 0, dir.x).normalize();
  const COLORS = ['#ff5fb8', '#ff9fd8', '#b85cff'];
  // three wisps, each a head and a tail that follows its zig-zag
  const wisps = COLORS.map((color, w) => {
    const n = few(16);
    return { w, color, dots: Array.from({ length: n }, (_, i) => add(g, new THREE.Mesh(new THREE.SphereGeometry(i ? 0.13 * (1 - i / n) + 0.03 : 0.2, 8, 6), glow(color, i ? 0.75 * (1 - i / n) : 1)))) };
  });
  const zig = (x: number) => 2 * Math.abs(2 * (x - Math.floor(x + 0.5))) - 1; // a triangle wave
  const at = (k: number, w: number) => {
    const t = Math.max(0, Math.min(1, k)), width = 0.75 * Math.sin(t * Math.PI) + 0.06;
    const a = t * 3 + w / 3;
    return from.clone().addScaledVector(dir, t).addScaledVector(side, zig(a) * width).add(V(0, zig(a + 0.5) * 0.28 + Math.sin(t * Math.PI) * 0.5 + (w - 1) * 0.12, 0));
  };
  await fx.tween(0.66, (k) => {
    for (const { w, dots } of wisps) dots.forEach((d, i) => { const t = k * 1.2 - w * 0.03 - i * 0.012; d.visible = t > 0; d.position.copy(at(t, w)); });
  });
  for (const { dots } of wisps) for (const d of dots) d.visible = false;
  fx.burst(to, '#ff8fd0', few(30), 3, 0.7);
  const hearts = Array.from({ length: few(9) }, (_, i) => { const m = add(g, new THREE.Mesh(heart(0.16 + Math.random() * 0.1), Object.assign(glow(COLORS[i % 3], 1), { side: THREE.DoubleSide }))); m.position.copy(to); return { m, a: Math.random() * 6.28, s: 0.5 + Math.random() }; });
  await fx.tween(0.34, (k) => { for (const { m, a, s } of hearts) { m.position.copy(to).add(V(Math.cos(a) * s * ease(k), k * 1.3 * s, Math.sin(a) * s * 0.5)); m.rotation.z = Math.sin(k * 8 + a) * 0.4; m.scale.setScalar(Math.sin(Math.min(1, k * 1.6) * 1.57)); fade(m, 1 - k * k); } });
};

const grass: Effect = async (fx, g, from, to) => {
  // vines burst from the ground around the target while leaves are flung at it
  const vines = Array.from({ length: 4 }, (_, i) => {
    const a = (i / 4) * Math.PI * 2 + 0.4, r = 1.05;
    const curve = new THREE.CatmullRomCurve3([V(Math.cos(a) * r, -0.2, Math.sin(a) * r), V(Math.cos(a) * r * 1.1, 0.7, Math.sin(a) * r * 1.1), V(Math.cos(a + 0.7) * 0.6, 1.4, Math.sin(a + 0.7) * 0.6), V(Math.cos(a + 1.8) * 0.4, 0.9, Math.sin(a + 1.8) * 0.4)].map((p) => p.add(V(to.x, 0, to.z))));
    const geo = new THREE.TubeGeometry(curve, 28, 0.075, 6, false);
    const m = add(g, new THREE.Mesh(geo, solid(i % 2 ? '#3f8f3a' : '#57b04a')));
    const total = geo.index!.count;
    geo.setDrawRange(0, 0);
    return { geo, total, m };
  });
  const dir = to.clone().sub(from);
  const leaves = Array.from({ length: few(20) }, (_, i) => ({ m: add(g, new THREE.Mesh(leaf(0.17 + Math.random() * 0.08), solid(['#6fce4a', '#4fa83a', '#a5e06a'][i % 3], 0.25))), d: i / 34, o: V(rnd(0.5), rnd(0.5), rnd(0.5)), r: rnd(8) }));
  let hit = false;
  await fx.tween(0.7, (k) => {
    for (const { m, d, o, r } of leaves) {
      const t = (k - d) * 2.2;
      m.visible = t > 0 && t < 1;
      m.position.copy(from).addScaledVector(dir, t).addScaledVector(o, Math.sin(Math.min(1, Math.max(0, t)) * Math.PI) + 0.4).add(V(0, Math.sin(Math.max(0, t) * Math.PI) * 0.6, 0));
      m.rotation.set(t * r, t * 9, t * r * 0.7);
    }
    const v = Math.max(0, Math.min(1, (k - 0.25) / 0.5));
    for (const x of vines) x.geo.setDrawRange(0, Math.floor((x.total * ease(v)) / 3) * 3);
    if (!hit && k > 0.55) { hit = true; fx.shake(0.14); fx.burst(to, '#8fdc5a', few(30), 3.4, 0.7); }
  });
  await fx.tween(0.24, (k) => { for (const x of vines) { x.m.position.y = -k * 1.2; fade(x.m, 1 - k); } });
};

const water: Effect = async (fx, g, from, to) => {
  const dir = to.clone().sub(from), len = dir.length(), n = dir.clone().normalize();
  const jet = (r: number, color: string, opacity: number) => { const m = add(g, new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.7, 1, 12, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }))); m.quaternion.setFromUnitVectors(UP, n); return m; };
  const outer = jet(0.26, '#3fb8e8', 0.55), mid = jet(0.17, '#7fe0f5', 0.75), core = jet(0.08, '#ffffff', 0.9);
  const coil = add(g, new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 6, 20), glow('#1f8fd0', 0.8)));
  coil.quaternion.setFromUnitVectors(V(0, 0, 1), n);
  const drops = Array.from({ length: few(24) }, () => ({ m: add(g, new THREE.Mesh(new THREE.SphereGeometry(0.05 + Math.random() * 0.06, 6, 5), new THREE.MeshBasicMaterial({ color: '#a8ecff', transparent: true }))), t: Math.random(), v: V(rnd(0.7), Math.random() * 0.9, rnd(0.7)) }));
  const splash = add(g, new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.09, 6, 28), glow('#3fb8e8', 0)));
  splash.rotation.x = Math.PI / 2; splash.position.copy(to).setY(0.12);
  let wet = 0;
  await fx.tween(0.72, (k) => {
    const head = Math.min(1, k / 0.22), tail = Math.max(0, (k - 0.78) / 0.22);
    const a = tail, b = head, l = Math.max(0.001, (b - a) * len);
    for (const [i, m] of [outer, mid, core].entries()) {
      m.position.copy(from).addScaledVector(n, (a + (b - a) / 2) * len);
      const w = 1 + Math.sin(k * 50 + i * 2) * 0.12;
      m.scale.set(w, l, w);
    }
    coil.position.copy(from).addScaledVector(n, ((k * 3) % 1) * b * len); coil.scale.setScalar(0.7 + ((k * 3) % 1) * 0.5); coil.visible = tail < 0.5;
    for (const d of drops) { const t = (d.t + k * 2) % 1; d.m.visible = t < b && t > a; d.m.position.copy(from).addScaledVector(n, t * len).addScaledVector(d.v, t * 0.6); d.m.position.y -= t * t * 0.3; }
    if (head >= 1 && tail < 1 && k > wet) { wet = k + 0.1; fx.shake(0.08); fx.burst(to, '#7fe0f5', few(12), 3.2, 0.5); }
    const s = Math.max(0, (k - 0.22) / 0.78); splash.scale.setScalar(0.5 + s * 1.4); fade(splash, 0.8 * (1 - s));
  });
  fx.burst(to.clone().setY(0.2), '#bff2ff', few(26), 3, 0.7, true);
};

const rock: Effect = async (fx, g, from, to) => {
  // boulders tear up from beside the caster, hang overhead, and come down one after another
  const COLORS = ['#9a7a56', '#7d6448', '#b8956a'];
  const n = 5;
  const rocks = Array.from({ length: n }, (_, i) => {
    const m = add(g, new THREE.Mesh(new THREE.DodecahedronGeometry(i === n - 1 ? 0.62 : 0.28 + Math.random() * 0.14, 0), solid(COLORS[i % 3])));
    m.castShadow = true;
    m.scale.set(1, 0.8 + Math.random() * 0.4, 1);
    return { m, big: i === n - 1, start: from.clone().add(V(rnd(0.9), -1.2, rnd(0.9))), up: to.clone().add(V(rnd(1.1) * (i === n - 1 ? 0.1 : 1), 2.1 + Math.random() * 0.5, rnd(0.8))), land: to.clone().add(V(rnd(0.7) * (i === n - 1 ? 0.1 : 1), i === n - 1 ? -0.1 : -0.55, rnd(0.6) * (i === n - 1 ? 0.1 : 1))), at: 0.08 * i + (i === n - 1 ? 0.1 : 0), done: false, spin: V(rnd(5), rnd(5), rnd(5)) };
  });
  fx.burst(from.clone().setY(0.1), '#b8a07a', few(18), 2.2, 0.6, true);
  fx.shake(0.08);
  await fx.tween(0.34, (k) => { for (const r of rocks) { r.m.position.copy(r.start).lerp(r.up, ease(k)); r.m.position.y += Math.sin(k * Math.PI) * 0.8; r.m.rotation.set(r.spin.x * k, r.spin.y * k, r.spin.z * k); } });
  await fx.tween(0.72, (k) => {
    for (const r of rocks) {
      const t = Math.max(0, Math.min(1, (k - r.at) / 0.26));
      if (!r.done) r.m.position.copy(r.up).lerp(r.land, t * t);
      r.m.rotation.x += 0.08;
      if (t >= 1 && !r.done) {
        r.done = true;
        fx.shake(r.big ? 0.34 : 0.14);
        fx.burst(r.land.clone().setY(0.15), '#c9b08a', few(r.big ? 40 : 14), r.big ? 4 : 2.6, 0.7);
      }
      if (r.done) { const after = Math.max(0, (k - r.at - 0.26) / 0.2); r.m.scale.setScalar(Math.max(0.001, 1 - after)); fade(r.m, Math.max(0, 1 - after)); }
    }
  });
};

const steel: Effect = async (fx, g, from, to) => {
  const blade = (r: number) => {
    const s = new THREE.Shape();
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, q = i % 2 ? r * 0.62 : r; if (i) s.lineTo(Math.cos(a) * q, Math.sin(a) * q); else s.moveTo(q, 0); }
    const hole = new THREE.Path(); hole.absarc(0, 0, r * 0.26, 0, Math.PI * 2, true); s.holes.push(hole);
    return new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: false });
  };
  const dir = to.clone().sub(from), side = V(-dir.z, 0, dir.x).normalize();
  const discs = [-1, 1, 0].map((c, i) => {
    const m = add(g, new THREE.Mesh(blade(0.5), solid('#8f9cb0', 0.2, 0.5)));
    const trail = add(g, new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.16), Object.assign(glow('#eaf4ff', 0.75), { side: THREE.DoubleSide })));
    return { m, trail, c, at: i * 0.16, hit: false };
  });
  await fx.tween(0.72, (k) => {
    for (const d of discs) {
      const t = Math.max(0, Math.min(1, (k - d.at) / 0.5)), p = (x: number) => from.clone().addScaledVector(dir, x).addScaledVector(side, d.c * Math.sin(x * Math.PI) * 1.1).add(V(0, Math.sin(x * Math.PI) * 0.35, 0));
      d.m.visible = d.trail.visible = t > 0 && t < 1;
      d.m.position.copy(p(t * t * 0.4 + t * 0.6));
      d.m.rotation.set(-0.75, d.c * 0.5, k * 34);
      const back = p(Math.max(0, t * t * 0.4 + t * 0.6 - 0.1));
      d.trail.position.copy(d.m.position).lerp(back, 0.5);
      d.trail.rotation.y = Math.atan2(-(d.m.position.z - back.z), d.m.position.x - back.x);
      if (t >= 1 && !d.hit) { d.hit = true; fx.shake(0.14); fx.burst(to, '#fff0c0', few(18), 5, 0.35); fx.burst(to, '#c9d2de', few(10), 3, 0.5); }
    }
  });
};

const EFFECTS: Record<ElementType, Effect> = { fire, electric, astral, charm, grass, water, rock, steel };

/** Play a type's attack from one spot to another. Cleans up after itself, even if it fails partway. */
export async function attackFx(type: ElementType, stage: FxStage, from: THREE.Vector3, to: THREE.Vector3): Promise<void> {
  const g = new THREE.Group();
  stage.scene.add(g);
  try { await EFFECTS[type](stage, g, from, to); } finally {
    stage.scene.remove(g);
    g.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); for (const x of [m.material].flat()) x?.dispose?.(); });
  }
}
