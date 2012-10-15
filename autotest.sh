#!/bin/sh
while inotifywait -q -e modify -r --exclude "~" .; do
    clear; node ./run-tests.js
done
