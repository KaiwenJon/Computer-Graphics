#version 300 es
precision highp float;
uniform vec4 color;
out vec4 fragColor;
in vec3 outnormal;
uniform vec3 eyedir;
const vec3 lightdir = vec3(0.8, -0.6, 0);
void main() {
    vec3 normal = normalize(outnormal);
    vec3 x = normal * dot(normal, lightdir);
    vec3 r = 2.0*x - lightdir;
    float phongbit = max(0.0,dot(r,eyedir));
    float phong = pow(phongbit, 20.0);
    float lambert = max(0.0, dot(lightdir, normal));
    fragColor = vec4((color.rgb * lambert) + vec3(phong, phong, phong)/3.0, color.a);
}