#version 300 es
precision highp float;
out vec4 fragColor;
in vec4 outcolor;

void main() {
    fragColor = outcolor;
}