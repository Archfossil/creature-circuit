import * as THREE from 'three';
import type { Species } from '../data/schema';
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

function eyes(parent: THREE.Object3D, y: number, z: number, spread: number, size: number) {
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

  switch (L.shape) {
    case 'blob': {
      body.add(mesh(SPHERE, P, [0, 0.5, 0], [0.62, 0.5, 0.58]));
      body.add(mesh(SPHERE, S, [0, 0.38, 0.22], [0.42, 0.32, 0.38]));
      for (const sx of [-1, 1]) body.add(mesh(SPHERE, P, [sx * 0.3, 0.08, 0.15], [0.16, 0.1, 0.2]));
      headY = 0.62; headZ = 0.38; headR = 0;
      eyes(body, 0.66, 0.5, 0.18, 0.1);
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
      eyes(body, 0.7, 0.42, 0.2, 0.08);
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
  }

  if (headR > 0) {
    head.position.set(0, headY, headZ);
    head.add(mesh(SPHERE, P, [0, 0, 0], [headR, headR * 0.92, headR * 0.95]));
    head.add(mesh(SPHERE, S, [0, -headR * 0.35, headR * 0.55], [headR * 0.5, headR * 0.35, headR * 0.4]));
    eyes(head, headR * 0.12, headR * 0.72, headR * 0.42, headR * 0.24);
    if (L.shape === 'bird') head.add(mesh(CONE, mat('#f2b134'), [0, -headR * 0.15, headR * 1.05], [0.08, 0.2, 0.08], [Math.PI / 2, 0, 0]));
    body.add(head);
  }

  // Crest decoration
  const crestParent = headR > 0 ? head : body;
  const top = headR > 0 ? headR * 0.85 : 1.0;
  const cz = headR > 0 ? 0 : 0.1;
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
  const floaty = L.shape === 'sprite' || L.shape === 'bird' || L.shape === 'fish' || sp.rarity === 'legendary';
  const update = (t: number) => {
    const tt = t + phase;
    if (floaty) body.position.y = 0.15 + Math.sin(tt * 2.2) * 0.08;
    else { const s = Math.sin(tt * 3) * 0.025; body.scale.set(1 + s, 1 - s, 1 + s); }
    if (headR > 0) head.rotation.z = Math.sin(tt * 1.3) * 0.06;
    for (const w of wings) w.rotation.z = Math.sin(tt * (L.shape === 'sprite' ? 14 : L.shape === 'fish' ? 7 : 5)) * 0.35 * Math.sign(w.position.x);
    if (L.shape === 'fish') tailSegs[0].rotation.y = Math.sin(tt * 6) * 0.45;
    else tailSegs.forEach((sgm, i) => { sgm.position.x = (L.shape === 'serpent' ? Math.sin((i / 5) * Math.PI * 1.5) * 0.35 : 0) + Math.sin(tt * 3 - i * 0.8) * 0.05 * (i + 1); });
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
