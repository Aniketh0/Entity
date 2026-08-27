/* The vast volumetric information field. Hundreds of thousands of
   particles whose entire motion — orbital drift, radial migration,
   curl-like turbulence, shockwaves, cursor parallax — is evaluated
   per-particle on the GPU from static attributes. */

attribute vec4 aOrbit; // radius, angle0, angularSpeed, inclination
attribute vec4 aSeed;  // rand1, rand2, rand3, population
attribute float aSize;

varying float vB;
varying float vSoft;

uniform float uTime;
uniform float uIntro;
uniform float uTurb;
uniform float uEnergy;
uniform float uSurge;
uniform float uPointScale;
uniform float uPupilRadius;
uniform float uStateMix;
uniform float uSpeedMul;
uniform float uBurst;
uniform vec2 uFieldShift;
uniform vec4 uPulses[4];

void main() {
  float rad = aOrbit.x;
  float typ = aSeed.w;

  float ang = aOrbit.y + uTime * aOrbit.z * uSpeedMul;

  /* slow inward/outward drift on long cycles */
  float r = rad * (1.0 + 0.16 * sin(6.2831 * aSeed.x + uTime * 0.021 * (0.5 + aSeed.y)));

  vec2 ca = vec2(cos(ang), sin(ang));

  vec3 pos;
  if (typ < 0.5) {
    pos = vec3(ca * r, (aSeed.y - 0.5) * (0.5 + rad * 0.34));            // disc
  } else if (typ < 1.5) {
    vec3 sph = normalize(vec3(ca, (aSeed.y - 0.5) * 1.6));               // halo
    pos = sph * r;
  } else if (typ < 2.5) {
    pos = vec3(ca * r, (aSeed.y - 0.5) * rad * 0.8);                     // far shell
  } else {
    pos = vec3(ca * (0.6 + r * 0.42), 3.1 + aSeed.y * 2.6);              // foreground drift
  }

  /* inclination roll */
  float ci = cos(aOrbit.w);
  float si = sin(aOrbit.w);
  pos.yz = mat2(ci, -si, si, ci) * pos.yz;

  /* turbulence: three offset noise reads ≈ cheap curl */
  vec3 tp = pos * 0.16 + vec3(0.0, 0.0, uTime * 0.02);
  vec3 turb = vec3(
    snoise(tp),
    snoise(tp + vec3(31.7, 4.2, 0.0)),
    snoise(tp + vec3(0.0, 91.3, 13.9))
  );
  pos += turb * uTurb * (0.35 + rad * 0.09) * (0.75 + 0.5 * aSeed.z);
  if (typ > 2.5) pos += turb * 0.4;

  /* surge: brief high-energy radial outrush */
  if (uSurge > 0.001) {
    vec2 dir2 = normalize(pos.xy + vec2(0.001, 0.0001));
    pos.xy += dir2 * uSurge * (0.4 + aSeed.z * 1.3);
    pos.z += (aSeed.y - 0.5) * uSurge * 0.5;
  }

  /* click shockwaves */
  float flash = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 P = uPulses[i];
    vec2 dq = pos.xy - P.xy;
    float d = length(dq) - P.z * 3.4;
    float wj = P.w * exp(-d * d * 30.0) * exp(-P.z * 1.1);
    pos.xy += normalize(dq + vec2(0.001, 0.0001)) * wj * 0.22;
    flash += wj;
  }

  /* cursor parallax — nearer layers lean further */
  float depthFac = clamp(1.6 - pos.z * 0.18, 0.25, 1.6);
  pos.xy += uFieldShift * depthFac;

  vec4 mv = viewMatrix * vec4(pos, 1.0);
  float dist = max(-mv.z, 0.2);

  /* brightness: dense+bright near the Entity, dissolving into structured
     darkness outward — never a uniform fog */
  float bias = exp(-rad * 0.42);
  float tw = 0.6 + 0.4 * sin(uTime * (0.5 + aSeed.x * 2.3) + aSeed.y * 6.2831);
  float duty = smoothstep(mix(0.42, 0.55, uStateMix), mix(0.78, 0.90, uStateMix), 0.5 + 0.5 * sin(uTime * (0.05 + 0.09 * aSeed.z) * uSpeedMul + aSeed.x * 6.2831));
  float fog = exp(-max(dist - 8.0, 0.0) * 0.055);

  vB = (0.16 + 0.84 * bias) * tw * duty * fog * 0.5;
  vB *= (0.8 + uEnergy * 0.6) * (1.0 + flash * 2.5);
  /* foreground: large, dim, soft — fake bokeh, and never over the pupil */
  if (typ > 2.5) vB *= 0.35 * smoothstep(uPupilRadius * 1.3, uPupilRadius * 2.8, length(pos.xy));
  vB *= uIntro;

  /* RED STATE: sudden asynchronous brightness spikes */
  vB *= 1.0 + uBurst * step(0.994, fract(aSeed.x * 137.7 + floor(uTime * 2.0) * 0.3137)) * 1.6;
  vSoft = typ > 2.5 ? 1.0 : 0.0;

  float worldSize = aSize * (typ > 2.5 ? 1.0 : (0.85 + 0.3 * bias));
  gl_PointSize = clamp(worldSize * uPointScale / dist, 0.5, 42.0);

  gl_Position = projectionMatrix * mv;
}
