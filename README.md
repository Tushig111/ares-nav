# ARES-NAV

Mars exploration demo using verified NASA archive imagery with explicitly synthetic local terrain, spectra, weather and EVA scenarios. Read [SOURCE-INTEGRITY.md](SOURCE-INTEGRITY.md) before presenting scientific claims.

Run from this extracted folder:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000/ and choose Start Muted or Start with Audio. On macOS, `Start ARES.command` can start the included server. Do not open index.html directly with file://.

Deploy the contents of this folder to the root of the GitHub Pages publishing branch. No bundler, API secret or server backend is needed. The public NASA DEMO_KEY is rate limited; DONKI failures are shown as unavailable, not invented readings.

Use the persistent DATA button for provenance, site context, official catalog links, historical weather references and DONKI retrieval status. Existing launch/audio, particles, four sites, astronaut POV, geodesic measurements, survival demo and AR features remain available.

## Projection upgrade

Use the upper-left **Global globe** control to choose Global, North Pole or South Pole. Polar maps use a true orthographic matrix and the same spherical meshes and imagery cache. Scroll/pinch or use +/− to zoom; drag to pan. Global restores the previous perspective pose. Selecting a site or entering surface mode restores perspective. Polar map scale is explicitly a projected-plane scale, not a uniform surface-distance scale.

See [PERFORMANCE.md](PERFORMANCE.md) for measured results and test limits. All existing source-integrity limitations still apply: Mars Trek imagery is observational; local weather/physiology/spectra remain explicitly simulated. DONKI is an independent event catalog. The CTX endpoint is NASA-advertised on an external ArcGIS hostname.

## Final rover and launch controls

Open **Explore + Measure → Rovers + MAV demonstration**. Choose Gale for Curiosity or Jezero for Perseverance, then use **Inspect rover**. Clean/dusty switching is available for Curiosity. **Launch MAV demo** runs a procedural educational launch with 3.72 m/s² downward gravity and assumed thrust. No MAV GLB was provided. See [FINAL-VERIFICATION.md](FINAL-VERIFICATION.md) for asset provenance, scale, AR device-testing limits and deployment details.

## Four projections

The map selector now includes **Global Map (Rectangle)**: a full 2:1 longitude/latitude map using the same quadtree and texture cache. All orthographic modes support zoom up to 32768× and pan; available tiles refine through CTX L11. Choose a projection, then scroll/pinch or use +/−. See [MAP-PROJECTIONS.md](MAP-PROJECTIONS.md) for validation and source-coverage limits.
