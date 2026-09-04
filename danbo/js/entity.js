// entity.js — DANBO World
// ============================================================
//  EGG MESH & ENTITY
// ============================================================
function _charMixHex(a,b,t){
    if(typeof _mixHex==='function')return _mixHex(a,b,t);
    t=Math.max(0,Math.min(1,t));
    var ar=(a>>16)&255,ag=(a>>8)&255,ab=a&255;
    var br=(b>>16)&255,bg=(b>>8)&255,bb=b&255;
    var r=Math.round(ar+(br-ar)*t),g=Math.round(ag+(bg-ag)*t),bl=Math.round(ab+(bb-ab)*t);
    return (r<<16)|(g<<8)|bl;
}

function _addCharacterPolish(g,body,color,accent,charType){
    accent=(accent===undefined||accent===null)?0xFFCC00:accent;
    var type=charType||'egg';
    var faceZ=(type==='bear')?0.86:((type==='bull'||type==='cat')?0.68:(type==='cockroach'?0.42:0.60));
    var beltR=(type==='bear')?0.70:((type==='bull'||type==='cat')?0.54:(type==='cockroach'?0.28:0.42));
    // Thin black back-face outline: makes each character read like a richer toy figure.
    var outline=new THREE.Mesh(body.geometry.clone(),new THREE.MeshBasicMaterial({
        color:0x121212,side:THREE.BackSide,transparent:true,opacity:0.18,depthWrite:false
    }));
    outline.position.copy(body.position);
    outline.scale.copy(body.scale).multiplyScalar(1.055);
    outline.renderOrder=-2;
    g.add(outline);
    g.userData._toonOutline=outline;

    // Glossy toy/plastic highlight: tiny additive decals sell the premium vinyl figure look.
    var glossMat=new THREE.MeshBasicMaterial({
        color:0xFFFFFF,transparent:true,opacity:0.24,depthWrite:false,depthTest:true,
        blending:THREE.AdditiveBlending,side:THREE.DoubleSide,fog:false
    });
    var bigGloss=new THREE.Mesh(new THREE.CircleGeometry(0.17,18),glossMat);
    bigGloss.position.set(-0.20,1.02,faceZ+0.055);
    bigGloss.scale.set(1.0,0.48,1);
    bigGloss.rotation.z=-0.25;
    body.add(bigGloss);
    var smallGloss=new THREE.Mesh(new THREE.CircleGeometry(0.055,14),glossMat.clone());
    smallGloss.material.opacity=0.18;
    smallGloss.position.set(0.22,0.98,faceZ+0.065);
    smallGloss.scale.set(1.0,0.62,1);
    body.add(smallGloss);

    // More expressive eyes: colored iris, tiny pupil, extra highlight, and eyebrows.
    var irisColor=_charMixHex(accent,0xFFFFFF,0.25);
    var irisG=new THREE.SphereGeometry(0.078,10,8);
    var tinyPupilG=new THREE.SphereGeometry(0.038,8,6);
    var tinyShineG=new THREE.SphereGeometry(0.018,6,4);
    var irisMat=toon(irisColor,{emissive:irisColor,emissiveIntensity:0.10});
    var browMat=toon(type==='egg'?0x222222:_charMixHex(color,0x111111,0.55));
    var detailEyes=[];
    [-1,1].forEach(function(s){
        var iris=new THREE.Mesh(irisG,irisMat);
        iris.position.set(s*0.24,0.865,faceZ);
        iris.scale.set(0.95,1.05,0.35);body.add(iris);detailEyes.push(iris);
        var pp=new THREE.Mesh(tinyPupilG,toon(0x111111));
        pp.position.set(s*0.24,0.858,faceZ+0.035);
        pp.scale.set(0.82,1.05,0.45);body.add(pp);detailEyes.push(pp);
        var sh=new THREE.Mesh(tinyShineG,toon(0xFFFFFF,{emissive:0xFFFFFF,emissiveIntensity:0.2}));
        sh.position.set(s*0.20,0.905,faceZ+0.07);body.add(sh);detailEyes.push(sh);
        var brow=new THREE.Mesh(new THREE.BoxGeometry(0.20,0.035,0.035),browMat);
        brow.position.set(s*0.24,1.075,faceZ-0.015);
        brow.rotation.z=-s*0.18;
        body.add(brow);
    });
    g.userData._irisDetails=detailEyes;

    // Costume silhouette: belt/collar/sash details are cheap meshes but visible close-up.
    var beltMat=toon(type==='egg'||type==='dog'?0x1F1F1F:_charMixHex(accent,0x111111,0.28));
    var belt=new THREE.Mesh(new THREE.TorusGeometry(beltR,0.026,6,28),beltMat);
    belt.position.set(0,0.22,0.02);belt.rotation.x=Math.PI/2;
    belt.scale.z=0.72;body.add(belt);
    var buckle=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.10,0.035),toon(_charMixHex(accent,0xFFFFFF,0.18),{emissive:accent,emissiveIntensity:0.10}));
    buckle.position.set(0,0.22,faceZ+0.005);body.add(buckle);
    [-1,1].forEach(function(s){
        var sash=new THREE.Mesh(new THREE.BoxGeometry(0.075,0.48,0.034),toon(_charMixHex(accent,0xFFFFFF,0.10)));
        sash.position.set(s*0.115,0.50,faceZ);
        sash.rotation.z=s*0.34;
        body.add(sash);
    });
    // Visible gloves / cuffs near the stub arms.
    [-1,1].forEach(function(s){
        var cuff=new THREE.Mesh(new THREE.SphereGeometry(0.085,8,6),toon(_charMixHex(accent,0xFFFFFF,0.20)));
        cuff.position.set(s*0.57,0.55,0.18);
        cuff.scale.set(1.15,0.75,0.85);
        body.add(cuff);
    });

    // Type-specific costume accents, so silhouettes are different even from a distance.
    if(type==='egg'){
        var giMat=toon(0xEDEDE6);
        [-1,1].forEach(function(s){
            var fold=new THREE.Mesh(new THREE.BoxGeometry(0.035,0.55,0.032),giMat);
            fold.position.set(s*0.10,0.52,faceZ+0.01);fold.rotation.z=-s*0.28;body.add(fold);
        });
        var knot=new THREE.Mesh(new THREE.SphereGeometry(0.055,6,4),toon(0xCC2222,{emissive:0xCC2222,emissiveIntensity:0.15}));
        knot.position.set(0.18,1.03,-0.35);body.add(knot);
    } else if(type==='dog'){
        var flameMat=toon(0xFFDD44,{emissive:0xFFAA00,emissiveIntensity:0.18});
        [-1,1].forEach(function(s){
            var flame=new THREE.Mesh(new THREE.ConeGeometry(0.045,0.22,4),flameMat);
            flame.position.set(s*0.20,0.46,faceZ+0.02);
            flame.rotation.z=s*0.28;body.add(flame);
        });
    } else if(type==='bull'){
        var ropeMat=toon(0xF2E0A8);
        var rope=new THREE.Mesh(new THREE.TorusGeometry(0.50,0.024,6,24),ropeMat);
        rope.position.set(0,0.48,0.04);rope.rotation.x=Math.PI/2;rope.scale.z=0.75;body.add(rope);
        for(var ri=0;ri<7;ri++){
            var bead=new THREE.Mesh(new THREE.SphereGeometry(0.035,6,4),ropeMat);
            var a=-0.9+ri*0.3;bead.position.set(Math.sin(a)*0.35,0.47,faceZ+Math.cos(a)*0.04);
            body.add(bead);
        }
    } else if(type==='cat'){
        var elecMat=toon(0xDFFF44,{emissive:0xCCFF00,emissiveIntensity:0.35});
        for(var ei=0;ei<4;ei++){
            var bolt=new THREE.Mesh(new THREE.BoxGeometry(0.035,0.34,0.036),elecMat);
            bolt.position.set(-0.30+ei*0.20,0.48+(ei%2)*0.10,faceZ+0.01);
            bolt.rotation.z=(ei%2?0.55:-0.55);body.add(bolt);
        }
    } else if(type==='rooster'){
        var tagMat=toon(0xDDDDDD,{emissive:0xAAAAAA,emissiveIntensity:0.1});
        var chain=new THREE.Mesh(new THREE.TorusGeometry(0.27,0.012,5,18),tagMat);
        chain.position.set(0,0.50,faceZ-0.05);chain.rotation.x=Math.PI/2;body.add(chain);
        var tag=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.16,0.025),tagMat);
        tag.position.set(0,0.36,faceZ+0.02);body.add(tag);
    } else if(type==='monkey'){
        var trimMat=toon(0xFFDD55,{emissive:0xFFAA00,emissiveIntensity:0.12});
        [-1,1].forEach(function(s){
            var trim=new THREE.Mesh(new THREE.BoxGeometry(0.032,0.60,0.032),trimMat);
            trim.position.set(s*0.19,0.50,faceZ+0.01);body.add(trim);
            var bracelet=new THREE.Mesh(new THREE.TorusGeometry(0.085,0.014,5,12),trimMat);
            bracelet.position.set(s*0.58,0.54,0.18);bracelet.rotation.y=Math.PI/2;body.add(bracelet);
        });
    } else if(type==='bear'){
        var wristMat=toon(0xCC3333,{emissive:0x661111,emissiveIntensity:0.08});
        [-1,1].forEach(function(s){
            var wrist=new THREE.Mesh(new THREE.TorusGeometry(0.13,0.026,6,16),wristMat);
            wrist.position.set(s*0.64,0.52,0.22);wrist.rotation.y=Math.PI/2;body.add(wrist);
        });
    } else if(type==='cockroach'){
        var beadMat=toon(0xFFF0CC);
        for(var bi=0;bi<8;bi++){
            var ba=-1.2+bi*0.34;
            var bead2=new THREE.Mesh(new THREE.SphereGeometry(0.032,6,4),beadMat);
            bead2.position.set(Math.sin(ba)*0.24,0.53,faceZ+Math.cos(ba)*0.035);
            body.add(bead2);
        }
        var wrap=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.06,0.035),toon(0xFFAA44));
        wrap.position.set(0,0.27,faceZ+0.01);body.add(wrap);
    }
}

function _makeSoftCapsule(radius,len,mat,tipMat){
    var limb=new THREE.Group();
    var shaft=new THREE.Mesh(new THREE.CylinderGeometry(radius*0.82,radius,len,8),mat);
    shaft.position.y=-len*0.5;limb.add(shaft);
    var capTop=new THREE.Mesh(new THREE.SphereGeometry(radius,8,6),mat);
    capTop.position.y=0;limb.add(capTop);
    var hand=new THREE.Mesh(new THREE.SphereGeometry(radius*1.32,10,8),tipMat||mat);
    hand.position.y=-len;hand.scale.set(1.08,0.86,1.0);limb.add(hand);
    limb.userData._hand=hand;
    return limb;
}

var _starShapeGeometryCache={};
function _starShapeGeometry(outerR,innerR,points){
    var key=[outerR,innerR,points||5].join(':');
    if(_starShapeGeometryCache[key])return _starShapeGeometryCache[key];
    var shape=new THREE.Shape();
    points=points||5;
    for(var i=0;i<points*2;i++){
        var a=-Math.PI/2+i*Math.PI/points;
        var r=(i%2===0)?outerR:innerR;
        var x=Math.cos(a)*r,y=Math.sin(a)*r;
        if(i===0)shape.moveTo(x,y);else shape.lineTo(x,y);
    }
    shape.closePath();
    _starShapeGeometryCache[key]=new THREE.ShapeGeometry(shape);
    return _starShapeGeometryCache[key];
}

function _addPremiumCharacterRig(g,body,color,accent,charType,feet){
    if(!g||!body)return;
    var type=charType||'egg';
    accent=(accent===undefined||accent===null)?0xFFCC66:accent;
    var faceZ=(type==='bear')?0.87:((type==='bull'||type==='cat')?0.70:(type==='cockroach'?0.45:0.60));
    var softBody=_charMixHex(color,0xFFFFFF,0.13);
    var gloveColor=(type==='egg'||type==='dog'||type==='monkey')?0xFFFFFF:_charMixHex(accent,0xFFFFFF,0.28);
    var armMat=toon(softBody);
    var gloveMat=toon(gloveColor,{emissive:_charMixHex(gloveColor,0xFFFFFF,0.15),emissiveIntensity:0.06});
    var cuffMat=toon(_charMixHex(accent,0xFFFFFF,0.28),{emissive:accent,emissiveIntensity:0.08});
    var decorArms=[];

    // Full, readable arms with mittens. These stay visible in idle/walk, while the
    // old hidden attack limbs are still used for punch/kick hit readability.
    [-1,1].forEach(function(s){
        var arm=_makeSoftCapsule(type==='bear'?0.105:0.082,type==='bear'?0.58:0.48,armMat,gloveMat);
        arm.position.set(s*((type==='bear')?0.75:0.58),(type==='bear')?0.80:0.78,0.10);
        arm.rotation.z=s*((type==='bear')?0.48:0.62);
        arm.rotation.x=0.05;
        arm.userData._side=s;arm.userData._restZ=arm.rotation.z;arm.userData._restX=arm.rotation.x;
        body.add(arm);decorArms.push(arm);
        var cuff=new THREE.Mesh(new THREE.TorusGeometry((type==='bear')?0.105:0.082,0.018,6,14),cuffMat);
        cuff.position.y=0.01;cuff.rotation.x=Math.PI/2;arm.add(cuff);
    });
    g.userData._decorArms=decorArms;

    // Shoe details make the small feet feel like designed toy parts instead of plain blobs.
    if(feet&&feet.length){
        var soleMat=toon(_charMixHex(accent,0x111111,0.32));
        var toeMat=toon(_charMixHex(accent,0xFFFFFF,0.40),{emissive:accent,emissiveIntensity:0.06});
        for(var fi=0;fi<feet.length;fi++){
            var ft=feet[fi];
            var sole=new THREE.Mesh(new THREE.BoxGeometry(0.24,0.032,0.16),soleMat);
            sole.position.set(0,-0.055,0.04);ft.add(sole);
            var toe=new THREE.Mesh(new THREE.SphereGeometry(0.045,6,4),toeMat);
            toe.position.set((fi===0?-0.025:0.025),0.01,0.145);
            toe.scale.set(1.15,0.55,0.75);ft.add(toe);
        }
    }

    // Soft pastel eyelids for real blink animation.
    var lidMat=toon(_charMixHex(color,0xFFE9F4,0.30),{transparent:true,opacity:0.98,side:THREE.DoubleSide});
    var blinkLids=[];
    [-1,1].forEach(function(s){
        var lid=new THREE.Mesh(new THREE.CircleGeometry(0.17,18),lidMat);
        lid.position.set(s*0.24,0.885,0.595);
        lid.scale.set(0.95,0.08,1);
        lid.visible=false;
        body.add(lid);blinkLids.push(lid);
    });
    g.userData._blinkLids=blinkLids;

    // Extra cheek stickers + glossy vinyl badge. Flat shapes are cheap but add charm up close.
    var heartMat=toon(0xFF8FB6,{transparent:true,opacity:0.86,side:THREE.DoubleSide,emissive:0xFF7FA8,emissiveIntensity:0.08});
    [-1,1].forEach(function(s){
        var heart=new THREE.Mesh(_starShapeGeometry(0.055,0.028,5),heartMat);
        heart.position.set(s*0.38,0.70,0.575);
        heart.rotation.z=s*0.18;
        body.add(heart);
    });
    var badgeMat=toon(_charMixHex(accent,0xFFFFFF,0.18),{emissive:accent,emissiveIntensity:0.16});
    var badge=new THREE.Mesh(_starShapeGeometry(0.08,0.042,5),badgeMat);
    badge.position.set(0.18,0.38,faceZ+0.025);
    badge.rotation.z=0.25;
    body.add(badge);
    g.userData._premiumBadge=badge;

    // Character-specific silhouette upgrades, kept simple/round so the game remains cute.
    if(type==='egg'){
        var scarfMat=toon(0xE9465D,{emissive:0xD83A52,emissiveIntensity:0.12});
        var scarf=new THREE.Mesh(new THREE.TorusGeometry(0.39,0.028,7,28),scarfMat);
        scarf.position.set(0,0.83,0.02);scarf.rotation.x=Math.PI/2;scarf.scale.z=0.78;body.add(scarf);
        [-1,1].forEach(function(s){
            var tail=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.26,0.026),scarfMat);
            tail.position.set(s*0.12,0.73,faceZ+0.015);tail.rotation.z=s*0.28;body.add(tail);
        });
    }else if(type==='dog'){
        var bandMat=toon(0xFFDD55,{emissive:0xFFB833,emissiveIntensity:0.14});
        var band=new THREE.Mesh(new THREE.TorusGeometry(0.40,0.025,7,24),bandMat);
        band.position.set(0,0.82,0.02);band.rotation.x=Math.PI/2;band.scale.z=0.76;body.add(band);
        var bone=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.055,0.03),toon(0xFFF4DD));
        bone.position.set(-0.16,0.42,faceZ+0.03);bone.rotation.z=-0.25;body.add(bone);
    }else if(type==='cat'){
        var lightningMat=toon(0xFFF45A,{emissive:0xF7FF33,emissiveIntensity:0.35});
        [-1,1].forEach(function(s){
            var bolt=new THREE.Mesh(_starShapeGeometry(0.075,0.024,4),lightningMat);
            bolt.position.set(s*0.52,0.92,0.31);bolt.rotation.z=s*0.75;body.add(bolt);
        });
    }else if(type==='rooster'){
        var medal=new THREE.Mesh(new THREE.CylinderGeometry(0.075,0.075,0.026,18),toon(0xFFD76A,{emissive:0xFFBB33,emissiveIntensity:0.16}));
        medal.position.set(0,0.36,faceZ+0.04);medal.rotation.x=Math.PI/2;body.add(medal);
        var medalStar=new THREE.Mesh(_starShapeGeometry(0.045,0.020,5),toon(0xFFFFFF,{emissive:0xFFFFFF,emissiveIntensity:0.12}));
        medalStar.position.set(0,0.36,faceZ+0.058);body.add(medalStar);
    }else if(type==='monkey'){
        var skirtMat=toon(0x6AA7FF,{emissive:0x4C88FF,emissiveIntensity:0.08});
        for(var ki=0;ki<5;ki++){
            var panel=new THREE.Mesh(new THREE.ConeGeometry(0.06,0.22,4),skirtMat);
            panel.position.set((ki-2)*0.085,0.20,faceZ-0.03);
            panel.rotation.x=Math.PI;panel.rotation.z=(ki-2)*0.08;body.add(panel);
        }
    }else if(type==='bull'){
        var padMat=toon(_charMixHex(color,0xFFFFFF,0.22));
        [-1,1].forEach(function(s){
            var shoulder=new THREE.Mesh(new THREE.SphereGeometry(0.16,8,6),padMat);
            shoulder.position.set(s*0.58,0.84,0.06);shoulder.scale.set(1.2,0.85,0.8);body.add(shoulder);
        });
    }else if(type==='bear'){
        var beltMat=toon(0xEBC963,{emissive:0xC9A133,emissiveIntensity:0.10});
        var champ=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.16,0.045),beltMat);
        champ.position.set(0,0.20,faceZ+0.03);body.add(champ);
    }else if(type==='cockroach'){
        var wingGlow=toon(0xD8B07A,{transparent:true,opacity:0.33,side:THREE.DoubleSide});
        [-1,1].forEach(function(s){
            var wing=new THREE.Mesh(new THREE.SphereGeometry(0.18,8,6),wingGlow);
            wing.position.set(s*0.16,0.82,-0.42);
            wing.scale.set(0.55,1.55,0.16);wing.rotation.z=s*0.08;body.add(wing);
        });
    }
}

function _updateCharacterPremiumRig(egg,speed){
    if(!egg||!egg.mesh||!egg.mesh.userData)return;
    var ud=egg.mesh.userData;
    var now=(typeof performance!=='undefined'&&performance.now)?performance.now()*0.001:Date.now()*0.001;
    _animateCuteCharacterDetails(egg.mesh,now);
    var moving=speed>0.006&&egg.onGround;
    var phase=egg.walkPhase||0;
    if(ud._decorArms){
        for(var i=0;i<ud._decorArms.length;i++){
            var arm=ud._decorArms[i];
            var side=arm.userData._side||1;
            var restZ=arm.userData._restZ||side*0.6;
            var swing=moving?Math.sin(phase+side*Math.PI)*0.38:Math.sin(now*2.2+side)*0.07;
            var tuck=(egg._atkAnim>0||egg.holding||egg.heldBy)?0.32:0;
            arm.rotation.z+=(restZ+swing+side*tuck-arm.rotation.z)*0.18;
            arm.rotation.x+=(0.05+Math.sin(now*1.7+side)*0.035-arm.rotation.x)*0.14;
            if(arm.userData._hand){
                var handPulse=1+Math.sin(now*3.1+side)*0.018;
                arm.userData._hand.scale.setScalar(handPulse);
            }
        }
    }
    // Gentle eye tracking in the movement direction.
    if(ud._pupils){
        var lookX=Math.max(-0.028,Math.min(0.028,egg.vx*0.18));
        var lookY=egg.vy>0.03?0.018:(egg.vy<-0.04?-0.012:0);
        for(var pi=0;pi<ud._pupils.length;pi++){
            var ps=pi===0?-1:1;
            ud._pupils[pi].position.x+=((ps*0.225+lookX)-ud._pupils[pi].position.x)*0.16;
            ud._pupils[pi].position.y+=((0.165+lookY)-ud._pupils[pi].position.y)*0.16;
            if(ud._shines&&ud._shines[pi]){
                ud._shines[pi].position.x+=((ps*0.195+lookX*0.45)-ud._shines[pi].position.x)*0.16;
                ud._shines[pi].position.y+=((0.245+lookY*0.35)-ud._shines[pi].position.y)*0.16;
            }
        }
    }
    // Organic blink: short closed frames, random interval per character.
    if(egg._blinkWait===undefined)egg._blinkWait=45+Math.floor(Math.random()*110);
    if(egg._blinkTimer===undefined)egg._blinkTimer=0;
    if(egg._blinkTimer>0)egg._blinkTimer--;
    else{
        egg._blinkWait--;
        if(egg._blinkWait<=0){
            egg._blinkTimer=8;
            egg._blinkWait=110+Math.floor(Math.random()*190);
        }
    }
    var inPain=egg._hitStun>0||egg._stunTimer>0||egg.throwTimer>0||egg._electrocuted>0||egg._elecFlying>0;
    if(ud._blinkLids){
        var closed=0;
        if(!inPain&&egg._blinkTimer>0){
            var bt=egg._blinkTimer;
            closed=bt>4?(8-bt)/4:bt/4;
            closed=Math.max(0,Math.min(1,closed));
        }
        for(var li=0;li<ud._blinkLids.length;li++){
            var lid=ud._blinkLids[li];
            lid.visible=closed>0.04;
            lid.scale.set(0.95,0.10+closed*0.98,1);
        }
    }
    if(ud._premiumBadge){
        ud._premiumBadge.rotation.z+=0.012;
    }
}

function _animateCuteCharacterDetails(model,now){
    if(!model||!model.userData)return;
    var ud=model.userData;
    if(ud._flowerDetails){
        for(var fdi=0;fdi<ud._flowerDetails.length;fdi++){
            var flower=ud._flowerDetails[fdi],flowerPhase=flower.userData._phase||0;
            flower.rotation.z=(flower.userData._restZ||0)+Math.sin(now*0.9+flowerPhase)*0.035;
            var flowerPulse=0.985+Math.sin(now*1.25+flowerPhase)*0.018;
            flower.scale.setScalar(flowerPulse);
        }
    }
    if(ud._angelWings){
        // One very gentle full flap every three seconds.
        var flap=Math.sin(now*Math.PI*2/3);
        for(var wi=0;wi<ud._angelWings.length;wi++){
            var wing=ud._angelWings[wi],side=wing.userData._side||1;
            wing.rotation.z=(wing.userData._restZ||0)+side*flap*0.13;
            wing.rotation.y=(wing.userData._restY||0)-side*flap*0.08;
        }
    }
    if(ud._crystalSparkles){
        for(var si=0;si<ud._crystalSparkles.length;si++){
            var sparkle=ud._crystalSparkles[si];
            var pulse=0.72+Math.sin(now*2.25+si*1.71)*0.28;
            var crystalPulse=(sparkle.userData._baseScale||1)*(0.82+pulse*0.24);
            if(sparkle.userData._baseScaleVec)sparkle.scale.copy(sparkle.userData._baseScaleVec).multiplyScalar(crystalPulse);
            else sparkle.scale.setScalar(crystalPulse);
            sparkle.material.opacity=0.34+pulse*0.34;
            sparkle.rotation.z=now*0.22*(si%2?1:-1)+si*0.48;
        }
    }
    if(ud._starDetails){
        for(var sti=0;sti<ud._starDetails.length;sti++){
            var star=ud._starDetails[sti],phase=star.userData._phase||0;
            var twinkle=0.92+Math.sin(now*2.15+phase)*0.10;
            star.scale.setScalar((star.userData._baseScale||1)*twinkle);
            star.rotation.z=(star.userData._restZ||0)+Math.sin(now*0.85+phase)*0.10;
            if(star.material&&star.material.opacity!==undefined){
                star.material.opacity=(star.userData._baseOpacity||0.92)*(0.88+Math.sin(now*2.15+phase)*0.10);
            }
        }
    }
    if(ud._windDetails){
        for(var wdi=0;wdi<ud._windDetails.length;wdi++){
            var wind=ud._windDetails[wdi],windPhase=wind.userData._phase||0;
            wind.rotation.z=(wind.userData._restZ||0)+Math.sin(now*0.82+windPhase)*0.025;
        }
    }
}

// Optional arcade-fighter costume layer. It is built on the same mascot body
// used by gameplay, rather than swapping the select screen to an unrelated 2D
// portrait. The layer can therefore be toggled without rebuilding physics,
// animation or combat hit meshes.
function _addClassicArcadeFighterRig(g,body,color,accent,charType){
    if(!g||!body)return null;
    var type=charType||'egg',high=window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.high;
    var root=new THREE.Group();
    root.name='danbo-classic-arcade-fighter-style';
    root.visible=false;
    body.add(root);
    var details=[];
    function material(hex,opts){
        opts=opts||{};
        if(opts.roughness===undefined)opts.roughness=.42;
        if(opts.clearcoat===undefined)opts.clearcoat=.18;
        if(opts.clearcoatRoughness===undefined)opts.clearcoatRoughness=.28;
        return softPBR(hex,opts);
    }
    function add(geometry,mat,x,y,z,rx,ry,rz,sx,sy,sz,parent){
        var mesh=new THREE.Mesh(geometry,mat);
        mesh.position.set(x||0,y||0,z||0);
        mesh.rotation.set(rx||0,ry||0,rz||0);
        mesh.scale.set(sx===undefined?1:sx,sy===undefined?1:sy,sz===undefined?1:sz);
        mesh.castShadow=true;mesh.receiveShadow=false;
        (parent||root).add(mesh);details.push(mesh);return mesh;
    }
    function tube(points,radius,mat,parent){
        var curve=new THREE.CatmullRomCurve3(points.map(function(p){return new THREE.Vector3(p[0],p[1],p[2]);}));
        var mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,high?18:10,radius,high?8:5,false),mat);
        mesh.castShadow=true;(parent||root).add(mesh);details.push(mesh);return mesh;
    }
    var white=material(0xF4F0E4,{roughness:.67,clearcoat:.06,envMapIntensity:.28});
    var ink=material(0x191B23,{roughness:.58,clearcoat:.05,envMapIntensity:.18});
    var red=material(0xC92836,{roughness:.50,clearcoat:.12,envMapIntensity:.30});
    var gold=material(0xF4C542,{roughness:.29,metalness:.28,clearcoat:.35,envMapIntensity:.55});
    var blond=material(0xFFD34B,{roughness:.46,clearcoat:.10,envMapIntensity:.31});
    var orange=material(0xF06A22,{roughness:.52,clearcoat:.08,envMapIntensity:.25});
    function addBelt(mat,knotMat){
        add(new THREE.TorusGeometry(.49,.035,high?9:6,high?40:24),mat,0,-.43,.01,Math.PI/2,0,0,1,1,.82);
        add(new THREE.SphereGeometry(.072,high?16:10,high?12:8),knotMat||mat,0,-.43,.615,0,0,0,1.12,.80,.48);
    }
    function addLapels(mat){
        tube([[-.36,-.12,.590],[-.19,-.27,.684],[-.025,-.42,.620]],.031,mat);
        tube([[ .36,-.12,.590],[ .19,-.27,.684],[ .025,-.42,.620]],.031,mat);
    }
    function addSpikes(mat,count,y,z,spread,height){
        for(var i=0;i<count;i++){
            var t=count===1?0:i/(count-1),x=(t-.5)*spread;
            add(new THREE.ConeGeometry(.075+(i%2)*.012,height,high?10:6),mat,x,y+Math.sin(t*Math.PI)*.045,z-(Math.abs(t-.5)*.055),-.12+(t-.5)*.22,0,(t-.5)*.30);
        }
    }
    if(type==='egg'){
        // White gi, black belt and a tied red headband.
        addLapels(white);addBelt(ink,red);
        tube([[-.43,.40,.590],[-.19,.43,.690],[.19,.43,.690],[.43,.40,.590]],.028,red);
        add(new THREE.SphereGeometry(.055,12,8),red,.44,.39,.42);
        add(new THREE.BoxGeometry(.055,.30,.022),red,.50,.28,.30,0,0,-.38);
        add(new THREE.BoxGeometry(.052,.25,.020),red,.42,.26,.25,0,0,.22);
    }else if(type==='bull'){
        // Sumo-inspired topknot, ceremonial belt and cheek paint.
        add(new THREE.SphereGeometry(.175,high?22:14,high?16:10),ink,0,.78,.02,0,0,0,1.18,.60,.92);
        add(new THREE.CylinderGeometry(.070,.090,.18,high?16:9),ink,0,.89,.01,0,0,0,1,1,.90);
        addBelt(white,gold);
        [-1,1].forEach(function(s){
            add(new THREE.BoxGeometry(.16,.030,.020),red,s*.34,.10,.680,0,-s*.18,s*.16);
            add(new THREE.BoxGeometry(.13,.026,.018),red,s*.36,.02,.652,0,-s*.22,s*.16);
        });
    }else if(type==='cat'){
        // Wild orange crest and electric body markings.
        addSpikes(orange,7,.79,.00,.82,.34);
        var stripe=material(0x2D8548,{roughness:.58,clearcoat:.05,emissive:0x173F25,emissiveIntensity:.025});
        [-1,1].forEach(function(s){
            tube([[s*.47,.18,.565],[s*.37,.10,.662],[s*.48,.02,.566]],.022,stripe);
            tube([[s*.43,-.16,.565],[s*.30,-.23,.660],[s*.43,-.30,.545]],.020,stripe);
        });
    }else if(type==='rooster'){
        // Flat-top silhouette, dog tags and restrained military patches.
        add(new THREE.BoxGeometry(.61,.13,.28),blond,0,.78,.00,0,0,0,1,.90,1);
        for(var fi=0;fi<5;fi++)add(new THREE.BoxGeometry(.105,.11,.22),blond,-.24+fi*.12,.87,-.005,0,0,(fi-2)*.035);
        tube([[-.27,.13,.650],[-.18,-.04,.698],[0,-.12,.714],[.18,-.04,.698],[.27,.13,.650]],.010,gold);
        add(new THREE.BoxGeometry(.105,.145,.020),gold,-.055,-.18,.712,0,0,-.12);
        add(new THREE.BoxGeometry(.105,.145,.020),gold,.070,-.17,.711,0,0,.12);
        var patch=material(0x394B2A,{roughness:.72,clearcoat:.02,envMapIntensity:.16});
        add(new THREE.CircleGeometry(.095,12),patch,-.37,-.23,.614,0,-.30,.18,1,.48,1);
        add(new THREE.CircleGeometry(.080,12),patch,.38,-.28,.600,0,.30,-.16,1,.48,1);
    }else if(type==='dog'){
        // Red gi fighter with a high golden crest and dark belt.
        addSpikes(blond,7,.79,.00,.82,.38);addLapels(red);addBelt(ink,red);
        [-1,1].forEach(function(s){add(new THREE.TorusGeometry(.115,.025,7,18),red,s*.57,-.10,.18,0,Math.PI/2,0);});
    }else if(type==='monkey'){
        // Twin hair buns, white ribbons and gold-trimmed blue dress lines.
        add(new THREE.SphereGeometry(.49,high?28:18,high?18:12),ink,0,.55,-.19,0,0,0,1,.58,.72);
        [-1,1].forEach(function(s){
            add(new THREE.SphereGeometry(.17,high?20:12,high?14:9),ink,s*.43,.60,-.03,0,0,0,1,1,.78);
            add(new THREE.TorusGeometry(.18,.025,7,20),white,s*.43,.60,-.01,Math.PI/2,0,0);
            add(new THREE.BoxGeometry(.055,.24,.025),white,s*.55,.44,.01,0,0,-s*.42);
            tube([[s*.29,-.28,.642],[s*.24,-.05,.700],[s*.15,.15,.714]],.022,gold);
        });
        addBelt(gold,white);
    }else if(type==='bear'){
        // Heavy wrestler: red crest, championship belt and chest scars.
        addSpikes(red,5,.79,-.02,.52,.28);
        add(new THREE.TorusGeometry(.55,.070,high?10:6,high?40:24),red,0,-.33,.01,Math.PI/2,0,0,1,1,.78);
        add(new THREE.BoxGeometry(.30,.19,.045),gold,0,-.33,.708,0,0,0,1,1,.55);
        add(new THREE.BoxGeometry(.12,.08,.055),red,0,-.33,.742);
        var scar=material(0xDDA387,{roughness:.78,clearcoat:0,envMapIntensity:.14});
        tube([[-.29,.10,.706],[-.18,.01,.760],[-.08,-.10,.748]],.015,scar);
        tube([[-.24,.01,.735],[-.13,.11,.755]],.012,scar);
        tube([[.12,.06,.755],[.25,-.08,.719]],.013,scar);
    }else if(type==='cockroach'){
        // Mystic fighter: forehead mark, prayer beads and gold cuffs.
        add(new THREE.BoxGeometry(.065,.22,.018),red,0,.42,.704);
        add(new THREE.CircleGeometry(.048,12),white,0,.31,.716);
        add(new THREE.CircleGeometry(.023,10),red,0,.31,.720);
        for(var bi=0;bi<11;bi++){
            var a=-1.23+bi*(2.46/10);
            add(new THREE.SphereGeometry(.042,high?12:8,high?9:6),bi%2?white:gold,Math.sin(a)*.33,-.02-Math.cos(a)*.19,.657+Math.cos(a)*.035);
        }
        [-1,1].forEach(function(s){add(new THREE.TorusGeometry(.112,.022,7,18),gold,s*.56,-.10,.17,0,Math.PI/2,0);});
    }
    g.userData._classicFighterRoot=root;
    g.userData._classicFighterDetails=details;
    return root;
}

function _setCharacterMeshStyle(mesh,style){
    if(!mesh)return mesh;
    var classic=style==='classic';
    if(mesh.userData&&mesh.userData._classicFighterRoot)mesh.userData._classicFighterRoot.visible=classic;
    if(mesh.userData)mesh.userData._characterDisplayStyle=classic?'classic':'cinematic';
    return mesh;
}
window._setCharacterMeshStyle=_setCharacterMeshStyle;

function _createCuteRoundCharacterMesh(color,accent,charType,includeClassicRig){
    var g=new THREE.Group(),type=charType||'egg';
    accent=(accent===undefined||accent===null)?0xFF6F7D:accent;
    var high=window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.high;
    var bodyGeo=new THREE.SphereGeometry(0.70,high?48:28,high?32:20);
    var bp=bodyGeo.attributes.position;
    var speciesX=type==='bear'?1.10:(type==='bull'||type==='cat'?1.05:(type==='cockroach'?0.92:1));
    var speciesY=type==='cockroach'?1.08:(type==='bear'?1.03:1);
    for(var bi=0;bi<bp.count;bi++){
        var x=bp.getX(bi),y=bp.getY(bi),z=bp.getZ(bi),ny=y/0.70;
        // A distinctly egg/pear-shaped mascot silhouette: broad lower mass, tapered crown,
        // a gently projected front and a flatter shell-bearing back. This remains local to
        // the body mesh so facial parts and combat animations cannot drift in world space.
        var taper=1.14-(ny+1)*0.13;
        x*=taper*speciesX;
        z*=(0.96+(1-ny)*0.04)*(z>0?1.035:0.985);
        y*=1.16*speciesY;
        if(y<-0.61)y=-0.61+(y+0.61)*0.28;
        bp.setXYZ(bi,x,y,z);
    }
    bodyGeo.computeVertexNormals();
    var bodyOpts={pastelAmount:0.035,roughness:0.36,clearcoat:0.30,clearcoatRoughness:0.24,envMapIntensity:0.50};
    if(type==='cat')bodyOpts={pastelAmount:0.025,roughness:0.25,metalness:0.015,clearcoat:0.62,clearcoatRoughness:0.16,envMapIntensity:0.68};
    if(type==='bear')bodyOpts={pastelAmount:0.018,roughness:0.89,metalness:0,clearcoat:0.025,clearcoatRoughness:0.88,envMapIntensity:0.13};
    var bodyMat=softPBR(color,bodyOpts);
    var body=new THREE.Mesh(bodyGeo,bodyMat);body.position.y=0.79;body.castShadow=true;body.receiveShadow=true;g.add(body);

    var outline=new THREE.Mesh(bodyGeo.clone(),new THREE.MeshBasicMaterial({color:0x251F38,side:THREE.BackSide,transparent:true,opacity:0.065,depthWrite:false}));
    outline.scale.setScalar(1.025);outline.renderOrder=-2;body.add(outline);g.userData._toonOutline=outline;

    var shellColor=_charMixHex(color,0xDCCFB8,0.42);
    var shellMat=softPBR(shellColor,type==='bear'?
        {pastelAmount:0.01,roughness:0.90,clearcoat:0.02,envMapIntensity:0.12}:
        {pastelAmount:0.02,roughness:0.42,clearcoat:0.22,clearcoatRoughness:0.28,envMapIntensity:0.40});
    // Keep the torso as one integrated silhouette. The old front plate caused a
    // protruding "chin", while the circular rear plate and torus read as a wheel.

    var gloss=new THREE.Mesh(new THREE.CircleGeometry(0.10,20),new THREE.MeshBasicMaterial({color:0xFFFFFF,transparent:true,opacity:0.10,depthWrite:false,side:THREE.DoubleSide,blending:THREE.NormalBlending,fog:false}));
    gloss.position.set(-0.32,0.39,0.70);gloss.scale.set(0.72,0.28,1);gloss.rotation.z=-0.28;body.add(gloss);

    var eyeG=new THREE.SphereGeometry(0.128,high?24:16,high?18:12);
    var eyeMat=softPBR(0xFFFDF7,{pastelAmount:0,roughness:0.25,clearcoat:0.43,clearcoatRoughness:0.17,envMapIntensity:0.48});
    var irisPalette={egg:0x647FCE,bull:0x4F916A,cat:0x4B9DD6,rooster:0x687BCB,dog:0xA15E92,monkey:0x5C69B7,bear:0x5D708D,cockroach:0x765FA9};
    var irisColor=irisPalette[type]||0x557FC7;
    var irisMat=softPBR(irisColor,{pastelAmount:0,roughness:0.20,clearcoat:0.38,emissive:_charMixHex(irisColor,0x111B36,0.62),emissiveIntensity:0.045});
    var pupilMat=softPBR(0x101522,{pastelAmount:0,roughness:0.16,clearcoat:0.48,envMapIntensity:0.44});
    var shineMat=new THREE.MeshBasicMaterial({color:0xFFFFFF,fog:false});
    var lashMat=softPBR(0x282236,{pastelAmount:0,roughness:0.58});
    var _eyeWhites=[],_pupils=[],_shines=[],_eyeBaseScales=[];
    [-1,1].forEach(function(s){
        var eye=new THREE.Mesh(eyeG,eyeMat);eye.position.set(s*0.225,0.20,0.665);eye.scale.set(0.62,1.06,0.27);body.add(eye);_eyeWhites.push(eye);_eyeBaseScales.push(eye.scale.clone());
        var iris=new THREE.Mesh(new THREE.SphereGeometry(0.106,high?22:14,high?16:10),irisMat);iris.position.set(s*0.225,0.162,0.702);iris.scale.set(0.77,1.12,0.22);body.add(iris);_pupils.push(iris);
        var pupil=new THREE.Mesh(new THREE.SphereGeometry(0.055,high?16:10,high?12:8),pupilMat);pupil.position.set(0,-0.006,0.096);pupil.scale.set(0.88,1.14,0.26);iris.add(pupil);
        var hi=new THREE.Mesh(new THREE.SphereGeometry(0.034,10,8),shineMat);hi.position.set(s*0.194,0.247,0.719);hi.scale.z=0.18;body.add(hi);_shines.push(hi);
        var hi2=new THREE.Mesh(new THREE.SphereGeometry(0.016,8,6),shineMat);hi2.position.set(s*0.247,0.178,0.721);hi2.scale.z=0.16;body.add(hi2);
        var lashCurve=new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(s*0.305,0.300,0.700),
            new THREE.Vector3(s*0.225,0.338,0.720),
            new THREE.Vector3(s*0.145,0.302,0.700)
        );
        body.add(new THREE.Mesh(new THREE.TubeGeometry(lashCurve,10,0.009,6,false),lashMat));
    });
    var smileCurve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.115,-0.13,0.718),new THREE.Vector3(0,-0.195,0.732),new THREE.Vector3(0.115,-0.13,0.718));
    var smile=new THREE.Mesh(new THREE.TubeGeometry(smileCurve,14,0.015,8,false),softPBR(0x342333,{pastelAmount:0,roughness:0.62}));body.add(smile);
    // Candy Egg's old coral body was nearly the same hue/value as the shared
    // blush. Give only this variant a deeper raspberry cheek so it stays legible
    // in the fixed warm selection light and remains consistent in gameplay.
    var blushColor=type==='dog'?0xE64870:0xFF779F;
    var blushOpacity=type==='dog'?0.58:0.43;
    var blushG=new THREE.CircleGeometry(0.103,24),blushM=toon(blushColor,{transparent:true,opacity:blushOpacity,side:THREE.DoubleSide});
    [-1,1].forEach(function(s){var bl=new THREE.Mesh(blushG,blushM);bl.position.set(s*0.41,-0.055,0.635);bl.scale.set(1.22,0.62,1);bl.rotation.y=s*0.34;body.add(bl);});

    var decorArms=[],armMat=softPBR(color,type==='bear'?
        {pastelAmount:0.018,roughness:0.91,clearcoat:0.02,envMapIntensity:0.11}:
        {pastelAmount:0.045,roughness:0.31,clearcoat:0.40,clearcoatRoughness:0.22,envMapIntensity:0.60});
    [-1,1].forEach(function(s){
        var armRadius=type==='bear'?0.165:0.142;
        var handRadius=type==='bear'?0.215:0.188;
        var armG=new THREE.Group(),arm=new THREE.Mesh(new THREE.SphereGeometry(armRadius,high?22:14,high?14:9),armMat);
        arm.position.y=-0.10;arm.scale.set(0.68,1.55,0.60);arm.castShadow=true;armG.add(arm);
        var hand=new THREE.Mesh(new THREE.SphereGeometry(handRadius,high?24:14,high?18:10),shellMat);hand.name='danbo-character-hand';hand.position.set(0,-0.36,0.035);hand.scale.setScalar(1);hand.castShadow=true;armG.add(hand);armG.userData._hand=hand;armG.userData._baseHandRadius=handRadius;
        armG.position.set(s*(type==='bear'?0.73:0.66),0.00,0.015);armG.rotation.z=s*0.48;armG.userData._side=s;armG.userData._restZ=armG.rotation.z;body.add(armG);decorArms.push(armG);
    });
    g.userData._decorArms=decorArms;

    var footColor=_charMixHex(accent,0xFF667A,0.14),ftM=softPBR(footColor,type==='bear'?
        {pastelAmount:0.012,roughness:0.84,clearcoat:0.035,clearcoatRoughness:0.78,envMapIntensity:0.14}:
        {pastelAmount:0.025,roughness:0.26,clearcoat:0.58,clearcoatRoughness:0.16,envMapIntensity:0.72});
    var ftG=new THREE.SphereGeometry(0.22,high?28:16,high?18:10);ftG.scale(1.42,0.54,1.74);var feet=[];
    [-1,1].forEach(function(s){var ft=new THREE.Mesh(ftG,ftM);ft.castShadow=true;ft.receiveShadow=true;ft.position.set(s*0.29,0.105,0.15);ft.rotation.y=-s*0.08;g.add(ft);feet.push(ft);});

    var angelWings=[],crystalSparkles=[],crystalEars=[],candyEars=[],flowerDetails=[],forestLeaves=[],rockDetails=[],rockSurfaceMarks=[],starDetails=[],windDetails=[];
    if(type==='egg'){
        // A soft dimensional blossom replaces the hidden spike crown. Rounded
        // petals keep Flower Egg floral, readable and friendly at every distance.
        var flowerGroup=new THREE.Group();flowerGroup.name='danbo-flower-blossom';
        flowerGroup.position.set(-0.27,0.58,0.48);flowerGroup.rotation.z=-0.12;
        flowerGroup.userData._restZ=flowerGroup.rotation.z;flowerGroup.userData._phase=0.55;
        var petalMat=softPBR(_charMixHex(accent,0xFFF2F6,0.38),{pastelAmount:0.02,roughness:0.38,clearcoat:0.24,clearcoatRoughness:0.26});
        var flowerCenterMat=softPBR(0xFFD66D,{pastelAmount:0,roughness:0.34,clearcoat:0.30,emissive:0x9B5D12,emissiveIntensity:0.045});
        for(var ei=0;ei<5;ei++){
            var pa=ei*Math.PI*2/5-Math.PI/2;
            var petal=new THREE.Mesh(new THREE.SphereGeometry(0.072,high?18:12,high?12:8),petalMat);
            petal.position.set(Math.cos(pa)*0.070,Math.sin(pa)*0.070,0);
            petal.scale.set(0.58,1.02,0.24);petal.rotation.z=pa+Math.PI/2;petal.castShadow=true;flowerGroup.add(petal);
        }
        var flowerCenter=new THREE.Mesh(new THREE.SphereGeometry(0.050,high?18:12,high?12:8),flowerCenterMat);
        flowerCenter.position.z=0.035;flowerCenter.scale.z=0.42;flowerCenter.castShadow=true;flowerGroup.add(flowerCenter);
        body.add(flowerGroup);flowerDetails.push(flowerGroup);
    }else if(type==='dog'){
        // Long side-swept candy-ribbon ears: rounded and low, never upright like a rabbit.
        var candyEarMat=softPBR(_charMixHex(color,0xFFB0C3,0.22),{roughness:0.34,clearcoat:0.34,clearcoatRoughness:0.22});
        var candyInnerMat=softPBR(_charMixHex(accent,0xFFF4D8,0.48),{roughness:0.30,clearcoat:0.40});
        [-1,1].forEach(function(s){
            var earRoot=new THREE.Group();earRoot.position.set(s*0.43,0.33,-0.025);earRoot.rotation.z=-s*1.30;body.add(earRoot);
            var ear=new THREE.Mesh(new THREE.SphereGeometry(0.19,high?24:14,high?16:10),candyEarMat);
            ear.position.y=0.18;ear.scale.set(0.60,1.52,0.46);ear.castShadow=true;earRoot.add(ear);
            var inner=new THREE.Mesh(new THREE.SphereGeometry(0.14,high?20:12,high?14:9),candyInnerMat);
            inner.position.set(0,0.19,0.078);inner.scale.set(0.40,1.32,0.19);earRoot.add(inner);
            var tip=new THREE.Mesh(new THREE.SphereGeometry(0.068,14,10),candyInnerMat);
            tip.position.set(0,0.43,0.005);tip.scale.set(1.18,0.76,0.84);earRoot.add(tip);
            candyEars.push(earRoot);
        });
    }else if(type==='cat'){
        // Crystal Egg uses two compact round ears instead of sharp animal ears.
        // Both layers stay in body-local space, so the gameplay and selection
        // models remain identical while the silhouette stays soft and original.
        var crystalEarMat=softPBR(_charMixHex(color,0xE9FBFF,0.20),{pastelAmount:0.015,roughness:0.27,metalness:0.01,clearcoat:0.56,clearcoatRoughness:0.17,envMapIntensity:0.62});
        var crystalEarInnerMat=softPBR(_charMixHex(accent,0xFFF5FA,0.40),{pastelAmount:0.01,roughness:0.24,clearcoat:0.50,clearcoatRoughness:0.16,envMapIntensity:0.54});
        [-1,1].forEach(function(s){
            var earRoot=new THREE.Group();
            earRoot.name='danbo-crystal-round-ear';
            earRoot.position.set(s*0.43,0.54,0.005);
            earRoot.rotation.z=-s*0.10;
            var ear=new THREE.Mesh(new THREE.SphereGeometry(0.185,high?26:16,high?18:11),crystalEarMat);
            ear.scale.set(1.00,1.08,0.54);ear.castShadow=true;earRoot.add(ear);
            var inner=new THREE.Mesh(new THREE.SphereGeometry(0.112,high?22:14,high?16:10),crystalEarInnerMat);
            inner.position.set(0,-0.006,0.087);inner.scale.set(0.94,1.02,0.30);inner.castShadow=false;earRoot.add(inner);
            body.add(earRoot);crystalEars.push(earRoot);
        });
        var crystalCrest=new THREE.Mesh(new THREE.OctahedronGeometry(0.062,0),softPBR(0xB8F3FF,{pastelAmount:0,roughness:0.20,metalness:0.02,clearcoat:0.62,clearcoatRoughness:0.12,emissive:0x2A7790,emissiveIntensity:0.07,transparent:true,opacity:0.84}));
        crystalCrest.name='danbo-crystal-crest';crystalCrest.position.set(0,0.835,0.02);crystalCrest.scale.set(0.82,1.34,0.66);crystalCrest.userData._baseScale=1;crystalCrest.userData._baseScaleVec=crystalCrest.scale.clone();
        body.add(crystalCrest);crystalSparkles.push(crystalCrest);
        var crystalMat=softPBR(0xA8EEFF,{pastelAmount:0,roughness:0.18,metalness:0.04,clearcoat:0.68,clearcoatRoughness:0.10,emissive:0x245C78,emissiveIntensity:0.08,transparent:true,opacity:0.76,depthWrite:false});
        [[-0.39,0.33,0.58,0.065],[0.40,0.04,0.57,0.052],[-0.33,-0.20,0.61,0.045],[0.30,0.48,0.53,0.040]].forEach(function(cp,ci){
            var gem=new THREE.Mesh(new THREE.OctahedronGeometry(cp[3],0),crystalMat.clone());
            gem.position.set(cp[0],cp[1],cp[2]);gem.scale.set(0.68,1.34,0.42);gem.rotation.z=ci*0.61;body.add(gem);crystalSparkles.push(gem);
            gem.userData._baseScale=1;gem.userData._baseScaleVec=gem.scale.clone();
        });
        for(var csi=0;csi<(high?4:2);csi++){
            var sparkle=new THREE.Mesh(_starShapeGeometry(0.040,0.010,4),new THREE.MeshBasicMaterial({color:0xFFFFFF,transparent:true,opacity:0.58,depthWrite:false,fog:false,side:THREE.DoubleSide}));
            var sp=[[-0.31,0.43],[0.34,0.28],[-0.29,-0.10],[0.27,-0.24]][csi];
            sparkle.position.set(sp[0],sp[1],0.714);sparkle.userData._baseScale=0.82+csi*0.08;body.add(sparkle);crystalSparkles.push(sparkle);
        }
    }else if(type==='rooster'){
        var haloM=softPBR(0xFFD978,{roughness:0.28,metalness:0.08,emissive:0x9A6312,emissiveIntensity:0.12});
        var halo=new THREE.Mesh(new THREE.TorusGeometry(0.25,0.025,8,32),haloM);halo.position.set(0,0.86,-0.01);halo.rotation.x=Math.PI/2;body.add(halo);
        var featherMat=softPBR(0xFFFDF5,{pastelAmount:0,roughness:0.46,clearcoat:0.08,transparent:true,opacity:0.76,depthWrite:false,side:THREE.DoubleSide,envMapIntensity:0.28});
        var featherTipMat=softPBR(0xDDF1FF,{pastelAmount:0,roughness:0.50,transparent:true,opacity:0.58,depthWrite:false,side:THREE.DoubleSide});
        [-1,1].forEach(function(s){
            var wing=new THREE.Group();wing.position.set(s*0.25,0.04,-0.25);wing.rotation.z=s*0.08;wing.rotation.y=-s*0.06;wing.userData._side=s;wing.userData._restZ=wing.rotation.z;wing.userData._restY=wing.rotation.y;
            for(var fi=0;fi<4;fi++){
                var feather=new THREE.Mesh(new THREE.SphereGeometry(0.25-fi*0.014,high?20:12,high?14:9),fi===3?featherTipMat:featherMat);
                feather.position.set(s*(0.25+fi*0.14),0.18-fi*0.11,0);
                feather.scale.set(0.54,1.28-fi*0.07,0.20);feather.rotation.z=s*(0.74+fi*0.11);feather.castShadow=high;wing.add(feather);
            }
            body.add(wing);angelWings.push(wing);
        });
    }else if(type==='monkey'){
        [-1,1].forEach(function(s){var ear=new THREE.Mesh(new THREE.SphereGeometry(0.16,18,12),softPBR(0xFFD4AA,{roughness:0.38}));ear.position.set(s*0.53,0.22,0);ear.scale.z=0.55;body.add(ear);});
        // Star Wish Egg: an original celestial crest and two small orbit charms.
        // The motif is attached to the body in local space, so it stays aligned
        // during selection-page sway, combat and every gameplay animation.
        var starGold=softPBR(0xFFD75A,{pastelAmount:0,roughness:0.28,metalness:0.10,clearcoat:0.52,clearcoatRoughness:0.16,emissive:0x8D5A08,emissiveIntensity:0.10,transparent:true,opacity:0.96,side:THREE.DoubleSide});
        var starCream=softPBR(0xFFF2B0,{pastelAmount:0,roughness:0.24,clearcoat:0.48,emissive:0xA66A10,emissiveIntensity:0.08,transparent:true,opacity:0.92,side:THREE.DoubleSide});
        var mainStar=new THREE.Mesh(_starShapeGeometry(0.145,0.064,5),starGold);
        mainStar.name='danbo-starwish-main-star';mainStar.position.set(0,0.56,0.704);mainStar.rotation.z=-0.08;
        mainStar.userData._baseScale=1;mainStar.userData._phase=0.25;mainStar.userData._restZ=mainStar.rotation.z;mainStar.userData._baseOpacity=0.96;
        body.add(mainStar);starDetails.push(mainStar);
        var starCore=new THREE.Mesh(_starShapeGeometry(0.070,0.031,5),starCream);
        starCore.name='danbo-starwish-star-core';starCore.position.set(0,0.56,0.714);starCore.rotation.z=0.10;
        starCore.userData._baseScale=1;starCore.userData._phase=1.4;starCore.userData._restZ=starCore.rotation.z;starCore.userData._baseOpacity=0.92;
        body.add(starCore);starDetails.push(starCore);
        [[-0.43,0.41,0.042,0.15,0.53],[0.43,0.35,0.045,2.35,0.53]].forEach(function(sp){
            var charm=new THREE.Mesh(_starShapeGeometry(sp[2]*2.2,sp[2],5),starCream.clone());
            charm.name='danbo-starwish-orbit-star';charm.position.set(sp[0],sp[1],sp[4]);
            charm.userData._baseScale=1;charm.userData._phase=sp[3];charm.userData._restZ=sp[3]*0.12;charm.userData._baseOpacity=0.82;
            charm.rotation.z=charm.userData._restZ;body.add(charm);starDetails.push(charm);
        });
    }else if(type==='bull'){
        // Forest Egg: a readable crown of leaves, kept compact enough to be a motif.
        var stemM=softPBR(0x356E3E,{roughness:0.88}),leafM=softPBR(0x5AAE60,{roughness:0.80,clearcoat:0.025,envMapIntensity:0.18}),leafLightM=softPBR(0x82C967,{roughness:0.82,envMapIntensity:0.16});
        var stem=new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.037,0.30,8),stemM);stem.position.set(0,0.78,0.015);stem.rotation.z=-0.06;body.add(stem);
        [[-0.13,0.91,-0.52,1.42],[0.13,0.92,0.52,1.42],[0.00,1.00,0.04,1.22]].forEach(function(lp,li){
            var leaf=new THREE.Mesh(new THREE.SphereGeometry(0.13,high?20:12,high?12:8),li===2?leafLightM:leafM);
            leaf.position.set(lp[0],lp[1],0.045);leaf.scale.set(lp[3],0.45,0.72);leaf.rotation.z=lp[2];leaf.castShadow=true;body.add(leaf);forestLeaves.push(leaf);
        });
        var forestBud=new THREE.Mesh(new THREE.SphereGeometry(0.052,high?18:10,high?12:8),softPBR(0xF3A956,{roughness:0.44,clearcoat:0.10}));
        forestBud.position.set(0.055,0.990,0.135);forestBud.scale.set(0.92,1.02,0.76);forestBud.castShadow=true;body.add(forestBud);forestLeaves.push(forestBud);
    }else if(type==='bear'){
        // Keep the stone motif around the silhouette instead of scattering large
        // pebble bumps across the face. The old round bear ears are intentionally
        // omitted: a compact mineral crest gives Rock Egg its own cleaner identity.
        var rockM=softPBR(_charMixHex(color,0x716A68,0.54),{pastelAmount:0.008,roughness:0.95,metalness:0,clearcoat:0,envMapIntensity:0.07});
        var rockLightM=softPBR(_charMixHex(color,0xD8C8B6,0.28),{pastelAmount:0.012,roughness:0.92,metalness:0,clearcoat:0.008,envMapIntensity:0.09});
        [
            [-0.35,0.59,0.47,0.073,0.76,1.18,0.43,-0.24],
            [-0.20,0.69,0.44,0.062,0.68,1.28,0.40, 0.10],
            [-0.49,0.48,0.43,0.054,0.92,0.82,0.46,-0.32]
        ].forEach(function(rp,ri){
            var rock=new THREE.Mesh(new THREE.DodecahedronGeometry(rp[3],0),ri===1?rockLightM:rockM);
            rock.position.set(rp[0],rp[1],rp[2]);rock.scale.set(rp[4],rp[5],rp[6]);
            rock.rotation.set(ri*0.23,rp[7],ri*0.19-0.16);rock.castShadow=true;body.add(rock);rockDetails.push(rock);
        });
        // Very thin, matte surface grooves read as mineral cracks. They stay on
        // the lower outer cheeks, clear of the eyebrows, eyes, blush and smile.
        var crackM=new THREE.MeshBasicMaterial({color:0x624330,transparent:true,opacity:0.48,depthWrite:false,fog:true});
        function addRockCrack(points){
            var curve=new THREE.CatmullRomCurve3(points.map(function(p){return new THREE.Vector3(p[0],p[1],p[2]);}));
            var crack=new THREE.Mesh(new THREE.TubeGeometry(curve,8,0.0042,4,false),crackM);
            crack.renderOrder=3;crack.frustumCulled=false;body.add(crack);rockSurfaceMarks.push(crack);
        }
        addRockCrack([[-0.43,-0.24,0.575],[-0.37,-0.29,0.604],[-0.40,-0.35,0.553]]);
        addRockCrack([[-0.37,-0.29,0.605],[-0.30,-0.32,0.625]]);
        addRockCrack([[0.49,0.05,0.510],[0.50,-0.02,0.505],[0.47,-0.08,0.540]]);
        addRockCrack([[0.50,-0.02,0.506],[0.44,-0.04,0.574]]);
    }else if(type==='cockroach'){
        // Two smooth mineral-blue wind ribbons form an aerodynamic crest without
        // resembling insect antennae or borrowing another character's silhouette.
        var windMat=softPBR(0xBDEFE9,{pastelAmount:0.01,roughness:0.34,clearcoat:0.28,clearcoatRoughness:0.22,emissive:0x2F7E83,emissiveIntensity:0.045});
        var windLightMat=softPBR(0xFFF3CD,{pastelAmount:0.01,roughness:0.38,clearcoat:0.20});
        var windGroup=new THREE.Group();windGroup.name='danbo-wind-crest';windGroup.userData._restZ=0;windGroup.userData._phase=0.8;
        var windCurve=new THREE.CubicBezierCurve3(
            new THREE.Vector3(-0.25,0.57,0.49),new THREE.Vector3(-0.10,0.73,0.43),
            new THREE.Vector3(0.14,0.71,0.42),new THREE.Vector3(0.30,0.58,0.47)
        );
        var windRibbon=new THREE.Mesh(new THREE.TubeGeometry(windCurve,18,0.024,8,false),windMat);windRibbon.castShadow=true;windGroup.add(windRibbon);
        var windCurve2=new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(-0.10,0.52,0.57),new THREE.Vector3(0.08,0.62,0.53),new THREE.Vector3(0.23,0.53,0.54)
        );
        var windRibbon2=new THREE.Mesh(new THREE.TubeGeometry(windCurve2,14,0.013,7,false),windLightMat);windRibbon2.castShadow=true;windGroup.add(windRibbon2);
        var windTip=new THREE.Mesh(new THREE.SphereGeometry(0.052,high?16:10,high?10:7),windMat);
        windTip.position.set(0.315,0.575,0.472);windTip.scale.set(1.28,0.38,0.34);windTip.rotation.z=-0.42;windTip.castShadow=true;windGroup.add(windTip);
        body.add(windGroup);windDetails.push(windGroup);
    }

    var lidMat=softPBR(_charMixHex(color,0xFFE9F4,0.30),{roughness:0.42}),blinkLids=[];
    [-1,1].forEach(function(s){var lid=new THREE.Mesh(new THREE.CircleGeometry(0.145,24),lidMat);lid.position.set(s*0.225,0.19,0.723);lid.scale.set(0.68,0.08,1);lid.visible=false;body.add(lid);blinkLids.push(lid);});g.userData._blinkLids=blinkLids;

    var fistMat=softPBR(0xFFFFFF,{roughness:0.35}),rightArm=new THREE.Mesh(new THREE.SphereGeometry(0.235,high?20:14,high?14:10),fistMat),leftArm=new THREE.Mesh(new THREE.SphereGeometry(0.235,high?20:14,high?14:10),fistMat);
    rightArm.name='danbo-combat-hand-right';leftArm.name='danbo-combat-hand-left';
    rightArm.position.set(0.4,0.2,0.7);leftArm.position.set(-0.4,0.2,0.7);rightArm.visible=leftArm.visible=false;body.add(rightArm);body.add(leftArm);
    var legMat=softPBR(accent,{roughness:0.38}),rightLeg=new THREE.Mesh(new THREE.CylinderGeometry(0.10,0.14,0.72,10),legMat),leftLeg=new THREE.Mesh(new THREE.CylinderGeometry(0.10,0.14,0.72,10),legMat);
    rightLeg.position.set(0.24,0.12,0.52);leftLeg.position.set(-0.24,0.12,0.52);rightLeg.rotation.x=leftLeg.rotation.x=-Math.PI/3;rightLeg.visible=leftLeg.visible=false;g.add(rightLeg);g.add(leftLeg);

    g.userData.body=body;g.userData.feet=feet;g.userData._charType=charType;
    g.userData._angelWings=angelWings;g.userData._crystalSparkles=crystalSparkles;g.userData._crystalEars=crystalEars;
    g.userData._candyEars=candyEars;g.userData._flowerDetails=flowerDetails;g.userData._forestLeaves=forestLeaves;g.userData._rockDetails=rockDetails;g.userData._rockSurfaceMarks=rockSurfaceMarks;g.userData._starDetails=starDetails;g.userData._windDetails=windDetails;
    g.userData._eyeWhites=_eyeWhites;g.userData._pupils=_pupils;g.userData._shines=_shines;g.userData._eyeBaseScales=_eyeBaseScales;g.userData._smile=smile;g.userData._eyeY=0.19;
    g.userData.rightArm=rightArm;g.userData.leftArm=leftArm;g.userData.rightLeg=rightLeg;g.userData.leftLeg=leftLeg;
    // The switchable selection roster keeps both variants. Normal NPCs and the
    // cinematic player skip the hidden rig entirely to avoid dozens of unused
    // meshes in crowded cities.
    if(includeClassicRig)_addClassicArcadeFighterRig(g,body,color,accent,type);
    return g;
}

function createEggMesh(color, accent, charType, displayStyle, includeClassicRig) {
    // Always use the clean mascot mesh. The older detailed mesh below is kept as
    // a fallback reference only, but we no longer enter it so cached style flags
    // cannot bring back the cluttered/human-looking characters.
    var resolvedStyle=displayStyle==='classic'?'classic':'cinematic';
    return _setCharacterMeshStyle(_createCuteRoundCharacterMesh(color,accent,charType,resolvedStyle==='classic'||includeClassicRig===true),resolvedStyle);
    var g = new THREE.Group();
    var bodyGeo = new THREE.SphereGeometry(0.6,20,14);
    var pos = bodyGeo.attributes.position;
    // Species-specific body deformation
    if (charType==='dog') {
        // Ken — normal build (same as Ryu)
        for(var i=0;i<pos.count;i++){
            var y=pos.getY(i); var t=(y+0.6)/1.2;
            var s=0.9+0.25*Math.sin(t*Math.PI)-0.08*t;
            pos.setX(i,pos.getX(i)*s); pos.setZ(i,pos.getZ(i)*s); pos.setY(i,y*1.05);
        }
    } else if (charType==='monkey') {
        // Chun-Li — slim feminine build, narrower waist, taller
        for(var i=0;i<pos.count;i++){
            var y=pos.getY(i); var t=(y+0.6)/1.2;
            var s=0.7+0.2*Math.sin(t*Math.PI)-0.1*t;
            pos.setX(i,pos.getX(i)*s); pos.setZ(i,pos.getZ(i)*s); pos.setY(i,y*1.15);
        }
    } else if (charType==='rooster') {
        // Guile — normal build (same as Ryu)
        for(var i=0;i<pos.count;i++){
            var y=pos.getY(i); var t=(y+0.6)/1.2;
            var s=0.9+0.25*Math.sin(t*Math.PI)-0.08*t;
            pos.setX(i,pos.getX(i)*s); pos.setZ(i,pos.getZ(i)*s); pos.setY(i,y*1.05);
        }
    } else if (charType==='cockroach') {
        // Dhalsim — very thin and tall
        for(var i=0;i<pos.count;i++){
            var y=pos.getY(i); var t=(y+0.6)/1.2;
            var s=0.45+0.1*Math.sin(t*Math.PI);
            pos.setX(i,pos.getX(i)*s); pos.setZ(i,pos.getZ(i)*s); pos.setY(i,y*1.2);
        }
    } else if (charType==='cat') {
        // Blanka — round ball shape
        for(var i=0;i<pos.count;i++){
            var y=pos.getY(i); var t=(y+0.6)/1.2;
            var s=1.1+0.2*Math.sin(t*Math.PI);
            pos.setX(i,pos.getX(i)*s); pos.setZ(i,pos.getZ(i)*s); pos.setY(i,y*0.9);
        }
    } else if (charType==='bull') {
        // Honda/Buffalo — round ball shape
        for(var i=0;i<pos.count;i++){
            var y=pos.getY(i); var t=(y+0.6)/1.2;
            var s=1.1+0.2*Math.sin(t*Math.PI);
            pos.setX(i,pos.getX(i)*s); pos.setZ(i,pos.getZ(i)*s); pos.setY(i,y*0.9);
        }
    } else if (charType==='bear') {
        // Zangief/Bear — 1.5x bigger than normal, muscular
        for(var i=0;i<pos.count;i++){
            var y=pos.getY(i); var t=(y+0.6)/1.2;
            var s=(0.9+0.25*Math.sin(t*Math.PI)-0.08*t)*1.5;
            pos.setX(i,pos.getX(i)*s); pos.setZ(i,pos.getZ(i)*s); pos.setY(i,y*1.05);
        }
    } else {
        for(var i=0;i<pos.count;i++){
            var y=pos.getY(i); var t=(y+0.6)/1.2;
            var s=0.9+0.25*Math.sin(t*Math.PI)-0.08*t;
            pos.setX(i,pos.getX(i)*s); pos.setZ(i,pos.getZ(i)*s); pos.setY(i,y*1.1);
        }
    }
    bodyGeo.computeVertexNormals();
    var body=new THREE.Mesh(bodyGeo,toon(color));
    body.position.y=0.7; body.receiveShadow=true; g.add(body);

    // Cracked eggshell — ONLY for egg character
    if (charType==='egg') {
        var shellMat=toon(0xFFFFF0);
        for(var si=0;si<5;si++){
            var sa=si/5*Math.PI*2+0.3;
            var sh=0.08+Math.random()*0.12;
            var sw=0.15+Math.random()*0.08;
            var shard=new THREE.Mesh(new THREE.BoxGeometry(sw,sh,0.03),shellMat);
            shard.position.set(Math.cos(sa)*0.28,1.15+sh*0.5,Math.sin(sa)*0.28);
            shard.rotation.z=Math.cos(sa)*0.3;
            shard.rotation.x=-Math.sin(sa)*0.3;
            shard.rotation.y=sa;
            body.add(shard);
        }
        var rimGeo=new THREE.TorusGeometry(0.3,0.03,6,16);
        var rim=new THREE.Mesh(rimGeo,shellMat);
        rim.position.y=1.12;rim.rotation.x=Math.PI/2;
        body.add(rim);
        // Ryu headband — red band around top of head with trailing ends
        var hbMat=toon(0xCC2222);
        var hbGeo=new THREE.TorusGeometry(0.32,0.035,6,20);
        var headband=new THREE.Mesh(hbGeo,hbMat);
        headband.position.y=1.05;headband.rotation.x=Math.PI/2;
        body.add(headband);
        // Trailing ends at back
        [-1,1].forEach(function(s){
            var trail=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.22,0.025),hbMat);
            trail.position.set(s*0.12,0.92,-0.32);
            trail.rotation.z=s*0.25;trail.rotation.x=0.3;
            body.add(trail);
        });
    }

    // Big cute eyes
    var eyeWhiteG=new THREE.SphereGeometry(0.17,12,10);
    var pupilG=new THREE.SphereGeometry(0.1,10,8);
    var shineG=new THREE.SphereGeometry(0.04,6,4);
    var eyeY=0.88;
    var _eyeWhites=[],_pupils=[],_shines=[];
    [-1,1].forEach(function(s){
        var ew=new THREE.Mesh(eyeWhiteG,toon(0xffffff));
        ew.position.set(s*0.24, eyeY, 0.46); ew.scale.set(1,1.2,0.7);
        body.add(ew);_eyeWhites.push(ew);
        var ep=new THREE.Mesh(pupilG,toon(0x222222));
        ep.position.set(s*0.24, eyeY-0.02, 0.53);
        body.add(ep);_pupils.push(ep);
        var es=new THREE.Mesh(shineG,toon(0xffffff));
        es.position.set(s*0.24+s*0.04, eyeY+0.04, 0.56);
        body.add(es);_shines.push(es);
    });

    // Smile
    var smileCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-0.12, 0.62, 0.52),
        new THREE.Vector3(0, 0.56, 0.55),
        new THREE.Vector3(0.12, 0.62, 0.52)
    );
    var smileGeo = new THREE.TubeGeometry(smileCurve, 10, 0.025, 6, false);
    var _smileMesh=new THREE.Mesh(smileGeo, toon(0x333333));
    body.add(_smileMesh);

    // Blush cheeks
    var blG=new THREE.CircleGeometry(0.1,12);
    var blM=toon(0xff7777,{transparent:true,opacity:0.45,side:THREE.DoubleSide});
    [-1,1].forEach(function(s){
        var bl=new THREE.Mesh(blG,blM);
        bl.position.set(s*0.38, 0.72, 0.42); bl.rotation.y=s*0.5;
        body.add(bl);
    });

    // Small arms (Q-style stubs)
    var armMat=toon(color);
    [-1,1].forEach(function(s){
        var arm=new THREE.Mesh(new THREE.SphereGeometry(0.1,6,4),armMat);
        arm.position.set(s*0.52,0.65,0);
        arm.scale.set(0.8,1.2,0.8);
        body.add(arm);
    });

    // Character-specific features
    if (charType==='dog') {
        var earG=new THREE.SphereGeometry(0.18,8,6); earG.scale(1,1.8,0.6);
        [-1,1].forEach(function(s){
            var ear=new THREE.Mesh(earG,toon(0xA0704A));
            ear.position.set(s*0.42,1.05,0.1); ear.rotation.z=s*0.6;
            body.add(ear);
        });
        var nose=new THREE.Mesh(new THREE.SphereGeometry(0.1,6,4),toon(0x333333));
        nose.position.set(0,0.72,0.55); body.add(nose);
        // Short tail
        var dtail=new THREE.Mesh(new THREE.SphereGeometry(0.1,6,4),toon(0xA0704A));
        dtail.position.set(0,0.75,-0.55); dtail.scale.set(0.8,1.2,0.8);
        body.add(dtail);
        // Ken blonde hair tuft — spiky yellow on top
        var kenHairMat=toon(0xFFDD44);
        for(var khi=0;khi<6;khi++){
            var kha=khi/6*Math.PI*2;
            var spike=new THREE.Mesh(new THREE.ConeGeometry(0.05,0.2,4),kenHairMat);
            spike.position.set(Math.cos(kha)*0.12,1.2+Math.random()*0.08,Math.sin(kha)*0.1);
            spike.rotation.z=Math.cos(kha)*0.4;spike.rotation.x=-Math.sin(kha)*0.3;
            body.add(spike);
        }
        // Center tall spike
        var centerSpike=new THREE.Mesh(new THREE.ConeGeometry(0.06,0.25,4),kenHairMat);
        centerSpike.position.set(0,1.3,0);
        body.add(centerSpike);
        // Protruding muzzle/snout
        var dogSnout=new THREE.Mesh(new THREE.SphereGeometry(0.15,8,6),toon(0xC08060));
        dogSnout.position.set(0,0.68,0.55);dogSnout.scale.set(1.0,0.7,0.7);
        body.add(dogSnout);
        // Small tongue hanging out
        var tongue=new THREE.Mesh(new THREE.SphereGeometry(0.05,6,4),toon(0xFF6688));
        tongue.position.set(0.04,0.58,0.6);tongue.scale.set(0.8,1.5,0.5);
        body.add(tongue);
        // Paw-print toes on feet
        [-1,1].forEach(function(s){
            for(var pi=0;pi<3;pi++){
                var paw=new THREE.Mesh(new THREE.SphereGeometry(0.03,4,4),toon(0x555555));
                paw.position.set(s*0.2+(pi-1)*0.05,-0.58,0.14);
                body.add(paw);
            }
            // Central pad
            var pad=new THREE.Mesh(new THREE.SphereGeometry(0.04,4,4),toon(0x555555));
            pad.position.set(s*0.2,-0.56,0.08);
            body.add(pad);
        });
    } else if (charType==='cat') {
        // Blanka — wild beast traits
        var cearG=new THREE.ConeGeometry(0.14,0.35,4);
        [-1,1].forEach(function(s){
            var ear=new THREE.Mesh(cearG,toon(color));
            ear.position.set(s*0.32,1.2,0.1);ear.rotation.z=s*0.2;
            body.add(ear);
            var inner=new THREE.Mesh(new THREE.ConeGeometry(0.08,0.2,4),toon(0xFFBBAA));
            inner.position.set(s*0.32,1.18,0.14);inner.rotation.z=s*0.2;
            body.add(inner);
        });
        // Wild mane — orange, more prominent
        for(var _bmi=0;_bmi<12;_bmi++){
            var _bma=_bmi/12*Math.PI*2;
            var spike=new THREE.Mesh(new THREE.ConeGeometry(0.08,0.35,4),toon(0xFF8800));
            spike.position.set(Math.cos(_bma)*0.38,1.1+Math.random()*0.2,Math.sin(_bma)*0.25);
            spike.rotation.z=Math.cos(_bma)*0.5;spike.rotation.x=-Math.sin(_bma)*0.4;
            body.add(spike);
        }
        // Extra top mane tufts
        for(var _bti=0;_bti<4;_bti++){
            var _bta=_bti/4*Math.PI*2+0.4;
            var topSpike=new THREE.Mesh(new THREE.ConeGeometry(0.06,0.28,4),toon(0xFF8800));
            topSpike.position.set(Math.cos(_bta)*0.15,1.35,Math.sin(_bta)*0.12);
            body.add(topSpike);
        }
        // Fangs
        [-1,1].forEach(function(s){
            var fang=new THREE.Mesh(new THREE.ConeGeometry(0.03,0.1,4),toon(0xFFFFFF));
            fang.position.set(s*0.12,0.5,0.55);fang.rotation.x=Math.PI;
            body.add(fang);
        });
        var whG=new THREE.CylinderGeometry(0.008,0.008,0.4,3);
        [-1,1].forEach(function(s){
            for(var w=-1;w<=1;w++){
                var wh=new THREE.Mesh(whG,toon(0x888888));
                wh.position.set(s*0.35,0.7+w*0.06,0.45);
                wh.rotation.z=Math.PI/2+s*0.15+w*0.1;
                body.add(wh);
            }
        });
        // Curved tail
        var catTailPts=[];
        for(var ct=0;ct<=8;ct++){
            var ctt=ct/8;
            catTailPts.push(new THREE.Vector3(0, 0.7+ctt*0.4, -0.5-ctt*0.5+Math.sin(ctt*Math.PI)*0.2));
        }
        var catTailCurve=new THREE.CatmullRomCurve3(catTailPts);
        var catTailGeo=new THREE.TubeGeometry(catTailCurve,12,0.04,6,false);
        body.add(new THREE.Mesh(catTailGeo,toon(color)));
        // Darker stripe markings on body (3 horizontal stripes)
        var stripeMat=toon(0x1A6600);
        for(var sti=0;sti<3;sti++){
            var stripeY=0.35+sti*0.2;
            // Front stripe
            var stripeF=new THREE.Mesh(new THREE.BoxGeometry(0.45,0.04,0.02),stripeMat);
            stripeF.position.set(0,stripeY,0.52);body.add(stripeF);
            // Left side stripe
            var stripeL=new THREE.Mesh(new THREE.BoxGeometry(0.02,0.04,0.35),stripeMat);
            stripeL.position.set(-0.52,stripeY,0.1);body.add(stripeL);
            // Right side stripe
            var stripeR=new THREE.Mesh(new THREE.BoxGeometry(0.02,0.04,0.35),stripeMat);
            stripeR.position.set(0.52,stripeY,0.1);body.add(stripeR);
        }
        // Bigger cat-like slit pupils (cover existing round pupils)
        [-1,1].forEach(function(s){
            var slitPupil=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.18,0.02),toon(0x111111));
            slitPupil.position.set(s*0.24,0.86,0.555);
            body.add(slitPupil);
        });
    } else if (charType==='monkey') {
        var mearG=new THREE.SphereGeometry(0.18,8,6);
        [-1,1].forEach(function(s){
            var ear=new THREE.Mesh(mearG,toon(0xFFCC88));
            ear.position.set(s*0.5,0.9,0); ear.scale.z=0.5;
            body.add(ear);
            var inner=new THREE.Mesh(new THREE.SphereGeometry(0.12,6,4),toon(0xD4956B));
            inner.position.set(s*0.5,0.9,0.05); inner.scale.z=0.5;
            body.add(inner);
        });
        var muz=new THREE.Mesh(new THREE.SphereGeometry(0.2,8,6),toon(0xFFCC88));
        muz.position.set(0,0.65,0.45); muz.scale.set(1.2,0.8,0.6);
        body.add(muz);
        // Chun-Li hair buns — two spheres on sides with ribbons
        var bunMat=toon(0x222222);
        [-1,1].forEach(function(s){
            var bun=new THREE.Mesh(new THREE.SphereGeometry(0.16,8,6),bunMat);
            bun.position.set(s*0.48,1.15,0);
            body.add(bun);
            // Bun cover/wrap
            var wrap=new THREE.Mesh(new THREE.TorusGeometry(0.12,0.03,6,12),toon(0xFFFFFF));
            wrap.position.set(s*0.48,1.15,0);wrap.rotation.y=Math.PI/2;
            body.add(wrap);
            // Ribbon trailing down
            var ribbon=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.25,0.02),toon(0xFFFFFF));
            ribbon.position.set(s*0.52,0.95,0);ribbon.rotation.z=s*0.15;
            body.add(ribbon);
        });
        // Long tail (>=0.6x body)
        var monkTailPts=[];
        for(var mt=0;mt<=10;mt++){
            var mtt=mt/10;
            monkTailPts.push(new THREE.Vector3(
                Math.sin(mtt*Math.PI*0.5)*0.15,
                0.6-mtt*0.3+Math.sin(mtt*Math.PI)*0.3,
                -0.5-mtt*0.7
            ));
        }
        var monkTailCurve=new THREE.CatmullRomCurve3(monkTailPts);
        var monkTailGeo=new THREE.TubeGeometry(monkTailCurve,14,0.04,6,false);
        body.add(new THREE.Mesh(monkTailGeo,toon(0x2255CC)));
        // Lighter belly patch (front of body)
        var bellyPatch=new THREE.Mesh(new THREE.SphereGeometry(0.3,10,8),toon(0xFFDDBB));
        bellyPatch.position.set(0,0.45,0.38);bellyPatch.scale.set(0.8,1.0,0.3);
        body.add(bellyPatch);
        // Curled tail tip with puff ball
        var tailPuff=new THREE.Mesh(new THREE.SphereGeometry(0.07,6,4),toon(0x2255CC));
        tailPuff.position.set(0.15,0.35,-1.15);
        body.add(tailPuff);
    } else if (charType==='rooster') {
        for(var ri=0;ri<3;ri++){
            var cb=new THREE.Mesh(new THREE.SphereGeometry(0.1,6,4),toon(0xFF3333));
            cb.position.set(-0.08+ri*0.08,1.25+Math.abs(ri-1)*0.04,0.15);
            body.add(cb);
        }
        var wat=new THREE.Mesh(new THREE.SphereGeometry(0.08,6,4),toon(0xFF3333));
        wat.position.set(0,0.52,0.5); wat.scale.y=1.5; body.add(wat);
        var beak=new THREE.Mesh(new THREE.ConeGeometry(0.06,0.18,4),toon(0xFFAA00));
        beak.position.set(0,0.7,0.58); beak.rotation.x=-Math.PI/2;
        body.add(beak);
        // Guile blonde flat-top — rectangular yellow block on top
        var flatTop=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.2,0.3),toon(0xFFDD44));
        flatTop.position.set(0,1.35,0);
        body.add(flatTop);
        // Flat-top side edges for sharp military look
        [-1,1].forEach(function(s){
            var sideFlat=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.18,0.25),toon(0xFFDD44));
            sideFlat.position.set(s*0.22,1.33,0);
            body.add(sideFlat);
        });
        // Bigger wings (scaled up)
        [-1,1].forEach(function(s){
            var wing=new THREE.Mesh(new THREE.SphereGeometry(0.25,8,6),toon(0x556B2F));
            wing.position.set(s*0.58,0.6,-0.05);
            wing.scale.set(0.5,1.3,1.0); wing.rotation.z=s*0.3;
            body.add(wing);
            // Wing tip feather detail
            var wingTip=new THREE.Mesh(new THREE.ConeGeometry(0.08,0.2,4),toon(0x556B2F));
            wingTip.position.set(s*0.72,0.45,-0.05);wingTip.rotation.z=s*0.8;
            body.add(wingTip);
        });
        // Fan-shaped tail feathers (more feathers spread wider)
        for(var fi=0;fi<7;fi++){
            var fAngle=(fi-3)*0.25;
            var fColor=(fi%2===0)?0x556B2F:0xFFDD44;
            var feather=new THREE.Mesh(new THREE.ConeGeometry(0.05,0.45,4),toon(fColor));
            feather.position.set(Math.sin(fAngle)*0.15,0.8+Math.abs(fi-3)*0.04,-0.55);
            feather.rotation.x=0.5+Math.abs(fi-3)*0.08;
            feather.rotation.y=fAngle*0.3;
            body.add(feather);
        }
        // Spurs on feet
        [-1,1].forEach(function(s){
            var spur=new THREE.Mesh(new THREE.ConeGeometry(0.025,0.12,4),toon(0xCCAA00));
            spur.position.set(s*0.2,-0.6,-0.08);spur.rotation.x=0.5;
            body.add(spur);
        });
    } else if (charType==='cockroach') {
        // Dhalsim — elongated body with skull necklace
        // Twin-tail antennae (hair-style)
        var antennae=[];
        [-1,1].forEach(function(s){
            var antPts=[];
            for(var ai=0;ai<=6;ai++){
                var att=ai/6;
                antPts.push(new THREE.Vector3(s*0.1+s*att*0.35, 1.1+att*0.5, 0.1-att*0.15));
            }
            var antCurve=new THREE.CatmullRomCurve3(antPts);
            var antGeo=new THREE.TubeGeometry(antCurve,10,0.025,6,false);
            var ant=new THREE.Mesh(antGeo,toon(0x5C2E0A));
            ant.userData._antSide=s;
            body.add(ant);
            antennae.push(ant);
            var tip=new THREE.Mesh(new THREE.SphereGeometry(0.05,6,4),toon(0x8B6040));
            tip.position.set(s*0.45,1.6,-0.05);
            tip.userData._antSide=s;
            body.add(tip);
            antennae.push(tip);
        });
        g.userData._antennae=antennae;
        // Shell line
        var sline=new THREE.Mesh(new THREE.BoxGeometry(0.02,0.6,0.02),toon(0x3D2215));
        sline.position.set(0,0.8,-0.1); body.add(sline);
        // Small legs
        [-1,1].forEach(function(s){
            for(var j=0;j<2;j++){
                var leg=new THREE.Mesh(new THREE.CylinderGeometry(0.015,0.015,0.25,3),toon(0x5C2E0A));
                leg.position.set(s*0.45,0.4+j*0.25,0); leg.rotation.z=s*0.8;
                body.add(leg);
            }
        });
        // Skull necklace — 3 small white spheres around neck
        var skullMat=toon(0xFFFFFF);
        for(var ski=0;ski<3;ski++){
            var ska=(ski-1)*0.7;
            var skull=new THREE.Mesh(new THREE.SphereGeometry(0.06,6,4),skullMat);
            skull.position.set(Math.sin(ska)*0.35,0.48,Math.cos(ska)*0.35);
            body.add(skull);
            // Eye holes on each skull
            [-1,1].forEach(function(s){
                var hole=new THREE.Mesh(new THREE.SphereGeometry(0.015,4,3),toon(0x111111));
                hole.position.set(Math.sin(ska)*0.35+s*0.02,0.5,Math.cos(ska)*0.35+0.03);
                body.add(hole);
            });
        }
        // Elongate body slightly more
        body.scale.y=1.1;
        // Wing cases on back (two elliptical translucent shapes)
        var wingCaseMat=toon(0x7B5030,{transparent:true,opacity:0.5});
        [-1,1].forEach(function(s){
            var wingCase=new THREE.Mesh(new THREE.SphereGeometry(0.22,8,6),wingCaseMat);
            wingCase.position.set(s*0.12,0.7,-0.35);
            wingCase.scale.set(0.8,1.4,0.3);
            wingCase.rotation.z=s*0.15;
            body.add(wingCase);
        });
        // Wider/flatter body shape enhancement
        body.scale.x=1.15;body.scale.z=0.9;
    } else if (charType==='bull') {
        // Buffalo (野牛) — Honda moveset
        // Big bull horns (牛魔王 style) — horizontal outward then curve up
        [-1,1].forEach(function(s){
            // Horn root — thick, horizontal outward from head sides
            var hornRoot=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.1,0.25,8),toon(0x333333));
            hornRoot.position.set(s*0.35,1.0,0.0);hornRoot.rotation.z=s*Math.PI/2;body.add(hornRoot);
            // Horn mid — angled upward
            var hornMid=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.08,0.25,8),toon(0x444444));
            hornMid.position.set(s*0.55,1.1,0.0);hornMid.rotation.z=s*Math.PI/3;body.add(hornMid);
            // Horn tip — pointed upward
            var hornTip=new THREE.Mesh(new THREE.ConeGeometry(0.04,0.2,6),toon(0xCCBB88));
            hornTip.position.set(s*0.62,1.3,0.0);hornTip.rotation.z=s*Math.PI/6;body.add(hornTip);
        });
        // Nose ring
        var ringG=new THREE.TorusGeometry(0.06,0.015,6,12,Math.PI);
        var ring=new THREE.Mesh(ringG,toon(0xCCAA00));
        ring.position.set(0,0.6,0.58);ring.rotation.x=Math.PI/2;body.add(ring);
        // Wide nostrils
        [-1,1].forEach(function(s){
            var nos=new THREE.Mesh(new THREE.SphereGeometry(0.04,4,4),toon(0x2A1A0A));
            nos.position.set(s*0.08,0.65,0.55);body.add(nos);
        });
        // Sumo topknot (Honda trait)
        var topknot=new THREE.Mesh(new THREE.SphereGeometry(0.1,6,4),toon(0x222222));
        topknot.position.set(0,1.22,0);body.add(topknot);
        // Face paint stripes (Honda signature)
        [-1,1].forEach(function(s){
            var blueStripe=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.25,0.02),toon(0x2244AA));
            blueStripe.position.set(s*0.16,0.82,0.56);body.add(blueStripe);
        });
        var redStripe=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.05,0.02),toon(0xCC2222));
        redStripe.position.set(0,0.9,0.55);body.add(redStripe);
        // Short tail
        var bufTail=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.01,0.2,4),toon(0x2A1A0A));
        bufTail.position.set(0,0.65,-0.55);bufTail.rotation.x=0.5;body.add(bufTail);
        var tailTuft=new THREE.Mesh(new THREE.SphereGeometry(0.04,4,4),toon(0x222222));
        tailTuft.position.set(0,0.58,-0.63);body.add(tailTuft);
        // Wider protruding muzzle/snout area
        var bullSnout=new THREE.Mesh(new THREE.SphereGeometry(0.2,8,6),toon(0x3A2A1A));
        bullSnout.position.set(0,0.62,0.52);bullSnout.scale.set(1.3,0.7,0.6);
        body.add(bullSnout);
        // Bigger nostrils (replace small ones with larger)
        [-1,1].forEach(function(s){
            var bigNos=new THREE.Mesh(new THREE.SphereGeometry(0.06,6,4),toon(0x1A0A00));
            bigNos.position.set(s*0.1,0.6,0.6);body.add(bigNos);
        });
        // Hoof-shaped darker feet
        [-1,1].forEach(function(s){
            var hoof=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.12,0.06,8),toon(0x2A1A0A));
            hoof.position.set(s*0.2,-0.6,0.06);
            body.add(hoof);
        });
    } else if (charType==='bear') {
        // Bear with boar mask (Inosuke style) — Zangief moveset
        // Round bear ears
        [-1,1].forEach(function(s){
            var ear=new THREE.Mesh(new THREE.SphereGeometry(0.14,8,6),toon(0x6B4A2A));
            ear.position.set(s*0.35,1.15,0.05);body.add(ear);
            var earInner=new THREE.Mesh(new THREE.SphereGeometry(0.08,6,4),toon(0xAA7755));
            earInner.position.set(s*0.35,1.15,0.1);body.add(earInner);
        });
        // Boar mask on face (lighter color, snout shape)
        var mask=new THREE.Mesh(new THREE.SphereGeometry(0.35,8,6),toon(0xDDCCAA));
        mask.position.set(0,0.82,0.35);mask.scale.set(1,0.8,0.6);body.add(mask);
        // Boar snout
        var snout=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.14,0.15,8),toon(0xCCBB99));
        snout.position.set(0,0.7,0.55);snout.rotation.x=Math.PI/2;body.add(snout);
        [-1,1].forEach(function(s){
            var nos=new THREE.Mesh(new THREE.SphereGeometry(0.035,4,4),toon(0x885544));
            nos.position.set(s*0.05,0.7,0.63);body.add(nos);
        });
        // Boar tusks
        [-1,1].forEach(function(s){
            var tusk=new THREE.Mesh(new THREE.ConeGeometry(0.025,0.12,4),toon(0xFFFFF0));
            tusk.position.set(s*0.1,0.6,0.58);tusk.rotation.x=-0.3;tusk.rotation.z=s*0.2;body.add(tusk);
        });
        // Chest hair — Zangief trait (bigger, more visible)
        var chestHairMat=toon(0x8B4513);
        for(var chi=0;chi<9;chi++){
            var cha=(chi-4)*0.1;
            var chv=0.35+Math.abs(chi-4)*0.02;
            var hair=new THREE.Mesh(new THREE.ConeGeometry(0.04,0.18,3),chestHairMat);
            hair.position.set(cha,chv,0.5);hair.rotation.x=-0.4;
            body.add(hair);
        }
        // Scars — Zangief trait (large X-shaped scars on chest)
        var scarMat=toon(0xFF6666);
        // Big X scar on chest center
        var scar1=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.05,0.05),scarMat);
        scar1.position.set(0,0.25,0.5);scar1.rotation.z=0.6;body.add(scar1);
        var scar2=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.05,0.05),scarMat);
        scar2.position.set(0,0.25,0.5);scar2.rotation.z=-0.6;body.add(scar2);
        // Scar on left side
        var scar3=new THREE.Mesh(new THREE.BoxGeometry(0.35,0.05,0.05),scarMat);
        scar3.position.set(-0.45,0.3,0.2);scar3.rotation.z=0.4;body.add(scar3);
        // Scar on right side
        var scar4=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.05,0.05),scarMat);
        scar4.position.set(0.45,0.2,0.15);scar4.rotation.z=-0.3;body.add(scar4);
        // Scar on back
        var scar5=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.05,0.05),scarMat);
        scar5.position.set(0.1,0.3,-0.45);scar5.rotation.z=0.5;body.add(scar5);
        // Short stubby bear tail
        var bearTail=new THREE.Mesh(new THREE.SphereGeometry(0.08,6,4),toon(0x6B4A2A));
        bearTail.position.set(0,0.65,-0.55);body.add(bearTail);
        // Bigger bear paws (larger arms/stubs)
        var bearPawMat=toon(0x6B4A2A);
        [-1,1].forEach(function(s){
            var paw=new THREE.Mesh(new THREE.SphereGeometry(0.18,8,6),bearPawMat);
            paw.position.set(s*0.6,0.55,0.1);paw.scale.set(0.9,1.0,0.9);
            body.add(paw);
            // Visible claws (small cones on paws)
            for(var ci=0;ci<3;ci++){
                var claw=new THREE.Mesh(new THREE.ConeGeometry(0.02,0.1,4),toon(0xEEDDCC));
                claw.position.set(s*0.65+(ci-1)*0.06,0.42,0.15);
                claw.rotation.x=-0.3;
                body.add(claw);
            }
        });
    }

    _addCharacterPolish(g,body,color,accent,charType);

    // Feet
    var ftG=new THREE.SphereGeometry(0.14,8,6); ftG.scale(1.1,0.45,1.4);
    var ftM=toon(accent||0xFFCC00);
    var feet=[];
    [-1,1].forEach(function(s){ var ft=new THREE.Mesh(ftG,ftM); ft.position.set(s*0.2,0.05,0.06); g.add(ft); feet.push(ft); });
    _addPremiumCharacterRig(g,body,color,accent,charType,feet);
    // Attack limbs (hidden by default, shown during punch/kick)
    var armMat=toon(accent||0xFFCC00);
    var fistMat=toon(0xFFFFFF); // white fists for visibility
    // Fists — white spheres, clearly outside body surface
    var rightArm=new THREE.Mesh(new THREE.SphereGeometry(0.18,8,6),fistMat);
    rightArm.position.set(0.4,0.2,0.7);rightArm.visible=false;body.add(rightArm);
    var leftArm=new THREE.Mesh(new THREE.SphereGeometry(0.18,8,6),fistMat);
    leftArm.position.set(-0.4,0.2,0.7);leftArm.visible=false;body.add(leftArm);
    // Legs — cylinders on the group
    var rightLeg=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.13,0.7,6),armMat);
    rightLeg.position.set(0.22,0.1,0.5);rightLeg.rotation.x=-Math.PI/3;rightLeg.visible=false;g.add(rightLeg);
    var leftLeg=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.13,0.7,6),armMat);
    leftLeg.position.set(-0.22,0.1,0.5);leftLeg.rotation.x=-Math.PI/3;leftLeg.visible=false;g.add(leftLeg);
    g.userData.body=body; g.userData.feet=feet; g.userData._charType=charType;
    g.userData._eyeWhites=_eyeWhites;g.userData._pupils=_pupils;g.userData._shines=_shines;g.userData._smile=_smileMesh;g.userData._eyeY=eyeY;
    g.userData.rightArm=rightArm;g.userData.leftArm=leftArm;
    g.userData.rightLeg=rightLeg;g.userData.leftLeg=leftLeg;
    return g;
}

const allEggs=[];
let playerEgg=null;

var PLAYER_ARROW_DEFAULT_Y=2.25;
var PLAYER_ARROW_EQUIPMENT_CLEARANCE=0.55;
function _updatePlayerArrowClearance(cosmeticRoot){
    if(!playerEgg||!playerEgg.arrow||!playerEgg.mesh)return;
    var baseY=PLAYER_ARROW_DEFAULT_Y;
    if(cosmeticRoot&&cosmeticRoot.children&&cosmeticRoot.children.length){
        playerEgg.mesh.updateMatrixWorld(true);
        var bounds=new THREE.Box3().setFromObject(cosmeticRoot);
        if(!bounds.isEmpty()){
            var topPoint=bounds.getCenter(new THREE.Vector3());topPoint.y=bounds.max.y;
            var topLocal=playerEgg.mesh.worldToLocal(topPoint);
            baseY=Math.max(baseY,topLocal.y+PLAYER_ARROW_EQUIPMENT_CLEARANCE);
        }
    }
    playerEgg.arrow.userData.baseY=baseY;
    playerEgg.arrow.position.set(0,baseY,0);
}

function createEgg(x,z,color,accent,isPlayer,targetScene,charType){
    // Only the selected player inherits the presentation style. NPCs keep the
    // clean mascot look, while the player's arcade costume is exactly the same
    // mesh shown on the selection screen.
    const displayStyle=(isPlayer&&window.DANBO_SELECTED_CHARACTER_STYLE==='classic')?'classic':'cinematic';
    const mesh=createEggMesh(color,accent,charType,displayStyle);
    mesh.position.set(x,0.01,z);
    (targetScene||scene).add(mesh);
    let arrow=null;
    if(isPlayer){
        const ag=new THREE.ConeGeometry(0.25,0.5,8);
        arrow=new THREE.Mesh(ag,toon(0xFFCC00,{emissive:0xFFCC00,emissiveIntensity:0.4}));
        arrow.rotation.x=Math.PI;
        arrow.position.set(0,PLAYER_ARROW_DEFAULT_Y,0);
        arrow.userData.baseY=PLAYER_ARROW_DEFAULT_Y;
        mesh.add(arrow);
    }
    const egg={
        mesh, vx:0,vy:0,vz:0, onGround:false, isPlayer,
        alive:true, finished:false, finishOrder:-1,
        radius:0.55, squash:1, arrow, walkPhase:0,
        aiSkill:0.4+Math.random()*0.6,
        aiTargetX:x, aiReactTimer:Math.random()*30, aiJumpCD:0,
        conveyorVx:0, conveyorVz:0, onPlatform:null,
        heldBy:null, holding:null, grabCD:0, struggleTimer:0, struggleMax:0, struggleBar:null, throwTimer:0, holdingObs:null, holdingProp:null, weight:1.0, _stunTimer:0,
        _origColor:color, _stunMeter:0, _stunThreshold:100,
        _extendedRange:1.0, _hitStun:0, _slamImmune:0,
    };
    allEggs.push(egg);
    return egg;
}

// ---- Drop shadow (dark circle projected straight down) ----
var _dropShadowMesh=null;
function _ensureDropShadow(){
    if(_dropShadowMesh)return;
    var geo=new THREE.CircleGeometry(0.7,16);
    var mat=new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.35,depthWrite:false});
    _dropShadowMesh=new THREE.Mesh(geo,mat);
    _dropShadowMesh.rotation.x=-Math.PI/2;
    _dropShadowMesh.renderOrder=1;
    scene.add(_dropShadowMesh);
}
function _updateDropShadow(){
    if(!playerEgg||!playerEgg.mesh){if(_dropShadowMesh)_dropShadowMesh.visible=false;return;}
    _ensureDropShadow();
    var px=playerEgg.mesh.position.x, py=playerEgg.mesh.position.y, pz=playerEgg.mesh.position.z;
    var isCity=(gameState==='city');
    var groundY=0;
    if(isCity){
        // Check building roofs, props, clouds for highest surface below player
        for(var bi=0;bi<cityColliders.length;bi++){
            var c=cityColliders[bi];
            var dx=px-c.x, dz=pz-c.z;
            // Cone roof
            if(c.roofR&&c.roofH){
                var dist=DANBO_WASM.dist2D(px,pz,c.x,c.z);
                if(dist<c.roofR){
                    var roofBase=c.h||6;
                    var surfY=roofBase+(1-dist/c.roofR)*c.roofH;
                    if(surfY<py&&surfY>groundY)groundY=surfY;
                }
            }
            // Flat roof top
            if(DANBO_WASM.aabb2D(px,pz,c.x,c.z,c.hw,c.hd,0)){
                var roofY2=(c.h||6);
                if(roofY2<py&&roofY2>groundY)groundY=roofY2;
            }
        }
        // Cloud platforms
        for(var ci3=0;ci3<cityCloudPlatforms.length;ci3++){
            var cl=cityCloudPlatforms[ci3];
            if(DANBO_WASM.aabb2D(px,pz,cl.x,cl.z,cl.hw,cl.hd,0)){
                var clTop=cl.y+(cl.top||1.2);
                if(clTop<py&&clTop>groundY)groundY=clTop;
            }
        }
    } else {
        // Race track floor
        var gz=-pz;
        groundY=getFloorY(gz,px);
        if(groundY<-10)groundY=0;
    }
    _dropShadowMesh.visible=true;
    _dropShadowMesh.position.set(px,groundY+0.05,pz);
    // Scale shadow based on height — smaller when higher up
    var height=py-groundY;
    var sc=Math.max(0.3,1.2-height*0.04);
    _dropShadowMesh.scale.set(sc,sc,sc);
    _dropShadowMesh.material.opacity=Math.max(0.08,0.35-height*0.012);
}
