#!/bin/bash
set -e

MYDIR=$(dirname $0)

for POMFILE in "$@"
do
    DIR=$(dirname "$POMFILE")
    # use ruby to parse mvn dependency:tree output: artifact is supposed to in format
    #   fi.vm.sade.organisaatio:organisaatio-solr-client:jar:2015-05:compile
    # [A-Za-z0-9_\-.]+ matches one maven artifact version string
    (cd "$DIR" && mvn dependency:tree -Dverbose -Dtokens=whitespace | \
        ruby -e 'STDIN.read().scan(/\[INFO\].*\s([A-Za-z0-9_\-.]+:[A-Za-z0-9_\-.]+:jar:[A-Za-z0-9_\-.]+:[A-Za-z0-9_\-.]+)/).flatten().uniq().sort().each{|s| puts s.gsub(":jar:",":").strip()}')
done