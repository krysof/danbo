// audio.js — DANBO World
// ---- Audio System (procedural, no files needed) ----
let audioCtx=null, soundEnabled=true, sfxEnabled=true, _audioUnlocked=false;
function _danboPluginBusyForAudio(){
    return !!(window._danboPluginTransition||(window.DANBO_PLUGIN_HOST&&window.DANBO_PLUGIN_HOST.getActive&&window.DANBO_PLUGIN_HOST.getActive()));
}
// iOS 17+ audio session hint
try{if(navigator.audioSession)navigator.audioSession.type='transient';}catch(e){}
// Pause/resume audio when tab loses/gains focus
document.addEventListener('visibilitychange',function(){
    if(document.hidden){
        if(audioCtx&&audioCtx.state==='running')audioCtx.suspend();
    } else {
        if(audioCtx&&audioCtx.state==='suspended'&&soundEnabled){
            // Mute SFX briefly, stop all BGM before resume to prevent overlap
            window._sfxMuted=true;
            stopBGM();stopSelectBGM();stopTitleBGM();if(typeof stopRaceBGM==='function')stopRaceBGM();
            setTimeout(function(){
                if(audioCtx)audioCtx.resume();
                // Restart appropriate BGM after resume
                setTimeout(function(){
                    if(!_danboPluginBusyForAudio())window._sfxMuted=false;
                    if(gameState==='city'&&!_danboPluginBusyForAudio())startBGM();
                    else if(gameState==='menu')startTitleBGM();
                    else if(gameState==='select')startSelectBGM();
                },500);
            },300);
        }
    }
});
function ensureAudio(){
    if(!audioCtx){
        var AC=window.AudioContext||window.webkitAudioContext;
        if(AC)audioCtx=new AC();
    }
    if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume();
    return audioCtx;
}
// Silent HTML audio element trick — helps unlock on iOS Safari
var _silentAudio=null;
function _playSilentHtml(){
    if(_silentAudio)return;
    try{
        _silentAudio=document.createElement('audio');
        _silentAudio.setAttribute('playsinline','');
        _silentAudio.setAttribute('webkit-playsinline','');
        // Tiny silent WAV data URI
        _silentAudio.src='data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
        _silentAudio.volume=0.01;
        _silentAudio.play().catch(function(){});
    }catch(e){}
}
// Mobile audio unlock — aggressive multi-strategy approach
function _unlockAudio(){
    if(_audioUnlocked&&audioCtx&&audioCtx.state==='running')return;
    // Strategy 1: silent HTML audio element (iOS needs this)
    _playSilentHtml();
    // Strategy 2: create AudioContext inside gesture
    if(!audioCtx){
        var AC=window.AudioContext||window.webkitAudioContext;
        if(AC)audioCtx=new AC();
    }
    if(!audioCtx)return;
    // Strategy 3: resume + silent buffer
    audioCtx.resume();
    try{
        var b=audioCtx.createBuffer(1,1,audioCtx.sampleRate||22050);
        var s=audioCtx.createBufferSource();s.buffer=b;s.connect(audioCtx.destination);s.start(0);
    }catch(e){}
    if(audioCtx.state==='running')_audioUnlocked=true;
    // Strategy 4: check again after a tick
    setTimeout(function(){
        if(audioCtx&&audioCtx.state==='running')_audioUnlocked=true;
        else if(audioCtx)audioCtx.resume();
        // Start title BGM once audio is unlocked and we're on start screen
        if(_audioUnlocked&&!titleBgmPlaying&&gameState==='menu'){
            var ss=document.getElementById('start-screen');
            if(ss&&ss.classList.contains('active'))startTitleBGM();
        }
    },100);
}
// Keep retrying on every touch/click/key until unlocked
document.addEventListener('touchstart',_unlockAudio,{passive:true});
document.addEventListener('touchend',_unlockAudio,{passive:true});
document.addEventListener('click',_unlockAudio);
document.addEventListener('pointerdown',_unlockAudio,{passive:true});
document.addEventListener('keydown',_unlockAudio);

// Music toggle button
var musicBtn=document.getElementById("music-btn");
if(musicBtn) musicBtn.addEventListener("click",function(){
    soundEnabled=!soundEnabled;
    musicBtn.textContent=soundEnabled?"🎵":"🚫";
    musicBtn.classList.toggle("muted",!soundEnabled);
    if(!soundEnabled){stopBGM();stopRaceBGM();stopSelectBGM();stopTitleBGM();}
    else if(gameState==="city"&&!_danboPluginBusyForAudio()) startBGM();
    else if(gameState==="racing"||gameState==="raceIntro") startRaceBGM(currentRaceIndex);
});
// SFX toggle button
var sfxBtn=document.getElementById("sfx-btn");
if(sfxBtn) sfxBtn.addEventListener("click",function(){
    sfxEnabled=!sfxEnabled;
    sfxBtn.textContent=sfxEnabled?"🔊":"🔇";
    sfxBtn.classList.toggle("muted",!sfxEnabled);
});

// Language toggle button — dropdown menu
var _langOrder=['auto','zhs','zht','ja','en'];
var _langLabels={auto:'Auto',zhs:'\u7B80\u4F53\u4E2D\u6587',zht:'\u7E41\u9AD4\u4E2D\u6587',ja:'\u65E5\u672C\u8A9E',en:'English'};
var _langShort={auto:'',zhs:'\u7B80',zht:'\u7E41',ja:'JP',en:'EN'};
var _autoLabels={zhs:'\u81EA\u52A8',zht:'\u81EA\u52D5',ja:'\u81EA\u52D5',en:'Auto'};
var langBtn=document.getElementById("lang-btn");
var _langMenuOpen=false, _langMenu=null;
function _getLangBtnText(){
    if(_langMode==='auto')return '\uD83C\uDF10'+(_autoLabels[_langCode]||'Auto');
    return '\uD83C\uDF10'+(_langShort[_langMode]||'');
}
function _closeLangMenu(){
    if(_langMenu&&_langMenu.parentNode){_langMenu.parentNode.removeChild(_langMenu);}
    _langMenu=null;_langMenuOpen=false;
}
function _openLangMenu(){
    if(_langMenuOpen){_closeLangMenu();return;}
    _langMenuOpen=true;
    _langMenu=document.createElement('div');
    _langMenu.style.cssText='position:absolute;top:100%;right:0;margin-top:4px;background:rgba(0,0,0,0.85);border:2px solid rgba(255,255,255,0.3);border-radius:10px;padding:4px 0;min-width:130px;backdrop-filter:blur(8px);z-index:99;';
    for(var li=0;li<_langOrder.length;li++){
        (function(code){
            var item=document.createElement('div');
            var isActive=(code===_langMode);
            var label=_langLabels[code];
            if(code==='auto')label=(_autoLabels[_langCode]||'Auto')+' ('+_langLabels[_autoLangCode]+')';
            item.textContent=(isActive?'\u2714 ':'\u2003 ')+label;
            item.style.cssText='padding:7px 14px;color:#fff;font-size:14px;cursor:pointer;white-space:nowrap;'+(isActive?'background:rgba(255,255,255,0.15);':'');
            item.addEventListener('mouseenter',function(){item.style.background='rgba(255,255,255,0.2)';});
            item.addEventListener('mouseleave',function(){item.style.background=isActive?'rgba(255,255,255,0.15)':'';});
            item.addEventListener('click',function(e){
                e.stopPropagation();
                _langMode=code;
                if(_langMode==='auto'){_langCode=_autoLangCode;}
                else{_langCode=_langMode;}
                try{localStorage.setItem('danbo_lang',_langMode);}catch(e2){}
                _applyLang();
                _closeLangMenu();
            });
            _langMenu.appendChild(item);
        })(_langOrder[li]);
    }
    langBtn.style.position='relative';
    langBtn.appendChild(_langMenu);
    // Close on outside click
    setTimeout(function(){
        document.addEventListener('click',_langMenuOutsideClick,{once:true});
    },0);
}
function _langMenuOutsideClick(e){
    if(_langMenu&&!_langMenu.contains(e.target)&&e.target!==langBtn){_closeLangMenu();}
    else if(_langMenuOpen){setTimeout(function(){document.addEventListener('click',_langMenuOutsideClick,{once:true});},0);}
}
function _applyLang(){
    // Re-localize arrays
    for(var i=0;i<CHARACTERS.length;i++){CHARACTERS[i].name=I18N.charNames[_langCode][i]||CHARACTERS[i].name;}
    for(var i=0;i<CITY_STYLES.length;i++){CITY_STYLES[i].name=I18N.cityNames[_langCode][i]||CITY_STYLES[i].name;}
    for(var i=0;i<RACES.length;i++){RACES[i].name=I18N.raceNames[_langCode][i]||RACES[i].name;RACES[i].desc=I18N.raceDescs[_langCode][i]||RACES[i].desc;}
    // Re-localize HTML
    document.documentElement.lang=_langCode==='zhs'?'zh-CN':_langCode==='zht'?'zh-TW':_langCode==='ja'?'ja':'en';
    document.title=L('title');
    var h1=document.querySelector('#start-screen h1');if(h1)h1.textContent=L('title');
    var sub=document.querySelector('.subtitle');if(sub)sub.textContent=L('subtitle');
    var ver=document.querySelector('.version-text');if(ver)ver.textContent=L('version');
    var slo=document.querySelector('.slogan-text');if(slo)slo.textContent=L('slogan');
    var sb=document.getElementById('start-btn');if(sb)sb.textContent=L('startBtn');
    var st=document.querySelector('.select-title');if(st)st.textContent=L('selectTitle');
    var cb=document.getElementById('confirm-btn');if(cb)cb.textContent=L('confirmBtn');
    var py=document.getElementById('portal-yes');if(py)py.textContent=L('portalYes');
    var pn=document.getElementById('portal-no');if(pn)pn.textContent=L('portalNo');
    var mb=document.getElementById('music-btn');if(mb)mb.title=L('music');
    var sb2=document.getElementById('sfx-btn');if(sb2)sb2.title=L('sfx');
    var pills=document.querySelectorAll('#city-hud .hud-pill');
    if(pills.length>=3)pills[2].textContent=L('grabThrow');
    var zh=document.getElementById('zoom-hud');if(zh)zh.textContent=L('zoomHint');
    var rb=document.getElementById('race-back-btn');if(rb)rb.textContent=L('raceBack');
    var bc=document.getElementById('back-city-btn');if(bc)bc.textContent=L('backCity');
    var rt=document.getElementById('result-title');if(rt)rt.textContent=L('resultDone');
    var gb=document.getElementById('grab-btn');if(gb)gb.textContent=L('grab');
    var jb=document.getElementById('jump-btn');if(jb)jb.textContent=L('jump');
    var pb=document.getElementById('punch-btn');if(pb)pb.textContent=L('punch');
    var kb=document.getElementById('kick-btn');if(kb)kb.textContent=L('kick');
    var cn=document.getElementById('city-name-hud');if(cn)cn.textContent=CITY_STYLES[currentCityStyle].name;
    var pn2=document.getElementById('sf2-char-name');if(pn2&&CHARACTERS[selectedChar])pn2.textContent=CHARACTERS[selectedChar].name;
    if(langBtn)langBtn.textContent=_getLangBtnText();
    // Update struggle bar text
    var stText=document.getElementById('struggle-text');if(stText)stText.textContent=L('struggle');
    // Update chat placeholder
    var chatF=document.getElementById('chat-field');if(chatF)chatF.placeholder=L('chatPlaceholder');
    // Rebuild warp pipe signs with new city names
    if(typeof buildWarpPipes==='function'&&typeof cityGroup!=='undefined'&&gameState==='city'){buildWarpPipes();}
    // Update portal names/descs to match new language
    if(typeof portals!=='undefined'){
        for(var pi2=0;pi2<portals.length;pi2++){
            var _pr=portals[pi2];
            if(_pr.raceIndex>=0&&_pr.raceIndex<RACES.length){
                _pr.name=RACES[_pr.raceIndex].name;
                _pr.desc=RACES[_pr.raceIndex].desc;
            }else if(_pr._i18nName||_pr._i18nDesc){
                if(_pr._i18nName)_pr.name=_pr._i18nName[_langCode]||_pr._i18nName.en||_pr._i18nName.zhs||_pr.name;
                if(_pr._i18nDesc)_pr.desc=_pr._i18nDesc[_langCode]||_pr._i18nDesc.en||_pr._i18nDesc.zhs||_pr.desc;
            }
        }
    }
    // Portal signs are canvas textures - rebuild them would need full portal rebuild
    // Just update the portal object names (prompt text uses these)
    // Rebuild move name translations from MOVE_PARAMS
    if(typeof _moveNames!=='undefined'&&typeof MOVE_PARAMS!=='undefined'){
        for(var _mk in _moveNames)delete _moveNames[_mk];
        for(var _ct2 in MOVE_PARAMS){for(var _mk2 in MOVE_PARAMS[_ct2]){var _m2=MOVE_PARAMS[_ct2][_mk2];if(_m2&&_m2.shout&&_m2.text)_moveNames[_m2.shout]=_m2.text;}}
    }
    // Update select grid cell labels
    var _cells=document.querySelectorAll('.char-cell .char-label');
    for(var ci2=0;ci2<_cells.length&&ci2<CHARACTERS.length;ci2++){_cells[ci2].textContent=CHARACTERS[ci2].name;}
    // Update SF2 select if visible
    if(typeof _updateSF2Select==='function'&&typeof selectedChar!=='undefined'){_updateSF2Select(selectedChar);}
}
if(langBtn){
    langBtn.textContent=_getLangBtnText();
    langBtn.addEventListener("click",function(e){
        e.stopPropagation();
        _openLangMenu();
    });
}

// Background music — cheerful multi-layer procedural BGM
let bgmPlaying=false, bgmGain=null, bgmNodes=[], _bgmTimer=null;
function startBGM(){
    if(bgmPlaying||!soundEnabled)return;
    const ctx=ensureAudio(); bgmPlaying=true;
    if(ctx.state==='suspended'){ctx.resume().then(function(){if(bgmPlaying){if(currentCityStyle===5)_playMoonBGMLoop(ctx);else _playBGMLoop(ctx);}});return;}
    if(currentCityStyle===5)_playMoonBGMLoop(ctx);else _playBGMLoop(ctx);
}
function _playBGMLoop(ctx){
    // Dispatch to per-city BGM
    if(currentCityStyle===1)return _playDesertBGM(ctx);
    if(currentCityStyle===2)return _playIceBGM(ctx);
    if(currentCityStyle===3)return _playLavaBGM(ctx);
    if(currentCityStyle===4)return _playCandyBGM(ctx);
    if(currentCityStyle===6)return _playSakuraBGM(ctx);
    if(currentCityStyle===7)return _playSnowBGM(ctx);
    return _playDefaultBGM(ctx);
}
// Helper: generic looping BGM engine
// mels: array of melody arrays (e.g. [melA, melB, melC, melD])
function _bgmEngine(ctx,mels,chords,noteLen,vol,leadType,bassVol,padType){
    bgmGain=ctx.createGain();bgmGain.gain.value=vol||0.15;bgmGain.connect(ctx.destination);
    var loopCount=0;
    function playLoop(){
        if(!bgmPlaying)return;
        var now=ctx.currentTime;var mel=mels[loopCount%mels.length];loopCount++;
        for(var i=0;i<mel.length;i++){
            var o=ctx.createOscillator();var g=ctx.createGain();
            o.type=leadType||'triangle';o.frequency.setValueAtTime(mel[i],now+i*noteLen);
            o.frequency.exponentialRampToValueAtTime(mel[i]*1.01,now+i*noteLen+noteLen*0.3);
            o.frequency.exponentialRampToValueAtTime(mel[i],now+i*noteLen+noteLen*0.8);
            g.gain.setValueAtTime(0,now+i*noteLen);g.gain.linearRampToValueAtTime(0.14,now+i*noteLen+0.02);
            g.gain.setValueAtTime(0.12,now+i*noteLen+noteLen*0.5);g.gain.exponentialRampToValueAtTime(0.005,now+i*noteLen+noteLen*0.95);
            o.connect(g);g.connect(bgmGain);o.start(now+i*noteLen);o.stop(now+i*noteLen+noteLen);bgmNodes.push(o);
            if(i%2===0){var h=ctx.createOscillator();var hg=ctx.createGain();h.type='sine';h.frequency.value=mel[i]*1.25;
                hg.gain.setValueAtTime(0.04,now+i*noteLen);hg.gain.exponentialRampToValueAtTime(0.003,now+i*noteLen+noteLen*1.8);
                h.connect(hg);hg.connect(bgmGain);h.start(now+i*noteLen);h.stop(now+i*noteLen+noteLen*2);bgmNodes.push(h);}
            if(i%4===0){var ci=Math.floor(i/4)%chords.length;
                for(var cn=0;cn<chords[ci].length;cn++){var co=ctx.createOscillator();var cg=ctx.createGain();
                    co.type=padType||'sine';co.frequency.value=chords[ci][cn];cg.gain.setValueAtTime(0.035,now+i*noteLen);
                    cg.gain.exponentialRampToValueAtTime(0.005,now+i*noteLen+noteLen*3.8);co.connect(cg);cg.connect(bgmGain);
                    co.start(now+i*noteLen);co.stop(now+i*noteLen+noteLen*4);bgmNodes.push(co);}
                var bo=ctx.createOscillator();var bg2=ctx.createGain();bo.type='sine';bo.frequency.value=chords[ci][0]*0.5;
                bg2.gain.setValueAtTime(bassVol||0.1,now+i*noteLen);bg2.gain.exponentialRampToValueAtTime(0.008,now+i*noteLen+noteLen*3.8);
                bo.connect(bg2);bg2.connect(bgmGain);bo.start(now+i*noteLen);bo.stop(now+i*noteLen+noteLen*4);bgmNodes.push(bo);}
            if(i%4===0){var kb=ctx.createBuffer(1,Math.floor(ctx.sampleRate*0.08),ctx.sampleRate);var kd=kb.getChannelData(0);
                for(var s=0;s<kd.length;s++){var p=s/kd.length;kd[s]=Math.sin(p*Math.PI*8*(1-p*0.8))*0.4*Math.exp(-p*6);}
                var ks=ctx.createBufferSource();var kg=ctx.createGain();kg.gain.value=0.12;ks.buffer=kb;ks.connect(kg);kg.connect(bgmGain);
                ks.start(now+i*noteLen);ks.stop(now+i*noteLen+0.08);bgmNodes.push(ks);}
            if(i%2===1){var hb=ctx.createBuffer(1,Math.floor(ctx.sampleRate*0.03),ctx.sampleRate);var hd=hb.getChannelData(0);
                for(var s2=0;s2<hd.length;s2++)hd[s2]=(Math.random()-0.5)*0.15*Math.exp(-s2/(hd.length*0.1));
                var hs=ctx.createBufferSource();var hg2=ctx.createGain();hg2.gain.value=0.06;hs.buffer=hb;hs.connect(hg2);hg2.connect(bgmGain);
                hs.start(now+i*noteLen);hs.stop(now+i*noteLen+0.03);bgmNodes.push(hs);}
        }
        _bgmTimer=setTimeout(playLoop,mel.length*noteLen*1000);
    }
    playLoop();
}
// City 0: Default — cheerful C major
function _playDefaultBGM(ctx){
    var chords=[[262,330,392],[220,262,330],[175,220,262],[196,247,294],[262,330,392],[220,262,330],[175,220,262],[196,247,330]];
    var melA=[784,880,784,659,698,784,880,988,784,659,523,587,659,784,880,784,
              880,988,880,784,659,698,784,880,784,659,587,523,587,659,784,880,
              988,880,784,659,523,587,659,784,880,988,1047,988,880,784,659,587,523,659];
    var melB=[659,698,784,880,784,698,659,587,523,587,659,523,440,494,523,659,
              784,698,659,587,523,587,659,784,880,784,698,659,587,523,494,523,
              587,659,784,880,784,659,523,440,494,523,587,659,784,880,784,698];
    var melC=[523,587,659,784,880,988,880,784,659,587,523,494,523,587,659,784,
              988,880,784,659,587,659,784,880,988,1047,988,880,784,659,587,659,
              784,880,988,880,784,659,523,587,659,784,880,784,659,523,494,523];
    var melD=[880,784,659,523,587,659,784,880,784,698,659,587,523,440,494,523,
              659,784,880,784,659,587,523,587,659,784,880,988,880,784,698,784,
              880,988,1047,988,880,784,659,587,523,587,659,784,880,988,880,784];
    _bgmEngine(ctx,[melA,melB,melC,melD],chords,0.18,0.15,'triangle');
}
// City 1: Desert — Arabic/mysterious Phrygian mode, slower
function _playDesertBGM(ctx){
    var chords=[[220,277,330],[208,262,311],[196,247,294],[220,277,349]];
    var melA=[660,622,587,554,587,622,660,698,660,622,554,523,494,523,554,587,
              622,660,698,740,698,660,622,587,554,523,554,587,622,660,698,660];
    var melB=[698,660,622,587,554,523,554,587,622,660,698,740,698,660,622,587,
              554,523,494,523,554,587,622,660,622,587,554,523,494,466,494,523];
    var melC=[587,554,523,494,523,554,587,622,660,698,740,698,660,622,587,554,
              523,554,587,622,660,698,660,622,587,554,523,554,587,622,660,698];
    var melD=[740,698,660,622,587,554,523,494,523,554,587,622,660,698,740,784,
              740,698,660,622,587,622,660,698,660,622,587,554,523,494,523,554];
    _bgmEngine(ctx,[melA,melB,melC,melD],chords,0.24,0.13,'sawtooth',0.08);
}
// City 2: Ice — gentle, crystalline, high register
function _playIceBGM(ctx){
    var chords=[[330,415,494],[294,370,440],[262,330,392],[294,370,494]];
    var melA=[988,880,784,880,988,1047,988,880,784,698,784,880,988,1047,1175,988,
              1175,1047,988,880,784,880,988,1047,1175,1319,1175,1047,988,880,784,880,
              988,1047,1175,1047,988,880,784,698];
    var melB=[784,880,988,880,784,698,659,698,784,880,784,698,659,587,659,784,
              880,988,1047,988,880,784,698,784,880,988,880,784,698,659,698,784,
              880,988,1047,1175,1047,988,880,784];
    var melC=[1175,1047,988,880,988,1047,1175,1319,1175,1047,988,880,784,880,988,1047,
              988,880,784,698,659,698,784,880,988,1047,1175,1047,988,880,784,698,
              659,698,784,880,988,1047,988,880];
    var melD=[659,698,784,880,988,1047,988,880,784,698,784,880,988,1175,1319,1175,
              1047,988,880,784,880,988,1047,988,880,784,698,659,587,659,698,784,
              880,988,1047,1175,1319,1175,1047,988];
    _bgmEngine(ctx,[melA,melB,melC,melD],chords,0.20,0.12,'sine',0.06,'sine');
}
// City 3: Lava — heavy, dark, minor key with distorted bass
function _playLavaBGM(ctx){
    var chords=[[147,175,220],[131,165,196],[147,175,220],[165,196,247]];
    var melA=[440,415,392,349,330,349,392,440,494,440,392,349,330,294,330,349,
              392,440,494,523,494,440,392,349,330,294,262,294,330,349,392,440,
              494,523,587,523,494,440];
    var melB=[494,440,392,440,494,523,494,440,392,349,330,294,262,294,330,392,
              440,494,523,494,440,392,349,330,294,330,349,392,440,494,440,392,
              349,330,294,330,349,392];
    var melC=[330,349,392,440,494,523,587,523,494,440,392,349,330,294,262,247,
              262,294,330,349,392,440,494,440,392,349,330,349,392,440,494,523,
              587,523,494,440,392,349];
    var melD=[523,494,440,392,349,330,294,330,349,392,440,494,523,587,523,494,
              440,392,349,330,294,262,294,330,349,392,440,415,392,349,330,349,
              392,440,494,523,494,440];
    _bgmEngine(ctx,[melA,melB,melC,melD],chords,0.22,0.14,'sawtooth',0.13);
}
// City 4: Candy — bouncy, playful, major pentatonic
function _playCandyBGM(ctx){
    var chords=[[330,415,523],[294,370,440],[349,440,523],[392,494,587]];
    var melA=[523,587,659,784,659,587,523,659,784,880,784,659,523,587,659,784,
              880,988,880,784,659,587,523,587,659,784,880,784,659,523,587,659,
              784,880,988,1047,988,880,784,659,523,587,659,784,880,988,880,784];
    var melB=[880,784,659,587,523,587,659,784,880,988,880,784,659,587,523,659,
              784,880,988,1047,988,880,784,659,587,523,587,659,784,880,784,659,
              523,587,659,784,880,784,659,523,587,659,784,880,988,1047,988,880];
    var melC=[659,784,880,988,880,784,659,523,587,659,784,880,988,1047,988,880,
              784,659,523,587,659,784,880,784,659,587,523,587,659,784,880,988,
              1047,988,880,784,659,523,587,659,784,880,988,880,784,659,587,523];
    var melD=[1047,988,880,784,659,587,523,587,659,784,880,988,880,784,659,523,
              587,659,784,880,784,659,523,587,659,784,880,988,1047,988,880,784,
              659,587,523,587,659,784,880,988,1047,988,880,784,659,523,587,659];
    _bgmEngine(ctx,[melA,melB,melC,melD],chords,0.16,0.14,'triangle',0.08);
}
// City 6: Sakura — gentle Japanese pentatonic (C,D,E,G,A), slow and serene
function _playSakuraBGM(ctx){
    // Miyako-bushi scale (都節音階): C=262,Db=277,F=349,G=392,Ab=415
    // Extended with octave: C5=523,Db5=554,F5=698,G5=784,Ab5=831
    var chords=[[262,349,392],[277,349,415],[262,392,523],[349,415,523],[277,392,554],[262,349,523]];
    var melA=[523,415,392,349,277,262,277,349, 392,415,523,554,523,415,392,349,
              262,277,349,392,415,523,415,392, 349,277,262,349,392,415,523,554,
              698,523,415,392,349,277,349,392];
    var melB=[554,523,415,392,349,277,262,277, 349,392,415,523,554,698,554,523,
              415,392,349,262,277,349,392,415, 523,554,523,415,392,349,277,262,
              277,349,392,415,523,554,698,784];
    var melC=[392,349,277,262,277,349,392,415, 523,554,698,554,523,415,392,349,
              277,262,277,349,392,415,523,554, 523,415,392,349,277,262,349,392,
              415,523,554,698,554,523,415,392];
    var melD=[698,554,523,415,392,349,277,262, 277,349,392,415,523,554,698,784,
              698,554,523,415,392,349,277,349, 392,415,523,554,698,554,523,415,
              392,349,277,262,277,349,392,415];
    var melE=[262,349,392,523,415,392,349,277, 262,277,349,392,415,523,554,523,
              415,392,349,277,262,349,392,415, 523,554,698,554,523,415,392,349,
              277,262,277,349,392,415,523,554];
    var melF=[784,698,554,523,415,392,349,277, 262,277,349,392,415,523,554,698,
              784,698,554,523,415,392,349,277, 349,392,415,523,554,523,415,392,
              349,277,262,277,349,392,415,523];
    _bgmEngine(ctx,[melA,melB,melC,melD,melE,melF],chords,0.28,0.1,'triangle',0.05,'sine');
}
function _playSnowBGM(ctx){
    // 雪の華 (Yuki no Hana) — B major, slow ballad tempo
    // B3=247 C#4=277 D#4=311 E4=330 F#4=370 G#4=415 A#4=466
    // B4=494 C#5=554 D#5=622 E5=659 F#5=740 G#5=831
    var B3=247,Cs=277,Ds=311,E=330,Fs=370,Gs=415,As=466;
    var B=494,C5=554,D5=622,E5=659,F5=740,G5=831;
    // Chords: B-E-F#-G#m-E-F# (classic J-ballad progression)
    var chords=[[B3,Ds,Fs],[E,Gs,B],[Fs,As,C5],[Gs,B,D5],[E,Gs,B],[Fs,As,C5]];
    // Verse 1 (降り始めた雪は...) — gentle stepping melody
    var melA=[Fs,Fs,E,Fs,Gs,Fs,E,Ds, E,E,Ds,E,Fs,E,Ds,Cs,
              Ds,Ds,E,Fs,Gs,Gs,Fs,E, Fs,Fs,E,Ds,Cs,Ds,E,Fs,
              E,Ds,Cs,B3,Cs,Ds,E,Fs];
    // Verse 2 (舞い落ちてきた...) — slight variation
    var melB=[Gs,Gs,Fs,Gs,B,Gs,Fs,E, Fs,Fs,E,Fs,Gs,Fs,E,Ds,
              E,Fs,Gs,B,B,Gs,Fs,E, Ds,E,Fs,Gs,Fs,E,Ds,Cs,
              Ds,E,Fs,E,Ds,Cs,B3,Cs];
    // Pre-chorus (この街に降る...) — building tension, rising
    var melC=[B3,Cs,Ds,E,Fs,Gs,Fs,E, Ds,E,Fs,Gs,B,B,Gs,Fs,
              E,Fs,Gs,B,C5,B,Gs,Fs, E,Fs,Gs,B,C5,D5,C5,B,
              Gs,Fs,E,Fs,Gs,B,C5,D5];
    // Chorus A (今年 最初の雪の華を...) — emotional peak
    var melD=[E5,E5,C5,B,C5,B,C5,B, Gs,Gs,B,E5,E5,D5,C5,B,
              C5,D5,E5,D5,C5,B,Gs,Fs, E,Fs,Gs,B,C5,B,Gs,Fs,
              E,Ds,E,Fs,Gs,B,C5,D5];
    // Chorus B (二人なら...) — tender descending
    var melE=[E5,D5,C5,B,C5,D5,E5,F5, E5,D5,C5,B,Gs,Fs,Gs,B,
              C5,D5,C5,B,Gs,Fs,E,Fs, Gs,B,C5,B,Gs,Fs,E,Ds,
              Cs,Ds,E,Fs,Gs,Fs,E,Ds];
    // Bridge (舞い上がれ...) — soaring
    var melF=[B,C5,D5,E5,F5,E5,D5,C5, B,C5,D5,E5,F5,G5,F5,E5,
              D5,C5,B,Gs,Fs,Gs,B,C5, D5,E5,D5,C5,B,Gs,Fs,E,
              Fs,Gs,B,C5,D5,C5,B,Gs];
    // Outro verse (降り始めた雪は repeat) — gentle ending
    var melG=[Fs,Fs,E,Fs,Gs,Fs,E,Ds, E,Fs,Gs,B,B,Gs,Fs,E,
              Ds,E,Fs,E,Ds,Cs,B3,Cs, Ds,E,Fs,Gs,Fs,E,Ds,Cs,
              B3,Cs,Ds,E,Fs,E,Ds,B3];
    // Final chorus echo — fading
    var melH=[E5,D5,C5,B,Gs,Fs,Gs,B, C5,B,Gs,Fs,E,Ds,E,Fs,
              Gs,Fs,E,Ds,Cs,Ds,E,Fs, Gs,B,Gs,Fs,E,Ds,Cs,B3,
              Cs,Ds,E,Ds,Cs,B3,Cs,Ds];
    _bgmEngine(ctx,[melA,melB,melC,melD,melE,melF,melG,melH],chords,0.32,0.07,'sine',0.035,'sine');
}
function stopBGM(){bgmPlaying=false;if(_bgmTimer){clearTimeout(_bgmTimer);_bgmTimer=null;}bgmNodes.forEach(function(n){try{n.stop();}catch(e){}});bgmNodes=[];if(bgmGain){bgmGain.gain.value=0;bgmGain=null;}}

// Moon battle BGM — epic orchestral war theme (procedural)
function _playMoonBGMLoop(ctx){
    bgmGain=ctx.createGain();bgmGain.gain.value=0.13;bgmGain.connect(ctx.destination);
    // Dm-Bb-Gm-A progression (dark, dramatic)
    var chords=[[293.66,349.23,440],[233.08,293.66,349.23],[196,233.08,293.66],[220,277.18,329.63]];
    // Melody: minor scale heroic motif — 4 patterns x 36 notes
    var melA=[587.33,523.25,493.88,440,493.88,523.25,587.33,659.25,587.33,523.25,440,349.23,392,440,493.88,523.25,
              587.33,659.25,783.99,659.25,587.33,523.25,493.88,440,392,440,493.88,523.25,587.33,659.25,587.33,523.25,
              493.88,440,392,440];
    var melB=[659.25,587.33,523.25,587.33,659.25,783.99,659.25,587.33,523.25,493.88,440,392,440,493.88,523.25,587.33,
              783.99,659.25,587.33,523.25,493.88,523.25,587.33,659.25,783.99,880,783.99,659.25,587.33,523.25,493.88,523.25,
              587.33,659.25,783.99,659.25];
    var melC=[440,493.88,523.25,587.33,659.25,783.99,880,783.99,659.25,587.33,523.25,493.88,440,392,349.23,392,
              440,493.88,523.25,587.33,523.25,493.88,440,392,440,493.88,523.25,587.33,659.25,783.99,659.25,587.33,
              523.25,493.88,440,493.88];
    var melD=[783.99,880,783.99,659.25,587.33,523.25,587.33,659.25,783.99,880,987.77,880,783.99,659.25,587.33,523.25,
              493.88,440,392,440,493.88,523.25,587.33,659.25,587.33,523.25,493.88,440,392,349.23,392,440,
              493.88,523.25,587.33,659.25];
    var mels=[melA,melB,melC,melD];
    var loopN=0;
    function playLoop(){
        if(!bgmPlaying)return;
        var now=ctx.currentTime;var mel=mels[loopN%mels.length];var noteLen=0.22;loopN++;
        for(var i=0;i<mel.length;i++){
            // Lead — brass-like sawtooth
            var o=ctx.createOscillator();o.type='sawtooth';o.frequency.value=mel[i];
            var g=ctx.createGain();g.gain.setValueAtTime(0.08,now+i*noteLen);
            g.gain.exponentialRampToValueAtTime(0.005,now+i*noteLen+noteLen*0.9);
            o.connect(g);g.connect(bgmGain);o.start(now+i*noteLen);o.stop(now+i*noteLen+noteLen);bgmNodes.push(o);
            // War drums — heavy kick every 2 notes, snare on off-beats
            if(i%2===0){
                var kb=ctx.createBuffer(1,ctx.sampleRate*0.1,ctx.sampleRate);var kd=kb.getChannelData(0);
                for(var s=0;s<kd.length;s++){var p=s/kd.length;kd[s]=Math.sin(p*Math.PI*6*(1-p*0.9))*0.6*Math.exp(-p*4);}
                var ks=ctx.createBufferSource();var kg=ctx.createGain();kg.gain.value=0.2;
                ks.buffer=kb;ks.connect(kg);kg.connect(bgmGain);ks.start(now+i*noteLen);ks.stop(now+i*noteLen+0.1);bgmNodes.push(ks);
            }
            if(i%4===2){
                var sb=ctx.createBuffer(1,ctx.sampleRate*0.05,ctx.sampleRate);var sd=sb.getChannelData(0);
                for(var s2=0;s2<sd.length;s2++)sd[s2]=(Math.random()-0.5)*0.3*Math.exp(-s2/(sd.length*0.15));
                var ss=ctx.createBufferSource();var sg=ctx.createGain();sg.gain.value=0.15;
                ss.buffer=sb;ss.connect(sg);sg.connect(bgmGain);ss.start(now+i*noteLen);ss.stop(now+i*noteLen+0.05);bgmNodes.push(ss);
            }
            // Chord pads — deep strings
            if(i%4===0){
                var ci=Math.floor(i/4)%chords.length;
                for(var cn=0;cn<chords[ci].length;cn++){
                    var co=ctx.createOscillator();co.type='triangle';co.frequency.value=chords[ci][cn]*0.5;
                    var cg=ctx.createGain();cg.gain.setValueAtTime(0.04,now+i*noteLen);
                    cg.gain.exponentialRampToValueAtTime(0.003,now+i*noteLen+noteLen*3.8);
                    co.connect(cg);cg.connect(bgmGain);co.start(now+i*noteLen);co.stop(now+i*noteLen+noteLen*4);bgmNodes.push(co);
                }
            }
            // Bass — octave below chord root
            if(i%4===0){
                var bi=Math.floor(i/4)%chords.length;
                var bo=ctx.createOscillator();bo.type='sawtooth';bo.frequency.value=chords[bi][0]*0.25;
                var bg2=ctx.createGain();bg2.gain.setValueAtTime(0.1,now+i*noteLen);
                bg2.gain.exponentialRampToValueAtTime(0.008,now+i*noteLen+noteLen*3.8);
                bo.connect(bg2);bg2.connect(bgmGain);bo.start(now+i*noteLen);bo.stop(now+i*noteLen+noteLen*4);bgmNodes.push(bo);
            }
        }
        _bgmTimer=setTimeout(playLoop,mel.length*noteLen*1000);
    }
    playLoop();
}

// Select screen BGM — intense fighting game style
let selectBgmPlaying=false, selectBgmGain=null, selectBgmNodes=[], selectBgmTimer=null;
function startSelectBGM(){
    if(selectBgmPlaying||!soundEnabled)return;
    stopBGM(); // stop main BGM
    var ctx=ensureAudio();
    if(ctx.state==='suspended'){ctx.resume().then(function(){if(!selectBgmPlaying){selectBgmPlaying=true;_selectLoop(ctx);}});selectBgmPlaying=true;return;}
    selectBgmPlaying=true; _selectLoop(ctx);
}
function _selectLoop(ctx){
    selectBgmGain=ctx.createGain();selectBgmGain.gain.value=0.14;selectBgmGain.connect(ctx.destination);
    // Dramatic minor key progression: Am-F-C-G with driving rhythm
    var chords=[[220,262,330],[175,220,262],[262,330,392],[196,247,294],[220,262,330],[175,220,262],[262,330,392],[233,294,349]];
    var melA=[660,660,784,880,784,660,587,523,660,784,880,988,880,784,660,784,
              880,988,880,784,660,587,523,587,660,784,880,784,660,587,523,660,
              784,880,988,880,784,660,587,523,587,660,784,880,988,1047,988,880,784,660,523,587];
    var melB=[880,784,660,587,660,784,880,784,523,587,660,523,440,523,587,660,
              784,880,988,880,784,660,587,660,784,880,988,1047,988,880,784,660,
              587,523,440,523,587,660,784,880,784,660,587,523,440,523,587,660,784,880];
    var melC=[523,587,660,784,880,988,880,784,660,587,523,440,523,587,660,784,
              988,880,784,660,587,523,587,660,784,880,784,660,587,523,440,523,
              660,784,880,988,1047,988,880,784,660,587,523,587,660,784,880,988,880,784];
    var melD=[988,1047,988,880,784,660,587,660,784,880,988,880,784,660,523,587,
              660,784,880,784,660,587,523,440,523,587,660,784,880,988,1047,988,
              880,784,660,587,523,587,660,784,880,988,1047,988,880,784,660,523,587,660];
    var mels=[melA,melB,melC,melD];
    var noteLen=0.15;
    var loopN=0;
    function doLoop(){
        if(!selectBgmPlaying)return;
        var now=ctx.currentTime;
        var mel=mels[loopN%mels.length];loopN++;
        for(var i=0;i<mel.length;i++){
            // Lead — aggressive square wave
            var o=ctx.createOscillator();var g=ctx.createGain();
            o.type='square';o.frequency.setValueAtTime(mel[i],now+i*noteLen);
            o.frequency.exponentialRampToValueAtTime(mel[i]*0.98,now+i*noteLen+noteLen*0.7);
            g.gain.setValueAtTime(0.1,now+i*noteLen);g.gain.linearRampToValueAtTime(0.08,now+i*noteLen+noteLen*0.3);
            g.gain.exponentialRampToValueAtTime(0.005,now+i*noteLen+noteLen*0.9);
            o.connect(g);g.connect(selectBgmGain);o.start(now+i*noteLen);o.stop(now+i*noteLen+noteLen);
            selectBgmNodes.push(o);
            // Sub octave power
            if(i%2===0){var o2=ctx.createOscillator();var g2=ctx.createGain();
            o2.type='sawtooth';o2.frequency.value=mel[i]*0.5;
            g2.gain.setValueAtTime(0.05,now+i*noteLen);g2.gain.exponentialRampToValueAtTime(0.003,now+i*noteLen+noteLen*1.5);
            o2.connect(g2);g2.connect(selectBgmGain);o2.start(now+i*noteLen);o2.stop(now+i*noteLen+noteLen*1.5);
            selectBgmNodes.push(o2);}
            // Chords every 4 notes
            if(i%4===0){var ci=Math.floor(i/4)%chords.length;
            for(var cn=0;cn<chords[ci].length;cn++){var co=ctx.createOscillator();var cg=ctx.createGain();
            co.type='triangle';co.frequency.value=chords[ci][cn];
            cg.gain.setValueAtTime(0.04,now+i*noteLen);cg.gain.exponentialRampToValueAtTime(0.004,now+i*noteLen+noteLen*3.8);
            co.connect(cg);cg.connect(selectBgmGain);co.start(now+i*noteLen);co.stop(now+i*noteLen+noteLen*4);
            selectBgmNodes.push(co);}}
            // Heavy bass
            if(i%4===0){var ci2=Math.floor(i/4)%chords.length;
            var bo=ctx.createOscillator();var bg2=ctx.createGain();
            bo.type='sawtooth';bo.frequency.value=chords[ci2][0]*0.25;
            bg2.gain.setValueAtTime(0.12,now+i*noteLen);bg2.gain.exponentialRampToValueAtTime(0.008,now+i*noteLen+noteLen*3.5);
            bo.connect(bg2);bg2.connect(selectBgmGain);bo.start(now+i*noteLen);bo.stop(now+i*noteLen+noteLen*4);
            selectBgmNodes.push(bo);}
            // Driving kick every 2 beats
            if(i%2===0){var kb=ctx.createBuffer(1,Math.floor(ctx.sampleRate*0.08),ctx.sampleRate);
            var kd=kb.getChannelData(0);
            for(var s=0;s<kd.length;s++){var p=s/kd.length;kd[s]=Math.sin(p*Math.PI*12*(1-p*0.7))*0.5*Math.exp(-p*5);}
            var ks=ctx.createBufferSource();var kg=ctx.createGain();kg.gain.value=0.15;
            ks.buffer=kb;ks.connect(kg);kg.connect(selectBgmGain);ks.start(now+i*noteLen);ks.stop(now+i*noteLen+0.08);
            selectBgmNodes.push(ks);}
            // Snare on off-beats
            if(i%4===2){var sb=ctx.createBuffer(1,Math.floor(ctx.sampleRate*0.06),ctx.sampleRate);
            var sd=sb.getChannelData(0);
            for(var s2=0;s2<sd.length;s2++) sd[s2]=(Math.random()-0.5)*0.4*Math.exp(-s2/(sd.length*0.15));
            var ss=ctx.createBufferSource();var sg=ctx.createGain();sg.gain.value=0.12;
            ss.buffer=sb;ss.connect(sg);sg.connect(selectBgmGain);ss.start(now+i*noteLen);ss.stop(now+i*noteLen+0.06);
            selectBgmNodes.push(ss);}
            // Hi-hat
            if(i%2===1){var hb=ctx.createBuffer(1,Math.floor(ctx.sampleRate*0.025),ctx.sampleRate);
            var hd=hb.getChannelData(0);
            for(var s3=0;s3<hd.length;s3++) hd[s3]=(Math.random()-0.5)*0.2*Math.exp(-s3/(hd.length*0.08));
            var hs=ctx.createBufferSource();var hg=ctx.createGain();hg.gain.value=0.08;
            hs.buffer=hb;hs.connect(hg);hg.connect(selectBgmGain);hs.start(now+i*noteLen);hs.stop(now+i*noteLen+0.025);
            selectBgmNodes.push(hs);}
        }
        selectBgmTimer=setTimeout(doLoop,mel.length*noteLen*1000);
    }
    doLoop();
}
function stopSelectBGM(){selectBgmPlaying=false;if(selectBgmTimer){clearTimeout(selectBgmTimer);selectBgmTimer=null;}selectBgmNodes.forEach(function(n){try{n.stop();}catch(e){}});selectBgmNodes=[];if(selectBgmGain){selectBgmGain.gain.value=0;selectBgmGain=null;}}

// ============================================================
// Title screen BGM — SF2-style dramatic opening (heavy drums, brass stabs, rising melody)
// ============================================================
var titleBgmPlaying=false, titleBgmGain=null, titleBgmNodes=[], titleBgmTimer=null;
function startTitleBGM(){
    if(titleBgmPlaying||!soundEnabled)return;
    var ctx=ensureAudio();
    if(!ctx)return;
    if(ctx.state==='suspended'){ctx.resume().then(function(){if(!titleBgmPlaying){titleBgmPlaying=true;_titleLoop(ctx);}});titleBgmPlaying=true;return;}
    titleBgmPlaying=true;_titleLoop(ctx);
}
function _titleLoop(ctx){
    titleBgmGain=ctx.createGain();titleBgmGain.gain.value=0.16;titleBgmGain.connect(ctx.destination);
    // Cm-Ab-Eb-Bb-Cm-Fm-G-Cm — dramatic minor key, martial feel
    var chords=[
        [261.63,311.13,392],[207.65,261.63,311.13],[311.13,392,466.16],[233.08,293.66,349.23],
        [261.63,311.13,392],[174.61,220,261.63],[196,246.94,293.66],[261.63,311.13,392]
    ];
    // Heroic brass melody — rising motif with dramatic pauses
    var melA=[523.25,0,523.25,587.33,659.25,0,784,784,659.25,587.33,523.25,0,466.16,523.25,587.33,659.25,
              784,0,784,880,784,659.25,587.33,0,523.25,587.33,659.25,784,880,0,784,659.25,
              587.33,0,523.25,466.16,523.25,587.33,659.25,784];
    var melB=[784,0,880,784,659.25,0,587.33,523.25,587.33,659.25,784,0,880,988,880,784,
              659.25,0,587.33,523.25,466.16,0,523.25,587.33,659.25,784,880,0,988,880,784,659.25,
              587.33,659.25,784,0,880,988,880,784];
    var melC=[988,0,880,784,659.25,587.33,659.25,0,784,880,988,0,1047,988,880,784,
              659.25,0,587.33,523.25,466.16,523.25,587.33,0,659.25,784,880,784,659.25,0,587.33,523.25,
              466.16,523.25,587.33,659.25,784,0,880,988];
    var melD=[523.25,587.33,659.25,0,784,880,988,1047,988,0,880,784,659.25,587.33,523.25,0,
              466.16,523.25,587.33,659.25,784,0,880,988,1047,0,988,880,784,659.25,587.33,523.25,
              659.25,784,880,0,988,1047,988,880];
    var mels=[melA,melB,melC,melD];
    var noteLen=0.2;
    var loopN=0;
    function doLoop(){
        if(!titleBgmPlaying)return;
        var now=ctx.currentTime;
        var mel=mels[loopN%mels.length];loopN++;
        for(var i=0;i<mel.length;i++){
            // Brass lead — sawtooth with attack
            if(mel[i]>0){
                var o=ctx.createOscillator();var g=ctx.createGain();
                o.type='sawtooth';o.frequency.setValueAtTime(mel[i],now+i*noteLen);
                o.frequency.exponentialRampToValueAtTime(mel[i]*0.99,now+i*noteLen+noteLen*0.8);
                g.gain.setValueAtTime(0,now+i*noteLen);
                g.gain.linearRampToValueAtTime(0.12,now+i*noteLen+0.02);
                g.gain.setValueAtTime(0.1,now+i*noteLen+noteLen*0.4);
                g.gain.exponentialRampToValueAtTime(0.005,now+i*noteLen+noteLen*0.95);
                o.connect(g);g.connect(titleBgmGain);o.start(now+i*noteLen);o.stop(now+i*noteLen+noteLen);
                titleBgmNodes.push(o);
                // Octave doubling for power
                var o2=ctx.createOscillator();var g2=ctx.createGain();
                o2.type='square';o2.frequency.value=mel[i]*0.5;
                g2.gain.setValueAtTime(0.04,now+i*noteLen);
                g2.gain.exponentialRampToValueAtTime(0.003,now+i*noteLen+noteLen*0.9);
                o2.connect(g2);g2.connect(titleBgmGain);o2.start(now+i*noteLen);o2.stop(now+i*noteLen+noteLen);
                titleBgmNodes.push(o2);
            }
            // Chord stabs — every 4 notes, brass-like
            if(i%4===0){
                var ci=Math.floor(i/4)%chords.length;
                for(var cn=0;cn<chords[ci].length;cn++){
                    var co=ctx.createOscillator();var cg=ctx.createGain();
                    co.type='sawtooth';co.frequency.value=chords[ci][cn]*0.5;
                    cg.gain.setValueAtTime(0,now+i*noteLen);
                    cg.gain.linearRampToValueAtTime(0.06,now+i*noteLen+0.01);
                    cg.gain.exponentialRampToValueAtTime(0.004,now+i*noteLen+noteLen*3.5);
                    co.connect(cg);cg.connect(titleBgmGain);co.start(now+i*noteLen);co.stop(now+i*noteLen+noteLen*4);
                    titleBgmNodes.push(co);
                }
            }
            // Heavy taiko-style kick drum — every 2 notes
            if(i%2===0){
                var kb=ctx.createBuffer(1,Math.floor(ctx.sampleRate*0.15),ctx.sampleRate);
                var kd=kb.getChannelData(0);
                for(var s=0;s<kd.length;s++){var p=s/kd.length;kd[s]=Math.sin(p*Math.PI*5*(1-p*0.9))*0.7*Math.exp(-p*3.5);}
                var ks=ctx.createBufferSource();var kg=ctx.createGain();kg.gain.value=0.22;
                ks.buffer=kb;ks.connect(kg);kg.connect(titleBgmGain);ks.start(now+i*noteLen);ks.stop(now+i*noteLen+0.15);
                titleBgmNodes.push(ks);
            }
            // Snare crack on beats 2 and 4 (every 4 notes, offset by 2)
            if(i%4===2){
                var sb2=ctx.createBuffer(1,Math.floor(ctx.sampleRate*0.07),ctx.sampleRate);
                var sd=sb2.getChannelData(0);
                for(var s2=0;s2<sd.length;s2++)sd[s2]=(Math.random()-0.5)*0.5*Math.exp(-s2/(sd.length*0.12));
                var ss=ctx.createBufferSource();var sg=ctx.createGain();sg.gain.value=0.18;
                ss.buffer=sb2;ss.connect(sg);sg.connect(titleBgmGain);ss.start(now+i*noteLen);ss.stop(now+i*noteLen+0.07);
                titleBgmNodes.push(ss);
            }
            // Deep bass — root of chord, sub-bass
            if(i%4===0){
                var bi=Math.floor(i/4)%chords.length;
                var bo=ctx.createOscillator();var bg2=ctx.createGain();
                bo.type='sine';bo.frequency.value=chords[bi][0]*0.25;
                bg2.gain.setValueAtTime(0.14,now+i*noteLen);
                bg2.gain.exponentialRampToValueAtTime(0.008,now+i*noteLen+noteLen*3.8);
                bo.connect(bg2);bg2.connect(titleBgmGain);bo.start(now+i*noteLen);bo.stop(now+i*noteLen+noteLen*4);
                titleBgmNodes.push(bo);
            }
            // Cymbal crash on loop start
            if(i===0){
                var cb2=ctx.createBuffer(1,Math.floor(ctx.sampleRate*0.3),ctx.sampleRate);
                var cd=cb2.getChannelData(0);
                for(var s3=0;s3<cd.length;s3++)cd[s3]=(Math.random()-0.5)*0.3*Math.exp(-s3/(cd.length*0.25));
                var cs=ctx.createBufferSource();var csg=ctx.createGain();csg.gain.value=0.1;
                cs.buffer=cb2;cs.connect(csg);csg.connect(titleBgmGain);cs.start(now);cs.stop(now+0.3);
                titleBgmNodes.push(cs);
            }
        }
        titleBgmTimer=setTimeout(doLoop,mel.length*noteLen*1000);
    }
    doLoop();
}
function stopTitleBGM(){titleBgmPlaying=false;if(titleBgmTimer){clearTimeout(titleBgmTimer);titleBgmTimer=null;}titleBgmNodes.forEach(function(n){try{n.stop();}catch(e){}});titleBgmNodes=[];if(titleBgmGain){titleBgmGain.gain.value=0;titleBgmGain=null;}}

// ============================================================
// Race BGM — 3 styles for 12 levels
// ============================================================
var raceBgmPlaying=false, raceBgmGain=null, raceBgmNodes=[], raceBgmTimer=null;
function stopRaceBGM(){raceBgmPlaying=false;if(raceBgmTimer){clearTimeout(raceBgmTimer);raceBgmTimer=null;}raceBgmNodes.forEach(function(n){try{n.stop();}catch(e){}});raceBgmNodes=[];if(raceBgmGain){raceBgmGain.gain.value=0;raceBgmGain=null;}}
function startRaceBGM(ri){
    if(raceBgmPlaying||!soundEnabled)return;
    stopBGM();stopSelectBGM();
    var ctx=ensureAudio();raceBgmPlaying=true;
    if(ctx.state==='suspended'){ctx.resume().then(function(){if(raceBgmPlaying)_raceBgmLoop(ctx,ri);});return;}
    _raceBgmLoop(ctx,ri);
}
function _raceBgmLoop(ctx,ri){
    raceBgmGain=ctx.createGain();raceBgmGain.gain.value=0.15;raceBgmGain.connect(ctx.destination);
    var style=(ri<4)?0:(ri<8)?1:2;
    // Style 0: Original — energetic obstacle course (Dm-Bb-C-A)
    var chords0=[[294,349,440],[233,294,349],[262,330,392],[220,277,330],[294,349,440],[262,330,392],[233,294,349],[247,311,370]];
    var mel0A=[587,659,698,784,698,659,587,523,587,659,784,880,784,698,587,659,
               698,784,880,784,698,587,523,587,659,698,784,880,988,880,784,698,
               659,587,523,587,659,698,784,880,784,698,587,523,494,523,587,659];
    var mel0B=[523,587,659,587,523,440,494,523,587,698,784,698,587,523,494,587,
               659,698,784,698,587,523,440,494,523,587,659,784,698,659,587,523,
               587,659,698,784,880,784,698,587,523,494,523,587,659,698,784,880];
    var mel0C=[784,880,784,698,659,587,659,698,784,880,988,880,784,698,587,659,
               523,587,659,698,784,698,659,587,523,440,494,523,587,659,698,784,
               880,988,880,784,698,659,587,523,587,659,698,784,880,784,698,587];
    var mel0D=[880,988,880,784,698,659,587,659,698,784,880,784,698,587,523,587,
               659,698,784,880,784,698,587,523,494,523,587,659,698,784,880,784,
               698,659,587,659,698,784,880,988,880,784,698,587,523,587,659,698];
    // Style 1: Sonic — fast, driving, major key (E-A-B-C#m)
    var chords1=[[330,415,494],[220,277,330],[247,311,370],[277,330,415],[330,415,494],[247,311,370],[220,277,330],[294,370,440]];
    var mel1A=[988,880,784,880,988,1047,988,784,659,784,880,988,1047,988,880,784,
               880,988,1047,1175,1047,988,880,784,659,784,880,988,1047,988,880,784,
               988,1047,1175,1047,988,880,784,659,784,880,988,1047,1175,1319,1175,1047,
               988,880,784,880,988,1047,988,880,784,659,784,880];
    var mel1B=[659,784,880,784,659,587,659,784,880,988,1047,1175,1047,988,880,988,
               784,880,988,880,784,659,587,659,784,880,988,1047,1175,1047,988,880,
               784,659,784,880,988,1047,988,880,784,659,587,659,784,880,988,1047,
               1175,1047,988,880,784,659,587,784,880,988,1047,988];
    var mel1C=[1047,988,880,784,880,988,1047,1175,1047,988,880,784,659,784,880,988,
               880,784,659,587,659,784,880,988,1047,1175,1319,1175,1047,988,880,784,
               880,988,1047,1175,1047,988,880,784,659,784,880,988,1047,988,880,784,
               659,587,659,784,880,988,1047,1175,1047,988,880,784];
    var mel1D=[1175,1047,988,880,784,880,988,1047,988,880,784,659,784,880,988,1047,
               1175,1047,988,880,784,659,587,659,784,880,988,1047,988,880,784,880,
               988,1047,1175,1319,1175,1047,988,880,784,659,784,880,988,1047,1175,1047,
               988,880,784,659,587,659,784,880,988,1047,988,880];
    // Style 2: Mario — bouncy, staccato, C major (C-F-G-Am)
    var chords2=[[262,330,392],[175,220,262],[196,247,294],[220,262,330],[262,330,392],[196,247,294],[175,220,262],[233,294,349]];
    var mel2A=[784,784,0,784,0,659,784,0,988,0,0,0,494,0,0,0,
               784,0,880,0,784,0,659,523,0,587,659,0,587,0,523,0,
               784,0,784,988,0,784,0,659,523,0,587,0,659,784,0,988,880,0,784,0,659,0];
    var mel2B=[784,0,659,0,523,0,440,494,0,440,0,392,0,0,0,0,
               659,0,659,0,659,0,523,659,0,784,0,0,440,0,0,0,
               523,0,587,0,659,0,784,0,880,784,0,659,0,523,440,0,494,523,0,587,659,0];
    var mel2C=[988,0,988,0,988,0,880,988,0,1047,0,784,0,0,659,0,
               784,0,659,0,523,0,440,0,494,523,0,587,659,0,784,0,
               880,0,784,0,659,523,0,587,659,0,784,880,0,784,0,659,523,0,440,494,523,0];
    var mel2D=[880,0,784,0,659,0,784,0,880,988,0,880,0,784,659,0,
               523,0,587,0,659,784,0,659,0,523,0,440,494,0,523,0,
               659,784,0,880,0,784,659,0,523,587,0,659,784,0,880,988,0,880,784,0,659,0];
    var chords,mels,noteLen,waveType,bassType,melVol,bassVol,tempo;
    if(style===0){chords=chords0;mels=[mel0A,mel0B,mel0C,mel0D];noteLen=0.16;waveType='triangle';bassType='sine';melVol=0.13;bassVol=0.09;tempo=1;}
    else if(style===1){chords=chords1;mels=[mel1A,mel1B,mel1C,mel1D];noteLen=0.13;waveType='sawtooth';bassType='square';melVol=0.10;bassVol=0.10;tempo=1;}
    else{chords=chords2;mels=[mel2A,mel2B,mel2C,mel2D];noteLen=0.15;waveType='square';bassType='triangle';melVol=0.11;bassVol=0.08;tempo=1;}
    var loopN=0;
    function doLoop(){
        if(!raceBgmPlaying)return;
        var now=ctx.currentTime;
        var mel=mels[loopN%mels.length];loopN++;
        for(var i=0;i<mel.length;i++){
            // Melody
            if(mel[i]>0){
                var o=ctx.createOscillator();var g=ctx.createGain();
                o.type=waveType;o.frequency.setValueAtTime(mel[i],now+i*noteLen);
                if(style===1)o.frequency.exponentialRampToValueAtTime(mel[i]*1.02,now+i*noteLen+noteLen*0.4);
                g.gain.setValueAtTime(0,now+i*noteLen);
                g.gain.linearRampToValueAtTime(melVol,now+i*noteLen+0.01);
                if(style===2){g.gain.setValueAtTime(melVol,now+i*noteLen+noteLen*0.3);g.gain.linearRampToValueAtTime(0,now+i*noteLen+noteLen*0.5);}
                else{g.gain.exponentialRampToValueAtTime(0.005,now+i*noteLen+noteLen*0.9);}
                o.connect(g);g.connect(raceBgmGain);o.start(now+i*noteLen);o.stop(now+i*noteLen+noteLen);
                raceBgmNodes.push(o);
            }
            // Harmony — octave below on even notes
            if(mel[i]>0&&i%2===0){
                var h=ctx.createOscillator();var hg=ctx.createGain();
                h.type='sine';h.frequency.value=mel[i]*0.5;
                hg.gain.setValueAtTime(0.04,now+i*noteLen);
                hg.gain.exponentialRampToValueAtTime(0.003,now+i*noteLen+noteLen*1.5);
                h.connect(hg);hg.connect(raceBgmGain);h.start(now+i*noteLen);h.stop(now+i*noteLen+noteLen*1.5);
                raceBgmNodes.push(h);
            }
            // Chords every 4 notes
            if(i%4===0){var ci=Math.floor(i/4)%chords.length;
            for(var cn=0;cn<chords[ci].length;cn++){var co=ctx.createOscillator();var cg=ctx.createGain();
            co.type=style===1?'sawtooth':'triangle';co.frequency.value=chords[ci][cn];
            cg.gain.setValueAtTime(0.035,now+i*noteLen);cg.gain.exponentialRampToValueAtTime(0.004,now+i*noteLen+noteLen*3.8);
            co.connect(cg);cg.connect(raceBgmGain);co.start(now+i*noteLen);co.stop(now+i*noteLen+noteLen*4);
            raceBgmNodes.push(co);}}
            // Bass
            if(i%4===0){var ci2=Math.floor(i/4)%chords.length;
            var bo=ctx.createOscillator();var bg2=ctx.createGain();
            bo.type=bassType;bo.frequency.value=chords[ci2][0]*(style===1?0.25:0.5);
            bg2.gain.setValueAtTime(bassVol,now+i*noteLen);bg2.gain.exponentialRampToValueAtTime(0.006,now+i*noteLen+noteLen*3.5);
            bo.connect(bg2);bg2.connect(raceBgmGain);bo.start(now+i*noteLen);bo.stop(now+i*noteLen+noteLen*4);
            raceBgmNodes.push(bo);}
            // Kick drum
            if(style===1?(i%2===0):(i%4===0)){
                var kb=ctx.createBuffer(1,Math.floor(ctx.sampleRate*0.07),ctx.sampleRate);var kd=kb.getChannelData(0);
                for(var s=0;s<kd.length;s++){var p=s/kd.length;kd[s]=Math.sin(p*Math.PI*(style===1?14:8)*(1-p*0.8))*0.4*Math.exp(-p*6);}
                var ks=ctx.createBufferSource();var kg=ctx.createGain();kg.gain.value=style===1?0.16:0.12;
                ks.buffer=kb;ks.connect(kg);kg.connect(raceBgmGain);ks.start(now+i*noteLen);ks.stop(now+i*noteLen+0.07);
                raceBgmNodes.push(ks);
            }
            // Snare
            if(i%4===2){var sb=ctx.createBuffer(1,Math.floor(ctx.sampleRate*0.05),ctx.sampleRate);var sd=sb.getChannelData(0);
            for(var s2=0;s2<sd.length;s2++) sd[s2]=(Math.random()-0.5)*0.3*Math.exp(-s2/(sd.length*0.12));
            var ss=ctx.createBufferSource();var sg=ctx.createGain();sg.gain.value=0.10;
            ss.buffer=sb;ss.connect(sg);sg.connect(raceBgmGain);ss.start(now+i*noteLen);ss.stop(now+i*noteLen+0.05);
            raceBgmNodes.push(ss);}
            // Hi-hat
            if(i%2===1){var hb=ctx.createBuffer(1,Math.floor(ctx.sampleRate*0.02),ctx.sampleRate);var hd2=hb.getChannelData(0);
            for(var s3=0;s3<hd2.length;s3++) hd2[s3]=(Math.random()-0.5)*0.18*Math.exp(-s3/(hd2.length*0.08));
            var hs=ctx.createBufferSource();var hg2=ctx.createGain();hg2.gain.value=style===1?0.10:0.06;
            hs.buffer=hb;hs.connect(hg2);hg2.connect(raceBgmGain);hs.start(now+i*noteLen);hs.stop(now+i*noteLen+0.02);
            raceBgmNodes.push(hs);}
        }
        raceBgmTimer=setTimeout(doLoop,mel.length*noteLen*1000);
    }
    doLoop();
}

// Walk sound — cute "pata pata" Doraemon style with cooldown
let lastStepTime=0;
function playStepSound(){
    if(!sfxEnabled) return;
    const now=performance.now();
    if(now-lastStepTime<180) return; // min 180ms between steps
    lastStepTime=now;
    const ctx=ensureAudio();
    const t=ctx.currentTime;
    // Soft "pa" — short pitched tap
    const osc=ctx.createOscillator();
    const g=ctx.createGain();
    osc.type='sine';
    const pitch=380+Math.random()*40; // slight variation
    osc.frequency.setValueAtTime(pitch, t);
    osc.frequency.exponentialRampToValueAtTime(pitch*0.6, t+0.06);
    g.gain.setValueAtTime(0.07, t);
    g.gain.linearRampToValueAtTime(0.04, t+0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t+0.08);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(t); osc.stop(t+0.08);
    // Soft "ta" layer — tiny noise pop
    const buf=ctx.createBuffer(1, Math.floor(ctx.sampleRate*0.03), ctx.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i]=(Math.random()-0.5)*0.15*Math.exp(-i/(d.length*0.15));
    const ns=ctx.createBufferSource();
    const ng=ctx.createGain(); ng.gain.value=0.04;
    ns.buffer=buf; ns.connect(ng); ng.connect(ctx.destination);
    ns.start(t+0.01); ns.stop(t+0.04);
}

// ---- Distance-based volume attenuation ----
function _sfxVolume(worldX,worldZ){
    if(!playerEgg||!playerEgg.mesh)return 1;
    if(isNaN(worldX)||isNaN(worldZ))return 0;
    return DANBO_WASM.sfxVolume(playerEgg.mesh.position.x,playerEgg.mesh.position.z,worldX,worldZ);
}

// Jump sound
function playJumpSound(srcX,srcZ){
    if(!sfxEnabled||window._sfxMuted) return;
    var _vol=(srcX!==undefined)?_sfxVolume(srcX,srcZ):1;
    if(_vol<=0)return;
    const ctx=ensureAudio();
    const osc=ctx.createOscillator();
    const g=ctx.createGain();
    osc.type='sine';
    osc.frequency.setValueAtTime(300,ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600,ctx.currentTime+0.12);
    g.gain.setValueAtTime(0.1*_vol,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.15);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime+0.15);
}

// Coin collect sound
function playCoinSound(){
    if(!sfxEnabled) return;
    const ctx=ensureAudio();
    [800,1200].forEach((f,i)=>{
        const osc=ctx.createOscillator();
        const g=ctx.createGain();
        osc.type='sine'; osc.frequency.value=f;
        g.gain.setValueAtTime(0.12,ctx.currentTime+i*0.08);
        g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+i*0.08+0.12);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(ctx.currentTime+i*0.08); osc.stop(ctx.currentTime+i*0.08+0.12);
    });
}
function playChestSound(rare){
    if(!sfxEnabled) return;
    const ctx=ensureAudio();
    const notes=rare?[523,659,784,1047]:[440,587,784]; // rare = brighter 4-note flourish
    notes.forEach((f,i)=>{
        const osc=ctx.createOscillator();
        const g=ctx.createGain();
        osc.type='triangle'; osc.frequency.value=f;
        const t0=ctx.currentTime+i*0.07;
        g.gain.setValueAtTime(0.13,t0);
        g.gain.exponentialRampToValueAtTime(0.001,t0+0.18);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(t0); osc.stop(t0+0.18);
    });
}

// Hit/bump sound
var _splashCooldown=0;
function playSplashSound(){
    if(!sfxEnabled||_splashCooldown>0) return;
    _splashCooldown=20;
    var ctx=ensureAudio();if(!ctx)return;
    // Filtered noise burst for water splash
    var bufSize=ctx.sampleRate*0.15;
    var buf=ctx.createBuffer(1,bufSize,ctx.sampleRate);
    var d=buf.getChannelData(0);
    for(var i=0;i<bufSize;i++)d[i]=(Math.random()*2-1)*Math.exp(-i/bufSize*4);
    var src=ctx.createBufferSource();src.buffer=buf;
    var filt=ctx.createBiquadFilter();filt.type='bandpass';filt.frequency.value=2000;filt.Q.value=0.8;
    var g=ctx.createGain();g.gain.setValueAtTime(0.12,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.15);
    src.connect(filt);filt.connect(g);g.connect(ctx.destination);
    src.start();src.stop(ctx.currentTime+0.15);
}
function playHitSound(srcX,srcZ){
    if(!sfxEnabled||window._sfxMuted) return;
    var _vol=(srcX!==undefined)?_sfxVolume(srcX,srcZ):1;
    if(_vol<=0)return;
    const ctx=ensureAudio();
    const osc=ctx.createOscillator();
    const g=ctx.createGain();
    osc.type='sawtooth'; osc.frequency.value=120;
    g.gain.setValueAtTime(0.08*_vol,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.1);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime+0.1);
}

// Grab sound — short "boop"
function playGrabSound(srcX,srcZ){
    if(!sfxEnabled||window._sfxMuted) return;
    var _vol=(srcX!==undefined)?_sfxVolume(srcX,srcZ):1;
    if(_vol<=0)return;
    const ctx=ensureAudio(); const t=ctx.currentTime;
    const osc=ctx.createOscillator(); const g=ctx.createGain();
    osc.type='sine'; osc.frequency.setValueAtTime(500,t); osc.frequency.exponentialRampToValueAtTime(350,t+0.1);
    g.gain.setValueAtTime(0.1,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.12);
    osc.connect(g); g.connect(ctx.destination); osc.start(t); osc.stop(t+0.12);
}

// Throw sound — whoosh
function playThrowSound(srcX,srcZ){
    if(!sfxEnabled||window._sfxMuted) return;
    var _vol=(srcX!==undefined)?_sfxVolume(srcX,srcZ):1;
    if(_vol<=0)return;
    const ctx=ensureAudio(); const t=ctx.currentTime;
    const buf=ctx.createBuffer(1,Math.floor(ctx.sampleRate*0.15),ctx.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++){const p=i/d.length;d[i]=(Math.random()-0.5)*0.3*Math.sin(p*Math.PI)*Math.exp(-p*2);}
    const ns=ctx.createBufferSource(); const ng=ctx.createGain(); ng.gain.value=0.12;
    ns.buffer=buf; ns.connect(ng); ng.connect(ctx.destination); ns.start(t); ns.stop(t+0.15);
    // Rising pitch layer
    const osc=ctx.createOscillator(); const g=ctx.createGain();
    osc.type='sine'; osc.frequency.setValueAtTime(200,t); osc.frequency.exponentialRampToValueAtTime(800,t+0.12);
    g.gain.setValueAtTime(0.06,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.15);
    osc.connect(g); g.connect(ctx.destination); osc.start(t); osc.stop(t+0.15);
}

// ---- Battle sounds (moon MS combat) ----
var _beamSoundCD=0, _explSoundCD=0, _missileSoundCD=0;
// Volume multiplier for battle sounds — reduced when player is inside a moon city shield
function _battleSoundVol(){
    if(!playerEgg||currentCityStyle!==5||!window._moonShields)return 1.0;
    var px=playerEgg.mesh.position.x,pz=playerEgg.mesh.position.z;
    for(var si=0;si<window._moonShields.length;si++){
        var s=window._moonShields[si];
        var dx=px-s.x,dz=pz-s.z;
        if(dx*dx+dz*dz<s.r*s.r)return 0.01; // inside city — nearly silent
    }
    return 1.0;
}
function playBeamSound(){
    if(!sfxEnabled||_beamSoundCD>0)return;_beamSoundCD=4;
    var ctx=ensureAudio();if(!ctx)return;var t=ctx.currentTime;var bv=_battleSoundVol();
    var o=ctx.createOscillator();var g=ctx.createGain();
    o.type='sawtooth';o.frequency.setValueAtTime(1200+Math.random()*400,t);o.frequency.exponentialRampToValueAtTime(600,t+0.08);
    g.gain.setValueAtTime(0.04*bv,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.1);
    o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+0.1);
}
function playExplosionSound(){
    if(!sfxEnabled||_explSoundCD>0)return;_explSoundCD=8;
    var ctx=ensureAudio();if(!ctx)return;var t=ctx.currentTime;var bv=_battleSoundVol();
    var buf=ctx.createBuffer(1,Math.floor(ctx.sampleRate*0.3),ctx.sampleRate);
    var d=buf.getChannelData(0);
    for(var i=0;i<d.length;i++){var p=i/d.length;d[i]=(Math.random()-0.5)*Math.exp(-p*3)*(1-p);}
    var ns=ctx.createBufferSource();var ng=ctx.createGain();ng.gain.value=0.08*bv;
    ns.buffer=buf;ns.connect(ng);ng.connect(ctx.destination);ns.start(t);ns.stop(t+0.3);
    var o=ctx.createOscillator();var g=ctx.createGain();
    o.type='sine';o.frequency.setValueAtTime(80,t);o.frequency.exponentialRampToValueAtTime(30,t+0.25);
    g.gain.setValueAtTime(0.06*bv,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.3);
    o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+0.3);
}
function playMissileSound(){
    if(!sfxEnabled||_missileSoundCD>0)return;_missileSoundCD=6;
    var ctx=ensureAudio();if(!ctx)return;var t=ctx.currentTime;var bv=_battleSoundVol();
    var o=ctx.createOscillator();var g=ctx.createGain();
    o.type='sawtooth';o.frequency.setValueAtTime(300,t);o.frequency.linearRampToValueAtTime(800,t+0.15);
    g.gain.setValueAtTime(0.03*bv,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.18);
    o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+0.18);
}
// AT Field effect — hexagonal flash at shield impact point
function _spawnATField(x,y,z,nx,ny,nz){
    // Evangelion AT Field — ripple rings expanding outward one by one
    for(var ai=0;ai<6;ai++){
        // Each ring starts tiny and expands; delayed by ai*6 frames
        var hex=new THREE.Mesh(new THREE.RingGeometry(0.3,0.8,6),
            new THREE.MeshBasicMaterial({color:ai<3?0xFF8800:0xFFAA33,transparent:true,opacity:0,side:THREE.DoubleSide}));
        hex.position.set(x,y,z);
        hex.lookAt(x+nx,y+ny,z+nz);
        scene.add(hex);
        window._moonBeams.push({mesh:hex,life:50,vx:nx*0.01,vy:ny*0.01,vz:nz*0.01,
            _isExplosion:true,_atField:true,_atDelay:ai*6,_atAge:0,_atMaxR:5+ai*3.5});
    }
    // Central impact flash
    var flash=new THREE.Mesh(new THREE.SphereGeometry(1.5,6,4),new THREE.MeshBasicMaterial({color:0xFFCC44,transparent:true,opacity:0.9}));
    flash.position.set(x,y,z);scene.add(flash);
    window._moonBeams.push({mesh:flash,life:20,vx:0,vy:0,vz:0,_isExplosion:true,_atField:true,_atDelay:0,_atAge:0});
    // AT Field sound
    if(sfxEnabled){
        var ctx=ensureAudio();if(ctx){var t=ctx.currentTime;var _atVol=_battleSoundVol();
        var o=ctx.createOscillator();var g=ctx.createGain();
        o.type='sine';o.frequency.setValueAtTime(1200,t);o.frequency.exponentialRampToValueAtTime(200,t+0.2);
        g.gain.setValueAtTime(0.06*_atVol,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.25);
        o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+0.25);}
    }
}
// Check if point is inside any moon shield, returns shield or null
function _checkMoonShield(px,py,pz){
    if(!window._moonShields)return null;
    for(var si=0;si<window._moonShields.length;si++){
        var s=window._moonShields[si];
        var dx=px-s.x,dy=py-s.y,dz=pz-s.z;
        if(dx*dx+dy*dy+dz*dz<s.r*s.r)return s;
    }
    return null;
}

// Menu sound effects
function playMenuMove(){
    if(!sfxEnabled)return;var ctx=ensureAudio();var t=ctx.currentTime;
    // Punchy arcade move sound
    var o=ctx.createOscillator();var g=ctx.createGain();
    o.type='square';o.frequency.setValueAtTime(880,t);o.frequency.exponentialRampToValueAtTime(660,t+0.04);
    g.gain.setValueAtTime(0.1,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.06);
    o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+0.06);
    // Click layer
    var o2=ctx.createOscillator();var g2=ctx.createGain();
    o2.type='sine';o2.frequency.value=1200;
    g2.gain.setValueAtTime(0.06,t);g2.gain.exponentialRampToValueAtTime(0.001,t+0.03);
    o2.connect(g2);g2.connect(ctx.destination);o2.start(t);o2.stop(t+0.03);
}
function playMenuConfirm(){
    if(!sfxEnabled)return;var ctx=ensureAudio();var t=ctx.currentTime;
    // Epic rising confirm — 5 rapid notes ascending with power chord
    var notes=[523,659,784,988,1318];
    notes.forEach(function(f,i){
        var o=ctx.createOscillator();var g=ctx.createGain();
        o.type='sawtooth';o.frequency.value=f;
        g.gain.setValueAtTime(0.12,t+i*0.05);g.gain.exponentialRampToValueAtTime(0.001,t+i*0.05+0.15);
        o.connect(g);g.connect(ctx.destination);o.start(t+i*0.05);o.stop(t+i*0.05+0.15);
        // Octave layer
        var o2=ctx.createOscillator();var g2=ctx.createGain();
        o2.type='triangle';o2.frequency.value=f*2;
        g2.gain.setValueAtTime(0.06,t+i*0.05);g2.gain.exponentialRampToValueAtTime(0.001,t+i*0.05+0.12);
        o2.connect(g2);g2.connect(ctx.destination);o2.start(t+i*0.05);o2.stop(t+i*0.05+0.12);
    });
    // Final impact burst
    var nb=ctx.createBuffer(1,Math.floor(ctx.sampleRate*0.1),ctx.sampleRate);
    var nd=nb.getChannelData(0);
    for(var s=0;s<nd.length;s++){var p=s/nd.length;nd[s]=Math.sin(p*Math.PI*20)*0.3*Math.exp(-p*4);}
    var ns=ctx.createBufferSource();var ng=ctx.createGain();ng.gain.value=0.1;
    ns.buffer=nb;ns.connect(ng);ng.connect(ctx.destination);ns.start(t+0.25);ns.stop(t+0.35);
}
