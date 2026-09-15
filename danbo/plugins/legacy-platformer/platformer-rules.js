// Egg Trail: deterministic 60 Hz rules, independent of the city's colliders,
// combat and race finish logic. Every required landing has a generous margin.
(function(root,factory){
    if(typeof module==='object'&&module.exports)module.exports=factory();
    else root.DanboPlatformRules=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
    'use strict';
    var DT=1/60, SPEED=7, GRAVITY=22, JUMP=10.7, RADIUS=.5;
    var route=[
        [0,18,0],[21,33,0],[36,48,1.5],[51,64,3],[67,82,3],
        [85,99,2],[102,116,3.5],[119,131,2],[134,148,4],
        [151,165,5.5],[168,180,7],[183,197,6],[200,214,7.5],
        [217,231,9],[234,248,7.5],[251,270,9],[273,287,10.5],
        [290,306,9],[309,330,9]
    ];
    function level(){
        var platforms=route.map(function(p,i){return {id:i,x1:p[0],x2:p[1],y:p[2],zone:i<5?0:i<9?1:2,checkpoint:i===0||i===4||i===8||i===15};});
        // Optional moving bonus ledges never remove or gate the safe main route.
        [2,6,11].forEach(function(i){var p=platforms[i];platforms.push({id:platforms.length,x1:p.x1+2,x2:p.x1+7,y:p.y+2,zone:p.zone,moving:true,range:1.2,phase:i});});
        var stars=[];
        platforms.forEach(function(p){var count=p.moving?1:3,span=Math.min(p.x2,323)-p.x1;for(var i=0;i<count;i++)stars.push({id:stars.length,platform:p.id,x:p.x1+span*(i+1)/(count+1),y:p.y+1});});
        return {platforms:platforms,stars:stars,goal:{x:323,y:9},length:330};
    }
    function pose(p,time){var dx=p.moving?Math.sin(time*1.1+p.phase)*p.range:0;return {x1:p.x1+dx,x2:p.x2+dx,y:p.y};}
    function create(){return {x:4,y:0,vx:0,vy:0,ticks:0,onGround:true,standing:0,coyote:.13,buffer:0,jumpHeld:false,checkpoint:0,stars:[],falls:0,finished:false,notice:'',noticeTicks:0};}
    function respawn(s,l){var p=l.platforms[s.checkpoint]||l.platforms[0];s.x=p.x1+3;s.y=p.y;s.vx=s.vy=0;s.onGround=true;s.standing=p.id;s.coyote=.13;s.buffer=0;s.falls++;s.notice='retry';s.noticeTicks=90;}
    function step(s,input,l){
        if(s.finished)return s;
        input=input||{};l=l||level();var prevTime=s.ticks*DT;s.ticks++;
        if(s.noticeTicks>0)s.noticeTicks--;
        var jump=!!input.jump,edge=jump&&!s.jumpHeld;s.jumpHeld=jump;
        s.buffer=edge?.15:Math.max(0,s.buffer-DT);
        s.coyote=s.onGround?.13:Math.max(0,s.coyote-DT);
        if(s.standing!==null){var carrier=l.platforms[s.standing];if(carrier&&carrier.moving)s.x+=pose(carrier,s.ticks*DT).x1-pose(carrier,prevTime).x1;}
        var dir=Math.max(-1,Math.min(1,Number(input.move)||0));
        var target=dir*SPEED,acc=(Math.abs(dir)>.01?42:56)*DT;
        s.vx+=Math.max(-acc,Math.min(acc,target-s.vx));
        if(s.buffer>0&&s.coyote>0){s.vy=JUMP;s.onGround=false;s.standing=null;s.buffer=0;s.coyote=0;}
        // Releasing jump shortens the arc; holding never auto-jumps on landing.
        if(!jump&&s.vy>5)s.vy=5;
        var oldY=s.y;s.vy=Math.max(-18,s.vy-GRAVITY*DT);
        s.x=Math.max(RADIUS,Math.min(l.length-RADIUS,s.x+s.vx*DT));s.y+=s.vy*DT;s.onGround=false;s.standing=null;
        var best=null;
        l.platforms.forEach(function(p){var box=pose(p,s.ticks*DT);
            if(s.vy<=0&&oldY>=box.y-.04&&s.y<=box.y&&s.x+RADIUS>box.x1&&s.x-RADIUS<box.x2&&(!best||p.y>best.y))best=p;
        });
        if(best){s.y=best.y;s.vy=0;s.onGround=true;s.standing=best.id;
            if(best.checkpoint&&best.id>s.checkpoint){s.checkpoint=best.id;s.notice='checkpoint';s.noticeTicks=120;}
        }
        l.stars.forEach(function(c){if(s.stars.indexOf(c.id)>=0)return;var p=l.platforms[c.platform],dx=pose(p,s.ticks*DT).x1-p.x1;
            if(Math.hypot(s.x-c.x-dx,s.y+.9-c.y)<1.05)s.stars.push(c.id);
        });
        if(s.y<-7)respawn(s,l);
        if(s.onGround&&s.x>=l.goal.x&&Math.abs(s.y-l.goal.y)<.1){s.finished=true;s.notice='complete';s.noticeTicks=0;}
        return s;
    }
    return {DT:DT,SPEED:SPEED,GRAVITY:GRAVITY,JUMP:JUMP,RADIUS:RADIUS,level:level,pose:pose,create:create,step:step,respawn:respawn};
});
