// minigame-wasm.js — independent WASM loaders for plugin minigames
// Rendering remains JS/Three.js; pure minigame rules use independent WASM modules with JS fallback.
(function(){
    'use strict';
    function n(v){return Number(v);}
    function cacheQuery(){
        if(window.DANBO_ASSET_VERSION)return String(window.DANBO_ASSET_VERSION).charAt(0)==='?'?window.DANBO_ASSET_VERSION:'?'+window.DANBO_ASSET_VERSION;
        try{var s=document.currentScript&&document.currentScript.src;if(s&&s.indexOf('?')>=0)return s.substring(s.indexOf('?'));}catch(e){}
        return '';
    }
    function makeBase(id,file){
        return {id:id,file:file,ready:false,attempted:false,failed:false,mode:'js-fallback',exports:null,build:0,error:null,_outView:null,_tmp:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],_readOut:function(count){var v=this._outView,t=this._tmp;if(v){for(var i=0;i<count;i++)t[i]=v[i];}return t;}};
    }
    function loadModule(api,outPtrName,buildName){
        function fail(err){
            api.failed=true;api.error=err&&err.message?err.message:String(err||'unknown');api.mode='js-fallback';
            if(window.console&&console.warn)console.warn('[DANBO_MINIGAME_WASM:'+api.id+'] fallback:',api.error);
            return api;
        }
        if(!window.WebAssembly||!window.fetch)return Promise.resolve(fail('WebAssembly/fetch unavailable'));
        api.attempted=true;
        return fetch(api.file+cacheQuery(),{cache:'force-cache'})
            .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.arrayBuffer();})
            .then(function(bytes){return WebAssembly.instantiate(bytes,{});})
            .then(function(result){
                api.exports=result.instance.exports;
                api.ready=true;api.failed=false;api.mode='wasm';
                if(api.exports[buildName])api.build=api.exports[buildName]();
                if(api.exports.memory&&api.exports[outPtrName])api._outView=new Float64Array(api.exports.memory.buffer,api.exports[outPtrName](),16);
                return api;
            }).catch(fail);
    }

    var race=makeBase('legacy-race','wasm/danbo_race.wasm');
    race.trackWidth=function(){var e=this.exports;return e&&e.danbo_race_track_width?e.danbo_race_track_width():10;};
    race.totalEggs=function(ri){var e=this.exports;ri=ri|0;return e&&e.danbo_race_total_eggs?e.danbo_race_total_eggs(ri):(14+Math.max(0,ri)*2);};
    race.startCols=function(total,trackW){var e=this.exports;total=total|0;trackW=n(trackW);return e&&e.danbo_race_start_cols?e.danbo_race_start_cols(total,trackW):Math.min(total,Math.floor(trackW*2/2.5)||1);};
    race.startX=function(col,cols,trackW,jitter){var e=this.exports;col=col|0;cols=cols|0;trackW=n(trackW);jitter=n(jitter||0);if(e&&e.danbo_race_start_x)return e.danbo_race_start_x(col,cols,trackW,jitter);var c=Math.max(1,cols),spacing=trackW*2/(c+1);return -trackW+spacing*(col+1)+jitter;};
    race.startZ=function(row,jitter){var e=this.exports;row=row|0;jitter=n(jitter||0);return e&&e.danbo_race_start_z?e.danbo_race_start_z(row,jitter):(-2-row*3+jitter);};
    race.startSlot=function(i,cols,trackW,jitterX,jitterZ){var e=this.exports,t=this._tmp;i=i|0;cols=cols|0;trackW=n(trackW);jitterX=n(jitterX||0);jitterZ=n(jitterZ||0);if(e&&e.danbo_race_start_slot&&this._outView){e.danbo_race_start_slot(i,cols,trackW,jitterX,jitterZ);return this._readOut(4);}var c=Math.max(1,cols),row=Math.floor(i/c),col=i%c;t[0]=row;t[1]=col;t[2]=this.startX(col,c,trackW,jitterX);t[3]=this.startZ(row,jitterZ);return t;};
    race.surviveCount=function(total){var e=this.exports;total=total|0;return e&&e.danbo_race_survive_count?e.danbo_race_survive_count(total):Math.ceil(total*0.6);};
    race.isWinningPlace=function(place,total){var e=this.exports;place=place|0;total=total|0;return e&&e.danbo_race_is_winning_place?!!e.danbo_race_is_winning_place(place,total):(place>=1&&place<=this.surviveCount(total));};
    race.progress=function(gz,trackLength){var e=this.exports;gz=n(gz);trackLength=n(trackLength);if(e&&e.danbo_race_progress)return e.danbo_race_progress(gz,trackLength);if(trackLength<=0)return 0;return Math.max(0,Math.min(1,gz/trackLength));};
    race._segTypeCode=function(type){return type==='ramp'?1:(type==='platforms'?2:0);};
    race.floorY=function(seg,z){if(!seg)return 0;var e=this.exports;var code=this._segTypeCode(seg.type);var fy=seg.floorY||0;if(e&&e.danbo_race_floor_y)return e.danbo_race_floor_y(code,n(z),n(seg.startZ),n(seg.endZ),n(seg.startY||0),n(seg.endY||0),n(fy));if(code===2)return -100;if(code===1){var len=seg.endZ-seg.startZ;if(Math.abs(len)<0.000001)return seg.endY||0;var t=Math.max(0,Math.min(1,(z-seg.startZ)/len));return (seg.startY||0)+t*((seg.endY||0)-(seg.startY||0));}return fy;};
    race.finishCrossed=function(finished,pfActive,trackLength,gz){var e=this.exports;if(e&&e.danbo_race_finish_crossed)return !!e.danbo_race_finish_crossed(finished?1:0,pfActive?1:0,n(trackLength),n(gz));return !finished&&!pfActive&&trackLength>0&&gz>=trackLength-2;};
    race.obstacleSpeed=function(base,perRace,ri,sign,multiplier){var e=this.exports;base=n(base);perRace=n(perRace);ri=ri|0;sign=n(sign);multiplier=n(multiplier===undefined?1:multiplier);if(e&&e.danbo_race_obstacle_speed)return e.danbo_race_obstacle_speed(base,perRace,ri,sign,multiplier);return (base+perRace*ri)*(sign<0?-1:1)*multiplier;};

    var platformer=makeBase('legacy-platformer','wasm/danbo_platformer.wasm');
    platformer.tileSize=function(){var e=this.exports;return e&&e.danbo_platformer_tile_size?e.danbo_platformer_tile_size():4;};
    platformer.levelLength=function(){var e=this.exports;return e&&e.danbo_platformer_level_length?e.danbo_platformer_level_length():200;};
    platformer.partySize=function(){var e=this.exports;return e&&e.danbo_platformer_party_size?e.danbo_platformer_party_size():4;};
    platformer.depth=function(tile){var e=this.exports;tile=n(tile);return e&&e.danbo_platformer_depth?e.danbo_platformer_depth(tile):tile*3;};
    platformer.width=function(tile,length){var e=this.exports;tile=n(tile);length=length|0;return e&&e.danbo_platformer_width?e.danbo_platformer_width(tile,length):tile*length;};
    platformer.castleX=function(tile,length){var e=this.exports;tile=n(tile);length=length|0;return e&&e.danbo_platformer_castle_x?e.danbo_platformer_castle_x(tile,length):(length-3)*tile;};
    platformer.goalX=function(tile,length){var e=this.exports;tile=n(tile);length=length|0;return e&&e.danbo_platformer_goal_x?e.danbo_platformer_goal_x(tile,length):(length-6)*tile;};
    platformer.movingX=function(baseX,phase,range){var e=this.exports;baseX=n(baseX);phase=n(phase);range=n(range);return e&&e.danbo_platformer_moving_x?e.danbo_platformer_moving_x(baseX,phase,range):baseX+Math.sin(phase)*range;};
    platformer.rotatingXY=function(centerX,centerY,radius,angle){var e=this.exports,t=this._tmp;centerX=n(centerX);centerY=n(centerY);radius=n(radius);angle=n(angle);if(e&&e.danbo_platformer_rotating_xy&&this._outView){e.danbo_platformer_rotating_xy(centerX,centerY,radius,angle);return this._readOut(2);}t[0]=centerX+Math.cos(angle)*radius;t[1]=centerY+Math.sin(angle)*radius*0.3;return t;};
    platformer.fallingRockStep=function(y,vy,gravity,removeY){var e=this.exports,t=this._tmp;y=n(y);vy=n(vy);gravity=n(gravity===undefined?0.008:gravity);removeY=n(removeY===undefined?-5:removeY);if(e&&e.danbo_platformer_falling_rock_step&&this._outView){e.danbo_platformer_falling_rock_step(y,vy,gravity,removeY);return this._readOut(3);}var nvy=vy-gravity,ny=y+nvy;t[0]=ny;t[1]=nvy;t[2]=ny<removeY?1:0;return t;};
    platformer.crumbleTrigger=function(px,py,cx,cy,hw){var e=this.exports;px=n(px);py=n(py);cx=n(cx);cy=n(cy);hw=n(hw);if(e&&e.danbo_platformer_crumble_trigger)return !!e.danbo_platformer_crumble_trigger(px,py,cx,cy,hw);return Math.abs(px-cx)<=hw+1&&Math.abs(py-cy)<=2;};
    platformer.mushroomBounce=function(px,py,vy,mx,mh,hw){var e=this.exports;px=n(px);py=n(py);vy=n(vy);mx=n(mx);mh=n(mh);hw=n(hw);if(e&&e.danbo_platformer_mushroom_bounce)return !!e.danbo_platformer_mushroom_bounce(px,py,vy,mx,mh,hw);return vy<=0&&Math.abs(px-mx)<=hw+0.5&&py<=mh+0.5&&py>=mh-1.5;};
    platformer.windForce=function(px,x1,x2,force){var e=this.exports;px=n(px);x1=n(x1);x2=n(x2);force=n(force);return e&&e.danbo_platformer_wind_force?e.danbo_platformer_wind_force(px,x1,x2,force):(px>=x1&&px<=x2?force:0);};
    platformer.goalReached=function(px,goalX,reached){var e=this.exports;px=n(px);goalX=n(goalX);if(e&&e.danbo_platformer_goal_reached)return !!e.danbo_platformer_goal_reached(px,goalX,reached?1:0);return goalX&&px>=goalX&&!reached;};

    function rrRoadWidth(distance){
        var d=Math.max(0,Math.min(3300,n(distance)));
        if(d<420)return 10.8;
        if(d<880)return 11.4;
        if(d<1260)return 9.7;
        if(d<1710)return 11.1;
        if(d<2260)return 8.9;
        if(d<2860)return 10.2;
        return 11.7;
    }
    function rrLaneX(lane,width){lane=Math.max(0,Math.min(3,lane|0));var inner=n(width)*0.84;return -inner*0.5+inner*(lane+0.5)/4;}
    function rrEventAt(i){
        i=Math.max(0,Math.min(89,i|0));var j,z,l,t,b=0;
        if(i<18){j=i;z=46+j*38;l=(j*2+1)%4;t=(j===5||j===14)?5:(j%6===0?2:1);b=t===5?18:0;return [z,l,t,0,j%3,b];}
        if(i<42){j=i-18;z=970+j*45;l=(j*3+2)%4;t=(j===4||j===17)?5:(j%8===0?6:(j%7===0?4:(j%3===0?3:2)));b=t===5?20:0;return [z,l,t,0,j%4,b];}
        if(i<68){j=i-42;z=1880+j*40;l=(j*5+1)%4;t=(j===8||j===21)?5:(j%6===0?6:(j%7===2?4:(j%2===0?3:2)));b=t===5?22:0;return [z,l,t,0,j%5,b];}
        j=i-68;z=2850+j*29;l=(j*7+3)%4;t=(j===11)?5:(j%9===0?6:(j%5===0?4:(j%3===0?3:2)));b=t===5?24:0;return [z,l,t,0,j%6,b];
    }
    function rrCollide(px,pz,ox,oz,type){
        var hx=1.1,hz=2.05,t=type|0;
        if(t===4){hx=1.55;hz=3.15;}else if(t===5){hx=1.18;hz=2.15;}else if(t===6){hx=1.65;hz=1.15;}else if(t===3){hx=1.16;hz=2.2;}else if(t===2){hx=1.2;hz=2.25;}
        return Math.abs(n(px)-n(ox))<=hx&&Math.abs(n(pz)-n(oz))<=hz;
    }
    var rocketRoad=makeBase('rocket-road','wasm/danbo_rocket_road.wasm');
    rocketRoad.levelLength=function(){var e=this.exports;return e&&e.danbo_rocket_road_level_length?e.danbo_rocket_road_level_length():3300;};
    rocketRoad.maxFuel=function(){var e=this.exports;return e&&e.danbo_rocket_road_max_fuel?e.danbo_rocket_road_max_fuel():100;};
    rocketRoad.roadWidthAt=function(distance){var e=this.exports;distance=n(distance);return e&&e.danbo_rocket_road_road_width_at?e.danbo_rocket_road_road_width_at(distance):rrRoadWidth(distance);};
    rocketRoad.laneX=function(lane,width){var e=this.exports;lane=lane|0;width=n(width);return e&&e.danbo_rocket_road_lane_x?e.danbo_rocket_road_lane_x(lane,width):rrLaneX(lane,width);};
    rocketRoad.eventCount=function(){var e=this.exports;return e&&e.danbo_rocket_road_event_count?e.danbo_rocket_road_event_count():90;};
    rocketRoad.eventAt=function(i){var e=this.exports;i=i|0;if(e&&e.danbo_rocket_road_event_at&&this._outView){e.danbo_rocket_road_event_at(i);return this._readOut(6);}var ev=rrEventAt(i),t=this._tmp;for(var k=0;k<6;k++)t[k]=ev[k];return t;};
    rocketRoad.speedFor=function(turbo,brake,spinning,fuel){var e=this.exports;turbo=turbo?1:0;brake=brake?1:0;spinning=spinning?1:0;fuel=n(fuel);if(e&&e.danbo_rocket_road_speed_for)return e.danbo_rocket_road_speed_for(turbo,brake,spinning,fuel);if(fuel<=0)return 0;var s=brake?26:(turbo?62:48);if(spinning)s=20;if(fuel<12)s*=0.72;return s;};
    rocketRoad.speedStep=function(current,turbo,brake,spinning,fuel,dt){var e=this.exports;current=n(current);turbo=turbo?1:0;brake=brake?1:0;spinning=spinning?1:0;fuel=n(fuel);dt=n(dt);if(e&&e.danbo_rocket_road_speed_step)return e.danbo_rocket_road_speed_step(current,turbo,brake,spinning,fuel,dt);var target=this.speedFor(turbo,brake,spinning,fuel),rate;if(target>current)rate=turbo?50:36;else if(fuel<=0)rate=64;else if(spinning)rate=58;else if(brake)rate=56;else rate=26;if(current<5&&target>current)rate*=1.35;var maxDelta=rate*Math.max(0,Math.min(0.08,dt)),delta=target-current;if(Math.abs(delta)<=maxDelta)return target;return Math.max(0,Math.min(84,current+(delta<0?-1:1)*maxDelta));};
    rocketRoad.fuelAfter=function(fuel,dt,turbo,brake){var e=this.exports;fuel=n(fuel);dt=n(dt);turbo=turbo?1:0;brake=brake?1:0;if(e&&e.danbo_rocket_road_fuel_after)return e.danbo_rocket_road_fuel_after(fuel,dt,turbo,brake);var rate=turbo?1.55:(brake?0.55:0.82);return Math.max(0,Math.min(100,fuel-rate*dt));};
    rocketRoad.playerStep=function(x,vx,steer,dt,spinning,width){var e=this.exports,t=this._tmp;x=n(x);vx=n(vx);steer=n(steer);dt=n(dt);spinning=spinning?1:0;width=n(width);if(e&&e.danbo_rocket_road_player_step&&this._outView){e.danbo_rocket_road_player_step(x,vx,steer,dt,spinning,width);return this._readOut(2);}var control=spinning?0.22:1;vx+=Math.max(-1,Math.min(1,steer))*58*control*dt;var drag=Math.abs(steer)<0.01?10.0:4.8;vx*=Math.max(0,Math.min(1,1-drag*dt));vx=Math.max(-21,Math.min(21,vx));var half=width*0.5-0.68;x+=vx*dt;if(x>half){x=half;vx=-Math.abs(vx)*0.32;}if(x<-half){x=-half;vx=Math.abs(vx)*0.32;}t[0]=x;t[1]=vx;return t;};
    rocketRoad.collide=function(px,pz,ox,oz,type){var e=this.exports;px=n(px);pz=n(pz);ox=n(ox);oz=n(oz);type=type|0;if(e&&e.danbo_rocket_road_collide)return !!e.danbo_rocket_road_collide(px,pz,ox,oz,type);return rrCollide(px,pz,ox,oz,type);};
    rocketRoad.score=function(progress,fuel,pickups,crashes,finished){var e=this.exports;progress=n(progress);fuel=n(fuel);pickups=pickups|0;crashes=crashes|0;finished=finished?1:0;if(e&&e.danbo_rocket_road_score)return e.danbo_rocket_road_score(progress,fuel,pickups,crashes,finished);var s=Math.floor(Math.max(0,Math.min(3300,progress))*3)+pickups*500+Math.floor(Math.max(0,fuel)*22)-crashes*350+(finished?2500:0);return Math.max(0,s);};
    rocketRoad.finishReached=function(progress){var e=this.exports;progress=n(progress);if(e&&e.danbo_rocket_road_finish_reached)return !!e.danbo_rocket_road_finish_reached(progress);return progress>=3300;};

    window.DANBO_MINIGAME_WASM={race:race,platformer:platformer,rocketRoad:rocketRoad};
    window._danboMinigameWasmReady=Promise.all([
        loadModule(race,'danbo_race_out_ptr','danbo_race_build_number'),
        loadModule(platformer,'danbo_platformer_out_ptr','danbo_platformer_build_number'),
        loadModule(rocketRoad,'danbo_rocket_road_out_ptr','danbo_rocket_road_build_number')
    ]).then(function(){return window.DANBO_MINIGAME_WASM;});
})();
