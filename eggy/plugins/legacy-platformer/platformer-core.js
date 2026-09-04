// platformer-core.js — Legacy platformer runtime loaded by plugins/legacy-platformer
// Source moved from js/platformer.js so this minigame lives under plugins/.
// ============================================================
//  platformer.js — Side-scrolling adventure using existing city engine
//  Creates a new long narrow map with side-view camera
// ============================================================
var _pfActive=false;
var _pfSavedCity=-1;
var _pfTile=4;
function _pfWasm(){return window.DANBO_MINIGAME_WASM&&window.DANBO_MINIGAME_WASM.platformer;}

function _pfStart(){try{
    if(typeof _resetViewMode==='function')_resetViewMode();
    _pfSavedCity=currentCityStyle;
    // Use the same enterRace flow — hide city, clear state, build level
    cityGroup.visible=false;
    for(var _ci2=0;_ci2<cityNPCs.length;_ci2++)cityNPCs[_ci2].mesh.visible=false;
    // Clear player states
    if(playerEgg){
        if(playerEgg.holding){playerEgg.holding.heldBy=null;playerEgg.holding=null;}
        if(playerEgg.heldBy){playerEgg.heldBy.holding=null;playerEgg.heldBy=null;}
        playerEgg._piledriverLocked=false;playerEgg.throwTimer=0;playerEgg._stunTimer=0;
        if(playerEgg.holdingProp){playerEgg.holdingProp.grabbed=false;playerEgg.holdingProp=null;}
        if(playerEgg.holdingObs){playerEgg.holdingObs._grabbed=false;playerEgg.holdingObs=null;}
        scene.remove(playerEgg.mesh);
        var _pidx=allEggs.indexOf(playerEgg);if(_pidx!==-1)allEggs.splice(_pidx,1);
        playerEgg=null;
    }
    // Build platformer in raceGroup (same as race tracks)
    raceGroup.visible=true;
    currentCityStyle=99;
    _pfBuildLevel();
    // Spawn player
    var ch=CHARACTERS[selectedChar];
    playerEgg=createEgg(4,0,ch.color,ch.accent,true,undefined,ch.type);
    playerEgg.mesh.position.set(4,2,0);
    // Spawn 3 NPC companions
    var npcPool=[];
    for(var ci=0;ci<CHARACTERS.length;ci++){if(ci!==selectedChar)npcPool.push(ci);}
    for(var si=npcPool.length-1;si>0;si--){var sj=Math.floor(Math.random()*(si+1));var t=npcPool[si];npcPool[si]=npcPool[sj];npcPool[sj]=t;}
    var _pfw=_pfWasm();
    var total=_pfw?_pfw.partySize():4;
    for(var ni=1;ni<total;ni++){
        var nch=CHARACTERS[npcPool[(ni-1)%npcPool.length]];
        var npc=createEgg(2+ni*3,0,nch.color,nch.accent,false,undefined,nch.type);
        npc.mesh.position.set(2+ni*3,2,(ni-1)*2);
        npc.grabCD=99999;
    }
    _pfActive=true;
    window._pfGoalReached=false;
    finishedEggs=[];playerFinished=false;
    // Use racing state + race HUD (same back button)
    gameState='racing';
    scene.fog=null;
    if(R)R.setClearColor(0x87CEEB);
    stopBGM();startRaceBGM(0);
    document.getElementById('city-hud').classList.add('hidden');
    document.getElementById('race-hud').classList.remove('hidden');
    if('ontouchstart' in window||_touchVisible){if(typeof _setTouchControlsVisible==='function')_setTouchControlsVisible(true);else document.getElementById('touch-controls').classList.remove('hidden');}
}catch(e){console.error('_pfStart ERROR:',e);alert('Start error: '+e.message);}}

function _pfBuildLevel(){try{
    var _pfw=_pfWasm();
    var T=_pfw?_pfw.tileSize():_pfTile;_pfTile=T;
    var L=_pfw?_pfw.levelLength():200,D=_pfw?_pfw.depth(T):T*3;
    var W=_pfw?_pfw.width(T,L):T*L;
    // Global arrays for dynamic elements
    window._pfMovingPlatforms=[];
    window._pfCrumblePlatforms=[];
    window._pfHasKey=false;
    window._pfKeyMesh=null;
    window._pfDoorCollider=null;
    window._pfDoorMesh=null;
    window._pfMushroomColliders=[];
    window._pfLavaColliders=[];
    window._pfWindZones=[];
    window._pfRotatingPlatforms=[];
    window._pfFallingRocks=[];
    window._pfFallingRockTriggers=[];

    // Helper: build ground segment
    function addGround(sx,sw,color,dirtColor){
        var gnd=new THREE.Mesh(new THREE.BoxGeometry(sw,1,D),toon(color));
        gnd.position.set(sx+sw/2,-0.5,0);gnd.receiveShadow=true;raceGroup.add(gnd);
        var drt=new THREE.Mesh(new THREE.BoxGeometry(sw,3,D),toon(dirtColor));
        drt.position.set(sx+sw/2,-2.5,0);raceGroup.add(drt);
        cityColliders.push({x:sx+sw/2,z:0,hw:sw/2,hd:D/2,h:1,y:0});
    }

    // ================================================================
    //  ZONE 1: FOREST (segments 0-65)
    // ================================================================
    var z1Gaps=[[15,18],[35,38],[55,58]];
    var z1GapSet={};
    for(var gi=0;gi<z1Gaps.length;gi++)for(var gx=z1Gaps[gi][0];gx<z1Gaps[gi][1];gx++)z1GapSet[gx]=true;
    // Forest ground
    var segStart=0,inSeg=false;
    for(var tx=0;tx<=65;tx++){
        var solid=!z1GapSet[tx]&&tx<65;
        if(solid&&!inSeg){segStart=tx;inSeg=true;}
        if(!solid&&inSeg){
            addGround(segStart*T,(tx-segStart)*T,0x44AA44,0x8B5E3C);
            inSeg=false;
        }
    }
    // Invisible floor under gaps (catches falling NPCs, player respawns via lava/pit check)
    for(var _gwi=0;_gwi<z1Gaps.length;_gwi++){
        var _gfx1=z1Gaps[_gwi][0]*T, _gfx2=z1Gaps[_gwi][1]*T, _gfw=_gfx2-_gfx1;
        cityColliders.push({x:_gfx1+_gfw/2,z:0,hw:_gfw/2,hd:D/2,h:1,y:-4,_gapFloor:true});
    }
    // Grass tufts on forest ground
    for(var gt=0;gt<65;gt++){
        if(z1GapSet[gt])continue;
        if(Math.random()>0.3)continue;
        var tuft=new THREE.Mesh(new THREE.ConeGeometry(0.3,0.8,5),toon(0x33BB33));
        tuft.position.set(gt*T+(Math.random()-0.5)*T*0.8,0.4,(Math.random()-0.5)*D*0.6);
        raceGroup.add(tuft);
    }
    // Spike pits in forest gaps
    for(var sgi=0;sgi<z1Gaps.length;sgi++){
        var sgx1=z1Gaps[sgi][0]*T,sgx2=z1Gaps[sgi][1]*T,sgw=sgx2-sgx1;
        var pitBg=new THREE.Mesh(new THREE.BoxGeometry(sgw,5,D),toon(0x111111));
        pitBg.position.set(sgx1+sgw/2,-3,0);raceGroup.add(pitBg);
        // Red spikes at bottom
        for(var sp=0;sp<6;sp++){
            var spike=new THREE.Mesh(new THREE.ConeGeometry(0.4,1.5,6),toon(0xCC2222));
            spike.position.set(sgx1+1+sp*(sgw-2)/5,-1.5,(Math.random()-0.5)*D*0.5);
            raceGroup.add(spike);
        }
    }
    // Floating log platforms (some crumble)
    var logPlats=[[5,8,3,false],[12,14,5,true],[22,26,4,false],[30,33,6,true],[42,45,4,false],[48,51,5,true],[60,63,3,false]];
    for(var li=0;li<logPlats.length;li++){
        var lx1=logPlats[li][0]*T,lx2=logPlats[li][1]*T,lh=logPlats[li][2],lCrumble=logPlats[li][3];
        var lw=lx2-lx1;
        var logMesh=new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.6,lw,10),toon(0x8B6914));
        logMesh.rotation.z=Math.PI/2;
        logMesh.position.set(lx1+lw/2,lh,0);raceGroup.add(logMesh);
        var logCol={x:lx1+lw/2,z:0,hw:lw/2,hd:D/2,h:lh+0.6,y:lh-0.6};
        cityColliders.push(logCol);
        if(lCrumble){
            logCol._crumble=true;
            window._pfCrumblePlatforms.push({mesh:logMesh,collider:logCol,triggered:false,timer:120});
        }
    }
    // Mushroom bounce pads
    var mushrooms=[[10,0],[25,0],[40,0],[53,0]];
    for(var mi=0;mi<mushrooms.length;mi++){
        var mx=mushrooms[mi][0]*T,my=mushrooms[mi][1];
        // Stick
        var stick=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,2,6),toon(0xEEDDCC));
        stick.position.set(mx,1+my,0);raceGroup.add(stick);
        // Red cap with white spots
        var cap=new THREE.Mesh(new THREE.SphereGeometry(1.2,10,8,0,Math.PI*2,0,Math.PI/2),toon(0xDD2222));
        cap.position.set(mx,2+my,0);raceGroup.add(cap);
        // White spots
        for(var ws=0;ws<4;ws++){
            var spot=new THREE.Mesh(new THREE.SphereGeometry(0.2,6,4),toon(0xFFFFFF));
            var sa=ws*Math.PI/2;
            spot.position.set(mx+Math.cos(sa)*0.7,2.3+my,Math.sin(sa)*0.7);
            raceGroup.add(spot);
        }
        var mCol={x:mx,z:0,hw:1.2,hd:1.2,h:2.5+my,y:my,_mushroom:true};
        cityColliders.push(mCol);
        window._pfMushroomColliders.push(mCol);
    }
    // Hidden cave at segment 30
    var caveX=30*T;
    var caveOuter=new THREE.Mesh(new THREE.BoxGeometry(T*5,T*3,D),toon(0x333333));
    caveOuter.position.set(caveX,T*1.5,-D*0.3);raceGroup.add(caveOuter);
    var caveInner=new THREE.Mesh(new THREE.BoxGeometry(T*4,T*2.5,D*0.8),toon(0x111111));
    caveInner.position.set(caveX,T*1.25,-D*0.3);raceGroup.add(caveInner);
    // Opening arch
    var caveArch=new THREE.Mesh(new THREE.BoxGeometry(T*2,T*2.2,1),toon(0x222222));
    caveArch.position.set(caveX,T*1.1,D*0.2);raceGroup.add(caveArch);
    // 10 bonus coins inside cave
    for(var cvi=0;cvi<10;cvi++){
        var cvx=caveX-T*1.5+cvi*(T*3)/9;
        var cc=(typeof _makeCinematicCoinMesh==='function')?_makeCinematicCoinMesh(0.94):
            new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.35,0.08,12),toon(0xFFDD00,{emissive:0xFFAA00,emissiveIntensity:0.3}));
        cc.position.set(cvx,1.5,-D*0.3);
        raceGroup.add(cc);
        cityCoins.push({mesh:cc,collected:false});
    }
    // Background trees (decorative, behind Z=-10)
    for(var bti=0;bti<25;bti++){
        var btx=Math.random()*65*T;
        var trunkH=4+Math.random()*4;
        var trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.5,trunkH,6),toon(0x6B4226));
        trunk.position.set(btx,trunkH/2,-10-Math.random()*5);raceGroup.add(trunk);
        var crown=new THREE.Mesh(new THREE.SphereGeometry(2+Math.random()*1.5,8,6),toon(0x228B22));
        crown.position.set(btx,trunkH+1,-10-Math.random()*5);raceGroup.add(crown);
    }
    // 2 patrolling enemies in Zone 1
    var enemyPositions=[[20,2],[50,2]];
    for(var ei=0;ei<enemyPositions.length;ei++){
        var ex=enemyPositions[ei][0]*T,ey=enemyPositions[ei][1];
        var enemy=createEgg(ex,0,0xCC3333,0x880000,false,scene,'egg');
        enemy.mesh.position.set(ex,ey,0);
        enemy.cityNPC=true;enemy.grabCD=99999; // enemies don't grab in platformer
        enemy._patrolBaseX=ex;enemy._patrolRange=T*4;enemy._patrolSpeed=0.03;enemy._patrolPhase=Math.random()*Math.PI*2;
        cityNPCs.push(enemy);
        allEggs.push(enemy);
    }

    // ================================================================
    //  ZONE 2: UNDERGROUND / CAVE (segments 65-130)
    // ================================================================
    var z2Gaps=[[75,78],[95,98],[115,118]];
    var z2GapSet={};
    for(var g2i=0;g2i<z2Gaps.length;g2i++)for(var g2x=z2Gaps[g2i][0];g2x<z2Gaps[g2i][1];g2x++)z2GapSet[g2x]=true;
    // Stone ground
    segStart=0;inSeg=false;
    for(var tx2=65;tx2<=130;tx2++){
        var solid2=!z2GapSet[tx2]&&tx2<130;
        if(solid2&&!inSeg){segStart=tx2;inSeg=true;}
        if(!solid2&&inSeg){
            addGround(segStart*T,(tx2-segStart)*T,0x444444,0x333333);
            inSeg=false;
        }
    }
    // Ceiling for cave zone
    var ceilMesh=new THREE.Mesh(new THREE.BoxGeometry(65*T,2,D*1.5),toon(0x333333));
    ceilMesh.position.set(65*T+65*T/2,22,0);raceGroup.add(ceilMesh);
    // Stalactites hanging from ceiling
    for(var sti=0;sti<30;sti++){
        var stx=65*T+Math.random()*65*T;
        var stLen=1.5+Math.random()*3;
        var stal=new THREE.Mesh(new THREE.ConeGeometry(0.4+Math.random()*0.3,stLen,6),toon(0x555555));
        stal.rotation.x=Math.PI;
        stal.position.set(stx,21-stLen/2,(Math.random()-0.5)*D);
        raceGroup.add(stal);
    }
    // Lava pools in gaps
    // Invisible floor under lava gaps
    for(var _g2wi=0;_g2wi<z2Gaps.length;_g2wi++){
        var _g2x1=z2Gaps[_g2wi][0]*T, _g2x2=z2Gaps[_g2wi][1]*T, _g2w=_g2x2-_g2x1;
        cityColliders.push({x:_g2x1+_g2w/2,z:0,hw:_g2w/2,hd:D/2,h:1,y:-4,_gapFloor:true});
    }
    for(var lgi=0;lgi<z2Gaps.length;lgi++){
        var lgx1=z2Gaps[lgi][0]*T,lgx2=z2Gaps[lgi][1]*T,lgw=lgx2-lgx1;
        var lava=new THREE.Mesh(new THREE.PlaneGeometry(lgw,D),toon(0xFF4400,{emissive:0xFF2200,emissiveIntensity:0.8}));
        lava.rotation.x=-Math.PI/2;
        lava.position.set(lgx1+lgw/2,-2,0);raceGroup.add(lava);
        // Lava glow
        var lavaGlow=new THREE.Mesh(new THREE.PlaneGeometry(lgw+2,D+2),toon(0xFF6600,{emissive:0xFF4400,emissiveIntensity:0.5}));
        lavaGlow.rotation.x=-Math.PI/2;
        lavaGlow.position.set(lgx1+lgw/2,-2.1,0);raceGroup.add(lavaGlow);
        window._pfLavaColliders.push({x:lgx1+lgw/2,z:0,hw:lgw/2,hd:D/2,y:-2});
    }
    // 4 moving platforms in cave
    var mpDefs=[[70,5,8,0.02,0],[85,4,6,0.015,1],[105,6,10,0.025,2],[125,4,7,0.018,3]];
    for(var mpi=0;mpi<mpDefs.length;mpi++){
        var mpSeg=mpDefs[mpi][0],mpH=mpDefs[mpi][1],mpRange=mpDefs[mpi][2],mpSpd=mpDefs[mpi][3],mpPh=mpDefs[mpi][4];
        var mpX=mpSeg*T;
        var mpMesh=new THREE.Mesh(new THREE.BoxGeometry(T*2,0.8,D),toon(0x6666AA));
        mpMesh.position.set(mpX,mpH,0);raceGroup.add(mpMesh);
        var mpCol={x:mpX,z:0,hw:T,hd:D/2,h:mpH+0.4,y:mpH-0.4};
        cityColliders.push(mpCol);
        window._pfMovingPlatforms.push({mesh:mpMesh,collider:mpCol,baseX:mpX,range:mpRange,speed:mpSpd,phase:mpPh});
    }
    // Crystal collectibles (worth 3 coins each)
    for(var cri=0;cri<12;cri++){
        var crx=65*T+5+Math.random()*60*T;
        var inGapCr=false;
        for(var gcri=0;gcri<z2Gaps.length;gcri++){if(crx/T>=z2Gaps[gcri][0]&&crx/T<z2Gaps[gcri][1])inGapCr=true;}
        if(inGapCr)continue;
        var crystal=new THREE.Mesh(new THREE.OctahedronGeometry(0.5,0),toon(0x00FFFF,{emissive:0x00AAAA,emissiveIntensity:0.5}));
        crystal.position.set(crx,1.5+Math.random()*2,0);
        raceGroup.add(crystal);
        // Crystals are worth 3 coins, push 3 coin entries for same mesh
        cityCoins.push({mesh:crystal,collected:false});
        cityCoins.push({mesh:crystal,collected:false,_linked:true});
        cityCoins.push({mesh:crystal,collected:false,_linked:true});
    }
    // Torch lights on walls every 20 segments
    for(var tli=65;tli<130;tli+=20){
        var tlx=tli*T;
        for(var tside=-1;tside<=1;tside+=2){
            var torch=new THREE.Mesh(new THREE.SphereGeometry(0.5,8,6),toon(0xFF8800,{emissive:0xFF6600,emissiveIntensity:0.9}));
            torch.position.set(tlx,3,tside*D*0.5);raceGroup.add(torch);
            // Torch bracket
            var bracket=new THREE.Mesh(new THREE.BoxGeometry(0.2,1.5,0.2),toon(0x444444));
            bracket.position.set(tlx,2,tside*D*0.5);raceGroup.add(bracket);
        }
    }
    // Golden key at segment 90
    var keyX=90*T;
    var keyMesh=new THREE.Group();
    var keyHead=new THREE.Mesh(new THREE.TorusGeometry(0.6,0.15,8,12),toon(0xFFDD00,{emissive:0xFFAA00,emissiveIntensity:0.6}));
    keyMesh.add(keyHead);
    var keyShaft=new THREE.Mesh(new THREE.BoxGeometry(0.15,1.2,0.15),toon(0xFFDD00,{emissive:0xFFAA00,emissiveIntensity:0.6}));
    keyShaft.position.y=-1;keyMesh.add(keyShaft);
    var keyBit1=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.15,0.15),toon(0xFFDD00,{emissive:0xFFAA00,emissiveIntensity:0.6}));
    keyBit1.position.set(0.2,-1.4,0);keyMesh.add(keyBit1);
    var keyBit2=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.15,0.15),toon(0xFFDD00,{emissive:0xFFAA00,emissiveIntensity:0.6}));
    keyBit2.position.set(0.15,-1.2,0);keyMesh.add(keyBit2);
    keyMesh.position.set(keyX,3,0);
    raceGroup.add(keyMesh);
    window._pfKeyMesh=keyMesh;
    // Locked door at segment 120
    var doorX=120*T;
    var lockDoor=new THREE.Mesh(new THREE.BoxGeometry(T*1.5,T*4,D),toon(0x884422));
    lockDoor.position.set(doorX,T*2,0);raceGroup.add(lockDoor);
    // Lock icon on door
    var lockIcon=new THREE.Mesh(new THREE.TorusGeometry(0.8,0.2,8,8),toon(0xFFDD00));
    lockIcon.position.set(doorX,T*2.5,D*0.51);raceGroup.add(lockIcon);
    var doorCol={x:doorX,z:0,hw:T*0.75,hd:D/2,h:T*4,y:0,_door:true};
    cityColliders.push(doorCol);
    window._pfDoorCollider=doorCol;
    window._pfDoorMesh=lockDoor;
    window._pfDoorLockIcon=lockIcon;
    // Falling rocks (triggered when player passes)
    var rockSegs=[72,82,100,110,122];
    for(var ri=0;ri<rockSegs.length;ri++){
        var rx=rockSegs[ri]*T;
        var rockMesh=new THREE.Mesh(new THREE.DodecahedronGeometry(1.2,0),toon(0x666666));
        rockMesh.position.set(rx,20,(Math.random()-0.5)*D*0.4);
        raceGroup.add(rockMesh);
        window._pfFallingRocks.push({mesh:rockMesh,triggerX:rx,triggered:false,falling:false,vy:0});
    }

    // ================================================================
    //  ZONE 3: SKY CASTLE (segments 130-200)
    // ================================================================
    // No ground -- all floating cloud platforms
    // Cloud-style platforms at varying heights
    var skyPlats=[
        [131,134,7],[135,137,9],[138,141,6],[142,144,11],[145,148,8],
        [149,151,13],[152,155,7],[156,158,10],[159,162,12],[163,165,8],
        [166,169,14],[170,172,9],[173,176,11],[177,179,7],[180,183,13]
    ];
    for(var ski=0;ski<skyPlats.length;ski++){
        var skx1=skyPlats[ski][0]*T,skx2=skyPlats[ski][1]*T,skh=skyPlats[ski][2];
        var skw=skx2-skx1;
        // Cloud platform (white fluffy)
        var cloudBase=new THREE.Mesh(new THREE.BoxGeometry(skw,1.5,D),toon(0xEEEEFF));
        cloudBase.position.set(skx1+skw/2,skh,0);raceGroup.add(cloudBase);
        // Fluffy top
        for(var cf=0;cf<3;cf++){
            var puff=new THREE.Mesh(new THREE.SphereGeometry(1+Math.random()*0.8,8,6),toon(0xFFFFFF));
            puff.position.set(skx1+skw/2+(cf-1)*skw*0.3,skh+0.8,(Math.random()-0.5)*D*0.3);
            raceGroup.add(puff);
        }
        cityColliders.push({x:skx1+skw/2,z:0,hw:skw/2,hd:D/2,h:skh+0.75,y:skh-0.75});
    }
    // Chain of small precision platforms (1-segment wide, spaced 5 apart)
    var chainStart=184;
    for(var chi=0;chi<5;chi++){
        var chSeg=chainStart+chi*5;
        var chx=chSeg*T,chh=8+Math.sin(chi*0.8)*3;
        var chPlat=new THREE.Mesh(new THREE.BoxGeometry(T,0.6,D*0.7),toon(0xDDDDFF));
        chPlat.position.set(chx,chh,0);raceGroup.add(chPlat);
        cityColliders.push({x:chx,z:0,hw:T/2,hd:D*0.35,h:chh+0.3,y:chh-0.3});
    }
    // Wind gust zones (visual + effect)
    var windZones=[[135,150,0.03],[160,175,-0.025],[185,195,0.035]];
    for(var wi=0;wi<windZones.length;wi++){
        var wz1=windZones[wi][0]*T,wz2=windZones[wi][1]*T,wForce=windZones[wi][2];
        window._pfWindZones.push({x1:wz1,x2:wz2,force:wForce});
        // Wind visual: streaks
        for(var wvi=0;wvi<8;wvi++){
            var streak=new THREE.Mesh(new THREE.BoxGeometry(3,0.05,0.05),toon(0xCCDDFF,{transparent:true,opacity:0.4}));
            streak.position.set(wz1+Math.random()*(wz2-wz1),5+Math.random()*12,(Math.random()-0.5)*D);
            raceGroup.add(streak);
        }
    }
    // Rotating platforms (4 platforms orbiting center points)
    var rotCenters=[[145,10],[160,12],[175,9],[190,11]];
    for(var rci=0;rci<rotCenters.length;rci++){
        var rcx=rotCenters[rci][0]*T,rcy=rotCenters[rci][1];
        // Center post (decorative)
        var post=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,1,6),toon(0x888888));
        post.position.set(rcx,rcy,0);raceGroup.add(post);
        // Rotating platform arm
        var armMesh=new THREE.Mesh(new THREE.BoxGeometry(T*2,0.6,D*0.6),toon(0xAAAADD));
        armMesh.position.set(rcx+T*2,rcy,0);raceGroup.add(armMesh);
        var armCol={x:rcx+T*2,z:0,hw:T,hd:D*0.3,h:rcy+0.3,y:rcy-0.3};
        cityColliders.push(armCol);
        window._pfRotatingPlatforms.push({mesh:armMesh,collider:armCol,centerX:rcx,centerY:rcy,radius:T*2,angle:rci*Math.PI/2,speed:0.008+rci*0.002});
    }
    // Boss arena (large flat platform segments 190-198)
    var bossX1=190*T,bossX2=198*T,bossW=bossX2-bossX1;
    var bossPlat=new THREE.Mesh(new THREE.BoxGeometry(bossW,2,D*1.5),toon(0x8888AA));
    bossPlat.position.set(bossX1+bossW/2,6,0);raceGroup.add(bossPlat);
    cityColliders.push({x:bossX1+bossW/2,z:0,hw:bossW/2,hd:D*0.75,h:7,y:5});
    // Boss arena pillars
    for(var bpi=-1;bpi<=1;bpi+=2){
        var bPillar=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,8,8),toon(0x666688));
        bPillar.position.set(bossX1+bossW/2+bpi*(bossW/2-2),11,0);raceGroup.add(bPillar);
    }
    // Boss enemy (larger NPC, scale 1.5)
    var bossEnemy=createEgg(bossX1+bossW/2,0,0xFF2222,0x880000,false,scene,'egg');
    bossEnemy.mesh.position.set(bossX1+bossW/2,8,0);
    bossEnemy.mesh.scale.set(1.5,1.5,1.5);
    bossEnemy.cityNPC=true;bossEnemy.grabCD=99999;
    bossEnemy._patrolBaseX=bossX1+bossW/2;bossEnemy._patrolRange=bossW/2-4;bossEnemy._patrolSpeed=0.02;bossEnemy._patrolPhase=0;
    cityNPCs.push(bossEnemy);
    allEggs.push(bossEnemy);
    // Final castle (bigger version)
    var castleX=_pfw?_pfw.castleX(T,L):(L-3)*T;
    var castle=new THREE.Mesh(new THREE.BoxGeometry(T*10,T*8,D*2),toon(0xAA8866));
    castle.position.set(castleX,T*4,0);raceGroup.add(castle);
    cityColliders.push({x:castleX,z:0,hw:T*5,hd:D,h:T*8,y:0});
    var cdoor=new THREE.Mesh(new THREE.BoxGeometry(T*2,T*3.5,1),toon(0x442200));
    cdoor.position.set(castleX,T*1.75,D);raceGroup.add(cdoor);
    // 4 turrets
    for(var cti=-1;cti<=1;cti+=2){
        for(var ctj=-1;ctj<=1;ctj+=2){
            var turret=new THREE.Mesh(new THREE.CylinderGeometry(T*0.8,T*1,T*3,8),toon(0x998877));
            turret.position.set(castleX+cti*T*4,T*9.5,ctj*D*0.6);raceGroup.add(turret);
            var tcone=new THREE.Mesh(new THREE.ConeGeometry(T*1,T*2,8),toon(0xCC4444));
            tcone.position.set(castleX+cti*T*4,T*12,ctj*D*0.6);raceGroup.add(tcone);
        }
    }
    // Flag pole at castle
    var pole=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,T*14,6),toon(0x888888));
    pole.position.set(castleX,T*7+T*7,0);raceGroup.add(pole);
    var flag=new THREE.Mesh(new THREE.PlaneGeometry(T*3,T*1.5),new THREE.MeshBasicMaterial({color:0xFF4444,side:THREE.DoubleSide}));
    flag.position.set(castleX+T*1.5,T*13,0);raceGroup.add(flag);
    // Goal trigger zone — touching the flag pole = victory
    window._pfGoalX=_pfw?_pfw.goalX(T,L):(castleX-T*3); // trigger zone starts before the castle

    // ================================================================
    //  SKY + CLOUDS (shared across all zones)
    // ================================================================
    var sky=new THREE.Mesh(new THREE.PlaneGeometry(W+200,200),new THREE.MeshBasicMaterial({color:0x87CEEB,side:THREE.DoubleSide}));
    sky.position.set(W/2,50,-D*3);raceGroup.add(sky);
    // Cave background for Zone 2
    var caveBg=new THREE.Mesh(new THREE.PlaneGeometry(65*T+20,60),new THREE.MeshBasicMaterial({color:0x111118,side:THREE.DoubleSide}));
    caveBg.position.set(65*T+65*T/2,10,-D*2);raceGroup.add(caveBg);
    // Clouds (more for sky zone)
    for(var ci2=0;ci2<30;ci2++){
        var cloud=new THREE.Group();
        for(var ccp=0;ccp<3;ccp++){
            var cb=new THREE.Mesh(new THREE.SphereGeometry(2+Math.random()*2,8,6),toon(0xFFFFFF));
            cb.position.set(ccp*2.5-2.5,Math.random()*0.5,0);cloud.add(cb);
        }
        cloud.position.set(Math.random()*W,25+Math.random()*25,-D*2-Math.random()*10);
        raceGroup.add(cloud);
    }

    // ================================================================
    //  COINS (40 total redistributed across zones + cave bonus already added)
    // ================================================================
    // Zone 1: 15 coins
    for(var c1i=0;c1i<15;c1i++){
        var c1x=4+Math.random()*60*T;
        var c1InGap=false;
        for(var c1g=0;c1g<z1Gaps.length;c1g++){if(c1x/T>=z1Gaps[c1g][0]&&c1x/T<z1Gaps[c1g][1])c1InGap=true;}
        if(c1InGap){c1i--;continue;}
        var c1=(typeof _makeCinematicCoinMesh==='function')?_makeCinematicCoinMesh(0.94):
            new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.35,0.08,12),toon(0xFFDD00,{emissive:0xFFAA00,emissiveIntensity:0.3}));
        c1.position.set(c1x,1.2+Math.random()*3,0);
        raceGroup.add(c1);
        cityCoins.push({mesh:c1,collected:false});
    }
    // Zone 2: 10 coins (+ crystals already added above)
    for(var c2i=0;c2i<10;c2i++){
        var c2x=65*T+4+Math.random()*60*T;
        var c2InGap=false;
        for(var c2g=0;c2g<z2Gaps.length;c2g++){if(c2x/T>=z2Gaps[c2g][0]&&c2x/T<z2Gaps[c2g][1])c2InGap=true;}
        if(c2InGap){c2i--;continue;}
        var c2=(typeof _makeCinematicCoinMesh==='function')?_makeCinematicCoinMesh(0.94):
            new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.35,0.08,12),toon(0xFFDD00,{emissive:0xFFAA00,emissiveIntensity:0.3}));
        c2.position.set(c2x,1.2+Math.random()*2,0);
        raceGroup.add(c2);
        cityCoins.push({mesh:c2,collected:false});
    }
    // Zone 3: 15 coins floating near platforms
    for(var c3i=0;c3i<15;c3i++){
        var c3idx=Math.floor(Math.random()*skyPlats.length);
        var c3p=skyPlats[c3idx];
        var c3x=c3p[0]*T+Math.random()*(c3p[1]-c3p[0])*T;
        var c3=(typeof _makeCinematicCoinMesh==='function')?_makeCinematicCoinMesh(0.94):
            new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.35,0.08,12),toon(0xFFDD00,{emissive:0xFFAA00,emissiveIntensity:0.3}));
        c3.position.set(c3x,c3p[2]+2+Math.random()*2,0);
        raceGroup.add(c3);
        cityCoins.push({mesh:c3,collected:false});
    }
}catch(e){console.error('_pfBuildLevel ERROR:',e);alert('Level build error: '+e.message);}}

// ---- Moving / dynamic platform updates ----
function _pfUpdateMoving(){try{
    if(!_pfActive)return;
    // Moving platforms
    if(window._pfMovingPlatforms){
        for(var i=0;i<window._pfMovingPlatforms.length;i++){
            var mp=window._pfMovingPlatforms[i];
            mp.phase+=mp.speed;
            var _pfw=_pfWasm();
            var newX=_pfw?_pfw.movingX(mp.baseX,mp.phase,mp.range):(mp.baseX+Math.sin(mp.phase)*mp.range);
            mp.mesh.position.x=newX;
            mp.collider.x=newX;
        }
    }
    // Rotating platforms
    if(window._pfRotatingPlatforms){
        for(var ri=0;ri<window._pfRotatingPlatforms.length;ri++){
            var rp=window._pfRotatingPlatforms[ri];
            rp.angle+=rp.speed;
            var _pfw2=_pfWasm();
            var _rxy=_pfw2?_pfw2.rotatingXY(rp.centerX,rp.centerY,rp.radius,rp.angle):null;
            var nx=_rxy?_rxy[0]:(rp.centerX+Math.cos(rp.angle)*rp.radius);
            var ny=_rxy?_rxy[1]:(rp.centerY+Math.sin(rp.angle)*rp.radius*0.3);
            rp.mesh.position.x=nx;
            rp.mesh.position.y=ny;
            rp.collider.x=nx;
            rp.collider.h=ny+0.3;
            rp.collider.y=ny-0.3;
        }
    }
    // Crumbling platforms
    if(window._pfCrumblePlatforms){
        for(var j=window._pfCrumblePlatforms.length-1;j>=0;j--){
            var cp=window._pfCrumblePlatforms[j];
            if(cp.triggered){
                cp.timer--;
                cp.mesh.position.y-=0.01;
                cp.mesh.rotation.z+=0.02;
                if(cp.timer<=0){
                    raceGroup.remove(cp.mesh);
                    var idx=cityColliders.indexOf(cp.collider);
                    if(idx!==-1)cityColliders.splice(idx,1);
                    window._pfCrumblePlatforms.splice(j,1);
                }
            }
        }
    }
    // Falling rocks
    if(window._pfFallingRocks&&playerEgg){
        for(var fri=window._pfFallingRocks.length-1;fri>=0;fri--){
            var fr=window._pfFallingRocks[fri];
            if(!fr.triggered&&DANBO_WASM.absDeltaWithin(playerEgg.mesh.position.x,fr.triggerX,_pfTile*2)){
                fr.triggered=true;fr.falling=true;fr.vy=0;
            }
            if(fr.falling){
                var _pfw3=_pfWasm();
                var _frs=_pfw3?_pfw3.fallingRockStep(fr.mesh.position.y,fr.vy,0.008,-5):null;
                if(_frs){fr.mesh.position.y=_frs[0];fr.vy=_frs[1];}
                else {fr.vy-=0.008;fr.mesh.position.y+=fr.vy;}
                fr.mesh.rotation.x+=0.03;fr.mesh.rotation.z+=0.02;
                if(fr.mesh.position.y<-5){
                    raceGroup.remove(fr.mesh);
                    window._pfFallingRocks.splice(fri,1);
                }
            }
        }
    }
    // Patrol enemies
    for(var pi=0;pi<allEggs.length;pi++){
        var pe=allEggs[pi];
        if(!pe._patrolBaseX)continue;
        pe._patrolPhase+=pe._patrolSpeed;
        pe.mesh.position.x=pe._patrolBaseX+Math.sin(pe._patrolPhase)*pe._patrolRange;
    }
    // Animate key spin
    if(window._pfKeyMesh&&window._pfKeyMesh.parent){
        window._pfKeyMesh.rotation.y+=0.03;
        window._pfKeyMesh.position.y=3+Math.sin(Date.now()*0.003)*0.5;
    }
}catch(e){console.error('_pfUpdateMoving ERROR:',e);}}

// ---- Side-view camera ----
function _pfUpdateCamera(){try{
    if(!_pfActive||!playerEgg)return;
    // Update dynamic elements
    _pfUpdateMoving();
    // Lock Z axis — side-scrolling only (left/right + jump)
    for(var i=0;i<allEggs.length;i++){
        if(!allEggs[i]||!allEggs[i].mesh)continue;
        allEggs[i].mesh.position.z=0;
        allEggs[i].vz=0;
    }
    // Crumbling platform detection
    if(window._pfCrumblePlatforms&&playerEgg&&playerEgg.onGround){
        for(var ci=0;ci<window._pfCrumblePlatforms.length;ci++){
            var cp=window._pfCrumblePlatforms[ci];
            var _pfw4=_pfWasm();
            if(!cp.triggered&&(_pfw4?_pfw4.crumbleTrigger(playerEgg.mesh.position.x,playerEgg.mesh.position.y,cp.collider.x,(cp.collider.h||cp.collider.y||0),cp.collider.hw):(DANBO_WASM.absDeltaWithin(playerEgg.mesh.position.x,cp.collider.x,cp.collider.hw+1)&&
               DANBO_WASM.absDeltaWithin(playerEgg.mesh.position.y,(cp.collider.h||cp.collider.y||0),2)))){
                cp.triggered=true;cp.timer=120;
            }
        }
    }
    // Mushroom bounce detection
    if(window._pfMushroomColliders&&playerEgg&&playerEgg.vy<=0){
        for(var mi=0;mi<window._pfMushroomColliders.length;mi++){
            var mc=window._pfMushroomColliders[mi];
            var _pfw5=_pfWasm();
            if(_pfw5?_pfw5.mushroomBounce(playerEgg.mesh.position.x,playerEgg.mesh.position.y,playerEgg.vy,mc.x,mc.h,mc.hw):(DANBO_WASM.absDeltaWithin(playerEgg.mesh.position.x,mc.x,mc.hw+0.5)&&
               playerEgg.mesh.position.y<=mc.h+0.5&&playerEgg.mesh.position.y>=mc.h-1.5)){
                playerEgg.vy=0.4;
                playerEgg.mesh.position.y=mc.h+0.5;
                playerEgg.squash=0.6;
            }
        }
    }
    // Lava pool check (instant respawn)
    if(window._pfLavaColliders&&playerEgg){
        for(var li=0;li<window._pfLavaColliders.length;li++){
            var lc=window._pfLavaColliders[li];
            if(DANBO_WASM.aabb2D(playerEgg.mesh.position.x,playerEgg.mesh.position.z,lc.x,lc.z,lc.hw,lc.hd,0)&&
               playerEgg.mesh.position.y<lc.y+1){
                playerEgg.mesh.position.set(lc.x-lc.hw*3,5,0);
                playerEgg.vx=0;playerEgg.vy=0;playerEgg.vz=0;
            }
        }
    }
    // Wind gust zones
    if(window._pfWindZones&&playerEgg){
        for(var wi=0;wi<window._pfWindZones.length;wi++){
            var wz=window._pfWindZones[wi];
            var _pfw6=_pfWasm();
            var _wf=_pfw6?_pfw6.windForce(playerEgg.mesh.position.x,wz.x1,wz.x2,wz.force):((playerEgg.mesh.position.x>=wz.x1&&playerEgg.mesh.position.x<=wz.x2)?wz.force:0);
            if(_wf)playerEgg.vx+=_wf;
        }
    }
    // Key collection
    if(window._pfKeyMesh&&!window._pfHasKey&&playerEgg){
        if(DANBO_WASM.within3D(playerEgg.mesh.position.x,playerEgg.mesh.position.y,playerEgg.mesh.position.z,window._pfKeyMesh.position.x,window._pfKeyMesh.position.y,window._pfKeyMesh.position.z,3)){
            window._pfHasKey=true;
            raceGroup.remove(window._pfKeyMesh);
            window._pfKeyMesh=null;
        }
    }
    // Door removal when key collected
    if(window._pfHasKey&&window._pfDoorCollider){
        var didx=cityColliders.indexOf(window._pfDoorCollider);
        if(didx!==-1)cityColliders.splice(didx,1);
        if(window._pfDoorMesh){raceGroup.remove(window._pfDoorMesh);window._pfDoorMesh=null;}
        if(window._pfDoorLockIcon){raceGroup.remove(window._pfDoorLockIcon);window._pfDoorLockIcon=null;}
        window._pfDoorCollider=null;
    }
    // Side camera
    var px=playerEgg.mesh.position.x;
    var py=Math.max(playerEgg.mesh.position.y+8,10);
    camera.position.x+=(px-camera.position.x)*0.08;
    camera.position.y+=(py-camera.position.y)*0.08;
    camera.position.z=45;
    camera.lookAt(new THREE.Vector3(camera.position.x,camera.position.y-4,0));
    // Goal check — reach the flag pole to win!
    var _pfw7=_pfWasm();
    if(_pfw7?_pfw7.goalReached(playerEgg.mesh.position.x,window._pfGoalX,window._pfGoalReached):(window._pfGoalX&&playerEgg.mesh.position.x>=window._pfGoalX&&!window._pfGoalReached)){
        window._pfGoalReached=true;
        // Victory! Show result screen
        playerFinished=true;
        playerEgg.finishOrder=0;
        finishedEggs=[playerEgg];
        gameState='raceResult';
        document.getElementById('result-emoji').textContent='🎉';
        document.getElementById('result-title').textContent=L('resultWin')?I18N.resultWin(1):'🏆 Victory!';
        document.getElementById('result-sub').textContent='⭐ '+coins+' coins collected!';
        document.getElementById('result-screen').classList.add('active');
        document.getElementById('race-hud').classList.add('hidden');
        // Victory sound
        if(sfxEnabled){var _vCtx=ensureAudio();if(_vCtx){var _vt=_vCtx.currentTime;
            [523,659,784,988,1318].forEach(function(f,i){
                var o=_vCtx.createOscillator();var g=_vCtx.createGain();o.type='sawtooth';o.frequency.value=f;
                g.gain.setValueAtTime(0.12,_vt+i*0.08);g.gain.exponentialRampToValueAtTime(0.001,_vt+i*0.08+0.2);
                o.connect(g);g.connect(_vCtx.destination);o.start(_vt+i*0.08);o.stop(_vt+i*0.08+0.2);
            });
        }}
    }
}catch(e){console.error('_pfUpdateCamera ERROR:',e);}}

// ---- End platformer ----
function _pfEndGame(){
    _pfActive=false;
    window._pfGoalReached=false;
    window._pfGoalX=null;
    currentCityStyle=_pfSavedCity>=0?_pfSavedCity:0;
    if(typeof goBackToCity==='function')goBackToCity();
}
