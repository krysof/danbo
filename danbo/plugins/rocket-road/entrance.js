(function(){
    'use strict';
    if(!window.DANBO_PLUGIN_HOST||!window.DANBO_PLUGIN_HOST.registerEntrance){
        console.warn('[rocket-road entrance] Plugin host missing');
        return;
    }

    var NAME={
        zhs:'🏁 火箭车小屋',
        zht:'🏁 火箭車小屋',
        ja:'🏁 ロケットカー小屋',
        en:'🏁 Rocket Car Garage'
    };
    var DESC={
        zhs:'进入 F1 火箭车维修站，开始蛋宝火箭公路！',
        zht:'進入 F1 火箭車維修站，開始蛋寶火箭公路！',
        ja:'F1風ガレージに入ってロケットロードへ！',
        en:'Enter the F1-style garage to start Danbo Rocket Road!'
    };

    function pickLang(map,lang){
        return (map&&(map[lang]||map.en||map.zhs))||'';
    }

    window.DANBO_PLUGIN_HOST.registerEntrance({
        id:'rocket-road-garage',
        pluginId:'rocket-road',
        hiddenType:'rocketRoad',
        targetStyle:-99,
        color:0xFFCE45,
        name:NAME,
        desc:DESC,
        disabledCityStyles:[5],
        create:function(ctx){
            if(!ctx||!ctx.THREE||!ctx.cityGroup)return null;
            if(ctx.currentCityStyle===5)return null;

            var THREE=ctx.THREE;
            var toon=ctx.toon||function(color){return new THREE.MeshBasicMaterial({color:color});};
            var soft=window.softPBR||toon;
            var positions=ctx.positions||{};
            var basePos=positions.rocketRoadPortal||{x:15,z:-15};
            var lang=ctx.lang||'en';
            var group=new THREE.Group();
            group.position.set(basePos.x,0,basePos.z);

            function box(w,h,d,c,x,y,z,parent){
                parent=parent||group;
                var hero=ctx.currentCityStyle===0&&w>0.45&&h>0.45&&d>0.28&&typeof window._visualRoundedBoxGeometry==='function';
                var geo=hero?window._visualRoundedBoxGeometry(w,h,d,Math.min(0.24,h*0.16)):new THREE.BoxGeometry(w,h,d);
                var mat=ctx.currentCityStyle===0?soft(c,{pastelAmount:0.025,roughness:0.42,clearcoat:0.18,clearcoatRoughness:0.36,envMapIntensity:0.42}):toon(c);
                var m=new THREE.Mesh(geo,mat);
                m.position.set(x||0,y||0,z||0);
                m.castShadow=true;
                m.receiveShadow=true;
                parent.add(m);
                return m;
            }

            // F1-style themed garage / mini-game house.
            box(10.2,0.28,9.2,0x2B3344,0,0.14,0);
            box(8.3,4.1,6.2,0xF6F0DC,0,2.22,0);
            box(8.8,0.55,6.8,0xD91E35,0,4.55,0);
            box(9.3,0.32,7.3,0xFFF1A6,0,4.92,0);
            box(3.35,2.55,0.16,0x263043,0,1.55,3.16);
            for(var sl=0;sl<5;sl++)box(3.45,0.06,0.18,0xE8F0FF,0,0.56+sl*0.42,3.28);
            box(4.1,0.12,1.55,0xFFCE45,0,0.2,4.08);
            box(1.1,0.12,1.55,0xFFFFFF,-1.55,0.28,4.08);
            box(1.1,0.12,1.55,0x111827,1.55,0.28,4.08);

            for(var cy=0;cy<2;cy++){
                for(var cx=0;cx<10;cx++){
                    box(0.42,0.28,0.08,((cx+cy)&1)?0x111827:0xFFFFFF,-2.1+cx*0.47,3.72-cy*0.3,3.34);
                }
            }

            var tireMat=ctx.currentCityStyle===0?soft(0x151922,{pastelAmount:0,roughness:0.92,envMapIntensity:0.12}):toon(0x151922);
            for(var side=0;side<2;side++){
                for(var ti=0;ti<3;ti++){
                    var tire=new THREE.Mesh(new THREE.TorusGeometry(0.42,0.14,ctx.currentCityStyle===0?12:8,ctx.currentCityStyle===0?28:18),tireMat);
                    tire.rotation.x=Math.PI/2;
                    tire.position.set((side?1:-1)*4.35,0.45+ti*0.32,2.35);
                    tire.castShadow=true;
                    group.add(tire);
                }
            }

            var car=new THREE.Group();
            function carBox(w,h,d,c,x,y,z){return box(w,h,d,c,x,y,z,car);}
            carBox(1.05,0.28,2.15,0xFF3348,0,0.32,0);
            carBox(0.46,0.22,1.02,0xFFE06A,0,0.56,-0.18);
            carBox(0.32,0.2,0.7,0xFF3348,0,0.34,1.22);
            carBox(1.85,0.12,0.32,0x111827,0,0.33,-1.18);
            for(var wi=0;wi<4;wi++){
                var wh=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,0.18,ctx.currentCityStyle===0?18:10),tireMat);
                wh.rotation.z=Math.PI/2;
                wh.position.set(wi<2?-0.72:0.72,0.2,wi%2?-0.72:0.62);
                car.add(wh);
            }
            car.position.set(0,0.18,4.15);
            car.scale.set(1.05,1.05,1.05);
            group.add(car);

            // Invisible technical portal objects: shared city animation/trigger code expects ring + inner.
            var ring=new THREE.Mesh(
                new THREE.TorusGeometry(0.55,0.06,6,18),
                new THREE.MeshBasicMaterial({color:0xFFCE45,transparent:true,opacity:0.01})
            );
            ring.position.set(0,0.18,4.08);
            group.add(ring);
            var inner=new THREE.Mesh(
                new THREE.CircleGeometry(0.55,16),
                new THREE.MeshBasicMaterial({color:0x55B8FF,transparent:true,opacity:0.01,side:THREE.DoubleSide})
            );
            inner.position.set(0,0.2,4.08);
            inner.rotation.x=-Math.PI/2;
            group.add(inner);

            var signText=pickLang(NAME,lang);
            if(ctx.makeSign){
                ctx.makeSign(group,signText,0xFFE06A,{x:0,y:5.65,z:3.35},{x:6.2,y:0.8,z:1});
            }else{
                var canvas=document.createElement('canvas');canvas.width=512;canvas.height=64;
                var g2=canvas.getContext('2d');
                g2.fillStyle='rgba(0,0,0,0.72)';g2.fillRect(0,0,512,64);
                g2.fillStyle='#FFE06A';g2.textAlign='center';g2.font='bold 27px sans-serif';
                g2.fillText(signText,256,42);
                var tex=new THREE.CanvasTexture(canvas);
                var sign=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true}));
                sign.scale.set(6.2,0.8,1);sign.position.set(0,5.65,3.35);group.add(sign);
            }

            return {
                group:group,
                ring:ring,
                inner:inner,
                x:basePos.x,
                z:basePos.z+4.08,
                y:0,
                color:0xFFCE45,
                name:NAME,
                desc:DESC,
                pluginId:'rocket-road',
                hiddenType:'rocketRoad',
                targetStyle:-99
            };
        }
    });
})();
