// renderer.js — DANBO World
// ---- Renderer ----
const root = document.getElementById('three-root');
const R = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance', stencil:false});
R.setSize(innerWidth,innerHeight);
var _visualQualityPref='auto';
try{_visualQualityPref=localStorage.getItem('danbo_visual_quality')||'auto';}catch(e){}
var _visualQualityMobile=/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'');
var _visualQualityMemory=Number(navigator.deviceMemory||4);
var _visualQualityCores=Number(navigator.hardwareConcurrency||4);
var _visualQualityMode=_visualQualityPref;
if(['low','balanced','high'].indexOf(_visualQualityMode)<0){
    _visualQualityMode=(!_visualQualityMobile&&_visualQualityMemory>=6&&_visualQualityCores>=6)?'high':'balanced';
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
var _pixelRatioMin=RENDER_CONFIG.pixelRatioMin||1.0;
var _qualityDprCap=_visualQualityMode==='high'?(RENDER_CONFIG.pixelRatioMax||2):(_visualQualityMode==='low'?1.25:1.65);
var _pixelRatioMax=Math.min(devicePixelRatio||1,_qualityDprCap);
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
if(THREE.ACESFilmicToneMapping!==undefined)R.toneMapping=THREE.ACESFilmicToneMapping;
else if(THREE.LinearToneMapping!==undefined)R.toneMapping=THREE.LinearToneMapping;
R.toneMappingExposure=RENDER_CONFIG.toneExposure||1.0;
root.appendChild(R.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(RENDER_CONFIG.fogColor);
scene.fog = new THREE.Fog(RENDER_CONFIG.fogColor, RENDER_CONFIG.fogNear, RENDER_CONFIG.fogFar);

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
window._danboReflectionEnvironment=_createDanboReflectionEnvironment();
scene.environment=window._danboReflectionEnvironment;

const camera = new THREE.PerspectiveCamera(45, innerWidth/innerHeight, 0.5, 2000000);
window.addEventListener('resize', ()=>{
    R.setSize(innerWidth,innerHeight);
    _pixelRatioMax=Math.min(devicePixelRatio||1,_qualityDprCap);
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
sun.shadow.normalBias=0.025;
sun.shadow.radius=_visualQualityMode==='high'?4.8:3.0;
scene.add(sun); scene.add(sun.target);
scene.add(new THREE.HemisphereLight(RENDER_CONFIG.hemiSkyColor,RENDER_CONFIG.hemiGroundColor,RENDER_CONFIG.hemiIntensity));
const rimLight = new THREE.DirectionalLight(0xD8F4FF,0.28);
rimLight.position.set(-50,45,-60);
scene.add(rimLight);
const softFillLight = new THREE.DirectionalLight(0xFFD9C7,0.24);
softFillLight.position.set(35,24,55);
scene.add(softFillLight);
// Sun visual mesh (visible in ground cities)
var _sunMesh=new THREE.Mesh(new THREE.SphereGeometry(8,16,12),new THREE.MeshBasicMaterial({color:0xFFEE44,fog:false}));
_sunMesh.position.copy(sun.position).multiplyScalar(3);
scene.add(_sunMesh);
// Sun glow
var _sunGlow=new THREE.Mesh(new THREE.SphereGeometry(12,16,12),new THREE.MeshBasicMaterial({color:0xFFFF88,transparent:true,opacity:0.25,fog:false}));
_sunGlow.position.copy(_sunMesh.position);
scene.add(_sunGlow);

// ---- Procedural gradient sky + adaptive render quality ----
var _skyDomeGeo=new THREE.SphereGeometry(900000,32,16);
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
        var y=pos.getY(i)/900000;
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
