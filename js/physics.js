// physics.js — DANBO World
// ============================================================
//  PHYSICS
// ============================================================
const GRAVITY=CHAR_PHYSICS.GRAVITY, JUMP_FORCE=CHAR_PHYSICS.JUMP_FORCE, MOVE_ACCEL=CHAR_PHYSICS.MOVE_ACCEL, MAX_SPEED=CHAR_PHYSICS.MAX_SPEED, FRICTION=CHAR_PHYSICS.FRICTION;
var MOON_CITY_SIZE=CITY_CONFIG.moonSize;

// (spherical _moonProject removed — moon is now flat city)
// (spherical _moonOrient removed — moon is now flat city)

function updateEggPhysics(egg, isCity){
    // Safety: auto-release piledriver lock after 5 seconds to prevent permanent freeze
    if(egg._piledriverLocked){
        if(!egg._piledriverLockTimer)egg._piledriverLockTimer=300;
        egg._piledriverLockTimer--;
        if(egg._piledriverLockTimer<=0){egg._piledriverLocked=false;egg._piledriverLockTimer=0;}
        else return;
    }
    if(egg.heldBy)return;
    if(!egg.alive) return;
    // ---- Normal flat physics (used for all cities including moon) ----
    var grav=GRAVITY;
    egg.vy -= grav;
    // Terminal velocity — cap fall speed so high falls have visible duration
    if(egg.vy<-0.5)egg.vy=-0.5;
    egg._prevY=egg.mesh.position.y;
    egg.mesh.position.x += egg.vx + (egg.conveyorVx||0);
    egg.mesh.position.y += egg.vy;
    // NaN guard — reset to safe values if position becomes non-finite
    if(isNaN(egg.mesh.position.x)||isNaN(egg.mesh.position.y)||isNaN(egg.mesh.position.z)){
        egg.mesh.position.set(currentCityStyle===6?20:0,5,currentCityStyle===6?20:0);
        egg.vx=0;egg.vy=0;egg.vz=0;
    }
    // Thrown egg bounce
    if(egg.throwTimer>0&&egg.vy<-0.05){
        var _bFloor=0.01;
        if(!isCity){var _bgz=-egg.mesh.position.z;_bFloor=getFloorY(_bgz)+0.01;}
        if(egg.mesh.position.y<=_bFloor){
            if(egg._bounces>0){egg._bounces--;egg.vy=Math.abs(egg.vy)*0.5;egg.mesh.position.y=_bFloor;egg.squash=0.6;egg.vx*=0.75;egg.vz*=0.75;playHitSound(egg.mesh.position.x,egg.mesh.position.z);
                // Drop coins on first impact
                if(egg._dropCoinsOnLand&&!egg._coinsDropped){egg._coinsDropped=true;_dropNpcStolenCoins(egg);}
            } else {var _impSpd2=DANBO_WASM.len2D(egg.vx,egg.vz);egg.vy=0;egg.mesh.position.y=_bFloor;egg.vx*=0.3;egg.vz*=0.3;egg.throwTimer=0;if(_impSpd2>0.15){egg._stunTimer=Math.floor(20+_impSpd2*200);}playHitSound(egg.mesh.position.x,egg.mesh.position.z);
                if(egg._dropCoinsOnLand&&!egg._coinsDropped){egg._coinsDropped=true;_dropNpcStolenCoins(egg);}
                egg._dropCoinsOnLand=false;egg._coinsDropped=false;
            }
        }
    }
    egg.mesh.position.z += egg.vz + (egg.conveyorVz||0);
    egg.conveyorVx=0; egg.conveyorVz=0;

    if(isCity){
        // Platformer mode: no global ground, only cityColliders matter
        if(_pfActive){
            egg.onGround=false; // will be set by collider checks below
        } else {
        // City ground — only within city bounds
        var _cityBound=(currentCityStyle===5?MOON_CITY_SIZE:(currentCityStyle===7?CITY_SIZE*4:CITY_SIZE));
        var _inBounds=DANBO_WASM.aabb2D(egg.mesh.position.x,egg.mesh.position.z,0,0,_cityBound,_cityBound,0);
        var _groundY=currentCityStyle===7?3.01:0.01; // snow village island surface at y=3
        if(_inBounds&&egg.mesh.position.y<=_groundY){egg.mesh.position.y=_groundY;if(egg.vy<-0.1)egg.squash=0.7;egg.vy=0;egg.onGround=true;
            if(egg._dropCoinsOnLand&&!egg._coinsDropped){egg._coinsDropped=true;_dropNpcStolenCoins(egg);}
        }else if(!_inBounds){egg.onGround=false;}
        else{egg.onGround=false;}
        }
        // Snow Village: fall into lake = respawn (lake is between island and outer shore)
        if(currentCityStyle===7){
            var _snowDist=DANBO_WASM.dist2D(egg.mesh.position.x,egg.mesh.position.z,0,0);
            var _snowIslandR2=CITY_SIZE*0.8; // island radius
            // Skip lake check if near dock area (entire south quadrant + bridge collider zone)
            var _onDock=false;
            // Check if standing on any bridge collider (dock, etc)
            for(var _dci=0;_dci<cityColliders.length;_dci++){
                var _dc=cityColliders[_dci];
                if(!_dc._bridge)continue;
                if(DANBO_WASM.aabb2D(egg.mesh.position.x,egg.mesh.position.z,_dc.x,_dc.z,_dc.hw,_dc.hd,1))_onDock=true;
            }
            if(DANBO_WASM.absDeltaLess(egg.mesh.position.x,0,20)&&egg.mesh.position.z>_snowIslandR2-25)_onDock=true;
            if(_snowDist>_snowIslandR2&&egg.mesh.position.y<3.5&&!_onDock){
                egg.mesh.position.set(0,6,0);egg.vx=0;egg.vy=0;egg.vz=0;
                egg.onGround=false;egg.squash=0.5;
                if(egg.isPlayer){playHitSound();playSplashSound();}
            }
        }
        // City bounds — no wall, can fall off edge
        const bound=(currentCityStyle===5?MOON_CITY_SIZE:(currentCityStyle===7?CITY_SIZE*4:CITY_SIZE));
        // Fall respawn: if egg falls below -5, respawn at center
        if(egg.mesh.position.y<-5){
            if(currentCityStyle===5){
                // Moon: respawn inside Von Braun
                egg.mesh.position.set(-200,5,0);
            } else if(currentCityStyle===7){
                // Snow Village: respawn on island center (surface at y=3)
                egg.mesh.position.set(0,6,0);
            } else if(currentCityStyle===6){
                // Sakura: respawn above red bridge
                egg.mesh.position.set(0,14,-30);
            } else {
                // Ground city: splash into fountain pool
                egg.mesh.position.set((Math.random()-0.5)*4,8,(Math.random()-0.5)*4);
            }
            egg.vx=0;egg.vy=0;egg.vz=0;egg.onGround=false;egg.squash=0.5;
            if(egg.isPlayer){playHitSound();playSplashSound();}
            // Drop coins on fall
            _dropNpcStolenCoins(egg);
        }
        // Remove ground collision beyond city edge — let eggs fall
        if(Math.abs(egg.mesh.position.x)>bound||Math.abs(egg.mesh.position.z)>bound){
            // Past city edge: no ground, just gravity
            egg.onGround=false;
        }
        // AT Field shield collision — block player/NPC except at door openings
        if(currentCityStyle===5&&window._moonShields){
            for(var _si=0;_si<window._moonShields.length;_si++){
                var _sh=window._moonShields[_si];
                var _sdx=egg.mesh.position.x-_sh.x;
                var _sdz=egg.mesh.position.z-_sh.z;
                var _sdist=DANBO_WASM.dist2D(egg.mesh.position.x,egg.mesh.position.z,_sh.x,_sh.z);
                // Check if egg is near the shield boundary (inside or crossing)
                if(_sdist<_sh.r+3&&_sdist>_sh.r-6){
                    // Check if near a door opening
                    var _sAngle=Math.atan2(_sdz,_sdx);
                    if(_sAngle<0)_sAngle+=Math.PI*2;
                    var _atDoor=false;
                    for(var _di=0;_di<_sh.doors.length;_di++){
                        var _da=_sh.doors[_di].a;var _dw=_sh.doors[_di].w;
                        var _diff=DANBO_WASM.angleDiff(_sAngle,_da);
                        if(_diff<_dw){_atDoor=true;break;}
                    }
                    if(!_atDoor){
                        // Push egg out of shield
                        if(_sdist<_sh.r){
                            // Inside shield near boundary (not at door) — block exit
                            var _moveDir=egg.vx*_sdx+egg.vz*_sdz; // positive = moving outward
                            if(_moveDir>0){
                                // Moving outward through wall — push back in
                                var _pushR=_sh.r-1;
                                egg.mesh.position.x=_sh.x+(_sdx/_sdist)*_pushR;
                                egg.mesh.position.z=_sh.z+(_sdz/_sdist)*_pushR;
                                // Reflect velocity along shield normal
                                var _nx=_sdx/_sdist,_nz=_sdz/_sdist;
                                var _vdot=egg.vx*_nx+egg.vz*_nz;
                                egg.vx-=2*_vdot*_nx;egg.vz-=2*_vdot*_nz;
                                egg.vx*=0.3;egg.vz*=0.3;
                            }
                        }else{
                            // Outside shield trying to enter — push out
                            var _pushR2=_sh.r+0.5;
                            egg.mesh.position.x=_sh.x+(_sdx/_sdist)*_pushR2;
                            egg.mesh.position.z=_sh.z+(_sdz/_sdist)*_pushR2;
                            var _nx2=_sdx/_sdist,_nz2=_sdz/_sdist;
                            var _vdot2=egg.vx*_nx2+egg.vz*_nz2;
                            if(_vdot2<0){
                                egg.vx-=2*_vdot2*_nx2;egg.vz-=2*_vdot2*_nz2;
                                egg.vx*=0.3;egg.vz*=0.3;
                            }
                        }
                    }
                }
            }
        }
        // Building collisions — can land on roof
        // Thrown eggs: check building wall collision → drop coins + stop
        if(egg.throwTimer>0){
            for(var tci=0;tci<cityColliders.length;tci++){
                var tc=cityColliders[tci];
                var tdx=egg.mesh.position.x-tc.x, tdz=egg.mesh.position.z-tc.z;
                var _tov=DANBO_WASM.aabbOverlap2D(egg.mesh.position.x,egg.mesh.position.z,tc.x,tc.z,tc.hw,tc.hd,egg.radius);
                if(_tov[7]){
                    // Hit building wall — bounce back and drop coins
                    if(_tov[4]===0){egg.mesh.position.x+=_tov[5]*_tov[2];egg.vx*=-0.3;}
                    else{egg.mesh.position.z+=_tov[6]*_tov[3];egg.vz*=-0.3;}
                    if(egg._dropCoinsOnLand&&!egg._coinsDropped){egg._coinsDropped=true;_dropNpcStolenCoins(egg);}
                    var _wallImpSpd=DANBO_WASM.len2D(egg.vx,egg.vz);
                    egg.throwTimer=1;if(_wallImpSpd>0.2){egg._stunTimer=Math.floor(20+_wallImpSpd*250);}
                    egg.squash=0.6;playHitSound(egg.mesh.position.x,egg.mesh.position.z);
                    break;
                }
            }
            // Thrown egg hits other NPCs → knockback + drop coins
            for(var tei=0;tei<allEggs.length;tei++){
                var te=allEggs[tei];
                if(te===egg||!te.alive||te.heldBy)continue;
                if(te._slamImmune&&te._slamImmune>0)continue; // immune after body slam
                var htdx=egg.mesh.position.x-te.mesh.position.x;
                var htdz=egg.mesh.position.z-te.mesh.position.z;
                var htdy=egg.mesh.position.y-te.mesh.position.y;
                var htd=DANBO_WASM.dist3D(egg.mesh.position.x,egg.mesh.position.y,egg.mesh.position.z,te.mesh.position.x,te.mesh.position.y,te.mesh.position.z);
                if(htd<2.0){
                    // Knockback the hit NPC
                    var kbf=0.3;
                    te.vx-=htdx/htd*kbf;te.vz-=htdz/htd*kbf;te.vy+=0.12;
                    te.squash=0.6;
                    // Drop coins from thrown NPC on impact
                    if(egg._dropCoinsOnLand&&!egg._coinsDropped){egg._coinsDropped=true;_dropNpcStolenCoins(egg);}
                    // Also drop coins from hit NPC
                    _dropNpcStolenCoins(te);
                    egg.vx*=0.3;egg.vz*=0.3;
                    egg.squash=0.6;playHitSound(egg.mesh.position.x,egg.mesh.position.z);
                    break;
                }
            }
        } else for(const c of cityColliders){
            // Gap floor: only for NPCs, player falls through
            if(c._gapFloor&&egg.isPlayer)continue;
            const dx=egg.mesh.position.x-c.x, dz=egg.mesh.position.z-c.z;
            // Cone roof collision — checked independently of box AABB
            if(c.roofR&&c.roofH){
                var distFromCenter=DANBO_WASM.dist2D(egg.mesh.position.x,egg.mesh.position.z,c.x,c.z);
                var ey=egg.mesh.position.y;
                var roofBase=c.h||6;
                if(distFromCenter<c.roofR+egg.radius){
                    var slopeT=Math.max(0,1-distFromCenter/c.roofR);
                    var surfaceY=roofBase+slopeT*c.roofH;
                    // Land only when falling through the surface (penetration correction)
                    if(egg.vy<=0&&ey<=surfaceY+0.05&&ey>=surfaceY-1.0){
                        egg.mesh.position.y=surfaceY+0.01;egg.vy=0;egg.onGround=true;
                        continue;
                    }
                }
            }
            var _cov=DANBO_WASM.aabbOverlap2D(egg.mesh.position.x,egg.mesh.position.z,c.x,c.z,c.hw,c.hd,egg.radius);
            if(_cov[7]){
                var roofY=(c.y||0)+(c.h||6);
                // Babel tower: skip roof snap if player is on/near clouds (above roofY)
                var landBelow=c._bridge?2.5:1.0; // bridges allow smooth stepping up
                var skipBabelSnap=false;
                if(c._babel&&egg.mesh.position.y>roofY-2){skipBabelSnap=true;}
                // On top of building body — land on roof (penetration correction only)
                if(!skipBabelSnap&&DANBO_WASM.aabb2D(egg.mesh.position.x,egg.mesh.position.z,c.x,c.z,c.hw,c.hd,0)&&egg.vy<=0&&egg.mesh.position.y<=roofY+0.05&&egg.mesh.position.y>=roofY-landBelow){
                    egg.mesh.position.y=roofY+0.01;egg.vy=0;egg.onGround=true;
                }
                // Jumping upward past building — let egg phase through walls while going up
                else if(egg.vy>0.05){
                    // Allow vertical movement, no horizontal push
                }
                // Bridge colliders: no horizontal push-out, only land on top
                else if(c._bridge){
                    // skip — bridges don't push eggs sideways
                }
                // Below roof — push out horizontally (but not for Babel tower when falling from above)
                else if(egg.mesh.position.y<roofY-0.3){
                    if(c._babel&&egg.mesh.position.y>2&&egg.vy<0){
                        // Falling alongside Babel tower — don't push out, let gravity work
                    } else {
                    if(_cov[4]===0){egg.mesh.position.x+=_cov[5]*_cov[2];egg.vx*=-0.2;}
                    else{egg.mesh.position.z+=_cov[6]*_cov[3];egg.vz*=-0.2;}
                    // Pushed out at height — ensure gravity applies (not stuck as onGround)
                    if(egg.mesh.position.y>roofY+1)egg.onGround=false;
                    }
                }
            }
        }
    
        // City prop collisions (skip if thrown)
        if(egg.throwTimer<=0) for(var pi=0;pi<cityProps.length;pi++){
            var cp=cityProps[pi];
            if(cp.grabbed)continue;
            var pdx=egg.mesh.position.x-cp.group.position.x;
            var pdz=egg.mesh.position.z-cp.group.position.z;
            var pd=DANBO_WASM.dist2D(egg.mesh.position.x,egg.mesh.position.z,cp.group.position.x,cp.group.position.z);
            if(pd<cp.radius+egg.radius&&pd>0.01){
                // Check if egg is above the prop — stand on it
                var propTopY=cp.group.position.y+(cp.type==='bench'?0.7:cp.type==='tree'?1.5:2.5);
                if(egg.mesh.position.y>propTopY-0.3&&egg.vy<=0){
                    egg.mesh.position.y=propTopY+0.01;
                    egg.vy=0; egg.onGround=true;
                } else {
                    var pov=cp.radius+egg.radius-pd;
                    egg.mesh.position.x+=pdx/pd*pov;
                    egg.mesh.position.z+=pdz/pd*pov;
                    egg.vx*=-0.2;egg.vz*=-0.2;
                }
            }
        }
        // Cloud platform collisions — can land on clouds
        for(var cli=0;cli<cityCloudPlatforms.length;cli++){
            var cl=cityCloudPlatforms[cli];
            var cdx=egg.mesh.position.x-cl.x, cdz=egg.mesh.position.z-cl.z;
            if(DANBO_WASM.aabb2D(egg.mesh.position.x,egg.mesh.position.z,cl.x,cl.z,cl.hw,cl.hd,0)){
                // Land on top of cloud visual surface
                var cloudTop=cl.y+(cl.top||1.2);
                if(egg.vy<=0&&egg.mesh.position.y<=cloudTop+0.3&&egg.mesh.position.y>=cloudTop-2.0){
                    egg.mesh.position.y=cloudTop+0.01;egg.vy=0;egg.onGround=true;
                    egg._onCloud=cl;
                    // Flatten cloud visually when stood on (easier to see platform)
                    if(cl.group){
                        var _tgtSY=0.3;
                        for(var cci=0;cci<cl.group.children.length;cci++){
                            var cc=cl.group.children[cci];
                            cc.scale.y+=(cc.scale.x*_tgtSY-cc.scale.y)*0.15;
                        }
                    }
                }
            }
            // Restore cloud shape when nobody on it
            if(cl.group&&(!egg._onCloud||egg._onCloud!==cl)){
                for(var cci2=0;cci2<cl.group.children.length;cci2++){
                    var cc2=cl.group.children[cci2];
                    cc2.scale.y+=(cc2.scale.x*0.45-cc2.scale.y)*0.05;
                }
            }
        }
        // Moving cloud carry — always apply if standing on a moving cloud
        if(egg._onCloud&&egg._onCloud.moving&&egg.onGround){
            var oc=egg._onCloud;
            var mOff=Math.sin(oc.movePhase)*oc.moveRange;
            var mOffPrev=Math.sin(oc.movePhase-oc.moveSpeed)*oc.moveRange;
            var delta=mOff-mOffPrev;
            if(oc.moveAxis==='x')egg.mesh.position.x+=delta;
            else egg.mesh.position.z+=delta;
        }
        if(!egg.onGround)egg._onCloud=null;
        // Warp pipe — now handled in gameloop.js updateCity portal check
        if(egg.isPlayer){
            // Cloud world moon pipe — proximity prompt
            if(_cloudWorldPipe&&!_pipeTraveling&&!_portalConfirmOpen&&!_spinDashing){
                var mp=_cloudWorldPipe;
                var mdx=egg.mesh.position.x-mp.x,mdz=egg.mesh.position.z-mp.z;
                var mdist=DANBO_WASM.dist2D(egg.mesh.position.x,egg.mesh.position.z,mp.x,mp.z);
                var mrange=(typeof _danboPortalConfirmRange==='function')?_danboPortalConfirmRange(PORTAL_CONFIG.confirmDist,true):(PORTAL_CONFIG.confirmDist+1.6);
                if(mdist<mrange&&egg.mesh.position.y>=mp.y-5&&egg.mesh.position.y<=mp.y+15&&!mp._cooldown){
                    mp._cooldown=true;
                    _showMoonPipePrompt();
                }
                if(mdist>PORTAL_CONFIG.triggerDist){mp._cooldown=false;}
            }
        }
} else {
        // Race track
        const gz=-egg.mesh.position.z;
        const hw=getHW(gz), floorY=getFloorY(gz);
        if(egg.mesh.position.y<=floorY+0.01){egg.mesh.position.y=floorY+0.01;if(egg.vy<-0.1)egg.squash=0.7;egg.vy=0;egg.onGround=true;}else{egg.onGround=false;}
        // Platform check
        egg.onPlatform=null;
        for(const ob of _danboRaceObstacles()){
            if(ob.type!=='platform')continue;
            const d=ob.data, px=ob.mesh.position.x, pz=ob.mesh.position.z;
            if(DANBO_WASM.aabb2D(egg.mesh.position.x,egg.mesh.position.z,px,pz,d.width/2,d.depth/2,egg.radius*0.5)&&egg.mesh.position.y<=d.fy+0.3&&egg.mesh.position.y>=d.fy-0.5&&egg.vy<=0){
                egg.mesh.position.y=d.fy+0.01;egg.vy=0;egg.onGround=true;egg.onPlatform=ob;
            }
        }
        if(Math.abs(egg.mesh.position.x)>hw-egg.radius){egg.mesh.position.x=Math.sign(egg.mesh.position.x)*(hw-egg.radius);egg.vx*=-0.3;}
        // Fall respawn
        if(egg.mesh.position.y<-5){
            const rz=Math.max(0,gz-5);
            egg.mesh.position.set((Math.random()-0.5)*4,getFloorY(rz)+5,-rz);
            egg.vx=0;egg.vy=0;egg.vz=0;
            egg.squash=0.3; // poof effect
            egg._fallPenalty=60; // 1 second stun after respawn
            if(egg.holding){var h=egg.holding;h.heldBy=null;egg.holding=null;if(h.struggleBar){h.mesh.remove(h.struggleBar);h.struggleBar=null;}}
            if(egg.holdingObs){egg.holdingObs._grabbed=false;egg.holdingObs=null;}
            if(egg.holdingProp){egg.holdingProp.grabbed=false;egg.holdingProp=null;}
            if(egg.heldBy){var hdr=egg.heldBy;hdr.holding=null;egg.heldBy=null;if(egg.struggleBar){egg.mesh.remove(egg.struggleBar);egg.struggleBar=null;}}
        }
        // Fall penalty stun countdown
        if(egg._fallPenalty>0){egg._fallPenalty--;egg.vx=0;egg.vz=0;}
        // Power-up timer countdowns
        if(egg._speedBoost>0)egg._speedBoost--;
        if(egg._shieldTimer>0)egg._shieldTimer--;
        if(egg._coinMagnet>0)egg._coinMagnet--;
        // Finish — cross the finish line (arch gate at trackLength)
        var _rw=window.DANBO_MINIGAME_WASM&&DANBO_MINIGAME_WASM.race;
        if(_rw?_rw.finishCrossed(egg.finished,_pfActive,trackLength,gz):(!egg.finished&&!_pfActive&&trackLength>0&&gz>=trackLength-2)){
            egg.finished=true;egg.finishOrder=finishedEggs.length;finishedEggs.push(egg);
            egg.squash=0.5; // celebrate squash
            if(egg.isPlayer){
                playerFinished=true;
                // Victory flash + sound
                if(sfxEnabled){var _fCtx=ensureAudio();if(_fCtx){var _ft=_fCtx.currentTime;
                    var _fo=_fCtx.createOscillator();var _fg=_fCtx.createGain();
                    _fo.type='triangle';_fo.frequency.setValueAtTime(800,_ft);_fo.frequency.linearRampToValueAtTime(1600,_ft+0.3);
                    _fg.gain.setValueAtTime(0.15,_ft);_fg.gain.exponentialRampToValueAtTime(0.001,_ft+0.4);
                    _fo.connect(_fg);_fg.connect(_fCtx.destination);_fo.start(_ft);_fo.stop(_ft+0.4);
                }}
            }
        }
    }

    if(egg.throwTimer>0){egg.throwTimer--;var _eDrag2=egg._chargeDrag||0.98;egg.vx*=_eDrag2;egg.vz*=_eDrag2;if(egg.throwTimer<=0){
        // Fallback: drop coins when throw ends if not already dropped
        if(egg._dropCoinsOnLand&&!egg._coinsDropped){egg._coinsDropped=true;_dropNpcStolenCoins(egg);}
        egg._dropCoinsOnLand=false;egg._coinsDropped=false;
        var _impSpd3=DANBO_WASM.len2D(egg.vx,egg.vz);
        if(_impSpd3>0.15){egg._stunTimer=Math.floor(20+_impSpd3*200);}
    }}else{egg.vx*=FRICTION;egg.vz*=FRICTION;}

    // Walk anim
    var speed=DANBO_WASM.len2D(egg.vx,egg.vz);
    var prevPhase=egg.walkPhase;
    if(speed>0.005&&egg.onGround)egg.walkPhase+=speed*20; else egg.walkPhase*=0.85;
    // Step sound for player
    if(egg.isPlayer&&speed>0.02&&egg.onGround){
        var prevStep=Math.floor(prevPhase/Math.PI);
        var curStep=Math.floor(egg.walkPhase/Math.PI);
        if(curStep!==prevStep) playStepSound();
    }
    var feet=egg.mesh.userData.feet, body=egg.mesh.userData.body;
    if(feet&&feet.length===2){
        const sw=Math.sin(egg.walkPhase)*0.14;
        feet[0].position.z=0.06+sw; feet[1].position.z=0.06-sw;
        feet[0].position.y=0.05+Math.max(0,Math.sin(egg.walkPhase))*0.07;
        feet[1].position.y=0.05+Math.max(0,-Math.sin(egg.walkPhase))*0.07;
    }
    if(typeof _updateCharacterPremiumRig==='function')_updateCharacterPremiumRig(egg,speed);
    // ============================================================
    // BODY ROTATION — single source of truth, attack > walk
    // ============================================================
    var _attackAnim=!!(egg._hondaDash||egg._blankaSpinTimer||egg._guileSomersault);
    if(body){
        if(egg._hondaDash>0){
            egg.mesh.scale.set(1,1,1);
            // Visual handled by player.js quaternion
        } else if(egg._blankaSpinTimer>0||egg._blankaSpinFalling){
            // Rotation handled in FINAL block at end of function
        } else if(egg._guileSomersault>0){
            // Guile somersault: handled elsewhere
        } else {
            // Normal walk lean
            var _isSpinning2=(egg.isPlayer&&_spinDashing)||(egg._npcSpinTimer&&egg._npcSpinTimer>=30&&egg._npcSpinTimer<90);
            if(!_isSpinning2){
                var tz=Math.sin(egg.walkPhase)*speed*0.25;var tx=-speed*0.35;
                body.rotation.z+=(tz-body.rotation.z)*0.1;
                body.rotation.x+=(tx-body.rotation.x)*0.1;
            }
        }
    }

    var sq=egg.squash; egg.squash+=(1-egg.squash)*0.15;
    var _sqSign=(egg.mesh.scale.y<0)?-1:1;
    // Scale: attack animations override squash
    if(egg._hondaDash>0){
        egg.mesh.scale.set(1,1,1);
        egg.mesh.rotation.y=Math.atan2(egg._dashDirX||0,egg._dashDirZ||0);
        egg.mesh.rotation.x=0;egg.mesh.rotation.z=0;
        // Phase-based velocity
        var _hdP3=(egg._hondaDashTotal||60)-egg._hondaDash;
        if(_hdP3<8){egg.vy=0.08;egg.vx=(egg._dashDirX||0)*0.3;egg.vz=(egg._dashDirZ||0)*0.3;}
        else if(egg._hondaDash>5){egg.vx=egg._dashDirX;egg.vz=egg._dashDirZ;egg.mesh.position.y=Math.max(egg.mesh.position.y,0.8);}
        else{egg.vx*=0.7;egg.vz*=0.7;}
        if(egg._hondaDash<=0&&body){body.rotation.x=0;}
    } else if(egg._blankaSpinTimer>0){
        // Scale already set in body rotation block
    } else{egg.mesh.scale.set(1+(1-sq)*0.3,sq*_sqSign,1+(1-sq)*0.3);}
    if(egg._slamImmune>0)egg._slamImmune--;

    // Egg randomly wobbles (not always — random trigger)
    if(egg._wobbleTimer===undefined){egg._wobbleTimer=0;egg._wobbleAmt=0;egg._wobbleDir=1;}
    if(egg._wobbleTimer<=0&&speed>0.01&&Math.random()<0.003){
        egg._wobbleTimer=60+Math.floor(Math.random()*120);
        egg._wobbleAmt=0.15+Math.random()*0.25;
        egg._wobbleDir=Math.random()<0.5?1:-1;
    }
    var _isBlankaSpinning=(egg._blankaSpinTimer>0||egg._blankaSpinFalling)&&!egg._hondaDash;
    if(!_isBlankaSpinning){
        if(egg._wobbleTimer>0){
            egg._wobbleTimer--;
            var wob=Math.sin(egg.walkPhase*1.5)*egg._wobbleAmt*egg._wobbleDir;
            egg.mesh.rotation.z+=(wob-egg.mesh.rotation.z)*0.1;
            egg.mesh.rotation.x+=(wob*0.5-egg.mesh.rotation.x)*0.1;
        } else if(!_attackAnim){
            egg.mesh.rotation.x+=(0-egg.mesh.rotation.x)*0.12;
            egg.mesh.rotation.z+=(0-egg.mesh.rotation.z)*0.12;
        }
    }

    if(speed>0.01&&!_isBlankaSpinning){
        // Skip facing update during backstep or post-dash bounce or Dhalsim attack
        if(!(egg.isPlayer&&(egg._dashBounceTimer>0||egg._hondaDash>0||(egg._atkAnim>0&&egg.mesh.userData._charType==='cockroach')))){
        const ta=Math.atan2(egg.vx,egg.vz);
        let diff=ta-egg.mesh.rotation.y;
        while(diff>Math.PI)diff-=Math.PI*2; while(diff<-Math.PI)diff+=Math.PI*2;
        egg.mesh.rotation.y+=diff*0.2; // smooth but quick turn
        }
    }
    // Clamp max height to prevent flying off screen
    // No height limit — let eggs fly freely
    if(egg.arrow)egg.arrow.position.y=2.0+Math.sin(Date.now()*0.005)*0.15;
    // ---- FINAL: Honda headbutt tilt (MUST be last to override everything) ----
    if(egg._hondaDash>0&&!egg._blankaRoll&&egg._dashDirX!==undefined){
        var _hdT=egg._hondaDashTotal||60;
        var _hdP=_hdT-egg._hondaDash;
        var _hdA=0;
        if(_hdP<8){_hdA=(_hdP/8)*1.57;}
        else if(egg._hondaDash>5){_hdA=1.57;}
        else{var _l2=(5-egg._hondaDash)/5;_hdA=egg._hondaBounced?-1.57*(1-_l2):1.57*(1-_l2);}
        // Tilt axis = local right axis (perpendicular to facing)
        var _hdF=Math.atan2(egg._dashDirX,egg._dashDirZ);
        // Use Euler YXZ: first face direction (Y), then tilt forward (X)
        egg.mesh.rotation.order='YXZ';
        egg.mesh.rotation.y=_hdF;
        egg.mesh.rotation.x=_hdA;
        egg.mesh.rotation.z=0;
    }
    // ---- FINAL: Blanka roll spin — body self-rotation (pivot at body center, no sway) ----
    if(_isBlankaSpinning){
        if(egg._blankaSpinAngle===undefined)egg._blankaSpinAngle=0;
        egg._blankaSpinAngle+=0.6;
        // Mesh only handles facing direction — no X/Z rotation on mesh
        if(egg._blankaSpinDirX!==undefined){
            egg.mesh.rotation.y=Math.atan2(egg._blankaSpinDirX,egg._blankaSpinDirZ);
        } else if(egg._dashFaceY!==undefined){
            egg.mesh.rotation.y=egg._dashFaceY;
        }
        egg.mesh.rotation.x=0;
        egg.mesh.rotation.z=0;
        // Spin the body child around its own center (no wobble/sway)
        var _brB=egg.mesh.userData.body;
        if(_brB)_brB.rotation.x=egg._blankaSpinAngle;
        // Also spin eyes/smile/features by hiding feet
        var _brFeet=egg.mesh.userData.feet;
        if(_brFeet){_brFeet[0].visible=false;_brFeet[1].visible=false;}
        egg.mesh.scale.set(1,1,1);
    } else {
        // Restore feet visibility
        var _brFeet2=egg.mesh.userData.feet;
        if(_brFeet2&&_brFeet2[0]&&!_brFeet2[0].visible){_brFeet2[0].visible=true;_brFeet2[1].visible=true;}
    }
}

// ---- Egg-to-egg collision ----
function resolveEggCollisions(eggList){
    for(let i=0;i<eggList.length;i++){
        const a=eggList[i];
        if(!a.alive||a.heldBy||a._piledriverLocked)continue;
        for(let j=i+1;j<eggList.length;j++){
            const b=eggList[j];
            if(!b.alive||b.heldBy||b._piledriverLocked)continue;
            const dx=b.mesh.position.x-a.mesh.position.x;
            const dz=b.mesh.position.z-a.mesh.position.z;
            const dy=b.mesh.position.y-a.mesh.position.y;
            const dist=DANBO_WASM.dist3D(b.mesh.position.x,b.mesh.position.y,b.mesh.position.z,a.mesh.position.x,a.mesh.position.y,a.mesh.position.z);
            const minDist=a.radius+b.radius;
            if(dist<minDist&&dist>0.01){
                const overlap=(minDist-dist)*0.5;
                const nx=dx/dist, nz=dz/dist, ny=dy/dist;
                a.mesh.position.x-=nx*overlap;
                a.mesh.position.z-=nz*overlap;
                b.mesh.position.x+=nx*overlap;
                b.mesh.position.z+=nz*overlap;
                // Bounce velocities
                const pushStr=0.06;
                a.vx-=nx*pushStr; a.vz-=nz*pushStr;
                b.vx+=nx*pushStr; b.vz+=nz*pushStr;
                // Slight squash on contact
                a.squash=Math.min(a.squash,0.85);
                b.squash=Math.min(b.squash,0.85);
            }
        }
    }
}
