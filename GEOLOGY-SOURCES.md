# ARES-NAV: why these geology layers

The orbital Layers button now opens real imagery and the USGS geology overlays. Weather, Science/xEMU and synthetic surface overlays are hidden in orbital mode and retained in Hybrid and Particle modes. No rover assets, terrain shaders, astronaut physics, route solver, audio engine or AR implementation were replaced.

## Source chain

1. User-selected USGS viewer: https://usgs.maps.arcgis.com/apps/webappviewer/index.html?id=fc004c3d21b64c398ed5458580ab7c58
2. Its public configuration identifies web map `87e77dc5c7d94cc792c663394f31de78`.
3. That web map identifies the USGS organization service: https://services.arcgis.com/v01gqwM5QqNysAAi/arcgis/rest/services/Tanaka_et_al_2014_Mars_Global_Map_Features/FeatureServer
4. Publication: Tanaka, K.L., and others, 2014, Geologic map of Mars, USGS Scientific Investigations Map 3292, scale 1:20,000,000. https://doi.org/10.3133/sim3292
5. Original authoritative publication, GIS downloads and map-unit descriptions: https://pubs.usgs.gov/publication/sim3292

These are USGS-authored planetary geological interpretations hosted on Esri ArcGIS, not NASA-authored telemetry. An arcgis.com hostname alone is not proof of government provenance; the official USGS viewer-to-service chain above establishes the source.

## Layer choices and decision limits

| Layer | Service ID | Why display it | What it cannot establish |
|---|---|---|---|
| Geologic units | 3 | Compare mapped regional materials, relative age and geologic history, with the published unit legend | Local mineral concentrations, accessible water, soil bearing strength, or habitability |
| Geologic contacts | 1 | Locate interpreted unit boundaries; preserve certain/approximate/internal line categories | A surveyed boundary or a safe route across a contact |
| Structural features | 2 | Show interpreted channels, crater rims, ridges, scarps and other mapped structures | Current water flow, measured slope or traversability |

A defensible workflow is: use this map to choose a regional science question, compare NASA orbital imagery, then consult higher-resolution calibrated products and mission measurements. A broad geological classification is not an operational survival recommendation. The original USGS web viewer also directs users to the publication for official map products.

## Reproducible processing and limitations

Snapshot retrieved 2026-11-15. Original service coordinates are Robinson projection on a Mars 2000 sphere (radius 3,396,190 m). Queries explicitly request that same sphere's geographic longitude/latitude WKT, never Earth Web Mercator or WGS84. The app places angular coordinates on its existing reference globe; distances elsewhere retain their existing stated reference radius.

All pages were retrieved in OBJECTID order, using the service's pagination flag. Server-side generalization is 0.03 degree; coordinates are rounded to four decimals for this regional display. Every returned attribute is retained. Counts: 1,311 unit records; 3,800 contact records (3,706 drawable, 94 without returned geometry); 3,593 structure records. Missing/generalized-away geometries are not invented or rendered. This is a derived display snapshot, not the lossless source GIS archive.

The browser rasterizes official service colors and line categories into a 4,096 × 2,048 transparent equirectangular display (approximately 5.2 km per pixel at the equator). Eight patches reuse the globe renderer's geometry and projection transform. The same overlays follow globe, rectangle, north and south views. Opacity is user-controlled. Zooming does not increase the scientific resolution of this 1:20-million map. NASA Viking/CTX imagery underneath continues to refine independently. No geology labels claim 5 m map accuracy. Symbols are screen-rendered approximations of the service style, not a facsimile of the printed sheet.

Local snapshots prevent external service outages from silently substituting fabricated geology. Fetch failures are shown visibly and keep base imagery available. The existing synthetic terrain, weather, EVA and neural demos remain explicitly simulated; this upgrade does not validate them scientifically.

The three JSON files include the service URL, publication, retrieval date, coordinate reference, processing notes, renderer legend and source attributes. `tools/fetch_geology.py` reproduces the retrieval from the project root. The original viewer's annotation and historical landing-site layers are not newly imported; existing ARES-NAV search/mission-context tools remain separate.
