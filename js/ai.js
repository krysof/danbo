// ai.js — DANBO World
// ============================================================
//  OBSTACLE UPDATE (race only)
// ============================================================
function updateObstacles(){
    for(const ob of _danboRaceObstacles()){
        if(ob.type==='spinner'){
            ob.data.angle+=ob.data.speed; ob.mesh.rotation.y=ob.data.angle;
            for(const egg of allEggs){
                if(!egg.alive||egg.finished||egg.cityNPC)continue;
                const ez=-egg.mesh.position.z;
                if(Math.abs(ez-ob.data.z)>ob.data.armLen+1)continue;
                // Full arm collision — check multiple points along each arm half
                for(const s of[-1,1]){
                    const armDirX=Math.sin(ob.data.angle)*s;
                    const armDirZ=-Math.cos(ob.data.angle)*s;
                    for(let t=0.3;t<=1.0;t+=0.2){
                        const ptX=armDirX*ob.data.armLen*t;
                        const ptZ=-(ob.data.z)+armDirZ*ob.data.armLen*t;
                        const dx=egg.mesh.position.x-ptX, ddz=egg.mesh.position.z-ptZ;
                        const dist=DANBO_WASM.len2D(dx,ddz);
                        if(dist<egg.radius+0.45){
                            const str=0.22+t*0.08;
                            egg.vx+=(dx/dist)*str;egg.vz+=(ddz/dist)*str;egg.vy=0.1;egg.squash=0.65;
                            if(egg.isPlayer)playHitSound(egg.mesh.position.x,egg.mesh.position.z);
                            break; // one hit per arm half is enough
                        }
                    }
                }
            }
        }
        if(ob.type==='hammer'){
            ob.data.angle+=ob.data.speed;
            const sa=Math.sin(ob.data.angle)*1.2; ob.swing.rotation.z=sa;
            const headX=ob.data.pivotX+Math.sin(sa)*ob.data.armLen;
            const headY=ob.data.pivotY-Math.cos(sa)*ob.data.armLen;
            for(const egg of allEggs){
                if(!egg.alive||egg.finished||egg.cityNPC)continue;
                if(Math.abs(-egg.mesh.position.z-ob.data.z)>1.5)continue;
                const dx=egg.mesh.position.x-headX,dy=egg.mesh.position.y-headY;
                const dist=DANBO_WASM.len2D(dx,dy);
                if(dist<egg.radius+0.9){egg.vx+=dx*0.35;egg.vy=0.22;egg.vz+=(Math.random()-0.5)*0.2;egg.squash=0.55;}
            }
        }
        if(ob.type==='roller'){
            ob.mesh.rotation.x+=ob.data.speed;
            for(const egg of allEggs){
                if(!egg.alive||egg.finished||egg.cityNPC)continue;
                if(Math.abs(-egg.mesh.position.z-ob.data.z)>1.2)continue;
                if(egg.mesh.position.y<ob.data.fy+ob.data.radius*2+0.3){egg.vy=0.16;egg.vz+=0.05;egg.squash=0.7;}
            }
        }
        if(ob.type==='bumper'){
            ob.data.pulse+=0.05;const s=1+Math.sin(ob.data.pulse)*0.12;ob.mesh.scale.set(s,s,s);
            for(const egg of allEggs){
                if(!egg.alive||egg.finished||egg.cityNPC)continue;
                const dx=egg.mesh.position.x-ob.data.x,dz=egg.mesh.position.z-(-ob.data.z),dy=egg.mesh.position.y-(ob.data.fy+ob.data.radius);
                const dist=DANBO_WASM.len3D(dx,dy,dz);
                if(dist<egg.radius+ob.data.radius){egg.vx+=(dx/dist)*0.32;egg.vz+=(dz/dist)*0.32;egg.vy=0.14;egg.squash=0.65;}
            }
        }
        if(ob.type==='pendulum'){
            ob.data.angle+=ob.data.speed;
            const swA=Math.sin(ob.data.angle)*1.4; ob.arm.rotation.z=swA;
            const ballX=Math.sin(swA)*ob.data.chainLen, ballY=ob.data.pivotY-Math.cos(swA)*ob.data.chainLen;
            for(const egg of allEggs){
                if(!egg.alive||egg.finished||egg.cityNPC)continue;
                if(Math.abs(-egg.mesh.position.z-ob.data.z)>2)continue;
                const dx=egg.mesh.position.x-ballX,dy=egg.mesh.position.y-ballY;
                const dist=DANBO_WASM.len2D(dx,dy);
                if(dist<egg.radius+1.0){egg.vx+=(dx/dist)*0.4;egg.vy=0.25;egg.vz+=(Math.random()-0.5)*0.2;egg.squash=0.5;}
            }
        }
        if(ob.type==='platform'){
            ob.data.phase+=ob.data.speed;
            const newX=Math.sin(ob.data.phase)*ob.data.moveRange;
            const deltaX=newX-ob.mesh.position.x; ob.mesh.position.x=newX;
            for(const egg of allEggs){if(egg.onPlatform===ob)egg.mesh.position.x+=deltaX;}
        }
        if(ob.type==='conveyor'){
            for(const egg of allEggs){
                if(!egg.alive||egg.finished||egg.cityNPC)continue;
                const ez=-egg.mesh.position.z;
                if(DANBO_WASM.aabb2D(egg.mesh.position.x,ez,0,ob.data.z,ob.data.halfW,ob.data.halfLen,0)&&egg.onGround){
                    egg.conveyorVx=ob.data.pushX; egg.conveyorVz=ob.data.pushZ;
                }
            }
        }
        if(ob.type==='fallingBlock'){
            const d=ob.data;
            if(d.onGround){d.resetTimer--;if(d.resetTimer<=0){d.onGround=false;d.falling=false;d.fallSpeed=0;d.timer=80+Math.random()*100;ob.mesh.position.y=d.baseY;ob.shadow.material.opacity=0;}}
            else if(d.falling){
                d.fallSpeed+=0.02;ob.mesh.position.y-=d.fallSpeed;
                ob.shadow.material.opacity=Math.min(0.5,ob.shadow.material.opacity+0.02);
                if(ob.mesh.position.y<=d.fy+d.size/2){
                    ob.mesh.position.y=d.fy+d.size/2;d.onGround=true;d.resetTimer=90;
                    for(const egg of allEggs){
                        if(!egg.alive||egg.finished||egg.cityNPC)continue;
                        const dx=egg.mesh.position.x-d.x,dz=egg.mesh.position.z-(-d.z);
                        if(DANBO_WASM.aabb2D(egg.mesh.position.x,egg.mesh.position.z,d.x,-d.z,d.size*0.7,d.size*0.7,0)&&egg.mesh.position.y<d.fy+d.size+0.5){
                            egg.vy=0.3;egg.vx+=dx*0.3;egg.vz+=dz*0.3;egg.squash=0.4;
                        }
                    }
                }
            } else {
                d.timer--;
                if(d.timer<=d.warningTime){ob.mesh.position.x=d.x+(Math.random()-0.5)*0.3;ob.shadow.material.opacity=0.15+Math.sin(d.timer*0.5)*0.1;}
                if(d.timer<=0){d.falling=true;d.fallSpeed=0;ob.mesh.position.x=d.x;}
            }
        }
            if(ob.type==='boost'){
            ob.data._pulse=(ob.data._pulse||0)+0.06;
            const glow=0.3+Math.sin(ob.data._pulse)*0.2;
            if(ob.mesh&&ob.mesh.material&&ob.mesh.material.emissiveIntensity!==undefined)ob.mesh.material.emissiveIntensity=glow;
            for(const egg of allEggs){
                if(!egg.alive||egg.finished||egg.cityNPC)continue;
                const ez=-egg.mesh.position.z;
                if(DANBO_WASM.aabb2D(egg.mesh.position.x,ez,0,ob.data.z,ob.data.halfW,ob.data.halfD,0)&&egg.onGround){
                    egg.vz-=ob.data.strength; egg.squash=0.8;
                }
            }
        }
        if(ob.type==='spring'){
            ob.data.anim*=0.92;
            ob.mesh.scale.y=1-ob.data.anim*0.3;
            for(const egg of allEggs){
                if(!egg.alive||egg.finished||egg.cityNPC)continue;
                const dx=egg.mesh.position.x-ob.data.x;
                const dz=egg.mesh.position.z-(-ob.data.z);
                const dist=DANBO_WASM.len2D(dx,dz);
                if(dist<ob.data.radius+egg.radius&&egg.onGround&&egg.mesh.position.y<ob.data.fy+1.5){
                    egg.vy=ob.data.jumpForce;
                    egg.vz-=0.08;
                    egg.squash=0.5;
                    ob.data.anim=1;
                    if(egg.isPlayer)playJumpSound();
                }
            }
        }
        if(ob.type==='pipe'){
            for(const egg of allEggs){
                if(!egg.alive||egg.finished||egg.cityNPC)continue;
                const dx=egg.mesh.position.x-ob.data.x;
                const dz=egg.mesh.position.z-(-ob.data.z);
                const dist=DANBO_WASM.len2D(dx,dz);
                if(dist<ob.data.radius+egg.radius&&egg.mesh.position.y<ob.data.fy+ob.data.height){
                    const push=ob.data.radius+egg.radius-dist;
                    if(dist>0.01){egg.mesh.position.x+=dx/dist*push;egg.mesh.position.z+=dz/dist*push;}
                    egg.vx+=(dx/(dist||1))*0.08;egg.vz+=(dz/(dist||1))*0.08;
                }
                // Stand on top of pipe
                if(dist<ob.data.radius&&egg.mesh.position.y>=ob.data.fy+ob.data.height-0.5&&egg.vy<=0){
                    egg.mesh.position.y=ob.data.fy+ob.data.height+0.42;egg.vy=0;egg.onGround=true;
                }
            }
        }
        if(ob.type==='goomba'){
            ob.data.phase+=ob.data.walkSpeed;
            var gx=ob.data.startX+Math.sin(ob.data.phase)*ob.data.walkRange;
            ob.mesh.position.x=gx; ob.data.x=gx;
            // Waddle animation
            ob.mesh.rotation.z=Math.sin(ob.data.phase*3)*0.15;
            ob.mesh.children.forEach(function(ch,ci){if(ci>=5){ch.position.y=0.08+Math.abs(Math.sin(ob.data.phase*3+ci))*0.06;}});
            for(const egg of allEggs){
                if(!egg.alive||egg.finished||egg.cityNPC)continue;
                const dx=egg.mesh.position.x-gx;
                const dz=egg.mesh.position.z-(-ob.data.z);
                const dist=DANBO_WASM.len2D(dx,dz);
                if(dist<ob.data.radius+egg.radius){
                    // If egg is above goomba — stomp it (bounce)
                    if(egg.mesh.position.y>ob.data.fy+0.8&&egg.vy<0){
                        egg.vy=0.3;egg.squash=0.6;
                        ob.mesh.scale.y=0.2;ob.mesh.position.y=ob.data.fy-0.3;
                        ob.data._squashed=true;ob.data._respawn=180;
                        if(egg.isPlayer)playCoinSound();
                    } else if(!ob.data._squashed){
                        // Hit from side — knockback
                        egg.vx+=(dx/(dist||1))*0.25;egg.vz+=(dz/(dist||1))*0.25;
                        egg.vy=0.12;egg.squash=0.65;
                        if(egg.isPlayer)playHitSound(egg.mesh.position.x,egg.mesh.position.z);
                    }
                }
            }
            // Respawn squashed goomba
            if(ob.data._squashed){
                ob.data._respawn--;
                if(ob.data._respawn<=0){ob.data._squashed=false;ob.mesh.scale.y=1;ob.mesh.position.y=ob.data.fy;}
            }
        }
        if(ob.type==='questionBlock'){
            // Bounce animation if triggered
            if(ob.data._bouncing){
                ob.data._bounceT++;
                ob.mesh.position.y=ob.data.baseY+Math.sin(ob.data._bounceT/8*Math.PI)*0.5;
                if(ob.data._bounceT>=8){ob.data._bouncing=false;ob.mesh.position.y=ob.data.baseY;}
            }
            // Animate dropped coin meshes (arc outward then fall)
            for(var _qci=ob.data._coinMeshes.length-1;_qci>=0;_qci--){
                var _qc=ob.data._coinMeshes[_qci];
                _qc._vy-=0.008; _qc.mesh.position.y+=_qc._vy;
                _qc.mesh.position.x+=_qc._vx; _qc.mesh.position.z+=_qc._vz;
                _qc.mesh.rotation.y+=0.1; _qc._life--;
                if(_qc._life<=0){raceGroup.remove(_qc.mesh);ob.data._coinMeshes.splice(_qci,1);}
            }
            // Hit detection from below
            if(!ob.data.used){
                for(var _qei=0;_qei<allEggs.length;_qei++){
                    var _qegg=allEggs[_qei];
                    if(!_qegg.alive||_qegg.finished||_qegg.cityNPC)continue;
                    var _qdx=_qegg.mesh.position.x-ob.data.x;
                    var _qdz=_qegg.mesh.position.z-(-ob.data.z);
                    var _qdy=_qegg.mesh.position.y-(ob.data.baseY-1.0);
                    if(DANBO_WASM.aabb2D(_qegg.mesh.position.x,_qegg.mesh.position.z,ob.data.x,-ob.data.z,1.5,1.5,0)&&DANBO_WASM.absDeltaWithin(_qegg.mesh.position.y,ob.data.baseY-1.0,1.0)&&_qegg.vy>0){
                        // Trigger: bounce block, spawn coins, mark used
                        ob.data._bouncing=true; ob.data._bounceT=0; ob.data.used=true;
                        // Change to brown (used block)
                        if(ob.mesh.children[0])ob.mesh.children[0].material=toon(0x886644);
                        if(ob.mesh.children[1])ob.mesh.children[1].visible=false; // hide ? mark
                        if(ob.mesh.children[2])ob.mesh.children[2].visible=false;
                        // Spawn 3 coin meshes
                        for(var _sci=0;_sci<3;_sci++){
                            var _scG=new THREE.Group();
                            var _scDisc=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,0.06,8),toon(0xFFDD00,{emissive:0xFFAA00,emissiveIntensity:0.5}));
                            _scDisc.rotation.x=Math.PI/2; _scG.add(_scDisc);
                            _scG.position.set(ob.mesh.position.x,ob.data.baseY+1,ob.mesh.position.z);
                            raceGroup.add(_scG);
                            var _scAngle=(_sci/3)*Math.PI*2+Math.random()*0.5;
                            ob.data._coinMeshes.push({mesh:_scG,_vx:Math.sin(_scAngle)*0.08,_vz:Math.cos(_scAngle)*0.08,_vy:0.15,_life:60});
                        }
                        // Give coins to the egg that hit
                        if(_qegg.isPlayer){raceCoinScore+=3;playCoinSound();}
                        _qegg.vy*=-0.3; // bounce off bottom
                        break;
                    }
                }
            }
        }

    }
}

// ============================================================
//  AI
// ============================================================
function updateCityNPC(egg){if(egg.heldBy)return;
    if(!egg.alive)return;
    // Electrocuted NPCs cannot act
    if(egg._electrocuted>0||egg._elecFlying>0)return;
    // Thrown or stunned NPCs cannot act
    if(egg.throwTimer>0)return;
    if(egg._hitStun>0){egg._hitStun--;egg.vx*=0.85;egg.vz*=0.85;return;} // flinch — no stars
    if(egg._stunTimer>0){egg._stunTimer--;egg.vx*=0.9;egg.vz*=0.9;return;}
    // ---- NPC coin stealing (priority behavior) ----
    if(!egg._stolenCoins)egg._stolenCoins=[];
    if(!egg._stolenCoinMeshes)egg._stolenCoinMeshes=[];
    // Actively seek nearby coins
    if(egg._stolenCoins.length<3&&!egg._coinTarget&&Math.random()<0.04){
        var bestCoin=null,bestCD=25;
        for(var bci=0;bci<cityCoins.length;bci++){
            var bc=cityCoins[bci];
            if(bc.collected||bc._stolenBy)continue;
            var bcdx=egg.mesh.position.x-bc.mesh.position.x;
            var bcdy=egg.mesh.position.y-bc.mesh.position.y;
            var bcdz=egg.mesh.position.z-bc.mesh.position.z;
            var bcd=DANBO_WASM.dist3D(egg.mesh.position.x,egg.mesh.position.y,egg.mesh.position.z,bc.mesh.position.x,bc.mesh.position.y,bc.mesh.position.z);
            if(bcd<bestCD){bestCD=bcd;bestCoin=bci;}
        }
        if(bestCoin!==null){egg._coinTarget=bestCoin;egg._coinTargetTimer=360;}
    }
    var _chasingCoin=false;
    // Move toward targeted coin (overrides normal AI)
    if(egg._coinTarget!==null&&egg._coinTarget>=0&&egg._coinTarget<cityCoins.length){
        var tc=cityCoins[egg._coinTarget];
        if(tc.collected||tc._stolenBy){egg._coinTarget=null;}
        else{
            // Abandon coin target if it's outside city bounds
            var _tcBound=CITY_SIZE-3;
            if(currentCityStyle!==5&&(Math.abs(tc.mesh.position.x)>_tcBound||Math.abs(tc.mesh.position.z)>_tcBound)){egg._coinTarget=null;}
            else{
            egg._coinTargetTimer=(egg._coinTargetTimer||0)-1;
            if(egg._coinTargetTimer<=0){egg._coinTarget=null;}
            else{
                var tcdx=tc.mesh.position.x-egg.mesh.position.x;
                var tcdy=tc.mesh.position.y-egg.mesh.position.y;
                var tcdz=tc.mesh.position.z-egg.mesh.position.z;
                var tcd=DANBO_WASM.dist3D(tc.mesh.position.x,tc.mesh.position.y,tc.mesh.position.z,egg.mesh.position.x,egg.mesh.position.y,egg.mesh.position.z);
                if(tcd>0.5){egg.vx+=(tcdx/tcd)*MOVE_ACCEL*0.7;egg.vy+=(tcdy/tcd)*MOVE_ACCEL*0.7;egg.vz+=(tcdz/tcd)*MOVE_ACCEL*0.7;}
                _chasingCoin=true;
            }
            }
        }
    }
    // Steal coins when close enough
    if(egg._stolenCoins.length<3){
        for(var sci=0;sci<cityCoins.length;sci++){
            var sc=cityCoins[sci];
            if(sc.collected||sc._stolenBy)continue;
            var sdx=egg.mesh.position.x-sc.mesh.position.x;
            var sdy=egg.mesh.position.y-sc.mesh.position.y;
            var sdz=egg.mesh.position.z-sc.mesh.position.z;
            if(DANBO_WASM.within3D(egg.mesh.position.x,egg.mesh.position.y,egg.mesh.position.z,sc.mesh.position.x,sc.mesh.position.y,sc.mesh.position.z,2.5)){
                sc._stolenBy=egg;
                sc.mesh.visible=false;
                egg._stolenCoins.push(sci);
                egg._coinTarget=null;
                // Make NPC body semi-transparent so coins are visible inside
                if(!egg._madeTransparent){
                    egg._madeTransparent=true;
                    egg.mesh.traverse(function(child){
                        if(child.isMesh&&child.material){
                            var m=child.material;
                            if(!m._origOpacity){m._origOpacity=m.opacity;m._origTransparent=m.transparent;}
                            m.transparent=true;
                            m.opacity=0.45;
                        }
                    });
                }
                // Add visible coin mesh inside NPC body
                var sCoin=new THREE.Mesh(
                    new THREE.CylinderGeometry(0.4,0.4,0.08,10),
                    new THREE.MeshBasicMaterial({color:0xFFDD00})
                );
                var sIdx=egg._stolenCoinMeshes.length;
                sCoin.rotation.x=Math.PI/2;
                sCoin.position.set(0.35*(sIdx-1),0.3+sIdx*0.4,0);
                egg.mesh.add(sCoin);
                egg._stolenCoinMeshes.push(sCoin);
                if(egg._stolenCoins.length>=3)break;
            }
        }
    }
    // Rotate stolen coin meshes for visibility
    if(egg._stolenCoinMeshes){
        for(var scr=0;scr<egg._stolenCoinMeshes.length;scr++){
            egg._stolenCoinMeshes[scr].rotation.y+=0.05;
        }
    }
    // Skip normal AI if chasing a coin
    if(_chasingCoin){
        var _coinCap=DANBO_WASM.clampVel2D(egg.vx,egg.vz,MAX_SPEED*0.6);
        if(_coinCap[3]){egg.vx=_coinCap[0];egg.vz=_coinCap[1];}
        return;
    }
    // Initialize AI state if needed
    if(!egg._aiState){
        var states=['wander','idle','chase','flee','dance','circle'];
        egg._aiState=states[Math.floor(Math.random()*3)]; // start with wander/idle/chase
        egg._aiStateTimer=60+Math.random()*120;
        egg._dancePhase=Math.random()*Math.PI*2;
        egg._circleAngle=Math.random()*Math.PI*2;
        egg._circleCenter={x:egg.mesh.position.x,z:egg.mesh.position.z};
        egg._idleAction=0;egg._idleTimer=0;
    }
    egg._aiStateTimer--;
    // Switch state randomly
    if(egg._aiStateTimer<=0){
        var r=Math.random();
        if(r<0.25) egg._aiState='wander';
        else if(r<0.38) egg._aiState='idle';
        else if(r<0.50) egg._aiState='chase';
        else if(r<0.60) egg._aiState='flee';
        else if(r<0.70) egg._aiState='dance';
        else if(r<0.78) egg._aiState='circle';
        else if(r<0.86&&currentCityStyle!==5&&_babylonTower) egg._aiState='babel';
        else if(r<0.93) egg._aiState='spinDash';
        else egg._aiState='wander';
        egg._aiStateTimer=80+Math.random()*200;
        egg._circleCenter={x:egg.mesh.position.x,z:egg.mesh.position.z};
        egg._circleAngle=Math.random()*Math.PI*2;
    }
    var st=egg._aiState;
    if(st==='wander'){
        egg.aiWanderTimer--;
        if(egg.aiWanderTimer<=0){
            egg.aiWanderTimer=60+Math.random()*120;
            if(currentCityStyle===5){
                egg.aiTargetX=(Math.random()-0.5)*MOON_CITY_SIZE*1.5;
                egg.aiTargetZ=(Math.random()-0.5)*MOON_CITY_SIZE*1.5;
            } else if(currentCityStyle===6){
                // Sakura: stay on plateaus (avoid gorge x=-8 to 8)
                var _aiOnL=egg.mesh.position.x<0;
                egg.aiTargetX=_aiOnL?(-12-Math.random()*40):(12+Math.random()*40);
                egg.aiTargetZ=(Math.random()-0.5)*180;
            } else {
                egg.aiTargetX=(Math.random()-0.5)*CITY_SIZE*0.7;
                egg.aiTargetZ=(Math.random()-0.5)*CITY_SIZE*0.7;
            }
        }
        // Clamp wander target inside city bounds
        var _npcBound=(currentCityStyle===5?MOON_CITY_SIZE:(currentCityStyle===7?CITY_SIZE*0.7:CITY_SIZE))-5;
        if(egg.aiTargetX>_npcBound)egg.aiTargetX=_npcBound;
        if(egg.aiTargetX<-_npcBound)egg.aiTargetX=-_npcBound;
        if(egg.aiTargetZ>_npcBound)egg.aiTargetZ=_npcBound;
        if(egg.aiTargetZ<-_npcBound)egg.aiTargetZ=-_npcBound;
        // Push NPC away from city edge
        var _epx=egg.mesh.position.x, _epz=egg.mesh.position.z;
        if(Math.abs(_epx)>_npcBound||Math.abs(_epz)>_npcBound){
            egg.aiTargetX=(Math.random()-0.5)*30;
            egg.aiTargetZ=(Math.random()-0.5)*30;
        }
        // Sakura City: NPC fell into gorge — jump back to plateau
        if(currentCityStyle===6&&egg.mesh.position.y<7&&egg.onGround){
            egg.vy=JUMP_FORCE*2.5;egg.squash=0.4;
            egg.aiTargetX=(egg.mesh.position.x<0)?(-20-Math.random()*20):(20+Math.random()*20);
            egg.vx+=(egg.aiTargetX-egg.mesh.position.x)*0.05;
        }
        var dx=egg.aiTargetX-egg.mesh.position.x, dz=egg.aiTargetZ-egg.mesh.position.z;
        var dist=DANBO_WASM.dist2D(egg.aiTargetX,egg.aiTargetZ,egg.mesh.position.x,egg.mesh.position.z);
        // NPC sprint burst
        var npcSprint=(egg._aiSprint||0)>0;
        var npcAccel=npcSprint?0.5:0.3;
        if(dist>1.5){egg.vx+=(dx/dist)*MOVE_ACCEL*npcAccel;egg.vz+=(dz/dist)*MOVE_ACCEL*npcAccel;}
        if(Math.random()<0.002){egg._aiSprint=60+Math.random()*90;}
        if(egg._aiSprint>0)egg._aiSprint--;
        // NPC charge jump — occasional big jump
        if(egg.onGround&&Math.random()<0.002){egg.vy=JUMP_FORCE*(1.5+Math.random()*1.5);egg.squash=0.5;}
        else if(egg.onGround&&Math.random()<0.005){egg.vy=JUMP_FORCE*0.6;egg.squash=0.7;}
    } else if(st==='idle'){
        // Stand still, occasionally look around (small random nudges) or jump
        egg.vx*=0.9;egg.vz*=0.9;
        egg._idleTimer--;
        if(egg._idleTimer<=0){
            egg._idleAction=Math.floor(Math.random()*4);
            egg._idleTimer=30+Math.random()*60;
        }
        if(egg._idleAction===1){egg.mesh.rotation.y+=0.03;} // look around
        else if(egg._idleAction===2){egg.mesh.rotation.y-=0.03;}
        else if(egg._idleAction===3&&egg.onGround&&Math.random()<0.02){egg.vy=JUMP_FORCE*0.4;egg.squash=0.8;} // small hop
    } else if(st==='chase'){
        // Chase nearest other NPC or player
        var closest=null,closeDist=20;
        for(var ci=0;ci<allEggs.length;ci++){
            var other=allEggs[ci];
            if(other===egg||!other.alive||other.heldBy)continue;
            var cdx=other.mesh.position.x-egg.mesh.position.x;
            var cdz=other.mesh.position.z-egg.mesh.position.z;
            var cd=DANBO_WASM.dist2D(other.mesh.position.x,other.mesh.position.z,egg.mesh.position.x,egg.mesh.position.z);
            // Prefer attacking NPCs over player (player distance inflated)
            if(other.isPlayer)cd*=2.5;
            if(cd<closeDist){closeDist=cd;closest=other;}
        }
        if(closest){
            var cdx2=closest.mesh.position.x-egg.mesh.position.x;
            var cdz2=closest.mesh.position.z-egg.mesh.position.z;
            var cd2=DANBO_WASM.dist2D(closest.mesh.position.x,closest.mesh.position.z,egg.mesh.position.x,egg.mesh.position.z);
            if(cd2>2){var chaseAccel=(egg._aiSprint>0)?0.65:0.4;egg.vx+=(cdx2/cd2)*MOVE_ACCEL*chaseAccel;egg.vz+=(cdz2/cd2)*MOVE_ACCEL*chaseAccel;}
            if(Math.random()<0.003){egg._aiSprint=40+Math.random()*60;}
            if(egg._aiSprint>0)egg._aiSprint--;
            if(cd2<3&&egg.onGround&&Math.random()<0.01){egg.vy=JUMP_FORCE*(0.7+Math.random()*1.5);egg.squash=0.55;}
            // NPC punch/kick: Kunio-kun style — light hitstun or knockdown
            if(cd2<2.5&&Math.random()<0.018&&!egg.holding&&(!egg._npcAtkCD||egg._npcAtkCD<=0)){
                if(!egg._npcCombo)egg._npcCombo=0;
                egg._npcCombo++;egg._npcAtkCD=10;
                var _nIsHeavy=(egg._npcCombo>=3)||(!egg.onGround);
                if(_nIsHeavy){
                    // Knockdown
                    var _nkf=0.35;
                    closest.vx+=(cdx2/cd2)*_nkf;closest.vz+=(cdz2/cd2)*_nkf;
                    closest.vy=0.2;closest.squash=0.4;
                    closest.throwTimer=COMBAT.punch.throwTimer;closest._bounces=COMBAT.punch.bounces;_addStunDamage(closest,COMBAT.punch.stunDmg);
                    egg._npcCombo=0;egg._npcAtkCD=20;
                } else {
                    // Hitstun — flinch
                    closest.vx+=(cdx2/cd2)*0.08;closest.vz+=(cdz2/cd2)*0.08;
                    closest.squash=0.75;_addStunDamage(closest,COMBAT.punch.stunDmg);
                }
                _dropNpcStolenCoins(closest);
                if(closest.isPlayer)playHitSound(egg.mesh.position.x,egg.mesh.position.z);
            }
            if(egg._npcAtkCD>0)egg._npcAtkCD--;
            if(egg._npcCombo>0&&Math.random()<0.02)egg._npcCombo=0; // combo timeout
            // ---- Character-specific NPC specials (each character only uses their own moves) ----
            var _nCT=egg.mesh.userData._charType;
            if(egg._npcHadouCD>0)egg._npcHadouCD--;
            if(egg._npcSpecialCD>0)egg._npcSpecialCD--;

            // Ryu: hadouken(fire), shoryuken, tatsumaki
            if(_nCT==='egg'){
                if(cd2>3&&cd2<25&&Math.random()<0.06&&(!egg._npcHadouCD||egg._npcHadouCD<=0)){
                    egg._npcHadouCD=50;var _nhDir=Math.atan2(cdx2,cdz2);
                    MoveProjectile_execute(egg,_nhDir,{speed:0.3,life:MOVE_PARAMS.egg.hadouken.life,color:MOVE_PARAMS.egg.hadouken.color,ringColor:MOVE_PARAMS.egg.hadouken.ringColor,burns:MOVE_PARAMS.egg.hadouken.burns,isPlayer:false,type:'normal'});
                    _shoutMove(egg,MOVE_PARAMS.egg.hadouken);
                }
                if(cd2<2.5&&egg.onGround&&Math.random()<0.024&&!egg._npcShoryuActive&&(!egg._npcSpecialCD||egg._npcSpecialCD<=0)){
                    egg._npcSpecialCD=60;egg._npcShoryuActive=true;
                    MoveUppercut_execute(egg,Math.atan2(cdx2,cdz2),{duration:MOVE_PARAMS.egg.shoryuken.duration,jumpMul:1.5,fwdSpeed:MOVE_PARAMS.egg.shoryuken.fwdSpeed});
                    _shoutMove(egg,MOVE_PARAMS.egg.shoryuken);
                    // NPC immediate hit on nearby target
                    if(cd2<3){closest.vx+=(cdx2/cd2)*0.3;closest.vz+=(cdz2/cd2)*0.3;closest.vy=COMBAT.spin.vy;closest.squash=COMBAT.spin.squash;closest.throwTimer=COMBAT.npcBodySlam.throwTimer;closest._bounces=COMBAT.spin.bounces;_addStunDamage(closest,COMBAT.shoryuken.stunDmg);_dropNpcStolenCoins(closest);if(closest.isPlayer)playHitSound(egg.mesh.position.x,egg.mesh.position.z);}
                }
                if(cd2>2&&cd2<8&&egg.onGround&&Math.random()<0.024&&!egg._npcTatsuActive&&(!egg._npcSpecialCD||egg._npcSpecialCD<=0)){
                    egg._npcSpecialCD=60;egg._npcTatsuActive=60;egg._npcTatsuDir=Math.atan2(cdx2,cdz2);egg.vy=0.08;
                    _shoutMove(egg,MOVE_PARAMS.egg.tatsumaki);
                }
            }
            // Ken: hadouken, shoryuken(fire), tatsumaki
            else if(_nCT==='dog'){
                if(cd2>3&&cd2<25&&Math.random()<0.06&&(!egg._npcHadouCD||egg._npcHadouCD<=0)){
                    egg._npcHadouCD=50;var _nkDir=Math.atan2(cdx2,cdz2);
                    MoveProjectile_execute(egg,_nkDir,{speed:MOVE_PARAMS.dog.hadouken.speed,life:MOVE_PARAMS.dog.hadouken.life,color:MOVE_PARAMS.dog.hadouken.color,ringColor:MOVE_PARAMS.dog.hadouken.ringColor,burns:MOVE_PARAMS.dog.hadouken.burns,isPlayer:false,type:'normal'});
                    _shoutMove(egg,MOVE_PARAMS.dog.hadouken);
                }
                if(cd2<2.5&&egg.onGround&&Math.random()<0.024&&!egg._npcShoryuActive&&(!egg._npcSpecialCD||egg._npcSpecialCD<=0)){
                    egg._npcSpecialCD=60;egg._npcShoryuActive=true;
                    MoveUppercut_execute(egg,Math.atan2(cdx2,cdz2),{duration:MOVE_PARAMS.dog.shoryuken.duration,jumpMul:1.7,fwdSpeed:MOVE_PARAMS.dog.shoryuken.fwdSpeed});
                    _shoutMove(egg,MOVE_PARAMS.dog.shoryuken);
                    if(cd2<3){closest.vx+=(cdx2/cd2)*0.35;closest.vz+=(cdz2/cd2)*0.35;closest.vy=COMBAT.spin.vy;closest.squash=COMBAT.spin.squash;closest.throwTimer=COMBAT.npcBodySlam.throwTimer;closest._bounces=COMBAT.spin.bounces;closest._onFire=COMBAT.projectile.fireDuration;_addStunDamage(closest,COMBAT.shoryuken.stunDmg);_dropNpcStolenCoins(closest);if(closest.isPlayer)playHitSound(egg.mesh.position.x,egg.mesh.position.z);}
                }
                if(cd2>2&&cd2<8&&egg.onGround&&Math.random()<0.024&&!egg._npcTatsuActive&&(!egg._npcSpecialCD||egg._npcSpecialCD<=0)){
                    egg._npcSpecialCD=60;egg._npcTatsuActive=60;egg._npcTatsuDir=Math.atan2(cdx2,cdz2);egg.vy=0.08;
                    _shoutMove(egg,MOVE_PARAMS.dog.tatsumaki);
                }
            }
            // Honda: hyakuretsu(always punch), headbutt
            else if(_nCT==='bull'){
                if(cd2<2.5&&Math.random()<0.06&&(!egg._npcSpecialCD||egg._npcSpecialCD<=0)){
                    egg._npcSpecialCD=30;_shoutMove(egg,MOVE_PARAMS.bull.hyakuretsu);
                    if(cd2<2.5){closest.vx+=(cdx2/(cd2||1))*COMBAT.rapidHit.force;closest.vz+=(cdz2/(cd2||1))*COMBAT.rapidHit.force;closest.vy=COMBAT.rapidHit.vy;closest.squash=COMBAT.rapidHit.squash;closest.throwTimer=COMBAT.rapidHit.throwTimer;closest._bounces=COMBAT.rapidHit.bounces;_addStunDamage(closest,COMBAT.rapidHit.stunDmg);_dropNpcStolenCoins(closest);if(closest.isPlayer)playHitSound(egg.mesh.position.x,egg.mesh.position.z);}
                }
                if(cd2>3&&cd2<10&&egg.onGround&&Math.random()<0.024&&(!egg._npcSpecialCD||egg._npcSpecialCD<=0)){
                    egg._npcSpecialCD=80;var _nhbDir=Math.atan2(cdx2,cdz2);
                    MoveDash_execute(egg,_nhbDir,{isDash:true,speed:2,duration:40});_shoutMove(egg,MOVE_PARAMS.bull.headbutt);
                    egg.mesh.rotation.y=_nhbDir;
                }
            }
            // Blanka: electric, rolling attack
            else if(_nCT==='cat'){
                if(cd2<2.5&&Math.random()<0.03&&(!egg._npcSpecialCD||egg._npcSpecialCD<=0)){
                    egg._npcSpecialCD=60;
                    MoveElectric_execute(egg,{duration:30});_shoutMove(egg,MOVE_PARAMS.cat.electric);
                    if(cd2<2){closest._electrocuted=COMBAT.electric.electrocuteDuration;closest._elecKnockDir={x:-cdx2/(cd2||1),z:-cdz2/(cd2||1)};closest.vx=0;closest.vz=0;if(closest.isPlayer)playHitSound(egg.mesh.position.x,egg.mesh.position.z);}
                }
                if(cd2>4&&cd2<12&&egg.onGround&&Math.random()<0.018&&(!egg._npcSpecialCD||egg._npcSpecialCD<=0)){
                    egg._npcSpecialCD=70;var _nbrDir=Math.atan2(cdx2,cdz2);
                    MoveDash_execute(egg,_nbrDir,{isRoll:true,speed:3,duration:40});_shoutMove(egg,MOVE_PARAMS.cat.roll);
                    egg.vx=egg._blankaSpinDirX;egg.vz=egg._blankaSpinDirZ;
                    egg.mesh.rotation.y=_nbrDir;
                }
            }
            // Guile: sonic boom, somersault kick
            else if(_nCT==='rooster'){
                if(cd2>4&&cd2<20&&Math.random()<0.045&&(!egg._npcHadouCD||egg._npcHadouCD<=0)){
                    egg._npcHadouCD=60;var _nsbDir=Math.atan2(cdx2,cdz2);
                    MoveProjectile_execute(egg,_nsbDir,{speed:MOVE_PARAMS.rooster.sonicBoom.speed,life:MOVE_PARAMS.rooster.sonicBoom.life,color:MOVE_PARAMS.rooster.sonicBoom.color,ringColor:MOVE_PARAMS.rooster.sonicBoom.ringColor,isPlayer:false,type:'normal'});
                    _shoutMove(egg,MOVE_PARAMS.rooster.sonicBoom);
                }
                if(cd2<3&&egg.onGround&&Math.random()<0.024&&!egg._npcShoryuActive&&(!egg._npcSpecialCD||egg._npcSpecialCD<=0)){
                    egg._npcSpecialCD=60;egg._npcShoryuActive=true;egg.vy=JUMP_FORCE*1.6;egg.squash=0.5;_shoutMove(egg,MOVE_PARAMS.rooster.somersault);
                    if(cd2<3){closest.vx+=(cdx2/cd2)*0.4;closest.vz+=(cdz2/cd2)*0.4;closest.vy=0.3;closest.squash=COMBAT.punch.squash;closest.throwTimer=35;closest._bounces=COMBAT.punch.bounces;_addStunDamage(closest,COMBAT.somersault.stunDmg);_dropNpcStolenCoins(closest);if(closest.isPlayer)playHitSound(egg.mesh.position.x,egg.mesh.position.z);}
                }
            }
            // Chun-Li: kikouken, hyakuretsu kick(close), spinning bird kick
            else if(_nCT==='monkey'){
                if(cd2>3&&cd2<20&&Math.random()<0.045&&(!egg._npcHadouCD||egg._npcHadouCD<=0)){
                    egg._npcHadouCD=50;var _ncDir=Math.atan2(cdx2,cdz2);
                    MoveProjectile_execute(egg,_ncDir,{speed:MOVE_PARAMS.monkey.kikouken.speed,life:MOVE_PARAMS.monkey.kikouken.life,color:MOVE_PARAMS.monkey.kikouken.color,ringColor:MOVE_PARAMS.monkey.kikouken.ringColor,isPlayer:false,type:'normal',npcRadius:0.5});
                    _shoutMove(egg,MOVE_PARAMS.monkey.kikouken);
                }
                if(cd2<2.5&&Math.random()<0.045&&(!egg._npcSpecialCD||egg._npcSpecialCD<=0)){
                    egg._npcSpecialCD=30;_shoutMove(egg,MOVE_PARAMS.monkey.hyakuretsuKick);
                    if(cd2<2.5){closest.vx+=(cdx2/(cd2||1))*COMBAT.rapidHit.force;closest.vz+=(cdz2/(cd2||1))*COMBAT.rapidHit.force;closest.vy=COMBAT.rapidHit.vy;closest.squash=COMBAT.rapidHit.squash;closest.throwTimer=COMBAT.rapidHit.throwTimer;closest._bounces=COMBAT.rapidHit.bounces;_addStunDamage(closest,COMBAT.rapidHit.stunDmg);_dropNpcStolenCoins(closest);if(closest.isPlayer)playHitSound(egg.mesh.position.x,egg.mesh.position.z);}
                }
                if(cd2>2&&cd2<8&&egg.onGround&&Math.random()<0.018&&!egg._npcTatsuActive&&(!egg._npcSpecialCD||egg._npcSpecialCD<=0)){
                    egg._npcSpecialCD=60;egg._npcTatsuActive=60;egg._npcTatsuDir=Math.atan2(cdx2,cdz2);egg.vy=JUMP_FORCE*1.2;
                    _shoutMove(egg,MOVE_PARAMS.monkey.spinningBird);
                }
            }
            // Zangief: double lariat(close), piledriver(very close)
            else if(_nCT==='bear'){
                if(cd2<4&&Math.random()<0.024&&!egg._npcTatsuActive&&(!egg._npcSpecialCD||egg._npcSpecialCD<=0)){
                    egg._npcSpecialCD=60;egg._npcTatsuActive=60;egg._npcTatsuDir=Math.atan2(cdx2,cdz2);egg.vy=0;
                    _shoutMove(egg,MOVE_PARAMS.bear.lariat);
                }
                // NPC piledriver (very close — higher chance)
                if(cd2<2.5&&egg.onGround&&!egg.holding&&Math.random()<0.06&&!closest.heldBy&&!closest._piledriverLocked&&(!egg._npcSpecialCD||egg._npcSpecialCD<=0)){
                    _shoutMove(egg,MOVE_PARAMS.bear.piledriver);
                    egg._npcSpecialCD=80;
                    egg._npcPiledriver=closest;closest._piledriverLocked=true;
                    egg._npcPdPhase=0;egg._npcPdStartX=egg.mesh.position.x;egg._npcPdStartZ=egg.mesh.position.z;
                    egg.grabCD=40;
                }
            }
            // Dhalsim: yoga fire(burns), yoga flame(close)
            else if(_nCT==='cockroach'){
                if(cd2>3&&cd2<25&&Math.random()<0.06&&(!egg._npcHadouCD||egg._npcHadouCD<=0)){
                    egg._npcHadouCD=50;var _ndDir=Math.atan2(cdx2,cdz2);
                    MoveProjectile_execute(egg,_ndDir,{speed:MOVE_PARAMS.cockroach.yogaFire.speed,life:MOVE_PARAMS.cockroach.yogaFire.life,color:MOVE_PARAMS.cockroach.yogaFire.color,ringColor:MOVE_PARAMS.cockroach.yogaFire.ringColor,burns:MOVE_PARAMS.cockroach.yogaFire.burns,isPlayer:false,type:'normal'});
                    _shoutMove(egg,MOVE_PARAMS.cockroach.yogaFire);
                }
                if(cd2<5&&Math.random()<0.018&&(!egg._npcSpecialCD||egg._npcSpecialCD<=0)){
                    egg._npcSpecialCD=70;_shoutMove(egg,MOVE_PARAMS.cockroach.yogaFlame);
                    if(cd2<4){MoveYogaFlame_execute(egg,Math.atan2(cdx2,cdz2),MOVE_PARAMS.cockroach.yogaFlame);closest._onFire=COMBAT.yogaFlame.fireDuration;closest._fireStun=COMBAT.yogaFlame.fireStun;closest._fireStunDir=Math.atan2(cdx2,cdz2);closest.vx=0;closest.vz=0;_addStunDamage(closest,COMBAT.yogaFlame.stunDmg);if(closest.isPlayer)playHitSound(egg.mesh.position.x,egg.mesh.position.z);}
                }
            }
            // NPC piledriver: Zangief only (already handled above)
            // NPC body slam: if holding someone and in air
            if(egg.holding&&!egg.onGround&&egg.vy<0&&Math.random()<0.02){
                var _nbst=egg.holding;
                _nbst.heldBy=null;egg.holding=null;
                if(_nbst.struggleBar){_nbst.mesh.remove(_nbst.struggleBar);_nbst.struggleBar=null;}
                egg.vy=-0.4;egg._npcBodySlam=_nbst;
                _nbst.mesh.position.set(egg.mesh.position.x,egg.mesh.position.y-1.5,egg.mesh.position.z);
                _nbst.vy=-0.4;
            }
        }
    } else if(st==='flee'){
        // Run away from nearest egg
        var nearest2=null,nearDist2=15;
        for(var fi=0;fi<allEggs.length;fi++){
            var fo=allEggs[fi];
            if(fo===egg||!fo.alive)continue;
            var fdx=fo.mesh.position.x-egg.mesh.position.x;
            var fdz=fo.mesh.position.z-egg.mesh.position.z;
            var fd=DANBO_WASM.len2D(fdx,fdz);
            if(fd<nearDist2){nearDist2=fd;nearest2=fo;}
        }
        if(nearest2&&nearDist2<12){
            var fdx2=egg.mesh.position.x-nearest2.mesh.position.x;
            var fdz2=egg.mesh.position.z-nearest2.mesh.position.z;
            var fd2=DANBO_WASM.len2D(fdx2,fdz2)||1;
            egg.vx+=(fdx2/fd2)*MOVE_ACCEL*0.45;egg.vz+=(fdz2/fd2)*MOVE_ACCEL*0.45;
        }
        if(Math.random()<0.004){egg._aiSprint=50+Math.random()*70;}
        if(egg._aiSprint>0)egg._aiSprint--;
        if(egg.onGround&&Math.random()<0.006){egg.vy=JUMP_FORCE*(0.8+Math.random()*1.2);egg.squash=0.55;}
    } else if(st==='dance'){
        // Bounce in place with spinning
        egg.vx*=0.85;egg.vz*=0.85;
        egg._dancePhase+=0.12;
        egg.mesh.rotation.y+=0.08;
        if(egg.onGround&&Math.sin(egg._dancePhase)>0.7){egg.vy=JUMP_FORCE*(0.45+Math.random()*1.0);egg.squash=0.65;}
    } else if(st==='circle'){
        // Walk in circles
        egg._circleAngle+=0.02+Math.random()*0.005;
        var cr=4+Math.random()*2;
        var tx=egg._circleCenter.x+Math.cos(egg._circleAngle)*cr;
        var tz=egg._circleCenter.z+Math.sin(egg._circleAngle)*cr;
        var cdx3=tx-egg.mesh.position.x, cdz3=tz-egg.mesh.position.z;
        var cd3=DANBO_WASM.len2D(cdx3,cdz3);
        if(cd3>0.5){egg.vx+=(cdx3/cd3)*MOVE_ACCEL*0.35;egg.vz+=(cdz3/cd3)*MOVE_ACCEL*0.35;}
        if(egg.onGround&&Math.random()<0.004){egg.vy=JUMP_FORCE*(0.5+Math.random()*1.5);egg.squash=0.6;}
    } else if(st==='babel'){
        // Walk toward Babel tower and use elevator
        if(_babylonTower){
            var bt=_babylonTower;
            var bdx=bt.x-egg.mesh.position.x, bdz=bt.z-egg.mesh.position.z;
            var bd=DANBO_WASM.dist2D(bt.x,bt.z,egg.mesh.position.x,egg.mesh.position.z);
            if(bd>4){
                egg.vx+=(bdx/bd)*MOVE_ACCEL*0.5;egg.vz+=(bdz/bd)*MOVE_ACCEL*0.5;
            } else {
                // Near tower — teleport to cloud world or back
                if(egg.mesh.position.y<5&&Math.random()<0.01){
                    // Go up to cloud level
                    egg.mesh.position.y=bt.topY||45;
                    egg.vy=0.1;
                    egg._aiStateTimer=10; // quickly switch to wander in clouds
                } else if(egg.mesh.position.y>30&&Math.random()<0.01){
                    // Come back down
                    egg.mesh.position.y=1;egg.vy=0;
                    egg._aiStateTimer=10;
                }
            }
        }
    } else if(st==='spinDash'){
        // NPC spin dash — charge and dash forward
        if(!egg._npcSpinTimer)egg._npcSpinTimer=0;
        egg._npcSpinTimer++;
        if(egg._npcSpinTimer<30){
            // Charging — crouch in place
            egg.vx*=0.85;egg.vz*=0.85;
            egg.squash=0.7+0.3*(1-egg._npcSpinTimer/30);
            egg.mesh.rotation.y+=0.3;
        } else if(egg._npcSpinTimer<90){
            // Dashing
            if(egg._npcSpinTimer===30){
                var dashDir=egg.mesh.rotation.y;
                egg._npcDashVx=Math.sin(dashDir)*MAX_SPEED*3;
                egg._npcDashVz=Math.cos(dashDir)*MAX_SPEED*3;
            }
            egg.vx=egg._npcDashVx||0;egg.vz=egg._npcDashVz||0;
            egg.mesh.rotation.y+=0.5;
            egg.squash=0.6;
            // Keep on ground
            if(egg.mesh.position.y<0.6)egg.mesh.position.y=0.6;
            if(egg.onGround)egg.vy=0;
            // Hit nearby eggs
            for(var sdi=0;sdi<allEggs.length;sdi++){
                var sde2=allEggs[sdi];
                if(sde2===egg||!sde2.alive||sde2.heldBy)continue;
                var sddx2=sde2.mesh.position.x-egg.mesh.position.x;
                var sddz2=sde2.mesh.position.z-egg.mesh.position.z;
                var sddy2=sde2.mesh.position.y-egg.mesh.position.y;
                if(Math.abs(sddy2)>1.5)continue;
                var sdd2=DANBO_WASM.len2D(sddx2,sddz2);
                if(sdd2<2.5&&sdd2>0.01){
                    sde2.vx+=sddx2/sdd2*0.4;sde2.vy+=0.2;sde2.vz+=sddz2/sdd2*0.4;
                    sde2.throwTimer=COMBAT.propImpact.throwTimer;sde2._bounces=COMBAT.propImpact.bounces;sde2.squash=0.5;
                    sde2._stunTimer=Math.floor(30+Math.random()*40);
                    if(sde2.isPlayer)playHitSound(egg.mesh.position.x,egg.mesh.position.z);
                    _dropNpcStolenCoins(sde2);
                }
            }
        } else {
            egg._npcSpinTimer=0;egg._aiStateTimer=10;
        }
    }
    var npcSpd=(egg._aiSprint>0)?1.2:1;
    var maxSpd=st==='flee'?MAX_SPEED*0.7*npcSpd:st==='chase'?MAX_SPEED*0.6*npcSpd:MAX_SPEED*0.45*npcSpd;
    var _npcCap=DANBO_WASM.clampVel2D(egg.vx,egg.vz,maxSpd);
    if(_npcCap[3]){egg.vx=_npcCap[0];egg.vz=_npcCap[1];}
    // ---- NPC Piledriver animation (capped height) ----
    if(egg._npcPiledriver){
        var _npdt=egg._npcPiledriver;
        egg._npcPdPhase++;
        var _npcPdMaxY=15; // cap at 15 units high
        if(egg._npcPdPhase<40&&egg.mesh.position.y<_npcPdMaxY){
            egg.vy=0.18;egg.vx=0;egg.vz=0;
            egg.mesh.rotation.y+=0.5;
            _npdt.mesh.position.set(egg.mesh.position.x,egg.mesh.position.y+1.5,egg.mesh.position.z);
            _npdt.vx=0;_npdt.vy=0;_npdt.vz=0;
        } else if(egg._npcPdPhase<45||(egg._npcPdPhase>=40&&egg.mesh.position.y>=_npcPdMaxY&&egg._npcPdPhase<45)){
            // Pause at apex
            egg.vy=0;egg.vx=0;egg.vz=0;egg.mesh.rotation.y+=0.6;
            _npdt.mesh.position.set(egg.mesh.position.x,egg.mesh.position.y+1.5,egg.mesh.position.z);
            if(egg._npcPdPhase<45)egg._npcPdPhase=45; // force to slam phase
        } else if(egg._npcPdPhase>=45&&!(egg.onGround||egg.mesh.position.y<0.5)){
            // Slam down
            egg.vy=-0.5;egg.vx=0;egg.vz=0;egg.mesh.rotation.y+=0.7;
            _npdt.mesh.position.set(egg.mesh.position.x,egg.mesh.position.y+1.5,egg.mesh.position.z);
        } else if(egg.onGround||egg.mesh.position.y<0.5){
            _npdt.heldBy=null;egg.holding=null;
            if(_npdt.struggleBar){_npdt.mesh.remove(_npdt.struggleBar);_npdt.struggleBar=null;}
            _npdt.squash=0.1;
            var _npdDir=Math.random()*Math.PI*2;
            _npdt.vx=Math.sin(_npdDir)*0.4;_npdt.vy=0.25;_npdt.vz=Math.cos(_npdDir)*0.4;
            _npdt.throwTimer=COMBAT.npcPiledriver.throwTimer;_npdt._bounces=COMBAT.npcPiledriver.bounces;_addStunDamage(_npdt,COMBAT.npcPiledriver.stunDmg);
            _dropNpcStolenCoins(_npdt);
            if(_npdt.isPlayer)playHitSound(egg.mesh.position.x,egg.mesh.position.z);
            egg.vy=0.15;egg.grabCD=40;egg._npcPiledriver=null;egg._npcPdPhase=0;
        }
    }
    // ---- NPC Body Slam landing ----
    if(egg._npcBodySlam&&egg.onGround){
        var _nbst2=egg._npcBodySlam;
        if(_nbst2&&_nbst2.alive){
            _nbst2.mesh.position.set(egg.mesh.position.x,0.2,egg.mesh.position.z);
            _nbst2.squash=0.2;
            var _nbDir=Math.random()*Math.PI*2;
            _nbst2.vx=Math.sin(_nbDir)*0.4;_nbst2.vy=0.3;_nbst2.vz=Math.cos(_nbDir)*0.4;
            _nbst2.throwTimer=COMBAT.npcBodySlam.throwTimer;_nbst2._bounces=COMBAT.npcBodySlam.bounces;_nbst2._stunTimer=COMBAT.npcBodySlam.stunTimer;
            _dropNpcStolenCoins(_nbst2);
            if(_nbst2.isPlayer)playHitSound(egg.mesh.position.x,egg.mesh.position.z);
            egg.vy=0.2;egg.squash=0.5;
        }
        egg._npcBodySlam=null;
    }
    // ---- NPC Shoryuken animation ----
    if(egg._npcShoryuActive){
        egg.mesh.rotation.y+=0.15;
        if(egg.vy<=0){egg._npcShoryuActive=false;}
    }
    // ---- NPC Tatsumaki animation ----
    if(egg._npcTatsuActive>0){
        egg._npcTatsuActive--;
        egg.mesh.rotation.y+=0.8;
        egg.vx=Math.sin(egg._npcTatsuDir)*MAX_SPEED*1.2;
        egg.vz=Math.cos(egg._npcTatsuDir)*MAX_SPEED*1.2;
        if(egg.mesh.position.y<0.5)egg.mesh.position.y=0.5;
        // Hit nearby eggs
        for(var _nti=0;_nti<allEggs.length;_nti++){
            var _nte=allEggs[_nti];if(_nte===egg||!_nte.alive||_nte.heldBy)continue;
            if(!_nte._npcTatsuHitCD)_nte._npcTatsuHitCD=0;
            if(_nte._npcTatsuHitCD>0){_nte._npcTatsuHitCD--;continue;}
            var _ntdx=_nte.mesh.position.x-egg.mesh.position.x;
            var _ntdz=_nte.mesh.position.z-egg.mesh.position.z;
            if(DANBO_WASM.within2D(_nte.mesh.position.x,_nte.mesh.position.z,egg.mesh.position.x,egg.mesh.position.z,2.5)){
                _nte.vx+=_ntdx*0.15;_nte.vz+=_ntdz*0.15;_nte.vy=0.1;
                _nte.squash=0.6;_nte._hitStun=8;_nte._npcTatsuHitCD=10;
                _dropNpcStolenCoins(_nte);if(_nte.isPlayer)playHitSound(egg.mesh.position.x,egg.mesh.position.z);
            }
        }
        if(egg._npcTatsuActive<=0){egg.vx*=0.3;egg.vz*=0.3;}
    }
}

// ---- Drop stolen coins from NPC ----
function _dropNpcStolenCoins(egg){
    if(!egg._stolenCoins||egg._stolenCoins.length===0)return;
    // Play scatter sound
    if(sfxEnabled){
        var ctx=ensureAudio();
        [600,900,1100,700].forEach(function(f,i){
            var osc=ctx.createOscillator();var g=ctx.createGain();
            osc.type='sine';osc.frequency.value=f;
            g.gain.setValueAtTime(0.1,ctx.currentTime+i*0.06);
            g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+i*0.06+0.1);
            osc.connect(g);g.connect(ctx.destination);
            osc.start(ctx.currentTime+i*0.06);osc.stop(ctx.currentTime+i*0.06+0.1);
        });
    }
    for(var di=0;di<egg._stolenCoins.length;di++){
        var coinIdx=egg._stolenCoins[di];
        if(coinIdx>=0&&coinIdx<cityCoins.length){
            var dc=cityCoins[coinIdx];
            dc._stolenBy=null;
            dc.collected=false;
            dc.mesh.visible=true;
            // Sonic-style scatter: coins fly outward in arcs
            var angle=di*(Math.PI*2/egg._stolenCoins.length)+Math.random()*0.5;
            var scatterSpeed=0.18+Math.random()*0.12;
            var svx=Math.cos(angle)*scatterSpeed;
            var svz=Math.sin(angle)*scatterSpeed;
            var svy=0.25+Math.random()*0.15;
            dc.mesh.position.set(egg.mesh.position.x,egg.mesh.position.y+1.5,egg.mesh.position.z);
            dc._scatterVX=svx;dc._scatterVY=svy;dc._scatterVZ=svz;dc._scatterTimer=80;
            dc.baseY=undefined; // will be set when scatter ends
        }
    }
    // Remove visual coin meshes from NPC
    if(egg._stolenCoinMeshes){
        for(var ri=0;ri<egg._stolenCoinMeshes.length;ri++){
            egg.mesh.remove(egg._stolenCoinMeshes[ri]);
        }
    }
    egg._stolenCoins=[];
    egg._stolenCoinMeshes=[];
    // Restore NPC body opacity
    if(egg._madeTransparent){
        egg._madeTransparent=false;
        egg.mesh.traverse(function(child){
            if(child.isMesh&&child.material&&child.material._origOpacity!==undefined){
                child.material.opacity=child.material._origOpacity;
                child.material.transparent=child.material._origTransparent;
            }
        });
    }
}

function updateRaceAI(egg){
    if(!egg.alive||egg.finished||egg.isPlayer||egg.cityNPC)return;
    if(egg.throwTimer>0)return;
    if(egg._stunTimer>0){egg._stunTimer--;egg.vx*=0.9;egg.vz*=0.9;return;}
    // Initialize race personality if needed
    if(!egg._raceStyle){
        var r=Math.random();
        if(r<0.25) egg._raceStyle='rusher';      // fast, straight line
        else if(r<0.5) egg._raceStyle='zigzag';   // weaves side to side
        else if(r<0.75) egg._raceStyle='cautious'; // slower, avoids obstacles better
        else egg._raceStyle='jumper';              // jumps a lot
        egg._zigPhase=Math.random()*Math.PI*2;
        egg._speedMult=0.7+Math.random()*0.6;     // 0.7-1.3x speed variation
        egg._sideRange=3+Math.random()*5;          // how wide they weave
        egg._reactSpeed=0.3+Math.random()*0.7;     // how fast they react to obstacles
    }
    egg.aiReactTimer--;
    var style=egg._raceStyle;
    // Forward movement — varied speed per personality
    var fwdAccel=MOVE_ACCEL*egg._speedMult;
    if(style==='rusher') fwdAccel*=(0.7+egg.aiSkill*0.5);
    else if(style==='cautious') fwdAccel*=(0.45+egg.aiSkill*0.4);
    else fwdAccel*=(0.55+egg.aiSkill*0.45);
    egg.vz-=fwdAccel;
    // Lateral movement — personality-based
    if(style==='zigzag'){
        egg._zigPhase+=0.04+egg.aiSkill*0.02;
        egg.aiTargetX=Math.sin(egg._zigPhase)*egg._sideRange;
    } else if(style==='rusher'){
        if(egg.aiReactTimer<=0){egg.aiReactTimer=15+Math.random()*25;egg.aiTargetX=(Math.random()-0.5)*4;}
    } else if(style==='cautious'){
        if(egg.aiReactTimer<=0){egg.aiReactTimer=5+Math.random()*10;egg.aiTargetX=(Math.random()-0.5)*egg._sideRange;}
    } else {
        if(egg.aiReactTimer<=0){egg.aiReactTimer=10+Math.random()*20;egg.aiTargetX=(Math.random()-0.5)*6;}
    }
    var dx=egg.aiTargetX-egg.mesh.position.x;
    egg.vx+=Math.sign(dx)*MOVE_ACCEL*(0.4+egg._reactSpeed*0.4);
    // Jumper personality — frequent random jumps
    if(style==='jumper'&&egg.onGround&&Math.random()<0.025){egg.vy=JUMP_FORCE*(0.6+egg.aiSkill*0.3);egg.squash=0.65;egg.aiJumpCD=15;}
    // Obstacle avoidance
    var ez=-egg.mesh.position.z;
    for(var oi=0;oi<_danboRaceObstacles().length;oi++){
        var ob=_danboRaceObstacles()[oi];
        var dz=Math.abs(ez-(ob.data.z||0));
        if(dz>8)continue;
        var avoidStr=egg._reactSpeed*egg.aiSkill;
        if(ob.type==='spinner'&&dz<6){
            var tipX=Math.sin(ob.data.angle)*ob.data.armLen;
            if(DANBO_WASM.absDeltaLess(egg.mesh.position.x,tipX,2.5))egg.vx+=(egg.mesh.position.x>tipX?1:-1)*MOVE_ACCEL*avoidStr*1.5;
        }
        if(ob.type==='bumper'&&dz<4&&DANBO_WASM.absDeltaLess(egg.mesh.position.x,ob.data.x,2))
            egg.vx+=(egg.mesh.position.x>ob.data.x?1:-1)*MOVE_ACCEL*avoidStr;
        if(ob.type==='roller'&&dz<3){
            if(egg.aiJumpCD<=0&&egg.onGround&&Math.random()<avoidStr*0.5){egg.vy=JUMP_FORCE*(0.7+egg.aiSkill*0.3);egg.aiJumpCD=20+Math.random()*15;}
        }
        if(ob.type==='pendulum'&&dz<5){
            var ballX=Math.sin(ob.data.angle*1.4)*ob.data.chainLen;
            if(DANBO_WASM.absDeltaLess(egg.mesh.position.x,ballX,2))egg.vx+=(egg.mesh.position.x>ballX?1:-1)*MOVE_ACCEL*avoidStr;
        }
        if(ob.type==='platform'&&dz<4)egg.vx+=(ob.mesh.position.x-egg.mesh.position.x)*0.02*avoidStr;
        if(ob.type==='conveyor'&&dz<ob.data.halfLen)egg.vx-=ob.data.pushX*0.3*avoidStr;
        if(ob.type==='fallingBlock'&&dz<3&&ob.data.timer<ob.data.warningTime&&DANBO_WASM.absDeltaLess(egg.mesh.position.x,ob.data.x,ob.data.size))
            egg.vx+=(egg.mesh.position.x>ob.data.x?1:-1)*MOVE_ACCEL*avoidStr*1.5;
        if(ob.type==='spring'&&dz<2&&DANBO_WASM.absDeltaLess(egg.mesh.position.x,(ob.data.x||0),1.5)&&egg.onGround){
            egg.vy=ob.data.jumpForce*0.9;
        }
        if(ob.type==='pipe'&&dz<4&&DANBO_WASM.absDeltaLess(egg.mesh.position.x,(ob.data.x||0),2))
            egg.vx+=(egg.mesh.position.x>(ob.data.x||0)?1:-1)*MOVE_ACCEL*avoidStr*1.5;
        if(ob.type==='goomba'&&dz<3&&!ob.data._squashed){
            var gdx=egg.mesh.position.x-(ob.data.x||0);
            if(DANBO_WASM.absDeltaLess(gdx,0,2)){
                if(egg.onGround&&Math.random()<avoidStr*0.2){egg.vy=JUMP_FORCE*0.9;egg.aiJumpCD=25;}
                else egg.vx+=(gdx>0?1:-1)*MOVE_ACCEL*0.8;
            }
        }
    }
    egg.aiJumpCD--;
    if(egg.aiJumpCD<=0&&egg.onGround&&Math.random()<0.006*egg.aiSkill){egg.vy=JUMP_FORCE*0.85;egg.aiJumpCD=30+Math.random()*20;}
    var maxSpd=MAX_SPEED*(style==='rusher'?1.05:style==='cautious'?0.85:0.95);
    var _raceCap=DANBO_WASM.clampVel2D(egg.vx,egg.vz,maxSpd);
    if(_raceCap[3]){egg.vx=_raceCap[0];egg.vz=_raceCap[1];}
}
