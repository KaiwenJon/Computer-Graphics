import sys
from PIL import Image, ImageColor
import numpy as np
import math
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle

class Sun():
    def __init__(self, color, direction):
        self.color = color
        self.direction = direction / np.linalg.norm(direction)
    def getDirection(self, origin):
        return self.direction
    def getLightContribution(self, hitObjectColor, normal, hitObjectLocation):
        if(np.dot(normal, self.direction) < 0):
            return np.array([0.0, 0.0, 0.0])
        contribution = hitObjectColor * self.color * np.dot(normal, self.direction)
        # contribution[contribution < 0.0] = 0.0
        return contribution
    def getDistanceToLight(self, orign):
        return float("inf")
    def __str__(self):
        return f"Sun: color:{self.color}, direction: {self.direction}"
class Bulb():
    def __init__(self, color, location):
        self.color = color
        self.location = location
    def getDirection(self, origin):
        direction = self.location - origin
        direction = direction / np.linalg.norm(direction)
        return direction
    def __str__(self):
        return f"Bulb: color:{self.color}, location: {self.location}"
    
    def getLightContribution(self, hitObjectColor, normal, hitObjectLocation):
        if(np.dot(normal, self.getDirection(hitObjectLocation)) < 0):
            return np.array([0.0, 0.0, 0.0])
        distance_square = np.sum((self.location - hitObjectLocation) ** 2)
        contribution = 1/(distance_square) * hitObjectColor * self.color * np.dot(normal, self.getDirection(hitObjectLocation))
        # contribution[contribution < 0.0] = 0.0
        return contribution
    def getDistanceToLight(self, origin):
        return np.linalg.norm(self.location - origin)

class Sphere():
    def __init__(self, x, y, z, r, color, shininess, roughness):
        self.center = np.array([x, y, z])
        self.radius = r
        self.color = color
        self.shininess = shininess
        self.roughness = roughness
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
        if(not isInside and self.radius ** 2 < d_2):
            return [float("inf"), None, None]
        t_offset = np.sqrt(self.radius ** 2 - d_2) / np.linalg.norm(ray_direction)
        if(isInside):
            t = tc + t_offset
        else:
            t = tc - t_offset
        intersection = t * ray_direction + ray_origin
        normal = (intersection - self.center) / self.radius
        if(self.roughness > 0):
            normal += np.array([np.random.normal(0, self.roughness), np.random.normal(0, self.roughness), np.random.normal(0, self.roughness)])
        normal /= np.linalg.norm(normal)
        return [t, intersection, normal]

class Plane():
    def __init__(self, color, params, shininess, roughness):
        self.color = color
        self.shininess = shininess
        self.params = params
        self.normal = params[:3] / np.linalg.norm(params[:3])
        self.roughness = roughness
        if(params[0] != 0):
            self.point = np.array([-params[3]/params[0], 0, 0])
        elif(params[1] != 0):
            self.point = np.array([0, -params[3]/params[1], 0])
        elif(params[2] != 0):
            self.point = np.array([0, 0, -params[3]/params[2]])
    def __str__(self):
        return f"Plane. params: {self.params}, color: {self.color}"
    def getIntersection(self, ray):
        # return t, intersection and normal
        ray_origin, ray_direction = ray
        if(np.dot(ray_direction, self.normal) == 0):
            return [float("inf"), None, None]
        t = np.dot(self.point - ray_origin, self.normal) / np.dot(ray_direction, self.normal)
        if(t > 0):
            intersection = t * ray_direction + ray_origin
            if(self.roughness > 0):
                normal = self.normal + np.array([np.random.normal(0, self.roughness), np.random.normal(0, self.roughness), np.random.normal(0, self.roughness)])
                normal /= np.linalg.norm(normal)
            else:
                normal = self.normal
            return [t, intersection, normal]
        else:
            return [float("inf"), None, None]

class PNG:
    def __init__(self, inputFile):
        print("\nProcessing ", inputFile)
        self.w = 0
        self.h = 0
        self.outputFile = ""
        self.image = None
        self.current_rgba = np.array([1, 1, 1, 1])
        self.renderObjects = []
        self.lights = []
        self.enableSRGB = True
        self.enableFishEye = False
        self.eye = np.array([0, 0, 0])
        self.forward = np.array([0, 0, -1])
        self.up = np.array([0, 1, 0])
        self.exposureV = None
        self.currentShininess = None
        self.currentRoughness = 0
        self.bounces = 4
        self.aaNum = 1
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
        print("Light Sources: ")
        for light in self.lights:
            print(light)
        ray_origin = self.eye
        forward = self.forward.astype(np.float64) # z positive -> from screen to you
        right = np.cross(self.forward, self.up).astype(np.float64)
        right /= np.linalg.norm(right)
        up = np.cross(right, forward).astype(np.float64)
        up /= np.linalg.norm(up)
        if(self.enableFishEye):
            forward_length = np.linalg.norm(forward)
            forward /= forward_length
        for xs in range(self.w):
            for ys in range(self.h):
                # shoot aaNum rays on this pixel, and average the color
                allRaysMissed = True
                accumulatedFragColor = np.array([0.0, 0.0, 0.0])
                for _ in range(self.aaNum):
                    if(self.aaNum == 1):
                        # shoot the midpoint of pixel
                        aa_xs = xs
                        aa_ys = ys
                    else:
                        aa_xs = xs + np.random.uniform()-0.5
                        aa_ys = ys + np.random.uniform()-0.5
                    sx = (2 * aa_xs - self.w) / max(self.w, self.h)
                    sy = (self.h - 2 * aa_ys) / max(self.w, self.h)
                    if(not self.enableFishEye):
                        ray_direction = forward + sx * right + sy * up
                        ray_direction /= np.linalg.norm(ray_direction)
                    else:
                        sx /= forward_length
                        sy /= forward_length
                        r_2 = np.linalg.norm(sx) ** 2 + np.linalg.norm(sy) ** 2
                        if(r_2 > 1):
                            continue
                        ray_direction = np.sqrt(1-r_2) * forward + sx * right + sy * up
                        ray_direction /= np.linalg.norm(ray_direction)
                    fragColor, hasHitObject = self.ray_tracing([ray_origin, ray_direction], emittingObject=None, bounces=self.bounces)
                    if(hasHitObject):
                        allRaysMissed = False
                        accumulatedFragColor += fragColor
                if(not allRaysMissed):
                    avgFragColor = accumulatedFragColor / self.aaNum
                    self.fillPixels(xs, ys, *avgFragColor, 1, self.enableSRGB)

    def getDiffuseLightWithShadows(self, hitPoint, hitObject, normal):
        diffuseColor = np.array([0.0, 0.0, 0.0])
        for light in self.lights:
            hit_object_2, t_2, intersection_2, _ = self.shoot_ray(hitPoint, light.getDirection(hitPoint), hitObject)
            distanceToHitObject = np.linalg.norm(intersection_2 - hitPoint)
            if(distanceToHitObject >= light.getDistanceToLight(hitPoint)):
                diffuseColor += light.getLightContribution(hitObject.color[:3], normal, hitPoint)
        return diffuseColor

    def ray_tracing(self, ray, emittingObject, bounces):
        # return color_at_hitPoint, hasHitObject
        ray_origin, ray_direction = ray
        hit_object, t, intersection, normal = self.shoot_ray(ray_origin, ray_direction, emittingObject)
        if(hit_object == None):
            return np.array([0.0, 0.0, 0.0]), False
        if(np.dot(ray_direction, normal) > 0):
            normal = -normal
        diffuseColor = self.getDiffuseLightWithShadows(intersection, hit_object, normal)
        if(bounces > 0 and hit_object.shininess is not None):
            ray2_origin = intersection
            ray_direction /= np.linalg.norm(ray_direction)
            ray2_direction = 2 * np.dot(normal, -ray_direction) * normal + ray_direction
            reflectedColor, _ = self.ray_tracing(ray=[ray2_origin, ray2_direction], emittingObject=hit_object, bounces=bounces-1)
            return diffuseColor * (1-hit_object.shininess) + reflectedColor * hit_object.shininess, True
        else:
            return diffuseColor, True

    def shoot_ray(self, origin, direction, emittingObject):
        min_t = float("inf")
        min_t_object = None
        min_t_intersection = np.array([float("inf"), float("inf"), float("inf")])
        min_t_normal = None
        for object in self.renderObjects:
            if(object == emittingObject):
                continue
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
            if(self.exposureV is not None):
                color = 1 - np.exp(-color * self.exposureV)
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
            sphere = Sphere(x=x, y=y, z=z, r=r, color=self.current_rgba, shininess=self.currentShininess, roughness=self.currentRoughness)
            self.renderObjects.append(sphere)
        elif(keyword == "plane"):
            a = float(info[1])
            b = float(info[2])
            c = float(info[3])
            d = float(info[4])
            plane = Plane(color=self.current_rgba, params=np.array([a, b, c, d]), shininess=self.currentShininess, roughness=self.currentRoughness)
            self.renderObjects.append(plane)
        elif(keyword == "color"):
            r = float(info[1])
            g = float(info[2])
            b = float(info[3])
            a = 1
            # if(self.enableSRGB):
            #     r = self.gammaCorrect(r, type="storageToDisplay")
            #     g = self.gammaCorrect(g, type="storageToDisplay")
            #     b = self.gammaCorrect(b, type="storageToDisplay")
            self.current_rgba = np.array([r, g, b, a])
        elif(keyword == "sun"):
            x = float(info[1])
            y = float(info[2])
            z = float(info[3])
            light = Sun(color=self.current_rgba[:3], direction=np.array([x, y, z]))
            self.lights.append(light)

        elif(keyword == "bulb"):
            x = float(info[1])
            y = float(info[2])
            z = float(info[3])
            light = Bulb(color=self.current_rgba[:3], location=np.array([x, y, z]))
            self.lights.append(light)
        
        elif(keyword == "eye"):
            ex = float(info[1])
            ey = float(info[2])
            ez = float(info[3])
            self.eye = np.array([ex, ey, ez])
        
        elif(keyword == "forward"):
            fx = float(info[1])
            fy = float(info[2])
            fz = float(info[3])
            self.forward = np.array([fx, fy, fz])

        elif(keyword == "up"):
            ux = float(info[1])
            uy = float(info[2])
            uz = float(info[3])
            self.up = np.array([ux, uy, uz])
        
        elif(keyword == "fisheye"):
            self.enableFishEye = True
            
        elif(keyword == "expose"):
            self.exposureV = float(info[1])

        elif(keyword == "shininess"):
            if(len(info) == 2):
                s = float(info[1])
                self.currentShininess = np.array([s, s, s])
            else:
                sx = float(info[1])
                sy = float(info[2])
                sz = float(info[3])
                self.currentShininess = np.array([sx, sy, sz])
        elif(keyword == "bounces"):
            d = int(info[1])
            self.bounces = d

        elif(keyword == "roughness"):
            sigma = float(info[1])
            self.currentRoughness = sigma

        elif(keyword == "aa"):
            aaNum = int(info[1])
            self.aaNum = aaNum
        
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