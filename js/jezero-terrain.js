/**
 * Jezero numerical terrain adapter. Local coordinates are kilometres, +X east,
 * +Z south; heights stay in source metres. Display exaggeration never enters
 * the sampler, route costs, slope, distance or resource estimates.
 */
const DEG = Math.PI / 180;
const yieldFrame = () => new Promise(resolve => setTimeout(resolve, 0));
const routeGridCache = new WeakMap();

export function createTerrain(meta, buffer, validityBuffer) {
  const n = meta.n;
  if (!Number.isInteger(n) || n < 2 || n > 4097) throw Error('Invalid terrain grid dimensions.');
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const mask = validityBuffer instanceof ArrayBuffer ? new Uint8Array(validityBuffer) : validityBuffer;
  if (bytes.byteLength !== n * n * 2 || !mask || mask.length !== n * n) throw Error('Terrain height and validity grids do not match.');
  const b = meta.bounds;
  if (![meta.min, meta.max, meta.lat0, meta.lon0, meta.kmPerDegLat, meta.kmPerDegLon, b?.north, b?.south, b?.east, b?.west].every(Number.isFinite) || meta.max < meta.min || b.north <= b.south || b.east <= b.west || meta.kmPerDegLat <= 0 || meta.kmPerDegLon <= 0) throw Error('Invalid terrain coordinate metadata.');
  // Decode explicitly as little-endian: portable to platforms with either host endianness.
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const heights = new Float32Array(n * n), scale = (meta.max - meta.min) / 65535;
  for (let i = 0; i < heights.length; i++) heights[i] = meta.min + view.getUint16(i * 2, true) * scale;
  const xMin = (b.west - meta.lon0) * meta.kmPerDegLon;
  const xMax = (b.east - meta.lon0) * meta.kmPerDegLon;
  const zMin = (meta.lat0 - b.north) * meta.kmPerDegLat;
  const zMax = (meta.lat0 - b.south) * meta.kmPerDegLat;
  const width = xMax - xMin, depth = zMax - zMin;
  const sampleSpacingX = width / (n - 1), sampleSpacingZ = depth / (n - 1);
  function elevation(x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z) || x < xMin || x > xMax || z < zMin || z > zMax) return null;
    const u = (x - xMin) / width * (n - 1), v = (z - zMin) / depth * (n - 1);
    const col = Math.min(n - 2, Math.floor(u)), row = Math.min(n - 2, Math.floor(v));
    const fx = u - col, fz = v - row, i = row * n + col;
    // Do not interpolate across gaps, even when an invalid corner's weight is zero.
    if (!mask[i] || !mask[i + 1] || !mask[i + n] || !mask[i + n + 1]) return null;
    return (heights[i] * (1 - fx) + heights[i + 1] * fx) * (1 - fz) +
      (heights[i + n] * (1 - fx) + heights[i + n + 1] * fx) * fz;
  }
  function sample(x, z) {
    const h = elevation(x, z);
    if (h === null) return { elevation: null, slope: null, valid: false };
    // Approximately 100 m central-difference baseline; one-sided at map edges.
    const e = 0.05, xl = Math.max(xMin, x - e), xr = Math.min(xMax, x + e);
    const zn = Math.max(zMin, z - e), zs = Math.min(zMax, z + e);
    const l = elevation(xl, z), r = elevation(xr, z), north = elevation(x, zn), south = elevation(x, zs);
    const slope = [l, r, north, south].some(h => h === null) ? null : Math.atan(Math.hypot((r - l) / ((xr - xl) * 1000), (south - north) / ((zs - zn) * 1000))) / DEG;
    return { elevation: h, slope, valid: true };
  }
  return {
    n, width, depth, xMin, xMax, zMin, zMax, sampleSpacingX, sampleSpacingZ, sample,
    toGeo: (x, z) => ({ lat: meta.lat0 - z / meta.kmPerDegLat, lon: meta.lon0 + x / meta.kmPerDegLon }),
    fromGeo: (lat, lon) => ({ x: (lon - meta.lon0) * meta.kmPerDegLon, z: (meta.lat0 - lat) * meta.kmPerDegLat }),
  };
}

/** Route measurements are physical; hours and O2 are explicitly assumed scenarios. */
export function routeMetrics(points, terrain, { speedKmh = 2.3, o2PerHour = 12.5 } = {}) {
  if (!Array.isArray(points) || points.length < 2 || !Number.isFinite(speedKmh) || speedKmh <= 0 || !Number.isFinite(o2PerHour) || o2PerHour < 0) return null;
  let distanceKm = 0, ascentM = 0, maxSlope = 0;
  let previous = null;
  const step = Math.min(0.05, terrain.sampleSpacingX || 0.05, terrain.sampleSpacingZ || 0.05);
  function accumulate(point) {
    const s = terrain.sample(point.x, point.z);
    if (!s.valid || !Number.isFinite(s.elevation) || !Number.isFinite(s.slope)) return false;
    maxSlope = Math.max(maxSlope, s.slope);
    if (previous) {
      const rise = s.elevation - previous.elevation;
      distanceKm += Math.hypot(point.x - previous.x, point.z - previous.z, rise / 1000);
      ascentM += Math.max(0, rise);
    }
    previous = { ...point, elevation: s.elevation };
    return true;
  }
  if (!accumulate(points[0])) return null;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / step));
    for (let k = 1; k <= steps; k++) {
      const t = k / steps;
      if (!accumulate({x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t})) return null;
    }
  }
  if (distanceKm <= 0) return null;
  const hours = distanceKm / speedKmh;
  return { distanceKm, ascentM, maxSlope, hours, o2Percent: hours * o2PerHour,
    assumptions: { speedKmh, o2PerHour }, classification: 'Derived terrain route; EVA consumption is simulated' };
}

class MinHeap {
  constructor() { this.items = []; }
  push(id, score) {
    const a = this.items; let i = a.length; a.push({ id, score });
    while (i) { const p = (i - 1) >> 1; if (a[p].score <= score) break; a[i] = a[p]; i = p; }
    a[i] = { id, score };
  }
  pop() {
    const a = this.items, first = a[0], last = a.pop();
    if (a.length) { let i = 0; while (i * 2 + 1 < a.length) { let c = i * 2 + 1; if (c + 1 < a.length && a[c + 1].score < a[c].score) c++; if (a[c].score >= last.score) break; a[i] = a[c]; i = c; } a[i] = last; }
    return first;
  }
  get length() { return this.items.length; }
}

/**
 * Coarse, slope-weighted A* on a 201×201 grid (about 202 m at Jezero).
 * This is a terrain-screening demonstration, not a certified traversability map.
 * Subgrid segments are sampled at <=50 m (or the numerical grid pitch).
 */
export async function planTerrainRoute(start, end, terrain) {
  const n = 201, count = n * n, dx = terrain.width / (n - 1), dz = terrain.depth / (n - 1);
  const sampleStep = Math.min(0.05, terrain.sampleSpacingX || 0.05, terrain.sampleSpacingZ || 0.05);
  const usable = s => s.valid && Number.isFinite(s.elevation) && Number.isFinite(s.slope) && s.slope <= 20;
  if (!start || !end || !usable(terrain.sample(start.x, start.z)) || !usable(terrain.sample(end.x, end.z))) throw Error('Choose endpoints with valid terrain and slope at or below 20°.');
  const pointAt = id => ({ x: terrain.xMin + (id % n) * dx, z: terrain.zMin + Math.floor(id / n) * dz });
  const idAt = p => Math.round((p.z - terrain.zMin) / dz) * n + Math.round((p.x - terrain.xMin) / dx);
  if (Math.hypot(start.x - end.x, start.z - end.z) < 1e-6) throw Error('Choose two different route endpoints.');
  const first = idAt(start), last = idAt(end);
  // Terrain is immutable; successive endpoint changes reuse the numerical grid.
  // Cache the promise as well, so simultaneous requests cannot build it twice.
  let cached = routeGridCache.get(terrain);
  if (!cached) {
    cached = (async () => {
      const slope = new Float32Array(count), height = new Float32Array(count), valid = new Uint8Array(count);
      for (let i = 0; i < count; i++) {
        const p = pointAt(i), s = terrain.sample(p.x, p.z);
        if (usable(s)) { valid[i] = 1; slope[i] = s.slope; height[i] = s.elevation; }
        if (i % 500 === 499) await yieldFrame();
      }
      return { slope, height, valid };
    })();
    routeGridCache.set(terrain, cached);
  }
  let grid;
  try { grid = await cached; } catch (error) { routeGridCache.delete(terrain); throw error; }
  const { slope, height, valid } = grid;
  function segmentValid(a, b) {
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / sampleStep));
    for (let k = 1; k < steps; k++) { const t = k / steps; if (!usable(terrain.sample(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t))) return false; }
    return true;
  }
  if (!valid[first] || !valid[last] || !segmentValid(start, pointAt(first)) || !segmentValid(pointAt(last), end)) throw Error('Endpoint cannot connect to the 202 m planning grid; move it away from a gap or steep terrain.');
  const cost = new Float64Array(count).fill(Infinity), parent = new Int32Array(count).fill(-1), closed = new Uint8Array(count), heap = new MinHeap();
  const target = pointAt(last), heuristic = p => Math.hypot(p.x - target.x, p.z - target.z);
  cost[first] = 0; heap.push(first, heuristic(pointAt(first)));
  let expanded = 0;
  const neighbors = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
  while (heap.length) {
    const id = heap.pop().id;
    if (closed[id]) continue;
    if (id === last) {
      const ids = []; for (let i = last; i !== -1; i = parent[i]) ids.push(i); ids.reverse();
      const points = [start, ...ids.map(pointAt), end].filter((p, i, a) => i === 0 || Math.hypot(p.x - a[i - 1].x, p.z - a[i - 1].z) > 1e-9);
      return { points, metrics: routeMetrics(points, terrain), gridSpacingMeters: Math.max(dx, dz) * 1000, expanded };
    }
    closed[id] = 1;
    const row = Math.floor(id / n), col = id % n, a = pointAt(id);
    for (const [dc, dr] of neighbors) {
      const c = col + dc, r = row + dr;
      if (c < 0 || c >= n || r < 0 || r >= n) continue;
      const j = r * n + c;
      if (!valid[j] || closed[j]) continue;
      // Diagonal movement must not cut between two blocked cardinal cells.
      if (dc && dr && (!valid[row * n + c] || !valid[r * n + col])) continue;
      const b = pointAt(j);
      if (!segmentValid(a, b)) continue;
      const d = Math.hypot(dc * dx, dr * dz, (height[j] - height[id]) / 1000);
      const candidate = cost[id] + d * Math.pow(1 + Math.max(slope[id], slope[j]) / 10, 2);
      if (candidate < cost[j]) { cost[j] = candidate; parent[j] = id; heap.push(j, candidate + heuristic(b)); }
    }
    if (++expanded % 500 === 0) await yieldFrame();
  }
  throw Error('No connected route meets the slope and coverage limits. Choose another destination.');
}
