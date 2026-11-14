uniform float uTime;
uniform float uBurstIntensity;
uniform float uWeatherVortex;
uniform float uOrbitalScale;
uniform vec4 uChladniParams;

attribute vec3 aBaseOrbit;
attribute float aSeed;

varying vec3 vSparkleColor;
varying float vSparkleAlpha;

void main() {
  float activeStrength = max(uBurstIntensity, uWeatherVortex);
  float angle = aBaseOrbit.z + uTime * (0.55 + fract(aSeed * 3.7) * 0.85 + uBurstIntensity * 2.2);
  float rad = aBaseOrbit.x * uOrbitalScale * (0.42 + 0.58 * sin(uTime * 0.7 + aSeed * 12.0) + uBurstIntensity * 0.35);

  float rawX = cos(angle) * rad;
  float rawZ = sin(angle) * rad;

  // Modulate 3D sparkle cloud by active Chladni standing wave C(x, z)
  float pi = 3.14159265;
  float nF = uChladniParams.z;
  float mF = uChladniParams.w;
  vec2 pn = vec2(rawX, rawZ) / (42.0 * max(0.22, uOrbitalScale));
  float C = sin(pi * nF * pn.x) * sin(pi * mF * pn.y) + sin(pi * mF * pn.x) * sin(pi * nF * pn.y);

  float spiralY = (aBaseOrbit.y + C * 3.8 + sin(uTime * 1.8 + aSeed * 25.0) * 3.2) * uOrbitalScale;
  vec3 pos = vec3(
    rawX + cos(pi * mF * pn.y) * uBurstIntensity * 2.6 * uOrbitalScale,
    spiralY,
    rawZ + sin(pi * nF * pn.x) * uBurstIntensity * 2.6 * uOrbitalScale
  );

  float twinkle = pow(0.5 + 0.5 * sin(uTime * 16.0 + aSeed * 95.0), 3.0);
  float nodalBoost = exp(-abs(C) * 2.5);
  vSparkleAlpha = activeStrength * (0.30 + 0.70 * max(twinkle, nodalBoost * 0.8));

  vec3 goldSpark = vec3(1.0, 0.78, 0.42);
  vec3 cyanSpark = vec3(0.28, 0.88, 1.0);
  vec3 whiteSpark = vec3(1.0, 0.98, 1.0);
  vec3 baseC = mix(goldSpark, cyanSpark, nodalBoost);
  vSparkleColor = mix(baseC, whiteSpark, twinkle * 0.65);

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  float depthDist = max(2.5, -mvPosition.z);
  gl_PointSize = clamp((3.2 + twinkle * 3.8 + uBurstIntensity * 2.5) * (95.0 / depthDist), 1.0, 11.0);
  gl_Position = projectionMatrix * mvPosition;
}
