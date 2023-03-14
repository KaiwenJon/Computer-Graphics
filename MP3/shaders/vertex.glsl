#version 300 es
in vec4 position;
in vec3 normal;
out vec3 outnormal;
uniform mat4 p;
uniform mat4 mv;
void main() {
    gl_Position = p * mv * position;
    outnormal = mat3(mv) * normal; // will not work for non-unform scaling; otherwise it should be fine.
}