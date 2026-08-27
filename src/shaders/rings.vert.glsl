/* Concentric particle rings. One draw call; every ring's personality
   (radius, speed, brightness, gaps, thickness, wobble) lives in
   per-particle attributes. Never clean circles — always broken. */

attribute vec4 aRing; // radius, angularSpeed, brightness, phase
attribute vec4 aSeed; // angle0, thicknessRand, randB, randC

varying float vB;

uniform float uTime;
uniform float uEnergy;
uniform float uRingDistort;
uniform float uIrisRadius;
uniform float uPointScale;
uniform float uIntro;
uniform float uStateMix;
uniform float uSpeedMul;
uniform float uBurst;
uniform vec2 uFieldShift;
uniform vec4 uPulses[4];

void main() {
  float radius = aRing.x * uIrisRadius;
  float speed = aRing.y;
  float bright = aRing.z;
  float phase = aRing.w;

  float ang = aSeed.x + uTime * speed * uSpeedMul * (1.0 + (aSeed.z - 0.5) * 0.04);

  vec2 ca = vec2(cos(ang), sin(ang));

  /* irregular gaps: two noise scales, unique per ring */
  float gapN = snoise(vec3(ca * (1.4 + aSeed.w * 2.2), phase * 13.7));
  float gap2 = snoise(vec3(ca * 4.5, phase * 31.0 + 7.0)) * 0.4;
  float recali = uRingDistort * 0.65 * (0.6 + 0.4 * sin(uTime * 1.3 + phase * 6.0));
  float gap = smoothstep(-0.42, 0.28, gapN + gap2 - recali);

  /* local radial deformation */
  float wob = 1.0 + snoise(vec3(ca * 2.2, uTime * 0.32 * uSpeedMul + phase * 9.0)) * (0.008 + uRingDistort * 0.11);
  float r = radius * wob + (aSeed.y - 0.5) * radius * 0.1;

  /* depth spread */
  float z = (fract(aSeed.z * 7.31) - 0.5) * (0.05 + radius * 0.055);

  vec3 pos = vec3(ca * r, z);

  /* click shockwaves: radial shove + flash */
  float flash = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 P = uPulses[i];
    float d = length(pos.xy - P.xy) - P.z * 3.4;
    float wj = P.w * exp(-d * d * 40.0) * exp(-P.z * 1.15);
    pos.xy += normalize(pos.xy + vec2(0.0001)) * wj * 0.14;
    flash += wj;
  }

  pos.xy += uFieldShift * (0.25 + radius * 0.06);

  vec4 mv = viewMatrix * vec4(pos, 1.0);
  float dist = max(-mv.z, 0.1);

  float tw = 0.55 + 0.45 * sin(uTime * (0.7 + aSeed.y * 2.2) * mix(1.0, 1.6, uStateMix) + aSeed.w * 6.2831);

  vB = bright * gap * tw * (0.85 + uEnergy * 0.5) * (1.0 + flash * 3.0) * uIntro;

  /* RED STATE: broken rings flare into activity */
  vB *= 1.0 + uBurst * step(0.993, fract(aSeed.w * 91.7 + floor(uTime * 2.5) * 0.217)) * 1.7;

  float worldSize = 0.0045 + aSeed.y * 0.011 + bright * 0.006;
  worldSize *= 1.0 + flash * 1.2;
  gl_PointSize = clamp(worldSize * uPointScale / dist, 0.6, 11.0);

  gl_Position = projectionMatrix * mv;
}
