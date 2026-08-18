// postfx.js — DANBO World / Three.js r180
// Linear cinematic chain: Render → GTAO → Bloom → Grade → SMAA → Output.
// Keep tone mapping / sRGB conversion last: SMAA operates in linear-sRGB and
// grading an already encoded image was the main cause of the milky grey look.
/* global THREE, R, scene, camera, EffectComposer, RenderPass, GTAOPass,
          UnrealBloomPass, OutputPass, ShaderPass, SMAAPass */

var _postFXEnabled=true;
var _postFXComposer=null;
var _postFXRenderPass=null;
var _postFXGTAO=null;
var _postFXBloom=null;
var _postFXOutput=null;
var _postFXGrade=null;
var _postFXSMAA=null;
var _postFXWidth=1,_postFXHeight=1,_postFXDpr=1;
var _postFXLastTime=performance.now();
var _postFXMarkFrame=0;

var _cinematicGradeShader={
    name:'DANBO_CinematicGrade',
    uniforms:{
        tDiffuse:{value:null},
        time:{value:0},
        resolution:{value:new THREE.Vector2(1,1)},
        vignette:{value:1.05},
        grain:{value:0.040},
        chroma:{value:0.00045},
        saturation:{value:1.08},
        // Grade runs before OutputPass in linear space, so use a low contrast
        // offset to retain mobile shadow detail instead of crushing near-black.
        contrast:{value:1.10},
        lift:{value:0.004},
        shadowColor:{value:new THREE.Color(0.42,0.52,0.60)},
        highlightColor:{value:new THREE.Color(1.0,0.88,0.70)},
        splitAmount:{value:0.06}
    },
    vertexShader:[
        'varying vec2 vUv;',
        'void main(){',
        '  vUv=uv;',
        '  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);',
        '}'
    ].join('\n'),
    fragmentShader:[
        'precision highp float;',
        'uniform sampler2D tDiffuse;',
        'uniform float time;',
        'uniform vec2 resolution;',
        'uniform float vignette;',
        'uniform float grain;',
        'uniform float chroma;',
        'uniform float saturation;',
        'uniform float contrast;',
        'uniform float lift;',
        'uniform vec3 shadowColor;',
        'uniform vec3 highlightColor;',
        'uniform float splitAmount;',
        'varying vec2 vUv;',
        'float luma(vec3 c){return dot(c,vec3(0.2126,0.7152,0.0722));}',
        'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}',
        'void main(){',
        '  vec2 fromCenter=vUv-0.5;',
        '  vec2 chromaOffset=normalize(fromCenter+vec2(1e-5))*chroma;',
        '  float r=texture2D(tDiffuse,vUv+chromaOffset).r;',
        '  float g=texture2D(tDiffuse,vUv).g;',
        '  float b=texture2D(tDiffuse,vUv-chromaOffset).b;',
        '  vec3 color=vec3(r,g,b);',
        '  float y=luma(color);',
        '  float shadowWeight=1.0-smoothstep(0.18,0.58,y);',
        '  float highlightWeight=smoothstep(0.48,0.92,y);',
        '  color=mix(color,color*shadowColor*2.0,shadowWeight*splitAmount);',
        '  color=mix(color,color*highlightColor,highlightWeight*splitAmount);',
        '  color=(color-0.5)*contrast+0.5+lift;',
        '  color=mix(vec3(luma(color)),color,saturation);',
        // OutputPass owns the single ACES shoulder. Applying another shoulder here
        // compressed most of the scene into the same pale mid/high-light band.
        '  float edge=smoothstep(0.28,0.78,length(fromCenter)*1.4142);',
        '  color*=1.0-edge*0.16*vignette;',
        '  float noise=hash(gl_FragCoord.xy+vec2(time*71.0,time*37.0))-0.5;',
        '  color+=noise*grain/8.0;',
        '  gl_FragColor=vec4(max(color,vec3(0.0)),1.0);',
        '}'
    ].join('\n')
};

function _markNoAOEffects(){
    if(++_postFXMarkFrame%45!==1)return;
    scene.traverse(function(object){
        if(!object||!object.material)return;
        var materials=Array.isArray(object.material)?object.material:[object.material];
        var emissiveOnly=object.isSprite||materials.some(function(material){
            return material&&(material.blending===THREE.AdditiveBlending||material.userData&&material.userData.noAO);
        });
        if(emissiveOnly)object.userData.noAO=true;
    });
}

function _initCinematicPostFX(){
    if(_postFXComposer||typeof EffectComposer!=='function')return;
    var target=new THREE.WebGLRenderTarget(1,1,{
        type:THREE.HalfFloatType,
        minFilter:THREE.LinearFilter,
        magFilter:THREE.LinearFilter,
        depthBuffer:true,
        stencilBuffer:false
    });
    _postFXComposer=new EffectComposer(R,target);
    _postFXRenderPass=new RenderPass(scene,camera);
    _postFXGTAO=new GTAOPass(scene,camera,innerWidth,innerHeight);
    _postFXGTAO.updateGtaoMaterial({
        radius:0.55,
        distanceExponent:1.0,
        thickness:1.0,
        scale:1.0,
        samples:8,
        screenSpaceRadius:false
    });
    _postFXGTAO.updatePdMaterial({
        lumaPhi:10,
        depthPhi:2,
        normalPhi:3,
        radius:4,
        radiusExponent:2,
        rings:2,
        samples:8
    });
    _postFXGTAO.blendIntensity=0.95;
    _postFXBloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),0.18,0.42,1.30);
    _postFXBloom.strength=0.18;
    _postFXBloom.radius=0.42;
    _postFXBloom.threshold=1.30;
    _postFXOutput=new OutputPass();
    _postFXGrade=new ShaderPass(_cinematicGradeShader);
    var initialPostScale=(window.DANBO_VISUAL_QUALITY&&Number(DANBO_VISUAL_QUALITY.postScale))||1;
    _postFXSMAA=new SMAAPass(innerWidth*_renderPixelRatio*initialPostScale,innerHeight*_renderPixelRatio*initialPostScale);

    _postFXComposer.addPass(_postFXRenderPass);
    _postFXComposer.addPass(_postFXGTAO);
    _postFXComposer.addPass(_postFXBloom);
    _postFXComposer.addPass(_postFXGrade);
    _postFXComposer.addPass(_postFXSMAA);
    _postFXComposer.addPass(_postFXOutput);

    var quality=(window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.mode)||'high';
    var mobileQuality=!!(window.DANBO_RENDER_PERF&&DANBO_RENDER_PERF.mobile);
    _postFXGTAO.enabled=quality!=='low';
    if(mobileQuality&&quality!=='low'){
        _postFXGTAO.updateGtaoMaterial({samples:4});
        _postFXGTAO.updatePdMaterial({rings:2,samples:4,radius:2});
        _postFXBloom.strength=quality==='high'?0.14:0.11;
    }else if(quality==='balanced'){
        _postFXGTAO.updateGtaoMaterial({samples:6});
        _postFXGTAO.updatePdMaterial({rings:2,samples:6,radius:3});
        _postFXBloom.strength=0.14;
    }else if(quality==='low'){
        _postFXBloom.strength=0.09;
        _postFXGrade.uniforms.grain.value=0.025;
        // Low mode uses Lambert/toon fallbacks without HDR reflections. Preserve
        // their shadow readability while keeping the deeper authored albedo.
        _postFXGrade.uniforms.contrast.value=1.04;
        _postFXGrade.uniforms.lift.value=0.018;
        _postFXGrade.uniforms.saturation.value=1.05;
        _postFXGrade.uniforms.vignette.value=0.82;
    }
    _updatePostFXSize(true);
    window.DANBO_POSTFX={
        composer:_postFXComposer,
        renderPass:_postFXRenderPass,
        gtaoPass:_postFXGTAO,
        bloomPass:_postFXBloom,
        outputPass:_postFXOutput,
        gradePass:_postFXGrade,
        smaaPass:_postFXSMAA,
        chain:'Render → GTAO → Bloom → Grade → SMAA → Output'
    };
}

function _updatePostFXSize(force){
    if(!_postFXComposer)return;
    var width=Math.max(1,innerWidth),height=Math.max(1,innerHeight);
    var qualityScale=(window.DANBO_VISUAL_QUALITY&&Number(DANBO_VISUAL_QUALITY.postScale))||1;
    var dpr=Math.max(0.5,(_renderPixelRatio||1)*qualityScale);
    if(!force&&width===_postFXWidth&&height===_postFXHeight&&dpr===_postFXDpr)return;
    _postFXWidth=width;_postFXHeight=height;_postFXDpr=dpr;
    _postFXComposer.setPixelRatio(dpr);
    _postFXComposer.setSize(width,height);
    // GTAO is spatially smooth and denoised, so calculate it below the main
    // cinematic buffer resolution. The final combine remains full resolution.
    if(_postFXGTAO){
        var aoScale=(window.DANBO_VISUAL_QUALITY&&Number(DANBO_VISUAL_QUALITY.aoScale))||0.72;
        _postFXGTAO.setSize(Math.max(1,Math.round(width*dpr*aoScale)),Math.max(1,Math.round(height*dpr*aoScale)));
    }
    _postFXGrade.uniforms.resolution.value.set(width*dpr,height*dpr);
}

function _renderCinematicFrame(){
    if(!_postFXEnabled){R.render(scene,camera);return;}
    _initCinematicPostFX();
    if(!_postFXComposer){R.render(scene,camera);return;}
    _markNoAOEffects();
    _updatePostFXSize(false);
    var now=performance.now(),delta=Math.min(0.1,(now-_postFXLastTime)/1000);
    _postFXLastTime=now;
    _postFXGrade.uniforms.time.value=now*0.001;
    _postFXComposer.render(delta);
}

function _setCinematicPostFXEnabled(value){_postFXEnabled=!!value;}
