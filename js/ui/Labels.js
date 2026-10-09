import * as THREE from 'three';

/**
 * DOM labels pinned to points inside particle formations. Each label only
 * appears once its formation has settled on screen, and follows it as the
 * camera and formation move. Cert stars are interactive markers.
 */
export class Labels {
  constructor(root, { items, stars, bus }) {
    this.root = root;
    this.bus = bus;
    this.v = new THREE.Vector3();

    this.items = items.map((item) => {
      const el = document.createElement('div');
      el.className = `label ${item.cls || ''}`;
      const span = document.createElement('span');
      span.textContent = item.text;
      el.append(span);
      root.append(el);
      return { ...item, el, shown: false };
    });

    this.stars = stars.map((star, i) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'star';
      el.tabIndex = -1;
      const name = document.createElement('span');
      name.className = 'star-name';
      name.textContent = star.name;
      el.append(name);
      el.addEventListener('pointerenter', () => bus.emit('cert:hover', { index: i }));
      el.addEventListener('pointerleave', () => bus.emit('cert:hover', { index: -1 }));
      el.addEventListener('click', () => bus.emit('cert:select', { index: i }));
      root.append(el);
      return { ...star, el, shown: false, interactive: true, pos: () => star.local };
    });

    this.offHover = bus.on('cert:hover', ({ index }) => {
      this.stars.forEach((s, i) => s.el.classList.toggle('is-hot', i === index));
    });
  }

  update(camera, layouts, f, time, width, height, enabled) {
    const all = this.items.concat(this.stars);
    for (const item of all) {
      const w = enabled ? Math.max(0, 1 - Math.abs(f - item.formation) * 2.4) : 0;
      if (w <= 0.01) {
        if (item.shown) {
          item.el.style.visibility = 'hidden';
          item.el.style.opacity = '0';
          item.el.style.pointerEvents = 'none';
          item.shown = false;
        }
        continue;
      }
      const L = layouts[item.formation];
      const p = item.pos(time);
      this.v.set(p[0] * L.w + L.x, p[1] * L.w + L.y, p[2] * L.w + L.z).project(camera);
      if (this.v.z > 1) continue;
      const x = (this.v.x * 0.5 + 0.5) * width;
      const y = (-this.v.y * 0.5 + 0.5) * height;
      item.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      item.el.style.opacity = w.toFixed(3);
      item.el.style.visibility = 'visible';
      if (item.interactive) item.el.style.pointerEvents = w > 0.6 ? 'auto' : 'none';
      item.shown = true;
    }
  }

  dispose() {
    this.offHover();
    this.root.replaceChildren();
  }
}
