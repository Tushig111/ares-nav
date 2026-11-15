import {createJezeroFieldLab} from './jezero-fieldlab.js?v=final1';
import {createScientificLayerManager} from './scientific-layer-manager.js?v=final1';
import {createGeologyLayers} from './geology-layers.js?v=final1';
import {createProximityLabels} from './proximity-labels.js?v=final1';
import {createMobileShell} from './mobile-shell.js?v=final1';
import { pickReferenceMap } from './map-picking.js?v=final1';
import { createTrekSearch } from './trek-search.js?v=final1';
import { createVehicles } from './vehicles.js?v=final1';
import { createProjectionController } from './projections.js?v=final1';
import { fetchDonkiCatalog, installProvenance } from './official-data.js?v=final1';
import { MarsQuadtreeGlobe, spherePoint, rectanglePoint } from './mars-quadtree-globe.js?v=final1';
import { createWorkbench } from './exploration-workbench.js?v=final1';
import { createMobileAR } from './ar-mobile.js?v=final1';
import { destination } from './geodesy.js?v=final1';
import { bindControls } from './controls.js?v=final1';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createSpaceAudioEngine } from './audio.js?v=final1';
import { SITES, LAYERS } from './data.js?v=final1';
import { hash2, valueNoise, fbm, ridgedFbm } from './noise.js?v=final1';
import { GLSL_PARTICLE_VERTEX_SHADER, GLSL_PARTICLE_FRAGMENT_SHADER, GLSL_SPARKLE_VERTEX_SHADER, GLSL_SPARKLE_FRAGMENT_SHADER, GLSL_TERRAIN_VERTEX_SHADER, GLSL_TERRAIN_FRAGMENT_SHADER } from './shaders.js?v=final1';

// 1. CHLADNI-PLATE AUTONOMOUS CYMATIC STANDING-WAVE GPU SHADERS
//    C(x, z) = a * sin(PI * n * x) * sin(PI * m * z) + b * sin(PI * m * x) * sin(PI * n * z)
// 3,600-Particle 3D Chladni Cymatic Sparkle Vortex & Weather Dust-Devil Shader
// 2. ENHANCED WEB AUDIO API SPACE SYNTHESIZER + CHLADNI CYMATIC RESONANCE
const spaceAudio = createSpaceAudioEngine();

window.addEventListener('pointerdown', (e) => {
  if (e.target.closest('#launch-overlay')) return;
  const btn = e.target.closest('button, select, .wp-item, .layer-check, .surf-label');
  if (btn && btn.id !== 'audio-btn' && spaceAudio.isInitialized) {
    spaceAudio.playClickSFX(btn.classList.contains('seg-btn') ? 'mode' : 'tap');
  }
});
window.addEventListener('input', (e) => {
  if (e.target && e.target.type === 'range') {
    spaceAudio.playClickSFX('tick');
  }
});
// 3. SITE PRESETS, CHLADNI MODES & PHOTO REFERENCES
// 2B. HOT-SWAPPABLE NASA RESOURCE ADAPTER (src/config/nasaResources.ts)
const DEFAULT_NASA_RESOURCES = Object.freeze({
 optical: "https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/{z}/{row}/{col}.jpg",
 topography: "https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/default/default028mm/{z}/{row}/{col}.jpg",
 thermal: "Unavailable: no verified thermal tile endpoint",
 donkiSep: "https://api.nasa.gov/DONKI/SEP?api_key=DEMO_KEY"
});
const NASA_RESOURCES = DEFAULT_NASA_RESOURCES;
let donkiLiveInfo = { status: 'NOT CHECKED', eventCount: null };
let donkiRequestId = 0;
function resolveWmtsUrl(template,z,row,col) { return template.replace('{z}',z).replace('{row}',row).replace('{col}',col); }
async function fetchLiveDonkiSpaceWeather() {
 const requestId=++donkiRequestId;
 const result=await fetchDonkiCatalog();
 if(requestId!==donkiRequestId)return;
 donkiLiveInfo=result;
 for(const id of ['feed-status-btn','donki-modal-status']) {
  const el=document.getElementById(id); if(el)el.textContent=`DONKI catalog: ${result.status}${result.eventCount===null?'':` (${result.eventCount} / 30 days)`}`;
 }
 document.dispatchEvent(new CustomEvent('donki-catalog',{detail:result}));
}

let upgrades = null;
let fieldLab = null;
let mobileAR = null;
let vehicles = null;
let progressiveGlobe = null;
let projectionView = null;
let geologyLayers = null, scientificLayers = null;
let trekPanel = null, proximityLabels = null, mobileShell = null;
let survivalSavedRoute = null;
const MOBILE = matchMedia('(max-width: 767px)').matches;

const state = {
  mode: 'orbital',
  povMode: 'free', // 'free' | 'visor' | 'shoulder'
  suitDemoActive: false,
  suitDemoAngle: 0,
  siteIndex: 0,
  loadedSurfaceSite: 0,
  waypoints: JSON.parse(JSON.stringify(SITES[0].defaultWaypoints)),
  selectedWp: 0,
  reconPhotoVariant: 0,
  autoSpin: true,
  isNadir: false,
  sepStorm: false,
  weatherPreset: 'clear',
  placeDemoActive: true,
  addWpMode: false,
  relief: 1.5,
  astronautSpeed: 1.0,
  walkCycleTime: 0,
  totalTraverseKm: 1.84,
  uhfViewshed: false,
  uhfLinked: true,
  solHour: 13.67,
  o2ReservePct: 86,
  pnrMarginKm: 1.25,
  openDrawer: null,
  cameraTargetPos: new THREE.Vector3(0, 3.2, 13.5),
  cameraTargetLook: new THREE.Vector3(0, 0, 0),
  cameraTargetFov: 42,
  isCameraTransitioning: false,
  cameraTransitionTimer: 0,
  lastModeSwitchTime: 0,
  evaProgress: 0,
  sparkleBurst: {
    active: false,
    progress: 1.0,
    duration: 1.35
  },
  chladniRipple: {
    active: false,
    progress: 1.0,
    duration: 1.30
  },
  globeIntroMorph: {
    started: false,
    active: false,
    progress: 0.0,
    duration: 2.35
  },
  morph: {
    active: false,
    progress: 1.0,
    duration: 1.45,
    fromSite: 0,
    toSite: 0
  }
};
// 4. DETERMINISTIC GEOLOGICAL NOISE & NASA MARS TREK WMTS 8-TILE STITCHER
function createParticleDiscTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(255, 255, 255, 1)');
  g.addColorStop(0.35, 'rgba(255, 255, 255, 0.85)');
  g.addColorStop(0.7, 'rgba(255, 255, 255, 0.22)');
  g.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

const PARTICLE_SPRITE = createParticleDiscTexture();

// Famous Martian Mountains, Volcanoes & Basins for Orbital Deep-Zoom Inspection
const ORBITAL_MOUNTAINS = [
  { name: "Olympus Mons", type: "Shield Volcano", lat: 18.65, lon: -133.8, elevM: 21229, r: 0.048, d: 0.78, caldera: 0.18, siteIdx: 3 },
  { name: "Ascraeus Mons", type: "Tharsis Volcano", lat: 11.90, lon: -104.1, elevM: 18209, r: 0.028, d: 0.58, caldera: 0.16 },
  { name: "Pavonis Mons", type: "Tharsis Volcano", lat: 1.50, lon: -113.0, elevM: 14058, r: 0.026, d: 0.46, caldera: 0.16 },
  { name: "Arsia Mons", type: "Tharsis Volcano", lat: -8.30, lon: -120.1, elevM: 17779, r: 0.030, d: 0.56, caldera: 0.22 },
  { name: "Elysium Mons", type: "Volcanic Rise", lat: 25.00, lon: 147.2, elevM: 14127, r: 0.028, d: 0.48, caldera: 0.15 },
  { name: "Aeolis Mons (Mt. Sharp)", type: "Central Peak", lat: -4.59, lon: 137.44, elevM: 5500, r: 0.020, d: -0.24, centralPeak: 0.34, siteIdx: 0 },
  { name: "Alba Mons", type: "Broad Patera", lat: 40.50, lon: -110.4, elevM: 6800, r: 0.045, d: 0.30, caldera: 0.14 },
  { name: "Apollinaris Mons", type: "Stratovolcano", lat: -9.30, lon: 174.4, elevM: 5000, r: 0.018, d: 0.28, caldera: 0.18 },
  { name: "Valles Marineris", type: "Tectonic Grand Canyon", lat: -9.80, lon: -76.4, elevM: -7000, r: 0.035, d: -0.45, siteIdx: 2 },
  { name: "Jezero Crater Delta", type: "Paleolake Basin", lat: 18.38, lon: 77.58, elevM: -2540, r: 0.017, d: -0.20, siteIdx: 1 }
];

function createMarsPlanetaryMaps() {
  // Neutral backing only. Observational imagery comes from the progressive tile tree.
  const W = 4, H = 2;
  const canvas = document.createElement('canvas');canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#49423e';ctx.fillRect(0,0,W,H);
  const albedoTex=new THREE.CanvasTexture(canvas);albedoTex.colorSpace=THREE.SRGBColorSpace;
  return { albedoTex, heightField:new Float32Array(W*H), W, H };
}
// 5. THREE.JS SCENE, 3D CHLADNI SPARKLE VORTEX & HIGH-LOD MOLA MARS GLOBE
const container = document.getElementById('canvas-container');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, stencil: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, MOBILE ? 1.5 : 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x030407);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.01, 1600);
camera.position.set(0, 3.2, 13.5);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.rotateSpeed = 0.72;
controls.zoomSpeed = 1.25;
controls.minDistance = 4.64;
controls.maxDistance = 30;
controls.enablePan = false;

controls.addEventListener('start', () => {
  vehicles?.stopFollowing();
  state.isCameraTransitioning = false;
});

const ambientLight = new THREE.AmbientLight(0x3a2622, 0.55);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff1e0, 2.85);
sunLight.position.set(18, 10, 14);
scene.add(sunLight);

const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.38);
rimLight.position.set(-14, -5, -12);
scene.add(rimLight);

const starGeo = new THREE.BufferGeometry();
const starCount = 2600;
const starPos = new Float32Array(starCount * 3);
const starCol = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const r = 180 + Math.random() * 440;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
  starPos[i * 3 + 1] = r * Math.cos(phi);
  starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

  const tint = Math.random();
  starCol[i * 3] = tint > 0.8 ? 1.0 : 0.85;
  starCol[i * 3 + 1] = tint > 0.8 ? 0.86 : 0.91;
  starCol[i * 3 + 2] = tint < 0.25 ? 1.0 : 0.94;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
scene.add(new THREE.Points(
  starGeo,
  new THREE.PointsMaterial({ size: 0.75, vertexColors: true, transparent: true, opacity: 0.84 })
));

// 3,600-Particle 3D Chladni Sparkle Vortex & Weather Dust-Devil Stream
const SPARKLE_COUNT = MOBILE ? 1200 : 3600;
const sparkleGeo = new THREE.BufferGeometry();
const sparkleBaseOrbit = new Float32Array(SPARKLE_COUNT * 3);
const sparkleSeeds = new Float32Array(SPARKLE_COUNT);
const sparkleDummyPos = new Float32Array(SPARKLE_COUNT * 3);
for (let i = 0; i < SPARKLE_COUNT; i++) {
  const r = 4.0 + Math.pow(Math.random(), 0.75) * 46.0;
  const h = (Math.random() - 0.35) * 24.0;
  const ang = Math.random() * Math.PI * 2.0;
  sparkleBaseOrbit[i * 3]     = r;
  sparkleBaseOrbit[i * 3 + 1] = h;
  sparkleBaseOrbit[i * 3 + 2] = ang;
  sparkleSeeds[i] = Math.random();
}
sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparkleDummyPos, 3));
sparkleGeo.setAttribute('aBaseOrbit', new THREE.BufferAttribute(sparkleBaseOrbit, 3));
sparkleGeo.setAttribute('aSeed', new THREE.BufferAttribute(sparkleSeeds, 1));

const sparkleShaderMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0.0 },
    uBurstIntensity: { value: 0.0 },
    uWeatherVortex: { value: 0.0 },
    uOrbitalScale: { value: 0.22 },
    uChladniParams: { value: new THREE.Vector4(3.0, 7.0, 3.0, 7.0) }
  },
  vertexShader: GLSL_SPARKLE_VERTEX_SHADER,
  fragmentShader: GLSL_SPARKLE_FRAGMENT_SHADER,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});
const sparklePoints = new THREE.Points(sparkleGeo, sparkleShaderMat);
sparklePoints.frustumCulled = false;
scene.add(sparklePoints);

function triggerSparkleBurst(duration = 1.35) {
  state.sparkleBurst.active = true;
  state.sparkleBurst.progress = 0.0;
  state.sparkleBurst.duration = duration;
  sparkleShaderMat.uniforms.uBurstIntensity.value = 1.0;
}

const orbitalGroup = new THREE.Group();
scene.add(orbitalGroup);

const MARS_RADIUS = 4.6;
const { albedoTex, heightField, W: MAP_W, H: MAP_H } = createMarsPlanetaryMaps();

function sampleGlobeElevation(lat, lon) {
  const u = ((lon + 180) % 360 + 360) % 360 / 360;
  const v = Math.max(0, Math.min(1, (90 - lat) / 180));
  const px = Math.min(MAP_W - 1, Math.max(0, Math.floor(u * MAP_W)));
  const py = Math.min(MAP_H - 1, Math.max(0, Math.floor(v * MAP_H)));
  return heightField[py * MAP_W + px] || 0;
}

// Smooth, realistic 256x192 MOLA 3D Globe Geometry with subtle authentic relief (subtle relief)
const marsGeo = new THREE.SphereGeometry(MARS_RADIUS, 256, 192);
const mPos = marsGeo.attributes.position;
const mUv = marsGeo.attributes.uv;
const tmpV = new THREE.Vector3();
for (let i = 0; i < mPos.count; i++) {
  const u = mUv.getX(i);
  const v = 1.0 - mUv.getY(i);
  const px = Math.min(MAP_W - 1, Math.max(0, Math.floor(u * MAP_W)));
  const py = Math.min(MAP_H - 1, Math.max(0, Math.floor(v * MAP_H)));
  const elev = heightField[py * MAP_W + px] || 0;
  tmpV.fromBufferAttribute(mPos, i).normalize();
  tmpV.multiplyScalar(MARS_RADIUS - 0.015 + elev * 0.042);
  mPos.setXYZ(i, tmpV.x, tmpV.y, tmpV.z);
}
marsGeo.computeVertexNormals();

// Custom Zoom-Adaptive Crisp Micro-Terrain Detail Shader (smooth shading)


const marsMat = new THREE.MeshStandardMaterial({
  map: albedoTex,
  normalScale: new THREE.Vector2(0.88, 0.88),
  roughness: 0.90,
  metalness: 0.04
});


const marsMesh = new THREE.Mesh(marsGeo, marsMat);
marsMesh.rotation.z = THREE.MathUtils.degToRad(25.19);
orbitalGroup.add(marsMesh);

// Start marsMat transparent so the Particle Globe is visible first and smoothly translates into the real Mars globe!
marsMat.transparent = true;
marsMat.opacity = 0.0;

// 14,400-Particle 3D Martian Particle Globe that coalesces & translates into the actual Martian Globe on launch
const GLOBE_PARTICLE_COUNT = MOBILE ? 4800 : 14400;
const globePGeo = new THREE.BufferGeometry();
const globePTarget = new Float32Array(GLOBE_PARTICLE_COUNT * 3);
const globePColor  = new Float32Array(GLOBE_PARTICLE_COUNT * 3);
const globePSeed   = new Float32Array(GLOBE_PARTICLE_COUNT);

const goldenRatio = (1 + Math.sqrt(5)) / 2;
for (let i = 0; i < GLOBE_PARTICLE_COUNT; i++) {
  const t = i / GLOBE_PARTICLE_COUNT;
  const inc = Math.acos(1 - 2 * t);
  const az = 2 * Math.PI * goldenRatio * i;

  const lat = 90 - THREE.MathUtils.radToDeg(inc);
  const lon = (THREE.MathUtils.radToDeg(az) % 360) - 180;
  const elev = sampleGlobeElevation(lat, lon);
  const r = MARS_RADIUS + elev * 0.042 + 0.015;

  const vx = -r * Math.sin(inc) * Math.cos(az);
  const vy =  r * Math.cos(inc);
  const vz =  r * Math.sin(inc) * Math.sin(az);

  globePTarget[i * 3]     = vx;
  globePTarget[i * 3 + 1] = vy;
  globePTarget[i * 3 + 2] = vz;
  globePSeed[i] = hash2(i * 0.17, i * 0.53);

  const isPolar = Math.abs(lat) > 76;
  const isHighland = elev > 0.08;
  if (isPolar) {
    globePColor[i * 3] = 0.95; globePColor[i * 3 + 1] = 0.96; globePColor[i * 3 + 2] = 1.0;
  } else if (isHighland) {
    globePColor[i * 3] = 0.96; globePColor[i * 3 + 1] = 0.52; globePColor[i * 3 + 2] = 0.30;
  } else {
    globePColor[i * 3] = 0.84; globePColor[i * 3 + 1] = 0.38; globePColor[i * 3 + 2] = 0.24;
  }
}

globePGeo.setAttribute('position', new THREE.BufferAttribute(globePTarget, 3));
globePGeo.setAttribute('aColor', new THREE.BufferAttribute(globePColor, 3));
globePGeo.setAttribute('aSeed', new THREE.BufferAttribute(globePSeed, 1));

const globeParticleShaderMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0.0 },
    uIntroProgress: { value: 0.0 }, // 0.0 = Pure Particle Globe -> 1.0 = Coalesced onto Real Mars Globe
    uShellOpacity: { value: 1.0 }
  },
  vertexShader: `
    uniform float uTime;
    uniform float uIntroProgress;
    attribute vec3 aColor;
    attribute float aSeed;
    varying vec3 vCol;
    varying float vGlow;

    void main() {
      float m = smoothstep(0.0, 1.0, uIntroProgress);
      float disperse = 1.0 - m;

      // Swirling spherical Chladni / curl-noise particle shell before coalescing into real Mars globe
      vec3 dir = normalize(position);
      float wave = sin(dir.x * 9.0 + uTime * 1.8 + aSeed * 6.28) * cos(dir.y * 9.0 - uTime * 1.4) +
                   sin(dir.z * 11.0 + uTime * 2.1);
      vec3 tangent = normalize(cross(dir, vec3(0.0, 1.0, 0.1)));
      vec3 bitangent = cross(dir, tangent);

      float radialExpand = (0.35 + aSeed * 1.35 + wave * 0.28) * disperse;
      vec3 swirlOffset = (tangent * sin(uTime * 1.6 + aSeed * 12.0) + bitangent * cos(uTime * 1.5 + aSeed * 9.0)) * 0.55 * disperse;
      vec3 finalPos = position + dir * radialExpand + swirlOffset;

      vGlow = smoothstep(0.15, 0.85, sin(uTime * 3.0 + aSeed * 20.0) * 0.5 + 0.5) * disperse;
      vCol = mix(aColor, vec3(0.32, 0.84, 1.0), vGlow * 0.55);

      vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
      gl_PointSize = clamp((2.6 * disperse + 1.15) * (14.0 / max(2.0, -mvPosition.z)), 1.0, 6.5);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform float uShellOpacity;
    varying vec3 vCol;
    varying float vGlow;
    void main() {
      float d = length(gl_PointCoord - vec2(0.5));
      if (d > 0.5) discard;
      float core = smoothstep(0.5, 0.08, d);
      gl_FragColor = vec4(vCol + vec3(vGlow * 0.25), core * uShellOpacity);
    }
  `,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});
const globeParticlePoints = new THREE.Points(globePGeo, globeParticleShaderMat);
marsMesh.add(globeParticlePoints);

const overlayCanvas = document.createElement('canvas');
overlayCanvas.width = 512; overlayCanvas.height = 256;
const oCtx = overlayCanvas.getContext('2d');
const overlayTex = new THREE.CanvasTexture(overlayCanvas);
const overlayMat = new THREE.MeshBasicMaterial({
  map: overlayTex,
  transparent: true,
  opacity: 0.52,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});
marsMesh.add(new THREE.Mesh(new THREE.SphereGeometry(MARS_RADIUS * 1.012, 96, 64), overlayMat));

function updateGlobeOverlayTexture() {
  oCtx.clearRect(0, 0, 512, 256);
  const topo = LAYERS.find(l => l.id === 'topo');
  const spec = LAYERS.find(l => l.id === 'spectral');
  const therm = LAYERS.find(l => l.id === 'thermal');
  const rad = LAYERS.find(l => l.id === 'radiation');

  if (topo && topo.active) {
    oCtx.strokeStyle = `rgba(52, 211, 153, ${0.24 * topo.opacity})`;
    oCtx.lineWidth = 1;
    for (let y = 24; y < 240; y += 20) {
      oCtx.beginPath();
      for (let x = 0; x <= 512; x += 8) {
        const dy = Math.sin(x * 0.04 + y) * 5 + Math.cos(x * 0.09) * 3;
        if (x === 0) oCtx.moveTo(x, y + dy);
        else oCtx.lineTo(x, y + dy);
      }
      oCtx.stroke();
    }
  }
  if (spec && spec.active) {
    const grad = oCtx.createRadialGradient(368, 148, 4, 368, 148, 96);
    grad.addColorStop(0, `rgba(56, 189, 248, ${0.58 * spec.opacity})`);
    grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    oCtx.fillStyle = grad;
    oCtx.fillRect(0, 0, 512, 256);
  }
  if (therm && therm.active) {
    const grad = oCtx.createLinearGradient(0, 75, 0, 185);
    grad.addColorStop(0, 'rgba(251, 113, 133, 0)');
    grad.addColorStop(0.5, `rgba(251, 113, 133, ${0.40 * therm.opacity})`);
    grad.addColorStop(1, 'rgba(251, 113, 133, 0)');
    oCtx.fillStyle = grad;
    oCtx.fillRect(0, 0, 512, 256);
  }
  if (rad && rad.active) {
    oCtx.fillStyle = `rgba(167, 139, 250, ${(state.sepStorm ? 0.45 : 0.18) * rad.opacity})`;
    oCtx.fillRect(0, 0, 512, 256);
  }
  overlayTex.needsUpdate = true;
}

const atmoMat = new THREE.ShaderMaterial({
  uniforms: {
    sunDir: { value: new THREE.Vector3(18, 10, 14).normalize() },
    stormFactor: { value: 0.0 },
    uSunsetBlue: { value: 0.0 },
    uFade: { value: 1.0 }
  },
  vertexShader: `
    varying vec3 vNormalWorld;
    varying vec3 vViewDir;
    void main() {
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vNormalWorld = normalize(mat3(modelMatrix) * normal);
      vViewDir = normalize(cameraPosition - worldPos.xyz);
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    uniform vec3 sunDir;
    uniform float stormFactor;
    uniform float uSunsetBlue;
    uniform float uFade;
    varying vec3 vNormalWorld;
    varying vec3 vViewDir;
    void main() {
      float viewDot = clamp(dot(vNormalWorld, vViewDir), 0.0, 1.0);
      float rim = pow(1.0 - viewDot, 3.3);
      float sunDot = dot(vNormalWorld, sunDir);
      float sunLit = smoothstep(-0.45, 0.80, sunDot);
      vec3 sunlitButterscotch = mix(vec3(0.92, 0.56, 0.28), vec3(0.36, 0.64, 0.94), uSunsetBlue);
      vec3 terminatorIndigoRust = mix(vec3(0.24, 0.14, 0.34), vec3(0.18, 0.42, 0.72), uSunsetBlue);
      vec3 baseAtmo = mix(terminatorIndigoRust, sunlitButterscotch, sunLit);
      vec3 stormTint = vec3(0.96, 0.28, 0.45);
      vec3 finalAtmo = mix(baseAtmo, stormTint, stormFactor * 0.65);
      float alpha = rim * (0.28 + 0.72 * sunLit) * 0.85 * uFade;
      gl_FragColor = vec4(finalAtmo, alpha);
    }
  `,
  transparent: true,
  blending: THREE.AdditiveBlending,
  side: THREE.BackSide,
  depthWrite: false
});
orbitalGroup.add(new THREE.Mesh(new THREE.SphereGeometry(MARS_RADIUS * 1.068, 96, 64), atmoMat));

function latLonToVec3(lat, lon, r) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon + 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

const beaconAnchors = SITES.map(site => {
  const elevOffset = sampleGlobeElevation(site.lat, site.lon) * 0.042;
  const pos = latLonToVec3(site.lat, site.lon, MARS_RADIUS + Math.max(0.04, elevOffset + 0.04));
  const anchor = new THREE.Object3D();
  anchor.position.copy(pos);
  marsMesh.add(anchor);

  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.085, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
  );
  anchor.add(dot);

  const ringGeo = new THREE.RingGeometry(0.12, 0.17, 32);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xe06d44, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.lookAt(pos.clone().multiplyScalar(2));
  anchor.add(ring);

  return { site, anchor, ring, pos };
});

// 3D Orbital Mountain Peak Anchors & Zoom-Revealed Labels (Google Maps / Mars Trek style)
const labelsLayer = document.getElementById('labels-layer');
const mountainMarkers = ORBITAL_MOUNTAINS.map((mtn) => {
  const elevOffset = sampleGlobeElevation(mtn.lat, mtn.lon) * 0.042;
  const pos = latLonToVec3(mtn.lat, mtn.lon, MARS_RADIUS + Math.max(0.03, elevOffset + 0.035));
  const anchor = new THREE.Object3D();
  anchor.position.copy(pos);
  marsMesh.add(anchor);

  const peakPin = new THREE.Mesh(
    new THREE.ConeGeometry(0.038, 0.09, 6),
    new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
  );
  peakPin.lookAt(pos.clone().multiplyScalar(2));
  peakPin.rotateX(Math.PI / 2);
  anchor.add(peakPin);

  const el = document.createElement('div');
  el.className = 'mountain-marker';
  el.title = 'Click to zoom close to this Martian mountain in 3D Orbital View (Double-click for Surface EVA)';
  const signStr = 'approximate feature locator';
  el.innerHTML = `
    <div class="mountain-chip">
      <span class="mountain-tri">▲</span>
      <span class="mountain-title">${mtn.name}</span>
      <span class="mountain-elev">${signStr}</span>
    </div>
  `;
  el.addEventListener('click', (ev) => {
    ev.stopPropagation();
    spaceAudio.playClickSFX('mode');
    state.autoSpin = false;
    document.getElementById('spin-btn').classList.remove('active');
    // Rotate Mars globe or glide orbital camera right down to inspect this mountain at 5.35 radius!
    const targetVec = latLonToVec3(mtn.lat, mtn.lon, 5.45);
    targetVec.applyAxisAngle(new THREE.Vector3(0, 0, 1), marsMesh.rotation.z);
    targetVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), marsMesh.rotation.y);
    animateCameraTo(targetVec, new THREE.Vector3(0, 0, 0), 34);
    document.getElementById('caption-title').textContent = `${mtn.name} (${mtn.type} · ${signStr})`;
    showToast(`Orbital Mountain Close-Up: ${mtn.name} (${signStr})`);
  });
  el.addEventListener('dblclick', (ev) => {
    ev.stopPropagation();
    if (typeof mtn.siteIdx === 'number') {
      selectSite(mtn.siteIdx);
      setMode('hybrid');
    }
  });
  labelsLayer.appendChild(el);
  return { mtn, anchor, el };
});

const cyberArcCurves = [];
const arcPairs = [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2], [1, 3]];
arcPairs.forEach(([i, j], idx) => {
  const vA = beaconAnchors[i].pos.clone();
  const vB = beaconAnchors[j].pos.clone();
  const mid = vA.clone().add(vB).multiplyScalar(0.5).normalize().multiplyScalar(MARS_RADIUS * (1.25 + (idx % 2) * 0.08));
  const curve = new THREE.QuadraticBezierCurve3(vA, mid, vB);
  cyberArcCurves.push(curve);

  const arcPts = curve.getPoints(56);
  marsMesh.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(arcPts),
    new THREE.LineBasicMaterial({
      color: idx % 2 === 0 ? 0x38bdf8 : 0xe06d44,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending
    })
  ));
});

const ARC_PACKET_COUNT = 160;
const arcPacketPos = new Float32Array(ARC_PACKET_COUNT * 3);
const arcPacketCol = new Float32Array(ARC_PACKET_COUNT * 3);
const arcPacketMeta = [];
for (let i = 0; i < ARC_PACKET_COUNT; i++) {
  const curveIdx = i % cyberArcCurves.length;
  const t = (i / ARC_PACKET_COUNT);
  arcPacketMeta.push({ curveIdx, t, speed: 0.19 + (i % 7) * 0.03 });
  const isCyan = curveIdx % 2 === 0;
  arcPacketCol[i * 3] = isCyan ? 0.22 : 1.0;
  arcPacketCol[i * 3 + 1] = isCyan ? 0.78 : 0.52;
  arcPacketCol[i * 3 + 2] = isCyan ? 1.0 : 0.28;
}
const arcPacketGeo = new THREE.BufferGeometry();
arcPacketGeo.setAttribute('position', new THREE.BufferAttribute(arcPacketPos, 3));
arcPacketGeo.setAttribute('color', new THREE.BufferAttribute(arcPacketCol, 3));
marsMesh.add(new THREE.Points(
  arcPacketGeo,
  new THREE.PointsMaterial({
    size: 0.15,
    map: PARTICLE_SPRITE,
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
));

const satSpecs = [
  { name: 'MRO // HiRISE-CRISM', radius: 5.55, incl: 0.48, speed: 0.32, phase: 0.4, color: 0x38bdf8, targetBeacon: 0 },
  { name: 'Mars Odyssey // THEMIS', radius: 5.95, incl: -0.58, speed: 0.25, phase: 1.9, color: 0xfb7185, targetBeacon: 1 },
  { name: 'MAVEN // SEP-RAD', radius: 6.35, incl: 0.72, speed: 0.20, phase: 3.4, color: 0xa78bfa, targetBeacon: 2 },
  { name: 'ESA-NASA TGO', radius: 5.75, incl: -0.32, speed: 0.28, phase: 4.8, color: 0x34d399, targetBeacon: 3 }
];

const satellites = satSpecs.map(s => {
  const orbitPivot = new THREE.Group();
  orbitPivot.rotation.z = s.incl;
  orbitPivot.rotation.x = s.incl * 0.35;
  orbitalGroup.add(orbitPivot);

  const pts = [];
  for (let i = 0; i <= 128; i++) {
    const a = (i / 128) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * s.radius, 0, Math.sin(a) * s.radius));
  }
  orbitPivot.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: s.color, transparent: true, opacity: 0.20 })
  ));

  const body = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.08, 0),
    new THREE.MeshBasicMaterial({ color: s.color })
  );
  orbitPivot.add(body);

  const beamGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  orbitalGroup.add(new THREE.Line(
    beamGeo,
    new THREE.LineBasicMaterial({ color: s.color, transparent: true, opacity: 0.30, blending: THREE.AdditiveBlending })
  ));

  return { ...s, body, beamGeo };
});

const markerEls = SITES.map((site, idx) => {
  const el = document.createElement('div');
  el.className = `globe-marker ${idx === 0 ? 'selected-site' : ''}`;
  el.innerHTML = `
    <div class="marker-tag">
      <span class="marker-pulse"></span>
      <span class="marker-name">0${idx + 1} · ${site.shortName}</span>
      <span class="marker-sub">SIM elevation ${site.baseElevM}m</span>
    </div>
    <div class="marker-stem"></div>
  `;
  el.addEventListener('mouseenter', () => spaceAudio.playQuindarTone(true));
  el.addEventListener('click', () => {
    spaceAudio.playQuindarTone(false);
    selectSite(idx);
    if (state.mode === 'orbital') {
      setMode('hybrid');
    }
    setTimeout(() => {
      openNasaReconModal(state.waypoints[0], SITES[idx], 0);
    }, 320);
  });
  labelsLayer.appendChild(el);
  return el;
});
// 6. PRE-BAKED 4 SPECIFIC MARTIAN AREA 3D MODELS + CHLADNI GPU SHADERS
const surfaceGroup = new THREE.Group();
surfaceGroup.visible = false;
scene.add(surfaceGroup);

const DEM_SIZE = 104;
const DEM_SEGMENTS = 192;
const PARTICLE_GRID = MOBILE ? 120 : 240;
const PARTICLE_COUNT = PARTICLE_GRID * PARTICLE_GRID; // 57,600 GPU particles

function evaluateSitePoint(siteId, x, z) {
  const s = SITES[siteId];
  const nx = x * 0.045 + s.seed;
  const nz = z * 0.045 + s.seed * 0.7;

  let h = (fbm(nx, nz, 5) - 0.5) * 9.5 * s.roughness;
  let featureMask = 0.0;

  if (siteId === 0) {
    const slopeRise = (38 - x) * 0.085 + (38 - z) * 0.055;
    const bx = Math.abs(Math.sin(x * 0.24 + z * 0.17 + fbm(nx * 1.9, nz * 1.9, 2) * 2.1));
    const bz = Math.abs(Math.cos(z * 0.23 - x * 0.15 + fbm(nx * 2.1, nz * 2.1, 2) * 2.1));
    const ridgeA = Math.pow(Math.max(0, 1.0 - bx * 3.8), 1.85);
    const ridgeB = Math.pow(Math.max(0, 1.0 - bz * 3.8), 1.85);
    const boxwork = Math.min(1.15, ridgeA + ridgeB);
    const terrace = Math.floor((h + slopeRise) * 1.35) * 0.36;
    h = h * 0.52 + slopeRise + boxwork * 2.25 + terrace * 0.35 - 2.4;
    featureMask = Math.min(1.0, boxwork * 1.05);
  } else if (siteId === 1) {
    const distFan = Math.sqrt((x + 28) * (x + 28) + (z - 22) * (z - 22));
    const fanLobe = distFan < 48.0 ? 3.8 * (1.0 / (1.0 + Math.exp((distFan - 35.0) * 0.38))) : 0.0;
    const channelZ = 18.0 - (x + 42.0) * 0.42 + Math.sin(x * 0.16) * 4.5;
    const channelDist = Math.abs(z - channelZ);
    const channelCut = channelDist < 5.2 ? Math.cos((channelDist / 5.2) * Math.PI * 0.5) * 2.65 : 0.0;
    const belvaDist = Math.sqrt((x + 6) * (x + 6) + (z - 4) * (z - 4));
    const belvaBowl = belvaDist < 8.5 ? -2.2 * Math.cos((belvaDist / 8.5) * Math.PI * 0.5) : 0.0;
    const belvaRim = Math.exp(-Math.pow((belvaDist - 8.8) / 1.8, 2)) * 0.95;
    const strataStep = Math.sin(distFan * 0.85) * 0.25 * (fanLobe > 0.5 ? 1.0 : 0.0);
    h = h * 0.42 + fanLobe + strataStep - channelCut + belvaBowl + belvaRim - 1.1;
    featureMask = Math.min(1.0, (fanLobe * 0.22) + (channelCut * 0.35) + (belvaRim * 0.7));
  } else if (siteId === 2) {
    const canyonAxis = z - x * 0.28 + Math.sin(x * 0.09) * 5.2;
    const absWall = Math.abs(canyonAxis);
    const canyonFloor = absWall < 16.0 ? -4.8 * Math.cos((absWall / 16.0) * Math.PI * 0.5) : 2.6 * Math.min(1.4, (absWall - 16.0) / 14.0);
    const faultStep = Math.tanh((canyonAxis - 10.0) * 0.45) * 1.4 - Math.tanh((canyonAxis + 10.0) * 0.45) * 1.4;
    const ildDist = Math.sqrt((x - 4) * (x - 4) * 0.6 + (z - 1) * (z - 1) * 1.5);
    const ildMesa = ildDist < 10.5 ? 3.2 * (1.0 / (1.0 + Math.exp((ildDist - 7.5) * 0.85))) : 0.0;
    h = h * 0.50 + canyonFloor + faultStep * 0.45 + ildMesa;
    featureMask = Math.min(1.0, (ildMesa * 0.32) + (absWall < 14.0 ? 0.52 : 0.12));
  } else if (siteId === 3) {
    const flankTilt = (x - z) * 0.065;
    const r = Math.sqrt((x - 5) * (x - 5) + (z + 4) * (z + 4));
    const skylightPit = r < 11.5 ? -7.2 * Math.pow(1.0 - (r / 11.5) * (r / 11.5), 1.65) : 0.0;
    const raisedCollar = Math.exp(-Math.pow((r - 12.2) / 2.6, 2)) * 1.65;
    const tubeTrend = Math.abs((z + 4) + (x - 5) * 0.65 + Math.sin(x * 0.15) * 2.6);
    const tubeDepression = (tubeTrend < 4.5 && r >= 11.5) ? -1.45 * Math.cos((tubeTrend / 4.5) * Math.PI * 0.5) : 0.0;
    const ropeyLava = ridgedFbm(nx * 2.8, nz * 2.8, 3) * 1.15;
    h = h * 0.42 + flankTilt + skylightPit + raisedCollar + tubeDepression + ropeyLava;
    featureMask = r < 14.5 ? Math.min(1.0, (14.5 - r) / 8.0) : (tubeDepression < -0.3 ? 0.68 : 0.15);
  }

  return { h, featureMask };
}

function createSiteHighResTexture(siteIdx) {
  const s = SITES[siteIdx];
  const W = 512, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(W, H);

  for (let py = 0; py < H; py++) {
    const z = ((py / (H - 1)) - 0.5) * DEM_SIZE;
    for (let px = 0; px < W; px++) {
      const x = ((px / (W - 1)) - 0.5) * DEM_SIZE;
      const { h, featureMask } = evaluateSitePoint(siteIdx, x, z);

      const micro = fbm(x * 0.35 + s.seed, z * 0.35 + s.seed, 4);
      const strata = Math.sin(h * 3.8 + micro * 3.5) * 0.5 + 0.5;
      const eolian = Math.sin(x * 1.6 + z * 1.2 + micro * 4.0) * 0.5 + 0.5;

      let r = 168, g = 88, b = 56;
      if (siteIdx === 0) {
        r = 172 + strata * 36 + featureMask * 38 + (micro - 0.5) * 24;
        g = 92 + strata * 24 + featureMask * 28 + (micro - 0.5) * 18;
        b = 58 + strata * 14 + featureMask * 20 + (micro - 0.5) * 12;
      } else if (siteIdx === 1) {
        r = 158 + strata * 34 - featureMask * 18 + eolian * 14;
        g = 94 + strata * 26 + featureMask * 24 + eolian * 10;
        b = 64 + strata * 16 + featureMask * 28 + eolian * 8;
      } else if (siteIdx === 2) {
        r = 148 + strata * 48 + featureMask * 30 - (h < -2 ? 22 : 0);
        g = 78 + strata * 32 + featureMask * 24 - (h < -2 ? 12 : 0);
        b = 52 + strata * 20 + featureMask * 22;
      } else if (siteIdx === 3) {
        const pitDark = h < -2.0 ? Math.max(0.22, 1.0 + (h + 2.0) * 0.14) : 1.0;
        r = (132 + strata * 26 + (micro - 0.5) * 32) * pitDark;
        g = (72 + strata * 16 + (micro - 0.5) * 20) * pitDark;
        b = (50 + strata * 12 + (micro - 0.5) * 16) * pitDark;
      }

      const idx = (py * W + px) * 4;
      imgData.data[idx]     = Math.max(0, Math.min(255, r));
      imgData.data[idx + 1] = Math.max(0, Math.min(255, g));
      imgData.data[idx + 2] = Math.max(0, Math.min(255, b));
      imgData.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;


  return tex;
}

const SITE_TEXTURES = SITES.map((_, idx) => createSiteHighResTexture(idx));

function prebakeAllSiteGeometryBuffers() {
  const caches = [];
  const eps = 0.45;
  const vertCount = (DEM_SEGMENTS + 1) * (DEM_SEGMENTS + 1);

  for (let siteIdx = 0; siteIdx < SITES.length; siteIdx++) {
    const terrainState = new Float32Array(vertCount * 4);
    let vPtr = 0;
    for (let iz = 0; iz <= DEM_SEGMENTS; iz++) {
      const z = (iz / DEM_SEGMENTS - 0.5) * DEM_SIZE;
      for (let ix = 0; ix <= DEM_SEGMENTS; ix++) {
        const x = (ix / DEM_SEGMENTS - 0.5) * DEM_SIZE;
        const c = evaluateSitePoint(siteIdx, x, z);
        const hx = evaluateSitePoint(siteIdx, x + eps, z).h - evaluateSitePoint(siteIdx, x - eps, z).h;
        const hz = evaluateSitePoint(siteIdx, x, z + eps).h - evaluateSitePoint(siteIdx, x, z - eps).h;
        const dHdx = hx / (2 * eps);
        const dHdz = hz / (2 * eps);

        terrainState[vPtr++] = c.h;
        terrainState[vPtr++] = -dHdx;
        terrainState[vPtr++] = -dHdz;
        terrainState[vPtr++] = c.featureMask;
      }
    }

    const particlePos = new Float32Array(PARTICLE_COUNT * 3);
    const particleCol = new Float32Array(PARTICLE_COUNT * 3);
    let pIdx = 0;
    for (let gz = 0; gz < PARTICLE_GRID; gz++) {
      for (let gx = 0; gx < PARTICLE_GRID; gx++) {
        const jx = (hash2(gx + siteIdx * 13, gz) - 0.5) * 0.34;
        const jz = (hash2(gz, gx + siteIdx * 17) - 0.5) * 0.34;
        const x = ((gx + jx) / (PARTICLE_GRID - 1) - 0.5) * DEM_SIZE;
        const z = ((gz + jz) / (PARTICLE_GRID - 1) - 0.5) * DEM_SIZE;
        const { h, featureMask } = evaluateSitePoint(siteIdx, x, z);

        particlePos[pIdx * 3]     = x;
        particlePos[pIdx * 3 + 1] = h + 0.08;
        particlePos[pIdx * 3 + 2] = z;

        const normH = Math.max(0, Math.min(1, (h + 6.5) / 13.0));
        let r = 0.72 + normH * 0.24;
        let g = 0.34 + normH * 0.22 + featureMask * 0.25;
        let b = 0.22 + normH * 0.14 + featureMask * 0.42;

        if (featureMask > 0.58) {
          r = 0.24 + normH * 0.20;
          g = 0.78 + normH * 0.16;
          b = 0.96;
        }

        particleCol[pIdx * 3]     = Math.min(1, r);
        particleCol[pIdx * 3 + 1] = Math.min(1, g);
        particleCol[pIdx * 3 + 2] = Math.min(1, b);
        pIdx++;
      }
    }

    caches.push({ terrainState, particlePos, particleCol });
  }
  return caches;
}

const SITE_CACHES = prebakeAllSiteGeometryBuffers();

function getSiteHeight(siteIdx, x, z) {
  return evaluateSitePoint(siteIdx, x, z).h * state.relief;
}

function getSiteSlopeDeg(siteIdx, x, z) {
  const eps = 0.6;
  const hx = getSiteHeight(siteIdx, x + eps, z) - getSiteHeight(siteIdx, x - eps, z);
  const hz = getSiteHeight(siteIdx, x, z + eps) - getSiteHeight(siteIdx, x, z - eps);
  const grad = Math.sqrt((hx / (2 * eps)) ** 2 + (hz / (2 * eps)) ** 2);
  return THREE.MathUtils.radToDeg(Math.atan(grad));
}

const terrainGeo = new THREE.PlaneGeometry(DEM_SIZE, DEM_SIZE, DEM_SEGMENTS, DEM_SEGMENTS);
terrainGeo.rotateX(-Math.PI / 2);

const attrStateFrom = new THREE.BufferAttribute(new Float32Array(SITE_CACHES[0].terrainState), 4);
const attrStateTo   = new THREE.BufferAttribute(new Float32Array(SITE_CACHES[0].terrainState), 4);
terrainGeo.setAttribute('aStateFrom', attrStateFrom);
terrainGeo.setAttribute('aStateTo', attrStateTo);
const uhfShadowArr = new Float32Array((DEM_SEGMENTS + 1) * (DEM_SEGMENTS + 1));
const attrUhfShadow = new THREE.BufferAttribute(uhfShadowArr, 1);
terrainGeo.setAttribute('aUhfShadow', attrUhfShadow);

const terrainShaderMat = new THREE.ShaderMaterial({
  uniforms: {
    uSiteTexFrom: { value: SITE_TEXTURES[0] },
    uSiteTexTo: { value: SITE_TEXTURES[0] },
    uMorphProgress: { value: 1.0 },
    uReliefScale: { value: state.relief },
    uOpacity: { value: 1.0 },
    uSunDir: { value: new THREE.Vector3(18, 12, 14).normalize() },
    uLayerWeights: { value: new THREE.Vector4(1.0, 0.70, 0.80, 0.0) },
    uLayerRad: { value: 0.0 },
    uStormFactor: { value: 0.0 },
    uDustHaze: { value: 0.0 },
    uUhfViewshed: { value: 0.0 },
    uSkyTint: { value: new THREE.Vector3(0.78, 0.52, 0.38) },
    uRippleCenter: { value: new THREE.Vector3(0, 0, 0) },
    uRippleProgress: { value: 1.0 }
  },
  vertexShader: GLSL_TERRAIN_VERTEX_SHADER,
  fragmentShader: GLSL_TERRAIN_FRAGMENT_SHADER,
  transparent: true
});

const terrainMesh = new THREE.Mesh(terrainGeo, terrainShaderMat);
surfaceGroup.add(terrainMesh);

const particleGeo = new THREE.BufferGeometry();
const dummyPos = new Float32Array(PARTICLE_COUNT * 3);
const aRandomArray = new Float32Array(PARTICLE_COUNT);
for (let i = 0; i < PARTICLE_COUNT; i++) {
  aRandomArray[i] = hash2(i * 0.13, i * 0.71);
}

const attrPosFrom = new THREE.BufferAttribute(new Float32Array(SITE_CACHES[0].particlePos), 3);
const attrPosTo   = new THREE.BufferAttribute(new Float32Array(SITE_CACHES[0].particlePos), 3);
const attrColFrom = new THREE.BufferAttribute(new Float32Array(SITE_CACHES[0].particleCol), 3);
const attrColTo   = new THREE.BufferAttribute(new Float32Array(SITE_CACHES[0].particleCol), 3);

particleGeo.setAttribute('position', new THREE.BufferAttribute(dummyPos, 3));
particleGeo.setAttribute('aPosFrom', attrPosFrom);
particleGeo.setAttribute('aPosTo', attrPosTo);
particleGeo.setAttribute('aColFrom', attrColFrom);
particleGeo.setAttribute('aColTo', attrColTo);
particleGeo.setAttribute('aRandom', new THREE.BufferAttribute(aRandomArray, 1));

const particleShaderMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0.0 },
    uMorphProgress: { value: 1.0 },
    uPointSize: { value: 1.55 },
    uReliefScale: { value: state.relief },
    uOpacityScale: { value: 0.34 },
    uLayerWeights: { value: new THREE.Vector4(1.0, 0.70, 0.80, 0.0) },
    uLayerRad: { value: 0.0 },
    uStormFactor: { value: 0.0 },
    uChladniParams: { value: new THREE.Vector4(3.0, 7.0, 3.0, 7.0) },
    uRippleCenter: { value: new THREE.Vector3(0, 0, 0) },
    uRippleProgress: { value: 1.0 }
  },
  vertexShader: GLSL_PARTICLE_VERTEX_SHADER,
  fragmentShader: GLSL_PARTICLE_FRAGMENT_SHADER,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});

const surfaceParticles = new THREE.Points(particleGeo, particleShaderMat);
surfaceParticles.frustumCulled = false;
surfaceGroup.add(surfaceParticles);

const placeDemoGroup = new THREE.Group();
surfaceGroup.add(placeDemoGroup);

const DEMO_LANDMARK_MAT = new THREE.MeshStandardMaterial({
  color: 0xb85d3b,
  roughness: 0.88,
  metalness: 0.06
});
const DEMO_ACCENT_MAT = new THREE.MeshBasicMaterial({
  color: 0x38bdf8,
  wireframe: true,
  transparent: true,
  opacity: 0.22
});

function clearGroupAndDispose(group) {
  while (group.children.length > 0) {
    const child = group.children[0];
    group.remove(child);
    if (child.geometry) child.geometry.dispose();
  }
}

function buildSiteLandmarkProps(siteIdx) {
  clearGroupAndDispose(placeDemoGroup);
  // Strictly hide basic/hybrid landmark props whenever in Pure Particle LiDAR or Orbital mode!
  placeDemoGroup.visible = (state.mode === 'hybrid' && state.placeDemoActive);

  if (siteIdx === 0) {
    const boxCoords = [
      [-16, 14, 5.5, 0.65], [-6, 4, 6.2, -0.45], [6, -4, 5.8, 0.82],
      [16, -12, 6.4, -0.30], [-4, -14, 5.0, 0.22], [14, 10, 5.2, 1.1]
    ];
    boxCoords.forEach(([x, z, len, rot]) => {
      const y = getSiteHeight(siteIdx, x, z);
      const wallGeo = new THREE.BoxGeometry(len, 1.25, 0.55);
      const wall = new THREE.Mesh(wallGeo, DEMO_LANDMARK_MAT);
      wall.position.set(x, y + 0.45, z);
      wall.rotation.y = rot;
      placeDemoGroup.add(wall);

      const wire = new THREE.Mesh(wallGeo.clone(), DEMO_ACCENT_MAT);
      wire.position.copy(wall.position);
      wire.rotation.copy(wall.rotation);
      placeDemoGroup.add(wire);
    });
  } else if (siteIdx === 1) {
    const boulders = [
      [-10, 14, 0.72], [-2, 8, 0.58], [6, 2, 0.85], [14, -8, 0.64], [22, -14, 0.75]
    ];
    boulders.forEach(([x, z, r]) => {
      const y = getSiteHeight(siteIdx, x, z);
      const bGeo = new THREE.DodecahedronGeometry(r, 1);
      const mesh = new THREE.Mesh(bGeo, DEMO_LANDMARK_MAT);
      mesh.position.set(x, y + r * 0.55, z);
      mesh.scale.set(1.3, 0.75, 1.1);
      placeDemoGroup.add(mesh);
    });
  } else if (siteIdx === 2) {
    const mesas = [[4, 1, 3.6, 1.9], [-12, -6, 2.5, 1.4], [16, 8, 2.8, 1.5]];
    mesas.forEach(([x, z, rad, h]) => {
      const y = getSiteHeight(siteIdx, x, z);
      const mGeo = new THREE.CylinderGeometry(rad * 0.72, rad, h, 8);
      const mesh = new THREE.Mesh(mGeo, DEMO_LANDMARK_MAT);
      mesh.position.set(x, y + h * 0.35, z);
      placeDemoGroup.add(mesh);
    });
  } else if (siteIdx === 3) {
    const cx = 5, cz = -4;
    const baseH = getSiteHeight(siteIdx, cx + 11, cz);
    const archGeo = new THREE.TorusGeometry(9.8, 1.15, 12, 36, Math.PI);
    const arch = new THREE.Mesh(archGeo, DEMO_LANDMARK_MAT);
    arch.position.set(cx, baseH - 0.8, cz);
    arch.rotation.x = Math.PI * 0.42;
    arch.rotation.z = 0.35;
    placeDemoGroup.add(arch);

    const glowGeo = new THREE.CylinderGeometry(6.5, 8.2, 4.5, 24, 1, true);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const cavernGlow = new THREE.Mesh(glowGeo, glowMat);
    cavernGlow.position.set(cx, baseH - 4.2, cz);
    placeDemoGroup.add(cavernGlow);
  }
}

function updateShaderLayerUniforms() {
  const getW = (id) => {
    const l = LAYERS.find(x => x.id === id);
    return (l && l.active) ? l.opacity : 0.0;
  };
  const wOpt = getW('optical');
  const wTopo = getW('topo');
  const wSpec = getW('spectral');
  const wTherm = getW('thermal');
  const wRad = getW('radiation');

  terrainShaderMat.uniforms.uLayerWeights.value.set(wOpt, wTopo, wSpec, wTherm);
  terrainShaderMat.uniforms.uLayerRad.value = wRad;
  terrainShaderMat.uniforms.uStormFactor.value = state.sepStorm ? 1.0 : 0.0;

  particleShaderMat.uniforms.uLayerWeights.value.set(wOpt, wTopo, wSpec, wTherm);
  particleShaderMat.uniforms.uLayerRad.value = wRad;
  particleShaderMat.uniforms.uStormFactor.value = state.sepStorm ? 1.0 : 0.0;
}

const routeGroup = new THREE.Group();
surfaceGroup.add(routeGroup);

const scrubRing = new THREE.Mesh(
  new THREE.RingGeometry(0.6, 0.98, 32),
  new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
);
scrubRing.rotation.x = -Math.PI / 2;
scrubRing.visible = false;
surfaceGroup.add(scrubRing);

const dropPreviewGroup = new THREE.Group();
dropPreviewGroup.visible = false;
const dropRingMesh = new THREE.Mesh(
  new THREE.RingGeometry(0.75, 1.15, 32),
  new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.92 })
);
dropRingMesh.rotation.x = -Math.PI / 2;
dropPreviewGroup.add(dropRingMesh);
const dropBeamMesh = new THREE.Mesh(
  new THREE.CylinderGeometry(0.06, 0.06, 4.5, 12),
  new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending })
);
dropBeamMesh.position.y = 2.25;
dropPreviewGroup.add(dropBeamMesh);
surfaceGroup.add(dropPreviewGroup);
// 7. ARTICULATED ASTRONAUT MODEL
function createArticulatedAstronaut() {
  const root = new THREE.Group();

  // Authentic International Safety Orange ACES/Orion Flight Suit Palette (procedural model)
  const suitOrange = new THREE.MeshStandardMaterial({ color: 0xd96b27, roughness: 0.56, metalness: 0.06 });
  const suitFoldDark = new THREE.MeshStandardMaterial({ color: 0xad4c14, roughness: 0.66, metalness: 0.05 });
  const harnessNavy = new THREE.MeshStandardMaterial({ color: 0x1b2434, roughness: 0.62, metalness: 0.24 });
  const helmetShellWhite = new THREE.MeshStandardMaterial({ color: 0xe8ecf2, roughness: 0.22, metalness: 0.28 });
  const obsidianVisorMat = new THREE.MeshStandardMaterial({
    color: 0x0f141d,
    roughness: 0.04,
    metalness: 0.96,
    envMapIntensity: 2.0
  });
  const gloveBootCharcoal = new THREE.MeshStandardMaterial({ color: 0x191d24, roughness: 0.58, metalness: 0.22 });
  const silverHardware = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.25, metalness: 0.88 });
  const nasaBluePatch = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.45, metalness: 0.12 });
  const skinInteriorMat = new THREE.MeshStandardMaterial({ color: 0xd6a184, roughness: 0.65, metalness: 0.05 });
  const cyanGlow = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

  // 1. Anatomical Human Pelvis & Tailored Hip Silhouette
  const pelvisGroup = new THREE.Group();
  pelvisGroup.position.y = 1.00;
  root.add(pelvisGroup);

  const pelvisCore = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.195, 0.22, 24), suitOrange);
  pelvisCore.scale.set(1.06, 1.0, 0.80);
  pelvisGroup.add(pelvisCore);

  // Waist Harness Belt & Silver Buckle
  const waistBelt = new THREE.Mesh(new THREE.CylinderGeometry(0.212, 0.212, 0.048, 24), harnessNavy);
  waistBelt.scale.set(1.06, 1.0, 0.81);
  waistBelt.position.y = 0.065;
  pelvisGroup.add(waistBelt);

  const beltBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.052, 0.03), silverHardware);
  beltBuckle.position.set(0, 0.065, 0.172);
  pelvisGroup.add(beltBuckle);

  // 2. Anatomical Human Torso & Breathing Ribcage
  const torsoGroup = new THREE.Group();
  torsoGroup.position.y = 0.11;
  pelvisGroup.add(torsoGroup);

  const ribcageGroup = new THREE.Group();
  torsoGroup.add(ribcageGroup);

  // Lower Abdomen with organic cloth folds
  const abdomen = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.202, 0.24, 24), suitOrange);
  abdomen.position.y = 0.12;
  abdomen.scale.set(1.05, 1.0, 0.78);
  ribcageGroup.add(abdomen);

  for (let w = 0; w < 2; w++) {
    const crease = new THREE.Mesh(new THREE.TorusGeometry(0.208, 0.012, 8, 24), suitFoldDark);
    crease.rotation.x = Math.PI / 2;
    crease.scale.set(1.05, 0.78, 1.0);
    crease.position.y = 0.06 + w * 0.07;
    ribcageGroup.add(crease);
  }

  // Sculpted Human Chest & Natural Sloped Shoulders
  const upperChest = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.225, 0.34, 28), suitOrange);
  upperChest.position.y = 0.38;
  upperChest.scale.set(1.10, 1.0, 0.80);
  ribcageGroup.add(upperChest);

  const shoulderCapL = new THREE.Mesh(new THREE.SphereGeometry(0.115, 20, 16), suitOrange);
  shoulderCapL.position.set(0.28, 0.50, 0);
  shoulderCapL.scale.set(1.1, 0.85, 0.92);
  ribcageGroup.add(shoulderCapL);

  const shoulderCapR = shoulderCapL.clone();
  shoulderCapR.position.x = -0.28;
  ribcageGroup.add(shoulderCapR);

  // Dark Navy Parachute / Survival Y-Harness Straps over Shoulders & Chest
  const strapL = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.52, 0.37), harnessNavy);
  strapL.position.set(0.135, 0.32, 0.005);
  ribcageGroup.add(strapL);

  const strapR = strapL.clone();
  strapR.position.x = -0.135;
  ribcageGroup.add(strapR);

  const chestCrossStrap = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.045, 0.38), harnessNavy);
  chestCrossStrap.position.set(0, 0.40, 0.006);
  ribcageGroup.add(chestCrossStrap);

  const chestBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.05, 0.025), silverHardware);
  chestBuckle.position.set(0, 0.40, 0.20);
  ribcageGroup.add(chestBuckle);

  // Circular Blue NASA Vector Patch on Right Chest & Metallic O2/Cooling Valves
  const nasaPatch = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.012, 20), nasaBluePatch);
  nasaPatch.rotation.x = Math.PI / 2;
  nasaPatch.position.set(-0.085, 0.46, 0.198);
  ribcageGroup.add(nasaPatch);

  const valvePortL = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.03, 14), silverHardware);
  valvePortL.rotation.x = Math.PI / 2;
  valvePortL.position.set(0.085, 0.28, 0.195);
  ribcageGroup.add(valvePortL);

  const valvePortR = valvePortL.clone();
  valvePortR.position.set(-0.085, 0.25, 0.192);
  ribcageGroup.add(valvePortR);

  // Braided Side Umbilical Hose from Chest Valve to Hip
  const hoseCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.085, 0.25, 0.20),
    new THREE.Vector3(-0.22, 0.14, 0.14),
    new THREE.Vector3(-0.23, -0.04, 0.02)
  ]);
  const sideHose = new THREE.Mesh(new THREE.TubeGeometry(hoseCurve, 18, 0.014, 8, false), gloveBootCharcoal);
  ribcageGroup.add(sideHose);

  // 3. Compact Quilted Orange Dorsal Backpack (procedural model)
  const dorsalPackGroup = new THREE.Group();
  dorsalPackGroup.position.set(0, 0.35, -0.22);
  torsoGroup.add(dorsalPackGroup);

  const packBase = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.46, 0.14), suitOrange);
  dorsalPackGroup.add(packBase);

  // 4 Horizontal & Vertical Quilted Cushioned Ribs on Dorsal Pack
  for (let r = 0; r < 4; r++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.085, 0.165), suitFoldDark);
    rib.position.set(0, -0.15 + r * 0.10, -0.008);
    dorsalPackGroup.add(rib);
  }

  const packTopRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.34, 16), suitOrange);
  packTopRoll.rotation.z = Math.PI / 2;
  packTopRoll.position.set(0, 0.24, 0.01);
  dorsalPackGroup.add(packTopRoll);

  const packBottomStrap = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.036, 0.17), harnessNavy);
  packBottomStrap.position.set(0, -0.20, 0);
  dorsalPackGroup.add(packBottomStrap);

  // 4. Anatomical Neck Bearing & Glossy White/Silver Helmet with Obsidian Full-Face Visor
  const neckCollar = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.024, 12, 28), gloveBootCharcoal);
  neckCollar.rotation.x = Math.PI / 2;
  neckCollar.position.y = 0.56;
  torsoGroup.add(neckCollar);

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.58, 0);
  torsoGroup.add(headPivot);

  const innerHead = new THREE.Mesh(new THREE.SphereGeometry(0.135, 20, 20), skinInteriorMat);
  innerHead.position.set(0, 0.16, 0.01);
  headPivot.add(innerHead);

  // Outer Helmet Assembly (automatically hidden in 1st-Person Visor POV)
  const helmetOuterGroup = new THREE.Group();
  headPivot.add(helmetOuterGroup);

  const helmetDome = new THREE.Mesh(new THREE.SphereGeometry(0.195, 32, 28), helmetShellWhite);
  helmetDome.position.set(0, 0.17, 0);
  helmetDome.scale.set(0.96, 1.04, 1.02);
  helmetOuterGroup.add(helmetDome);

  const chinBezel = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.148, 0.065, 24), gloveBootCharcoal);
  chinBezel.position.set(0, 0.025, 0.01);
  helmetOuterGroup.add(chinBezel);

  // Full-Face Curved Obsidian Reflective Visor
  const obsidianVisor = new THREE.Mesh(
    new THREE.SphereGeometry(0.188, 32, 24, -Math.PI * 0.38, Math.PI * 0.76, Math.PI * 0.18, Math.PI * 0.56),
    obsidianVisorMat
  );
  obsidianVisor.position.set(0, 0.17, 0.028);
  helmetOuterGroup.add(obsidianVisor);

  // Side Visor Pivot Pods
  const pivotPodL = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.03, 16), silverHardware);
  pivotPodL.rotation.z = Math.PI / 2;
  pivotPodL.position.set(0.185, 0.17, 0.01);
  helmetOuterGroup.add(pivotPodL);

  const pivotPodR = pivotPodL.clone();
  pivotPodR.position.x = -0.185;
  helmetOuterGroup.add(pivotPodR);

  // 5. Anatomical Human Arms with Wrinkle Folds, Sleeve Patches & 5-Fingered Charcoal Gloves
  function buildHumanSuitArm(sideSign) {
    const shoulderPivot = new THREE.Group();
    shoulderPivot.position.set(sideSign * 0.31, 0.48, 0);

    const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.068, 0.31, 20), suitOrange);
    upperArm.position.y = -0.15;
    shoulderPivot.add(upperArm);

    // Sleeve Mission Patch
    const sleevePatch = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.055, 0.075), sideSign > 0 ? nasaBluePatch : helmetShellWhite);
    sleevePatch.position.set(sideSign * 0.074, -0.12, 0);
    shoulderPivot.add(sleevePatch);

    // Organic cloth folds above elbow
    for (let b = 0; b < 2; b++) {
      const fold = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.010, 8, 18), suitFoldDark);
      fold.rotation.x = Math.PI / 2;
      fold.position.y = -0.24 - b * 0.035;
      shoulderPivot.add(fold);
    }

    const elbowPivot = new THREE.Group();
    elbowPivot.position.y = -0.31;
    shoulderPivot.add(elbowPivot);

    const elbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.066, 16, 16), suitOrange);
    elbowPivot.add(elbowJoint);

    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.054, 0.28, 20), suitOrange);
    forearm.position.y = -0.14;
    elbowPivot.add(forearm);

    const wristRing = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.010, 8, 18), gloveBootCharcoal);
    wristRing.rotation.x = Math.PI / 2;
    wristRing.position.y = -0.27;
    elbowPivot.add(wristRing);

    if (sideSign > 0) {
      const cuffBox = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.085, 0.072), gloveBootCharcoal);
      cuffBox.position.set(0, -0.19, 0.028);
      elbowPivot.add(cuffBox);
      const cuffScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.068, 0.052), cyanGlow);
      cuffScreen.position.set(0, -0.19, 0.066);
      elbowPivot.add(cuffScreen);
    }

    // Dark Charcoal 5-Fingered Tactile EVA Glove
    const handGroup = new THREE.Group();
    handGroup.position.y = -0.30;
    elbowPivot.add(handGroup);

    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.082, 0.042), gloveBootCharcoal);
    handGroup.add(palm);

    const fingers = [];
    for (let f = 0; f < 4; f++) {
      const fx = (f - 1.5) * 0.018;
      const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0065, 0.055, 8), gloveBootCharcoal);
      finger.position.set(fx, -0.058, 0.006);
      finger.rotation.x = 0.24;
      handGroup.add(finger);
      fingers.push(finger);
    }
    const thumb = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.0075, 0.048, 8), gloveBootCharcoal);
    thumb.position.set(-sideSign * 0.044, -0.02, 0.018);
    thumb.rotation.z = sideSign * 0.52;
    thumb.rotation.x = 0.32;
    handGroup.add(thumb);

    // Right-Hand Metallic Wire Geological Sample Collection Basket (procedural model)
    if (sideSign < 0) {
      const basketGroup = new THREE.Group();
      basketGroup.position.set(-0.08, -0.12, 0.06);
      handGroup.add(basketGroup);

      const bW = 0.28, bH = 0.15, bD = 0.20;
      const wireGeo = new THREE.BoxGeometry(bW, bH, bD, 6, 3, 4);
      const wireMat = new THREE.MeshStandardMaterial({
        color: 0xdbe4f0,
        roughness: 0.25,
        metalness: 0.85,
        wireframe: true
      });
      const wireMesh = new THREE.Mesh(wireGeo, wireMat);
      basketGroup.add(wireMesh);

      const rimLoop = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.012, 0.014, bD + 0.012), silverHardware);
      rimLoop.position.y = bH * 0.5;
      basketGroup.add(rimLoop);

      const handleGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.14, 10), gloveBootCharcoal);
      handleGrip.rotation.x = Math.PI / 2;
      handleGrip.position.set(0.02, bH * 0.5 + 0.045, 0);
      basketGroup.add(handleGrip);

      // Martian Sulfate & Basalt Core Rock Samples inside the Basket
      const sampleRock1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.042, 0), suitFoldDark);
      sampleRock1.position.set(-0.04, -0.02, 0.02);
      basketGroup.add(sampleRock1);

      const sampleRock2 = new THREE.Mesh(new THREE.OctahedronGeometry(0.035, 0), cyanGlow);
      sampleRock2.position.set(0.05, -0.03, -0.02);
      basketGroup.add(sampleRock2);
    }

    torsoGroup.add(shoulderPivot);
    return { shoulderPivot, elbowPivot, handGroup, fingers, thumb };
  }

  const leftArm = buildHumanSuitArm(1);
  const rightArm = buildHumanSuitArm(-1);

  // 6. Anatomical Human Legs with Tailored Orange Trousers, Fabric Folds & Charcoal EVA Boots
  function buildHumanSuitLeg(sideSign) {
    const hipPivot = new THREE.Group();
    hipPivot.position.set(sideSign * 0.118, -0.04, 0);

    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.098, 0.082, 0.42, 20), suitOrange);
    thigh.position.y = -0.21;
    hipPivot.add(thigh);

    // Thigh Harness Strap
    const thighStrap = new THREE.Mesh(new THREE.CylinderGeometry(0.096, 0.094, 0.032, 20), harnessNavy);
    thighStrap.position.y = -0.12;
    hipPivot.add(thighStrap);

    // Side Cargo Pocket on Trousers
    const cargoPocket = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.13, 0.095), suitFoldDark);
    cargoPocket.position.set(sideSign * 0.086, -0.22, 0.01);
    hipPivot.add(cargoPocket);

    const kneePivot = new THREE.Group();
    kneePivot.position.y = -0.42;
    hipPivot.add(kneePivot);

    const kneeCap = new THREE.Mesh(new THREE.SphereGeometry(0.082, 16, 16), suitOrange);
    kneePivot.add(kneeCap);

    for (let k = 0; k < 2; k++) {
      const kFold = new THREE.Mesh(new THREE.TorusGeometry(0.080, 0.011, 8, 18), suitFoldDark);
      kFold.rotation.x = Math.PI / 2;
      kFold.position.y = -0.02 - k * 0.035;
      kneePivot.add(kFold);
    }

    const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.068, 0.40, 20), suitOrange);
    calf.position.y = -0.20;
    kneePivot.add(calf);

    const ankleCuff = new THREE.Mesh(new THREE.TorusGeometry(0.070, 0.012, 8, 18), suitFoldDark);
    ankleCuff.rotation.x = Math.PI / 2;
    ankleCuff.position.y = -0.37;
    kneePivot.add(ankleCuff);

    const anklePivot = new THREE.Group();
    anklePivot.position.y = -0.40;
    kneePivot.add(anklePivot);

    const bootShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.070, 0.09, 16), gloveBootCharcoal);
    bootShaft.position.set(0, -0.02, 0);
    anklePivot.add(bootShaft);

    const bootFoot = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.085, 0.26), gloveBootCharcoal);
    bootFoot.position.set(0, -0.055, 0.045);
    anklePivot.add(bootFoot);

    const bootTread = new THREE.Mesh(new THREE.BoxGeometry(0.142, 0.024, 0.27), silverHardware);
    bootTread.position.set(0, -0.098, 0.045);
    anklePivot.add(bootTread);

    pelvisGroup.add(hipPivot);
    return { hipPivot, kneePivot, anklePivot };
  }

  const leftLeg = buildHumanSuitLeg(1);
  const rightLeg = buildHumanSuitLeg(-1);

  const groundRing = new THREE.Mesh(
    new THREE.RingGeometry(0.50, 0.72, 32),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.72 })
  );
  groundRing.rotation.x = -Math.PI / 2;
  groundRing.position.y = 0.05;
  root.add(groundRing);

  root.scale.setScalar(1.42);
  return {
    root,
    pelvisGroup,
    torsoGroup,
    ribcageGroup,
    headPivot,
    helmetOuterGroup,
    leftArmPivot: leftArm.shoulderPivot,
    rightArmPivot: rightArm.shoulderPivot,
    leftElbowPivot: leftArm.elbowPivot,
    rightElbowPivot: rightArm.elbowPivot,
    leftHandGroup: leftArm.handGroup,
    rightHandGroup: rightArm.handGroup,
    leftLegPivot: leftLeg.hipPivot,
    rightLegPivot: rightLeg.hipPivot,
    leftKneePivot: leftLeg.kneePivot,
    rightKneePivot: rightLeg.kneePivot,
    leftAnklePivot: leftLeg.anklePivot,
    rightAnklePivot: rightLeg.anklePivot,
    groundRing
  };
}

const astronautRig = createArticulatedAstronaut();
surfaceGroup.add(astronautRig.root);

const surfaceLabelsLayer = document.getElementById('surface-labels-layer');
let surfaceWpLabelEls = [];
const astronautLabelEl = document.createElement('div');
astronautLabelEl.className = 'surf-label';
astronautLabelEl.innerHTML = `<div class="surf-chip eva-tag" id="eva-float-chip">EVA-1 · 1.84 km rem</div>`;
astronautLabelEl.addEventListener('click', () => {
  window.cycleAstronautPOV();
});
surfaceLabelsLayer.appendChild(astronautLabelEl);

let routeCurve = null;
let routeSamplePoints = [];
let interactivePinMeshes = [];

function rebuildRouteGeometry() {
  clearGroupAndDispose(routeGroup);
  surfaceWpLabelEls.forEach(item => item.el.remove());
  surfaceWpLabelEls = [];
  interactivePinMeshes = [];

  const siteIdx = state.siteIndex;
  const site = SITES[siteIdx];
  const wps = state.waypoints;
  if (wps.length < 2) return;

  const pts3D = wps.map(w => new THREE.Vector3(w.x, getSiteHeight(siteIdx, w.x, w.z) + 0.35, w.z));
  routeCurve = new THREE.CatmullRomCurve3(pts3D, false, 'catmullrom', 0.25);

  const rawCurvePts = routeCurve.getPoints(150);
  routeSamplePoints = rawCurvePts.map(p => new THREE.Vector3(p.x, getSiteHeight(siteIdx, p.x, p.z) + 0.28, p.z));
  routeCurve = new THREE.CatmullRomCurve3(routeSamplePoints);

  const tubeGeo = new THREE.TubeGeometry(routeCurve, 128, 0.16, 8, false);
  const tubeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  routeGroup.add(new THREE.Mesh(tubeGeo, tubeMat));

  wps.forEach((w, idx) => {
    const y = getSiteHeight(siteIdx, w.x, w.z);
    const isSelected = idx === state.selectedWp;
    const pinColor = idx === 0 ? 0x34d399 : (isSelected ? 0x38bdf8 : 0xe06d44);

    const pinGroup = new THREE.Group();
    pinGroup.position.set(w.x, y, w.z);
    pinGroup.userData = { wpIndex: idx };

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 2.5, 12),
      new THREE.MeshBasicMaterial({ color: pinColor })
    );
    stem.position.y = 1.25;
    stem.userData = { wpIndex: idx };
    pinGroup.add(stem);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(isSelected ? 0.56 : 0.42, 20, 20),
      new THREE.MeshBasicMaterial({ color: pinColor })
    );
    head.position.y = 2.6;
    head.userData = { wpIndex: idx };
    pinGroup.add(head);

    const hitSphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.55, 12, 12),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitSphere.position.y = 1.8;
    hitSphere.userData = { wpIndex: idx };
    pinGroup.add(hitSphere);
    interactivePinMeshes.push(hitSphere, head, stem);

    if (isSelected) {
      const selHalo = new THREE.Mesh(
        new THREE.RingGeometry(0.85, 1.25, 32),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.88 })
      );
      selHalo.rotation.x = -Math.PI / 2;
      selHalo.position.y = 0.14;
      pinGroup.add(selHalo);
    }

    routeGroup.add(pinGroup);

    let segDistM = 0;
    if (idx > 0) {
      const prev = wps[idx - 1];
      segDistM = Math.round(Math.hypot(w.x - prev.x, w.z - prev.z) * 24);
    }
    const tagEl = document.createElement('div');
    tagEl.className = 'surf-label';
    tagEl.title = 'Click to glide camera, pulse Chladni wave & view NASA photo';
    tagEl.innerHTML = `<div class="surf-chip">${idx === 0 ? 'HAB' : 'WP-' + idx} · ${idx === 0 ? site.baseElevM + 'm' : '+' + segDistM + 'm'} 📸</div>`;
    tagEl.addEventListener('click', (ev) => {
      ev.stopPropagation();
      spaceAudio.playClickSFX('tap');
      focusPinnedWaypoint(idx);
    });
    surfaceLabelsLayer.appendChild(tagEl);
    surfaceWpLabelEls.push({
      el: tagEl,
      pos: new THREE.Vector3(w.x, y + 3.3, w.z)
    });
  });

  updateMissionMetrics();
  drawElevationProfile();
  updateWaypointInspectorUI();
}
// 8. REAL NASA ENVIRONMENT PHOTOGRAPH & SPECTRAL SCANLINE RECON RENDERER
function renderProceduralMastcamScene(wp, site, photoObj) {
  const canvas = document.getElementById('recon-mastcam-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.56);
  if (state.sepStorm) {
    skyGrad.addColorStop(0, '#3a1428');
    skyGrad.addColorStop(0.5, '#7c2d38');
    skyGrad.addColorStop(1, '#c86446');
  } else if (state.weatherPreset === 'haze') {
    skyGrad.addColorStop(0, '#6e3822');
    skyGrad.addColorStop(0.55, '#b86238');
    skyGrad.addColorStop(1, '#e29868');
  } else {
    skyGrad.addColorStop(0, '#1e1620');
    skyGrad.addColorStop(0.45, '#683828');
    skyGrad.addColorStop(1, '#c97d52');
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  const sunX = W * (0.24 + ((state.reconPhotoVariant * 0.35) % 0.55));
  const sunY = H * 0.22;
  const sunGlow = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, 48);
  sunGlow.addColorStop(0, 'rgba(255, 244, 225, 0.95)');
  sunGlow.addColorStop(0.35, 'rgba(240, 175, 125, 0.45)');
  sunGlow.addColorStop(1, 'rgba(224, 109, 68, 0)');
  ctx.fillStyle = sunGlow;
  ctx.fillRect(0, 0, W, H);

  const seedOffset = wp.x * 0.17 + wp.z * 0.23 + site.seed + state.reconPhotoVariant * 3.1;
  const layers = [
    { yBase: H * 0.44, amp: 20, col: '#4a261b' },
    { yBase: H * 0.56, amp: 16, col: '#6d3724' },
    { yBase: H * 0.70, amp: 12, col: '#8f492e' }
  ];

  layers.forEach((L, lIdx) => {
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 4) {
      const n = fbm(x * 0.018 + seedOffset + lIdx * 4.2, lIdx * 2.3, 4);
      const ridge = ridgedFbm(x * 0.025 + seedOffset, lIdx * 1.7, 3);
      const y = L.yBase - (n * 0.6 + ridge * 0.4) * L.amp;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fillStyle = L.col;
    ctx.fill();
  });

  const gndGrad = ctx.createLinearGradient(0, H * 0.66, 0, H);
  gndGrad.addColorStop(0, '#9b4f32');
  gndGrad.addColorStop(1, '#3d1d12');
  ctx.fillStyle = gndGrad;
  ctx.fillRect(0, H * 0.68, W, H * 0.32);

  ctx.strokeStyle = 'rgba(245, 190, 145, 0.28)';
  ctx.lineWidth = 1.2;
  for (let s = 0; s < 7; s++) {
    const y0 = H * 0.69 + s * 7.5;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 8) {
      const dy = Math.sin(x * 0.05 + s + seedOffset) * 2.5;
      if (x === 0) ctx.moveTo(x, y0 + dy);
      else ctx.lineTo(x, y0 + dy);
    }
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.50)';
  ctx.lineWidth = 1;
  const cx = W * 0.5, cy = H * 0.54;
  ctx.strokeRect(cx - 22, cy - 16, 44, 32);
  ctx.beginPath();
  ctx.moveTo(cx - 30, cy); ctx.lineTo(cx - 14, cy);
  ctx.moveTo(cx + 14, cy); ctx.lineTo(cx + 30, cy);
  ctx.moveTo(cx, cy - 24); ctx.lineTo(cx, cy - 10);
  ctx.moveTo(cx, cy + 10); ctx.lineTo(cx, cy + 24);
  ctx.stroke();
}

function openNasaReconModal(wp, site = SITES[state.siteIndex], wpIdx = state.selectedWp) {
  if (!wp) return;
  const card = document.getElementById('nasa-recon-card');
  const imgEl = document.getElementById('recon-nasa-img');
  if (!card || !imgEl) return;

  const photoList = site.nasaPhotos || [];
  const photoIdx = ((wpIdx >= 0 ? wpIdx : 0) + state.reconPhotoVariant) % Math.max(1, photoList.length);
  const photoObj = photoList[photoIdx];
  if (!photoObj) return;

  renderProceduralMastcamScene(wp, site, photoObj);

  // Trigger live spectral scanline reveal
  card.classList.remove('scanning');
  void card.offsetWidth;
  card.classList.add('scanning');

  imgEl.classList.remove('loaded');
  imgEl.onload = () => {
    imgEl.classList.add('loaded');
  };
  imgEl.onerror = () => {
    imgEl.classList.remove('loaded');
  };
  imgEl.src = photoObj.url;

  const elevM = Math.round(site.baseElevM + getSiteHeight(site.id, wp.x, wp.z) * 18);
  const slopeDeg = getSiteSlopeDeg(site.id, wp.x, wp.z).toFixed(1);
  const tiVal = Math.round(site.thermalInertia + (hash2(wp.x, wp.z) - 0.5) * 70);

  document.getElementById('recon-cam-instrument').textContent = photoObj.cam;
  document.getElementById('recon-pia-id').textContent = `NASA JPL ARCHIVE · ${photoObj.pia}`;
  document.getElementById('recon-sol-temp').textContent = photoObj.sol;
  document.getElementById('recon-target-name').textContent = photoObj.caption.split('. ')[0];
  document.getElementById('recon-coords-tag').textContent = `SIM waypoint (${wp.x.toFixed(1)}m, ${wp.z.toFixed(1)}m)`;
  document.getElementById('recon-elev-val').textContent = `${elevM > 0 ? '+' : ''}${elevM} m`;
  document.getElementById('recon-slope-val').textContent = `${slopeDeg}°`;
  document.getElementById('recon-ti-val').textContent = `${tiVal} TIU`;
  document.getElementById('recon-chladni-val').textContent = `(${site.chladni[0]}, ${site.chladni[1]})`;

  const descEl = document.getElementById('recon-desc-text');
  descEl.replaceChildren(document.createTextNode(photoObj.caption+' '+photoObj.productKind+' '));
  for(const [label,url] of [['NASA catalog',photoObj.sourceURL],['Mission raw gallery (separate collection)',photoObj.rawGalleryURL]]) {
   if(!url)continue; const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';a.textContent=label+' · ';descEl.append(a);
  }
  const status=document.createElement('p');status.textContent='Loading official archive image. Background preview is synthetic.';descEl.append(status);
  imgEl.onload=()=>{imgEl.classList.add('loaded');status.textContent='Official NASA archive image. Local metrics below are SIMULATED, not image measurements.';};
  imgEl.onerror=()=>{imgEl.classList.remove('loaded');status.textContent='Archive image unavailable. Visible background is a SYNTHETIC illustration; open NASA catalog.';};
  imgEl.src=photoObj.url;

  card.classList.add('open');
  document.body.classList.add('recon-open');
}

window.closeNasaReconCard = () => {
  document.getElementById('nasa-recon-card').classList.remove('open');
  document.body.classList.remove('recon-open');
};

window.cycleReconPhotoView = () => {
  state.reconPhotoVariant = (state.reconPhotoVariant + 1) % 4;
  const wp = state.waypoints[state.selectedWp] || state.waypoints[0];
  openNasaReconModal(wp, SITES[state.siteIndex], state.selectedWp);
  spaceAudio.playQuindarTone(true);
};

window.openNasaReconForSelectedWp = () => {
  focusPinnedWaypoint(state.selectedWp);
};

window.zoomToActiveWaypoint = () => {
  const wp = state.waypoints[state.selectedWp] || state.waypoints[0];
  if (!wp) return;
  if (state.mode === 'orbital') setMode('hybrid');
  state.povMode = 'free';
  state.suitDemoActive = false;
  syncPOVButtonUI();
  const y = getSiteHeight(state.siteIndex, wp.x, wp.z);
  animateCameraTo(
    new THREE.Vector3(wp.x + 4.8, y + 3.4, wp.z + 5.8),
    new THREE.Vector3(wp.x, y + 0.9, wp.z),
    34
  );
  triggerChladniRipple(new THREE.Vector3(wp.x, y, wp.z));
  showToast(`Deep 15x Outcrop Zoom: ${wp.name}`);
};
// 9. CHLADNI CYMATIC TRANSITION ENGINE, PINNED WAYPOINT GLIDE & POV CAM
function triggerTransitionVeil() {
  const veil = document.getElementById('atmo-veil');
  if (!veil) return;
  veil.classList.add('flash');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      veil.classList.remove('flash');
    });
  });
}

function triggerChladniRipple(centerVec3) {
  const site = SITES[state.siteIndex];
  const [n, m] = site.chladni;
  particleShaderMat.uniforms.uChladniParams.value.set(n, m, n, m);
  sparkleShaderMat.uniforms.uChladniParams.value.set(n, m, n, m);
  particleShaderMat.uniforms.uRippleCenter.value.copy(centerVec3);
  terrainShaderMat.uniforms.uRippleCenter.value.copy(centerVec3);
  state.chladniRipple.active = true;
  state.chladniRipple.progress = 0.0;
  state.chladniRipple.duration = 1.35;
  particleShaderMat.uniforms.uRippleProgress.value = 0.0;
  terrainShaderMat.uniforms.uRippleProgress.value = 0.0;
  triggerSparkleBurst(1.15);
  spaceAudio.triggerMorphSound(n, m);
}

window.triggerManualChladniPulse = () => {
  if (state.mode === 'orbital') setMode('hybrid');
  const center = astronautRig.root.position.clone();
  triggerChladniRipple(center);
  const site = SITES[state.siteIndex];
  showToast(`Chladni Cymatic Standing Wave Pulse: (n=${site.chladni[0]}, m=${site.chladni[1]})`);
};

function focusPinnedWaypoint(wpIdx) {
  if (wpIdx < 0 || wpIdx >= state.waypoints.length) return;
  state.selectedWp = wpIdx;
  state.reconPhotoVariant = 0;
  state.suitDemoActive = false;
  syncSuitDemoUI();

  const site = SITES[state.siteIndex];
  const wp = state.waypoints[wpIdx];
  const y = getSiteHeight(state.siteIndex, wp.x, wp.z);
  const pinPos = new THREE.Vector3(wp.x, y, wp.z);

  triggerChladniRipple(pinPos);
  rebuildRouteGeometry();
  renderWaypointList();
  updateWaypointInspectorUI();
  openNasaReconModal(wp, site, wpIdx);

  // Smoothly glide camera to frame the pinned outcrop if in free camera mode
  if (state.mode !== 'orbital' && state.povMode === 'free' && !state.isNadir) {
    const viewOffset = new THREE.Vector3(wp.x + 11.5, y + 7.2, wp.z + 13.5);
    const lookAtPos  = new THREE.Vector3(wp.x, y + 1.2, wp.z);
    animateCameraTo(viewOffset, lookAtPos, 39);
  }
}

function startSurfaceMorph(targetSiteIdx) {
  const fromIdx = state.loadedSurfaceSite;
  const toIdx = targetSiteIdx;

  const fromChladni = SITES[fromIdx].chladni;
  const toChladni   = SITES[toIdx].chladni;
  particleShaderMat.uniforms.uChladniParams.value.set(
    fromChladni[0], fromChladni[1], toChladni[0], toChladni[1]
  );
  sparkleShaderMat.uniforms.uChladniParams.value.set(
    fromChladni[0], fromChladni[1], toChladni[0], toChladni[1]
  );

  attrStateFrom.array.set(SITE_CACHES[fromIdx].terrainState);
  attrStateTo.array.set(SITE_CACHES[toIdx].terrainState);
  attrStateFrom.needsUpdate = true;
  attrStateTo.needsUpdate = true;

  terrainShaderMat.uniforms.uSiteTexFrom.value = SITE_TEXTURES[fromIdx];
  terrainShaderMat.uniforms.uSiteTexTo.value = SITE_TEXTURES[toIdx];

  attrPosFrom.array.set(SITE_CACHES[fromIdx].particlePos);
  attrPosTo.array.set(SITE_CACHES[toIdx].particlePos);
  attrColFrom.array.set(SITE_CACHES[fromIdx].particleCol);
  attrColTo.array.set(SITE_CACHES[toIdx].particleCol);
  attrPosFrom.needsUpdate = true;
  attrPosTo.needsUpdate = true;
  attrColFrom.needsUpdate = true;
  attrColTo.needsUpdate = true;

  state.morph.fromSite = fromIdx;
  state.morph.toSite = toIdx;
  state.morph.progress = 0.0;
  state.morph.active = true;
  state.loadedSurfaceSite = toIdx;

  terrainShaderMat.uniforms.uMorphProgress.value = 0.0;
  particleShaderMat.uniforms.uMorphProgress.value = 0.0;

  buildSiteLandmarkProps(toIdx);
  triggerSparkleBurst(1.55);
  triggerTransitionVeil();
  spaceAudio.triggerMorphSound(toChladni[0], toChladni[1]);

  const morphInd = document.getElementById('morph-indicator');
  const morphLbl = document.getElementById('morph-label');
  const brandDot = document.getElementById('brand-dot');
  morphLbl.textContent = `CHLADNI CYMATIC STANDING-WAVE MORPH · ${SITES[toIdx].shortName.toUpperCase()} (n=${toChladni[0]}, m=${toChladni[1]})`;
  morphInd.classList.add('active');
  brandDot.classList.add('scanning');
}
// 10. A* SLOPE/HAZARD PATHFINDER & TERRAIN WAYPOINT RAYCASTER
function runAStarOptimizer() {
  const siteIdx = state.siteIndex;
  const wps = state.waypoints;
  if (wps.length < 2) return;

  const start = wps[0];
  const goal = wps[wps.length - 1];
  const G = 26;
  const toGrid = (val) => Math.max(0, Math.min(G - 1, Math.round(((val / DEM_SIZE) + 0.5) * (G - 1))));
  const toWorld = (idx) => ((idx / (G - 1)) - 0.5) * DEM_SIZE;

  const sNode = { gx: toGrid(start.x), gz: toGrid(start.z) };
  const gNode = { gx: toGrid(goal.x), gz: toGrid(goal.z) };
  const key = (x, z) => `${x},${z}`;

  const open = [sNode];
  const cameFrom = new Map();
  const gScore = new Map([[key(sNode.gx, sNode.gz), 0]]);
  const fScore = new Map([[key(sNode.gx, sNode.gz), Math.hypot(gNode.gx - sNode.gx, gNode.gz - sNode.gz)]]);
  const closed = new Set();

  const dirs = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1]
  ];

  while (open.length > 0) {
    open.sort((a, b) => (fScore.get(key(a.gx, a.gz)) || 1e9) - (fScore.get(key(b.gx, b.gz)) || 1e9));
    const curr = open.shift();
    const cKey = key(curr.gx, curr.gz);

    if (curr.gx === gNode.gx && curr.gz === gNode.gz) break;
    closed.add(cKey);

    for (const [dx, dz] of dirs) {
      const nx = curr.gx + dx;
      const nz = curr.gz + dz;
      if (nx < 1 || nx >= G - 1 || nz < 1 || nz >= G - 1) continue;
      const nKey = key(nx, nz);
      if (closed.has(nKey)) continue;

      const wx = toWorld(nx), wz = toWorld(nz);
      const slope = getSiteSlopeDeg(siteIdx, wx, wz);
      const stepDist = Math.hypot(dx, dz);
      const slopePenalty = slope > 15 ? (slope - 13) * 5.2 : slope * 0.25;
      const tentativeG = (gScore.get(cKey) || 0) + stepDist + slopePenalty;

      if (tentativeG < (gScore.get(nKey) ?? 1e9)) {
        cameFrom.set(nKey, curr);
        gScore.set(nKey, tentativeG);
        fScore.set(nKey, tentativeG + Math.hypot(gNode.gx - nx, gNode.gz - nz));
        if (!open.some(n => n.gx === nx && n.gz === nz)) open.push({ gx: nx, gz: nz });
      }
    }
  }

  const path = [];
  let curr = gNode;
  while (curr && cameFrom.has(key(curr.gx, curr.gz))) {
    path.push(curr);
    curr = cameFrom.get(key(curr.gx, curr.gz));
  }
  path.reverse();

  if (path.length >= 3) {
    const p1 = path[Math.floor(path.length * 0.33)];
    const p2 = path[Math.floor(path.length * 0.66)];
    state.waypoints = [
      start,
      { name: "A*-1 Synthetic cost bypass", type: "DEMO", tool: "Synthetic slope cost", x: toWorld(p1.gx), z: toWorld(p1.gz) },
      { name: "A*-2 Synthetic route candidate", type: "DEMO", tool: "Synthetic slope cost", x: toWorld(p2.gx), z: toWorld(p2.gz) },
      goal
    ];
    state.selectedWp = 1;
    rebuildRouteGeometry();
    renderWaypointList();
    triggerChladniRipple(new THREE.Vector3(toWorld(p1.gx), getSiteHeight(siteIdx, toWorld(p1.gx), toWorld(p1.gz)), toWorld(p1.gz)));
    showToast("A* demo route updated. Inspect sampled grades; no safety guarantee.");
  }
}

const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();
let pointerDownPos = { x: 0, y: 0 };
let isPointerDraggingPOV = false;
let lastPointerPos = { x: 0, y: 0 };

// Dedicated Steadicam Gimbal Damping State for Smoothed Shoulder & Visor POV
const povGimbal = {
  initialized: false,
  smoothRootPos: new THREE.Vector3(0, 0, 0),
  smoothForward: new THREE.Vector3(0, 0, 1),
  smoothGradeDeg: 0,
  camPos: new THREE.Vector3(0, 5, 10),
  camLook: new THREE.Vector3(0, 2, 0),
  yawOffset: 0,
  pitchOffset: 0
};

function intersectTerrainSurface() {
  const prevVis = terrainMesh.visible;
  terrainMesh.visible = true;
  const hits = raycaster.intersectObject(terrainMesh);
  terrainMesh.visible = prevVis;
  return hits;
}

renderer.domElement.addEventListener('pointerdown', (e) => {
  if (fieldLab?.active || mobileAR?.active || upgrades?.measurements.enabled) return;
  pointerDownPos = { x: e.clientX, y: e.clientY };
  lastPointerPos = { x: e.clientX, y: e.clientY };
  if (state.mode !== 'orbital' && state.povMode !== 'free') {
    isPointerDraggingPOV = true;
  }
});

window.addEventListener('pointerup', () => {
  isPointerDraggingPOV = false;
});

renderer.domElement.addEventListener('pointermove', (e) => {
  if (fieldLab?.active || mobileAR?.active || upgrades?.measurements.enabled) return;
  if (state.mode === 'orbital') return;

  // Allow smooth, comfortable manual look-around when in Shoulder or Visor POV
  if (isPointerDraggingPOV && state.povMode !== 'free') {
    const dx = e.clientX - lastPointerPos.x;
    const dy = e.clientY - lastPointerPos.y;
    lastPointerPos = { x: e.clientX, y: e.clientY };
    povGimbal.yawOffset = THREE.MathUtils.clamp(povGimbal.yawOffset - dx * 0.0035, -1.35, 1.35);
    povGimbal.pitchOffset = THREE.MathUtils.clamp(povGimbal.pitchOffset - dy * 0.0028, -0.45, 0.45);
    return;
  }

  const rect = renderer.domElement.getBoundingClientRect();
  pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  if (state.addWpMode) {
    raycaster.setFromCamera(pointerNDC, camera);
    const hits = intersectTerrainSurface();
    if (hits.length > 0) {
      const pt = hits[0].point;
      const exactY = getSiteHeight(state.siteIndex, pt.x, pt.z);
      dropPreviewGroup.position.set(pt.x, exactY + 0.08, pt.z);
      dropPreviewGroup.visible = true;
      const slope = getSiteSlopeDeg(state.siteIndex, pt.x, pt.z).toFixed(1);
      const elev = Math.round(SITES[state.siteIndex].baseElevM + exactY * 18);
      document.getElementById('drop-wp-coords').textContent =
        `DROP TARGET: (${pt.x.toFixed(1)}m, ${pt.z.toFixed(1)}m) · SIM ELEV ${elev}m · SLOPE ${slope}°`;
    } else {
      dropPreviewGroup.visible = false;
    }
  } else {
    raycaster.setFromCamera(pointerNDC, camera);
    const pinHits = raycaster.intersectObjects(interactivePinMeshes, false);
    renderer.domElement.style.cursor = pinHits.length > 0 ? 'pointer' : 'grab';
  }
});

renderer.domElement.addEventListener('pointerup', (e) => {
  if (fieldLab?.active || mobileAR?.active || upgrades?.measurements.enabled) return;
  if (state.mode === 'orbital') return;
  const moveDist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
  if (moveDist > 9) return;

  const rect = renderer.domElement.getBoundingClientRect();
  pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointerNDC, camera);

  if (!state.addWpMode && interactivePinMeshes.length > 0) {
    const pinHits = raycaster.intersectObjects(interactivePinMeshes, false);
    if (pinHits.length > 0) {
      const wpIdx = pinHits[0].object.userData.wpIndex;
      if (typeof wpIdx === 'number') {
        spaceAudio.playClickSFX('mode');
        focusPinnedWaypoint(wpIdx);
        return;
      }
    }
  }

  if (state.addWpMode) {
    const hits = intersectTerrainSurface();
    if (hits.length > 0) {
      const pt = hits[0].point;
      const clampedX = Math.max(-DEM_SIZE * 0.46, Math.min(DEM_SIZE * 0.46, pt.x));
      const clampedZ = Math.max(-DEM_SIZE * 0.46, Math.min(DEM_SIZE * 0.46, pt.z));
      const newWp = {
        name: `WP-${state.waypoints.length} Field Sample`,
        type: "EVA",
        tool: "PIXL + Mastcam-Z",
        x: Math.round(clampedX * 10) / 10,
        z: Math.round(clampedZ * 10) / 10
      };
      state.waypoints.splice(state.waypoints.length - 1, 0, newWp);
      const insertedIdx = state.waypoints.length - 2;
      state.addWpMode = false;
      dropPreviewGroup.visible = false;
      document.body.classList.remove('drop-wp-active');
      const btn = document.getElementById('add-wp-btn');
      if (btn) {
        btn.style.borderColor = '';
        btn.textContent = '+ Click Terrain to Drop WP';
      }
      spaceAudio.playClickSFX('mode');
      focusPinnedWaypoint(insertedIdx);
      showToast(`Dropped ${newWp.name} & Opened NASA Surface Recon`);
    }
  }
});
// 11. UI CONTROLLERS, ASTRONAUT POV & 360° SUIT DEMO SHOWCASE
function renderLayerRows() {
  const containerEl = document.getElementById('layer-list');
  containerEl.innerHTML = '';
  let activeCount = 0;

  LAYERS.forEach((layer, idx) => {
    if (layer.active) activeCount++;
    const row = document.createElement('div');
    row.className = 'layer-row';
    row.innerHTML = `
      <input type="checkbox" class="layer-check" ${layer.active ? 'checked' : ''} data-idx="${idx}" />
      <div class="layer-name">
        <span class="layer-swatch" style="background:${layer.color}; box-shadow: 0 0 8px ${layer.color};"></span>
        <span>${layer.name}</span>
        <span class="layer-source">${layer.source}</span>
      </div>
      <input type="range" class="mini-slider" min="0.1" max="1" step="0.05" value="${layer.opacity}" data-idx="${idx}" />
      <span class="pct-val">${Math.round(layer.opacity * 100)}%</span>
    `;
    containerEl.appendChild(row);
  });

  containerEl.querySelectorAll('.layer-check').forEach(chk => {
    chk.addEventListener('change', (e) => {
      const i = parseInt(e.target.dataset.idx, 10);
      LAYERS[i].active = e.target.checked;
      renderLayerRows();
      updateGlobeOverlayTexture();
      updateShaderLayerUniforms();
    });
  });

  containerEl.querySelectorAll('.mini-slider').forEach(sl => {
    sl.addEventListener('input', (e) => {
      const i = parseInt(e.target.dataset.idx, 10);
      LAYERS[i].opacity = parseFloat(e.target.value);
      e.target.nextElementSibling.textContent = `${Math.round(LAYERS[i].opacity * 100)}%`;
      updateGlobeOverlayTexture();
      updateShaderLayerUniforms();
    });
  });

  document.getElementById('active-layer-count').textContent = `${activeCount} / 5 Active`;
  document.getElementById('dock-layer-badge').textContent = activeCount;
}

function renderWaypointList() {
  const list = document.getElementById('wp-list');
  list.innerHTML = '';
  const siteIdx = state.siteIndex;

  state.waypoints.forEach((w, idx) => {
    const slope = getSiteSlopeDeg(siteIdx, w.x, w.z);
    const item = document.createElement('div');
    item.className = `wp-item ${idx === state.selectedWp ? 'selected' : ''}`;
    const slopeColor = slope > 20 ? '#F87171' : (slope > 15 ? '#FBBF24' : '#34D399');
    item.innerHTML = `
      <div>
        <span class="wp-badge">${w.type}</span>
        <span>${w.name}</span>
      </div>
      <span style="font-family:var(--font-mono); font-size:10px; color:${slopeColor};">
        ${slope.toFixed(1)}° · 📸
      </span>
    `;
    item.addEventListener('click', () => {
      focusPinnedWaypoint(idx);
    });
    list.appendChild(item);
  });
}

function updateWaypointInspectorUI() {
  const site = SITES[state.siteIndex];
  const wp = state.waypoints[state.selectedWp] || state.waypoints[0];
  if (!wp) return;
  const elev = Math.round(site.baseElevM + getSiteHeight(state.siteIndex, wp.x, wp.z) * 18);
  const slope = getSiteSlopeDeg(state.siteIndex, wp.x, wp.z).toFixed(1);
  document.getElementById('wpi-name').textContent = `WP: ${wp.name}`;
  document.getElementById('wpi-metrics').textContent = `SIM Elev: ${elev}m · Slope: ${slope}° · TI: ${site.thermalInertia} TIU`;
  document.getElementById('wpi-tool').textContent = `Tool: ${wp.tool || site.instrument}`;
}

function updateMissionMetrics() {
  const site = SITES[state.siteIndex];
  const wps = state.waypoints;
  let distUnits = 0;
  let maxSlope = 0;

  for (let i = 1; i < wps.length; i++) {
    distUnits += Math.hypot(wps[i].x - wps[i - 1].x, wps[i].z - wps[i - 1].z);
  }
  routeSamplePoints.forEach(p => {
    const s = getSiteSlopeDeg(state.siteIndex, p.x, p.z);
    if (s > maxSlope) maxSlope = s;
  });

  const distKm = Math.max(0.45, distUnits * 0.024);
  state.totalTraverseKm = distKm;
  const effectiveSpeedKmh = Math.max(0.4, 3.6 * state.astronautSpeed);
  const durHrs = distKm / effectiveSpeedKmh;
  const o2Pct = Math.max(18, Math.round(98 - durHrs * 14 - maxSlope * 0.25));
  const radVal = state.sepStorm ? site.stormRad : site.nominalRad;

  document.getElementById('m-dist').textContent = `${distKm.toFixed(2)} km`;
  document.getElementById('m-dur').textContent = `${durHrs.toFixed(2)} hrs`;
  document.getElementById('m-slope').textContent = `${maxSlope.toFixed(1)}°`;
  document.getElementById('m-slope').style.color = maxSlope > 20 ? '#F87171' : (maxSlope > 15 ? '#FBBF24' : '#34D399');
  document.getElementById('m-o2').textContent = `${o2Pct}%`;
  document.getElementById('m-rad').textContent = `${radVal.toFixed(2)} mSv`;
  document.getElementById('m-rad').style.color = state.sepStorm ? '#F87171' : '#F5F5F7';

  const badge = document.getElementById('route-safety-badge');
  if (maxSlope > 20) {
    badge.textContent = `CRITICAL SLOPE (${maxSlope.toFixed(1)}°)`;
    badge.style.color = '#F87171';
  } else if (maxSlope > 15) {
    badge.textContent = `Caution (${maxSlope.toFixed(1)}°)`;
    badge.style.color = '#FBBF24';
  } else {
    badge.textContent = `Slope Safe (<15°)`;
    badge.style.color = '#34D399';
  }
}

function updateWeatherUI() {
  const site = SITES[state.siteIndex];
  const wx = site.weather;
  let temp = wx.tempC;
  let press = wx.pressurePa;
  let wind = wx.windMs;
  let tau = wx.tau;
  let uv = wx.uv;
  let subText = `${wx.station} · τ = ${tau.toFixed(2)}`;

  if (state.weatherPreset === 'vortex') {
    wind = +(wx.windMs * 2.35).toFixed(1);
    press = Math.round(wx.pressurePa - 28);
    tau = +(wx.tau + 0.35).toFixed(2);
    subText = `Convective Dust Devil Vortex Active · ΔP -28 Pa`;
  } else if (state.weatherPreset === 'haze') {
    temp = wx.tempC + 6;
    wind = +(wx.windMs * 1.65).toFixed(1);
    tau = 1.92;
    uv = "Attenuated (Dust)";
    subText = `Regional Dust Storm Haze · τ = 1.92`;
  } else if (state.weatherPreset === 'storm' || state.sepStorm) {
    uv = `SEP ALERT (${site.stormRad} mSv)`;
    subText = `SIMULATED SEP scenario · no measured Mars dose`;
  }

  document.getElementById('wx-temp').textContent = `${temp}°C`;
  document.getElementById('wx-press').textContent = `${press} Pa`;
  document.getElementById('wx-wind').textContent = `${wind} m/s ${wx.windDir}`;
  document.getElementById('wx-tau').textContent = `τ ${tau}`;
  document.getElementById('wx-uv').textContent = uv;
  document.getElementById('wx-condition-sub').textContent = 'SIMULATION — '+subText+' · not calibrated to REMS/MEDA';
}

window.setWeatherPreset = (preset) => {
  state.weatherPreset = preset;
  ['clear', 'vortex', 'haze', 'storm'].forEach(p => {
    const b = document.getElementById(`wx-btn-${p}`);
    if (b) b.classList.toggle('active-preset', p === preset);
  });

  if (preset === 'vortex') {
    sparkleShaderMat.uniforms.uWeatherVortex.value = 0.92;
    terrainShaderMat.uniforms.uDustHaze.value = 0.25;
    triggerSparkleBurst(1.4);
    showToast("Mars Weather: Convective Dust Devil Sparkle Vortex Active");
  } else if (preset === 'haze') {
    sparkleShaderMat.uniforms.uWeatherVortex.value = 0.45;
    terrainShaderMat.uniforms.uDustHaze.value = 0.85;
    showToast("Mars Weather: Regional Dust Haze (Optical Depth τ = 1.92)");
  } else if (preset === 'storm') {
    if (!state.sepStorm) window.toggleStorm();
    sparkleShaderMat.uniforms.uWeatherVortex.value = 0.65;
    terrainShaderMat.uniforms.uDustHaze.value = 0.35;
  } else {
    if (state.sepStorm) window.toggleStorm();
    sparkleShaderMat.uniforms.uWeatherVortex.value = 0.0;
    terrainShaderMat.uniforms.uDustHaze.value = 0.0;
    showToast("Mars Weather: Clear Sol Nominal Conditions");
  }
  updateWeatherUI();
  renderCrismSpectralPlot(state.siteIndex);
  if (state.uhfViewshed) computeUhfViewshed();
  if (document.getElementById('nasa-recon-card').classList.contains('open')) {
    const wp = state.waypoints[state.selectedWp] || state.waypoints[0];
    renderProceduralMastcamScene(wp, SITES[state.siteIndex]);
  }
};

function drawElevationProfile(hoverIndex = -1) {
  const canvas = document.getElementById('profile-canvas');
  if (!canvas || routeSamplePoints.length === 0) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const site = SITES[state.siteIndex];
  const elevs = routeSamplePoints.map(p => site.baseElevM + p.y * 18);
  const minE = Math.min(...elevs) - 10;
  const maxE = Math.max(...elevs) + 10;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  for (let g = 1; g <= 3; g++) {
    const y = (H / 4) * g;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(56, 189, 248, 0.42)');
  grad.addColorStop(1, 'rgba(224, 109, 68, 0.04)');

  ctx.beginPath();
  elevs.forEach((e, idx) => {
    const x = (idx / (elevs.length - 1)) * (W - 24) + 12;
    const y = H - 14 - ((e - minE) / Math.max(1, maxE - minE)) * (H - 28);
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.lineTo(W - 12, H - 8);
  ctx.lineTo(12, H - 8);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  if (hoverIndex >= 0 && hoverIndex < elevs.length) {
    const hx = (hoverIndex / (elevs.length - 1)) * (W - 24) + 12;
    const hy = H - 14 - ((elevs[hoverIndex] - minE) / Math.max(1, maxE - minE)) * (H - 28);
    ctx.strokeStyle = '#E06D44';
    ctx.beginPath(); ctx.moveTo(hx, 6); ctx.lineTo(hx, H - 6); ctx.stroke();
    ctx.fillStyle = '#E06D44';
    ctx.beginPath(); ctx.arc(hx, hy, 4, 0, Math.PI * 2); ctx.fill();
  }
}

const profileCanvas = document.getElementById('profile-canvas');
profileCanvas.addEventListener('pointermove', (e) => {
  if (state.mode === 'orbital' || routeSamplePoints.length === 0) return;
  const rect = profileCanvas.getBoundingClientRect();
  const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  const idx = Math.floor(normX * (routeSamplePoints.length - 1));
  const pt = routeSamplePoints[idx];
  const site = SITES[state.siteIndex];
  const elev = Math.round(site.baseElevM + pt.y * 18);
  const slope = getSiteSlopeDeg(state.siteIndex, pt.x, pt.z);

  scrubRing.position.set(pt.x, pt.y + 0.15, pt.z);
  scrubRing.visible = true;
  document.getElementById('profile-hover-readout').textContent =
    `SIM Dist: ${(normX * state.totalTraverseKm).toFixed(2)} km · Elev: ${elev} m · Slope: ${slope.toFixed(1)}°`;
  drawElevationProfile(idx);
});

profileCanvas.addEventListener('pointerleave', () => {
  scrubRing.visible = false;
  drawElevationProfile(-1);
});

function animateCameraTo(targetPos, targetLook, targetFov = 42) {
  state.cameraTargetPos.copy(targetPos);
  state.cameraTargetLook.copy(targetLook);
  state.cameraTargetFov = targetFov;
  state.isCameraTransitioning = true;
  state.cameraTransitionTimer = 0;
}

function syncPOVButtonUI() {
  const btn = document.getElementById('btn-pov');
  const visorModeLbl = document.getElementById('visor-mode-lbl');
  if (!btn) return;

  // Disable OrbitControls when locked in Visor, Shoulder, or Suit Demo so it NEVER fights or shakes the camera!
  controls.enabled = (state.povMode === 'free' && !state.suitDemoActive);

  if (state.povMode === 'visor') {
    btn.textContent = 'POV: Visor HUD';
    btn.classList.add('pov-active');
    document.body.classList.add('visor-pov-active');
    // Hide the 3D astronaut body mesh in 1st-Person Visor mode so it NEVER clips or overlaps the camera!
    astronautRig.pelvisGroup.visible = false;
    astronautRig.helmetOuterGroup.visible = false;
    if (visorModeLbl) visorModeLbl.textContent = '1ST-PERSON VISOR';
  } else if (state.povMode === 'shoulder') {
    btn.textContent = 'POV: Shoulder Cam';
    btn.classList.add('pov-active');
    document.body.classList.remove('visor-pov-active');
    astronautRig.pelvisGroup.visible = true;
    astronautRig.helmetOuterGroup.visible = true;
  } else {
    btn.textContent = 'Astronaut POV: Off';
    btn.classList.remove('pov-active');
    document.body.classList.remove('visor-pov-active');
    astronautRig.pelvisGroup.visible = true;
    astronautRig.helmetOuterGroup.visible = true;
  }
}

window.cycleAstronautPOV = () => {
  if (state.mode === 'orbital') {
    setMode('hybrid');
  }
  state.suitDemoActive = false;

  if (state.povMode === 'free') {
    state.povMode = 'visor';
    povGimbal.initialized = false;
    povGimbal.yawOffset = 0;
    povGimbal.pitchOffset = 0;
    showToast("Astronaut 1st-Person Helmet Visor HUD (Drag to look around)");
  } else if (state.povMode === 'visor') {
    state.povMode = 'shoulder';
    povGimbal.initialized = false;
    povGimbal.yawOffset = 0;
    povGimbal.pitchOffset = 0;
    showToast("Stabilized Steadicam Over-the-Shoulder View (Drag to orbit)");
  } else {
    state.povMode = 'free';
    animateCameraTo(new THREE.Vector3(0, 26, 38), new THREE.Vector3(0, -1, 0), 42);
    showToast("Free Surface Drone Camera Active");
  }
  syncPOVButtonUI();
  syncSuitDemoUI();
  spaceAudio.playQuindarTone(true);
};

function syncSuitDemoUI() {
  const btn = document.getElementById('suit-demo-btn');
  controls.enabled = (state.povMode === 'free' && !state.suitDemoActive);
  if (!btn) return;
  if (state.suitDemoActive) {
    btn.textContent = 'Exit Suit Demo (Resume Free Cam)';
    btn.style.boxShadow = '0 0 18px rgba(56, 189, 248, 0.55)';
  } else {
    btn.textContent = 'Suit Demo (360° xEMU Showcase)';
    btn.style.boxShadow = '';
  }
}

window.toggleSuitDemoShowcase = () => {
  if (state.mode === 'orbital') {
    setMode('hybrid');
  }
  state.suitDemoActive = !state.suitDemoActive;
  if (state.suitDemoActive) {
    state.povMode = 'free';
    state.suitDemoAngle = 0;
    triggerChladniRipple(astronautRig.root.position.clone());
    showToast("360° Human ACES Suit & Sample Basket Showcase");
  } else {
    animateCameraTo(new THREE.Vector3(0, 26, 38), new THREE.Vector3(0, -1, 0), 42);
    showToast("Exited Suit Demo Showcase");
  }
  syncPOVButtonUI();
  syncSuitDemoUI();
};

window.setMode = (newMode) => {
  fieldLab?.close();
  surfaceParticles.visible=true;routeGroup.visible=true;astronautRig.root.visible=true;
  projectionView?.reset();
  const prevMode = state.mode;
  state.mode = newMode;
  state.lastModeSwitchTime = performance.now();

  ['orbital', 'hybrid', 'particles'].forEach(m => {
    document.getElementById(`btn-${m}`).classList.toggle('active', m === newMode);
  });

  document.body.classList.toggle('mode-orbital', newMode === 'orbital');
  if(newMode==='orbital'&&['weather','science','layers'].includes(state.openDrawer)){document.getElementById('drawer-'+state.openDrawer)?.classList.remove('open');state.openDrawer=null;document.body.classList.remove('drawer-open');}

  const s = SITES[state.siteIndex];
  document.getElementById('caption-title').textContent = `${s.shortName} (${s.coords})`;
  document.getElementById('caption-demo-text').textContent = s.demoLabel;

  const [n, m] = s.chladni;
  triggerSparkleBurst(1.35);
  triggerTransitionVeil();
  spaceAudio.triggerMorphSound(n, m);

  if (newMode === 'orbital') {
    state.isNadir = false;
    state.povMode = 'free';
    state.suitDemoActive = false;
    syncPOVButtonUI();
    syncSuitDemoUI();
    document.getElementById('nadir-btn').classList.remove('active');
    if (state.addWpMode) window.toggleAddWaypoint();
    window.closeNasaReconCard();

    if (state.openDrawer && ['route', 'profile'].includes(state.openDrawer)) {
      toggleDrawer(state.openDrawer);
    }

    // Completely hide all 3D surface meshes & landmarks when returning to Orbital Globe
    surfaceGroup.visible = false;
    placeDemoGroup.visible = false;
    dropPreviewGroup.visible = false;
    scrubRing.visible = false;

    orbitalGroup.visible = true;
    orbitalGroup.scale.setScalar(1.0);
    state.globeIntroMorph.started = true;
    state.globeIntroMorph.active = false;
    marsMat.opacity = 1.0;
    overlayMat.opacity = 0.52;
    globeParticleShaderMat.uniforms.uIntroProgress.value = 1.0;
    globeParticleShaderMat.uniforms.uShellOpacity.value = 0.18;
    atmoMat.uniforms.uFade.value = 1.0;
    sparkleShaderMat.uniforms.uOrbitalScale.value = 0.22;

    controls.enablePan = false;
    controls.minDistance = 4.64; // Zoom right down to single mountains on the globe!
    controls.maxDistance = 30;
    controls.maxPolarAngle = Math.PI;
    document.getElementById('caption-kicker').textContent = 'NASA IMAGERY · REFERENCE SPHERE · DERIVED MARKERS';

    const targetVec = latLonToVec3(s.lat, s.lon, 13.2);
    targetVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), marsMesh.rotation.y);
    animateCameraTo(targetVec, new THREE.Vector3(0, 0, 0), 42);
  } else {
    orbitalGroup.visible = false;
    surfaceGroup.visible = true;
    sparkleShaderMat.uniforms.uOrbitalScale.value = 1.0;

    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.minDistance = 1.25;
    controls.maxDistance = 145;
    controls.maxPolarAngle = Math.PI * 0.485;

    // Only run full CPU buffer copy if the loaded surface site changed or we just entered from orbital mode
    if (state.loadedSurfaceSite !== state.siteIndex || prevMode === 'orbital') {
      startSurfaceMorph(state.siteIndex);
    } else {
      // Zero-lag GPU-only Chladni standing-wave ripple when toggling between 3D Hybrid and Pure Particle LiDAR!
      triggerChladniRipple(astronautRig.root.position.clone());
    }

    if (newMode === 'hybrid') {
      terrainMesh.visible = true;
      terrainShaderMat.uniforms.uOpacity.value = 1.0;
      particleShaderMat.uniforms.uPointSize.value = 1.55;
      particleShaderMat.uniforms.uOpacityScale.value = state.placeDemoActive ? 0.34 : 0.0;
      placeDemoGroup.visible = state.placeDemoActive;
      document.getElementById('caption-kicker').textContent = 'SYNTHETIC SURFACE · NASA-INSPIRED DEMONSTRATION';
    } else if (newMode === 'particles') {
      // Strictly hide solid terrain mesh & basic landmark objects (arch/cavern/mesas/walls) so ZERO objects are left behind!
      terrainMesh.visible = false;
      terrainShaderMat.uniforms.uOpacity.value = 0.0;
      placeDemoGroup.visible = false;
      dropPreviewGroup.visible = false;
      scrubRing.visible = false;
      particleShaderMat.uniforms.uPointSize.value = 2.65;
      particleShaderMat.uniforms.uOpacityScale.value = 1.0;
      document.getElementById('caption-kicker').textContent = `CHLADNI STANDING-WAVE PARTICLE CLOUD · ${PARTICLE_COUNT.toLocaleString()} PTS`;
    }

    if (prevMode === 'orbital' && state.povMode === 'free') {
      animateCameraTo(new THREE.Vector3(0, 26, 38), new THREE.Vector3(0, -1, 0), 42);
    }
  }
};

window.stepZoom = (dir) => {
  if (camera.isOrthographicCamera) { camera.zoom=THREE.MathUtils.clamp(camera.zoom*(dir>0?1.6:1/1.6),controls.minZoom,controls.maxZoom);camera.updateProjectionMatrix();progressiveGlobe?.invalidate();return; }
  if (state.povMode !== 'free') {
    state.povMode = 'free';
    syncPOVButtonUI();
  }
  state.suitDemoActive = false;
  syncSuitDemoUI();
  const offset = state.mode === 'orbital' && state.isCameraTransitioning
    ? state.cameraTargetPos.clone().sub(state.cameraTargetLook)
    : camera.position.clone().sub(controls.target);
  const factor = dir > 0 ? 0.68 : 1.42;
  const minD = state.mode === 'orbital' ? 4.64 : 1.25;
  const maxD = state.mode === 'orbital' ? 30.0 : 145.0;
  const desired = state.mode === 'orbital'
    ? MARS_RADIUS + Math.max(0.04, offset.length() - MARS_RADIUS) * (dir > 0 ? 0.62 : 1.6)
    : offset.length() * factor;
  const nextLen = Math.max(minD, Math.min(maxD, desired));
  offset.setLength(nextLen);
  animateCameraTo(controls.target.clone().add(offset), controls.target.clone(), camera.fov);
};

window.selectSite = (indexStr) => {
  projectionView?.reset();
  const idx = (parseInt(indexStr, 10) + SITES.length) % SITES.length;
  state.siteIndex = idx;
  document.getElementById('site-select').value = String(idx);

  const s = SITES[idx];
  state.waypoints = JSON.parse(JSON.stringify(s.defaultWaypoints));
  state.selectedWp = 0;
  state.reconPhotoVariant = 0;
  povGimbal.initialized = false;

  document.getElementById('coord-readout').textContent =
    `${s.coords} · ${s.baseElevM > 0 ? '+' : ''}${s.baseElevM}m`;
  document.getElementById('caption-title').textContent = `${s.shortName} (${s.coords})`;
  document.getElementById('caption-demo-text').textContent = s.demoLabel;
  document.getElementById('science-brief').innerHTML = s.brief;

  markerEls.forEach((el, i) => el.classList.toggle('selected-site', i === idx));

  if (state.mode !== 'orbital') {
    startSurfaceMorph(idx);
    // Ensure placeDemoGroup stays hidden if currently in Pure Particle LiDAR mode
    placeDemoGroup.visible = (state.mode === 'hybrid' && state.placeDemoActive);
    terrainMesh.visible = (state.mode === 'hybrid');
  } else {
    triggerSparkleBurst(1.25);
    spaceAudio.triggerMorphSound(s.chladni[0], s.chladni[1]);
    const targetVec = latLonToVec3(s.lat, s.lon, 11.2);
    targetVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), marsMesh.rotation.y);
    animateCameraTo(targetVec, new THREE.Vector3(0, 0, 0), 42);
  }

  rebuildRouteGeometry();
  renderWaypointList();
  updateWeatherUI();
  renderCrismSpectralPlot(idx);
  if (state.uhfViewshed) computeUhfViewshed();
  if (document.getElementById('nasa-recon-card').classList.contains('open')) {
    openNasaReconModal(state.waypoints[0], s, 0);
  }
};

window.cycleSite = (dir) => {
  window.selectSite(state.siteIndex + dir);
};

window.toggleDrawer = (drawerId) => {
  if(drawerId==='layers'){trekPanel?.open('layers');return;}if(state.mode==='orbital'&&['weather','science'].includes(drawerId))return;
  const allDrawers = ['layers', 'weather', 'route', 'science', 'profile'];
  if (state.openDrawer === drawerId) {
    document.getElementById(`drawer-${drawerId}`).classList.remove('open');
    state.openDrawer = null;
  } else {
    allDrawers.forEach(id => {
      const el = document.getElementById(`drawer-${id}`);
      if (el) el.classList.toggle('open', id === drawerId);
    });
    state.openDrawer = drawerId;
    if (drawerId === 'profile') drawElevationProfile();
  }
  document.body.classList.toggle('drawer-open', state.openDrawer !== null);
  document.querySelectorAll('.dock-btn[data-drawer]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.drawer === state.openDrawer);
  });
};

window.togglePlaceDemo = () => {
  state.placeDemoActive = !state.placeDemoActive;
  const btn = document.getElementById('demo-btn');
  btn.classList.toggle('demo-active', state.placeDemoActive);
  placeDemoGroup.visible = (state.mode === 'hybrid' && state.placeDemoActive);
  if (state.mode === 'hybrid') {
    particleShaderMat.uniforms.uOpacityScale.value = state.placeDemoActive ? 0.34 : 0.0;
  }
  showToast(state.placeDemoActive
    ? "Place Demo: 3D Landmarks & Chladni LiDAR Active"
    : "Place Demo Hidden: Clean 3D Martian Surface Mesh");
};

window.setAstronautSpeed = (val) => {
  state.astronautSpeed = parseFloat(val);
  const kmh = (state.astronautSpeed * 3.6).toFixed(1);
  const lbl = document.getElementById('eva-speed-label');
  if (lbl) {
    lbl.textContent = state.astronautSpeed === 0
      ? `EVA PAUSED (IDLE)`
      : `EVA ${state.astronautSpeed.toFixed(1)}x (${kmh} km/h)`;
  }
  updateMissionMetrics();
};

window.toggleAutoSpin = () => {
  state.autoSpin = !state.autoSpin;
  document.getElementById('spin-btn').classList.toggle('active', state.autoSpin);
};

window.toggleNadirView = () => {
  if (state.mode === 'orbital') setMode('hybrid');
  state.povMode = 'free';
  state.suitDemoActive = false;
  syncPOVButtonUI();
  syncSuitDemoUI();
  state.isNadir = !state.isNadir;
  document.getElementById('nadir-btn').classList.toggle('active', state.isNadir);

  if (state.isNadir) {
    animateCameraTo(new THREE.Vector3(0, 66, 0.01), new THREE.Vector3(0, 0, 0), 38);
    showToast("2D Nadir Orthographic Top-Down Projection");
  } else {
    animateCameraTo(new THREE.Vector3(0, 26, 38), new THREE.Vector3(0, -1, 0), 42);
    showToast("3D Perspective Tactical View");
  }
};

window.toggleStorm = () => {
  state.sepStorm = !state.sepStorm;
  const btn = document.getElementById('storm-btn');
  btn.textContent = state.sepStorm ? 'SEP DEMO: On ALERT' : 'SEP DEMO: Off';
  btn.classList.toggle('storm-active', state.sepStorm);

  atmoMat.uniforms.stormFactor.value = state.sepStorm ? 1.0 : 0.0;
  const radLayer = LAYERS.find(l => l.id === 'radiation');
  if (state.sepStorm && radLayer && !radLayer.active) {
    radLayer.active = true;
    renderLayerRows();
  }
  updateGlobeOverlayTexture();
  updateShaderLayerUniforms();
  updateMissionMetrics();
  updateWeatherUI();

  if (state.sepStorm) {
    spaceAudio.playGeigerPulse();
    showToast("SIMULATED SEP scenario active — not a DONKI Mars warning");
  } else {
    showToast("Space Weather Nominal: 0.64 mSv/day");
  }
};

window.toggleSpaceAudio = () => {
  spaceAudio.togglePlay();
};

window.setSpaceAudioVolume = (v) => {
  spaceAudio.setVolume(v);
};

window.toggleZen = () => {
  document.body.classList.toggle('zen-mode');
};

window.optimizeSafePath = () => {
  if (state.mode === 'orbital') setMode('hybrid');
  runAStarOptimizer();
};

window.toggleAddWaypoint = () => {
  if (state.mode === 'orbital') setMode('hybrid');
  state.addWpMode = !state.addWpMode;
  dropPreviewGroup.visible = false;
  document.body.classList.toggle('drop-wp-active', state.addWpMode);
  const btn = document.getElementById('add-wp-btn');
  if (btn) {
    btn.style.borderColor = state.addWpMode ? '#38BDF8' : '';
    btn.textContent = state.addWpMode ? 'Click 3D Terrain Now...' : '+ Click Terrain to Drop WP';
  }
  if (state.addWpMode) {
    showToast("Tap or click any spot on the 3D Martian terrain to drop a waypoint & view NASA photo");
  }
};

window.resetSiteRoute = () => {
  const s = SITES[state.siteIndex];
  state.waypoints = JSON.parse(JSON.stringify(s.defaultWaypoints));
  state.selectedWp = 0;
  rebuildRouteGeometry();
  renderWaypointList();
  showToast("Route reset to illustrative scenario baseline");
};

window.setRelief = (val) => {
  state.relief = parseFloat(val);
  terrainShaderMat.uniforms.uReliefScale.value = state.relief;
  particleShaderMat.uniforms.uReliefScale.value = state.relief;
  buildSiteLandmarkProps(state.siteIndex);
  rebuildRouteGeometry();
};

let toastTimeout = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => t.classList.remove('show'), 2800);
}

window.addEventListener('keydown', (e) => {
  if(fieldLab?.active)return;
  if (e.key === 'Escape' && state.addWpMode) window.toggleAddWaypoint();
  if (e.key === 'h' || e.key === 'H') window.toggleZen();
  if (e.key === '[') window.cycleSite(-1);
  if (e.key === ']') window.cycleSite(1);
  if (e.key === 'v' || e.key === 'V') window.cycleAstronautPOV();
});
// 12. CAMERA, WALK CYCLE & RENDER LOOP
const hudZoomRatioEl = document.getElementById('hud-zoom-ratio');
const hudCamAltEl = document.getElementById('hud-cam-alt');
const hudScaleLabelEl = document.getElementById('hud-scale-label');
const hudScaleLineEl = document.getElementById('hud-scale-line');
const hudDestReadoutEl = document.getElementById('hud-dest-readout');
const eva3dChipEl = document.getElementById('eva-float-chip');
const captionMorphFillEl = document.getElementById('caption-morph-fill');

function formatMetricDistance(meters) {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 2)} km`;
  }
  return `${Math.round(meters)} m`;
}

function updateZoomScaleAndDestinationHUD(remKm) {
  if (camera.isOrthographicCamera) {
    const kmPerPixel=(camera.top-camera.bottom)/camera.zoom/(renderer.domElement.clientHeight||800)*3389.5/MARS_RADIUS*(progressiveGlobe?.rectangle?Math.PI/2:1);
    const raw=kmPerPixel*90, magnitude=10**Math.floor(Math.log10(raw));
    const km=[1,2,5,10].map(v=>v*magnitude).reduce((a,b)=>Math.abs(a-raw)<Math.abs(b-raw)?a:b);
    hudZoomRatioEl.textContent=`${camera.zoom.toFixed(1)}×`;
    hudCamAltEl.textContent='ORTHOGRAPHIC';hudScaleLabelEl.textContent=`${km.toLocaleString()} km projected`;
    hudScaleLineEl.style.width=`${km/kmPerPixel}px`;
    hudScaleLineEl.title='Scale on the orthographic image plane; surface scale varies across the hemisphere';return;
  }
  const camDist = camera.position.distanceTo(controls.target);

  if (state.mode === 'orbital') {
    const zoomRatio = (13.5 * camera.zoom / Math.max(4.64, camDist)).toFixed(1);
    const planetRadiusKm = 3389.5;
    const altKm = Math.max(0, (camDist - MARS_RADIUS) * planetRadiusKm / MARS_RADIUS);
    // Exact symmetric ray/sphere intersections give a scale at the view centre.
    const viewportHeight = renderer.domElement.clientHeight || window.innerHeight;
    const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / camera.zoom;
    const theta = Math.min(Math.atan(64 * tanHalfFov / viewportHeight), Math.asin(MARS_RADIUS / camDist) * 0.8);
    const rayDistance = camDist * Math.cos(theta) - Math.sqrt(Math.max(0, MARS_RADIUS ** 2 - camDist ** 2 * Math.sin(theta) ** 2));
    const halfArc = Math.atan2(rayDistance * Math.sin(theta), camDist - rayDistance * Math.cos(theta));
    const rawScaleKm = 2 * halfArc * planetRadiusKm;
    const niceSteps = [0.25, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 1500, 2000, 3000];
    const chosenKm = niceSteps.reduce((prev, curr) => Math.abs(curr - rawScaleKm) < Math.abs(prev - rawScaleKm) ? curr : prev);
    const halfScaleArc = chosenKm / (2 * planetRadiusKm);
    const halfScaleTheta = Math.atan2(MARS_RADIUS * Math.sin(halfScaleArc), camDist - MARS_RADIUS * Math.cos(halfScaleArc));
    const barPx = viewportHeight * Math.tan(halfScaleTheta) / tanHalfFov;

    hudZoomRatioEl.textContent = `${zoomRatio}x`;
    hudCamAltEl.textContent = `ALT ${altKm.toLocaleString(undefined, { maximumFractionDigits: altKm < 100 ? 1 : 0 })} km`;
    hudScaleLabelEl.textContent = `${chosenKm.toLocaleString()} km`;
    hudScaleLineEl.style.width = `${barPx}px`;
    hudScaleLineEl.title = "Geodesic scale at the view centre";
  } else {
    const zoomRatio = (38.0 / Math.max(controls.minDistance, camDist)).toFixed(1);
    const altMeters = Math.max(2, Math.round(camDist * 24));
    const rawScaleM = camDist * 9.5;
    const niceStepsM = [5, 10, 25, 50, 100, 200, 500, 1000, 2000];
    const chosenM = niceStepsM.reduce((prev, curr) =>
      Math.abs(curr - rawScaleM) < Math.abs(prev - rawScaleM) ? curr : prev
    );
    const barPx = Math.max(40, Math.min(88, Math.round((chosenM / rawScaleM) * 62)));

    hudZoomRatioEl.textContent = `${zoomRatio}x`;
    hudCamAltEl.textContent = `ALT ${formatMetricDistance(altMeters)}`;
    hudScaleLabelEl.textContent = formatMetricDistance(chosenM);
    hudScaleLineEl.style.width = `${barPx}px`;

    const speedKmh = Math.max(0.1, state.astronautSpeed * 3.6);
    const etaMin = state.astronautSpeed > 0.01 ? Math.max(1, Math.round((remKm / speedKmh) * 60)) : 0;
    const targetWp = state.waypoints[state.waypoints.length - 1];
    hudDestReadoutEl.textContent = state.astronautSpeed > 0.01
      ? `DEST ${targetWp ? targetWp.name.split(' ')[0] : 'WP-3'} · ${remKm.toFixed(2)} km · ETA ${etaMin}m`
      : `DEST ${targetWp ? targetWp.name.split(' ')[0] : 'WP-3'} · ${remKm.toFixed(2)} km · PAUSED`;
  }
}

function updateAstronautBiomechanics(dt, elapsed) {
  if (!routeCurve) return;

  const u = state.evaProgress;
  const pos = routeCurve.getPointAt(u);
  // Sample a long chord look-ahead along the spline so turns are ultra-smooth with zero spline-knot jitter
  const aheadU = (u + 0.045) % 1.0;
  const aheadPt = routeCurve.getPointAt(aheadU);
  const rawChordDir = aheadPt.clone().sub(pos);
  rawChordDir.y = 0;
  if (rawChordDir.lengthSq() < 0.0001) {
    rawChordDir.copy(routeCurve.getTangentAt(u));
    rawChordDir.y = 0;
  }
  rawChordDir.normalize();

  const exactGroundY = getSiteHeight(state.siteIndex, pos.x, pos.z);
  const localSlopeDeg = getSiteSlopeDeg(state.siteIndex, pos.x, pos.z);
  const slopeFactor = Math.max(0.55, 1.0 - (localSlopeDeg / 45.0));

  if (state.astronautSpeed > 0.001 && !state.suitDemoActive) {
    state.evaProgress = state.survivalRouteActive
      ? Math.min(1, state.evaProgress + dt * 0.036 * state.astronautSpeed * slopeFactor)
      : (state.evaProgress + dt * 0.036 * state.astronautSpeed * slopeFactor) % 1.0;
    if (state.survivalRouteActive && state.evaProgress >= 1) state.astronautSpeed = 0;
    state.walkCycleTime += dt * 6.0 * state.astronautSpeed * slopeFactor;
  }

  const w = state.walkCycleTime;
  const isWalking = state.astronautSpeed > 0.04 && !state.suitDemoActive;

  // 1. Rhythmic Human Breathing & Ribcage Expansion (14 breaths/min at rest, up to 26 on steep slopes)
  const breathsPerMin = 14.0 + (isWalking ? state.astronautSpeed * 4.5 + localSlopeDeg * 0.25 : 0.0);
  const breathPhase = elapsed * (breathsPerMin / 60.0) * Math.PI * 2.0;
  const breathWave = Math.sin(breathPhase);
  astronautRig.ribcageGroup.scale.set(
    1.0 + breathWave * 0.016,
    1.0 + breathWave * 0.012,
    1.0 + breathWave * 0.022
  );

  if (isWalking) {
    const stride = Math.min(1.12, 0.42 + state.astronautSpeed * 0.34);
    const bounce = Math.abs(Math.sin(w)) * 0.11 * Math.min(1.2, state.astronautSpeed);

    astronautRig.root.position.set(pos.x, exactGroundY, pos.z);
    astronautRig.pelvisGroup.position.y = 1.00 + bounce;
    astronautRig.pelvisGroup.position.x = Math.cos(w) * 0.032 * stride;
    astronautRig.pelvisGroup.rotation.z = Math.cos(w) * 0.052 * stride;
    astronautRig.pelvisGroup.rotation.y = -Math.sin(w) * 0.07 * stride;

    const forwardLean = 0.07 + Math.min(0.18, state.astronautSpeed * 0.05 + (localSlopeDeg / 95.0));
    astronautRig.torsoGroup.rotation.x = forwardLean + breathWave * 0.012;
    astronautRig.torsoGroup.rotation.z = -Math.cos(w) * 0.038 * stride;
    astronautRig.torsoGroup.rotation.y = Math.sin(w) * 0.08 * stride;

    astronautRig.headPivot.rotation.y = Math.sin(elapsed * 0.7) * 0.16;
    astronautRig.headPivot.rotation.x = Math.sin(elapsed * 1.1) * 0.04 - forwardLean * 0.4;
    astronautRig.headPivot.rotation.z = Math.cos(w) * 0.02;

    // Left arm swings freely; Right arm carries the wire sample basket with natural damped pendulum swing
    const armSwingL = Math.sin(w) * 0.52 * stride;
    const armSwingR = -Math.sin(w) * 0.28 * stride;
    astronautRig.leftArmPivot.rotation.set(armSwingL, 0, 0.07);
    astronautRig.rightArmPivot.rotation.set(armSwingR - 0.08, 0, -0.10);
    astronautRig.leftElbowPivot.rotation.x = -0.32 - Math.max(0, armSwingL) * 0.50;
    astronautRig.rightElbowPivot.rotation.x = -0.22 - Math.max(0, armSwingR) * 0.25;

    const legSwingL = -Math.sin(w) * 0.58 * stride;
    const legSwingR = Math.sin(w) * 0.58 * stride;
    astronautRig.leftLegPivot.rotation.x = legSwingL;
    astronautRig.rightLegPivot.rotation.x = legSwingR;
    astronautRig.leftKneePivot.rotation.x = Math.max(0, -legSwingL) * 0.88 + 0.06;
    astronautRig.rightKneePivot.rotation.x = Math.max(0, -legSwingR) * 0.88 + 0.06;

    astronautRig.leftAnklePivot.rotation.x = Math.cos(w) * 0.22 * stride - (localSlopeDeg * 0.007);
    astronautRig.rightAnklePivot.rotation.x = -Math.cos(w) * 0.22 * stride - (localSlopeDeg * 0.007);
  } else {
    astronautRig.root.position.set(pos.x, exactGroundY, pos.z);

    const weightShift = Math.sin(elapsed * 0.85);
    astronautRig.pelvisGroup.position.x = weightShift * 0.028;
    astronautRig.pelvisGroup.position.y = 1.00 + Math.abs(breathWave) * 0.010;
    astronautRig.pelvisGroup.rotation.z = weightShift * 0.038;
    astronautRig.pelvisGroup.rotation.y = Math.sin(elapsed * 0.45) * 0.035;

    astronautRig.torsoGroup.rotation.x = 0.03 + breathWave * 0.018;
    astronautRig.torsoGroup.rotation.z = -weightShift * 0.025;
    astronautRig.torsoGroup.rotation.y = Math.cos(elapsed * 0.55) * 0.05;

    const gestureCycle = elapsed % 9.5;
    const wristCheckEnv = gestureCycle < 4.2 ? Math.sin((gestureCycle / 4.2) * Math.PI) : 0.0;
    const basketInspectEnv = gestureCycle >= 4.6 && gestureCycle < 8.4 ? Math.sin(((gestureCycle - 4.6) / 3.8) * Math.PI) : 0.0;

    astronautRig.leftArmPivot.rotation.x = -0.14 - wristCheckEnv * 0.74;
    astronautRig.leftArmPivot.rotation.z = 0.09 - wristCheckEnv * 0.26;
    astronautRig.leftElbowPivot.rotation.x = -0.32 - wristCheckEnv * 1.02;

    // Right arm gently lifts wire sample collection basket to inspect Martian rock cores
    astronautRig.rightArmPivot.rotation.x = -0.10 - basketInspectEnv * 0.42;
    astronautRig.rightArmPivot.rotation.z = -0.10 - basketInspectEnv * 0.08;
    astronautRig.rightElbowPivot.rotation.x = -0.22 - basketInspectEnv * 0.55;

    astronautRig.headPivot.rotation.y = wristCheckEnv > 0.2
      ? 0.30 * wristCheckEnv
      : (basketInspectEnv > 0.2 ? -0.26 * basketInspectEnv : Math.sin(elapsed * 0.65) * 0.28);
    astronautRig.headPivot.rotation.x = (wristCheckEnv > 0.2 || basketInspectEnv > 0.2)
      ? 0.24 * Math.max(wristCheckEnv, basketInspectEnv)
      : Math.sin(elapsed * 0.95) * 0.06;
    astronautRig.headPivot.rotation.z = weightShift * 0.02;

    astronautRig.leftLegPivot.rotation.x = weightShift * 0.04;
    astronautRig.rightLegPivot.rotation.x = -weightShift * 0.04;
    astronautRig.leftKneePivot.rotation.x = Math.max(0, -weightShift) * 0.10;
    astronautRig.rightKneePivot.rotation.x = Math.max(0, weightShift) * 0.10;
    astronautRig.leftAnklePivot.rotation.x = 0;
    astronautRig.rightAnklePivot.rotation.x = 0;
  }

  // Update Steadicam Gimbal Low-Pass Filters (Eliminates all camera shake in Shoulder & Visor POV!)
  if (!povGimbal.initialized) {
    povGimbal.smoothRootPos.set(pos.x, exactGroundY, pos.z);
    povGimbal.smoothForward.copy(rawChordDir);
    povGimbal.smoothGradeDeg = localSlopeDeg;
    povGimbal.initialized = true;
  } else {
    const xzAlpha = 1.0 - Math.exp(-8.0 * dt);
    const yAlpha  = 1.0 - Math.exp(-2.2 * dt); // Heavy vertical isolation from terrain bumps!
    const dirAlpha = 1.0 - Math.exp(-2.5 * dt); // Heavy rotational isolation from spline kinks!
    povGimbal.smoothRootPos.x = THREE.MathUtils.lerp(povGimbal.smoothRootPos.x, pos.x, xzAlpha);
    povGimbal.smoothRootPos.z = THREE.MathUtils.lerp(povGimbal.smoothRootPos.z, pos.z, xzAlpha);
    povGimbal.smoothRootPos.y = THREE.MathUtils.lerp(povGimbal.smoothRootPos.y, exactGroundY, yAlpha);
    povGimbal.smoothForward.lerp(rawChordDir, dirAlpha).normalize();
    povGimbal.smoothGradeDeg = THREE.MathUtils.lerp(povGimbal.smoothGradeDeg, localSlopeDeg, yAlpha);
  }

  const lookTarget = pos.clone().add(povGimbal.smoothForward);
  lookTarget.y = astronautRig.root.position.y;
  astronautRig.root.lookAt(lookTarget);
  astronautRig.groundRing.scale.setScalar(0.92 + Math.sin(elapsed * 4.5) * 0.14);

  const remKm = Math.max(0.05, state.totalTraverseKm * (1.0 - u));
  eva3dChipEl.textContent = `EVA-1 · ${remKm.toFixed(2)} km rem`;
  updateZoomScaleAndDestinationHUD(remKm);

  // Update Walk-Back "Point of No Return" Safety Ring & UHF Line-of-Sight status
  const hab = state.waypoints[0] || { x: -32, z: 28 };
  const distFromHabKm = Math.hypot(pos.x - hab.x, pos.z - hab.z) * 0.024;
  const o2Pct = Math.max(18, Math.round(98 - u * 24 - localSlopeDeg * 0.2));
  state.o2ReservePct = o2Pct;
  const maxSafeRadiusKm = Math.max(0.25, (o2Pct / 100) * 2.2 - localSlopeDeg * 0.015);
  state.pnrMarginKm = maxSafeRadiusKm - distFromHabKm;

  walkBackRing.position.set(pos.x, exactGroundY + 0.14, pos.z);
  const ringScale = Math.max(0.45, Math.min(2.2, maxSafeRadiusKm * 1.1));
  walkBackRing.scale.setScalar(ringScale * (0.96 + Math.sin(elapsed * 2.5) * 0.04));
  walkBackRing.material.color.setHex(state.pnrMarginKm < 0.2 ? 0xf87171 : (state.pnrMarginKm < 0.55 ? 0xfbbf24 : 0x34d399));

  state.uhfLinked = checkPointUhfLos(pos.x, pos.z);
  const walkSlider = document.getElementById('visor-walk-slider');
  const walkPct = document.getElementById('visor-walk-pct');
  if (walkSlider && !isWalking) walkSlider.value = String(u.toFixed(3));
  if (walkPct) walkPct.textContent = `${Math.round(u * 100)}%`;

  const co2El = document.getElementById('visor-co2');
  const kcalEl = document.getElementById('visor-kcal');
  const uhfEl = document.getElementById('visor-uhf');
  const pnrEl = document.getElementById('visor-pnr');
  const o2El = document.getElementById('visor-o2');
  if (o2El) o2El.textContent = `${o2Pct}%`;
  if (co2El) co2El.textContent = `${Math.max(42, Math.round(98 - u * 16))}%`;
  if (kcalEl) kcalEl.textContent = `${Math.round(180 + (isWalking ? state.astronautSpeed * 110 + localSlopeDeg * 8 : 25))} kcal/h`;
  if (uhfEl) {
    uhfEl.textContent = state.uhfLinked ? 'LINKED (-68dBm)' : 'OCCLUDED (SHADOW)';
    uhfEl.style.color = state.uhfLinked ? '#34D399' : '#F87171';
  }
  if (pnrEl) {
    pnrEl.textContent = state.pnrMarginKm >= 0 ? `SAFE (+${state.pnrMarginKm.toFixed(2)}km)` : `PNR EXCEEDED`;
    pnrEl.style.color = state.pnrMarginKm >= 0.3 ? '#34D399' : '#F87171';
  }
  updateArChevrons(elapsed);

  // 4. Zero-Overlap, Horizon-Locked Camera Rig for 'visor' & 'shoulder' POV
  if (state.mode !== 'orbital') {
    const viewDir = povGimbal.smoothForward.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), povGimbal.yawOffset);

    if (state.povMode === 'visor') {
      // Lock directly to smoothed eye coordinates (pelvisGroup is hidden so zero body/head overlap!)
      const eyeX = pos.x + viewDir.x * 0.35;
      const eyeZ = pos.z + viewDir.z * 0.35;
      const eyeY = povGimbal.smoothRootPos.y + 2.48;

      camera.position.set(eyeX, eyeY, eyeZ);
      controls.target.set(
        eyeX + viewDir.x * 24.0,
        eyeY - 1.25 + povGimbal.pitchOffset * 14.0,
        eyeZ + viewDir.z * 24.0
      );
      camera.lookAt(controls.target);

      const site = SITES[state.siteIndex];
      const hdgDeg = Math.round(((Math.atan2(viewDir.x, viewDir.z) * 180 / Math.PI) + 360) % 360);
      const bpm = Math.round(76 + state.astronautSpeed * 18 + povGimbal.smoothGradeDeg * 1.2);
      document.getElementById('visor-hdg').textContent = `HDG ${String(hdgDeg).padStart(3, '0')}°`;
      document.getElementById('visor-chladni').textContent =
        `CHLADNI (n=${site.chladni[0]}, m=${site.chladni[1]}) · ${Math.round(220 + site.chladni[0] * 36 + site.chladni[1] * 22)} Hz`;
      document.getElementById('visor-next-wp').textContent = `REM: ${(remKm * 1000).toFixed(0)}m`;
      document.getElementById('visor-bpm').textContent = `${bpm} BPM`;
      document.getElementById('visor-resp').textContent = `${Math.round(breathsPerMin)} /min`;
      document.getElementById('visor-grade').textContent = `${povGimbal.smoothGradeDeg.toFixed(1)}°`;
      document.getElementById('visor-ti').textContent = `${site.thermalInertia} TIU`;
      document.getElementById('visor-rad').textContent = `${(state.sepStorm ? site.stormRad : site.nominalRad).toFixed(2)} mSv`;

      const ladder = document.getElementById('visor-horizon-ladder');
      if (ladder) {
        const pitchPx = (povGimbal.smoothGradeDeg * 0.85 - povGimbal.pitchOffset * 40.0).toFixed(1);
        ladder.style.transform = `translate(-50%, calc(-50% + ${pitchPx}px))`;
      }
    } else if (state.povMode === 'shoulder') {
      // Rigidly-spaced, collision-safe Side/Over-the-Shoulder Boom (5.4m back, 2.2m right, 3.2m up — NEVER overlaps astronaut!)
      const rightVec = new THREE.Vector3().crossVectors(viewDir, new THREE.Vector3(0, 1, 0)).normalize();
      const camX = pos.x - viewDir.x * 5.4 + rightVec.x * 2.20;
      const camZ = pos.z - viewDir.z * 5.4 + rightVec.z * 2.20;
      const groundAtCam = getSiteHeight(state.siteIndex, camX, camZ);
      const targetCamY = Math.max(povGimbal.smoothRootPos.y + 3.25, groundAtCam + 2.2);

      if (!povGimbal.camPos.y) povGimbal.camPos.y = targetCamY;
      povGimbal.camPos.y = THREE.MathUtils.lerp(povGimbal.camPos.y, targetCamY, 1.0 - Math.exp(-5.0 * dt));

      camera.position.set(camX, povGimbal.camPos.y, camZ);
      controls.target.set(
        pos.x + viewDir.x * 14.0,
        povGimbal.smoothRootPos.y + 1.85 + povGimbal.pitchOffset * 12.0,
        pos.z + viewDir.z * 14.0
      );
      camera.lookAt(controls.target);
    } else if (state.suitDemoActive) {
      state.suitDemoAngle += dt * 0.52;
      const radius = 3.5;
      const camX = povGimbal.smoothRootPos.x + Math.cos(state.suitDemoAngle) * radius;
      const camZ = povGimbal.smoothRootPos.z + Math.sin(state.suitDemoAngle) * radius;
      const camY = povGimbal.smoothRootPos.y + 1.60 + Math.sin(state.suitDemoAngle * 0.7) * 0.25;
      const camAlpha = 1.0 - Math.exp(-6.0 * dt);
      camera.position.lerp(new THREE.Vector3(camX, camY, camZ), camAlpha);
      controls.target.lerp(new THREE.Vector3(
        povGimbal.smoothRootPos.x,
        povGimbal.smoothRootPos.y + 1.25,
        povGimbal.smoothRootPos.z
      ), camAlpha);
      camera.lookAt(controls.target);
    }
  }
}

const clock = new THREE.Clock();
const projVec = new THREE.Vector3();
const camNormal = new THREE.Vector3();

let fpsStart=0, fpsFrames=0;
function animate(time, frame) {
  fpsFrames++; if(time-fpsStart>=1000){const label=document.getElementById('brand-telemetry');if(label)label.textContent=`CHLADNI GPU · ${Math.round(fpsFrames*1000/(time-fpsStart))} FPS`;fpsFrames=0;fpsStart=time;}
  const dt = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.getElapsedTime();
  if (mobileAR?.active) { mobileAR.update(time, frame); return; }
  if(fieldLab?.active){spaceAudio.updateVisualizer(elapsed);fieldLab.update(dt);return;}
  upgrades?.update(dt);
  vehicles?.update(dt);
  projectionView?.update(dt);
  trekPanel?.update();geologyLayers?.update();scientificLayers?.update();
  proximityLabels?.update();mobileShell?.update();
  progressiveGlobe?.update(marsMat.opacity);

  particleShaderMat.uniforms.uTime.value = elapsed;
  sparkleShaderMat.uniforms.uTime.value = elapsed;
  globeParticleShaderMat.uniforms.uTime.value = elapsed;
  spaceAudio.updateVisualizer(elapsed);

  // Update Particle Globe -> Actual Martian Globe Smooth Translation on Launch
  if (state.globeIntroMorph.active) {
    state.globeIntroMorph.progress += dt / state.globeIntroMorph.duration;
    if (state.globeIntroMorph.progress >= 1.0) {
      state.globeIntroMorph.progress = 1.0;
      state.globeIntroMorph.active = false;
    }
    const p = state.globeIntroMorph.progress;
    globeParticleShaderMat.uniforms.uIntroProgress.value = p;
    // Smoothly fade in the solid MOLA Martian Globe as the 14,400 particles coalesce onto its surface
    const meshFade = THREE.MathUtils.smoothstep(p, 0.25, 0.92);
    marsMat.opacity = meshFade;
    overlayMat.opacity = meshFade * 0.52;
    atmoMat.uniforms.uFade.value = 0.25 + meshFade * 0.75;
    globeParticleShaderMat.uniforms.uShellOpacity.value = 1.0 - meshFade * 0.82;
  }

  if (state.sparkleBurst.active) {
    state.sparkleBurst.progress += dt / state.sparkleBurst.duration;
    if (state.sparkleBurst.progress >= 1.0) {
      state.sparkleBurst.progress = 1.0;
      state.sparkleBurst.active = false;
      sparkleShaderMat.uniforms.uBurstIntensity.value = 0.0;
    } else {
      const env = Math.sin(state.sparkleBurst.progress * Math.PI);
      sparkleShaderMat.uniforms.uBurstIntensity.value = env;
    }
  }

  if (state.chladniRipple.active) {
    state.chladniRipple.progress += dt / state.chladniRipple.duration;
    if (state.chladniRipple.progress >= 1.0) {
      state.chladniRipple.progress = 1.0;
      state.chladniRipple.active = false;
    }
    particleShaderMat.uniforms.uRippleProgress.value = state.chladniRipple.progress;
    terrainShaderMat.uniforms.uRippleProgress.value = state.chladniRipple.progress;
  }

  if (state.morph.active) {
    state.morph.progress += dt / state.morph.duration;
    if (state.morph.progress >= 1.0) {
      state.morph.progress = 1.0;
      state.morph.active = false;
      document.getElementById('morph-indicator').classList.remove('active');
      document.getElementById('brand-dot').classList.remove('scanning');
    }
    terrainShaderMat.uniforms.uMorphProgress.value = state.morph.progress;
    particleShaderMat.uniforms.uMorphProgress.value = state.morph.progress;
    captionMorphFillEl.style.width = `${Math.round(state.morph.progress * 100)}%`;
  }

  if (state.isCameraTransitioning && state.povMode === 'free' && !state.suitDemoActive) {
    state.cameraTransitionTimer += dt;
    const closeOrbital = state.mode === 'orbital' && state.cameraTargetPos.distanceTo(state.cameraTargetLook) < MARS_RADIUS + 1;
    const alpha = 1.0 - Math.exp(-(closeOrbital ? 10.0 : 7.5) * dt);
    camera.position.lerp(state.cameraTargetPos, alpha);
    controls.target.lerp(state.cameraTargetLook, alpha);
    camera.fov = THREE.MathUtils.lerp(camera.fov, state.cameraTargetFov, alpha);
    camera.updateProjectionMatrix();

    if (
      camera.position.distanceTo(state.cameraTargetPos) < (closeOrbital ? 0.00001 : 0.08) ||
      state.cameraTransitionTimer > 1.35
    ) {
      state.isCameraTransitioning = false;
      if (closeOrbital) {
        camera.position.copy(state.cameraTargetPos);
        controls.target.copy(state.cameraTargetLook);
      }
    }
  }

  if (state.mode === 'orbital') {
    const camDist = camera.position.distanceTo(controls.target);

    // Altitude-adaptive rotation speed so zooming close to a single mountain feels effortless like Google Earth
    const altitude = Math.max(0.04, camDist - MARS_RADIUS);
    const altitudeRatio = altitude / Math.max(camDist, MARS_RADIUS);
    controls.rotateSpeed = THREE.MathUtils.clamp(altitudeRatio * 0.9, 0.004, 0.72);
    controls.zoomSpeed = camera.isOrthographicCamera ? .8 : THREE.MathUtils.clamp(altitudeRatio * 4, 0.02, 1.25);

    if (state.autoSpin && !state.isCameraTransitioning && camDist > 7.2) {
      marsMesh.rotation.y += dt * 0.095;
    }

    const pArr = arcPacketGeo.attributes.position.array;
    for (let i = 0; i < ARC_PACKET_COUNT; i++) {
      const meta = arcPacketMeta[i];
      meta.t = (meta.t + dt * meta.speed) % 1.0;
      const pt = cyberArcCurves[meta.curveIdx].getPointAt(meta.t);
      pArr[i * 3]     = pt.x;
      pArr[i * 3 + 1] = pt.y;
      pArr[i * 3 + 2] = pt.z;
    }
    arcPacketGeo.attributes.position.needsUpdate = true;

    satellites.forEach((sat) => {
      const angle = elapsed * sat.speed + sat.phase;
      sat.body.position.set(Math.cos(angle) * sat.radius, 0, Math.sin(angle) * sat.radius);

      const satWorld = new THREE.Vector3();
      sat.body.getWorldPosition(satWorld);
      const bWorld = new THREE.Vector3();
      beaconAnchors[sat.targetBeacon].anchor.getWorldPosition(bWorld);
      const posAttr = sat.beamGeo.attributes.position;
      posAttr.setXYZ(0, satWorld.x, satWorld.y, satWorld.z);
      posAttr.setXYZ(1, bWorld.x, bWorld.y, bWorld.z);
      posAttr.needsUpdate = true;
    });

    camNormal.copy(camera.position).normalize();
    beaconAnchors.forEach((b, idx) => {
      b.ring.scale.setScalar(1 + Math.sin(elapsed * 3.5 + idx) * 0.16);
      b.anchor.getWorldPosition(projVec);
      const worldNorm = projVec.clone().normalize();
      const facing = worldNorm.dot(camNormal);

      const el = markerEls[idx];
      if (facing > 0.18 && state.globeIntroMorph.started && marsMat.opacity > 0.35) {
        projVec.project(camera);
        const x = (projVec.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-projVec.y * 0.5 + 0.5) * window.innerHeight;
        el.style.opacity = '1';
        el.style.pointerEvents = 'auto';
        el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -100%)`;
      } else {
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
      }
    });

    // Show 3D Mountain Peak & Volcano Labels as user zooms in on the Orbital Globe (camDist < 11.8)
    const mtnFade = THREE.MathUtils.clamp((11.8 - camDist) / 2.6, 0.0, 1.0);
    mountainMarkers.forEach((m) => {
      if (mtnFade <= 0.02) {
        m.el.style.opacity = '0';
        m.el.style.pointerEvents = 'none';
        return;
      }
      m.anchor.getWorldPosition(projVec);
      const worldNorm = projVec.clone().normalize();
      const facing = worldNorm.dot(camNormal);
      if (facing > 0.25) {
        projVec.project(camera);
        const x = (projVec.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-projVec.y * 0.5 + 0.5) * window.innerHeight;
        m.el.style.opacity = String(mtnFade.toFixed(2));
        m.el.style.pointerEvents = mtnFade > 0.25 ? 'auto' : 'none';
        m.el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -100%)`;
      } else {
        m.el.style.opacity = '0';
        m.el.style.pointerEvents = 'none';
      }
    });

    surfaceWpLabelEls.forEach(item => { item.el.style.opacity = '0'; });
    astronautLabelEl.style.opacity = '0';
    updateZoomScaleAndDestinationHUD(state.totalTraverseKm);
  } else {
    controls.rotateSpeed = 0.72;
    controls.zoomSpeed = 1.25;
    markerEls.forEach(el => {
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
    });
    mountainMarkers.forEach(m => {
      m.el.style.opacity = '0';
      m.el.style.pointerEvents = 'none';
    });

    if (state.autoSpin && !state.isCameraTransitioning && !state.isNadir && !state.addWpMode && state.povMode === 'free' && !state.suitDemoActive) {
      const offset = camera.position.clone().sub(controls.target);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), dt * 0.055);
      camera.position.copy(controls.target).add(offset);
    }

    updateAstronautBiomechanics(dt, elapsed);

    surfaceWpLabelEls.forEach(item => {
      projVec.copy(item.pos).project(camera);
      if (projVec.z > -1 && projVec.z < 1) {
        const x = (projVec.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-projVec.y * 0.5 + 0.5) * window.innerHeight;
        item.el.style.opacity = '0.94';
        item.el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -100%)`;
      } else {
        item.el.style.opacity = '0';
      }
    });

    if (state.povMode === 'visor') {
      astronautLabelEl.style.opacity = '0';
    } else {
      projVec.copy(astronautRig.root.position);
      projVec.y += 3.1;
      projVec.project(camera);
      if (projVec.z > -1 && projVec.z < 1) {
        const ax = (projVec.x * 0.5 + 0.5) * window.innerWidth;
        const ay = (-projVec.y * 0.5 + 0.5) * window.innerHeight;
        astronautLabelEl.style.opacity = '1';
        astronautLabelEl.style.transform = `translate3d(${ax}px, ${ay}px, 0) translate(-50%, -100%)`;
      } else {
        astronautLabelEl.style.opacity = '0';
      }
    }
  }

  if (controls.enabled) {
    controls.update();
  }
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
// 13. 3D AR PATH CHEVRONS, WALK-BACK SAFETY RING, UHF VIEWSHED & CRISM PLOT
// A. Dynamic "Point of No Return" Walk-Back Safety Perimeter Ring
const walkBackRing = new THREE.Mesh(
  new THREE.RingGeometry(4.2, 4.7, 48),
  new THREE.MeshBasicMaterial({ color: 0x34d399, side: THREE.DoubleSide, transparent: true, opacity: 0.42 })
);
walkBackRing.rotation.x = -Math.PI / 2;
surfaceGroup.add(walkBackRing);

// B. 3D AR Path Chevrons projected ahead of astronaut along EVA spline
const arChevronGroup = new THREE.Group();
surfaceGroup.add(arChevronGroup);
const arChevrons = [];
const chevronShape = new THREE.Shape();
chevronShape.moveTo(0, 0.55);
chevronShape.lineTo(0.48, -0.25);
chevronShape.lineTo(0.24, -0.25);
chevronShape.lineTo(0, 0.18);
chevronShape.lineTo(-0.24, -0.25);
chevronShape.lineTo(-0.48, -0.25);
chevronShape.closePath();
const chevronGeo = new THREE.ShapeGeometry(chevronShape);
chevronGeo.rotateX(-Math.PI / 2);

for (let c = 0; c < 10; c++) {
  const mat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending
  });
  const mesh = new THREE.Mesh(chevronGeo, mat);
  arChevronGroup.add(mesh);
  arChevrons.push(mesh);
}

function updateArChevrons(elapsed) {
  if (!routeCurve || state.mode === 'orbital') {
    arChevronGroup.visible = false;
    return;
  }
  arChevronGroup.visible = (state.povMode !== 'free' || state.mode === 'hybrid');
  const siteIdx = state.siteIndex;
  for (let i = 0; i < arChevrons.length; i++) {
    const stepU = (state.evaProgress + 0.025 + i * 0.024) % 1.0;
    const pt = routeCurve.getPointAt(stepU);
    const tan = routeCurve.getTangentAt(stepU).normalize();
    const gy = getSiteHeight(siteIdx, pt.x, pt.z);
    const slope = getSiteSlopeDeg(siteIdx, pt.x, pt.z);

    const ch = arChevrons[i];
    ch.position.set(pt.x, gy + 0.42, pt.z);
    ch.lookAt(pt.x + tan.x, gy + 0.42, pt.z + tan.z);
    ch.material.color.setHex(slope > 20 ? 0xf87171 : (slope > 15 ? 0xfbbf24 : 0x38bdf8));
    const pulse = 0.35 + 0.55 * Math.max(0, Math.sin(elapsed * 5.0 - i * 0.65));
    ch.material.opacity = pulse;
  }
}

// C. UHF Line-of-Sight (LoS) Comms Viewshed Raycaster from HAB-01 Antenna
function computeUhfViewshed() {
  const siteIdx = state.siteIndex;
  const hab = state.waypoints[0] || { x: -32, z: 28 };
  const habY = getSiteHeight(siteIdx, hab.x, hab.z) + 4.4;
  let ptr = 0;

  for (let iz = 0; iz <= DEM_SEGMENTS; iz++) {
    const vz = (iz / DEM_SEGMENTS - 0.5) * DEM_SIZE;
    for (let ix = 0; ix <= DEM_SEGMENTS; ix++) {
      const vx = (ix / DEM_SEGMENTS - 0.5) * DEM_SIZE;
      const vy = getSiteHeight(siteIdx, vx, vz) + 0.4;
      const dx = vx - hab.x;
      const dz = vz - hab.z;
      const dist = Math.hypot(dx, dz);

      let occluded = 0.0;
      if (dist > 3.0) {
        const steps = 10;
        for (let s = 1; s < steps; s++) {
          const t = s / steps;
          const rx = hab.x + dx * t;
          const rz = hab.z + dz * t;
          const rayY = habY + (vy - habY) * t;
          const terrY = getSiteHeight(siteIdx, rx, rz);
          if (terrY > rayY + 0.25) {
            occluded = 1.0;
            break;
          }
        }
      }
      uhfShadowArr[ptr++] = occluded;
    }
  }
  attrUhfShadow.needsUpdate = true;
}

function checkPointUhfLos(px, pz) {
  const siteIdx = state.siteIndex;
  const hab = state.waypoints[0] || { x: -32, z: 28 };
  const habY = getSiteHeight(siteIdx, hab.x, hab.z) + 4.4;
  const py = getSiteHeight(siteIdx, px, pz) + 2.0;
  const dx = px - hab.x;
  const dz = pz - hab.z;
  const steps = 16;
  for (let s = 1; s < steps; s++) {
    const t = s / steps;
    if (getSiteHeight(siteIdx, hab.x + dx * t, hab.z + dz * t) > habY + (py - habY) * t + 0.25) {
      return false;
    }
  }
  return true;
}

window.toggleUhfViewshed = () => {
  if (state.mode === 'orbital') setMode('hybrid');
  state.uhfViewshed = !state.uhfViewshed;
  if (state.uhfViewshed) computeUhfViewshed();
  terrainShaderMat.uniforms.uUhfViewshed.value = state.uhfViewshed ? 1.0 : 0.0;
  const b1 = document.getElementById('uhf-viewshed-btn');
  const b2 = document.getElementById('uhf-dock-btn');
  if (b1) {
    b1.textContent = state.uhfViewshed ? 'UHF Viewshed: On' : 'UHF Viewshed: Off';
    b1.classList.toggle('active-preset', state.uhfViewshed);
  }
  if (b2) b2.classList.toggle('active', state.uhfViewshed);
  showToast(state.uhfViewshed
    ? "UHF Comms Viewshed Active: Crimson hash-marks show radio-occluded zones"
    : "UHF Comms Viewshed Hidden");
};

// D. 24h 39m Martian Sol Daylight & Thermal Scrubber (00:00 - 24:39 MST)
window.setSolTime = (hourVal) => {
  const h = parseFloat(hourVal);
  state.solHour = h;
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  const phase = ((h - 6.0) / 24.65) * Math.PI * 2.0; // Sunrise ~06:00, Noon ~12:15, Sunset ~18:30
  const sunElev = Math.sin(phase);
  const sunAzim = Math.cos(phase);

  const sunVec = new THREE.Vector3(sunAzim * 22.0, Math.max(-4.0, sunElev * 18.0), 10.0).normalize();
  sunLight.position.copy(sunVec).multiplyScalar(22.0);
  terrainShaderMat.uniforms.uSunDir.value.copy(sunVec);
  atmoMat.uniforms.sunDir.value.copy(sunVec);

  // Authentic Martian Blue Twilight / Sunset when sun is near horizon (-0.15 < sunElev < 0.25)
  const twilightFactor = Math.max(0, 1.0 - Math.abs(sunElev - 0.05) / 0.26);
  atmoMat.uniforms.uSunsetBlue.value = twilightFactor;

  const dayFactor = Math.max(0, Math.min(1, (sunElev + 0.2) / 1.15));
  sunLight.intensity = 0.35 + dayFactor * 2.65;
  sunLight.color.setRGB(
    1.0 - twilightFactor * 0.28,
    0.92 - twilightFactor * 0.10,
    0.84 + twilightFactor * 0.16
  );

  const skyR = 0.14 + dayFactor * 0.68 - twilightFactor * 0.32;
  const skyG = 0.12 + dayFactor * 0.42 + twilightFactor * 0.14;
  const skyB = 0.22 + dayFactor * 0.18 + twilightFactor * 0.44;
  terrainShaderMat.uniforms.uSkyTint.value.set(skyR, skyG, skyB);

  const site = SITES[state.siteIndex];
  const tempRange = site.weather.tempC - site.weather.minTempC;
  const liveTemp = Math.round(site.weather.minTempC + Math.pow(Math.max(0, Math.sin((h - 4.0) / 24.65 * Math.PI)), 1.4) * (tempRange + 22));
  const lbl = document.getElementById('sol-time-label');
  if (lbl) {
    lbl.textContent = `SOL ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} MST · ${liveTemp}°C`;
  }
  const wxTemp = document.getElementById('wx-temp');
  if (wxTemp) wxTemp.textContent = `${liveTemp}°C`;
};

// E. CRISM-to-SHERLOC Spectral Reflectance Curve Inspector (1.0 - 2.6 um)
function renderCrismSpectralPlot(siteIdx) {
  const svg = document.getElementById('crism-spectral-svg');
  const titleEl = document.getElementById('spectral-title');
  const bandEl = document.getElementById('spectral-band-tag');
  if (!svg) return;
  const site = SITES[siteIdx];
  if (titleEl) titleEl.textContent = `SIMULATED spectrum · no CRISM observation loaded`;
  if (bandEl) bandEl.textContent = site.mineralName.split('(')[0].trim();

  const dips = [
    [1.40, 1.92, 2.40], // Gale Boxwork: H2O + Mg-Sulfate
    [1.41, 1.91, 2.30], // Jezero Smectite Clays + Carbonate
    [1.94, 2.10, 2.40], // Melas Kieserite ILD
    [1.05, 1.50, 2.00]  // Olympus Basaltic Olivine + Cave Ice
  ][siteIdx] || [1.4, 1.9, 2.3];

  const pts = [];
  for (let i = 0; i <= 64; i++) {
    const wl = 1.0 + (i / 64) * 1.6; // 1.0 to 2.6 um
    let refl = 0.78 - (wl - 1.0) * 0.08;
    dips.forEach((d, idx) => {
      const depth = idx === 1 ? 0.34 : 0.22;
      refl -= depth * Math.exp(-Math.pow((wl - d) / 0.065, 2));
    });
    const x = (i / 64) * 310 + 5;
    const y = 66 - Math.max(0.08, Math.min(0.9, refl)) * 58;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }

  const dipMarkers = dips.map(d => {
    const dx = ((d - 1.0) / 1.6) * 310 + 5;
    return `<line x1="${dx.toFixed(1)}" y1="6" x2="${dx.toFixed(1)}" y2="68" stroke="rgba(251,191,36,0.45)" stroke-dasharray="2,2"/>
            <text x="${(dx + 2).toFixed(1)}" y="14" fill="#FDE68A" font-size="8" font-family="JetBrains Mono">${d.toFixed(2)}µm</text>`;
  }).join('');

  svg.innerHTML = `
    <line x1="5" y1="66" x2="315" y2="66" stroke="rgba(255,255,255,0.12)" />
    ${dipMarkers}
    <polyline fill="none" stroke="#38BDF8" stroke-width="2" points="${pts.join(' ')}" />
  `;
}

// F. One-Click EVA Flight Plan Manifest Export (.JSON / .MD)
window.exportEvaManifest = (fmt) => {
  const site = SITES[state.siteIndex];
  const manifest = {
    mission: "ARES-NAV illustrative EVA scenario",
    provenance: site.provenance,
    warning: "Local terrain, weather, spectra, dose, physiology, route and shelter values are synthetic. Not operational guidance.",
    generatedAt: new Date().toISOString(),
    site: site.name,
    coordinates: site.coords,
    syntheticBaseElevationM: site.baseElevM,
    totalTraverseKm: +state.totalTraverseKm.toFixed(2),
    xemuO2ReservePct: state.o2ReservePct,
    uhfCommsLinked: state.uhfLinked,
    donkiSpaceWeather: donkiLiveInfo,
    targetMinerals: site.mineralName,
    waypoints: state.waypoints.map((w, i) => ({
      index: i,
      name: w.name,
      type: w.type,
      tool: w.tool,
      localMeters: { x: w.x, z: w.z },
      slopeDeg: +getSiteSlopeDeg(state.siteIndex, w.x, w.z).toFixed(1),
      elevM: Math.round(site.baseElevM + getSiteHeight(state.siteIndex, w.x, w.z) * 18)
    }))
  };

  let content = '';
  let mime = 'application/json';
  let ext = 'json';
  if (fmt === 'md') {
    mime = 'text/markdown';
    ext = 'md';
    content = `# ARES-NAV SIMULATED EVA scenario — ${site.name}

All local numeric values and waypoints are synthetic; not operational guidance. Mapping context: ${site.provenance.mappingReference}


` +
      `- **Coordinates:** ${site.coords} (synthetic elevation ${site.baseElevM} m)
` +
      `- **Traverse Distance:** ${manifest.totalTraverseKm} km | **xEMU O₂ Reserve:** ${manifest.xemuO2ReservePct}%
` +
      `- **Target Mineralogy:** ${site.mineralName}
` +
      `- **Space Weather (DONKI):** ${donkiLiveInfo.status} (${donkiLiveInfo.latestTime})

` +
      `## Waypoints
` +
      manifest.waypoints.map(w => `1. **${w.name}** (${w.type}) — Elev ${w.elevM}m, Slope ${w.slopeDeg}°, Tool: ${w.tool}`).join("\\n");
  } else {
    content = JSON.stringify(manifest, null, 2);
  }

  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ares_nav_eva_manifest_site${site.id + 1}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`Exported EVA Flight Plan (.${ext.toUpperCase()})`);
};

// G. Visor Route Scrubber & NASA Data Feed Hot-Swapper
window.scrubEvaRoute = (val) => {
  state.evaProgress = Math.max(0, Math.min(0.999, parseFloat(val)));
  const pctEl = document.getElementById('visor-walk-pct');
  if (pctEl) pctEl.textContent = `${Math.round(state.evaProgress * 100)}%`;
};

window.toggleNasaFeedModal = (open) => {
  const m = document.getElementById('nasa-feed-modal');
  if (!m) return;
  if (open) {
    document.getElementById('feed-url-optical').value = NASA_RESOURCES.optical;
    document.getElementById('feed-url-topo').value = NASA_RESOURCES.topography;
    document.getElementById('feed-url-thermal').value = NASA_RESOURCES.thermal;
    document.getElementById('feed-url-donki').value = NASA_RESOURCES.donkiSep;
    for(const id of ['feed-url-optical','feed-url-topo','feed-url-thermal','feed-url-donki']) document.getElementById(id).readOnly=true;
  }
  m.classList.toggle('open', open);
};

window.applyCustomNasaFeeds = () => { fetchLiveDonkiSpaceWeather(); window.toggleNasaFeedModal(false); showToast('Refreshing official DONKI catalog; sources are locked'); };
window.resetNasaFeeds = () => { window.toggleNasaFeedModal(true); fetchLiveDonkiSpaceWeather(); };
// H. Minimalist Launch Choice -> Particle Globe Coalescing into Actual Martian Globe
// Start in Particle Globe state (marsMat.opacity = 0, uIntroProgress = 0) before user clicks Start
marsMat.opacity = 0.0;
overlayMat.opacity = 0.0;
atmoMat.uniforms.uFade.value = 0.25;
camera.position.set(0, 4.2, 18.5);

window.dismissLaunchOverlay = (withAudio = false) => {
  const ov = document.getElementById('launch-overlay');
  if (!ov || ov.classList.contains('dismissed')) return;
  ov.classList.add('dismissed');

  if (withAudio) {
    void spaceAudio.unlockAudioContext();
    spaceAudio.initAudio();
    spaceAudio.playQuindarTone(true);
    spaceAudio.triggerMorphSound(3, 7);
  } else {
    const lbl = document.getElementById('audio-label');
    if (lbl) lbl.textContent = 'Audio: Off';
  }

  // Trigger the Particle Globe -> Actual Martian Globe smooth translation!
  state.globeIntroMorph.started = true;
  state.globeIntroMorph.active = true;
  state.globeIntroMorph.progress = 0.0;
  animateCameraTo(new THREE.Vector3(0, 3.2, 13.5), new THREE.Vector3(0, 0, 0), 42);
  triggerSparkleBurst(2.1);
};


// Additive adapters keep original scene, rig, route and shader APIs intact.
function initializeExplorationTools() {
  const source=document.getElementById('progressive-source');
  progressiveGlobe=new MarsQuadtreeGlobe({parent:marsMesh,camera,renderer,radius:MARS_RADIUS,onStatus:info=>{
    source.textContent=`NASA imagery · ${info.message}`;
    if(upgrades)upgrades.tileStatus.textContent=`${info.message}\n${info.diagnostics}`;
    source.dataset.zoomLevel=String(info.level);
    source.dataset.sourceLayer=info.sourceLayer;
    source.dataset.blending=String(info.blending);
  }});
  projectionView = createProjectionController({ camera, controls, globe: marsMesh, tiles: progressiveGlobe, onProjection: mode => {upgrades?.measurements.refresh();trekPanel?.refreshProjection();document.getElementById('caption-kicker').textContent=mode==='rectangle'?'NASA IMAGERY · EQUIRECTANGULAR 2:1 · PROJECTED SCALE':'NASA IMAGERY · REFERENCE SPHERE · DERIVED MARKERS';}, isOrbital: () => state.mode === 'orbital', enterOrbital: () => { if (state.mode !== 'orbital' || state.globeIntroMorph.active) window.setMode('orbital'); }, pauseMotion: () => { state.autoSpin=false; state.isCameraTransitioning=false; document.getElementById('spin-btn').classList.remove('active'); } });
  controls.addEventListener('change', () => {
    if (state.mode !== 'orbital') return;
    progressiveGlobe?.invalidate();
    progressiveGlobe?.update(marsMat.opacity);
  });
  const cloneRoute=()=>({siteIndex:state.siteIndex,waypoints:structuredClone(state.waypoints),speed:state.astronautSpeed,progress:state.evaProgress,weather:state.weatherPreset});
  const restoreRoute=saved=>{
    state.survivalRouteActive=false;
    if(!saved||saved.siteIndex!==state.siteIndex)return;
    state.waypoints=structuredClone(saved.waypoints);state.astronautSpeed=saved.speed;state.evaProgress=saved.progress;
    if(saved.weather)window.setWeatherPreset(saved.weather);
    rebuildRouteGeometry();renderWaypointList();updateMissionMetrics();
  };
  const position=()=>astronautRig.root.position;
  const nearestHabitat=()=>{
    const candidates=(survivalSavedRoute?.waypoints||SITES[state.siteIndex].defaultWaypoints).filter(w=>w.type==='BASE'||/HAB|rover/i.test(w.name));
    return candidates.sort((a,b)=>Math.hypot(a.x-position().x,a.z-position().z)-Math.hypot(b.x-position().x,b.z-position().z))[0]||SITES[state.siteIndex].defaultWaypoints[0];
  };
  const routeTo=(target,speed)=>{
    const start=position();
    state.waypoints=[{name:'Simulation start',type:'BASE',x:start.x,z:start.z},{name:target.name||'Synthetic target',type:'SCI',x:target.x,z:target.z}];
    state.selectedWp=1;state.evaProgress=0;state.astronautSpeed=speed;state.survivalRouteActive=true;
    rebuildRouteGeometry();renderWaypointList();updateMissionMetrics();
  };
  const simulationPath=(start,end)=>Array.from({length:33},(_,i)=>{
    const t=i/32,x=start.x+(end.x-start.x)*t,z=start.z+(end.z-start.z)*t;
    return {x:x*24,z:z*24,y:getSiteHeight(state.siteIndex,x,z)*18};
  });
  const api={
    surfaceGroup,routeGroup,
    science:{sample:(x,z)=>({...evaluateSitePoint(state.siteIndex,x,z),height:getSiteHeight(state.siteIndex,x,z),slope:getSiteSlopeDeg(state.siteIndex,x,z)}),size:DEM_SIZE,route:()=>routeSamplePoints.map(p=>({x:p.x,z:p.z})),optimize:()=>runAStarOptimizer(),legacyLayers:LAYERS,setLegacy:(id,active,opacity)=>{const layer=LAYERS.find(l=>l.id===id);if(layer){layer.active=active;if(opacity!==undefined)layer.opacity=opacity;renderLayerRows();updateGlobeOverlayTexture();updateShaderLayerUniforms();}}},
    camera,globe:marsMesh,radius:MARS_RADIUS,globePoint:(lat,lon,r)=>{if(!progressiveGlobe.rectangle)return spherePoint(lat,lon,r);const p=rectanglePoint(lat,lon,MARS_RADIUS);p.z=r-MARS_RADIUS;return p.applyQuaternion(progressiveGlobe.group.quaternion);},canvas:renderer.domElement,controls,tiles:progressiveGlobe,
    getState:()=>state,getSite:()=>SITES[state.siteIndex],
    cancelWaypoint:()=>{if(state.addWpMode)window.toggleAddWaypoint();},
    download:(name,text)=>{const url=URL.createObjectURL(new Blob([text],{type:'application/geo+json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},
    pick:event=>{
      if(state.mode!=='orbital'){showToast('Coordinate capture uses the reference globe; surface terrain is synthetic.');return null;}
      const rect=renderer.domElement.getBoundingClientRect();
      const ndc=new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
      return pickReferenceMap(ndc,camera,marsMesh,progressiveGlobe,MARS_RADIUS);
    },
    getView:()=>({zoom:camera.zoom,projection:projectionView?.mode,site:state.siteIndex,mode:state.mode,layer:progressiveGlobe.layer,camera:camera.position.toArray(),target:controls.target.toArray(),globeRotation:marsMesh.rotation.toArray().slice(0,3),autoSpin:state.autoSpin}),
    restoreView:view=>{
      if(!view||typeof view!=='object')return;
      if(Number.isInteger(view.site)&&view.site>=0&&view.site<SITES.length)window.selectSite(String(view.site));
      if(['orbital','hybrid','particles'].includes(view.mode))window.setMode(view.mode);
      if(['optical','ctx','topography','thermal'].includes(view.layer))progressiveGlobe.setLayer(view.layer);
      if(Array.isArray(view.globeRotation)&&view.globeRotation.length===3&&view.globeRotation.every(Number.isFinite))marsMesh.rotation.set(...view.globeRotation);
      if(['global','rectangle','north','south'].includes(view.projection))projectionView.setMode(view.projection);
      if(typeof view.autoSpin==='boolean'&&view.projection!=='rectangle')state.autoSpin=view.autoSpin;
      const valid=a=>Array.isArray(a)&&a.length===3&&a.every(v=>Number.isFinite(v)&&Math.abs(v)<1000);
      if(valid(view.camera)&&valid(view.target)){camera.position.fromArray(view.camera);controls.target.fromArray(view.target);state.isCameraTransitioning=false;
        if(Number.isFinite(view.zoom)&&camera.isOrthographicCamera)camera.zoom=THREE.MathUtils.clamp(view.zoom,1,32768);camera.updateProjectionMatrix();}
    },
    survival:{
      isOrbital:()=>state.mode==='orbital',
      saveRoute:()=>{survivalSavedRoute=cloneRoute();return survivalSavedRoute;},restoreRoute,
      sample:()=>{const p=position(),slope=getSiteSlopeDeg(state.siteIndex,p.x,p.z);return {position:{x:p.x*24,y:p.y*18,z:p.z*24},o2:state.o2ReservePct,heartRate:Math.min(180,72+state.astronautSpeed*18+slope*.4),coreTemp:36.8+state.astronautSpeed*.15,slope,radiation:SITES[state.siteIndex].nominalRad};},
      pathToHabitat:()=>simulationPath(position(),nearestHabitat()),
      act:(action,{hazard})=>{
        window.setWeatherPreset({nominal:'clear',sep:'storm',dust:'haze',vortex:'vortex'}[hazard]);
        if(action==='CONTINUE_EVA'){restoreRoute(survivalSavedRoute);return;}
        const start=position();
        if(action==='SPRINT_NEAREST_HABITAT'){const habitat=nearestHabitat();routeTo({...habitat,name:'Demo HAB-01 (synthetic)'},1.8);return;}
        // Search nearby procedural terrain. This is not a validated shelter or MOLA analysis.
        let best=null,bestScore=Infinity;
        for(let x=-12;x<=12;x+=3)for(let z=-12;z<=12;z+=3){
          const px=THREE.MathUtils.clamp(start.x+x,-48,48),pz=THREE.MathUtils.clamp(start.z+z,-48,48);
          const slope=getSiteSlopeDeg(state.siteIndex,px,pz);if(slope>12)continue;
          const h=getSiteHeight(state.siteIndex,px,pz);
          const ridge=getSiteHeight(state.siteIndex,Math.max(-50,px-6),pz)-h;
          const score=Math.hypot(x,z)+slope*.7-(action==='SHELTER_BEHIND_RIDGE'?Math.max(0,ridge)*4:0);
          if(score<bestScore){bestScore=score;best={x:px,z:pz,name:action==='LOW_SLOPE_HOLD'?'Low-slope hold (demo)':'Downwind ridge candidate (demo, fixed westerly wind)'};}
        }
        if(best)routeTo(best,action==='LOW_SLOPE_HOLD'?.4:1.0);else{state.astronautSpeed=0;showToast('No gentle terrain candidate found; simulation holding position.');}
      }
    }
  };
  // Search owns all geographic POIs; legacy illustrative beacons remain in the
  // scene graph but are not shown automatically or mistaken for search results.
  for(const b of beaconAnchors)b.anchor.visible=false;
  for(const m of mountainMarkers)m.anchor.visible=false;
  for(const o of marsMesh.children)if(o.isLine||o.geometry===arcPacketGeo)o.visible=false;
  document.body.classList.add('conditional-map-pois');
  for(const sat of satellites){sat.body.parent.visible=false;for(const o of orbitalGroup.children)if(o.geometry===sat.beamGeo)o.visible=false;}
  api.projection=projectionView;api.ensureOrbital=()=>{if(state.mode!=='orbital')window.setMode('orbital');};
  upgrades=createWorkbench(api);
  api.syncLayer=key=>{upgrades.host.querySelector('[data-globe-layer]').value=key;};api.setOrbiters=show=>{const visible=show&&!progressiveGlobe.rectangle;for(const sat of satellites){sat.body.parent.visible=visible;for(const o of orbitalGroup.children)if(o.geometry===sat.beamGeo)o.visible=visible;}};
  api.measurements=upgrades.measurements;api.selectionChanged=record=>{const s=SITES[state.siteIndex];document.getElementById('caption-title').textContent=record?`${record.name} · ${record.lat.toFixed(4)}°, ${record.lon.toFixed(4)}° E`:`${s.shortName} (${s.coords})`;};trekPanel=createTrekSearch(api);
  proximityLabels=createProximityLabels(api,record=>{if(matchMedia('(max-width:768px)').matches)mobileShell?.open('Search');trekPanel.reveal(record);});
  mobileShell=createMobileShell(api,trekPanel);
  geologyLayers=createGeologyLayers(api,trekPanel.host.querySelector('[data-renderer-layers]'));
  scientificLayers=createScientificLayerManager(api,trekPanel.host.querySelector('[data-renderer-layers]'),geologyLayers);

  vehicles=createVehicles({parent:surfaceGroup,getSite:()=>SITES[state.siteIndex],getHeight:getSiteHeight,getMode:()=>state.mode,host:upgrades.host,enterSurface:()=>{if(state.mode==='orbital')window.setMode('hybrid');},focus:(point,offset)=>{surfaceParticles.visible=false;routeGroup.visible=false;placeDemoGroup.visible=false;scrubRing.visible=false;dropPreviewGroup.visible=false;astronautRig.root.visible=false;controls.minDistance=.12;state.autoSpin=false;state.suitDemoActive=false;state.povMode='free';controls.enabled=true;state.isCameraTransitioning=false;controls.target.copy(point);camera.position.copy(point).add(offset);camera.lookAt(point);controls.update();}});

  mobileAR=createMobileAR({renderer,buttonHost:upgrades.arHost,onStatus:message=>{upgrades.arStatus.textContent=message;},onActive:active=>{
    controls.enabled=!active&&state.povMode==='free';
  },makeModel:()=>{
    const model=state.mode==='orbital'?marsMesh.clone(true):surfaceGroup.clone(true);
    model.visible=true;model.position.set(0,0,0);return model;
  }});
}

// Connect controls after all window actions have been registered.
bindControls();

// Initialize UI & Pre-Baked 3D Martian Models
renderLayerRows();
updateGlobeOverlayTexture();
updateShaderLayerUniforms();
buildSiteLandmarkProps(0);
rebuildRouteGeometry();
renderWaypointList();
updateWeatherUI();
document.getElementById('science-brief').innerHTML = SITES[0].brief;
renderCrismSpectralPlot(0);
fetchLiveDonkiSpaceWeather();
initializeExplorationTools();
fieldLab=createJezeroFieldLab({renderer,hostControls:controls,onStatus:showToast,onActive:active=>{state.fieldLabActive=active;},canOpen:()=>!mobileAR?.active});
renderer.setAnimationLoop(animate);

installProvenance(() => SITES[state.siteIndex], () => donkiLiveInfo);
