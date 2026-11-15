# Final rover / AR / MAV refinement

## Assets and dimensions

The supplied GLBs are retained under `models/curiosity.glb`, `models/curiosity-dirty.glb` and `models/perseverance.glb`. Binary hashes and provenance are in `models/manifest.json`. All textures are embedded. The Perseverance file requires `KHR_draco_mesh_compression`; the pinned Three.js 0.160.0 decoder is bundled locally under vendor/draco with one worker. The files are user-supplied NASA-attributed assets; matching their exact binary identities to a NASA download has not been established. NASA catalog references:

- https://science.nasa.gov/resource/curiosity-rover-3d-model/
- https://science.nasa.gov/3d-resources/mars-2020-perseverance-rover/
- Dimension reference: https://mars.nasa.gov/files/mars2020/Mars2020_Fact_Sheet.pdf

Models are uniformly normalized to the approximate 2.2 m reference height, with their bounding-box bottom at zero. This preserves their proportions; it does not assert that every deployed appendage fits the nominal body dimensions. Scene placement uses 24 horizontal meters per local scene unit, consistent with existing route-coordinate conversion. Terrain relief and astronaut representation remain illustrative and vertically exaggerated; the scene is not a metrology tool. Curiosity is assigned to the Bradbury study anchor at -4.5895°, +137.4417°. Perseverance is assigned to the existing explicitly approximate Jezero regional anchor, not a live rover position.

Assets load on demand on entering surface mode. Load failures are caught and displayed; Inspect rover retries. Only the active rover is rendered, and loaded variants are cached. No missing model is silently replaced with a purported NASA vehicle.

## MAV demonstration

No MAV GLB was supplied. The rocket and 192-point plume are procedural, explicitly illustrative. The pure `flightState` function uses assumed 9 m/s² thrust acceleration for 8 seconds, subtracting the requested constant 3.72 m/s² Mars downward gravity, followed by ballistic coast and a ground-altitude clamp. This is a frame-rate-independent educational calculation, not a flight-calibrated MAV model. NASA publications round Martian gravity differently; 3.72 is the user-requested demo constant. Gravity acts downward and is not the source of ascent. Launch/reset controls are inside Explore + Measure → Rovers + MAV demonstration.

## AR portal

The renderer requests a stencil buffer. The tabletop portal writes a circular stencil mask before rendering content; cloned content materials test against stencil reference 1. Model content is below the aperture, with a visible rim. Portal-owned materials and mask geometry are disposed on cleanup without disposing source-scene geometry. XR hit-test select places the portal using the hit pose. Session-end and camera fallback cleanup stop streams and release the hit-test source. iOS motion permission starts within the user gesture; gyro deltas preserve the initial camera orientation. Camera fallback is explicitly not world-anchored.

Desktop checks cannot certify physical-device tracking, real surface detection, iOS Safari permission behavior, or AR frame rate. Android WebXR and iOS camera/motion checks remain physical-device verification items. No zero-frame-drop guarantee is made.

## Static deployment

GLBs use `new URL('../models/…', import.meta.url)` so both GitHub Pages `/ares-nav/` and nested local preview paths work. Existing tile/source labels and polar projections remain. The application uses pinned CDN Three.js and locally bundled Draco dependencies and therefore needs network access; it is not an offline package. Use HTTPS on GitHub Pages or localhost for camera access. `tests/vehicles.html` loads all three actual GLBs, checks normalized dimensions, and verifies the analytic launch cases.

The rover sits on a small illustrative display pad sampled above the local procedural terrain to prevent the exaggerated relief from burying the model. The pad is not an actual NASA surface asset.

Browser evidence: all three actual GLBs decode and normalize to 2.2 m; five launch analytic checks pass (8/8 total). Main-app Curiosity inspection and launch ignition were exercised with no console errors observed. During close-up inspection, decorative particles/route overlays and the astronaut are hidden to prevent their exaggerated scale from obscuring the real-sized rover; switching rendering modes restores them. User dragging stops automatic launch-camera following.
