Kaikkien projektien checkout, ohittaa olemassaolevat repot ja lataa vain uudet. Lopuksi tulostaa hakemistot mitkä voi poistaa.

    curl -u [USER] -s https://api.github.com/orgs/Opetushallitus/repos?per_page=200 | ruby -rubygems -e 'require "json";repos=Dir.glob("*");JSON.load(STDIN.read).each { |repo| repos.delete(repo["name"]);%x[git clone #{repo["ssh_url"]}] unless File.exist?(repo["name"])}; puts "Deleted repos: #{repos.join(" ")}"'

Kaikkien projektien pull

    for file in *; do (echo $file && cd $file && git pull && sleep 2); done

Hae CachingRestClient käyttävät tiedostot

    ag -l CachingRestClient .

Kaikki projektit jotka käyttävät generic (fi.vm.sade.generic / build-parent) projektia

    grep build-parent $(ag -l fi.vm.sade.generic | grep pom.xml) | cut -d ":" -f1 | sort | uniq

Kaikki maven, scala ja npm projekti-tiedostot

    find . | grep -E 'pom.xml|package.json|project\/build.scala'
