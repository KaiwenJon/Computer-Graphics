#version 300 es
in vec4 position;
in vec3 normal;
in vec4 color;
out vec3 outnormal;
out vec4 outcolor;
uniform mat4 p;
uniform mat4 mv;
uniform mat4 m;
void main() {
    gl_Position = p * mv * position;
    outnormal = mat3(m) * normal; // will not work for non-unform scaling; otherwise it should be fine.
    outcolor = color;
}