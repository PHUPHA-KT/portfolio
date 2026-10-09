/**
 * JS-side description of the scroll formations. The shapes themselves are
 * generated procedurally in GLSL (see shaders.js); anything the DOM needs to
 * anchor to (labels, cert stars) is mirrored here with the same maths.
 *
 *   0 hero        free drift
 *   1 about       hexagon brand mark
 *   2 skills      three orbiting bodies, mass = weight
 *   3 manga       one stream tightening through stations
 *   4 radar       six sources converging into one core
 *   5 finquest    50/30/20 doughnut + XP bar
 *   6 experience  timeline filament with one node
 *   7 certs       three constellations (14 stars)
 *   8 contact     singularity / accretion disk
 */
export const FORMATION_COUNT = 9;
export const HERO = 0;
export const HEX = 1;
export const FINQUEST = 5;
export const EXPERIENCE = 6;
export const CERTS = 7;
export const CONTACT = 8;

/** Particle grid edge per device tier → 16k / 36k / 65k particles. */
export const SIM_SIZES = [128, 192, 256];

/** Star order matches data-star in the cert list. Local formation space. */
export const STARS = [
  // Anthropic (0–3), upper left
  [-3.7, 2.3, 0.0], [-2.7, 3.1, 0.4], [-1.6, 2.6, -0.3], [-2.3, 1.5, 0.2],
  // Microsoft & TCS (4–8), upper right
  [1.3, 2.9, 0.2], [2.4, 3.35, -0.2], [3.6, 2.8, 0.3], [3.9, 1.6, -0.1], [2.7, 1.15, 0.2],
  // NCSA (9–13), shield below
  [-1.4, -0.5, 0.1], [0.0, -0.05, -0.2], [1.4, -0.5, 0.1], [0.95, -2.2, 0.2], [0.0, -3.1, 0.0],
];

export const RADAR_SOURCES = ['MangaUpdates', 'Naver Series', 'Lezhin', 'Kakao Page', 'Ridi', 'X'];
export const RADAR_CORE = [1.0, 0, 0];
export const TIMELINE_NODE = [1.6, 0, 0];

/** Mirrors skillCenter() in GLSL. */
export function skillCenter(i, t) {
  if (i === 0) return [0, 0, 0];
  if (i === 1) {
    const a = t * 0.2;
    return [Math.cos(a) * 4.4, Math.sin(a) * 1.3, Math.sin(a) * 3.2];
  }
  const a = t * 0.27 + 2.4;
  return [Math.cos(a) * 3.1, -Math.sin(a) * 1.6 - 0.4, Math.sin(a) * 2.4];
}
export const SKILL_RADII = [1.55, 0.85, 0.72];

/** Mirrors fFinQuest(): label anchor just outside the middle of each budget arc. */
export const BUDGET_SPLIT = [
  { label: '50% Needs', start: 0, len: 0.5 },
  { label: '30% Wants', start: 0.5, len: 0.3 },
  { label: '20% Savings', start: 0.8, len: 0.2 },
];
export function budgetArcAnchor(i, t, r = 3.8) {
  const { start, len } = BUDGET_SPLIT[i];
  const a = (start + len / 2) * Math.PI * 2 + t * 0.08 + Math.PI / 2;
  const y = Math.sin(a) * r;
  // rotX(-0.25), as in the shader
  return [Math.cos(a) * r, Math.cos(-0.25) * y, Math.sin(-0.25) * y];
}

/** Camera position + look target per formation. */
export const CAMERA_PRESETS = [
  { pos: [0, 0, 14], look: [0, 0, 0] },
  { pos: [0.8, 0.4, 13.2], look: [0.5, 0, 0] },
  { pos: [-0.9, 1.3, 13.6], look: [-0.3, 0, 0] },
  { pos: [0.3, -0.5, 14.4], look: [0, 0, 0] },
  { pos: [-0.4, 0.3, 14.2], look: [0, 0, 0] },
  { pos: [0.4, -0.6, 13.6], look: [0.2, -0.2, 0] },
  { pos: [0.5, 0.8, 13.4], look: [0.3, 0, 0] },
  { pos: [-0.6, -0.2, 14.6], look: [0, 0.1, 0] },
  { pos: [0, 2.2, 12.4], look: [0, 0, 0] },
];

/**
 * Where each formation sits in world space. On wide screens it takes the half
 * of the viewport opposite the section's text; on narrow screens it centres
 * behind the (veiled) text.
 * `sides[i]` is the side the TEXT is on: 'left' | 'right' | 'center'.
 */
export function computeLayouts(aspect, fovDeg, sides, dist = 14) {
  const visH = 2 * dist * Math.tan((fovDeg * Math.PI) / 360);
  const visW = visH * aspect;
  const wide = aspect > 1.1;

  return sides.map((side, i) => {
    if (i === HERO) return { x: 0, y: 0, z: 0, s: 1 };
    if (i === CONTACT) return { x: 0, y: 0, z: 0, s: wide ? 1 : Math.min(0.85, visW / 10) };
    if (!wide || side === 'center') {
      return { x: 0, y: 0, z: 0, s: Math.min(0.9, visW / 11.5) };
    }
    const dir = side === 'left' ? 1 : -1;
    const s = Math.min(1.05, (visW * 0.4) / 11);
    // Keep ~1.9 units free at the screen edge for the source labels.
    const x = Math.min(visW * 0.25, visW / 2 - 5 * s - 1.9);
    return { x: dir * x, y: 0, z: 0, s };
  });
}

/** Centred, smaller hexagon shown while loading. */
export function loaderLayout(aspect) {
  return { x: 0, y: 0.3, z: 0, s: aspect > 1 ? 0.62 : 0.5 };
}
