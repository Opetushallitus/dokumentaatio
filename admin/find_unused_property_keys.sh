#!/bin/bash
set -e

if [ ! -f "$1" ]
  then
    echo "Please define a path to existing properties file as first parameter"
    exit 1
fi

if [ ! -d "$2" ]
  then
    echo "Please define a path directory as second command line parameter"
    exit 1
fi

echo "*** Reading properties from file $1"
echo "*** Scanning directory $2"

KEYS=$(sed '/^\#/d' "$1" | cut -d "=" -f1 | grep -v '^$')
LIST=""
COUNT=0

for key in $KEYS; do
  NOTFOUND=false
  COUNT=$(($COUNT + 1))
  ag --case-sensitive --literal --ignore "$1" $key $2 || NOTFOUND=true && echo "*** $key: not found" | head -n 1
  if [ "$NOTFOUND" == "true" ]
    then
      LIST="$LIST $key"
  fi
done

COUNT_NOTFOUND=$(echo $LIST | wc -w)
COUNT_INUSE=$(($COUNT - COUNT_NOTFOUND))

echo "*************************************************************"
echo "Checked for properties in '$1' from '$2'"
echo "Found used property keys: $COUNT_INUSE"
echo "Unused property keys: $COUNT_NOTFOUND"
echo "Not cound:"
echo $LIST | tr " " "\n"

echo "*************************************************************"
echo "$1 without the unused property files:"
echo "$(echo $LIST | tr " " "=|")"
grep -Ev "^$(echo $LIST | sed -E "s/ /=|^/g")" $1 