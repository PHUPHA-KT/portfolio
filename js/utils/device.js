const mq = (query) => (window.matchMedia ? window.matchMedia(query).matches : false);

function hasWebGL2() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/**
 * Capability snapshot taken once at boot.
 * tier: 0 = mobile / low, 1 = default, 2 = strong desktop.
 * Debug overrides: ?tier=0|1|2, ?static (skip WebGL), ?motion=reduce
 */
export function detectDevice() {
  const params = new URLSearchParams(location.search);
  const reduced = mq('(prefers-reduced-motion: reduce)') || params.get('motion') === 'reduce';
  const coarse = mq('(pointer: coarse)');
  const finePointer = mq('(pointer: fine)') && mq('(hover: hover)');
  const shortSide = Math.min(screen.width, screen.height);
  const mobile = coarse && shortSide < 820;

  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4;
  let tier = mobile ? 0 : cores >= 8 && memory >= 8 ? 2 : 1;
  if (params.has('tier')) tier = Math.max(0, Math.min(2, Number(params.get('tier')) || 0));

  return {
    reduced,
    coarse,
    mobile,
    tier,
    webgl: !params.has('static') && hasWebGL2(),
    customCursor: finePointer && !reduced,
  };
}
