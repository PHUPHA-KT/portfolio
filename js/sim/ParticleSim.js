import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';
import { FORMATIONS_GLSL, VELOCITY_GLSL, POSITION_GLSL, POINTS_VERT, POINTS_FRAG } from './shaders.js';

const TIER_LOOK = [
  { size: 3.2, alpha: 0.8 },
  { size: 2.8, alpha: 0.6 },
  { size: 2.5, alpha: 0.5 },
];

/**
 * GPGPU particle system: position + velocity live in float textures and are
 * integrated on the GPU every frame (ping-pong via GPUComputationRenderer).
 * Owns the THREE.Points that render them.
 */
export class ParticleSim {
  constructor(renderer, size, { layouts, stars, tier }) {
    this.size = size;
    this.count = size * size;

    const ext = renderer.extensions;
    let type;
    if (ext.has('EXT_color_buffer_float')) type = THREE.FloatType;
    else if (ext.has('EXT_color_buffer_half_float')) type = THREE.HalfFloatType;
    else throw new Error('Float render targets unsupported');

    const gpu = new GPUComputationRenderer(size, size, renderer);
    gpu.setDataType(type);
    this.gpu = gpu;

    const pos0 = gpu.createTexture();
    const vel0 = gpu.createTexture();
    const d = pos0.image.data;
    for (let i = 0; i < this.count; i++) {
      d[i * 4] = (Math.random() * 2 - 1) * 16;
      d[i * 4 + 1] = (Math.random() * 2 - 1) * 9.5;
      d[i * 4 + 2] = -12 + Math.random() * 16;
      d[i * 4 + 3] = 1;
    }

    this.velVar = gpu.addVariable('textureVelocity', FORMATIONS_GLSL + VELOCITY_GLSL, vel0);
    this.posVar = gpu.addVariable('texturePosition', POSITION_GLSL, pos0);
    gpu.setVariableDependencies(this.velVar, [this.posVar, this.velVar]);
    gpu.setVariableDependencies(this.posVar, [this.posVar, this.velVar]);

    const V3 = () => new THREE.Vector3();
    this.uniforms = this.velVar.material.uniforms;
    Object.assign(this.uniforms, {
      uTime: { value: 0 },
      uDelta: { value: 1 / 60 },
      uLayout: { value: layouts },
      uStars: { value: stars },
      uHoverStar: { value: -1 },
      uHeroSpread: { value: 1 },
      uFormA: { value: 1 },
      uFormB: { value: 1 },
      uBlend: { value: 0 },
      uStiffness: { value: 0.15 },
      uReduced: { value: 0 },
      uRayOrigin: { value: V3() },
      uRayDir: { value: new THREE.Vector3(0, 0, -1) },
      uPointerVel: { value: V3() },
      uPointerActive: { value: 0 },
      uGravity: { value: 1 },
      uGravityRadius: { value: 3 },
      uHorizon: { value: 0.45 },
      uImpulseOrigin: { value: V3() },
      uImpulseDir: { value: new THREE.Vector3(0, 0, -1) },
      uImpulse: { value: 0 },
      uImpulseRadius: { value: 4 },
    });
    this.posVar.material.uniforms.uDelta = { value: 1 / 60 };

    const error = gpu.init();
    if (error) throw new Error(error);
    pos0.dispose();
    vel0.dispose();

    // Render side
    const geometry = new THREE.BufferGeometry();
    const ref = new Float32Array(this.count * 2);
    const seed = new Float32Array(this.count);
    for (let y = 0, k = 0; y < size; y++) {
      for (let x = 0; x < size; x++, k++) {
        ref[k * 2] = (x + 0.5) / size;
        ref[k * 2 + 1] = (y + 0.5) / size;
        seed[k] = Math.random();
      }
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.count * 3), 3));
    geometry.setAttribute('aRef', new THREE.BufferAttribute(ref, 2));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));

    const look = TIER_LOOK[tier] ?? TIER_LOOK[1];
    this.material = new THREE.ShaderMaterial({
      vertexShader: POINTS_VERT,
      fragmentShader: POINTS_FRAG,
      uniforms: {
        uPos: { value: null },
        uVel: { value: null },
        uSize: { value: look.size },
        uPixelRatio: { value: 1 },
        uViewH: { value: 900 },
        uAlpha: { value: look.alpha },
        uFade: { value: 1 },
        uTime: { value: 0 },
        uPointerActive: { value: 0 },
        uReduced: this.uniforms.uReduced,
        uRayOrigin: this.uniforms.uRayOrigin,
        uRayDir: this.uniforms.uRayDir,
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });

    this.geometry = geometry;
    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;
  }

  setViewport(height, pixelRatio) {
    this.material.uniforms.uViewH.value = height;
    this.material.uniforms.uPixelRatio.value = pixelRatio;
  }

  update(dt) {
    this.uniforms.uDelta.value = dt;
    this.posVar.material.uniforms.uDelta.value = dt;
    this.gpu.compute();
    const m = this.material.uniforms;
    m.uPos.value = this.gpu.getCurrentRenderTarget(this.posVar).texture;
    m.uVel.value = this.gpu.getCurrentRenderTarget(this.velVar).texture;
    m.uTime.value = this.uniforms.uTime.value;
    m.uPointerActive.value = this.uniforms.uPointerActive.value;
  }

  dispose() {
    this.points.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
    this.velVar.material.dispose();
    this.posVar.material.dispose();
    this.gpu.dispose();
  }
}
