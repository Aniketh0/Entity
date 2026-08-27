/* Data fragments: thousands of instanced billboarded micro-glyphs —
   tiny bars, binary blocks, hollow squares, miniature grids. Too small
   to read; pure visual information drifting through the field. */

attribute vec3 aPos;
attribute vec4 aInfo; // type, size, phase, rand
attribute float aId;

varying vec2 vUv;
varying float vB;
varying float vType;
varying float vId;

uniform float uTime;
uniform float uIntro;
uniform float uEnergy;
uniform float uSurge;
uniform float uPupilRadius;
uniform float uStateMix;
uniform float uSpeedMul;
uniform float uIrisDrift;
uniform float uBurst;
uniform float uGlitch;

mat2 rot2(float x) {
  float c = cos(x);
  float s = sin(x);
  return mat2(c, -s, s, c);
}

void main() {
  vec3 base = aPos;

  /* slow orbital drift around the Entity + gentle wander */
  base.xy = rot2(uTime * 0.012 * uSpeedMul * (aInfo.z - 0.5)) * base.xy;
  base += vec3(
    snoise(vec3(aId * 0.13, uTime * uIrisDrift * 0.03, 2.0)),
    snoise(vec3(aId * 0.17, uTime * uIrisDrift * 0.026, 7.0)),
    snoise(vec3(aId * 0.11, uTime * uIrisDrift * 0.02, 13.0))
  ) * 0.24;

    base.xy += normalize(base.xy + vec2(0.001, 0.0001)) * uSurge * (0.3 + aInfo.w);

  /* RED STATE: corrupted fragments glitch and reposition */
  base.x += uGlitch * step(0.965, fract(aId * 0.3191 + floor(uTime * 9.0) * 0.771)) * 0.22;

  float flick = 0.6 + 0.4 * sin(uTime * (0.8 + aInfo.w * 3.0) * mix(1.0, 1.55, uStateMix) + aId);
  float boost = 1.0 + step(0.93, fract(aId * 0.7168)) * 0.8;

  /* the pupil is a hole punched in the information — nothing floats over it */
  float pupilClear = smoothstep(uPupilRadius * 1.1, uPupilRadius * 2.4, length(base.xy));

  vType = aInfo.x;
  vId = aId;
  vB = flick * boost * (0.75 + uEnergy * 0.6) * uIntro * 0.85 * pupilClear;

  /* RED STATE: isolated fragments flash as the system overloads */
  vB *= 1.0 + uBurst * step(0.995, fract(aId * 0.611 + floor(uTime * 3.0) * 0.237)) * 1.5;

  vec4 mv = viewMatrix * vec4(base, 1.0);
  float dist = max(-mv.z, 0.2);

  float sw;
  float sh;
  if (aInfo.x < 0.5) {
    sw = aInfo.y * 3.2;  sh = aInfo.y * 0.8;   // horizontal bar
  } else if (aInfo.x < 1.5) {
    sw = aInfo.y;        sh = aInfo.y * 1.4;   // binary block
  } else if (aInfo.x < 2.5) {
    sw = aInfo.y;        sh = aInfo.y;         // hollow square
  } else {
    sw = aInfo.y * 1.8;  sh = aInfo.y * 1.2;   // micro grid
  }

  vec2 q = position.xy * rot2((aInfo.w - 0.5) * 0.8);
  mv.xy += q * vec2(sw, sh);

  vB *= exp(-max(dist - 8.0, 0.0) * 0.05);
  vUv = position.xy + 0.5;

  gl_Position = projectionMatrix * mv;
}
