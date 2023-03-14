
/**
 * Draw one frame
 */
const IdentityMatrix = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1])
function draw(milliseconds) {
    let seconds = milliseconds / 1000;
    let s2 = Math.cos(seconds/2)-1
    
    let eye = [3*Math.cos(s2),3*Math.sin(s2), 1] // world coordinate
    window.m = IdentityMatrix
    window.v = m4view([...eye], [0,0,0], [0,0,1])

    let blinn_eye = [0, 0, 1]
    const lightdir = normalize(new Float32Array([0, 0, 1]))//([0.8, -0.6, 0.0])
    const lightcolor = new Float32Array([1, 1, 1])
    const halfway = normalize(add(lightdir, blinn_eye))
    gl.clearColor(...IlliniBlue) // f(...[1,2,3]) means f(1,2,3)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.useProgram(program)
    
    gl.bindVertexArray(geom.vao)
    

    gl.uniform4fv(gl.getUniformLocation(program, 'color'), IlliniOrange)
    gl.uniform3fv(gl.getUniformLocation(program, 'lightdir'), lightdir)
    gl.uniform3fv(gl.getUniformLocation(program, 'halfway'), halfway)
    gl.uniform3fv(gl.getUniformLocation(program, 'lightcolor'), lightcolor)
    gl.uniform3fv(gl.getUniformLocation(program, 'eyedir'), new Float32Array(normalize(eye)))
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'p'), false, p)
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'mv'), false, m4mul(v,m))
    gl.drawElements(geom.mode, geom.count, geom.type, 0)

    window.pending = requestAnimationFrame(draw)
}