#!/bin/bash
cd "${0%/*}"

set -eo pipefail

# requires ssh access to servers with plain name

if [ -z $1 ]; then
  echo "Usage: $0 <env>"
  exit 2
fi

SERVERS=`./oph_host $1 kaikki | grep hard.ware.fi | sed 's/\.hard\.ware\.fi//'`

echo "Servers to check:"
echo "$SERVERS"
echo
echo "========================"

for S in $SERVERS
do
  echo $S :
  ssh $S 'bash -s' < ./check_jmx_settings_parser.bash
  echo
  echo "======================="
done

