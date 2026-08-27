/* Deep-space backdrop at the far plane: near-black, a whisper of
   state-tinted nebula, and sparse twinkling micro-activity so the far
   field is never completely empty. Writes depth — it is the
   depth-of-field backdrop. */

varying vec2 vUv;

uniform float uTime;
uniform float uAspect;
uniform vec3 uBgTint;

void main() {
  vec2 q = (vUv - 0.5) * vec2(uAspect, 1.0);
  float r = length(q);

  vec3 base = uBgTint;

  float neb = fbm(vec3(q * 1.6, uTime * 0.008)) * 0.5 + 0.5;
  vec3 nebCol = uPalette[0] * 0.10;
  float radial = exp(-r * 1.3);

  vec3 col = base + nebCol * neb * radial;

  /* distant micro activity — tiny, dim, twinkling */
  vec2 grid = vUv * vec2(uAspect, 1.0) * 110.0;
  vec2 cell = floor(grid);
  float h = hash12(cell);
  vec2 sp = vec2(hash12(cell + 7.1), hash12(cell + 3.7));
  float d = length((grid - (cell + sp)) / 1.0);
  float star = step(0.9975, h) * (1.0 - smoothstep(0.15, 0.8, d));
  float tw = 0.5 + 0.5 * sin(uTime * (0.4 + h * 2.2) + h * 40.0);
  col += uPalette[3] * star * tw * 0.03 * (0.35 + 0.65 * radial);

  gl_FragColor = vec4(col, 1.0);
}
