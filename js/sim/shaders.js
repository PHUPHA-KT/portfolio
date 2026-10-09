/* Shaders for the GPGPU particle simulation and its point renderer. */

/** Shared: hashing, helpers, and every formation as a pure function of seed + time. */
export const FORMATIONS_GLSL = /* glsl */ `
#define PI 3.14159265
#define TAU 6.28318531

struct Target { vec3 p; float k; float glow; float a; float local; };

uniform float uTime;
uniform vec4 uLayout[9];   // xyz offset, w scale
uniform vec3 uStars[14];
uniform float uHoverStar;
uniform float uHeroSpread;   // horizontal spread of the free drift, follows aspect

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec3 randDir(float a, float b) {
  float z = a * 2.0 - 1.0;
  float t = b * TAU;
  float r = sqrt(max(0.0, 1.0 - z * z));
  return vec3(r * cos(t), r * sin(t), z);
}

vec3 rotY(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); }
vec3 rotX(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z); }

// Fade particles in/out at the ends of looping streams so the wrap is invisible.
float fadeEnds(float u) { return smoothstep(0.0, 0.1, u) * (1.0 - smoothstep(0.9, 1.0, u)); }

// 0 — free drift through the whole volume.
Target fHero(vec4 s, vec4 q) {
  float t = uTime;
  float sx = (s.x * 2.0 - 1.0) * 16.0;
  vec3 p = vec3(sx * uHeroSpread, (s.y * 2.0 - 1.0) * 9.5, mix(-12.0, 4.0, s.z));
  // Two slow ribbons gather part of the dust so the void has structure.
  if (q.z < 0.42) {
    float band = q.z < 0.24
      ? 3.2 * sin(sx * 0.2 + t * 0.03) - 1.2
      : 2.6 * cos(sx * 0.16 - t * 0.025 + 1.7) + 2.4;
    float w = 0.35 + 1.6 * q.w * q.w;
    p.y = band + (s.y - 0.5) * 2.0 * w;
    p.z = mix(-9.0, 1.0, s.z);
  }
  p.x += sin(t * 0.05 + s.w * TAU) * 0.9;
  p.y += cos(t * 0.041 + q.x * TAU) * 0.7;
  p.z += sin(t * 0.033 + q.y * TAU) * 0.6;
  return Target(p, 0.42, 0.0, 1.0, 0.0);
}

// Loose dust that keeps floating while a formation holds.
Target ambient(vec4 s, vec4 q) { Target t = fHero(s, q); t.k = 0.3; t.a = 0.7; return t; }

// 1 — hexagon brand mark: outer + inner ring and a core dot.
Target fHex(vec4 s, vec4 q) {
  if (q.x < 0.16) return ambient(s, q);
  vec3 p;
  float glow = 0.0;
  if (q.y > 0.93) {
    p = randDir(s.x, s.y) * 0.42 * pow(s.z, 0.6);
    glow = 0.9;
  } else {
    float ring = q.y < 0.68 ? 1.0 : 0.58;
    float e = floor(s.x * 6.0);
    float a0 = e * PI / 3.0 + PI / 6.0;
    vec2 A = vec2(cos(a0), sin(a0));
    vec2 B = vec2(cos(a0 + PI / 3.0), sin(a0 + PI / 3.0));
    vec2 xy = mix(A, B, s.y) * 3.3 * ring;
    float th = 0.04 + 0.12 * q.z * q.z;
    p = vec3(xy, (s.z - 0.5) * 0.5 * ring) + randDir(s.w, q.z) * th;
    glow = ring < 1.0 ? 0.25 : 0.0;
  }
  p = rotY(p, sin(uTime * 0.12) * 0.55);
  p = rotX(p, 0.18);
  return Target(p, 2.4, glow, 1.0, 1.0);
}

// 2 — skills: a dominant body (AI & Automation) with two orbiting satellites.
vec3 skillCenter(float i, float t) {
  if (i < 0.5) return vec3(0.0);
  if (i < 1.5) { float a = t * 0.2; return vec3(cos(a) * 4.4, sin(a) * 1.3, sin(a) * 3.2); }
  float a = t * 0.27 + 2.4;
  return vec3(cos(a) * 3.1, -sin(a) * 1.6 - 0.4, sin(a) * 2.4);
}

Target fSkills(vec4 s, vec4 q) {
  if (q.x < 0.1) return ambient(s, q);
  float t = uTime;
  float i = q.y < 0.6 ? 0.0 : (q.y < 0.81 ? 1.0 : 2.0);
  float R = i < 0.5 ? 1.55 : (i < 1.5 ? 0.85 : 0.72);
  vec3 p;
  if (i < 0.5 && s.x < 0.28) {
    float a = s.y * TAU + t * 0.35;
    p = rotX(vec3(cos(a) * 2.35, 0.0, sin(a) * 2.35), 0.42) + randDir(s.z, s.w) * 0.05;
  } else {
    p = skillCenter(i, t) + randDir(s.y, s.z) * R * pow(s.w, 0.45);
  }
  return Target(p, 2.2, i < 0.5 ? 0.1 : 0.18, i < 0.5 ? 1.0 : 0.8, 1.0);
}

// 3 — manga pipeline: a chaotic stream that tightens through three stations.
Target fManga(vec4 s, vec4 q) {
  if (q.x < 0.1) return ambient(s, q);
  float t = uTime;
  if (q.y < 0.1) {
    float g = floor(s.x * 3.0) + 1.0;
    float r = mix(1.25, 0.3, g / 3.0) + 0.18;
    float a = s.y * TAU + t * 0.4;
    vec3 p = vec3(mix(-5.0, 5.0, g * 0.25), cos(a) * r, sin(a) * r) + randDir(s.z, s.w) * 0.03;
    return Target(p, 2.6, 0.45, 1.0, 1.0);
  }
  float u = fract(s.x + t * 0.045);
  float st = (smoothstep(0.2, 0.3, u) + smoothstep(0.45, 0.55, u) + smoothstep(0.7, 0.8, u)) / 3.0;
  float spread = mix(1.15, 0.1, st);
  float chaos = 1.0 - st;
  vec3 j = randDir(s.y, s.z) * spread * sqrt(s.w);
  vec3 p = vec3(
    mix(-5.0, 5.0, u) + j.x * 0.35 * chaos,
    j.y + sin(u * 18.0 + t * 0.8 + s.y * 6.0) * 0.35 * chaos,
    j.z + cos(u * 14.0 - t * 0.6 + s.z * 6.0) * 0.35 * chaos
  );
  return Target(p, 2.4, st * 0.55, fadeEnds(u), 1.0);
}

// 4 — Manhwa Radar: six source lanes converge into one core, one stream leaves.
Target fRadar(vec4 s, vec4 q) {
  if (q.x < 0.1) return ambient(s, q);
  float t = uTime;
  vec3 core = vec3(1.0, 0.0, 0.0);
  if (q.y < 0.14) {
    vec3 p = rotY(randDir(s.x, s.y) * 0.55 * pow(s.z, 0.5), t * 0.6);
    return Target(core + p, 2.8, 0.85, 1.0, 1.0);
  }
  float lane = floor(s.y * 6.0);
  float srcY = (lane - 2.5) * 0.95;
  float srcZ = (lane - 2.5) * 0.25;
  if (q.y < 0.19) {
    vec3 p = vec3(-5.0, srcY, srcZ) + randDir(s.z, s.w) * 0.2 * pow(s.x, 0.7);
    return Target(p, 2.6, 0.4, 1.0, 1.0);
  }
  float u = fract(s.x + t * 0.04);
  float split = 0.6;
  vec3 p;
  float glow;
  if (u < split) {
    float v = u / split;
    float e = smoothstep(0.0, 1.0, v);
    p = vec3(mix(-5.0, core.x, v), srcY * (1.0 - e), srcZ * (1.0 - e)) + randDir(s.z, s.w) * 0.045;
    glow = 0.1;
  } else {
    float v = (u - split) / (1.0 - split);
    p = vec3(mix(core.x, 5.0, v), 0.0, 0.0) + randDir(s.z, s.w) * (0.06 + 0.1 * v);
    glow = 0.55;
  }
  return Target(p, 2.4, glow, fadeEnds(u), 1.0);
}

// 5 — FinQuest: the app's 50/30/20 doughnut, and an XP bar that levels up.
Target fFinQuest(vec4 s, vec4 q) {
  if (q.x < 0.1) return ambient(s, q);
  float t = uTime;
  if (q.y < 0.74) {
    float u = s.x;
    float seg = u < 0.5 ? 0.0 : (u < 0.8 ? 1.0 : 2.0);
    float start = seg < 0.5 ? 0.0 : (seg < 1.5 ? 0.5 : 0.8);
    float len = seg < 0.5 ? 0.5 : (seg < 1.5 ? 0.3 : 0.2);
    float gap = 0.012;
    float a = (start + gap + (u - start) / len * (len - 2.0 * gap)) * TAU + t * 0.08 + PI * 0.5;
    float r = 2.4 + (s.y - 0.5) * 0.55;
    vec3 p = vec3(cos(a) * r, sin(a) * r, (s.z - 0.5) * 0.25) + randDir(s.w, q.z) * 0.03;
    p = rotX(p, -0.25);
    float glow = seg < 0.5 ? 0.15 : (seg < 1.5 ? 0.45 : 0.9);
    return Target(p, 2.5, glow, 1.0, 1.0);
  }
  float fill = fract(t * 0.06);
  vec3 p = vec3(mix(-2.6, 2.6, s.x), -3.7 + (s.y - 0.5) * 0.16, (s.z - 0.5) * 0.1);
  bool on = s.x < fill;
  return Target(p, 2.4, on ? 0.85 : 0.0, on ? 1.0 : 0.35, 1.0);
}

// 6 — experience: a timeline filament with one bright node (MEA).
Target fTimeline(vec4 s, vec4 q) {
  if (q.x < 0.12) return ambient(s, q);
  float t = uTime;
  vec3 node = vec3(1.6, 0.0, 0.0);
  if (q.y < 0.2) {
    vec3 p = rotY(randDir(s.x, s.y) * 0.5 * pow(s.z, 0.7), t * 0.5);
    return Target(node + p, 2.8, 0.9, 1.0, 1.0);
  }
  if (q.y < 0.26) {
    float a = s.x * TAU + t * 0.3;
    vec3 p = node + vec3(cos(a), sin(a), 0.0) * 0.95 + randDir(s.y, s.z) * 0.02;
    return Target(p, 2.6, 0.5, 1.0, 1.0);
  }
  float u = fract(s.x + t * 0.012);
  vec3 p = vec3(mix(-6.0, 6.0, u), 0.0, 0.0) + randDir(s.y, s.z) * 0.07 * pow(s.w, 2.0);
  return Target(p, 2.2, 0.0, fadeEnds(u), 1.0);
}

// 7 — certifications: 14 stars + constellation lines (NCSA closes into a shield).
Target fCerts(vec4 s, vec4 q) {
  if (q.x < 0.1) return ambient(s, q);
  if (q.y < 0.58) {
    float j = floor(s.x * 14.0);
    if (uHoverStar > -0.5 && q.z < 0.2) j = uHoverStar;
    bool hot = abs(j - uHoverStar) < 0.5;
    vec3 c = uStars[int(j)];
    vec3 p = c + randDir(s.y, s.z) * (hot ? 0.34 : 0.26) * pow(s.w, 1.8);
    return Target(p, hot ? 3.2 : 2.6, hot ? 1.0 : 0.2, 1.0, 1.0);
  }
  float e = floor(s.x * 12.0);
  float ia = e < 3.0 ? e : (e < 7.0 ? e + 1.0 : (e < 11.0 ? e + 2.0 : 13.0));
  float ib = e < 11.0 ? ia + 1.0 : 9.0;
  vec3 p = mix(uStars[int(ia)], uStars[int(ib)], s.y) + randDir(s.z, s.w) * 0.018;
  return Target(p, 2.4, 0.0, 0.55, 1.0);
}

// 8 — contact: everything falls into a singularity (accretion disk + photon ring).
Target fSingularity(vec4 s, vec4 q) {
  if (q.x < 0.06) return ambient(s, q);
  float t = uTime;
  if (q.y < 0.1) {
    float a = s.x * TAU;
    vec3 p = vec3(cos(a), sin(a), 0.0) * 1.05 + randDir(s.y, s.z) * 0.025;
    return Target(p, 3.4, 0.9, 1.0, 1.0);
  }
  float rad = 1.15 + pow(s.x, 2.4) * 3.6;
  float ang = s.y * TAU + t * 1.6 * pow(rad, -1.5);
  vec3 p = vec3(cos(ang) * rad, (s.z - 0.5) * 0.08 * rad, sin(ang) * rad);
  p = rotX(p, -0.32);
  float glow = 1.0 - smoothstep(1.1, 2.6, rad);
  return Target(p, 3.0, glow * 0.9, 1.0, 1.0);
}

Target formation(float id, vec4 s, vec4 q) {
  if (id < 0.5) return fHero(s, q);
  if (id < 1.5) return fHex(s, q);
  if (id < 2.5) return fSkills(s, q);
  if (id < 3.5) return fManga(s, q);
  if (id < 4.5) return fRadar(s, q);
  if (id < 5.5) return fFinQuest(s, q);
  if (id < 6.5) return fTimeline(s, q);
  if (id < 7.5) return fCerts(s, q);
  return fSingularity(s, q);
}

Target placed(float id, vec4 s, vec4 q) {
  Target t = formation(id, s, q);
  if (t.local > 0.5) {
    vec4 L = uLayout[int(id + 0.5)];
    t.p = t.p * L.w + L.xyz;
  }
  return t;
}
`;

/** Velocity pass: formation springs + black-hole cursor + impulses. */
export const VELOCITY_GLSL = /* glsl */ `
uniform float uDelta;
uniform float uFormA;
uniform float uFormB;
uniform float uBlend;
uniform float uStiffness;
uniform float uReduced;

uniform vec3 uRayOrigin;
uniform vec3 uRayDir;
uniform vec3 uPointerVel;
uniform float uPointerActive;
uniform float uGravity;
uniform float uGravityRadius;
uniform float uHorizon;

uniform vec3 uImpulseOrigin;
uniform vec3 uImpulseDir;
uniform float uImpulse;
uniform float uImpulseRadius;

vec3 flow(vec3 p, float t) {
  return vec3(
    sin(p.y * 0.31 + t * 0.11) + sin(p.z * 0.23 - t * 0.07),
    sin(p.z * 0.27 + t * 0.09) + sin(p.x * 0.19 + t * 0.05),
    sin(p.x * 0.29 - t * 0.08) + sin(p.y * 0.21 + t * 0.1)
  );
}

// Glow (>=0) and fade (<0) share one channel; fade wins.
float pack(float glow, float alpha) { return alpha < 0.995 ? -(1.0 - alpha) : glow; }

void main() {
  vec2 fc = gl_FragCoord.xy;
  vec2 uv = fc / resolution.xy;
  vec3 pos = texture2D(texturePosition, uv).xyz;
  vec3 vel = texture2D(textureVelocity, uv).xyz;

  vec4 s = vec4(hash12(fc), hash12(fc + vec2(17.31, 91.73)), hash12(fc + vec2(213.1, 7.91)), hash12(fc + vec2(41.7, 311.3)));
  vec4 q = vec4(hash12(fc + vec2(97.1, 53.3)), hash12(fc + vec2(5.3, 177.7)), hash12(fc + vec2(271.9, 131.1)), hash12(fc + vec2(149.3, 263.9)));

  Target A = placed(uFormA, s, q);
  Target B = placed(uFormB, s, q);
  // Per-particle stagger so formations dissolve and assemble organically.
  float b = clamp((uBlend - q.w * 0.35) / 0.65, 0.0, 1.0);
  b = b * b * (3.0 - 2.0 * b);
  vec3 target = mix(A.p, B.p, b);
  float k = mix(A.k, B.k, b) * uStiffness;
  float glow = mix(A.glow, B.glow, b);
  float alpha = mix(A.a, B.a, b);

  if (uReduced > 0.5) {
    // Position integrates last frame's velocity, so a full snap would oscillate;
    // a 0.25 gain settles in a few frames with no visible motion.
    gl_FragColor = vec4((target - pos) * 0.25 / max(uDelta, 1e-3), pack(glow, alpha));
    return;
  }

  // Under-damped spring toward the formation (slight overshoot = momentum).
  vec3 acc = (target - pos) * k * k - vel * (2.0 * 0.62 * k);
  acc += flow(pos, uTime) * (0.22 / (1.0 + k));

  // Black hole: pull toward the cursor ray, swirl around it, keep a dark core.
  vec3 rel = pos - uRayOrigin;
  float along = dot(rel, uRayDir);
  vec3 d = uRayOrigin + uRayDir * along - pos;
  float r = length(d) + 1e-4;
  vec3 dir = d / r;
  float fall = 1.0 - smoothstep(uGravityRadius * 0.35, uGravityRadius, r);
  float g = uGravity * uPointerActive * fall * step(0.0, along);
  acc += dir * g * 26.0 / (r * r + 0.8);
  acc += cross(uRayDir, dir) * g * 9.0 / (r + 0.6);
  acc -= dir * g * 40.0 * (1.0 - smoothstep(0.0, uHorizon, r));
  acc += uPointerVel * g * 0.9;

  // Click pop / release launch: radial push away from the impulse ray.
  vec3 irel = pos - uImpulseOrigin;
  vec3 id = irel - uImpulseDir * dot(irel, uImpulseDir);
  float ir = length(id) + 1e-4;
  acc += (id / ir) * uImpulse * (1.0 - smoothstep(0.0, uImpulseRadius, ir)) * 40.0;

  vel += acc * uDelta;
  vel *= exp(-1.4 * uDelta);
  float sp = length(vel);
  if (sp > 16.0) vel *= 16.0 / sp;

  gl_FragColor = vec4(vel, pack(glow, alpha));
}
`;

export const POSITION_GLSL = /* glsl */ `
uniform float uDelta;
void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 p = texture2D(texturePosition, uv);
  vec3 v = texture2D(textureVelocity, uv).xyz;
  gl_FragColor = vec4(p.xyz + v * uDelta, 1.0);
}
`;

export const POINTS_VERT = /* glsl */ `
uniform sampler2D uPos;
uniform sampler2D uVel;
uniform float uSize;
uniform float uPixelRatio;
uniform float uViewH;
uniform float uAlpha;
uniform float uFade;
uniform float uTime;
uniform float uPointerActive;
uniform float uReduced;
uniform vec3 uRayOrigin;
uniform vec3 uRayDir;

attribute vec2 aRef;
attribute float aSeed;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vec4 P = texture2D(uPos, aRef);
  vec4 V = texture2D(uVel, aRef);
  vec4 mv = modelViewMatrix * vec4(P.xyz, 1.0);
  gl_Position = projectionMatrix * mv;

  float depth = -mv.z;
  if (depth < 0.5) { gl_PointSize = 0.0; vAlpha = 0.0; vColor = vec3(0.0); return; }

  float glow = max(V.w, 0.0);
  float fade = V.w < 0.0 ? 1.0 + V.w : 1.0;
  float speed = length(V.xyz);

  vec3 rel = P.xyz - uRayOrigin;
  float rd = length(rel - uRayDir * dot(rel, uRayDir));
  float near = uPointerActive * (1.0 - smoothstep(0.4, 3.0, rd));
  float heat = clamp(speed * 0.07, 0.0, 1.0) * (1.0 - uReduced);

  vec3 white = vec3(0.93, 0.95, 1.0);
  vec3 cyan = vec3(0.0, 0.898, 1.0);
  vec3 violet = vec3(0.545, 0.424, 1.0);
  vec3 accent = mix(cyan, violet, clamp(heat * 1.3 + near * 0.4, 0.0, 1.0));
  float tint = clamp(glow * 0.75 + heat * 0.55 + near * 0.35, 0.0, 0.85);
  vColor = mix(white, accent, tint);

  float twinkle = 1.0 - glow * 0.3 * (0.5 + 0.5 * sin(uTime * 2.6 + aSeed * 40.0));
  float size = uSize * (0.55 + aSeed * 0.9) * (1.0 + glow * 0.5);
  gl_PointSize = max(1.0, size * uPixelRatio * (uViewH / 900.0) * (14.0 / depth));

  float far = smoothstep(30.0, 12.0, depth);
  vAlpha = uAlpha * (0.45 + 0.55 * aSeed) * fade * uFade * mix(0.35, 1.0, far) * (1.0 + glow * 0.6) * twinkle;
}
`;

export const POINTS_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = dot(c, c) * 4.0;
  if (d > 1.0) discard;
  float a = 1.0 - d;
  gl_FragColor = vec4(vColor, a * a * vAlpha);
}
`;
