// ============================================================
//  js/cities/wasm-city-loader.js — lazy per-city data loader
//  Dev: load js/cities/city-*.js only when needed.
//  Release: load wasm/cities/city-*.wasm only when needed.
// ============================================================
(function(){
    'use strict';
    var registry=window.DANBO_CITY_REGISTRY;
    var api=window.DANBO_CITY_DATA={ready:false,attempted:false,failed:false,mode:'pending',build:0,error:null,source:'none',loaded:{},loading:{}};

    function cacheQuery(){
        if(window.DANBO_ASSET_VERSION)return String(window.DANBO_ASSET_VERSION).charAt(0)==='?'?window.DANBO_ASSET_VERSION:'?'+window.DANBO_ASSET_VERSION;
        try{var s=document.currentScript&&document.currentScript.src;if(s&&s.indexOf('?')>=0)return s.substring(s.indexOf('?'));}catch(e){}
        return '';
    }
    function loadMode(){return window.DANBO_CITY_LOAD_MODE||'js';}
    function fail(err){
        api.failed=true;api.error=err&&err.message?err.message:String(err||'unknown');
        if(window.console&&console.warn)console.warn('[DANBO_CITY_DATA] lazy load fallback:',api.error);
        return api;
    }
    function metaFor(id){return registry&&registry.getCityMeta?registry.getCityMeta(id):null;}
    function isLoaded(id){return !!(registry&&registry.isCityLoaded&&registry.isCityLoaded(id));}
    function markLoaded(id,source){api.loaded[id]=source||true;api.source=source||api.source;}
    function scriptLoad(src){
        return new Promise(function(resolve,reject){
            var s=document.createElement('script');
            s.src=src+cacheQuery();
            s.onload=function(){resolve();};
            s.onerror=function(){reject(new Error('script load failed '+src));};
            document.body.appendChild(s);
        });
    }
    function loadCityJs(id,meta){
        if(!meta||!meta.script)return Promise.reject(new Error('missing city script for '+id));
        return scriptLoad(meta.script).then(function(){
            if(!isLoaded(id))throw new Error('city script did not register '+id);
            markLoaded(id,'js-lazy');
            return registry.getCity(id);
        });
    }
    function loadCityWasm(id,meta){
        if(!window.WebAssembly||!window.fetch)return Promise.reject(new Error('WebAssembly/fetch unavailable'));
        if(!meta||!meta.wasm)return Promise.reject(new Error('missing city wasm for '+id));
        api.attempted=true;
        return fetch(meta.wasm+cacheQuery(),{cache:'force-cache'})
            .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status+' '+meta.wasm);return r.arrayBuffer();})
            .then(function(bytes){return WebAssembly.instantiate(bytes,{});})
            .then(function(result){
                var e=result.instance.exports;
                if(!e.memory||!e.danbo_city_data_json_ptr||!e.danbo_city_data_json_len)throw new Error('invalid city-data wasm ABI');
                var ptr=e.danbo_city_data_json_ptr()>>>0;
                var len=e.danbo_city_data_json_len()>>>0;
                var bytes=new Uint8Array(e.memory.buffer,ptr,len);
                var text=(window.TextDecoder?new TextDecoder('utf-8').decode(bytes):String.fromCharCode.apply(null,Array.prototype.slice.call(bytes)));
                var bundle=JSON.parse(text);
                if(!registry.loadBundle)throw new Error('registry loadBundle unavailable');
                registry.loadBundle(bundle,'wasm-lazy');
                api.build=e.danbo_city_data_build_number?e.danbo_city_data_build_number():(bundle.build||0);
                if(!isLoaded(id))throw new Error('city wasm did not register '+id);
                markLoaded(id,'wasm-lazy');
                return registry.getCity(id);
            });
    }
    function ensureCityLoaded(id){
        id=Number(id)||0;
        if(!registry)return Promise.reject(new Error('registry unavailable'));
        if(isLoaded(id)){markLoaded(id,api.loaded[id]||'cached');return Promise.resolve(registry.getCity(id));}
        if(api.loading[id])return api.loading[id];
        var meta=metaFor(id);
        var mode=loadMode();
        var p=(mode==='wasm'?loadCityWasm(id,meta):loadCityJs(id,meta).catch(function(err){
            // In dev, allow explicit fallback to wasm if requested and available.
            if(window.DANBO_CITY_ALLOW_WASM_FALLBACK)return loadCityWasm(id,meta);
            throw err;
        })).then(function(city){delete api.loading[id];return city;}).catch(function(err){delete api.loading[id];throw err;});
        api.loading[id]=p;
        return p;
    }
    function preloadInitial(){
        var preload=(registry&&registry.index&&registry.index.preload)||[0];
        var chain=Promise.resolve();
        preload.forEach(function(id){chain=chain.then(function(){return ensureCityLoaded(id);});});
        return chain.then(function(){
            api.ready=true;api.failed=false;api.mode=loadMode()==='wasm'?'wasm-lazy':'js-lazy';api.source=api.mode;
            return api;
        }).catch(function(err){api.ready=true;return fail(err);});
    }

    api.ensureCityLoaded=ensureCityLoaded;
    api.isLoaded=isLoaded;
    api.getMeta=metaFor;
    window._danboCityDataReady=preloadInitial();
})();
