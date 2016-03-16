# opintopolku.fi HTTP-käytännöt

## clientSubSystemCode header

HTTP-pyynnön tekevän sovelluksen pitää lisätä pyyntöön "clientSubSystemCode" header mikä määrittää sovellukselle yksiöllisen tunnuksen.

Sovellus voi lähettää clientSubSystemCode:n myös post parameter muodossa (case sensitive)

## ID cookie

Jokainen HTTP-pyyntö menee opintopolku.fi:n nginx-proxyn läpi. nginx-proxy varmistaa että jokaisessa pyynnössä on ID cookie:
* Jos pyynnössä ei ole ID-cookieta, CSRF-keksin arvo kopioidaan ID-keksin arvoksi
* Olemassaolevaan ID-keksiin lisätään satunnainen merkkijono.
* Jos opintopolku.fi backend-sovellus tekee lisä-HTTP-pyyntöjä muihin palveluihin, sen pitää lähettää saatu ID-keksi eteenpäin ilman muutoksia:

ID cookie ja siihen lisättävät satunnaiset merkkijonot mahdollistavat sovelluspyyntöjen seuraamisen eri järjestelmien läpi:

* Selain tekee HTTP-pyynnön: /rest/v1/oppilas/1.1.23, CSRF: 123ABC
* nginx käsittelee pyynnön ja välittää sen eteenpäin: /rest/v1/oppilas/1.1.23, CSRF: 123ABC, ID: 123ABC;234XYZ
* backend-sovellus tekee lisäpyynnön: /rest/v1/lisatiedot/1.1.23, ID: 123ABC;234XYZ
* nginx käsittelee pyynnön ja välittää sen eteenpäin: /rest/v1/lisatiedot/1.1.23, ID: 123ABC;234XYZ;562ZXZ

Lisätietoa: https://github.com/Opetushallitus/nginx-utils

## CSRF Double-submit suojaus

Tilaa muuttavissa HTTP-pyynnöissä (verbi muu kuin "GET", "HEAD", "OPTIONS") pitää olla
* CSRF cookie *ja*
* CSRF http-header samalla arvolla *tai*
* "CSRF" post parameter (case sensitive) samalla arvolla

Tilaa muuttavia HTTP-pyyntöjä tekevien sovellusten pitää huomioida CSRF:
* Backend-sovelluksien pitää asettaa sekä cookie että header. Sovellukset voivat käyttää kovakoodattuja CSRF arvoa, esim. sama kuin clientSubSystemCode.
* opintopolku.fi selainsovelluksien pitää palauttaa tilaa muuttavissa pyynnöissä CSRF header
* Selainsovellukset muissa kuin opintopolku.fi domaineissa: tilaa muuttavia pyyntöjä ei voi tehdä koska CSRF keksiä ei voi selaimessa lukea.

opintopolku.fi:n nginx-proxy lisää HTTP-vastaukseen CSRF keksin, satunnaisella merkkijonolla, jos pyynnössä sitä ei ole.

Lisätietoa: https://github.com/Opetushallitus/nginx-utils

