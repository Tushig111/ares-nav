# Local layer visibility fix

Enabling a local demonstration previously left the camera showing the entire planet. The ~2.5 km footprint was too small to see and could be on the far side. The renderer was generating geometry, but the UI did not bring its coverage into view.

Enabling a local layer in orbital mode now pauses automatic motion and focuses the selected study-site footprint. Each layer also has a View layer on map button and a visible ON indicator. Focus uses actual footprint size, perspective camera magnification on the globe and orthographic zoom on flat/polar views; it does not expand synthetic coverage across Mars. Enabling a layer on the surface retains the current surface view. The Whole globe button resets magnification and restores global navigation. Entering a surface mode clears inspection magnification.

The imagery renderer's LOD and perspective HUD scale calculation now account for camera.zoom, keeping detail selection and the scale bar consistent with the focused view. Ordinary POI flights restore normal perspective magnification. Existing science labels and confidence limits remain unchanged.

Tests: tests/layer-visibility.html checks minimum projected footprint size, viewport fit, motion pause, zoom-aware LOD, whole-globe recovery, ordinary POI behavior, rectangle inspection and surface-mode reset. The existing 41 GIS checks were rerun. Browser inspection confirmed that enabling Slope produces a visible colored local patch over the globe with no console warning/error observed. These are local synthetic demonstrations; they do not provide global measured slope, mineral, thermal, ice or atmospheric maps.

The preservation report in data/scientific-gis-preservation.json describes the preceding GIS build. This fix intentionally changes projections.js, camera-zoom LOD math, the perspective scale HUD and manager focus behavior. Rover models, shaders, AR, EVA/A* algorithms and scientific datasets are unchanged.
