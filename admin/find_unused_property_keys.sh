#!/bin/bash
set -e

if [ ! -f "$1" ]; then
    echo "$0 properties.file ../path/to/directory - finds unused property keys from properties.file"
    echo "   - if property key is not found from directory, checks if it is used in the property.file as ${key}"
    echo "   - prints out a new version of the property file without the unused keys"
    echo "Note: you should run this command multiple times to remove all unused keys. First pass might not catch all."
    exit 1
fi

if [ ! -d "$2" ]; then
    echo "Please define a path directory as second command line parameter"
    exit 1
fi

echo "*** Reading properties from file $1"
echo "*** Scanning directory $2"

echo "*************************************************************"
KEYS=$(sed '/^\#/d' "$1" | cut -d "=" -f1 | grep -v '^$')
LIST=""
COUNT=0

for key in $KEYS; do
  COUNT=$(($COUNT + 1))
  if ! ag --case-sensitive --literal --ignore "$1" $key "$2"; then
    if ag --case-sensitive --literal \${$key} "$1" ; then
      echo "*** $key: found from $1"
    else
      echo "*** $key: not found" 
      LIST="$LIST $key"
    fi
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
echo "$1 without the unused property keys:"
echo "*************************************************************"
grep -Ev "^$(echo $LIST | sed -E 's/\./\\./g'  | sed -E "s/ /=|^/g")" $1 
