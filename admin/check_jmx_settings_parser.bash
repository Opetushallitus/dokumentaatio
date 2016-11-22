#!/bin/bash

export IFS=" "
ps -fea | grep 'java' | while read -r line ; do
	service=""
	xmx=""
	for word in $line; do
		if [[ $word == -Duser.home* ]]; then
	               service=${word:12}
        	fi
                if [[ $word == -Xmx* ]]; then
                       xmx=${word:4}
                fi
	done
	if [ "$service" != "" ]; then 
		echo "$service:$xmx" 
	fi
done
