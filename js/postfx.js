// postfx.js — DANBO World
// ============================================================
// Three.js r180 cinematic post stack.
// Order follows the r180 color-space contract:
// Render -> GTAO -> Bloom -> Grade -> SMAA -> Output.
// SMAA is intentionally before OutputPass because r180 SMAAPass operates in
// linear-sRGB; OutputPass performs the final ACES + sRGB conversion.
// ============================================================
/* global THREE, R, scene, camera */

var _postFXEnabled=true;
var _postFXComposer=null;
var _postFXGTAO=null,_postFXBloom=null,_postFXGrade=null,_postFXSMAA=null,_postFXOutput=null;
var _postFXLastTime=performance.now();
var _postFXInitFailed=false;
var _postFXSize={w:0,h:0,dpr:0};

var _cinematicGradeShader={
    uniforms:{
        tDiffuse:{value:null},
        time:{value:0},
        vignette:{value:1.05},
        grain:{value:0.055},
        chroma:{value:0.0016},
        saturation:{value:0.86},
        contrast:{value:1.13},
        lift:{value:0.012},
        shadowTint:{value:new THREE.Color(0.12,0.34,0.42)},
        highlightTint:{value:new THREE.Color(1.0,0.72,0.38)},
        splitAmount:{value:0.20}
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
        'uniform float time;',
        'uniform float vignette;',
        'uniform float grain;',
        'uniform float chroma;',
        'uniform float saturation;',
        'uniform float contrast;',
        'uniform float lift;',
        'uniform vec3 shadowTint;',
        'uniform vec3 highlightTint;',
        'uniform float splitAmount;',
        'varying vec2 vUv;',
        'float luma(vec3 c){return dot(c,vec3(0.2126,0.7152,0.0722));}',
        'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}',
        'void main(){',
        '  vec2 radial=vUv-0.5;',
        '  vec2 shift=radial*chroma;',
        '  vec3 center=texture2D(tDiffuse,vUv).rgb;',
        '  vec3 col=vec3(',
        '    texture2D(tDiffuse,vUv+shift).r,',
        '    center.g,',
        '    texture2D(tDiffuse,vUv-shift).b',
        '  );',
        '  float y=luma(col);',
        '  float sw=1.0-smoothstep(0.12,0.58,y);',
        '  float hw=smoothstep(0.46,1.08,y);',
        '  vec3 split=col;',
        '  split=mix(split,split*shadowTint*2.05,sw*splitAmount);',
        '  split=mix(split,split*highlightTint*1.18,hw*splitAmount);',
        '  col=split;',
        '  y=luma(col);',
        '  col=mix(vec3(y),col,saturation);',
        '  col=(col-0.5)*contrast+0.5+lift;',
        '  float edge=length(radial)*1.41421356;',
        '  float vig=smoothstep(0.28,max(0.30,vignette),edge);',
        '  col*=mix(1.0,0.78,vig);',
        '  float n=hash(gl_FragCoord.xy+vec2(time*31.7,time*17.3))-0.5;',
        '  col+=n*grain*0.18;',
        '  gl_FragColor=vec4(max(col,vec3(0.0)),1.0);',
        '}'
    ].join('\n')
};

function _postFXShouldSkipAO(object){
    if(!object||!object.visible)return false;
    if(object.userData&&object.userData.noAO)return true;
    if(object.isSprite||object.isPoints||object.isLine||object.isLine2)return true;
    var mats=Array.isArray(object.material)?object.material:[object.material];
    for(var i=0;i<mats.length;i++){
        var mat=mats[i];if(!mat)continue;
        if(mat.blending===THREE.AdditiveBlending)return true;
        if(mat.transparent&&mat.depthWrite===false)return true;
    }
    return false;
}

function _patchGTAONoAO(pass){
    if(!pass||pass.userData&&pass.userData._danboNoAOPatched)return;
    pass.userData=pass.userData||{};
    pass.userData._danboNoAOPatched=true;
    var original=pass._overrideVisibility.bind(pass);
    pass._overrideVisibility=function(){
        original();
        var cache=this._visibilityCache;
        this.scene.traverse(function(object){
            if(_postFXShouldSkipAO(object)){
                object.visible=false;
                cache.push(object);
            }
        });
    };
}

function _initCinematicPostFX(){
    if(_postFXComposer||_postFXInitFailed||!_postFXEnabled)return;
    var A=window.DANBO_THREE_ADDONS;
    if(!A||!A.EffectComposer||!A.RenderPass||!A.ShaderPass||!A.OutputPass){
        _postFXInitFailed=true;
        console.warn('r180 postprocessing unavailable; direct renderer fallback active');
        return;
    }
    try{
        var target=new THREE.WebGLRenderTarget(1,1,{
            type:THREE.HalfFloatType,
            minFilter:THREE.LinearFilter,
            magFilter:THREE.LinearFilter,
            depthBuffer:true,
            stencilBuffer:false
        });
        target.texture.name='DANBO.CinematicColor';
        _postFXComposer=new A.EffectComposer(R,target);
        _postFXComposer.addPass(new A.RenderPass(scene,camera));

        var q=window.DANBO_VISUAL_QUALITY||{mode:'balanced'};
        var allowGTAO=!!A.GTAOPass&&q.mode!=='low';
        if(allowGTAO){
            var samples=q.high&&!q.realMobile?16:8;
            _postFXGTAO=new A.GTAOPass(
                scene,camera,1,1,{},
                {
                    radius:0.55,
                    distanceExponent:1.0,
                    thickness:1.0,
                    distanceFallOff:1.0,
                    scale:1.0,
                    samples:samples,
                    screenSpaceRadius:false
                },
                {
                    lumaPhi:10,
                    depthPhi:2,
                    normalPhi:3,
                    radius:4,
                    radiusExponent:2,
                    rings:2,
                    samples:samples
                }
            );
            _postFXGTAO.blendIntensity=q.high?0.95:0.72;
            _patchGTAONoAO(_postFXGTAO);
            _postFXComposer.addPass(_postFXGTAO);
        }

        if(A.UnrealBloomPass&&q.mode!=='low'){
            _postFXBloom=new A.UnrealBloomPass(new THREE.Vector2(1,1),0.26,0.55,1.15);
            _postFXBloom.strength=q.high?0.26:0.18;
            _postFXBloom.radius=0.55;
            _postFXBloom.threshold=1.15;
            _postFXComposer.addPass(_postFXBloom);
        }

        _postFXGrade=new A.ShaderPass(_cinematicGradeShader);
        if(q.mode==='low'){
            _postFXGrade.uniforms.grain.value=0.024;
            _postFXGrade.uniforms.chroma.value=0.0006;
            _postFXGrade.uniforms.splitAmount.value=0.12;
        }else if(q.mode==='balanced'){
            _postFXGrade.uniforms.grain.value=0.038;
            _postFXGrade.uniforms.chroma.value=0.0011;
            _postFXGrade.uniforms.splitAmount.value=0.17;
        }
        _postFXComposer.addPass(_postFXGrade);

        // r180's SMAA works in linear-sRGB, therefore it must precede OutputPass.
        if(A.SMAAPass){
            _postFXSMAA=new A.SMAAPass();
            _postFXComposer.addPass(_postFXSMAA);
        }
        _postFXOutput=new A.OutputPass();
        _postFXComposer.addPass(_postFXOutput);
        _resizeCinematicComposer();
        window.DANBO_POSTFX={
            engine:'three-r180',
            chain:['RenderPass'].concat(_postFXGTAO?['GTAOPass']:[]).concat(_postFXBloom?['UnrealBloomPass']:[]).concat(['CinematicGrade']).concat(_postFXSMAA?['SMAAPass']:[]).concat(['OutputPass']),
            gtao:_postFXGTAO,
            bloom:_postFXBloom,
            composer:_postFXComposer
        };
    }catch(err){
        _postFXInitFailed=true;
        console.error('Cinematic postprocessing fallback',err);
        if(_postFXComposer&&_postFXComposer.dispose)_postFXComposer.dispose();
        _postFXComposer=null;
    }
}

function _resizeCinematicComposer(){
    if(!_postFXComposer)return;
    var scale=(window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.postScale)||1;
    var effectiveDpr=Math.max(0.5,(typeof _renderPixelRatio==='number'?_renderPixelRatio:1)*scale);
    if(_postFXSize.w===innerWidth&&_postFXSize.h===innerHeight&&Math.abs(_postFXSize.dpr-effectiveDpr)<0.001)return;
    _postFXSize.w=innerWidth;_postFXSize.h=innerHeight;_postFXSize.dpr=effectiveDpr;
    _postFXComposer.setPixelRatio(effectiveDpr);
    _postFXComposer.setSize(innerWidth,innerHeight);
}

function _renderCinematicFrame(){
    if(!_postFXEnabled){R.render(scene,camera);return;}
    // Let LoadingManager finish HDR/PBR decoding before compiling the expensive
    // GTAO/Bloom/SMAA stack on the main thread.
    if(window.DANBO_RENDER_ASSETS_READY===false){R.render(scene,camera);return;}
    _initCinematicPostFX();
    if(!_postFXComposer){R.render(scene,camera);return;}
    _resizeCinematicComposer();
    var now=performance.now(),dt=Math.min(0.10,Math.max(0.001,(now-_postFXLastTime)/1000));
    _postFXLastTime=now;
    if(_postFXGrade)_postFXGrade.uniforms.time.value=now*0.001;
    _postFXComposer.render(dt);
}

function _setCinematicPostFXEnabled(v){_postFXEnabled=!!v;}
window.addEventListener('resize',_resizeCinematicComposer);
