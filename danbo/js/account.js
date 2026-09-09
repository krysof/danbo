// Accounts and guest profiles. Only guest character data is kept in localStorage;
// bearer sessions stay in this tab's sessionStorage, scoped to the server origin.
(function(){
    'use strict';
    var session=null,endpoint='',pending=null,mode='welcome',busy=false,resumeRetry=false;
    var namePending=null,continuePending=null,lastFocus=null;
    var $=function(id){return document.getElementById(id);};
    var box=$('account-overlay'),nameBox=$('character-name-overlay'),continueBox=$('character-resume-overlay');
    var GUEST_KEY='danbo_guest_profile_v1';
    var copy={
        title:['蛋宝世界','蛋寶世界','たまごのなかまたち','Little Egg Friends'],
        play:['直接玩','直接玩','すぐに遊ぶ','Play now'],register:['注册账号','註冊帳號','アカウント作成','Create account'],login:['登录','登入','ログイン','Log in'],account:['我的账号','我的帳號','マイアカウント','My account'],
        back:['← 返回','← 返回','← 戻る','← Back'],close:['关闭','關閉','閉じる','Close'],logout:['退出账号','登出帳號','ログアウト','Log out'],
        username:['用户名','使用者名稱','ユーザー名','Username'],identity:['用户名或邮箱','使用者名稱或信箱','ユーザー名またはメール','Username or email'],email:['邮箱','電子信箱','メールアドレス','Email'],password:['密码','密碼','パスワード','Password'],
        usernameHint:['3–16 字，可用文字、数字、_ 或 -','3–16 字，可用文字、數字、_ 或 -','文字・数字・_・- で 3〜16 文字','3–16 letters, numbers, _ or -'],passwordHint:['至少 15 字，建议使用一句话','至少 15 字，建議使用一句話','15 文字以上（長いフレーズがおすすめ）','At least 15 characters; try a phrase'],
        saveHint:['注册后可跨设备保存进度。','註冊後可跨裝置保存進度。','登録すると別の端末でも続きから遊べます。','Save your progress across devices.'],
        toLogin:['已有账号？登录','已有帳號？登入','アカウントをお持ちの方：ログイン','Already have an account? Log in'],toRegister:['没有账号？注册','沒有帳號？註冊','初めての方：アカウント作成','New here? Create an account'],
        details:['账号说明','帳號說明','アカウントについて','Account details'],
        detailsCopy:['注册会保留当前人物和进度。游客存档仅在此浏览器，清除网站数据会丢失。邮箱暂不验证，尚不支持邮件找回密码；请妥善保存密码。','註冊會保留目前人物和進度。訪客存檔僅在此瀏覽器，清除網站資料會遺失。目前不驗證信箱，尚不支援郵件重設密碼；請妥善保存密碼。','現在のキャラクターと進行状況を引き継ぎます。ゲストのデータはこのブラウザー内のみで、サイトデータの削除で失われます。現在メール認証・パスワード再設定は未対応です。パスワードを大切に保管してください。','Registration keeps your current character and progress. Guest saves stay in this browser and are lost if site data is cleared. Email verification and password recovery are not available yet; keep your password safe.'],
        guestAccount:['注册账号','註冊帳號','アカウント作成','Create account'],connecting:['正在进入…','正在進入…','接続中…','Joining…'],saving:['正在处理…','正在處理…','処理中…','Please wait…'],
        nameTitle:['给人物起个名字','幫人物取個名字','キャラクターに名前をつけよう','Name your character'],nameLabel:['人物名字','人物名字','キャラクター名','Character name'],nameHint:['这不是登录用户名，下次会记住。','這不是登入名稱，下次會記住。','ログイン用の名前とは別です。次回も覚えています。','Separate from your login username. We will remember it.'],namePlaceholder:['2–16 字','2–16 字','2〜16 文字','2–16 characters'],
        nameSubmit:['进入游戏','進入遊戲','ゲームに入る','Enter game'],nameBack:['返回选角色','返回選角色','キャラクター選択に戻る','Back to characters'],hero:['已选角色：','已選角色：','キャラクター：','Character: '],
        resumeTitle:['上次的人物','上次的人物','前回のキャラクター','Your last character'],resumePlay:['继续游戏','繼續遊戲','続きから遊ぶ','Continue playing'],resumeChange:['更换角色','更換角色','キャラクターを変更','Change character'],
        settings:['设置','設定','設定','Settings'],metrics:['允许匿名试玩统计（可选，保留 90 天；不含姓名、邮箱、聊天）','允許匿名試玩統計（可選，保留 90 天；不含姓名、信箱、聊天）','匿名のプレイ統計を許可（任意・90 日保存・名前、メール、チャットは含みません）','Allow anonymous play statistics (optional, kept for 90 days; no names, email or chat)'],updates:['接收游戏更新邮件（可选，随时取消）','接收遊戲更新郵件（可選，隨時取消）','ゲーム更新メールを受け取る（任意・いつでも解除可能）','Receive game update emails (optional; cancel anytime)']
    };
    function t(key){var lang=typeof _langCode==='string'?_langCode:'zhs';return copy[key][Math.max(0,['zhs','zht','ja','en'].indexOf(lang))];}
    function text(id,key){var e=$(id);if(e)e.textContent=t(key);}
    function savedGuest(){
        var saved;try{saved=JSON.parse(localStorage.getItem(GUEST_KEY)||'null');}catch(_){}
        if(!saved||typeof saved.characterName!=='string'||!Number.isInteger(saved.character)||saved.character<0||saved.character>7)return null;
        saved.characterName=saved.characterName.normalize('NFKC').trim();
        if(!/^[\p{L}\p{N}_ -]{2,16}$/u.test(saved.characterName))return null;
        saved.style=saved.style==='classic'?'classic':'cinematic';
        return saved;
    }
    function guestConfirmed(saved){return !!(saved&&(saved.confirmed===true||(saved.confirmed!==false&&saved.characterName!=='新旅人')));}
    function profile(){
        var saved=savedGuest()||{};
        var user=session&&session.user;
        return {characterName:user&&user.characterName||saved.characterName||'新旅人',
            character:user&&typeof selectedChar==='number'?selectedChar:Number(saved.character)||0,
            style:user?(window.DANBO_SELECTED_CHARACTER_STYLE==='classic'?'classic':'cinematic'):(saved.style==='classic'?'classic':'cinematic')};
    }
    function storageKey(){return 'danbo_account_session_v1:'+endpoint;}
    function resolveEndpoint(value){
        var url=new URL(value.replace(/^ws:/,'http:').replace(/^wss:/,'https:'));
        if(url.protocol!=='https:'&&!(url.protocol==='http:'&&/^(localhost|127\.0\.0\.1)$/.test(url.hostname)))throw new Error(UI_T('账号连接必须使用 HTTPS'));
        if(url.username||url.password)throw new Error(UI_T('服务器地址不能包含凭证'));
        return url.origin;
    }
    function configure(value){
        var next=resolveEndpoint(value);
        if(endpoint!==next){endpoint=next;session=null;resumeRetry=false;}
    }
    function clearSession(){session=null;try{sessionStorage.removeItem(storageKey());}catch(_){}render();}
    async function api(path,body,token){
        if(!endpoint)throw new Error(UI_T('请先配置服务器地址'));
        var controller=new AbortController(),timeout=setTimeout(function(){controller.abort();},15000);
        try{
            var headers={'Content-Type':'application/json'};
            if(token)headers.Authorization='Bearer '+token;
            var response=await fetch(endpoint+'/api/account'+path,{method:body===undefined?'GET':'POST',headers:headers,
                body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal,cache:'no-store',credentials:'omit'});
            var data={};try{data=await response.json();}catch(_){}
            if(!response.ok||data.ok!==true){var error=new Error(UI_T(data.error||'账号服务暂时不可用'));error.status=response.status;throw error;}
            return data;
        }catch(error){if(error.name==='AbortError')throw new Error(UI_T('连接超时，请稍后再试'));throw error;}
        finally{clearTimeout(timeout);}
    }
    function rememberGuest(value,confirmed){
        var saved={characterName:value.characterName,character:value.character,style:value.style,confirmed:!!confirmed};
        try{localStorage.setItem(GUEST_KEY,JSON.stringify(saved));}catch(_){throw new Error(UI_T('浏览器无法保存游客资料，请允许网站存储或注册账号'));}
    }
    function storeSession(){
        try{sessionStorage.setItem(storageKey(),JSON.stringify({token:session.token,expiresAt:session.expiresAt,characterReady:session.characterReady}));}catch(_){}
    }
    function restoreCharacter(user){
        selectedChar=user.character;
        // The preview, selected toggle and playable model must use the same style.
        if(typeof window._setCharacterSelectStyle==='function')window._setCharacterSelectStyle(user.style,false);
        else window.DANBO_SELECTED_CHARACTER_STYLE=user.style;
        if(typeof selectCharByIndex==='function')selectCharByIndex(selectedChar);
    }
    function canContinue(){return !!(session&&session.characterReady&&session.expiresAt>Date.now());}
    function offerContinue(){
        if(!canContinue())return Promise.resolve(false);
        if(continuePending)return Promise.resolve(false);
        restoreCharacter(session.user);render();continueBox.classList.remove('hidden');lock(true);updateViewport();$('character-resume-play').focus({preventScroll:true});
        return new Promise(function(resolve){continuePending=resolve;});
    }
    function finishContinue(ok){
        continueBox.classList.add('hidden');lock(false);
        if(continuePending){var done=continuePending;continuePending=null;done(ok);}
    }
    function render(){
        var user=session&&session.user;
        var logged=!!(user&&user.kind==='account'),welcome=!logged&&mode==='welcome',register=mode==='register';
        $('account-open').textContent=logged?user.username:t('guestAccount');
        $('account-server-open').textContent=logged?user.username:t('guestAccount');
        var name=$('multiplayer-name');if(name){name.readOnly=true;name.value=user?user.characterName:profile().characterName;}
        $('account-current').textContent=logged?user.username:'';$('account-current').hidden=!logged;
        $('account-profile').textContent=logged?user.characterName+' · '+user.email:'';$('account-profile').hidden=!logged;
        $('account-form').hidden=logged||welcome;$('account-welcome').hidden=!welcome;
        $('account-tabs').hidden=logged||welcome;$('account-tab-login').hidden=!register;$('account-tab-register').hidden=register;
        $('account-guest').hidden=!welcome;$('account-brand').hidden=true;
        $('account-content').classList.toggle('is-welcome',welcome);
        $('account-back').hidden=logged||welcome;$('account-close').hidden=!!pending;
        $('account-logout').hidden=!logged;
        $('account-title').textContent=t(logged?'account':welcome?'title':register?'register':'login');
        text('start-btn','play');text('start-register','register');text('account-create','register');text('account-back','back');text('account-tab-login','toLogin');text('account-tab-register','toRegister');text('account-logout','logout');
        $('account-close').setAttribute('aria-label',t('close'));
        $('account-guest').textContent=t(busy?'connecting':'play');$('account-submit').textContent=t(busy?'saving':register?'register':'login');
        text('account-login-label',register?'username':'identity');text('account-email-label','email');text('account-password-label','password');
        $('account-login').placeholder=register?t('usernameHint'):'';$('account-password').placeholder=register?t('passwordHint'):'';
        text('account-registration-note','saveHint');$('account-registration-note').hidden=!register||welcome||logged;
        text('account-details-label','details');text('account-details-copy','detailsCopy');$('account-details').hidden=!register||welcome||logged;
        text('character-name-title','nameTitle');text('character-name-label','nameLabel');text('character-name-hint','nameHint');text('character-name-submit','nameSubmit');text('character-name-back','nameBack');$('character-name-input').placeholder=t('namePlaceholder');
        var hero=typeof CHARACTERS!=='undefined'&&CHARACTERS[selectedChar];$('character-name-hero').textContent=t('hero')+(hero?hero.name:t('title'));
        text('journey-settings-label','settings');text('journey-consent-label','metrics');text('journey-updates-label','updates');
        text('character-resume-title','resumeTitle');text('character-resume-play','resumePlay');text('character-resume-change','resumeChange');
        $('character-resume-name').textContent=user?user.characterName:'';
        var lastHero=user&&typeof CHARACTERS!=='undefined'&&CHARACTERS[user.character];
        $('character-resume-hero').textContent=lastHero?lastHero.name:'';
        ['account-language','character-name-language','character-resume-language'].forEach(function(id){$(id).value=typeof _langMode==='string'?_langMode:'auto';});
    }
    function lock(open){
        window._accountPanelOpen=open;
        if(typeof keys!=='undefined')for(var k in keys)keys[k]=false;
        if(typeof joyActive!=='undefined')joyActive=false;
        if(typeof joyVec!=='undefined')joyVec={x:0,y:0};
    }
    function chooseMode(next){
        mode=['welcome','register','login'].indexOf(next)>=0?next:'welcome';
        $('account-email-row').hidden=mode!=='register';$('account-email').required=mode==='register';
        $('account-password').autocomplete=mode==='register'?'new-password':'current-password';
        $('account-password').minLength=mode==='register'?15:1;
        $('account-login').maxLength=mode==='register'?16:254;
        $('account-password').value='';$('account-details').open=false;
        $('account-message').textContent='';
        render();$('account-content').scrollTop=0;
        if(!box.classList.contains('hidden'))focusEntry();
    }
    function focusEntry(){(mode==='welcome'?$('account-guest'):$('account-language')).focus({preventScroll:true});}
    function open(next){
        if(!endpoint&&window.DANBO_MULTIPLAYER)configure(window.DANBO_MULTIPLAYER.getEndpoint());
        lastFocus=document.activeElement;chooseMode(next||'register');
        $('account-password').value='';box.classList.remove('hidden');lock(true);
        updateViewport();focusEntry();
    }
    function close(){
        if(busy)return;
        box.classList.add('hidden');$('account-password').value='';lock(false);
        if(lastFocus&&lastFocus.focus)lastFocus.focus();
        if(pending){pending(false);pending=null;}
    }
    async function adopt(data,reason){
        var ready=data.user.kind==='guest'?guestConfirmed(savedGuest()):reason==='register'?canContinue():data.characterReady!==false;
        if(reason==='handoff')ready=true;
        session={token:data.token,expiresAt:data.expiresAt,user:data.user,characterReady:ready};storeSession();
        if(data.user.kind==='guest')rememberGuest(data.user,ready);
        if(typeof selectedChar==='number'&&gameState!=='city'){
            restoreCharacter(data.user);
        }
        render();
        if(window.DANBO_PROGRESS)await DANBO_PROGRESS.activate(data.user,reason||'resume',data.snapshot);
        if(window.DANBO_JOURNEY)DANBO_JOURNEY.event('open');
    }
    async function resume(){
        if(session&&session.expiresAt>Date.now())return true;
        var stored;try{stored=JSON.parse(sessionStorage.getItem(storageKey())||'null');}catch(_){}
        if(!stored||stored.expiresAt<=Date.now())return false;
        try{
            var data=await api('/me',undefined,stored.token),saved=savedGuest();
            // A previous tab can have an older ephemeral guest session. The last
            // confirmed browser profile wins, never the tab's stale default hero.
            if(data.user.kind==='guest'&&guestConfirmed(saved)&&(data.user.characterName!==saved.characterName||data.user.character!==saved.character||data.user.style!==saved.style)){
                var updated=await api('/character',{characterName:saved.characterName,character:saved.character,style:saved.style},stored.token);data.user=updated.user;
            }
            await adopt(Object.assign({},data,{token:stored.token,characterReady:stored.characterReady}),'resume');return true;
        }
        catch(error){if(error.status===401){clearSession();return false;}throw error;}
    }
    async function ensure(value,entry){
        configure(value);var restored;
        try{restored=await resume();resumeRetry=false;}catch(error){
            resumeRetry=true;
            return new Promise(function(resolve){if(pending)pending(false);pending=resolve;open('welcome');$('account-message').textContent=UI_T(error.message||'连接失败，请重试');});
        }
        if(restored&&!(entry==='register'&&session.user.kind==='guest'))return true;
        return new Promise(function(resolve){
            if(pending)pending(false);pending=resolve;open(entry==='register'?'register':'welcome');
            // The title's Play button already expresses guest intent: never ask twice.
            if(entry==='play')submit('guest');
        });
    }
    async function submit(kind){
        if(busy||(kind!=='guest'&&mode!=='login'&&mode!=='register'))return;
        busy=true;$('account-submit').disabled=true;$('account-guest').disabled=true;$('account-create').disabled=true;render();
        var old=session,oldRoom=window.DANBO_MULTIPLAYER&&DANBO_MULTIPLAYER.getRoom();
        var roomCode=oldRoom&&oldRoom.state&&oldRoom.state.code;
        try{
            if(kind==='guest'&&resumeRetry){
                var restored=await resume();resumeRetry=false;
                if(restored){var retryDone=pending;pending=null;busy=false;close();if(retryDone)retryDone(true);return;}
            }
            var current=profile(),data;
            if(kind==='guest')data=await api('/guest',current);
            else if(mode==='register')data=await api('/register',Object.assign({},current,{username:$('account-login').value,email:$('account-email').value,password:$('account-password').value,emailUpdates:false}));
            else data=await api('/login',{login:$('account-login').value,password:$('account-password').value});
            await adopt(data,kind==='guest'?'guest':mode);$('account-password').value='';
            if(old&&old.token!==session.token)api('/logout',{},old.token).catch(function(){});
            var done=pending;pending=null;busy=false;close();if(done)done(true);
            if(gameState==='city'&&kind!=='guest'&&mode==='login'){await DANBO_MULTIPLAYER.leave();location.reload();return;}
            if(roomCode)await DANBO_MULTIPLAYER.connect(roomCode); // promotion keeps current city/position
        }catch(error){$('account-message').textContent=UI_T(error.message||'连接失败，请重试');}
        finally{busy=false;$('account-submit').disabled=false;$('account-guest').disabled=false;$('account-create').disabled=false;render();}
    }
    function requestCharacter(reuse){
        if(namePending)return Promise.resolve(false);
        if(reuse===true&&canContinue()&&selectedChar===session.user.character&&window.DANBO_SELECTED_CHARACTER_STYLE===session.user.style)return Promise.resolve(true);
        var current=profile();$('character-name-input').value=current.characterName;
        $('character-name-message').textContent='';
        render();
        nameBox.classList.remove('hidden');lock(true);
        updateViewport();
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
            if(!session)throw new Error(UI_T('请先选择游客或登录账号'));
            var data=await api('/character',current,session.token);
            session.user=data.user;
            session.characterReady=true;storeSession();
            if(session.user.kind==='guest')rememberGuest(data.user,true);
            render();finishName(true);
        }catch(error){$('character-name-message').textContent=UI_T(error.message||'保存失败，请重试');}
        finally{busy=false;$('character-name-submit').disabled=false;}
    });
    $('character-name-back').addEventListener('click',function(){if(!busy)finishName(false);});
    $('character-resume-play').addEventListener('click',function(){finishContinue(true);});
    $('character-resume-change').addEventListener('click',function(){finishContinue(false);});
    $('account-form').addEventListener('submit',function(event){event.preventDefault();submit('account');});
    $('account-guest').addEventListener('click',function(){submit('guest');});
    $('account-create').addEventListener('click',function(){if(!busy)chooseMode('register');});
    $('account-back').addEventListener('click',function(){if(!busy){if(pending)chooseMode('welcome');else close();}});
    $('account-tab-login').addEventListener('click',function(){if(!busy)chooseMode('login');});
    $('account-tab-register').addEventListener('click',function(){if(!busy)chooseMode('register');});
    $('account-close').addEventListener('click',close);
    [$('account-open'),$('account-server-open')].forEach(function(button){button.addEventListener('click',function(){open('register');});});
    $('account-logout').addEventListener('click',async function(){
        if(busy)return;busy=true;
        try{if(window.DANBO_PROGRESS)await DANBO_PROGRESS.flush();await api('/logout',{},session.token);await DANBO_MULTIPLAYER.leave();clearSession();busy=false;location.reload();}
        catch(error){$('account-message').textContent=error.message;busy=false;}
    });
    [box,nameBox,continueBox].forEach(function(panel){
        panel.addEventListener('keydown',function(event){
            event.stopPropagation(); // typing must not move characters or trigger menu shortcuts
            if(event.code==='Escape'&&!busy){event.preventDefault();if(panel===continueBox)finishContinue(false);else if(panel===box&&pending)chooseMode('welcome');else panel===box?close():finishName(false);}
            if(event.key==='Tab'){
                var focusable=Array.from(panel.querySelectorAll('button,input,select,summary')).filter(function(e){return !e.disabled&&e.getClientRects().length;});
                var first=focusable[0],last=focusable[focusable.length-1];
                if(!first)return;
                if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
                else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
            }
        });
        panel.addEventListener('keyup',function(event){event.stopPropagation();});
    });
    ['account-language','character-name-language','character-resume-language'].forEach(function(id){$(id).addEventListener('change',function(){if(typeof _setLanguage==='function')_setLanguage(this.value);render();});});
    function updateViewport(){
        var v=window.visualViewport,h=v?v.height:window.innerHeight,top=v?v.offsetTop:0;
        if(!h)return;
        if(document.documentElement&&document.documentElement.classList.contains('danbo-ios-embedded'))h-=72;
        [box,nameBox,continueBox].forEach(function(panel){panel.style.height=h+'px';panel.style.top=top+'px';panel.style.bottom='auto';panel.style.setProperty('--account-viewport-height',h+'px');});
    }
    window.addEventListener('resize',updateViewport);
    if(window.visualViewport){window.visualViewport.addEventListener('resize',updateViewport);window.visualViewport.addEventListener('scroll',updateViewport);}
    window.DANBO_ACCOUNT={ensure:ensure,open:open,requestCharacter:requestCharacter,offerContinue:offerContinue,
        request:function(path,body){if(!endpoint)configure(DANBO_MULTIPLAYER.getEndpoint());return api(path,body,session&&session.token);},
        acceptHandoff:async function(data){var old=session;await adopt(data,'handoff');if(old)api('/logout',{},old.token).catch(function(){});},
        getUser:function(){return session&&session.user;},
        getToken:function(value){configure(value);return session&&session.expiresAt>Date.now()?session.token:null;},
        invalidate:clearSession,refreshLanguage:render};
    render();
})();
