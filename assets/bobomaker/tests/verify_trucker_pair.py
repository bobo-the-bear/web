"""Review the supplied BEAR/BOBO truckers and protect every published trait.

Uses the same Pillow/Playwright setup as verify.py and a separate local browser.
"""
import argparse, base64, functools, hashlib, io, json, threading, zipfile
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from PIL import Image, ImageChops, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--output', type=Path, default=Path('trucker-pair-review'))
parser.add_argument('--baseline-renderer', type=Path)
parser.add_argument('--preview-only', action='store_true')
args = parser.parse_args(); args.output.mkdir(parents=True, exist_ok=True)
repo = Path(__file__).resolve().parents[3]
hats = {'bear-trucker': 'BEAR trucker', 'bobo-trucker': 'BOBO trucker'}
hashes = {'bear-trucker': 'c9fd6054050e54b615464b36ce487b3276fb3bef6fe937c5a152d2a25ee7d658',
          'bobo-trucker': '4bf8ed0eb44e1da01373420d363d08cf5423e38e8ae0376457a4cc648f116138'}
checks = []
def check(name, passed, details=None):
    checks.append({'check': name, 'passed': bool(passed), 'details': details})
    (args.output / 'verification.json').write_text(json.dumps(checks, indent=2))
    print(('PASS ' if passed else 'FAIL ') + name, flush=True)
    assert passed, (name, details)
def png(data): return Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA')
def same(a,b): return all(hi == 0 for lo,hi in ImageChops.difference(a,b).getextrema())
def url(data): return 'data:image/png;base64,' + base64.b64encode(data).decode()
class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server = ThreadingHTTPServer(('127.0.0.1',0), functools.partial(Handler,directory=str(repo)))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width':1440,'height':1080})
    errors=[]; failures=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('requestfailed',lambda r:failures.append(r.url))
    page.on('response',lambda r:failures.append(r.url) if r.status>=400 else None)
    page.goto(f'http://127.0.0.1:{server.server_port}/bobomaker.html',wait_until='domcontentloaded')
    page.wait_for_function('ready',timeout=90000)
    page.evaluate('''()=>{
      window.canvas=()=>{const c=document.createElement('canvas');c.width=c.height=1024;return c};
      window.settings=extra=>{const s={...defaults(),...extra};if(extra.fur&&extra.fur!=='custom')s.colors={...palettes.find(p=>p.id===extra.fur)};return s};
      window.art=(extra,only=null)=>{const c=canvas();renderer.draw(c.getContext('2d'),settings(extra),only);return c.toDataURL()};
      window.identical=(a,b)=>{const x=a.getContext('2d').getImageData(0,0,1024,1024).data,y=b.getContext('2d').getImageData(0,0,1024,1024).data;return x.every((v,i)=>v===y[i])};
      window.layerParity=extra=>{const a=canvas(),b=canvas(),layer=canvas(),s=settings(extra);renderer.draw(a.getContext('2d'),s);for(const cat of ['background','outfit','fur','neck','headwear','eyewear','prop','meme']){renderer.draw(layer.getContext('2d'),s,cat);b.getContext('2d').drawImage(layer,0,0)}return identical(a,b)};
      window.compose=async urls=>{const c=canvas();for(const url of urls){const im=new Image();im.src=url;await im.decode();c.getContext('2d').drawImage(im,0,0)}return c.toDataURL()};
    }''')
    colors=page.evaluate('palettes.map(p=>p.id)')
    check('All artwork loads; both new hats and Pump.fun are selectable in the 75-trait catalog',
          not failures and page.locator('#asset-count').inner_text()=='75 TRAITS' and
          page.evaluate("['trucker','bear-trucker','bobo-trucker'].every(id=>categories.find(c=>c.id==='headwear').options.some(o=>o[0]===id))"))
    check('Both source PNGs are byte-identical to the supplied local files',
          all(hashlib.sha256((repo/f'assets/bobomaker/v19/{id}.png').read_bytes()).hexdigest()==sha for id,sha in hashes.items()))
    font=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',27)
    sheet=Image.new('RGB',(1500,602),'#f5f2e9');draw=ImageDraw.Draw(sheet)
    previews={}
    for col,(id,label) in enumerate([('trucker','Pump.fun / approved fit'),*hats.items()]):
        im=png(page.evaluate('id=>art({headwear:id})',id));previews[id]=im
        im.save(args.output/f'{id}-preview.png')
        sheet.paste(im.resize((480,480)),(col*500+10,54));draw.text((col*500+16,16),label,font=font,fill='#25241f')
        draw.text((col*500+16,552),'Same base, panels and bill',font=font,fill='#625f55')
    sheet.save(args.output/'trucker-pair-review.png')
    fit=page.evaluate('''hats=>{
      const raw=canvas();renderer.drawTrucker(raw.getContext('2d'),renderer.images.trucker);const a=raw.getContext('2d').getImageData(0,0,1024,1024).data,result=[];
      for(const id of hats){const c=canvas();renderer.drawSuppliedTrucker(c.getContext('2d'),id);const b=c.getContext('2d').getImageData(0,0,1024,1024).data;let silhouetteMismatch=0,outsideLetteringAlphaMismatch=0;
        for(let i=0;i<a.length;i+=4){const x=(i/4)%1024,y=Math.floor(i/4/1024);if(!!a[i+3]!==!!b[i+3])silhouetteMismatch++;if((x<280||x>=744||y<152||y>=322)&&a[i+3]!==b[i+3])outsideLetteringAlphaMismatch++}
        result.push({id,silhouetteMismatch,outsideLetteringAlphaMismatch})}return result}''',list(hats))
    check('Both hats retain the approved silhouette and alpha outside the changed front branding',all(x['silhouetteMismatch']==0 and x['outsideLetteringAlphaMismatch']==0 for x in fit),fit)
    shared=page.evaluate('''hats=>{
      const base=canvas();renderer.drawTrucker(base.getContext('2d'),renderer.redTruckerBase(),false);const a=base.getContext('2d').getImageData(0,0,1024,1024).data;
      return hats.map(id=>{const c=canvas();renderer.drawSuppliedTrucker(c.getContext('2d'),id);const b=c.getContext('2d').getImageData(0,0,1024,1024).data;let changedOutsideBranding=0,changedInsideBranding=0;
        for(let i=0;i<a.length;i+=4){const x=i/4%1024,y=Math.floor(i/4/1024);if([0,1,2,3].some(k=>a[i+k]!==b[i+k])){if(x<280||x>=744||y<152||y>=322)changedOutsideBranding++;else changedInsideBranding++}}
        return {id,changedOutsideBranding,changedInsideBranding}})}''',list(hats))
    check('Both variants are pixel-identical to the shared red Pump.fun base outside lettering',all(x['changedOutsideBranding']==0 and x['changedInsideBranding']>1000 for x in shared),shared)
    source=page.evaluate('''()=>{
      const im=renderer.images.trucker,c=document.createElement('canvas');c.width=im.width;c.height=im.height;c.getContext('2d').drawImage(im,0,0);
      const red=renderer.redTruckerBase(),a=c.getContext('2d').getImageData(0,0,c.width,c.height).data,b=red.getContext('2d').getImageData(0,0,c.width,c.height).data;let alphaMismatch=0,redPixels=0,blackPixels=0,visible=0;
      for(let i=0;i<a.length;i+=4){if(a[i+3]!==b[i+3])alphaMismatch++;if(b[i+3]>240){visible++;if(b[i]>b[i+1]&&b[i]>b[i+2])redPixels++;else if(Math.max(b[i],b[i+1],b[i+2])<4)blackPixels++}}
      return {sameDimensions:c.width===red.width&&c.height===red.height,alphaMismatch,redPixels,blackPixels,visible}}''')
    check('Shared base recolors original source pixels without resizing or changing mesh transparency',source['sameDimensions'] and source['alphaMismatch']==0 and source['redPixels']+source['blackPixels']==source['visible'],source)
    letters=page.evaluate('''ids=>ids.map(id=>{const {image,bounds}=renderer.truckerLettering(id),d=image.getContext('2d').getImageData(0,0,image.width,image.height).data;let fabric=0,thread=0;for(let i=0;i<d.length;i+=4)if(d[i+3]>200){if(Math.min(d[i+1],d[i+2])/Math.max(1,d[i])<.60)fabric++;else thread++}return {id,bounds,fabric,thread}})''',list(hats))
    check('Supplied references contribute only extracted embroidery, with no red hat fabric',all(x['fabric']==0 and x['thread']>10000 for x in letters),letters)
    page.get_by_role('tab',name='Headwear',exact=True).click()
    page.get_by_role('button',name='BEAR trucker',exact=True).click()
    page.screenshot(path=str(args.output/'desktop-preview.png'),full_page=True)
    if args.preview_only:
        browser.close();server.shutdown();print('Preview ready.',flush=True);raise SystemExit(0)
    if args.baseline_renderer:
        page.evaluate("source=>{window.oldEngine=(new Function('window',source+';return window.BoboEngine;'))({});window.oldRenderer=new oldEngine.Renderer(renderer.images)}",args.baseline_renderer.read_text('utf-8-sig'))
        delta=page.evaluate("()=>oldEngine.categories.filter(c=>c.id!=='meme').map(c=>({category:c.id,missing:c.options.filter(o=>!categories.find(n=>n.id===c.id).options.some(n=>n[0]===o[0])),added:categories.find(n=>n.id===c.id).options.filter(o=>!c.options.some(n=>n[0]===o[0])).map(o=>o[0])}))")
        check('The published catalog loses no choices and gains only BEAR and BOBO truckers',all(not x['missing'] and x['added']==(list(hats) if x['category']=='headwear' else []) for x in delta),delta)
        for fur in colors:
            result=page.evaluate('''fur=>{const a=canvas(),b=canvas(),out=[];for(const cat of oldEngine.categories.filter(c=>!['meme','fur'].includes(c.id)))for(const[id]of cat.options){const s=settings({fur,[cat.id]:id});oldRenderer.draw(a.getContext('2d'),s);renderer.draw(b.getContext('2d'),s);out.push({category:cat.id,id,same:identical(a,b)})}return out}''',fur)
            check(f'{fur}: all 72 published trait combinations remain pixel-identical',len(result)==72 and all(x['same'] for x in result),{'combinations':len(result),'failures':[x for x in result if not x['same']]})
        page.evaluate('oldRenderer=null')
    for id in hats:
        result=page.evaluate('''id=>{const out=[],a=canvas(),b=canvas(),layer=canvas();renderer.draw(a.getContext('2d'),settings({headwear:id}),'headwear');for(const fur of palettes){const s=settings({headwear:id,fur:fur.id});renderer.draw(b.getContext('2d'),s,'headwear');const head=renderer.head(fur,id),ref=renderer.head(fur,'trucker');let gaps=0;const native=ref.getContext('2d').getImageData(0,0,1024,1024).data;renderer.draw(layer.getContext('2d'),{...s,transparent:true});const full=layer.getContext('2d').getImageData(0,0,1024,1024).data;for(let y=320;y<480;y++)for(let x=180;x<850;x++){const i=(y*1024+x)*4;if(full[i+3]+1<native[i+3])gaps++}out.push({fur:fur.id,material:identical(a,b),head:identical(head,ref),gaps})}return out}''',id)
        check(id+': materials stay fixed, tucked head is identical and forehead has no gaps in six palettes',all(x['material'] and x['head'] and x['gaps']==0 for x in result),result)
        cases=page.evaluate('''id=>{const out=[];for(const fur of palettes)for(const[eyewear]of categories.find(c=>c.id==='eyewear').options){const s={headwear:id,fur:fur.id,eyewear};out.push({...s,same:layerParity(s)})}return out}''',id)
        check(id+': all 54 palette/eyewear combinations recompose exactly',len(cases)==54 and all(x['same'] for x in cases))
        grid=Image.new('RGB',(9*160,6*182),'#f5f2e9');gd=ImageDraw.Draw(grid)
        for n,case in enumerate(cases):
            im=png(page.evaluate('extra=>art(extra)',{k:v for k,v in case.items() if k!='same'}));x=n%9*160;y=n//9*182
            grid.paste(im.resize((160,160)),(x,y));gd.text((x+4,y+162),case['fur']+' / '+case['eyewear'],fill='#29251f')
        grid.save(args.output/f'{id}-eyewear-palettes.jpg',quality=94)
        outfits=page.evaluate('''id=>{const out=[];for(const fur of palettes)for(const[outfit]of categories.find(c=>c.id==='outfit').options){const s={headwear:id,fur:fur.id,outfit,prop:'championship'};out.push({...s,same:layerParity(s)})}return out}''',id)
        check(id+': all 72 outfit/palette/championship combinations recompose exactly',len(outfits)==72 and all(x['same'] for x in outfits))
        clear=page.evaluate('''id=>{const a=canvas(),b=canvas(),out=[];for(const fur of palettes){renderer.draw(a.getContext('2d'),settings({fur:fur.id}));renderer.draw(b.getContext('2d'),settings({fur:fur.id,headwear:id}));const x=a.getContext('2d').getImageData(220,480,660,95).data,y=b.getContext('2d').getImageData(220,480,660,95).data;out.push(x.every((v,i)=>v===y[i]))}return out.every(Boolean)}''',id)
        check(id+': eyes remain unobstructed in all palettes',clear)
        page.evaluate("()=>{state=defaults();history=[];future=[];locks.clear();render();selectCategory('headwear')}")
        page.get_by_role('button',name=hats[id],exact=True).click()
        check(id+': real picker selects the hat and retains focus',page.evaluate('id=>state.headwear===id&&document.activeElement.classList.contains("trait-option")',id))
        page.locator('#undo').click();undone=page.evaluate("state.headwear==='none'");page.locator('#redo').click()
        check(id+': undo and redo restore the selection',undone and page.evaluate('id=>state.headwear===id',id))
        page.locator('#lock-category').click()
        for _ in range(3):page.locator('#randomize').click()
        check(id+': randomize keeps the locked hat and a compatible outfit',page.evaluate("id=>state.headwear===id&&state.outfit!=='hazmat'",id))
        page.locator('#lock-category').click()
        page.get_by_role('tab',name='Outfit',exact=True).click();page.get_by_role('button',name='Hazmat suit',exact=True).click()
        page.get_by_role('tab',name='Headwear',exact=True).click()
        check(id+': hazmat clears the hat and disables its choice',page.evaluate("state.headwear==='none'") and page.get_by_role('button',name=hats[id],exact=True).is_disabled())
        page.evaluate('id=>{state=settings({headwear:id,eyewear:"goggles",prop:"championship",fur:"panda",top:"BEAR COUNCIL",textSize:48});render();renderPanel()}',id)
        for transparent in [False,True]:
            page.locator('#transparent').set_checked(transparent);preview=png(page.locator('#preview').evaluate('c=>c.toDataURL()'))
            with page.expect_download() as download:page.locator('#download').click()
            path=args.output/f'{id}-{"transparent" if transparent else "solid"}.png';download.value.save_as(path)
            actual=Image.open(path).convert('RGBA')
            check(id+f': {"transparent" if transparent else "opaque"} PNG matches the preview including caption',actual.size==(1024,1024) and same(actual,preview) and (actual.getpixel((0,0))[3]==0 if transparent else actual.getchannel('A').getextrema()==(255,255)))
        page.locator('.export-menu summary').click()
        with page.expect_download(timeout=120000) as download:page.locator('#export-layers').click()
        path=args.output/f'{id}-layers.zip';download.value.save_as(path)
        with zipfile.ZipFile(path) as z:
            joined=png(page.evaluate('urls=>compose(urls)',[url(z.read(name)) for name in sorted(z.namelist()) if name.startswith('layers/')]))
            meta=json.loads(z.read('bobo.json'))
            check(id+': current layer ZIP passes CRC and reconstructs the preview exactly',z.testzip() is None and same(joined,preview))
            check(id+': export metadata records the correct hat and release',meta['maker']['settings']['headwear']==id and meta['maker']['version']=='6.14.1' and any(a['trait_type']=='Headwear' and a['value']==hats[id] for a in meta['attributes']))
    page.locator('.export-menu summary').click()
    with page.expect_download(timeout=300000) as download:page.locator('#export-kit').click()
    path=args.output/'bobo-layer-kit.zip';download.value.save_as(path)
    with zipfile.ZipFile(path) as z:
        manifest=json.loads(z.read('manifest.json'));layers=[n for n in z.namelist() if n.startswith('layers/')]
        check('Full kit contains 211 named PNG layers and 214 entries with valid CRC',len(layers)==211 and len(z.namelist())==214 and z.testzip() is None,{'layers':len(layers),'entries':len(z.namelist())})
        check('Full kit keeps Pump.fun and maps both new hats to tucked-ear heads',all(manifest['headwearHeadVariant'][id]=='tucked' and f'layers/headwear/{id}.png' in layers for id in ['trucker',*hats]) and manifest['version']=='6.14.1')
        results=[]
        for id in hats:
            for fur in colors:
                paths=['layers/background/sage.png',f'layers/outfit/{fur}/tee-red.png',f'layers/fur/tucked/{fur}.png',f'layers/headwear/{id}.png']
                joined=png(page.evaluate('urls=>compose(urls)',[url(z.read(n)) for n in paths]))
                results.append(same(joined,png(page.evaluate('s=>art(s)',{'headwear':id,'fur':fur}))))
        check('All 12 new hat/palette previews rebuild exactly from the downloaded full kit',all(results) and len(results)==12)
    check('Export controls recover and temporary canvases are removed',page.locator('#download').is_enabled() and page.locator('#export-status').is_hidden() and page.locator('body > canvas').count()==0)
    page.evaluate("()=>{state=settings({headwear:'bobo-trucker'});render();selectCategory('headwear')}")
    for width in [320,390,768,1024,1440]:
        page.set_viewport_size({'width':width,'height':1080})
        check(f'{width}px: labels fit, preview stays square and page has no overflow',page.evaluate("document.documentElement.scrollWidth===innerWidth&&Math.abs(document.querySelector('#preview').clientWidth-document.querySelector('#preview').clientHeight)<2") and page.locator('.option-name').evaluate_all('nodes=>nodes.every(n=>n.scrollWidth<=n.clientWidth)'))
        if width in [390,1440]:page.screenshot(path=str(args.output/f'layout-{width}.png'),full_page=True)
    check('No browser errors or failed asset requests',not errors and not failures,{'errors':errors,'failures':failures})
    browser.close()
server.shutdown();print('Completed',len(checks),'trucker-pair checks.',flush=True)
