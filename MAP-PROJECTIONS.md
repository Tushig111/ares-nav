# Four projections and orthographic deep zoom

This revision builds on the latest rover/AR version, preserving those features as well as the existing provenance inspector, shaders, astronaut, pathfinder and survival demo. No source URL was changed. The full folder is a static ES-module app; run `python3 -m http.server 8000` and open localhost:8000. For GitHub Pages, copy the folder contents into the publishing root, including models and vendor. The ZIP contains the complete project, not just three replacement modules.

## Rectangle geometry

Global Map (Rectangle) covers longitude −180°..+180° and latitude −90°..+90°. Its world dimensions are 4R × 2R, exactly 2:1. Tile UVs retain north at v=1. This is an equirectangular display, not a Mercator map. Existing quadtree patch geometries are rebuilt as flat grids; the nodes, decoded textures, shader materials, transitions and cache remain shared. Returning to sphere/pole modes rebuilds the spherical geometry without resetting imagery. A flat backing plane replaces the hidden sphere material; atmospheric shells and orbital decorations are hidden only during rectangle mode and restored afterward. Setting the sphere object's visible=false would incorrectly hide its quadtree children, so only its material and unrelated children are hidden.

The rectangle uses true orthographic pan/zoom. Its initial view fits the full map on portrait and landscape viewports. The scale bar is a projected-plane scale, with the equirectangular conversion applied; it is not uniform geodesic surface scale at every latitude. Coordinate picking intersects the plane and converts x/y to longitude/latitude, rejecting points outside the map. Existing measurement graphics are reprojected on mode changes, while distance/area calculations remain spherical geodesy. Vertex markers retain a practical pixel size in orthographic views. Shared views now include projection and orthographic zoom.

## Orthographic LOD

The old angular-size-only estimate and leaf-count cutoff are replaced with projected patch bounds. Cached patch samples account for spherical longitude convergence; rectangle bounds use its actual corners. Culling bypasses spherical horizon tests for the flat map. The center picking ray is intersected with the surface, so panning changes the actual refinement focus rather than leaving it at the pole. Focus-first traversal and request priority admit nearby sibling families before peripheral detail consumes the cache. Orthographic zoom now reaches 32768×, admitting native CTX L7..L11 at suitable view positions.

The cache remains capped at 220 source textures and 12 concurrent requests. Existing all-sibling upload readiness, 220 ms shader fades, parent retention, transparent-CTX underlays and upload scheduling are preserved. Projected sample vectors are cached per patch to avoid allocating them every LOD pass.

## Validation and limits

`data/map4-tests.json` records 46 passing checks: existing geodesy, neural demo, tile-cache, fade and DONKI tests plus rectangle extent and deterministic deep-zoom tests. The deep tests pan north/south orthographic views to ±70° latitude and the rectangle to the Jezero region, then provide successful synthetic tile responses to isolate the renderer. Each reaches actual CTX L11 while enforcing the texture/request ceilings; these tests do not prove real NASA coverage at those locations. Browser geometry tests, real GPU blend checks and the actual-GLB tests are retained under tests/.

CTX is a NASA-advertised external ArcGIS mosaic, not guaranteed full coverage at every coordinate. A missing, failed or transparent tile retains available ancestors; native detail cannot be fabricated. At the exact poles the EQ pyramid converges across many meridians, so a bounded cache may display mixed/coarser LOD rather than thousands of simultaneous L11 wedges. No artificial orthographic level cap remains, but this revision does not claim full native L11 coverage for the entire exact-pole viewport or guarantee zero dropped frames on every device/network.

Viking, CTX, MOLA rendered hillshade and DONKI source links remain unchanged and documented in SOURCE-INTEGRITY.md and the DATA inspector. No measured DEM or live Mars meteorology was added. All existing simulation disclaimers remain applicable. The older performance profile is historical evidence and is not presented as a fresh frame-rate benchmark of this revision.
