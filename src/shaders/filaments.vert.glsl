/* Thousands of hair-thin radial filaments rendered as GPU line
   segments. Everything — bend, waviness, flicker, life-cycle — is
   computed per-vertex from noise; the CPU uploads nothing. */

attribute vec4 aSeed; // angle/TAU, length, phase, rand
attribute float aT;   // 0..1 along the filament

varying float vB;

uniform float uTime;
uniform float uEnergy;
uniform float uTwitch;
uniform float uTurb;
uniform float uPupilRadius;
uniform float uStateMix;
uniform float uIrisDrift;
uniform vec4 uPulses[4];

void main() {
  float rnd = aSeed.w;
  float t = aT;

  float ang = aSeed.x * 6.2831853;
  ang += 0.16 * snoise(vec3(rnd * 90.0, uTime * uIrisDrift * 0.05, 2.0)); // slow reorganisation
  ang += uTwitch * 0.2 * snoise(vec3(rnd * 50.0, uTime * 24.0, 8.0)); // twitch

  float len = aSeed.y;
  float r = uPupilRadius * 1.06 + len * pow(t, 0.85);

  /* organic bend: tangential displacement growing along the hair */
  float bend = (snoise(vec3(rnd * 33.0, t * 2.3, uTime * uIrisDrift * 0.11)) * 0.55
              + snoise(vec3(rnd * 71.0, t * 5.0, uTime * uIrisDrift * 0.2)) * 0.22) * t;
  ang += bend * 0.38 / max(r, 0.35);

  /* out-of-plane waviness */
  float z = snoise(vec3(rnd * 11.0, t * 3.0, uTime * uIrisDrift * 0.07)) * (0.22 + uTurb * 0.3) * t;

  vec2 dir = vec2(cos(ang), sin(ang));
  vec3 pos = vec3(dir * r, z);

  /* click shockwaves shove filaments outward */
  float wave = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 P = uPulses[i];
    float d = length(pos.xy - P.xy) - P.z * 3.4;
    wave += P.w * exp(-d * d * 45.0) * exp(-P.z * 1.15);
  }
  pos.xy += dir * wave * 0.1;

  /* life-cycle: filaments disappear and reappear */
  float duty = smoothstep(mix(0.12, 0.2, uStateMix), 0.45, 0.5 + 0.5 * sin(uTime * (0.13 + rnd * 0.35) * uIrisDrift + aSeed.z * 6.2831));
  float flick = 0.75 + 0.25 * sin(uTime * (1.0 + rnd * 3.0) * mix(1.0, 1.5, uStateMix) + aSeed.z * 20.0);

  vB = pow(1.0 - t, 1.35) * duty * flick * (0.3 + rnd * 0.7) * (0.9 + uEnergy * 0.7) * (1.0 + wave * 2.0);

  gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
}
