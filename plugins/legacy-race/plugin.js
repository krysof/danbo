(function(){
    'use strict';
    if(!window.DANBO_PLUGIN_HOST){console.warn('[legacy-race] Plugin host missing');return;}

    window.DANBO_PLUGIN_HOST.register({
        id:'legacy-race',
        version:'0.2.0',
        integratedScene:true,
        name:{zhs:'经典竞速赛道',en:'Legacy Race Course'},
        description:'Race-course minigame plugin. Runtime code is loaded from plugins/legacy-race/race-core.js and started through the plugin host.',
        create:function(ctx){
            var raceIndex=Number(ctx.options&&ctx.options.raceIndex);
            if(!isFinite(raceIndex))raceIndex=0;
            if(ctx.net)ctx.net.send('minigame.startIntent',{pluginId:ctx.pluginId,raceIndex:raceIndex,characterId:ctx.character.id});
            if(typeof enterRace==='function'){
                enterRace(raceIndex);
            } else {
                console.error('[legacy-race] enterRace is missing');
                ctx.api.finish({status:'error',reason:'enterRace missing'});
            }
            return {
                update:function(){},
                destroy:function(result){
                    if(ctx.net)ctx.net.send('minigame.stopIntent',{pluginId:ctx.pluginId,raceIndex:raceIndex,result:result||{}});
                }
            };
        }
    });
})();
