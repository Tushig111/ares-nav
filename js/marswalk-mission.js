// MARSWALK mission layer for ARES-NAV (additive): random habitat drop, 3 human EVA tasks, red-zone hazards,
// cost-optimal routing on the real 200 m grid, 6-permutation planner with sortie chunking, custom pins,
// client-side ML decision engine + stress test, and the scientific disclaimer.
// Routes are handed to ARES as ordinary waypoints, so the ARES astronaut, route tube, pins and profile do the rest.
import * as S from './marswalk-survival.js?v=flight2';

const world = S.world, G = world.grid, ROWS = world.rows, COLS = world.cols, N = ROWS * COLS;
const digit = (s, i) => s.charCodeAt(i) - 48;
const U = (lo, hi) => lo + Math.random() * (hi - lo);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const KLAT = 59.158, KLON = KLAT * Math.cos(world.landing.lat * Math.PI / 180);
const kmBetween = (a, b) => Math.hypot((a.lat - b.lat) * KLAT, (a.lon - b.lon) * KLON);
const pct = v => `${Math.round(v * 100)} %`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ------------------------------------------------------------------ mission configuration
export const MISSION = {
  center: { lat: 18.4447, lon: 77.4508, name: 'Octavia E. Butler Landing (Perseverance)' },
  radiusKm: 20, walkKm: 4, roverKm: 8,
  habitatRules: { maxSlopeDeg: 5, surface: ['soil', 'bedrock'], minHazardKm: 0.4, blastKm: 1.0 },
  limits: { sortieHours: 7, o2ReservePct: 15, minSuccess: 0.6 },
  rates: { walkKmh: 2.3, driveKmh: 8, o2WalkPctH: 12.5, o2RestPctH: 7.5, o2WorkPctH: 11, battPctH: 10 },
};
export const TASKS = [
  { id: 't1', n: 1, short: 'Regolith agriculture test', label: 'T1 · REGOLITH FARM', lat: 18.430, lon: 77.468, minutes: 75, coordNote: 'scenario dig point',
    where: 'Máaz, the flat lava floor of the crater',
    problem: 'Martian soil carries toxic perchlorate salts (ClO₄⁻, about 0.5–1 % by weight, first measured by the Phoenix lander) and almost no organic matter or nitrogen. Plants have only ever been grown in simulant on Earth.',
    robot: 'A rover cannot wash soil, plant seeds, water them every day or dig a deep pit.',
    human: 'Take a core from ~1 m depth, collect settled dust after a storm, and plant seeds in three greenhouse pots: deep soil, dust, washed soil.',
    risk: 'Dust is collected after a storm, so the EVA must be timed around storm arrival and dust opacity.', tool: 'Core sampler ~1 m + greenhouse test' },
  { id: 't2', n: 2, short: 'Biosignature mud sampling', label: 'T2 · CHEYAVA FALLS', lat: 18.488, lon: 77.345, minutes: 100, coordNote: 'approx.',
    where: 'Cheyava Falls, Bright Angel area, Neretva Vallis — the ancient river channel that fed the lake',
    problem: 'In 2024 Perseverance found a clay-rich mudstone here with “leopard spots”. They are a potential biosignature — not confirmed life.',
    robot: 'The rover drill reaches only ~6 cm. Radiation destroys organics near the surface, so samples from 1–2 m are needed, and the rover has no wet-chemistry lab.',
    human: 'Hand-drill to ~2 m, seal the mud sample without contamination, then run microscopy and organic-molecule analysis in the habitat lab.',
    risk: 'Far point. If the rover fails, is there enough O₂ to walk back? The approach crosses the delta edge, sand and boulders.', tool: 'Manual drill ~2 m + sealed sample bags' },
  { id: 't3', n: 3, short: 'Sample tube retrieval (Montdenier)', label: 'T3 · THREE FORKS', lat: 18.4525, lon: 77.4065, minutes: 50, coordNote: 'approx.',
    where: 'Three Forks sample depot, on the delta apron',
    problem: 'Montdenier (sample M2020-190-3, cored on sol 190 from the rock “Rochette”) is one of the 10 tubes Perseverance left on the surface. It is igneous rock that can be dated precisely in an Earth laboratory.',
    robot: 'The rover can drop tubes but has no way to pick them up again, and the Mars Sample Return flight is delayed.',
    human: 'Find Montdenier among the 10 tubes by its number, inspect it for damage and dust, seal it in a container and carry it to the habitat.',
    risk: 'The direct line from the east crosses the Séítah sand ripples: shortcut through sand, or go around?', tool: 'Tube gripper + sealed container' },
];
const HZ = [null,
  { key: 'steep', name: 'Steep slope / cliff edge (> 20°)', color: [240, 60, 60], note: 'Real — computed from the CTX DEM.' },
  { key: 'sand', name: 'Sand trap (Spirit-type)', color: [255, 150, 40], note: 'Estimated from the scenario surface class. THEMIS thermal inertia is not ingested yet.' },
  { key: 'rock', name: 'Sharp-rock / boulder field (Curiosity-type)', color: [190, 70, 230], note: 'Estimated from the scenario surface class and steep delta/rim faces.' }];
const ANOMALIES = { storm: 'Sudden dust storm', sep: 'Solar radiation flare', leak: 'Suit micro-tear' };
const ACTION_TEXT = { continue: 'Continue', rest: 'Rest 15 min, then return', return: 'Return to habitat', shelter: 'Take cover (nearest shelter)', rescue: 'Stay put — call rescue' };

// ------------------------------------------------------------------ grid: hazards + cost-optimal routing
const hz = new Uint8Array(N), COST = new Float32Array(N);
const TERRAIN_COST = [1.0, 1.05, 1.8, 1.6], NB = world.nb, NBW = [1, 1, 1, 1, Math.SQRT2, Math.SQRT2, Math.SQRT2, Math.SQRT2], OPP = [1, 0, 3, 2, 7, 6, 5, 4];
for (let i = 0; i < N; i++) {
  const h = digit(G.hazard, i);
  hz[i] = G.slope[i] > 20 ? 1 : h === 2 ? 2 : (h === 1 || h === 3) ? 3 : 0;
  const out = G.landKm[i] > world.radiusKm + .2;
  COST[i] = (hz[i] || out || G.slope[i] > 30) ? Infinity : TERRAIN_COST[digit(G.terrain, i)] * (1 + G.slope[i] / 15);
}
/** Dijkstra tree toward `src` (binary heap). The cost model matches the training simulator; red zones are impassable. */
function tree(src) {
  const g = new Float64Array(N).fill(Infinity), km = new Float32Array(N).fill(Infinity), sand = new Float32Array(N), climb = new Float32Array(N), par = new Int8Array(N).fill(9);
  const hd = [], hi = [];
  const push = (d, i) => { let k = hd.length; hd.push(d); hi.push(i); while (k > 0) { const p = (k - 1) >> 1; if (hd[p] <= d) break; hd[k] = hd[p]; hi[k] = hi[p]; k = p; } hd[k] = d; hi[k] = i; };
  const pop = () => { const d = hd[0], i = hi[0], ld = hd.pop(), li = hi.pop(), n = hd.length; if (n) { let k = 0; for (;;) { let c = 2 * k + 1; if (c >= n) break; if (c + 1 < n && hd[c + 1] < hd[c]) c++; if (hd[c] >= ld) break; hd[k] = hd[c]; hi[k] = hi[c]; k = c; } hd[k] = ld; hi[k] = li; } return [d, i]; };
  g[src] = 0; km[src] = 0; par[src] = 8; push(0, src);
  while (hd.length) {
    const [d, i] = pop(); if (d > g[i]) continue;
    const r = (i / COLS) | 0, c = i % COLS;
    for (let k = 0; k < 8; k++) {
      const rr = r + NB[k][0], cc = c + NB[k][1]; if (rr < 0 || cc < 0 || rr >= ROWS || cc >= COLS) continue;
      const j = rr * COLS + cc, sc = COST[j]; if (sc === Infinity) continue;
      const nd = d + NBW[k] * sc;
      if (nd < g[j]) { g[j] = nd; par[j] = OPP[k]; const step = NBW[k] * world.cellKm; km[j] = km[i] + step; sand[j] = sand[i] + (digit(G.terrain, j) === 2 ? step : 0); climb[j] = climb[i] + Math.max(0, G.elev[i] - G.elev[j]); push(nd, j); }
    }
  }
  return { src, km, sand, climb, par };
}
function pathCells(from, t) {
  const out = [from]; let cur = from;
  for (let n = 0; n < 4000; n++) {
    const d = t.par[cur]; if (d === 8) return out; if (d === 9) return null;
    cur = (((cur / COLS) | 0) + NB[d][0]) * COLS + (cur % COLS) + NB[d][1]; out.push(cur);
  }
  return null;
}
/** Nearest cell that is not a red zone and can be walked (expanding square search). */
function snapSafe(cell) {
  if (COST[cell] !== Infinity) return cell;
  const r0 = (cell / COLS) | 0, c0 = cell % COLS; let best = -1, bd = 1e9;
  for (let rad = 1; rad < 40 && best < 0; rad++) for (let r = r0 - rad; r <= r0 + rad; r++) for (let c = c0 - rad; c <= c0 + rad; c++) {
    if (r < 0 || c < 0 || r >= ROWS || c >= COLS || Math.max(Math.abs(r - r0), Math.abs(c - c0)) !== rad) continue;
    const j = r * COLS + c, d = Math.hypot(r - r0, c - c0); if (COST[j] !== Infinity && d < bd) { bd = d; best = j; }
  }
  return best < 0 ? cell : best;
}

export function initMarswalk(api) {
  const { THREE, REAL, state } = api;
  const M = { hab: null, tasks: [], pins: [], plan: null, perms: [], which: 'all', cond: null, anomalies: [], emergency: null, tab: 'mission', hazardOn: { 1: true, 2: true, 3: true }, pinSeq: 0 };
  const unitsOf = (lat, lon) => REAL.toUnits(lat, lon);
  const cellUnits = c => { const p = S.cellLatLon(c); return unitsOf(p.lat, p.lon); };
  const node = (lat, lon, extra = {}) => { const raw = S.cellOf(lat, lon), cell = snapSafe(raw), p = cell === raw ? { lat, lon } : S.cellLatLon(cell); return { ...extra, lat: p.lat, lon: p.lon, cell, snapped: cell !== raw, tree: tree(cell) }; };

  // ---------------------------------------------------------------- conditions (regional) + per-node suit state
  function nominalCond() { return { time_h: 9, dust_tau: .6, wind_base: 6, storm_eta: 12, rad_base: 28, temp_off: 0, hr_bpm: 95, spo2: 97, core_c: 37, suit_kpa: 29.6, co2_mmhg: 3, falls: 0, rover_ok: 1, eva_off: 0, walked_off: 0, driven_off: 0, o2_off: 0, batt_off: 0 }; }
  function applyAnomaly(key) {
    for (const [k, mode, lo, hi] of S.cfg.families[key].set) {
      if (mode === 'u') M.cond[k] = U(lo, hi); else if (mode === 'u_kwind') M.cond.wind_base = U(lo, hi); else if (mode === 'log_krad') M.cond.rad_base = Math.exp(U(Math.log(lo), Math.log(hi)));
    }
  }
  /** Location features with the randomly deployed habitat (home path, ring) instead of the fixed training habitat. */
  function aAt(cell) {
    const a = S.aFeatures(cell), t = M.hab.tree, km = t.km[cell];
    a.home_km = Math.min(isFinite(km) ? km : 60, 40); a.home_sand_frac = km > 0 && isFinite(km) ? t.sand[cell] / km : 0; a.home_climb_m = Math.min(t.climb[cell], 1500);
    const d = kmBetween(S.cellLatLon(cell), M.hab); a.landing_km = d; a.ring = d < MISSION.walkKm ? 0 : d < MISSION.roverKm ? 1 : 2;
    return a;
  }
  function suitState(a, tl) {
    const c = M.cond, t = clamp(c.time_h + tl.elapsed, 5, 20), s = {};
    for (const k of S.B_KEYS) s[k] = S.SPEC[k].nominal;
    Object.assign(s, { time_h: t, dust_tau: c.dust_tau, storm_eta: c.storm_eta >= 12 ? 12 : Math.max(0, c.storm_eta - tl.elapsed), hr_bpm: c.hr_bpm, spo2: c.spo2, core_c: c.core_c, suit_kpa: c.suit_kpa, co2_mmhg: c.co2_mmhg, falls: c.falls, rover_ok: c.rover_ok });
    s.wind_ms = c.wind_base * S.kWind(a, t); s.rad_usvh = c.rad_base * S.kRad(a); s.temp_c = S.tempLocal(a, t) + c.temp_off;
    s.eva_h = tl.elapsed + c.eva_off; s.walked_km = tl.walked + c.walked_off; s.driven_km = tl.driven + c.driven_off; s.o2_pct = 100 - tl.o2 + c.o2_off; s.batt_pct = 100 - MISSION.rates.battPctH * tl.elapsed + c.batt_off;
    return S.clampB(s);
  }

  // ---------------------------------------------------------------- sortie simulation + planner
  function simulate(stops) {
    const R = MISSION.rates, seq = [M.hab, ...stops, M.hab];
    let pathKm = 0; for (let k = 1; k < seq.length; k++) pathKm += seq[k].tree.km[seq[k - 1].cell];
    const far = Math.max(...stops.map(s => kmBetween(s, M.hab)));
    const mode = (far >= MISSION.walkKm || pathKm > 9) ? 'rover' : 'foot';
    const tl = { elapsed: 0, o2: 0, walked: 0, driven: 0 }, legs = []; let surv = 1, ok = true;
    for (let k = 1; k < seq.length; k++) {
      const A = seq[k - 1], B = seq[k], t = B.tree, km = t.km[A.cell], cells = pathCells(A.cell, t);
      if (!cells || !isFinite(km)) { ok = false; legs.push({ from: A, to: B, km: NaN, h: NaN, o2Left: NaN, surv: 0, cells: [A.cell, B.cell], nodes: [], blocked: true }); surv = 0; continue; }
      const sandF = km > 0 ? t.sand[A.cell] / km : 0, climb = t.climb[A.cell];
      const h = mode === 'foot' ? km / R.walkKmh * (1 + .4 * sandF) + climb / 400 : km * 1.15 / R.driveKmh + .1;
      const rate = mode === 'foot' ? R.o2WalkPctH : R.o2RestPctH, nodes = []; let legS = 1;
      const step = Math.max(1, Math.round(cells.length / 6));
      for (let q = step; q < cells.length + step; q += step) {
        const ci = Math.min(q, cells.length - 1), f = ci / Math.max(1, cells.length - 1);
        const at = { elapsed: tl.elapsed + h * f, o2: tl.o2 + rate * h * f, walked: tl.walked + (mode === 'foot' ? km * f : 0), driven: tl.driven + (mode === 'rover' ? km * f : 0) };
        const a = aAt(cells[ci]), p = S.predict(a, suitState(a, at));
        nodes.push({ cell: cells[ci], p, advice: S.decide(p).key, at }); legS = Math.min(legS, p.continue);
        if (ci === cells.length - 1) break;
      }
      tl.elapsed += h; tl.o2 += rate * h; if (mode === 'foot') tl.walked += km; else tl.driven += km;
      let work = 0;
      if (B.task) { work = B.task.minutes / 60; tl.elapsed += work; tl.o2 += R.o2WorkPctH * work; tl.walked += .3; }
      legs.push({ from: A, to: B, km, h, work, sandF, climb, cells, nodes, surv: legS, o2Left: 100 - tl.o2, elapsed: tl.elapsed });
      surv = Math.min(surv, legS);
    }
    return { stops, mode, legs, km: pathKm, hours: tl.elapsed, o2End: 100 - tl.o2, surv, ok, far,
      fits: ok && tl.elapsed <= MISSION.limits.sortieHours && 100 - tl.o2 >= MISSION.limits.o2ReservePct && surv >= MISSION.limits.minSuccess, outOfRange: far > MISSION.roverKm };
  }
  function planFor(order) {
    // tasks in this order, then every custom pin inserted where it adds the least path
    const stops = order.map(i => M.tasks[i]);
    for (const pin of M.pins) {
      let best = 0, bd = Infinity; const seq = [M.hab, ...stops, M.hab];
      for (let k = 1; k < seq.length; k++) { const d = pin.tree.km[seq[k - 1].cell] + seq[k].tree.km[pin.cell] - seq[k].tree.km[seq[k - 1].cell]; if (d < bd) { bd = d; best = k - 1; } }
      stops.splice(best, 0, pin);
    }
    const single = simulate(stops), sorties = []; let cur = [];
    for (const st of stops) {                                 // smart chunking: greedy, keep adding while the sortie stays inside the limits
      const trial = simulate([...cur, st]);
      if (cur.length && !trial.fits) { sorties.push(simulate(cur)); cur = [st]; } else cur.push(st);
    }
    if (cur.length) sorties.push(simulate(cur));
    const km = sorties.reduce((s, x) => s + x.km, 0), hours = sorties.reduce((s, x) => s + x.hours, 0), o2Used = sorties.reduce((s, x) => s + (100 - x.o2End), 0);
    const surv = Math.min(...sorties.map(x => x.surv)), o2Min = Math.min(...sorties.map(x => x.o2End));
    const score = hours + km / 8 + o2Used / 25 + 8 * (1 - surv) + 1.5 * (sorties.length - 1) + (sorties.some(x => !x.fits) ? 5 : 0);
    return { order, stops, sorties, single, km, hours, o2Used, o2Min, surv, score };
  }
  const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  function replan({ apply = true, render = true } = {}) {
    M.perms = PERMS.map(planFor).sort((a, b) => a.score - b.score);
    M.plan = M.perms[0]; M.emergency = null; if (apply) M.placed = null;
    if (M.which !== 'all' && +M.which >= M.plan.sorties.length) M.which = 'all';
    buildTimeline();
    if (apply && state.siteIndex === 1) applyRoute();
    drawRings(); if (render) renderPanel();
  }

  // ---------------------------------------------------------------- habitat drop
  function deployHabitat(first = false) {
    const R = MISSION.habitatRules, cand = [];
    for (let i = 0; i < N; i++) {
      if (G.landKm[i] > MISSION.radiusKm - .5 || G.landKm[i] < R.blastKm + .2 || G.slope[i] >= R.maxSlopeDeg || hz[i] || digit(G.terrain, i) > 1 || G.hazDist[i] < R.minHazardKm || digit(G.rover, i) !== 1) continue;
      const p = S.cellLatLon(i);
      if (TASKS.every(t => { const d = kmBetween(p, t); return d <= MISSION.roverKm && d > .5; })) cand.push(i);   // every task inside the 8 km rover ring
    }
    for (let tries = 0; tries < 40; tries++) {
      const i = cand[(Math.random() * cand.length) | 0], p = S.cellLatLon(i), h = node(p.lat, p.lon, { hab: true, name: 'Habitat' });
      if (!M.tasks.every(t => isFinite(h.tree.km[t.cell]))) continue;
      M.hab = h; M.candidates = cand.length; M.pins = [];
      // keep this landing point only if its best plan stays inside every limit (time, O2 reserve, minimum success); otherwise draw again
      if (PERMS.map(planFor).sort((a, b) => a.score - b.score)[0].sorties.every(s => s.fits)) break;
    }
    if (!M.hab) M.hab = node(world.habitat.lat, world.habitat.lon, { hab: true, name: 'Habitat' });
    M.pins = []; M.which = 'all'; M.hold = true; M.placed = null; M.tab = 'loc';   // the astronaut waits at the landing point until the EVA is started
    placeHabitat(); replan();
    if (!first) { api.showToast(`Habitat deployed at ${M.hab.lat.toFixed(4)}°N ${M.hab.lon.toFixed(4)}°E — slope ${G.slope[M.hab.cell].toFixed(1)}°, ${world.terrain[digit(G.terrain, M.hab.cell)]}`); focusOverview(); }
  }

  // ---------------------------------------------------------------- hand the route to ARES
  function buildTimeline() {
    const tl = []; let cum = 0;
    M.plan.sorties.forEach((s, si) => { if (M.which !== 'all' && +M.which !== si) return; s.legs.forEach(l => { if (l.blocked) return; l.nodes.forEach((nd, q) => tl.push({ km: cum + l.km * (q + 1) / l.nodes.length, at: nd.at, sortie: si })); cum += l.km; }); });
    M.timeline = tl; M.routeKm = cum;
  }
  function routeWaypoints() {
    const wps = [], hu = unitsOf(M.hab.lat, M.hab.lon), list = M.plan.sorties.filter((_, i) => M.which === 'all' || +M.which === i);
    const habWp = () => ({ name: 'Habitat (random safe deployment, scenario)', type: 'BASE', tool: 'Crew habitat · airlock', x: hu.x, z: hu.z, label: 'HAB', mw: 'hab' });
    wps.push(habWp());
    list.forEach(s => s.legs.forEach(l => {
      for (let q = 2; q < l.cells.length - 1; q += 2) { const u = cellUnits(l.cells[q]); wps.push({ name: 'route', type: 'VIA', via: true, x: u.x, z: u.z }); }
      const B = l.to, u = unitsOf(B.lat, B.lon);
      if (B.hab) wps.push(habWp());
      else if (B.task) wps.push({ name: `Task ${B.task.n} · ${B.task.short}`, type: 'TASK', tool: B.task.tool, x: u.x, z: u.z, label: B.task.label, mw: B.task.id });
      else wps.push({ name: B.name, type: 'USER', tool: 'Custom waypoint', x: u.x, z: u.z, label: B.name.toUpperCase(), mw: 'pin' + B.id });
    }));
    return wps;
  }
  function applyRoute(wps = routeWaypoints()) {
    state.waypoints = wps; state.selectedWp = 0; state.evaProgress = 0; state.survivalRouteActive = false;
    if (state.astronautSpeed < .05) state.astronautSpeed = 1;
    if (M.hold) state.astronautSpeed = 0;
    api.rebuildRouteGeometry(); api.renderWaypointList(); rebuildHandles();
  }

  // ---------------------------------------------------------------- 3D: hazard overlay, rings, habitat, pin handles, labels
  const group = new THREE.Group(); group.visible = false; api.surfaceGroup.add(group);
  const ovCanvas = document.createElement('canvas'); ovCanvas.width = COLS; ovCanvas.height = ROWS;
  const ovTex = new THREE.CanvasTexture(ovCanvas); ovTex.colorSpace = THREE.SRGBColorSpace; ovTex.magFilter = THREE.LinearFilter; ovTex.minFilter = THREE.LinearFilter; ovTex.generateMipmaps = false;
  api.terrainUniforms.uMwHazard.value = ovTex; api.terrainUniforms.uMwHazardOn.value = 1;   // drawn inside the ARES terrain shader
  const hY = (x, z, lift = 0) => api.getSiteHeight(1, x, z) + lift;
  function drapeOverlay() {}
  function paintHazards() {
    const ctx = ovCanvas.getContext('2d'), img = ctx.createImageData(COLS, ROWS), d = img.data;
    for (let i = 0; i < N; i++) { const h = hz[i]; if (!h || !M.hazardOn[h] || G.landKm[i] > world.radiusKm) continue; const c = HZ[h].color, o = i * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = h === 1 ? 215 : 95; }   // estimated classes are drawn lighter than the real steep-slope class
    ctx.putImageData(img, 0, 0); ovTex.needsUpdate = true;
  }
  const ringGroup = new THREE.Group(); group.add(ringGroup);
  function ringMesh(lat, lon, km, color, r = .09, dashed = false) {
    const pts = []; for (let k = 0; k < 120; k++) { const a = k / 120 * Math.PI * 2, u = unitsOf(lat + km * Math.cos(a) / KLAT, lon + km * Math.sin(a) / KLON); pts.push(new THREE.Vector3(u.x, hY(clamp(u.x, -51.9, 51.9), clamp(u.z, -51.9, 51.9), .22), u.z)); }
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 240, r, 5, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: dashed ? .55 : .9 }));
    m.renderOrder = 3; return m;
  }
  function drawRings() {
    ringGroup.children.slice().forEach(c => { c.geometry.dispose(); c.material.dispose(); ringGroup.remove(c); });
    ringGroup.add(ringMesh(MISSION.center.lat, MISSION.center.lon, MISSION.radiusKm, 0xe2603a, .13));
    if (M.hab) { ringGroup.add(ringMesh(M.hab.lat, M.hab.lon, MISSION.walkKm, 0x5ef2ff)); ringGroup.add(ringMesh(M.hab.lat, M.hab.lon, MISSION.roverKm, 0xffd166)); }
    ringGroup.add(ringMesh(MISSION.center.lat, MISSION.center.lon, 1, 0xff5a5a, .05, true));
  }
  const habMesh = new THREE.Group();
  { const dome = new THREE.Mesh(new THREE.SphereGeometry(.9, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xe9eef2, metalness: .3, roughness: .45, emissive: 0x16404a }));
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.3, .12, 28), new THREE.MeshStandardMaterial({ color: 0x5ef2ff, emissive: 0x1d6f78 }));
    const lock = new THREE.Mesh(new THREE.CylinderGeometry(.24, .24, 1.3, 12), new THREE.MeshStandardMaterial({ color: 0xcfd6db })); lock.rotation.z = Math.PI / 2; lock.position.set(1.2, .28, 0);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 9, 6), new THREE.MeshBasicMaterial({ color: 0x5ef2ff, transparent: true, opacity: .5 })); beam.position.y = 4.5;
    habMesh.add(dome, pad, lock, beam); group.add(habMesh); }
  const landMesh = new THREE.Mesh(new THREE.OctahedronGeometry(.5), new THREE.MeshBasicMaterial({ color: 0xe2603a })); group.add(landMesh);
  function placeHabitat() { const u = unitsOf(M.hab.lat, M.hab.lon); habMesh.position.set(u.x, hY(u.x, u.z, .05), u.z); const c = unitsOf(MISSION.center.lat, MISSION.center.lon); landMesh.position.set(c.x, hY(c.x, c.z, 1.6), c.z); }
  const handleGroup = new THREE.Group(); group.add(handleGroup); let handles = [];
  function rebuildHandles() {
    handleGroup.children.slice().forEach(c => { c.geometry.dispose(); c.material.dispose(); handleGroup.remove(c); }); handles = [];
    for (const pin of M.pins) {
      const u = unitsOf(pin.lat, pin.lon), y = hY(u.x, u.z);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.95, .11, 8, 28), new THREE.MeshBasicMaterial({ color: 0xff7ad9, transparent: true, opacity: .95 })); ring.rotation.x = Math.PI / 2; ring.position.set(u.x, y + .2, u.z);
      const hit = new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 10), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(u.x, y + 1.6, u.z); hit.userData.pin = pin; ring.userData.pin = pin;
      handleGroup.add(ring, hit); handles.push(hit, ring); pin.ring = ring; pin.hit = hit;
    }
  }
  const labelLayer = document.createElement('div'); labelLayer.id = 'mw-labels'; document.body.appendChild(labelLayer);
  const mkLabel = (cls, html) => { const el = document.createElement('div'); el.className = 'mw-label ' + cls; el.innerHTML = html; labelLayer.appendChild(el); return el; };
  const lblLanding = mkLabel('land', '<b>PERSEVERANCE LANDING</b><span>real · 18.4447°N 77.4508°E</span>'), lblAdvice = mkLabel('advice', '');
  const v3 = new THREE.Vector3();
  function place(el, x, y, z, show) {
    v3.set(x, y, z).applyMatrix4(api.surfaceGroup.matrixWorld).project(api.camera);
    if (!show || v3.z > 1 || Math.abs(v3.x) > 1.05 || Math.abs(v3.y) > 1.05) { el.style.display = 'none'; return; }
    const r = api.renderer.domElement.getBoundingClientRect();
    el.style.display = ''; el.style.transform = `translate(${(r.left + (v3.x * .5 + .5) * r.width).toFixed(1)}px, ${(r.top + (-v3.y * .5 + .5) * r.height).toFixed(1)}px)`;
  }

  // ---------------------------------------------------------------- custom pins (click to drop, drag, delete)
  function addPin(lat, lon, { quiet = false } = {}) {
    if (!S.inGrid(lat, lon) || G.landKm[S.cellOf(lat, lon)] > world.radiusKm) { api.showToast('Outside the 20 km operational zone'); return null; }
    const raw = S.cellOf(lat, lon), inRed = hz[raw], pin = node(lat, lon, { id: ++M.pinSeq, pin: true });
    pin.name = `Pin ${pin.id}`;
    if (!isFinite(M.hab.tree.km[pin.cell])) { api.showToast('No safe route reaches that spot — pin not added'); return null; }
    M.pins.push(pin); replan();
    if (!quiet) api.showToast(inRed ? `⚠ Red zone: ${HZ[inRed].name}. Pin snapped ${Math.round(kmBetween(pin, { lat, lon }) * 1000)} m to the nearest safe ground and the route was recalculated.` : `${pin.name} added — route and telemetry recalculated`);
    return pin;
  }
  function movePin(pin, lat, lon) {
    const raw = S.cellOf(lat, lon), inRed = hz[raw], moved = node(lat, lon);
    if (G.landKm[raw] > world.radiusKm || !isFinite(M.hab.tree.km[moved.cell])) { api.showToast('That spot is outside the zone or unreachable — pin left where it was'); rebuildHandles(); return; }
    Object.assign(pin, { lat: moved.lat, lon: moved.lon, cell: moved.cell, tree: moved.tree }); replan();
    api.showToast(inRed ? `⚠ Red zone: ${HZ[inRed].name}. Pin snapped to the nearest safe ground.` : `${pin.name} moved — route recalculated`);
  }
  function removePin(id) { M.pins = M.pins.filter(p => p.id !== id); replan(); api.showToast('Pin removed — route recalculated'); }
  let drag = null; const cv = api.renderer.domElement;
  const active = () => state.siteIndex === 1 && state.mode !== 'orbital' && state.loadedSurfaceSite === 1;
  cv.addEventListener('pointerdown', e => {
    if (!active() || state.addWpMode || state.povMode !== 'free' || !handles.length) return;
    const hit = api.raycastObjects(e.clientX, e.clientY, handles)[0]; if (!hit) return;
    drag = { pin: hit.object.userData.pin, x: e.clientX, y: e.clientY, moved: false }; api.controls.enabled = false;
  }, true);
  addEventListener('pointermove', e => {
    if (!drag) return; if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) drag.moved = true; if (!drag.moved) return;
    const pt = api.intersectAt(e.clientX, e.clientY); if (!pt) return;
    const lp = api.surfaceGroup.worldToLocal(pt.clone()), y = hY(lp.x, lp.z); drag.pt = lp;
    drag.pin.ring.position.set(lp.x, y + .2, lp.z); drag.pin.hit.position.set(lp.x, y + 1.6, lp.z);
  });
  addEventListener('pointerup', () => {
    if (!drag) return; const d = drag; drag = null; api.controls.enabled = state.povMode === 'free';
    if (d.moved && d.pt) { const ll = REAL.toLatLon(d.pt.x, d.pt.z); movePin(d.pin, ll.lat, ll.lon); }
  });
  let tap = null; M.clickPlace = false;
  cv.addEventListener('pointerdown', e => { tap = { x: e.clientX, y: e.clientY, t: performance.now(), btn: e.button }; });
  cv.addEventListener('pointerup', e => {
    const t = tap; tap = null;
    if (!t || !M.clickPlace || !active() || state.mode !== 'hybrid' || state.addWpMode || state.povMode !== 'free' || drag || t.btn !== 0 || api.measuring()) return;
    if (Math.hypot(e.clientX - t.x, e.clientY - t.y) > 5 || performance.now() - t.t > 450) return;      // a drag or a long press is camera control
    if (api.raycastObjects(e.clientX, e.clientY, [...api.pinMeshes(), ...handles]).length) return;       // pins keep their own click
    const pt = api.intersectAt(e.clientX, e.clientY); if (!pt) return;
    const lp = api.surfaceGroup.worldToLocal(pt.clone()), ll = REAL.toLatLon(lp.x, lp.z); placeAstronaut(ll.lat, ll.lon, { fly: false });
  });
  cv.addEventListener('contextmenu', e => { if (!active() || !handles.length) return; const hit = api.raycastObjects(e.clientX, e.clientY, handles)[0]; if (hit) { e.preventDefault(); removePin(hit.object.userData.pin.id); } });

  // ---------------------------------------------------------------- live ML advisor at the astronaut
  let liveT = 0, live = null;
  function liveSample() {
    const p = api.astronautPosition(), ll = REAL.toLatLon(p.x, p.z), cell = S.cellOf(ll.lat, ll.lon);
    let at = { elapsed: 0, o2: 0, walked: 0, driven: 0 };
    if (M.placed && !M.emergency) at = M.placed.at;
    else if (!M.emergency && M.timeline.length) { const km = state.evaProgress * M.routeKm; at = (M.timeline.find(t => t.km >= km) || M.timeline[M.timeline.length - 1]).at; } else if (M.emergency) at = M.emergency.at;
    const a = aAt(cell), s = suitState(a, at), pr = S.predict(a, s), dec = S.decide(pr);
    live = { cell, ll, a, s, p: pr, dec, at, hazard: hz[cell] };
    return live;
  }
  function executeAdvice() {
    if (!live) return; const k = live.dec.key, from = snapSafe(live.cell);
    if (k === 'continue') { resume(); return; }
    if (k === 'rescue') { state.astronautSpeed = 0; M.emergency = { kind: k, at: live.at }; api.showToast('Holding position. Rover rescue called (scenario).'); renderPanel(); return; }
    let target = M.hab, name = 'Habitat', tr = M.hab.tree;
    if (k === 'shelter') { const sh = world.shelters[digit(G.shelter, from)]; target = node(sh.lat, sh.lon); tr = target.tree; name = `${sh.name} (scenario shelter L${sh.level})`; }
    const cells = pathCells(from, tr); if (!cells) { api.showToast('No safe route from here — hold position and call rescue'); return; }
    const su = cellUnits(from), tu = unitsOf(target.lat, target.lon), wps = [{ name: 'Emergency start', type: 'EVA', x: su.x, z: su.z, label: 'NOW' }];
    for (let q = 2; q < cells.length - 1; q += 2) { const u = cellUnits(cells[q]); wps.push({ name: 'route', type: 'VIA', via: true, x: u.x, z: u.z }); }
    wps.push({ name, type: k === 'shelter' ? 'SAFE' : 'BASE', x: tu.x, z: tu.z, label: k === 'shelter' ? 'SHELTER' : 'HAB' });
    M.emergency = { kind: k, at: live.at, name, km: tr.km[from] };
    applyRoute(wps); state.survivalRouteActive = true; state.astronautSpeed = k === 'rest' ? .6 : 1.4;
    api.showToast(`${ACTION_TEXT[k]} — ${tr.km[from].toFixed(1)} km to ${name}`); renderPanel();
  }
  function resume() { M.emergency = null; M.placed = null; applyRoute(); renderPanel(); }
  // ---------------------------------------------------------------- conditions panel (the 18 readings of the MARSWALK site)
  const posOf = (sp, v) => sp.log ? Math.log(v / sp.min) / Math.log(sp.max / sp.min) * 1000 : (v - sp.min) / (sp.max - sp.min) * 1000;
  const valOf = (sp, p) => { const v = sp.log ? sp.min * Math.pow(sp.max / sp.min, p / 1000) : sp.min + (sp.max - sp.min) * p / 1000; return sp.int ? Math.round(v) : v; };
  function fmtVal(k, v) {
    const sp = S.SPEC[k];
    if (k === 'time_h') { const h = Math.floor(v), m = Math.floor((v - h) * 60); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; }
    if (k === 'rover_ok') return v ? 'working' : 'BROKEN';
    if (k === 'storm_eta') return v >= 11.9 ? 'no storm' : `${v.toFixed(1)} h`;
    if (k === 'rad_usvh') return v >= 1000 ? `${(v / 1000).toFixed(1)} mSv/h` : `${v.toFixed(0)} µSv/h`;
    if (sp.int) return String(v);
    return `${v.toFixed(sp.max - sp.min <= 15 ? 1 : 0)} ${sp.unit}`;
  }
  /** Make the astronaut's current reading `key` equal `v` by editing the mission-wide conditions (all route nodes shift with it). */
  function setLive(key, v) {
    const l = live || liveSample(), c = M.cond, at = l.at, t = clamp(c.time_h + at.elapsed, 5, 20);
    if (key === 'time_h') c.time_h = v - at.elapsed;
    else if (key === 'wind_ms') c.wind_base = v / S.kWind(l.a, t);
    else if (key === 'rad_usvh') c.rad_base = v / S.kRad(l.a);
    else if (key === 'temp_c') c.temp_off = v - S.tempLocal(l.a, t);
    else if (key === 'eva_h') c.eva_off = v - at.elapsed;
    else if (key === 'walked_km') c.walked_off = v - at.walked;
    else if (key === 'driven_km') c.driven_off = v - at.driven;
    else if (key === 'o2_pct') c.o2_off = v - (100 - at.o2);
    else if (key === 'batt_pct') c.batt_off = v - (100 - MISSION.rates.battPctH * at.elapsed);
    else c[key] = v;
  }
  function resetKey(key) {
    const n = nominalCond(), c = M.cond, map = { time_h: 'time_h', wind_ms: 'wind_base', rad_usvh: 'rad_base', temp_c: 'temp_off', eva_h: 'eva_off', walked_km: 'walked_off', driven_km: 'driven_off', o2_pct: 'o2_off', batt_pct: 'batt_off' };
    const f = map[key] || key; c[f] = n[f];
  }
  let condTimer = 0, lastWx = 'clear';
  function condChanged({ now = false } = {}) {
    const l = liveSample(), wx = l.s.dust_tau > 2 ? 'haze' : l.s.rad_usvh > 300 ? 'storm' : 'clear';
    if (wx !== lastWx) { lastWx = wx; window.setWeatherPreset?.(wx); }
    clearTimeout(condTimer);
    const run = () => { const prev = M.plan.order.join('') + M.plan.sorties.length; replan({ apply: false, render: false }); if (state.siteIndex === 1 && !M.emergency && !M.placed && M.plan.order.join('') + M.plan.sorties.length !== prev) applyRoute(); };
    if (now) run(); else condTimer = setTimeout(run, 260);
  }
  function randomSituation() {
    const l = liveSample(), r = S.sampleB(l.a);
    M.cond = nominalCond(); live = l; for (const k of S.B_KEYS) setLive(k, r.s[k]);
    M.anomalies = r.families; condChanged({ now: true }); const n = liveSample(); renderPanel();
    api.showToast(`RANDOM: ${r.families.length ? r.families.map(f => S.cfg.families[f].label).join(' + ') : 'an ordinary day'} → advice: ${ACTION_TEXT[n.dec.key]} (${pct(n.p[n.dec.key])})`);
  }
  function toggleFamily(k) {
    const l = liveSample();
    if (M.anomalies.includes(k)) { M.anomalies = M.anomalies.filter(x => x !== k); for (const [key] of S.cfg.families[k].set) resetKey(key); }
    else { M.anomalies = [...M.anomalies, k]; const s2 = { ...l.s }; S.applyFamily(k, l.a, s2); for (const [key] of S.cfg.families[k].set) setLive(key, s2[key]); }
    condChanged({ now: true }); liveSample(); renderPanel();
  }
  function verdictBlock(l) {
    return `<div id="mw-cv" class="mw-verdict ${!l.dec.meets ? 'bad' : l.dec.key === 'continue' ? 'ok' : 'warn'}"><span>ADVICE AT THE ASTRONAUT</span><b>${ACTION_TEXT[l.dec.key]}</b><i>${l.dec.meets ? `${pct(l.p[l.dec.key])} predicted success · least disruptive option ≥ 85 %` : `no option reaches 85 % · best available ${pct(l.p[l.dec.key])}`}</i>
      <div class="mw-mini">${S.DECISION_ORDER.map(k => `<span class="${survCls(l.p[k])}">${ACTION_TEXT[k].split(/[ ,(—]/)[0]} ${Math.round(l.p[k] * 100)}</span>`).join('')}</div></div>`;
  }
  function condHtml() {
    const l = liveSample(), groups = { env: 'ENVIRONMENT', body: 'BODY', suit: 'SUIT' };
    let h = verdictBlock(l) + `<div class="mw-row"><button class="primary-btn" data-mw="random">RANDOM</button><button class="ghost-btn" data-mw="nominal">Nominal day</button></div>
      <div class="mw-title">EMERGENCY SCENARIOS</div><div class="mw-row tight">${Object.entries(S.cfg.families).map(([k, f]) => `<button class="mw-chip warnchip ${M.anomalies.includes(k) ? 'on' : ''}" data-mw="fam" data-v="${k}">${f.label}</button>`).join('')}</div>`;
    for (const [g, title] of Object.entries(groups)) {
      h += `<div class="mw-title mw-group"><span>${title}</span><span>band = normal</span></div>`;
      for (const sp of S.cfg.keys.filter(k => k.group === g)) {
        const v = l.s[sp.key], lo = clamp(posOf(sp, sp.normal[0]) / 10, 0, 100), hi = clamp(posOf(sp, sp.normal[1]) / 10, 0, 100), span = sp.max - sp.min;
        const out = v < sp.normal[0] - span * .001 || v > sp.normal[1] + span * .001;
        h += `<div class="mw-sl ${out ? 'out' : ''}" title="${esc(sp.src)}"><div><span>${esc(sp.label)}</span><b data-val="${sp.key}">${fmtVal(sp.key, v)}</b></div>
          <input type="range" min="0" max="1000" step="${sp.int ? 1000 / span : 1}" value="${posOf(sp, clamp(v, sp.min, sp.max)).toFixed(0)}" data-key="${sp.key}" style="--lo:${lo.toFixed(1)}%;--hi:${Math.max(hi, lo + 1.5).toFixed(1)}%" aria-label="${esc(sp.label)}"></div>`;
      }
    }
    return h + `<p class="mw-fine">These are the 18 readings the network receives (plus 35 location values from the map and 2 derived ones). Moving a slider changes the situation for the whole route, so the plan and every leg are re-scored.</p>`;
  }
  function syncCond(l) {
    const cv = panel.querySelector('#mw-cv'); if (cv) cv.outerHTML = verdictBlock(l);
    panel.querySelectorAll('[data-val]').forEach(b => { const k = b.dataset.val, sp = S.SPEC[k], v = l.s[k], span = sp.max - sp.min; b.textContent = fmtVal(k, v); b.closest('.mw-sl').classList.toggle('out', v < sp.normal[0] - span * .001 || v > sp.normal[1] + span * .001); });
    if (!panel.matches(':hover')) panel.querySelectorAll('input[data-key]').forEach(inp => { const sp = S.SPEC[inp.dataset.key]; inp.value = posOf(sp, clamp(l.s[inp.dataset.key], sp.min, sp.max)); });
  }
  // ---------------------------------------------------------------- place the astronaut at a chosen point + site facts
  const RING_TEXT = ['inside the 4 km walking ring', 'in the 4–8 km rover ring', 'beyond the 8 km rover range'];
  const CONF_TEXT = [, 'CTX 5 m imagery only', 'HiRISE 25 cm coverage', 'on the real rover track'];
  function placeAstronaut(lat, lon, { fly = true } = {}) {
    if (!S.inGrid(lat, lon) || G.landKm[S.cellOf(lat, lon)] > world.radiusKm) { api.showToast('That point is outside the 20 km operational zone'); return false; }
    const cell = S.cellOf(lat, lon), safe = snapSafe(cell), a = aAt(cell), foot = a.ring < 1;
    // a plausible suit state for having travelled here from the habitat (same rule as the training data)
    const walked = foot ? a.home_km * 1.4 + .3 : 1.5, driven = foot ? 0 : a.home_km * 1.2, elapsed = Math.min(7.8, (foot ? walked / 2.3 : driven / 8 + walked / 2.3) + .85);
    M.placed = { lat, lon, cell, at: { elapsed, o2: elapsed * 11.5, walked, driven } }; M.emergency = null;
    const u = unitsOf(lat, lon), hu = unitsOf(M.hab.lat, M.hab.lon), cells = pathCells(safe, M.hab.tree);
    const wps = [{ name: 'Astronaut position (set by you)', type: 'EVA', tool: 'Suit sensors', x: u.x, z: u.z, via: true, mw: 'here' }];   // no pin on top of the astronaut
    if (cells) for (let q = 2; q < cells.length - 1; q += 2) { const c = cellUnits(cells[q]); wps.push({ name: 'route', type: 'VIA', via: true, x: c.x, z: c.z }); }
    const same = Math.hypot(u.x - hu.x, u.z - hu.z) < .3;
    wps.push({ name: 'Habitat (random safe deployment, scenario)', type: 'BASE', tool: 'Crew habitat · airlock', x: hu.x + (same ? .6 : 0), z: hu.z, label: 'HAB', mw: 'hab' });
    applyRoute(wps); state.survivalRouteActive = true; state.astronautSpeed = 0; state.evaProgress = 0;
    M.tab = 'loc'; document.body.classList.add('mw-open'); live = null; renderPanel();
    if (fly) { const y = hY(u.x, u.z); api.animateCameraTo(new THREE.Vector3(u.x + 8, y + 9, u.z + 12), new THREE.Vector3(u.x, y + 1, u.z), 40); }
    api.showToast(`Astronaut placed at ${lat.toFixed(4)}°N ${lon.toFixed(4)}°E${hz[cell] ? ' — ⚠ inside a red zone: ' + HZ[hz[cell]].name : ''}`);
    return true;
  }
  function backToMission() { M.placed = null; M.emergency = null; applyRoute(); M.tab = 'mission'; renderPanel(); api.showToast('Mission plan restored'); }
  function locHtml() {
    let cell, ll, at;
    if (M.placed) { cell = M.placed.cell; ll = M.placed; at = M.placed.at; }
    else if (M.hold) { cell = M.hab.cell; ll = M.hab; at = { elapsed: 0, o2: 0, walked: 0, driven: 0 }; }   // waiting at the random landing point
    else { const l = live || liveSample(); cell = l.cell; ll = l.ll; at = l.at; }
    const a = aAt(cell), s = suitState(a, at), p = S.predict(a, s), dec = S.decide(p), info = S.cellInfo(cell), u = unitsOf(ll.lat, ll.lon), d = S.derived(a, s);
    const dHab = kmBetween(ll, M.hab), dLand = kmBetween(ll, MISSION.center), pathKm = M.hab.tree.km[snapSafe(cell)], h = hz[cell];
    const fact = (k, v, cls = '') => `<div><span>${k}</span><b class="${cls}" title="${esc(String(v))}">${v}</b></div>`;
    return `<div class="mw-hint"><b>Click anywhere on the terrain</b> to put the astronaut there and read that spot. Drag to rotate, scroll to zoom.<button class="mw-chip ${M.clickPlace ? 'on' : ''}" data-mw="clickplace">Click-to-place: ${M.clickPlace ? 'ON' : 'OFF'}</button></div>
      <div class="mw-row tight mw-coord"><input id="mw-lat" inputmode="decimal" placeholder="lat 18.4447" value="${M.placed ? M.placed.lat.toFixed(4) : ''}"><input id="mw-lon" inputmode="decimal" placeholder="lon 77.4508" value="${M.placed ? M.placed.lon.toFixed(4) : ''}"><button class="ghost-btn" data-mw="placell">Place</button><button class="ghost-btn" data-mw="placeland" title="Perseverance landing site">Landing site</button></div>
      <div class="mw-title">${M.placed ? 'ASTRONAUT IS HOLDING AT THIS POINT' : M.hold ? 'RANDOM LANDING POINT · ASTRONAUT AT THE HABITAT' : 'ASTRONAUT IS ON THE MISSION ROUTE (LIVE)'}</div>
      <div class="mw-place"><b>${esc(info.zone.name)}</b><span>${ll.lat.toFixed(4)}°N ${ll.lon.toFixed(4)}°E · zone outline approximate</span><p>${esc(info.zone.desc)}</p></div>
      <div class="mw-title">TERRAIN (REAL · CTX DEM)</div>
      <div class="mw-facts">${fact('Elevation', Math.round(REAL.elevM(u.x, u.z)).toLocaleString('en-US') + ' m')}${fact('Slope here', REAL.slopeDeg(u.x, u.z).toFixed(1) + '° · 200 m cell ' + info.slope.toFixed(1) + '°', info.slope > 20 ? 'bad' : info.slope > 12 ? 'warn' : '')}
        ${fact('Relief vs. surroundings', (info.tpi > 0 ? '+' : '') + info.tpi + ' m (1 km mean)')}${fact('Evening terrain shadow', info.shW.toFixed(1) + ' h lost before sunset')}</div>
      <div class="mw-title">SURFACE &amp; HAZARDS</div>
      <div class="mw-facts">${fact('Surface class', info.terrain + ' (estimated)')}${fact('Red zone', h ? HZ[h].name : 'none at this cell', h ? 'bad' : 'ok')}
        ${fact('Nearest hazard', info.nearestHazard + ' · ' + info.hazDist.toFixed(1) + ' km')}${fact('Rover access', info.rover ? 'reachable' : 'not reachable', info.rover ? '' : 'warn')}</div>
      <div class="mw-title">DISTANCES</div>
      <div class="mw-facts">${fact('Habitat', dHab.toFixed(1) + ' km straight · ' + (isFinite(pathKm) ? pathKm.toFixed(1) + ' km path' : 'no safe path'), isFinite(pathKm) ? '' : 'bad')}${fact('Range ring', RING_TEXT[a.ring], a.ring === 2 ? 'bad' : '')}
        ${fact('Climb on the way home', Math.round(a.home_climb_m) + ' m')}${fact('Nearest shelter (scenario)', info.shelter.name + ' · L' + info.shelter.level + ' · ' + info.shKm.toFixed(1) + ' km')}
        ${fact('Perseverance landing', dLand.toFixed(1) + ' km')}${fact('Data confidence', CONF_TEXT[info.conf])}</div>
      <div class="mw-title">CONDITIONS HERE, NOW</div>
      <div class="mw-facts four">${fact('Local time', fmtVal('time_h', s.time_h))}${fact('Daylight left', d.daylight.toFixed(1) + ' h')}${fact('Air temp.', s.temp_c.toFixed(0) + ' °C')}${fact('Wind', s.wind_ms.toFixed(0) + ' m/s')}
        ${fact('Radiation', fmtVal('rad_usvh', s.rad_usvh))}${fact('Dust τ', s.dust_tau.toFixed(1))}${fact('Suit O₂', Math.round(s.o2_pct) + ' %')}${fact('EVA time', s.eva_h.toFixed(1) + ' h')}</div>
      ${verdictBlock({ dec, p })}
      ${!M.placed ? `<div class="mw-title">OPTIMAL PLAN FROM THIS LANDING POINT</div><div class="mw-facts four">${fact('Task order', M.plan.order.map(i => 'T' + (i + 1)).join(' → '))}${fact('EVAs', M.plan.sorties.length)}${fact('Distance', M.plan.km.toFixed(1) + ' km')}${fact('Weakest leg', pct(M.plan.surv), survCls(M.plan.surv))}</div>
        <div class="mw-row">${M.hold ? '<button class="primary-btn" data-mw="startmission">Start the EVA (optimal route)</button>' : ''}<button class="ghost-btn" data-mw="tab" data-v="mission">See the full plan →</button><button class="ghost-btn" data-mw="redeploy">New random landing</button></div>` : ''}
      <div class="mw-row">${M.placed ? '<button class="ghost-btn" data-mw="walkhome">Walk home from here</button><button class="ghost-btn" data-mw="backmission">Back to mission plan</button>' : ''}<button class="ghost-btn" data-mw="tab" data-v="cond">Change conditions →</button></div>
      <p class="mw-fine">Elevation and slope are read from the real CTX elevation model. Surface class, zone names, shelters and the weather are scenario estimates. The suit state assumes the astronaut travelled here from the habitat.</p>`;
  }
  function stressTest() {
    const keys = Object.keys(ANOMALIES).sort(() => Math.random() - .5).slice(0, Math.random() < .3 ? 2 : 1);
    M.cond = nominalCond(); M.anomalies = keys; keys.forEach(applyAnomaly);
    window.setWeatherPreset?.(keys.includes('storm') ? 'haze' : keys.includes('sep') ? 'storm' : 'clear');
    const prev = M.plan.order.join(''); replan({ apply: false }); if (state.siteIndex === 1 && M.plan.order.join('') !== prev) applyRoute();
    const l = liveSample(); M.tab = 'advisor'; renderPanel();
    api.showToast(`STRESS TEST: ${keys.map(k => ANOMALIES[k]).join(' + ')} → advice: ${ACTION_TEXT[l.dec.key]} (${pct(l.p[l.dec.key])})`);
  }
  function clearAnomalies() { M.cond = nominalCond(); M.anomalies = []; window.setWeatherPreset?.('clear'); replan({ apply: !M.emergency && !M.placed }); api.showToast('Conditions back to nominal'); }

  // ---------------------------------------------------------------- UI
  const fmtH = h => isFinite(h) ? `${Math.floor(h)}h ${String(Math.round((h % 1) * 60)).padStart(2, '0')}m` : '—';
  const survCls = v => v >= .85 ? 'ok' : v >= .6 ? 'warn' : 'bad';
  const stopName = n => n.hab ? 'Habitat' : n.task ? `T${n.task.n}` : n.name;
  const panel = document.createElement('aside'); panel.id = 'mw-panel'; panel.setAttribute('aria-label','Marswalk mission planner'); panel.className = 'glass'; document.body.appendChild(panel);
  const modal = document.createElement('div'); modal.id = 'mw-modal'; document.body.appendChild(modal);
  const card = document.createElement('div'); card.id = 'mw-card'; card.className = 'glass'; document.body.appendChild(card);
  const openBtn = document.createElement('button'); openBtn.id = 'mw-open'; openBtn.className = 'seg-btn mw-open'; openBtn.textContent = 'MARSWALK Mission'; openBtn.title = 'Jezero mission: habitat, 3 EVA tasks, hazards, route planner, ML advisor';
  (document.querySelector('.mode-pill') || document.body).prepend(openBtn);
  function focusOverview() { api.animateCameraTo(new THREE.Vector3(-6, 46, 58), new THREE.Vector3(-4, 0, 2), 42); }
  function openMission() {
    if (state.siteIndex !== 1) window.selectSite('1');
    if (state.mode !== 'hybrid') window.setMode('hybrid');
    document.body.classList.add('mw-open'); renderPanel(); setTimeout(focusOverview, 250);
  }
  openBtn.addEventListener('click', () => document.body.classList.contains('mw-open') && active() ? document.body.classList.remove('mw-open') : openMission());
  // side tab: always visible on the Jezero surface while the panel is closed, so the ML panels are easy to find
  const sideTab = document.createElement('div'); sideTab.id = 'mw-side';
  sideTab.innerHTML = '<span>MARSWALK</span><button data-v="mission">Mission</button><button data-v="loc">Location · place astronaut</button><button data-v="cond">Conditions · RANDOM</button><button data-v="advisor">ML Advisor</button><button data-v="model">ML Data</button><button data-v="tasks">3 Tasks</button><button data-v="hazards">Red Zones</button>';
  document.body.appendChild(sideTab);
  sideTab.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; M.tab = b.dataset.v; document.body.classList.add('mw-open'); if (M.tab !== 'mission') liveSample(); renderPanel(); });
  let wasOn = false;

  function modelHtml() {
    const m = S.model.metrics, mae = Object.entries(m.mae), avg = mae.reduce((s, x) => s + x[1], 0) / mae.length, l = live || liveSample();
    const names = { continue: 'Continue', return: 'Return', shelter: 'Take cover', rescue: 'Call rescue', rest: 'Rest' };
    const x = Array.from(S.xVector(l.a, l.s)), xn = S.model.xNames, nA = S.model.aNames.length;
    const row = k => `<tr><td>${xn[k]}</td><td>${Math.abs(x[k]) >= 100 ? x[k].toFixed(0) : x[k].toFixed(2)}</td></tr>`;
    const idx = [...Array(xn.length).keys()];
    return `<div class="mw-facts four"><div><span>Training rows</span><b>${m.samples.toLocaleString('en-US')}</b></div><div><span>Runs / row</span><b>${m.monteCarloRuns}</b></div><div><span>Inputs</span><b>${xn.length}</b></div><div><span>Outputs</span><b>5</b></div>
      <div><span>Mean error</span><b>${(avg * 100).toFixed(1)} pts</b></div><div><span>Same advice</span><b>${pct(m.decisionAgreement ?? m.bestOptionAgreement)}</b></div><div><span>Near-best</span><b>${m.adviceNearBest != null ? pct(m.adviceNearBest) : '—'}</b></div><div><span>Test rows</span><b>${(m.testRows || 0).toLocaleString('en-US')}</b></div></div>
      <p class="mw-fine"><b>Network:</b> MLP ${m.architecture}, trained with scikit-learn, weights exported to JavaScript and run in this browser. <b>Real layers used in training:</b> ${(m.realLayers || []).join(', ') || 'none'}.</p>
      <div class="mw-title">ERROR PER OPTION (vs. the simulator, ${m.referenceRuns || '—'} reference runs)</div>
      ${mae.map(([k, v]) => `<div class="mw-bar"><span>${names[k] || k}</span><b>± ${(v * 100).toFixed(1)} pts</b><div class="noline"><i class="ok" style="width:${Math.min(100, v * 1000)}%"></i></div></div>`).join('')}
      <div class="mw-title">ERROR BY RING</div><div class="mw-facts four small"><div><span>&lt; 4 km</span><b>${(m.maeByRing[0] * 100).toFixed(1)} pts</b></div><div><span>4–8 km</span><b>${(m.maeByRing[1] * 100).toFixed(1)} pts</b></div><div><span>8–20 km</span><b>${(m.maeByRing[2] * 100).toFixed(1)} pts</b></div><div><span>Mean regret</span><b>${m.meanRegret != null ? (m.meanRegret * 100).toFixed(1) + ' pts' : '—'}</b></div></div>
      <div class="mw-title">LIVE INPUT VECTOR AT THE ASTRONAUT</div>
      <details class="mw-perms" open><summary>A · location — ${nA} values (from the 200 m map grid)</summary><table class="mw-legs">${idx.slice(0, nA).map(row).join('')}</table></details>
      <details class="mw-perms"><summary>B · conditions — ${xn.length - nA - 2} values (environment, body, suit)</summary><table class="mw-legs">${idx.slice(nA, xn.length - 2).map(row).join('')}</table></details>
      <details class="mw-perms"><summary>C · derived — 2 values</summary><table class="mw-legs">${idx.slice(xn.length - 2).map(row).join('')}</table></details>
      <p class="mw-fine">Labels come from a Monte Carlo EVA simulator, not from real outcomes. “Same advice” = how often the network picks the same option as the simulator under the 85 % rule; “near-best” = its pick is within 5 points of the best option. </p>
      <div class="mw-title">TRAINING DATA</div>
      <div class="mw-row"><button class="ghost-btn" data-mw="sample">Show 8 training rows</button><a class="ghost-btn mw-a" href="marswalk/training_data_sample.csv" download>Download sample (500 rows, CSV)</a></div>
      <div id="mw-sample">${M.sampleHtml || ''}</div>
      <div class="mw-title">WHERE THE MACHINE-LEARNING DATA LIVES</div>
      <table class="mw-legs mw-files"><tr><th>File</th><th>What it is</th></tr>
        <tr><td>marswalk/survivalModel.js</td><td>Network weights, input scaler, the metrics above <i>(used here)</i></td></tr>
        <tr><td>marswalk/jezeroWorld.js</td><td>200 m grid: 35 location features, paths, shelters <i>(used here)</i></td></tr>
        <tr><td>marswalk/bRanges.js</td><td>Ranges of the 18 condition readings + 9 emergency scenarios <i>(Conditions tab, RANDOM)</i></td></tr>
        <tr><td>js/marswalk-survival.js</td><td>Builds the A/B/C input vector, runs the network, applies the 85 % rule</td></tr>
        <tr><td>marswalk/training_data_sample.csv</td><td>First 500 of the ${m.samples.toLocaleString('en-US')} training rows</td></tr>
        <tr><td>training_data.csv · jezero_survival.py</td><td>Full table (29 MB) and the simulator + training script — in the project folder, not shipped with the site</td></tr>
        <tr><td>real/elev_m.npy · real/traverse.json</td><td>Real CTX elevation and rover track that the training grid was built from</td></tr></table>`;
  }
  async function showSample() {
    const box = panel.querySelector('#mw-sample'); if (!box) return; box.innerHTML = '<p class="mw-fine">Loading…</p>';
    try {
      const rows = (await (await fetch('marswalk/training_data_sample.csv')).text()).trim().split(/\r?\n/).map(r => r.split(',')), head = rows[0];
      const cols = ['slope_deg', 'home_km', 'shelter_km', 'ring', 'dust_tau', 'wind_ms', 'log10_rad', 'o2_pct', 'suit_kpa', 'Y_continue', 'Y_rest', 'Y_return', 'Y_shelter', 'Y_rescue', 'scenario'].filter(c => head.includes(c)), ix = cols.map(c => head.indexOf(c));
      M.sampleHtml = `<div class="mw-scroll"><table class="mw-legs"><tr>${cols.map(c => `<th>${c.replace('Y_', 'P ')}</th>`).join('')}</tr>${rows.slice(1, 9).map(r => `<tr>${ix.map((j, q) => `<td class="${cols[q].startsWith('Y_') ? survCls(+r[j]) : ''}">${cols[q] === 'scenario' ? esc(r[j]) : (+r[j]).toFixed(cols[q].startsWith('Y_') ? 2 : 1)}</td>`).join('')}</tr>`).join('')}</table></div>
        <p class="mw-fine">${cols.length} of ${head.length} columns shown: ${head.length - 6} inputs, 5 simulated success rates (the labels) and the scenario name. Each label is the share of ${S.model.metrics.monteCarloRuns} simulated EVAs that ended safely.</p>`;
      box.innerHTML = M.sampleHtml;
    } catch (err) { box.innerHTML = '<p class="mw-fine">Sample file not found.</p>'; }
  }
  function sortieHtml(s, i) {
    const sel = M.which !== 'all' && +M.which === i;
    return `<div class="mw-sortie ${sel ? 'sel' : ''}"><div class="mw-sortie-h"><b>EVA ${i + 1}</b><span>${s.mode === 'foot' ? 'on foot' : 'pressurized rover'} · ${s.km.toFixed(1)} km · ${fmtH(s.hours)} · O₂ left ${Math.round(s.o2End)} %</span>
      <span class="mw-pill ${s.fits && !s.outOfRange ? survCls(s.surv) : 'bad'}">${!s.ok ? 'NO ROUTE' : !s.fits ? 'OVER LIMIT' : s.outOfRange ? pct(s.surv) + ' · > 8 KM' : pct(s.surv)}</span></div>
      <table class="mw-legs"><tr><th>Leg</th><th>km</th><th>time</th><th>O₂ left</th><th>P(ok)</th></tr>${s.legs.map(l => `<tr><td>${stopName(l.from)} → ${stopName(l.to)}${l.work ? ` <i>+${Math.round(l.work * 60)} min work</i>` : ''}</td>
        <td>${isFinite(l.km) ? l.km.toFixed(1) : '—'}</td><td>${fmtH(l.elapsed)}</td><td>${isFinite(l.o2Left) ? Math.round(l.o2Left) + ' %' : '—'}</td><td class="${survCls(l.surv)}">${l.blocked ? 'blocked' : pct(l.surv)}</td></tr>`).join('')}</table></div>`;
  }
  function renderPanel() {
    if (!M.plan) return; const P = M.plan, tabs = [['mission', 'Mission'], ['loc', 'Location'], ['tasks', '3 Tasks'], ['advisor', 'ML Advisor'], ['cond', 'Conditions'], ['model', 'ML Data'], ['hazards', 'Red Zones']];
    let body = '';
    if (M.tab === 'mission') {
      const why = P.sorties.length > 1
        ? `From this habitat one EVA covering all stops would take <b>${fmtH(P.single.hours)}</b> and end with <b>${Math.round(P.single.o2End)} % O₂</b> and a weakest-leg success of <b>${pct(P.single.surv)}</b> (limits: ${MISSION.limits.sortieHours} h, ${MISSION.limits.o2ReservePct} % O₂ reserve, ≥ ${Math.round(MISSION.limits.minSuccess * 100)} % success), so the planner split the work into <b>${P.sorties.length} sorties</b>, each starting and ending at the habitat.`
        : `All stops fit in a single EVA: ${fmtH(P.single.hours)}, ${Math.round(P.single.o2End)} % O₂ left (limits: ${MISSION.limits.sortieHours} h, ${MISSION.limits.o2ReservePct} % reserve).`;
      body = `<div class="mw-facts"><div><span>Landing point = habitat (random)</span><b>${M.hab.lat.toFixed(4)}°N ${M.hab.lon.toFixed(4)}°E</b></div><div><span>Site check</span><b>slope ${G.slope[M.hab.cell].toFixed(1)}° · ${world.terrain[digit(G.terrain, M.hab.cell)]} · no red zone</b></div></div>
        <div class="mw-row"><button class="primary-btn" data-mw="redeploy">Re-deploy habitat</button><button class="ghost-btn" data-mw="reset">Reset to optimal route</button></div>
        <div class="mw-title">OPTIMAL PLAN · ORDER ${P.order.map(i => 'T' + (i + 1)).join(' → ')}</div>
        <div class="mw-facts four"><div><span>Distance</span><b>${P.km.toFixed(1)} km</b></div><div><span>EVA time</span><b>${fmtH(P.hours)}</b></div><div><span>O₂ used</span><b>${Math.round(P.o2Used)} %</b></div><div><span>Weakest leg</span><b class="${survCls(P.surv)}">${pct(P.surv)}</b></div></div>
        <p class="mw-fine">${why}</p>
        <div class="mw-row tight"><span class="mw-dim">Show on map:</span><button class="mw-chip ${M.which === 'all' ? 'on' : ''}" data-mw="which" data-v="all">All</button>${P.sorties.map((_, i) => `<button class="mw-chip ${+M.which === i && M.which !== 'all' ? 'on' : ''}" data-mw="which" data-v="${i}">EVA ${i + 1}</button>`).join('')}</div>
        ${P.sorties.map(sortieHtml).join('')}
        <div class="mw-title">CUSTOM WAYPOINTS</div>
        <div class="mw-row"><button class="ghost-btn" data-mw="addpin">+ Click terrain to drop pin</button></div>
        ${M.pins.length ? M.pins.map(p => `<div class="mw-pin"><span>${p.name} · ${p.lat.toFixed(4)}°N ${p.lon.toFixed(4)}°E${p.snapped ? ' · snapped to safe ground' : ''}</span><button data-mw="delpin" data-v="${p.id}" title="Delete pin">✕</button></div>`).join('') : '<p class="mw-fine">Drop a pin, drag its pink ring to move it, right-click the ring or press ✕ to delete. The route and all telemetry are recalculated each time.</p>'}
        <details class="mw-perms"><summary>All 6 task orders evaluated</summary><table class="mw-legs"><tr><th>Order</th><th>EVAs</th><th>km</th><th>time</th><th>O₂ used</th><th>P(ok)</th></tr>
        ${M.perms.map((q, k) => `<tr class="${k === 0 ? 'best' : ''}"><td>${q.order.map(i => 'T' + (i + 1)).join('→')}${k === 0 ? ' ★' : ''}</td><td>${q.sorties.length}</td><td>${q.km.toFixed(1)}</td><td>${fmtH(q.hours)}</td><td>${Math.round(q.o2Used)} %</td><td class="${survCls(q.surv)}">${pct(q.surv)}</td></tr>`).join('')}</table>
        <p class="mw-fine">Score = time + distance/8 + O₂/25 + 8·(1 − P) + 1.5 per extra sortie; the lowest wins. P(ok) is the model's lowest “continue” success along the route.</p></details>`;
    } else if (M.tab === 'tasks') {
      body = M.tasks.map(t => { const T = t.task, d = kmBetween(t, M.hab);
        return `<div class="mw-task" data-task="${T.id}"><div class="mw-task-h"><b>TASK ${T.n}</b><span>${esc(T.short)}</span><button class="mw-chip" data-mw="gotask" data-v="${T.id}">Show</button></div>
          <div class="mw-dim">${esc(T.where)} · ${T.lat.toFixed(4)}°N ${T.lon.toFixed(4)}°E <i>(${T.coordNote})</i> · ${d.toFixed(1)} km from habitat (${d < MISSION.walkKm ? 'walking range' : d <= MISSION.roverKm ? 'rover range' : 'out of range'}) · slope ${G.slope[t.cell].toFixed(1)}°</div>
          <p><b>Real problem.</b> ${esc(T.problem)}</p><p><b>Why a robot cannot.</b> ${esc(T.robot)}</p><p><b>Human task.</b> ${esc(T.human)}</p><p><b>Risk.</b> ${esc(T.risk)}</p></div>`; }).join('');
    } else if (!panel.contains(document.activeElement) && M.tab === 'advisor') {
      const l = live || liveSample(), order = S.DECISION_ORDER;
      body = `<div class="mw-verdict ${!l.dec.meets ? 'bad' : l.dec.key === 'continue' ? 'ok' : 'warn'}"><span>ADVICE AT THE ASTRONAUT</span><b>${ACTION_TEXT[l.dec.key]}</b><i>${l.dec.meets ? `${pct(l.p[l.dec.key])} predicted success · least disruptive option ≥ 85 %` : `no option reaches 85 % · best available ${pct(l.p[l.dec.key])}`}</i></div>
        <div id="mw-bars">${order.map(k => `<div class="mw-bar ${k === l.dec.key ? 'best' : ''}"><span>${ACTION_TEXT[k]}</span><b>${pct(l.p[k])}</b><div><i style="width:${(l.p[k] * 100).toFixed(1)}%" class="${survCls(l.p[k])}"></i></div></div>`).join('')}</div>
        <div class="mw-row"><button class="primary-btn" data-mw="stress">RANDOM / STRESS TEST</button><button class="ghost-btn" data-mw="clear">Nominal</button><button class="ghost-btn" data-mw="tab" data-v="cond">All 18 readings →</button></div>
        <div class="mw-row tight">${M.anomalies.length ? M.anomalies.map(k => `<span class="mw-pill bad">${S.cfg.families[k].label}</span>`).join('') : '<span class="mw-pill ok">No anomaly</span>'}</div>
        ${M.emergency ? `<div class="mw-row"><button class="primary-btn" data-mw="resume">Resume mission plan</button></div><p class="mw-fine">Emergency action in progress: ${ACTION_TEXT[M.emergency.kind]}${M.emergency.name ? ` → ${esc(M.emergency.name)}` : ''}.</p>`
          : l.dec.key !== 'continue' ? `<div class="mw-row"><button class="primary-btn" data-mw="execute">Execute: ${ACTION_TEXT[l.dec.key]}</button></div>` : ''}
        <div class="mw-facts four small"><div><span>Slope</span><b>${l.a.slope_deg.toFixed(1)}°</b></div><div><span>Home path</span><b>${l.a.home_km.toFixed(1)} km</b></div><div><span>Shelter</span><b>${l.a.shelter_km.toFixed(1)} km</b></div><div><span>Suit O₂</span><b>${Math.round(l.s.o2_pct)} %</b></div>
          <div><span>Dust τ</span><b>${l.s.dust_tau.toFixed(1)}</b></div><div><span>Wind</span><b>${l.s.wind_ms.toFixed(0)} m/s</b></div><div><span>Radiation</span><b>${l.s.rad_usvh >= 1000 ? (l.s.rad_usvh / 1000).toFixed(1) + ' mSv/h' : l.s.rad_usvh.toFixed(0) + ' µSv/h'}</b></div><div><span>Suit press.</span><b>${l.s.suit_kpa.toFixed(1)} kPa</b></div></div>
        <p class="mw-fine">A neural network (${S.model.metrics.architecture}) runs in your browser at every route node. It was trained on ${S.model.metrics.samples.toLocaleString('en-US')} <b>simulated</b> EVAs — see the ⓘ note.</p>`;
    } else if (!panel.contains(document.activeElement) && M.tab === 'loc') {
      body = locHtml();
    } else if (M.tab === 'cond') {
      body = condHtml();
    } else if (M.tab === 'model') {
      body = modelHtml();
    } else {
      body = `<p class="mw-fine">Red zones are drawn on the 3D terrain. The route planner never crosses them, and a pin dropped inside one snaps to the nearest safe ground.</p>
        ${[1, 2, 3].map(k => `<label class="mw-hz"><input type="checkbox" data-mw="hz" data-v="${k}" ${M.hazardOn[k] ? 'checked' : ''}><i style="background:rgb(${HZ[k].color})"></i><span><b>${HZ[k].name}</b><em>${HZ[k].note}</em></span></label>`).join('')}
        <div class="mw-facts four small"><div><span>Steep cells</span><b>${M.hzCount[1]}</b></div><div><span>Sand cells</span><b>${M.hzCount[2]}</b></div><div><span>Rock cells</span><b>${M.hzCount[3]}</b></div><div><span>Cell size</span><b>200 m</b></div></div>
        <p class="mw-fine">Rings: cyan 4 km walking limit and yellow 8 km rover range around the habitat; orange 20 km operational zone and dashed red 1 km landing blast zone around the Perseverance landing site.</p>`;
    }
    sideTab.querySelectorAll('button').forEach(b => b.classList.toggle('on', document.body.classList.contains('mw-open') && b.dataset.v === M.tab));
    panel.innerHTML = `<div class="mw-head"><div><span class="mw-kicker">MARSWALK · JEZERO MISSION</span><b>3 human EVA tasks · 20 km zone</b></div><div><button data-mw="info" title="What is real and what is simulated">ⓘ</button><button data-mw="close" title="Close">✕</button></div></div>
      <div class="mw-tabs">${tabs.map(([k, t]) => `<button class="${M.tab === k ? 'on' : ''}" data-mw="tab" data-v="${k}">${t}</button>`).join('')}</div><div class="mw-body">${body}</div>`;
  }
  panel.addEventListener('click', e => {
    const b = e.target.closest('[data-mw]'); if (!b || b.tagName === 'INPUT') return; const a = b.dataset.mw, v = b.dataset.v;
    if (a === 'tab') { M.tab = v; if (v === 'advisor') liveSample(); renderPanel(); }
    else if (a === 'close') { document.body.classList.remove('mw-open'); sideTab.querySelectorAll('button').forEach(b => b.classList.remove('on')); }
    else if (a === 'info') showDisclaimer();
    else if (a === 'redeploy') { M.hab = null; deployHabitat(); }
    else if (a === 'reset') resetOptimal();
    else if (a === 'which') { M.which = v; buildTimeline(); applyRoute(); renderPanel(); }
    else if (a === 'addpin') { M.placeMode = false; if (!state.addWpMode) window.toggleAddWaypoint(); }
    else if (a === 'place') { M.placeMode = true; if (!state.addWpMode) window.toggleAddWaypoint(); renderPanel(); api.showToast('Click the terrain where the astronaut should stand'); }
    else if (a === 'placell') { const la = parseFloat(panel.querySelector('#mw-lat').value), lo = parseFloat(panel.querySelector('#mw-lon').value); if (isFinite(la) && isFinite(lo)) placeAstronaut(la, lo); else api.showToast('Enter latitude and longitude in degrees, e.g. 18.4447 and 77.4508'); }
    else if (a === 'placeland') placeAstronaut(MISSION.center.lat, MISSION.center.lon);
    else if (a === 'clickplace') { M.clickPlace = !M.clickPlace; renderPanel(); }
    else if (a === 'walkhome') { state.astronautSpeed = 1; api.showToast('Walking the safe route back to the habitat'); }
    else if (a === 'backmission') backToMission();
    else if (a === 'startmission') { M.hold = false; state.astronautSpeed = 1; M.tab = 'mission'; renderPanel(); api.showToast(`EVA started: ${M.plan.order.map(i => 'T' + (i + 1)).join(' → ')} in ${M.plan.sorties.length} sortie${M.plan.sorties.length > 1 ? 's' : ''}`); }
    else if (a === 'delpin') removePin(+v);
    else if (a === 'gotask') showTask(v, true);
    else if (a === 'random') randomSituation(); else if (a === 'nominal') clearAnomalies(); else if (a === 'fam') toggleFamily(v);
    else if (a === 'sample') showSample();
    else if (a === 'stress') stressTest(); else if (a === 'clear') clearAnomalies();
    else if (a === 'execute') executeAdvice(); else if (a === 'resume') resume();
  });
  panel.addEventListener('input', e => { const k = e.target.dataset && e.target.dataset.key; if (!k) return; setLive(k, valOf(S.SPEC[k], +e.target.value)); const l = liveSample(); syncCond(l); condChanged(); });
  panel.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.key) { condChanged({ now: true }); renderPanel(); } });
  panel.addEventListener('change', e => { const b = e.target.closest('[data-mw=hz]'); if (b) { M.hazardOn[+b.dataset.v] = b.checked; paintHazards(); } });
  function resetOptimal() { M.pins = []; M.which = 'all'; M.emergency = null; replan(); api.showToast(`Optimal route restored: ${M.plan.order.map(i => 'T' + (i + 1)).join(' → ')} in ${M.plan.sorties.length} EVA${M.plan.sorties.length > 1 ? 's' : ''}`); }
  function showTask(id, fly = false) {
    const t = M.tasks.find(x => x.task.id === id); if (!t) return; const T = t.task, d = kmBetween(t, M.hab);
    card.innerHTML = `<button data-x>✕</button><span class="mw-kicker">TASK ${T.n} · HUMAN-ONLY EVA · ${T.coordNote.toUpperCase()}</span><b>${esc(T.short)}</b>
      <div class="mw-dim">${T.lat.toFixed(4)}°N ${T.lon.toFixed(4)}°E · ${d.toFixed(1)} km from habitat · slope ${G.slope[t.cell].toFixed(1)}° (CTX DEM) · ${T.minutes} min on site</div>
      <p>${esc(T.problem)}</p><p><b>Human task:</b> ${esc(T.human)}</p><p class="mw-warn"><b>Risk:</b> ${esc(T.risk)}</p>`;
    card.classList.add('show');
    if (fly) { const u = unitsOf(t.lat, t.lon), y = hY(u.x, u.z); api.animateCameraTo(new THREE.Vector3(u.x + 9, y + 9, u.z + 12), new THREE.Vector3(u.x, y, u.z), 40); }
  }
  card.addEventListener('click', e => { if (e.target.closest('[data-x]')) card.classList.remove('show'); });
  addEventListener('ares:wp-focus', e => { const mw = e.detail.wp && e.detail.wp.mw; if (state.siteIndex === 1 && mw && /^t\d$/.test(mw)) showTask(mw); });
  function showDisclaimer() {
    modal.innerHTML = `<div class="mw-modal-card glass"><button data-x>✕</button><span class="mw-kicker">HONEST SCIENTIFIC NOTE</span><h2>What is real, and what is a scenario</h2><ul>
      <li><b>Probabilities are simulation estimates.</b> The neural network was trained on a Monte Carlo EVA simulator tuned with real figures (Apollo metabolic rates, 0.38 g walking, suit pressure 29.6 kPa, Curiosity RAD radiation, Perseverance MEDA weather). They are heuristic estimates, not physical guarantees — nobody has walked on Mars.</li>
      <li><b>Task coordinates and shelters are mission scenarios.</b> The habitat is dropped at a random safe cell; shelters are invented. Task 1 is a scenario dig point; Task 2 and Task 3 coordinates are approximate.</li>
      <li><b>Task 2 looks for potential biosignatures</b> in the “leopard spot” mudstone at Cheyava Falls. It is not confirmed life.</li>
      <li><b>Figures taken from NASA mission results:</b> perchlorate about 0.5–1 % of the soil (Phoenix), the rover drill reaching about 6 cm versus a ~2 m human hand drill, and 10 sample tubes at the Three Forks depot. The team still has to re-check each figure against the pages below before publication.</li>
      <li><b>Real data:</b> elevation and slope (USGS CTX DEM, 20 m), imagery (CTX mosaic), steep-slope red zones. <b>Estimated:</b> sand-trap and sharp-rock zones (no THEMIS thermal-inertia grid is loaded yet), surface class, weather.</li></ul>
      <div class="mw-refs"><a target="_blank" rel="noopener" href="https://mars.nasa.gov/mars2020/mission/science/landing-site/">Jezero landing site &amp; science goals</a><a target="_blank" rel="noopener" href="https://mars.nasa.gov/mars2020/spacecraft/rover/sals/">Sample caching &amp; Three Forks depot</a>
      <a target="_blank" rel="noopener" href="https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/MARS/phoenix.html">Phoenix data (perchlorate)</a><a target="_blank" rel="noopener" href="https://mars.nasa.gov/mer/mission/status/spirit/">Spirit sand-trap lessons</a></div>
      <p class="mw-fine">Student prototype for NASA Space Apps 2026. Not an operational navigation or safety tool. No NASA endorsement implied.</p></div>`;
    modal.classList.add('show');
  }
  modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('[data-x]')) modal.classList.remove('show'); });

  // ---------------------------------------------------------------- boot + per-frame
  M.cond = nominalCond();
  M.tasks = TASKS.map(t => node(t.lat, t.lon, { task: t }));
  M.hzCount = [0, 0, 0, 0]; for (let i = 0; i < N; i++) if (G.landKm[i] <= world.radiusKm) M.hzCount[hz[i]]++;
  drapeOverlay(); paintHazards(); deployHabitat(true);

  return {
    update(dt) {
      const on = active(); group.visible = on && state.mode === 'hybrid';
      if (on && !wasOn) { document.body.classList.add('mw-open'); renderPanel(); }   // entering Jezero by any route opens the panel
      wasOn = on;
      document.body.classList.toggle('mw-live', on);
      if (!on) { lblLanding.style.display = lblAdvice.style.display = 'none'; card.classList.remove('show'); return; }
      const c = landMesh.position; landMesh.rotation.y += dt; place(lblLanding, c.x, c.y + 1, c.z, true);
      liveT += dt;
      if (liveT > .5) {
        liveT = 0; const l = liveSample(), k = l.dec.key;
        lblAdvice.className = 'mw-label advice ' + (!l.dec.meets ? 'bad' : k === 'continue' ? 'ok' : 'warn');
        lblAdvice.innerHTML = `<b>ML: ${ACTION_TEXT[k].toUpperCase()}</b><span>${pct(l.p[k])} · continue ${pct(l.p.continue)}</span>`;
        if (!panel.contains(document.activeElement) && M.tab === 'advisor' && document.body.classList.contains('mw-open') && !panel.matches(':hover')) renderPanel();
        if (M.tab === 'cond' && document.body.classList.contains('mw-open')) syncCond(l);
        if (!panel.contains(document.activeElement) && M.tab === 'loc' && document.body.classList.contains('mw-open') && !panel.matches(':hover') && (!M.placed || state.astronautSpeed > .05)) renderPanel();
        if (state.mode === 'hybrid') api.particleUniforms.uOpacityScale.value = 0;
      }
      const p = api.astronautPosition(); place(lblAdvice, p.x, p.y + 6.2, p.z, true);
    },
    onRelief() { drapeOverlay(); drawRings(); placeHabitat(); rebuildHandles(); },
    routeWaypoints, resetOptimal,
    addPinUnits(x, z) { const ll = REAL.toLatLon(x, z); if (M.placeMode) { M.placeMode = false; placeAstronaut(ll.lat, ll.lon); } else addPin(ll.lat, ll.lon); document.body.classList.add('mw-open'); },
    placeAstronaut, backToMission,
    get mission() { return M; }, group, ringGroup, addPin, removePin, movePin, stressTest, deployHabitat, openMission, liveSample,
  };
}
