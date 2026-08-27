varying vec2 vUv;
varying float vB;
varying float vType;
varying float vId;

uniform float uTime;
uniform float uBrightness;

void main() {
  vec2 q = vUv;
  float m = 0.0;

  if (vType < 0.5) {
    /* bar with soft ends */
    m = smoothstep(0.0, 0.12, q.x) * (1.0 - smoothstep(0.88, 1.0, q.x))
      * smoothstep(0.0, 0.3, q.y) * (1.0 - smoothstep(0.7, 1.0, q.y));
  } else if (vType < 1.5) {
    /* binary-looking cells, slowly rewriting themselves */
    vec2 cellId = floor(vec2(q.x * 3.0, q.y * 2.0));
    vec2 cf = fract(vec2(q.x * 3.0, q.y * 2.0));
    float on = step(0.45, hash12(cellId + floor(vId * 13.0) + floor(uTime * 0.7 * hash11(vId)) * 0.37));
    m = on * smoothstep(0.02, 0.28, cf.x) * (1.0 - smoothstep(0.72, 0.98, cf.x))
      * smoothstep(0.02, 0.28, cf.y) * (1.0 - smoothstep(0.72, 0.98, cf.y));
  } else if (vType < 2.5) {
    /* hollow square */
    float b = min(min(q.x, 1.0 - q.x), min(q.y, 1.0 - q.y));
    m = 1.0 - smoothstep(0.02, 0.14, b);
  } else {
    /* miniature grid */
    vec2 g = abs(fract(q * 3.0) - 0.5);
    m = (1.0 - smoothstep(0.35, 0.5, max(g.x, g.y))) * 0.7;
  }

  float b = vB * uBrightness;
  if (m * b < 0.007) discard;

  vec3 col = entityPalette(clamp(0.45 + b * 0.4, 0.0, 1.0));
  gl_FragColor = vec4(col * b * m, 1.0);
}
