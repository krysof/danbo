// ============================================================
//  js/cities/common-layout.js — Shared non-map city defaults
//  不放普通地图模板。每个城市都必须在自己的 city-*.js 里定义专属地图层。
// ============================================================
(function(registry){
    if(!registry)return;
    registry.setDefault('warpPipes',[
        {x:0,z:-65,targetStyle:1,rot:0,label:'🏜️ 沙漠'},
        {x:65,z:0,targetStyle:2,rot:-Math.PI/2,label:'❄️ 冰雪'},
        {x:0,z:65,targetStyle:3,rot:Math.PI,label:'🔥 熔岩'},
        {x:-65,z:0,targetStyle:4,rot:Math.PI/2,label:'🍬 糖果'}
    ]);
})(window.DANBO_CITY_REGISTRY);
