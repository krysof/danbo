// Room-coordinated Star Duet; this client renders and opts in, never decides wins.
(function(){
    'use strict';
    var PADS=[[[-10,44],[10,44]],[[-18,44],[18,44]],[[-10,36],[10,36]]];
    var $=function(id){return document.getElementById(id);},markers=null,lastRender=0,lastSignature='',note='',rewardNoteUntil=0,lastRoom=null;
    var copy={
        title:['星光协奏 · 多人协作','星のデュエット · 協力プレイ','Star Duet · Co-op'],
        intro:['双人站位挑战 · 希望之城喷泉南侧','2人でリングチャレンジ · 希望の街の噴水の南','Two-player ring challenge · South of the Hope City fountain'],
        stepJoin:['两位玩家都点「加入协作」（城市伙伴不参与）。','2人とも「参加する」を押す（街の仲間は参加しません）。','Both players choose Join duet (city companions do not participate).'],
        stepStand:['一人站 A 环，一人站 B 环，同时停留 3.5 秒。','A と B に1人ずつ分かれ、同時に3.5秒立ち止まる。','Stand on A and B separately; both hold still for 3.5 seconds.'],
        stepFinish:['跟随光环完成 3 段；限时 3 分钟，失败不扣奖励。','移動するリングで3段階クリア。制限3分、失敗のペナルティなし。','Follow the rings through 3 stages in 3 minutes. No penalty for retrying.'],
        invitation:['星光协奏 · 双人站位挑战\n点此查看玩法 / 邀请朋友','星のデュエット · 2人で協力\nタップして遊び方・招待','Star Duet · Two-player challenge\nTap for rules / invite a friend'],
        reward:['参与成功点亮，可永久解锁「羁绊羽翼」。游客也能参加。','協力してクリアすると「絆の翼」を獲得。ゲストも参加できます。','Help complete the duet to unlock Bond Wings. Guests are welcome.'],
        join:['加入协作','参加する','Join duet'],leave:['退出协作','参加をやめる','Leave duet'],share:['邀请朋友来同服','同じサーバーに招待','Invite to this server'],
        disconnected:['请先进入服务器；暂时无人时可以先自由探索。','まずサーバーに入ってください。仲間を待つ間は自由に探索できます。','Enter a server first. You can explore while waiting for a partner.'],
        old:['此服务器尚未支持协作，请更新服务器。','このサーバーは協力プレイの更新が必要です。','This server needs the co-op update.'],
        returnToHope:['请在希望之城室外站稳、脱离抓取后加入；室内和小游戏中不能参加。','希望の街の屋外で地面に立ち、つかまれていない状態で参加してください。屋内やミニゲーム中は参加できません。','Stand on the ground outdoors in Hope City, free from being grabbed, to join. Buildings and minigames do not count.'],
        waiting:['等待伙伴 · 已准备 {n} 人','仲間を待っています · 準備完了 {n} 人','Waiting for a partner · {n} ready'],
        active:['第 {stage}/3 段 · 双环 {mask}/2 · 共鸣 {hold}/3.5 秒 · 剩余 {time} 秒','ステージ {stage}/3 · リング {mask}/2 · 共鳴 {hold}/3.5 秒 · 残り {time} 秒','Stage {stage}/3 · Rings {mask}/2 · Hold {hold}/3.5s · {time}s left'],
        go:['前往 {pad} 环 · {distance} 米','{pad} リングへ · {distance} m','To ring {pad} · {distance}m'],
        waitPartner:['星光协奏 · 等待另一位玩家加入\n点此邀请朋友或退出','星のデュエット · もう1人の参加を待っています\nタップして招待・退出','Star Duet · Waiting for another player\nTap to invite or leave'],
        stage:['星光协奏 {stage}/3 · 剩余 {time} 秒','星のデュエット {stage}/3 · 残り {time} 秒','Star Duet {stage}/3 · {time}s left'],
        stay:['已到 {pad} 环 · 等队友站上另一环','{pad} に到着 · 仲間がもう一方に立つのを待とう','On {pad} · Wait for a partner on the other ring'],
        hold:['站稳别动 · 共鸣 {hold}/3.5 秒','そのまま！ · 共鳴 {hold}/3.5 秒','Stay still · Hold {hold}/3.5s'],
        land:['在 {pad} 环内落地站稳','{pad} のリング内に着地しよう','Land and stand inside ring {pad}'],
        complete:['本轮协作成功！稍后可再加入。','協力成功！まもなく再び参加できます。','Duet complete! You can join again shortly.'],
        failed:['本轮超时，没有扣除奖励。稍后可重新加入。','時間切れです。報酬は減りません。まもなく再挑戦できます。','Time is up. No rewards lost; join again shortly.'],
        earned:['协作成功！羁绊羽翼已解锁；已有背饰不会被替换。','協力成功！「絆の翼」を獲得しました。装備中の背飾りは変更しません。','Bond Wings unlocked! Your existing back accessory stays equipped.'],
        cooldown:['本轮正在结算，稍后再加入。','結果を処理中です。少し待ってから参加してください。','This round is settling. Please try again shortly.'],
        rewardUnavailable:['奖励暂未到账，请保持登录后重试协作；当前进度不会扣除。','報酬を保存できませんでした。ログインしたまま再挑戦してください。進行状況は減りません。','Reward delivery failed. Stay logged in and retry the duet; no progress was deducted.']
    };
    var traditional={
        title:'星光協奏 · 多人協作',intro:'雙人站位挑戰 · 希望之城噴泉南側',
        stepJoin:'兩位玩家都點「加入協作」（城市夥伴不參與）。',stepStand:'一人站 A 環，一人站 B 環，同時停留 3.5 秒。',
        stepFinish:'跟隨光環完成 3 段；限時 3 分鐘，失敗不扣獎勵。',invitation:'星光協奏 · 雙人站位挑戰\n點此查看玩法 / 邀請朋友',
        reward:'參與成功點亮，可永久解鎖「羈絆羽翼」。遊客也能參加。',join:'加入協作',leave:'退出協作',share:'邀請朋友來同服',
        disconnected:'請先進入伺服器；暫時無人時可以先自由探索。',old:'此伺服器尚未支援協作，請更新伺服器。',
        returnToHope:'請在希望之城室外站穩、脫離抓取後加入；室內和小遊戲中不能參加。',waiting:'等待夥伴 · 已準備 {n} 人',
        active:'第 {stage}/3 段 · 雙環 {mask}/2 · 共鳴 {hold}/3.5 秒 · 剩餘 {time} 秒',go:'前往 {pad} 環 · {distance} 公尺',
        waitPartner:'星光協奏 · 等待另一位玩家加入\n點此邀請朋友或退出',stage:'星光協奏 {stage}/3 · 剩餘 {time} 秒',
        stay:'已到 {pad} 環 · 等隊友站上另一環',hold:'站穩別動 · 共鳴 {hold}/3.5 秒',land:'在 {pad} 環內落地站穩',
        complete:'本輪協作成功！稍後可再加入。',failed:'本輪逾時，沒有扣除獎勵。稍後可重新加入。',
        earned:'協作成功！羈絆羽翼已解鎖；已有背飾不會被替換。',cooldown:'本輪正在結算，稍後再加入。',
        rewardUnavailable:'獎勵暫未到帳，請保持登入後重試協作；目前進度不會扣除。'
    };
    Object.keys(copy).forEach(function(key){copy[key].splice(1,0,traditional[key]);});
    function t(key,values){var lang=typeof _langCode==='string'?_langCode:'zhs',s=(copy[key]||copy.disconnected)[lang==='zht'?1:lang==='ja'?2:lang==='en'?3:0];if(values)Object.keys(values).forEach(function(k){s=s.replace('{'+k+'}',values[k]);});return s;}
    function state(){var room=DANBO_MULTIPLAYER.getRoom();return room&&DANBO_MULTIPLAYER.isConnected()?{room:room,s:room.state,p:room.state&&room.state.players&&room.state.players.get(room.sessionId)}:null;}
    function inWorld(){return gameState==='city'&&currentCityStyle===0&&!window._interiorActive&&!window._pipeTraveling&&!window._pipeCityBuilding&&!window._danboPluginTransition&&!(window.DANBO_PLUGIN_HOST&&DANBO_PLUGIN_HOST.getActive());}
    function joined(){var info=state();return !!(info&&info.p&&info.p.coopJoined);}
    function invitation(){
        var info=state(),p=typeof playerEgg!=='undefined'&&playerEgg&&playerEgg.mesh.position;
        if(!info||!info.s||!info.p||info.p.coopJoined||!inWorld()||!p||!['idle','active'].includes(info.s.coopPhase))return '';
        return Math.abs(p.x)<=28&&p.z>=14&&p.z<=54?t('invitation'):'';
    }
    function statusText(info){
        if(!info)return t('disconnected');var s=info.s;
        if(!s||typeof s.coopPhase!=='string')return t('old');
        if(s.coopPhase==='active')return t('active',{stage:Math.min(3,s.coopStage+1),mask:(s.coopMask&1?1:0)+(s.coopMask&2?1:0),hold:(Math.max(0,s.coopHold)/1000).toFixed(1),time:Math.max(0,Math.ceil((s.coopEndsAt-s.coopNow)/1000))});
        return s.coopPhase==='idle'?t('waiting',{n:s.coopMembers||0}):t(s.coopPhase==='complete'?'complete':'failed');
    }
    function hint(){
        if(Date.now()<rewardNoteUntil)return t('earned');
        var info=state();if(!info||!info.s||!info.p||!info.p.coopJoined||!inWorld())return '';
        var s=info.s,p=typeof playerEgg!=='undefined'&&playerEgg&&playerEgg.mesh.position;
        if(s.coopPhase==='idle')return t('waitPartner');
        if(s.coopPhase!=='active'||!p||!PADS[s.coopStage])return statusText(info);
        var pads=PADS[s.coopStage],d0=Math.hypot(p.x-pads[0][0],p.z-pads[0][1]),d1=Math.hypot(p.x-pads[1][0],p.z-pads[1][1]);
        var idx=d1<d0?1:0,inside=Math.min(d0,d1)<=2.5;
        // The occupancy mask includes us: do not send a player on A over to B.
        if(!inside){if(s.coopMask===1)idx=1;else if(s.coopMask===2)idx=0;}
        var guidance=inside?(p.y>1.8||p.y<-.5||!playerEgg.onGround||playerEgg.heldBy?t('land',{pad:idx?'B':'A'}):
            s.coopMask===3?t('hold',{hold:(Math.max(0,s.coopHold)/1000).toFixed(1)}):t('stay',{pad:idx?'B':'A'})):
            t('go',{pad:idx?'B':'A',distance:Math.ceil(idx?d1:d0)});
        return t('stage',{stage:s.coopStage+1,time:Math.max(0,Math.ceil((s.coopEndsAt-s.coopNow)/1000))})+'\n'+guidance;
    }
    function render(){
        var info=state(),s=info&&info.s,p=info&&info.p,joined=!!(p&&p.coopJoined);
        $('coop-title').textContent=t('title');$('coop-intro').textContent=t('intro');$('coop-reward').textContent=t('reward');
        $('coop-step-join').textContent=t('stepJoin');$('coop-step-stand').textContent=t('stepStand');$('coop-step-finish').textContent=t('stepFinish');
        $('coop-status').textContent=statusText(info);$('coop-note').textContent=note?t(note):'';
        $('coop-join').textContent=t('join');$('coop-leave').textContent=t('leave');$('coop-share').textContent=t('share');
        $('coop-join').hidden=joined;$('coop-leave').hidden=!joined;
        $('coop-join').disabled=!info||!s||typeof s.coopPhase!=='string'||s.coopPhase==='complete'||s.coopPhase==='failed';
        $('coop-share').disabled=!info;
    }
    function error(code){note=copy[code]?code:'disconnected';render();}
    function label(text){var canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;var c=canvas.getContext('2d');c.fillStyle='#123442';c.beginPath();c.arc(64,64,56,0,Math.PI*2);c.fill();c.fillStyle='#fff5ce';c.textAlign='center';c.textBaseline='middle';c.font='bold 78px sans-serif';c.fillText(text,64,68);var texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthWrite:false}));}
    function build(){
        markers=new THREE.Group();markers.name='danbo-coop-pads';
        var ring=new THREE.TorusGeometry(2.5,0.075,4,40),gem=new THREE.OctahedronGeometry(0.4,0);
        [0x6CDECA,0xFFD576].forEach(function(color,i){
            var root=new THREE.Group(),material=new THREE.MeshBasicMaterial({color:color}),outline=new THREE.Mesh(ring,material),star=new THREE.Mesh(gem,material);
            outline.rotation.x=-Math.PI/2;outline.position.y=0.07;star.position.set(i?3.1:-3.1,0.9,0);root.add(outline,star);
            // Keep the badge outside the standing area, not over the player's head.
            var sign=label(i?'B':'A');sign.position.set(i?3.1:-3.1,1.7,0);sign.scale.set(0.75,0.75,1);root.add(sign);markers.add(root);
        });scene.add(markers);
    }
    function update(){
        var info=state(),s=info&&info.s,p=info&&info.p,now=performance.now();
        if(info&&info.room!==lastRoom){lastRoom=info.room;note='';lastSignature='';}
        if(p&&p.coopWon&&typeof Cosmetics!=='undefined'&&!Cosmetics.isOwned('back_bond')){
            Cosmetics.data().owned.back_bond=true;
            if(!Cosmetics.equipment().back)Cosmetics.equip('back','back_bond');else Cosmetics.save();
            DANBO_PROGRESS.capture();DANBO_PROGRESS.flush();note='earned';rewardNoteUntil=Date.now()+12000;
            if(window.DANBO_JOURNEY)DANBO_JOURNEY.event('coop');
        }
        // Visibility is shared by the room; only scoring/protection is opt-in.
        var visible=!!(s&&p&&(s.coopPhase==='idle'||s.coopPhase==='active')&&inWorld());
        if(visible&&!markers)build();if(markers)markers.visible=visible;
        if(visible){
            var pads=PADS[Math.min(2,s.coopStage||0)];
            for(var i=0;i<2;i++){var m=markers.children[i];m.position.set(pads[i][0],0,pads[i][1]);m.children[1].rotation.y=now*0.001;m.children[1].scale.setScalar(s.coopMask&(1<<i)?1.45:1);}
        }
        if(now-lastRender>250){lastRender=now;var signature=hint()+'|'+(s&&s.coopPhase)+'|'+(s&&s.coopMembers)+'|'+(typeof _langCode!=='undefined'?_langCode:'');if(signature!==lastSignature){lastSignature=signature;render();}}
    }
    function protects(egg){
        var info=state();if(!egg||!egg.isPlayer||!info||!info.p||!info.p.coopJoined||gameState!=='city'||currentCityStyle!==0||window._interiorActive)return false;
        // Cover the approach and paths between stages, not only the rings.
        var p=egg.mesh.position;return Math.abs(p.x)<=24&&p.z>=14&&p.z<=50;
    }
    function join(){
        if(gameState!=='city'||currentCityStyle!==0||window._interiorActive){error('returnToHope');return;}
        note='';DANBO_JOURNEY.close();DANBO_MULTIPLAYER.close();
        if(!DANBO_MULTIPLAYER.coop('join'))error('disconnected');render();
    }
    $('coop-join').addEventListener('click',join);
    $('coop-leave').addEventListener('click',function(){DANBO_MULTIPLAYER.coop('leave');note='';render();});
    $('coop-share').addEventListener('click',function(){DANBO_MULTIPLAYER.share();});
    function nearby(){
        var info=state();if(!info||!info.s||!info.p||info.p.coopJoined||!inWorld()||!['idle','active'].includes(info.s.coopPhase))return '';
        var p=playerEgg.mesh.position,pads=PADS[Math.min(2,info.s.coopStage||0)];
        return pads.some(function(pad){return Math.hypot(p.x-pad[0],p.z-pad[1])<7;})?t('join'):'';
    }
    window.DANBO_COOP={update:update,render:render,error:error,hint:hint,invitation:invitation,joined:joined,protects:protects,pads:PADS,nearby:nearby,join:join};render();
})();
