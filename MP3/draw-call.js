
/**
 * Draw one frame
 */
// Method1: compute light model in world space: lightdir, eyedir, normal are all in world space. 
// => lightdir remains the same, 
// => eyedir changes every frame, eyedir = f(seconds), in world coordinate.
// => normal = modelmatrix * normal

// Method2: compute light model in view space:
// => lightdir changes every frame, lightdir =  view * model * lightdir. (if light is also part of the model.)
// => eyedir = [0, 0, 1]. remains the same.
// => normal = mv * normal.
const IdentityMatrix = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1])
function drawTerrain(milliseconds) {
    // let's use method1
    let seconds = milliseconds / 1000;
    let s2 = Math.cos(seconds/2)-1
    
    let eye = [1.2*Math.cos(seconds/2),1.2*Math.sin(seconds/2), 0.7] // camera point, in world coordinate
    window.m = m4trans(-0.5, -0.5, 0) // identity means assuming world origin is at model origin.
    window.v = m4view([...eye], [0,0,0], [0,0,1])

    const lightdir = normalize(new Float32Array([1, -1, 1]))//([0.8, -0.6, 0.0]) 
    const lightcolor = new Float32Array([1, 1, 1])
    const halfway = normalize(add(lightdir, normalize(eye)))
    gl.clearColor(0.8, 0.8, 0.8, 1) // f(...[1,2,3]) means f(1,2,3)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.useProgram(program)
    
    gl.bindVertexArray(geom.vao)
    

    gl.uniform3fv(gl.getUniformLocation(program, 'lightdir'), lightdir)
    gl.uniform3fv(gl.getUniformLocation(program, 'halfway'), halfway)
    gl.uniform3fv(gl.getUniformLocation(program, 'lightcolor'), lightcolor)
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'p'), false, p)
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'mv'), false, m4mul(v,m))
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'm'), false, m)
    gl.drawElements(geom.mode, geom.count, geom.type, 0)

    window.pending = requestAnimationFrame(drawTerrain)
}
