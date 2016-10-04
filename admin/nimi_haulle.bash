#!/bin/bash

if [ -z $1 ]; then
  echo "Usage: $0 <hakuoid>"
  exit 2
fi

TARJONTA_URL=https://virkailija.opintopolku.fi/tarjonta-service

http GET https://virkailija.opintopolku.fi/tarjonta-service/rest/v1/haku/$1 | jq -c '[.result.oid, .result.nimi.kieli_fi, .result.hakukausiVuosi, .result.hakukausiUri]'

