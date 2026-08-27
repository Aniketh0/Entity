varying float vB;

uniform float uBrightness;
uniform float uIntro;

void main() {
  float b = vB * uBrightness * uIntro;
  if (b < 0.005) discard;

  vec3 col = mix(entityPalette(0.42), entityPalette(0.88), clamp(b, 0.0, 1.0));

  gl_FragColor = vec4(col * b * 0.8, 1.0);
}
