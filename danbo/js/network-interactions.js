// Network actors are deliberately NOT inserted into allEggs: local NPC combat
// must never mutate another client's avatar or manufacture PvP rewards.
(function(root){
    'use strict';
    var boundRoom=null,lastThrow=-1,wasF=false,pendingUntil=0,consumedF=false,armed=false,chargeAt=null,throwPending=false;
    var struggleKeys={},hintNode=null,notice='',noticeUntil=0,releasedInactive=false,posed=false;
    function carryPose(on){
        var p=player(),ud=p&&p.mesh&&p.mesh.userData;if(!ud)return;
        if(on||posed){['rightArm','leftArm'].forEach(function(key,index){var arm=ud[key];if(!arm)return;
            arm.visible=on;arm.scale.set(1,1,1);arm.position.set(index?-.4:.4,on?.9:.2,on?.45:.7);});}
        posed=on;
    }
    function net(){return root.DANBO_MULTIPLAYER;}
    function room(){var n=net();return n&&n.isConnected()?n.getRoom():null;}
    function ready(r){return !!(r&&r.state&&r.state.interactionVersion===1&&r.state.players);}
    function self(r){return r&&r.state&&r.state.players?r.state.players.get(r.sessionId):null;}
    function player(){return typeof playerEgg!=='undefined'?playerEgg:null;}
    function actor(r,id){return id.indexOf('bot:')===0?r.state.bots&&r.state.bots.get(id.slice(4)):r.state.players.get(id);}
    function each(r,fn){r.state.players.forEach(function(p,id){fn(p,id);});if(r.state.bots)r.state.bots.forEach(function(p,id){fn(p,'bot:'+id);});}
    function remote(id){var n=net();return n&&n.getRemoteActor?n.getRemoteActor(id):null;}
    function inWorld(){
        var p=player();return !!p&&p.alive&&typeof gameState!=='undefined'&&gameState==='city'&&
            !root._interiorActive&&!root._danboPluginTransition&&!root._pipeTraveling&&!root._pipeCityBuilding&&
            !root._accountPanelOpen&&!root._multiplayerPanelOpen&&!root._journeyPanelOpen&&!root._worldMapOpen&&!root._shopOpen&&!root._portalConfirmOpen&&
            !(root.document&&document.hidden)&&!(root.DANBO_PLUGIN_HOST&&DANBO_PLUGIN_HOST.getActive());
    }
    function interactive(){
        var p=player();return inWorld()&&!p.heldBy&&!p.holding&&!p.holdingProp&&!p.holdingObs&&
            !p._piledriverTarget&&!p._bodySlam&&!p._tatsuActive&&
            !p._shoryuActive&&!p._hondaDash&&!p._blankaSpinTimer&&!p._guileSomersault&&!p._yogaFlame&&!root._spinDashing;
    }
    function combatReady(){var p=player();return inWorld()&&!p.heldBy;}
    function snapshot(){var p=player();if(!p)return null;return {ack:lastThrow,air:p.throwTimer||0,total:p._throwTotal||0,stun:p._stunTimer||0,flinch:p._hitStun||0,burn:p._onFire||0,shock:p._electrocuted||0,fly:p._elecFlying||0,squash:Math.round((p.squash||1)*100)/100};}
    function attack(egg,kind,direction){
        if(egg!==player()||!combatReady()||!ready(room())||egg._networkHeldBy||egg._networkHolding||egg.throwTimer>0||egg._stunTimer>0||egg._hitStun>0||egg._electrocuted>0)return;
        if(net().flushState)net().flushState();
        room().send('interact',{action:'attack',kind:kind,direction:Number.isFinite(direction)?direction:egg.mesh.rotation.y});
    }
    function event(message){
        if(!message||!inWorld()||Number(message.city)!==Number(currentCityStyle))return;
        var r=room();if(!r)return;
        if(message.type==='hit'){
            var v=message.target===r.sessionId?player():remote(message.target),egg=v&&(v.egg||v);
            if(egg&&message.kind==='somersault'&&typeof spawnSlashEffect==='function')spawnSlashEffect(egg,0);
            if((message.id===r.sessionId||message.target===r.sessionId)&&typeof playHitSound==='function')playHitSound();
        }else if(message.type==='attack'&&message.kind==='projectile'&&message.id!==r.sessionId){
            var v=remote(message.id);
            if(v&&typeof MoveProjectile_execute==='function')MoveProjectile_execute(v.egg,Number(message.direction)||0,{speed:Number(message.speed)||.3,life:Number(message.life)||80,color:0x8fe9ff,ringColor:0xffffff,networkVisualOnly:true});
        }
    }
    function send(action,target,charge){var r=room();if(!ready(r))return false;r.send('interact',{action:action,target:target,charge:charge});return true;}
    function hint(copy){
        if(!root.document||!document.createElement)return;
        if(!hintNode&&copy){hintNode=document.createElement('div');hintNode.id='network-interaction-hint';hintNode.setAttribute('role','status');
            hintNode.style.cssText='position:absolute;left:50%;bottom:28%;transform:translateX(-50%);z-index:90;max-width:calc(100% - 32px);padding:8px 14px;border-radius:16px;background:rgba(15,37,45,.9);color:#fff;font:600 13px/1.5 sans-serif;text-align:center;pointer-events:none;';
            var parent=document.getElementById('game-container')||document.body;if(parent)parent.appendChild(hintNode);}
        if(hintNode){var text=copy&&root.UI_T?UI_T(copy):copy||'';if(hintNode.hidden!==!copy)hintNode.hidden=!copy;if(hintNode.textContent!==text)hintNode.textContent=text;}
    }
    function reset(){
        carryPose(false);
        if(root._allProjectiles&&typeof MoveProjectile_cleanup==='function')for(var i=_allProjectiles.length-1;i>=0;i--){
            if(_allProjectiles[i].networkVisualOnly){MoveProjectile_cleanup(_allProjectiles[i]);_allProjectiles.splice(i,1);}}
        var p=player();if(p){p._networkHeldBy='';p._networkHolding='';p._networkThrowLock=0;p._networkHitUntil=0;p._networkFlight=false;}
        boundRoom=null;lastThrow=-1;wasF=false;pendingUntil=0;consumedF=false;armed=false;chargeAt=null;throwPending=false;
        struggleKeys={};notice='';noticeUntil=0;releasedInactive=false;hint('');
    }
    function carryPosition(r,holderId){
        var h=holderId===r.sessionId?player():remote(holderId),a=actor(r,holderId);
        if(h){var mesh=h.mesh||h.root;if(mesh)return {x:mesh.position.x,y:mesh.position.y,z:mesh.position.z,rotation:mesh.rotation.y};}
        return a;
    }
    function placeHeld(mesh,h){mesh.position.set(h.x+Math.sin(h.rotation)*.45,h.y+1.8,h.z+Math.cos(h.rotation)*.45);mesh.rotation.y=h.rotation;}
    function update(){
        var r=room(),p=player(),s=self(r),now=performance.now();
        if(!ready(r)||!p||!s){if(boundRoom)reset();return;}
        if(boundRoom!==r){reset();boundRoom=r;lastThrow=Number(s.throwSerial)||0;}
        if(!inWorld()){
            if(!releasedInactive&&(s.holding||s.heldBy)){send('release');releasedInactive=true;}
            p._networkHeldBy='';p._networkHolding='';pendingUntil=0;carryPose(false);hint('');return;
        }
        releasedInactive=false;p._networkHeldBy=String(s.heldBy||'');p._networkHolding=String(s.holding||'');
        carryPose(!!s.holding);
        if(s.holding){pendingUntil=0;p._throwCharging=false;}
        else{throwPending=false;chargeAt=null;}
        var serial=Number(s.throwSerial)||0;
        if(serial!==lastThrow){
            lastThrow=serial;p.mesh.position.set(Number(s.throwX)||0,Number(s.throwY)||0,Number(s.throwZ)||0);
            p.vx=Number(s.throwVx)||0;p.vy=Number(s.throwVy)||0;p.vz=Number(s.throwVz)||0;
            p.onGround=false;p._networkFlight=true;p._networkThrowLock=now+(Number(s.hitStun)||450);p.grabCD=30;
            if(s.hitStun){p.squash=.65;p._networkHitUntil=now+Number(s.hitStun);}
            if(s.reaction){
                var effect=null;try{effect=JSON.parse(s.reaction);}catch(e){}
                if(effect){
                    // Exactly the same fields consumed by NPC physics, pain
                    // faces, bounce, stun stars, fire and electricity rendering.
                    p.throwTimer=p._throwTotal=Number(effect.air)||0;p._bounces=Number(effect.bounces)||0;p._chargeDrag=Number(effect.drag)||.98;
                    p.squash=Number(effect.squash)||1;p._hitStun=Number(effect.flinch)||0;
                    if(effect.stunDamage&&typeof _addStunDamage==='function')_addStunDamage(p,Number(effect.stunDamage));
                    p._stunTimer=Math.max(p._stunTimer||0,Number(effect.stun)||0);p._onFire=Number(effect.burn)||0;p._electrocuted=Number(effect.shock)||0;
                    if(p._electrocuted)p._elecKnockDir={x:Math.sin(effect.direction||0),z:Math.cos(effect.direction||0)};
                    p._networkThrowLock=0;p._networkHitUntil=0;
                    p._dropCoinsOnLand=false;p._coinsDropped=false;
                }
            }
        }
        if(p._networkFlight&&p.onGround&&now>p._networkThrowLock)p._networkFlight=false;
        if(s.heldBy){
            var h=carryPosition(r,s.heldBy);if(h)placeHeld(p.mesh,h);else p.mesh.position.set(s.x,s.y,s.z);
            p.vx=p.vy=p.vz=0;p.onGround=false;
            if(typeof _jumpCharge!=='undefined')_jumpCharge=0;
            if(typeof _jumpCharging!=='undefined')_jumpCharging=false;
        }
        // Anchor carried visuals to the interpolated carrier rather than letting
        // two independent smoothing curves visibly pull the pair apart.
        each(r,function(a,id){if(id===r.sessionId||!a.heldBy)return;var visual=remote(id),h=carryPosition(r,a.heldBy);
            if(visual&&h)placeHeld(visual.root||visual.mesh,h);});
        if(s.heldBy)hint('被抓住了 · 连按方向或跳跃挣脱');
        else if(s.holding)hint(chargeAt!==null?'蓄力中 · 松开投掷':'已抓起 · 再按抓取投掷，长按蓄力');
        else if(pendingUntil>now)hint('抓取中…');
        else hint(noticeUntil>now?notice:'');
    }
    function resolveBodies(){
        var r=room(),p=player();
        if(!ready(r)||!p||gameState!=='city'||root._interiorActive||root._pipeTraveling||root._pipeCityBuilding||root._danboPluginTransition||root.DANBO_PLUGIN_HOST&&DANBO_PLUGIN_HOST.getActive())return;
        var locals=typeof cityNPCs!=='undefined'?cityNPCs:typeof allEggs!=='undefined'?allEggs:[];
        each(r,function(a,id){
            if(id===r.sessionId||a.connected===false||a.heldBy||Number(a.city)!==Number(currentCityStyle))return;
            var v=remote(id);if(!v)return;var mesh=v.root||v.mesh;if(!mesh.visible)return;
            // Remote positions are read-only. Only local simulation yields;
            // adding proxies to allEggs would incorrectly grant local PvP authority.
            var body={mesh:mesh,radius:v.egg&&v.egg.radius||.55,vx:0,vz:0};
            resolveEggBodyContact(p,body,1,0,r.sessionId<id?1:-1);
            for(var i=0;i<locals.length;i++)if(locals[i]!==p)resolveEggBodyContact(locals[i],body,1,0);
        });
    }
    function input(keys){
        var p=player(),r=room(),s=self(r),now=performance.now(),down=!!keys.KeyF,rising=down&&!wasF,falling=!down&&wasF;
        wasF=down;if(!ready(r)||!p||!s||!inWorld())return false;
        if(s.holding){
            if(!down)armed=true;
            if(rising&&armed&&!throwPending)chargeAt=now;
            if(falling&&chargeAt!==null&&!throwPending){
                var amount=Math.max(0,Math.min(1,(now-chargeAt-300)/1000));
                if(net().flushState)net().flushState();send('throw',undefined,amount);throwPending=true;chargeAt=null;armed=false;
                p.grabCD=20;if(typeof playThrowSound==='function')playThrowSound();
            }
            return true;
        }
        if(pendingUntil>now||consumedF){if(!down){armed=true;if(pendingUntil<=now)consumedF=false;}return true;}
        if(!rising||!interactive()||p.grabCD>0||p._attackCD>0)return false;
        var nearest='',distance=2.5;
        each(r,function(a,id){
            if(id===r.sessionId||a.connected===false||!a.interactive||a.heldBy||a.holding||Number(a.city)!==Number(currentCityStyle))return;
            var v=remote(id),mesh=v&&(v.root||v.mesh);if(!mesh||!mesh.visible||Math.abs(mesh.position.y-p.mesh.position.y)>1.7)return;
            var d=Math.hypot(mesh.position.x-p.mesh.position.x,mesh.position.z-p.mesh.position.z);if(d<distance){distance=d;nearest=id;}
        });
        // Preserve existing NPC / item interactions if the local NPC is closer.
        if(nearest&&typeof allEggs!=='undefined')for(var i=0;i<allEggs.length;i++){
            var e=allEggs[i];if(e===p||!e.alive||e.heldBy||e.holding)continue;
            if(Math.hypot(e.mesh.position.x-p.mesh.position.x,e.mesh.position.z-p.mesh.position.z)<distance)return false;
        }
        if(!nearest)return false;
        if(net().flushState)net().flushState();send('grab',nearest);
        pendingUntil=now+1000;consumedF=true;armed=false;chargeAt=null;throwPending=false;
        p._fPressStart=false;p._fWasDown=false;p._fHoldFrames=0;p._throwCharging=false;return true;
    }
    function heldInput(keys){
        var p=player();if(!p)return false;
        if(p._networkHeldBy){
            var pressed=false;['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight','Space','KeyF'].forEach(function(code){
                if(keys[code]&&!struggleKeys[code])pressed=true;struggleKeys[code]=!!keys[code];});
            if(pressed)send('struggle');return true;
        }
        struggleKeys={};if(performance.now()<(p._networkHitUntil||0))return false; // Use the existing special-move interruption cleanup.
        return performance.now()<(p._networkThrowLock||0);
    }
    function result(message){
        if(!message||message.action!=='grab')return;
        if(message.ok){if(typeof playGrabSound==='function')playGrabSound();}
        else{pendingUntil=0;notice='暂时无法抓取，靠近后再试';noticeUntil=performance.now()+1600;}
    }
    function disposeRemote(v){
        if(v.egg&&typeof _removeStunStars==='function')_removeStunStars(v.egg);
        if(v.hitFire){v.root.remove(v.hitFire);if(typeof disposeTransientObject3D==='function')disposeTransientObject3D(v.hitFire);v.hitFire=null;}
    }
    function animateRemote(v,s,dt){
        if(!v.avatar||!v.egg)return;
        var egg=v.egg,avatar=v.avatar,body=avatar.userData.body;
        egg.throwTimer=Number(s.hurtAir)||0;egg._stunTimer=Number(s.hurtStun)||0;egg._hitStun=Number(s.hurtFlinch)||0;
        egg._onFire=Number(s.hurtBurn)||0;egg._electrocuted=Number(s.hurtShock)||0;egg._elecFlying=Number(s.hurtFly)||0;
        var hurt=egg.throwTimer||egg._stunTimer||egg._hitStun||egg._onFire||egg._electrocuted||egg._elecFlying;
        if(hurt){
            var sq=Math.max(.2,Math.min(1.5,Number(s.hurtSquash)||1));avatar.scale.set(1+(1-sq)*.3,sq,1+(1-sq)*.3);
            ['rightArm','leftArm','rightLeg','leftLeg'].forEach(function(key){if(avatar.userData[key])avatar.userData[key].visible=false;});
            var feet=avatar.userData.feet||[];for(var i=0;i<feet.length&&i<v.footBase.length;i++)feet[i].position.copy(v.footBase[i]);
        }else if(v.wasHurt)avatar.scale.set(1,1,1);
        if(typeof _updatePainFace==='function')_updatePainFace(egg);
        if(typeof _updateStunStars==='function')_updateStunStars(egg);
        if(body&&(egg._electrocuted||egg._elecFlying)&&typeof _setElectricBodyFlash==='function'){
            _setElectricBodyFlash(egg,body,Math.floor((egg._electrocuted||egg._elecFlying)/3)%2===0?0x111111:0xffffff);v.wasShocked=true;
        }else if(body&&v.wasShocked&&typeof _restoreElectricBody==='function'){_restoreElectricBody(egg,body);v.wasShocked=false;}
        if(egg._onFire>0){
            if(!v.hitFire){
                v.hitFire=new THREE.InstancedMesh(new THREE.SphereGeometry(.22,5,4),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.8,depthWrite:false,toneMapped:false}),14);
                v.hitFire.name='danbo-network-hit-fire';v.hitFire.frustumCulled=false;v.hitFire.userData.matrix=new THREE.Matrix4();
                for(var i=0;i<14;i++)v.hitFire.setColorAt(i,new THREE.Color(i<4?0xffdd22:0xff7700));v.root.add(v.hitFire);
            }
            var m=v.hitFire.userData.matrix,time=performance.now()*.006;
            for(var i=0;i<14;i++){var a=i*Math.PI*2/14+time,scale=.6+.4*Math.sin(time*2+i);m.makeScale(scale,scale*1.7,scale);m.setPosition(Math.cos(a)*.55,.15+((time*.25+i/14)%1)*1.7,Math.sin(a)*.55);v.hitFire.setMatrixAt(i,m);}v.hitFire.instanceMatrix.needsUpdate=true;
            if(body&&typeof _safeSetEmissive==='function')_safeSetEmissive(body,0xff4400,.3+Math.sin(time)*.15);
        }else if(v.hitFire){v.root.remove(v.hitFire);disposeTransientObject3D(v.hitFire);v.hitFire=null;if(body&&typeof _safeSetEmissive==='function')_safeSetEmissive(body,0);}
        v.wasHurt=!!hurt;
    }
    root.DANBO_INTERACTIONS={update:update,resolveBodies:resolveBodies,input:input,heldInput:heldInput,interactive:interactive,combatReady:combatReady,snapshot:snapshot,attack:attack,event:event,reset:reset,result:result,animateRemote:animateRemote,disposeRemote:disposeRemote};
})(window);
