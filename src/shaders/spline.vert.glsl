/* Neural pathways: hair-thin additive curves with a full life-cycle
   (they surface, exist, dissolve and reconnect elsewhere) and rare
   bright pulses traveling along their length. */

attribute vec4 aMeta; // t, seed, brightness, phase

varying float vB;
varying float vPulse;

uniform float uTime;
uniform float uIntro;
uniform float uEnergy;
uniform float uSpeedMul;
uniform vec4 uPulses[4];

void main() {
  float t = aMeta.x;
  float seed = aMeta.y;
  float bright = aMeta.z;
  float phase = aMeta.w;

  vec3 pos = position;

  /* gentle procedural breathing of the pathway */
  pos += vec3(
    snoise(vec3(seed * 7.0, t * 2.0, uTime * 0.05)),
    snoise(vec3(seed * 9.0, t * 2.0, uTime * 0.045 + 5.0)),
    snoise(vec3(seed * 11.0, t * 2.0, uTime * 0.06 + 9.0))
  ) * 0.09;

  /* life-cycle: surface from darkness, exist, dissolve, reappear later */
  float period = (22.0 + fract(seed * 13.7) * 30.0) / uSpeedMul;
  float cyc = fract((uTime + phase * period) / period);
  float env = smoothstep(0.0, 0.14, cyc) * (1.0 - smoothstep(0.82, 1.0, cyc));
  env *= smoothstep(0.0, 0.09, t) * (1.0 - smoothstep(0.91, 1.0, t));

  /* rare traveling pulse, only on some pathways at a time */
  float gate = step(0.8, hash12(vec2(seed, floor(uTime * 0.11))));
  float pt = fract(uTime * (0.1 + fract(seed * 3.3) * 0.14) * uSpeedMul + phase);
  float pulse = exp(-pow((t - pt) * 10.0, 2.0)) * gate;

  /* click shockwaves excite nearby pathways */
  float wave = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 P = uPulses[i];
    float d = length(pos.xy - P.xy) - P.z * 3.4;
    wave += P.w * exp(-d * d * 24.0) * exp(-P.z * 1.1);
  }

  vB = bright * env * (0.8 + uEnergy * 0.5) * uIntro;
  vPulse = pulse + wave * 1.5;

  gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
}
