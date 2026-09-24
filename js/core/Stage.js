import * as THREE from 'three';
import { CAMERA_PRESETS } from '../sim/formations.js';

const smooth = (t) => t * t * (3 - 2 * t);

/**
 * Scene + cinematic camera rig. The camera glides between per-formation
 * presets driven by the (already inertial) scroll value, with slow pointer
 * parallax and a barely-there idle drift. No orbit controls, no cuts.
 */
export class Stage {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.position.set(0, 0, 14);
    this.presets = CAMERA_PRESETS.map((p) => ({
      pos: new THREE.Vector3(...p.pos),
      look: new THREE.Vector3(...p.look),
    }));
    this.parallax = new THREE.Vector2();
    this._pos = new THREE.Vector3();
    this._look = new THREE.Vector3();
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  update(dt, f, pointer, time, reduced) {
    const n = this.presets.length;
    const i = Math.max(0, Math.min(n - 1, Math.floor(f)));
    const j = Math.min(i + 1, n - 1);
    const t = smooth(Math.max(0, Math.min(1, f - i)));
    this._pos.lerpVectors(this.presets[i].pos, this.presets[j].pos, t);
    this._look.lerpVectors(this.presets[i].look, this.presets[j].look, t);

    if (!reduced) {
      const k = 1 - Math.exp(-dt * 2.2);
      this.parallax.x += (pointer.nx * 0.55 - this.parallax.x) * k;
      this.parallax.y += (pointer.ny * 0.32 - this.parallax.y) * k;
      this._pos.x += this.parallax.x + Math.sin(time * 0.13) * 0.05;
      this._pos.y += this.parallax.y + Math.sin(time * 0.21) * 0.06;
    }

    this.camera.position.copy(this._pos);
    this.camera.lookAt(this._look);
    this.camera.updateMatrixWorld();
  }
}
