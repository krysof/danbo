// renderer.js — DANBO World
// ---- Renderer ----
const root = document.getElementById('three-root');
const R = new THREE.WebGLRenderer({antialias:false, powerPreference:'high-performance', stencil:false});
R.setSize(innerWidth,innerHeight);
var _visualQualityPref='auto';
try{_visualQualityPref=localStorage.getItem('danbo_visual_quality')||'auto';}catch(e){}
var _visualQualityCoarse=!!(window.matchMedia&&matchMedia('(pointer: coarse)').matches);
var _visualQualityAnyFine=!!(window.matchMedia&&matchMedia('(any-pointer: fine)').matches);
var _visualQualityMobile=_visualQualityCoarse&&!_visualQualityAnyFine;
var _visualQualityHasMemory=typeof navigator.deviceMemory==='number'&&navigator.deviceMemory>0;
var _visualQualityMemory=_visualQualityHasMemory?Number(navigator.deviceMemory):0;
var _visualQualityCores=Number(navigator.hardwareConcurrency||4);
var _visualQualityMode=_visualQualityPref;
if(['low','balanced','high'].indexOf(_visualQualityMode)<0){
    // Safari does not normally expose deviceMemory. Treating the missing value as
    // 4 GB forced modern iPhones into low quality, even when their GPU was fast.
    if(_visualQualityMobile)_visualQualityMode=((_visualQualityHasMemory&&_visualQualityMemory<=3)||_visualQualityCores<=3)?'low':'balanced';
    else _visualQualityMode=(_visualQualityMemory>=6&&_visualQualityCores>=6)?'high':'balanced';
}
window.DANBO_VISUAL_QUALITY={
    requested:_visualQualityPref,
    mode:_visualQualityMode,
    high:_visualQualityMode==='high',
    low:_visualQualityMode==='low',
    postScale:_visualQualityMode==='high'?1.0:(_visualQualityMode==='low'?0.68:0.84)
};
window.setDanboVisualQuality=function(mode){
    mode=['low','balanced','high','auto'].indexOf(mode)>=0?mode:'auto';
    try{localStorage.setItem('danbo_visual_quality',mode);}catch(e){}
    location.reload();
};
var _qualityDprCap=_visualQualityMobile?1:(RENDER_CONFIG.pixelRatioMax||2);
var _pixelRatioMax=_visualQualityMobile?1:Math.min(devicePixelRatio||1,_qualityDprCap);
var _pixelRatioMin=_pixelRatioMax;
var _renderPixelRatio=_pixelRatioMax;
function _setRenderPixelRatio(v){
    _renderPixelRatio=Math.max(_pixelRatioMin,Math.min(_pixelRatioMax,v));
    R.setPixelRatio(_renderPixelRatio);
}
_setRenderPixelRatio(_renderPixelRatio);
R.shadowMap.enabled = true;
R.shadowMap.type = THREE.PCFSoftShadowMap;
R.outputColorSpace = THREE.SRGBColorSpace;
if(THREE.ColorManagement)THREE.ColorManagement.enabled=true;
R.toneMapping=THREE.ACESFilmicToneMapping;
R.toneMappingExposure=RENDER_CONFIG.toneExposure||0.66;
root.appendChild(R.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(RENDER_CONFIG.fogColor);
scene.fog = new THREE.FogExp2(RENDER_CONFIG.fogColor,RENDER_CONFIG.fogDensity||0.0021);

// Immediate procedural fallback. It is replaced by the PMREM-convolved HDRI as soon
// as the render asset LoadingManager finishes.
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
window._danboReflectionEnvironment=_createDanboReflectionEnvironment();
scene.environment=window._danboReflectionEnvironment;
scene.environmentIntensity=RENDER_CONFIG.environmentIntensity||0.9;
scene.backgroundIntensity=RENDER_CONFIG.backgroundIntensity||0.85;

var _danboRenderAssetsResolve;
window.DANBO_RENDER_ASSETS_READY=new Promise(function(resolve){_danboRenderAssetsResolve=resolve;});
var _danboRenderAssetManager=new THREE.LoadingManager();
_danboRenderAssetManager.onLoad=function(){_danboRenderAssetsResolve({hdri:!!window._danboHDRIBackground});};
_danboRenderAssetManager.onError=function(url){console.warn('Render asset failed, using procedural environment:',url);};
if(typeof HDRLoader==='function'){
    var _danboHDRLoader=new HDRLoader(_danboRenderAssetManager);
    _danboHDRLoader.load((RENDER_CONFIG.hdri||'assets/hdri/farm_sunset_1k.hdr')+(window.DANBO_ASSET_VERSION?'?'+window.DANBO_ASSET_VERSION:''),function(texture){
        texture.mapping=THREE.EquirectangularReflectionMapping;
        texture.name='DANBO_FarmSunset_HDRI';
        var pmrem=new THREE.PMREMGenerator(R);pmrem.compileEquirectangularShader();
        var environment=pmrem.fromEquirectangular(texture).texture;
        environment.name='DANBO_PMREM_Environment';
        pmrem.dispose();
        if(window._danboReflectionEnvironment&&window._danboReflectionEnvironment.dispose)window._danboReflectionEnvironment.dispose();
        window._danboHDRIBackground=texture;
        window._danboReflectionEnvironment=environment;
        scene.environment=environment;
        scene.environmentIntensity=RENDER_CONFIG.environmentIntensity||0.9;
        scene.background=texture;
        scene.backgroundIntensity=RENDER_CONFIG.backgroundIntensity||0.85;
        scene.fog=new THREE.FogExp2(RENDER_CONFIG.fogColor,RENDER_CONFIG.fogDensity||0.0021);
        if(typeof _skyDome!=='undefined')_skyDome.visible=false;
    });
}else{
    console.warn('HDRLoader unavailable, using procedural environment');
    _danboRenderAssetsResolve({hdri:false});
}

const camera = new THREE.PerspectiveCamera(58, innerWidth/innerHeight, 0.1, 1200);
window.addEventListener('resize', ()=>{
    R.setSize(innerWidth,innerHeight);
    _pixelRatioMax=_visualQualityMobile?1:Math.min(devicePixelRatio||1,_qualityDprCap);
    _pixelRatioMin=_pixelRatioMax;
    _setRenderPixelRatio(_renderPixelRatio);
    camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix();
});

// ---- Lighting ----
var _ambientStrength=_visualQualityMode==='low'?(RENDER_CONFIG.lowAmbientIntensity||RENDER_CONFIG.ambientIntensity):RENDER_CONFIG.ambientIntensity;
scene.add(new THREE.AmbientLight(0xffffff,_ambientStrength));
var _sunStrength=_visualQualityMode==='low'?(RENDER_CONFIG.lowSunIntensity||RENDER_CONFIG.sunIntensity):RENDER_CONFIG.sunIntensity;
const sun = new THREE.DirectionalLight(RENDER_CONFIG.sunColor,_sunStrength);
sun.position.set(RENDER_CONFIG.sunPos.x,RENDER_CONFIG.sunPos.y,RENDER_CONFIG.sunPos.z); sun.castShadow=true;
var _shadowQualitySize=_visualQualityMobile?2048:(_visualQualityMode==='low'?2048:(RENDER_CONFIG.shadowMapSize||4096));
sun.shadow.mapSize.set(_shadowQualitySize,_shadowQualitySize);
const ssc=sun.shadow.camera; ssc.left=-RENDER_CONFIG.shadowRange;ssc.right=RENDER_CONFIG.shadowRange;ssc.top=RENDER_CONFIG.shadowRange;ssc.bottom=-RENDER_CONFIG.shadowRange;ssc.near=RENDER_CONFIG.shadowNear;ssc.far=RENDER_CONFIG.shadowFar;
sun.shadow.bias=RENDER_CONFIG.shadowBias;
sun.shadow.normalBias=RENDER_CONFIG.shadowNormalBias||0.03;
sun.shadow.radius=RENDER_CONFIG.shadowRadius||3;
if('intensity' in sun.shadow)sun.shadow.intensity=RENDER_CONFIG.shadowIntensity||0.68;
scene.add(sun); scene.add(sun.target);
var _hemiStrength=_visualQualityMode==='low'?(RENDER_CONFIG.lowHemiIntensity||RENDER_CONFIG.hemiIntensity):RENDER_CONFIG.hemiIntensity;
scene.add(new THREE.HemisphereLight(RENDER_CONFIG.hemiSkyColor,RENDER_CONFIG.hemiGroundColor,_hemiStrength));
// Keep auxiliary lights permanently in the scene. Effects and city themes may only
// modify intensity; adding/removing lights would force a full material shader recompile.
const rimLight = new THREE.DirectionalLight(0xCFEAFF,0.04);
rimLight.position.set(-50,45,-60);
scene.add(rimLight);
const softFillLight = new THREE.DirectionalLight(0xFFE2CF,0.03);
softFillLight.position.set(35,24,55);
scene.add(softFillLight);
var _danboEffectLightPool=[];
for(var _effectLightIndex=0;_effectLightIndex<1;_effectLightIndex++){
    var _effectLight=new THREE.PointLight(0xffffff,0,17,2);
    _effectLight.name='danbo-persistent-effect-light-'+_effectLightIndex;
    _effectLight.castShadow=false;_effectLight.visible=true;
    scene.add(_effectLight);_danboEffectLightPool.push(_effectLight);
}
window._danboEffectLightPool=_danboEffectLightPool;
// A clean solar disc plus a soft radial corona. The glow is texture-shaped rather
// than a translucent sphere, so it reads as sunlight without a hard plastic edge.
var _sunMesh=new THREE.Mesh(new THREE.SphereGeometry(8,32,20),new THREE.MeshBasicMaterial({color:0xFFF1A8,fog:false,toneMapped:false}));
_sunMesh.position.copy(sun.position).multiplyScalar(3);
scene.add(_sunMesh);
var _sunGlowCanvas=document.createElement('canvas');_sunGlowCanvas.width=_sunGlowCanvas.height=128;
var _sunGlowCtx=_sunGlowCanvas.getContext('2d'),_sunGlowGrad=_sunGlowCtx.createRadialGradient(64,64,6,64,64,64);
_sunGlowGrad.addColorStop(0,'rgba(255,246,190,.82)');_sunGlowGrad.addColorStop(.20,'rgba(255,222,132,.38)');
_sunGlowGrad.addColorStop(.52,'rgba(255,196,92,.13)');_sunGlowGrad.addColorStop(1,'rgba(255,184,78,0)');
_sunGlowCtx.fillStyle=_sunGlowGrad;_sunGlowCtx.fillRect(0,0,128,128);
var _sunGlowTex=new THREE.CanvasTexture(_sunGlowCanvas);_sunGlowTex.colorSpace=THREE.SRGBColorSpace;
var _sunGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:_sunGlowTex,color:0xFFF0C0,transparent:true,opacity:0.72,depthWrite:false,depthTest:false,fog:false,blending:THREE.AdditiveBlending,toneMapped:false}));
_sunGlow.scale.set(52,52,1);_sunGlow.renderOrder=990;
_sunGlow.position.copy(_sunMesh.position);
scene.add(_sunGlow);

// ---- Procedural gradient sky + adaptive render quality ----
var _skyDomeGeo=new THREE.SphereGeometry(1100,32,16);
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
        var y=pos.getY(i)/1100;
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
    if(!frameMs||gameState==='menu')return;
    _qualityAvgMs=_qualityAvgMs*0.94+frameMs*0.06;
    _qualityFrameCount++;
    if(_qualityCooldown>0){_qualityCooldown--;return;}
    if(_qualityFrameCount%45!==0)return;
    if(_qualityAvgMs>24&&_renderPixelRatio>_pixelRatioMin+0.05){
        _setRenderPixelRatio(_renderPixelRatio-0.12);
        _qualityCooldown=45;
    } else if(_qualityAvgMs<17.2&&_renderPixelRatio<_pixelRatioMax-0.05){
        _setRenderPixelRatio(_renderPixelRatio+0.08);
        _qualityCooldown=90;
    }
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
