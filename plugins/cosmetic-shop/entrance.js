(function(){
    'use strict';
    if(!window.DANBO_PLUGIN_HOST||!window.DANBO_PLUGIN_HOST.registerEntrance){
        console.warn('[cosmetic-shop entrance] Plugin host missing');
        return;
    }

    // 蛋堡城杂货铺 — red shop house near spawn in Egg City (style 0).
    // Registered through the plugin entrance system so the new per-city
    // architecture places/cleans it up like any other entrance building.
    var NAME={
        zhs:'\uD83C\uDFEA \u86CB\u5821\u57CE\u6742\u8D27\u94FA',
        zht:'\uD83C\uDFEA \u86CB\u5821\u57CE\u96DC\u8C8A\u92EA',
        ja:'\uD83C\uDFEA \u30C0\u30F3\u30DC\u96D1\u8CA8\u5E97',
        en:'\uD83C\uDFEA Danbo General Store'
    };
    var DESC={
        zhs:'\u8FDB\u5165\u6742\u8D27\u94FA\u9009\u8D2D\u5916\u89C2\uFF1F',
        zht:'\u9032\u5165\u96DC\u8C8A\u92EA\u9078\u8CFC\u5916\u89C0\uFF1F',
        ja:'\u96D1\u8CA8\u5E97\u3067\u898B\u305F\u76EE\u3092\u8CB7\u3046\uFF1F',
        en:'Enter the shop to buy cosmetics?'
    };

    window.DANBO_PLUGIN_HOST.registerEntrance({
        id:'cosmetic-shop',
        // No scene plugin: entering is handled by the existing 'shopHouse'
        // hidden-type branch in gameloop (walks into the shop interior).
        pluginId:null,
        hiddenType:'shopHouse',
        targetStyle:-97,
        color:0xCC4A48,
        name:NAME,
        desc:DESC,
        // Shop only lives in Egg City (style 0).
        disabledCityStyles:[1,2,3,4,5,6,7],
        create:function(ctx){
            if(!ctx||!ctx.THREE||!ctx.cityGroup)return null;
            if(ctx.currentCityStyle!==0)return null;

            var THREE=ctx.THREE;
            var toon=ctx.toon||function(color){return new THREE.MeshBasicMaterial({color:color});};

            // House centred at world (8,-8); door faces +z at world z=-5.5.
            var WX=8, WZ=-8, H=2.5, WH=4;
            var group=new THREE.Group();
            group.position.set(WX,0,WZ);

            var wallMat=toon(0xCC4A48), trimMat=toon(0xF2E8D8), roofMat=toon(0x8E2B2B), doorMat=toon(0x5A3A28);
            function box(w,h,d,mat,x,y,z){
                var m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
                m.position.set(x||0,y||0,z||0);
                m.castShadow=true;m.receiveShadow=true;
                group.add(m);return m;
            }

            box(H*2+0.4,WH,0.4,wallMat,0,WH/2,-H);                 // back wall
            box(0.4,WH,H*2+0.4,wallMat,-H,WH/2,0);                 // left wall
            box(0.4,WH,H*2+0.4,wallMat,H,WH/2,0);                  // right wall
            box(H-0.6,WH,0.4,wallMat,-(H/2+0.3),WH/2,H);           // front-left
            box(H-0.6,WH,0.4,wallMat,(H/2+0.3),WH/2,H);            // front-right
            box(1.4,WH-2.4,0.4,wallMat,0,WH-(WH-2.4)/2,H);         // above-door
            box(1.3,2.4,0.2,doorMat,0,1.2,H+0.05);                 // door

            [-1.5,1.5].forEach(function(wx){
                var win=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.9),new THREE.MeshBasicMaterial({color:0xBFE8FF,transparent:true,opacity:0.9,side:THREE.DoubleSide}));
                win.position.set(wx,2.3,H+0.22);group.add(win);
                box(1.0,1.0,0.06,trimMat,wx,2.3,H+0.18);
            });

            var roof=new THREE.Mesh(new THREE.ConeGeometry(H*1.7,2.0,4),roofMat);
            roof.position.set(0,WH+0.9,0);roof.rotation.y=Math.PI/4;roof.castShadow=true;group.add(roof);
            box(0.4,0.7,0.4,wallMat,1.2,WH+1.3,-0.6);              // chimney

            // door sign 【蛋堡城杂货铺】 — wooden plank
            var sc=document.createElement('canvas');sc.width=320;sc.height=96;
            var sgx=sc.getContext('2d');
            sgx.fillStyle='#7A3B1E';sgx.fillRect(0,0,320,96);
            sgx.fillStyle='#F6E3C0';sgx.fillRect(6,6,308,84);
            sgx.fillStyle='#7A3B1E';sgx.font='bold 40px system-ui,Segoe UI,sans-serif';
            sgx.textAlign='center';sgx.textBaseline='middle';
            sgx.fillText('\u86CB\u5821\u57CE\u6742\u8D27\u94FA',160,50);
            var signMat=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(sc),transparent:true,side:THREE.DoubleSide});
            var sign=new THREE.Mesh(new THREE.PlaneGeometry(3.0,0.9),signMat);sign.position.set(0,3.15,H+0.25);group.add(sign);
            box(3.2,1.05,0.12,trimMat,0,3.15,H+0.18);              // sign board

            // Invisible technical portal objects (shared city portal code expects ring + inner).
            var ring=new THREE.Mesh(
                new THREE.TorusGeometry(0.55,0.06,6,18),
                new THREE.MeshBasicMaterial({color:0xCC4A48,transparent:true,opacity:0.01})
            );
            ring.position.set(0,0.18,H);group.add(ring);
            var inner=new THREE.Mesh(
                new THREE.CircleGeometry(0.55,16),
                new THREE.MeshBasicMaterial({color:0xFFB6CE,transparent:true,opacity:0.01,side:THREE.DoubleSide})
            );
            inner.position.set(0,0.2,H);inner.rotation.x=-Math.PI/2;group.add(inner);

            return {
                group:group,
                ring:ring,
                inner:inner,
                x:WX,
                z:WZ+H,            // door world z = -5.5
                y:0,
                color:0xCC4A48,
                name:NAME,
                desc:DESC,
                pluginId:null,
                hiddenType:'shopHouse',
                targetStyle:-97
            };
        }
    });
})();
