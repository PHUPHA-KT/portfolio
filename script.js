/* ============================================================
   PHUPHA KONGTHIN — Portfolio interactions
   - Scroll reveal with per-section stagger (IntersectionObserver)
   - Count-up numbers + skill bar percentages
   - Particle network background (disabled on small screens /
     prefers-reduced-motion)
   - Navbar state + mobile menu + copy email
   ============================================================ */

(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Navbar: border appears after scrolling ---------- */
  const navbar = document.getElementById("navbar");
  const onScroll = () => navbar.classList.toggle("scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  const navToggle = document.getElementById("nav-toggle");
  const navLinks = document.getElementById("nav-links");

  navToggle.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(open));
  });

  // Close menu after choosing a link
  navLinks.addEventListener("click", (e) => {
    if (e.target.tagName === "A") {
      navLinks.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });

  /* ---------- Count-up numbers ---------- */
  const animateCount = (el) => {
    const target = parseInt(el.dataset.count, 10);
    if (reducedMotion) {
      el.textContent = target;
      return;
    }
    const duration = 1200;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      // easeOutCubic for a satisfying deceleration
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(eased * target);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  /* ---------- Scroll reveal with stagger ---------- */
  // Assign incremental delays to siblings revealed in the same batch,
  // then flip .visible when they enter the viewport.
  const revealEls = document.querySelectorAll(".reveal");

  const io = new IntersectionObserver(
    (entries) => {
      // Stagger only among elements crossing the threshold together
      const entering = entries.filter((e) => e.isIntersecting);
      entering.forEach((entry, i) => {
        const el = entry.target;
        el.style.setProperty("--d", `${i * 90}ms`);
        el.classList.add("visible");

        // Trigger counters inside this element once revealed
        el.querySelectorAll("[data-count]").forEach(animateCount);

        io.unobserve(el);
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );

  revealEls.forEach((el) => io.observe(el));

  // Hero counters are not .reveal elements — run them on load
  document.querySelectorAll(".hero-stats [data-count]").forEach((el) => {
    setTimeout(() => animateCount(el), reducedMotion ? 0 : 800);
  });

  /* ---------- Active nav link tracks the section in view ---------- */
  const navAnchors = [...navLinks.querySelectorAll('a[href^="#"]')];
  const sectionForAnchor = new Map(
    navAnchors
      .map((a) => [document.querySelector(a.getAttribute("href")), a])
      .filter(([sec]) => sec)
  );

  const navIo = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navAnchors.forEach((a) => a.classList.remove("active"));
        const link = sectionForAnchor.get(entry.target);
        if (link) link.classList.add("active");
      });
    },
    // A narrow horizontal band around the viewport's upper third decides
    // which section is "current"
    { rootMargin: "-30% 0px -60% 0px" }
  );

  sectionForAnchor.forEach((_, sec) => navIo.observe(sec));

  /* ---------- Copy email ---------- */
  const copyBtn = document.getElementById("copy-email");
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(copyBtn.dataset.email);
    } catch {
      // Clipboard API unavailable (e.g. non-secure context): fallback
      const ta = document.createElement("textarea");
      ta.value = copyBtn.dataset.email;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    copyBtn.classList.add("copied");
    setTimeout(() => copyBtn.classList.remove("copied"), 2000);
  });

  /* ---------- Particle network background ---------- */
  // Skipped entirely on reduced motion or small screens (performance)
  const canvas = document.getElementById("bg-canvas");
  if (reducedMotion || window.innerWidth < 768) {
    canvas.remove();
    return;
  }

  const ctx = canvas.getContext("2d");
  let particles = [];
  let w = 0;
  let h = 0;
  let rafId = null;

  const DENSITY = 26000; // px^2 per particle — keep it sparse
  const LINK_DIST = 130;
  const SPEED = 0.18;

  const resize = () => {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    const count = Math.min(70, Math.floor((w * h) / DENSITY));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * SPEED * 2,
      vy: (Math.random() - 0.5) * SPEED * 2,
      r: Math.random() * 1.4 + 0.4,
    }));
  };

  const draw = () => {
    ctx.clearRect(0, 0, w, h);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 229, 255, 0.25)";
      ctx.fill();
    }

    // Faint links between nearby particles
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.hypot(dx, dy);
        if (dist < LINK_DIST) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0, 229, 255, ${0.08 * (1 - dist / LINK_DIST)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    rafId = requestAnimationFrame(draw);
  };

  // Pause rendering when the tab is hidden
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
    } else {
      rafId = requestAnimationFrame(draw);
    }
  });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  resize();
  draw();
})();
