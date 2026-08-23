// world.js — DANBO World
// ============================================================
//  PORTALS (race entrances in city)
// ============================================================
const RACES = [
    {name:'🌀 疯狂赛道', desc:'旋转臂与传送带！', x:40, z:0, color:0xFF4444},
    {name:'🔨 锤子风暴', desc:'大锤与摆锤！小心！', x:35, z:20, color:0xFF8800},
    {name:'⚡ 极限挑战', desc:'所有障碍加速！', x:20, z:35, color:0x8844FF},
    {name:'👑 冠军之路', desc:'最终决战！', x:0, z:40, color:0xFFD700},
    {name:'💎 \u7eff\u5b9d\u77f3\u5c71\u4e18', desc:'Sonic\u98ce\u683c\uff01\u91d1\u5e01\u4e0e\u5f39\u7c27\uff01', x:-20, z:35, color:0x44DD44},
    {name:'🔥 \u706b\u7130\u5c71\u8c37', desc:'\u52a0\u901f\u5e26\u4e0e\u5ca9\u6d46\u5730\u5f62\uff01', x:-35, z:20, color:0xFF4400},
    {name:'\u2744\ufe0f \u51b0\u971c\u6ed1\u9053', desc:'\u6ed1\u51b0\u5730\u5f62\u4e0e\u5f39\u7c27\uff01', x:-40, z:0, color:0x44CCFF},
    {name:'🌈 \u5f69\u8679\u5929\u7a7a', desc:'\u7a7a\u4e2d\u5e73\u53f0\u4e0e\u91d1\u5e01\u96e8\uff01', x:-35, z:-20, color:0xFF88FF},
    {name:'🍄 \u8611\u83c7\u738b\u56fd', desc:'\u7ecf\u5178\u6c34\u7ba1\u4e0e\u677f\u6817\uff01', x:-20, z:-35, color:0x44BB44},
    {name:'🔥 \u5ca9\u6d46\u57ce\u5821', desc:'\u5ca9\u6d46\u5730\u5f62\u4e0e\u706b\u7403\uff01', x:0, z:-40, color:0xDD4400},
    {name:'\u2601\ufe0f \u4e91\u7aef\u5929\u5802', desc:'\u7a7a\u4e2d\u5e73\u53f0\u4e0e\u5f39\u7c27\uff01', x:20, z:-35, color:0x88CCFF},
    {name:'🏰 \u5e93\u5df4\u57ce\u5821', desc:'\u6700\u7ec8\u5173\u5361\uff01\u5168\u969c\u788d\uff01', x:35, z:-20, color:0x884422}
];
// Keep the rebuilt race entrances on the open inner boulevard.  The previous
// 40-unit ring intersected eight of the new city buildings, hiding the portals.
var _racePortalPositions=[
    [50,0],[44,25],[25,44],[0,50],[-25,44],[-44,25],
    [-50,0],[-44,-25],[-25,-44],[0,-50],[25,-44],[44,-25]
];
for(var _rpp=0;_rpp<RACES.length&&_rpp<_racePortalPositions.length;_rpp++){
    RACES[_rpp].x=_racePortalPositions[_rpp][0];
    RACES[_rpp].z=_racePortalPositions[_rpp][1];
}
// Apply localized race names/descs
for(var _ri=0;_ri<RACES.length;_ri++){RACES[_ri].name=I18N.raceNames[_langCode][_ri]||RACES[_ri].name;RACES[_ri].desc=I18N.raceDescs[_langCode][_ri]||RACES[_ri].desc;}


function _danboPortalLocale(value){
    if(value&&typeof value==='object')return value[_langCode]||value.en||value.zhs||'';
    return value||'';
}

function _danboMakePortalSign(group,text,color,pos,scale){
    if(!group||typeof THREE==='undefined')return null;
    var canvas=document.createElement('canvas');canvas.width=512;canvas.height=112;
    var ctx=canvas.getContext('2d');
    var accent='#'+('000000'+((color||0xFFD700)&0xffffff).toString(16)).slice(-6);
    function roundedRect(x,y,w,h,r){
        ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
        ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
        ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
        ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
    }
    ctx.shadowColor='rgba(5,10,24,.58)';ctx.shadowBlur=18;ctx.shadowOffsetY=7;
    var bg=ctx.createLinearGradient(0,14,0,98);
    bg.addColorStop(0,'rgba(31,42,65,.94)');bg.addColorStop(1,'rgba(11,18,34,.92)');
    roundedRect(14,12,484,86,25);ctx.fillStyle=bg;ctx.fill();
    ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.lineWidth=4;ctx.strokeStyle=accent;ctx.stroke();
    var shine=ctx.createLinearGradient(38,0,474,0);
    shine.addColorStop(0,'rgba(255,255,255,0)');shine.addColorStop(.5,'rgba(255,255,255,.24)');shine.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=shine;roundedRect(42,22,428,4,2);ctx.fill();
    ctx.fillStyle='#F8FBFF';
    ctx.textAlign='center';
    var fs=31;ctx.font='800 '+fs+'px sans-serif';
    while(ctx.measureText(text||'').width>438&&fs>15){fs-=2;ctx.font='800 '+fs+'px sans-serif';}
    ctx.shadowColor='rgba(0,0,0,.72)';ctx.shadowBlur=5;ctx.fillText(text||'',256,69);
    ctx.shadowBlur=0;ctx.fillStyle=accent;roundedRect(206,82,100,5,3);ctx.fill();
    var tex=new THREE.CanvasTexture(canvas);
    if(THREE.SRGBColorSpace!==undefined)tex.colorSpace=THREE.SRGBColorSpace;
    var sign=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true}));
    scale=scale||{x:5.4,y:1.18,z:1};pos=pos||{x:0,y:5.55,z:0};
    sign.scale.set(scale.x||5.4,scale.y||1.18,scale.z||1);
    sign.position.set(pos.x||0,pos.y||5.55,pos.z||0);
    sign.material.depthWrite=false;
    group.add(sign);
    return sign;
}

function _danboPortalTheme(index,fallback){
    var themes=[
        ['arcane',0xFF526A,0xFFB15E,0xFFF4C2,0xA92C55,0xE7D6C9],
        ['storm',0xFF8C3A,0xFFD75D,0xFFF8D5,0xA94B26,0xE8D4BF],
        ['arcane',0x9368FF,0xE48BFF,0xF8EEFF,0x5940A8,0xDCD4EA],
        ['royal',0xFFD34F,0xFFF0A8,0xFFFBE0,0x9A6B1F,0xE8DDC3],
        ['nature',0x54D66D,0xB8F26D,0xF2FFD0,0x267A47,0xD8DDC5],
        ['fire',0xFF4828,0xFFB82E,0xFFF1A3,0x7A2630,0xE3C7AF],
        ['ice',0x4DCFFF,0xA7F3FF,0xF4FFFF,0x3976B6,0xD7E5EA],
        ['sky',0xFF78D8,0x78D9FF,0xFFF5FF,0x805AA8,0xE4D7E8],
        ['nature',0x5BCB68,0xFFD85A,0xF5FFD7,0x38753E,0xDCD7BD],
        ['fire',0xE93F25,0xFF8A28,0xFFE79A,0x64272B,0xD9BCA7],
        ['sky',0x78CFFF,0xD3F5FF,0xFFFFFF,0x547FB0,0xE1E6E7],
        ['royal',0x9C6B4D,0xE6A857,0xFFF1C4,0x553A46,0xD2C3B8]
    ];
    var p=themes[index%themes.length]||['arcane',fallback||0xAA66FF,0x66CCFF,0xFFFFFF,fallback||0x7755AA,0xD8D2CC];
    return {kind:p[0],a:p[1],b:p[2],core:p[3],rim:p[4],stone:p[5]};
}

function _danboPortalTexture(kind){
    if(!window._danboPortalTextures)window._danboPortalTextures={};
    if(window._danboPortalTextures[kind])return window._danboPortalTextures[kind];
    var c=document.createElement('canvas');c.width=kind==='flame'?64:96;c.height=kind==='flame'?112:96;
    var x=c.getContext('2d');
    if(kind==='flame'){
        var fg=x.createRadialGradient(32,82,2,32,65,42);
        fg.addColorStop(0,'rgba(255,255,225,1)');fg.addColorStop(.20,'rgba(255,221,80,.98)');
        fg.addColorStop(.52,'rgba(255,88,24,.78)');fg.addColorStop(1,'rgba(155,10,28,0)');
        x.fillStyle=fg;x.beginPath();x.moveTo(32,3);x.bezierCurveTo(50,31,60,54,49,85);
        x.bezierCurveTo(42,106,17,108,10,84);x.bezierCurveTo(2,58,24,42,32,3);x.fill();
    }else{
        var g=x.createRadialGradient(48,48,2,48,48,47);
        g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.16,'rgba(255,255,255,.88)');
        g.addColorStop(.48,'rgba(255,255,255,.30)');g.addColorStop(1,'rgba(255,255,255,0)');
        x.fillStyle=g;x.fillRect(0,0,96,96);
    }
    var tex=new THREE.CanvasTexture(c);
    if(THREE.SRGBColorSpace!==undefined)tex.colorSpace=THREE.SRGBColorSpace;
    window._danboPortalTextures[kind]=tex;return tex;
}

function _danboPortalGeometry(){
    if(!window._danboPortalGeometryCache)window._danboPortalGeometryCache={};
    var low=!!(window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.low),key=low?'low':'full';
    if(window._danboPortalGeometryCache[key])return window._danboPortalGeometryCache[key];
    var radial=low?6:10,tubular=low?28:52,sides=low?16:32;
    // The gate uses DANBO's own soft egg silhouette instead of the familiar
    // circular sci-fi ring.  All three outlines share the same cached curve so
    // the richer shape is still inexpensive when the city contains many gates.
    function eggCurve(scale){
        var points=[
            new THREE.Vector3(0,2.30,0),
            new THREE.Vector3(-1.18,1.92,0),
            new THREE.Vector3(-1.83,0.78,0),
            new THREE.Vector3(-1.88,-0.44,0),
            new THREE.Vector3(-1.30,-1.66,0),
            new THREE.Vector3(0,-2.08,0),
            new THREE.Vector3(1.30,-1.66,0),
            new THREE.Vector3(1.88,-0.44,0),
            new THREE.Vector3(1.83,0.78,0),
            new THREE.Vector3(1.18,1.92,0)
        ];
        for(var i=0;i<points.length;i++)points[i].multiplyScalar(scale);
        return new THREE.CatmullRomCurve3(points,true,'catmullrom',0.42);
    }
    function eggSurface(scale){
        var shape=new THREE.Shape();
        shape.moveTo(0,-2.08*scale);
        shape.bezierCurveTo(-1.18*scale,-2.02*scale,-1.82*scale,-1.02*scale,-1.82*scale,-0.25*scale);
        shape.bezierCurveTo(-1.82*scale,0.86*scale,-1.20*scale,2.08*scale,0,2.30*scale);
        shape.bezierCurveTo(1.20*scale,2.08*scale,1.82*scale,0.86*scale,1.82*scale,-0.25*scale);
        shape.bezierCurveTo(1.82*scale,-1.02*scale,1.18*scale,-2.02*scale,0,-2.08*scale);
        return new THREE.ShapeGeometry(shape,low?5:10);
    }
    var geo={
        arch:new THREE.TubeGeometry(eggCurve(1.0),tubular,0.34,radial,true),
        outer:new THREE.TubeGeometry(eggCurve(1.14),tubular,0.12,low?5:8,true),
        energy:new THREE.TubeGeometry(eggCurve(0.84),tubular,0.07,low?5:8,true),
        surface:eggSurface(0.82),
        base1:new THREE.CylinderGeometry(2.72,2.96,0.28,sides),
        base2:new THREE.CylinderGeometry(2.42,2.66,0.28,sides),
        halo:new THREE.CircleGeometry(2.52,low?28:56),
        support:new THREE.CylinderGeometry(0.34,0.43,2.0,low?10:18),
        supportCap:new THREE.SphereGeometry(0.43,low?10:18,low?7:12),
        rune:new THREE.OctahedronGeometry(0.13,0),
        crystal:new THREE.ConeGeometry(0.18,0.92,5)
    };
    window._danboPortalGeometryCache[key]=geo;return geo;
}

function _danboPortalCurtainTexture(theme){
    if(!window._danboPortalCurtainTextures)window._danboPortalCurtainTextures={};
    var key=theme.kind+'-'+theme.a+'-'+theme.b;
    if(window._danboPortalCurtainTextures[key])return window._danboPortalCurtainTextures[key];
    var c=document.createElement('canvas'),size=256;c.width=size;c.height=320;
    var x=c.getContext('2d'),ca=new THREE.Color(theme.a),cb=new THREE.Color(theme.b),cc=new THREE.Color(theme.core);
    function rgb(col,a){return 'rgba('+Math.round(col.r*255)+','+Math.round(col.g*255)+','+Math.round(col.b*255)+','+a+')';}
    x.clearRect(0,0,c.width,c.height);
    // A vertical aurora curtain replaces the generic spiral/vortex motif.
    var bg=x.createLinearGradient(0,0,0,c.height);
    bg.addColorStop(0,rgb(cb,0.82));bg.addColorStop(0.38,rgb(ca,0.92));
    bg.addColorStop(0.74,rgb(ca,0.82));bg.addColorStop(1,rgb(cb,0.68));
    x.fillStyle=bg;x.fillRect(0,0,c.width,c.height);
    x.save();x.globalCompositeOperation='lighter';x.lineCap='round';
    for(var ribbon=0;ribbon<5;ribbon++){
        var bx=24+ribbon*52;
        x.beginPath();
        x.moveTo(bx-15,330);
        x.bezierCurveTo(bx+30,245,bx-34,165,bx+12,82);
        x.bezierCurveTo(bx+30,48,bx+18,18,bx+26,-12);
        x.strokeStyle=rgb(cb,0.18);x.lineWidth=30;x.stroke();
        x.strokeStyle=rgb(cc,0.48);x.lineWidth=6;x.stroke();
    }
    for(var spark=0;spark<22;spark++){
        var sx=(spark*83)%238+9,sy=(spark*137)%300+10,sr=1.5+(spark%4)*0.75;
        x.fillStyle=rgb(cc,0.35+(spark%3)*0.16);
        x.beginPath();x.moveTo(sx,sy-sr*2.4);x.lineTo(sx+sr,sy);x.lineTo(sx,sy+sr*2.4);x.lineTo(sx-sr,sy);x.closePath();x.fill();
    }
    x.globalCompositeOperation='source-over';
    var center=x.createLinearGradient(0,0,c.width,0);
    center.addColorStop(0,'rgba(255,255,255,0)');center.addColorStop(.5,rgb(cc,0.28));center.addColorStop(1,'rgba(255,255,255,0)');
    x.fillStyle=center;x.fillRect(0,0,c.width,c.height);
    var shade=x.createRadialGradient(128,154,30,128,154,178);
    shade.addColorStop(0,'rgba(0,0,0,0)');shade.addColorStop(1,'rgba(12,10,32,.35)');
    x.fillStyle=shade;x.fillRect(0,0,c.width,c.height);x.restore();
    var tex=new THREE.CanvasTexture(c);
    if(THREE.SRGBColorSpace!==undefined)tex.colorSpace=THREE.SRGBColorSpace;
    tex.minFilter=THREE.LinearMipmapLinearFilter;tex.magFilter=THREE.LinearFilter;
    if(typeof R!=='undefined'&&R.capabilities&&R.capabilities.getMaxAnisotropy)tex.anisotropy=Math.min(4,R.capabilities.getMaxAnisotropy());
    window._danboPortalCurtainTextures[key]=tex;return tex;
}

function _danboPortalSurfaceMaterial(theme){
    return new THREE.MeshBasicMaterial({
        map:_danboPortalCurtainTexture(theme),color:0xFFFFFF,transparent:true,opacity:0.94,
        depthWrite:true,side:THREE.DoubleSide,blending:THREE.NormalBlending,toneMapped:false
    });
}

function _danboBuildRacePortal(race,index){
    var low=!!(window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.low);
    var high=!!(window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.high);
    var theme=_danboPortalTheme(index,race.color),geo=_danboPortalGeometry(),g=new THREE.Group();g.name='cinematic-themed-portal';
    var archMat=softPBR(theme.stone,{roughness:0.56,metalness:0.03,clearcoat:low?0:0.12,clearcoatRoughness:0.48,envMapIntensity:0.48});
    var rimMat=softPBR(theme.rim,{roughness:0.36,metalness:0.18,clearcoat:low?0:0.16,clearcoatRoughness:0.34,emissive:theme.a,emissiveIntensity:0.11});
    var baseMat=softPBR(0xB5AA9C,{roughness:0.82,metalness:0.01,envMapIntensity:0.24});
    var ring=new THREE.Mesh(geo.arch,rimMat);ring.position.y=PORTAL_CONFIG.baseHeight;ring.castShadow=true;ring.receiveShadow=true;g.add(ring);
    var outer=new THREE.Mesh(geo.outer,archMat);outer.position.y=PORTAL_CONFIG.baseHeight;outer.castShadow=true;g.add(outer);
    var energyMat=new THREE.MeshBasicMaterial({color:theme.b,transparent:true,opacity:0.76,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
    var energyRing=new THREE.Mesh(geo.energy,energyMat);energyRing.position.set(0,PORTAL_CONFIG.baseHeight,0.045);energyRing.renderOrder=49;g.add(energyRing);
    var inner=new THREE.Mesh(geo.surface,_danboPortalSurfaceMaterial(theme));inner.position.set(0,PORTAL_CONFIG.baseHeight,0);inner.renderOrder=50;g.add(inner);
    var base1=new THREE.Mesh(geo.base1,baseMat);base1.position.y=0.14;base1.receiveShadow=true;base1.castShadow=true;g.add(base1);
    var base2=new THREE.Mesh(geo.base2,archMat);base2.position.y=0.41;base2.receiveShadow=true;base2.castShadow=true;g.add(base2);
    var haloMat=new THREE.MeshBasicMaterial({color:theme.a,transparent:true,opacity:0.20,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,side:THREE.DoubleSide});
    var groundHalo=new THREE.Mesh(geo.halo,haloMat);groundHalo.rotation.x=-Math.PI/2;groundHalo.position.y=0.57;g.add(groundHalo);
    var sm=new THREE.Matrix4(),supports=new THREE.InstancedMesh(geo.support,archMat,2);
    sm.makeTranslation(-2.03,1.36,0);supports.setMatrixAt(0,sm);sm.makeTranslation(2.03,1.36,0);supports.setMatrixAt(1,sm);supports.castShadow=true;supports.receiveShadow=true;g.add(supports);
    var caps=new THREE.InstancedMesh(geo.supportCap,rimMat,2);
    sm.makeTranslation(-2.03,0.58,0);caps.setMatrixAt(0,sm);sm.makeTranslation(2.03,0.58,0);caps.setMatrixAt(1,sm);caps.castShadow=true;g.add(caps);
    // A small egg crest and paired gem lanterns give the gate a friendly DANBO
    // silhouette instead of reading as a bare neon doughnut.
    var crestMat=softPBR(theme.core,{roughness:0.28,metalness:0.04,clearcoat:low?0:0.32,clearcoatRoughness:0.22,emissive:theme.b,emissiveIntensity:0.12});
    var crest=new THREE.Mesh(new THREE.SphereGeometry(0.33,low?10:20,low?7:14),crestMat);
    crest.position.set(0,5.04,0.02);crest.scale.set(0.84,1.15,0.72);crest.castShadow=true;g.add(crest);
    var gemGeo=new THREE.OctahedronGeometry(0.19,low?0:1),gemMat=new THREE.MeshBasicMaterial({color:theme.core,transparent:true,opacity:0.82,toneMapped:false});
    [-1,1].forEach(function(side){
        var gem=new THREE.Mesh(gemGeo,gemMat);gem.position.set(side*2.04,1.68,0.18);gem.rotation.z=Math.PI/4;gem.renderOrder=52;g.add(gem);
    });
    var runeCount=low?6:10,runeMat=new THREE.MeshBasicMaterial({color:theme.core,transparent:true,opacity:0.78,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
    var runeRing=new THREE.Group(),runes=new THREE.InstancedMesh(geo.rune,runeMat,runeCount);
    var runeSpots=[
        [-1.98,-1.18,-0.38],[-2.18,-0.28,-0.18],[-2.05,0.72,0.08],[-1.60,1.60,0.28],[-0.74,2.28,0.45],
        [0.74,2.28,-0.45],[1.60,1.60,-0.28],[2.05,0.72,-0.08],[2.18,-0.28,0.18],[1.98,-1.18,0.38]
    ];
    for(var ri=0;ri<runeCount;ri++){
        var rsp=runeSpots[low?Math.floor(ri*10/runeCount):ri],ra=(ri<runeCount/2?-1:1)*(0.18+(ri%3)*0.14);
        sm.compose(new THREE.Vector3(rsp[0],rsp[1],0.10),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,0,ra)),new THREE.Vector3(0.72,1.25,0.72));
        runes.setMatrixAt(ri,sm);
    }
    runes.renderOrder=52;runeRing.position.y=PORTAL_CONFIG.baseHeight;runeRing.add(runes);g.add(runeRing);
    var pCount=low?8:(high?22:14),pos=new Float32Array(pCount*3),phases=new Float32Array(pCount),bands=new Float32Array(pCount);
    for(var pi=0;pi<pCount;pi++){phases[pi]=Math.PI*2*pi/pCount;bands[pi]=(pi%5)/5;pos[pi*3+1]=PORTAL_CONFIG.baseHeight;}
    var pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pos,3));
    var pm=new THREE.PointsMaterial({color:theme.core,size:theme.kind==='fire'?0.34:0.25,map:_danboPortalTexture('glow'),transparent:true,opacity:0.88,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true,toneMapped:false});
    var particles=new THREE.Points(pg,pm);particles.renderOrder=51;g.add(particles);
    var themed=[];
    if(theme.kind==='fire'){
        for(var fi=0;fi<(low?3:6);fi++){
            var flameMat=new THREE.SpriteMaterial({map:_danboPortalTexture('flame'),color:fi%2?theme.b:theme.core,transparent:true,opacity:0.62,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
            var flame=new THREE.Sprite(flameMat),side=fi%2?-1:1;
            flame.position.set(side*(1.72+(fi%3)*0.24),0.72+(fi%3)*0.42,0.20);
            flame.scale.set(0.72,1.26,1);flame.userData.portalFlamePhase=fi*0.83;g.add(flame);themed.push(flame);
        }
    }else if(theme.kind==='ice'){
        var crystalMat=softPBR(0xBDEFFF,{roughness:0.20,metalness:0.04,clearcoat:low?0:0.44,clearcoatRoughness:0.18,emissive:0x5CCFFF,emissiveIntensity:0.16,transparent:true,opacity:0.88});
        var shardCount=low?4:8,shards=new THREE.InstancedMesh(geo.crystal,crystalMat,shardCount);
        for(var si=0;si<shardCount;si++){
            var side=si%2?-1:1,sx=side*(1.72+(si%3)*0.25),sy=0.72+(si%4)*0.58;
            sm.compose(new THREE.Vector3(sx,sy,0.18),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,0,side*(0.18+(si%3)*0.13))),new THREE.Vector3(1.02+(si%2)*0.24,1.10+(si%3)*0.24,1.02));
            shards.setMatrixAt(si,sm);
        }
        shards.castShadow=true;g.add(shards);themed.push(shards);
        for(var mi=0;mi<(low?2:4);mi++){
            var mistMat=new THREE.SpriteMaterial({map:_danboPortalTexture('glow'),color:0xAEEFFF,transparent:true,opacity:0.13,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
            var mist=new THREE.Sprite(mistMat);mist.position.set(-1.5+mi,0.68,0.12);mist.scale.set(2.2,0.58,1);mist.userData.portalMistPhase=mi*1.7;g.add(mist);themed.push(mist);
        }
    }else if(theme.kind==='nature'){
        var leafMat=softPBR(0x6FBF69,{roughness:0.78,metalness:0,emissive:0x3B7D4B,emissiveIntensity:0.04});
        for(var li=0;li<(low?4:8);li++){
            var leafSide=li%2?-1:1,leaf=new THREE.Mesh(new THREE.SphereGeometry(0.19,low?7:11,low?5:8),leafMat);
            leaf.position.set(leafSide*(2.10+0.10*Math.sin(li)),0.80+(li>>1)*0.77,0.18);
            leaf.scale.set(1.35,0.54,0.62);leaf.rotation.z=leafSide*(0.42+(li%3)*0.13);leaf.castShadow=true;g.add(leaf);
        }
        if(!low){
            var budMat=softPBR(theme.b,{roughness:0.42,clearcoat:0.10});
            [-1,1].forEach(function(side){
                var bud=new THREE.Mesh(new THREE.SphereGeometry(0.16,12,8),budMat);
                bud.position.set(side*2.22,2.42,0.26);bud.castShadow=true;g.add(bud);
            });
        }
    }else if(theme.kind==='sky'&&!low){
        var cloudMat=softPBR(0xF4FBFF,{roughness:0.95,metalness:0,emissive:0xB9E4F4,emissiveIntensity:0.08});
        [-1,1].forEach(function(side){
            for(var ci=0;ci<3;ci++){
                var puff=new THREE.Mesh(new THREE.SphereGeometry(0.25+ci*0.04,14,9),cloudMat);
                puff.position.set(side*(1.75+ci*0.25),0.65+ci*0.10,0.15);puff.scale.set(1.30,0.72,0.82);g.add(puff);
            }
        });
    }
    var light=window._danboEffectLightPool&&window._danboEffectLightPool[0]||null;
    if(light){light.color.setHex(theme.b);light.intensity=0;light.visible=true;}
    return {group:g,ring:ring,outer:outer,inner:inner,energyRing:energyRing,runeRing:runeRing,groundHalo:groundHalo,particles:particles,phases:phases,bands:bands,themed:themed,light:light,theme:theme,baseLightIntensity:high?0.82:0.54};
}

function buildPluginEntrances(){
    if(currentCityStyle===5)return;
    if(!window.DANBO_PLUGIN_HOST||typeof window.DANBO_PLUGIN_HOST.getEntrances!=='function')return;
    var defs=window.DANBO_PLUGIN_HOST.getEntrances()||[];
    for(var ei=0;ei<defs.length;ei++){
        var def=defs[ei];
        if(!def||def.enabled===false||typeof def.create!=='function')continue;
        if(def.disabledCityStyles&&def.disabledCityStyles.indexOf&&def.disabledCityStyles.indexOf(currentCityStyle)>=0)continue;
        try{
            var entrance=def.create({
                THREE:THREE,
                toon:toon,
                softPBR:softPBR,
                cityGroup:cityGroup,
                currentCityStyle:currentCityStyle,
                lang:_langCode,
                positions:PORTAL_POSITIONS,
                portalConfig:PORTAL_CONFIG,
                makeSign:_danboMakePortalSign
            });
            if(!entrance||!entrance.group)continue;
            if(entrance.group.parent!==cityGroup)cityGroup.add(entrance.group);
            var name= _danboPortalLocale(entrance.name||def.name)||def.id;
            var desc= _danboPortalLocale(entrance.desc||def.desc||def.description);
            var color=entrance.color||def.color||0xFFFFFF;
            portals.push({
                mesh:entrance.group,
                ring:entrance.ring||entrance.group,
                inner:entrance.inner||entrance.ring||entrance.group,
                name:name,
                desc:desc,
                raceIndex:-1,
                x:(typeof entrance.x==='number')?entrance.x:((entrance.group.position&&entrance.group.position.x)||0),
                z:(typeof entrance.z==='number')?entrance.z:((entrance.group.position&&entrance.group.position.z)||0),
                y:entrance.y||0,
                color:color,
                _hiddenType:entrance.hiddenType||def.hiddenType||def.id,
                _targetStyle:(typeof entrance.targetStyle==='number')?entrance.targetStyle:((typeof def.targetStyle==='number')?def.targetStyle:-99),
                _pluginId:entrance.pluginId||def.pluginId||def.id,
                _i18nName:entrance.name||def.name,
                _i18nDesc:entrance.desc||def.desc||def.description
            });
        }catch(e){
            console.error('[PluginEntrance] failed to build '+(def.id||'?'),e);
        }
    }
}

function buildPortals() {
    if(window._danboEffectLightPool)window._danboEffectLightPool.forEach(function(light){light.intensity=0;light.visible=true;});
    if(currentCityStyle===5) return; // No race portals on moon
    // Clear old portals
    for(var _opi=portals.length-1;_opi>=0;_opi--){
        if(portals[_opi].mesh)cityGroup.remove(portals[_opi].mesh);
    }
    portals.length=0;
    RACES.forEach((race,i)=>{
        var portalVisual=_danboBuildRacePortal(race,i);
        const g = portalVisual.group;
        var portalX=race.x, portalY=currentCityStyle===7?3:0, portalZ=race.z;
        g.position.set(portalX,portalY,portalZ);
        // Face along the circular boulevard instead of toward the building
        // ring.  Players approach from either direction and see a full doorway.
        var portalLen=Math.sqrt(portalX*portalX+portalZ*portalZ)||1;
        var portalTangentX=-portalZ/portalLen,portalTangentZ=portalX/portalLen;
        g.rotation.y=Math.atan2(portalTangentX,portalTangentZ);

        cityGroup.add(g);
        portals.push({mesh:g,ring:portalVisual.ring,inner:portalVisual.inner,name:race.name,desc:race.desc,raceIndex:i,x:portalX,z:portalZ,y:portalY,color:race.color,_visual:portalVisual});

        // Name sign above portal
        _danboMakePortalSign(g,race.name,portalVisual.theme.b);
        // No collider for portals — player walks through them to enter
    });

    // ---- Platformer mini-game portal ----
    if(currentCityStyle!==5){
        var _pfPX=PORTAL_POSITIONS.platformerPortal.x,_pfPZ=PORTAL_POSITIONS.platformerPortal.z;
        // Use the same cinematic PBR gate language as the race portals.  The old
        // saturated red torus looked like a debug primitive beside Hope City.
        var _pfVisual=_danboBuildRacePortal({color:0x66C879},8);
        var _pfPortalG=_pfVisual.group;_pfPortalG.name='danbo-adventure-cute-portal';
        _pfPortalG.position.set(_pfPX,0,_pfPZ);
        // Friendly mushroom markers make this special entrance recognizable
        // without returning to the old flat red ring.
        var _pfLow=!!(window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.low);
        var _pfStemMat=softPBR(0xFFF0D3,{roughness:0.80,metalness:0});
        var _pfCapColors=[0xF06B72,0xF4B84C,0xE98BB5,0x73B765];
        for(var _pmi=0;_pmi<(_pfLow?2:4);_pmi++){
            var _pmside=_pmi%2?-1:1,_pmx=_pmside*(2.34+(_pmi>>1)*0.28),_pmy=0.58+(_pmi>>1)*0.16;
            var _pmStem=new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.18,_pmy,10),_pfStemMat);
            _pmStem.position.set(_pmx,_pmy*0.5,0.42);_pmStem.castShadow=true;_pfPortalG.add(_pmStem);
            var _pmCap=new THREE.Mesh(new THREE.SphereGeometry(0.30+(_pmi>>1)*0.05,_pfLow?10:16,_pfLow?7:10,0,Math.PI*2,0,Math.PI/2),softPBR(_pfCapColors[_pmi],{roughness:0.48,clearcoat:_pfLow?0:0.12}));
            _pmCap.position.set(_pmx,_pmy,0.42);_pmCap.scale.set(1.12,0.68,1);_pmCap.castShadow=true;_pfPortalG.add(_pmCap);
        }
        cityGroup.add(_pfPortalG);
        var _pfName={zhs:'\uD83C\uDF44 \u86CB\u5B9D\u5192\u9669',zht:'\uD83C\uDF44 \u86CB\u5BF6\u5192\u96AA',ja:'\uD83C\uDF44 \u30C0\u30F3\u30DC\u30A2\u30C9\u30D9\u30F3\u30C1\u30E3\u30FC',en:'\uD83C\uDF44 Danbo Adventure'};
        var _pfDesc={zhs:'\u6A2A\u7248\u8FC7\u5173\uFF01\u548C\u4F19\u4F34\u4E00\u8D77\u95EF\u5173\uFF01',zht:'\u6A6B\u7248\u904E\u95DC\uFF01\u548C\u5925\u4F34\u4E00\u8D77\u95D6\u95DC\uFF01',ja:'\u6A2A\u30B9\u30AF\u30ED\u30FC\u30EB\uFF01\u4EF2\u9593\u3068\u4E00\u7DD2\u306B\uFF01',en:'Side-scrolling adventure with friends!'};
        portals.push({mesh:_pfPortalG,ring:_pfVisual.ring,inner:_pfVisual.inner,
            name:_pfName[_langCode]||_pfName.en,desc:_pfDesc[_langCode]||_pfDesc.en,
            raceIndex:-1,x:_pfPX,z:_pfPZ,y:0,color:0x66C879,_hiddenType:'platformer',_targetStyle:-99,_visual:_pfVisual});
        _danboMakePortalSign(_pfPortalG,_pfName[_langCode]||_pfName.en,_pfVisual.theme.b);
    }

    // ---- Mini-game entrances provided by lightweight plugin entrance scripts ----
    buildPluginEntrances();
}

// ---- Collectible coins in city ----
// Shared, rounded PBR coin used by the city, cloud world and mini-games.
// The former 12-sided flat cylinder read like a yellow token. This version keeps
// the same collision footprint while adding a softly bevelled rim, recessed face
// and a raised Egg Hero crest. Geometry and materials are shared so the richer
// silhouette remains practical with hundreds of collectibles on mobile Safari.
function _makeCinematicCoinMesh(scale){
    var low=!!(window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.low);
    var cacheKey=low?'low':'full';
    if(!window._danboCinematicCoinCache)window._danboCinematicCoinCache={};
    var cache=window._danboCinematicCoinCache[cacheKey];
    if(!cache){
        var seg=low?12:20;
        var coinShape=new THREE.Shape();
        coinShape.absarc(0,0,0.39,0,Math.PI*2,false);
        var bodyGeo=new THREE.ExtrudeGeometry(coinShape,{
            depth:0.075,curveSegments:seg,steps:1,
            bevelEnabled:true,bevelSegments:low?1:2,bevelSize:0.024,bevelThickness:0.024
        });
        bodyGeo.translate(0,0,-0.0375);
        var faceGeo=new THREE.CylinderGeometry(0.305,0.305,0.094,seg);
        faceGeo.rotateX(Math.PI/2);
        var ringGeo=new THREE.TorusGeometry(0.335,0.026,low?4:6,seg);

        // Original egg-shaped crest, gently bevelled rather than printed flat.
        var eggShape=new THREE.Shape();
        eggShape.moveTo(0,-0.19);
        eggShape.bezierCurveTo(-0.145,-0.19,-0.205,-0.07,-0.19,0.045);
        eggShape.bezierCurveTo(-0.175,0.16,-0.095,0.235,0,0.255);
        eggShape.bezierCurveTo(0.095,0.235,0.175,0.16,0.19,0.045);
        eggShape.bezierCurveTo(0.205,-0.07,0.145,-0.19,0,-0.19);
        var crestGeo=new THREE.ExtrudeGeometry(eggShape,{
            depth:0.025,steps:1,curveSegments:low?5:8,
            bevelEnabled:true,bevelSegments:1,bevelSize:0.009,bevelThickness:0.007
        });
        crestGeo.translate(0,-0.018,0);

        // Merge all relief pieces into one vertex-coloured geometry. A city can
        // contain roughly 180 coins, so one draw object per coin is substantially
        // cheaper than six nested meshes while retaining the full raised profile.
        function mergeCoinParts(parts){
            var prepared=[],total=0;
            for(var pi=0;pi<parts.length;pi++){
                var pg=parts[pi].geo.index?parts[pi].geo.toNonIndexed():parts[pi].geo.clone();
                if(parts[pi].matrix)pg.applyMatrix4(parts[pi].matrix);
                pg.computeVertexNormals();
                var count=pg.attributes.position.count;
                prepared.push({geo:pg,color:new THREE.Color(parts[pi].color),count:count});total+=count;
            }
            var positions=new Float32Array(total*3),normals=new Float32Array(total*3),uvs=new Float32Array(total*2),colors=new Float32Array(total*3);
            var vo=0,uo=0;
            for(var mi=0;mi<prepared.length;mi++){
                var part=prepared[mi],pa=part.geo.attributes.position.array,na=part.geo.attributes.normal.array,ua=part.geo.attributes.uv&&part.geo.attributes.uv.array;
                positions.set(pa,vo*3);normals.set(na,vo*3);
                if(ua)uvs.set(ua,uo*2);
                for(var ci=0;ci<part.count;ci++){
                    var co=(vo+ci)*3;colors[co]=part.color.r;colors[co+1]=part.color.g;colors[co+2]=part.color.b;
                }
                vo+=part.count;uo+=part.count;
            }
            var merged=new THREE.BufferGeometry();
            merged.setAttribute('position',new THREE.BufferAttribute(positions,3));
            merged.setAttribute('normal',new THREE.BufferAttribute(normals,3));
            merged.setAttribute('uv',new THREE.BufferAttribute(uvs,2));
            merged.setAttribute('color',new THREE.BufferAttribute(colors,3));
            merged.computeBoundingSphere();return merged;
        }
        var frontRingMatrix=new THREE.Matrix4().makeTranslation(0,0,0.057);
        var backRingMatrix=new THREE.Matrix4().makeTranslation(0,0,-0.057);
        var frontCrestMatrix=new THREE.Matrix4().makeTranslation(0,0,0.059);
        var backCrestMatrix=new THREE.Matrix4().makeRotationY(Math.PI);
        backCrestMatrix.premultiply(new THREE.Matrix4().makeTranslation(0,0,-0.059));
        var mergedGeo=mergeCoinParts([
            {geo:bodyGeo,color:0xD99518},{geo:faceGeo,color:0xF7C94D},
            {geo:ringGeo,color:0xFFE89A,matrix:frontRingMatrix},{geo:ringGeo,color:0xFFE89A,matrix:backRingMatrix},
            {geo:crestGeo,color:0xFFF1B0,matrix:frontCrestMatrix},{geo:crestGeo,color:0xFFF1B0,matrix:backCrestMatrix}
        ]);
        var mergedMat=softPBR(0xFFFFFF,{pastelAmount:0,vertexColors:true,roughness:0.29,metalness:0.54,clearcoat:0.30,clearcoatRoughness:0.19,envMapIntensity:0.86,emissive:0x5E3000,emissiveIntensity:0.045});
        cache=window._danboCinematicCoinCache[cacheKey]={geometry:mergedGeo,material:mergedMat};
    }
    var coin=new THREE.Mesh(cache.geometry,cache.material);
    coin.name='danbo-cinematic-coin';
    coin.scale.setScalar(scale===undefined?1:scale);
    coin.userData._coinCinematic=true;
    coin.castShadow=false;coin.receiveShadow=false;
    return coin;
}
window._makeCinematicCoinMesh=_makeCinematicCoinMesh;

function buildCityCoins() {
    var _coinCityLayout=(typeof _getCityLayout==='function')?_getCityLayout(currentCityStyle):null;
    var _coinCityData=(typeof _getCityCollectibles==='function')?_getCityCollectibles(currentCityStyle):null;
    var coinCount=(_coinCityData&&_coinCityData.coinCount!==undefined)?_coinCityData.coinCount:((_coinCityLayout&&_coinCityLayout.coinCount!==undefined)?_coinCityLayout.coinCount:(currentCityStyle===5?200:180));
    for(let i=0;i<coinCount;i++){
        var coinSpread=currentCityStyle===5?MOON_CITY_SIZE*0.9:CITY_SIZE*0.9;
        const cx=(Math.random()-0.5)*coinSpread*2, cz=(Math.random()-0.5)*coinSpread*2;
        let skip=false;
        if(currentCityStyle!==5){
            for(const c of cityColliders) if(DANBO_WASM.aabb2D(cx,cz,c.x,c.z,c.hw,c.hd,1)) skip=true;
            if(DANBO_WASM.within2D(cx,cz,0,0,7)) skip=true;
        }
        if(skip) continue;
        const coin=_makeCinematicCoinMesh(0.94);
        coin.position.set(cx,1.2,cz);
        cityGroup.add(coin);
        cityCoins.push({mesh:coin, collected:false});
    }
}

// ============================================================
//  TREASURE CHESTS — reward + exploration system
//  Common (wooden, no FX): 20-50 coins.  Rare (blue, faint glow): 100 coins.
//  Fixed per area: every city 20 chests; cloud world 10 chests.
// ============================================================
var cityChests = []; // {id,group,x,z,y,tier,opened,lid,glow,area,inScene,lidAngle}
var CHEST_CITY_TOTAL = 20, CHEST_CLOUD_TOTAL = 10;
function _tierFromRoll(r){ return r<0.08?'legendary':(r<0.30?'rare':'common'); }

// ============================================================
//  EXPLORER POINTS SYSTEM (single-player / per-player)
//  EXP is exploration-only. No combat stats, no P2W. Persisted locally.
//  saveData = {explorerPoints, explorerLevel, cityProgress, titles,
//              cosmetics, achievements, chests, hidden, claimed, daily}
// ============================================================
var Explorer=(function(){
    var KEY='danbo_save_v2';
    var LEVELS=[
        {lv:1,min:0,name:'\u65B0\u624B\u63A2\u9669\u5BB6'},   // 新手探险家
        {lv:2,min:50,name:'\u65C5\u884C\u8005'},              // 旅行者
        {lv:3,min:100,name:'\u5192\u9669\u5BB6'},             // 冒险家
        {lv:4,min:200,name:'\u8D44\u6DF1\u63A2\u9669\u5BB6'}, // 资深探险家
        {lv:5,min:400,name:'\u4E16\u754C\u65C5\u4EBA'},       // 世界旅人
        {lv:6,min:800,name:'\u4F20\u5947\u63A2\u9669\u5BB6'}  // 传奇探险家
    ];
    function norm(o){
        o=o||{};
        o.explorerPoints=o.explorerPoints||0; o.explorerLevel=o.explorerLevel||1;
        o.cityProgress=o.cityProgress||{}; o.titles=o.titles||{}; o.cosmetics=o.cosmetics||{};
        o.achievements=o.achievements||{}; o.chests=o.chests||{}; o.hidden=o.hidden||{};
        o.claimed=o.claimed||{}; o.daily=o.daily||{date:'',count:0};
        return o;
    }
    var d=(function(){try{var s=localStorage.getItem(KEY);if(s)return norm(JSON.parse(s));}catch(e){}return norm({});})();
    function save(){try{localStorage.setItem(KEY,JSON.stringify(d));}catch(e){}}
    function levelFor(p){var lv=LEVELS[0];for(var i=0;i<LEVELS.length;i++)if(p>=LEVELS[i].min)lv=LEVELS[i];return lv;}
    function today(){var t=new Date();return t.getFullYear()+'-'+(t.getMonth()+1)+'-'+t.getDate();}
    function cityCount(area){var n=0,pre=area+'_';for(var k in d.chests)if(d.chests[k]&&k.indexOf(pre)===0)n++;return n;}
    function addPoints(n,reason){
        if(!n)return;
        var before=d.explorerPoints; d.explorerPoints+=n;
        var lb=levelFor(before).lv, la=levelFor(d.explorerPoints).lv; d.explorerLevel=la; save();
        if(typeof _showExpGain==='function')_showExpGain(n);
        if(la>lb&&typeof _showLevelUp==='function')_showLevelUp(levelFor(d.explorerPoints));
        if(typeof _updateChestHud==='function')_updateChestHud();
        if(typeof _updatePlayerTag==='function')_updatePlayerTag(true);
    }
    return {
        data:function(){return d;}, save:save,
        points:function(){return d.explorerPoints;},
        levelInfo:function(){return levelFor(d.explorerPoints);},
        levels:function(){return LEVELS;},
        cityCount:cityCount,
        isChestOpened:function(id){return !!d.chests[id];},
        addPoints:addPoints,
        openChest:function(ch){
            if(!ch||ch.opened||d.chests[ch.id])return false;
            ch.opened=true; d.chests[ch.id]=true;
            d.cityProgress[ch.area]=cityCount(ch.area);
            var base=ch.tier==='legendary'?10:(ch.tier==='rare'?3:1);
            var t=today(); if(d.daily.date!==t){d.daily.date=t;d.daily.count=0;}
            var dbl=false; if(d.daily.count<5){dbl=true;d.daily.count++;}
            var coinGain=ch.tier==='legendary'?120:(ch.tier==='rare'?60:(20+Math.floor(Math.random()*31)));
            if(typeof coins!=='undefined'){coins+=coinGain;var ce=document.getElementById('coin-hud');if(ce)ce.textContent='\u2B50 '+coins;}
            save();
            if(typeof playChestSound==='function')playChestSound(ch.tier!=='common');
            if(typeof _showChestReward==='function')_showChestReward(coinGain,ch.tier);
            addPoints(dbl?base*2:base,'chest');
            if(dbl&&typeof _showDailyBonus==='function')_showDailyBonus(dbl?base:0);
            if(typeof _updateChestHud==='function')_updateChestHud();
            if(typeof _checkAreaCompletion==='function')_checkAreaCompletion(ch.area);
            return true;
        },
        discoverHidden:function(id,label){
            if(d.hidden[id])return false; d.hidden[id]=true; save();
            addPoints(5,'hidden');
            if(typeof _showHiddenArea==='function')_showHiddenArea(label||id);
            return true;
        },
        raceFinish:function(place){ addPoints(2,'race'); if(place===1)addPoints(5,'race1'); },
        isClaimed:function(area){return !!d.claimed[area];},
        grantArea:function(area,def){
            if(d.claimed[area])return false; d.claimed[area]=true;
            if(def.coins&&typeof coins!=='undefined'){coins+=def.coins;var ce=document.getElementById('coin-hud');if(ce)ce.textContent='\u2B50 '+coins;}
            if(def.title)d.titles[def.title]=true;
            (def.cosmetics||[]).forEach(function(c){d.cosmetics[c]=true;});
            if(def.achievement)d.achievements[def.achievement]=true;
            save();
            if(def.points)addPoints(def.points,'cityComplete');
            return true;
        }
    };
})();

function _makeChestMesh(tier){
    var g=new THREE.Group();
    var rare=(tier==='rare'), leg=(tier==='legendary');
    var bodyHex=leg?0xE0A52A:(rare?0x2E6FB0:0x8B5A2B);
    var lidHex =leg?0xFFD23F:(rare?0x3D86D6:0xA0703A);
    var emiHex =leg?0xC8860A:(rare?0x2E70C0:0x000000);
    var bodyMat=toon(bodyHex,{emissive:emiHex,emissiveIntensity:leg?0.4:(rare?0.25:0)});
    var lidMat =toon(lidHex,{emissive:emiHex,emissiveIntensity:leg?0.45:(rare?0.30:0)});
    var bandMat=toon(leg?0xFFE680:0x6E6E78,{emissive:leg?0x8A6E10:0x222228,emissiveIntensity:leg?0.3:0.1});
    var base=new THREE.Mesh(new THREE.BoxGeometry(1.0,0.6,0.7),bodyMat);
    base.position.y=0.3;g.add(base);
    [-0.34,0.34].forEach(function(bx){
        var band=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.62,0.72),bandMat);
        band.position.set(bx,0.3,0);g.add(band);
    });
    var lidPivot=new THREE.Group();lidPivot.position.set(0,0.6,-0.35);
    var lid=new THREE.Mesh(new THREE.BoxGeometry(1.0,0.28,0.7),lidMat);
    lid.position.set(0,0.0,0.35);lidPivot.add(lid);
    var lidBand=new THREE.Mesh(new THREE.BoxGeometry(1.04,0.30,0.09),bandMat);
    lidBand.position.set(0,0.0,0.35);lidPivot.add(lidBand);
    g.add(lidPivot);
    var lock=new THREE.Mesh(new THREE.BoxGeometry(0.15,0.18,0.08),toon(0xD4AF37,{emissive:0x8A6E10,emissiveIntensity:0.2}));
    lock.position.set(0,0.5,0.37);g.add(lock);
    var glow=null;
    if(rare||leg){
        glow=new THREE.Mesh(new THREE.SphereGeometry(leg?1.15:0.95,12,10),new THREE.MeshBasicMaterial({
            color:leg?0xFFE066:0x66BBFF,transparent:true,opacity:leg?0.26:0.16,depthWrite:false,blending:THREE.AdditiveBlending,fog:false
        }));
        glow.position.y=0.4;g.add(glow);
    }
    g.userData._lidPivot=lidPivot;g.userData._glow=glow;
    return g;
}
function _spawnChest(id,area,x,y,z,rot,tier,inScene){
    var grp=_makeChestMesh(tier);
    grp.position.set(x,y,z);grp.rotation.y=rot;
    (inScene?scene:cityGroup).add(grp);
    var opened=Explorer.isChestOpened(id);
    var ch={id:id,group:grp,x:x,z:z,y:y,tier:tier,area:area,opened:opened,
        lid:grp.userData._lidPivot,glow:grp.userData._glow,inScene:!!inScene,lidAngle:0};
    if(opened&&ch.lid){ch.lidAngle=1.2;ch.lid.rotation.x=-1.2;}
    cityChests.push(ch);
    return ch;
}
function buildCityChests(){
    var area='city'+currentCityStyle;
    var groundY=(currentCityStyle===7)?3.0:0.0;
    var spread=(currentCityStyle===5?MOON_CITY_SIZE:CITY_SIZE)*0.9;
    var placed=0,attempts=0;
    while(placed<CHEST_CITY_TOTAL&&attempts<CHEST_CITY_TOTAL*60){
        attempts++;
        var cx=(Math.random()-0.5)*spread*2, cz=(Math.random()-0.5)*spread*2;
        if(currentCityStyle!==5){
            var skip=false;
            for(var i=0;i<cityColliders.length;i++){var c=cityColliders[i];if(DANBO_WASM.aabb2D(cx,cz,c.x,c.z,c.hw,c.hd,1.2)){skip=true;break;}}
            if(skip)continue;
            if(DANBO_WASM.within2D(cx,cz,0,0,7))continue; // keep spawn center clear
        }
        _spawnChest(area+'_'+placed,area,cx,groundY,cz,Math.random()*Math.PI*2,_tierFromRoll(Math.random()),false);
        placed++;
    }
    _updateChestHud();
    _ensureLeaderboardBtn();
}
function _updateChestHud(){
    var el=document.getElementById('chest-hud');
    if(!el){
        el=document.createElement('div');el.id='chest-hud';
        el.style.cssText='position:fixed;top:44px;left:12px;z-index:50;font:bold 15px system-ui,Segoe UI,sans-serif;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.85);pointer-events:none;line-height:1.5;';
        document.body.appendChild(el);
    }
    var lv=Explorer.levelInfo();
    var co=Explorer.cityCount('city'+currentCityStyle);
    var l1='\uD83E\uDDED Lv'+lv.lv+' '+lv.name+'   \u2728 '+Explorer.points()+' EXP';
    var l2='\uD83E\uDDF0 '+co+'/'+CHEST_CITY_TOTAL;
    if(currentCityStyle<=4)l2+='   \u2601\uFE0F '+Explorer.cityCount('cloud')+'/'+CHEST_CLOUD_TOTAL;
    el.innerHTML=l1+'<br>'+l2;
}
function _floatToast(text,color,topFrom,topTo,life,hold){
    var t=document.createElement('div');t.textContent=text;
    var fadeMs=(hold&&hold>0)?(life||800):800;
    t.style.cssText='position:fixed;left:50%;top:'+topFrom+';transform:translateX(-50%);z-index:61;'+
        'font:bold 18px system-ui,Segoe UI,sans-serif;color:'+color+';text-shadow:0 2px 6px rgba(0,0,0,0.85);'+
        'pointer-events:none;transition:top '+(fadeMs/1000)+'s ease-out,opacity '+(fadeMs/1000)+'s ease-out;opacity:1;';
    document.body.appendChild(t);
    if(hold&&hold>0){
        // Stay fully visible for `hold` ms, then fade + drift out.
        setTimeout(function(){t.style.top=topTo;t.style.opacity='0';},hold);
        setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t);},hold+fadeMs+50);
    } else {
        requestAnimationFrame(function(){t.style.top=topTo;t.style.opacity='0';});
        setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t);},life||900);
    }
}
function _showExpGain(n){ _floatToast('+'+n+' \u2728 EXP','#9FE8FF','18%','12%',850); }
function _showDailyBonus(){ _floatToast('\u2728 \u4ECA\u65E5\u63A2\u7D22\u5956\u52B1\uFF01\u53CC\u500D\u79EF\u5206','#FFE066','26%','21%',1400); }
function _showHiddenArea(label){ _floatToast('\uD83D\uDD0D \u53D1\u73B0\u9690\u85CF\u533A\u57DF\uFF1A'+label+'  +5 \u2728','#C8FFB0','23%','18%',1800); }
function _showChestReward(amount,tier){
    var col=tier==='legendary'?'#FFD23F':(tier==='rare'?'#7FD0FF':'#FFE066');
    var label=tier==='legendary'?'\uD83D\uDC51 \u4F20\u8BF4\u5B9D\u7BB1':(tier==='rare'?'\uD83D\uDC8E \u7A00\u6709\u5B9D\u7BB1':'\uD83E\uDDF0');
    // Chest rewards alone get a 3 s reading hold, followed by a 1 s fade/upward drift.
    _floatToast(label+'  +'+amount+' \u2B50',col,'58%','49%',1000,3000);
}
function _showLevelUp(lv){
    var w=document.createElement('div');
    w.innerHTML='<div style="font-size:14px;opacity:.85;">\u63A2\u7D22\u7B49\u7EA7\u63D0\u5347</div>'+
        '<div style="font-size:24px;font-weight:800;color:#FFD86B;margin-top:4px;">Lv'+lv.lv+'  '+lv.name+'</div>';
    w.style.cssText='position:fixed;left:50%;top:30%;transform:translate(-50%,-50%);z-index:121;padding:16px 28px;border-radius:14px;'+
        'background:linear-gradient(160deg,rgba(20,30,50,.96),rgba(40,30,64,.96));border:2px solid #7FD0FF;'+
        'box-shadow:0 8px 36px rgba(0,0,0,.6),0 0 22px rgba(127,208,255,.5);color:#fff;text-align:center;'+
        'font-family:system-ui,Segoe UI,sans-serif;opacity:0;transition:opacity .4s,top .4s;pointer-events:none;';
    document.body.appendChild(w);
    requestAnimationFrame(function(){w.style.opacity='1';w.style.top='28%';});
    setTimeout(function(){w.style.opacity='0';},2600);
    setTimeout(function(){if(w.parentNode)w.parentNode.removeChild(w);},3100);
}

// ---- Local exploration leaderboard (single-player shows local player) ----
function _ensureLeaderboardBtn(){
    if(document.getElementById('lb-btn'))return;
    var b=document.createElement('div');b.id='lb-btn';b.textContent='\uD83C\uDFC6';
    b.style.cssText='position:fixed;top:86px;right:12px;z-index:55;width:38px;height:38px;border-radius:10px;'+
        'background:rgba(20,24,40,0.7);border:1px solid rgba(255,255,255,0.25);color:#FFD86B;font-size:21px;'+
        'line-height:38px;text-align:center;cursor:pointer;user-select:none;';
    b.onclick=_openLeaderboard;
    document.body.appendChild(b);
}
function _openLeaderboard(){
    var old=document.getElementById('lb-panel');if(old){old.parentNode.removeChild(old);return;}
    var lv=Explorer.levelInfo();
    var name=(typeof CHARACTERS!=='undefined'&&CHARACTERS[selectedChar])?CHARACTERS[selectedChar].name:'Player';
    var p=document.createElement('div');p.id='lb-panel';
    p.style.cssText='position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:130;min-width:300px;max-width:86vw;'+
        'padding:18px 22px;border-radius:16px;background:linear-gradient(160deg,rgba(18,22,38,0.97),rgba(40,30,60,0.97));'+
        'border:2px solid #FFD86B;box-shadow:0 10px 44px rgba(0,0,0,0.6);color:#fff;font-family:system-ui,Segoe UI,sans-serif;';
    var h='<div style="font-size:20px;font-weight:800;color:#FFD86B;text-align:center;margin-bottom:10px;">\uD83C\uDFC6 \u63A2\u7D22\u6392\u884C\u699C</div>';
    h+='<table style="width:100%;border-collapse:collapse;font-size:15px;">';
    h+='<tr style="opacity:.7;"><td style="padding:4px 6px;">#</td><td>\u6635\u79F0</td><td>\u7B49\u7EA7</td><td style="text-align:right;">\u79EF\u5206</td></tr>';
    h+='<tr style="background:rgba(255,216,107,0.12);"><td style="padding:6px;">1</td><td>'+name+'</td><td>Lv'+lv.lv+' '+lv.name+'</td><td style="text-align:right;font-weight:700;">'+Explorer.points()+'</td></tr>';
    h+='</table>';
    h+='<div style="font-size:12px;opacity:.7;margin-top:12px;line-height:1.5;">\u5355\u673A\u6A21\u5F0F\u4EC5\u663E\u793A\u672C\u5730\u73A9\u5BB6\u3002\u8DE8\u73A9\u5BB6\u5B9E\u65F6\u6392\u884C\u699C\u9700\u8054\u7F51\u670D\u52A1\u5668\u3002</div>';
    h+='<div id="lb-close" style="margin-top:14px;text-align:center;color:#9FE8FF;cursor:pointer;">\u5173\u95ED</div>';
    p.innerHTML=h;document.body.appendChild(p);
    document.getElementById('lb-close').onclick=function(){if(p.parentNode)p.parentNode.removeChild(p);};
}

// ============================================================
//  CITY EXPLORATION REWARDS — granted ONCE at 100% per area.
// ============================================================
var REWARDS={
    city0:{coins:500, points:20,title:'title_egg_explorer',           cosmetics:['cosmetic_explorer_hat'],   achievement:'achievement_first_adventure'},
    city1:{coins:500, points:20,title:'title_desert_wanderer',        cosmetics:['cosmetic_desert_scarf'],   achievement:'achievement_lost_ruins'},
    city2:{coins:500, points:20,title:'title_ice_explorer',           cosmetics:['cosmetic_snow_footprints'],achievement:'achievement_frozen_master'},
    city3:{coins:500, points:20,title:'title_lava_challenger',        cosmetics:['cosmetic_flame_trail'],    achievement:'achievement_lava_runner'},
    city4:{coins:500, points:20,title:'title_candy_collector',        cosmetics:['cosmetic_lollipop_hat'],   achievement:'achievement_sweet_journey'},
    city6:{coins:500, points:20,title:'title_sakura_traveler',        cosmetics:['cosmetic_sakura_halo'],    achievement:'achievement_hanami_master'},
    city7:{coins:500, points:20,title:'title_snow_village_guardian',  cosmetics:['cosmetic_winter_hat'],     achievement:'achievement_winter_visitor'},
    city5:{coins:1000,points:30,title:'title_moon_explorer',          cosmetics:['cosmetic_space_helmet'],   achievement:'achievement_to_the_moon'},
    cloud:{coins:1000,points:30,title:'title_cloud_traveler',         cosmetics:['cosmetic_cloud_halo'],     achievement:'achievement_above_the_sky'},
    all:  {coins:5000,points:100,title:'title_legendary_explorer',    cosmetics:['cosmetic_rainbow_footprints','cosmetic_rainbow_halo'], achievement:'achievement_world_explorer'}
};
var REWARD_NAMES={
    title_egg_explorer:'\u86CB\u5B9D\u57CE\u63A2\u9669\u5BB6', title_desert_wanderer:'\u6C99\u6D77\u65C5\u4EBA',
    title_ice_explorer:'\u51B0\u539F\u63A2\u7D22\u5BB6', title_lava_challenger:'\u7194\u5CA9\u6311\u6218\u8005',
    title_candy_collector:'\u7CD6\u679C\u6536\u85CF\u5BB6', title_sakura_traveler:'\u6A31\u82B1\u65C5\u4EBA',
    title_snow_village_guardian:'\u96EA\u6751\u5B88\u62A4\u8005', title_moon_explorer:'\u6708\u9762\u63A2\u9669\u5BB6',
    title_cloud_traveler:'\u4E91\u7AEF\u65C5\u8005', title_legendary_explorer:'\u4F20\u5947\u63A2\u9669\u5BB6',
    cosmetic_explorer_hat:'\u63A2\u9669\u5E3D', cosmetic_desert_scarf:'\u6C99\u6F20\u56F4\u5DFE', cosmetic_snow_footprints:'\u96EA\u5730\u811A\u5370',
    cosmetic_flame_trail:'\u706B\u7130\u62D6\u5C3E', cosmetic_lollipop_hat:'\u68D2\u68D2\u7CD6\u5E3D', cosmetic_sakura_halo:'\u6A31\u82B1\u5149\u73AF',
    cosmetic_winter_hat:'\u51AC\u65E5\u5E3D', cosmetic_space_helmet:'\u592A\u7A7A\u5934\u76D4', cosmetic_cloud_halo:'\u4E91\u6735\u5149\u73AF',
    cosmetic_rainbow_footprints:'\u5F69\u8679\u811A\u5370', cosmetic_rainbow_halo:'\u5F69\u8679\u5149\u73AF',
    achievement_first_adventure:'\u521D\u6B21\u5192\u9669', achievement_lost_ruins:'\u5931\u843D\u9057\u8FF9', achievement_frozen_master:'\u51B0\u5C01\u5927\u5E08',
    achievement_lava_runner:'\u7194\u5CA9\u5954\u8DD1\u8005', achievement_sweet_journey:'\u751C\u871C\u65C5\u7A0B', achievement_hanami_master:'\u8D4F\u82B1\u5927\u5E08',
    achievement_winter_visitor:'\u51AC\u65E5\u8BBF\u5BA2', achievement_to_the_moon:'\u767B\u4E0A\u6708\u7403', achievement_above_the_sky:'\u4E91\u7AEF\u4E4B\u4E0A',
    achievement_world_explorer:'\u4E16\u754C\u63A2\u7D22\u8005'
};
function _rn(id){return REWARD_NAMES[id]||id;}
function _areaDisplayName(area){
    if(area==='all')return '\uD83C\uDF08 \u5168\u5730\u56FE\u63A2\u7D22\u5B8C\u6210\uFF01';
    if(area==='cloud')return '\u2601\uFE0F 云栖蛋境 \u63A2\u7D22 100%\uFF01';
    var idx=parseInt(area.replace('city',''),10);
    var nm=(typeof CITY_STYLES!=='undefined'&&CITY_STYLES[idx])?CITY_STYLES[idx].name:area;
    return nm+' \u63A2\u7D22 100%\uFF01';
}
function _checkAreaCompletion(area){
    if(REWARDS[area]){
        var total=(area==='cloud')?CHEST_CLOUD_TOTAL:CHEST_CITY_TOTAL;
        if(Explorer.cityCount(area)>=total&&Explorer.grantArea(area,REWARDS[area]))_showRewardBanner(area,REWARDS[area]);
    }
    var keys=['city0','city1','city2','city3','city4','city5','city6','city7','cloud'];
    var allDone=keys.every(function(k){var t=(k==='cloud')?CHEST_CLOUD_TOTAL:CHEST_CITY_TOTAL;return Explorer.cityCount(k)>=t;});
    if(allDone&&Explorer.grantArea('all',REWARDS.all))_showRewardBanner('all',REWARDS.all);
}
function _showRewardBanner(area,def){
    var wrap=document.createElement('div');
    wrap.style.cssText='position:fixed;left:50%;top:36%;transform:translate(-50%,-50%);z-index:120;min-width:280px;max-width:82vw;'+
        'padding:18px 26px;border-radius:16px;background:linear-gradient(160deg,rgba(20,24,40,0.96),rgba(44,30,64,0.96));'+
        'border:2px solid #FFD86B;box-shadow:0 8px 40px rgba(0,0,0,0.6),0 0 26px rgba(255,216,107,0.45);color:#fff;'+
        'font-family:system-ui,Segoe UI,sans-serif;text-align:center;opacity:0;transition:opacity 0.4s ease,top 0.4s ease;pointer-events:none;';
    var h='<div style="font-size:22px;font-weight:800;color:#FFD86B;margin-bottom:6px;">'+_areaDisplayName(area)+'</div>';
    h+='<div style="font-size:13px;opacity:0.82;margin-bottom:10px;">\u63A2\u7D22\u5956\u52B1\u5DF2\u53D1\u653E</div>';
    h+='<div style="font-size:16px;line-height:1.7;text-align:left;display:inline-block;">';
    if(def.title)h+='\uD83C\uDFC5 \u79F0\u53F7\uFF1A'+_rn(def.title)+'<br>';
    (def.cosmetics||[]).forEach(function(c){h+='\uD83C\uDF80 \u88C5\u626E\uFF1A'+_rn(c)+'<br>';});
    if(def.points)h+='\u2728 +'+def.points+' \u63A2\u7D22\u79EF\u5206<br>';
    if(def.coins)h+='\u2B50 '+def.coins+' \u91D1\u5E01<br>';
    if(def.achievement)h+='\uD83C\uDFC6 \u6210\u5C31\uFF1A'+_rn(def.achievement)+'<br>';
    h+='</div>';
    wrap.innerHTML=h;
    document.body.appendChild(wrap);
    requestAnimationFrame(function(){wrap.style.opacity='1';wrap.style.top='33%';});
    setTimeout(function(){wrap.style.opacity='0';},4600);
    setTimeout(function(){if(wrap.parentNode)wrap.parentNode.removeChild(wrap);},5200);
}



// ---- Warp Pipes (Mario 3D World style transparent tubes) ----
function buildWarpPipes(){
    warpPipeMeshes.forEach(function(wp){cityGroup.remove(wp.group);});
    warpPipeMeshes=[];
    // No ground warp pipes on moon (only reachable from cloud world)
    if(currentCityStyle===5)return;
    var pipeMat=new THREE.MeshPhongMaterial({color:0x44DD44,transparent:true,opacity:0.45,side:THREE.DoubleSide});
    var rimMat=toon(0x33BB33,{emissive:0x22AA22,emissiveIntensity:0.2});
    // Build pipe targets: ground pipes go to cities 0-4 only (not moon=5)
    var targets=[];
    for(var ti=0;ti<CITY_STYLES.length;ti++){
        if(ti===currentCityStyle)continue;
        if(ti===5)continue; // Moon city only reachable from cloud world
        targets.push(ti);
    }
    // Place pipes at city edges (from config)
    var positions=PORTAL_POSITIONS.warpPipes;
    // Snow village: offset pipes to avoid dock (z=145 area)
    if(currentCityStyle===7){
        positions=positions.map(function(p){
            if(DANBO_WASM.absDeltaLess(p.x,0,10)&&p.z>100)return{x:60,z:110,targetOffset:p.targetOffset};
            return p;
        });
    }
    var pipeColors=[0x44DD44,0x44CCFF,0xFF8844,0xFF44DD,0xFFDD44,0xCCCCFF,0xFFAABB,0xE8EEF0];
    for(var pi2=0;pi2<Math.min(targets.length,positions.length);pi2++){
        var tgt=targets[pi2];
        var pos=positions[pi2];
        var tst=CITY_STYLES[tgt];
        var g=new THREE.Group();
        var pColor=pipeColors[tgt]||0x44DD44;
        var pMat=new THREE.MeshPhongMaterial({color:pColor,transparent:true,opacity:0.4,side:THREE.DoubleSide});
        // Vertical tube — big and visible
        var tube=new THREE.Mesh(new THREE.CylinderGeometry(PIPE_CONFIG.radius,PIPE_CONFIG.radius,PIPE_CONFIG.height,16,1,true),pMat);
        tube.position.y=PIPE_CONFIG.height/2;g.add(tube);
        // Top rim
        var rim=new THREE.Mesh(new THREE.TorusGeometry(PIPE_CONFIG.ringRadius,PIPE_CONFIG.ringThickness,8,16),toon(pColor,{emissive:pColor,emissiveIntensity:0.4}));
        rim.position.y=PIPE_CONFIG.height;rim.rotation.x=Math.PI/2;g.add(rim);
        // Bottom rim
        var rim2=new THREE.Mesh(new THREE.TorusGeometry(PIPE_CONFIG.ringRadius,0.35,8,16),toon(pColor,{emissive:pColor,emissiveIntensity:0.3}));
        rim2.position.y=0.1;rim2.rotation.x=Math.PI/2;g.add(rim2);
        // Inner glow spiral — more orbs
        var sMat=new THREE.MeshBasicMaterial({color:pColor,transparent:true,opacity:0.5});
        for(var si=0;si<12;si++){
            var sp=new THREE.Mesh(new THREE.SphereGeometry(0.4,6,4),sMat);
            var a=si/12*Math.PI*2;
            sp.position.set(Math.cos(a)*1.8,0.5+si*0.6,Math.sin(a)*1.8);
            g.add(sp);
        }
        // Beacon light on top
        var beacon=new THREE.Mesh(new THREE.SphereGeometry(0.8,8,6),new THREE.MeshBasicMaterial({color:pColor,transparent:true,opacity:0.7}));
        beacon.position.y=9;g.add(beacon);
        // Label sign
        var canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;
        var ctx2=canvas.getContext('2d');
        ctx2.fillStyle='rgba(0,0,0,0.6)';ctx2.fillRect(0,0,256,64);
        ctx2.fillStyle='#fff';ctx2.font='bold 28px sans-serif';ctx2.textAlign='center';
        ctx2.fillText(tst.name,128,42);
        var tex=new THREE.CanvasTexture(canvas);
        var signMat=new THREE.SpriteMaterial({map:tex,transparent:true});
        var sign=new THREE.Sprite(signMat);
        sign.scale.set(5,1.2,1);sign.position.y=10.5;
        g.add(sign);
        var _pipeY=currentCityStyle===7?3:0;
        g.position.set(pos.x,_pipeY,pos.z);
        cityGroup.add(g);
        warpPipeMeshes.push({group:g,x:pos.x,z:pos.z,y:_pipeY,targetStyle:tgt,_cooldown:false});
    }
}

var _danboCityTextureSlots=['map','alphaMap','aoMap','bumpMap','normalMap','roughnessMap','metalnessMap',
    'emissiveMap','lightMap','displacementMap','envMap','gradientMap','clearcoatMap','clearcoatNormalMap',
    'clearcoatRoughnessMap','sheenColorMap','sheenRoughnessMap','transmissionMap','thicknessMap',
    'iridescenceMap','iridescenceThicknessMap','specularMap','specularColorMap','specularIntensityMap'];
function _disposeCityGroupResources(){
    if(!cityGroup)return;
    var keepGeometry=new Set(),keepMaterial=new Set(),keepTexture=new Set();
    var cityGeometry=new Set(),cityMaterial=new Set(),cityTexture=new Set(),cityBatches=new Set();
    function collectMaterial(material,materials,textures){
        if(!material)return;
        if(Array.isArray(material)){for(var ai=0;ai<material.length;ai++)collectMaterial(material[ai],materials,textures);return;}
        if(!material.isMaterial)return;
        materials.add(material);
        for(var ti=0;ti<_danboCityTextureSlots.length;ti++){
            var texture=material[_danboCityTextureSlots[ti]];
            if(texture&&texture.isTexture)textures.add(texture);
        }
        if(material.uniforms)Object.keys(material.uniforms).forEach(function(key){
            var value=material.uniforms[key]&&material.uniforms[key].value;
            if(value&&value.isTexture)textures.add(value);
        });
    }
    function collectObject(root,geometries,materials,textures,batches){
        if(!root||!root.isObject3D)return;
        root.traverse(function(object){
            if(object.geometry&&object.geometry.isBufferGeometry)geometries.add(object.geometry);
            collectMaterial(object.material,materials,textures);
            if(batches&&object.isBatchedMesh)batches.add(object);
        });
    }
    // Anything still used outside cityGroup must remain alive.  Cached PBR assets
    // are also protected because later cities intentionally reuse them.
    if(typeof scene!=='undefined'&&scene&&scene.children){
        for(var si=0;si<scene.children.length;si++)if(scene.children[si]!==cityGroup)
            collectObject(scene.children[si],keepGeometry,keepMaterial,keepTexture,null);
        if(scene.background&&scene.background.isTexture)keepTexture.add(scene.background);
        if(scene.environment&&scene.environment.isTexture)keepTexture.add(scene.environment);
    }
    function protectValue(value,seen,depth){
        if(!value||depth>5)return;
        if(value.isTexture){keepTexture.add(value);return;}
        if(value.isMaterial){collectMaterial(value,keepMaterial,keepTexture);return;}
        if(value.isBufferGeometry){keepGeometry.add(value);return;}
        if(typeof value!=='object')return;
        if(seen.has(value))return;seen.add(value);
        if(Array.isArray(value)){for(var ai=0;ai<value.length;ai++)protectValue(value[ai],seen,depth+1);return;}
        Object.keys(value).forEach(function(key){protectValue(value[key],seen,depth+1);});
    }
    var seen=new Set();
    [
        typeof _visualGeometryCache!=='undefined'?_visualGeometryCache:null,
        typeof _visualSurfaceMaterials!=='undefined'?_visualSurfaceMaterials:null,
        typeof _visualSurfaceTextureSets!=='undefined'?_visualSurfaceTextureSets:null,
        typeof _visualSoftTex!=='undefined'?_visualSoftTex:null,
        typeof _visualFlareTex!=='undefined'?_visualFlareTex:null,
        typeof _cityPBRCache!=='undefined'?_cityPBRCache:null,
        typeof _cityLegacyPBRCache!=='undefined'?_cityLegacyPBRCache:null,
        typeof toonTex!=='undefined'?toonTex:null,
        window._danboPortalGeometryCache,window._danboPortalTextures,window._danboPortalCurtainTextures,
        window._danboCinematicCoinCache,window._danboReflectionEnvironment,window._danboHDRIBackground
    ].forEach(function(value){protectValue(value,seen,0);});

    collectObject(cityGroup,cityGeometry,cityMaterial,cityTexture,cityBatches);
    cityBatches.forEach(function(batch){if(batch&&batch.dispose)batch.dispose();});
    cityGeometry.forEach(function(geometry){if(!keepGeometry.has(geometry)&&geometry.dispose)geometry.dispose();});
    cityMaterial.forEach(function(material){if(!keepMaterial.has(material)&&material.dispose)material.dispose();});
    cityTexture.forEach(function(texture){if(!keepTexture.has(texture)&&texture.dispose)texture.dispose();});
    window.DANBO_CITY_DISPOSE_STATS={geometries:cityGeometry.size-Array.from(cityGeometry).filter(function(v){return keepGeometry.has(v);}).length,
        materials:cityMaterial.size-Array.from(cityMaterial).filter(function(v){return keepMaterial.has(v);}).length,
        textures:cityTexture.size-Array.from(cityTexture).filter(function(v){return keepTexture.has(v);}).length,
        batches:cityBatches.size};
}

function _prewarmCityShaders(){
    // On browsers exposing KHR_parallel_shader_compile, Three's async prewarm
    // moves program compilation into the remaining pipe-flight time instead of
    // making the first visible city frame pay the entire shader cost.
    if(typeof R==='undefined'||!R.compileAsync||typeof scene==='undefined'||typeof camera==='undefined')return;
    try{
        var pending=R.compileAsync(scene,camera);
        window.DANBO_CITY_SHADER_PREWARM=pending;
        if(pending&&pending.catch)pending.catch(function(error){console.warn('City shader prewarm skipped:',error);});
    }catch(error){console.warn('City shader prewarm skipped:',error);}
}

function clearCity(){
    if(typeof _clearCityVisualFX==='function')_clearCityVisualFX();
    cityGroup.userData._danboInstancesOptimized=false;
    // Release transient city GPU resources before dropping the last references.
    // Shared geometry, PBR textures and player/world resources remain cached.
    _disposeCityGroupResources();
    while(cityGroup.children.length>0)cityGroup.remove(cityGroup.children[0]);
    if(typeof R!=='undefined'&&R.renderLists&&R.renderLists.dispose)R.renderLists.dispose();
    cityColliders.length=0;
    cityBuildingMeshes.length=0;
    // Remove scene-added coins (cloud world coins)
    for(var ci=0;ci<cityCoins.length;ci++){if(cityCoins[ci].inScene)scene.remove(cityCoins[ci].mesh);}
    cityCoins.length=0;
    // Remove scene-added chests (cloud world) and reset chest list
    for(var chi=0;chi<cityChests.length;chi++){if(cityChests[chi].inScene&&cityChests[chi].group)scene.remove(cityChests[chi].group);}
    cityChests.length=0;
    cityProps.length=0;
    window.DANBO_DYNAMIC_CITY_INSTANCES=[];
    window.DANBO_DYNAMIC_CITY_INSTANCE_ROOTS=[];
    warpPipeMeshes.length=0;
    window._fountainParticles=null;
    window._fountainSplashParticles=null;
    window._fountainPoolWater=null;
    window._fountainRipples=null;
    window._fountainWaterHighlights=null;
    window._fountainGroup=null;
    window._fountainCollider=null;
    window._fountainDefinition=null;
    window._fountainRippleStrength=1;
    window._fountainSplashStrength=1;
    window._sakuraPetals=null;
    window._sakuraCanalWater=null;
    window._sakuraStreamAnimals=null;
    window._fountainInnerWater=null;
    window._cityFish=null;
    window._waterWheels=null;
    window._oceanMesh=null;
    window._waveRings=null;
    window._snowParticles=null;
    window._snowCitySteam=null;
    window._snowCityWater=null;
    if(window._cityAnimals){for(var _cai=0;_cai<window._cityAnimals.length;_cai++){var _ca=window._cityAnimals[_cai];if(_ca._inScene)scene.remove(_ca.group);else if(_ca.group&&_ca.group.parent)_ca.group.parent.remove(_ca.group);}}
    window._cityAnimals=null;
    if(window._allProjectiles){for(var _api2=0;_api2<window._allProjectiles.length;_api2++){MoveProjectile_cleanup(window._allProjectiles[_api2]);}window._allProjectiles=[];}
    window._playerHadouken=null;
    // Remove city NPCs
    for(var i=0;i<cityNPCs.length;i++){_removeStunStars(cityNPCs[i]);scene.remove(cityNPCs[i].mesh);}
    cityNPCs.length=0;
    // Remove from allEggs
    for(var j=allEggs.length-1;j>=0;j--){if(allEggs[j].cityNPC){scene.remove(allEggs[j].mesh);allEggs.splice(j,1);}}
    // Remove clouds
    for(var k=0;k<cityCloudPlatforms.length;k++){scene.remove(cityCloudPlatforms[k].group);}
    cityCloudPlatforms.length=0;
    // Remove cloud world moon pipes
    if(_cloudWorldPipes&&_cloudWorldPipes.length){
        for(var _cwpi=0;_cwpi<_cloudWorldPipes.length;_cwpi++)if(_cloudWorldPipes[_cwpi]&&_cloudWorldPipes[_cwpi].group)scene.remove(_cloudWorldPipes[_cwpi].group);
        _cloudWorldPipes.length=0;
    }else if(_cloudWorldPipe&&_cloudWorldPipe.group)scene.remove(_cloudWorldPipe.group);
    _cloudWorldPipe=null;
    // Remove moon earth
    if(window._moonEarth){scene.remove(window._moonEarth);window._moonEarth=null;}
    // Remove moon stars
    if(window._moonStars){for(var si=0;si<window._moonStars.length;si++){scene.remove(window._moonStars[si].mesh);}window._moonStars=null;}
    // Remove moon nebulae
    if(window._moonNebulae){for(var ni=0;ni<window._moonNebulae.length;ni++){scene.remove(window._moonNebulae[ni]);}window._moonNebulae=null;}
    // Remove moon Gundams
    if(window._moonGundams){for(var gi=0;gi<window._moonGundams.length;gi++){scene.remove(window._moonGundams[gi].group);}window._moonGundams=null;}
    if(window._moonBeams){for(var bi=0;bi<window._moonBeams.length;bi++){scene.remove(window._moonBeams[bi].mesh);}window._moonBeams=null;}
    if(window._moonMissiles){for(var mmi=0;mmi<window._moonMissiles.length;mmi++){scene.remove(window._moonMissiles[mmi].group);}window._moonMissiles=null;}
    window._moonShields=null;
    // Remove shield dome visual meshes from scene
    if(window._moonShieldDomes){for(var _sdi=0;_sdi<window._moonShieldDomes.length;_sdi++){scene.remove(window._moonShieldDomes[_sdi]);}window._moonShieldDomes=null;}
    window._moonCities=null;
    window._moonBldgColliders=null;
    window._moonRover=null;
    window._earthReturnPortal=null;
    // Remove solar system objects
    if(window._solarPlanets){for(var spi=0;spi<window._solarPlanets.length;spi++){scene.remove(window._solarPlanets[spi].mesh);}window._solarPlanets=null;}
    if(window._sunSolar){scene.remove(window._sunSolar);window._sunSolar=null;}
    if(window._sunSolarGlow){scene.remove(window._sunSolarGlow);window._sunSolarGlow=null;}
    if(window._solarLight){scene.remove(window._solarLight);window._solarLight=null;}
    // Remove Tower of Babel
    if(_babylonTower){scene.remove(_babylonTower.group);_babylonTower=null;}
    _babylonTriggered=false;_babylonRising=false;_babylonRiseY=-52;_earthquakeTimer=0;
    _moonPipeDismissed=false;_moonPipePromptOpen=false;
}

function applyCityTheme(){
    var st=CITY_STYLES[currentCityStyle];
    var isMoon=(currentCityStyle===5);
    // Ground cities share one physically coherent HDRI. The raw equirectangular
    // texture remains visible while its PMREM convolution drives PBR materials.
    scene.background=(!isMoon&&window._danboHDRIBackground)?window._danboHDRIBackground:new THREE.Color(st.sky);
    scene.backgroundIntensity=!isMoon?(RENDER_CONFIG.backgroundIntensity||0.85):1;
    scene.environmentIntensity=!isMoon?(RENDER_CONFIG.environmentIntensity||0.9):0.28;
    if(typeof _updateSkyDome==='function'){
        var horizon=st.fog||_mixHex(st.sky,0xFFFFFF,currentCityStyle===5?0.08:0.38);
        var groundTint=st.ground||st.path||0x88CCAA;
        if(currentCityStyle===0){horizon=0x8FC4DA;groundTint=0x355D40;}
        if(currentCityStyle===7){horizon=0x91A7C9;groundTint=0x293C5A;}
        if(currentCityStyle===5){horizon=0x111133;groundTint=0x020208;}
        _updateSkyDome(st.sky,horizon,groundTint);
        if(typeof _skyDome!=='undefined')_skyDome.visible=!window._danboHDRIBackground&& !isMoon;
    }
    if(typeof R!=='undefined'){
        R.toneMappingExposure=RENDER_CONFIG.toneExposure||0.66;
    }
    // Match aerial perspective to the HDRI horizon instead of tinting each city
    // with an unrelated linear fog color.
    scene.fog=isMoon?new THREE.FogExp2(0x070712,0.0008):new THREE.FogExp2(RENDER_CONFIG.fogColor,RENDER_CONFIG.fogDensity||0.0021);
    if(typeof rimLight!=='undefined'){
        rimLight.visible=true;rimLight.color.setHex(0xCFEAFF);rimLight.intensity=isMoon?0:0.04;
    }
    if(typeof softFillLight!=='undefined'){
        softFillLight.visible=true;softFillLight.color.setHex(0xFFE2CF);softFillLight.intensity=isMoon?0:0.03;
    }
    // Keep the light set stable across themes; changing only intensity avoids the
    // expensive all-material shader recompile caused by changing light counts.
    sun.visible=true;
    sun.intensity=isMoon?0:(RENDER_CONFIG.sunIntensity||5.2);
    sun.color.setHex(RENDER_CONFIG.sunColor||0xFFD9A0);
    sun.shadow.camera.far=RENDER_CONFIG.shadowFar;
    sun.shadow.radius=RENDER_CONFIG.shadowRadius||3;
    _sunMesh.visible=!isMoon&&!window._danboHDRIBackground;
    _sunGlow.visible=!isMoon&&!window._danboHDRIBackground;
    scene.children.forEach(function(c){
        if(c.isAmbientLight){c.color.setHex(0xffffff);c.intensity=isMoon?0.08:RENDER_CONFIG.ambientIntensity;}
        if(c.isHemisphereLight){c.color.setHex(RENDER_CONFIG.hemiSkyColor);c.groundColor.setHex(RENDER_CONFIG.hemiGroundColor);c.intensity=isMoon?0.12:RENDER_CONFIG.hemiIntensity;}
    });
    // Update HUD
    document.getElementById('city-name-hud').textContent=st.name;
    if(typeof _rebuildCityVisualFX==='function')_rebuildCityVisualFX(currentCityStyle,st);
}

// ---- Pipe travel animation state ----
var _pipeTraveling=false, _pipeTimer=0, _pipeDuration=PIPE_CONFIG.travelDuration, _pipeArrivalCooldown=0; // 3 seconds at 60fps
var _pipeStartX=0, _pipeStartZ=0, _pipeEndX=0, _pipeEndZ=0;
var _pipeTubeGroup=null, _pipeTargetStyle=0;
var _pipeMidX=0, _pipeMidZ=0;
var _pipeStartY=3; // starting Y height for pipe travel
var _pipeCityLoadPending=false;
var _pipeCityLoadFailed=false;

function _ensureCityDataLoaded(style,done){
    if(!window.DANBO_CITY_DATA||!DANBO_CITY_DATA.ensureCityLoaded){done(true);return;}
    if(DANBO_CITY_DATA.isLoaded&&DANBO_CITY_DATA.isLoaded(style)){done(true);return;}
    DANBO_CITY_DATA.ensureCityLoaded(style).then(function(){done(true);}).catch(function(err){
        console.error('Failed to load city '+style,err);
        done(false);
    });
}

function startPipeTravel(fromX,fromZ,targetStyle,fromY){
    _pipeCityLoadFailed=false;
    if(window.DANBO_CITY_DATA&&DANBO_CITY_DATA.ensureCityLoaded&&DANBO_CITY_DATA.isLoaded&&!DANBO_CITY_DATA.isLoaded(targetStyle)&&!_pipeCityLoadPending){
        // Start loading the target city during the pipe flight. If it is still
        // not ready at the rebuild point, updatePipeTravel pauses briefly high
        // above the scene instead of making the entrance feel unresponsive.
        _pipeCityLoadPending=true;
        _ensureCityDataLoaded(targetStyle,function(ok){_pipeCityLoadPending=false;if(!ok)_pipeCityLoadFailed=true;});
    }
    if(typeof _resetViewMode==='function')_resetViewMode();
    if(playerEgg&&playerEgg.mesh)playerEgg.mesh.visible=true;
    _pipeTraveling=true;_pipeTimer=0;_pipeTargetStyle=targetStyle;
    _pipeStartX=fromX;_pipeStartZ=fromZ;
    _pipeStartY=(fromY!==undefined)?fromY:3;
    camera.up.set(0,1,0); // reset camera up for pipe travel
    // Destination is far away — simulate flying to a distant continent
    // Direction from pipe position determines flight direction
    var dirX=fromX,dirZ=fromZ;
    var dirLen=DANBO_WASM.len2D(dirX,dirZ);
    if(dirLen>0.1){dirX/=dirLen;dirZ/=dirLen;}else{dirX=0;dirZ=-1;}
    // Fly 400 units outward then curve back to center of new city
    _pipeEndX=0;_pipeEndZ=0;
    var midX=fromX+dirX*200;
    var midZ=fromZ+dirZ*200;
    _pipeMidX=midX;_pipeMidZ=midZ;
    // Build the transparent tube corridor — long arc through sky
    _pipeTubeGroup=new THREE.Group();
    var steps=40;
    var tubeColor=CITY_STYLES[targetStyle]?0x44FF88:0x44DD44;
    var pipeColors=[0x44DD44,0x44CCFF,0xFF8844,0xFF44DD,0xFFDD44,0xCCCCFF,0xFFAABB];
    var pColor=pipeColors[targetStyle]||tubeColor;
    var isMoonTravel=(targetStyle===5);
    if(isMoonTravel)pColor=0x6644CC;
    var tubeMat=new THREE.MeshPhongMaterial({color:pColor,transparent:true,opacity:isMoonTravel?0.15:0.25,side:THREE.DoubleSide});
    for(var i=0;i<steps;i++){
        var t=i/steps;
        // Quadratic bezier: start → mid (far away) → end (center)
        var u=1-t;
        var px=u*u*fromX+2*u*t*midX+t*t*_pipeEndX;
        var pz=u*u*fromZ+2*u*t*midZ+t*t*_pipeEndZ;
        var py=_pipeStartY+Math.sin(t*Math.PI)*60; // high arc — 60 units up
        var seg=new THREE.Mesh(new THREE.CylinderGeometry(3,3,3,10,1,true),tubeMat);
        seg.position.set(px,py,pz);
        if(i<steps-1){
            var t2=(i+1)/steps;var u2=1-t2;
            var nx=u2*u2*fromX+2*u2*t2*midX+t2*t2*_pipeEndX;
            var nz=u2*u2*fromZ+2*u2*t2*midZ+t2*t2*_pipeEndZ;
            var ny=_pipeStartY+Math.sin(t2*Math.PI)*60;
            seg.lookAt(nx,ny,nz);seg.rotateX(Math.PI/2);
        }
        _pipeTubeGroup.add(seg);
        if(i%5===0){
            var ringColor=isMoonTravel?0x8866DD:pColor;
            var ring=new THREE.Mesh(new THREE.TorusGeometry(3,0.2,8,16),new THREE.MeshBasicMaterial({color:ringColor,transparent:true,opacity:isMoonTravel?0.5:0.4}));
            ring.position.set(px,py,pz);
            if(i<steps-1){
                var t3=(i+1)/steps;var u3=1-t3;
                ring.lookAt(u3*u3*fromX+2*u3*t3*midX+t3*t3*_pipeEndX,_pipeStartY+Math.sin(t3*Math.PI)*60,u3*u3*fromZ+2*u3*t3*midZ+t3*t3*_pipeEndZ);
            }
            _pipeTubeGroup.add(ring);
        }
        // Moon travel: stars and nebula particles inside the tunnel
        if(isMoonTravel&&i%2===0){
            var starColors2=[0xFFFFFF,0xCCDDFF,0xFFCCDD,0xDDCCFF,0xAABBFF,0xFFEECC];
            for(var si=0;si<3;si++){
                var sa=Math.random()*Math.PI*2;
                var sr=0.5+Math.random()*2.5;
                var ssc=starColors2[Math.floor(Math.random()*starColors2.length)];
                var sStar=new THREE.Mesh(new THREE.SphereGeometry(0.08+Math.random()*0.15,4,3),new THREE.MeshBasicMaterial({color:ssc,transparent:true,opacity:0.7+Math.random()*0.3}));
                sStar.position.set(px+Math.cos(sa)*sr,py+Math.sin(sa)*sr,pz+(Math.random()-0.5)*2);
                _pipeTubeGroup.add(sStar);
            }
            // Nebula wisps
            if(i%6===0){
                var nebC=[0x330055,0x440033,0x220044,0x110033][Math.floor(Math.random()*4)];
                var neb=new THREE.Mesh(new THREE.SphereGeometry(2+Math.random()*2,6,4),new THREE.MeshBasicMaterial({color:nebC,transparent:true,opacity:0.15+Math.random()*0.1,side:THREE.BackSide}));
                neb.position.set(px+(Math.random()-0.5)*4,py+(Math.random()-0.5)*3,pz+(Math.random()-0.5)*4);
                _pipeTubeGroup.add(neb);
            }
        }
    }
    scene.add(_pipeTubeGroup);
    // Disable fog during travel so tube is visible
    scene.fog=null;
    // Pipe travel sound — suction entry + rushing wind + sparkle ticks
    if(sfxEnabled){
        var ctx=ensureAudio();var ct=ctx.currentTime;
        // 1) Suction entry — descending pitch "fwoop"
        var suc=ctx.createOscillator();var sucG=ctx.createGain();
        suc.type='sawtooth';suc.frequency.setValueAtTime(800,ct);suc.frequency.exponentialRampToValueAtTime(100,ct+0.4);
        sucG.gain.setValueAtTime(0.15,ct);sucG.gain.exponentialRampToValueAtTime(0.001,ct+0.5);
        suc.connect(sucG);sucG.connect(ctx.destination);suc.start(ct);suc.stop(ct+0.5);
        // 2) Rushing wind — filtered noise for 3 seconds
        var windBuf=ctx.createBuffer(1,Math.floor(ctx.sampleRate*3),ctx.sampleRate);
        var wd=windBuf.getChannelData(0);
        for(var wi=0;wi<wd.length;wi++){
            var wp=wi/wd.length;
            var env=Math.sin(wp*Math.PI); // fade in and out
            wd[wi]=(Math.random()-0.5)*0.12*env;
        }
        var windSrc=ctx.createBufferSource();windSrc.buffer=windBuf;
        var windFilt=ctx.createBiquadFilter();windFilt.type='bandpass';windFilt.frequency.value=600;windFilt.Q.value=2;
        var windG=ctx.createGain();windG.gain.value=0.2;
        windSrc.connect(windFilt);windFilt.connect(windG);windG.connect(ctx.destination);
        windSrc.start(ct+0.2);windSrc.stop(ct+3.2);
        // 3) Sparkle ticks during flight — ascending pings
        for(var ti=0;ti<8;ti++){
            var tt=ct+0.4+ti*0.35;
            var ping=ctx.createOscillator();var pingG=ctx.createGain();
            ping.type='sine';
            var pf=600+ti*150;
            ping.frequency.setValueAtTime(pf,tt);ping.frequency.exponentialRampToValueAtTime(pf*1.5,tt+0.08);
            pingG.gain.setValueAtTime(0.08,tt);pingG.gain.exponentialRampToValueAtTime(0.001,tt+0.12);
            ping.connect(pingG);pingG.connect(ctx.destination);ping.start(tt);ping.stop(tt+0.12);
        }
        // 4) Arrival pop — at end of travel
        var popTime=ct+2.8;
        var pop=ctx.createOscillator();var popG=ctx.createGain();
        pop.type='sine';pop.frequency.setValueAtTime(150,popTime);pop.frequency.exponentialRampToValueAtTime(600,popTime+0.1);pop.frequency.exponentialRampToValueAtTime(200,popTime+0.3);
        popG.gain.setValueAtTime(0.18,popTime);popG.gain.exponentialRampToValueAtTime(0.001,popTime+0.4);
        pop.connect(popG);popG.connect(ctx.destination);pop.start(popTime);pop.stop(popTime+0.4);
        // Arrival chime
        var chime1=ctx.createOscillator();var chG1=ctx.createGain();
        chime1.type='triangle';chime1.frequency.value=880;
        chG1.gain.setValueAtTime(0.1,popTime+0.1);chG1.gain.exponentialRampToValueAtTime(0.001,popTime+0.6);
        chime1.connect(chG1);chG1.connect(ctx.destination);chime1.start(popTime+0.1);chime1.stop(popTime+0.6);
        var chime2=ctx.createOscillator();var chG2=ctx.createGain();
        chime2.type='triangle';chime2.frequency.value=1320;
        chG2.gain.setValueAtTime(0.08,popTime+0.2);chG2.gain.exponentialRampToValueAtTime(0.001,popTime+0.7);
        chime2.connect(chG2);chG2.connect(ctx.destination);chime2.start(popTime+0.2);chime2.stop(popTime+0.7);
    }
}

function updatePipeTravel(){
    if(!_pipeTraveling||!playerEgg)return;
    _pipeTimer++;
    var t=_pipeTimer/_pipeDuration;
    if(t>1)t=1;
    // Smooth ease in-out
    var st=t<0.5?2*t*t:(1-Math.pow(-2*t+2,2)/2);
    // Quadratic bezier: start → mid (far away) → end (center)
    var u=1-st;
    var px=u*u*_pipeStartX+2*u*st*_pipeMidX+st*st*_pipeEndX;
    var pz=u*u*_pipeStartZ+2*u*st*_pipeMidZ+st*st*_pipeEndZ;
    var py=_pipeStartY+Math.sin(st*Math.PI)*60;
    playerEgg.mesh.position.set(px,py,pz);
    playerEgg.vx=0;playerEgg.vy=0;playerEgg.vz=0;
    playerEgg.mesh.rotation.y+=0.15;
    // Camera follows from behind and above
    var camDist=15;
    var lookAhead=Math.min(st+0.05,1);
    var lu=1-lookAhead;
    var lx=lu*lu*_pipeStartX+2*lu*lookAhead*_pipeMidX+lookAhead*lookAhead*_pipeEndX;
    var lz=lu*lu*_pipeStartZ+2*lu*lookAhead*_pipeMidZ+lookAhead*lookAhead*_pipeEndZ;
    var ly=_pipeStartY+Math.sin(lookAhead*Math.PI)*60;
    var cdx=px-lx,cdz=pz-lz;
    var cl=DANBO_WASM.len2D(cdx,cdz)||1;
    camera.position.set(px+cdx/cl*camDist,py+6,pz+cdz/cl*camDist);
    camera.lookAt(px,py,pz);
    // At 40% — rebuild city (while player is high up and can't see ground)
    if(_pipeTimer===Math.floor(_pipeDuration*0.4)){
        if(window.DANBO_CITY_DATA&&DANBO_CITY_DATA.isLoaded&&!DANBO_CITY_DATA.isLoaded(_pipeTargetStyle)){
            if(!_pipeCityLoadFailed){
                _pipeTimer--;
                return;
            }
            console.warn('Continue pipe travel with unloaded city '+_pipeTargetStyle);
        }
        _prevCityStyle=currentCityStyle;
        currentCityStyle=_pipeTargetStyle;
        clearCity();
        buildCity();
        buildPortals();
        buildCityCoins();
        buildCityChests();
        buildWarpPipes();
        if(typeof _cityUpgradeMaterialsToPBR==='function')_cityUpgradeMaterialsToPBR();
        _optimizeCityInstances();
        addClouds();
        spawnCityNPCs();
        applyCityTheme();
        _prewarmCityShaders();
        stopBGM();stopRaceBGM();
        startBGM();
    }
    // Done
    if(_pipeTimer>=_pipeDuration){
        _pipeTraveling=false;
        _pipeArrivalCooldown=60; // 1 second grace period before portal checks
        if(_pipeTubeGroup){scene.remove(_pipeTubeGroup);_pipeTubeGroup=null;}
        if(currentCityStyle===5){
            // Moon flat: spawn inside Von Braun city
            playerEgg.mesh.position.set(-200,3,0);
            playerEgg.vy=0;playerEgg.vx=0;playerEgg.vz=0;
            playerEgg.onGround=false;
            camera.position.set(-200,12,19);camera.lookAt(-200,0,0);
            camera.up.set(0,1,0);
        } else if(currentCityStyle===6){
            playerEgg.mesh.position.set(0,14,-30);
            playerEgg.vy=0;playerEgg.vx=0;playerEgg.vz=0;
            playerEgg.onGround=false;
            camera.position.set(0,22,-16);camera.lookAt(0,8,-30);
            camera.up.set(0,1,0);
        } else {
            playerEgg.mesh.position.set(0,15,0);
            playerEgg.vy=0;playerEgg.vx=0;playerEgg.vz=0;
            playerEgg.onGround=false;
            camera.position.set(0,12,19);camera.lookAt(0,0,5);
            camera.up.set(0,1,0);
        }
        for(var i=0;i<warpPipeMeshes.length;i++)warpPipeMeshes[i]._cooldown=true;
        // SOTN area name reveal after pipe travel
        _showCityAreaName(currentCityStyle);
    }
}

function switchCity(targetStyle){
    if(targetStyle===currentCityStyle)return;
    if(window.DANBO_CITY_DATA&&DANBO_CITY_DATA.ensureCityLoaded&&DANBO_CITY_DATA.isLoaded&&!DANBO_CITY_DATA.isLoaded(targetStyle)){
        _ensureCityDataLoaded(targetStyle,function(ok){if(ok)switchCity(targetStyle);});
        return;
    }
    if(typeof _resetViewMode==='function')_resetViewMode();
    _prevCityStyle=currentCityStyle;
    currentCityStyle=targetStyle;
    _cameraZoom=1.0; // reset zoom on city switch
    // Remember player was near a pipe — spawn at center of new city
    clearCity();
    buildCity();
    buildPortals();
    buildCityCoins();
    buildCityChests();
    buildWarpPipes();
    if(typeof _cityUpgradeMaterialsToPBR==='function')_cityUpgradeMaterialsToPBR();
    _optimizeCityInstances();
    addClouds();
    spawnCityNPCs();
    applyCityTheme();
    _prewarmCityShaders();
    // Stop old BGM, start city BGM
    stopBGM();stopRaceBGM();
    startBGM();
    // Spawn player at center
    if(playerEgg){scene.remove(playerEgg.mesh);var idx=allEggs.indexOf(playerEgg);if(idx!==-1)allEggs.splice(idx,1);playerEgg=null;}
    var skin=CHARACTERS[selectedChar];
    playerEgg=createEgg(0,0,skin.color,skin.accent,true,undefined,skin.type);
    playerEgg.finished=false;playerEgg.alive=true;
    if(currentCityStyle===5){
        // Moon flat: spawn in battlefield area
        playerEgg.mesh.position.set(50,0.5,0);
        camera.position.set(50,12,19);camera.lookAt(50,0,0);
        camera.up.set(0,1,0);
    } else if(currentCityStyle===6){
        // Sakura: spawn near shrine area (no fountain in center)
        playerEgg.mesh.position.set(0,14,-30);
        camera.position.set(0,22,-16);camera.lookAt(0,8,-30);
        camera.up.set(0,1,0);
    } else if(currentCityStyle===7){
        // Snow Village: spawn on island surface (y=3)
        playerEgg.mesh.position.set(0,6,0);
        camera.position.set(0,12,14);camera.lookAt(0,0,0);
        camera.up.set(0,1,0);
    } else {
        playerEgg.mesh.position.set(0,15,0);
        camera.position.set(0,12,19);camera.lookAt(0,0,5);
        camera.up.set(0,1,0);
    }
    // SOTN area name reveal
    _showCityAreaName(currentCityStyle);
}

// ---- NPC eggs wandering city ----
function spawnCityNPCs() {
    var _npcCityLayout=(typeof _getCityLayout==='function')?_getCityLayout(currentCityStyle):null;
    var _npcCityData=(typeof _getCityNpc==='function')?_getCityNpc(currentCityStyle):null;
    var npcCount=(_npcCityData&&_npcCityData.count!==undefined)?_npcCityData.count:((_npcCityLayout&&_npcCityLayout.npcCount!==undefined)?_npcCityLayout.npcCount:(currentCityStyle===5?24:(currentCityStyle===6?48:36)));
    for(let i=0;i<npcCount;i++){
        var nx2,nz2,spawnY=0;
        if(currentCityStyle===5){
            // Moon: half NPCs inside Von Braun city, half on battlefield
            if(i<12){
                // Inside Von Braun (local coords scaled by 8, center at -200,0)
                var nAngle=Math.random()*Math.PI*2;
                var nRad=Math.random()*120; // within shield radius 160
                nx2=-200+Math.cos(nAngle)*nRad;
                nz2=Math.sin(nAngle)*nRad;
            } else {
                // Battlefield side
                nx2=30+Math.random()*300;
                nz2=(Math.random()-0.5)*400;
            }
        } else if(currentCityStyle===6){
            // Sakura: spawn on plateaus (x<-10 or x>10), on paths
            var _onL=Math.random()<0.5;
            nx2=_onL?(-15-Math.random()*30):(15+Math.random()*30);
            nz2=(Math.random()-0.5)*180;
            spawnY=8;
        } else {
            // Avoid fountain area (center, radius 10)
            do{
                nx2=(Math.random()-0.5)*80;nz2=10+(Math.random())*60;
            }while(DANBO_WASM.len2D(nx2,nz2)<12);
        }
        const col=AI_COLORS[i%AI_COLORS.length];
        // Weighted character selection: more Zangief
        var _npcCharIdx=i%CHARACTERS.length;
        if(currentCityStyle===6){
            var _wr=Math.random();
            if(_wr<0.25)_npcCharIdx=6; // 25% Zangief (bear)
            else _npcCharIdx=Math.floor(Math.random()*CHARACTERS.length);
        }
        const npc=createEgg(nx2,nz2,col,AI_COLORS[(i+4)%AI_COLORS.length],false,undefined,CHARACTERS[_npcCharIdx].type);
        if(spawnY>0)npc.mesh.position.y=spawnY+0.5;
        npc.cityNPC=true;
        npc.aiTargetX=nx2; npc.aiTargetZ=nz2;
        npc.aiWanderTimer=60+Math.random()*120;
        cityNPCs.push(npc);
    }
}

// ---- Clouds (can stand on them) ----
var cityCloudPlatforms=[]; // {group, x, z, y, hw, hd}
var _cloudWorldPipe=null; // moon pipe in cloud world
var _cloudWorldPipes=[]; // independently authored moon pipes
function _citySpecialObjects(){
    return (window.DANBO_CITY_REGISTRY&&DANBO_CITY_REGISTRY.getSpecialObjects)?DANBO_CITY_REGISTRY.getSpecialObjects(currentCityStyle):[];
}
function _citySpecialObject(typeOrId){
    return (window.DANBO_CITY_REGISTRY&&DANBO_CITY_REGISTRY.getSpecialObject)?DANBO_CITY_REGISTRY.getSpecialObject(currentCityStyle,typeOrId):null;
}
function _specialNumber(def,key,fallback){
    var value=def&&Number(def[key]);return Number.isFinite(value)?value:fallback;
}
function _specialNestedNumber(def,group,key,fallback,min,max){
    var value=def&&def[group]&&Number(def[group][key]);
    value=Number.isFinite(value)?Math.round(value):fallback;
    return Math.max(min,Math.min(max,value));
}
function _makeCloud(cx,cy,cz,minParts,maxParts,minS,maxS,cloudKey){
    var _cloudHigh=window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.high;
    var cg2=new THREE.SphereGeometry(1,_cloudHigh?22:12,_cloudHigh?15:8);
    // Matte PBR lobes receive warm sunlight and cool sky fill. Overlapping rounded
    // volumes replace the old six-segment, straight "pixel sausage" platforms.
    var cm2=new THREE.MeshStandardMaterial({color:0xF8FCFF,roughness:1,metalness:0,emissive:0xD9E8F2,emissiveIntensity:0.34,fog:true});
    var g=new THREE.Group();
    var maxW=0,maxD=0,maxTop=0,maxSc=0;
    var numParts=minParts+Math.floor(Math.random()*(maxParts-minParts+1));
    for(var j=0;j<numParts;j++){
        var s=minS+Math.random()*(maxS-minS);
        var m=new THREE.Mesh(cg2,cm2);
        m.name='danbo-soft-cloud-lobe';
        m.scale.set(s*(0.88+Math.random()*0.18),s*(0.48+Math.random()*0.18),s*(0.72+Math.random()*0.24));
        m.castShadow=false;m.receiveShadow=true;
        var pz=(Math.random()*2-1)*Math.max(0.9,s*0.28);
        var px=j*(maxS*0.88)+(Math.random()-0.5)*Math.max(0.8,s*0.32);
        var py=(j%2?0.12:-0.08)*s+Math.random()*s*0.12;
        m.position.set(px,py,pz);
        g.add(m);
        if(px+m.scale.x>maxW)maxW=px+m.scale.x;
        var partD=Math.abs(pz)+m.scale.z;
        if(partD>maxD)maxD=partD;
        if(py+m.scale.y>maxTop)maxTop=py+m.scale.y;
        if(s>maxSc)maxSc=s;
    }
    var halfW=maxW*0.5;
    for(var ci2=0;ci2<g.children.length;ci2++){g.children[ci2].position.x-=halfW;}
    g.name='danbo-soft-cloud-platform';
    if(cloudKey)g.userData.danboCloudKey=cloudKey;
    g.position.set(cx,cy,cz);
    scene.add(g);
    // Wider collision area than visual to prevent falling through edges
    var cl={group:g,x:cx,z:cz,y:cy,hw:halfW+maxSc+1,hd:Math.max(maxD,maxSc*0.7,halfW*0.6)+1,top:maxTop,_origScaleY:1,editorKey:cloudKey||''};
    cityCloudPlatforms.push(cl);
    return cl;
}
function _createCloudCherub(options){
    options=options||{};
    var cg=new THREE.Group();
    var cherubScale=Number(options.scale);
    if(!Number.isFinite(cherubScale)||cherubScale<=0)cherubScale=3;
    cg.scale.set(cherubScale,cherubScale,cherubScale);
    // Round body (chubby)
    var cbody=new THREE.Mesh(new THREE.SphereGeometry(0.3,8,6),toon(0xFFDDCC));
    cbody.scale.set(1,0.9,0.8);cbody.position.y=0;cg.add(cbody);
    // Head
    var chead=new THREE.Mesh(new THREE.SphereGeometry(0.22,8,6),toon(0xFFDDCC));
    chead.position.set(0,0.35,0.05);cg.add(chead);
    // Curly golden hair
    for(var _chc=0;_chc<6;_chc++){
        var cha=_chc/6*Math.PI*2;
        var curl=new THREE.Mesh(new THREE.SphereGeometry(0.07,4,3),toon(0xFFDD44));
        curl.position.set(Math.cos(cha)*0.15,0.5+Math.sin(cha)*0.05,Math.sin(cha)*0.12);
        cg.add(curl);
    }
    // Eyes (cute big)
    [-1,1].forEach(function(s){
        var ceye=new THREE.Mesh(new THREE.SphereGeometry(0.05,4,3),toon(0x4488CC));
        ceye.position.set(s*0.1,0.38,0.2);cg.add(ceye);
        var cshine=new THREE.Mesh(new THREE.SphereGeometry(0.02,3,2),toon(0xFFFFFF));
        cshine.position.set(s*0.1+s*0.02,0.4,0.22);cg.add(cshine);
    });
    // Smile and blush
    var csmile=new THREE.Mesh(new THREE.TorusGeometry(0.05,0.012,4,8,Math.PI),toon(0xFF8888));
    csmile.position.set(0,0.3,0.2);csmile.rotation.x=Math.PI;cg.add(csmile);
    [-1,1].forEach(function(s){
        var cblush=new THREE.Mesh(new THREE.SphereGeometry(0.04,4,3),toon(0xFF9999,{transparent:true,opacity:0.4}));
        cblush.position.set(s*0.15,0.32,0.18);cg.add(cblush);
    });
    // Wings (feathery, translucent white)
    [-1,1].forEach(function(s){
        var wing=new THREE.Group();
        for(var fi=0;fi<4;fi++){
            var feather=new THREE.Mesh(new THREE.SphereGeometry(0.12,6,4),toon(0xFFFFFF,{transparent:true,opacity:0.7}));
            feather.scale.set(0.4,0.15,1);
            feather.position.set(s*(0.15+fi*0.08),0.05-fi*0.03,-fi*0.06);
            feather.rotation.z=s*(0.2+fi*0.15);wing.add(feather);
        }
        wing.position.set(s*0.2,0.15,-0.1);wing.userData._side=s;cg.add(wing);
    });
    // Halo and arms
    var halo=new THREE.Mesh(new THREE.TorusGeometry(0.15,0.02,6,16),toon(0xFFDD44,{emissive:0xFFAA00,emissiveIntensity:0.5}));
    halo.position.set(0,0.6,0.05);halo.rotation.x=Math.PI/2;cg.add(halo);
    [-1,1].forEach(function(s){
        var carm=new THREE.Mesh(new THREE.SphereGeometry(0.06,4,3),toon(0xFFDDCC));
        carm.position.set(s*0.3,0.05,0.1);carm.scale.set(0.7,1,0.7);cg.add(carm);
    });
    var cx=Number(options.x)||0,cy=Number(options.y)||0,cz=Number(options.z)||0;
    var rotationY=Number(options.rotationY)||0;
    cg.position.set(cx,cy,cz);cg.rotation.y=rotationY*Math.PI/180;
    if(options.editorSpecialIndex!==undefined)cg.userData.editorSpecialIndex=Number(options.editorSpecialIndex);
    if(options.instanceId)cg.userData.editorInstanceId=String(options.instanceId);
    scene.add(cg);
    if(!window._cityAnimals)window._cityAnimals=[];
    var flapSpeed=Number(options.flapSpeed);if(!Number.isFinite(flapSpeed)||flapSpeed<=0)flapSpeed=1;
    var floatHeight=Number(options.floatHeight);if(!Number.isFinite(floatHeight)||floatHeight<0)floatHeight=1.5;
    var animal={
        group:cg,type:'cherub',x:cx,y:cy,z:cz,
        vx:Number(options.vx)||0,vy:0,vz:Number(options.vz)||0,
        state:'fly',stateTimer:200+Math.floor(Math.random()*200),
        flapPhase:Number.isFinite(Number(options.phase))?Number(options.phase):Math.random()*Math.PI*2,
        flapSpeed:flapSpeed,floatHeight:floatHeight,baseY:cy,_inScene:true,
        editorStatic:!!options.editorStatic,rotationY:rotationY*Math.PI/180,
        editorSpecialIndex:options.editorSpecialIndex
    };
    window._cityAnimals.push(animal);return animal;
}
function addClouds(){
    var allSpecialDefs=_citySpecialObjects();
    var singleCherubDefs=[],moonPipeDefs=[];
    for(var _sdi=0;_sdi<allSpecialDefs.length;_sdi++){
        if(allSpecialDefs[_sdi]&&allSpecialDefs[_sdi].type==='cloudCherub')singleCherubDefs.push({def:allSpecialDefs[_sdi],index:_sdi});
        if(allSpecialDefs[_sdi]&&allSpecialDefs[_sdi].type==='cloudMoonPipe')moonPipeDefs.push({def:allSpecialDefs[_sdi],index:_sdi});
    }
    var cloudDef=_citySpecialObject('cloudRealm');
    var cherubDef=_citySpecialObject('cloudCherubs');
    var moonPipeDef=moonPipeDefs.length?moonPipeDefs[0].def:null;
    // Backward compatibility: old city files did not store cloudRealm yet.
    // Cities 0-4 keep their legacy cloud world until an exported special
    // scene asset is placed, at which point that declarative definition wins.
    if(!cloudDef){
        if(!cherubDef&&!singleCherubDefs.length&&!moonPipeDef){
            if(currentCityStyle===5||currentCityStyle===6||currentCityStyle===7)return;
            cloudDef={type:'cloudRealm',x:0,y:46,z:0,w:140,d:140,h:32,enabled:true,interaction:{moonPipe:true}};
        }else{
            // A split material can be previewed or placed on its own without
            // silently recreating the entire cloud realm around it.
            var splitAnchor=cherubDef||(singleCherubDefs[0]&&singleCherubDefs[0].def)||moonPipeDef;
            cloudDef={
                type:'cloudRealm',x:_specialNumber(splitAnchor,'x',0),y:_specialNumber(splitAnchor,'y',46),
                z:_specialNumber(splitAnchor,'z',0),w:1,d:1,h:1,enabled:false,
                generator:{roofClouds:false,stairColumns:0,centralPlatform:0,innerRingPlatforms:0,outerRingPlatforms:0,movingPlatforms:0,decorativeClouds:0},
                gameplay:{coins:0,treasureChests:0,cherubs:0},interaction:{moonPipe:false}
            };
        }
    }
    var cloudLayerEnabled=cloudDef.enabled!==false;
    if(!cloudLayerEnabled&&!cherubDef&&!singleCherubDefs.length&&!moonPipeDefs.length)return;
    var cloudX=_specialNumber(cloudDef,'x',0),cloudY=_specialNumber(cloudDef,'y',46),cloudZ=_specialNumber(cloudDef,'z',0);
    var cloudGenerator=cloudDef.generator||{};
    var roofCloudsEnabled=cloudLayerEnabled&&cloudGenerator.roofClouds!==false;
    var stairColumnCount=cloudLayerEnabled?_specialNestedNumber(cloudDef,'generator','stairColumns',6,0,16):0;
    var stepsPerColumn=_specialNestedNumber(cloudDef,'generator','stepsPerColumn',5,1,12);
    var centralPlatformCount=cloudLayerEnabled?_specialNestedNumber(cloudDef,'generator','centralPlatform',1,0,3):0;
    var innerRingCount=cloudLayerEnabled?_specialNestedNumber(cloudDef,'generator','innerRingPlatforms',8,0,24):0;
    var outerRingCount=cloudLayerEnabled?_specialNestedNumber(cloudDef,'generator','outerRingPlatforms',6,0,24):0;
    var movingPlatformCount=cloudLayerEnabled?_specialNestedNumber(cloudDef,'generator','movingPlatforms',12,0,32):0;
    var decorativeCloudCount=cloudLayerEnabled?_specialNestedNumber(cloudDef,'generator','decorativeClouds',10,0,32):0;
    var cloudCoinCount=cloudLayerEnabled?_specialNestedNumber(cloudDef,'gameplay','coins',15,0,60):0;
    var cloudChestCount=cloudLayerEnabled?_specialNestedNumber(cloudDef,'gameplay','treasureChests',10,0,30):0;
    var cloudCherubCount=singleCherubDefs.length?0:(cherubDef
        ?(cherubDef.enabled===false?0:_specialNestedNumber(cherubDef,'gameplay','cherubs',_specialNumber(cherubDef,'count',8),0,24))
        :_specialNestedNumber(cloudDef,'gameplay','cherubs',8,0,24));
    var cherubX=cherubDef?_specialNumber(cherubDef,'x',cloudX):cloudX;
    var cherubY=cherubDef?_specialNumber(cherubDef,'y',cloudY):cloudY;
    var cherubZ=cherubDef?_specialNumber(cherubDef,'z',cloudZ):cloudZ;
    var cherubRadius=cherubDef?_specialNumber(cherubDef,'radius',30):30;
    var cherubScale=cherubDef?_specialNumber(cherubDef,'scale',3):3;
    CHEST_CLOUD_TOTAL=cloudChestCount;
    // Cloud above each building roof — reachable with charge jump
    var roofClouds=[];
    if(roofCloudsEnabled){
        for(var bi=0;bi<cityColliders.length;bi++){
            var c=cityColliders[bi];
            var roofTop=(c.h||6)+(c.roofH||3);
            var rc=_makeCloud(c.x,roofTop+2,c.z,2,3,2,4,'roof-'+bi);
            roofClouds.push(rc);
        }
    }
    // ---- Staircase clouds from roof level to cloud world ----
    // Tallest roof is about y=19, cloud world at y=42
    // Need steps every ~4 units (easy charge jump) from y=22 to y=40
    // Place staircase columns near several buildings
    var stairPositions=[];
    // First staircase near center (close to Babel tower at 12,0)
    if(stairColumnCount>0)stairPositions.push({x:cloudX+8,z:cloudZ+8});
    for(var _si=1;_si<stairColumnCount;_si++){
        stairPositions.push({x:cloudX+(Math.random()-0.5)*80,z:cloudZ+(Math.random()-0.5)*80});
    }
    window._stairPositions=stairPositions;
    for(var si=0;si<stairPositions.length;si++){
        var sp=stairPositions[si];
        var baseY=22; // just above typical roof clouds
        var steps=stepsPerColumn;
        for(var st=0;st<steps;st++){
            var sy=baseY+st*4;
            var sx=sp.x+(Math.random()-0.5)*8;
            var sz=sp.z+(Math.random()-0.5)*8;
            _makeCloud(sx,sy,sz,2,3,2,4,'stair-'+si+'-'+st);
        }
    }
    // ---- Cloud World (y=46) — large platform layer ----
    var cwY=cloudY;
    // Central HUGE cloud platform — the highest cloud, moon pipe sits here
    // No other clouds should overlap this one
    for(var cpIndex=0;cpIndex<centralPlatformCount;cpIndex++){
        var cpAngle=cpIndex/Math.max(1,centralPlatformCount)*Math.PI*2;
        var cpRadius=cpIndex===0?0:18;
        _makeCloud(cloudX+Math.cos(cpAngle)*cpRadius,cwY,cloudZ+Math.sin(cpAngle)*cpRadius,8,10,14,20,'central-'+cpIndex);
    }
    // Ring of cloud platforms around center — kept away from center (r>35) and lower
    for(var ai=0;ai<innerRingCount;ai++){
        var ang=ai/Math.max(1,innerRingCount)*Math.PI*2;
        var r=38+Math.random()*10;
        _makeCloud(cloudX+Math.cos(ang)*r,cwY-4+Math.random()*2,cloudZ+Math.sin(ang)*r,3,4,3,5,'inner-'+ai);
    }
    // Outer ring — even further
    for(var oi=0;oi<outerRingCount;oi++){
        var oa=oi/Math.max(1,outerRingCount)*Math.PI*2;
        _makeCloud(cloudX+Math.cos(oa)*60,cwY-3+Math.random()*2,cloudZ+Math.sin(oa)*60,3,4,3,5,'outer-'+oi);
    }
    // ---- Moving clouds (platforms that drift back and forth) ----
    // Keep moving clouds away from center (r>30)
    var upperMovingCount=Math.round(movingPlatformCount*2/3);
    for(var mi=0;mi<upperMovingCount;mi++){
        var ma=mi/Math.max(1,upperMovingCount)*Math.PI*2;
        var mr=30+Math.random()*20;
        var mx=cloudX+Math.cos(ma)*mr;
        var mz=cloudZ+Math.sin(ma)*mr;
        var my=cwY-4+Math.random()*3;
        var mc=_makeCloud(mx,my,mz,2,3,3,5,'moving-upper-'+mi);
        // Mark as moving cloud
        mc.moving=true;
        mc.moveAxis=Math.random()<0.5?'x':'z'; // drift direction
        mc.moveSpeed=0.01+Math.random()*0.02;
        mc.moveRange=8+Math.random()*12;
        mc.movePhase=Math.random()*Math.PI*2;
        mc.baseX=mx;
        mc.baseZ=mz;
    }
    // Some moving clouds in the staircase zone too
    for(var mi2=0;mi2<movingPlatformCount-upperMovingCount;mi2++){
        var mx2=cloudX+(Math.random()-0.5)*60;
        var mz2=cloudZ+(Math.random()-0.5)*60;
        var my2=cloudY-20+Math.random()*12;
        var mc2=_makeCloud(mx2,my2,mz2,2,3,2,4,'moving-stair-'+mi2);
        mc2.moving=true;
        mc2.moveAxis=Math.random()<0.5?'x':'z';
        mc2.moveSpeed=0.008+Math.random()*0.015;
        mc2.moveRange=6+Math.random()*10;
        mc2.movePhase=Math.random()*Math.PI*2;
        mc2.baseX=mx2;
        mc2.baseZ=mz2;
    }
    // Random decorative clouds (high, not for standing)
    for(var di=0;di<decorativeCloudCount;di++){
        var dx2=cloudX+(Math.random()-0.5)*200;
        var dz2=cloudZ+(Math.random()-0.5)*200;
        var dy2=cloudY+4+Math.random()*20;
        _makeCloud(dx2,dy2,dz2,3,4,3,6,'decorative-'+di);
    }
    // Per-cloud editor overrides are stored relative to the cloud-realm anchor,
    // so a hand-positioned cloud keeps its layout when the whole material is moved.
    var cloudOverrides=cloudDef.cloudOverrides&&typeof cloudDef.cloudOverrides==='object'?cloudDef.cloudOverrides:{};
    for(var _coi=0;_coi<cityCloudPlatforms.length;_coi++){
        var _cop=cityCloudPlatforms[_coi],_cov=_cop.editorKey&&cloudOverrides[_cop.editorKey];
        if(!_cov||typeof _cov!=='object')continue;
        var _cox=cloudX+_specialNumber(_cov,'x',_cop.x-cloudX);
        var _coy=cloudY+_specialNumber(_cov,'y',_cop.y-cloudY);
        var _coz=cloudZ+_specialNumber(_cov,'z',_cop.z-cloudZ);
        _cop.x=_cox;_cop.y=_coy;_cop.z=_coz;
        _cop.group.position.set(_cox,_coy,_coz);
        if(_cop.moving){_cop.baseX=_cox;_cop.baseZ=_coz;}
    }
    // Coins in cloud world
    for(var cci=0;cci<cloudCoinCount;cci++){
        var ca=cci/Math.max(1,cloudCoinCount)*Math.PI*2;
        var cr=8+Math.random()*20;
        var ccY=cwY+2+Math.random()*2;
        var coin=_makeCinematicCoinMesh(1.08);
        coin.position.set(cloudX+Math.cos(ca)*cr,ccY,cloudZ+Math.sin(ca)*cr);
        scene.add(coin);
        cityCoins.push({mesh:coin,collected:false,baseY:ccY,inScene:true});
    }
    // Cloud-world treasure chests — sit on the cloud platforms
    for(var cwc=0;cwc<cloudChestCount;cwc++){
        var cwa=Math.random()*Math.PI*2, cwr=6+Math.random()*22;
        var cgx=cloudX+Math.cos(cwa)*cwr, cgz=cloudZ+Math.sin(cwa)*cwr, cgy=cwY+0.6;
        _spawnChest('cloud_'+cwc,'cloud',cgx,cgy,cgz,Math.random()*Math.PI*2,_tierFromRoll(Math.random()),true);
    }
    if(!window._cityAnimals)window._cityAnimals=[];
    for(var _chi=0;_chi<cloudCherubCount;_chi++){
        var ca2=_chi/Math.max(1,cloudCherubCount)*Math.PI*2;
        var cr2=Math.max(2,cherubRadius*0.45)+Math.random()*Math.max(2,cherubRadius*0.55);
        var cx2=cherubX+Math.cos(ca2)*cr2, cz2=cherubZ+Math.sin(ca2)*cr2;
        var cy2=cherubY+3+Math.random()*6;
        _createCloudCherub({x:cx2,y:cy2,z:cz2,scale:cherubScale,
            vx:Math.sin(ca2+Math.PI/2)*0.04,vy:0,vz:Math.cos(ca2+Math.PI/2)*0.04,
            phase:Math.random()*Math.PI*2,flapSpeed:1,floatHeight:1.5});
    }
    // Individually placed cherubs are independent editor entities. They hover
    // in place so position and rotation remain exactly as authored.
    for(var _sci=0;_sci<singleCherubDefs.length;_sci++){
        var _scEntry=singleCherubDefs[_sci],_scd=_scEntry.def;
        if(_scd.enabled===false)continue;
        var _sca=_scd.animation&&typeof _scd.animation==='object'?_scd.animation:{};
        _createCloudCherub({
            x:_specialNumber(_scd,'x',0),y:_specialNumber(_scd,'y',52),z:_specialNumber(_scd,'z',0),
            scale:_specialNumber(_scd,'scale',3),rotationY:_specialNumber(_scd,'rotationY',0),
            phase:_specialNumber(_sca,'phase',Math.random()*Math.PI*2),
            flapSpeed:_specialNumber(_sca,'flapSpeed',1),floatHeight:_specialNumber(_sca,'floatHeight',0.6),
            editorStatic:true,editorSpecialIndex:_scEntry.index,instanceId:_scd.instanceId||''
        });
    }
    // ---- Moon Warp Pipe in cloud world center ----
    // Place pipe on TOP of central cloud (cloudTop ≈ cwY + maxScale*0.45 ≈ cwY+9)
    var _moonPipeY=cwY+8;
    if(moonPipeDefs.length){
        for(var _mpi=0;_mpi<moonPipeDefs.length;_mpi++){
            var _mpEntry=moonPipeDefs[_mpi],_mpd=_mpEntry.def;
            if(_mpd.enabled===false)continue;
            _buildCloudWorldMoonPipe(
                _specialNumber(_mpd,'x',cloudX),_specialNumber(_mpd,'y',_moonPipeY),_specialNumber(_mpd,'z',cloudZ),
                {
                    scale:_specialNumber(_mpd,'scale',1),rotationY:_specialNumber(_mpd,'rotationY',0),
                    editorSpecialIndex:_mpEntry.index,instanceId:_mpd.instanceId||''
                }
            );
        }
    }else if(centralPlatformCount>0&&(!cloudDef.interaction||cloudDef.interaction.moonPipe!==false)){
        _buildCloudWorldMoonPipe(cloudX,_moonPipeY,cloudZ);
    }
}
function _buildCloudWorldMoonPipe(px,py,pz,options){
    options=options||{};
    var pColor=0xCCCCFF;
    var g=new THREE.Group();
    var pMat=new THREE.MeshPhongMaterial({color:pColor,transparent:true,opacity:0.4,side:THREE.DoubleSide});
    var tube=new THREE.Mesh(new THREE.CylinderGeometry(2.5,2.5,6,16,1,true),pMat);
    tube.position.y=3;g.add(tube);
    var rim=new THREE.Mesh(new THREE.TorusGeometry(2.5,0.35,8,16),toon(pColor,{emissive:pColor,emissiveIntensity:0.5}));
    rim.position.y=6;rim.rotation.x=Math.PI/2;g.add(rim);
    var rim2=new THREE.Mesh(new THREE.TorusGeometry(2.5,0.3,8,16),toon(pColor,{emissive:pColor,emissiveIntensity:0.3}));
    rim2.position.y=0.1;rim2.rotation.x=Math.PI/2;g.add(rim2);
    // Moon icon on top
    var moonSphere=new THREE.Mesh(new THREE.SphereGeometry(1.2,12,8),toon(0xEEEECC,{emissive:0xAAAA88,emissiveIntensity:0.4}));
    moonSphere.position.y=8;g.add(moonSphere);
    // Craters
    for(var ci=0;ci<5;ci++){
        var ca=ci/5*Math.PI*2;
        var crater=new THREE.Mesh(new THREE.SphereGeometry(0.2,6,4),toon(0xBBBBAA));
        crater.position.set(Math.cos(ca)*0.8,8+Math.sin(ca)*0.6,Math.sin(ca)*0.5);
        crater.scale.set(1,0.4,1);
        g.add(crater);
    }
    // Glow orbs inside
    var sMat=new THREE.MeshBasicMaterial({color:pColor,transparent:true,opacity:0.5});
    for(var si=0;si<8;si++){
        var sp=new THREE.Mesh(new THREE.SphereGeometry(0.3,6,4),sMat);
        var a=si/8*Math.PI*2;
        sp.position.set(Math.cos(a)*1.5,0.5+si*0.6,Math.sin(a)*1.5);
        g.add(sp);
    }
    // Label
    var canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;
    var ctx2=canvas.getContext('2d');
    ctx2.fillStyle='rgba(0,0,0,0.6)';ctx2.fillRect(0,0,256,64);
    ctx2.fillStyle='#fff';ctx2.font='bold 28px sans-serif';ctx2.textAlign='center';
    var moonName=CITY_STYLES[5]?CITY_STYLES[5].name:'Moon';
    ctx2.fillText(moonName,128,42);
    var tex=new THREE.CanvasTexture(canvas);
    var sign=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true}));
    sign.scale.set(4,1,1);sign.position.y=10;
    g.add(sign);
    var pipeScale=Math.max(0.25,Math.min(10,Number(options.scale)||1));
    var pipeRotation=Number(options.rotationY)||0;
    g.position.set(px,py,pz);g.rotation.y=pipeRotation*Math.PI/180;g.scale.setScalar(pipeScale);
    if(options.editorSpecialIndex!==undefined)g.userData.editorSpecialIndex=Number(options.editorSpecialIndex);
    if(options.instanceId)g.userData.editorInstanceId=String(options.instanceId);
    scene.add(g);
    var pipe={group:g,x:px,z:pz,y:py,targetStyle:5,_cooldown:false,scale:pipeScale,rotationY:pipeRotation*Math.PI/180,editorSpecialIndex:options.editorSpecialIndex};
    _cloudWorldPipes.push(pipe);
    if(!_cloudWorldPipe)_cloudWorldPipe=pipe;
    return pipe;
}
addClouds();

// ---- Tower of Babel (Ziggurat) ----
function playRumbleSound(){
    if(!sfxEnabled)return;
    var ctx=ensureAudio();if(!ctx)return;
    var dur=3.0;
    var bufSize=Math.floor(ctx.sampleRate*dur);
    var buf=ctx.createBuffer(1,bufSize,ctx.sampleRate);
    var data=buf.getChannelData(0);
    for(var i=0;i<bufSize;i++){
        var t=i/ctx.sampleRate;
        // Deep rumble + mid-range cracking for audibility on all speakers
        data[i]=(Math.random()-0.5)*0.35*Math.sin(t*40)*Math.exp(-t*0.3)
            +Math.sin(t*55)*0.15*Math.exp(-t*0.4)
            +Math.sin(t*30+Math.sin(t*7)*3)*0.12*Math.exp(-t*0.35)
            +(Math.random()-0.5)*0.2*Math.exp(-t*0.5)
            +Math.sin(t*180+Math.random()*0.5)*0.08*Math.exp(-t*0.6)
            +Math.sin(t*110)*0.1*Math.exp(-t*0.45);
    }
    var src=ctx.createBufferSource();src.buffer=buf;
    var g=ctx.createGain();g.gain.setValueAtTime(0.5,ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.6,ctx.currentTime+0.5);
    g.gain.exponentialRampToValueAtTime(0.01,ctx.currentTime+dur);
    // Wider low-pass to let mid-range through
    var filt=ctx.createBiquadFilter();filt.type='lowpass';filt.frequency.value=350;filt.Q.value=0.7;
    src.connect(filt);filt.connect(g);g.connect(ctx.destination);
    src.start();src.stop(ctx.currentTime+dur);
}

function _buildBabylonTower(){
    if(_babylonTower)return;
    var g=new THREE.Group();
    // Ziggurat — 12 stacked layers, top reaches 5 layers above cloud world
    var layers=12;
    var baseW=16, baseD=16, layerH=6.4;
    var colors=[0xD4A460,0xC8963C,0xBB8833,0xAA7722,0x996611,0x885500,0x774400,0x663300];
    for(var i=0;i<layers;i++){
        var w=baseW-i*1.5;
        var d=baseD-i*1.5;
        var geo=new THREE.BoxGeometry(w,layerH,d);
        var mat=toon(colors[i]);
        var mesh=new THREE.Mesh(geo,mat);
        mesh.position.y=i*layerH+layerH/2;
        mesh.castShadow=true;mesh.receiveShadow=true;
        g.add(mesh);
        // Decorative ledge
        var ledge=new THREE.Mesh(new THREE.BoxGeometry(w+0.6,0.4,d+0.6),toon(colors[Math.max(0,i-1)]));
        ledge.position.y=i*layerH+layerH;
        g.add(ledge);
    }
    var topY=layers*layerH; // =42
    // Archway at top
    var topW=baseW-layers*1.5+1;
    var arch1=new THREE.Mesh(new THREE.BoxGeometry(0.8,4,0.8),toon(0x996611));
    arch1.position.set(-topW/3,topY+2,0);g.add(arch1);
    var arch2=new THREE.Mesh(new THREE.BoxGeometry(0.8,4,0.8),toon(0x996611));
    arch2.position.set(topW/3,topY+2,0);g.add(arch2);
    var archTop=new THREE.Mesh(new THREE.BoxGeometry(topW*0.8,0.8,1.2),toon(0x774400));
    archTop.position.set(0,topY+4,0);g.add(archTop);
    // Pipe elevator inside — launches player to cloud world (y=44)
    var pipeMat=new THREE.MeshPhongMaterial({color:0x44FF88,transparent:true,opacity:0.5,side:THREE.DoubleSide});
    var pipeBody=new THREE.Mesh(new THREE.CylinderGeometry(1.8,1.8,topY+2,16,1,true),pipeMat);
    pipeBody.position.y=(topY+2)/2;g.add(pipeBody);
    var pipeRim=new THREE.Mesh(new THREE.TorusGeometry(1.8,0.3,8,16),toon(0x44FF88,{emissive:0x22AA44,emissiveIntensity:0.4}));
    pipeRim.position.y=0.2;pipeRim.rotation.x=Math.PI/2;g.add(pipeRim);
    var pipeRimTop=new THREE.Mesh(new THREE.TorusGeometry(1.8,0.3,8,16),toon(0x44FF88,{emissive:0x22AA44,emissiveIntensity:0.4}));
    pipeRimTop.position.y=topY+1;pipeRimTop.rotation.x=Math.PI/2;g.add(pipeRimTop);
    // Glowing orbs spiraling up inside pipe
    var orbMat=new THREE.MeshBasicMaterial({color:0x88FFAA,transparent:true,opacity:0.6});
    for(var oi=0;oi<14;oi++){
        var orb=new THREE.Mesh(new THREE.SphereGeometry(0.25,6,4),orbMat);
        var oa=oi/14*Math.PI*2*3;
        orb.position.set(Math.cos(oa)*1.0,oi*3+1,Math.sin(oa)*1.0);
        g.add(orb);
    }
    // Arrows pointing up
    var arrowMat=toon(0xFFFF44,{emissive:0xFFAA00,emissiveIntensity:0.5});
    for(var ai=0;ai<5;ai++){
        var arrow=new THREE.Mesh(new THREE.ConeGeometry(0.6,1.2,6),arrowMat);
        arrow.position.set(0,4+ai*8,0);
        g.add(arrow);
    }
    // Label sign
    var canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;
    var ctx2=canvas.getContext('2d');
    ctx2.fillStyle='rgba(0,0,0,0.6)';ctx2.fillRect(0,0,256,64);
    ctx2.fillStyle='#FFD700';ctx2.font='bold 22px sans-serif';ctx2.textAlign='center';
    var towerLabel={zhs:'\u5DF4\u522B\u5854 \u2191 云栖蛋境',zht:'\u5DF4\u5225\u5854 \u2191 雲棲蛋境',ja:'\u30D0\u30D9\u30EB\u306E\u5854 \u2191 \u30AF\u30E9\u30A6\u30C9\u30A8\u30C3\u30B0',en:'Babel \u2191 Cloud Egg'};
    ctx2.fillText(towerLabel[_langCode]||towerLabel.en,128,42);
    var tex=new THREE.CanvasTexture(canvas);
    var sign=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true}));
    sign.scale.set(5,1.2,1);sign.position.set(0,topY+6,0);
    g.add(sign);
    // Doors on all 4 faces (N/S/E/W) to avoid being blocked
    var doorDirs=[{dx:0,dz:1},{dx:0,dz:-1},{dx:1,dz:0},{dx:-1,dz:0}];
    for(var di=0;di<4;di++){
        var dd=doorDirs[di];
        var dox=dd.dx*(baseD/2+0.1), doz=dd.dz*(baseD/2+0.1);
        var dFrame=new THREE.Mesh(new THREE.BoxGeometry(dd.dx===0?3.5:0.5,5,dd.dz===0?3.5:0.5),toon(0x664400));
        dFrame.position.set(dox,2.5,doz);g.add(dFrame);
        var dInner=new THREE.Mesh(new THREE.BoxGeometry(dd.dx===0?2.5:0.3,4,dd.dz===0?2.5:0.3),toon(0x332200));
        dInner.position.set(dox,2,doz);g.add(dInner);
        var dGlow=new THREE.Mesh(new THREE.PlaneGeometry(2,3.5),new THREE.MeshBasicMaterial({color:0x44FF88,transparent:true,opacity:0.3,side:THREE.DoubleSide}));
        dGlow.position.set(dox,2,doz);
        if(dd.dx!==0)dGlow.rotation.y=Math.PI/2;
        g.add(dGlow);
    }
    // Position on edge of the big cloud — tower top is ~5 units above cloud, offset from moon pipe
    var towerX, towerZ;
    towerX=12;
    towerZ=0;
    g.position.set(towerX,_babylonRiseY,towerZ);
    scene.add(g);
    _babylonTower={group:g,x:towerX,z:towerZ,pipeX:towerX,pipeZ:towerZ,topY:topY,baseW:baseW,baseD:baseD,_collidersAdded:false};
    // Fixed exit cloud platform at tower top — large enough to jump onto from rooftops
    _makeCloud(towerX,topY+1,towerZ,3,4,3,4);
    // Add bridge clouds from tower top down to the big cloud platform
    for(var bci=0;bci<5;bci++){
        var bcx=towerX-bci*2.5;
        var bcz=towerZ+(Math.random()-0.5)*6;
        var bcy=topY-bci*1.5;
        _makeCloud(bcx,bcy,bcz,2,3,2,4);
    }
}

function _triggerBabylonEvent(){
    if(_babylonTriggered)return;
    if(currentCityStyle===5)return; // not on moon
    if(typeof Explorer!=='undefined')Explorer.discoverHidden('babel_tower','\u5DF4\u522B\u5854');
    _babylonTriggered=true;
    _earthquakeTimer=180; // 3 seconds at 60fps
    _earthquakeIntensity=0.5;
    _babylonRising=true;
    _babylonRiseY=-52;
    playRumbleSound();
    _buildBabylonTower();
}
