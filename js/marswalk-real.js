// MARSWALK — real Jezero terrain for the ARES surface view.
// Elevation: USGS Mars 2020 CTX DEM mosaic (20 m) resampled to an 801×801 heightmap. Image: CTX ortho mosaic × relief.
// Loaded with top-level await so ARES can pre-bake its geometry from real heights. If loading fails, REAL is null
// and ARES falls back to its original procedural Jezero scene.
import * as THREE from 'three';

const DEM_SIZE = 104;          // ARES surface plane size (scene units)
const E0 = 2.0;                // vertical exaggeration baked into scene heights (ARES "relief" multiplies on top)

async function load() {
  const base = new URL('../marswalk/', import.meta.url);
  const T = await (await fetch(new URL('terrain.json', base))).json();
  const raw = new Uint16Array(await (await fetch(new URL('terrain.bin', base))).arrayBuffer());
  const n = T.n, H = new Float32Array(n * n), sc = (T.max - T.min) / 65535;
  for (let i = 0; i < H.length; i++) H[i] = (T.min + raw[i] * sc - T.landingElev) / 1000;      // km above the landing site
  const kLat = T.kmPerDegLat, kLon = T.kmPerDegLon;
  const xW = (T.bounds.west - T.lon0) * kLon, xE = (T.bounds.east - T.lon0) * kLon;
  const zN = -(T.bounds.north - T.lat0) * kLat, zS = -(T.bounds.south - T.lat0) * kLat;
  const K = (xE - xW) / DEM_SIZE;                              // km per scene unit (~0.388)
  const heightKm = (xk, zk) => {
    const u = Math.min(1, Math.max(0, (xk - xW) / (xE - xW))) * (n - 1), v = Math.min(1, Math.max(0, (zk - zN) / (zS - zN))) * (n - 1);
    const j = Math.min(n - 2, Math.floor(u)), i = Math.min(n - 2, Math.floor(v)), fu = u - j, fv = v - i, o = i * n + j;
    return (H[o] * (1 - fu) + H[o + 1] * fu) * (1 - fv) + (H[o + n] * (1 - fu) + H[o + n + 1] * fu) * fv;
  };
  const loadTex = name => new Promise((res, rej) => new THREE.TextureLoader().load(new URL(name, base).href, t => {
    t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = 8; res(t);
  }, undefined, rej));
  const texture = await loadTex('tex_global.jpg');
  // HiRISE detail patch around the landing site (optional); rect = u0, v0 (south), u1, v1 (north) in terrain UV
  let localTexture = texture, localRect = [0, 0, 1, 1];
  if (T.local) {
    try {
      localTexture = await loadTex('tex_local.jpg');
      const B = T.bounds, L = T.local, u = lon => (lon - B.west) / (B.east - B.west), v = lat => 1 - (B.north - lat) / (B.north - B.south);
      localRect = [u(L.w), v(L.s), u(L.e), v(L.n)];
    } catch (err) { console.warn('HiRISE detail texture unavailable', err); }
  }
  const cx = (xW + xE) / 2, cz = (zN + zS) / 2;                // plane centre in km (≈ landing site)
  const api = {
    T, K, E0, DEM_SIZE, texture, localTexture, localRect, landingElev: T.landingElev,
    kmX: x => x * K + cx, kmZ: z => z * K + cz,
    /** ARES hook: scene height (units, exaggerated ×E0) + feature mask at scene x,z. */
    evaluate(x, z) { return { h: heightKm(x * K + cx, z * K + cz) / K * E0, featureMask: 0 }; },
    /** True slope in degrees (no exaggeration), central differences over 120 m. */
    slopeDeg(x, z) {
      const xk = x * K + cx, zk = z * K + cz, e = .06;
      const gx = (heightKm(xk + e, zk) - heightKm(xk - e, zk)) / (2 * e), gz = (heightKm(xk, zk + e) - heightKm(xk, zk - e)) / (2 * e);
      return Math.atan(Math.hypot(gx, gz)) * 180 / Math.PI;
    },
    elevM(x, z) { return heightKm(x * K + cx, z * K + cz) * 1000 + T.landingElev; },
    toLatLon(x, z) { return { lat: T.lat0 - (z * K + cz) / kLat, lon: T.lon0 + (x * K + cx) / kLon }; },
    toUnits(lat, lon) { return { x: ((lon - T.lon0) * kLon - cx) / K, z: (-(lat - T.lat0) * kLat - cz) / K }; },
  };
  return api;
}

export const REAL = await load().catch(err => { console.warn('MARSWALK real terrain unavailable; using the procedural Jezero scene.', err); return null; });

/** Re-label the ARES Jezero preset so the UI no longer calls the terrain synthetic. */
export function relabelJezero(SITES) {
  if (!REAL) return;
  const s = SITES[1], c = REAL.toUnits(18.4447, 77.4508), h = REAL.toUnits(18.4447, 77.4722);
  Object.assign(s, {
    name: 'Jezero Crater · MARSWALK mission zone', shortName: 'Jezero · MARSWALK',
    coords: '18.4447° N, 77.4508° E', lat: 18.4447, lon: 77.4508, baseElevM: Math.round(REAL.landingElev),
    demoLabel: 'REAL CTX DEM 20 m + CTX IMAGE · 40 km ZONE · EVA OUTCOMES SIMULATED',
    brief: 'Jezero Crater, 20 km around the Perseverance landing site. <strong>Terrain and imagery are real</strong> (USGS Mars 2020 CTX DEM and orthomosaic, NASA/JPL-Caltech/MSSS/USGS; vertical relief exaggerated for display). The habitat, shelters, the three EVA tasks, weather, physiology and every survival probability are mission-scenario simulations — not operational guidance.',
    defaultWaypoints: [
      { name: 'Habitat (scenario)', type: 'BASE', tool: 'Crew habitat', x: h.x, z: h.z, label: 'HAB' },
      { name: 'Octavia E. Butler Landing', type: 'SCI', tool: 'Perseverance landing site', x: c.x, z: c.z, label: 'LANDING' },
    ],
  });
  if (s.provenance) Object.assign(s.provenance, {
    classification: 'Real CTX elevation and imagery; mission scenario overlays are simulated',
    numericValues: 'Elevation and slope from the USGS CTX DEM (20 m). Weather, physiology, spectra, shelters and survival probabilities remain simulated.',
  });
}
