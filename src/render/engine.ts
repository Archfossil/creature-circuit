import * as THREE from 'three';
import { SPECIES_BY_ID } from '../data/species';
import { buildCreature } from './creatureModel';
import { buildTrainer, type TrainerLook } from './trainerModel';

export const isMobile = matchMedia('(pointer: coarse)').matches || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

export interface SceneView {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  update(dt: number, t: number): void;
  resize?(w: number, h: number): void;
}

export class Engine {
  renderer: THREE.WebGLRenderer;
  view: SceneView | null = null;
  clock = new THREE.Clock();
  canvas: HTMLCanvasElement;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: !isMobile || devicePixelRatio < 2, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.75 : 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.canvas = this.renderer.domElement;
    this.canvas.id = 'gl';
    container.appendChild(this.canvas);
    addEventListener('resize', () => this.resize());
    // orientation changes on iOS report the new size a beat later
    addEventListener('orientationchange', () => setTimeout(() => this.resize(), 250));
    this.resize();
    this.renderer.setAnimationLoop(() => this.frame());
    // Save battery: stop rendering while the tab/app is in the background.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.renderer.setAnimationLoop(null);
      else this.resume();
    });
    addEventListener('pageshow', () => this.resume());
    // Mobile GPUs can drop the WebGL context (memory pressure, app switching).
    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.lost = true;
      this.renderer.setAnimationLoop(null);
      document.body.classList.add('gl-lost');
    });
    // three.js rebuilds its GPU state when the context comes back, so the game carries on where it was
    this.canvas.addEventListener('webglcontextrestored', () => {
      this.lost = false;
      document.body.classList.remove('gl-lost');
      this.resume();
    });
  }
  private lost = false;

  /** Start drawing again after the tab was hidden or the graphics came back. */
  private resume() {
    if (this.lost || document.hidden) return;
    this.clock.getDelta();
    this.resize(); // the browser's bars or the orientation may have changed meanwhile
    this.renderer.setAnimationLoop(() => this.frame());
  }

  setView(v: SceneView) {
    this.view = v;
    this.resize();
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h);
    if (this.view) {
      this.view.camera.aspect = w / h;
      this.view.camera.updateProjectionMatrix();
      this.view.resize?.(w, h);
    }
  }

  frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;
    if (!this.view) return;
    this.view.update(dt, t);
    this.renderer.render(this.view.scene, this.view.camera);
  }
}

// ── Portraits for index cards (rendered once per species, cached) ───────────
let shared: THREE.WebGLRenderer | null = null;
const cache = new Map<string, string>();
/** The portrait renderer, made afresh if its graphics were lost (phones drop them in the background). */
function portraitRenderer(): THREE.WebGLRenderer {
  if (shared && shared.getContext().isContextLost()) { shared.dispose(); shared = null; }
  if (!shared) {
    shared = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    shared.setSize(320, 320);
    shared.setPixelRatio(1);
    shared.toneMapping = THREE.ACESFilmicToneMapping;
    shared.outputColorSpace = THREE.SRGBColorSpace;
  }
  return shared;
}

export function portrait(speciesId: string): string {
  const hit = cache.get(speciesId);
  if (hit) return hit;
  const sp = SPECIES_BY_ID[speciesId];
  if (!sp) return '';
  const pr = portraitRenderer();
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#8a7a66', 1.6));
  const d = new THREE.DirectionalLight('#fff6e0', 2.2);
  d.position.set(2, 4, 4);
  scene.add(d);
  const rig = buildCreature(sp);
  rig.update(0.3);
  rig.root.rotation.y = -0.45;
  scene.add(rig.root);
  const box = new THREE.Box3().setFromObject(rig.root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  const dist = Math.max(size.y, size.x, size.z) * 2.75;
  cam.position.set(center.x + dist * 0.15, center.y + dist * 0.22, center.z + dist);
  cam.lookAt(center);
  pr.setClearColor(0x000000, 0);
  pr.render(scene, cam);
  const url = pr.domElement.toDataURL('image/png');
  if (!pr.getContext().isContextLost()) cache.set(speciesId, url);
  rig.root.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.Material | undefined; m?.dispose?.(); });
  return url;
}

/** A still image of a trainer mini (the customisation preview). Cached per look. */
export function trainerPortrait(look: TrainerLook): string {
  const key = 'trainer:' + JSON.stringify(look);
  const hit = cache.get(key);
  if (hit) return hit;
  const pr = portraitRenderer();
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#8a7a66', 1.6));
  const d = new THREE.DirectionalLight('#fff6e0', 2.2);
  d.position.set(2, 4, 4);
  scene.add(d);
  const rig = buildTrainer(look);
  rig.root.rotation.y = -0.55; // three-quarter view, so ponytails and long hair show
  scene.add(rig.root);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  cam.position.set(0.9, 1.9, 4.6);
  cam.lookAt(0, 1.0, 0);
  pr.setClearColor(0x000000, 0);
  pr.render(scene, cam);
  const url = pr.domElement.toDataURL('image/png');
  if (!pr.getContext().isContextLost()) cache.set(key, url);
  return url; // trainer materials are shared (cached in trainerModel), so nothing is disposed here
}
