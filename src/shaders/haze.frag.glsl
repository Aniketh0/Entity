/* Volumetric haze breathing around the Entity — the light the iris
   casts into its own environment. Peaks at the iris edge, never over
   the pupil. Kept subtle: never a glowing fog. */

varying vec2 vP;

uniform float uTime;
uniform float uIntro;
uniform float uEnergy;

void main() {
  float r = length(vP);
  float ang = atan(vP.y, vP.x);

  /* the glow peaks at the iris edge, never over the pupil —
     the pupil must remain a hole punched in the light */
  float ring = exp(-pow((r - 1.05) * 1.5, 2.0));
  float wide = exp(-r * 0.42) * 0.35;

  float wob = 0.85 + 0.15 * snoise(vec3(cos(ang) * 2.0, sin(ang) * 2.0, uTime * 0.05));
  float hole = smoothstep(0.0, 0.78, r);

  float I = (ring * 0.9 + wide) * wob * hole * (0.75 + 0.35 * uEnergy) * uIntro * 0.11;

  vec3 col = mix(entityPalette(0.06), entityPalette(0.72), clamp(ring * 1.3 + wide, 0.0, 1.0)) * I;

  gl_FragColor = vec4(col, 1.0);
}
