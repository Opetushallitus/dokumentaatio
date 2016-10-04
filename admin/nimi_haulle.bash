#!/bin/bash

if [ -z $1 ]; then
  echo "Usage: $0 <hakuoid>"
  exit 2
fi

TARJONTA_URL=https://virkailija.opintopolku.fi/tarjonta-service

NIMI=`http GET ${TARJONTA_URL}/rest/v1/haku/$1 | jq '.result.nimi.kieli_fi'`

echo $1 : $NIMI

