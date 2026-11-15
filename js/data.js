// Official archive imagery is separate from explicitly synthetic local models.
export const SITES = [
  {
    "id": 0,
    "name": "Gale Crater · Bradbury landing anchor",
    "shortName": "Bradbury / Gale",
    "coords": "4.5895° S, 137.4417° E",
    "chladni": [
      3,
      7
    ],
    "baseElevM": -4120,
    "thermalInertia": 385,
    "nominalRad": 0.64,
    "stormRad": 3.85,
    "weather": {
      "tempC": -23,
      "minTempC": -79,
      "pressurePa": 785,
      "windMs": 7.4,
      "windDir": "WNW",
      "tau": 0.48,
      "uv": "Moderate",
      "station": "SIMULATED weather · REMS/MEDA archives are references only"
    },
    "nasaPhotos": [
      {
        "pia": "PIA26551",
        "sol": "Archive image · acquisition details in catalog",
        "cam": "NASA Photojournal · processed archive product",
        "url": "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia26/pia26551/PIA26551.jpg?w=1280&fit=clip",
        "caption": "Curiosity Looks Downslope From the Sulfate Unit - NASA Science. Regional Gale / Mount Sharp context. Anchor is Bradbury Landing, not the photographed outcrop. Not co-registered to the demo waypoint.",
        "sourceURL": "https://science.nasa.gov/photojournal/curiosity-looks-downslope-from-the-sulfate-unit/",
        "productKind": "Processed Photojournal product; no raw PDS product identity asserted",
        "rawGalleryURL": "https://mars.nasa.gov/msl/multimedia/raw-images/",
        "pdsProductId": null
      },
      {
        "pia": "PIA26552",
        "sol": "Archive image · acquisition details in catalog",
        "cam": "NASA Photojournal · processed archive product",
        "url": "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia26/pia26552/PIA26552.jpg?w=1280&fit=clip",
        "caption": "Curiosity on the Road to Boxwork Formations - NASA Science. Regional Gale / Mount Sharp context. Anchor is Bradbury Landing, not the photographed outcrop. Not co-registered to the demo waypoint.",
        "sourceURL": "https://science.nasa.gov/photojournal/curiosity-on-the-road-to-boxwork-formations/",
        "productKind": "Processed Photojournal product; no raw PDS product identity asserted",
        "rawGalleryURL": "https://mars.nasa.gov/msl/multimedia/raw-images/",
        "pdsProductId": null
      },
      {
        "pia": "PIA26632",
        "sol": "Archive image · acquisition details in catalog",
        "cam": "NASA Photojournal · processed archive product",
        "url": "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia26/pia26632/PIA26632.jpg?w=1280&fit=clip",
        "caption": "Curiosity Captures Mars Landscape While Talking to an Orbiter - NASA Science. Regional Gale / Mount Sharp context. Anchor is Bradbury Landing, not the photographed outcrop. Not co-registered to the demo waypoint.",
        "sourceURL": "https://science.nasa.gov/photojournal/curiosity-captures-mars-landscape-while-talking-to-an-orbiter/",
        "productKind": "Processed Photojournal product; no raw PDS product identity asserted",
        "rawGalleryURL": "https://mars.nasa.gov/msl/multimedia/raw-images/",
        "pdsProductId": null
      },
      {
        "pia": "PIA26367",
        "sol": "Archive image · acquisition details in catalog",
        "cam": "NASA Photojournal · processed archive product",
        "url": "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia26/pia26367/PIA26367.jpg?w=1280&fit=clip",
        "caption": "Curiosity Views Gediz Vallis Channel - NASA Science. Regional Gale / Mount Sharp context. Anchor is Bradbury Landing, not the photographed outcrop. Not co-registered to the demo waypoint.",
        "sourceURL": "https://science.nasa.gov/photojournal/curiosity-views-gediz-vallis-channel/",
        "productKind": "Processed Photojournal product; no raw PDS product identity asserted",
        "rawGalleryURL": "https://mars.nasa.gov/msl/multimedia/raw-images/",
        "pdsProductId": null
      }
    ],
    "lat": -4.5895,
    "lon": 137.4417,
    "seed": 11.4,
    "roughness": 1,
    "wmtsTile": {
      "z": 2,
      "row": 2,
      "col": 7
    },
    "demoLabel": "CHLADNI (n=3, m=7) · Aeolis Mons Sulfate & Polygonal Boxwork Lattice",
    "mineralName": "Hydrated minerals: regional context only",
    "instrument": "Curiosity instrument context",
    "brief": "Regional Gale / Mount Sharp context. Anchor is Bradbury Landing, not the photographed outcrop. All local terrain, waypoints, weather, spectra, thermal inertia and radiation numbers are simulated; not operational guidance.",
    "defaultWaypoints": [
      {
        "name": "HAB-01 Pressurized Rover",
        "type": "BASE",
        "tool": "PIXL + SHERLOC",
        "x": -32,
        "z": 28,
        "provenance": "Synthetic local waypoint; not a mapped geologic contact or rover target"
      },
      {
        "name": "WP-1 Sulfate Boxwork Outcrop",
        "type": "SCI",
        "tool": "PIXL X-Ray",
        "x": -12,
        "z": 10,
        "provenance": "Synthetic local waypoint; not a mapped geologic contact or rover target"
      },
      {
        "name": "WP-2 Polygonal Fracture Ridge",
        "type": "SCI",
        "tool": "SHERLOC Raman",
        "x": 10,
        "z": -8,
        "provenance": "Synthetic local waypoint; not a mapped geologic contact or rover target"
      },
      {
        "name": "WP-3 Core Drill Station",
        "type": "CORE",
        "tool": "LIBS-Cam + Drill",
        "x": 30,
        "z": -26,
        "provenance": "Synthetic local waypoint; not a mapped geologic contact or rover target"
      }
    ],
    "provenance": {
      "classification": "Illustrative local scene; official regional archive imagery",
      "anchorNote": "Regional Gale / Mount Sharp context. Anchor is Bradbury Landing, not the photographed outcrop.",
      "mappingReference": "https://www.nasa.gov/wp-content/uploads/2018/09/beyond-earth-tagged.pdf",
      "numericValues": "Synthetic presets; not ingested REMS/MEDA, MOLA DEM, CRISM or RAD measurements",
      "spectralReference": "https://pds-geosciences.wustl.edu/mro/mro-m-crism-3-rdr-targeted-v1/mrocr_2110/document/crism_dpsis.htm",
      "bandsNote": "1.9 µm hydration and ~2.4 µm sulfate-related bands are contextual, not unique mineral identifications. Fe/Mg smectite context includes ~2.3 µm. No calibrated cube, observation ID or pixel co-registration is loaded."
    }
  },
  {
    "id": 1,
    "name": "Jezero Crater · regional fan study",
    "shortName": "Jezero regional study",
    "coords": "18.3800° N, 77.5800° E",
    "chladni": [
      5,
      8
    ],
    "baseElevM": -2540,
    "thermalInertia": 310,
    "nominalRad": 0.61,
    "stormRad": 3.62,
    "weather": {
      "tempC": -19,
      "minTempC": -81,
      "pressurePa": 730,
      "windMs": 9.2,
      "windDir": "ESE",
      "tau": 0.54,
      "uv": "High",
      "station": "SIMULATED weather · REMS/MEDA archives are references only"
    },
    "nasaPhotos": [
      {
        "pia": "PIA26231",
        "sol": "Archive image · acquisition details in catalog",
        "cam": "NASA Photojournal · processed archive product",
        "url": "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia26/pia26231/PIA26231.jpg?w=1280&fit=clip",
        "caption": "1,000 Days of Perseverance - NASA Science. Approximate inherited study anchor; not a surveyed western fan contact or current rover position. USGS SIM 3464 provides regional geologic context at 1:75,000. Not co-registered to the demo waypoint.",
        "sourceURL": "https://science.nasa.gov/photojournal/1000-days-of-perseverance/",
        "productKind": "Processed Photojournal product; no raw PDS product identity asserted",
        "rawGalleryURL": "https://mars.nasa.gov/mars2020/multimedia/raw-images/",
        "pdsProductId": null
      },
      {
        "pia": "PIA25690",
        "sol": "Archive image · acquisition details in catalog",
        "cam": "NASA Photojournal · processed archive product",
        "url": "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia25/pia25690/PIA25690.jpg?w=1280&fit=clip",
        "caption": "Perseverance's Rock Core From 'Berea' Outcrop - NASA Science. Approximate inherited study anchor; not a surveyed western fan contact or current rover position. USGS SIM 3464 provides regional geologic context at 1:75,000. Not co-registered to the demo waypoint.",
        "sourceURL": "https://science.nasa.gov/photojournal/perseverances-rock-core-from-berea-outcrop/",
        "productKind": "Processed Photojournal product; no raw PDS product identity asserted",
        "rawGalleryURL": "https://mars.nasa.gov/mars2020/multimedia/raw-images/",
        "pdsProductId": null
      },
      {
        "pia": "PIA26370",
        "sol": "Archive image · acquisition details in catalog",
        "cam": "NASA Photojournal · processed archive product",
        "url": "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia26/pia26370/PIA26370.jpg?w=1280&fit=clip",
        "caption": "Mastcam-Z Views 'Leopard Spots' in Perseverance's Drill Bit - NASA Science. Approximate inherited study anchor; not a surveyed western fan contact or current rover position. USGS SIM 3464 provides regional geologic context at 1:75,000. Not co-registered to the demo waypoint.",
        "sourceURL": "https://science.nasa.gov/photojournal/mastcam-z-views-leopard-spots-in-perseverances-drill-bit/",
        "productKind": "Processed Photojournal product; no raw PDS product identity asserted",
        "rawGalleryURL": "https://mars.nasa.gov/mars2020/multimedia/raw-images/",
        "pdsProductId": null
      },
      {
        "pia": "PIA26335",
        "sol": "Archive image · acquisition details in catalog",
        "cam": "NASA Photojournal · processed archive product",
        "url": "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia26/pia26335/PIA26335.jpg?w=1280&fit=clip",
        "caption": "Perseverance's View of Neretva Vallis River Channel - NASA Science. Approximate inherited study anchor; not a surveyed western fan contact or current rover position. USGS SIM 3464 provides regional geologic context at 1:75,000. Not co-registered to the demo waypoint.",
        "sourceURL": "https://science.nasa.gov/photojournal/perseverances-view-of-neretva-vallis-river-channel/",
        "productKind": "Processed Photojournal product; no raw PDS product identity asserted",
        "rawGalleryURL": "https://mars.nasa.gov/mars2020/multimedia/raw-images/",
        "pdsProductId": null
      }
    ],
    "lat": 18.38,
    "lon": 77.58,
    "seed": 27.9,
    "roughness": 0.88,
    "wmtsTile": {
      "z": 2,
      "row": 1,
      "col": 5
    },
    "demoLabel": "CHLADNI (n=5, m=8) · Stepped Fan Delta, Neretva Vallis & Belva Crater",
    "mineralName": "Smectite / carbonate: regional context only",
    "instrument": "Perseverance instrument context",
    "brief": "Approximate inherited study anchor; not a surveyed western fan contact or current rover position. USGS SIM 3464 provides regional geologic context at 1:75,000. All local terrain, waypoints, weather, spectra, thermal inertia and radiation numbers are simulated; not operational guidance.",
    "defaultWaypoints": [
      {
        "name": "Jezero Sample Depot Base",
        "type": "BASE",
        "tool": "RIMFAX Radar",
        "x": -34,
        "z": 24,
        "provenance": "Synthetic local waypoint; not a mapped geologic contact or rover target"
      },
      {
        "name": "WP-1 Marginal Carbonate Rim",
        "type": "SCI",
        "tool": "SHERLOC UV",
        "x": -8,
        "z": 12,
        "provenance": "Synthetic local waypoint; not a mapped geologic contact or rover target"
      },
      {
        "name": "WP-2 Smectite Mudstone Lobe",
        "type": "SCI",
        "tool": "PIXL Micro-XRF",
        "x": 14,
        "z": -6,
        "provenance": "Synthetic local waypoint; not a mapped geologic contact or rover target"
      },
      {
        "name": "WP-3 Neretva Vallis Core",
        "type": "CORE",
        "tool": "LIBS-Cam + Core",
        "x": 32,
        "z": -24,
        "provenance": "Synthetic local waypoint; not a mapped geologic contact or rover target"
      }
    ],
    "provenance": {
      "classification": "Illustrative local scene; official regional archive imagery",
      "anchorNote": "Approximate inherited study anchor; not a surveyed western fan contact or current rover position. USGS SIM 3464 provides regional geologic context at 1:75,000.",
      "mappingReference": "https://pubs.usgs.gov/publication/sim3464",
      "numericValues": "Synthetic presets; not ingested REMS/MEDA, MOLA DEM, CRISM or RAD measurements",
      "spectralReference": "https://pds-geosciences.wustl.edu/mro/mro-m-crism-3-rdr-targeted-v1/mrocr_2110/document/crism_dpsis.htm",
      "bandsNote": "1.9 µm hydration and ~2.4 µm sulfate-related bands are contextual, not unique mineral identifications. Fe/Mg smectite context includes ~2.3 µm. No calibrated cube, observation ID or pixel co-registration is loaded."
    }
  },
  {
    "id": 2,
    "name": "Melas Chasma · regional study",
    "shortName": "Melas context",
    "coords": "9.8000° S, 283.6000° E",
    "chladni": [
      4,
      9
    ],
    "baseElevM": -4850,
    "thermalInertia": 440,
    "nominalRad": 0.4,
    "stormRad": 1.92,
    "weather": {
      "tempC": -11,
      "minTempC": -72,
      "pressurePa": 960,
      "windMs": 14.8,
      "windDir": "ENE",
      "tau": 0.68,
      "uv": "Low (Shielded)",
      "station": "SIMULATED weather · REMS/MEDA archives are references only"
    },
    "nasaPhotos": [
      {
        "pia": "PIA23817",
        "sol": "Archive image · acquisition details in catalog",
        "cam": "NASA Photojournal · processed archive product",
        "url": "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia23/pia23817/PIA23817.jpg?w=1280&fit=clip",
        "caption": "Melas Chasma - NASA Science. Regional canyon imagery; local terrain, shelter and route are illustrative. Coprates image is neighboring regional context. Not co-registered to the demo waypoint.",
        "sourceURL": "https://science.nasa.gov/photojournal/pj-melas-chasma-15/",
        "productKind": "Processed Photojournal product; no raw PDS product identity asserted",
        "rawGalleryURL": null,
        "pdsProductId": null
      },
      {
        "pia": "PIA13055",
        "sol": "Archive image · acquisition details in catalog",
        "cam": "NASA Photojournal · processed archive product",
        "url": "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia13/pia13055/PIA13055.jpg?w=1280&fit=clip",
        "caption": "Melas Chasma - NASA Science. Regional canyon imagery; local terrain, shelter and route are illustrative. Coprates image is neighboring regional context. Not co-registered to the demo waypoint.",
        "sourceURL": "https://science.nasa.gov/photojournal/pj-melas-chasma-4/",
        "productKind": "Processed Photojournal product; no raw PDS product identity asserted",
        "rawGalleryURL": null,
        "pdsProductId": null
      },
      {
        "pia": "PIA19782",
        "sol": "Archive image · acquisition details in catalog",
        "cam": "NASA Photojournal · processed archive product",
        "url": "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia19/pia19782/PIA19782.jpg?w=1280&fit=clip",
        "caption": "Melas Chasma - NASA Science. Regional canyon imagery; local terrain, shelter and route are illustrative. Coprates image is neighboring regional context. Not co-registered to the demo waypoint.",
        "sourceURL": "https://science.nasa.gov/photojournal/pj-melas-chasma-13/",
        "productKind": "Processed Photojournal product; no raw PDS product identity asserted",
        "rawGalleryURL": null,
        "pdsProductId": null
      },
      {
        "pia": "PIA22000",
        "sol": "Archive image · acquisition details in catalog",
        "cam": "NASA Photojournal · processed archive product",
        "url": "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia22/pia22000/PIA22000.jpg?w=1280&fit=clip",
        "caption": "Investigating Mars: Coprates Chasma - NASA Science. Regional canyon imagery; local terrain, shelter and route are illustrative. Coprates image is neighboring regional context. Not co-registered to the demo waypoint.",
        "sourceURL": "https://science.nasa.gov/photojournal/investigating-mars-coprates-chasma-10/",
        "productKind": "Processed Photojournal product; no raw PDS product identity asserted",
        "rawGalleryURL": null,
        "pdsProductId": null
      }
    ],
    "lat": -9.8,
    "lon": -76.4,
    "seed": 43.2,
    "roughness": 1.25,
    "wmtsTile": {
      "z": 2,
      "row": 2,
      "col": 2
    },
    "demoLabel": "CHLADNI (n=4, m=9) · 7km Deep Tectonic Graben & Sulfate ILD Mesas",
    "mineralName": "Hydration: illustrative study target",
    "instrument": "Orbital image context",
    "brief": "Regional canyon imagery; local terrain, shelter and route are illustrative. Coprates image is neighboring regional context. All local terrain, waypoints, weather, spectra, thermal inertia and radiation numbers are simulated; not operational guidance.",
    "defaultWaypoints": [
      {
        "name": "Melas Chasma Shelter HAB",
        "type": "BASE",
        "tool": "RIMFAX Subsurface",
        "x": -30,
        "z": 30,
        "provenance": "Synthetic local waypoint; not a mapped geologic contact or rover target"
      },
      {
        "name": "WP-1 Kieserite ILD Bench",
        "type": "SCI",
        "tool": "LIBS-Cam Spectral",
        "x": -10,
        "z": 6,
        "provenance": "Synthetic local waypoint; not a mapped geologic contact or rover target"
      },
      {
        "name": "WP-2 Tectonic Fault Scarp",
        "type": "SCI",
        "tool": "PIXL Elemental",
        "x": 12,
        "z": -12,
        "provenance": "Synthetic local waypoint; not a mapped geologic contact or rover target"
      },
      {
        "name": "WP-3 Deep Basin Core Drill",
        "type": "CORE",
        "tool": "RIMFAX + Drill",
        "x": 28,
        "z": -28,
        "provenance": "Synthetic local waypoint; not a mapped geologic contact or rover target"
      }
    ],
    "provenance": {
      "classification": "Illustrative local scene; official regional archive imagery",
      "anchorNote": "Regional canyon imagery; local terrain, shelter and route are illustrative. Coprates image is neighboring regional context.",
      "mappingReference": "https://mars.nasa.gov/files/m2020/SDT_Appendices_Final_v6.pdf",
      "numericValues": "Synthetic presets; not ingested REMS/MEDA, MOLA DEM, CRISM or RAD measurements",
      "spectralReference": "https://pds-geosciences.wustl.edu/mro/mro-m-crism-3-rdr-targeted-v1/mrocr_2110/document/crism_dpsis.htm",
      "bandsNote": "1.9 µm hydration and ~2.4 µm sulfate-related bands are contextual, not unique mineral identifications. Fe/Mg smectite context includes ~2.3 µm. No calibrated cube, observation ID or pixel co-registration is loaded."
    }
  },
  {
    "id": 3,
    "name": "Olympus Mons · volcanic context",
    "shortName": "Olympus context",
    "coords": "18.6500° N, 226.2000° E",
    "chladni": [
      6,
      11
    ],
    "baseElevM": 8420,
    "thermalInertia": 520,
    "nominalRad": 0.06,
    "stormRad": 0.28,
    "weather": {
      "tempC": -64,
      "minTempC": -108,
      "pressurePa": 185,
      "windMs": 5.2,
      "windDir": "SSW",
      "tau": 0.22,
      "uv": "SIMULATED sheltered scenario",
      "station": "SIMULATED weather · REMS/MEDA archives are references only"
    },
    "nasaPhotos": [
      {
        "pia": "PIA26305",
        "sol": "Archive image · acquisition details in catalog",
        "cam": "NASA Photojournal · processed archive product",
        "url": "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia26/pia26305/PIA26305.jpg?w=1280&fit=clip",
        "caption": "Odyssey's THEMIS Views Olympus Mons - NASA Science. Regional volcano imagery. Cavern and lava-tube scenes are concepts, not verified cave locations. Not co-registered to the demo waypoint.",
        "sourceURL": "https://science.nasa.gov/photojournal/odysseys-themis-views-olympus-mons/",
        "productKind": "Processed Photojournal product; no raw PDS product identity asserted",
        "rawGalleryURL": null,
        "pdsProductId": null
      },
      {
        "pia": "PIA23297",
        "sol": "Archive image · acquisition details in catalog",
        "cam": "NASA Photojournal · processed archive product",
        "url": "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia23/pia23297/PIA23297.jpg?w=1280&fit=clip",
        "caption": "Olympus Mons - NASA Science. Regional volcano imagery. Cavern and lava-tube scenes are concepts, not verified cave locations. Not co-registered to the demo waypoint.",
        "sourceURL": "https://science.nasa.gov/photojournal/pj-olympus-mons-22/",
        "productKind": "Processed Photojournal product; no raw PDS product identity asserted",
        "rawGalleryURL": null,
        "pdsProductId": null
      },
      {
        "pia": "PIA25476",
        "sol": "Archive image · acquisition details in catalog",
        "cam": "NASA Photojournal · processed archive product",
        "url": "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia25/pia25476/PIA25476.jpg?w=1280&fit=clip",
        "caption": "Olympus Mons - NASA Science. Regional volcano imagery. Cavern and lava-tube scenes are concepts, not verified cave locations. Not co-registered to the demo waypoint.",
        "sourceURL": "https://science.nasa.gov/photojournal/pj-olympus-mons-25/",
        "productKind": "Processed Photojournal product; no raw PDS product identity asserted",
        "rawGalleryURL": null,
        "pdsProductId": null
      },
      {
        "pia": "PIA14162",
        "sol": "Archive image · acquisition details in catalog",
        "cam": "NASA Photojournal · processed archive product",
        "url": "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia14/pia14162/PIA14162.jpg?w=1280&fit=clip",
        "caption": "Olympus Mons Flows - NASA Science. Regional volcano imagery. Cavern and lava-tube scenes are concepts, not verified cave locations. Not co-registered to the demo waypoint.",
        "sourceURL": "https://science.nasa.gov/photojournal/pj-olympus-mons-flows-3/",
        "productKind": "Processed Photojournal product; no raw PDS product identity asserted",
        "rawGalleryURL": null,
        "pdsProductId": null
      }
    ],
    "lat": 18.65,
    "lon": -133.8,
    "seed": 61.7,
    "roughness": 1.1,
    "wmtsTile": {
      "z": 2,
      "row": 1,
      "col": 1
    },
    "demoLabel": "CHLADNI (n=6, m=11) · Collapsed Basaltic Lava Tube Skylight & Cavern",
    "mineralName": "Volcanic materials: illustrative study target",
    "instrument": "Orbital image context",
    "brief": "Regional volcano imagery. Cavern and lava-tube scenes are concepts, not verified cave locations. All local terrain, waypoints, weather, spectra, thermal inertia and radiation numbers are simulated; not operational guidance.",
    "defaultWaypoints": [
      {
        "name": "Tharsis Pressurized Rover",
        "type": "BASE",
        "tool": "LIBS-Cam Survey",
        "x": -30,
        "z": 26,
        "provenance": "Synthetic local waypoint; not a mapped geologic contact or rover target"
      },
      {
        "name": "WP-1 Basaltic Olivine Flow",
        "type": "SCI",
        "tool": "PIXL Basalt Scan",
        "x": -10,
        "z": 14,
        "provenance": "Synthetic local waypoint; not a mapped geologic contact or rover target"
      },
      {
        "name": "WP-2 Skylight Overhang Rim",
        "type": "SCI",
        "tool": "RIMFAX Cavern Sounder",
        "x": 8,
        "z": -6,
        "provenance": "Synthetic local waypoint; not a mapped geologic contact or rover target"
      },
      {
        "name": "WP-3 Subterranean Ice Probe",
        "type": "CORE",
        "tool": "SHERLOC Volatiles",
        "x": 26,
        "z": -25,
        "provenance": "Synthetic local waypoint; not a mapped geologic contact or rover target"
      }
    ],
    "provenance": {
      "classification": "Illustrative local scene; official regional archive imagery",
      "anchorNote": "Regional volcano imagery. Cavern and lava-tube scenes are concepts, not verified cave locations.",
      "mappingReference": "https://astrogeology.usgs.gov/",
      "numericValues": "Synthetic presets; not ingested REMS/MEDA, MOLA DEM, CRISM or RAD measurements",
      "spectralReference": "https://pds-geosciences.wustl.edu/mro/mro-m-crism-3-rdr-targeted-v1/mrocr_2110/document/crism_dpsis.htm",
      "bandsNote": "1.9 µm hydration and ~2.4 µm sulfate-related bands are contextual, not unique mineral identifications. Fe/Mg smectite context includes ~2.3 µm. No calibrated cube, observation ID or pixel co-registration is loaded."
    }
  }
];
export const LAYERS = [
  {
    "id": "optical",
    "name": "Optical context / procedural surface (SIM)",
    "source": "SIMULATED",
    "color": "#E06D44",
    "active": true,
    "opacity": 1
  },
  {
    "id": "topo",
    "name": "Procedural elevation and slope (SIM, no MOLA DEM)",
    "source": "SIMULATED",
    "color": "#34D399",
    "active": false,
    "opacity": 0.7
  },
  {
    "id": "spectral",
    "name": "Illustrative mineral overlay (SIM, no CRISM cube)",
    "source": "SIMULATED",
    "color": "#38BDF8",
    "active": false,
    "opacity": 0.8
  },
  {
    "id": "thermal",
    "name": "Illustrative thermal overlay (SIM, no THEMIS data)",
    "source": "SIMULATED",
    "color": "#FB7185",
    "active": false,
    "opacity": 0.65
  },
  {
    "id": "radiation",
    "name": "Illustrative radiation overlay (SIM, no measured dose)",
    "source": "SIMULATED",
    "color": "#A78BFA",
    "active": false,
    "opacity": 0.65
  }
];
