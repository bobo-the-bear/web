# Bobo Maker

Static character studio. Open `bobomaker.html` through a local HTTP server; no
build step, wallet, backend or runtime package installation is required.

```sh
python -m http.server 8000 --bind 127.0.0.1
# http://127.0.0.1:8000/bobomaker.html
```

## Artwork and fitting conventions

The approved source PNGs remain unchanged. `renderer.js` owns placement,
palette masks, occlusion and exports. Preview, thumbnails, PNG downloads and
layer ZIPs all use the same renderer.

- Work in a **1024 × 1024** frame. `placement` lists `[x, y, width, height]` for
  each source; `anchors` identifies the head center, nose bridge, hat band and
  wrist/arm exit. Source-image coordinates are only used by `propPaws` masks.
- Keep the face, muzzle, eye line and Original/Panda palettes intact. A new
  garment must include its own torso and meet the existing jaw mask. Keep the
  two-pixel body underlap: subtracting the exact same antialiased edge from both
  layers makes a transparent neckline seam.
- The visible front of a hat sits **in front of** the ears. Do not subtract ear
  shapes from an entire hat: this cut through the crown's front points. The
  crown source also includes two rear prongs and inward returns; `drawCrown`
  hides those in source coordinates, retaining the three front points, jewels
  and lower band. Leave deliberate ear exposure at the sides of caps/beanies
  and keep complete brims and ties within the frame.
- The red cap retains its production v6.3 fit `[52, 125, 920, 345]`, v6 source
  and original contact-shadow behavior. Its regression check compares pixels
  with the production renderer and captured live cap across all fur palettes.
- A held item includes its approved rounded bear grip. Preserve the object,
  normalize only the paw to the selected fur, and join its wrist to the arm.
  `fitWrist` detects an exposed source edge, continues only its narrow wrist
  texture underneath the grip, and clips to a smooth forearm exit. New sources
  should include the complete wrist through the bottom of the frame so they
  do not require this correction. Do not apply a rectangular cut to the paw.
- The three new props use separate object art and the existing v5 coffee grip.
  `grip` clips only the rounded paw, `drawNewProp` fits the object without
  stretching its aspect ratio. Recolor only the grip; silver, gold and paper
  keep their source colors. The champagne stem must meet the inner finger edge.
  Bera's uses the v8 silver/red/blue bear label; its earlier v7 source is kept
  for provenance. Daily Bobo and Feel the Boom were removed at user request.
- v7 red puffer and jersey are new garment sources; the v5 originals are
  retained. The puffer source is fitted vertically to the existing shoulder
  and bottom anchors. The shared approved head replaces both source heads.
  Sleeve and trim revisions must not change head, cap, crown or belt geometry.
  Protect the red fabric and shaded gold trim from fur tinting; only the
  puffer's small exposed neckline and the jersey's bare arms follow the fur.
- Color masks must match the **current source dimensions**. The cash polygon
  uses the v5 1222 × 1144 artwork; the older v3 coordinates are incompatible.
  Verify light, dark and Panda paws while checking that bills, honey, coffee,
  flowers and metal stay unchanged.
- Championship uses its separate v6.3 open-strap construction: shoulder fold,
  sideways plate, hanging tail and foreground grip. Preserve the readable BOBO
  logo and contact at the shoulder. Do not route it through generic wrist fit.
- Contact shadows stay on the bear silhouette. Reset canvas shadow state before
  the final artwork pass to prevent a second unmasked shadow outside the bear.
  The red cap intentionally preserves its existing production shadow pass.

Composite exported layers bottom to top: `background`, `outfit`, `fur` (head),
`neck`, `headwear`, `eyewear`, `prop`, `meme`. Outfit and prop layers have one
variant per fur palette. For a bare bear, select `outfit/{fur}/none.png`.
The current-layer ZIP also supports custom colors and transparency.

## Backdrops

The picker has 24 backdrops: nine original colors/patterns plus 15 supplied
images from the user's Background collection. `backgrounds/manifest.json`
retains the exact original PNG filenames, source SHA-256 hashes, decoded RGBA
hashes and optimized asset hashes. The lossless WebP copies preserve all pixels
and their 1000 x 1000 dimensions; original user PNGs remain untouched.

`background` centers and covers the canvas without changing aspect ratio.
All current source images are square, so no source area is cropped. A white
underlay makes opaque exports fully opaque, including the slightly translucent
Blue Screen of Death source. Transparent export omits the entire backdrop.
Backdrop thumbnails remain visible while transparency is enabled; selecting a
backdrop turns transparency off, and undo/redo restores both settings together.

## Regression checks

Use a separate headless Chromium browser; this never controls an existing user
browser or uploads files. The script serves this checkout on localhost and saves
review evidence to the requested directory.

```sh
python -m pip install playwright Pillow
python -m playwright install chromium
python assets/bobomaker/tests/verify.py --output bobo-review
# Focused crown geometry, combinations and PNG/layer export checks:
python assets/bobomaker/tests/verify_crown.py --output crown-review
python assets/bobomaker/tests/verify_cap.py --output cap-review
python assets/bobomaker/tests/verify_new_traits.py --output new-traits-review
python assets/bobomaker/tests/verify_backdrops.py --output backdrop-review
```

Checks include keyboard focus/navigation, trait selection, undo/redo, locks,
randomize, reset, Original/Panda/custom palettes, meme controls, all 66 prop/fur
combinations, all 66 outfit/fur layer reconstructions, crown integrity, actual
opaque/transparent PNG downloads, metadata, both ZIP exports, manifest paths,
archive CRCs, and layouts at 320/390/768/1024/1440px. `--skip-kit` skips only the
long full-kit download when it is unrelated to a change.

Visually inspect the generated paw contact sheet and layout screenshots as well
as full-size and small PFP previews. Automated layer parity verifies compositing,
not subjective art quality. Check new hats against all eyewear and new props
against short sleeves, long sleeves and bare arms before adding more traits.

Keep changes scoped to this maker. The main site navigation and `index.html` are
unrelated. Review the local result before authorizing a production release.
