(function(){
    'use strict';
    if(!window.DANBO_PLUGIN_HOST){console.warn('[legacy-platformer] Plugin host missing');return;}

    window.DANBO_PLUGIN_HOST.register({
        id:'legacy-platformer',
        version:'0.2.0',
        integratedScene:true,
        name:{zhs:'蛋宝冒险',en:'Danbo Adventure'},
        description:'Side-scrolling platformer minigame plugin. Runtime code is loaded from plugins/legacy-platformer/platformer-core.js and started through the plugin host.',
        create:function(ctx){
            if(ctx.net)ctx.net.send('minigame.startIntent',{pluginId:ctx.pluginId,characterId:ctx.character.id});
            if(typeof _pfStart==='function'){
                _pfStart();
            } else {
                console.error('[legacy-platformer] _pfStart is missing');
                ctx.api.finish({status:'error',reason:'_pfStart missing'});
            }
            return {
                update:function(){},
                destroy:function(result){
                    if(ctx.net)ctx.net.send('minigame.stopIntent',{pluginId:ctx.pluginId,result:result||{}});
                }
            };
        }
    });
})();
