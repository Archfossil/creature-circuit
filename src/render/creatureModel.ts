import * as THREE from 'three';
import type { CreatureLook, Species } from '../data/schema';
import { TYPE_COLOR } from '../data/types';

// Procedural low-poly creatures built from primitives, driven by Species.look.
// Every model faces +Z, stands on y=0, and is ~1.2 units tall at stage 2.

const mat = (color: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05, flatShading: true, ...o });

function mesh(geo: THREE.BufferGeometry, m: THREE.Material, pos?: [number, number, number], scale?: [number, number, number], rot?: [number, number, number]) {
  const o = new THREE.Mesh(geo, m);
  if (pos) o.position.set(...pos);
  if (scale) o.scale.set(...scale);
  if (rot) o.rotation.set(...rot);
  o.castShadow = true;
  return o;
}

const SPHERE = new THREE.IcosahedronGeometry(1, 1);
const SPHERE_SMOOTH = new THREE.SphereGeometry(1, 16, 12);
const CONE = new THREE.ConeGeometry(1, 1, 6);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 6);
const BOX = new THREE.BoxGeometry(1, 1, 1);
const OCTA = new THREE.OctahedronGeometry(1, 0);
const TORUS = new THREE.TorusGeometry(1, 0.12, 6, 20);
/** A stripe: the upper part of a thin ring, over the back. */
const STRIPE = new THREE.TorusGeometry(0.99, 0.07, 5, 16, Math.PI * 0.8).rotateZ(Math.PI * 0.1);

function eyes(parent: THREE.Object3D, y: number, z: number, spread: number, size: number, look?: CreatureLook) {
  const style = look?.eyes ?? 'round';
  if (style === 'glow') {
    const lit = new THREE.MeshStandardMaterial({ color: '#ffe27a', emissive: new THREE.Color('#ffd23f'), emissiveIntensity: 0.9 });
    for (const sx of [-1, 1]) {
      const e = mesh(SPHERE_SMOOTH, lit, [sx * spread, y, z], [size * 1.25, size * 0.85, size * 0.6], [0, 0, sx * 0.45]);
      e.castShadow = false;
      parent.add(e);
    }
    return;
  }
  const lid = look ? mat(look.primary) : null;
  if (lid && style !== 'round') for (const sx of [-1, 1]) parent.add(style === 'fierce'
    ? mesh(BOX, lid, [sx * spread, y + size * 0.95, z + size * 0.2], [size * 2.1, size * 0.55, size * 0.9], [0, 0, sx * 0.42])
    : mesh(SPHERE_SMOOTH, lid, [sx * spread, y + size * 0.5, z + size * 0.14], [size * 1.12, size * 0.72, size * 0.75]));
  const white = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3 });
  const pupil = new THREE.MeshStandardMaterial({ color: '#1b1a24', roughness: 0.2 });
  const glint = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  for (const sx of [-1, 1]) {
    const e = mesh(SPHERE_SMOOTH, white, [sx * spread, y, z], [size, size * 1.1, size * 0.6]);
    const p = mesh(SPHERE_SMOOTH, pupil, [sx * spread, y - size * 0.05, z + size * 0.45], [size * 0.62, size * 0.72, size * 0.3]);
    const g = mesh(SPHERE_SMOOTH, glint, [sx * spread + size * 0.2, y + size * 0.3, z + size * 0.62], [size * 0.18, size * 0.18, size * 0.1]);
    e.castShadow = p.castShadow = g.castShadow = false;
    parent.add(e, p, g);
  }
}

export interface CreatureRig {
  root: THREE.Group;
  body: THREE.Group;
  materials: THREE.MeshStandardMaterial[];
  height: number;
  update: (t: number) => void;
}

export function buildCreature(sp: Species): CreatureRig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const L = sp.look;
  const P = mat(L.primary);
  const S = mat(L.secondary);
  const typeCol = TYPE_COLOR[sp.types[0]];
  const accentGlow = mat(L.secondary, { emissive: new THREE.Color(L.secondary), emissiveIntensity: 0.5 });
  let headY = 0.9, headZ = 0.2, headR = 0.42, height = 1.2;
  const head = new THREE.Group();
  const flick: THREE.Object3D[] = [];
  const wings: THREE.Object3D[] = [];
  const tailSegs: THREE.Object3D[] = [];
  /** Arms and the like: they swing gently about their pivot, alternating sides. */
  const limbs: THREE.Object3D[] = [];
  /** The main body as an ellipsoid, for markings to sit on. */
  let hull: { c: [number, number, number]; s: [number, number, number] } | null = null;
  const st = sp.stage;
  const limb = (x: number, y: number, z: number, ...parts: THREE.Object3D[]) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.add(...parts);
    limbs.push(g);
    body.add(g);
    return g;
  };
  const claw = mat('#f4ecd8');

  switch (L.shape) {
    case 'blob': {
      body.add(mesh(SPHERE, P, [0, 0.5, 0], [0.62, 0.5, 0.58]));
      body.add(mesh(SPHERE, S, [0, 0.38, 0.22], [0.42, 0.32, 0.38]));
      for (const sx of [-1, 1]) body.add(mesh(SPHERE, P, [sx * 0.3, 0.08, 0.15], [0.16, 0.1, 0.2]));
      hull = { c: [0, 0.5, 0], s: [0.62, 0.5, 0.58] };
      headY = 0.62; headZ = 0.38; headR = 0;
      eyes(body, 0.66, 0.5, 0.18, 0.1, L);
      height = 1.0;
      break;
    }
    case 'quad': {
      body.add(mesh(SPHERE, P, [0, 0.55, -0.05], [0.42, 0.36, 0.6]));
      body.add(mesh(SPHERE, S, [0, 0.45, 0.05], [0.3, 0.24, 0.45]));
      for (const [x, z] of [[-0.24, 0.3], [0.24, 0.3], [-0.24, -0.35], [0.24, -0.35]]) body.add(mesh(CYL, P, [x, 0.2, z], [0.09, 0.4, 0.09]));
      for (let i = 0; i < 3; i++) {
        const seg = mesh(SPHERE, i === 2 ? S : P, [0, 0.62 + i * 0.12, -0.6 - i * 0.18], [0.14 - i * 0.02, 0.14 - i * 0.02, 0.18]);
        tailSegs.push(seg); body.add(seg);
      }
      hull = { c: [0, 0.55, -0.05], s: [0.42, 0.36, 0.6] };
      headY = 0.95; headZ = 0.45; headR = 0.36;
      height = 1.25;
      break;
    }
    case 'bird': {
      body.add(mesh(SPHERE, P, [0, 0.6, 0], [0.4, 0.45, 0.42]));
      body.add(mesh(SPHERE, S, [0, 0.52, 0.16], [0.28, 0.32, 0.3]));
      for (const sx of [-1, 1]) {
        const w = new THREE.Group();
        w.position.set(sx * 0.35, 0.7, -0.05);
        w.add(mesh(SPHERE, P, [sx * 0.32, 0, 0], [0.42, 0.06, 0.26]));
        w.add(mesh(SPHERE, S, [sx * 0.5, -0.02, -0.04], [0.26, 0.05, 0.18]));
        wings.push(w); body.add(w);
        body.add(mesh(CYL, S, [sx * 0.14, 0.12, 0.05], [0.04, 0.26, 0.04]));
      }
      body.add(mesh(CONE, S, [0, 0.55, -0.45], [0.2, 0.4, 0.1], [-Math.PI / 2.4, 0, 0]));
      headY = 1.08; headZ = 0.12; headR = 0.3;
      height = 1.35;
      break;
    }
    case 'serpent': {
      const n = 6;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const r = 0.32 - t * 0.2;
        const seg = mesh(SPHERE, i % 2 ? S : P, [Math.sin(t * Math.PI * 1.5) * 0.35, r * 0.9 + (1 - t) * 0.35, 0.1 - t * 1.1], [r, r * 0.9, r * 1.1]);
        tailSegs.push(seg); body.add(seg);
      }
      body.add(mesh(SPHERE, P, [0, 0.62, 0.25], [0.26, 0.4, 0.26]));
      headY = 1.02; headZ = 0.38; headR = 0.34;
      height = 1.3;
      break;
    }
    case 'golem': {
      body.add(mesh(OCTA, P, [0, 0.72, 0], [0.55, 0.6, 0.45]));
      body.add(mesh(BOX, S, [0, 0.62, 0.25], [0.5, 0.4, 0.2], [0, 0, 0]));
      for (const sx of [-1, 1]) {
        body.add(mesh(SPHERE, P, [sx * 0.62, 0.82, 0], [0.2, 0.2, 0.2]));
        body.add(mesh(OCTA, P, [sx * 0.7, 0.45, 0.08], [0.2, 0.32, 0.2]));
        body.add(mesh(BOX, P, [sx * 0.24, 0.14, 0], [0.24, 0.28, 0.3]));
      }
      headY = 1.32; headZ = 0.08; headR = 0.28;
      height = 1.6;
      break;
    }
    case 'fish': {
      // plump torpedo body hovering in its own little bubble of water/heat
      body.add(mesh(SPHERE, P, [0, 0.6, 0], [0.34, 0.36, 0.55]));
      body.add(mesh(SPHERE, S, [0, 0.5, 0.12], [0.24, 0.22, 0.38]));
      const tail = new THREE.Group();
      tail.position.set(0, 0.6, -0.5);
      tail.add(mesh(CONE, S, [0, 0.12, -0.18], [0.05, 0.36, 0.22], [-0.9, 0, 0]));
      tail.add(mesh(CONE, S, [0, -0.12, -0.18], [0.05, 0.36, 0.22], [-2.2, 0, 0]));
      tailSegs.push(tail); body.add(tail);
      for (const sx of [-1, 1]) {
        const fin = new THREE.Group();
        fin.position.set(sx * 0.3, 0.5, 0.05);
        fin.add(mesh(SPHERE, S, [sx * 0.12, 0, 0], [0.18, 0.04, 0.12], [0, 0, sx * -0.4]));
        wings.push(fin); body.add(fin);
      }
      body.add(mesh(CONE, S, [0, 0.98, -0.05], [0.05, 0.3, 0.22], [-0.4, 0, 0]));
      hull = { c: [0, 0.6, 0], s: [0.34, 0.36, 0.55] };
      eyes(body, 0.7, 0.42, 0.2, 0.08, L);
      headY = 0; headZ = 0; headR = 0;
      height = 1.2;
      break;
    }
    case 'sprite': {
      body.add(mesh(SPHERE, P, [0, 0.55, 0], [0.26, 0.3, 0.24]));
      for (const sx of [-1, 1]) {
        const w = new THREE.Group();
        w.position.set(sx * 0.18, 0.7, -0.15);
        const wm = new THREE.MeshStandardMaterial({ color: L.secondary, transparent: true, opacity: 0.65, side: THREE.DoubleSide, emissive: new THREE.Color(L.secondary), emissiveIntensity: 0.3 });
        w.add(mesh(SPHERE, wm, [sx * 0.3, 0.12, 0], [0.32, 0.4, 0.03], [0, 0, sx * 0.4]));
        wings.push(w); body.add(w);
      }
      headY = 1.0; headZ = 0.05; headR = 0.4;
      height = 1.35;
      break;
    }
    case 'lizard': { // upright on two legs, with a thick tail for balance; later stages stand taller and grow a spiny back
      const up = (st - 1) * 0.06;
      body.add(mesh(SPHERE, P, [0, 0.72 + up, 0], [0.34, 0.44 + up, 0.31], [0.18, 0, 0]));
      body.add(mesh(SPHERE, S, [0, 0.66 + up, 0.13], [0.25, 0.36 + up, 0.22], [0.18, 0, 0]));
      for (const sx of [-1, 1]) {
        body.add(mesh(SPHERE, P, [sx * 0.24, 0.36, -0.02], [0.16, 0.22, 0.21]));
        body.add(mesh(CYL, P, [sx * 0.25, 0.16, 0.0], [0.08, 0.26, 0.08]));
        body.add(mesh(SPHERE, P, [sx * 0.25, 0.06, 0.1], [0.11, 0.07, 0.2]));
        for (const t of [-1, 0, 1]) body.add(mesh(CONE, claw, [sx * 0.25 + t * 0.06, 0.04, 0.29], [0.025, 0.08, 0.025], [Math.PI / 2, 0, 0]));
        limb(sx * 0.31, 0.92 + up, 0.06,
          mesh(SPHERE, P, [sx * 0.06, -0.1, 0.06], [0.08, 0.16, 0.09], [-0.4, 0, 0]),
          mesh(SPHERE, P, [sx * 0.06, -0.2, 0.18], [0.065, 0.07, 0.14]),
          mesh(SPHERE, S, [sx * 0.06, -0.21, 0.3], [0.07, 0.06, 0.07]));
      }
      for (let i = 0; i < 6; i++) {
        const r = 0.22 - i * 0.026;
        const seg = mesh(SPHERE, i === 5 ? S : P, [0, 0.42 - i * 0.05 + (i > 3 ? (i - 3) * 0.08 : 0), -0.25 - i * 0.125], [r, r, 0.17]);
        tailSegs.push(seg); body.add(seg);
      }
      if (st > 1) for (let i = 0; i < 4; i++) body.add(mesh(CONE, S, [0, 1.04 + up - i * 0.15, -0.22 - i * 0.07], [0.05, 0.14 + st * 0.03, 0.09], [-1.0 - i * 0.12, 0, 0]));
      hull = { c: [0, 0.72 + up, 0], s: [0.34, 0.44 + up, 0.31] };
      headY = 1.3 + up * 2; headZ = 0.14; headR = 0.29;
      // a blunt snout with a jaw
      head.add(mesh(SPHERE, P, [0, -0.04, 0.27], [0.19, 0.13, 0.24]), mesh(SPHERE, S, [0, -0.13, 0.24], [0.16, 0.08, 0.2]));
      for (const sx of [-1, 1]) head.add(mesh(SPHERE, mat('#1b1a24'), [sx * 0.07, 0.02, 0.48], [0.02, 0.02, 0.02]));
      height = 1.62 + up * 2;
      break;
    }
    case 'lion': { // a big cat; its mane fills out stage by stage
      body.add(mesh(SPHERE, P, [0, 0.58, 0.05], [0.4, 0.38, 0.42]));
      body.add(mesh(SPHERE, P, [0, 0.55, -0.32], [0.33, 0.31, 0.36]));
      body.add(mesh(SPHERE, S, [0, 0.46, 0.16], [0.28, 0.26, 0.32]));
      for (const [x, z] of [[-0.24, 0.28], [0.24, 0.28], [-0.22, -0.42], [0.22, -0.42]]) {
        body.add(mesh(CYL, P, [x, 0.24, z], [0.1, 0.42, 0.1]));
        body.add(mesh(SPHERE, S, [x, 0.07, z + 0.05], [0.12, 0.07, 0.15]));
      }
      for (let i = 0; i < 5; i++) {
        const tip = i === 4;
        const seg = mesh(tip ? OCTA : SPHERE, tip ? S : P, [0, 0.6 + i * 0.1, -0.6 - i * 0.07], tip ? [0.13, 0.2, 0.13] : [0.06, 0.1, 0.09]);
        tailSegs.push(seg); body.add(seg);
      }
      hull = { c: [0, 0.57, -0.12], s: [0.38, 0.37, 0.52] };
      headY = 1.02; headZ = 0.48; headR = 0.34;
      const rings = st === 1 ? [[6, 0.31, 0.22, 1]] : st === 2 ? [[12, 0.36, 0.34, 0], [10, 0.33, 0.3, 0]] : [[13, 0.4, 0.4, 0], [12, 0.46, 0.5, 0], [9, 0.36, 0.5, 0]];
      rings.forEach(([n, r, len, half], ri) => {
        for (let i = 0; i < n; i++) {
          // a first stage only has a tuft across the crown
          const a = half ? Math.PI * (0.18 + 0.64 * (i / (n - 1))) : (i / n) * Math.PI * 2 + ri * 0.14;
          head.add(mesh(CONE, S, [Math.cos(a) * r, Math.sin(a) * r, -0.02 - ri * 0.13], [0.15, len, 0.13], [0, 0, a - Math.PI / 2]));
        }
      });
      for (const sx of [-1, 1]) head.add(mesh(SPHERE, P, [sx * 0.25, 0.26, 0.04], [0.1, 0.1, 0.06]), mesh(SPHERE, S, [sx * 0.25, 0.26, 0.08], [0.06, 0.06, 0.04]));
      head.add(mesh(SPHERE, mat('#3a2430'), [0, -0.03, 0.39], [0.06, 0.045, 0.05]));
      height = 1.45;
      break;
    }
    case 'wraith': { // a floating torso trailing off to a wisp, with loose arms that drift beside it
      const robe = mat(L.primary, { emissive: new THREE.Color(L.primary), emissiveIntensity: 0.18 });
      body.add(mesh(SPHERE, robe, [0, 0.92, 0], [0.33, 0.34, 0.29]));
      body.add(mesh(SPHERE, S, [0, 0.9, 0.13], [0.2, 0.22, 0.18]));
      for (let i = 0; i < 7; i++) {
        const r = 0.26 - i * 0.034;
        const seg = mesh(SPHERE, i === 6 ? accentGlow : robe, [0, 0.7 - i * 0.105, -0.03 - i * i * 0.016], [r, r * 0.95, r]);
        tailSegs.push(seg); body.add(seg);
      }
      const spikes = 5 + st * 2;
      for (let i = 0; i < spikes; i++) {
        const a = (i / spikes) * Math.PI * 2;
        body.add(mesh(CONE, S, [Math.cos(a) * 0.26, 1.12, Math.sin(a) * 0.22], [0.07, 0.2, 0.05], [Math.sin(a) * 1.5, 0, -Math.cos(a) * 1.5]));
      }
      for (const sx of [-1, 1]) {
        const big = 1 + (st - 1) * 0.16;
        limb(sx * (0.46 + st * 0.03), 0.96, 0.08,
          mesh(SPHERE, robe, [0, -0.06, 0.02], [0.1 * big, 0.15 * big, 0.1 * big], [-0.5, 0, sx * 0.3]),
          mesh(SPHERE, S, [sx * 0.03, -0.24, 0.16], [0.13 * big, 0.1 * big, 0.13 * big]),
          ...[-1, 0, 1].map((f) => mesh(SPHERE, S, [sx * 0.03 + f * 0.085 * big, -0.28, 0.29 * big], [0.04 * big, 0.04 * big, 0.08 * big])));
      }
      hull = { c: [0, 0.92, 0], s: [0.33, 0.34, 0.29] };
      headY = 1.36; headZ = 0.04; headR = 0.29;
      height = 1.7;
      break;
    }
    case 'slime': { // see-through jelly round a glowing core; it grows pseudopods, then a crown of drops
      const jelly = new THREE.MeshStandardMaterial({ color: L.primary, transparent: true, opacity: 0.66, roughness: 0.12, metalness: 0.05, depthWrite: false, emissive: new THREE.Color(L.primary), emissiveIntensity: 0.12 });
      const gel = (pos: [number, number, number], scale: [number, number, number], rot?: [number, number, number]) => mesh(SPHERE_SMOOTH, jelly, pos, scale, rot);
      const core = mesh(OCTA, accentGlow, [0, 0.4, -0.04], [0.15 + st * 0.02, 0.18 + st * 0.02, 0.15 + st * 0.02]);
      core.castShadow = false;
      body.add(core);
      for (const [x, y, z, r] of [[0.22, 0.3, 0.1, 0.05], [-0.25, 0.48, 0.05, 0.07], [0.1, 0.62, -0.15, 0.045]]) body.add(mesh(SPHERE_SMOOTH, S, [x, y, z], [r, r, r]));
      body.add(gel([0, 0.06, 0], [0.7 + st * 0.04, 0.07, 0.64 + st * 0.04]), gel([0, 0.4, 0], [0.54, 0.44, 0.5]));
      for (const [a, r] of [[0.4, 0.2], [1.5, 0.16], [2.7, 0.21], [3.9, 0.15], [5.2, 0.19]]) body.add(gel([Math.cos(a) * 0.5, 0.1, Math.sin(a) * 0.46], [r, r * 0.6, r]));
      if (st > 1) for (const sx of [-1, 1]) limb(sx * 0.46, 0.5, 0.08, gel([sx * 0.12, -0.02, 0.06], [0.2, 0.11, 0.12], [0, 0, sx * 0.4]), gel([sx * 0.3, 0.1, 0.12], [0.12 + st * 0.01, 0.13, 0.12]));
      const drops = st === 3 ? [[-0.24, 0.8, 0.11], [0, 0.9, 0.15], [0.24, 0.8, 0.11]] : [[0.03, 0.85, 0.12]];
      for (const [x, y, r] of drops) body.add(gel([x, y, 0], [r, r, r]), mesh(CONE, jelly, [x, y + r * 1.15, 0], [r * 0.62, r * 1.3, r * 0.62]));
      headY = 0; headZ = 0; headR = 0;
      eyes(body, 0.52, 0.46, 0.18, 0.1, L);
      body.add(mesh(SPHERE_SMOOTH, mat('#3a2430'), [0, 0.36, 0.49], [0.09, 0.035, 0.03]));
      height = 1.1;
      break;
    }
    case 'beetle': { // a domed, split shell on six legs; its horn grows with it
      const shell = mat(L.primary, { roughness: 0.25, metalness: 0.25 });
      for (const sx of [-1, 1]) body.add(mesh(SPHERE, shell, [sx * 0.15, 0.5, -0.14], [0.33, 0.34, 0.52], [0, sx * 0.08, 0]));
      body.add(mesh(BOX, S, [0, 0.6, -0.16], [0.03, 0.36, 0.86]));
      body.add(mesh(SPHERE, S, [0, 0.34, -0.06], [0.38, 0.16, 0.52]));
      body.add(mesh(SPHERE, shell, [0, 0.48, 0.32], [0.3, 0.24, 0.18]));
      for (const sx of [-1, 1]) for (const z of [0.26, -0.06, -0.4]) {
        body.add(mesh(CYL, S, [sx * 0.42, 0.26, z], [0.035, 0.28, 0.035], [0, 0, sx * 1.0]));
        body.add(mesh(CYL, S, [sx * 0.56, 0.11, z + 0.02], [0.028, 0.24, 0.028], [0, 0, sx * 0.18]));
      }
      headY = 0.5; headZ = 0.54; headR = 0.23;
      for (const sx of [-1, 1]) head.add(mesh(CONE, claw, [sx * 0.1, -0.12, 0.22], [0.035, 0.16, 0.035], [Math.PI / 2, 0, sx * 0.5]));
      if (st > 1) head.add(mesh(CONE, shell, [0, 0.26, 0.2], [0.07, 0.26 + st * 0.1, 0.07], [0.7, 0, 0]));
      if (st === 3) for (const sx of [-1, 1]) head.add(mesh(CONE, S, [sx * 0.09, 0.46, 0.36], [0.035, 0.16, 0.035], [0.5, 0, sx * -0.8]));
      hull = { c: [0, 0.5, -0.14], s: [0.46, 0.35, 0.52] };
      height = 0.95 + st * 0.08;
      break;
    }
    case 'toad': { // wide and squat, with its eyes up on top and a pouch that swells
      body.add(mesh(SPHERE, P, [0, 0.42, -0.04], [0.54, 0.38, 0.5]));
      body.add(mesh(SPHERE, S, [0, 0.3, 0.14], [0.42, 0.26, 0.36]));
      const pouch = mesh(SPHERE, S, [0, 0.28, 0.4], [0.2 + st * 0.03, 0.14 + st * 0.02, 0.14]);
      flick.push(pouch); body.add(pouch);
      body.add(mesh(BOX, mat('#3a2430'), [0, 0.46, 0.42], [0.4, 0.02, 0.1]));
      for (const sx of [-1, 1]) {
        body.add(mesh(SPHERE, P, [sx * 0.46, 0.26, -0.2], [0.2, 0.24, 0.32], [0.2, sx * 0.4, 0]));
        body.add(mesh(SPHERE, S, [sx * 0.52, 0.06, 0.06], [0.16, 0.05, 0.22], [0, sx * 0.3, 0]));
        body.add(mesh(CYL, P, [sx * 0.32, 0.16, 0.3], [0.07, 0.28, 0.07]));
        body.add(mesh(SPHERE, S, [sx * 0.34, 0.04, 0.38], [0.11, 0.045, 0.13]));
        body.add(mesh(SPHERE, P, [sx * 0.24, 0.78, 0.18], [0.16, 0.16, 0.16]));
      }
      eyes(body, 0.8, 0.28, 0.24, 0.1, L);
      for (const [x, y, z] of [[0.2, 0.74, -0.2], [-0.22, 0.72, -0.26], [0, 0.8, -0.08], [0.38, 0.58, -0.22], [-0.4, 0.56, -0.12]]) body.add(mesh(SPHERE, S, [x, y, z], [0.06, 0.05, 0.06]));
      // a first stage keeps its tadpole tail; the last grows brow horns and a ridge
      if (st === 1) for (let i = 0; i < 4; i++) { const seg = mesh(SPHERE, P, [0, 0.3 + i * 0.02, -0.5 - i * 0.11], [0.12 - i * 0.02, 0.15 - i * 0.025, 0.13]); tailSegs.push(seg); body.add(seg); }
      if (st === 3) {
        for (const sx of [-1, 1]) body.add(mesh(CONE, S, [sx * 0.28, 0.96, 0.12], [0.07, 0.2, 0.07], [-0.2, 0, sx * -0.4]));
        for (let i = 0; i < 4; i++) body.add(mesh(CONE, S, [0, 0.82 - i * 0.06, -0.1 - i * 0.14], [0.08, 0.16, 0.08], [-0.4 - i * 0.2, 0, 0]));
      }
      headY = 0; headZ = 0; headR = 0;
      height = 1.05;
      break;
    }
    case 'hare': { // long ears, strong haunches, big feet
      body.add(mesh(SPHERE, P, [0, 0.46, -0.06], [0.32, 0.36, 0.38]));
      body.add(mesh(SPHERE, S, [0, 0.5, 0.2], [0.2, 0.24, 0.16]));
      body.add(mesh(SPHERE, S, [0, 0.42, -0.46], [0.15, 0.15, 0.15]));
      for (const sx of [-1, 1]) {
        body.add(mesh(SPHERE, P, [sx * 0.27, 0.28, -0.14], [0.17, 0.24, 0.25]));
        body.add(mesh(SPHERE, S, [sx * 0.26, 0.05, 0.1], [0.1, 0.06, 0.27]));
        body.add(mesh(CYL, P, [sx * 0.13, 0.22, 0.24], [0.06, 0.32, 0.06]));
        body.add(mesh(SPHERE, S, [sx * 0.13, 0.06, 0.27], [0.07, 0.06, 0.09]));
        const ear = new THREE.Group();
        const len = 0.28 + st * 0.06;
        ear.position.set(sx * 0.12, 0.2, -0.02);
        ear.rotation.z = sx * -0.2;
        ear.add(mesh(SPHERE, P, [0, len * 0.85, 0], [0.085, len, 0.055]), mesh(SPHERE, S, [0, len * 0.85, 0.03], [0.05, len * 0.8, 0.04]));
        limbs.push(ear); head.add(ear);
        // the last stage is a jackalope
        if (st === 3) head.add(mesh(CONE, claw, [sx * 0.2, 0.36, 0.04], [0.035, 0.3, 0.035], [0, 0, sx * -0.6]), mesh(CONE, claw, [sx * 0.27, 0.42, 0.04], [0.025, 0.14, 0.025], [0, 0, sx * 0.2]));
        if (st > 1) head.add(mesh(SPHERE, S, [sx * 0.2, -0.12, 0.1], [0.1, 0.08, 0.1]));
      }
      hull = { c: [0, 0.46, -0.06], s: [0.32, 0.36, 0.38] };
      headY = 0.98; headZ = 0.2; headR = 0.29;
      height = 1.6 + st * 0.08;
      break;
    }
    case 'ape': { // heavy chest and long arms that reach the ground
      body.add(mesh(SPHERE, P, [0, 0.82, 0], [0.48, 0.42, 0.36]));
      body.add(mesh(SPHERE, P, [0, 0.48, -0.06], [0.33, 0.28, 0.28]));
      body.add(mesh(SPHERE, S, [0, 0.82, 0.16], [0.34, 0.28, 0.24]));
      for (const sx of [-1, 1]) {
        body.add(mesh(CYL, P, [sx * 0.2, 0.2, -0.06], [0.13, 0.32, 0.13]));
        body.add(mesh(SPHERE, S, [sx * 0.21, 0.06, 0.02], [0.14, 0.07, 0.2]));
        const fist = 0.15 + st * 0.02;
        limb(sx * 0.46, 0.98, 0.02,
          mesh(SPHERE, P, [sx * 0.06, -0.04, 0], [0.19, 0.19, 0.19]),
          mesh(SPHERE, P, [sx * 0.15, -0.3, 0.06], [0.12, 0.24, 0.13]),
          mesh(SPHERE, P, [sx * 0.15, -0.58, 0.15], [0.14, 0.22, 0.15], [-0.25, 0, 0]),
          mesh(SPHERE, S, [sx * 0.15, -0.83, 0.22], [fist, fist * 0.85, fist]));
      }
      if (st === 3) for (const sx of [-1, 1]) body.add(mesh(CONE, S, [sx * 0.48, 1.2, -0.02], [0.09, 0.24, 0.09], [0, 0, sx * -0.35]));
      hull = { c: [0, 0.82, 0], s: [0.48, 0.42, 0.36] };
      headY = 1.26; headZ = 0.18; headR = 0.26;
      head.add(mesh(BOX, P, [0, 0.13, 0.17], [0.27, 0.06, 0.12]));
      height = 1.55;
      break;
    }
  }

  // Markings, over the back of the body
  if (hull && L.marks) {
    const { c, s } = hull;
    if (L.marks === 'spots') for (const [u, v, r] of [[-0.5, 0.8, 0.16], [0.3, 1.1, 0.2], [1.0, 0.7, 0.15], [-1.1, 0.45, 0.17], [0.75, 0.2, 0.13], [-0.2, 0.35, 0.14], [2.2, 0.7, 0.16], [-2.1, 0.8, 0.18]]) {
      // u: round the body from its back, v: up from its middle
      const n = new THREE.Vector3(Math.sin(u) * Math.cos(v), Math.sin(v), -Math.cos(u) * Math.cos(v));
      const size = r * (s[0] + s[1]) * 0.5;
      const spot = mesh(SPHERE, S, [c[0] + n.x * s[0] * 0.96, c[1] + n.y * s[1] * 0.96, c[2] + n.z * s[2] * 0.96], [size, size, size * 0.35]);
      spot.lookAt(spot.position.clone().add(n));
      spot.castShadow = false;
      body.add(spot);
    } else for (const z of [-0.55, -0.15, 0.25]) {
      const f = Math.sqrt(1 - z * z) * 1.0;
      const band = mesh(STRIPE, S, [c[0], c[1], c[2] + z * s[2]], [s[0] * f, s[1] * f, s[2] * 0.6]);
      band.castShadow = false;
      body.add(band);
    }
  }

  if (headR > 0) {
    head.position.set(0, headY, headZ);
    head.add(mesh(SPHERE, P, [0, 0, 0], [headR, headR * 0.92, headR * 0.95]));
    if (L.shape !== 'lizard') head.add(mesh(SPHERE, S, [0, -headR * 0.35, headR * 0.55], [headR * 0.5, headR * 0.35, headR * 0.4]));
    eyes(head, headR * 0.12, headR * 0.72, headR * 0.42, headR * 0.24, L);
    if (L.shape === 'bird') head.add(mesh(CONE, mat('#f2b134'), [0, -headR * 0.15, headR * 1.05], [0.08, 0.2, 0.08], [Math.PI / 2, 0, 0]));
    body.add(head);
  }

  // Crest decoration
  const crestParent = headR > 0 ? head : body;
  const top = headR > 0 ? headR * 0.85 : L.shape === 'toad' ? 0.74 : 1.0;
  const cz = headR > 0 ? 0 : L.shape === 'toad' ? -0.16 : 0.1;
  switch (L.crest) {
    case 'horns':
      for (const sx of [-1, 1]) crestParent.add(mesh(CONE, S, [sx * 0.18, top, cz - 0.05], [0.07, 0.32, 0.07], [-0.3, 0, sx * -0.35]));
      break;
    case 'ears':
      for (const sx of [-1, 1]) crestParent.add(mesh(CONE, P, [sx * 0.22, top - 0.02, cz], [0.13, 0.32, 0.06], [0, 0, sx * -0.3]));
      break;
    case 'flame': {
      const fl = new THREE.MeshStandardMaterial({ color: '#ffb02e', emissive: new THREE.Color('#ff5a00'), emissiveIntensity: 0.9, flatShading: true });
      for (let i = 0; i < 3; i++) {
        const f = mesh(CONE, fl, [(i - 1) * 0.1, top + 0.12, cz - 0.05 - Math.abs(i - 1) * 0.05], [0.1, 0.36 - Math.abs(i - 1) * 0.1, 0.1]);
        flick.push(f); crestParent.add(f);
      }
      break;
    }
    case 'leaf':
      crestParent.add(mesh(SPHERE, mat('#7ccf4a'), [0.05, top + 0.12, cz], [0.08, 0.22, 0.04], [0, 0, -0.4]));
      crestParent.add(mesh(CYL, mat('#4b7a27'), [0, top, cz], [0.02, 0.12, 0.02]));
      break;
    case 'crystal': {
      const cm = new THREE.MeshStandardMaterial({ color: typeCol, emissive: new THREE.Color(typeCol), emissiveIntensity: 0.6, roughness: 0.15, metalness: 0.3, flatShading: true });
      crestParent.add(mesh(OCTA, cm, [0, top + 0.14, cz], [0.12, 0.22, 0.12]));
      crestParent.add(mesh(OCTA, cm, [0.14, top + 0.04, cz - 0.05], [0.07, 0.13, 0.07], [0, 0, -0.5]));
      break;
    }
    case 'fin':
      body.add(mesh(CONE, S, [0, height * 0.62, -0.2], [0.05, 0.42, 0.28], [-0.5, 0, 0]));
      break;
    case 'halo': {
      const h = mesh(TORUS, accentGlow, [0, top + 0.25, cz], [0.22, 0.22, 0.22], [Math.PI / 2, 0, 0]);
      h.castShadow = false; flick.push(h); crestParent.add(h);
      break;
    }
    case 'spikes':
      for (let i = 0; i < 4; i++) body.add(mesh(CONE, S, [0, height * 0.55 - i * 0.04, 0.15 - i * 0.22], [0.08, 0.26, 0.08], [-0.4, 0, 0]));
      break;
    case 'antenna':
      for (const sx of [-1, 1]) {
        crestParent.add(mesh(CYL, mat('#2b2a33'), [sx * 0.12, top + 0.12, cz], [0.015, 0.3, 0.015], [0, 0, sx * -0.3]));
        crestParent.add(mesh(SPHERE, accentGlow, [sx * 0.2, top + 0.27, cz], [0.05, 0.05, 0.05]));
      }
      break;
    case 'plates':
      for (let i = 0; i < 3; i++) body.add(mesh(BOX, S, [0, height * 0.55, 0.1 - i * 0.25], [0.12, 0.18, 0.2], [0.3, 0, 0]));
      break;
  }

  // Stage & rarity scale
  const stageScale = [0.8, 1.0, 1.22][sp.stage - 1] * (sp.rarity === 'apex' ? 1.2 : sp.rarity === 'legendary' ? 1.4 : 1);
  root.scale.setScalar(stageScale);
  height *= stageScale;

  const materials: THREE.MeshStandardMaterial[] = [];
  root.traverse((o) => {
    if (!(o as THREE.Mesh).isMesh) return;
    const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial;
    // only lit materials have an emissive channel to flash
    if (m.isMeshStandardMaterial && !materials.includes(m)) materials.push(m);
  });

  const phase = Math.random() * 10;
  const floaty = L.shape === 'sprite' || L.shape === 'bird' || L.shape === 'fish' || L.shape === 'wraith' || sp.rarity === 'legendary';
  const wobble = L.shape === 'slime' ? 0.07 : 0.025;
  const update = (t: number) => {
    const tt = t + phase;
    if (floaty) body.position.y = 0.15 + Math.sin(tt * 2.2) * 0.08;
    else { const s = Math.sin(tt * 3) * wobble; body.scale.set(1 + s, 1 - s, 1 + s); }
    if (headR > 0) head.rotation.z = Math.sin(tt * 1.3) * 0.06;
    for (const w of wings) w.rotation.z = Math.sin(tt * (L.shape === 'sprite' ? 14 : L.shape === 'fish' ? 7 : 5)) * 0.35 * Math.sign(w.position.x);
    if (L.shape === 'fish') tailSegs[0].rotation.y = Math.sin(tt * 6) * 0.45;
    else tailSegs.forEach((sgm, i) => { sgm.position.x = (L.shape === 'serpent' ? Math.sin((i / 5) * Math.PI * 1.5) * 0.35 : 0) + Math.sin(tt * 3 - i * 0.8) * 0.05 * (i + 1); });
    for (const l of limbs) {
      l.userData.x ??= l.rotation.x;
      l.rotation.x = l.userData.x + Math.sin(tt * 2 + (l.position.x > 0 ? 0 : 1.6)) * (L.shape === 'wraith' ? 0.28 : 0.12);
    }
    for (const f of flick) f.scale.y = (f.userData.base ??= f.scale.y) * (0.85 + Math.sin(tt * 12 + f.position.x * 9) * 0.15);
  };
  return { root, body, materials, height, update };
}

/** Flash a creature white (hit) by pulsing emissive. */
export function flash(rig: CreatureRig, color = '#ffffff', strength = 1) {
  for (const m of rig.materials) {
    m.userData.baseEmissive ??= m.emissive.clone();
    m.userData.baseIntensity ??= m.emissiveIntensity;
    m.emissive.set(color);
    m.emissiveIntensity = strength;
  }
}
export function unflash(rig: CreatureRig) {
  for (const m of rig.materials) {
    if (m.userData.baseEmissive) { m.emissive.copy(m.userData.baseEmissive); m.emissiveIntensity = m.userData.baseIntensity; }
  }
}
