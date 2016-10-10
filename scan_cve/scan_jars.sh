#!/bin/bash
set -e

MYDIR=$(dirname $0)

for var in "$@"
do
    for FILE in $(find "$var" -name pom.xml)
    do
        echo $FILE
        $MYDIR/list_jars_from_pom.sh $FILE
    done
done