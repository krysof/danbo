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
            if(arm.userData._hand)arm.userData._hand.scale.set(1.08,0.86+Math.sin(now*3.1+side)*0.035,1.0);
        }
    }
    // Gentle eye tracking in the movement direction.
    if(ud._pupils){
        var lookX=Math.max(-0.028,Math.min(0.028,egg.vx*0.18));
        var lookY=egg.vy>0.03?0.018:(egg.vy<-0.04?-0.012:0);
        for(var pi=0;pi<ud._pupils.length;pi++){
            var ps=pi===0?-1:1;
            ud._pupils[pi].position.x+=((ps*0.225+lookX)-ud._pupils[pi].position.x)*0.16;
            ud._pupils[pi].position.y+=((0.125+lookY)-ud._pupils[pi].position.y)*0.16;
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

function _createCuteRoundCharacterMesh(color,accent,charType){
    var g=new THREE.Group(),type=charType||'egg';
    accent=(accent===undefined||accent===null)?0xFF6F7D:accent;
    var high=window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.high;
    var bodyGeo=new THREE.SphereGeometry(0.70,high?48:28,high?32:20);
    var bp=bodyGeo.attributes.position;
    var speciesX=type==='bear'?1.10:(type==='bull'||type==='cat'?1.05:(type==='cockroach'?0.92:1));
    var speciesY=type==='cockroach'?1.08:(type==='bear'?1.03:1);
    for(var bi=0;bi<bp.count;bi++){
        var x=bp.getX(bi),y=bp.getY(bi),z=bp.getZ(bi),ny=y/0.70;
        var taper=1.075-(ny+1)*0.075;
        x*=taper*speciesX;z*=0.97+(1-ny)*0.025;y*=1.08*speciesY;
        if(y<-0.58)y=-0.58+(y+0.58)*0.34;
        bp.setXYZ(bi,x,y,z);
    }
    bodyGeo.computeVertexNormals();
    var bodyMat=softPBR(color,{pastelAmount:0.045,roughness:0.29,clearcoat:0.52,clearcoatRoughness:0.18,envMapIntensity:0.72});
    var body=new THREE.Mesh(bodyGeo,bodyMat);body.position.y=0.79;body.castShadow=true;body.receiveShadow=true;g.add(body);

    var outline=new THREE.Mesh(bodyGeo.clone(),new THREE.MeshBasicMaterial({color:0x251F38,side:THREE.BackSide,transparent:true,opacity:0.065,depthWrite:false}));
    outline.scale.setScalar(1.025);outline.renderOrder=-2;body.add(outline);g.userData._toonOutline=outline;

    var shellColor=_charMixHex(color,0xFFF8EA,0.62);
    var shellMat=softPBR(shellColor,{pastelAmount:0.02,roughness:0.34,clearcoat:0.34,clearcoatRoughness:0.22,envMapIntensity:0.52});
    var rimMat=softPBR(_charMixHex(shellColor,accent,0.18),{pastelAmount:0.02,roughness:0.30,clearcoat:0.38,envMapIntensity:0.54});
    var frontPlate=new THREE.Mesh(new THREE.SphereGeometry(0.48,high?32:20,high?22:14),shellMat);
    frontPlate.position.set(0,-0.06,0.54);frontPlate.scale.set(0.94,1.02,0.24);frontPlate.castShadow=true;body.add(frontPlate);
    var backPlate=new THREE.Mesh(new THREE.SphereGeometry(0.46,high?32:20,high?22:14),shellMat);
    backPlate.position.set(0,-0.035,-0.55);backPlate.scale.set(0.96,1.06,0.23);backPlate.castShadow=true;body.add(backPlate);
    var backRim=new THREE.Mesh(new THREE.TorusGeometry(0.38,0.035,high?14:8,high?48:24),rimMat);
    backRim.position.set(0,-0.035,-0.675);backRim.scale.y=1.08;body.add(backRim);
    var seamMat=softPBR(_charMixHex(shellColor,0x625B6B,0.30),{pastelAmount:0.01,roughness:0.55});
    [[0,-0.37,0,0.31],[-0.26,-0.22,-0.07,0.28],[0.26,-0.22,0.07,0.28]].forEach(function(q){
        var curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(q[0],q[1],-0.695),new THREE.Vector3(q[0]*0.38,0,-0.715),new THREE.Vector3(q[2],q[3],-0.695));
        body.add(new THREE.Mesh(new THREE.TubeGeometry(curve,12,0.012,6,false),seamMat));
    });

    var gloss=new THREE.Mesh(new THREE.CircleGeometry(0.17,24),new THREE.MeshBasicMaterial({color:0xFFFFFF,transparent:true,opacity:0.24,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,fog:false}));
    gloss.position.set(-0.25,0.34,0.70);gloss.scale.set(1,0.46,1);gloss.rotation.z=-0.28;body.add(gloss);

    var eyeG=new THREE.SphereGeometry(0.125,high?24:16,high?18:12);
    var eyeMat=softPBR(0x12182A,{pastelAmount:0,roughness:0.12,clearcoat:0.92,clearcoatRoughness:0.06,envMapIntensity:0.86});
    var irisMat=softPBR(0x3159A8,{pastelAmount:0,roughness:0.18,emissive:0x14285D,emissiveIntensity:0.12});
    var shineMat=new THREE.MeshBasicMaterial({color:0xFFFFFF,fog:false});
    var _eyeWhites=[],_pupils=[],_shines=[],_eyeBaseScales=[];
    [-1,1].forEach(function(s){
        var eye=new THREE.Mesh(eyeG,eyeMat);eye.position.set(s*0.225,0.19,0.665);eye.scale.set(0.68,1.35,0.28);body.add(eye);_eyeWhites.push(eye);_eyeBaseScales.push(eye.scale.clone());
        var iris=new THREE.Mesh(new THREE.SphereGeometry(0.048,12,8),irisMat);iris.position.set(s*0.225,0.125,0.703);iris.scale.set(0.80,1.05,0.22);body.add(iris);_pupils.push(iris);
        var hi=new THREE.Mesh(new THREE.SphereGeometry(0.030,10,8),shineMat);hi.position.set(s*0.195,0.245,0.715);hi.scale.z=0.20;body.add(hi);_shines.push(hi);
        var hi2=new THREE.Mesh(new THREE.SphereGeometry(0.013,8,6),shineMat);hi2.position.set(s*0.245,0.185,0.718);hi2.scale.z=0.18;body.add(hi2);
    });
    var smileCurve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.12,-0.13,0.694),new THREE.Vector3(0,-0.205,0.715),new THREE.Vector3(0.12,-0.13,0.694));
    var smile=new THREE.Mesh(new THREE.TubeGeometry(smileCurve,14,0.018,8,false),softPBR(0x211A25,{pastelAmount:0,roughness:0.55}));body.add(smile);
    var blushG=new THREE.CircleGeometry(0.105,24),blushM=toon(0xFF779F,{transparent:true,opacity:0.48,side:THREE.DoubleSide});
    [-1,1].forEach(function(s){var bl=new THREE.Mesh(blushG,blushM);bl.position.set(s*0.41,-0.055,0.635);bl.scale.set(1.22,0.62,1);bl.rotation.y=s*0.34;body.add(bl);});

    var decorArms=[],armMat=softPBR(color,{pastelAmount:0.045,roughness:0.31,clearcoat:0.40,clearcoatRoughness:0.22,envMapIntensity:0.60});
    [-1,1].forEach(function(s){
        var armG=new THREE.Group(),arm=new THREE.Mesh(new THREE.SphereGeometry(type==='bear'?0.22:0.19,high?24:14,high?16:10),armMat);
        arm.position.y=-0.10;arm.scale.set(0.82,1.34,0.70);arm.castShadow=true;armG.add(arm);
        var hand=new THREE.Mesh(new THREE.SphereGeometry(0.105,high?18:12,high?12:8),shellMat);hand.position.set(0,-0.31,0.03);hand.scale.set(1.08,0.78,0.92);armG.add(hand);armG.userData._hand=hand;
        armG.position.set(s*(type==='bear'?0.73:0.66),0.00,0.015);armG.rotation.z=s*0.48;armG.userData._side=s;armG.userData._restZ=armG.rotation.z;body.add(armG);decorArms.push(armG);
    });
    g.userData._decorArms=decorArms;

    var footColor=_charMixHex(accent,0xFF667A,0.14),ftM=softPBR(footColor,{pastelAmount:0.025,roughness:0.26,clearcoat:0.58,clearcoatRoughness:0.16,envMapIntensity:0.72});
    var ftG=new THREE.SphereGeometry(0.22,high?28:16,high?18:10);ftG.scale(1.42,0.54,1.74);var feet=[];
    [-1,1].forEach(function(s){var ft=new THREE.Mesh(ftG,ftM);ft.castShadow=true;ft.receiveShadow=true;ft.position.set(s*0.29,0.105,0.15);ft.rotation.y=-s*0.08;g.add(ft);feet.push(ft);});

    if(type==='egg'){
        for(var ei=0;ei<5;ei++){var shard=new THREE.Mesh(new THREE.ConeGeometry(0.070,0.19,5),shellMat);shard.position.set(-0.25+ei*0.125,0.66+(ei%2)*0.025,0.00);shard.rotation.z=(ei-2)*0.16;body.add(shard);}
    }else if(type==='dog'){
        [-1,1].forEach(function(s){var ear=new THREE.Mesh(new THREE.SphereGeometry(0.19,18,12),softPBR(_charMixHex(color,0x8B5E46,0.30),{roughness:0.42}));ear.position.set(s*0.46,0.42,-0.02);ear.scale.set(0.68,1.38,0.50);ear.rotation.z=s*0.42;body.add(ear);});
    }else if(type==='cat'){
        [-1,1].forEach(function(s){var ear=new THREE.Mesh(new THREE.ConeGeometry(0.17,0.30,5),armMat);ear.position.set(s*0.39,0.57,0.01);ear.rotation.z=s*0.22;body.add(ear);});
    }else if(type==='rooster'){
        var combM=softPBR(0xFF5570,{roughness:0.32,clearcoat:0.32});for(var ri=0;ri<3;ri++){var cb=new THREE.Mesh(new THREE.SphereGeometry(0.09,14,10),combM);cb.position.set(-0.10+ri*0.10,0.64+Math.abs(ri-1)*0.025,0.04);body.add(cb);}
    }else if(type==='monkey'){
        [-1,1].forEach(function(s){var ear=new THREE.Mesh(new THREE.SphereGeometry(0.16,18,12),softPBR(0xFFD4AA,{roughness:0.38}));ear.position.set(s*0.53,0.22,0);ear.scale.z=0.55;body.add(ear);});
    }else if(type==='bull'){
        [-1,1].forEach(function(s){var horn=new THREE.Mesh(new THREE.ConeGeometry(0.07,0.31,10),softPBR(0xFFF0C8,{roughness:0.40}));horn.position.set(s*0.46,0.44,0);horn.rotation.z=-s*0.82;body.add(horn);});
    }else if(type==='bear'){
        [-1,1].forEach(function(s){var ear=new THREE.Mesh(new THREE.SphereGeometry(0.16,18,12),armMat);ear.position.set(s*0.42,0.52,0);body.add(ear);});
    }else if(type==='cockroach'){
        [-1,1].forEach(function(s){var pts=[];for(var ai=0;ai<=7;ai++){var t=ai/7;pts.push(new THREE.Vector3(s*0.10+s*t*0.31,0.48+t*0.38,0.01-t*0.10));}body.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),10,0.014,6,false),softPBR(0x6F4A25,{roughness:0.60})));});
    }

    var lidMat=softPBR(_charMixHex(color,0xFFE9F4,0.30),{roughness:0.42}),blinkLids=[];
    [-1,1].forEach(function(s){var lid=new THREE.Mesh(new THREE.CircleGeometry(0.145,24),lidMat);lid.position.set(s*0.225,0.19,0.723);lid.scale.set(0.68,0.08,1);lid.visible=false;body.add(lid);blinkLids.push(lid);});g.userData._blinkLids=blinkLids;

    var fistMat=softPBR(0xFFFFFF,{roughness:0.35}),rightArm=new THREE.Mesh(new THREE.SphereGeometry(0.20,14,10),fistMat),leftArm=new THREE.Mesh(new THREE.SphereGeometry(0.20,14,10),fistMat);
    rightArm.position.set(0.4,0.2,0.7);leftArm.position.set(-0.4,0.2,0.7);rightArm.visible=leftArm.visible=false;body.add(rightArm);body.add(leftArm);
    var legMat=softPBR(accent,{roughness:0.38}),rightLeg=new THREE.Mesh(new THREE.CylinderGeometry(0.10,0.14,0.72,10),legMat),leftLeg=new THREE.Mesh(new THREE.CylinderGeometry(0.10,0.14,0.72,10),legMat);
    rightLeg.position.set(0.24,0.12,0.52);leftLeg.position.set(-0.24,0.12,0.52);rightLeg.rotation.x=leftLeg.rotation.x=-Math.PI/3;rightLeg.visible=leftLeg.visible=false;g.add(rightLeg);g.add(leftLeg);

    g.userData.body=body;g.userData.feet=feet;g.userData._charType=charType;
    g.userData._eyeWhites=_eyeWhites;g.userData._pupils=_pupils;g.userData._shines=_shines;g.userData._eyeBaseScales=_eyeBaseScales;g.userData._smile=smile;g.userData._eyeY=0.19;
    g.userData.rightArm=rightArm;g.userData.leftArm=leftArm;g.userData.rightLeg=rightLeg;g.userData.leftLeg=leftLeg;
    return g;
}

function createEggMesh(color, accent, charType) {
    // Always use the clean mascot mesh. The older detailed mesh below is kept as
    // a fallback reference only, but we no longer enter it so cached style flags
    // cannot bring back the cluttered/human-looking characters.
    return _createCuteRoundCharacterMesh(color,accent,charType);
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

function createEgg(x,z,color,accent,isPlayer,targetScene,charType){
    const mesh=createEggMesh(color,accent,charType);
    mesh.position.set(x,0.01,z);
    (targetScene||scene).add(mesh);
    let arrow=null;
    if(isPlayer){
        const ag=new THREE.ConeGeometry(0.25,0.5,8);
        arrow=new THREE.Mesh(ag,toon(0xFFCC00,{emissive:0xFFCC00,emissiveIntensity:0.4}));
        arrow.rotation.x=Math.PI; arrow.position.y=2.0; mesh.add(arrow);
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

