# Plate Lab — The Allsparks

A browser-only generator for two printable STL models: print the colored plate twice (red and blue) and the connected white insert once. The plate is 176 × 72 mm, with a 3.8 mm nominal assembly thickness, three hidden 5 mm × 0.8 mm strips, 0.15 mm lateral fit allowance, and 0.41 mm inner pockets per face.

## Run and deploy to your own free Cloudflare Workers account

The `dist/` directory is ready to host; all geometry calculations run in a browser Web Worker using local Manifold WebAssembly. There is no API, database, login, generated-file storage, or server compute required. Dependencies are bundled, including the WASM file. A Google Fonts stylesheet enhances typography but has system font fallbacks; it is unrelated to model generation.

To rebuild from source:

```sh
npm ci
npm run build
npm test
```

Deploy with Wrangler:

```sh
npx wrangler login
npx wrangler deploy
```

`wrangler.jsonc` uses Workers Static Assets directly, without a Worker script. Change `name` if necessary. Cloudflare serves the assets and the browser generates the downloads. Static asset requests are free and unlimited under Cloudflare's current policy: https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/

For a dashboard-only deployment, upload `dist/` using Cloudflare's supported static asset deployment flow. For local use, serve `dist/` over HTTP (for example `python3 -m http.server 8000 --directory dist`). Opening `index.html` as a file URL will not load the module worker.

## Printing and orientation

Download two files from the page. Print the plate STL once in red and once in blue, exterior flat face on the print bed and recesses up. Print the white insert in opaque white; its double-sided digits require supports. **Do not mirror either STL.** The plate's inside view intentionally shows mirrored numbers because its exterior is on the reverse side. Flip one printed plate about its vertical axis, keeping the top edge upright, to place the plates on opposite sides. Both outward faces read the supplied number. Test fit, apply thin glue, and clamp flat. Adhesive and print error can affect the 3.8 mm nominal thickness.

The preview shows both alliance faces. The 3D preview allows orbiting and exploding the three physical parts. Dimensions are millimeters. No mount holes or locking features are included. The rear alliance face must be covered by the installed robot mount; this tool does not provide that cover.

## Number geometry and validation

Accepts 1–6 digits without leading zeros. Digits have a nominal 57 mm height; long numbers are compressed only horizontally to fit the allowed footprint. The 3/6/1/7 diagonal construction uses 60 degrees, with smooth sampled arcs and a 4.5 mm stroke before horizontal fitting. The 9 is exactly a 180-degree rotation of the 6. The 8 combines two open circular loops in those orientations without diagonal stems, sized to retain the 57 mm height. The 4 has a crossbar ending at its vertical stem, without a projecting tail. Its vertical extends 25% of the gap from the crossbar to the top of the digit (21.75 to 30 mm on the centerline, with cap height 54.75 mm). The 2 uses an ellipse-to-diagonal tangent join, with a 60-degree diagonal. The 0 is an upper-right stroke and a lower-left stroke, with openings at those two corners so the colored plate stays one piece. Other digits have compatible geometry and stencil openings where necessary to avoid loose plate islands. These digit shapes are procedurally constructed paths.

Each generation validates a single connected plate solid, a single connected white solid, valid Manifold meshes, and zero volume interference in the mirrored three-part assembly. Runtime memory is released after each generation. STL download is blocked if validation fails. Printability depends on the printer, slicer, material, and fit calibration; this is not an official FTC inspection approval.

Test cases include 36117, each individual digit, mixed digits, repeated curved digits, 6-digit numbers, invalid inputs, STL triangle counts, and assembly clearance. Automated tests exercise the same WASM engine used by the browser.

## Source

- `geometry.js`: procedural digit shapes, 2D clipping, 3D solids, validation, binary STL writer.
- `mesh-worker.js`: browser worker for geometry generation.
- `app.js`: form, downloads, previews, 3D assembly.
- `dist/index.html`, `dist/style.css`: accessible responsive page.
- `build.mjs`: local asset bundling.
- `test.mjs`: geometry and input tests.

The site is an independent team tool, not an official FIRST product. Check the current season's manual and have your installed signs inspected.
