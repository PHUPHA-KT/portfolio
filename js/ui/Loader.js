/**
 * Real, weighted loading progress. Each task reports 0..1; the counter eases
 * toward the true total and resolves `done` once it has visibly reached 100.
 */
export class Loader {
  constructor(el, weights) {
    this.el = el;
    this.countEl = el.querySelector('#loader-count');
    this.weights = weights;
    this.values = Object.fromEntries(Object.keys(weights).map((k) => [k, 0]));
    this.shown = 0;
    this.listeners = new Set();
    this._resolve = null;
    this.done = new Promise((r) => { this._resolve = r; });
    this._last = performance.now();
    this._tick = this._tick.bind(this);
    requestAnimationFrame(this._tick);
  }

  set(name, value) {
    if (!(name in this.values)) return;
    this.values[name] = Math.max(this.values[name], Math.min(1, value));
  }

  track(name, promise) {
    return promise.then((v) => { this.set(name, 1); return v; });
  }

  get progress() {
    let total = 0;
    let sum = 0;
    for (const [k, w] of Object.entries(this.weights)) {
      total += w;
      sum += w * this.values[k];
    }
    return total ? sum / total : 1;
  }

  onProgress(fn) {
    this.listeners.add(fn);
  }

  _tick(now) {
    const dt = Math.min(0.1, (now - this._last) / 1000);
    this._last = now;
    const target = this.progress;
    this.shown += (target - this.shown) * (1 - Math.exp(-dt * 5));
    if (target >= 1) this.shown = Math.min(1, this.shown + dt * 0.5);

    const pct = Math.round(this.shown * 100);
    this.countEl.textContent = String(pct).padStart(2, '0');
    this.el.style.setProperty('--p', this.shown.toFixed(3));
    this.listeners.forEach((fn) => fn(this.shown));

    if (this.shown >= 0.999) {
      this.countEl.textContent = '100';
      this._resolve();
      return;
    }
    requestAnimationFrame(this._tick);
  }

  hide() {
    this.el.classList.add('is-done');
    this.el.setAttribute('aria-busy', 'false');
  }
}
