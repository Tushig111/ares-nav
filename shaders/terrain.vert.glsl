uniform float uMorphProgress;
uniform float uReliefScale;
uniform vec3 uRippleCenter;
uniform float uRippleProgress;

attribute vec4 aStateFrom;
attribute vec4 aStateTo;
attribute float aUhfShadow;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vFeatureMask;
varying float vSlopeDeg;
varying float vScanWave;
varying float vUhfShadow;
varying vec2 vUv;

void main() {
  vUv = uv;
  vUhfShadow = aUhfShadow;
  float m = smoothstep(0.0, 1.0, uMorphProgress);
  float dispersion = sin(m * 3.14159265);

  vec4 st = mix(aStateFrom, aStateTo, m);
  float h = st.x * uReliefScale;

  vec3 n = normalize(vec3(st.y * uReliefScale, 1.0, st.z * uReliefScale));
  vNormal = n;
  vFeatureMask = st.w;

  float cosTheta = clamp(n.y, 0.0, 1.0);
  vSlopeDeg = degrees(acos(cosTheta));

  vec3 pos = vec3(position.x, h, position.z);
  float radialDist = length(pos.xz);
  float scanRadius = m * 85.0;

  float rippleEnv = sin(uRippleProgress * 3.14159265);
  float distToPin = length(pos.xz - uRippleCenter.xz);
  float pinWaveRadius = uRippleProgress * 68.0;
  float pinRing = smoothstep(7.5, 0.0, abs(distToPin - pinWaveRadius)) * rippleEnv;

  vScanWave = max(
    smoothstep(5.5, 0.0, abs(radialDist - scanRadius)) * dispersion,
    pinRing
  );

  vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
  vWorldPos = worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
