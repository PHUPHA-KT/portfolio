/**
 * Custom cursor: a core dot that tracks exactly and an accretion ring that
 * follows with spring inertia. The ring tightens and glows while charging.
 */
export class Cursor {
  constructor(pointer, bus) {
    this.pointer = pointer;
    this.el = document.createElement('div');
    this.el.className = 'cursor';
    this.el.setAttribute('aria-hidden', 'true');
    this.dot = document.createElement('span');
    this.dot.className = 'cursor-dot';
    this.ring = document.createElement('span');
    this.ring.className = 'cursor-ring';
    this.el.append(this.ring, this.dot);
    document.body.append(this.el);
    document.documentElement.classList.add('has-cursor');

    this.rx = pointer.x;
    this.ry = pointer.y;
    this.vx = 0;
    this.vy = 0;
    this.scale = 1;

    this.offRelease = bus.on('gravity:release', ({ charge }) => this.pulse(charge));
  }

  pulse(charge) {
    const p = document.createElement('span');
    p.className = 'cursor-pulse';
    p.style.setProperty('--x', `${this.pointer.x}px`);
    p.style.setProperty('--y', `${this.pointer.y}px`);
    p.style.setProperty('--s', (3 + charge * 5).toFixed(2));
    this.el.append(p);
    p.addEventListener('animationend', () => p.remove(), { once: true });
  }

  update(dt) {
    const p = this.pointer;
    const isMouse = p.type === 'mouse' || p.type === 'pen';
    this.el.classList.toggle('is-visible', isMouse && p.inside);
    this.el.classList.toggle('is-hover', p.overInteractive);
    this.el.classList.toggle('is-dialog', document.documentElement.classList.contains('lightbox-open'));

    // Critically-damped-ish spring toward the pointer.
    const k = 260;
    const c = 2 * Math.sqrt(k) * 0.9;
    this.vx += ((p.x - this.rx) * k - this.vx * c) * dt;
    this.vy += ((p.y - this.ry) * k - this.vy * c) * dt;
    this.rx += this.vx * dt;
    this.ry += this.vy * dt;

    const targetScale = p.overInteractive ? 1.7 : 1 - p.charge * 0.42;
    this.scale += (targetScale - this.scale) * (1 - Math.exp(-dt * 12));

    this.dot.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
    this.ring.style.transform = `translate3d(${this.rx}px, ${this.ry}px, 0) scale(${this.scale.toFixed(3)})`;
    this.el.style.setProperty('--charge', p.charge.toFixed(3));
  }
}
