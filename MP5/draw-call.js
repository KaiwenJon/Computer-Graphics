
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
function drawSphere(milliseconds) {
    // let's use method1
    let seconds = milliseconds / 1000;
    let s2 = Math.cos(seconds/2)-1
    
    // let eye = [1.2*Math.cos(seconds/2),1.2*Math.sin(seconds/2), 0.7] // camera point, in world coordinate
    let step = 0.03
    if (keysBeingPressed['w']){
        window.v = m4mul(m4trans(0, 0, step), window.v)
    }
    if (keysBeingPressed['s']){
        window.v = m4mul(m4trans(0, 0, -step), window.v)
    }
    if (keysBeingPressed['a']){
        window.v = m4mul(m4trans(step, 0, 0), window.v)
    }
    if (keysBeingPressed['d']){
        window.v = m4mul(m4trans(-step, 0, 0), window.v)
    }
    if (keysBeingPressed['e']){
        window.v = m4mul(m4trans(0, -step, 0), window.v)
    }
    if (keysBeingPressed['q']){
        window.v = m4mul(m4trans(0, step, 0), window.v)
    }
    if (keysBeingPressed['ArrowUp']){
        window.v = m4mul(m4rotX(-step/3, 0, 0), window.v)
        // window.eye = m4mul(m4rotX(step, 0, 0), window.eye)
    }
    if (keysBeingPressed['ArrowDown']){
        window.v = m4mul(m4rotX(step/3, 0, 0), window.v)
        // window.eye = m4mul(m4rotX(-step, 0, 0), window.eye)
    }
    if (keysBeingPressed['ArrowLeft']){
        window.v = m4mul(m4rotY(-step/3, 0, 0), window.v)
        // window.eye = m4mul(m4rotY(step, 0, 0), window.eye)
    }
    if (keysBeingPressed['ArrowRight']){
        window.v = m4mul(m4rotY(step/3, 0, 0), window.v)
        // window.eye = m4mul(m4rotY(-step, 0, 0), window.eye)
    }
    const lightdir = normalize(new Float32Array([5, 1, 2]))//([0.8, -0.6, 0.0]) 
    const lightcolor = new Float32Array([1, 1, 1])
    const halfway = normalize(add(lightdir, normalize(window.eye.slice(0, 3)))) // in theory we shouldn't make eye constant
    gl.clearColor(167/255, 240/255, 179/255, 1) // f(...[1,2,3]) means f(1,2,3)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.useProgram(program)
    gl.bindVertexArray(geom.vao)
    gl.uniform3fv(gl.getUniformLocation(program, 'lightdir'), lightdir)
    gl.uniform3fv(gl.getUniformLocation(program, 'halfway'), halfway)
    gl.uniform3fv(gl.getUniformLocation(program, 'lightcolor'), lightcolor)
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'p'), false, p)
    
    spheresList.forEach(([[x, y, z], [r, g, b]], index, array)=>{
        window.m = m4mul(m4trans(x, y, z), m4scale(0.1, 0.1, 0.1)) // identity means assuming world origin is at model origin.
        const particleColor = new Float32Array([r, g, b, 1])
        gl.uniform4fv(gl.getUniformLocation(program, 'particleColor'), particleColor)
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'mv'), false, m4mul(v,m))
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'm'), false, m)
        gl.drawElements(geom.mode, geom.count, geom.type, 0)
    })

    // draw the invisible cube
    gl.useProgram(programCube)
    gl.bindVertexArray(geomCube.vao)
    window.m = m4mul(m4trans(-0, -0, 0), m4scale(2.5, 2.5, 2.5))
    const particleColor = new Float32Array([0.5, 0.8, 0.2, 1])
    gl.uniform4fv(gl.getUniformLocation(programCube, 'particleColor'), particleColor)
    gl.uniformMatrix4fv(gl.getUniformLocation(programCube, 'mv'), false, m4mul(v,m))
    gl.uniformMatrix4fv(gl.getUniformLocation(programCube, 'm'), false, m)

    gl.uniformMatrix4fv(gl.getUniformLocation(programCube, 'p'), false, p)
    gl.drawElements(geomCube.mode, geomCube.count, geomCube.type, 0)

    window.pending = requestAnimationFrame(drawSphere)
}
