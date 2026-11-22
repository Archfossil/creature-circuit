import * as THREE from 'three';
import { buildTrainer, playerLook, type TrainerLook, type TrainerRig } from './trainerModel';
import type { SceneView } from './engine';
import { isMobile } from './engine';
import { MAP_NODES, MAP_EDGES, NODE_BY_ID, CITIES } from '../data/map';
import type { Biome, MapNode } from '../data/schema';
import { BIOME_INFO, WEATHER } from '../data/content';
import type { Season } from '../data/content';
import { TYPE_COLOR, typeIcon } from '../data/types';
import { SPECIES_BY_ID } from '../data/species';
import { buildCreature, type CreatureRig } from './creatureModel';

import { hash, fbm, smooth, landField, SEGS, segDist } from './land';
import { MAP_SCALE as S } from '../data/map';

const ELEV: Record<Biome, number> = {
  mountain: 3.2, tundra: 1.6, canyon: 2.2, badlands: 1.3, volcanic: 2.2, forest: 0.9, grove: 0.8, meadow: 0.5,
  road: 0.5, desert: 0.7, lake: 0.25, river: 0.35, swamp: 0.2, coast: 0.25, cloud: 3.4, deepwood: 0.3, prism: 0.5,
};

/** Cloud Island's paths and node tiles: midnight plum, for contrast with the cotton-candy ground. */
const CLOUD_PATH = '#2a0f3a';

/** How much a point belongs to Cloud Island (0–1), from the nearby nodes' biomes. */
function cloudWeight(x: number, z: number) {
  let cloud = 0, all = 0;
  for (const { n, w } of biomeWeights(x, z)) { all += w; if (n.biome === 'cloud') cloud += w; }
  return all ? cloud / all : 0;
}

/** How much a point belongs to the Rainbow Plains (0–1). */
function prismWeight(x: number, z: number) {
  let p = 0, all = 0;
  for (const { n, w } of biomeWeights(x, z)) { all += w; if (n.biome === 'prism') p += w; }
  return all ? p / all : 0;
}

/** Nearby nodes weighted for biome blending. */
function biomeWeights(x: number, z: number) {
  const w: { n: MapNode; w: number }[] = [];
  for (const n of MAP_NODES) {
    const d = Math.hypot(x - n.x, z - n.z);
    if (d < 16) w.push({ n, w: 1 / Math.pow(d + 1.5, 3) });
  }
  if (!w.length) {
    let best = MAP_NODES[0], bd = 1e9;
    for (const n of MAP_NODES) { const d = Math.hypot(x - n.x, z - n.z); if (d < bd) { bd = d; best = n; } }
    w.push({ n: best, w: 1 });
  }
  const tot = w.reduce((s, i) => s + i.w, 0);
  for (const i of w) i.w /= tot;
  return w;
}

function nearestNode(x: number, z: number) {
  let best = MAP_NODES[0], bd = 1e9;
  for (const n of MAP_NODES) { const d = Math.hypot(x - n.x, z - n.z); if (d < bd) { bd = d; best = n; } }
  return { n: best, d: bd };
}

function rawHeight(x: number, z: number) {
  const land = landField(x, z);
  let elev = 0;
  for (const { n, w } of biomeWeights(x, z)) elev += ELEV[n.biome] * w;
  const detail = fbm(x * 0.18 + 10, z * 0.18) * (0.4 + elev * 0.55);
  return { h: land * (0.6 + elev + detail) - (1 - land) * 2.2, land, elev };
}

const nodeBase = new Map<string, number>();
function nodeHeight(n: MapNode) {
  let v = nodeBase.get(n.id);
  if (v === undefined) { v = Math.max(0.5, rawHeight(n.x, n.z).h); nodeBase.set(n.id, v); }
  return v;
}

export function heightAt(x: number, z: number) {
  const r = rawHeight(x, z);
  let h = r.h;
  // flatten pads under nodes and along paths
  const { n, d } = nearestNode(x, z);
  const pad = n.kind === 'city' ? 4.2 : n.kind === 'wild' ? 2 : 3.2;
  if (d < pad + 2) h = THREE.MathUtils.lerp(nodeHeight(n), h, smooth(pad, pad + 2, d));
  return h;
}

// ── Sprites ─────────────────────────────────────────────────────
function labelSprite(text: string, opts: { bg?: string; fg?: string; size?: number; sub?: string; accent?: string } = {}) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d')!;
  const fs = 44;
  ctx.font = `700 ${fs}px Fredoka, Nunito, system-ui, sans-serif`;
  const w = Math.ceil(ctx.measureText(text).width) + 56;
  const h = opts.sub ? 104 : 72;
  c.width = w; c.height = h;
  ctx.font = `700 ${fs}px Fredoka, Nunito, system-ui, sans-serif`;
  const r = 30;
  ctx.fillStyle = opts.bg ?? 'rgba(255,250,238,0.95)';
  ctx.beginPath(); ctx.roundRect(2, 2, w - 4, 68, r); ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = opts.accent ?? '#2b2a33'; ctx.stroke();
  ctx.fillStyle = opts.fg ?? '#2b2a33';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, 38);
  if (opts.sub) {
    ctx.font = `600 26px Nunito, system-ui, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 6;
    ctx.strokeText(opts.sub, w / 2, 88); ctx.fillText(opts.sub, w / 2, 88);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }));
  const scale = opts.size ?? 0.032;
  s.scale.set(w * scale, h * scale, 1);
  s.center.set(0.5, 0);
  s.renderOrder = 10;
  return s;
}

function emojiSprite(emoji: string, ring: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 96;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fffaf0';
  ctx.beginPath(); ctx.arc(48, 48, 42, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 6; ctx.strokeStyle = ring; ctx.stroke();
  ctx.font = '50px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 48, 52);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }));
  s.scale.set(1.3, 1.3, 1);
  s.center.set(0.5, 0);
  return s;
}

// ── World view ──────────────────────────────────────────────────
export type Reach = Record<string, 'ok' | 'locked'>;

/** Map pan keys (lower-cased KeyboardEvent.key) → [x, z] direction on the ground. */
const PAN_KEYS: Record<string, [number, number]> = {
  w: [0, -1], arrowup: [0, -1], s: [0, 1], arrowdown: [0, 1],
  a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0],
};
/** Map zoom keys → +1 zooms out (pulls the camera back), -1 zooms in. */
const ZOOM_KEYS: Record<string, number> = { q: 1, e: -1 };

export class WorldView implements SceneView {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.5, 600);
  onNodeTap: (id: string) => void = () => {};
  /** Fired on the second of two quick taps/clicks on the same node (after `onNodeTap` for each). */
  onNodeDoubleTap: (id: string) => void = () => {};
  private lastTap = { id: '', t: 0 };
  interactive = true;
  title = false;

  private target = new THREE.Vector3(0, 0, 0);
  private goal = new THREE.Vector3(0, 0, 0);
  private dist = 48;
  private goalDist = 48;
  private yaw = 0.0;
  private pitch = 0.98;
  private hemi!: THREE.HemisphereLight;
  private sun!: THREE.DirectionalLight;
  private sky!: THREE.Mesh;
  private terrain!: THREE.Mesh;
  private baseColors!: Float32Array;
  /** Per vertex: how strongly the Rainbow Plains' color of the day shows (0 = not at all). */
  private prismW!: Float32Array;
  private prismColor: string | null = null;
  private prismTiles: THREE.MeshStandardMaterial[] = [];
  private wispMark: THREE.Group | null = null;
  private waypointMark: THREE.Group | null = null;
  private waypointKey = '';
  private water!: THREE.Mesh;
  private waterMat!: THREE.ShaderMaterial;
  private trees: { mesh: THREE.InstancedMesh; base: THREE.Color[] }[] = [];
  private nodeGroups = new Map<string, THREE.Group>();
  private rings = new Map<string, THREE.Mesh>();
  private hitMeshes: THREE.Mesh[] = [];
  private pawn!: THREE.Group;
  private pawnRig: TrainerRig | null = null;
  private rivalRigs: TrainerRig[] = [];
  /** Who each rival mini belongs to (same order as rivalRigs), for spotlighting a trainer. */
  private rivalIds: (string | undefined)[] = [];
  private spot: { group: THREE.Group; ring: THREE.Mesh; beam: THREE.Mesh; age: number; life: number } | null = null;
  private follower: CreatureRig | null = null;
  private followerSpecies = '';
  private particles!: THREE.Points;
  private particleVel = new Float32Array(0);
  private fx: string = 'none';
  private aurora!: THREE.Mesh;
  private auroraMat!: THREE.ShaderMaterial;
  private clouds: THREE.Group[] = [];
  private lightning = 0;
  private hopping: { from: THREE.Vector3; to: THREE.Vector3; t: number; res: () => void } | null = null;
  private legendGlows: THREE.Mesh[] = [];
  private season: Season = 'spring';

  constructor(canvas: HTMLCanvasElement) {
    this.buildLights();
    this.buildSky();
    this.buildTerrain();
    this.buildWater();
    this.buildDecor();
    this.buildPaths();
    this.buildNodes();
    this.buildPawn();
    this.buildParticles();
    this.buildAurora();
    this.buildClouds();
    this.bindInput(canvas);
    this.scene.fog = new THREE.Fog('#bfe3f0', 90, 230);
  }

  // ── Build ──────────────────────────────────────────────────────
  private buildLights() {
    this.hemi = new THREE.HemisphereLight('#dff4ff', '#5a6b3a', 1.25);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff1d6', 2.6);
    this.sun.position.set(45, 70, 35);
    this.sun.castShadow = true;
    const sz = isMobile ? 1024 : 2048;
    this.sun.shadow.mapSize.set(sz, sz);
    const sc = this.sun.shadow.camera;
    sc.left = -95 * S; sc.right = 95 * S; sc.top = 95 * S; sc.bottom = -95 * S; sc.near = 1; sc.far = 220 * S;
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.normalBias = 0.4;
    this.scene.add(this.sun, this.sun.target);
  }

  private buildSky() {
    const geo = new THREE.SphereGeometry(400, 24, 16);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color('#5fb4e8') }, bottom: { value: new THREE.Color('#d8f1f7') } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(normalize(vP).y*1.6+0.25,0.0,1.0); gl_FragColor = vec4(mix(bottom, top, h),1.0); }',
    });
    this.sky = new THREE.Mesh(geo, mat);
    this.scene.add(this.sky);
  }

  private buildTerrain() {
    // the terrain covers the whole (scaled) map; detail grows a little less than the map so it stays fast
    // covers x −90…90 and z −76…100 (× S): the south reaches past Kilauea island's Caldera Heart
    const W = 180 * S, D = 176 * S, segX = Math.round((isMobile ? 110 : 150) * S * 0.85), segZ = Math.round((isMobile ? 98 : 134) * S * 0.85);
    let geo: THREE.BufferGeometry = new THREE.PlaneGeometry(W, D, segX, segZ);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, 12 * S);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
    geo = geo.toNonIndexed();
    const p2 = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(p2.count * 3);
    const col = new THREE.Color();
    const tmp = new THREE.Color();
    const sand = new THREE.Color('#e6d6a2');
    const seabed = new THREE.Color('#5fb7b0');
    const rock = new THREE.Color('#8b8378');
    const snow = new THREE.Color('#f4f7fb');
    // Cloud Island: cotton candy (pink, lilac, blush) veined with a sinister dark purple
    const candy = [new THREE.Color('#f7a8d8'), new THREE.Color('#d6aef5'), new THREE.Color('#ffd0ea'), new THREE.Color('#b98cf0')];
    const gloom = new THREE.Color('#3a1550'), gloomEdge = new THREE.Color('#24102f');
    // color per face (flat low-poly look): use face centroid
    for (let f = 0; f < p2.count; f += 3) {
      const cx = (p2.getX(f) + p2.getX(f + 1) + p2.getX(f + 2)) / 3;
      const cy = (p2.getY(f) + p2.getY(f + 1) + p2.getY(f + 2)) / 3;
      const cz = (p2.getZ(f) + p2.getZ(f + 1) + p2.getZ(f + 2)) / 3;
      col.setRGB(0, 0, 0);
      for (const { n, w } of biomeWeights(cx, cz)) { tmp.set(BIOME_INFO[n.biome].color); col.r += tmp.r * w; col.g += tmp.g * w; col.b += tmp.b * w; }
      const jitter = (hash(cx * 3.1, cz * 1.7) - 0.5) * 0.06;
      col.offsetHSL(0, 0, jitter);
      const cloudW = cloudWeight(cx, cz);
      if (cloudW > 0.5 && cy > -0.1) {
        // patches of candy colours, dark purple veins, and dark cliffs dropping to the sea
        const n = fbm(cx * 0.18, cz * 0.18);
        col.copy(candy[Math.floor(n * candy.length * 1.6) % candy.length]).lerp(candy[(Math.floor(n * 7) + 1) % candy.length], hash(cx, cz) * 0.5);
        const vein = Math.abs(fbm(cx * 0.35 + 9, cz * 0.35 - 4) - 0.5);
        if (vein < 0.045) col.lerp(gloom, 0.75);
        if (cy < 2.4) col.lerp(gloomEdge, smooth(2.4, 0.4, cy));
        for (let k = 0; k < 3; k++) { colors[(f + k) * 3] = col.r; colors[(f + k) * 3 + 1] = col.g; colors[(f + k) * 3 + 2] = col.b; }
        continue;
      }
      if (cy < 0.35) col.lerp(sand, smooth(0.35, 0.05, cy));
      if (cy < -0.1) col.copy(seabed).lerp(new THREE.Color('#2f7f9a'), smooth(-0.1, -2, cy));
      if (cy > 3.0) col.lerp(rock, smooth(3.0, 3.8, cy));
      if (cy > 4.1) col.lerp(snow, smooth(4.1, 4.6, cy));
      for (let k = 0; k < 3; k++) { colors[(f + k) * 3] = col.r; colors[(f + k) * 3 + 1] = col.g; colors[(f + k) * 3 + 2] = col.b; }
    }
    this.baseColors = colors.slice();
    this.prismW = new Float32Array(p2.count);
    for (let f = 0; f < p2.count; f += 3) {
      const cx = (p2.getX(f) + p2.getX(f + 1) + p2.getX(f + 2)) / 3, cz = (p2.getZ(f) + p2.getZ(f + 1) + p2.getZ(f + 2)) / 3;
      const cy = (p2.getY(f) + p2.getY(f + 1) + p2.getY(f + 2)) / 3;
      const w = cy > 0 ? smooth(0.3, 0.7, prismWeight(cx, cz)) * 0.92 : 0;
      this.prismW[f] = this.prismW[f + 1] = this.prismW[f + 2] = w;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    this.terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.92 }));
    this.terrain.receiveShadow = true;
    this.scene.add(this.terrain);
  }

  private buildWater() {
    const geo = new THREE.PlaneGeometry(700, 700, 90, 90);
    geo.rotateX(-Math.PI / 2);
    this.waterMat = new THREE.ShaderMaterial({
      transparent: true, fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        uTime: { value: 0 }, uDeep: { value: new THREE.Color('#1f6f9e') }, uShallow: { value: new THREE.Color('#4fd1c5') },
      }]),
      vertexShader: `
        uniform float uTime; varying vec3 vW; varying float vWave;
        #include <fog_pars_vertex>
        void main(){
          vec3 p = position;
          float w = sin(p.x*0.35+uTime*1.2)*0.08 + cos(p.z*0.42+uTime*0.9)*0.08;
          p.y += w; vWave = w;
          vec4 wp = modelMatrix * vec4(p,1.0); vW = wp.xyz;
          vec4 mvPosition = viewMatrix * wp;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `
        uniform float uTime; uniform vec3 uDeep; uniform vec3 uShallow; varying vec3 vW; varying float vWave;
        #include <fog_pars_fragment>
        void main(){
          float r = length(vW.xz - vec2(0.0, 5.0 * ${S.toFixed(3)}));
          float k = smoothstep(40.0 * ${S.toFixed(3)}, 110.0 * ${S.toFixed(3)}, r);
          vec3 c = mix(uShallow, uDeep, 0.55 + k*0.45);
          float n1 = sin(vW.x*0.9+uTime*1.1+sin(vW.z*0.7)*2.0)*sin(vW.z*1.1-uTime*0.8+sin(vW.x*0.5)*2.0);
          float sparkle = smoothstep(0.82, 1.0, n1) * 0.22;
          c += vec3(sparkle) + vWave*0.5;
          gl_FragColor = vec4(c, 0.82);
          #include <fog_fragment>
        }`,
    });
    this.water = new THREE.Mesh(geo, this.waterMat);
    this.water.position.y = 0.0;
    this.water.renderOrder = 1;
    this.scene.add(this.water);
  }

  private buildDecor() {
    const pineGeo = new THREE.ConeGeometry(0.55, 1.6, 6); pineGeo.translate(0, 1.1, 0);
    const roundGeo = new THREE.IcosahedronGeometry(0.7, 0); roundGeo.translate(0, 1.15, 0);
    const trunkGeo = new THREE.CylinderGeometry(0.1, 0.14, 0.6, 5); trunkGeo.translate(0, 0.3, 0);
    const rockGeo = new THREE.DodecahedronGeometry(0.5, 0); rockGeo.translate(0, 0.2, 0);
    const cactusGeo = new THREE.CylinderGeometry(0.14, 0.16, 1.1, 6); cactusGeo.translate(0, 0.55, 0);
    type Spot = { x: number; z: number; y: number; s: number; r: number; c: THREE.Color };
    const pines: Spot[] = [], rounds: Spot[] = [], rocks: Spot[] = [], cacti: Spot[] = [], trunks: Spot[] = [], puffs: Spot[] = [], spires: Spot[] = [];
    const density: Partial<Record<Biome, [number, 'pine' | 'round' | 'rock' | 'cactus' | 'puff' | 'spire'][]>> = {
      cloud: [[0.3, 'puff'], [0.07, 'spire']],
      deepwood: [[0.7, 'pine'], [0.15, 'round']],
      forest: [[0.62, 'pine'], [0.15, 'round']], grove: [[0.5, 'round'], [0.12, 'pine']], swamp: [[0.35, 'round']],
      meadow: [[0.1, 'round']], mountain: [[0.18, 'pine'], [0.22, 'rock']], tundra: [[0.12, 'pine'], [0.06, 'rock']],
      desert: [[0.1, 'cactus'], [0.06, 'rock']], badlands: [[0.18, 'rock']], canyon: [[0.25, 'rock']], coast: [[0.06, 'rock']],
      volcanic: [[0.16, 'rock'], [0.05, 'round']], lake: [[0.2, 'round']], river: [[0.25, 'round']], road: [[0.08, 'round']],
    };
    const step = isMobile ? 1.9 : 1.55;
    for (let x = -88 * S; x < 88 * S; x += step) {
      for (let z = -74 * S; z < 98 * S; z += step) {
        const jx = x + (hash(x, z) - 0.5) * step, jz = z + (hash(z, x) - 0.5) * step;
        const { h, land } = rawHeight(jx, jz);
        if (land < 0.85 || h < 0.5) continue;
        const { n, d } = nearestNode(jx, jz);
        if (d < (n.kind === 'city' ? 5 : 2.8)) continue;
        let nearPath = false;
        for (const [a, b] of SEGS) if (segDist(jx, jz, a, b) < 1.3) { nearPath = true; break; }
        if (nearPath) continue;
        const r = hash(jx * 7.7, jz * 3.3);
        let acc = 0;
        for (const [p, kind] of density[n.biome] ?? []) {
          acc += p;
          if (r < acc) {
            const y = heightAt(jx, jz);
            const s = 0.75 + hash(jx, jz * 9) * 0.6;
            const spot: Spot = { x: jx, z: jz, y, s, r: hash(jz, jx) * 6.28, c: new THREE.Color() };
            if (kind === 'pine') { spot.c.set(n.biome === 'tundra' ? '#5c7f6e' : n.biome === 'deepwood' ? '#15291b' : '#2f6b3a').offsetHSL(0, 0, (hash(jx, 1) - 0.5) * 0.08); pines.push(spot); trunks.push({ ...spot, c: new THREE.Color('#6b4a2f') }); }
            if (kind === 'round') { spot.c.set(n.biome === 'grove' ? '#7fb069' : n.biome === 'swamp' ? '#4f7a3a' : '#5d9b3f').offsetHSL((hash(jx, 2) - 0.5) * 0.04, 0, (hash(jx, 3) - 0.5) * 0.1); rounds.push(spot); trunks.push({ ...spot, c: new THREE.Color('#6b4a2f') }); }
            if (kind === 'rock') { spot.c.set(n.biome === 'canyon' || n.biome === 'badlands' ? '#b8693a' : n.biome === 'volcanic' ? '#3a3230' : '#9a958c').offsetHSL(0, 0, (hash(jx, 4) - 0.5) * 0.1); rocks.push(spot); }
            if (kind === 'cactus') { spot.c.set('#4f8a3c'); cacti.push(spot); }
            if (kind === 'puff') { spot.c.set(['#ffc2e6', '#e3b8ff', '#ffa6d6', '#cdb2ff'][Math.floor(hash(jx, 5) * 4)]); spot.s *= 1.25; puffs.push(spot); }
            if (kind === 'spire') { spot.c.set(hash(jx, 6) < 0.5 ? '#3a1550' : '#5a2378'); spot.s *= 1.4; spires.push(spot); }
            break;
          }
        }
      }
    }
    const make = (geo: THREE.BufferGeometry, spots: Spot[], seasonal: boolean) => {
      if (!spots.length) return;
      const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.8 }), spots.length);
      const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      spots.forEach((sp, i) => {
        e.set(0, sp.r, 0); q.setFromEuler(e);
        mtx.compose(new THREE.Vector3(sp.x, sp.y - 0.05, sp.z), q, new THREE.Vector3(sp.s, sp.s, sp.s));
        m.setMatrixAt(i, mtx);
        m.setColorAt(i, sp.c);
      });
      m.castShadow = true; m.receiveShadow = true;
      this.scene.add(m);
      if (seasonal) this.trees.push({ mesh: m, base: spots.map((s) => s.c.clone()) });
    };
    make(pineGeo, pines, true); make(roundGeo, rounds, true); make(trunkGeo, trunks, false); make(rockGeo, rocks, false); make(cactusGeo, cacti, false);
    // Cloud Island: candy-floss puffs (no seasonal tint) and dark purple spires
    const puffGeo = new THREE.IcosahedronGeometry(0.75, 1); puffGeo.translate(0, 0.45, 0);
    const spireGeo = new THREE.ConeGeometry(0.32, 2.2, 5); spireGeo.translate(0, 1.1, 0);
    make(puffGeo, puffs, false); make(spireGeo, spires, false);
  }

  private buildPaths() {
    const stones: THREE.Vector3[] = [];
    const cloudStones: THREE.Vector3[] = [];
    const sea: THREE.Vector3[] = [];
    for (const e of MAP_EDGES) {
      const a = NODE_BY_ID[e.a], b = NODE_BY_ID[e.b];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      const isSea = e.via === 'sea' || e.via === 'portal' || e.b === 'ironwake';
      const step = isSea ? 1.6 : 0.95;
      for (let d = 0; d <= len; d += step) {
        const t = d / len;
        const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
        const da = Math.hypot(x - a.x, z - a.z), db = Math.hypot(x - b.x, z - b.z);
        const clearA = a.kind === 'city' ? 3.6 : 1.6, clearB = b.kind === 'city' ? 3.6 : 1.6;
        if (da < clearA || db < clearB) continue;
        if (isSea) sea.push(new THREE.Vector3(x, 0.12, z));
        else (a.biome === 'cloud' || b.biome === 'cloud' ? cloudStones : stones).push(new THREE.Vector3(x, heightAt(x, z) + 0.06, z));
      }
    }
    const geo = new THREE.CylinderGeometry(0.28, 0.32, 0.12, 7);
    const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: '#f3e7c6', roughness: 0.7, flatShading: true }), stones.length);
    const mtx = new THREE.Matrix4();
    stones.forEach((p, i) => { mtx.makeRotationY(hash(p.x, p.z) * 3); mtx.setPosition(p); m.setMatrixAt(i, mtx); });
    m.receiveShadow = true;
    this.scene.add(m);
    // Cloud Island paths: midnight plum stones, a little larger, so they read against the pastel ground
    const cm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.34, 0.38, 0.14, 7), new THREE.MeshStandardMaterial({ color: CLOUD_PATH, roughness: 0.6, flatShading: true }), cloudStones.length);
    cloudStones.forEach((p, i) => { mtx.makeRotationY(hash(p.x, p.z) * 3); mtx.setPosition(p); cm.setMatrixAt(i, mtx); });
    cm.receiveShadow = true;
    this.scene.add(cm);
    const sm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 10), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85 }), sea.length);
    sea.forEach((p, i) => { mtx.identity(); mtx.setPosition(p); sm.setMatrixAt(i, mtx); });
    this.scene.add(sm);
  }

  private buildNodes() {
    const hex = new THREE.CylinderGeometry(1.25, 1.4, 0.4, 6);
    const ringGeo = new THREE.RingGeometry(1.7, 2.05, 32); ringGeo.rotateX(-Math.PI / 2);
    const hitGeo = new THREE.CylinderGeometry(2.4, 2.4, 3, 8);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const loader = new THREE.TextureLoader();
    for (const n of MAP_NODES) {
      const g = new THREE.Group();
      const y = nodeHeight(n);
      g.position.set(n.x, y, n.z);
      g.userData.nodeId = n.id;
      const biomeCol = BIOME_INFO[n.biome].color;
      let ringR = 1;
      if (n.kind === 'wild') {
        // Cloud Island: midnight-plum tiles with a white rim, so they stand out from the pastel ground
        const cloud = n.biome === 'cloud';
        const tileMat = new THREE.MeshStandardMaterial({ color: cloud ? CLOUD_PATH : biomeCol, flatShading: true, roughness: 0.6 });
        if (n.biome === 'prism') this.prismTiles.push(tileMat);
        const tile = new THREE.Mesh(hex, tileMat);
        tile.position.y = 0.2; tile.castShadow = true; tile.receiveShadow = true;
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(cloud ? 1.55 : 1.42, cloud ? 1.65 : 1.5, 0.18, 6), new THREE.MeshStandardMaterial({ color: cloud ? '#ffffff' : '#fff8e8', flatShading: true }));
        rim.position.y = 0.06; rim.receiveShadow = true;
        g.add(rim, tile);
        const em = emojiSprite(BIOME_INFO[n.biome].icon, '#2b2a33');
        em.position.y = 0.55; em.scale.set(1.1, 1.1, 1);
        g.add(em);
      } else if (n.kind === 'city') {
        const ci = CITIES[n.id];
        const tc = TYPE_COLOR[ci.type];
        const plat = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.7, 0.6, 12), new THREE.MeshStandardMaterial({ color: '#efe6cf', flatShading: true }));
        plat.position.y = 0.3; plat.castShadow = true; plat.receiveShadow = true;
        const band = new THREE.Mesh(new THREE.CylinderGeometry(3.72, 3.72, 0.22, 12), new THREE.MeshStandardMaterial({ color: tc, flatShading: true, emissive: new THREE.Color(tc), emissiveIntensity: 0.15 }));
        band.position.y = 0.35;
        g.add(band, plat);
        this.addHouses(g, n, tc);
        // tower with type emblem
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 3.2, 6), new THREE.MeshStandardMaterial({ color: '#f8f1e0', flatShading: true }));
        tower.position.set(0, 2.2, 0); tower.castShadow = true;
        g.add(tower);
        const tex = loader.load(typeIcon(ci.type)); tex.colorSpace = THREE.SRGBColorSpace;
        const emblem = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
        emblem.position.set(0, 4.5, 0); emblem.scale.set(2, 2, 1);
        g.add(emblem);
        const lab = labelSprite(n.name, { accent: tc, sub: `${ci.arbiter} · Arbiter`, size: 0.026 });
        lab.position.y = 5.7;
        g.add(lab);
        ringR = 2.2;
      } else if (n.kind === 'town' || n.kind === 'stadium') {
        const plat = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.4, 10), new THREE.MeshStandardMaterial({ color: n.kind === 'stadium' ? '#f7d774' : '#e9dcc0', flatShading: true }));
        plat.position.y = 0.2; plat.castShadow = true; plat.receiveShadow = true;
        g.add(plat);
        if (n.kind === 'stadium') {
          const bowl = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.45, 6, 18), new THREE.MeshStandardMaterial({ color: '#d6453d', flatShading: true }));
          bowl.rotation.x = Math.PI / 2; bowl.position.y = 0.7; bowl.castShadow = true;
          const field = new THREE.Mesh(new THREE.CircleGeometry(1.2, 18), new THREE.MeshStandardMaterial({ color: '#6cc04a' }));
          field.rotation.x = -Math.PI / 2; field.position.y = 0.45;
          g.add(bowl, field);
          for (let i = 0; i < 4; i++) {
            const flag = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 4), new THREE.MeshStandardMaterial({ color: Object.values(TYPE_COLOR)[i * 2] }));
            const a = (i / 4) * Math.PI * 2 + 0.4;
            flag.position.set(Math.cos(a) * 1.9, 1.6, Math.sin(a) * 1.9);
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.3), new THREE.MeshStandardMaterial({ color: '#444' }));
            pole.position.set(Math.cos(a) * 1.9, 1.0, Math.sin(a) * 1.9);
            g.add(flag, pole);
          }
          const lab = labelSprite('Circuit Stadium', { bg: '#ffd84a', sub: 'Turn 100 · Grand Tournament', size: 0.026 });
          lab.position.y = 2.8; g.add(lab);
        } else {
          this.addHouses(g, n, '#c75b39', 3);
          const lab = labelSprite(n.name, { size: 0.022 });
          lab.position.y = 2.4; g.add(lab);
        }
        ringR = 1.5;
      } else if (n.kind === 'arena') {
        // a stand-alone Arbiter arena: a type-coloured bowl with the type emblem above it
        const ci = CITIES[n.arenaOf!];
        const tc = TYPE_COLOR[ci.type];
        const plat = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.9, 0.5, 10), new THREE.MeshStandardMaterial({ color: '#3a3230', flatShading: true }));
        plat.position.y = 0.25; plat.castShadow = true; plat.receiveShadow = true;
        const bowl = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.45, 6, 16), new THREE.MeshStandardMaterial({ color: tc, flatShading: true, emissive: new THREE.Color(tc), emissiveIntensity: 0.35 }));
        bowl.rotation.x = Math.PI / 2; bowl.position.y = 0.75; bowl.castShadow = true;
        const pit = new THREE.Mesh(new THREE.CircleGeometry(1.4, 16), new THREE.MeshStandardMaterial({ color: tc, emissive: new THREE.Color(tc), emissiveIntensity: 0.8 }));
        pit.rotation.x = -Math.PI / 2; pit.position.y = 0.52;
        g.add(plat, bowl, pit);
        const tex = loader.load(typeIcon(ci.type)); tex.colorSpace = THREE.SRGBColorSpace;
        const emblem = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
        emblem.position.set(0, 2.6, 0); emblem.scale.set(1.6, 1.6, 1);
        g.add(emblem);
        const lab = labelSprite(n.name, { accent: tc, sub: `${ci.arbiter} · Arbiter arena`, size: 0.024 });
        lab.position.y = 3.8;
        g.add(lab);
        ringR = 1.8;
      } else if (n.kind === 'legendary') {
        const sp = SPECIES_BY_ID[n.legendary!];
        const col = TYPE_COLOR[sp.types[0]];
        const base = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2, 0.6, 5), new THREE.MeshStandardMaterial({ color: '#3a3550', flatShading: true }));
        base.position.y = 0.3; base.castShadow = true;
        const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.9, 0), new THREE.MeshStandardMaterial({ color: col, emissive: new THREE.Color(col), emissiveIntensity: 0.9, flatShading: true, roughness: 0.2 }));
        crystal.position.y = 2.1; crystal.castShadow = true;
        this.legendGlows.push(crystal);
        g.add(base, crystal);
        const lab = labelSprite(n.name, { bg: '#2b2a33', fg: '#ffe9a8', accent: col, size: 0.026, sub: 'Legendary' });
        lab.position.y = 3.4; g.add(lab);
        ringR = 1.3;
      }
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: '#59f08a', transparent: true, opacity: 0.9, depthWrite: false }));
      ring.scale.setScalar(ringR);
      ring.position.y = 0.45;
      ring.visible = false;
      ring.renderOrder = 5;
      g.add(ring);
      this.rings.set(n.id, ring);
      const hit = new THREE.Mesh(hitGeo, hitMat);
      hit.scale.setScalar(n.kind === 'city' ? 1.6 : 1);
      hit.position.y = 1;
      hit.userData.nodeId = n.id;
      g.add(hit);
      this.hitMeshes.push(hit);
      this.scene.add(g);
      this.nodeGroups.set(n.id, g);
    }
  }

  private addHouses(g: THREE.Group, n: MapNode, roof: string, count = 6) {
    const wallCols = n.id === 'iron' ? ['#e85d5d', '#f2c14e', '#5da9e9', '#7bc47f'] : ['#f6ecd6', '#efe1c0', '#e8d8b8'];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + 0.3;
      const r = count > 3 ? 2.3 : 1.2;
      const h = 0.7 + hash(i, n.x) * 0.5;
      const house = new THREE.Group();
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.9, h, 0.8), new THREE.MeshStandardMaterial({ color: wallCols[i % wallCols.length], flatShading: true }));
      wall.position.y = h / 2; wall.castShadow = true; wall.receiveShadow = true;
      const rf = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.6, 4), new THREE.MeshStandardMaterial({ color: roof, flatShading: true }));
      rf.position.y = h + 0.3; rf.rotation.y = Math.PI / 4; rf.castShadow = true;
      house.add(wall, rf);
      house.position.set(Math.cos(a) * r, count > 3 ? 0.6 : 0.4, Math.sin(a) * r);
      house.rotation.y = -a;
      g.add(house);
    }
  }

  /** The map token: the player's own trainer mini (same model as in battle), on a glowing ring. */
  private buildPawn() {
    this.pawn = new THREE.Group();
    const glow = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.95, 32), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = 0.05;
    this.pawn.add(glow);
    this.pawn.scale.setScalar(1.15);
    this.scene.add(this.pawn);
    this.setTrainerLook(playerLook('Rowan', '#ff6b3d'));
  }

  /** Swap the token's mini for a new look (new game, or the player changed their appearance). */
  setTrainerLook(look: TrainerLook) {
    if (this.pawnRig) this.pawn.remove(this.pawnRig.root);
    this.pawnRig = buildTrainer(look);
    this.pawnRig.root.scale.setScalar(1.35);
    this.pawn.add(this.pawnRig.root);
  }

  private buildParticles() {
    const N = isMobile ? 900 : 1800;
    const geo = new THREE.BufferGeometry();
    const p = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { p[i * 3] = (Math.random() - 0.5) * 70; p[i * 3 + 1] = Math.random() * 30; p[i * 3 + 2] = (Math.random() - 0.5) * 70; }
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.particleVel = new Float32Array(N);
    for (let i = 0; i < N; i++) this.particleVel[i] = 0.6 + Math.random() * 0.8;
    this.particles = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffffff', size: 0.25, transparent: true, opacity: 0.8, depthWrite: false }));
    this.particles.visible = false;
    this.particles.frustumCulled = false;
    this.scene.add(this.particles);
  }

  private buildAurora() {
    const geo = new THREE.PlaneGeometry(160 * S, 40, 80, 1);
    this.auroraMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false,
      uniforms: { uTime: { value: 0 }, uStrength: { value: 0.25 } },
      vertexShader: 'uniform float uTime; varying vec2 vUv; void main(){ vUv = uv; vec3 p = position; p.z += sin(p.x*0.06+uTime*0.4)*8.0; p.x += sin(p.y*0.1+uTime*0.3)*2.0; gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0);}',
      fragmentShader: 'uniform float uTime; uniform float uStrength; varying vec2 vUv; void main(){ float band = sin(vUv.x*24.0+uTime*0.8)*0.5+0.5; float a = smoothstep(0.0,0.5,vUv.y)*smoothstep(1.0,0.4,vUv.y); vec3 c = mix(vec3(0.15,1.0,0.55), vec3(0.6,0.25,1.0), vUv.y); gl_FragColor = vec4(c, a*(0.4+band*0.6)*uStrength); }',
    });
    this.aurora = new THREE.Mesh(geo, this.auroraMat);
    this.aurora.position.set(-10 * S, 32, -95 * S);
    this.scene.add(this.aurora);
  }

  private buildClouds() {
    const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 1, transparent: true, opacity: 0.92 });
    const geo = new THREE.IcosahedronGeometry(1, 0);
    for (let i = 0; i < 9; i++) {
      const c = new THREE.Group();
      const n = 4 + Math.floor(hash(i, 3) * 3);
      for (let k = 0; k < n; k++) {
        const m = new THREE.Mesh(geo, mat);
        m.position.set((k - n / 2) * 1.6, hash(i, k) * 0.8, (hash(k, i) - 0.5) * 1.8);
        m.scale.set(1.6 + hash(i * k, 1), 1 + hash(k, 2) * 0.5, 1.4);
        m.castShadow = true;
        c.add(m);
      }
      c.position.set((-90 + i * 22) * S, 20 + hash(i, 9) * 6, (-60 + hash(i, 5) * 120) * S);
      this.clouds.push(c);
      this.scene.add(c);
    }
  }

  // ── State sync ─────────────────────────────────────────────────
  setPawnAt(id: string) {
    const n = NODE_BY_ID[id];
    const off = n.kind === 'city' ? 1.6 : 0;
    this.pawn.position.set(n.x + off, nodeHeight(n) + (n.kind === 'city' ? 0.6 : 0.42), n.z + off);
    // the follower jumps along too (e.g. when the hotseat switches trainers), instead of gliding across the map
    this.follower?.root.position.copy(this.pawn.position).add(new THREE.Vector3(-1.3, -0.4, 0.6));
  }

  /**
   * Other hotseat trainers' minis, standing at their nodes (a little smaller, spread around the node so
   * several trainers on one spot stay visible). Pass [] to clear.
   */
  setRivals(rivals: { look: TrainerLook; nodeId: string; id?: string }[]) {
    for (const r of this.rivalRigs) this.scene.remove(r.root);
    this.rivalRigs = [];
    this.rivalIds = rivals.map((r) => r.id);
    const perNode = new Map<string, number>();
    for (const r of rivals) {
      const k = perNode.get(r.nodeId) ?? 0;
      perNode.set(r.nodeId, k + 1);
      const rig = buildTrainer(r.look);
      rig.root.scale.setScalar(1.05);
      const a = -0.6 - k * 1.1;
      rig.root.position.copy(this.pawnPos(r.nodeId)).add(new THREE.Vector3(Math.cos(a) * 1.5, 0, Math.sin(a) * 1.5));
      this.scene.add(rig.root);
      this.rivalRigs.push(rig);
    }
  }

  pawnPos(id: string) {
    const n = NODE_BY_ID[id];
    const off = n.kind === 'city' ? 1.6 : 0;
    return new THREE.Vector3(n.x + off, nodeHeight(n) + (n.kind === 'city' ? 0.6 : 0.42), n.z + off);
  }

  hop(fromId: string, toId: string): Promise<void> {
    return new Promise((res) => { this.hopping = { from: this.pawnPos(fromId), to: this.pawnPos(toId), t: 0, res }; this.focus(toId); });
  }

  setFollower(speciesId: string | null) {
    if (speciesId === this.followerSpecies) return;
    if (this.follower) this.scene.remove(this.follower.root);
    this.follower = null;
    this.followerSpecies = speciesId ?? '';
    if (!speciesId) return;
    this.follower = buildCreature(SPECIES_BY_ID[speciesId]);
    this.follower.root.scale.multiplyScalar(1.05);
    this.follower.root.position.copy(this.pawn.position).add(new THREE.Vector3(-1.3, -0.4, 0.6)); // appear beside the trainer
    this.scene.add(this.follower.root);
  }

  setReach(reach: Reach) {
    for (const [id, ring] of this.rings) {
      const r = reach[id];
      ring.visible = !!r;
      (ring.material as THREE.MeshBasicMaterial).color.set(r === 'ok' ? '#59f08a' : '#ff7a6b');
    }
  }

  setVisited(visited: string[], beaten: string[]) {
    for (const g of this.legendGlows) g.visible = true;
    for (const id of beaten) { const g = this.nodeGroups.get(id); if (g) g.children.forEach((c) => { if (this.legendGlows.includes(c as THREE.Mesh)) c.visible = false; }); }
    void visited;
  }

  /** The Rainbow Plains take on the color of the day's type. */
  setPrism(color: string) {
    if (color === this.prismColor) return;
    this.prismColor = color;
    for (const m of this.prismTiles) m.color.set(color);
    if (this.terrain.userData.init) this.recolor();
  }

  /**
   * Where the trainer's next wisp waits (once they've checked their Fog Lantern), or null: a little
   * bobbing light over that node.
   */
  setWisp(id: string | null) {
    if (this.wispMark) { this.scene.remove(this.wispMark); this.wispMark = null; }
    const n = id ? NODE_BY_ID[id] : null;
    if (!n) return;
    const g = new THREE.Group();
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.7, 14, 12), new THREE.MeshStandardMaterial({ color: '#e6fdff', emissive: new THREE.Color('#5fe9ff'), emissiveIntensity: 1.8 }));
    const halo = new THREE.Mesh(new THREE.SphereGeometry(1.5, 14, 12), new THREE.MeshBasicMaterial({ color: '#7ff3ff', transparent: true, opacity: 0.3, depthWrite: false }));
    // a faint column of light down to the node, so the wisp is easy to spot from afar
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.9, 4, 10, 1, true), new THREE.MeshBasicMaterial({ color: '#9ff6ff', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.y = -2.2;
    g.add(orb, halo, beam);
    g.position.set(n.x, nodeHeight(n) + 4, n.z);
    g.userData.baseY = g.position.y;
    this.scene.add(g);
    this.wispMark = g;
  }

  /**
   * The trainer's marked next stop, or null: a little flag in their colour planted beside that node, with a
   * pulsing ring on the ground. The app only passes the marker of the trainer whose screen this is.
   */
  setWaypoint(id: string | null, color = '#ff5a5a') {
    const key = id ? `${id}|${color}` : '';
    if (key === this.waypointKey) return;
    this.waypointKey = key;
    if (this.waypointMark) { this.scene.remove(this.waypointMark); this.waypointMark = null; }
    const n = id ? NODE_BY_ID[id] : null;
    if (!n) return;
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 3.4, 8), new THREE.MeshStandardMaterial({ color: '#f4efe4', roughness: 0.6 }));
    pole.position.y = 1.7;
    pole.castShadow = true;
    const cloth = new THREE.Shape();
    cloth.moveTo(0, 0); cloth.lineTo(1.5, -0.45); cloth.lineTo(0, -0.9); cloth.closePath();
    const flag = new THREE.Mesh(new THREE.ShapeGeometry(cloth), new THREE.MeshStandardMaterial({ color, emissive: new THREE.Color(color), emissiveIntensity: 0.45, side: THREE.DoubleSide }));
    flag.position.set(0.08, 3.35, 0);
    flag.castShadow = true;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), new THREE.MeshStandardMaterial({ color: '#ffd84a', emissive: new THREE.Color('#ffb000'), emissiveIntensity: 0.4 }));
    knob.position.y = 3.45;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.75, 24), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    g.add(pole, flag, knob, ring);
    // planted near the edge of the node's tile or platform, so it doesn't hide the node or a trainer standing there
    const edge = n.kind === 'city' ? 2.8 : n.kind === 'arena' ? 2.2 : n.kind === 'town' || n.kind === 'stadium' ? 1.8 : 0.95;
    const top = n.kind === 'city' ? 0.6 : n.kind === 'arena' ? 0.5 : 0.4;
    g.position.set(n.x + edge * 0.82, nodeHeight(n) + top, n.z - edge * 0.57);
    g.userData = { flag, ring };
    this.scene.add(g);
    this.waypointMark = g;
  }

  setSeason(season: Season) {
    if (season === this.season && this.terrain.userData.init) return;
    this.season = season;
    this.terrain.userData.init = true;
    this.recolor();
  }

  /** Repaint the ground: the season's tint, then the Rainbow Plains' color of the day on top. */
  private recolor() {
    const season = this.season;
    const tint = (c: THREE.Color, y: number) => {
      const hsl = { h: 0, s: 0, l: 0 };
      c.getHSL(hsl);
      const green = hsl.h > 0.18 && hsl.h < 0.45 && hsl.s > 0.2;
      if (season === 'summer' && green) c.offsetHSL(-0.02, 0.05, 0.02);
      if (season === 'autumn' && green) c.setHSL(0.07 + (hash(c.r * 9, c.g * 7) * 0.06), Math.min(0.75, hsl.s + 0.2), hsl.l + 0.02);
      if (season === 'winter' && y > 0.1) c.lerp(new THREE.Color('#f2f5f8'), green ? 0.72 : 0.5);
      return c;
    };
    const pos = this.terrain.geometry.attributes.position as THREE.BufferAttribute;
    const col = this.terrain.geometry.attributes.color as THREE.BufferAttribute;
    const c = new THREE.Color(), prism = new THREE.Color();
    for (let i = 0; i < col.count; i++) {
      c.setRGB(this.baseColors[i * 3], this.baseColors[i * 3 + 1], this.baseColors[i * 3 + 2]);
      tint(c, pos.getY(i));
      const pw = this.prismW[i];
      if (pw > 0 && this.prismColor) {
        // patchy bands of the day's color, lighter and darker, so the plains shimmer
        const f = Math.floor(i / 3);
        prism.set(this.prismColor).offsetHSL(0, 0, (hash(f * 0.37, f * 0.11) - 0.5) * 0.14);
        c.lerp(prism, pw);
      }
      col.setXYZ(i, c.r, c.g, c.b);
    }
    col.needsUpdate = true;
    for (const t of this.trees) {
      t.base.forEach((b, i) => { c.copy(b); tint(c, 1); t.mesh.setColorAt(i, c); });
      t.mesh.instanceColor!.needsUpdate = true;
    }
  }

  /** Sky, light and particles for the weather and season; `night` dims everything to moonlight. */
  setWeather(id: string, season: Season, night = false, cloud = false) {
    const w = WEATHER[id];
    this.fx = w?.fx ?? 'none';
    const skyMat = this.sky.material as THREE.ShaderMaterial;
    const fog = this.scene.fog as THREE.Fog;
    let top = '#5fb4e8', bottom = '#d8f1f7', sunI = 2.6, hemiI = 1.25, fogFar = 230, fogNear = 90;
    if (season === 'autumn') { top = '#6aa6d6'; bottom = '#f1e0c4'; }
    if (season === 'winter') { top = '#8bb6d8'; bottom = '#e9f0f6'; }
    if (this.fx === 'rain' || this.fx === 'storm') { top = '#5d6e80'; bottom = '#aab7c2'; sunI = 1.2; hemiI = 1.0; fogFar = 150; }
    if (this.fx === 'snow') { top = '#a3b3c4'; bottom = '#e8edf2'; sunI = 1.5; fogFar = 160; }
    if (this.fx === 'fog') { top = '#c6d0d6'; bottom = '#dfe5e8'; sunI = 1.3; fogNear = 25; fogFar = 95; }
    if (this.fx === 'heat') { top = '#5aa6e0'; bottom = '#ffe2b0'; sunI = 3.2; }
    if (this.fx === 'aurora') { top = '#0e1838'; bottom = '#2c3a66'; sunI = 0.7; hemiI = 0.55; }
    else if (night) {
      // moonlight: a deep blue sky (cloudier weather stays a little greyer), dimmer light, a shorter view
      const grey = this.fx === 'rain' || this.fx === 'storm' || this.fx === 'fog' || this.fx === 'snow';
      top = grey ? '#1e2638' : '#101c3d'; bottom = grey ? '#3a4458' : '#2e3d68';
      sunI = Math.max(0.55, sunI * 0.35); hemiI = Math.max(0.5, hemiI * 0.55); fogFar = Math.min(fogFar, 170);
    }
    if (cloud) {
      // Cloud Island: a dusky violet sky over cotton candy, deep purple at night
      top = night ? '#1a0b2e' : '#6a3d9a'; bottom = night ? '#5b2a7a' : '#f6c3e4';
      sunI = night ? Math.max(0.6, sunI * 0.4) : Math.min(sunI, 2.2); hemiI = night ? Math.max(0.55, hemiI * 0.6) : hemiI;
    }
    skyMat.uniforms.top.value.set(top);
    skyMat.uniforms.bottom.value.set(bottom);
    fog.color.set(bottom); fog.near = fogNear; fog.far = fogFar;
    this.sun.intensity = sunI; this.hemi.intensity = hemiI;
    this.sun.color.set(cloud ? (night ? '#c9a6ff' : '#ffd6f0') : this.fx === 'aurora' || night ? '#b9c8ff' : this.fx === 'heat' ? '#ffd9a0' : '#fff1d6');
    this.auroraMat.uniforms.uStrength.value = this.fx === 'aurora' ? 1.1 : (season === 'winter' ? 0.35 : 0.12) + (night ? 0.15 : 0);
    const pm = this.particles.material as THREE.PointsMaterial;
    this.particles.visible = ['rain', 'storm', 'snow', 'petals', 'wind'].includes(this.fx);
    if (this.fx === 'rain' || this.fx === 'storm') { pm.color.set('#cfe6ff'); pm.size = 0.14; pm.opacity = 0.75; }
    if (this.fx === 'snow') { pm.color.set('#ffffff'); pm.size = 0.3; pm.opacity = 0.9; }
    if (this.fx === 'petals') { pm.color.set('#ffb3d9'); pm.size = 0.3; pm.opacity = 0.9; }
    if (this.fx === 'wind') { pm.color.set('#e9f5e0'); pm.size = 0.12; pm.opacity = 0.5; }
  }

  /** Where a trainer's mini stands: the player's pawn (no id) or a rival's mini; null if that rival has none. */
  trainerPos(id?: string): THREE.Vector3 | null {
    if (id === undefined) return this.pawn.position.clone();
    const i = this.rivalIds.indexOf(id);
    return i >= 0 ? this.rivalRigs[i].root.position.clone() : null;
  }

  /** Where the next-stop flag stands, or null if none is planted. */
  waypointPos(): THREE.Vector3 | null { return this.waypointMark ? this.waypointMark.position.clone() : null; }

  /** Glide the camera to a spot (keeping the usual framing). */
  focusPos(p: THREE.Vector3) { this.goal.set(p.x, p.y - 0.4, p.z + 3); }

  /** A pulsing ring and a beam of light in a trainer's colour, fading out after a few seconds. */
  spotlight(p: THREE.Vector3, color: string, life = 3.5) {
    if (this.spot) this.scene.remove(this.spot.group);
    const group = new THREE.Group();
    const mat = (o: number) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: o, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.35, 48), mat(0.9));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.08;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.95, 9, 32, 1, true), mat(0.28));
    beam.position.y = 4.5;
    group.add(ring, beam);
    group.position.copy(p).add(new THREE.Vector3(0, -0.35, 0));
    this.scene.add(group);
    this.spot = { group, ring, beam, age: 0, life };
  }

  focus(id: string, instant = false) {
    const n = NODE_BY_ID[id];
    this.goal.set(n.x, nodeHeight(n), n.z + 3);
    if (instant) this.target.copy(this.goal);
  }

  setTitleMode(on: boolean) {
    this.title = on;
    if (on) { this.goal.set(-4 * S, 0, 6 * S); this.goalDist = 92 * 1.4; }
    else this.goalDist = this.defaultDist();
  }

  private defaultDist() {
    const aspect = innerWidth / innerHeight;
    return aspect < 0.8 ? 62 : aspect < 1.2 ? 54 : 46;
  }

  // ── Input ──────────────────────────────────────────────────────
  private bindInput(canvas: HTMLCanvasElement) {
    const pointers = new Map<number, { x: number; y: number }>();
    let downAt = { x: 0, y: 0, t: 0 };
    let moved = false;
    let pinchStart = 0, distStart = 0;
    const ray = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1);
    const ndc = (x: number, y: number) => new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
    const ground = (x: number, y: number) => { ray.setFromCamera(ndc(x, y), this.camera); const v = new THREE.Vector3(); return ray.ray.intersectPlane(plane, v) ? v : null; };

    canvas.addEventListener('pointerdown', (e) => {
      if (!this.interactive || this.title) return;
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) { downAt = { x: e.clientX, y: e.clientY, t: performance.now() }; moved = false; }
      if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinchStart = Math.hypot(a.x - b.x, a.y - b.y); distStart = this.goalDist; moved = true; }
    });
    canvas.addEventListener('pointermove', (e) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      const cur = { x: e.clientX, y: e.clientY };
      if (pointers.size === 1) {
        if (Math.hypot(cur.x - downAt.x, cur.y - downAt.y) > 8) moved = true;
        if (moved) {
          const a = ground(prev.x, prev.y), b = ground(cur.x, cur.y);
          if (a && b) { this.goal.add(a.sub(b)); this.target.copy(this.goal); }
        }
      }
      pointers.set(e.pointerId, cur);
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        this.goalDist = THREE.MathUtils.clamp(distStart * (pinchStart / Math.max(1, d)), 16, 120);
      }
      this.clampGoal();
    });
    const up = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      if (pointers.size === 0 && !moved && performance.now() - downAt.t < 450) this.tap(e.clientX, e.clientY, ray, ndc);
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', (e) => pointers.delete(e.pointerId));
    canvas.addEventListener('wheel', (e) => {
      if (!this.interactive || this.title) return;
      e.preventDefault();
      this.goalDist = THREE.MathUtils.clamp(this.goalDist * (1 + Math.sign(e.deltaY) * 0.1), 16, 120);
    }, { passive: false });

    // W-A-S-D / arrow keys pan and Q / E zoom the map while held (desktop). Ignored while typing,
    // with a sheet open, during a battle, or with a modifier held (so browser shortcuts still work).
    const blocked = (e: KeyboardEvent) => {
      if (!this.interactive || this.title || e.ctrlKey || e.metaKey || e.altKey) return true;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return true;
      return !!document.querySelector('.sheet-wrap, .battle-ui');
    };
    addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (!(k in PAN_KEYS || k in ZOOM_KEYS) || blocked(e)) return;
      e.preventDefault(); // arrows would otherwise scroll the page
      this.panKeys.add(k);
    });
    addEventListener('keyup', (e) => this.panKeys.delete(e.key.toLowerCase()));
    addEventListener('blur', () => this.panKeys.clear());
  }

  private panKeys = new Set<string>();

  /** Move the camera goal while pan keys are held (faster when zoomed out), and zoom while Q / E are. */
  private keyPan(dt: number) {
    if (!this.panKeys.size) return;
    if (this.title || document.querySelector('.sheet-wrap, .battle-ui')) { this.panKeys.clear(); return; }
    dt = Math.min(dt, 0.1);
    let x = 0, z = 0, zoom = 0;
    for (const k of this.panKeys) {
      const d = PAN_KEYS[k];
      if (d) { x += d[0]; z += d[1]; }
      zoom += ZOOM_KEYS[k] ?? 0;
    }
    // zoom by a steady ratio (about ×3.3 a second), within the scroll wheel's limits
    if (zoom) this.goalDist = THREE.MathUtils.clamp(this.goalDist * Math.exp(zoom * 1.2 * dt), 16, 120);
    const len = Math.hypot(x, z);
    if (!len) return;
    const step = this.dist * 0.9 * dt / len;
    this.goal.x += x * step;
    this.goal.z += z * step;
    this.clampGoal();
  }

  private clampGoal() {
    this.goal.x = THREE.MathUtils.clamp(this.goal.x, -70 * S, 70 * S);
    this.goal.z = THREE.MathUtils.clamp(this.goal.z, -72 * S, 82 * S); // north edge reaches Cloud Island
  }

  private tap(x: number, y: number, ray: THREE.Raycaster, ndc: (x: number, y: number) => THREE.Vector2) {
    ray.setFromCamera(ndc(x, y), this.camera);
    const hits = ray.intersectObjects(this.hitMeshes, false);
    if (!hits.length) { this.lastTap = { id: '', t: 0 }; return; }
    const id: string = hits[0].object.userData.nodeId;
    const now = performance.now();
    const double = this.lastTap.id === id && now - this.lastTap.t < 400;
    this.lastTap = double ? { id: '', t: 0 } : { id, t: now };
    this.onNodeTap(id);
    if (double) this.onNodeDoubleTap(id);
  }

  // ── Frame ──────────────────────────────────────────────────────
  update(dt: number, t: number) {
    if (this.wispMark) { this.wispMark.position.y = this.wispMark.userData.baseY + Math.sin(t * 2.2) * 0.35; this.wispMark.rotation.y = t; }
    if (this.waypointMark) {
      const { flag, ring } = this.waypointMark.userData as { flag: THREE.Mesh; ring: THREE.Mesh };
      flag.rotation.y = Math.sin(t * 3) * 0.35; // the flag flutters
      const k = (t * 0.8) % 1;
      ring.scale.setScalar(1 + k * 1.6);
      (ring.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.7;
    }
    if (this.title) { this.yaw = Math.sin(t * 0.05) * 0.5; }
    else this.yaw += (0 - this.yaw) * Math.min(1, dt * 2);
    this.keyPan(dt);
    this.target.lerp(this.goal, Math.min(1, dt * 3.5));
    this.dist += (this.goalDist - this.dist) * Math.min(1, dt * 4);
    const cp = Math.cos(this.pitch) * this.dist;
    this.camera.position.set(this.target.x + Math.sin(this.yaw) * cp, this.target.y + Math.sin(this.pitch) * this.dist, this.target.z + Math.cos(this.yaw) * cp);
    this.camera.lookAt(this.target);

    this.waterMat.uniforms.uTime.value = t;
    this.auroraMat.uniforms.uTime.value = t;
    for (const g of this.legendGlows) { g.rotation.y = t; g.position.y = 2.1 + Math.sin(t * 2) * 0.2; }
    const pulse = 1 + Math.sin(t * 5) * 0.06;
    for (const [, r] of this.rings) if (r.visible) r.scale.setScalar((r.userData.base ??= r.scale.x) * pulse);
    const windX = this.fx === 'wind' ? 6 : 1.2;
    for (const c of this.clouds) { c.position.x += dt * windX; if (c.position.x > 110 * S) c.position.x = -110 * S; }

    // pawn hop
    if (this.hopping) {
      const h = this.hopping;
      h.t += dt / 0.55;
      const k = Math.min(1, h.t);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      this.pawn.position.lerpVectors(h.from, h.to, e);
      this.pawn.position.y += Math.sin(k * Math.PI) * 2.2;
      if (k >= 1) { this.hopping = null; h.res(); }
    } else {
      this.pawn.position.y += Math.sin(t * 3) * 0.002;
    }
    this.pawn.rotation.y = Math.sin(t * 0.8) * 0.2;
    this.pawnRig?.update(t);
    for (const r of this.rivalRigs) r.update(t);
    if (this.spot) {
      const sp = this.spot;
      sp.age += dt;
      const fade = Math.max(0, Math.min(1, (sp.life - sp.age) / 0.8)); // fade over the last 0.8 s
      const k = (sp.age * 1.4) % 1; // the ring ripples outward, over and over
      sp.ring.scale.setScalar(0.8 + k * 1.2);
      (sp.ring.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.9 * fade;
      (sp.beam.material as THREE.MeshBasicMaterial).opacity = (0.22 + Math.sin(t * 6) * 0.06) * fade;
      if (sp.age >= sp.life) { this.scene.remove(sp.group); this.spot = null; }
    }
    if (this.follower) {
      const fp = this.follower.root.position;
      const want = this.pawn.position.clone().add(new THREE.Vector3(-1.3, -0.4, 0.6));
      fp.lerp(want, Math.min(1, dt * 5));
      this.follower.root.rotation.y = 0.5;
      this.follower.update(t);
    }

    // particles
    if (this.particles.visible) {
      const pos = this.particles.geometry.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      const fall = this.fx === 'snow' ? 3 : this.fx === 'petals' ? 2 : this.fx === 'wind' ? 0.6 : 22;
      const drift = this.fx === 'wind' ? 14 : this.fx === 'petals' ? 2 : this.fx === 'snow' ? 0.8 : 1.5;
      for (let i = 0; i < arr.length / 3; i++) {
        arr[i * 3 + 1] -= fall * this.particleVel[i] * dt;
        arr[i * 3] += (drift + Math.sin(t + i) * (this.fx === 'snow' || this.fx === 'petals' ? 1 : 0)) * dt;
        if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] += 30;
        if (arr[i * 3] > 35) arr[i * 3] -= 70;
      }
      pos.needsUpdate = true;
      this.particles.position.set(this.target.x, this.target.y, this.target.z);
    }
    if (this.fx === 'storm') {
      if (this.lightning <= 0 && Math.random() < dt * 0.25) this.lightning = 0.25;
      if (this.lightning > 0) { this.lightning -= dt; this.hemi.intensity = 1 + (this.lightning > 0.15 || (this.lightning > 0.04 && this.lightning < 0.09) ? 4 : 0); }
    }
  }

  /** Screen position of a node (for DOM popups). */
  screenOf(id: string): { x: number; y: number } {
    const n = NODE_BY_ID[id];
    const v = new THREE.Vector3(n.x, nodeHeight(n) + 1.5, n.z).project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight };
  }
}
