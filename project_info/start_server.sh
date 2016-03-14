#!/bin/bash
set -e

if [ -z "$1" ]
  then
    echo "Please define work directory as first command line parameter"
    exit 1
fi

npm install
./project_info_server.js $1 &> logs/project_info_server_logs.txt
