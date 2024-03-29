#version 300 es
precision highp float;
out vec4 fragColor;
in vec3 outnormal;
in vec4 outcolor;
in vec4 outpos;
uniform vec3 lightdir;
uniform vec3 halfway;
uniform vec3 lightcolor;
// specular light : assume directional light(like sun), since light_dir vector remains the same at the scene.
void main() {
    vec3 normal = normalize(outnormal); // when fragment are interpolated, they are not unit vector again
    float blinn = pow(max(0.0, dot(halfway, normal)), 150.0);
    float lambert = max(0.0, dot(lightdir, normal));
    fragColor = vec4(
        (vec3(outcolor.r, outpos.z*10.0, outpos.x) * lightcolor * lambert) + vec3(blinn * lightcolor)*0.5, 
        outcolor.a);
}