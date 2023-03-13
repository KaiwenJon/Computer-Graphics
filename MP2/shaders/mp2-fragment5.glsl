#version 300 es
precision highp float;

in vec2 fragCoord;
in vec4 fcolor;
out vec4 fragColor;
void main() {
    float t = iTime;
    vec2 P = fragCoord;
    P/=iResolution.xy;
    vec2 R, S;
    float rad = abs(0.5*sin(t));
    S.x = 0.5+rad*sin(t*3.0);
    S.y = 0.5+rad*cos(t*3.0);
    R.x = abs(sin(t*3.0)*length(P));
    R.y = abs(cos(t*3.0)*length(P));
    fragColor = vec4(R.x*2.0,length(P-S),R.y,1.0);
}