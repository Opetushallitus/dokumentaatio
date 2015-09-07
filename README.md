# Hakemuksen ja vastaanoton tilasiirtymät

*Tämä dokumentti on koostettu kehityksen avuksi. Tämä dokumentti ei ole
virallinen vaatimusmäärittely.*

Kun *hakija* hakee *hakukohteeseen*, asettaa hän *hakemuksessa* listan
*hakutoiveta*. Hakutoiveen etenemistä hakuprosessissa kuvataan joukolla
tiloja. Tilojen väliset tilasiirtymät voivat tapahtua joko automaattisesti tai
virkailijan tai opiskelijan toimesta, riippuen siitä minkä tyyppinen haku ja
mikä tilasiirtymä on kysessä.

![Hakutoiveen käsittely erilaisissa hakutyypeissä](hakuprosessi.png)


## Laskennan tulos

Jos haussa käytetään sijoittelua, suoritetaan hakijoiden kesken *laskenta*.
Laskenta valitsee ne hakijat (hakijoiden hakutoiveet) jatkoon jotka ylittävät
kyseisen hakukohteen asettamat vaatimukset, esimerkiksi pääsykoepisteiden
alarajan.

- `HYVAKSYTTAVISSA`: Hakutoive pääsee automatisoidusti jatkoon hakukohteelle
  määritellyn laskentakaavan pohjalta
- `HYLATTY`: Hakijan lähtotiedot eivät riittäneet jatkoon
- `MAARITTELEMATON`: ???
- `HYVAKSYTTY_HARKINNANVARAISESTI`: Virkailija päästää poikkeustapauksessa
  hakutoiveen manuaalisesti jatkoon


## Valintatila / sijoittelun tila

Synonyymit: valintatila, hakemuksen tila, sijoittelun tila, hyväksymisen tila

Jos *haku* käyttää sijoittelua, *valintatila* päivittyy automaattisesti sitä
mukaa kun *hyväksytyt* hakijat päättävät vastaanotosta (katso "Valintatuloksen
tila"). Vapautuvia paikkoja annetaan *varalla* oleville henkilöille sitä mukaa
kun ensisijaisesti valituksi tulleet opiskelijat tekevät päätöksensä
*vastaanotosta*. Hakija voi tehdä vastaanoton vasta kun virkailija on
*julkaissut* tiedon valintatilasta. Jos haku ei käytä sijoittelua, virkailijat
asettavat hyväksymistiedon käsin.

- `HYVAKSYTTY`: Mahtunut hakukohteen asettamaan kiintiöön ja hakija voi tehdä
  vastaanottopäätöksen
- `HARKINNANVARAISESTI_HYVAKSYTTY`: Siirretty virkailijan toimesta
  hyväksytyksi ja hakija voi tehdä vastaanottopäätöksen
- `VARASIJALTA_HYVAKSYTTY`: Nostettu varasijalta hyväksytyksi kun paikkoja on
  vapautunut
- `VARALLA`: Odottaa muiden hakijoiden perumisista vapautuvia paikkoja
- `HYLATTY`: Hakutoive on hylätty virkailijan toimesta eikä hakija ei voi
  tulla valituksi kohteeseen
- `PERUNUT`: Hakija ei ole vastaanottanut paikkaa. Hakija ei voi tulla enää
  valituksi matalamman prioriteetin kohteissa.
- `PERUUTETTU`: Virkailija on perunut paikan opiskelijan puolesta.
  Toiminnallisesti sama kuin `HYLATTY`.
- `PERUUNTUNUT`: Hakijan korkeamman prioriteetin hakutoive on mennyt
  `HYVAKSYTTY` tilaan jolloin tämä hakutoive peruuntuu
- `KESKEN`: ??? onko mahdollinen


### Lisähaku

![Lisähaussa käytetyt valintatilat](lisahaku_valintatila.png)


### Erillishaku

![Erillishaussa käytetyt valintatilat](erillishaku_valintatila.png)


## Valintatuloksen tila

Synonyymit: vastaanotto, valintatuloksen tila, vastaanottotieto

Kun hakijan *valintatila* on määäritetty virkailijan tai sijoittelun toimesta,
virkailija *julkaisee* tiedon hakijalle. Tällöin valintatila ilmestyy
hakijalle OHP:hen, edelleen mahdollistaen paikan vastaanottotiedon asettamisen
siinä tapauksessa että hakutoive on hyväksytty.

Kielteisen valintatilan seurauksena vastaanottotieto on saatettu jo asettaa
valmiiksi, muutoin vastaanottotieto asetetaan hakijan ilmoituksen mukaan joko
virkailijan tai hakijan itsensä toimesta.

- `KESKEN`: Odottaa hakijan vastaanottopäätöstä
- `ILMOITETTU`: ???
- `VASTAANOTTANUT`: ???
- `VASTAANOTTANUT_LASNA`: ???
- `VASTAANOTTANUT_POISSAOLEVA`: ???
- `EI_VASTAANOTETTU_MAARA_AIKANA`: Hakija ei ilmoittanut vastaanottopäätöstään
  määräaikaan mennessä
- `PERUNUT`: Hakija itse peruu vastaanoton OHP:n kautta
- `PERUUTETTU`: Virkailija on perunut vastaanoton hakijan puolesta
- `EHDOLLISESTI_VASTAANOTTANUT`: Hakija vastaanottaa paikan jos korkeamman
  prioriteetin hakutoivetta vastaava paikka ei vapaudu määräaikaan mennessä
- `VASTAANOTTANUT_SITOVASTI`: Hakija sitoutuu paikan vastaanottoon ja hylkää
  muut hakutoiveensa

![Vastaanottotilan siirtymät](vastaanotto.png)


## Ilmoittautumisen tila (läsnäoloilmoitus)

Synonyymit: ilmoittautuminen, ilmoittautumistila, ilmoittautumistieto

Jos opiskelija on vastaanottanut paikan johon hänet on hyväksytty, ilmoittaa
hän viimeiseksi läsnäolotietonsa.

- `EI_TEHTY`
- `LASNA_KOKO_LUKUVUOSI`
- `POISSA_KOKO_LUKUVUOSI`
- `EI_ILMOITTAUTUNUT`
- `LASNA_SYKSY`: Läsnä syksy, poissa kevät
- `POISSA_SYKSY`: Poissa syksy, läsnä kevät
- `LASNA`: Läsnä, keväällä alkava koulutus
- `POISSA`: Poissa, keväällä alkava koulutus


# Dokumentaation kehitys

## Kaavioiden luonti

Kaaviot kuvataan tekstimuotoisissa `.dot` tiedostoissa. Ne käännetään kuviksi
[Graphviz työkalulla](http://www.graphviz.org/). Kaikki `.dot` tiedostot voi
kääntää ajamalla oheinen `./mk.sh` komento.
