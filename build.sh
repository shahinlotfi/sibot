#!/bin/sh
# Copies the site into dist/, ready to upload as it is (FTP or any static host), and zips it as sibot.zip.
set -e
cd "$(dirname "$0")"
rm -rf dist sibot.zip
mkdir dist
cp index.html sibot.css sibot.js favicon.svg dist/
(cd dist && zip -qr ../sibot.zip .)
echo "dist/ and sibot.zip ready:"
ls -l dist
