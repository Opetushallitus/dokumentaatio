#!/usr/bin/env bash

set -euo pipefail

DB=$1
HOST=$2
SLEEP=$3
QUERY="select * from pg_statio_all_tables where schemaname = 'public';"

while true
do
    TIME=$(date --iso-8601=seconds)
    psql -d "${DB}" -h "${HOST}" -U oph -c "${QUERY}" | \
        tail -n+3 | \
        head -n-2 | \
        sed "s/\s/${TIME}, /" | \
        sed 's/\s*|\s*/, /g'
    sleep "${SLEEP}"
done
