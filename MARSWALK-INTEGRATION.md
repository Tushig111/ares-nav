# MARSWALK × ARES-NAV — integrated mission site

This folder is a copy of `ares-nav-mission-ready` with the MARSWALK Jezero mission layer added. The original ARES folder and the
stand-alone MARSWALK site (`../site/`) are untouched.

Run: `python -m http.server 8780` in this folder, open http://localhost:8780, start, then press **MARSWALK Mission** in the top bar
(or pick site 02 and enter 3D Hybrid). Deploy: publish this folder as it is (GitHub Pages root).

## What was added

| Spec item | Where | Notes |
| --- | --- | --- |
| Real Jezero terrain in the ARES 3D view | `js/marswalk-real.js`, hooks in `js/app.js` | USGS CTX DEM (20 m) + CTX image. The 104-unit ARES plane = the 40.4 km mission zone (1 unit ≈ 388 m). Gale, Valles and Olympus stay procedural. |
| Mission setup + random habitat drop | `js/marswalk-mission.js` (`MISSION`, `deployHabitat`) | Centre 18.4447°N 77.4508°E, 20 km radius. Habitat = random cell with slope < 5°, soil/bedrock, no red zone, ≥ 0.4 km from any hazard, outside the 1 km blast zone, and with all three tasks inside the 8 km rover ring (a full-zone random drop was tried: landings 14–18 km out gave 100+ km, 19–21 h plans over every limit). The astronaut waits there until “Start the EVA”; the Location tab shows the site facts. 4 km and 8 km rings are drawn around it. |
| Location tab | `locHtml`, `placeAstronaut` | Site facts for the landing point or for any point you set (click or lat/lon): real elevation and slope, surface class, red zone, distances, shelter, conditions, ML advice. A placed astronaut holds position; “Walk home from here” / “Back to mission plan”. |
| Three human EVA tasks | `TASKS` | Text from “MARSWALK 3 даалгавар.docx”. Markers on the map, task cards, a tab with the full description. |
| Route optimizer, 6 permutations, smart chunking | `tree`, `simulate`, `planFor`, `replan` | Cost-optimal paths on the real 200 m grid (same cost model as the training simulator; red zones impassable). All 6 orders are scored; sorties are split when a single EVA would exceed 7 h, leave < 15 % O₂ or fall below 60 % predicted success. Per-leg distance, time, O₂ and success are shown. |
| Custom waypoints | `addPin`, `movePin`, `removePin` | Drop with ARES “+ Click Terrain to Drop WP”, drag the pink ring, delete with ✕ or right-click. Every change re-plans. A pin in a red zone snaps to the nearest safe cell with a warning. “Reset to optimal route” (also the ARES “Optimize Safe Path (A*)” and “Reset Route” buttons on Jezero). |
| Red zones | `hz`, terrain fragment shader | Red = slope > 20° (real, CTX DEM). Orange = sand traps, purple = sharp-rock fields: **estimated** from the scenario surface class — no THEMIS thermal-inertia grid is ingested. |
| ML decision engine + stress test | `js/marswalk-survival.js`, `liveSample`, `stressTest` | The trained MLP (56→128→64→32→5) runs at every route node and at the astronaut. RANDOM / STRESS TEST injects a dust storm, radiation flare or suit micro-tear, re-plans, and offers to execute the advised action. |
| Conditions panel (from the stand-alone site) | `condHtml`, `setLive`, `randomSituation`, `toggleFamily` | 18 sliders (environment, body, suit), RANDOM, Nominal day and the 9 emergency scenarios from `bRanges.js`. A slider sets the astronaut's current reading; the whole route is re-scored. |
| ML data tab | `modelHtml`, `showSample` | Training size, error per option and ring, the live 56-value input vector, 8 sample training rows (`marswalk/training_data_sample.csv`) and the list of ML files. |
| Honest disclaimer | ⓘ in the mission panel | Simulated probabilities, scenario coordinates, potential (not confirmed) biosignatures, NASA figures and links. |

The astronaut, route tube, pins, POV modes, elevation profile and every other ARES feature are the original ARES code: the mission
planner only hands ARES a list of waypoints.

## Changes to ARES files

- `js/app.js` — about 35 small guarded hooks (`isReal(siteIndex)`): real height/slope/texture for site 1, metres-per-unit and elevation
  read-outs, `via` waypoints without pins, mission callbacks. Other sites follow the original code paths.
- `shaders/terrain.vert.glsl`, `terrain.frag.glsl` — true slope for the real terrain, no procedural strata over real imagery, red-zone texture.
- `index.html` — one stylesheet, three data scripts, the site-02 label.
- New: `js/marswalk-real.js`, `js/marswalk-mission.js`, `js/marswalk-survival.js`, `css/marswalk.css`, `marswalk/` (data).

## Honest limits

- Random habitat: the model was trained with a fixed habitat, so the home-path features and the ring are recomputed for the dropped
  habitat and `landing_km` is replaced by distance to the habitat. This is an approximation.
- O₂, time and walking/driving rates in the planner are simple scenario constants (see `MISSION.rates`).
- Vertical relief is exaggerated (×2 × the ARES relief slider); slopes shown are true.
- Not verified here: real mouse dragging of pins (the move logic was tested through its function), phones, and frame rate.
- ARES documents that describe Jezero as synthetic (`SOURCE-INTEGRITY.md` and the DATA panel text) were written before this change.
