// This script is long enough it should probably be in its own file; it's inline
// here simply to make this example easier to share as a single link.

/**
 * Animation callback for the first display. Should be invoked as 
 * `window.pending = requestAnimationFrame(draw1)`
 * and invokes that on itself as well; to stop it, call
 * `cancelAnimationFrame(window.pending)`
 *
 * Fills the screen with Illini Orange
 */

// Required: 3D Illini Logo self-rotating and camera zoomin
function draw0(milliseconds) {
    let seconds = milliseconds/1000
    // window.m = IdentityMatrix
    // camera_pos = [0, 0, 1.5, 1]
    // camera_pos = m4mul(m4trans(0, 0, Math.sin(seconds)+1), camera_pos)
    // camera_pos = m4mul(m4rotY(seconds), camera_pos) // in world coordinate
    // window.v = m4view(camera_pos.slice(0, 3), [0, 0, 0], [0, 1, 0])

    window.m = m4rotY(seconds)
    camera_pos = [0, 0, 1.5, 1]
    camera_pos = m4mul(m4trans(1, 1, 0), camera_pos)
    camera_pos = m4mul(m4trans(0, 0, Math.sin(seconds)+1), camera_pos)
    window.v = m4view(camera_pos.slice(0, 3), [0, 0, 0], [0, 1, 0])
    window.p = m4perspNegZ(0.1, 10, 1.5, c.width, c.height)

    gl.clearColor(...IlliniBlue)
    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.useProgram(program)
    gl.bindVertexArray(geom.vao)
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'mv'), false, m4mul(v,m))
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'p'), false, p)

    gl.drawElements(geom.mode, geom.count, geom.type, 0)
    window.pending = requestAnimationFrame(draw0)
}
/**
 * Animation callback for the second display. See {draw1} for more.
 *
 * Fills the screen with Illini Blue
 */

// Required: 2D Illini Logo moving, rotating, and scaling
function draw1(milliseconds) {
    let seconds = milliseconds/1000
    window.m = m4mul(m4rotZ(seconds*1.5), m4scale(Math.sin(seconds*2)/2+1, Math.sin(seconds*2)/2+1, 1))
    window.m = m4mul(m4trans(Math.sin(seconds)/2, 0, 0), window.m)
    window.v = IdentityMatrix
    window.p = IdentityMatrix

    gl.clearColor(...IlliniBlue)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(program)
    gl.bindVertexArray(geom.vao)
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'mv'), false, m4mul(v,m))
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'p'), false, p)

    gl.drawElements(geom.mode, geom.count, geom.type, 0)
    window.pending = requestAnimationFrame(draw1)
}

// Optional 1: CPU-based vertex movement
function draw2(milliseconds) {
    let seconds = milliseconds/1000
    // window.m = m4rotY(seconds)
    // camera_pos = [0, 0, 1.5, 1]
    // camera_pos = m4mul(m4trans(1, 1, 0), camera_pos)
    // camera_pos = m4mul(m4trans(0, 0, Math.sin(seconds)+1), camera_pos)
    // window.v = m4view(camera_pos.slice(0, 3), [0, 0, 0], [0, 1, 0])
    // window.p = m4perspNegZ(0.1, 10, 1.5, c.width, c.height)

    window.m = IdentityMatrix
    window.v = IdentityMatrix
    window.p = IdentityMatrix


    gl.clearColor(...IlliniBlue)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(program)

    let vsIn = "position"
    let data = window.models[2].attributes[vsIn]
    let mode = gl.DYNAMIC_DRAW
    let newData = []
    let offset = (Math.sin(seconds)*0.5+0.5)
    let scale = 0.5
    data.forEach((item, index)=>{
        if(index < 6){
            item = m4mul(m4rotZ(seconds), [...item, 1]).slice(0, 3) 
            newItem = [(item[0]+offset)*scale, (item[1]+offset)*scale, item[2]*scale]
            newData.push(newItem)
        }
        else if(index < 12){
            item = m4mul(m4rotZ(-seconds), [...item, 1]).slice(0, 3) 
            newItem = [(item[0]-offset)*scale, (item[1]-offset)*scale, item[2]*scale]
            newData.push(newItem)
        }
    })
    supplyDataBuffer(newData, program, vsIn, mode)


    gl.bindVertexArray(geom.vao)

    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'mv'), false, m4mul(v,m))
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'p'), false, p)
    gl.drawElements(geom.mode, geom.count, geom.type, 0)
    window.pending = requestAnimationFrame(draw2)
}

// Optional 2: GPU_based vertex movement
function draw3(milliseconds) {
    let seconds = milliseconds/1000
    window.m = IdentityMatrix
    window.v = IdentityMatrix
    window.p = IdentityMatrix

    let selfRotate = m4rotZ(seconds)
    let d = (Math.sin(seconds)*0.5+0.5)
    let offset1 = m4trans(0.2, 0.2, 0)
    let offset2 = m4trans(-0.2, -0.2, 0)

    gl.clearColor(...IlliniBlue)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(program)
    gl.bindVertexArray(geom.vao)


    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'rotate'), false, selfRotate)
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'offset1'), false, offset1)
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'offset2'), false, offset2)

    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'mv'), false, m4mul(v,m))
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'p'), false, p)
    gl.drawElements(geom.mode, geom.count, geom.type, 0)
    window.pending = requestAnimationFrame(draw3)
}

// Optional 3: Collision
function draw4(milliseconds) {
    let offset = m4trans(logo1velocity[0]*0.01, logo1velocity[1]*0.01, 0)
    window.m = IdentityMatrix
    window.v = IdentityMatrix
    window.p = IdentityMatrix
    gl.clearColor(...IlliniBlue)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(program)


    let vsIn = "position"
    let data = window.logo1data
    let mode = gl.DYNAMIC_DRAW
    let newData = []

    let bordersX = []
    let bordersY = []
    bordersX.push([1, 0, -1]) // x =  1
    bordersX.push([1, 0,  1]) // x = -1
    bordersY.push([0, 1, -1]) // y =  1
    bordersY.push([0, 1,  1]) // y = -1
    let hitBorderX = false
    let hitBorderY = false
    let hitOtherX = false
    let hitOtherY = false
    data.forEach((item, index)=>{
        let newPosition = m4mul(offset, [...item, 1]).slice(0, 3)
        let point2D = [newPosition[0], newPosition[1], 1]
        if(checkLine(point2D, bordersX[0]) * checkLine(point2D, bordersX[1]) > 0){
            // console.log("Hit!")
            hitBorderX = true
        }
        if(checkLine(point2D, bordersY[0]) * checkLine(point2D, bordersY[1]) > 0){
            // console.log("Hit!")
            hitBorderY = true
        }


        if(checkLine(point2D, logo2BordersX[0]) * checkLine(point2D, logo2BordersX[1]) < 0){
            // console.log("Hit!OtherX")
            hitOtherX = true
        }
        if(checkLine(point2D, logo2BordersY[0]) * checkLine(point2D, logo2BordersY[1]) < 0){
            // console.log("Hit!OtherY")
            hitOtherY = true
        }
        newData.push(newPosition)
    })
    
    if(hitBorderX){
        window.logo1velocity = [-logo1velocity[0], logo1velocity[1], 0]
        logo1Count = 0
        newData.forEach((item, i)=>{
            offset = m4trans(logo1velocity[0]*0.01, logo1velocity[1]*0.01, 0)
            return (m4mul(offset, [...item, 1]).slice(0, 3))
        })
        // console.log('CHange direction!')
    }
    if(hitBorderY){
        window.logo1velocity = [logo1velocity[0], -logo1velocity[1], 0]
        logo1Count = 0
        newData.forEach((item, i)=>{
            offset = m4trans(logo1velocity[0]*0.01, logo1velocity[1]*0.01, 0)
            return (m4mul(offset, [...item, 1]).slice(0, 3))
        })
    }
    if(hitOtherX && hitOtherY){
        window.logo1velocity = [-logo1velocity[0], -logo1velocity[1], 0]
        window.logo2velocity = [-logo2velocity[0], -logo2velocity[1], 0]
    }
    
    supplyDataBuffer(newData, program, vsIn, mode)
    window.logo1data = newData


    gl.bindVertexArray(geom.vao)
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'mv'), false, IdentityMatrix)
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'p'), false, IdentityMatrix)
    gl.drawElements(geom.mode, geom.count, geom.type, 0)

    //======================= Logo 2 =========================
    offset = m4trans(logo2velocity[0]*0.01, logo2velocity[1]*0.01, 0)
    data = window.logo2data

    hitBorderX = false
    hitBorderY = false
    newData = []
    let topLeft
    let bottomRight
    data.forEach((item, index)=>{
        let newPosition = m4mul(offset, [...item, 1]).slice(0, 3)
        let point2D = [newPosition[0], newPosition[1], 1]
        if(checkLine(point2D, bordersX[0]) * checkLine(point2D, bordersX[1]) > 0){
            // console.log("Hit!")
            hitBorderX = true
        }
        if(checkLine(point2D, bordersY[0]) * checkLine(point2D, bordersY[1]) > 0){
            // console.log("Hit!")
            hitBorderY = true
        }
        newData.push(newPosition)


        // update borders
        // top left 0, top right 1, bottom left 10, bottom right 11
        if(index == 0){
            topLeft = [newPosition[0], newPosition[1]]
        }
        else if(index == 11){
            bottomRight = [newPosition[0], newPosition[1]]
        }
    })
    // console.log("TOPLEFT", topLeft)
    // console.log("BOTTOMRIGHT", bottomRight)
    logo2BordersX = [[1, 0, -topLeft[0]], [1, 0, -bottomRight[0]]]
    logo2BordersY = [[0, 1, -topLeft[1]], [0, 1, -bottomRight[1]]]
    
    if(hitBorderX){
        window.logo2velocity = [-logo2velocity[0], logo2velocity[1], 0]
        newData.forEach((item, i)=>{
            offset = m4trans(logo2velocity[0]*0.01, logo2velocity[1]*0.01, 0)
            return (m4mul(offset, [...item, 1]).slice(0, 3))
        })
        // console.log('CHange direction!')
    }
    if(hitBorderY){
        window.logo2velocity = [logo2velocity[0], -logo2velocity[1], 0]
        newData.forEach((item, i)=>{
            offset = m4trans(logo2velocity[0]*0.01, logo2velocity[1]*0.01, 0)
            return (m4mul(offset, [...item, 1]).slice(0, 3))
        })
    }


    
    supplyDataBuffer(newData, program, vsIn, mode)
    window.logo2data = newData


    gl.bindVertexArray(geom.vao)
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'mv'), false, IdentityMatrix)
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'p'), false, IdentityMatrix)
    gl.drawElements(geom.mode, geom.count, geom.type, 0)


    window.pending = requestAnimationFrame(draw4)
}

// helper function for collision: determine which side of the line the point is at
function checkLine(point, line){
    // line: a, b, c (ax+by+c=0), always let a > 0,
    // then sign(ax0 + by0 + c) > 0 tells you that point is at right
    // point (x0, y0, 1)
    // return sign(ax0 + by0 + c)

    // now way a and b are both 0
    if(line[0] == 0){
        // by + c = 0
        if(line[1] < 0){
            // b < 0
            return dot(line, point) < 0 ? -1 : 1
        }
        else if(line[1] > 0){
            // b > 0
            return dot(line, point) > 0 ? 1 : -1
        }
        else{
            console.log("No way.")
        }
    }
    else if (line[1] == 0){
        // ax + c = 0
        if(line[0] < 0){
            // a < 0
            return dot(line, point) < 0 ? -1 : 1
        }
        else if(line[0] > 0){
            // a > 0
            return dot(line, point) > 0 ? 1 : -1
        }
        else{
            console.log("No way.")
        }
    }
}

function draw6(milliseconds){
    let seconds = milliseconds/1000
    window.m = m4trans(Math.sin(seconds)/2, 0, 0)
    window.v = IdentityMatrix
    window.p = IdentityMatrix

    footMove1 = m4mul(m4trans(Math.sin(seconds*10)/10, 0 ,0), m4trans(-0, 0, 0))

    footMove2 = m4mul(m4trans(Math.sin((seconds+Math.PI/2)*10)/10, 0 ,0), m4trans(0, 0, 0))

    gl.clearColor(1, 1, 1, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(program)
    gl.bindVertexArray(geom.vao)

    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'footMove1'), false, footMove1)
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'footMove2'), false, footMove2)
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'mv'), false, m4mul(v,m))
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'p'), false, p)
    gl.drawElements(gl.LINES, geom.count, geom.type, 0)
    window.pending = requestAnimationFrame(draw6)
}

function initCollision(){
    scale1 = 0.8
    scale2 = 0.4
    window.logo1data = window.models[4].attributes['position']
    newData = []
    logo1data.forEach((item, index)=>{
        let newPosition = m4mul(m4trans(0.5, 0, 0), m4mul(m4scale(scale1, scale1, 1), [...item, 1])).slice(0, 3)
        newData.push(newPosition)
    })
    logo1data = newData
    window.logo1velocity = [1.2, 0.8, 0]

    window.logo2data = window.models[4].attributes['position']
    newData = []
    logo2data.forEach((item, index)=>{
        let newPosition = m4mul(m4trans(-0.5, 0, 0), m4mul(m4scale(scale2, scale2, 1), [...item, 1])).slice(0, 3)
        newData.push(newPosition)
    })
    logo2data = newData
    window.logo2velocity = [-0.7, -0.8, 0]
    window.logo2BordersX = [[1, 0, 0.15], [1, 0, -0.15]]
    window.logo2BordersY = [[0, 1, 0.25], [0, 1, -0.25]]
}

/** Callback for when the radio button selection changes */
function radioChanged() {
    let chosen = document.querySelector('input[name="example"]:checked').value
    cancelAnimationFrame(window.pending)

    window.nowChosen = chosen
    const [vs, fs] = window.shaders[window.nowChosen]
    window.program = compileAndLinkGLSL(vs, fs)
    const model = window.models[window.nowChosen]
    window.geom = setupGeomery(model)
    if(nowChosen == 4){
        initCollision()
    }
    window.pending = requestAnimationFrame(window['draw'+nowChosen])
}

/** Resizes the canvas to be a square that fits on the screen with at least 20% vertical padding */
function resizeCanvas() {
    window.c = document.querySelector('canvas')
    c.width = c.parentElement.clientWidth
    c.height = document.documentElement.clientHeight * 0.8
    console.log(c.width, c.height)
    if (c.width > c.height) c.width = c.height
    else c.height = c.width
    if (window.gl) {
        gl.viewport(0,0, c.width, c.height)
        window.p = m4perspNegZ(0.1, 10, 1.5, c.width, c.height)
    }
}

/**
 * Initializes WebGL and event handlers after page is fully loaded.
 * This example uses only `gl.clear` so it doesn't need any shaders, etc;
 * any real program would initialize models, shaders, and programs for each
 * display and store them for future use before calling `radioChanged` and
 * thus initializing the render.
 */
window.addEventListener('load',setup)

const IlliniBlue = new Float32Array([0.075, 0.16, 0.292, 1])
const IlliniOrange = new Float32Array([1, 0.373, 0.02, 1])
const IdentityMatrix = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1])
async function setup() {
    window.gl = document.querySelector('canvas').getContext('webgl2')
    window.nowChosen = document.querySelector('input[name="example"]:checked').value
    resizeCanvas()

    window.shaders = []
    window.models = []
    for(let i=0; i<8; i++){
        let vs = await fetch('./shaders/mp2-vertex'+ i +'.glsl', {cache: "no-cache"}).then(res => res.text())
        let fs = await fetch('./shaders/mp2-fragment'+ i +'.glsl', {cache: "no-cache"}).then(res => res.text())
        window.shaders.push([vs, fs])

        if(i < 4){
            let model= await fetch('./models/model'+ '0' +'.json', {cache: "no-cache"}).then(res => res.json()) 
            window.models.push(model)
        }
        else{
            let model= await fetch('./models/model'+ i +'.json', {cache: "no-cache"}).then(res => res.json()) 
            window.models.push(model)
        }
    }

    const [vs, fs] = window.shaders[window.nowChosen]
    window.program = compileAndLinkGLSL(vs, fs)

    const model = window.models[window.nowChosen]
    window.geom = setupGeomery(model)
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    document.querySelectorAll('input[name="example"]').forEach(elem => {
        elem.addEventListener('change', radioChanged)
    })
    radioChanged()

}
// you can have multiple shaders. Compile and link everytime different radio button is chosen.
function compileAndLinkGLSL(vs_source, fs_source) {
    let vs = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vs, vs_source)
    gl.compileShader(vs)
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(vs))
        throw Error("Vertex shader compilation failed")
    }

    let fs = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fs, fs_source)
    gl.compileShader(fs)
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(fs))
        throw Error("Fragment shader compilation failed")
    }

    let program = gl.createProgram()
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program))
        throw Error("Linking failed")
    }
    
    return program
}

// create a buffer object and bind that to target: gl.ARRAY_BUFFER
// supply our actual data to gl.ARRAY_BUFFER
// retrieve the location of input of vertex shader
// supply data in the current buffer to loc, with a certain layout specified
// note: there could be only one guy in the gl.ARRAY_BUFFER. Everyone should line up to use this spot to supply data to vsIn
function supplyDataBuffer(data, program, vsIn, mode) {
    if (mode === undefined) mode = gl.DYNAMIC_DRAW
    
    let buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    let f32 = new Float32Array(data.flat())
    gl.bufferData(gl.ARRAY_BUFFER, f32, mode)
    
    let loc = gl.getAttribLocation(program, vsIn)
    gl.vertexAttribPointer(loc, data[0].length, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(loc)
    
    return buf;
}

// create a vao (you can create multiple vao corresponding to different vertex attribute configurations)
// to use different vao, simply call gl.bindVertexArray before you call the draw call.
// Then you can draw different models with different configs on the same canvas.
function setupGeomery(geom) {
    var triangleArray = gl.createVertexArray()
    gl.bindVertexArray(triangleArray)

    for(let name in geom.attributes) {
        let data = geom.attributes[name]
        supplyDataBuffer(data, program, name)
    }

    var indices = new Uint16Array(geom.triangles.flat())
    var indexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW)

    return {
        mode: gl.TRIANGLES,
        count: indices.length,
        type: gl.UNSIGNED_SHORT,
        vao: triangleArray
    }
}