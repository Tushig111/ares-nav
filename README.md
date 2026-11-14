# ARES NAV

An interactive Mars explorer and EVA route-planning demonstration, built with HTML, CSS, JavaScript, Three.js, and GLSL. Explore an orbital globe, switch between four surface presets, place waypoints, compare slope-aware routes, and view an animated astronaut from several camera angles.

This is an educational visualization. Surface terrain, weather presets, mineral curves, radiation values, oxygen reserves, and communications estimates are illustrative models. NASA image references and captions were inherited from the supplied prototype and have not been individually verified. The project is not an operational navigation or safety system and does not imply NASA endorsement.

## Run locally

From this folder, run:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000 in a modern browser with WebGL. Use a local server rather than double-clicking `index.html`, because the application loads JavaScript modules and shader files. No build step or npm installation is needed. Internet access is needed for Three.js, optional Google Fonts, and external NASA resources.

## Files

| File | Responsibility |
| --- | --- |
| `index.html` | Page structure, panels, and controls |
| `css/styles.css` | Layout, colors, responsive rules, and animation |
| `js/app.js` | Scene setup, geometry, route planning, state, camera, and rendering |
| `js/controls.js` | Static button and slider event bindings |
| `js/audio.js` | Optional synthesized ambience and interface sounds |
| `js/data.js` | Four site presets, photo references, and layer definitions |
| `js/noise.js` | Deterministic procedural terrain noise |
| `js/shaders.js` | Loads the GLSL files relative to the module URL |
| `shaders/*.glsl` | Particle, sparkle, and terrain GPU programs |
| `docs/HOW_IT_WORKS.md` | Architecture and an explanation for a project presentation |

The scene controller remains one module because its geometry, route, and animation state are closely connected. This refactor separates languages and independent functionality without introducing a framework or changing initialization order. Some generated UI markup and runtime style updates remain in JavaScript.

## Try it

1. Choose **Start Muted** or **Start with Audio**.
2. Rotate and zoom the globe, then select a site.
3. Switch to **3D Hybrid** or **Pure Particle LiDAR**.
4. Open **EVA Route & A*** to adjust waypoints and run the route optimizer.
5. Explore the astronaut camera, elevation profile, weather presets, and route export.

“Pure Particle LiDAR” is a visual display mode; it is not captured LiDAR survey data. The audio is generated in the browser, not a recording from Mars.

## Share on GitHub Pages

Upload this folder's contents to the root of a public GitHub repository. In **Settings → Pages**, select **Deploy from a branch**, choose the repository's default branch and **/(root)**, then save. GitHub will show the published URL when deployment completes. Share the repository URL for source code and the Pages URL for the interactive demo.

Keep `index.html`, `css`, `js`, and `shaders` together. Relative paths support publishing under a repository subpath. `.nojekyll` allows the static files to be served without Jekyll processing.

## Data and dependencies

- Three.js 0.160.0 and OrbitControls are loaded through the import map in `index.html`.
- NASA Trek image tile templates, NASA/JPL photo URLs, and the DONKI SEP endpoint are configured in the code.
- DONKI uses NASA's public `DEMO_KEY`, which can be rate-limited. A failure is shown as **Unavailable**; an empty successful response is shown as **No events**. The weather and safety simulation does not become live just because the request succeeds.
- Some external resources may fail or reject cross-origin requests. Procedural visuals provide a fallback for several image paths.
- Custom feed controls change endpoint configuration; already-created textures are not all reloaded automatically.
- Do not place a private API key in browser code or a public repository.

## Changes from the supplied prototype

Separated HTML, CSS, JavaScript, and GLSL; extracted audio, site data, noise, and static controls; clarified several comments; restored browser zoom; added keyboard focus styling; corrected feed status and fabricated fallback metadata; and prevented a visual transition from starting audio after a muted launch.

## Validation

All six JavaScript modules passed syntax parsing. The local browser preview rendered the globe and surface mode, and the launch and surface controls responded without logged JavaScript or shader errors during those checks. This is a smoke check, not a full validation of every feature, external source, or mobile/GPU combination.

No license has been selected on the owner's behalf. Public visibility permits viewing the repository; redistribution rights for code and third-party assets should be documented separately before reuse.

## Opening globe data

The globe now uses the NASA Mars Trek **Viking VIS, Global Color Mosaic** layer (`Mars_Viking_MDIM21_ClrMosaic_global_232m`) directly, without generated color blending or synthetic globe relief. The displayed texture is a 2048 × 1024 overview, not the full native-resolution dataset. Source: [NASA Mars Trek API](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars). The imagery status distinguishes loading, base-map fallback, full overview, and failure. The live globe remains a simplified sphere; surface exploration sites are still procedural demos.
