#version 300 es

precision highp float;

in vec3 screen_position;
in vec3 normal;

out vec4 fragColor;

uniform vec3 color;

void main(void) {
  fragColor = vec4(vec3(max(dot(normal, vec3(0.0, 1.0, 0.0)), 0.0)) * color, 1.0);
}