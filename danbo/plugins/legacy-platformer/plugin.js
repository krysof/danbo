(function(){
    'use strict';
    if(!window.DANBO_PLUGIN_HOST){console.warn('[legacy-platformer] Plugin host missing');return;}

    window.DANBO_PLUGIN_HOST.register({
        id:'legacy-platformer',
        version:'0.3.0',
        name:{zhs:'蛋宝冒险',zht:'蛋寶冒險',ja:'たまごの冒険',en:'Egg Trail'},
        description:'Side-scrolling platformer minigame plugin. Runtime code is loaded from plugins/legacy-platformer/platformer-core.js and started through the plugin host.',
        create:function(ctx){
            if(ctx.net)ctx.net.send('minigame.startIntent',{pluginId:ctx.pluginId,characterId:ctx.character.id});
            var game=window.DanboPlatformer.start(ctx);
            return {
                update:function(){},
                destroy:function(result){
                    game.dispose();
                    if(ctx.net)ctx.net.send('minigame.stopIntent',{pluginId:ctx.pluginId,result:result||{}});
                }
            };
        }
    });
})();
