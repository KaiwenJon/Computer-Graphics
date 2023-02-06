#!/bin/bash
# This is a comment!
echo 'compareing'	# This is a comment T=(A B C)

# magick ./output/mp1indexing.png ./ans/mp1indexing.png -compare ./difference/mp1indexing.png
files=(mp1clipplane mp1cull mp1decals mp1depth mp1frustum mp1fsaa2 mp1fsaa3 mp1fsaa4 mp1hyp mp1hyptex mp1indexing mp1nodepth mp1point mp1req1 mp1req2 mp1rgba mp1srgb mp1texture)
for file in ${files[@]}
do
    echo ${file}
    magick './output/'${file}'.png' './ans/'${file}'.png' -compare './difference/'${file}.png
done
