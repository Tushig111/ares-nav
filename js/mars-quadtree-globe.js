import * as THREE from 'three';

export const AUTO_CTX_LEVEL = 7;
export const FADE_MS = 220;
export const LAYERS = {
  optical: { name: 'Viking Color', id: 'Mars_Viking_MDIM21_ClrMosaic_global_232m', max: 7, size: 256, ext: 'jpg', nativeMeters: 232 },
  ctx: { name: 'MRO CTX High-Res', id: 'CTX_beta01_uncontrolled_5m_Caltech', max: 11, size: 512, ext: 'png', nativeMeters: 5 },
  topography: { name: 'MOLA shaded relief (image only)', id: 'Mars_MGS_MOLA_ClrShade_merge_global_463m', max: 7, size: 256, ext: 'jpg', nativeMeters: 463 },
  thermal: { name: 'THEMIS infrared', id: null, max: 7, size: 256, ext: 'png', unavailable: true }
};
export function tileURL(layer, z, row, col) {
  if (layer === 'ctx') return `https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer/tile/${z}/${row}/${col}`;
  const l = LAYERS[layer];
  if (!l || l.unavailable) throw new Error('No verified endpoint for this layer');
  if (![z, row, col].every(Number.isInteger) || z < 0 || z > l.max || row < 0 || row >= 2 ** z || col < 0 || col >= 2 ** (z + 1)) throw new RangeError('Invalid WMTS tile');
  return `https://trek.nasa.gov/tiles/Mars/EQ/${l.id}/1.0.0/default/default028mm/${z}/${row}/${col}.${l.ext}`;
}
export function tileAt(lat, lon, z) {
  const rows = 2 ** z, u = ((lon + 180) % 360 + 360) % 360 / 360;
  return { z, row: Math.min(rows - 1, Math.max(0, Math.floor((90 - lat) / 180 * rows))), col: Math.floor(u * rows * 2) };
}
export function spherePoint(lat, lon, r) {
  const p = (90 - lat) * Math.PI / 180, t = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(-r * Math.sin(p) * Math.cos(t), r * Math.cos(p), r * Math.sin(p) * Math.sin(t));
}
// UVs point north at v=1. Shared cached textures are never mutated with repeat/offset.
export function inheritedUV(child, ancestor) {
  const d = 2 ** (child.z - ancestor.z);
  return new THREE.Vector4((child.col - ancestor.col * d) / d, 1 - (child.row - ancestor.row * d + 1) / d, 1 / d, 1 / d);
}

export class MarsQuadtreeGlobe {
  constructor({ parent, camera, renderer, radius = 4.6, onStatus = () => {}, now = () => performance.now(), createImage = () => new Image() }) {
    Object.assign(this, { parent, camera, renderer, radius, onStatus, now, createImage });
    this.group = new THREE.Group(); parent.add(this.group);
    this.nodes = new Map(); this.cache = new Map(); this.pending = new Map(); this.failed = new Map(); this.queue = new Map();
    this.pins = new Set(); this.reservations = new Map(); this.uploadQueue = [];
    this.active = 0; this.externalSlots = 0; this.maxConcurrent = 12; this.maxTextures = 220;
    this.layer = 'optical'; this.autoCTX = true; this.level = 1; this.tick = 0; this.lastUpdate = -Infinity; this.dirty = true;
    this.lastUpload = -Infinity; this.metrics = { lodMs: 0, uploadMs: 0, uploaded: 0, visited: 0 };
    this.scratchWorld = new THREE.Vector3(); this.scratchSphere = new THREE.Sphere();
    this.disposed = false; this.frustum = new THREE.Frustum(); this.projection = new THREE.Matrix4();
    this.placeholder = new THREE.DataTexture(new Uint8Array([67, 60, 55, 255]), 1, 1);
    this.placeholder.colorSpace = THREE.SRGBColorSpace; this.placeholder.needsUpdate = true;
    this.roots = [];
    for (let row = 0; row < 2; row++) for (let col = 0; col < 4; col++) this.roots.push(this.node(1, row, col));
  }
  sourceLayer(z) { return this.layer === 'optical' && this.autoCTX && z >= AUTO_CTX_LEVEL ? 'ctx' : this.layer; }
  key(layer, z, row, col) { return `${layer}/${z}/${row}/${col}`; }
  nodeKey(node) { return this.key(this.sourceLayer(node.z), node.z, node.row, node.col); }
  invalidate() { this.lastUpdate = -Infinity; }
  setLayer(layer) {
    if (!LAYERS[layer]) return false;
    if (LAYERS[layer].unavailable) { this.noticeUntil = this.now() + 6000; return false; }
    if (layer !== this.layer) {
      this.layer = layer; this.reservations.clear();
      for (const node of this.nodes.values()) { node.split = false; node.transition = null; node.sourceFade = null; if (node.z > 1) this.hide(node); }
      this.invalidate();
    }
    return true;
  }
  node(z, row, col) {
    const key = `${z}/${row}/${col}`;
    if (this.nodes.has(key)) return this.nodes.get(key);
    const rows = 2 ** z, west = -180 + col * 180 / rows, north = 90 - row * 180 / rows;
    const node = { key, z, row, col, west, east: west + 180 / rows, north, south: north - 180 / rows,
      center: spherePoint(north - 90 / rows, west + 90 / rows, this.radius), angular: Math.PI / rows,
      mesh: null, children: null, ready: false, opacity: 0, split: false, transition: null, target: null, base: null, last: this.tick };
    this.nodes.set(key, node); return node;
  }
  ensureMesh(node) {
    if (node.mesh) return;
    // Coarse patches share one angular grid; tiny skirts cover later T-junctions.
    const n = Math.max(2, Math.ceil(64 / 2 ** (node.z - 1))), positions = [], uv = [], indices = [];
    for (let y = 0; y <= n; y++) for (let x = 0; x <= n; x++) {
      const p = spherePoint(node.north + (node.south - node.north) * y / n, node.west + (node.east - node.west) * x / n, this.radius);
      positions.push(p.x, p.y, p.z); uv.push(x / n, 1 - y / n);
    }
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const a = y * (n + 1) + x, b = a + 1, c = a + n + 1; indices.push(a, c, b, b, c, c + 1);
    }
    const edge = [];
    for (let x = 0; x <= n; x++) edge.push(x);
    for (let y = 1; y <= n; y++) edge.push(y * (n + 1) + n);
    for (let x = n - 1; x >= 0; x--) edge.push(n * (n + 1) + x);
    for (let y = n - 1; y > 0; y--) edge.push(y * (n + 1));
    const skirtStart = positions.length / 3;
    for (const i of edge) {
      const scale = (this.radius - .003) / this.radius;
      positions.push(positions[i * 3] * scale, positions[i * 3 + 1] * scale, positions[i * 3 + 2] * scale); uv.push(uv[i * 2], uv[i * 2 + 1]);
    }
    for (let i = 0; i < edge.length; i++) { const j = (i + 1) % edge.length; indices.push(edge[i], skirtStart + i, edge[j], edge[j], skirtStart + i, skirtStart + j); }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
    const uniforms = { inheritedMap: { value: this.placeholder }, inheritedUV: { value: new THREE.Vector4(0, 0, 1, 1) }, detailMix: { value: 0 } };
    const material = new THREE.MeshBasicMaterial({ map: this.placeholder, side: THREE.FrontSide, toneMapped: false, transparent: true,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -node.z });
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, uniforms);
      shader.fragmentShader = 'uniform sampler2D inheritedMap;\nuniform vec4 inheritedUV;\nuniform float detailMix;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        #ifdef USE_MAP
          vec4 tileColor;
          if (detailMix >= 0.9999) tileColor = texture2D(map, vMapUv);
          else {
            vec4 coarseColor = texture2D(inheritedMap, vMapUv * inheritedUV.zw + inheritedUV.xy);
            vec4 detailColor = texture2D(map, vMapUv);
            // A transparent CTX no-data pixel keeps the colored underlay unchanged.
            // If the parent itself has no data, fade only the new sample over the retained ancestor.
            if (coarseColor.a < 0.9999) tileColor = vec4(detailColor.rgb, detailColor.a * detailMix);
            else tileColor = vec4(mix(coarseColor.rgb, detailColor.rgb, detailMix * detailColor.a), 1.0);
          }
          diffuseColor *= tileColor;
        #endif`);
    };
    material.customProgramCacheKey = () => 'ares-tile-inheritance-v1';
    const mesh = new THREE.Mesh(geometry, material); mesh.visible = false; mesh.renderOrder = node.z;
    node.mesh = mesh; node.uniforms = uniforms; this.group.add(mesh);
  }
  valid(entry) { return entry && this.cache.get(entry.key) === entry && entry.uploaded; }
  pin(entry) { if (this.valid(entry)) { this.pins.add(entry.key); entry.used = this.tick; } }
  reference(entry, node) { return entry ? { entry, uv: inheritedUV(node, entry) } : null; }
  request(node, priority = 0) {
    const layer = this.sourceLayer(node.z), key = this.key(layer, node.z, node.row, node.col), cached = this.cache.get(key);
    if (cached) return cached;
    if (!this.pending.has(key) && !LAYERS[layer].unavailable && (this.failed.get(key) || 0) < this.now()) this.queue.set(key, { key, layer, z: node.z, row: node.row, col: node.col, priority });
    return null;
  }
  reserve(node) {
    if (this.reservations.has(node.key)) return true;
    const keys = node.children.map(child => this.nodeKey(child));
    const claimed = new Set([...this.pins, ...this.pending.keys()]);
    for (const set of this.reservations.values()) for (const key of set) claimed.add(key);
    for (const key of keys) claimed.add(key);
    // Reserve a complete sibling group, rather than pinning hundreds of incomplete splits.
    if (claimed.size > this.maxTextures) return false;
    this.reservations.set(node.key, keys); return true;
  }
  protectedKeys() {
    const keys = new Set(this.pins);
    for (const set of this.reservations.values()) for (const key of set) keys.add(key);
    return keys;
  }
  evict(target = this.maxTextures) {
    if (this.cache.size <= target) return;
    const protectedKeys = this.protectedKeys();
    const candidates = [...this.cache].filter(([key]) => !protectedKeys.has(key)).sort((a, b) => a[1].used - b[1].used);
    while (this.cache.size > target && candidates.length) { const [key, entry] = candidates.shift(); entry.texture.dispose(); this.cache.delete(key); }
  }
  pump() {
    const wanted = this.protectedKeys();
    for (const job of [...this.queue.values()].sort((a, b) => a.priority - b.priority)) {
      if (this.active + this.externalSlots >= this.maxConcurrent) break;
      this.queue.delete(job.key);
      if (!wanted.has(job.key) || this.cache.has(job.key) || this.pending.has(job.key)) continue;
      this.evict(this.maxTextures - this.active - 1);
      if (this.cache.size + this.active >= this.maxTextures) break;
      const image = this.createImage(); image.crossOrigin = 'anonymous'; this.active++;
      let finished = false;
      const finish = ok => {
        if (finished) return; finished = true; clearTimeout(timer); image.onload = image.onerror = null;
        this.active--; this.pending.delete(job.key);
        if (ok && !this.disposed && this.protectedKeys().has(job.key)) {
          const texture = new THREE.Texture(image); texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter; texture.generateMipmaps = false;
          texture.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
          const entry = { ...job, texture, used: this.tick, uploaded: false }; texture.needsUpdate = true;
          this.cache.set(job.key, entry); this.uploadQueue.push(entry); this.dirty = true;
        } else if (!ok) this.failed.set(job.key, this.now() + 30000);
      };
      const timer = setTimeout(() => { finish(false); image.src = ''; }, 12000);
      image.onload = () => finish(true); image.onerror = () => finish(false);
      this.pending.set(job.key, { image, cancel: () => { finish(false); image.src = ''; } }); image.src = tileURL(job.layer, job.z, job.row, job.col);
    }
  }
  upload() {
    // Spread GPU uploads over frames; img.onload alone is not a render-readiness signal.
    const started = performance.now();
    let budget = 2, uploaded = 0;
    while (budget-- > 0 && this.uploadQueue.length) {
      const entry = this.uploadQueue.shift(); if (this.cache.get(entry.key) !== entry) continue;
      try {
        this.renderer.initTexture(entry.texture);
        if (this.renderer.getContext?.().isContextLost()) continue;
        entry.uploaded = true; this.dirty = true; uploaded++;
      } catch (error) {
        this.cache.delete(entry.key); entry.texture.dispose(); this.failed.set(entry.key, this.now() + 30000);
        console.warn('Tile upload failed; retaining coarse coverage.', error);
      }
      if (performance.now() - started >= 1.5) break;
    }
    this.metrics.uploadMs = performance.now() - started; this.metrics.uploaded = uploaded;
  }
  appearance(node, fallback, opacity) {
    this.ensureMesh(node);
    const own = this.valid(node.target) ? node.target : null;
    const base = this.valid(node.base?.entry) ? node.base : this.valid(fallback?.entry) ? fallback : null;
    const mix = own ? node.opacity : 0;
    if (own && mix >= .99) node.everShown = true;
    if (mix >= .9999 && own) {
      node.mesh.material.map = own.texture; node.uniforms.inheritedMap.value = own.texture;
      node.uniforms.inheritedUV.value.set(0, 0, 1, 1); this.pin(own);
    } else {
      node.mesh.material.map = own?.texture || base?.entry.texture || this.placeholder;
      node.uniforms.inheritedMap.value = base?.entry.texture || this.placeholder;
      node.uniforms.inheritedUV.value.copy(base?.uv || new THREE.Vector4(0, 0, 1, 1));
      this.pin(base?.entry); this.pin(own);
    }
    node.uniforms.detailMix.value = mix; node.mesh.material.opacity = opacity;
    return own && mix >= .9999 ? this.reference(own, node) : base;
  }
  prepare(node, fallback, entry, holdBlend = false) {
    node.ready = !!entry?.uploaded;
    if (!this.valid(node.target)) { node.target = null; node.opacity = 0; node.base = fallback; }
    if (node.ready && node.target !== entry) {
      const replacing = !!node.target && node.opacity >= .99;
      node.base = replacing ? this.reference(node.target, node) : fallback;
      node.target = entry; node.opacity = 0;
      if ((replacing || node.everShown) && node.z > 1 && !holdBlend) node.sourceFade = this.now();
    }
  }
  requiresUnderlay(node) {
    // CTX is PNG and can contain transparent coverage gaps; retain the colored ancestor below it.
    return !!node.children?.some(child => child.target?.layer === 'ctx');
  }
  advanceFades(opacity, now) {
    for (const node of this.nodes.values()) {
      if (node.sourceFade != null) {
        node.opacity = Math.min(1, (now - node.sourceFade) / FADE_MS);
        this.appearance(node, node.base, opacity);
        if (node.opacity >= 1) { node.sourceFade = null; this.dirty = true; }
      }
      if (!node.transition) { if (node.mesh?.visible) node.mesh.material.opacity = opacity; continue; }
      const t = Math.min(1, (now - node.transition.start) / FADE_MS), { direction, from } = node.transition;
      if (direction === 'root') node.opacity = from[0] + (1 - from[0]) * t;
      else for (let i = 0; i < 4; i++) {
        const child = node.children[i]; child.opacity = from[i] + ((direction === 'split' ? 1 : 0) - from[i]) * t;
        this.appearance(child, this.referenceForChild(node, child), opacity);
      }
      if (direction === 'root') this.appearance(node, node.base, opacity);
      if (t < 1) continue;
      node.transition = null; this.dirty = true;
      if (direction === 'split') {
        // The parent stays until the entire sibling group is uploaded and fully blended.
        if (node.children.every(c => c.ready && c.opacity >= .99)) { node.split = true; node.mesh.visible = this.requiresUnderlay(node); this.reservations.delete(node.key); }
      } else if (direction === 'merge') {
        node.split = false; for (const child of node.children) this.hide(child);
        this.reservations.delete(node.key);
      }
    }
  }
  referenceForChild(parent, child) {
    const entry = this.valid(parent.target) && parent.opacity >= .99 ? parent.target : parent.base?.entry;
    return this.valid(entry) ? this.reference(entry, child) : null;
  }
  hide(node) { if (node.mesh) node.mesh.visible = false; if (node.children) node.children.forEach(child => this.hide(child)); }
  covered(node, inView = () => true) {
    const entry = this.cache.get(this.nodeKey(node)); if (entry?.uploaded) return true;
    return !!node.split && !!node.children && node.children.every(child => !inView(child) || this.covered(child, inView));
  }
  update(opacity = 1) {
    if (this.disposed) return;
    let ancestor = this.parent, ancestorsVisible = true;
    while (ancestor) { if (!ancestor.visible) { ancestorsVisible = false; break; } ancestor = ancestor.parent; }
    this.group.visible = ancestorsVisible && opacity > .001;
    if (!this.group.visible) return;
    const now = this.now();
    // Controls change and the animation loop may both call update in one frame.
    if (now - this.lastUpload >= 12) { this.upload(); this.lastUpload = now; }
    this.advanceFades(opacity, now);
    if (now - this.lastUpdate < (this.dirty ? 16 : 45)) return;
    const lodStart = performance.now(); this.metrics.visited = 0;
    this.lastUpdate = now; this.dirty = false; this.tick++; this.queue.clear();
    // Preserve previous visible samples while complete sibling reservations are admitted.
    const previousPins = this.pins; this.pins = new Set(previousPins);
    this.parent.updateWorldMatrix(true, false); this.camera.updateMatrixWorld();
    this.projection.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse); this.frustum.setFromProjectionMatrix(this.projection);
    const localCamera = this.parent.worldToLocal(this.camera.getWorldPosition(new THREE.Vector3()));
    const direction = this.camera.isOrthographicCamera ? this.camera.getWorldDirection(new THREE.Vector3()).negate().transformDirection(this.parent.matrixWorld.clone().invert()) : localCamera.clone().normalize();
    const focusLat = THREE.MathUtils.radToDeg(Math.asin(direction.y));
    const focusLon = ((THREE.MathUtils.radToDeg(Math.atan2(direction.z, -direction.x)) - 180 + 540) % 360) - 180;
    const horizonAngle = this.camera.isOrthographicCamera ? Math.PI / 2 : Math.acos(THREE.MathUtils.clamp(this.radius / localCamera.length(), 0, 1));
    const height = this.renderer.domElement.clientHeight || 800, maxLevel = this.layer === 'optical' && this.autoCTX ? 11 : LAYERS[this.layer].max;
    const drawPins = new Set(), reservationsUsed = new Set(); let leaves = 0, geometryLevel = 1, badge = null, badgeScore = Infinity, blending = false;
    const inView = node => {
      const world = this.scratchWorld.copy(node.center).applyMatrix4(this.parent.matrixWorld);
      const facing = node.center.dot(direction) / this.radius;
      const horizonBound = Math.cos(Math.min(Math.PI, horizonAngle + node.angular * .8));
      return facing > -.15 && facing >= horizonBound && this.frustum.intersectsSphere(this.scratchSphere.set(world, this.radius * node.angular * .8));
    };
    const projectedSize = node => {
      if (this.camera.isOrthographicCamera) return this.radius * node.angular * height * this.camera.zoom / (this.camera.top - this.camera.bottom);
      // Distance to the nearest point on a patch, not its possibly distant center.
      const lat = THREE.MathUtils.clamp(focusLat, node.south, node.north);
      let lon = focusLon; if (lon < node.west) lon += 360; if (lon > node.east) lon -= 360;
      lon = THREE.MathUtils.clamp(lon, node.west, node.east);
      const distance = Math.max(.01, localCamera.distanceTo(spherePoint(lat, lon, this.radius)));
      return this.radius * node.angular * height / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * distance);
    };
    const visit = (node, fallback, allowRefine = true) => {
      this.metrics.visited++; node.last = this.tick;
      const visible = inView(node);
      if (!visible && node.z > 1) {
        // No geometry/material allocation or draw call for patches outside the view.
        // A branch is re-evaluated on the next LOD pass when the camera moves.
        this.hide(node); return;
      }
      const pixels = visible ? projectedSize(node) : 0;

      const key = this.nodeKey(node), entry = visible || node.z === 1 ? this.request(node, node.z === 1 ? -1e9 : -pixels) : this.cache.get(key);
      this.prepare(node, fallback, entry);
      if (node.z === 1 && node.ready && node.opacity < 1 && !node.transition) node.transition = { direction: 'root', start: now, from: [node.opacity] };
      if (visible || node.z === 1) drawPins.add(key);
      if (this.valid(node.target) && (visible || node.z === 1)) { this.pin(node.target); drawPins.add(node.target.key); }
      const ref = this.appearance(node, fallback, opacity); node.mesh.visible = true;
      if (ref) drawPins.add(ref.entry.key);
      if (node.opacity < 1 && node.base?.entry) drawPins.add(node.base.entry.key);
      const wantsSplit = allowRefine && visible && opacity >= .99 && node.z < maxLevel && pixels > LAYERS[this.sourceLayer(node.z)].size * 1.3 && leaves < (this.camera.isOrthographicCamera ? 256 : 72);
      if (wantsSplit && node.ready && node.opacity >= .99 && !node.children) node.children = [0, 1, 2, 3].map(i => this.node(node.z + 1, node.row * 2 + (i >> 1), node.col * 2 + i % 2));
      if (node.children && (wantsSplit || node.split || node.transition?.direction === 'split' || node.transition?.direction === 'merge')) {
        if (wantsSplit && !node.split && !node.transition && node.ready && node.opacity >= .99 && this.reserve(node)) {
          reservationsUsed.add(node.key);
          // Children inherit immediately; their own imagery stays hidden until all uploads finish.
          let ready = true;
          for (const child of node.children) {
            const childRef = ref ? this.reference(ref.entry, child) : null, childEntry = this.request(child, -pixels + 1);
            this.prepare(child, childRef, childEntry, true); this.appearance(child, childRef, opacity);
            child.mesh.visible = false; if (!child.ready) ready = false;
          }
          if (ready) {
            node.transition = { direction: 'split', start: now, from: node.children.map(child => child.opacity) };
            for (const child of node.children) child.mesh.visible = true;
          }
        }
        if (node.transition?.direction === 'split' || node.transition?.direction === 'merge') {
          reservationsUsed.add(node.key); blending = true;
          // A whole family transitions together. No grandchildren are introduced mid-blend.
          for (const child of node.children) {
            this.appearance(child, this.referenceForChild(node, child), opacity); child.mesh.visible = true;
            if (this.valid(child.target)) drawPins.add(child.target.key);
            const base = this.referenceForChild(node, child); if (base) drawPins.add(base.entry.key);
          }
          leaves += 4;
        } else if (node.split) {
          if (!wantsSplit) {
            for (const child of node.children) visit(child, ref ? this.reference(ref.entry, child) : null, false);
            if (node.children.every(child => !child.split && !child.transition) && ref) {
              for (const child of node.children) child.base = this.reference(ref.entry, child);
              node.transition = { direction: 'merge', start: now, from: node.children.map(child => child.opacity) }; blending = true;
            }
          } else {
            for (const child of node.children) visit(child, ref ? this.reference(ref.entry, child) : null, true);
            // All four children supply either their own imagery or an inherited sub-rectangle.
            if (!this.requiresUnderlay(node) && node.children.every(child => child.mesh && (child.ready && child.opacity >= .99 || !visible))) node.mesh.visible = false;
          }
        } else leaves++;
      } else leaves++;
      if (node.mesh.visible && ref && visible) {
        geometryLevel = Math.max(geometryLevel, node.z);
        const center = node.center.clone().applyMatrix4(this.parent.matrixWorld).project(this.camera);
        const containsFocus = focusLat >= node.south && focusLat <= node.north && focusLon >= node.west && focusLon <= node.east;
        const score = containsFocus ? -1000 - node.z : 1000 + center.x ** 2 + center.y ** 2;
        if (score < badgeScore) { badgeScore = score; badge = ref.entry; }
      }
    };
    for (const root of this.roots) visit(root, null);
    // Roots remain pinned as persistent coverage for rapid rotations and zoom reversals.
    for (const root of this.roots) if (this.valid(root.target)) drawPins.add(root.target.key);
    for (const key of this.reservations.keys()) if (!reservationsUsed.has(key)) this.reservations.delete(key);
    this.pins = drawPins;
    this.evict(); this.pump(); this.prune();
    this.level = badge?.z || 1; const source = badge?.layer || this.layer, l = LAYERS[source];
    const displayMeters = 2 * Math.PI * 3389500 / (2 ** (this.level + 1) * l.size);
    const label = badge ? `${l.name} L${this.level} · native ${l.nativeMeters} m/px · tile ~${Math.round(displayMeters)} m/px (equator)` : 'Loading initial NASA imagery…';
    const message = (this.noticeUntil || 0) > now ? 'THEMIS unavailable (HTTP 404); retaining current imagery' : label + (blending ? ' · blending' : '');
    this.metrics.lodMs = performance.now() - lodStart;
    this.onStatus({ metrics: { ...this.metrics }, layer: this.layer, sourceLayer: source, level: this.level, geometryLevel, textures: this.cache.size,
      active: this.active, leaves, blending, message, diagnostics: `${this.cache.size}/${this.maxTextures} textures · ${this.active}/${this.maxConcurrent} requests` });
  }
  prune() {
    if (this.nodes.size < 900) return;
    const keep = new Set();
    const mark = node => { keep.add(node.key); if (node.children && (node.split || node.transition || this.reservations.has(node.key))) node.children.forEach(mark); };
    this.roots.forEach(mark);
    for (const [key, node] of this.nodes) if (!keep.has(key) && node.last < this.tick - 12 && !node.mesh?.visible) {
      if (node.mesh) { this.group.remove(node.mesh); node.mesh.geometry.dispose(); node.mesh.material.dispose(); }
      this.nodes.delete(key);
    }
    for (const node of this.nodes.values()) if (node.children && node.children.some(child => !this.nodes.has(child.key))) node.children = null;
  }
  dispose() {
    this.disposed = true; for (const request of [...this.pending.values()]) request.cancel();
    for (const entry of this.cache.values()) entry.texture.dispose();
    for (const node of this.nodes.values()) if (node.mesh) { node.mesh.geometry.dispose(); node.mesh.material.dispose(); }
    this.placeholder.dispose(); this.parent.remove(this.group); this.cache.clear(); this.uploadQueue.length = 0;
  }
}
