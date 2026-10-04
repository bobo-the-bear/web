"""Private headwear review: palette/eyewear, ear occlusion and real export parity.

Run with the same Pillow/Playwright dependencies as verify.py. The optional
baseline renderer compares every unaffected trait against an earlier release.
"""
import argparse,base64,functools,hashlib,io,json,threading,zipfile
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from PIL import Image,ImageDraw,ImageChops,ImageFont
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--output',type=Path,default=Path('headwear-review'))
parser.add_argument('--baseline-renderer',type=Path)
parser.add_argument('--fit-baseline-renderer',type=Path,help='Pre-branding renderer to protect the reviewed hat fits')
parser.add_argument('--skip-kit',action='store_true')
parser.add_argument('--branding-only',action='store_true',help='Run only source, color and reviewed-fit branding checks')
args=parser.parse_args();args.output.mkdir(parents=True,exist_ok=True)
repo=Path(__file__).resolve().parents[3];checks=[]
hats=['trucker','ninja-bandana','cowboy','bucket'];names=['Pump.fun trucker','Red ninja bandana','Black cowboy','Black Bobo bucket']
def check(name,passed,details=None):
    checks.append({'check':name,'passed':bool(passed),'details':details})
    (args.output/'headwear-verification.json').write_text(json.dumps(checks,indent=2))
    print(('PASS ' if passed else 'FAIL ')+name,flush=True)
    assert passed,details
def decode(data):return Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA')
def diff(a,b):return max(v[1] for v in ImageChops.difference(a,b).getextrema())
def pngurl(im):
    b=io.BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(repo)))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True);page=browser.new_page(viewport={'width':1440,'height':1000})
    errors=[];failed=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('requestfailed',lambda r:failed.append(r.url))
    page.goto(f'http://127.0.0.1:{server.server_port}/bobomaker.html',wait_until='domcontentloaded')
    page.wait_for_function('ready',timeout=60000)
    page.evaluate('''()=>{window.reviewCanvas=()=>{const c=document.createElement('canvas');c.width=c.height=1024;return c};window.reviewRender=(hat,fur='classic',eye='none',only=null,old=false)=>{const c=reviewCanvas(),s={...defaults(),headwear:hat,fur,eyewear:eye,colors:{...palettes.find(p=>p.id===fur)}};(old?previousRenderer:renderer).draw(c.getContext('2d'),s,only);return c.toDataURL()}}''')
    check('All artwork loads and the 70-trait catalog stays complete',page.evaluate("Object.values(renderer.images).every(i=>i.complete&&i.naturalWidth>0)&&document.querySelector('#asset-count').textContent==='70 TRAITS'"))
    check('Wordmark is the exact supplied PNG, unchanged',hashlib.sha256((repo/'assets/bobomaker/v9/bobo-wordmark.png').read_bytes()).hexdigest()=='34594934bf651df08ec22c1b8f5ad3eadbff264b3b56a8e683af858360db6e72')
    check('Pump.fun logo is the exact supplied PNG, unchanged',hashlib.sha256((repo/'assets/bobomaker/v11/pump-fun-logo.png').read_bytes()).hexdigest()=='e341c92bed286bd78dbe9828878002e3acd385747c5f9dc405dc737df07d3701')
    check('Original trucker artwork remains unchanged',hashlib.sha256((repo/'assets/bobomaker/v11/trucker.png').read_bytes()).hexdigest()=='8bd528b48fb1f198967f1fb669bae2748de96ffc3438d6d029cd8e96d7bf6dcf')
    logo_colors=page.evaluate('''()=>{const c=reviewCanvas(),s={...defaults(),headwear:'bucket'};renderer.draw(c.getContext('2d'),s,'headwear');const expected=c.toDataURL();return [...palettes,{fur:'#00ff00',muzzle:'#ff00ff',ears:'#00ffff'}].every(colors=>{renderer.draw(c.getContext('2d'),{...s,colors},'headwear');return c.toDataURL()===expected})}''')
    check('Black fabric and wordmark colors are identical across all palettes and custom colors',logo_colors)
    if args.fit_baseline_renderer:
        fit=page.evaluate('''source=>{const old=(new Function('window',source+';return window.BoboEngine;'))({}),previous=new old.Renderer(renderer.images),a=reviewCanvas(),b=reviewCanvas(),results=[];
          for(const colors of palettes)for(const[id]of categories.find(c=>c.id==='headwear').options){if(['trucker','ninja-bandana'].includes(id))continue;const s={...defaults(),headwear:id,colors,fur:colors.id};previous.draw(a.getContext('2d'),s);renderer.draw(b.getContext('2d'),s);const ca=a.getContext('2d'),cb=b.getContext('2d');
            if(id==='bucket'){ca.clearRect(375,245,275,105);cb.clearRect(375,245,275,105)}results.push({hat:id,fur:colors.id,identical:a.toDataURL()===b.toDataURL()})}
          return results}''',args.fit_baseline_renderer.read_text(encoding='utf-8-sig'))
        check('Reviewed hat fits are pixel-identical; bucket changes stay within the front branding panel',all(x['identical'] for x in fit),{'combinations':len(fit),'failures':[x for x in fit if not x['identical']]})
    if args.branding_only:
        browser.close();server.shutdown()
        print('Completed',len(checks),'branding checks.',flush=True)
        raise SystemExit(0)
    if args.baseline_renderer:
        page.evaluate('''async source=>{const old=(new Function('window',source+';return window.BoboEngine;'))({}),images={...renderer.images};for(const[id,src]of Object.entries(old.assetSources)){if(src===BoboEngine.assetSources[id])continue;const im=new Image();im.src=src;await im.decode();images[id]=im}window.previousEngine=old;window.previousRenderer=new old.Renderer(images)}''',args.baseline_renderer.read_text(encoding='utf-8-sig'))
        unchanged=page.evaluate('''()=>{const a=reviewCanvas(),b=reviewCanvas(),results=[];for(const colors of palettes)for(const cat of categories.filter(c=>c.id!=='meme'&&c.id!=='fur'))for(const[id]of cat.options){if(cat.id==='headwear'&&id==='trucker')continue;const s={...defaults(),colors:{...colors},fur:colors.id,[cat.id]:id};previousRenderer.draw(a.getContext('2d'),s);renderer.draw(b.getContext('2d'),s);results.push({fur:colors.id,category:cat.id,id,identical:a.toDataURL()===b.toDataURL()})}return results}''')
        check('All unaffected palettes, outfits, props, backdrops, eyewear, neckwear and approved crown are pixel-identical',all(x['identical'] for x in unchanged),{'combinations':len(unchanged),'failures':[x for x in unchanged if not x['identical']]})
        previous_cap=page.evaluate("!!previousEngine.assetSources.cap")
        font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',26)
        for hat,name in zip(hats,names):
            before=decode(page.evaluate('(hat)=>reviewRender(hat==="trucker"&&previousEngine.assetSources.cap?"cap":hat,"classic","none",null,true)',hat));after=decode(page.evaluate('(hat)=>reviewRender(hat)',hat))
            sheet=Image.new('RGB',(1200,1140),'#f5f3ed');d=ImageDraw.Draw(sheet)
            for col,(im,label) in enumerate([(before,'Previous review'),(after,'Private revision')]):
                d.text((col*600+24,18),('Red cap' if hat=='trucker' and col==0 and previous_cap else name)+' / '+label,font=font,fill='#26211e')
                sheet.paste(im.crop((0,60,1024,520)).resize((580,261)),(col*600+10,66))
                sheet.paste(im.resize((560,560)),(col*600+20,355));sheet.paste(im.resize((144,144)),(col*600+28,957))
                d.text((col*600+190,1002),'144px profile preview',font=font,fill='#57524e')
            sheet.save(args.output/(hat+'-before-after.jpg'),quality=95)
    colors=page.evaluate('palettes.map(p=>p.id)');eyewear=page.evaluate("categories.find(c=>c.id==='eyewear').options.map(o=>o[0])")
    previews={}
    for hat in hats:
        sheet=Image.new('RGB',(len(eyewear)*190,len(colors)*214),'#f5f3ed');d=ImageDraw.Draw(sheet)
        for row,fur in enumerate(colors):
            for col,eye in enumerate(eyewear):
                im=decode(page.evaluate('([h,f,e])=>reviewRender(h,f,e)',[hat,fur,eye]));sheet.paste(im.resize((190,190)),(col*190,row*214));d.text((col*190+5,row*214+195),fur+' / '+eye,fill='#26211e')
                if eye=='none':previews[(hat,fur)]=im
        sheet.save(args.output/(hat+'-palette-eyewear.jpg'),quality=95)
        check(hat+': all 48 palette/eyewear combinations render',not errors,errors)
    ear_checks=page.evaluate('''()=>{const c=reviewCanvas(),results=[];for(const colors of palettes)for(const hat of ['trucker','cowboy']){const s={...defaults(),colors,headwear:hat};renderer.draw(c.getContext('2d'),s,'fur');const d=c.getContext('2d').getImageData(0,0,1024,1024).data;let exposed=0;for(const [x0,x1]of [[170,300],[710,855]])for(let y=205;y<310;y++)for(let x=x0;x<x1;x++)if(d[(y*1024+x)*4+3])exposed++;results.push({hat,fur:colors.id,exposed})}return results}''')
    check('Ears tuck inside trucker and cowboy across all six palettes',all(x['exposed']==0 for x in ear_checks),ear_checks)
    face=page.evaluate('''()=>{const results=[];for(const colors of palettes){const a=renderer.head(colors).getContext('2d').getImageData(0,450,1024,574).data;for(const hat of ['trucker','cowboy']){const b=renderer.head(colors,hat).getContext('2d').getImageData(0,450,1024,574).data;results.push({hat,fur:colors.id,same:a.every((v,i)=>v===b[i])})}}return results}''')
    check('Facial artwork is unchanged by ear occlusion',all(x['same'] for x in face),face)
    # Source fur has a few 249/255 alpha pixels. Compare to that original alpha
    # so a real gap from fitting is detected without changing approved fur art.
    contact=page.evaluate('''()=>{const c=reviewCanvas(),cx=c.getContext('2d'),results=[];for(const colors of palettes){const s={...defaults(),headwear:'trucker',colors,transparent:true};const native=renderer.head(colors).getContext('2d').getImageData(0,0,1024,1024).data;renderer.draw(cx,s);const full=cx.getImageData(0,0,1024,1024).data;renderer.draw(cx,s,'headwear');const hat=cx.getImageData(0,0,1024,1024).data;let gaps=0;for(let x=220;x<=804;x++){let bottom=0;for(let y=250;y<465;y++)if(hat[(y*1024+x)*4+3]>250)bottom=y;for(let y=bottom+1;y<bottom+9;y++)if(full[(y*1024+x)*4+3]+1<native[(y*1024+x)*4+3])gaps++}results.push({fur:colors.id,gaps})}return results}''')
    check('Trucker adds no transparent gaps under the brim relative to the original forehead',all(x['gaps']==0 for x in contact),contact)
    trucker_clearance=page.evaluate('''()=>{const a=reviewCanvas(),b=reviewCanvas(),raw=reviewCanvas(),results=[];renderer.drawTrucker(raw.getContext('2d'),renderer.images.trucker);const hat=raw.getContext('2d').getImageData(0,0,1024,1024).data,points=[[194,426],[199,434],[830,426],[825,434]];for(const colors of palettes){const s={...defaults(),colors,fur:colors.id};renderer.draw(a.getContext('2d'),s);renderer.draw(b.getContext('2d'),{...s,headwear:'trucker'});const eyeA=a.getContext('2d').getImageData(220,480,660,95).data,eyeB=b.getContext('2d').getImageData(220,480,660,95).data;const head=renderer.head(colors,'trucker').getContext('2d').getImageData(0,0,1024,1024).data;results.push({fur:colors.id,eyesUnchanged:eyeA.every((v,i)=>v===eyeB[i]),temples:points.map(([x,y])=>({x,y,hatAlpha:hat[(y*1024+x)*4+3],furAlpha:head[(y*1024+x)*4+3]}))})}return results}''')
    check('Structured trucker preserves exposed original fur temples and clears both eyes in every palette',all(x['eyesUnchanged'] and all(p['hatAlpha']==0 and p['furAlpha']>240 for p in x['temples']) for x in trucker_clearance),trucker_clearance)
    trucker_shape=page.evaluate('''()=>{const c=reviewCanvas(),cx=c.getContext('2d');renderer.drawTrucker(cx,renderer.images.trucker);const d=cx.getImageData(0,0,1024,1024).data;let top=1024,bottom=0;for(let y=0;y<1024;y++)for(let x=0;x<1024;x++)if(d[(y*1024+x)*4+3]>128){top=Math.min(top,y);bottom=Math.max(bottom,y)}const lower=x=>{let y1=0;for(let y=0;y<1024;y++)if(d[(y*1024+x)*4+3]>128)y1=y;return y1};return{top,bottom,leftTip:lower(240),center:lower(512),rightTip:lower(784)}}''')
    check('Trucker has a tall crown and arched bill with lower rounded tips while staying above the eyes',trucker_shape['top']<110 and 445<=trucker_shape['bottom']<=466 and min(trucker_shape['leftTip'],trucker_shape['rightTip'])-trucker_shape['center']>35,trucker_shape)
    if args.baseline_renderer:
        trucker_head=page.evaluate('''()=>palettes.map(colors=>{const before=previousRenderer.head(colors,'trucker').getContext('2d').getImageData(0,0,1024,1024).data,after=renderer.head(colors,'trucker').getContext('2d').getImageData(0,0,1024,1024).data;return{fur:colors.id,identical:before.every((v,i)=>v===after[i])}})''')
        check('Trucker reshape leaves every original fur/head pixel unchanged',all(x['identical'] for x in trucker_head),trucker_head)
    bandana=page.evaluate('''()=>{const a=reviewCanvas(),b=reviewCanvas(),results=[];for(const colors of palettes){const s={...defaults(),colors};renderer.draw(a.getContext('2d'),s);renderer.draw(b.getContext('2d'),{...s,headwear:'ninja-bandana'});const equal=(x,y,w,h)=>{const da=a.getContext('2d').getImageData(x,y,w,h).data,db=b.getContext('2d').getImageData(x,y,w,h).data;return da.every((v,i)=>v===db[i])};results.push({fur:colors.id,headAndEars:equal(0,0,1024,325),eyes:equal(220,480,660,95)})}return results}''')
    check('Ninja bandana exposes the original head and ears and leaves both eyes clear',all(x['headAndEars'] and x['eyes'] for x in bandana),bandana)
    legacy=page.evaluate('''()=>{const c=reviewCanvas(),cx=c.getContext('2d');let same=true;for(const colors of palettes){const s={...defaults(),colors,headwear:'durag'};renderer.draw(cx,s);const old=c.toDataURL();renderer.draw(cx,{...s,headwear:'ninja-bandana'});same=same&&old===c.toDataURL()}const meta=metadata({...defaults(),headwear:'durag'});state={...defaults(),headwear:'durag'};render();selectCategory('headwear');const selected=document.querySelector('.trait-option[aria-pressed=true]')?.getAttribute('aria-label');state=defaults();render();renderPanel();return{same,metadata:meta.maker.settings.headwear==='ninja-bandana',selected,catalog:!categories.find(c=>c.id==='headwear').options.some(([id])=>id==='durag'),source:!('durag'in BoboEngine.assetSources)}}''')
    check('Legacy durag selection maps to the bandana in renderer, controls and metadata; old option/source is retired',legacy['same'] and legacy['metadata'] and legacy['selected']=='Red ninja bandana' and legacy['catalog'] and legacy['source'],legacy)
    cap_legacy=page.evaluate('''()=>{const c=reviewCanvas(),cx=c.getContext('2d');let same=true;for(const colors of palettes){const s={...defaults(),colors,headwear:'cap'};renderer.draw(cx,s);const old=c.toDataURL();renderer.draw(cx,{...s,headwear:'trucker'});same=same&&old===c.toDataURL()}const meta=metadata({...defaults(),headwear:'cap'});state={...defaults(),headwear:'cap'};render();selectCategory('headwear');const selected=document.querySelector('.trait-option[aria-pressed=true]')?.getAttribute('aria-label');state=defaults();render();renderPanel();return{same,metadata:meta.maker.settings.headwear==='trucker',selected,catalog:!categories.find(c=>c.id==='headwear').options.some(([id])=>id==='cap'),source:!('cap'in BoboEngine.assetSources)}}''')
    check('Legacy cap maps to trucker in renderer, controls and metadata; old option/source is retired',cap_legacy['same'] and cap_legacy['metadata'] and cap_legacy['selected']=='Pump.fun trucker' and cap_legacy['catalog'] and cap_legacy['source'],cap_legacy)
    page.get_by_role('tab',name='Headwear',exact=True).click()
    for hat,name in zip(hats,names):
        page.get_by_role('button',name=name,exact=True).click()
        for transparent in [False,True]:
            page.locator('#transparent').set_checked(transparent);preview=decode(page.locator('#preview').evaluate('(c)=>c.toDataURL()'))
            with page.expect_download() as download:page.locator('#download').click()
            path=args.output/(hat+('-transparent.png' if transparent else '-solid.png'));download.value.save_as(path);exported=Image.open(path).convert('RGBA')
            check(hat+(': transparent' if transparent else ': opaque')+' PNG is 1024px and pixel-identical to preview',exported.size==(1024,1024) and diff(exported,preview)==0 and (exported.getpixel((0,0))[3]==0 if transparent else exported.getchannel('A').getextrema()==(255,255)))
        page.locator('.export-menu summary').click()
        with page.expect_download(timeout=90000) as download:page.locator('#export-layers').click()
        path=args.output/(hat+'-current-layers.zip');download.value.save_as(path)
        with zipfile.ZipFile(path) as z:
            check(hat+': current-layer ZIP passes CRC and composition matches PNG',z.testzip() is None and diff(Image.open(io.BytesIO(z.read('bobo.png'))).convert('RGBA'),preview)==0)
            urls=['data:image/png;base64,'+base64.b64encode(z.read(n)).decode() for n in sorted(z.namelist()) if n.startswith('layers/')]
            joined=decode(page.evaluate('''async urls=>{const c=reviewCanvas(),cx=c.getContext('2d');for(const url of urls){const im=new Image();im.src=url;await im.decode();cx.drawImage(im,0,0)}return c.toDataURL()}''',urls))
            check(hat+': downloaded layers reconstruct the preview exactly',diff(joined,preview)==0)
        page.locator('#transparent').uncheck()
    if not args.skip_kit:
        page.locator('.export-menu summary').click()
        with page.expect_download(timeout=240000) as download:page.locator('#export-kit').click()
        path=args.output/'headwear-full-kit.zip';download.value.save_as(path)
        with zipfile.ZipFile(path) as z:
            manifest=json.loads(z.read('manifest.json'));paths=[]
            for cat in manifest['categories']:
                for trait in cat['traits']:
                    if trait['file']:paths.extend([trait['file'].replace('{fur}',fur) for fur in colors] if cat['variantBy']=='fur' else [trait['file']])
            paths.extend(manifest['headVariants']['tucked'].replace('{fur}',fur) for fur in colors)
            check('Full kit CRC and all 187 named PNG layers are valid',z.testzip() is None and len(paths)==187 and all(n in z.namelist() and Image.open(io.BytesIO(z.read(n))).size==(1024,1024) for n in paths),{'layers':len(paths),'zip_files':len(z.namelist())})
            check('Manifest selects tucked ears only for trucker and cowboy',manifest['headwearHeadVariant']=={'trucker':'tucked','cowboy':'tucked'})
            headwear=next(c for c in manifest['categories'] if c['id']=='headwear')['traits']
            check('Full kit replaces durag with ninja-bandana and keeps the neck bandana separate',any(t['id']=='ninja-bandana' for t in headwear) and not any(t['id']=='durag' for t in headwear) and 'layers/headwear/ninja-bandana.png' in z.namelist() and 'layers/neck/bandana.png' in z.namelist() and not any('durag' in n for n in z.namelist()))
            check('Full kit replaces the cap with trucker',any(t['id']=='trucker' for t in headwear) and not any(t['id']=='cap' for t in headwear) and 'layers/headwear/trucker.png' in z.namelist() and 'layers/headwear/cap.png' not in z.namelist())
            parity=[]
            for hat in hats:
                for fur in colors:
                    head=manifest['headVariants'][manifest['headwearHeadVariant'].get(hat,'standard')].replace('{fur}',fur)
                    layers=['layers/background/sage.png',f'layers/outfit/{fur}/tee-red.png',head,f'layers/headwear/{hat}.png']
                    urls=['data:image/png;base64,'+base64.b64encode(z.read(n)).decode() for n in layers]
                    im=decode(page.evaluate('''async urls=>{const c=reviewCanvas(),cx=c.getContext('2d');for(const url of urls){const im=new Image();im.src=url;await im.decode();cx.drawImage(im,0,0)}return c.toDataURL()}''',urls))
                    parity.append({'hat':hat,'fur':fur,'difference':diff(im,previews[(hat,fur)])})
            check('All 24 hat/palette compositions rebuild exactly from the downloaded full kit',all(x['difference']==0 for x in parity),parity)
    for width in [320,390,768,1024,1440]:
        page.set_viewport_size({'width':width,'height':1000})
        check(str(width)+'px layout has no horizontal overflow and keeps a square preview',page.evaluate("document.documentElement.scrollWidth===innerWidth && Math.abs(document.querySelector('#preview').clientWidth-document.querySelector('#preview').clientHeight)<2"))
        if width in [390,1440]:page.screenshot(path=str(args.output/f'headwear-layout-{width}.png'),full_page=True)
    check('No browser exceptions or failed requests',not errors and not failed,{'errors':errors,'failed':failed})
    browser.close()
server.shutdown()
print('Completed',len(checks),'headwear checks.',flush=True)
