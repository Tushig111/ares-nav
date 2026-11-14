// Curated demonstration presets; values and captions are not verified live observations.
export const SITES = [
  {
    id: 0,
    name: "Gale Crater · Mount Sharp Boxwork Formations",
    shortName: "Mount Sharp Boxwork",
    coords: "4.5895° S, 137.4417° E",
    chladni: [3.0, 7.0],
    baseElevM: -4120,
    thermalInertia: 385,
    nominalRad: 0.64,
    stormRad: 3.85,
    weather: { tempC: -23, minTempC: -79, pressurePa: 785, windMs: 7.4, windDir: "WNW", tau: 0.48, uv: "Moderate", station: "Curiosity REMS · Sol 4447" },
    nasaPhotos: [
      {
        pia: "PIA26551",
        sol: "SOL 4447",
        cam: "NASA MSL MASTCAM · AEOLIS MONS SULFATE UNIT",
        url: "https://d2pn8kiwq2w21t.cloudfront.net/images/jpegPIA26551.width-1024.jpg",
        caption: "Captured by NASA's Curiosity rover on Sol 4447 looking downslope across the lower sulfate-bearing unit of Mount Sharp toward Gale Crater's northern rim. These stratified sulfate beds record the Hesperian climatic transition as ancient Martian lakes evaporated into saline groundwater tables. ChemCam and Mastcam spectroscopy detected polyhydrated magnesium sulfates and halite crusts preserved within the consolidated bedrock."
      },
      {
        pia: "PIA26552",
        sol: "SOL 4452",
        cam: "MASTCAM TELEPHOTO · BOXWORK FRACTURE RIDGES",
        url: "https://d2pn8kiwq2w21t.cloudfront.net/images/jpegPIA26552.width-1024.jpg",
        caption: "Close-up Mastcam reconnaissance of the polygonal 'spiderweb' boxwork ridge network spanning 10–20 km across Mount Sharp. These ridges formed when mineral-rich subsurface groundwater percolated through tectonic cooling fractures, precipitating erosion-resistant calcium/magnesium sulfates and opaline silica cements. Over billions of years, eolian wind abrasion scoured away the softer host mudstone, leaving raised mineral walls that could entomb ancient subsurface organic molecules."
      },
      {
        pia: "PIA26632",
        sol: "SOL 4550",
        cam: "MSL NAVCAM + UHF TGO DOWNLINK · BOXWORK HOLLOWS",
        url: "https://d2pn8kiwq2w21t.cloudfront.net/images/jpegPIA26632.width-1024.jpg",
        caption: "Wide-field Curiosity Navigation Camera mosaic showing polygonal boxwork ridges and wind-scoured inter-ridge hollows below Mishe Mokwa and Texoli buttes. NASA selected this sector because late-stage groundwater circulation through these fracture conduits would have provided a warm, radiation-shielded subsurface habitat long after Mars' surface lakes froze. APXS and PIXL-class X-ray analyses target iron-magnesium ratios along the vein margins."
      },
      {
        pia: "PIA26367",
        sol: "SOL 4210",
        cam: "MSL MASTCAM · GEDIZ VALLIS DEBRIS CHANNEL",
        url: "https://d2pn8kiwq2w21t.cloudfront.net/images/jpegPIA26367.width-1024.jpg",
        caption: "Morning Mastcam panorama illuminating Fascination Turret and Hinman Col inside the Gediz Vallis channel on Mount Sharp. High-energy late-stage debris flows and floods transported blocks from high on upper Mount Sharp down into this incised channel, offering astronauts a natural stratigraphic core sample of the mountain's unattainable upper peaks alongside elemental sulfur nodules."
      }
    ],
    lat: -4.5895,
    lon: 137.4417,
    seed: 11.4,
    roughness: 1.0,
    wmtsTile: { z: 2, row: 2, col: 7 },
    demoLabel: "CHLADNI (n=3, m=7) · Aeolis Mons Sulfate & Polygonal Boxwork Lattice",
    mineralName: "Polyhydrated Magnesium Sulfates (1.9 µm & 2.4 µm) + Opaline Silica",
    instrument: "PIXL + SHERLOC + LIBS-Cam",
    brief: "<strong>Site 01 — Gale Crater: Mount Sharp Boxwork (Aeolis Mons Lower Sulfate Unit, -4,120 m):</strong> Investigated by NASA's <em>Curiosity</em> Rover (2025–2026). Sculpted 3D polygonal mineral-cemented boxwork ridges formed by ancient subsurface groundwater fracturing.",
    defaultWaypoints: [
      { name: "HAB-01 Pressurized Rover", type: "BASE", tool: "PIXL + SHERLOC", x: -32, z: 28 },
      { name: "WP-1 Sulfate Boxwork Outcrop", type: "SCI", tool: "PIXL X-Ray", x: -12, z: 10 },
      { name: "WP-2 Polygonal Fracture Ridge", type: "SCI", tool: "SHERLOC Raman", x: 10, z: -8 },
      { name: "WP-3 Core Drill Station", type: "CORE", tool: "LIBS-Cam + Drill", x: 30, z: -26 }
    ]
  },
  {
    id: 1,
    name: "Jezero Crater · Western Fan Delta & Neretva Vallis",
    shortName: "Jezero Fan Delta",
    coords: "18.3800° N, 77.5800° E",
    chladni: [5.0, 8.0],
    baseElevM: -2540,
    thermalInertia: 310,
    nominalRad: 0.61,
    stormRad: 3.62,
    weather: { tempC: -19, minTempC: -81, pressurePa: 730, windMs: 9.2, windDir: "ESE", tau: 0.54, uv: "High", station: "Perseverance MEDA · Sol 1320" },
    nasaPhotos: [
      {
        pia: "PIA26231",
        sol: "SOL 1000",
        cam: "PERSEVERANCE MASTCAM-Z · JEZERO DELTA FRONT",
        url: "https://d2pn8kiwq2w21t.cloudfront.net/images/jpegPIA26231.width-1024.jpg",
        caption: "Stitched Mastcam-Z natural-color panorama celebrating 1,000 sols of NASA's Perseverance rover across the Jezero Western Fan Delta. Inclined foreset beds prove a sustained river-delta system emptied into a 3.7-billion-year-old crater lake, capped by boulder conglomerates from episodic flash floods. RIMFAX ground-penetrating radar confirmed tilted sedimentary strata extending 20 meters below the delta floor."
      },
      {
        pia: "PIA25690",
        sol: "SOL 750",
        cam: "MASTCAM-Z · BEREA CARBONATE CORE OUTCROP",
        url: "https://d2pn8kiwq2w21t.cloudfront.net/images/jpegPIA25690.width-1024.jpg",
        caption: "Perseverance Mastcam-Z view of the 'Berea' rock core site along the upper fan carbonate unit. Authigenic magnesium-iron carbonates precipitated in the shallow nearshore photic zone of Lake Jezero—an environment on Earth renowned for trapping stromatolitic microbial mats and preserving organic carbon chains detected by SHERLOC deep-UV Raman spectroscopy."
      },
      {
        pia: "PIA26370",
        sol: "SOL 1215",
        cam: "MASTCAM-Z + SHERLOC · CHEYAVA FALLS LEOPARD SPOTS",
        url: "https://d2pn8kiwq2w21t.cloudfront.net/images/jpegPIA26370.width-1024.jpg",
        caption: "High-priority astrobiology discovery at 'Cheyava Falls' in Neretva Vallis: millimeter-scale 'leopard spots' inside a calcium-sulfate-veined red mudstone. PIXL X-ray lithochemistry and SHERLOC Raman scans revealed reaction rims enriched in vivianite (iron phosphate) and greigite (iron sulfide) alongside organic carbon—redox reactions that on Earth frequently serve as metabolic energy sources for subsurface microbes."
      },
      {
        pia: "PIA26335",
        sol: "SOL 1178",
        cam: "MASTCAM-Z 56-FRAME MOSAIC · NERETVA VALLIS CHANNEL",
        url: "https://d2pn8kiwq2w21t.cloudfront.net/images/jpegPIA26335.width-1024.jpg",
        caption: "Downstream panorama of the ancient Neretva Vallis river channel that breached Jezero Crater's western rim. Light-toned outcrops of the 'Bright Angel' formation expose ancient channel-floor mudstones and fluvial conglomerates, selected by NASA as the primary cache target for Mars Sample Return and human EVA core drilling."
      }
    ],
    lat: 18.3800,
    lon: 77.5800,
    seed: 27.9,
    roughness: 0.88,
    wmtsTile: { z: 2, row: 1, col: 5 },
    demoLabel: "CHLADNI (n=5, m=8) · Stepped Fan Delta, Neretva Vallis & Belva Crater",
    mineralName: "Fe/Mg Smectite Clays (2.30 µm band) & Hydrated Magnesium Carbonates",
    instrument: "SHERLOC + PIXL + RIMFAX",
    brief: "<strong>Site 02 — Jezero Crater: Western Fan Delta &amp; Neretva Vallis (-2,540 m):</strong> NASA <em>Perseverance</em> Rover depot. 3D stepped river delta lobe incised by the Neretva Vallis inflow channel and Belva impact crater.",
    defaultWaypoints: [
      { name: "Jezero Sample Depot Base", type: "BASE", tool: "RIMFAX Radar", x: -34, z: 24 },
      { name: "WP-1 Marginal Carbonate Rim", type: "SCI", tool: "SHERLOC UV", x: -8, z: 12 },
      { name: "WP-2 Smectite Mudstone Lobe", type: "SCI", tool: "PIXL Micro-XRF", x: 14, z: -6 },
      { name: "WP-3 Neretva Vallis Core", type: "CORE", tool: "LIBS-Cam + Core", x: 32, z: -24 }
    ]
  },
  {
    id: 2,
    name: "Valles Marineris · Melas Chasma Layered Floor",
    shortName: "Melas Chasma Canyon",
    coords: "9.8000° S, 283.6000° E",
    chladni: [4.0, 9.0],
    baseElevM: -4850,
    thermalInertia: 440,
    nominalRad: 0.40,
    stormRad: 1.92,
    weather: { tempC: -11, minTempC: -72, pressurePa: 960, windMs: 14.8, windDir: "ENE", tau: 0.68, uv: "Low (Shielded)", station: "MRO MCS + Canyon Sounder" },
    nasaPhotos: [
      {
        pia: "PIA23817",
        sol: "ORBIT 68420",
        cam: "MARS ODYSSEY THEMIS VIS · MELAS CHASMA GRABEN",
        url: "https://d2pn8kiwq2w21t.cloudfront.net/images/jpegPIA23817.width-1024.jpg",
        caption: "NASA Mars Odyssey THEMIS image of Melas Chasma, the widest segment of Valles Marineris plunging up to 9,000 meters below the surrounding Tharsis plateau. At -4,850 m elevation, the dense atmospheric column (960 Pa) and towering canyon walls provide 38% natural shielding against Galactic Cosmic Rays, making it a prime human base zone."
      },
      {
        pia: "PIA13055",
        sol: "ORBIT 36100",
        cam: "THEMIS VIS · INTERIOR LAYERED DEPOSITS (ILDs)",
        url: "https://d2pn8kiwq2w21t.cloudfront.net/images/jpegPIA13055.width-1024.jpg",
        caption: "Finely laminated Interior Layered Deposits (ILDs) and wind-fluted yardangs on the floor of Melas Chasma. CRISM hyperspectral mapping identified monohydrated kieserite and polyhydrated sulfates containing up to 15 wt% chemically bound water—an invaluable in-situ resource utilization (ISRU) water supply for human EVA crews."
      },
      {
        pia: "PIA19782",
        sol: "ORBIT 59210",
        cam: "THEMIS VIS · TECTONIC FAULT SCARPS & DUNES",
        url: "https://d2pn8kiwq2w21t.cloudfront.net/images/jpegPIA19782.width-1024.jpg",
        caption: "Steep normal-fault scarps and dark basaltic barchan dune fields along the Melas Chasma trough floor. Crustal extension driven by the Tharsis volcanic rise fractured the Noachian basement, exposing kilometers of deep crustal stratigraphy and hydrothermal alteration veins accessible to astronaut traverses."
      },
      {
        pia: "PIA22000",
        sol: "ORBIT 64110",
        cam: "THEMIS VIS · COPRATES–MELAS RIFT TRANSITION",
        url: "https://d2pn8kiwq2w21t.cloudfront.net/images/jpegPIA22000.width-1024.jpg",
        caption: "Regional canyon floor stratigraphy where Melas Chasma merges into Coprates Chasma. RIMFAX-class subsurface radar sounding targets buried paleolake evaporite beds and perchlorate-brine aquifers trapped beneath protective landslide talus aprons."
      }
    ],
    lat: -9.8000,
    lon: -76.4000,
    seed: 43.2,
    roughness: 1.25,
    wmtsTile: { z: 2, row: 2, col: 2 },
    demoLabel: "CHLADNI (n=4, m=9) · 7km Deep Tectonic Graben & Sulfate ILD Mesas",
    mineralName: "Kieserite & Polyhydrated Sulfate Interior Layered Deposits (ILDs)",
    instrument: "RIMFAX + LIBS-Cam + PIXL",
    brief: "<strong>Site 03 — Valles Marineris: Melas Chasma (-4,850 m, 7 km Tectonic Trough):</strong> MRO HiRISE + MOLA steep fault-scarp canyon walls and stratified ILD mesas providing 38% natural atmospheric and topographic radiation shielding.",
    defaultWaypoints: [
      { name: "Melas Chasma Shelter HAB", type: "BASE", tool: "RIMFAX Subsurface", x: -30, z: 30 },
      { name: "WP-1 Kieserite ILD Bench", type: "SCI", tool: "LIBS-Cam Spectral", x: -10, z: 6 },
      { name: "WP-2 Tectonic Fault Scarp", type: "SCI", tool: "PIXL Elemental", x: 12, z: -12 },
      { name: "WP-3 Deep Basin Core Drill", type: "CORE", tool: "RIMFAX + Drill", x: 28, z: -28 }
    ]
  },
  {
    id: 3,
    name: "Olympus Mons · Western Flank Lava Tube Skylight",
    shortName: "Olympus Lava Tube",
    coords: "18.6500° N, 226.2000° E",
    chladni: [6.0, 11.0],
    baseElevM: 8420,
    thermalInertia: 520,
    nominalRad: 0.06,
    stormRad: 0.28,
    weather: { tempC: -64, minTempC: -108, pressurePa: 185, windMs: 5.2, windDir: "SSW", tau: 0.22, uv: "Cavern 0.0 (92% Shield)", station: "Tharsis Flank Met Beacon" },
    nasaPhotos: [
      {
        pia: "PIA26305",
        sol: "ORBIT 97400",
        cam: "MARS ODYSSEY THEMIS · OLYMPUS MONS LIMB HORIZON",
        url: "https://d2pn8kiwq2w21t.cloudfront.net/images/jpegPIA26305.width-1024.jpg",
        caption: "Captured by NASA's Mars Odyssey orbiter in 2024, this horizon panorama shows the 600-km-wide shield of Olympus Mons rising above purplish Martian dust layers and high-altitude bluish water-ice clouds. At +8,420 m on the western flank, thin atmospheric shielding makes subterranean lava tubes essential for crew survival."
      },
      {
        pia: "PIA23297",
        sol: "ORBIT 76800",
        cam: "THEMIS VIS · BASALTIC LAVA TUBE CHANNELS",
        url: "https://d2pn8kiwq2w21t.cloudfront.net/images/jpegPIA23297.width-1024.jpg",
        caption: "Sinuous volcanic rilles and roofed basaltic lava tubes on the flank of Olympus Mons. As low-viscosity tholeiitic basalt flows cooled at their surface, molten lava drained from the insulated interior conduits, leaving intact subterranean caverns tens of meters wide."
      },
      {
        pia: "PIA25476",
        sol: "ORBIT 89120",
        cam: "THEMIS VIS · COLLAPSED SKYLIGHT PIT CRATER",
        url: "https://d2pn8kiwq2w21t.cloudfront.net/images/jpegPIA25476.width-1024.jpg",
        caption: "Steep-walled collapse pit craters and extensional graben exposing the interior of Olympus Mons' subterranean lava network. Beneath the overhanging basaltic roof arch, astronauts receive >92% shielding from Solar Energetic Particle (SEP) storms, micrometeorite impacts, and extreme diurnal thermal swings."
      },
      {
        pia: "PIA14162",
        sol: "ORBIT 42150",
        cam: "THEMIS VIS · ESCARPMENT VOLATILE COLD TRAP",
        url: "https://d2pn8kiwq2w21t.cloudfront.net/images/jpegPIA14162.width-1024.jpg",
        caption: "Lobate lava flow fronts draping the Olympus Mons escarpment. Permanently shadowed lava tube interiors act as stable microclimatic cold traps where subsurface water-ice frost and pristine volatile organics remain shielded from surface UV photolysis."
      }
    ],
    lat: 18.6500,
    lon: -133.8000,
    seed: 61.7,
    roughness: 1.10,
    wmtsTile: { z: 2, row: 1, col: 1 },
    demoLabel: "CHLADNI (n=6, m=11) · Collapsed Basaltic Lava Tube Skylight & Cavern",
    mineralName: "High-Calcium Pyroxene, Basaltic Olivine & Subsurface Cave Water-Ice Frost",
    instrument: "SHERLOC + RIMFAX + LIBS-Cam",
    brief: "<strong>Site 04 — Olympus Mons: Western Flank Lava Tube Skylight (+8,420 m):</strong> Collapsed basaltic lava tube pit crater with exposed subterranean cavern arch providing &gt;92% shielding from Solar Energetic Particle (SEP) storms.",
    defaultWaypoints: [
      { name: "Tharsis Pressurized Rover", type: "BASE", tool: "LIBS-Cam Survey", x: -30, z: 26 },
      { name: "WP-1 Basaltic Olivine Flow", type: "SCI", tool: "PIXL Basalt Scan", x: -10, z: 14 },
      { name: "WP-2 Skylight Overhang Rim", type: "SCI", tool: "RIMFAX Cavern Sounder", x: 8, z: -6 },
      { name: "WP-3 Subterranean Ice Probe", type: "CORE", tool: "SHERLOC Volatiles", x: 26, z: -25 }
    ]
  }
];

export const LAYERS = [
  { id: 'optical', name: 'Optical (MRO HiRISE 0.25m/px & CTX 5m/px)', source: 'HiRISE/CTX', color: '#E06D44', active: true, opacity: 1.0 },
  { id: 'topo', name: 'Topographic Slope & Elevation (MGS MOLA DEM)', source: '25m Contours', color: '#34D399', active: true, opacity: 0.70 },
  { id: 'spectral', name: 'Spectral Mineralogy (MRO CRISM Hyperspectral)', source: '1.9–2.4 µm', color: '#38BDF8', active: true, opacity: 0.80 },
  { id: 'thermal', name: 'Thermal Infrared (Odyssey THEMIS Night IR)', source: '150–650 TIU', color: '#FB7185', active: false, opacity: 0.65 },
  { id: 'radiation', name: 'Radiation & Space Weather (RAD & MAVEN SEP)', source: 'mSv/sol', color: '#A78BFA', active: false, opacity: 0.65 }
];
