// main.js — DANBO World
// ============================================================
//  INIT
// ============================================================
buildCity();
buildPortals();
buildCityCoins();
buildCityChests();
buildWarpPipes();
applyCityTheme();
// Initial portrait draw (after entity.js loaded)
if(typeof _updateSF2Select==='function')_updateSF2Select(0);


// Start button
var _startBtn=document.getElementById('start-btn');
var _startTriggered=false;
function _handleStart(){
    if(_startTriggered)return;
    _startTriggered=true;
    _unlockAudio();
    // Stop intro animation
    if(typeof _introRunning!=='undefined')_introRunning=false;
    stopTitleBGM();
    // Hide start screen immediately to prevent title BGM from restarting
    var _ss=document.getElementById('start-screen');
    if(_ss){_ss.classList.remove('active');_ss.style.display='flex';_ss.style.background='#000';if(_introCanvas)_introCanvas.style.display='none';}
    var ctx=ensureAudio();
    if(ctx&&ctx.state==='suspended')ctx.resume();
    // 700ms delay before showing select screen
    _menuJoyConfirmCD=60; // block button inputs during transition
    keys['KeyR']=false;keys['KeyT']=false;keys['KeyF']=false;keys['Space']=false;
    setTimeout(function(){
        if(_ss){_ss.style.display='';_ss.style.background='';}
        // Reset start triggered for next time
        _startTriggered=false;
        showScreen('select-screen');
        if(_touchVisible)_showMenuTouch();
        _menuJoyConfirmCD=30; // extra cooldown after screen appears
        startSelectBGM();playMenuConfirm();
    },700);
}
_startBtn.addEventListener('click',_handleStart);
_startBtn.addEventListener('touchend',function(e){e.preventDefault();_handleStart();},{passive:false});

// ---- Mobile touch for menu screens ----
var _touchVisible=false;
function _gameplayTouchAllowed(){
    return gameState==='city'||gameState==='racing';
}
function _setTouchControlsVisible(v){
    var tc=document.getElementById('touch-controls');
    if(!tc)return;
    if(v){tc.classList.remove('hidden');}
    else {tc.classList.add('hidden');}
    _touchVisible=!!v;
    _updateGamepadBtn();
}
function _showMenuTouch(){
    // Menu/select are tapped directly; keep virtual controls hidden until gameplay.
    _setTouchControlsVisible(false);
}
function _hideMenuTouch(){
    var tc=document.getElementById('touch-controls');
    tc.style.zIndex=''; // reset to CSS default (6)
}
function _updateGamepadBtn(){
    var gb=document.getElementById('gamepad-btn');
    if(gb)gb.style.opacity=(_touchVisible&&_gameplayTouchAllowed())?'1':'0.5';
}
// Gamepad toggle button — works on PC too
var _gamepadBtn=document.getElementById('gamepad-btn');
if(_gamepadBtn){
_gamepadBtn.addEventListener('click',function(){
        var tc=document.getElementById('touch-controls');
        if(!_gameplayTouchAllowed()){
            _setTouchControlsVisible(false);
            return;
        }
        if(_touchVisible){
            _setTouchControlsVisible(false);
        } else {
            _setTouchControlsVisible(true);
        }
        _updateGamepadBtn();
    });
}
// Show touch controls immediately on title screen for mobile
if('ontouchstart' in window){
    // Default hidden on mobile; game screens will show controls automatically.
    _setTouchControlsVisible(false);
    _updateGamepadBtn();
}

var _selectConfirmed=false;
document.getElementById('confirm-btn').addEventListener('click',()=>{
    if(_selectConfirmed)return;
    _selectConfirmed=true;
    playMenuConfirm();
    stopSelectBGM();
    // Airplane animation: fly from character's country outward
    var _selCh=CHARACTERS[selectedChar];
    _startPlaneAnim(_selCh.mapX,_selCh.mapY,0,0,function(){
        showScreen(null);
        spawnCityNPCs();
        enterCity();
        _selectConfirmed=false;_startTriggered=false; // reset for next time
    });
});

// ---- Mobile menu navigation via joystick ----
var _menuJoyCD=0; // cooldown to prevent rapid scrolling
var _menuJoyConfirmCD=0;
function _updateMenuJoy(){
    if(gameState!=='menu'){requestAnimationFrame(_updateMenuJoy);return;}
    // Title screen: jump or grab button = start game
    var ss=document.getElementById('start-screen');
    if(ss&&ss.classList.contains('active')){
        if((keys['Space']||keys['KeyF']||keys['KeyR']||keys['KeyT'])&&_menuJoyConfirmCD<=0){
            _menuJoyConfirmCD=30;
            keys['Space']=false;keys['KeyF']=false;keys['KeyR']=false;keys['KeyT']=false;
            // If intro not started, start it (tap-to-start)
            if(typeof _introStart!=='undefined'&&!_introStart){if(typeof _onTapStart==='function')_onTapStart();}
            // If intro playing, skip it
            else if(typeof _introRunning!=='undefined'&&_introRunning&&!_introSkipped){if(typeof _skipIntro==='function')_skipIntro();}
            // If intro done, start game
            else{_handleStart();}
        }
        if(_menuJoyConfirmCD>0)_menuJoyConfirmCD--;
        requestAnimationFrame(_updateMenuJoy);
        return;
    }
    // Select screen: joystick navigates, jump/grab = confirm
    var sel=document.getElementById('select-screen');
    if(!sel||!sel.classList.contains('active')){requestAnimationFrame(_updateMenuJoy);return;}
    if(_selectConfirmed){requestAnimationFrame(_updateMenuJoy);return;} // locked after confirm
    // Joystick navigation
    if(_menuJoyCD>0){_menuJoyCD--;} else if(joyActive){
        var ax=Math.abs(joyVec.x),ay=Math.abs(joyVec.y);
        if(ax>0.4||ay>0.4){
            if(ax>ay){
                // horizontal
                if(joyVec.x>0.4){selectCharByIndex(selectedChar+1);_menuJoyCD=12;}
                else if(joyVec.x<-0.4){selectCharByIndex(selectedChar-1);_menuJoyCD=12;}
            } else {
                // vertical
                if(joyVec.y>0.4){selectCharByIndex(selectedChar+4);_menuJoyCD=12;}
                else if(joyVec.y<-0.4){selectCharByIndex(selectedChar-4);_menuJoyCD=12;}
            }
        }
    }
    // Any action button = confirm on select screen (jump, grab, punch, kick)
    if(_menuJoyConfirmCD>0)_menuJoyConfirmCD--;
    if((keys['Space']||keys['KeyF']||keys['KeyR']||keys['KeyT'])&&_menuJoyConfirmCD<=0){
        _menuJoyConfirmCD=30;
        keys['Space']=false;keys['KeyF']=false;keys['KeyR']=false;keys['KeyT']=false;
        document.getElementById('confirm-btn').click();
    }
    requestAnimationFrame(_updateMenuJoy);
}
_updateMenuJoy();

// Keyboard navigation for menus
function selectCharByIndex(idx){
    if(idx<0)idx=CHARACTERS.length-1;
    if(idx>=CHARACTERS.length)idx=0;
    selectedChar=idx;
    document.querySelectorAll('.char-cell').forEach((c,i)=>{c.classList.toggle('selected',i===idx);});
    _updateSF2Select(idx);
    playMenuMove();
}
addEventListener('keydown',function(e){
    if(gameState==='menu'){
        if(e.code==='Enter'||e.code==='Space'){
            e.preventDefault();
            var ss=document.getElementById('start-screen');
            if(ss&&ss.classList.contains('active')){
                // Don't skip to select if intro is still playing
                if(!(typeof _introRunning!=='undefined'&&_introRunning&&!_introSkipped)){_handleStart();}
            } else {
                var sel=document.getElementById('select-screen');
                if(sel&&sel.classList.contains('active')){
                    document.getElementById('confirm-btn').click();
                }
            }
        }
        var sel2=document.getElementById('select-screen');
        if(sel2&&sel2.classList.contains('active')&&!_selectConfirmed){
            if(e.code==='ArrowRight'||e.code==='KeyD'){e.preventDefault();selectCharByIndex(selectedChar+1);playMenuMove();}
            if(e.code==='ArrowLeft'||e.code==='KeyA'){e.preventDefault();selectCharByIndex(selectedChar-1);playMenuMove();}
            if(e.code==='ArrowDown'||e.code==='KeyS'){e.preventDefault();selectCharByIndex(selectedChar+4);playMenuMove();}
            if(e.code==='ArrowUp'||e.code==='KeyW'){e.preventDefault();selectCharByIndex(selectedChar-4);playMenuMove();}
        }
    }
});

// Back to city (shared logic)
function goBackToCity(){
    if(window.DANBO_PLUGIN_HOST&&DANBO_PLUGIN_HOST.getActive&&DANBO_PLUGIN_HOST.getActive()){
        try{DANBO_PLUGIN_HOST.stop({status:'backToCity'});}catch(e){console.warn('Plugin stop failed',e);}
    }
    if(countdownTimer){clearInterval(countdownTimer);countdownTimer=null;}
    if(typeof _resetViewMode==='function')_resetViewMode();
    // Reset all blocking states
    _portalConfirmOpen=false;
    _portalConfirmRace=-1;
    _portalConfirmHidden=null;
    document.getElementById('portal-confirm').style.display='none';
    document.getElementById('portal-prompt').style.display='none';
    finishedEggs=[];playerFinished=false;
    _pfActive=false; // reset platformer flag
    gameState='city';
    if(typeof raceGroup!=='undefined')raceGroup.visible=false;
    if(typeof clearRace==='function')clearRace();
    document.getElementById('race-hud').classList.add('hidden');
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    cityGroup.visible=true;
    for(const npc of cityNPCs) npc.mesh.visible=true;
    if(_babylonTower&&_babylonTower.group)_babylonTower.group.visible=true;
    for(var _sci=0;_sci<cityCloudPlatforms.length;_sci++){if(cityCloudPlatforms[_sci].group)cityCloudPlatforms[_sci].group.visible=true;}
    if(window._cityAnimals)for(var _sai=0;_sai<window._cityAnimals.length;_sai++){if(window._cityAnimals[_sai]._inScene&&window._cityAnimals[_sai].group)window._cityAnimals[_sai].group.visible=true;}
    // Spawn near the portal they entered, offset so it won't re-trigger
    var sx=0,sz=5;
    if(currentRaceIndex>=0&&currentRaceIndex<RACES.length&&RACES[currentRaceIndex]){
        var r=RACES[currentRaceIndex];
        // Offset 5 units away from portal center (toward city center)
        var dx2=r.x,dz2=r.z;
        var dd=DANBO_WASM.len2D(dx2,dz2)||1;
        sx=r.x-dx2/dd*5;
        sz=r.z-dz2/dd*5;
    }
    enterCity(sx,sz);
    // Reset any stale key states and ensure focus
    for(var k in keys) keys[k]=false;
    R.domElement.focus();
}

// Back to city from race result
document.getElementById('back-city-btn').addEventListener('click', goBackToCity);

// Back to city during race
document.getElementById('race-back-btn').addEventListener('click', goBackToCity);

// Back to city from platformer
var _pfBackBtn=document.getElementById('pf-back-btn');
if(_pfBackBtn)_pfBackBtn.addEventListener('click', function(){if(typeof _pfEndGame==='function')_pfEndGame();});

// Auto-detect nav bar / notch offset for all Android & iOS devices
(function(){
    var tc=document.getElementById('touch-controls');
    if(!tc)return;
    function calcOffset(){
        var offset=12; // base minimum
        // Method 1: visualViewport — most reliable on Android Chrome
        if(window.visualViewport){
            var diff=window.innerHeight-window.visualViewport.height;
            if(diff>5)offset=Math.max(offset,diff+8);
        }
        // Method 2: screen vs window — catches Samsung/Xiaomi nav bars
        var screenH=screen.height;
        var winH=window.innerHeight;
        var dpr=window.devicePixelRatio||1;
        // On Android, screen.height is physical pixels / dpr, window.innerHeight is CSS pixels
        // If there's a significant gap, it's likely a nav bar
        if(screenH>0&&winH>0){
            var gap=screenH-winH;
            if(gap>30)offset=Math.max(offset,Math.min(gap*0.6,80));
        }
        tc.style.setProperty('--nav-offset',offset+'px');
    }
    calcOffset();
    window.addEventListener('resize',calcOffset);
    if(window.visualViewport){
        window.visualViewport.addEventListener('resize',calcOffset);
        window.visualViewport.addEventListener('scroll',calcOffset);
    }
    // Also recalc on orientation change
    window.addEventListener('orientationchange',function(){setTimeout(calcOffset,300);});
})();

// ---- i18n: Apply localized text to HTML elements ----
(function(){
    document.documentElement.lang=_langCode==='zhs'?'zh-CN':_langCode==='zht'?'zh-TW':_langCode==='ja'?'ja':'en';
    document.title=L('title');
    var _e=function(id){return document.getElementById(id);};
    var h1=document.querySelector('#start-screen h1');if(h1)h1.textContent=L('title');
    var sub=document.querySelector('.subtitle');if(sub)sub.textContent=L('subtitle');
    var ver=document.querySelector('.version-text')||document.getElementById('intro-version');if(ver)ver.textContent=L('version');
    var slo2=document.querySelector('.slogan-text');if(slo2)slo2.textContent=L('slogan');
    var sb=_e('start-btn');if(sb)sb.textContent=L('startBtn');
    var st=document.querySelector('.select-title');if(st)st.textContent=L('selectTitle');
    var cb=_e('confirm-btn');if(cb)cb.textContent=L('confirmBtn');
    var py=_e('portal-yes');if(py)py.textContent=L('portalYes');
    var pn=_e('portal-no');if(pn)pn.textContent=L('portalNo');
    var mb=_e('music-btn');if(mb)mb.title=L('music');
    var sb2=_e('sfx-btn');if(sb2)sb2.title=L('sfx');
    var gt=document.querySelector('.hud-pill:last-child');
    // Grab/throw pill in city HUD
    var pills=document.querySelectorAll('#city-hud .hud-pill');
    if(pills.length>=3)pills[2].textContent=L('grabThrow');
    var zh2=_e('zoom-hud');if(zh2)zh2.textContent=(currentCityStyle===5)?L('moonCamHint'):L('zoomHint');
    var rb=_e('race-back-btn');if(rb)rb.textContent=L('raceBack');
    var bc=_e('back-city-btn');if(bc)bc.textContent=L('backCity');
    var rt=_e('result-title');if(rt)rt.textContent=L('resultDone');
    var gb=_e('grab-btn');if(gb)gb.textContent=L('grab');
    var jb=_e('jump-btn');if(jb)jb.textContent=L('jump');
    // City name HUD
    var cn=_e('city-name-hud');if(cn)cn.textContent=CITY_STYLES[currentCityStyle].name;
    var pn2=_e('portrait-name');if(pn2)pn2.textContent=CHARACTERS[0].name;
})();

animate();
