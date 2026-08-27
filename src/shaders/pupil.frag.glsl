/* The pupil: a tiny, almost black, visually stable aperture.
   It must read as a hole punched in the light, not a glowing sphere.
   Tinted by the state palette's darkest stop. */

varying vec2 vUv;

uniform vec3 uPalette[5];

void main() {
  vec2 q = vUv - 0.5;
  float r = length(q) * 2.0;

  float edge = 1.0 - smoothstep(0.9, 1.0, r);
  vec3 inner = uPalette[0] * 0.045;
  vec3 outer = uPalette[0] * 0.30;
  vec3 col = mix(inner, outer, smoothstep(0.5, 1.0, r));

  gl_FragColor = vec4(col, edge);
}
