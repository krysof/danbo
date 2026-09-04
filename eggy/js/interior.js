// interior.js — DANBO World: walk INTO houses.
// v1 foundation: door prompt in city -> enter a cozy empty room -> walk out.
// The room is intentionally a blank, cute placeholder ready for future content
// (shops / NPCs / mini-games / chests). Runs on its own tiny physics so the
// city's physics, portals and colliders are never touched while inside.

window._interiorActive=false;
var _INT_BASE={x:1000,y:0,z:0};   // far from the city so nothing overlaps
var _INT_HALF=7.0;                // room half-size
var _interiorGroup=null;
var _interiorExtra=null;            // per-entry fixtures (shop counter/shelves/keeper)
var _interiorReturn=null;           // {x,y,z} city position to return to
var _nearDoorBuilding=null;         // building the player can currently enter

// ---------- build the (reusable) interior room ----------
function _buildInteriorRoom(){
    if(_interiorGroup)return _interiorGroup;
    var g=new THREE.Group();
    var b=_INT_BASE, H=_INT_HALF;
    // warm floor
    var floor=new THREE.Mesh(new THREE.BoxGeometry(H*2,0.4,H*2),toon(0xF3D9B8));
    floor.position.set(b.x,b.y-0.2,b.z);g.add(floor);
    // soft rug
    var rug=new THREE.Mesh(new THREE.CircleGeometry(2.4,24),toon(0xFFB6CE,{transparent:true,opacity:0.9,side:THREE.DoubleSide}));
    rug.rotation.x=-Math.PI/2;rug.position.set(b.x,b.y+0.02,b.z);g.add(rug);
    // walls (leave a doorway gap on the +z wall)
    var wallMat=toon(0xFFF1E0), wallH=5;
    function wall(w,d,x,z){var m=new THREE.Mesh(new THREE.BoxGeometry(w,wallH,d),wallMat);m.position.set(x,b.y+wallH/2,z);g.add(m);}
    wall(H*2+0.4,0.4,b.x,b.z-H);          // back (-z)
    wall(0.4,H*2+0.4,b.x-H,b.z);          // left
    wall(0.4,H*2+0.4,b.x+H,b.z);          // right
    // front wall split into two with a doorway gap in the middle
    wall(H-1.2,0.4,b.x-(H/2+0.6),b.z+H);
    wall(H-1.2,0.4,b.x+(H/2+0.6),b.z+H);
    // ceiling beams (cute, not a solid roof so it stays bright)
    var beamMat=toon(0xD9A066);
    for(var bi=-2;bi<=2;bi++){var beam=new THREE.Mesh(new THREE.BoxGeometry(H*2,0.25,0.25),beamMat);beam.position.set(b.x,b.y+wallH-0.2,b.z+bi*3);g.add(beam);}
    // doorway frame + glowing exit marker
    var frameMat=toon(0xC98A5A);
    var fl=new THREE.Mesh(new THREE.BoxGeometry(0.3,3,0.3),frameMat);fl.position.set(b.x-1.2,b.y+1.5,b.z+H);g.add(fl);
    var fr=new THREE.Mesh(new THREE.BoxGeometry(0.3,3,0.3),frameMat);fr.position.set(b.x+1.2,b.y+1.5,b.z+H);g.add(fr);
    var ft=new THREE.Mesh(new THREE.BoxGeometry(2.7,0.3,0.3),frameMat);ft.position.set(b.x,b.y+3,b.z+H);g.add(ft);
    var exitGlow=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.8),new THREE.MeshBasicMaterial({color:0xFFE7A8,transparent:true,opacity:0.5,side:THREE.DoubleSide}));
    exitGlow.position.set(b.x,b.y+1.4,b.z+H-0.05);g.userData._exitGlow=exitGlow;g.add(exitGlow);
    // placeholder cozy furniture
    var table=new THREE.Mesh(new THREE.CylinderGeometry(0.8,0.8,0.7,16),toon(0xC98A5A));table.position.set(b.x,b.y+0.35,b.z-1);g.add(table);
    [-1,1].forEach(function(s){var stool=new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.4,0.4,12),toon(0xFFB6CE));stool.position.set(b.x+s*1.6,b.y+0.2,b.z-1);g.add(stool);});
    // a couple of windows on the back wall
    [-3,3].forEach(function(x){var win=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6),new THREE.MeshBasicMaterial({color:0xBFE8FF,transparent:true,opacity:0.85}));win.position.set(b.x+x,b.y+2.4,b.z-H+0.25);g.add(win);});
    // welcome sign (a board; text shown via HUD instead of 3D text)
    var sign=new THREE.Mesh(new THREE.BoxGeometry(2.4,1.1,0.15),toon(0xFFFFFF));sign.position.set(b.x,b.y+2.4,b.z-H+0.3);g.add(sign);
    g.visible=false;scene.add(g);
    _interiorExtra=new THREE.Group();g.add(_interiorExtra);
    _interiorGroup=g;return g;
}

// ---------- city-side: detect a nearby house door ----------
function _interiorDoorScan(px,pz){
    if(typeof cityColliders==='undefined'){_nearDoorBuilding=null;_showDoorPrompt(false);return;}
    if(playerEgg&&playerEgg.mesh&&playerEgg.mesh.position.y>3.5){_nearDoorBuilding=null;_showDoorPrompt(false);return;}
    if(typeof _shopDoorPos!=='undefined'&&typeof _shopNPC!=='undefined'&&_shopNPC&&_shopNPC.visible){
        var sdx=px-_shopDoorPos.x,sdz=pz-_shopDoorPos.z;
        if(sdx*sdx+sdz*sdz<6.25){_nearDoorBuilding=null;_showDoorPrompt(false);return;}
    }
    // Keep the door trigger tight. A broad radius caused players walking near
    // large city colliders/bridges to be offered a generic house entry.
    var best=null,bestD=1.55*1.55;
    for(var i=0;i<cityColliders.length;i++){
        var c=cityColliders[i];if(!c)continue;
        var doorX=c.x, doorZ=c.z+(c.hd||1)+0.6; // door on +z face
        var dx=px-doorX, dz=pz-doorZ, d=dx*dx+dz*dz;
        if(d<bestD){bestD=d;best=c;}
    }
    _nearDoorBuilding=best;
    _showDoorPrompt(!!best);
}
function _interiorIsTouchLike(){
    return (('ontouchstart' in window)||(navigator.maxTouchPoints>0)||(window.matchMedia&&window.matchMedia('(hover:none)').matches));
}
function _interiorMaybeAutoConfirm(){
    // Houses must never pop the confirm automatically. The player should see
    // only a small prompt and explicitly tap/click/press E to open confirm.
    return false;
}
function _interiorOpenDoorConfirm(){
    if(!_nearDoorBuilding)return false;
    if(window._nearShopDoor||window._worldMapOpen||window._shopOpen||window._interiorActive)return false;
    if(typeof _portalDismissed!=='undefined')_portalDismissed=null;
    if(typeof showPortalConfirm==='function')showPortalConfirm({
        name:'🏠 房屋',
        desc:'进入房屋？',
        raceIndex:-1,
        _hiddenType:'houseDoor',
        _targetStyle:-98
    });
    else _interiorEnter(_nearDoorBuilding);
    return true;
}
function _showDoorPrompt(show){
    var el=document.getElementById('door-prompt');
    if(show){
        if(typeof _portalConfirmOpen!=='undefined'&&_portalConfirmOpen){if(el)el.style.display='none';return;}
        if(_interiorMaybeAutoConfirm()){if(el)el.style.display='none';return;}
        if(!el){
            el=document.createElement('div');el.id='door-prompt';
            el.textContent='\uD83D\uDEAA \u8D70\u8FD1\u5165\u53E3\uFF0C\u70B9\u51FB\u786E\u8BA4';
            el.style.cssText='position:fixed;left:50%;bottom:88px;transform:translateX(-50%);z-index:58;'+
                'padding:8px 18px;border-radius:18px;background:rgba(255,255,255,0.9);border:2px solid #FFB6CE;'+
                'color:#C2477A;font:bold 16px system-ui,Segoe UI,sans-serif;box-shadow:0 3px 12px rgba(0,0,0,0.25);cursor:pointer;';
            el.onclick=function(){
                _interiorOpenDoorConfirm();
            };
            el.addEventListener('touchend',function(ev){ev.preventDefault();_interiorOpenDoorConfirm();},{passive:false});
            document.body.appendChild(el);
        }
        el.textContent='\uD83D\uDEAA \u8D70\u8FD1\u5165\u53E3\uFF0C\u70B9\u51FB\u786E\u8BA4';
        el.style.display='block';
    } else {
        if(typeof _portalDismissed!=='undefined'&&_portalDismissed==='hidden:houseDoor:-98')_portalDismissed=null;
        if(el)el.style.display='none';
    }
}

// ---------- enter / exit ----------
function _interiorEnter(building,opts){
    if(window._interiorActive||!playerEgg||!playerEgg.mesh)return;
    _buildInteriorRoom();
    var b=_INT_BASE;
    // clear previous per-entry fixtures
    while(_interiorExtra.children.length)_interiorExtra.remove(_interiorExtra.children[0]);
    window._interiorShop=!!(opts&&opts.shop);
    window._shopKeeperPos=null;
    if(window._interiorShop){
        // shop counter + shelves
        var counter=new THREE.Mesh(new THREE.BoxGeometry(3.2,1.0,0.7),toon(0xC98A5A));counter.position.set(b.x,b.y+0.5,b.z-1.6);_interiorExtra.add(counter);
        var ctop=new THREE.Mesh(new THREE.BoxGeometry(3.4,0.12,0.85),toon(0xE8C9A0));ctop.position.set(b.x,b.y+1.05,b.z-1.6);_interiorExtra.add(ctop);
        for(var sh=0;sh<2;sh++){
            var shelf=new THREE.Mesh(new THREE.BoxGeometry(5.0,0.12,0.5),toon(0xB07A4A));shelf.position.set(b.x,b.y+1.4+sh*1.1,b.z-_INT_HALF+0.5);_interiorExtra.add(shelf);
            for(var it=0;it<6;it++){var jar=new THREE.Mesh(new THREE.SphereGeometry(0.16,8,6),toon([0xFF9FB0,0x9FD8FF,0xFFE066,0xB0F0C0,0xD8B0FF,0xFFC089][it%6]));jar.position.set(b.x-2.2+it*0.88,b.y+1.62+sh*1.1,b.z-_INT_HALF+0.5);_interiorExtra.add(jar);}
        }
        // elderly egg shopkeeper behind the counter
        if(typeof window._buildShopKeeper==='function'){
            var keeper=window._buildShopKeeper();
            keeper.position.set(b.x,b.y,b.z-2.6);
            _interiorExtra.add(keeper);
            window._shopKeeperPos={x:b.x,z:b.z-2.6};
        }
    }
    _interiorReturn={x:playerEgg.mesh.position.x,y:playerEgg.mesh.position.y,z:playerEgg.mesh.position.z,b:building,shop:window._interiorShop};
    window._interiorActive=true;
    if(typeof cityGroup!=='undefined'&&cityGroup)cityGroup.visible=false;
    _interiorGroup.visible=true;
    _showDoorPrompt(false);
    playerEgg.mesh.position.set(b.x,b.y+0.6,b.z+_INT_HALF-1.5);
    playerEgg.vx=0;playerEgg.vy=0;playerEgg.vz=0;playerEgg.onGround=true;
    playerEgg.mesh.rotation.y=Math.PI; // face into the room (-z)
    _showInteriorHud(true);
    if(typeof playChestSound==='function')playChestSound(false);
}
function _interiorExit(){
    if(!window._interiorActive)return;
    window._interiorActive=false;
    window._interiorShop=false;window._shopKeeperPos=null;
    if(_interiorGroup)_interiorGroup.visible=false;
    if(typeof cityGroup!=='undefined'&&cityGroup)cityGroup.visible=true;
    _showInteriorHud(false);
    if(playerEgg&&playerEgg.mesh&&_interiorReturn){
        var r=_interiorReturn;
        if(r.shop&&typeof _shopDoorPos!=='undefined'){
            var out=typeof _shopDoorOut!=='undefined'?_shopDoorOut:{x:0,z:1};
            playerEgg.mesh.position.set(_shopDoorPos.x+out.x*0.9,Math.max(r.y,1.0),_shopDoorPos.z+out.z*0.9);
        }else playerEgg.mesh.position.set(r.x,Math.max(r.y,1.0),r.z+1.0); // step back out of the door
        playerEgg.vx=0;playerEgg.vy=0;playerEgg.vz=0;
    }
}
function _showInteriorHud(show){
    var el=document.getElementById('interior-hud');
    if(show){
        var shop=window._interiorShop;
        var shopName=typeof L==='function'?L('shopName'):'Danbo General Store';
        var html=shop
            ?'<div style="font-weight:800;color:#C2477A;">\uD83C\uDFEA '+shopName+'</div><div style="font-size:12px;opacity:0.8;">\u8D70\u5230\u8001\u677F\u9762\u524D\u786E\u8BA4\u9009\u8D2D \u00B7 \u8D70\u5230\u95E8\u53E3\u79BB\u5F00</div>'
            :'<div style="font-weight:800;color:#C2477A;">\uD83C\uDFE0 \u623F\u5C4B\u5185\u90E8</div><div style="font-size:12px;opacity:0.8;">\u5185\u5BB9\u5F00\u53D1\u4E2D \u00B7 \u8D70\u5230\u95E8\u53E3\u79BB\u5F00</div>';
        if(!el){
            el=document.createElement('div');el.id='interior-hud';
            el.style.cssText='position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:58;text-align:center;'+
                'padding:8px 18px;border-radius:16px;background:rgba(255,255,255,0.9);border:2px solid #FFB6CE;'+
                'font:14px system-ui,Segoe UI,sans-serif;box-shadow:0 3px 12px rgba(0,0,0,0.25);';
            document.body.appendChild(el);
        }
        el.innerHTML=html;el.style.display='block';
    } else if(el){el.style.display='none';}
}

// ---------- per-frame interior physics + exit check (called from gameloop) ----------
function _interiorPhysics(egg){
    if(!egg||!egg.mesh)return;
    egg.vy-=0.020;                                   // gentle gravity
    egg.mesh.position.x+=egg.vx;egg.mesh.position.y+=egg.vy;egg.mesh.position.z+=egg.vz;
    egg.vx*=0.82;egg.vz*=0.82;                        // floor friction
    var b=_INT_BASE,H=_INT_HALF-0.5;
    if(egg.mesh.position.y<=b.y+0.01){egg.mesh.position.y=b.y+0.01;if(egg.vy<0)egg.vy=0;egg.onGround=true;}else egg.onGround=false;
    if(egg.mesh.position.x>b.x+H)egg.mesh.position.x=b.x+H;
    if(egg.mesh.position.x<b.x-H)egg.mesh.position.x=b.x-H;
    if(egg.mesh.position.z<b.z-H)egg.mesh.position.z=b.z-H;
    if(egg.mesh.position.z>b.z+H+1.0)egg.mesh.position.z=b.z+H+1.0;
    if(Math.abs(egg.vx)+Math.abs(egg.vz)>0.01)egg.mesh.rotation.y=Math.atan2(egg.vx,egg.vz);
    egg.squash+=(1-egg.squash)*0.15;
    // gentle exit-marker shimmer
    if(_interiorGroup&&_interiorGroup.userData._exitGlow)_interiorGroup.userData._exitGlow.material.opacity=0.4+Math.sin(Date.now()*0.005)*0.15;
}
function _interiorCheckExit(){
    if(!playerEgg||!playerEgg.mesh)return;
    // walk out through the doorway gap
    if(playerEgg.mesh.position.z>_INT_BASE.z+_INT_HALF-0.6&&Math.abs(playerEgg.mesh.position.x-_INT_BASE.x)<1.3){
        _interiorExit();
    }
}

// E key: enter (near door, in city) or leave (inside). Shop interior is handled
// by cosmetics.js (E near keeper = browse), so skip generic exit there.
window.addEventListener('keydown',function(e){
    if(e.code!=='KeyE'&&e.key!=='e'&&e.key!=='E')return;
    if(typeof gameState==='undefined'||gameState!=='city')return;
    if(window._worldMapOpen||window._shopOpen)return;
    if(window._interiorActive){ if(window._interiorShop&&window._shopNearKeeper)return; _interiorExit(); }
    else if(_nearDoorBuilding&&!window._nearShopDoor){_interiorOpenDoorConfirm();}
});
