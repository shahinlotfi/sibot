#!/bin/sh
# Copies the site into dist/, ready to upload as it is (FTP or any static host), and zips it as sibot.zip.
#
# Every file index.html links to gets ?v=<a fingerprint of its contents> on its address, so a changed file has a new
# address and no cache (the host's or a browser's) can keep serving the old one.
set -e
cd "$(dirname "$0")"
rm -rf dist sibot.zip
mkdir dist
cp index.html sibot.css sibot.js favicon.svg apple-touch-icon.png og-image.png dist/
for f in sibot.css sibot.js favicon.svg apple-touch-icon.png og-image.png; do
  v=$(shasum "$f" | cut -c1-10)
  name=$(printf '%s' "$f" | sed 's/\./\\./g')
  sed -i.bak "s|$name\"|$f?v=$v\"|g" dist/index.html
done
rm dist/index.html.bak
(cd dist && zip -qr ../sibot.zip .)
echo "dist/ and sibot.zip ready:"
ls -l dist
grep -o '[a-z-]*\.[a-z]*?v=[0-9a-f]*' dist/index.html
