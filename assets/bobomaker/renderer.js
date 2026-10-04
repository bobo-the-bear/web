(function(root){'use strict';
const palettes=[
{id:'classic',name:'Original Bobo',fur:'#6f452d',muzzle:'#472c1b',ears:'#b47b5d'},
{id:'honey',name:'Honey',fur:'#bd883e',muzzle:'#634019',ears:'#e4b17b'},
{id:'midnight',name:'Midnight',fur:'#3b3430',muzzle:'#201c1a',ears:'#8a6250'},
{id:'polar',name:'Polar',fur:'#e4dbcc',muzzle:'#8c7867',ears:'#cda18d'},
{id:'panda',name:'Panda',fur:'#e4dfd3',muzzle:'#393632',ears:'#9e8682',pattern:'panda'},
{id:'red',name:'Red market',fur:'#b34649',muzzle:'#672b32',ears:'#dc8a85'}];
const imageBackgrounds=Object.fromEntries([
 '100','Based','Bitcoin Orange','Blue Screen of Death','Forest Fire','Forest',
 'Genesis','Grim','Guppy Stonk','Heat Map','NPC','Rainbow Chart','Rug Pull',
 'Yotsuba B','Yotsuba'
].map(name=>['bg-'+name.toLowerCase().replaceAll(' ','-'),name]));
const categories=[
{id:'background',name:'Backdrop',help:'Choose a color or a scene.',options:[['sage','Council green','#ccd9b3'],['white','Studio white','#ffffff'],['pink','Rose','#e9c1c1'],['blue','Blue hour','#9eb6d3'],['yellow','Honey yellow','#ecc968'],['red','Bobo red','#b90b2a'],['ink','After hours','#242321'],['lavender','Lilac','#c4b6d4'],['check','Checkerboard','#dedcd7'],...Object.entries(imageBackgrounds)]},
{id:'fur',name:'Fur',help:'The same bear, a different coat.',options:palettes.map(x=>[x.id,x.name])},
{id:'outfit',name:'Outfit',help:'Dress for the market you deserve.',options:[['tee-red','Bobo red tee'],['hoodie','Black hoodie'],['puffer','Blue puffer'],['suit','Council suit'],['tee-white','White tee'],['bomber','Black bomber'],['red-puffer','Red puffer'],['varsity','Council varsity'],['jersey','Courtside jersey'],['denim','Denim jacket'],['none','Bare bear']]},
{id:'headwear',name:'Headwear',help:'A little something on top.',options:[['none','None'],['crown','King Bobo'],['beanie','Black beanie'],['cap','Red cap'],['cowboy','Black cowboy'],['bucket','Black Bobo bucket'],['captain','Captain’s hat'],['durag','Black durag']]},
{id:'eyewear',name:'Eyewear',help:'A new outlook. Same expression.',options:[['none','None'],['shades','Black shades'],['glasses','Nerd frames'],['visor','Chrome visor'],['pit-viper','Pit Viper style'],['oakley','Oakley style'],['rayban','Ray-Ban style'],['meta','Meta streaming']]},
{id:'neck',name:'Neck',help:'The finishing touch.',options:[['none','None'],['gold-chain','Gold Cuban'],['silver-chain','Silver Cuban'],['bandana','Red bandana'],['pendant','Honey pendant'],['diamond-chain','Diamond Cuban']]},
{id:'prop',name:'Props',help:'A bear’s essentials.',options:[['none','None'],['honey','Honey jar'],['cash','Cash stack'],['coffee','Coffee to go'],['phone','Smartphone'],['microphone','Mic check'],['rose','Red rose'],['flipoff','Middle paw'],['championship','Bobo championship'],['beras-can',"Bera's can"],['champagne','Champagne'],['eviction','Eviction notice']]},
{id:'meme',name:'Meme',help:'Say it with your whole bear.',options:[]}];
const placement={
 'tee-red':[0,0,1024,1024],hoodie:[0,0,1024,1024],puffer:[0,0,1024,1024],suit:[0,0,1024,1024],'tee-white':[0,0,1024,1024],bomber:[0,0,1024,1024],'red-puffer':[0,0,1024,1024],varsity:[0,0,1024,1024],jersey:[0,0,1024,1024],denim:[0,0,1024,1024],
 crown:[161,199,702,255],cowboy:[18,102,988,360],bucket:[79,144,866,331],captain:[57,125,910,350],durag:[98,152,920,350],beanie:[160,227,704,220],cap:[132,140,760,260],
 shades:[120,470,800,143],glasses:[120,470,800,143],visor:[121,475,798,127],
 'pit-viper':[120,440,800,206],oakley:[120,471,800,155],rayban:[120,466,800,166],meta:[120,466,800,166],
 'gold-chain':[330,775,364,201],'silver-chain':[330,775,364,201],bandana:[318,775,388,216],pendant:[350,782,324,233],'diamond-chain':[316,775,392,218],
 honey:[699,828,244,244],cash:[665,830,300,222],coffee:[705,785,244,268],phone:[710,775,234,279],microphone:[690,738,282,312],rose:[731,718,206,338],flipoff:[730,763,227,291],championship:[670,720,330,400]
};
const newProps=['beras-can','champagne','eviction'];
// Ears tuck inside these fitted hats. Other headwear keeps the original ears.
const tuckedEarHeadwear=['cap','durag','cowboy'];
for(const id of newProps)placement[id]=[728,800,234,261];
const assetSources={base:'assets/v2/base.png',panda:'assets/v2/panda.png',headmask:'assets/v2/head-mask.png',baseRegions:'assets/v3/base-regions.png',pandaRegions:'assets/v3/panda-regions.png',polarRegions:'assets/v5/polar-regions.png'};
for(const id of Object.keys(placement))assetSources[id]=['gold-chain','silver-chain','bandana','pendant'].includes(id)?'assets/'+id+'.png':'assets/v2/'+id+'.png';
for(const id of ['pit-viper','oakley','rayban','meta','crown','beanie','cap','gold-chain','silver-chain','bandana','pendant'])assetSources[id]='assets/v4/'+id+'.png';
assetSources.honey='assets/v3/honey.png';assetSources.cash='assets/v3/cash.png';
for(const id of ['red-puffer','varsity','jersey','denim','crown','cowboy','bucket','captain','durag','pit-viper','diamond-chain','cash','coffee','phone','microphone','rose','flipoff'])assetSources[id]='assets/v5/'+id+'.png';
assetSources['pit-viper']='assets/v4/pit-viper.png';
for(const id of ['cap','cowboy','bucket','durag','microphone','championship'])assetSources[id]='assets/v6/'+id+'.png';
for(const id of ['cowboy','bucket','durag','crown'])assetSources[id]='assets/v6-refit/'+id+'.png';
for(const id of [...newProps,'red-puffer','jersey'])assetSources[id]='assets/v7/'+id+'.png';
assetSources['beras-can']='assets/v8/beras-can.png';
for(const id of ['cowboy','bucket'])assetSources[id]='assets/v9/'+id+'.png';
assetSources['bucket-wordmark']='assets/v9/bobo-wordmark.png';
for(const id of Object.keys(assetSources))assetSources[id]='assets/bobomaker/'+assetSources[id].replace(/^assets\//,'');
for(const [id,name]of Object.entries(imageBackgrounds))assetSources[id]='assets/bobomaker/backgrounds/'+name+'.webp';
const defaults=()=>({background:'sage',fur:'classic',outfit:'tee-red',headwear:'none',eyewear:'none',neck:'none',prop:'none',colors:{...palettes[0]},transparent:false,top:'',bottom:'',caps:true,textSize:64,font:'impact'});
const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const inside=(x,y,ps)=>{let c=false;for(let i=0,j=ps.length-1;i<ps.length;j=i++){if(((ps[i][1]>y)!=(ps[j][1]>y))&&(x<(ps[j][0]-ps[i][0])*(y-ps[i][1])/(ps[j][1]-ps[i][1])+ps[i][0]))c=!c}return c};
// Antialiased image-specific color masks are prepared from the approved artwork.
const propPaws={honey:[[1050,627],[1065,723],[929,732],[907,740],[900,768],[878,790],[820,791],[809,830],[830,863],[763,886],[733,929],[739,977],[779,1014],[743,1029],[721,1056],[716,1092],[730,1132],[758,1163],[799,1189],[926,1234],[974,1234],[1055,1220],[1119,1189],[1161,1155],[1199,1114],[1250,1000],[1242,846],[1194,740],[1137,674],[1052,627]],cash:[[1017,374],[935,392],[876,426],[850,462],[845,491],[852,510],[882,520],[823,547],[788,590],[783,624],[793,662],[826,694],[870,695],[828,698],[783,734],[776,785],[784,812],[809,842],[792,865],[790,897],[836,956],[907,989],[981,1005],[1212,1029],[1226,1029],[1267,1025],[1434,915],[1491,771],[1489,676],[1441,570],[1385,492],[1323,491],[1183,410],[1054,374]]};
// v5 cash uses a 1222 x 1144 source; the old v3 polygon cut through its grip.
propPaws.cash=[[851,400],[746,416],[692,442],[665,472],[658,521],[677,542],[637,558],[612,603],[610,664],[632,705],[605,737],[596,781],[601,824],[616,865],[614,904],[646,962],[713,996],[836,1020],[971,1060],[1090,1144],[1222,1144],[1222,524],[1091,489],[990,441]];
propPaws.championship=[[567, 867], [547, 884], [459, 918], [432, 937], [391, 960], [373, 981], [373, 1020], [406, 1047], [376, 1072], [352, 1109], [354, 1147], [393, 1182], [360, 1197], [339, 1226], [350, 1273], [379, 1304], [373, 1324], [399, 1357], [440, 1380], [477, 1392], [871, 1528], [871, 1172], [732, 1102], [683, 1012], [645, 937], [607, 898]];
const eyewearFits={shades:{bridge:.5,drop:12},glasses:{bridge:.5,drop:10},visor:{bridge:.502,drop:16},'pit-viper':{bridge:.5,drop:14},oakley:{bridge:.5,drop:10},rayban:{bridge:.5,drop:10},meta:{bridge:.5,drop:10}};
const noseCenterX=546;
// All traits use this 1024px character frame. A held item's wrist joins the
// existing arm silhouette below the grip, never the rectangular source edge.
const anchors={headCenter:512,noseCenter:noseCenterX,hatBand:458,wristJoin:925,armExit:980};
const ids=category=>categories.find(c=>c.id===category).options.map(x=>x[0]).filter(id=>id!=='none');
const outfits=ids('outfit'),props=ids('prop'),neckwear=ids('neck');
class Renderer{
 constructor(images,createCanvas){this.images=images;this.create=createCanvas||((w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c});this.cache=new Map();this.raw={};for(const key of ['base','panda',...outfits,...props]){const im=images[key];if(!im)continue;const c=this.create(props.includes(key)?im.width:1024,props.includes(key)?im.height:1024);const cy=key==='red-puffer'?230:0,ch=key==='red-puffer'?794:c.height;c.getContext('2d').drawImage(im,0,cy,c.width,ch);this.raw[key]=c}this.headMask=this.create(1024,1024);this.headMask.getContext('2d').drawImage(images.headmask,0,0,1024,1024);this.cleanHeadMask();this.colorMasks=this.makeColorMasks()}
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
    // These revised garments contain warm fabric shadows near the fur hue.
    // The full-sleeve puffer exposes only its small neckline; jersey gold is
    // a material color, including its darker shaded pixels.
    if(bodyOnly==='red-puffer'&&!inside(x,y,[[450,780],[590,780],[532,836]]))continue;
    if(bodyOnly==='jersey'&&g>r*.62&&b<g*.65)continue;
    if(bodyOnly&&x>320&&x<710&&(y>840||bodyOnly==='suit'))continue;
    if(prop==='honey'&&!inside(x,y,propPaws.honey))continue;
    if(prop==='cash'&&!inside(x,y,propPaws.cash))continue;
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
   for(let k=0;k<3;k++){const tint=i=>unchanged[i]&&!prop?d[p+k]:light/referenceLight[i]*target[i][k];d[p+k]=Math.max(0,Math.min(255,fur*tint(0)+muzzle*tint(1)+ear*tint(2)))}
  }
  ctx.putImageData(img,0,0);return c;
 }

 base(colors){const key='base/'+JSON.stringify(colors);if(this.cache.has(key))return this.cache.get(key);const panda=colors.pattern==='panda';return this.remember(key,this.recolor(this.raw[panda?'panda':'base'],colors,panda))}
 head(colors,headwear='none'){
  const tucked=tuckedEarHeadwear.includes(headwear),key='head/'+tucked+'/'+JSON.stringify(colors);
  if(this.cache.has(key))return this.cache.get(key);
  const c=this.create(1024,1024),ctx=c.getContext('2d');ctx.drawImage(this.base(colors),0,0);
  ctx.globalCompositeOperation='destination-in';ctx.drawImage(this.headMask,0,0);
  ctx.globalCompositeOperation='source-over';
  // Remove only the source ears behind the fabric. The lower edges fall under
  // the complete hat band/brim, so the forehead and all facial pixels survive.
  // This belongs in the head layer; cutting the hat creates visible ear holes.
  if(tucked){ctx.clearRect(140,175,205,215);ctx.clearRect(680,175,205,215)}
  return this.remember(key,c);
 }
 body(s){const key='body/'+s.outfit+'/'+JSON.stringify(s.colors);if(this.cache.has(key))return this.cache.get(key);const c=this.create(1024,1024),ctx=c.getContext('2d');if(s.outfit==='none'){ctx.drawImage(this.base(s.colors),0,0)}else{ctx.drawImage(this.recolor(this.raw[s.outfit],s.colors,false,s.outfit),0,0);ctx.clearRect(0,0,1024,735)}ctx.globalCompositeOperation='destination-out';ctx.drawImage(this.bodyCutMask,0,0);ctx.globalCompositeOperation='source-over';return this.remember(key,c)}
 background(ctx,id){
  const item=categories[0].options.find(x=>x[0]===id)||categories[0].options[0];
  ctx.fillStyle=item[2]||'#ffffff';ctx.fillRect(0,0,1024,1024);
  if(id in imageBackgrounds){
   const im=this.images[id];if(!im)return;
   // Center-cover without stretching. The 15 originals are square, so their
   // entire image is retained. The white underlay keeps opaque exports opaque
   // even where the source has slightly translucent pixels.
   const side=Math.min(im.width,im.height);
   ctx.drawImage(im,(im.width-side)/2,(im.height-side)/2,side,side,0,0,1024,1024);
  }else if(id==='check'){
   ctx.fillStyle='#f9f8f5';for(let y=0;y<8;y++)for(let x=0;x<8;x++)if((x+y)%2===0)ctx.fillRect(x*128,y*128,128,128);
  }
 }

 drawBucket(ctx,im){
  ctx.drawImage(im,...placement.bucket);
  // Keep the user's exact white wordmark, including its fine red edge. Crop
  // transparent padding only and scale uniformly; never regenerate lettering.
  const logo=this.images['bucket-wordmark'],sw=1213,sh=420,w=260,h=w*sh/sw;
  const mark=this.create(w,Math.ceil(h)),mc=mark.getContext('2d');
  mc.drawImage(logo,144,30,sw,sh,0,0,w,h);
  // Fine thread shading stays inside the existing mark's alpha silhouette.
  mc.globalCompositeOperation='source-atop';mc.strokeStyle='rgba(30,27,25,.085)';
  mc.lineWidth=.65;
  for(let x=-h;x<w;x+=2.5){mc.beginPath();mc.moveTo(x,0);mc.lineTo(x+h,h);mc.stroke()}
  ctx.save();ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=1.2;
  ctx.shadowOffsetY=1.1;ctx.drawImage(mark,anchors.headCenter-w/2,251);ctx.restore();
 }
 drawDurag(ctx,im){
  // Fit the fabric independently of the tie. The old left band overhung the
  // head; pin its seam to the head center, keeping the right knot/tails intact.
  const [x,y,w,h]=placement.durag,seam=900,join=1700;
  const sx=w/im.width,center=anchors.headCenter;
  const bandLeft=158,knot=x+join*sx;
  ctx.drawImage(im,0,0,seam,im.height,bandLeft,y,center-bandLeft,h);
  ctx.drawImage(im,seam,0,join-seam,im.height,center,y,knot-center,h);
  ctx.drawImage(im,join,0,im.width-join,im.height,knot,y,w-join*sx,h);
 }
 drawEyewear(ctx,im,id){
  const [x,y,w,h]=placement[id],fit=eyewearFits[id],bridge=im.width*fit.bridge;
  // Pin the bridge to the actual nose, preserving both approved outer frame edges.
  ctx.save();ctx.transform((noseCenterX-x)/bridge,fit.drop/bridge,0,h/im.height,x,y);
  ctx.drawImage(im,0,0,bridge,im.height,0,0,bridge,im.height);ctx.restore();
  const right=im.width-bridge;
  ctx.save();ctx.transform((x+w-noseCenterX)/right,-fit.drop/right,0,h/im.height,noseCenterX,y+fit.drop);
  ctx.drawImage(im,bridge,0,right,im.height,0,0,right,im.height);ctx.restore();
 }
 // Drape an open belt over the shoulder; keep the approved paw and gold art.
 drawChampionship(ctx,im){
  const [x,y,w,h]=placement.championship,sx=w/im.width,sy=h/im.height;
  const trace=(cx,points)=>{cx.beginPath();points.forEach(([px,py],i)=>i?cx.lineTo(px,py):cx.moveTo(px,py));cx.closePath()};
  const belt=this.create(im.width,im.height),bc=belt.getContext('2d');bc.drawImage(im,0,0);
  bc.globalCompositeOperation='destination-out';trace(bc,propPaws.championship);bc.fill();
  bc.globalCompositeOperation='source-over';
  const layer=this.create(1024,1024),lc=layer.getContext('2d');
  // The top strap folds over the shoulder and ends behind the center plate.
  // Do not join its outer edge to the lower tail: that makes a closed loop.
  lc.beginPath();lc.moveTo(741,770);lc.bezierCurveTo(776,769,818,780,851,805);
  lc.bezierCurveTo(873,822,885,836,888,851);lc.lineTo(870,861);
  lc.bezierCurveTo(849,837,820,822,779,820);
  lc.bezierCurveTo(763,804,751,787,741,770);lc.closePath();
  const leatherTop=lc.createLinearGradient(748,776,894,856);
  leatherTop.addColorStop(0,'#3a3634');leatherTop.addColorStop(.38,'#171615');leatherTop.addColorStop(1,'#292624');
  lc.fillStyle=leatherTop;lc.fill();lc.strokeStyle='#0f0e0d';lc.lineWidth=4;lc.stroke();
  // A separate open tail hangs below the plate and behind the gripping paw.
  lc.beginPath();lc.moveTo(795,949);lc.bezierCurveTo(823,944,857,947,884,957);
  lc.lineTo(895,1024);lc.lineTo(783,1024);
  lc.bezierCurveTo(786,998,790,974,795,949);lc.closePath();
  const leatherTail=lc.createLinearGradient(791,948,893,1024);
  leatherTail.addColorStop(0,'#34302e');leatherTail.addColorStop(.45,'#151514');leatherTail.addColorStop(1,'#262321');
  lc.fillStyle=leatherTail;lc.fill();lc.strokeStyle='#0f0e0d';lc.lineWidth=4;lc.stroke();
  // Original shoulder fold and lower strap, underneath the single center plate.
  lc.save();lc.translate(807,800);lc.rotate(.2);
  lc.drawImage(belt,200,0,480,210,-72,-40,146,78);lc.restore();
  lc.save();trace(lc,[[792,946],[890,946],[895,1024],[783,1024]]);lc.clip();
  lc.drawImage(belt,0,850,im.width,im.height-850,710,915,w,(im.height-850)*sy);lc.restore();
  const plate=this.create(im.width,im.height),pc=plate.getContext('2d');
  trace(pc,[[415,134],[340,147],[317,177],[288,196],[232,212],[203,240],
   [170,257],[132,267],[113,296],[86,318],[46,339],[24,356],[14,400],
   [0,435],[0,657],[8,685],[51,707],[95,718],[122,747],[168,758],
   [195,774],[220,802],[275,816],[311,841],[337,859],[416,877],
   [493,865],[520,840],[574,820],[600,790],[628,769],[693,749],
   [711,724],[762,696],[778,678],[783,420],[763,387],[745,354],
   [701,316],[684,282],[649,274],[612,255],[583,218],[537,205],
   [508,188],[494,159]]);pc.clip();pc.drawImage(belt,0,0);
  // Keep the sideways championship orientation without compressing the logo.
  // Its upper edge meets the shoulder; the complete lettering clears the paw.
  lc.save();lc.translate(790,889);lc.rotate(-1.38);
  lc.drawImage(plate,0,135,805,745,-114,-105.5,228,211);lc.restore();
  ctx.drawImage(layer,0,0);
  ctx.save();trace(ctx,propPaws.championship.map(([px,py])=>[x+px*sx,y+py*sy]));
  ctx.clip();ctx.drawImage(im,x,y,w,h);ctx.restore();
 }

 drawCrown(ctx,im){
  // This source includes the back of the circlet. Only its front-facing band
  // and three main points belong in front of Bobo's head. Clip in source space
  // so the two rear prongs/returns disappear without cutting around the ears
  // or sacrificing the front points, jewels and lower gold rim.
  const [x,y,w,h]=placement.crown;
  ctx.save();ctx.translate(x,y);ctx.scale(w/1650,h/600);
  ctx.beginPath();ctx.moveTo(0,346);
  ctx.bezierCurveTo(50,356,108,360,156,355);
  ctx.lineTo(336,65);ctx.lineTo(336,0);ctx.lineTo(1314,0);
  ctx.lineTo(1314,65);ctx.lineTo(1494,355);
  ctx.bezierCurveTo(1542,360,1600,356,1650,346);
  ctx.lineTo(1650,600);ctx.lineTo(0,600);ctx.closePath();ctx.clip();
  ctx.drawImage(im,0,0,1650,600);ctx.restore();
 }
 fitWrist(ctx,id){
  // Preserve the complete object and rounded grip. At the wrist, constrain the
  // outer edge to Bobo's original arm. This removes exposed source-image cuts
  // without inventing fingers, stretching the paw, or masking the held object.
  const [x,,w]=placement[id],edge=Math.floor(x+w);
  const strip=ctx.getImageData(edge-1,anchors.wristJoin,1,1024-anchors.wristJoin).data;
  let join=anchors.wristJoin;
  while(join<1024&&strip[(join-anchors.wristJoin)*4+3]<128)join++;
  if(join===1024)return;
  // Continue only the clipped wrist texture, underneath the untouched grip.
  // The curved silhouette conceals the start of this two-pixel texture strip.
  const source=this.create(1024,1024);source.getContext('2d').drawImage(ctx.canvas,0,0);
  ctx.globalCompositeOperation='destination-over';
  ctx.drawImage(source,edge-2,join,2,1024-join,edge-2,join,1026-edge,1024-join);
  const mask=this.create(1024,1024),mc=mask.getContext('2d');mc.fillStyle='white';
  mc.beginPath();mc.moveTo(0,0);mc.lineTo(1024,0);mc.lineTo(1024,875);
  mc.bezierCurveTo(980,900,940,918,941,942);
  mc.bezierCurveTo(944,968,963,998,anchors.armExit,1024);
  mc.lineTo(0,1024);mc.closePath();mc.fill();
  ctx.globalCompositeOperation='destination-in';ctx.drawImage(mask,0,0);
  ctx.globalCompositeOperation='source-over';
 }
 // Reuse the approved coffee grip for new objects. Object artwork is never
 // recolored; only the existing bear paw receives the selected fur palette.
 grip(colors){
  const key='grip/'+JSON.stringify(colors);if(this.cache.has(key))return this.cache.get(key);
  const c=this.create(1063,1186),cx=c.getContext('2d');
  cx.beginPath();cx.moveTo(630,414);cx.lineTo(631,446);
  cx.bezierCurveTo(537,438,430,480,416,522);
  cx.bezierCurveTo(399,554,413,582,440,599);
  cx.bezierCurveTo(388,621,367,666,371,715);
  cx.bezierCurveTo(375,751,391,770,427,781);
  cx.bezierCurveTo(377,807,367,846,385,890);
  cx.bezierCurveTo(404,930,430,951,455,959);
  cx.bezierCurveTo(426,960,407,977,407,1004);
  cx.bezierCurveTo(402,1047,438,1075,532,1088);
  cx.bezierCurveTo(583,1105,641,1101,682,1093);
  cx.lineTo(782,1186);cx.lineTo(1063,1186);cx.lineTo(1063,414);
  cx.closePath();cx.clip();
  cx.drawImage(this.recolor(this.raw.coffee,colors,false,false,'coffee'),0,0);
  return this.remember(key,c);
 }
 objectBounds(id){
  if(!this.bounds)this.bounds={};if(this.bounds[id])return this.bounds[id];
  const source=this.raw[id],{width:w,height:h}=source;
  const d=source.getContext('2d').getImageData(0,0,w,h).data;
  let x0=w,y0=h,x1=0,y1=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(d[(y*w+x)*4+3]>32){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y)}
  return this.bounds[id]=[x0,y0,x1-x0+1,y1-y0+1];
 }
 drawNewProp(ctx,id,s){
  const frames={'beras-can':[700,768,166,282],champagne:[686,714,276,342],eviction:[656,781,227,301]};
  const [x,y,w,h]=frames[id],bounds=this.objectBounds(id),scale=Math.min(w/bounds[2],h/bounds[3]);
  const dw=bounds[2]*scale,dh=bounds[3]*scale;
  ctx.save();if(id==='eviction'){ctx.translate(x+w/2,y+h/2);ctx.rotate(-.12);ctx.translate(-x-w/2,-y-h/2)}
  ctx.drawImage(this.images[id],...bounds,x+(w-dw)/2,y,dw,dh);ctx.restore();
  const paw=this.create(1024,1024),pc=paw.getContext('2d');
  pc.drawImage(this.grip(s.colors),...placement[id]);this.fitWrist(pc,id);
  ctx.drawImage(paw,0,0);
 }
 asset(ctx,id,s){
  if(id==='none'||!this.images[id])return;
  const key='asset/'+id+'/'+JSON.stringify(s?.colors||{});let c=this.cache.get(key);
  if(!c){
   c=this.create(1024,1024);const cx=c.getContext('2d');let im=this.images[id];
   if(props.includes(id)&&!newProps.includes(id))im=this.recolor(this.raw[id],s.colors,false,false,id);
   if(newProps.includes(id))this.drawNewProp(cx,id,s);
   else if(id in eyewearFits)this.drawEyewear(cx,im,id);
   else if(id==='championship')this.drawChampionship(cx,im);
   else if(id==='crown')this.drawCrown(cx,im);
   else if(id==='durag')this.drawDurag(cx,im);
   else if(id==='bucket')this.drawBucket(cx,im);
   else cx.drawImage(im,...placement[id]);
   // Headwear sits in front of the ears. Subtracting the ear silhouettes from
   // the hat itself punches holes through crown points and knitted hat edges.
   if(props.includes(id)&&id!=='championship'&&!newProps.includes(id))this.fitWrist(cx,id);
   if(neckwear.includes(id)||id==='championship'){
    cx.globalCompositeOperation='destination-out';cx.drawImage(this.headMask,0,0);
    cx.globalCompositeOperation='source-over';
   }
   const contact=this.create(1024,1024),sc=contact.getContext('2d');
   sc.shadowColor='rgba(28,18,12,.28)';sc.shadowBlur=6;sc.shadowOffsetY=4;
   sc.drawImage(c,0,0);
   sc.shadowColor='transparent';
   sc.globalCompositeOperation='destination-in';
   sc.drawImage(this.raw.base,0,0);sc.globalCompositeOperation='source-over';
   sc.drawImage(c,0,0);
   c=contact;this.remember(key,c);
  }
  ctx.drawImage(c,0,0);
 }
text(ctx,s){const family=s.font==='serif'?'Georgia,serif':s.font==='sans'?'Arial,sans-serif':'Impact,Arial Black,Arial,sans-serif';ctx.textAlign='center';ctx.textBaseline='top';ctx.lineJoin='round';ctx.fillStyle='white';ctx.strokeStyle='#181818';const blocks=[s.top,s.bottom].map(t=>s.caps?t.toUpperCase():t);for(let pos=0;pos<2;pos++){if(!blocks[pos])continue;let size=s.textSize;let lines=[];function wrap(){ctx.font=`900 ${size}px ${family}`;lines=[];for(const paragraph of blocks[pos].split('\n')){let line='';for(const word of paragraph.split(/\s+/)){const next=(line?line+' ':'')+word;if(ctx.measureText(next).width>930&&line){lines.push(line);line=word}else line=next;}lines.push(line)}}wrap();while((lines.length>3||lines.some(l=>ctx.measureText(l).width>930))&&size>20){size-=2;wrap()}const start=pos===0?30:1024-30-lines.length*size*1.05;ctx.lineWidth=Math.max(3,size*.075);lines.forEach((l,i)=>{ctx.strokeText(l,512,start+i*size*1.05,940);ctx.fillText(l,512,start+i*size*1.05,940)})}}
 draw(ctx,s,only){ctx.clearRect(0,0,1024,1024);if(only==='background'){if(!s.transparent)this.background(ctx,s.background);return}if(only==='meme'){this.text(ctx,s);return}if(only==='fur'){ctx.drawImage(this.head(s.colors,s.headwear),0,0);return}if(only==='outfit'){ctx.drawImage(this.body(s),0,0);return}if(only){this.asset(ctx,s[only],s);return}if(!s.transparent)this.background(ctx,s.background);ctx.drawImage(this.body(s),0,0);ctx.drawImage(this.head(s.colors,s.headwear),0,0);this.asset(ctx,s.neck,s);this.asset(ctx,s.headwear,s);this.asset(ctx,s.eyewear,s);this.asset(ctx,s.prop,s);this.text(ctx,s)}
 thumbnail(ctx,cat,id,current){ctx.clearRect(0,0,220,180);const s={...defaults(),...current,top:'',bottom:''};s[cat]=id;if(cat==='background')s.transparent=false;if(cat==='fur')s.colors=palettes.find(x=>x.id===id);const c=this.create(1024,1024);this.draw(c.getContext('2d'),s);ctx.drawImage(c,0,0,1024,1024,20,0,180,180)}
}
root.BoboEngine={Renderer,categories,palettes,placement,anchors,assetSources,imageBackgrounds,tuckedEarHeadwear,defaults};if(typeof module!=='undefined')module.exports=root.BoboEngine;
})(typeof window==='undefined'?globalThis:window);
