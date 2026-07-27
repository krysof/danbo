// ============================================================
//  moves.js — Unified special move system (Phase 1-8 refactor)
// ============================================================

// Global projectile pool — replaces _playerHadouken + _npcHadoukens
if(!window._allProjectiles) window._allProjectiles=[];

// ---- Shared hit detection utility ----
function _moveHitDetect(sourceEgg, projPos, range, callback){
    for(var i=0;i<allEggs.length;i++){
        var t=allEggs[i];
        if(t===sourceEgg||!t.alive||t.heldBy||t._piledriverLocked)continue;
        var dx=t.mesh.position.x-projPos.x;
        var dz=t.mesh.position.z-projPos.z;
        var dist=DANBO_WASM.len2D(dx,dz);
        if(dist<range){
            if(callback(t,dist,dx,dz))return true;
        }
    }
    return false;
}

// ---- Shared knockback application ----
function _moveApplyKnockback(target, dx, dz, dist, force, vy, opts){
    opts=opts||{};
    target.vx+=dx*force;
    target.vz+=dz*force;
    target.vy=vy;
    target.squash=opts.squash||0.5;
    target.throwTimer=opts.throwTimer||25;
    target._bounces=opts.bounces||1;
    if(opts.stunDmg) _addStunDamage(target,opts.stunDmg);
    if(opts.fire) target._onFire=opts.fire;
    if(opts.electrocute){target._electrocuted=opts.electrocute;target._elecKnockDir={x:-dx/(dist||1),z:-dz/(dist||1)};target.vx=0;target.vz=0;}
    if(opts.slashEffect) spawnSlashEffect(target,opts.slashDir||0);
    _dropNpcStolenCoins(target);
    if(target.isPlayer) playHitSound(target.mesh.position.x,target.mesh.position.z);
    else playHitSound(target.mesh.position.x,target.mesh.position.z);
}

// ---- Create sonic boom crescent canvas texture ----
function _createSonicBoomTexture(){
    var cvs=document.createElement('canvas');cvs.width=64;cvs.height=64;
    var ctx=cvs.getContext('2d');
    ctx.fillStyle='#FFDD44';
    ctx.beginPath();ctx.arc(32,32,28,0,Math.PI*2);ctx.fill();
    ctx.globalCompositeOperation='destination-out';
    ctx.beginPath();ctx.arc(44,32,22,0,Math.PI*2);ctx.fill();
    return new THREE.CanvasTexture(cvs);
}

// ---- Create yoga fire mesh group ----
function _createYogaFireGroup(){
    var grp=new THREE.Group();
    var core=new THREE.Mesh(new THREE.SphereGeometry(0.3,8,6),new THREE.MeshBasicMaterial({color:0xFFDD00,transparent:true,opacity:0.95}));
    grp.add(core);
    var outer=new THREE.Mesh(new THREE.SphereGeometry(0.45,8,6),new THREE.MeshBasicMaterial({color:0xFF4400,transparent:true,opacity:0.5}));
    grp.add(outer);
    for(var i=0;i<6;i++){
        var p=new THREE.Mesh(new THREE.SphereGeometry(0.15+Math.random()*0.15,4,3),new THREE.MeshBasicMaterial({color:[0xFF2200,0xFF6600,0xFFAA00,0xFFDD00][i%4],transparent:true,opacity:0.7}));
        p.position.set((Math.random()-0.5)*0.4,(Math.random()-0.5)*0.4,(Math.random()-0.5)*0.4);
        grp.add(p);
    }
    return grp;
}

// ---- Unified projectile creation ----
// type: 'normal' | 'sonicBoom' | 'yogaFire'
// params: {speed, life, color, ringColor, burns, isPlayer, type}
function MoveProjectile_execute(egg, dir, params){
    var type=params.type||'normal';
    var spd=params.speed;
    var life=params.life;
    var sx=egg.mesh.position.x+Math.sin(dir)*1.5;
    var sy=egg.mesh.position.y+0.7;
    var sz=egg.mesh.position.z+Math.cos(dir)*1.5;
    var ball,ring;

    if(type==='sonicBoom'){
        // Crescent plane
        var tex=_createSonicBoomTexture();
        ball=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.2),new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide}));
        ball.position.set(sx,sy,sz);
        ball.rotation.x=-Math.PI/2;
        ball.rotation.order='YXZ';
        ball.rotation.y=dir;
        scene.add(ball);
        // Small glow sphere as ring
        ring=new THREE.Mesh(new THREE.SphereGeometry(0.15,6,4),new THREE.MeshBasicMaterial({color:params.ringColor||0xFFFF88,transparent:true,opacity:0.3}));
        ring.position.copy(ball.position);scene.add(ring);
    } else if(type==='yogaFire'){
        // Multi-mesh fire group
        ball=_createYogaFireGroup();
        ball.position.set(sx,sy,sz);
        scene.add(ball);
        ring=new THREE.Mesh(new THREE.TorusGeometry(0.5,0.08,6,12),new THREE.MeshBasicMaterial({color:params.ringColor||0xFF8800,transparent:true,opacity:0.4}));
        ring.position.copy(ball.position);scene.add(ring);
    } else {
        // Normal sphere projectile
        var radius=params.radius||0.4;
        var npcRadius=params.npcRadius||0.35;
        var r=params.isPlayer?radius:npcRadius;
        ball=new THREE.Mesh(new THREE.SphereGeometry(r,8,6),new THREE.MeshBasicMaterial({color:params.color,transparent:true,opacity:0.85}));
        ball.position.set(sx,sy,sz);scene.add(ball);
        var torusR=params.isPlayer?0.5:0.45;
        var torusTube=params.isPlayer?0.08:0.07;
        ring=new THREE.Mesh(new THREE.TorusGeometry(torusR,torusTube,6,12),new THREE.MeshBasicMaterial({color:params.ringColor,transparent:true,opacity:params.isPlayer?0.6:0.6}));
        ring.position.copy(ball.position);scene.add(ring);
    }

    var proj={
        ball:ball,
        ring:ring,
        vx:Math.sin(dir)*spd,
        vz:Math.cos(dir)*spd,
        life:life,
        owner:egg,
        burns:!!params.burns,
        isSonicBoom:(type==='sonicBoom'),
        isYogaFire:(type==='yogaFire'),
        isPlayer:!!params.isPlayer
    };

    // Player can only have one active projectile — tracked via window._playerHadouken
    if(params.isPlayer){
        window._playerHadouken=proj;
    }

    window._allProjectiles.push(proj);
    return proj;
}

// ---- Unified projectile update (called each frame) ----
// Returns false when projectile should be removed
function MoveProjectile_update(proj){
    // Move
    proj.ball.position.x+=proj.vx;
    proj.ball.position.z+=proj.vz;
    proj.ring.position.copy(proj.ball.position);
    proj.ring.rotation.z+=0.2;

    // Sonic boom: spin the crescent plane
    if(proj.isSonicBoom){
        proj.ball.rotation.z+=0.5;
    }

    // Yoga fire: flicker flame particles
    if(proj.isYogaFire&&proj.ball.children){
        for(var i=2;i<proj.ball.children.length;i++){
            var ch=proj.ball.children[i];
            if(!ch||!ch.material)continue;
            ch.position.set((Math.random()-0.5)*0.5,(Math.random()-0.5)*0.5,(Math.random()-0.5)*0.5);
            ch.material.opacity=0.4+Math.random()*0.5;
            ch.scale.setScalar(0.7+Math.random()*0.8);
        }
        if(proj.ball.children[1])proj.ball.children[1].scale.setScalar(0.9+Math.sin(proj.life*0.3)*0.2);
    }

    proj.life--;

    // Opacity fade
    if(proj.ball.material){
        proj.ball.material.opacity=Math.min(proj.isPlayer?0.9:0.85,proj.life/30);
    } else if(proj.isYogaFire&&proj.ball.children[0]){
        if(proj.ball.children[0].material)proj.ball.children[0].material.opacity=Math.min(0.95,proj.life/30);
    }
    if(proj.ring&&proj.ring.material)proj.ring.material.opacity=Math.min(0.6,proj.life/30);

    // Hit detection
    var hit=_moveHitDetect(proj.owner, proj.ball.position, 1.5, function(target){
        target.vx+=proj.vx*COMBAT.projectile.knockbackMul;
        target.vz+=proj.vz*COMBAT.projectile.knockbackMul;
        target.vy=COMBAT.projectile.vy;
        target.squash=COMBAT.projectile.squash;
        target.throwTimer=COMBAT.projectile.throwTimer;
        target._bounces=COMBAT.projectile.bounces;
        if(proj.isPlayer){
            _addStunDamage(target,COMBAT.projectile.stunDmg);
        } else {
            target._stunTimer=COMBAT.projectile.npcStunTimer;
        }
        if(proj.burns) target._onFire=COMBAT.projectile.fireDuration;
        if(proj.isSonicBoom) spawnSlashEffect(target,Math.atan2(proj.vx,proj.vz));
        _dropNpcStolenCoins(target);
        if(target.isPlayer) playHitSound(proj.ball.position.x,proj.ball.position.z);
        else playHitSound(target.mesh.position.x,target.mesh.position.z);
        proj.life=0;
        return true; // stop after first hit
    });

    if(proj.life<=0) return false;
    return true;
}

// ---- Cleanup a projectile's meshes ----
function MoveProjectile_cleanup(proj){
    scene.remove(proj.ball);
    scene.remove(proj.ring);
    // Clear player reference if this was the player's projectile
    if(proj.isPlayer && window._playerHadouken===proj){
        window._playerHadouken=null;
    }
}

// ============================================================
//  Phase 3: Spin Attacks (tatsumaki, spinning bird, lariat)
// ============================================================

function MoveSpin_execute(egg, dir, params){
    var ct=egg.mesh.userData._charType||'egg';
    egg._tatsuActive=params.duration;
    egg._tatsuDir=dir;
    // Vertical velocity based on character
    if(params.isLariat){
        egg._isLariat=true;
        egg.vy=0;
    } else if(ct==='monkey'){
        // Spinning Bird Kick: jump
        egg.vy=JUMP_FORCE*(params.jumpMul||1.2);
    } else if(ct==='bear'){
        egg.vy=0;
    } else {
        egg.vy=0.1; // slight hop for tatsumaki
    }
}

// Called every frame while spin is active.
// For player: pass inputFn that returns {mx,mz} from WASD/joystick.
// For NPC: pass null (NPC uses simpler movement).
// Returns false when spin ends.
function MoveSpin_update(egg, inputFn){
    egg._tatsuActive--;
    var ct=egg.mesh.userData._charType||'egg';
    // Body rotation
    var body=egg.mesh.userData.body;
    if(body) body.rotation.y+=0.8;
    egg.mesh.rotation.y+=0.8;
    // Chun-Li / monkey: flip upside-down
    if(ct==='monkey'){
        egg.mesh.scale.y=-1;
        egg.mesh.position.y=Math.max(egg.mesh.position.y,2.0);
    }
    if(!egg._tatsuDir) egg._tatsuDir=egg.mesh.rotation.y;
    // Movement
    if(egg._isLariat){
        // Lariat: free WASD movement, stay grounded
        if(inputFn){
            var inp=inputFn();
            var lmLen=DANBO_WASM.len2D(inp.mx,inp.mz);
            if(lmLen>0.1){
                egg.vx=inp.mx/lmLen*MAX_SPEED*0.8;
                egg.vz=inp.mz/lmLen*MAX_SPEED*0.8;
            } else {
                egg.vx*=0.8;egg.vz*=0.8;
            }
        } else {
            // NPC lariat: keep existing velocity
        }
        egg.vy=0;
        if(egg.mesh.position.y>0.1) egg.mesh.position.y=0.01;
    } else {
        // Normal tatsumaki: forward motion with steering
        if(inputFn){
            var inp2=inputFn();
            var tVert=0;
            if(ct!=='monkey'){
                if(inp2.up) tVert=0.04;
                if(inp2.down) tVert=-0.03;
            }
            var tSteer=0;
            if(inp2.left) tSteer=0.03;
            if(inp2.right) tSteer=-0.03;
            egg._tatsuDir+=tSteer;
            egg.vy=tVert;
        }
        var tFwd=1.5;
        egg.vx=Math.sin(egg._tatsuDir)*MAX_SPEED*tFwd;
        egg.vz=Math.cos(egg._tatsuDir)*MAX_SPEED*tFwd;
    }
    if(egg.mesh.position.y<0.5) egg.mesh.position.y=0.5;
    // Dragon visual (player only)
    if(egg.isPlayer){
        if(!window._tatsuDragon){
            window._tatsuDragon=[];
            var tdMat=new THREE.MeshBasicMaterial({color:0xFF6644,transparent:true,opacity:0.6});
            var tdMatHead=new THREE.MeshBasicMaterial({color:0xFFDD44,transparent:true,opacity:0.85});
            for(var tdi=0;tdi<14;tdi++){
                var tdSize=tdi===0?0.45:0.35-tdi*0.012;
                var tdSeg=new THREE.Mesh(new THREE.SphereGeometry(Math.max(tdSize,0.1),6,4),tdi===0?tdMatHead:tdMat);
                tdSeg.visible=false;scene.add(tdSeg);
                window._tatsuDragon.push(tdSeg);
            }
        }
        var ttPhase=egg.mesh.rotation.y;
        for(var ttj=0;ttj<window._tatsuDragon.length;ttj++){
            var ttSeg=window._tatsuDragon[ttj];
            ttSeg.visible=true;
            var ttAngle=ttPhase-ttj*0.5;
            var ttR=1.2+ttj*0.08;
            var ttY=egg.mesh.position.y+(egg._isLariat?0.9:-0.2)+Math.sin(ttAngle*0.5+ttj*0.4)*0.4;
            ttSeg.position.set(
                egg.mesh.position.x+Math.sin(ttAngle)*ttR,
                ttY,
                egg.mesh.position.z+Math.cos(ttAngle)*ttR
            );
        }
    }
    // Hit detection with cooldown
    _moveHitDetect(egg, egg.mesh.position, 3.5, function(t,dist,dx,dz){
        if(t._slamImmune>0) return false;
        if(!t._tatsuHitCD) t._tatsuHitCD=0;
        if(t._tatsuHitCD>0){t._tatsuHitCD--;return false;}
        var d=dist||1;
        _moveApplyKnockback(t,dx/d,dz/d,dist,COMBAT.spin.force,COMBAT.spin.vy,{squash:COMBAT.spin.squash,throwTimer:COMBAT.spin.throwTimer,bounces:COMBAT.spin.bounces,stunDmg:MOVE_PARAMS.egg.tatsumaki.stunDmg});
        t._tatsuHitCD=12;
        return false; // hit multiple
    });
    // End check
    if(egg._tatsuActive<=0){
        MoveSpin_end(egg);
        return false;
    }
    return true;
}

function MoveSpin_end(egg){
    var ct=egg.mesh.userData._charType||'egg';
    egg.vx*=0.3;egg.vz*=0.3;egg._tatsuDir=0;
    // Hide dragon
    if(window._tatsuDragon){
        for(var k=0;k<window._tatsuDragon.length;k++) window._tatsuDragon[k].visible=false;
    }
    // Reset Chun-Li flip
    if(ct==='monkey'){egg.mesh.scale.y=1;egg.squash=1;}
    // Reset lariat arms
    if(egg._isLariat){
        egg._isLariat=false;
        var ud=egg.mesh.userData;
        if(ud.rightArm){ud.rightArm.visible=false;ud.rightArm.scale.set(1,1,1);}
        if(ud.leftArm){ud.leftArm.visible=false;ud.leftArm.scale.set(1,1,1);}
    }
}

// ============================================================
//  Phase 4: Shoryuken / Uppercut
// ============================================================

function MoveUppercut_execute(egg, dir, params){
    var ct=egg.mesh.userData._charType||'egg';
    egg._shoryuActive=params.duration;
    egg.vy=JUMP_FORCE*params.jumpMul;
    var fwd=params.fwdSpeed;
    egg.vx=Math.sin(dir)*fwd;
    egg.vz=Math.cos(dir)*fwd;
    egg.squash=0.5;
    egg._shoryuIsKen=(ct==='dog');
    // Store forward momentum
    if(ct==='dog'){
        egg._shoryuFwdX=Math.sin(dir)*fwd;
        egg._shoryuFwdZ=Math.cos(dir)*fwd;
    } else {
        egg._shoryuFwdX=Math.sin(dir)*fwd*0.5;
        egg._shoryuFwdZ=Math.cos(dir)*fwd*0.5;
    }
    egg._shoryuStartSet=false;
}

// Returns false when done
function MoveUppercut_update(egg){
    // Fist mesh (player only)
    if(egg.isPlayer){
        if(!window._shoryuFist){
            window._shoryuFist=new THREE.Mesh(new THREE.SphereGeometry(0.25,8,6),toon(0xFFFFFF));
            scene.add(window._shoryuFist);
        }
        window._shoryuFist.visible=true;
        var sfDir=egg.mesh.rotation.y;
        window._shoryuFist.position.set(
            egg.mesh.position.x+Math.sin(sfDir)*0.5,
            egg.mesh.position.y+1.8,
            egg.mesh.position.z+Math.cos(sfDir)*0.5
        );
    }
    egg.mesh.rotation.y+=0.12;
    // Maintain forward momentum
    if(egg._shoryuFwdX!==undefined){
        egg.vx=egg._shoryuFwdX;
        egg.vz=egg._shoryuFwdZ;
    }
    // Hit detection (every 4 frames)
    if(egg._shoryuActive%4===0){
        for(var shi=0;shi<allEggs.length;shi++){
            var she=allEggs[shi];
            if(she===egg||!she.alive||she.heldBy)continue;
            if(she._slamImmune>0)continue;
            var shdx=she.mesh.position.x-egg.mesh.position.x;
            var shdz=she.mesh.position.z-egg.mesh.position.z;
            var shdy=she.mesh.position.y-egg.mesh.position.y;
            var shd=DANBO_WASM.len3D(shdx,shdy,shdz);
            if(shd<3&&shd>0.01){
                she.vx+=shdx/shd*COMBAT.shoryuken.force;she.vz+=shdz/shd*COMBAT.shoryuken.force;
                she.vy=COMBAT.shoryuken.vy;she.squash=COMBAT.shoryuken.squash;she.throwTimer=COMBAT.shoryuken.throwTimer;she._bounces=COMBAT.shoryuken.bounces;
                _addStunDamage(she,COMBAT.shoryuken.stunDmg);
                _dropNpcStolenCoins(she);playHitSound();
                if(egg._shoryuIsKen){
                    she._onFire=COMBAT.shoryuken.kenFireDuration;
                }
            }
        }
    }
    // Dragon visual (player only)
    if(egg.isPlayer){
        if(!window._shoryuDragon){
            window._shoryuDragon=[];
            window._shoryuDragonMats={
                blue:new THREE.MeshBasicMaterial({color:0x44BBFF,transparent:true,opacity:0.8}),
                blueHead:new THREE.MeshBasicMaterial({color:0xFFDD44,transparent:true,opacity:0.9}),
                fire:new THREE.MeshBasicMaterial({color:0xFF4400,transparent:true,opacity:0.8}),
                fireHead:new THREE.MeshBasicMaterial({color:0xFFCC00,transparent:true,opacity:0.9})
            };
            for(var sdi=0;sdi<16;sdi++){
                var sdSize=sdi===0?0.6:0.45-sdi*0.018;
                var sdSeg=new THREE.Mesh(new THREE.SphereGeometry(Math.max(sdSize,0.12),8,6),window._shoryuDragonMats.blueHead);
                sdSeg.visible=false;scene.add(sdSeg);
                window._shoryuDragon.push(sdSeg);
            }
        }
        var isKenDragon=egg._shoryuIsKen;
        var sdMats=window._shoryuDragonMats;
        for(var sdm=0;sdm<window._shoryuDragon.length;sdm++){
            window._shoryuDragon[sdm].material=sdm===0?(isKenDragon?sdMats.fireHead:sdMats.blueHead):(isKenDragon?sdMats.fire:sdMats.blue);
        }
        if(!egg._shoryuStartSet){
            egg._shoryuStartSet=true;
            egg._shoryuStartX=egg.mesh.position.x;
            egg._shoryuStartY=egg.mesh.position.y;
            egg._shoryuStartZ=egg.mesh.position.z;
        }
        var sfDir2=egg.mesh.rotation.y;
        for(var sdj=0;sdj<window._shoryuDragon.length;sdj++){
            var sdSeg2=window._shoryuDragon[sdj];
            sdSeg2.visible=true;
            var sdAngle=sfDir2+sdj*0.6+egg._shoryuActive*0.15;
            var sdR=1.2+sdj*0.06;
            var sdLerp=sdj/window._shoryuDragon.length;
            var sdPx=egg.mesh.position.x*(1-sdLerp)+egg._shoryuStartX*sdLerp;
            var sdPy=egg.mesh.position.y*(1-sdLerp)+egg._shoryuStartY*sdLerp;
            var sdPz=egg.mesh.position.z*(1-sdLerp)+egg._shoryuStartZ*sdLerp;
            sdSeg2.position.set(
                sdPx+Math.sin(sdAngle)*sdR,
                sdPy+0.5,
                sdPz+Math.cos(sdAngle)*sdR
            );
        }
    }
    // End condition
    if(egg._shoryuActive<55&&(egg.vy<=0||egg.onGround)){
        MoveUppercut_end(egg);
        return false;
    }
    egg._shoryuActive--;
    if(egg._shoryuActive<=0){
        MoveUppercut_end(egg);
        return false;
    }
    return true;
}

function MoveUppercut_end(egg){
    egg._shoryuActive=0;
    egg._shoryuStartSet=false;
    egg._shoryuFwdX=undefined;egg._shoryuFwdZ=undefined;
    if(window._shoryuFist) window._shoryuFist.visible=false;
    if(window._shoryuDragon){
        for(var k=0;k<window._shoryuDragon.length;k++) window._shoryuDragon[k].visible=false;
    }
}

// ============================================================
//  Phase 5: Dash Attacks (Honda headbutt, Blanka roll) — execute only
// ============================================================

function MoveDash_execute(egg, dir, params){
    if(params.isDash){
        // Honda headbutt
        egg.vx=Math.sin(dir)*MAX_SPEED*params.speed;
        egg.vz=Math.cos(dir)*MAX_SPEED*params.speed;
        egg._dashDirX=Math.sin(dir)*MAX_SPEED*2;
        egg._dashDirZ=Math.cos(dir)*MAX_SPEED*2;
        egg._dashFaceY=dir;
        egg._hondaDash=params.duration;
        egg._hondaDashTotal=params.duration;
        egg._hondaBounced=false;
        egg.squash=0.55;
    } else if(params.isRoll){
        // Blanka roll
        egg._blankaSpinTimer=params.duration;
        egg._blankaSpinDirX=Math.sin(dir)*MAX_SPEED*params.speed;
        egg._blankaSpinDirZ=Math.cos(dir)*MAX_SPEED*params.speed;
        egg._dashFaceY=dir;
        egg._blankaSpinFalling=false;
        egg._blankaSpinAngle=0;
        egg.squash=0.8;
    }
}

// ============================================================
//  Phase 6: Rapid Hit (Hyakuretsu punch/kick)
// ============================================================

function MoveRapidHit_execute(egg, limbType){
    if(limbType==='punch'){
        egg._hyakuretsuTimer=60;
        egg._hyakuretsuTick=0;
    } else {
        egg._hyakuretsuKickTimer=60;
        egg._hyakuretsuKickTick=0;
    }
    egg.vx=0;egg.vz=0;
    egg.squash=0.88;
}

// Returns false when timer expires
function MoveRapidHit_update(egg, limbType, holdKey, inputFn){
    var isPunch=(limbType==='punch');
    var timer=isPunch?egg._hyakuretsuTimer:egg._hyakuretsuKickTimer;
    var tick=isPunch?egg._hyakuretsuTick:egg._hyakuretsuKickTick;
    timer--;tick++;
    if(isPunch){egg._hyakuretsuTimer=timer;egg._hyakuretsuTick=tick;}
    else{egg._hyakuretsuKickTimer=timer;egg._hyakuretsuKickTick=tick;}
    // No hold-to-extend — each press triggers one burst
    // Limb animation
    if(isPunch){
        var hSlot=Math.floor(tick/3)%3;
        var hSlapY=[0.45,0.2,-0.05][hSlot];
        var hUseRight=(Math.floor(tick/3)%2===0);
        var hArmA=hUseRight?egg.mesh.userData.rightArm:egg.mesh.userData.leftArm;
        var hArmB=hUseRight?egg.mesh.userData.leftArm:egg.mesh.userData.rightArm;
        var hFrame=tick%3;
        var hExtend=hFrame===0?1.8:(hFrame===1?1.4:0.6);
        var hZ=hFrame===0?1.8:(hFrame===1?1.5:0.8);
        if(hArmA){hArmA.visible=true;hArmA.position.set(hUseRight?0.35:-0.35,hSlapY,hZ);hArmA.scale.set(hExtend,hExtend,hExtend);}
        if(hArmB){hArmB.visible=false;}
    } else {
        var ckSlot=Math.floor(tick/3)%3;
        var ckY=[0.3,0.1,-0.1][ckSlot];
        var ckUseRight=(Math.floor(tick/3)%2===0);
        var ckLegA=ckUseRight?egg.mesh.userData.rightLeg:egg.mesh.userData.leftLeg;
        var ckLegB=ckUseRight?egg.mesh.userData.leftLeg:egg.mesh.userData.rightLeg;
        var ckFrame=tick%3;
        var ckExtend=ckFrame===0?1.8:(ckFrame===1?1.4:0.6);
        var ckZ=ckFrame===0?1.8:(ckFrame===1?1.5:0.8);
        if(ckLegA){ckLegA.visible=true;ckLegA.position.set(ckUseRight?0.25:-0.25,ckY,ckZ);ckLegA.scale.set(ckExtend,ckExtend,ckExtend);ckLegA.rotation.x=-Math.PI/3;}
        if(ckLegB){ckLegB.visible=false;}
    }
    // Slow movement, allow forward creep
    egg.vx*=0.3;egg.vz*=0.3;
    if(inputFn){
        var inp=inputFn();
        var faceDir=egg.mesh.rotation.y;
        var inputDot=inp.mx*Math.sin(faceDir)+inp.mz*Math.cos(faceDir);
        if(inputDot>0.2){
            egg.vx+=Math.sin(faceDir)*MOVE_ACCEL*0.3;
            egg.vz+=Math.cos(faceDir)*MOVE_ACCEL*0.3;
        }
    }
    // Hit detection every 3 frames
    if(tick%3===0){
        for(var hi=0;hi<allEggs.length;hi++){
            var he=allEggs[hi];if(he===egg||!he.alive||he.heldBy)continue;
            var hdx=he.mesh.position.x-egg.mesh.position.x;
            var hdz=he.mesh.position.z-egg.mesh.position.z;
            var hd=DANBO_WASM.len2D(hdx,hdz);
            if(hd<2.5){
                var hd2=hd||1;
                he.vx+=hdx/hd2*COMBAT.rapidHit.force;he.vz+=hdz/hd2*COMBAT.rapidHit.force;he.vy=COMBAT.rapidHit.vy;
                he.squash=COMBAT.rapidHit.squash;he.throwTimer=COMBAT.rapidHit.throwTimer;he._bounces=COMBAT.rapidHit.bounces;
                _addStunDamage(he,COMBAT.rapidHit.stunDmg);_dropNpcStolenCoins(he);playHitSound();
            }
        }
    }
    egg.squash=0.85+Math.sin(tick*0.8)*0.05;
    // Check end
    var curTimer=isPunch?egg._hyakuretsuTimer:egg._hyakuretsuKickTimer;
    if(curTimer<=0){
        MoveRapidHit_end(egg,limbType);
        return false;
    }
    return true;
}

function MoveRapidHit_end(egg, limbType){
    var ud=egg.mesh.userData;
    if(limbType==='punch'){
        if(ud.rightArm){ud.rightArm.visible=false;ud.rightArm.scale.set(1,1,1);}
        if(ud.leftArm){ud.leftArm.visible=false;ud.leftArm.scale.set(1,1,1);}
    } else {
        if(ud.rightLeg){ud.rightLeg.visible=false;ud.rightLeg.scale.set(1,1,1);}
        if(ud.leftLeg){ud.leftLeg.visible=false;ud.leftLeg.scale.set(1,1,1);}
    }
}

// ============================================================
//  Phase 7: Area Effects (Electric, Yoga Flame) — execute only
// ============================================================

function MoveElectric_execute(egg, params){
    egg._blankaShock=params.duration||60;
    egg.squash=0.6;
}

function MoveYogaFlame_execute(egg, dir, params){
    egg._yogaFlame=params.duration;
    egg._yogaFlameDir=dir;
    egg.squash=0.85;
}

// ============================================================
//  Phase 8: Somersault Kick (Guile) — execute only
// ============================================================

function MoveSomersault_execute(egg, dir, params){
    egg.vy=JUMP_FORCE*params.jumpMul;
    egg.vx=Math.sin(dir)*0.15;
    egg.vz=Math.cos(dir)*0.15;
    egg.squash=0.5;
    egg._guileSomersault=params.duration;
    egg._guileSomFwdX=Math.sin(dir)*0.15;
    egg._guileSomFwdZ=Math.cos(dir)*0.15;
    egg._guileArcFaceY=dir;
    egg._guileArcStartX=egg.mesh.position.x+Math.sin(dir)*1.5;
    egg._guileArcStartY=egg.mesh.position.y+0.8;
    egg._guileArcStartZ=egg.mesh.position.z+Math.cos(dir)*1.5;
    // Create blade arc mesh if not exists
    if(!window._guileArc){
        window._guileArc=new THREE.Mesh(
            new THREE.TorusGeometry(2.25,0.22,6,24,Math.PI),
            new THREE.MeshBasicMaterial({color:0x88FFFF,transparent:true,opacity:0.9})
        );
        var gaInner=new THREE.Mesh(
            new THREE.TorusGeometry(2.25,0.11,4,24,Math.PI),
            new THREE.MeshBasicMaterial({color:0xFFFFFF,transparent:true,opacity:0.8})
        );
        window._guileArc.add(gaInner);
        scene.add(window._guileArc);
    }
    window._guileArc.visible=false;
    egg._guileArcLaunched=false;
}
