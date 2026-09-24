const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/**
 * Maps native scroll to a continuous formation index (0..n-1).
 * Each [data-formation] element "owns" the scroll position where its centre
 * meets the viewport centre; between anchors we hold at each end and blend
 * through the middle. The result is smoothed with a critically damped spring
 * so the particles always move with inertia, never snap.
 */
export class ScrollDriver {
  constructor(elements, bus, device) {
    this.els = [...elements].sort((a, b) => a.dataset.formation - b.dataset.formation);
    this.bus = bus;
    this.reduced = device.reduced;
    this.value = 0;
    this.velocity = 0;
    this.target = 0;
    this.index = 0;
    this.anchors = [];
    this.omega = 3.4;

    this.measure = this.measure.bind(this);
    this.measure();
    let t;
    const debounced = () => {
      clearTimeout(t);
      t = setTimeout(this.measure, 120);
    };
    window.addEventListener('resize', debounced);
    if ('ResizeObserver' in window) new ResizeObserver(debounced).observe(document.body);
    window.addEventListener('load', this.measure);
  }

  measure() {
    const vh = window.innerHeight;
    const max = Math.max(0, document.documentElement.scrollHeight - vh);
    let prev = -Infinity;
    this.anchors = this.els.map((el) => {
      const r = el.getBoundingClientRect();
      const top = r.top + window.scrollY;
      const a = clamp(top + r.height / 2 - vh / 2, 0, max);
      prev = Math.max(prev, a);
      return prev;
    });
    this.max = max;
    this.target = this.compute();
  }

  compute() {
    const s = window.scrollY;
    const a = this.anchors;
    if (!a.length || s <= a[0]) return 0;
    for (let i = 0; i < a.length - 1; i++) {
      if (s < a[i + 1]) {
        const span = a[i + 1] - a[i];
        if (span < 1) continue;
        const t = clamp(((s - a[i]) / span - 0.18) / 0.64, 0, 1);
        return i + t;
      }
    }
    return a.length - 1;
  }

  /** Jump without animation (used when the intro hands over to scroll). */
  set(value) {
    this.value = value;
    this.velocity = 0;
  }

  get progress() {
    return this.max > 0 ? clamp(window.scrollY / this.max, 0, 1) : 0;
  }

  update(dt) {
    this.target = this.compute();

    if (this.reduced) {
      this.value = Math.round(this.target);
      this.velocity = 0;
    } else {
      // Closed-form critically damped spring step.
      const w = this.omega;
      const x = this.value - this.target;
      const e = Math.exp(-w * dt);
      const tmp = (this.velocity + w * x) * dt;
      this.velocity = (this.velocity - w * tmp) * e;
      this.value = this.target + (x + tmp) * e;
    }

    const index = Math.round(this.value);
    if (index !== this.index) {
      this.index = index;
      this.bus.emit('formation:change', { index, intensity: Math.min(1, Math.abs(this.velocity)) });
    }
  }
}
