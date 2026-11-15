# ARES-NAV: presentation and judge questions

## Our explanation in 45 seconds

ARES-NAV is an educational Mars exploration and mission-planning prototype. It connects global planetary imagery, geological context and interactive measurement with a local Jezero terrain laboratory. We kept ARES-NAV's globe, projections, rovers, astronaut and AR demonstrations, then integrated Marswalk's numerical terrain and historical rover route. Users can inspect elevation and slope, choose a destination and compare a proposed route's distance, ascent and assumed EVA consumption. Every result must be read with its source, resolution and uncertainty. This is not an operational navigation or astronaut safety system.

## Three-minute demonstration

1. **0:00–0:30 — Problem:** a visually attractive map alone cannot explain whether a proposed traverse is supported by measured terrain. State the distinction between source data, derived calculations and simulations.
2. **0:30–1:00 — Global context:** open the globe, demonstrate projection selection, search and USGS geology. Explain that mapped geological units are interpretations, not direct mineral detections.
3. **1:00–2:00 — Evidence:** open **Jezero field lab**, show imagery, elevation and slope. Open Sources & resolution. Toggle the cyan historical Perseverance traverse.
4. **2:00–2:40 — Decision:** choose **Example: landing → nearby rover stop**. Show orange proposed route, distance, ascent, slope and explicit EVA assumptions; preview the traverse and export GeoJSON.
5. **2:40–3:00 — Honesty and next steps:** return to ARES-NAV; explain that astronaut/particle/AR features are demonstrations. Future work needs finer validated terrain, obstacle maps and calibrated operational resource models.

Assign one teammate to the problem and UI, one to data provenance, and one to engineering and limitations. Rehearse with the same device and network used for judging.

## Questions and defensible answers

| Judge question | Answer |
| --- | --- |
| Where does the real terrain come from? | The USGS Mars 2020 Science Investigation CTX DEM mosaic, derived from MRO CTX stereo observations. The official product has 20 m pixels. Our source manifest and bundled PDS label document the chain. |
| Why Jezero? | The supplied Marswalk project contained a georeferenced Jezero DEM and imagery plus a Perseverance traverse snapshot. This gives us a reproducible numerical dataset for a focused demonstration, with NASA mission context. |
| Is everything NASA data? | No. We distinguish NASA/USGS source products, calculations from those products, processed display imagery, and simulations. The eight local host GIS overlays and EVA/survival scenarios contain explicitly synthetic demonstrations. They are not eight validated observation products. |
| Is NASA approving your results? | No. Public NASA/USGS data access is not endorsement, certification or approval. Our team is responsible for the implementation and claims. |
| What is your actual resolution? | The Jezero numerical export is about 50.5 m between samples. The displayed mesh and planning grid are about 202 m. Runtime imagery is about 19.7 m per pixel regionally and 4 m locally. Detailed imagery does not make the DEM equally detailed. |
| How do you calculate slope and routes? | Slope is calculated from physical DEM height differences and horizontal spacing. A* uses a slope-weighted grid, rejects missing coverage and slopes above the demo's 20° threshold, and avoids diagonal corner cutting. The threshold is an application assumption, not a NASA safety standard. |
| Does exaggerated relief change the answer? | No. Relief exaggeration changes display height only; route metrics use the physical numerical elevations. |
| Is the orange route an actual rover traverse? | No. Cyan is a bundled historical Perseverance traverse snapshot; orange is our proposed route. The snapshot is not live rover positioning. |
| Can you detect boulders or safe landing zones? | Not from this regional DEM. Local hazards and operational safety require finer validated data and independent assessment. Existing synthetic obstacle demonstrations are labeled accordingly. |
| Are oxygen and survival numbers validated? | No. The field lab assumes 2.3 km/h walking speed and 12.5 oxygen percentage points per hour. Those are transparent comparison assumptions, not a physiological model. The neural survival feature remains a non-validated demonstration. |
| Are weather readings live at Mars? | DONKI is a space-weather event catalog, not a local Mars weather sensor or forecast. Demo temperature, dust and suit values must not be presented as live REMS/MEDA observations. |
| How did you validate the integration? | 76 recorded terrain/routing, GIS, visibility and failure-recovery checks passed. All 641,601 exported DEM samples were compared with the supplied source raster processing; the maximum encoding discrepancy was 0.01091 m. That small discrepancy measures processing consistency, not real-world DEM accuracy. |
| How do you keep it responsive? | A single WebGL renderer serves both views. The field lab loads on demand, reuses decoded data, downsizes display textures, batches terrain preparation, caches its planning grid and renders on interaction. Actual performance depends on device and network; we do not claim a universal 60 FPS. |
| What did your team build? | The integration, interface, projection and layer coordination, route demonstrations, source labeling, testing and static deployment. NASA/USGS supplied scientific products; Three.js and other credited dependencies supply infrastructure. Credit AI assistance accurately if used under the competition's rules. |

## Source trail to show judges

- [USGS CTX DEM product description](https://www.usgs.gov/media/images/m20jezerocraterctxdemmosaic20m100jpg): 20 m/pixel stereo DEM covering Jezero.
- [NASA Perseverance location map](https://science.nasa.gov/mission/mars-2020-perseverance/location-map/): mission context; our packaged route is a historical snapshot.
- [NASA Mars Trek](https://trek.nasa.gov/mars/): global imagery context.
- [USGS geologic map of Mars, SIM 3292](https://pubs.usgs.gov/sim/3292/): geological interpretation and scale limits.
- [MARSWALK-SOURCES.md](MARSWALK-SOURCES.md), [SCIENTIFIC-GIS.md](SCIENTIFIC-GIS.md), [SUBMISSION-VERIFICATION.md](SUBMISSION-VERIFICATION.md): implementation evidence and remaining limitations.

Do not say “all layers are observations,” “NASA approved,” “live Mars weather,” “centimetre-accurate terrain,” “guaranteed safe route,” or “zero lag on every device.” Explain uncertainty when asked; it is part of scientific integrity.
