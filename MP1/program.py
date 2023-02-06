import sys
from PIL import Image, ImageColor
import numpy as np
import math

class Triangle:
    def __init__(self):
        self.vertices = []
    def addVertex(self, Vertex):
        self.vertices.append(Vertex)
    def getInterpolation(self, attribute, space, xs, ys):
        # assert (xs, ys) is within the triangle
        # solve for alpha, beta
        va = self.vertices[0]
        vb = self.vertices[1]
        vc = self.vertices[2]
        A = np.array([[vb.screenSpace["x"] - va.screenSpace["x"], vc.screenSpace["x"] - va.screenSpace["x"]],
                      [vb.screenSpace["y"] - va.screenSpace["y"], vc.screenSpace["y"] - va.screenSpace["y"]]]) 
        b = np.array([[xs - va.screenSpace["x"]],
                      [ys - va.screenSpace["y"]]])       
        [alpha, beta] = np.linalg.inv(A) @ b
        if(space == "clipSpace"):
            P_attribute = alpha * (vb.clipSpace[attribute] - va.clipSpace[attribute]) + beta * (vc.clipSpace[attribute] - va.clipSpace[attribute]) + va.clipSpace[attribute]
        elif(space == "NDCSpace"):
            P_attribute = alpha * (vb.NDCSpace[attribute] - va.NDCSpace[attribute]) + beta * (vc.NDCSpace[attribute] - va.NDCSpace[attribute]) + va.NDCSpace[attribute]
        elif(space == "screenSpace"):
            P_attribute = alpha * (vb.screenSpace[attribute] - va.screenSpace[attribute]) + beta * (vc.screenSpace[attribute] - va.screenSpace[attribute]) + va.screenSpace[attribute]
        
        return P_attribute
        
        
class Vertex:
    def __init__(self, x, y, z, w, r, g, b, a):
        self.clipSpace = None
        self.NDCSpae = None
        self.screenSpace = None

        self.clipSpace = {}
        self.clipSpace["x"] = x 
        self.clipSpace["y"] = y 
        self.clipSpace["z"] = z 
        self.clipSpace["w"] = w
        self.clipSpace["r"] = r
        self.clipSpace["g"] = g
        self.clipSpace["b"] = b
        self.clipSpace["a"] = a

    def toNDCSpace(self):
        self.NDCSpace = {}
        self.NDCSpace["x"] = self.clipSpace["x"] / self.clipSpace["w"]
        self.NDCSpace["y"] = self.clipSpace["y"] / self.clipSpace["w"]
        self.NDCSpace["z"] = self.clipSpace["z"] / self.clipSpace["w"]
        self.NDCSpace["w"] = 1 / self.clipSpace["w"]
        self.NDCSpace["r"] = self.clipSpace["r"] / self.clipSpace["w"]
        self.NDCSpace["g"] = self.clipSpace["g"] / self.clipSpace["w"]
        self.NDCSpace["b"] = self.clipSpace["b"] / self.clipSpace["w"]
        self.NDCSpace["a"] = self.clipSpace["a"] / self.clipSpace["w"]

    def toScreenSpace(self, width, height):
        assert (self.NDCSpace != None)
        self.screenSpace = {}
        self.screenSpace["x"] = (self.NDCSpace["x"] + 1) * width/2
        self.screenSpace["y"] = (self.NDCSpace["y"] + 1) * height/2
        self.screenSpace["z"] = (self.NDCSpace["z"] + 1) / 2 # I don't know why
        self.screenSpace["w"] = self.NDCSpace["w"]
        self.screenSpace["r"] = self.NDCSpace["r"]
        self.screenSpace["g"] = self.NDCSpace["g"]
        self.screenSpace["b"] = self.NDCSpace["b"]
        self.screenSpace["a"] = self.NDCSpace["a"]


    def __str__(self):
        print(self.clipSpace)
        print(self.NDCSpace)
        print(self.screenSpace)
        return ""






class PNG:
    def __init__(self, inputFile):
        print("\nProcessing ", inputFile)
        self.w = 0
        self.h = 0
        self.outputFile = ""
        self.image = None
        self.vertexBuffer = []
        self.current_rgba = (1, 1, 1, 1)
        self.tri = []
        self.clipplane = []
        self.enableDepthBuffer = False
        self.enableSRGB = False
        self.enableCull = False
        self.enablePersp = False
        self.enableAlphaBlending = False
        self.enableFsaa = False
        self.blendingBuffer = []
        self.largerImage = None
        with open(inputFile) as f:
            lines = f.readlines()
            for line in lines:
                self.readKeyword(line)
        
        self.draw()
        self.image.save(self.outputFile)
    # def gamma_correction(self, type):
    #     if(type == "storeTodisplay"):
            
    def DDA_one_direction(self, pt1, pt2, direction, pixelBuffer):
        if(direction == "x"):
            id = 0
        elif(direction == "y"):
            id = 1
        if(pt1[id] > pt2[id]):
            pt1, pt2 = pt2, pt1
        # print(pt1)
        # print(pt2)
        delta = np.array([pt2[0] - pt1[0], pt2[1] - pt1[1]])
        if(delta[id] == 0):
            return
        s = delta / delta[id]
        e = math.ceil(pt1[id]) - pt1[id]
        o = e * s
        p = pt1 + o
        # print("pt1", pt1)
        # print("pt2", pt2)
        # print("delta", delta)
        # print(s[0]**2 + s[1]**2)
        # print("s", s)
        # print("e", e)
        # print("o", o)
        # print("p", p)
        while(p[id] < pt2[id]):
            pixelBuffer.append(p)
            # print(p[id])
            p = p + s

    def DDA(self, triangle):
        self.pixels = []
        vertices = sorted(triangle.vertices, key=lambda vertex: vertex.screenSpace["y"])
        va = vertices[0]
        vb = vertices[1]
        vc = vertices[2]
        pta = np.array([va.screenSpace["x"], va.screenSpace["y"]])
        ptb = np.array([vb.screenSpace["x"], vb.screenSpace["y"]])
        ptc = np.array([vc.screenSpace["x"], vc.screenSpace["y"]])
        # print(va)
        # print(vb)
        # print(vc)
        pixelBuffer1 = []
        pixelBuffer2 = []
        self.DDA_one_direction(pta, ptb, direction="y", pixelBuffer=pixelBuffer1)
        self.DDA_one_direction(ptb, ptc, direction="y", pixelBuffer=pixelBuffer1)
        self.DDA_one_direction(pta, ptc, direction="y", pixelBuffer=pixelBuffer2)
        # print(len(pixelBuffer1))
        # print(len(pixelBuffer2))
        # edge2 = self.DDA_one_direction(pta, ptc)

        pixelBufferOutput = []
        for ptm, ptn in zip(pixelBuffer1, pixelBuffer2):
            self.DDA_one_direction(ptm ,ptn, direction="x", pixelBuffer=pixelBufferOutput)
        
        return pixelBufferOutput
            
    def checkOrient(self, tri):
        v1 = tri.vertices[0]
        v2 = tri.vertices[1]
        v3 = tri.vertices[2]   
        vector1 = np.array([v2.screenSpace["x"] - v1.screenSpace["x"], v2.screenSpace["y"] - v1.screenSpace["y"], 0])         
        vector2 = np.array([v3.screenSpace["x"] - v2.screenSpace["x"], v3.screenSpace["y"] - v2.screenSpace["y"], 0])         
        cross_product = np.cross(vector1, vector2)
        if(cross_product[2] > 0):
            orient = "CW"
        elif(cross_product[2] < 0):
            orient = "CCW"
        return orient

    def clipTriangle(self, triangle, plane):
        def getIntersectPoint(vertex1, vertex2, plane):
            geometry1 = np.array([vertex1.clipSpace["x"], vertex1.clipSpace["y"], vertex1.clipSpace["z"], vertex1.clipSpace["w"]])
            geometry2 = np.array([vertex2.clipSpace["x"], vertex2.clipSpace["y"], vertex2.clipSpace["z"], vertex2.clipSpace["w"]])
            signed_dist1 = np.dot(geometry1, plane)
            signed_dist2 = np.dot(geometry2, plane)
            assert (np.sign(signed_dist1) * np.sign(signed_dist2) < 0)
            new_x = (vertex1.clipSpace["x"] * signed_dist2 - vertex2.clipSpace["x"] * signed_dist1)/(signed_dist2 - signed_dist1)
            new_y = (vertex1.clipSpace["y"] * signed_dist2 - vertex2.clipSpace["y"] * signed_dist1)/(signed_dist2 - signed_dist1)
            new_z = (vertex1.clipSpace["z"] * signed_dist2 - vertex2.clipSpace["z"] * signed_dist1)/(signed_dist2 - signed_dist1)
            new_w = (vertex1.clipSpace["w"] * signed_dist2 - vertex2.clipSpace["w"] * signed_dist1)/(signed_dist2 - signed_dist1)
            new_r = (vertex1.clipSpace["r"] * signed_dist2 - vertex2.clipSpace["r"] * signed_dist1)/(signed_dist2 - signed_dist1)
            new_g = (vertex1.clipSpace["g"] * signed_dist2 - vertex2.clipSpace["g"] * signed_dist1)/(signed_dist2 - signed_dist1)
            new_b = (vertex1.clipSpace["b"] * signed_dist2 - vertex2.clipSpace["b"] * signed_dist1)/(signed_dist2 - signed_dist1)
            new_a = (vertex1.clipSpace["a"] * signed_dist2 - vertex2.clipSpace["a"] * signed_dist1)/(signed_dist2 - signed_dist1)
            newVertex = Vertex(new_x, new_y, new_z, new_w, new_r, new_g, new_b, new_a)
            return newVertex
        vertices_plane_test = {
            "out": [],
            "on": [],
            "in": []
        }
        for vertex in triangle.vertices:
            geometry = np.array([vertex.clipSpace["x"], vertex.clipSpace["y"], vertex.clipSpace["z"], vertex.clipSpace["w"]])
            signed_distance = np.dot(geometry, plane)
            if(signed_distance < 0):
                scenario = "out"
            elif(signed_distance == 0):
                scenario = "on"
            elif(signed_distance > 0):
                scenario = "in"
            vertices_plane_test[scenario].append(vertex)
        assert (len(vertices_plane_test["out"]) + len(vertices_plane_test["on"]) + len(vertices_plane_test["in"]) == 3)
        if(len(vertices_plane_test["out"]) == 0):
            # safe
            return [triangle]
        elif(len(vertices_plane_test["out"]) + len(vertices_plane_test["on"]) == 3):
            # discard the entire triangle
            return []
        elif(len(vertices_plane_test["out"]) == 2):
            # return a new triangle
            intersect1 = getIntersectPoint(vertices_plane_test["out"][0], vertices_plane_test["in"][0], plane)
            intersect2 = getIntersectPoint(vertices_plane_test["out"][1], vertices_plane_test["in"][0], plane)
            new_triangle = Triangle()
            new_triangle.addVertex(vertices_plane_test["in"][0])
            new_triangle.addVertex(intersect1)
            new_triangle.addVertex(intersect2)
            return [new_triangle]   
        elif(len(vertices_plane_test["out"]) == 1):
            if(len(vertices_plane_test["on"]) == 1):
                # return a new triangle
                intersect = getIntersectPoint(vertices_plane_test["out"][0], vertices_plane_test["in"][0], plane)
                new_triangle = Triangle()
                new_triangle.addVertex(vertices_plane_test["in"][0])
                new_triangle.addVertex(vertices_plane_test["on"][0])
                new_triangle.addVertex(intersect)
                return [new_triangle]
            else:
                # return two triangles
                intersect1 = getIntersectPoint(vertices_plane_test["in"][0], vertices_plane_test["out"][0], plane)
                intersect2 = getIntersectPoint(vertices_plane_test["in"][1], vertices_plane_test["out"][0], plane)
                new_triangle1 = Triangle()
                new_triangle1.addVertex(vertices_plane_test["in"][0])
                new_triangle1.addVertex(vertices_plane_test["in"][1])
                new_triangle1.addVertex(intersect1)
                new_triangle2 = Triangle()
                new_triangle2.addVertex(vertices_plane_test["in"][1])
                new_triangle2.addVertex(intersect1)
                new_triangle2.addVertex(intersect2)
                return [new_triangle1, new_triangle2]
            
                    
    
    
    
    def draw(self):
        if(len(self.clipplane) != 0):
            for plane in self.clipplane:
                tri_list = self.tri
                new_tri_list = []
                for tri in tri_list:
                    new_triangles = self.clipTriangle(tri, plane)
                    new_tri_list.extend(new_triangles)
                self.tri = new_tri_list

        for tri in self.tri:
            for vertex in tri.vertices:
                vertex.toNDCSpace()
                vertex.toScreenSpace(self.w, self.h)
            if(self.enableCull):
                orient = self.checkOrient(tri)
                if(orient == "CW"):
                    continue
            print(tri)
                # print(vertex)
            pixels = self.DDA(tri)
            for pixel in pixels:
                xs = pixel[0]
                ys = pixel[1]
                z = tri.getInterpolation(attribute="z", space="screenSpace", xs=xs, ys=ys)
                if(self.enableDepthBuffer):
                    if(z > self.depthBuffer[int(ys)][int(xs)]):
                        continue
                    else:
                        self.depthBuffer[int(ys)][int(xs)] = z

                if(self.enablePersp):
                    r = tri.getInterpolation(attribute="r", space="screenSpace", xs=xs, ys=ys)
                    g = tri.getInterpolation(attribute="g", space="screenSpace", xs=xs, ys=ys)
                    b = tri.getInterpolation(attribute="b", space="screenSpace", xs=xs, ys=ys)
                    a = tri.getInterpolation(attribute="a", space="screenSpace", xs=xs, ys=ys)
                    w = tri.getInterpolation(attribute="w", space="screenSpace", xs=xs, ys=ys)
                    r /= w
                    g /= w
                    b /= w
                    a /= w
                else:
                    r = tri.getInterpolation(attribute="r", space="clipSpace", xs=xs, ys=ys)
                    g = tri.getInterpolation(attribute="g", space="clipSpace", xs=xs, ys=ys)
                    b = tri.getInterpolation(attribute="b", space="clipSpace", xs=xs, ys=ys)
                    a = tri.getInterpolation(attribute="a", space="clipSpace", xs=xs, ys=ys)
                    
                # r = 255
                # g = 255
                # b = 255
                # print(xs, ys, r, g, b)
                if(not self.enableAlphaBlending):
                    # Don't do blending buffer
                    self.fillPixels(xs, ys, r, g, b, a, srgb=self.enableSRGB, fillOutput= not self.enableFsaa)
                else:
                    # Put in PNG later
                    self.blendingBuffer[int(ys)][int(xs)].append(np.array([z ,r, g, b, a]))
        if(self.enableAlphaBlending):
            assert(self.enableSRGB == True)
            for ys in range(self.h):
                for xs in range(self.w):
                    color_points = self.blendingBuffer[ys][xs]
                    if(len(color_points) == 0):
                        continue
                    color_points = sorted(np.array(color_points), key=lambda colorPoint: colorPoint[0], reverse=False) # sorted by z
                    current_r = color_points[0][1]
                    current_g = color_points[0][2]
                    current_b = color_points[0][3]
                    current_a = color_points[0][4]
                    for i in range(1, len(color_points)):
                        new_r = color_points[i][1]
                        new_g = color_points[i][2]
                        new_b = color_points[i][3]
                        new_a = color_points[i][4]

                        output_a = new_a + current_a * (1 - new_a)
                        output_r = new_a/output_a * new_r + (1 - new_a) * current_a/output_a * current_r
                        output_g = new_a/output_a * new_g + (1 - new_a) * current_a/output_a * current_g
                        output_b = new_a/output_a * new_b + (1 - new_a) * current_a/output_a * current_b

                        current_a = output_a
                        current_r = output_r
                        current_g = output_g
                        current_b = output_b
                    self.fillPixels(xs, ys, current_r, current_g, current_b, current_a, srgb=True, fillOutput= not self.enableFsaa)
        if(self.enableFsaa):
            self.averageFsaa()
    def fillPixels(self, xs, ys, r, g, b, a, srgb, fillOutput):
        if(fillOutput):
            if(srgb):
                r = self.gammaCorrect(r, type="displayToStorage")
                g = self.gammaCorrect(g, type="displayToStorage")
                b = self.gammaCorrect(b, type="displayToStorage")
            r *= 255
            g *= 255
            b *= 255
            a *= 255
            self.image.im.putpixel((int(xs), int(ys)), (int(r), int(g), int(b), int(a)))
        elif(not fillOutput):
            # we will do gamma correct later
            r *= 255
            g *= 255
            b *= 255
            a *= 255
            self.largerImage.im.putpixel((int(xs), int(ys)), (int(r), int(g), int(b), int(a)))
        

    def averageFsaa(self):
        # USe the result in larger PNG, gamma correct, and put pixel in self.image
        # self.largerImage.getpixel((4, 6))
        output_w, output_h = self.image.size
        for ys in range(output_h):
            for xs in range(output_w):
                r = 0
                g = 0
                b = 0
                a = 0
                sum_alpha = 0
                for i in range(ys*self.level, ys*self.level + self.level):
                    for j in range(xs*self.level, xs*self.level + self.level):
                        alpha = self.largerImage.getpixel((j, i))[3]/255
                        r += self.largerImage.getpixel((j, i))[0]/255 * alpha
                        g += self.largerImage.getpixel((j, i))[1]/255 * alpha
                        b += self.largerImage.getpixel((j, i))[2]/255 * alpha
                        a += self.largerImage.getpixel((j, i))[3]/255 * alpha
                        sum_alpha += alpha
                if(sum_alpha == 0):
                    continue
                r /= sum_alpha
                g /= sum_alpha
                b /= sum_alpha
                a /= self.level**2
                self.fillPixels(xs, ys, r, g, b, a, srgb=True, fillOutput=True)
        

    def gammaCorrect(self, color, type):
        if(type == "storageToDisplay"):
            Lstorage = color
            if(Lstorage <= 0.04045):
                Ldisplay = Lstorage/12.92
            else:
                Ldisplay = ((Lstorage+0.055)/1.055)**2.4
            return Ldisplay
        elif(type == "displayToStorage"):
            Ldisplay = color
            if(Ldisplay <= 0.0031308):
                Lstorage = 12.92 * Ldisplay
            else:
                Lstorage = 1.055 * Ldisplay**(1/2.4) - 0.055
            return Lstorage
        else:
            print("Please specify type correctly")

    def readKeyword(self, line):
        if(line == "\n" or line == " "):
            return
        if(line[-1:] == "\n"):
            line = line[:-1]
        info = line.split()
        print(info)
        keyword = info[0]
        if(keyword == "png"):
            self.w = int(info[1])
            self.h = int(info[2])
            self.outputFile = info[3]
            self.image = Image.new("RGBA", (self.w, self.h), (0,0,0,0))
        elif(keyword == "xyzw"):
            x = float(info[1])
            y = float(info[2])
            z = float(info[3])
            w = float(info[4])
            r = self.current_rgba[0]
            g = self.current_rgba[1]
            b = self.current_rgba[2]
            a = self.current_rgba[3]
            vertex = Vertex(x, y, z, w, r, g, b, a)
            self.vertexBuffer.append(vertex)
            # self.image.im.putpixel((x, y), (r, g, b, 255))
        elif(keyword == "rgb"):
            r = float(info[1])
            g = float(info[2])
            b = float(info[3])
            r /= 255
            g /= 255
            b /= 255
            a = 1
            if(self.enableSRGB):
                r = self.gammaCorrect(r, type="storageToDisplay")
                g = self.gammaCorrect(g, type="storageToDisplay")
                b = self.gammaCorrect(b, type="storageToDisplay")
            self.current_rgba = (r, g, b, a)
        elif(keyword == "rgba"):
            r = float(info[1])
            g = float(info[2])
            b = float(info[3])
            a = float(info[4])
            r /= 255
            g /= 255
            b /= 255
            if(self.enableSRGB):
                r = self.gammaCorrect(r, type="storageToDisplay")
                g = self.gammaCorrect(g, type="storageToDisplay")
                b = self.gammaCorrect(b, type="storageToDisplay")
            self.current_rgba = (r, g, b, a)
            if(not self.enableAlphaBlending):
                self.blendingBuffer = np.empty((self.h, self.w), dtype=object)
                for i in range(self.h):
                    for j in range(self.w):
                        self.blendingBuffer[i][j] = []
                self.enableAlphaBlending = True
        elif(keyword == "tri"):
            triangle = Triangle()
            for id in info[1:4]:
                id = int(id)
                if(id < 0):
                    triangle.addVertex(self.vertexBuffer[id])
                elif(id > 0):
                    triangle.addVertex(self.vertexBuffer[id-1])
            self.tri.append(triangle)
        elif(keyword == "depth"):
            self.enableDepthBuffer = True
            self.depthBuffer = np.ones((self.h, self.w, 0))
        elif(keyword == "sRGB"):
            self.enableSRGB = True
        elif(keyword == "cull"):
            self.enableCull = True
        elif(keyword == "hyp"):
            self.enablePersp = True
        elif(keyword == "clipplane"):
            plane = np.array([float(info[1]), float(info[2]), float(info[3]), float(info[4])])
            self.clipplane.append(plane)
        elif(keyword == "frustum"):
            planes = np.array([[ 1,  0,  0,  1],
                               [-1,  0,  0,  1],
                               [ 0,  1,  0,  1],
                               [ 0, -1,  0,  1],
                               [ 0,  0,  1,  1],
                               [ 0,  0, -1,  1]])
            for plane in planes:
                self.clipplane.append(plane)
        elif(keyword == "fsaa"):
            self.enableFsaa = True
            level = int(info[1])
            self.w *= level
            self.h *= level
            self.level = level
            self.largerImage = Image.new("RGBA", (self.w, self.h), (0,0,0,0))
            self.enableFsaa = True
            
                    
            

        
if __name__ == '__main__':
    # print(sys.argv)
    inputFile = sys.argv[1]
    if(inputFile == 'implemented.txt'):
        print("Multiple files detected.")
        with open(inputFile) as f:
            files = f.readlines()
            for file in files:
                if(file[-1:] == "\n"):
                    file = file[:-1]
                png = PNG(inputFile=file)
    else:
        png = PNG(inputFile=inputFile)



# ...
# image = Image.new("RGBA", (width, height), (0,0,0,0))
# # ...
# image.im.putpixel((x,y), (red, green, blue, alpha))
# # ...
# image.save(filename)