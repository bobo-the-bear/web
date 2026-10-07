"""Focused three-trait revision: visual reviews, baseline parity and real downloads.

Run with the Pillow/Playwright dependencies documented in verify.py.
The optional baseline is renderer.js from the published 22ab442f release.
"""
import argparse,base64,functools,io,json,threading,zipfile
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from PIL import Image,ImageDraw,ImageFont,ImageChops
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--output',type=Path,default=Path('focused-review'))
parser.add_argument('--baseline-renderer',type=Path)
args=parser.parse_args();args.output.mkdir(parents=True,exist_ok=True)
repo=Path(__file__).resolve().parents[3];checks=[]
new={'outfit':['hazmat'],'headwear':['beret'],'eyewear':['goggles']}
removed=['rugby','rider','cardigan','builder','headphones','pixel','hearts','pearls','tie','scarf','diamond','plunger','honey-pop']
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
    page.on('requestfailed',lambda r:failures.append({'url':r.url,'error':r.failure}) if '/assets/bobomaker/' in r.url else None)
    page.on('response',lambda r:failures.append(r.url) if r.status>=400 and '/assets/bobomaker/' in r.url else None)
    page.goto(f'http://127.0.0.1:{server.server_port}/bobomaker.html',wait_until='domcontentloaded')
    try:page.wait_for_function('ready',timeout=90000)
    except Exception:
        check('Artwork reaches ready state',False,{'errors':errors,'failures':failures,'load_state':page.locator('#load-state').inner_text()})
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
    check('All artwork loads and all 73 traits are available',not failures and page.locator('#asset-count').inner_text()=='73 TRAITS',failures)
    counts={c['id']:len(c['options']) for c in catalog if c['id'] in ['outfit','headwear','eyewear','neck','prop']}
    check('Only Hazmat suit, Burgundy beret and Fallout goggles are added',counts=={'outfit':12,'headwear':9,'eyewear':9,'neck':6,'prop':12} and all((cat,id) in labels for cat,ids in new.items() for id in ids),counts)
    check('Fallout goggles replaces Honey rounds consistently in inventory and loading',('eyewear','goggles') in labels and labels[('eyewear','goggles')]=='Fallout goggles' and ('eyewear','rounds') not in labels and page.evaluate("!('rounds' in BoboEngine.assetSources)"))
    glass=page.evaluate('''()=>{const c=renderer.gogglesArt(),cx=c.getContext('2d');return [.257,.743].map(x=>cx.getImageData(Math.round(c.width*x),Math.round(c.height*.5),1,1).data[3])}''')
    check('Goggle lens centers are translucent while the generated reflection remains visible',all(100<a<230 for a in glass),glass)
    check('Removed Daily Bobo and Feel the Boom remain absent',not any('daily bobo' in name.lower() or 'feel the boom' in name.lower() for name in labels.values()))
    check('The thirteen rejected additions are inactive, unloaded and preserved as source art',
          all(not any(id==o[0] for c in catalog for o in c['options']) for id in removed)
          and page.evaluate('ids=>ids.every(id=>!(id in BoboEngine.assetSources))',removed)
          and all((repo/f'assets/bobomaker/v15/{id}.png').is_file() for id in removed))
    if args.baseline_renderer:
        page.evaluate('''source=>{window.oldEngine=(new Function('window',source+';return window.BoboEngine;'))({});window.oldRenderer=new oldEngine.Renderer(renderer.images)}''',args.baseline_renderer.read_text('utf-8-sig'))
        delta=page.evaluate('''()=>oldEngine.categories.filter(c=>c.id!=='meme').map(c=>({category:c.id,missing:c.options.filter(o=>!categories.find(n=>n.id===c.id).options.some(n=>n[0]===o[0])),added:categories.find(n=>n.id===c.id).options.filter(o=>!c.options.some(n=>n[0]===o[0])).map(o=>o[0])}))''')
        check('Baseline catalog loses no choices and gains only the requested three',all(not x['missing'] and x['added']==new.get(x['category'],[]) for x in delta),delta)
        for fur in colors:
            cases=page.evaluate('''fur=>{const a=canvas(),b=canvas(),out=[];for(const c of oldEngine.categories.filter(c=>!['fur','meme'].includes(c.id)))for(const[id]of c.options){const s=settings({fur,[c.id]:id});oldRenderer.draw(a.getContext('2d'),s);renderer.draw(b.getContext('2d'),s);out.push({category:c.id,id,same:identical(a,b)})}return out}''',fur)
            check(f'{fur}: all 69 existing trait combinations are pixel-identical to published baseline',len(cases)==69 and all(c['same'] for c in cases),{'combinations':len(cases),'failures':[c for c in cases if not c['same']]})
        page.evaluate('oldRenderer=null')
    invariants=page.evaluate('''groups=>{
      const results=[];for(const outfit of groups.outfit){const original=canvas();renderer.draw(original.getContext('2d'),settings({outfit}),'outfit');for(const fur of palettes){const s=settings({outfit,fur:fur.id}),c=canvas();renderer.draw(c.getContext('2d'),s,'outfit');const sleeve=[100,924].every(x=>c.getContext('2d').getImageData(x,985,1,1).data[3]>250);results.push({outfit,fur:fur.id,material:identical(original,c),sleeve})}}
      return results;
    }''',new)
    check('Hazmat keeps complete sleeves and invariant materials in six palettes',all(x['material'] and x['sleeve'] for x in invariants),invariants)
    face=page.evaluate('''()=>{const result=[];for(const fur of palettes){const head=renderer.head(fur,'none','hazmat'),d=head.getContext('2d').getImageData(522,565,1,1).data;result.push({fur:fur.id,nose:[...d],opaque:d[3]>250})}return result}''')
    check('The enclosed visor retains the original Bobo nose in every palette',all(x['opaque'] and max(x['nose'][:3])<100 for x in face),face)
    source=[]
    for cat,ids in new.items():
        for id in ids:
            im=Image.open(repo/f'assets/bobomaker/{"v15" if id=="beret" else "v17"}/{id}.png')
            source.append({'id':id,'size':im.size,'alpha':im.getchannel('A').getextrema()})
    # Some generated material pixels use alpha 254 rather than 255. Require
    # a transparent exterior and solid material without rewriting source art.
    check('All three source PNGs have transparent exteriors and solid material',all(x['alpha'][0]==0 and x['alpha'][1]>=250 for x in source),source)
    font=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',24);small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18)
    contact=Image.new('RGB',(1116,498),'#f5f2e9');d=ImageDraw.Draw(contact)
    d.text((26,18),'BOBO MAKER / FOCUSED REVIEW',font=font,fill='#282b24')
    d.text((26,54),'v6.13.0 | Hazmat suit, fitted beret and strapped Fallout goggles',font=small,fill='#626658')
    palette_sheet=Image.new('RGB',(1200,3*226),'#f5f2e9');pd=ImageDraw.Draw(palette_sheet)
    singles={};parity=[]
    for row,(cat,ids) in enumerate(new.items()):
        id=ids[0]
        for fi,fur in enumerate(colors):
            extra={cat:id,'fur':fur};im=png(page.evaluate('extra=>art(extra)',extra));singles[(cat,id,fur)]=im
            parity.append(page.evaluate('extra=>layerParity(extra)',extra))
            palette_sheet.paste(im.resize((200,200)),(fi*200,row*226));pd.text((fi*200+6,row*226+203),f'{fur} / {id}',fill='#282b24')
        im=singles[(cat,id,'classic')];im.save(args.output/f'{"rounds" if id=="goggles" else id}-full-preview.png')
        x=row*372+12;y=100;contact.paste(im.resize((348,348)),(x,y));d.text((x+4,y+354),labels[(cat,id)],font=small,fill='#282b24')
        print('Rendered all palettes: '+cat,flush=True)
    contact.save(args.output/'bobo-focused-traits.jpg',quality=95);palette_sheet.save(args.output/'focused-all-palettes.jpg',quality=94)
    check('All 18 trait/palette combinations render and recompose exactly',len(parity)==18 and all(parity))
    eyes=page.evaluate('''()=>{const cases=[];for(const fur of palettes)for(const[id]of categories.find(c=>c.id==='eyewear').options){const s={outfit:'hazmat',fur:fur.id,eyewear:id};cases.push({...s,same:layerParity(s)})}return cases}''')
    check('All 54 hazmat/eyewear/palette combinations recompose exactly',len(eyes)==54 and all(x['same'] for x in eyes))
    pairs=page.evaluate('''()=>{const cases=[];for(const cat of ['neck','prop'])for(const[id]of categories.find(c=>c.id===cat).options)for(const fur of palettes){const s={outfit:'hazmat',fur:fur.id,[cat]:id};cases.push({...s,same:layerParity(s)})}return cases}''')
    check('All 108 hazmat/neckwear/prop/palette combinations recompose exactly',len(pairs)==108 and all(x['same'] for x in pairs))
    accessories=page.evaluate('''()=>{const cases=[];for(const fur of palettes){for(const[headwear]of categories.find(c=>c.id==='headwear').options){const s={fur:fur.id,headwear,eyewear:'goggles'};cases.push({...s,same:layerParity(s)})}for(const[eyewear]of categories.find(c=>c.id==='eyewear').options){const s={fur:fur.id,headwear:'beret',eyewear};cases.push({...s,same:layerParity(s)})}}return cases}''')
    check('All 108 goggles/headwear and beret/eyewear/palette combinations recompose exactly',len(accessories)==108 and all(x['same'] for x in accessories))
    accessory_sheet=Image.new('RGB',(1200,6*150),'#f5f2e9');ad=ImageDraw.Draw(accessory_sheet)
    goggles_cases=[c for n,c in enumerate(accessories) if n%18<9]
    for n,case in enumerate(goggles_cases[:54]):
        im=png(page.evaluate('extra=>art(extra)',{k:v for k,v in case.items() if k!='same'}));x=n%9*133;y=n//9*150
        accessory_sheet.paste(im.resize((133,133)),(x,y));ad.text((x+3,y+133),case['headwear']+' / '+case['fur'],fill='#282b24')
    accessory_sheet.save(args.output/'goggles-headwear-palettes.jpg',quality=95)
    eyewear_sheet=Image.new('RGB',(1200,6*150),'#f5f2e9');ed=ImageDraw.Draw(eyewear_sheet)
    for n,case in enumerate(eyes):
        im=png(page.evaluate('extra=>art(extra)',{k:v for k,v in case.items() if k!='same'}));x=n%9*133;y=n//9*150
        eyewear_sheet.paste(im.resize((133,133)),(x,y));ed.text((x+3,y+133),case['eyewear'],fill='#282b24')
    eyewear_sheet.save(args.output/'hazmat-all-eyewear.jpg',quality=95)
    page.evaluate("()=>{state=settings({headwear:'trucker'});history=[];future=[];render();selectCategory('outfit')}")
    page.get_by_role('button',name='Hazmat suit',exact=True).click()
    page.evaluate("selectCategory('headwear')")
    check('Hazmat clears hats, disables incompatible headwear and explains why',page.evaluate("state.headwear==='none'&&state.outfit==='hazmat'") and page.locator('.trait-option:disabled').count()==8 and 'hood covers headwear' in page.locator('#category-help').inner_text())
    page.locator('#undo').click();restored=page.evaluate("state.outfit==='tee-red'&&state.headwear==='trucker'")
    page.locator('#redo').click()
    check('Undo and redo restore the compatible outfit and headwear together',restored and page.evaluate("state.outfit==='hazmat'&&state.headwear==='none'"))
    locked=page.evaluate('''()=>{state=settings({headwear:'trucker'});locks.add('headwear');const results=[];for(let n=0;n<20;n++){randomize();results.push(state.headwear==='trucker'&&state.outfit!=='hazmat')}locks.clear();return results.every(Boolean)}''')
    check('Randomize respects a locked hat without selecting the enclosing hazmat hood',locked)
    combinations=[{'headwear':'beret','eyewear':'goggles','background':'blue'},
                  {'outfit':'hazmat'},
                  {'outfit':'hazmat','eyewear':'goggles','neck':'gold-chain','prop':'championship','fur':'polar'},
                  {'outfit':'hazmat','eyewear':'meta','prop':'coffee','fur':'panda'},
                  {'outfit':'hazmat','eyewear':'goggles','fur':'custom','colors':{'fur':'#38658c','muzzle':'#27465f','ears':'#b999c9'},'top':'COUNCIL APPROVED','textSize':48}]
    for n,extra in enumerate(combinations):
        page.evaluate('extra=>{state=settings(extra);render();renderPanel()}',extra)
        for cat in new:
            if cat not in extra:continue
            page.get_by_role('tab',name=next(c['name'] for c in catalog if c['id']==cat),exact=True).click()
            page.get_by_role('button',name=labels[(cat,extra[cat])],exact=True).click()
        check(f'Look {n+1}: picker controls apply the correct choices',page.evaluate('extra=>Object.keys(extra).filter(k=>k in state).every(k=>JSON.stringify(state[k])===JSON.stringify(extra[k]))',extra))
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
            check(f'Look {n+1}: metadata records every selected trait, colors and version',metadata['maker']['version']=='6.13.0' and all(values[next(c['name'] for c in catalog if c['id']==cat)]==labels[(cat,extra[cat])] for cat in new if cat in extra) and metadata['maker']['settings']['colors']==page.evaluate('state.colors'))
    page.locator('.export-menu summary').click()
    with page.expect_download(timeout=300000) as dl:page.locator('#export-kit').click()
    kit_path=args.output/'bobo-full-kit.zip';dl.value.save_as(kit_path)
    with zipfile.ZipFile(kit_path) as z:
        manifest=json.loads(z.read('manifest.json'));paths=[]
        for cat in manifest['categories']:
            for trait in cat['traits']:
                if trait['file']:paths.extend([trait['file'].replace('{fur}',fur) for fur in colors] if cat['variantBy']=='fur' else [trait['file']])
        for variant in ['tucked','hazmat']:paths.extend(manifest['headVariants'][variant].replace('{fur}',fur) for fur in colors)
        paths.extend(manifest['outfitEyewearVariant']['hazmat'].replace('{eyewear}',id) for id,name in next(c for c in catalog if c['id']=='eyewear')['options'] if id!='none')
        check('Full kit contains 209 named 1024px layers, valid CRC and 212 total entries',z.testzip() is None and len(paths)==209 and len(z.namelist())==212 and all(n in z.namelist() and Image.open(io.BytesIO(z.read(n))).size==(1024,1024) for n in paths),{'layers':len(paths),'entries':len(z.namelist())})
        check('Kit maps all fitted hats to correct head variants',manifest['headwearHeadVariant']=={id:'tucked' for id in ['trucker','cowboy','beret']} and manifest['version']=='6.13.0')
        check('Kit records hazmat head, eyewear and headwear compatibility',manifest['outfitHeadVariant']=={'hazmat':'hazmat'} and manifest['outfitCompatibility']=={'hazmat':{'headwear':['none']}} and all('/'+id+'.png' not in name for id in removed for name in z.namelist()))
        def kit_layers(extra):
            fur=extra.get('fur','classic');hat=extra.get('headwear','none');outfit=extra.get('outfit','tee-red')
            variant=manifest['outfitHeadVariant'].get(outfit,manifest['headwearHeadVariant'].get(hat,'standard'))
            layers=['layers/background/sage.png',f'layers/outfit/{fur}/{outfit}.png',manifest['headVariants'][variant].replace('{fur}',fur)]
            for cat in ['neck','headwear','eyewear','prop']:
                id=extra.get(cat,'none')
                if id=='none':continue
                if cat=='eyewear' and outfit in manifest['outfitEyewearVariant']:layers.append(manifest['outfitEyewearVariant'][outfit].replace('{eyewear}',id))
                else:layers.append(f'layers/{cat}/'+(fur+'/' if cat=='prop' else '')+id+'.png')
            return layers
        results=[]
        for cat,ids in new.items():
            for id in ids:
                for fur in colors:
                    extra={cat:id,'fur':fur};joined=png(page.evaluate('urls=>compose(urls)',[url(z.read(n)) for n in kit_layers(extra)]))
                    results.append({'id':id,'fur':fur,'same':same(joined,singles[(cat,id,fur)])})
        for case in eyes:
            extra={k:v for k,v in case.items() if k!='same'};joined=png(page.evaluate('urls=>compose(urls)',[url(z.read(n)) for n in kit_layers(extra)]))
            results.append({'eyewear':case['eyewear'],'fur':case['fur'],'same':same(joined,png(page.evaluate('extra=>art(extra)',extra)))})
        check('All 72 focused trait and hazmat/eyewear previews rebuild exactly from the downloaded full kit',len(results)==72 and all(x['same'] for x in results),{'combinations':len(results),'failures':[x for x in results if not x['same']]})
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
server.shutdown();print('Completed',len(checks),'focused revision checks.',flush=True)
