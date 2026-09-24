import * as THREE from 'three';
import { Renderer } from './core/Renderer.js';
import { Stage } from './core/Stage.js';
import { ParticleSim } from './sim/ParticleSim.js';
import { Labels } from './ui/Labels.js';
import {
  FORMATION_COUNT, HERO, HEX, CONTACT, SIM_SIZES, STARS, RADAR_SOURCES, RADAR_CORE, TIMELINE_NODE,
  SKILL_RADII, skillCenter, computeLayouts, loaderLayout,
} from './sim/formations.js';

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

/**
 * Owns the WebGL side: renderer, stage, particle simulation, scene labels.
 * Input (Pointer, ScrollDriver) is passed in and read every frame.
 */
export class Experience {
  constructor({ canvas, labelRoot, bus, device, pointer, scroll }) {
    this.canvas = canvas;
    this.labelRoot = labelRoot;
    this.bus = bus;
    this.device = device;
    this.pointer = pointer;
    this.scroll = scroll;

    this.mode = 'loading';
    this.time = 0;
    this.loadProgress = 0;
    this.introWeight = 1;
    this.burst = 0;
    this.burstHold = 0;
    this.fade = 1;
    this.hoverStar = -1;
    this.lost = false;

    this.layoutUniform = Array.from({ length: FORMATION_COUNT }, () => new THREE.Vector4(0, 0, 0, 1));
    this.baseLayouts = [];
    this.starUniform = STARS.map((s) => new THREE.Vector3(...s));
    this.sides = [...document.querySelectorAll('[data-formation]')]
      .sort((a, b) => a.dataset.formation - b.dataset.formation)
      .map((el) => el.dataset.side || 'center');

    this.ray = { origin: new THREE.Vector3(), dir: new THREE.Vector3(0, 0, -1) };
    this.pointerWorld = new THREE.Vector3();
    this.pointerWorldPrev = new THREE.Vector3();
    this.pointerVel = new THREE.Vector3();
    this.impulse = { strength: 0, radius: 4, origin: new THREE.Vector3(), dir: new THREE.Vector3(0, 0, -1) };
    this.perf = { warmup: 0, sum: 0, frames: 0, downgraded: false };
    this._tmp = new THREE.Vector3();
    this.unsubs = [];
  }

  async init(onProgress = () => {}) {
    this.renderer = new Renderer(this.canvas, this.device.tier);
    this.stage = new Stage();
    this.tier = this.device.tier;
    this.buildSim(this.tier);
    onProgress(0.35);

    this.resize();
    this.labels = new Labels(this.labelRoot, { items: this.labelItems(), stars: this.starItems(), bus: this.bus });

    await nextFrame();
    this.renderer.renderer.compile(this.stage.scene, this.stage.camera);
    this.sim.update(1 / 60);
    this.renderer.render(this.stage.scene, this.stage.camera);
    onProgress(0.8);
    await nextFrame();
    onProgress(1);

    this.onResize = () => {
      clearTimeout(this._resizeT);
      this._resizeT = setTimeout(() => this.resize(), 150);
    };
    window.addEventListener('resize', this.onResize);

    this.onContextLost = (e) => {
      e.preventDefault();
      this.lost = true;
      document.documentElement.classList.add('no-webgl');
      document.documentElement.classList.remove('has-particles');
    };
    this.canvas.addEventListener('webglcontextlost', this.onContextLost);

    this.unsubs.push(
      this.bus.on('gravity:release', ({ charge }) => this.onRelease(charge)),
      this.bus.on('cert:hover', ({ index }) => { this.hoverStar = index; }),
      this.bus.on('email:copied', () => this.onEmailCopied()),
      this.bus.on('formation:change', () => { if (this.device.reduced) this.fade = 0; }),
    );

    document.documentElement.classList.add('has-particles');
  }

  buildSim(tier) {
    this.sim = new ParticleSim(this.renderer.renderer, SIM_SIZES[tier], {
      layouts: this.layoutUniform,
      stars: this.starUniform,
      tier,
    });
    this.sim.uniforms.uReduced.value = this.device.reduced ? 1 : 0;
    this.stage.scene.add(this.sim.points);
  }

  labelItems() {
    const up = (i) => (t) => {
      const c = skillCenter(i, t);
      return [c[0], c[1] + SKILL_RADII[i] + 0.35, c[2]];
    };
    const items = [
      { formation: 2, text: 'AI & Automation', cls: 'label--major', pos: up(0) },
      { formation: 2, text: 'Cybersecurity', pos: up(1) },
      { formation: 2, text: 'Technical', pos: up(2) },
      { formation: 3, text: 'งานแมนนวล', pos: () => [-4.4, 1.7, 0] },
      { formation: 3, text: 'อัตโนมัติ', cls: 'label--major', pos: () => [4.4, 0.55, 0] },
      { formation: 4, text: 'SQLite', cls: 'label--major', pos: () => [RADAR_CORE[0], 0.95, 0] },
      { formation: 4, text: 'Daily digest', pos: () => [4.2, 0.55, 0] },
      { formation: 5, text: 'MEA · ฝึกงาน 3 เดือน', cls: 'label--major', pos: () => [TIMELINE_NODE[0], 1.3, 0] },
    ];
    RADAR_SOURCES.forEach((name, j) => {
      items.push({ formation: 4, text: name, cls: 'label--left', pos: () => [-5.1, (j - 2.5) * 0.95, (j - 2.5) * 0.25] });
    });
    return items;
  }

  starItems() {
    const names = [...document.querySelectorAll('[data-star]')]
      .sort((a, b) => a.dataset.star - b.dataset.star)
      .map((el) => el.querySelector('span')?.textContent.trim() || '');
    return STARS.map((local, i) => ({ local, name: names[i] || '' }));
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.width = w;
    this.height = h;
    this.renderer.resize(w, h);
    this.stage.resize(w / h);
    this.sim.setViewport(h, this.renderer.pixelRatio);
    this.sim.uniforms.uHeroSpread.value = Math.min(1.3, Math.max(0.35, w / h / 1.7));
    this.baseLayouts = computeLayouts(w / h, this.stage.camera.fov, this.sides);
    this.loader = loaderLayout(w / h);
  }

  setLoadProgress(p) {
    this.loadProgress = p;
  }

  /** Loader → live: the hexagon releases into free drift. */
  release() {
    this.mode = 'live';
    const target = this.scroll.compute();
    this.scroll.set(target < 1.5 ? HEX : target);
    if (!this.device.reduced) {
      this.impulse.strength = 0.7;
      this.impulse.radius = 5;
      this.impulse.origin.copy(this.stage.camera.position);
      this.impulse.dir.set(0, 0, -1);
    }
  }

  onRelease(charge) {
    if (this.mode !== 'live' || this.device.reduced) return;
    const c = easeOutCubic(charge);
    this.impulse.strength = c < 0.05 ? 0.7 : 0.9 + c * 1.8;
    this.impulse.radius = 2.8 + c * 3.2;
    this.impulse.origin.copy(this.ray.origin);
    this.impulse.dir.copy(this.ray.dir);
  }

  onEmailCopied() {
    if (this.mode !== 'live' || this.scroll.value < CONTACT - 0.5 || this.device.reduced) return;
    this.burstHold = 2.6;
    this.impulse.strength = 2.2;
    this.impulse.radius = 12;
    this.impulse.origin.copy(this.stage.camera.position);
    this._tmp.set(0, 0, 0).sub(this.stage.camera.position).normalize();
    this.impulse.dir.copy(this._tmp);
  }

  updateLayouts(dt) {
    if (this.mode === 'live') this.introWeight = Math.max(0, this.introWeight - dt * 0.6);
    const iw = easeOutCubic(this.introWeight);
    for (let i = 0; i < FORMATION_COUNT; i++) {
      const b = this.baseLayouts[i];
      const u = this.layoutUniform[i];
      if (i === HEX && iw > 0) {
        const l = this.loader;
        u.set(b.x + (l.x - b.x) * iw, b.y + (l.y - b.y) * iw, b.z + (l.z - b.z) * iw, b.s + (l.s - b.s) * iw);
      } else {
        u.set(b.x, b.y, b.z, b.s);
      }
    }
  }

  updatePointerRay(dt) {
    const cam = this.stage.camera;
    this.ray.origin.copy(cam.position);
    this._tmp.set(this.pointer.nx, this.pointer.ny, 0.5).unproject(cam);
    this.ray.dir.copy(this._tmp).sub(cam.position).normalize();

    // Pointer velocity on the z = 0 plane drives the particle trails.
    const d = this.ray.dir;
    const t = Math.abs(d.z) > 1e-4 ? -this.ray.origin.z / d.z : 0;
    this.pointerWorldPrev.copy(this.pointerWorld);
    this.pointerWorld.copy(this.ray.origin).addScaledVector(d, t);
    if (dt > 0) {
      this._tmp.copy(this.pointerWorld).sub(this.pointerWorldPrev).divideScalar(dt);
      if (this._tmp.lengthSq() > 3600) this._tmp.setLength(60);
      this.pointerVel.lerp(this._tmp, 1 - Math.exp(-dt * 12));
    }
  }

  trackPerformance(rawDt) {
    if (this.perf.downgraded || this.tier === 0) return;
    if (rawDt > 0.25) { this.perf.sum = 0; this.perf.frames = 0; return; }
    this.perf.warmup += rawDt;
    if (this.perf.warmup < 4) return;
    this.perf.sum += rawDt;
    this.perf.frames += 1;
    if (this.perf.frames < 120) return;
    const avg = this.perf.sum / this.perf.frames;
    this.perf.sum = 0;
    this.perf.frames = 0;
    if (avg > 0.021) {
      this.perf.downgraded = true;
      this.sim.dispose();
      this.tier -= 1;
      this.renderer.setTier(this.tier);
      this.buildSim(this.tier);
      this.resize();
      console.info(`[portfolio] frame time ${(avg * 1000).toFixed(1)}ms → particle tier ${this.tier}`);
    }
  }

  update(dt, rawDt) {
    if (this.lost) return;
    const reduced = this.device.reduced;
    if (!reduced) this.time += dt;
    const p = this.pointer;
    const u = this.sim.uniforms;

    // Formation pair + blend
    let a, b, blend;
    if (this.mode === 'loading') {
      a = b = HEX;
      blend = 0;
    } else {
      const f = this.scroll.value;
      a = Math.max(0, Math.min(FORMATION_COUNT - 1, Math.floor(f)));
      b = Math.min(a + 1, FORMATION_COUNT - 1);
      blend = Math.max(0, Math.min(1, f - a));

      if (this.burstHold > 0) {
        this.burstHold -= dt;
        this.burst = Math.min(1, this.burst + dt * 2.5);
      } else {
        this.burst = Math.max(0, this.burst - dt * 0.3);
      }
      if (this.burst > 0.001 && f > CONTACT - 0.5) {
        a = CONTACT;
        b = HERO;
        blend = this.burst;
      }
    }

    this.updateLayouts(dt);
    const f = this.mode === 'loading' ? HEX : this.scroll.value;
    this.stage.update(dt, f, p, this.time, reduced);
    this.updatePointerRay(dt);

    const charge = easeOutCubic(p.charge);
    const live = this.mode === 'live' && !reduced;
    u.uTime.value = this.time;
    u.uFormA.value = a;
    u.uFormB.value = b;
    u.uBlend.value = blend;
    u.uStiffness.value = this.mode === 'loading' ? 0.15 + 0.85 * this.loadProgress : 1;
    u.uPointerActive.value = live ? p.active : 0;
    u.uGravity.value = 1 + charge * 1.8;
    u.uGravityRadius.value = 4 + charge * 2.5;
    u.uHorizon.value = 0.45 + charge * 0.12;
    u.uRayOrigin.value.copy(this.ray.origin);
    u.uRayDir.value.copy(this.ray.dir);
    u.uPointerVel.value.copy(this.pointerVel);
    u.uHoverStar.value = this.hoverStar;

    this.impulse.strength *= Math.exp(-dt * 9);
    u.uImpulse.value = this.impulse.strength;
    u.uImpulseRadius.value = this.impulse.radius;
    u.uImpulseOrigin.value.copy(this.impulse.origin);
    u.uImpulseDir.value.copy(this.impulse.dir);

    this.fade = Math.min(1, this.fade + dt / 0.6);
    this.sim.material.uniforms.uFade.value = reduced ? this.fade * this.fade : 1;

    this.sim.update(dt);
    this.renderer.render(this.stage.scene, this.stage.camera);
    this.labels.update(this.stage.camera, this.layoutUniform, f, this.time, this.width, this.height, this.mode === 'live');
    this.trackPerformance(rawDt);
  }

  dispose() {
    window.removeEventListener('resize', this.onResize);
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.unsubs.forEach((off) => off());
    this.labels?.dispose();
    this.sim?.dispose();
    this.renderer?.dispose();
  }
}
