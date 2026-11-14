# How ARES NAV works

## A short answer you can say

> ARES NAV is a browser-based Mars exploration demo. HTML defines the panels and controls, CSS handles the appearance and responsive layout, and JavaScript connects the interface to a Three.js 3D scene. I use procedural terrain to represent four Mars-inspired locations, GLSL shaders for particle effects, and an A* search that penalizes steep terrain when planning a route. NASA image and data endpoints add context, but the terrain and safety numbers are demonstrations rather than validated mission data. The project started from an existing single-file prototype, which I refactored with AI assistance into separate, readable files.

Adapt that wording to the work you actually did and understand. Cleaner code does not establish that a project was written without AI; describe assistance honestly when asked.

## What each language does

**HTML** is the structure: buttons, site selector, drawers, sliders, and canvases. The browser also reads an import map that points to a specific version of Three.js.

**CSS** controls the dark interface, colors, glass panels, focus rings, mobile breakpoints, and transitions. One-off static styles were moved out of the markup. JavaScript still changes styles for live values and animation.

**JavaScript** manages user actions, state, models, routes, and the render loop. `app.js` creates the renderer, scene, camera, lights, terrain, astronaut, and overlays. `controls.js` connects named HTML actions to the existing application functions. `data.js`, `noise.js`, and `audio.js` hold independent concerns.

**GLSL** runs on the graphics processor. Vertex shaders position particles and terrain vertices; fragment shaders calculate the appearance of the pixels or points. The shaders use uniforms, such as time and transition progress, to animate without rebuilding every particle on the CPU each frame.

## How the 3D world is made

Three.js draws meshes and point clouds using WebGL. The opening globe uses a smooth reference sphere with NASA Mars Trek Viking global mosaic tiles. It contains no procedural relief, generated normal map, or invented close-up surface detail. NASA imagery is drawn at full opacity. A complete 512 × 256 base map loads first, followed by a complete 2048 × 1024 level; failures are labeled, and no synthetic map is substituted. The sphere is a simplified shape, not a measured elevation model. Surface sites use mathematical height functions, layered deterministic noise, and site-specific shapes. Heights and colors are precomputed for transitions. These are reconstructed artistic surfaces, not downloaded full-resolution survey DEMs.

The standing-wave particle effects are inspired by Chladni patterns: sine waves form nodal lines, and shader calculations move and illuminate particles around those patterns. This is a visual technique, not a scientific acoustic experiment on Mars.

The astronaut is assembled from geometry, with grouped limbs that rotate during a walk cycle. Camera smoothing supports a free view, shoulder view, and visor view. `requestAnimationFrame` updates the scene; actual frame rate depends on the device.

## How route planning works

The optimizer samples a grid across the current procedural terrain. A* considers neighboring grid cells, tracks the accumulated movement cost, and adds a slope penalty. A distance-to-goal heuristic helps choose which candidate to explore next. The resulting points are used to rebuild the displayed route and astronaut path.

The result is a route favored by this simplified cost function. It does not prove that the route is safe, globally optimal over real terrain, or feasible for a real astronaut. Smoothing and coarse grid sampling also affect the final displayed path.

## How NASA resources are used

The prototype contains NASA Trek tile URL templates, NASA/JPL photograph references, and a request to the DONKI solar energetic particle endpoint. Images supplement the procedural scene when available. Site weather, mineral plots, radiation, and oxygen values remain demo inputs or calculations.

A successful feed request records event count and the latest returned event time. An empty array means the service returned no events for that request, not that Mars is safe. A failed request now displays “Unavailable,” with no invented cached event or timestamp. Photo captions and scientific claims inherited from the original need source-by-source review before presenting them as established findings.

## Why separate the files?

A single file mixed presentation, data, sound, physics-like effects, and interaction. Separating concerns makes it easier to find a bug and understand what a change affects. For example, changing panel colors belongs in CSS, editing a site preset belongs in `data.js`, and adjusting particle motion belongs in a shader. The scene state stays together for now because splitting it further requires a larger architectural change.

## Useful answers to follow-up questions

**Why Three.js?** It provides scene objects, cameras, geometry, materials, raycasting, and controls over WebGL, reducing the amount of graphics boilerplate.

**Did you train an AI model?** No. This project uses browser graphics, mathematical terrain functions, shader animation, and a search algorithm. AI assistance was used in refactoring this version.

**Is everything live NASA data?** No. Some external images and a space-weather request are used, while most surface and mission values are simulated.

**How is sound created?** The Web Audio API connects oscillators, filters, gain envelopes, and a generated reverb buffer. Audio is optional.

**How can someone open it?** Serve the static files locally or publish them on GitHub Pages. Visitors can use the demo without installing the source dependencies.

**What would you improve next?** Verify each dataset and caption, clearly label individual simulated layers, replace procedural terrain with validated elevation inputs, separate the scene controller into smaller systems, and test route behavior across more cases and devices.

## Opening globe data

The globe now uses the NASA Mars Trek **Viking VIS, Global Color Mosaic** layer (`Mars_Viking_MDIM21_ClrMosaic_global_232m`) directly, without generated color blending or synthetic globe relief. The displayed texture is a 2048 × 1024 overview, not the full native-resolution dataset. Source: [NASA Mars Trek API](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars). The imagery status distinguishes loading, base-map fallback, full overview, and failure. The live globe remains a simplified sphere; surface exploration sites are still procedural demos.
