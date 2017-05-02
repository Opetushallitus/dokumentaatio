#!/bin/bash

if [ -z $1 ]; then
  echo "Usage: $0 <hakukohdeoid>"
  exit 2
fi

TARJONTA_URL=https://virkailija.opintopolku.fi/tarjonta-service

http GET ${TARJONTA_URL}/rest/v1/hakukohde/$1 | jq -c '[.result.oid, .result.hakukohteenNimet.kieli_fi, .result.tarjoajaNimet, .result.hakukohteenNimi]'

#http GET ${TARJONTA_URL}/rest/v1/hakukohde/$1 | jq '.'
