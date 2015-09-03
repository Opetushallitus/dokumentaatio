#!/bin/sh

if [ $# -eq 0 ]; then
  for FILE in *.dot; do
    dot -Tpng ${FILE} > "${FILE%.*}".png
  done
elif [ $# = 1 ]; then
    TARGET="${1%.*}.png"
    dot -Tpng ${1} > $TARGET && open $TARGET
else
  echo "Compile and open single file: $0 basename"
  echo "Compile all files: $0"
  exit 1
fi



#dot -Tsvg ${1}.dot | sed -E 's/<svg width="[0-9]+pt" height="[0-9]+pt"/<svg width="100%" height="100%"/' > ${1}.svg && open ${1}.svg
