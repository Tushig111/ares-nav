# Mars search and navigation update

Run from this extracted project folder with `python3 -m http.server 8000`, keep Terminal open, then visit http://localhost:8000/. JavaScript ES modules require HTTP; double-clicking index.html is not supported. GitHub Pages serves the same files without a build step.

## Search and sources

The collapsible left panel provides Search, Layers and Downloads. Search matches names by default; Metadata includes abstracts, mission and instrument fields. Product Type narrows results. Spatial filters record centers within 500 km of the selected point, not intersecting imagery footprints. Clear resets filters; Remove clears the selected marker cluster. Hide Markers and Hide Path work independently. The initial map has no selected geographic markers; illustrative orbiters can be enabled in Layers.

- **2,055 named features:** complete approved-center snapshot downloaded from the [USGS/IAU Mars Gazetteer](https://planetarynames.wr.usgs.gov/Page/MARS/target), using the KMZ linked by that page. Every feature links to its individual Gazetteer record. These are planetocentric, east-positive coordinates.
- **146 NASA products:** snapshot of the equatorial visible mosaic-product query used by the [official Mars Trek API catalog](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars). This is that catalog query, not a claim to contain every product/projection or proprietary Mars Trek bookmark.
- **Four curated bookmarks / 42 study anchors:** the requested Jezero, Gale, historical landing-site and major-landform lists. Their supplied coordinates are preserved and explicitly labeled approximate. They are not an official Mars Trek bookmark export or current rover tracking feed. For example, the IAU Jezero center is approximately 18.4082 N, 77.6873 E, distinct from the supplied study anchor at 18.38 N, 77.58 E.
- [Perseverance mission location map](https://science.nasa.gov/mission/mars-2020-perseverance/location-map/) and [Curiosity mission location map](https://science.nasa.gov/mission/msl-curiosity/location-map/) provide official mission context; rover traverses are not live-ingested here.

The manifest `data/search-source-manifest.json` records source URLs, retrieval time, counts and the raw Gazetteer KMZ SHA-256. Downloads exports filtered records as JSON and selected points as planetary GeoJSON with an explicit Mars reference extension; generic Earth GIS tools must not interpret those coordinates as WGS84.

The supplied broad Jezero bounding box belongs to the preliminary Jezero_CTX_BlockAdj_dd study product. Controlled CTX and HiRISE have different, smaller footprints. A bounding box is not a landing ellipse. The landing-ellipse entry is a point anchor; no fabricated ellipse is drawn. Optional connecting paths are illustrative bookmark guides, not measured rover traverses.

## Imagery and projections

Global globe, 2:1 rectangular map, north and south views retain the same progressive quadtree renderer and shared texture cache. Panning updates the visible refinement target. The verified global Viking/CTX/MOLA rendering configuration, ancestor-texture fallback and transition fades are preserved.

The Layers tab renders the three already validated global layers. All 146 catalog products are searchable and link to official product metadata. Regional Jezero CTX/HiRISE capabilities were retrieved successfully and the first matrix definitions checked (`data/jezero-native-matrix-validation.json`). That limited check is not a full pixel-registration, coverage, CORS or tile-availability validation; regional products remain metadata links, not newly enabled overlays. MOLA hillshade is not measured elevation. External services may be unavailable or have incomplete high-resolution coverage; retained ancestor imagery remains the visual fallback.

## Navigation and measurements

- Rectangular and polar maps: left drag or one-finger touch pans; two-finger wheel scrolling pans. Ctrl-wheel pinch zoom is damped and anchored to the cursor. The globe restores left-drag rotation and native OrbitControls wheel behavior.
- Enter `latitude longitude` in the lower-right coordinate field and choose Go. The purple marker and camera use the entered coordinate.
- Fly To Area animates camera position, target and zoom. An opposite-hemisphere destination switches to the corresponding polar view so it is not hidden behind the planet.
- Fly Mode: W/A/S/D or arrows; Q/E moves vertically in surface view. Text fields retain normal typing behavior. Manual dragging cancels an active Fly To animation.
- Pins enables direct-click measurement while keeping drag navigation available. Drags and two-pointer gestures do not add pins. Clear pins resets the path and totals.
- Coordinate picking intersects analytic reference geometry in all four projections, never decorative displaced terrain. Segment and total lengths are shortest great-circle arcs on a Mars mean sphere of radius 3,389,500 m. They are not terrain-following or ellipsoidal survey distances.

## Preservation and verification

Existing surface modes, Chladni shaders, astronaut POV, rover models, Web Audio, pathfinder, survival demo and AR modules remain present. Synthetic metrics and provenance notices remain labeled. Physical iOS/WebXR hardware and a physical MacBook trackpad have not been certified by this desktop browser test; simulated wheel/pointer events validate the gesture handling.

Browser checks: `tests/trek-navigation.html` exercises real OrbitControls, selection visibility, coordinate parsing, metadata/spatial filters, all four reference-map picking modes, cursor anchoring, keyboard flight and direct-pin distances. `tests/projection-checks.html` checks projection geometry/cache continuity. Existing unit and GPU blending checks remain available. Test result snapshots are stored under data and identify this update separately from earlier verification files.
