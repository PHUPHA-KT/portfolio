/** DOM-only interactions. Everything here works with or without WebGL. */

export function initNav() {
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');
  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    links.classList.toggle('is-open', open);
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  links.addEventListener('click', (e) => {
    if (e.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
}

export function initCerts(bus, lightbox) {
  const items = [...document.querySelectorAll('[data-star]')].sort((a, b) => a.dataset.star - b.dataset.star);
  const open = (i, opener) => {
    const el = items[i];
    if (!el) return;
    const title = el.querySelector('span')?.textContent.trim() || '';
    const issuer = el.querySelector('em')?.textContent.trim() || '';
    lightbox.open(el.dataset.cert, issuer ? `${title} — ${issuer}` : title, opener || el);
    bus.emit('cert:open', { index: i, intensity: 1 });
  };

  items.forEach((el, i) => {
    const hover = (on) => bus.emit('cert:hover', { index: on ? i : -1 });
    el.addEventListener('pointerenter', () => hover(true));
    el.addEventListener('pointerleave', () => hover(false));
    el.addEventListener('focus', () => hover(true));
    el.addEventListener('blur', () => hover(false));
    el.addEventListener('click', () => open(i, el));
  });

  bus.on('cert:hover', ({ index }) => items.forEach((el, i) => el.classList.toggle('is-hot', i === index)));
  // Stars in the scene ask for a cert; focus returns to its list item afterwards.
  bus.on('cert:select', ({ index }) => open(index, items[index]));

  document.querySelectorAll('[data-lightbox]').forEach((el) => {
    el.addEventListener('click', () => lightbox.open(el.dataset.lightbox, el.dataset.caption || '', el));
  });
}

export function initVideo() {
  document.querySelectorAll('.video[data-yt]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.yt;
      const frame = document.createElement('iframe');
      frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
      frame.title = btn.getAttribute('aria-label') || 'YouTube video';
      frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      frame.allowFullscreen = true;
      const wrap = document.createElement('div');
      wrap.className = 'video';
      wrap.append(frame);
      btn.replaceWith(wrap);
      frame.focus();
    }, { once: true });
  });
}

export function initCopyEmail(bus) {
  const btn = document.getElementById('copy-email');
  const status = document.getElementById('copy-status');
  if (!btn) return;
  let t;
  btn.addEventListener('click', async () => {
    const email = btn.dataset.email;
    let ok = false;
    try {
      await navigator.clipboard.writeText(email);
      ok = true;
    } catch {
      const ta = document.createElement('textarea');
      ta.value = email;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.append(ta);
      ta.select();
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      ta.remove();
    }
    if (!ok) {
      status.textContent = `คัดลอกไม่สำเร็จ — อีเมลคือ ${email}`;
      return;
    }
    btn.classList.add('is-copied');
    status.textContent = 'คัดลอกอีเมลแล้ว';
    bus.emit('email:copied', { intensity: 1 });
    clearTimeout(t);
    t = setTimeout(() => btn.classList.remove('is-copied'), 2200);
  });
}

export function initReveal(reduced) {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    });
  }, { threshold: reduced ? 0 : 0.18, rootMargin: '0px 0px -6% 0px' });
  els.forEach((el) => io.observe(el));
}

export function countUp(reduced) {
  document.querySelectorAll('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    if (reduced) { el.textContent = String(end); return; }
    const start = performance.now();
    const dur = 1400;
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur);
      el.textContent = String(Math.round(end * (1 - Math.pow(2, -10 * t))));
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = String(end);
    };
    el.textContent = '0';
    requestAnimationFrame(step);
  });
}

/** Section indicator + current nav link. */
export function createRail(bus) {
  const sections = [...document.querySelectorAll('[data-formation]')].sort((a, b) => a.dataset.formation - b.dataset.formation);
  const num = document.getElementById('rail-num');
  const name = document.getElementById('rail-name');
  const fill = document.getElementById('rail-fill');
  const navLinks = [...document.querySelectorAll('.nav-links a[href^="#"]')];
  let lastP = -1;

  const setIndex = (index) => {
    const el = sections[index];
    if (!el) return;
    num.textContent = el.dataset.index;
    name.textContent = el.dataset.name;
    const id = el.closest('#projects') ? 'projects' : el.id;
    navLinks.forEach((a) => a.classList.toggle('is-current', a.getAttribute('href') === `#${id}`));
  };
  bus.on('formation:change', ({ index }) => setIndex(index));

  return {
    update(progress) {
      if (Math.abs(progress - lastP) < 0.001) return;
      lastP = progress;
      fill.style.setProperty('--p', progress.toFixed(4));
    },
  };
}
