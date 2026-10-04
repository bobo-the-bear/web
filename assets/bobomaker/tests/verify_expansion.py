"""Fifteen-trait expansion: visual reviews, baseline parity and real downloads.

Run with the Pillow/Playwright dependencies documented in verify.py.
The optional baseline is renderer.js from the published 22ab442f release.
"""
import argparse,base64,functools,io,json,threading,zipfile
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from PIL import Image,ImageDraw,ImageFont,ImageChops
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--output',type=Path,default=Path('expansion-review'))
parser.add_argument('--baseline-renderer',type=Path)
args=parser.parse_args();args.output.mkdir(parents=True,exist_ok=True)
repo=Path(__file__).resolve().parents[3];checks=[]
new={'outfit':['rugby','rider','cardigan'],'headwear':['beret','builder','headphones'],
     'eyewear':['rounds','pixel','hearts'],'neck':['pearls','tie','scarf'],
     'prop':['diamond','plunger','honey-pop']}
def check(name,passed,details=None):
    checks.append({'check':name,'passed':bool(passed),'details':details})
    (args.output/'verification.json').write_text(json.dumps(checks,indent=2))
    print(('PASS ' if passed else 'FAIL ')+name,flush=True)
    assert passed,(name,details)
def png(url):return Image.open(io.BytesIO(base64.b64decode(url.split(',')[1]))).convert('RGBA')
def same(a,b):return all(hi==0 for lo,hi in ImageChops.difference(a,b).getextrema())
def url(data):return 'data:image/png;base64,'+base64.b64encode(data).decode()
class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(repo)))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True);page=browser.new_page(viewport={'width':1440,'height':1080})
    errors=[];failures=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('response',lambda r:failures.append(r.url) if r.status>=400 and '/assets/bobomaker/' in r.url else None)
    page.goto(f'http://127.0.0.1:{server.server_port}/bobomaker.html',wait_until='domcontentloaded')
    page.wait_for_function('ready',timeout=90000)
    page.evaluate('''()=>{
      window.canvas=()=>{const c=document.createElement('canvas');c.width=c.height=1024;return c};
      window.settings=extra=>{const s={...defaults(),...extra};if(extra.fur&&extra.fur!=='custom')s.colors={...palettes.find(p=>p.id===extra.fur)};return s};
      window.art=(extra,only=null)=>{const c=canvas();renderer.draw(c.getContext('2d'),settings(extra),only);return c.toDataURL()};
      window.identical=(a,b)=>{const x=a.getContext('2d').getImageData(0,0,1024,1024).data,y=b.getContext('2d').getImageData(0,0,1024,1024).data;for(let i=0;i<x.length;i++)if(x[i]!==y[i])return false;return true};
      window.compose=async urls=>{const c=canvas(),cx=c.getContext('2d');for(const url of urls){const im=new Image();im.src=url;await im.decode();cx.drawImage(im,0,0)}return c.toDataURL()};
      window.layerParity=extra=>{const s=settings(extra),a=canvas(),b=canvas(),layer=canvas();renderer.draw(a.getContext('2d'),s);for(const cat of ['background','outfit','fur','neck','headwear','eyewear','prop','meme']){renderer.draw(layer.getContext('2d'),s,cat);b.getContext('2d').drawImage(layer,0,0)}return identical(a,b)};
    }''')
    catalog=page.evaluate('categories');colors=page.evaluate('palettes.map(p=>p.id)')
    labels={(c['id'],o[0]):o[1] for c in catalog for o in c['options']}
    check('All artwork loads and all 85 traits are available',not failures and page.locator('#asset-count').inner_text()=='85 TRAITS',failures)
    counts={c['id']:len(c['options']) for c in catalog if c['id'] in new}
    check('Exactly three new choices per requested category',counts=={'outfit':14,'headwear':11,'eyewear':11,'neck':9,'prop':15} and all((cat,id) in labels for cat,ids in new.items() for id in ids),counts)
    check('Removed Daily Bobo and Feel the Boom remain absent',not any('daily bobo' in name.lower() or 'feel the boom' in name.lower() for name in labels.values()))
    if args.baseline_renderer:
        page.evaluate('''source=>{window.oldEngine=(new Function('window',source+';return window.BoboEngine;'))({});window.oldRenderer=new oldEngine.Renderer(renderer.images)}''',args.baseline_renderer.read_text('utf-8-sig'))
        delta=page.evaluate('''()=>oldEngine.categories.filter(c=>c.id!=='meme').map(c=>({category:c.id,missing:c.options.filter(o=>!categories.find(n=>n.id===c.id).options.some(n=>n[0]===o[0])),added:categories.find(n=>n.id===c.id).options.filter(o=>!c.options.some(n=>n[0]===o[0])).map(o=>o[0])}))''')
        check('Baseline catalog loses no choices and gains only the requested fifteen',all(not x['missing'] and x['added']==new.get(x['category'],[]) for x in delta),delta)
        for fur in colors:
            cases=page.evaluate('''fur=>{const a=canvas(),b=canvas(),out=[];for(const c of oldEngine.categories.filter(c=>!['fur','meme'].includes(c.id)))for(const[id]of c.options){const s=settings({fur,[c.id]:id});oldRenderer.draw(a.getContext('2d'),s);renderer.draw(b.getContext('2d'),s);out.push({category:c.id,id,same:identical(a,b)})}return out}''',fur)
            check(f'{fur}: all 69 existing trait combinations are pixel-identical to published baseline',len(cases)==69 and all(c['same'] for c in cases),{'combinations':len(cases),'failures':[c for c in cases if not c['same']]})
        page.evaluate('oldRenderer=null')
    invariants=page.evaluate('''groups=>{
      const results=[];for(const outfit of groups.outfit){const original=canvas();renderer.draw(original.getContext('2d'),settings({outfit}),'outfit');for(const fur of palettes){const s=settings({outfit,fur:fur.id}),c=canvas();renderer.draw(c.getContext('2d'),s,'outfit');const sleeve=[100,924].every(x=>c.getContext('2d').getImageData(x,985,1,1).data[3]>250);results.push({outfit,fur:fur.id,material:identical(original,c),sleeve})}}
      return results;
    }''',new)
    check('All three outfits keep complete sleeves and invariant materials in six palettes',all(x['material'] and x['sleeve'] for x in invariants),invariants)
    head=page.evaluate('''groups=>{const results=[];for(const fur of palettes){const a=canvas(),b=canvas();renderer.draw(a.getContext('2d'),settings({fur:fur.id}),'fur');for(const outfit of groups.outfit){renderer.draw(b.getContext('2d'),settings({fur:fur.id,outfit}),'fur');results.push(identical(a,b))}for(const headwear of groups.headwear){renderer.draw(b.getContext('2d'),settings({fur:fur.id,headwear}),'fur');const x=a.getContext('2d').getImageData(100,400,824,335).data,y=b.getContext('2d').getImageData(100,400,824,335).data;results.push(x.every((v,i)=>v===y[i]))}}return results.every(Boolean)}''',new)
    check('Every new outfit and headwear preserves the approved face in every palette',head)
    source=[]
    for cat,ids in new.items():
        for id in ids:
            im=Image.open(repo/f'assets/bobomaker/v15/{id}.png')
            source.append({'id':id,'size':im.size,'alpha':im.getchannel('A').getextrema()})
    # Some generated material pixels use alpha 254 rather than 255. Require
    # a transparent exterior and solid material without rewriting source art.
    check('All fifteen source PNGs have transparent exteriors and solid material',all(x['alpha'][0]==0 and x['alpha'][1]>=250 for x in source),source)
    font=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',24);small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18)
    contact=Image.new('RGB',(1116,2072),'#f5f2e9');d=ImageDraw.Draw(contact)
    d.text((26,18),'BOBO MAKER / 15 NEW TRAITS',font=font,fill='#282b24')
    d.text((26,54),'Private review · v6.11.0 · Three new choices per category',font=small,fill='#626658')
    palette_sheet=Image.new('RGB',(1200,15*226),'#f5f2e9');pd=ImageDraw.Draw(palette_sheet)
    singles={};parity=[]
    for row,(cat,ids) in enumerate(new.items()):
        for col,id in enumerate(ids):
            for fi,fur in enumerate(colors):
                extra={cat:id,'fur':fur};im=png(page.evaluate('extra=>art(extra)',extra));singles[(cat,id,fur)]=im
                parity.append(page.evaluate('extra=>layerParity(extra)',extra))
                palette_sheet.paste(im.resize((200,200)),(fi*200,(row*3+col)*226));pd.text((fi*200+6,(row*3+col)*226+203),f'{fur} / {id}',fill='#282b24')
            im=singles[(cat,id,'classic')];x=col*372+12;y=row*394+100;contact.paste(im.resize((348,348)),(x,y));d.text((x+4,y+354),labels[(cat,id)],font=small,fill='#282b24')
        print('Rendered all palettes: '+cat,flush=True)
    contact.save(args.output/'bobo-15-new-traits.jpg',quality=95);palette_sheet.save(args.output/'new-traits-all-palettes.jpg',quality=94)
    check('All 90 new trait/palette combinations render and recompose exactly',len(parity)==90 and all(parity))
    pairs=page.evaluate('''groups=>{const cases=[];for(const [cat,other]of [['headwear','eyewear'],['eyewear','headwear'],['neck','outfit'],['prop','outfit']])for(const id of groups[cat])for(const[o]of categories.find(c=>c.id===other).options){const s={[cat]:id,[other]:o};cases.push({...s,same:layerParity(s)})}return cases}''',new)
    check('150 new/existing accessory and outfit pairs recompose exactly',len(pairs)==150 and all(x['same'] for x in pairs),{'combinations':len(pairs),'failures':[x for x in pairs if not x['same']]})
    combinations=[{'outfit':'rugby','headwear':'beret','eyewear':'rounds','neck':'pearls','prop':'diamond','background':'blue'},
                  {'outfit':'rider','headwear':'builder','eyewear':'pixel','neck':'tie','prop':'plunger','background':'lavender','fur':'polar'},
                  {'outfit':'cardigan','headwear':'headphones','eyewear':'hearts','neck':'scarf','prop':'honey-pop','background':'pink','fur':'panda'},
                  {'outfit':'cardigan','headwear':'trucker','eyewear':'rounds','neck':'tie','prop':'diamond','fur':'custom','colors':{'fur':'#38658c','muzzle':'#27465f','ears':'#b999c9'},'top':'COUNCIL APPROVED','textSize':48}]
    for n,extra in enumerate(combinations):
        page.evaluate('extra=>{state=settings(extra);render();renderPanel()}',extra)
        if n<3:
            for cat in new:
                page.get_by_role('tab',name=next(c['name'] for c in catalog if c['id']==cat),exact=True).click()
                page.get_by_role('button',name=labels[(cat,extra[cat])],exact=True).click()
            check(f'Look {n+1}: all five new picker controls apply the correct choices',page.evaluate('extra=>Object.keys(extra).filter(k=>k in state).every(k=>JSON.stringify(state[k])===JSON.stringify(extra[k]))',extra))
        for transparent in [False,True]:
            page.locator('#transparent').set_checked(transparent);preview=png(page.locator('#preview').evaluate('c=>c.toDataURL()'))
            with page.expect_download() as dl:page.locator('#download').click()
            path=args.output/f'look-{n+1}-{"transparent" if transparent else "solid"}.png'
            dl.value.save_as(path);download=Image.open(path).convert('RGBA')
            check(f'Look {n+1}: {"transparent" if transparent else "opaque"} PNG download matches preview',download.size==(1024,1024) and same(download,preview) and (download.getpixel((0,0))[3]==0 if transparent else download.getchannel('A').getextrema()==(255,255)))
        page.locator('.export-menu summary').click()
        with page.expect_download(timeout=120000) as dl:page.locator('#export-layers').click()
        path=args.output/f'look-{n+1}-layers.zip';dl.value.save_as(path)
        with zipfile.ZipFile(path) as z:
            joined=png(page.evaluate('urls=>compose(urls)',[url(z.read(name)) for name in sorted(z.namelist()) if name.startswith('layers/')]))
            metadata=json.loads(z.read('bobo.json'));values={a['trait_type']:a['value'] for a in metadata['attributes']}
            check(f'Look {n+1}: downloaded layer ZIP passes CRC and reconstructs the preview exactly',z.testzip() is None and same(joined,preview) and same(Image.open(io.BytesIO(z.read('bobo.png'))).convert('RGBA'),preview))
            check(f'Look {n+1}: metadata records every selected trait, colors and version',metadata['maker']['version']=='6.11.0' and all(values[next(c['name'] for c in catalog if c['id']==cat)]==labels[(cat,extra[cat])] for cat in new) and metadata['maker']['settings']['colors']==page.evaluate('state.colors'))
    page.locator('.export-menu summary').click()
    with page.expect_download(timeout=300000) as dl:page.locator('#export-kit').click()
    kit_path=args.output/'bobo-full-kit.zip';dl.value.save_as(kit_path)
    with zipfile.ZipFile(kit_path) as z:
        manifest=json.loads(z.read('manifest.json'));paths=[]
        for cat in manifest['categories']:
            for trait in cat['traits']:
                if trait['file']:paths.extend([trait['file'].replace('{fur}',fur) for fur in colors] if cat['variantBy']=='fur' else [trait['file']])
        paths.extend(manifest['headVariants']['tucked'].replace('{fur}',fur) for fur in colors)
        check('Full kit contains 232 named 1024px layers, valid CRC and 235 total entries',z.testzip() is None and len(paths)==232 and len(z.namelist())==235 and all(n in z.namelist() and Image.open(io.BytesIO(z.read(n))).size==(1024,1024) for n in paths),{'layers':len(paths),'entries':len(z.namelist())})
        check('Kit maps all fitted hats to correct head variants',manifest['headwearHeadVariant']=={id:'tucked' for id in ['trucker','cowboy','builder','beret']} and manifest['version']=='6.11.0')
        results=[]
        for cat,ids in new.items():
            for id in ids:
                for fur in colors:
                    hat=id if cat=='headwear' else 'none';head=manifest['headVariants'][manifest['headwearHeadVariant'].get(hat,'standard')].replace('{fur}',fur)
                    outfit=id if cat=='outfit' else 'tee-red';layers=['layers/background/sage.png',f'layers/outfit/{fur}/{outfit}.png',head]
                    if cat not in ['outfit','fur']:layers.append(f'layers/{cat}/'+(fur+'/' if cat=='prop' else '')+id+'.png')
                    joined=png(page.evaluate('urls=>compose(urls)',[url(z.read(n)) for n in layers]));results.append({'id':id,'fur':fur,'same':same(joined,singles[(cat,id,fur)])})
            print('Reconstructed full-kit layers: '+cat,flush=True)
        check('All 90 new trait/palette previews rebuild exactly from the downloaded full kit',len(results)==90 and all(x['same'] for x in results),{'combinations':len(results),'failures':[x for x in results if not x['same']]})
    check('Export controls recover and hidden canvases are removed after the full kit',page.locator('#download').is_enabled() and page.locator('#export-status').is_hidden() and page.locator('body > canvas').count()==0)
    for width in [320,390,768,1024,1440]:
        page.set_viewport_size({'width':width,'height':1080});clipped=[]
        for cat in new:
            page.get_by_role('tab',name=next(c['name'] for c in catalog if c['id']==cat),exact=True).click()
            clipped+=page.locator('.option-name').evaluate_all('nodes=>nodes.filter(n=>n.scrollWidth>n.clientWidth).map(n=>n.textContent)')
        check(f'{width}px: all new labels fit, preview stays square and page has no overflow',not clipped and page.evaluate("document.documentElement.scrollWidth===innerWidth&&Math.abs(document.querySelector('#preview').clientWidth-document.querySelector('#preview').clientHeight)<2"),{'clipped':clipped})
        if width in [390,1440]:page.screenshot(path=str(args.output/f'layout-{width}.png'),full_page=True)
    check('No browser errors or failed artwork requests',not errors and not failures,{'errors':errors,'failures':failures})
    browser.close()
server.shutdown();print('Completed',len(checks),'expansion checks.',flush=True)
