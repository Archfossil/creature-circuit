// Procedural trainer "minis": little low-poly tabletop figures on a round base, built from a
// TrainerLook. Looks are derived from who the trainer is (player, Arbiter, Champion or a roaming
// trainer), and seeded from their name so the same trainer always looks the same.
import * as THREE from 'three';
import type { ElementType } from '../data/schema';
import { TYPE_COLOR, typeIcon } from '../data/types';

export type Hat = 'cap' | 'brim' | 'beanie' | 'hood' | 'circlet' | 'none';
export interface TrainerLook {
  outfit: string;   // shirt / jacket
  accent: string;   // trim, hat, pack, cape
  pants: string;
  skin: string;
  hair: string;
  hat: Hat;
  cape?: boolean;
  pack?: boolean;
  emblem?: ElementType; // floating type emblem (Arbiters)
  rim: string;      // colored rim on the mini's base
}

const SKIN = ['#f6d2b4', '#e9b48f', '#c98d63', '#a8693f', '#7a4a2a', '#5a3620'];
const HAIR = ['#2b2a33', '#4a3226', '#7a4a2a', '#c99a4a', '#e8d9a8', '#b8432f', '#6b6577'];
const OUTFIT = ['#3d7dd8', '#2f9e6a', '#d8783d', '#8a4dd8', '#c23b5a', '#2a8a9a', '#7a8a3d', '#d8b23d'];
const PANTS = ['#3a3f55', '#5a4a3a', '#2b2a33', '#4a5a3a', '#6b6577'];

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
  angler: { hat: 'brim' }, botanist: { hat: 'brim', pack: true }, geologist: { hat: 'cap', pack: true }, drifter: { hat: 'hood' },
  scout: { hat: 'cap', pack: true }, painter: { hat: 'beanie' }, rival: { hat: 'cap' },
};

export function playerLook(name: string, color: string): TrainerLook {
  const r = seeded(name);
  return { outfit: color, accent: '#fff8e8', pants: '#3a3f55', skin: pickFrom(r, SKIN), hair: pickFrom(r, HAIR), hat: 'cap', pack: true, rim: color };
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
  // torso, belt, collar trim
  figure.add(part(new THREE.CylinderGeometry(0.25, 0.21, 0.58, 8), look.outfit, [0, 0.86, 0]));
  figure.add(part(new THREE.CylinderGeometry(0.215, 0.215, 0.07, 8), '#3a2a22', [0, 0.6, 0]));
  figure.add(part(new THREE.CylinderGeometry(0.17, 0.25, 0.06, 8), look.accent, [0, 1.15, 0]));
  // arms (slightly out from the body) and hands
  for (const sx of [-1, 1]) {
    figure.add(part(new THREE.CylinderGeometry(0.07, 0.075, 0.5, 6), look.outfit, [sx * 0.33, 0.88, 0], [0, 0, sx * 0.22]));
    figure.add(part(new THREE.SphereGeometry(0.075, 8, 6), look.skin, [sx * 0.39, 0.62, 0]));
  }
  // head, eyes, hair
  const headY = 1.42;
  figure.add(part(new THREE.SphereGeometry(0.22, 14, 10), look.skin, [0, headY, 0]));
  for (const sx of [-0.075, 0.075]) figure.add(part(new THREE.SphereGeometry(0.03, 6, 5), '#1c1b22', [sx, headY + 0.02, 0.2], undefined, 0.3));
  if (look.hat !== 'hood') figure.add(part(new THREE.SphereGeometry(0.235, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), look.hair, [0, headY + 0.01, -0.02]));

  // hats
  const hatY = headY + 0.16;
  if (look.hat === 'cap') {
    figure.add(part(new THREE.SphereGeometry(0.24, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), look.accent, [0, hatY - 0.04, 0]));
    figure.add(part(new THREE.BoxGeometry(0.3, 0.03, 0.2), look.accent, [0, hatY - 0.04, 0.24]));
  } else if (look.hat === 'brim') {
    figure.add(part(new THREE.CylinderGeometry(0.44, 0.44, 0.035, 14), look.accent, [0, hatY, 0]));
    figure.add(part(new THREE.CylinderGeometry(0.19, 0.22, 0.2, 10), look.accent, [0, hatY + 0.1, 0]));
  } else if (look.hat === 'beanie') {
    figure.add(part(new THREE.SphereGeometry(0.255, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), look.accent, [0, hatY - 0.08, 0]));
    figure.add(part(new THREE.SphereGeometry(0.07, 8, 6), '#fff8e8', [0, hatY + 0.17, 0]));
  } else if (look.hat === 'hood') {
    figure.add(part(new THREE.SphereGeometry(0.29, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), look.outfit, [0, headY + 0.02, -0.04]));
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
