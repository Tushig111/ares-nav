> Historical source-library report. Superseded by SCIENTIFIC-GIS.md in this build.

# Eight Mars science categories: implementation status

The Layers panel now offers eight consistently styled source cards with instrument ownership, resolution/coverage guidance, implementation status and decision limits. This is a source-access library, not eight newly validated scientific raster overlays.

- Topography: existing official MOLA hillshade display button. Numerical MOLA/HRSC DEM, altitude sampling and contour generation remain unimplemented.
- Slope: NASA Trek regional CTX slope product metadata links; current A* uses synthetic terrain. No measured slope or safety classification has been integrated.
- Temperature: official NASA Odyssey instrument resource. Calibrated THEMIS temperature raster remains unimplemented. Thermal inertia and IR mosaic brightness are not temperature.
- Minerals: NASA MRO CRISM reference. CRISM/OMEGA spectral cubes or abundance products remain unimplemented; OMEGA and HRSC are ESA instruments.
- Ice: NASA/JPL published SWIM resource. Georeferenced ice-consistency raster remains unimplemented; hydrogen is not a uniquely local ice measurement.
- Dust: official USGS MARCI PDS archive. Numerical opacity raster and date selection remain unimplemented; MARCI images alone are not tau.
- Traverse: NASA Curiosity and Perseverance location-map links; existing user pins and synthetic EVA routes remain available. Actual mission traverse geometry is not imported.
- Obstacles: official NASA HiRISE resource plus existing explicitly synthetic A* demonstration. Actual boulder detections remain unimplemented.

The seven source-access categories are deliberately not presented as enabled observation overlays. Completing those requires selected calibrated products, units/no-data masks, native projection/footprint registration, timestamps, legends and independent validation. Same styling does not imply equal scientific resolution or certainty. No NASA approval or endorsement is claimed.

Sources reviewed 2026-11-15: links and exact availability are stored in data/mars-eight-layers.json. Existing USGS geology overlays remain fully usable; see GEOLOGY-SOURCES.md for their derivation. Existing mission verification reports are historical; only the source-library and unchanged-asset checks below concern this upgrade.
