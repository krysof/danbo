// postfx.js — DANBO World
// ============================================================
//  Cinematic post-processing: depth-aware contact shading, restrained bloom,
//  focus falloff, filmic grading and micro-contrast. No external dependencies.
// ============================================================
/* global THREE, R, scene, camera, currentCityStyle, _renderPixelRatio */

var _postFXEnabled=true;
var _postFXRT=null,_postFXScene=null,_postFXCamera=null,_postFXQuad=null,_postFXMat=null;
var _postFXSize=new THREE.Vector2(1,1);
var _postFXFrame=0;

var _postFXMood=[
    {bloom:0.16,sat:1.025,contrast:1.055,exposure:1.015,vignette:0.18,warm:0.012,threshold:0.74},
    {bloom:0.18,sat:1.00,contrast:0.94,exposure:1.06,vignette:0.12,warm:0.075,threshold:0.68},
    {bloom:0.20,sat:0.98,contrast:0.93,exposure:1.08,vignette:0.10,warm:-0.015,threshold:0.68},
    {bloom:0.26,sat:1.02,contrast:0.96,exposure:1.04,vignette:0.18,warm:0.070,threshold:0.63},
    {bloom:0.28,sat:1.04,contrast:0.93,exposure:1.08,vignette:0.08,warm:0.055,threshold:0.66},
    {bloom:0.24,sat:0.99,contrast:0.94,exposure:1.02,vignette:0.22,warm:-0.010,threshold:0.61},
    {bloom:0.24,sat:1.03,contrast:0.93,exposure:1.08,vignette:0.10,warm:0.050,threshold:0.66},
    {bloom:0.24,sat:0.98,contrast:0.93,exposure:1.09,vignette:0.12,warm:-0.005,threshold:0.64}
];

function _initCinematicPostFX(){
    if(_postFXRT||typeof R==='undefined'||typeof THREE==='undefined')return;
    _postFXRT=new THREE.WebGLRenderTarget(2,2,{
        minFilter:THREE.LinearFilter,
        magFilter:THREE.LinearFilter,
        format:THREE.RGBAFormat,
        depthBuffer:true,
        stencilBuffer:false
    });
    _postFXRT.depthTexture=new THREE.DepthTexture(2,2,THREE.UnsignedIntType);
    _postFXRT.depthTexture.format=THREE.DepthFormat;
    if(R.capabilities&&R.capabilities.isWebGL2)_postFXRT.samples=2;
    _postFXScene=new THREE.Scene();
    _postFXCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    _postFXMat=new THREE.ShaderMaterial({
        depthWrite:false,
        depthTest:false,
        uniforms:{
            tDiffuse:{value:null},
            tDepth:{value:null},
            resolution:{value:new THREE.Vector2(2,2)},
            time:{value:0},
            uBloom:{value:0.22},
            uSaturation:{value:0.99},
            uContrast:{value:0.94},
            uExposure:{value:1.06},
            uVignette:{value:0.10},
            uWarmth:{value:0.03},
            uThreshold:{value:0.55},
            cameraNear:{value:camera.near},
            cameraFar:{value:camera.far},
            uAO:{value:0.14},
            uDOF:{value:0.22},
            uFocusDistance:{value:26},
            uFocusRange:{value:24}
        },
        vertexShader:[
            'varying vec2 vUv;',
            'void main(){',
            '  vUv=uv;',
            '  gl_Position=vec4(position.xy,0.0,1.0);',
            '}'
        ].join('\n'),
        fragmentShader:[
            '#ifdef GL_ES',
            'precision highp float;',
            '#endif',
            'uniform sampler2D tDiffuse;',
            'uniform sampler2D tDepth;',
            'uniform vec2 resolution;',
            'uniform float time;',
            'uniform float uBloom;',
            'uniform float uSaturation;',
            'uniform float uContrast;',
            'uniform float uExposure;',
            'uniform float uVignette;',
            'uniform float uWarmth;',
            'uniform float uThreshold;',
            'uniform float cameraNear;',
            'uniform float cameraFar;',
            'uniform float uAO;',
            'uniform float uDOF;',
            'uniform float uFocusDistance;',
            'uniform float uFocusRange;',
            'varying vec2 vUv;',
            'float luma(vec3 c){return dot(c,vec3(0.2126,0.7152,0.0722));}',
            'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}',
            'float viewDistance(vec2 uv){',
            '  float z=texture2D(tDepth,uv).x;',
            '  float viewZ=(cameraNear*cameraFar)/((cameraFar-cameraNear)*z-cameraFar);',
            '  return max(cameraNear,-viewZ);',
            '}',
            'vec3 brightSample(vec2 uv){',
            '  vec3 c=texture2D(tDiffuse,uv).rgb;',
            '  float b=smoothstep(uThreshold,1.0,luma(c));',
            '  return c*b;',
            '}',
            'void main(){',
            '  vec2 uv=vUv;',
            '  vec2 px=1.0/max(resolution,vec2(1.0));',
            '  float edge=length(uv-0.5);',
            '  vec3 col=texture2D(tDiffuse,uv).rgb;',
            '  float centerDepth=viewDistance(uv);',
            '  vec2 aoStep=px*3.0;',
            '  float occ=0.0;',
            '  float aoScale=max(0.24,centerDepth*0.035);',
            '  occ+=smoothstep(0.02,1.0,(centerDepth-viewDistance(uv+vec2( aoStep.x,0.0)))/aoScale);',
            '  occ+=smoothstep(0.02,1.0,(centerDepth-viewDistance(uv+vec2(-aoStep.x,0.0)))/aoScale);',
            '  occ+=smoothstep(0.02,1.0,(centerDepth-viewDistance(uv+vec2(0.0, aoStep.y)))/aoScale);',
            '  occ+=smoothstep(0.02,1.0,(centerDepth-viewDistance(uv+vec2(0.0,-aoStep.y)))/aoScale);',
            '  occ+=smoothstep(0.02,1.0,(centerDepth-viewDistance(uv+aoStep))/aoScale);',
            '  occ+=smoothstep(0.02,1.0,(centerDepth-viewDistance(uv-aoStep))/aoScale);',
            '  float ao=1.0-uAO*min(1.0,occ/3.5);',
            '  vec3 n1=texture2D(tDiffuse,uv+vec2(px.x,0.0)).rgb;',
            '  vec3 n2=texture2D(tDiffuse,uv-vec2(px.x,0.0)).rgb;',
            '  vec3 n3=texture2D(tDiffuse,uv+vec2(0.0,px.y)).rgb;',
            '  vec3 n4=texture2D(tDiffuse,uv-vec2(0.0,px.y)).rgb;',
            '  vec3 localAvg=(n1+n2+n3+n4)*0.25;',
            '  float focusBlur=smoothstep(uFocusRange*0.35,uFocusRange,abs(centerDepth-uFocusDistance));',
            '  vec2 dofStep=px*(2.0+focusBlur*3.5);',
            '  vec3 dofCol=(texture2D(tDiffuse,uv+vec2(dofStep.x,0.0)).rgb+texture2D(tDiffuse,uv-vec2(dofStep.x,0.0)).rgb+texture2D(tDiffuse,uv+vec2(0.0,dofStep.y)).rgb+texture2D(tDiffuse,uv-vec2(0.0,dofStep.y)).rgb)*0.25;',
            '  col=mix(col,dofCol,focusBlur*uDOF);',
            '  col += (col-localAvg)*0.16;',
            '  col*=ao;',
            '  vec3 bloom=vec3(0.0);',
            '  vec2 d1=px*2.25;',
            '  vec2 d2=px*5.25;',
            '  bloom += brightSample(uv+vec2( d1.x, 0.0))*1.0;',
            '  bloom += brightSample(uv+vec2(-d1.x, 0.0))*1.0;',
            '  bloom += brightSample(uv+vec2(0.0,  d1.y))*1.0;',
            '  bloom += brightSample(uv+vec2(0.0, -d1.y))*1.0;',
            '  bloom += brightSample(uv+vec2( d2.x, d2.y))*0.55;',
            '  bloom += brightSample(uv+vec2(-d2.x, d2.y))*0.55;',
            '  bloom += brightSample(uv+vec2( d2.x,-d2.y))*0.55;',
            '  bloom += brightSample(uv+vec2(-d2.x,-d2.y))*0.55;',
            '  bloom/=6.2;',
            '  col += bloom*uBloom;',
            '  col *= vec3(1.0+uWarmth*0.75,1.0+uWarmth*0.16,1.0-uWarmth*0.60);',
            '  col = (col-0.5)*uContrast+0.5;',
            '  float g=luma(col);',
            '  col=mix(vec3(g),col,uSaturation);',
            '  col=max(col,vec3(0.0))*uExposure;',
            '  col=col*0.987+vec3(0.013,0.012,0.010);',
            '  float vig=smoothstep(uVignette,0.92,edge);',
            '  col*=mix(1.0,0.92,vig);',
            '  col += (hash(gl_FragCoord.xy+time*17.0)-0.5)/255.0;',
            '  gl_FragColor=vec4(col,1.0);',
            '}'
        ].join('\n')
    });
    _postFXQuad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),_postFXMat);
    _postFXScene.add(_postFXQuad);
}

function _updatePostFXSize(){
    if(!_postFXRT)return;
    R.getDrawingBufferSize(_postFXSize);
    var scale=(window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.postScale)||1;
    var w=Math.max(1,Math.floor(_postFXSize.x*scale));
    var h=Math.max(1,Math.floor(_postFXSize.y*scale));
    if(_postFXRT.width!==w||_postFXRT.height!==h){
        _postFXRT.setSize(w,h);
        _postFXMat.uniforms.resolution.value.set(w,h);
    }
}

function _updatePostFXMood(){
    if(!_postFXMat)return;
    var style=(typeof currentCityStyle==='number')?currentCityStyle:0;
    var m=_postFXMood[style]||_postFXMood[0];
    var u=_postFXMat.uniforms;
    var q=(window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.mode)||'high';
    u.uBloom.value=m.bloom*(q==='low'?0.58:(q==='balanced'?0.82:1));
    u.uSaturation.value=m.sat;
    u.uContrast.value=m.contrast;
    u.uExposure.value=m.exposure;
    u.uVignette.value=m.vignette;
    u.uWarmth.value=m.warm;
    u.uThreshold.value=m.threshold;
    u.uAO.value=q==='low'?0.0:(q==='balanced'?0.085:0.15);
    u.uDOF.value=q==='low'?0.0:(q==='balanced'?0.10:0.22);
    if(typeof playerEgg!=='undefined'&&playerEgg&&playerEgg.mesh){
        var dx=camera.position.x-playerEgg.mesh.position.x,dy=camera.position.y-playerEgg.mesh.position.y,dz=camera.position.z-playerEgg.mesh.position.z;
        var focus=Math.sqrt(dx*dx+dy*dy+dz*dz);
        u.uFocusDistance.value=focus;u.uFocusRange.value=Math.max(18,focus*0.95);
    }
    u.cameraNear.value=camera.near;u.cameraFar.value=camera.far;
}

function _renderCinematicFrame(){
    if(!_postFXEnabled){R.render(scene,camera);return;}
    _initCinematicPostFX();
    if(!_postFXRT||!_postFXMat){R.render(scene,camera);return;}
    _updatePostFXSize();
    _updatePostFXMood();
    _postFXFrame++;
    _postFXMat.uniforms.time.value=performance.now()*0.001;
    R.setRenderTarget(_postFXRT);
    R.render(scene,camera);
    R.setRenderTarget(null);
    _postFXMat.uniforms.tDiffuse.value=_postFXRT.texture;
    _postFXMat.uniforms.tDepth.value=_postFXRT.depthTexture;
    R.render(_postFXScene,_postFXCamera);
}

function _setCinematicPostFXEnabled(v){_postFXEnabled=!!v;}
