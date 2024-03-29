# opintopolku.fi HTTP-käytännöt

## Caller-id header

Opintopolkuun integroituvien järjestelmien tulee lisätä "Caller-Id"-HTTP-otsikko kaikkiin rajapintakutsuihin.

Tarkemmat tiedot: https://wiki.eduuni.fi/pages/viewpage.action?pageId=176867280

## ID header (Suunnitelma, ei toteutettu)

Jokainen HTTP-pyyntö menee opintopolku.fi:n nginx-proxyn läpi. nginx-proxy varmistaa että jokaisessa pyynnössä on ID header:
* Jos pyynnössä ei ole ID-headeria, CSRF-keksin arvo kopioidaan ID-headerin arvoksi, ja siihen lisätään satunnainen merkkijono
* Olemassaolevaan ID-headeriin lisätään satunnainen merkkijono.
* Jos opintopolku.fi backend-sovellus tekee lisä-HTTP-pyyntöjä muihin palveluihin, sen pitää lähettää saatu ID-header eteenpäin ilman muutoksia.

ID header ja siihen lisättävät satunnaiset merkkijonot mahdollistavat sovelluspyyntöjen seuraamisen eri järjestelmien läpi:

1. Selain tekee HTTP-pyynnön: /rest/v1/oppilas/1.1.23, CSRF: 123ABC
2. nginx käsittelee pyynnön ja välittää sen eteenpäin: /rest/v1/oppilas/1.1.23, CSRF: 123ABC, ID: 123ABC;234XYZ
3. backend-sovellus tekee lisäpyynnön: /rest/v1/lisatiedot/1.1.23, ID: 123ABC;234XYZ
4. nginx käsittelee pyynnön ja välittää sen eteenpäin: /rest/v1/lisatiedot/1.1.23, ID: 123ABC;234XYZ;562ZXZ

Lisätietoa: https://github.com/Opetushallitus/nginx-utils

## CSRF Double-submit suojaus

Tilaa muuttavissa HTTP-pyynnöissä (verbi muu kuin "GET", "HEAD", "OPTIONS") pitää olla
* CSRF cookie *ja*
* CSRF http-header samalla arvolla *tai*
* "CSRF" post parameter (case sensitive) samalla arvolla

Tilaa muuttavia HTTP-pyyntöjä tekevien sovellusten pitää huomioida CSRF:
* Backend-sovelluksien pitää kutsuessaan toisia palveluja asettaa HTTP-pyyntöön sekä cookie että header. Sovellukset voivat käyttää kovakoodattuja CSRF arvoa, esim. sama kuin Caller-Id.
* Opintopolku.fi -selainsovelluksien pitää palauttaa tilaa muuttavissa pyynnöissä CSRF header, joka vastaa CSRF-cookieta
* Selainsovellukset muissa kuin opintopolku.fi domaineissa: tilaa muuttavia pyyntöjä ei voi tehdä koska CSRF keksiä ei voi selaimessa lukea.

opintopolku.fi:n nginx-proxy lisää HTTP-vastaukseen CSRF keksin, satunnaisella merkkijonolla, jos pyynnössä sitä ei ole.

Lisätietoa: https://github.com/Opetushallitus/nginx-utils

