// rocket-road-core.js — Danbo Rocket Road plugin
// 3D presentation with 2D arcade-road rules. Pure rules live in danbo_rocket_road.wasm with JS fallback.
(function(){
    'use strict';

    var PLAYER_Z=-8.5;
    var ROAD_SEG_LEN=8;
    var BUILD=2026062716;

    function api(){return window.DANBO_MINIGAME_WASM&&window.DANBO_MINIGAME_WASM.rocketRoad;}
    function n(v,d){v=Number(v);return isFinite(v)?v:(d||0);}
    function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
    function smooth(t){t=clamp(t,0,1);return t*t*(3-2*t);}
    function roadCenterAt(distance){
        var raw=Math.max(0,n(distance)), sid=Math.floor(raw/STAGE_LENGTH), d=raw-sid*STAGE_LENGTH, phase=sid*0.73, c=0;
        c+=Math.sin(Math.max(0,d-360)*0.0062+phase)*1.15*smooth((d-360)/260);
        c+=Math.sin(Math.max(0,d-1080)*0.0085+1.8+phase*0.7)*0.95*smooth((d-1080)/360);
        c+=Math.sin(Math.max(0,d-1880)*0.0072+3.1+phase*1.1)*1.25*smooth((d-1880)/420);
        c+=Math.sin(Math.max(0,d-2620)*0.0100+0.4+phase*0.5)*0.72*smooth((d-2620)/320);
        return clamp(c,-2.15,2.15);
    }
    function fmt3(v){v=Math.max(0,Math.floor(n(v)));return (v<10?'00':(v<100?'0':''))+v;}
    var STAGE_LENGTH=3300, STAGE_COUNT=6, TOTAL_LENGTH=STAGE_LENGTH*STAGE_COUNT;
    var STAGES=[
        {name:'STAGE 1 · 绿城郊外',road:0xb8b9aa,fieldA:0x67d957,fieldB:0x78e962,edge:0x162818,decor:[1,0,4,2,3]},
        {name:'STAGE 2 · 森林弯道',road:0xb7b8aa,fieldA:0x43b946,fieldB:0x5ed65b,edge:0x0b3015,decor:[0,0,0,4,7]},
        {name:'STAGE 3 · 港湾高架',road:0xbfc0b5,fieldA:0x7fd9e8,fieldB:0x5fb7df,edge:0xf3f3f3,decor:[6,6,1,2,5]},
        {name:'STAGE 4 · 海岸公路',road:0xbec0ad,fieldA:0xe7c982,fieldB:0x65cbed,edge:0x1d5c74,decor:[8,8,3,4,0]},
        {name:'STAGE 5 · 峡谷荒原',road:0xb7b8a9,fieldA:0xd6a63f,fieldB:0xc38b2b,edge:0x5b3117,decor:[9,9,0,2,4]},
        {name:'STAGE 6 · 田园冲刺',road:0xbec0ac,fieldA:0xd6b846,fieldB:0x78d65a,edge:0x152515,decor:[10,10,0,5,1]}
    ];
    function stageIndexAt(distance){return Math.max(0,Math.min(STAGE_COUNT-1,Math.floor(clamp(n(distance),0,TOTAL_LENGTH-0.001)/STAGE_LENGTH)));}
    function stageLocal(distance){var d=clamp(n(distance),0,TOTAL_LENGTH);return d-stageIndexAt(d)*STAGE_LENGTH;}
    function mergeT(local){return smooth(n(local)/85);}
    function splitActive(stage,local){return (stage|0)===0&&n(local)<135;}
    function driveCenterAt(local,stage){
        local=n(local);stage=stage|0;
        var base=roadCenterAt(stage*STAGE_LENGTH+local);
        return splitActive(stage,local)?base+3.05*(1-mergeT(local)):base;
    }
    function sideRoadCenterAt(local,stage){
        local=n(local);stage=stage|0;
        var base=roadCenterAt(stage*STAGE_LENGTH+local);
        return splitActive(stage,local)?base-3.05*(1-mergeT(local)):base;
    }
    function effectiveRoadWidth(width,local,stage){
        width=n(width,10);local=n(local);stage=stage|0;
        return splitActive(stage,local)?(5.15+(width-5.15)*mergeT(local)):width;
    }
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
    function mat(color,opts){opts=opts||{};return new THREE.MeshStandardMaterial({color:color,roughness:opts.roughness===undefined?0.72:opts.roughness,metalness:opts.metalness||0,emissive:opts.emissive||0x000000,emissiveIntensity:opts.emissiveIntensity||0});}
    function colorFromCharacter(ch){var c=ch&&ch.style&&ch.style.color;if(!(typeof c==='number'&&isFinite(c)))c=ch&&ch.color;return (typeof c==='number'&&isFinite(c))?c:0x80EA7A;}
    function accentFromCharacter(ch){var c=ch&&ch.style&&ch.style.accent;if(!(typeof c==='number'&&isFinite(c)))c=ch&&ch.accent;return (typeof c==='number'&&isFinite(c))?c:0xffe15d;}
    function keyFromCharacter(ch){return String((ch&&(ch.key||ch.name||ch.id))||'egg').toLowerCase();}
    function charByIndex(i){
        var defs=(typeof CHAR_DEFS!=='undefined'&&CHAR_DEFS)||[];
        if(!defs.length)return {name:'egg',sf2:'Danbo',color:0xf5f5f0,accent:0xcc2222};
        i=Math.abs(i|0)%defs.length;return defs[i]||defs[0];
    }
    function addBox(parent,w,h,d,color,x,y,z){var m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));m.position.set(x||0,y||0,z||0);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
    function addWheel(parent,x,z){var geo=new THREE.CylinderGeometry(0.28,0.28,0.36,12);var mesh=new THREE.Mesh(geo,mat(0x252B35,{roughness:0.9}));mesh.rotation.z=Math.PI/2;mesh.position.set(x,0.28,z);mesh.castShadow=true;parent.add(mesh);return mesh;}
    function addCone(parent,r,h,color,x,y,z,rx,rz){var m=new THREE.Mesh(new THREE.ConeGeometry(r,h,10),mat(color));m.position.set(x||0,y||0,z||0);m.rotation.x=rx||0;m.rotation.z=rz||0;m.castShadow=true;parent.add(m);return m;}
    function addMiniDriver(parent,ch,scale,x,y,z,opts){
        opts=opts||{};
        var hero=!!opts.hero;
        var g=new THREE.Group(), bodyColor=colorFromCharacter(ch), accent=accentFromCharacter(ch), key=keyFromCharacter(ch);
        g.position.set(x||0,y||0,z||0);g.scale.setScalar(scale||1);
        if(hero){
            var seat=new THREE.Mesh(new THREE.TorusGeometry(0.48,0.055,8,30),mat(0xffffff,{roughness:0.55,emissive:accent,emissiveIntensity:0.08}));
            seat.rotation.x=Math.PI/2;seat.position.set(0,0.02,0);seat.castShadow=true;g.add(seat);
        }
        var body=new THREE.Mesh(new THREE.SphereGeometry(hero?0.46:0.38,hero?22:18,hero?16:12),mat(bodyColor,{roughness:0.82}));body.scale.set(0.9,1.06,0.84);body.position.y=0.08;body.castShadow=true;g.add(body);
        var head=new THREE.Mesh(new THREE.SphereGeometry(hero?0.37:0.3,hero?22:18,hero?16:12),mat(bodyColor,{roughness:0.82}));head.scale.set(0.98,0.92,0.94);head.position.set(0,hero?0.56:0.46,hero?0.02:0.08);head.castShadow=true;g.add(head);
        var eyeGeo=new THREE.SphereGeometry(hero?0.052:0.04,8,6), eyeMat=mat(0x1f2933);
        var e1=new THREE.Mesh(eyeGeo,eyeMat),e2=new THREE.Mesh(eyeGeo,eyeMat);e1.position.set(-0.1,0.5,0.34);e2.position.set(0.1,0.5,0.34);g.add(e1);g.add(e2);
        if(hero){
            e1.position.set(-0.13,0.61,-0.34);e2.position.set(0.13,0.61,-0.34);
            var shineGeo=new THREE.SphereGeometry(0.016,6,4), shineMat=mat(0xffffff,{emissive:0xffffff,emissiveIntensity:0.25});
            var sh1=new THREE.Mesh(shineGeo,shineMat),sh2=new THREE.Mesh(shineGeo,shineMat);sh1.position.set(-0.145,0.628,-0.377);sh2.position.set(0.115,0.628,-0.377);g.add(sh1);g.add(sh2);
            var cheekGeo=new THREE.SphereGeometry(0.045,8,6), cheekMat=mat(0xff8ba0,{roughness:0.8});
            var c1=new THREE.Mesh(cheekGeo,cheekMat),c2=new THREE.Mesh(cheekGeo,cheekMat);c1.scale.set(1.25,0.72,0.42);c2.scale.set(1.25,0.72,0.42);c1.position.set(-0.28,0.51,-0.32);c2.position.set(0.28,0.51,-0.32);g.add(c1);g.add(c2);
            addBox(g,0.44,0.08,0.07,accent,0,0.9,-0.06);
        }
        if(key.indexOf('bull')>=0){
            addCone(g,0.08,0.26,0xfff0c0,-0.25,0.58,0.06,0,Math.PI/2);
            addCone(g,0.08,0.26,0xfff0c0,0.25,0.58,0.06,0,-Math.PI/2);
        }else if(key.indexOf('cat')>=0||key.indexOf('dog')>=0){
            addCone(g,0.1,0.28,accent,-0.2,0.7,0.02,0,-0.28);
            addCone(g,0.1,0.28,accent,0.2,0.7,0.02,0,0.28);
        }else if(key.indexOf('bear')>=0||key.indexOf('monkey')>=0){
            var earGeo=new THREE.SphereGeometry(hero?0.15:0.11,10,8), earMat=mat(accent,{roughness:0.82});
            var l=new THREE.Mesh(earGeo,earMat), r=new THREE.Mesh(earGeo,earMat);
            l.position.set(hero?-0.31:-0.25,hero?0.67:0.55,hero?-0.12:0.02);
            r.position.set(hero?0.31:0.25,hero?0.67:0.55,hero?-0.12:0.02);
            l.castShadow=r.castShadow=true;g.add(l);g.add(r);
        }else if(key.indexOf('rooster')>=0){
            addBox(g,0.09,0.2,0.08,0xff344d,-0.09,0.72,0.03);addBox(g,0.09,0.25,0.08,0xff344d,0,0.75,0.04);addBox(g,0.09,0.18,0.08,0xff344d,0.09,0.71,0.03);
        }else if(key.indexOf('cockroach')>=0){
            addBox(g,0.04,0.34,0.04,accent,-0.16,0.72,0.1).rotation.z=-0.45;addBox(g,0.04,0.34,0.04,accent,0.16,0.72,0.1).rotation.z=0.45;
        }else{
            addBox(g,0.42,0.1,0.08,accent,0,0.72,0.04);
        }
        parent.add(g);return g;
    }

    var fallback={
        levelLength:function(){return 3300;},
        maxFuel:function(){return 100;},
        roadWidthAt:function(distance){var d=clamp(n(distance),0,3300);if(d<420)return 10.8;if(d<880)return 11.4;if(d<1260)return 9.7;if(d<1710)return 11.1;if(d<2260)return 8.9;if(d<2860)return 10.2;return 11.7;},
        laneX:function(lane,width){lane=Math.max(0,Math.min(3,lane|0));var inner=n(width,10)*0.84;return -inner*0.5+inner*(lane+0.5)/4;},
        eventCount:function(){return 90;},
        eventAt:function(i){
            i=Math.max(0,Math.min(89,i|0));var j,z,l,t,b=0;
            if(i<18){j=i;z=46+j*38;l=(j*2+1)%4;t=(j===5||j===14)?5:(j%6===0?2:1);b=t===5?18:0;return [z,l,t,0,j%3,b];}
            if(i<42){j=i-18;z=970+j*45;l=(j*3+2)%4;t=(j===4||j===17)?5:(j%8===0?6:(j%7===0?4:(j%3===0?3:2)));b=t===5?20:0;return [z,l,t,0,j%4,b];}
            if(i<68){j=i-42;z=1880+j*40;l=(j*5+1)%4;t=(j===8||j===21)?5:(j%6===0?6:(j%7===2?4:(j%2===0?3:2)));b=t===5?22:0;return [z,l,t,0,j%5,b];}
            j=i-68;z=2850+j*29;l=(j*7+3)%4;t=(j===11)?5:(j%9===0?6:(j%5===0?4:(j%3===0?3:2)));b=t===5?24:0;return [z,l,t,0,j%6,b];
        },
        speedFor:function(turbo,brake,spinning,fuel){if(fuel<=0)return 0;var s=brake?26:(turbo?62:48);if(spinning)s=20;if(fuel<12)s*=0.72;return s;},
        speedStep:function(current,turbo,brake,spinning,fuel,dt){current=clamp(n(current),0,84);var target=fallback.speedFor(turbo,brake,spinning,fuel),rate;if(target>current)rate=turbo?50:36;else if(fuel<=0)rate=64;else if(spinning)rate=58;else if(brake)rate=56;else rate=26;if(current<5&&target>current)rate*=1.35;var maxDelta=rate*clamp(n(dt),0,0.08),delta=target-current;if(Math.abs(delta)<=maxDelta)return target;return clamp(current+(delta<0?-1:1)*maxDelta,0,84);},
        fuelAfter:function(fuel,dt,turbo,brake){var r=turbo?1.55:(brake?0.55:0.82);return clamp(n(fuel)-r*n(dt),0,100);},
        playerStep:function(x,vx,steer,dt,spinning,width){var control=spinning?0.22:1;vx+=clamp(steer,-1,1)*58*control*dt;var drag=Math.abs(steer)<0.01?10.0:4.8;vx*=clamp(1-drag*dt,0,1);vx=clamp(vx,-21,21);var half=width*0.5-0.68;x+=vx*dt;if(x>half){x=half;vx=-Math.abs(vx)*0.32;}if(x<-half){x=-half;vx=Math.abs(vx)*0.32;}return [x,vx];},
        collide:function(px,pz,ox,oz,t){var hx=1.1,hz=2.05;if(t===4){hx=1.55;hz=3.15;}else if(t===5){hx=1.18;hz=2.15;}else if(t===6){hx=1.65;hz=1.15;}else if(t===3){hx=1.16;hz=2.2;}else if(t===2){hx=1.2;hz=2.25;}return Math.abs(px-ox)<=hx&&Math.abs(pz-oz)<=hz;},
        score:function(progress,fuel,pickups,crashes,finished){var s=Math.floor(clamp(progress,0,3300)*3)+pickups*500+Math.floor(Math.max(0,fuel)*22)-crashes*350+(finished?2500:0);return Math.max(0,s);},
        finishReached:function(progress){return progress>=3300;}
    };

    function rules(){
        var a=api();
        return {
            mode:a?a.mode:'js-fallback',
            levelLength:function(){return a&&a.levelLength?a.levelLength():fallback.levelLength();},
            maxFuel:function(){return a&&a.maxFuel?a.maxFuel():fallback.maxFuel();},
            roadWidthAt:function(d){return a&&a.roadWidthAt?a.roadWidthAt(d):fallback.roadWidthAt(d);},
            laneX:function(l,w){return a&&a.laneX?a.laneX(l,w):fallback.laneX(l,w);},
            eventCount:function(){return a&&a.eventCount?a.eventCount():fallback.eventCount();},
            eventAt:function(i){return a&&a.eventAt?a.eventAt(i):fallback.eventAt(i);},
            speedFor:function(t,b,s,f){return a&&a.speedFor?a.speedFor(t,b,s,f):fallback.speedFor(t,b,s,f);},
            speedStep:function(cur,t,b,s,f,dt){return a&&a.speedStep?a.speedStep(cur,t,b,s,f,dt):fallback.speedStep(cur,t,b,s,f,dt);},
            fuelAfter:function(f,dt,t,b){return a&&a.fuelAfter?a.fuelAfter(f,dt,t,b):fallback.fuelAfter(f,dt,t,b);},
            playerStep:function(x,vx,st,dt,sp,w){return a&&a.playerStep?a.playerStep(x,vx,st,dt,sp,w):fallback.playerStep(x,vx,st,dt,sp,w);},
            collide:function(px,pz,ox,oz,t){return a&&a.collide?a.collide(px,pz,ox,oz,t):fallback.collide(px,pz,ox,oz,t);},
            score:function(p,f,pk,c,fin){return a&&a.score?a.score(p,f,pk,c,fin):fallback.score(p,f,pk,c,fin);},
            finishReached:function(p){return a&&a.finishReached?a.finishReached(p):fallback.finishReached(p);}
        };
    }

    function DanboRocketRoad(ctx){
        this.ctx=ctx;this.ch=ctx.character||{};this.R=rules();this.stageId=0;this.unlockedStage=this.getUnlockedStage();this.state='title';this.keys={};this.touch={};this.objects={};this.hitEvents={};this.eventCache=[];this.running=true;this.last=performance.now();this.menuIndex=0;this.toastTimer=0;
        this.root=document.createElement('div');this.root.className='rr-root';this.root.innerHTML=this.html();ctx.mount.appendChild(this.root);
        this.canvas=this.root.querySelector('canvas');this.panel=this.root.querySelector('.rr-panel');this.hud=this.root.querySelector('.rr-hud');this.toast=this.root.querySelector('.rr-toast');this.touchLayer=this.root.querySelector('.rr-touch');this.steerPad=this.root.querySelector('[data-steer-pad]');this.steerKnob=this.root.querySelector('.rr-steer-knob');this.countdownEl=this.root.querySelector('.rr-countdown');this.stageEl=this.root.querySelector('.rr-stage-banner');this.startRankEl=this.root.querySelector('.rr-start-rank');
        this.init3D();this.bind();this.showTitle();
        if(ctx.net)ctx.net.send('minigame.ready',{pluginId:ctx.pluginId,characterId:this.ch.id,build:BUILD});
        var self=this;this.raf=requestAnimationFrame(function(t){self.loop(t);});
    }

    DanboRocketRoad.prototype.html=function(){
        return '<style>'+
        '.rr-root{position:absolute;inset:0;overflow:hidden;background:#05070c;font-family:"Segoe UI",Arial,sans-serif;color:#fff;touch-action:none;}'+
        '.rr-root canvas{position:absolute;inset:0;width:100%;height:100%;display:block;}'+
        '.rr-panel{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(90vw,520px);padding:24px;border-radius:28px;background:linear-gradient(180deg,rgba(21,42,75,.92),rgba(9,18,38,.96));box-shadow:0 26px 70px rgba(0,0,0,.45),inset 0 0 0 3px rgba(255,255,255,.12);text-align:center;backdrop-filter:blur(8px);}'+
        '.rr-title{font-size:36px;font-weight:1000;letter-spacing:.04em;color:#fff6a0;text-shadow:0 4px 0 #b95b1a,0 0 20px rgba(255,220,80,.55);margin:0 0 4px;}'+
        '.rr-sub{opacity:.85;font-size:14px;margin-bottom:18px;}'+
        '.rr-menu-btn{display:block;width:100%;border:0;border-radius:18px;margin:10px 0;padding:14px 16px;background:linear-gradient(180deg,#ffe180,#ffab3d);color:#5a2e08;font-size:18px;font-weight:1000;box-shadow:0 5px 0 #b85d1b;cursor:pointer;}'+
        '.rr-menu-btn:hover,.rr-menu-btn.rr-selected{filter:brightness(1.1);transform:translateY(-1px);}'+
        '.rr-menu-btn[disabled]{opacity:.48;filter:grayscale(.25);cursor:not-allowed;box-shadow:0 4px 0 #555;background:#bfc5cf;color:#334;}'+
        '.rr-small{font-size:12px;opacity:.75;line-height:1.55;margin-top:14px;}'+
        '.rr-hud{position:absolute;inset:0;display:none;pointer-events:none;font-family:"Arial Black","Segoe UI",sans-serif;text-shadow:2px 2px 0 #000;}'+
        '.rr-top-track{position:absolute;left:0;right:92px;top:0;height:22px;background:#08123b;border-bottom:3px solid #f2b328;color:#ffdf49;font-size:12px;font-weight:1000;display:flex;align-items:center;gap:6px;padding:0 5px;letter-spacing:.04em;}'+
        '.rr-top-track i{position:relative;flex:1;height:5px;background:repeating-linear-gradient(90deg,#f6c245 0 2px,transparent 2px 12px);border-top:1px solid #f6c245;border-bottom:1px solid #f6c245;}'+
        '.rr-top-track i em{position:absolute;left:0;top:-2px;height:9px;width:0;background:#ff4b3d;box-shadow:0 0 7px #ff4b3d;}'+
        '.rr-side{position:absolute;right:0;top:0;bottom:0;width:92px;background:#02050b;border-left:3px solid #111c54;color:#fff;display:flex;flex-direction:column;align-items:center;padding-top:4px;box-sizing:border-box;}'+
        '.rr-hi{font-size:13px;line-height:1.05;align-self:flex-end;text-align:right;padding-right:5px;color:#fff;}'+
        '.rr-label{margin-top:8px;min-width:58px;padding:2px 4px;border:2px solid #8fc7ff;border-radius:5px;background:#344b72;color:#fff;font-size:13px;font-weight:1000;text-align:center;box-shadow:inset 0 0 0 2px #0b1028;}'+
        '.rr-value{font-size:20px;line-height:1.05;font-weight:1000;color:#fff;margin-top:1px;}'+
        '.rr-value.yellow{color:#ffd54a}.rr-value.red{color:#ff5b47}.rr-value.small{font-size:15px;color:#80eaff;}'+
        '.rr-meter-wrap{display:flex;gap:8px;margin-top:auto;margin-bottom:10px;align-items:flex-end;}'+
        '.rr-meter-col{display:flex;flex-direction:column;align-items:center;font-size:10px;color:#fff;font-weight:1000;}'+
        '.rr-meter{position:relative;width:20px;height:118px;background:#241006;border:2px solid #6a3d20;box-shadow:inset 0 0 0 1px #000;overflow:hidden;}'+
        '.rr-meter i{position:absolute;left:0;right:0;bottom:0;height:0;background:repeating-linear-gradient(0deg,#d99a48 0 4px,#4b2d17 4px 6px);}'+
        '.rr-meter.rpm i{background:#6d6bff;box-shadow:0 0 8px #6d6bff;}'+
        '.rr-km{font-size:14px;color:#d8e5ff;margin-bottom:8px;}'+
        '.rr-top-exit{position:absolute;right:8px;top:25px;pointer-events:auto;border:0;border-radius:7px;padding:4px 7px;background:rgba(255,255,255,.16);color:#fff;font-weight:1000;font-size:11px;}'+
        '.rr-start-rank{position:absolute;left:calc(50% - 46px);top:13%;transform:translateX(-50%);display:none;pointer-events:none;text-align:center;font-family:"Arial Black","Segoe UI",sans-serif;text-shadow:3px 3px 0 #121212;}'+
        '.rr-start-rank span{display:block;font-size:clamp(34px,9vw,70px);line-height:.9;color:#ffe84a;-webkit-text-stroke:2px #111;}'+
        '.rr-start-rank b{display:block;font-size:clamp(46px,12vw,92px);line-height:.9;color:#ff3c31;-webkit-text-stroke:2px #111;}'+
        '.rr-toast{position:absolute;left:50%;bottom:22%;transform:translateX(-50%);padding:10px 16px;border-radius:18px;background:rgba(0,0,0,.66);font-weight:900;display:none;}'+
        '.rr-stage-banner{position:absolute;left:calc(50% - 46px);top:8%;transform:translate(-50%,-50%);display:none;pointer-events:none;padding:5px 12px;border-radius:4px;background:#0b1642;border:2px solid #f5bc32;font-size:clamp(12px,3.3vw,17px);font-weight:1000;color:#fff;text-shadow:2px 2px 0 #000;letter-spacing:.04em;white-space:nowrap;}'+
        '.rr-countdown{position:absolute;left:calc(50% - 46px);top:43%;transform:translate(-50%,-50%);display:none;pointer-events:none;font-size:clamp(56px,16vw,126px);font-weight:1000;color:#fff6a0;text-shadow:0 7px 0 #c6512d,0 0 28px rgba(255,232,88,.8),0 18px 40px rgba(0,0,0,.45);letter-spacing:.04em;}'+
        '.rr-touch{position:absolute;inset:0;display:none;pointer-events:none;}'+
        '.rr-steer-pad{position:absolute;left:24px;bottom:calc(92px + env(safe-area-inset-bottom));width:98px;height:98px;border-radius:50%;border:3px solid rgba(255,255,255,.38);background:radial-gradient(circle,rgba(255,255,255,.24),rgba(255,255,255,.08));box-shadow:0 7px 18px rgba(0,0,0,.26),inset 0 0 0 2px rgba(255,255,255,.13);pointer-events:auto;touch-action:none;}'+
        '.rr-steer-pad:before{content:"方向";position:absolute;left:0;right:0;top:-22px;text-align:center;color:rgba(255,255,255,.82);font-size:12px;font-weight:1000;text-shadow:0 2px 3px #000;}'+
        '.rr-steer-knob{position:absolute;left:50%;top:50%;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(255,255,255,.72);box-shadow:0 5px 16px rgba(0,0,0,.35),inset 0 0 0 4px rgba(255,255,255,.42);color:#2c4762;font-size:18px;font-weight:1000;display:flex;align-items:center;justify-content:center;}'+
        '.rr-pedal{position:absolute;bottom:calc(82px + env(safe-area-inset-bottom));width:92px;height:44px;border-radius:14px 14px 22px 22px;border:2px solid rgba(255,255,255,.42);color:#fff;font-size:15px;font-weight:1000;pointer-events:auto;text-shadow:0 2px 3px #000;transform:skewX(-8deg);box-shadow:0 7px 14px rgba(0,0,0,.36),inset 0 5px 0 rgba(255,255,255,.18),inset 0 -5px 0 rgba(0,0,0,.18);}'+
        '.rr-pedal:after{content:"";position:absolute;left:12px;right:12px;top:9px;bottom:9px;border-radius:10px;background:repeating-linear-gradient(90deg,rgba(255,255,255,.32) 0 4px,transparent 4px 12px);opacity:.65;pointer-events:none;}'+
        '.rr-throttle{right:96px;background:linear-gradient(180deg,rgba(255,230,105,.64),rgba(255,145,31,.58))!important;border-color:rgba(255,224,128,.7)!important;}'+
        '.rr-brake{right:224px;background:linear-gradient(180deg,rgba(135,220,255,.58),rgba(58,132,255,.48))!important;border-color:rgba(160,220,255,.72)!important;}'+
        '.rr-pedal.rr-pressed{filter:brightness(1.24);transform:skewX(-8deg) translateY(5px) scale(.98);box-shadow:0 4px 10px rgba(0,0,0,.42),0 0 22px rgba(255,232,120,.45),inset 0 4px 0 rgba(255,255,255,.16),inset 0 -3px 0 rgba(0,0,0,.24);}'+
        '.rr-list{margin:12px 0;text-align:left;background:rgba(255,255,255,.08);border-radius:18px;padding:12px 16px;line-height:1.8;}'+
        '@media (max-width:760px){.rr-title{font-size:28px}.rr-panel{padding:18px}.rr-touch{display:block}.rr-menu-btn{padding:12px;font-size:16px}.rr-side{width:84px}.rr-top-track{right:84px}.rr-countdown,.rr-stage-banner,.rr-start-rank{left:calc(50% - 42px)}.rr-meter{height:102px;width:18px}.rr-steer-pad{left:30px;bottom:calc(88px + env(safe-area-inset-bottom));width:88px;height:88px}.rr-steer-knob{width:40px;height:40px;margin:-20px 0 0 -20px}.rr-pedal{bottom:calc(92px + env(safe-area-inset-bottom));width:86px;height:42px}.rr-throttle{right:98px}.rr-brake{right:224px}}'+
        '</style><canvas></canvas><div class="rr-hud"><div class="rr-top-track"><b>START</b><i><em data-progress-line></em></i><b>CHECK</b></div><div class="rr-side"><div class="rr-hi">HI<br>10000</div><div class="rr-label">RANK</div><div class="rr-value" data-rank>40</div><div class="rr-label">TIME</div><div class="rr-value yellow" data-time>0′00</div><div class="rr-label">CARS</div><div class="rr-value" data-cars>0</div><div class="rr-km" data-km>000Km</div><div class="rr-meter-wrap"><div class="rr-meter-col"><div class="rr-meter rpm"><i data-rpm></i></div><span>RPM</span></div><div class="rr-meter-col"><div class="rr-meter fuel"><i data-fuel></i></div><span>FUEL</span></div></div><button class="rr-top-exit" data-action="quit-run">退出</button></div></div><div class="rr-start-rank"><span>RANK</span><b data-start-rank>40</b></div><div class="rr-panel"></div><div class="rr-stage-banner"></div><div class="rr-countdown"></div><div class="rr-toast"></div><div class="rr-touch"><div class="rr-steer-pad" data-steer-pad><div class="rr-steer-knob">↔</div></div><button class="rr-pedal rr-brake" data-touch="brake">刹车</button><button class="rr-pedal rr-throttle" data-touch="boost">油门</button></div>';
    };

    DanboRocketRoad.prototype.init3D=function(){
        this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
        this.renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
        if(THREE.SRGBColorSpace)this.renderer.outputColorSpace=THREE.SRGBColorSpace;
        this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x6bdd72);this.scene.fog=null;
        this.camera=new THREE.OrthographicCamera(-14,14,24,-22,0.1,220);this.camera.up.set(0,0,1);this.camera.position.set(0,72,5);this.camera.lookAt(0,0,5);
        var hemi=new THREE.HemisphereLight(0xffffff,0x7ccf68,1.65);this.scene.add(hemi);
        var sun=new THREE.DirectionalLight(0xfff3d5,1.25);sun.position.set(-16,42,-18);this.scene.add(sun);
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
            fields:[mat(st.fieldA,{roughness:0.9}),mat(st.fieldB,{roughness:0.88}),mat(st.fieldA,{roughness:0.9}),mat(st.fieldB,{roughness:0.88})]
        };});
        var roadMat=this.stageMats[0].road, edgeMat=this.stageMats[0].edge, markMat=this.stageMats[0].mark;
        var fieldMats=this.stageMats[0].fields,
            flowerMats=[mat(0xffef66,{emissive:0x443300,emissiveIntensity:0.06}),mat(0xff7db5,{emissive:0x331122,emissiveIntensity:0.06}),mat(0xffffff),mat(0x48c9ff,{emissive:0x113344,emissiveIntensity:0.05})];
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
        var grassGeo=new THREE.PlaneGeometry(260,260);var grass=new THREE.Mesh(grassGeo,mat(0x63d860,{roughness:0.9}));grass.rotation.x=-Math.PI/2;grass.position.y=-0.08;grass.receiveShadow=true;this.world.add(grass);
    };

    DanboRocketRoad.prototype.buildPlayerCar=function(){
        var g=new THREE.Group();var bodyColor=0xff5151;
        addBox(g,1.65,0.46,2.75,bodyColor,0,0.45,0);
        addBox(g,1.25,0.36,1.15,0xffd05a,0,0.83,-0.15);
        addBox(g,0.92,0.24,0.65,0x82d8ff,0,1.05,-0.2);
        addBox(g,1.05,0.18,0.58,0x27384d,0,1.02,0.44);
        addBox(g,1.25,0.28,0.38,0x6b3333,0,0.62,-1.32);
        addWheel(g,-0.92,-0.82);addWheel(g,0.92,-0.82);addWheel(g,-0.92,0.86);addWheel(g,0.92,0.86);
        var nozzle=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.28,0.5,12),mat(0x4b5360,{metalness:0.1}));nozzle.rotation.x=Math.PI/2;nozzle.position.set(0,0.45,-1.66);g.add(nozzle);
        var flame=new THREE.Mesh(new THREE.ConeGeometry(0.28,0.9,16),mat(0xffad2d,{emissive:0xff6600,emissiveIntensity:0.85}));flame.rotation.x=-Math.PI/2;flame.position.set(0,0.45,-2.12);g.add(flame);g.flame=flame;
        g.driver=addMiniDriver(g,this.ch,1.52,0,1.25,-0.34,{hero:true});
        g.position.set(0,0.2,PLAYER_Z);return g;
    };

    DanboRocketRoad.prototype.makeObject=function(type,id){
        var g=new THREE.Group();type=type|0;g.userData.type=type;
        if(type===6){var oil=new THREE.Mesh(new THREE.CylinderGeometry(1.25,1.55,0.04,24),mat(0x111923,{roughness:0.35,metalness:0.05}));oil.scale.z=0.62;oil.position.y=0.06;g.add(oil);return g;}
        var color=type===2?0xff4f4f:(type===3?0x4f8dff:(type===4?0x5ad1c0:(type===5?0xffe15d:0xffd34d)));
        var w=type===4?2.1:1.45,d=type===4?3.9:2.55,h=type===4?0.78:0.46;
        addBox(g,w,h,d,color,0,0.42,0);addBox(g,w*0.72,0.34,d*0.38,type===5?0xffffff:0x87d7ff,0,0.86,0.28);
        addWheel(g,-w*0.58,-d*0.28);addWheel(g,w*0.58,-d*0.28);addWheel(g,-w*0.58,d*0.32);addWheel(g,w*0.58,d*0.32);
        if(type!==5)g.driver=addMiniDriver(g,charByIndex((id||0)*3+type),type===4?0.72:0.62,0,0.92,0.16);
        if(type===5){var halo=new THREE.Mesh(new THREE.TorusGeometry(1.25,0.08,8,28),mat(0x70ff9b,{emissive:0x30ff70,emissiveIntensity:0.7}));halo.rotation.x=Math.PI/2;halo.position.y=1.1;g.add(halo);g.halo=halo;}
        return g;
    };

    DanboRocketRoad.prototype.makeDecor=function(kind){
        var g=new THREE.Group();kind=kind|0;g.userData.kind=kind;
        if(kind===0){
            var trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.25,1.25,8),mat(0x8d5b34));trunk.position.y=0.62;g.add(trunk);
            var crown=new THREE.Mesh(new THREE.ConeGeometry(0.95,1.8,9),mat(0x2abf62,{roughness:0.84}));crown.position.y=1.78;g.add(crown);
            var dot=new THREE.Mesh(new THREE.SphereGeometry(0.14,8,6),mat(0xfff07a,{emissive:0x553300,emissiveIntensity:0.1}));dot.position.set(0.28,1.85,0.18);g.add(dot);
        }else if(kind===1){
            addBox(g,2.65,0.18,1.65,0x58c86f,0,0.08,0.05);
            addBox(g,2.35,1.35,1.18,0xffd8a8,0,0.76,0);
            addBox(g,2.65,0.28,1.45,0xff7e67,0,1.54,0);
            addBox(g,2.9,0.12,0.2,0xd65746,0,1.68,-0.68);addBox(g,2.9,0.12,0.2,0xd65746,0,1.68,0.68);
            for(var i=0;i<3;i++){addBox(g,0.36,0.22,0.05,0x9edfff,-0.72+i*0.72,1.05,0.62);addBox(g,0.28,0.04,0.06,0xffffff,-0.72+i*0.72,1.18,0.66);}
            addBox(g,0.48,0.5,0.06,0x7a4b2a,0,0.42,0.66);addBox(g,0.08,0.08,0.03,0xffe56a,0.16,0.5,0.71);
            addBox(g,1.15,0.08,1.75,0xd9d2ba,-1.85,0.08,0.05);
            addBox(g,0.78,0.18,1.15,0x52c8f2,1.75,0.12,-0.15);addBox(g,0.9,0.06,1.28,0xeaffff,1.75,0.25,-0.15);
            addBox(g,0.58,0.18,0.98,0xffc94a,-1.9,0.2,-0.62);addBox(g,0.4,0.08,0.22,0x222831,-1.9,0.34,-0.28);
            for(var fp=0;fp<5;fp++){addBox(g,0.08,0.18,0.08,0xffffff,-1.28+fp*0.64,0.18,-1.02);addBox(g,0.08,0.18,0.08,0xffffff,-1.28+fp*0.64,0.18,1.02);}
        }else if(kind===2){
            addBox(g,2.8,0.12,1.45,0xc9d9e6,0,0.06,0.22);
            addBox(g,2.45,1.1,1.08,0xfff0b5,0,0.62,0.2);
            addBox(g,2.7,0.18,1.25,0x4aa3ff,0,1.22,0.2);
            addBox(g,1.9,0.18,0.11,0xff5f6d,0,1.4,0.82);addBox(g,1.45,0.12,0.12,0xffffff,0,1.18,0.84);
            addBox(g,0.5,0.52,0.06,0x2a3748,-0.74,0.36,0.76);addBox(g,0.5,0.52,0.06,0x2a3748,0,0.36,0.76);addBox(g,0.5,0.52,0.06,0x2a3748,0.74,0.36,0.76);
            addBox(g,0.18,2.3,0.18,0xffffff,-1.45,1.15,0.85);addBox(g,0.18,2.3,0.18,0xffffff,1.45,1.15,0.85);
            var board=new THREE.Mesh(new THREE.BoxGeometry(2.35,0.78,0.12),mat(0xfff49a,{emissive:0x443300,emissiveIntensity:0.08}));board.position.set(0,1.9,0.92);g.add(board);
            addBox(g,1.55,0.14,0.14,0xff5f6d,0,2.08,1.0);addBox(g,1.05,0.12,0.14,0x43c6ff,0,1.82,1.0);
            addBox(g,1.05,0.08,1.65,0xb0b6bd,1.9,0.08,0.1);addBox(g,0.52,0.18,0.96,0x4f8dff,1.95,0.2,-0.28);
        }else if(kind===3){
            for(var b=0;b<4;b++){var bal=new THREE.Mesh(new THREE.SphereGeometry(0.28,12,8),mat([0xff6978,0xffe36d,0x62d6ff,0xa7f56d][b],{emissive:0x111111,emissiveIntensity:0.04}));bal.position.set((b-1.5)*0.25,1.8+(b%2)*0.28,(b%3)*0.12);g.add(bal);}
            addBox(g,0.08,1.45,0.08,0xffffff,0,0.9,0);
        }else if(kind===4){
            for(var f=0;f<5;f++){var fl=new THREE.Mesh(new THREE.SphereGeometry(0.16,8,6),mat(f%2?0xffe76b:0xff78b9,{emissive:0x331111,emissiveIntensity:0.08}));fl.position.set(-0.8+f*0.4,0.2,(f%2)*0.22);g.add(fl);}
            addBox(g,2.1,0.16,0.5,0x38b764,0,0.08,0.1);
        }else if(kind===5){
            addBox(g,0.14,2.0,0.14,0xeff5ff,-0.58,1.0,0);addBox(g,0.14,2.0,0.14,0xeff5ff,0.58,1.0,0);
            var fg=new THREE.Group();for(var y=0;y<2;y++)for(var x=0;x<4;x++)addBox(fg,0.28,0.22,0.04,(x+y)%2?0x1b2638:0xffffff,-0.42+x*0.28,1.65-y*0.22,0);
            g.add(fg);
        }else if(kind===6){
            addBox(g,3.4,0.18,7.4,0x9fe8ff,0,0.09,0);
            addBox(g,3.05,0.12,6.85,0xcff6ff,0,0.23,0);
            for(var s=0;s<7;s++)addBox(g,3.15,0.04,0.08,0xffffff,0,0.32,-3+s*1.0);
            addBox(g,0.18,1.1,7.4,0x55bde9,-1.78,0.55,0);addBox(g,0.18,1.1,7.4,0x55bde9,1.78,0.55,0);
        }else if(kind===8){
            addBox(g,3.8,0.1,7.8,0x66d4f2,0,0.05,0);
            for(var w=0;w<5;w++)addBox(g,3.0,0.04,0.12,0xffffff,0,0.16,-3+w*1.5);
            addBox(g,0.35,0.08,7.8,0xe8cf86,-2.15,0.08,0);
        }else if(kind===9){
            for(var r=0;r<5;r++)addBox(g,1.2+0.25*(r%2),0.38,0.8,0x7a4b22,0,0.18+r*0.13,-3+r*1.45);
            addBox(g,1.0,2.6,7.6,0x3a1d10,1.15,1.3,0);
        }else if(kind===10){
            addBox(g,3.8,0.08,7.8,0xd7b84d,0,0.04,0);
            for(var fy=0;fy<6;fy++)addBox(g,3.5,0.05,0.08,0xf2de8a,0,0.14,-3.3+fy*1.15);
            for(var fx=0;fx<4;fx++)addBox(g,0.08,0.06,7.1,0x8fc04d,-1.5+fx*1.0,0.15,0);
        }else{
            addBox(g,1.35,0.16,3.4,0x111827,0,0.08,0);
            for(var c=0;c<4;c++)addBox(g,0.25,0.22,0.18,(c%2)?0xffffff:0xffe45d,-0.48+c*0.32,0.24,0);
            addBox(g,1.1,0.08,0.12,0xffe45d,0,0.34,-1.2);addBox(g,1.1,0.08,0.12,0xffe45d,0,0.34,1.2);
        }
        g.traverse(function(o){if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
        return g;
    };

    DanboRocketRoad.prototype.buildScenery=function(){
        this.decorItems=[];
        var length=this.R.levelLength?this.R.levelLength():3300, sid=this.stageId||0, st=STAGES[sid]||STAGES[0];
        for(var i=0;i<104;i++){
            var abs=18+i*34+(i%5)*5;if(abs>length+220)break;
            for(var s=0;s<2;s++){
                var side=s?1:-1, kind;
                if(side>0&&i%5===1)kind=st.decor[(i+s)%st.decor.length];else if(i%9===0)kind=st.decor[(i+2+s)%st.decor.length];else kind=st.decor[(i+s*3)%st.decor.length];
                var mesh=this.makeDecor(kind), isBuilding=(kind===1||kind===2), off=kind===6?3.9:(isBuilding?(0.62+((i+s)%3)*0.36):(2.05+((i+s)%4)*0.72));
                this.decorItems.push({abs:abs+(s?10:0),side:side,offset:off,kind:kind,mesh:mesh,scale:kind===6?1:(isBuilding?(1.02+((i+s)%3)*0.1):(0.84+((i+s)%3)*0.12)),spin:(i%7)*0.2});
                this.sceneryGroup.add(mesh);
            }
        }
    };

    DanboRocketRoad.prototype.rebuildScenery=function(){
        if(!this.sceneryGroup)return;
        while(this.sceneryGroup.children.length)this.sceneryGroup.remove(this.sceneryGroup.children[0]);
        this.decorItems=[];this.buildScenery();
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
        this.onKeyDown=function(e){
            if(!self.running)return;var code=e.code||e.key;self.keys[code]=true;
            if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyA','KeyD','KeyW','KeyS','Enter','Escape'].indexOf(code)>=0){e.preventDefault();e.stopImmediatePropagation();}
            if(self.state==='title'){
                if(code==='Enter'||code==='Space')self.startGame();
                else if(code==='Escape')self.exit();
            }else if(self.state==='scores'){
                if(code==='Escape'||code==='Enter'||code==='Space')self.showTitle();
            }else if(self.state==='result'){
                if(code==='Enter'||code==='Space')self.startGame();
                else if(code==='Escape')self.showTitle();
            }else if((self.state==='playing'||self.state==='countdown')&&code==='Escape')self.finish(false,'quit');
        };
        this.onKeyUp=function(e){self.keys[e.code||e.key]=false;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyA','KeyD','KeyW','KeyS'].indexOf(e.code||e.key)>=0){e.preventDefault();e.stopImmediatePropagation();}};
        window.addEventListener('keydown',this.onKeyDown,true);window.addEventListener('keyup',this.onKeyUp,true);
        this.onClick=function(e){var b=e.target&&e.target.closest?e.target.closest('[data-action]'):null;if(!b||b.disabled)return;var a=b.getAttribute('data-action');if(a==='single')self.showStages();else if(a==='stage')self.startGame(Number(b.getAttribute('data-stage')||0));else if(a==='next-stage')self.startGame(Math.min(STAGE_COUNT-1,(self.stageId||0)+1));else if(a==='multi')self.showToast('多人模式已预留，等服务器房间接入后开放');else if(a==='scores')self.showScores();else if(a==='exit')self.exit();else if(a==='title')self.showTitle();else if(a==='retry')self.startGame(self.stageId||0);else if(a==='quit-run')self.finish(false,'quit');};
        this.root.addEventListener('click',this.onClick);
        function resetSteer(){self.touch.steer=0;if(self.steerKnob)self.steerKnob.style.transform='translateX(0px)';}
        function steerFromEvent(e){
            if(!self.steerPad)return;
            var r=self.steerPad.getBoundingClientRect(), dx=e.clientX-(r.left+r.width*0.5), v=clamp(dx/(r.width*0.32),-1,1);
            self.touch.steer=v;if(self.steerKnob)self.steerKnob.style.transform='translateX('+Math.round(v*r.width*0.25)+'px)';
        }
        this.onPointer=function(e){
            var b=e.target&&e.target.closest?e.target.closest('[data-touch]'):null;if(!b)return;e.preventDefault();
            var k=b.getAttribute('data-touch'), down=e.type==='pointerdown';self.touch[k]=down&&e.type!=='pointercancel';
            b.classList.toggle('rr-pressed',!!self.touch[k]);
            if(down){var ac=self.ensureAudio();if(ac&&ac.state==='suspended'&&ac.resume)ac.resume();}
        };
        this.onSteerDown=function(e){if(!self.steerPad)return;e.preventDefault();self.steerPointer=e.pointerId;if(self.steerPad.setPointerCapture)try{self.steerPad.setPointerCapture(e.pointerId);}catch(_e){}steerFromEvent(e);var ac=self.ensureAudio();if(ac&&ac.state==='suspended'&&ac.resume)ac.resume();};
        this.onSteerMove=function(e){if(self.steerPointer!==e.pointerId)return;e.preventDefault();steerFromEvent(e);};
        this.onSteerEnd=function(e){if(self.steerPointer!==e.pointerId)return;e.preventDefault();self.steerPointer=null;resetSteer();if(self.steerPad&&self.steerPad.releasePointerCapture)try{self.steerPad.releasePointerCapture(e.pointerId);}catch(_e2){};};
        this.touchLayer.addEventListener('pointerdown',this.onPointer);this.touchLayer.addEventListener('pointerup',this.onPointer);this.touchLayer.addEventListener('pointercancel',this.onPointer);this.touchLayer.addEventListener('pointerleave',this.onPointer);
        if(this.steerPad){this.steerPad.addEventListener('pointerdown',this.onSteerDown);this.steerPad.addEventListener('pointermove',this.onSteerMove);this.steerPad.addEventListener('pointerup',this.onSteerEnd);this.steerPad.addEventListener('pointercancel',this.onSteerEnd);}
    };

    DanboRocketRoad.prototype.resize=function(){
        var w=this.root.clientWidth||innerWidth,h=this.root.clientHeight||innerHeight;this.renderer.setSize(w,h,false);
        var aspect=w/h, halfH=23, panel=(w<=760?84:92), xShift=(panel/w)*halfH*aspect*0.9;
        this.camera.left=-halfH*aspect+xShift;this.camera.right=halfH*aspect+xShift;this.camera.top=24;this.camera.bottom=-22;this.camera.updateProjectionMatrix();
    };

    DanboRocketRoad.prototype.showTitle=function(){
        this.stopMusic();this.state='title';this.hud.style.display='none';this.touchLayer.style.display='none';this.panel.style.display='block';this.countdownEl.style.display='none';this.stageEl.style.display='none';if(this.startRankEl)this.startRankEl.style.display='none';
        var mode=(api()&&api().mode)||'js-fallback';
        this.panel.innerHTML='<h1 class="rr-title">🚗 蛋宝火箭公路</h1><div class="rr-sub">3D画面 · 2D街机公路 · 单关挑战</div>'+
            '<button class="rr-menu-btn rr-selected" data-action="single">单人游戏</button>'+
            '<button class="rr-menu-btn" data-action="multi">多人游戏 <span style="font-size:12px;opacity:.7">开发中</span></button>'+
            '<button class="rr-menu-btn" data-action="scores">高分榜</button>'+
            '<button class="rr-menu-btn" data-action="exit">退出</button>'+
            '<div class="rr-small">全视频识别为 6 个独立场景关卡；每次只跑 1 关，通关才解锁下一关。<br>规则模块：'+esc(mode)+' · build '+BUILD+'</div>';
    };

    DanboRocketRoad.prototype.showStages=function(){
        this.stopMusic();this.state='stageSelect';this.hud.style.display='none';this.touchLayer.style.display='none';this.panel.style.display='block';this.countdownEl.style.display='none';this.stageEl.style.display='none';if(this.startRankEl)this.startRankEl.style.display='none';
        var unlocked=this.getUnlockedStage(), html='<h1 class="rr-title">🏁 选择关卡</h1><div class="rr-sub">通关上一关后，下一场景才会开放</div>';
        for(var i=0;i<STAGE_COUNT;i++){
            var locked=i>unlocked, st=STAGES[i];
            html+='<button class="rr-menu-btn" '+(locked?'disabled ':'')+'data-action="stage" data-stage="'+i+'">'+(locked?'🔒 ':'')+(i+1)+'. '+esc(st.name.replace(/^STAGE \d+ · /,''))+(locked?'':' <span style="font-size:12px;opacity:.72">可挑战</span>')+'</button>';
        }
        html+='<button class="rr-menu-btn" data-action="title">返回标题</button><div class="rr-small">使用方向控制转向、加速和减速；触屏设备可直接点按画面按钮。</div>';
        this.panel.innerHTML=html;
    };

    DanboRocketRoad.prototype.startGame=function(stageId){
        stageId=clamp(stageId|0,0,STAGE_COUNT-1);
        if(stageId>this.getUnlockedStage()){this.showToast('先通关前一关才能挑战这里');this.showStages();return;}
        this.stageId=stageId;this.rebuildScenery();
        this.state='countdown';this.panel.style.display='none';this.hud.style.display='flex';this.touchLayer.style.display=(('ontouchstart' in window)||(navigator.maxTouchPoints>0))?'block':'none';
        this.R=rules();this.progress=0;this.fuel=this.R.maxFuel();this.speed=0;this.score=0;this.pickups=0;this.crashes=0;this.carX=0;this.carVx=0;this.spin=0;this.spinDir=1;this.elapsed=0;this.netAcc=0;this.hitEvents={};this.throttleSfxT=0;this.brakeSfxT=0;this.touch={steer:0};if(this.steerKnob)this.steerKnob.style.transform='translateX(0px)';
        this.countdown=3.15;this.countdownText='';this.countdownEl.textContent='3';this.countdownEl.style.display='block';this.stageEl.textContent=(STAGES[this.stageId]||STAGES[0]).name;this.stageEl.style.display='block';if(this.startRankEl)this.startRankEl.style.display='block';this.startMusic();
        for(var k in this.objects){if(this.objects[k]&&this.objects[k].mesh)this.objects[k].mesh.visible=false;}
        if(this.ctx.net)this.ctx.net.send('minigame.startIntent',{pluginId:this.ctx.pluginId,characterId:this.ch.id,mode:'single',stage:this.stageId,seed:BUILD});
    };

    DanboRocketRoad.prototype.showScores=function(){
        this.stopMusic();this.state='scores';this.hud.style.display='none';this.touchLayer.style.display='none';this.panel.style.display='block';this.countdownEl.style.display='none';this.stageEl.style.display='none';if(this.startRankEl)this.startRankEl.style.display='none';
        var scores=this.getScores();var rows=scores.length?scores.map(function(s,i){var st=STAGES[s.stage||0]||STAGES[0];return '<div><b>#'+(i+1)+'</b> '+esc(s.name||'Danbo')+' — '+esc(s.score)+' 分 <span style="opacity:.75">'+esc((s.stageName||st.name).replace(/^STAGE \d+ · /,''))+'</span> <span style="opacity:.55">'+esc(s.date||'')+'</span></div>';}).join(''):'<div style="text-align:center;opacity:.75">还没有记录，先跑一局吧。</div>';
        this.panel.innerHTML='<h1 class="rr-title">🏆 高分榜</h1><div class="rr-list">'+rows+'</div><button class="rr-menu-btn" data-action="title">返回标题</button>';
    };

    DanboRocketRoad.prototype.finish=function(win,reason){
        if(this.state!=='playing'&&this.state!=='countdown')return;this.stopMusic();if(win)this.playFinishJingle();this.state='result';this.hud.style.display='none';this.touchLayer.style.display='none';this.panel.style.display='block';this.countdownEl.style.display='none';this.stageEl.style.display='none';if(this.startRankEl)this.startRankEl.style.display='none';
        var finalScore=this.R.score(this.progress,this.fuel,this.pickups,this.crashes,win?1:0);this.score=finalScore;this.saveScore(finalScore);
        if(win)this.unlockStage(this.stageId||0);
        if(this.ctx.net)this.ctx.net.send('minigame.finishIntent',{pluginId:this.ctx.pluginId,stage:this.stageId||0,score:finalScore,finished:!!win,reason:reason||'',time:this.elapsed,crashes:this.crashes,pickups:this.pickups});
        var nextOk=win&&(this.stageId||0)<STAGE_COUNT-1, stageName=(STAGES[this.stageId]||STAGES[0]).name;
        this.panel.innerHTML='<h1 class="rr-title">'+(win?'🏁 '+esc(stageName)+' 通关！':'💥 挑战结束')+'</h1>'+
            '<div class="rr-list"><div>关卡：<b>'+esc(stageName)+'</b></div><div>分数：<b>'+finalScore+'</b></div><div>距离：'+Math.floor(clamp(this.progress/this.R.levelLength()*100,0,100))+'%</div><div>补油：'+this.pickups+' 次</div><div>碰撞：'+this.crashes+' 次</div><div>用时：'+this.elapsed.toFixed(1)+' 秒</div>'+(nextOk?'<div>已解锁：<b>'+esc(STAGES[(this.stageId||0)+1].name)+'</b></div>':'')+'</div>'+
            (nextOk?'<button class="rr-menu-btn" data-action="next-stage">挑战下一关</button>':'')+
            '<button class="rr-menu-btn" data-action="retry">再来一次</button><button class="rr-menu-btn" data-action="single">选择关卡</button><button class="rr-menu-btn" data-action="scores">高分榜</button><button class="rr-menu-btn" data-action="title">返回标题</button><button class="rr-menu-btn" data-action="exit">退出</button>';
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
        this.audioCtx=new AC();this.musicGain=this.audioCtx.createGain();this.musicGain.gain.value=0.055;this.musicGain.connect(this.audioCtx.destination);
        this.sfxGain=this.audioCtx.createGain();this.sfxGain.gain.value=0.22;this.sfxGain.connect(this.audioCtx.destination);return this.audioCtx;
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
        this.elapsed+=dt;var inp=this.inputState(), width=effectiveRoadWidth(this.R.roadWidthAt(this.progress),this.progress,this.stageId||0);
        this.updateControlSfx(inp,dt);
        var step=this.R.playerStep(this.carX,this.carVx,inp.steer,dt,this.spin>0?1:0,width);this.carX=step[0];this.carVx=step[1];
        if(this.spin>0)this.spin=Math.max(0,this.spin-dt);
        this.targetSpeed=this.R.speedFor(inp.turbo?1:0,inp.brake?1:0,this.spin>0?1:0,this.fuel);
        this.speed=this.R.speedStep(this.speed||0,inp.turbo?1:0,inp.brake?1:0,this.spin>0?1:0,this.fuel,dt);
        this.progress+=this.speed*dt;this.fuel=this.R.fuelAfter(this.fuel,dt,inp.turbo?1:0,inp.brake?1:0);
        this.checkCollisions();
        if(Math.abs(this.carX)>width*0.5-0.82&&this.spin<=0){this.crash(0.8,this.carX>0?-1:1,2.4);}
        this.score=this.R.score(this.progress,this.fuel,this.pickups,this.crashes,0);
        this.netAcc+=dt;if(this.ctx.net&&this.netAcc>0.2){this.netAcc=0;this.ctx.net.send('input.drive',{steer:inp.steer,turbo:inp.turbo,brake:inp.brake,progress:this.progress});}
        if(this.R.finishReached(this.progress))this.finish(true,'finish');else if(this.fuel<=0.01)this.finish(false,'fuel');
    };

    DanboRocketRoad.prototype.crash=function(duration,dir,fuelLoss){this.spin=Math.max(this.spin,duration||1);this.spinDir=dir||1;this.crashes++;this.fuel=clamp(this.fuel-(fuelLoss||6),0,this.R.maxFuel());this.carVx+=this.spinDir*8;this.showToast('打滑！反打方向稳住！');};

    DanboRocketRoad.prototype.checkCollisions=function(){
        var count=this.R.eventCount();
        for(var i=0;i<count;i++){
            if(this.hitEvents[i])continue;var ev=this.R.eventAt(i), type=ev[2]|0, rel=this.eventRel(ev,i,type);if(rel<-4||rel>6)continue;
            var width=effectiveRoadWidth(this.R.roadWidthAt(ev[0]),ev[0],this.stageId||0),x=driveCenterAt(ev[0],this.stageId||0)+this.R.laneX(ev[1]|0,width);x+=this.objectSway(type,ev[4],i);
            var px=driveCenterAt(this.progress||0,this.stageId||0)+(this.carX||0);
            if(this.R.collide(px,0,x,rel,type)){
                this.hitEvents[i]=true;
                if(type===5){this.pickups++;this.fuel=clamp(this.fuel+(ev[5]||20),0,this.R.maxFuel());this.showToast('补油 +'+Math.floor(ev[5]||20));if(this.objects[i])this.objects[i].mesh.visible=false;}
                else if(type===6){this.crash(0.95,(this.carX<x?-1:1),2.5);}
                else this.crash(type===4?1.3:1.05,(this.carX<x?-1:1),type===4?8:5.5);
            }
        }
    };

    DanboRocketRoad.prototype.objectSway=function(type,pattern,id){
        if(type===2)return Math.sin(this.elapsed*1.8+pattern+id)*0.42;
        if(type===3)return Math.sin(this.elapsed*3.0+id)*0.24;
        return 0;
    };

    DanboRocketRoad.prototype.trafficSpeed=function(type,pattern,id){
        if(this.state!=='playing')return 0;
        var sid=this.stageId||0, mul=1+sid*0.08;
        if(type===1)return (10+(pattern||0)*1.1)*mul;      // same direction, slower than player
        if(type===2)return (18+Math.sin(this.elapsed*0.7+id)*5)*mul;
        if(type===3)return (-12-Math.abs(Math.sin(id))*5)*(1+sid*0.05); // oncoming / passing traffic
        if(type===4)return 7+sid*0.7;
        return 0;
    };

    DanboRocketRoad.prototype.eventRel=function(ev,id,type){
        type=type|0;
        return ev[0]+this.trafficSpeed(type,ev[4],id)*this.elapsed-this.progress;
    };

    DanboRocketRoad.prototype.updateRoad=function(){
        var first=this.progress-(this.progress%ROAD_SEG_LEN)-32;
        for(var i=0;i<this.roadSegments.length;i++){
            var abs=first+i*ROAD_SEG_LEN, sid=this.stageId||0, rel=abs-this.progress, g=this.roadSegments[i], rawWidth=this.R.roadWidthAt(abs), width=effectiveRoadWidth(rawWidth,abs,sid), cx=driveCenterAt(abs,sid), mats=this.stageMats&&this.stageMats[sid];
            if(mats){g.road.material=mats.road;g.leftRail.material=g.rightRail.material=mats.edge;g.leftField.material=mats.fields[i%mats.fields.length];g.rightField.material=mats.fields[(i+2)%mats.fields.length];for(var mm=0;mm<g.marks.length;mm++)g.marks[mm].material=mats.mark;if(g.branchRoad)g.branchRoad.material=mats.road;if(g.branchRails)for(var rr=0;rr<g.branchRails.length;rr++)g.branchRails[rr].material=mats.edge;if(g.branchMarks)for(var bb=0;bb<g.branchMarks.length;bb++)g.branchMarks[bb].material=mats.mark;}
            var bounds=roadOuterBounds(abs,sid,width);
            g.position.set(cx,0,PLAYER_Z+rel);g.road.scale.x=width;g.road.scale.z=ROAD_SEG_LEN+0.35;
            g.leftField.position.x=(bounds.min-cx)-2.35;g.rightField.position.x=(bounds.max-cx)+2.35;g.leftField.scale.z=g.rightField.scale.z=ROAD_SEG_LEN+0.35;
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
            var width=effectiveRoadWidth(this.R.roadWidthAt(ev[0]),ev[0],this.stageId||0), x=driveCenterAt(ev[0],this.stageId||0)+this.R.laneX(ev[1]|0,width)+this.objectSway(type,ev[4],i);
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
        if(!this.decorItems)return;
        for(var i=0;i<this.decorItems.length;i++){
            var d=this.decorItems[i], rel=d.abs-this.progress, mesh=d.mesh;
            if(rel<-58||rel>150){mesh.visible=false;continue;}
            var sid=this.stageId||0, width=effectiveRoadWidth(this.R.roadWidthAt(d.abs),d.abs,sid), bounds=roadOuterBounds(d.abs,sid,width), x=(d.side<0?bounds.min-d.offset:bounds.max+d.offset);
            mesh.visible=true;mesh.position.set(x,0,PLAYER_Z+rel);mesh.scale.setScalar(d.scale);
            mesh.rotation.y=(d.kind===6||d.kind===7)?0:(d.side<0?0.42:-0.42);
            if((i%6)===3&&d.kind!==6)mesh.rotation.y+=Math.sin(this.elapsed*1.2+d.spin)*0.12;
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
        if(this.player.flame){var inp=this.inputState(),thrust=clamp((this.speed||0)/58,0.15,1);var s=(inp.turbo&&this.state==='playing')?(0.95+0.45*thrust):(0.42+0.42*thrust);this.player.flame.scale.set(s,s,0.55+thrust*0.45+Math.sin(this.elapsed*28)*0.16);this.player.flame.visible=this.state==='playing'&&this.speed>2;}
        this.world.position.x=0;
        this.camera.position.x=cx+(this.carX||0)*0.08;this.camera.position.z=5;this.camera.lookAt(this.camera.position.x,0,5);
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
        if((el=q('[data-fuel]')))el.style.height=(fuelPct*100)+'%';
    };

    DanboRocketRoad.prototype.loop=function(t){
        if(!this.running)return;var dt=Math.min(0.04,(t-this.last)/1000||0.016);this.last=t;
        if(this.toastTimer>0){this.toastTimer-=dt;if(this.toastTimer<=0)this.toast.style.display='none';}
        if(this.state==='countdown')this.updateCountdown(dt);else if(this.state==='playing')this.updatePlaying(dt);
        this.updateVisuals(dt);this.updateHud();this.renderer.render(this.scene,this.camera);
        var self=this;this.raf=requestAnimationFrame(function(nt){self.loop(nt);});
    };

    DanboRocketRoad.prototype.dispose=function(){
        this.running=false;this.stopMusic();if(this.raf)cancelAnimationFrame(this.raf);window.removeEventListener('resize',this.onResize);window.removeEventListener('keydown',this.onKeyDown,true);window.removeEventListener('keyup',this.onKeyUp,true);if(this.root)this.root.removeEventListener('click',this.onClick);
        if(this.renderer){var dispose=function(o){if(o.geometry)o.geometry.dispose();if(o.material){if(Array.isArray(o.material))o.material.forEach(function(m){if(m.map)m.map.dispose();m.dispose();});else{if(o.material.map)o.material.map.dispose();o.material.dispose();}}};this.scene.traverse(dispose);this.renderer.dispose();}
        if(this.root&&this.root.parentNode)this.root.parentNode.removeChild(this.root);
    };

    window.DanboRocketRoad={start:function(ctx){return new DanboRocketRoad(ctx);},fallback:fallback};
})();
