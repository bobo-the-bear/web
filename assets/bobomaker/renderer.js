(function(root){'use strict';
const palettes=[
{id:'classic',name:'Original Bobo',fur:'#6f452d',muzzle:'#472c1b',ears:'#b47b5d'},
{id:'honey',name:'Honey',fur:'#bd883e',muzzle:'#634019',ears:'#e4b17b'},
{id:'midnight',name:'Midnight',fur:'#3b3430',muzzle:'#201c1a',ears:'#8a6250'},
{id:'polar',name:'Polar',fur:'#e4dbcc',muzzle:'#8c7867',ears:'#cda18d'},
{id:'panda',name:'Panda',fur:'#e4dfd3',muzzle:'#393632',ears:'#9e8682',pattern:'panda'},
{id:'red',name:'Red market',fur:'#b34649',muzzle:'#672b32',ears:'#dc8a85'}];
const categories=[
{id:'background',name:'Backdrop',help:'Set the scene.',options:[['sage','Council green','#ccd9b3'],['white','Studio white','#ffffff'],['pink','Rose','#e9c1c1'],['blue','Blue hour','#9eb6d3'],['yellow','Honey yellow','#ecc968'],['red','Bobo red','#b90b2a'],['ink','After hours','#242321'],['lavender','Lilac','#c4b6d4'],['check','Checkerboard','#dedcd7']]},
{id:'fur',name:'Fur',help:'The same bear, a different coat.',options:palettes.map(x=>[x.id,x.name])},
{id:'outfit',name:'Outfit',help:'Dress for the market you deserve.',options:[['tee-red','Bobo red tee'],['hoodie','Black hoodie'],['puffer','Blue puffer'],['suit','Council suit'],['tee-white','White tee'],['bomber','Black bomber'],['red-puffer','Red puffer'],['varsity','Council varsity'],['jersey','Courtside jersey'],['denim','Denim jacket'],['none','Bare bear']]},
{id:'headwear',name:'Headwear',help:'A little something on top.',options:[['none','None'],['crown','King Bobo'],['beanie','Black beanie'],['cap','Red cap'],['cowboy','Black cowboy'],['bucket','Green bucket'],['captain','Captain’s hat'],['durag','Black durag']]},
{id:'eyewear',name:'Eyewear',help:'A new outlook. Same expression.',options:[['none','None'],['shades','Black shades'],['glasses','Nerd frames'],['visor','Chrome visor'],['pit-viper','Pit Viper style'],['oakley','Oakley style'],['rayban','Ray-Ban style'],['meta','Meta streaming']]},
{id:'neck',name:'Neck',help:'The finishing touch.',options:[['none','None'],['gold-chain','Gold Cuban'],['silver-chain','Silver Cuban'],['bandana','Red bandana'],['pendant','Honey pendant'],['diamond-chain','Diamond Cuban']]},
{id:'prop',name:'Props',help:'A bear’s essentials.',options:[['none','None'],['honey','Honey jar'],['cash','Cash stack'],['coffee','Coffee to go'],['phone','Smartphone'],['microphone','Mic check'],['rose','Red rose'],['flipoff','Middle paw'],['championship','Bobo championship']]},
{id:'meme',name:'Meme',help:'Say it with your whole bear.',options:[]}];
const placement={
 'tee-red':[0,0,1024,1024],hoodie:[0,0,1024,1024],puffer:[0,0,1024,1024],suit:[0,0,1024,1024],'tee-white':[0,0,1024,1024],bomber:[0,0,1024,1024],'red-puffer':[0,0,1024,1024],varsity:[0,0,1024,1024],jersey:[0,0,1024,1024],denim:[0,0,1024,1024],
 crown:[145,232,734,226],cowboy:[-48,112,1120,374],bucket:[79,144,866,331],captain:[57,125,910,350],durag:[90,160,980,372],beanie:[160,227,704,220],cap:[52,125,920,345],
 shades:[120,470,800,143],glasses:[120,470,800,143],visor:[121,475,798,127],
 'pit-viper':[120,440,800,206],oakley:[120,471,800,155],rayban:[120,466,800,166],meta:[120,466,800,166],
 'gold-chain':[330,775,364,201],'silver-chain':[330,775,364,201],bandana:[318,775,388,216],pendant:[350,782,324,233],'diamond-chain':[316,775,392,218],
 honey:[699,828,244,244],cash:[665,830,300,222],coffee:[705,785,244,268],phone:[710,775,234,279],microphone:[690,738,282,312],rose:[731,718,206,338],flipoff:[730,763,227,291],championship:[670,720,330,400]
};
const assetSources={base:'assets/v2/base.png',panda:'assets/v2/panda.png',headmask:'assets/v2/head-mask.png',baseRegions:'assets/v3/base-regions.png',pandaRegions:'assets/v3/panda-regions.png',polarRegions:'assets/v5/polar-regions.png'};
for(const id of Object.keys(placement))assetSources[id]=['gold-chain','silver-chain','bandana','pendant'].includes(id)?'assets/'+id+'.png':'assets/v2/'+id+'.png';
for(const id of ['pit-viper','oakley','rayban','meta','crown','beanie','cap','gold-chain','silver-chain','bandana','pendant'])assetSources[id]='assets/v4/'+id+'.png';
assetSources.honey='assets/v3/honey.png';assetSources.cash='assets/v3/cash.png';
for(const id of ['red-puffer','varsity','jersey','denim','crown','cowboy','bucket','captain','durag','pit-viper','diamond-chain','cash','coffee','phone','microphone','rose','flipoff'])assetSources[id]='assets/v5/'+id+'.png';
assetSources['pit-viper']='assets/v4/pit-viper.png';
for(const id of ['cap','cowboy','bucket','durag','microphone','championship'])assetSources[id]='assets/v6/'+id+'.png';
for(const id of ['cowboy','bucket','durag','crown'])assetSources[id]='assets/v6-refit/'+id+'.png';
for(const id of Object.keys(assetSources))assetSources[id]='assets/bobomaker/'+assetSources[id].replace(/^assets\//,'');
const defaults=()=>({background:'sage',fur:'classic',outfit:'tee-red',headwear:'none',eyewear:'none',neck:'none',prop:'none',colors:{...palettes[0]},transparent:false,top:'',bottom:'',caps:true,textSize:64,font:'impact'});
const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const inside=(x,y,ps)=>{let c=false;for(let i=0,j=ps.length-1;i<ps.length;j=i++){if(((ps[i][1]>y)!=(ps[j][1]>y))&&(x<(ps[j][0]-ps[i][0])*(y-ps[i][1])/(ps[j][1]-ps[i][1])+ps[i][0]))c=!c}return c};
// Antialiased image-specific color masks are prepared from the approved artwork.
const propPaws={honey:[[1050,627],[1065,723],[929,732],[907,740],[900,768],[878,790],[820,791],[809,830],[830,863],[763,886],[733,929],[739,977],[779,1014],[743,1029],[721,1056],[716,1092],[730,1132],[758,1163],[799,1189],[926,1234],[974,1234],[1055,1220],[1119,1189],[1161,1155],[1199,1114],[1250,1000],[1242,846],[1194,740],[1137,674],[1052,627]],cash:[[1017,374],[935,392],[876,426],[850,462],[845,491],[852,510],[882,520],[823,547],[788,590],[783,624],[793,662],[826,694],[870,695],[828,698],[783,734],[776,785],[784,812],[809,842],[792,865],[790,897],[836,956],[907,989],[981,1005],[1212,1029],[1226,1029],[1267,1025],[1434,915],[1491,771],[1489,676],[1441,570],[1385,492],[1323,491],[1183,410],[1054,374]]};
propPaws.championship=[[567, 867], [547, 884], [459, 918], [432, 937], [391, 960], [373, 981], [373, 1020], [406, 1047], [376, 1072], [352, 1109], [354, 1147], [393, 1182], [360, 1197], [339, 1226], [350, 1273], [379, 1304], [373, 1324], [399, 1357], [440, 1380], [477, 1392], [871, 1528], [871, 1172], [732, 1102], [683, 1012], [645, 937], [607, 898]];
const eyewearFits={shades:{bridge:.5,drop:12},glasses:{bridge:.5,drop:10},visor:{bridge:.502,drop:16},'pit-viper':{bridge:.5,drop:14},oakley:{bridge:.5,drop:10},rayban:{bridge:.5,drop:10},meta:{bridge:.5,drop:10}};
const noseCenterX=546;
const ids=category=>categories.find(c=>c.id===category).options.map(x=>x[0]).filter(id=>id!=='none');
const outfits=ids('outfit'),props=ids('prop'),headwear=ids('headwear'),neckwear=ids('neck');
class Renderer{
 constructor(images,createCanvas){this.images=images;this.create=createCanvas||((w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c});this.cache=new Map();this.raw={};for(const key of ['base','panda',...outfits,...props]){const im=images[key];if(!im)continue;const c=this.create(props.includes(key)?im.width:1024,props.includes(key)?im.height:1024);c.getContext('2d').drawImage(im,0,0,c.width,c.height);this.raw[key]=c}this.headMask=this.create(1024,1024);this.headMask.getContext('2d').drawImage(images.headmask,0,0,1024,1024);this.cleanHeadMask();this.colorMasks=this.makeColorMasks();this.earMask=this.makeEarMask()}
 remember(key,c){if(this.cache.size>=24)this.cache.delete(this.cache.keys().next().value);this.cache.set(key,c);return c}
 // Keep the shared head cutout on the jaw, not the neck/shoulder pixels.
 // Preview, thumbnails and both layer exports all use this same clean mask.
 cleanHeadMask(){
  const clip=this.create(1024,1024),ctx=clip.getContext('2d');
  ctx.fillStyle='white';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(1024,0);
  ctx.lineTo(1024,744);ctx.lineTo(846,744);
  ctx.bezierCurveTo(817,767,783,775,742,785);
  ctx.bezierCurveTo(671,798,597,803,520,803);
  ctx.bezierCurveTo(444,803,372,797,307,783);
  ctx.bezierCurveTo(267,773,222,761,185,741);
  ctx.lineTo(0,741);ctx.closePath();ctx.fill();
  const mask=this.headMask.getContext('2d');mask.globalCompositeOperation='destination-in';
  mask.drawImage(clip,0,0);mask.globalCompositeOperation='source-over';
  // Replace, rather than intersect, the noisy old lower-edge pixels.
  mask.clearRect(0,735,1024,289);mask.save();mask.beginPath();
  mask.rect(0,735,1024,289);mask.clip();mask.drawImage(clip,0,0);mask.restore();
  mask.globalCompositeOperation='destination-in';mask.drawImage(this.raw.base,0,0);
  mask.globalCompositeOperation='source-over';
  // A two-pixel underlap prevents a transparent seam when head and outfit PNGs
  // are composited. Do not subtract the same antialiased edge twice.
  this.bodyCutMask=this.create(1024,1024);const cut=this.bodyCutMask.getContext('2d');
  cut.drawImage(this.headMask,0,0);cut.globalCompositeOperation='destination-in';
  for(const [dx,dy]of [[-2,0],[2,0],[0,-2],[0,2]])cut.drawImage(this.headMask,dx,dy);
  cut.globalCompositeOperation='source-over';
 }
 makeEarMask(){
  const c=this.create(1024,1024),ctx=c.getContext('2d');ctx.fillStyle='white';
  const outlines=[[[175,261],[218,220],[263,210],[309,238],[334,278],[292,295],[234,331],[218,343],[183,306]],[[693,278],[715,237],[765,210],[811,228],[848,261],[841,304],[804,341],[789,331],[737,296]]];
  for(const points of outlines){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill()}
  ctx.globalCompositeOperation='destination-in';ctx.drawImage(this.raw.base,0,0);return c;
 }
 makeColorMasks(){
  const read=id=>{const c=this.create(1024,1024),ctx=c.getContext('2d');ctx.drawImage(this.images[id],0,0,1024,1024);return ctx.getImageData(0,0,1024,1024).data};
  const original=this.raw.base.getContext('2d').getImageData(0,0,1024,1024).data;
  const details=new Uint8Array(1024*1024);
  for(let i=0;i<details.length;i++){const p=i*4,r=original[p],g=original[p+1],b=original[p+2];details[i]=Math.max(r,g,b)-Math.min(r,g,b)<14?1:0}
  return {base:read('baseRegions'),panda:read('pandaRegions'),polar:read('polarRegions'),details};
 }
 recolor(source,colors,isPanda=false,bodyOnly=false,prop=false){
  const w=source.width,h=source.height,c=this.create(w,h),ctx=c.getContext('2d');ctx.drawImage(source,0,0);
  const img=ctx.getImageData(0,0,w,h),d=img.data,target=[hex(colors.fur),hex(colors.muzzle),hex(colors.ears)];
  const refs=isPanda?[[228,223,211],[57,54,50],[158,134,130]]:[[111,69,45],[71,44,27],[180,123,93]];
  const ratios=target.map((rgb,i)=>rgb.map((v,k)=>v/refs[i][k]));
  const unchanged=ratios.map(rgb=>rgb.every(v=>v===1));
  const luminance=rgb=>rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
  const referenceLight=refs.map(luminance);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const p=(y*w+x)*4,r=d[p],g=d[p+1],b=d[p+2];if(d[p+3]<2)continue;
   let ear=0,muzzle=0;
   if(prop||bodyOnly){
    if(!(r>g*1.27&&g>b*1.14&&r-b>28&&r<190))continue;
    if(bodyOnly&&x>320&&x<710&&(y>840||bodyOnly==='suit'))continue;
    if(prop==='honey'&&!inside(x,y,propPaws.honey))continue;
    if(prop==='championship'&&(!inside(x,y,propPaws.championship)||g<r*.47||b<g*.5))continue;
    if(prop==='rose'&&y<h*.46||prop==='coffee'&&y<h*.30)continue;
    if(colors.pattern==='panda'&&(prop||x<340||x>720)){const lum=(r+g+b)/3;d[p]=lum*.24;d[p+1]=lum*.24;d[p+2]=lum*.25;continue}
   }else{
    if(this.colorMasks.details[y*w+x])continue;
    const masks=this.colorMasks[isPanda?'panda':colors.id==='polar'?'polar':'base'];ear=masks[p+1]/255;muzzle=masks[p]/255;
    if(isPanda&&ear===0&&muzzle===0&&(Math.max(r,g,b)<75||Math.max(r,g,b)-Math.min(r,g,b)>48))continue;
   }
   const fur=1-ear-muzzle;
   const light=r*.2126+g*.7152+b*.0722;
   for(let k=0;k<3;k++){const tint=i=>unchanged[i]?d[p+k]:light/referenceLight[i]*target[i][k];d[p+k]=Math.max(0,Math.min(255,fur*tint(0)+muzzle*tint(1)+ear*tint(2)))}
  }
  ctx.putImageData(img,0,0);return c;
 }

 base(colors){const key='base/'+JSON.stringify(colors);if(this.cache.has(key))return this.cache.get(key);const panda=colors.pattern==='panda';return this.remember(key,this.recolor(this.raw[panda?'panda':'base'],colors,panda))}
 head(colors){const key='head/'+JSON.stringify(colors);if(this.cache.has(key))return this.cache.get(key);const c=this.create(1024,1024),ctx=c.getContext('2d');ctx.drawImage(this.base(colors),0,0);ctx.globalCompositeOperation='destination-in';ctx.drawImage(this.headMask,0,0);ctx.globalCompositeOperation='source-over';return this.remember(key,c)}
 body(s){const key='body/'+s.outfit+'/'+JSON.stringify(s.colors);if(this.cache.has(key))return this.cache.get(key);const c=this.create(1024,1024),ctx=c.getContext('2d');if(s.outfit==='none'){ctx.drawImage(this.base(s.colors),0,0)}else{ctx.drawImage(this.recolor(this.raw[s.outfit],s.colors,false,s.outfit),0,0);ctx.clearRect(0,0,1024,735)}ctx.globalCompositeOperation='destination-out';ctx.drawImage(this.bodyCutMask,0,0);ctx.globalCompositeOperation='source-over';return this.remember(key,c)}
 background(ctx,id){const item=categories[0].options.find(x=>x[0]===id)||categories[0].options[0];ctx.fillStyle=item[2];ctx.fillRect(0,0,1024,1024);if(id==='check'){ctx.fillStyle='#f9f8f5';for(let y=0;y<8;y++)for(let x=0;x<8;x++)if((x+y)%2===0)ctx.fillRect(x*128,y*128,128,128)}}
 drawEyewear(ctx,im,id){
  const [x,y,w,h]=placement[id],fit=eyewearFits[id],bridge=im.width*fit.bridge;
  // Pin the bridge to the actual nose, preserving both approved outer frame edges.
  ctx.save();ctx.transform((noseCenterX-x)/bridge,fit.drop/bridge,0,h/im.height,x,y);
  ctx.drawImage(im,0,0,bridge,im.height,0,0,bridge,im.height);ctx.restore();
  const right=im.width-bridge;
  ctx.save();ctx.transform((x+w-noseCenterX)/right,-fit.drop/right,0,h/im.height,noseCenterX,y+fit.drop);
  ctx.drawImage(im,bridge,0,right,im.height,0,0,right,im.height);ctx.restore();
 }
 // Refit the approved belt artwork rather than rotating the bear's gripping paw.
 // The front plate and its lettering now run sideways along the shoulder strap.
 drawChampionship(ctx,im){
  const [x,y,w,h]=placement.championship,sx=w/im.width,sy=h/im.height;
  const trace=(cx,points)=>{cx.beginPath();points.forEach(([px,py],i)=>i?cx.lineTo(px,py):cx.moveTo(px,py));cx.closePath()};
  // Separate the original leather from the gripping paw before refitting it.
  const belt=this.create(im.width,im.height),bc=belt.getContext('2d');bc.drawImage(im,0,0);
  bc.globalCompositeOperation='destination-out';trace(bc,propPaws.championship);bc.fill();
  bc.globalCompositeOperation='source-over';
  ctx.save();trace(ctx,[[811,937],[882,937],[869,1024],[796,1024],[796,952]]);ctx.clip();
  ctx.drawImage(belt,0,850,im.width,im.height-850,x+42,y+840*sy,w,(im.height-850)*sy);ctx.restore();
  ctx.save();trace(ctx,[[844,701],[921,701],[935,765],[826,765],[839,739]]);ctx.clip();
  ctx.drawImage(belt,0,0,im.width,190,710,705,300,61.75);ctx.restore();
  // Follow the plate's leather outline, excluding the old vertical strap ends.
  const plate=this.create(im.width,im.height),pc=plate.getContext('2d');
  trace(pc,[[415,134],[340,147],[317,177],[288,196],[232,212],[203,240],
   [170,257],[132,267],[113,296],[86,318],[46,339],[24,356],[14,400],
   [0,435],[0,657],[8,685],[51,707],[95,718],[122,747],[168,758],
   [195,774],[220,802],[275,816],[311,841],[337,859],[416,877],
   [493,865],[520,840],[574,820],[600,790],[628,769],[693,749],
   [711,724],[762,696],[778,678],[783,420],[763,387],[745,354],
   [701,316],[684,282],[649,274],[612,255],[583,218],[537,205],
   [508,188],[494,159]]);pc.clip();pc.drawImage(belt,0,0);
  ctx.save();ctx.translate(862,854);ctx.rotate(-Math.PI/2+.15);
  ctx.drawImage(plate,0,135,805,745,-124.64,-80.20,249.28,160.41);ctx.restore();
  // Keep the existing bear paw in front, including its selected fur color.
  ctx.save();trace(ctx,propPaws.championship.map(([px,py])=>[x+px*sx,y+py*sy]));
  ctx.clip();ctx.drawImage(im,x,y,w,h);ctx.restore();
 }

 asset(ctx,id,s){if(id==='none'||!this.images[id])return;const key='asset/'+id+'/'+JSON.stringify(s?.colors||{});let c=this.cache.get(key);if(!c){c=this.create(1024,1024);const cx=c.getContext('2d');let im=this.images[id];if(props.includes(id))im=this.recolor(this.raw[id],s.colors,false,false,id);if(id in eyewearFits){this.drawEyewear(cx,im,id)}else if(id==='championship'){this.drawChampionship(cx,im)}else cx.drawImage(im,...placement[id]);if(headwear.includes(id)&&!['cap','captain','cowboy','bucket','durag'].includes(id)){cx.globalCompositeOperation='destination-out';cx.drawImage(this.earMask,0,0);cx.globalCompositeOperation='source-over'}if(neckwear.includes(id)||id==='championship'){cx.globalCompositeOperation='destination-out';cx.drawImage(this.headMask,0,0);cx.globalCompositeOperation='source-over'}const contact=this.create(1024,1024),sc=contact.getContext('2d');sc.shadowColor='rgba(28,18,12,.28)';sc.shadowBlur=6;sc.shadowOffsetY=4;sc.drawImage(c,0,0);sc.globalCompositeOperation='destination-in';sc.drawImage(this.raw.base,0,0);sc.globalCompositeOperation='source-over';sc.drawImage(c,0,0);c=contact;this.remember(key,c)}ctx.drawImage(c,0,0)}
text(ctx,s){const family=s.font==='serif'?'Georgia,serif':s.font==='sans'?'Arial,sans-serif':'Impact,Arial Black,Arial,sans-serif';ctx.textAlign='center';ctx.textBaseline='top';ctx.lineJoin='round';ctx.fillStyle='white';ctx.strokeStyle='#181818';const blocks=[s.top,s.bottom].map(t=>s.caps?t.toUpperCase():t);for(let pos=0;pos<2;pos++){if(!blocks[pos])continue;let size=s.textSize;let lines=[];function wrap(){ctx.font=`900 ${size}px ${family}`;lines=[];for(const paragraph of blocks[pos].split('\n')){let line='';for(const word of paragraph.split(/\s+/)){const next=(line?line+' ':'')+word;if(ctx.measureText(next).width>930&&line){lines.push(line);line=word}else line=next;}lines.push(line)}}wrap();while((lines.length>3||lines.some(l=>ctx.measureText(l).width>930))&&size>20){size-=2;wrap()}const start=pos===0?30:1024-30-lines.length*size*1.05;ctx.lineWidth=Math.max(3,size*.075);lines.forEach((l,i)=>{ctx.strokeText(l,512,start+i*size*1.05,940);ctx.fillText(l,512,start+i*size*1.05,940)})}}
 draw(ctx,s,only){ctx.clearRect(0,0,1024,1024);if(only==='background'){if(!s.transparent)this.background(ctx,s.background);return}if(only==='meme'){this.text(ctx,s);return}if(only==='fur'){ctx.drawImage(this.head(s.colors),0,0);return}if(only==='outfit'){ctx.drawImage(this.body(s),0,0);return}if(only){this.asset(ctx,s[only],s);return}if(!s.transparent)this.background(ctx,s.background);ctx.drawImage(this.body(s),0,0);ctx.drawImage(this.head(s.colors),0,0);this.asset(ctx,s.neck,s);this.asset(ctx,s.headwear,s);this.asset(ctx,s.eyewear,s);this.asset(ctx,s.prop,s);this.text(ctx,s)}
 thumbnail(ctx,cat,id){ctx.clearRect(0,0,220,180);const s=defaults();s[cat]=id;if(cat==='fur')s.colors=palettes.find(x=>x.id===id);const c=this.create(1024,1024);this.draw(c.getContext('2d'),s);ctx.drawImage(c,0,0,1024,1024,20,0,180,180)}
}
root.BoboEngine={Renderer,categories,palettes,placement,assetSources,defaults};if(typeof module!=='undefined')module.exports=root.BoboEngine;
})(typeof window==='undefined'?globalThis:window);
