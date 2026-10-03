"""Focused current-style props and garment regression; local headless Chromium."""
import argparse,base64,functools,io,json,threading,zipfile
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from PIL import Image,ImageChops,ImageDraw,ImageFont
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--output',type=Path,default=Path('new-traits-review'))
parser.add_argument('--baseline-renderer',type=Path)
args=parser.parse_args();args.output.mkdir(parents=True,exist_ok=True)
repo=Path(__file__).resolve().parents[3];checks=[]
def check(name,passed,details=None):
    checks.append({'check':name,'passed':bool(passed),'details':details})
    (args.output/'verification.json').write_text(json.dumps(checks,indent=2))
    print(('PASS ' if passed else 'FAIL ')+name,flush=True)
    assert passed,(name,details)
def png(data):return Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGBA')
class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(repo)))
threading.Thread(target=server.serve_forever,daemon=True).start()
props=['beras-can','champagne','eviction']
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(viewport={'width':1440,'height':1000});errors=[];failures=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('response',lambda r:failures.append(r.url) if r.status>=400 and '/bobomaker/' in r.url else None)
    page.goto(f'http://127.0.0.1:{server.server_port}/bobomaker.html',wait_until='domcontentloaded')
    page.wait_for_function('ready',timeout=60000)
    check('New artwork loads and all three prop controls are registered',page.evaluate('(ids)=>ids.every(id=>categories.find(c=>c.id==="prop").options.some(o=>o[0]===id))',props) and not failures,failures)
    if args.baseline_renderer:
        page.evaluate('window.currentEngine=BoboEngine')
        page.add_script_tag(content=args.baseline_renderer.read_text(encoding='utf-8-sig'))
        page.evaluate('window.baseline=new BoboEngine.Renderer(renderer.images);window.BoboEngine=window.currentEngine')
        unchanged=page.evaluate('''()=>{
          const a=document.createElement('canvas'),b=document.createElement('canvas');a.width=a.height=b.width=b.height=1024;
          const cases=[];for(const color of palettes)for(const [category,ids]of [['headwear',['crown']],['prop',['championship','coffee','phone','rose','cash','honey','flipoff','microphone']]])for(const id of ids){
            const s={...defaults(),colors:{...color},fur:color.id,[category]:id};
            renderer.draw(a.getContext('2d'),s,category);baseline.draw(b.getContext('2d'),s,category);
            const x=a.getContext('2d').getImageData(0,0,1024,1024).data,y=b.getContext('2d').getImageData(0,0,1024,1024).data;
            let diff=0;for(let i=0;i<x.length;i++)if(x[i]!==y[i])diff++;cases.push({fur:color.id,id,diff});
          }return cases;
        }''')
        check('Approved crown and eight existing props remain pixel-identical in all six palettes',all(x['diff']==0 for x in unchanged),{'combinations':len(unchanged)})
    garments=page.evaluate('''()=>{
      const a=document.createElement('canvas'),b=document.createElement('canvas');a.width=a.height=b.width=b.height=1024;
      const results=[];for(const color of palettes)for(const outfit of ['red-puffer','jersey']){
        const s={...defaults(),colors:{...color},fur:color.id,outfit,transparent:true};renderer.draw(a.getContext('2d'),s);
        renderer.draw(b.getContext('2d'),{...s,outfit:'tee-red'});
        const x=a.getContext('2d').getImageData(0,0,1024,735).data,y=b.getContext('2d').getImageData(0,0,1024,735).data;
        let headDiff=0;for(let i=0;i<x.length;i++)if(x[i]!==y[i])headDiff++;
        const sleeves=[100,924].map(px=>Array.from(a.getContext('2d').getImageData(px,985,1,1).data));
        const red=outfit!=='red-puffer'||sleeves.every(([r,g,b,a])=>a>=250&&r>g*2&&r>b*2);
        results.push({fur:color.id,outfit,headDiff,red,sleeves});
      }return results;
    }''')
    check('Both corrected garments preserve the approved head in all six palettes',all(x['headDiff']==0 for x in garments),garments)
    check('Puffer sleeves cover both forearms and stay red in every palette',all(x['red'] for x in garments))
    # A single trim intersects each armhole at shoulder height; a second gold
    # ribbon would create a second run on the same scan line.
    trim=page.evaluate('''()=>{
      const c=document.createElement('canvas');c.width=c.height=1024;renderer.draw(c.getContext('2d'),{...defaults(),outfit:'jersey'});
      const d=c.getContext('2d').getImageData(0,850,1024,1).data;
      return [[180,340],[690,850]].map(([start,end])=>{let runs=0,last=false;for(let x=start;x<end;x++){const i=x*4,gold=d[i]>180&&d[i+1]>100&&d[i+2]<110;if(gold&&!last)runs++;last=gold}return runs});
    }''')
    check('Jersey has one gold trim at each armhole',trim==[1,1],trim)
    material=page.evaluate('''()=>{
      const c=document.createElement('canvas');c.width=c.height=1024;const ctx=c.getContext('2d'),results=[];
      for(const outfit of ['red-puffer','jersey']){
        renderer.draw(ctx,{...defaults(),outfit},'outfit');const original=ctx.getImageData(0,0,1024,1024).data;
        for(const color of palettes){renderer.draw(ctx,{...defaults(),outfit,colors:{...color}},'outfit');const d=ctx.getImageData(0,0,1024,1024).data;let changed=0;
          for(let y=835;y<1024;y++)for(let x=0;x<1024;x++){
            const i=(y*1024+x)*4,gold=original[i]>100&&original[i+1]>original[i]*.62&&original[i+2]<original[i+1]*.65;
            if(original[i+3]<250||outfit==='jersey'&&!gold)continue;
            if([0,1,2].some(k=>original[i+k]!==d[i+k]))changed++;
          }results.push({outfit,fur:color.id,changed});
        }
      }return results;
    }''')
    check('Red puffer fabric and gold jersey trim keep their colors in every palette',all(x['changed']==0 for x in material),material)
    # All new props, short/long sleeves, bare arms and every fur palette must
    # reconstruct exactly from the reusable layers used by the export kit.
    parity=page.evaluate('''async ids=>{
      const a=document.createElement('canvas'),b=document.createElement('canvas'),layer=document.createElement('canvas');for(const c of [a,b,layer])c.width=c.height=1024;
      const results=[];for(const prop of ids)for(const color of palettes)for(const outfit of ['tee-red','hoodie','red-puffer','jersey','none']){
        const s={...defaults(),prop,outfit,fur:color.id,colors:{...color},headwear:'cap',neck:'gold-chain'};
        renderer.draw(a.getContext('2d'),s);b.getContext('2d').clearRect(0,0,1024,1024);
        for(const cat of ['background','outfit','fur','neck','headwear','eyewear','prop','meme']){renderer.draw(layer.getContext('2d'),s,cat);b.getContext('2d').drawImage(layer,0,0)}
        const x=a.getContext('2d').getImageData(0,0,1024,1024).data,y=b.getContext('2d').getImageData(0,0,1024,1024).data;
        let diff=0;for(let i=0;i<x.length;i++)if(x[i]!==y[i])diff++;results.push({prop,fur:color.id,outfit,diff});
        await new Promise(r=>setTimeout(r,0));
      }return results;
    }''',props)
    check('90 new prop / outfit / palette combinations recompose exactly',len(parity)==90 and all(x['diff']==0 for x in parity),{'combinations':len(parity)})
    # Object pixels above the grip must keep their original material colors.
    invariant=page.evaluate('''ids=>{
      const a=document.createElement('canvas');a.width=a.height=1024;
      return ids.map(prop=>{let first,changed=0;for(const color of palettes){renderer.draw(a.getContext('2d'),{...defaults(),prop,colors:{...color}},'prop');
        const d=a.getContext('2d').getImageData(0,0,1024,887).data;if(!first)first=d;else for(let i=0;i<d.length;i++)if(first[i]!==d[i])changed++;
      }return {prop,changed}});
    }''',props)
    check('New object colors remain unchanged across fur palettes',all(x['changed']==0 for x in invariant),invariant)
    # Real downloads for each new prop, including alpha and custom paw color.
    for i,prop in enumerate(props):
        page.evaluate('([prop,i])=>{state={...defaults(),prop,outfit:i%2?"jersey":"red-puffer",transparent:true,colors:{...palettes[0],fur:"#385f8c"},fur:"custom"};render();selectCategory("prop")}',[prop,i])
        preview=png(page.locator('#preview').evaluate('(c)=>c.toDataURL()'))
        with page.expect_download() as dl:page.locator('#download').click()
        path=args.output/(prop+'-download.png');dl.value.save_as(path)
        exported=Image.open(path).convert('RGBA')
        check(prop+' PNG matches preview with transparency and custom fur',ImageChops.difference(preview,exported).getbbox() is None and exported.getchannel('A').getextrema()==(0,255))
    sheet=Image.new('RGB',(len(props)*320,3*365),'#f5f3ed');draw=ImageDraw.Draw(sheet)
    try:font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18)
    except OSError:font=ImageFont.load_default()
    for row,(fur,outfit) in enumerate([('classic','tee-red'),('panda','red-puffer'),('polar','jersey')]):
        for col,prop in enumerate(props):
            page.evaluate('([fur,outfit,prop])=>{state={...defaults(),fur,colors:{...palettes.find(p=>p.id===fur)},outfit,prop};render()}',[fur,outfit,prop])
            art=png(page.locator('#preview').evaluate('(c)=>c.toDataURL()'))
            sheet.paste(art.resize((312,312)),(col*320+4,row*365+35));draw.text((col*320+8,row*365+8),fur+' / '+prop,font=font,fill='#26211e')
    sheet.save(args.output/'new-props-palettes.jpg',quality=95)
    for width in [320,390,768,1024,1440]:
        page.set_viewport_size({'width':width,'height':1000});page.evaluate('selectCategory("prop")')
        check(f'New props remain usable without horizontal overflow at {width}px',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1') and page.get_by_role('button',name='Eviction notice',exact=True).is_visible())
    check('No browser errors or failed artwork requests',not errors and not failures,{'errors':errors,'failures':failures})
    browser.close()
server.shutdown();print(f'Completed {len(checks)} focused checks. Evidence: {args.output.resolve()}',flush=True)
