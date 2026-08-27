/* THE ENTITY palette — a blended 5-stop ramp shared by every system.
   BLUE STATE:  deep blue → electric → cyan → ice → core white
   RED STATE:   near-black crimson → blood → scarlet → ember → hot orange
   The CPU blends the two ramps during state transitions. */

uniform vec3 uPalette[5];

vec3 entityPalette(float I) {
  vec3 c = mix(uPalette[0], uPalette[1], smoothstep(0.00, 0.34, I));
  c = mix(c, uPalette[2], smoothstep(0.30, 0.60, I));
  c = mix(c, uPalette[3], smoothstep(0.56, 0.84, I));
  c = mix(c, uPalette[4], smoothstep(0.82, 1.00, I));
  return c;
}
