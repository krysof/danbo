// A small, optional first-session route in Hope City. Reuse one low-poly marker;
// no new map, realtime shadows, postprocessing pass or per-frame allocations.
(function(){
    'use strict';
    var $=function(id){return document.getElementById(id);},P=DANBO_PROGRESS;
    var route=[[0,23],[0,31],[0,39]],marker=null,previous=null,lastUI=0,entered=false;
    var opened=false,lastFocus=null,sent={},pending={},started=0,visit=randomId(),visitDate=date(),hiddenAt=0,booth=new URLSearchParams(location.search).get('booth')==='1';
    var installPrompt=null,cardURL='',handoffURL='',busy=false,coopTask=false;
    var feedbackKey='',feedbackValues=null,feedbackUntil=0;
    function feedback(key,values,duration){
        // Pickup feedback wins the same small HUD slot; never open a dialog.
        if(opened){opened=false;$('journey-overlay').classList.add('hidden');}
        feedbackKey=key;feedbackValues=values;feedbackUntil=performance.now()+duration;
        $('journey-feedback').textContent=UI_T(key,values);
        // This occupies the existing task slot, not a new layer over controls.
        $('journey-feedback').hidden=false;$('journey-task').hidden=true;
    }
    function randomId(){return Array.from(crypto.getRandomValues(new Uint8Array(16))).map(function(b){return b.toString(16).padStart(2,'0');}).join('');}
    function date(){return new Date().toISOString().slice(0,10);}
    function consent(){try{return navigator.doNotTrack!=='1'&&localStorage.getItem('danbo_metrics_consent_v1')==='yes';}catch(_){return false;}}
    function event(name){
        if(!consent()||sent[name]||pending[name]||!DANBO_ACCOUNT.getUser())return;
        var visitor;try{visitor=localStorage.getItem('danbo_metrics_visitor_v1');if(!/^[a-f0-9]{32}$/.test(visitor||'')){visitor=randomId();localStorage.setItem('danbo_metrics_visitor_v1',visitor);}}catch(_){return;}
        pending[name]=true;var eventVisit=visit;
        DANBO_ACCOUNT.request('/events',{visitor:visitor,visit:visit,event:name,booth:booth,elapsed:Math.min(86400000,Math.round(performance.now()-started))})
            .then(function(){if(visit===eventVisit)sent[name]=true;}).catch(function(){}).finally(function(){if(visit===eventVisit)delete pending[name];});
    }
    function toggleConsent(value){
        try{localStorage.setItem('danbo_metrics_consent_v1',value?'yes':'no');if(!value)localStorage.removeItem('danbo_metrics_visitor_v1');}catch(_){}
        $('journey-consent').checked=value;
        if(!value){sent={};pending={};visit=randomId();started=performance.now();}
        if(value)event('open');
    }
    document.addEventListener('visibilitychange',function(){
        if(document.hidden){hiddenAt=Date.now();return;}
        if(date()!==visitDate||(hiddenAt&&Date.now()-hiddenAt>1800000)){
            visit=randomId();visitDate=date();sent={};pending={};started=performance.now();event('open');
        }
        hiddenAt=0;
    });
    function message(text){$('journey-message').textContent=UI_T(text);}
    function render(){
        if(feedbackKey)$('journey-feedback').textContent=UI_T(feedbackKey,feedbackValues);
        var j=P.journey(),u=DANBO_ACCOUNT.getUser(),done=j.rewarded;
        var hint=!done?(j.distance<12?UI_T('移动 {n}/12 米 · WASD / 左摇杆',{n:Math.min(12,Math.floor(j.distance))}):!j.jumped?UI_T('轻按并松开空格 /「跳」按钮'):j.steps<3?UI_T('沿金色路标收集星光 {n}/3',{n:j.steps}):UI_T('首个挑战完成！')):
            (j.stamps.indexOf(date())<0?UI_T('今日小目标：打开一个新宝箱'):UI_T('今日旅程已盖章 · 自由探索吧'));
        // Discovery reuses the existing task button, after the first solo lesson.
        var nearby=window.DANBO_COOP&&DANBO_COOP.nearby&&DANBO_COOP.nearby();
        var coopHint=nearby||(window.DANBO_COOP&&(DANBO_COOP.hint()||(done&&DANBO_COOP.invitation())));
        coopTask=!!coopHint;
        $('journey-task').textContent=coopHint||UI_T(done?'旅程手册 · {hint}':'初次旅行 · {hint}',{hint:hint});
        $('journey-objectives').textContent=hint;
        $('journey-reward').textContent=UI_T(done?'奖励：初旅星环 ✓':'奖励：初旅星环');
        $('journey-stamps').textContent=UI_T('旅行纪念章：{n} 枚。{today} 不连续登录也不会扣奖励。',{n:j.stamps.length,today:UI_T(j.stamps.indexOf(date())>=0?'今天已获得。':'打开一个新宝箱，留下今天的足迹。')});
        $('journey-status').textContent=P.getStatus();
        $('journey-conflict').hidden=!P.hasConflict();
        $('journey-register').hidden=!!(u&&u.kind==='account');
        $('journey-cloud-save').hidden=!(u&&u.kind==='account');
        $('journey-preferences').hidden=!(u&&u.kind==='account');
        $('journey-next').hidden=!booth;
        $('journey-consent').checked=consent();
        $('journey-card-name').textContent=u?u.characterName:UI_T('你的蛋宝');
        if(window.DANBO_COOP)DANBO_COOP.render();
    }
    function open(showCoop){
        // A bounded HUD popover, not a modal. Never set the legacy input lock,
        // clear keys/joystick, trap focus or put a backdrop over the game.
        lastFocus=document.activeElement;opened=true;window._journeyPanelOpen=false;
        feedbackUntil=0;$('journey-feedback').hidden=true;render();$('journey-overlay').classList.remove('hidden');
        $('journey-coop-details').open=showCoop===true;
        $('journey-save-details').open=P.hasConflict()||!$('journey-claim').hidden;
        if(showCoop===true){$('coop-title').focus({preventScroll:true});$('coop-card').scrollIntoView({block:'start'});}
        if(DANBO_ACCOUNT.getUser()&&DANBO_ACCOUNT.getUser().kind==='account')DANBO_ACCOUNT.request('/preferences').then(function(r){$('journey-updates').checked=r.emailUpdates;}).catch(function(e){message(e.message);});
    }
    function close(){opened=false;window._journeyPanelOpen=false;$('journey-overlay').classList.add('hidden');}
    function resetRuntime(){previous=null;entered=false;feedbackUntil=0;feedbackKey='';$('journey-feedback').hidden=true;if(marker)marker.visible=false;}
    function protects(egg){
        if(window.DANBO_COOP&&DANBO_COOP.protects(egg))return true;
        if(!egg||!egg.isPlayer||gameState!=='city'||currentCityStyle!==0||P.journey().rewarded||window._interiorActive)return false;
        var p=egg.mesh.position;return Math.abs(p.x)<=6&&p.z>=14&&p.z<=45;
    }
    function buildMarker(){
        marker=new THREE.Group();marker.name='danbo-journey-starlight';
        var material=new THREE.MeshBasicMaterial({color:0xffe17d,toneMapped:false});
        // A recognisable five-point star, rather than a small diamond mistaken
        // for scenery. Unlit materials remain bright without adding a light.
        var shape=new THREE.Shape();
        for(var i=0;i<10;i++){var a=Math.PI/2+i*Math.PI/5,r=i%2?.4:.9,x=Math.cos(a)*r,y=Math.sin(a)*r;if(i===0)shape.moveTo(x,y);else shape.lineTo(x,y);}shape.closePath();
        var gem=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.18,bevelEnabled:true,bevelThickness:.05,bevelSize:.05,bevelSegments:1,steps:1}),material);gem.position.y=2.2;marker.add(gem);
        var ring=new THREE.Mesh(new THREE.TorusGeometry(1.4,0.09,4,32),new THREE.MeshBasicMaterial({color:0xffd45d,toneMapped:false,transparent:true,opacity:.85}));ring.rotation.x=-Math.PI/2;ring.position.y=0.08;marker.add(ring);
        scene.add(marker); // retained, not rebuilt on city changes; hidden outside Hope
    }
    function reward(){
        var j=P.journey();if(j.rewarded||j.distance<12||!j.jumped||j.steps<3)return;
        j.rewarded=true;if(j.stamps.indexOf(date())<0)j.stamps.push(date());
        Cosmetics.data().owned.halo_journey=true;Cosmetics.equip('halo','halo_journey');Explorer.addPoints(20,'firstJourney');
        P.capture();P.flush();event('challenge');render();
        feedback('✨ 初旅星环已获得 · 已自动佩戴',null,5000);
    }
    function jump(){if(gameState==='city'&&currentCityStyle===0&&!P.journey().jumped){P.journey().jumped=true;P.capture();render();}}
    function update(){
        var active=gameState==='city'&&!window._interiorActive&&!window._pipeTraveling&&!window._pipeCityBuilding&&!window._danboPluginTransition&&!(window.DANBO_PLUGIN_HOST&&DANBO_PLUGIN_HOST.getActive())&&!!playerEgg;
        var now=performance.now(),hidden=!active||window._accountPanelOpen||window._worldMapOpen||window._shopOpen||window._multiplayerPanelOpen;
        var hasFeedback=now<feedbackUntil;
        $('journey-feedback').hidden=hidden||!hasFeedback;
        if($('journey-task').hidden!==(hidden||hasFeedback||opened))$('journey-task').hidden=hidden||hasFeedback||opened;
        if(hidden&&opened)close();
        var j=P.journey(),routeActive=active&&currentCityStyle===0&&!j.rewarded&&!(window.DANBO_COOP&&DANBO_COOP.joined());
        if(marker)marker.visible=routeActive&&j.steps<3;
        if(hidden||document.hidden){previous=null;return;}
        if(!entered){entered=true;event('open');}
        var p=playerEgg.mesh.position;
        var controlled=(keys.KeyW||keys.KeyA||keys.KeyS||keys.KeyD||keys.ArrowUp||keys.ArrowDown||keys.ArrowLeft||keys.ArrowRight||joyActive)&&!window._accountPanelOpen&&!window._multiplayerPanelOpen;
        if(previous&&controlled&&!playerEgg.heldBy){var distance=Math.hypot(p.x-previous.x,p.z-previous.z);if(distance>0.01&&distance<2){if(routeActive)j.distance=Math.min(25,j.distance+distance);event('control');}}
        if(!previous)previous={x:p.x,z:p.z};else{previous.x=p.x;previous.z=p.z;}
        if(!routeActive){if(now-lastUI>(window.DANBO_COOP&&DANBO_COOP.joined()?250:1000)){lastUI=now;render();}return;}
        if(!marker)buildMarker();
        var target=route[Math.min(j.steps,2)];marker.position.set(target[0],0,target[1]);
        marker.children[0].position.y=2.2+Math.sin(now*.003)*.22;
        if(typeof camera!=='undefined')marker.children[0].quaternion.copy(camera.quaternion);
        marker.children[0].rotation.z=Math.sin(now*.0015)*.12;
        marker.children[1].scale.setScalar(1+Math.sin(now*.004)*.12);
        marker.children[1].material.opacity=.65+Math.sin(now*.004)*.2;
        if(j.steps<3&&Math.hypot(p.x-target[0],p.z-target[1])<1.8&&p.y<4){
            j.steps++;P.capture();if(typeof playCoinSound==='function')playCoinSound();
            feedback('★ 星光 +1 · {n}/3',{n:j.steps},2600);
            marker.visible=j.steps<3;
        }
        reward();if(now-lastUI>250){lastUI=now;render();}
    }
    var oldChest=Explorer.openChest;
    Explorer.openChest=function(ch){
        var result=oldChest(ch),j=P.journey();
        if(result&&j.rewarded&&j.stamps.indexOf(date())<0){j.stamps.push(date());j.stamps=j.stamps.slice(-366);Explorer.addPoints(10,'journeyStamp');P.capture();render();}
        return result;
    };
    async function action(fn){if(busy)return;busy=true;try{await fn();}catch(e){message(e.message||UI_T('操作失败，请重试'));}finally{busy=false;render();}}
    function drawCard(url){
        var canvas=$('journey-card'),ctx=canvas.getContext('2d'),u=DANBO_ACCOUNT.getUser(),hero=CHARACTERS[u.character];
        canvas.width=720;canvas.height=960;
        var gradient=ctx.createLinearGradient(0,0,720,960);gradient.addColorStop(0,'#12364b');gradient.addColorStop(1,'#437d76');ctx.fillStyle=gradient;ctx.fillRect(0,0,720,960);
        ctx.textAlign='center';ctx.fillStyle='#ffd886';ctx.font='bold 25px sans-serif';ctx.fillText(L('title'),360,66,660);
        ctx.fillStyle='#ffffff';ctx.font='bold 42px sans-serif';ctx.fillText(u.characterName,360,125,660);
        ctx.fillStyle='#'+Number(hero.color).toString(16).padStart(6,'0');ctx.beginPath();ctx.ellipse(360,300,110,140,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#193747';[325,395].forEach(function(x){ctx.beginPath();ctx.ellipse(x,280,9,16,0,0,Math.PI*2);ctx.fill();});
        ctx.strokeStyle='#193747';ctx.lineWidth=6;ctx.beginPath();ctx.arc(360,310,28,0.2,Math.PI-0.2);ctx.stroke();
        if(P.journey().rewarded){ctx.strokeStyle='#ffd886';ctx.lineWidth=10;ctx.beginPath();ctx.ellipse(360,166,78,17,0,0,Math.PI*2);ctx.stroke();}
        ctx.fillStyle='#fff';ctx.font='22px sans-serif';ctx.fillText(P.journey().rewarded?UI_T('初旅星环 · 已获得'):UI_T('带着蛋宝，继续旅程'),360,486,660);
        var qr=qrcode(0,'M');qr.addData(url);qr.make();var n=qr.getModuleCount(),cell=Math.floor(300/(n+8)),size=cell*(n+8),x=(720-size)/2,y=526;
        ctx.fillStyle='#fff';ctx.fillRect(x,y,size,size);ctx.fillStyle='#102431';
        for(var row=0;row<n;row++)for(var col=0;col<n;col++)if(qr.isDark(row,col))ctx.fillRect(x+(col+4)*cell,y+(row+4)*cell,cell,cell);
        ctx.fillStyle='#fff';ctx.font='20px sans-serif';ctx.fillText(UI_T('扫码继续 · 10 分钟有效 · 仅可领取一次'),360,870,660);
        ctx.font='17px sans-serif';ctx.fillText(UI_T('包含人物和进度，不包含账号登录权限'),360,909,660);
        canvas.hidden=false;$('journey-card-actions').hidden=false;
    }
    $('journey-handoff').addEventListener('click',function(){action(async function(){
        P.capture();var result=await DANBO_ACCOUNT.request('/handoff',{snapshot:P.snapshot()});
        var url=new URL(location.href);url.search='';url.hash='take='+result.code;
        url.searchParams.set('net',DANBO_MULTIPLAYER.getEndpoint());var room=DANBO_MULTIPLAYER.getRoom();if(room&&room.state)url.searchParams.set('room',room.state.code);
        handoffURL=url.href;drawCard(handoffURL);event('handoff');message(UI_T('接力卡已生成。请私下传给自己的手机，不要公开发布；过期后可重新生成。'));
        $('journey-card').scrollIntoView({block:'center',behavior:'smooth'});
    });});
    $('journey-copy').addEventListener('click',function(){action(async function(){await navigator.clipboard.writeText(handoffURL);message(UI_T('接力链接已复制'));});});
    $('journey-download').addEventListener('click',function(){
        $('journey-card').toBlob(function(blob){if(!blob){message(UI_T('图片生成失败'));return;}if(cardURL)URL.revokeObjectURL(cardURL);cardURL=URL.createObjectURL(blob);var a=document.createElement('a');a.href=cardURL;a.download='danbo-journey.png';a.click();},'image/png');
    });
    $('journey-cloud-save').addEventListener('click',function(){action(async function(){await P.retry();});});
    $('journey-use-cloud').addEventListener('click',function(){action(async function(){if(confirm(UI_T('使用云端存档？本机这份将备份，但当前游戏内的未同步进度会被替换。'))){await P.resolve('cloud');location.reload();}});});
    $('journey-use-local').addEventListener('click',function(){action(async function(){if(confirm(UI_T('确定用此设备的完整存档替换云端？另一设备的进度不会自动合并。')))await P.resolve('local');});});
    $('journey-register').addEventListener('click',function(){close();DANBO_ACCOUNT.open('register');});
    $('journey-updates').addEventListener('change',function(){action(async function(){await DANBO_ACCOUNT.request('/preferences',{emailUpdates:$('journey-updates').checked});message(UI_T('邮件订阅偏好已保存。当前尚未启用邮件发送。'));});});
    $('journey-consent').addEventListener('change',function(){toggleConsent(this.checked);});
    $('journey-install').addEventListener('click',function(){action(async function(){
        if(installPrompt){await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;}
        else message(UI_T('iPhone：在 Safari 中点“分享 → 添加到主屏幕”。Android / PC：使用浏览器菜单的“安装应用 / 添加到主屏幕”。仍需网络连接。'));
    });});
    window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();installPrompt=e;});
    $('journey-next').addEventListener('click',function(){action(async function(){
        if(!confirm(UI_T('准备下一位游客？当前游客进度将留一份本机备份；请先扫码带走。账号用户不能使用此操作。')))return;
        P.resetGuest();await DANBO_ACCOUNT.request('/logout',{});await DANBO_MULTIPLAYER.leave();DANBO_ACCOUNT.invalidate();
        localStorage.removeItem('danbo_metrics_visitor_v1');localStorage.removeItem('danbo_metrics_consent_v1');location.reload();
    });});
    $('journey-open').addEventListener('click',function(){open();});
    $('journey-task').addEventListener('click',function(){
        if(window.DANBO_COOP&&DANBO_COOP.nearby&&DANBO_COOP.nearby()){DANBO_COOP.join();render();return;}
        open(coopTask);
    });$('journey-close').addEventListener('click',close);
    $('journey-continue').addEventListener('click',close);
    $('journey-overlay').addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();close();}});
    // The fragment is never sent in HTTP requests or analytics. Claim is explicit,
    // not on page load, so link previews cannot consume a player's one-time save.
    var code=new URLSearchParams(location.hash.slice(1)).get('take');
    if(code&&/^[A-Za-z0-9_-]{32}$/.test(code)){
        history.replaceState(null,'',location.pathname+location.search);
        setTimeout(function(){$('journey-claim').hidden=false;open();message(UI_T('收到一份蛋宝接力存档。领取会切换为游客，不会登录原账号；此浏览器已有进度会先备份。'));},500);
        $('journey-claim').addEventListener('click',function(){action(async function(){
            if(!confirm(UI_T('领取并切换到这位游客？当前浏览器进度会先保留备份。')))return;
            await P.flush();var result=await DANBO_ACCOUNT.request('/claim',{code:code});
            await DANBO_MULTIPLAYER.leave();await DANBO_ACCOUNT.acceptHandoff(result);$('journey-claim').hidden=true;
            message(UI_T('接力成功！关闭手册，选择服务器即可继续。建议注册账号长期保存。'));
        });});
    }
    window.DANBO_JOURNEY={update:update,jump:jump,render:render,open:open,close:close,event:event,resetRuntime:resetRuntime,protects:protects,route:route};
    render();
})();
