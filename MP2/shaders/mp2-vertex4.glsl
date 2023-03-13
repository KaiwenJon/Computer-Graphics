#version 300 es
in vec4 position;
in vec4 vcolor;

out vec4 fcolor;
uniform mat4 p;
uniform mat4 mv;

uniform mat4 rotate;
uniform mat4 offset1;
uniform mat4 offset2;
uniform bool weirdDance;
void main() {
    if(weirdDance){
        if(gl_VertexID < 6){
            gl_Position = p * mv * offset1 * rotate * position;
        }
        else if(gl_VertexID < 12){
            gl_Position = p * mv * offset2 * rotate * position;
        }
    }
    else{
        gl_Position = p * mv * position;
    }
    fcolor = vcolor;
}