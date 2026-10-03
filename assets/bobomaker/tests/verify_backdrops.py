"""Verify original-backed scenes, picker behavior, PNGs and exported layers."""
import argparse,base64,functools,hashlib,io,json,threading,zipfile
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from PIL import Image,ImageChops,ImageDraw,ImageFont
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--output',type=Path,default=Path('backdrop-review'))
parser.add_argument('--source-folder',type=Path)
parser.add_argument('--baseline-renderer',type=Path)
args=parser.parse_args();args.output.mkdir(parents=True,exist_ok=True)
repo=Path(__file__).resolve().parents[3]
manifest=json.loads((repo/'assets/bobomaker/backgrounds/manifest.json').read_text())
assets=manifest['assets'];checks=[]
expected=['100','Based','Bitcoin Orange','Blue Screen of Death','Forest Fire','Forest','Genesis','Grim','Guppy Stonk','Heat Map','NPC','Rainbow Chart','Rug Pull','Yotsuba B','Yotsuba']
def check(name,passed,details=None):
    checks.append({'check':name,'passed':bool(passed),'details':details})
    (args.output/'verification.json').write_text(json.dumps(checks,indent=2))
    print(('PASS ' if passed else 'FAIL ')+name,flush=True)
    assert passed,(name,details)
def png(data):return Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA')
def equal(a,b):return a.size==b.size and a.tobytes()==b.tobytes()
check('Exactly the 15 requested filenames are imported', [a['source_filename'] for a in assets]==[n+'.png' for n in expected])
for a in assets:
    path=repo/'assets/bobomaker/backgrounds'/a['file'];im=Image.open(path).convert('RGBA')
    assert im.size==(1000,1000)
    assert hashlib.sha256(path.read_bytes()).hexdigest()==a['file_sha256']
    assert hashlib.sha256(im.tobytes()).hexdigest()==a['rgba_sha256']
check('All 15 optimized files preserve original RGBA pixels and dimensions',True)
if args.source_folder:
    for a in assets:
        src=args.source_folder/a['source_filename']
        assert hashlib.sha256(src.read_bytes()).hexdigest()==a['source_sha256']
        assert hashlib.sha256(Image.open(src).convert('RGBA').tobytes()).hexdigest()==a['rgba_sha256']
    check('All 15 user originals remain unchanged and match web copies pixel-for-pixel',True)
class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(repo)))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(viewport={'width':1440,'height':1000});errors=[];failures=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('response',lambda r:failures.append(r.url) if r.status>=400 and '/bobomaker/' in r.url else None)
    page.goto(f'http://127.0.0.1:{server.server_port}/bobomaker.html',wait_until='domcontentloaded')
    page.wait_for_function('ready',timeout=60000)
    check('All artwork loads; picker exposes 24 backdrops and 70 total traits',page.evaluate('categories[0].options.length===24 && document.querySelector("#asset-count").textContent==="70 TRAITS"') and not failures,failures)
    check('Removed props are absent from picker, randomizer catalog and asset loading',page.evaluate('''()=>{
      const removed=['daily-bobo','feel-the-boom'];
      return removed.every(id=>!categories.find(c=>c.id==='prop').options.some(o=>o[0]===id)&&!(id in BoboEngine.assetSources)&&!(id in BoboEngine.placement));
    }'''))
    if args.baseline_renderer:
        page.evaluate('window.currentEngine=BoboEngine')
        page.add_script_tag(content=args.baseline_renderer.read_text(encoding='utf-8-sig'))
        page.evaluate('window.baseline=new BoboEngine.Renderer(renderer.images);window.BoboEngine=window.currentEngine')
        unchanged=page.evaluate('''()=>{
          const a=document.createElement('canvas'),b=document.createElement('canvas');a.width=a.height=b.width=b.height=1024;
          const cases=categories[0].options.slice(0,9).map(([background])=>({...defaults(),background}));
          for(const colors of palettes)for(const [category,id]of [['headwear','crown'],['prop','championship'],['outfit','red-puffer'],['outfit','jersey']])cases.push({...defaults(),colors:{...colors},fur:colors.id,[category]:id});
          return cases.map(s=>{renderer.draw(a.getContext('2d'),s);baseline.draw(b.getContext('2d'),s);const x=a.getContext('2d').getImageData(0,0,1024,1024).data,y=b.getContext('2d').getImageData(0,0,1024,1024).data;let diff=0;for(let i=0;i<x.length;i++)if(x[i]!==y[i])diff++;return diff});
        }''')
        check('Nine existing backdrops and approved crown/belt/garments remain pixel-identical',len(unchanged)==33 and max(unchanged)==0,{'comparisons':len(unchanged)})
    references={};sheet=Image.new('RGB',(5*320,3*370),'#f5f3ed');d=ImageDraw.Draw(sheet)
    try:font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',19)
    except OSError:font=ImageFont.load_default()
    page.get_by_role('tab',name='Backdrop',exact=True).click()
    for i,a in enumerate(assets):
        page.evaluate('()=>{state.transparent=true;render();renderPanel()}')
        # Backdrop thumbnails remain informative when export transparency is on.
        thumb=page.get_by_role('button',name=a['name'],exact=True).locator('canvas')
        check(a['name']+' picker stays visible with transparency enabled',thumb.evaluate('(c)=>c.getContext("2d").getImageData(24,4,1,1).data[3]===255'))
        page.get_by_role('button',name=a['name'],exact=True).click()
        check(a['name']+' selection activates the backdrop and retains focus',page.evaluate('(id)=>state.background===id && !state.transparent && document.activeElement.getAttribute("aria-pressed")==="true"',a['id']))
        data=page.evaluate('''id=>{
          const c=document.createElement('canvas'),ref=document.createElement('canvas');c.width=c.height=ref.width=ref.height=1024;
          renderer.draw(c.getContext('2d'),{...defaults(),background:id},'background');
          const x=ref.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,1024,1024);x.drawImage(renderer.images[id],0,0,1024,1024);
          return [c.toDataURL(),ref.toDataURL()];
        }''',a['id'])
        layer,reference=map(png,data);references[a['id']]=reference
        check(a['name']+' retains the complete square source without distortion',equal(layer,reference) and layer.getchannel('A').getextrema()==(255,255))
        preview=png(page.locator('#preview').evaluate('(c)=>c.toDataURL()'))
        with page.expect_download() as dl:page.locator('#download').click()
        filename=args.output/(a['id']+'.png');dl.value.save_as(filename)
        check(a['name']+' PNG download exactly matches preview',equal(preview,Image.open(filename).convert('RGBA')))
        x=i%5*320;y=i//5*370;sheet.paste(preview.resize((308,308)),(x+6,y+4));d.text((x+8,y+320),a['name'],font=font,fill='#26211e')
    sheet.save(args.output/'backdrops-contact-sheet.jpg',quality=95)
    page.evaluate("state={...defaults(),background:'bg-forest',transparent:true};render();renderPanel()")
    page.get_by_role('button',name='Forest Fire',exact=True).click();page.locator('#undo').click()
    check('Undo restores both the previous backdrop and transparency',page.evaluate('state.background==="bg-forest" && state.transparent'))
    page.locator('#redo').click()
    check('Redo restores the selected opaque scene',page.evaluate('state.background==="bg-forest-fire" && !state.transparent'))
    check('Metadata identifies image background mode',page.evaluate('metadata().attributes.find(a=>a.trait_type==="Background mode").value==="Image"'))
    page.locator('#transparent').check()
    transparent=png(page.locator('#preview').evaluate('(c)=>c.toDataURL()'))
    page.evaluate("state.background='bg-npc';render()")
    check('Transparency removes the entire backdrop without changing bear pixels',equal(transparent,png(page.locator('#preview').evaluate('(c)=>c.toDataURL()'))) and transparent.getpixel((0,0))[3]==0)
    with page.expect_download() as dl:page.locator('#download').click()
    dl.value.save_as(args.output/'transparent.png')
    check('Transparent PNG download retains alpha and matches preview',equal(transparent,Image.open(args.output/'transparent.png').convert('RGBA')))
    page.evaluate("state={...defaults(),background:'bg-forest-fire',headwear:'cap',outfit:'jersey',prop:'beras-can'};render();selectCategory('background')")
    preview=png(page.locator('#preview').evaluate('(c)=>c.toDataURL()'))
    page.locator('.export-menu summary').click()
    with page.expect_download(timeout=120000) as dl:page.locator('#export-layers').click()
    path=args.output/'bobo-current-layers.zip';dl.value.save_as(path)
    with zipfile.ZipFile(path) as z:
        check('Current-layer ZIP has valid CRCs and the correct backdrop PNG',z.testzip() is None and equal(Image.open(io.BytesIO(z.read('layers/00-background.png'))).convert('RGBA'),references['bg-forest-fire']))
        check('Current-layer ZIP preview matches downloaded composition',equal(preview,Image.open(io.BytesIO(z.read('bobo.png'))).convert('RGBA')))
        meta=json.loads(z.read('bobo.json'));check('Current ZIP metadata retains the selected scene',meta['maker']['settings']['background']=='bg-forest-fire')
    page.locator('.export-menu summary').click()
    with page.expect_download(timeout=300000) as dl:page.locator('#export-kit').click()
    path=args.output/'bobo-layer-kit.zip';dl.value.save_as(path)
    with zipfile.ZipFile(path) as z:
        m=json.loads(z.read('manifest.json'));backgrounds=next(c for c in m['categories'] if c['id']=='background')['traits']
        check('Full kit contains 24 background options and 181 layer PNGs with valid CRCs',len(backgrounds)==24 and len([n for n in z.namelist() if n.startswith('layers/') and n.endswith('.png')])==181 and z.testzip() is None)
        for a in assets:
            exported=Image.open(io.BytesIO(z.read('layers/background/'+a['id']+'.png'))).convert('RGBA')
            assert equal(exported,references[a['id']]),a['id']
        check('All 15 exported backdrop layers exactly match their canvas render',True)
        check('Removed props are absent from kit files and manifest',all(not any(id in n for id in ['daily-bobo','feel-the-boom']) for n in z.namelist()) and all(t['id'] not in ['daily-bobo','feel-the-boom'] for c in m['categories'] for t in c['traits']))
    check('Export controls recover after the full kit',page.locator('#download').is_enabled() and page.locator('#export-status').is_hidden())
    for width in [320,390,768,1024,1440]:
        page.set_viewport_size({'width':width,'height':1000});page.evaluate('selectCategory("background")')
        layout=page.evaluate('''()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,clipped:[...document.querySelectorAll('.option-name')].filter(e=>e.scrollWidth>e.clientWidth+1||e.scrollHeight>e.clientHeight+1).map(e=>e.textContent),ratio:document.querySelector('#preview').getBoundingClientRect().width/document.querySelector('#preview').getBoundingClientRect().height})''')
        check(f'All backdrop names fit and preview remains square at {width}px',not layout['overflow'] and not layout['clipped'] and abs(layout['ratio']-1)<.001,layout)
        if width in [390,1440]:page.screenshot(path=str(args.output/f'backdrops-{width}.png'),full_page=True)
    check('No browser errors or failed artwork requests',not errors and not failures,{'errors':errors,'failures':failures})
    browser.close()
server.shutdown();print(f'Completed {len(checks)} backdrop checks. Evidence: {args.output.resolve()}',flush=True)
