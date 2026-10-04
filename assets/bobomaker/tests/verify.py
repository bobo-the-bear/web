"""Local-only Bobo Maker browser, artwork and export regression checks.

Install: python -m pip install playwright Pillow
         python -m playwright install chromium
Run from any directory: python assets/bobomaker/tests/verify.py --output review
"""
import argparse
import base64
import functools
import io
import json
import threading
import zipfile
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--output', type=Path, default=Path('bobo-review'))
parser.add_argument('--skip-kit', action='store_true')
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
repo = Path(__file__).resolve().parents[3]
checks = []


def check(name, condition, details=None):
    result = {'check': name, 'passed': bool(condition)}
    if details is not None:
        result['details'] = details
    checks.append(result)
    print(('PASS ' if condition else 'FAIL ') + name, flush=True)
    (args.output / 'verification.json').write_text(json.dumps(checks, indent=2))
    assert condition, (name, details)


def png(data):
    return Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA')


def max_difference(a, b):
    return max(channel[1] for channel in ImageChops.difference(a, b).getextrema())


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(repo)))
threading.Thread(target=server.serve_forever, daemon=True).start()

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1050}, device_scale_factor=1)
    errors, failures = [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('response', lambda r: failures.append(r.url) if r.status >= 400 and '/assets/bobomaker/' in r.url else None)
    page.goto(f'http://127.0.0.1:{server.server_port}/bobomaker.html', wait_until='domcontentloaded')
    page.wait_for_function('typeof ready !== "undefined" && ready', timeout=60000)
    check('Artwork loads and controls become ready', page.locator('#download').is_enabled() and not failures, failures)
    initial = page.evaluate('JSON.stringify(state)')
    original = png(page.locator('#preview').evaluate('(c)=>c.toDataURL()'))
    original.save(args.output / 'original.png')

    # Real UI selection, undo/redo, keyboard focus and category navigation.
    page.get_by_role('tab', name='Headwear', exact=True).click()
    page.get_by_role('button', name='King Bobo', exact=True).click()
    check('Crown selection retains keyboard focus', page.evaluate('state.headwear === "crown" && document.activeElement.getAttribute("aria-label") === "King Bobo"'))
    page.locator('#undo').click()
    check('Undo restores previous trait', page.evaluate('state.headwear === "none"'))
    page.locator('#redo').click()
    check('Redo reapplies trait', page.evaluate('state.headwear === "crown"'))
    page.locator('#lock-category').click()
    for _ in range(3):
        page.locator('#randomize').click()
        check('Randomize preserves locked headwear', page.evaluate('state.headwear === "crown"'))
    page.locator('#lock-category').click()
    page.locator('#reset').click()
    check('Reset restores Original Bobo settings', page.evaluate('JSON.stringify(state)') == initial)
    page.locator('#tab-headwear').focus()
    page.keyboard.press('ArrowRight')
    check('Arrow keys move and select category tabs', page.evaluate('category === "eyewear" && document.activeElement.id === "tab-eyewear"'))
    page.keyboard.press('Home')
    check('Home key selects first category', page.evaluate('category === "background"'))
    page.keyboard.press('End')
    check('End key selects meme category', page.evaluate('category === "meme"'))
    page.locator('#top-text').fill('Bobo forever')
    page.locator('#bottom-text').fill('Council 2018')
    page.locator('#all-caps').uncheck()
    page.locator('#text-font').select_option('sans')
    page.locator('#text-size').fill('80')
    check('Meme text, case, font and size controls', page.evaluate('state.top === "Bobo forever" && state.bottom === "Council 2018" && !state.caps && state.font === "sans" && state.textSize === 80'))
    page.locator('#clear-text').click()
    check('Clear text removes both captions', page.evaluate('!state.top && !state.bottom'))
    page.locator('#reset').click()
    page.get_by_role('tab', name='Fur', exact=True).click()
    page.get_by_role('button', name='Panda', exact=True).click()
    check('Panda retains its own pattern and default palette', page.evaluate('JSON.stringify(state.colors) === JSON.stringify(palettes.find(p=>p.id === "panda"))'))
    page.locator('#color-fur').fill('#886644')
    page.locator('#color-fur').dispatch_event('change')
    check('Custom fur color applies without losing pattern', page.evaluate('state.fur === "custom" && state.colors.fur === "#886644" && state.colors.pattern === "panda"'))
    page.locator('#restore-colors').click()
    check('Restore colors returns Original palette', page.evaluate('JSON.stringify(state.colors) === JSON.stringify(palettes[0])'))
    page.locator('#reset').click()

    crown_pixels = page.evaluate('''()=>{
      const s=defaults(),expected=document.createElement('canvas'),actual=document.createElement('canvas');
      expected.width=expected.height=actual.width=actual.height=1024;
      expected.getContext('2d').drawImage(renderer.images.crown,...BoboEngine.placement.crown);
      renderer.asset(actual.getContext('2d'),'crown',s);
      const a=expected.getContext('2d').getImageData(0,0,1024,1024).data,b=actual.getContext('2d').getImageData(0,0,1024,1024).data;
      const [px,py,pw,ph]=BoboEngine.placement.crown;
      // Only the front must remain visible: rear prongs/returns intentionally
      // disappear behind the head. Protect all three point tips and the band.
      const front=[[330,65,50,60],[780,0,85,120],[1270,60,55,85],[0,375,1650,225]];
      let clipped=0;for(let i=3;i<a.length;i+=4){
        const pixel=(i-3)/4,sx=(pixel%1024-px)*1650/pw,sy=(Math.floor(pixel/1024)-py)*600/ph;
        if(front.some(([x,y,w,h])=>sx>=x&&sx<x+w&&sy>=y&&sy<y+h)&&a[i]>128&&b[i]<a[i]-2)clipped++;
      }
      return clipped;
    }''')
    check('Crown retains its three front point tips and complete lower band', crown_pixels == 0, crown_pixels)

    # Every prop in every palette: contact sheets expose missed paw pixels or
    # accidental recoloring of the object, at useful review resolution.
    palettes_data=page.evaluate('palettes.map(p=>p.id)')
    props=page.evaluate('categories.find(c=>c.id === "prop").options.filter(o=>o[0] !== "none")')
    sheet=Image.new('RGB',(6*256,len(props)*286),'#f4f2ec')
    labels=ImageDraw.Draw(sheet)
    for row,(prop,name) in enumerate(props):
        for col,fur in enumerate(palettes_data):
            data=page.evaluate('''({prop,fur})=>{
              const s=defaults();s.prop=prop;s.fur=fur;s.colors={...palettes.find(p=>p.id===fur)};
              const c=document.createElement('canvas');c.width=c.height=1024;renderer.draw(c.getContext('2d'),s);
              return c.toDataURL();
            }''',{'prop':prop,'fur':fur})
            art=png(data)
            # Crop only the contact-sheet view, retaining the full output for
            # the actual export tests below.
            crop=art.crop((630,705,1024,1024)).resize((256,207))
            x,y=col*256,row*286
            sheet.paste(crop,(x,y));labels.text((x+10,y+218),fur+' / '+name,fill='#26211e')
        print('Rendered all palettes for '+prop,flush=True)
    sheet.save(args.output/'paw-palette-contact-sheet.jpg',quality=95)
    check(f'All {len(props)*len(palettes_data)} prop/palette combinations render', not errors, errors)

    # Ensure a complete composition equals reusable layers for every outfit
    # and palette. Include a hat, eyewear, neck trait and handheld item.
    comparisons=page.evaluate('''async()=>{
      const a=document.createElement('canvas'),b=document.createElement('canvas'),layer=document.createElement('canvas');
      for(const c of [a,b,layer])c.width=c.height=1024;
      const results=[];
      for(const color of palettes)for(const [outfit]of categories.find(c=>c.id==='outfit').options){
        const s={...defaults(),colors:{...color},fur:color.id,outfit,headwear:'cap',eyewear:'glasses',neck:'gold-chain',prop:'phone'};
        renderer.draw(a.getContext('2d'),s);b.getContext('2d').clearRect(0,0,1024,1024);
        for(const cat of ['background','outfit','fur','neck','headwear','eyewear','prop','meme']){
          renderer.draw(layer.getContext('2d'),s,cat);b.getContext('2d').drawImage(layer,0,0);
        }
        const x=a.getContext('2d').getImageData(0,0,1024,1024).data,y=b.getContext('2d').getImageData(0,0,1024,1024).data;
        let diff=0;for(let i=0;i<x.length;i++)diff=Math.max(diff,Math.abs(x[i]-y[i]));
        results.push({fur:color.id,outfit,diff});
        await new Promise(resolve=>setTimeout(resolve,0));
      }return results;
    }''')
    check('All 66 outfit/palette combinations recompose exactly from layers', all(x['diff']==0 for x in comparisons), comparisons)

    # Actual downloadable PNGs, metadata and ZIP contents (not just toDataURL).
    page.evaluate("state={...defaults(),headwear:'crown',prop:'championship',outfit:'suit'};render();renderPanel()")
    preview=png(page.locator('#preview').evaluate('(c)=>c.toDataURL()'))
    with page.expect_download() as download:
        page.locator('#download').click()
    solid=args.output/'bobo-solid.png'
    download.value.save_as(solid)
    solid_image=Image.open(solid).convert('RGBA')
    check('PNG download is 1024px and matches preview exactly', solid_image.size==(1024,1024) and max_difference(preview,solid_image)==0)
    check('Solid PNG has a fully opaque background', solid_image.getchannel('A').getextrema()==(255,255))
    page.locator('#transparent').check()
    with page.expect_download() as download:
        page.locator('#download').click()
    transparent=args.output/'bobo-transparent.png'
    download.value.save_as(transparent)
    transparent_image=Image.open(transparent).convert('RGBA')
    # The approved source artwork has a few translucent interior pixels; retain
    # its alpha rather than incorrectly requiring every interior pixel be 255.
    transparent_preview=png(page.locator('#preview').evaluate('(c)=>c.toDataURL()'))
    check('Transparent PNG preserves alpha and artwork', transparent_image.getpixel((0,0))[3]==0 and transparent_image.getpixel((512,600))[3]>245 and max_difference(transparent_image,transparent_preview)==0)
    page.locator('.export-menu summary').click()
    with page.expect_download() as download:
        page.locator('#export-json').click()
    metadata_path=args.output/'bobo.json'
    download.value.save_as(metadata_path)
    meta=json.loads(metadata_path.read_text())
    check('Metadata describes current traits, palette and transparency', meta['maker']['settings']['headwear']=='crown' and meta['maker']['settings']['prop']=='championship' and meta['maker']['settings']['transparent'])
    page.locator('.export-menu summary').click()
    with page.expect_download(timeout=120000) as download:
        page.locator('#export-layers').click()
    layers_path=args.output/'bobo-current-layers.zip'
    download.value.save_as(layers_path)
    with zipfile.ZipFile(layers_path) as archive:
        check('Current-layer ZIP passes CRC validation', archive.testzip() is None)
        recomposed=Image.new('RGBA',(1024,1024))
        for name in sorted(n for n in archive.namelist() if n.startswith('layers/') and n.endswith('.png')):
            recomposed=Image.alpha_composite(recomposed,Image.open(io.BytesIO(archive.read(name))).convert('RGBA'))
        exported=Image.open(io.BytesIO(archive.read('bobo.png'))).convert('RGBA')
        # Browser PNG encoding unpremultiplies alpha; Pillow composites straight
        # alpha. At alpha 2/255, a one-level rounding change can look like a large
        # RGB delta. Judge visible pixels on both mattes and alpha separately.
        visible_difference=max(max_difference(
            Image.alpha_composite(Image.new('RGBA',(1024,1024),matte),recomposed),
            Image.alpha_composite(Image.new('RGBA',(1024,1024),matte),exported)
        ) for matte in ['white','black'])
        alpha_difference=ImageChops.difference(recomposed.getchannel('A'),exported.getchannel('A')).getextrema()[1]
        check('Downloaded layers reconstruct the exported PNG', visible_difference<=3 and alpha_difference<=2,{'max_visible_channel_rounding':visible_difference,'max_alpha_rounding':alpha_difference})
        check('ZIP preview matches transparent PNG download',max_difference(exported,transparent_image)==0)

    if not args.skip_kit:
        page.locator('.export-menu summary').click()
        with page.expect_download(timeout=300000) as download:
            page.locator('#export-kit').click()
            check('Full kit shows progress and disables competing exports', page.locator('#export-status').is_visible() and page.locator('#download').is_disabled())
        kit_path=args.output/'bobo-layer-kit.zip'
        download.value.save_as(kit_path)
        with zipfile.ZipFile(kit_path) as archive:
            check('Full kit ZIP passes CRC validation',archive.testzip() is None)
            manifest=json.loads(archive.read('manifest.json'))
            paths=[]
            for cat in manifest['categories']:
                for trait in cat['traits']:
                    if trait['file']:
                        paths.extend(trait['file'].replace('{fur}',fur) for fur in manifest['furVariants']) if cat['variantBy']=='fur' else paths.append(trait['file'])
            check('Every manifest layer exists at 1024px',all(name in archive.namelist() and Image.open(io.BytesIO(archive.read(name))).size==(1024,1024) for name in paths),{'layers':len(paths),'zip_files':len(archive.namelist())})
        check('Export controls recover after full kit completes',page.locator('#download').is_enabled() and page.locator('#export-status').is_hidden())

    page.locator('#reset').click()
    page.get_by_role('tab',name='Headwear',exact=True).click()
    page.get_by_role('button',name='Pump.fun trucker',exact=True).click()
    page.get_by_role('tab',name='Props',exact=True).click()
    page.get_by_role('button',name='Mic check',exact=True).click()
    page.wait_for_function("!document.querySelector('#toast').classList.contains('show')")
    for width in [320,390,768,1024,1440]:
        page.set_viewport_size({'width':width,'height':1000})
        metrics=page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth,canvas:document.querySelector("#preview").getBoundingClientRect().toJSON()})')
        clipped=page.locator('.option-name').evaluate_all('(names)=>names.filter(n=>n.scrollWidth>n.clientWidth).map(n=>n.textContent)')
        check(str(width)+'px layout has no overflow, clipped labels or distorted preview',metrics['scroll']==width and abs(metrics['canvas']['width']-metrics['canvas']['height'])<1 and not clipped,{**metrics,'clipped_labels':clipped})
        page.screenshot(path=str(args.output/f'layout-{width}.png'),full_page=True)
    check('No page errors or failed art requests',not errors and not failures,{'errors':errors,'failed_assets':failures})
    browser.close()
server.shutdown()
print(f'Completed {len(checks)} checks. Evidence: {args.output.resolve()}',flush=True)
