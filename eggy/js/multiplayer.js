// multiplayer.js — optional eight-player Colyseus city rooms.
// The SDK is loaded only when a player joins, so single-player startup and FPS
// are unchanged. Remote avatars live outside allEggs and never enter local NPC,
// collision, reward or combat authority.
(function(){
    'use strict';

    var ROOM_NAME='eggy_city';
    var SEND_INTERVAL=1000/15;
    var remotes=new Map();
    var client=null,room=null,joining=false,manualLeave=false;
    var lastSendAt=0,lastSentCity=-1,sequence=0,pendingAutoCode='';
    var playerListSignature='',sdkPromise=null;
    var status='offline',statusText='单机模式';

    var ui={
        button:document.getElementById('multiplayer-btn'),
        overlay:document.getElementById('multiplayer-overlay'),
        close:document.getElementById('multiplayer-close'),
        badge:document.getElementById('multiplayer-status'),
        summary:document.getElementById('multiplayer-summary'),
        name:document.getElementById('multiplayer-name'),
        code:document.getElementById('multiplayer-code'),
        endpoint:document.getElementById('multiplayer-endpoint'),
        quick:document.getElementById('multiplayer-quick'),
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
        try{saved=localStorage.getItem('danbo_multiplayer_server')||'';}catch(e){}
        var declared=window.DANBO_MULTIPLAYER_URL||'';
        if(!query&&!saved&&!declared){
            if(location.hostname==='localhost'||location.hostname==='127.0.0.1')declared='ws://'+location.hostname+':2567';
        }
        return normalizeEndpoint(query||saved||declared);
    }
    function currentName(){
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
            rotation:playerEgg&&playerEgg.mesh?playerEgg.mesh.rotation.y:0
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
        if(ui.badge){ui.badge.className='multiplayer-status '+next;ui.badge.textContent=statusText;}
        updateButton();
    }
    function updateButton(){
        if(!ui.button)return;
        if(room&&status==='online'){
            var count=room.state&&room.state.players?room.state.players.size:1;
            ui.button.textContent='👥 '+count+'/8';
            ui.button.classList.add('online');
            ui.button.title='联机房 '+normalizeCode(room.state&&room.state.code||ui.code&&ui.code.value);
        }else if(status==='joining'||status==='reconnecting'){
            ui.button.textContent='👥 连接中';ui.button.classList.remove('online');
        }else{
            ui.button.textContent='👥 单机';ui.button.classList.remove('online');
        }
    }
    function messageForError(error){
        var text=String(error&&error.message||error||'连接失败');
        if(/full|seat|4212|4213/i.test(text))return '房间已满（最多 8 人）';
        if(/fetch|network|websocket|connect|failed/i.test(text))return '无法连接联机服务器';
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
                else reject(new Error('联机组件加载失败'));
            };
            script.onerror=function(){reject(new Error('联机组件加载失败'));};
            document.head.appendChild(script);
        }).catch(function(error){sdkPromise=null;throw error;});
        return sdkPromise;
    }
    function saveSettings(endpoint,name){
        try{
            localStorage.setItem('danbo_multiplayer_server',endpoint);
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
        var canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
        var ctx=canvas.getContext('2d');
        ctx.clearRect(0,0,512,128);
        ctx.fillStyle='rgba(8,18,30,.78)';
        ctx.beginPath();
        if(ctx.roundRect)ctx.roundRect(20,18,472,90,30);
        else{
            ctx.moveTo(50,18);ctx.lineTo(462,18);ctx.quadraticCurveTo(492,18,492,48);
            ctx.lineTo(492,78);ctx.quadraticCurveTo(492,108,462,108);ctx.lineTo(50,108);
            ctx.quadraticCurveTo(20,108,20,78);ctx.lineTo(20,48);ctx.quadraticCurveTo(20,18,50,18);
        }
        ctx.fill();
        ctx.strokeStyle='rgba(255,239,185,.9)';ctx.lineWidth=5;ctx.stroke();
        ctx.font='800 42px system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillStyle='#fff8dc';ctx.fillText(String(name||'Player').slice(0,16),256,63,430);
        var texture=new THREE.CanvasTexture(canvas);
        if(typeof THREE.SRGBColorSpace!=='undefined')texture.colorSpace=THREE.SRGBColorSpace;
        var material=new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false,alphaTest:0.04});
        var sprite=new THREE.Sprite(material);sprite.scale.set(2.6,0.65,1);sprite.position.y=2.25;
        sprite.renderOrder=30;sprite.userData.noAO=true;
        return sprite;
    }
    function rebuildRemoteAvatar(remote,statePlayer){
        if(remote.avatar)remote.root.remove(remote.avatar);
        var index=Math.max(0,Math.min(7,Number(statePlayer.character)||0));
        var skin=CHARACTERS[index]||CHARACTERS[0];
        remote.avatar=createEggMesh(skin.color,skin.accent,skin.type,statePlayer.style==='classic'?'classic':'cinematic');
        remote.root.add(remote.avatar);
        remote.character=index;remote.style=statePlayer.style;
        remote.footBase=[];
        var feet=remote.avatar.userData.feet||[];
        for(var i=0;i<feet.length;i++)remote.footBase.push(feet[i].position.clone());
    }
    function rebuildRemoteName(remote,name){
        if(remote.nameSprite){
            remote.root.remove(remote.nameSprite);
            if(remote.nameSprite.material&&remote.nameSprite.material.map)remote.nameSprite.material.map.dispose();
            if(remote.nameSprite.material)remote.nameSprite.material.dispose();
        }
        remote.nameSprite=makeNameSprite(name);remote.root.add(remote.nameSprite);remote.name=name;
    }
    function createRemote(sessionId,statePlayer){
        var root=new THREE.Group();root.name='danbo-network-player-'+sessionId;scene.add(root);
        var remote={id:sessionId,root:root,avatar:null,nameSprite:null,name:'',character:-1,style:'',walkPhase:0,footBase:[],egg:null};
        remote.egg={mesh:root,alive:true,isNetworkPlayer:true};
        rebuildRemoteAvatar(remote,statePlayer);rebuildRemoteName(remote,statePlayer.name);
        root.position.set(Number(statePlayer.x)||0,Number(statePlayer.y)||0,Number(statePlayer.z)||0);
        root.rotation.y=Number(statePlayer.rotation)||0;
        remotes.set(sessionId,remote);
        return remote;
    }
    function removeRemote(sessionId){
        var remote=remotes.get(sessionId);if(!remote)return;
        scene.remove(remote.root);
        if(remote.nameSprite&&remote.nameSprite.material&&remote.nameSprite.material.map)remote.nameSprite.material.map.dispose();
        if(remote.nameSprite&&remote.nameSprite.material)remote.nameSprite.material.dispose();
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
        remote.walkPhase+=Math.min(0.48,speed*1.8+0.035)*(speed>0.008?1:0);
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
    }
    function syncRemotePlayers(dt){
        if(!room||!room.state||!room.state.players)return;
        var present=new Set(),list=[];
        room.state.players.forEach(function(statePlayer,sessionId){
            list.push({id:sessionId,name:statePlayer.name,city:statePlayer.city,connected:statePlayer.connected});
            if(sessionId===room.sessionId)return;
            present.add(sessionId);
            var remote=remotes.get(sessionId)||createRemote(sessionId,statePlayer);
            if(remote.character!==Number(statePlayer.character)||remote.style!==statePlayer.style)rebuildRemoteAvatar(remote,statePlayer);
            if(remote.name!==statePlayer.name)rebuildRemoteName(remote,statePlayer.name);
            var visible=gameState==='city'&&!window._interiorActive&&!window._danboPluginTransition&&
                Number(statePlayer.city)===Number(currentCityStyle)&&statePlayer.connected!==false;
            remote.root.visible=visible;
            if(!visible)return;
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
            room.state.players.forEach(function(player,id){list.push({id:id,name:player.name,city:player.city,connected:player.connected});});
        }
        var signature=list.map(function(p){return p.id+':'+p.name+':'+p.city+':'+p.connected;}).join('|');
        if(signature===playerListSignature)return;playerListSignature=signature;
        ui.list.textContent='';
        if(!list.length){var empty=document.createElement('li');empty.textContent='尚未加入房间';ui.list.appendChild(empty);return;}
        list.forEach(function(item){
            var li=document.createElement('li'),dot=document.createElement('i'),name=document.createElement('span'),city=document.createElement('small');
            dot.className=item.connected===false?'away':'';
            name.textContent=(room&&item.id===room.sessionId?'你 · ':'')+(item.name||'Player');
            var cityName=I18N&&I18N.cityNames&&I18N.cityNames[_langCode]?I18N.cityNames[_langCode][item.city]:('城市 '+item.city);
            city.textContent=cityName||('城市 '+item.city);
            li.appendChild(dot);li.appendChild(name);li.appendChild(city);ui.list.appendChild(li);
        });
    }
    function cleanupRoom(){
        room=null;lastSentCity=-1;lastSendAt=0;sequence=0;playerListSignature='';removeAllRemotes();
        setStatus('offline','单机模式');showSummary('未加入房间，原单机内容保持可用。',false);refreshPlayerList([]);
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
        if(!endpoint){openPanel();setStatus('error','需要服务器');showSummary('尚未配置联机服务器地址。请在“高级设置”中填写 WSS 地址。',true);return false;}
        code=normalizeCode(code);
        var name=currentName();
        if(gameState!=='city'||!playerEgg){openPanel();showSummary('请先选好角色并进入城市，再加入房间。',true);return false;}
        joining=true;setStatus('joining','连接中…');showSummary('正在进入房间 '+code+'…',false);
        if(ui.quick)ui.quick.disabled=true;if(ui.create)ui.create.disabled=true;if(ui.join)ui.join.disabled=true;
        try{
            if(room)await leaveRoom();
            var SDK=await ensureSDK();
            client=new SDK.ColyseusSDK(endpoint);
            manualLeave=false;
            var options=localStateOptions();options.code=code;
            room=await client.joinOrCreate(ROOM_NAME,options);
            room.reconnection.enabled=true;room.reconnection.maxRetries=8;room.reconnection.minDelay=350;room.reconnection.maxDelay=3500;
            room.onMessage('chat',receiveChat);
            room.onDrop(function(){setStatus('reconnecting','重连中…');showSummary('网络中断，正在保留席位并自动重连。',false);});
            room.onReconnect(function(){setStatus('online','已重连');showSummary('已恢复房间 '+code+'。',false);});
            room.onError(function(_code,error){showSummary(messageForError(error),true);});
            var joinedRoom=room;
            room.onLeave(function(){if(!manualLeave&&room===joinedRoom)cleanupRoom();});
            saveSettings(endpoint,name);
            if(ui.endpoint)ui.endpoint.value=endpoint;if(ui.name)ui.name.value=name;if(ui.code)ui.code.value=code;
            setStatus('online','房间 '+code);showSummary('已加入 '+code+'，同一城市的玩家会显示在场景中。',false);
            if(ui.leave)ui.leave.disabled=false;if(ui.share)ui.share.disabled=false;
            lastSentCity=-1;sendLocalState(true);refreshPlayerList();
            return true;
        }catch(error){
            cleanupRoom();setStatus('error','连接失败');showSummary(messageForError(error),true);console.warn('[multiplayer]',error);return false;
        }finally{
            joining=false;if(ui.quick)ui.quick.disabled=false;if(ui.create)ui.create.disabled=false;if(ui.join)ui.join.disabled=false;
        }
    }
    function detectAction(){
        if(!playerEgg)return 'idle';
        if(typeof keys!=='undefined'&&keys['KeyR'])return 'punch';
        if(typeof keys!=='undefined'&&keys['KeyT'])return 'kick';
        if(playerEgg.holding||playerEgg.holdingProp||playerEgg.holdingObs||(typeof keys!=='undefined'&&keys['KeyF']))return 'grab';
        if(!playerEgg.onGround||Math.abs(playerEgg.vy||0)>0.03)return 'jump';
        if(Math.hypot(playerEgg.vx||0,playerEgg.vz||0)>0.012)return 'walk';
        return 'idle';
    }
    function sendLocalState(force){
        if(!room||!playerEgg||!playerEgg.mesh||gameState!=='city')return;
        var now=performance.now();if(!force&&now-lastSendAt<SEND_INTERVAL)return;lastSendAt=now;
        var city=Number(currentCityStyle)||0,teleport=lastSentCity!==-1&&lastSentCity!==city;
        lastSentCity=city;sequence++;
        var p=playerEgg.mesh.position;
        room.send('state',{
            sequence:sequence,city:city,x:p.x,y:p.y,z:p.z,rotation:playerEgg.mesh.rotation.y,
            vx:playerEgg.vx||0,vy:playerEgg.vy||0,vz:playerEgg.vz||0,action:detectAction(),teleport:teleport
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
        if(navigator.share){navigator.share({title:'EGGY 联机房',text:'来我的 EGGY 房间一起玩',url:text}).catch(function(){});}
        else if(navigator.clipboard){navigator.clipboard.writeText(text).then(function(){showSummary('邀请链接已复制。',false);});}
        else{showSummary(text,false);}
    }
    function update(dt){
        if(pendingAutoCode&&!joining&&!room&&gameState==='city'&&playerEgg){var code=pendingAutoCode;pendingAutoCode='';connectRoom(code);}
        if(room){sendLocalState(false);syncRemotePlayers(dt||1/60);}
        else if(remotes.size)removeAllRemotes();
    }

    if(ui.button)ui.button.addEventListener('click',openPanel);
    if(ui.close)ui.close.addEventListener('click',closePanel);
    if(ui.overlay)ui.overlay.addEventListener('click',function(e){if(e.target===ui.overlay)closePanel();});
    if(ui.quick)ui.quick.addEventListener('click',function(){connectRoom('PUBLIC');});
    if(ui.create)ui.create.addEventListener('click',function(){var code=randomCode();if(ui.code)ui.code.value=code;connectRoom(code);});
    if(ui.join)ui.join.addEventListener('click',function(){connectRoom(ui.code&&ui.code.value);});
    if(ui.leave)ui.leave.addEventListener('click',leaveRoom);
    if(ui.share)ui.share.addEventListener('click',shareRoom);
    if(ui.code)ui.code.addEventListener('input',function(){this.value=normalizeCode(this.value);});
    [ui.name,ui.code,ui.endpoint].forEach(function(input){if(input)input.addEventListener('keydown',function(e){e.stopPropagation();});});
    addEventListener('keydown',function(e){if(e.code==='Escape'&&window._multiplayerPanelOpen){e.preventDefault();closePanel();}});
    addEventListener('beforeunload',function(){if(room)try{room.leave(true);}catch(e){}});

    try{pendingAutoCode=normalizeCode(new URLSearchParams(location.search).get('room')||'');if(!new URLSearchParams(location.search).get('room'))pendingAutoCode='';}catch(e){}
    if(ui.endpoint)ui.endpoint.value=configuredEndpoint();
    if(ui.name)ui.name.value=currentName();
    cleanupRoom();

    window.DANBO_MULTIPLAYER={
        open:openPanel,close:closePanel,connect:connectRoom,leave:leaveRoom,update:update,sendChat:sendChat,
        isConnected:function(){return !!room&&status==='online';},
        getRoom:function(){return room;},
        getStatus:function(){return{status:status,text:statusText,roomCode:room&&room.state?room.state.code:null,remoteCount:remotes.size};}
    };
})();
