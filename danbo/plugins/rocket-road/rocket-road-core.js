// rocket-road-core.js — Danbo Rocket Road plugin
// 3D presentation with fixed-step arcade rules shared with server replay verification.
(function(){
    'use strict';

    var PLAYER_Z=-8.5;
    var ROAD_SEG_LEN=8;
    var BUILD=2026091501;
    // Private to this isolated scene: never dispose the main world's cached assets.
    var visualAssets=null;
    function ownGeometry(g){visualAssets.geometries.add(g);return g;}
    function geometry(key,create){return visualAssets.geometryCache[key]||(visualAssets.geometryCache[key]=ownGeometry(create()));}
    function sphere(){return geometry('sphere',function(){return new THREE.SphereGeometry(1,16,12);});}
    function roundedBox(w,h,d){
        var radius=Math.min(w,h,d)*0.22,key=['round',w,h,d].join(':');
        return geometry(key,function(){
            var g=new THREE.BoxGeometry(w,h,d,3,3,3),p=g.attributes.position,v=new THREE.Vector3(),c=new THREE.Vector3();
            for(var i=0;i<p.count;i++){
                v.fromBufferAttribute(p,i);c.set(clamp(v.x,-w/2+radius,w/2-radius),clamp(v.y,-h/2+radius,h/2-radius),clamp(v.z,-d/2+radius,d/2-radius));
                v.sub(c).normalize().multiplyScalar(radius).add(c);p.setXYZ(i,v.x,v.y,v.z);
            }
            g.computeVertexNormals();return g;
        });
    }

    function api(){return window.DANBO_MINIGAME_WASM&&window.DANBO_MINIGAME_WASM.rocketRoad;}
    function n(v,d){v=Number(v);return isFinite(v)?v:(d||0);}
    function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
    function smooth(t){t=clamp(t,0,1);return t*t*(3-2*t);}
    function roadCenterAt(distance){return window.DanboRocketRules.roadCenterAt(distance);}
    function fmt3(v){v=Math.max(0,Math.floor(n(v)));return (v<10?'00':(v<100?'0':''))+v;}
    var STAGE_LENGTH=3300, STAGE_COUNT=6, TOTAL_LENGTH=STAGE_LENGTH*STAGE_COUNT;
    var STAGES=[
        {name:'STAGE 1 · 绿城郊外',road:0xaabbb5,fieldA:0x79ad88,fieldB:0x84b68e,edge:0xf5e9cb,sky:0xc8e5da,decor:[1,0,4,2,3]},
        {name:'STAGE 2 · 森林弯道',road:0xb3b5a1,fieldA:0x629778,fieldB:0x6da382,edge:0xe9e7c8,sky:0xbad9d1,decor:[0,0,0,4,7]},
        {name:'STAGE 3 · 港湾高架',road:0xc8d3d2,fieldA:0x85cbd5,fieldB:0x8cd0d8,edge:0xfff0d0,sky:0xc6e3e9,decor:[6,6,1,2,5]},
        {name:'STAGE 4 · 海岸公路',road:0xdcd0b6,fieldA:0xe7d4a8,fieldB:0xeedbb5,edge:0xfff3d7,sky:0xcfe5e7,decor:[8,8,3,4,0]},
        {name:'STAGE 5 · 峡谷荒原',road:0xd4b69d,fieldA:0xc9a78b,fieldB:0xd2b295,edge:0xf8dbbb,sky:0xf0d8c9,decor:[9,9,0,2,4]},
        {name:'STAGE 6 · 田园冲刺',road:0xd3ccae,fieldA:0xbdcc96,fieldB:0xc5d39e,edge:0xffedc1,sky:0xdce7cb,decor:[10,10,0,5,1]}
    ];
    function stageIndexAt(distance){return Math.max(0,Math.min(STAGE_COUNT-1,Math.floor(clamp(n(distance),0,TOTAL_LENGTH-0.001)/STAGE_LENGTH)));}
    function stageLocal(distance){var d=clamp(n(distance),0,TOTAL_LENGTH);return d-stageIndexAt(d)*STAGE_LENGTH;}
    function mergeT(local){return smooth(n(local)/85);}
    function splitActive(stage,local){return (stage|0)===0&&n(local)<135;}
    function driveCenterAt(local,stage){return window.DanboRocketRules.driveCenterAt(local,stage);}
    function sideRoadCenterAt(local,stage){
        local=n(local);stage=stage|0;
        var base=roadCenterAt(stage*STAGE_LENGTH+local);
        return splitActive(stage,local)?base-3.05*(1-mergeT(local)):base;
    }
    function effectiveRoadWidth(width,local,stage){return window.DanboRocketRules.effectiveRoadWidth(width,local,stage);}
    function sideRoadWidth(local,stage){
        local=n(local);stage=stage|0;
        if(!splitActive(stage,local))return 0;
        return 5.15*(1-smooth((local-45)/65));
    }
    function roadOuterBounds(local,stage,width){
        var cx=driveCenterAt(local,stage), half=n(width,10)*0.5, minX=cx-half, maxX=cx+half, bw=sideRoadWidth(local,stage);
        if(bw>0.08){
            var sc=sideRoadCenterAt(local,stage), bh=bw*0.5;
            minX=Math.min(minX,sc-bh);maxX=Math.max(maxX,sc+bh);
        }
        return {min:minX,max:maxX,center:(minX+maxX)*0.5,width:maxX-minX};
    }
    function esc(s){return String(s===undefined||s===null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
    function mat(color,opts){
        opts=opts||{};var roughness=opts.roughness===undefined?0.64:opts.roughness,metalness=opts.metalness||0,emissive=opts.emissive||0,intensity=opts.emissiveIntensity||0;
        var key=[color,roughness,metalness,emissive,intensity].join(':');
        if(!visualAssets.materialCache[key]){var m=new THREE.MeshStandardMaterial({color:color,roughness:roughness,metalness:metalness,emissive:emissive,emissiveIntensity:intensity});visualAssets.materialCache[key]=m;visualAssets.materials.add(m);}
        return visualAssets.materialCache[key];
    }
    function colorFromCharacter(ch){var c=ch&&ch.style&&ch.style.color;if(!(typeof c==='number'&&isFinite(c)))c=ch&&ch.color;return (typeof c==='number'&&isFinite(c))?c:0x80EA7A;}
    function accentFromCharacter(ch){var c=ch&&ch.style&&ch.style.accent;if(!(typeof c==='number'&&isFinite(c)))c=ch&&ch.accent;return (typeof c==='number'&&isFinite(c))?c:0xffe15d;}
    function keyFromCharacter(ch){return String((ch&&(ch.key||ch.name||ch.id))||'egg').toLowerCase();}
    function charByIndex(i){
        var defs=(typeof CHAR_DEFS!=='undefined'&&CHAR_DEFS)||[];
        if(!defs.length)return {name:'egg',sf2:'Danbo',color:0xf5f5f0,accent:0xcc2222};
        i=Math.abs(i|0)%defs.length;return defs[i]||defs[0];
    }
    function addBox(parent,w,h,d,color,x,y,z){var m=new THREE.Mesh(roundedBox(w,h,d),mat(color));m.position.set(x||0,y||0,z||0);parent.add(m);return m;}
    function addSoft(parent,color,x,y,z,sx,sy,sz){var m=new THREE.Mesh(sphere(),mat(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;}
    function addWheel(parent,x,z){
        var geo=geometry('wheel',function(){return new THREE.CylinderGeometry(0.30,0.30,0.30,16);}),mesh=new THREE.Mesh(geo,mat(0x3b5360,{roughness:0.86}));mesh.rotation.z=Math.PI/2;mesh.position.set(x,0.31,z);parent.add(mesh);
        var hub=new THREE.Mesh(geometry('hub',function(){return new THREE.CylinderGeometry(0.14,0.14,0.025,12);}),mat(0xffefcc,{roughness:0.38}));hub.rotation.z=Math.PI/2;hub.position.set(x+(x<0?-0.16:0.16),0.31,z);parent.add(hub);return mesh;
    }
    function addCone(parent,r,h,color,x,y,z,rx,rz){var m=new THREE.Mesh(new THREE.ConeGeometry(r,h,10),mat(color));m.position.set(x||0,y||0,z||0);m.rotation.x=rx||0;m.rotation.z=rz||0;m.castShadow=true;parent.add(m);return m;}
    function addMiniDriver(parent,ch,scale,x,y,z,opts){
        var g=new THREE.Group(),color=colorFromCharacter(ch),accent=accentFromCharacter(ch),key=keyFromCharacter(ch);
        g.name='rr-egg-driver';g.userData.characterKey=key;g.position.set(x||0,y||0,z||0);g.scale.setScalar(scale||1);
        var shell=geometry('egg-shell',function(){
            var geo=new THREE.SphereGeometry(0.48,20,16),p=geo.attributes.position;
            for(var i=0;i<p.count;i++){var ny=p.getY(i)/0.48,taper=1.14-(ny+1)*0.13;p.setXYZ(i,p.getX(i)*taper,p.getY(i)*1.16,p.getZ(i)*taper*0.94);}
            geo.computeVertexNormals();return geo;
        });
        var body=new THREE.Mesh(shell,mat(color,{roughness:0.48}));body.position.y=0.28;g.add(body);
        var iris={egg:0x647fce,bull:0x4f916a,cat:0x4b9dd6,rooster:0x687bcb,dog:0xa15e92,monkey:0x5c69b7,bear:0x5d708d,cockroach:0x765fa9}[key]||0x647fce;
        [-1,1].forEach(function(side){
            addSoft(g,0xfffdf5,side*0.17,0.39,-0.413,0.095,0.15,0.025);
            addSoft(g,iris,side*0.17,0.39,-0.437,0.067,0.108,0.016);
            addSoft(g,0x29444e,side*0.17,0.375,-0.452,0.038,0.069,0.009);
            addSoft(g,0xffffff,side*0.17-0.018,0.435,-0.46,0.024,0.032,0.009);
            addSoft(g,0xf3a8b1,side*0.32,0.20,-0.347,0.083,0.041,0.018);
            addSoft(g,color,side*0.43,-0.01,-0.10,0.14,0.18,0.14);
        });
        var smile=new THREE.Mesh(geometry('smile',function(){return new THREE.TorusGeometry(0.12,0.015,5,12,Math.PI*0.72);}),mat(0x705858));
        smile.rotation.z=Math.PI*1.14;smile.position.set(0,0.21,-0.446);g.add(smile);
        if(key==='bull'){
            g.userData.motif='leaves';
            [-1,0,1].forEach(function(i){var leaf=addSoft(g,i?0x64b57c:0x95ce83,i*0.14,0.84+(i===0?0.06:0),0,0.18,0.05,0.08);leaf.rotation.z=i*0.35;});
            addSoft(g,0xf6c66e,0.04,0.88,-0.09,0.05,0.055,0.05);
        }else if(key==='cat'){
            g.userData.motif='crystal';[-1,1].forEach(function(i){addSoft(g,color,i*0.34,0.73,0,0.13,0.15,0.08);addSoft(g,0xf5eafa,i*0.34,0.73,-0.07,0.08,0.095,0.025);});
        }else if(key==='rooster'){
            g.userData.motif='halo';var halo=new THREE.Mesh(geometry('halo',function(){return new THREE.TorusGeometry(0.23,0.027,6,24);}),mat(0xffd577));halo.rotation.x=Math.PI/2;halo.position.y=0.97;g.add(halo);
            [-1,1].forEach(function(i){var wing=addSoft(g,0xfffdf2,i*0.50,0.27,0.16,0.11,0.29,0.055);wing.rotation.z=-i*0.62;});
        }else if(key==='dog'){
            g.userData.motif='ribbons';[-1,1].forEach(function(i){var bow=addSoft(g,0xf7adbb,i*0.44,0.60,0,0.25,0.105,0.07);bow.rotation.z=i*0.25;});
        }else if(key==='monkey'){
            g.userData.motif='star';var starGeo=geometry('star',function(){var shape=new THREE.Shape();for(var i=0;i<10;i++){var a=i*Math.PI/5+Math.PI/2,r=i%2?0.075:0.155;if(i===0)shape.moveTo(Math.cos(a)*r,Math.sin(a)*r);else shape.lineTo(Math.cos(a)*r,Math.sin(a)*r);}shape.closePath();return new THREE.ShapeGeometry(shape);});
            var star=new THREE.Mesh(starGeo,mat(0xffd675));star.rotation.y=Math.PI;star.position.set(0,0.70,-0.28);g.add(star);
        }else if(key==='bear'){
            g.userData.motif='pebbles';[-1,0,1].forEach(function(i){addSoft(g,i?0xb19c84:0xd6c2a4,i*0.14,0.80+(i===0?0.06:0),0,0.11,0.095,0.10);});
        }else if(key==='cockroach'){
            g.userData.motif='wind';[-1,1].forEach(function(i){var feather=addSoft(g,0xffe8b8,i*0.28,0.79,0.02,0.08,0.22,0.06);feather.rotation.z=-i*0.55;});
        }else{
            g.userData.motif='flower';for(var i=0;i<5;i++){var a=i*Math.PI*2/5;addSoft(g,0xf5a9bb,-0.26+Math.cos(a)*0.11,0.70+Math.sin(a)*0.11,-0.23,0.08,0.08,0.035);}
            addSoft(g,0xffdb7e,-0.26,0.70,-0.27,0.075,0.075,0.035);
        }
        parent.add(g);return g;
    }

    function addContactShadow(parent,w,d){
        if(!visualAssets.shadowMaterial){
            var c=document.createElement('canvas');c.width=c.height=64;var x=c.getContext('2d'),grad=x.createRadialGradient(32,32,3,32,32,31);
            grad.addColorStop(0,'rgba(35,65,67,0.28)');grad.addColorStop(0.5,'rgba(35,65,67,0.16)');grad.addColorStop(1,'rgba(35,65,67,0)');x.fillStyle=grad;x.fillRect(0,0,64,64);
            var tex=new THREE.CanvasTexture(c);visualAssets.textures.add(tex);
            visualAssets.shadowMaterial=new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,toneMapped:false});visualAssets.materials.add(visualAssets.shadowMaterial);
        }
        var shadow=new THREE.Mesh(geometry('shadow-plane',function(){return new THREE.PlaneGeometry(1,1);}),visualAssets.shadowMaterial);
        shadow.rotation.x=-Math.PI/2;shadow.position.y=0.065;shadow.scale.set(w,d,1);parent.add(shadow);return shadow;
    }

    // Merge static scenery by material, retaining shared template buffers. No
    // per-frame geometry allocation or main-world geometry/material ownership.
    function batchDecor(group){
        var buckets=new Map();group.updateMatrixWorld(true);
        group.traverse(function(o){if(!o.isMesh)return;var geo=o.geometry;visualAssets.geometries.add(geo);visualAssets.materials.add(o.material);
            var b=buckets.get(o.material);if(!b){b={p:[],n:[],uv:[]};buckets.set(o.material,b);}
            var p=geo.attributes.position,norm=geo.attributes.normal,uv=geo.attributes.uv,index=geo.index,v=new THREE.Vector3(),nv=new THREE.Vector3(),nm=new THREE.Matrix3().getNormalMatrix(o.matrixWorld);
            for(var i=0;i<(index?index.count:p.count);i++){var j=index?index.getX(i):i;v.fromBufferAttribute(p,j).applyMatrix4(o.matrixWorld);nv.fromBufferAttribute(norm,j).applyNormalMatrix(nm);b.p.push(v.x,v.y,v.z);b.n.push(nv.x,nv.y,nv.z);b.uv.push(uv?uv.getX(j):0,uv?uv.getY(j):0);}
        });
        var result=new THREE.Group();buckets.forEach(function(b,m){var geo=ownGeometry(new THREE.BufferGeometry());geo.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(b.uv,2));geo.computeBoundingSphere();result.add(new THREE.Mesh(geo,m));});return result;
    }

    var Race=window.DanboRocketRules;
    if(!Race)throw new Error('Rocket Road rules missing');
    var fallback=Race.base;
    function rules(){return fallback;}

    function DanboRocketRoad(ctx){
        this.assets={geometries:new Set(),materials:new Set(),textures:new Set(),geometryCache:{},materialCache:{}};visualAssets=this.assets;
        this.progress=0;this.elapsed=0;this.carX=0;this.carVx=0;this.speed=0;this.spin=0;this.fuel=100;this.scoresPage=0;
        this.ctx=ctx;this.ch=ctx.character||{};this.R=rules();this.stageId=0;this.unlockedStage=this.getUnlockedStage();this.state='title';this.keys={};this.touch={};this.objects={};this.hitEvents={};this.eventCache=[];this.running=true;this.last=performance.now();this.menuIndex=0;this.toastTimer=0;
        this.root=document.createElement('div');this.root.className='rr-root';this.root.innerHTML=this.html();ctx.mount.appendChild(this.root);
        this.canvas=this.root.querySelector('canvas');this.panel=this.root.querySelector('.rr-panel');this.hud=this.root.querySelector('.rr-hud');this.toast=this.root.querySelector('.rr-toast');this.touchLayer=this.root.querySelector('.rr-touch');this.steerPad=this.root.querySelector('[data-steer-pad]');this.steerKnob=this.root.querySelector('.rr-steer-knob');this.countdownEl=this.root.querySelector('.rr-countdown');this.stageEl=this.root.querySelector('.rr-stage-banner');this.startRankEl=this.root.querySelector('.rr-start-rank');
        this.init3D();this.bind();this.showTitle();
        if(ctx.net)ctx.net.send('minigame.ready',{pluginId:ctx.pluginId,characterId:this.ch.id,build:BUILD});
        var self=this;this.raf=requestAnimationFrame(function(t){self.loop(t);});
    }

    DanboRocketRoad.prototype.html=function(){
        return "<style>"+
        ".rr-root{position:absolute;inset:0;overflow:hidden;background:#c8e5da;font-family:system-ui,-apple-system,\"Segoe UI\",sans-serif;color:#244754;touch-action:none;--rr-cream:#fff8e7;--rr-mint:#74cdb7;--rr-coral:#ed997f}"+
        ".rr-root *{box-sizing:border-box}.rr-root canvas{position:absolute;inset:0;width:100%;height:100%;display:block}"+
        ".rr-panel{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(92%,540px);padding:24px;border:1px solid #fffdf2;border-radius:28px;background:linear-gradient(150deg,rgba(255,252,239,.97),rgba(222,244,233,.95));box-shadow:0 20px 64px #204d4d24,inset 0 1px 0 #fff;text-align:center;display:grid;grid-template-columns:1fr 1fr;gap:10px;max-height:calc(100% - 24px - env(safe-area-inset-top) - env(safe-area-inset-bottom))}"+
        ".rr-panel>h1,.rr-panel>.rr-sub,.rr-panel>.rr-small,.rr-panel>.rr-list{grid-column:1/-1}.rr-title{font-size:clamp(22px,4vw,32px);font-weight:850;letter-spacing:.02em;color:#244754;margin:0;line-height:1.18}.rr-sub{font-size:13px;line-height:1.45;color:#577c7b;margin:0 0 4px}"+
        ".rr-menu-btn{display:block;width:100%;border:1px solid #b3d4c8;border-radius:17px;margin:0;padding:14px 12px;background:linear-gradient(150deg,#fffdf3,#e8f5ea);color:#244754;font:750 15px/1.3 system-ui,sans-serif;box-shadow:0 4px 10px #30564d0a;cursor:pointer;min-height:48px;transition:background .16s,box-shadow .16s}.rr-menu-btn[data-action=\"single\"],.rr-menu-btn[data-action=\"next-stage\"],.rr-menu-btn[data-action=\"retry\"]{background:linear-gradient(115deg,#83dcc5,#a9e0ce);border-color:#65bca7}"+
        ".rr-menu-btn:hover,.rr-menu-btn.rr-selected,.rr-root button:focus-visible{outline:3px solid #399b88;outline-offset:2px;box-shadow:0 5px 14px #27625b24}.rr-menu-btn[disabled]{opacity:.5;cursor:not-allowed;box-shadow:none;outline:none}.rr-small{font-size:11px;line-height:1.45;margin:0;color:#62817f}"+
        ".rr-hud{position:absolute;inset:0;display:none;pointer-events:none;font-variant-numeric:tabular-nums}.rr-dashboard{position:absolute;left:max(12px,env(safe-area-inset-left));right:max(62px,calc(env(safe-area-inset-right) + 52px));top:max(12px,env(safe-area-inset-top));display:flex;gap:8px;align-items:center}"+
        ".rr-stat{background:rgba(255,252,238,.93);border:1px solid #fffdf4;border-radius:16px;padding:8px 13px;box-shadow:0 4px 16px #224a4c12;min-width:62px}.rr-label{font-size:10px;color:#5d7b78;display:block;font-weight:650;line-height:1.2}.rr-value{font-size:20px;line-height:1.15;font-weight:850;color:#294f59}.rr-value small{font-size:10px;font-weight:600}.rr-fuel-stat{min-width:100px}.rr-meter{width:100%;height:6px;background:#d8e7d8;border-radius:9px;margin-top:6px;overflow:hidden}.rr-meter i{display:block;height:100%;width:100%;background:#55b69b;border-radius:9px}.rr-meter.rpm{display:none}"+
        ".rr-top-track{position:absolute;left:max(16px,env(safe-area-inset-left));right:max(16px,env(safe-area-inset-right));top:calc(max(12px,env(safe-area-inset-top)) + 68px);height:4px;background:#fffdf288;border-radius:8px;overflow:hidden}.rr-top-track em{display:block;height:100%;width:0;background:#e6ad5c;border-radius:8px}"+
        ".rr-top-exit{position:absolute;right:max(12px,env(safe-area-inset-right));top:max(12px,env(safe-area-inset-top));width:42px;height:42px;pointer-events:auto;border:1px solid #fffdf4;border-radius:50%;background:#fff8e7ec;color:#365d66;font:600 26px/1 system-ui;cursor:pointer}"+
        ".rr-countdown{position:absolute;left:50%;top:43%;transform:translate(-50%,-50%);display:none;pointer-events:none;font-size:clamp(64px,16vw,112px);font-weight:850;color:#fff9dc;text-shadow:0 4px 0 #d49976,0 12px 24px #2d62684d}.rr-stage-banner{position:absolute;left:50%;top:27%;transform:translate(-50%,-50%);display:none;pointer-events:none;max-width:90%;padding:10px 20px;border:1px solid #fff5d3;border-radius:20px;background:#244754e8;color:#fff8e7;font-size:clamp(13px,3vw,18px);font-weight:700;text-align:center}.rr-start-rank{display:none!important}"+
        ".rr-toast{position:absolute;left:50%;bottom:calc(max(24px,env(safe-area-inset-bottom)) + 114px);transform:translateX(-50%);padding:10px 16px;border:1px solid #b5d9cb;border-radius:18px;background:#fff8e7f2;color:#244754;font-size:14px;font-weight:700;display:none;pointer-events:none;max-width:90%;text-align:center}"+
        ".rr-touch{position:absolute;inset:0;display:none;pointer-events:none}.rr-steer-pad{position:absolute;left:max(16px,env(safe-area-inset-left));bottom:max(24px,env(safe-area-inset-bottom));width:90px;height:90px;border-radius:50%;border:2px solid #fff8e7b8;background:#fff8e738;box-shadow:inset 0 0 0 6px #fffdf218;pointer-events:auto;touch-action:none}.rr-steer-knob{position:absolute;left:50%;top:50%;width:42px;height:42px;margin:-21px;border-radius:50%;background:#fff8e7bc;border:1px solid #fffdf2;font-size:20px;display:flex;align-items:center;justify-content:center;color:#527d7b}"+
        ".rr-pedal{position:absolute;bottom:max(28px,env(safe-area-inset-bottom));width:76px;height:76px;border-radius:50%;border:2px solid #fff9e9c9;color:#244754;font:750 13px/1.2 system-ui,sans-serif;pointer-events:auto;touch-action:none;box-shadow:inset 0 0 0 5px #fff8e729}.rr-throttle{right:max(16px,env(safe-area-inset-right));background:#f5c892c7}.rr-brake{right:calc(max(16px,env(safe-area-inset-right)) + 84px);background:#a1dccfc7}.rr-pedal.rr-pressed{background:#fff4c7;box-shadow:0 0 0 4px #fff7df80}"+
        ".rr-list{margin:0;text-align:left;border-radius:16px;padding:12px 16px;line-height:1.55;background:#fffdf38c;font-size:13px;display:grid;grid-template-columns:1fr 1fr;gap:5px 12px;overflow-wrap:anywhere}.rr-score-list{grid-template-columns:1fr}.rr-score-list>div{display:flex;gap:8px;align-items:baseline;justify-content:space-between}.rr-score-list small{color:#698781}.rr-page-nav{grid-column:1/-1;display:flex;align-items:center;justify-content:center;gap:14px}.rr-page-nav button{width:44px;min-height:38px;padding:6px}"+
        "@media(max-width:560px){.rr-panel{padding:18px;gap:9px}.rr-menu-btn{font-size:13px;padding:12px 8px}.rr-stat{padding:8px;min-width:48px;border-radius:13px}.rr-dashboard{gap:5px}.rr-value{font-size:17px}.rr-fuel-stat{min-width:65px}.rr-label{font-size:9px}.rr-list{font-size:12px;padding:10px}.rr-sub{font-size:12px}}"+
        "@media(max-width:340px){.rr-stat{padding:7px 5px;min-width:40px}.rr-value{font-size:15px}.rr-fuel-stat{min-width:53px}.rr-pedal{width:68px;height:68px}.rr-brake{right:calc(max(16px,env(safe-area-inset-right)) + 76px)}.rr-steer-pad{width:82px;height:82px}.rr-panel{padding:14px;gap:8px}}"+
        "@media(max-height:480px){.rr-panel{width:min(92%,650px);padding:14px;gap:7px}.rr-title{font-size:22px}.rr-sub{font-size:11px}.rr-menu-btn{min-height:38px;padding:8px;font-size:12px;border-radius:12px}.rr-small{font-size:10px}.rr-list{padding:8px 12px;font-size:11px;line-height:1.25;gap:4px}.rr-stat{padding:5px 10px}.rr-top-track{top:calc(max(12px,env(safe-area-inset-top)) + 56px)}.rr-steer-pad{width:76px;height:76px;bottom:max(12px,env(safe-area-inset-bottom))}.rr-pedal{width:64px;height:64px;bottom:max(16px,env(safe-area-inset-bottom))}.rr-brake{right:calc(max(16px,env(safe-area-inset-right)) + 72px)}.rr-stage-banner{top:32%}}"+
        ".rr-root [hidden]{display:none!important}.rr-board-tabs{display:flex;gap:8px;grid-column:1/-1}.rr-board-tabs button{flex:1;min-height:36px;padding:7px;font-size:12px}.rr-board-tabs [aria-pressed=true]{background:#83dcc5;border-color:#399b88}.rr-global-list{min-height:142px}.rr-global-list>div{min-height:26px}.rr-global-list span{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}.rr-global-list strong{text-align:right;white-space:nowrap}.rr-global-list strong small{display:block;font-size:10px;font-weight:500}.rr-board-me{color:#1a7560}.rr-my-rank{font-weight:700}.rr-stage-nav button,.rr-page-nav button{width:auto;min-width:42px;max-width:110px;font-size:11px}.rr-stage-nav b{font-size:12px;white-space:nowrap}.rr-global-list p{margin:auto}.rr-board-tabs+div{margin:0}"+
        "@media(min-width:560px) and (max-height:480px){.rr-panel:has(.rr-global-list){grid-template-columns:1fr 1fr;width:min(96%,680px);gap:5px;padding:10px}.rr-panel:has(.rr-global-list)>.rr-title{font-size:18px}.rr-panel:has(.rr-global-list)>.rr-board-tabs{grid-column:auto}.rr-panel:has(.rr-global-list)>.rr-global-list{grid-column:1;grid-row:4/7;min-height:124px}.rr-panel:has(.rr-global-list)>.rr-my-rank{grid-column:2;grid-row:4}.rr-panel:has(.rr-global-list)>.rr-page-nav:not(.rr-stage-nav){grid-column:2;grid-row:5}.rr-panel:has(.rr-global-list)>[data-action=board-refresh]{grid-column:1;grid-row:7}.rr-panel:has(.rr-global-list)>[data-action=title]{grid-column:2;grid-row:7}.rr-board-tabs button{min-height:30px;padding:5px}.rr-global-list>div{min-height:22px}.rr-global-list strong small{display:inline;margin-left:5px}.rr-panel:has(.rr-global-list)>.rr-small:last-child{grid-column:2;grid-row:6;align-self:center}}"+
        "@media(max-width:559px) and (max-height:560px){.rr-panel:has(.rr-global-list){padding:10px;gap:5px;width:96%}.rr-panel:has(.rr-global-list)>.rr-title{font-size:18px}.rr-panel:has(.rr-global-list)>.rr-board-tabs{grid-column:auto}.rr-panel:has(.rr-global-list) .rr-menu-btn{min-height:32px;padding:5px;font-size:11px}.rr-panel:has(.rr-global-list)>.rr-global-list{min-height:124px}.rr-panel:has(.rr-global-list) .rr-page-nav{gap:8px}.rr-board-tabs button{padding:4px;font-size:10px}}"+
        "@media(prefers-reduced-motion:reduce){.rr-menu-btn{transition:none}}"+
        "</style>"+UI_HTML("<canvas></canvas><div class=\"rr-hud\"><div class=\"rr-dashboard\"><div class=\"rr-stat\"><span class=\"rr-label\">名次</span><b class=\"rr-value\" data-rank>40</b></div><div class=\"rr-stat\"><span class=\"rr-label\">用时</span><b class=\"rr-value\" data-time>0′00</b></div><div class=\"rr-stat\"><span class=\"rr-label\">超车</span><b class=\"rr-value\" data-cars>0</b></div><div class=\"rr-stat rr-fuel-stat\"><span class=\"rr-label\">油量</span><b class=\"rr-value\" data-fuel-value>100%</b><div class=\"rr-meter fuel\"><i data-fuel></i></div></div></div><div class=\"rr-top-track\"><em data-progress-line></em></div><button class=\"rr-top-exit\" data-action=\"quit-run\" aria-label=\"退出\">×</button></div><div class=\"rr-panel\"></div><div class=\"rr-stage-banner\"></div><div class=\"rr-countdown\"></div><div class=\"rr-toast\" role=\"status\" aria-live=\"polite\"></div><div class=\"rr-touch\"><div class=\"rr-steer-pad\" data-steer-pad role=\"group\" aria-label=\"方向\"><div class=\"rr-steer-knob\">↔</div></div><button class=\"rr-pedal rr-brake\" data-touch=\"brake\">刹车</button><button class=\"rr-pedal rr-throttle\" data-touch=\"boost\">油门</button></div>");
    };

    DanboRocketRoad.prototype.init3D=function(){
        this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
        if(THREE.SRGBColorSpace)this.renderer.outputColorSpace=THREE.SRGBColorSpace;
        this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=0.92;
        this.scene=new THREE.Scene();this.scene.background=new THREE.Color(STAGES[0].sky);this.scene.fog=null;
        this.camera=new THREE.OrthographicCamera(-14,14,19,-17,0.1,220);this.camera.up.set(0,0,1);this.camera.position.set(0,36,-38);this.camera.lookAt(0,0,6);
        var hemi=new THREE.HemisphereLight(0xf4fbff,0xb5c8a3,1.25);this.scene.add(hemi);
        var sun=new THREE.DirectionalLight(0xffedcf,1.9);sun.position.set(-16,42,-18);this.scene.add(sun);
        var fill=new THREE.DirectionalLight(0xc6eaf3,0.65);fill.position.set(20,12,16);this.scene.add(fill);
        this.world=new THREE.Group();this.scene.add(this.world);
        this.roadGroup=new THREE.Group();this.world.add(this.roadGroup);
        this.objectGroup=new THREE.Group();this.world.add(this.objectGroup);
        this.sceneryGroup=new THREE.Group();this.world.add(this.sceneryGroup);
        this.startGridGroup=new THREE.Group();this.world.add(this.startGridGroup);
        this.roadSegments=[];this.decorItems=[];this.startGridCars=[];this.buildRoadSegments();this.buildScenery();this.buildStartGrid();this.finishGroup=this.buildFinishGate();this.world.add(this.finishGroup);this.player=this.buildPlayerCar();this.world.add(this.player);
        this.resize();
    };

    DanboRocketRoad.prototype.buildRoadSegments=function(){
        var roadGeo=new THREE.BoxGeometry(1,0.08,1), railGeo=new THREE.BoxGeometry(0.18,0.22,1), markGeo=new THREE.BoxGeometry(0.11,0.04,1.35), flowerGeo=new THREE.BoxGeometry(0.14,0.05,0.14);
        this.stageMats=STAGES.map(function(st){return {
            road:mat(st.road,{roughness:0.9}),
            edge:mat(st.edge,{emissive:0x000000,emissiveIntensity:0}),
            mark:mat(0xf7f4e1,{emissive:0x111100,emissiveIntensity:0.04}),
            fields:[mat(st.fieldA,{roughness:0.92}),mat(st.fieldA,{roughness:0.92}),mat(st.fieldA,{roughness:0.92}),mat(st.fieldA,{roughness:0.92})],
            water:mat(0x79bdc7,{roughness:0.4})
        };});
        var roadMat=this.stageMats[0].road, edgeMat=this.stageMats[0].edge, markMat=this.stageMats[0].mark;
        var fieldMats=this.stageMats[0].fields,
            flowerMats=[mat(0xf3dca9),mat(0xe8a8bd),mat(0xfff3dc),mat(0xb0dcd9)];
        for(var i=0;i<24;i++){
            var g=new THREE.Group();
            var road=new THREE.Mesh(roadGeo,roadMat);road.scale.set(10,1,ROAD_SEG_LEN+0.35);road.receiveShadow=true;g.add(road);g.road=road;
            var lf=new THREE.Mesh(roadGeo,fieldMats[i%fieldMats.length]), rf=new THREE.Mesh(roadGeo,fieldMats[(i+2)%fieldMats.length]);lf.scale.set(4.2,0.45,ROAD_SEG_LEN+0.35);rf.scale.set(4.2,0.45,ROAD_SEG_LEN+0.35);lf.position.y=rf.position.y=-0.03;lf.receiveShadow=rf.receiveShadow=true;g.add(lf);g.add(rf);g.leftField=lf;g.rightField=rf;
            var l=new THREE.Mesh(railGeo,edgeMat), r=new THREE.Mesh(railGeo,edgeMat);l.scale.z=r.scale.z=ROAD_SEG_LEN+0.35;l.position.y=r.position.y=0.22;g.add(l);g.add(r);g.leftRail=l;g.rightRail=r;
            g.marks=[];for(var m=0;m<3;m++){var mk=new THREE.Mesh(markGeo,markMat);mk.position.y=0.08;g.add(mk);g.marks.push(mk);}
            var br=new THREE.Mesh(roadGeo,roadMat);br.scale.set(5.15,1,ROAD_SEG_LEN+0.35);br.position.y=0.005;br.receiveShadow=true;br.visible=false;g.add(br);g.branchRoad=br;
            g.branchRails=[];for(var brs=0;brs<2;brs++){var brRail=new THREE.Mesh(railGeo,edgeMat);brRail.scale.z=ROAD_SEG_LEN+0.35;brRail.position.y=0.23;brRail.visible=false;g.add(brRail);g.branchRails.push(brRail);}
            g.branchMarks=[];for(var bm=0;bm<2;bm++){var bmk=new THREE.Mesh(markGeo,markMat);bmk.position.y=0.09;bmk.visible=false;g.add(bmk);g.branchMarks.push(bmk);}
            g.flowers=[];for(var f=0;f<12;f++){var fl=new THREE.Mesh(flowerGeo,flowerMats[(i+f)%flowerMats.length]);fl.position.y=0.07;fl.receiveShadow=true;g.add(fl);g.flowers.push(fl);}
            this.roadGroup.add(g);this.roadSegments.push(g);
        }
        var grassGeo=new THREE.PlaneGeometry(260,260);var grass=new THREE.Mesh(grassGeo,mat(STAGES[0].fieldA,{roughness:0.92}));grass.rotation.x=-Math.PI/2;grass.position.y=-0.08;this.world.add(grass);this.ground=grass;
    };

    DanboRocketRoad.prototype.buildPlayerCar=function(){
        var g=new THREE.Group(),color=new THREE.Color(accentFromCharacter(this.ch)).lerp(new THREE.Color(0xffcfb1),0.32).getHex();
        g.name='rr-player-toy-car';addContactShadow(g,2.8,4.2);
        addSoft(g,color,0,0.56,0,0.88,0.46,1.42);addBox(g,1.20,0.14,1.1,0xfff1d6,0,0.83,-0.40);
        addSoft(g,color,0,0.83,0.68,0.70,0.39,0.68);addBox(g,1.1,0.28,0.14,0xb3e5df,0,1.04,0.24);
        addBox(g,1.28,0.16,0.18,0xfff1d6,0,0.42,1.40);addBox(g,1.28,0.16,0.18,0xfff1d6,0,0.42,-1.39);
        [-1,1].forEach(function(i){addSoft(g,0xffe3a0,i*0.49,0.66,1.29,0.17,0.11,0.06);addWheel(g,i*0.86,-0.81);addWheel(g,i*0.86,0.83);});
        var nozzle=new THREE.Mesh(geometry('rocket-nozzle',function(){return new THREE.CylinderGeometry(0.22,0.28,0.46,16);}),mat(0x638087,{roughness:0.38}));nozzle.rotation.x=Math.PI/2;nozzle.position.set(0,0.52,-1.53);g.add(nozzle);
        var flame=addSoft(g,0xffcd88,0,0.52,-1.96,0.19,0.19,0.53);flame.material=mat(0xffcf91,{emissive:0xffab60,emissiveIntensity:0.22});g.flame=flame;
        g.driver=addMiniDriver(g,this.ch,1.30,0,1.01,-0.38,{hero:true});
        g.position.set(0,0.06,PLAYER_Z);return g;
    };

    DanboRocketRoad.prototype.makeObject=function(type,id){
        var g=new THREE.Group();type=type|0;g.userData.type=type;
        if(type===6){var oil=new THREE.Mesh(geometry('oil',function(){return new THREE.CylinderGeometry(1.25,1.55,0.04,24);}),mat(0x485e6a,{roughness:0.35,metalness:0.05}));oil.scale.z=0.62;oil.position.y=0.09;g.add(oil);return g;}
        var color=type===2?0xe99893:(type===3?0x8fbfd9:(type===4?0x83c6b5:(type===5?0xf3d18c:0xeac49c)));
        var w=type===4?2.1:1.45,d=type===4?3.9:2.55,h=type===4?0.78:0.46;
        addContactShadow(g,w+0.8,d+0.8);
        if(type===4||type===5)addBox(g,w,h,d,color,0,0.42,0);else addSoft(g,color,0,0.45,0,w*0.57,0.37,d*0.56);
        addBox(g,w*0.72,0.34,d*0.38,type===5?0xfff5de:0xc0e4e2,0,0.86,0.28);
        addWheel(g,-w*0.58,-d*0.28);addWheel(g,w*0.58,-d*0.28);addWheel(g,-w*0.58,d*0.32);addWheel(g,w*0.58,d*0.32);
        if(type!==5)g.driver=addMiniDriver(g,charByIndex((id||0)*3+type),type===4?0.72:0.62,0,0.92,0.16);
        if(type===5){var halo=new THREE.Mesh(geometry('fuel-halo',function(){return new THREE.TorusGeometry(1.05,0.06,6,24);}),mat(0xace8bc,{emissive:0x6bbd91,emissiveIntensity:0.15}));halo.rotation.x=Math.PI/2;halo.position.y=1.1;g.add(halo);g.halo=halo;}
        return g;
    };

    DanboRocketRoad.prototype.makeDecor=function(kind){
        var g=new THREE.Group();kind=kind|0;g.userData.kind=kind;
        if(kind===0){
            addBox(g,0.27,1.55,0.27,0xb79d7d,0,0.76,0);
            addSoft(g,0x79b38e,0,1.82,0,0.93,1.02,0.88);addSoft(g,0x9bcca4,-0.38,2.32,0.02,0.61,0.56,0.64);
            addSoft(g,0xf3c49d,0.31,1.77,-0.76,0.16,0.16,0.16);
        }else if(kind===1){
            addBox(g,2.65,0.18,1.65,0x97c3a2,0,0.08,0.05);
            addBox(g,2.35,1.35,1.18,0xf5d8b8,0,0.76,0);
            addBox(g,2.65,0.28,1.45,0xdca293,0,1.54,0);
            addBox(g,2.9,0.12,0.2,0xbb8278,0,1.68,-0.68);addBox(g,2.9,0.12,0.2,0xbb8278,0,1.68,0.68);
            for(var i=0;i<3;i++){addBox(g,0.36,0.22,0.05,0x9bcfd6,-0.72+i*0.72,1.05,0.62);addBox(g,0.28,0.04,0.06,0xfff5df,-0.72+i*0.72,1.18,0.66);}
            addBox(g,0.48,0.5,0.06,0x7a4b2a,0,0.42,0.66);addBox(g,0.08,0.08,0.03,0xffe56a,0.16,0.5,0.71);
            addBox(g,1.15,0.08,1.75,0xd9d2ba,-1.85,0.08,0.05);
            addBox(g,0.78,0.18,1.15,0x98c8d6,1.75,0.12,-0.15);addBox(g,0.9,0.06,1.28,0xeaffff,1.75,0.25,-0.15);
            addBox(g,0.58,0.18,0.98,0xe9c18c,-1.9,0.2,-0.62);addBox(g,0.4,0.08,0.22,0x55717b,-1.9,0.34,-0.28);
            for(var fp=0;fp<5;fp++){addBox(g,0.08,0.18,0.08,0xfff5df,-1.28+fp*0.64,0.18,-1.02);addBox(g,0.08,0.18,0.08,0xfff5df,-1.28+fp*0.64,0.18,1.02);}
        }else if(kind===2){
            addBox(g,2.8,0.12,1.45,0xc9d9e6,0,0.06,0.22);
            addBox(g,2.45,1.1,1.08,0xf2e5c8,0,0.62,0.2);
            addBox(g,2.7,0.18,1.25,0x93bdca,0,1.22,0.2);
            addBox(g,1.9,0.18,0.11,0xd99c99,0,1.4,0.82);addBox(g,1.45,0.12,0.12,0xfff5df,0,1.18,0.84);
            addBox(g,0.5,0.52,0.06,0x426874,-0.74,0.36,0.76);addBox(g,0.5,0.52,0.06,0x426874,0,0.36,0.76);addBox(g,0.5,0.52,0.06,0x426874,0.74,0.36,0.76);
            addBox(g,0.18,2.3,0.18,0xfff5df,-1.45,1.15,0.85);addBox(g,0.18,2.3,0.18,0xfff5df,1.45,1.15,0.85);
            var board=new THREE.Mesh(new THREE.BoxGeometry(2.35,0.78,0.12),mat(0xf2dcb0,{emissive:0x443300,emissiveIntensity:0.08}));board.position.set(0,1.9,0.92);g.add(board);
            addBox(g,1.55,0.14,0.14,0xd99c99,0,2.08,1.0);addBox(g,1.05,0.12,0.14,0x9ed1d4,0,1.82,1.0);
            addBox(g,1.05,0.08,1.65,0xb0b6bd,1.9,0.08,0.1);addBox(g,0.52,0.18,0.96,0x8ab8ce,1.95,0.2,-0.28);
        }else if(kind===3){
            for(var b=0;b<4;b++){var bal=new THREE.Mesh(new THREE.SphereGeometry(0.28,12,8),mat([0xe7a4b0,0xefd69e,0x9bcfd6,0xafd3a4][b],{emissive:0x111111,emissiveIntensity:0.04}));bal.position.set((b-1.5)*0.25,1.8+(b%2)*0.28,(b%3)*0.12);g.add(bal);}
            addBox(g,0.08,1.45,0.08,0xfff5df,0,0.9,0);
        }else if(kind===4){
            for(var f=0;f<5;f++){var fl=new THREE.Mesh(new THREE.SphereGeometry(0.16,8,6),mat(f%2?0xf3d998:0xe9aec1,{emissive:0x331111,emissiveIntensity:0.08}));fl.position.set(-0.8+f*0.4,0.2,(f%2)*0.22);g.add(fl);}
            addBox(g,2.1,0.16,0.5,0x8bbb91,0,0.08,0.1);
        }else if(kind===5){
            addBox(g,0.14,2.0,0.14,0xeff5ff,-0.58,1.0,0);addBox(g,0.14,2.0,0.14,0xeff5ff,0.58,1.0,0);
            var fg=new THREE.Group();for(var y=0;y<2;y++)for(var x=0;x<4;x++)addBox(fg,0.28,0.22,0.04,(x+y)%2?0x709d9c:0xfff5df,-0.42+x*0.28,1.65-y*0.22,0);
            g.add(fg);
        }else if(kind===6){
            addBox(g,3.4,0.18,7.4,0x87c5d0,0,0.09,0);
            addBox(g,3.05,0.12,6.85,0xa5d8d9,0,0.23,0);
            for(var s=0;s<7;s++)addBox(g,3.15,0.04,0.08,0xfff5df,0,0.32,-3+s*1.0);
            addBox(g,0.18,1.1,7.4,0xc6e3dd,-1.78,0.55,0);addBox(g,0.18,1.1,7.4,0xc6e3dd,1.78,0.55,0);
        }else if(kind===8){
            addSoft(g,0xe8d6ad,0,0.03,0,2.2,0.14,3.3);
            for(var w=0;w<4;w++){var shell=addSoft(g,w%2?0xf7e9cc:0xeabeb0,(w%2?-1:1)*0.7,0.18,-1.8+w*1.1,0.27,0.15,0.20);shell.rotation.y=w*0.5;}
        }else if(kind===9){
            for(var r=0;r<5;r++)addBox(g,1.2+0.25*(r%2),0.38,0.8,0xbd9881,0,0.18+r*0.13,-3+r*1.45);
            addBox(g,1.0,2.6,7.6,0xba967f,1.15,1.3,0);
        }else if(kind===10){
            addBox(g,3.8,0.08,7.8,0xd6c79d,0,0.04,0);
            for(var fy=0;fy<6;fy++)addBox(g,3.5,0.05,0.08,0xeee0b2,0,0.14,-3.3+fy*1.15);
            for(var fx=0;fx<4;fx++)addBox(g,0.08,0.06,7.1,0xa7b98a,-1.5+fx*1.0,0.15,0);
        }else{
            addBox(g,1.35,0.16,3.4,0x77999a,0,0.08,0);
            for(var c=0;c<4;c++)addBox(g,0.25,0.22,0.18,(c%2)?0xfff5df:0xf0d4a0,-0.48+c*0.32,0.24,0);
            addBox(g,1.1,0.08,0.12,0xf0d4a0,0,0.34,-1.2);addBox(g,1.1,0.08,0.12,0xf0d4a0,0,0.34,1.2);
        }
        if(kind!==6&&kind!==8&&kind!==9&&kind!==10)addContactShadow(g,kind===0?3:4.5,kind===0?2.8:3.2);
        return g;
    };

    DanboRocketRoad.prototype.buildScenery=function(){
        this.decorItems=[];this.decorTemplates=this.decorTemplates||{};
        var st=STAGES[this.stageId||0],self=this;
        st.decor.forEach(function(kind){if(!self.decorTemplates[kind])self.decorTemplates[kind]=batchDecor(self.makeDecor(kind));});
        // Eight visible road sections, two sides. Recycle slots instead of
        // constructing the entire 3,300-metre course again on every retry.
        for(var i=0;i<8;i++)for(var side=0;side<2;side++){
            var mesh=new THREE.Group();this.sceneryGroup.add(mesh);this.decorItems.push({slot:i,side:side?1:-1,mesh:mesh,variants:{},kind:-1});
        }
    };

    DanboRocketRoad.prototype.rebuildScenery=function(){
        if(!this.sceneryGroup)return;this.sceneryGroup.clear();this.buildScenery();
        var st=STAGES[this.stageId||0];this.scene.background.setHex(st.sky);
        if(this.ground)this.ground.material=mat(st.fieldA,{roughness:0.92});
    };

    DanboRocketRoad.prototype.buildStartGrid=function(){
        this.startGridCars=[];
        var slots=[
            {lane:1,z:7,type:1},{lane:2,z:11,type:1},{lane:1,z:16,type:2},{lane:2,z:20,type:1},
            {lane:0,z:25,type:3},{lane:3,z:29,type:1},{lane:1,z:34,type:2},{lane:2,z:38,type:1},
            {lane:0,z:44,type:1},{lane:3,z:48,type:3},{lane:1,z:54,type:4},{lane:2,z:59,type:1}
        ];
        for(var i=0;i<slots.length;i++){
            var s=slots[i], mesh=this.makeObject(s.type,100+i);
            mesh.visible=false;this.startGridGroup.add(mesh);
            this.startGridCars.push({mesh:mesh,lane:s.lane,z:s.z,type:s.type,launch:10+i*3});
        }
    };

    DanboRocketRoad.prototype.makeCheckerTexture=function(w,h){
        var c=document.createElement('canvas');c.width=w||256;c.height=h||64;var x=c.getContext('2d'), cols=16, rows=4;
        for(var yy=0;yy<rows;yy++)for(var xx=0;xx<cols;xx++){x.fillStyle=(xx+yy)%2?'#111827':'#ffffff';x.fillRect(xx*c.width/cols,yy*c.height/rows,c.width/cols+1,c.height/rows+1);}
        var tex=new THREE.CanvasTexture(c);tex.needsUpdate=true;return tex;
    };

    DanboRocketRoad.prototype.buildFinishGate=function(){
        var g=new THREE.Group();g.visible=false;
        var tex=this.makeCheckerTexture(256,64), finishMat=new THREE.MeshStandardMaterial({map:tex,roughness:0.68,metalness:0.02});
        var stripe=new THREE.Mesh(new THREE.BoxGeometry(1,0.08,1.8),finishMat);stripe.position.y=0.09;stripe.receiveShadow=true;g.add(stripe);g.stripe=stripe;
        var poleMat=mat(0xffffff,{roughness:0.65});
        g.leftPole=new THREE.Mesh(new THREE.BoxGeometry(0.22,4.6,0.22),poleMat);g.rightPole=new THREE.Mesh(new THREE.BoxGeometry(0.22,4.6,0.22),poleMat);g.leftPole.position.y=g.rightPole.position.y=2.3;g.add(g.leftPole);g.add(g.rightPole);
        g.topBar=new THREE.Mesh(new THREE.BoxGeometry(1,0.28,0.28),poleMat);g.topBar.position.y=4.45;g.add(g.topBar);
        var flagGeo=new THREE.PlaneGeometry(1.15,0.72), flagMat1=new THREE.MeshStandardMaterial({color:0xff4f5e,roughness:0.75,side:THREE.DoubleSide}), flagMat2=new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.75,side:THREE.DoubleSide});
        g.flags=[];
        for(var f=0;f<4;f++){var fm=f%2?flagMat2:flagMat1, fl=new THREE.Mesh(flagGeo,fm);fl.position.y=3.35+(f%2)*0.55;fl.userData.side=f<2?-1:1;g.add(fl);g.flags.push(fl);}
        var banner=new THREE.Group();for(var by=0;by<2;by++)for(var bx=0;bx<12;bx++)addBox(banner,0.48,0.24,0.08,(bx+by)%2?0x111827:0xffffff,-2.64+bx*0.48,4.9-by*0.24,0);g.add(banner);g.banner=banner;
        return g;
    };

    DanboRocketRoad.prototype.bind=function(){
        var self=this;
        this.onResize=function(){self.resize();};window.addEventListener('resize',this.onResize);
        this.onBlur=function(){self.keys={};self.touch={};self.pedalPointers={};self.steerPointer=null;if(self.steerKnob)self.steerKnob.style.transform='translateX(0px)';self.root.querySelectorAll('[data-touch]').forEach(function(b){b.classList.remove('rr-pressed');});};
        this.onVisibility=function(){if(document.hidden)self.onBlur();};
        window.addEventListener('blur',this.onBlur);document.addEventListener('visibilitychange',this.onVisibility);this.pedalPointers={};
        this.onKeyDown=function(e){
            if(!self.running)return;var code=e.code||e.key;self.keys[code]=true;
            if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyA','KeyD','KeyW','KeyS','Enter','Escape'].indexOf(code)>=0){e.preventDefault();e.stopImmediatePropagation();}
            if(self.state==='title'){
                if(code==='Enter'||code==='Space')self.startGame();
                else if(code==='Escape')self.exit();
            }else if(self.state==='preparing'&&code==='Escape'){
                self.runSequence++;self.showTitle();
            }else if(self.state==='scores'){
                if(code==='Escape'||code==='Enter'||code==='Space')self.showTitle();
            }else if(self.state==='result'){
                if(code==='Enter'||code==='Space')self.startGame();
                else if(code==='Escape')self.showTitle();
            }else if((self.state==='playing'||self.state==='countdown')&&code==='Escape')self.finish(false,'quit');
        };
        this.onKeyUp=function(e){self.keys[e.code||e.key]=false;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyA','KeyD','KeyW','KeyS'].indexOf(e.code||e.key)>=0){e.preventDefault();e.stopImmediatePropagation();}};
        window.addEventListener('keydown',this.onKeyDown,true);window.addEventListener('keyup',this.onKeyUp,true);
        this.onClick=function(e){var b=e.target&&e.target.closest?e.target.closest('[data-action]'):null;if(!b||b.disabled)return;var a=b.getAttribute('data-action');if(self.handleLeaderboardAction&&self.handleLeaderboardAction(a))return;if(a==='single')self.showStages();else if(a==='stage')self.startGame(Number(b.getAttribute('data-stage')||0));else if(a==='next-stage')self.startGame(Math.min(STAGE_COUNT-1,(self.stageId||0)+1));else if(a==='multi')self.showToast(UI_T('多人模式已预留，等服务器房间接入后开放'));else if(a==='scores'){self.scoresPage=0;self.showScores();}else if(a==='scores-prev'){self.scoresPage--;self.showScores();}else if(a==='scores-next'){self.scoresPage++;self.showScores();}else if(a==='exit')self.exit();else if(a==='title')self.showTitle();else if(a==='retry')self.startGame(self.stageId||0);else if(a==='quit-run')self.finish(false,'quit');};
        this.root.addEventListener('click',this.onClick);
        function resetSteer(){self.touch.steer=0;if(self.steerKnob)self.steerKnob.style.transform='translateX(0px)';}
        function steerFromEvent(e){
            if(!self.steerPad)return;
            var r=self.steerPad.getBoundingClientRect(), dx=e.clientX-(r.left+r.width*0.5), v=clamp(dx/(r.width*0.32),-1,1);
            self.touch.steer=v;if(self.steerKnob)self.steerKnob.style.transform='translateX('+Math.round(v*r.width*0.25)+'px)';
        }
        this.onPointer=function(e){
            var b=e.target&&e.target.closest?e.target.closest('[data-touch]'):null;if(!b)return;e.preventDefault();
            var k=b.getAttribute('data-touch'), down=e.type==='pointerdown';
            if(down){if(self.pedalPointers[k]!==undefined)return;self.pedalPointers[k]=e.pointerId;if(b.setPointerCapture)b.setPointerCapture(e.pointerId);}
            else{if(self.pedalPointers[k]!==e.pointerId)return;delete self.pedalPointers[k];}
            self.touch[k]=down;
            b.classList.toggle('rr-pressed',!!self.touch[k]);
            if(down){var ac=self.ensureAudio();if(ac&&ac.state==='suspended'&&ac.resume)ac.resume();}
        };
        this.onSteerDown=function(e){if(!self.steerPad||self.steerPointer!==undefined&&self.steerPointer!==null)return;e.preventDefault();self.steerPointer=e.pointerId;if(self.steerPad.setPointerCapture)try{self.steerPad.setPointerCapture(e.pointerId);}catch(_e){}steerFromEvent(e);var ac=self.ensureAudio();if(ac&&ac.state==='suspended'&&ac.resume)ac.resume();};
        this.onSteerMove=function(e){if(self.steerPointer!==e.pointerId)return;e.preventDefault();steerFromEvent(e);};
        this.onSteerEnd=function(e){if(self.steerPointer!==e.pointerId)return;e.preventDefault();self.steerPointer=null;resetSteer();if(self.steerPad&&self.steerPad.releasePointerCapture)try{self.steerPad.releasePointerCapture(e.pointerId);}catch(_e2){};};
        this.touchLayer.addEventListener('pointerdown',this.onPointer);this.touchLayer.addEventListener('pointerup',this.onPointer);this.touchLayer.addEventListener('pointercancel',this.onPointer);this.touchLayer.addEventListener('lostpointercapture',this.onPointer);
        if(this.steerPad){this.steerPad.addEventListener('pointerdown',this.onSteerDown);this.steerPad.addEventListener('pointermove',this.onSteerMove);this.steerPad.addEventListener('pointerup',this.onSteerEnd);this.steerPad.addEventListener('pointercancel',this.onSteerEnd);this.steerPad.addEventListener('lostpointercapture',this.onSteerEnd);}
    };

    DanboRocketRoad.prototype.resize=function(){
        var w=this.root.clientWidth||innerWidth,h=this.root.clientHeight||innerHeight,quality=window.DANBO_VISUAL_QUALITY||{},budget=quality.low?1100000:2000000;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,quality.high?2:Math.sqrt(budget/(w*h)),2));this.renderer.setSize(w,h,false);
        var aspect=w/h,halfH=18,halfW=Math.max(7.5,halfH*aspect);halfH=halfW/aspect;
        this.camera.left=-halfW;this.camera.right=halfW;this.camera.top=halfH+1;this.camera.bottom=-halfH+1;this.camera.updateProjectionMatrix();
    };

    DanboRocketRoad.prototype.showTitle=function(){
        this.toast.style.display='none';this.toastTimer=0;this.stopMusic();this.state='title';this.hud.style.display='none';this.touchLayer.style.display='none';this.panel.style.display='grid';this.countdownEl.style.display='none';this.stageEl.style.display='none';if(this.startRankEl)this.startRankEl.style.display='none';
        this.panel.innerHTML=UI_HTML('<h1 class="rr-title">🚗 蛋宝火箭公路</h1><div class="rr-sub">街机公路 · 单关挑战</div>')+
            UI_HTML('<button class="rr-menu-btn rr-selected" data-action="single">单人游戏</button>')+
            UI_HTML('<button class="rr-menu-btn" data-action="board-local">本地记录</button>')+
            UI_HTML('<button class="rr-menu-btn" data-action="scores">高分榜</button>')+
            UI_HTML('<button class="rr-menu-btn" data-action="exit">退出</button>')+
            UI_HTML('<div class="rr-small">6 个独立关卡；每次挑战 1 关，通关解锁下一关。')+'</div>';
    };

    DanboRocketRoad.prototype.showStages=function(){
        this.toast.style.display='none';this.toastTimer=0;this.stopMusic();this.state='stageSelect';this.hud.style.display='none';this.touchLayer.style.display='none';this.panel.style.display='grid';this.countdownEl.style.display='none';this.stageEl.style.display='none';if(this.startRankEl)this.startRankEl.style.display='none';
        var unlocked=this.getUnlockedStage(), html=UI_HTML('<h1 class="rr-title">🏁 选择关卡</h1><div class="rr-sub">通关上一关后，下一场景才会开放</div>');
        for(var i=0;i<STAGE_COUNT;i++){
            var locked=i>unlocked, st=STAGES[i];
            html+='<button class="rr-menu-btn" '+(locked?'disabled ':'')+'data-action="stage" data-stage="'+i+'">'+(locked?'🔒 ':'')+(i+1)+'. '+esc(UI_T(st.name).replace(/^STAGE \d+ · /,''))+(locked?'':UI_HTML(' <span style="font-size:12px;opacity:.72">可挑战</span>'))+'</button>';
        }
        html+=UI_HTML('<button class="rr-menu-btn" data-action="title">返回标题</button><div class="rr-small">使用方向控制转向、加速和减速；触屏设备可直接点按画面按钮。</div>');
        this.panel.innerHTML=html;
    };

    DanboRocketRoad.prototype.startGame=function(stageId){
        stageId=clamp(stageId|0,0,STAGE_COUNT-1);
        if(stageId>this.getUnlockedStage()){this.showToast(UI_T('先通关前一关才能挑战这里'));this.showStages();return;}
        this.onBlur();this.sim=Race.create(stageId);this.simAcc=0;this.replay=[];this.stageId=stageId;this.rebuildScenery();
        this.state='countdown';this.panel.style.display='none';this.hud.style.display='flex';this.touchLayer.style.display=(navigator.maxTouchPoints>0||window.matchMedia&&window.matchMedia('(pointer:coarse)').matches)?'block':'none';
        this.R=rules();this.progress=0;this.fuel=this.R.maxFuel();this.speed=0;this.score=0;this.pickups=0;this.crashes=0;this.carX=0;this.carVx=0;this.spin=0;this.spinDir=1;this.elapsed=0;this.netAcc=0;this.hitEvents={};this.throttleSfxT=0;this.brakeSfxT=0;this.touch={steer:0};if(this.steerKnob)this.steerKnob.style.transform='translateX(0px)';
        this.countdown=3.15;this.countdownText='';this.countdownEl.textContent='3';this.countdownEl.style.display='block';this.stageEl.textContent=UI_T((STAGES[this.stageId]||STAGES[0]).name);this.stageEl.style.display='block';if(this.startRankEl)this.startRankEl.style.display='block';this.startMusic();
        for(var k in this.objects){if(this.objects[k]&&this.objects[k].mesh)this.objects[k].mesh.visible=false;}
        if(this.ctx.net)this.ctx.net.send('minigame.startIntent',{pluginId:this.ctx.pluginId,characterId:this.ch.id,mode:'single',stage:this.stageId,seed:BUILD});
    };

    DanboRocketRoad.prototype.showScores=function(){
        this.stopMusic();this.state='scores';this.hud.style.display='none';this.touchLayer.style.display='none';this.panel.style.display='grid';this.countdownEl.style.display='none';this.stageEl.style.display='none';
        var scores=this.getScores(),pages=Math.max(1,Math.ceil(scores.length/4));this.scoresPage=clamp(this.scoresPage,0,pages-1);var offset=this.scoresPage*4;
        var rows=scores.length?scores.slice(offset,offset+4).map(function(s,i){return '<div><b>#'+(offset+i+1)+'</b><span>'+esc(s.name||'Danbo')+'<br><small>'+esc(UI_T((STAGES[s.stage||0]||STAGES[0]).name))+'</small></span><strong>'+esc(s.score)+'</strong></div>';}).join(''):UI_HTML('<div>还没有记录，先跑一局吧。</div>');
        this.panel.innerHTML=UI_HTML('<h1 class="rr-title">🏆 高分榜</h1>')+'<div class="rr-list rr-score-list">'+rows+'</div>'+
            '<div class="rr-page-nav"><button class="rr-menu-btn" data-action="scores-prev" aria-label="'+esc(UI_T('上一页'))+'" '+(this.scoresPage===0?'disabled':'')+'>‹</button><span>'+(this.scoresPage+1)+' / '+pages+'</span><button class="rr-menu-btn" data-action="scores-next" aria-label="'+esc(UI_T('下一页'))+'" '+(this.scoresPage===pages-1?'disabled':'')+'>›</button></div>'+
            UI_HTML('<button class="rr-menu-btn" data-action="title">返回标题</button>');
    };

    DanboRocketRoad.prototype.finish=function(win,reason){
        if(this.state!=='playing'&&this.state!=='countdown')return;this.toast.style.display='none';this.toastTimer=0;this.stopMusic();if(win)this.playFinishJingle();this.state='result';this.hud.style.display='none';this.touchLayer.style.display='none';this.panel.style.display='grid';this.countdownEl.style.display='none';this.stageEl.style.display='none';if(this.startRankEl)this.startRankEl.style.display='none';
        var finalScore=this.R.score(this.progress,this.fuel,this.pickups,this.crashes,win?1:0);this.score=finalScore;this.saveScore(finalScore);
        if(win)this.unlockStage(this.stageId||0);
        if(this.ctx.net)this.ctx.net.send('minigame.finishIntent',{pluginId:this.ctx.pluginId,stage:this.stageId||0,score:finalScore,finished:!!win,reason:reason||'',time:this.elapsed,crashes:this.crashes,pickups:this.pickups});
        var nextOk=win&&(this.stageId||0)<STAGE_COUNT-1, stageName=UI_T((STAGES[this.stageId]||STAGES[0]).name);
        this.panel.innerHTML='<h1 class="rr-title">'+(win?'🏁 '+esc(stageName)+UI_T(' 通关！'):UI_T('💥 挑战结束'))+'</h1>'+
            UI_HTML('<div class="rr-list"><div>关卡：<b>')+esc(stageName)+UI_HTML('</b></div><div>分数：<b>')+finalScore+UI_HTML('</b></div><div>距离：')+Math.floor(clamp(this.progress/this.R.levelLength()*100,0,100))+UI_HTML('%</div><div>补油：')+this.pickups+UI_HTML(' 次</div><div>碰撞：')+this.crashes+UI_HTML(' 次</div><div>用时：')+this.elapsed.toFixed(1)+UI_HTML(' 秒</div>')+(nextOk?UI_HTML('<div>已解锁：<b>')+esc(UI_T(STAGES[(this.stageId||0)+1].name))+'</b></div>':'')+'</div>'+
            (nextOk?UI_HTML('<button class="rr-menu-btn" data-action="next-stage">挑战下一关</button>'):'')+
            UI_HTML('<button class="rr-menu-btn" data-action="retry">再来一次</button><button class="rr-menu-btn" data-action="single">选择关卡</button><button class="rr-menu-btn" data-action="scores">高分榜</button><button class="rr-menu-btn" data-action="title">返回标题</button><button class="rr-menu-btn" data-action="exit">退出</button>');
        this.panel.innerHTML+='<p class="rr-small" data-submit-status role="status" aria-live="polite"></p>'+UI_HTML('<button class="rr-menu-btn" data-action="submit-retry" hidden>重试上传</button>');
        this.submitCanRetry=false;this.finishLeaderboard(win);
    };

    DanboRocketRoad.prototype.getUnlockedStage=function(){
        var v=this.ctx.storage&&this.ctx.storage.get('rocketRoadUnlockedStage',0);
        return clamp(v|0,0,STAGE_COUNT-1);
    };
    DanboRocketRoad.prototype.unlockStage=function(stage){
        var next=clamp((stage|0)+1,0,STAGE_COUNT-1);
        if(next>this.getUnlockedStage()&&this.ctx.storage)this.ctx.storage.set('rocketRoadUnlockedStage',next);
        this.unlockedStage=this.getUnlockedStage();
    };
    DanboRocketRoad.prototype.getScores=function(){return (this.ctx.storage&&this.ctx.storage.get('rocketRoadScores',[]))||[];};
    DanboRocketRoad.prototype.saveScore=function(score){var list=this.getScores();list.push({stage:this.stageId||0,stageName:(STAGES[this.stageId]||STAGES[0]).name,score:score,name:this.ch.displayName||this.ch.name||'Danbo',date:new Date().toISOString().slice(0,10)});list.sort(function(a,b){return b.score-a.score;});list=list.slice(0,12);if(this.ctx.storage)this.ctx.storage.set('rocketRoadScores',list);};
    DanboRocketRoad.prototype.showToast=function(text){this.toast.textContent=text;this.toast.style.display='block';this.toastTimer=2.2;};
    DanboRocketRoad.prototype.exit=function(){this.stopMusic();if(this.ctx.net)this.ctx.net.send('minigame.stopIntent',{pluginId:this.ctx.pluginId,status:'exit'});this.ctx.api.finish({status:'exit',pluginId:this.ctx.pluginId});};

    DanboRocketRoad.prototype.ensureAudio=function(){
        if(this.audioCtx)return this.audioCtx;
        var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
        this.audioCtx=new AC();this.musicGain=this.audioCtx.createGain();this.musicGain.gain.value=typeof soundEnabled!=='undefined'&&!soundEnabled?0:0.055;this.musicGain.connect(this.audioCtx.destination);
        this.sfxGain=this.audioCtx.createGain();this.sfxGain.gain.value=typeof sfxEnabled!=='undefined'&&!sfxEnabled?0:0.22;this.sfxGain.connect(this.audioCtx.destination);return this.audioCtx;
    };

    DanboRocketRoad.prototype.tone=function(freq,dur,delay,type,gain){
        var ctx=this.ensureAudio();if(!ctx||!this.musicGain)return;
        var when=ctx.currentTime+(delay||0), osc=ctx.createOscillator(), g=ctx.createGain();
        osc.type=type||'square';osc.frequency.setValueAtTime(freq,when);
        g.gain.setValueAtTime(0.0001,when);g.gain.linearRampToValueAtTime(gain||0.18,when+0.015);g.gain.exponentialRampToValueAtTime(0.0001,when+Math.max(0.04,dur||0.12));
        osc.connect(g);g.connect(this.musicGain);osc.start(when);osc.stop(when+(dur||0.12)+0.05);
    };

    DanboRocketRoad.prototype.startMusic=function(){
        var ctx=this.ensureAudio();if(!ctx)return;this.stopMusic(false);if(ctx.state==='suspended'&&ctx.resume)ctx.resume();
        var self=this, melody=[392,494,587,659,587,494,440,392,330,392,494,587,740,659,587,494], bass=[196,196,247,247,220,220,196,196];
        this.musicPlaying=true;this.musicBeat=0;
        var tick=function(){
            if(!self.musicPlaying||!self.running)return;
            var i=self.musicBeat++,
                lead=melody[i%melody.length],
                b=bass[Math.floor(i/2)%bass.length];
            self.tone(lead,0.12,0,'square',0.12);
            if(i%2===0)self.tone(b,0.18,0,'triangle',0.08);
            if(i%8===6)self.tone(lead*1.5,0.08,0.04,'sine',0.055);
            self.musicTimer=setTimeout(tick,145);
        };
        tick();
    };

    DanboRocketRoad.prototype.stopMusic=function(){
        this.musicPlaying=false;if(this.musicTimer){clearTimeout(this.musicTimer);this.musicTimer=0;}
    };

    DanboRocketRoad.prototype.playCountdownBeep=function(go){
        this.tone(go?784:523,go?0.22:0.12,0,go?'square':'sine',go?0.26:0.2);
        if(go)this.tone(1175,0.18,0.06,'square',0.14);
    };

    DanboRocketRoad.prototype.playFinishJingle=function(){
        this.tone(523,0.15,0,'square',0.22);this.tone(659,0.15,0.16,'square',0.22);this.tone(784,0.16,0.32,'square',0.22);this.tone(1046,0.32,0.5,'triangle',0.24);
    };

    DanboRocketRoad.prototype.sfxTone=function(freq,dur,type,gain,endFreq){
        var ctx=this.ensureAudio();if(!ctx||!this.sfxGain)return;if(ctx.state==='suspended'&&ctx.resume)ctx.resume();
        var when=ctx.currentTime, osc=ctx.createOscillator(), g=ctx.createGain();
        osc.type=type||'sawtooth';osc.frequency.setValueAtTime(freq,when);
        if(endFreq)osc.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),when+Math.max(0.03,dur||0.1));
        g.gain.setValueAtTime(0.0001,when);g.gain.linearRampToValueAtTime(gain||0.12,when+0.012);g.gain.exponentialRampToValueAtTime(0.0001,when+Math.max(0.04,dur||0.1));
        osc.connect(g);g.connect(this.sfxGain);osc.start(when);osc.stop(when+(dur||0.1)+0.04);
    };

    DanboRocketRoad.prototype.playThrottleSfx=function(){
        var base=90+clamp(this.speed||0,0,68)*2.1;
        this.sfxTone(base,0.105,'sawtooth',0.10,base*1.35);
        this.sfxTone(base*0.52,0.12,'triangle',0.055,base*0.64);
    };

    DanboRocketRoad.prototype.playBrakeSfx=function(){
        this.sfxTone(520,0.16,'sawtooth',0.12,210);
        this.sfxTone(880,0.08,'square',0.045,420);
    };

    DanboRocketRoad.prototype.updateControlSfx=function(inp,dt){
        if(this.state!=='playing')return;
        if(inp.turbo){this.throttleSfxT=(this.throttleSfxT||0)-dt;if(this.throttleSfxT<=0){this.playThrottleSfx();this.throttleSfxT=0.105;}}else this.throttleSfxT=0;
        if(inp.brake){this.brakeSfxT=(this.brakeSfxT||0)-dt;if(this.brakeSfxT<=0){this.playBrakeSfx();this.brakeSfxT=0.18;}}else this.brakeSfxT=0;
    };

    DanboRocketRoad.prototype.inputState=function(){
        var left=this.keys.ArrowLeft||this.keys.KeyA||this.touch.left,right=this.keys.ArrowRight||this.keys.KeyD||this.touch.right;
        var pad=n(this.touch.steer,0), steer=Math.abs(pad)>0.04?-pad:((left?1:0)-(right?1:0));
        return {steer:steer,turbo:!!(this.keys.ArrowUp||this.keys.KeyW||this.keys.Space||this.touch.boost),brake:!!(this.keys.ArrowDown||this.keys.KeyS||this.touch.brake)};
    };

    DanboRocketRoad.prototype.updateCountdown=function(dt){
        this.countdown-=dt;
        var text=this.countdown>2.15?'3':(this.countdown>1.15?'2':(this.countdown>0.15?'1':'GO!'));
        if(text!==this.countdownText){this.countdownText=text;this.countdownEl.textContent=text;this.countdownEl.style.display='block';this.playCountdownBeep(text==='GO!');}
        if(this.countdown<=-0.32){this.state='playing';this.countdownEl.style.display='none';this.stageEl.style.display='none';if(this.startRankEl)this.startRankEl.style.display='none';this.countdownText='';}
    };

    DanboRocketRoad.prototype.updatePlaying=function(dt){
        this.simAcc=Math.min((this.simAcc||0)+Math.max(0,dt),.25);
        var inp=this.inputState(),steer=Math.round(clamp(inp.steer,-1,1)*100),flags=(inp.turbo?1:0)|(inp.brake?2:0);
        this.updateControlSfx(inp,dt);
        while(this.simAcc+1e-9>=Race.DT&&this.state==='playing'){
            this.simAcc-=Race.DT;var crashes=this.sim.crashes,pickups=this.sim.pickups;
            Race.record(this.replay,steer,flags);Race.step(this.sim,steer,flags);
            var self=this;['progress','elapsed','carX','carVx','speed','spin','spinDir','fuel','pickups','crashes','score','hitEvents'].forEach(function(k){self[k]=self.sim[k];});
            if(this.crashes>crashes)this.showToast(UI_T('打滑！反打方向稳住！'));
            else if(this.pickups>pickups)this.showToast(UI_T('补油成功'));
            if(this.sim.done)this.finish(this.sim.finished,this.sim.finished?'finish':this.fuel<=.01?'fuel':'timeout');
        }
    };
    DanboRocketRoad.prototype.objectSway=function(type,pattern,id){return Race.sway(this,type,pattern,id);};
    DanboRocketRoad.prototype.trafficSpeed=function(type,pattern,id){return Race.trafficSpeed(this,type,pattern,id);};
    DanboRocketRoad.prototype.eventDistance=function(ev,id,type){return Race.eventDistance(this,ev,id,type);};
    DanboRocketRoad.prototype.eventRel=function(ev,id,type){
        return this.eventDistance(ev,id,type|0)-this.progress;
    };

    DanboRocketRoad.prototype.updateRoad=function(){
        var first=this.progress-(this.progress%ROAD_SEG_LEN)-32;
        for(var i=0;i<this.roadSegments.length;i++){
            var abs=first+i*ROAD_SEG_LEN, sid=this.stageId||0, rel=abs-this.progress, g=this.roadSegments[i], rawWidth=this.R.roadWidthAt(abs), width=effectiveRoadWidth(rawWidth,abs,sid), cx=driveCenterAt(abs,sid), mats=this.stageMats&&this.stageMats[sid];
            if(mats){g.road.material=mats.road;g.leftRail.material=g.rightRail.material=mats.edge;g.leftField.material=mats.fields[i%mats.fields.length];g.rightField.material=mats.fields[(i+2)%mats.fields.length];for(var mm=0;mm<g.marks.length;mm++)g.marks[mm].material=mats.mark;if(g.branchRoad)g.branchRoad.material=mats.road;if(g.branchRails)for(var rr=0;rr<g.branchRails.length;rr++)g.branchRails[rr].material=mats.edge;if(g.branchMarks)for(var bb=0;bb<g.branchMarks.length;bb++)g.branchMarks[bb].material=mats.mark;}
            var bounds=roadOuterBounds(abs,sid,width);
            g.position.set(cx,0,PLAYER_Z+rel);g.road.scale.x=width;g.road.scale.z=ROAD_SEG_LEN+0.35;
            g.leftField.position.x=(bounds.min-cx)-2.35;g.rightField.position.x=(bounds.max-cx)+2.35;g.leftField.scale.z=g.rightField.scale.z=ROAD_SEG_LEN+0.35;
            g.leftField.scale.x=g.rightField.scale.x=4.2;
            // A continuous, inexpensive coastal water surface, not isolated
            // blue rectangles and not the main world's reflective water pass.
            if(sid===3){g.leftField.material=mats.water;g.leftField.scale.x=80;g.leftField.position.x=(bounds.min-cx)-40;}
            g.leftRail.position.x=-width*0.5-0.18;g.rightRail.position.x=width*0.5+0.18;
            for(var m=0;m<g.marks.length;m++){var mk=g.marks[m];mk.position.x=(-width*0.25)+(m*width*0.25);mk.visible=((Math.floor(abs/ROAD_SEG_LEN)+m)%2)===0;}
            var bw=sideRoadWidth(abs,sid), bcx=sideRoadCenterAt(abs,sid)-cx;
            if(g.branchRoad){
                var showBranch=bw>0.08;
                g.branchRoad.visible=showBranch;g.branchRoad.position.x=bcx;g.branchRoad.scale.x=bw;g.branchRoad.scale.z=ROAD_SEG_LEN+0.35;
                for(var bi=0;bi<g.branchRails.length;bi++){var br=g.branchRails[bi];br.visible=showBranch;br.position.x=bcx+(bi===0?-bw*0.5-0.16:bw*0.5+0.16);br.scale.z=ROAD_SEG_LEN+0.35;}
                for(var bj=0;bj<g.branchMarks.length;bj++){var bm=g.branchMarks[bj];bm.visible=showBranch&&((Math.floor(abs/ROAD_SEG_LEN)+bj)%2)===0;bm.position.x=bcx+(-bw*0.18+bj*bw*0.36);}
            }
            for(var f=0;f<g.flowers.length;f++){
                var fl=g.flowers[f], side=f<6?-1:1, row=f%6, wob=((Math.floor(abs/ROAD_SEG_LEN)+row)%2)*0.24;
                fl.position.x=(side<0?(bounds.min-cx):(bounds.max-cx))+side*(0.72+(row%3)*0.78+wob);
                fl.position.z=-ROAD_SEG_LEN*0.42+row*1.45;
                fl.visible=((Math.floor(abs/ROAD_SEG_LEN)+f)%3)!==0;
            }
        }
    };

    DanboRocketRoad.prototype.updateObjects=function(){
        var count=this.R.eventCount();
        for(var i=0;i<count;i++){
            var ev=this.R.eventAt(i), type=ev[2]|0, rel=this.eventRel(ev,i,type);
            var obj=this.objects[i];
            if(rel<-14||rel>110||this.hitEvents[i]&&type===5){if(obj)obj.mesh.visible=false;continue;}
            if(!obj){obj={mesh:this.makeObject(type,i),type:type};this.objects[i]=obj;this.objectGroup.add(obj.mesh);}obj.mesh.visible=true;
            var distance=this.eventDistance(ev,i,type), width=effectiveRoadWidth(this.R.roadWidthAt(distance),distance,this.stageId||0), x=driveCenterAt(distance,this.stageId||0)+this.R.laneX(ev[1]|0,width)+this.objectSway(type,ev[4],i);
            obj.mesh.position.set(x,0.02,PLAYER_Z+rel);
            obj.mesh.rotation.y=(type===3?Math.PI:0)+Math.sin(this.elapsed*1.5+i)*0.025;
            if(obj.mesh.halo)obj.mesh.halo.rotation.z+=0.04;
            if(obj.mesh.driver)obj.mesh.driver.rotation.y=Math.sin(this.elapsed*2+i)*0.05;
        }
    };

    DanboRocketRoad.prototype.updateStartGrid=function(){
        if(!this.startGridCars)return;
        var show=this.state==='countdown'||(this.state==='playing'&&this.elapsed<1.6);
        this.startGridGroup.visible=!!show;
        for(var i=0;i<this.startGridCars.length;i++){
            var c=this.startGridCars[i], mesh=c.mesh;
            if(!show){mesh.visible=false;continue;}
            var width=effectiveRoadWidth(this.R.roadWidthAt(this.progress+c.z),this.progress+c.z,this.stageId||0), x=driveCenterAt(this.progress+c.z,this.stageId||0)+this.R.laneX(c.lane,width), launch=this.state==='playing'?this.elapsed*(c.launch+22):0;
            mesh.visible=true;mesh.position.set(x,0.02,PLAYER_Z+c.z+launch);
            mesh.rotation.y=0;mesh.rotation.z=Math.sin((this.elapsed||0)*4+i)*0.015;
        }
    };

    DanboRocketRoad.prototype.updateScenery=function(){
        if(!this.decorItems)return;var first=Math.floor((this.progress-30)/14),st=STAGES[this.stageId||0];
        for(var i=0;i<this.decorItems.length;i++){
            var d=this.decorItems[i],index=first+d.slot,s=d.side>0?1:0,abs=index*14+((index%3+3)%3)*1.5+s*5,rel=abs-this.progress,mesh=d.mesh;
            if(index<0||abs>this.R.levelLength()+100||rel<-30||rel>90){mesh.visible=false;continue;}
            var kind=st.decor[(index+s*3)%st.decor.length];
            if(d.kind!==kind){mesh.clear();if(!d.variants[kind])d.variants[kind]=this.decorTemplates[kind].clone(true);mesh.add(d.variants[kind]);d.kind=kind;}
            var building=kind===1||kind===2,offset=kind===6?3.9:(building?1.65:2.5),width=effectiveRoadWidth(this.R.roadWidthAt(abs),abs,this.stageId||0),bounds=roadOuterBounds(abs,this.stageId||0,width);
            mesh.visible=true;mesh.position.set(d.side<0?bounds.min-offset:bounds.max+offset,0,PLAYER_Z+rel);mesh.scale.setScalar(building?1.05:0.92+(index%3)*0.08);
            mesh.rotation.y=kind===6||kind===8||kind===9||kind===10?0:building?Math.PI+d.side*0.18:d.side*0.25;
        }
    };

    DanboRocketRoad.prototype.updateFinishGate=function(){
        if(!this.finishGroup)return;
        var finish=this.R.levelLength(), rel=finish-this.progress, g=this.finishGroup;
        if(rel<-12||rel>150){g.visible=false;return;}
        var width=effectiveRoadWidth(this.R.roadWidthAt(finish),finish,this.stageId||0);
        g.visible=true;g.position.set(driveCenterAt(finish,this.stageId||0),0,PLAYER_Z+rel);
        g.stripe.scale.x=width+0.6;g.leftPole.position.x=-(width*0.5+0.95);g.rightPole.position.x=width*0.5+0.95;g.topBar.scale.x=width+2.1;
        for(var i=0;i<g.flags.length;i++){
            var f=g.flags[i], side=f.userData.side||1;
            f.position.x=side*(width*0.5+0.95)+(side<0?-0.56:0.56);f.position.z=0;f.rotation.y=side<0?Math.PI:0;
            f.position.y=3.15+(i%2)*0.62+Math.sin(this.elapsed*5+i)*0.05;
        }
        if(g.banner)g.banner.position.x=0;
    };

    DanboRocketRoad.prototype.updateVisuals=function(dt){
        this.updateRoad();this.updateObjects();this.updateStartGrid();this.updateScenery();this.updateFinishGate();
        var cx=driveCenterAt(this.progress||0,this.stageId||0);
        this.player.position.x=cx+(this.carX||0);this.player.rotation.z=-(this.carVx||0)*0.018+(this.spin>0?Math.sin(this.elapsed*28)*0.18*this.spinDir:0);this.player.rotation.y=(this.spin>0?Math.sin(this.elapsed*21)*0.22*this.spinDir:0);
        if(this.player.flame){var inp=this.inputState(),thrust=clamp((this.speed||0)/58,0.15,1);var s=(inp.turbo&&this.state==='playing')?(0.95+0.45*thrust):(0.42+0.42*thrust);this.player.flame.scale.set(0.18*s,0.18*s,0.45+thrust*0.18+Math.sin(this.elapsed*28)*0.04);this.player.flame.visible=this.state==='playing'&&this.speed>2;}
        this.world.position.x=0;
        this.camera.position.x=cx+(this.carX||0)*0.08;this.camera.position.z=-38;this.camera.lookAt(this.camera.position.x,0,6);
    };

    DanboRocketRoad.prototype.updateHud=function(){
        if(this.state!=='playing'&&this.state!=='countdown')return;var pct=clamp(this.progress/this.R.levelLength(),0,1), fuelPct=clamp(this.fuel/this.R.maxFuel(),0,1);
        var passed=0,count=this.R.eventCount();
        for(var i=0;i<count;i++){var ev=this.R.eventAt(i),typ=ev[2]|0;if(typ!==5&&typ!==6&&this.eventRel(ev,i,typ)<-3)passed++;}
        var rank=Math.max(1,40-Math.floor(passed/2)-Math.floor((this.progress||0)/260));
        var mins=Math.floor((this.elapsed||0)/60), secs=Math.floor((this.elapsed||0)%60);
        var q=function(sel){return this.root.querySelector(sel);}.bind(this), el;
        if((el=q('[data-rank]')))el.textContent=rank;
        if((el=q('[data-start-rank]')))el.textContent=rank;
        if((el=q('[data-time]')))el.textContent=mins+'′'+(secs<10?'0':'')+secs;
        if((el=q('[data-cars]')))el.textContent=passed;
        if((el=q('[data-km]')))el.textContent=fmt3((this.progress||0)/35.5)+'Km';
        if((el=q('[data-progress-line]')))el.style.width=(pct*100)+'%';
        if((el=q('[data-rpm]')))el.style.height=(clamp((this.speed||0)/62,0,1)*100)+'%';
        if((el=q('[data-fuel]')))el.style.width=(fuelPct*100)+'%';
        if((el=q('[data-fuel-value]')))el.textContent=Math.ceil(fuelPct*100)+'%';
    };

    DanboRocketRoad.prototype.loop=function(t){
        if(!this.running)return;var dt=Math.min(0.04,(t-this.last)/1000||0.016);this.last=t;
        if(this.toastTimer>0){this.toastTimer-=dt;if(this.toastTimer<=0)this.toast.style.display='none';}
        if(this.state==='countdown')this.updateCountdown(dt);else if(this.state==='playing')this.updatePlaying(dt);
        this.updateVisuals(dt);this.updateHud();this.renderer.render(this.scene,this.camera);
        var self=this;this.raf=requestAnimationFrame(function(nt){self.loop(nt);});
    };

    DanboRocketRoad.prototype.dispose=function(){
        if(!this.running)return;this.onBlur();this.running=false;this.stopMusic();if(this.raf)cancelAnimationFrame(this.raf);window.removeEventListener('resize',this.onResize);window.removeEventListener('keydown',this.onKeyDown,true);window.removeEventListener('keyup',this.onKeyUp,true);window.removeEventListener('blur',this.onBlur);document.removeEventListener('visibilitychange',this.onVisibility);if(this.root)this.root.removeEventListener('click',this.onClick);
        if(this.audioCtx&&this.audioCtx.close){var closing=this.audioCtx.close();if(closing&&closing.catch)closing.catch(function(){});}
        if(this.renderer){var a=this.assets;this.scene.traverse(function(o){if(o.geometry)a.geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(function(m){a.materials.add(m);if(m.map)a.textures.add(m.map);});});
            a.geometries.forEach(function(g){g.dispose();});a.materials.forEach(function(m){m.dispose();});a.textures.forEach(function(t){t.dispose();});this.renderer.dispose();a.geometries.clear();a.materials.clear();a.textures.clear();a.geometryCache={};a.materialCache={};this.decorTemplates={};this.decorItems=[];
        }
        if(this.root&&this.root.parentNode)this.root.parentNode.removeChild(this.root);
    };

    window.DanboRocketBoard.install(DanboRocketRoad.prototype);
    window.DanboRocketRoad={start:function(ctx){return new DanboRocketRoad(ctx);},fallback:fallback};
})();
