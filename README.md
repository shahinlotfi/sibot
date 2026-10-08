# SIbot

SIbot, the Super Intelligence Bot from Floorstack, on a page of its own. It sits in the middle of the window at 64 % of
the window's shorter side and watches your pointer, hovering and breathing while it waits. Circle the pointer fast a few times and it gets dizzy.
On a phone it feels the phone move: tip it and it looks downhill, move it and it swings, shake it hard or spin
it round and it gets dizzy. iPhones ask for permission on the first tap, and only over HTTPS.

Plain HTML, CSS and JavaScript: no build step, no dependencies. The name in the background is set in
[Honk](https://fonts.google.com/specimen/Honk), loaded from Google Fonts.

- `index.html`: the page and the character's SVG
- `sibot.css`: layout and the character's shapes, posed through `--sibot-*` custom properties
- `sibot.js`: the motion (ported from Floorstack's `PointerBot`)

## Run locally

```sh
python3 -m http.server 4719   # then open http://localhost:4719
```

## Build

```sh
./build.sh
```

Writes the site files to `dist/` (and `sibot.zip`). In `dist/index.html` every linked file's address carries
`?v=` and a fingerprint of its contents, so a changed file gets a new address and no cache, the host's or a
browser's, keeps serving the old one. Upload the contents of `dist/` over FTP to the folder it's served from (`https://perfectpixel.se/sibot/`; the canonical
link and the share tags in `index.html` name that address).

## Deploy

Any static host works; publish the repo root as it is.

- **Cloudflare Pages / Netlify / Vercel**: import the repo, no build command, output directory `/`.
- **GitHub Pages**: Settings → Pages → deploy from branch `main`, folder `/ (root)`.

Then point your domain at it in the host's custom-domain settings.
