(function(){
    'use strict';
    window.DANBO_PLUGIN_MANIFEST=[
        {
            id:'legacy-race',
            name:'经典竞速赛道',
            version:'0.2.0',
            enabled:true,
            integratedScene:true,
            scripts:['plugins/legacy-race/race-core.js','plugins/legacy-race/race-flow.js','plugins/legacy-race/plugin.js'],
            networkReady:true,
            legacyAdapter:false,
            description:'竞速赛道插件：核心赛道构建代码位于本插件目录，入口通过 DANBO_PLUGIN_HOST 启动。'
        },
        {
            id:'legacy-platformer',
            name:'蛋宝冒险',
            version:'0.2.0',
            enabled:true,
            integratedScene:true,
            scripts:['plugins/legacy-platformer/platformer-core.js','plugins/legacy-platformer/plugin.js'],
            networkReady:true,
            legacyAdapter:false,
            description:'横版平台关插件：核心关卡代码位于本插件目录，入口通过 DANBO_PLUGIN_HOST 启动。'
        },
        {
            id:'rocket-road',
            name:'蛋宝火箭公路',
            version:'0.1.3',
            enabled:true,
            entranceScript:'plugins/rocket-road/entrance.js',
            scripts:['plugins/rocket-road/rocket-road-core.js','plugins/rocket-road/plugin.js'],
            networkReady:true,
            legacyAdapter:false,
            description:'蛋宝原创火箭车致敬小游戏：3D 画面、2D 俯视公路玩法、独立 WASM 规则模块。'
        },
        {
            id:'ability-card',
            name:'角色能力卡测试',
            version:'0.1.0',
            enabled:true,
            script:'plugins/ability-card/plugin.js',
            networkReady:true,
            devOnly:true,
            description:'示例小游戏插件：只接收当前角色编号、名字、能力和基础数值，并通过房间 API 发送意图。'
        }
    ];
    if(window.DANBO_PLUGIN_HOST&&window.DANBO_PLUGIN_HOST.setManifest){
        window.DANBO_PLUGIN_HOST.setManifest(window.DANBO_PLUGIN_MANIFEST);
    }
})();
