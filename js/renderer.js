// renderer.js — DANBO World
// ---- Renderer ----
const root = document.getElementById('three-root');
var _visualQualityPref='auto';
try{_visualQualityPref=localStorage.getItem('danbo_visual_quality')||'auto';}catch(e){}
// A coarse primary pointer is not enough to call a device "mobile": touch laptops
// usually also expose a fine pointer and should retain the desktop render path.
var _visualQualityCoarse=!!(window.matchMedia&&matchMedia('(pointer: coarse)').matches);
var _visualQualityFine=!!(window.matchMedia&&matchMedia('(any-pointer: fine)').matches);
var _visualQualityMobile=_visualQualityCoarse&&!_visualQualityFine;
var _visualQualityMemory=Number(navigator.deviceMemory||4);
var _visualQualityCores=Number(navigator.hardwareConcurrency||4);
var _visualQualityMode=_visualQualityPref;
if(['low','balanced','high'].indexOf(_visualQualityMode)<0){
    if(_visualQualityMobile)_visualQualityMode=(_visualQualityMemory<=4||_visualQualityCores<=4)?'low':'balanced';
    else _visualQualityMode=(_visualQualityMemory>=6&&_visualQualityCores>=6)?'high':'balanced';
}
// r180 uses a post AA pass, so native MSAA stays off. This also avoids paying for
// two independent antialiasing paths on high-DPR desktops.
const R = new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance',stencil:false});
R.setSize(innerWidth,innerHeight);
window.DANBO_VISUAL_QUALITY={
    requested:_visualQualityPref,
    mode:_visualQualityMode,
    high:_visualQualityMode==='high',
    low:_visualQualityMode==='low',
    realMobile:_visualQualityMobile,
    postScale:_visualQualityMode==='high'?1.0:(_visualQualityMode==='low'?0.72:0.86)
};
window.DANBO_THREE_REVISION=String(THREE.REVISION||window.DANBO_THREE_REVISION||'');
window.setDanboVisualQuality=function(mode){
    mode=['low','balanced','high','auto'].indexOf(mode)>=0?mode:'auto';
    try{localStorage.setItem('danbo_visual_quality',mode);}catch(e){}
    location.reload();
};
var _pixelRatioMin=1.0;
// Real phones are fixed at DPR 1. A touch-enabled laptop with a mouse is desktop
// and receives its real DPR up to 2, exactly like a conventional workstation.
var _qualityDprCap=_visualQualityMobile?1:Math.min(devicePixelRatio||1,RENDER_CONFIG.pixelRatioMax||2);
var _pixelRatioMax=_qualityDprCap;
var _renderPixelRatio=_pixelRatioMax;
function _setRenderPixelRatio(v){
    _renderPixelRatio=Math.max(_pixelRatioMin,Math.min(_pixelRatioMax,v));
    R.setPixelRatio(_renderPixelRatio);
    if(typeof _resizeCinematicComposer==='function')_resizeCinematicComposer();
}
_setRenderPixelRatio(_renderPixelRatio);
R.shadowMap.enabled = true;
R.shadowMap.type = THREE.PCFSoftShadowMap;
R.outputColorSpace = THREE.SRGBColorSpace;
if(THREE.ColorManagement)THREE.ColorManagement.enabled=true;
if(THREE.ACESFilmicToneMapping!==undefined)R.toneMapping=THREE.ACESFilmicToneMapping;
else if(THREE.LinearToneMapping!==undefined)R.toneMapping=THREE.LinearToneMapping;
R.toneMappingExposure=RENDER_CONFIG.toneExposure||0.66;
root.appendChild(R.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(RENDER_CONFIG.fogColor);
scene.fog = new THREE.FogExp2(RENDER_CONFIG.fogColor,RENDER_CONFIG.fogDensity||0.0021);

// Procedural reflection environment.  This is not visible geometry: it gives the original
// glass, painted walls, water and character shells coherent sky/ground reflections.
function _createDanboReflectionEnvironment(){
    var faces=[];
    for(var fi=0;fi<6;fi++){
        var c=document.createElement('canvas');c.width=c.height=96;var ctx=c.getContext('2d');
        var g=ctx.createLinearGradient(0,0,0,96);
        if(fi===2){g.addColorStop(0,'#f9fcff');g.addColorStop(1,'#a9d9f3');}
        else if(fi===3){g.addColorStop(0,'#82956d');g.addColorStop(1,'#43533f');}
        else{g.addColorStop(0,'#dff4ff');g.addColorStop(.58,'#9dcde4');g.addColorStop(.62,'#f1d9af');g.addColorStop(1,'#71866a');}
        ctx.fillStyle=g;ctx.fillRect(0,0,96,96);
        var rg=ctx.createRadialGradient(fi%2?25:70,fi<2?30:48,2,48,48,65);
        rg.addColorStop(0,'rgba(255,248,224,.46)');rg.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=rg;ctx.fillRect(0,0,96,96);
        faces.push(c);
    }
    var cube=new THREE.CubeTexture(faces);cube.mapping=THREE.CubeReflectionMapping;
    if(THREE.SRGBColorSpace!==undefined)cube.colorSpace=THREE.SRGBColorSpace;
    cube.needsUpdate=true;return cube;
}
window._danboLegacyReflectionEnvironment=_createDanboReflectionEnvironment();
window._danboReflectionEnvironment=window._danboLegacyReflectionEnvironment;
scene.environment=window._danboReflectionEnvironment;
if(scene.environmentIntensity!==undefined)scene.environmentIntensity=0.9;

// HDRI and authored PBR textures participate in the engine loader. The public
// index waits for this promise, with its own 20-second escape hatch.
THREE.Cache.enabled=true;
window.DANBO_PRELOADED_TEXTURES=window.DANBO_PRELOADED_TEXTURES||{};
window.DANBO_RENDER_ASSETS_READY=false;
window.DANBO_RENDER_READY=new Promise(function(resolve){
    var done=false;
    function finish(){if(done)return;done=true;window.DANBO_RENDER_ASSETS_READY=true;resolve(true);}
    var manager=new THREE.LoadingManager();
    manager.onLoad=finish;
    manager.onError=function(url){console.warn('Render asset fallback:',url);};
    var assetSuffix=window.DANBO_ASSET_VERSION?'?'+window.DANBO_ASSET_VERSION:'';
    var textureLoader=new THREE.TextureLoader(manager);
    var surfaceIds=['leafy_grass','clay_roof_tiles_02','rectangular_paving','marble_01'];
    var channels=(window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.low)?['diff']:['diff','normal','arm'];
    surfaceIds.forEach(function(id){
        channels.forEach(function(channel){
            var base='assets/pbr/'+id+'_'+channel+'.jpg';
            var tex=textureLoader.load(base+assetSuffix);
            if(channel==='diff'&&THREE.SRGBColorSpace!==undefined)tex.colorSpace=THREE.SRGBColorSpace;
            else if(THREE.NoColorSpace!==undefined)tex.colorSpace=THREE.NoColorSpace;
            window.DANBO_PRELOADED_TEXTURES[base]=tex;
        });
    });
    var addons=window.DANBO_THREE_ADDONS;
    if(addons&&addons.HDRLoader){
        new addons.HDRLoader(manager).load(
            'assets/hdri/kloppenheim_06_puresky_1k.hdr'+assetSuffix,
            function(hdr){
                hdr.mapping=THREE.EquirectangularReflectionMapping;
                var pmrem=new THREE.PMREMGenerator(R);
                pmrem.compileEquirectangularShader();
                var env=pmrem.fromEquirectangular(hdr).texture;
                pmrem.dispose();
                window._danboHDRBackground=hdr;
                window._danboHDRIEnvironment=env;
                window._danboReflectionEnvironment=env;
                if(typeof currentCityStyle==='undefined'||currentCityStyle===0){
                    scene.background=hdr;
                    scene.environment=env;
                    if(scene.backgroundIntensity!==undefined)scene.backgroundIntensity=0.85;
                    if(scene.environmentIntensity!==undefined)scene.environmentIntensity=0.9;
                }
            },
            undefined,
            function(err){console.warn('HDRI fallback active',err);}
        );
    }else{
        // The legacy r160 emergency fallback has no HDRLoader bundle.
        manager.itemStart('danbo-hdri-fallback');
        setTimeout(function(){manager.itemEnd('danbo-hdri-fallback');},0);
    }
    setTimeout(finish,20000);
});

// Keep the raw equirectangular sky only in Hope City; other themed worlds retain
// their authored backgrounds. Environment and background use the same Y rotation,
// so the key light can stay aligned to the visible HDR sun.
window._applyDanboEnvironmentForCity=function(style,st){
    var useHDR=style===0&&!!window._danboHDRBackground;
    scene.background=useHDR?window._danboHDRBackground:new THREE.Color(st&&st.sky!==undefined?st.sky:RENDER_CONFIG.fogColor);
    scene.environment=useHDR?window._danboHDRIEnvironment:window._danboLegacyReflectionEnvironment;
    var rotationY=-1.2741; // original +31° sun -> -42° camera-facing sun
    var rotationX=-0.1196; // 14.45° source elevation -> 7.6° dusk key
    if(scene.backgroundRotation)scene.backgroundRotation.set(useHDR?rotationX:0,useHDR?rotationY:0,0);
    if(scene.environmentRotation)scene.environmentRotation.set(useHDR?rotationX:0,useHDR?rotationY:0,0);
    if(scene.backgroundIntensity!==undefined)scene.backgroundIntensity=useHDR?0.85:1.0;
    if(scene.environmentIntensity!==undefined)scene.environmentIntensity=useHDR?0.9:0.72;
    if(typeof _skyDome!=='undefined')_skyDome.visible=!useHDR;
    if(useHDR)scene.fog=new THREE.FogExp2(0xA9B9C7,0.0021);
    return useHDR;
};

const camera = new THREE.PerspectiveCamera(58,innerWidth/innerHeight,0.1,1200);
window.addEventListener('resize', ()=>{
    R.setSize(innerWidth,innerHeight);
    _qualityDprCap=_visualQualityMobile?1:Math.min(devicePixelRatio||1,RENDER_CONFIG.pixelRatioMax||2);
    _pixelRatioMax=_qualityDprCap;
    _setRenderPixelRatio(_renderPixelRatio);
    camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix();
});

// ---- Lighting ----
scene.add(new THREE.AmbientLight(0xffffff, RENDER_CONFIG.ambientIntensity));
const sun = new THREE.DirectionalLight(RENDER_CONFIG.sunColor, RENDER_CONFIG.sunIntensity);
sun.position.set(RENDER_CONFIG.sunPos.x,RENDER_CONFIG.sunPos.y,RENDER_CONFIG.sunPos.z); sun.castShadow=true;
var _shadowQualitySize=_visualQualityMode==='high'?RENDER_CONFIG.shadowMapSize:(_visualQualityMode==='low'?1024:2048);
sun.shadow.mapSize.set(_shadowQualitySize,_shadowQualitySize);
const ssc=sun.shadow.camera; ssc.left=-RENDER_CONFIG.shadowRange;ssc.right=RENDER_CONFIG.shadowRange;ssc.top=RENDER_CONFIG.shadowRange;ssc.bottom=-RENDER_CONFIG.shadowRange;ssc.near=RENDER_CONFIG.shadowNear;ssc.far=RENDER_CONFIG.shadowFar;
sun.shadow.bias=RENDER_CONFIG.shadowBias;
sun.shadow.normalBias=0.03;
sun.shadow.radius=3;
if(sun.shadow.intensity!==undefined)sun.shadow.intensity=0.68;
scene.add(sun); scene.add(sun.target);
scene.add(new THREE.HemisphereLight(RENDER_CONFIG.hemiSkyColor,RENDER_CONFIG.hemiGroundColor,RENDER_CONFIG.hemiIntensity));
const rimLight = new THREE.DirectionalLight(0xCFEAFF,0.08);
rimLight.position.set(-50,45,-60);
scene.add(rimLight);
const softFillLight = new THREE.DirectionalLight(0xFFE2CF,0.04);
softFillLight.position.set(35,24,55);
scene.add(softFillLight);
// A clean solar disc plus a soft radial corona. The glow is texture-shaped rather
// than a translucent sphere, so it reads as sunlight without a hard plastic edge.
var _sunMesh=new THREE.Mesh(new THREE.SphereGeometry(8,32,20),new THREE.MeshBasicMaterial({color:0xFFF1A8,fog:false,toneMapped:false}));
_sunMesh.userData.noAO=true;
_sunMesh.position.copy(sun.position).multiplyScalar(3);
scene.add(_sunMesh);
var _sunGlowCanvas=document.createElement('canvas');_sunGlowCanvas.width=_sunGlowCanvas.height=128;
var _sunGlowCtx=_sunGlowCanvas.getContext('2d'),_sunGlowGrad=_sunGlowCtx.createRadialGradient(64,64,6,64,64,64);
_sunGlowGrad.addColorStop(0,'rgba(255,246,190,.82)');_sunGlowGrad.addColorStop(.20,'rgba(255,222,132,.38)');
_sunGlowGrad.addColorStop(.52,'rgba(255,196,92,.13)');_sunGlowGrad.addColorStop(1,'rgba(255,184,78,0)');
_sunGlowCtx.fillStyle=_sunGlowGrad;_sunGlowCtx.fillRect(0,0,128,128);
var _sunGlowTex=new THREE.CanvasTexture(_sunGlowCanvas);_sunGlowTex.colorSpace=THREE.SRGBColorSpace;
var _sunGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:_sunGlowTex,color:0xFFF0C0,transparent:true,opacity:0.72,depthWrite:false,depthTest:false,fog:false,blending:THREE.AdditiveBlending,toneMapped:false}));
_sunGlow.userData.noAO=true;
_sunGlow.scale.set(52,52,1);_sunGlow.renderOrder=990;
_sunGlow.position.copy(_sunMesh.position);
scene.add(_sunGlow);

// ---- Procedural gradient sky + adaptive render quality ----
var _skyDomeGeo=new THREE.SphereGeometry(900,32,16);
var _skyDomeMat=new THREE.MeshBasicMaterial({side:THREE.BackSide,vertexColors:true,depthWrite:false,depthTest:false,fog:false});
var _skyDome=new THREE.Mesh(_skyDomeGeo,_skyDomeMat);
_skyDome.frustumCulled=false;
_skyDome.renderOrder=-1000;
scene.add(_skyDome);
function _mixHex(a,b,t){
    t=Math.max(0,Math.min(1,t));
    var ar=(a>>16)&255,ag=(a>>8)&255,ab=a&255;
    var br=(b>>16)&255,bg=(b>>8)&255,bb=b&255;
    var r=Math.round(ar+(br-ar)*t),g=Math.round(ag+(bg-ag)*t),bl=Math.round(ab+(bb-ab)*t);
    return (r<<16)|(g<<8)|bl;
}
function _updateSkyDome(skyHex,horizonHex,groundHex){
    skyHex=(skyHex===undefined)?0x87CEEB:skyHex;
    horizonHex=(horizonHex===undefined)?_mixHex(skyHex,0xffffff,0.35):horizonHex;
    groundHex=(groundHex===undefined)?_mixHex(skyHex,0x223344,0.35):groundHex;
    var pos=_skyDomeGeo.attributes.position;
    var colors=[];
    for(var i=0;i<pos.count;i++){
        var y=pos.getY(i)/900;
        var cHex;
        if(y>=0)cHex=_mixHex(horizonHex,skyHex,Math.pow(y,0.65));
        else cHex=_mixHex(horizonHex,groundHex,Math.min(1,-y*1.8));
        colors.push(((cHex>>16)&255)/255,((cHex>>8)&255)/255,(cHex&255)/255);
    }
    _skyDomeGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    _skyDomeGeo.attributes.color.needsUpdate=true;
}
_updateSkyDome(RENDER_CONFIG.fogColor,0xEAF7FF,0x88CCAA);

var _qualityFrameCount=0,_qualityAvgMs=16.7,_qualityCooldown=0;
function _updateRenderQuality(frameMs){
    // Pixel ratio is deliberately deterministic in the r180 profile. Quality
    // differences are handled by post-process scale and sample count instead.
    if(frameMs)_qualityAvgMs=_qualityAvgMs*0.94+frameMs*0.06;
}

function _updateSunShadowFocus(){
    if(!playerEgg||!sun.visible)return;
    var px=playerEgg.mesh.position.x,pz=playerEgg.mesh.position.z;
    sun.target.position.set(px,0,pz);
    sun.position.set(px+RENDER_CONFIG.sunPos.x,RENDER_CONFIG.sunPos.y,pz+RENDER_CONFIG.sunPos.z);
    _sunMesh.position.set(px+RENDER_CONFIG.sunPos.x*3,RENDER_CONFIG.sunPos.y*3,pz+RENDER_CONFIG.sunPos.z*3);
    _sunGlow.position.copy(_sunMesh.position);
}

// ---- Skins ----
// ---- Characters ----
