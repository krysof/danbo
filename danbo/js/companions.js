// Companion presentation only; decisions, movement and speech come from the
// room server. These actors never enter allEggs / local combat or rewards.
(function(){
    'use strict';
    var copy={
        zhs:{actors:'角色',players:'玩家',bots:'系统伙伴',seats:'不占玩家席位'},
        zht:{actors:'角色',players:'玩家',bots:'系統夥伴',seats:'不佔玩家席位'},
        ja:{actors:'キャラ',players:'プレイヤー',bots:'システム仲間',seats:'プレイヤー枠は使いません'},
        en:{actors:'characters',players:'players',bots:'companions',seats:'do not use player seats'}
    };
    function words(){return copy[typeof _langCode==='undefined'?'ja':_langCode]||copy.ja;}
    function count(state){
        var humans=0,bots=0;
        if(state&&state.players)state.players.forEach(function(p){if(p.connected!==false)humans++;});
        if(state&&state.bots)state.bots.forEach(function(p){if(p.connected!==false)bots++;});
        return{players:humans,bots:bots,characters:humans+bots};
    }
    function each(state,fn){
        if(state&&state.players)state.players.forEach(function(p,id){fn(p,id,false);});
        var n=0;if(state&&state.bots)state.bots.forEach(function(p,id){if(n++<6)fn(p,'bot:'+id,true);});
    }
    function detail(players,bots,capacity){var w=words();return players+(capacity?'/'+capacity:'')+' '+w.players+' · '+bots+' '+w.bots;}
    function animate(avatar,action,dt){
        var data=avatar.userData,rig=data._companionRig;
        if(!rig)rig=data._companionRig={action:'',time:0,phase:Math.random()*Math.PI*2};
        if(rig.action!==action){rig.action=action;rig.time=0;}rig.time+=dt;rig.phase+=dt;
        var arms=data._decorArms||[];
        for(var i=0;i<arms.length;i++){
            var arm=arms[i],side=arm.userData._side|| (i?1:-1),base=arm.userData._restZ||side*0.48;
            var target=action==='wave'&&side>0?2.4+Math.sin(rig.time*11)*0.28:action==='photo'?side*1.2:base;
            arm.rotation.z+=(target-arm.rotation.z)*Math.min(1,dt*10);
            arm.rotation.x=action==='walk'?Math.sin(rig.phase*7+i*Math.PI)*0.12:0;
        }
        if(data.body)data.body.rotation.x+=( (action==='photo'?-0.09:Math.sin(rig.phase*1.8)*0.018)-data.body.rotation.x)*Math.min(1,dt*5);
        // A tiny reusable camera prop; no extra lights, textures or per-frame allocation.
        if(action==='photo'&&!rig.camera&&data.body){
            var group=new THREE.Group(),shell=new THREE.MeshStandardMaterial({color:0x34434f,roughness:0.45}),glass=new THREE.MeshBasicMaterial({color:0x78c8de});
            group.add(new THREE.Mesh(new THREE.BoxGeometry(0.50,0.29,0.18),shell));
            var lens=new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.11,0.12,10),glass);lens.rotation.x=Math.PI/2;lens.position.z=0.14;group.add(lens);
            var flash=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.05,0.015),new THREE.MeshBasicMaterial({color:0xffffff}));flash.position.set(0.16,0.08,0.1);group.add(flash);
            group.position.set(0,0.08,0.81);data.body.add(group);rig.camera=group;rig.flash=flash;
        }
        if(rig.camera){rig.camera.visible=action==='photo';rig.flash.visible=rig.time>0.75&&rig.time<0.90;}
    }
    window.DANBO_COMPANIONS={count:count,each:each,words:words,detail:detail,animate:animate};
})();
