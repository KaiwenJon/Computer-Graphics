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
function initialScan(objText){
    const lines = objText.split('\n')
    let maxPosValue = 0
    let normal_enabled = false
    let texture_enabled = false
    let has_multiple_f = false
    for(let i=0; i<lines.length; i++){
        const line = lines[i]
        const words = line.split(/\s+/)
        const keyword = words[0]
        if(keyword === 'v'){
            let pos = (words.slice(1, 4)).map(parseFloat)
            maxPosValue = Math.max(maxPosValue, Math.max(...pos))
        }
        else if(keyword === 'vn'){
            normal_enabled = true
        }
        else if(keyword === 'vt'){
            texture_enabled = true
        }
        else if(keyword === 'f'){
            if(words.length > 4){
                has_multiple_f = true
            }
        }
    }
    return [maxPosValue, normal_enabled, texture_enabled, has_multiple_f]
}
async function readOBJFile(objText){
    if(objText == null){
        return
    }
    var model =
        {"attributes":
            {"position":[]
            ,"color":[]
            },
        "triangles":[]
        }
    const [maxPosValue, normal_enabled, texture_enabled, has_multiple_f] = initialScan(objText)
    const lines = objText.split('\n')
    let vnArray = []
    let vtArray = []
    let vn_vt_lookup = {}
    let vertexNum = 0
    for(let i=0; i<lines.length; i++){
        const line = lines[i]
        const words = line.split(/\s+/)
        const keyword = words[0]
        if(keyword === 'v'){
            vertexNum += 1
            let color = null
            if(words.length > 4){
                color = (words.slice(4, 7)).map(parseFloat)
            }
            else{
                color = [0.2, 0.8, 0.2, 1]
            }
            let pos = (words.slice(1, 4)).map(parseFloat).map((val) => val*(0.5/maxPosValue))
            pos[0] += 0.5
            pos[1] += 0.5
            pos[2] += 0.5
            model.attributes.position.push(pos)
            model.attributes.color.push(color)
        }
        else if(keyword === 'vn'){
            vnArray.push((words.slice(1, 4)).map(parseFloat))
        }
        else if(keyword === 'vt'){
            vtArray.push((words.slice(1, 3)).map(parseFloat))
        }
        else if (keyword === 'f'){
            if(normal_enabled && texture_enabled){
                // both are enabled
                // add index buffer
                indices = ['f']
                for(let i=0; i<words.length-1; i++){
                    const [ind, tex, norm] = words[i+1].split('/')
                    if(!(ind in vn_vt_lookup)){
                        vn_vt_lookup[ind] = [tex, norm]
                    }
                    indices.push(ind)
                }
                // console.log(indices)
                model.triangles.push((indices.slice(1, 4)).map((str) => parseInt(str, 10) - 1))
                if(has_multiple_f){
                    for(let i=0; i<indices.length - 4; i++){
                        tri = []
                        tri.push(indices[1])
                        tri.push(indices[i+3])
                        tri.push(indices[i+4])
                        model.triangles.push(tri.map((str) => parseInt(str, 10) - 1))
                    }
                }
                
            }
            else if(normal_enabled){
                // only normal is enabled
                // add index buffer
                indices = ['f']
                for(let i=0; i<words.length-1; i++){
                    const [ind, norm] = words[i+1].split('//')
                    if(!(ind in vn_vt_lookup)){
                        vn_vt_lookup[ind] = [null, norm]
                    }
                    indices.push(ind)
                }
                // console.log(indices)
                model.triangles.push((indices.slice(1, 4)).map((str) => parseInt(str, 10) - 1))
                if(has_multiple_f){
                    for(let i=0; i<indices.length - 4; i++){
                        tri = []
                        tri.push(indices[1])
                        tri.push(indices[i+3])
                        tri.push(indices[i+4])
                        model.triangles.push(tri.map((str) => parseInt(str, 10) - 1))
                    }
                }
            }
            else if(texture_enabled){
                // only texture is enabled
                // add index buffer
                indices = ['f']
                for(let i=0; i<words.length-1; i++){
                    const [ind, tex] = words[i+1].split('/')
                    if(!(ind in vn_vt_lookup)){
                        vn_vt_lookup[ind] = [tex, null]
                    }
                    indices.push(ind)
                }
                // console.log(indices)
                model.triangles.push((indices.slice(1, 4)).map((str) => parseInt(str, 10) - 1))
                if(has_multiple_f){
                    for(let i=0; i<indices.length - 4; i++){
                        tri = []
                        tri.push(indices[1])
                        tri.push(indices[i+3])
                        tri.push(indices[i+4])
                        model.triangles.push(tri.map((str) => parseInt(str, 10) - 1))
                    }
                }
            }
            else{
                // both are not enabled
                model.triangles.push((words.slice(1, 4)).map((str) => parseInt(str, 10) - 1))
                if(has_multiple_f){
                    for(let i=0; i<words.length - 4; i++){
                        tri = []
                        tri.push(words[1])
                        tri.push(words[i+3])
                        tri.push(words[i+4])
                        model.triangles.push(tri.map((str) => parseInt(str, 10) - 1))
                    }
                }
            }
        }
    }
    let vs = null
    let fs = null
    // console.log(vn_vt_lookup)
    // Add Normal and texture buffer!
    if(normal_enabled && texture_enabled){
        // both are enabled
        normals = []
        textures = []
        for(let i=0; i<vertexNum; i++){
            let [tex, norm] = vn_vt_lookup[(i+1).toString()]
            normals.push(vnArray[parseInt(norm)-1])
            textures.push(vnArray[parseInt(tex)-1])
            model.attributes.normal = normals
            model.attributes.aTexCoord = textures
        }
        vs = await fetch('./shaders/vertex.glsl', {cache: "no-cache"}).then(res => res.text())
        fs = await fetch('./shaders/fragment.glsl', {cache: "no-cache"}).then(res => res.text())
    }
    else if(normal_enabled){
        // only normal is enabled
        normals = []
        for(let i=0; i<vertexNum; i++){
            let [tex, norm] = vn_vt_lookup[(i+1).toString()]
            normals.push(vnArray[parseInt(norm)-1])
            model.attributes.normal = normals
        }
        vs = await fetch('./shaders/vertexOBJ.glsl', {cache: "no-cache"}).then(res => res.text())
        fs = await fetch('./shaders/fragmentOBJ.glsl', {cache: "no-cache"}).then(res => res.text())
    }
    else if(texture_enabled){
        // only texture is enabled
        textures = []
        for(let i=0; i<vertexNum; i++){
            let [tex, norm] = vn_vt_lookup[(i+1).toString()]
            textures.push(vnArray[parseInt(tex)-1])
            model.attributes.aTexCoord = textures
        }
        vs = await fetch('./shaders/vertex.glsl', {cache: "no-cache"}).then(res => res.text())
        fs = await fetch('./shaders/fragment.glsl', {cache: "no-cache"}).then(res => res.text())
        addNormals(model)
    }
    else{
        // both are not enabled
        vs = await fetch('./shaders/vertexOBJ.glsl', {cache: "no-cache"}).then(res => res.text())
        fs = await fetch('./shaders/fragmentOBJ.glsl', {cache: "no-cache"}).then(res => res.text()) 
        addNormals(model)
    }
    if(texture_enabled){
        img.src = objFile.replace(/\.obj$/, ".jpg");
    }
    window.programOBJ = compileAndLinkGLSL(vs, fs)
    window.geomOBJ = setupGeomery(model, programOBJ)
}