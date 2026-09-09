// multiplayer.js — four persistent public Colyseus shards plus private rooms.
// The SDK is loaded only when a player joins, so single-player startup and FPS
// are unchanged. Remote avatars stay outside local NPC/reward authority;
// network-interactions handles body blocking and server-confirmed carry/throw.
(function(){
    'use strict';

    var ROOM_NAME='danbo_city';
    var SEND_INTERVAL=1000/15;
    var remotes=new Map();
    var client=null,room=null,joining=false,manualLeave=false;
    var lastSendAt=0,lastSentCity=-1,sequence=0,pendingAutoCode='';
    var playerListSignature='',buttonSignature='',sdkPromise=null;
    var status='offline',statusText='未连接';
    var selectedServerEndpoint='',selectedServerReady=false;
    var serverEntries=[],selectedServerCode=requestedRoomCode(),serverRefreshSerial=0;
    var serverChosen=new URLSearchParams(location.search).has('room');
    var lastAppearance='',lastAppearanceAt=0,appearanceBudgetAt=0,appearanceIds=new Set();
    var selectedCapacity=0,lastServerPing=0;
    var companionBudgetAt=0,companionIds=new Set();
    function eachActor(fn){
        if(window.DANBO_COMPANIONS)DANBO_COMPANIONS.each(room&&room.state,fn);
        else if(room&&room.state&&room.state.players)room.state.players.forEach(function(p,id){fn(p,id,false);});
    }

    var ui={
        button:document.getElementById('multiplayer-btn'),
        overlay:document.getElementById('multiplayer-overlay'),
        close:document.getElementById('multiplayer-close'),
        badge:document.getElementById('multiplayer-status'),
        serverScreen:document.getElementById('server-select-screen'),
        serverList:document.getElementById('server-list'),
        capacity:document.getElementById('multiplayer-capacity'),
        serverRefresh:document.getElementById('server-list-refresh'),
        serverBack:document.getElementById('server-list-back'),
        serverEnter:document.getElementById('server-list-enter'),
        serverSummary:document.getElementById('server-browser-summary'),
        summary:document.getElementById('multiplayer-summary'),
        name:document.getElementById('multiplayer-name'),
        code:document.getElementById('multiplayer-code'),
        endpoint:document.getElementById('multiplayer-endpoint'),
        quick:document.getElementById('multiplayer-quick'),
        browse:document.getElementById('multiplayer-browse'),
        create:document.getElementById('multiplayer-create'),
        join:document.getElementById('multiplayer-join'),
        leave:document.getElementById('multiplayer-leave'),
        share:document.getElementById('multiplayer-share'),
        list:document.getElementById('multiplayer-player-list')
    };

    function normalizeCode(value){
        var code=String(value||'PUBLIC').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);
        return code||'PUBLIC';
    }
    function normalizeEndpoint(value){
        var endpoint=String(value||'').trim().replace(/\/+$/,'');
        if(!endpoint)return '';
        if(!/^[a-z]+:\/\//i.test(endpoint))endpoint='wss://'+endpoint;
        endpoint=endpoint.replace(/^http:/i,'ws:').replace(/^https:/i,'wss:');
        if(location.protocol==='https:'&&/^ws:/i.test(endpoint)&&!/^ws:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(endpoint)){
            endpoint=endpoint.replace(/^ws:/i,'wss:');
        }
        return endpoint;
    }
    function configuredEndpoint(){
        var query='';
        try{query=new URLSearchParams(location.search).get('net')||'';}catch(e){}
        var saved='';
        try{saved=localStorage.getItem('danbo_multiplayer_server_v2')||'';}catch(e){}
        var declared=window.DANBO_MULTIPLAYER_URL||'';
        if(!query&&location.hostname==='danbo.kryso.net')return 'wss://'+location.host;
        if(!query&&!saved&&!declared){
            if(location.hostname==='localhost'||location.hostname==='127.0.0.1')declared='ws://'+location.hostname+':2567';
        }
        return normalizeEndpoint(query||saved||declared);
    }
    function isPublicCode(code){return /^PUBLIC(?:[234])?$/.test(code);}
    function serverPopulation(entry){
        // Activity is everyone actually present, not occupied human seats. Older
        // servers omit bots; never invent a count or trust a stale total field.
        if(entry.status==='offline')return 0;
        return (Number.isInteger(entry.players)&&entry.players>0?entry.players:0)+
            (Number.isInteger(entry.bots)&&entry.bots>0?entry.bots:0);
    }
    function displayServerName(entry){return /^DANBO [1-4] 服$/.test(entry.name)?UI_T('服务器 {n}',{n:entry.code==='PUBLIC'?'1':entry.code.slice(-1)}):entry.name;}
    function serverLabel(code){
        var entry=serverEntries.find(function(item){return item.code===code;});
        return entry?displayServerName(entry):isPublicCode(code)?UI_T('服务器 {n}',{n:code==='PUBLIC'?'1':code.slice(-1)}):code;
    }
    async function fetchServerEntries(endpoint){
        var controller=typeof AbortController!=='undefined'?new AbortController():null;
        var timeout=setTimeout(function(){if(controller)controller.abort();},5000);
        try{
            var url=endpoint.replace(/^ws:/i,'http:').replace(/^wss:/i,'https:')+'/servers';
            var response=await fetch(url,{cache:'no-store',signal:controller?controller.signal:undefined});
            if(response.status===404)throw new Error(UI_T('服务器版本较旧，请先升级服务器'));
            var data=response.ok?await response.json():{};
            if(!response.ok||data.ok!==true||!Array.isArray(data.servers))throw new Error(UI_T('无法获取服务器列表'));
            return data.servers.filter(function(item){
                return item&&isPublicCode(item.code)&&typeof item.name==='string'&&
                    typeof item.roomId==='string'&&Number.isInteger(item.capacity)&&item.capacity>0;
            });
        }finally{clearTimeout(timeout);}
    }
    function selectServer(code){
        selectedServerCode=code;
        var entry=serverEntries.find(function(item){return item.code===code;});
        selectedServerReady=!!entry&&entry.status==='online'&&entry.available>0;
        selectedCapacity=entry?entry.capacity:0;
        if(ui.serverEnter)ui.serverEnter.disabled=!selectedServerReady;
        if(ui.serverList)Array.from(ui.serverList.children).forEach(function(button){
            var selected=button.dataset.code===code;
            button.classList.toggle('selected',selected);
            button.setAttribute('aria-selected',String(selected));
        });
    }
    function renderServerList(ping){
        lastServerPing=ping;
        if(!ui.serverList)return;
        ui.serverList.textContent='';
        var address='';
        try{address=new URL(selectedServerEndpoint).host;}catch(_error){}
        var recommended=serverEntries.filter(function(e){return e.status==='online'&&e.available>0;}).sort(function(a,b){return b.players-a.players||serverPopulation(b)-serverPopulation(a)||b.available-a.available;})[0];
        if(!serverChosen&&recommended)selectedServerCode=recommended.code;
        serverEntries.forEach(function(entry){
            var button=document.createElement('button');
            button.type='button';button.className='server-list-item '+entry.status;
            button.dataset.code=entry.code;button.setAttribute('role','option');
            // Only this fixed template uses innerHTML; all server-supplied text
            // is assigned with textContent (names and endpoints are untrusted).
            button.innerHTML=UI_HTML('<span class="server-state-dot" aria-hidden="true"></span><span class="server-main-copy"><strong></strong><small></small></span><span class="server-region">公共分区</span><span class="server-metric"><b></b><small>在线 / 容量</small></span><span class="server-metric server-ping"><b></b><small>延迟</small></span><span class="server-state-text"></span>');
            button.querySelector('strong').textContent=displayServerName(entry);
            button.querySelector('.server-main-copy small').textContent=address;
            if(recommended&&entry.code===recommended.code)button.querySelector('.server-region').textContent=UI_T('推荐同服');
            var metrics=button.querySelectorAll('.server-metric b');
            metrics[0].textContent=entry.status==='offline'?UI_T('离线'):UI_T('在线 {n}',{n:serverPopulation(entry)});
            button.querySelector('.server-metric small').textContent=UI_T('空位 {n}',{n:entry.status==='offline'?0:Math.max(0,Math.min(entry.capacity,Number(entry.available)||0))});
            if(window.DANBO_COMPANIONS&&Number.isInteger(entry.bots)&&entry.bots>0&&entry.status!=='offline'){
                // Keep the breakdown available on demand, not a prominent
                // "0 players" subtitle underneath an otherwise active world.
                button.title=DANBO_COMPANIONS.detail(entry.players,entry.bots,entry.capacity)+' ('+DANBO_COMPANIONS.words().seats+')';
            }
            metrics[1].textContent=ping+'ms';
            button.querySelector('.server-state-text').textContent=entry.status==='full'?UI_T('已满（含预留席位）'):entry.status==='online'?UI_T('可进入'):UI_T('离线');
            button.addEventListener('click',function(){serverChosen=true;selectServer(entry.code);});
            ui.serverList.appendChild(button);
        });
        if(!serverEntries.some(function(entry){return entry.code===selectedServerCode;}))selectedServerCode='PUBLIC';
        selectServer(selectedServerCode);
    }
    async function refreshServerList(){
        if(!ui.serverList)return false;
        var serial=++serverRefreshSerial,endpoint=configuredEndpoint();
        selectedServerReady=false;selectedServerEndpoint=endpoint;
        if(ui.serverRefresh)ui.serverRefresh.disabled=true;
        if(ui.serverEnter)ui.serverEnter.disabled=true;
        ui.serverList.setAttribute('aria-busy','true');
        if(ui.serverSummary)ui.serverSummary.textContent=UI_T('正在获取服务器状态…');
        var started=performance.now();
        try{
            if(!endpoint)throw new Error(UI_T('没有可用的服务器地址'));
            var entries=await fetchServerEntries(endpoint);
            if(serial!==serverRefreshSerial)return false;
            serverEntries=entries;
            renderServerList(Math.max(1,Math.round(performance.now()-started)));
            var available=entries.filter(function(entry){return entry.status==='online';}).length;
            if(ui.serverSummary)ui.serverSummary.textContent=UI_T('{total} 个公共分区 · {available} 个可进入 · 不同分区互不相通',{total:entries.length,available:available});
            return true;
        }catch(error){
            if(serial!==serverRefreshSerial)return false;
            serverEntries=[];selectedServerReady=false;ui.serverList.textContent='';
            if(ui.serverSummary)ui.serverSummary.textContent=error.name==='AbortError'?UI_T('服务器响应超时，请刷新重试'):String(error.message||UI_T('服务器暂时不可用，请刷新重试'));
            return false;
        }finally{
            if(serial===serverRefreshSerial){ui.serverList.setAttribute('aria-busy','false');if(ui.serverRefresh)ui.serverRefresh.disabled=false;}
        }
    }
    function requestedRoomCode(){
        try{return normalizeCode(new URLSearchParams(location.search).get('room')||'PUBLIC');}catch(_error){return 'PUBLIC';}
    }
    function enterSelectedServer(){
        if(!selectedServerReady||!selectedServerEndpoint)return false;
        if(window.DANBO_ACCOUNT&&!DANBO_ACCOUNT.getToken(selectedServerEndpoint)){
            DANBO_ACCOUNT.ensure(selectedServerEndpoint).then(function(ok){if(ok)enterSelectedServer();});return false;
        }
        try{localStorage.setItem('danbo_multiplayer_server_v2',selectedServerEndpoint);}catch(_error){}
        if(ui.endpoint)ui.endpoint.value=selectedServerEndpoint;
        if(gameState==='city'&&playerEgg){
            if(joining)return false;
            if(ui.serverEnter)ui.serverEnter.disabled=true;
            connectRoom(selectedServerCode).then(function(ok){
                if(ok){if(typeof showScreen==='function')showScreen(null);closePanel();}
                else refreshServerList();
            });
            return true;
        }
        pendingAutoCode=selectedServerCode;
        // Preserve private invitations, but public invitations select their exact shard.
        var invited=requestedRoomCode();
        if(!isPublicCode(invited))pendingAutoCode=invited;
        if(typeof window.DANBO_OPEN_CHARACTER_SELECT==='function')window.DANBO_OPEN_CHARACTER_SELECT();
        return true;
    }
    async function openServerBrowser(entry){
        if(window.DANBO_ACCOUNT&&!await DANBO_ACCOUNT.ensure(configuredEndpoint(),entry))return false;
        closePanel();
        if(ui.serverBack)ui.serverBack.hidden=gameState!=='city';
        if(gameState==='city')window._multiplayerPanelOpen=true;
        if(typeof showScreen==='function')showScreen('server-select-screen');
        refreshServerList();
    }
    function currentName(){
        var account=window.DANBO_ACCOUNT&&DANBO_ACCOUNT.getUser();
        if(account)return account.characterName;
        var name=ui.name?ui.name.value.trim():'';
        if(!name){
            try{name=(localStorage.getItem('danbo_player_name')||'').trim();}catch(e){}
        }
        if(!name&&typeof CHARACTERS!=='undefined'&&CHARACTERS[selectedChar])name=CHARACTERS[selectedChar].name;
        return (name||'Player').replace(/[\u0000-\u001f\u007f]/g,'').slice(0,16);
    }
    function currentStyle(){return window.DANBO_SELECTED_CHARACTER_STYLE==='classic'?'classic':'cinematic';}
    function localStateOptions(){
        var p=playerEgg&&playerEgg.mesh&&playerEgg.mesh.position;
        return {
            name:currentName(),character:Math.max(0,Math.min(7,selectedChar|0)),style:currentStyle(),
            city:typeof currentCityStyle==='number'?currentCityStyle:0,
            x:p?p.x:0,y:p?p.y:0.01,z:p?p.z:0,
            rotation:playerEgg&&playerEgg.mesh?playerEgg.mesh.rotation.y:0,
            appearance:window.DANBO_APPEARANCE?DANBO_APPEARANCE.selected():'{}'
        };
    }
    function randomCode(){
        var alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',out='';
        var bytes=new Uint8Array(6);
        if(window.crypto&&crypto.getRandomValues)crypto.getRandomValues(bytes);
        else for(var i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);
        for(var j=0;j<6;j++)out+=alphabet.charAt(bytes[j]%alphabet.length);
        return out;
    }
    function setStatus(next,text){
        status=next;statusText=text||next;
        if(ui.badge){ui.badge.className='multiplayer-status '+next;ui.badge.textContent=UI_T(statusText);}
        updateButton();
    }
    function updateButton(){
        if(!ui.button)return;
        var text=UI_T('服务器'),online=false,title='';
        if(room&&status==='online'){
            var count=room.state&&room.state.players?room.state.players.size:1;
            var capacity=Number(room.state&&room.state.capacity)||selectedCapacity;
            var code=normalizeCode(room.state&&room.state.code);
            title=serverLabel(normalizeCode(room.state&&room.state.code||ui.code&&ui.code.value));
            if(window.DANBO_COMPANIONS){
                var totals=DANBO_COMPANIONS.count(room.state);
                count=totals.characters;
                if(totals.bots){
                    title+=' · '+DANBO_COMPANIONS.detail(totals.players,totals.bots,capacity)+' ('+DANBO_COMPANIONS.words().seats+')';
                }
            }
            var populationText=UI_T('在线 {n}',{n:count});
            text=(isPublicCode(code)?(code==='PUBLIC'?'1':code.slice(-1))+' · ':'')+populationText;online=true;
            if(ui.capacity)ui.capacity.textContent=populationText+' · '+(capacity?UI_T('最多 {n} 人',{n:capacity}):UI_T('读取容量中…'));
        }else if(status==='joining'||status==='reconnecting'){
            text=UI_T('连接中');
        }
        var signature=text+'|'+online+'|'+title;
        if(signature===buttonSignature)return;
        buttonSignature=signature;
        ui.button.textContent=text;
        ui.button.classList.toggle('online',online);
        ui.button.title=title;
    }
    function messageForError(error){
        var text=String(error&&error.message||error||UI_T('连接失败'));
        if(/full|seat|locked|4212|4213/i.test(text))return UI_T('所选服务器已满或席位被预留，请选择其他服务器');
        if(/fetch|network|websocket|connect|failed/i.test(text))return UI_T('无法连接联机服务器');
        return text.slice(0,80);
    }
    function showSummary(text,isError){
        if(!ui.summary)return;
        ui.summary.textContent=text;
        ui.summary.classList.toggle('error',!!isError);
    }
    function ensureSDK(){
        if(window.Colyseus&&window.Colyseus.ColyseusSDK)return Promise.resolve(window.Colyseus);
        if(sdkPromise)return sdkPromise;
        sdkPromise=new Promise(function(resolve,reject){
            var script=document.createElement('script');
            var version=window.DANBO_ASSET_VERSION||'v=1';
            script.src='js/vendor/colyseus-0.18.2.js?'+version;
            script.async=true;
            script.onload=function(){
                if(window.Colyseus&&window.Colyseus.ColyseusSDK)resolve(window.Colyseus);
                else reject(new Error(UI_T('联机组件加载失败')));
            };
            script.onerror=function(){reject(new Error(UI_T('联机组件加载失败')));};
            document.head.appendChild(script);
        }).catch(function(error){sdkPromise=null;throw error;});
        return sdkPromise;
    }
    function saveSettings(endpoint,name){
        try{
            localStorage.setItem('danbo_multiplayer_server_v2',endpoint);
            localStorage.setItem('danbo_player_name',name);
        }catch(e){}
    }
    function openPanel(){
        if(!ui.overlay)return;
        ui.overlay.classList.remove('hidden');
        window._multiplayerPanelOpen=true;
        if(ui.endpoint&&!ui.endpoint.value)ui.endpoint.value=configuredEndpoint();
        if(ui.name&&!ui.name.value)ui.name.value=currentName();
        if(ui.code&&!ui.code.value)ui.code.value=room&&room.state?room.state.code:'PUBLIC';
        refreshPlayerList();
    }
    function closePanel(){
        if(ui.overlay)ui.overlay.classList.add('hidden');
        window._multiplayerPanelOpen=false;
        if(typeof keys!=='undefined')for(var key in keys)keys[key]=false;
        if(typeof R!=='undefined'&&R.domElement)R.domElement.focus();
    }
    function makeNameSprite(name){
        var sprite=DANBO_WORLD_LABELS.create('name');sprite.position.y=2.25;
        DANBO_WORLD_LABELS.setText(sprite,String(name||'Player').slice(0,16));
        return sprite;
    }
    function rebuildRemoteAvatar(remote,statePlayer){
        if(remote.avatar){remote.root.remove(remote.avatar);disposeTransientObject3D(remote.avatar);}
        var index=Math.max(0,Math.min(7,Number(statePlayer.character)||0));
        var skin=CHARACTERS[index]||CHARACTERS[0];
        remote.avatar=createEggMesh(skin.color,skin.accent,skin.type,statePlayer.style==='classic'?'classic':'cinematic');
        remote.root.add(remote.avatar);
        remote.character=index;remote.style=statePlayer.style;
        remote.appearance=null;
        remote.footBase=[];
        var feet=remote.avatar.userData.feet||[];
        for(var i=0;i<feet.length;i++)remote.footBase.push(feet[i].position.clone());
    }
    function rebuildRemoteName(remote,name){
        if(remote.nameSprite){
            remote.root.remove(remote.nameSprite);
            disposeTransientObject3D(remote.nameSprite,true);
        }
        remote.nameSprite=makeNameSprite(name);remote.root.add(remote.nameSprite);remote.name=name;
    }
    function createRemote(sessionId,statePlayer,isCompanion){
        var root=new THREE.Group();root.name='danbo-network-player-'+sessionId;scene.add(root);
        var remote={id:sessionId,root:root,avatar:null,nameSprite:null,name:'',character:-1,style:'',walkPhase:0,footBase:[],egg:null};
        remote.companion=!!isCompanion;
        remote.egg={mesh:root,alive:true,isNetworkPlayer:true,isSystemCompanion:!!isCompanion};
        rebuildRemoteAvatar(remote,statePlayer);rebuildRemoteName(remote,statePlayer.name);
        root.position.set(Number(statePlayer.x)||0,Number(statePlayer.y)||0,Number(statePlayer.z)||0);
        root.rotation.y=Number(statePlayer.rotation)||0;
        remotes.set(sessionId,remote);
        return remote;
    }
    function removeRemote(sessionId){
        var remote=remotes.get(sessionId);if(!remote)return;
        scene.remove(remote.root);
        if(remote.avatar)disposeTransientObject3D(remote.avatar);
        if(remote.nameSprite)disposeTransientObject3D(remote.nameSprite,true);
        remotes.delete(sessionId);
    }
    function removeAllRemotes(){var ids=Array.from(remotes.keys());for(var i=0;i<ids.length;i++)removeRemote(ids[i]);}
    function angleLerp(current,target,alpha){
        var delta=((target-current+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;
        return current+delta*alpha;
    }
    function animateRemote(remote,statePlayer,dt){
        var avatar=remote.avatar;if(!avatar)return;
        var speed=Math.hypot(Number(statePlayer.vx)||0,Number(statePlayer.vz)||0);
        remote.walkPhase+=Math.min(0.48,speed*1.8+0.035)*(speed>0.008?1:0)*Math.min(3,dt*60);
        if(speed<=0.008)remote.walkPhase*=0.92;
        var feet=avatar.userData.feet||[];
        for(var i=0;i<feet.length&&i<remote.footBase.length;i++){
            var base=remote.footBase[i],wave=Math.sin(remote.walkPhase+(i?Math.PI:0));
            feet[i].position.z=base.z+wave*0.14;
            feet[i].position.y=base.y+Math.max(0,wave)*0.07;
        }
        var body=avatar.userData.body;
        if(body){
            var wanted=speed>0.008?Math.sin(remote.walkPhase)*Math.min(0.08,speed*0.22):0;
            body.rotation.z+=(wanted-body.rotation.z)*Math.min(1,dt*10);
        }
        var action=String(statePlayer.action||'idle');
        var rightArm=avatar.userData.rightArm,leftArm=avatar.userData.leftArm;
        var rightLeg=avatar.userData.rightLeg,leftLeg=avatar.userData.leftLeg;
        if(rightArm){rightArm.visible=action==='punch'||action==='grab';rightArm.position.set(0.4,0.2,action==='punch'?1.18:0.82);}
        if(leftArm){leftArm.visible=action==='grab';leftArm.position.set(-0.4,0.2,0.82);}
        if(rightLeg){rightLeg.visible=action==='kick';rightLeg.position.set(0.24,0.12,0.88);rightLeg.rotation.x=-Math.PI/2.35;}
        if(leftLeg)leftLeg.visible=false;
        if(action==='jump')avatar.position.y=Math.sin(performance.now()*0.015)*0.035;
        else avatar.position.y*=0.78;
        if(remote.companion&&window.DANBO_COMPANIONS)DANBO_COMPANIONS.animate(avatar,action,dt);
    }
    function syncRemotePlayers(dt){
        if(!room||!room.state||!room.state.players)return;
        var now=performance.now();
        if(now-appearanceBudgetAt>500||!appearanceBudgetAt){
            appearanceBudgetAt=now;var candidates=[],p=playerEgg&&playerEgg.mesh.position;
            if(p)eachActor(function(other,id){if(id!==room.sessionId&&Number(other.city)===Number(currentCityStyle)&&other.connected!==false){var d=Math.hypot(Number(other.x)-p.x,Number(other.z)-p.z);if(d<32)candidates.push({id:id,d:d});}});
            candidates.sort(function(a,b){return a.d-b.d;});var q=window.DANBO_VISUAL_QUALITY;
            appearanceIds=new Set(candidates.slice(0,q&&q.low?2:q&&q.high?6:4).map(function(v){return v.id;}));
        }
        var present=new Set(),list=[];
        if(now-companionBudgetAt>500||!companionBudgetAt){
            companionBudgetAt=now;var near=[],local=playerEgg&&playerEgg.mesh.position;
            if(local)eachActor(function(p,id,bot){if(bot&&p.connected!==false&&Number(p.city)===Number(currentCityStyle)){var d=Math.hypot(Number(p.x)-local.x,Number(p.z)-local.z);if(d<42)near.push({id:id,d:d});}});
            near.sort(function(a,b){return a.d-b.d;});var quality=window.DANBO_VISUAL_QUALITY;
            companionIds=new Set(near.slice(0,quality&&quality.low?3:quality&&quality.high?6:4).map(function(p){return p.id;}));
        }
        eachActor(function(statePlayer,sessionId,isCompanion){
            list.push({id:sessionId,name:statePlayer.name,city:statePlayer.city,connected:statePlayer.connected,companion:isCompanion});
            if(sessionId===room.sessionId)return;
            present.add(sessionId);
            var visible=gameState==='city'&&!window._interiorActive&&!window._danboPluginTransition&&
                Number(statePlayer.city)===Number(currentCityStyle)&&statePlayer.connected!==false&&(!isCompanion||companionIds.has(sessionId));
            if(!visible){removeRemote(sessionId);return;}
            var remote=remotes.get(sessionId)||createRemote(sessionId,statePlayer,isCompanion);
            if(remote.character!==Number(statePlayer.character)||remote.style!==statePlayer.style)rebuildRemoteAvatar(remote,statePlayer);
            if(remote.name!==statePlayer.name)rebuildRemoteName(remote,statePlayer.name);
            if(window.DANBO_APPEARANCE){
                var gear=appearanceIds.has(sessionId)?String(statePlayer.appearance||'{}'):'{}';
                if(gear!==remote.appearance){remote.appearance=gear;remote.hasGear=DANBO_APPEARANCE.apply(remote.avatar,gear);}
                if(remote.nameSprite)remote.nameSprite.position.y=remote.hasGear?2.9:2.25;
                DANBO_APPEARANCE.tick(remote.avatar,dt);
            }
            remote.root.visible=true;
            var alpha=1-Math.exp(-dt/0.085);
            remote.root.position.x+=(Number(statePlayer.x)-remote.root.position.x)*alpha;
            remote.root.position.y+=(Number(statePlayer.y)-remote.root.position.y)*alpha;
            remote.root.position.z+=(Number(statePlayer.z)-remote.root.position.z)*alpha;
            remote.root.rotation.y=angleLerp(remote.root.rotation.y,Number(statePlayer.rotation)||0,alpha);
            animateRemote(remote,statePlayer,dt);
        });
        var ids=Array.from(remotes.keys());
        for(var i=0;i<ids.length;i++)if(!present.has(ids[i]))removeRemote(ids[i]);
        refreshPlayerList(list);
        updateButton();
    }
    function refreshPlayerList(optionalList){
        if(!ui.list)return;
        var list=optionalList||[];
        if(!optionalList&&room&&room.state&&room.state.players){
            eachActor(function(player,id,bot){list.push({id:id,name:player.name,city:player.city,connected:player.connected,companion:bot});});
        }
        var signature=(typeof _langCode==='undefined'?'':_langCode)+'|'+list.map(function(p){return p.id+':'+p.name+':'+p.city+':'+p.connected+':'+p.companion;}).join('|');
        if(signature===playerListSignature)return;playerListSignature=signature;
        ui.list.textContent='';
        if(!list.length){var empty=document.createElement('li');empty.textContent=UI_T('尚未加入房间');ui.list.appendChild(empty);return;}
        list.forEach(function(item){
            var li=document.createElement('li'),dot=document.createElement('i'),name=document.createElement('span'),city=document.createElement('small');
            dot.className=item.connected===false?'away':'';
            name.textContent=(room&&item.id===room.sessionId?UI_T('你 · '):'')+(item.name||'Player');
            var cityName=I18N&&I18N.cityNames&&I18N.cityNames[_langCode]?I18N.cityNames[_langCode][item.city]:(UI_T('城市 ')+item.city);
            city.textContent=cityName||(UI_T('城市 ')+item.city);
            if(item.companion&&window.DANBO_COMPANIONS)city.textContent=DANBO_COMPANIONS.words().bots+' · '+city.textContent;
            li.appendChild(dot);li.appendChild(name);li.appendChild(city);ui.list.appendChild(li);
        });
    }
    function cleanupRoom(){
        if(window.DANBO_INTERACTIONS)DANBO_INTERACTIONS.reset();
        room=null;lastSentCity=-1;lastSendAt=0;sequence=0;playerListSignature='';buttonSignature='';companionIds.clear();companionBudgetAt=0;removeAllRemotes();
        setStatus('offline','未连接');showSummary(UI_T('尚未连接联机房间。'),false);refreshPlayerList([]);
        if(ui.leave)ui.leave.disabled=true;if(ui.share)ui.share.disabled=true;
    }
    async function leaveRoom(){
        var old=room;manualLeave=true;room=null;
        try{if(old)await old.leave(true);}catch(e){}
        manualLeave=false;cleanupRoom();
    }
    async function connectRoom(code){
        if(joining)return false;
        var endpoint=normalizeEndpoint(ui.endpoint&&ui.endpoint.value||configuredEndpoint());
        if(!endpoint){openPanel();setStatus('error','需要服务器');showSummary(UI_T('尚未配置联机服务器地址。请在“高级设置”中填写 WSS 地址。'),true);return false;}
        code=normalizeCode(code);
        if(window.DANBO_ACCOUNT&&!await DANBO_ACCOUNT.ensure(endpoint))return false;
        var name=currentName();
        if(gameState!=='city'||!playerEgg){openPanel();showSummary(UI_T('请先选好角色并进入城市，再加入房间。'),true);return false;}
        joining=true;setStatus('joining','连接中…');showSummary(UI_T('正在进入房间 ')+code+'…',false);
        if(ui.quick)ui.quick.disabled=true;if(ui.create)ui.create.disabled=true;if(ui.join)ui.join.disabled=true;
        try{
            if(room)await leaveRoom();
            var SDK=await ensureSDK();
            client=new SDK.ColyseusSDK(endpoint);
            if(window.DANBO_ACCOUNT)client.http.authToken=DANBO_ACCOUNT.getToken(endpoint);
            manualLeave=false;
            var options=localStateOptions();options.code=code;
            if(isPublicCode(code)){
                // Resolve again at join time: the list may be stale or the server
                // may have restarted during character selection. Never silently
                // use joinOrCreate for a full public shard.
                var entries=await fetchServerEntries(endpoint);
                var target=entries.find(function(entry){return entry.code===code;});
                if(!target||!target.roomId)throw new Error(UI_T('所选服务器不可用，请刷新列表'));
                if(target.status!=='online'||target.available<=0)throw new Error('Server full');
                selectedCapacity=target.capacity;
                room=await client.joinById(target.roomId,options);
                selectedServerCode=code;
            }else room=await client.joinOrCreate(ROOM_NAME,options);
            room.reconnection.enabled=true;room.reconnection.maxRetries=8;room.reconnection.minDelay=350;room.reconnection.maxDelay=3500;
            room.onMessage('chat',receiveChat);
            room.onMessage('interaction-result',function(message){if(window.DANBO_INTERACTIONS)DANBO_INTERACTIONS.result(message);});
            room.onMessage('combat',function(message){if(window.DANBO_INTERACTIONS)DANBO_INTERACTIONS.event(message);});
            room.onMessage('coop-error',function(message){if(window.DANBO_COOP)DANBO_COOP.error(message&&message.code);});
            room.onDrop(function(){setStatus('reconnecting','重连中…');showSummary(UI_T('网络中断，正在保留席位并自动重连。'),false);});
            room.onReconnect(function(){setStatus('online','已重连');showSummary(UI_T('已恢复房间 ')+code+'。',false);});
            room.onError(function(_code,error){showSummary(messageForError(error),true);});
            var joinedRoom=room;
            room.onLeave(function(code){if(!manualLeave&&room===joinedRoom){cleanupRoom();if(code===4001&&window.DANBO_ACCOUNT){DANBO_ACCOUNT.invalidate();DANBO_ACCOUNT.open('login');}}});
            saveSettings(endpoint,name);
            if(ui.endpoint)ui.endpoint.value=endpoint;if(ui.name)ui.name.value=name;if(ui.code)ui.code.value=code;
            setStatus('online',UI_T('房间 ')+code);showSummary(UI_T('已加入 ')+code+UI_T('，同一城市的玩家会显示在场景中。'),false);
            if(ui.leave)ui.leave.disabled=false;if(ui.share)ui.share.disabled=false;
            lastSentCity=-1;lastAppearance='';lastAppearanceAt=0;appearanceBudgetAt=0;sendLocalState(true);refreshPlayerList();
            return true;
        }catch(error){
            cleanupRoom();setStatus('error','连接失败');showSummary(messageForError(error),true);openPanel();
            if(window.DANBO_ACCOUNT&&(error.code===401||error.status===401||/log in/i.test(error.message))){DANBO_ACCOUNT.invalidate();DANBO_ACCOUNT.open('login');}
            return false;
        }finally{
            joining=false;if(ui.quick)ui.quick.disabled=false;if(ui.create)ui.create.disabled=false;if(ui.join)ui.join.disabled=false;
        }
    }
    function detectAction(){
        if(!playerEgg)return 'idle';
        if(typeof keys!=='undefined'&&keys['KeyR'])return 'punch';
        if(typeof keys!=='undefined'&&keys['KeyT'])return 'kick';
        if(playerEgg._networkHolding||playerEgg.holding||playerEgg.holdingProp||playerEgg.holdingObs||(typeof keys!=='undefined'&&keys['KeyF']))return 'grab';
        if(!playerEgg.onGround||Math.abs(playerEgg.vy||0)>0.03)return 'jump';
        if(Math.hypot(playerEgg.vx||0,playerEgg.vz||0)>0.012)return 'walk';
        return 'idle';
    }
    function sendLocalState(force){
        if(!room||!playerEgg||!playerEgg.mesh||gameState!=='city')return;
        // The pipe path is a local cinematic, not a valid position in either city.
        // Publish the destination and its spawn together after arrival.
        if(typeof _pipeTraveling!=='undefined'&&_pipeTraveling)return;
        var now=performance.now();if(!force&&now-lastSendAt<SEND_INTERVAL)return;lastSendAt=now;
        var city=Number(currentCityStyle)||0,teleport=lastSentCity!==-1&&lastSentCity!==city;
        lastSentCity=city;sequence++;
        var p=playerEgg.mesh.position;
        room.send('state',{
            sequence:sequence,city:city,x:p.x,y:p.y,z:p.z,rotation:playerEgg.mesh.rotation.y,
            vx:playerEgg.vx||0,vy:playerEgg.vy||0,vz:playerEgg.vz||0,action:detectAction(),teleport:teleport,language:typeof _langCode==='undefined'?'ja':_langCode
            ,interactive:!!(window.DANBO_INTERACTIONS&&DANBO_INTERACTIONS.interactive())
            ,combatReady:!!(window.DANBO_INTERACTIONS&&DANBO_INTERACTIONS.combatReady())
            ,worldActive:!!playerEgg.onGround&&!playerEgg.heldBy&&!playerEgg._networkHeldBy&&!(playerEgg.throwTimer>0)&&!document.hidden&&!window._interiorActive&&!window._danboPluginTransition&&!window._journeyPanelOpen&&!window._accountPanelOpen&&!window._multiplayerPanelOpen&&!(window.DANBO_PLUGIN_HOST&&DANBO_PLUGIN_HOST.getActive())
        });
    }
    function receiveChat(message){
        if(!message||Number(message.city)!==Number(currentCityStyle)||gameState!=='city')return;
        var egg=null;
        if(room&&message.sessionId===room.sessionId)egg=playerEgg;
        else{var remote=remotes.get(message.sessionId);if(remote&&remote.root.visible)egg=remote.egg;}
        if(egg&&typeof _showChatBubble==='function')_showChatBubble(egg,String(message.text||'').slice(0,40));
    }
    function sendChat(text){
        if(!room||status!=='online'||gameState!=='city')return false;
        text=String(text||'').trim().slice(0,40);if(!text)return false;
        room.send('chat',{text:text});return true;
    }
    function shareRoom(){
        if(!room)return;
        var endpoint=normalizeEndpoint(ui.endpoint&&ui.endpoint.value||configuredEndpoint());
        var url=new URL(location.href);url.searchParams.set('room',normalizeCode(room.state&&room.state.code||ui.code.value));
        if(endpoint&&!window.DANBO_MULTIPLAYER_URL)url.searchParams.set('net',endpoint);
        var text=url.toString();
        if(navigator.share){navigator.share({title:'DANBO 联机房',text:'来我的 DANBO 房间一起玩',url:text}).catch(function(){});}
        else if(navigator.clipboard){navigator.clipboard.writeText(text).then(function(){showSummary(UI_T('邀请链接已复制。'),false);});}
        else{showSummary(text,false);}
    }
    function update(dt){
        if(pendingAutoCode&&!joining&&!room&&gameState==='city'&&playerEgg){var code=pendingAutoCode;pendingAutoCode='';connectRoom(code);}
        if(room){
            syncRemotePlayers(dt||1/60);
            if(window.DANBO_INTERACTIONS)DANBO_INTERACTIONS.update();
            sendLocalState(false);
            var now=performance.now();if(now-lastAppearanceAt>500&&window.DANBO_APPEARANCE){lastAppearanceAt=now;var selected=DANBO_APPEARANCE.selected();if(selected!==lastAppearance){lastAppearance=selected;room.send('profile',{appearance:selected});}}
        }
        else{if(remotes.size)removeAllRemotes();if(window.DANBO_INTERACTIONS)DANBO_INTERACTIONS.reset();}
    }

    if(ui.button)ui.button.addEventListener('click',openPanel);
    if(ui.close)ui.close.addEventListener('click',closePanel);
    if(ui.overlay)ui.overlay.addEventListener('click',function(e){if(e.target===ui.overlay)closePanel();});
    if(ui.quick)ui.quick.addEventListener('click',function(){connectRoom(isPublicCode(selectedServerCode)?selectedServerCode:'PUBLIC');});
    if(ui.browse)ui.browse.addEventListener('click',openServerBrowser);
    if(ui.create)ui.create.addEventListener('click',function(){var code=randomCode();if(ui.code)ui.code.value=code;connectRoom(code);});
    if(ui.join)ui.join.addEventListener('click',function(){connectRoom(ui.code&&ui.code.value);});
    if(ui.leave)ui.leave.addEventListener('click',leaveRoom);
    if(ui.share)ui.share.addEventListener('click',shareRoom);
    if(ui.serverRefresh)ui.serverRefresh.addEventListener('click',refreshServerList);
    if(ui.serverBack)ui.serverBack.addEventListener('click',function(){if(typeof showScreen==='function')showScreen(null);closePanel();});
    if(ui.serverEnter)ui.serverEnter.addEventListener('click',enterSelectedServer);
    if(ui.code)ui.code.addEventListener('input',function(){this.value=normalizeCode(this.value);});
    [ui.name,ui.code,ui.endpoint].forEach(function(input){if(input)input.addEventListener('keydown',function(e){e.stopPropagation();});});
    addEventListener('keydown',function(e){if(e.code==='Escape'&&window._multiplayerPanelOpen){e.preventDefault();if(ui.serverScreen&&ui.serverScreen.classList.contains('active')&&gameState==='city'&&typeof showScreen==='function')showScreen(null);closePanel();}});
    addEventListener('beforeunload',function(){if(room)try{room.leave(true);}catch(e){}});

    pendingAutoCode='';
    if(ui.endpoint)ui.endpoint.value=configuredEndpoint();
    if(ui.name)ui.name.value=currentName();
    cleanupRoom();

    setInterval(function(){
        if(ui.serverScreen&&ui.serverScreen.classList.contains('active')&&!document.hidden)refreshServerList();
    },15000);
    window.DANBO_SERVER_BROWSER={open:openServerBrowser,refresh:refreshServerList,enter:enterSelectedServer,select:function(code){serverChosen=true;selectServer(code);},isReady:function(){return selectedServerReady;}};

    window.DANBO_MULTIPLAYER={
        open:openPanel,close:closePanel,connect:connectRoom,leave:leaveRoom,update:update,sendChat:sendChat,
        share:shareRoom,
        refreshLanguage:function(){
            setStatus(status,statusText);playerListSignature='';refreshPlayerList();
            if(serverEntries.length){
                renderServerList(lastServerPing);
                if(ui.serverSummary)ui.serverSummary.textContent=UI_T('{total} 个公共分区 · {available} 个可进入 · 不同分区互不相通',{total:serverEntries.length,available:serverEntries.filter(function(e){return e.status==='online'&&e.available>0;}).length});
            }
            if(ui.summary)ui.summary.textContent=room&&room.state?UI_T('房间 ')+room.state.code:UI_T('尚未连接联机房间。');
        },
        coop:function(action){if(!room||status!=='online')return false;sendLocalState(true);room.send('coop',{action:action});return true;},
        isConnected:function(){return !!room&&status==='online';},
        getRoom:function(){return room;},
        getRemoteActor:function(id){return remotes.get(id)||null;},
        flushState:function(){sendLocalState(true);},
        getEndpoint:function(){return normalizeEndpoint(ui.endpoint&&ui.endpoint.value||configuredEndpoint());},
        getStatus:function(){return{status:status,text:UI_T(statusText),roomCode:room&&room.state?room.state.code:null,remoteCount:remotes.size,population:window.DANBO_COMPANIONS?DANBO_COMPANIONS.count(room&&room.state):null};}
    };
})();
