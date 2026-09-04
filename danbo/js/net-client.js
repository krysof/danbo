(function(){
    'use strict';

    function clonePlain(obj){
        if(obj===undefined||obj===null)return obj;
        try{return JSON.parse(JSON.stringify(obj));}
        catch(e){
            if(Array.isArray(obj))return obj.slice();
            if(typeof obj==='object'){
                var out={};
                for(var k in obj){
                    if(!Object.prototype.hasOwnProperty.call(obj,k))continue;
                    var v=obj[k];
                    if(typeof v!=='function')out[k]=clonePlain(v);
                }
                return out;
            }
            return obj;
        }
    }

    function freezeDeep(obj){
        if(!obj||typeof obj!=='object')return obj;
        Object.freeze(obj);
        Object.keys(obj).forEach(function(k){
            var v=obj[k];
            if(v&&typeof v==='object'&&!Object.isFrozen(v))freezeDeep(v);
        });
        return obj;
    }

    function makeEmitter(){
        var handlers={};
        return {
            on:function(type,fn){
                if(typeof fn!=='function')return function(){};
                (handlers[type]||(handlers[type]=[])).push(fn);
                return function(){
                    var arr=handlers[type]||[];
                    var i=arr.indexOf(fn);
                    if(i>=0)arr.splice(i,1);
                };
            },
            off:function(type,fn){
                var arr=handlers[type]||[];
                var i=arr.indexOf(fn);
                if(i>=0)arr.splice(i,1);
            },
            emit:function(type,payload){
                var arr=(handlers[type]||[]).slice();
                for(var i=0;i<arr.length;i++){
                    try{arr[i](payload);}catch(e){console.error('[DANBO_NET] handler failed',type,e);}
                }
                var any=(handlers['*']||[]).slice();
                for(var j=0;j<any.length;j++){
                    try{any[j]({type:type,payload:payload});}catch(e2){console.error('[DANBO_NET] wildcard handler failed',e2);}
                }
            }
        };
    }

    function createOfflineRoom(opts){
        opts=opts||{};
        var emitter=makeEmitter();
        var selfId='local-'+Math.random().toString(36).slice(2,8);
        var roomId=opts.roomId||('offline-'+(opts.pluginId||'plugin'));
        var character=clonePlain(opts.character||{});
        var closed=false;
        var state={
            roomId:roomId,
            mode:'offline',
            serverTime:Date.now(),
            players:[{id:selfId,self:true,character:character,ready:true}]
        };
        return {
            mode:'offline',
            online:false,
            roomId:roomId,
            selfId:selfId,
            on:emitter.on,
            off:emitter.off,
            send:function(type,payload){
                if(closed)return false;
                var msg={type:type,payload:clonePlain(payload||{}),from:selfId,clientTime:Date.now()};
                setTimeout(function(){emitter.emit(type,msg);emitter.emit('message',msg);},0);
                return true;
            },
            getSnapshot:function(){
                state.serverTime=Date.now();
                return freezeDeep(clonePlain(state));
            },
            close:function(){closed=true;emitter.emit('close',{reason:'closed'});}
        };
    }

    function createWebSocketRoom(opts){
        opts=opts||{};
        var emitter=makeEmitter();
        var url=opts.url;
        var selfId=opts.selfId||('pending-'+Math.random().toString(36).slice(2,8));
        var roomId=opts.roomId||'';
        var state={roomId:roomId,mode:'online',serverTime:Date.now(),players:[]};
        var ws=null;
        try{
            ws=new WebSocket(url);
            ws.addEventListener('open',function(){
                emitter.emit('open',{});
                ws.send(JSON.stringify({type:'join',roomId:roomId,pluginId:opts.pluginId,character:opts.character||{}}));
            });
            ws.addEventListener('message',function(ev){
                var msg=null;
                try{msg=JSON.parse(ev.data);}catch(e){msg={type:'raw',payload:ev.data};}
                if(msg.type==='snapshot'&&msg.payload)state=msg.payload;
                if(msg.selfId)selfId=msg.selfId;
                if(msg.roomId)roomId=msg.roomId;
                emitter.emit(msg.type||'message',msg);
                emitter.emit('message',msg);
            });
            ws.addEventListener('close',function(ev){emitter.emit('close',{code:ev.code,reason:ev.reason});});
            ws.addEventListener('error',function(ev){emitter.emit('error',ev);});
        }catch(err){
            setTimeout(function(){emitter.emit('error',err);},0);
        }
        return {
            mode:'online',
            online:true,
            roomId:roomId,
            selfId:selfId,
            on:emitter.on,
            off:emitter.off,
            send:function(type,payload){
                if(!ws||ws.readyState!==WebSocket.OPEN)return false;
                ws.send(JSON.stringify({type:type,roomId:roomId,payload:payload||{},clientTime:Date.now()}));
                return true;
            },
            getSnapshot:function(){return freezeDeep(clonePlain(state));},
            close:function(){if(ws)ws.close();}
        };
    }

    window.DANBO_NET={
        createRoom:function(opts){
            opts=opts||{};
            var net=opts.network||{};
            if(net.url)return createWebSocketRoom({
                url:net.url,
                roomId:net.roomId,
                selfId:net.selfId,
                pluginId:opts.pluginId,
                character:opts.character
            });
            return createOfflineRoom(opts);
        }
    };
})();
