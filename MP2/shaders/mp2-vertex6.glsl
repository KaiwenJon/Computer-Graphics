#version 300 es
in vec4 position;
in vec4 vcolor;

out vec4 fcolor;
uniform mat4 p;
uniform mat4 mv;

uniform mat4 footMove1;
uniform mat4 footMove2;
void main() {
    if(gl_VertexID == 9){
        gl_Position = p * mv * footMove1 * position;
    }
    else if(gl_VertexID == 10){
        gl_Position = p * mv * footMove2 * position;
    }
    else{
        gl_Position = p * mv * position;
    }
    fcolor = vcolor;
}