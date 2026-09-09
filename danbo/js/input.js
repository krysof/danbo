// input.js — DANBO World

// ---- Input ----
const keys={};
function _isTextInputEvent(e){return !!(e.isComposing||e.target&&(e.target.isContentEditable||e.target.closest&&e.target.closest('input,textarea,select')));}
function _queueCombatPress(code){
    if((code!=='KeyR'&&code!=='KeyT')||typeof playerEgg==='undefined'||!playerEgg||(gameState!=='city'&&gameState!=='racing')||window._accountPanelOpen||window._multiplayerPanelOpen||window._worldMapOpen||window._shopOpen||window._portalConfirmOpen)return;
    playerEgg[code==='KeyR'?'_queuedAttackR':'_queuedAttackT']=true;
}
function _clearBufferedCombat(){if(typeof playerEgg!=='undefined'&&playerEgg){playerEgg._punchBuffer=playerEgg._kickBuffer=0;playerEgg._queuedAttackR=playerEgg._queuedAttackT=false;}}
addEventListener('blur',_clearBufferedCombat);
document.addEventListener('visibilitychange',function(){if(document.hidden)_clearBufferedCombat();});
addEventListener('keydown',e=>{
    if(e.defaultPrevented||_isTextInputEvent(e))return;
    if(gameState==='menu'&&e.repeat)return;
    if(gameState==='menu'&&e.target&&e.target.closest&&e.target.closest('button,input,select,textarea,summary'))return;
    if(window._accountPanelOpen||window._journeyPanelOpen)return;
    keys[e.code]=true;
    if(!e.repeat)_queueCombatPress(e.code);
    if(e.code==='KeyG')keys['Space']=true;
    if(['Space','KeyG','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyE','KeyF','ShiftLeft','ShiftRight'].includes(e.code))e.preventDefault();
    if(e.code==='Enter'&&gameState==='city'&&!_portalConfirmOpen&&!_chatOpen){
        if(typeof _danboPortalPromptActive==='function'&&_danboPortalPromptActive()){
            e.preventDefault();
            if(e.stopImmediatePropagation)e.stopImmediatePropagation();
            if(typeof _danboOpenPortalPrompt==='function')_danboOpenPortalPrompt();
            return;
        }
        e.preventDefault();_openChatInput();
    }
});
addEventListener('keyup',e=>{ keys[e.code]=false; if(e.code==='KeyG')keys['Space']=false; });

let joyVec={x:0,y:0}, joyActive=false, joyTouchId=null;
const joystickArea=document.getElementById('joystick-area');
const joystickBase=document.getElementById('joystick-base');
const joystickKnob=document.getElementById('joystick-knob');
const jumpBtn=document.getElementById('jump-btn');

if(joystickArea){
    joystickArea.addEventListener('touchstart',e=>{e.preventDefault();joyTouchId=e.changedTouches[0].identifier;joyActive=true;updJoy(e.changedTouches[0]);},{passive:false});
    joystickArea.addEventListener('touchmove',e=>{e.preventDefault();for(const t of e.changedTouches)if(t.identifier===joyTouchId)updJoy(t);},{passive:false});
    joystickArea.addEventListener('touchend',e=>{for(const t of e.changedTouches)if(t.identifier===joyTouchId){joyActive=false;joyVec={x:0,y:0};joystickKnob.style.transform='translate(0,0)';}});
    joystickArea.addEventListener('touchcancel',()=>{joyTouchId=null;joyActive=false;joyVec={x:0,y:0};joystickKnob.style.transform='translate(0,0)';});
    // Mouse support for PC
    var _joyMouseDown=false;
    joystickArea.addEventListener('mousedown',function(e){e.preventDefault();_joyMouseDown=true;joyActive=true;updJoy(e);});
    document.addEventListener('mousemove',function(e){if(_joyMouseDown)updJoy(e);});
    document.addEventListener('mouseup',function(e){if(_joyMouseDown){_joyMouseDown=false;joyActive=false;joyVec={x:0,y:0};joystickKnob.style.transform='translate(0,0)';}});
}
addEventListener('blur',function(){joyTouchId=null;_joyMouseDown=false;joyActive=false;joyVec={x:0,y:0};if(joystickKnob)joystickKnob.style.transform='translate(0,0)';Object.keys(keys).forEach(function(k){keys[k]=false;});});
function updJoy(touch){
    const r=joystickBase.getBoundingClientRect();
    let dx=touch.clientX-(r.left+r.width/2),dy=touch.clientY-(r.top+r.height/2);
    const maxR=r.width/2-22,d=DANBO_WASM.len2D(dx,dy);
    if(d>maxR){dx=dx/d*maxR;dy=dy/d*maxR;}
    joystickKnob.style.transform='translate('+dx+'px,'+dy+'px)';
    joyVec={x:dx/maxR,y:dy/maxR};
}
// Helper: add both touch and mouse support to a virtual button
function _bindVBtn(btn,keyCode){
    if(!btn)return;
    btn.addEventListener('touchstart',function(e){e.preventDefault();keys[keyCode]=true;_queueCombatPress(keyCode);},{passive:false});
    btn.addEventListener('touchend',function(e){e.preventDefault();keys[keyCode]=false;},{passive:false});
    btn.addEventListener('touchcancel',function(e){keys[keyCode]=false;},{passive:false});
    btn.addEventListener('mousedown',function(e){e.preventDefault();keys[keyCode]=true;_queueCombatPress(keyCode);});
    btn.addEventListener('mouseup',function(e){e.preventDefault();keys[keyCode]=false;});
    btn.addEventListener('mouseleave',function(e){keys[keyCode]=false;});
}
_bindVBtn(jumpBtn,'Space');
var grabBtn=document.getElementById('grab-btn');
_bindVBtn(grabBtn,'KeyF');
_bindVBtn(document.getElementById('punch-btn'),'KeyR');
_bindVBtn(document.getElementById('kick-btn'),'KeyT');
// Chat button (touch + mouse)
var chatBtn=document.getElementById('chat-btn');
if(chatBtn){
    chatBtn.addEventListener('touchstart',function(e){e.preventDefault();_openChatInput();},{passive:false});
    chatBtn.addEventListener('click',function(){_openChatInput();});
}

// ---- Pinch-to-zoom (mobile) ----
var _pinchStartDist=0, _pinchZoomStart=1;
function _pinchSceneTouches(touches){
    // Moving with one thumb and pressing an action with the other is not zoom.
    return Array.from(touches).filter(function(t){return !(t.target&&t.target.closest&&t.target.closest('#touch-controls,button,input,select,textarea,[role="button"],.screen,.account-overlay,.multiplayer-overlay,.journey-frame,#sound-controls,#worldmap-overlay,#shop-overlay,#lb-panel'));});
}
document.addEventListener('touchstart',function(e){
    var touches=_pinchSceneTouches(e.touches);_pinchStartDist=0;
    if(touches.length===2){
        var dx=touches[0].clientX-touches[1].clientX;
        var dy=touches[0].clientY-touches[1].clientY;
        _pinchStartDist=DANBO_WASM.len2D(dx,dy);
        _pinchZoomStart=_cameraZoom;
    }
},{passive:true});
document.addEventListener('touchmove',function(e){
    var touches=_pinchSceneTouches(e.touches);
    if(touches.length===2&&_pinchStartDist>10){
        var dx=touches[0].clientX-touches[1].clientX;
        var dy=touches[0].clientY-touches[1].clientY;
        var dist=DANBO_WASM.len2D(dx,dy);
        var ratio=_pinchStartDist/dist; // pinch in = zoom out, pinch out = zoom in
        _cameraZoom=_pinchZoomStart*ratio;
        if(_cameraZoom<0.04)_cameraZoom=0.04;
        if(_cameraZoom>1000)_cameraZoom=1000;
    }
},{passive:true});


// Portal prompt removed — auto-enter on walk-in


document.addEventListener('touchend',function(){_pinchStartDist=0;},{passive:true});
document.addEventListener('touchcancel',function(){_pinchStartDist=0;},{passive:true});
