"""Focused crown fit/export checks; uses the same dependencies as verify.py.

python assets/bobomaker/tests/verify_crown.py --output crown-review
Optional: --baseline-renderer PATH to compare unrelated traits with an earlier renderer.
"""
import argparse,base64,functools,io,json,threading,zipfile
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from PIL import Image,ImageDraw,ImageChops
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--output',type=Path,default=Path('crown-review'))
parser.add_argument('--baseline-renderer',type=Path)
args=parser.parse_args();args.output.mkdir(parents=True,exist_ok=True)
repo=Path(__file__).resolve().parents[3];checks=[]
def check(name,passed,details=None):
    checks.append({'check':name,'passed':bool(passed),'details':details})
    (args.output/'crown-verification.json').write_text(json.dumps(checks,indent=2))
    print(('PASS ' if passed else 'FAIL ')+name,flush=True)
    assert passed,details
def decode(data):return Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA')
def diff(a,b):return max(v[1] for v in ImageChops.difference(a,b).getextrema())
class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(repo)))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True);page=browser.new_page(viewport={'width':1440,'height':1000})
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(f'http://127.0.0.1:{server.server_port}/bobomaker.html',wait_until='domcontentloaded')
    page.wait_for_function('ready',timeout=60000)
    geometry=page.evaluate('''()=>{
      const actual=document.createElement('canvas'),original=document.createElement('canvas');
      actual.width=actual.height=original.width=original.height=1024;
      renderer.asset(actual.getContext('2d'),'crown',defaults());
      original.getContext('2d').drawImage(renderer.images.crown,...BoboEngine.placement.crown);
      const a=actual.getContext('2d').getImageData(0,0,1024,1024).data,o=original.getContext('2d').getImageData(0,0,1024,1024).data;
      const [px,py,pw,ph]=BoboEngine.placement.crown;
      const front=[[330,65,50,60],[780,0,85,120],[1270,60,55,85],[0,375,1650,225]];
      const rear=[[15,80,85,130],[1550,80,85,130],[100,235,50,45],[1500,235,50,45]];
      let lostFront=0,visibleRear=0;
      for(let i=3;i<a.length;i+=4){
        const n=(i-3)/4,x=(n%1024-px)*1650/pw,y=(Math.floor(n/1024)-py)*600/ph;
        const within=([rx,ry,w,h])=>x>=rx&&x<rx+w&&y>=ry&&y<ry+h;
        if(front.some(within)&&o[i]>128&&a[i]<o[i]-2)lostFront++;
        if(rear.some(within)&&a[i]>8)visibleRear++;
      }return {lostFront,visibleRear};
    }''')
    check('Three front point tips and lower jeweled band preserved',geometry['lostFront']==0,geometry)
    check('Both rear prongs and inward returns are hidden',geometry['visibleRear']==0,geometry)

    if args.baseline_renderer:
        unchanged=page.evaluate('''source=>{
          const old=(new Function('window',source+';return window.BoboEngine;'))({});
          const previous=new old.Renderer(renderer.images),a=document.createElement('canvas'),b=document.createElement('canvas');
          a.width=a.height=b.width=b.height=1024;
          const cases=[{fur:'classic'},{fur:'panda'},
            ...categories.find(c=>c.id==='headwear').options.filter(o=>!['crown','none'].includes(o[0])).map(o=>({headwear:o[0]})),
            ...categories.find(c=>c.id==='prop').options.filter(o=>o[0]!=='none').map(o=>({prop:o[0]}))];
          return cases.map(traits=>{
            const s={...defaults(),...traits};s.colors={...palettes.find(p=>p.id===s.fur)};
            previous.draw(a.getContext('2d'),s);renderer.draw(b.getContext('2d'),s);
            return {traits,identical:a.toDataURL()===b.toDataURL()};
          });
        }''',args.baseline_renderer.read_text(encoding='utf-8-sig'))
        check('Original/Panda, other hats and all props remain pixel-identical',all(x['identical'] for x in unchanged),unchanged)

    # Inspect every fur/eyewear pairing at a small profile-picture scale.
    colors=page.evaluate('palettes.map(p=>p.id)')
    eyewear=page.evaluate("categories.find(c=>c.id==='eyewear').options.map(o=>o[0])")
    sheet=Image.new('RGB',(len(eyewear)*190,len(colors)*212),'#f5f3ed');labels=ImageDraw.Draw(sheet)
    for row,fur in enumerate(colors):
        for col,eye in enumerate(eyewear):
            data=page.evaluate('''({fur,eye})=>{
              const s={...defaults(),fur,headwear:'crown',eyewear:eye};s.colors={...palettes.find(p=>p.id===fur)};
              const c=document.createElement('canvas');c.width=c.height=1024;renderer.draw(c.getContext('2d'),s);return c.toDataURL();
            }''',{'fur':fur,'eye':eye})
            sheet.paste(decode(data).resize((190,190)),(col*190,row*212))
            labels.text((col*190+6,row*212+195),fur+' / '+eye,fill='#26211e')
    sheet.save(args.output/'crown-palette-eyewear.jpg',quality=95)
    check('All 48 crown/fur/eyewear combinations render',not errors,errors)

    page.get_by_role('tab',name='Headwear',exact=True).click()
    page.get_by_role('button',name='King Bobo',exact=True).click()
    for transparent in [False,True]:
        page.locator('#transparent').set_checked(transparent)
        preview=decode(page.locator('#preview').evaluate('(c)=>c.toDataURL()'))
        with page.expect_download() as download:page.locator('#download').click()
        path=args.output/('crown-transparent.png' if transparent else 'crown-solid.png');download.value.save_as(path)
        exported=Image.open(path).convert('RGBA')
        check(('Transparent' if transparent else 'Solid')+' 1024px PNG equals preview',exported.size==(1024,1024) and diff(exported,preview)==0)
    page.locator('.export-menu summary').click()
    with page.expect_download(timeout=60000) as download:page.locator('#export-layers').click()
    path=args.output/'crown-current-layers.zip';download.value.save_as(path)
    with zipfile.ZipFile(path) as archive:
        check('Crown layer ZIP passes CRC validation',archive.testzip() is None)
        crown=Image.open(io.BytesIO(archive.read('layers/04-headwear.png'))).convert('RGBA')
        preview_layer=decode(page.evaluate("()=>{const c=document.createElement('canvas');c.width=c.height=1024;renderer.draw(c.getContext('2d'),state,'headwear');return c.toDataURL()}"))
        check('Exported crown layer equals preview layer',diff(crown,preview_layer)==0)
        exported=Image.open(io.BytesIO(archive.read('bobo.png'))).convert('RGBA')
        check('ZIP composition equals transparent PNG',diff(exported,Image.open(args.output/'crown-transparent.png').convert('RGBA'))==0)
    page.locator('#transparent').uncheck()
    for width in [390,1440]:
        page.set_viewport_size({'width':width,'height':1000})
        check(str(width)+'px crown preview stays square and on screen',page.evaluate("document.documentElement.scrollWidth===innerWidth && Math.abs(document.querySelector('#preview').clientWidth-document.querySelector('#preview').clientHeight)<2"))
        page.screenshot(path=str(args.output/f'crown-layout-{width}.png'),full_page=True)
    check('No browser errors',not errors,errors)
    browser.close()
server.shutdown()
print('Completed',len(checks),'focused crown checks.',flush=True)
