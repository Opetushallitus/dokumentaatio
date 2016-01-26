#!/bin/bash
set -e

if [ -z "$1" ]
  then
    echo "Please define work directory as first command line parameter"
    exit 1
fi

npm install
rm -rf logs
mkdir -p logs

set +e
echo "Trying to stop server"
curl --data "param=1" http://localhost:20102/quit
set -e

sleep 1
echo "Starting server"
nohup ./project_info_server.js $1 &> logs/project_info_server_logs.txt &
