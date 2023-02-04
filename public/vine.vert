#version 300 es

in vec3 model_position;
in vec3 model_normal;

in vec3 instance_position;
in float instance_type;

out vec3 screen_position;
out vec3 normal;

uniform mat4 mvp;

void main(void) {
  vec4 pos = mvp * vec4(model_position, 1.0) + vec4(instance_position, 0.0);
  screen_position = pos.xyz;
  gl_Position = pos;

  normal = model_normal;
}