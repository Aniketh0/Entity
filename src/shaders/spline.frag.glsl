varying float vB;
varying float vPulse;

uniform float uBrightness;

void main() {
  float b = vB * (0.16 + vPulse * 1.5);
  if (b < 0.005) discard;

  vec3 base = entityPalette(0.5);
  vec3 hot = entityPalette(0.95);
  vec3 col = mix(base, hot, clamp(vPulse, 0.0, 1.0));

  gl_FragColor = vec4(col * b * uBrightness, 1.0);
}
