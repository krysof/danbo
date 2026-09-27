import * as THREE from 'three';
import * as L from './upstream/src/world/layout.js';
import {createContext} from './upstream/src/core/ctx.js';
import {createSky} from './upstream/src/core/sky.js';
import {createRenderPipeline} from './upstream/src/core/renderer.js';
import {batchStatic} from './upstream/src/core/batch2.js';
import {createAudio} from './upstream/src/core/audio.js';
import {movement,PreviewControls} from './controls.js';

const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),locales=['zhs','zht','ja','en'];
const COPY={
 brand:['蛋宝世界','蛋寶世界','たまごのなかまたち','Little Egg Friends'],subtitle:['独立场景预览 · 不影响存档','獨立場景預覽 · 不影響存檔','独立した体験版 · セーブに影響なし','Scene preview · Saves unchanged'],
 eyebrow:['一段新的小旅行','一段新的小旅行','新しい、小さな旅','A LITTLE JOURNEY'],title:['樱花车站','櫻花車站','桜の駅へ','Sakura Station'],
 description:['跟着蛋宝，走进有电车经过的樱花小镇。沿商店街寻找三点星光，或去河岸吹吹风。','跟著蛋寶，走進有電車經過的櫻花小鎮。沿商店街尋找三點星光，或去河岸吹吹風。','電車が走る桜の町へ。なかまと商店街で3つの星あかりを探したり、川辺を散歩したり。','Take an egg friend into a blossom-filled railway town. Find three starlights along the shopping street, or wander down to the river.'],
 go:['开始散步 →','開始散步 →','散歩に出かける →','Take a stroll →'],retry:['重新加载','重新載入','再読み込み','Try again'],back:['返回游戏','返回遊戲','ゲームへ','Back to game'],
 notice:['画面与操作测试版，暂未接入联机、战斗及正式奖励。','畫面與操作測試版，暫未接入連線、戰鬥及正式獎勵。','映像・操作の試作です。オンライン・バトル・本編報酬は未対応。','Visual and controls prototype. Multiplayer, combat and main-game rewards are not connected.'],
 load:['正在布置樱花小镇','正在佈置櫻花小鎮','桜の町を準備中','Building the sakura town'],ready:['车站准备好了，出发吧。','車站準備好了，出發吧。','準備ができました。さあ出発！','The town is ready. Let’s go.'],failed:['载入失败，可重试或返回游戏。','載入失敗，可重試或返回遊戲。','読み込めません。再試行するかゲームへ戻れます。','Could not load. Retry or return to the game.'],
 task:['找回街上的星光 {n}/3','找回街上的星光 {n}/3','町の星あかりを集めよう {n}/3','Find the town’s starlights {n}/3'],done:['星光找齐了！去车站或河岸逛逛吧。','星光找齊了！去車站或河岸逛逛吧。','星あかりが集まった！駅や川辺を散歩しよう。','All starlights found! Explore the station or river.'],
 hint:['WASD / 左摇杆移动 · 拖动画面 / 右摇杆转镜头 · 空格 / A 跳跃','WASD / 左搖桿移動 · 拖動畫面 / 右搖桿轉鏡頭 · 空白鍵 / A 跳躍','WASD / 左スティック：移動 · ドラッグ / 右スティック：視点 · Space / A：ジャンプ','WASD / left stick: move · Drag / right stick: look · Space / A: jump'],
 touchHint:['左摇杆移动 · 拖动画面转镜头 · 右侧跳跃','左搖桿移動 · 拖動畫面轉鏡頭 · 右側跳躍','左パッド：移動 · 画面ドラッグ：視点 · 右ボタン：ジャンプ','Left pad: move · Drag scene: look · Right button: jump'],
 street:['商店街','商店街','商店街','Street'],plaza:['樱花广场','櫻花廣場','桜の広場','Plaza'],station:['车站','車站','駅','Station'],river:['河岸','河岸','川辺','River'],portrait:['看蛋宝','看蛋寶','なかまを見る','Face view'],jump:['跳','跳','ジャンプ','Jump'],
 mute:['声音：开','聲音：開','音：オン','Sound on'],unmute:['声音：关','聲音：關','音：オフ','Sound off'],
 balanced:['均衡画质','均衡畫質','標準画質','Balanced'],high:['精细画质','精細畫質','高画質','High'],low:['流畅画质','流暢畫質','軽量画質','Light'],quality:['画质','畫質','画質','Quality'],stick:['移动摇杆','移動搖桿','移動パッド','Movement pad']
};
let lang;try{lang=localStorage.getItem('danbo_sakura_preview_language')||localStorage.getItem('danbo_lang');}catch(_){}
if(!locales.includes(lang))lang=navigator.language.startsWith('ja')?'ja':navigator.language.startsWith('zh')?(/TW|HK|Hant/i.test(navigator.language)?'zht':'zhs'):'en';
if(locales.includes(params.get('lang')))lang=params.get('lang');
const t=key=>COPY[key]?.[locales.indexOf(lang)]||key;
const touch=matchMedia('(pointer:coarse)').matches,quality={name:'medium',petals:touch ? .20 : .4,pixelRatio:1,msaa:0,shadowMap:touch?1024:2048,shadowSize:55};
let mode=params.get('quality')||(touch?'low':'balanced');if(!['low','balanced','high'].includes(mode))mode='balanced';
let started=false,ready=false,failed=false,count=0,progress=0,sim=18,last=0,frame=0,disposed=false,raf=0,hudElapsed=0;
const errors=[],buildTimes={},stars=[],friends=[],cameraDesired=new THREE.Vector3(),cameraTarget=new THREE.Vector3(),cameraSample=new THREE.Vector3(),starTarget=new THREE.Vector3();
// The upstream first-person collision set does not include canopy ceilings.
// These camera-only proxies keep the third-person orbit below platform roofs.
const cameraRoofs=[[-7,40,-39,-35.4,4.2,4.75],[-7,40,-50.6,-47,4.2,4.75],[-4.6,12.6,-36.2,-24.4,4.65,7.8]];
let renderer,scene,camera,ctx,sky,pipeline,audio,controls,hero;
const state={pos:new THREE.Vector3(1.6,0,29),yaw:0,pitch:.36,vy:0,grounded:true,speed:0,walkPhase:0};
const spots={street:[1.6,29,0],plaza:[4,-17,0],station:[19,-37.5,Math.PI/2,.14],river:[-20,-93,-Math.PI/2]};
function translate(){
 document.documentElement.lang={zhs:'zh-CN',zht:'zh-TW',ja:'ja',en:'en'}[lang];document.title=t('brand')+' · '+t('title');
 for(const key of ['brand','subtitle','eyebrow','title','description','go','retry','back','notice','portrait','jump'])$(key).textContent=t(key);
 for(const b of document.querySelectorAll('[data-spot]'))b.textContent=t(b.dataset.spot);
 for(const o of $('quality').options)o.textContent=t(o.value);
 $('quality').setAttribute('aria-label',t('quality'));$('stick').setAttribute('aria-label',t('stick'));$('scene').setAttribute('aria-label',t('title'));
 $('locale').value=lang;$('quality').value=mode;$('mute').textContent=t(audio?.muted?'unmute':'mute');$('hint').textContent=t(touch?'touchHint':'hint');
 $('task').textContent=count===3?t('done'):t('task').replace('{n}',count);
 $('load-status').textContent=failed?t('failed'):ready?t('ready'):t('load')+' · '+Math.round(progress*100)+'%';
}
$('locale').onchange=()=>{lang=$('locale').value;try{localStorage.setItem('danbo_sakura_preview_language',lang);}catch(_){}translate();};
$('retry').onclick=()=>location.reload();
function updateProgress(value){progress=value;$('progress').value=value;translate();}
function resize(){if(!renderer||!pipeline)return;const w=innerWidth,h=innerHeight,budget=mode==='high'?2200000:mode==='low'?800000:1250000,cap=mode==='high'?1.5:mode==='low'?1.1:1;
 const ratio=Math.max(.45,Math.min(devicePixelRatio||1,cap,Math.sqrt(budget/(w*h))));quality.pixelRatio=ratio;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setPixelRatio(mode==='low'?ratio:1);renderer.setSize(w,h,false);pipeline.setSize(w,h,ratio);ctx.wires.setResolution(w*ratio,h*ratio);
}
function setQuality(next){if(!['low','balanced','high'].includes(next))return;mode=next;resize();translate();}
$('quality').onchange=()=>setQuality($('quality').value);
addEventListener('resize',resize);
function animateEgg(mesh,speed,time,phase){
 const ud=mesh.userData,walk=Math.min(1,speed/3);ud.body.position.y=.79+Math.abs(Math.sin(phase*2))*.055*walk;
 ud.body.rotation.z=Math.sin(phase)*.07*walk;
 ud.feet.forEach((foot,i)=>{foot.position.y=.105+Math.max(0,Math.sin(phase+i*Math.PI))*.12*walk;foot.rotation.x=Math.sin(phase+i*Math.PI)*.3*walk;});
 ud._decorArms.forEach((arm,i)=>arm.rotation.x=Math.sin(phase+i*Math.PI)*.4*walk);
 window._animateCuteCharacterDetails(mesh,time);
}
function egg(color,accent,type){const model=window.createEggMesh(color,accent,type,'cinematic',false,false);model.scale.setScalar(.94);model.traverse(o=>{if(o.isMesh&&(o.material.transparent||o.material.side===THREE.BackSide))o.layers.set(1);});ctx.add(model);return model;}
function place(name){if(!hero)return;const p=spots[name]||spots.street;state.pos.set(p[0],ctx.physics.groundHeight(p[0],p[1],10),p[1]);ctx.physics.resolve(state.pos,.43,state.pos.y,1.5);state.yaw=p[2];state.pitch=p[3]??.36;state.vy=0;state.speed=0;state.grounded=true;hero.rotation.y=0;hero.position.copy(state.pos);controls?.release();updateCamera(1,true);}
for(const b of document.querySelectorAll('[data-spot]'))b.onclick=()=>{place(b.dataset.spot);b.blur();};
function portrait(){state.yaw=hero.rotation.y;state.pitch=.25;}
$('portrait').onclick=()=>{portrait();$('portrait').blur();};
function start(){if(!ready||started)return;started=true;$('gate').hidden=true;$('hud').hidden=false;document.activeElement?.blur();controls.release();try{audio.start();}catch(e){console.warn('Preview audio unavailable',e);}}
$('go').onclick=start;
$('mute').onclick=()=>{if(!audio)return;audio.muted=!audio.muted;if(!audio.muted&&started)audio.start();translate();};
function updateCamera(dt,snap=false){
 cameraTarget.copy(state.pos);cameraTarget.y+=.9;const distance=6.8,cos=Math.cos(state.pitch);
 cameraDesired.set(Math.sin(state.yaw)*distance*cos,Math.sin(state.pitch)*distance,Math.cos(state.yaw)*distance*cos).add(cameraTarget);
 // Query coarse collision shapes, not millions of render triangles. Pull the
 // camera forward before a wall; don't bob or rotate it with footstep animation.
 for(let i=1;i<=24;i++){const a=i/24,p=cameraSample.copy(cameraTarget).lerp(cameraDesired,a),q={x:p.x,z:p.z};ctx.physics.resolve(q,.20,p.y-.2,.4);const roof=cameraRoofs.some(b=>p.x>b[0]-.2&&p.x<b[1]+.2&&p.z>b[2]-.2&&p.z<b[3]+.2&&p.y>b[4]-.2&&p.y<b[5]+.2);if(roof||Math.hypot(q.x-p.x,q.z-p.z)>.035){cameraDesired.lerp(cameraTarget,1-Math.max(.14,(i-1)/24));break;}}
 const contracting=cameraDesired.distanceToSquared(cameraTarget)<camera.position.distanceToSquared(cameraTarget)-.1;
 camera.position.lerp(cameraDesired,snap||contracting?1:1-Math.exp(-dt*12));camera.lookAt(cameraTarget);camera.updateMatrixWorld();
}
function updatePlayer(dt,input){
 state.yaw-=input.lookX*.004;state.pitch=THREE.MathUtils.clamp(state.pitch+input.lookY*.003,.05,1.1);
 const dir=movement(input.x,input.f,state.yaw),speed=(input.run?6:3.8),dx=dir.x*speed*dt,dz=dir.z*speed*dt,steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.12));
 const oldX=state.pos.x,oldZ=state.pos.z,p={x:oldX,z:oldZ};
 for(let i=0;i<steps;i++){p.x+=dx/steps;p.z+=dz/steps;ctx.physics.resolve(p,.43,state.pos.y,1.5);}
 state.pos.x=THREE.MathUtils.clamp(p.x,L.WORLD.play.x0,L.WORLD.play.x1);state.pos.z=THREE.MathUtils.clamp(p.z,L.WORLD.play.z0,L.WORLD.play.z1);
 const ground=ctx.physics.groundHeight(state.pos.x,state.pos.z,state.pos.y);if(state.pos.y>ground+.06)state.grounded=false;if(input.jump&&state.grounded){state.vy=4.6;state.grounded=false;}
 state.vy-=12*dt;state.pos.y+=state.vy*dt;
 if(state.pos.y<=ground){state.pos.y=ground;state.vy=0;state.grounded=true;}
 state.speed=dt>0?Math.hypot(state.pos.x-oldX,state.pos.z-oldZ)/dt:0;
 if(Math.hypot(dir.x,dir.z)>.05){const target=Math.atan2(dir.x,dir.z),diff=Math.atan2(Math.sin(target-hero.rotation.y),Math.cos(target-hero.rotation.y));hero.rotation.y+=diff*(1-Math.exp(-dt*14));}
 state.walkPhase+=state.speed*dt*4;hero.position.copy(state.pos);animateEgg(hero,state.speed,sim,state.walkPhase);updateCamera(dt);
 starTarget.copy(state.pos);starTarget.y+=1;for(const star of stars){if(star.visible&&star.position.distanceTo(starTarget)<1.25){star.visible=false;count++;translate();}}
}
function makeStars(){
 const shape=new THREE.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?.18:.4,x=Math.cos(a)*r,y=Math.sin(a)*r;if(i)shape.lineTo(x,y);else shape.moveTo(x,y);}shape.closePath();
 const g=new THREE.ExtrudeGeometry(shape,{depth:.10,bevelEnabled:true,bevelThickness:.035,bevelSize:.035,bevelSegments:1,steps:1}),mat=ctx.mat.emissive('#ffd66e',1.4);
 for(const [x,z]of [[1.6,23],[.4,5],[4,-13]]){const mesh=new THREE.Mesh(g,mat);mesh.position.set(x,ctx.physics.groundHeight(x,z,10)+1.15,z);mesh.userData.baseY=mesh.position.y;ctx.add(mesh);stars.push(mesh);}
}
function render(){
 renderer.info.reset();if(mode==='low'){renderer.setRenderTarget(null);renderer.shadowMap.autoUpdate=false;if(frame%4===0)renderer.shadowMap.needsUpdate=true;camera.layers.enableAll();renderer.setClearColor(0xdde9f3,1);renderer.render(scene,camera);}else pipeline.render(scene,camera,sunDir,sim);
}
const sunDir=new THREE.Vector3(...L.SUN_DIR).normalize();
function loop(now){if(disposed||failed)return;raf=requestAnimationFrame(loop);const dt=document.hidden?0:Math.min(.05,(now-last)/1000||0);last=now;if(document.hidden)return;frame++;sim+=dt;try{
 const input=controls.read(dt);ctx.physics.refreshDynamic();if(started)updatePlayer(dt,input);
 ctx.player.position.copy(state.pos);ctx.time=sim;ctx.shared.uTime.value=sim;ctx.shared.uGust.value=.5+.28*Math.sin(sim*.37);
 for(const fn of ctx._updates)fn(dt,sim);
 for(const [i,f]of friends.entries()){const angle=sim*.15+i*2.2;f.mesh.rotation.y=f.baseRotation+Math.sin(angle)*.16;animateEgg(f.mesh,0,sim,angle);}
 for(const s of stars)if(s.visible){s.rotation.y=sim*.65;s.position.y=s.userData.baseY+Math.sin(sim*2)*.13;}
 audio.update(camera,dt);sky.update(sim,camera);render();hudElapsed+=dt;
 if(hudElapsed>.5){hudElapsed=0;const info=renderer.info.render;$('stats').textContent=`${mode} · ${info.calls} calls · ${(info.triangles/1e6).toFixed(2)}M tris`;}
 }catch(e){fail(e);}
}
async function loadMascot(){
 window.THREE=THREE;window.DANBO_VISUAL_QUALITY={high:false,low:mode==='low'};
 // Reuse the real character geometry, but use the station's shared toon ramp
 // for a consistent look. Main-game PBR material helpers are not imported.
 const material=(color,opts={})=>ctx.mat.toon(color,{vertexColors:!!opts.vertexColors,transparent:!!opts.transparent,opacity:opts.opacity??1,side:opts.side===THREE.DoubleSide?'double':'front',emissive:opts.emissive,emissiveIntensity:opts.emissiveIntensity??0,paint:0});
 window.softPBR=material;window.toon=material;
 await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='../../js/entity.js?v=20260927.1';script.onload=resolve;script.onerror=()=>reject(Error('Mascot model unavailable'));document.head.appendChild(script);});
 hero=egg(0xFFFDF2,0xEF4A5B,'egg');
 for(const [x,z,color,accent,type,rotation]of [[-2,10,0xBFE8A0,0x8FD16A,'bull',.7],[7,-12,0xD6F5FF,0x9FE6F5,'cat',-1.2],[12,-37,0xFFA040,0xFF7A1A,'cockroach',1.6]]){const mesh=egg(color,accent,type);mesh.position.set(x,ctx.physics.groundHeight(x,z,10),z);friends.push({mesh,baseRotation:rotation});ctx.physics.addCylinder(x,z,.55,mesh.position.y,mesh.position.y+1.65);}
}
async function build(){
 renderer=new THREE.WebGLRenderer({canvas:$('scene'),antialias:false,powerPreference:'high-performance',stencil:false});$('scene').addEventListener('webglcontextlost',e=>{e.preventDefault();fail(Error('WebGL context lost'));});renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;renderer.info.autoReset=false;
 scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(52,innerWidth/innerHeight,.12,1400);audio=createAudio();sky=createSky(scene,sunDir,quality);ctx=createContext({scene,camera,renderer,audio,quality,sunDir});ctx.sky=sky;pipeline=createRenderPipeline(renderer,quality);pipeline.compMat.uniforms.uBloom.value=.20;pipeline.compMat.uniforms.uGlow.value=.09;pipeline.compMat.uniforms.uOutline.value=.6;
 resize();
 const modules=['environment','street','poles','railway','station','plaza','shopsA','houses','sakura','trains','crossing','props','petals'];
 for(let i=0;i<modules.length;i++){updateProgress(i/(modules.length+3));await new Promise(r=>setTimeout(r,20));const name=modules[i],begin=performance.now();const m=await import('./upstream/src/world/'+name+'.js');await m.build(ctx);buildTimes[name]=Math.round(performance.now()-begin);}
 const wire=ctx.wires.build();if(wire)scene.add(wire);ctx.wires.setResolution(innerWidth*quality.pixelRatio,innerHeight*quality.pixelRatio);
 updateProgress(.86);await new Promise(r=>setTimeout(r,20));const batch=batchStatic(ctx.staticRoot,{mat:ctx.mat,nearCell:32,farCell:160});
 updateProgress(.92);await new Promise(r=>setTimeout(r,20));await loadMascot();makeStars();
 controls=new PreviewControls({canvas:$('scene'),stick:$('stick'),knob:$('knob'),jump:$('jump'),start,reset:()=>place('street'),portrait,isStarted:()=>started});
 place('street');sky.update(sim,camera);if(renderer.compileAsync)await renderer.compileAsync(scene,camera);render();ready=true;updateProgress(1);$('go').disabled=false;$('go').focus();
 window.DANBO_SAKURA_PREVIEW={get ready(){return ready;},get started(){return started;},get count(){return count;},get mode(){return mode;},get position(){return state.pos.toArray();},scene,camera,renderer,ctx,hero,controls,stars,place,start,setQuality,errors,buildTimes,batch,revision:THREE.REVISION};
 if(params.has('stats'))$('stats').hidden=false;last=performance.now();raf=requestAnimationFrame(loop);
}
function fail(error){failed=true;controls?.release();cancelAnimationFrame(raf);if(audio)audio.muted=true;errors.push(String(error));console.error('[Sakura preview]',error);translate();$('gate').hidden=false;$('hud').hidden=true;$('retry').hidden=false;$('go').hidden=true;}
addEventListener('pagehide',e=>{controls?.release();if(e.persisted)return;disposed=true;cancelAnimationFrame(raf);controls?.dispose();if(audio)audio.muted=true;renderer?.dispose();});
translate();build().catch(fail);
