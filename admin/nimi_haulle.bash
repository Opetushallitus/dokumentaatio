#!/bin/bash

if [ -z $1 ]; then
  echo "Usage: $0 <hakuoid>"
  exit 2
fi

TARJONTA_URL=https://virkailija.opintopolku.fi/tarjonta-service

http GET ${TARJONTA_URL}/rest/v1/haku/$1 Caller-Id:"`whoami`.nimi.haulle.skripti"  --ignore-stdin | jq -c '[.result.oid, .result.nimi.kieli_fi, .result.hakukausiVuosi, .result.hakukausiUri, .result.ataruLomakeAvain ]'

