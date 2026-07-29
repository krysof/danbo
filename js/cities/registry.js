// ============================================================
//  js/cities/registry.js — City data registry
//  城市数据注册表：每个城市单独文件注册，city.js 只负责生成。
// ============================================================
(function(global){
    var registry=global.DANBO_CITY_REGISTRY||{};
    registry.cities=registry.cities||{};
    registry.styles=registry.styles||[];
    registry.defaults=registry.defaults||{};
    registry.index=registry.index||{version:1,cities:[],preload:[0]};
    registry.cityMeta=registry.cityMeta||{};
    registry.loaded=registry.loaded||{};

    registry.registerCity=function(def){
        if(!def||def.id===undefined||def.id===null)return;
        var id=Number(def.id);
        var prev=registry.cities[id]||{};
        registry.cities[id]=Object.assign({},prev,def);
        registry.cities[id].id=id;
        if(def.style)registry.styles[id]=def.style;
        if(def.layout||def.npc||def.wildlife||def.collectibles)registry.loaded[id]=true;
    };
    registry.registerCityIndex=function(index){
        index=index||{};
        registry.index={version:index.version||1,cities:index.cities||[],preload:index.preload||[0]};
        for(var i=0;i<registry.index.cities.length;i++){
            var meta=registry.index.cities[i];
            if(!meta||meta.id===undefined)continue;
            var id=Number(meta.id);
            registry.cityMeta[id]=meta;
            if(meta.style)registry.styles[id]=meta.style;
            if(!registry.cities[id]){
                registry.cities[id]={id:id,slug:meta.slug,nameKey:meta.nameKey,style:meta.style,_metaOnly:true};
            }else if(meta.style&&!registry.cities[id].style){
                registry.cities[id].style=meta.style;
            }
        }
    };
    registry.setDefault=function(key,value){registry.defaults[key]=value;};
    registry.getDefault=function(key){return registry.defaults[key];};
    registry.loadBundle=function(bundle,source){
        if(!bundle)return false;
        if(bundle.defaults){
            Object.keys(bundle.defaults).forEach(function(key){
                registry.defaults[key]=bundle.defaults[key];
            });
        }
        var list=bundle.cities||(bundle.city?[bundle.city]:[]);
        for(var i=0;i<list.length;i++)registry.registerCity(list[i]);
        registry.bundleVersion=bundle.version||0;
        registry.bundleBuild=bundle.build||0;
        registry.bundleSource=source||bundle.source||'bundle';
        return true;
    };
    registry.getCityMeta=function(id){return registry.cityMeta[Number(id)]||null;};
    registry.isCityLoaded=function(id){return !!registry.loaded[Number(id)];};
    registry.getCity=function(id){return registry.cities[Number(id)]||null;};
    registry.getStyle=function(id){
        var city=registry.getCity(id);
        return (city&&city.style)||registry.styles[Number(id)]||null;
    };
    registry.getStyles=function(){
        var max=-1;
        Object.keys(registry.cities).forEach(function(k){var n=Number(k);if(n>max)max=n;});
        if(registry.styles.length-1>max)max=registry.styles.length-1;
        var arr=[];
        for(var i=0;i<=max;i++){
            var st=registry.getStyle(i);
            if(st)arr[i]=st;
        }
        return arr;
    };
    registry.getLayout=function(id){
        var city=registry.getCity(id);
        return (city&&city.layout)||{};
    };
    registry.getPathList=function(id){
        var layout=registry.getLayout(id);
        if(layout.paths)return layout.paths;
        if(layout.pathSet===null)return [];
        if(layout.pathSet&&registry.defaults[layout.pathSet])return registry.defaults[layout.pathSet];
        return null;
    };
    registry.getBuildingList=function(id){
        var layout=registry.getLayout(id);
        if(layout.buildings)return layout.buildings;
        if(layout.buildingSet===null)return [];
        if(layout.buildingSet&&registry.defaults[layout.buildingSet])return registry.defaults[layout.buildingSet];
        return null;
    };
    registry.getSpecialObjects=function(id){
        var layout=registry.getLayout(id);
        return Array.isArray(layout.specialObjects)?layout.specialObjects:[];
    };
    registry.getSpecialObject=function(id,typeOrId){
        var list=registry.getSpecialObjects(id);
        for(var i=0;i<list.length;i++){
            var item=list[i];
            if(item&&(item.id===typeOrId||item.type===typeOrId))return item;
        }
        return null;
    };
    registry.getWarpPipes=function(){return registry.defaults.warpPipes||null;};

    global.DANBO_CITY_REGISTRY=registry;
})(window);
