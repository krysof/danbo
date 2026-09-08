// One owner for legacy Explorer/shop state. Guest, server and account saves are
// separate. Optimistic cloud revisions prevent lost updates across tabs/devices.
(function(){
    'use strict';
    var user=null,key='',record=null,busy=null,blocked=false,status='游客进度保存在本机',last='',remote=null;
    var journey={steps:0,distance:0,jumped:false,rewarded:false,stamps:[]};
    function clone(value){return JSON.parse(JSON.stringify(value));}
    function read(k){try{return JSON.parse(localStorage.getItem(k)||'null');}catch(_){return null;}}
    function write(k,value){try{localStorage.setItem(k,JSON.stringify(value));return true;}catch(_){status='浏览器存储已满，当前进度尚未安全保存';return false;}}
    function fresh(){return {version:1,explorer:{explorerPoints:0,explorerLevel:1,cityProgress:{},titles:{},cosmetics:{},achievements:{},chests:{},hidden:{},claimed:{},daily:{date:'',count:0}},shop:{owned:{},equipment:{},coins:0},journey:{steps:0,distance:0,jumped:false,rewarded:false,stamps:[]}};}
    function snapshot(){return clone({version:1,explorer:Explorer.data(),shop:{owned:Cosmetics.data().owned,equipment:Cosmetics.equipment(),coins:Math.max(0,Math.floor(coins||0))},journey:journey});}
    // Freeze the pre-upgrade legacy save once, BEFORE any account can replace
    // runtime globals. A later guest must not inherit the last logged-in account.
    if(!read('danbo_legacy_backup_v1'))write('danbo_legacy_backup_v1',snapshot());
    function replace(target,source){Object.keys(target).forEach(function(k){delete target[k];});Object.keys(source).forEach(function(k){if(k!=='__proto__'&&k!=='constructor'&&k!=='prototype')target[k]=source[k];});}
    function apply(value){
        if(!value||value.version!==1||!value.explorer||!value.shop||!value.journey)throw new Error(UI_T('存档格式不兼容；原数据未删除'));
        var v=clone(value);
        replace(Explorer.data(),v.explorer);replace(Cosmetics.data(),v.shop);coins=v.shop.coins||0;journey=v.journey;
        // Existing cities may already be built behind character selection.
        if(typeof cityChests!=='undefined')cityChests.forEach(function(ch){ch.opened=Explorer.isChestOpened(ch.id);ch.lidAngle=ch.opened?1.2:0;if(ch.lid)ch.lid.rotation.x=-ch.lidAngle;});
        if(typeof _applyCosmetics==='function')_applyCosmetics();
        var hud=document.getElementById('coin-hud');if(hud)hud.textContent='⭐ '+coins;
        if(typeof _updateChestHud==='function')_updateChestHud();
        if(typeof _updatePlayerTag==='function')_updatePlayerTag(true);
        if(window.DANBO_JOURNEY)DANBO_JOURNEY.resetRuntime();
        last=JSON.stringify(snapshot());
    }
    function capture(){
        if(!record||!key)return;
        var next=snapshot(),text=JSON.stringify(next);
        if(text!==last){record.snapshot=next;record.dirty=true;last=text;}
        write(key,record);
    }
    function request(path,body){return DANBO_ACCOUNT.request(path,body);}
    function unlock(items){
        if(!Array.isArray(items))return;
        items.forEach(function(id){if(id==='back_bond')Cosmetics.data().owned[id]=true;});
    }
    function setStatus(text){status=text;if(window.DANBO_JOURNEY)DANBO_JOURNEY.render();}
    function localizedStatus(){
        var prefixes=['云存档暂不可用，本机进度保留。','云同步失败，本机进度保留。'];
        for(var i=0;i<prefixes.length;i++)if(status.indexOf(prefixes[i])===0)return UI_T(prefixes[i])+status.slice(prefixes[i].length);
        return UI_T(status);
    }
    async function activate(next,reason,incoming){
        if(busy)await busy;
        capture();var carried=snapshot();
        user=next;blocked=user.kind==='account';remote=null;
        var origin=new URL(DANBO_MULTIPLAYER.getEndpoint().replace(/^ws/,'http')).origin;
        key='danbo_progress_v1:'+origin+':'+(user.kind==='guest'?'guest':user.id);
        record=read(key);
        if(!record||!record.snapshot){
            // Only the first guest imports legacy storage. Existing accounts never
            // inherit another guest's money/achievements simply by logging in.
            var initial=user.kind==='guest'?(read('danbo_legacy_migrated_v1')?fresh():read('danbo_legacy_backup_v1')||fresh()):fresh();
            record={revision:0,dirty:false,snapshot:initial};
            if(user.kind==='guest')write('danbo_legacy_migrated_v1',true);
        }
        if(reason==='register'||reason==='handoff'){write(key+':backup',record);record={revision:0,dirty:true,snapshot:incoming||carried};}
        apply(record.snapshot);capture();
        if(user.kind==='guest'){setStatus('游客进度已保存在此浏览器');return;}
        setStatus('正在读取云存档…');
        try{
            remote=await request('/progress');
            if(record.dirty&&remote.revision!==record.revision){blocked=true;setStatus('发现两份进度，请打开旅程手册选择；没有覆盖任何一份');return;}
            if(!record.dirty&&remote.snapshot){record={revision:remote.revision,dirty:false,snapshot:remote.snapshot};apply(record.snapshot);capture();}
            else record.revision=remote.revision;
            unlock(remote.unlocks);capture();
            blocked=false;
            await flush();
        }catch(error){blocked=true;setStatus('云存档暂不可用，本机进度保留。'+error.message);}
    }
    function flush(){
        capture();
        if(busy)return busy;
        if(!user||user.kind==='guest')return Promise.resolve(true);
        if(blocked)return Promise.resolve(false);
        if(!record.dirty){setStatus('云存档已同步');return Promise.resolve(true);}
        var sent=clone(record.snapshot),text=JSON.stringify(sent),sentKey=key;
        busy=(async function(){
            try{
                var result=await request('/progress',{revision:record.revision,snapshot:sent});
                if(sentKey!==key)return false;
                record.revision=result.revision;capture();record.dirty=JSON.stringify(record.snapshot)!==text;write(key,record);
                unlock(result.unlocks);capture();
                setStatus(record.dirty?'新进度等待同步':'云存档已同步');
                if(window.DANBO_JOURNEY)DANBO_JOURNEY.event('save');
                return true;
            }catch(error){
                if(error.status===409)blocked=true;
                setStatus(error.status===409?'其他设备有新进度，请选择存档；两份均已保留':'云同步失败，本机进度保留。'+error.message);
                return false;
            }finally{busy=null;}
        })();
        return busy;
    }
    async function resolve(which){
        if(busy)await busy;
        capture();remote=await request('/progress');
        // Explicit user decision only. Keep a recoverable local backup even then.
        write(key+':backup',record);
        if(which==='cloud'){
            if(!remote.snapshot)throw new Error(UI_T('云端还没有存档'));
            record={revision:remote.revision,dirty:false,snapshot:remote.snapshot};apply(record.snapshot);unlock(remote.unlocks);
        }else record.revision=remote.revision;
        blocked=false;capture();return flush();
    }
    async function retry(){
        if(!user||user.kind==='guest')return true;
        var current=await request('/progress');
        if(current.revision!==record.revision){blocked=true;setStatus('云端与本机版本不同，请选择存档');return false;}
        blocked=false;return flush();
    }
    function importGuest(value){return activate(DANBO_ACCOUNT.getUser(),'handoff',value);}
    function resetGuest(){
        if(!user||user.kind!=='guest')throw new Error(UI_T('展台重置只能用于游客，请先退出账号'));
        write(key+':backup',record);record={revision:0,dirty:false,snapshot:fresh()};apply(record.snapshot);capture();
        localStorage.removeItem('danbo_guest_profile_v1');
    }
    // Preserve established save calls; no per-frame JSON, geometry or networking.
    [Explorer,Cosmetics].forEach(function(owner){var save=owner.save;owner.save=function(){save();capture();};});
    setInterval(function(){capture();if(!document.hidden)flush();},15000);
    document.addEventListener('visibilitychange',function(){if(document.hidden){capture();flush();}});
    window.addEventListener('pagehide',capture);
    window.DANBO_PROGRESS={activate:activate,capture:capture,flush:flush,retry:retry,resolve:resolve,importGuest:importGuest,resetGuest:resetGuest,
        snapshot:snapshot,fresh:fresh,journey:function(){return journey;},getStatus:localizedStatus,hasConflict:function(){return blocked;}};
})();
