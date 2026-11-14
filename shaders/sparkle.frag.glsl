varying vec3 vSparkleColor;
varying float vSparkleAlpha;

void main() {
  if (vSparkleAlpha <= 0.01) discard;
  vec2 uv = gl_PointCoord - vec2(0.5);
  float dist = length(uv);
  if (dist > 0.5) discard;

  float core = exp(-dist * dist * 28.0);
  float rays = max(
    exp(-abs(uv.x) * 26.0) * exp(-abs(uv.y) * 4.5),
    exp(-abs(uv.y) * 26.0) * exp(-abs(uv.x) * 4.5)
  );
  float alpha = min(1.0, core + rays * 0.85) * vSparkleAlpha;
  gl_FragColor = vec4(vSparkleColor + vec3(core * 0.45), alpha);
}
