// A short illustrated prologue, outside live gameplay. It never edits a save,
// starts a network session, or waits on image downloads before allowing Skip.
(function(){
    'use strict';
    var $=function(id){return document.getElementById(id);};
    var overlay=$('story-overlay'),art=$('story-art'),next=$('story-next'),previous=$('story-previous');
    var pages=[
        ['01-peace','平静的每一天','蛋宝们在蛋宝世界无忧无虑地生活。温柔的星光，照亮了大家回家的路。'],
        ['02-starstorm','直到那一夜','一场突如其来的星光风暴，把指路的星星吹散了。它们落进了小镇与远方。'],
        ['03-promise','小小的约定','「一起把星光找回来吧！」蛋宝们约好了，从脚边的第一点光开始。'],
        ['04-first-stars','故事，从你开始','你的第一份委托：在希望之城找回 3 点星光。完成初次旅行，戴上属于你的初旅星环。']
    ];
    var pending=null,resolve=null,page=0,activeKey='',seen=Object.create(null),oldFocus=null,preload=null,experienced=false;
    function key(){
        var user=window.DANBO_ACCOUNT&&DANBO_ACCOUNT.getUser(),origin='local';
        try{origin=new URL(DANBO_MULTIPLAYER.getEndpoint().replace(/^ws/,'http')).origin;}catch(_){}
        // Guest profile IDs may be renewed by the server, but its local save is
        // shared at the origin. Account IDs, never character names, scope users.
        return 'danbo_story_v1:'+origin+':'+(user&&user.kind==='account'?user.id:'guest');
    }
    function isSeen(k){try{return seen[k]||localStorage.getItem(k)==='yes';}catch(_){return !!seen[k];}}
    function release(){
        if(window.DANBO_MENU_INPUT)DANBO_MENU_INPUT.releaseGameplay();
        if(typeof _releaseGameplayControls==='function')_releaseGameplayControls();
    }
    function render(){
        if(!pending)return;
        var item=pages[page];
        $('story-title').textContent=UI_T(item[1]);$('story-text').textContent=UI_T(page===3&&experienced?'你已经找回了第一批星光。和伙伴一起探索，打开新的宝箱，留下今天的旅行纪念章。':item[2]);
        $('story-count').textContent=UI_T('星光序章 · {n} / 4',{n:page+1});
        $('story-skip').textContent=UI_T('跳过故事');previous.textContent=UI_T('上一页');
        next.textContent=UI_T(page===pages.length-1?(experienced?'继续旅程 →':'出发，寻找星光 →'):'下一页 →');
        previous.disabled=page===0;art.alt=UI_T(item[1]);
        overlay.setAttribute('aria-label',UI_T('星光序章'));
    }
    function showPage(){
        render();art.hidden=false;$('story-image-error').hidden=true;
        art.src='assets/story-v1/'+pages[page][0]+'.webp';
        // Only the next illustration is prefetched; none are engine boot assets.
        if(preload){preload.removeAttribute('src');preload=null;}
        if(page+1<pages.length){preload=new Image();preload.src='assets/story-v1/'+pages[page+1][0]+'.webp';}
    }
    function finish(reason){
        if(!pending)return;
        var done=resolve;resolve=null;pending=null;
        if(reason==='read'||reason==='skipped'){
            seen[activeKey]=true;try{localStorage.setItem(activeKey,'yes');}catch(_){}
        }
        window._storyOpen=false;overlay.classList.add('hidden');document.documentElement.classList.remove('story-playing');
        if(window._langMenuOpen&&typeof _closeLangMenu==='function')_closeLangMenu();
        art.removeAttribute('src');if(preload){preload.removeAttribute('src');preload=null;}
        release();if(window.DANBO_MENU_INPUT)DANBO_MENU_INPUT.leaveHud();
        if(oldFocus&&oldFocus.isConnected)oldFocus.focus({preventScroll:true});oldFocus=null;
        done(reason);
    }
    function playIfNew(){
        if(pending)return pending;
        if(!overlay||!art||!next||!previous)return Promise.resolve('unavailable');
        // Never cover a live multiplayer world with a reading panel.
        if(typeof gameState!=='undefined'&&gameState!=='menu')return Promise.resolve('in-game');
        var k=key();
        if(isSeen(k))return Promise.resolve('seen');
        experienced=!!(window.DANBO_PROGRESS&&DANBO_PROGRESS.journey().rewarded);
        activeKey=k;page=0;oldFocus=document.activeElement;
        pending=new Promise(function(r){resolve=r;});var result=pending;
        window._storyOpen=true;release();overlay.classList.remove('hidden');document.documentElement.classList.add('story-playing');
        try{showPage();next.focus({preventScroll:true});}catch(_){finish('error');}
        return result;
    }
    if(overlay&&art&&next&&previous){
        next.addEventListener('click',function(){if(!pending)return;if(page===pages.length-1){finish('read');return;}page++;showPage();});
        previous.addEventListener('click',function(){if(!pending||!page)return;page--;showPage();});
        $('story-skip').addEventListener('click',function(){finish('skipped');});
        art.addEventListener('error',function(){if(!pending)return;art.hidden=true;$('story-image-error').hidden=false;});
        window.addEventListener('pagehide',function(){finish('pagehide');});
    }
    window.DANBO_STORY={playIfNew:playIfNew,skip:function(){finish('skipped');},render:render,isPlaying:function(){return !!pending;}};
})();
