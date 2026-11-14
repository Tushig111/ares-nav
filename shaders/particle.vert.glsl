uniform float uTime;
uniform float uMorphProgress;
uniform float uPointSize;
uniform float uReliefScale;
uniform vec4 uLayerWeights;
uniform float uLayerRad;
uniform float uStormFactor;
uniform vec4 uChladniParams;   // x: nFrom, y: mFrom, z: nTo, w: mTo
uniform vec3 uRippleCenter;    // Localized Chladni ripple origin on waypoint click
uniform float uRippleProgress; // 0.0 -> 1.0 localized cymatic pulse

attribute vec3 aPosFrom;
attribute vec3 aPosTo;
attribute vec3 aColFrom;
attribute vec3 aColTo;
attribute float aRandom;

varying vec3 vColor;
varying float vScanWave;
varying float vAlpha;
varying float vSparkle;

void main() {
  // Critically-damped quintic S-curve + individual particle phase offset
  float indivPhase = (aRandom - 0.5) * 0.14;
  float rawM = clamp((uMorphProgress - indivPhase * (1.0 - uMorphProgress)) / (1.0 - indivPhase * 0.5), 0.0, 1.0);
  float m = rawM * rawM * rawM * (rawM * (rawM * 6.0 - 15.0) + 10.0);
  float dispersion = sin(m * 3.14159265);

  vec3 fromP = vec3(aPosFrom.x, aPosFrom.y * uReliefScale, aPosFrom.z);
  vec3 toP   = vec3(aPosTo.x,   aPosTo.y   * uReliefScale, aPosTo.z);
  vec3 basePos = mix(fromP, toP, m);

  // Interpolate site-specific Chladni harmonic mode numbers (n, m)
  float nFreq = mix(uChladniParams.x, uChladniParams.z, m);
  float mFreq = mix(uChladniParams.y, uChladniParams.w, m);
  float aCoeff = 1.0;
  float bCoeff = cos(uTime * 0.65 + aRandom * 1.57) >= 0.0 ? 1.0 : -1.0;

  // Normalized plate coordinates [-1.0, 1.0]
  vec2 pNorm = basePos.xz / 48.0;
  float pi = 3.14159265;

  // 2D/3D Chladni Nodal Standing-Wave Equation C(x, z)
  float sinNX = sin(pi * nFreq * pNorm.x);
  float cosNX = cos(pi * nFreq * pNorm.x);
  float sinMZ = sin(pi * mFreq * pNorm.y);
  float cosMZ = cos(pi * mFreq * pNorm.y);

  float sinMX = sin(pi * mFreq * pNorm.x);
  float cosMX = cos(pi * mFreq * pNorm.x);
  float sinNZ = sin(pi * nFreq * pNorm.y);
  float cosNZ = cos(pi * nFreq * pNorm.y);

  float C = aCoeff * sinNX * sinMZ + bCoeff * sinMX * sinNZ;

  // Spatial gradient dC/dx, dC/dz drives particles autonomously toward Chladni nodal lines (C = 0)
  float dCdx = aCoeff * pi * nFreq * cosNX * sinMZ + bCoeff * pi * mFreq * cosMX * sinNZ;
  float dCdz = aCoeff * pi * mFreq * sinNX * cosMZ + bCoeff * pi * nFreq * sinMX * cosNZ;
  vec2 gradC = vec2(dCdx, dCdz);
  vec2 nodalSeek = -C * gradC / (dot(gradC, gradC) + 1.25);

  // Individual angular momentum & acoustic vibration at antinodes
  float ang = aRandom * 6.2831853 + uTime * (2.2 + fract(aRandom * 11.3) * 1.8);
  vec2 orbitalSpin = vec2(cos(ang), sin(ang)) * abs(C) * 1.65;
  float verticalAcoustic = (abs(C) * 4.8 + sin(ang * 2.0) * 1.35) * dispersion;

  // Localized Chladni ripple when clicking a pinned waypoint or pulsing resonance
  float rippleEnv = sin(uRippleProgress * pi);
  float distToPin = length(basePos.xz - uRippleCenter.xz);
  float pinWaveRadius = uRippleProgress * 68.0;
  float pinRing = smoothstep(9.0, 0.0, abs(distToPin - pinWaveRadius)) * rippleEnv;

  vec2 cymaticXZ = (nodalSeek * 11.5 + orbitalSpin) * (dispersion + pinRing * 0.45);
  vec3 finalPos = basePos + vec3(cymaticXZ.x, verticalAcoustic + pinRing * (1.8 + C * 1.2), cymaticXZ.y);

  float radialDist = length(finalPos.xz);
  float scanRadius = m * 85.0;
  vScanWave = max(
    smoothstep(6.5, 0.0, abs(radialDist - scanRadius)) * dispersion,
    pinRing
  );

  // Nodal line luminescence (particles on Chladni nodal lines C ≈ 0 glow bright cyan/gold)
  float nodalLineGlow = exp(-abs(C) * 4.2) * (dispersion + pinRing * 0.8);
  float twinkle = pow(0.5 + 0.5 * sin(uTime * 20.0 + aRandom * 85.0), 4.0);
  vSparkle = clamp(twinkle * (dispersion * 0.9 + pinRing * 0.8 + 0.1) + nodalLineGlow * 0.65, 0.0, 1.5);

  vec3 baseCol = mix(aColFrom, aColTo, m);
  vec3 specGlow = vec3(0.18, 0.82, 0.98) * uLayerWeights.z * 0.35;
  vec3 radGlow  = vec3(0.68, 0.32, 0.96) * uLayerRad * (0.25 + uStormFactor * 0.35);
  vec3 chladniTint = mix(vec3(0.24, 0.86, 1.0), vec3(1.0, 0.84, 0.44), nodalLineGlow);
  vColor = baseCol + specGlow + radGlow + vec3(0.22, 0.74, 0.98) * vScanWave * 0.85 + chladniTint * vSparkle * 0.78;

  vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
  float depthDist = max(3.2, -mvPosition.z);
  gl_PointSize = clamp(uPointSize * (1.0 + vScanWave * 0.7 + vSparkle * 0.55) * (175.0 / depthDist), 1.2, 6.8);
  vAlpha = smoothstep(175.0, 16.0, depthDist);
  gl_Position = projectionMatrix * mvPosition;
}
