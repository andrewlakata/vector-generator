# Vector Collision Generator

A small static web app for generating ray-and-circle graphics with p5.js.

## Files
- `index.html` – page markup
- `style.css` – styles
- `app.js` – controls, preset codes, rendering, PNG/SVG export

p5.js (1.9.4) and the Inter font load from CDNs, so the app needs an internet connection.


## Publish
It's plain static files, so any static host works:
- **Netlify:** drag this folder onto https://app.netlify.com/drop
- **GitHub Pages:** push the folder to a repo and enable Pages
- **Vercel / Cloudflare Pages:** deploy the folder with no build step

## Using it
- **Regenerate** – new seed, plus random vector count (20–100), circle count (10–25), vector style and collision mode.
- **Share** – copies a link (or opens the share menu) that recreates the current image via `?p=<preset code>`.
- **Save Image** – downloads a PNG.
- **Copy SVG** – copies a clean vector version (clipped to the canvas; film grain not included).
- **Recolor** – picks a new coordinated color palette.
- **Preset Code** – one string holding the seed and every setting. Copy it to save a look; paste it and press Enter to restore it.
