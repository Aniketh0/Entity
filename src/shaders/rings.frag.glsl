varying float vB;

uniform float uBrightness;

void main() {
  vec2 q = gl_PointCoord - 0.5;
  float d = length(q);
  float a = 1.0 - smoothstep(0.06, 0.5, d);
  float core = (1.0 - smoothstep(0.0, 0.16, d)) * 0.7;

  float b = vB * uBrightness;
  float glow = a + core;
  if (b * glow < 0.007) discard;

  vec3 col = entityPalette(clamp(0.4 + b * 0.55, 0.0, 1.0));
  gl_FragColor = vec4(col * b * glow, 1.0);
}
