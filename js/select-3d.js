// select-3d.js — one mobile-safe WebGL context renders the hero and all eight roster cards.
// Every preview is built with createEggMesh(), so selection and gameplay cannot drift apart.
(function(){
    'use strict';
    var screen=document.getElementById('select-screen');
    var canvas=document.getElementById('select-3d-canvas');
    var heroViewport=document.getElementById('select-hero-viewport');
    var mapViewport=document.getElementById('select-map-viewport');
    if(!screen||!canvas||!heroViewport||typeof THREE==='undefined'||typeof createEggMesh!=='function')return;

    var COPY={
        zhs:[
            ['花冠守护者','温暖、勇敢、均衡。带着希望踏上全新的冒险。'],
            ['森林漫游者','轻快、自然、充满生命力。与希望之城的风一同前行。'],
            ['水晶探索家','清澈、敏捷、闪耀。让每一次发现都折射出新的光芒。'],
            ['天空祝福者','明亮、灵动、守护。张开想象的翅膀拥抱远方。'],
            ['甜心冲锋手','热情、活力、勇往直前。用笑容击破冒险路上的难题。'],
            ['星愿追光者','梦想、速度、好运。跟随星光找到属于自己的答案。'],
            ['岩石守护者','坚定、可靠、力量。稳稳守护每一位并肩前行的伙伴。'],
            ['风行旅者','自由、迅捷、轻盈。乘着城市上空的风探索未知。']
        ],
        zht:[
            ['花冠守護者','溫暖、勇敢、均衡。帶著希望踏上全新的冒險。'],['森林漫遊者','輕快、自然、充滿生命力。與希望之城的風一同前行。'],
            ['水晶探索家','清澈、敏捷、閃耀。讓每一次發現都折射出新的光芒。'],['天空祝福者','明亮、靈動、守護。張開想像的翅膀擁抱遠方。'],
            ['甜心衝鋒手','熱情、活力、勇往直前。用笑容擊破冒險路上的難題。'],['星願追光者','夢想、速度、好運。跟隨星光找到屬於自己的答案。'],
            ['岩石守護者','堅定、可靠、力量。穩穩守護每一位並肩前行的夥伴。'],['風行旅者','自由、迅捷、輕盈。乘著城市上空的風探索未知。']
        ],
        ja:[
            ['花冠の守護者','あたたかく、勇敢で、バランスに優れた冒険者。'],['森の旅人','軽やかで自然体。いのちの風とともに進む冒険者。'],
            ['水晶の探検家','澄んだ輝きと素早さで、新しい発見を照らす冒険者。'],['空の祝福者','明るく軽やかに、仲間と希望を守る冒険者。'],
            ['スイートファイター','情熱と元気な笑顔で、迷いを突破する冒険者。'],['星願のチェイサー','夢と幸運を胸に、星の光を追いかける冒険者。'],
            ['岩の守護者','揺るがない力で、そばにいる仲間を支える冒険者。'],['風の旅人','自由で素早く、未知の世界へ飛び出す冒険者。']
        ],
        en:[
            ['BLOSSOM GUARDIAN','Warm, brave and balanced — ready to carry hope into every adventure.'],['FOREST WANDERER','Light-footed and full of life, moving with the wind of Hope City.'],
            ['CRYSTAL EXPLORER','Clear, agile and radiant, turning every discovery into new light.'],['SKY BLESSING','Bright and graceful, spreading imaginary wings to guard every friend.'],
            ['CANDY CHARGER','Bold, lively and unstoppable, breaking through trouble with a smile.'],['STARLIGHT CHASER','Fast, fortunate and full of dreams, following the stars toward an answer.'],
            ['STONE GUARDIAN','Steady, dependable and strong, protecting every travelling companion.'],['WIND VOYAGER','Free, swift and light, riding the city breeze into the unknown.']
        ]
    };
    var _fallbackEmoji=['🌼','🌲','💎','👼','🍬','⭐','🪨','🌪️'];
    // Character roster index -> matching city style shown by the selection-page map.
    // Blossom=Sakura, Forest=Snow, Crystal unchanged, Angel=Hope,
    // Candy unchanged, Star unchanged, Rock=Lava, Wind=Desert.
    var CHARACTER_SELECT_CITY_MAP=[6,7,2,0,4,5,3,1];
    window.DANBO_CHARACTER_SELECT_CITY_MAP=CHARACTER_SELECT_CITY_MAP.slice();
    var quality=window.DANBO_VISUAL_QUALITY||{};
    var renderer;
    try{
        // Keep silhouette anti-aliasing even on the low path. Expensive shadows,
        // map segments and refresh frequency are reduced instead.
        renderer=new THREE.WebGLRenderer({canvas:canvas,alpha:true,antialias:true,powerPreference:'high-performance',premultipliedAlpha:true,preserveDrawingBuffer:true,stencil:false});
    }catch(err){console.warn('3D character select fallback',err);screen.classList.add('select-3d-fallback');return;}
    renderer.setClearColor(0x000000,0);
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    if(THREE.ColorManagement)THREE.ColorManagement.enabled=true;
    renderer.toneMapping=THREE.ACESFilmicToneMapping!==undefined?THREE.ACESFilmicToneMapping:THREE.LinearToneMapping;
    renderer.toneMappingExposure=0.98;
    renderer.shadowMap.enabled=!(window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.low);
    renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    // The hero gently turns and floats, so its turntable shadow must follow every frame.
    renderer.shadowMap.autoUpdate=true;
    var ratioCap=quality.high?2.5:(quality.low?1.5:2.0);
    var selectPixelRatio=Math.min(window.devicePixelRatio||1,ratioCap);
    renderer.setPixelRatio(selectPixelRatio);
    renderer.autoClear=false;
    window.DANBO_SELECT_QUALITY={
        pixelRatio:selectPixelRatio,
        ratioCap:ratioCap,
        antialias:true,
        heroDetail:'high',
        cardFps:quality.low?10:15,
        mapFps:quality.low?15:30
    };

    function pbr(color,roughness,metalness){
        return new THREE.MeshStandardMaterial({color:color,roughness:roughness,metalness:metalness||0,envMapIntensity:.42});
    }
    var _selectShadowCanvas=document.createElement('canvas');_selectShadowCanvas.width=_selectShadowCanvas.height=96;
    var _selectShadowCtx=_selectShadowCanvas.getContext('2d'),_selectShadowGrad=_selectShadowCtx.createRadialGradient(48,48,4,48,48,46);
    _selectShadowGrad.addColorStop(0,'rgba(17,42,48,.54)');_selectShadowGrad.addColorStop(.46,'rgba(17,42,48,.28)');_selectShadowGrad.addColorStop(1,'rgba(17,42,48,0)');
    _selectShadowCtx.fillStyle=_selectShadowGrad;_selectShadowCtx.fillRect(0,0,96,96);
    var _selectShadowTex=new THREE.CanvasTexture(_selectShadowCanvas);
    function makeStage(ch,index){
        var scene3=new THREE.Scene();
        if(window._danboReflectionEnvironment)scene3.environment=window._danboReflectionEnvironment;
        var stage=new THREE.Group();scene3.add(stage);
        var accent=new THREE.Color(ch.accent);
        var baseMat=pbr(accent.clone().lerp(new THREE.Color(0xffe6bd),.72),.58,0);
        var edgeMat=pbr(accent.clone().lerp(new THREE.Color(0xffffff),.32),.28,0);
        var plinthMat=new THREE.MeshPhysicalMaterial({color:accent.clone().lerp(new THREE.Color(0x735f58),.62),roughness:.38,metalness:.05,clearcoat:.34,clearcoatRoughness:.24,envMapIntensity:.44});
        var plinth=new THREE.Mesh(new THREE.CylinderGeometry(1.18,1.29,.18,quality.low?32:64),plinthMat);
        plinth.name='select-cinematic-plinth';plinth.position.y=-.19;plinth.castShadow=true;plinth.receiveShadow=true;stage.add(plinth);
        var base=new THREE.Mesh(new THREE.CylinderGeometry(1.08,1.18,.15,quality.low?32:64),baseMat);
        base.name='select-character-turntable';base.position.y=-.075;base.castShadow=true;base.receiveShadow=true;stage.add(base);
        var topPlate=new THREE.Mesh(new THREE.CylinderGeometry(.96,1.01,.035,quality.low?32:64),new THREE.MeshPhysicalMaterial({color:0xfff7df,roughness:.44,clearcoat:.26,clearcoatRoughness:.22,envMapIntensity:.38}));
        topPlate.position.y=.014;topPlate.receiveShadow=true;stage.add(topPlate);
        var rim=new THREE.Mesh(new THREE.TorusGeometry(.91,.035,quality.low?8:14,quality.low?32:64),edgeMat);
        rim.rotation.x=Math.PI/2;rim.position.y=.02;stage.add(rim);
        var lightRing=new THREE.Mesh(new THREE.TorusGeometry(.76,.014,quality.low?6:10,quality.low?32:64),new THREE.MeshStandardMaterial({color:accent,roughness:.25,emissive:accent,emissiveIntensity:.22,transparent:true,opacity:.82}));
        lightRing.name='select-accent-light-ring';lightRing.rotation.x=Math.PI/2;lightRing.position.y=.041;stage.add(lightRing);
        var contact=new THREE.Mesh(new THREE.PlaneGeometry(1.55,1.0),new THREE.MeshBasicMaterial({map:_selectShadowTex,color:0x17353d,transparent:true,opacity:.42,depthWrite:false}));
        contact.name='select-soft-contact-shadow';contact.rotation.x=-Math.PI/2;contact.position.y=.044;stage.add(contact);
        // The face and silhouette are the focus of this page. Build the character
        // with the high-detail geometry path even when gameplay is in balanced or
        // low quality; the static roster cards are throttled below to pay for it.
        var oldHigh=quality.high,oldLow=quality.low,model;
        quality.high=true;quality.low=false;
        try{model=createEggMesh(ch.color,ch.accent,ch.type);}
        finally{quality.high=oldHigh;quality.low=oldLow;}
        model.position.y=.06;stage.add(model);
        // Facial meshes no longer cast tiny self-shadows onto the body. The body and
        // silhouette pieces still cast one clean, soft shadow onto the turntable.
        model.traverse(function(o){if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
        function markCaster(o){if(!o)return;o.traverse(function(m){if(m.isMesh){m.castShadow=true;m.receiveShadow=false;}});}
        if(model.userData.body)model.userData.body.castShadow=true;
        (model.userData.feet||[]).forEach(markCaster);
        (model.userData._decorArms||[]).forEach(markCaster);
        (model.userData._angelWings||[]).forEach(markCaster);
        (model.userData._crystalEars||[]).forEach(markCaster);
        (model.userData._candyEars||[]).forEach(markCaster);
        (model.userData._flowerDetails||[]).forEach(markCaster);
        (model.userData._forestLeaves||[]).forEach(markCaster);
        (model.userData._rockDetails||[]).forEach(markCaster);
        (model.userData._starDetails||[]).forEach(markCaster);
        (model.userData._windDetails||[]).forEach(markCaster);

        // One fixed warm key light defines the character. Ambient sky light only
        // prevents crushed blacks; there are no moving fill/rim lights.
        scene3.add(new THREE.AmbientLight(0xe7f3f4,.46));
        scene3.add(new THREE.HemisphereLight(0xd9f2ff,0x755f4b,.62));
        var key=new THREE.DirectionalLight(0xffd6a6,3.25);key.position.set(-4.2,6.8,5.8);key.target.position.set(0,.72,0);scene3.add(key,key.target);
        key.castShadow=!quality.low;key.shadow.mapSize.set(quality.high?2048:1024,quality.high?2048:1024);key.shadow.camera.left=-2.1;key.shadow.camera.right=2.1;key.shadow.camera.top=2.6;key.shadow.camera.bottom=-.8;key.shadow.camera.near=.5;key.shadow.camera.far=15;key.shadow.bias=-.00018;key.shadow.normalBias=.045;key.shadow.radius=quality.high?5:3;
        var camera3=new THREE.PerspectiveCamera(36,1,.1,30);camera3.position.set(0,1.0,4.6);camera3.lookAt(0,.78,0);
        return {scene:scene3,stage:stage,model:model,key:key,camera:camera3,index:index,baseY:.06,turnStart:0};
    }

    function makeSceneMap(characterIndex){
        var index=CHARACTER_SELECT_CITY_MAP[characterIndex];
        if(index===undefined)index=characterIndex;
        var theme=(window.CITY_THEME_DATA&&CITY_THEME_DATA[index])||{ground:0x7ADDA5,path:0xFFE8B8,sky:0x9FDBFF,bColors:[0xFF9FC6,0x82D0FF,0xFFE88A],roof:0xFF85AD,tree:0x70D878};
        var palettes=[
            {water:0x4ebbd0,cliff:0x718a69,shore:0xb9d58b,stone:0xead9bc,glow:0x8cecff},
            {water:0x4b9db3,cliff:0xa56d3f,shore:0xe0bd70,stone:0xf1d398,glow:0xffce65},
            {water:0x4d9ebd,cliff:0x789eaa,shore:0xc8edf0,stone:0xe5f6f4,glow:0x83efff},
            {water:0x4f3848,cliff:0x47363c,shore:0x68464a,stone:0x7e6661,glow:0xff633b},
            {water:0x79b9c2,cliff:0xb87f88,shore:0xf5c4c8,stone:0xffe2c0,glow:0xff8fc3},
            {water:0x202c48,cliff:0x30394c,shore:0x656d80,stone:0x969dad,glow:0x8fdfff},
            {water:0x599fbd,cliff:0x806d69,shore:0xc6d997,stone:0xf0d4c5,glow:0xffa5c7},
            {water:0x426f91,cliff:0x657989,shore:0xc9dce4,stone:0xeaf5f8,glow:0xc9f5ff}
        ],palette=palettes[index]||palettes[0];
        var sceneMap=new THREE.Scene(),world=new THREE.Group(),animated=[];
        world.scale.setScalar(1.46);sceneMap.add(world);
        if(window._danboReflectionEnvironment)sceneMap.environment=window._danboReflectionEnvironment;
        var highMap=!quality.low,seg=highMap?40:20,roundSeg=highMap?16:9;
        var stoneMat=pbr(palette.stone,.66,0),pathMat=pbr(theme.path,.69,0),roofMat=pbr(theme.roof,.44,0);
        var glowMat=new THREE.MeshStandardMaterial({color:palette.glow,emissive:palette.glow,emissiveIntensity:index===3?1.55:.48,roughness:.25,transparent:true,opacity:.88});
        var windowMat=new THREE.MeshStandardMaterial({color:0xffefb5,emissive:0xffb648,emissiveIntensity:index===5||index===7?.88:.38,roughness:.30});
        function add(geometry,material,x,y,z,ry){
            var m=new THREE.Mesh(geometry,material);m.position.set(x||0,y||0,z||0);if(ry)m.rotation.y=ry;
            m.castShadow=highMap;m.receiveShadow=true;world.add(m);return m;
        }
        function addRing(radius,tube,y,material){
            var ring=add(new THREE.TorusGeometry(radius,tube,highMap?10:6,seg),material,0,y,0);ring.rotation.x=Math.PI/2;return ring;
        }
        function addTree(x,z,scale,kind,color){
            scale=scale||1;kind=kind||'round';color=color||theme.tree;
            var trunk=add(new THREE.CylinderGeometry(.045*scale,.075*scale,.36*scale,8),pbr(0x76513b,.89,0),x,.39*scale,z);
            if(kind==='palm'){
                trunk.rotation.z=.11;trunk.position.y=.44*scale;
                for(var f=0;f<5;f++){var leaf=add(new THREE.SphereGeometry(.18*scale,8,6),pbr(color,.64,0),x+Math.cos(f*Math.PI*.4)*.13*scale,.76*scale,z+Math.sin(f*Math.PI*.4)*.13*scale);leaf.scale.set(1.45,.32,.58);leaf.rotation.y=f*Math.PI*.4;}
            }else if(kind==='pine'){
                var pine=add(new THREE.ConeGeometry(.27*scale,.67*scale,10),pbr(color,.72,0),x,.76*scale,z);
                if(index===7){var snow=add(new THREE.ConeGeometry(.21*scale,.24*scale,10),pbr(0xf4fbff,.78,0),x,1.00*scale,z);snow.castShadow=false;}
            }else{
                var crown=add(new THREE.SphereGeometry(.24*scale,roundSeg,highMap?10:7),pbr(color,.68,0),x,.70*scale,z);
                crown.scale.set(1.05,1.14,.92);
                if(kind==='sakura'){
                    var blossom=add(new THREE.SphereGeometry(.16*scale,roundSeg,highMap?9:6),pbr(0xffa5c5,.58,0),x+.16*scale,.78*scale,z+.03*scale);
                    blossom.scale.set(1.18,.82,1);
                }
            }
        }
        function addHouse(x,z,h,color,style){
            h=h||.58;style=style||'round';
            var bodyGeo=style==='square'?new THREE.BoxGeometry(.53,h,.48):new THREE.CylinderGeometry(.25,.31,h,highMap?12:8);
            var body=add(bodyGeo,pbr(color,.58,0),x,.25+h*.5,z);
            var roof;
            if(style==='dome'){
                roof=add(new THREE.SphereGeometry(.31,roundSeg,highMap?9:6,0,Math.PI*2,0,Math.PI/2),roofMat,x,.24+h,z);
            }else if(style==='square'){
                roof=add(new THREE.ConeGeometry(.43,.29,4),roofMat,x,.30+h,z,Math.PI/4);
            }else{
                roof=add(new THREE.ConeGeometry(.38,.27,highMap?12:8),roofMat,x,.31+h,z);
            }
            var win=add(new THREE.PlaneGeometry(.13,.15),windowMat,x,.27+h*.52,z+.251);
            win.castShadow=false;win.receiveShadow=false;
            if(highMap&&style!=='dome'){
                var trim=add(new THREE.BoxGeometry(.38,.045,.025),stoneMat,x,.25+h*.80,z+.262);
                trim.castShadow=false;
            }
            return body;
        }

        // A layered collectible-diorama base gives every destination a substantial,
        // handcrafted silhouette instead of a flat disc.
        var under=add(new THREE.CylinderGeometry(2.43,2.60,.17,seg),pbr(palette.cliff,.86,0),0,-.29,0);
        var water=add(new THREE.CylinderGeometry(2.38,2.47,.16,seg),new THREE.MeshPhysicalMaterial({color:palette.water,roughness:.18,metalness:.03,transparent:true,opacity:index===5?.68:.82,clearcoat:.58,clearcoatRoughness:.16,envMapIntensity:.72}),0,-.17,0);
        water.castShadow=false;animated.push({mesh:water,type:'water'});
        addRing(2.22,.055,-.075,new THREE.MeshStandardMaterial({color:palette.glow,emissive:palette.glow,emissiveIntensity:.32,roughness:.34,transparent:true,opacity:.66}));
        var cliff=add(new THREE.CylinderGeometry(2.08,2.26,.34,seg),pbr(palette.cliff,.83,0),0,.02,0);
        var shore=add(new THREE.CylinderGeometry(2.05,2.09,.09,seg),pbr(palette.shore,.78,0),0,.22,0);
        var island=add(new THREE.CylinderGeometry(1.91,2.02,.10,seg),pbr(theme.ground,.76,0),0,.30,0);
        var plaza=add(new THREE.CylinderGeometry(.78,.84,.055,seg),stoneMat,0,.385,0);
        addRing(.61,.023,.418,pbr(new THREE.Color(palette.stone).lerp(new THREE.Color(0xffffff),.28),.56,0));
        [[0,2.95,.27],[Math.PI/2,2.95,.27]].forEach(function(rd){
            var road=add(new THREE.BoxGeometry(rd[1],.05,rd[2]),pathMat,0,.37,0,rd[0]);road.castShadow=false;
        });
        if(highMap){
            addRing(1.43,.025,.387,pathMat);
            for(var lamp=0;lamp<6;lamp++){
                var la=lamp*Math.PI/3+.18,lx=Math.cos(la)*1.12,lz=Math.sin(la)*1.12;
                add(new THREE.CylinderGeometry(.016,.022,.28,6),pbr(0x52666c,.48,.12),lx,.52,lz);
                var bulb=add(new THREE.SphereGeometry(.045,8,6),windowMat,lx,.68,lz);bulb.castShadow=false;
            }
        }

        var bPos=[[-1.34,-.83,.54],[-1.34,.76,.48],[1.37,-.74,.56],[1.34,.82,.62],[0,-1.40,.46]];
        if(index===0||index===4){
            for(var bi=0;bi<bPos.length;bi++){var bp=bPos[bi];addHouse(bp[0],bp[1],bp[2]+(bi%2)*.11,theme.bColors[bi%theme.bColors.length],bi%2?'square':'round');}
        }else if(index===1){
            addHouse(-1.42,-.70,.54,0xe5b76c,'dome');addHouse(1.35,.70,.48,0xd99f58,'dome');addHouse(1.35,-.78,.60,0xf0cb83,'square');
        }else if(index===2){
            addHouse(-1.42,-.72,.55,0xc7ebef,'square');addHouse(1.42,.72,.62,0xa9dce7,'square');
        }else if(index===3){
            addHouse(-1.43,-.74,.51,0x7e5a57,'square');addHouse(1.42,.78,.56,0x684a4b,'square');
        }else if(index===5){
            addHouse(-1.36,-.72,.48,0x7b8ba2,'dome');addHouse(1.36,.75,.54,0x95a1b3,'dome');
        }else if(index===6){
            addHouse(-1.42,-.72,.54,0xf0d6c9,'square');addHouse(1.40,.78,.55,0xe7c5b8,'square');
        }else{
            addHouse(-1.38,-.72,.55,0xe8e1d7,'square');addHouse(1.39,.76,.59,0xd8e4e7,'square');
        }

        var accent=(CHARACTERS[characterIndex]&&CHARACTERS[characterIndex].accent)||0xff769a;
        if(index===0){
            addTree(-1.73,.06,.86,'round');addTree(1.72,.12,.82,'round');addTree(.90,1.56,.68,'round');
            var lowerBasin=add(new THREE.CylinderGeometry(.55,.63,.15,seg),pbr(0xd4c1a5,.54,0),0,.47,0);
            var basin=add(new THREE.CylinderGeometry(.48,.53,.13,seg),stoneMat,0,.57,0);
            var pool=add(new THREE.CylinderGeometry(.40,.40,.036,seg),new THREE.MeshPhysicalMaterial({color:0x68cce5,roughness:.10,transparent:true,opacity:.86,clearcoat:.82}),0,.655,0);
            var column=add(new THREE.CylinderGeometry(.055,.095,.58,12),stoneMat,0,.92,0);
            var upper=add(new THREE.CylinderGeometry(.20,.25,.08,seg),stoneMat,0,1.20,0);
            for(var jet=0;jet<(highMap?4:2);jet++){
                var a=jet*Math.PI/(highMap?2:1),end=new THREE.Vector3(Math.cos(a)*.38,.69,Math.sin(a)*.38);
                var curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(0,1.22,0),new THREE.Vector3(Math.cos(a)*.27,1.37,Math.sin(a)*.27),end);
                var waterJet=add(new THREE.TubeGeometry(curve,highMap?12:7,.013,5,false),glowMat,0,0,0);waterJet.castShadow=false;animated.push({mesh:waterJet,type:'spark'});
            }
            if(highMap)for(var drop=0;drop<5;drop++){var da=drop*2.4,dr=.22+(drop%2)*.14;var droplet=add(new THREE.SphereGeometry(.025,6,5),glowMat,Math.cos(da)*dr,1.01+(drop%3)*.08,Math.sin(da)*dr);droplet.castShadow=false;}
        }else if(index===1){
            addTree(-1.72,.20,.82,'palm',0x5d9f63);addTree(1.73,.10,.72,'palm',0x66a865);
            var pyramid=add(new THREE.ConeGeometry(.51,1.15,4),pbr(0xd4a057,.78,0),0,.95,0,Math.PI/4);
            add(new THREE.ConeGeometry(.30,.80,4),pbr(0xf0ca77,.72,0),-.50,.77,.23,Math.PI/4);
            add(new THREE.CylinderGeometry(.29,.33,.045,seg),new THREE.MeshPhysicalMaterial({color:0x48aeb8,roughness:.13,clearcoat:.65}),.66,.43,-.18);
            for(var dune=0;dune<3;dune++){var d=add(new THREE.SphereGeometry(.34,10,6),pbr(0xe6bd70,.86,0),-1.02+dune*.72,.38,1.20);d.scale.set(1.35,.18,.65);d.castShadow=false;}
        }else if(index===2){
            addTree(-1.72,.10,.74,'pine',0x79bdc7);addTree(1.73,.18,.68,'pine',0x6eb2c0);
            [-.48,-.18,.17,.48].forEach(function(x,ci){
                var heights=[.74,1.24,1.00,.64],crystal=add(new THREE.ConeGeometry(.17+(ci%2)*.03,heights[ci],6),new THREE.MeshPhysicalMaterial({color:[0x8ceeff,0xd5fbff,0x72d8ee,0xa9f4ff][ci],roughness:.14,metalness:.06,transparent:true,opacity:.90,clearcoat:.78}),x,.43+heights[ci]*.5,0);
                crystal.rotation.z=(ci-1.5)*.10;animated.push({mesh:crystal,type:'spark'});
            });
            add(new THREE.TorusGeometry(.72,.055,8,24,Math.PI),stoneMat,0,.56,.32).rotation.z=Math.PI;
        }else if(index===3){
            for(var rock=0;rock<7;rock++){var ra=rock*Math.PI*2/7,rr=1.42+(rock%2)*.16,r=add(new THREE.DodecahedronGeometry(.13+(rock%3)*.025,0),pbr(0x493b40,.96,0),Math.cos(ra)*rr,.45,Math.sin(ra)*rr);r.rotation.set(ra*.31,ra,0);}
            var volcano=add(new THREE.ConeGeometry(.72,1.14,highMap?18:11),pbr(0x5b4143,.94,0),0,.94,0);
            var crater=add(new THREE.TorusGeometry(.25,.075,8,16),pbr(0x362d31,.96,0),0,1.48,0);crater.rotation.x=Math.PI/2;
            var lava=add(new THREE.SphereGeometry(.20,14,9),glowMat,0,1.49,0);lava.scale.y=.26;animated.push({mesh:lava,type:'pulse'});
            for(var stream=0;stream<3;stream++){var sa=stream*Math.PI*2/3+.4,s=add(new THREE.BoxGeometry(.07,.025,.95),glowMat,Math.cos(sa)*.38,.43,Math.sin(sa)*.38,sa);s.castShadow=false;}
        }else if(index===4){
            addTree(-1.72,.10,.78,'round',0xffa3bd);addTree(1.72,.15,.75,'round',0xa5d983);
            for(var tier=0;tier<3;tier++){
                add(new THREE.CylinderGeometry(.43-tier*.09,.49-tier*.08,.18,seg),pbr([0xffc3cd,0xffefd1,0xff98b7][tier],.44,0),0,.49+tier*.20,0);
                var icing=addRing(.37-tier*.07,.035,.60+tier*.20,new THREE.MeshPhysicalMaterial({color:0xfff4e7,roughness:.30,clearcoat:.40}));icing.scale.z=.92;
            }
            var stick=add(new THREE.CylinderGeometry(.035,.045,.55,8),pbr(0xfff0dd,.48,0),0,1.26,0);
            var candy=add(new THREE.SphereGeometry(.24,roundSeg,highMap?12:8),new THREE.MeshPhysicalMaterial({color:0xff6f9f,roughness:.20,clearcoat:.78,clearcoatRoughness:.12}),0,1.59,0);animated.push({mesh:candy,type:'pulse'});
            for(var cane=0;cane<2;cane++){var cx=cane?-.72:.72,stem=add(new THREE.CylinderGeometry(.035,.04,.60,8),pbr(cane?0x8fd9e8:0xff7f9d,.40,0),cx,.72,.12);var hook=add(new THREE.TorusGeometry(.13,.036,8,16,Math.PI),stem.material,cx,.99,.12);hook.rotation.z=Math.PI/2;}
        }else if(index===5){
            for(var craterI=0;craterI<5;craterI++){var ca=craterI*1.75,cr=.84+(craterI%2)*.52,craterRing=add(new THREE.TorusGeometry(.11+(craterI%3)*.025,.025,6,14),pbr(0x545d70,.92,0),Math.cos(ca)*cr,.42,Math.sin(ca)*cr);craterRing.rotation.x=Math.PI/2;}
            var dome=add(new THREE.SphereGeometry(.52,highMap?24:14,highMap?14:9,0,Math.PI*2,0,Math.PI/2),new THREE.MeshPhysicalMaterial({color:0xa4d9ef,roughness:.12,metalness:.10,transparent:true,opacity:.68,clearcoat:.88}),0,.43,0);
            add(new THREE.CylinderGeometry(.46,.50,.12,seg),pbr(0xb5bbc7,.57,.08),0,.43,0);
            var antenna=add(new THREE.CylinderGeometry(.018,.028,.66,7),pbr(0xd6deea,.33,.22),.57,.79,0);antenna.rotation.z=-.34;
            var dish=add(new THREE.SphereGeometry(.18,12,8,0,Math.PI*2,0,Math.PI/2),pbr(0xe0e7ef,.28,.20),.67,1.05,0);dish.rotation.z=-.75;
            for(var solar=0;solar<2;solar++){var panel=add(new THREE.BoxGeometry(.55,.025,.27),new THREE.MeshPhysicalMaterial({color:0x385c91,roughness:.28,metalness:.18,clearcoat:.55}),solar?-.90:.90,.48,.36);panel.rotation.z=(solar?1:-1)*.08;}
        }else if(index===6){
            addTree(-1.72,.03,.90,'sakura',0xffa7c4);addTree(1.70,.14,.82,'sakura',0xff9fbe);addTree(.86,1.48,.66,'sakura',0xffb5cf);
            for(var pi=0;pi<3;pi++){
                var floor=add(new THREE.CylinderGeometry(.35-pi*.055,.40-pi*.05,.16,8),pbr(0xf0d6c9,.61,0),0,.49+pi*.25,0);
                add(new THREE.ConeGeometry(.53-pi*.08,.21,8),pbr(0xb85e69,.48,0),0,.61+pi*.25,0);
            }
            var finial=add(new THREE.CylinderGeometry(.022,.03,.28,6),pbr(0xd5a052,.36,.12),0,1.33,0);
            var toriiMat=pbr(0xdf595b,.58,0);
            add(new THREE.BoxGeometry(.055,.58,.055),toriiMat,-.66,.70,-.16);add(new THREE.BoxGeometry(.055,.58,.055),toriiMat,-.20,.70,-.16);
            add(new THREE.BoxGeometry(.62,.06,.07),toriiMat,-.43,1.00,-.16);add(new THREE.BoxGeometry(.49,.045,.06),toriiMat,-.43,.90,-.16);
        }else{
            addTree(-1.72,.05,.85,'pine',0x477f6c);addTree(1.72,.16,.74,'pine',0x3d7868);addTree(.88,1.48,.66,'pine',0x548c76);
            var cabin=add(new THREE.BoxGeometry(.74,.48,.60),pbr(0xead9c7,.76,0),0,.66,0);
            var snowRoof=add(new THREE.ConeGeometry(.62,.46,4),pbr(0xf7fcff,.72,0),0,1.06,0,Math.PI/4);
            add(new THREE.BoxGeometry(.13,.24,.025),windowMat,0,.70,.311);
            var snowmanBottom=add(new THREE.SphereGeometry(.19,12,9),pbr(0xf4fbff,.78,0),.70,.53,-.05);
            var snowmanHead=add(new THREE.SphereGeometry(.13,12,9),pbr(0xf8fdff,.74,0),.70,.78,-.05);
            var carrot=add(new THREE.ConeGeometry(.028,.15,6),pbr(0xf18a3f,.55,0),.70,.79,.08);carrot.rotation.x=Math.PI/2;
        }
        var beacon=new THREE.PointLight(accent,index===3?1.45:.86,5.5,2);beacon.position.set(0,1.45,.2);sceneMap.add(beacon);
        sceneMap.add(new THREE.HemisphereLight(theme.sky,index===5?0x22283b:0x584738,index===5?.90:1.35));
        var mapKey=new THREE.DirectionalLight(0xffd5a3,2.75);mapKey.position.set(-4,6,4);mapKey.target.position.set(0,.2,0);mapKey.castShadow=highMap;mapKey.shadow.mapSize.set(highMap?1024:512,highMap?1024:512);mapKey.shadow.camera.left=-3;mapKey.shadow.camera.right=3;mapKey.shadow.camera.top=3;mapKey.shadow.camera.bottom=-3;mapKey.shadow.camera.near=.5;mapKey.shadow.camera.far=15;mapKey.shadow.bias=-.0002;mapKey.shadow.normalBias=.035;mapKey.shadow.radius=4;sceneMap.add(mapKey,mapKey.target);
        var mapRim=new THREE.DirectionalLight(palette.glow,1.22);mapRim.position.set(4,2,-4);sceneMap.add(mapRim);
        var mapCamera=new THREE.PerspectiveCamera(31,1,.1,30);mapCamera.position.set(3.82,3.28,4.72);mapCamera.lookAt(0,.48,0);
        return {scene:sceneMap,world:world,camera:mapCamera,index:characterIndex,cityStyle:index,animated:animated};
    }

    // Character selection only needs a cheerful destination hint, not a miniature
    // city simulator. These deliberately simple dioramas use a few large, rounded
    // shapes so the character remains the visual focus and the map reads at a glance.
    function makeCuteSceneMap(characterIndex){
        var index=CHARACTER_SELECT_CITY_MAP[characterIndex];
        if(index===undefined)index=characterIndex;
        var theme=(window.CITY_THEME_DATA&&CITY_THEME_DATA[index])||{ground:0x7ADDA5,path:0xFFE8B8,sky:0x9FDBFF,bColors:[0xFF9FC6,0x82D0FF,0xFFE88A],roof:0xFF85AD,tree:0x70D878};
        var palette=[
            {base:0xa7d88f,edge:0x739f79,accent:0x75cee2},
            {base:0xecc879,edge:0xb77a4b,accent:0xffc568},
            {base:0xc8eef0,edge:0x83b9c4,accent:0x8cecff},
            {base:0x9a6261,edge:0x573f48,accent:0xff7048},
            {base:0xf6c0cc,edge:0xc98391,accent:0xff8eb7},
            {base:0x69748d,edge:0x39445d,accent:0x94dcff},
            {base:0xc9dc9c,edge:0x8a7772,accent:0xffa8c5},
            {base:0xdcecf0,edge:0x7f9cab,accent:0xc8f5ff}
        ][index];
        var sceneMap=new THREE.Scene(),world=new THREE.Group(),highMap=!quality.low;
        world.scale.setScalar(1.82);sceneMap.add(world);
        if(window._danboReflectionEnvironment)sceneMap.environment=window._danboReflectionEnvironment;
        var seg=highMap?28:16,round=highMap?14:9;
        function matte(color,rough){
            return new THREE.MeshStandardMaterial({color:color,roughness:rough===undefined?.72:rough,metalness:0,envMapIntensity:.28});
        }
        function add(geometry,material,x,y,z,ry){
            var m=new THREE.Mesh(geometry,material);m.position.set(x||0,y||0,z||0);if(ry)m.rotation.y=ry;
            m.castShadow=highMap;m.receiveShadow=true;world.add(m);return m;
        }
        function tree(x,z,color,scale,pine){
            scale=scale||1;
            add(new THREE.CylinderGeometry(.055*scale,.085*scale,.36*scale,7),matte(0x805b43,.88),x,.36*scale,z);
            if(pine){
                add(new THREE.ConeGeometry(.29*scale,.68*scale,9),matte(color,.76),x,.76*scale,z);
                if(index===7)add(new THREE.ConeGeometry(.20*scale,.22*scale,9),matte(0xf8fdff,.78),x,.99*scale,z);
            }else{
                var crown=add(new THREE.SphereGeometry(.28*scale,round,highMap?10:7),matte(color,.68),x,.69*scale,z);
                crown.scale.set(1.08,1.12,.94);
            }
        }
        function sakuraTree(x,z,color,scale){
            scale=scale||1;
            add(new THREE.CylinderGeometry(.045*scale,.075*scale,.38*scale,7),matte(0x85605b,.84),x,.38*scale,z);
            var blossomMat=matte(color,.60);
            [[0,.72,0],[-.14,.68,.02],[.14,.69,-.01],[0,.81,.03]].forEach(function(p,i){
                var crown=add(new THREE.SphereGeometry((i===3?.17:.19)*scale,round,highMap?9:6),blossomMat,x+p[0]*scale,p[1]*scale,z+p[2]*scale);
                crown.scale.set(1.12,.86,1);
            });
        }
        function house(x,z,color,roofColor,scale){
            scale=scale||1;
            add(new THREE.BoxGeometry(.48*scale,.50*scale,.44*scale),matte(color,.66),x,.57*scale,z);
            add(new THREE.ConeGeometry(.39*scale,.29*scale,4),matte(roofColor,.58),x,.94*scale,z,Math.PI/4);
            var door=add(new THREE.PlaneGeometry(.11*scale,.17*scale),matte(0x8f6d61,.72),x,.54*scale,z+.223*scale);
            door.castShadow=false;door.receiveShadow=false;
        }
        function domeHouse(x,z,color,scale){
            scale=scale||1;
            add(new THREE.CylinderGeometry(.25*scale,.29*scale,.28*scale,12),matte(color,.64),x,.36*scale,z);
            add(new THREE.SphereGeometry(.27*scale,round,highMap?9:6,0,Math.PI*2,0,Math.PI/2),matte(0xb9def0,.30),x,.49*scale,z);
            var door=add(new THREE.PlaneGeometry(.09*scale,.13*scale),matte(0x52617a,.58),x,.34*scale,z+.285*scale);
            door.castShadow=false;door.receiveShadow=false;
        }
        function roundHouse(x,z,color,roofColor,scale){
            scale=scale||1;
            add(new THREE.CylinderGeometry(.22*scale,.26*scale,.38*scale,12),matte(color,.66),x,.43*scale,z);
            add(new THREE.ConeGeometry(.34*scale,.30*scale,12),matte(roofColor,.56),x,.76*scale,z);
            var door=add(new THREE.PlaneGeometry(.09*scale,.14*scale),matte(0x9a6f68,.70),x,.39*scale,z+.263*scale);
            door.castShadow=false;door.receiveShadow=false;
        }
        function flower(x,z,scale,color,petals){
            scale=scale||1;petals=petals||6;
            add(new THREE.CylinderGeometry(.018*scale,.024*scale,.34*scale,6),matte(0x6eaa65,.78),x,.36*scale,z);
            for(var petal=0;petal<petals;petal++){
                var angle=petal*Math.PI*2/petals;
                var leaf=add(new THREE.SphereGeometry(.13*scale,round,highMap?8:6),matte(color,.58),x+Math.cos(angle)*.15*scale,.57*scale,z+Math.sin(angle)*.15*scale);
                leaf.scale.set(1.18,.42,.76);leaf.rotation.y=-angle;
            }
            add(new THREE.SphereGeometry(.105*scale,round,highMap?8:6),matte(0xffd467,.48),x,.59*scale,z);
        }
        var glow=new THREE.MeshStandardMaterial({color:palette.accent,emissive:palette.accent,emissiveIntensity:.46,roughness:.30});
        add(new THREE.CylinderGeometry(2.13,2.28,.22,seg),matte(palette.edge,.84),0,-.15,0);
        add(new THREE.CylinderGeometry(2.00,2.10,.22,seg),matte(palette.base,.76),0,.04,0);
        add(new THREE.CylinderGeometry(.78,.84,.055,seg),matte(theme.path,.68),0,.19,0);

        if(index===0){
            house(-1.28,-.58,theme.bColors[0],theme.roof,.70);house(1.28,.58,theme.bColors[1],theme.roof,.66);
            roundHouse(.45,-1.18,0xffe9d1,theme.roof,.46);
            tree(-1.28,.58,theme.tree,.72);tree(1.28,-.58,theme.tree,.65);
            tree(-.45,1.18,0x87cc7a,.44);tree(.45,1.18,0x76bc72,.40);
            add(new THREE.CylinderGeometry(.51,.58,.14,seg),matte(0xd9c5aa,.56),0,.31,0);
            add(new THREE.CylinderGeometry(.42,.43,.035,seg),new THREE.MeshPhysicalMaterial({color:0x79d0e5,roughness:.16,transparent:true,opacity:.88,clearcoat:.58}),0,.40,0);
            add(new THREE.CylinderGeometry(.055,.09,.43,9),matte(0xf0dec6,.52),0,.64,0);
            add(new THREE.CylinderGeometry(.17,.22,.07,seg),matte(0xe7d2b7,.54),0,.87,0);
            add(new THREE.SphereGeometry(.07,round,7),glow,0,.97,0);
            for(var jet=0;jet<(highMap?3:2);jet++){
                var angle=jet*Math.PI*2/(highMap?3:2),end=new THREE.Vector3(Math.cos(angle)*.33,.43,Math.sin(angle)*.33);
                var curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(0,.96,0),new THREE.Vector3(Math.cos(angle)*.23,1.05,Math.sin(angle)*.23),end);
                var waterJet=add(new THREE.TubeGeometry(curve,highMap?10:6,.012,5,false),glow,0,0,0);
                waterJet.castShadow=false;waterJet.receiveShadow=false;
            }
        }else if(index===1){
            house(1.28,.58,0xe8bd74,0xc87948,.74);house(-1.28,.58,0xf0ce88,0xd08a51,.58);
            roundHouse(-1.28,-.58,0xf2d491,0xc77d48,.50);roundHouse(.45,-1.18,0xe8bb70,0xb96e42,.44);
            tree(1.28,-.58,0x6ca565,.72);tree(-.45,1.18,0x72ad68,.52);tree(-.45,-1.18,0x82b66e,.42);
            var pyramid=add(new THREE.ConeGeometry(.62,1.18,4),matte(0xdfad60,.76),0,.77,0,Math.PI/4);
            add(new THREE.CylinderGeometry(.30,.33,.035,seg),matte(0x65bdc6,.32),.45,.24,1.18);
        }else if(index===2){
            house(-1.28,.58,0xd9f1f4,0x91d4df,.61);house(1.28,.58,0xc7e8ed,0x79c2d0,.58);
            roundHouse(-1.28,-.58,0xe7f8f8,0x83cad8,.50);roundHouse(1.28,-.58,0xd8f0f4,0x70bac9,.45);
            tree(-.45,-1.18,0x70b5c1,.68,false);tree(.45,-1.18,0x70b5c1,.62,false);
            tree(-.45,1.18,0x8cc7cf,.45,false);tree(.45,1.18,0x79bdc8,.40,false);
            [-.32,0,.34].forEach(function(x,i){
                var h=[.70,1.18,.84][i],crystal=add(new THREE.ConeGeometry(.22,h,6),matte([0x8eeeff,0xd4fbff,0x72d7ee][i],.26),x,.22+h*.5,0);
                crystal.rotation.z=(i-1)*.12;
            });
        }else if(index===3){
            house(1.28,.58,0x755151,0x493a42,.68);house(-1.28,.58,0x865d57,0x4b3c42,.58);
            roundHouse(-1.28,-.58,0x8d615b,0x4d3940,.48);roundHouse(1.28,-.58,0x755052,0x3f3339,.42);
            var volcano=add(new THREE.ConeGeometry(.72,1.14,12),matte(0x60464a,.92),0,.79,0);
            var lava=add(new THREE.SphereGeometry(.20,round,8),glow,0,1.30,0);lava.scale.y=.28;
            [[-.45,-1.18],[-.45,1.18],[.45,1.18]].forEach(function(p){add(new THREE.DodecahedronGeometry(.13,0),matte(0x493b40,.96),p[0],.26,p[1]);});
        }else if(index===4){
            house(-1.28,.58,0xffd3d7,0xff8fab,.74);house(1.28,.58,0xffe2c7,0xff9db9,.60);
            roundHouse(-1.28,-.58,0xffe5c9,0xf782a8,.50);roundHouse(1.28,-.58,0xffd6e1,0xe979a1,.45);
            tree(-.45,-1.18,0xf29fbb,.62);tree(-.45,1.18,0xffa8c5,.50);tree(.45,1.18,0xa9d986,.40);
            add(new THREE.CylinderGeometry(.055,.065,.72,8),matte(0xfff1df,.48),0,.61,0);
            var lollipop=add(new THREE.SphereGeometry(.34,round,10),matte(0xff79a6,.28),0,1.13,0);
            add(new THREE.TorusGeometry(.50,.045,8,seg),matte(0xfff4d8,.48),0,.26,0).rotation.x=Math.PI/2;
        }else if(index===5){
            domeHouse(-1.28,.58,0x8795aa,.72);domeHouse(1.28,.58,0x7c8ca5,.68);
            domeHouse(-1.28,-.58,0x8f9cb0,.55);domeHouse(1.28,-.58,0x76879f,.50);domeHouse(-.45,-1.18,0x93a1b6,.42);
            var dome=add(new THREE.SphereGeometry(.58,round,highMap?11:7,0,Math.PI*2,0,Math.PI/2),new THREE.MeshPhysicalMaterial({color:0xa8daf0,roughness:.22,transparent:true,opacity:.72,clearcoat:.55}),0,.22,0);
            add(new THREE.CylinderGeometry(.49,.53,.12,seg),matte(0x9ca5b6,.62),0,.23,0);
            var antenna=add(new THREE.CylinderGeometry(.025,.035,.68,7),matte(0xd8dfeb,.40),.66,.61,0);antenna.rotation.z=-.32;
            add(new THREE.SphereGeometry(.11,round,7),glow,.76,.91,0);
            [[-.45,1.18],[.45,-1.18],[.45,1.18]].forEach(function(p){var crater=add(new THREE.TorusGeometry(.13,.025,6,12),matte(0x4e586e,.88),p[0],.24,p[1]);crater.rotation.x=Math.PI/2;});
        }else if(index===6){
            roundHouse(-1.28,-.58,0xffeedc,0xc95f7f,.72);
            roundHouse(.45,-1.18,0xffe3cf,0xd86f90,.62);
            roundHouse(1.28,-.58,0xf6ddca,0xb95678,.54);
            sakuraTree(-1.28,.58,0xff9fbe,.78);sakuraTree(1.28,.58,0xffa9c5,.64);
            sakuraTree(-.45,1.18,0xffb7cf,.54);sakuraTree(.45,1.18,0xff97b9,.47);sakuraTree(-.45,-1.18,0xffc3d5,.40);
            flower(0,.08,1.10,0xff91b8,7);
            flower(-.52,.48,.58,0xffbad0,6);flower(.52,-.48,.54,0xf98daf,6);
            if(highMap){
                [[-1.48,-.32],[1.25,-.72],[-.18,.86],[.76,.45]].forEach(function(p,i){
                    var petal=add(new THREE.SphereGeometry(.075,8,6),matte(i%2?0xffa5c5:0xffd4df,.62),p[0],.28,p[1]);
                    petal.scale.set(1.5,.28,.72);petal.rotation.y=i*.73;
                });
            }
        }else{
            house(0,0,0xeadfce,0xf8fdff,.92);house(-1.28,.58,0xdfe9e8,0xf8fdff,.56);
            roundHouse(-1.28,-.58,0xd9e5e4,0xf5fbff,.42);roundHouse(1.28,-.58,0xe7ece8,0xf8fdff,.48);
            tree(-.45,-1.18,0x4e806e,.62,true);tree(.45,-1.18,0x4e806e,.56,true);
            tree(-.45,1.18,0x5b8c76,.45,true);tree(.45,1.18,0x62917c,.38,true);
            add(new THREE.SphereGeometry(.20,round,8),matte(0xf8fdff,.74),1.28,.38,.58);
            add(new THREE.SphereGeometry(.14,round,8),matte(0xffffff,.70),1.28,.66,.58);
            var carrot=add(new THREE.ConeGeometry(.025,.13,6),matte(0xf08b43,.58),1.28,.67,.71);carrot.rotation.x=Math.PI/2;
        }
        sceneMap.add(new THREE.HemisphereLight(theme.sky,index===5?0x2e3448:0x75624e,1.22));
        var key=new THREE.DirectionalLight(0xffd8aa,2.45);key.position.set(-4,6,4);key.target.position.set(0,.25,0);key.castShadow=highMap;
        key.shadow.mapSize.set(highMap?768:384,highMap?768:384);key.shadow.camera.left=-3;key.shadow.camera.right=3;key.shadow.camera.top=3;key.shadow.camera.bottom=-3;key.shadow.camera.near=.5;key.shadow.camera.far=15;key.shadow.bias=-.0002;key.shadow.normalBias=.04;key.shadow.radius=4;sceneMap.add(key,key.target);
        var rim=new THREE.DirectionalLight(palette.accent,.86);rim.position.set(4,2,-3);sceneMap.add(rim);
        var camera=new THREE.PerspectiveCamera(32,1,.1,30);camera.position.set(3.92,3.30,4.80);camera.lookAt(0,.42,0);
        return {scene:sceneMap,world:world,camera:camera,index:characterIndex,cityStyle:index,cute:true};
    }

    var stages=[],mapStages=[];
    try{for(var i=0;i<CHARACTERS.length;i++){stages.push(makeStage(CHARACTERS[i],i));mapStages.push(makeCuteSceneMap(i));}}
    catch(buildErr){console.error('Unable to build 3D roster',buildErr);renderer.dispose();screen.classList.add('select-3d-fallback');return;}
    var _selectProofBody=stages[0]&&stages[0].model&&stages[0].model.userData.body;
    window.DANBO_SELECT_QUALITY.heroBodySegments=_selectProofBody&&_selectProofBody.geometry&&_selectProofBody.geometry.parameters?_selectProofBody.geometry.parameters.widthSegments:0;
    window.DANBO_SELECT_QUALITY.preserveCards=true;
    screen.classList.add('select-3d-ready');
    var selected=0,lastW=0,lastH=0,launching=false;
    var cardsDirty=true,mapDirty=true,wasActive=false,lastCardsAt=-1e9,lastMapAt=-1e9;
    // The roster and hero share each stage/model to keep mobile GPU memory low.
    // Each short card gesture is therefore applied only while that small card is
    // drawn, then restored before the large hero is rendered again.
    var cardGestureIndex=-1,cardGestureStart=-1,cardGestureDuration=1.42;
    var cardGestureKinds=['flower-wave','forest-sway','crystal-skip','angel-flutter','candy-bounce','star-hop','rock-nod','wind-float'];
    function hex6(n){return '#'+('000000'+Number(n||0).toString(16)).slice(-6);}
    function setSelected(idx){
        selected=Math.max(0,Math.min(CHARACTERS.length-1,Number(idx)||0));
        var ch=CHARACTERS[selected],rgb=((ch.accent>>16)&255)+','+((ch.accent>>8)&255)+','+(ch.accent&255);
        screen.style.setProperty('--select-accent',hex6(ch.accent));screen.style.setProperty('--select-accent-rgb',rgb);
        var locale=COPY[window._langCode]||COPY.zhs,copy=locale[selected]||COPY.zhs[selected];
        var pageTitle=document.getElementById('select-page-title'),worldIntro=document.getElementById('select-world-intro'),switchHint=document.getElementById('select-switch-hint'),mapLabel=document.getElementById('select-map-label'),mapCity=document.getElementById('select-map-city');
        if(pageTitle&&typeof L==='function')pageTitle.textContent=L('selectHeroTitle');
        if(worldIntro&&typeof L==='function')worldIntro.textContent=L('selectWorldIntro');
        if(switchHint&&typeof L==='function')switchHint.textContent=L('selectSwitchHint');
        if(mapLabel&&typeof L==='function')mapLabel.textContent=L('selectMapLabel');
        if(mapCity){
            var cityNames=window.I18N&&I18N.cityNames&&(I18N.cityNames[window._langCode]||I18N.cityNames.en);
            var mapStyle=CHARACTER_SELECT_CITY_MAP[selected];
            if(mapStyle===undefined)mapStyle=selected;
            mapCity.textContent=(cityNames&&cityNames[mapStyle])||['希望之城','金沙蛋域','冰晶蛋城','炎晶蛋城','甜梦蛋城','月面蛋都','樱花蛋境','雪花蛋乡'][mapStyle];
        }
        var archetype=document.getElementById('select-archetype'),desc=document.getElementById('select-hero-desc'),count=document.getElementById('select-roster-index'),name=document.getElementById('sf2-char-name');
        if(archetype)archetype.textContent=copy[0];if(desc)desc.textContent=copy[1];if(count)count.textContent=String(selected+1).padStart(2,'0');if(name)name.textContent=ch.name;
        document.querySelectorAll('.char-cell').forEach(function(cell,j){cell.classList.toggle('selected',j===selected);cell.setAttribute('aria-pressed',j===selected?'true':'false');});
        stages[selected].turnStart=(typeof performance!=='undefined'?performance.now():Date.now())*.001;
        cardsDirty=true;mapDirty=true;
    }
    window._update3DCharacterSelect=setSelected;
    window._play3DSelectCardGesture=function(idx){
        idx=Number(idx);
        if(idx<0||idx>=stages.length||!stages[idx])return false;
        cardGestureIndex=idx;
        cardGestureStart=(typeof performance!=='undefined'?performance.now():Date.now())*.001;
        cardsDirty=true;
        window.DANBO_SELECT_CARD_GESTURE={index:idx,kind:cardGestureKinds[idx],start:cardGestureStart,duration:cardGestureDuration,active:true};
        // Kept as a compatibility proof for the previously released flower-only effect.
        window.DANBO_SELECT_CARD_WAVE=window.DANBO_SELECT_CARD_GESTURE;
        return true;
    };
    window._play3DSelectCardWave=window._play3DSelectCardGesture;
    window._startSelect3DTransition=function(done){
        if(launching)return;launching=true;screen.classList.add('select-launching');
        setTimeout(function(){if(typeof done==='function')done();screen.classList.remove('select-launching');launching=false;},680);
    };

    function resize(){
        var w=Math.max(1,screen.clientWidth),h=Math.max(1,screen.clientHeight);
        if(w!==lastW||h!==lastH){
            lastW=w;lastH=h;renderer.setSize(w,h,false);cardsDirty=true;mapDirty=true;return true;
        }
        return false;
    }
    function renderRect(el,item,hero,t){
        if(!el||!item)return;
        var cr=canvas.getBoundingClientRect(),r=el.getBoundingClientRect();
        var x=Math.max(0,r.left-cr.left),y=Math.max(0,cr.bottom-r.bottom),w=Math.min(r.width,cr.width-x),h=Math.min(r.height,cr.height-y);
        if(w<2||h<2)return;
        renderer.setViewport(x,y,w,h);renderer.setScissor(x,y,w,h);renderer.setScissorTest(true);renderer.clear(true,true,true);
        var compactHero=hero&&screen.clientWidth<=700;
        item.stage.scale.setScalar(hero?(compactHero?.94:1.19):.78);
        item.stage.position.set(0,hero?(compactHero?-.045:-.075):-.005,0);
        var heroAge=Math.max(0,t-item.turnStart);
        item.model.position.y=item.baseY+(hero?Math.sin(heroAge*1.35)*.024:0);
        // Stay facing the player: a restrained left/right presentation turn, never 360°.
        item.model.rotation.y=hero?Math.sin(heroAge*.95)*.22:0;
        item.model.rotation.z=0;
        item.key.castShadow=!quality.low&&hero;
        if(typeof _animateCuteCharacterDetails==='function')_animateCuteCharacterDetails(item.model,t);
        var gestureAge=(!hero&&item.index===cardGestureIndex)?t-cardGestureStart:-1;
        var gestureActive=gestureAge>=0&&gestureAge<cardGestureDuration;
        var savedGesturePose=null;
        if(gestureActive){
            var ud=item.model.userData,arms=ud._decorArms||[];
            var detailLists=[
                ud._flowerDetails||[],ud._forestLeaves||[],ud._crystalSparkles||[],ud._angelWings||[],
                ud._candyEars||[],ud._starDetails||[],ud._rockDetails||[],ud._windDetails||[]
            ];
            var details=detailLists[item.index]||[];
            savedGesturePose={
                modelPosition:item.model.position.clone(),
                modelRotation:item.model.rotation.clone(),
                arms:arms.map(function(arm){return{
                    arm:arm,rotation:arm.rotation.clone(),
                    handScale:arm.userData._hand?arm.userData._hand.scale.clone():null
                };}),
                details:details.map(function(detail){return{
                    detail:detail,rotation:detail.rotation.clone(),scale:detail.scale.clone()
                };})
            };
            var p=Math.max(0,Math.min(1,gestureAge/cardGestureDuration));
            var envelope;
            if(p<0.18){var rise=p/0.18;envelope=rise*rise*(3-2*rise);}
            else if(p<0.78)envelope=1;
            else{var fall=(p-0.78)/0.22;fall=Math.max(0,Math.min(1,fall));envelope=1-fall*fall*(3-2*fall);}
            var wave=Math.sin(Math.max(0,gestureAge-0.18)*Math.PI*6.0)*envelope;
            var sway=Math.sin(p*Math.PI*2)*envelope;
            var doubleBounce=Math.pow(Math.sin(p*Math.PI*2),2)*envelope;
            function spreadArms(amount,flutter){
                for(var ai=0;ai<arms.length;ai++){
                    var arm=arms[ai],side=arm.userData._side||((ai===0)?-1:1);
                    var rest=arm.userData._restZ===undefined?side*0.48:arm.userData._restZ;
                    arm.rotation.z=rest+side*amount*envelope+side*(flutter||0)*sway;
                    arm.rotation.x=savedGesturePose.arms[ai].rotation.x+(flutter||0)*0.35*sway;
                    if(arm.userData._hand)arm.userData._hand.scale.setScalar(1+envelope*0.025);
                }
            }
            function waveHand(side,target,amount){
                var arm=null;
                for(var wi=0;wi<arms.length;wi++){
                    if((arms[wi].userData._side||((wi===0)?-1:1))===side){arm=arms[wi];break;}
                }
                if(!arm)arm=side>0?(arms[1]||arms[0]):arms[0];
                if(!arm)return;
                var armIndex=arms.indexOf(arm),rest=arm.userData._restZ===undefined?side*0.48:arm.userData._restZ;
                var raisedTarget=side*Math.abs(target);
                arm.rotation.z=rest+(raisedTarget-rest)*envelope+side*wave*amount;
                arm.rotation.x=savedGesturePose.arms[armIndex].rotation.x+wave*amount*0.62;
                if(arm.userData._hand)arm.userData._hand.scale.setScalar(1+envelope*0.045);
            }
            if(item.index===0){
                waveHand(-1,2.58,0.17);
                item.model.position.y+=Math.sin(p*Math.PI)*0.035;
                item.model.rotation.z=0.045*envelope;
                for(var fdi=0;fdi<details.length;fdi++)details[fdi].rotation.z+=Math.sin(gestureAge*8+fdi*.7)*0.055*envelope;
            }else if(item.index===1){
                spreadArms(0.20,0.05);
                item.model.position.y+=Math.sin(p*Math.PI)*0.024;
                item.model.rotation.z=sway*0.042;
                for(var fli=0;fli<details.length;fli++)details[fli].rotation.z+=Math.sin(gestureAge*6+fli*.8)*0.035*envelope;
            }else if(item.index===2){
                spreadArms(0.18,0.03);
                item.model.position.y+=doubleBounce*0.085;
                for(var cdi=0;cdi<details.length;cdi++)details[cdi].scale.multiplyScalar(1+envelope*(0.035+0.035*Math.sin(gestureAge*9+cdi)));
            }else if(item.index===3){
                spreadArms(0.16,0.025);
                item.model.position.y+=Math.sin(p*Math.PI)*0.038;
                for(var awi=0;awi<details.length;awi++){
                    var wingSide=details[awi].userData._side||((awi===0)?-1:1);
                    details[awi].rotation.z+=wingSide*Math.sin(p*Math.PI*4)*0.085*envelope;
                    details[awi].rotation.y-=wingSide*Math.sin(p*Math.PI*4)*0.045*envelope;
                }
            }else if(item.index===4){
                spreadArms(0.10,0.11);
                item.model.position.y+=doubleBounce*0.075;
                item.model.rotation.z=sway*0.026;
                for(var cei=0;cei<details.length;cei++)details[cei].rotation.z+=((cei===0)?-1:1)*sway*0.040;
            }else if(item.index===5){
                waveHand(1,2.30,0.12);
                item.model.position.y+=Math.sin(p*Math.PI)*0.095;
                item.model.rotation.z=-0.025*envelope;
                for(var sdi=0;sdi<details.length;sdi++)details[sdi].scale.multiplyScalar(1+envelope*(0.035+0.040*Math.sin(gestureAge*8+sdi)));
            }else if(item.index===6){
                spreadArms(0.16,0.025);
                item.model.position.y+=doubleBounce*0.017;
                item.model.rotation.x+=sway*0.050;
                for(var rdi=0;rdi<details.length;rdi++)details[rdi].rotation.y+=sway*0.025*((rdi%2)?-1:1);
            }else{
                waveHand(-1,2.20,0.10);
                item.model.position.y+=Math.sin(p*Math.PI)*0.035;
                item.model.rotation.z=-sway*0.040;
                for(var wdi=0;wdi<details.length;wdi++)details[wdi].rotation.z+=Math.sin(gestureAge*7+wdi)*0.045*envelope;
            }
        }
        var blink=(t+item.index*.31)%4.6>4.46,lids=item.model.userData._blinkLids||[];
        for(var li=0;li<lids.length;li++)lids[li].visible=blink;
        item.camera.fov=hero?(compactHero?34:32):39;item.camera.aspect=w/h;
        item.camera.position.set(hero ? .08 : 0,hero ? .80 : .76,hero ? (compactHero?5.35:5.12) : 4.45);
        item.camera.lookAt(0,hero ? .80 : .76,0);item.camera.updateProjectionMatrix();
        renderer.render(item.scene,item.camera);
        if(savedGesturePose){
            item.model.position.copy(savedGesturePose.modelPosition);
            item.model.rotation.copy(savedGesturePose.modelRotation);
            for(var ari=0;ari<savedGesturePose.arms.length;ari++){
                var armPose=savedGesturePose.arms[ari];armPose.arm.rotation.copy(armPose.rotation);
                if(armPose.handScale&&armPose.arm.userData._hand)armPose.arm.userData._hand.scale.copy(armPose.handScale);
            }
            for(var dri=0;dri<savedGesturePose.details.length;dri++){
                var detailPose=savedGesturePose.details[dri];
                detailPose.detail.rotation.copy(detailPose.rotation);detailPose.detail.scale.copy(detailPose.scale);
            }
        }
    }
    function renderSceneMap(t){
        var item=mapStages[selected];if(!mapViewport||!item)return;
        var cr=canvas.getBoundingClientRect(),r=mapViewport.getBoundingClientRect();
        var x=Math.max(0,r.left-cr.left),y=Math.max(0,cr.bottom-r.bottom),w=Math.min(r.width,cr.width-x),h=Math.min(r.height,cr.height-y);if(w<2||h<2)return;
        renderer.setViewport(x,y,w,h);renderer.setScissor(x,y,w,h);renderer.setScissorTest(true);renderer.clear(true,true,true);
        item.world.rotation.y=-.48+Math.sin(t*.32+selected*.4)*.12;item.world.position.y=-.08+Math.sin(t*.9)*.015;
        (item.animated||[]).forEach(function(a,ai){
            if(!a.baseScale)a.baseScale=a.mesh.scale.clone();
            if(a.type==='pulse'){
                var pulse=1+Math.sin(t*1.7+ai*.8)*.035;
                a.mesh.scale.set(a.baseScale.x*pulse,a.baseScale.y*pulse,a.baseScale.z*pulse);
            }else if(a.type==='spark'&&a.mesh.material&&a.mesh.material.emissiveIntensity!==undefined){
                a.mesh.material.emissiveIntensity=.42+Math.sin(t*2.2+ai)*.13;
            }else if(a.type==='water'){
                a.mesh.rotation.y=t*.035;
            }
        });
        item.camera.aspect=w/h;item.camera.updateProjectionMatrix();renderer.render(item.scene,item.camera);
    }
    function frame(now){
        requestAnimationFrame(frame);
        if(!screen.classList.contains('active')){wasActive=false;return;}
        var resized=resize();
        if(!wasActive||resized){
            renderer.setScissorTest(false);renderer.setViewport(0,0,lastW,lastH);renderer.clear(true,true,true);
            cardsDirty=true;mapDirty=true;wasActive=true;
        }
        var t=now*.001;
        if(cardGestureIndex>=0&&t-cardGestureStart>=cardGestureDuration){
            cardGestureIndex=-1;cardsDirty=true;
            if(window.DANBO_SELECT_CARD_GESTURE)window.DANBO_SELECT_CARD_GESTURE.active=false;
        }
        renderRect(heroViewport,stages[selected],true,t);
        var mapInterval=1000/window.DANBO_SELECT_QUALITY.mapFps;
        if(mapDirty||now-lastMapAt>=mapInterval){renderSceneMap(t);lastMapAt=now;mapDirty=false;}
        var cardInterval=1000/window.DANBO_SELECT_QUALITY.cardFps;
        var cells=document.querySelectorAll('.char-cell');
        if(cardsDirty||now-lastCardsAt>=cardInterval){
            for(var i=0;i<cells.length&&i<stages.length;i++)renderRect(cells[i],stages[i],false,t);
            lastCardsAt=now;cardsDirty=false;
        }else if(cardGestureIndex>=0&&cells[cardGestureIndex]){
            // Redraw only the animated card at display refresh rate.
            renderRect(cells[cardGestureIndex],stages[cardGestureIndex],false,t);
        }
        renderer.setScissorTest(false);
    }
    canvas.addEventListener('webglcontextlost',function(e){e.preventDefault();screen.classList.remove('select-3d-ready');screen.classList.add('select-3d-fallback');});
    for(var fi=0;fi<document.querySelectorAll('.char-fallback').length;fi++)document.querySelectorAll('.char-fallback')[fi].textContent=_fallbackEmoji[fi]||'●';
    setSelected(typeof selectedChar==='number'?selectedChar:0);
    requestAnimationFrame(frame);
})();
