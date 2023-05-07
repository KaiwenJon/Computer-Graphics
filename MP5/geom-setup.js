// compile and link GL, doesnt need to be changed.
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

// set up data buffer using geom.attributes
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
function setupGeomery(geom, program) {
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

// after positions and triangles are specified, add normals and stick to same orientation.
function addNormals(data) {
    let normals = new Array(data.attributes.position.length)
    for(let i=0; i<normals.length; i+=1) normals[i] = new Array(3).fill(0)
    for([i0,i1,i2] of data.triangles) {
        // find the vertex positions
        let p0 = data.attributes.position[i0]
        let p1 = data.attributes.position[i1]
        let p2 = data.attributes.position[i2]
        // find the edge vectors and normal
        let e0 = sub(p0,p2)
        let e1 = sub(p1,p2)
        let n = cross(e0,e1)
        // loop over x, y and z
        for(let j=0; j<3; j+=1) {
            // add a coordinate of a normal to each of the three normals
            normals[i0][j] += n[j]
            normals[i1][j] += n[j]
            normals[i2][j] += n[j]
        }
    }
    for(let i=0; i<normals.length; i+=1) normals[i] = normalize(normals[i])
    data.attributes.normal = normals;
}
