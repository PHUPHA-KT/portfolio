import { EventBus } from './utils/EventBus.js';
import { detectDevice } from './utils/device.js';
import { Pointer } from './interaction/Pointer.js';
import { Cursor } from './interaction/Cursor.js';
import { ScrollDriver } from './interaction/ScrollDriver.js';
import { Loader } from './ui/Loader.js';
import { Lightbox } from './ui/Lightbox.js';
import { initNav, initCerts, initVideo, initCopyEmail, initReveal, countUp, createRail } from './ui/ui.js';

const root = document.documentElement;
const bus = new EventBus();
window.PortfolioEvents = bus;

const device = detectDevice();
root.classList.toggle('reduced-motion', device.reduced);
root.classList.toggle('is-touch', device.coarse);

const loader = new Loader(document.getElementById('loader'), { fonts: 0.15, image: 0.1, engine: 0.35, scene: 0.4 });
const lightbox = new Lightbox(document.getElementById('lightbox'));
initNav();
initCerts(bus, lightbox);
initVideo();
initCopyEmail(bus);
initReveal(device.reduced);
const rail = createRail(bus);

const pointer = new Pointer(bus);
const cursor = device.customCursor ? new Cursor(pointer, bus) : null;
const scroll = new ScrollDriver(document.querySelectorAll('[data-formation]'), bus, device);

let experience = null;

// One loop drives everything so input, camera and particles stay in lockstep.
let last = performance.now();
function frame(now) {
  const raw = (now - last) / 1000;
  last = now;
  const dt = Math.min(Math.max(raw, 0), 1 / 30);
  scroll.update(dt);
  pointer.update(dt);
  cursor?.update(dt);
  experience?.update(dt, raw);
  rail.update(scroll.progress);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = img.onerror = () => resolve();
    img.src = src;
  });
}

async function startExperience() {
  const { Experience } = await loader.track('engine', withTimeout(import('./Experience.js'), 12000));
  const exp = new Experience({
    canvas: document.getElementById('scene'),
    labelRoot: document.getElementById('labels'),
    bus,
    device,
    pointer,
    scroll,
  });
  try {
    await exp.init((p) => loader.set('scene', p));
  } catch (err) {
    exp.dispose();
    throw err;
  }
  loader.onProgress((p) => exp.setLoadProgress(p));
  experience = exp;
  if (new URLSearchParams(location.search).has('debug')) window.__experience = exp;
}

function intro() {
  loader.hide();
  root.classList.remove('is-loading');
  root.classList.add('is-ready');
  experience?.release();
  scroll.measure();
  countUp(device.reduced);
  bus.emit('intro:start', { intensity: 1 });

  // Scrolling or clicking during the intro skips the stagger.
  const skip = () => {
    root.classList.add('intro-skip');
    window.removeEventListener('wheel', skip);
    window.removeEventListener('pointerdown', skip);
  };
  window.addEventListener('wheel', skip, { passive: true, once: true });
  window.addEventListener('pointerdown', skip, { passive: true, once: true });
  setTimeout(skip, 2500);
}

async function boot() {
  loader.track('fonts', document.fonts ? document.fonts.ready : Promise.resolve());
  loader.track('image', loadImage('profile.jpg'));

  if (device.webgl) {
    try {
      await startExperience();
    } catch (err) {
      console.warn('[portfolio] WebGL scene unavailable — using static layout.', err);
    }
  }
  if (!experience) {
    root.classList.add('no-webgl');
    loader.set('engine', 1);
    loader.set('scene', 1);
  }

  await loader.done;
  // Let the gathered hexagon hold for a beat before it releases.
  if (experience && !device.reduced) await new Promise((r) => setTimeout(r, 450));
  intro();
}

boot();
