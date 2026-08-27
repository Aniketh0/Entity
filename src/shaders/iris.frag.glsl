/* ------------------------------------------------------------------ */
/*  THE IRIS — an artificial retina constructed from information.      */
/*  Purely procedural: polar coordinates, domain-warped angular        */
/*  noise, ridged multi-frequency filaments, collarette flutter,       */
/*  breathing, twitches, shockwaves. Never rotates.                    */
/* ------------------------------------------------------------------ */

varying vec2 vP;

uniform float uTime;
uniform float uIntro;
uniform float uBrightness;
uniform float uNoiseStrength;
uniform float uEnergy;
uniform float uContraction;
uniform float uGlitch;
uniform float uTwitch;
uniform float uAttention;
uniform float uSurge;
uniform float uPupilRadius;
uniform float uIrisRadius;
uniform float uStateMix;
uniform float uIrisDrift;
uniform float uBurst;
uniform vec4 uPulses[4];

float pulseWave(vec2 q) {
  float w = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 P = uPulses[i];
    float d = length(q - P.xy) - P.z * 3.4;
    w += P.w * exp(-d * d * 55.0) * exp(-P.z * 1.15);
  }
  return w;
}

/* One population of radial filaments.
   freq      : angular frequency (how many streaks around the circle)
   radFreq   : radial frequency (how tight the comb is)
   drift     : slow outward/inward flow of the pattern
   sharp     : ridge exponent -> thinner or fatter filaments
   endSeed   : seed for the per-angle length variation */
float streakBand(vec2 nca, float r, float pupilR, float irisR,
                 float freq, float radFreq, float drift, float sharp, float endSeed) {
  float endN = 0.5 + 0.5 * snoise(vec3(nca * 2.6, endSeed));
  float endR = mix(pupilR * 1.06, irisR * 1.05, 0.2 + 0.85 * endN);

  float f1 = snoise(vec3(nca * freq, r * radFreq - uTime * drift));
  float f2 = snoise(vec3(nca * freq * 2.33 + 7.31, r * radFreq * 2.7 + uTime * drift * 0.6));
  float f = f1 * 0.72 + f2 * 0.28;
  float ridge = pow(max(1.0 - abs(f), 0.0), sharp);

  float band = smoothstep(pupilR, pupilR * 1.22, r) * (1.0 - smoothstep(pupilR * 1.15, endR, r));
  return ridge * band;
}

void main() {
  vec2 p = vP;
  float r0 = length(p);
  if (r0 > 2.54) discard;

  /* ERROR state: brief horizontal band displacement */
  if (uGlitch > 0.004) {
    float gs = floor(uTime * 24.0);
    float gy = floor(p.y * 16.0);
    float gsel = step(0.93, hash12(vec2(gy, gs)));
    p.x += gsel * (hash12(vec2(gy * 3.1, gs + 4.0)) - 0.5) * 0.55 * min(uGlitch, 1.5);
  }

  float r = length(p);
  float a = atan(p.y, p.x);
  float m = uStateMix;
  float it = uTime * uIrisDrift; /* filament time — faster when overloaded */

  /* breathing: the iris slowly inhales and exhales */
  float breathe = 0.045 * sin(uTime * 0.31)
                + 0.028 * sin(uTime * 0.117 + 2.1)
                + 0.011 * sin(uTime * 0.63 + 0.7);
  float pupilR = uPupilRadius * (1.0 + 0.55 * breathe - 0.20 * uContraction + 0.085 * uAttention);
  float irisR  = uIrisRadius * (1.0 + 0.80 * breathe - 0.045 * uContraction);
  pupilR = max(pupilR, 0.02);
  irisR = max(irisR, 0.05);

  /* angular domain warp — controlled asymmetry, never a turbine */
  vec2 ca = vec2(cos(a), sin(a));
  float warp = 0.40 * snoise(vec3(ca * 1.7, it * 0.041));
  warp += 0.16 * snoise(vec3(ca * 4.1, r * 1.8 - it * 0.07));
  warp *= uNoiseStrength;
  float na = a + warp * (0.3 + 0.7 * smoothstep(pupilR, irisR, r));

  /* rare, fast, localized micro-twitch */
  na += uTwitch * (0.13 + 0.07 * m) * snoise(vec3(a * 2.4, uTime * 34.0, 5.2));

  vec2 nca = vec2(cos(na), sin(na));

  /* click shockwaves shove the tissue */
  float wave = pulseWave(p);
  r += wave * 0.055;

  float I = 0.0;
  float rn = clamp(r / irisR, 0.0, 2.5);
  float inIris = 1.0 - smoothstep(irisR * 0.88, irisR * 1.04, r);

  /* four filament populations: long spokes, mid, fine collarette, micro */
  I += (1.75 + 0.30 * m) * streakBand(nca, r, pupilR, irisR, 12.0, 2.2, 0.05, mix(5.5, 6.6, m), 3.0);
  I += (0.95 + 0.15 * m) * streakBand(nca, r, pupilR, irisR, 21.0, 3.4, 0.08, mix(6.5, 7.8, m), 17.0);
  I += (1.05 + 0.20 * m) * streakBand(nca, r, pupilR, irisR, 43.0, 5.2, 0.13, mix(7.5, 9.0, m), 29.0);

  float micro = snoise(vec3(nca * 64.0, r * 7.5 - it * 0.22));
  I += pow(max(micro, 0.0), 3.0) * inIris * (0.26 + 0.08 * m);

  /* RED STATE: branching electrical structures flickering across the iris */
  float elecN = snoise(vec3(nca * 9.0, r * 3.0 - it * 1.1 + 4.7));
  float elec = pow(max(1.0 - abs(elecN), 0.0), 11.0) * inIris;
  I += elec * m * (0.5 + 0.5 * snoise(vec3(nca * 3.0, it * 2.2 + 8.8))) * 0.6;

  /* sparse filaments reaching beyond the iris into the field */
  float outerField = smoothstep(irisR * 0.9, irisR * 1.4, r) * (1.0 - smoothstep(irisR * 1.25, 2.6, r));
  float of = snoise(vec3(nca * 15.0, r * 1.7 - it * 0.035));
  I += pow(max(1.0 - abs(of), 0.0), 9.0) * outerField * 0.24;

  /* collarette — brighter fluttering ring just outside the pupil */
  float colR = pupilR + (irisR - pupilR) * 0.18;
  float coll = exp(-pow((r - colR) / (irisR * 0.045), 2.0));
  coll *= 0.5 + 0.5 * snoise(vec3(nca * 7.0, it * 0.33 + 11.0));
  I += coll * (0.40 + 0.08 * m);

  /* RED STATE: angular micro-bursts — localized energy flashes */
  float bcell = floor((na + 3.14159265) * 7.639437);
  float bseed = hash12(vec2(bcell, floor(it * 6.0)));
  float bflash = step(0.945, bseed) * m;
  bflash *= exp(-pow((r - pupilR - (irisR - pupilR) * 0.45) / (irisR * 0.5), 2.0));
  I += bflash * (0.35 + uBurst * 0.45) * (0.5 + 0.5 * hash12(vec2(bcell, floor(it * 6.0) + 1.0)));

  /* the limbal rim: intensely bright boundary of the pupil */
  float rim = exp(-pow((r - pupilR * 1.05) / (uPupilRadius * 0.55), 2.0));
  rim *= smoothstep(pupilR * 0.55, pupilR * 0.95, r); /* never glow inward onto the pupil */
  float rimFlick = 0.75 + 0.30 * snoise(vec3(nca * 5.0, uTime * 0.7 + 23.0)) + 0.12 * uAttention;
  I += rim * (0.95 + 0.28 * m) * rimFlick;

  /* the pupil itself stays absolutely black and stable */
  I *= smoothstep(pupilR * 0.90, pupilR * 1.005, r);

  /* radial falloff — brightest near the pupil, dissolving outward */
  float fall = pow(clamp(1.0 - rn * 0.9, 0.0, 1.0), 1.4);
  fall = max(fall, exp(-(r - pupilR) * 3.2 / irisR));
  I *= mix(0.32, 1.0, fall);

  /* angular brightness asymmetry — the eye is never evenly lit */
  I *= 0.66 + 0.55 * (0.5 + 0.5 * snoise(vec3(nca * 1.9, it * 0.026 + 41.0)));

  /* states, shockwaves, global exposure */
  I *= (1.0 + 0.42 * uEnergy) * (1.0 + 0.10 * m);
  I *= 1.0 + wave * 2.6 + uSurge * 0.35;
  I *= uBrightness * uIntro;

  vec3 col = entityPalette(clamp(I * 0.9, 0.0, 1.0));
  col += entityPalette(1.0) * smoothstep(1.35, 2.2, I) * 0.8;
  vec3 outCol = col * min(I, 3.0);

  /* discard keeps the depth buffer clean between filaments so the
     particle rings behind the bright zones are not wrongly occluded */
  if (dot(outCol, vec3(0.3333)) < 0.006) discard;
  gl_FragColor = vec4(outCol, 1.0);
}
