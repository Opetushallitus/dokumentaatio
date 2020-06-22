#!/bin/bash

if [ -z $1 ]; then
  echo "Usage: $0 <hakukohdeoid>"
  exit 2
fi

TARJONTA_URL=https://virkailija.opintopolku.fi/tarjonta-service

http GET ${TARJONTA_URL}/rest/v1/hakukohde/$1 Caller-Id:"`whoami`nimi.hakukohteelle.skripti" | jq -c '{foo: (.result.oid + "|" + .result.hakukohteenNimet.kieli_fi + "|" + .result.hakukohteenNimet.kieli_sv + "|" + .result.hakukohteenNimet.kieli_en + "|" + .result.tarjoajaNimet.fi + "|" + .result.tarjoajaNimet.sv + "|" + .result.tarjoajaNimet.en + "|" + .result.hakukohteenNimi + "|" + .result.tila)}' | cut -f 4 -d '"'

#http GET ${TARJONTA_URL}/rest/v1/hakukohde/$1 | jq '.'
