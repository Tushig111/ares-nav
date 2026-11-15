# Renderer and projection upgrade

## Changes

- Cache eviction exits immediately when under the 220-source-texture budget; no needless LRU sorting. Visible ancestors and active sibling groups stay protected.
- Maximum 12 concurrent tile requests; request scheduling stays on LOD passes, not every image callback. Controls change cannot upload another batch within 12 ms of the previous batch.
- GPU upload batch has a maximum of two images and a soft 1.5 ms CPU budget. A single upload cannot be preempted and may exceed that budget on a slow driver.
- Dirty LOD passes have a minimum 16 ms separation; ordinary checks retain a 45 ms interval. Crossfades still advance per render frame.
- Frustum tests reuse a Vector3 and Sphere; facing tests avoid temporary normalized vectors. Invisible child branches hide without allocating meshes/materials. Protected color ancestors remain beneath CTX transparency.
- Existing linear filtering, disabled mipmap generation and bounded anisotropy remain. Existing particle/terrain shaders are retained. The displayed FPS badge now measures frames rather than showing a constant 60 FPS.

## Projection implementation

`js/projections.js` maintains the single shared camera object used by OrbitControls, picking, measurements and the quadtree. It computes the polar projection through Three.js OrthographicCamera and copies its projection/inverse matrices to that shared camera. Camera flags, zoom and frustum bounds match the chosen projection. The pole axis and screen-up direction follow the globe's actual world transform, including its tilt. Polar LOD uses orthographic pixel scale and a hemisphere horizon, rather than perspective distance/FOV. Pan/zoom use OrbitControls; rotation is disabled in polar maps. Resize recalculates the orthographic bounds. The same tile cache and quadtree meshes survive projection changes.

Orthographic maps are views of the sphere. They are not stereographic maps, numeric elevation models or independently georeferenced polar WMTS products. Distortion grows toward the limb. The scale bar reports projected-plane distance; geodesic measurements continue to use spherical coordinates. Global and surface navigation restore perspective.

## Measured profile

`tests/render-profile.html` runs baseline and optimized versions sequentially on the same deterministic 180-frame zoom path, 640×480 viewport and 1× pixel ratio. Synthetic checker tiles remove network variability and are confined to this test page; production sources are unchanged. Measurements include quadtree update plus WebGL render submission, not GPU completion or the complete application's particles/terrain.

Observed single-run results in the test browser:

| Metric | Baseline | Optimized |
|---|---:|---:|
| Median CPU submission | 2.3 ms | 2.1 ms |
| p95 CPU submission | 4.8 ms | 4.2 ms |
| p95 frame interval | 44.2 ms | 42.6 ms |
| Final draw calls | 20 | 17 |
| Final triangles | 50,720 | 43,808 |

Both runs reached 236 nodes and the 220-texture budget. These are measured improvements, not a universal no-lag guarantee. Network latency, image decode, browser scheduling, GPU drivers, other tabs and device load can still cause dropped frames. The frame interval results show that this test did not sustain uninterrupted 60 FPS. Do not represent it as having done so.

Raw results are in `data/render-profile.json`. Geometry tests cover north/south orientation, exact orthographic matrix, ray picking, zoom, cache identity, resize and global restoration. Existing geodesy, cache and sibling transition tests are retained; actual GPU alpha-blend checks remain available at `tests/tile-blend-gpu.html`.

## Polar resolution limit

The 220-texture budget remains enforced in all views. Polar traversal permits up to 256 visible leaves (global traversal permits 72), but does not bypass protected-ancestor memory limits. The EQ pyramid converges at the poles: very deep polar zoom can retain coarser Viking imagery when a full sibling set cannot fit or CTX coverage is missing. The HUD reports the actually available imagery level, not the desired zoom level. In the browser deep-pole check, 110× retained Viking L3; high-resolution polar coverage is not claimed. A separate polar tile service or a more extensive pole-specific retiling/cache architecture would be required to guarantee native detail at the exact pole; this version deliberately keeps the requested shared EQ imagery system.
