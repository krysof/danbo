(function(){
    'use strict';
    if(!window.DANBO_PLUGIN_HOST){console.warn('[rocket-road] Plugin host missing');return;}

    window.DANBO_PLUGIN_HOST.register({
        id:'rocket-road',
        version:'0.3.0',
        name:{zhs:'蛋宝火箭公路',zht:'蛋寶火箭公路',ja:'たまごロケットロード',en:'Egg Rocket Road'},
        description:'Six-stage arcade driving with shared global rankings and server-verified input replays.',
        create:function(ctx){
            if(ctx.net)ctx.net.send('minigame.startIntent',{pluginId:ctx.pluginId,characterId:ctx.character.id,screen:'title'});
            if(window.DanboRocketRoad&&typeof window.DanboRocketRoad.start==='function'){
                var game=window.DanboRocketRoad.start(ctx);
                return {
                    update:function(){},
                    destroy:function(result){
                        if(ctx.net)ctx.net.send('minigame.stopIntent',{pluginId:ctx.pluginId,result:result||{}});
                        if(game&&typeof game.dispose==='function')game.dispose();
                    }
                };
            }
            console.error('[rocket-road] runtime missing');
            ctx.api.finish({status:'error',reason:'rocket runtime missing'});
            return {destroy:function(){}};
        }
    });
})();
