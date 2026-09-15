// Canonical Rocket Road race rules. Used by browser and server replay verification.
// Keep deterministic: no clock, random numbers, DOM, renderer or network calls.
// Bump VERSION whenever scoring, physics, events or collision rules change.
(function(root,factory){
    if(typeof module==='object'&&module.exports)module.exports=factory();
    else root.DanboRocketRules=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
    'use strict';
    var VERSION='rocket-20260915-1',TICK_RATE=60,DT=1/TICK_RATE,MAX_TICKS=18000,STAGE_LENGTH=3300;
    function n(v,d){v=Number(v);return isFinite(v)?v:(d||0);}
    function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
    function smooth(t){t=clamp(t,0,1);return t*t*(3-2*t);}
    function roadCenterAt(distance){
        var raw=Math.max(0,n(distance)), sid=Math.floor(raw/STAGE_LENGTH), d=raw-sid*STAGE_LENGTH, phase=sid*0.73, c=0;
        c+=Math.sin(Math.max(0,d-360)*0.0062+phase)*1.15*smooth((d-360)/260);
        c+=Math.sin(Math.max(0,d-1080)*0.0085+1.8+phase*0.7)*0.95*smooth((d-1080)/360);
        c+=Math.sin(Math.max(0,d-1880)*0.0072+3.1+phase*1.1)*1.25*smooth((d-1880)/420);
        c+=Math.sin(Math.max(0,d-2620)*0.0100+0.4+phase*0.5)*0.72*smooth((d-2620)/320);
        return clamp(c,-2.15,2.15);
    }
    function mergeT(local){return smooth(n(local)/85);}
    function splitActive(stage,local){return (stage|0)===0&&n(local)<135;}
    function driveCenterAt(local,stage){
        local=n(local);stage=stage|0;
        var base=roadCenterAt(stage*STAGE_LENGTH+local);
        return splitActive(stage,local)?base+3.05*(1-mergeT(local)):base;
    }
    function effectiveRoadWidth(width,local,stage){
        width=n(width,10);local=n(local);stage=stage|0;
        return splitActive(stage,local)?(5.15+(width-5.15)*mergeT(local)):width;
    }
    var fallback={
        levelLength:function(){return 3300;},
        maxFuel:function(){return 100;},
        roadWidthAt:function(distance){var d=clamp(n(distance),0,3300);if(d<420)return 10.8;if(d<880)return 11.4;if(d<1260)return 9.7;if(d<1710)return 11.1;if(d<2260)return 8.9;if(d<2860)return 10.2;return 11.7;},
        laneX:function(lane,width){lane=Math.max(0,Math.min(3,lane|0));var inner=n(width,10)*0.84;return -inner*0.5+inner*(lane+0.5)/4;},
        eventCount:function(){return 90;},
        eventAt:function(i){
            i=Math.max(0,Math.min(89,i|0));var j,z,l,t,b=0;
            if(i<18){j=i;z=46+j*38;l=(j*2+1)%4;t=(j===5||j===14)?5:(j%6===0?2:1);b=t===5?18:0;return [z,l,t,0,j%3,b];}
            if(i<42){j=i-18;z=970+j*45;l=(j*3+2)%4;t=(j===4||j===17)?5:(j%8===0?6:(j%7===0?4:(j%3===0?3:2)));b=t===5?20:0;return [z,l,t,0,j%4,b];}
            if(i<68){j=i-42;z=1880+j*40;l=(j*5+1)%4;t=(j===8||j===21)?5:(j%6===0?6:(j%7===2?4:(j%2===0?3:2)));b=t===5?22:0;return [z,l,t,0,j%5,b];}
            j=i-68;z=2850+j*29;l=(j*7+3)%4;t=(j===11)?5:(j%9===0?6:(j%5===0?4:(j%3===0?3:2)));b=t===5?24:0;return [z,l,t,0,j%6,b];
        },
        speedFor:function(turbo,brake,spinning,fuel){if(fuel<=0)return 0;var s=brake?26:(turbo?62:48);if(spinning)s=20;if(fuel<12)s*=0.72;return s;},
        speedStep:function(current,turbo,brake,spinning,fuel,dt){current=clamp(n(current),0,84);var target=fallback.speedFor(turbo,brake,spinning,fuel),rate;if(target>current)rate=turbo?50:36;else if(fuel<=0)rate=64;else if(spinning)rate=58;else if(brake)rate=56;else rate=26;if(current<5&&target>current)rate*=1.35;var maxDelta=rate*clamp(n(dt),0,0.08),delta=target-current;if(Math.abs(delta)<=maxDelta)return target;return clamp(current+(delta<0?-1:1)*maxDelta,0,84);},
        fuelAfter:function(fuel,dt,turbo,brake){var r=turbo?1.55:(brake?0.55:0.82);return clamp(n(fuel)-r*n(dt),0,100);},
        playerStep:function(x,vx,steer,dt,spinning,width){var control=spinning?0.22:1;vx+=clamp(steer,-1,1)*58*control*dt;var drag=Math.abs(steer)<0.01?10.0:4.8;vx*=clamp(1-drag*dt,0,1);vx=clamp(vx,-21,21);var half=width*0.5-0.68;x+=vx*dt;if(x>half){x=half;vx=-Math.abs(vx)*0.32;}if(x<-half){x=-half;vx=Math.abs(vx)*0.32;}return [x,vx];},
        collide:function(px,pz,ox,oz,t){var hx=1.1,hz=2.05;if(t===4){hx=1.55;hz=3.15;}else if(t===5){hx=1.18;hz=2.15;}else if(t===6){hx=1.65;hz=1.15;}else if(t===3){hx=1.16;hz=2.2;}else if(t===2){hx=1.2;hz=2.25;}return Math.abs(px-ox)<=hx&&Math.abs(pz-oz)<=hz;},
        score:function(progress,fuel,pickups,crashes,finished){var s=Math.floor(clamp(progress,0,3300)*3)+pickups*500+Math.floor(Math.max(0,fuel)*22)-crashes*350+(finished?2500:0);return Math.max(0,s);},
        finishReached:function(progress){return progress>=3300;}
    };


    var events=Array.from({length:90},function(_,i){return Object.freeze(fallback.eventAt(i));});
    function create(stage){
        if(!Number.isInteger(stage)||stage<0||stage>5)throw new Error('Invalid stage');
        return {stageId:stage,ticks:0,elapsed:0,progress:0,carX:0,carVx:0,speed:0,spin:0,spinDir:1,
            fuel:100,pickups:0,crashes:0,score:0,hitEvents:{},done:false,finished:false};
    }
    function trafficSpeed(s,type,pattern,id){
        var mul=1+s.stageId*.08;
        if(type===1)return (10+(pattern||0)*1.1)*mul;
        if(type===2)return (18+Math.sin(s.elapsed*.7+id)*5)*mul;
        if(type===3)return (-12-Math.abs(Math.sin(id))*5)*(1+s.stageId*.05);
        if(type===4)return 7+s.stageId*.7;
        return 0;
    }
    function eventDistance(s,ev,id,type){
        var t=s.elapsed;
        if(type===2)return ev[0]+(1+s.stageId*.08)*(18*t+(5/.7)*(Math.cos(id)-Math.cos(t*.7+id)));
        return ev[0]+trafficSpeed(s,type,ev[4],id)*t;
    }
    function sway(s,type,pattern,id){
        if(type===2)return Math.sin(s.elapsed*1.8+pattern+id)*.42;
        if(type===3)return Math.sin(s.elapsed*3+id)*.24;
        return 0;
    }
    function crash(s,duration,dir,loss){
        s.spin=Math.max(s.spin,duration);s.spinDir=dir;s.crashes++;
        s.fuel=clamp(s.fuel-loss,0,100);s.carVx+=dir*8;
    }
    function step(s,steer,flags){
        if(s.done)throw new Error('Run already ended');
        if(!Number.isInteger(steer)||Math.abs(steer)>100||!Number.isInteger(flags)||flags<0||flags>3)throw new Error('Invalid input');
        var turbo=flags&1,brake=flags&2,width=effectiveRoadWidth(fallback.roadWidthAt(s.progress),s.progress,s.stageId);
        s.ticks++;s.elapsed=s.ticks*DT;
        var pos=fallback.playerStep(s.carX,s.carVx,steer/100,DT,s.spin>0,width);s.carX=pos[0];s.carVx=pos[1];
        s.spin=Math.max(0,s.spin-DT);
        s.speed=fallback.speedStep(s.speed,turbo,brake,s.spin>0,s.fuel,DT);
        s.progress+=s.speed*DT;s.fuel=fallback.fuelAfter(s.fuel,DT,turbo,brake);
        for(var i=0;i<events.length;i++){
            if(s.hitEvents[i])continue;
            var ev=events[i],type=ev[2],distance=eventDistance(s,ev,i,type),rel=distance-s.progress;
            if(rel<-4||rel>6)continue;
            var w=effectiveRoadWidth(fallback.roadWidthAt(distance),distance,s.stageId);
            var x=driveCenterAt(distance,s.stageId)+fallback.laneX(ev[1],w)+sway(s,type,ev[4],i);
            var px=driveCenterAt(s.progress,s.stageId)+s.carX;
            if(!fallback.collide(px,0,x,rel,type))continue;
            s.hitEvents[i]=true;
            if(type===5){s.pickups++;s.fuel=clamp(s.fuel+(ev[5]||20),0,100);}
            else crash(s,type===6?.95:type===4?1.3:1.05,px<x?-1:1,type===6?2.5:type===4?8:5.5);
        }
        if(Math.abs(s.carX)>width*.5-.82&&s.spin<=0)crash(s,.8,s.carX>0?-1:1,2.4);
        s.finished=s.progress>=STAGE_LENGTH;s.done=s.finished||s.fuel<=.01||s.ticks>=MAX_TICKS;
        s.score=fallback.score(s.progress,s.fuel,s.pickups,s.crashes,s.finished);
        return s;
    }
    function record(replay,steer,flags){
        var last=replay[replay.length-1];
        if(last&&last[1]===steer&&last[2]===flags)last[0]++;
        else replay.push([1,steer,flags]);
    }
    return Object.freeze({VERSION:VERSION,TICK_RATE:TICK_RATE,DT:DT,MAX_TICKS:MAX_TICKS,
        create:create,step:step,record:record,base:Object.freeze(fallback),
        roadCenterAt:roadCenterAt,driveCenterAt:driveCenterAt,effectiveRoadWidth:effectiveRoadWidth,
        trafficSpeed:trafficSpeed,eventDistance:eventDistance,sway:sway});
});
