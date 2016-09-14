#!/bin/bash

sed 's/.*"request": "//' | sed 's/".*//' | sed 's+/haku/[0-9\.]*/+/haku/HAKUOID/+' | sed 's+/haku/[0-9\.]* +/haku/HAKUOID +' | sed 's+/hakemus/[0-9\.]*+/hakemus/HAKEMUSOID+' | sed 's+/hakukohde/[0-9\.]*+/hakukohde/HAKUKOHDEOID+' | sed 's+/valintatapajono/[0-9\.-]*+/valintatapajono/VALINTATAPAJONOOID+' | sed 's+/henkilo/[0-9\.]*+/henkilo/HENKILOOID+' | sed 's+/ensikertalaisuus/[0-9\.]*/historia+/ensikertalaisuus/HENKILOOID/historia+' | sed 's+/haku/streaming/[0-9\.]*/sijoitteluajo/+/haku/streaming/HAKUOID/sijoitteluajo/+' | sed 's+ticket=ST-[a-zA-Z0-9-]*-cas+ticket=ST-SERVICETICKET-cas+'