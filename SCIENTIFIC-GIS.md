# Scientific layer integration

This build adds a functioning shared layer manager, not new calibrated Mars measurements. It preserves official Viking/CTX/MOLA imagery and the authoritative USGS geology snapshot. All eight local demonstration layers have toggles, independent opacity, legends, provenance and explicit SIM labels. The user authorized clearly labeled simulations where authoritative integration is unavailable. Reference archives may be publicly available while their numerical rasters are not integrated here; these limitations are stated rather than treating archive access as calibrated display support.

## Sources and what actually renders

| Category | Rendered data / origin | Units and confidence | Authoritative reference |
|---|---|---|---|
| Elevation | Existing procedural heights and generated contours; optional official MOLA image | Demo model units; no measured datum. Official hillshade 463 m/px, acquisition date not supplied by tiles | https://fdp.astrogeology.usgs.gov/fdp/mars/ |
| Slope | Existing `getSiteSlopeDeg` model gradient | Model-space degrees, demo thresholds 15/20°; not a certified mobility class | NASA Trek regional CTX slope metadata in existing product catalog: https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars |
| Thermal | Existing terrain shader formula (grade/26×0.65 + featureMask×0.35) | Unitless synthetic proxy; no temperature, thermal inertia or suit heat exposure measurement | https://science.nasa.gov/mission/odyssey/science-instruments/ |
| Mineral | Existing procedural feature mask | SIM mask, no species detections, no quantitative probability | https://science.nasa.gov/mission/mars-reconnaissance-orbiter/science-instruments/ |
| Subsurface ice | Artificial deterministic sin/cos field | Unitless SIM pattern, no depth/abundance measurement | https://www.jpl.nasa.gov/images/pia26046-distribution-of-buried-ice-on-mars/ |
| Dust | Existing weather scenario mapped to a uniform footprint color | Unitless SIM scenario; no optical depth measurement or forecast | https://astrogeology.usgs.gov/search/map/mars_mro_marci_daily_global_weather_maps_pds4_archive |
| Navigation | Original sampled EVA path and waypoints; saved comparison path | SIM path on procedural terrain; original actual rover mission maps linked as external references | https://science.nasa.gov/mission/msl-curiosity/location-map/ and https://science.nasa.gov/mission/mars-2020-perseverance/location-map/ |
| Obstacles | Curvature proxy derived from existing procedural height samples | SIM roughness, no detected boulder inventory or obstacle dimensions | https://marsoweb.nas.nasa.gov/HiRISE/ |

No synthetic field has an original instrument or acquisition date. The original instrument/reference, original product coverage/resolution, rendered model, date availability, display sample spacing, decision limits and source URL are shown separately for each entry. The manifest is `data/mars-eight-layers.json`; it includes reference-product descriptions and separate rendered-dataset classification. HRSC and OMEGA belong to ESA; NASA/USGS/ESA sourcing does not imply agency approval of ARES-NAV.

## Geological classification and mineral confidence

The existing USGS Tanaka et al. (2014) SIM 3292 units, contacts and structural-feature overlays are moved into the common manager without creating another instance. They remain regional interpreted geological mapping at 1:20,000,000 scale. The legend preserves published symbols and approximate/certain/internal contacts. See GEOLOGY-SOURCES.md for the official viewer → web map → feature service → publication chain, reprojection, 0.03° generalization, original attributes, retrieval date and missing geometry handling.

The mineral legend distinguishes: (1) confirmed observations—none loaded; (2) derived interpretations—the separate USGS geological units, not mineral detections; (3) simulated distributions—the existing feature mask. No numerical mineral confidence is supplied or invented. Geological unit color is never converted into a mineral species or water claim.

## Geographic registration

All demo fields share a 65×65 sample grid spanning the existing 104-unit procedural surface (2,496 m at the model's 24 m horizontal scale), spacing 39 m. This is synthetic sampling, not scientific resolution. Values use nearest existing procedural formulas; vertex interpolation smooths display only. The surface mesh uses the original height function and relief factor. A coarse overlay can visually bridge finer terrain; it is not a measured DEM drape.

For orbital display, +X is east and −Z north. Offsets use a spherical local approximation with R=3,389,500 m and cos(site latitude); longitude wraps to −180…180°. This is an explicitly approximate study-site placement, not registration to actual rover terrain. No values are extrapolated beyond the local footprint. The same globe `point` transform provides spherical and rectangular positions; the existing camera provides polar views. Surface heights are relative procedural values. A 18 m vertical/unit scale is used only in route-budget calculations, not an asserted Mars elevation reference. The official USGS overlay retains Mars 2000 sphere geographic angles derived from its native Robinson grid. Base geometry remains a reference sphere.

## Reuse, ownership and mission planning

The original height evaluator, feature mask, weather scenario, sampled route and A* function are adapters into the manager. No second pathfinder or waypoint store is created. Original shader controls are moved into the manager; enabling a managed counterpart disables its matching old overlay, and re-enabling that shader disables the managed counterpart. Original route meshes are shown/hidden by the navigation toggle; orbital route lines represent the same sampled path. Original waypoint editing, pins, EVA, xEMU, rovers, particle shaders, audio and AR remain intact.

Save the current route, run existing A*, and compare distance, ascent, maximum/mean physical demo grade, rough-sample percentage, estimated duration, oxygen budget use and energy. Saved routes clear on site changes. Both paths can be displayed with hazard/mineral fields. Cyan is current, yellow saved; original waypoint markers remain the target controls.

Physical route grades use 24 m horizontal and 18 m vertical scaling. Existing A* grades use model-space gradients, so those numbers differ and both conventions are disclosed. The existing optimizer considers its slope cost; it does not solve boulder avoidance or optimize the resource budget. The comparison reports the resulting route without claiming it is safe or globally optimal. Cost estimates are user-adjustable assumptions: speed 1 m/s, O2 14% of budget/h, energy 300 kcal/h by default. Duration includes illustrative grade and roughness penalties; no suit calibration, validated risk probability or operational planning is claimed.

## Performance and failures

Grid sampling is shared across seven fields, lazy on first enable, chunked over asynchronous tasks and cached until the site, relief or weather changes. At most seven pairs of local overlay meshes are retained; toggling reuses geometry. Geographic geometry rebuilds on projection changes. Transparent materials use a single render pass and avoid depth writes. Route geometry refreshes at 150 ms intervals when waypoints change. Heavy USGS snapshots retain existing on-demand fetch/error handling. No new remote request is made per frame.

Layer-generation failures report status and disable only the affected layer. Original imagery, routes and unrelated tools remain usable. No remote data failure silently relabels a synthetic field as observations. Frame rate is hardware/workload dependent; all eight transparent layers over the full particle/terrain scene are more costly than one layer. No universal 60 FPS claim is made, and no physical mobile AR performance certification is implied.

## Verification

`tests/scientific-gis.html` exercises the actual manager and Three.js geometry with deterministic terrain: 41 checks cover all eight toggles independently, all-on combinations, bounded cache, opacity, geographic corner registration for sphere/rectangle transforms, north/east/dateline conventions and rectangle seam-safe triangles, original terrain height, comparison save/clear, delegation to existing A*, isolated sampling failures, known metric units, zero-length paths, site invalidation and a combined real WebGL render. North/south cases test the shared sphere transform; they are not independent surveyed polar control points.

The real application was also exercised with all eight enabled in Hybrid, and with actual A* before/after comparison. Browser error/warning logs were empty during these checks. Existing mission/geology verification reports are historical and were not all rerun for this update. Models, vendor files, shaders, AR and rover implementations are preserved; cache import tags change in modules only. Reference/source accuracy does not constitute independent validation of synthetic physiology or real Mars traversability.
