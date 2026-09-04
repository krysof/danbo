// hud.js — DANBO World
var _chargeBeepTimer=0, _chargeHoldTimer=0, _chargeHoldMax=600; // 600 frames ≈ 10s at 60fps
function _createChargeBar(){
    // Use a canvas texture on a Sprite — always faces camera automatically
    var canvas=document.createElement('canvas');
    canvas.width=256;canvas.height=40;
    var tex=new THREE.CanvasTexture(canvas);
    tex.minFilter=THREE.LinearFilter;
    var mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false});
    var sprite=new THREE.Sprite(mat);
    sprite.scale.set(2.5,0.4,1);
    sprite.renderOrder=1000;
    sprite._canvas=canvas;sprite._ctx=canvas.getContext('2d');sprite._tex=tex;
    return sprite;
}
function _drawChargeBar(sprite,pct){
    var ctx=sprite._ctx,w=256,h=40;
    ctx.clearRect(0,0,w,h);
    // Helper for rounded rect (compat)
    function rr(x,y,rw,rh,rad){ctx.beginPath();ctx.moveTo(x+rad,y);ctx.lineTo(x+rw-rad,y);ctx.quadraticCurveTo(x+rw,y,x+rw,y+rad);ctx.lineTo(x+rw,y+rh-rad);ctx.quadraticCurveTo(x+rw,y+rh,x+rw-rad,y+rh);ctx.lineTo(x+rad,y+rh);ctx.quadraticCurveTo(x,y+rh,x,y+rh-rad);ctx.lineTo(x,y+rad);ctx.quadraticCurveTo(x,y,x+rad,y);ctx.closePath();}
    // Outer border
    ctx.fillStyle='rgba(0,0,0,0.85)';
    rr(2,2,w-4,h-4,8);ctx.fill();
    // Color calc
    var r2,g2,b3;
    if(pct<0.33){r2=0;g2=255;b3=50;}
    else if(pct<0.66){var t=(pct-0.33)/0.33;r2=Math.floor(255*t);g2=Math.floor(255*(1-t*0.3));b3=0;}
    else{var t2=(pct-0.66)/0.34;r2=255;g2=Math.floor(180*(1-t2));b3=0;}
    // Border glow
    ctx.strokeStyle='rgba('+r2+','+g2+','+b3+','+(pct>0.8?0.7+Math.sin(Date.now()*0.015)*0.3:0.5)+')';
    ctx.lineWidth=3;rr(5,5,w-10,h-10,6);ctx.stroke();
    // Fill bar
    var fw=Math.max(4,(w-20)*pct);
    var grad=ctx.createLinearGradient(10,0,10+fw,0);
    grad.addColorStop(0,'rgb('+Math.floor(r2*0.6)+','+Math.floor(g2*0.6)+','+b3+')');
    grad.addColorStop(1,'rgb('+r2+','+g2+','+b3+')');
    ctx.fillStyle=grad;
    rr(10,10,fw,h-20,4);ctx.fill();
    // Shine highlight
    ctx.fillStyle='rgba(255,255,255,0.3)';
    rr(10,10,fw,Math.floor((h-20)/2),4);ctx.fill();
    sprite._tex.needsUpdate=true;
}
function _updateChargeBar(){
    if(!playerEgg)return;
    var pct=_jumpCharge/_jumpChargeMax;
    if(_jumpCharging&&playerEgg.onGround){
        if(!_jumpChargeBar){_jumpChargeBar=_createChargeBar();scene.add(_jumpChargeBar);}
        _jumpChargeBar.visible=true;
        _jumpChargeBar.position.set(playerEgg.mesh.position.x,playerEgg.mesh.position.y+2.5,playerEgg.mesh.position.z);
        var drawPct=_jumpCharge/_jumpChargeMax;
        // If fully charged, show hold timer decay
        if(_jumpCharge>=_jumpChargeMax&&_chargeHoldTimer>0){
            var holdPct=1-_chargeHoldTimer/_chargeHoldMax;
            drawPct=holdPct;
        }
        _drawChargeBar(_jumpChargeBar,drawPct);
    } else {
        if(_jumpChargeBar){_jumpChargeBar.visible=false;}
    }
}

// ---- Stun stars (SF2 style spinning stars above head) ----
function _createStunStars(egg){
    if(egg._stunStars)return;
    var group=new THREE.Group();
    // Stun type based on severity: longer stun = higher tier visual
    // 0=small stars (light), 1=big stars, 2=ducks, 3=birds (heavy)
    var dur=egg._stunTimer||0;
    var stunType=dur<60?0:dur<120?1:dur<200?2:3;
    var items=[];
    for(var i=0;i<4;i++){
        var s;
        if(stunType===0){
            // Small yellow stars
            s=new THREE.Mesh(new THREE.OctahedronGeometry(0.15,0),new THREE.MeshBasicMaterial({color:0xFFFF00,transparent:true,opacity:0.9}));
        } else if(stunType===1){
            // Big white stars with glow
            s=new THREE.Mesh(new THREE.OctahedronGeometry(0.28,0),new THREE.MeshBasicMaterial({color:0xFFFFCC,transparent:true,opacity:0.85}));
        } else if(stunType===2){
            // Little ducks (yellow sphere body + orange beak)
            s=new THREE.Group();
            var body=new THREE.Mesh(new THREE.SphereGeometry(0.14,6,4),new THREE.MeshBasicMaterial({color:0xFFDD00}));
            s.add(body);
            var head=new THREE.Mesh(new THREE.SphereGeometry(0.09,5,4),new THREE.MeshBasicMaterial({color:0xFFDD00}));
            head.position.set(0,0.12,0.06);s.add(head);
            var beak=new THREE.Mesh(new THREE.ConeGeometry(0.04,0.08,4),new THREE.MeshBasicMaterial({color:0xFF8800}));
            beak.position.set(0,0.12,0.16);beak.rotation.x=Math.PI/2;s.add(beak);
            var eye=new THREE.Mesh(new THREE.SphereGeometry(0.02,3,3),new THREE.MeshBasicMaterial({color:0x000000}));
            eye.position.set(0.04,0.15,0.12);s.add(eye);
        } else {
            // Little birds (blue body + wings)
            s=new THREE.Group();
            var bb=new THREE.Mesh(new THREE.SphereGeometry(0.12,6,4),new THREE.MeshBasicMaterial({color:0x4488FF}));
            s.add(bb);
            var wing1=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.02,0.1),new THREE.MeshBasicMaterial({color:0x6699FF}));
            wing1.position.set(-0.15,0.04,0);s.add(wing1);
            var wing2=wing1.clone();wing2.position.set(0.15,0.04,0);s.add(wing2);
            var bbeak=new THREE.Mesh(new THREE.ConeGeometry(0.03,0.06,3),new THREE.MeshBasicMaterial({color:0xFF6600}));
            bbeak.position.set(0,0,0.14);bbeak.rotation.x=Math.PI/2;s.add(bbeak);
        }
        group.add(s);
        items.push(s);
    }
    scene.add(group);
    egg._stunStars={group:group,stars:items,phase:0,type:stunType};
}
function _updateStunStars(egg){
    if(egg._stunTimer>0){
        if(!egg._stunStars)_createStunStars(egg);
        var ss=egg._stunStars;
        ss.phase+=0.12;
        var p=egg.mesh.position;
        ss.group.position.set(p.x,p.y+1.4,p.z);
        for(var i=0;i<ss.stars.length;i++){
            var a=ss.phase+i/ss.stars.length*Math.PI*2;
            var ix=Math.cos(a)*0.7,iz=Math.sin(a)*0.7;
            var iy=Math.sin(ss.phase*2+i)*0.15;
            ss.stars[i].position.set(ix,iy,iz);
            if(ss.type<=1){
                // Stars spin
                ss.stars[i].rotation.y=ss.phase*3;
            } else if(ss.type===2){
                // Ducks bob and face outward
                ss.stars[i].rotation.y=a+Math.PI;
                ss.stars[i].position.y=iy+Math.sin(ss.phase*3+i*1.5)*0.08;
            } else {
                // Birds flap wings and face forward
                ss.stars[i].rotation.y=a+Math.PI/2;
                if(ss.stars[i].children&&ss.stars[i].children.length>1){
                    var flapAngle=Math.sin(ss.phase*8+i*2)*0.4;
                    ss.stars[i].children[1].rotation.z=flapAngle;
                    ss.stars[i].children[2].rotation.z=-flapAngle;
                }
            }
        }
        ss.group.visible=true;
    } else {
        // Remove stun stars when stun ends so next stun picks a new random type
        if(egg._stunStars&&egg._stunStars.group.visible){
            egg._stunStars.group.visible=false;
            scene.remove(egg._stunStars.group);egg._stunStars=null;
        }
    }
}
function _removeStunStars(egg){
    if(egg._stunStars){scene.remove(egg._stunStars.group);egg._stunStars=null;}
}

// ---- Sonic spin dash state ----
var _spinDashing=false, _spinDashTimer=0, _spinDashTimerMax=0, _spinDashSpeed=0;
var _spinDashBar=null;
function _createSpinDashBar(){
    var canvas=document.createElement('canvas');
    canvas.width=256;canvas.height=40;
    var tex=new THREE.CanvasTexture(canvas);
    tex.minFilter=THREE.LinearFilter;
    var mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false});
    var sprite=new THREE.Sprite(mat);
    sprite.scale.set(2.5,0.4,1);
    sprite.renderOrder=1002;
    sprite._canvas=canvas;sprite._ctx=canvas.getContext('2d');sprite._tex=tex;
    return sprite;
}
function _drawSpinDashBar(sprite,pct){
    var ctx=sprite._ctx,w=256,h=40;
    ctx.clearRect(0,0,w,h);
    function rr(x,y,rw,rh,rad){ctx.beginPath();ctx.moveTo(x+rad,y);ctx.lineTo(x+rw-rad,y);ctx.quadraticCurveTo(x+rw,y,x+rw,y+rad);ctx.lineTo(x+rw,y+rh-rad);ctx.quadraticCurveTo(x+rw,y+rh,x+rw-rad,y+rh);ctx.lineTo(x+rad,y+rh);ctx.quadraticCurveTo(x,y+rh,x,y+rh-rad);ctx.lineTo(x,y+rad);ctx.quadraticCurveTo(x,y,x+rad,y);ctx.closePath();}
    ctx.fillStyle='rgba(0,0,0,0.85)';
    rr(2,2,w-4,h-4,8);ctx.fill();
    // Cyan → blue as it depletes
    var r2=0,g2=Math.floor(180+75*pct),b3=255;
    ctx.strokeStyle='rgba('+r2+','+g2+','+b3+','+(0.6+Math.sin(Date.now()*0.02)*0.2)+')';
    ctx.lineWidth=3;rr(5,5,w-10,h-10,6);ctx.stroke();
    var fw=Math.max(4,(w-20)*pct);
    var grad=ctx.createLinearGradient(10,0,10+fw,0);
    grad.addColorStop(0,'rgb(0,'+Math.floor(g2*0.7)+',200)');
    grad.addColorStop(1,'rgb('+r2+','+g2+','+b3+')');
    ctx.fillStyle=grad;
    rr(10,10,fw,h-20,4);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.3)';
    rr(10,10,fw,Math.floor((h-20)/2),4);ctx.fill();
    sprite._tex.needsUpdate=true;
}

// ---- Sprint bar (gradual charge like jump bar) ----
var _sprintBar=null, _sprintCharge=0, _sprintChargeMax=40;
function _createSprintBar(){
    var canvas=document.createElement('canvas');
    canvas.width=256;canvas.height=40;
    var tex=new THREE.CanvasTexture(canvas);
    tex.minFilter=THREE.LinearFilter;
    var mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false});
    var sprite=new THREE.Sprite(mat);
    sprite.scale.set(2.5,0.4,1);
    sprite.renderOrder=1001;
    sprite._canvas=canvas;sprite._ctx=canvas.getContext('2d');sprite._tex=tex;
    return sprite;
}
function _drawSprintBar(sprite,pct){
    var ctx=sprite._ctx,w=256,h=40;
    ctx.clearRect(0,0,w,h);
    function rr(x,y,rw,rh,rad){ctx.beginPath();ctx.moveTo(x+rad,y);ctx.lineTo(x+rw-rad,y);ctx.quadraticCurveTo(x+rw,y,x+rw,y+rad);ctx.lineTo(x+rw,y+rh-rad);ctx.quadraticCurveTo(x+rw,y+rh,x+rw-rad,y+rh);ctx.lineTo(x+rad,y+rh);ctx.quadraticCurveTo(x,y+rh,x,y+rh-rad);ctx.lineTo(x,y+rad);ctx.quadraticCurveTo(x,y,x+rad,y);ctx.closePath();}
    ctx.fillStyle='rgba(0,0,0,0.85)';
    rr(2,2,w-4,h-4,8);ctx.fill();
    // Same color scheme as charge bar: green → yellow → red
    var r2,g2,b3;
    if(pct<0.33){r2=0;g2=255;b3=50;}
    else if(pct<0.66){var t=(pct-0.33)/0.33;r2=Math.floor(255*t);g2=Math.floor(255*(1-t*0.3));b3=0;}
    else{var t2=(pct-0.66)/0.34;r2=255;g2=Math.floor(180*(1-t2));b3=0;}
    // Border glow
    ctx.strokeStyle='rgba('+r2+','+g2+','+b3+','+(pct>0.8?0.7+Math.sin(Date.now()*0.015)*0.3:0.5)+')';
    ctx.lineWidth=3;rr(5,5,w-10,h-10,6);ctx.stroke();
    // Fill bar
    var fw=Math.max(4,(w-20)*pct);
    var grad=ctx.createLinearGradient(10,0,10+fw,0);
    grad.addColorStop(0,'rgb('+Math.floor(r2*0.6)+','+Math.floor(g2*0.6)+','+b3+')');
    grad.addColorStop(1,'rgb('+r2+','+g2+','+b3+')');
    ctx.fillStyle=grad;
    rr(10,10,fw,h-20,4);ctx.fill();
    // Shine highlight
    ctx.fillStyle='rgba(255,255,255,0.3)';
    rr(10,10,fw,Math.floor((h-20)/2),4);ctx.fill();
    sprite._tex.needsUpdate=true;
}
// ---- Sprint sound (FC Mario 3 style "lin lin" running tone) ----
var _sprintSoundTimer=0;
function _playSprintTick(pct){
    if(!sfxEnabled)return;
    var ctx=ensureAudio();var t=ctx.currentTime;
    // Two quick ascending notes — "lin lin"
    var baseFreq=1200+pct*600;
    var o1=ctx.createOscillator();var g1=ctx.createGain();
    o1.type='square';
    o1.frequency.setValueAtTime(baseFreq,t);
    o1.frequency.exponentialRampToValueAtTime(baseFreq*1.5,t+0.03);
    g1.gain.setValueAtTime(0.07,t);
    g1.gain.exponentialRampToValueAtTime(0.001,t+0.04);
    o1.connect(g1);g1.connect(ctx.destination);
    o1.start(t);o1.stop(t+0.04);
    var o2=ctx.createOscillator();var g2=ctx.createGain();
    o2.type='square';
    o2.frequency.setValueAtTime(baseFreq*1.2,t+0.05);
    o2.frequency.exponentialRampToValueAtTime(baseFreq*1.8,t+0.08);
    g2.gain.setValueAtTime(0.06,t+0.05);
    g2.gain.exponentialRampToValueAtTime(0.001,t+0.09);
    o2.connect(g2);g2.connect(ctx.destination);
    o2.start(t+0.05);o2.stop(t+0.09);
}

function _updateSprintBar(holdingF){
    if(!playerEgg)return 0;
    // 0.3s delay (18 frames) before sprint starts
    if(!playerEgg._sprintHoldFrames)playerEgg._sprintHoldFrames=0;
    if(holdingF){
        playerEgg._sprintHoldFrames++;
        if(playerEgg._sprintHoldFrames>=18){
            _sprintCharge=Math.min(_sprintCharge+1,_sprintChargeMax);
            // Sonic rev-up: squash into ball and vibrate while charging
            var _chgPct=_sprintCharge/_sprintChargeMax;
            playerEgg.squash=1.0-_chgPct*0.35; // compress as charge fills
            playerEgg.mesh.position.x+=(Math.random()-0.5)*_chgPct*0.15; // vibrate
            playerEgg.vx*=0.1;playerEgg.vz*=0.1; // stay in place while charging
            var _chgBody=playerEgg.mesh.userData.body;
            if(_chgBody){_chgBody.scale.set(1+_chgPct*0.2,1-_chgPct*0.3,1+_chgPct*0.2);_chgBody.rotation.x+=_chgPct*0.3;}
        }
        playerEgg._wasSprintHolding=true;
    } else {
        // Trigger spin dash on release if charge was high enough
        if(playerEgg._wasSprintHolding&&_sprintCharge>=_sprintChargeMax&&!_spinDashing){
            var sdPct=_sprintCharge/_sprintChargeMax;
            _spinDashing=true;
            _spinDashTimer=Math.floor(80+sdPct*160);
            _spinDashTimerMax=_spinDashTimer;
            _spinDashSpeed=MAX_SPEED*4.0;
            // Store dash direction from player facing
            var dashDir=playerEgg.mesh.rotation.y;
            playerEgg._dashDirX=Math.sin(dashDir);
            playerEgg._dashDirZ=Math.cos(dashDir);
            // Sonic spin sound
            if(sfxEnabled){var ctx=ensureAudio();if(ctx){var ct=ctx.currentTime;var o=ctx.createOscillator();var g=ctx.createGain();o.type='sawtooth';o.frequency.setValueAtTime(200,ct);o.frequency.exponentialRampToValueAtTime(800,ct+0.15);o.frequency.exponentialRampToValueAtTime(400,ct+0.3);g.gain.setValueAtTime(0.12,ct);g.gain.exponentialRampToValueAtTime(0.001,ct+0.35);o.connect(g);g.connect(ctx.destination);o.start(ct);o.stop(ct+0.35);}}
        }
        playerEgg._wasSprintHolding=false;
        playerEgg._sprintHoldFrames=0;
        _sprintCharge=Math.max(_sprintCharge-2,0);
        // Reset body shape when not charging and not dashing
        if(!_spinDashing&&_sprintCharge<=0){playerEgg.squash=1.0;var _rsB=playerEgg.mesh.userData.body;if(_rsB){_rsB.scale.set(1,1,1);}}
    }
    var pct=_sprintCharge/_sprintChargeMax;
    // Sprint sound — faster as charge fills
    if(holdingF&&pct>0.05){
        _sprintSoundTimer++;
        var interval=Math.max(4,Math.floor(12-pct*8));
        if(_sprintSoundTimer>=interval){_sprintSoundTimer=0;_playSprintTick(pct);}
    } else {
        _sprintSoundTimer=0;
    }
    if(pct>0.01){
        if(!_sprintBar){_sprintBar=_createSprintBar();scene.add(_sprintBar);}
        _sprintBar.visible=true;
        var yOff=(_jumpCharging&&playerEgg.onGround)?1.8:2.1;
        _sprintBar.position.set(playerEgg.mesh.position.x,playerEgg.mesh.position.y+yOff,playerEgg.mesh.position.z);
        _drawSprintBar(_sprintBar,pct);
    } else {
        if(_sprintBar){_sprintBar.visible=false;}
    }
    return pct;
}

// ---- Ascending butt smoke (after charged jump, while vy>0) ----
var _ascendSmoke=false, _ascendSmokePct=0;

function _playChargeBeep(pct){
    if(!sfxEnabled)return;
    var ctx=ensureAudio();var t=ctx.currentTime;
    // Higher pitch and shorter as charge fills
    var freq=400+pct*800;
    var dur=0.06-pct*0.03;
    var o=ctx.createOscillator();var g=ctx.createGain();
    o.type='square';o.frequency.setValueAtTime(freq,t);
    o.frequency.exponentialRampToValueAtTime(freq*1.3,t+dur);
    g.gain.setValueAtTime(0.12,t);
    g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    o.connect(g);g.connect(ctx.destination);
    o.start(t);o.stop(t+dur);
}

// ---- Charge jump effects: butt smoke (charging) + ground dust (release) ----
var _chargeParticles=[];
// Butt smoke — called every few frames while charging
function _spawnButtSmoke(egg,pct){
    var count=1+Math.floor(pct*2);
    for(var i=0;i<count;i++){
        var size=0.15+Math.random()*0.2;
        var geo=new THREE.SphereGeometry(size,5,4);
        var gray=0.7+Math.random()*0.3;
        var mat=new THREE.MeshBasicMaterial({color:new THREE.Color(gray,gray,gray),transparent:true,opacity:0.6,depthTest:false});
        var m=new THREE.Mesh(geo,mat);
        // Spawn behind and below the egg
        var dir=egg.mesh.rotation.y;
        var bx=egg.mesh.position.x-Math.sin(dir)*0.4+(Math.random()-0.5)*0.3;
        var by=egg.mesh.position.y+0.3+Math.random()*0.2;
        var bz=egg.mesh.position.z-Math.cos(dir)*0.4+(Math.random()-0.5)*0.3;
        m.position.set(bx,by,bz);
        scene.add(m);
        _chargeParticles.push({mesh:m,vx:(Math.random()-0.5)*0.01,vy:0.02+Math.random()*0.02,vz:(Math.random()-0.5)*0.01,life:20+Math.random()*15,maxLife:35,type:'smoke'});
    }
}
// Ground dust — burst on jump release
function _spawnGroundDust(x,y,z,pct){
    var count=Math.floor(6+pct*14);
    for(var i=0;i<count;i++){
        var size=0.2+Math.random()*0.3*pct;
        var geo=new THREE.SphereGeometry(size,5,4);
        var brown=0.55+Math.random()*0.2;
        var mat=new THREE.MeshBasicMaterial({color:new THREE.Color(brown,brown*0.85,brown*0.6),transparent:true,opacity:0.7,depthTest:false});
        var m=new THREE.Mesh(geo,mat);
        m.position.set(x+(Math.random()-0.5)*0.5,y+0.1+Math.random()*0.2,z+(Math.random()-0.5)*0.5);
        scene.add(m);
        var angle=Math.random()*Math.PI*2;
        var spd=0.04+Math.random()*0.1*pct;
        _chargeParticles.push({mesh:m,vx:Math.cos(angle)*spd,vy:0.01+Math.random()*0.03,vz:Math.sin(angle)*spd,life:25+Math.random()*20,maxLife:45,type:'dust'});
    }
    // Dust ring on ground
    var ringGeo=new THREE.RingGeometry(0.2,0.8+pct*1.5,16);
    var ringMat=new THREE.MeshBasicMaterial({color:0xBBAA88,transparent:true,opacity:0.5,side:THREE.DoubleSide,depthTest:false});
    var ring=new THREE.Mesh(ringGeo,ringMat);
    ring.position.set(x,y+0.05,z);ring.rotation.x=-Math.PI/2;
    scene.add(ring);
    _chargeParticles.push({mesh:ring,vx:0,vy:0,vz:0,life:18,maxLife:18,type:'ring',scaleSpeed:0.2+pct*0.3});
}
function _updateChargeParticles(){
    for(var i=_chargeParticles.length-1;i>=0;i--){
        var p=_chargeParticles[i];
        p.life--;
        if(p.life<=0){scene.remove(p.mesh);_chargeParticles.splice(i,1);continue;}
        var t=p.life/p.maxLife;
        p.mesh.material.opacity=t*(p.type==='smoke'?0.5:0.6);
        if(p.type==='ring'){
            var s=1+(1-t)*4*p.scaleSpeed;
            p.mesh.scale.set(s,s,s);
        } else {
            p.mesh.position.x+=p.vx;p.mesh.position.y+=p.vy;p.mesh.position.z+=p.vz;
            if(p.type==='smoke'){
                // Smoke rises and expands
                p.vy+=0.001;
                var sc=1+(1-t)*1.5;p.mesh.scale.set(sc,sc,sc);
            } else {
                // Dust settles
                p.vy-=0.001;
                if(p.mesh.position.y<0.05){p.mesh.position.y=0.05;p.vy=0;}
                p.vx*=0.96;p.vz*=0.96;
                var sc2=0.6+t*0.4;p.mesh.scale.set(sc2,sc2,sc2);
            }
        }
    }
}

// ============================================================
//  EGGSHELL DAMAGE STATUS  (replaces any HP/health readout)
//  Damage is driven by the stun meter. The more hurt an egg is,
//  the more its shell cracks; on full stun the shell "bursts".
//    stage 0  intact      🥚
//    stage 1  hairline crack
//    stage 2  cracks widen
//    stage 3  about to break
//    stage 4  critical
//    stage 5  shell burst  💥  (while stunned)
// ============================================================
function _eggShellStage(egg){
    if(!egg)return 0;
    if(egg._stunTimer>0)return 5;            // stunned == shell burst
    var thr=egg._stunThreshold||100;
    var r=(egg._stunMeter||0)/thr;
    if(r<=0.001)return 0;
    if(r<0.30)return 1;
    if(r<0.60)return 2;
    if(r<0.85)return 3;
    return 4;
}

// --- Procedural crack textures for the 3D body overlay (built once, shared) ---
var _crackTextures=null;
function _drawCrackBranch(cx,x,y,ang,len,width,depth,stg){
    if(len<6||depth<=0)return;
    var segs=4+Math.floor(Math.random()*3);
    // High damage cracks bleed dark red; light damage is near-black.
    cx.strokeStyle=(stg>=4?'rgba(86,10,10,':'rgba(20,14,18,')+Math.min(0.95,0.5+depth*0.13)+')';
    cx.lineCap='round';
    cx.lineWidth=Math.max(1.5,width);
    cx.beginPath();cx.moveTo(x,y);
    var px=x,py=y,a=ang,step=len/segs;
    for(var i=0;i<segs;i++){
        a+=(Math.random()-0.5)*0.85;
        px+=Math.cos(a)*step;py+=Math.sin(a)*step;
        cx.lineTo(px,py);
        if(Math.random()<0.45){
            _drawCrackBranch(cx,px,py,a+(Math.random()<0.5?1:-1)*(0.5+Math.random()*0.6),len*0.5,width*0.62,depth-1,stg);
        }
    }
    cx.stroke();
}
function _getCrackTextures(){
    if(_crackTextures)return _crackTextures;
    _crackTextures=[null]; // index 0 = intact, no texture
    for(var st=1;st<=5;st++){
        var cv=document.createElement('canvas');cv.width=256;cv.height=256;
        var cx=cv.getContext('2d');cx.clearRect(0,0,256,256);
        // Whole-shell damage wash at high stages so the body visibly reddens/darkens.
        if(st>=4){cx.fillStyle=st>=5?'rgba(110,14,14,0.34)':'rgba(120,26,26,0.20)';cx.fillRect(0,0,256,256);}
        var systems=1+st*2;             // many more cracks as damage grows
        var maxLen=46+st*40;
        for(var k=0;k<=systems;k++){
            var ox=40+Math.random()*176,oy=40+Math.random()*176;
            _drawCrackBranch(cx,ox,oy,Math.random()*Math.PI*2,maxLen,3.0+st*0.9,st,st);
        }
        var tex=new THREE.CanvasTexture(cv);tex.needsUpdate=true;
        _crackTextures.push(tex);
    }
    return _crackTextures;
}

// --- Per-egg crack overlay laid over the body sphere ---
function _ensureBodyCrackOverlay(egg){
    if(egg._crackOverlay)return egg._crackOverlay;
    var body=egg.mesh&&egg.mesh.userData?egg.mesh.userData.body:null;
    if(!body||!body.geometry)return null;
    var mat=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:THREE.FrontSide});
    var ov=new THREE.Mesh(body.geometry.clone(),mat);
    ov.position.set(0,0,0);
    ov.scale.set(1.012,1.012,1.012);   // hug the body surface
    ov.renderOrder=3;
    body.add(ov);
    egg._crackOverlay=ov;
    return ov;
}

// --- Floating shell-condition icon above EVERY character's head ---
// One sprite per egg (scene-added, positioned each frame). Pruned when the
// owner's mesh leaves the scene (race reset / city clear) so nothing leaks.
var _shellIndicators=[];
function _createShellIndicatorSprite(){
    var canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
    var tex=new THREE.CanvasTexture(canvas);
    var spr=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));
    spr.scale.set(1.05,1.05,1.05);
    spr._ctx=canvas.getContext('2d');spr._tex=tex;
    return spr;
}
function _pruneShellIndicators(){
    for(var i=_shellIndicators.length-1;i>=0;i--){
        var e=_shellIndicators[i];
        if(!e||!e.mesh||e.mesh.parent===null){
            if(e&&e._shellIndicator){scene.remove(e._shellIndicator);e._shellIndicator=null;}
            _shellIndicators.splice(i,1);
        }
    }
}
function _shellCrackLine(ctx,pts,w,col){
    ctx.strokeStyle=col;ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=w;
    ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);
    for(var i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);
    ctx.stroke();
}
function _drawShellIndicator(spr,stage){
    var ctx=spr._ctx;ctx.clearRect(0,0,128,128);
    var cols=['#5FCB57','#BFE25A','#F4D03F','#F39C12','#E74C3C','#C0392B'];
    var col=cols[Math.min(5,stage)];
    // Color-coded backdrop ring — instant read of how hurt they are.
    ctx.beginPath();ctx.arc(64,66,55,0,Math.PI*2);ctx.fillStyle=col+'22';ctx.fill();
    ctx.lineWidth=6;ctx.strokeStyle=col;ctx.stroke();

    if(stage>=5){
        // Shell burst: big 💥 + flying shell shards.
        ctx.font='76px serif';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText('\uD83D\uDCA5',64,66);
        ctx.fillStyle='#FFF6E0';ctx.strokeStyle='#8a6a2a';ctx.lineWidth=2;
        for(var k=0;k<7;k++){
            var a=k/7*Math.PI*2,r=46;
            var sx=64+Math.cos(a)*r,sy=66+Math.sin(a)*r;
            ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+Math.cos(a)*10-4,sy+Math.sin(a)*10);ctx.lineTo(sx+6,sy+9);ctx.closePath();ctx.fill();ctx.stroke();
        }
        spr._tex.needsUpdate=true;return;
    }

    // --- hand-drawn egg (shading + tint that yellows as it gets damaged) ---
    var cx=64,cy=70,rx=27,ry=35;
    var eggCols=['#FFFDF6','#FCF7E6','#F7EBC6','#EEDBA6'];
    ctx.save();ctx.translate(cx,cy);ctx.scale(rx/ry,1);
    ctx.beginPath();ctx.arc(0,0,ry,0,Math.PI*2);
    var grad=ctx.createRadialGradient(-10,-12,4,0,0,ry);
    grad.addColorStop(0,'#FFFFFF');grad.addColorStop(1,eggCols[Math.min(3,stage)]);
    ctx.fillStyle=grad;ctx.fill();
    ctx.lineWidth=3.2*ry/rx;ctx.strokeStyle='#caa86a';ctx.stroke();
    ctx.restore();

    // Missing chunk near the top from stage 3+ (gets bigger at stage 4).
    if(stage>=3){
        var notch=stage>=4?16:10;
        ctx.fillStyle='rgba(35,18,18,0.9)';
        ctx.beginPath();
        ctx.moveTo(cx-2,cy-ry+4);ctx.lineTo(cx+notch,cy-ry+1);ctx.lineTo(cx+notch*0.4,cy-ry+notch+2);
        ctx.closePath();ctx.fill();
    }

    // Cracks: count, length, width and redness all scale up with damage.
    var crackCol=stage>=3?'#7a1414':'#241a1e';
    var baseW=2.4+stage*1.7;
    var pts=[[cx,cy-ry+6]],xx=cx,yy=cy-ry+6,segs=2+stage*2,stepY=(2*ry-12)/(segs+1);
    for(var i=0;i<segs;i++){yy+=stepY;xx+=(i%2?1:-1)*(5+stage*2.6);pts.push([xx,yy]);}
    _shellCrackLine(ctx,pts,baseW,crackCol);
    if(stage>=2)_shellCrackLine(ctx,[[pts[1][0],pts[1][1]],[pts[1][0]-15,pts[1][1]+13],[pts[1][0]-26,pts[1][1]+12]],baseW*0.72,crackCol);
    if(stage>=3){
        _shellCrackLine(ctx,[[pts[2][0],pts[2][1]],[pts[2][0]+17,pts[2][1]+11],[pts[2][0]+28,pts[2][1]+20]],baseW*0.72,crackCol);
        _shellCrackLine(ctx,[[cx-rx+5,cy+5],[cx-6,cy+9],[cx+12,cy+2]],baseW*0.6,crackCol);
    }
    if(stage>=4){
        _shellCrackLine(ctx,[[cx+rx-5,cy-7],[cx+6,cy+2],[cx-12,cy+15]],baseW*0.72,crackCol);
        // a detached shard tumbling off the bottom
        ctx.fillStyle='#EEDBA6';ctx.strokeStyle='#caa86a';ctx.lineWidth=1.5;
        ctx.beginPath();ctx.moveTo(cx+15,cy+ry+3);ctx.lineTo(cx+25,cy+ry+7);ctx.lineTo(cx+18,cy+ry+14);ctx.closePath();ctx.fill();ctx.stroke();
    }
    spr._tex.needsUpdate=true;
}
function _updateShellIndicator(egg,stage){
    if(typeof scene==='undefined'||!egg||!egg.mesh)return;
    if(!egg._shellIndicator){
        egg._shellIndicator=_createShellIndicatorSprite();
        egg._shellIndStage=-99;
        scene.add(egg._shellIndicator);
        _shellIndicators.push(egg);
    }
    var spr=egg._shellIndicator;
    spr.visible=true;
    var p=egg.mesh.position;
    spr.position.set(p.x,p.y+4.55,p.z);
    // Grows with damage; pulses when critical / burst for unmistakable feedback.
    var sc=0.72+stage*0.16;
    if(stage>=4)sc+=Math.sin(Date.now()*0.013)*0.14;
    spr.scale.set(sc,sc,sc);
    if(stage!==egg._shellIndStage){_drawShellIndicator(spr,stage);egg._shellIndStage=stage;}
}

// Main per-frame entry. Call for every egg; pass isPlayer=true for the player
// (used only to run the once-per-frame cleanup sweep).
function _updateShellStatus(egg,isPlayer){
    if(!egg||!egg.mesh)return;
    var stage=_eggShellStage(egg);
    if(stage>=1){
        var ov=_ensureBodyCrackOverlay(egg);
        if(ov){
            var texs=_getCrackTextures();
            var texStage=Math.min(5,stage);
            if(ov.material.map!==texs[texStage]){ov.material.map=texs[texStage];ov.material.needsUpdate=true;}
            ov.material.opacity=stage>=5?0.98:Math.min(0.96,0.42+stage*0.18);
            ov.visible=true;
        }
    }else if(egg._crackOverlay){
        egg._crackOverlay.visible=false;
    }
    if(stage>=1)_updateShellIndicator(egg,stage);
    else if(egg._shellIndicator){
        egg._shellIndicator.visible=false;
        egg._shellIndStage=-99;
    }
}

// Per-frame sweep: show the shell status above EVERY egg in the world
// (player, race opponents, city NPCs) and clean up indicators whose owner
// has left the scene. Called once per game tick so no mode is missed.
function _updateAllShellStatus(){
    if(typeof allEggs==='undefined'||!allEggs)return;
    for(var i=0;i<allEggs.length;i++){
        var e=allEggs[i];
        if(e&&e.mesh)_updateShellStatus(e,false);
    }
    _pruneShellIndicators();
    // Name tags: local player (with Lv/title) + competitors (name only). City ambient NPCs skip.
    for(var ti=0;ti<allEggs.length;ti++){var te=allEggs[ti];if(te&&te.mesh&&(te.isPlayer||!te.cityNPC))_updateEggTag(te);}
    _pruneEggTags();
}

// ---- Above-head name + (player only) explorer level/title tags ----
var _eggTags=[],_explorerNameSeq=0;
var _NPC_NICKS=['\u5C0F\u86CB','\u86CB\u9171','\u65C5\u4EBA','\u963F\u5149','\u7CD6\u7CD6','\u96EA\u5B9D','\u55B5\u55B5','\u5927\u529B','\u95EA\u7535','\u6CE1\u6CE1','\u679C\u51BB','\u5495\u5495','\u5947\u5947','\u8E66\u8E66','\u661F\u661F','momo'];
function _eggDisplayName(egg){
    if(egg.isPlayer)return (typeof CHARACTERS!=='undefined'&&typeof selectedChar!=='undefined'&&CHARACTERS[selectedChar])?CHARACTERS[selectedChar].name:'Player';
    if(!egg._explorerName){egg._explorerName=_NPC_NICKS[_explorerNameSeq%_NPC_NICKS.length];_explorerNameSeq++;}
    return egg._explorerName;
}
function _makeTagSprite(){
    var cv=document.createElement('canvas');cv.width=256;cv.height=96;
    var tex=new THREE.CanvasTexture(cv);
    var spr=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));
    spr.scale.set(2.7,1.0,1);
    spr._ctx=cv.getContext('2d');spr._tex=tex;
    return spr;
}
function _drawEggTag(spr,name,levelLine){
    var ctx=spr._ctx;ctx.clearRect(0,0,256,96);
    ctx.textAlign='center';ctx.lineJoin='round';
    var ny=levelLine?30:54;
    ctx.font='bold 30px system-ui,Segoe UI,sans-serif';ctx.lineWidth=6;ctx.strokeStyle='rgba(0,0,0,0.85)';ctx.fillStyle='#FFFFFF';
    ctx.strokeText('['+name+']',128,ny);ctx.fillText('['+name+']',128,ny);
    if(levelLine){
        ctx.font='bold 22px system-ui,Segoe UI,sans-serif';ctx.fillStyle='#FFD86B';
        ctx.strokeText(levelLine,128,66);ctx.fillText(levelLine,128,66);
    }
    spr._tex.needsUpdate=true;
}
function _updateEggTag(egg){
    if(typeof scene==='undefined'||!egg||!egg.mesh)return;
    if(!egg._tagSprite){egg._tagSprite=_makeTagSprite();egg._tagKey='';scene.add(egg._tagSprite);_eggTags.push(egg);}
    var spr=egg._tagSprite;spr.visible=true;
    var name=_eggDisplayName(egg);
    var levelLine='';
    if(egg.isPlayer&&typeof Explorer!=='undefined'){var lv=Explorer.levelInfo();levelLine='Lv'+lv.lv+' '+lv.name;}
    var key=name+'|'+levelLine;
    if(key!==egg._tagKey){_drawEggTag(spr,name,levelLine);egg._tagKey=key;}
    var p=egg.mesh.position;spr.position.set(p.x,p.y+3.75,p.z);
}
function _pruneEggTags(){
    for(var i=_eggTags.length-1;i>=0;i--){
        var e=_eggTags[i];
        if(!e||!e.mesh||e.mesh.parent===null){if(e&&e._tagSprite){scene.remove(e._tagSprite);e._tagSprite=null;}_eggTags.splice(i,1);}
    }
}
// Kept for Explorer.addPoints(): force-refresh the player's tag on level change.
function _updatePlayerTag(force){
    if(typeof playerEgg==='undefined'||!playerEgg||!playerEgg.mesh)return;
    if(force)playerEgg._tagKey='';
    _updateEggTag(playerEgg);
}
