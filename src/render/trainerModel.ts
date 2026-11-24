// Procedural trainer "minis": little low-poly tabletop figures on a round base, built from a
// TrainerLook. Looks are derived from who the trainer is (player, Arbiter, Champion or a roaming
// trainer), and seeded from their name so the same trainer always looks the same.
import * as THREE from 'three';
import type { ElementType } from '../data/schema';
import { TYPE_COLOR, typeIcon } from '../data/types';

export type Hat = 'cap' | 'backcap' | 'brim' | 'beanie' | 'ushanka' | 'bucket' | 'beret' | 'headband' | 'tophat' | 'cowboy' | 'circlet' | 'none';
export type Jacket = 'tee' | 'jacket' | 'coat' | 'pouch' | 'vest' | 'overalls' | 'poncho';
export type HairStyle = 'short' | 'ponytail' | 'streak' | 'spiky' | 'long' | 'pigtails' | 'bun' | 'braid' | 'curls' | 'mohawk' | 'bald';
/** Detail patterns, drawn in a garment's (or the hair's) secondary colour. 'plain' is none. */
export type TopPattern = 'plain' | 'stripes' | 'pinstripes' | 'checks' | 'dots' | 'chevrons';
export type HatPattern = 'plain' | 'band' | 'panels' | 'stripes' | 'dots' | 'badge';
export type HairPattern = 'plain' | 'tips' | 'roots' | 'streaks' | 'split' | 'fringe';
export interface TrainerLook {
  outfit: string;   // shirt / jacket
  accent: string;   // trim, hat, pack, cape
  jacket?: Jacket;  // cut of the top (default 'jacket')
  hatColor?: string; // default: accent
  hairStyle?: HairStyle; // default 'short'
  hairAccent?: string;   // hair ties, the Streak style and the hair pattern (default for players: their main colour)
  hatAccent?: string;    // hat pattern and trim (default: cream)
  topPattern?: TopPattern; // drawn in `accent`
  hatPattern?: HatPattern;
  hairPattern?: HairPattern;
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
  { id: 'cap', label: 'Cap' }, { id: 'backcap', label: 'Backwards cap' }, { id: 'brim', label: 'Wide brim' }, { id: 'beanie', label: 'Beanie' }, { id: 'ushanka', label: 'Ushanka' },
  { id: 'bucket', label: 'Bucket hat' }, { id: 'beret', label: 'Beret' }, { id: 'headband', label: 'Headband' }, { id: 'tophat', label: 'Top hat' }, { id: 'cowboy', label: 'Cowboy hat' }, { id: 'none', label: 'No hat' },
];
/** Tops. A `-pack` id is the same cut worn with a backpack. */
export type TopId = Jacket | `${'jacket' | 'tee' | 'pouch' | 'coat' | 'vest'}-pack`;
export const JACKET_OPTIONS: { id: TopId; label: string }[] = [
  { id: 'jacket', label: 'Long shirt' }, { id: 'tee', label: 'Tee' }, { id: 'pouch', label: 'Pouch jacket' }, { id: 'coat', label: 'Long coat' }, { id: 'vest', label: 'Vest' },
  { id: 'overalls', label: 'Overalls' }, { id: 'poncho', label: 'Poncho' },
  { id: 'jacket-pack', label: 'Long shirt + backpack' }, { id: 'tee-pack', label: 'Tee + backpack' }, { id: 'pouch-pack', label: 'Pouch jacket + backpack' }, { id: 'coat-pack', label: 'Long coat + backpack' }, { id: 'vest-pack', label: 'Vest + backpack' },
];
export const HAIR_STYLE_OPTIONS: { id: HairStyle; label: string }[] = [
  { id: 'short', label: 'Short' }, { id: 'ponytail', label: 'Ponytail' }, { id: 'streak', label: 'Streak' }, { id: 'spiky', label: 'Spiky' }, { id: 'long', label: 'Long' },
  { id: 'pigtails', label: 'Pigtails' }, { id: 'bun', label: 'Bun' }, { id: 'braid', label: 'Braid' }, { id: 'curls', label: 'Curls' }, { id: 'mohawk', label: 'Mohawk' }, { id: 'bald', label: 'Bald' },
];
export const TOP_PATTERN_OPTIONS: { id: TopPattern; label: string }[] = [
  { id: 'plain', label: 'Plain' }, { id: 'stripes', label: 'Stripes' }, { id: 'pinstripes', label: 'Pinstripes' }, { id: 'checks', label: 'Checks' }, { id: 'dots', label: 'Dots' }, { id: 'chevrons', label: 'Chevrons' },
];
export const HAT_PATTERN_OPTIONS: { id: HatPattern; label: string }[] = [
  { id: 'plain', label: 'Plain' }, { id: 'band', label: 'Band' }, { id: 'panels', label: 'Panels' }, { id: 'stripes', label: 'Stripes' }, { id: 'dots', label: 'Dots' }, { id: 'badge', label: 'Badge' },
];
export const HAIR_PATTERN_OPTIONS: { id: HairPattern; label: string }[] = [
  { id: 'plain', label: 'Plain' }, { id: 'tips', label: 'Dipped tips' }, { id: 'roots', label: 'Crown' }, { id: 'streaks', label: 'Highlights' }, { id: 'split', label: 'Half and half' }, { id: 'fringe', label: 'Front' },
];
/** Secondary colours: the trainer colours, some neutrals and a few extras. */
export const SECONDARY = ['#fff8e8', '#2b2a33', '#8d8a99', '#7a4a2a', '#ffd84a', '#ff6b3d', '#d8483d', '#a51d2d', '#ff4fa3', '#b05cff', '#3d8bff', '#1f3a93', '#5fd3e8', '#2fbf71', '#8fd36b'];

/** The player's chosen look (saved with the game). Every field is optional: gaps are filled from the name. */
export interface TrainerAppearance {
  skin?: string; hair?: string; pants?: string; hat?: string; jacket?: string; hairStyle?: string;
  topPattern?: string; hatPattern?: string; hairPattern?: string; topColor2?: string; hatColor2?: string; hairColor2?: string;
}

/** Which top the player wears. Looks saved before patterns existed always had a backpack, so they keep it. */
export function topOf(app: TrainerAppearance): TopId {
  const id = app.jacket === 'hoodie' ? 'pouch' : app.jacket; // early saves called the pouch jacket a hoodie
  const top = JACKET_OPTIONS.find((o) => o.id === id)?.id ?? 'jacket';
  if (app.topPattern !== undefined) return top;
  return JACKET_OPTIONS.find((o) => o.id === `${top}-pack`)?.id ?? top;
}

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
  const top = topOf(app);
  const hairStyle = (HAIR_STYLE_OPTIONS.find((o) => o.id === app.hairStyle)?.id ?? 'short');
  return {
    outfit: color, accent: app.topColor2 ?? SECONDARY[0], hatColor: color, hatAccent: app.hatColor2 ?? SECONDARY[0],
    jacket: top.replace('-pack', '') as Jacket, hairStyle, hairAccent: app.hairColor2 ?? color,
    topPattern: TOP_PATTERN_OPTIONS.find((o) => o.id === app.topPattern)?.id ?? 'plain',
    hatPattern: HAT_PATTERN_OPTIONS.find((o) => o.id === app.hatPattern)?.id ?? 'plain',
    hairPattern: HAIR_PATTERN_OPTIONS.find((o) => o.id === app.hairPattern)?.id ?? 'plain',
    pants: app.pants ?? PANTS[0], skin: app.skin ?? skin, hair: app.hair ?? hair, hat, pack: top.endsWith('-pack'), rim: color,
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

/**
 * Detail patterns, as GLSL: a signed value `d`, positive where the secondary colour shows. `p` is the point
 * on the garment (see `Paint`), `a` its angle around the vertical axis (0 at the front). Everything that
 * uses `a` goes through sin/cos of whole multiples, so there's no seam at the back.
 */
const PATTERN_GLSL: Record<string, string> = {
  'top:stripes': 'sin(p.y * 48.0)',
  'top:pinstripes': 'cos(a * 12.0) - 0.6',
  'top:checks': 'sin(a * 5.0) * sin(p.y * 36.0)',
  'top:dots': 'cos(a * 7.0) + cos(p.y * 50.0) - 0.9',
  'top:chevrons': 'sin(p.y * 40.0 + asin(sin(a * 4.0)) * 1.6) - 0.15',
  // hats: p.y is measured from the line where the hat sits on the head
  'hat:band': '0.04 - abs(p.y - 0.065)',
  'hat:panels': 'sin(a * 4.0)',
  'hat:stripes': 'sin(p.y * 70.0)',
  'hat:dots': 'cos(p.x * 38.0) + cos(p.y * 38.0 + 1.0) + cos(p.z * 38.0) - 1.1',
  'hat:badge': 'p.z > 0.0 ? 0.062 - length(p.xy) : -1.0', // p is measured from the middle of the badge
  // hair: p is measured from the middle of the head
  'hair:tips': '0.06 - p.y',
  'hair:spikes': 'length(p) - 0.27', // tips, on hair that stands up
  'hair:roots': 'p.y - 0.15',
  'hair:streaks': 'cos(a * 9.0) - 0.45',
  'hair:split': 'p.x',
  'hair:fringe': 'p.z - 0.07',
};
export const hasPattern = (key: string) => key in PATTERN_GLSL;

/**
 * How a part is patterned: the pattern's key and colour, and how to turn a point on the part into pattern
 * space. `origin` is taken off its place on the figure; `local` (arms) uses the part's own axis instead, lifted to height `local`.
 */
interface Paint { key: string; second: string; origin?: [number, number, number]; local?: number }

/** A material with a detail pattern. Parts using it need the `pat` attribute (see `part`). */
function patternMat(color: string, key: string, second: string) {
  const k = `${color}|${key}|${second}`;
  let m = mats.get(k);
  if (m) return m;
  m = new THREE.MeshStandardMaterial({ color, roughness: 0.7, flatShading: true });
  const uSecond = { value: new THREE.Color(second) };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uSecond = uSecond;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 pat;\nvarying vec3 vPat;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPat = pat;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPat;\nuniform vec3 uSecond;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        { vec3 p = vPat; float a = atan(p.x, p.z); float d = ${PATTERN_GLSL[key]};
          float w = max(fwidth(d), 1e-4); diffuseColor.rgb = mix(diffuseColor.rgb, uSecond, smoothstep(-w, w, d)); }`);
  };
  m.customProgramCacheKey = () => `trainer-${key}`;
  mats.set(k, m);
  return m;
}

function part(geo: THREE.BufferGeometry, color: string, pos: [number, number, number], rot?: [number, number, number], rough?: number, paint?: Paint) {
  const on = paint && hasPattern(paint.key);
  const m = new THREE.Mesh(geo, on ? patternMat(color, paint.key, paint.second) : mat(color, rough));
  m.position.set(...pos);
  if (rot) m.rotation.set(...rot);
  if (on) {
    const at = (geo.attributes.position as THREE.BufferAttribute).clone();
    if (paint.local !== undefined) at.applyMatrix4(new THREE.Matrix4().makeTranslation(0, paint.local, 0));
    else {
      m.updateMatrix();
      const [x, y, z] = paint.origin ?? [0, 0, 0];
      at.applyMatrix4(new THREE.Matrix4().makeTranslation(-x, -y, -z).multiply(m.matrix));
    }
    geo.setAttribute('pat', at);
  }
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
  const topKey = `top:${look.topPattern ?? 'plain'}`;
  const cloth: Paint = { key: topKey, second: look.accent };
  const overalls = jacket === 'overalls';
  figure.add(overalls
    ? part(new THREE.CylinderGeometry(0.25, 0.21, 0.58, 8), look.accent, [0, 0.86, 0])  // the shirt under them
    : part(new THREE.CylinderGeometry(0.25, 0.21, 0.58, 8), look.outfit, [0, 0.86, 0], undefined, undefined, cloth));
  if (!overalls) figure.add(part(new THREE.CylinderGeometry(0.215, 0.215, 0.07, 8), jacket === 'coat' ? dark : '#3a2a22', [0, 0.6, 0]));
  if (jacket === 'pouch' || jacket === 'coat') {
    figure.add(part(new THREE.CylinderGeometry(0.19, 0.27, 0.1, 8), dark, [0, 1.15, 0]));         // popped collar
    figure.add(part(new THREE.BoxGeometry(0.035, 0.52, 0.03), dark, [0, 0.87, 0.232]));           // zip
  } else {
    figure.add(part(new THREE.CylinderGeometry(0.17, 0.25, 0.06, 8), jacket === 'vest' ? shirt : look.accent, [0, 1.15, 0]));
  }
  if (jacket === 'coat') figure.add(part(new THREE.CylinderGeometry(0.24, 0.31, 0.36, 8), look.outfit, [0, 0.42, 0], undefined, undefined, cloth)); // coat tails
  if (jacket === 'pouch') {
    figure.add(part(new THREE.BoxGeometry(0.17, 0.15, 0.045), dark, [-0.1, 0.74, 0.215]));        // front pouch pockets
    figure.add(part(new THREE.BoxGeometry(0.17, 0.15, 0.045), dark, [0.1, 0.74, 0.215]));
  }
  if (jacket === 'vest') figure.add(part(new THREE.BoxGeometry(0.12, 0.42, 0.03), shirt, [0, 0.93, 0.228])); // shirt under the vest
  if (overalls) {
    figure.add(part(new THREE.CylinderGeometry(0.24, 0.235, 0.3, 8), look.outfit, [0, 0.69, 0], undefined, undefined, cloth)); // waist
    figure.add(part(new THREE.BoxGeometry(0.28, 0.26, 0.05), look.outfit, [0, 0.93, 0.215], undefined, undefined, cloth));     // bib
    figure.add(part(new THREE.BoxGeometry(0.14, 0.1, 0.03), dark, [0, 0.93, 0.24]));                                          // bib pocket
    for (const sx of [-0.11, 0.11]) {
      figure.add(part(new THREE.BoxGeometry(0.05, 0.16, 0.03), dark, [sx, 1.1, 0.215]));          // straps, front and back
      figure.add(part(new THREE.BoxGeometry(0.05, 0.38, 0.03), dark, [sx, 0.99, -0.225]));
    }
    for (const sx of [-0.12, 0.12]) figure.add(part(new THREE.CylinderGeometry(0.105, 0.115, 0.5, 7), look.outfit, [sx, 0.34, 0], undefined, undefined, cloth)); // legs
  }
  // a poncho drapes over the shoulders, a fringe of its trim colour along the hem
  if (jacket === 'poncho') {
    figure.add(part(new THREE.CylinderGeometry(0.18, 0.47, 0.46, 10), look.outfit, [0, 0.95, 0], undefined, undefined, cloth));
    figure.add(part(new THREE.CylinderGeometry(0.47, 0.49, 0.05, 10), look.accent, [0, 0.7, 0]));
  }
  // arms (slightly out from the body) and hands
  const armColor = jacket === 'tee' ? look.skin : jacket === 'vest' ? shirt : overalls ? look.accent : look.outfit;
  const sleeve: Paint | undefined = jacket === 'tee' || jacket === 'vest' || overalls ? undefined : { ...cloth, local: 0.88 };
  for (const sx of [-1, 1]) {
    const tilt = sx * 0.22;
    figure.add(part(new THREE.CylinderGeometry(0.07, 0.075, 0.5, 6), armColor, [sx * 0.33, 0.88, 0], [0, 0, tilt], undefined, sleeve));
    if (jacket === 'tee') { // short sleeve over the top of the arm
      figure.add(part(new THREE.CylinderGeometry(0.085, 0.09, 0.2, 6), look.outfit, [sx * 0.33 - 0.15 * Math.sin(tilt), 0.88 + 0.15 * Math.cos(tilt), 0], [0, 0, tilt], undefined, { ...cloth, local: 1.03 }));
    }
    figure.add(part(new THREE.SphereGeometry(0.075, 8, 6), look.skin, [sx * 0.39, 0.62, 0]));
  }
  // neck, head, eyes
  const headY = 1.39;
  figure.add(part(new THREE.CylinderGeometry(0.08, 0.09, 0.16, 8), look.skin, [0, 1.2, 0]));
  figure.add(part(new THREE.SphereGeometry(0.22, 14, 10), look.skin, [0, headY, 0]));
  for (const sx of [-0.075, 0.075]) figure.add(part(new THREE.SphereGeometry(0.03, 6, 5), '#1c1b22', [sx, headY + 0.02, 0.2], undefined, 0.3));

  // hair: a cap of hair for every style but bald and the mohawk, plus the style's extra pieces
  const style = look.hairStyle ?? 'short';
  const tie = look.hairAccent ?? look.accent;
  const hatOn = !['none', 'circlet', 'headband'].includes(look.hat); // something covering the crown
  const hairPaint: Paint = { key: `hair:${look.hairPattern ?? 'plain'}`, second: tie, origin: [0, headY, 0] };
  const lock = (geo: THREE.BufferGeometry, pos: [number, number, number], rot?: [number, number, number], paint = hairPaint) => figure.add(part(geo, look.hair, pos, rot, undefined, paint));
  const spikePaint: Paint = look.hairPattern === 'tips' ? { ...hairPaint, key: 'hair:spikes' } : hairPaint;
  if (style !== 'bald' && style !== 'mohawk') lock(new THREE.SphereGeometry(0.235, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), [0, headY + 0.01, -0.02]);
  if (style === 'ponytail') {
    figure.add(part(new THREE.CylinderGeometry(0.09, 0.095, 0.08, 10), tie, [0, headY - 0.01, -0.29], [-0.9, 0, 0]));           // hair tie
    lock(new THREE.CylinderGeometry(0.075, 0.035, 0.34, 8), [0, headY - 0.17, -0.36], [-0.35, 0, 0]);                           // tail
  } else if (style === 'streak') {
    // a side-swept streak of the hair's second colour: a band over one side of the crown that sweeps
    // down into a lock of fringe angled across the brow and over one eye
    figure.add(part(swoopGeometry(0.243), tie, [0, headY + 0.01, -0.02]));
  } else if (style === 'spiky' && !hatOn) {
    for (const [x, z, tilt] of [[0, 0, 0], [0.11, -0.03, -0.45], [-0.11, -0.03, 0.45], [0.05, -0.12, -0.2], [-0.05, -0.12, 0.2]]) {
      lock(new THREE.ConeGeometry(0.06, 0.16, 6), [x, headY + 0.24, z], [-0.25, 0, tilt], spikePaint);
    }
  } else if (style === 'long') {
    lock(new THREE.BoxGeometry(0.4, 0.36, 0.1), [0, headY - 0.14, -0.17], [0.12, 0, 0]);
  } else if (style === 'pigtails') {
    for (const sx of [-1, 1]) {
      figure.add(part(new THREE.SphereGeometry(0.06, 8, 6), tie, [sx * 0.25, headY - 0.02, -0.1]));
      lock(new THREE.SphereGeometry(0.095, 8, 6), [sx * 0.31, headY - 0.1, -0.12]);
      lock(new THREE.CylinderGeometry(0.085, 0.03, 0.28, 8), [sx * 0.34, headY - 0.25, -0.12], [0, 0, sx * 0.12]);
    }
  } else if (style === 'bun') {
    figure.add(part(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 10), tie, [0, headY + 0.02, -0.25], [Math.PI / 2, 0, 0]));
    lock(new THREE.SphereGeometry(0.125, 10, 8), [0, headY + 0.03, -0.34]);
  } else if (style === 'braid') {
    // links of a plait down the back, smaller towards the tie
    for (let i = 0; i < 5; i++) lock(new THREE.SphereGeometry(0.088 - i * 0.008, 7, 5), [(i % 2 ? 1 : -1) * 0.022, headY - 0.06 - i * 0.1, -0.26 - i * 0.035]);
    figure.add(part(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 8), tie, [0, headY - 0.55, -0.43]));
    lock(new THREE.ConeGeometry(0.05, 0.1, 7), [0, headY - 0.62, -0.43], [Math.PI, 0, 0]);
  } else if (style === 'curls') {
    // rings of curls around the sides and back, with more over the crown when no hat covers it
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (-0.28 + (1.56 * i) / 8) + Math.PI / 2; // round the back, ear to ear
      const x = Math.cos(a - Math.PI / 2) * 0.22, z = -Math.sin(a - Math.PI / 2) * 0.22 - 0.03;
      if (hatOn && z > 0.06) continue;
      lock(new THREE.SphereGeometry(0.085, 7, 6), [x, headY + (z > 0.06 ? 0.09 : 0), z]);
    }
    if (!hatOn) {
      for (let i = 0; i < 8; i++) lock(new THREE.SphereGeometry(0.095, 7, 6), [Math.sin(i * Math.PI / 4) * 0.17, headY + 0.17, Math.cos(i * Math.PI / 4) * 0.15 - 0.02]);
      lock(new THREE.SphereGeometry(0.13, 8, 6), [0, headY + 0.22, -0.02]);
    }
  } else if (style === 'mohawk') {
    // a crest from brow to nape; under a hat only the nape shows
    for (let i = hatOn ? 5 : 0; i < 7; i++) {
      const a = 0.75 - i * 0.4; // angle from straight up, forwards first
      lock(new THREE.ConeGeometry(0.075, 0.24, 5), [0, headY + Math.cos(a) * 0.27, Math.sin(a) * 0.27], [a, 0, 0], spikePaint);
    }
  }

  // hats
  const hatY = headY + 0.16;
  const hatC = look.hatColor ?? look.accent;
  const trim = look.hatAccent ?? '#fff8e8';
  // where the patterns sit on each hat: the line a band is measured from, and the middle of a badge (from hatY)
  const [line, badge] = ({ brim: [0, 0.1], beanie: [-0.08, 0.04], bucket: [0.02, 0.12], beret: [0, 0.06], headband: [-0.095, -0.07], tophat: [0, 0.14], cowboy: [0, 0.12] } as Partial<Record<Hat, [number, number]>>)[look.hat] ?? [-0.04, 0.05];
  const onBadge = look.hatPattern === 'badge';
  const hatPaint: Paint = { key: `hat:${look.hatPattern ?? 'plain'}`, second: trim, origin: [0, hatY + (onBadge ? badge : line), 0] };
  const felt = (geo: THREE.BufferGeometry, pos: [number, number, number], rot?: [number, number, number]) => figure.add(part(geo, hatC, pos, rot, undefined, hatPaint));
  const dome = (r: number) => new THREE.SphereGeometry(r, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  if (look.hat === 'cap' || look.hat === 'backcap') {
    const front = look.hat === 'cap' ? 1 : -1;
    felt(dome(0.24), [0, hatY - 0.04, 0]);
    figure.add(part(new THREE.BoxGeometry(0.3, 0.03, 0.2), hatC, [0, hatY - 0.04, 0.24 * front]));
    if (front < 0) figure.add(part(new THREE.BoxGeometry(0.16, 0.04, 0.03), trim, [0, hatY - 0.02, 0.235])); // the strap, now over the brow
  } else if (look.hat === 'brim') {
    felt(new THREE.CylinderGeometry(0.44, 0.44, 0.035, 14), [0, hatY, 0]);
    felt(new THREE.CylinderGeometry(0.19, 0.22, 0.2, 10), [0, hatY + 0.1, 0]);
  } else if (look.hat === 'beanie') {
    felt(dome(0.255), [0, hatY - 0.08, 0]);
    figure.add(part(new THREE.SphereGeometry(0.07, 8, 6), trim, [0, hatY + 0.17, 0]));
  } else if (look.hat === 'ushanka') {
    felt(dome(0.265), [0, hatY - 0.05, -0.01]);
    figure.add(part(new THREE.BoxGeometry(0.32, 0.13, 0.06), trim, [0, hatY + 0.02, 0.225], [-0.18, 0, 0], undefined, onBadge ? { key: 'hat:badge', second: hatC, origin: [0, hatY + 0.02, 0] } : undefined)); // turned-up fur front (it carries the badge)
    for (const sx of [-1, 1]) {                                                                                // ear flaps: cloth outside, fur inside and along the edge
      felt(new THREE.BoxGeometry(0.06, 0.32, 0.22), [sx * 0.265, hatY - 0.2, -0.03], [0, 0, sx * 0.1]);
      figure.add(part(new THREE.BoxGeometry(0.08, 0.07, 0.24), trim, [sx * 0.285, hatY - 0.37, -0.03], [0, 0, sx * 0.1]));
    }
    felt(new THREE.BoxGeometry(0.52, 0.28, 0.12), [0, hatY - 0.18, -0.2]);                                     // neck flap
  } else if (look.hat === 'bucket') {
    felt(new THREE.CylinderGeometry(0.19, 0.235, 0.2, 14), [0, hatY + 0.1, 0]);
    felt(new THREE.CylinderGeometry(0.235, 0.37, 0.09, 14), [0, hatY - 0.02, 0]);
  } else if (look.hat === 'beret') {
    figure.add(part(new THREE.CylinderGeometry(0.225, 0.23, 0.06, 14), trim, [0, hatY - 0.02, 0]));
    const puff = new THREE.SphereGeometry(0.31, 14, 8);
    puff.scale(1, 0.36, 1);
    felt(puff, [0.07, hatY + 0.05, -0.02], [0, 0, -0.2]);
    figure.add(part(new THREE.CylinderGeometry(0.015, 0.02, 0.07, 6), hatC, [0.09, hatY + 0.18, -0.02]));
  } else if (look.hat === 'headband') {
    felt(new THREE.CylinderGeometry(0.242, 0.246, 0.09, 16), [0, hatY - 0.07, -0.01]);
    figure.add(part(new THREE.BoxGeometry(0.07, 0.2, 0.025), trim, [-0.05, hatY - 0.16, -0.27], [0.3, 0, -0.25])); // knot tails
    figure.add(part(new THREE.BoxGeometry(0.07, 0.2, 0.025), trim, [0.05, hatY - 0.16, -0.27], [0.3, 0, 0.25]));
  } else if (look.hat === 'tophat') {
    felt(new THREE.CylinderGeometry(0.35, 0.35, 0.03, 16), [0, hatY, 0]);
    felt(new THREE.CylinderGeometry(0.235, 0.215, 0.36, 14), [0, hatY + 0.18, 0]);
  } else if (look.hat === 'cowboy') {
    // a wide brim curled up at the sides, and a creased crown
    const brim = new THREE.CylinderGeometry(0.46, 0.43, 0.035, 20, 1);
    const bp = brim.attributes.position;
    for (let i = 0; i < bp.count; i++) bp.setY(i, bp.getY(i) + Math.pow(Math.abs(bp.getX(i)) / 0.46, 2) * 0.14);
    brim.computeVertexNormals();
    felt(brim, [0, hatY - 0.01, 0]);
    felt(new THREE.CylinderGeometry(0.17, 0.225, 0.22, 12), [0, hatY + 0.1, 0]);
    for (const sx of [-1, 1]) felt(new THREE.SphereGeometry(0.09, 8, 6), [sx * 0.075, hatY + 0.2, 0]);
  } else if (look.hat === 'circlet') {
    figure.add(part(new THREE.TorusGeometry(0.235, 0.03, 6, 16), look.accent, [0, hatY - 0.06, 0], [Math.PI / 2, 0, 0], 0.25));
    figure.add(part(new THREE.OctahedronGeometry(0.06, 0), look.outfit, [0, hatY - 0.04, 0.23], undefined, 0.25));
  }
  // cape and backpack
  if (look.cape) figure.add(part(new THREE.BoxGeometry(0.5, 0.95, 0.04), look.accent === '#ffd84a' ? look.outfit : look.accent, [0, 0.72, -0.25], [0.12, 0, 0]));
  if (look.cape) figure.add(part(new THREE.BoxGeometry(0.52, 0.05, 0.06), look.accent, [0, 1.17, -0.22]));
  if (look.pack) {
    figure.add(part(new THREE.BoxGeometry(0.34, 0.4, 0.18), look.accent, [0, 0.9, -0.28]));
    for (const sx of [-0.15, 0.15]) figure.add(part(new THREE.BoxGeometry(0.05, 0.4, 0.03), '#5a4a3a', [sx, 0.97, 0.205])); // straps
  }

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
