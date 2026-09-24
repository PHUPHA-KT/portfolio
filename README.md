# Singularity — Portfolio

Interactive portfolio: the cursor is a black hole, and the particles re-form into a
shape for each section while you scroll. Static site, no build step.

## Run locally

ES modules need a local server (opening `index.html` directly won't work):

```bash
npx serve .
```

## Deploy (GitHub Pages / Netlify)

Upload the whole folder: `index.html`, `css/`, `js/`, `certs/`, `projects/`,
`profile.jpg`, `qr.svg`, `resume.html`, `resume-en.html`, `resume.css`.
Three.js loads from jsDelivr (pinned `three@0.169.0`), so nothing else is needed.

## Structure

| Path | Role |
|---|---|
| `js/main.js` | Boot, loader, the single frame loop |
| `js/Experience.js` | WebGL owner: renderer, stage, sim, labels, adaptive quality |
| `js/core/` | `Renderer` (DPR cap), `Stage` (scene + cinematic camera) |
| `js/sim/shaders.js` | GPGPU physics + every formation as GLSL |
| `js/sim/formations.js` | JS mirror of formation data (stars, layouts, camera presets) |
| `js/interaction/` | `Pointer` (hold-to-charge), `Cursor`, `ScrollDriver` (inertial) |
| `js/ui/` | Loader, lightbox, 3D-anchored labels, DOM interactions |

Sound hooks: `window.PortfolioEvents.on('gravity:release', e => …)` and the other
events listed in `js/utils/EventBus.js`.

## Debug flags

- `?tier=0|1|2` — force particle count (16k / 36k / 65k)
- `?static` — skip WebGL (the fallback layout)
- `?motion=reduce` — simulate `prefers-reduced-motion`
- `?debug` — exposes `window.__experience`
