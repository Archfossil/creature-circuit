import * as THREE from 'three';
import type { SceneView } from './engine';
import { isMobile } from './engine';
import { buildCreature, flash, unflash, type CreatureRig } from './creatureModel';
import { SPECIES_BY_ID } from '../data/species';
import { BIOME_INFO } from '../data/content';
import { TYPE_COLOR } from '../data/types';
import type { Biome, ElementType } from '../data/schema';

const POS: [THREE.Vector3, THREE.Vector3] = [new THREE.Vector3(-2.3, 0, 1.6), new THREE.Vector3(2.4, 0, -1.4)];
/** How far (0..1) each creature turns from its opponent toward the camera, so faces stay readable. */
const CAMERA_CHEAT = 0.2;

/** Yaw that points a model's forward (+Z) axis from `from` toward `to` on the ground plane. */
function yawToward(from: THREE.Vector3, to: THREE.Vector3): number {
  return Math.atan2(to.x - from.x, to.z - from.z);
}

/** Blend between two angles along the shortest arc. */
function lerpAngle(a: number, b: number, t: number): number {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * t;
}

interface Burst { pts: THREE.Points; vel: Float32Array; life: number }

export class BattleView implements SceneView {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(isMobile ? 50 : 40, innerWidth / innerHeight, 0.1, 300);
  private rigs: [CreatureRig | null, CreatureRig | null] = [null, null];
  private props = new THREE.Group();
  private arena!: THREE.Mesh;
  private ring!: THREE.Mesh;
  private skyMat!: THREE.ShaderMaterial;
  private hemi!: THREE.HemisphereLight;
  private bursts: Burst[] = [];
  private tweens: { t: number; dur: number; fn: (k: number) => void; res: () => void }[] = [];
  private shake = 0;
  private time = 0;

  constructor() {
    this.hemi = new THREE.HemisphereLight('#ffffff', '#6b5a48', 1.4);
    const sun = new THREE.DirectionalLight('#fff2dc', 2.6);
    sun.position.set(6, 12, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera; sc.left = -10; sc.right = 10; sc.top = 10; sc.bottom = -10;
    sun.shadow.bias = -0.001;
    const rim = new THREE.DirectionalLight('#9fc6ff', 1.2);
    rim.position.set(-6, 5, -8);
    this.scene.add(this.hemi, sun, rim);

    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { top: { value: new THREE.Color('#5fb4e8') }, bottom: { value: new THREE.Color('#f4e8cf') } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(normalize(vP).y*1.5+0.3,0.0,1.0); gl_FragColor = vec4(mix(bottom, top, h),1.0); }',
    });
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(120, 24, 12), this.skyMat));

    const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 40), new THREE.MeshStandardMaterial({ color: '#7fb069', roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.31; ground.receiveShadow = true; ground.name = 'ground';
    this.arena = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6.6, 0.6, 32), new THREE.MeshStandardMaterial({ color: '#e9dcbc', roughness: 0.9, flatShading: true }));
    this.arena.position.y = -0.3; this.arena.receiveShadow = true;
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(6.25, 0.12, 6, 48), new THREE.MeshStandardMaterial({ color: '#2b2a33' }));
    this.ring.rotation.x = Math.PI / 2; this.ring.position.y = 0.0;
    // circle markings
    for (const p of POS) {
      const pad = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.15, 32), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7 }));
      pad.rotation.x = -Math.PI / 2; pad.position.set(p.x, 0.01, p.z);
      this.scene.add(pad);
    }
    this.scene.add(ground, this.arena, this.ring, this.props);
    this.scene.fog = new THREE.Fog('#f4e8cf', 30, 90);
    this.camera.position.set(-1.2, 3.4, 9.2);
    this.camera.lookAt(0.4, 0.9, 0);
  }

  setup(biome: Biome, arenaType?: ElementType, night = false) {
    this.props.clear();
    const bc = new THREE.Color(BIOME_INFO[biome].color);
    (this.scene.getObjectByName('ground') as THREE.Mesh).material = new THREE.MeshStandardMaterial({ color: bc, roughness: 1, flatShading: true });
    (this.arena.material as THREE.MeshStandardMaterial).color.set(arenaType ? '#f3ead6' : bc.clone().lerp(new THREE.Color('#efe6cf'), 0.65));
    (this.ring.material as THREE.MeshStandardMaterial).color.set(arenaType ? TYPE_COLOR[arenaType] : '#2b2a33');
    const top = night ? '#0e1838' : biome === 'volcanic' ? '#e07a4a' : biome === 'tundra' ? '#9fc3e0' : '#5fb4e8';
    const bottom = night ? '#3a4a7a' : biome === 'volcanic' ? '#ffcf9a' : biome === 'swamp' ? '#cfe0c0' : '#f4e8cf';
    this.skyMat.uniforms.top.value.set(top);
    this.skyMat.uniforms.bottom.value.set(bottom);
    (this.scene.fog as THREE.Fog).color.set(bottom);
    this.hemi.intensity = night ? 0.8 : 1.4;
    // props ring
    const n = isMobile ? 16 : 26;
    for (let i = 0; i < n; i++) {
      // arc behind and beside the arena only — never between camera and creatures
      const a = Math.PI * (1.05 + (i / n) * 0.9) + Math.random() * 0.1;
      const r = 12 + Math.random() * 12;
      const x = Math.cos(a) * r * 1.3, z = Math.sin(a) * r - 2;
      let m: THREE.Mesh;
      if (['forest', 'grove', 'swamp', 'meadow', 'river', 'lake', 'tundra'].includes(biome)) {
        m = new THREE.Mesh(new THREE.ConeGeometry(1 + Math.random(), 3 + Math.random() * 3, 6), new THREE.MeshStandardMaterial({ color: biome === 'tundra' ? '#5c7f6e' : '#2f6b3a', flatShading: true }));
        m.position.set(x, 1.5, z);
      } else {
        const s = 0.8 + Math.random() * 2.2;
        m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), new THREE.MeshStandardMaterial({ color: biome === 'volcanic' ? '#3a3230' : biome === 'canyon' || biome === 'badlands' ? '#b8693a' : '#9a958c', flatShading: true }));
        m.position.set(x, s * 0.4, z);
        m.scale.y = 0.6 + Math.random();
      }
      m.castShadow = true;
      this.props.add(m);
    }
    if (arenaType) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 2.4, 6), new THREE.MeshStandardMaterial({ color: '#f3ead6', flatShading: true }));
        pillar.position.set(Math.cos(a) * 7.2, 1.0, Math.sin(a) * 7.2);
        const flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), new THREE.MeshStandardMaterial({ color: TYPE_COLOR[arenaType], emissive: new THREE.Color(TYPE_COLOR[arenaType]), emissiveIntensity: 1 }));
        flame.position.set(Math.cos(a) * 7.2, 2.5, Math.sin(a) * 7.2);
        pillar.castShadow = true;
        this.props.add(pillar, flame);
      }
    }
  }

  setCreature(side: 0 | 1, speciesId: string | null, pop = true): Promise<void> {
    const old = this.rigs[side];
    if (old) this.scene.remove(old.root);
    this.rigs[side] = null;
    if (!speciesId) return Promise.resolve();
    const rig = buildCreature(SPECIES_BY_ID[speciesId]);
    rig.root.position.copy(POS[side]);
    rig.root.rotation.y = this.facingYaw(side);
    const s = rig.root.scale.x * 1.35;
    rig.root.scale.setScalar(pop ? 0.01 : s);
    this.scene.add(rig.root);
    this.rigs[side] = rig;
    if (!pop) return Promise.resolve();
    this.burst(POS[side].clone().setY(0.8), '#ffffff', 40, 4);
    return this.tween(0.45, (k) => { const e = 1 - Math.pow(1 - k, 3); rig.root.scale.setScalar(s * (e + Math.sin(k * Math.PI) * 0.15)); });
  }

  /** Face the opponent's pad, nudged slightly toward the camera. */
  private facingYaw(side: 0 | 1): number {
    const me = POS[side];
    const foe = yawToward(me, POS[side === 0 ? 1 : 0]);
    const cam = yawToward(me, this.camera.position);
    return lerpAngle(foe, cam, CAMERA_CHEAT);
  }

  private tween(dur: number, fn: (k: number) => void): Promise<void> {
    return new Promise((res) => this.tweens.push({ t: 0, dur, fn, res }));
  }

  async lunge(side: 0 | 1) {
    const rig = this.rigs[side]; if (!rig) return;
    const from = POS[side].clone();
    const dir = POS[side === 0 ? 1 : 0].clone().sub(from).multiplyScalar(0.55);
    await this.tween(0.32, (k) => { const e = Math.sin(k * Math.PI); rig.root.position.copy(from).addScaledVector(dir, e * e); rig.root.position.y = Math.sin(k * Math.PI) * 0.6; });
    rig.root.position.copy(from);
  }

  async projectile(side: 0 | 1, type: ElementType) {
    const color = TYPE_COLOR[type];
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 1), new THREE.MeshStandardMaterial({ color, emissive: new THREE.Color(color), emissiveIntensity: 1.5, flatShading: true }));
    const light = new THREE.PointLight(color, 8, 6);
    ball.add(light);
    const from = POS[side].clone().setY(1.0);
    const to = POS[side === 0 ? 1 : 0].clone().setY(0.9);
    this.scene.add(ball);
    const rig = this.rigs[side];
    if (rig) this.tween(0.2, (k) => { rig.root.position.y = Math.sin(k * Math.PI) * 0.3; });
    await this.tween(0.42, (k) => {
      ball.position.lerpVectors(from, to, k);
      ball.position.y += Math.sin(k * Math.PI) * 1.4;
      ball.rotation.x += 0.3; ball.rotation.y += 0.2;
      ball.scale.setScalar(1 + Math.sin(k * 20) * 0.15);
      if (Math.random() < 0.5) this.burst(ball.position.clone(), color, 3, 0.6, 0.35);
    });
    this.scene.remove(ball);
    this.burst(to, color, 50, 5);
  }

  async support(side: 0 | 1, type?: ElementType) {
    const color = type ? TYPE_COLOR[type] : '#9fe0ff';
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 40), new THREE.MeshBasicMaterial({ color, transparent: true }));
    ring.rotation.x = Math.PI / 2;
    ring.position.copy(POS[side]);
    this.scene.add(ring);
    await this.tween(0.6, (k) => { ring.position.y = k * 2; ring.scale.setScalar(1.4 - k * 0.6); (ring.material as THREE.MeshBasicMaterial).opacity = 1 - k; });
    this.scene.remove(ring);
    this.burst(POS[side].clone().setY(1), color, 25, 2, 0.6);
  }

  async hit(side: 0 | 1, big = false) {
    const rig = this.rigs[side]; if (!rig) return;
    flash(rig, '#ffffff', 1.2);
    this.shake = big ? 0.35 : 0.18;
    const base = POS[side].clone();
    await this.tween(0.3, (k) => { rig.root.position.x = base.x + Math.sin(k * 40) * 0.12 * (1 - k); });
    rig.root.position.copy(base);
    unflash(rig);
  }

  async ko(side: 0 | 1) {
    const rig = this.rigs[side]; if (!rig) return;
    const s = rig.root.scale.x;
    flash(rig, '#000000', 0);
    await this.tween(0.6, (k) => { rig.root.rotation.z = k * 1.4 * (side === 0 ? -1 : 1); rig.root.position.y = -k * 0.4; rig.root.scale.setScalar(s * (1 - k * 0.9)); });
    this.scene.remove(rig.root);
    this.rigs[side] = null;
  }

  async heal(side: 0 | 1) {
    this.burst(POS[side].clone().setY(0.3), '#7dffb0', 30, 1.5, 0.9, true);
    await this.tween(0.3, () => {});
  }

  async arenaFlash(color: string) {
    const prev = this.hemi.color.clone();
    this.hemi.color.set(color);
    this.shake = 0.2;
    await this.tween(0.4, (k) => { this.hemi.intensity = 1.4 + (1 - k) * 3; });
    this.hemi.color.copy(prev);
  }

  private burst(at: THREE.Vector3, color: string, count: number, speed: number, life = 0.7, up = false) {
    const geo = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3);
    const v = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3] = at.x; p[i * 3 + 1] = at.y; p[i * 3 + 2] = at.z;
      const d = new THREE.Vector3(Math.random() - 0.5, up ? Math.random() : Math.random() - 0.3, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.4 + Math.random()));
      v[i * 3] = d.x; v[i * 3 + 1] = d.y; v[i * 3 + 2] = d.z;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.18, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.scene.add(pts);
    this.bursts.push({ pts, vel: v, life });
  }

  screenOf(side: 0 | 1): { x: number; y: number } {
    const h = this.rigs[side]?.height ?? 1.2;
    const v = POS[side].clone().setY(h * 1.4 + 0.3).project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight };
  }

  resize(w: number, h: number) {
    // keep both creatures in frame on tall phones
    const portrait = h > w;
    const shortLandscape = !portrait && h < 560; // phones held sideways: controls take the lower half
    this.camera.fov = portrait ? 62 : shortLandscape ? 46 : isMobile ? 48 : 40;
    this.camera.position.set(portrait ? -0.6 : -1.2, portrait ? 4.2 : shortLandscape ? 5.2 : 3.4, portrait ? 11.5 : shortLandscape ? 10.5 : 9.2);
    this.camera.lookAt(0.3, portrait ? 0.4 : shortLandscape ? -1.6 : 0.9, 0);
    this.camera.updateProjectionMatrix();
  }

  update(dt: number, t: number) {
    this.time = t;
    for (const r of this.rigs) r?.update(t);
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur);
      tw.fn(k);
      if (k >= 1) { this.tweens.splice(i, 1); tw.res(); }
    }
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.life -= dt;
      const pos = b.pts.geometry.attributes.position as THREE.BufferAttribute;
      const a = pos.array as Float32Array;
      for (let k = 0; k < a.length; k++) a[k] += b.vel[k] * dt;
      for (let k = 1; k < a.length; k += 3) b.vel[k] -= 4 * dt;
      pos.needsUpdate = true;
      (b.pts.material as THREE.PointsMaterial).opacity = Math.max(0, b.life * 1.5);
      if (b.life <= 0) { this.scene.remove(b.pts); b.pts.geometry.dispose(); this.bursts.splice(i, 1); }
    }
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt);
      this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.5;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.5;
    } else {
      this.resize(innerWidth, innerHeight);
      this.camera.position.x += Math.sin(this.time * 0.3) * 0.25;
    }
  }
}
