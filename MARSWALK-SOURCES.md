# Jezero field-lab source record

ARES-NAV uses the terrain and processed imagery supplied in the team's Marswalk folder. The source folders remain untouched. The field lab is an addition to ARES-NAV; the existing procedural study surfaces and EVA simulations retain their simulation classification.

## Why these products

The Jezero CTX stereo DEM provides numerical elevation, unlike a colored hillshade image. Its matching orthomosaic provides local image context. NASA's historical Perseverance localization snapshot adds a measured mission traverse that can be distinguished from a user's proposed route. This combination supports terrain inspection without portraying synthetic terrain as an orbital measurement.

The authoritative [USGS product description](https://www.usgs.gov/media/images/m20jezerocraterctxdemmosaic20m100jpg) identifies the Jezero DEM as a 20 m/pixel CTX stereo mosaic. The [USGS archive catalog](https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/CTX/index.html) lists the specific elevation and 5 m orthomosaic source files. The downloaded PDS4 label is included as `data/marswalk/source-dem.xml`; it matches the local GeoTIFF's dimensions, projection and pixel size. Product publication year is 2021; observation start/stop dates are not populated in that label.

NASA's [Perseverance location map](https://science.nasa.gov/mission/mars-2020-perseverance/location-map/) explains the mission traverse and image basemaps. Its supplied snapshot contains 708 waypoints, 657 simplified traverse vertices and a final sol 2022. It is historical, not a live rover feed. Original retrieval time was not recorded in Marswalk; ARES-NAV inspection occurred on 2026-11-15.

## What the renderer is showing

- **Elevation:** native source 20 m; Marswalk delivers an 801×801 node-registered grid over an approximately 40.4 km box, about 50.5 m per sample in its local distance model (about 50.60 m in the source projection). Drawing fewer mesh vertices reduces displayed geometry detail further. Interpolation does not create finer measurements.
- **Slope:** calculated from that resampled DEM. It is a numerical interpretation at the chosen differentiation scale, not a measured safety classification. Display relief exaggeration must not change analytical slope or route distances.
- **Wide texture:** a 4096² version of the 5 m CTX orthomosaic, brightness-adjusted and multiplied by elevation-colored hillshade by Marswalk. Delivered spacing is about 9.86 m/pixel before any runtime reduction. The red/brown appearance is visualization color, not calibrated surface color.
- **Detail texture:** NASA Mars2020 HiRISE/CTX map tiles, resampled and tone-matched by Marswalk. The supplied 4096² local texture is approximately 2.02 m/pixel. Its service name contains “25cm”; the supplied downloader used coarser z16 tiles. No 25 cm display claim is warranted. Further runtime reduction must be reported accordingly.
- **Traverse:** original geographic coordinates are retained from Marswalk's simplified NASA snapshot. Draping it on this DEM changes display height; it does not update the rover's original telemetry.
- **Route proposals, resource budgets and survival models:** educational calculations and assumptions. Neither source data nor numerical slope means a route is operationally safe. NASA sourcing is not NASA approval or endorsement.

The two image textures were inherited as processed files. This update verified the described source chain and terrain derivation; it did not reconstruct every image pixel from original radiometrically calibrated products. Missing observation dates remain unknown.

## Coordinate and height conventions

The original DEM's PDS4/GeoTIFF metadata specifies planetocentric latitude, east-positive longitude and an equirectangular projection on a 3396190 m Mars sphere, standard parallel 18.4663°N, central meridian 0°. The delivered heightmap is north-up, with rows running north to south and columns west to east. Scene axes are +X east, +Z south, +Y up.

The Marswalk local metric uses a 3389500 m spherical radius and a cosine correction at 18.4447°N. It approximates a tangent plane; it is not a precision survey coordinate system. Positioning uses the delivered geographic bounds rather than Earth Web Mercator. Heights retain source metres. The retrieved PDS4 label does not explicitly specify a vertical datum, so the field lab should describe source DEM elevation rather than inventing an ellipsoid/areoid reference. Scene heights can be relative to the landing sample, with any exaggeration disclosed.

## Reproducible validation

Run from the project root with the original team folder available:

```sh
python3 tools/marswalk_validate.py /path/to/Marswalk
```

The standard-library script reads the original uncompressed GeoTIFF, reconstructs scale-aware bilinear downsampling, and compares all 641,601 supplied height samples. All passed the 0.03 m derivation tolerance; maximum absolute difference was 0.01091 m, with a 0.01822 m quantization increment. This verifies transformation/encoding consistency, not the DEM's physical accuracy.

`validity.bin` stores one byte per height sample: 1 valid, 0 unavailable. The conservative check requires every source pixel contributing to a resampled node to be valid. All nodes in this supplied box passed; none rely on the median-fill fallback in Marswalk's build script. Future source areas must regenerate this mask rather than assuming full coverage.

Machine-readable details and SHA-256 hashes are in `data/marswalk/provenance.json` and `data/marswalk/terrain-validation.json`. The latter records the original source hash, delivered heightmap hash and validity-mask hash.

## ARES-NAV display budget

The final field lab decodes both textures to 2048² (regional ≈19.7 m/pixel, local ≈4.04 m/pixel), and draws a 201² mesh (≈202 m vertex pitch). These are display limits, not native instrument resolution. The full 801² numerical height grid is used for interpolation and slope calculations. One existing WebGL renderer and animation loop are reused; the host scene pauses while the field lab is open. Route grid preparation and A* yield periodically, and subsequent routes reuse the cached grid.
