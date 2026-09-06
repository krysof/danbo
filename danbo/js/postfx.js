// postfx.js — DANBO World / Three.js r180
// Linear cinematic chain: Render → GTAO → Bloom → SMAA → Sharp/Grade/Output.
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
var _postFXAdaptiveReduced=false;
var _postFXWidth=1,_postFXHeight=1,_postFXDpr=1;
var _postFXLastTime=performance.now();
var _postFXMarkFrame=0;

// Presentation is folded into OutputPass: one output conversion, no redundant
// full-screen grade target, no chromatic fringing or animated film grain.
// A bounded 5-tap reconstruction preserves detail when dynamic DPR is active.
function _configurePresentationOutput(pass){
    var uniforms=pass.uniforms;
    uniforms.resolution={value:new THREE.Vector2(1,1)};
    uniforms.sharpness={value:0.18};
    uniforms.saturation={value:1.06};
    uniforms.contrast={value:1.035};
    uniforms.vignette={value:0.32};
    uniforms.lift={value:0.002};
    var source=pass.material.fragmentShader;
    source=source.replace('varying vec2 vUv;',[
        'varying vec2 vUv;',
        'uniform vec2 resolution;',
        'uniform float sharpness, saturation, contrast, vignette, lift;'
    ].join('\n'));
    source=source.replace('gl_FragColor = texture2D( tDiffuse, vUv );',[
        'vec2 texel=1.0/resolution;',
        'vec3 center=texture2D(tDiffuse,vUv).rgb;',
        'vec3 n=texture2D(tDiffuse,vUv+vec2(0.,texel.y)).rgb;',
        'vec3 s=texture2D(tDiffuse,vUv-vec2(0.,texel.y)).rgb;',
        'vec3 e=texture2D(tDiffuse,vUv+vec2(texel.x,0.)).rgb;',
        'vec3 w=texture2D(tDiffuse,vUv-vec2(texel.x,0.)).rgb;',
        'vec3 lo=min(center,min(min(n,s),min(e,w)));',
        'vec3 hi=max(center,max(max(n,s),max(e,w)));',
        'vec3 color=clamp(center+(center-(n+s+e+w)*0.25)*sharpness,lo,hi);',
        // Exposure-relative contrast retains shadow detail rather than subtracting
        // a large constant from linear HDR blacks, as the old grade did.
        'color=max(vec3(0.),(color-0.18)*contrast+0.18+lift);',
        'float y=dot(color,vec3(0.2126,0.7152,0.0722));',
        'color=mix(vec3(y),color,saturation);',
        'float edge=smoothstep(0.35,0.78,length(vUv-0.5));',
        'color*=1.0-edge*vignette*0.16;',
        'gl_FragColor=vec4(max(vec3(0.),color),1.);'
    ].join('\n'));
    pass.material.fragmentShader=source;
    pass.material.needsUpdate=true;
    return {uniforms:uniforms,mergedIntoOutput:true};
}

function _markNoAOEffects(){
    // Scene-wide traversal is only a safety net for newly-added effects; doing
    // it every 45 rendered frames caused a regular hitch on large cities.
    if(++_postFXMarkFrame%300!==1)return;
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
    var initialViewport=typeof _danboRenderViewport==='function'?_danboRenderViewport():{width:innerWidth,height:innerHeight};
    _postFXGTAO=new GTAOPass(scene,camera,initialViewport.width,initialViewport.height);
    _postFXGTAO.updateGtaoMaterial({
        radius:0.55,
        distanceExponent:1.0,
        thickness:1.0,
        scale:1.0,
        samples:16,
        screenSpaceRadius:false
    });
    _postFXGTAO.updatePdMaterial({
        lumaPhi:10,
        depthPhi:2,
        normalPhi:3,
        radius:4,
        radiusExponent:2,
        rings:2,
        samples:16
    });
    _postFXGTAO.blendIntensity=0.95;
    _postFXBloom=new UnrealBloomPass(new THREE.Vector2(initialViewport.width,initialViewport.height),0.18,0.42,1.30);
    _postFXBloom.strength=0.18;
    _postFXBloom.radius=0.42;
    _postFXBloom.threshold=1.30;
    _postFXOutput=new OutputPass();
    _postFXGrade=_configurePresentationOutput(_postFXOutput);
    var initialPostScale=(window.DANBO_VISUAL_QUALITY&&Number(DANBO_VISUAL_QUALITY.postScale))||1;
    _postFXSMAA=new SMAAPass(initialViewport.width*_renderPixelRatio*initialPostScale,initialViewport.height*_renderPixelRatio*initialPostScale);

    _postFXComposer.addPass(_postFXRenderPass);
    _postFXComposer.addPass(_postFXGTAO);
    _postFXComposer.addPass(_postFXBloom);
    _postFXComposer.addPass(_postFXSMAA);
    _postFXComposer.addPass(_postFXOutput);

    var quality=(window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.mode)||'high';
    var mobileQuality=!!(window.DANBO_RENDER_PERF&&DANBO_RENDER_PERF.mobile);
    _postFXGTAO.enabled=quality!=='low'&&!_postFXAdaptiveReduced;
    if(mobileQuality&&quality!=='low'&&quality!=='high'){
        _postFXGTAO.updateGtaoMaterial({samples:4});
        _postFXGTAO.updatePdMaterial({rings:2,samples:4,radius:2});
        _postFXBloom.strength=0.11;
    }else if(quality==='balanced'){
        _postFXGTAO.updateGtaoMaterial({samples:6});
        _postFXGTAO.updatePdMaterial({rings:2,samples:6,radius:3});
        _postFXBloom.strength=0.14;
    }else if(quality==='low'){
        _postFXBloom.strength=0.09;
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
        chain:'Render → GTAO → Bloom → SMAA → Sharp/Grade/Output'
    };
}

function _setAdaptivePostFXReduction(reduced){
    _postFXAdaptiveReduced=!!reduced;
    if(_postFXGTAO){
        var quality=(window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.mode)||'balanced';
        _postFXGTAO.enabled=quality!=='low'&&!_postFXAdaptiveReduced;
    }
}

function _updatePostFXSize(force){
    if(!_postFXComposer)return;
    var viewport=typeof _danboRenderViewport==='function'?_danboRenderViewport():{width:innerWidth,height:innerHeight};
    var width=viewport.width,height=viewport.height;
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
    // Bloom is a broad glow, not image detail: do not spend the main scene's
    // native pixel budget on its blur pyramid.
    if(_postFXBloom)_postFXBloom.setSize(Math.max(1,Math.round(width*dpr*0.5)),Math.max(1,Math.round(height*dpr*0.5)));
    _postFXGrade.uniforms.resolution.value.set(width*dpr,height*dpr);
    _postFXGrade.uniforms.sharpness.value=dpr<0.95?0.32:0.16;
}

function _renderCinematicFrame(){
    if(typeof _visualWaterTime!=='undefined')_visualWaterTime.value=performance.now()*0.001;
    if(typeof _updateCharacterRenderDetail==='function')_updateCharacterRenderDetail();
    if(!_postFXEnabled){R.render(scene,camera);return;}
    _initCinematicPostFX();
    if(!_postFXComposer){R.render(scene,camera);return;}
    _markNoAOEffects();
    _updatePostFXSize(false);
    var now=performance.now(),delta=Math.min(0.1,(now-_postFXLastTime)/1000);
    _postFXLastTime=now;
    _postFXComposer.render(delta);
}

function _setCinematicPostFXEnabled(value){_postFXEnabled=!!value;}
