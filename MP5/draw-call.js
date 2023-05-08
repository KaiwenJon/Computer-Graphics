
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
let lastTimestamp = 0
let lastUpdateSphere = 0
let cube_width = 2.5
let sphere_radius = 0.1
let gravity = [0, 0, -5]
let sixPlanesEquation = [
    [0, 0, 1, cube_width/2],
    [0, 0, -1, cube_width/2],
    [1, 0, 0, cube_width/2],
    [-1 ,0, 0, cube_width/2],
    [0, 1, 0, cube_width/2],
    [0, -1, 0, cube_width/2]
]
function getAverage(buffer){
    const sum = buffer.reduce((total, num) => total + num, 0);
    const average = sum / buffer.length;
    return average
}
fpsBuffer = []
function drawSphere(milliseconds) {
    // let's use method1
    let seconds = milliseconds / 1000;
    const delta_seconds = seconds - lastTimestamp
    fpsBuffer.push(delta_seconds)
    if(fpsBuffer.length >= 20){
        fpsBuffer.shift()
    }
    lastTimestamp = seconds
    const delta_seconds_updateSphere = seconds - lastUpdateSphere
    if(delta_seconds_updateSphere > 5){
        window.spheresList = initSphereList()
        lastUpdateSphere = seconds
    }
    else if(delta_seconds_updateSphere > 0.5){
        let fps = 1 / getAverage(fpsBuffer)
        document.querySelector('#fps').innerHTML = `FPS: ${fps.toFixed(2)}`
    }
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
    const lightdir = normalize(new Float32Array([5, 0, 2]))//([0.8, -0.6, 0.0]) 
    const lightcolor = new Float32Array([1, 1, 1])
    const halfway = normalize(add(lightdir, normalize(window.eye.slice(0, 3)))) // in theory we shouldn't make eye constant
    gl.clearColor(1, 0.373, 0.02, 0.5) // f(...[1,2,3]) means f(1,2,3)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.useProgram(program)
    gl.bindVertexArray(geom.vao)
    gl.uniform3fv(gl.getUniformLocation(program, 'lightdir'), lightdir)
    gl.uniform3fv(gl.getUniformLocation(program, 'halfway'), halfway)
    gl.uniform3fv(gl.getUniformLocation(program, 'lightcolor'), lightcolor)
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'p'), false, p)
    

    spheresList.forEach(([pos, vel, color, radius, mass], index, array)=>{
        // check collision with all other guys
        spheresList.forEach(([p, v, c, r, m], i, a)=>{
            if(index == i){
                return
            }
            let d = sub(p,  pos)
            let distance = mag(d)
            d = normalize(d)
            if(distance < (radius + r) && dot(vel, d) > 0){
                let wi = m / (mass + m)
                let wj = mass / (mass + m)
                let si = dot(vel, d)
                let sj = dot(v, d)
                let s = si - sj
                let e = 0.8
                vel = vel.map((v_, i_)=> v_ - wi * (1 + e) * s * d[i_]) 
                v = v.map((v_, i_)=> v_ + wj * (1 + e) * s * d[i_]) 
                a[i] = [p, v, c, r, m]
            }
        })

        sixPlanesEquation.forEach((equation)=>{
            let plane_normal = equation.slice(0, 3)
            plane_normal = plane_normal.map((n)=>-n)
            let signed_distance = dot([...pos, 1], equation) / mag(plane_normal)
            if(Math.abs(signed_distance) <= radius && Math.sign(signed_distance) == Math.sign(dot(vel, plane_normal))){
                // && Math.sign(signed_distance) == Math.sign(dot(vel, plane_normal))
                let wi = 1
                let si = dot(vel, plane_normal)
                let sj = 0
                let s = si - sj // update i using -, update j using +
                let e = 0.8
                vel = vel.map((v, i)=> v - wi * (1 + e) * s * plane_normal[i]) 
            }
        })
        //drag force
        c = 20
        drag_a = vel.map((v, i) => -c *v * radius * radius)
        pos = pos.map((p, i) => p + vel[i] * delta_seconds)
        vel = vel.map((v, i) => (v + (gravity[i] + drag_a[i]) * delta_seconds))
        array[index] = [pos, vel, color, radius, mass]
        window.m = m4mul(m4trans(...pos), m4scale(radius, radius, radius)) // identity means assuming world origin is at model origin.
        const particleColor = new Float32Array([...color, 1])
        gl.uniform4fv(gl.getUniformLocation(program, 'particleColor'), particleColor)
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'mv'), false, m4mul(v,m))
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'm'), false, m)
        gl.drawElements(geom.mode, geom.count, geom.type, 0)
    })

    // draw the invisible cube
    gl.useProgram(programCube)
    gl.bindVertexArray(geomCube.vao)
    window.m = m4mul(m4trans(-0, -0, 0), m4scale(cube_width, cube_width, cube_width))
    gl.uniformMatrix4fv(gl.getUniformLocation(programCube, 'mv'), false, m4mul(v,m))
    gl.uniformMatrix4fv(gl.getUniformLocation(programCube, 'm'), false, m)

    gl.uniformMatrix4fv(gl.getUniformLocation(programCube, 'p'), false, p)
    // gl.drawElements(geomCube.mode, geomCube.count, geomCube.type, 0)

    window.pending = requestAnimationFrame(drawSphere)
}
