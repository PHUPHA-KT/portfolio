const INTERACTIVE = 'a, button, input, textarea, select, label, summary, dialog, iframe, video, [data-no-gravity]';
const CHARGE_TIME = 1.2; // seconds to reach full gravity while holding

/**
 * Pure DOM input state: position, presence, hold-to-charge.
 * Knows nothing about Three.js — the scene converts it to a world-space ray.
 */
export class Pointer {
  constructor(bus) {
    this.bus = bus;
    this.x = window.innerWidth / 2;
    this.y = window.innerHeight / 2;
    this.nx = 0;
    this.ny = 0;
    this.type = 'mouse';
    this.inside = false;
    this.active = 0; // eased presence 0..1
    this.down = false;
    this.downAt = 0;
    this.charge = 0; // 0..1 while holding
    this.speed = 0; // px/s, smoothed
    this.overInteractive = false;
    this._lastX = this.x;
    this._lastY = this.y;
    this._hoverEmitAt = 0;

    this._onMove = this._onMove.bind(this);
    this._onDown = this._onDown.bind(this);
    this._onUp = this._onUp.bind(this);
    this._onCancel = this._onCancel.bind(this);
    this._onLeave = this._onLeave.bind(this);

    window.addEventListener('pointermove', this._onMove, { passive: true });
    window.addEventListener('pointerdown', this._onDown, { passive: true });
    window.addEventListener('pointerup', this._onUp, { passive: true });
    window.addEventListener('pointercancel', this._onCancel, { passive: true });
    document.documentElement.addEventListener('pointerleave', this._onLeave);
    window.addEventListener('blur', this._onLeave);
  }

  _setPosition(e) {
    this.x = e.clientX;
    this.y = e.clientY;
    this.type = e.pointerType || 'mouse';
  }

  _onMove(e) {
    this._setPosition(e);
    this.overInteractive = !!e.target?.closest?.(INTERACTIVE);
    // Touch only exerts gravity while a finger is down.
    if (this.type === 'mouse' || this.type === 'pen') this.inside = true;
  }

  _onDown(e) {
    this._setPosition(e);
    if (this.type === 'touch') this.inside = true;
    if (e.button !== 0 || e.target?.closest?.(INTERACTIVE)) return;
    this.down = true;
    this.downAt = performance.now();
    this.bus.emit('gravity:charge', { intensity: 0, phase: 'start' });
  }

  _onUp(e) {
    this._setPosition(e);
    if (this.down) {
      this.down = false;
      const held = (performance.now() - this.downAt) / 1000;
      this.bus.emit('gravity:release', { intensity: this.charge, charge: this.charge, held });
    }
    if (this.type === 'touch') this.inside = false;
  }

  _onCancel() {
    // Browser took over (e.g. touch scroll) — let go without a launch.
    this.down = false;
    if (this.type === 'touch') this.inside = false;
  }

  _onLeave() {
    this.inside = false;
    this.down = false;
  }

  update(dt) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.nx = (this.x / w) * 2 - 1;
    this.ny = -((this.y / h) * 2 - 1);

    const target = this.inside ? 1 : 0;
    this.active += (target - this.active) * (1 - Math.exp(-dt * 5));

    if (this.down) this.charge = Math.min(1, this.charge + dt / CHARGE_TIME);
    else this.charge = Math.max(0, this.charge - dt * 3);

    const dx = this.x - this._lastX;
    const dy = this.y - this._lastY;
    this._lastX = this.x;
    this._lastY = this.y;
    const inst = dt > 0 ? Math.hypot(dx, dy) / dt : 0;
    this.speed += (inst - this.speed) * (1 - Math.exp(-dt * 10));

    const now = performance.now();
    if (this.inside && this.speed > 40 && now - this._hoverEmitAt > 120) {
      this._hoverEmitAt = now;
      this.bus.emit('gravity:hover', { intensity: Math.min(1, this.speed / 3000) });
    }
    if (this.down) this.bus.emit('gravity:charge', { intensity: this.charge, phase: 'hold' });
  }
}
