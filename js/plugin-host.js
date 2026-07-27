(function(){
    'use strict';

    var registry={};
    var entrances={};
    var manifest=[];
    var active=null;
    var layer=null;
    var loadedScripts={};
    var pendingScripts={};
    var loadSeq=0;
    var pluginIsolationActive=false;
    var pluginIsolationPrevSfxMuted=false;
    var pluginUiState=null;
    var pluginSceneState=null;

    function clonePlain(obj){
        if(obj===undefined||obj===null)return obj;
        try{return JSON.parse(JSON.stringify(obj));}
        catch(e){
            if(Array.isArray(obj))return obj.slice();
            if(typeof obj==='object'){
                var out={};
                for(var k in obj){
                    if(!Object.prototype.hasOwnProperty.call(obj,k))continue;
                    var v=obj[k];
                    if(typeof v!=='function')out[k]=clonePlain(v);
                }
                return out;
            }
            return obj;
        }
    }

    function freezeDeep(obj){
        if(!obj||typeof obj!=='object')return obj;
        Object.freeze(obj);
        Object.keys(obj).forEach(function(k){
            var v=obj[k];
            if(v&&typeof v==='object'&&!Object.isFrozen(v))freezeDeep(v);
        });
        return obj;
    }

    function abilityListFor(charKey){
        var moves=(typeof MOVE_PARAMS!=='undefined'&&MOVE_PARAMS)?MOVE_PARAMS[charKey]:null;
        if(!moves)return [];
        return Object.keys(moves).map(function(id){
            var m=moves[id]||{};
            return {
                id:id,
                name:m.name||id,
                type:m.type||id,
                input:m.input||'',
                trigger:m.trigger||'',
                cooldown:m.cd||0,
                damage:m.damage||0,
                stunDamage:m.stunDmg||0,
                duration:m.duration||0,
                tags:{
                    projectile:!!(m.type==='projectile'||m.speed),
                    fire:!!(m.fire||m.burns),
                    grab:!!(m.type==='piledriver'),
                    movement:!!(m.fwdSpeed||m.type==='dash'||m.type==='roll')
                }
            };
        });
    }

    function selectedCharacterSnapshot(){
        var idx=(typeof selectedChar==='number')?selectedChar:0;
        var defs=(typeof CHAR_DEFS!=='undefined'&&CHAR_DEFS)||[];
        var ch=defs[idx]||defs[0]||{};
        var key=ch.name||('char'+idx);
        var physics=(typeof CHAR_PHYSICS!=='undefined'&&CHAR_PHYSICS)||{};
        var snap={
            schemaVersion:1,
            index:idx,
            id:key,
            key:key,
            name:ch.name||key,
            displayName:ch.sf2||ch.name||key,
            icon:ch.icon||'',
            country:ch.country||'',
            flag:ch.flag||'',
            style:{
                color:ch.color||0,
                accent:ch.accent||0,
                bodyShape:ch.bodyShape||'normal',
                miniRx:ch.miniRx||0,
                miniRy:ch.miniRy||0
            },
            stats:{
                gravity:physics.GRAVITY||0,
                jumpForce:physics.JUMP_FORCE||0,
                moveAccel:physics.MOVE_ACCEL||0,
                maxSpeed:physics.MAX_SPEED||0,
                friction:physics.FRICTION||0
            },
            abilities:abilityListFor(key)
        };
        return freezeDeep(clonePlain(snap));
    }

    function ensureLayer(){
        if(layer&&document.body.contains(layer))return layer;
        layer=document.getElementById('plugin-layer');
        if(!layer){
            layer=document.createElement('div');
            layer.id='plugin-layer';
            layer.style.cssText='position:absolute;inset:0;z-index:60;pointer-events:none;display:none;';
            var parent=document.getElementById('game-container')||document.body;
            parent.appendChild(layer);
        }
        return layer;
    }

    function setLayerVisible(v){
        var el=ensureLayer();
        el.style.display=v?'block':'none';
        el.style.pointerEvents=v?'auto':'none';
    }

    function hideTransientCityUi(){
        var ids=['portal-prompt','door-prompt','chest-hud','minimap-wrap','map-btn','lb-btn','area-name-overlay','shop-prompt'];
        for(var i=0;i<ids.length;i++){
            var el=document.getElementById(ids[i]);
            if(el)el.style.display='none';
        }
    }

    function beginPluginIsolation(){
        if(!pluginIsolationActive){
            pluginIsolationActive=true;
            pluginIsolationPrevSfxMuted=!!window._sfxMuted;
        }
        window._sfxMuted=true;
        try{
            if(typeof stopBGM==='function')stopBGM();
            if(typeof stopRaceBGM==='function')stopRaceBGM();
            if(typeof stopSelectBGM==='function')stopSelectBGM();
            if(typeof stopTitleBGM==='function')stopTitleBGM();
        }catch(e){}
        if(!pluginUiState){
            pluginUiState={classes:{},displays:{}};
            var keepClasses=['city-hud','touch-controls'];
            for(var i=0;i<keepClasses.length;i++){
                var el=document.getElementById(keepClasses[i]);
                if(el)pluginUiState.classes[keepClasses[i]]=el.className;
            }
            var keepDisplays=['sound-controls'];
            for(var d=0;d<keepDisplays.length;d++){
                var de=document.getElementById(keepDisplays[d]);
                if(de)pluginUiState.displays[keepDisplays[d]]=de.style.display;
            }
        }
        var hud=document.getElementById('city-hud');
        if(hud)hud.classList.add('hidden');
        var touch=document.getElementById('touch-controls');
        if(touch)touch.classList.add('hidden');
        var soundControls=document.getElementById('sound-controls');
        if(soundControls)soundControls.style.display='none';
        hideTransientCityUi();
    }

    function endPluginIsolation(restartCityBgm){
        hideTransientCityUi();
        if(pluginUiState){
            for(var id in pluginUiState.classes){
                if(!Object.prototype.hasOwnProperty.call(pluginUiState.classes,id))continue;
                var el=document.getElementById(id);
                if(el)el.className=pluginUiState.classes[id];
            }
            for(var did in pluginUiState.displays){
                if(!Object.prototype.hasOwnProperty.call(pluginUiState.displays,did))continue;
                var del=document.getElementById(did);
                if(del)del.style.display=pluginUiState.displays[did];
            }
            pluginUiState=null;
        }
        if(pluginIsolationActive){
            window._sfxMuted=pluginIsolationPrevSfxMuted;
            pluginIsolationActive=false;
        }
        if(restartCityBgm&&typeof gameState!=='undefined'&&gameState==='city'&&typeof startBGM==='function'){
            try{startBGM();}catch(e){}
        }
    }

    function beginPluginSceneSwitch(){
        if(pluginSceneState)return;
        var seen=[];
        pluginSceneState={items:[]};
        window._danboPluginSceneActive=true;
        function remember(obj){
            if(!obj||typeof obj.visible!=='boolean'||seen.indexOf(obj)>=0)return;
            seen.push(obj);
            pluginSceneState.items.push({obj:obj,visible:obj.visible});
            obj.visible=false;
        }
        try{if(typeof cityGroup!=='undefined')remember(cityGroup);}catch(e){}
        try{if(typeof raceGroup!=='undefined')remember(raceGroup);}catch(e2){}
        try{if(typeof playerEgg!=='undefined'&&playerEgg&&playerEgg.mesh)remember(playerEgg.mesh);}catch(e3){}
        try{if(typeof allEggs!=='undefined'&&Array.isArray(allEggs))allEggs.forEach(function(egg){if(egg&&egg.mesh)remember(egg.mesh);});}catch(e4){}
        try{if(typeof cityNPCs!=='undefined'&&Array.isArray(cityNPCs))cityNPCs.forEach(function(npc){if(npc&&npc.mesh)remember(npc.mesh);});}catch(e5){}
        try{if(typeof _babylonTower!=='undefined'&&_babylonTower&&_babylonTower.group)remember(_babylonTower.group);}catch(e6){}
        try{if(typeof cityCloudPlatforms!=='undefined'&&Array.isArray(cityCloudPlatforms))cityCloudPlatforms.forEach(function(cp){if(cp&&cp.group)remember(cp.group);});}catch(e7){}
        try{if(window._cityAnimals&&Array.isArray(window._cityAnimals))window._cityAnimals.forEach(function(a){if(a&&a.group)remember(a.group);});}catch(e8){}
    }

    function endPluginSceneSwitch(){
        var st=pluginSceneState;
        pluginSceneState=null;
        window._danboPluginSceneActive=false;
        if(!st||!st.items)return;
        for(var i=0;i<st.items.length;i++){
            var item=st.items[i];
            try{if(item&&item.obj&&typeof item.obj.visible==='boolean')item.obj.visible=item.visible;}catch(e){}
        }
    }

    function cssColor(v,fallback){
        if(typeof v==='number'&&isFinite(v)){
            return '#'+('000000'+((v|0)&0xffffff).toString(16)).slice(-6);
        }
        return fallback||'#80ea7a';
    }

    function bridgeEnterMarkup(){
        // The real transition is drawn in the Three.js scene so it matches the old mini-game Bifrost feel.
        // This transparent marker only blocks input and gives tests a stable hook; it intentionally has no text.
        return '<div data-plugin-loading="rainbow-bridge" aria-hidden="true" style="position:absolute;inset:0;pointer-events:auto;background:rgba(255,255,255,0.01);"></div>';
    }

    var transitionCleanup=null;
    function cleanupSceneBifrost(){
        if(transitionCleanup){try{transitionCleanup();}catch(e){console.error('[PluginHost] transition cleanup failed',e);}transitionCleanup=null;}
    }
    function startSceneBifrost(durationMs){
        cleanupSceneBifrost();
        if(typeof THREE==='undefined'||typeof scene==='undefined'||!scene||typeof playerEgg==='undefined'||!playerEgg||!playerEgg.mesh)return;
        var group=new THREE.Group();group.name='danbo-plugin-bifrost';
        scene.add(group);
        var colors=[0xFF0000,0xFF8800,0xFFDD00,0x44DD44,0x4488FF,0x4400CC,0x8800CC];
        var origin={x:playerEgg.mesh.position.x,y:playerEgg.mesh.position.y,z:playerEgg.mesh.position.z};
        var rotY=playerEgg.mesh.rotation.y;
        var camStart=(typeof camera!=='undefined'&&camera)?{x:camera.position.x,y:camera.position.y,z:camera.position.z}:null;
        var rings=[],runes=[],pillars=[],particles=[],audioNodes=[];
        function mat(color,opacity){return new THREE.MeshBasicMaterial({color:color,transparent:true,opacity:opacity,depthWrite:false,side:THREE.DoubleSide});}
        function disposeMesh(mesh){
            if(!mesh)return;
            if(mesh.geometry)mesh.geometry.dispose();
            if(mesh.material){
                if(Array.isArray(mesh.material))mesh.material.forEach(function(m){if(m)m.dispose();});
                else mesh.material.dispose();
            }
        }
        function setGeom(mesh,geom){if(mesh.geometry)mesh.geometry.dispose();mesh.geometry=geom;}

        // 2026-06-17 old Bifrost shape: tiny ground rings that grow, 6 golden runes, 14 participant beams, 30 white particles.
        for(var i=0;i<7;i++){
            var ring=new THREE.Mesh(new THREE.TorusGeometry(0.1,0.08,6,32),mat(colors[i],0.8));
            ring.rotation.x=Math.PI/2;
            ring.position.set(origin.x,0.1+i*0.05,origin.z);
            ring.renderOrder=900;
            group.add(ring);rings.push(ring);
        }
        for(var rn=0;rn<6;rn++){
            var rune=new THREE.Mesh(new THREE.TorusKnotGeometry(0.15,0.04,32,6,2,3),mat(0xFFDD88,0.7));
            rune.position.set(origin.x,0.2,origin.z);
            rune.scale.set(0.01,0.01,0.01);
            rune.renderOrder=905;
            group.add(rune);runes.push(rune);
        }
        var pillarCount=14;
        for(var p=0;p<pillarCount;p++){
            var pillar=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.3,0.1,8),mat(colors[p%7],0.6));
            pillar.position.set(origin.x,0.05,origin.z);
            pillar.renderOrder=895;
            group.add(pillar);pillars.push(pillar);
        }
        for(var q=0;q<30;q++){
            var sp=new THREE.Mesh(new THREE.SphereGeometry(0.15,4,3),mat(0xFFFFFF,0.7));
            sp.visible=false;sp.renderOrder=910;
            group.add(sp);particles.push({mesh:sp,angle:Math.random()*Math.PI*2,speed:0.5+Math.random(),y:Math.random()*120});
        }
        var flash=new THREE.Mesh(new THREE.PlaneGeometry(220,220),new THREE.MeshBasicMaterial({color:0xFFFFFF,transparent:true,opacity:0,depthTest:false,depthWrite:false,side:THREE.DoubleSide}));
        flash.renderOrder=9999;scene.add(flash);

        // Use the original 6-second city-side audio timing from 2026-06-17, not the compressed 3.2s version.
        if(typeof sfxEnabled==='undefined'||sfxEnabled){
            try{
                var ac=(typeof ensureAudio==='function')?ensureAudio():null;
                if(ac){
                    if(ac.state==='suspended'&&ac.resume)ac.resume();
                    var t0=ac.currentTime;
                    function addOsc(type,f0,events,stopAt){
                        var o=ac.createOscillator(),g=ac.createGain();
                        o.type=type;o.frequency.setValueAtTime(Math.max(1,f0),t0);
                        for(var ei=0;ei<events.length;ei++){
                            var ev=events[ei];
                            if(ev.kind==='freq')o.frequency.exponentialRampToValueAtTime(Math.max(1,ev.value),t0+ev.at);
                            else if(ev.kind==='gainSet')g.gain.setValueAtTime(ev.value,t0+ev.at);
                            else if(ev.kind==='gainLinear')g.gain.linearRampToValueAtTime(ev.value,t0+ev.at);
                            else if(ev.kind==='gainExp')g.gain.exponentialRampToValueAtTime(Math.max(0.0001,ev.value),t0+ev.at);
                        }
                        o.connect(g);g.connect(ac.destination);o.start(t0);o.stop(t0+stopAt);audioNodes.push(o);
                    }
                    addOsc('triangle',2000,[
                        {kind:'freq',value:200,at:2},
                        {kind:'gainSet',value:0,at:0},{kind:'gainLinear',value:0.12,at:0.3},{kind:'gainLinear',value:0.08,at:1.5},{kind:'gainExp',value:0.001,at:2.5}
                    ],2.5);
                    addOsc('sine',40,[
                        {kind:'freq',value:45,at:6.4},
                        {kind:'gainSet',value:0,at:0},{kind:'gainLinear',value:0.1,at:1},{kind:'gainExp',value:0.001,at:6.4}
                    ],6.45);
                    var whoosh=ac.createOscillator(),whooshG=ac.createGain();
                    whoosh.type='sawtooth';whoosh.frequency.setValueAtTime(100,t0+2);
                    whoosh.frequency.exponentialRampToValueAtTime(3000,t0+5);
                    whoosh.frequency.exponentialRampToValueAtTime(500,t0+6);
                    whooshG.gain.setValueAtTime(0,t0);whooshG.gain.setValueAtTime(0,t0+2);
                    whooshG.gain.linearRampToValueAtTime(0.12,t0+3);
                    whooshG.gain.linearRampToValueAtTime(0.15,t0+5);
                    whooshG.gain.exponentialRampToValueAtTime(0.001,t0+6.5);
                    whoosh.connect(whooshG);whooshG.connect(ac.destination);whoosh.start(t0+2);whoosh.stop(t0+6.5);audioNodes.push(whoosh);
                    var arrive=ac.createOscillator(),arriveG=ac.createGain();
                    arrive.type='sawtooth';arrive.frequency.setValueAtTime(800,t0+6.0);arrive.frequency.exponentialRampToValueAtTime(220,t0+6.45);
                    arriveG.gain.setValueAtTime(0,t0);arriveG.gain.setValueAtTime(0.09,t0+6.0);arriveG.gain.exponentialRampToValueAtTime(0.001,t0+6.48);
                    arrive.connect(arriveG);arriveG.connect(ac.destination);arrive.start(t0+6.0);arrive.stop(t0+6.5);audioNodes.push(arrive);
                }
            }catch(eAudio){}
        }

        var start=Date.now(),dur=durationMs||6500,raf=0,done=false;
        function ease(x){return x<0?0:(x>1?1:(x<0.5?2*x*x:1-Math.pow(-2*x+2,2)/2));}
        function frame(){
            if(done)return;
            var elapsed=Date.now()-start;
            var t=Math.min(1,elapsed/dur);
            var pillarTop=120;
            // Phase 1: old 2s rainbow descends from sky.
            if(elapsed<2000){
                var p1=elapsed/2000;
                var pillarBot=pillarTop*(1-p1);
                var pillarH=pillarTop-pillarBot;
                for(var a=0;a<pillars.length;a++){
                    var pl=pillars[a];
                    setGeom(pl,new THREE.CylinderGeometry(0.12,0.25,Math.max(0.1,pillarH),6));
                    var spiral=elapsed*0.003+a*(Math.PI*2/pillarCount);
                    var sr=0.3+(a%5)*0.25+Math.floor(a/5)*0.4;
                    pl.position.set(origin.x+Math.cos(spiral)*sr,pillarBot+pillarH/2,origin.z+Math.sin(spiral)*sr);
                    pl.material.opacity=0.3+p1*0.5;
                }
                for(var r=0;r<rings.length;r++){
                    var ringP=Math.max(0,(p1-0.5)*2);
                    var targetR=0.3+r*0.4;
                    setGeom(rings[r],new THREE.TorusGeometry(Math.max(0.001,targetR*ringP),0.06+ringP*0.06,6,32));
                    rings[r].rotation.x=Math.PI/2;rings[r].rotation.z=elapsed*0.002+r*0.5;
                    rings[r].position.set(origin.x,0.1+r*0.05,origin.z);
                    rings[r].material.opacity=ringP*0.8;
                }
                for(var rn1=0;rn1<runes.length;rn1++)runes[rn1].scale.set(0.01,0.01,0.01);
                for(var pt1=0;pt1<particles.length;pt1++){
                    var pa=particles[pt1];pa.mesh.visible=true;pa.y-=pa.speed*2;if(pa.y<0)pa.y=pillarTop;pa.angle+=0.03;
                    var pr=0.8+Math.sin(pa.angle*3)*0.4;
                    pa.mesh.position.set(origin.x+Math.cos(pa.angle)*pr,pa.y,origin.z+Math.sin(pa.angle)*pr);
                    pa.mesh.material.opacity=0.3+p1*0.5;
                }
                if(camStart&&typeof camera!=='undefined'&&camera){
                    camera.position.x=camStart.x;camera.position.y=camStart.y;camera.position.z=camStart.z;
                    camera.lookAt(origin.x,origin.y+20+p1*30,origin.z);
                }
            }
            // Phase 2: old 4s rings lock on + player sucked into the light.
            else if(elapsed<6000){
                var p2=(elapsed-2000)/4000;
                var ep2=ease(p2);
                for(var b=0;b<pillars.length;b++){
                    var pl2=pillars[b];
                    setGeom(pl2,new THREE.CylinderGeometry(0.12,0.25,120,6));
                    var spiral2=elapsed*0.003+b*(Math.PI*2/pillarCount);
                    var sr2=0.3+(b%5)*0.25+Math.floor(b/5)*0.4;
                    pl2.position.set(origin.x+Math.cos(spiral2)*sr2,60,origin.z+Math.sin(spiral2)*sr2);
                    pl2.material.opacity=0.6+Math.sin(elapsed*0.01+b)*0.3;
                }
                for(var r2=0;r2<rings.length;r2++){
                    var fullR=0.3+r2*0.4;
                    var constrict=1-p2*0.3;
                    setGeom(rings[r2],new THREE.TorusGeometry(Math.max(0.001,fullR*constrict),0.12,6,32));
                    rings[r2].rotation.x=Math.PI/2;rings[r2].rotation.z=elapsed*0.005+r2*0.5;
                    rings[r2].position.set(origin.x,origin.y+ep2*40,origin.z);
                    rings[r2].material.opacity=0.8;
                }
                for(var rn2=0;rn2<runes.length;rn2++){
                    var runeA=elapsed*0.005+rn2*(Math.PI*2/6);
                    var runeR=1.5*(1-p2);
                    runes[rn2].visible=true;
                    runes[rn2].position.set(origin.x+Math.cos(runeA)*runeR,origin.y+ep2*40,origin.z+Math.sin(runeA)*runeR);
                    runes[rn2].scale.set(1-p2,1-p2,1-p2);
                    runes[rn2].rotation.y=elapsed*0.008;
                }
                if(playerEgg&&playerEgg.mesh){
                    var riseY=origin.y+ep2*40;
                    playerEgg.mesh.position.set(origin.x,riseY,origin.z);
                    playerEgg.mesh.rotation.y=rotY+elapsed*0.006;
                    var sc=1-ep2*0.28;playerEgg.mesh.scale.set(sc,sc,sc);
                }
                if(camStart&&typeof camera!=='undefined'&&camera){
                    camera.position.x=camStart.x+Math.sin(elapsed*0.06)*0.15*p2;
                    camera.position.y=camStart.y+ep2*35;
                    camera.position.z=camStart.z+ep2*5;
                    camera.lookAt(origin.x,origin.y+ep2*40+5,origin.z);
                }
                for(var pt2=0;pt2<particles.length;pt2++){
                    var pb=particles[pt2];pb.mesh.visible=true;pb.y+=pb.speed*1.5;if(pb.y>120)pb.y=0;pb.angle+=0.03;
                    var pr2=0.6+Math.sin(pb.angle*3)*0.3;
                    pb.mesh.position.set(origin.x+Math.cos(pb.angle)*pr2,pb.y,origin.z+Math.sin(pb.angle)*pr2);
                    pb.mesh.material.opacity=0.5+Math.sin(elapsed*0.01+pt2)*0.4;
                }
            }
            // Final flash: plugin replaces the destination scene after the original city-side suck-up.
            else{
                var pf=Math.min(1,(elapsed-6000)/Math.max(1,dur-6000));
                for(var c=0;c<pillars.length;c++)pillars[c].material.opacity=Math.max(0,0.7*(1-pf));
                for(var rr=0;rr<rings.length;rr++)rings[rr].material.opacity=Math.max(0,0.7*(1-pf));
                for(var ru=0;ru<runes.length;ru++)runes[ru].material.opacity=Math.max(0,0.5*(1-pf));
                for(var pp=0;pp<particles.length;pp++)particles[pp].mesh.material.opacity=Math.max(0,0.4*(1-pf));
                if(playerEgg&&playerEgg.mesh){playerEgg.mesh.position.set(origin.x,origin.y+40,origin.z);playerEgg.mesh.rotation.y+=0.12;}
                flash.material.opacity=Math.max(0,0.95*(1-Math.abs(pf-0.22)/0.22));
            }
            if(typeof camera!=='undefined'&&camera){flash.position.copy(camera.position);flash.quaternion.copy(camera.quaternion);flash.translateZ(-1);}
            if(typeof R!=='undefined'&&R&&typeof R.render==='function')R.render(scene,camera);
            raf=requestAnimationFrame(frame);
        }
        frame();
        transitionCleanup=function(){
            done=true;if(raf)cancelAnimationFrame(raf);
            for(var n=0;n<audioNodes.length;n++){try{audioNodes[n].stop(0);}catch(eStop){}}
            if(playerEgg&&playerEgg.mesh){playerEgg.mesh.position.set(origin.x,origin.y,origin.z);playerEgg.mesh.rotation.y=rotY;playerEgg.mesh.scale.set(1,1,1);}
            for(var i=group.children.length-1;i>=0;i--){var ch=group.children[i];disposeMesh(ch);group.remove(ch);}
            scene.remove(group);disposeMesh(flash);scene.remove(flash);
        };
    }

    function makeStorage(pluginId){
        var prefix='danbo_plugin:'+pluginId+':';
        return {
            get:function(key,fallback){
                try{
                    var raw=localStorage.getItem(prefix+key);
                    if(raw===null||raw===undefined)return fallback;
                    return JSON.parse(raw);
                }catch(e){return fallback;}
            },
            set:function(key,value){
                try{localStorage.setItem(prefix+key,JSON.stringify(value));return true;}
                catch(e){return false;}
            },
            remove:function(key){try{localStorage.removeItem(prefix+key);}catch(e){}}
        };
    }

    function makeContext(pluginId,options){
        options=options||{};
        var mount=ensureLayer();
        mount.innerHTML='';
        var characterSnapshot=selectedCharacterSnapshot();
        var net=(window.DANBO_NET&&window.DANBO_NET.createRoom)?window.DANBO_NET.createRoom({
            pluginId:pluginId,
            character:characterSnapshot,
            network:options.network||null,
            roomId:options.roomId||null
        }):null;
        var finished=false;
        var ctx={
            pluginId:pluginId,
            options:freezeDeep(clonePlain(options)),
            character:characterSnapshot,
            mount:mount,
            storage:makeStorage(pluginId),
            net:net,
            network:net,
            api:{
                finish:function(result){finish(result);},
                setTitle:function(text){mount.setAttribute('data-title',String(text||''));},
                play:function(name){
                    if(name==='confirm'&&typeof playMenuConfirm==='function')playMenuConfirm();
                    else if(name==='move'&&typeof playMenuMove==='function')playMenuMove();
                    else if(name==='cancel'&&typeof playMenuBack==='function')playMenuBack();
                }
            }
        };
        function finish(result){
            if(finished)return;
            finished=true;
            stop(result||{status:'finished'});
        }
        return ctx;
    }

    function register(def){
        if(!def||!def.id){console.warn('[PluginHost] invalid plugin definition',def);return false;}
        if(typeof def.create!=='function'){console.warn('[PluginHost] plugin missing create(ctx): '+def.id);return false;}
        registry[def.id]=def;
        return true;
    }

    function registerEntrance(def){
        if(!def||!def.id){console.warn('[PluginHost] invalid entrance definition',def);return false;}
        if(typeof def.create!=='function'){console.warn('[PluginHost] entrance missing create(ctx): '+def.id);return false;}
        entrances[def.id]=def;
        return true;
    }

    function entranceList(){
        return Object.keys(entrances).sort().map(function(id){return entrances[id];});
    }

    function manifestEntry(id){
        for(var i=0;i<manifest.length;i++){
            if(manifest[i]&&manifest[i].id===id)return manifest[i];
        }
        return null;
    }

    function setManifest(list){
        manifest=Array.isArray(list)?clonePlain(list):[];
    }

    function list(){
        var seen={}, ids=[];
        manifest.forEach(function(m){if(m&&m.id&&!seen[m.id]){seen[m.id]=1;ids.push(m.id);}});
        Object.keys(registry).forEach(function(id){if(!seen[id]){seen[id]=1;ids.push(id);}});
        return ids.sort().map(function(id){
            var p=registry[id]||{};
            var m=manifestEntry(id)||{};
            return freezeDeep({
                id:id,
                name:p.name||m.name||id,
                version:p.version||m.version||'',
                description:p.description||m.description||'',
                enabled:m.enabled!==false,
                loaded:!!registry[id]
            });
        });
    }

    function pluginScripts(pluginId){
        var m=manifestEntry(pluginId)||{};
        var files=[];
        if(Array.isArray(m.scripts))m.scripts.forEach(function(src){if(src)files.push(src);});
        else if(m.script)files.push(m.script);
        return files;
    }

    function cacheSuffix(){
        var v=window.DANBO_ASSET_VERSION||'';
        return v?('?'+v):'';
    }

    function loadScriptOnce(src,onload,onerror){
        if(loadedScripts[src]){onload();return;}
        if(pendingScripts[src]){pendingScripts[src].push({ok:onload,fail:onerror});return;}
        pendingScripts[src]=[{ok:onload,fail:onerror}];
        var s=document.createElement('script');
        s.src=src+cacheSuffix();
        s.onload=function(){
            loadedScripts[src]=true;
            var q=pendingScripts[src]||[];delete pendingScripts[src];
            q.forEach(function(cb){try{cb.ok&&cb.ok();}catch(e){setTimeout(function(){throw e;},0);}});
        };
        s.onerror=function(){
            var q=pendingScripts[src]||[];delete pendingScripts[src];
            q.forEach(function(cb){try{cb.fail&&cb.fail(new Error('Failed to load plugin script '+src));}catch(e){setTimeout(function(){throw e;},0);}});
        };
        document.body.appendChild(s);
    }

    function loadPluginRuntime(pluginId,onload,onerror){
        if(registry[pluginId]){onload();return;}
        var files=pluginScripts(pluginId);
        if(!files.length){onerror(new Error('Plugin scripts not found: '+pluginId));return;}
        var i=0;
        function next(){
            if(registry[pluginId]){onload();return;}
            if(i>=files.length){
                if(registry[pluginId])onload();
                else onerror(new Error('Plugin did not register: '+pluginId));
                return;
            }
            loadScriptOnce(files[i++],next,onerror);
        }
        next();
    }

    function startLoaded(pluginId,options){
        var def=registry[pluginId];
        if(!def)throw new Error('Plugin not registered: '+pluginId);
        stop({status:'replaced'});
        beginPluginIsolation();
        var ctx=makeContext(pluginId,options||{});
        cleanupSceneBifrost();
        beginPluginSceneSwitch();
        setLayerVisible(true);
        window._danboPluginTransition=false;
        var instance=def.create(ctx)||{};
        active={id:pluginId,def:def,ctx:ctx,instance:instance,startedAt:Date.now()};
        return active;
    }

    function start(pluginId,options){
        var m=manifestEntry(pluginId);
        if(!registry[pluginId]&&!m)throw new Error('Plugin not registered: '+pluginId);
        var mount=ensureLayer();
        stop({status:'replaced'});
        var seq=++loadSeq;
        var bridgeStarted=Date.now();
        var bridgeDuration=6500;
        setLayerVisible(true);
        window._danboPluginTransition=true;
        beginPluginIsolation();
        mount.innerHTML=bridgeEnterMarkup();
        startSceneBifrost(bridgeDuration);
        function finishStart(){
            var wait=Math.max(0,bridgeDuration-(Date.now()-bridgeStarted));
            setTimeout(function(){
                if(seq===loadSeq)startLoaded(pluginId,options||{});
            },wait);
        }
        if(registry[pluginId]){
            finishStart();
        }else{
            loadPluginRuntime(pluginId,finishStart,function(e){
            if(seq!==loadSeq)return;
            console.error('[PluginHost] lazy load failed',e);
            mount.innerHTML='<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(32,8,8,.75);color:#fff;font:900 18px system-ui,Segoe UI,sans-serif;">进入失败，请重试</div>';
            setTimeout(function(){stop({status:'error',reason:'load failed'});},900);
            });
        }
        return {id:pluginId,loading:true,startedAt:Date.now()};
    }

    function stop(result){
        var isReplace=!!(result&&result.status==='replaced');
        var hadActive=!!active;
        var hadTransition=!!window._danboPluginTransition;
        loadSeq++;
        if(active&&active.instance&&typeof active.instance.destroy==='function'){
            try{active.instance.destroy(result||{status:'stopped'});}catch(e){console.error('[PluginHost] destroy failed',e);}
        }
        if(active&&active.ctx&&active.ctx.net&&typeof active.ctx.net.close==='function'){
            try{active.ctx.net.close();}catch(e2){}
        }
        active=null;
        cleanupSceneBifrost();
        window._danboPluginTransition=false;
        if(layer){layer.innerHTML='';setLayerVisible(false);}
        if(isReplace){
            hideTransientCityUi();
        }else{
            endPluginSceneSwitch();
            endPluginIsolation(hadActive||hadTransition);
        }
    }

    function update(dt){
        if(active&&active.instance&&typeof active.instance.update==='function'){
            active.instance.update(dt||0,active.ctx);
        }
    }

    window.DANBO_PLUGIN_HOST={
        register:register,
        registerEntrance:registerEntrance,
        setManifest:setManifest,
        list:list,
        get:function(id){return registry[id]||manifestEntry(id)||null;},
        getEntrance:function(id){return entrances[id]||null;},
        getEntrances:entranceList,
        start:start,
        stop:stop,
        update:update,
        getActive:function(){return active?{id:active.id,startedAt:active.startedAt}:null;},
        getCharacterSnapshot:selectedCharacterSnapshot
    };
})();
