// world.js — DANBO World
// ============================================================
//  PORTALS (race entrances in city)
// ============================================================
const RACES = [
    {name:'🌀 疯狂赛道', desc:'旋转臂与传送带！', x:40, z:0, color:0xFF4444},
    {name:'🔨 锤子风暴', desc:'大锤与摆锤！小心！', x:35, z:20, color:0xFF8800},
    {name:'⚡ 极限挑战', desc:'所有障碍加速！', x:20, z:35, color:0x8844FF},
    {name:'👑 冠军之路', desc:'最终决战！', x:0, z:40, color:0xFFD700},
    {name:'💎 \u7eff\u5b9d\u77f3\u5c71\u4e18', desc:'Sonic\u98ce\u683c\uff01\u91d1\u5e01\u4e0e\u5f39\u7c27\uff01', x:-20, z:35, color:0x44DD44},
    {name:'🔥 \u706b\u7130\u5c71\u8c37', desc:'\u52a0\u901f\u5e26\u4e0e\u5ca9\u6d46\u5730\u5f62\uff01', x:-35, z:20, color:0xFF4400},
    {name:'\u2744\ufe0f \u51b0\u971c\u6ed1\u9053', desc:'\u6ed1\u51b0\u5730\u5f62\u4e0e\u5f39\u7c27\uff01', x:-40, z:0, color:0x44CCFF},
    {name:'🌈 \u5f69\u8679\u5929\u7a7a', desc:'\u7a7a\u4e2d\u5e73\u53f0\u4e0e\u91d1\u5e01\u96e8\uff01', x:-35, z:-20, color:0xFF88FF},
    {name:'🍄 \u8611\u83c7\u738b\u56fd', desc:'\u7ecf\u5178\u6c34\u7ba1\u4e0e\u677f\u6817\uff01', x:-20, z:-35, color:0x44BB44},
    {name:'🔥 \u5ca9\u6d46\u57ce\u5821', desc:'\u5ca9\u6d46\u5730\u5f62\u4e0e\u706b\u7403\uff01', x:0, z:-40, color:0xDD4400},
    {name:'\u2601\ufe0f \u4e91\u7aef\u5929\u5802', desc:'\u7a7a\u4e2d\u5e73\u53f0\u4e0e\u5f39\u7c27\uff01', x:20, z:-35, color:0x88CCFF},
    {name:'🏰 \u5e93\u5df4\u57ce\u5821', desc:'\u6700\u7ec8\u5173\u5361\uff01\u5168\u969c\u788d\uff01', x:35, z:-20, color:0x884422}
];
// Apply localized race names/descs
for(var _ri=0;_ri<RACES.length;_ri++){RACES[_ri].name=I18N.raceNames[_langCode][_ri]||RACES[_ri].name;RACES[_ri].desc=I18N.raceDescs[_langCode][_ri]||RACES[_ri].desc;}


function _danboPortalLocale(value){
    if(value&&typeof value==='object')return value[_langCode]||value.en||value.zhs||'';
    return value||'';
}

function _danboMakePortalSign(group,text,color,pos,scale){
    if(!group||typeof THREE==='undefined')return null;
    var canvas=document.createElement('canvas');canvas.width=512;canvas.height=64;
    var ctx=canvas.getContext('2d');
    ctx.fillStyle='rgba(0,0,0,0.72)';ctx.fillRect(0,0,512,64);
    ctx.fillStyle='#'+('000000'+((color||0xFFD700)&0xffffff).toString(16)).slice(-6);
    ctx.textAlign='center';
    var fs=28;ctx.font='bold '+fs+'px sans-serif';
    while(ctx.measureText(text||'').width>480&&fs>12){fs-=2;ctx.font='bold '+fs+'px sans-serif';}
    ctx.fillText(text||'',256,42);
    var tex=new THREE.CanvasTexture(canvas);
    var sign=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true}));
    scale=scale||{x:6,y:0.8,z:1};pos=pos||{x:0,y:5,z:0};
    sign.scale.set(scale.x||6,scale.y||0.8,scale.z||1);
    sign.position.set(pos.x||0,pos.y||5,pos.z||0);
    group.add(sign);
    return sign;
}

function buildPluginEntrances(){
    if(currentCityStyle===5)return;
    if(!window.DANBO_PLUGIN_HOST||typeof window.DANBO_PLUGIN_HOST.getEntrances!=='function')return;
    var defs=window.DANBO_PLUGIN_HOST.getEntrances()||[];
    for(var ei=0;ei<defs.length;ei++){
        var def=defs[ei];
        if(!def||def.enabled===false||typeof def.create!=='function')continue;
        if(def.disabledCityStyles&&def.disabledCityStyles.indexOf&&def.disabledCityStyles.indexOf(currentCityStyle)>=0)continue;
        try{
            var entrance=def.create({
                THREE:THREE,
                toon:toon,
                cityGroup:cityGroup,
                currentCityStyle:currentCityStyle,
                lang:_langCode,
                positions:PORTAL_POSITIONS,
                portalConfig:PORTAL_CONFIG,
                makeSign:_danboMakePortalSign
            });
            if(!entrance||!entrance.group)continue;
            if(entrance.group.parent!==cityGroup)cityGroup.add(entrance.group);
            var name= _danboPortalLocale(entrance.name||def.name)||def.id;
            var desc= _danboPortalLocale(entrance.desc||def.desc||def.description);
            var color=entrance.color||def.color||0xFFFFFF;
            portals.push({
                mesh:entrance.group,
                ring:entrance.ring||entrance.group,
                inner:entrance.inner||entrance.ring||entrance.group,
                name:name,
                desc:desc,
                raceIndex:-1,
                x:(typeof entrance.x==='number')?entrance.x:((entrance.group.position&&entrance.group.position.x)||0),
                z:(typeof entrance.z==='number')?entrance.z:((entrance.group.position&&entrance.group.position.z)||0),
                y:entrance.y||0,
                color:color,
                _hiddenType:entrance.hiddenType||def.hiddenType||def.id,
                _targetStyle:(typeof entrance.targetStyle==='number')?entrance.targetStyle:((typeof def.targetStyle==='number')?def.targetStyle:-99),
                _pluginId:entrance.pluginId||def.pluginId||def.id,
                _i18nName:entrance.name||def.name,
                _i18nDesc:entrance.desc||def.desc||def.description
            });
        }catch(e){
            console.error('[PluginEntrance] failed to build '+(def.id||'?'),e);
        }
    }
}

function buildPortals() {
    if(currentCityStyle===5) return; // No race portals on moon
    // Clear old portals
    for(var _opi=portals.length-1;_opi>=0;_opi--){
        if(portals[_opi].mesh)cityGroup.remove(portals[_opi].mesh);
    }
    portals.length=0;
    RACES.forEach((race,i)=>{
        const g = new THREE.Group();
        var portalX=race.x, portalY=currentCityStyle===7?3:0, portalZ=race.z;
        g.position.set(portalX,portalY,portalZ);

        // Moon-style portals: silver/blue tones
        var pColor=race.color;
        var baseColor=0x888888;
        if(currentCityStyle===5){
            pColor=[0xAABBDD,0x8899CC,0xCCCCEE,0x99AADD,0x7788BB,0xBBCCEE,0x6677AA,0xAABBCC,0x8899BB,0xCCDDFF,0x7788CC,0x99AACC][i%12];
            baseColor=0x666688;
        }

        // Portal ring
        const ring = new THREE.Mesh(new THREE.TorusGeometry(PORTAL_CONFIG.ringRadius, PORTAL_CONFIG.ringThickness, 8, 24), toon(pColor, {emissive:pColor, emissiveIntensity:0.3}));
        ring.position.y = PORTAL_CONFIG.baseHeight; ring.castShadow = true;
        g.add(ring);

        // Outer glow ring
        var glowRing=new THREE.Mesh(new THREE.TorusGeometry(PORTAL_CONFIG.glowRadius,PORTAL_CONFIG.glowThickness,6,24),new THREE.MeshBasicMaterial({color:pColor,transparent:true,opacity:0.3}));
        glowRing.position.y=PORTAL_CONFIG.baseHeight;g.add(glowRing);

        // Swirling inner
        const inner = new THREE.Mesh(new THREE.CircleGeometry(1.7, 20), toon(pColor, {transparent:true, opacity:0.4, side:THREE.DoubleSide, emissive:pColor, emissiveIntensity:0.5}));
        inner.position.y = PORTAL_CONFIG.baseHeight;
        g.add(inner);

        // Base platform
        const base = new THREE.Mesh(new THREE.CylinderGeometry(PORTAL_CONFIG.baseRadius, 2.8, 0.4, 16), toon(baseColor));
        base.position.y = 0.2; base.receiveShadow = true;
        g.add(base);

        // Floating particles (small spheres)
        for(let p=0;p<8;p++){
            var partColor=currentCityStyle===5?pColor:race.color;
            const particle = new THREE.Mesh(new THREE.SphereGeometry(0.12,4,4), toon(partColor, {emissive:partColor, emissiveIntensity:0.6}));
            particle.position.set(Math.cos(p)*PORTAL_CONFIG.particleRadius, PORTAL_CONFIG.baseHeight+Math.sin(p*2)*0.8, Math.sin(p)*PORTAL_CONFIG.particleRadius);
            particle.userData.orbitPhase = p;
            g.add(particle);
        }

        cityGroup.add(g);
        portals.push({mesh:g, ring, inner, name:race.name, desc:race.desc, raceIndex:i, x:portalX, z:portalZ, y:portalY, color:race.color});

        // Name sign above portal
        var _pc=document.createElement('canvas');_pc.width=512;_pc.height=64;
        var _px=_pc.getContext('2d');
        _px.fillStyle='rgba(0,0,0,0.7)';_px.fillRect(0,0,512,64);
        _px.fillStyle='#FFD700';_px.textAlign='center';
        var _pfs=28;_px.font='bold '+_pfs+'px sans-serif';
        while(_px.measureText(race.name).width>480&&_pfs>12){_pfs-=2;_px.font='bold '+_pfs+'px sans-serif';}
        _px.fillText(race.name,256,42);
        var _ptex=new THREE.CanvasTexture(_pc);
        var _psign=new THREE.Sprite(new THREE.SpriteMaterial({map:_ptex,transparent:true}));
        _psign.scale.set(6,0.8,1);_psign.position.y=5;
        g.add(_psign);
        // No collider for portals — player walks through them to enter
    });

    // ---- Platformer mini-game portal ----
    if(currentCityStyle!==5){
        var _pfPortalG=new THREE.Group();
        var _pfPX=PORTAL_POSITIONS.platformerPortal.x,_pfPZ=PORTAL_POSITIONS.platformerPortal.z;
        _pfPortalG.position.set(_pfPX,0,_pfPZ);
        var _pfRing=new THREE.Mesh(new THREE.TorusGeometry(PORTAL_CONFIG.ringRadius,PORTAL_CONFIG.ringThickness,8,24),toon(0xFF6644,{emissive:0xFF4422,emissiveIntensity:0.4}));
        _pfRing.position.y=PORTAL_CONFIG.baseHeight;_pfPortalG.add(_pfRing);
        var _pfInner=new THREE.Mesh(new THREE.CircleGeometry(1.7,20),toon(0xFF8844,{transparent:true,opacity:0.4,side:THREE.DoubleSide,emissive:0xFF6622,emissiveIntensity:0.5}));
        _pfInner.position.y=PORTAL_CONFIG.baseHeight;_pfPortalG.add(_pfInner);
        var _pfBase=new THREE.Mesh(new THREE.CylinderGeometry(PORTAL_CONFIG.baseRadius,2.8,0.4,16),toon(0x886644));
        _pfBase.position.y=0.2;_pfPortalG.add(_pfBase);
        cityGroup.add(_pfPortalG);
        var _pfName={zhs:'\uD83C\uDF44 \u86CB\u5B9D\u5192\u9669',zht:'\uD83C\uDF44 \u86CB\u5BF6\u5192\u96AA',ja:'\uD83C\uDF44 \u30C0\u30F3\u30DC\u30A2\u30C9\u30D9\u30F3\u30C1\u30E3\u30FC',en:'\uD83C\uDF44 Danbo Adventure'};
        var _pfDesc={zhs:'\u6A2A\u7248\u8FC7\u5173\uFF01\u548C\u4F19\u4F34\u4E00\u8D77\u95EF\u5173\uFF01',zht:'\u6A6B\u7248\u904E\u95DC\uFF01\u548C\u5925\u4F34\u4E00\u8D77\u95D6\u95DC\uFF01',ja:'\u6A2A\u30B9\u30AF\u30ED\u30FC\u30EB\uFF01\u4EF2\u9593\u3068\u4E00\u7DD2\u306B\uFF01',en:'Side-scrolling adventure with friends!'};
        portals.push({mesh:_pfPortalG,ring:_pfRing,inner:_pfInner,
            name:_pfName[_langCode]||_pfName.en,desc:_pfDesc[_langCode]||_pfDesc.en,
            raceIndex:-1,x:_pfPX,z:_pfPZ,y:0,color:0xFF6644,_hiddenType:'platformer',_targetStyle:-99});
        // Sign
        var _pfSC=document.createElement('canvas');_pfSC.width=512;_pfSC.height=64;
        var _pfSX=_pfSC.getContext('2d');
        _pfSX.fillStyle='rgba(0,0,0,0.7)';_pfSX.fillRect(0,0,512,64);
        _pfSX.fillStyle='#FF8844';_pfSX.textAlign='center';_pfSX.font='bold 26px sans-serif';
        _pfSX.fillText(_pfName[_langCode]||_pfName.en,256,42);
        var _pfSTex=new THREE.CanvasTexture(_pfSC);
        var _pfSign=new THREE.Sprite(new THREE.SpriteMaterial({map:_pfSTex,transparent:true}));
        _pfSign.scale.set(6,0.8,1);_pfSign.position.y=5;_pfPortalG.add(_pfSign);
    }

    // ---- Mini-game entrances provided by lightweight plugin entrance scripts ----
    buildPluginEntrances();
}

// ---- Collectible coins in city ----
function buildCityCoins() {
    var _coinCityLayout=(typeof _getCityLayout==='function')?_getCityLayout(currentCityStyle):null;
    var _coinCityData=(typeof _getCityCollectibles==='function')?_getCityCollectibles(currentCityStyle):null;
    var coinCount=(_coinCityData&&_coinCityData.coinCount!==undefined)?_coinCityData.coinCount:((_coinCityLayout&&_coinCityLayout.coinCount!==undefined)?_coinCityLayout.coinCount:(currentCityStyle===5?200:180));
    if(!window._sharedCityCoinGeo)window._sharedCityCoinGeo=new THREE.CylinderGeometry(0.35,0.35,0.08,12);
    if(!window._sharedCityCoinMat)window._sharedCityCoinMat=toon(0xFFDD00,{emissive:0xFFAA00,emissiveIntensity:0.3});
    for(let i=0;i<coinCount;i++){
        var coinSpread=currentCityStyle===5?MOON_CITY_SIZE*0.9:CITY_SIZE*0.9;
        const cx=(Math.random()-0.5)*coinSpread*2, cz=(Math.random()-0.5)*coinSpread*2;
        let skip=false;
        if(currentCityStyle!==5){
            for(const c of cityColliders) if(DANBO_WASM.aabb2D(cx,cz,c.x,c.z,c.hw,c.hd,1)) skip=true;
            if(DANBO_WASM.within2D(cx,cz,0,0,7)) skip=true;
        }
        if(skip) continue;
        const coin=new THREE.Mesh(window._sharedCityCoinGeo, window._sharedCityCoinMat);
        coin.position.set(cx,1.2,cz); coin.rotation.x=Math.PI/2;
        cityGroup.add(coin);
        cityCoins.push({mesh:coin, collected:false});
    }
}

// ============================================================
//  TREASURE CHESTS — reward + exploration system
//  Common (wooden, no FX): 20-50 coins.  Rare (blue, faint glow): 100 coins.
//  Fixed per area: every city 20 chests; cloud world 10 chests.
// ============================================================
var cityChests = []; // {id,group,x,z,y,tier,opened,lid,glow,area,inScene,lidAngle}
var CHEST_CITY_TOTAL = 20, CHEST_CLOUD_TOTAL = 10;
function _tierFromRoll(r){ return r<0.08?'legendary':(r<0.30?'rare':'common'); }

// ============================================================
//  EXPLORER POINTS SYSTEM (single-player / per-player)
//  EXP is exploration-only. No combat stats, no P2W. Persisted locally.
//  saveData = {explorerPoints, explorerLevel, cityProgress, titles,
//              cosmetics, achievements, chests, hidden, claimed, daily}
// ============================================================
var Explorer=(function(){
    var KEY='danbo_save_v2';
    var LEVELS=[
        {lv:1,min:0,name:'\u65B0\u624B\u63A2\u9669\u5BB6'},   // 新手探险家
        {lv:2,min:50,name:'\u65C5\u884C\u8005'},              // 旅行者
        {lv:3,min:100,name:'\u5192\u9669\u5BB6'},             // 冒险家
        {lv:4,min:200,name:'\u8D44\u6DF1\u63A2\u9669\u5BB6'}, // 资深探险家
        {lv:5,min:400,name:'\u4E16\u754C\u65C5\u4EBA'},       // 世界旅人
        {lv:6,min:800,name:'\u4F20\u5947\u63A2\u9669\u5BB6'}  // 传奇探险家
    ];
    function norm(o){
        o=o||{};
        o.explorerPoints=o.explorerPoints||0; o.explorerLevel=o.explorerLevel||1;
        o.cityProgress=o.cityProgress||{}; o.titles=o.titles||{}; o.cosmetics=o.cosmetics||{};
        o.achievements=o.achievements||{}; o.chests=o.chests||{}; o.hidden=o.hidden||{};
        o.claimed=o.claimed||{}; o.daily=o.daily||{date:'',count:0};
        return o;
    }
    var d=(function(){try{var s=localStorage.getItem(KEY);if(s)return norm(JSON.parse(s));}catch(e){}return norm({});})();
    function save(){try{localStorage.setItem(KEY,JSON.stringify(d));}catch(e){}}
    function levelFor(p){var lv=LEVELS[0];for(var i=0;i<LEVELS.length;i++)if(p>=LEVELS[i].min)lv=LEVELS[i];return lv;}
    function today(){var t=new Date();return t.getFullYear()+'-'+(t.getMonth()+1)+'-'+t.getDate();}
    function cityCount(area){var n=0,pre=area+'_';for(var k in d.chests)if(d.chests[k]&&k.indexOf(pre)===0)n++;return n;}
    function addPoints(n,reason){
        if(!n)return;
        var before=d.explorerPoints; d.explorerPoints+=n;
        var lb=levelFor(before).lv, la=levelFor(d.explorerPoints).lv; d.explorerLevel=la; save();
        if(typeof _showExpGain==='function')_showExpGain(n);
        if(la>lb&&typeof _showLevelUp==='function')_showLevelUp(levelFor(d.explorerPoints));
        if(typeof _updateChestHud==='function')_updateChestHud();
        if(typeof _updatePlayerTag==='function')_updatePlayerTag(true);
    }
    return {
        data:function(){return d;}, save:save,
        points:function(){return d.explorerPoints;},
        levelInfo:function(){return levelFor(d.explorerPoints);},
        levels:function(){return LEVELS;},
        cityCount:cityCount,
        isChestOpened:function(id){return !!d.chests[id];},
        addPoints:addPoints,
        openChest:function(ch){
            if(!ch||ch.opened||d.chests[ch.id])return false;
            ch.opened=true; d.chests[ch.id]=true;
            d.cityProgress[ch.area]=cityCount(ch.area);
            var base=ch.tier==='legendary'?10:(ch.tier==='rare'?3:1);
            var t=today(); if(d.daily.date!==t){d.daily.date=t;d.daily.count=0;}
            var dbl=false; if(d.daily.count<5){dbl=true;d.daily.count++;}
            var coinGain=ch.tier==='legendary'?120:(ch.tier==='rare'?60:(20+Math.floor(Math.random()*31)));
            if(typeof coins!=='undefined'){coins+=coinGain;var ce=document.getElementById('coin-hud');if(ce)ce.textContent='\u2B50 '+coins;}
            save();
            if(typeof playChestSound==='function')playChestSound(ch.tier!=='common');
            if(typeof _showChestReward==='function')_showChestReward(coinGain,ch.tier);
            addPoints(dbl?base*2:base,'chest');
            if(dbl&&typeof _showDailyBonus==='function')_showDailyBonus(dbl?base:0);
            if(typeof _updateChestHud==='function')_updateChestHud();
            if(typeof _checkAreaCompletion==='function')_checkAreaCompletion(ch.area);
            return true;
        },
        discoverHidden:function(id,label){
            if(d.hidden[id])return false; d.hidden[id]=true; save();
            addPoints(5,'hidden');
            if(typeof _showHiddenArea==='function')_showHiddenArea(label||id);
            return true;
        },
        raceFinish:function(place){ addPoints(2,'race'); if(place===1)addPoints(5,'race1'); },
        isClaimed:function(area){return !!d.claimed[area];},
        grantArea:function(area,def){
            if(d.claimed[area])return false; d.claimed[area]=true;
            if(def.coins&&typeof coins!=='undefined'){coins+=def.coins;var ce=document.getElementById('coin-hud');if(ce)ce.textContent='\u2B50 '+coins;}
            if(def.title)d.titles[def.title]=true;
            (def.cosmetics||[]).forEach(function(c){d.cosmetics[c]=true;});
            if(def.achievement)d.achievements[def.achievement]=true;
            save();
            if(def.points)addPoints(def.points,'cityComplete');
            return true;
        }
    };
})();

function _makeChestMesh(tier){
    var g=new THREE.Group();
    var rare=(tier==='rare'), leg=(tier==='legendary');
    var bodyHex=leg?0xE0A52A:(rare?0x2E6FB0:0x8B5A2B);
    var lidHex =leg?0xFFD23F:(rare?0x3D86D6:0xA0703A);
    var emiHex =leg?0xC8860A:(rare?0x2E70C0:0x000000);
    var bodyMat=toon(bodyHex,{emissive:emiHex,emissiveIntensity:leg?0.4:(rare?0.25:0)});
    var lidMat =toon(lidHex,{emissive:emiHex,emissiveIntensity:leg?0.45:(rare?0.30:0)});
    var bandMat=toon(leg?0xFFE680:0x6E6E78,{emissive:leg?0x8A6E10:0x222228,emissiveIntensity:leg?0.3:0.1});
    var base=new THREE.Mesh(new THREE.BoxGeometry(1.0,0.6,0.7),bodyMat);
    base.position.y=0.3;g.add(base);
    [-0.34,0.34].forEach(function(bx){
        var band=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.62,0.72),bandMat);
        band.position.set(bx,0.3,0);g.add(band);
    });
    var lidPivot=new THREE.Group();lidPivot.position.set(0,0.6,-0.35);
    var lid=new THREE.Mesh(new THREE.BoxGeometry(1.0,0.28,0.7),lidMat);
    lid.position.set(0,0.0,0.35);lidPivot.add(lid);
    var lidBand=new THREE.Mesh(new THREE.BoxGeometry(1.04,0.30,0.09),bandMat);
    lidBand.position.set(0,0.0,0.35);lidPivot.add(lidBand);
    g.add(lidPivot);
    var lock=new THREE.Mesh(new THREE.BoxGeometry(0.15,0.18,0.08),toon(0xD4AF37,{emissive:0x8A6E10,emissiveIntensity:0.2}));
    lock.position.set(0,0.5,0.37);g.add(lock);
    var glow=null;
    if(rare||leg){
        glow=new THREE.Mesh(new THREE.SphereGeometry(leg?1.15:0.95,12,10),new THREE.MeshBasicMaterial({
            color:leg?0xFFE066:0x66BBFF,transparent:true,opacity:leg?0.26:0.16,depthWrite:false,blending:THREE.AdditiveBlending,fog:false
        }));
        glow.position.y=0.4;g.add(glow);
    }
    g.userData._lidPivot=lidPivot;g.userData._glow=glow;
    return g;
}
function _spawnChest(id,area,x,y,z,rot,tier,inScene){
    var grp=_makeChestMesh(tier);
    grp.position.set(x,y,z);grp.rotation.y=rot;
    (inScene?scene:cityGroup).add(grp);
    var opened=Explorer.isChestOpened(id);
    var ch={id:id,group:grp,x:x,z:z,y:y,tier:tier,area:area,opened:opened,
        lid:grp.userData._lidPivot,glow:grp.userData._glow,inScene:!!inScene,lidAngle:0};
    if(opened&&ch.lid){ch.lidAngle=1.2;ch.lid.rotation.x=-1.2;}
    cityChests.push(ch);
    return ch;
}
function buildCityChests(){
    var area='city'+currentCityStyle;
    var groundY=(currentCityStyle===7)?3.0:0.0;
    var spread=(currentCityStyle===5?MOON_CITY_SIZE:CITY_SIZE)*0.9;
    var placed=0,attempts=0;
    while(placed<CHEST_CITY_TOTAL&&attempts<CHEST_CITY_TOTAL*60){
        attempts++;
        var cx=(Math.random()-0.5)*spread*2, cz=(Math.random()-0.5)*spread*2;
        if(currentCityStyle!==5){
            var skip=false;
            for(var i=0;i<cityColliders.length;i++){var c=cityColliders[i];if(DANBO_WASM.aabb2D(cx,cz,c.x,c.z,c.hw,c.hd,1.2)){skip=true;break;}}
            if(skip)continue;
            if(DANBO_WASM.within2D(cx,cz,0,0,7))continue; // keep spawn center clear
        }
        _spawnChest(area+'_'+placed,area,cx,groundY,cz,Math.random()*Math.PI*2,_tierFromRoll(Math.random()),false);
        placed++;
    }
    _updateChestHud();
    _ensureLeaderboardBtn();
}
function _updateChestHud(){
    var el=document.getElementById('chest-hud');
    if(!el){
        el=document.createElement('div');el.id='chest-hud';
        el.style.cssText='position:fixed;top:44px;left:12px;z-index:50;font:bold 15px system-ui,Segoe UI,sans-serif;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.85);pointer-events:none;line-height:1.5;';
        document.body.appendChild(el);
    }
    var lv=Explorer.levelInfo();
    var co=Explorer.cityCount('city'+currentCityStyle);
    var l1='\uD83E\uDDED Lv'+lv.lv+' '+lv.name+'   \u2728 '+Explorer.points()+' EXP';
    var l2='\uD83E\uDDF0 '+co+'/'+CHEST_CITY_TOTAL;
    if(currentCityStyle<=4)l2+='   \u2601\uFE0F '+Explorer.cityCount('cloud')+'/'+CHEST_CLOUD_TOTAL;
    el.innerHTML=l1+'<br>'+l2;
}
function _floatToast(text,color,topFrom,topTo,life){
    var t=document.createElement('div');t.textContent=text;
    t.style.cssText='position:fixed;left:50%;top:'+topFrom+';transform:translateX(-50%);z-index:61;'+
        'font:bold 18px system-ui,Segoe UI,sans-serif;color:'+color+';text-shadow:0 2px 6px rgba(0,0,0,0.85);'+
        'pointer-events:none;transition:top 0.8s ease-out,opacity 0.8s ease-out;opacity:1;';
    document.body.appendChild(t);
    requestAnimationFrame(function(){t.style.top=topTo;t.style.opacity='0';});
    setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t);},life||900);
}
function _showExpGain(n){ _floatToast('+'+n+' \u2728 EXP','#9FE8FF','18%','12%',850); }
function _showDailyBonus(){ _floatToast('\u2728 \u4ECA\u65E5\u63A2\u7D22\u5956\u52B1\uFF01\u53CC\u500D\u79EF\u5206','#FFE066','26%','21%',1400); }
function _showHiddenArea(label){ _floatToast('\uD83D\uDD0D \u53D1\u73B0\u9690\u85CF\u533A\u57DF\uFF1A'+label+'  +5 \u2728','#C8FFB0','23%','18%',1800); }
function _showChestReward(amount,tier){
    var col=tier==='legendary'?'#FFD23F':(tier==='rare'?'#7FD0FF':'#FFE066');
    var label=tier==='legendary'?'\uD83D\uDC51 \u4F20\u8BF4\u5B9D\u7BB1':(tier==='rare'?'\uD83D\uDC8E \u7A00\u6709\u5B9D\u7BB1':'\uD83E\uDDF0');
    _floatToast(label+'  +'+amount+' \u2B50',col,'58%','49%',1000);
}
function _showLevelUp(lv){
    var w=document.createElement('div');
    w.innerHTML='<div style="font-size:14px;opacity:.85;">\u63A2\u7D22\u7B49\u7EA7\u63D0\u5347</div>'+
        '<div style="font-size:24px;font-weight:800;color:#FFD86B;margin-top:4px;">Lv'+lv.lv+'  '+lv.name+'</div>';
    w.style.cssText='position:fixed;left:50%;top:30%;transform:translate(-50%,-50%);z-index:121;padding:16px 28px;border-radius:14px;'+
        'background:linear-gradient(160deg,rgba(20,30,50,.96),rgba(40,30,64,.96));border:2px solid #7FD0FF;'+
        'box-shadow:0 8px 36px rgba(0,0,0,.6),0 0 22px rgba(127,208,255,.5);color:#fff;text-align:center;'+
        'font-family:system-ui,Segoe UI,sans-serif;opacity:0;transition:opacity .4s,top .4s;pointer-events:none;';
    document.body.appendChild(w);
    requestAnimationFrame(function(){w.style.opacity='1';w.style.top='28%';});
    setTimeout(function(){w.style.opacity='0';},2600);
    setTimeout(function(){if(w.parentNode)w.parentNode.removeChild(w);},3100);
}

// ---- Local exploration leaderboard (single-player shows local player) ----
function _ensureLeaderboardBtn(){
    if(document.getElementById('lb-btn'))return;
    var b=document.createElement('div');b.id='lb-btn';b.textContent='\uD83C\uDFC6';
    b.style.cssText='position:fixed;top:86px;right:12px;z-index:55;width:38px;height:38px;border-radius:10px;'+
        'background:rgba(20,24,40,0.7);border:1px solid rgba(255,255,255,0.25);color:#FFD86B;font-size:21px;'+
        'line-height:38px;text-align:center;cursor:pointer;user-select:none;';
    b.onclick=_openLeaderboard;
    document.body.appendChild(b);
}
function _openLeaderboard(){
    var old=document.getElementById('lb-panel');if(old){old.parentNode.removeChild(old);return;}
    var lv=Explorer.levelInfo();
    var name=(typeof CHARACTERS!=='undefined'&&CHARACTERS[selectedChar])?CHARACTERS[selectedChar].name:'Player';
    var p=document.createElement('div');p.id='lb-panel';
    p.style.cssText='position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:130;min-width:300px;max-width:86vw;'+
        'padding:18px 22px;border-radius:16px;background:linear-gradient(160deg,rgba(18,22,38,0.97),rgba(40,30,60,0.97));'+
        'border:2px solid #FFD86B;box-shadow:0 10px 44px rgba(0,0,0,0.6);color:#fff;font-family:system-ui,Segoe UI,sans-serif;';
    var h='<div style="font-size:20px;font-weight:800;color:#FFD86B;text-align:center;margin-bottom:10px;">\uD83C\uDFC6 \u63A2\u7D22\u6392\u884C\u699C</div>';
    h+='<table style="width:100%;border-collapse:collapse;font-size:15px;">';
    h+='<tr style="opacity:.7;"><td style="padding:4px 6px;">#</td><td>\u6635\u79F0</td><td>\u7B49\u7EA7</td><td style="text-align:right;">\u79EF\u5206</td></tr>';
    h+='<tr style="background:rgba(255,216,107,0.12);"><td style="padding:6px;">1</td><td>'+name+'</td><td>Lv'+lv.lv+' '+lv.name+'</td><td style="text-align:right;font-weight:700;">'+Explorer.points()+'</td></tr>';
    h+='</table>';
    h+='<div style="font-size:12px;opacity:.7;margin-top:12px;line-height:1.5;">\u5355\u673A\u6A21\u5F0F\u4EC5\u663E\u793A\u672C\u5730\u73A9\u5BB6\u3002\u8DE8\u73A9\u5BB6\u5B9E\u65F6\u6392\u884C\u699C\u9700\u8054\u7F51\u670D\u52A1\u5668\u3002</div>';
    h+='<div id="lb-close" style="margin-top:14px;text-align:center;color:#9FE8FF;cursor:pointer;">\u5173\u95ED</div>';
    p.innerHTML=h;document.body.appendChild(p);
    document.getElementById('lb-close').onclick=function(){if(p.parentNode)p.parentNode.removeChild(p);};
}

// ============================================================
//  CITY EXPLORATION REWARDS — granted ONCE at 100% per area.
// ============================================================
var REWARDS={
    city0:{coins:500, points:20,title:'title_egg_explorer',           cosmetics:['cosmetic_explorer_hat'],   achievement:'achievement_first_adventure'},
    city1:{coins:500, points:20,title:'title_desert_wanderer',        cosmetics:['cosmetic_desert_scarf'],   achievement:'achievement_lost_ruins'},
    city2:{coins:500, points:20,title:'title_ice_explorer',           cosmetics:['cosmetic_snow_footprints'],achievement:'achievement_frozen_master'},
    city3:{coins:500, points:20,title:'title_lava_challenger',        cosmetics:['cosmetic_flame_trail'],    achievement:'achievement_lava_runner'},
    city4:{coins:500, points:20,title:'title_candy_collector',        cosmetics:['cosmetic_lollipop_hat'],   achievement:'achievement_sweet_journey'},
    city6:{coins:500, points:20,title:'title_sakura_traveler',        cosmetics:['cosmetic_sakura_halo'],    achievement:'achievement_hanami_master'},
    city7:{coins:500, points:20,title:'title_snow_village_guardian',  cosmetics:['cosmetic_winter_hat'],     achievement:'achievement_winter_visitor'},
    city5:{coins:1000,points:30,title:'title_moon_explorer',          cosmetics:['cosmetic_space_helmet'],   achievement:'achievement_to_the_moon'},
    cloud:{coins:1000,points:30,title:'title_cloud_traveler',         cosmetics:['cosmetic_cloud_halo'],     achievement:'achievement_above_the_sky'},
    all:  {coins:5000,points:100,title:'title_legendary_explorer',    cosmetics:['cosmetic_rainbow_footprints','cosmetic_rainbow_halo'], achievement:'achievement_world_explorer'}
};
var REWARD_NAMES={
    title_egg_explorer:'\u86CB\u5B9D\u57CE\u63A2\u9669\u5BB6', title_desert_wanderer:'\u6C99\u6D77\u65C5\u4EBA',
    title_ice_explorer:'\u51B0\u539F\u63A2\u7D22\u5BB6', title_lava_challenger:'\u7194\u5CA9\u6311\u6218\u8005',
    title_candy_collector:'\u7CD6\u679C\u6536\u85CF\u5BB6', title_sakura_traveler:'\u6A31\u82B1\u65C5\u4EBA',
    title_snow_village_guardian:'\u96EA\u6751\u5B88\u62A4\u8005', title_moon_explorer:'\u6708\u9762\u63A2\u9669\u5BB6',
    title_cloud_traveler:'\u4E91\u7AEF\u65C5\u8005', title_legendary_explorer:'\u4F20\u5947\u63A2\u9669\u5BB6',
    cosmetic_explorer_hat:'\u63A2\u9669\u5E3D', cosmetic_desert_scarf:'\u6C99\u6F20\u56F4\u5DFE', cosmetic_snow_footprints:'\u96EA\u5730\u811A\u5370',
    cosmetic_flame_trail:'\u706B\u7130\u62D6\u5C3E', cosmetic_lollipop_hat:'\u68D2\u68D2\u7CD6\u5E3D', cosmetic_sakura_halo:'\u6A31\u82B1\u5149\u73AF',
    cosmetic_winter_hat:'\u51AC\u65E5\u5E3D', cosmetic_space_helmet:'\u592A\u7A7A\u5934\u76D4', cosmetic_cloud_halo:'\u4E91\u6735\u5149\u73AF',
    cosmetic_rainbow_footprints:'\u5F69\u8679\u811A\u5370', cosmetic_rainbow_halo:'\u5F69\u8679\u5149\u73AF',
    achievement_first_adventure:'\u521D\u6B21\u5192\u9669', achievement_lost_ruins:'\u5931\u843D\u9057\u8FF9', achievement_frozen_master:'\u51B0\u5C01\u5927\u5E08',
    achievement_lava_runner:'\u7194\u5CA9\u5954\u8DD1\u8005', achievement_sweet_journey:'\u751C\u871C\u65C5\u7A0B', achievement_hanami_master:'\u8D4F\u82B1\u5927\u5E08',
    achievement_winter_visitor:'\u51AC\u65E5\u8BBF\u5BA2', achievement_to_the_moon:'\u767B\u4E0A\u6708\u7403', achievement_above_the_sky:'\u4E91\u7AEF\u4E4B\u4E0A',
    achievement_world_explorer:'\u4E16\u754C\u63A2\u7D22\u8005'
};
function _rn(id){return REWARD_NAMES[id]||id;}
function _areaDisplayName(area){
    if(area==='all')return '\uD83C\uDF08 \u5168\u5730\u56FE\u63A2\u7D22\u5B8C\u6210\uFF01';
    if(area==='cloud')return '\u2601\uFE0F \u4E91\u4E2D\u754C \u63A2\u7D22 100%\uFF01';
    var idx=parseInt(area.replace('city',''),10);
    var nm=(typeof CITY_STYLES!=='undefined'&&CITY_STYLES[idx])?CITY_STYLES[idx].name:area;
    return nm+' \u63A2\u7D22 100%\uFF01';
}
function _checkAreaCompletion(area){
    if(REWARDS[area]){
        var total=(area==='cloud')?CHEST_CLOUD_TOTAL:CHEST_CITY_TOTAL;
        if(Explorer.cityCount(area)>=total&&Explorer.grantArea(area,REWARDS[area]))_showRewardBanner(area,REWARDS[area]);
    }
    var keys=['city0','city1','city2','city3','city4','city5','city6','city7','cloud'];
    var allDone=keys.every(function(k){var t=(k==='cloud')?CHEST_CLOUD_TOTAL:CHEST_CITY_TOTAL;return Explorer.cityCount(k)>=t;});
    if(allDone&&Explorer.grantArea('all',REWARDS.all))_showRewardBanner('all',REWARDS.all);
}
function _showRewardBanner(area,def){
    var wrap=document.createElement('div');
    wrap.style.cssText='position:fixed;left:50%;top:36%;transform:translate(-50%,-50%);z-index:120;min-width:280px;max-width:82vw;'+
        'padding:18px 26px;border-radius:16px;background:linear-gradient(160deg,rgba(20,24,40,0.96),rgba(44,30,64,0.96));'+
        'border:2px solid #FFD86B;box-shadow:0 8px 40px rgba(0,0,0,0.6),0 0 26px rgba(255,216,107,0.45);color:#fff;'+
        'font-family:system-ui,Segoe UI,sans-serif;text-align:center;opacity:0;transition:opacity 0.4s ease,top 0.4s ease;pointer-events:none;';
    var h='<div style="font-size:22px;font-weight:800;color:#FFD86B;margin-bottom:6px;">'+_areaDisplayName(area)+'</div>';
    h+='<div style="font-size:13px;opacity:0.82;margin-bottom:10px;">\u63A2\u7D22\u5956\u52B1\u5DF2\u53D1\u653E</div>';
    h+='<div style="font-size:16px;line-height:1.7;text-align:left;display:inline-block;">';
    if(def.title)h+='\uD83C\uDFC5 \u79F0\u53F7\uFF1A'+_rn(def.title)+'<br>';
    (def.cosmetics||[]).forEach(function(c){h+='\uD83C\uDF80 \u88C5\u626E\uFF1A'+_rn(c)+'<br>';});
    if(def.points)h+='\u2728 +'+def.points+' \u63A2\u7D22\u79EF\u5206<br>';
    if(def.coins)h+='\u2B50 '+def.coins+' \u91D1\u5E01<br>';
    if(def.achievement)h+='\uD83C\uDFC6 \u6210\u5C31\uFF1A'+_rn(def.achievement)+'<br>';
    h+='</div>';
    wrap.innerHTML=h;
    document.body.appendChild(wrap);
    requestAnimationFrame(function(){wrap.style.opacity='1';wrap.style.top='33%';});
    setTimeout(function(){wrap.style.opacity='0';},4600);
    setTimeout(function(){if(wrap.parentNode)wrap.parentNode.removeChild(wrap);},5200);
}



// ---- Warp Pipes (Mario 3D World style transparent tubes) ----
function buildWarpPipes(){
    warpPipeMeshes.forEach(function(wp){cityGroup.remove(wp.group);});
    warpPipeMeshes=[];
    // No ground warp pipes on moon (only reachable from cloud world)
    if(currentCityStyle===5)return;
    var pipeMat=new THREE.MeshPhongMaterial({color:0x44DD44,transparent:true,opacity:0.45,side:THREE.DoubleSide});
    var rimMat=toon(0x33BB33,{emissive:0x22AA22,emissiveIntensity:0.2});
    // Build pipe targets: ground pipes go to cities 0-4 only (not moon=5)
    var targets=[];
    for(var ti=0;ti<CITY_STYLES.length;ti++){
        if(ti===currentCityStyle)continue;
        if(ti===5)continue; // Moon city only reachable from cloud world
        targets.push(ti);
    }
    // Place pipes at city edges (from config)
    var positions=PORTAL_POSITIONS.warpPipes;
    // Snow village: offset pipes to avoid dock (z=145 area)
    if(currentCityStyle===7){
        positions=positions.map(function(p){
            if(DANBO_WASM.absDeltaLess(p.x,0,10)&&p.z>100)return{x:60,z:110,targetOffset:p.targetOffset};
            return p;
        });
    }
    var pipeColors=[0x44DD44,0x44CCFF,0xFF8844,0xFF44DD,0xFFDD44,0xCCCCFF,0xFFAABB,0xE8EEF0];
    for(var pi2=0;pi2<Math.min(targets.length,positions.length);pi2++){
        var tgt=targets[pi2];
        var pos=positions[pi2];
        var tst=CITY_STYLES[tgt];
        var g=new THREE.Group();
        var pColor=pipeColors[tgt]||0x44DD44;
        var pMat=new THREE.MeshPhongMaterial({color:pColor,transparent:true,opacity:0.4,side:THREE.DoubleSide});
        // Vertical tube — big and visible
        var tube=new THREE.Mesh(new THREE.CylinderGeometry(PIPE_CONFIG.radius,PIPE_CONFIG.radius,PIPE_CONFIG.height,16,1,true),pMat);
        tube.position.y=PIPE_CONFIG.height/2;g.add(tube);
        // Top rim
        var rim=new THREE.Mesh(new THREE.TorusGeometry(PIPE_CONFIG.ringRadius,PIPE_CONFIG.ringThickness,8,16),toon(pColor,{emissive:pColor,emissiveIntensity:0.4}));
        rim.position.y=PIPE_CONFIG.height;rim.rotation.x=Math.PI/2;g.add(rim);
        // Bottom rim
        var rim2=new THREE.Mesh(new THREE.TorusGeometry(PIPE_CONFIG.ringRadius,0.35,8,16),toon(pColor,{emissive:pColor,emissiveIntensity:0.3}));
        rim2.position.y=0.1;rim2.rotation.x=Math.PI/2;g.add(rim2);
        // Inner glow spiral — more orbs
        var sMat=new THREE.MeshBasicMaterial({color:pColor,transparent:true,opacity:0.5});
        for(var si=0;si<12;si++){
            var sp=new THREE.Mesh(new THREE.SphereGeometry(0.4,6,4),sMat);
            var a=si/12*Math.PI*2;
            sp.position.set(Math.cos(a)*1.8,0.5+si*0.6,Math.sin(a)*1.8);
            g.add(sp);
        }
        // Beacon light on top
        var beacon=new THREE.Mesh(new THREE.SphereGeometry(0.8,8,6),new THREE.MeshBasicMaterial({color:pColor,transparent:true,opacity:0.7}));
        beacon.position.y=9;g.add(beacon);
        // Label sign
        var canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;
        var ctx2=canvas.getContext('2d');
        ctx2.fillStyle='rgba(0,0,0,0.6)';ctx2.fillRect(0,0,256,64);
        ctx2.fillStyle='#fff';ctx2.font='bold 28px sans-serif';ctx2.textAlign='center';
        ctx2.fillText(tst.name,128,42);
        var tex=new THREE.CanvasTexture(canvas);
        var signMat=new THREE.SpriteMaterial({map:tex,transparent:true});
        var sign=new THREE.Sprite(signMat);
        sign.scale.set(5,1.2,1);sign.position.y=10.5;
        g.add(sign);
        var _pipeY=currentCityStyle===7?3:0;
        g.position.set(pos.x,_pipeY,pos.z);
        cityGroup.add(g);
        warpPipeMeshes.push({group:g,x:pos.x,z:pos.z,y:_pipeY,targetStyle:tgt,_cooldown:false});
    }
}

function clearCity(){
    if(typeof _clearCityVisualFX==='function')_clearCityVisualFX();
    // Remove everything from cityGroup
    while(cityGroup.children.length>0)cityGroup.remove(cityGroup.children[0]);
    cityColliders.length=0;
    cityBuildingMeshes.length=0;
    // Remove scene-added coins (cloud world coins)
    for(var ci=0;ci<cityCoins.length;ci++){if(cityCoins[ci].inScene)scene.remove(cityCoins[ci].mesh);}
    cityCoins.length=0;
    // Remove scene-added chests (cloud world) and reset chest list
    for(var chi=0;chi<cityChests.length;chi++){if(cityChests[chi].inScene&&cityChests[chi].group)scene.remove(cityChests[chi].group);}
    cityChests.length=0;
    cityProps.length=0;
    warpPipeMeshes.length=0;
    window._fountainParticles=null;
    window._fountainSplashParticles=null;
    window._fountainPoolWater=null;
    window._sakuraPetals=null;
    window._sakuraCanalWater=null;
    window._sakuraStreamAnimals=null;
    window._fountainInnerWater=null;
    window._cityFish=null;
    window._waterWheels=null;
    window._oceanMesh=null;
    window._waveRings=null;
    window._snowParticles=null;
    window._snowCitySteam=null;
    window._snowCityWater=null;
    if(window._cityAnimals){for(var _cai=0;_cai<window._cityAnimals.length;_cai++){var _ca=window._cityAnimals[_cai];if(_ca._inScene)scene.remove(_ca.group);else if(_ca.group&&_ca.group.parent)_ca.group.parent.remove(_ca.group);}}
    window._cityAnimals=null;
    if(window._allProjectiles){for(var _api2=0;_api2<window._allProjectiles.length;_api2++){MoveProjectile_cleanup(window._allProjectiles[_api2]);}window._allProjectiles=[];}
    window._playerHadouken=null;
    // Remove city NPCs
    for(var i=0;i<cityNPCs.length;i++){_removeStunStars(cityNPCs[i]);scene.remove(cityNPCs[i].mesh);}
    cityNPCs.length=0;
    // Remove from allEggs
    for(var j=allEggs.length-1;j>=0;j--){if(allEggs[j].cityNPC){scene.remove(allEggs[j].mesh);allEggs.splice(j,1);}}
    // Remove clouds
    for(var k=0;k<cityCloudPlatforms.length;k++){scene.remove(cityCloudPlatforms[k].group);}
    cityCloudPlatforms.length=0;
    // Remove cloud world moon pipe
    if(_cloudWorldPipe){scene.remove(_cloudWorldPipe.group);_cloudWorldPipe=null;}
    // Remove moon earth
    if(window._moonEarth){scene.remove(window._moonEarth);window._moonEarth=null;}
    // Remove moon stars
    if(window._moonStars){for(var si=0;si<window._moonStars.length;si++){scene.remove(window._moonStars[si].mesh);}window._moonStars=null;}
    // Remove moon nebulae
    if(window._moonNebulae){for(var ni=0;ni<window._moonNebulae.length;ni++){scene.remove(window._moonNebulae[ni]);}window._moonNebulae=null;}
    // Remove moon Gundams
    if(window._moonGundams){for(var gi=0;gi<window._moonGundams.length;gi++){scene.remove(window._moonGundams[gi].group);}window._moonGundams=null;}
    if(window._moonBeams){for(var bi=0;bi<window._moonBeams.length;bi++){scene.remove(window._moonBeams[bi].mesh);}window._moonBeams=null;}
    if(window._moonMissiles){for(var mmi=0;mmi<window._moonMissiles.length;mmi++){scene.remove(window._moonMissiles[mmi].group);}window._moonMissiles=null;}
    window._moonShields=null;
    // Remove shield dome visual meshes from scene
    if(window._moonShieldDomes){for(var _sdi=0;_sdi<window._moonShieldDomes.length;_sdi++){scene.remove(window._moonShieldDomes[_sdi]);}window._moonShieldDomes=null;}
    window._moonCities=null;
    window._moonBldgColliders=null;
    window._moonRover=null;
    window._earthReturnPortal=null;
    // Remove solar system objects
    if(window._solarPlanets){for(var spi=0;spi<window._solarPlanets.length;spi++){scene.remove(window._solarPlanets[spi].mesh);}window._solarPlanets=null;}
    if(window._sunSolar){scene.remove(window._sunSolar);window._sunSolar=null;}
    if(window._sunSolarGlow){scene.remove(window._sunSolarGlow);window._sunSolarGlow=null;}
    if(window._solarLight){scene.remove(window._solarLight);window._solarLight=null;}
    // Remove Tower of Babel
    if(_babylonTower){scene.remove(_babylonTower.group);_babylonTower=null;}
    _babylonTriggered=false;_babylonRising=false;_babylonRiseY=-52;_earthquakeTimer=0;
    _moonPipeDismissed=false;_moonPipePromptOpen=false;
}

function applyCityTheme(){
    var st=CITY_STYLES[currentCityStyle];
    // Sky color
    scene.background=new THREE.Color(st.sky);
    if(typeof _updateSkyDome==='function'){
        var horizon=st.fog||_mixHex(st.sky,0xFFFFFF,currentCityStyle===5?0.08:0.38);
        var groundTint=st.ground||st.path||0x88CCAA;
        if(currentCityStyle===0){horizon=0x91C5DA;groundTint=0x385E42;}
        if(currentCityStyle===7){horizon=0x91A7C9;groundTint=0x293C5A;}
        if(currentCityStyle===5){horizon=0x111133;groundTint=0x020208;}
        _updateSkyDome(st.sky,horizon,groundTint);
    }
    if(typeof R!=='undefined'){
        R.toneMappingExposure=currentCityStyle===0?1.025:(currentCityStyle===5?1.06:(currentCityStyle===7?1.08:(RENDER_CONFIG.toneExposure||1.06)));
    }
    // Fog / aerial perspective — always keep a little depth haze for richer scenery
    if(st.fog){scene.fog=new THREE.Fog(st.fog,60,180);}
    else if(currentCityStyle===5){scene.fog=new THREE.Fog(0x070712,260,900);}
    else if(currentCityStyle===7){scene.fog=new THREE.Fog(0x91A7C9,130,850);}
    else if(currentCityStyle===0){scene.fog=new THREE.Fog(0xA8C8D1,185,520);}
    else{scene.fog=new THREE.Fog(_mixHex(st.sky,st.ground||st.path||0xFFFFFF,0.22),140,430);}
    if(typeof rimLight!=='undefined'){
        rimLight.visible=currentCityStyle!==5;
        if(currentCityStyle===7){rimLight.color.setHex(0xE3EFFF);rimLight.intensity=0.28;}
        else if(currentCityStyle===3){rimLight.color.setHex(0xFFC2A6);rimLight.intensity=0.18;}
        else if(currentCityStyle===2){rimLight.color.setHex(0xE5F6FF);rimLight.intensity=0.24;}
        else if(currentCityStyle===0){rimLight.color.setHex(0xD8F6FF);rimLight.intensity=0.36;}
        else{rimLight.color.setHex(0xD0F0FF);rimLight.intensity=0.22;}
    }
    if(typeof softFillLight!=='undefined'){
        softFillLight.visible=currentCityStyle!==5;
        if(currentCityStyle===0){softFillLight.color.setHex(0xFFD8C2);softFillLight.intensity=0.24;}
        else if(currentCityStyle===3){softFillLight.color.setHex(0xFF8A55);softFillLight.intensity=0.18;}
        else{softFillLight.color.setHex(0xFFE3D4);softFillLight.intensity=0.14;}
    }
    // Sun visibility — only in ground cities, not on moon
    var isMoon=(currentCityStyle===5);
    if(currentCityStyle===0){RENDER_CONFIG.sunPos.x=38;RENDER_CONFIG.sunPos.y=45;RENDER_CONFIG.sunPos.z=-100;}
    else{RENDER_CONFIG.sunPos.x=60;RENDER_CONFIG.sunPos.y=80;RENDER_CONFIG.sunPos.z=40;}
    _sunMesh.visible=!isMoon;
    _sunGlow.visible=!isMoon;
    sun.visible=!isMoon;
    // Follow player with shadow camera
    if(!isMoon){
        sun.shadow.camera.far=RENDER_CONFIG.shadowFar;
        if(currentCityStyle===7){
            // Snow village twilight: bright pale blue ambient (like reflected skylight on snow)
            sun.intensity=0.48;
            sun.color.setHex(0xAABBDD);
            _sunMesh.visible=false;
            _sunGlow.visible=false;
            scene.children.forEach(function(c){
                if(c.isAmbientLight){c.color.setHex(0xB8CBE0);c.intensity=1.15;} // soft pale blue
                if(c.isHemisphereLight){c.color.setHex(0xD7E6FF);c.groundColor.setHex(0xAFC0D8);c.intensity=0.92;}
            });
        } else if(currentCityStyle===0){
            sun.intensity=2.12;
            sun.color.setHex(0xFFD08F);
            _sunMesh.visible=true;_sunGlow.visible=true;
            scene.children.forEach(function(c){
                if(c.isAmbientLight){c.color.setHex(0xFFF1DE);c.intensity=0.36;}
                if(c.isHemisphereLight){c.color.setHex(0xD9EDFF);c.groundColor.setHex(0x665E45);c.intensity=0.60;}
            });
        } else {
            sun.intensity=RENDER_CONFIG.sunIntensity;
            sun.color.setHex(RENDER_CONFIG.sunColor);
            _sunMesh.visible=true;
            _sunGlow.visible=true;
            // Restore default ambient/hemisphere lighting
            scene.children.forEach(function(c){
                if(c.isAmbientLight){c.color.setHex(0xffffff);c.intensity=RENDER_CONFIG.ambientIntensity;}
                if(c.isHemisphereLight){c.color.setHex(RENDER_CONFIG.hemiSkyColor);c.groundColor.setHex(RENDER_CONFIG.hemiGroundColor);c.intensity=RENDER_CONFIG.hemiIntensity;}
            });
        }
    }
    // Update HUD
    document.getElementById('city-name-hud').textContent=st.name;
    if(typeof _rebuildCityVisualFX==='function')_rebuildCityVisualFX(currentCityStyle,st);
}

// ---- Pipe travel animation state ----
var _pipeTraveling=false, _pipeTimer=0, _pipeDuration=PIPE_CONFIG.travelDuration, _pipeArrivalCooldown=0; // 3 seconds at 60fps
var _pipeStartX=0, _pipeStartZ=0, _pipeEndX=0, _pipeEndZ=0;
var _pipeTubeGroup=null, _pipeTargetStyle=0;
var _pipeMidX=0, _pipeMidZ=0;
var _pipeStartY=3; // starting Y height for pipe travel
var _pipeCityLoadPending=false;
var _pipeCityLoadFailed=false;

function _ensureCityDataLoaded(style,done){
    if(!window.DANBO_CITY_DATA||!DANBO_CITY_DATA.ensureCityLoaded){done(true);return;}
    if(DANBO_CITY_DATA.isLoaded&&DANBO_CITY_DATA.isLoaded(style)){done(true);return;}
    DANBO_CITY_DATA.ensureCityLoaded(style).then(function(){done(true);}).catch(function(err){
        console.error('Failed to load city '+style,err);
        done(false);
    });
}

function startPipeTravel(fromX,fromZ,targetStyle,fromY){
    _pipeCityLoadFailed=false;
    if(window.DANBO_CITY_DATA&&DANBO_CITY_DATA.ensureCityLoaded&&DANBO_CITY_DATA.isLoaded&&!DANBO_CITY_DATA.isLoaded(targetStyle)&&!_pipeCityLoadPending){
        // Start loading the target city during the pipe flight. If it is still
        // not ready at the rebuild point, updatePipeTravel pauses briefly high
        // above the scene instead of making the entrance feel unresponsive.
        _pipeCityLoadPending=true;
        _ensureCityDataLoaded(targetStyle,function(ok){_pipeCityLoadPending=false;if(!ok)_pipeCityLoadFailed=true;});
    }
    if(typeof _resetViewMode==='function')_resetViewMode();
    if(playerEgg&&playerEgg.mesh)playerEgg.mesh.visible=true;
    _pipeTraveling=true;_pipeTimer=0;_pipeTargetStyle=targetStyle;
    _pipeStartX=fromX;_pipeStartZ=fromZ;
    _pipeStartY=(fromY!==undefined)?fromY:3;
    camera.up.set(0,1,0); // reset camera up for pipe travel
    // Destination is far away — simulate flying to a distant continent
    // Direction from pipe position determines flight direction
    var dirX=fromX,dirZ=fromZ;
    var dirLen=DANBO_WASM.len2D(dirX,dirZ);
    if(dirLen>0.1){dirX/=dirLen;dirZ/=dirLen;}else{dirX=0;dirZ=-1;}
    // Fly 400 units outward then curve back to center of new city
    _pipeEndX=0;_pipeEndZ=0;
    var midX=fromX+dirX*200;
    var midZ=fromZ+dirZ*200;
    _pipeMidX=midX;_pipeMidZ=midZ;
    // Build the transparent tube corridor — long arc through sky
    _pipeTubeGroup=new THREE.Group();
    var steps=40;
    var tubeColor=CITY_STYLES[targetStyle]?0x44FF88:0x44DD44;
    var pipeColors=[0x44DD44,0x44CCFF,0xFF8844,0xFF44DD,0xFFDD44,0xCCCCFF,0xFFAABB];
    var pColor=pipeColors[targetStyle]||tubeColor;
    var isMoonTravel=(targetStyle===5);
    if(isMoonTravel)pColor=0x6644CC;
    var tubeMat=new THREE.MeshPhongMaterial({color:pColor,transparent:true,opacity:isMoonTravel?0.15:0.25,side:THREE.DoubleSide});
    for(var i=0;i<steps;i++){
        var t=i/steps;
        // Quadratic bezier: start → mid (far away) → end (center)
        var u=1-t;
        var px=u*u*fromX+2*u*t*midX+t*t*_pipeEndX;
        var pz=u*u*fromZ+2*u*t*midZ+t*t*_pipeEndZ;
        var py=_pipeStartY+Math.sin(t*Math.PI)*60; // high arc — 60 units up
        var seg=new THREE.Mesh(new THREE.CylinderGeometry(3,3,3,10,1,true),tubeMat);
        seg.position.set(px,py,pz);
        if(i<steps-1){
            var t2=(i+1)/steps;var u2=1-t2;
            var nx=u2*u2*fromX+2*u2*t2*midX+t2*t2*_pipeEndX;
            var nz=u2*u2*fromZ+2*u2*t2*midZ+t2*t2*_pipeEndZ;
            var ny=_pipeStartY+Math.sin(t2*Math.PI)*60;
            seg.lookAt(nx,ny,nz);seg.rotateX(Math.PI/2);
        }
        _pipeTubeGroup.add(seg);
        if(i%5===0){
            var ringColor=isMoonTravel?0x8866DD:pColor;
            var ring=new THREE.Mesh(new THREE.TorusGeometry(3,0.2,8,16),new THREE.MeshBasicMaterial({color:ringColor,transparent:true,opacity:isMoonTravel?0.5:0.4}));
            ring.position.set(px,py,pz);
            if(i<steps-1){
                var t3=(i+1)/steps;var u3=1-t3;
                ring.lookAt(u3*u3*fromX+2*u3*t3*midX+t3*t3*_pipeEndX,_pipeStartY+Math.sin(t3*Math.PI)*60,u3*u3*fromZ+2*u3*t3*midZ+t3*t3*_pipeEndZ);
            }
            _pipeTubeGroup.add(ring);
        }
        // Moon travel: stars and nebula particles inside the tunnel
        if(isMoonTravel&&i%2===0){
            var starColors2=[0xFFFFFF,0xCCDDFF,0xFFCCDD,0xDDCCFF,0xAABBFF,0xFFEECC];
            for(var si=0;si<3;si++){
                var sa=Math.random()*Math.PI*2;
                var sr=0.5+Math.random()*2.5;
                var ssc=starColors2[Math.floor(Math.random()*starColors2.length)];
                var sStar=new THREE.Mesh(new THREE.SphereGeometry(0.08+Math.random()*0.15,4,3),new THREE.MeshBasicMaterial({color:ssc,transparent:true,opacity:0.7+Math.random()*0.3}));
                sStar.position.set(px+Math.cos(sa)*sr,py+Math.sin(sa)*sr,pz+(Math.random()-0.5)*2);
                _pipeTubeGroup.add(sStar);
            }
            // Nebula wisps
            if(i%6===0){
                var nebC=[0x330055,0x440033,0x220044,0x110033][Math.floor(Math.random()*4)];
                var neb=new THREE.Mesh(new THREE.SphereGeometry(2+Math.random()*2,6,4),new THREE.MeshBasicMaterial({color:nebC,transparent:true,opacity:0.15+Math.random()*0.1,side:THREE.BackSide}));
                neb.position.set(px+(Math.random()-0.5)*4,py+(Math.random()-0.5)*3,pz+(Math.random()-0.5)*4);
                _pipeTubeGroup.add(neb);
            }
        }
    }
    scene.add(_pipeTubeGroup);
    // Disable fog during travel so tube is visible
    scene.fog=null;
    // Pipe travel sound — suction entry + rushing wind + sparkle ticks
    if(sfxEnabled){
        var ctx=ensureAudio();var ct=ctx.currentTime;
        // 1) Suction entry — descending pitch "fwoop"
        var suc=ctx.createOscillator();var sucG=ctx.createGain();
        suc.type='sawtooth';suc.frequency.setValueAtTime(800,ct);suc.frequency.exponentialRampToValueAtTime(100,ct+0.4);
        sucG.gain.setValueAtTime(0.15,ct);sucG.gain.exponentialRampToValueAtTime(0.001,ct+0.5);
        suc.connect(sucG);sucG.connect(ctx.destination);suc.start(ct);suc.stop(ct+0.5);
        // 2) Rushing wind — filtered noise for 3 seconds
        var windBuf=ctx.createBuffer(1,Math.floor(ctx.sampleRate*3),ctx.sampleRate);
        var wd=windBuf.getChannelData(0);
        for(var wi=0;wi<wd.length;wi++){
            var wp=wi/wd.length;
            var env=Math.sin(wp*Math.PI); // fade in and out
            wd[wi]=(Math.random()-0.5)*0.12*env;
        }
        var windSrc=ctx.createBufferSource();windSrc.buffer=windBuf;
        var windFilt=ctx.createBiquadFilter();windFilt.type='bandpass';windFilt.frequency.value=600;windFilt.Q.value=2;
        var windG=ctx.createGain();windG.gain.value=0.2;
        windSrc.connect(windFilt);windFilt.connect(windG);windG.connect(ctx.destination);
        windSrc.start(ct+0.2);windSrc.stop(ct+3.2);
        // 3) Sparkle ticks during flight — ascending pings
        for(var ti=0;ti<8;ti++){
            var tt=ct+0.4+ti*0.35;
            var ping=ctx.createOscillator();var pingG=ctx.createGain();
            ping.type='sine';
            var pf=600+ti*150;
            ping.frequency.setValueAtTime(pf,tt);ping.frequency.exponentialRampToValueAtTime(pf*1.5,tt+0.08);
            pingG.gain.setValueAtTime(0.08,tt);pingG.gain.exponentialRampToValueAtTime(0.001,tt+0.12);
            ping.connect(pingG);pingG.connect(ctx.destination);ping.start(tt);ping.stop(tt+0.12);
        }
        // 4) Arrival pop — at end of travel
        var popTime=ct+2.8;
        var pop=ctx.createOscillator();var popG=ctx.createGain();
        pop.type='sine';pop.frequency.setValueAtTime(150,popTime);pop.frequency.exponentialRampToValueAtTime(600,popTime+0.1);pop.frequency.exponentialRampToValueAtTime(200,popTime+0.3);
        popG.gain.setValueAtTime(0.18,popTime);popG.gain.exponentialRampToValueAtTime(0.001,popTime+0.4);
        pop.connect(popG);popG.connect(ctx.destination);pop.start(popTime);pop.stop(popTime+0.4);
        // Arrival chime
        var chime1=ctx.createOscillator();var chG1=ctx.createGain();
        chime1.type='triangle';chime1.frequency.value=880;
        chG1.gain.setValueAtTime(0.1,popTime+0.1);chG1.gain.exponentialRampToValueAtTime(0.001,popTime+0.6);
        chime1.connect(chG1);chG1.connect(ctx.destination);chime1.start(popTime+0.1);chime1.stop(popTime+0.6);
        var chime2=ctx.createOscillator();var chG2=ctx.createGain();
        chime2.type='triangle';chime2.frequency.value=1320;
        chG2.gain.setValueAtTime(0.08,popTime+0.2);chG2.gain.exponentialRampToValueAtTime(0.001,popTime+0.7);
        chime2.connect(chG2);chG2.connect(ctx.destination);chime2.start(popTime+0.2);chime2.stop(popTime+0.7);
    }
}

function updatePipeTravel(){
    if(!_pipeTraveling||!playerEgg)return;
    _pipeTimer++;
    var t=_pipeTimer/_pipeDuration;
    if(t>1)t=1;
    // Smooth ease in-out
    var st=t<0.5?2*t*t:(1-Math.pow(-2*t+2,2)/2);
    // Quadratic bezier: start → mid (far away) → end (center)
    var u=1-st;
    var px=u*u*_pipeStartX+2*u*st*_pipeMidX+st*st*_pipeEndX;
    var pz=u*u*_pipeStartZ+2*u*st*_pipeMidZ+st*st*_pipeEndZ;
    var py=_pipeStartY+Math.sin(st*Math.PI)*60;
    playerEgg.mesh.position.set(px,py,pz);
    playerEgg.vx=0;playerEgg.vy=0;playerEgg.vz=0;
    playerEgg.mesh.rotation.y+=0.15;
    // Camera follows from behind and above
    var camDist=15;
    var lookAhead=Math.min(st+0.05,1);
    var lu=1-lookAhead;
    var lx=lu*lu*_pipeStartX+2*lu*lookAhead*_pipeMidX+lookAhead*lookAhead*_pipeEndX;
    var lz=lu*lu*_pipeStartZ+2*lu*lookAhead*_pipeMidZ+lookAhead*lookAhead*_pipeEndZ;
    var ly=_pipeStartY+Math.sin(lookAhead*Math.PI)*60;
    var cdx=px-lx,cdz=pz-lz;
    var cl=DANBO_WASM.len2D(cdx,cdz)||1;
    camera.position.set(px+cdx/cl*camDist,py+6,pz+cdz/cl*camDist);
    camera.lookAt(px,py,pz);
    // At 40% — rebuild city (while player is high up and can't see ground)
    if(_pipeTimer===Math.floor(_pipeDuration*0.4)){
        if(window.DANBO_CITY_DATA&&DANBO_CITY_DATA.isLoaded&&!DANBO_CITY_DATA.isLoaded(_pipeTargetStyle)){
            if(!_pipeCityLoadFailed){
                _pipeTimer--;
                return;
            }
            console.warn('Continue pipe travel with unloaded city '+_pipeTargetStyle);
        }
        _prevCityStyle=currentCityStyle;
        currentCityStyle=_pipeTargetStyle;
        clearCity();
        buildCity();
        buildPortals();
        buildCityCoins();
        buildCityChests();
        buildWarpPipes();
        addClouds();
        spawnCityNPCs();
        applyCityTheme();
        stopBGM();stopRaceBGM();
        startBGM();
    }
    // Done
    if(_pipeTimer>=_pipeDuration){
        _pipeTraveling=false;
        _pipeArrivalCooldown=60; // 1 second grace period before portal checks
        if(_pipeTubeGroup){scene.remove(_pipeTubeGroup);_pipeTubeGroup=null;}
        if(currentCityStyle===5){
            // Moon flat: spawn inside Von Braun city
            playerEgg.mesh.position.set(-200,3,0);
            playerEgg.vy=0;playerEgg.vx=0;playerEgg.vz=0;
            playerEgg.onGround=false;
            camera.position.set(-200,12,19);camera.lookAt(-200,0,0);
            camera.up.set(0,1,0);
        } else if(currentCityStyle===6){
            playerEgg.mesh.position.set(0,14,-30);
            playerEgg.vy=0;playerEgg.vx=0;playerEgg.vz=0;
            playerEgg.onGround=false;
            camera.position.set(0,22,-16);camera.lookAt(0,8,-30);
            camera.up.set(0,1,0);
        } else {
            playerEgg.mesh.position.set(0,15,0);
            playerEgg.vy=0;playerEgg.vx=0;playerEgg.vz=0;
            playerEgg.onGround=false;
            camera.position.set(0,12,19);camera.lookAt(0,0,5);
            camera.up.set(0,1,0);
        }
        for(var i=0;i<warpPipeMeshes.length;i++)warpPipeMeshes[i]._cooldown=true;
        // SOTN area name reveal after pipe travel
        _showCityAreaName(currentCityStyle);
    }
}

function switchCity(targetStyle){
    if(targetStyle===currentCityStyle)return;
    if(window.DANBO_CITY_DATA&&DANBO_CITY_DATA.ensureCityLoaded&&DANBO_CITY_DATA.isLoaded&&!DANBO_CITY_DATA.isLoaded(targetStyle)){
        _ensureCityDataLoaded(targetStyle,function(ok){if(ok)switchCity(targetStyle);});
        return;
    }
    if(typeof _resetViewMode==='function')_resetViewMode();
    _prevCityStyle=currentCityStyle;
    currentCityStyle=targetStyle;
    _cameraZoom=1.0; // reset zoom on city switch
    // Remember player was near a pipe — spawn at center of new city
    clearCity();
    buildCity();
    buildPortals();
    buildCityCoins();
    buildCityChests();
    buildWarpPipes();
    addClouds();
    spawnCityNPCs();
    applyCityTheme();
    // Stop old BGM, start city BGM
    stopBGM();stopRaceBGM();
    startBGM();
    // Spawn player at center
    if(playerEgg){scene.remove(playerEgg.mesh);var idx=allEggs.indexOf(playerEgg);if(idx!==-1)allEggs.splice(idx,1);playerEgg=null;}
    var skin=CHARACTERS[selectedChar];
    playerEgg=createEgg(0,0,skin.color,skin.accent,true,undefined,skin.type);
    playerEgg.finished=false;playerEgg.alive=true;
    if(currentCityStyle===5){
        // Moon flat: spawn in battlefield area
        playerEgg.mesh.position.set(50,0.5,0);
        camera.position.set(50,12,19);camera.lookAt(50,0,0);
        camera.up.set(0,1,0);
    } else if(currentCityStyle===6){
        // Sakura: spawn near shrine area (no fountain in center)
        playerEgg.mesh.position.set(0,14,-30);
        camera.position.set(0,22,-16);camera.lookAt(0,8,-30);
        camera.up.set(0,1,0);
    } else if(currentCityStyle===7){
        // Snow Village: spawn on island surface (y=3)
        playerEgg.mesh.position.set(0,6,0);
        camera.position.set(0,12,14);camera.lookAt(0,0,0);
        camera.up.set(0,1,0);
    } else {
        playerEgg.mesh.position.set(0,15,0);
        camera.position.set(0,12,19);camera.lookAt(0,0,5);
        camera.up.set(0,1,0);
    }
    // SOTN area name reveal
    _showCityAreaName(currentCityStyle);
}

// ---- NPC eggs wandering city ----
function spawnCityNPCs() {
    var _npcCityLayout=(typeof _getCityLayout==='function')?_getCityLayout(currentCityStyle):null;
    var _npcCityData=(typeof _getCityNpc==='function')?_getCityNpc(currentCityStyle):null;
    var npcCount=(_npcCityData&&_npcCityData.count!==undefined)?_npcCityData.count:((_npcCityLayout&&_npcCityLayout.npcCount!==undefined)?_npcCityLayout.npcCount:(currentCityStyle===5?24:(currentCityStyle===6?48:36)));
    for(let i=0;i<npcCount;i++){
        var nx2,nz2,spawnY=0;
        if(currentCityStyle===5){
            // Moon: half NPCs inside Von Braun city, half on battlefield
            if(i<12){
                // Inside Von Braun (local coords scaled by 8, center at -200,0)
                var nAngle=Math.random()*Math.PI*2;
                var nRad=Math.random()*120; // within shield radius 160
                nx2=-200+Math.cos(nAngle)*nRad;
                nz2=Math.sin(nAngle)*nRad;
            } else {
                // Battlefield side
                nx2=30+Math.random()*300;
                nz2=(Math.random()-0.5)*400;
            }
        } else if(currentCityStyle===6){
            // Sakura: spawn on plateaus (x<-10 or x>10), on paths
            var _onL=Math.random()<0.5;
            nx2=_onL?(-15-Math.random()*30):(15+Math.random()*30);
            nz2=(Math.random()-0.5)*180;
            spawnY=8;
        } else {
            // Avoid fountain area (center, radius 10)
            do{
                nx2=(Math.random()-0.5)*80;nz2=10+(Math.random())*60;
            }while(DANBO_WASM.len2D(nx2,nz2)<12);
        }
        const col=AI_COLORS[i%AI_COLORS.length];
        // Weighted character selection: more Zangief
        var _npcCharIdx=i%CHARACTERS.length;
        if(currentCityStyle===6){
            var _wr=Math.random();
            if(_wr<0.25)_npcCharIdx=6; // 25% Zangief (bear)
            else _npcCharIdx=Math.floor(Math.random()*CHARACTERS.length);
        }
        const npc=createEgg(nx2,nz2,col,AI_COLORS[(i+4)%AI_COLORS.length],false,undefined,CHARACTERS[_npcCharIdx].type);
        if(spawnY>0)npc.mesh.position.y=spawnY+0.5;
        npc.cityNPC=true;
        npc.aiTargetX=nx2; npc.aiTargetZ=nz2;
        npc.aiWanderTimer=60+Math.random()*120;
        cityNPCs.push(npc);
    }
}

// ---- Clouds (can stand on them) ----
var cityCloudPlatforms=[]; // {group, x, z, y, hw, hd}
var _cloudWorldPipe=null; // moon pipe in cloud world
function _makeCloud(cx,cy,cz,minParts,maxParts,minS,maxS){
    var cg2=new THREE.SphereGeometry(1,8,6);
    var cm2=toon(0xffffff,{transparent:true,opacity:0.85});
    var g=new THREE.Group();
    var maxW=0,maxD=0,maxTop=0,maxSc=0;
    var numParts=minParts+Math.floor(Math.random()*(maxParts-minParts+1));
    for(var j=0;j<numParts;j++){
        var s=minS+Math.random()*(maxS-minS);
        var m=new THREE.Mesh(cg2,cm2);
        m.scale.set(s,s*0.45,s*0.7);
        m.castShadow=true;m.receiveShadow=true;
        var pz=Math.random()*1.5-0.75;
        m.position.set(j*2.5,0,pz);
        g.add(m);
        if(j*2.5+s>maxW)maxW=j*2.5+s;
        var partD=Math.abs(pz)+s*0.7;
        if(partD>maxD)maxD=partD;
        if(s*0.45>maxTop)maxTop=s*0.45;
        if(s>maxSc)maxSc=s;
    }
    var halfW=maxW*0.5;
    for(var ci2=0;ci2<g.children.length;ci2++){g.children[ci2].position.x-=halfW;}
    g.position.set(cx,cy,cz);
    scene.add(g);
    // Wider collision area than visual to prevent falling through edges
    var cl={group:g,x:cx,z:cz,y:cy,hw:halfW+maxSc+1,hd:Math.max(maxD,maxSc*0.7,halfW*0.6)+1,top:maxTop,_origScaleY:1};
    cityCloudPlatforms.push(cl);
    return cl;
}
function addClouds(){
    // No clouds on moon, sakura, or snow village
    if(currentCityStyle===5||currentCityStyle===6||currentCityStyle===7)return;
    // Cloud above each building roof — reachable with charge jump
    var roofClouds=[];
    for(var bi=0;bi<cityColliders.length;bi++){
        var c=cityColliders[bi];
        var roofTop=(c.h||6)+(c.roofH||3);
        var rc=_makeCloud(c.x,roofTop+2,c.z,2,3,2,4);
        roofClouds.push(rc);
    }
    // ---- Staircase clouds from roof level to cloud world ----
    // Tallest roof is about y=19, cloud world at y=42
    // Need steps every ~4 units (easy charge jump) from y=22 to y=40
    // Place staircase columns near several buildings
    var stairPositions=[];
    // First staircase near center (close to Babel tower at 12,0)
    stairPositions.push({x:8,z:8});
    for(var _si=0;_si<5;_si++){
        stairPositions.push({x:(Math.random()-0.5)*80,z:(Math.random()-0.5)*80});
    }
    window._stairPositions=stairPositions;
    for(var si=0;si<stairPositions.length;si++){
        var sp=stairPositions[si];
        var baseY=22; // just above typical roof clouds
        var steps=5; // 5 steps to reach cloud world
        for(var st=0;st<steps;st++){
            var sy=baseY+st*4;
            var sx=sp.x+(Math.random()-0.5)*8;
            var sz=sp.z+(Math.random()-0.5)*8;
            _makeCloud(sx,sy,sz,2,3,2,4);
        }
    }
    // ---- Cloud World (y=46) — large platform layer ----
    var cwY=46;
    // Central HUGE cloud platform — the highest cloud, moon pipe sits here
    // No other clouds should overlap this one
    _makeCloud(0,cwY,0,8,10,14,20);
    // Ring of cloud platforms around center — kept away from center (r>35) and lower
    for(var ai=0;ai<8;ai++){
        var ang=ai/8*Math.PI*2;
        var r=38+Math.random()*10;
        _makeCloud(Math.cos(ang)*r,cwY-4+Math.random()*2,Math.sin(ang)*r,3,4,3,5);
    }
    // Outer ring — even further
    for(var oi=0;oi<6;oi++){
        var oa=oi/6*Math.PI*2;
        _makeCloud(Math.cos(oa)*60,cwY-3+Math.random()*2,Math.sin(oa)*60,3,4,3,5);
    }
    // ---- Moving clouds (platforms that drift back and forth) ----
    // Keep moving clouds away from center (r>30)
    for(var mi=0;mi<8;mi++){
        var ma=mi/8*Math.PI*2;
        var mr=30+Math.random()*20;
        var mx=Math.cos(ma)*mr;
        var mz=Math.sin(ma)*mr;
        var my=cwY-4+Math.random()*3;
        var mc=_makeCloud(mx,my,mz,2,3,3,5);
        // Mark as moving cloud
        mc.moving=true;
        mc.moveAxis=Math.random()<0.5?'x':'z'; // drift direction
        mc.moveSpeed=0.01+Math.random()*0.02;
        mc.moveRange=8+Math.random()*12;
        mc.movePhase=Math.random()*Math.PI*2;
        mc.baseX=mx;
        mc.baseZ=mz;
    }
    // Some moving clouds in the staircase zone too
    for(var mi2=0;mi2<4;mi2++){
        var mx2=(Math.random()-0.5)*60;
        var mz2=(Math.random()-0.5)*60;
        var my2=26+Math.random()*12;
        var mc2=_makeCloud(mx2,my2,mz2,2,3,2,4);
        mc2.moving=true;
        mc2.moveAxis=Math.random()<0.5?'x':'z';
        mc2.moveSpeed=0.008+Math.random()*0.015;
        mc2.moveRange=6+Math.random()*10;
        mc2.movePhase=Math.random()*Math.PI*2;
        mc2.baseX=mx2;
        mc2.baseZ=mz2;
    }
    // Random decorative clouds (high, not for standing)
    for(var di=0;di<10;di++){
        var dx2=(Math.random()-0.5)*200;
        var dz2=(Math.random()-0.5)*200;
        var dy2=50+Math.random()*20;
        _makeCloud(dx2,dy2,dz2,3,4,3,6);
    }
    // Coins in cloud world
    var coinGeo=new THREE.CylinderGeometry(0.4,0.4,0.1,12);
    var coinMat=toon(0xFFDD44,{emissive:0xFFAA00,emissiveIntensity:0.3});
    for(var cci=0;cci<15;cci++){
        var ca=cci/15*Math.PI*2;
        var cr=8+Math.random()*20;
        var ccY=cwY+2+Math.random()*2;
        var coin=new THREE.Mesh(coinGeo,coinMat);
        coin.position.set(Math.cos(ca)*cr,ccY,Math.sin(ca)*cr);
        coin.rotation.x=Math.PI/2;
        scene.add(coin);
        cityCoins.push({mesh:coin,collected:false,baseY:ccY,inScene:true});
    }
    // Cloud-world treasure chests (10) — sit on the cloud platforms
    for(var cwc=0;cwc<CHEST_CLOUD_TOTAL;cwc++){
        var cwa=Math.random()*Math.PI*2, cwr=6+Math.random()*22;
        var cgx=Math.cos(cwa)*cwr, cgz=Math.sin(cwa)*cwr, cgy=cwY+0.6;
        _spawnChest('cloud_'+cwc,'cloud',cgx,cgy,cgz,Math.random()*Math.PI*2,_tierFromRoll(Math.random()),true);
    }
    if(!window._cityAnimals)window._cityAnimals=[];
    for(var _chi=0;_chi<8;_chi++){
        var cg=new THREE.Group();
        cg.scale.set(3,3,3); // big enough to see in cloud world
        // Round body (chubby)
        var cbody=new THREE.Mesh(new THREE.SphereGeometry(0.3,8,6),toon(0xFFDDCC));
        cbody.scale.set(1,0.9,0.8);cbody.position.y=0;cg.add(cbody);
        // Head
        var chead=new THREE.Mesh(new THREE.SphereGeometry(0.22,8,6),toon(0xFFDDCC));
        chead.position.set(0,0.35,0.05);cg.add(chead);
        // Curly golden hair
        for(var _chi2=0;_chi2<6;_chi2++){
            var cha=_chi2/6*Math.PI*2;
            var curl=new THREE.Mesh(new THREE.SphereGeometry(0.07,4,3),toon(0xFFDD44));
            curl.position.set(Math.cos(cha)*0.15,0.5+Math.sin(cha)*0.05,Math.sin(cha)*0.12);
            cg.add(curl);
        }
        // Eyes (cute big)
        [-1,1].forEach(function(s){
            var ceye=new THREE.Mesh(new THREE.SphereGeometry(0.05,4,3),toon(0x4488CC));
            ceye.position.set(s*0.1,0.38,0.2);cg.add(ceye);
            var cshine=new THREE.Mesh(new THREE.SphereGeometry(0.02,3,2),toon(0xFFFFFF));
            cshine.position.set(s*0.1+s*0.02,0.4,0.22);cg.add(cshine);
        });
        // Smile
        var csmile=new THREE.Mesh(new THREE.TorusGeometry(0.05,0.012,4,8,Math.PI),toon(0xFF8888));
        csmile.position.set(0,0.3,0.2);csmile.rotation.x=Math.PI;cg.add(csmile);
        // Blush
        [-1,1].forEach(function(s){
            var cblush=new THREE.Mesh(new THREE.SphereGeometry(0.04,4,3),toon(0xFF9999,{transparent:true,opacity:0.4}));
            cblush.position.set(s*0.15,0.32,0.18);cg.add(cblush);
        });
        // Wings (feathery, translucent white)
        [-1,1].forEach(function(s){
            var wing=new THREE.Group();
            for(var fi=0;fi<4;fi++){
                var feather=new THREE.Mesh(new THREE.SphereGeometry(0.12,6,4),
                    toon(0xFFFFFF,{transparent:true,opacity:0.7}));
                feather.scale.set(0.4,0.15,1);
                feather.position.set(s*(0.15+fi*0.08),0.05-fi*0.03,-fi*0.06);
                feather.rotation.z=s*(0.2+fi*0.15);
                wing.add(feather);
            }
            wing.position.set(s*0.2,0.15,-0.1);
            wing.userData._side=s;
            cg.add(wing);
        });
        // Halo
        var halo=new THREE.Mesh(new THREE.TorusGeometry(0.15,0.02,6,16),
            toon(0xFFDD44,{emissive:0xFFAA00,emissiveIntensity:0.5}));
        halo.position.set(0,0.6,0.05);halo.rotation.x=Math.PI/2;cg.add(halo);
        // Small chubby arms
        [-1,1].forEach(function(s){
            var carm=new THREE.Mesh(new THREE.SphereGeometry(0.06,4,3),toon(0xFFDDCC));
            carm.position.set(s*0.3,0.05,0.1);carm.scale.set(0.7,1,0.7);cg.add(carm);
        });
        var ca2=_chi/8*Math.PI*2;
        var cr2=15+Math.random()*30;
        var cx2=Math.cos(ca2)*cr2, cz2=Math.sin(ca2)*cr2;
        var cy2=cwY+3+Math.random()*6;
        cg.position.set(cx2,cy2,cz2);
        scene.add(cg);
        window._cityAnimals.push({group:cg,type:'cherub',x:cx2,y:cy2,z:cz2,
            vx:Math.sin(ca2+Math.PI/2)*0.04,vy:0,vz:Math.cos(ca2+Math.PI/2)*0.04,
            state:'fly',stateTimer:200+Math.floor(Math.random()*200),
            flapPhase:Math.random()*Math.PI*2,baseY:cy2,_inScene:true});
    }
    // ---- Moon Warp Pipe in cloud world center ----
    // Place pipe on TOP of central cloud (cloudTop ≈ cwY + maxScale*0.45 ≈ cwY+9)
    var _moonPipeY=cwY+8;
    _buildCloudWorldMoonPipe(0,_moonPipeY,0);
}
function _buildCloudWorldMoonPipe(px,py,pz){
    var pColor=0xCCCCFF;
    var g=new THREE.Group();
    var pMat=new THREE.MeshPhongMaterial({color:pColor,transparent:true,opacity:0.4,side:THREE.DoubleSide});
    var tube=new THREE.Mesh(new THREE.CylinderGeometry(2.5,2.5,6,16,1,true),pMat);
    tube.position.y=3;g.add(tube);
    var rim=new THREE.Mesh(new THREE.TorusGeometry(2.5,0.35,8,16),toon(pColor,{emissive:pColor,emissiveIntensity:0.5}));
    rim.position.y=6;rim.rotation.x=Math.PI/2;g.add(rim);
    var rim2=new THREE.Mesh(new THREE.TorusGeometry(2.5,0.3,8,16),toon(pColor,{emissive:pColor,emissiveIntensity:0.3}));
    rim2.position.y=0.1;rim2.rotation.x=Math.PI/2;g.add(rim2);
    // Moon icon on top
    var moonSphere=new THREE.Mesh(new THREE.SphereGeometry(1.2,12,8),toon(0xEEEECC,{emissive:0xAAAA88,emissiveIntensity:0.4}));
    moonSphere.position.y=8;g.add(moonSphere);
    // Craters
    for(var ci=0;ci<5;ci++){
        var ca=ci/5*Math.PI*2;
        var crater=new THREE.Mesh(new THREE.SphereGeometry(0.2,6,4),toon(0xBBBBAA));
        crater.position.set(Math.cos(ca)*0.8,8+Math.sin(ca)*0.6,Math.sin(ca)*0.5);
        crater.scale.set(1,0.4,1);
        g.add(crater);
    }
    // Glow orbs inside
    var sMat=new THREE.MeshBasicMaterial({color:pColor,transparent:true,opacity:0.5});
    for(var si=0;si<8;si++){
        var sp=new THREE.Mesh(new THREE.SphereGeometry(0.3,6,4),sMat);
        var a=si/8*Math.PI*2;
        sp.position.set(Math.cos(a)*1.5,0.5+si*0.6,Math.sin(a)*1.5);
        g.add(sp);
    }
    // Label
    var canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;
    var ctx2=canvas.getContext('2d');
    ctx2.fillStyle='rgba(0,0,0,0.6)';ctx2.fillRect(0,0,256,64);
    ctx2.fillStyle='#fff';ctx2.font='bold 28px sans-serif';ctx2.textAlign='center';
    var moonName=CITY_STYLES[5]?CITY_STYLES[5].name:'Moon';
    ctx2.fillText(moonName,128,42);
    var tex=new THREE.CanvasTexture(canvas);
    var sign=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true}));
    sign.scale.set(4,1,1);sign.position.y=10;
    g.add(sign);
    g.position.set(px,py,pz);
    scene.add(g);
    _cloudWorldPipe={group:g,x:px,z:pz,y:py,targetStyle:5,_cooldown:false};
}
addClouds();

// ---- Tower of Babel (Ziggurat) ----
function playRumbleSound(){
    if(!sfxEnabled)return;
    var ctx=ensureAudio();if(!ctx)return;
    var dur=3.0;
    var bufSize=Math.floor(ctx.sampleRate*dur);
    var buf=ctx.createBuffer(1,bufSize,ctx.sampleRate);
    var data=buf.getChannelData(0);
    for(var i=0;i<bufSize;i++){
        var t=i/ctx.sampleRate;
        // Deep rumble + mid-range cracking for audibility on all speakers
        data[i]=(Math.random()-0.5)*0.35*Math.sin(t*40)*Math.exp(-t*0.3)
            +Math.sin(t*55)*0.15*Math.exp(-t*0.4)
            +Math.sin(t*30+Math.sin(t*7)*3)*0.12*Math.exp(-t*0.35)
            +(Math.random()-0.5)*0.2*Math.exp(-t*0.5)
            +Math.sin(t*180+Math.random()*0.5)*0.08*Math.exp(-t*0.6)
            +Math.sin(t*110)*0.1*Math.exp(-t*0.45);
    }
    var src=ctx.createBufferSource();src.buffer=buf;
    var g=ctx.createGain();g.gain.setValueAtTime(0.5,ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.6,ctx.currentTime+0.5);
    g.gain.exponentialRampToValueAtTime(0.01,ctx.currentTime+dur);
    // Wider low-pass to let mid-range through
    var filt=ctx.createBiquadFilter();filt.type='lowpass';filt.frequency.value=350;filt.Q.value=0.7;
    src.connect(filt);filt.connect(g);g.connect(ctx.destination);
    src.start();src.stop(ctx.currentTime+dur);
}

function _buildBabylonTower(){
    if(_babylonTower)return;
    var g=new THREE.Group();
    // Ziggurat — 12 stacked layers, top reaches 5 layers above cloud world
    var layers=12;
    var baseW=16, baseD=16, layerH=6.4;
    var colors=[0xD4A460,0xC8963C,0xBB8833,0xAA7722,0x996611,0x885500,0x774400,0x663300];
    for(var i=0;i<layers;i++){
        var w=baseW-i*1.5;
        var d=baseD-i*1.5;
        var geo=new THREE.BoxGeometry(w,layerH,d);
        var mat=toon(colors[i]);
        var mesh=new THREE.Mesh(geo,mat);
        mesh.position.y=i*layerH+layerH/2;
        mesh.castShadow=true;mesh.receiveShadow=true;
        g.add(mesh);
        // Decorative ledge
        var ledge=new THREE.Mesh(new THREE.BoxGeometry(w+0.6,0.4,d+0.6),toon(colors[Math.max(0,i-1)]));
        ledge.position.y=i*layerH+layerH;
        g.add(ledge);
    }
    var topY=layers*layerH; // =42
    // Archway at top
    var topW=baseW-layers*1.5+1;
    var arch1=new THREE.Mesh(new THREE.BoxGeometry(0.8,4,0.8),toon(0x996611));
    arch1.position.set(-topW/3,topY+2,0);g.add(arch1);
    var arch2=new THREE.Mesh(new THREE.BoxGeometry(0.8,4,0.8),toon(0x996611));
    arch2.position.set(topW/3,topY+2,0);g.add(arch2);
    var archTop=new THREE.Mesh(new THREE.BoxGeometry(topW*0.8,0.8,1.2),toon(0x774400));
    archTop.position.set(0,topY+4,0);g.add(archTop);
    // Pipe elevator inside — launches player to cloud world (y=44)
    var pipeMat=new THREE.MeshPhongMaterial({color:0x44FF88,transparent:true,opacity:0.5,side:THREE.DoubleSide});
    var pipeBody=new THREE.Mesh(new THREE.CylinderGeometry(1.8,1.8,topY+2,16,1,true),pipeMat);
    pipeBody.position.y=(topY+2)/2;g.add(pipeBody);
    var pipeRim=new THREE.Mesh(new THREE.TorusGeometry(1.8,0.3,8,16),toon(0x44FF88,{emissive:0x22AA44,emissiveIntensity:0.4}));
    pipeRim.position.y=0.2;pipeRim.rotation.x=Math.PI/2;g.add(pipeRim);
    var pipeRimTop=new THREE.Mesh(new THREE.TorusGeometry(1.8,0.3,8,16),toon(0x44FF88,{emissive:0x22AA44,emissiveIntensity:0.4}));
    pipeRimTop.position.y=topY+1;pipeRimTop.rotation.x=Math.PI/2;g.add(pipeRimTop);
    // Glowing orbs spiraling up inside pipe
    var orbMat=new THREE.MeshBasicMaterial({color:0x88FFAA,transparent:true,opacity:0.6});
    for(var oi=0;oi<14;oi++){
        var orb=new THREE.Mesh(new THREE.SphereGeometry(0.25,6,4),orbMat);
        var oa=oi/14*Math.PI*2*3;
        orb.position.set(Math.cos(oa)*1.0,oi*3+1,Math.sin(oa)*1.0);
        g.add(orb);
    }
    // Arrows pointing up
    var arrowMat=toon(0xFFFF44,{emissive:0xFFAA00,emissiveIntensity:0.5});
    for(var ai=0;ai<5;ai++){
        var arrow=new THREE.Mesh(new THREE.ConeGeometry(0.6,1.2,6),arrowMat);
        arrow.position.set(0,4+ai*8,0);
        g.add(arrow);
    }
    // Label sign
    var canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;
    var ctx2=canvas.getContext('2d');
    ctx2.fillStyle='rgba(0,0,0,0.6)';ctx2.fillRect(0,0,256,64);
    ctx2.fillStyle='#FFD700';ctx2.font='bold 22px sans-serif';ctx2.textAlign='center';
    var towerLabel={zhs:'\u5DF4\u522B\u5854 \u2191 \u4E91\u4E2D\u754C',zht:'\u5DF4\u5225\u5854 \u2191 \u96F2\u4E2D\u754C',ja:'\u30D0\u30D9\u30EB\u306E\u5854 \u2191 \u96F2\u4E2D\u754C',en:'Babel \u2191 Cloud Realm'};
    ctx2.fillText(towerLabel[_langCode]||towerLabel.en,128,42);
    var tex=new THREE.CanvasTexture(canvas);
    var sign=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true}));
    sign.scale.set(5,1.2,1);sign.position.set(0,topY+6,0);
    g.add(sign);
    // Doors on all 4 faces (N/S/E/W) to avoid being blocked
    var doorDirs=[{dx:0,dz:1},{dx:0,dz:-1},{dx:1,dz:0},{dx:-1,dz:0}];
    for(var di=0;di<4;di++){
        var dd=doorDirs[di];
        var dox=dd.dx*(baseD/2+0.1), doz=dd.dz*(baseD/2+0.1);
        var dFrame=new THREE.Mesh(new THREE.BoxGeometry(dd.dx===0?3.5:0.5,5,dd.dz===0?3.5:0.5),toon(0x664400));
        dFrame.position.set(dox,2.5,doz);g.add(dFrame);
        var dInner=new THREE.Mesh(new THREE.BoxGeometry(dd.dx===0?2.5:0.3,4,dd.dz===0?2.5:0.3),toon(0x332200));
        dInner.position.set(dox,2,doz);g.add(dInner);
        var dGlow=new THREE.Mesh(new THREE.PlaneGeometry(2,3.5),new THREE.MeshBasicMaterial({color:0x44FF88,transparent:true,opacity:0.3,side:THREE.DoubleSide}));
        dGlow.position.set(dox,2,doz);
        if(dd.dx!==0)dGlow.rotation.y=Math.PI/2;
        g.add(dGlow);
    }
    // Position on edge of the big cloud — tower top is ~5 units above cloud, offset from moon pipe
    var towerX, towerZ;
    towerX=12;
    towerZ=0;
    g.position.set(towerX,_babylonRiseY,towerZ);
    scene.add(g);
    _babylonTower={group:g,x:towerX,z:towerZ,pipeX:towerX,pipeZ:towerZ,topY:topY,baseW:baseW,baseD:baseD,_collidersAdded:false};
    // Fixed exit cloud platform at tower top — large enough to jump onto from rooftops
    _makeCloud(towerX,topY+1,towerZ,3,4,3,4);
    // Add bridge clouds from tower top down to the big cloud platform
    for(var bci=0;bci<5;bci++){
        var bcx=towerX-bci*2.5;
        var bcz=towerZ+(Math.random()-0.5)*6;
        var bcy=topY-bci*1.5;
        _makeCloud(bcx,bcy,bcz,2,3,2,4);
    }
}

function _triggerBabylonEvent(){
    if(_babylonTriggered)return;
    if(currentCityStyle===5)return; // not on moon
    if(typeof Explorer!=='undefined')Explorer.discoverHidden('babel_tower','\u5DF4\u522B\u5854');
    _babylonTriggered=true;
    _earthquakeTimer=180; // 3 seconds at 60fps
    _earthquakeIntensity=0.5;
    _babylonRising=true;
    _babylonRiseY=-52;
    playRumbleSound();
    _buildBabylonTower();
}
