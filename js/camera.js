// camera.js — DANBO World
// ============================================================
//  CAMERA
// ============================================================
var _cameraZoom=1.0; // 1.0 = default, smaller = closer, larger = farther
// Moon third-person camera orbit angles (mouse-controlled)
var _moonCamYaw=0; // horizontal orbit angle around player (radians)
var _moonCamPitch=0.35; // vertical angle (0=level, positive=above)
var _moonCamDragging=false;
var _moonCamLastX=0, _moonCamLastY=0;
var _spectatorMode=false;
// Third-person (RE5 style) camera
var _tpsCamMode=false;
// City camera modes: 0 = normal top-down, 1 = third-person, 2 = first-person
var _viewMode=0;
var _tpsCamYaw=0; // horizontal orbit around player
var _tpsCamPitch=0.2;
var _tpsCamDist=8;
var _tpsDragging=false;
var _tpsLastX=0,_tpsLastY=0;
var _specCamX=0,_specCamY=50,_specCamZ=0;
var _specLookX=0,_specLookY=0,_specLookZ=-50;
document.addEventListener('wheel',function(e){
    if(_tpsCamMode){_tpsCamDist+=e.deltaY*0.01;return;}
    _cameraZoom+=e.deltaY*0.001*Math.max(1,_cameraZoom*0.5);
    if(_cameraZoom<CAMERA_CONFIG.zoomMin)_cameraZoom=CAMERA_CONFIG.zoomMin;
    if(_cameraZoom>CAMERA_CONFIG.zoomMax)_cameraZoom=CAMERA_CONFIG.zoomMax;
},{passive:true});
// Mouse drag to orbit camera (disabled — moon now uses flat camera)
document.addEventListener('mousedown',function(e){
    if(currentCityStyle===5&&(e.button===2||e.button===1)){_moonCamDragging=true;_moonCamLastX=e.clientX;_moonCamLastY=e.clientY;e.preventDefault();}
});
document.addEventListener('mousemove',function(e){
    if(_moonCamDragging){
        var dx=e.clientX-_moonCamLastX, dy=e.clientY-_moonCamLastY;
        _moonCamYaw-=dx*0.005;
        _moonCamPitch+=dy*0.005;
        if(_moonCamPitch<0.05)_moonCamPitch=0.05;
        if(_moonCamPitch>1.2)_moonCamPitch=1.2;
        _moonCamLastX=e.clientX;_moonCamLastY=e.clientY;
    }
});
document.addEventListener('mouseup',function(e){
    if(e.button===2||e.button===1)_moonCamDragging=false;
});
document.addEventListener('contextmenu',function(e){if(currentCityStyle===5||_viewMode>0)e.preventDefault();});
// TPS camera: mouse drag to orbit
document.addEventListener('mousedown',function(e){
    if(_tpsCamMode&&gameState==='city'&&(e.button===0||e.button===2)){_tpsDragging=true;_tpsLastX=e.clientX;_tpsLastY=e.clientY;e.preventDefault();}
});
document.addEventListener('mousemove',function(e){
    if(_tpsDragging){
        _tpsCamYaw-=(e.clientX-_tpsLastX)*0.005;
        _tpsCamPitch+=(e.clientY-_tpsLastY)*0.005;
        if(_tpsCamPitch<-1.57)_tpsCamPitch=-1.57;
        if(_tpsCamPitch>1.2)_tpsCamPitch=1.2;
        _tpsLastX=e.clientX;_tpsLastY=e.clientY;
    }
});
document.addEventListener('mouseup',function(e){_tpsDragging=false;});
// TPS camera: touch drag
var _tpsTouchId=null;
document.addEventListener('touchstart',function(e){
    if(_tpsCamMode&&gameState==='city'&&e.touches.length===1){
        var t=e.touches[0];
        if(t.clientX>window.innerWidth*0.4){
            _tpsTouchId=t.identifier;_tpsLastX=t.clientX;_tpsLastY=t.clientY;
        }
    }
},{passive:true});
document.addEventListener('touchmove',function(e){
    if(_tpsTouchId!==null){
        for(var ti=0;ti<e.touches.length;ti++){
            if(e.touches[ti].identifier===_tpsTouchId){
                var t=e.touches[ti];
                _tpsCamYaw-=(t.clientX-_tpsLastX)*0.008;
                _tpsCamPitch+=(t.clientY-_tpsLastY)*0.008;
                if(_tpsCamPitch<-1.57)_tpsCamPitch=-1.57;
                if(_tpsCamPitch>1.2)_tpsCamPitch=1.2;
                _tpsLastX=t.clientX;_tpsLastY=t.clientY;
                break;
            }
        }
    }
},{passive:true});
document.addEventListener('touchend',function(e){
    if(_tpsTouchId!==null){
        var found=false;
        for(var ti=0;ti<e.touches.length;ti++){if(e.touches[ti].identifier===_tpsTouchId)found=true;}
        if(!found)_tpsTouchId=null;
    }
},{passive:true});
// City camera mode controls.  The mobile camera button and the desktop HUD
// button both cycle: normal -> third-person -> first-person -> normal.
function _updateViewModeUI(){
    _tpsCamMode=_viewMode===1;
    if(playerEgg&&playerEgg.mesh)playerEgg.mesh.visible=_viewMode!==2;
    var _tpsBtn=document.getElementById('tps-btn');
    if(_tpsBtn){
        _tpsBtn.textContent=_viewMode===2?'👁':(_viewMode===1?'🎥':'📷');
        _tpsBtn.title=_viewMode===2?'First person':(_viewMode===1?'Third person':'Normal camera');
    }
    var _viewBtn=document.getElementById('view-mode-btn');
    if(_viewBtn){
        var labels={
            zhs:['📷 普通','🎥 第三人称','👁 第一人称'],
            zht:['📷 普通','🎥 第三人稱','👁 第一人稱'],
            ja:['📷 通常','🎥 三人称','👁 一人称'],
            en:['📷 Normal','🎥 Third-person','👁 First-person']
        };
        var arr=labels[_langCode]||labels.en;
        _viewBtn.textContent=arr[_viewMode]||arr[0];
        _viewBtn.title='1 / C';
    }
}
function _setViewMode(mode){
    _viewMode=((mode%3)+3)%3;
    _tpsCamMode=_viewMode===1;
    if(_viewMode===1&&playerEgg){_tpsCamYaw=playerEgg.mesh.rotation.y+Math.PI;_tpsCamPitch=0.2;}
    if(_viewMode!==2&&camera&&camera.fov!==45){camera.fov=45;camera.updateProjectionMatrix();}
    _updateViewModeUI();
}
function _cycleViewMode(){
    _setViewMode(_viewMode+1);
}
// Backward-compatible name used by existing mobile button code.
function _toggleTPS(){
    _cycleViewMode();
}
function _recenterTPS(){
    if(_viewMode===1&&playerEgg){_tpsCamYaw=playerEgg.mesh.rotation.y+Math.PI;_tpsCamPitch=0.2;}
}
function _resetViewMode(){
    _setViewMode(0);
}
document.addEventListener('keydown',function(e){
    if((e.code==='Digit1'||e.code==='KeyC')&&gameState==='city')_cycleViewMode();
    if(e.code==='Digit2'&&gameState==='city')_recenterTPS();
});
var _tpsBtnEl=document.getElementById('tps-btn');
if(_tpsBtnEl){
    _tpsBtnEl.addEventListener('click',function(){if(gameState==='city')_toggleTPS();});
    _tpsBtnEl.addEventListener('touchend',function(e){e.preventDefault();if(gameState==='city')_toggleTPS();},{passive:false});
}
var _tpsRecBtn=document.getElementById('tps-recenter-btn');
if(_tpsRecBtn){
    _tpsRecBtn.addEventListener('click',function(){_recenterTPS();});
    _tpsRecBtn.addEventListener('touchend',function(e){e.preventDefault();_recenterTPS();},{passive:false});
}
var _viewBtnEl=document.getElementById('view-mode-btn');
if(_viewBtnEl){
    _viewBtnEl.addEventListener('click',function(){if(gameState==='city')_cycleViewMode();});
    _viewBtnEl.addEventListener('touchend',function(e){e.preventDefault();if(gameState==='city')_cycleViewMode();},{passive:false});
}
_updateViewModeUI();
// Spectator button for mobile
var _specBtn=document.getElementById('spectator-btn');
if(_specBtn){_specBtn.addEventListener('click',function(){
    if(currentCityStyle===5&&gameState==='city'){
        _spectatorMode=!_spectatorMode;
        if(_spectatorMode&&playerEgg){_specCamX=camera.position.x;_specCamY=camera.position.y;_specCamZ=camera.position.z;}
        _specBtn.textContent=_spectatorMode?'\uD83C\uDFAE Player':'\uD83D\uDC41 Spectator';
    }
});}
document.addEventListener('keydown',function(e){
    if(e.code==='KeyV'&&currentCityStyle===5&&gameState==='city'){
        _spectatorMode=!_spectatorMode;
        if(_spectatorMode&&playerEgg){_specCamX=camera.position.x;_specCamY=camera.position.y;_specCamZ=camera.position.z;}
        if(_specBtn)_specBtn.textContent=_spectatorMode?'\uD83C\uDFAE Player':'\uD83D\uDC41 Spectator';
    }
});
// Touch orbit disabled — moon now uses flat camera
var _moonTouchOrbit=false, _moonTouchStartX=0, _moonTouchStartY=0;
document.addEventListener('touchstart',function(e){
    if(_spectatorMode&&currentCityStyle===5&&e.touches.length===1){
        var t=e.touches[0];
        // Only orbit if touching the right half of screen (not joystick area)
        if(t.clientX>window.innerWidth*0.4){
            _moonTouchOrbit=true;_moonTouchStartX=t.clientX;_moonTouchStartY=t.clientY;
        }
    }
},{passive:true});
document.addEventListener('touchmove',function(e){
    if(e.touches.length>=2){_moonTouchOrbit=false;return;}
    if(_moonTouchOrbit&&e.touches.length===1){
        var t=e.touches[0];
        var dx=t.clientX-_moonTouchStartX,dy=t.clientY-_moonTouchStartY;
        _moonCamYaw-=dx*0.008;
        _moonCamPitch+=dy*0.008;
        if(_moonCamPitch<0.05)_moonCamPitch=0.05;
        if(_moonCamPitch>1.2)_moonCamPitch=1.2;
        _moonTouchStartX=t.clientX;_moonTouchStartY=t.clientY;
    }
},{passive:true});
document.addEventListener('touchend',function(e){_moonTouchOrbit=false;},{passive:true});
function updateCamera(){
    if(!playerEgg)return;
    if(gameState!=='city'&&playerEgg.mesh&&!playerEgg.mesh.visible)playerEgg.mesh.visible=true;
    // Spectator mode — free camera on moon
    if(_spectatorMode&&currentCityStyle===5){
        var _spSpd=1.5;
        // Punch = speed boost
        if(keys['KeyR'])_spSpd=3.0;
        // Grab toggles joystick mode (move vs angle)
        if(keys['KeyF']&&!window._specGrabWas){window._specAngleMode=!window._specAngleMode;}
        window._specGrabWas=!!keys['KeyF'];
        // Keyboard move
        if(keys['KeyW']||keys['ArrowUp']){_specCamX-=Math.sin(_moonCamYaw)*_spSpd;_specCamZ-=Math.cos(_moonCamYaw)*_spSpd;}
        if(keys['KeyS']||keys['ArrowDown']){_specCamX+=Math.sin(_moonCamYaw)*_spSpd;_specCamZ+=Math.cos(_moonCamYaw)*_spSpd;}
        if(keys['KeyA']||keys['ArrowLeft']){_specCamX-=Math.cos(_moonCamYaw)*_spSpd;_specCamZ+=Math.sin(_moonCamYaw)*_spSpd;}
        if(keys['KeyD']||keys['ArrowRight']){_specCamX+=Math.cos(_moonCamYaw)*_spSpd;_specCamZ-=Math.sin(_moonCamYaw)*_spSpd;}
        if(keys['Space']){_specCamY+=_spSpd;}
        if(keys['ShiftLeft']||keys['ShiftRight']){_specCamY-=_spSpd;if(_specCamY<5)_specCamY=5;}
        // Joystick (mobile) — move or angle depending on mode
        if(joyActive){
            if(window._specAngleMode){
                // Angle mode: joystick rotates camera
                _moonCamYaw-=joyVec.x*0.04;
                _moonCamPitch+=joyVec.y*0.03;
                if(_moonCamPitch<0.05)_moonCamPitch=0.05;
                if(_moonCamPitch>1.2)_moonCamPitch=1.2;
            } else {
                // Move mode: joystick moves camera
                var _jfwd=-joyVec.y*_spSpd;
                var _jside=joyVec.x*_spSpd;
                _specCamX+=Math.sin(_moonCamYaw)*_jfwd+Math.cos(_moonCamYaw)*_jside;
                _specCamZ+=Math.cos(_moonCamYaw)*_jfwd-Math.sin(_moonCamYaw)*_jside;
            }
        }
        // Pinch zoom = FOV/distance zoom (not height)
        camera.fov=45*Math.max(0.3,Math.min(3,_cameraZoom));
        camera.updateProjectionMatrix();
        camera.position.set(_specCamX,_specCamY,_specCamZ);
        var _lookDist=100;
        camera.lookAt(_specCamX-Math.sin(_moonCamYaw)*_lookDist,_specCamY-Math.sin(_moonCamPitch)*_lookDist*0.5,_specCamZ-Math.cos(_moonCamYaw)*_lookDist);
        sun.position.set(_specCamX+RENDER_CONFIG.sunPos.x,RENDER_CONFIG.sunPos.y,_specCamZ+RENDER_CONFIG.sunPos.z);
        sun.target.position.set(_specCamX,0,_specCamZ);
        _sunMesh.position.set(_specCamX+180,240,_specCamZ+120);
        _sunGlow.position.copy(_sunMesh.position);
        return;
    }
    const p=playerEgg.mesh.position;
    // True first-person camera for city exploration.  Hide only the local
    // player mesh so the camera is not inside the egg body.
    if(_viewMode===2&&gameState==='city'){
        if(playerEgg.mesh)playerEgg.mesh.visible=false;
        if(camera.fov!==62){camera.fov=62;camera.updateProjectionMatrix();}
        var _fpYaw=playerEgg.mesh.rotation.y;
        var _fpEyeY=p.y+1.05;
        var _fpEyeX=p.x+Math.sin(_fpYaw)*0.18;
        var _fpEyeZ=p.z+Math.cos(_fpYaw)*0.18;
        camera.position.x+=(_fpEyeX-camera.position.x)*0.65;
        camera.position.y+=(_fpEyeY-camera.position.y)*0.65;
        camera.position.z+=(_fpEyeZ-camera.position.z)*0.65;
        camera.lookAt(_fpEyeX+Math.sin(_fpYaw)*12,_fpEyeY+0.05,_fpEyeZ+Math.cos(_fpYaw)*12);
        sun.position.set(p.x+RENDER_CONFIG.sunPos.x,RENDER_CONFIG.sunPos.y,p.z+RENDER_CONFIG.sunPos.z);
        sun.target.position.set(p.x,0,p.z);
        _sunMesh.position.set(p.x+180,240,p.z+120);
        _sunGlow.position.copy(_sunMesh.position);
        return;
    } else if(playerEgg.mesh&&!playerEgg.mesh.visible){
        playerEgg.mesh.visible=true;
    }
    // Third-person (RE5 style) camera — over-the-shoulder
    if(_tpsCamMode){
        if(camera.fov!==45){camera.fov=45;camera.updateProjectionMatrix();}
        _tpsCamDist=Math.max(2,Math.min(15,_tpsCamDist));
        // TPS: grab button adjusts camera angle manually
        var _tpsManual=false;
        if(keys['KeyF']){
            if(joyActive){_tpsCamYaw-=joyVec.x*0.04;_tpsCamPitch-=joyVec.y*0.03;_tpsManual=true;}
            if(_tpsCamPitch<-1.57)_tpsCamPitch=-1.57;
            if(_tpsCamPitch>1.2)_tpsCamPitch=1.2;
        }
        // ---- TPS State Machine: facing + camera follow ----
        var _st=window._tpsMoveState||'idle';
        // Skip facing control during special moves (let moves handle their own rotation)
        var _inMove=!!(playerEgg._tatsuActive||playerEgg._shoryuActive||playerEgg._hondaDash||playerEgg._blankaSpinTimer||playerEgg._blankaSpinFalling||playerEgg._guileSomersault||playerEgg._yogaFlame||playerEgg._piledriverTarget);

        // 1. Character facing (skip during special moves)
        if(_inMove){
            // Moves control their own rotation — just update last face when done
        } else if(_st==='forward'){
            // Moving forward/side: smoothly turn to face velocity direction
            var _mvSpd=DANBO_WASM.len2D(playerEgg.vx,playerEgg.vz);
            if(_mvSpd>0.03){
                var _mvDir=Math.atan2(playerEgg.vx,playerEgg.vz);
                var _faceDy=_mvDir-playerEgg.mesh.rotation.y;
                while(_faceDy>Math.PI)_faceDy-=Math.PI*2;
                while(_faceDy<-Math.PI)_faceDy+=Math.PI*2;
                playerEgg.mesh.rotation.y+=_faceDy*0.08;
            }
            playerEgg._tpsLastFace=playerEgg.mesh.rotation.y;
        } else {
            // Backward or idle: hold last known facing direction
            if(playerEgg._tpsLastFace!==undefined){
                playerEgg.mesh.rotation.y=playerEgg._tpsLastFace;
            }
        }

        // 2. Camera auto-follow (only when moving forward, not manual/backward)
        if(_st==='forward'&&!_tpsManual&&!_tpsDragging&&_tpsTouchId===null){
            var _spd=DANBO_WASM.len2D(playerEgg.vx,playerEgg.vz);
            if(_spd>0.05){
                var _targetYaw=Math.atan2(playerEgg.vx,playerEgg.vz)+Math.PI;
                var _dy=_targetYaw-_tpsCamYaw;
                while(_dy>Math.PI)_dy-=Math.PI*2;
                while(_dy<-Math.PI)_dy+=Math.PI*2;
                if(Math.abs(_dy)>0.1)_tpsCamYaw+=_dy*0.02;
            }
        }
        // Camera position: spherical coordinates around player
        var _hDist=_tpsCamDist*Math.cos(_tpsCamPitch);
        var _tpx=p.x+Math.sin(_tpsCamYaw)*_hDist;
        var _tpy=p.y+1.5+_tpsCamDist*Math.sin(_tpsCamPitch);
        var _tpz=p.z+Math.cos(_tpsCamYaw)*_hDist;
        // Camera collision: raycast from player to target, pull in if blocked
        var _actDist=_tpsCamDist;
        for(var _cci=0;_cci<cityColliders.length;_cci++){
            var _cc=cityColliders[_cci];
            if(_cc._bridge)continue; // skip bridge colliders
            if((_cc.h||6)<p.y+1)continue; // skip low things
            // Check if target camera pos is inside this collider
            if(DANBO_WASM.aabb2D(_tpx,_tpz,_cc.x,_cc.z,_cc.hw,_cc.hd,1)){
                // Pull camera closer to player
                var _dx2=_tpx-p.x, _dz2=_tpz-p.z;
                var _dl=DANBO_WASM.len2D(_dx2,_dz2)||1;
                // Find safe distance (just outside the collider)
                for(var _t=0.9;_t>0.1;_t-=0.1){
                    var _tx=p.x+_dx2*_t, _tz=p.z+_dz2*_t;
                    if(!(DANBO_WASM.aabb2D(_tx,_tz,_cc.x,_cc.z,_cc.hw,_cc.hd,1))){
                        _actDist=_tpsCamDist*_t;
                        break;
                    }
                }
            }
        }
        if(_actDist<_tpsCamDist){
            _hDist=_actDist*Math.cos(_tpsCamPitch);
            _tpx=p.x+Math.sin(_tpsCamYaw)*_hDist;
            _tpy=p.y+1.5+_actDist*Math.sin(_tpsCamPitch);
            _tpz=p.z+Math.cos(_tpsCamYaw)*_hDist;
        }
        camera.position.x+=(_tpx-camera.position.x)*0.12;
        camera.position.y+=(_tpy-camera.position.y)*0.12;
        camera.position.z+=(_tpz-camera.position.z)*0.12;
        if(camera.position.y<p.y+0.8)camera.position.y=p.y+0.8;
        camera.lookAt(p.x,p.y+0.3,p.z);
        sun.position.set(p.x+RENDER_CONFIG.sunPos.x,RENDER_CONFIG.sunPos.y,p.z+RENDER_CONFIG.sunPos.z);
        sun.target.position.set(p.x,0,p.z);
        _sunMesh.position.set(p.x+180,240,p.z+120);
        _sunGlow.position.copy(_sunMesh.position);
        return;
    }
    // Normal flat camera (used for all cities including moon)
    if(camera.fov!==45){camera.fov=45;camera.updateProjectionMatrix();}
    var tx=p.x, ty=p.y+CAMERA_CONFIG.yOffset*_cameraZoom, tz=p.z+CAMERA_CONFIG.zOffset*_cameraZoom;
    camera.position.x+=(tx-camera.position.x)*CAMERA_CONFIG.followSmooth;
    camera.position.y+=(ty-camera.position.y)*CAMERA_CONFIG.followSmooth;
    camera.position.z+=(tz-camera.position.z)*CAMERA_CONFIG.followSmooth;
    // Clamp camera above ground to prevent blue screen when falling
    if(camera.position.y<CAMERA_CONFIG.minHeight)camera.position.y=CAMERA_CONFIG.minHeight;
    // Earthquake shake
    if(_earthquakeTimer>0){
        var shakeAmt=_earthquakeIntensity*(_earthquakeTimer/180);
        camera.position.x+=(Math.random()-0.5)*shakeAmt*CAMERA_CONFIG.shakeMultX;
        camera.position.y+=(Math.random()-0.5)*shakeAmt*CAMERA_CONFIG.shakeMultY;
        camera.position.z+=(Math.random()-0.5)*shakeAmt*CAMERA_CONFIG.shakeMultZ;
        _earthquakeTimer--;
    }
    camera.lookAt(p.x, p.y+0.3, p.z-4);
    sun.position.set(p.x+RENDER_CONFIG.sunPos.x,RENDER_CONFIG.sunPos.y,p.z+RENDER_CONFIG.sunPos.z);
    sun.target.position.set(p.x,0,p.z);
    // Show spectator button on moon
    if(_specBtn){_specBtn.style.display=(currentCityStyle===5&&gameState==='city')?'inline-block':'none';}
    // Sun mesh follows directional light direction (far away visual)
    _sunMesh.position.set(p.x+180,240,p.z+120);
    _sunGlow.position.copy(_sunMesh.position);

    // Building occlusion — fade buildings between camera and player
    // BUT don't fade if player is standing on the roof
    if(gameState==='city'){
        const cx=camera.position.x, cz=camera.position.z;
        const px2=p.x, pz2=p.z;
        const py2=playerEgg?playerEgg.mesh.position.y:0;
        for(const bld of cityBuildingMeshes){
            // Check if player is on this building's roof
            var onRoof=false;
            if(DANBO_WASM.aabb2D(px2,pz2,bld.x,bld.z,bld.hw,bld.hd,1)&&py2>=bld.h-1){
                onRoof=true;
            }
            // 2D line-segment (camera→player) vs AABB intersection in XZ
            let shouldFade=false;
            if(!onRoof){
            const bx0=bld.x-bld.hw-0.5, bx1=bld.x+bld.hw+0.5;
            const bz0=bld.z-bld.hd-0.5, bz1=bld.z+bld.hd+0.5;
            // Liang-Barsky algorithm for 2D segment clipping
            const dx=px2-cx, dz=pz2-cz;
            const pp=[-dx, dx, -dz, dz];
            const qq=[cx-bx0, bx1-cx, cz-bz0, bz1-cz];
            let tmin=0, tmax=1;
            let valid=true;
            for(let i=0;i<4;i++){
                if(DANBO_WASM.absDeltaLess(pp[i],0,1e-8)){
                    if(qq[i]<0){valid=false;break;}
                } else {
                    const t=qq[i]/pp[i];
                    if(pp[i]<0){if(t>tmin)tmin=t;} else {if(t<tmax)tmax=t;}
                }
            }
            if(valid&&tmin<tmax&&tmax>0.05&&tmin<0.95) shouldFade=true;
            }
            // Also fade if player is directly underneath (bridges, overhangs)
            if(!onRoof&&DANBO_WASM.aabb2D(px2,pz2,bld.x,bld.z,bld.hw,bld.hd,1)&&py2<bld.h-1){
                shouldFade=true;
            }
            // Normal mode: fade buildings in a narrow rectangle below player (3 body widths)
            if(!_tpsCamMode&&!shouldFade&&bld.h>py2+0.5){
                var _bodyW=1.5; // ~egg radius × 3 body widths each side
                // Rectangle: x within ±3 body widths of player, z >= player z (downward on screen)
                if(bld.z-bld.hd>pz2-2&&DANBO_WASM.absDeltaLess(bld.x,px2,_bodyW*3+bld.hw)){
                    shouldFade=true;
                }
            }
            // TPS mode: fade buildings near camera or between camera and player
            if(_tpsCamMode&&!shouldFade){
                var _cdx3=bld.x-cx, _cdz3=bld.z-cz;
                if(DANBO_WASM.aabb2D(cx,cz,bld.x,bld.z,bld.hw,bld.hd,3)) shouldFade=true;
                if(!shouldFade){
                    var _bdx2=bld.x-px2, _bdz2=bld.z-pz2;
                    var _bDist2=DANBO_WASM.len2D(_bdx2,_bdz2);
                    if(_bDist2<_tpsCamDist+bld.hw+bld.hd+4&&bld.h>py2+0.5) shouldFade=true;
                }
            }

            const targetOp=shouldFade?0.01:1.0;
            for(const m of bld.meshes){
                const mat=m.material;
                if(!mat)continue;
                if(!mat.hasOwnProperty('_origOpacity')){mat._origOpacity=mat.opacity||1;mat._origTransparent=mat.transparent||false;mat._origDepthWrite=mat.depthWrite!==undefined?mat.depthWrite:true;}
                const goal=targetOp*mat._origOpacity;
                mat.opacity+=(goal-mat.opacity)*(_tpsCamMode?0.3:0.15);
                mat.transparent=true;
                mat.depthWrite=mat.opacity>0.95;
                mat.needsUpdate=true;
                m.renderOrder=shouldFade?10:0;
            }
        }
    }
}

