# ARES-NAV source integrity

This is a mixed observational-imagery and simulation application. It must not be described as 100% measured NASA telemetry. All numeric local terrain, physiology, weather, spectra, radiation and shelter values remain illustrative and are labeled in the persistent DATA notice and inspector. The application does not ingest a numeric MOLA DEM, calibrated CRISM cube, REMS/MEDA observation table, rover position stream, or measured radiation-dose stream. No model calibration is asserted.

## Verified observational sources

The timestamped `data/source-validation.json` records successful retrieval of the three official NASA WMTS capability documents, their SHA-256 hashes, matrix dimensions, advertised resource URLs, and checks of all 16 NASA Photojournal image previews. Checks establish availability at that time, not permanent uptime or scientific accuracy at every pixel.

- Viking Color: NASA Trek `Mars_Viking_MDIM21_ClrMosaic_global_232m`; native L0–7, 256px. Automatic globe uses color through L6.
- CTX: NASA Trek `CTX_beta01_uncontrolled_5m_Caltech`; native L0–11, 512px. Its capability document advertises `https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer/tile/{TileMatrix}/{TileRow}/{TileCol}`. This is an external hostname advertised by NASA, not a claim that NASA owns arcgis.com. Automatic globe switches at L7; inherited parent imagery stays beneath missing/transparent tiles.
- MOLA shaded relief: NASA Trek `Mars_MGS_MOLA_ClrShade_merge_global_463m`; native L0–7. This is a rendered image, NOT a DEM or source for local slope/elevation.
- Stale THEMIS endpoint is disabled; the thermal overlay is explicitly synthetic. No fabricated replacement endpoint is used.

The globe keeps the prior 220ms sibling fades, parent retention, 12-request ceiling, 220-texture LRU, 45ms LOD, and close-up navigation. Remote outages can prevent additional detail; ancestor retention cannot create data that the archive does not serve.

## Images

All 16 image URLs were replaced with checked NASA Science previews derived from the official Photojournal download links. Catalog pages are linked in the recon card and DATA inspector. Processed Photojournal products are not presented as raw PDS products. Separate raw-gallery links do not imply a matching raw product ID.

PIA26551 is “Curiosity Looks Downslope From the Sulfate Unit”. PIA26231 is “1,000 Days of Perseverance”, an overhead HiRISE traverse map, not a rover-camera panorama. PIA22000 is Coprates regional context, not a precise Melas waypoint photograph. Images are not co-registered to synthetic local waypoints. Failed images show an explicit synthetic-preview message.

## Mapping and spectroscopy

Gale's anchor is Bradbury Landing, not a surveyed Mount Sharp boxwork outcrop. Jezero retains an explicitly approximate regional anchor; USGS SIM 3464 (Sun & Stack, 2020, 1:75,000) is a context reference, not ingested unit polygons. No claim of standards-compliant geologic mapping or CRISM pixel alignment is made.

The 1.9 µm hydration and ~2.4 µm sulfate-related bands are educational context and are not unique proof of magnesium sulfate. Smectite context includes ~2.3 µm. Synthetic Gaussian spectra do not identify minerals at a point. Curiosity and Perseverance instrument context are distinguished; the plot is not a CRISM-to-SHERLOC conversion.

## Weather and SEP

DONKI SEP is requested from api.nasa.gov for an explicit 30-day UTC window. A successful empty response means zero returned catalog events. HTTP errors, malformed responses, timeouts and offline failures mean UNKNOWN event count, not zero. Events are sorted by observation time. The DEMO_KEY can be rate limited. The manual storm switch remains a synthetic scenario, independent of catalog events. DONKI is not a Mars-local SEP detector, surface meteorology feed or dose estimate.

The REMS and MEDA PDS archives are references only. A separate dated NASA/JPL historical MEDA example (February 19, 2021, 718 Pa) is identified as historical. Displayed model values such as 730/785 Pa and tau are not labeled calibrated or live.

## Deployment and validation

Extract this folder and run `python3 -m http.server 8000`; open http://localhost:8000/. Keep the server terminal open. Double-clicking index.html uses file:// and is intentionally blocked with instructions. GitHub Pages serves the same static files, with relative module/asset paths and no build step. Three.js still requires its pinned CDN dependency and imagery requires network availability.

Regression results are stored in `data/regression-results.json`. Browser test pages under `tests/` verify geodesy, cache behavior, zoom transitions and GPU blending; source fetch failure tests are in `tests/official-data-tests.js`. No guarantee is made about third-party uptime, arbitrary browser/driver behavior or actual survival safety.
