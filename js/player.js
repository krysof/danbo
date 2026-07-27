// player.js — DANBO World
// ============================================================
//  PLAYER INPUT
// ============================================================
// Stun meter system: accumulate damage, stun when threshold exceeded
// stunAmount: light=8, medium=15, heavy=25, slam=40, special=20
// Returns true if the target gets stunned
function _addStunDamage(egg,amount){
    if(!egg._stunMeter)egg._stunMeter=0;
    if(!egg._stunThreshold)egg._stunThreshold=STUN_CONFIG.threshold;
    // If already stunned, getting hit clears the stun
    if(egg._stunTimer>0){egg._stunTimer=0;egg._stunMeter=0;return false;}
    egg._stunMeter+=amount;
    if(egg._stunMeter>=egg._stunThreshold&&egg._stunTimer<=0){
        var overflow=egg._stunMeter-egg._stunThreshold;
        egg._stunTimer=Math.floor(60+overflow*0.5);
        egg._stunMeter=0;
        return true;
    }
    return false;
}
function handlePlayerInput(){
    try{
    if(!playerEgg||!playerEgg.alive)return;
    if(_portalConfirmOpen)return;
    if(playerEgg.finished&&gameState==='racing')return;
    if(playerEgg._fallPenalty>0)return;
    if(playerEgg.heldBy)return;
    // Cannot control while thrown or stunned (except struggle when held)
    if(playerEgg.throwTimer>0||playerEgg._stunTimer>0){
        // Interrupt: drop held items and cancel ALL special moves
        if(playerEgg.holding){var _ih=playerEgg.holding;_ih.heldBy=null;playerEgg.holding=null;if(_ih.struggleBar){_ih.mesh.remove(_ih.struggleBar);_ih.struggleBar=null;}playerEgg.grabCD=20;}
        if(playerEgg.holdingProp){playerEgg.holdingProp.grabbed=false;playerEgg.holdingProp=null;playerEgg.grabCD=20;}
        if(playerEgg.holdingObs){playerEgg.holdingObs._grabbed=false;playerEgg.holdingObs=null;playerEgg.grabCD=20;}
        _jumpCharging=false;_jumpCharge=0;_chargeHoldTimer=0;
        playerEgg._throwCharging=false;playerEgg._throwCharge=0;
        _sprintCharge=0;
        // Cancel all special moves
        if(playerEgg._piledriverTarget){var _ipt=playerEgg._piledriverTarget;_ipt._piledriverLocked=false;playerEgg._piledriverTarget=null;playerEgg._piledriverPhase=0;}
        playerEgg._bodySlam=false;playerEgg._bodySlamTarget=null;
        playerEgg._tatsuActive=0;playerEgg._tatsuDir=0;
        playerEgg._shoryuReady=false;playerEgg._shoryuSeq=0;playerEgg._shoryuActive=0;
        playerEgg._comboCount=0;playerEgg._comboTimer=0;
        // Cancel dash attacks
        if(playerEgg._hondaDash>0){playerEgg._hondaDash=0;playerEgg.mesh.scale.set(1,1,1);playerEgg.mesh.rotation.x=0;
            var _cdB=playerEgg.mesh.userData.body;if(_cdB)_cdB.rotation.x=0;
            playerEgg._dashDirX=undefined;playerEgg._dashDirZ=undefined;playerEgg._dashFaceY=undefined;playerEgg._blankaRoll=false;}
        playerEgg._blankaShock=0;
        if(playerEgg._elecParticles)for(var _epc=0;_epc<playerEgg._elecParticles.length;_epc++)playerEgg._elecParticles[_epc].visible=false;
        playerEgg._blankaSpinTimer=0;playerEgg._blankaSpinDirX=undefined;playerEgg._blankaSpinDirZ=undefined;playerEgg._blankaSpinFalling=false;
        playerEgg._guileSomersault=0;playerEgg._guileSomFwdX=undefined;playerEgg._guileSomFwdZ=undefined;playerEgg._guileArcLaunched=false;
        // Don't hide blade arc — let it continue flying independently
        if(window._guileArc&&window._guileArc.visible){
            window._guileArcFly={faceY:playerEgg._guileArcFaceY||0,life:40};
        }
        playerEgg._hyakuretsuTimer=0;
        playerEgg._hyakuretsuKickTimer=0;
        playerEgg._yogaFlame=0;
        // Hide attack limbs
        var _iud=playerEgg.mesh.userData;
        if(_iud.rightArm)_iud.rightArm.visible=false;
        if(_iud.leftArm)_iud.leftArm.visible=false;
        if(_iud.rightLeg)_iud.rightLeg.visible=false;
        if(_iud.leftLeg)_iud.leftLeg.visible=false;
        playerEgg._atkAnim=0;
        // Reset Chun-Li flip if interrupted
        if(playerEgg.mesh.scale.y<0){playerEgg.mesh.scale.y=1;playerEgg.squash=1;}
        if(playerEgg.throwTimer>0)return;
    }
    // Hitstun flinch — can't act but no stun stars; also cancel special moves
    if(playerEgg._hitStun>0){
        playerEgg._hitStun--;playerEgg.vx*=0.85;playerEgg.vz*=0.85;
        playerEgg._tatsuActive=0;playerEgg._comboCount=0;
        return;
    }
    if(playerEgg._stunTimer>0){
        // Mash directions to escape stun faster
        if(keys['KeyA']||keys['KeyD']||keys['KeyW']||keys['KeyS']||keys['ArrowLeft']||keys['ArrowRight']||keys['ArrowUp']||keys['ArrowDown']||joyActive){
            playerEgg._stunTimer-=2; // mashing doubles escape speed
        }
        playerEgg._stunTimer--;playerEgg.vx*=0.9;playerEgg.vz*=0.9;
        // Show stun progress bar
        if(!playerEgg._stunMax)playerEgg._stunMax=playerEgg._stunTimer+1;
        var _stunPct=Math.max(0,playerEgg._stunTimer/playerEgg._stunMax);
        ensureStruggleBar();
        struggleBarDiv.style.display='block';
        var _sfill=document.getElementById('struggle-fill');
        if(_sfill)_sfill.style.width=(_stunPct*100)+'%';
        var _stext=document.getElementById('struggle-text');
        if(_stext)_stext.textContent=L('struggle');
        // Cancel spin dash on stun
        if(_spinDashing){_spinDashing=false;_spinDashTimer=0;_spinDashSpeed=0;if(_spinDashBar)_spinDashBar.visible=false;}
        if(playerEgg._stunTimer<=0){playerEgg._stunMax=0;struggleBarDiv.style.display='none';}
        return;}
    // Player electrocuted — can't move
    if(playerEgg._electrocuted>0||playerEgg._elecFlying>0){
        playerEgg.vx=0;playerEgg.vz=0;
        if(playerEgg._electrocuted>0)playerEgg.vy=0;
        return;
    }
    // ---- TPS Input State (clean state machine) ----
    // Raw input
    var _rawMX=0,_rawMZ=0;
    if(keys['KeyA']||keys['ArrowLeft'])_rawMX-=1;
    if(keys['KeyD']||keys['ArrowRight'])_rawMX+=1;
    if(keys['KeyW']||keys['ArrowUp'])_rawMZ-=1;
    if(keys['KeyS']||keys['ArrowDown'])_rawMZ+=1;
    if(joyActive){_rawMX+=joyVec.x;_rawMZ+=joyVec.y;}

    var mx=_rawMX,mz=_rawMZ;
    // TPS state: idle / forward / backward
    window._tpsMoveState='idle'; // default

    if(_tpsCamMode&&(_rawMX||_rawMZ)){
        // Transform raw input to camera-relative world coordinates
        var _tcos=Math.cos(_tpsCamYaw),_tsin=Math.sin(_tpsCamYaw);
        mx=_rawMX*_tcos+_rawMZ*_tsin;
        mz=-_rawMX*_tsin+_rawMZ*_tcos;

        // Determine move state from raw (untransformed) input
        var _hasBack=_rawMZ>0.3;
        var _hasFwd=_rawMZ<-0.3;
        var _hasSide=Math.abs(_rawMX)>0.3;

        if(_hasBack&&!_hasFwd&&!_hasSide){
            // Pure backward: slow retreat, no turn
            mx*=0.4;mz*=0.4;
            window._tpsMoveState='backward';
        } else {
            window._tpsMoveState='forward';
        }
    }
    // Sprint: hold F — gradual speed ramp (only when not holding something)
    var _holdAnything=playerEgg.holding||playerEgg.holdingProp||playerEgg.holdingObs;
    var holdingF=keys['KeyF']&&!_portalConfirmOpen&&!_holdAnything;
    var sprintPct=_updateSprintBar(holdingF);
    var _powerBoost=(playerEgg._speedBoost>0)?2:1;
    var accelMul=(1+sprintPct*1.0)*_powerBoost;
    var speedMul=(1+sprintPct*1.0)*_powerBoost;
    const _moveNorm=DANBO_WASM.norm2D(mx,mz,0.1);
    const len=_moveNorm[2];
    if(_moveNorm[3]){
        mx=_moveNorm[0];mz=_moveNorm[1];
        // Stop movement during attack animation (punch/kick)
        if(!playerEgg._atkAnim){
            playerEgg.vx+=mx*MOVE_ACCEL*accelMul;playerEgg.vz+=mz*MOVE_ACCEL*accelMul;
        }
    }
    if(playerEgg._dashBounceTimer>0)playerEgg._dashBounceTimer--;
    // Snow footstep effect — bigger puffs
    if(currentCityStyle===7&&len>0.1&&playerEgg.onGround){
        if(!playerEgg._snowStepTick)playerEgg._snowStepTick=0;
        playerEgg._snowStepTick++;
        if(playerEgg._snowStepTick%3===0){
            for(var _sfi=0;_sfi<3;_sfi++){
                var _sfSize=0.2+Math.random()*0.2;
                var _sfMesh=new THREE.Mesh(new THREE.SphereGeometry(_sfSize,4,3),new THREE.MeshBasicMaterial({color:0xFFFFFF,transparent:true,opacity:0.7,depthTest:false}));
                _sfMesh.position.set(playerEgg.mesh.position.x+(Math.random()-0.5)*0.6,playerEgg.mesh.position.y+0.15,playerEgg.mesh.position.z+(Math.random()-0.5)*0.6);
                scene.add(_sfMesh);
                var _sfa=Math.random()*Math.PI*2;
                _chargeParticles.push({mesh:_sfMesh,vx:Math.cos(_sfa)*0.03,vy:0.02+Math.random()*0.02,vz:Math.sin(_sfa)*0.03,life:20+Math.random()*15,maxLife:35,type:'dust'});
            }
        }
    } else {playerEgg._snowStepTick=0;}
    // Sprint smoke + ground dust
    if(sprintPct>0.15&&playerEgg.onGround&&len>0.1){
        if(!playerEgg._sprintSmokeTick)playerEgg._sprintSmokeTick=0;
        playerEgg._sprintSmokeTick++;
        if(playerEgg._sprintSmokeTick%3===0)_spawnButtSmoke(playerEgg,sprintPct*0.6);
        if(playerEgg._sprintSmokeTick%5===0)_spawnGroundDust(playerEgg.mesh.position.x,playerEgg.mesh.position.y,playerEgg.mesh.position.z,sprintPct*0.3);
    } else { playerEgg._sprintSmokeTick=0; }
    // ---- Sonic spin dash ----
    if(_spinDashing){
        _spinDashTimer--;
        if(_spinDashTimer<=0){_spinDashing=false;_spinDashSpeed=0;if(_spinDashBar)_spinDashBar.visible=false;playerEgg.squash=1.0;var _sdB2=playerEgg.mesh.userData.body;if(_sdB2){_sdB2.scale.set(1,1,1);_sdB2.rotation.x=0;}}
        else{
            // Steering during spin dash — WASD/joystick can curve the direction
            var sdSteerX=0, sdSteerZ=0;
            if(keys['KeyA']||keys['ArrowLeft'])sdSteerX-=1;
            if(keys['KeyD']||keys['ArrowRight'])sdSteerX+=1;
            if(keys['KeyW']||keys['ArrowUp'])sdSteerZ-=1;
            if(keys['KeyS']||keys['ArrowDown'])sdSteerZ+=1;
            if(joyActive){sdSteerX+=joyVec.x;sdSteerZ+=joyVec.y;}
            var _sdNorm=DANBO_WASM.norm2D(sdSteerX,sdSteerZ,0.1);
            if(_sdNorm[3]){
                sdSteerX=_sdNorm[0];sdSteerZ=_sdNorm[1];
                // Blend steering into dash direction (turn rate)
                var turnRate=0.06;
                playerEgg._dashDirX+=(sdSteerX-playerEgg._dashDirX)*turnRate;
                playerEgg._dashDirZ+=(sdSteerZ-playerEgg._dashDirZ)*turnRate;
                var _dashNorm=DANBO_WASM.norm2D(playerEgg._dashDirX,playerEgg._dashDirZ,0.000001);
                playerEgg._dashDirX=_dashNorm[3]?_dashNorm[0]:playerEgg._dashDirX;
                playerEgg._dashDirZ=_dashNorm[3]?_dashNorm[1]:playerEgg._dashDirZ;
            }
            // Apply dash velocity
            playerEgg.vx=playerEgg._dashDirX*_spinDashSpeed;
            playerEgg.vz=playerEgg._dashDirZ*_spinDashSpeed;
            // No speed decay — constant speed until bar depletes
            // Show spin dash progress bar
            var sdBarPct=_spinDashTimer/_spinDashTimerMax;
            if(!_spinDashBar){_spinDashBar=_createSpinDashBar();scene.add(_spinDashBar);}
            _spinDashBar.visible=true;
            _spinDashBar.position.set(playerEgg.mesh.position.x,playerEgg.mesh.position.y+2.8,playerEgg.mesh.position.z);
            _drawSpinDashBar(_spinDashBar,sdBarPct);
            // Sonic ball roll — squash into ball shape, spin along movement direction
            playerEgg.squash=0.65; // compress into ball
            var _sdBody=playerEgg.mesh.userData.body;
            if(_sdBody){_sdBody.scale.set(1.2,0.7,1.2);_sdBody.rotation.x+=0.8;}
            playerEgg.mesh.rotation.y=Math.atan2(playerEgg._dashDirX,playerEgg._dashDirZ);
            // Keep egg on ground during spin dash
            if(playerEgg.mesh.position.y<0.6)playerEgg.mesh.position.y=0.6;
            playerEgg.vy=0;playerEgg.onGround=true;
            // Spawn ground dust while dashing
            if(_spinDashTimer%2===0)_spawnGroundDust(playerEgg.mesh.position.x,playerEgg.mesh.position.y,playerEgg.mesh.position.z,0.4);
            // Hit NPCs while spin dashing — knock them away
            for(var sdi=0;sdi<allEggs.length;sdi++){
                var sde=allEggs[sdi];
                if(sde===playerEgg||!sde.alive||sde.heldBy)continue;
                var sddx=sde.mesh.position.x-playerEgg.mesh.position.x;
                var sddz=sde.mesh.position.z-playerEgg.mesh.position.z;
                var sddy=sde.mesh.position.y-playerEgg.mesh.position.y;
                var sdd=DANBO_WASM.len3D(sddx,sddy,sddz);
                // Only hit NPCs at similar height (within 1.5 units vertically on flat cities)
                if(currentCityStyle!==5&&!DANBO_WASM.absDeltaWithin(sddy,0,1.5))continue;
                if(sdd<2.5&&sdd>0.01){
                    var sdForce=_spinDashSpeed*2;
                    sde.vx+=sddx/sdd*sdForce;sde.vy+=0.2+sdForce*0.3;sde.vz+=sddz/sdd*sdForce;
                    sde.throwTimer=COMBAT.stomp.throwTimer;sde._bounces=COMBAT.stomp.bounces;sde.squash=COMBAT.stomp.squash;
                    _addStunDamage(sde,COMBAT.stomp.stunDmg);
                    playHitSound();
                    _dropNpcStolenCoins(sde);
                }
            }
            // Hit city props while spin dashing — knock them away
            for(var sdpi=0;sdpi<cityProps.length;sdpi++){
                var sdp=cityProps[sdpi];
                if(sdp.grabbed)continue;
                var spdx=sdp.group.position.x-playerEgg.mesh.position.x;
                var spdz=sdp.group.position.z-playerEgg.mesh.position.z;
                var spdy=sdp.group.position.y-playerEgg.mesh.position.y;
                if(currentCityStyle!==5&&!DANBO_WASM.absDeltaWithin(spdy,0,1.5))continue;
                var spdd=DANBO_WASM.len3D(spdx,spdy,spdz);
                if(spdd<3.0&&spdd>0.01){
                    var spForce=_spinDashSpeed*1.5;
                    sdp.throwVx=spdx/spdd*spForce;sdp.throwVy=0.15+spForce*0.2;sdp.throwVz=spdz/spdd*spForce;
                    sdp.throwTimer=30;sdp._bounces=2;
                    playHitSound();
                }
            }
        }
    }
    // Charge jump: release Space within 0.3s = normal jump, hold past 0.3s = charge mode
    var _onGroundOrGrace=playerEgg.onGround;
    if(!playerEgg.onGround&&_jumpCharging){
        if(!playerEgg._chargeGrace)playerEgg._chargeGrace=0;
        playerEgg._chargeGrace++;
        if(playerEgg._chargeGrace<=8)_onGroundOrGrace=true;
    } else {
        playerEgg._chargeGrace=0;
    }
    if(!playerEgg._spaceHoldFrames)playerEgg._spaceHoldFrames=0;
    var _chargeDelay=18; // 0.3s at 60fps
    if(keys['Space']&&_onGroundOrGrace){
        // Charge jump works while holding (needed for body slam combo)
        playerEgg._spaceHoldFrames++;
        // After 0.3s hold, enter charge mode (no instant jump)
        if(playerEgg._spaceHoldFrames>=_chargeDelay&&!_jumpCharging){
            _jumpCharging=true;_jumpCharge=0;_chargeBeepTimer=0;_chargeHoldTimer=0;
        }
        if(_jumpCharging){
            if(_jumpCharge<_jumpChargeMax){
                _jumpCharge=Math.min(_jumpCharge+1,_jumpChargeMax);
                var pct=_jumpCharge/_jumpChargeMax;
                var beepInterval=Math.max(3,Math.floor(15-pct*12));
                _chargeBeepTimer++;
                if(_chargeBeepTimer>=beepInterval){_chargeBeepTimer=0;_playChargeBeep(pct);}
                if(_jumpCharge%4===0)_spawnButtSmoke(playerEgg,pct);
            } else {
                _chargeHoldTimer++;
                _chargeBeepTimer++;
                if(_chargeBeepTimer>=3){_chargeBeepTimer=0;_playChargeBeep(0.8+0.2*Math.random());}
                if(_chargeHoldTimer%3===0)_spawnButtSmoke(playerEgg,1.0);
                if(_chargeHoldTimer>=_chargeHoldMax){
                    _jumpCharge=0;_jumpCharging=false;_chargeHoldTimer=0;
                }
            }
        }
    }
    if(!keys['Space']||!_onGroundOrGrace){
        if(_onGroundOrGrace){
            if(_jumpCharging&&_jumpCharge>0){
                // Release from charge mode → charged jump
                var pct2=_jumpCharge/_jumpChargeMax;
                var jumpF=JUMP_FORCE*(1.6+pct2*2.4);
                playerEgg.vy=jumpF;
                playerEgg.squash=0.65-pct2*0.2;
                playJumpSound();
                if(pct2>0.15)_spawnGroundDust(playerEgg.mesh.position.x,playerEgg.mesh.position.y,playerEgg.mesh.position.z,pct2);
                _ascendSmoke=true;_ascendSmokePct=pct2;
            } else if(!_jumpCharging&&playerEgg._spaceHoldFrames>0&&playerEgg._spaceHoldFrames<_chargeDelay){
                // Released before 0.3s → normal tap jump
                playerEgg.vy=JUMP_FORCE*1.5;
                playerEgg.squash=0.65;playJumpSound();
            }
        }
        _jumpCharging=false;_jumpCharge=0;_chargeHoldTimer=0;
        if(!keys['Space']){playerEgg._spaceHoldFrames=0;}
    }
    _updateChargeBar();
    // Ascending butt smoke while rising from charged jump
    if(_ascendSmoke&&playerEgg.vy>0&&!playerEgg.onGround){
        _spawnButtSmoke(playerEgg,_ascendSmokePct*0.7);
    }
    if(_ascendSmoke&&playerEgg.vy<=0&&!playerEgg.onGround){
        _ascendSmoke=false;
    }
    if(!_spinDashing){
        var curMax=MAX_SPEED*speedMul;
        var _cap=DANBO_WASM.clampVel2D(playerEgg.vx,playerEgg.vz,curMax);
        if(_cap[3]&&!playerEgg._hondaDash){playerEgg.vx=_cap[0];playerEgg.vz=_cap[1];}
    }
    // Grab / Throw (F key)
    if(playerEgg.grabCD>0) playerEgg.grabCD--;
    if(!playerEgg._fHoldFrames)playerEgg._fHoldFrames=0;
    if(!playerEgg._throwCharging)playerEgg._throwCharging=false;
    var _throwChargeDelay=18; // 0.3s at 60fps
    var _throwChargeMax=60; // 1 second max charge
    var _holdingSomething=playerEgg.holding||playerEgg.holdingProp||playerEgg.holdingObs;
    // Normal state check — block all new moves during any special move
    var _inSpecialMove=!!(playerEgg._tatsuActive||playerEgg._shoryuActive||playerEgg._piledriverTarget||playerEgg._bodySlam||_spinDashing||playerEgg._blankaSpinTimer||playerEgg._blankaSpinFalling||playerEgg._guileSomersault||playerEgg._yogaFlame);
    // Track F press (blocked during special moves)
    if(keys['KeyF']&&!playerEgg._fWasDown&&playerEgg.grabCD<=0&&!_inSpecialMove){
        // ---- Body Slam (Kirby): holding NPC + in air + holding down + press F ----
        if(playerEgg.holding&&!playerEgg.onGround&&(keys['KeyS']||keys['ArrowDown'])){
            var _bsHeld=playerEgg.holding;
            _bsHeld.heldBy=null;playerEgg.holding=null;
            if(_bsHeld.struggleBar){_bsHeld.mesh.remove(_bsHeld.struggleBar);_bsHeld.struggleBar=null;}
            // Slam down fast
            playerEgg.vy=-0.6;playerEgg.vx*=0.1;playerEgg.vz*=0.1;
            playerEgg._bodySlam=true;playerEgg._bodySlamTarget=_bsHeld;
            playerEgg._bodySlamStartY=playerEgg.mesh.position.y; // track height for damage
            // Place held NPC below player
            _bsHeld.mesh.position.set(playerEgg.mesh.position.x,playerEgg.mesh.position.y-1.5,playerEgg.mesh.position.z);
            _bsHeld.vy=-0.6;_bsHeld.vx=0;_bsHeld.vz=0;
            playerEgg.grabCD=30;
            playThrowSound();
            playerEgg._fPressStart=false;playerEgg._fHoldFrames=0;playerEgg._fWasDown=true;
        }
        // ---- Piledriver (Zangief): left-right-left-F ----
        else if(playerEgg._piledriverReady&&playerEgg.onGround&&!playerEgg.holding&&!playerEgg.holdingProp&&!playerEgg.holdingObs){
            var _pdTarget=null;
            var _pdDist=STUN_CONFIG.piledriverRange;
            for(var _pdi=0;_pdi<allEggs.length;_pdi++){
                var _pde=allEggs[_pdi];if(_pde===playerEgg||!_pde.alive||_pde.heldBy||_pde.holding||_pde._piledriverLocked)continue;
                var _pddx=_pde.mesh.position.x-playerEgg.mesh.position.x;
                var _pddz=_pde.mesh.position.z-playerEgg.mesh.position.z;
                var _pdd=DANBO_WASM.len2D(_pddx,_pddz);
                if(_pdd<_pdDist){_pdDist=_pdd;_pdTarget=_pde;}
            }
            if(_pdTarget){
                playerEgg._piledriverTarget=_pdTarget;
                playerEgg._piledriverPhase=0;
                _pdTarget._piledriverLocked=true;
                playerEgg.grabCD=40;
                playGrabSound();
                playerEgg._fPressStart=false;playerEgg._fHoldFrames=0;playerEgg._fWasDown=true;
                playerEgg._piledriverReady=false;
            } else {
                playerEgg._fPressStart=true;playerEgg._fHoldFrames=0;
                playerEgg._throwCharging=false;playerEgg._throwCharge=0;playerEgg._justGrabbed=false;
            }
        }
        else {
        playerEgg._fPressStart=true;
        playerEgg._fHoldFrames=0;
        playerEgg._throwCharging=false;
        playerEgg._throwCharge=0;
        playerEgg._justGrabbed=false;
        }
    }
    // Count hold frames while F is down (skip during special moves)
    if(keys['KeyF']&&!playerEgg._piledriverTarget&&!_inSpecialMove){
        playerEgg._fHoldFrames++;
        // Charge throw: holding something + held past 0.3s
        if(_holdingSomething&&playerEgg._fHoldFrames>=_throwChargeDelay){
            playerEgg._throwCharging=true;
            playerEgg._throwCharge=Math.min((playerEgg._throwCharge||0)+1,_throwChargeMax);
        }
    }
    // F released (skip during special moves)
    if(!keys['KeyF']&&playerEgg._fWasDown&&!playerEgg._piledriverTarget&&!_inSpecialMove){
        if(playerEgg._throwCharging&&_holdingSomething&&!playerEgg._justGrabbed){
            // Charge throw release → power throw
            var dir=playerEgg.mesh.rotation.y;
            var chargePct=(playerEgg._throwCharge||0)/_throwChargeMax;
            var throwMul=1+chargePct*4;
            if(playerEgg.holding){
                var held=playerEgg.holding;
                held.heldBy=null; playerEgg.holding=null; if(held.struggleBar){held.mesh.remove(held.struggleBar);held.struggleBar=null;}
                held.mesh.position.set(playerEgg.mesh.position.x+Math.sin(dir)*2, playerEgg.mesh.position.y+0.5, playerEgg.mesh.position.z+Math.cos(dir)*2);
                var tw=held.weight||1.0;var tf=0.5/tw*throwMul;held.vx=Math.sin(dir)*tf;held.vy=0.05+chargePct*0.25;held.vz=Math.cos(dir)*tf;held._throwTotal=80+Math.floor(chargePct*100);held.throwTimer=held._throwTotal;held._bounces=2+Math.floor(chargePct*2);held._chargeDrag=0.985+chargePct*0.01;
                held.squash=0.5; playerEgg.grabCD=20;
                playThrowSound();
                held._dropCoinsOnLand=true;held._coinsDropped=false;
            } else if(playerEgg.holdingProp){
                var prop=playerEgg.holdingProp;
                playerEgg.holdingProp=null;
                var pw=prop.weight||1.0;var pf=2.5/pw*throwMul;prop.throwVx=Math.sin(dir)*pf;prop.throwVy=0.18+chargePct*0.25;prop.throwVz=Math.cos(dir)*pf;prop._bounces=2+Math.floor(chargePct*2);prop.throwTimer=25+Math.floor(chargePct*60);prop._chargeDrag=0.98-chargePct*0.02;
                prop.group.position.set(playerEgg.mesh.position.x+Math.sin(dir)*1.5, playerEgg.mesh.position.y+0.5, playerEgg.mesh.position.z+Math.cos(dir)*1.5);
                playerEgg.grabCD=20; playThrowSound();
            } else if(playerEgg.holdingObs){
                var obs=playerEgg.holdingObs;
                playerEgg.holdingObs=null;
                obs._grabbed=false;
                obs.mesh.position.set(playerEgg.mesh.position.x+Math.sin(dir)*1.5, playerEgg.mesh.position.y+0.5, playerEgg.mesh.position.z+Math.cos(dir)*1.5);
                var ow=obs._weight||2.0;var of2=4.5/ow*throwMul;obs._throwVx=Math.sin(dir)*of2;obs._throwVy=0.18+chargePct*0.25;obs._throwVz=Math.cos(dir)*of2;obs._throwTimer=Math.floor((50+20/ow)*(1+chargePct*1.5));obs._bounces=2+Math.floor(chargePct*2);obs._chargeDrag=0.98-chargePct*0.02;
                playerEgg.grabCD=20; playThrowSound();
            }
        } else if(_holdingSomething&&!playerEgg._justGrabbed&&playerEgg._fHoldFrames<_throwChargeDelay&&playerEgg._fHoldFrames>0){
            // Quick tap F while holding → normal throw (separate press from grab)
            if(playerEgg.holdingProp){
                var prop=playerEgg.holdingProp;
                playerEgg.holdingProp=null;
                var dir1=playerEgg.mesh.rotation.y;
                var pw=prop.weight||1.0;var pf=2.5/pw;prop.throwVx=Math.sin(dir1)*pf;prop.throwVy=0.18;prop.throwVz=Math.cos(dir1)*pf;prop._bounces=2;prop.throwTimer=25;prop._chargeDrag=0;
                prop.group.position.set(playerEgg.mesh.position.x+Math.sin(dir1)*1.5, playerEgg.mesh.position.y+0.5, playerEgg.mesh.position.z+Math.cos(dir1)*1.5);
                playerEgg.grabCD=20; playThrowSound();
            } else if(playerEgg.holdingObs){
                var obs=playerEgg.holdingObs;
                playerEgg.holdingObs=null;
                obs._grabbed=false;
                var dir0=playerEgg.mesh.rotation.y;
                obs.mesh.position.set(playerEgg.mesh.position.x+Math.sin(dir0)*1.5, playerEgg.mesh.position.y+0.5, playerEgg.mesh.position.z+Math.cos(dir0)*1.5);
                var ow=obs._weight||2.0;var of2=4.5/ow;obs._throwVx=Math.sin(dir0)*of2;obs._throwVy=0.18;obs._throwVz=Math.cos(dir0)*of2;obs._throwTimer=Math.floor(50+20/ow);obs._bounces=2;
                playerEgg.grabCD=20; playThrowSound();
            } else if(playerEgg.holding){
                var held2=playerEgg.holding;
                held2.heldBy=null; playerEgg.holding=null; if(held2.struggleBar){held2.mesh.remove(held2.struggleBar);held2.struggleBar=null;}
                var dir2=playerEgg.mesh.rotation.y;
                held2.mesh.position.set(playerEgg.mesh.position.x+Math.sin(dir2)*2, playerEgg.mesh.position.y+0.5, playerEgg.mesh.position.z+Math.cos(dir2)*2);
                var tw2=held2.weight||1.0;var tf2=0.4/tw2;held2.vx=Math.sin(dir2)*tf2;held2.vy=0.15;held2.vz=Math.cos(dir2)*tf2;held2._throwTotal=80;held2.throwTimer=80;held2._bounces=2;held2._chargeDrag=0.992;
                held2.squash=0.5; playerEgg.grabCD=20;
                playThrowSound();
                held2._dropCoinsOnLand=true;held2._coinsDropped=false;
            }
        }
        playerEgg._throwCharging=false;playerEgg._throwCharge=0;playerEgg._fHoldFrames=0;playerEgg._fPressStart=false;
    }
    // Grab on first press (only when not holding anything)
    if(playerEgg._fPressStart&&!_holdingSomething&&playerEgg.grabCD<=0){
        playerEgg._fPressStart=false;
        var nearest=null, nearDist=STUN_CONFIG.grabRange;
        for(var ei=0;ei<allEggs.length;ei++){
            var e=allEggs[ei];
            if(e===playerEgg||!e.alive||e.heldBy||e.holding)continue;
            var dx2=e.mesh.position.x-playerEgg.mesh.position.x;
            var dz2=e.mesh.position.z-playerEgg.mesh.position.z;
            var d2=DANBO_WASM.len2D(dx2,dz2);
            if(d2<nearDist){nearDist=d2;nearest=e;}
        }
        if(nearest){
            playerEgg.holding=nearest; nearest.heldBy=playerEgg;
            // Drop any prop the grabbed NPC was holding
            if(nearest.holdingProp){nearest.holdingProp.grabbed=false;nearest.holdingProp=null;}
            nearest.struggleMax=300+Math.floor(Math.random()*240); nearest.struggleTimer=nearest.struggleMax;
            playerEgg.grabCD=20; playGrabSound();
            playerEgg._justGrabbed=true;
        } else {
            var nearObs=null, nearObsDist=3.0;
            for(var oi=0;oi<_danboRaceObstacles().length;oi++){
                var ob=_danboRaceObstacles()[oi];
                if(ob._grabbed)continue;
                if(ob.type==='spinner'||ob.type==='pendulum'||ob.type==='conveyor'||ob.type==='platform')continue;
                var ox=ob.mesh.position.x-playerEgg.mesh.position.x;
                var oz=ob.mesh.position.z-playerEgg.mesh.position.z;
                var od=DANBO_WASM.len2D(ox,oz);
                if(od<nearObsDist){nearObsDist=od;nearObs=ob;}
            }
            if(nearObs){
                playerEgg.holdingObs=nearObs;
                nearObs._grabbed=true;nearObs._weight=(nearObs.type==='bumper'?1.5:nearObs.type==='fallingBlock'?2.5:2.0);
                nearObs._origPos={x:nearObs.mesh.position.x,y:nearObs.mesh.position.y,z:nearObs.mesh.position.z};
                nearObs._throwTimer=0;nearObs._throwVx=0;nearObs._throwVy=0;nearObs._throwVz=0;
                nearObs.mesh.rotation.set(0,0,0);
                playerEgg.grabCD=20; playGrabSound();
                playerEgg._justGrabbed=true;
            } else if(gameState==='city'){
                var nearProp=null, nearPropDist=3.0;
                for(var cpi=0;cpi<cityProps.length;cpi++){
                        var cpp=cityProps[cpi];
                        if(cpp.grabbed)continue;
                        var cpx=cpp.group.position.x-playerEgg.mesh.position.x;
                        var cpz=cpp.group.position.z-playerEgg.mesh.position.z;
                        var cpd=DANBO_WASM.len2D(cpx,cpz);
                        if(cpd<nearPropDist){nearPropDist=cpd;nearProp=cpp;}
                    }
                    if(nearProp){
                        playerEgg.holdingProp=nearProp;
                        nearProp.grabbed=true;
                        nearProp.throwTimer=0;nearProp.throwVx=0;nearProp.throwVy=0;nearProp.throwVz=0;
                        nearProp.group.rotation.set(0,0,0);
                        playerEgg.grabCD=20; playGrabSound();
                        playerEgg._justGrabbed=true;
                    }
            }
        }
    }
    // Show charge throw bar while charging
    if(playerEgg._throwCharging&&_holdingSomething){
        var chPct=(playerEgg._throwCharge||0)/60;
        if(chPct>0.01){
            if(!playerEgg._throwChargeBar){
                var tc=document.createElement('canvas');tc.width=128;tc.height=16;
                var ttex=new THREE.CanvasTexture(tc);
                playerEgg._throwChargeBar=new THREE.Sprite(new THREE.SpriteMaterial({map:ttex,transparent:true}));
                playerEgg._throwChargeBar.scale.set(2,0.3,1);
                scene.add(playerEgg._throwChargeBar);
            }
            playerEgg._throwChargeBar.visible=true;
            playerEgg._throwChargeBar.position.set(playerEgg.mesh.position.x,playerEgg.mesh.position.y+3.2,playerEgg.mesh.position.z);
            var tctx=playerEgg._throwChargeBar.material.map.image.getContext('2d');
            tctx.clearRect(0,0,128,16);
            tctx.fillStyle='rgba(0,0,0,0.5)';tctx.fillRect(0,0,128,16);
            var grd=tctx.createLinearGradient(0,0,128*chPct,0);
            grd.addColorStop(0,'#FF4444');grd.addColorStop(1,'#FFAA00');
            tctx.fillStyle=grd;tctx.fillRect(2,2,124*chPct,12);
            playerEgg._throwChargeBar.material.map.needsUpdate=true;
        }
    } else {
        if(playerEgg._throwChargeBar){playerEgg._throwChargeBar.visible=false;}
    }
    // ---- Punch (R) / Kick (T) — Kunio-kun style with visible limbs ----
    // Block all combat input during any special move
    if(_inSpecialMove){
        playerEgg._rWasDown=!!keys['KeyR'];
        playerEgg._tWasDown=!!keys['KeyT'];
    } else {
    // Light hits = hitstun flinch (NO stun stars), combo finisher/aerial = knockdown fly
    if(!playerEgg._comboCount)playerEgg._comboCount=0;
    if(!playerEgg._comboTimer)playerEgg._comboTimer=0;
    if(!playerEgg._attackCD)playerEgg._attackCD=0;
    if(playerEgg._attackCD>0)playerEgg._attackCD--;
    if(playerEgg._comboTimer>0)playerEgg._comboTimer--;
    if(playerEgg._comboTimer<=0)playerEgg._comboCount=0;
    // Attack limb animation timer
    if(!playerEgg._atkAnim)playerEgg._atkAnim=0;
    if(playerEgg._atkAnim>0&&!playerEgg._shoryuActive&&!playerEgg._tatsuActive&&!playerEgg._hondaDash&&!playerEgg._blankaSpinTimer){
        playerEgg._atkAnim--;
        if(playerEgg._atkAnim<=0){
            var _ud=playerEgg.mesh.userData;
            if(_ud.rightArm){_ud.rightArm.visible=false;_ud.rightArm.scale.set(1,1,1);_ud.rightArm.position.set(0.4,0.2,0.7);}
            if(_ud.leftArm){_ud.leftArm.visible=false;_ud.leftArm.scale.set(1,1,1);_ud.leftArm.position.set(-0.4,0.2,0.7);}
            if(_ud.rightLeg){_ud.rightLeg.visible=false;_ud.rightLeg.scale.set(1,1,1);_ud.rightLeg.position.set(0.22,0.1,0.5);_ud.rightLeg.rotation.x=-Math.PI/3;}
            if(_ud.leftLeg){_ud.leftLeg.visible=false;_ud.leftLeg.scale.set(1,1,1);_ud.leftLeg.position.set(-0.22,0.1,0.5);_ud.leftLeg.rotation.x=-Math.PI/3;}
            // body.rotation.x managed by physics.js
        }
    }
    // Zangief Double Lariat — R+T held together (checked before normal R press)
    var _ct=playerEgg.mesh.userData._charType||'egg';
    if(playerEgg._lariatReady&&playerEgg._attackCD<=0&&!playerEgg.holding&&!playerEgg._tatsuActive){
        playerEgg._comboCount=0;playerEgg._attackCD=40;playerEgg._lariatReady=false;
        MoveSpin_execute(playerEgg,playerEgg.mesh.rotation.y,{duration:MOVE_PARAMS.bear.lariat.duration,isLariat:true});
        playerEgg._atkAnim=62;playerEgg.squash=0.9;
        // Show both arms extended at eye level
        var _lud=playerEgg.mesh.userData;
        if(_lud.rightArm){_lud.rightArm.visible=true;_lud.rightArm.position.set(0.6,0.88,0);_lud.rightArm.scale.set(1.5,1.5,1.5);}
        if(_lud.leftArm){_lud.leftArm.visible=true;_lud.leftArm.position.set(-0.6,0.88,0);_lud.leftArm.scale.set(1.5,1.5,1.5);}
        _shoutMove(playerEgg,'Double Lariat!');
    }
    // Punch (R) — character-specific special moves on command input
    if(keys['KeyR']&&!playerEgg._rWasDown&&playerEgg._attackCD<=0&&!playerEgg.holding){
        var _isHadou=playerEgg._hadouReady&&!window._playerHadouken;
        var _alwaysR=_findMove(_ct,'alwaysR');
        var _ffR=_findMove(_ct,'ffR');
        var _bfR=_findMove(_ct,'bfR');
        // ---- Always-on punch special (Honda hyakuretsu, Blanka electric) ----
        if(_alwaysR&&_alwaysR.type==='hyakuretsu'&&!playerEgg._bfReady){
            _shoutMove(playerEgg,_alwaysR.shout);
            playerEgg._comboCount=0;playerEgg._attackCD=_alwaysR.cd||4;
            MoveRapidHit_execute(playerEgg,'punch');
        }
        // ---- BLANKA: always Electric Thunder on punch ----
        else if(_alwaysR&&_alwaysR.type==='electric'&&!playerEgg._bfReady){
            _shoutMove(playerEgg,_alwaysR.shout);
            playerEgg._comboCount=0;playerEgg._attackCD=4;
            MoveElectric_execute(playerEgg,{duration:60});
            if(sfxEnabled){var _beCtx3=ensureAudio();if(_beCtx3){var _bet3=_beCtx3.currentTime;var _beo3=_beCtx3.createOscillator();var _beg3=_beCtx3.createGain();_beo3.type='square';_beo3.frequency.setValueAtTime(800,_bet3);_beo3.frequency.linearRampToValueAtTime(2000,_bet3+0.1);_beg3.gain.setValueAtTime(0.08,_bet3);_beg3.gain.exponentialRampToValueAtTime(0.001,_bet3+0.3);_beo3.connect(_beg3);_beg3.connect(_beCtx3.destination);_beo3.start(_bet3);_beo3.stop(_bet3+0.3);}}
        }
        // ---- RAPID-PRESS SPECIALS FIRST (priority over command inputs) ----
        else if(playerEgg._rapidRReady&&_ct==='bull'){
            playerEgg._comboCount=0;playerEgg._attackCD=1;playerEgg._rapidR=2;
            if(!playerEgg._slapSide)playerEgg._slapSide=0;
            playerEgg._slapSide=(playerEgg._slapSide+1)%3;
            var _slapY=[0.4,0.15,-0.1][playerEgg._slapSide];
            var _sArm=(playerEgg._slapSide%2===0)?playerEgg.mesh.userData.rightArm:playerEgg.mesh.userData.leftArm;
            var _sArmOther=(playerEgg._slapSide%2===0)?playerEgg.mesh.userData.leftArm:playerEgg.mesh.userData.rightArm;
            if(_sArm){_sArm.visible=true;_sArm.position.set((playerEgg._slapSide%2===0)?0.35:-0.35,_slapY,3.0);_sArm.scale.set(1.5,1.5,1.5);}
            if(_sArmOther){_sArmOther.visible=true;_sArmOther.position.set((playerEgg._slapSide%2===0)?-0.2:0.2,_slapY+0.1,1.5);_sArmOther.scale.set(1.2,1.2,1.2);}
            playerEgg._atkAnim=2;
            var _hsDir=playerEgg.mesh.rotation.y;
            playerEgg.vx+=Math.sin(_hsDir)*0.04;playerEgg.vz+=Math.cos(_hsDir)*0.04;
            for(var _hsi=0;_hsi<allEggs.length;_hsi++){
                var _hse=allEggs[_hsi];if(_hse===playerEgg||!_hse.alive||_hse.heldBy)continue;
                var _hsdx=_hse.mesh.position.x-playerEgg.mesh.position.x;
                var _hsdz=_hse.mesh.position.z-playerEgg.mesh.position.z;
                if(DANBO_WASM.len2D(_hsdx,_hsdz)<3.5){_hse.vx+=_hsdx*0.1;_hse.vz+=_hsdz*0.1;_hse._hitStun=6;_dropNpcStolenCoins(_hse);playHitSound();}
            }
            playerEgg.squash=0.88;
        } else if(playerEgg._rapidR>=2&&_ct==='cat'){
            // ELECTRIC THUNDER (Blanka) — infinite while mashing
            _shoutMove(playerEgg,'ELECTRIC!');
            playerEgg._comboCount=0;playerEgg._attackCD=2;playerEgg._rapidR=2;
            MoveElectric_execute(playerEgg,{duration:25});
            if(sfxEnabled){var _beCtx=ensureAudio();if(_beCtx){var _bet=_beCtx.currentTime;var _beo=_beCtx.createOscillator();var _beg=_beCtx.createGain();_beo.type='square';_beo.frequency.setValueAtTime(800,_bet);_beo.frequency.linearRampToValueAtTime(2000,_bet+0.1);_beg.gain.setValueAtTime(0.08,_bet);_beg.gain.exponentialRampToValueAtTime(0.001,_bet+0.3);_beo.connect(_beg);_beg.connect(_beCtx.destination);_beo.start(_bet);_beo.stop(_bet+0.3);}}
        }
        // ---- COMMAND INPUT SPECIALS ----
        else if(_isHadou&&_ffR&&(_ct==='egg'||_ct==='dog')){
            // HADOUKEN (Ryu red, Ken blue)
            _shoutMove(playerEgg,_ct==='dog'?'Hadouken!':'HADOUKEN!');
            playerEgg._comboCount=0;playerEgg._attackCD=MOVE_PARAMS[_ct].hadouken.cd;playerEgg._hadouReady=false;playerEgg._ffSeq=0;playerEgg._ffReady=false;
            var _hDir=playerEgg._moveDir;
            var _hColor=_ct==='egg'?0xFF4444:0x44AAFF;
            var _hRingColor=_ct==='egg'?0xFFAA66:0x88DDFF;
            MoveProjectile_execute(playerEgg,_hDir,{speed:MOVE_PARAMS[_ct].hadouken.speed,life:MOVE_PARAMS[_ct].hadouken.life,color:_hColor,ringColor:_hRingColor,burns:MOVE_PARAMS[_ct].hadouken.burns,isPlayer:true,type:'normal'});
            playerEgg._atkAnim=15;playerEgg.squash=0.8;
            if(sfxEnabled){var _hCtx=ensureAudio();if(_hCtx){var _ht=_hCtx.currentTime;var _ho=_hCtx.createOscillator();var _hg=_hCtx.createGain();_ho.type='sine';_ho.frequency.setValueAtTime(300,_ht);_ho.frequency.exponentialRampToValueAtTime(150,_ht+0.3);_hg.gain.setValueAtTime(0.1,_ht);_hg.gain.exponentialRampToValueAtTime(0.001,_ht+0.35);_ho.connect(_hg);_hg.connect(_hCtx.destination);_ho.start(_ht);_ho.stop(_ht+0.35);}}
        } else if(_isHadou&&_ffR&&_ct==='cockroach'){
            // YOGA FIRE (Dhalsim) — slow fireball, burns on hit
            _shoutMove(playerEgg,'Yoga Fire!');
            playerEgg._comboCount=0;playerEgg._attackCD=MOVE_PARAMS.cockroach.yogaFire.cd;playerEgg._hadouReady=false;playerEgg._ffSeq=0;playerEgg._ffReady=false;
            var _yfDir=playerEgg._moveDir;
            MoveProjectile_execute(playerEgg,_yfDir,{speed:MOVE_PARAMS.cockroach.yogaFire.speed,life:MOVE_PARAMS.cockroach.yogaFire.life,color:MOVE_PARAMS.cockroach.yogaFire.color,ringColor:MOVE_PARAMS.cockroach.yogaFire.ringColor,burns:MOVE_PARAMS.cockroach.yogaFire.burns,isPlayer:true,type:'yogaFire'});
            playerEgg._atkAnim=15;playerEgg.squash=0.8;
        } else if(_isHadou&&_ffR&&(_ct==='rooster')&&!window._playerHadouken){
            // SONIC BOOM (Guile) — yellow crescent texture on a spinning plane
            _shoutMove(playerEgg,'Sonic Boom!');
            playerEgg._comboCount=0;playerEgg._attackCD=MOVE_PARAMS.rooster.sonicBoom.cd;playerEgg._hadouReady=false;playerEgg._ffSeq=0;playerEgg._ffReady=false;
            var _sbDir=playerEgg._moveDir;
            MoveProjectile_execute(playerEgg,_sbDir,{speed:MOVE_PARAMS.rooster.sonicBoom.speed,life:MOVE_PARAMS.rooster.sonicBoom.life,color:MOVE_PARAMS.rooster.sonicBoom.color,ringColor:MOVE_PARAMS.rooster.sonicBoom.ringColor,isPlayer:true,type:'sonicBoom'});
            playerEgg._atkAnim=12;playerEgg.squash=0.85;
            // Sonic boom sound — loud crack
            if(sfxEnabled){var _sbSCtx=ensureAudio();if(_sbSCtx){var _sbt=_sbSCtx.currentTime;
                // Sharp crack
                var _sbb=_sbSCtx.createBuffer(1,Math.floor(_sbSCtx.sampleRate*0.15),_sbSCtx.sampleRate);
                var _sbd=_sbb.getChannelData(0);
                for(var _sbsi=0;_sbsi<_sbd.length;_sbsi++){var _sbp=_sbsi/_sbd.length;_sbd[_sbsi]=(Math.random()-0.5)*0.8*Math.exp(-_sbp*8);}
                var _sbs=_sbSCtx.createBufferSource();_sbs.buffer=_sbb;
                var _sbg2=_sbSCtx.createGain();_sbg2.gain.value=0.25;
                _sbs.connect(_sbg2);_sbg2.connect(_sbSCtx.destination);_sbs.start(_sbt);_sbs.stop(_sbt+0.15);
                // Low boom
                var _sbo=_sbSCtx.createOscillator();var _sbog=_sbSCtx.createGain();
                _sbo.type='sine';_sbo.frequency.setValueAtTime(120,_sbt);_sbo.frequency.exponentialRampToValueAtTime(40,_sbt+0.2);
                _sbog.gain.setValueAtTime(0.2,_sbt);_sbog.gain.exponentialRampToValueAtTime(0.001,_sbt+0.25);
                _sbo.connect(_sbog);_sbog.connect(_sbSCtx.destination);_sbo.start(_sbt);_sbo.stop(_sbt+0.25);
            }}
            playerEgg._atkAnim=12;playerEgg.squash=0.85;
        } else if(playerEgg._bfReady&&_bfR&&_ct==='bull'){
            // SUMO HEADBUTT (E.Honda) — ←→+R, half speed, double duration for same distance
            _shoutMove(playerEgg,'Dosukoi!');
            playerEgg._comboCount=0;playerEgg._attackCD=MOVE_PARAMS.bull.headbutt.cd;playerEgg._bfReady=false;playerEgg._bfSeq=0;
            var _shDir=playerEgg._moveDir;
            MoveDash_execute(playerEgg,_shDir,{isDash:true,speed:MOVE_PARAMS.bull.headbutt.speed,duration:MOVE_PARAMS.bull.headbutt.duration});
            playerEgg._atkAnim=62;
        } else if(playerEgg._bfReady&&_bfR&&_bfR.type==='shoryuken'&&(_ct==='egg'||_ct==='dog')){
            // SHORYUKEN (Ryu/Ken) — ←→+R
            _shoutMove(playerEgg,_ct==='dog'?'Shoryuken!':'SHORYUKEN!');
            playerEgg._comboCount=0;playerEgg._attackCD=30;playerEgg._bfReady=false;playerEgg._bfSeq=0;
            var _shFaceDir=playerEgg.mesh.rotation.y;
            var _shParams=MOVE_PARAMS[_ct].shoryuken;
            MoveUppercut_execute(playerEgg,_shFaceDir,{duration:_shParams.duration,jumpMul:_shParams.jumpMul,fwdSpeed:_shParams.fwdSpeed});
            if(sfxEnabled){var _sCtx=ensureAudio();if(_sCtx){var _st=_sCtx.currentTime;var _so=_sCtx.createOscillator();var _sg=_sCtx.createGain();_so.type='sawtooth';_so.frequency.setValueAtTime(200,_st);_so.frequency.exponentialRampToValueAtTime(1200,_st+0.2);_so.frequency.exponentialRampToValueAtTime(800,_st+0.35);_sg.gain.setValueAtTime(0.12,_st);_sg.gain.exponentialRampToValueAtTime(0.001,_st+0.4);_so.connect(_sg);_sg.connect(_sCtx.destination);_so.start(_st);_so.stop(_st+0.4);}}
            playJumpSound();
        } else if(_isHadou&&_ffR&&_ct==='monkey'&&!window._playerHadouken){
            // 気功拳 (Chun-Li)
            _shoutMove(playerEgg,'Kikouken!');
            playerEgg._comboCount=0;playerEgg._attackCD=MOVE_PARAMS.monkey.kikouken.cd;playerEgg._chargeBack=0;
            var _sbDir2=playerEgg._moveDir;
            MoveProjectile_execute(playerEgg,_sbDir2,{speed:MOVE_PARAMS.monkey.kikouken.speed,life:MOVE_PARAMS.monkey.kikouken.life,color:MOVE_PARAMS.monkey.kikouken.color,ringColor:MOVE_PARAMS.monkey.kikouken.ringColor,isPlayer:true,type:'normal',radius:0.5,npcRadius:0.5});
            playerEgg._atkAnim=12;playerEgg.squash=0.85;
        } else if(playerEgg._bfReady&&_bfR&&(_ct==='cat')){
            // ROLLING ATTACK (Blanka) — ←→+R, forward roll same speed/distance as Honda
            _shoutMove(playerEgg,'GRAAAH!');
            playerEgg._comboCount=0;playerEgg._attackCD=MOVE_PARAMS.cat.roll.cd;playerEgg._bfReady=false;playerEgg._bfSeq=0;
            var _brDir=playerEgg._moveDir;
            MoveDash_execute(playerEgg,_brDir,{isRoll:true,speed:MOVE_PARAMS.cat.roll.speed,duration:MOVE_PARAMS.cat.roll.duration});
        } else if(playerEgg._bfReady&&_bfR&&_ct==='cockroach'){
            // YOGA FLAME (Dhalsim) — ←→+R, short range fire breath
            _shoutMove(playerEgg,'Yoga Flame!');
            playerEgg._comboCount=0;playerEgg._attackCD=40;playerEgg._bfReady=false;playerEgg._bfSeq=0;
            MoveYogaFlame_execute(playerEgg,playerEgg._moveDir,MOVE_PARAMS.cockroach.yogaFlame);
            // Fire breath sound
            if(sfxEnabled){var _yfCtx=ensureAudio();if(_yfCtx){var _yft=_yfCtx.currentTime;
                var _yfo=_yfCtx.createOscillator();var _yfn=_yfCtx.createBufferSource();
                var _yfg=_yfCtx.createGain();_yfo.type='sawtooth';
                _yfo.frequency.setValueAtTime(100,_yft);_yfo.frequency.linearRampToValueAtTime(300,_yft+0.2);_yfo.frequency.linearRampToValueAtTime(80,_yft+0.8);
                _yfg.gain.setValueAtTime(0.1,_yft);_yfg.gain.linearRampToValueAtTime(0.15,_yft+0.2);_yfg.gain.exponentialRampToValueAtTime(0.001,_yft+0.9);
                _yfo.connect(_yfg);_yfg.connect(_yfCtx.destination);_yfo.start(_yft);_yfo.stop(_yft+0.9);
            }}
        } else {
        // Normal punch combo
        playerEgg._comboCount++;playerEgg._comboTimer=(_ct==='cockroach')?MOVE_PARAMS.cockroach.comboTimerPunch:25;playerEgg._attackCD=(_ct==='cockroach')?MOVE_PARAMS.cockroach.punchCD:8;
        var _punchArm=(playerEgg._comboCount%2===1)?playerEgg.mesh.userData.rightArm:playerEgg.mesh.userData.leftArm;
        var _pArmZ=(_ct==='cockroach')?3.0:0.9;
        var _pArmS=(_ct==='cockroach')?new THREE.Vector3(1.0,1.0,4.0):new THREE.Vector3(1.3,1.3,1.3);
        if(_punchArm){_punchArm.visible=true;_punchArm.position.set(_punchArm===playerEgg.mesh.userData.rightArm?0.3:-0.3,0.2,_pArmZ);_punchArm.scale.copy(_pArmS);}
        playerEgg._atkAnim=(_ct==='cockroach')?MOVE_PARAMS.cockroach.punchAnim:8;
        var _atkDir=playerEgg.mesh.rotation.y;
        var _isFinisher=(playerEgg._comboCount>=3)&&_ct!=='bull'&&_ct!=='cat'; // Honda/Blanka skip finisher (use rapid-press instead)
        var _isAerial=!playerEgg.onGround;
        // Finisher visual: show both arms or headbutt
        if(_isFinisher){
            var _finType=(_ct==='cockroach')?0:Math.floor(Math.random()*3); // Dhalsim always big punch
            var _fud=playerEgg.mesh.userData;
            var _finZ=(_ct==='cockroach')?3.0:0.9;
            var _finSx=(_ct==='cockroach')?1.0:1.5;
            var _finSz=(_ct==='cockroach')?4.0:2;
            if(_finType===0){
                // Big punch — both arms forward
                if(_fud.rightArm){_fud.rightArm.visible=true;_fud.rightArm.position.set(0.2,0.85,_finZ);_fud.rightArm.scale.set(_finSx,1.2,_finSz);}
                if(_fud.leftArm){_fud.leftArm.visible=true;_fud.leftArm.position.set(-0.2,0.85,_finZ);_fud.leftArm.scale.set(_finSx,1.2,_finSz);}
            } else if(_finType===1){
                // Headbutt — body lunge forward
                if(_fud.body)_fud.body.rotation.x=-0.5;
            }
            // Tail whip: just extra squash
            playerEgg._atkAnim=14;
        }
        for(var _ai=0;_ai<allEggs.length;_ai++){
            var _ae=allEggs[_ai];if(_ae===playerEgg||!_ae.alive||_ae.heldBy)continue;
            if(_ae._slamImmune>0)continue;
            var _adx=_ae.mesh.position.x-playerEgg.mesh.position.x;
            var _adz=_ae.mesh.position.z-playerEgg.mesh.position.z;
            var _aHit=DANBO_WASM.arcHit2D(_adx,_adz,_atkDir,2.5*playerEgg._extendedRange,0.01,Math.PI/3);
            var _ad=_aHit[0];
            if(_aHit[3]){
                    if(_isFinisher||_isAerial){
                        var _kf=0.4+(_isAerial?0.2:0);
                        _ae.vx+=_adx/_ad*_kf;_ae.vz+=_adz/_ad*_kf;
                        _ae.vy=_isAerial?0.25:0.2;
                        _ae.squash=COMBAT.punch.squash;_ae.throwTimer=COMBAT.punch.throwTimer;_ae._bounces=COMBAT.punch.bounces;
                        _addStunDamage(_ae,_isAerial?COMBAT.punch.aerialStunDmg:COMBAT.punch.stunDmg);
                    } else {
                        _ae.vx+=_adx/_ad*0.08;_ae.vz+=_adz/_ad*0.08;
                        _ae.squash=0.78;_ae._hitStun=12;
                    }
                    _dropNpcStolenCoins(_ae);playHitSound();
            }
        }
        playerEgg.squash=_isFinisher?0.75:0.88;
        // Punch swing sound
        if(sfxEnabled){var _pCtx=ensureAudio();if(_pCtx){var _pt2=_pCtx.currentTime;
            var _po=_pCtx.createOscillator();var _pg=_pCtx.createGain();
            _po.type='sawtooth';_po.frequency.setValueAtTime(_isFinisher?400:600,_pt2);_po.frequency.exponentialRampToValueAtTime(200,_pt2+0.08);
            _pg.gain.setValueAtTime(0.06,_pt2);_pg.gain.exponentialRampToValueAtTime(0.001,_pt2+0.1);
            _po.connect(_pg);_pg.connect(_pCtx.destination);_po.start(_pt2);_po.stop(_pt2+0.1);
        }}
        if(_isFinisher){playerEgg._comboCount=0;playerEgg._attackCD=18;}
        }
    }
    // Kick (T) — character-specific kick specials
    if(keys['KeyT']&&!playerEgg._tWasDown&&playerEgg._attackCD<=0&&!playerEgg.holding){
        var _isTatsu=playerEgg._tatsuReady;
        var _alwaysT=_findMove(_ct,'alwaysT');
        var _bfT=_findMove(_ct,'bfT');
        // ---- Always-on kick special (Chun-Li hyakuretsu kick) ----
        if(_alwaysT&&_alwaysT.type==='hyakuretsuKick'&&!_isTatsu&&!playerEgg._chargeUpReady){
            _shoutMove(playerEgg,'Hyakuretsu Kick!');
            playerEgg._comboCount=0;playerEgg._attackCD=4;
            MoveRapidHit_execute(playerEgg,'kick');
        }
        // RAPID-PRESS KICK SPECIALS FIRST
        else if(playerEgg._rapidTReady&&_ct==='monkey'){
            // 百裂脚 (Chun-Li) — infinite while mashing
            playerEgg._comboCount=0;playerEgg._attackCD=2;playerEgg._rapidT=3;
            var _rlDir=playerEgg.mesh.rotation.y;
            for(var _rli=0;_rli<allEggs.length;_rli++){
                var _rle=allEggs[_rli];if(_rle===playerEgg||!_rle.alive||_rle.heldBy)continue;
                var _rldx=_rle.mesh.position.x-playerEgg.mesh.position.x;
                var _rldz=_rle.mesh.position.z-playerEgg.mesh.position.z;
                var _rld=DANBO_WASM.len2D(_rldx,_rldz);
                if(_rld<3){_rle.vx+=_rldx/_rld*0.15;_rle.vz+=_rldz/_rld*0.15;_rle._hitStun=8;_dropNpcStolenCoins(_rle);playHitSound();}
            }
            playerEgg.squash=0.85;playerEgg._atkAnim=6;
        }
        // Character-specific kick specials
        else if(_isTatsu&&_bfT&&(_ct==='egg'||_ct==='dog')){
            // TATSUMAKI (Ryu/Ken)
            _shoutMove(playerEgg,'Tatsumaki Senpukyaku!');
            playerEgg._comboCount=0;playerEgg._attackCD=40;playerEgg._tatsuReady=false;
            MoveSpin_execute(playerEgg,playerEgg._moveDir,{duration:MOVE_PARAMS.egg.tatsumaki.duration});
            // Show both legs extended
            var _tud=playerEgg.mesh.userData;
            if(_tud.rightLeg){_tud.rightLeg.visible=true;_tud.rightLeg.position.set(0.3,0.15,0.6);_tud.rightLeg.rotation.x=-Math.PI/2;}
            if(_tud.leftLeg){_tud.leftLeg.visible=true;_tud.leftLeg.position.set(-0.3,0.15,0.6);_tud.leftLeg.rotation.x=-Math.PI/2;}
            playerEgg._atkAnim=96;
            // Tatsumaki sound — spinning whoosh
            if(sfxEnabled){var _tCtx=ensureAudio();if(_tCtx){var _tt=_tCtx.currentTime;
                var _to=_tCtx.createOscillator();var _tg2=_tCtx.createGain();
                _to.type='sawtooth';_to.frequency.setValueAtTime(150,_tt);_to.frequency.linearRampToValueAtTime(400,_tt+0.3);_to.frequency.linearRampToValueAtTime(150,_tt+0.6);
                _tg2.gain.setValueAtTime(0.08,_tt);_tg2.gain.linearRampToValueAtTime(0.12,_tt+0.3);_tg2.gain.exponentialRampToValueAtTime(0.001,_tt+1.5);
                _to.connect(_tg2);_tg2.connect(_tCtx.destination);_to.start(_tt);_to.stop(_tt+1.5);
            }}
        } else if(_isTatsu&&_bfT&&_ct==='monkey'){
            // SPINNING BIRD KICK (Chun-Li) — ↓←+T
            playerEgg._comboCount=0;playerEgg._attackCD=35;playerEgg._tatsuReady=false;
            MoveSpin_execute(playerEgg,playerEgg._moveDir,{duration:MOVE_PARAMS.monkey.spinningBird.duration,jumpMul:MOVE_PARAMS.monkey.spinningBird.jumpMul});
            playerEgg._atkAnim=62;
            _shoutMove(playerEgg,'Spinning Bird Kick!');
            // Phoenix cry sound
            if(sfxEnabled){var _sbkCtx=ensureAudio();if(_sbkCtx){var _sbkt=_sbkCtx.currentTime;
                var _sbko1=_sbkCtx.createOscillator();var _sbkg1=_sbkCtx.createGain();
                _sbko1.type='sine';_sbko1.frequency.setValueAtTime(1200,_sbkt);_sbko1.frequency.exponentialRampToValueAtTime(2000,_sbkt+0.1);_sbko1.frequency.exponentialRampToValueAtTime(800,_sbkt+0.3);_sbko1.frequency.exponentialRampToValueAtTime(1800,_sbkt+0.5);_sbko1.frequency.exponentialRampToValueAtTime(600,_sbkt+0.8);
                _sbkg1.gain.setValueAtTime(0.1,_sbkt);_sbkg1.gain.linearRampToValueAtTime(0.15,_sbkt+0.15);_sbkg1.gain.exponentialRampToValueAtTime(0.001,_sbkt+0.9);
                _sbko1.connect(_sbkg1);_sbkg1.connect(_sbkCtx.destination);_sbko1.start(_sbkt);_sbko1.stop(_sbkt+0.9);
                // Harmonic overtone for bird-like quality
                var _sbko2=_sbkCtx.createOscillator();var _sbkg2=_sbkCtx.createGain();
                _sbko2.type='triangle';_sbko2.frequency.setValueAtTime(2400,_sbkt);_sbko2.frequency.exponentialRampToValueAtTime(3500,_sbkt+0.1);_sbko2.frequency.exponentialRampToValueAtTime(1500,_sbkt+0.5);
                _sbkg2.gain.setValueAtTime(0.04,_sbkt);_sbkg2.gain.exponentialRampToValueAtTime(0.001,_sbkt+0.6);
                _sbko2.connect(_sbkg2);_sbkg2.connect(_sbkCtx.destination);_sbko2.start(_sbkt);_sbko2.stop(_sbkt+0.6);
            }}
        } else if(_isTatsu&&_bfT&&(_ct==='rooster')){
            // SOMERSAULT KICK (Guile) — backflip with blade arc
            _shoutMove(playerEgg,'Somersault Kick!');
            playerEgg._comboCount=0;playerEgg._attackCD=35;playerEgg._tatsuReady=false;
            var _gsFaceDir=playerEgg._moveDir;
            MoveSomersault_execute(playerEgg,_gsFaceDir,MOVE_PARAMS.rooster.somersault);
            playJumpSound();
        } else {
        // Normal kick
        playerEgg._comboCount++;playerEgg._comboTimer=(_ct==='cockroach')?MOVE_PARAMS.cockroach.comboTimerKick:25;playerEgg._attackCD=(_ct==='cockroach')?MOVE_PARAMS.cockroach.kickCD:12;
        var _kickLeg=(playerEgg._comboCount%2===1)?playerEgg.mesh.userData.rightLeg:playerEgg.mesh.userData.leftLeg;
        var _kLegZ=(_ct==='cockroach')?2.5:0.7;
        if(_kickLeg){_kickLeg.visible=true;_kickLeg.position.z=_kLegZ;_kickLeg.rotation.x=-Math.PI/2.5;if(_ct==='cockroach')_kickLeg.scale.set(1,1,3.5);}
        playerEgg._atkAnim=(_ct==='cockroach')?MOVE_PARAMS.cockroach.kickAnim:10;
        var _kDir=playerEgg.mesh.rotation.y;
        var _kFinisher=(playerEgg._comboCount>=3)&&_ct!=='monkey'; // Chun-Li skips finisher (use rapid-press instead)
        var _kAerial=!playerEgg.onGround;
        if(_kFinisher){
            // Finisher kick: show both legs
            var _kud=playerEgg.mesh.userData;
            var _kFinZ=(_ct==='cockroach')?2.5:0.8;
            var _kFinS=(_ct==='cockroach')?3.5:1;
            if(_kud.rightLeg){_kud.rightLeg.visible=true;_kud.rightLeg.position.z=_kFinZ;_kud.rightLeg.rotation.x=-Math.PI/2;if(_ct==='cockroach')_kud.rightLeg.scale.set(1,1,_kFinS);}
            if(_kud.leftLeg){_kud.leftLeg.visible=true;_kud.leftLeg.position.z=_kFinZ;_kud.leftLeg.rotation.x=-Math.PI/2;if(_ct==='cockroach')_kud.leftLeg.scale.set(1,1,_kFinS);}
            playerEgg._atkAnim=(_ct==='cockroach')?28:14;
        }
        for(var _ki=0;_ki<allEggs.length;_ki++){
            var _ke=allEggs[_ki];if(_ke===playerEgg||!_ke.alive||_ke.heldBy)continue;
            if(_ke._slamImmune>0)continue;
            var _kdx=_ke.mesh.position.x-playerEgg.mesh.position.x;
            var _kdz=_ke.mesh.position.z-playerEgg.mesh.position.z;
            var _kHit=DANBO_WASM.arcHit2D(_kdx,_kdz,_kDir,3.0*playerEgg._extendedRange,0.01,Math.PI/3);
            var _kd=_kHit[0];
            if(_kHit[3]){
                    if(_kFinisher||_kAerial){
                        var _kkf=0.5+(_kAerial?0.25:0);
                        _ke.vx+=_kdx/_kd*_kkf;_ke.vz+=_kdz/_kd*_kkf;
                        _ke.vy=_kAerial?0.3:0.25;
                        _ke.squash=COMBAT.kick.squash;_ke.throwTimer=COMBAT.kick.throwTimer;_ke._bounces=COMBAT.kick.bounces;
                        _addStunDamage(_ke,_kAerial?COMBAT.kick.aerialStunDmg:COMBAT.kick.stunDmg);
                    } else {
                        _ke.vx+=_kdx/_kd*0.12;_ke.vz+=_kdz/_kd*0.12;
                        _ke.squash=0.72;_ke._hitStun=15;
                    }
                    _dropNpcStolenCoins(_ke);playHitSound();
                }
            }
        playerEgg.squash=_kFinisher?0.7:0.82;
        // Kick swing sound
        if(sfxEnabled){var _kCtx=ensureAudio();if(_kCtx){var _kt2=_kCtx.currentTime;
            var _ko=_kCtx.createOscillator();var _kg2=_kCtx.createGain();
            _ko.type='sawtooth';_ko.frequency.setValueAtTime(_kFinisher?300:500,_kt2);_ko.frequency.exponentialRampToValueAtTime(150,_kt2+0.1);
            _kg2.gain.setValueAtTime(0.07,_kt2);_kg2.gain.exponentialRampToValueAtTime(0.001,_kt2+0.12);
            _ko.connect(_kg2);_kg2.connect(_kCtx.destination);_ko.start(_kt2);_ko.stop(_kt2+0.12);
        }}
        if(_kFinisher){playerEgg._comboCount=0;playerEgg._attackCD=22;}
        } // end normal kick (else from tatsu)
    }
    playerEgg._rWasDown=!!keys['KeyR'];
    playerEgg._tWasDown=!!keys['KeyT'];
    } // end combat block (else from _inSpecialMove)
    // ---- Shoryuken update (unified) ----
    if(playerEgg._shoryuActive>0){
        MoveUppercut_update(playerEgg);
    } else {
        if(window._shoryuFist)window._shoryuFist.visible=false;
        if(window._shoryuDragon)for(var _sdl=0;_sdl<window._shoryuDragon.length;_sdl++)window._shoryuDragon[_sdl].visible=false;
    }
    // ---- Tatsumaki update (unified) ----
    if(playerEgg._tatsuActive>0){
        MoveSpin_update(playerEgg, function(){
            var _lmx=0,_lmz=0;
            if(keys['KeyA']||keys['ArrowLeft'])_lmx-=1;
            if(keys['KeyD']||keys['ArrowRight'])_lmx+=1;
            if(keys['KeyW']||keys['ArrowUp'])_lmz-=1;
            if(keys['KeyS']||keys['ArrowDown'])_lmz+=1;
            if(joyActive){_lmx+=joyVec.x;_lmz+=joyVec.y;}
            return {mx:_lmx,mz:_lmz,
                up:!!(keys['KeyW']||keys['ArrowUp']),
                down:!!(keys['KeyS']||keys['ArrowDown']),
                left:!!(keys['KeyA']||keys['ArrowLeft']),
                right:!!(keys['KeyD']||keys['ArrowRight'])};
        });
    } else {
        if(window._tatsuDragon)for(var _ttl=0;_ttl<window._tatsuDragon.length;_ttl++)window._tatsuDragon[_ttl].visible=false;
    }
    // ---- Guile Somersault Kick (standalone, no shoryuken effect) ----
    if(playerEgg._guileSomersault>0){
        playerEgg._guileSomersault--;
        // Constant forward push
        if(playerEgg._guileSomFwdX!==undefined){
            playerEgg.vx=playerEgg._guileSomFwdX;
            playerEgg.vz=playerEgg._guileSomFwdZ;
        }
        // Full 360 backflip — rotate BODY in local space (follows facing direction)
        var _gsB=playerEgg.mesh.userData.body;
        if(_gsB)_gsB.rotation.x-=Math.PI*2/30;
        playerEgg._dashBounceTimer=5;
        // Blade arc — vertical half-circle in front of Guile, curved part faces forward
        if(window._guileArc){
            var _gaFace3=playerEgg._guileArcFaceY;
            window._guileArc.visible=true;
            // Follow player + drift forward a bit (~1/3 body over duration)
            var _gaElapsed=(MOVE_PARAMS.rooster.somersault.duration-playerEgg._guileSomersault);
            var _gaDrift=1.5+_gaElapsed*0.03;
            window._guileArc.position.set(
                playerEgg.mesh.position.x+Math.sin(_gaFace3)*_gaDrift,
                playerEgg.mesh.position.y+1.0,
                playerEgg.mesh.position.z+Math.cos(_gaFace3)*_gaDrift);
            // Arc in sagittal plane, opening faces back toward Guile, curve faces forward
            window._guileArc.rotation.set(0,_gaFace3+Math.PI/2,Math.PI/2);
            window._guileArc.material.opacity=0.85;
            // Play sound once at start
            if(!playerEgg._guileArcLaunched){
                playerEgg._guileArcLaunched=true;
                if(sfxEnabled){var _gcCtx=ensureAudio();if(_gcCtx){var _gct=_gcCtx.currentTime;
                    var _gco=_gcCtx.createOscillator();var _gcg=_gcCtx.createGain();
                    _gco.type='sawtooth';_gco.frequency.setValueAtTime(1500,_gct);_gco.frequency.exponentialRampToValueAtTime(400,_gct+0.15);
                    _gcg.gain.setValueAtTime(0.12,_gct);_gcg.gain.exponentialRampToValueAtTime(0.001,_gct+0.25);
                    _gco.connect(_gcg);_gcg.connect(_gcCtx.destination);_gco.start(_gct);_gco.stop(_gct+0.25);
                }}
            }
        }
        // Hit detection
        if(playerEgg._guileSomersault%4===0){
            for(var _gsi=0;_gsi<allEggs.length;_gsi++){
                var _gse=allEggs[_gsi];if(_gse===playerEgg||!_gse.alive||_gse.heldBy)continue;
                if(_gse._slamImmune>0)continue;
                var _gsdx=_gse.mesh.position.x-playerEgg.mesh.position.x;
                var _gsdz=_gse.mesh.position.z-playerEgg.mesh.position.z;
                var _gsdy=_gse.mesh.position.y-playerEgg.mesh.position.y;
                var _gsd=DANBO_WASM.len3D(_gsdx,_gsdy,_gsdz);
                if(_gsd<3.5&&_gsd>0.01){
                    // Blow away + slash cut effect
                    _gse.vx+=_gsdx/_gsd*COMBAT.somersault.force;_gse.vz+=_gsdz/_gsd*COMBAT.somersault.force;_gse.vy=COMBAT.somersault.vy;
                    _gse.squash=COMBAT.somersault.squash;_gse.throwTimer=COMBAT.somersault.throwTimer;_gse._bounces=COMBAT.somersault.bounces;
                    _addStunDamage(_gse,COMBAT.somersault.stunDmg);
                    _dropNpcStolenCoins(_gse);playHitSound();
                    spawnSlashEffect(_gse,playerEgg._guileArcFaceY);
                }
            }
        }
        // End check — skip first 10 frames
        if(playerEgg._guileSomersault<50&&(playerEgg.vy<=0||playerEgg.onGround)){
            playerEgg._guileSomersault=0;
        } else if(playerEgg._guileSomersault<=0){
            playerEgg._guileSomersault=0;
        }
        if(playerEgg._guileSomersault<=0){
            var _gsB2=playerEgg.mesh.userData.body;if(_gsB2)_gsB2.rotation.x=0;
            playerEgg.mesh.rotation.x=0;
            // Let blade arc continue flying forward after somersault ends
            if(window._guileArc&&window._guileArc.visible){
                window._guileArcFly={faceY:playerEgg._guileArcFaceY||0,life:40};
            }
            playerEgg._guileSomFwdX=undefined;playerEgg._guileSomFwdZ=undefined;
            playerEgg._guileArcLaunched=false;
        }
    } else {
        if(window._guileArc&&(!window._guileArc.userData._life||window._guileArc.userData._life<=0))window._guileArc.visible=false;
    }
    // ---- Honda Hyakuretsu continuous animation (unified) ----
    if(!playerEgg._hyakuretsuTimer)playerEgg._hyakuretsuTimer=0;
    if(playerEgg._hyakuretsuTimer>0){
        var _hInputFn=function(){
            var _hmx=0,_hmz=0;
            if(keys['KeyA']||keys['ArrowLeft'])_hmx-=1;
            if(keys['KeyD']||keys['ArrowRight'])_hmx+=1;
            if(keys['KeyW']||keys['ArrowUp'])_hmz-=1;
            if(keys['KeyS']||keys['ArrowDown'])_hmz+=1;
            if(joyActive){_hmx+=joyVec.x;_hmz+=joyVec.y;}
            return {mx:_hmx,mz:_hmz};
        };
        MoveRapidHit_update(playerEgg,'punch',!!keys['KeyR'],_hInputFn);
    }
    // ---- Chun-Li Hyakuretsu Kick (百裂脚) continuous animation (unified) ----
    if(!playerEgg._hyakuretsuKickTimer)playerEgg._hyakuretsuKickTimer=0;
    if(playerEgg._hyakuretsuKickTimer>0){
        var _ckInputFn=function(){
            var _ckmx=0,_ckmz=0;
            if(keys['KeyA']||keys['ArrowLeft'])_ckmx-=1;
            if(keys['KeyD']||keys['ArrowRight'])_ckmx+=1;
            if(keys['KeyW']||keys['ArrowUp'])_ckmz-=1;
            if(keys['KeyS']||keys['ArrowDown'])_ckmz+=1;
            if(joyActive){_ckmx+=joyVec.x;_ckmz+=joyVec.y;}
            return {mx:_ckmx,mz:_ckmz};
        };
        MoveRapidHit_update(playerEgg,'kick',!!keys['KeyT'],_ckInputFn);
    }
    // ---- Blanka Electric Thunder ----
    if(playerEgg._blankaShock>0){
        playerEgg._blankaShock--;
        // Shake and stay still
        playerEgg.vx*=0.1;playerEgg.vz*=0.1;
        playerEgg.mesh.rotation.z=Math.sin(Date.now()*0.05)*0.3;
        // Electric bolts — radiate outward from body center (purple)
        if(!playerEgg._elecParticles){
            playerEgg._elecParticles=[];
            for(var _epi=0;_epi<12;_epi++){
                var _ep=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.04,0.6),new THREE.MeshBasicMaterial({color:0xAA44FF,transparent:true,opacity:0.9}));
                _ep.visible=false;scene.add(_ep);
                playerEgg._elecParticles.push(_ep);
            }
        }
        // Sound: electric crackle every 8 frames
        if(playerEgg._blankaShock%8===0&&sfxEnabled){
            var _esCtx=ensureAudio();if(_esCtx){var _est=_esCtx.currentTime;
            var _esb=_esCtx.createBuffer(1,Math.floor(_esCtx.sampleRate*0.06),_esCtx.sampleRate);
            var _esd=_esb.getChannelData(0);
            for(var _esi=0;_esi<_esd.length;_esi++)_esd[_esi]=(Math.random()-0.5)*0.3*Math.exp(-_esi/(_esd.length*0.2));
            var _ess=_esCtx.createBufferSource();_ess.buffer=_esb;
            var _esg=_esCtx.createGain();_esg.gain.value=0.06;
            _ess.connect(_esg);_esg.connect(_esCtx.destination);_ess.start(_est);_ess.stop(_est+0.06);}
        }
        var _epCx=playerEgg.mesh.position.x,_epCy=playerEgg.mesh.position.y+0.5,_epCz=playerEgg.mesh.position.z;
        for(var _epj=0;_epj<playerEgg._elecParticles.length;_epj++){
            var _epp=playerEgg._elecParticles[_epj];
            _epp.visible=true;
            // Each bolt shoots outward from center in a random direction
            var _epAngle=_epj*Math.PI*2/playerEgg._elecParticles.length+Math.random()*0.8;
            var _epLen=0.8+Math.random()*1.4; // bolt length (doubled)
            var _epYOff=(Math.random()-0.5)*0.6;
            var _epMidX=_epCx+Math.sin(_epAngle)*_epLen;
            var _epMidZ=_epCz+Math.cos(_epAngle)*_epLen;
            _epp.position.set(_epMidX,_epCy+_epYOff,_epMidZ);
            // Point bolt outward from center
            _epp.lookAt(_epMidX+Math.sin(_epAngle),_epCy+_epYOff+(Math.random()-0.5)*0.3,_epMidZ+Math.cos(_epAngle));
            _epp.scale.set(1,1,0.5+Math.random()*1.0);
            _epp.material.color.setHex(Math.random()>0.3?0xAA44FF:0xDD88FF);
        }
        for(var _bsi=0;_bsi<allEggs.length;_bsi++){
            var _bse=allEggs[_bsi];if(_bse===playerEgg||!_bse.alive||_bse.heldBy)continue;
            var _bsdx=_bse.mesh.position.x-playerEgg.mesh.position.x;
            var _bsdz=_bse.mesh.position.z-playerEgg.mesh.position.z;
            if(DANBO_WASM.len2D(_bsdx,_bsdz)<4){
                if(!_bse._electrocuted&&!_bse._elecFlying){
                    _bse._electrocuted=COMBAT.electric.electrocuteDuration;
                    _bse._slamImmune=200;
                    var _elDist=DANBO_WASM.len2D(_bsdx,_bsdz);
                    if(_elDist<0.1)_elDist=0.1;
                    _bse._elecKnockDir={x:_bsdx/_elDist,z:_bsdz/_elDist};
                    _bse.vx=0;_bse.vz=0;_bse.vy=0;
                    _dropNpcStolenCoins(_bse);if(_bse.isPlayer)playHitSound();
                }
            }
        }
        if(playerEgg._blankaShock<=0){
            playerEgg.mesh.rotation.z=0;
            if(playerEgg._elecParticles)for(var _epk=0;_epk<playerEgg._elecParticles.length;_epk++)playerEgg._elecParticles[_epk].visible=false;
        }
    }
    // ---- Yoga Flame (Dhalsim fire breath) ----
    if(!playerEgg._yogaFlame)playerEgg._yogaFlame=0;
    if(playerEgg._yogaFlame>0){
        playerEgg._yogaFlame--;
        playerEgg.vx*=0.8;playerEgg.vz*=0.8; // slow down during flame
        // Spawn fire particles in front
        var _yfFace=playerEgg._yogaFlameDir||playerEgg.mesh.rotation.y;
        if(playerEgg._yogaFlame%3===0){
            var _flameRange=3.0;
            var _flameR=0.3+Math.random()*0.4;
            var _flameDist=1.0+Math.random()*_flameRange;
            var _fp2=new THREE.Mesh(new THREE.SphereGeometry(_flameR,5,4),new THREE.MeshBasicMaterial({
                color:[0xFF4400,0xFF8800,0xFFCC00,0xFF2200][Math.floor(Math.random()*4)],transparent:true,opacity:0.85}));
            _fp2.position.set(
                playerEgg.mesh.position.x+Math.sin(_yfFace)*_flameDist+(Math.random()-0.5)*0.8,
                playerEgg.mesh.position.y+0.3+Math.random()*0.8,
                playerEgg.mesh.position.z+Math.cos(_yfFace)*_flameDist+(Math.random()-0.5)*0.8);
            scene.add(_fp2);
            if(!window._yogaFlameParticles)window._yogaFlameParticles=[];
            window._yogaFlameParticles.push({mesh:_fp2,life:15});
        }
        // Hit detection — enemies in cone in front
        if(playerEgg._yogaFlame%5===0){
            for(var _yfi=0;_yfi<allEggs.length;_yfi++){
                var _yfe=allEggs[_yfi];if(_yfe===playerEgg||!_yfe.alive||_yfe.heldBy)continue;
                if(_yfe._slamImmune>0||_yfe._onFire>0)continue;
                var _yfdx=_yfe.mesh.position.x-playerEgg.mesh.position.x;
                var _yfdz=_yfe.mesh.position.z-playerEgg.mesh.position.z;
                var _yfHit=DANBO_WASM.coneDotHit2D(_yfdx,_yfdz,_yfFace,4,0.01,0.3);
                if(_yfHit[2]){
                        // Set on fire — like Blanka electric but fire
                        _yfe._onFire=MOVE_PARAMS.cockroach.yogaFlame.fireDuration;
                        _yfe._fireStun=MOVE_PARAMS.cockroach.yogaFlame.fireStun;
                        _yfe._fireStunDir=_yfFace;
                        _yfe.vx=0;_yfe.vz=0;_yfe.vy=0;
                        _addStunDamage(_yfe,COMBAT.yogaFlame.stunDmg);
                        _dropNpcStolenCoins(_yfe);playHitSound();
                    }
                }
            }
        if(playerEgg._yogaFlame<=0){
            playerEgg._yogaFlameDir=undefined;
        }
    }
    // Update yoga flame particles
    if(window._yogaFlameParticles){
        for(var _yfpi=window._yogaFlameParticles.length-1;_yfpi>=0;_yfpi--){
            var _yfpp=window._yogaFlameParticles[_yfpi];
            _yfpp.life--;_yfpp.mesh.position.y+=0.03;
            _yfpp.mesh.material.opacity=_yfpp.life/15*0.85;
            _yfpp.mesh.scale.multiplyScalar(0.95);
            if(_yfpp.life<=0){scene.remove(_yfpp.mesh);window._yogaFlameParticles.splice(_yfpi,1);}
        }
    }
    // ---- Blanka in-place spin (Rolling Attack) ----
    if(!playerEgg._blankaSpinTimer)playerEgg._blankaSpinTimer=0;
    if(playerEgg._blankaSpinTimer>0){
        playerEgg._blankaSpinTimer--;
        if(playerEgg._blankaSpinDirX!==undefined){
            playerEgg.vx=playerEgg._blankaSpinDirX;
            playerEgg.vz=playerEgg._blankaSpinDirZ;
        }
        playerEgg.vy=0;
        playerEgg.mesh.position.y=Math.max(playerEgg.mesh.position.y,1.5);
        if(playerEgg._blankaSpinTimer%4===0){
            for(var _bri=0;_bri<allEggs.length;_bri++){
                var _bre=allEggs[_bri];if(_bre===playerEgg||!_bre.alive||_bre.heldBy)continue;
                var _brdx=_bre.mesh.position.x-playerEgg.mesh.position.x;
                var _brdz=_bre.mesh.position.z-playerEgg.mesh.position.z;
                var _brd=DANBO_WASM.len2D(_brdx,_brdz);
                if(_brd<2.5&&_brd>0.01){
                    // Knock opponent flying like Honda headbutt
                    _bre.vx+=playerEgg.vx*0.8;_bre.vz+=playerEgg.vz*0.8;_bre.vy=0.25;
                    _bre.squash=COMBAT.kick.squash;_bre.throwTimer=COMBAT.blankaRoll.throwTimer;_bre._bounces=COMBAT.blankaRoll.bounces;_addStunDamage(_bre,COMBAT.blankaRoll.stunDmg);
                    _dropNpcStolenCoins(_bre);playHitSound();
                    // Bounce back — reverse direction, enter falling phase (still spinning)
                    playerEgg._blankaSpinDirX*=-0.3;playerEgg._blankaSpinDirZ*=-0.3;
                    playerEgg.vx=playerEgg._blankaSpinDirX;playerEgg.vz=playerEgg._blankaSpinDirZ;
                    playerEgg._blankaSpinTimer=0;
                    playerEgg._blankaSpinFalling=true;
                    playerEgg._dashBounceTimer=30;
                    playerEgg.vy=0.1;
                    break;
                }
            }
        }
        // Building collision bounce
        for(var _bci2=0;_bci2<cityColliders.length;_bci2++){
            var _bc2=cityColliders[_bci2];
            var _bcdx=playerEgg.mesh.position.x-_bc2.x,_bcdz=playerEgg.mesh.position.z-_bc2.z;
            if(DANBO_WASM.aabb2D(playerEgg.mesh.position.x,playerEgg.mesh.position.z,_bc2.x,_bc2.z,_bc2.hw,_bc2.hd,1)&&playerEgg.mesh.position.y<(_bc2.h||6)){
                playerEgg._blankaSpinDirX*=-0.3;playerEgg._blankaSpinDirZ*=-0.3;
                playerEgg.vx=playerEgg._blankaSpinDirX;playerEgg.vz=playerEgg._blankaSpinDirZ;
                playerEgg._blankaSpinTimer=0;
                playerEgg._blankaSpinFalling=true;
                playerEgg._dashBounceTimer=30;
                playerEgg.vy=0.1;
                playHitSound();break;
            }
        }
        if(playerEgg._blankaSpinTimer<=0&&!playerEgg._blankaSpinFalling){
            playerEgg._blankaSpinFalling=true;
            playerEgg.mesh.rotation.order='XYZ';playerEgg.mesh.rotation.x=0;
            var _bsEndBody=playerEgg.mesh.userData.body;
            if(_bsEndBody)_bsEndBody.rotation.x=0;
            playerEgg._blankaSpinAngle=0;
            playerEgg.vx*=0.2;playerEgg.vz*=0.2;
        }
        if(playerEgg._blankaSpinTimer<=0){
            playerEgg._blankaSpinDirX=undefined;playerEgg._blankaSpinDirZ=undefined;
        }
    }
    // Blanka spin falling — keep spinning at same speed until landing
    if(playerEgg._blankaSpinFalling){
        // Rotation handled by physics.js FINAL block, no scale change
        if(playerEgg.onGround){
            playerEgg._blankaSpinFalling=false;
            playerEgg._blankaSpinAngle=0;
            playerEgg.mesh.rotation.order='XYZ';
            playerEgg.mesh.rotation.x=0;
            playerEgg.mesh.rotation.z=0;
            var _bsFBody=playerEgg.mesh.userData.body;
            if(_bsFBody)_bsFBody.rotation.x=0;
            playerEgg.mesh.scale.set(1,1,1);
            if(playerEgg._dashFaceY!==undefined){
                playerEgg.mesh.rotation.y=playerEgg._dashFaceY;
                playerEgg._dashBounceTimer=15;
            }
            playerEgg.vx*=0.2;playerEgg.vz*=0.2;
        }
    }
    // ---- Honda/Blanka Dash Attack (constant speed each frame) ----
    if(playerEgg._hondaDash>0){
        playerEgg._hondaDash--;
        // Maintain constant dash speed (override friction)
        if(playerEgg._dashDirX!==undefined){
            playerEgg.vx=playerEgg._dashDirX;playerEgg.vz=playerEgg._dashDirZ;
        }
        // Honda headbutt: face-down head-forward torpedo (consistent in all directions)
        if(!playerEgg._blankaRoll){
            if(!playerEgg._hondaBounced)playerEgg.mesh.position.y=Math.max(playerEgg.mesh.position.y,1.5);
        }
        // Blanka rolls visually — forward tumble (head down first, clockwise from viewer's perspective)
        if(playerEgg._blankaRoll){
            // Face the dash direction
            if(playerEgg._dashDirX!==undefined){
                playerEgg.mesh.rotation.y=Math.atan2(playerEgg._dashDirX,playerEgg._dashDirZ);
            }
            playerEgg.mesh.rotation.z=0;
            playerEgg.mesh.rotation.x+=2.0; // clockwise forward tumble (head goes down first)
            playerEgg.mesh.position.y=Math.max(playerEgg.mesh.position.y,1.5);
            playerEgg.mesh.scale.set(0.8,0.8,0.8); // ball shape
        }
        for(var _hdi=0;_hdi<allEggs.length;_hdi++){
            var _hde=allEggs[_hdi];if(_hde===playerEgg||!_hde.alive||_hde.heldBy)continue;
            var _hddx=_hde.mesh.position.x-playerEgg.mesh.position.x;
            var _hddz=_hde.mesh.position.z-playerEgg.mesh.position.z;
            if(DANBO_WASM.len2D(_hddx,_hddz)<2.5){
                _hde.vx+=playerEgg.vx*0.8;_hde.vz+=playerEgg.vz*0.8;_hde.vy=0.25;
                _hde.squash=COMBAT.kick.squash;_hde.throwTimer=COMBAT.hondaDash.throwTimer;_hde._bounces=COMBAT.hondaDash.bounces;_addStunDamage(_hde,COMBAT.hondaDash.stunDmg);
                _dropNpcStolenCoins(_hde);playHitSound();
                // Push back 2 units along dash direction
                playerEgg.mesh.position.x-=playerEgg._dashDirX/2;
                playerEgg.mesh.position.z-=playerEgg._dashDirZ/2;
                playerEgg.vx=-playerEgg._dashDirX*0.4;playerEgg.vz=-playerEgg._dashDirZ*0.4;
                if(playerEgg._blankaRoll){
                    playerEgg._hondaDash=Math.min(playerEgg._hondaDash,25);
                } else {
                    playerEgg._hondaDash=0;playerEgg._hondaBounced=true;
                }
                playerEgg._dashBounceTimer=30;
                playerEgg.vy=0.15;
            }
        }
        // Building collision bounce during dash
        for(var _dci=0;_dci<cityColliders.length;_dci++){
            var _dc=cityColliders[_dci];
            var _ddx=playerEgg.mesh.position.x-_dc.x,_ddz=playerEgg.mesh.position.z-_dc.z;
            if(DANBO_WASM.aabb2D(playerEgg.mesh.position.x,playerEgg.mesh.position.z,_dc.x,_dc.z,_dc.hw,_dc.hd,1)&&playerEgg.mesh.position.y<(_dc.h||6)){
                // Push out along dash direction (back to where we came from)
                var _pushBack=2.0;
                playerEgg.mesh.position.x-=playerEgg._dashDirX/_pushBack;
                playerEgg.mesh.position.z-=playerEgg._dashDirZ/_pushBack;
                // Bounce back
                playerEgg.vx=-playerEgg._dashDirX*0.4;playerEgg.vz=-playerEgg._dashDirZ*0.4;
                playerEgg.vy=0.15;
                playerEgg._hondaDash=0;playerEgg._hondaBounced=true;
                playerEgg._dashBounceTimer=30;
                playHitSound();break;
            }
        }
        if(playerEgg._hondaDash<=0){playerEgg.vx*=0.2;playerEgg.vz*=0.2;playerEgg._blankaRoll=false;
            playerEgg.mesh.rotation.order='XYZ';playerEgg.mesh.rotation.x=0;playerEgg.mesh.rotation.z=0;
            var _hdEndB=playerEgg.mesh.userData.body;if(_hdEndB){_hdEndB.rotation.x=0;_hdEndB.position.z=0;}
            // Restore original facing direction after bounce
            if(playerEgg._dashFaceY!==undefined)playerEgg.mesh.rotation.y=playerEgg._dashFaceY;
            playerEgg._dashDirX=undefined;playerEgg._dashDirZ=undefined;playerEgg._dashFaceY=undefined;
            playerEgg.mesh.rotation.x=0;
            playerEgg.mesh.rotation.order='XYZ';playerEgg.mesh.rotation.x=0;playerEgg.mesh.rotation.z=0;
            playerEgg.mesh.scale.set(1,1,1);
            var _hdBody=playerEgg.mesh.userData.body;if(_hdBody)_hdBody.rotation.x=0;
        }
    }
    // ---- Special move input trackers ----
    // Detect horizontal direction presses (keyboard + joystick)
    var _joyL=joyActive&&joyVec.x<-0.3;
    var _joyR=joyActive&&joyVec.x>0.3;
    var _joyD=joyActive&&joyVec.y>0.3;
    var _hLeft=(keys['KeyA']||keys['ArrowLeft']||_joyL);
    var _hRight=(keys['KeyD']||keys['ArrowRight']||_joyR);
    var _hDown=(keys['KeyS']||keys['ArrowDown']||_joyD);
    var _hLeftPress=_hLeft&&!playerEgg._prevHLeft;
    var _hRightPress=_hRight&&!playerEgg._prevHRight;
    var _hDownPress=_hDown&&!playerEgg._prevHDown;
    var _joyU=joyActive&&joyVec.y<-0.3;
    var _hUp=(keys['KeyW']||keys['ArrowUp']||_joyU);
    var _hUpPress=_hUp&&!playerEgg._prevHUp;
    // ---- Shoryuken detection removed — now uses bfR ----
    // Determine "forward" and "back" based on facing direction
    var _faceY=playerEgg.mesh.rotation.y;
    var _faceSinY=Math.sin(_faceY),_faceCosY=Math.cos(_faceY);
    var _inputX=(_hLeft?-1:0)+(_hRight?1:0);
    var _inputZ=(_hDown?1:0)+(keys['KeyW']||keys['ArrowUp']?-1:0);
    var _inputDot=_inputX*_faceSinY+_inputZ*_faceCosY;
    // ---- Back-Forward detection: opposite directions (absolute) ----
    if(!playerEgg._bfSeq)playerEgg._bfSeq=0;
    if(!playerEgg._bfTimer)playerEgg._bfTimer=0;
    playerEgg._bfTimer--;
    // Detect any direction press (absolute, not relative to facing)
    var _anyDX=(_hLeft?-1:0)+(_hRight?1:0);
    var _anyDZ=(_hDown?1:0)+((keys['KeyW']||keys['ArrowUp'])?-1:0);
    var _anyDL=DANBO_WASM.len2D(_anyDX,_anyDZ);
    // Hysteresis: press at 0.3, release at 0.15 (easier to re-trigger on mobile joystick)
    var _dpPressed=_anyDL>0.3;
    if(!_dpPressed&&_anyDL<0.15)playerEgg._prevDA=false;
    var _newDP=_dpPressed&&!playerEgg._prevDA;
    if(_dpPressed)playerEgg._prevDA=true;
    if(_newDP&&playerEgg._bfSeq===0){
        playerEgg._bfSeq=1;playerEgg._bfTimer=30;
        playerEgg._bfDX=_anyDX;playerEgg._bfDZ=_anyDZ;
    } else if(_newDP&&playerEgg._bfSeq===1){
        var _bfD2=_anyDX*(playerEgg._bfDX||0)+_anyDZ*(playerEgg._bfDZ||0);
        if(_bfD2<-0.3){playerEgg._bfSeq=2;playerEgg._bfTimer=30;playerEgg._bfReady=true;playerEgg._bfMoveAngle=Math.atan2(_anyDX,_anyDZ);}
        else{playerEgg._bfSeq=1;playerEgg._bfTimer=30;playerEgg._bfDX=_anyDX;playerEgg._bfDZ=_anyDZ;}
    }
    if(playerEgg._bfTimer<=0){playerEgg._bfSeq=0;playerEgg._bfReady=false;}
    // Forward/back press for other uses
    var _inputBack=(_inputDot<-0.3);
    var _inputFwd=(_inputDot>0.3);
    var _inputBackPress=_inputBack&&!playerEgg._prevBfBack;
    var _inputFwdPress=_inputFwd&&!playerEgg._prevBfFwd;
    playerEgg._prevBfBack=_inputBack;playerEgg._prevBfFwd=_inputFwd;
    // ---- Forward-Forward detection: same direction pressed twice ----
    if(!playerEgg._ffSeq)playerEgg._ffSeq=0;
    if(!playerEgg._ffTimer)playerEgg._ffTimer=0;
    playerEgg._ffTimer--;
    if(_newDP&&playerEgg._ffSeq===0&&!playerEgg._bfReady){
        playerEgg._ffSeq=1;playerEgg._ffTimer=30;
        playerEgg._ffDX=_anyDX;playerEgg._ffDZ=_anyDZ;
    } else if(_newDP&&playerEgg._ffSeq===1&&!playerEgg._bfReady){
        var _ffDot=_anyDX*(playerEgg._ffDX||0)+_anyDZ*(playerEgg._ffDZ||0);
        if(_ffDot>0.3){
            playerEgg._ffSeq=2;playerEgg._ffTimer=30;playerEgg._ffReady=true;playerEgg._ffMoveAngle=Math.atan2(_anyDX,_anyDZ);
        } else {
            playerEgg._ffSeq=1;playerEgg._ffTimer=30;
            playerEgg._ffDX=_anyDX;playerEgg._ffDZ=_anyDZ;
        }
    }
    if(playerEgg._ffTimer<=0){playerEgg._ffSeq=0;playerEgg._ffReady=false;}
    // ---- Unified move direction: used by all directional specials ----
    // bf moves use second press direction, ff moves use second press direction
    if(_tpsCamMode){
        // TPS: all skills fire in character's facing direction
        playerEgg._moveDir=playerEgg.mesh.rotation.y;
    } else if(playerEgg._bfReady&&playerEgg._bfMoveAngle!==undefined)playerEgg._moveDir=playerEgg._bfMoveAngle;
    else if(playerEgg._ffReady&&playerEgg._ffMoveAngle!==undefined)playerEgg._moveDir=playerEgg._ffMoveAngle;
    else playerEgg._moveDir=playerEgg.mesh.rotation.y;
    // ---- Tatsumaki (旋风腿): 後+前+T (back-forward-kick) ----
    playerEgg._tatsuReady=playerEgg._bfReady;
    // ---- Hadouken (波動拳): 前前+R (forward-forward-punch) ----
    playerEgg._hadouReady=playerEgg._ffReady;
    playerEgg._prevHLeft=_hLeft;playerEgg._prevHRight=_hRight;playerEgg._prevHDown=_hDown;playerEgg._prevHUp=_hUp;
    // ---- Simple command inputs for charge characters (no actual charging needed) ----
    // Sonic Boom / 気功拳: use →→+R (forward-forward, same as hadouken)
    playerEgg._chargeForwardReady=playerEgg._ffReady;
    // Somersault / Spinning Bird: use ←→+T (same as tatsumaki = bf)
    playerEgg._chargeUpReady=playerEgg._bfReady;
    // ---- Rapid press detection (Chun-Li/Honda/Blanka) ----
    if(!playerEgg._rapidR)playerEgg._rapidR=0;
    if(!playerEgg._rapidT)playerEgg._rapidT=0;
    if(!playerEgg._rapidRTimer)playerEgg._rapidRTimer=0;
    if(!playerEgg._rapidTTimer)playerEgg._rapidTTimer=0;
    if(keys['KeyR']&&!playerEgg._rWasDown){playerEgg._rapidR++;playerEgg._rapidRTimer=60;}
    if(keys['KeyT']&&!playerEgg._tWasDown){playerEgg._rapidT++;playerEgg._rapidTTimer=60;}
    playerEgg._rapidRTimer--;playerEgg._rapidTTimer--;
    if(playerEgg._rapidRTimer<=0)playerEgg._rapidR=0;
    if(playerEgg._rapidTTimer<=0)playerEgg._rapidT=0;
    // Rapid R ready (3+ presses in 60 frames) — Honda 百裂張手 / Blanka Electric
    playerEgg._rapidRReady=(playerEgg._rapidR>=3);
    // Rapid T ready (3+ presses in 60 frames) — Chun-Li 百裂脚
    playerEgg._rapidTReady=(playerEgg._rapidT>=3);
    // ---- Dhalsim passive: extended attack range ----
    playerEgg._extendedRange=(_ct==='cockroach')?MOVE_PARAMS.cockroach.extendedRange:1.0;
    // ---- Zangief Double Lariat: R+T held together ----
    playerEgg._lariatReady=(keys['KeyR']&&keys['KeyT']&&_hasMove(_ct,'RT'));
    // ---- Piledriver input sequence tracker (Zangief only: forward-back-forward+F) ----
    if(_ct==='bear'){
        if(!playerEgg._pdSeq)playerEgg._pdSeq=0;
        if(!playerEgg._pdTimer)playerEgg._pdTimer=0;
        playerEgg._pdTimer--;
        if(_inputFwdPress&&playerEgg._pdSeq===0){playerEgg._pdSeq=1;playerEgg._pdTimer=40;}
        else if(_inputBackPress&&playerEgg._pdSeq===1){playerEgg._pdSeq=2;playerEgg._pdTimer=40;}
        else if(_inputFwdPress&&playerEgg._pdSeq===2){playerEgg._pdSeq=3;playerEgg._pdTimer=40;playerEgg._piledriverReady=true;}
        if(playerEgg._pdTimer<=0){playerEgg._pdSeq=0;playerEgg._piledriverReady=false;}
    } else {playerEgg._piledriverReady=false;}
    playerEgg._pdPrevLeft=!!(keys['KeyA']||keys['ArrowLeft']);
    playerEgg._pdPrevRight=!!(keys['KeyD']||keys['ArrowRight']);
    // ---- Body Slam landing impact (height-based damage) ----
    if(playerEgg._bodySlam&&playerEgg.onGround){
        playerEgg._bodySlam=false;
        var _bst=playerEgg._bodySlamTarget;
        var _slamH=Math.max(1,(playerEgg._bodySlamStartY||3));
        var _slamPower=Math.min(_slamH/20,3); // 0-3 power scale based on height
        if(_bst&&_bst.alive){
            // Crush NPC: flatten + bounce away — stronger from higher
            _bst.mesh.position.set(playerEgg.mesh.position.x,0.1,playerEgg.mesh.position.z);
            _bst.squash=0.1+0.1/(1+_slamPower);
            var _bsDir=playerEgg.mesh.rotation.y+Math.PI*(Math.random()-0.5);
            var _bsForce=0.4+_slamPower*0.3;
            _bst.vx=Math.sin(_bsDir)*_bsForce;_bst.vy=0.3+_slamPower*0.2;_bst.vz=Math.cos(_bsDir)*_bsForce;
            _bst.throwTimer=COMBAT.bodySlam.baseThrowTimer+Math.floor(_slamPower*20);_bst._bounces=COMBAT.bodySlam.bounces;
            _addStunDamage(_bst,COMBAT.bodySlam.stunDmg);
            _dropNpcStolenCoins(_bst);
            playHitSound();
            // Screen shake effect (camera wobble)
            if(playerEgg._bodySlamStartY>5){
                // Big impact: ground dust ring
                for(var _dri=0;_dri<8;_dri++){
                    var _dra=_dri/8*Math.PI*2;
                    _spawnGroundDust(playerEgg.mesh.position.x+Math.cos(_dra)*2,0,playerEgg.mesh.position.z+Math.sin(_dra)*2,0.5+_slamPower*0.3);
                }
            }
            // Player bounces up — higher from bigger slam + brief immunity
            playerEgg.vy=0.2+_slamPower*0.1;playerEgg.squash=0.4;
            playerEgg.throwTimer=0;playerEgg._stunTimer=0; // clear any stun
            playerEgg.grabCD=Math.max(playerEgg.grabCD,20);
            playerEgg._slamImmune=30; // 0.5s immunity from thrown NPC bounce-back
            _spawnGroundDust(playerEgg.mesh.position.x,0,playerEgg.mesh.position.z,0.6+_slamPower*0.4);
            // Body slam impact sound — heavy thud
            if(sfxEnabled){var _bsCtx=ensureAudio();if(_bsCtx){var _bst2=_bsCtx.currentTime;
                var _bso=_bsCtx.createOscillator();var _bsg=_bsCtx.createGain();
                _bso.type='sine';_bso.frequency.setValueAtTime(80+_slamPower*20,_bst2);_bso.frequency.exponentialRampToValueAtTime(30,_bst2+0.3);
                _bsg.gain.setValueAtTime(0.15,_bst2);_bsg.gain.exponentialRampToValueAtTime(0.001,_bst2+0.35);
                _bso.connect(_bsg);_bsg.connect(_bsCtx.destination);_bso.start(_bst2);_bso.stop(_bst2+0.35);
            }}
        }
        playerEgg._bodySlamTarget=null;playerEgg._bodySlamStartY=0;
    }
    // ---- Piledriver animation (direct position control) ----
    if(playerEgg._piledriverTarget){
        var _pdt=playerEgg._piledriverTarget;
        // Safety: abort if target died, escaped, or phase too long
        if(!_pdt.alive||!_pdt._piledriverLocked||playerEgg._piledriverPhase>80){
            _pdt._piledriverLocked=false;_pdt.mesh.rotation.z=0;
            playerEgg._piledriverTarget=null;playerEgg._piledriverPhase=0;playerEgg._pdStartX=0;playerEgg._pdStartZ=0;
            playerEgg.grabCD=20;playerEgg._stunTimer=0;playerEgg._slamImmune=30;
        } else {
        playerEgg._piledriverPhase++;
        // Player immune during piledriver
        playerEgg._slamImmune=5;playerEgg._stunTimer=0;playerEgg.throwTimer=0;
        var _pdStartX=playerEgg._pdStartX||(playerEgg._pdStartX=playerEgg.mesh.position.x);
        var _pdStartZ=playerEgg._pdStartZ||(playerEgg._pdStartZ=playerEgg.mesh.position.z);
        var _pdMaxY=15; // max height
        // Lock player horizontal position
        playerEgg.mesh.position.x=_pdStartX;playerEgg.mesh.position.z=_pdStartZ;
        playerEgg.vx=0;playerEgg.vz=0;playerEgg.vy=0;
        // Lock target to player
        _pdt.vx=0;_pdt.vy=0;_pdt.vz=0;
        _pdt.mesh.rotation.z=Math.PI;_pdt.mesh.rotation.y=playerEgg.mesh.rotation.y;
        if(playerEgg._piledriverPhase<=40){
            // Rise: linear interpolation to max height
            var _riseT=playerEgg._piledriverPhase/40;
            playerEgg.mesh.position.y=0.5+_riseT*_pdMaxY;
            playerEgg.mesh.rotation.y+=0.5;
            if(playerEgg._piledriverPhase%4===0)_spawnButtSmoke(playerEgg,0.6);
        } else if(playerEgg._piledriverPhase<=48){
            // Pause at top
            playerEgg.mesh.position.y=0.5+_pdMaxY;
            playerEgg.mesh.rotation.y+=0.6;
        } else if(playerEgg._piledriverPhase<=60){
            // Slam down: fast linear to ground
            var _slamT=(playerEgg._piledriverPhase-48)/12;
            playerEgg.mesh.position.y=0.5+_pdMaxY*(1-_slamT);
            playerEgg.mesh.rotation.y+=0.7;
        } else {
            // Impact
            playerEgg.mesh.position.y=0.5;
            _pdt._piledriverLocked=false;
            _pdt.mesh.position.set(_pdStartX,0.1,_pdStartZ);
            _pdt.mesh.rotation.z=0;_pdt.squash=0.1;
            var _pdBounceDir=Math.random()*Math.PI*2;
            _pdt.vx=Math.sin(_pdBounceDir)*0.8;_pdt.vy=0.5;_pdt.vz=Math.cos(_pdBounceDir)*0.8;
            _pdt.throwTimer=COMBAT.piledriver.throwTimer;_pdt._bounces=COMBAT.piledriver.bounces;_pdt._stunTimer=COMBAT.piledriver.stunTimer;
            _dropNpcStolenCoins(_pdt);playHitSound();
            if(sfxEnabled){var _pdCtx=ensureAudio();if(_pdCtx){var _pdt2=_pdCtx.currentTime;
                var _pdo=_pdCtx.createOscillator();var _pdg=_pdCtx.createGain();
                _pdo.type='square';_pdo.frequency.setValueAtTime(120,_pdt2);_pdo.frequency.exponentialRampToValueAtTime(25,_pdt2+0.4);
                _pdg.gain.setValueAtTime(0.18,_pdt2);_pdg.gain.exponentialRampToValueAtTime(0.001,_pdt2+0.5);
                _pdo.connect(_pdg);_pdg.connect(_pdCtx.destination);_pdo.start(_pdt2);_pdo.stop(_pdt2+0.5);
            }}
            for(var _pddi=0;_pddi<12;_pddi++){
                var _pdda=_pddi/12*Math.PI*2;
                _spawnGroundDust(_pdStartX+Math.cos(_pdda)*2.5,0,_pdStartZ+Math.sin(_pdda)*2.5,0.8);
            }
            playerEgg.vy=0.2;playerEgg.squash=0.5;playerEgg.grabCD=40;playerEgg._slamImmune=30;
            playerEgg._piledriverTarget=null;playerEgg._piledriverPhase=0;playerEgg._pdStartX=0;playerEgg._pdStartZ=0;
        }
        // Position target on player head
        if(playerEgg._piledriverTarget)_pdt.mesh.position.set(playerEgg.mesh.position.x,playerEgg.mesh.position.y+1.5,playerEgg.mesh.position.z);
        } // end safety else
    }
    playerEgg._fWasDown=!!keys['KeyF'];
    }catch(e){console.error('handlePlayerInput error:',e.message,e.stack);}
}
