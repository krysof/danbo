(function(){
    'use strict';
    if(!window.DANBO_PLUGIN_HOST){console.warn('[rocket-road] Plugin host missing');return;}

    window.DANBO_PLUGIN_HOST.register({
        id:'rocket-road',
        version:'0.1.3',
        name:{zhs:'蛋宝火箭公路',en:'Danbo Rocket Road'},
        description:'Original Danbo arcade road minigame: 3D presentation, 2D Road Fighter-inspired single-stage rules, independent WASM.',
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
