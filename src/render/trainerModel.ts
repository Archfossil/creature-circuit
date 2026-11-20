// Procedural trainer "minis": little low-poly tabletop figures on a round base, built from a
// TrainerLook. Looks are derived from who the trainer is (player, Arbiter, Champion or a roaming
// trainer), and seeded from their name so the same trainer always looks the same.
import * as THREE from 'three';
import type { ElementType } from '../data/schema';
import { TYPE_COLOR, typeIcon } from '../data/types';

export type Hat = 'cap' | 'brim' | 'beanie' | 'circlet' | 'none';
export type Jacket = 'tee' | 'jacket' | 'coat' | 'pouch' | 'vest';
export type HairStyle = 'short' | 'ponytail' | 'streak' | 'spiky' | 'long' | 'bald';
export interface TrainerLook {
  outfit: string;   // shirt / jacket
  accent: string;   // trim, hat, pack, cape
  jacket?: Jacket;  // cut of the top (default 'jacket')
  hatColor?: string; // default: accent
  hairStyle?: HairStyle; // default 'short'
  hairAccent?: string;   // ponytail tie / streak colour (the player's main colour)
  pants: string;
  skin: string;
  hair: string;
  hat: Hat;
  cape?: boolean;
  pack?: boolean;
  emblem?: ElementType; // floating type emblem (Arbiters)
  rim: string;      // colored rim on the mini's base
}

export const SKIN = ['#f6d2b4', '#e9b48f', '#c98d63', '#a8693f', '#7a4a2a', '#5a3620'];
export const HAIR = ['#2b2a33', '#4a3226', '#7a4a2a', '#c99a4a', '#e8d9a8', '#b8432f', '#6b6577', '#e9e6ef', '#ff8a3d', '#2f8f4a', '#8fd36b', '#3d7dd8', '#9b5cd6', '#ff8fc8'];
const OUTFIT = ['#3d7dd8', '#2f9e6a', '#d8783d', '#8a4dd8', '#c23b5a', '#2a8a9a', '#7a8a3d', '#d8b23d'];
export const PANTS = ['#3a3f55', '#2f4a7a', '#5a4a3a', '#2b2a33', '#4a5a3a', '#6b6577', '#a88a5c', '#e8e2d4', '#d8483d', '#ff8a3d', '#ffcc33', '#2fbf71', '#3d8bff', '#b05cff', '#ff6fb5'];
/** Trainer customisation options (the player's main colour always goes on the top and hat). */
export const HAT_OPTIONS: { id: Hat; label: string }[] = [
  { id: 'cap', label: 'Cap' }, { id: 'brim', label: 'Wide brim' }, { id: 'beanie', label: 'Beanie' }, { id: 'none', label: 'No hat' },
];
export const JACKET_OPTIONS: { id: Jacket; label: string }[] = [
  { id: 'jacket', label: 'Long shirt' }, { id: 'tee', label: 'Tee' }, { id: 'pouch', label: 'Pouch jacket' }, { id: 'coat', label: 'Long coat' }, { id: 'vest', label: 'Vest' },
];
export const HAIR_STYLE_OPTIONS: { id: HairStyle; label: string }[] = [
  { id: 'short', label: 'Short' }, { id: 'ponytail', label: 'Ponytail' }, { id: 'streak', label: 'Streak' }, { id: 'spiky', label: 'Spiky' }, { id: 'long', label: 'Long' }, { id: 'bald', label: 'Bald' },
];

/** The player's chosen look (saved with the game). Every field is optional: gaps are filled from the name. */
export interface TrainerAppearance { skin?: string; hair?: string; pants?: string; hat?: string; jacket?: string; hairStyle?: string }

/** Small deterministic RNG so a name always produces the same mini. */
function seeded(name: string) {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
const pickFrom = <T,>(r: () => number, list: T[]) => list[Math.floor(r() * list.length) % list.length];

/** Roaming-trainer titles decide their gear ("Hiker Rosa" wears a wide hat and a pack). */
const TITLE_GEAR: Record<string, { hat: Hat; pack?: boolean }> = {
  hiker: { hat: 'brim', pack: true }, ranger: { hat: 'brim' }, birder: { hat: 'cap' }, camper: { hat: 'beanie', pack: true },
  angler: { hat: 'brim' }, botanist: { hat: 'brim', pack: true }, geologist: { hat: 'cap', pack: true }, drifter: { hat: 'beanie' },
  scout: { hat: 'cap', pack: true }, painter: { hat: 'beanie' }, rival: { hat: 'cap' },
};

/** The player's mini: always in their chosen colour (top and hat), with their customisation. */
export function playerLook(name: string, color: string, app: TrainerAppearance = {}): TrainerLook {
  const r = seeded(name);
  const skin = pickFrom(r, SKIN), hair = pickFrom(r, HAIR.slice(0, 7));
  const hat = (HAT_OPTIONS.find((o) => o.id === app.hat)?.id ?? 'cap');
  const jacketId = app.jacket === 'hoodie' ? 'pouch' : app.jacket; // early saves called the pouch jacket a hoodie
  const jacket = (JACKET_OPTIONS.find((o) => o.id === jacketId)?.id ?? 'jacket');
  const hairStyle = (HAIR_STYLE_OPTIONS.find((o) => o.id === app.hairStyle)?.id ?? 'short');
  return {
    outfit: color, accent: '#fff8e8', hatColor: color, jacket, hairStyle, hairAccent: color,
    pants: app.pants ?? PANTS[0], skin: app.skin ?? skin, hair: app.hair ?? hair, hat, pack: true, rim: color,
  };
}

export function arbiterLook(name: string, type: ElementType): TrainerLook {
  const r = seeded(name);
  return { outfit: TYPE_COLOR[type], accent: '#ffd84a', pants: '#2b2a33', skin: pickFrom(r, SKIN), hair: pickFrom(r, HAIR), hat: 'circlet', cape: true, emblem: type, rim: TYPE_COLOR[type] };
}

export function championLook(name: string): TrainerLook {
  const r = seeded(name);
  return { outfit: pickFrom(r, OUTFIT), accent: '#ffd84a', pants: '#2b2a33', skin: pickFrom(r, SKIN), hair: pickFrom(r, HAIR), hat: 'none', cape: true, rim: '#ffd84a' };
}

export function roamingLook(name: string): TrainerLook {
  const r = seeded(name);
  const gear = TITLE_GEAR[name.split(' ')[0].toLowerCase()] ?? { hat: pickFrom(r, ['cap', 'brim', 'beanie', 'none'] as Hat[]) };
  const outfit = pickFrom(r, OUTFIT);
  return { outfit, accent: pickFrom(r, OUTFIT.filter((c) => c !== outfit)), pants: pickFrom(r, PANTS), skin: pickFrom(r, SKIN), hair: pickFrom(r, HAIR), hat: gear.hat, pack: gear.pack, rim: '#e9dcc0' };
}

const mats = new Map<string, THREE.MeshStandardMaterial>();
const mat = (color: string, rough = 0.7) => {
  const k = `${color}|${rough}`;
  let m = mats.get(k);
  if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness: rough, flatShading: true }); mats.set(k, m); }
  return m;
};
/** A curved lock of hair laid over the head sphere: it starts thin along the parting near the crown, sweeps
 *  sideways and down across the brow, dips lowest over one eye, then tapers up towards the temple. The band
 *  is a sphere patch whose top and bottom edges (polar angle) vary along its width (azimuth). */
function swoopGeometry(r: number): THREE.BufferGeometry {
  // (a slice clear of the poles: three.js drops half the triangles in a pole row, which would leave teeth)
  const geo = new THREE.SphereGeometry(r, 14, 6, 0, Math.PI * 2, 0.5, 1);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  const phi0 = Math.PI / 2 - 0.22, phiLen = 1.25;                            // from just across the centre parting out to the temple
  const smooth = (x: number) => x * x * (3 - 2 * x);
  for (let i = 0; i < pos.count; i++) {
    const u = uv.getX(i), v = 1 - uv.getY(i);
    const top = Math.PI * (0.06 + 0.22 * smooth(Math.max(0, (u - 0.4) / 0.6)));   // starts at the crown, drops to meet the bottom edge at the temple
    const bottom = Math.PI * (0.28 + 0.27 * Math.sin(Math.PI * u));                // lowest midway across, over the eye; a tapered tip at the temple
    const phi = phi0 + u * phiLen, theta = top + v * (bottom - top);
    pos.setXYZ(i, -r * Math.cos(phi) * Math.sin(theta), r * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta));
  }
  geo.computeVertexNormals();
  return geo;
}

function part(geo: THREE.BufferGeometry, color: string, pos: [number, number, number], rot?: [number, number, number], rough?: number) {
  const m = new THREE.Mesh(geo, mat(color, rough));
  m.position.set(...pos);
  if (rot) m.rotation.set(...rot);
  m.castShadow = true;
  return m;
}

export interface TrainerRig { root: THREE.Group; figure: THREE.Group; update: (t: number) => void }

/** Build a mini facing +Z, about 2 units tall including its base. */
export function buildTrainer(look: TrainerLook): TrainerRig {
  const root = new THREE.Group();
  const figure = new THREE.Group();
  // the mini's base: a dark disc with a colored rim
  root.add(part(new THREE.CylinderGeometry(0.62, 0.66, 0.14, 20), '#2b2a33', [0, 0.07, 0], undefined, 0.4));
  root.add(part(new THREE.CylinderGeometry(0.67, 0.67, 0.06, 20), look.rim, [0, 0.03, 0], undefined, 0.4));
  root.add(figure);
  figure.position.y = 0.14;

  // legs and boots
  for (const sx of [-0.12, 0.12]) {
    figure.add(part(new THREE.CylinderGeometry(0.09, 0.1, 0.52, 7), look.pants, [sx, 0.32, 0]));
    figure.add(part(new THREE.BoxGeometry(0.17, 0.1, 0.26), '#3a2a22', [sx, 0.05, 0.04]));
  }
  // torso, belt, collar: the cut of the top changes the trim, the sleeves and what hangs below
  const jacket = look.jacket ?? 'jacket';
  const dark = '#' + new THREE.Color(look.outfit).multiplyScalar(0.62).getHexString();
  const shirt = '#f4efe4';
  figure.add(part(new THREE.CylinderGeometry(0.25, 0.21, 0.58, 8), look.outfit, [0, 0.86, 0]));
  figure.add(part(new THREE.CylinderGeometry(0.215, 0.215, 0.07, 8), jacket === 'coat' ? dark : '#3a2a22', [0, 0.6, 0]));
  if (jacket === 'pouch' || jacket === 'coat') {
    figure.add(part(new THREE.CylinderGeometry(0.19, 0.27, 0.1, 8), dark, [0, 1.15, 0]));         // popped collar
    figure.add(part(new THREE.BoxGeometry(0.035, 0.52, 0.03), dark, [0, 0.87, 0.232]));           // zip
  } else {
    figure.add(part(new THREE.CylinderGeometry(0.17, 0.25, 0.06, 8), jacket === 'vest' ? shirt : look.accent, [0, 1.15, 0]));
  }
  if (jacket === 'coat') figure.add(part(new THREE.CylinderGeometry(0.24, 0.31, 0.36, 8), look.outfit, [0, 0.42, 0])); // coat tails
  if (jacket === 'pouch') {
    figure.add(part(new THREE.BoxGeometry(0.17, 0.15, 0.045), dark, [-0.1, 0.74, 0.215]));        // front pouch pockets
    figure.add(part(new THREE.BoxGeometry(0.17, 0.15, 0.045), dark, [0.1, 0.74, 0.215]));
  }
  if (jacket === 'vest') figure.add(part(new THREE.BoxGeometry(0.12, 0.42, 0.03), shirt, [0, 0.93, 0.228])); // shirt under the vest
  // arms (slightly out from the body) and hands
  const armColor = jacket === 'tee' ? look.skin : jacket === 'vest' ? shirt : look.outfit;
  for (const sx of [-1, 1]) {
    const tilt = sx * 0.22;
    figure.add(part(new THREE.CylinderGeometry(0.07, 0.075, 0.5, 6), armColor, [sx * 0.33, 0.88, 0], [0, 0, tilt]));
    if (jacket === 'tee') { // short sleeve over the top of the arm
      figure.add(part(new THREE.CylinderGeometry(0.085, 0.09, 0.2, 6), look.outfit, [sx * 0.33 - 0.15 * Math.sin(tilt), 0.88 + 0.15 * Math.cos(tilt), 0], [0, 0, tilt]));
    }
    figure.add(part(new THREE.SphereGeometry(0.075, 8, 6), look.skin, [sx * 0.39, 0.62, 0]));
  }
  // neck, head, eyes
  const headY = 1.39;
  figure.add(part(new THREE.CylinderGeometry(0.08, 0.09, 0.16, 8), look.skin, [0, 1.2, 0]));
  figure.add(part(new THREE.SphereGeometry(0.22, 14, 10), look.skin, [0, headY, 0]));
  for (const sx of [-0.075, 0.075]) figure.add(part(new THREE.SphereGeometry(0.03, 6, 5), '#1c1b22', [sx, headY + 0.02, 0.2], undefined, 0.3));

  // hair: a cap of hair for every style but bald, plus the style's extra pieces
  const style = look.hairStyle ?? 'short';
  const tie = look.hairAccent ?? look.accent;
  const hatOn = look.hat !== 'none' && look.hat !== 'circlet';
  if (style !== 'bald') figure.add(part(new THREE.SphereGeometry(0.235, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), look.hair, [0, headY + 0.01, -0.02]));
  if (style === 'ponytail') {
    figure.add(part(new THREE.CylinderGeometry(0.09, 0.095, 0.08, 10), tie, [0, headY - 0.01, -0.29], [-0.9, 0, 0]));           // hair tie
    figure.add(part(new THREE.CylinderGeometry(0.075, 0.035, 0.34, 8), look.hair, [0, headY - 0.17, -0.36], [-0.35, 0, 0]));   // tail
  } else if (style === 'streak') {
    // a side-swept streak of the trainer's colour: a band over one side of the crown that sweeps
    // down into a lock of fringe angled across the brow and over one eye
    figure.add(part(swoopGeometry(0.243), tie, [0, headY + 0.01, -0.02]));
  } else if (style === 'spiky' && !hatOn) {
    for (const [x, z, tilt] of [[0, 0, 0], [0.11, -0.03, -0.45], [-0.11, -0.03, 0.45], [0.05, -0.12, -0.2], [-0.05, -0.12, 0.2]]) {
      figure.add(part(new THREE.ConeGeometry(0.06, 0.16, 6), look.hair, [x, headY + 0.24, z], [-0.25, 0, tilt]));
    }
  } else if (style === 'long') {
    figure.add(part(new THREE.BoxGeometry(0.4, 0.36, 0.1), look.hair, [0, headY - 0.14, -0.17], [0.12, 0, 0]));
  }

  // hats
  const hatY = headY + 0.16;
  const hatC = look.hatColor ?? look.accent;
  if (look.hat === 'cap') {
    figure.add(part(new THREE.SphereGeometry(0.24, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), hatC, [0, hatY - 0.04, 0]));
    figure.add(part(new THREE.BoxGeometry(0.3, 0.03, 0.2), hatC, [0, hatY - 0.04, 0.24]));
  } else if (look.hat === 'brim') {
    figure.add(part(new THREE.CylinderGeometry(0.44, 0.44, 0.035, 14), hatC, [0, hatY, 0]));
    figure.add(part(new THREE.CylinderGeometry(0.19, 0.22, 0.2, 10), hatC, [0, hatY + 0.1, 0]));
  } else if (look.hat === 'beanie') {
    figure.add(part(new THREE.SphereGeometry(0.255, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), hatC, [0, hatY - 0.08, 0]));
    figure.add(part(new THREE.SphereGeometry(0.07, 8, 6), '#fff8e8', [0, hatY + 0.17, 0]));
  } else if (look.hat === 'circlet') {
    figure.add(part(new THREE.TorusGeometry(0.235, 0.03, 6, 16), look.accent, [0, hatY - 0.06, 0], [Math.PI / 2, 0, 0], 0.25));
    figure.add(part(new THREE.OctahedronGeometry(0.06, 0), look.outfit, [0, hatY - 0.04, 0.23], undefined, 0.25));
  }
  // cape and backpack
  if (look.cape) figure.add(part(new THREE.BoxGeometry(0.5, 0.95, 0.04), look.accent === '#ffd84a' ? look.outfit : look.accent, [0, 0.72, -0.25], [0.12, 0, 0]));
  if (look.cape) figure.add(part(new THREE.BoxGeometry(0.52, 0.05, 0.06), look.accent, [0, 1.17, -0.22]));
  if (look.pack) figure.add(part(new THREE.BoxGeometry(0.34, 0.4, 0.18), look.accent, [0, 0.9, -0.28]));

  // Arbiters: their type emblem floats above
  let emblem: THREE.Sprite | null = null;
  if (look.emblem) {
    const tex = new THREE.TextureLoader().load(typeIcon(look.emblem));
    tex.colorSpace = THREE.SRGBColorSpace;
    emblem = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    emblem.scale.set(0.55, 0.55, 1);
    emblem.position.y = 2.25;
    root.add(emblem);
  }

  const phase = Math.random() * 10;
  return {
    root, figure,
    update: (t) => {
      // idle: a slow sway, and a gentle bob for the floating emblem
      figure.rotation.y = Math.sin(t * 0.7 + phase) * 0.12;
      if (emblem) emblem.position.y = 2.25 + Math.sin(t * 2 + phase) * 0.06;
    },
  };
}
