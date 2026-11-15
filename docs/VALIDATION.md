# Smooth zoom validation

This release starts from the supplied `ares-nav-launch-fixed.zip`.

## Automated checks

- 21/21 existing geodesy/survival checks passed.
- 4/4 updated cache regression checks passed against real Three.js math/geometry constructors (no GPU in this suite).
- 12/12 new zoom-transition checks passed: automatic CTX threshold, inherited UVs, GPU-upload readiness, complete sibling handoff, 220 ms timing, transparent CTX underlay retention, missing-sibling fallback, zoom reversal, 12-request concurrency, study-slot sharing, 220-texture admission pinned LRU behavior and suspension while the globe ancestor is hidden.
- 3/3 actual WebGL framebuffer checks passed: transparent CTX children preserve Viking color, opaque CTX detail produces an intermediate blend, and a transparent CTX parent retains its colored ancestor until detail arrives.
- Application JavaScript syntax and local import targets were checked.

Open `/tests/`, `/tests/tile-cache.html`, `/tests/zoom-transitions.html` and `/tests/tile-blend-gpu.html` on the preview server to run the included checks. The WebGL suite requires an available browser GPU context. Raw results are included in `smooth-zoom-test-results.json` and `smooth-zoom-gpu-results.json`.

## Browser verification

The app was launched over localhost and the new tile shader compiled without logged JavaScript/shader errors. Intermediate zoom showed Viking color. The final browser reached **CTX L9 at 29.5 km displayed altitude** (the 4.64 radius limit), with **120/220 textures and 0/12 active requests** once settled. Reverse zoom restored **Viking Color L6** without a remaining blend flag. Hybrid terrain, visor POV, shoulder POV and particle mode were exercised afterwards with no logged runtime/shader errors. The source HUD distinguished native dataset resolution from current tile pixel scale. The camera scale bar showed approximately 2 km at deep zoom instead of the prototype's inaccurate 100 km scale. The existing launch-with-audio and muted controls remain available.

## Scope and practical limits

The tested invariants protect loaded imagery during tile handoffs. Initial source images still need to arrive. Real network delays, unsupported/lost WebGL contexts, device memory pressure and every phone/GPU combination cannot be covered by a universal promise of zero stutter. Missing or failed child tiles keep the colored parent instead of fabricating new data. Transparent PNG coverage gaps retain an ancestor underlay.

Physical WebXR/phone AR was not revalidated in this zoom-only change. Those modules and the six original Chladni GLSL assets were retained. The unavailable THEMIS endpoint remains unavailable; no numeric DEM or new operational safety claim was introduced.

The double-click Mac launcher and direct-file startup explanation are retained. Run `Start ARES.command` or `python3 -m http.server 8000`, then use the localhost URL. For GitHub Pages, upload this folder's contents to the repository root. This delivery does not itself change the existing live deployment.

## Preserved source structure

Comparison against the supplied ZIP retains all **130 HTML IDs**, **33 window action assignments**, and **six byte-identical GLSL files**. Audio, controls, site data, geodesy, measurements, neural-survival and AR module logic is unchanged apart from import version tags. See `smooth-zoom-preservation.json`.

## Deep-zoom scheduler simulation

With actual Three.js geometry and simulated successful image delivery/upload, the closest camera reached CTX L9 and settled with no queued requests. This is a scheduler/geometry check, not a substitute for hardware performance testing; see `smooth-zoom-scheduler.json`. Actual framebuffer tests and the localhost app check provide separate browser evidence.
