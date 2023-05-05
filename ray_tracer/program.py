import sys
from PIL import Image, ImageColor
import numpy as np
import math
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle

class Light():
    def __init__(self, color, direction):
        self.color = color
        self.direction = direction
class Sphere():
    def __init__(self, x, y, z, r, color):
        self.center = np.array([x, y, z])
        self.radius = r
        self.color = color
    def __str__(self):
        return f"Sphere. center: {self.center}, radius: {self.radius}, color: {self.color}"

    def getIntersection(self, ray):
        # return t, intersection and normal
        ray_origin, ray_direction = ray
        distance_to_center = np.linalg.norm(ray_origin - self.center)
        isInside = distance_to_center < self.radius
        tc = np.dot(self.center - ray_origin, ray_direction) / np.linalg.norm(ray_direction)
        if(not isInside and tc < 0):
            return [float("inf"), None, None]
        d_2 = np.linalg.norm(ray_origin + tc * ray_direction - self.center) ** 2
        t_offset = np.sqrt(self.radius ** 2 - d_2) / np.linalg.norm(ray_direction)
        if(isInside):
            t = tc + t_offset
        else:
            t = tc - t_offset
        intersection = t * ray_direction + ray_origin
        normal = (self.center - intersection) / self.radius
        return [t, intersection, normal]
            

class PNG:
    def __init__(self, inputFile):
        print("\nProcessing ", inputFile)
        self.w = 0
        self.h = 0
        self.outputFile = ""
        self.image = None
        self.current_rgba = [1, 1, 1, 1]
        self.renderObjects = []
        self.lights = []
        self.enableSRGB = True

        with open(inputFile) as f:
            lines = f.readlines()
            for line in lines:
                self.readKeyword(line)
        
        self.start_RTX()
        self.image.save(self.outputFile)

    def start_RTX(self):
        print("Objects to be rendered:")
        for object in self.renderObjects:
            print(object)
        for xs in range(self.w):
            for ys in range(self.h):
                origin = np.array([0, 0, 0])
                forward = np.array([0, 0, -1]) # z positive -> from screen to you
                right = np.array([1, 0, 0])
                up = np.array([0, 1, 0])
                sx = (2 * xs - self.w) / max(self.w, self.h)
                sy = (self.h - 2 * ys) / max(self.w, self.h)
                direction = forward + sx * right + sy * up
                direction /= np.linalg.norm(direction)
                hit_object, t, intersection, normal = self.shoot_ray(origin, direction)
                if(hit_object is not None):
                    fragColor= np.array([0, 0, 0, 1])
                    for light in self.lights:
                        fragColor[:3] += hit_object.color[:3] * light.color * np.dot(normal, light.direction)
                    self.fillPixels(xs, ys, *fragColor, self.enableSRGB)

    def shoot_ray(self, origin, direction):
        min_t = float("inf")
        min_t_object = None
        min_t_intersection = None
        min_t_normal = None
        for object in self.renderObjects:
            t, intersection, normal = object.getIntersection(ray=[origin, direction])
            if(t < min_t):
                min_t = t
                min_t_object = object
                min_t_intersection = intersection
                min_t_normal = normal
        return [min_t_object, min_t, min_t_intersection, min_t_normal]

    def fillPixels(self, xs, ys, r, g, b, a, useSRGB):
        if(useSRGB):
            r = self.gammaCorrect(r, type="displayToStorage")
            g = self.gammaCorrect(g, type="displayToStorage")
            b = self.gammaCorrect(b, type="displayToStorage")
        r *= 255
        g *= 255
        b *= 255
        a *= 255
        self.image.im.putpixel((int(xs), int(ys)), (int(r), int(g), int(b), int(a)))

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
        keyword = info[0]
        if(keyword == "png"):
            self.w = int(info[1])
            self.h = int(info[2])
            self.outputFile = info[3]
            self.image = Image.new("RGBA", (self.w, self.h), (0,0,0,0))
        elif(keyword == "sphere"):
            x = float(info[1])
            y = float(info[2])
            z = float(info[3])
            r = float(info[4])
            sphere = Sphere(x=x, y=y, z=z, r=r, color=self.current_rgba)
            self.renderObjects.append(sphere)
        elif(keyword == "color"):
            r = float(info[1])
            g = float(info[2])
            b = float(info[3])
            a = 1
            # if(self.enableSRGB):
            #     r = self.gammaCorrect(r, type="storageToDisplay")
            #     g = self.gammaCorrect(g, type="storageToDisplay")
            #     b = self.gammaCorrect(b, type="storageToDisplay")
            self.current_rgba = [r, g, b, a]
        
        
            

        
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
    elif(inputFile == 'implemented_test.txt'):
        print("Testing...Multiple files detected.")
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