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
    def __init__(self, x, y, z, w, r, g, b):
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

        self.NDCSpace = {}
        self.NDCSpace["x"] = x / w
        self.NDCSpace["y"] = y / w
        self.NDCSpace["z"] = z / w
        self.NDCSpace["w"] = 1 / w
        self.NDCSpace["r"] = r / w
        self.NDCSpace["g"] = g / w
        self.NDCSpace["b"] = b / w

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
        self.current_rgb = (255, 255, 255)
        self.tri = []
        self.enableDepthBuffer = False
        self.enableSRGB = False
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
            
            

    def draw(self):
        for tri in self.tri:
            print(tri)
            for vertex in tri.vertices:
                vertex.toScreenSpace(self.w, self.h)
                # print(vertex)
            pixels = self.DDA(tri)
            for pixel in pixels:
                xs = pixel[0]
                ys = pixel[1]
                z = tri.getInterpolation(attribute="z", space="screenSpace", xs=xs, ys=ys)
                if(self.enableDepthBuffer):
                    if(z >= self.depthBuffer[int(ys)][int(xs)]):
                        continue
                    else:
                        self.depthBuffer[int(ys)][int(xs)] = z
                r = tri.getInterpolation(attribute="r", space="clipSpace", xs=xs, ys=ys)
                g = tri.getInterpolation(attribute="g", space="clipSpace", xs=xs, ys=ys)
                b = tri.getInterpolation(attribute="b", space="clipSpace", xs=xs, ys=ys)
                # r = 255
                # g = 255
                # b = 255
                print(xs, ys, r, g, b)
                self.image.im.putpixel((int(xs), int(ys)), (int(r), int(g), int(b), 255))



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
            r = self.current_rgb[0]
            g = self.current_rgb[1]
            b = self.current_rgb[2]
            vertex = Vertex(x, y, z, w, r, g, b)
            self.vertexBuffer.append(vertex)
            # self.image.im.putpixel((x, y), (r, g, b, 255))
        elif(keyword == "rgb"):
            r = float(info[1])
            g = float(info[2])
            b = float(info[3])
            self.current_rgb = (r, g, b)
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
            self.depthBuffer = np.ones((self.h, self.w))
        elif(keyword == "sRGB"):
            self.enableSRGB = True
            
                    
            

        
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