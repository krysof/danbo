// One navigation owner for title, server, character and account screens.
// Keyboard text entry remains native; gamepad buttons are edge-triggered so a
// held confirm can never skip through several screens or submit a form twice.
(function(){
    'use strict';
    var $=function(id){return document.getElementById(id);},lastRoot=null,lastFocus=null,lastId='',lastCode='',lastKey='',marked=null;
    var padPrevious=[],padDirection='',padNext=0,padKeys={},keyboard={},suspended=false,hudMode=false;
    var typing=null,keyboardBox=null,upper=false;
    function visible(n){return !!(n&&!n.disabled&&!n.hidden&&!n.closest('[hidden],.hidden')&&n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden');}
    function context(){
        if(keyboardBox)return keyboardBox;
        var dialogs=['character-name-overlay','character-resume-overlay','account-overlay','multiplayer-overlay'];
        for(var i=0;i<dialogs.length;i++){var n=$(dialogs[i]);if(n&&!n.classList.contains('hidden'))return n;}
        if(window._langMenuOpen&&window._langMenu)return window._langMenu;
        if(window._chatOpen)return $('chat-input-bar');
        if(window._portalConfirmOpen)return $('portal-confirm');
        if(window._shopOpen&&$('shop-overlay'))return $('shop-overlay');
        if(window._worldMapOpen&&$('worldmap-overlay'))return $('worldmap-overlay');
        if($('lb-panel'))return $('lb-panel');
        var rocket=document.querySelector('.rr-panel');if(rocket&&rocket.style.display!=='none'&&rocket.querySelector('button'))return rocket;
        if(typeof gameState!=='undefined'){
            var ids=['server-select-screen','select-screen','start-screen','result-screen'];
            for(var j=0;j<ids.length;j++){var s=$(ids[j]);if(s&&s.classList.contains('active'))return s;}
        }
        var focused=document.activeElement,frame=focused&&focused.closest&&focused.closest('.journey-frame');
        if(visible(frame))return frame;
        if(lastRoot&&lastRoot.classList.contains('journey-frame')&&visible(lastRoot))return lastRoot;
        return hudMode?(document.querySelector('.rr-root')||$('game-container')):null;
    }
    function items(root){
        if(root===window._langMenu){Array.from(root.children).forEach(function(n){n.tabIndex=0;n.setAttribute('role','menuitem');});return Array.from(root.children).filter(visible);}
        var list=Array.from(root.querySelectorAll('button,input,select,summary,.char-cell,#lb-close')).filter(visible);
        if(root===$('game-container'))['map-btn','lb-btn','shop-btn','portal-prompt','door-prompt'].forEach(function(id){var n=$(id);if(visible(n)&&list.indexOf(n)<0)list.push(n);});
        list.forEach(function(n){if(n.tagName==='DIV'){n.tabIndex=0;n.setAttribute('role','button');}n.dataset.navKey=n.id||n.dataset.code||n.dataset.action||n.className.split(' ')[0]+':'+n.textContent;});
        // Language/audio controls remain reachable, not hidden behind the menu.
        if(root.classList.contains('screen'))list=list.concat(Array.from($('sound-controls').querySelectorAll('button')).filter(visible));
        return list;
    }
    function focus(n){
        if(!n)return;if(marked)marked.classList.remove('danbo-nav-focus');marked=n;n.classList.add('danbo-nav-focus');
        n.focus({preventScroll:true});if(n.closest('.char-grid,.server-list,#shop-items,.multiplayer-panel,.rr-panel'))n.scrollIntoView({block:'nearest',inline:'nearest'});
        lastFocus=n;lastId=n.id;lastCode=n.dataset.code||'';lastKey=n.dataset.navKey||'';
        if(n.classList.contains('char-cell'))selectCharByIndex(Array.from(document.querySelectorAll('.char-cell')).indexOf(n));
        if(n.classList.contains('server-list-item'))DANBO_SERVER_BROWSER.select(n.dataset.code);
    }
    function current(root,list){
        if(root!==lastRoot){lastRoot=root;lastFocus=null;lastId='';lastCode='';lastKey='';}
        var active=document.activeElement;if(list.indexOf(active)>=0)return active;
        var restored=lastCode?list.find(function(n){return n.dataset.code===lastCode;}):lastId?list.find(function(n){return n.id===lastId;}):list.indexOf(lastFocus)>=0?lastFocus:null;
        if(!restored&&lastKey)restored=list.find(function(n){return n.dataset.navKey===lastKey;});
        if(restored)return restored;
        var preferred=root.id==='start-screen'?(_introCompleted?'start-btn':'intro-start'):root.id==='character-resume-overlay'?'character-resume-play':root.id==='character-name-overlay'?'character-name-input':root.id==='server-select-screen'?'server-list-enter':null;
        return list.find(function(n){return n.id===preferred;})||list.find(function(n){return n.classList.contains('selected');})||list[0];
    }
    function move(direction,tab){
        var root=context();if(!root)return false;var list=items(root),active=current(root,list);if(!active)return true;
        var index=list.indexOf(active),next;
        if(tab){next=list[(index+direction+list.length)%list.length];}
        else if(root.id==='start-screen'&&_introCompleted&&(active.id==='start-btn'||active.id==='start-register')){
            next=$(active.id==='start-btn'?'start-register':'start-btn');
        }
        else if(root.id==='server-select-screen'&&(active.id==='server-list-enter'||active.classList.contains('server-list-item'))){
            var rows=list.filter(function(n){return n.classList.contains('server-list-item');}),ri=rows.indexOf(active);
            next=ri<0?(rows.find(function(n){return n.classList.contains('selected');})||rows[0]):rows[(ri+(direction==='up'||direction==='left'?-1:1)+rows.length)%rows.length];
        }
        else if(active.classList.contains('char-cell')){
            var cells=list.filter(function(n){return n.classList.contains('char-cell');}),ci=cells.indexOf(active);
            var columns=getComputedStyle($('char-grid')).gridTemplateColumns.split(' ').length||4;
            var step=direction==='left'?-1:direction==='right'?1:direction==='up'?-columns:columns;
            next=cells[(ci+step+cells.length)%cells.length];
        }
        else if(active.tagName==='SELECT'&&(direction==='left'||direction==='right')){
            var d=direction==='left'?-1:1;active.selectedIndex=(active.selectedIndex+d+active.options.length)%active.options.length;active.dispatchEvent(new Event('change',{bubbles:true}));return true;
        }else{
            var a=active.getBoundingClientRect(),ax=a.left+a.width/2,ay=a.top+a.height/2,best=Infinity;
            list.forEach(function(n){if(n===active)return;var b=n.getBoundingClientRect(),dx=b.left+b.width/2-ax,dy=b.top+b.height/2-ay;
                var primary=direction==='left'?-dx:direction==='right'?dx:direction==='up'?-dy:dy,secondary=(direction==='left'||direction==='right')?Math.abs(dy):Math.abs(dx);
                if(primary>3){var score=primary+secondary*3;if(score<best){best=score;next=n;}}
            });
            if(!next)next=list[(index+(direction==='left'||direction==='up'?-1:1)+list.length)%list.length];
        }
        focus(next);return true;
    }
    function confirm(){
        var root=context();if(!root)return false;
        if(root.id==='start-screen'&&!_introCompleted){if(_introRunning)_skipIntro();else _startIntro();return true;}
        var n=current(root,items(root));if(!n)return true;focus(n);
        if(n.classList.contains('char-cell')){$('confirm-btn').click();return true;}
        if(n.classList.contains('server-list-item')){DANBO_SERVER_BROWSER.select(n.dataset.code);if(!$('server-list-enter').disabled)$('server-list-enter').click();return true;}
        if(n.tagName==='INPUT'&&n.type!=='checkbox'){openKeyboard(n);return true;}
        n.click();return true;
    }
    function back(){
        var root=context();if(!root)return false;
        if(root===keyboardBox){closeKeyboard();return true;}
        if(root===window._langMenu){_closeLangMenu();focus($('lang-btn'));return true;}
        if(root.id==='chat-input-bar'){_closeChatInput();return true;}
        if(root.id==='portal-confirm'){$('portal-no').click();return true;}
        if(root.id==='shop-overlay'){_closeShop();return true;}
        if(root.id==='worldmap-overlay'){_closeWorldMap();return true;}
        if(root.id==='lb-panel'){$('lb-close').click();return true;}
        if(root.classList.contains('rr-panel')){var rb=root.querySelector('[data-action="title"],[data-action="exit"]');if(rb)rb.click();return true;}
        if(root===$('game-container')||root.classList.contains('rr-root')){hudMode=false;if(marked)marked.blur();return true;}
        var cancel={ 'character-name-overlay':'character-name-back','character-resume-overlay':'character-resume-change','account-overlay':visible($('account-back'))?'account-back':'account-close','multiplayer-overlay':'multiplayer-close'}[root.id];
        if(cancel){if(visible($(cancel)))$(cancel).click();return true;}
        if(root.classList.contains('journey-frame')){DANBO_JOURNEY.close();if(marked)marked.blur();return true;}
        if(root.id==='select-screen'){DANBO_SERVER_BROWSER.open('play');return true;}
        if(root.id==='server-select-screen'){if(visible($('server-list-back')))$('server-list-back').click();else{DANBO_MULTIPLAYER.close();showScreen('start-screen');}return true;}
        return true;
    }
    function editable(n){return n&&(n.isContentEditable||n.tagName==='TEXTAREA'||n.tagName==='INPUT'&&n.type!=='checkbox'&&n.type!=='button');}
    function closeKeyboard(){var input=typing;if(keyboardBox)keyboardBox.remove();keyboardBox=null;typing=null;if(input&&input.isConnected)focus(input);}
    function editText(value,erase){
        if(!typing)return;var start=typing.selectionStart,end=typing.selectionEnd;
        if(start===null||start===undefined)start=end=typing.value.length;
        if(erase&&start===end)start=Math.max(0,start-1);
        var next=typing.value.slice(0,start)+(erase?'':value)+typing.value.slice(end),max=typing.maxLength;
        if(max>=0&&next.length>max)return;typing.value=next;
        try{typing.setSelectionRange(start+(erase?0:value.length),start+(erase?0:value.length));}catch(_){}
        typing.dispatchEvent(new Event('input',{bubbles:true}));
        keyboardBox.querySelector('output').textContent=typing.type==='password'?'•'.repeat(typing.value.length):typing.value;
    }
    function openKeyboard(input){
        closeKeyboard();typing=input;keyboardBox=document.createElement('section');keyboardBox.className='danbo-controller-keyboard';keyboardBox.setAttribute('role','region');keyboardBox.setAttribute('aria-label',UI_T('输入文字'));
        keyboardBox.innerHTML='<output></output><div class="danbo-keyboard-grid"></div><footer></footer>';document.body.appendChild(keyboardBox);
        var grid=keyboardBox.querySelector('div');
        function letters(){grid.replaceChildren();Array.from((upper?'ABCDEFGHIJKLMNOPQRSTUVWXYZ':'abcdefghijklmnopqrstuvwxyz')+'0123456789@._-!#$%&*+?/').forEach(function(char){var b=document.createElement('button');b.type='button';b.textContent=char;b.onclick=function(){editText(char);};grid.appendChild(b);});}
        letters();var foot=keyboardBox.querySelector('footer');
        [['⇧','切换大小写',function(){upper=!upper;letters();}],['␣','空格',function(){editText(' ');}],['⌫','删除',function(){editText('',true);}],['✓','完成',closeKeyboard]].forEach(function(item){var b=document.createElement('button');b.type='button';b.textContent=item[0];b.setAttribute('aria-label',UI_T(item[1]));b.title=UI_T(item[1]);b.onclick=item[2];foot.appendChild(b);});
        keyboardBox.querySelector('output').textContent=input.type==='password'?'•'.repeat(input.value.length):input.value;focus(grid.firstElementChild);
    }
    addEventListener('keydown',function(e){
        if(!e._danboPad)keyboard[e.code]=true;var root=context();
        if(!root&&(e.code==='Tab'||e.code==='Escape')&&!editable(e.target)&&(gameState==='city'||gameState==='racing'||window.DANBO_PLUGIN_HOST&&DANBO_PLUGIN_HOST.getActive())){hudMode=true;root=context();if(root&&e.code==='Escape'){focus(current(root,items(root)));e.preventDefault();e.stopImmediatePropagation();return;}}
        if(!root)return;
        // IME, letters, caret arrows and Enter submit retain browser semantics.
        if(e.isComposing)return;
        if(root===keyboardBox&&!e._danboPad){
            if(e.key&&e.key.length===1&&!e.ctrlKey&&!e.metaKey){editText(e.key);e.preventDefault();e.stopImmediatePropagation();return;}
            if(e.code==='Backspace'){editText('',true);e.preventDefault();e.stopImmediatePropagation();return;}
        }
        if(editable(e.target)){if(e.code!=='Escape')return;}
        if(e.target&&e.target.tagName==='SELECT'&&e.code!=='Tab'&&e.code!=='Escape')return;
        var dirs={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'},handled=false;
        if(e.code==='Tab')handled=move(e.shiftKey?-1:1,true);
        else if(dirs[e.code])handled=move(dirs[e.code]);
        else if(e.code==='Enter'||e.code==='Space'){if(!e.repeat)confirm();handled=true;}
        else if(e.code==='Escape'){if(!e.repeat)back();handled=true;}
        if(handled){e.preventDefault();e.stopImmediatePropagation();}
    },true);
    addEventListener('keyup',function(e){if(!e._danboPad)keyboard[e.code]=false;keys[e.code]=false;if(e.code==='KeyG')keys.Space=false;},true);
    function keyEvent(type,code){var e=new KeyboardEvent(type,{code:code,key:code==='Space'?' ':code==='Enter'?'Enter':code,bubbles:true,cancelable:true});e._danboPad=true;document.body.dispatchEvent(e);}
    function applyPad(held){
        Object.keys(padKeys).forEach(function(k){if(!held[k]){keyEvent('keyup',k);if(keyboard[k])keys[k]=true;}});
        Object.keys(held).forEach(function(k){if(held[k]){if(!padKeys[k])keyEvent('keydown',k);keys[k]=true;}});padKeys=held;
    }
    function releasePad(){applyPad({});}
    function reset(){releasePad();Object.keys(keyboard).forEach(function(k){keys[k]=false;});keyboard={};padPrevious=[];padDirection='';suspended=true;}
    addEventListener('blur',reset);addEventListener('gamepaddisconnected',reset);
    document.addEventListener('visibilitychange',function(){if(document.hidden)reset();});
    function update(){
        var pads=navigator.getGamepads?navigator.getGamepads():[],pad=null;
        for(var i=0;i<pads.length;i++)if(pads[i]&&pads[i].connected&&pads[i].mapping==='standard'){pad=pads[i];break;}
        if(!pad){releasePad();padPrevious=[];return;}
        var down=function(n){return !!(pad.buttons[n]&&pad.buttons[n].pressed);},pressed=pad.buttons.map(function(b){return !!b.pressed;}),edge=function(n){return pressed[n]&&!padPrevious[n];};
        var x=Math.abs(pad.axes[0]||0)>.5?pad.axes[0]:0,y=Math.abs(pad.axes[1]||0)>.5?pad.axes[1]:0;
        if(down(14))x=-1;if(down(15))x=1;if(down(12))y=-1;if(down(13))y=1;
        if(suspended){padPrevious=pressed;if(!pressed.some(Boolean)&&!x&&!y&&!document.hidden)suspended=false;return;}
        var root=context(),openedWithStart=false;
        if(!root&&edge(9)){
            hudMode=true;root=context();if(root)focus(current(root,items(root)));openedWithStart=true;
        }
        if(root){
            releasePad();var dir=Math.abs(x)>Math.abs(y)?x<0?'left':x>0?'right':'':y<0?'up':y>0?'down':'',now=performance.now();
            if(dir&&(dir!==padDirection||now>=padNext)){move(dir);padNext=now+(dir!==padDirection?350:140);}padDirection=dir;
            if(edge(0))confirm();else if(edge(1)||edge(9)&&!openedWithStart)back();
            if(edge(4))move(-1,true);if(edge(5))move(1,true);
        }else{
            padDirection='';
            if((gameState==='city'||gameState==='racing'||window.DANBO_PLUGIN_HOST&&DANBO_PLUGIN_HOST.getActive())&&!window._chatOpen&&!editable(document.activeElement)){
                var held={KeyW:y<0,KeyS:y>0,KeyA:x<0,KeyD:x>0,Space:down(0),KeyF:down(1),KeyR:down(2),KeyT:down(3),ShiftLeft:down(4)};
                Object.keys(held).forEach(function(k){if(!held[k])delete held[k];});applyPad(held);
                if(edge(8)&&typeof _toggleWorldMap==='function'&&gameState==='city')_toggleWorldMap();
                if(edge(5)){
                    var interaction=gameState==='city'&&!(typeof _danboPortalPromptActive==='function'&&_danboPortalPromptActive())&&(window._interiorActive||window._nearShopDoor||window._nearDoorBuilding)?'KeyE':'Enter';
                    keyEvent('keydown',interaction);keyEvent('keyup',interaction);
                }
                if(edge(11)&&typeof _cycleViewMode==='function'&&gameState==='city')_cycleViewMode();
                var rx=Math.abs(pad.axes[2]||0)>.2?pad.axes[2]:0,ry=Math.abs(pad.axes[3]||0)>.2?pad.axes[3]:0;
                if((rx||ry)&&gameState==='city'&&typeof _tpsCamYaw==='number'){
                    if(_viewMode===0)_setViewMode(1);
                    _tpsCamYaw-=rx*.035;_tpsCamPitch=Math.max(-1.57,Math.min(1.2,_tpsCamPitch+ry*.025));_tpsManual=true;
                }
                if(typeof _cameraZoom==='number')_cameraZoom=Math.max(.04,Math.min(1000,_cameraZoom*(down(6)?1.018:down(7)?.982:1)));
            }else releasePad();
        }
        padPrevious=pressed;
    }
    // Pointer clicks do not force keyboard highlight or steal control ownership.
    addEventListener('pointerdown',function(){hudMode=false;lastRoot=null;if(marked)marked.classList.remove('danbo-nav-focus');});
    window.DANBO_MENU_INPUT={update:update,context:context,move:move,confirm:confirm,back:back,releaseGameplay:reset};
})();
