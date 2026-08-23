// race-flow.js — Legacy race lifecycle loaded by plugins/legacy-race
// Moved from js/gameloop.js so the race minigame's start/result/HUD flow belongs to the plugin.

function enterRace(raceIndex){
    if(typeof _resetViewMode==='function')_resetViewMode();
    currentRaceIndex=raceIndex;
    finishedEggs=[]; playerFinished=false;
    raceCoinScore=0;
    _raceExpAwarded=false;

    // Hide all UI
    document.getElementById('city-hud').classList.add('hidden');
    document.getElementById('race-hud').classList.add('hidden');
    document.getElementById('touch-controls').classList.add('hidden');
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));

    // Save player position for Bifrost animation
    var _bfSavedX=playerEgg?playerEgg.mesh.position.x:0;
    var _bfSavedY=playerEgg?playerEgg.mesh.position.y:0;
    var _bfSavedZ=playerEgg?playerEgg.mesh.position.z:0;
    // Clear ALL player states before leaving city
    if(playerEgg){
        if(playerEgg.holding){var h2=playerEgg.holding;h2.heldBy=null;playerEgg.holding=null;if(h2.struggleBar){h2.mesh.remove(h2.struggleBar);h2.struggleBar=null;}}
        if(playerEgg.heldBy){var hdr2=playerEgg.heldBy;hdr2.holding=null;playerEgg.heldBy=null;if(playerEgg.struggleBar){playerEgg.mesh.remove(playerEgg.struggleBar);playerEgg.struggleBar=null;}}
        if(playerEgg.holdingObs){playerEgg.holdingObs._grabbed=false;playerEgg.holdingObs=null;}
        if(playerEgg.holdingProp){playerEgg.holdingProp.grabbed=false;playerEgg.holdingProp=null;}
        playerEgg._piledriverLocked=false;playerEgg.throwTimer=0;playerEgg._stunTimer=0;playerEgg._hitStun=0;
        playerEgg._electrocuted=0;playerEgg._elecFlying=0;playerEgg._fireStun=0;
        scene.remove(playerEgg.mesh);
        const idx=allEggs.indexOf(playerEgg);
        if(idx!==-1) allEggs.splice(idx,1);
        playerEgg=null;
    }

    // City stays visible during Bifrost animation — hidden in Phase 3 flash

    // Build race (hidden until Phase 3 flash)
    raceGroup.visible=false;
    trackSegments=buildRaceTrack(raceIndex);

    // Spawn race eggs — lined up in rows (no bunching)
    const skin=CHARACTERS[selectedChar];
    var _raceWasm=window.DANBO_MINIGAME_WASM&&DANBO_MINIGAME_WASM.race;
    const total=_raceWasm?_raceWasm.totalEggs(raceIndex):(14+raceIndex*2);
    var _cols=_raceWasm?_raceWasm.startCols(total,TRACK_W):Math.min(total,Math.floor(TRACK_W*2/2.5));
    var _spacing=TRACK_W*2/(_cols+1);
    // Save race start positions BEFORE Bifrost moves eggs around
    window._bfRacePositions=[];
    playerEgg=createEgg(0, -2, skin.color, skin.accent, true, undefined, skin.type);
    window._bfRacePositions.push({egg:playerEgg, x:0, y:playerEgg.mesh.position.y, z:-2});
    // Player starts at saved city position for Bifrost rising animation
    playerEgg.mesh.position.set(_bfSavedX,_bfSavedY,_bfSavedZ);
    for(let i=1;i<total;i++){
        const ci=(i-1)%AI_COLORS.length;
        var _row=Math.floor(i/_cols);
        var _col=i%_cols;
        var _jx=(Math.random()-0.5)*1.5,_jz=(Math.random()-0.5)*1.2;
        var _slot=_raceWasm?_raceWasm.startSlot(i,_cols,TRACK_W,_jx,_jz):null;
        if(_slot){_row=_slot[0];_col=_slot[1];}
        var _sx=_slot?_slot[2]:(-TRACK_W+_spacing*(_col+1)+_jx);
        var _sz=_slot?_slot[3]:(-2-_row*3+_jz);
        var _rEgg=createEgg(_sx, _sz, AI_COLORS[ci], AI_COLORS[(ci+3)%AI_COLORS.length], false, undefined, CHARACTERS[i%CHARACTERS.length].type);
        window._bfRacePositions.push({egg:_rEgg, x:_sx, y:_rEgg.mesh.position.y, z:_sz});
        _rEgg.mesh.visible=false;
    }

    camera.position.set(0, 12, 11);
    camera.lookAt(0, 0, -5);
    camera.up.set(0,1,0); // reset from moon spherical camera

    // ---- Bifrost Rainbow Bridge transition (3D in Three.js scene) ----
    gameState='raceIntro';
    stopBGM();
    const race=RACES[raceIndex];
    // Show overlay but keep it transparent so 3D scene is visible
    document.getElementById('round-screen').classList.add('active');
    document.getElementById('countdown').textContent='';
    document.getElementById('round-label').textContent='';
    document.getElementById('round-name').textContent='';
    document.getElementById('round-desc').textContent='';
    document.getElementById('player-count').textContent='';
    // Hide the 2D round-canvas so 3D scene shows through
    var _rcvs=document.getElementById('round-canvas');
    if(_rcvs)_rcvs.style.opacity='0';

    // Save player position for Bifrost origin
    var _bfPlayerX=_bfSavedX;
    var _bfPlayerY=_bfSavedY;
    var _bfPlayerZ=_bfSavedZ;
    // Save camera start
    var _bfCamStartX=camera.position.x,_bfCamStartY=camera.position.y,_bfCamStartZ=camera.position.z;

    // --- Build 3D Bifrost objects ---
    var _bifrostGroup=new THREE.Group();
    scene.add(_bifrostGroup);

    var _bfColors=[0xFF0000,0xFF8800,0xFFDD00,0x44DD44,0x4488FF,0x4400CC,0x8800CC];

    // Rainbow rings on ground (TorusGeometry)
    var _bfRings=[];
    for(var _bri=0;_bri<7;_bri++){
        var _ring=new THREE.Mesh(
            new THREE.TorusGeometry(0.3+_bri*0.4,0.12,6,32),
            new THREE.MeshBasicMaterial({color:_bfColors[_bri],transparent:true,opacity:0.8})
        );
        _ring.rotation.x=Math.PI/2;
        _ring.position.set(_bfPlayerX,0.1+_bri*0.05,_bfPlayerZ);
        _ring.scale.setScalar(0.001);
        _bifrostGroup.add(_ring);
        _bfRings.push(_ring);
    }

    // Rune-like spinning elements (small torus knots in a circle)
    var _bfRunes=[];
    for(var _rni=0;_rni<6;_rni++){
        var _rune=new THREE.Mesh(
            new THREE.TorusKnotGeometry(0.15,0.04,32,6,2,3),
            new THREE.MeshBasicMaterial({color:0xFFDD88,transparent:true,opacity:0.7})
        );
        _rune.position.set(_bfPlayerX,0.2,_bfPlayerZ);
        _bifrostGroup.add(_rune);
        _bfRunes.push(_rune);
    }

    // Light pillars (7 colored cylinders, initially tiny)
    // One pillar per participant — together they form the big bifrost
    var _bfPillarCount=total; // total race eggs
    var _bfPillars=[];
    for(var _bpi=0;_bpi<_bfPillarCount;_bpi++){
        var _pillar=new THREE.Mesh(
            new THREE.CylinderGeometry(0.12,0.25,1,6),
            new THREE.MeshBasicMaterial({color:_bfColors[_bpi%7],transparent:true,opacity:0.6})
        );
        _pillar.position.set(_bfPlayerX,0.05,_bfPlayerZ);
        _pillar.scale.y=0.1;
        _bifrostGroup.add(_pillar);
        _bfPillars.push(_pillar);
    }

    // Particles (small white spheres that fly upward)
    var _bfParticles=[];
    for(var _pti=0;_pti<30;_pti++){
        var _pt=new THREE.Mesh(
            new THREE.SphereGeometry(0.15,4,3),
            new THREE.MeshBasicMaterial({color:0xFFFFFF,transparent:true,opacity:0.7})
        );
        _pt.visible=false;
        _bifrostGroup.add(_pt);
        _bfParticles.push({mesh:_pt,angle:Math.random()*Math.PI*2,speed:0.5+Math.random(),y:0});
    }

    // White flash plane (always faces camera)
    var _bfFlash=new THREE.Mesh(
        new THREE.PlaneGeometry(200,200),
        new THREE.MeshBasicMaterial({color:0xFFFFFF,transparent:true,opacity:0,side:THREE.DoubleSide,depthTest:false})
    );
    _bfFlash.renderOrder=9999;
    scene.add(_bfFlash);

    // --- Sound effects ---
    var _bfOsc1=null,_bfOsc2=null,_bfGain1=null,_bfGain2=null,_bfAudioCtx=null;
    if(sfxEnabled){
        _bfAudioCtx=ensureAudio();
        if(_bfAudioCtx){
            var _bft=_bfAudioCtx.currentTime;
            // Phase 1: Descending shimmer (high→low, gentle) + rumble
            _bfOsc1=_bfAudioCtx.createOscillator();_bfGain1=_bfAudioCtx.createGain();
            _bfOsc1.type='triangle'; // soft tone
            _bfOsc1.frequency.setValueAtTime(2000,_bft);_bfOsc1.frequency.exponentialRampToValueAtTime(200,_bft+2);
            _bfGain1.gain.setValueAtTime(0,_bft);_bfGain1.gain.linearRampToValueAtTime(0.12,_bft+0.3);
            _bfGain1.gain.linearRampToValueAtTime(0.08,_bft+1.5);_bfGain1.gain.exponentialRampToValueAtTime(0.001,_bft+2.5);
            _bfOsc1.connect(_bfGain1);_bfGain1.connect(_bfAudioCtx.destination);
            _bfOsc1.start(_bft);_bfOsc1.stop(_bft+2.5);
            // Sub rumble underneath
            var _bfRumble=_bfAudioCtx.createOscillator();var _bfRumbleG=_bfAudioCtx.createGain();
            _bfRumble.type='sine';_bfRumble.frequency.value=40;
            _bfRumbleG.gain.setValueAtTime(0,_bft);_bfRumbleG.gain.linearRampToValueAtTime(0.1,_bft+1);
            _bfRumbleG.gain.exponentialRampToValueAtTime(0.001,_bft+10);
            _bfRumble.connect(_bfRumbleG);_bfRumbleG.connect(_bfAudioCtx.destination);
            _bfRumble.start(_bft);_bfRumble.stop(_bft+10);
            // Phase 2: Rising whoosh (100->3000Hz, 2-6s)
            _bfOsc2=_bfAudioCtx.createOscillator();_bfGain2=_bfAudioCtx.createGain();
            _bfOsc2.type='sawtooth';_bfOsc2.frequency.setValueAtTime(100,_bft+2);
            _bfOsc2.frequency.exponentialRampToValueAtTime(3000,_bft+5);
            _bfOsc2.frequency.exponentialRampToValueAtTime(500,_bft+6);
            _bfGain2.gain.setValueAtTime(0,_bft);_bfGain2.gain.setValueAtTime(0,_bft+2);
            _bfGain2.gain.linearRampToValueAtTime(0.12,_bft+3);
            _bfGain2.gain.linearRampToValueAtTime(0.15,_bft+5);
            _bfGain2.gain.exponentialRampToValueAtTime(0.001,_bft+6.5);
            _bfOsc2.connect(_bfGain2);_bfGain2.connect(_bfAudioCtx.destination);
            _bfOsc2.start(_bft+2);_bfOsc2.stop(_bft+6.5);
            // Phase 3: Arrival whoosh + multiple impacts (6-10s)
            var _bfOsc3=_bfAudioCtx.createOscillator();var _bfGain3=_bfAudioCtx.createGain();
            _bfOsc3.type='sawtooth';_bfOsc3.frequency.setValueAtTime(800,_bft+6.5);
            _bfOsc3.frequency.exponentialRampToValueAtTime(200,_bft+9);
            _bfGain3.gain.setValueAtTime(0,_bft);_bfGain3.gain.setValueAtTime(0.1,_bft+6.5);
            _bfGain3.gain.linearRampToValueAtTime(0.08,_bft+8);_bfGain3.gain.exponentialRampToValueAtTime(0.001,_bft+10);
            _bfOsc3.connect(_bfGain3);_bfGain3.connect(_bfAudioCtx.destination);
            _bfOsc3.start(_bft+6.5);_bfOsc3.stop(_bft+10);
        }
    }

    // --- Animation loop ---
    var _bfStart=Date.now();
    var _bfDuration=10000; // 2s descend + 4s suck up + 4s arrive
    var _bfAnimId=null;
    var _bfCityHidden=false;

    function _animateBifrost3D(){
        var elapsed=Date.now()-_bfStart;
        var t=elapsed/_bfDuration;
        if(t>=1){
            // --- Cleanup ---
            if(_bfAnimId)cancelAnimationFrame(_bfAnimId);
            // Remove all bifrost meshes
            for(var _ci=_bifrostGroup.children.length-1;_ci>=0;_ci--){
                var _ch=_bifrostGroup.children[_ci];
                if(_ch.geometry)_ch.geometry.dispose();
                if(_ch.material)_ch.material.dispose();
                _bifrostGroup.remove(_ch);
            }
            scene.remove(_bifrostGroup);
            if(_bfFlash.geometry)_bfFlash.geometry.dispose();
            if(_bfFlash.material)_bfFlash.material.dispose();
            scene.remove(_bfFlash);
            // Reset player position to race start
            playerEgg.mesh.position.set(0,_bfPlayerY,-2);
            // Reset camera to race view
            camera.position.set(0,12,11);
            camera.lookAt(0,0,-5);
            // Restore round-canvas opacity for countdown
            if(_rcvs)_rcvs.style.opacity='1';
            _startRaceCountdown();
            return;
        }

        // --- Phase 1: Rainbow descends from sky (0 - 0.2 = 2s) ---
        if(t<0.2){
            var p1=t/0.2;
            // Light pillars descend from height 120 down to ground
            var pillarTop=120;
            var pillarBot=pillarTop*(1-p1);
            var pillarH=pillarTop-pillarBot;
            for(var _pp=0;_pp<_bfPillars.length;_pp++){
                _bfPillars[_pp].scale.y=Math.max(0.1,pillarH);
                _bfPillars[_pp].position.y=pillarBot+pillarH/2;
                var spiralAngle=elapsed*0.003+_pp*(Math.PI*2/_bfPillarCount);
                var spiralR=0.3+(_pp%5)*0.25+Math.floor(_pp/5)*0.4;
                _bfPillars[_pp].position.x=_bfPlayerX+Math.cos(spiralAngle)*spiralR;
                _bfPillars[_pp].position.z=_bfPlayerZ+Math.sin(spiralAngle)*spiralR;
                _bfPillars[_pp].material.opacity=0.3+p1*0.5;
            }
            // Rings appear on ground as pillar arrives
            for(var _ri2=0;_ri2<_bfRings.length;_ri2++){
                var ringP=Math.max(0,(p1-0.5)*2);
                _bfRings[_ri2].scale.setScalar(Math.max(0.001,ringP));
                _bfRings[_ri2].rotation.x=Math.PI/2;
                _bfRings[_ri2].rotation.z=elapsed*0.002+_ri2*0.5;
                _bfRings[_ri2].material.opacity=ringP*0.8;
            }
            // Runes hidden in phase 1
            for(var _rn2=0;_rn2<_bfRunes.length;_rn2++){_bfRunes[_rn2].scale.set(0.01,0.01,0.01);}
            // Camera looks up at descending light
            camera.position.x=_bfCamStartX;camera.position.y=_bfCamStartY;camera.position.z=_bfCamStartZ;
            camera.lookAt(_bfPlayerX,_bfPlayerY+20+p1*30,_bfPlayerZ);
            // Particles rain down along pillars
            for(var _pp3=0;_pp3<_bfParticles.length;_pp3++){
                var ptc=_bfParticles[_pp3];ptc.mesh.visible=true;
                ptc.y-=ptc.speed*2;if(ptc.y<0)ptc.y=pillarTop;
                ptc.angle+=0.03;
                var ptcR2=0.8+Math.sin(ptc.angle*3)*0.4;
                ptc.mesh.position.set(_bfPlayerX+Math.cos(ptc.angle)*ptcR2,ptc.y,_bfPlayerZ+Math.sin(ptc.angle)*ptcR2);
                ptc.mesh.material.opacity=0.3+p1*0.5;
            }
        }
        // --- Phase 2: Rings lock on + Player sucked up (0.2 - 0.6 = 4s) ---
        else if(t<0.6){
            var p2=(t-0.2)/0.4;
            // Full pillars from ground to sky, pulsing
            for(var _pp2=0;_pp2<_bfPillars.length;_pp2++){
                var spiralAngle2=elapsed*0.003+_pp2*(Math.PI*2/_bfPillarCount);
                var spiralR2=0.3+(_pp2%5)*0.25+Math.floor(_pp2/5)*0.4;
                _bfPillars[_pp2].scale.y=120;
                _bfPillars[_pp2].position.x=_bfPlayerX+Math.cos(spiralAngle2)*spiralR2;
                _bfPillars[_pp2].position.z=_bfPlayerZ+Math.sin(spiralAngle2)*spiralR2;
                _bfPillars[_pp2].material.opacity=0.6+Math.sin(elapsed*0.01+_pp2)*0.3;
            }
            // Rings spin fast + constrict around player
            for(var _ri3=0;_ri3<_bfRings.length;_ri3++){
                var constrict=1-p2*0.3;
                _bfRings[_ri3].scale.setScalar(Math.max(0.001,constrict));
                _bfRings[_ri3].rotation.x=Math.PI/2;
                _bfRings[_ri3].rotation.z=elapsed*0.005+_ri3*0.5;
                _bfRings[_ri3].position.y=_bfPlayerY+p2*40;
                _bfRings[_ri3].material.opacity=0.8;
            }
            // Runes orbit and shrink
            for(var _rn3=0;_rn3<_bfRunes.length;_rn3++){
                var runeA=elapsed*0.005+_rn3*(Math.PI*2/6);
                var runeR2=1.5*(1-p2);
                _bfRunes[_rn3].position.set(_bfPlayerX+Math.cos(runeA)*runeR2,_bfPlayerY+p2*40,_bfPlayerZ+Math.sin(runeA)*runeR2);
                _bfRunes[_rn3].scale.set(1-p2,1-p2,1-p2);
                _bfRunes[_rn3].rotation.y=elapsed*0.008;
            }
            // Player rises — sucked into the light
            var riseY=_bfPlayerY+p2*40;
            playerEgg.mesh.position.y=riseY;
            playerEgg.mesh.rotation.y+=0.15;
            // Camera follows upward
            camera.position.x=_bfCamStartX;
            camera.position.y=_bfCamStartY+p2*35;
            camera.position.z=_bfCamStartZ+p2*5;
            camera.lookAt(_bfPlayerX,riseY+5,_bfPlayerZ);
            // Particles fly upward
            for(var _pp4=0;_pp4<_bfParticles.length;_pp4++){
                var ptc2=_bfParticles[_pp4];
                ptc2.y+=ptc2.speed*1.5;if(ptc2.y>120)ptc2.y=0;
                ptc2.angle+=0.03;
                var ptcR3=0.6+Math.sin(ptc2.angle*3)*0.3;
                ptc2.mesh.position.set(_bfPlayerX+Math.cos(ptc2.angle)*ptcR3,ptc2.y,_bfPlayerZ+Math.sin(ptc2.angle)*ptcR3);
                ptc2.mesh.material.opacity=0.5+Math.sin(elapsed*0.01+_pp4)*0.4;
            }
            // Camera shake intensifies
            camera.position.x+=Math.sin(elapsed*0.06)*0.15*p2;
        }
        // --- Phase 3: Reverse Phase 2 then Phase 1 at race track (0.6 - 1.0 = 4s) ---
        else{
            var p3=(t-0.6)/0.4;
            // First time: switch scene + place eggs in sky
            if(!_bfCityHidden){
                _bfCityHidden=true;
                cityGroup.visible=false;
                for(var _hn=0;_hn<cityNPCs.length;_hn++)cityNPCs[_hn].mesh.visible=false;
                if(_babylonTower&&_babylonTower.group)_babylonTower.group.visible=false;
                for(var _hc2=0;_hc2<cityCloudPlatforms.length;_hc2++){if(cityCloudPlatforms[_hc2].group)cityCloudPlatforms[_hc2].group.visible=false;}
                if(window._cityAnimals)for(var _ha2=0;_ha2<window._cityAnimals.length;_ha2++){if(window._cityAnimals[_ha2]._inScene&&window._cityAnimals[_ha2].group)window._cityAnimals[_ha2].group.visible=false;}
                raceGroup.visible=true;
                // Move bifrost to race track center
                for(var _mr=0;_mr<_bfRings.length;_mr++){_bfRings[_mr].position.set(0,0.1+_mr*0.05,0);}
                for(var _mrn=0;_mrn<_bfRunes.length;_mrn++){_bfRunes[_mrn].position.set(0,0.2,0);}
                for(var _mp=0;_mp<_bfPillars.length;_mp++){_bfPillars[_mp].position.set(0,50,0);}
                // Show all eggs at sky height, staggered
                for(var _se=0;_se<allEggs.length;_se++){
                    allEggs[_se].mesh.visible=true;
                    allEggs[_se].mesh.position.set(0,50+_se*2,0);
                }
            }
            // --- Reverse Phase 2 (0-0.5 of p3): eggs descend from sky one by one ---
            if(p3<0.5){
                var rp2=p3/0.5; // 0..1
                // Flash at very start
                _bfFlash.position.copy(camera.position);_bfFlash.quaternion.copy(camera.quaternion);_bfFlash.translateZ(-1);
                _bfFlash.material.opacity=Math.max(0,1-rp2*4);
                // One big rainbow beam at center → eggs pop out one by one
                if(window._bfRacePositions){
                    var _nEggs=window._bfRacePositions.length;
                    // Create center beam once
                    if(!window._bfCenterBeam){
                        // Calculate actual center of all eggs
                        var _cx=0,_cz=0;
                        for(var _cci=0;_cci<_nEggs;_cci++){_cx+=window._bfRacePositions[_cci].x;_cz+=window._bfRacePositions[_cci].z;}
                        _cx/=_nEggs;_cz/=_nEggs;
                        window._bfCenterBeam={x:_cx,z:_cz,meshes:[]};
                        for(var _cbi=0;_cbi<7;_cbi++){
                            var _cbm=new THREE.Mesh(
                                new THREE.CylinderGeometry(0.5+_cbi*0.3,1+_cbi*0.4,1,12),
                                new THREE.MeshBasicMaterial({color:_bfColors[_cbi],transparent:true,opacity:0.4})
                            );
                            scene.add(_cbm);
                            window._bfCenterBeam.meshes.push(_cbm);
                        }
                    }
                    // Animate center beam: grows down from sky
                    var _beamGrow=Math.min(1,rp2*3);
                    var _beamH2=80*_beamGrow;
                    for(var _cbi2=0;_cbi2<window._bfCenterBeam.meshes.length;_cbi2++){
                        var _cbm2=window._bfCenterBeam.meshes[_cbi2];
                        _cbm2.scale.set(1,Math.max(0.1,_beamH2),1);
                        _cbm2.position.set(window._bfCenterBeam.x,80-_beamH2/2,window._bfCenterBeam.z);
                        _cbm2.rotation.y=elapsed*0.002+_cbi2*0.3;
                        _cbm2.material.opacity=0.35*(1-rp2*0.3);
                    }
                    // Eggs pop out from beam center, one by one
                    for(var _dei=0;_dei<_nEggs;_dei++){
                        var _rp2=window._bfRacePositions[_dei];
                        var _eDelay=0.15+_dei/_nEggs*0.75;
                        var _eP=Math.max(0,Math.min(1,(rp2-_eDelay)/0.12));
                        if(_eP<=0){_rp2.egg.mesh.visible=false;continue;}
                        _rp2.egg.mesh.visible=true;
                        var _eEase=_eP<0.5?2*_eP*_eP:1-Math.pow(-2*_eP+2,2)/2;
                        // Fly from beam center to own race position
                        _rp2.egg.mesh.position.set(
                            window._bfCenterBeam.x+(_rp2.x-window._bfCenterBeam.x)*_eEase,
                            30*(1-_eEase)+_rp2.y*_eEase,
                            window._bfCenterBeam.z+(_rp2.z-window._bfCenterBeam.z)*_eEase
                        );
                        _rp2.egg.mesh.rotation.y-=0.15*(1-_eP);
                        var _popS2=_eP<0.2?(1.3*_eP/0.2):1.3-(0.3*Math.min(1,(_eP-0.2)/0.8));
                        _rp2.egg.mesh.scale.set(_popS2,_popS2,_popS2);
                        _rp2.egg.squash=_eP<0.15?0.4:0.4+Math.min(0.6,(_eP-0.15)*0.8);
                        // Soft chime when egg appears
                        if(_eP>0&&_eP<0.05&&!_rp2._sounded){
                            _rp2._sounded=true;
                            if(sfxEnabled){try{var _bsCtx=ensureAudio();if(_bsCtx){var _bst=_bsCtx.currentTime;
                                var _bso=_bsCtx.createOscillator();var _bsg=_bsCtx.createGain();
                                _bso.type='triangle';
                                _bso.frequency.setValueAtTime(600+_dei*40,_bst);
                                _bso.frequency.exponentialRampToValueAtTime(400,_bst+0.2);
                                _bsg.gain.setValueAtTime(0.08,_bst);
                                _bsg.gain.exponentialRampToValueAtTime(0.001,_bst+0.25);
                                _bso.connect(_bsg);_bsg.connect(_bsCtx.destination);
                                _bso.start(_bst);_bso.stop(_bst+0.25);
                            }}catch(e){}}
                        }
                    }
                }
                // Rings at ground pulsing
                for(var _ri5=0;_ri5<_bfRings.length;_ri5++){
                    _bfRings[_ri5].visible=true;
                    var _bcx=window._bfCenterBeam?window._bfCenterBeam.x:0,_bcz=window._bfCenterBeam?window._bfCenterBeam.z:0;
                    _bfRings[_ri5].position.set(_bcx,0.1+_ri5*0.05,_bcz);
                    _bfRings[_ri5].material.opacity=0.7*(1-rp2*0.5);
                    _bfRings[_ri5].rotation.z=elapsed*0.005+_ri5*0.5;
                }
                // Pillars full height, spiraling at race center
                for(var _pi5=0;_pi5<_bfPillars.length;_pi5++){
                    _bfPillars[_pi5].visible=true;
                    var _sa5=elapsed*0.003+_pi5*(Math.PI*2/_bfPillarCount);
                    var _sr5=0.3+(_pi5%5)*0.25+Math.floor(_pi5/5)*0.4;
                    var _bcx2=window._bfCenterBeam?window._bfCenterBeam.x:0,_bcz2=window._bfCenterBeam?window._bfCenterBeam.z:0;
                    _bfPillars[_pi5].position.set(_bcx2+Math.cos(_sa5)*_sr5,50,_bcz2+Math.sin(_sa5)*_sr5);
                    _bfPillars[_pi5].material.opacity=0.6*(1-rp2*0.3);
                }
                // Camera from above, pulling back
                camera.position.set(0,20+30*(1-rp2),14+10*(1-rp2));
                camera.lookAt(0,5+20*(1-rp2),0);
                // Particles rain down
                for(var _pp6=0;_pp6<_bfParticles.length;_pp6++){
                    var _ptc3=_bfParticles[_pp6];_ptc3.mesh.visible=true;
                    _ptc3.y-=_ptc3.speed*1.5;if(_ptc3.y<0)_ptc3.y=50;
                    _ptc3.angle+=0.03;
                    var _pr3=0.8+Math.sin(_ptc3.angle*3)*0.4;
                    _ptc3.mesh.position.set(Math.cos(_ptc3.angle)*_pr3,_ptc3.y,Math.sin(_ptc3.angle)*_pr3);
                    _ptc3.mesh.material.opacity=0.4*(1-rp2);
                }
            }
            // --- Reverse Phase 1 (0.5-1.0 of p3): pillars retract to sky ---
            else{
                var rp1=(p3-0.5)/0.5; // 0..1
                _bfFlash.material.opacity=0;
                // All eggs at final positions
                if(window._bfRacePositions){
                    for(var _dei2=0;_dei2<window._bfRacePositions.length;_dei2++){
                        var _rp3=window._bfRacePositions[_dei2];
                        _rp3.egg.mesh.visible=true;
                        _rp3.egg.mesh.position.set(_rp3.x,_rp3.y,_rp3.z);
                        _rp3.egg.squash=1;
                    }
                }
                // Pillars retract upward (reverse of Phase 1 descent)
                var _retractH=120*rp1;
                for(var _pi6=0;_pi6<_bfPillars.length;_pi6++){
                    var _sa6=elapsed*0.003+_pi6*(Math.PI*2/_bfPillarCount);
                    var _sr6=0.3+(_pi6%5)*0.25;
                    var _bcx3=window._bfCenterBeam?window._bfCenterBeam.x:0,_bcz3=window._bfCenterBeam?window._bfCenterBeam.z:0;
                    _bfPillars[_pi6].position.set(_bcx3+Math.cos(_sa6)*_sr6,_retractH+50,_bcz3+Math.sin(_sa6)*_sr6);
                    _bfPillars[_pi6].material.opacity=Math.max(0,0.5*(1-rp1));
                }
                // Rings shrink and fade
                for(var _ri6=0;_ri6<_bfRings.length;_ri6++){
                    var _shrink=1-rp1;
                    _bfRings[_ri6].scale.setScalar(Math.max(0.001,_shrink));
                    _bfRings[_ri6].material.opacity=Math.max(0,0.6*(1-rp1));
                }
                // Particles fade
                for(var _pp7=0;_pp7<_bfParticles.length;_pp7++){
                    _bfParticles[_pp7].mesh.material.opacity=Math.max(0,0.3*(1-rp1));
                }
                // Runes hidden
                for(var _rn5=0;_rn5<_bfRunes.length;_rn5++)_bfRunes[_rn5].visible=false;
                // Camera settles at race start view
                camera.position.set(0,12+8*(1-rp1),14+6*(1-rp1));
                camera.lookAt(0,0+5*(1-rp1),-5*rp1);
            }
        }

        // The shared game loop renders raceIntro continuously. Rendering again
        // here doubled GPU work and made the portal transition stutter.
        _bfAnimId=requestAnimationFrame(_animateBifrost3D);
    }
    _animateBifrost3D();
    function _startRaceCountdown(){
        // Force all eggs to their target positions and visible
        if(window._bfRacePositions){
            for(var _fi=0;_fi<window._bfRacePositions.length;_fi++){
                var _ft=window._bfRacePositions[_fi];
                _ft.egg.mesh.position.set(_ft.x,_ft.y,_ft.z);
                _ft.egg.mesh.visible=true;
                _ft.egg.mesh.scale.set(1,1,1);
                _ft.egg.mesh.rotation.y=0;
                _ft.egg.squash=1;
                if(_ft._beam){scene.remove(_ft._beam);_ft._beam=null;}
                _ft._sounded=false;
            }
        }
        if(window._bfCenterBeam&&window._bfCenterBeam.meshes){
            for(var _cbci=0;_cbci<window._bfCenterBeam.meshes.length;_cbci++)scene.remove(window._bfCenterBeam.meshes[_cbci]);
        }
        window._bfCenterBeam=null;
        window._bfRacePositions=null;
        window._bfEggTargets=null;
        startRaceBGM(raceIndex);
        var raceNames=I18N.raceNames[_langCode]||I18N.raceNames.en;
        if(raceNames[raceIndex])_showAreaName(raceNames[raceIndex]);
        document.getElementById('round-label').textContent=race.name;
        document.getElementById('round-name').textContent=race.desc;
        document.getElementById('round-desc').textContent=L('rushGoal');
        document.getElementById('player-count').textContent='🥚 × '+total;
    // Animated canvas background
    var _rcvs=document.getElementById('round-canvas');
    var _rctx=_rcvs?_rcvs.getContext('2d'):null;
    if(_rcvs){_rcvs.width=_rcvs.parentElement.offsetWidth*Math.min(devicePixelRatio,2);_rcvs.height=_rcvs.parentElement.offsetHeight*Math.min(devicePixelRatio,2);}
    var _rStart=Date.now();
    var _rColor=race.color||0xFF4444;
    var _rColorStr='#'+_rColor.toString(16).padStart(6,'0');
    var _rStars=[];for(var _rsi=0;_rsi<30;_rsi++)_rStars.push({x:Math.random(),y:Math.random(),s:2+Math.random()*4,sp:0.5+Math.random()});
    var _rAnimId=null;
    function _drawRoundBG(){
        if(!_rctx||!document.getElementById('round-screen').classList.contains('active')){if(_rAnimId)cancelAnimationFrame(_rAnimId);return;}
        var W=_rcvs.width,H=_rcvs.height,t=(Date.now()-_rStart)/1000;
        _rctx.clearRect(0,0,W,H);
        // Diagonal curtain wipe
        var wipe=Math.min(1,t/0.8);
        _rctx.fillStyle=_rColorStr;_rctx.globalAlpha=0.85;
        _rctx.beginPath();_rctx.moveTo(-W*0.2,0);_rctx.lineTo(W*wipe*1.4,0);_rctx.lineTo(W*wipe*1.4-W*0.3,H);_rctx.lineTo(-W*0.2,H);_rctx.fill();
        _rctx.globalAlpha=0.6;
        _rctx.beginPath();_rctx.moveTo(W*(1-wipe*1.4)+W*0.3,0);_rctx.lineTo(W*1.2,0);_rctx.lineTo(W*1.2,H);_rctx.lineTo(W*(1-wipe*1.4),H);_rctx.fill();
        _rctx.globalAlpha=1;
        // Flying stars
        _rctx.fillStyle='#FFD700';
        for(var si=0;si<_rStars.length;si++){
            var s=_rStars[si];s.x-=s.sp*0.003;if(s.x<-0.05)s.x=1.05;
            _rctx.globalAlpha=0.5+Math.sin(t*3+si)*0.3;
            _rctx.beginPath();_rctx.arc(s.x*W,s.y*H,s.s*Math.min(W,H)/600,0,Math.PI*2);_rctx.fill();
        }
        _rctx.globalAlpha=1;
        // Checker pattern strip at bottom
        var stripH=H*0.06;
        for(var ci2=0;ci2<20;ci2++){
            _rctx.fillStyle=(ci2%2===0)?'#000':'#FFD700';
            _rctx.fillRect(ci2*W/10-((t*80)%W/10),H-stripH,W/10+1,stripH);
            _rctx.fillRect(ci2*W/10+((t*60)%W/10),0,W/10+1,stripH*0.7);
        }
        _rAnimId=requestAnimationFrame(_drawRoundBG);
    }
    _drawRoundBG();

    if(countdownTimer) clearInterval(countdownTimer);
    let count=3;
    countdownTimer=setInterval(()=>{
        count--;
        if(count>0){
            document.getElementById('countdown').textContent=count;
            // Play countdown beep
            if(sfxEnabled){var _cdCtx=ensureAudio();if(_cdCtx){var _cdt=_cdCtx.currentTime;
                var _cdo=_cdCtx.createOscillator();var _cdg=_cdCtx.createGain();
                _cdo.type='square';_cdo.frequency.value=count===2?600:800;
                _cdg.gain.setValueAtTime(0.1,_cdt);_cdg.gain.exponentialRampToValueAtTime(0.001,_cdt+0.15);
                _cdo.connect(_cdg);_cdg.connect(_cdCtx.destination);_cdo.start(_cdt);_cdo.stop(_cdt+0.15);
            }}
        } else {
            clearInterval(countdownTimer);
            countdownTimer=null;
            if(_rAnimId)cancelAnimationFrame(_rAnimId);
            document.getElementById('round-screen').classList.remove('active');
            gameState='racing';
            document.getElementById('race-hud').classList.remove('hidden');
            document.getElementById('round-hud').textContent='🏆 '+race.name;
            document.getElementById('alive-hud').textContent='🥚 '+allEggs.filter(e=>!e.cityNPC).length;
            if('ontouchstart' in window||_touchVisible){if(typeof _setTouchControlsVisible==='function')_setTouchControlsVisible(true);else document.getElementById('touch-controls').classList.remove('hidden');if(typeof _hideMenuTouch==='function')_hideMenuTouch();}
            // GO! sound
            if(sfxEnabled){var _goCtx=ensureAudio();if(_goCtx){var _got=_goCtx.currentTime;
                var _goo=_goCtx.createOscillator();var _gog=_goCtx.createGain();
                _goo.type='sawtooth';_goo.frequency.value=1200;
                _gog.gain.setValueAtTime(0.15,_got);_gog.gain.exponentialRampToValueAtTime(0.001,_got+0.3);
                _goo.connect(_gog);_gog.connect(_goCtx.destination);_goo.start(_got);_goo.stop(_got+0.3);
            }}
        }
    },1000);
    } // end _startRaceCountdown
}

function checkRaceEnd(){
    if(gameState!=='racing')return;
    if(_pfActive)return; // platformer has no finish line
    if(playerFinished){
        showRaceResult();
        return;
    }
    const raceEggs=allEggs.filter(e=>!e.cityNPC);
    var _rw=window.DANBO_MINIGAME_WASM&&DANBO_MINIGAME_WASM.race;
    const surviveCount=_rw?_rw.surviveCount(raceEggs.length):Math.ceil(raceEggs.length*0.6);
    if(finishedEggs.length>=surviveCount&&!playerFinished){
        showRaceResult();
    }
}

var _raceExpAwarded=false;
function showRaceResult(){
    gameState='raceResult';
    const place=playerFinished ? playerEgg.finishOrder+1 : 999;
    // Exploration points for finishing a race (+2, +5 for 1st). One-shot per race.
    if(playerFinished&&!_raceExpAwarded&&typeof Explorer!=='undefined'){_raceExpAwarded=true;Explorer.raceFinish(place);}
    const total=allEggs.filter(e=>!e.cityNPC).length;
    var _rw=window.DANBO_MINIGAME_WASM&&DANBO_MINIGAME_WASM.race;
    const won=playerFinished && (_rw?_rw.isWinningPlace(place,total):(place<=Math.ceil(total*0.6)));
    document.getElementById('result-emoji').textContent=won?'🎉':'😵';
    document.getElementById('result-title').textContent=won?I18N.resultWin(place):L('resultLose');
    document.getElementById('result-sub').textContent=won?I18N.resultSub(raceCoinScore):L('tryAgain');
    if(won){coins+=3+raceCoinScore;document.getElementById('coin-hud').textContent='⭐ '+coins;}
    showScreen('result-screen');
    document.getElementById('race-hud').classList.add('hidden');
    document.getElementById('touch-controls').classList.add('hidden');
}

function updateRaceHUD(){
    if(gameState!=='racing'||!playerEgg)return;
    var _rw=window.DANBO_MINIGAME_WASM&&DANBO_MINIGAME_WASM.race;
    const progress=_rw?_rw.progress(-playerEgg.mesh.position.z,trackLength):Math.min(1,(-playerEgg.mesh.position.z)/trackLength);
    document.getElementById('pbar-fill').style.width=(progress*100)+'%';
    let place=1;
    const pz=-playerEgg.mesh.position.z;
    const raceEggs=allEggs.filter(e=>!e.cityNPC);
    for(const e of raceEggs){if(e!==playerEgg&&e.alive&&(-e.mesh.position.z)>pz)place++;}
    document.getElementById('place-hud').textContent=I18N.placeN(place);
    document.getElementById('alive-hud').textContent='🥚 '+raceEggs.filter(e=>e.alive&&!e.finished).length;
    document.getElementById('race-coin-hud').textContent='🪙 '+raceCoinScore;
}
