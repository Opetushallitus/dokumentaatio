#!/bin/bash
set -e

if [ -z "$1" ]
  then
    echo "Please define work directory as first command line parameter"
    exit 1
fi

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR
npm install
./project_info_server.js $1
