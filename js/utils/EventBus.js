/**
 * Tiny typed-by-convention event bus.
 * Interaction events carry an `intensity` (0..1+) so audio can be layered on later:
 *   gravity:hover, gravity:charge, gravity:release, formation:change,
 *   cert:hover, cert:open, email:copied, intro:start
 * Exposed as window.PortfolioEvents for plugging in sound without touching the scene.
 */
export class EventBus {
  constructor() {
    this.handlers = new Map();
  }

  on(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(fn);
    return () => this.off(type, fn);
  }

  off(type, fn) {
    this.handlers.get(type)?.delete(fn);
  }

  emit(type, detail = {}) {
    this.handlers.get(type)?.forEach((fn) => {
      try {
        fn(detail);
      } catch (err) {
        console.error(`[EventBus] handler for "${type}" failed`, err);
      }
    });
  }
}
