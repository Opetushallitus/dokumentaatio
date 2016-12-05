#!/bin/bash

set -eo pipefail

if [ -z $2 ]; then
  echo "Usage: $0 <command> <list of servers>"
  echo "For example:"
  echo "./tailaa_useita.bash \"tail -f /logs00/tomcat/valinta-tulos-service/oph-valintatulosservice.log\" periodi stipendi viittaus"
  exit 2
fi

COMMAND="$1"
shift
SERVERS=$@

MULTITAIL_COMMAND="multitail --mergeall "
for S in $SERVERS; do
  MULTITAIL_COMMAND="${MULTITAIL_COMMAND} -l 'ssh $S \"$COMMAND\"' "
done

echo "Running: $MULTITAIL_COMMAND"
eval $MULTITAIL_COMMAND

