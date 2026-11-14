uniform float uOpacityScale;
varying vec3 vColor;
varying float vScanWave;
varying float vAlpha;
varying float vSparkle;

void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float dist = length(uv);
  if (dist > 0.5) discard;
  float core = smoothstep(0.5, 0.06, dist);
  float crossFlare = max(
    exp(-abs(uv.x) * 22.0) * exp(-abs(uv.y) * 5.0),
    exp(-abs(uv.y) * 22.0) * exp(-abs(uv.x) * 5.0)
  ) * vSparkle * 0.65;
  float alpha = min(1.0, core + crossFlare);
  gl_FragColor = vec4(vColor + vec3(crossFlare * 0.4), alpha * (0.88 + vScanWave * 0.12) * uOpacityScale * vAlpha);
}
