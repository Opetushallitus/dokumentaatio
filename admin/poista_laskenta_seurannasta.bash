if [ -z $2 ]; then
  echo "Usage: $0 <JSESSIONID> <laskentaid>"
  echo "Huom: tämä kutsuu oletuksena QA:ta. Muokkaa tarvittaessa."
  exit 2
fi

#ssh bastion.untuva curl -vX DELETE --header 'Accept: */*' "http://alb.untuvaopintopolku.fi/seuranta-service/resources/seuranta/kuormantasaus/laskenta/$2" -H Cookie:JSESSIONID=$1
ssh bastion.pallero curl -vX DELETE --header 'Accept: */*' "http://alb.testiopintopolku.fi/seuranta-service/resources/seuranta/kuormantasaus/laskenta/$2" -H Cookie:JSESSIONID=$1
#ssh bastion.tuotanto curl -vX DELETE --header 'Accept: */*' "http://alb.opintopolku.fi/seuranta-service/resources/seuranta/kuormantasaus/laskenta/$2" -H Cookie:JSESSIONID=$1
