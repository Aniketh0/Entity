varying vec2 vP;

void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vP = wp.xy;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
