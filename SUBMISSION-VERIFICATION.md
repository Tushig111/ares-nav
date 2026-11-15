# Submission verification — 2026-11-15

This release keeps ARES-NAV as the host and adds a Jezero field lab using the supplied Marswalk data. The original Marswalk folder and previous ARES-NAV release are preserved.

## What changed

- The field lab adds CTX-derived 3D terrain, a processed CTX/HiRISE texture composite, physical elevation and slope views, the historical Perseverance traverse, start/destination selection, proposed routes, playback and planetary GeoJSON export.
- One WebGL renderer and one animation loop serve the host and field lab. The host scene pauses while the field lab is visible. Its camera, route state and scientific simulation scale are retained separately.
- Heavy Marswalk files load only on entry. Textures decode to 2048² and upload before interaction; terrain preparation and the route planner yield between batches. The 201² planning grid is cached. The field lab renders when controls, imagery or playback change, avoiding continuous GPU work when idle.
- Failed terrain loading shows a recoverable message and keeps Back to ARES-NAV available. A retry can load normally. Host pointer, wheel and keyboard actions are suspended during field-lab interaction.

## Completed checks

- **18/18 terrain and route checks:** physical coordinate roundtrips, metres/kilometres, true slope, nodata exclusion, flat/3D route metrics, blocked terrain, route detours and disconnected coverage.
- **41/41 existing GIS checks:** all eight controls separately and together, opacity, alignment transforms, cached geometry, route comparison, original A* delegation, missing-data handling and WebGL rendering.
- **11/11 existing visibility/LOD checks:** globe zoom, local-footprint visibility, rectangle view, projection restoration and zoom-aware LOD.
- **6/6 failure recovery checks:** unavailable data, usable return control, host-control restoration, successful retry and actual geometry rendering.
- All 641,601 exported terrain heights checked against the supplied original GeoTIFF; maximum processing/encoding discrepancy 0.01091 m. This is **not** an estimate of real-world DEM accuracy.
- All application JavaScript parsed successfully. Original HTML IDs remain present. Rover models, Draco vendor assets, particle shaders, audio, vehicle/AR implementation, existing GIS manager and quadtree logic are unchanged apart from import-version tags where needed.
- Browser checks exercised startup, Jezero entry, imagery/slope selection, example route calculation, playback, return to 3D Hybrid and 390×844 phone layout. No unhandled JavaScript errors were observed in these checks.

Current machine-readable reports: `data/jezero-core-tests.json`, `data/jezero-recovery-tests.json`, `data/final-gis-tests.json`, `data/final-visibility-tests.json`, `data/final-preservation.json`, and `data/marswalk/terrain-validation.json`.

## Practical limits

The field-lab mesh has approximately 80,000 triangles and about 202 m vertex spacing; the numerical height grid is about 50.5 m, from a native 20 m DEM. Runtime texture spacing is about 19.7 m regional / 4 m local. It cannot resolve individual boulder hazards. Routes are planning demonstrations and EVA consumption uses explicit assumptions. Physical iOS/Android WebXR, camera permissions and device gyroscopes were not retested for this release; their original code is preserved.

Embedded-browser frame timings varied with background/viewport state; they do not establish a locked 60 FPS result. No universal no-lag guarantee is made. NASA imagery, DONKI and CDN availability still depend on outside services. The field lab's bundled scientific data is served from the same static host and does not depend on a live NASA tile request after entry.

Reports with earlier dates or older release names remain as historical evidence, not new tests of this release. Read MARSWALK-SOURCES.md for data provenance and processing limits.

Final follow-up: the final page reload and field-lab entry succeeded, but the subsequent screenshot/interaction check was interrupted by the tool approval service's account usage limit. The final analytic mesh-boundary adjustment has static validation but no completed follow-up visual check. Published-site browser verification is reported separately; do not interpret the earlier checks as exhaustive certification.
