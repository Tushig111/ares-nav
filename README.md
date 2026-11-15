# Final ARES-NAV + Marswalk integration

Team presentation: [judge Q&A and three-minute demo guide](JUDGES-GUIDE.md).

Open **Jezero field lab ↗** below Explore + Measure. The field lab loads the team's actual Jezero CTX elevation export and processed CTX/HiRISE imagery, with numerical elevation/slope views, a historical Perseverance traverse, terrain-constrained route planning, preview playback and GeoJSON export. **Back to ARES-NAV** restores your current globe or surface view.

ARES-NAV remains the host application. Its globe, four projections, eight GIS demo layers, USGS geology, rovers, particle surfaces, audio, astronaut, original A*, survival demo and AR remain available. The field lab has its own physical kilometre coordinate system so the older synthetic surface assumptions are not applied to measured terrain.

Run `python3 -m http.server 8000` in this folder and open http://localhost:8000/. For GitHub Pages, publish these files at the repository root. Do not double-click index.html; browser ES modules require HTTP(S).

Read [MARSWALK-SOURCES.md](MARSWALK-SOURCES.md) for provenance and [SUBMISSION-VERIFICATION.md](SUBMISSION-VERIFICATION.md) for tests and limitations. Terrain verification checks processing consistency, not centimetre-level physical accuracy. Proposed EVA resource budgets remain simulations, and NASA data does not imply NASA approval.

---

# Layer visibility fix

See [LAYER-VISIBILITY-FIX.md](LAYER-VISIBILITY-FIX.md). Enabling a local layer now focuses its footprint; Whole globe restores the full planet.

# Integrated scientific GIS build

See [SCIENTIFIC-GIS.md](SCIENTIFIC-GIS.md) for current layer status, coordinate conventions, provenance and verification. Eight local demo layers function; official MOLA imagery and USGS geology remain available. Older source-library status reports below describe earlier builds.

# USGS geology upgrade

See [GEOLOGY-SOURCES.md](GEOLOGY-SOURCES.md) for the source chain, scientific rationale and display limits.

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

## Search and navigation update

See [TREK-NAVIGATION.md](TREK-NAVIGATION.md) for the official Gazetteer/catalog snapshots, curated bookmark provenance, four-map controls and measurement reference. The new browser checks are at [tests/trek-navigation.html](tests/trek-navigation.html).

## Mission performance and phone update

See [MISSION-UPGRADE.md](MISSION-UPGRADE.md) for direct LOD requests, visible pins, nearby landmark provenance, audio unlocking, the mobile bottom sheets and verification limits.
