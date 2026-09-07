// Accounts and guest profiles. Only guest character data is kept in localStorage;
// bearer sessions stay in this tab's sessionStorage, scoped to the server origin.
(function(){
    'use strict';
    var session=null,endpoint='',pending=null,mode='login',busy=false;
    var namePending=null,lastFocus=null;
    var $=function(id){return document.getElementById(id);};
    var box=$('account-overlay'),nameBox=$('character-name-overlay');
    var GUEST_KEY='danbo_guest_profile_v1';
    function profile(){
        var saved={};try{saved=JSON.parse(localStorage.getItem(GUEST_KEY)||'{}');}catch(_){}
        var user=session&&session.user;
        return {characterName:user&&user.characterName||saved.characterName||'新旅人',
            character:user&&typeof selectedChar==='number'?selectedChar:Number(saved.character)||0,
            style:user?(window.DANBO_SELECTED_CHARACTER_STYLE==='classic'?'classic':'cinematic'):(saved.style==='classic'?'classic':'cinematic')};
    }
    function storageKey(){return 'danbo_account_session_v1:'+endpoint;}
    function resolveEndpoint(value){
        var url=new URL(value.replace(/^ws:/,'http:').replace(/^wss:/,'https:'));
        if(url.protocol!=='https:'&&!(url.protocol==='http:'&&/^(localhost|127\.0\.0\.1)$/.test(url.hostname)))throw new Error('账号连接必须使用 HTTPS');
        if(url.username||url.password)throw new Error('服务器地址不能包含凭证');
        return url.origin;
    }
    function configure(value){
        var next=resolveEndpoint(value);
        if(endpoint!==next){endpoint=next;session=null;}
    }
    function clearSession(){session=null;try{sessionStorage.removeItem(storageKey());}catch(_){}render();}
    async function api(path,body,token){
        if(!endpoint)throw new Error('请先配置服务器地址');
        var controller=new AbortController(),timeout=setTimeout(function(){controller.abort();},15000);
        try{
            var headers={'Content-Type':'application/json'};
            if(token)headers.Authorization='Bearer '+token;
            var response=await fetch(endpoint+'/api/account'+path,{method:body===undefined?'GET':'POST',headers:headers,
                body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal,cache:'no-store',credentials:'omit'});
            var data={};try{data=await response.json();}catch(_){}
            if(!response.ok||data.ok!==true){var error=new Error(data.error||'账号服务暂时不可用');error.status=response.status;throw error;}
            return data;
        }catch(error){if(error.name==='AbortError')throw new Error('连接超时，请稍后再试');throw error;}
        finally{clearTimeout(timeout);}
    }
    function rememberGuest(value){
        try{localStorage.setItem(GUEST_KEY,JSON.stringify(value));}catch(_){throw new Error('浏览器无法保存游客资料，请允许网站存储或注册账号');}
    }
    function render(){
        var user=session&&session.user;
        $('account-open').textContent=user&&user.kind==='account'?'账号：'+user.username:'游客 · 注册';
        $('account-server-open').textContent=user&&user.kind==='account'?user.username:'游客 / 登录注册';
        var name=$('multiplayer-name');if(name){name.readOnly=true;name.value=user?user.characterName:profile().characterName;}
        $('account-current').textContent=user?(user.kind==='guest'?'当前为游客：':'当前账号：')+(user.username||user.characterName):'游客资料只保存在当前浏览器';
        $('account-profile').textContent=user&&user.kind==='account'?'人物：'+user.characterName+' · 邮箱：'+user.email:'';
        var logged=user&&user.kind==='account';
        $('account-form').hidden=!!logged;
        $('account-tabs').hidden=!!logged;
        $('account-guest').hidden=!!logged;
        $('account-logout').hidden=!logged;
    }
    function lock(open){
        window._accountPanelOpen=open;
        if(typeof keys!=='undefined')for(var k in keys)keys[k]=false;
        if(typeof joyActive!=='undefined')joyActive=false;
        if(typeof joyVec!=='undefined')joyVec={x:0,y:0};
    }
    function chooseMode(next){
        mode=next;
        $('account-email-row').hidden=mode!=='register';$('account-email').required=mode==='register';
        $('account-login-label').textContent=mode==='register'?'登录用户名':'用户名或邮箱';
        $('account-login').autocomplete=mode==='register'?'username':'username';
        $('account-password').autocomplete=mode==='register'?'new-password':'current-password';
        $('account-password').minLength=mode==='register'?15:1;
        $('account-submit').textContent=mode==='register'?'注册并保存当前人物':'登录';
        $('account-registration-note').hidden=mode!=='register';
        $('account-message').textContent='';
        $('account-tab-login').setAttribute('aria-selected',String(mode==='login'));
        $('account-tab-register').setAttribute('aria-selected',String(mode==='register'));
    }
    function open(next){
        if(!endpoint&&window.DANBO_MULTIPLAYER)configure(window.DANBO_MULTIPLAYER.getEndpoint());
        lastFocus=document.activeElement;render();chooseMode(next||'register');
        $('account-password').value='';box.classList.remove('hidden');lock(true);
    }
    function close(){
        if(busy)return;
        box.classList.add('hidden');$('account-password').value='';lock(false);
        if(lastFocus&&lastFocus.focus)lastFocus.focus();
        if(pending){pending(false);pending=null;}
    }
    async function adopt(data,reason){
        session={token:data.token,expiresAt:data.expiresAt,user:data.user};
        try{sessionStorage.setItem(storageKey(),JSON.stringify({token:session.token,expiresAt:session.expiresAt}));}catch(_){}
        if(data.user.kind==='guest')rememberGuest({characterName:data.user.characterName,character:data.user.character,style:data.user.style});
        if(typeof selectedChar==='number'&&gameState!=='city'){
            selectedChar=data.user.character;
            window.DANBO_SELECTED_CHARACTER_STYLE=data.user.style;
            if(typeof selectCharByIndex==='function')selectCharByIndex(selectedChar);
        }
        render();
        if(window.DANBO_PROGRESS)await DANBO_PROGRESS.activate(data.user,reason||'resume',data.snapshot);
        if(window.DANBO_JOURNEY)DANBO_JOURNEY.event('open');
    }
    async function resume(){
        if(session&&session.expiresAt>Date.now())return true;
        var stored;try{stored=JSON.parse(sessionStorage.getItem(storageKey())||'null');}catch(_){}
        if(!stored||stored.expiresAt<=Date.now())return false;
        try{var data=await api('/me',undefined,stored.token);await adopt(Object.assign({},data,{token:stored.token}));return true;}
        catch(error){if(error.status===401)clearSession();return false;}
    }
    async function ensure(value){
        configure(value);if(await resume())return true;
        open('login');return new Promise(function(resolve){if(pending)pending(false);pending=resolve;});
    }
    async function submit(kind){
        if(busy)return;busy=true;$('account-submit').disabled=true;$('account-guest').disabled=true;
        var old=session,oldRoom=window.DANBO_MULTIPLAYER&&DANBO_MULTIPLAYER.getRoom();
        var roomCode=oldRoom&&oldRoom.state&&oldRoom.state.code;
        try{
            var current=profile(),data;
            if(kind==='guest')data=await api('/guest',current);
            else if(mode==='register')data=await api('/register',Object.assign({},current,{username:$('account-login').value,email:$('account-email').value,password:$('account-password').value,emailUpdates:!!($('account-updates')&&$('account-updates').checked)}));
            else data=await api('/login',{login:$('account-login').value,password:$('account-password').value});
            await adopt(data,kind==='guest'?'guest':mode);$('account-password').value='';
            if(old&&old.token!==session.token)api('/logout',{},old.token).catch(function(){});
            var done=pending;pending=null;busy=false;close();if(done)done(true);
            if(gameState==='city'&&kind!=='guest'&&mode==='login'){await DANBO_MULTIPLAYER.leave();location.reload();return;}
            if(roomCode)await DANBO_MULTIPLAYER.connect(roomCode); // promotion keeps current city/position
        }catch(error){$('account-message').textContent=error.message||'连接失败，请重试';}
        finally{busy=false;$('account-submit').disabled=false;$('account-guest').disabled=false;}
    }
    function requestCharacter(){
        if(namePending)return Promise.resolve(false);
        var current=profile();$('character-name-input').value=current.characterName;
        $('character-name-message').textContent='';
        var hero=typeof CHARACTERS!=='undefined'&&CHARACTERS[selectedChar];
        $('character-name-hero').textContent='已选角色：'+(hero?hero.name:'蛋宝');
        nameBox.classList.remove('hidden');lock(true);
        setTimeout(function(){$('character-name-input').focus();$('character-name-input').select();},50);
        return new Promise(function(resolve){namePending=resolve;});
    }
    function finishName(ok){
        nameBox.classList.add('hidden');lock(false);
        if(namePending){var done=namePending;namePending=null;done(ok);}
    }
    $('character-name-form').addEventListener('submit',async function(event){
        event.preventDefault();if(busy)return;busy=true;$('character-name-submit').disabled=true;
        try{
            var current=profile();current.characterName=$('character-name-input').value.trim();
            if(!session)throw new Error('请先选择游客或登录账号');
            var data=await api('/character',current,session.token);
            session.user=data.user;
            if(session.user.kind==='guest')rememberGuest(current);
            render();finishName(true);
        }catch(error){$('character-name-message').textContent=error.message||'保存失败，请重试';}
        finally{busy=false;$('character-name-submit').disabled=false;}
    });
    $('character-name-back').addEventListener('click',function(){if(!busy)finishName(false);});
    $('account-form').addEventListener('submit',function(event){event.preventDefault();submit('account');});
    $('account-guest').addEventListener('click',function(){submit('guest');});
    $('account-tab-login').addEventListener('click',function(){if(!busy)chooseMode('login');});
    $('account-tab-register').addEventListener('click',function(){if(!busy)chooseMode('register');});
    $('account-close').addEventListener('click',close);
    [$('account-open'),$('account-server-open')].forEach(function(button){button.addEventListener('click',function(){open('register');});});
    $('account-logout').addEventListener('click',async function(){
        if(busy)return;busy=true;
        try{if(window.DANBO_PROGRESS)await DANBO_PROGRESS.flush();await api('/logout',{},session.token);await DANBO_MULTIPLAYER.leave();clearSession();busy=false;location.reload();}
        catch(error){$('account-message').textContent=error.message;busy=false;}
    });
    [box,nameBox].forEach(function(panel){
        panel.addEventListener('keydown',function(event){
            event.stopPropagation(); // typing must not move characters or trigger menu shortcuts
            if(event.code==='Escape'&&!busy){event.preventDefault();panel===box?close():finishName(false);}
            if(event.key==='Tab'){
                var focusable=Array.from(panel.querySelectorAll('button,input')).filter(function(e){return !e.disabled&&e.getClientRects().length;});
                var first=focusable[0],last=focusable[focusable.length-1];
                if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
                else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
            }
        });
        panel.addEventListener('keyup',function(event){event.stopPropagation();});
    });
    window.DANBO_ACCOUNT={ensure:ensure,open:open,requestCharacter:requestCharacter,
        request:function(path,body){if(!endpoint)configure(DANBO_MULTIPLAYER.getEndpoint());return api(path,body,session&&session.token);},
        acceptHandoff:async function(data){var old=session;await adopt(data,'handoff');if(old)api('/logout',{},old.token).catch(function(){});},
        getUser:function(){return session&&session.user;},
        getToken:function(value){configure(value);return session&&session.expiresAt>Date.now()?session.token:null;},
        invalidate:clearSession};
    render();
})();
