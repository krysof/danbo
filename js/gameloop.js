// gameloop.js — DANBO World
// Global error handler — shows errors on mobile
window.onerror=function(msg,url,line){if(!window._errShown){window._errShown=true;var fn=url?url.split('/').pop().split('?')[0]:'?';alert('Error: '+msg+' ('+fn+':'+line+')');}};
window.addEventListener('unhandledrejection',function(e){if(!window._errShown){window._errShown=true;alert('Promise error: '+e.reason);}});
// ============================================================
//  CITY UPDATE (portals, coins, NPCs)
// ============================================================
var _cityFrameNo=0;

function _danboPortalDist2D(px,pz,tx,tz){
    return DANBO_WASM.dist2D(px,pz,tx,tz);
}
function _danboPortalHeightWithin(a,b,limit){
    return DANBO_WASM.absDeltaWithin(a,b,limit);
}
function _danboPortalNearGround(egg,py){
    if(!egg)return false;
    return DANBO_WASM.nearGround(egg.onGround,egg.vy||0,py);
}
function _danboPortalConfirmRange(confirmDist,isWarpPipe){
    // Keep a small forgiving margin, but do not make the whole prompt area count
    // as the entrance. This prevents portals from triggering when merely nearby.
    return DANBO_WASM.confirmRange(confirmDist,!!isWarpPipe);
}
function _danboRacePortalHeightOk(py,portalY){
    return DANBO_WASM.racePortalHeightOk(py,portalY);
}
function _danboWarpPipeHeightOk(py){
    return DANBO_WASM.warpPipeHeightOk(py);
}
function _danboPortalAction(distance,triggerDist,confirmDist,isWarpPipe,isVoluntary){
    return DANBO_WASM.portalAction(distance,triggerDist,confirmDist,!!isWarpPipe,!!isVoluntary);
}
function _danboPortalDismissKey(portal){
    if(!portal)return null;
    if(portal.raceIndex>=0)return 'race:'+portal.raceIndex;
    if(portal._isWarpPipe)return 'pipe:'+portal._targetStyle;
    if(portal._hiddenType)return 'hidden:'+portal._hiddenType+':'+(portal._targetStyle||0);
    return 'target:'+(portal._targetStyle||0);
}

function _forEachObjectMaterial(obj,cb){
    if(!obj||!cb)return;
    var seen=[];
    function visit(o){
        if(!o||!o.material)return;
        var mats=Array.isArray(o.material)?o.material:[o.material];
        for(var mi=0;mi<mats.length;mi++){
            var mat=mats[mi];
            if(!mat||seen.indexOf(mat)!==-1)continue;
            seen.push(mat);
            cb(mat,o);
        }
    }
    if(obj.traverse)obj.traverse(visit);
    else visit(obj);
}

function _safeMaterialColorHex(obj,fallback){
    var color;
    _forEachObjectMaterial(obj,function(mat){
        if(color===undefined&&mat.color&&mat.color.getHex)color=mat.color.getHex();
    });
    return color===undefined?fallback:color;
}

function _safeSetEmissive(obj,hex,intensity){
    var restore=(hex===0x000000||hex===undefined||hex===null);
    _forEachObjectMaterial(obj,function(mat){
        if(mat.emissive&&mat.emissive.setHex){
            mat.emissive.setHex(restore?0x000000:hex);
            if(intensity!==undefined&&mat.emissiveIntensity!==undefined)mat.emissiveIntensity=intensity;
        } else if(mat.color&&mat.color.setHex){
            if(mat._safeBaseColor===undefined&&mat.color.getHex)mat._safeBaseColor=mat.color.getHex();
            if(restore){
                if(mat._safeBaseColor!==undefined)mat.color.setHex(mat._safeBaseColor);
            } else {
                mat.color.setHex(hex);
            }
        }
    });
}

function _safeSetEmissiveIntensity(obj,intensity){
    _forEachObjectMaterial(obj,function(mat){
        if(mat.emissiveIntensity!==undefined)mat.emissiveIntensity=intensity;
    });
}

function _pulseSaberMaterial(saberObj,hex){
    _safeSetEmissive(saberObj,hex);
}

// ---- Slash cut effect — vertical bright line + body splits briefly ----
if(!window._slashEffects)window._slashEffects=[];
function spawnSlashEffect(egg,faceY){
    // Bright vertical slash line at egg position
    var _slG=new THREE.PlaneGeometry(0.15,3.5);
    var _slM=new THREE.MeshBasicMaterial({color:0xFFFFFF,transparent:true,opacity:1,side:THREE.DoubleSide});
    var _slLine=new THREE.Mesh(_slG,_slM);
    _slLine.position.set(egg.mesh.position.x,egg.mesh.position.y+1,egg.mesh.position.z);
    _slLine.rotation.y=faceY;
    scene.add(_slLine);
    // Two half-body clones that separate
    var _slBody=egg.mesh.userData.body;
    var _slColor=_safeMaterialColorHex(_slBody,0xFFFFFF);
    var _halfL=new THREE.Mesh(new THREE.SphereGeometry(0.7,8,8,0,Math.PI),new THREE.MeshBasicMaterial({color:_slColor,transparent:true,opacity:0.7,side:THREE.DoubleSide}));
    var _halfR=new THREE.Mesh(new THREE.SphereGeometry(0.7,8,8,Math.PI,Math.PI),new THREE.MeshBasicMaterial({color:_slColor,transparent:true,opacity:0.7,side:THREE.DoubleSide}));
    _halfL.position.copy(_slLine.position);_halfR.position.copy(_slLine.position);
    _halfL.rotation.y=faceY;_halfR.rotation.y=faceY;
    scene.add(_halfL);scene.add(_halfR);
    window._slashEffects.push({line:_slLine,halfL:_halfL,halfR:_halfR,life:90,maxLife:90,faceY:faceY});
    // Flash enemy white briefly
    egg._slashFlash=8;
}
function updateSlashEffects(){
    for(var si=window._slashEffects.length-1;si>=0;si--){
        var s=window._slashEffects[si];
        s.life--;
        var t=s.life/s.maxLife;
        // Slash line fades
        s.line.material.opacity=t;
        s.line.scale.x=1+((1-t)*2);
        // Halves drift apart slowly then fade
        var perpX=Math.cos(s.faceY),perpZ=-Math.sin(s.faceY);
        s.halfL.position.x+=perpX*0.008;s.halfL.position.z+=perpZ*0.008;
        s.halfR.position.x-=perpX*0.008;s.halfR.position.z-=perpZ*0.008;
        s.halfL.material.opacity=t*0.7;s.halfR.material.opacity=t*0.7;
        if(s.life<=0){
            scene.remove(s.line);scene.remove(s.halfL);scene.remove(s.halfR);
            window._slashEffects.splice(si,1);
        }
    }
}

// Pain expression — squint eyes and open mouth when hurt
function _updatePainFace(egg){
    var ud=egg.mesh.userData;
    if(!ud._eyeWhites||!ud._pupils)return;
    var inPain=egg._hitStun>0||egg._stunTimer>0||egg.throwTimer>0||egg._electrocuted>0||egg._elecFlying>0;
    if(inPain){
        // Squint eyes — flatten vertically
        for(var i=0;i<ud._eyeWhites.length;i++){
            var base=ud._eyeBaseScales&&ud._eyeBaseScales[i]?ud._eyeBaseScales[i]:null;
            if(base)ud._eyeWhites[i].scale.set(base.x,base.y*0.16,base.z);
            else ud._eyeWhites[i].scale.set(1,0.2,0.7); // squished flat = squinting
            ud._pupils[i].visible=false;
            ud._shines[i].visible=false;
        }
        if(ud._irisDetails){for(var ii=0;ii<ud._irisDetails.length;ii++)ud._irisDetails[ii].visible=false;}
        // Mouth — open in pain (move smile down and scale)
        if(ud._smile){ud._smile.position.y=-0.05;ud._smile.scale.set(1.3,1.3,1.3);}
    } else {
        // Normal eyes
        for(var j=0;j<ud._eyeWhites.length;j++){
            var base2=ud._eyeBaseScales&&ud._eyeBaseScales[j]?ud._eyeBaseScales[j]:null;
            if(base2)ud._eyeWhites[j].scale.copy(base2);
            else ud._eyeWhites[j].scale.set(1,1.2,0.7);
            ud._pupils[j].visible=true;
            ud._shines[j].visible=true;
        }
        if(ud._irisDetails){for(var ij=0;ij<ud._irisDetails.length;ij++)ud._irisDetails[ij].visible=true;}
        if(ud._smile){ud._smile.position.y=0;ud._smile.scale.set(1,1,1);}
    }
}
function updateCity(){
    if(!playerEgg)return;
    const px=playerEgg.mesh.position.x, pz=playerEgg.mesh.position.z, py=playerEgg.mesh.position.y;
    _cityFrameNo++;

    // Slash cut effects
    updateSlashEffects();
    // Slash flash — briefly flash body white
    for(var _sfi=0;_sfi<allEggs.length;_sfi++){
        var _sfe=allEggs[_sfi];
        if(_sfe._slashFlash>0){
            _sfe._slashFlash--;
            var _sfBody=_sfe.mesh.userData.body;
            if(_sfBody){
                if(_sfe._slashFlash%2===0)_safeSetEmissive(_sfBody,0xFFFFFF);
                else _safeSetEmissive(_sfBody,0x000000);
                if(_sfe._slashFlash<=0)_safeSetEmissive(_sfBody,0x000000);
            }
        }
    }

    // Independent blade arc flight (after Guile interrupted)
    if(window._guileArcFly&&window._guileArc&&window._guileArc.visible){
        var _gaf=window._guileArcFly;
        _gaf.life--;
        window._guileArc.position.x+=Math.sin(_gaf.faceY)*0.03;
        window._guileArc.position.z+=Math.cos(_gaf.faceY)*0.03;
        window._guileArc.material.opacity=Math.max(0,_gaf.life/40)*0.85;
        if(_gaf.life<=0){window._guileArc.visible=false;window._guileArcFly=null;}
    }

    // Animate portals
    const t=Date.now()*0.001;
    if(typeof _updateVisualFX==='function')_updateVisualFX(px,py,pz,t);
    for(const p of portals){
        p.ring.rotation.z=t*0.5;
        p.inner.rotation.z=-t*0.8;
        // Particles orbit
        p.mesh.children.forEach(ch=>{
            if(ch.userData.orbitPhase!==undefined){
                const a=ch.userData.orbitPhase+t*1.5;
                ch.position.set(Math.cos(a)*1.8, 2.5+Math.sin(a*2)*0.5, Math.sin(a)*1.8);
            }
        });
    }

    // ---- Unified projectile update (all projectiles via moves.js) ----
    if(!window._allProjectiles)window._allProjectiles=[];
    for(var _api=window._allProjectiles.length-1;_api>=0;_api--){
        var _ap=window._allProjectiles[_api];
        if(!MoveProjectile_update(_ap)){
            MoveProjectile_cleanup(_ap);
            window._allProjectiles.splice(_api,1);
        }
    }

    // ---- Fountain water animation ----
    if(window._fountainPoolWater){
        var wt=Date.now()*0.002;
        window._fountainPoolWater.position.y=0.6+Math.sin(wt)*0.03;
        window._fountainPoolWater.rotation.y=wt*0.1;
    }
    if(window._fountainInnerWater){
        var wt2=Date.now()*0.003;
        window._fountainInnerWater.position.y=1.35+Math.sin(wt2+1)*0.02;
    }
    if(window._danboWaterBump){
        var _waterTime=Date.now()*0.000018;
        window._danboWaterBump.offset.set(_waterTime%1,(_waterTime*0.63)%1);
    }
    // ---- Fish animation (swim + jump + crawl back when thrown) ----
    if(window._waterWheels){
        for(var _wwi2=0;_wwi2<window._waterWheels.length;_wwi2++){
            window._waterWheels[_wwi2].children[0].rotation.x+=0.01; // rotate wheel
            for(var _wci=1;_wci<7;_wci++){window._waterWheels[_wwi2].children[_wci].rotation.z+=0.01;} // spokes
        }
    }
    if(window._cityFish){
        for(var _fi2=0;_fi2<window._cityFish.length;_fi2++){
            var fish=window._cityFish[_fi2];
            // Find matching prop
            var _fishProp=null;
            for(var _fpi=0;_fpi<cityProps.length;_fpi++){
                if(cityProps[_fpi]._fishRef===fish){_fishProp=cityProps[_fpi];break;}
            }
            // Sync grabbed state from prop
            if(_fishProp)fish.grabbed=_fishProp.grabbed;
            if(fish.grabbed)continue;
            // Skip animation while being thrown — let prop physics handle it
            if(_fishProp&&_fishProp.throwTimer>0){fish._thrownRecovery=180+Math.floor(Math.random()*300);continue;}
            // Post-throw recovery: lie still then flop back
            if(fish._thrownRecovery>0){
                fish._thrownRecovery--;
                if(fish.group.position.y>0.2){fish.group.position.y-=0.05;if(fish.group.position.y<0.2)fish.group.position.y=0.2;}
                if(fish._thrownRecovery>60){
                    // Lying still on ground (stunned)
                    fish.group.rotation.z=Math.PI/2*0.8;
                    fish.group.position.y=0.15+Math.abs(Math.sin(Date.now()*0.008))*0.05;
                    continue;
                }
                // Flop toward nearest water (center pool)
                var _ftpx=-fish.group.position.x;var _ftpz=-fish.group.position.z;
                var _ftpd=DANBO_WASM.len2D(_ftpx,_ftpz)||1;
                fish.group.position.x+=_ftpx/_ftpd*0.12;
                fish.group.position.z+=_ftpz/_ftpd*0.12;
                fish.group.position.y=0.15+Math.abs(Math.sin(Date.now()*0.015))*0.15;
                fish.group.rotation.y=Math.atan2(_ftpx,_ftpz);
                fish.group.rotation.z=Math.sin(Date.now()*0.02)*0.5;
                var _ftDist=DANBO_WASM.len2D(fish.group.position.x,fish.group.position.z);
                if(_ftDist<8||DANBO_WASM.absDeltaLess(_ftDist,25,4)||DANBO_WASM.absDeltaLess(_ftDist,55,4)){fish._thrownRecovery=0;fish.angle=Math.atan2(fish.group.position.z,fish.group.position.x);fish.radius=_ftDist||3;}
                continue;
            }
            // Check if fish was thrown and landed outside water — crawl back
            var fDistFromPool=DANBO_WASM.len2D(fish.group.position.x,fish.group.position.z);
            var _inWater=(fDistFromPool<7)||(DANBO_WASM.absDeltaLess(fDistFromPool,25,3))||(DANBO_WASM.absDeltaLess(fDistFromPool,55,3));
            // Also check radial canals (within 2 units of x=0 or z=0 axes)
            var _onCanalX=DANBO_WASM.absDeltaLess(fish.group.position.z,0,2)&&!DANBO_WASM.absDeltaWithin(fish.group.position.x,0,8);
            var _onCanalZ=DANBO_WASM.absDeltaLess(fish.group.position.x,0,2)&&!DANBO_WASM.absDeltaWithin(fish.group.position.z,0,8);
            if(_onCanalX||_onCanalZ)_inWater=true;
            if(!_inWater&&!fish.jumping){
                // Fish is on land — flop back to nearest water
                var fToPoolX=-fish.group.position.x;var fToPoolZ=-fish.group.position.z;
                var fToPoolD=DANBO_WASM.len2D(fToPoolX,fToPoolZ)||1;
                fish.group.position.x+=fToPoolX/fToPoolD*0.04;
                fish.group.position.z+=fToPoolZ/fToPoolD*0.04;
                fish.group.position.y=0.15;
                fish.group.rotation.y=Math.atan2(fToPoolX,fToPoolZ);
                fish.group.rotation.z=Math.sin(Date.now()*0.02)*0.5;
                fish.group.position.y+=Math.abs(Math.sin(Date.now()*0.015))*0.15;
                continue;
            }
            // In water — realistic fish swimming
            if(_inWater){
                fish.group.rotation.z=0;
                fish.group.rotation.x=0;
            }
            // Realistic swimming: vary speed, occasional pause, tail wiggle
            if(!fish._swimState)fish._swimState='swim';
            if(!fish._swimPause)fish._swimPause=0;
            if(!fish._swimSpeedMul)fish._swimSpeedMul=1;
            if(fish._swimPause>0){
                // Paused — idle drift
                fish._swimPause--;
                fish.group.position.y=fish.baseY+Math.sin(Date.now()*0.002+_fi2)*0.03;
                // Gentle tail wiggle while idle
                var _tailMesh=fish.group.children[1]; // tail cone
                if(_tailMesh)_tailMesh.rotation.y=Math.sin(Date.now()*0.005)*0.2;
            } else {
                // Swimming — move along circle with speed variation
                fish._swimSpeedMul+=(((Math.sin(Date.now()*0.001+_fi2*3)>0)?1.3:0.6)-fish._swimSpeedMul)*0.02;
                fish.angle+=fish.speed*fish._swimSpeedMul;
                fish.group.position.x=Math.cos(fish.angle)*fish.radius;
                fish.group.position.z=Math.sin(fish.angle)*fish.radius;
                // Face swimming direction with slight body sway
                fish.group.rotation.y=fish.angle+Math.PI/2+Math.sin(Date.now()*0.008)*0.1;
                // Tail wiggle while swimming (faster = more wiggle)
                var _tailM=fish.group.children[1];
                if(_tailM)_tailM.rotation.y=Math.sin(Date.now()*0.015)*0.4*fish._swimSpeedMul;
                // Body sway side to side
                fish.group.rotation.z=Math.sin(Date.now()*0.006+_fi2)*0.08;
                // Random pause
                if(Math.random()<0.002)fish._swimPause=60+Math.floor(Math.random()*120);
            }
            // Jump timer
            fish.jumpTimer--;
            if(fish.jumpTimer<=0&&!fish.jumping){
                fish.jumping=true;
                fish.jumpVy=0.08+Math.random()*0.06;
                fish.jumpTimer=180+Math.floor(Math.random()*300);
                if(sfxEnabled&&playerEgg){
                    var fdx2=fish.group.position.x-playerEgg.mesh.position.x;
                    var fdz2=fish.group.position.z-playerEgg.mesh.position.z;
                    if(fdx2*fdx2+fdz2*fdz2<400)playSplashSound();
                }
            }
            if(fish.jumping){
                fish.group.position.y+=fish.jumpVy;
                fish.jumpVy-=0.005;
                fish.group.rotation.x=Math.sin(Date.now()*0.01)*0.5;
                if(fish.group.position.y<=fish.baseY){
                    fish.group.position.y=fish.baseY;
                    fish.jumping=false;
                    fish.group.rotation.x=0;
                }
            } else {
                fish.group.position.y=fish.baseY+Math.sin(Date.now()*0.003+_fi2)*0.05;
            }
        }
    }
    if(window._fountainParticles){
        for(var ffi=0;ffi<window._fountainParticles.length;ffi++){
            var fp=window._fountainParticles[ffi];
            fp.life++;
            if(fp.life>=fp.maxLife||!fp.mesh.visible){
                // Respawn immediately — continuous spray
                fp.life=0;
                fp.mesh.position.set(fp.ox,fp.oy,fp.oz);
                fp.mesh.visible=true;
                fp.mesh.material.opacity=0.6;
                if(fp.type==='jet'){
                    fp.vx=(Math.random()-0.5)*0.12;
                    fp.vy=0.12+Math.random()*0.08;
                    fp.vz=(Math.random()-0.5)*0.12;
                    fp.maxLife=70+Math.random()*40;
                } else {
                    var lla2=fp._lionAngle||0;
                    fp.vx=-Math.cos(lla2)*0.1+(Math.random()-0.5)*0.03;
                    fp.vy=0.02+Math.random()*0.03;
                    fp.vz=-Math.sin(lla2)*0.1+(Math.random()-0.5)*0.03;
                    fp.maxLife=40+Math.random()*20;
                }
            }
            fp.mesh.position.x+=fp.vx;
            fp.mesh.position.z+=fp.vz;
            fp.mesh.position.y+=fp.vy;
            if(fp.type==='jet'){
                fp.vy-=0.004;
            } else {
                fp.vy-=0.003;
            }
            // Hit water surface — hide and respawn next frame
            if(fp.mesh.position.y<0.65){fp.mesh.visible=false;}
            var fAlpha=1-fp.life/fp.maxLife;
            fp.mesh.material.opacity=Math.max(0.05,0.7*fAlpha);
        }
    }
    // Fountain splash when player walks in water
    if(_splashCooldown>0)_splashCooldown--;
    if(_beamSoundCD>0)_beamSoundCD--;
    if(_explSoundCD>0)_explSoundCD--;
    if(_missileSoundCD>0)_missileSoundCD--;
    var _fdist=DANBO_WASM.len2D(px,pz);
    var _pspd=playerEgg?DANBO_WASM.len2D(playerEgg.vx||0,playerEgg.vz||0):0;
    if(_fdist<6.5&&playerEgg.mesh.position.y<1.5&&window._fountainSplashParticles){
        // Play splash sound on entry
        if(!playerEgg._inFountain){playerEgg._inFountain=true;playSplashSound();}
        // Check if player is moving (wading)
        var _spawnRate=_pspd>0.02?0.5:0.12; // more splashes when moving
        // Continuous wading splash particles
        for(var fsi2=0;fsi2<window._fountainSplashParticles.length;fsi2++){
            var fsp2=window._fountainSplashParticles[fsi2];
            if(!fsp2.mesh.visible&&fsp2.life>=fsp2.maxLife&&Math.random()<_spawnRate){
                fsp2.mesh.position.set(px+(Math.random()-0.5)*2,0.7,pz+(Math.random()-0.5)*2);
                fsp2.vx=(Math.random()-0.5)*0.2+(playerEgg.vx||0)*0.5;
                fsp2.vy=0.1+Math.random()*0.18;
                fsp2.vz=(Math.random()-0.5)*0.2+(playerEgg.vz||0)*0.5;
                fsp2.life=0;fsp2.maxLife=18+Math.random()*12;
                fsp2.mesh.visible=true;
            }
        }
    } else {
        if(playerEgg)playerEgg._inFountain=false;
    }
    // Periodic splash sound while wading
    if(playerEgg&&playerEgg._inFountain&&_pspd>0.03){playSplashSound();}
    // Always update visible splash particles even if player left
    if(window._fountainSplashParticles){
        for(var fsu=0;fsu<window._fountainSplashParticles.length;fsu++){
            var fsp3=window._fountainSplashParticles[fsu];
            if(fsp3.mesh.visible){
                fsp3.life++;
                fsp3.mesh.position.x+=fsp3.vx;
                fsp3.mesh.position.y+=fsp3.vy;
                fsp3.mesh.position.z+=fsp3.vz;
                fsp3.vy-=0.008;
                fsp3.mesh.material.opacity=0.7*(1-fsp3.life/fsp3.maxLife);
                if(fsp3.life>=fsp3.maxLife){fsp3.mesh.visible=false;}
            }
        }
    }

    // Check portal proximity — show prompt on base, enter when walk into ring
    // Skip portal triggers while spin dashing
    if(_pipeArrivalCooldown>0)_pipeArrivalCooldown--;
    var _pp=document.getElementById('portal-prompt');
    var _pt=document.getElementById('portal-prompt-text');
    var _portalBlocked=!!(playerEgg._hondaDash||playerEgg._blankaSpinTimer||playerEgg._tatsuActive||playerEgg._shoryuActive||playerEgg._guileSomersault||playerEgg.throwTimer>0||playerEgg._blankaShock||playerEgg._yogaFlame||playerEgg._hyakuretsuTimer||playerEgg._hyakuretsuKickTimer);
    if(_pipeTraveling||_pipeArrivalCooldown>0||_spinDashing||_portalBlocked||window._danboPluginTransition){_portalPromptPortal=null;if(_pp)_pp.style.display='none';} else {
    var _nearP=null, _nearD=9999;
    // Check race portals
    for(var pi=0;pi<portals.length;pi++){
        var _ppy=portals[pi].y||0;
        // Allow a little slope/step/fountain offset so portals do not feel dead.
        if(!_danboRacePortalHeightOk(py,_ppy))continue;
        var _d=_danboPortalDist2D(px,pz,portals[pi].x,portals[pi].z);
        if(_d<_nearD){_nearD=_d;_nearP=portals[pi];}
    }
    // Check warp pipes (unified into same proximity system)
    for(var _wpi2=0;_wpi2<warpPipeMeshes.length;_wpi2++){
        var _wp2=warpPipeMeshes[_wpi2];
        if(!_danboWarpPipeHeightOk(py))continue; // skip if clearly too high
        var _wd2=_danboPortalDist2D(px,pz,_wp2.x,_wp2.z);
        if(_wd2<_nearD){
            var _wpName=CITY_STYLES[_wp2.targetStyle]?CITY_STYLES[_wp2.targetStyle].name:'???';
            _nearD=_wd2;
            _nearP={name:_wpName,desc:L('warpDesc')||'Travel to another city!',raceIndex:-1,_targetStyle:_wp2.targetStyle,_isWarpPipe:true,_pipeX:_wp2.x,_pipeZ:_wp2.z};
        }
    }
    // Only trigger portal when player is walking/standing normally.  Do not
    // require a perfect onGround flag: on curved pipes, stairs, roofs, and
    // after tiny bounces it can be false for a few frames.
    var _nearGround=_danboPortalNearGround(playerEgg,py);
    var _isVoluntary=playerEgg&&_nearGround&&!playerEgg.throwTimer&&!playerEgg._stunTimer&&!playerEgg.heldBy&&!playerEgg._piledriverLocked&&!playerEgg._hondaDash&&!playerEgg._blankaSpinTimer&&!playerEgg._blankaSpinFalling&&!playerEgg._tatsuActive&&!playerEgg._shoryuActive&&!playerEgg._guileSomersault&&!playerEgg._electrocuted&&!playerEgg._elecFlying;
    var _portalAction=_nearP?_danboPortalAction(_nearD,PORTAL_CONFIG.triggerDist,PORTAL_CONFIG.confirmDist,_nearP._isWarpPipe,_isVoluntary):0;
    if(_nearP&&_portalAction>0){
        _portalPromptPortal=_nearP;
        if(_pp)_pp.style.display='block';
        var _dismissKey=_danboPortalDismissKey(_nearP);
        if(_portalAction===2&&!_portalConfirmOpen&&_portalDismissed!==_dismissKey){
            if(_pp)_pp.style.display='none';
            showPortalConfirm(_nearP);
        } else if(!_portalConfirmOpen){
            if(_pt)_pt.textContent=_nearP.name+' \u2014 '+_nearP.desc+'  ('+L('walkIn')+')';
        }
    } else if(!_portalConfirmOpen){
        _portalPromptPortal=null;
        if(_pp)_pp.style.display='none';
        _portalDismissed=null;
    }
    } // end if !_pipeTraveling

    // Coins
    for(const c of cityCoins){
        if(c.collected)continue;
        // Sonic-style scatter physics
        if(c._scatterTimer>0){
            c._scatterTimer--;
            c.mesh.position.x+=c._scatterVX;
            c.mesh.position.y+=c._scatterVY;
            c.mesh.position.z+=c._scatterVZ;
            c._scatterVY-=0.008; // gravity
            c.mesh.rotation.y+=0.2;
            c.mesh.rotation.x+=0.15;
            // Bounce on ground
            if(c.mesh.position.y<1.2){c.mesh.position.y=1.2;c._scatterVY=Math.abs(c._scatterVY)*0.5;c._scatterVX*=0.7;c._scatterVZ*=0.7;}
            // Building wall bounce for scattered coins
            for(var _sci=0;_sci<cityColliders.length;_sci++){
                    var _sc=cityColliders[_sci];
                    var _scdx=c.mesh.position.x-_sc.x, _scdz=c.mesh.position.z-_sc.z;
                    var _scov=DANBO_WASM.aabbOverlap2D(c.mesh.position.x,c.mesh.position.z,_sc.x,_sc.z,_sc.hw,_sc.hd,0.5);
                    if(_scov[7]&&c.mesh.position.y<(_sc.h||6)){
                        if(_scov[4]===0){c.mesh.position.x+=_scov[5]*_scov[2];c._scatterVX*=-0.5;}
                        else{c.mesh.position.z+=_scov[6]*_scov[3];c._scatterVZ*=-0.5;}
                        break;
                    }
                }
                // City boundary bounce for coins
                var _cb=(currentCityStyle===5?MOON_CITY_SIZE:CITY_SIZE)-1;
                if(c.mesh.position.x>_cb){c.mesh.position.x=_cb;c._scatterVX=-Math.abs(c._scatterVX)*0.4;}
                if(c.mesh.position.x<-_cb){c.mesh.position.x=-_cb;c._scatterVX=Math.abs(c._scatterVX)*0.4;}
                if(c.mesh.position.z>_cb){c.mesh.position.z=_cb;c._scatterVZ=-Math.abs(c._scatterVZ)*0.4;}
                if(c.mesh.position.z<-_cb){c.mesh.position.z=-_cb;c._scatterVZ=Math.abs(c._scatterVZ)*0.4;}
            if(c._scatterTimer<=0){
                // Settle coin at final position
                c.baseY=1.2;c.mesh.position.y=1.2;
                c._scatterVX=0;c._scatterVY=0;c._scatterVZ=0;
            }
            continue; // skip normal bobbing while scattering
        }
        c.mesh.rotation.y+=0.03;
        var coinBaseY=c.baseY||1.2;
        c.mesh.position.y=coinBaseY+Math.sin(Date.now()*0.003+c.mesh.position.x)*0.2;
        var cdx2=px-c.mesh.position.x, cdz2=pz-c.mesh.position.z, cdy2=py-c.mesh.position.y;
        if(DANBO_WASM.within3D(px,py,pz,c.mesh.position.x,c.mesh.position.y,c.mesh.position.z,1.5)){
            c.collected=true; c.mesh.visible=false;
            coins++; document.getElementById('coin-hud').textContent='⭐ '+coins;
            playCoinSound();
            // Tower of Babel trigger at 10 coins
            if(coins>=10&&!_babylonTriggered){_triggerBabylonEvent();}
        }
    }

    // ---- Treasure chests: auto-open on proximity (personal collection) ----
    for(var _chi=0;_chi<cityChests.length;_chi++){
        var ch=cityChests[_chi];
        if(ch.opened){
            if(ch.lid&&ch.lidAngle<1.2){ch.lidAngle=Math.min(1.2,ch.lidAngle+0.12);ch.lid.rotation.x=-ch.lidAngle;}
            continue;
        }
        if(ch.glow)ch.glow.material.opacity=(ch.tier==='legendary'?0.22:0.12)+Math.sin(Date.now()*0.005+ch.x)*0.06;
        if(DANBO_WASM.within3D(px,py,pz,ch.x,ch.y+0.4,ch.z,1.8)){
            if(typeof Explorer!=='undefined')Explorer.openChest(ch);
            if(coins>=10&&!_babylonTriggered){_triggerBabylonEvent();}
        }
    }
    // ---- Hidden-area discovery (+5 EXP, first time only) ----
    if(typeof Explorer!=='undefined'){
        if(currentCityStyle===5)Explorer.discoverHidden('moon_city','\u6708\u9762\u90FD\u5E02');
        else if(currentCityStyle<=4&&py>40)Explorer.discoverHidden('cloud_world','\u4E91\u4E2D\u754C');
    }
    // ---- House-door proximity prompt ----
    if(typeof _interiorDoorScan==='function')_interiorDoorScan(px,pz);

    // NPC AI
    for(const npc of cityNPCs){
        var _ndx=npc.mesh.position.x-px,_ndz=npc.mesh.position.z-pz;
        var _nFar=(_ndx*_ndx+_ndz*_ndz)>4900;
        var _nBusy=npc.holding||npc.heldBy||npc.throwTimer>0||npc._stunTimer>0||npc._onFire>0||npc._electrocuted>0||npc._elecFlying>0||npc._aiState==='babel';
        if(!_nFar||_nBusy||((_cityFrameNo+(npc._aiPhase||0))%3===0))updateCityNPC(npc);
        updateEggPhysics(npc, true);
        _updateStunStars(npc);_updatePainFace(npc);
        // Stun meter decay
        if(npc._stunMeter>0&&npc._stunTimer<=0)npc._stunMeter=Math.max(0,npc._stunMeter-0.5);
        // Fire effect (Ken shoryuken)
        if(npc._onFire>0){
            npc._onFire--;
            if(!npc._fireParticles){
                npc._fireParticles=[];
                for(var _fpi=0;_fpi<14;_fpi++){
                    var _fpSize=_fpi<4?0.3:0.2;
                    var _fp=new THREE.Mesh(new THREE.SphereGeometry(_fpSize,5,4),new THREE.MeshBasicMaterial({color:0xFF4400,transparent:true,opacity:0.85}));
                    _fp.visible=false;npc.mesh.add(_fp);
                    npc._fireParticles.push(_fp);
                }
            }
            for(var _fpj=0;_fpj<npc._fireParticles.length;_fpj++){
                var _fpp=npc._fireParticles[_fpj];
                _fpp.visible=true;
                var _fpa=_fpj*Math.PI*2/npc._fireParticles.length+npc._onFire*0.25;
                var _fpR=0.4+Math.sin(_fpa*2)*0.2;
                var _fpY=0.3+_fpj*0.12+Math.random()*0.3;
                _fpp.position.set(Math.sin(_fpa)*_fpR,_fpY,Math.cos(_fpa)*_fpR);
                // Flicker between orange, yellow, red
                var _fpRnd=Math.random();
                _fpp.material.color.setHex(_fpRnd>0.6?0xFFCC00:(_fpRnd>0.3?0xFF6600:0xFF2200));
                _fpp.material.opacity=0.6+Math.random()*0.35;
                _fpp.scale.setScalar(0.6+Math.random()*1.0);
            }
            // Body tint orange while burning
            var _fbody=npc.mesh.userData.body;
            if(_fbody&&npc._onFire>0)_safeSetEmissive(_fbody,0xFF4400,0.3+Math.sin(npc._onFire*0.3)*0.15);
            if(npc._onFire<=0){
                for(var _fpk=0;_fpk<npc._fireParticles.length;_fpk++)npc._fireParticles[_fpk].visible=false;
                if(_fbody)_safeSetEmissiveIntensity(_fbody,0);
            }
            // Fire stun (Yoga Flame) — freeze then knockback
            if(npc._fireStun>0){
                npc._fireStun--;
                npc.vx=0;npc.vz=0;npc.vy=0;
                npc.throwTimer=0;
                npc._hitStun=5;
                // Shake while burning
                npc.mesh.rotation.z=Math.sin(Date.now()*0.05)*0.15;
                if(npc._fireStun<=0){
                    // Knockback away from fire source
                    var _fkDir=npc._fireStunDir||0;
                    npc.vx=Math.sin(_fkDir)*0.3;npc.vz=Math.cos(_fkDir)*0.3;npc.vy=0.1;
                    npc.throwTimer=COMBAT.punch.throwTimer;npc._bounces=COMBAT.punch.bounces;npc.squash=COMBAT.projectile.squash;
                    npc.mesh.rotation.z=0;
                }
            }
        }
        // Electrocution effect (Blanka electric) — flash skeleton
        if(npc._electrocuted>0){
            npc._electrocuted--;
            npc.vx=0;npc.vz=0;npc.vy=0; // completely frozen
            npc.throwTimer=0; // prevent physics bounce
            // Flash between normal and dark skeleton every 3 frames
            var _elecBody=npc.mesh.userData.body;
            if(_elecBody){
                if(Math.floor(npc._electrocuted/3)%2===0){
                    _elecBody.material=new THREE.MeshBasicMaterial({color:0x111111,transparent:true,opacity:0.9});
                } else {
                    _elecBody.material=new THREE.MeshBasicMaterial({color:0xFFFFFF,transparent:true,opacity:0.9});
                }
            }
            // When shock phase ends — launch knockback (phase 2)
            if(npc._electrocuted<=0){
                if(npc._elecKnockDir){
                    npc._elecFlying=60;
                    npc._elecFlyDir={x:npc._elecKnockDir.x,z:npc._elecKnockDir.z};
                    npc._elecKnockDir=null;
                    npc.vy=0.5; // bounce up high
                    npc.throwTimer=80;
                } else {
                    if(_elecBody)_elecBody.material=toon(npc._origColor||0xFFDD44);
                    npc._stunTimer=40;npc._slamImmune=0;
                }
            }
        }
        // Electrocution flight phase — smooth slide (direct position move)
        if(npc._elecFlying>0){
            npc._elecFlying--;
            if(npc._elecFlyDir){
                npc.vx=npc._elecFlyDir.x*0.4;
                npc.vz=npc._elecFlyDir.z*0.4;
            }
            var _efBody=npc.mesh.userData.body;
            if(_efBody){
                if(Math.floor(npc._elecFlying/3)%2===0){
                    _efBody.material=new THREE.MeshBasicMaterial({color:0x111111,transparent:true,opacity:0.9});
                } else {
                    _efBody.material=new THREE.MeshBasicMaterial({color:0xFFFFFF,transparent:true,opacity:0.9});
                }
            }
            if(npc._elecFlying<=0){
                if(_efBody)_efBody.material=toon(npc._origColor||0xFFDD44);
                npc.vx*=0.1;npc.vz*=0.1;
                npc._stunTimer=40;npc._slamImmune=0;
                npc._elecFlyDir=null;
            }
        }
    }

    // ---- Tower of Babel rise animation ----
    if(_babylonRising&&_babylonTower){
        _babylonRiseY+=0.29; // rise speed (~3 seconds)
        // Push player away from tower during rise
        if(playerEgg){
            var brx=px-_babylonTower.x, brz=pz-_babylonTower.z;
            var brd=DANBO_WASM.len2D(brx,brz);
            var brHalf=_babylonTower.baseW/2+1.5;
            if(brd<brHalf&&brd>0.01){
                var brPush=(brHalf-brd)*0.15;
                playerEgg.vx+=brx/brd*brPush;playerEgg.vz+=brz/brd*brPush;
            }
        }
        if(_babylonRiseY>=0){
            _babylonRiseY=0;
            _babylonRising=false;
            // Add wall colliders now that tower is fully risen
            if(!_babylonTower._collidersAdded){
                _babylonTower._collidersAdded=true;
                var bw=_babylonTower.baseW||16, bd=_babylonTower.baseD||16;
                var tx=_babylonTower.x, tz=_babylonTower.z, tTop=_babylonTower.topY;
                // Solid body collider (player can't walk through)
                // Split into left and right halves with door gap on +Z face
                var doorGap=2.0; // door width
                cityColliders.push({x:tx,z:tz,hw:bw/2,hd:bd/2,h:tTop,_babel:true});
                // Add tower meshes to building occlusion array
                var _babelMeshes=[];
                _babylonTower.group.traverse(function(child){if(child.isMesh)_babelMeshes.push(child);});
                cityBuildingMeshes.push({meshes:_babelMeshes,x:tx,z:tz,hw:bw/2,hd:bd/2,h:tTop,_babel:true});
            }
        }
        _babylonTower.group.position.y=_babylonRiseY;
    }
    // ---- Tower of Babel door collision (4 doors: N/S/E/W) ----
    if(_babylonTower&&!_pipeTraveling&&!_portalConfirmOpen&&!_babylonElevator&&!_spinDashing){
        var bt=_babylonTower;
        var bHalfW=bt.baseW/2+0.5;
        // Check all 4 door positions
        var _babelDoors=[
            {x:bt.x,z:bt.z+bHalfW},{x:bt.x,z:bt.z-bHalfW},
            {x:bt.x+bHalfW,z:bt.z},{x:bt.x-bHalfW,z:bt.z}
        ];
        var _nearestBabelDoor=9999;
        for(var bdi=0;bdi<4;bdi++){
            var bdx2=px-_babelDoors[bdi].x, bdz2=pz-_babelDoors[bdi].z;
            var bdd=DANBO_WASM.len2D(bdx2,bdz2);
            if(bdd<_nearestBabelDoor)_nearestBabelDoor=bdd;
            if(bdd<4.2&&py<3.5&&!_babylonPromptDismissed&&!_babylonRising){
                _showBabylonPrompt(1);
            }
        }
        // Top of tower — return elevator
        var topDoorX=bt.x, topDoorZ=bt.z;
        var tdx=px-topDoorX, tdz=pz-topDoorZ;
        var tdist=DANBO_WASM.len2D(tdx,tdz);
        if(tdist<4.2&&py>=bt.topY-2&&py<=bt.topY+4&&!_babylonPromptDismissed&&!_babylonRising){
            _showBabylonPrompt(-1);
        }
        if(_nearestBabelDoor>6&&tdist>6)_babylonPromptDismissed=false;
    }
    // ---- Babel elevator ride animation ----
    if(_babylonElevator&&_babylonTower&&playerEgg){
        var bt2=_babylonTower;
        var elevSpeed=0.35;
        _babylonElevY+=_babylonElevDir*elevSpeed;
        playerEgg.mesh.position.set(bt2.x,_babylonElevY,bt2.z);
        playerEgg.vx=0;playerEgg.vy=0;playerEgg.vz=0;
        playerEgg.onGround=true;
        // Arrived at top — land on fixed exit cloud at tower top
        if(_babylonElevDir===1&&_babylonElevY>=bt2.topY+1){
            _babylonElevator=false;
            playerEgg.mesh.position.set(bt2.x,bt2.topY+2.5,bt2.z);
            playerEgg.vy=0;playerEgg.onGround=true;
            _babylonPromptDismissed=true;
            _showCloudAreaName();
        }
        // Arrived at bottom
        if(_babylonElevDir===-1&&_babylonElevY<=1){
            _babylonElevator=false;
            playerEgg.mesh.position.set(bt2.x,1,bt2.z+9);
            playerEgg.onGround=false;
            _babylonPromptDismissed=true; // don't immediately prompt to go back up
        }
    }

    // Moving clouds
    for(var mci=0;mci<cityCloudPlatforms.length;mci++){
        var mc=cityCloudPlatforms[mci];
        if(!mc.moving)continue;
        mc.movePhase+=mc.moveSpeed;
        var offset=Math.sin(mc.movePhase)*mc.moveRange;
        if(mc.moveAxis==='x'){
            mc.group.position.x=mc.baseX+offset;
            mc.x=mc.baseX+offset;
        } else {
            mc.group.position.z=mc.baseZ+offset;
            mc.z=mc.baseZ+offset;
        }
    }
    // ---- City Animals animation ----
    if(window._cityAnimals){
        var _bound2=CITY_SIZE-5;
        for(var _ai2=0;_ai2<window._cityAnimals.length;_ai2++){
            var a=window._cityAnimals[_ai2];
            // Skip AI when animal is grabbed as prop
            if(a._propRef&&a._propRef.grabbed){a.x=a.group.position.x;a.y=a.group.position.y;a.z=a.group.position.z;continue;}
            if(a._propRef&&a._propRef.throwTimer>0){a.x=a.group.position.x;a.y=a.group.position.y;a.z=a.group.position.z;continue;}
            a.stateTimer--;
            if(a.type==='pigeon'){
                a.flapPhase+=0.3;
                // Wings flap when flying
                for(var _wi=0;_wi<a.group.children.length;_wi++){
                    var wc=a.group.children[_wi];
                    if(wc.userData._side){
                        if(a.state==='fly')wc.rotation.z=wc.userData._side*Math.sin(a.flapPhase)*0.6;
                        else wc.rotation.z=wc.userData._side*0.3; // folded
                    }
                }
                if(a.state==='fly'){
                    a.x+=a.vx;a.z+=a.vz;a.y+=(a.targetY-a.y)*0.02;
                    // Circle motion
                    var _pRot=DANBO_WASM.rotateKeepSpeed2D(a.vx,a.vz,0.02);
                    a.vx=_pRot[0];a.vz=_pRot[1];
                    a.group.rotation.y=Math.atan2(a.vx,a.vz);
                    if(a.stateTimer<=0){a.state='land';a.stateTimer=30;a.targetY=0.3;}
                } else if(a.state==='land'){
                    a.y+=(a.targetY-a.y)*0.05;
                    if(a.stateTimer<=0){a.state='ground';a.stateTimer=120+Math.floor(Math.random()*180);}
                } else if(a.state==='ground'){
                    // Peck animation
                    if(Math.random()<0.03)a.group.children[1].rotation.x=0.5; else a.group.children[1].rotation.x*=0.9;
                    if(a.stateTimer<=0){a.state='fly';a.stateTimer=180+Math.floor(Math.random()*240);
                        a.targetY=5+Math.random()*15;a.vx=(Math.random()-0.5)*0.12;a.vz=(Math.random()-0.5)*0.12;}
                }
                if(Math.abs(a.x)>_bound2){a.vx*=-1;a.x=Math.sign(a.x)*(_bound2-1);}
                if(Math.abs(a.z)>_bound2){a.vz*=-1;a.z=Math.sign(a.z)*(_bound2-1);}
                a.group.position.set(a.x,a.y,a.z);
            } else if(a.type==='rabbit'){
                if(a.state==='idle'){
                    // Ear twitch + nose wiggle
                    if(a.group.children[2])a.group.children[2].rotation.z=0.15+Math.sin(Date.now()*0.008)*0.05;
                    if(a.group.children[8])a.group.children[8].position.z=0.3+Math.sin(Date.now()*0.015)*0.02;
                    if(a.stateTimer<=0){a.state='hop';a.stateTimer=20+Math.floor(Math.random()*40);
                        a.moveDir+=((Math.random()-0.5)*1.5);a.vx=Math.sin(a.moveDir)*0.08;a.vz=Math.cos(a.moveDir)*0.08;}
                } else if(a.state==='hop'){
                    a.hopPhase+=0.15;a.x+=a.vx;a.z+=a.vz;
                    a.y=Math.abs(Math.sin(a.hopPhase))*0.4;
                    a.group.rotation.y=a.moveDir;
                    // Body stretch during hop
                    var _hpct=Math.sin(a.hopPhase);
                    if(a.group.children[0])a.group.children[0].scale.set(0.8,0.7-_hpct*0.15,1+_hpct*0.2);
                    // Head bob
                    if(a.group.children[1])a.group.children[1].position.y=0.38+_hpct*0.08;
                    // Ears bounce back
                    if(a.group.children[2])a.group.children[2].rotation.x=-_hpct*0.3;
                    if(a.group.children[3])a.group.children[3].rotation.x=-_hpct*0.3;
                    // Tail bounce
                    if(a.group.children[9])a.group.children[9].position.y=0.2+Math.abs(_hpct)*0.1;
                    if(a.stateTimer<=0){a.state='idle';a.stateTimer=60+Math.floor(Math.random()*120);a.y=0;
                        if(a.group.children[0])a.group.children[0].scale.set(0.8,0.7,1);}
                }
                if(Math.abs(a.x)>_bound2){a.moveDir+=Math.PI;a.x=Math.sign(a.x)*(_bound2-1);}
                if(Math.abs(a.z)>_bound2){a.moveDir+=Math.PI;a.z=Math.sign(a.z)*(_bound2-1);}
                a.group.position.set(a.x,a.y,a.z);
            } else if(a.type==='deer'){
                if(a.state==='walk'){
                    a.walkPhase+=0.08;a.x+=Math.sin(a.moveDir)*0.03;a.z+=Math.cos(a.moveDir)*0.03;
                    a.group.rotation.y=a.moveDir;
                    // Head bob
                    if(a.group.children[2])a.group.children[2].position.y=1.0+Math.sin(a.walkPhase)*0.05;
                    // Body sway
                    a.group.rotation.z=Math.sin(a.walkPhase)*0.02;
                    // Leg animation — 4 legs alternate (children 12-19, pairs of leg+hoof)
                    var _dWalk=a.walkPhase;
                    for(var _dli=0;_dli<4;_dli++){
                        var _legIdx=12+_dli*2; // leg mesh index
                        var _legPhase=_dWalk+_dli*Math.PI/2;
                        if(a.group.children[_legIdx]){
                            a.group.children[_legIdx].rotation.x=Math.sin(_legPhase)*0.3;
                            // Hoof follows
                            if(a.group.children[_legIdx+1])a.group.children[_legIdx+1].rotation.x=Math.sin(_legPhase)*0.3;
                        }
                    }
                    // Tail wag
                    if(a.group.children[20])a.group.children[20].position.x=Math.sin(_dWalk*2)*0.03;
                    if(a.stateTimer<=0){a.state='idle';a.stateTimer=90+Math.floor(Math.random()*150);
                        a.group.rotation.z=0;}
                } else if(a.state==='idle'){
                    // Ears twitch
                    if(a.group.children[3])a.group.children[3].rotation.z=0.4+Math.sin(Date.now()*0.006)*0.1;
                    // Tail gentle sway
                    if(a.group.children[20])a.group.children[20].position.x=Math.sin(Date.now()*0.003)*0.02;
                    // Look around
                    if(Math.random()<0.01)a.group.rotation.y+=(Math.random()-0.5)*0.3;
                    if(a.stateTimer<=0){a.state='walk';a.stateTimer=120+Math.floor(Math.random()*180);
                        a.moveDir+=(Math.random()-0.5)*1.2;}
                }
                if(Math.abs(a.x)>_bound2){a.moveDir+=Math.PI;a.x=Math.sign(a.x)*(_bound2-1);}
                if(Math.abs(a.z)>_bound2){a.moveDir+=Math.PI;a.z=Math.sign(a.z)*(_bound2-1);}
                a.group.position.set(a.x,a.y,a.z);
            } else if(a.type==='seagull'){
                // Seagull — wider circles, occasional dive, head tilt
                a.flapPhase+=0.25;
                for(var _swi=0;_swi<a.group.children.length;_swi++){
                    var swc=a.group.children[_swi];
                    if(swc.userData._side){
                        if(a.state==='fly')swc.rotation.z=swc.userData._side*Math.sin(a.flapPhase)*0.5;
                        else swc.rotation.z=swc.userData._side*0.2;
                    }
                }
                if(a.state==='fly'){
                    a.x+=a.vx;a.z+=a.vz;a.y+=(a.targetY-a.y)*0.015;
                    var _swRot=DANBO_WASM.rotateKeepSpeed2D(a.vx,a.vz,0.012);
                    a.vx=_swRot[0];a.vz=_swRot[1];
                    a.group.rotation.y=Math.atan2(a.vx,a.vz);
                    // Head tilt animation
                    if(Math.random()<0.005&&a.group.children[1])a.group.children[1].rotation.z=0.3;
                    else if(a.group.children[1])a.group.children[1].rotation.z*=0.95;
                    if(a.stateTimer<=0){
                        if(Math.random()<0.3){a.state='dive';a.stateTimer=40;a.targetY=1;}
                        else{a.stateTimer=200+Math.floor(Math.random()*200);a.targetY=10+Math.random()*15;}
                    }
                } else if(a.state==='dive'){
                    a.y+=(a.targetY-a.y)*0.06;a.x+=a.vx*1.5;a.z+=a.vz*1.5;
                    if(a.stateTimer<=0){a.state='fly';a.stateTimer=200+Math.floor(Math.random()*200);a.targetY=10+Math.random()*15;}
                }
                if(Math.abs(a.x)>_bound2){a.vx*=-1;a.x=Math.sign(a.x)*(_bound2-1);}
                if(Math.abs(a.z)>_bound2){a.vz*=-1;a.z=Math.sign(a.z)*(_bound2-1);}
                a.group.position.set(a.x,a.y,a.z);
            } else if(a.type==='duck'){
                // Duck — waddle near fountain, head bob, occasional wing flap
                a.waddlePhase+=0.1;
                if(a.state==='swim'){
                    a.x+=Math.sin(a.moveDir)*0.02;a.z+=Math.cos(a.moveDir)*0.02;
                    a.group.rotation.y=a.moveDir;
                    // Waddle side-to-side
                    a.group.rotation.z=Math.sin(a.waddlePhase)*0.12;
                    // Body bob up/down
                    a.group.children[0].position.y=Math.sin(a.waddlePhase*0.8)*0.03;
                    // Head bob + look around
                    if(a.group.children[1]){a.group.children[1].position.y=0.3+Math.sin(a.waddlePhase*2)*0.04;a.group.children[1].rotation.y=Math.sin(a.waddlePhase*0.5)*0.2;}
                    // Tail wag
                    if(a.group.children[5])a.group.children[5].rotation.y=Math.sin(a.waddlePhase*3)*0.3;
                    // Feet paddle
                    if(a.group.children[6])a.group.children[6].rotation.x=Math.sin(a.waddlePhase*2)*0.4;
                    if(a.group.children[7])a.group.children[7].rotation.x=Math.sin(a.waddlePhase*2+Math.PI)*0.4;
                    if(a.stateTimer<=0){
                        if(Math.random()<0.3){a.state='flap';a.stateTimer=20;}
                        else{a.state='swim';a.stateTimer=80+Math.floor(Math.random()*120);a.moveDir+=(Math.random()-0.5)*1.5;}
                    }
                } else if(a.state==='flap'){
                    // Wing flap animation
                    for(var _dwi=0;_dwi<a.group.children.length;_dwi++){
                        var dwc=a.group.children[_dwi];
                        if(dwc.userData._side)dwc.rotation.z=dwc.userData._side*Math.sin(a.waddlePhase*3)*0.7;
                    }
                    if(a.stateTimer<=0){a.state='swim';a.stateTimer=80+Math.floor(Math.random()*120);a.moveDir+=(Math.random()-0.5)*1.0;}
                }
                // Keep close to center (within radius 20)
                var dkDist=DANBO_WASM.len2D(a.x,a.z);
                if(dkDist>20){a.moveDir=Math.atan2(-a.x,-a.z);}
                a.group.position.set(a.x,a.y,a.z);
            } else if(a.type==='eagle'){
                // Eagle — very slow wide circles, slight wing tilt, never lands
                a.flapPhase+=0.05;
                a.circleAngle+=0.005;
                var eRadius=40+Math.sin(a.flapPhase*0.2)*10;
                a.x=Math.cos(a.circleAngle)*eRadius;
                a.z=Math.sin(a.circleAngle)*eRadius;
                a.y=a.targetY+Math.sin(a.flapPhase*0.3)*2;
                a.group.rotation.y=a.circleAngle+Math.PI/2;
                // Slight wing tilt into the turn
                for(var _ewi=0;_ewi<a.group.children.length;_ewi++){
                    var ewc=a.group.children[_ewi];
                    if(ewc.userData._side)ewc.rotation.z=ewc.userData._side*(0.05+Math.sin(a.flapPhase*0.1)*0.03);
                }
                a.group.rotation.z=Math.sin(a.circleAngle)*0.08;
                a.group.position.set(a.x,a.y,a.z);
            } else if(a.type==='crow'){
                // Crow — perch on buildings, hop, fly to another rooftop
                a.flapPhase+=0.2;
                if(a.state==='perch'){
                    // Occasional head turn
                    if(Math.random()<0.02&&a.group.children[1])a.group.children[1].rotation.y=(Math.random()-0.5)*0.6;
                    if(a.stateTimer<=0){
                        if(Math.random()<0.4){a.state='hop';a.stateTimer=15;a.hopPhase=0;}
                        else{a.state='flyTo';a.stateTimer=60+Math.floor(Math.random()*60);
                            a.targetY=a.spawnY+5;a.vx=(Math.random()-0.5)*0.3;a.vz=(Math.random()-0.5)*0.3;}
                    }
                } else if(a.state==='hop'){
                    a.hopPhase+=0.2;a.y=a.spawnY+Math.abs(Math.sin(a.hopPhase))*0.3;
                    a.x+=(Math.random()-0.5)*0.05;a.z+=(Math.random()-0.5)*0.05;
                    if(a.stateTimer<=0){a.state='perch';a.stateTimer=100+Math.floor(Math.random()*200);a.y=a.spawnY;}
                } else if(a.state==='flyTo'){
                    a.x+=a.vx;a.z+=a.vz;a.y+=(a.targetY-a.y)*0.05;
                    for(var _cwi2=0;_cwi2<a.group.children.length;_cwi2++){
                        var cwc2=a.group.children[_cwi2];
                        if(cwc2.userData._side)cwc2.rotation.z=cwc2.userData._side*Math.sin(a.flapPhase)*0.6;
                    }
                    a.group.rotation.y=Math.atan2(a.vx,a.vz);
                    if(a.stateTimer<=0){a.state='perch';a.stateTimer=100+Math.floor(Math.random()*200);
                        a.spawnY=a.y;a.vx=0;a.vz=0;}
                }
                a.group.position.set(a.x,a.y,a.z);
            } else if(a.type==='boat'){
                // Boat — slow drift in circles, gentle rocking
                a.rockPhase+=0.02;
                a.circleAngle+=0.001;
                a.x=Math.cos(a.circleAngle)*a.circleDist;
                a.z=Math.sin(a.circleAngle)*a.circleDist;
                a.group.position.set(a.x,a.y,a.z);
                a.group.rotation.y=a.circleAngle+Math.PI/2;
                a.group.rotation.z=Math.sin(a.rockPhase)*0.05;
                a.group.rotation.x=Math.sin(a.rockPhase*0.7)*0.03;
            } else if(a.type==='flyingFish'){
                // Flying fish — jump out of water in arc, splash back down
                if(a.state==='underwater'){
                    a.group.visible=false;
                    if(a.stateTimer<=0){
                        a.state='jump';a.jumpPhase=0;
                        a.moveDir=Math.random()*Math.PI*2;
                        a.stateTimer=60+Math.floor(Math.random()*40);
                    }
                } else if(a.state==='jump'){
                    a.jumpPhase+=a.jumpSpeed;
                    a.y=-0.5+Math.sin(a.jumpPhase)*2.5;
                    a.x+=Math.sin(a.moveDir)*0.15;a.z+=Math.cos(a.moveDir)*0.15;
                    a.group.visible=(a.y>-0.5);
                    a.group.rotation.y=a.moveDir;
                    a.group.rotation.x=-Math.cos(a.jumpPhase)*0.5;
                    // Fin flap
                    for(var _ffi=0;_ffi<a.group.children.length;_ffi++){
                        var ffc=a.group.children[_ffi];
                        if(ffc.userData._side)ffc.rotation.z=ffc.userData._side*Math.sin(a.jumpPhase*3)*0.4;
                    }
                    if(a.jumpPhase>=Math.PI){a.state='underwater';a.stateTimer=30+Math.floor(Math.random()*120);a.y=-0.5;a.group.visible=false;}
                }
                a.group.position.set(a.x,a.y,a.z);
            }
        }
    }
    // Cherub (cloud world angel) animation — not in Sakura City
    if(window._cityAnimals&&currentCityStyle!==6)for(var _ai3=0;_ai3<window._cityAnimals.length;_ai3++){
        var ca=window._cityAnimals[_ai3];
        if(ca.type!=='cherub')continue;
        ca.flapPhase+=0.15;
        // Wing flap
        for(var _cwi=0;_cwi<ca.group.children.length;_cwi++){
            var cwc=ca.group.children[_cwi];
            if(cwc.userData._side){cwc.rotation.z=cwc.userData._side*Math.sin(ca.flapPhase)*0.4;}
        }
        // Gentle floating + circle flight
        ca.x+=ca.vx;ca.z+=ca.vz;
        ca.y=ca.baseY+Math.sin(ca.flapPhase*0.3)*1.5;
        var _caRot=DANBO_WASM.rotateKeepSpeed2D(ca.vx,ca.vz,0.01);
        ca.vx=_caRot[0];ca.vz=_caRot[1];
        ca.group.rotation.y=Math.atan2(ca.vx,ca.vz);
        // Halo gentle bob
        var haloChild=ca.group.children[ca.group.children.length-3];
        if(haloChild)haloChild.rotation.z=Math.sin(ca.flapPhase*0.5)*0.1;
        ca.group.position.set(ca.x,ca.y,ca.z);
    }
    // ---- Sakura petal animation with wind ----
    if(window._sakuraPetals&&currentCityStyle===6){
        var _wt=Date.now()*0.0003;
        var _windX=Math.sin(_wt)*0.06+Math.sin(_wt*2.7)*0.03; // gusting wind X
        var _windZ=Math.cos(_wt*0.8)*0.04+Math.sin(_wt*1.5)*0.02; // gusting wind Z
        for(var spi=0;spi<window._sakuraPetals.length;spi++){
            var sp=window._sakuraPetals[spi];
            sp.x+=sp.vx+_windX+Math.sin(_wt*3+spi*0.1)*0.02;
            sp.y+=sp.vy;
            sp.z+=sp.vz+_windZ+Math.cos(_wt*2.5+spi*0.07)*0.02;
            sp.mesh.rotation.x+=sp.rotSpeed;
            sp.mesh.rotation.z+=sp.rotSpeed*0.7;
            sp.mesh.rotation.y+=sp.rotSpeed*0.5;
            if(sp.y<-1){sp.y=18+Math.random()*20;sp.x=(Math.random()-0.5)*CITY_SIZE*2;sp.z=(Math.random()-0.5)*CITY_SIZE*2;}
            sp.mesh.position.set(sp.x,sp.y,sp.z);
        }
        // Trees sway in the wind
        for(var _tsi=0;_tsi<cityProps.length;_tsi++){
            var _tp=cityProps[_tsi];
            if(_tp.type!=='tree')continue;
            _tp.group.rotation.x=Math.sin(_wt*2+_tp.x*0.1)*0.03+_windX*0.3;
            _tp.group.rotation.z=Math.cos(_wt*1.5+_tp.z*0.1)*0.03+_windZ*0.3;
        }
    }
    // Sakura stream animals animation
    if(window._sakuraStreamAnimals&&currentCityStyle===6){
        for(var _sai2=0;_sai2<window._sakuraStreamAnimals.length;_sai2++){
            var sa=window._sakuraStreamAnimals[_sai2];
            if(sa.type==='duck'){
                sa.wobble+=0.08;
                sa.x+=Math.sin(sa.moveDir)*sa.speed;
                sa.z+=Math.cos(sa.moveDir)*sa.speed;
                if(Math.abs(sa.x)>6){sa.moveDir=Math.atan2(-sa.x,sa.z);}
                if(Math.abs(sa.z)>110){sa.moveDir=Math.atan2(sa.x,-sa.z);}
                if(Math.random()<0.005)sa.moveDir+=(Math.random()-0.5)*1.5;
                sa.group.position.set(sa.x,sa.y+Math.sin(sa.wobble)*0.05,sa.z);
                sa.group.rotation.y=sa.moveDir;
            } else if(sa.type==='koi'){
                sa.phase+=sa.speed;
                sa.x=Math.cos(sa.phase)*sa.radius;
                sa.z+=Math.sin(sa.phase)*0.3;
                if(Math.abs(sa.z)>110)sa.z*=-0.9;
                sa.group.position.set(sa.x,sa.y+Math.sin(sa.phase*3)*0.1,sa.z);
                sa.group.rotation.y=sa.phase+Math.PI/2;
                if(sa.group.children[1])sa.group.children[1].rotation.y=Math.sin(sa.phase*5)*0.4;
            } else if(sa.type==='turtle'){
                sa.timer--;
                sa.x+=Math.sin(sa.moveDir)*sa.speed;
                sa.z+=Math.cos(sa.moveDir)*sa.speed;
                if(Math.abs(sa.x)>6)sa.moveDir=Math.atan2(-sa.x,sa.z);
                if(sa.timer<=0){sa.moveDir+=(Math.random()-0.5)*2;sa.timer=200+Math.floor(Math.random()*300);}
                sa.group.position.set(sa.x,sa.y,sa.z);
                sa.group.rotation.y=sa.moveDir;
            } else if(sa.type==='heron'){
                sa.timer--;
                if(sa.timer<=0){sa.timer=100+Math.floor(Math.random()*300);
                    if(sa.state==='stand'){sa.state='peck';} else {sa.state='stand';}
                }
                if(sa.state==='peck'&&sa.group.children[2]){
                    sa.group.children[1].rotation.x=Math.sin(Date.now()*0.01)*0.3;
                    sa.group.children[2].position.y=1.5+Math.sin(Date.now()*0.01)*0.4;
                } else if(sa.group.children[1]){
                    sa.group.children[1].rotation.x=0;
                    if(sa.group.children[2])sa.group.children[2].position.y=1.9;
                }
            }
        }
    }
    // Sakura canal water shimmer
    if(window._sakuraCanalWater&&currentCityStyle===6){
        for(var _scwi=0;_scwi<window._sakuraCanalWater.length;_scwi++){
            var _rwt=Date.now()*0.002;
            var _ws=window._sakuraCanalWater[_scwi];
            // Visible wave motion
            _ws.position.y=2.0+Math.sin(_rwt+_scwi*1.5)*0.15+Math.sin(_rwt*2.3+_scwi*0.8)*0.08;
            // Flowing downstream
            _ws.position.z+=0.04;
            if(_ws.position.z>130)_ws.position.z=-130;
            // Shimmer
            _ws.material.opacity=0.5+Math.sin(_rwt*3+_scwi*1.2)*0.15;
            // Slight X sway
            _ws.position.x=Math.sin(_rwt*0.7+_scwi*2)*0.3;
        }
    }
    // ---- Snow Village animations ----
    if(window._snowParticles&&currentCityStyle===7){
        var _swt=Date.now()*0.0003;
        var _sWindX=Math.sin(_swt)*0.03+Math.sin(_swt*1.8)*0.015;
        var _sWindZ=Math.cos(_swt*0.6)*0.02+Math.sin(_swt*1.2)*0.01;
        for(var _spi8=0;_spi8<window._snowParticles.length;_spi8++){
            var sp8=window._snowParticles[_spi8];
            sp8.x+=sp8.vx+_sWindX;sp8.y+=sp8.vy;sp8.z+=sp8.vz+_sWindZ;
            sp8.mesh.rotation.x+=sp8.rotSpeed;sp8.mesh.rotation.z+=sp8.rotSpeed*0.7;
            if(sp8.y<-1){sp8.y=30+Math.random()*15;sp8.x=(Math.random()-0.5)*320;sp8.z=(Math.random()-0.5)*320;}
            sp8.mesh.position.set(sp8.x,sp8.y,sp8.z);
        }
    }
    if(window._snowCitySteam&&currentCityStyle===7){
        for(var _sti3=0;_sti3<window._snowCitySteam.length;_sti3++){
            var st3=window._snowCitySteam[_sti3];
            st3.y+=st3.vy;st3.x+=(Math.random()-0.5)*0.02;st3.z+=(Math.random()-0.5)*0.02;
            var _sScale=1+(st3.y-0.5)*0.15;st3.mesh.scale.setScalar(Math.max(0.3,_sScale));
            st3.mesh.material.opacity=Math.max(0,0.35-st3.y*0.03);
            if(st3.y>10){st3.y=0.5;st3.x=st3.baseX+(Math.random()-0.5)*st3.radius;st3.z=st3.baseZ+(Math.random()-0.5)*st3.radius;}
            st3.mesh.position.set(st3.x,st3.y,st3.z);
        }
    }
    if(window._snowCityWater&&currentCityStyle===7){
        for(var _swi2=0;_swi2<window._snowCityWater.length;_swi2++){
            window._snowCityWater[_swi2].position.y=0.15+Math.sin(Date.now()*0.001+_swi2)*0.03;
        }
    }
    // ---- Ocean wave animation ----
    if(window._oceanMesh&&window._oceanMesh.geometry){
        var _owt=Date.now()*0.001;
        var _opos=window._oceanMesh.geometry.attributes.position;
        for(var _owi=0;_owi<_opos.count;_owi++){
            var _ox=_opos.getX(_owi),_oz=_opos.getY(_owi);
            _opos.setZ(_owi,Math.sin(_ox*0.02+_owt*1.5)*0.5+Math.sin(_oz*0.03+_owt*1.2)*0.4+Math.sin((_ox+_oz)*0.01+_owt*0.8)*0.8);
        }
        _opos.needsUpdate=true;
    }
    if(window._waveRings){
        var _wrt=Date.now()*0.001;
        for(var _wri2=0;_wri2<window._waveRings.length;_wri2++){
            var wr2=window._waveRings[_wri2];
            wr2.position.y=-3.5+Math.sin(_wrt*0.8+_wri2*1.5)*0.3;
            wr2.material.opacity=0.2+Math.sin(_wrt*0.6+_wri2)*0.1;
        }
    }
    // Moon earth rotation + star twinkling
    if(window._moonEarth){window._moonEarth.rotation.y+=0.001;}
    if(window._moonStars){
        var st2=Date.now()*0.003;
        for(var si2=0;si2<window._moonStars.length;si2++){
            var s=window._moonStars[si2];
            s.mesh.material.opacity=0.3+0.7*Math.abs(Math.sin(st2*s.speed+s.phase));
        }
    }
    // ---- Moon rover movement ----
    if(window._moonRover){
        var rv=window._moonRover;
        rv.timer++;
        rv.turnTimer--;
        if(rv.turnTimer<=0){
            rv.targetAngle=Math.random()*Math.PI*2;
            rv.turnTimer=120+Math.floor(Math.random()*180);
        }
        // Smoothly turn toward target angle
        var aDiff=rv.targetAngle-rv.angle;
        while(aDiff>Math.PI)aDiff-=Math.PI*2;
        while(aDiff<-Math.PI)aDiff+=Math.PI*2;
        rv.angle+=aDiff*0.02;
        // Move forward
        var rvNx=rv.x+Math.cos(rv.angle)*rv.speed;
        var rvNz=rv.z+Math.sin(rv.angle)*rv.speed;
        // Keep on battlefield (x>20, within bounds)
        if(rvNx>20&&rvNx<350&&DANBO_WASM.absDeltaLess(rvNz,0,280)){
            rv.x=rvNx;rv.z=rvNz;
        } else {
            rv.targetAngle=Math.atan2(-rv.z,-rv.x+150);
            rv.turnTimer=60;
        }
        rv.group.position.x=rv.x;rv.group.position.z=rv.z;
        rv.group.rotation.y=rv.angle;
    }
    // ---- Animate earth return portal ----
    if(window._earthReturnPortal){
        var erp=window._earthReturnPortal;
        var ert=Date.now()*0.001;
        erp.ring.rotation.z=ert*0.5;
        erp.inner.rotation.z=-ert*0.8;
        erp.earth.rotation.y=ert*0.3;
        erp.earth.position.y=4+Math.sin(ert)*0.3;
    }
    // ---- Gundam battle animation ----
    if(window._moonGundams){
        var gt=Date.now()*0.001;
        // Get player position for MS clustering (flat battlefield)
        var _plAng=0, _plElev=0;
        if(playerEgg){
            var _pdx=playerEgg.mesh.position.x, _pdz=playerEgg.mesh.position.z;
            _plAng=Math.atan2(_pdz,_pdx);
            _plElev=0;
        }
        for(var ggi=0;ggi<window._moonGundams.length;ggi++){
            var gm=window._moonGundams[ggi];
            if(gm._dead)continue;
            gm.phase+=0.03;
            // Waypoint AI: move toward random waypoint near player
            gm.wpTimer--;
            if(gm.wpTimer<=0){
                gm.wpTimer=120+Math.floor(Math.random()*180); // longer patrol legs
                gm.wpAngle+=((Math.random()-0.5)*Math.PI*0.6); // gradual turns, not random jumps
                gm.wpElev+=(Math.random()-0.5)*0.3;
                gm.wpElev=Math.max(-Math.PI*0.3,Math.min(Math.PI*0.3,gm.wpElev));
                gm.wpR=40+Math.random()*80;
                if(gm.ms==='sdf1')gm.wpR=200+Math.random()*100;
                if(gm.ms==='zenCruiser')gm.wpR=150+Math.random()*100;
            }
            // Random dodge maneuver (less frequent)
            if(gm.dodgeTimer>0){gm.dodgeTimer--;}
            else if(Math.random()<0.005){gm.dodgeTimer=8+Math.floor(Math.random()*10);gm.dodgeDir=new THREE.Vector3(Math.random()-0.5,Math.random()-0.5,Math.random()-0.5).normalize();}
            // Compute waypoint — faction-based targeting (spread out more)
            var _fTargets={efsf:{x:150,z:-200},zentradi:{x:-200,z:200},unSpacy:{x:200,z:100},zeon:{x:-150,z:-50}};
            var _ft=_fTargets[gm.faction]||{x:0,z:0};
            // Stable waypoint — patrol around faction target area
            var wpx=_ft.x+Math.cos(gm.wpAngle)*150;
            var wpy=gm.wpR;
            var wpz=_ft.z+Math.sin(gm.wpAngle)*150;
            // Zeon patrols around cities
            if(gm.faction==='zeon'){wpx=-150+Math.cos(gm.wpAngle)*120;wpz=-50+Math.sin(gm.wpAngle)*200;}
            // Steer toward waypoint
            var dx3=wpx-gm.group.position.x,dy3=wpy-gm.group.position.y,dz3=wpz-gm.group.position.z;
            var dd3=DANBO_WASM.len3D(dx3,dy3,dz3)||1;
            var spd=gm.speed;
            gm.group.position.x+=dx3/dd3*spd;
            gm.group.position.y+=dy3/dd3*spd;
            gm.group.position.z+=dz3/dd3*spd;
            // Dodge offset
            if(gm.dodgeTimer>0&&gm.dodgeDir){
                gm.group.position.x+=gm.dodgeDir.x*spd*0.5;
                gm.group.position.y+=gm.dodgeDir.y*spd*0.5;
                gm.group.position.z+=gm.dodgeDir.z*spd*0.5;
            }
            // Face direction of travel
            var gx=gm.group.position.x,gy=gm.group.position.y,gz=gm.group.position.z;
            // Shield deflection — MS can't enter city shields
            var _gsShield=_checkMoonShield(gx,gy,gz);
            if(_gsShield){
                var _gsdx=gx-_gsShield.x,_gsdy=gy-_gsShield.y,_gsdz=gz-_gsShield.z;
                var _gsd=DANBO_WASM.len3D(_gsdx,_gsdy,_gsdz)||1;
                // Push out to shield surface
                gm.group.position.x=_gsShield.x+_gsdx/_gsd*(_gsShield.r+1);
                gm.group.position.y=_gsShield.y+_gsdy/_gsd*(_gsShield.r+1);
                gm.group.position.z=_gsShield.z+_gsdz/_gsd*(_gsShield.r+1);
                gx=gm.group.position.x;gy=gm.group.position.y;gz=gm.group.position.z;
                gm.wpTimer=0; // pick new waypoint
                if(Math.random()<0.08)_spawnATField(gx,gy,gz,_gsdx/_gsd,_gsdy/_gsd,_gsdz/_gsd);
            }
            gm.group.lookAt(wpx,wpy,wpz);
            if(dd3<3)gm.wpTimer=0; // arrived, pick new waypoint
            // Saber duel: fast swing
            if(gm.type==='saber'&&gm.saberMesh){
                gm.saberMesh.rotation.x=-0.3+Math.sin(gt*8+ggi*2)*0.9;
                gm.saberMesh.rotation.z=Math.sin(gt*7+ggi*3)*0.5;
                // Saber clash sparks
                if(gm.duelPartner&&Math.random()<0.04&&window._moonBeams.length<300){
                    var sp=new THREE.Mesh(new THREE.SphereGeometry(0.3,4,3),new THREE.MeshBasicMaterial({color:0xFFFF44,transparent:true,opacity:1.0}));
                    sp.position.set(gx+(Math.random()-0.5)*2,gy+(Math.random()-0.5)*2,gz+(Math.random()-0.5)*2);
                    scene.add(sp);
                    window._moonBeams.push({mesh:sp,life:8,vx:(Math.random()-0.5)*0.5,vy:(Math.random()-0.5)*0.5,vz:(Math.random()-0.5)*0.5});
                }
            }
            // Funnels: orbit + shoot
            if(gm.type==='funnel'&&gm.funnels){
                for(var ffi=0;ffi<gm.funnels.length;ffi++){
                    var ff=gm.funnels[ffi];
                    ff.angle+=0.06;
                    var fd=ff.dist+Math.sin(gt*3+ffi)*0.5;
                    ff.mesh.position.set(Math.cos(ff.angle)*fd,Math.sin(ff.angle*0.7+ffi)*fd*0.5,Math.sin(ff.angle)*fd);
                    if(Math.random()<0.03&&window._moonBeams.length<300){
                        var bDir=new THREE.Vector3(Math.random()-0.5,Math.random()-0.5,Math.random()-0.5).normalize();
                        var fWorld=new THREE.Vector3();ff.mesh.getWorldPosition(fWorld);
                        var fb=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,8,4),new THREE.MeshBasicMaterial({color:0xFF44FF,transparent:true,opacity:0.9}));
                        fb.position.copy(fWorld);fb.lookAt(fWorld.x+bDir.x,fWorld.y+bDir.y,fWorld.z+bDir.z);fb.rotateX(Math.PI/2);
                        scene.add(fb);
                        window._moonBeams.push({mesh:fb,life:25,vx:bDir.x*3,vy:bDir.y*3,vz:bDir.z*3});
                    }
                }
            }
            // Rifle: frequent beam shots
            gm.actionTimer--;
            if(gm.type==='rifle'&&gm.actionTimer<=0){
                gm.actionTimer=25+Math.floor(Math.random()*45);
                if(window._moonBeams.length<300){
                    var beamColor=gm.faction==='efsf'?0xFF8844:gm.faction==='unSpacy'?0x44CCFF:gm.faction==='zentradi'?0x88FF44:0x44FF44;
                    var bm=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,4,4),new THREE.MeshBasicMaterial({color:beamColor,transparent:true,opacity:0.9}));
                    var fwd3=new THREE.Vector3(0,0,1).applyQuaternion(gm.group.quaternion);
                    bm.position.set(gx+fwd3.x*2,gy+fwd3.y*2,gz+fwd3.z*2);
                    bm.lookAt(gx+fwd3.x*20,gy+fwd3.y*20,gz+fwd3.z*20);bm.rotateX(Math.PI/2);
                    scene.add(bm);
                    window._moonBeams.push({mesh:bm,life:35,vx:fwd3.x*4,vy:fwd3.y*4,vz:fwd3.z*4});
                    playBeamSound();
                }
            }
            // Missile: frequent launch
            if(gm.type==='missile'&&gm.actionTimer<=0){
                gm.actionTimer=40+Math.floor(Math.random()*60);
                if(window._moonMissiles.length<150){
                    var mg=new THREE.Group();
                    var mbody=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.06,1.0,6),new THREE.MeshStandardMaterial({color:0x888888}));
                    mbody.rotation.x=Math.PI/2;mg.add(mbody);
                    var mnose=new THREE.Mesh(new THREE.ConeGeometry(0.08,0.3,6),new THREE.MeshStandardMaterial({color:0xCC4444}));
                    mnose.rotation.x=-Math.PI/2;mnose.position.z=0.65;mg.add(mnose);
                    var mflame=new THREE.Mesh(new THREE.ConeGeometry(0.1,0.5,4),new THREE.MeshBasicMaterial({color:0xFF6600,transparent:true,opacity:0.7}));
                    mflame.rotation.x=Math.PI/2;mflame.position.z=-0.7;mg.add(mflame);
                    var mfwd3=new THREE.Vector3(0,0,1).applyQuaternion(gm.group.quaternion);
                    mfwd3.x+=(Math.random()-0.5)*0.4;mfwd3.y+=(Math.random()-0.5)*0.4;mfwd3.z+=(Math.random()-0.5)*0.4;mfwd3.normalize();
                    mg.position.set(gx,gy,gz);
                    mg.lookAt(gx+mfwd3.x,gy+mfwd3.y,gz+mfwd3.z);
                    scene.add(mg);
                    window._moonMissiles.push({group:mg,life:80,vx:mfwd3.x*2.5,vy:mfwd3.y*2.5,vz:mfwd3.z*2.5,trail:[]});
                    playMissileSound();
                }
            }
            // ---- Capital ship main cannon beam (SDF1 / Argama) ----
            if(gm.ms==='sdf1'){
                if(!gm._beamCD)gm._beamCD=300+Math.floor(Math.random()*200);
                gm._beamCD--;
                if(gm._beamCD<=0&&window._moonBeams.length<300){
                    gm._beamCD=300+Math.floor(Math.random()*200);
                    var _bcColor=0xFFDD44;
                    var _bcMat=new THREE.MeshBasicMaterial({color:_bcColor,transparent:true,opacity:0.9});
                    var _bcGeo=new THREE.CylinderGeometry(0.6,0.6,40,8);
                    var _bcMesh=new THREE.Mesh(_bcGeo,_bcMat);
                    var _bcFwd=new THREE.Vector3(0,0,1).applyQuaternion(gm.group.quaternion);
                    _bcMesh.position.set(gx+_bcFwd.x*22,gy+_bcFwd.y*22,gz+_bcFwd.z*22);
                    _bcMesh.lookAt(gx+_bcFwd.x*60,gy+_bcFwd.y*60,gz+_bcFwd.z*60);
                    _bcMesh.rotateX(Math.PI/2);
                    scene.add(_bcMesh);
                    window._moonBeams.push({mesh:_bcMesh,life:30,vx:_bcFwd.x*2,vy:_bcFwd.y*2,vz:_bcFwd.z*2});
                    playBeamSound();
                }
            }
            // ---- Red Zaku mega particle cannon ----
            if(gm.ms==='zaku'&&(gm._color===0xCC2222||gm._color===0x882222)){
                if(!gm._megaCD)gm._megaCD=400+Math.floor(Math.random()*200);
                gm._megaCD--;
                if(gm._megaCD<=0&&window._moonBeams.length<300){
                    gm._megaCD=400+Math.floor(Math.random()*200);
                    var _mpMat=new THREE.MeshBasicMaterial({color:0xFFDD44,transparent:true,opacity:0.85});
                    var _mpGeo=new THREE.CylinderGeometry(0.15,0.15,20,6);
                    var _mpMesh=new THREE.Mesh(_mpGeo,_mpMat);
                    var _mpFwd=new THREE.Vector3(0,0,1).applyQuaternion(gm.group.quaternion);
                    _mpMesh.position.set(gx+_mpFwd.x*12,gy+_mpFwd.y*12,gz+_mpFwd.z*12);
                    _mpMesh.lookAt(gx+_mpFwd.x*40,gy+_mpFwd.y*40,gz+_mpFwd.z*40);
                    _mpMesh.rotateX(Math.PI/2);
                    scene.add(_mpMesh);
                    window._moonBeams.push({mesh:_mpMesh,life:30,vx:_mpFwd.x*3.5,vy:_mpFwd.y*3.5,vz:_mpFwd.z*3.5});
                    playBeamSound();
                }
            }
            // ---- Valkyrie transformation toggle ----
            if(gm.ms==='valkyrie'){
                if(!gm._valkCD)gm._valkCD=200+Math.floor(Math.random()*200);
                gm._valkCD--;
                if(gm._valkCD<=0){
                    gm._valkCD=200+Math.floor(Math.random()*200);
                    gm._valkMode=gm._valkMode?0:1;
                    if(gm._valkMode){
                        gm.group.scale.set(1.0,1.4,1.0);
                        gm.group.rotation.x=-Math.PI/4;
                    } else {
                        gm.group.scale.set(1.4,1.4,1.4);
                        gm.group.rotation.x=0;
                    }
                }
            }
            // ---- Valkyrie Missile Barrage ----
            if(gm.ms==='valkyrie'){
                if(!gm._barrageCD)gm._barrageCD=500+Math.floor(Math.random()*300);
                gm._barrageCD--;
                if(gm._barrageCD<=0){
                    gm._barrageCD=500+Math.floor(Math.random()*300);
                    if(!window._moonMissiles)window._moonMissiles=[];
                    var _bmCount=8+Math.floor(Math.random()*5);
                    var _bmFwd=new THREE.Vector3(0,0,1).applyQuaternion(gm.group.quaternion);
                    for(var _bmi=0;_bmi<_bmCount;_bmi++){
                        var _bmMesh=new THREE.Mesh(new THREE.ConeGeometry(0.08,0.3,4),new THREE.MeshBasicMaterial({color:0xDDDDDD}));
                        _bmMesh.position.set(gx,gy,gz);scene.add(_bmMesh);
                        var _bmVx=_bmFwd.x+(Math.random()-0.5)*0.8;
                        var _bmVy=_bmFwd.y+(Math.random()-0.5)*0.8;
                        var _bmVz=_bmFwd.z+(Math.random()-0.5)*0.8;
                        var _bmSpd=1.5+Math.random();
                        var _bmLen=DANBO_WASM.len3D(_bmVx,_bmVy,_bmVz)||1;
                        window._moonMissiles.push({group:_bmMesh,life:60,vx:_bmVx/_bmLen*_bmSpd,vy:_bmVy/_bmLen*_bmSpd,vz:_bmVz/_bmLen*_bmSpd,trail:[],_isBarrage:true});
                    }
                    playMissileSound();
                }
            }
            // ---- Funnel Weapons targeted beams ----
            if(gm.funnels&&gm.funnels.length>0){
                if(!gm._funnelCD)gm._funnelCD=200+Math.floor(Math.random()*200);
                gm._funnelCD--;
                if(gm._funnelCD<=0){
                    gm._funnelCD=200+Math.floor(Math.random()*200);
                    var _fnTarget=null,_fnDist=9999;
                    for(var _fni=0;_fni<window._moonGundams.length;_fni++){
                        var _fnE=window._moonGundams[_fni];
                        if(_fnE._dead||_fnE.faction===gm.faction)continue;
                        var _fdx=_fnE.group.position.x-gx,_fdy=_fnE.group.position.y-gy,_fdz=_fnE.group.position.z-gz;
                        var _fdd=DANBO_WASM.len3D(_fdx,_fdy,_fdz);
                        if(_fdd<_fnDist){_fnDist=_fdd;_fnTarget=_fnE;}
                    }
                    if(_fnTarget&&_fnDist<200){
                        for(var _ffi2=0;_ffi2<gm.funnels.length;_ffi2++){
                            var _ffW=new THREE.Vector3();gm.funnels[_ffi2].mesh.getWorldPosition(_ffW);
                            var _ftPos=_fnTarget.group.position;
                            var _fbDx=_ftPos.x-_ffW.x,_fbDy=_ftPos.y-_ffW.y,_fbDz=_ftPos.z-_ffW.z;
                            var _fbLen=DANBO_WASM.len3D(_fbDx,_fbDy,_fbDz)||1;
                            var _fbMesh=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,_fbLen,4),new THREE.MeshBasicMaterial({color:0xFF44FF,transparent:true,opacity:0.9}));
                            _fbMesh.position.set((_ffW.x+_ftPos.x)/2,(_ffW.y+_ftPos.y)/2,(_ffW.z+_ftPos.z)/2);
                            _fbMesh.lookAt(_ftPos.x,_ftPos.y,_ftPos.z);_fbMesh.rotateX(Math.PI/2);
                            scene.add(_fbMesh);
                            window._moonBeams.push({mesh:_fbMesh,life:15,vx:0,vy:0,vz:0});
                            if(_ffi2%3===0)playBeamSound();
                        }
                    }
                }
            }
            // ---- Beam Saber Duels ----
            if(gm.type==='saber'&&gm.duelPartner&&!gm.duelPartner._dead){
                var _dpPos=gm.duelPartner.group.position;
                var _ddx=_dpPos.x-gx,_ddy=_dpPos.y-gy,_ddz=_dpPos.z-gz;
                var _ddd=DANBO_WASM.len3D(_ddx,_ddy,_ddz)||1;
                if(_ddd<80){
                    gm.group.position.x+=_ddx/_ddd*spd*0.5;
                    gm.group.position.y+=_ddy/_ddd*spd*0.5;
                    gm.group.position.z+=_ddz/_ddd*spd*0.5;
                }
                if(_ddd<8){
                    if(!gm._duelAngle)gm._duelAngle=Math.random()*Math.PI*2;
                    gm._duelAngle+=0.08;
                    var _orbR=4+Math.sin(gm._duelAngle*0.3);
                    gm.group.position.x=_dpPos.x+Math.cos(gm._duelAngle)*_orbR;
                    gm.group.position.z=_dpPos.z+Math.sin(gm._duelAngle)*_orbR;
                    gm.group.lookAt(_dpPos.x,_dpPos.y,_dpPos.z);
                    if(!gm._swingCD)gm._swingCD=15+Math.floor(Math.random()*10);
                    gm._swingCD--;
                    if(gm._swingCD<=0){
                        gm._swingCD=15+Math.floor(Math.random()*10);
                        gm._swingFlash=5;
                        var _spMesh=new THREE.Mesh(new THREE.SphereGeometry(0.4,4,3),new THREE.MeshBasicMaterial({color:0xFFFF44,transparent:true,opacity:1.0}));
                        _spMesh.position.set((gx+_dpPos.x)/2,(gy+_dpPos.y)/2,(gz+_dpPos.z)/2);
                        scene.add(_spMesh);
                        window._moonBeams.push({mesh:_spMesh,life:8,vx:0,vy:0.2,vz:0});
                    }
                    if(gm._swingFlash>0){
                        gm._swingFlash--;
                        _pulseSaberMaterial(gm.saberMesh,0xFFFFFF);
                    } else {
                        _pulseSaberMaterial(gm.saberMesh,0x000000);
                    }
                    if(!gm._clashCD)gm._clashCD=30+Math.floor(Math.random()*20);
                    gm._clashCD--;
                    if(gm._clashCD<=0){gm._clashCD=30+Math.floor(Math.random()*20);playHitSound(gm.group.position.x,gm.group.position.z);}
                }
            }
            // Random explosions near MS (battle damage effects)
            if(Math.random()<0.012&&window._moonBeams.length<300){
                var exOff=2+Math.random()*4;
                var exDir=new THREE.Vector3(Math.random()-0.5,Math.random()-0.5,Math.random()-0.5).normalize();
                var exSize=0.5+Math.random()*1.0;
                var exColors=[0xFF4400,0xFF8800,0xFFCC00,0xFF6600];
                var exColor=exColors[Math.floor(Math.random()*exColors.length)];
                var exMesh=new THREE.Mesh(new THREE.SphereGeometry(exSize,6,4),new THREE.MeshBasicMaterial({color:exColor,transparent:true,opacity:0.9}));
                exMesh.position.set(gx+exDir.x*exOff,gy+exDir.y*exOff,gz+exDir.z*exOff);
                scene.add(exMesh);
                window._moonBeams.push({mesh:exMesh,life:15,vx:exDir.x*0.3,vy:exDir.y*0.3,vz:exDir.z*0.3,_isExplosion:true});
                playExplosionSound();
                // Debris particles
                for(var dbi=0;dbi<3;dbi++){
                    var dbDir=new THREE.Vector3(Math.random()-0.5,Math.random()-0.5,Math.random()-0.5).normalize();
                    var dbMesh=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.2,0.2),new THREE.MeshBasicMaterial({color:0x666666,transparent:true,opacity:0.8}));
                    dbMesh.position.copy(exMesh.position);
                    scene.add(dbMesh);
                    window._moonBeams.push({mesh:dbMesh,life:20,vx:dbDir.x*1.5,vy:dbDir.y*1.5,vz:dbDir.z*1.5});
                }
                // Deal damage to this MS
                gm.hp=(gm.hp||gm.hpMax)-1;
            }
        }
        // ---- MS destruction: remove dead units with big explosion ----
        for(var _di=window._moonGundams.length-1;_di>=0;_di--){
            var _dm=window._moonGundams[_di];
            if(_dm._dead){
                // Respawn timer countdown
                _dm._respawnTimer--;
                if(_dm._respawnTimer<=0){
                    // Respawn: rebuild MS and fly in above battlefield
                    var _newGd=_buildMobileSuit(_dm._msType,_dm._weaponType,_dm._color);
                    // Respawn in faction zone
                    var _isLargeShip=(_dm._msType==='sdf1'||_dm._msType==='zenCruiser');
                    var _rsFz={efsf:{cx:200,cz:-200},unSpacy:{cx:200,cz:200},zentradi:{cx:-100,cz:250},zeon:{cx:-200,cz:-50}};
                    var _rsZ=_rsFz[_dm.faction]||{cx:0,cz:0};
                    var _sx=_rsZ.cx+(Math.random()-0.5)*120;
                    var _sy=_isLargeShip?200+Math.random()*100:30+Math.random()*60;
                    var _sz=_rsZ.cz+(Math.random()-0.5)*120;
                    _newGd.group.position.set(_sx,_sy,_sz);
                    _newGd.group.scale.set(2,2,2);
                    scene.add(_newGd.group);
                    _dm.group=_newGd.group;_dm.funnels=_newGd.funnels||null;_dm.saberMesh=_newGd.saberMesh||null;_dm.weapon=_newGd.weapon||null;
                    _dm.hp=_dm.hpMax;_dm._dead=false;
                    _dm.wpAngle=Math.random()*Math.PI*2;_dm.wpElev=0;
                    _dm.wpR=_isLargeShip?200+Math.random()*100:30+Math.random()*60;
                    _dm.wpTimer=5;
                }
                continue;
            }
            if(_dm.hp<=0&&!_dm._dead){
                // Destroy: big explosion + scatter debris
                var _dpos=_dm.group.position;
                var _dScale=_dm.ms==='sdf1'?8:_dm.ms==='zenCruiser'?6:3;
                for(var _ei=0;_ei<4;_ei++){
                    var _eDir=new THREE.Vector3(Math.random()-0.5,Math.random()-0.5,Math.random()-0.5).normalize();
                    var _eR=_dScale*(1+_ei*0.5);
                    var _eC=[0xFF4400,0xFF8800,0xFFCC00,0xFFFFFF][_ei%4];
                    var _eM=new THREE.Mesh(new THREE.SphereGeometry(_eR,6,4),new THREE.MeshBasicMaterial({color:_eC,transparent:true,opacity:0.95}));
                    _eM.position.set(_dpos.x+_eDir.x*_ei*0.5,_dpos.y+_eDir.y*_ei*0.5,_dpos.z+_eDir.z*_ei*0.5);
                    scene.add(_eM);
                    window._moonBeams.push({mesh:_eM,life:12+_ei*3,vx:_eDir.x*0.4,vy:_eDir.y*0.4,vz:_eDir.z*0.4,_isExplosion:true});
                }
                // Scatter debris pieces
                for(var _dbi=0;_dbi<4;_dbi++){
                    var _dbD=new THREE.Vector3(Math.random()-0.5,Math.random()-0.5,Math.random()-0.5).normalize();
                    var _dbM=new THREE.Mesh(new THREE.BoxGeometry(0.15*_dScale,0.1*_dScale,0.08*_dScale),new THREE.MeshBasicMaterial({color:0x555566,transparent:true,opacity:0.8}));
                    _dbM.position.copy(_dpos);scene.add(_dbM);
                    window._moonBeams.push({mesh:_dbM,life:30,vx:_dbD.x*2.5,vy:_dbD.y*2.5,vz:_dbD.z*2.5});
                }
                playExplosionSound();
                // Hide the MS group
                scene.remove(_dm.group);
                _dm._dead=true;
                _dm._respawnTimer=300+Math.floor(Math.random()*300); // 5-10 seconds
            }
        }
        // Determine if player is inside a city shield — hide all battle visuals if so
        var _playerInShield=playerEgg?_checkMoonShield(playerEgg.mesh.position.x,playerEgg.mesh.position.y,playerEgg.mesh.position.z):null;
        // Hide/show Gundam groups based on player shield status
        for(var _gvi=0;_gvi<window._moonGundams.length;_gvi++){
            var _gvm=window._moonGundams[_gvi];
            if(_gvm.group)_gvm.group.visible=!_playerInShield;
        }
        // Update beams + explosions
        for(var bbi=window._moonBeams.length-1;bbi>=0;bbi--){
            var bb=window._moonBeams[bbi];
            bb.mesh.position.x+=bb.vx;bb.mesh.position.y+=bb.vy;bb.mesh.position.z+=bb.vz;
            bb.life--;
            bb.mesh.visible=!_playerInShield;
            if(bb._isExplosion){
                if(bb._atField){
                    // AT Field ripple: delayed appearance, expand outward, then fade
                    if(bb._atDelay>0){
                        bb._atDelay--;
                        bb.mesh.visible=false;
                        bb.life++; // don't count down while waiting
                    } else {
                        bb.mesh.visible=!_playerInShield;
                        bb._atAge++;
                        if(bb._atMaxR){
                            // Ring: expand from small to max radius
                            var expandT=Math.min(bb._atAge/20,1);
                            var curR=1+expandT*(bb._atMaxR-1);
                            bb.mesh.scale.set(curR,curR,1);
                            // Fade in then out
                            if(bb._atAge<8) bb.mesh.material.opacity=bb._atAge/8*0.8;
                            else bb.mesh.material.opacity=Math.max(0,(bb.life/40)*0.8);
                        } else {
                            // Central flash: just fade
                            bb.mesh.material.opacity=Math.max(0,bb.life/20*0.9);
                            bb.mesh.scale.multiplyScalar(1.03);
                        }
                    }
                } else {
                    bb.mesh.material.opacity=bb.life/15*0.9;
                    bb.mesh.scale.multiplyScalar(1.1);
                }
            } else {
                bb.mesh.material.opacity=Math.max(0,bb.life/35);
                // Shield collision — AT Field effect
                if(!bb._shieldHit){
                    var _bs=_checkMoonShield(bb.mesh.position.x,bb.mesh.position.y,bb.mesh.position.z);
                    if(_bs){
                        var _bsx=bb.mesh.position.x-_bs.x,_bsy=bb.mesh.position.y-_bs.y,_bsz=bb.mesh.position.z-_bs.z;
                        var _bsd=DANBO_WASM.len3D(_bsx,_bsy,_bsz)||1;
                        _spawnATField(bb.mesh.position.x,bb.mesh.position.y,bb.mesh.position.z,_bsx/_bsd,_bsy/_bsd,_bsz/_bsd);
                        bb._shieldHit=true;bb.life=Math.min(bb.life,3);
                        bb.vx*=-0.3;bb.vy*=-0.3;bb.vz*=-0.3;
                    }
                }
                // Beam hits eggs (same as being thrown) — skip eggs inside city shields
                if(!bb._hitEgg)for(var _bei=0;_bei<allEggs.length;_bei++){
                    var _be=allEggs[_bei];if(!_be.alive||_be.heldBy||_be.throwTimer>0)continue;
                    if(_checkMoonShield(_be.mesh.position.x,_be.mesh.position.y,_be.mesh.position.z))continue;
                    var _bdx=_be.mesh.position.x-bb.mesh.position.x;
                    var _bdy=_be.mesh.position.y-bb.mesh.position.y;
                    var _bdz=_be.mesh.position.z-bb.mesh.position.z;
                    var _bd=DANBO_WASM.len3D(_bdx,_bdy,_bdz);
                    if(_bd<2.0){
                        var _bImp=0.15;
                        _be.vx+=bb.vx*_bImp;_be.vy+=bb.vy*_bImp+0.1;_be.vz+=bb.vz*_bImp;
                        _be.throwTimer=COMBAT.propImpact.throwTimer;_be._bounces=COMBAT.propImpact.bounces;_be.squash=0.5;
                        if(_be.isPlayer)playHitSound(_be.mesh.position.x,_be.mesh.position.z);
                        _dropNpcStolenCoins(_be);
                        bb._hitEgg=true;bb.life=Math.min(bb.life,3);break;
                    }
                }
            }
            if(bb.life<=0){scene.remove(bb.mesh);window._moonBeams.splice(bbi,1);}
        }
        // Update missiles with smoke trails
        for(var mmi2=window._moonMissiles.length-1;mmi2>=0;mmi2--){
            var mm=window._moonMissiles[mmi2];
            mm.group.position.x+=mm.vx;mm.group.position.y+=mm.vy;mm.group.position.z+=mm.vz;
            mm.life--;
            mm.group.visible=!_playerInShield;
            // Smoke trail puff
            if(mm.life%3===0&&mm.trail.length<(mm._isBarrage?15:12)){
                var _puffColor=mm._isBarrage?0xFF8833:0xAAAAAA;var _puffR=mm._isBarrage?0.05:0.15+Math.random()*0.15;var puff=new THREE.Mesh(new THREE.SphereGeometry(_puffR,4,3),new THREE.MeshBasicMaterial({color:_puffColor,transparent:true,opacity:0.5}));
                puff.position.copy(mm.group.position);
                scene.add(puff);
                mm.trail.push({mesh:puff,life:20});
            }
            // Fade trail
            for(var ti=mm.trail.length-1;ti>=0;ti--){
                mm.trail[ti].life--;
                mm.trail[ti].mesh.material.opacity=mm.trail[ti].life/20*0.5;
                mm.trail[ti].mesh.scale.multiplyScalar(1.04);
                mm.trail[ti].mesh.visible=!_playerInShield;
                if(mm.trail[ti].life<=0){scene.remove(mm.trail[ti].mesh);mm.trail.splice(ti,1);}
            }
            // Missile hits shields — AT Field
            if(!mm._shieldHit){
                var _ms=_checkMoonShield(mm.group.position.x,mm.group.position.y,mm.group.position.z);
                if(_ms){
                    var _msx=mm.group.position.x-_ms.x,_msy=mm.group.position.y-_ms.y,_msz=mm.group.position.z-_ms.z;
                    var _msd=DANBO_WASM.len3D(_msx,_msy,_msz)||1;
                    _spawnATField(mm.group.position.x,mm.group.position.y,mm.group.position.z,_msx/_msd,_msy/_msd,_msz/_msd);
                    mm._shieldHit=true;mm.life=0;
                }
            }
            // Missile hits eggs — skip eggs inside city shields
            if(!mm._hitEgg)for(var _mei=0;_mei<allEggs.length;_mei++){
                var _me=allEggs[_mei];if(!_me.alive||_me.heldBy||_me.throwTimer>0)continue;
                if(_checkMoonShield(_me.mesh.position.x,_me.mesh.position.y,_me.mesh.position.z))continue;
                var _mdx=_me.mesh.position.x-mm.group.position.x;
                var _mdy=_me.mesh.position.y-mm.group.position.y;
                var _mdz=_me.mesh.position.z-mm.group.position.z;
                var _md=DANBO_WASM.len3D(_mdx,_mdy,_mdz);
                if(_md<3.0){
                    var _mImp=0.2;if(_md>0.1){_me.vx+=_mdx/_md*_mImp;_me.vy+=_mdy/_md*_mImp+0.15;_me.vz+=_mdz/_md*_mImp;}
                    _me.throwTimer=COMBAT.stomp.throwTimer;_me._bounces=COMBAT.stomp.bounces;_me.squash=COMBAT.propImpact.squash;
                    if(_me.isPlayer)playHitSound(_me.mesh.position.x,_me.mesh.position.z);
                    _dropNpcStolenCoins(_me);
                    mm._hitEgg=true;mm.life=0;break;
                }
            }
            // Missile expired — big explosion
            if(mm.life<=0){
                // Multi-layer explosion
                var exColors2=[0xFF4400,0xFF8800,0xFFCC00];
                for(var exi=0;exi<3;exi++){
                    var exR=0.5+exi*0.4;
                    var flash=new THREE.Mesh(new THREE.SphereGeometry(exR,6,4),new THREE.MeshBasicMaterial({color:exColors2[exi%3],transparent:true,opacity:0.9-exi*0.15}));
                    flash.position.copy(mm.group.position);
                    flash.position.x+=(Math.random()-0.5)*0.5;flash.position.y+=(Math.random()-0.5)*0.5;flash.position.z+=(Math.random()-0.5)*0.5;
                    scene.add(flash);
                    window._moonBeams.push({mesh:flash,life:10+exi*4,vx:0,vy:0,vz:0,_isExplosion:true});
                }
                playExplosionSound();
                // Shrapnel
                for(var shi=0;shi<4;shi++){
                    var shDir=new THREE.Vector3(Math.random()-0.5,Math.random()-0.5,Math.random()-0.5).normalize();
                    var shMesh=new THREE.Mesh(new THREE.BoxGeometry(0.15,0.15,0.15),new THREE.MeshBasicMaterial({color:0x888888,transparent:true,opacity:0.7}));
                    shMesh.position.copy(mm.group.position);scene.add(shMesh);
                    window._moonBeams.push({mesh:shMesh,life:18,vx:shDir.x*2,vy:shDir.y*2,vz:shDir.z*2});
                }
                for(var tri=mm.trail.length-1;tri>=0;tri--){scene.remove(mm.trail[tri].mesh);}
                scene.remove(mm.group);window._moonMissiles.splice(mmi2,1);
            }
        }
    }
}

// ---- Struggle bar (HTML overlay) ----
var struggleBarDiv=null;
function ensureStruggleBar(){
    if(struggleBarDiv&&struggleBarDiv.parentNode)return;
    if(struggleBarDiv&&!struggleBarDiv.parentNode)struggleBarDiv=null; // was detached
    struggleBarDiv=document.createElement('div');
    struggleBarDiv.id='struggle-bar-container';
    struggleBarDiv.style.cssText='position:absolute;top:18%;left:50%;transform:translateX(-50%);z-index:15;pointer-events:none;display:none;text-align:center;';
    var _stText=L('struggle');struggleBarDiv.innerHTML='<div id="struggle-text" style="color:#fff;font-size:13px;font-weight:700;text-shadow:1px 1px 0 #000;margin-bottom:4px">'+_stText+'</div><div style="width:180px;height:14px;background:rgba(0,0,0,0.5);border-radius:7px;border:2px solid rgba(255,255,255,0.3);overflow:hidden"><div id="struggle-fill" style="height:100%;background:linear-gradient(90deg,#FF4444,#FFAA00);border-radius:5px;width:100%;transition:width 0.05s"></div></div>';
    document.getElementById('game-container').appendChild(struggleBarDiv);
}

// ---- PSOBB-style Chat Bubble System ----
var _chatBubbles=[]; // {egg, div, timer}
var _chatInput=null, _chatOpen=false;
function _ensureChatInput(){
    if(_chatInput)return;
    _chatInput=document.createElement('div');
    _chatInput.id='chat-input-bar';
    _chatInput.style.cssText='position:absolute;bottom:60px;left:50%;transform:translateX(-50%);z-index:20;display:none;';
    _chatInput.innerHTML='<input id="chat-field" type="text" maxlength="40" style="width:260px;padding:8px 12px;border:2px solid rgba(255,255,255,0.4);border-radius:20px;background:rgba(0,0,0,0.7);color:#fff;font-size:14px;outline:none;backdrop-filter:blur(6px);" placeholder="'+L('chatPlaceholder')+'">';
    document.getElementById('game-container').appendChild(_chatInput);
    var field=document.getElementById('chat-field');
    field.addEventListener('keydown',function(e){
        e.stopPropagation();
        if(e.code==='Enter'){
            var msg=field.value.trim();
            if(msg){
                // Check for chat commands (don't show bubble)
                if(_processChatCommand(msg)){
                    field.value='';_closeChatInput();
                    return;
                }
                if(playerEgg)_showChatBubble(playerEgg,msg);
            }
            field.value='';_closeChatInput();
        }
        if(e.code==='Escape'){field.value='';_closeChatInput();}
    });
}
function _openChatInput(){
    if(_chatOpen||gameState!=='city')return;
    _ensureChatInput();
    _chatOpen=true;
    _chatInput.style.display='block';
    var field=document.getElementById('chat-field');
    field.placeholder=L('chatPlaceholder');
    field.focus();
}
function _closeChatInput(){
    _chatOpen=false;
    if(_chatInput)_chatInput.style.display='none';
    var field=document.getElementById('chat-field');
    if(field)field.blur();
}
function _processChatCommand(msg){
    var cmd=msg.toLowerCase().replace(/\s+/g,' ').trim();
    // /fly me to the moon — teleport to moon
    if(cmd==='/fly me to the moon'||cmd==='fly me to the moon'){
        if(playerEgg&&currentCityStyle!==5&&gameState==='city'){
            startPipeTravel(playerEgg.mesh.position.x,playerEgg.mesh.position.z,5,playerEgg.mesh.position.y);
        }
        return true;
    }
    // /sakura — teleport to Sakura City
    if(cmd==='/sakura'||cmd==='sakura'){
        if(playerEgg&&currentCityStyle!==6&&gameState==='city'){
            startPipeTravel(playerEgg.mesh.position.x,playerEgg.mesh.position.z,6,playerEgg.mesh.position.y);
        }
        return true;
    }
    // /snow — teleport to Snow Village
    if(cmd==='/snow'||cmd==='snow'){
        if(playerEgg&&currentCityStyle!==7&&gameState==='city'){
            startPipeTravel(playerEgg.mesh.position.x,playerEgg.mesh.position.z,7,playerEgg.mesh.position.y);
        }
        return true;
    }
    // Commands start with / are hidden
    if(msg.charAt(0)==='/') return true;
    return false;
}
// Move name translations — now reads from MOVE_PARAMS.text, fallback to legacy table
var _moveNames={};
// Build from MOVE_PARAMS
(function(){
    for(var ct in MOVE_PARAMS){
        for(var mk in MOVE_PARAMS[ct]){
            var m=MOVE_PARAMS[ct][mk];
            if(m&&m.shout&&m.text)_moveNames[m.shout]=m.text;
        }
    }
})();
function _shoutMove(egg,key){
    // Accept either a string key (looked up in _moveNames) or a move object with .text field
    var txt;
    if(typeof key==='object'&&key.text){
        txt=key.text[_langCode]||key.text.en||key.shout||'!';
    } else {
        var t=_moveNames[key];
        txt=t?t[_langCode]||t.en||key:key;
    }
    _showChatBubble(egg,txt,60);
    egg._moveShoutTimer=60; // block random chat while shouting move name
}
function _showChatBubble(egg,msg,duration){
    if(!egg||!egg.mesh)return;
    var _bubbleTime=duration||300;
    // Remove old bubble for this egg
    for(var i=_chatBubbles.length-1;i>=0;i--){
        if(_chatBubbles[i].egg===egg){
            if(_chatBubbles[i].sprite)egg.mesh.remove(_chatBubbles[i].sprite);
            _chatBubbles.splice(i,1);
        }
    }
    // Create 3D sprite bubble above egg head (PSOBB comic style)
    var canvas=document.createElement('canvas');
    canvas.width=512;canvas.height=128;
    var ctx2=canvas.getContext('2d');
    // Comic bubble background
    ctx2.fillStyle='rgba(255,255,255,0.92)';
    _drawBubblePath(ctx2,10,10,492,90,18);
    ctx2.fill();
    ctx2.strokeStyle='rgba(0,0,0,0.5)';ctx2.lineWidth=3;
    _drawBubblePath(ctx2,10,10,492,90,18);
    ctx2.stroke();
    // Tail triangle
    ctx2.fillStyle='rgba(255,255,255,0.92)';
    ctx2.beginPath();ctx2.moveTo(230,100);ctx2.lineTo(256,125);ctx2.lineTo(280,100);ctx2.fill();
    ctx2.strokeStyle='rgba(0,0,0,0.5)';ctx2.lineWidth=3;
    ctx2.beginPath();ctx2.moveTo(230,100);ctx2.lineTo(256,125);ctx2.lineTo(280,100);ctx2.stroke();
    // Text — auto-size font to fit
    ctx2.fillStyle='#222';ctx2.textAlign='center';ctx2.textBaseline='middle';
    var _bfs=32;ctx2.font='bold '+_bfs+'px sans-serif';
    var _btxt=msg.substring(0,24);
    while(ctx2.measureText(_btxt).width>470&&_bfs>14){_bfs-=2;ctx2.font='bold '+_bfs+'px sans-serif';}
    ctx2.fillText(_btxt,256,55);
    var tex=new THREE.CanvasTexture(canvas);
    var spriteMat=new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false});
    var sprite=new THREE.Sprite(spriteMat);
    sprite.scale.set(4,1,1);
    sprite.position.y=3.2;
    egg.mesh.add(sprite);
    _chatBubbles.push({egg:egg,sprite:sprite,timer:_bubbleTime});
}
function _drawBubblePath(ctx,x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);
    ctx.closePath();
}
function _updateChatBubbles(){
    for(var i=_chatBubbles.length-1;i>=0;i--){
        var cb=_chatBubbles[i];
        cb.timer--;
        if(cb.timer<30&&cb.sprite)cb.sprite.material.opacity=cb.timer/30;
        if(cb.timer<=0){
            if(cb.sprite&&cb.egg&&cb.egg.mesh)cb.egg.mesh.remove(cb.sprite);
            _chatBubbles.splice(i,1);
        }
    }
}
// NPC random chat bubbles
var _npcChatPhrases={
    zhs:['\u4F60\u597D\uFF01','\u54C8\u54C8','\u8DD1\u5440\uFF01','\u52A0\u6CB9\uFF01','\u563F\u563F','\u597D\u73A9\uFF01','\u8981\u8D62\uFF01','\u522B\u8DD1\uFF01','\u6765\u6293\u6211\u5440','\u54CE\u5440\uFF01'],
    zht:['\u4F60\u597D\uFF01','\u54C8\u54C8','\u8DD1\u5440\uFF01','\u52A0\u6CB9\uFF01','\u563F\u563F','\u597D\u73A9\uFF01','\u8981\u8D0F\uFF01','\u5225\u8DD1\uFF01','\u4F86\u6293\u6211\u5440','\u54CE\u5440\uFF01'],
    ja:['\u3084\u3042\uFF01','\u30CF\u30CF','\u8D70\u308C\uFF01','\u30D5\u30A1\u30A4\u30C8\uFF01','\u30D8\u30D8','\u697D\u3057\u3044\uFF01','\u52DD\u3064\uFF01','\u9003\u3052\u308D\uFF01','\u6355\u307E\u3048\u3066\u307F\u308D','\u3046\u308F\uFF01'],
    en:['Hi!','Haha','Run!','Go go!','Hehe','Fun!','Win!','Catch me!','Whoa!','Yay!']
};
function _npcRandomChat(egg){
    if(Math.random()>0.0008)return; // very rare
    if(egg.heldBy||!egg.alive)return;
    if(egg._moveShoutTimer>0){egg._moveShoutTimer--;return;} // don't override move shout
    var phrases=_npcChatPhrases[_langCode]||_npcChatPhrases.en;
    _showChatBubble(egg,phrases[Math.floor(Math.random()*phrases.length)]);
}

// ---- Held egg follow + struggle + NPC grab AI ----
function updateHeldEggs(){
    ensureStruggleBar();
    var playerIsHeld=false;
    for(var i=0;i<allEggs.length;i++){
        var egg=allEggs[i];
        if(!egg.heldBy){
            // Remove 3D bar if it had one
            if(egg.struggleBar){egg.mesh.remove(egg.struggleBar);egg.struggleBar=null;}
            // Reset upside-down rotation if was held (skip during attack spins)
            var _inSpin=egg._blankaSpinTimer||egg._blankaSpinFalling||egg._guileSomersault||egg._hondaDash;
            if(egg.mesh.rotation.x>Math.PI*0.5&&!_inSpin){egg.mesh.rotation.x=0;egg.mesh.rotation.z=0;}
            var _rb=egg.mesh.userData.body;if(_rb&&_rb.rotation.x!==0&&!_inSpin)_rb.rotation.x=0;
            // Hide arms if this egg was a holder
            if(!egg.holding){var _ra=egg.mesh.userData;if(_ra.rightArm&&_ra.rightArm.rotation.x<-1){_ra.rightArm.visible=false;_ra.rightArm.rotation.x=0;_ra.rightArm.position.set(0.4,0.2,0.7);_ra.rightArm.scale.set(1,1,1);}if(_ra.leftArm&&_ra.leftArm.rotation.x<-1){_ra.leftArm.visible=false;_ra.leftArm.rotation.x=0;_ra.leftArm.position.set(-0.4,0.2,0.7);_ra.leftArm.scale.set(1,1,1);}}
            continue;
        }
        var holder=egg.heldBy;
        // Skip normal held positioning during piledriver (piledriver handles its own positioning)
        if(holder._piledriverTarget===egg||holder._npcPiledriver===egg||egg._piledriverLocked)continue;
        // Position on holder head
        egg.mesh.position.x=holder.mesh.position.x;
        egg.mesh.position.y=holder.mesh.position.y+3.0;
        egg.mesh.position.z=holder.mesh.position.z;
        egg.vx=0;egg.vy=0;egg.vz=0;
        egg.mesh.rotation.y=holder.mesh.rotation.y+Math.PI; // face toward holder
        egg.mesh.rotation.x=Math.PI; // upside down (held by head)
        // Show holder's arms raised up
        var _hArms=holder.mesh.userData;
        if(_hArms.rightArm){_hArms.rightArm.visible=true;_hArms.rightArm.position.set(0.25,1.0,0);_hArms.rightArm.scale.set(1,1,1.5);_hArms.rightArm.rotation.x=-Math.PI/2;}
        if(_hArms.leftArm){_hArms.leftArm.visible=true;_hArms.leftArm.position.set(-0.25,1.0,0);_hArms.leftArm.scale.set(1,1,1.5);_hArms.leftArm.rotation.x=-Math.PI/2;}
        // Struggle timer countdown
        egg.struggleTimer--;
        // Player mashing directions speeds up escape
        if(egg.isPlayer){
            playerIsHeld=true;
            if(keys['KeyA']||keys['KeyD']||keys['KeyW']||keys['KeyS']||keys['ArrowLeft']||keys['ArrowRight']||keys['ArrowUp']||keys['ArrowDown']||joyActive){
                egg.struggleTimer-=2;
            }
        } else {
            // NPC random extra struggle
            if(Math.random()<0.08) egg.struggleTimer--;
        }
        // NPC holder may throw the held egg randomly
        if(!holder.isPlayer&&holder.holding===egg&&Math.random()<0.006){
            holder.holding=null; egg.heldBy=null;
            if(egg.struggleBar){egg.mesh.remove(egg.struggleBar);egg.struggleBar=null;}
            holder.grabCD=40; egg.grabCD=40;
            var throwDir=holder.mesh.rotation.y;
            egg.mesh.position.set(holder.mesh.position.x+Math.sin(throwDir)*1.5, holder.mesh.position.y+0.5, holder.mesh.position.z+Math.cos(throwDir)*1.5);
            var ntw=egg.weight||1.0;var ntf=0.3/ntw;egg.vx=Math.sin(throwDir)*ntf;egg.vy=-0.02;egg.vz=Math.cos(throwDir)*ntf;egg._throwTotal=COMBAT.npcThrow.throwTotal;egg.throwTimer=COMBAT.npcThrow.throwTimer;egg._bounces=COMBAT.npcThrow.bounces;
            if(currentCityStyle===5&&gameState==='city'){egg.vx*=0.3;egg.vy*=0.3;egg.vz*=0.3;egg._throwTotal=COMBAT.npcThrow.throwTotal;egg.throwTimer=COMBAT.npcThrow.throwTimer;}
            egg.squash=0.5; playThrowSound(holder.mesh.position.x,holder.mesh.position.z);
            egg._dropCoinsOnLand=true;egg._coinsDropped=false;
            continue;
        }
        // Escape!
        if(egg.struggleTimer<=0){
            holder.holding=null; egg.heldBy=null;
            holder.grabCD=30; egg.grabCD=40;
            // Pop out to the side
            var escDir=holder.mesh.rotation.y+Math.PI*(0.5+Math.random());
            egg.mesh.position.x=holder.mesh.position.x+Math.sin(escDir)*1.5;
            egg.mesh.position.y=holder.mesh.position.y+0.5;
            egg.mesh.position.z=holder.mesh.position.z+Math.cos(escDir)*1.5;
            egg.vx=Math.sin(escDir)*0.2;egg.vy=0.18;egg.vz=Math.cos(escDir)*0.2;
            egg.squash=0.6;
            if(egg.struggleBar){egg.mesh.remove(egg.struggleBar);egg.struggleBar=null;}
            _dropNpcStolenCoins(egg);
            continue;
        }
        // 3D struggle bar above held egg (for NPC being held)
        if(!egg.isPlayer){
            if(!egg.struggleBar){
                var bg=new THREE.Group();
                var barBg=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.12,0.06),new THREE.MeshBasicMaterial({color:0x333333,transparent:true,opacity:0.7}));
                bg.add(barBg);
                var barFill=new THREE.Mesh(new THREE.BoxGeometry(1.1,0.08,0.07),new THREE.MeshBasicMaterial({color:0xFF4444}));
                barFill.position.z=0.01;
                bg.add(barFill);
                bg.position.y=-1.0; // just above butt (top of flipped egg)
                egg.mesh.add(bg);
                egg.struggleBar=bg;
                egg.struggleBar.userData.fill=barFill;
            }
            var pct=Math.max(0,egg.struggleTimer/egg.struggleMax);
            var fill=egg.struggleBar.userData.fill;
            fill.scale.x=pct;
            fill.position.x=-(1-pct)*0.55;
            fill.material.color.setHex(pct>0.5?0xFFAA00:0xFF4444);
            egg.struggleBar.lookAt(camera.position);
        }
        // Struggle animation — wobble and shake (upside-down base)
        var t=Date.now()*0.012;
        egg.mesh.rotation.z=Math.sin(t*3.7)*0.4;
        egg.mesh.rotation.x=Math.PI+Math.sin(t*2.9)*0.3;
        var body=egg.mesh.userData.body;
        if(body){body.rotation.z=Math.sin(t*5.1)*0.25;body.rotation.x=Math.cos(t*4.3)*0.2;}
        var feet=egg.mesh.userData.feet;
        if(feet&&feet.length===2){feet[0].position.z=0.06+Math.sin(t*6)*0.15;feet[1].position.z=0.06-Math.sin(t*6)*0.15;}
    }
    // Player held UI
    if(playerIsHeld&&playerEgg&&playerEgg.heldBy){
        struggleBarDiv.style.display='block';
        var pct2=Math.max(0,playerEgg.struggleTimer/playerEgg.struggleMax);
        document.getElementById('struggle-fill').style.width=(pct2*100)+'%';
    } else {
        if(!playerEgg||!playerEgg._stunTimer||playerEgg._stunTimer<=0)struggleBarDiv.style.display='none';
    }
    // ---- NPC grab AI (low chance, very close range) ----
    for(var n=0;n<allEggs.length;n++){
        var npc=allEggs[n];
        if(npc.isPlayer||!npc.alive||npc.heldBy||npc.holding||npc.holdingProp||npc.grabCD>0)continue;
        if(npc.grabCD>0){npc.grabCD--;continue;}
        if(Math.random()>0.004)continue; // very low chance per frame
        // Find nearest non-held egg within 1.5 distance
        var best=null,bestD=1.5;
        for(var m=0;m<allEggs.length;m++){
            var target=allEggs[m];
            if(target===npc||!target.alive||target.heldBy||target.holding)continue;
            var ddx=target.mesh.position.x-npc.mesh.position.x;
            var ddz=target.mesh.position.z-npc.mesh.position.z;
            var dd=DANBO_WASM.len2D(ddx,ddz);
            if(dd<bestD){bestD=dd;best=target;}
        }
        if(best){
            npc.holding=best;best.heldBy=npc;
            // Drop any prop the grabbed NPC was holding
            if(best.holdingProp){best.holdingProp.grabbed=false;best.holdingProp=null;}
            npc.grabCD=30;
            best.struggleMax=240+Math.floor(Math.random()*240);
            best.struggleTimer=best.struggleMax;
            playGrabSound(npc.mesh.position.x,npc.mesh.position.z);
        } else if(gameState==='city'){
            // NPC grab city prop if no egg nearby
            var bestProp=null,bestPD=2.5;
            for(var pp2=0;pp2<cityProps.length;pp2++){
                var cp2=cityProps[pp2];
                if(cp2.grabbed)continue;
                var cpdx=cp2.group.position.x-npc.mesh.position.x;
                var cpdz=cp2.group.position.z-npc.mesh.position.z;
                var cpd2=DANBO_WASM.len2D(cpdx,cpdz);
                if(cpd2<bestPD){bestPD=cpd2;bestProp=cp2;}
            }
            if(bestProp){
                npc.holdingProp=bestProp;
                bestProp.grabbed=true;
                bestProp.throwTimer=0;bestProp.throwVx=0;bestProp.throwVy=0;bestProp.throwVz=0;
                bestProp.group.rotation.set(0,0,0);
                npc.grabCD=30;
                npc._npcPropHoldTimer=90+Math.floor(Math.random()*120);
                playGrabSound(npc.mesh.position.x,npc.mesh.position.z);
            }
        }
    }
    // ---- NPC throw held props ----
    for(var np2=0;np2<allEggs.length;np2++){
        var npc2=allEggs[np2];
        if(npc2.isPlayer||!npc2.alive||!npc2.holdingProp)continue;
        var hp=npc2.holdingProp;
        hp.group.position.x=npc2.mesh.position.x;
        hp.group.position.y=npc2.mesh.position.y+1.8;
        hp.group.position.z=npc2.mesh.position.z;
        if(!npc2._npcPropHoldTimer)npc2._npcPropHoldTimer=60;
        npc2._npcPropHoldTimer--;
        if(npc2._npcPropHoldTimer<=0){
            // Throw prop toward nearest egg
            var throwDir2=npc2.mesh.rotation.y;
            var nearTgt=null,nearTD=20;
            for(var nt=0;nt<allEggs.length;nt++){
                var tgt=allEggs[nt];
                if(tgt===npc2||!tgt.alive||tgt.heldBy)continue;
                var ntdx=tgt.mesh.position.x-npc2.mesh.position.x;
                var ntdz=tgt.mesh.position.z-npc2.mesh.position.z;
                var ntd=DANBO_WASM.len2D(ntdx,ntdz);
                if(ntd<nearTD){nearTD=ntd;nearTgt=tgt;throwDir2=Math.atan2(ntdx,ntdz);}
            }
            npc2.holdingProp=null;
            var pw2=hp.weight||1.0;var pf2=2.5/pw2;
            hp.throwVx=Math.sin(throwDir2)*pf2;hp.throwVy=0.18;hp.throwVz=Math.cos(throwDir2)*pf2;
            hp._bounces=2;hp.throwTimer=25;
            hp.group.position.set(npc2.mesh.position.x+Math.sin(throwDir2)*1.5,npc2.mesh.position.y+0.5,npc2.mesh.position.z+Math.cos(throwDir2)*1.5);
            npc2.grabCD=40;
            playThrowSound(npc2.mesh.position.x,npc2.mesh.position.z);
        }
    }
    // Update held city prop position
    if(playerEgg&&playerEgg.holdingProp){
        var pp=playerEgg.holdingProp;
        pp.group.position.x=playerEgg.mesh.position.x;
        pp.group.position.y=playerEgg.mesh.position.y+1.8;
        pp.group.position.z=playerEgg.mesh.position.z;
    }
    // Thrown city prop physics
    for(var tpi=0;tpi<cityProps.length;tpi++){
        var tp=cityProps[tpi];
        if(tp.throwTimer<=0)continue;
        tp.throwTimer--;
        if(tp.throwTimer<=0){
            // Throw ended — reset grabbed state
            tp.grabbed=false;
            tp.x=tp.group.position.x;tp.z=tp.group.position.z;
            if(tp.group.position.y>0.01){tp.throwVy=-0.05;tp.throwTimer=1;} // still in air, keep falling
            else{tp.group.rotation.set(Math.PI/2*(Math.random()*0.4+0.8)*(Math.random()<0.5?1:-1),Math.random()*Math.PI*2,0);} // topple over
            continue;
        }
        tp.group.position.x+=tp.throwVx;
        tp.group.position.y+=tp.throwVy;
        tp.group.position.z+=tp.throwVz;
        tp.throwVy-=0.012*(tp.weight||1);
        var _tpDrag=tp._chargeDrag||0.92;
        tp.throwVx*=_tpDrag; tp.throwVz*=_tpDrag;
        tp.group.rotation.x+=0.25; tp.group.rotation.z+=0.2;
        // Building collision for thrown props
        for(var _tpci=0;_tpci<cityColliders.length;_tpci++){
            var _tpc=cityColliders[_tpci];
            var _tpdx=tp.group.position.x-_tpc.x, _tpdz=tp.group.position.z-_tpc.z;
            var _tpov=DANBO_WASM.aabbOverlap2D(tp.group.position.x,tp.group.position.z,_tpc.x,_tpc.z,_tpc.hw,_tpc.hd,1.5);
            if(_tpov[7]&&tp.group.position.y<(_tpc.h||6)){
                if(_tpov[4]===0){tp.group.position.x+=_tpov[5]*_tpov[2];tp.throwVx*=-0.3;}
                else{tp.group.position.z+=_tpov[6]*_tpov[3];tp.throwVz*=-0.3;}
                tp.throwTimer=1;playHitSound(tp.group.position.x,tp.group.position.z);break;
            }
        }
        // City boundary air wall bounce for props
        var _pb=CITY_SIZE-1;
        if(tp.group.position.x>_pb){tp.group.position.x=_pb;tp.throwVx=-Math.abs(tp.throwVx)*0.4;}
        if(tp.group.position.x<-_pb){tp.group.position.x=-_pb;tp.throwVx=Math.abs(tp.throwVx)*0.4;}
        if(tp.group.position.z>_pb){tp.group.position.z=_pb;tp.throwVz=-Math.abs(tp.throwVz)*0.4;}
        if(tp.group.position.z<-_pb){tp.group.position.z=-_pb;tp.throwVz=Math.abs(tp.throwVz)*0.4;}
        if(tp.group.position.y<0.01&&tp.throwVy<0){
            if(tp._bounces>0){tp._bounces--;tp.throwVy=Math.abs(tp.throwVy)*0.45;tp.throwVx*=0.7;tp.throwVz*=0.7;tp.group.position.y=0.01;playHitSound(tp.group.position.x,tp.group.position.z);}
            else{tp.group.position.y=0.01;tp.throwTimer=0;tp.grabbed=false;tp.group.rotation.set(Math.PI/2*(Math.random()*0.4+0.8)*(Math.random()<0.5?1:-1),Math.random()*Math.PI*2,0);tp.x=tp.group.position.x;tp.z=tp.group.position.z;}
        }
        // Hit eggs
        for(var tpe=0;tpe<allEggs.length;tpe++){
            var tpeg=allEggs[tpe];
            if(!tpeg.alive||tpeg.heldBy)continue;
            var tpdx=tpeg.mesh.position.x-tp.group.position.x;
            var tpdz=tpeg.mesh.position.z-tp.group.position.z;
            var tpd=DANBO_WASM.len2D(tpdx,tpdz);
            if(tpd<tp.radius+0.8){
                var impW=tp.weight||1;tpeg.vx+=tpdx/tpd*0.4*impW;tpeg.vz+=tpdz/tpd*0.4*impW;tpeg.vy=0.3+0.12*impW;tpeg.squash=COMBAT.propImpact.squash;tpeg.throwTimer=COMBAT.propImpact.throwTimer;tpeg._bounces=COMBAT.propImpact.bounces;
                if(tpeg.isPlayer)playHitSound(tpeg.mesh.position.x,tpeg.mesh.position.z);
                _dropNpcStolenCoins(tpeg);
            }
        }
        // Hit other props
        for(var tpp=0;tpp<cityProps.length;tpp++){
            if(tpp===tpi||cityProps[tpp].grabbed)continue;
            var op=cityProps[tpp];
            var opdx=op.group.position.x-tp.group.position.x;
            var opdz=op.group.position.z-tp.group.position.z;
            var opd=DANBO_WASM.len2D(opdx,opdz);
            if(opd<tp.radius+op.radius&&opd>0.01){
                op.group.position.x+=opdx/opd*0.8;
                op.group.position.z+=opdz/opd*0.8;
                op.group.position.y+=0.3;
            }
        }
    }
    // Update held obstacle position
    if(playerEgg&&playerEgg.holdingObs){
        var ob=playerEgg.holdingObs;
        ob.mesh.position.x=playerEgg.mesh.position.x;
        ob.mesh.position.y=playerEgg.mesh.position.y+1.8;
        ob.mesh.position.z=playerEgg.mesh.position.z;
    }
    // Thrown obstacle physics
    for(var ti=0;ti<_danboRaceObstacles().length;ti++){
        var tob=_danboRaceObstacles()[ti];
        if(!tob._throwTimer||tob._throwTimer<=0)continue;
        tob._throwTimer--;
        tob.mesh.position.x+=tob._throwVx;
        tob.mesh.position.y+=tob._throwVy;
        tob.mesh.position.z+=tob._throwVz;
        tob._throwVy-=0.012*(tob._weight||2);
        var _obDrag=tob._chargeDrag||0.96;
        tob._throwVx*=_obDrag; tob._throwVz*=_obDrag;
        if(tob.mesh.position.y<(tob.data.fy||0)+0.5&&tob._throwVy<0){
            if(tob._bounces>0){tob._bounces--;tob._throwVy=Math.abs(tob._throwVy)*0.45;tob._throwVx*=0.7;tob._throwVz*=0.7;tob.mesh.position.y=(tob.data.fy||0)+0.5;playHitSound(tob.mesh.position.x,tob.mesh.position.z);}
            else{tob.mesh.position.y=(tob.data.fy||0)+0.5;tob._throwTimer=0;tob._grabbed=false;}
        }
        // Hit other eggs with thrown obstacle
        for(var te=0;te<allEggs.length;te++){
            var teg=allEggs[te];
            if(!teg.alive||teg.heldBy)continue;
            var tdx=teg.mesh.position.x-tob.mesh.position.x;
            var tdz=teg.mesh.position.z-tob.mesh.position.z;
            if(DANBO_WASM.len2D(tdx,tdz)<1.5){
                var oiw=tob._weight||2;teg.vx+=tdx*0.35*oiw;teg.vz+=tdz*0.35*oiw;teg.vy=0.3+0.12*oiw;teg.squash=COMBAT.propImpact.squash;teg.throwTimer=COMBAT.propImpact.throwTimer;teg._bounces=COMBAT.propImpact.bounces;if(teg.isPlayer)playHitSound(teg.mesh.position.x,teg.mesh.position.z);
                _dropNpcStolenCoins(teg);
            }
        }
        if(tob._throwTimer<=0){
            tob._grabbed=false;
            // Reset obstacle to original position after a delay
            tob._resetDelay=120;
        }
        tob.mesh.rotation.x+=0.3;tob.mesh.rotation.z+=0.25;
    }
    // Reset thrown obstacles
    for(var ri2=0;ri2<_danboRaceObstacles().length;ri2++){
        var rob=_danboRaceObstacles()[ri2];
        if(rob._resetDelay>0){
            rob._resetDelay--;
            if(rob._resetDelay<=0&&rob._origPos){
                rob.mesh.position.set(rob._origPos.x,rob._origPos.y,rob._origPos.z);
                rob.mesh.rotation.set(0,0,0);
                rob._origPos=null;
            }
        }
    }
    // Decrement grabCD for all
    for(var g=0;g<allEggs.length;g++){if(allEggs[g].grabCD>0)allEggs[g].grabCD--;}
}


// ---- Portal confirm dialog ----
var _portalConfirmOpen=false, _portalConfirmRace=-1, _portalConfirmTarget=-1, _portalDismissed=null, _portalConfirmHidden=null;
var _portalConfirmWarpPipe=null, _portalConfirmBabelDir=0, _portalConfirmKey=null, _portalConfirmPlugin=null;
var _portalPromptPortal=null;
var _portalSel=0;
function _updatePortalSel(){
    var yb=document.getElementById('portal-yes');
    var nb=document.getElementById('portal-no');
    if(yb)yb.style.outline=_portalSel===0?'3px solid #FFD700':'none';
    if(nb)nb.style.outline=_portalSel===1?'3px solid #FFD700':'none';
}
function showPortalConfirm(portal){
    _portalConfirmOpen=true;
    // All confirm types now unified
    _portalConfirmRace=portal.raceIndex;
    _portalConfirmTarget=portal._targetStyle||(-1);
    _portalConfirmHidden=portal._hiddenType||null;
    _portalConfirmWarpPipe=portal._isWarpPipe?{x:portal._pipeX,z:portal._pipeZ,target:portal._targetStyle}:null;
    _portalConfirmBabelDir=portal._babelDir||0;
    _portalConfirmKey=_danboPortalDismissKey(portal);
    _portalConfirmPlugin=portal._pluginId||portal.pluginId||null;
    _portalDismissed=null;
    var box=document.getElementById('portal-confirm');
    document.getElementById('portal-confirm-name').textContent=portal.name;
    document.getElementById('portal-confirm-desc').textContent=portal.desc;
    box.style.display='flex';_portalSel=0;_updatePortalSel();
}
function _danboPortalPromptActive(){
    var pp=document.getElementById('portal-prompt');
    return !!(_portalPromptPortal&&!_portalConfirmOpen&&pp&&pp.style.display!=='none');
}
function _danboOpenPortalPrompt(){
    if(_portalConfirmOpen)return true;
    if(!_portalPromptPortal)return false;
    _portalDismissed=null;
    showPortalConfirm(_portalPromptPortal);
    return true;
}
function hidePortalConfirm(){
    _portalDismissed=_portalConfirmKey||((_portalConfirmRace>=0)?('race:'+_portalConfirmRace):('target:'+_portalConfirmTarget));
    _portalConfirmOpen=false;
    _portalConfirmRace=-1;
    _portalConfirmTarget=-1;
    _portalConfirmHidden=null;
    _portalConfirmWarpPipe=null;
    _portalConfirmBabelDir=0;
    _portalConfirmKey=null;
    _portalConfirmPlugin=null;
    _portalPromptPortal=null;
    document.getElementById('portal-confirm').style.display='none';
}
function confirmPortalEnter(){
    var ri=_portalConfirmRace;
    var ts=_portalConfirmTarget;
    var ht=_portalConfirmHidden;
    var wp=_portalConfirmWarpPipe;
    var bd=_portalConfirmBabelDir;
    var pid=_portalConfirmPlugin;
    hidePortalConfirm();
    document.getElementById('portal-prompt').style.display='none';
    if(ri>=0){
        if(window.DANBO_PLUGIN_HOST&&DANBO_PLUGIN_HOST.get('legacy-race'))DANBO_PLUGIN_HOST.start('legacy-race',{raceIndex:ri,source:'portal'});
        else if(typeof enterRace==='function')enterRace(ri);
        else console.error('Race plugin runtime is not loaded');
    }
    else if(wp&&playerEgg){
        startPipeTravel(wp.x,wp.z,wp.target);
    }
    else if(ht==='babel'){
        if(!_babylonTower)return;
        var _bDir=bd||1;
        _babylonElevator=true;
        _babylonElevDir=_bDir;
        _babylonElevY=(_bDir===1)?1:_babylonTower.topY;
        if(sfxEnabled){
            var ctx=ensureAudio();if(ctx){
                var o=ctx.createOscillator();var g=ctx.createGain();o.type='sine';
                if(_bDir===1){o.frequency.setValueAtTime(200,ctx.currentTime);o.frequency.linearRampToValueAtTime(600,ctx.currentTime+2);}
                else{o.frequency.setValueAtTime(600,ctx.currentTime);o.frequency.linearRampToValueAtTime(200,ctx.currentTime+2);}
                g.gain.setValueAtTime(0.1,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+2.5);
                o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+2.5);
            }
        }
    }
    else if(ht==='moonPipe'){
        if(_cloudWorldPipe)startPipeTravel(_cloudWorldPipe.x,_cloudWorldPipe.z,_cloudWorldPipe.targetStyle,_cloudWorldPipe.y);
    }
    else if(ht==='earthReturn'&&playerEgg){
        var _retStyle=(_prevCityStyle>=0&&_prevCityStyle<5)?_prevCityStyle:0;
        startPipeTravel(playerEgg.mesh.position.x,playerEgg.mesh.position.z,_retStyle,playerEgg.mesh.position.y);
    }
    else if(ht==='platformer'){
        if(window.DANBO_PLUGIN_HOST&&DANBO_PLUGIN_HOST.get('legacy-platformer'))DANBO_PLUGIN_HOST.start('legacy-platformer',{source:'portal'});
        else if(typeof _pfStart==='function'){_pfStart();}
    }
    else if(pid){
        if(window.DANBO_PLUGIN_HOST&&DANBO_PLUGIN_HOST.get(pid))DANBO_PLUGIN_HOST.start(pid,{source:'portal',hiddenType:ht||''});
        else console.error('Plugin runtime is not available: '+pid);
    }
    else if(ht==='rocketRoad'){
        if(window.DANBO_PLUGIN_HOST&&DANBO_PLUGIN_HOST.get('rocket-road'))DANBO_PLUGIN_HOST.start('rocket-road',{source:'portal'});
        else console.error('Rocket Road plugin runtime is not loaded');
    }
    else if(ht==='shopHouse'){
        if(typeof _enterShopHouse==='function')_enterShopHouse();
    }
    else if(ht==='shopKeeper'){
        if(typeof _openShop==='function')_openShop();
    }
    else if(ht==='houseDoor'){
        if(typeof _interiorEnter==='function')_interiorEnter((typeof _nearDoorBuilding!=='undefined')?_nearDoorBuilding:null);
    }
    else if(ts>=0){ switchCity(ts); }
}
document.getElementById('portal-yes').addEventListener('click',function(){confirmPortalEnter();});
document.getElementById('portal-no').addEventListener('click',function(){hidePortalConfirm();});
document.getElementById('portal-prompt').addEventListener('click',function(){_danboOpenPortalPrompt();});
document.getElementById('portal-prompt').addEventListener('touchend',function(e){e.preventDefault();_danboOpenPortalPrompt();},{passive:false});

// ---- Babel Tower prompt — unified into showPortalConfirm ----
var _babylonPromptDir=1;
function _showBabylonPrompt(dir){
    if(_portalConfirmOpen)return;
    _babylonPromptDir=dir||1;
    var babelName={zhs:'\u5DF4\u522B\u5854',zht:'\u5DF4\u5225\u5854',ja:'\u30D0\u30D9\u30EB\u306E\u5854',en:'Tower of Babel'};
    var upDesc={zhs:'\u4E58\u5750\u7535\u68AF\u524D\u5F80\u4E91\u4E2D\u754C\uFF1F',zht:'\u4E58\u5750\u96FB\u68AF\u524D\u5F80\u96F2\u4E2D\u754C\uFF1F',ja:'\u30A8\u30EC\u30D9\u30FC\u30BF\u30FC\u3067\u96F2\u4E2D\u754C\u3078\uFF1F',en:'Take elevator to Cloud Realm?'};
    var downDesc={zhs:'\u4E58\u5750\u7535\u68AF\u8FD4\u56DE\u5730\u9762\uFF1F',zht:'\u4E58\u5750\u96FB\u68AF\u8FD4\u56DE\u5730\u9762\uFF1F',ja:'\u30A8\u30EC\u30D9\u30FC\u30BF\u30FC\u3067\u5730\u4E0A\u3078\uFF1F',en:'Take elevator back down?'};
    var dTxt=dir===-1?downDesc:upDesc;
    showPortalConfirm({name:babelName[_langCode]||babelName.en,desc:dTxt[_langCode]||dTxt.en,raceIndex:-1,_hiddenType:'babel',_babelDir:dir||1});
}
// ---- Moon Pipe prompt — unified into showPortalConfirm ----
function _showMoonPipePrompt(){
    if(_portalConfirmOpen)return;
    var moonName=CITY_STYLES[5]?CITY_STYLES[5].name:'Moon';
    var desc={zhs:'\u901A\u8FC7\u661F\u7A7A\u96A7\u9053\u524D\u5F80'+moonName+'\uFF1F',zht:'\u901A\u904E\u661F\u7A7A\u96A7\u9053\u524D\u5F80'+moonName+'\uFF1F',ja:'\u661F\u7A7A\u30C8\u30F3\u30CD\u30EB\u3067'+moonName+'\u3078\uFF1F',en:'Travel through starfield tunnel to '+moonName+'?'};
    showPortalConfirm({name:moonName,desc:desc[_langCode]||desc.en,raceIndex:-1,_hiddenType:'moonPipe'});
}
addEventListener('keydown',function(e){
    if(!_portalConfirmOpen)return;
    if(e.code==='ArrowLeft'||e.code==='KeyA'){e.preventDefault();_portalSel=(_portalSel+1)%2;_updatePortalSel();}
    if(e.code==='ArrowRight'||e.code==='KeyD'){e.preventDefault();_portalSel=(_portalSel+1)%2;_updatePortalSel();}
    if(e.code==='Enter'||e.code==='Space'||e.code==='KeyY'||e.code==='KeyR'||e.code==='KeyT'||e.code==='KeyF'||e.code==='KeyG'){e.preventDefault();if(_portalSel===0)confirmPortalEnter();else hidePortalConfirm();}
    if(e.code==='Escape'||e.code==='KeyN'){e.preventDefault();hidePortalConfirm();}
});
// Result screen — Enter/Space to go back to city
addEventListener('keydown',function(e){
    if(gameState!=='raceResult')return;
    if(e.code==='Enter'||e.code==='Space'){e.preventDefault();goBackToCity();}
});

// ============================================================
//  SOTN Area Name Reveal
// ============================================================
var _areaNameTimer=null;
var _areaNames={
    zhs:['\u5E0C\u671B\u4E4B\u57CE \u2014 \u6E56\u5149\u6C34\u8272','\u6C99\u6F20\u57CE \u2014 \u9EC4\u91D1\u4E4B\u7802','\u51B0\u96EA\u57CE \u2014 \u6C38\u51BB\u4E4B\u5730','\u7194\u5CA9\u57CE \u2014 \u706B\u7130\u4E4B\u5FC3','\u7CD6\u679C\u57CE \u2014 \u68A6\u5E7B\u4E50\u56ED','\u6708\u9762\u90FD\u5E02 \u2014 \u5BD2\u5BC2\u4E4B\u6D77'],
    zht:['\u5E0C\u671B\u4E4B\u57CE \u2014 \u6E56\u5149\u6C34\u8272','\u6C99\u6F20\u57CE \u2014 \u9EC3\u91D1\u4E4B\u7802','\u51B0\u96EA\u57CE \u2014 \u6C38\u51CD\u4E4B\u5730','\u7194\u5CA9\u57CE \u2014 \u706B\u7130\u4E4B\u5FC3','\u7CD6\u679C\u57CE \u2014 \u5922\u5E7B\u6A02\u5712','\u6708\u9762\u90FD\u5E02 \u2014 \u5BD2\u5BC2\u4E4B\u6D77'],
    ja:['\u5E0C\u671B\u306E\u8857 \u2014 \u6E56\u5149\u6C34\u8272','\u7802\u6F20\u30B7\u30C6\u30A3 \u2014 \u9EC4\u91D1\u306E\u7802','\u6C37\u96EA\u30B7\u30C6\u30A3 \u2014 \u6C38\u51CD\u306E\u5730','\u6EB6\u5CA9\u30B7\u30C6\u30A3 \u2014 \u708E\u306E\u5FC3\u81D3','\u30AD\u30E3\u30F3\u30C7\u30A3\u30B7\u30C6\u30A3 \u2014 \u5922\u306E\u697D\u5712','\u30EB\u30CA\u30FC\u30BE\u30FC\u30F3 \u2014 \u9759\u5BC2\u306E\u6D77'],
    en:['City of Hope \u2014 Shimmering Waters','Desert City \u2014 Golden Sands','Ice City \u2014 Frozen Lands','Lava City \u2014 Heart of Flame','Candy City \u2014 Dreamland','Lunar Zone \u2014 Sea of Silence']
};
var _areaNameCloud={zhs:'\u4E91\u4E2D\u754C \u2014 \u5929\u7A7A\u4E4B\u57CE',zht:'\u96F2\u4E2D\u754C \u2014 \u5929\u7A7A\u4E4B\u57CE',ja:'\u96F2\u4E2D\u754C \u2014 \u5929\u7A7A\u306E\u57CE',en:'Cloud Realm \u2014 City in the Sky'};
function _showAreaName(name){
    if(!name)return;
    var overlay=document.getElementById('area-name-overlay');
    var text=document.getElementById('area-name-text');
    if(!overlay||!text)return;
    if(_areaNameTimer){clearTimeout(_areaNameTimer);_areaNameTimer=null;}
    overlay.style.display='none';
    text.style.animation='none';
    // Force reflow to restart animation
    void text.offsetWidth;
    text.textContent=name;
    text.style.animation='sotnReveal 3.5s ease-out forwards';
    overlay.style.display='flex';
    _areaNameTimer=setTimeout(function(){overlay.style.display='none';_areaNameTimer=null;},3600);
}
function _showCityAreaName(cityIdx){
    var names=_areaNames[_langCode]||_areaNames.en;
    if(cityIdx>=0&&cityIdx<names.length)_showAreaName(names[cityIdx]);
}
function _showCloudAreaName(){
    _showAreaName(_areaNameCloud[_langCode]||_areaNameCloud.en);
}

// ============================================================
//  GAME FLOW
// ============================================================
function showScreen(id){
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    const el=document.getElementById(id);
    if(el)el.classList.add('active');
}

function enterCity(spawnX,spawnZ){
    gameState='city';
    _spinDashing=false;_spinDashTimer=0;_spinDashTimerMax=0;_spinDashSpeed=0;if(_spinDashBar)_spinDashBar.visible=false;
    showScreen(null);
    stopSelectBGM();
    stopRaceBGM();
    startBGM();
    document.getElementById('city-hud').classList.remove('hidden');
    document.getElementById('race-hud').classList.add('hidden');
    if('ontouchstart' in window||_touchVisible){if(typeof _setTouchControlsVisible==='function')_setTouchControlsVisible(true);else document.getElementById('touch-controls').classList.remove('hidden');if(typeof _hideMenuTouch==='function')_hideMenuTouch();}

    cityGroup.visible=true;
    if(typeof raceGroup!=='undefined')raceGroup.visible=false;
    if(typeof clearRace==='function')clearRace();

    // Clear all NPC grab/held states to prevent invisible grabs
    for(var ni=0;ni<cityNPCs.length;ni++){
        var npc=cityNPCs[ni];
        npc.holding=null;npc.heldBy=null;npc.holdingObs=null;npc.holdingProp=null;
        npc.throwTimer=0;npc.grabCD=60;npc.finished=false;npc._stunTimer=0;
        if(npc.struggleBar){try{npc.mesh.remove(npc.struggleBar);}catch(e){}npc.struggleBar=null;}
    }

    // Create player in city — spawn at correct height immediately
    var sx=(spawnX!==undefined)?spawnX:0;
    var sz=(spawnZ!==undefined)?spawnZ:0;
    var sy=0;
    if(currentCityStyle===5){
        if(sx===0&&sz===5){sx=50;sz=0;}
        sy=0.5;
    } else if(sx===0&&sz===0){
        sy=15; // above fountain, land on pillar top
    }
    const skin=CHARACTERS[selectedChar];
    playerEgg=createEgg(sx,sz,skin.color,skin.accent,true,undefined,skin.type);
    playerEgg.mesh.position.set(sx,sy,sz); // set height IMMEDIATELY to avoid pillar clip
    playerEgg.finished=false;playerEgg.alive=true;
    camera.position.set(sx,12,sz+14);camera.lookAt(sx,0,sz);
    camera.up.set(0,1,0);
    // Check if Tower of Babel should already be triggered
    if(coins>=10&&!_babylonTriggered&&currentCityStyle!==5){_triggerBabylonEvent();}
    // SOTN area name reveal
    _showCityAreaName(currentCityStyle);
}

// Race minigame lifecycle (enterRace/result/HUD) is loaded from
// plugins/legacy-race/race-flow.js. The shared loop below calls those
// plugin-provided globals only while a race game is active.

// ---- Thrown egg impact (Kunio-kun style) ----
function checkThrownEggImpact(eggList){
    for(var i=0;i<eggList.length;i++){
        var a=eggList[i];
        if(!a||!a.alive||a.throwTimer<=0)continue;
        var airFrames=(a._throwTotal||60)-a.throwTimer;
        if(airFrames<5)continue; // grace period
        for(var j=0;j<eggList.length;j++){
            var b=eggList[j];
            if(!b||b===a||!b.alive||b.heldBy)continue;
            var dx=b.mesh.position.x-a.mesh.position.x;
            var dz=b.mesh.position.z-a.mesh.position.z;
            var dy=b.mesh.position.y-a.mesh.position.y;
            var dist=DANBO_WASM.dist3D(b.mesh.position.x,b.mesh.position.y,b.mesh.position.z,a.mesh.position.x,a.mesh.position.y,a.mesh.position.z);
            if(dist<1.3){
                // Kunio-kun impact: victim flies up and away
                var nx=dx/(dist||1), nz=dz/(dist||1);
                b.vx+=nx*0.5+a.vx*0.4;
                b.vz+=nz*0.5+a.vz*0.4;
                b.vy=0.28;
                b.squash=0.4;
                b._throwTotal=30;b.throwTimer=30;b._bounces=1;
                // Thrower slows down
                a.vx*=0.3;a.vz*=0.3;
                a.throwTimer=Math.min(a.throwTimer,5);
                playHitSound(a.mesh.position.x,a.mesh.position.z);
                _dropNpcStolenCoins(b);
            }
        }
    }
}
// ============================================================
//  MAIN LOOP
// ============================================================
const clock = new THREE.Clock();
var _lastFrameTime=0;
var _targetFrameInterval=1000/60; // target 60fps
var _accumulator=0;
var _fixedStep=1000/60; // fixed timestep

function animate(now){
    requestAnimationFrame(animate);
    if(!now)now=performance.now();
    var _elapsed=now-_lastFrameTime;
    if(_elapsed<8)return; // skip if too fast (>120fps)
    _lastFrameTime=now;
    // Accumulate time and run fixed timestep updates (catch up if behind)
    _accumulator+=Math.min(_elapsed,100); // cap at 100ms to prevent spiral
    var _ticks=0;
    while(_accumulator>=_fixedStep&&_ticks<3){
        _gameUpdate();
        _accumulator-=_fixedStep;
        _ticks++;
    }
    if(typeof _updateRenderQuality==='function')_updateRenderQuality(_elapsed);
    if(typeof _updateSunShadowFocus==='function')_updateSunShadowFocus();
    if(typeof _syncVisualFXVisibility==='function')_syncVisualFXVisibility();
    if(typeof _renderCinematicFrame==='function')_renderCinematicFrame();
    else R.render(scene,camera);
}

function _gameUpdate(){
    const dt=1/60;
    if(window.DANBO_PLUGIN_HOST&&typeof window.DANBO_PLUGIN_HOST.update==='function')window.DANBO_PLUGIN_HOST.update(dt);
    var _pluginBusy=!!(window._danboPluginTransition||(window.DANBO_PLUGIN_HOST&&window.DANBO_PLUGIN_HOST.getActive&&window.DANBO_PLUGIN_HOST.getActive()));
    if(_pluginBusy){
        // A mini-game/plugin owns the screen now. Treat the city as the inactive scene:
        // hide prompts and pause city simulation/SFX until the plugin scene returns.
        var _ppBusy=document.getElementById('portal-prompt');if(_ppBusy)_ppBusy.style.display='none';
        var _dpBusy=document.getElementById('door-prompt');if(_dpBusy)_dpBusy.style.display='none';
        var _chBusy=document.getElementById('chest-hud');if(_chBusy)_chBusy.style.display='none';
        var _mmBusy=document.getElementById('minimap-wrap');if(_mmBusy)_mmBusy.style.display='none';
        var _mbBusy=document.getElementById('map-btn');if(_mbBusy)_mbBusy.style.display='none';
        var _lbBusy=document.getElementById('lb-btn');if(_lbBusy)_lbBusy.style.display='none';
        var _areaBusy=document.getElementById('area-name-overlay');if(_areaBusy)_areaBusy.style.display='none';
        var _shopBusy=document.getElementById('shop-prompt');if(_shopBusy)_shopBusy.style.display='none';
        return;
    }
    // Shell status above EVERY character, every mode (player + race rivals + city NPCs).
    if(typeof _updateAllShellStatus==='function')_updateAllShellStatus();
    // Cosmetic shop / equipped looks / footprints (single-player, local).
    if(typeof Cosmetics!=='undefined'&&Cosmetics.update)Cosmetics.update();
    // Chest exploration HUD only shows while roaming a city (not inside a house).
    var _inCity=(gameState==='city'&&!window._interiorActive);
    var _chHud=document.getElementById('chest-hud');
    if(_chHud)_chHud.style.display=_inCity?'block':'none';
    var _lbBtn=document.getElementById('lb-btn');
    if(_lbBtn)_lbBtn.style.display=_inCity?'block':'none';
    // Map UI visibility (mini-map + map button) — city only.
    var _mm=document.getElementById('minimap-wrap'),_mb=document.getElementById('map-btn');
    if(_mm)_mm.style.display=_inCity?'block':'none';
    if(_mb)_mb.style.display=_inCity?'block':'none';
    var _dp=document.getElementById('door-prompt');
    if(_dp&&!_inCity)_dp.style.display='none';
    if(_inCity&&typeof _updateMiniMap==='function')_updateMiniMap();

    if(gameState==='city'){
        // ---- Inside a house: run isolated interior loop, skip all city updates ----
        if(window._interiorActive){
            if(!window._worldMapOpen&&typeof handlePlayerInput==='function')handlePlayerInput();
            if(typeof _interiorPhysics==='function')_interiorPhysics(playerEgg);
            if(typeof _interiorCheckExit==='function')_interiorCheckExit();
            if(playerEgg){_updateStunStars(playerEgg);_updatePainFace(playerEgg);}
            updateCamera();
            return;
        }
        if(_pipeTraveling){
            updatePipeTravel();
        } else {
            if(!window._worldMapOpen&&!window._shopOpen)handlePlayerInput(); // pause movement while a UI panel is open
        }
        if(playerEgg&&!_pipeTraveling) updateEggPhysics(playerEgg, true);
        if(playerEgg){_updateStunStars(playerEgg);_updatePainFace(playerEgg);}
        if(playerEgg&&playerEgg._stunMeter>0&&playerEgg._stunTimer<=0)playerEgg._stunMeter=Math.max(0,playerEgg._stunMeter-0.5);
        // Player electrocution effect
        if(playerEgg&&playerEgg._electrocuted>0){
            playerEgg._electrocuted--;
            playerEgg.vx=0;playerEgg.vz=0;playerEgg.vy=0;playerEgg.throwTimer=0;
            var _peBody=playerEgg.mesh.userData.body;
            if(_peBody)_peBody.material=new THREE.MeshBasicMaterial({color:Math.floor(playerEgg._electrocuted/3)%2===0?0x111111:0xFFFFFF,transparent:true,opacity:0.9});
            if(playerEgg._electrocuted<=0&&playerEgg._elecKnockDir){
                playerEgg._elecFlying=60;
                playerEgg._elecFlyDir={x:playerEgg._elecKnockDir.x,z:playerEgg._elecKnockDir.z};
                playerEgg._elecKnockDir=null;
                playerEgg.vy=0.35;
                playerEgg.throwTimer=60;
            } else if(playerEgg._electrocuted<=0){
                if(_peBody)_peBody.material=toon(playerEgg._origColor||0xFFDD44);
                playerEgg._stunTimer=40;playerEgg._slamImmune=0;
            }
        }
        if(playerEgg&&playerEgg._elecFlying>0){
            playerEgg._elecFlying--;
            if(playerEgg._elecFlyDir){
                playerEgg.vx=playerEgg._elecFlyDir.x*0.4;
                playerEgg.vz=playerEgg._elecFlyDir.z*0.4;
            }
            var _peBody2=playerEgg.mesh.userData.body;
            if(_peBody2)_peBody2.material=new THREE.MeshBasicMaterial({color:Math.floor(playerEgg._elecFlying/3)%2===0?0x111111:0xFFFFFF,transparent:true,opacity:0.9});
            if(playerEgg._elecFlying<=0){
                if(_peBody2)_peBody2.material=toon(playerEgg._origColor||0xFFDD44);
                playerEgg.vx*=0.1;playerEgg.vz*=0.1;
                playerEgg._stunTimer=40;playerEgg._slamImmune=0;playerEgg._elecFlyDir=null;
            }
        }
        // Player fire effect
        if(playerEgg&&playerEgg._onFire>0){
            playerEgg._onFire--;
            if(!playerEgg._fireParticles){
                playerEgg._fireParticles=[];
                for(var _pfpi=0;_pfpi<14;_pfpi++){
                    var _pfpSize=_pfpi<4?0.3:0.2;
                    var _pfp=new THREE.Mesh(new THREE.SphereGeometry(_pfpSize,5,4),new THREE.MeshBasicMaterial({color:0xFF4400,transparent:true,opacity:0.85}));
                    _pfp.visible=false;playerEgg.mesh.add(_pfp);
                    playerEgg._fireParticles.push(_pfp);
                }
            }
            for(var _pfpj=0;_pfpj<playerEgg._fireParticles.length;_pfpj++){
                var _pfpp=playerEgg._fireParticles[_pfpj];
                _pfpp.visible=true;
                var _pfpa=_pfpj*Math.PI*2/playerEgg._fireParticles.length+playerEgg._onFire*0.25;
                var _pfpR=0.4+Math.sin(_pfpa*2)*0.2;
                var _pfpY=0.3+_pfpj*0.12+Math.random()*0.3;
                _pfpp.position.set(Math.sin(_pfpa)*_pfpR,_pfpY,Math.cos(_pfpa)*_pfpR);
                var _pfRnd=Math.random();
                _pfpp.material.color.setHex(_pfRnd>0.6?0xFFCC00:(_pfRnd>0.3?0xFF6600:0xFF2200));
                _pfpp.material.opacity=0.6+Math.random()*0.35;
                _pfpp.scale.setScalar(0.6+Math.random()*1.0);
            }
            var _pfbody=playerEgg.mesh.userData.body;
            if(_pfbody&&playerEgg._onFire>0)_safeSetEmissive(_pfbody,0xFF4400,0.3+Math.sin(playerEgg._onFire*0.3)*0.15);
            if(playerEgg._onFire<=0){
                for(var _pfpk=0;_pfpk<playerEgg._fireParticles.length;_pfpk++)playerEgg._fireParticles[_pfpk].visible=false;
                if(_pfbody)_safeSetEmissiveIntensity(_pfbody,0);
            }
            if(playerEgg._fireStun>0){
                playerEgg._fireStun--;
                playerEgg.vx=0;playerEgg.vz=0;playerEgg.vy=0;playerEgg.throwTimer=0;playerEgg._hitStun=5;
                playerEgg.mesh.rotation.z=Math.sin(Date.now()*0.05)*0.15;
                if(playerEgg._fireStun<=0){
                    var _pfkDir=playerEgg._fireStunDir||0;
                    playerEgg.vx=Math.sin(_pfkDir)*0.3;playerEgg.vz=Math.cos(_pfkDir)*0.3;playerEgg.vy=0.1;
                    playerEgg.throwTimer=COMBAT.punch.throwTimer;playerEgg._bounces=COMBAT.punch.bounces;playerEgg.squash=COMBAT.projectile.squash;
                    playerEgg.mesh.rotation.z=0;
                }
            }
        }
        updateCity();
        const cityEggList = [playerEgg, ...cityNPCs].filter(e=>e&&e.alive);
        resolveEggCollisions(cityEggList);
        checkThrownEggImpact(cityEggList);
        updateHeldEggs();
        _updateChatBubbles();
        for(var _nci=0;_nci<allEggs.length;_nci++){if(!allEggs[_nci].isPlayer)_npcRandomChat(allEggs[_nci]);}
        if(_pfActive&&typeof _pfUpdateCamera==='function'){_pfUpdateCamera();}else{updateCamera();}
    } else if(gameState==='racing'){
        // Safety: release player if holder is not in allEggs (stale grab from city mode)
        if(playerEgg&&playerEgg.heldBy&&allEggs.indexOf(playerEgg.heldBy)===-1){
            playerEgg.heldBy=null;if(playerEgg.struggleBar){playerEgg.mesh.remove(playerEgg.struggleBar);playerEgg.struggleBar=null;}
        }
        handlePlayerInput();
        const raceEggs=allEggs.filter(e=>!e.cityNPC);
        for(const egg of raceEggs){
            if(!egg.isPlayer){
                // Respawn NPC if fallen off map (y<-3 in platformer, y<-10 in race)
                var _fallLimit=_pfActive?-3:-10;
                if(egg.mesh.position.y<_fallLimit){
                    if(_pfActive){
                        // Respawn at patrol base or near player
                        var _rspX=egg._patrolBaseX||playerEgg.mesh.position.x-10;
                        egg.mesh.position.set(_rspX,3,0);
                    } else {
                        var _rspGz=-egg.mesh.position.z;
                        var _rspRz=Math.max(0,_rspGz-5);
                        egg.mesh.position.set((Math.random()-0.5)*4,getFloorY(_rspRz)+5,-_rspRz);
                    }
                    egg.vx=0;egg.vy=0;egg.vz=0;egg.throwTimer=0;egg._stunTimer=0;
                    egg.heldBy=null;egg.holding=null;egg._piledriverLocked=false;
                }
                if(_pfActive){
                    // Platformer: city AI for combat, lock Z axis
                    if(egg.mesh.position.y>-5)updateCityNPC(egg); // skip AI if fallen
                    egg.vz=0;egg.mesh.position.z=0;
                } else {
                    updateRaceAI(egg);
                    // City AI combat only after initial 3 seconds (avoid start-line chaos)
                    if(!egg._raceCombatCD)egg._raceCombatCD=180;
                    if(egg._raceCombatCD>0){egg._raceCombatCD--;} else {
                        egg._aiState='chase';
                        var _savedVx=egg.vx,_savedVz=egg.vz;
                        updateCityNPC(egg);
                        egg.vx=_savedVx;egg.vz=_savedVz;
                    }
                }
            }
            updateEggPhysics(egg, _pfActive); // platformer uses city physics (ground colliders)
            if(!egg.isPlayer){_updateStunStars(egg);_updatePainFace(egg);}
        }
        resolveEggCollisions(raceEggs);
        checkThrownEggImpact(raceEggs);
        // Platformer: lock Z for held eggs too
        if(_pfActive){for(var _fzi=0;_fzi<raceEggs.length;_fzi++){raceEggs[_fzi].mesh.position.z=0;}}
        updateHeldEggs();
                // Race coin collection + animation
        for(var ci=0;ci<_danboRaceCoins().length;ci++){
            var rc=_danboRaceCoins()[ci];
            if(rc.collected)continue;
            rc.bobPhase+=0.05;
            rc.mesh.position.y=rc.fy+1.2+Math.sin(rc.bobPhase)*0.3;
            rc.mesh.rotation.y+=0.04;
            if(!playerEgg)continue;
            var cdx=playerEgg.mesh.position.x-rc.x;
            var cdz=playerEgg.mesh.position.z-(-rc.z);
            var cdy=playerEgg.mesh.position.y-(rc.fy+1.2);
            if(DANBO_WASM.within3D(playerEgg.mesh.position.x,playerEgg.mesh.position.y,playerEgg.mesh.position.z,rc.x,rc.fy+1.2,-rc.z,1.5)){
                rc.collected=true;rc.mesh.visible=false;
                if(rc.type==='star'){
                    // Speed Star: 2x speed for 3 seconds
                    playerEgg._speedBoost=180;
                    playCoinSound();
                } else if(rc.type==='shield'){
                    // Shield Bubble: immune to 1 hit for 5 seconds
                    playerEgg._shieldTimer=300;
                    if(!playerEgg._shieldBubble){
                        var _sbMesh=new THREE.Mesh(new THREE.SphereGeometry(1.2,12,8),new THREE.MeshBasicMaterial({color:0x4488FF,transparent:true,opacity:0.25}));
                        playerEgg.mesh.add(_sbMesh);
                        playerEgg._shieldBubble=_sbMesh;
                    }
                    playerEgg._shieldBubble.visible=true;
                    playCoinSound();
                } else if(rc.type==='magnet'){
                    // Magnet: attract nearby coins for 5 seconds
                    playerEgg._coinMagnet=300;
                    playCoinSound();
                } else {
                    raceCoinScore++;playCoinSound();
                }
            }
        }
        // Power-up visual effects
        if(playerEgg){
            // Speed Star glow
            if(playerEgg._speedBoost>0){
                var _sbBody=playerEgg.mesh.userData.body;
                if(_sbBody)_safeSetEmissive(_sbBody,0xFFDD00,0.3+Math.sin(playerEgg._speedBoost*0.15)*0.2);
                if(playerEgg._speedBoost<=0&&_sbBody)_safeSetEmissiveIntensity(_sbBody,0);
            } else {
                var _sbBody2=playerEgg.mesh.userData.body;
                if(_sbBody2&&!playerEgg._onFire)_safeSetEmissiveIntensity(_sbBody2,0);
            }
            // Shield bubble visibility
            if(playerEgg._shieldBubble){
                playerEgg._shieldBubble.visible=(playerEgg._shieldTimer>0);
                if(playerEgg._shieldTimer>0)playerEgg._shieldBubble.material.opacity=0.15+Math.sin(playerEgg._shieldTimer*0.1)*0.1;
            }
            // Shield: absorb hit (cancel stun/throw)
            if(playerEgg._shieldTimer>0&&(playerEgg.throwTimer>0||playerEgg._stunTimer>0)){
                playerEgg.throwTimer=0;playerEgg._stunTimer=0;playerEgg._shieldTimer=0;
                playerEgg.vx*=0.3;playerEgg.vz*=0.3;
                if(playerEgg._shieldBubble)playerEgg._shieldBubble.visible=false;
            }
            // Magnet: attract nearby coins
            if(playerEgg._coinMagnet>0){
                for(var _mci=0;_mci<_danboRaceCoins().length;_mci++){
                    var _mc=_danboRaceCoins()[_mci];
                    if(_mc.collected||_mc.type)continue; // only attract regular coins
                    var _mdx2=playerEgg.mesh.position.x-_mc.mesh.position.x;
                    var _mdz2=playerEgg.mesh.position.z-_mc.mesh.position.z;
                    var _mdy2=playerEgg.mesh.position.y-_mc.mesh.position.y;
                    var _md2=DANBO_WASM.dist3D(playerEgg.mesh.position.x,playerEgg.mesh.position.y,playerEgg.mesh.position.z,_mc.mesh.position.x,_mc.mesh.position.y,_mc.mesh.position.z);
                    if(_md2<10&&_md2>0.1){
                        _mc.mesh.position.x+=_mdx2/_md2*0.15;
                        _mc.mesh.position.z+=_mdz2/_md2*0.15;
                        _mc.mesh.position.y+=_mdy2/_md2*0.15;
                        _mc.x=_mc.mesh.position.x;
                    }
                }
            }
        }
        // Projectile update (same as in updateCity)
        if(!window._allProjectiles)window._allProjectiles=[];
        for(var _rapi=window._allProjectiles.length-1;_rapi>=0;_rapi--){
            var _rap=window._allProjectiles[_rapi];
            if(!MoveProjectile_update(_rap)){MoveProjectile_cleanup(_rap);window._allProjectiles.splice(_rapi,1);}
        }
        updateSlashEffects();
        if(!_pfActive)updateObstacles();
        if(_pfActive&&typeof _pfUpdateCamera==='function'){_pfUpdateCamera();}else{updateCamera();}
        if(typeof updateRaceHUD==='function')updateRaceHUD();
        if(typeof checkRaceEnd==='function')checkRaceEnd();
    } else if(gameState==='raceIntro'){
        if(playerEgg) updateCamera();
    }

    _updateDropShadow();
    _updateChargeParticles();
    // Update grab button text
    if(grabBtn&&playerEgg){if(playerEgg.holding){grabBtn.textContent=L('throwT');grabBtn.classList.add('holding');}else{grabBtn.textContent=L('grab');grabBtn.classList.remove('holding');}}
}
