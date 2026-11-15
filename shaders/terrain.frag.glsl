uniform sampler2D uSiteTexFrom;
uniform sampler2D uSiteTexTo;
uniform float uMorphProgress;
uniform float uOpacity;
uniform vec3 uSunDir;
uniform vec4 uLayerWeights;
uniform float uLayerRad;
uniform float uStormFactor;
uniform float uDustHaze;
uniform float uUhfViewshed;
uniform vec3 uSkyTint;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vFeatureMask;
varying float vSlopeDeg;
varying float vScanWave;
varying float vUhfShadow;
varying vec2 vUv;
varying float vReal;
uniform sampler2D uMwHazard;
uniform float uMwHazardOn;
uniform sampler2D uMwLocal;
uniform vec4 uMwLocalRect;
uniform float uMwLocalOn;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise2D(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

void main() {
  float m = smoothstep(0.0, 1.0, uMorphProgress);

  vec3 texFrom = texture2D(uSiteTexFrom, vUv).rgb;
  vec3 texTo   = texture2D(uSiteTexTo, vUv).rgb;
  vec3 baseAlbedo = mix(texFrom, texTo, m);

  float strata = sin(vWorldPos.y * 4.2 + noise2D(vWorldPos.xz * 0.22) * 2.6) * 0.5 + 0.5;
  float fineGrain = noise2D(vWorldPos.xz * 4.8) * 0.10 - 0.05;
  float microGrain = noise2D(vWorldPos.xz * 1.8) * 0.14 - 0.07 + fineGrain;
  float ripple = sin(vWorldPos.x * 2.8 + vWorldPos.z * 2.1 + noise2D(vWorldPos.xz * 0.6) * 3.2) * 0.045;

  vec3 N = normalize(vNormal + vec3(microGrain * 0.35, 0.0, ripple * 0.45) * (1.0 - vReal));
  float diff = clamp(dot(N, uSunDir), 0.0, 1.0);
  float hemi = N.y * 0.5 + 0.5;

  // real orbital imagery is shown as it is: no procedural strata or grain painted over it
  vec3 rockColor = baseAlbedo * mix(0.86 + strata * 0.22 + microGrain, 1.12, vReal);
  vec3 col = mix(vec3(0.16, 0.18, 0.23), rockColor, uLayerWeights.x);

  if (uLayerWeights.y > 0.01) {
    float w = uLayerWeights.y * 0.55;
    vec3 slopeCol = vec3(0.20, 0.83, 0.60);
    if (vSlopeDeg > 20.0) {
      slopeCol = vec3(0.97, 0.24, 0.24);
    } else if (vSlopeDeg >= 15.0) {
      slopeCol = vec3(0.98, 0.75, 0.15);
    }
    col = mix(col, slopeCol, w * (vSlopeDeg > 15.0 ? 0.72 : 0.25));

    float contourPhase = abs(fract(vWorldPos.y * 0.62) - 0.5);
    float contourLine = smoothstep(0.035, 0.008, contourPhase);
    col += vec3(0.98, 0.82, 0.38) * contourLine * uLayerWeights.y * 0.42;
  }

  if (uLayerWeights.z > 0.01) {
    float mineralIntensity = smoothstep(0.32, 0.85, vFeatureMask) * uLayerWeights.z;
    vec3 crismCol = mix(vec3(0.14, 0.82, 0.98), vec3(0.98, 0.78, 0.22), smoothstep(0.65, 0.95, vFeatureMask));
    col = mix(col, crismCol, mineralIntensity * 0.78);
  }

  if (uLayerWeights.w > 0.01) {
    float tiNorm = clamp((vSlopeDeg / 26.0) * 0.65 + vFeatureMask * 0.35, 0.0, 1.0);
    vec3 thermCol = mix(vec3(0.18, 0.14, 0.76), vec3(0.96, 0.36, 0.52), tiNorm);
    col = mix(col, thermCol, uLayerWeights.w * 0.58);
  }

  if (uLayerRad > 0.01) {
    float isSheltered = smoothstep(-1.2, -4.2, vWorldPos.y);
    vec3 exposedCol = mix(vec3(0.58, 0.24, 0.92), vec3(0.98, 0.22, 0.38), uStormFactor);
    vec3 shelterCol = vec3(0.12, 0.94, 0.72);
    vec3 radCol = mix(exposedCol, shelterCol, isSheltered);
    col = mix(col, radCol, uLayerRad * 0.54);
  }

  if (uUhfViewshed > 0.5 && vUhfShadow > 0.25) {
    float hashLine = step(0.55, fract((vWorldPos.x + vWorldPos.z) * 0.85));
    vec3 uhfCrimson = vec3(0.95, 0.22, 0.28);
    col = mix(col, uhfCrimson, (0.28 + hashLine * 0.34) * vUhfShadow);
  }

  if (uMwHazardOn > 0.5) {   // MARSWALK red zones (200 m grid), only on the real Jezero terrain
    vec4 hzc = texture2D(uMwHazard, vUv);
    col = mix(col, hzc.rgb, hzc.a * 0.85 * vReal);
  }
  vec3 ambient = mix(vec3(0.07, 0.06, 0.11), uSkyTint * 0.55, hemi);
  vec3 litColor = col * (ambient + vec3(1.08, 0.96, 0.86) * diff * 0.92);
  if (vReal > 0.001) {
    // Real Jezero: same look as the stand-alone MARSWALK site. CTX image x relief, HiRISE detail near the landing site,
    // plain sun shading, display (sRGB) encoding, and no procedural tints.
    vec3 rb = baseAlbedo;
    vec2 lu = (vUv - uMwLocalRect.xy) / (uMwLocalRect.zw - uMwLocalRect.xy);
    float edge = min(min(lu.x, 1.0 - lu.x), min(lu.y, 1.0 - lu.y));
    rb = mix(rb, texture2D(uMwLocal, clamp(lu, 0.0, 1.0)).rgb, smoothstep(0.0, 0.05, edge) * uMwLocalOn);
    if (uMwHazardOn > 0.5) { vec4 hz2 = texture2D(uMwHazard, vUv); rb = mix(rb, hz2.rgb, hz2.a * 0.8); }
    if (uUhfViewshed > 0.5 && vUhfShadow > 0.25) rb = mix(rb, vec3(0.95, 0.22, 0.28), 0.35 * vUhfShadow);
    float lamR = clamp(dot(normalize(vNormal), uSunDir), 0.0, 1.0);
    float dayR = max(smoothstep(-0.1, 0.22, uSunDir.y), 0.10);
    vec3 rl = rb * (vec3(0.17, 0.15, 0.15) + vec3(1.0, 0.95, 0.88) * (0.35 + 1.05 * lamR) * dayR);
    rl = pow(clamp(rl, 0.0, 1.0), vec3(1.0 / 2.2));
    litColor = mix(litColor, rl, vReal);
  }
  litColor += vec3(0.22, 0.76, 0.98) * vScanWave * 0.85;

  float distCam = length(cameraPosition - vWorldPos);
  float fogStart = mix(65.0, 28.0, uDustHaze);
  float fogEnd   = mix(165.0, 95.0, uDustHaze);
  float fogFactor = smoothstep(fogStart, fogEnd, distCam);
  vec3 fogColor = mix(uSkyTint * 0.14, vec3(0.56, 0.28, 0.16), uDustHaze);
  litColor = mix(litColor, fogColor, fogFactor * (0.75 + uDustHaze * 0.20));

  gl_FragColor = vec4(litColor, uOpacity);
}
