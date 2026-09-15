// Egg Trail runs in an isolated scene: city/NPC/coin arrays are never mutated.
(function(){
    'use strict';
    var Rules=window.DanboPlatformRules;
    var COPY={
        zhs:{title:'蛋宝冒险',sub:'穿过林间、晶洞和云端',start:'出发',exit:'返回城市',jump:'跳跃',pause:'暂停',resume:'继续',retry:'从路标重试',again:'再玩一次',complete:'抵达星光花园！',checkpoint:'路标已点亮',respawn:'从最近的路标继续',help:'← → / A D 移动 · 空格跳跃 · 按住跳得更远',touch:'左右移动 · 按住跳跃跳得更远',zones:['林间小径','晶光洞穴','云端花园'],best:'最佳记录',time:'用时',ready:'随时可以从路标重试',left:'向左',right:'向右'},
        zht:{title:'蛋寶冒險',sub:'穿過林間、晶洞和雲端',start:'出發',exit:'返回城市',jump:'跳躍',pause:'暫停',resume:'繼續',retry:'從路標重試',again:'再玩一次',complete:'抵達星光花園！',checkpoint:'路標已點亮',respawn:'從最近的路標繼續',help:'← → / A D 移動 · 空白鍵跳躍 · 按住跳得更遠',touch:'左右移動 · 按住跳躍跳得更遠',zones:['林間小徑','晶光洞穴','雲端花園'],best:'最佳紀錄',time:'用時',ready:'隨時可以從路標重試',left:'向左',right:'向右'},
        ja:{title:'たまごの冒険',sub:'森と水晶の洞窟を抜け、雲の庭へ',start:'出発',exit:'街へ戻る',jump:'ジャンプ',pause:'一時停止',resume:'つづける',retry:'道しるべから再開',again:'もう一度',complete:'星の庭に到着！',checkpoint:'道しるべを灯した！',respawn:'近くの道しるべから再開',help:'← → / A D で移動 · Space でジャンプ · 長押しで遠くへ',touch:'左右で移動 · 長押しで遠くへジャンプ',zones:['森の小道','水晶の洞窟','雲の庭'],best:'ベスト',time:'タイム',ready:'いつでも道しるべからやり直せます',left:'左へ',right:'右へ'},
        en:{title:'Egg Trail',sub:'Through the woods and crystal caves, into the clouds',start:'Let’s go',exit:'Back to town',jump:'Jump',pause:'Pause',resume:'Continue',retry:'Retry checkpoint',again:'Play again',complete:'Welcome to the Star Garden!',checkpoint:'Checkpoint lit!',respawn:'Back at your last checkpoint',help:'← → / A D to move · Space to jump · Hold to leap further',touch:'Move left / right · Hold Jump to leap further',zones:['Woodland Path','Crystal Grotto','Cloud Garden'],best:'Best',time:'Time',ready:'Retry from a checkpoint whenever you like',left:'Left',right:'Right'}
    };
    function Trail(ctx){
        this.ctx=ctx;this.copy=COPY[window._langCode]||COPY.en;this.level=Rules.level();this.sim=Rules.create();this.state='title';this.keys={};this.pointers={};this.listeners=[];this.acc=0;this.running=true;
        this.art=DanboMinigameArt.create();this.root=document.createElement('div');this.root.className='pf-root';
        this.root.innerHTML='<style>'+
            '.pf-root{position:absolute;inset:0;overflow:hidden;background:#c8e5da;color:#244754;font:600 15px/1.4 system-ui,sans-serif;touch-action:none}.pf-root *{box-sizing:border-box}.pf-root canvas{display:block;width:100%;height:100%}'+
            '.pf-root button{border:1px solid #b3d4c8;border-radius:18px;background:#fff8e7;color:#244754;font:750 15px system-ui,sans-serif;padding:12px 16px;min-height:46px;cursor:pointer}.pf-root button:focus-visible,.pf-root .danbo-nav-focus{outline:3px solid #368e80;outline-offset:2px}.pf-root button:active{background:#a9e0ce}'+
            '.pf-panel{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(90%,500px);padding:24px;border:1px solid #fffdf2;border-radius:28px;background:linear-gradient(150deg,#fffcf2f7,#def4eaf5);box-shadow:0 16px 50px #24475422;display:grid;gap:12px;text-align:center}.pf-panel[hidden],.pf-root [hidden]{display:none!important}.pf-panel h1{margin:0;font-size:clamp(22px,4vw,30px);line-height:1.2}.pf-panel p{margin:0;font-size:13px;color:#527871}.pf-panel .pf-primary{background:#8ddcc5}.pf-panel footer{display:flex;gap:10px}.pf-panel footer button{flex:1}'+
            '.pf-hud{position:absolute;top:max(12px,env(safe-area-inset-top));left:max(12px,env(safe-area-inset-left));right:max(12px,env(safe-area-inset-right));display:flex;align-items:flex-start;gap:8px;pointer-events:none}.pf-badge{border:1px solid #fff9ee;background:#fffcf0ee;border-radius:17px;padding:9px 12px;min-width:0;font-size:13px}.pf-badge progress{display:block;width:100%;height:5px;margin-top:5px;accent-color:#55b69b}.pf-hud button{margin-left:auto;pointer-events:auto}.pf-notice{position:absolute;top:88px;left:12px;right:12px;text-align:center;pointer-events:none;color:#244754;text-shadow:0 1px #fff;font-size:14px}'+
            '.pf-touch{position:absolute;bottom:max(18px,env(safe-area-inset-bottom));left:max(16px,env(safe-area-inset-left));right:max(16px,env(safe-area-inset-right));display:flex;gap:12px;pointer-events:none}.pf-touch button{pointer-events:auto;width:64px;height:64px;border-radius:50%;background:#fff8e7df;font-size:24px;touch-action:none;user-select:none}.pf-touch [data-control=jump]{margin-left:auto;width:78px;font-size:16px}.pf-touch [aria-pressed=true]{background:#8ddcc5}.pf-root .pf-instructions{position:absolute;bottom:18px;left:12px;right:12px;text-align:center;pointer-events:none;font-size:12px;color:#244754;text-shadow:0 1px #fff}'+
            '@media(max-height:430px){.pf-panel{padding:14px;gap:8px;width:min(88%,520px)}.pf-panel button{padding:8px;min-height:40px}.pf-panel h1{font-size:22px}.pf-touch{bottom:max(8px,env(safe-area-inset-bottom))}.pf-touch button{width:54px;height:54px}.pf-notice{top:68px}.pf-hud{top:8px}.pf-badge{padding:6px 10px}}'+
            '</style><canvas aria-hidden="true"></canvas><div class="pf-hud" hidden><div class="pf-badge"><span data-zone></span><progress max="323" value="0"></progress></div><div class="pf-badge" data-score></div><button data-action="pause"></button></div><div class="pf-notice" role="status"></div><div class="pf-instructions"></div><section class="pf-panel" role="region"></section><div class="pf-touch" hidden><button data-control="left">←</button><button data-control="right">→</button><button data-control="jump"></button></div>';
        ctx.mount.appendChild(this.root);this.panel=this.root.querySelector('.pf-panel');this.hud=this.root.querySelector('.pf-hud');this.touch=this.root.querySelector('.pf-touch');this.notice=this.root.querySelector('.pf-notice');this.instructions=this.root.querySelector('.pf-instructions');
        this.root.querySelector('[data-control=jump]').textContent=this.copy.jump;this.root.querySelector('[data-action=pause]').textContent=this.copy.pause;
        this.root.querySelector('[data-control=left]').setAttribute('aria-label',this.copy.left);this.root.querySelector('[data-control=right]').setAttribute('aria-label',this.copy.right);
        this.touchMode=!!(navigator.maxTouchPoints>0||window.matchMedia&&matchMedia('(pointer:coarse)').matches);
        try{this.init3D();this.bind();this.showPanel('title');this.last=performance.now();var self=this;this.raf=requestAnimationFrame(function(t){self.loop(t);});}
        catch(e){this.dispose();throw e;}
    }
    Trail.prototype.on=function(target,event,fn,capture){target.addEventListener(event,fn,capture);this.listeners.push(function(){target.removeEventListener(event,fn,capture);});};
    Trail.prototype.init3D=function(){
        var a=this.art;this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0xc8e5da);this.scene.fog=new THREE.Fog(0xc8e5da,45,130);
        this.camera=new THREE.OrthographicCamera(-18,18,12,-12,.1,200);this.camera.position.set(10,10,32);this.camera.lookAt(10,5,0);
        this.renderer=new THREE.WebGLRenderer({canvas:this.root.querySelector('canvas'),antialias:true,alpha:false,powerPreference:'high-performance'});
        this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.1;
        this.scene.add(new THREE.HemisphereLight(0xfffcf1,0x668e94,1.7));var sun=new THREE.DirectionalLight(0xffefce,2);sun.position.set(-15,30,20);this.scene.add(sun);
        this.platformMeshes=[];this.starMeshes=[];this.checkpoints=[];this.decor=[];
        var tops=[0x89bf98,0xb9abd4,0xfaf5eb],bases=[0xc9af91,0x8198aa,0xc7dadd],self=this;
        this.level.platforms.forEach(function(p){
            var g=new THREE.Group(),w=p.x2-p.x1;g.position.set((p.x1+p.x2)/2,p.y,0);self.scene.add(g);
            a.box(g,w,1.1,5.8,bases[p.zone],0,-.75,0);a.box(g,w,.4,6,tops[p.zone],0,-.2,0);
            if(!p.moving){
                a.soft(g,bases[p.zone],0,-1.6,-.4,w*.47,1.2,2.4);
                // Flowers/crystals grow on the rear rim, away from the playable lane.
                [-.3,.26].forEach(function(f){var fx=w*f;
                    if(p.zone===1){var crystal=a.mesh(g,a.geometry('small-crystal',function(){return new THREE.OctahedronGeometry(1,0);}),0x85cbd5,fx,.6,-2);crystal.scale.set(.32,.85,.32);}
                    else{a.box(g,.06,.6,.06,0x619b78,fx,.3,-2);for(var fi=0;fi<5;fi++){var angle=fi*Math.PI*2/5;a.soft(g,p.id%2?0xeaa9ba:0xf8dca2,fx+Math.cos(angle)*.19,.68+Math.sin(angle)*.19,-2,.14,.14,.08);}a.soft(g,0xffd176,fx,.68,-1.9,.12,.12,.08);}
                });
            }
            if(p.zone===2){[-.32,0,.32].forEach(function(k){a.soft(g,0xfffcf3,w*k,-1.2,-1,2.6,1.3,2.6);});}
            if(p.moving)a.box(g,w*.6,.07,.24,0xf5cb7c,0,.05,2.1);
            self.platformMeshes.push(g);
            if(p.checkpoint){var marker=new THREE.Group();marker.position.set(p.x1+2,p.y,-1.5);self.scene.add(marker);a.box(marker,.16,2.3,.16,0xd9c5a7,0,1.15,0);var lamp=a.soft(marker,0xffd784,0,2.5,0,.35,.48,.35);self.checkpoints.push({id:p.id,mesh:lamp});}
        });
        var starShape=new THREE.Shape();for(var i=0;i<10;i++){var angle=i*Math.PI/5+Math.PI/2,r=i%2?.2:.43;if(i===0)starShape.moveTo(Math.cos(angle)*r,Math.sin(angle)*r);else starShape.lineTo(Math.cos(angle)*r,Math.sin(angle)*r);}starShape.closePath();
        var starGeo=a.geometry('star',function(){return new THREE.ExtrudeGeometry(starShape,{depth:.12,bevelEnabled:true,bevelThickness:.035,bevelSize:.025,bevelSegments:1,steps:1});});
        this.level.stars.forEach(function(c){self.starMeshes.push(a.mesh(self.scene,starGeo,0xffd377,c.x,c.y,0));});
        // Background silhouettes do not cover the next landing. No expensive
        // water or postprocessing pass, and only nearby scenery is drawn.
        for(var d=0;d<45;d++){
            var x=d*8-8,zone=x<84?0:x<150?1:2,g=new THREE.Group();g.position.set(x,zone===2?5:0,-10-(d%3)*4);this.scene.add(g);this.decor.push(g);
            if(zone===0){a.soft(g,0x9fc29d,0,-1.4,0,5,2,4);a.box(g,.6,4,.6,0xbb9e83,0,1,0);a.soft(g,d%2?0x81b99a:0xa7cfa8,0,3.5+d%3*.5,0,2.6,2.5+d%3*.4,2);a.soft(g,0xc4d9b3,1.3,3.4,.5,1.8,1.8,1.7);}
            else if(zone===1){var crystal=a.mesh(g,a.geometry('crystal',function(){return new THREE.OctahedronGeometry(1,0);}),d%2?0x96d4dc:0xc3afd6,0,3,0);crystal.scale.set(2,4+d%3,2);a.soft(g,0x849daa,0,0,0,4,1,3);}
            else{a.soft(g,0xfff9ed,0,d%4*2,0,3.5,1.5,2);a.soft(g,0xeee8ef,2,1+d%4*2,0,2,1.8,1.5);}
        }
        // Distant, low-contrast silhouettes give the floating route a horizon.
        for(var hi=0;hi<15;hi++){var hill=a.soft(this.scene,hi%2?0xb1cdc4:0xc5d9cb,hi*26,-2,-38,18,7+hi%3*2,8);this.decor.push(hill);}
        // The finish is an OPEN flower arch behind the lane, never a solid box.
        var goal=new THREE.Group();goal.position.set(this.level.goal.x,this.level.goal.y,-1.8);this.scene.add(goal);
        a.mesh(goal,a.geometry('arch',function(){return new THREE.TorusGeometry(3,.23,8,40,Math.PI);}),0xaad2c4,0,1.5,0);
        [-1,1].forEach(function(side){a.box(goal,.45,1.5,.45,0xaad2c4,side*3,.75,0);for(var k=0;k<5;k++){var ang=k*Math.PI*2/5;a.soft(goal,0xefb2bd,side*3+Math.cos(ang)*.35,1.8+Math.sin(ang)*.35,.2,.25,.25,.12);}a.soft(goal,0xffd377,side*3,1.8,.38,.18,.18,.1);});
        var ch=this.ctx.character,style=ch.style||{};
        this.hero=createEggMesh(style.color||0xf5f5f0,style.accent||0xf49aaa,ch.key||'egg','cinematic',false,false);this.hero.rotation.y=.6;this.scene.add(this.hero);
        // Star/crystal motifs use a main-world geometry cache. Clone only those
        // shared buffers before giving this independent renderer ownership.
        if(typeof _starShapeGeometryCache!=='undefined'){var shared=new Set(Object.values(_starShapeGeometryCache));this.hero.traverse(function(o){if(o.geometry&&shared.has(o.geometry))o.geometry=o.geometry.clone();});}
        this.shadow=a.mesh(this.scene,a.geometry('shadow',function(){return new THREE.CircleGeometry(.8,24);}),0x88ada2,4,.015,0);this.shadow.rotation.x=-Math.PI/2;this.shadow.scale.y=.7;
        this.resize();this.draw(0);
    };
    Trail.prototype.resize=function(){
        var w=this.root.clientWidth||innerWidth,h=this.root.clientHeight||innerHeight,budget=window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.low?1000000:1800000;
        this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,2,Math.sqrt(budget/(w*h))));this.renderer.setSize(w,h,false);
        var halfW=Math.max(9,Math.min(23,w/h*12)),halfH=halfW/(w/h);this.camera.left=-halfW;this.camera.right=halfW;this.camera.top=halfH;this.camera.bottom=-halfH;this.camera.updateProjectionMatrix();
    };
    Trail.prototype.clearInput=function(){this.keys={};this.pointers={};if(this.touch)this.touch.querySelectorAll('button').forEach(function(b){b.setAttribute('aria-pressed','false');});};
    Trail.prototype.bind=function(){
        var self=this;
        this.on(window,'resize',function(){self.resize();});
        this.on(window,'blur',function(){self.clearInput();if(self.state==='playing')self.showPanel('pause');});
        this.on(window,'gamepaddisconnected',function(){self.clearInput();if(self.state==='playing')self.showPanel('pause');});
        this.on(document,'visibilitychange',function(){if(document.hidden){self.clearInput();if(self.state==='playing')self.showPanel('pause');}self.last=performance.now();self.acc=0;});
        this.on(window,'keydown',function(e){if(self.state!=='playing')return;var code=e.code;if(['KeyA','KeyD','ArrowLeft','ArrowRight','Space','ArrowUp','KeyW','Escape','KeyP'].indexOf(code)<0)return;e.preventDefault();e.stopImmediatePropagation();self.keys[code]=true;if(!e.repeat&&(code==='Escape'||code==='KeyP'))self.showPanel('pause');},true);
        this.on(window,'keyup',function(e){delete self.keys[e.code];},true);
        this.on(this.root,'click',function(e){var b=e.target.closest('[data-action]');if(!b)return;var action=b.dataset.action;
            if(action==='start'||action==='again'){self.sim=Rules.create();self.play();}
            else if(action==='resume')self.play();else if(action==='retry'){Rules.respawn(self.sim,self.level);self.play();}
            else if(action==='pause')self.showPanel('pause');else if(action==='exit')self.ctx.api.finish({status:self.sim.finished?'finished':'quit',stars:self.sim.stars.length});
        });
        this.touch.querySelectorAll('button').forEach(function(b){
            self.on(b,'pointerdown',function(e){e.preventDefault();if(self.pointers[b.dataset.control]!==undefined)return;self.pointers[b.dataset.control]=e.pointerId;b.setPointerCapture(e.pointerId);b.setAttribute('aria-pressed','true');});
            ['pointerup','pointercancel','lostpointercapture'].forEach(function(event){self.on(b,event,function(e){if(self.pointers[b.dataset.control]===e.pointerId){delete self.pointers[b.dataset.control];b.setAttribute('aria-pressed','false');}});});
        });
    };
    Trail.prototype.tone=function(f){
        if(window.sfxEnabled===false)return;var Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
        try{if(!this.audio)this.audio=new Audio();var ac=this.audio;if(ac.state==='suspended')ac.resume().catch(function(){});var o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime;o.type='sine';o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*1.4,t+.1);g.gain.setValueAtTime(.045,t);g.gain.exponentialRampToValueAtTime(.001,t+.17);o.connect(g);g.connect(ac.destination);o.start(t);o.stop(t+.18);o.onended=function(){o.disconnect();g.disconnect();};}catch(e){}
    };
    Trail.prototype.play=function(){if(window.DANBO_MENU_INPUT&&DANBO_MENU_INPUT.leaveHud)DANBO_MENU_INPUT.leaveHud();this.state='playing';this.panel.hidden=true;this.hud.hidden=false;this.touch.hidden=!this.touchMode;this.clearInput();this.acc=0;this.last=performance.now();this.instructions.textContent=this.touchMode?'':this.copy.help;this.tone(520);};
    Trail.prototype.showPanel=function(state){
        this.state=state;this.clearInput();this.panel.hidden=false;this.hud.hidden=true;this.touch.hidden=true;this.instructions.textContent='';this.notice.textContent='';
        var c=this.copy,heading=state==='title'?c.title:state==='pause'?c.pause:c.complete;
        var body=state==='title'?c.sub:state==='pause'?c.ready:'★ '+this.sim.stars.length+' / '+this.level.stars.length+' · '+c.time+' '+(this.sim.ticks/60).toFixed(1)+'s';
        this.panel.innerHTML='<h1>'+heading+'</h1><p>'+body+'</p>'+(state==='title'?'<p>'+(this.touchMode?c.touch:c.help)+'</p>':'')+
            '<button class="pf-primary" data-action="'+(state==='title'?'start':state==='pause'?'resume':'again')+'">'+(state==='title'?c.start:state==='pause'?c.resume:c.again)+'</button>'+
            '<footer>'+(state==='pause'?'<button data-action="retry">'+c.retry+'</button>':'')+'<button data-action="exit">'+c.exit+'</button></footer>';
        this.panel.setAttribute('aria-label',heading);
        if(state==='title'){var best=this.ctx.storage.get('best-v2',null);if(best&&Number.isFinite(best.stars)&&Number.isFinite(best.ticks)){var record=document.createElement('p');record.textContent=c.best+' · ★ '+best.stars+' / '+this.level.stars.length+' · '+(best.ticks/60).toFixed(1)+'s';this.panel.appendChild(record);}}
        if(state==='result'){var old=this.ctx.storage.get('best-v2',null),record={stars:this.sim.stars.length,ticks:this.sim.ticks};if(!old||record.stars>old.stars||record.stars===old.stars&&record.ticks<old.ticks)this.ctx.storage.set('best-v2',record);}
    };
    Trail.prototype.advance=function(dt){
        if(this.state!=='playing')return;this.acc+=Math.min(.1,Math.max(0,dt));
        while(this.acc+1e-9>=Rules.DT&&this.state==='playing'){
            var input={move:(this.keys.KeyD||this.keys.ArrowRight||this.pointers.right!==undefined?1:0)-(this.keys.KeyA||this.keys.ArrowLeft||this.pointers.left!==undefined?1:0),jump:!!(this.keys.Space||this.keys.KeyW||this.keys.ArrowUp||this.pointers.jump!==undefined)};
            var stars=this.sim.stars.length,grounded=this.sim.onGround;Rules.step(this.sim,input,this.level);this.acc-=Rules.DT;
            if(this.sim.stars.length>stars)this.tone(880);else if(grounded&&this.sim.vy>0)this.tone(400);
            if(this.sim.finished){this.tone(1320);this.showPanel('result');}
        }
    };
    Trail.prototype.draw=function(dt){
        var s=this.sim,time=s.ticks/60,zone=s.x<84?0:s.x<150?1:2,self=this;
        this.hero.position.set(s.x,s.y,0);this.hero.rotation.y=s.vx<-.1?-.65:.65;this.hero.rotation.z=s.onGround?Math.sin(time*14)*Math.min(.055,Math.abs(s.vx)*.008):-.08*s.vx/7;
        var feet=this.hero.userData.feet;if(feet)feet.forEach(function(f,i){f.position.z=.06+(s.onGround?Math.sin(time*14+i*Math.PI)*Math.min(.14,Math.abs(s.vx)*.02):0);});
        if(typeof _animateCuteCharacterDetails==='function')_animateCuteCharacterDetails(this.hero,time*1000);
        this.platformMeshes.forEach(function(g,i){var p=self.level.platforms[i],b=Rules.pose(p,time);g.position.x=(b.x1+b.x2)/2;g.visible=Math.abs(g.position.x-s.x)<60;});
        this.starMeshes.forEach(function(m,i){var c=self.level.stars[i],p=self.level.platforms[c.platform];m.visible=s.stars.indexOf(c.id)<0&&Math.abs(c.x-s.x)<50;m.position.x=c.x+Rules.pose(p,time).x1-p.x1;m.position.y=c.y+Math.sin(time*3+i)*.12;m.rotation.y=time*.8;});
        this.decor.forEach(function(g){g.visible=Math.abs(g.position.x-s.x)<65;});
        this.checkpoints.forEach(function(c){var f=c.id<=s.checkpoint?1.15:1;c.mesh.scale.set(.35*f,.48*f,.35*f);});
        this.shadow.visible=s.onGround;this.shadow.position.set(s.x,s.y+.025,0);
        var targetX=s.x+4,targetY=Math.max(4,s.y+3),blend=dt>0?1-Math.exp(-dt*6):1;
        this.camera.position.x+=(targetX-this.camera.position.x)*blend;this.camera.position.y+=(targetY+5-this.camera.position.y)*blend;this.camera.lookAt(this.camera.position.x,this.camera.position.y-5,0);
        var colors=[0xc8e5da,0xc6d2e3,0xe0e6ec];this.scene.background.setHex(colors[zone]);this.scene.fog.color.copy(this.scene.background);
        this.root.querySelector('[data-zone]').textContent=this.copy.zones[zone];this.root.querySelector('progress').value=s.x;this.root.querySelector('[data-score]').textContent='★ '+s.stars.length+' / '+this.level.stars.length;
        if(this.state==='playing')this.notice.textContent=s.noticeTicks>0?(s.notice==='checkpoint'?this.copy.checkpoint:this.copy.respawn):'';
        this.renderer.render(this.scene,this.camera);
    };
    Trail.prototype.loop=function(t){if(!this.running)return;var dt=Math.min(.1,Math.max(0,(t-this.last)/1000));this.last=t;if(!document.hidden){this.advance(dt);this.draw(dt);}var self=this;this.raf=requestAnimationFrame(function(now){self.loop(now);});};
    Trail.prototype.dispose=function(){if(!this.running)return;this.running=false;cancelAnimationFrame(this.raf);this.listeners.forEach(function(off){off();});this.listeners=[];this.clearInput();if(this.audio)this.audio.close().catch(function(){});if(this.hero)disposeTransientObject3D(this.hero);this.art.dispose();if(this.renderer){this.renderer.dispose();if(this.renderer.forceContextLoss)this.renderer.forceContextLoss();}this.root.remove();};
    window.DanboPlatformer={start:function(ctx){return new Trail(ctx);},copy:COPY};
})();
