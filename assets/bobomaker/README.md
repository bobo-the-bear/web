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
  and lower band. Keep complete brims and ties within the frame.
- The Pump.fun trucker replaces the red cap. Its v14 artwork has a taller,
  rounded ivory foam crown, forest-green mesh sides and a deeper projecting
  bill with curved stitch rows, fitted at `[152, 80, 720, 380]`. Its lowest bill
  edge stays at the previous forehead height while the crown gains volume.
  `drawTrucker` keeps the outer mesh sides nearly straight from the rounded
  shoulders to the front bill, removing lower side bulges and rear returns
  without cutting into the front panel or stitching. The original head shows
  through the temple wedges,
  preserving its fur texture and all palette variants; no fur or green filler
  patches are drawn. Previous v11 art and v12/v13 material studies stay in the
  repository for provenance but are no longer loaded or composited.
  The supplied Pump.fun logo is copied unchanged and
  scaled uniformly on the front. Legacy `cap` selections map to `trucker`;
  the picker, metadata and exported layer paths use the new name.
- The red ninja bandana replaces the durag. Its narrow forehead band leaves
  the top of the head and both ears exposed, with a knot/tails at viewer-right.
  The old sources stay in the repository for rollback. Legacy `durag` renderer
  selections map to `ninja-bandana`; catalog, metadata and kit paths use the new
  name. This is separate from the existing red neck `bandana`.
  `drawNinjaBandana` fits the original cloth between curved upper/lower hems,
  tapering both ends upward/inward to the temples. The original knot/tails are
  separately seated at the right seam. Preserve this shaping when adjusting
  height; translating a rectangular strip leaves protruding side corners.
- Pump.fun, BEAR and BOBO truckers, cowboy and beret tuck the ears inside the hat. `head(colors, headwear)`
  removes only those source ears; it never changes the face or other headwear.
  Current-layer exports use the same fitted head. Full kits include six extra
  `fur/tucked/{fur}.png` variants; `headwearHeadVariant` and `headVariants` in
  the manifest identify which head PNG each hat requires. Do not composite a
  standard head under these hats or the ears will protrude again.
- v9 cowboy has a traditional dipped crown and the silver concho band. v9
  bucket is black with graphite stitching, preserving the approved placement.
  `v9/bobo-wordmark.png` is the exact user-supplied logo, copied unchanged.
  `drawBucket` crops only its transparent padding and scales it uniformly onto
  the front center panel. Thread shading is clipped to the original alpha;
  the white lettering and fine red edge never receive fur-palette tinting.
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
python assets/bobomaker/tests/verify_headwear.py --output headwear-review
python assets/bobomaker/tests/verify_new_traits.py --output new-traits-review
python assets/bobomaker/tests/verify_backdrops.py --output backdrop-review
```

Checks include keyboard focus/navigation, trait selection, undo/redo, locks,
randomize, reset, Original/Panda/custom palettes, meme controls, all 66 prop/fur
combinations, all 72 outfit/fur layer reconstructions, crown integrity, actual
opaque/transparent PNG downloads, metadata, both ZIP exports, manifest paths,
archive CRCs, and layouts at 320/390/768/1024/1440px. `--skip-kit` skips only the
long full-kit download when it is unrelated to a change.

The headwear suite checks 216 hat/palette/eyewear combinations, actual opaque
and transparent PNGs, current-layer reconstruction for all four revised hats,
and all 24 hat/palette reconstructions from the downloaded full kit. It also
checks that the trucker adds no forehead transparency gaps, verifies exposed ears and
eye clearance for the ninja bandana, and checks legacy cap/durag handling. Trucker
checks also protect the exposed fur temples, clear eyes, tall crown, straight
mesh sides and arched bill. Baseline comparison verifies the original head
pixels stay unchanged and, when reusing the same hat artwork, protects every
pixel outside the two mesh-side regions. Pass
`--baseline-renderer PATH` to compare every unaffected trait against a prior
release and generate before/after review sheets.

Visually inspect the generated paw contact sheet and layout screenshots as well
as full-size and small PFP previews. Automated layer parity verifies compositing,
not subjective art quality. Check new hats against all eyewear and new props
against short sleeves, long sleeves and bare arms before adding more traits.

Keep changes scoped to this maker. The main site navigation and `index.html` are
unrelated. Review the local result before authorizing a production release.


## v6.14.0 supplied BEAR and BOBO truckers

Two separate headwear choices use the exact user-supplied PNGs in `v19/`.
Their original filenames, dimensions and SHA-256 hashes are in
`v19/provenance.json`. Pump.fun remains a separate unchanged option.

`drawSuppliedTrucker` reads the red silhouette boundaries of each source row,
retaining the white embroidery inside the cap while excluding the white studio
background and floor shadow. It fits those source rows to the approved
`drawTrucker` alpha silhouette at `[152, 80, 720, 380]`. The original lettering,
fabric, mesh, rope and stitched bill are sampled directly from the supplied PNG;
no replacement artwork or font is generated. The fitted canvases are cached and
shared by preview, thumbnails and all exports. The two hats use the same
tucked-ear head and Hazmat compatibility as Pump.fun.

The current catalog has 75 non-None traits and 11 headwear choices including
None. Full kits include `layers/headwear/bear-trucker.png` and
`layers/headwear/bobo-trucker.png`: 211 named layers, 214 total ZIP entries.
Metadata and kit version is 6.14.0.

```sh
python assets/bobomaker/tests/verify_trucker_pair.py --output trucker-pair-review --baseline-renderer previous-renderer.js
python assets/bobomaker/tests/verify.py --output regression-review --skip-kit
```

Use `renderer.js` from published commit `92ef27859c06f304e25199a00f3607cf8efffb30`
for the pair suite's baseline. It checks exact hat silhouette and source hashes,
all 432 published trait/palette combinations, 108 new hat/eyewear/palette
combinations, 144 outfit/palette/championship combinations, forehead contact and
eye clearance, real picker/undo/redo/locks/Hazmat controls, actual PNG and layer
ZIP downloads, full-kit reconstruction and responsive widths 320–1440px.
Review the full previews and palette/eyewear sheets for lettering and material
quality as well as geometric fit.

## v6.13.1 focused revision (historical release)

The catalog retains the published 22ab442f inventory, adds Hazmat suit, keeps
Burgundy beret from the unpublished v15 expansion, and replaces Honey rounds
with Fallout goggles.
The thirteen other v15 additions are absent from the picker, loading list and
exports. Their original PNGs and generation records remain archived intact.

There are 73 non-None traits, including 24 backdrops and six fur palettes.
Outfit/headwear/eyewear/neck/prop option counts are 12/9/9/6/12 including
Bare bear or None. The full kit has 209 named PNG layers, its preview, manifest
and README (212 ZIP entries). Metadata and kit version is 6.13.1.

- The original burgundy felt crown and gold pin remain unchanged. `drawBeret`
  separates its black leather band in memory, removes the old antialiased rim,
  and wraps the textured band around the forehead with receding temple ends.
  Two small smooth Bezier trims remove the previous stepped temple joins.
  The source PNG is not rewritten; the existing tucked-ear head is used, and
  natural fur remains visible beneath the smooth felt and fitted black band.
- v18 Fallout goggles replaces Honey rounds in the inventory, metadata and
  exported layer paths. Round honey lenses have subtle mushroom-cloud
  reflections, brass rims, rubber gaskets and a snug woven strap. The bridge
  is pinned to the nose; strap ends clip to the head. Lens interiors composite
  at 72% of their source alpha, keeping reflections faint and glass translucent.
  Taller opaque woven straps and a stitched padded saddle behind the gold
  bridge cover the original eye whites at both temples and in the center.
  The lens placements stay fixed; the existing nose remains visible.
  `drawHazmatGoggles` reduces the front rims inside the visor and continues the
  woven strap behind the opaque frames to both sides without obscuring lenses.
- v17 Hazmat is one connected yellow hood and long-sleeved suit, with a dark
  visor gasket, symmetric lower mask, frontal circular filter and center zipper.
  The filter aligns over the zipper; the face shifts 24 frame pixels left so
  the original nose sits on the same centerline. The original Bobo face is
  fitted behind its transparent visor; no generated face is used.
  Only the approved fur palette changes, never the yellow shell or hardware.
- Hazmat covers headwear. Selecting it clears the hat and explains why hats
  are disabled. Undo restores the previous outfit and hat together. Randomize
  respects a locked hat by excluding Hazmat. Eyewear fits inside the visor.
- Full kits include `fur/hazmat/{fur}.png` and eight fitted
  `eyewear/hazmat/{eyewear}.png` layers. Resolve `outfitHeadVariant` before
  `headwearHeadVariant`; use `outfitEyewearVariant` and `outfitCompatibility`
  when assembling Hazmat. Ordinary outfits retain the published layer paths.

Image generation prompts, dimensions, hashes and reference limitations are in
`v17/generation.json` and `v18/generation.json`. No published source artwork
was modified. The v6.13.1 correction leaves the hazmat filter and beret intact.

Focused verification and review images (separate local headless Chromium):

```sh
python assets/bobomaker/tests/verify_focused_traits.py --output focused-review --baseline-renderer previous-renderer.js
python assets/bobomaker/tests/verify.py --output regression-review --skip-kit
```

Use `renderer.js` from published commit
`22ab442f6d80d5691e1e8e206417dcd5c72576ce` as the baseline. The focused suite
checks all 414 prior trait/palette combinations for pixel equality, 18 focused
trait/palette combinations, 54 Hazmat/eyewear/palette combinations, 108
Hazmat/neckwear/prop/palette combinations, 108 goggles/headwear and
beret/eyewear/palette combinations, translucent lenses, original-eye coverage,
naming, compatibility
controls, actual opaque and transparent PNGs, current-layer ZIPs, metadata,
all full-kit paths and 72
full-kit reconstructions. It saves the focused sheet, full previews, palette
and eyewear sheets, and responsive layout screenshots for visual review.

The layer export canvas temporarily joins the document with `hidden=true`.
This inherits the preview's `font-synthesis:none`; detached canvases otherwise
synthesize a heavier Impact weight for meme captions. The canvas is removed
on both success and failure. Caption downloads match the preview's weight.
