# Mission performance, pins, audio and phone interface

This update builds on the complete Trek navigation project. Serve this folder using `python3 -m http.server 8000`, keep Terminal open, and visit http://localhost:8000/. The same relative files run under GitHub Pages. The desktop launch screen still offers audio or muted startup.

## Tile rendering

The existing scheduler already allowed 12 concurrent loads and a 220-texture LRU. Sequential upload-and-fade gates delayed requesting deeper levels. A bounded focal overlay now requests the four siblings at the estimated target level and the four siblings at target-minus-one in the same LOD update. Requests prioritize the recent wheel cursor, otherwise the camera center. The existing coarse tree stays underneath, including during missing or transparent CTX coverage. No parent is hidden to expose an unloaded direct-LOD overlay.

All temporal imagery blends are now 90 ms. Direct overlays wait for their entire sibling family to be decoded, uploaded and backed by ancestor imagery before fading. Texture uploads remain limited to two per frame and a 1.5 ms CPU submission budget. The LRU protects displayed ancestors and direct families. Cache eviction closes owned ImageBitmaps; cancelled or stale decode results are also closed. A feature-detected fetch/createImageBitmap pipeline decodes asynchronously with explicit north-up orientation; Image onload is the fallback. ImageBitmap availability is not assumed on older Safari.

`tests/mission-upgrade.html` verifies first-update L11/L10 scheduling, eight direct keys, the twelve-worker ceiling, fallback coverage and bounded memory. The instant-delivery fixture reaches fully visible target detail within 288 simulated milliseconds. This excludes real network transfer. NASA/Caltech server latency, tile coverage and device GPU speed prevent an honest universal claim of <350 ms sharpening or locked 60 FPS. No such guarantee is made. The isolated CPU benchmark is `tests/mission-render-profile.html`; synthetic tiles are clearly labeled. It measures CPU submission, not GPU completion, network or full-scene frame rate. Browser trace tooling was unavailable; no Core Web Vitals score is claimed.

## Nearby landmarks and provenance

At estimated LOD 5 and closer, viewport-projected callouts reveal nearby Gazetteer features and the existing curated study anchors. The shared catalog snapshot is parsed once. Candidate selection is throttled; at most six desktop or three phone labels are shown, with screen-space overlap rejection and stable DOM buttons. Zooming out fades the callouts. Clicking a callout opens its source card; NASA mission context and USGS feature links remain available.

Only records from the official Gazetteer are labeled **USGS / IAU · OFFICIAL**. The supplied Bradbury, Vera Rubin Ridge, western delta and landing-ellipse coordinates remain **STUDY ANCHOR · APPROX.** with NASA mission context. These must not be relabeled as surveyed official coordinates. No ellipse, rover traverse, elevation or telemetry is fabricated. The source snapshot and detailed scientific limits are documented in TREK-NAVIGATION.md and SOURCE-INTEGRITY.md.

## Visible measurement pins

Pins use the active projection transformer and a reference-surface offset of +0.004 scene units. Their material has depthTest=false, depthWrite=false and transparent=true, with renderOrder=999. The transparent flag is necessary because Three.js sorts opaque and transparent draw lists separately; renderOrder alone cannot place an opaque beacon over transparent imagery. HTML PIN 01 / PIN 02 badges track screen positions, with preceding-segment distance. Beacons stay a consistent pixel size; backside and offscreen pins are culled. The same stored latitude/longitude is reprojected when switching globe, rectangle, north and south views. Clear removes geometry and badges together.

Tests cover all four transforms and badge counts, existing spherical distance calculations, and actual WebGL framebuffer samples of a pin behind foreground imagery. Distances still use the Mars reference sphere, not synthetic terrain relief.

## Audio

Passive capture listeners on pointerdown, touchstart, keydown and click create/resume an AudioContext and play a one-sample silent buffer. Silent unlocking does not start the synthesizer or undo an explicit mute. Start with Audio and the Audio toggle start/resume the existing ambient/telemetry synthesizer, now including filtered wind noise. UI On means the context is running and playback is requested; suspended contexts show Tap to resume. Resume rejections are handled.

Desktop browser audio state transitions and mute preservation were checked. Physical iOS/Android speaker output, the device mute switch, output routing and volume are hardware/OS controlled and were not certified by desktop emulation. Use the Audio button after returning from an interrupted browser session if needed.

## Phone layout

At widths up to 768 px, the interface uses a 48 px header plus the device safe inset, a compact projection trigger and coordinate/scale HUD, and a bottom tool dock. With sheets closed, the measured control footprints leave 79.75% of the 390 × 844 phone viewport unobstructed; the map canvas itself remains full screen. Open sheets intentionally cover part of the map.

Search, Layers, Route/A*, Measure, Science, Weather and More share coordinated bottom sheets. Handles support tap-to-close or downward swipe; Escape also closes. Buttons use 44 px phone touch targets. More preserves the existing study selector, viewing modes, DONKI, Zen, daylight and speed controls, plus the original dock (including the synthetic elevation profile, place particles, Auto-Orbit, UHF and nadir controls). Layers also links the original five surface overlays. Measure exposes coordinate entry, click capture, edit, undo/redo, export and share. Existing rovers/MAV, WebXR and camera AR remain in the exploration sheet. Safe-area padding supports iPhone home bars. Desktop controls remain available in their existing positions.

The simulation, shader, rover assets and AR logic are retained; this update changes their navigation/presentation, not their scientific validity. Existing simulated-data labels remain visible through DATA and the tools.

Latest isolated submission profile: median 1.3 → 1.3 ms; p95 20.4 → 9.4 ms, previous sequential renderer versus direct LOD. An earlier run measured median 2.2 → 1.4 ms and p95 12.2 → 7.9 ms. These are variable synthetic samples, not a universal speed or frame-rate claim. Raw results and caveats are in data/mission-render-profile.json.
