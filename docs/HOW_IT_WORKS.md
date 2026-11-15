# How the upgrade works

## A presentation answer

> ARES NAV is a static browser application built with HTML, CSS, JavaScript, Three.js and GLSL. I started with an existing Mars explorer and upgraded it with AI assistance. A camera-driven quadtree loads NASA imagery at increasing detail as the user zooms. A separate geodesy module calculates Mars distances and areas. The original astronaut, particles, sounds and route tools remain, with an optional synthetic survival demonstration and capability-detected mobile AR. NASA imagery is observational, while the surface terrain and physiology are explicitly simulated.

## Architecture

`app.js` remains the owner of the original scene and state. Adapters expose its globe, camera, original route reconstruction, astronaut and weather controls to the additive modules. The render loop uses `renderer.setAnimationLoop`, allowing WebXR to supply frames. Normal mode renders the original scene; AR mode renders a separate tabletop scene without permanently moving the original world.

The globe is a smooth sphere. Each tile patch has a known equirectangular longitude/latitude extent. A small shared-border skirt covers tessellation gaps. Screen size determines whether to request four children. Parent geometry remains visible until every child has source imagery. Replacing it is atomic within the frame's visible-node selection. At the memory budget, the tree pauses refinement; it does not discard a required parent just to claim a higher zoom level.

The cache has at most 220 source textures. Visible samples, inherited images and requested sibling groups are protected while needed. Other textures are evicted in least-recently-used order with `.dispose()`. Source image requests are bounded at 12; results from stale views are ignored and failures are retried after backoff. Geometry has its own pruning threshold.

The local source viewer is intentionally separate from the synthetic surface mesh. It centers the actual selected site in its correct source tile and displays source-level pixel scale. The old habit of blending a low-resolution orbital tile into invented terrain was removed. This avoids claiming that the model's landmarks were measured by that image.

## Geodesy

Distances use the haversine central angle multiplied by the Mars mean radius. A 3D chord is `2R sin(angle/2)`, summed per segment for polylines. Polygon area is a signed fan of spherical triangles evaluated using L'Huilier's excess formula. Numeric and globe-click inputs use planetocentric latitude and east longitude. Graphic latitude is derived from the requested ellipsoid axes.

Markers and line arcs are attached to the same rotating globe frame as the imagery. Click points are transformed from world coordinates into that frame. Share state includes vertices, drawing mode, site, camera, target, selected globe layer, globe rotation and auto-spin. Restored input is bounded and validated.

Measured terrain-following distances are not claimed: no numeric DEM is included. A separate sampling function returns unavailable if any elevation sample is missing. The synthetic route and profile tools remain available under their original behavior.

## Synthetic risk and routing

The network contains eight normalized inputs, four tanh hidden neurons and a sigmoid output. All weights are explicit and hand-authored. There was no training dataset, calibration, clinical validation or mission validation. The percentage is therefore a scenario score, not a probability of death or system failure.

A deterministic policy chooses the four requested actions from slope, scenario hazard, energy, oxygen and a synthetic dose boundary. A route adapter uses the original waypoint geometry and astronaut walker to visualize the choice. Routes stop at the temporary destination rather than looping back into the hazard. Disabling the scenario restores the saved EVA route and speed. Nearby terrain candidates are procedural and use a disclosed fixed wind convention; a ridge is not claimed to be adequate radiation shielding.

## Mobile and AR

WebXR is selected only after the browser confirms an `immersive-ar` session. The hit-test source finds a physical surface. A reticle guides placement of the roughly 0.8 m model. A clone of the existing globe or selected surface preserves the original scene.

The camera fallback is a camera image behind a transparent WebGL scene. Device orientation adjusts the camera relative to the initial pose; drag rotates the model and pinch changes its size. It is camera-backed 3D, not real surface-anchored AR. Permissions are requested on explicit entry and tracks stop on exit. The application does not upload camera frames.

## What the upgrade does not claim

- Full Mars Trek feature parity or its maximum practical zoom.
- Numeric MOLA elevation from colored hillshade.
- Validated site geology, current Mars weather or verified inherited photo captions.
- A trained neural model, operational safe routes or useful SEP protection from a ridge.
- Ellipsoidal distances: the displayed distance model is the requested mean sphere.
- Real measured terrain-following distance without a numeric DEM.
- Universal headset/browser support, guaranteed seamless rendering on every GPU, or 60 FPS.

## Useful follow-up answers

**Why use tiles?** A whole high-resolution planet is too large to download and keep on the GPU at once. Tiles let the camera select the currently useful detail.

**Why keep parent imagery?** Downloading finer tiles takes time. Keeping the parent gives the viewer continuous coverage while children load.

**Is the survival model trained AI?** No. It demonstrates a neural forward pass with hand-authored weights and explicit scenario rules.

**Is all the data from NASA?** The optical and shaded-relief maps are source imagery. Measurements are derived. Surface terrain, telemetry, spectral curves and survival decisions are demonstrations.

**How can it be shared?** It is static and can be hosted from the root of the existing GitHub Pages repository. No npm install or build server is needed.

**What needs hardware testing?** Camera permissions, gyroscope behavior, real-world AR hit testing, placement, mobile GPU performance, and headset-specific input.

## Smooth zoom update

Viking color remains the automatic source through L6. L7+ requests CTX, with a 220 ms blend after every sibling image has been uploaded to WebGL. New patches inherit their parent image through UV sub-rectangles. The blend shader handles CTX transparency without erasing the Viking underlay. Parents stay visible through the handoff; CTX underlays also remain to fill transparent coverage gaps.

The queue allows 12 requests and the LRU holds up to 220 source textures. Capacity is reserved for complete sibling groups rather than arbitrarily limiting refinement to two groups. LOD selection runs on a 45 ms interval and immediately after controls change; per-frame blending remains smooth between LOD decisions.

The camera can approach radius 4.64 with a 0.01 near plane. Navigation slows in proportion to altitude. The HUD separates the dataset's native resolution from the coarser pixel scale of its current tile.
