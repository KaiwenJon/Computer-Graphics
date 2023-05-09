#!/bin/bash

# magick ./output/mp1indexing.png ./ans/mp1indexing.png -compare ./difference/mp1indexing.png
files=( mpray_sphere
        mpray_sun
        mpray_overlap
        mpray_behind
        mpray_suns
        mpray_shadow-basic
        mpray_shadow-suns
        mpray_bulb
        mpray_shadow-bulb
        mpray_eye
        mpray_forward
        mpray_up
        mpray_fisheye
        mpray_neglight
        mpray_expose1
        mpray_expose2
        mpray_inside
        mpray_shine1
        mpray_shine3
        mpray_plane
        mpray_bounces
        mpray_rough
        mpray_aa
    )
for file in ${files[@]}
do
    echo ${file}
    magick compare -fuzz 1% './'${file}'.png' './mprayfiles/'${file}'.png' './difference/'${file}.png
    # magick './output/'${file}'.png' './ans/'${file}'.png' -compare './difference/'${file}.png
done
