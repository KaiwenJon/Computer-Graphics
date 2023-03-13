#version 300 es
precision highp float;

in vec4 fcolor;
out vec4 fragColor;

uniform float u_time;
uniform vec2 u_resolution;
void main() {
    // vec2 P = sin(gl_FragCoord.xy / u_resolution.xy);
    // fragColor = vec4(0.5 + 0.5 * sin(3.145 * (P.x + P.y) + u_time));
    // // fragColor = fcolor;
    float t = u_time;
    vec2 P = gl_FragCoord.xy;
    P /= u_resolution.xy;
    vec2 R, S;
    float rad = abs(1.0*sin(t));
    S.x = 1.5+rad*sin(t*1.5);
    S.y = 0.5+rad*cos(t*1.5);
    R.x = abs(sin(t*1.5)*length(P));
    R.y = abs(cos(t*1.5)*length(P));
    vec4 U = vec4(R.x*2.0,length(P-S),R.y,1.0);
    U = sin(U*20.0);
    U = 0.5 + 0.5*sin(3.14* (U.x+U.y+t) + vec4(0,2.1,-2.1,0)); 
    U /= max(U.x, max(U.y, U.z));
    fragColor = U;
    // fragColor = fcolor + vec4(sin(t), 0.5 ,0.5 ,1);
}