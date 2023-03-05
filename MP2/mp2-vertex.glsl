#version 300 es
in vec4 position;
in vec4 vcolor;

out vec4 fcolor;
uniform mat4 p;
uniform mat4 mv;
void main() {
    gl_Position = p * mv * position;
    fcolor = vcolor;
}