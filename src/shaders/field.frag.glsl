varying float vB;
varying float vSoft;

uniform float uBrightness;

void main() {
  vec2 q = gl_PointCoord - 0.5;
  float d = length(q);

  float hard = (1.0 - smoothstep(0.06, 0.5, d)) + (1.0 - smoothstep(0.0, 0.16, d)) * 0.7;
  float soft = 1.0 - smoothstep(0.02, 0.5, d);
  float glow = mix(hard, soft * 0.55, vSoft);

  float b = vB * uBrightness;
  if (b * glow < 0.006) discard;

  vec3 col = entityPalette(clamp(0.35 + b * 0.6, 0.0, 1.0));
  gl_FragColor = vec4(col * b * glow, 1.0);
}
