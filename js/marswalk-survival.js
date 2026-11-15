// MARSWALK — survival model in the browser.
// Mirrors jezero_survival.py: location features A (from the 200 m grid), conditions B, derived C, MLP inference.
// Everything here is a simulation-trained prototype, not a flight tool.

export const world = window.JEZERO;
export const model = window.SURVIVAL_MODEL;
export const cfg = window.B_RANGES;

const G = world.grid, ROWS = world.rows, COLS = world.cols;
export const N_CELLS = ROWS * COLS;
export const SPEC = Object.fromEntries(cfg.keys.map(k => [k.key, k]));
export const B_KEYS = model.bKeys;
export const ACTIONS = model.actions;                       // [{key,label}] continue, return, shelter, rescue, rest
export const DECISION_ORDER = ['continue', 'rest', 'return', 'shelter', 'rescue'];   // least → most disruptive
export const THRESHOLD = 0.85;
const LOC = cfg.local, RULE = cfg.rules;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const digit = (s, i) => s.charCodeAt(i) - 48;

// ---------------------------------------------------------------- grid helpers
export function cellOf(lat, lon) {
  const r = clamp(Math.floor((world.bounds.north - lat) / world.dLat), 0, ROWS - 1);
  const c = clamp(Math.floor((lon - world.bounds.west) / world.dLon), 0, COLS - 1);
  return r * COLS + c;
}
export function cellLatLon(i) {
  const r = Math.floor(i / COLS), c = i % COLS;
  return { lat: world.bounds.north - (r + .5) * world.dLat, lon: world.bounds.west + (c + .5) * world.dLon };
}
export function inGrid(lat, lon) {
  const b = world.bounds; return lat < b.north && lat > b.south && lon > b.west && lon < b.east;
}

/** Human-readable facts about a cell (for the UI). */
export function cellInfo(i) {
  const z = digit(G.zone, i), t = digit(G.terrain, i), hz = digit(G.hazard, i), sh = digit(G.shelter, i);
  return {
    i, zone: world.zones[z], terrain: world.terrain[t], terrainId: t, elev: G.elev[i], slope: G.slope[i],
    habKm: G.habKm[i], habClimb: G.habClimb[i], habSand: G.habSand[i],
    shelter: world.shelters[sh], shelterIdx: sh, shKm: G.shKm[i],
    hazard: hz === 9 ? null : world.hazardTypes[hz], hazDist: G.hazDist[i], nearestHazard: world.hazardTypes[digit(G.hazType, i)],
    landKm: G.landKm[i], ring: digit(G.ring, i), conf: digit(G.conf, i), rover: digit(G.rover, i) === 1,
    shW: G.shW[i], shE: G.shE[i], svf: G.svf[i], tpi: G.tpi[i], reachable: G.habKm[i] < 60,
  };
}

/** Location feature object keyed by model.aNames (35 values). */
export function aFeatures(i) {
  const a = {};
  const t = digit(G.terrain, i), z = digit(G.zone, i), h = digit(G.hazType, i);
  ['terrain_soil', 'terrain_bedrock', 'terrain_sand', 'terrain_bigrock'].forEach((k, j) => a[k] = j === t ? 1 : 0);
  a.slope_deg = G.slope[i];
  world.zones.forEach((zz, j) => a['zone_' + zz.id] = j === z ? 1 : 0);
  a.home_km = Math.min(G.habKm[i], 40); a.home_sand_frac = G.habSand[i]; a.home_climb_m = Math.min(G.habClimb[i], 1500);
  a.shelter_km = Math.min(G.shKm[i], 40); a.shelter_level = world.shelters[digit(G.shelter, i)].level; a.shelter_sand_frac = G.shSand[i];
  a.hazard_km = Math.min(G.hazDist[i], 5);
  ['haz_steep', 'haz_sharp', 'haz_sand', 'haz_rockfall'].forEach((k, j) => a[k] = j === h ? 1 : 0);
  a.hazard_frac_1km = G.hazFrac[i]; a.shadow_w_h = G.shW[i]; a.shadow_e_h = G.shE[i];
  a.rover_reachable = digit(G.rover, i); a.landing_km = G.landKm[i]; a.ring = digit(G.ring, i); a.data_conf = digit(G.conf, i);
  a.height_km = G.elev[i] / 1000; a.tpi_m = G.tpi[i]; a.svf = G.svf[i];
  return a;
}

// ---------------------------------------------------------------- local condition factors
const terr = a => [a.terrain_soil, a.terrain_bedrock, a.terrain_sand, a.terrain_bigrock].indexOf(1);
export function kWind(a, t) {
  const w = LOC.wind; let k = clamp(1 + w.tpi_per_m * a.tpi_m + w.slope_per_deg * a.slope_deg, w.min, w.max);
  if ((t < 7 || t > 18) && a.slope_deg > w.night_slope_deg) k += w.night_boost;
  return k;
}
export function kRad(a) { const r = LOC.rad; return Math.exp(r.alt_per_km * a.height_km) * (1 - r.svf_weight + r.svf_weight * a.svf); }
export function tempLocal(a, t) {
  const c = LOC.temp;
  let v = c.mean + c.amp * c.amp_by_terrain[Math.max(0, terr(a))] * Math.cos((t - c.peak_h) / 24 * 2 * Math.PI) + c.lapse_per_km * a.height_km;
  if ((18 - a.shadow_w_h < t && t < 18) || (6 < t && t < 6 + a.shadow_e_h)) v += c.shadow_c;
  return v;
}
export function clampB(s) {
  for (const k of B_KEYS) { const sp = SPEC[k]; s[k] = clamp(s[k], sp.min, sp.max); if (sp.int) s[k] = Math.round(s[k]); }
  return s;
}
const U = (lo, hi) => lo + Math.random() * (hi - lo);
function travelState(a, s, mid) {
  const u = mid ? (lo, hi) => (lo + hi) / 2 : U;
  if (a.ring < 1) {
    s.driven_km = 0; s.walked_km = a.home_km * u(...RULE.walk_detour) + u(0, .6);
    s.eva_h = s.walked_km / u(...RULE.walk_kmh) + u(...RULE.task_time_h);
  } else {
    s.driven_km = a.home_km * u(...RULE.drive_detour); s.walked_km = u(...RULE.extra_walk_km_outer);
    s.eva_h = s.driven_km / u(...RULE.drive_kmh) + s.walked_km / 2.3 + u(...RULE.task_time_h);
  }
  s.eva_h = Math.min(s.eva_h, 7.8);
  s.o2_pct = 100 - s.eva_h * u(...RULE.o2_use_pct_per_h);
  s.batt_pct = 100 - s.eva_h * u(...RULE.batt_use_pct_per_h);
}
/** "A normal day at this spot" — deterministic. */
export function nominalB(a) {
  const s = {}; for (const k of B_KEYS) s[k] = SPEC[k].nominal;
  s.wind_ms = 6 * kWind(a, s.time_h); s.rad_usvh = 28 * kRad(a); s.temp_c = tempLocal(a, s.time_h);
  travelState(a, s, true);
  return clampB(s);
}
export function applyFamily(fam, a, s) {
  for (const [key, mode, lo, hi] of cfg.families[fam].set) {
    if (mode === 'u') s[key] = U(lo, hi);
    else if (mode === 'u_kwind') s[key] = U(lo, hi) * kWind(a, s.time_h);
    else if (mode === 'log_krad') s[key] = Math.exp(U(Math.log(lo), Math.log(hi))) * kRad(a);
    else if (mode === 'below_local') s[key] = tempLocal(a, s.time_h) - U(lo, hi);
    else if (mode === 'choice') s[key] = lo + Math.floor(Math.random() * (hi - lo + 1));
    else if (mode === 'const') s[key] = lo;
  }
  return clampB(s);
}
/** RANDOM button: a plausible situation at this location; 0–3 emergency families. */
export function sampleB(a) {
  const s = {}; for (const k of B_KEYS) s[k] = SPEC[k].nominal;
  const nr = k => U(...SPEC[k].normal);
  s.time_h = nr('time_h'); s.dust_tau = nr('dust_tau'); s.storm_eta = 12; s.falls = 0; s.rover_ok = 1;
  s.wind_ms = nr('wind_ms') * kWind(a, s.time_h); s.rad_usvh = nr('rad_usvh') * kRad(a);
  s.temp_c = tempLocal(a, s.time_h) + U(-LOC.temp.noise, LOC.temp.noise);
  for (const k of ['hr_bpm', 'spo2', 'core_c', 'suit_kpa', 'co2_mmhg']) s[k] = nr(k);
  travelState(a, s, false);
  const p = cfg.family_count_p; let r = Math.random(), n = 0;
  while (n < p.length - 1 && r > p[n]) { r -= p[n]; n++; }
  const fams = Object.keys(cfg.families).sort(() => Math.random() - .5).slice(0, n);
  for (const f of fams) applyFamily(f, a, s);
  return { s: clampB(s), families: fams };
}
/** Re-express the same regional situation at another cell (used by the ML map). */
export function transferB(s, aFrom, aTo) {
  const o = { ...s };
  o.wind_ms = s.wind_ms / kWind(aFrom, s.time_h) * kWind(aTo, s.time_h);
  o.rad_usvh = s.rad_usvh / kRad(aFrom) * kRad(aTo);
  o.temp_c = s.temp_c - tempLocal(aFrom, s.time_h) + tempLocal(aTo, s.time_h);
  const keep = { o2: s.o2_pct, batt: s.batt_pct, eva: s.eva_h };
  const n0 = {}; travelState(aFrom, n0, true); const n1 = {}; travelState(aTo, n1, true);
  o.walked_km = n1.walked_km; o.driven_km = n1.driven_km;
  o.eva_h = clamp(n1.eva_h + (keep.eva - n0.eva_h), 0, 8);
  o.o2_pct = n1.o2_pct + (keep.o2 - n0.o2_pct); o.batt_pct = n1.batt_pct + (keep.batt - n0.batt_pct);
  return clampB(o);
}

// ---------------------------------------------------------------- derived C + feature vector
export function derived(a, s) {
  const t = s.time_h;
  const day = t < 6 + a.shadow_e_h ? 0 : Math.max(0, 18 - a.shadow_w_h - t);
  const fat = .05 * s.walked_km + .05 * s.eva_h + .01 * s.driven_km + .35 * Math.max(0, (s.hr_bpm - 110) / 70) + .1 * s.falls;
  return { daylight: day, fatigue: Math.min(1, fat) };
}
const A_NAMES = model.aNames, NX = model.xNames.length;
const MEAN = Float64Array.from(model.scaler.mean), SCALE = Float64Array.from(model.scaler.scale);
const LAYERS = model.layers.map(l => {
  const nin = l.W.length, nout = l.W[0].length, W = new Float32Array(nin * nout);
  for (let i = 0; i < nin; i++) for (let j = 0; j < nout; j++) W[j * nin + i] = l.W[i][j];     // row per output unit
  return { nin, nout, W, b: Float32Array.from(l.b) };
});
const BUF = LAYERS.map(l => new Float32Array(l.nout)), XBUF = new Float32Array(NX);

export function xVector(a, s, out = XBUF) {
  let n = 0;
  for (const k of A_NAMES) out[n++] = a[k];
  const t = s.time_h / 24 * 2 * Math.PI; out[n++] = Math.sin(t); out[n++] = Math.cos(t);
  for (const k of B_KEYS) if (k !== 'time_h') out[n++] = k === 'rad_usvh' ? Math.log10(s[k]) : s[k];
  const d = derived(a, s); out[n++] = d.daylight; out[n++] = d.fatigue;
  return out;
}
/** MLP forward pass → Float32Array(5) of success probabilities in ACTIONS order. */
export function predictX(x) {
  let inp = x, first = true;
  for (let L = 0; L < LAYERS.length; L++) {
    const { nin, nout, W, b } = LAYERS[L], o = BUF[L], last = L === LAYERS.length - 1;
    for (let j = 0; j < nout; j++) {
      let acc = b[j]; const off = j * nin;
      if (first) for (let i = 0; i < nin; i++) acc += W[off + i] * ((inp[i] - MEAN[i]) / SCALE[i]);
      else for (let i = 0; i < nin; i++) acc += W[off + i] * inp[i];
      o[j] = last ? clamp(acc, 0, 1) : (acc > 0 ? acc : 0);
    }
    inp = o; first = false;
  }
  return inp;
}
export function predict(a, s) {
  const p = predictX(xVector(a, s)); const r = {};
  ACTIONS.forEach((ac, j) => r[ac.key] = p[j]);
  return r;
}
/** Site rule: the least disruptive option with ≥ 85 % predicted success; otherwise the best available. */
export function decide(p) {
  for (const k of DECISION_ORDER) if (p[k] >= THRESHOLD) return { key: k, meets: true };
  let best = DECISION_ORDER[0]; for (const k of DECISION_ORDER) if (p[k] > p[best]) best = k;
  return { key: best, meets: false };
}
/** Which readings drive the result: reset each out-of-band reading to its normal value and see what changes. */
export function drivers(a, s) {
  const base = predict(a, s), nom = nominalB(a), out = [];
  const score = p => Math.max(p.continue, p.rest, p.return);
  for (const k of B_KEYS) {
    const sp = SPEC[k], v = s[k];
    const lo = sp.normal[0], hi = sp.normal[1], band = Math.max(1e-9, sp.max - sp.min);
    const ref = ['wind_ms', 'rad_usvh', 'temp_c', 'o2_pct', 'batt_pct', 'eva_h', 'walked_km', 'driven_km'].includes(k) ? nom[k] : clamp(v, lo, hi);
    if (Math.abs(v - ref) / band < 0.02 && k !== 'rad_usvh') continue;
    if (k === 'rad_usvh' && Math.abs(Math.log10(v / ref)) < 0.15) continue;
    const p2 = predict(a, { ...s, [k]: ref });
    const d = score(p2) - score(base);
    if (Math.abs(d) > 0.03) out.push({ key: k, label: sp.label, unit: sp.unit, value: v, normal: ref, delta: d });
  }
  return out.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta)).slice(0, 4);
}

// ---------------------------------------------------------------- paths (precomputed cost-optimal parents)
/** Cells from i to the habitat (target='hab') or to shelter index. Empty if unreachable. */
export function pathFrom(i, target = 'hab') {
  const par = target === 'hab' ? G.habPar : G.shPar[target], nb = world.nb, out = [i];
  let cur = i;
  for (let n = 0; n < 2000; n++) {
    const d = digit(par, cur);
    if (d === 8) return out;
    if (d === 9) return [];
    const r = Math.floor(cur / COLS) + nb[d][0], c = cur % COLS + nb[d][1];
    if (r < 0 || c < 0 || r >= ROWS || c >= COLS) return [];
    cur = r * COLS + c; out.push(cur);
  }
  return [];
}

// ---------------------------------------------------------------- data layers (202×202 RGBA rasters)
const RAMPS = {
  slope: [[0, 30, 60, 90, 0], [4, 60, 160, 150, 120], [10, 230, 210, 90, 170], [18, 240, 130, 50, 200], [28, 220, 40, 40, 225], [40, 150, 20, 90, 235]],
  prob: [[0, 190, 30, 45, 215], [.5, 235, 120, 40, 205], [.75, 240, 205, 70, 190], [.85, 150, 215, 110, 170], [1, 60, 215, 200, 150]],
  hours: [[0, 0, 0, 0, 0], [.3, 70, 60, 150, 110], [1.5, 60, 40, 130, 190], [4, 25, 15, 70, 225]],
  km: [[0, 70, 220, 230, 170], [4, 110, 200, 120, 170], [8, 240, 200, 80, 175], [20, 230, 90, 50, 190], [45, 140, 30, 80, 210]],
};
function ramp(stops, v) {
  if (v <= stops[0][0]) return stops[0].slice(1);
  for (let k = 1; k < stops.length; k++) if (v <= stops[k][0]) {
    const a = stops[k - 1], b = stops[k], t = (v - a[0]) / (b[0] - a[0]);
    return [1, 2, 3, 4].map(j => a[j] + (b[j] - a[j]) * t);
  }
  return stops[stops.length - 1].slice(1);
}
export const CAT = {
  terrain: [[196, 150, 110], [120, 130, 150], [235, 200, 110], [150, 80, 70]],
  zone: [[176, 108, 78], [226, 190, 90], [214, 96, 58], [120, 180, 150], [100, 160, 200], [70, 120, 210], [200, 200, 215], [130, 90, 110], [150, 150, 120]],
  hazard: [[235, 60, 60], [240, 150, 50], [240, 215, 80], [200, 80, 200]],
  conf: [null, [230, 90, 60], [240, 200, 80], [90, 220, 200]],
};
export const LAYER_DEFS = [
  { id: 'none', label: 'None', note: '' },
  { id: 'ml', label: 'ML survival map', note: 'Predicted success of the advised option for the current conditions, at every 200 m cell. Model output — simulated.', legend: ['prob', '0 %', '85 %', '100 %'] },
  { id: 'ml_continue', label: 'ML: continue mission', note: 'Predicted success of continuing the mission from each cell under the current conditions.', legend: ['prob', '0 %', '85 %', '100 %'] },
  { id: 'slope', label: 'Slope', note: 'Slope from the real CTX DEM, averaged to 200 m cells.', legend: ['slope', '0°', '18°', '40°'] },
  { id: 'homekm', label: 'Path to habitat', note: 'Cost-optimal walking distance back to Habitat Alpha.', legend: ['km', '0 km', '8', '45 km'] },
  { id: 'hazard', label: 'Hazards', note: 'Steep slope (red) from the real DEM; boulders, sand traps and rockfall are scenario estimates.' },
  { id: 'shadow', label: 'Evening terrain shadow', note: 'Hours of daylight lost before sunset because terrain blocks the low sun (real DEM horizon).', legend: ['hours', '0 h', '1.5', '4 h'] },
  { id: 'terrain', label: 'Surface class', note: 'Soil / bedrock / sand / big rocks. Approximate — generated from zone statistics, not mapped.' },
  { id: 'zone', label: 'Geologic zones', note: 'Outlines are approximate (scenario).' },
  { id: 'conf', label: 'Data confidence', note: 'Green: within 300 m of the real rover traverse. Yellow: HiRISE 25 cm coverage. Red: CTX only.' },
];
export function rampCss(name) {
  const st = RAMPS[name], lo = st[0][0], hi = st[st.length - 1][0];
  return 'linear-gradient(90deg,' + st.map(s => `rgba(${s[1] | 0},${s[2] | 0},${s[3] | 0},${Math.max(.25, s[4] / 255)}) ${((s[0] - lo) / (hi - lo) * 100).toFixed(0)}%`).join(',') + ')';
}
/** Fill an ImageData-sized Uint8ClampedArray (ROWS×COLS RGBA) for a static layer. */
export function staticLayer(id, px) {
  for (let i = 0; i < N_CELLS; i++) {
    let c = null;
    if (id === 'slope') c = ramp(RAMPS.slope, G.slope[i]);
    else if (id === 'homekm') c = G.habKm[i] >= 60 ? [40, 40, 40, 200] : ramp(RAMPS.km, G.habKm[i]);
    else if (id === 'shadow') c = ramp(RAMPS.hours, G.shW[i]);
    else if (id === 'hazard') { const h = digit(G.hazard, i); c = h === 9 ? null : [...CAT.hazard[h], 215]; }
    else if (id === 'terrain') c = [...CAT.terrain[digit(G.terrain, i)], 150];
    else if (id === 'zone') c = [...CAT.zone[digit(G.zone, i)], 150];
    else if (id === 'conf') c = [...CAT.conf[digit(G.conf, i)], 135];
    const o = i * 4;
    if (!c || G.landKm[i] > world.radiusKm + .2) { px[o + 3] = 0; continue; }
    px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = c[3];
  }
}
/** ML map: runs the network on every cell inside the zone. Async in slices so the UI stays live. */
export async function mlLayer(id, s, iHere, px, isStale) {
  const aHere = aFeatures(iHere), x = new Float32Array(NX), idx = ACTIONS.map(a => a.key);
  for (let i = 0; i < N_CELLS; i++) {
    const o = i * 4;
    if (G.landKm[i] > world.radiusKm || G.habKm[i] >= 60) { px[o + 3] = 0; continue; }
    const a = aFeatures(i), p = predictX(xVector(a, transferB(s, aHere, a), x));
    let v;
    if (id === 'ml_continue') v = p[0];
    else { const r = {}; idx.forEach((k, j) => r[k] = p[j]); v = r[decide(r).key]; }
    const c = ramp(RAMPS.prob, v);
    px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = c[3];
    if (i % 4040 === 4039) { await new Promise(r => setTimeout(r)); if (isStale()) return false; }
  }
  return true;
}
