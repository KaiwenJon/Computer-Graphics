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
function draw1(milliseconds) {
    window.m = m4rotX(milliseconds/1000)
    window.v = m4view([1,2,3], [0,0,0], [0,1,0])

    gl.clearColor(1, 0.373, 1, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.useProgram(program)
    gl.bindVertexArray(geom.vao)
    gl.uniform4fv(gl.getUniformLocation(program, 'color'), IlliniBlue)
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'mv'), false, m4mul(v,m))
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'p'), false, p)
    gl.drawElements(geom.mode, geom.count, geom.type, 0)
    window.pending = requestAnimationFrame(draw1)
}
/**
 * Animation callback for the second display. See {draw1} for more.
 *
 * Fills the screen with Illini Blue
 */
function draw2() {
    gl.clearColor(...IlliniBlue)
    gl.clear(gl.COLOR_BUFFER_BIT)
    window.pending = requestAnimationFrame(draw2)
}

/** Callback for when the radio button selection changes */
function radioChanged() {
    let chosen = document.querySelector('input[name="example"]:checked').value
    cancelAnimationFrame(window.pending)
    window.pending = requestAnimationFrame(window['draw'+chosen])
}

/** Resizes the canvas to be a square that fits on the screen with at least 20% vertical padding */
function resizeCanvas() {
    let c = document.querySelector('canvas')
    c.width = c.parentElement.clientWidth
    c.height = document.documentElement.clientHeight * 0.8
    console.log(c.width, c.height)
    if (c.width > c.height) c.width = c.height
    else c.height = c.width
    if (window.gl) {
        gl.viewport(0,0, c.width, c.height)
        window.p = m4perspNegZ(0.1, 10, 0.5, c.width, c.height)
        
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
async function setup() {
    window.gl = document.querySelector('canvas').getContext('webgl2')
    resizeCanvas()
    let vs = await fetch('mp2-vertex.glsl').then(res => res.text())
    let fs = await fetch('mp2-fragment.glsl').then(res => res.text())
    window.program = compileAndLinkGLSL(vs, fs)
    let logo = await fetch('logo.json').then(res => res.json())

    window.geom = setupGeomery(logo)
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    document.querySelectorAll('input[name="example"]').forEach(elem => {
        elem.addEventListener('change', radioChanged)
    })
    radioChanged()

}
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

function supplyDataBuffer(data, program, vsIn, mode) {
    if (mode === undefined) mode = gl.STATIC_DRAW
    
    let buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    let f32 = new Float32Array(data.flat())
    gl.bufferData(gl.ARRAY_BUFFER, f32, mode)
    
    let loc = gl.getAttribLocation(program, vsIn)
    gl.vertexAttribPointer(loc, data[0].length, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(loc)
    
    return buf;
}

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