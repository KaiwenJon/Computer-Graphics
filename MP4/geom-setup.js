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

// for spheriod weathering: given a vertex, calculate the average Z of its neighbors.
function getNeighborAverageZ(index, array){
    let resolution = Math.sqrt(array.length)
    let neighborSumZ = 0
    if(index == 0){
        // top left corner
        neighborSumZ += array[index+1][2]
        neighborSumZ += array[index+resolution][2]
        neighborSumZ += array[index+resolution+1][2]
        neighborSumZ /= 3
    }
    else if(index == resolution - 1){
        // top right corner
        neighborSumZ += array[index-1][2]
        neighborSumZ += array[index+resolution][2]
        neighborSumZ += array[index+resolution-1][2]
        neighborSumZ /= 3
    }
    else if(index == resolution * (resolution - 1)){
        // bottom left corner
        neighborSumZ += array[index+1][2]
        neighborSumZ += array[index-resolution+1][2]
        neighborSumZ += array[index-resolution][2]
        neighborSumZ /= 3
    }
    else if(index == resolution * resolution - 1){
        // bottom right corner
        neighborSumZ += array[index-1][2]
        neighborSumZ += array[index-resolution][2]
        neighborSumZ += array[index-resolution-1][2]
        neighborSumZ /= 3
    }
    else if(index < resolution){
        // top row
        neighborSumZ += array[index-1][2]
        neighborSumZ += array[index+1][2]
        neighborSumZ += array[index+resolution][2]
        neighborSumZ += array[index+resolution-1][2]
        neighborSumZ += array[index+resolution+1][2]
        neighborSumZ /= 5
    }
    else if(index >= resolution * (resolution-1)){
        // bottom row
        neighborSumZ += array[index-1][2]
        neighborSumZ += array[index+1][2]
        neighborSumZ += array[index-resolution][2]
        neighborSumZ += array[index-resolution-1][2]
        neighborSumZ += array[index-resolution+1][2]
        neighborSumZ /= 5
    }
    else if(index % resolution == 0){
        // left col
        neighborSumZ += array[index+1][2]
        neighborSumZ += array[index-resolution][2]
        neighborSumZ += array[index+resolution][2]
        neighborSumZ += array[index-resolution+1][2]
        neighborSumZ += array[index+resolution+1][2]
        neighborSumZ /= 5
    }
    else if(index % resolution == (resolution-1)){
        // right col
        neighborSumZ += array[index-1][2]
        neighborSumZ += array[index-resolution][2]
        neighborSumZ += array[index+resolution][2]
        neighborSumZ += array[index-resolution-1][2]
        neighborSumZ += array[index+resolution-1][2]
        neighborSumZ /= 5

    }
    else{
        // middle
        neighborSumZ += array[index-1][2]
        neighborSumZ += array[index+1][2]
        neighborSumZ += array[index-resolution][2]
        neighborSumZ += array[index+resolution][2]
        neighborSumZ += array[index-resolution-1][2]
        neighborSumZ += array[index-resolution+1][2]
        neighborSumZ += array[index+resolution-1][2]
        neighborSumZ += array[index+resolution+1][2]
        neighborSumZ /= 8
    }
    return neighborSumZ
}

// spehrodal weathering
function spheroidalWeathering(terrain, iteration){
    for(let i=0; i<iteration; i++){
        newPosition = []
        terrain.attributes.position.forEach(([x, y, z], index, array)=>{
            let neighborAverageZ = getNeighborAverageZ(index, array)
            let weight = 0.2
            let newZ = (1-weight) * z + weight * neighborAverageZ
            newPosition.push([x, y, newZ])
        })
        terrain.attributes.position = newPosition
    }
    return terrain
}

// function hydraulicErosion(terrain, iteration){
//     terrain.waterVolume = []
//     terrain.sediment = []
//     terrain.attributes.position.forEach(([x, y, z], index, array)=>{
//         let neighborAverageZ = getNeighborAverageZ(index, array)
//         let weight = 0.2
//         let newZ = (1-weight) * z + weight * neighborAverageZ
//         newPosition.push([x, y, newZ])
//     })
//     return terrain
// }


// Faulting method to generate geom
function faultingTerrain(terrain, iteration){
    // faulting method
    minZ = 0
    maxZ = 0
    let offset = 0.01
    for(let i=0; i<iteration; i++){
        let point = [Math.random(), Math.random(), 0]
        let normal = [Math.cos(Math.random()*Math.PI*2), Math.sin(Math.random()*Math.PI*2), 0]
        // offset *= 0.999
        terrain.attributes.position.forEach(([x, y, z], index, array)=>{
            let dotProduct = dot(sub([x, y, 0], point), normal)
            let r = Math.abs(dotProduct/mag(normal))
            let R = 0.3
            g = (r > R) ? 0 : Math.pow(1- r*r/R/R, 2)
            if(dotProduct >=0){
                let newZ = z + offset * g
                array[index] = [x, y, newZ]
                maxZ = Math.max(maxZ, newZ)
            }
            else{
                let newZ = z - offset * g
                array[index] = [x, y, newZ]
                minZ = Math.min(minZ, newZ)
            }
        })
    }
    terrain.attributes.position.forEach(([x, y, z], index, array)=>{
        let h = 0.2
        array[index] = [x, y, (z-minZ)*h/(maxZ-minZ)-h/2]
    })
    return terrain

}

// init: make resolution * resolution grid
function makeGrid(resolution) {
    var terrain =
        {"attributes":
            {"position":[]
            ,"color":[]
            ,"aTexCoord":[]
            },
        "triangles":[]
        }
    for(let i=0; i<resolution; i++){
        for(let j=0; j<resolution; j++){
            terrain.attributes.position.push([i/(resolution-1), j/(resolution-1), 0])
            terrain.attributes.color.push([0.6, 0.3, 0.1, 1])
            terrain.attributes.aTexCoord.push([i/(resolution-1), j/(resolution-1), 0])
        }
    }
    for(let i=0; i<resolution-1; i++){
        for(let j=0; j<resolution-1; j++){
            let index = i*resolution+j
            terrain.triangles.push([index, index+resolution, index+1])
            terrain.triangles.push([index+1, index+resolution, index+resolution+1])
        }
    }

    return terrain
}


function loadTexture(){
    let slot = 0; // or a larger integer if this isn't the only texture
    let texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + slot);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(
        gl.TEXTURE_2D, // destination slot
        0, // the mipmap level this data provides; almost always 0
        gl.RGBA, // how to store it in graphics memory
        gl.RGBA, // how it is stored in the image object
        gl.UNSIGNED_BYTE, // size of a single pixel-color in HTML
        window.img, // source data
    );
    gl.generateMipmap(gl.TEXTURE_2D)
}