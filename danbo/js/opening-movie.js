// One HTML video owner, outside the 3D render loop. No first-visit flag: new
// characters and returning players both see the opening, and can always skip.
(function(){
    'use strict';
    var $=function(id){return document.getElementById(id);};
    var overlay=$('opening-overlay'),video=$('opening-video'),playButton=$('opening-play'),skipButton=$('opening-skip'),muteButton=$('opening-mute'),status=$('opening-status');
    var pending=null,resolve=null,watchdog=null,lastTime=0,idle=0,previousSfx=false,token=0,awaitGesture=false;
    function releaseInputs(){
        if(window.DANBO_MENU_INPUT)DANBO_MENU_INPUT.releaseGameplay();
        if(typeof _releaseGameplayControls==='function')_releaseGameplayControls();
    }
    function finish(reason){
        if(!pending)return;
        var done=resolve;resolve=null;pending=null;token++;
        clearInterval(watchdog);watchdog=null;window._openingMovieOpen=false;
        overlay.classList.add('hidden');document.documentElement.classList.remove('opening-playing');
        try{video.pause();video.removeAttribute('src');video.load();}catch(_mediaCleanupError){}
        window._sfxMuted=previousSfx;releaseInputs();done(reason);
    }
    function mutedLabel(){muteButton.textContent=UI_T(video.muted?'开启声音':'静音');muteButton.setAttribute('aria-pressed',String(video.muted));}
    function needsGesture(){
        if(!pending)return;awaitGesture=true;playButton.hidden=false;status.textContent=UI_T('点击播放，也可直接跳过');playButton.focus({preventScroll:true});
    }
    function start(){
        if(!pending)return;var current=token;awaitGesture=false;idle=0;playButton.hidden=true;status.textContent=UI_T('片头加载中…');
        try{var attempt=video.play();if(attempt&&attempt.catch)attempt.catch(function(error){
            if(!pending||current!==token)return;
            if(error&&error.name==='NotSupportedError')finish('error');else needsGesture();
        });}catch(error){if(error&&error.name==='NotSupportedError')finish('error');else needsGesture();}
    }
    function play(){
        if(pending)return pending;
        if(!overlay||!video)return Promise.resolve('unavailable');
        pending=new Promise(function(r){resolve=r;});var result=pending;
        token++;previousSfx=!!window._sfxMuted;window._sfxMuted=true;window._openingMovieOpen=true;
        releaseInputs();overlay.classList.remove('hidden');document.documentElement.classList.add('opening-playing');
        if(typeof stopSelectBGM==='function')stopSelectBGM();if(typeof stopTitleBGM==='function')stopTitleBGM();if(typeof stopBGM==='function')stopBGM();if(typeof stopRaceBGM==='function')stopRaceBGM();
        video.muted=typeof soundEnabled==='boolean'&&!soundEnabled;mutedLabel();playButton.textContent=UI_T('播放片头');skipButton.textContent=UI_T('跳过片头 →');overlay.setAttribute('aria-label',UI_T('片头动画'));
        lastTime=0;idle=0;skipButton.focus({preventScroll:true});
        try{video.src='assets/video/opening-full-v1.mp4';video.load();start();}catch(_mediaLoadError){finish('error');}
        if(!pending)return result;
        // No decoded progress for 20 visible seconds must not trap a slow or
        // offline player. A browser asking for a gesture is not a network error.
        watchdog=setInterval(function(){
            if(!pending||document.hidden||awaitGesture)return;
            if(video.currentTime>lastTime+.05){lastTime=video.currentTime;idle=0;}else idle++;
            if(idle>=20)finish('timeout');
        },1000);
        return result;
    }
    if(video){
        video.addEventListener('ended',function(){finish('ended');});video.addEventListener('error',function(){finish('error');});
        video.addEventListener('playing',function(){if(!pending)return;awaitGesture=false;playButton.hidden=true;status.textContent='';idle=0;});
        video.addEventListener('pause',function(){if(pending&&!document.hidden&&!video.ended)needsGesture();});
        playButton.addEventListener('click',start);skipButton.addEventListener('click',function(){finish('skipped');});
        muteButton.addEventListener('click',function(){video.muted=!video.muted;mutedLabel();if(video.paused)start();});
        document.addEventListener('visibilitychange',function(){if(!pending)return;if(document.hidden)video.pause();else start();});
        window.addEventListener('pagehide',function(){finish('pagehide');});
    }
    window.DANBO_OPENING={play:play,skip:function(){finish('skipped');},isPlaying:function(){return !!pending;}};
})();
