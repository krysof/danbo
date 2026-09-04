// wasm.js — optional DANBO World WebAssembly core loader
// Keeps gameplay identical: if WASM cannot load, all helpers fall back to JS.
(function(){
    function n(v){return Number(v);}
    var api={
        ready:false,
        attempted:false,
        failed:false,
        mode:'js-fallback',
        exports:null,
        build:0,
        error:null,
        _outView:null,
        _tmp:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        _readOut:function(count){
            var v=api._outView,t=api._tmp;
            if(v){for(var i=0;i<count;i++)t[i]=v[i];}
            return t;
        },
        configValue:function(id){
            var e=api.exports;
            if(e&&e.danbo_config_value)return e.danbo_config_value(id|0);
            var vals={1:7.6,2:5.8,3:1.0,4:0.9,5:7.0,6:10.0};
            return vals[id|0]||0;
        },
        dist2D:function(px,pz,tx,tz){
            var e=api.exports;
            px=n(px);pz=n(pz);tx=n(tx);tz=n(tz);
            if(e&&e.danbo_portal_distance)return e.danbo_portal_distance(px,pz,tx,tz);
            var dx=px-tx, dz=pz-tz;
            return Math.sqrt(dx*dx+dz*dz);
        },
        dist2DSq:function(px,pz,tx,tz){
            var e=api.exports;
            px=n(px);pz=n(pz);tx=n(tx);tz=n(tz);
            if(e&&e.danbo_distance_2d_sq)return e.danbo_distance_2d_sq(px,pz,tx,tz);
            var dx=px-tx, dz=pz-tz;
            return dx*dx+dz*dz;
        },
        dist3D:function(px,py,pz,tx,ty,tz){
            var e=api.exports;
            px=n(px);py=n(py);pz=n(pz);tx=n(tx);ty=n(ty);tz=n(tz);
            if(e&&e.danbo_distance_3d)return e.danbo_distance_3d(px,py,pz,tx,ty,tz);
            var dx=px-tx, dy=py-ty, dz=pz-tz;
            return Math.sqrt(dx*dx+dy*dy+dz*dz);
        },
        dist3DSq:function(px,py,pz,tx,ty,tz){
            var e=api.exports;
            px=n(px);py=n(py);pz=n(pz);tx=n(tx);ty=n(ty);tz=n(tz);
            if(e&&e.danbo_distance_3d_sq)return e.danbo_distance_3d_sq(px,py,pz,tx,ty,tz);
            var dx=px-tx, dy=py-ty, dz=pz-tz;
            return dx*dx+dy*dy+dz*dz;
        },
        len2D:function(dx,dz){
            var e=api.exports;
            dx=n(dx);dz=n(dz);
            if(e&&e.danbo_length_2d)return e.danbo_length_2d(dx,dz);
            return api.dist2D(dx,dz,0,0);
        },
        len3D:function(dx,dy,dz){
            var e=api.exports;
            dx=n(dx);dy=n(dy);dz=n(dz);
            if(e&&e.danbo_length_3d)return e.danbo_length_3d(dx,dy,dz);
            return api.dist3D(dx,dy,dz,0,0,0);
        },
        norm2D:function(dx,dz,eps){
            var e=api.exports,t=api._tmp;
            dx=n(dx);dz=n(dz);eps=n(eps===undefined?0.000001:eps);
            if(e&&e.danbo_normalize_2d&&api._outView){e.danbo_normalize_2d(dx,dz,eps);return api._readOut(4);}
            var len=api.len2D(dx,dz);t[2]=len;
            if(len>eps){t[0]=dx/len;t[1]=dz/len;t[3]=1;}else{t[0]=0;t[1]=0;t[3]=0;}
            return t;
        },
        clampVel2D:function(vx,vz,maxSpeed){
            var e=api.exports,t=api._tmp;
            vx=n(vx);vz=n(vz);maxSpeed=n(maxSpeed);
            if(e&&e.danbo_clamp_velocity_2d&&api._outView){e.danbo_clamp_velocity_2d(vx,vz,maxSpeed);return api._readOut(4);}
            var speed=api.len2D(vx,vz);t[2]=speed;
            if(speed>maxSpeed&&speed>0){var s=maxSpeed/speed;t[0]=vx*s;t[1]=vz*s;t[3]=1;}else{t[0]=vx;t[1]=vz;t[3]=0;}
            return t;
        },
        rotateKeepSpeed2D:function(vx,vz,angleDelta){
            var e=api.exports,t=api._tmp;
            vx=n(vx);vz=n(vz);angleDelta=n(angleDelta);
            if(e&&e.danbo_rotate_keep_speed_2d&&api._outView){e.danbo_rotate_keep_speed_2d(vx,vz,angleDelta);return api._readOut(3);}
            var speed=api.len2D(vx,vz),a=Math.atan2(vx,vz)+angleDelta;
            t[0]=Math.sin(a)*speed;t[1]=Math.cos(a)*speed;t[2]=speed;
            return t;
        },
        angleDiff:function(a,b){
            var e=api.exports;
            a=n(a);b=n(b);
            if(e&&e.danbo_angle_diff_abs)return e.danbo_angle_diff_abs(a,b);
            var d=Math.abs(a-b),tp=Math.PI*2;
            while(d>tp)d-=tp;
            return d>Math.PI?tp-d:d;
        },
        arcHit2D:function(dx,dz,faceY,maxDist,minDist,halfAngle){
            var e=api.exports,t=api._tmp;
            dx=n(dx);dz=n(dz);faceY=n(faceY);maxDist=n(maxDist);minDist=n(minDist);halfAngle=n(halfAngle);
            if(e&&e.danbo_arc_hit_2d&&api._outView){e.danbo_arc_hit_2d(dx,dz,faceY,maxDist,minDist,halfAngle);return api._readOut(6);}
            var dist=api.len2D(dx,dz),ang=Math.atan2(dx,dz),diff=api.angleDiff(ang,faceY),hit=(dist<maxDist&&dist>minDist&&diff<halfAngle);
            t[0]=dist;t[1]=ang;t[2]=diff;t[3]=hit?1:0;t[4]=dist>minDist?dx/dist:0;t[5]=dist>minDist?dz/dist:0;
            return t;
        },
        coneDotHit2D:function(dx,dz,faceY,maxDist,minDist,minDot){
            var e=api.exports,t=api._tmp;
            dx=n(dx);dz=n(dz);faceY=n(faceY);maxDist=n(maxDist);minDist=n(minDist);minDot=n(minDot);
            if(e&&e.danbo_cone_dot_hit_2d&&api._outView){e.danbo_cone_dot_hit_2d(dx,dz,faceY,maxDist,minDist,minDot);return api._readOut(5);}
            var dist=api.len2D(dx,dz),dot=dist>minDist?(dx*Math.sin(faceY)+dz*Math.cos(faceY))/dist:0,hit=(dist<maxDist&&dist>minDist&&dot>minDot);
            t[0]=dist;t[1]=dot;t[2]=hit?1:0;t[3]=dist>minDist?dx/dist:0;t[4]=dist>minDist?dz/dist:0;
            return t;
        },
        within2D:function(px,pz,tx,tz,radius){
            var e=api.exports;
            px=n(px);pz=n(pz);tx=n(tx);tz=n(tz);radius=n(radius);
            if(e&&e.danbo_within_radius_2d)return !!e.danbo_within_radius_2d(px,pz,tx,tz,radius);
            return api.dist2DSq(px,pz,tx,tz)<radius*radius;
        },
        within3D:function(px,py,pz,tx,ty,tz,radius){
            var e=api.exports;
            px=n(px);py=n(py);pz=n(pz);tx=n(tx);ty=n(ty);tz=n(tz);radius=n(radius);
            if(e&&e.danbo_within_radius_3d)return !!e.danbo_within_radius_3d(px,py,pz,tx,ty,tz,radius);
            return api.dist3DSq(px,py,pz,tx,ty,tz)<radius*radius;
        },
        aabb2D:function(px,pz,cx,cz,halfW,halfD,margin){
            var e=api.exports;
            px=n(px);pz=n(pz);cx=n(cx);cz=n(cz);halfW=n(halfW);halfD=n(halfD);margin=n(margin||0);
            if(e&&e.danbo_aabb2d_contains)return !!e.danbo_aabb2d_contains(px,pz,cx,cz,halfW,halfD,margin);
            return Math.abs(px-cx)<halfW+margin&&Math.abs(pz-cz)<halfD+margin;
        },
        aabbOverlap2D:function(px,pz,cx,cz,halfW,halfD,margin){
            var e=api.exports,t=api._tmp;
            px=n(px);pz=n(pz);cx=n(cx);cz=n(cz);halfW=n(halfW);halfD=n(halfD);margin=n(margin||0);
            if(e&&e.danbo_aabb2d_overlap&&api._outView){e.danbo_aabb2d_overlap(px,pz,cx,cz,halfW,halfD,margin);return api._readOut(8);}
            var dx=px-cx,dz=pz-cz,ox=halfW+margin-Math.abs(dx),oz=halfD+margin-Math.abs(dz),hit=(ox>0&&oz>0);
            t[0]=dx;t[1]=dz;t[2]=ox;t[3]=oz;t[4]=(ox<oz?0:1);t[5]=(dx>0?1:(dx<0?-1:0));t[6]=(dz>0?1:(dz<0?-1:0));t[7]=hit?1:0;
            return t;
        },
        sfxVolume:function(px,pz,wx,wz){
            var e=api.exports;
            px=n(px);pz=n(pz);wx=n(wx);wz=n(wz);
            if(e&&e.danbo_sfx_volume)return e.danbo_sfx_volume(px,pz,wx,wz);
            var dist=api.dist2D(wx,wz,px,pz);
            if(isNaN(dist))return 0;
            if(dist<3)return 1;
            if(dist>60)return 0;
            if(dist>30)return 0.5*(1-(dist-30)/30);
            return 1-(dist-3)*0.5/27;
        },
        absDeltaWithin:function(a,b,limit){
            var e=api.exports;
            a=n(a);b=n(b);limit=n(limit);
            if(e&&e.danbo_abs_delta_within)return !!e.danbo_abs_delta_within(a,b,limit);
            return Math.abs(a-b)<=limit;
        },
        absDeltaLess:function(a,b,limit){
            var e=api.exports;
            a=n(a);b=n(b);limit=n(limit);
            if(e&&e.danbo_abs_delta_less)return !!e.danbo_abs_delta_less(a,b,limit);
            return Math.abs(a-b)<limit;
        },
        nearGround:function(onGround,vy,py){
            var e=api.exports;
            vy=n(vy);py=n(py);
            if(e&&e.danbo_near_ground)return !!e.danbo_near_ground(onGround?1:0,vy,py);
            return !!(onGround||Math.abs(vy)<0.25||py<2.5);
        },
        confirmRange:function(confirmDist,isWarpPipe){
            var e=api.exports;
            confirmDist=n(confirmDist);
            if(e&&e.danbo_confirm_range)return e.danbo_confirm_range(confirmDist,isWarpPipe?1:0);
            return confirmDist+(isWarpPipe?api.configValue(4):api.configValue(3));
        },
        racePortalHeightOk:function(py,portalY){
            var e=api.exports;
            py=n(py);portalY=n(portalY);
            if(e&&e.danbo_race_portal_height_ok)return !!e.danbo_race_portal_height_ok(py,portalY);
            return Math.abs(py-portalY)<=7;
        },
        warpPipeHeightOk:function(py){
            var e=api.exports;
            py=n(py);
            if(e&&e.danbo_warp_pipe_height_ok)return !!e.danbo_warp_pipe_height_ok(py);
            return py<=10;
        },
        portalAction:function(distance,triggerDist,confirmDist,isWarpPipe,isVoluntary){
            var e=api.exports;
            distance=n(distance);triggerDist=n(triggerDist);confirmDist=n(confirmDist);
            if(e&&e.danbo_portal_action)return e.danbo_portal_action(distance,triggerDist,confirmDist,isWarpPipe?1:0,isVoluntary?1:0);
            if(!isVoluntary||distance>=triggerDist)return 0;
            return distance<api.confirmRange(confirmDist,isWarpPipe)?2:1;
        }
    };
    window.DANBO_WASM=api;

    function _wasmUrl(){
        var q='';
        try{
            var s=document.currentScript&&document.currentScript.src;
            if(s&&s.indexOf('?')>=0)q=s.substring(s.indexOf('?'));
        }catch(e){}
        return 'wasm/danbo_core.wasm'+q;
    }
    function _fail(err){
        api.failed=true;api.error=err&&err.message?err.message:String(err||'unknown');api.mode='js-fallback';
        if(window.console&&console.warn)console.warn('[DANBO_WASM] fallback:',api.error);
        return api;
    }
    if(!window.WebAssembly||!window.fetch){
        window._danboWasmReady=Promise.resolve(_fail('WebAssembly/fetch unavailable'));
        return;
    }
    api.attempted=true;
    window._danboWasmReady=fetch(_wasmUrl(),{cache:'force-cache'})
        .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.arrayBuffer();})
        .then(function(bytes){return WebAssembly.instantiate(bytes,{});})
        .then(function(result){
            api.exports=result.instance.exports;
            api.ready=true;api.failed=false;api.mode='wasm';
            if(api.exports.danbo_build_number)api.build=api.exports.danbo_build_number();
            if(api.exports.memory&&api.exports.danbo_out_ptr){
                api._outView=new Float64Array(api.exports.memory.buffer,api.exports.danbo_out_ptr(),16);
            }
            return api;
        })
        .catch(_fail);
})();
