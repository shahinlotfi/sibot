# SIbot

SIbot, the Super Intelligence Bot from Floorstack, on a page of its own. It sits in the middle of the window at 64 % of
the window's shorter side and watches your pointer, hovering and breathing while it waits. Circle the pointer fast a few times and it gets dizzy.

Plain HTML, CSS and JavaScript: no build step, no dependencies.

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

Writes the four site files to `dist/` (and `sibot.zip`). Upload the contents of `dist/` to your web root over FTP.

## Deploy

Any static host works; publish the repo root as it is.

- **Cloudflare Pages / Netlify / Vercel**: import the repo, no build command, output directory `/`.
- **GitHub Pages**: Settings → Pages → deploy from branch `main`, folder `/ (root)`.

Then point your domain at it in the host's custom-domain settings.
