#!/bin/sh

set -eu

if ! which dot &> /dev/null; then
  echo "You need Graphviz to compile the files try following:"
  echo "  OS X:   brew install graphviz"
  echo "  RHEL:   sudo yum install graphviz"
  echo "  Debian: sudo apt-get install graphviz"
  exit 1
fi

if [ $# -eq 0 ]; then
  for FILE in dot/*.dot; do
    FILENAME=$(basename $FILE)
    dot -Gnewrank -Tpng ${FILE} > "img/${FILENAME%.*}".png
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
