import * as THREE from 'three';

const DPR_CAP = [1, 1.25, 1.5];

export class Renderer {
  constructor(canvas, tier) {
    this.canvas = canvas;
    this.dprCap = DPR_CAP[tier] ?? 1.25;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor(0x0a0a0f, 1);
    this.pixelRatio = 1;
  }

  setTier(tier) {
    this.dprCap = DPR_CAP[tier] ?? 1;
  }

  resize(width, height) {
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, this.dprCap);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(width, height, false);
  }

  render(scene, camera) {
    this.renderer.render(scene, camera);
  }

  dispose() {
    this.renderer.dispose();
  }
}
