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

    window.program = gl.createProgram()
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program))
        throw Error("Linking failed")
    }
}

// function setupGeomery(geom) {
//     var triangleArray = gl.createVertexArray()
//     gl.bindVertexArray(triangleArray)

//     Object.entries(geom.attributes).forEach(([name,data]) => {
//         let buf = gl.createBuffer()
//         gl.bindBuffer(gl.ARRAY_BUFFER, buf)
//         let f32 = new Float32Array(data.flat())
//         gl.bufferData(gl.ARRAY_BUFFER, f32, gl.STATIC_DRAW)
        
//         let loc = gl.getAttribLocation(program, name)
//         gl.vertexAttribPointer(loc, data[0].length, gl.FLOAT, false, 0, 0)
//         gl.enableVertexAttribArray(loc)
//     })

//     var indices = new Uint16Array(geom.triangles.flat())
//     var indexBuffer = gl.createBuffer()
//     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
//     gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW)

//     return {
//         mode: gl.TRIANGLES,
//         count: indices.length,
//         type: gl.UNSIGNED_SHORT,
//         vao: triangleArray
//     }
// }

function draw(milliseconds) {
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(program)
    let secondsBindPoint = gl.getUniformLocation(program, 'seconds')
    // console.log(gl.getUniform(program, secondsBindPoint))
    gl.uniform1f(secondsBindPoint, milliseconds/1000)
    const connection = gl.POINTS
    const offset = 0                          // unused here, but required
    const count = 6+(0|milliseconds/100)%100  // number of vertices to draw
    let countBindPoint = gl.getUniformLocation(program, 'count')
    gl.uniform1i(countBindPoint, count)
    gl.drawArrays(connection, offset, count)
    window.animation = requestAnimationFrame(draw)
}

async function setup(event) {
    window.gl = document.querySelector('canvas').getContext('webgl2')
    let vs = await fetch('wm2_vertex.glsl').then(res => res.text())
    let fs = await fetch('wm2_fragment.glsl').then(res => res.text())
    compileAndLinkGLSL(vs,fs)
    // let data = await fetch('./example/ex04-geometry.json').then(r=>r.json())
    // window.geom = setupGeomery(data)
    requestAnimationFrame(draw)
}

window.addEventListener('load',setup)

