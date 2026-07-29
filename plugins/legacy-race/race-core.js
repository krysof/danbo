// race-core.js — Legacy race runtime loaded by plugins/legacy-race
// Source moved from js/race.js so race minigames live under plugins/.
// race.js — DANBO World
// ============================================================
//  RACE TRACK SYSTEM
// ============================================================
const raceGroup = new THREE.Group();
raceGroup.visible = false;
scene.add(raceGroup);
const obstacleObjects = [];
const raceCoins = [];
const TRACK_W = (window.DANBO_MINIGAME_WASM&&DANBO_MINIGAME_WASM.race)?DANBO_MINIGAME_WASM.race.trackWidth():RACE_CONFIG.trackWidth;
let trackSegments = [];

function clearRace() {
    while(raceGroup.children.length){
        const c=raceGroup.children[0]; raceGroup.remove(c);
        c.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});
    }
    obstacleObjects.length=0;
    for(var rc of raceCoins) raceGroup.remove(rc.mesh);
    raceCoins.length=0;
    // Remove race eggs
    for(const e of allEggs) if(!e.cityNPC) scene.remove(e.mesh);
    const keep=allEggs.filter(e=>e.cityNPC);
    allEggs.length=0; allEggs.push(...keep);
    playerEgg=null;
    _jumpCharging=false;_jumpCharge=0;if(_jumpChargeBar){scene.remove(_jumpChargeBar);_jumpChargeBar=null;}
    if(_sprintBar){scene.remove(_sprintBar);_sprintBar=null;}_sprintCharge=0;_ascendSmoke=false;
}

function getSegAt(z){for(var s of trackSegments)if(z>=s.startZ&&z<s.endZ)return s;return trackSegments[trackSegments.length-1];}
function getHW(z){const s=getSegAt(z);return s?s.width:TRACK_W;}
function getFloorY(z,x){
    const s=getSegAt(z);
    if(!s) return 0;
    var rw=window.DANBO_MINIGAME_WASM&&DANBO_MINIGAME_WASM.race;
    if(rw&&typeof rw.floorY==='function')return rw.floorY(s,z);
    if(s.type==='platforms') return -100; // no floor — must land on moving platforms
    if(s.type==='ramp'){const t=(z-s.startZ)/(s.endZ-s.startZ);return s.startY+t*(s.endY-s.startY);}
    return s.floorY||0;
}

const FLOOR_THEMES=RACE_CONFIG.floorThemes;

function buildRaceTrack(ri){
    clearRace();
    const segs=[]; let cz=0, curY=0;
    const theme=FLOOR_THEMES[ri%FLOOR_THEMES.length];
    function add(len,type,o={}){
        const seg={startZ:cz,endZ:cz+len,type,width:o.width||TRACK_W,floorY:curY,startY:curY,endY:curY,...o};
        if(type==='ramp'){seg.startY=curY;seg.endY=o.endY!==undefined?o.endY:curY;curY=seg.endY;}
        segs.push(seg); cz+=len;
    }

    if(ri===0){
        add(22,'flat');add(20,'spinners',{count:3});add(8,'flat');
        add(12,'ramp',{endY:3});add(16,'platforms',{count:4});add(12,'ramp',{endY:0});
        add(18,'hammers',{count:3});add(10,'flat');
        add(14,'conveyor',{count:3});add(8,'flat');
        add(16,'rollers',{count:2});add(10,'flat');
        add(8,'narrow',{width:5.5});add(16,'bumpers',{count:6});
        add(20,'pendulums',{count:3});add(10,'flat');
        add(14,'fallingBlocks',{count:6});add(12,'flat');
        // Track 0 decorations — Carnival / Crazy Course
        var _d0Z=0;for(var _di=0;_di<segs.length;_di++) _d0Z=Math.max(_d0Z,segs[_di].endZ);
        for(var _ti=0;_ti<15;_ti++){var _tz=_d0Z*(_ti+0.5)/15,_side=(_ti%2===0?-1:1);
            // Carnival tent triangles (colored cones along sides)
            var _tentC=[0xFF4444,0x44FF44,0x4444FF,0xFFFF00,0xFF44FF][_ti%5];
            var _tent=new THREE.Mesh(new THREE.ConeGeometry(1.5,3,4),toon(_tentC,{transparent:true,opacity:0.7}));
            _tent.position.set(_side*(TRACK_W+4),2,-_tz); raceGroup.add(_tent);
        }
        for(var _li=0;_li<10;_li++){var _lz=_d0Z*(_li+0.5)/10;
            // Spinning disco lights (emissive spheres)
            var _dcol=[0xFF00FF,0x00FFFF,0xFFFF00,0xFF8800,0x00FF88][_li%5];
            var _disco=new THREE.Mesh(new THREE.SphereGeometry(0.4,8,6),toon(_dcol,{emissive:_dcol,emissiveIntensity:0.8}));
            _disco.position.set((_li%2===0?-1:1)*(TRACK_W+2),5,-_lz); raceGroup.add(_disco);
        }
    } else if(ri===1){
        add(18,'flat');add(22,'spinners',{count:4});add(6,'flat');
        add(14,'ramp',{endY:4});add(20,'platforms',{count:6});add(14,'ramp',{endY:0});
        add(22,'hammers',{count:5});add(8,'flat');
        add(18,'conveyor',{count:5});add(6,'flat');
        add(20,'pendulums',{count:4});add(8,'flat');
        add(10,'narrow',{width:5});add(20,'bumpers',{count:10});
        add(18,'rollers',{count:3});add(8,'flat');
        add(16,'fallingBlocks',{count:8});add(10,'flat');
        // Track 1 decorations — Hammer Storm / Anvils & Sparks
        var _d1Z=0;for(var _di=0;_di<segs.length;_di++) _d1Z=Math.max(_d1Z,segs[_di].endZ);
        for(var _ai=0;_ai<12;_ai++){var _az=_d1Z*(_ai+0.5)/12,_as=(_ai%2===0?-1:1);
            // Anvil decorations (dark box + trapezoid top)
            var _anvBase=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.6,1.2),toon(0x444444));
            _anvBase.position.set(_as*(TRACK_W+4),0.3,-_az); raceGroup.add(_anvBase);
            var _anvTop=new THREE.Mesh(new THREE.BoxGeometry(1.6,0.4,1.4),toon(0x555555));
            _anvTop.position.set(_as*(TRACK_W+4),0.8,-_az); raceGroup.add(_anvTop);
        }
        for(var _si=0;_si<16;_si++){var _sz=_d1Z*Math.random();
            // Sparks (small yellow emissive spheres)
            var _spark=new THREE.Mesh(new THREE.SphereGeometry(0.15,4,4),toon(0xFFDD00,{emissive:0xFFAA00,emissiveIntensity:0.9}));
            _spark.position.set((Math.random()-0.5)*(TRACK_W+6)*2,0.5+Math.random()*3,-_sz); raceGroup.add(_spark);
        }
        for(var _gi=0;_gi<6;_gi++){var _gz=_d1Z*(_gi+0.5)/6,_gs=(_gi%2===0?-1:1);
            // Iron girder frames (box outlines)
            var _gird=new THREE.Mesh(new THREE.BoxGeometry(0.2,4,0.2),toon(0x777777));
            _gird.position.set(_gs*(TRACK_W+6),2,-_gz); raceGroup.add(_gird);
            var _gTop=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.2,4),toon(0x777777));
            _gTop.position.set(_gs*(TRACK_W+6),4,-_gz); raceGroup.add(_gTop);
        }
    } else if(ri===2){
        add(14,'flat');add(24,'spinners',{count:5});add(6,'flat');
        add(16,'ramp',{endY:5});add(24,'platforms',{count:8});add(16,'ramp',{endY:0});
        add(24,'hammers',{count:6});add(6,'flat');
        add(20,'conveyor',{count:6});add(6,'flat');
        add(22,'pendulums',{count:5});add(6,'flat');
        add(8,'narrow',{width:4.5});add(22,'bumpers',{count:12});
        add(20,'rollers',{count:4});add(6,'flat');
        add(20,'fallingBlocks',{count:10});add(10,'flat');
        // Track 2 decorations — Extreme / Warning signs & danger tape
        var _d2Z=0;for(var _di=0;_di<segs.length;_di++) _d2Z=Math.max(_d2Z,segs[_di].endZ);
        for(var _wi=0;_wi<12;_wi++){var _wz=_d2Z*(_wi+0.5)/12,_ws=(_wi%2===0?-1:1);
            // Warning signs (yellow+black striped planes)
            var _sign=new THREE.Mesh(new THREE.PlaneGeometry(2,2),toon(0xFFCC00,{side:THREE.DoubleSide}));
            _sign.position.set(_ws*(TRACK_W+4),2.5,-_wz); _sign.rotation.y=_ws>0?-Math.PI/6:Math.PI/6; raceGroup.add(_sign);
            var _stripe=new THREE.Mesh(new THREE.PlaneGeometry(2,0.4),toon(0x222222,{side:THREE.DoubleSide}));
            _stripe.position.set(_ws*(TRACK_W+4),2.5,-_wz+0.01); _stripe.rotation.y=_ws>0?-Math.PI/6:Math.PI/6; raceGroup.add(_stripe);
        }
        for(var _ri2=0;_ri2<10;_ri2++){var _rz=_d2Z*(_ri2+0.5)/10;
            // Flashing red lights
            var _rLight=new THREE.Mesh(new THREE.SphereGeometry(0.35,6,6),toon(0xFF0000,{emissive:0xFF0000,emissiveIntensity:0.7}));
            _rLight.position.set((_ri2%2===0?-1:1)*(TRACK_W+3),4,-_rz); raceGroup.add(_rLight);
        }
        for(var _dti=0;_dti<8;_dti++){var _dtz=_d2Z*(_dti+0.5)/8,_dts=(_dti%2===0?-1:1);
            // Danger tape (stretched yellow+black boxes)
            var _tape=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.3,6),toon(0xFFDD00));
            _tape.position.set(_dts*(TRACK_W+2),1,-_dtz); raceGroup.add(_tape);
            var _tapeB=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.32,1),toon(0x222222));
            _tapeB.position.set(_dts*(TRACK_W+2),1,-_dtz); raceGroup.add(_tapeB);
        }
    } else if(ri===3){
        add(12,'flat');add(26,'spinners',{count:6});add(4,'flat');
        add(18,'ramp',{endY:6});add(28,'platforms',{count:10});add(18,'ramp',{endY:0});
        add(26,'hammers',{count:7});add(4,'flat');
        add(22,'conveyor',{count:7});add(4,'flat');
        add(24,'pendulums',{count:6});add(4,'flat');
        add(6,'narrow',{width:4});add(24,'bumpers',{count:14});
        add(22,'rollers',{count:5});add(4,'flat');
        add(22,'fallingBlocks',{count:12});add(10,'flat');
        // Track 3 decorations — Champion's Road / Trophies & golden arches
        var _d3Z=0;for(var _di=0;_di<segs.length;_di++) _d3Z=Math.max(_d3Z,segs[_di].endZ);
        // Red carpet strip on ground
        var _carpet=new THREE.Mesh(new THREE.BoxGeometry(4,0.06,_d3Z),toon(0xCC0000));
        _carpet.position.set(0,0.04,-_d3Z/2); raceGroup.add(_carpet);
        for(var _tri=0;_tri<10;_tri++){var _trz=_d3Z*(_tri+0.5)/10,_trs=(_tri%2===0?-1:1);
            // Trophy decorations (gold cylinder pedestal + sphere on top)
            var _ped=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.7,1.5,8),toon(0xFFD700));
            _ped.position.set(_trs*(TRACK_W+4),0.75,-_trz); raceGroup.add(_ped);
            var _cup=new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.3,1,8),toon(0xFFD700,{emissive:0xFFAA00,emissiveIntensity:0.3}));
            _cup.position.set(_trs*(TRACK_W+4),2,-_trz); raceGroup.add(_cup);
            var _ball=new THREE.Mesh(new THREE.SphereGeometry(0.3,8,6),toon(0xFFD700,{emissive:0xFFDD00,emissiveIntensity:0.4}));
            _ball.position.set(_trs*(TRACK_W+4),2.8,-_trz); raceGroup.add(_ball);
        }
        for(var _arci=0;_arci<5;_arci++){var _arcz=_d3Z*(_arci+0.5)/5;
            // Golden arches over track
            var _garch=new THREE.Mesh(new THREE.TorusGeometry(6,0.3,8,16,Math.PI),toon(0xFFD700,{emissive:0xFFAA00,emissiveIntensity:0.2}));
            _garch.position.set(0,0,-_arcz); _garch.rotation.y=Math.PI/2; raceGroup.add(_garch);
        }
    } else if(ri===4){
        // Green Gem Hills — Sonic style with coins, boosts, springs
        add(20,'flat');add(12,'coins',{count:20});
        add(10,'boost');add(15,'flat');add(8,'ramp',{endY:3});
        add(12,'coins',{count:15});add(10,'springs',{count:4});
        add(12,'ramp',{endY:0});add(8,'flat');
        add(20,'bumpers',{count:8});add(10,'coins',{count:12});
        add(10,'boost');add(12,'flat');
        add(14,'ramp',{endY:4});add(18,'platforms',{count:6});add(14,'ramp',{endY:0});
        add(10,'coins',{count:18});add(8,'springs',{count:3});
        add(16,'spinners',{count:2});add(10,'flat');
        add(12,'coins',{count:20});add(10,'boost');
        add(10,'questionBlocks',{count:3});add(12,'flat');
        // Track 4 decorations — Emerald Hills / Flowers, checkered grass, loop rings
        var _d4Z=0;for(var _di=0;_di<segs.length;_di++) _d4Z=Math.max(_d4Z,segs[_di].endZ);
        for(var _fi=0;_fi<14;_fi++){var _fz=_d4Z*(_fi+0.5)/14,_fs=(_fi%2===0?-1:1);
            // Flower patches (colored small spheres in clusters)
            var _flcols=[0xFF6688,0xFFAACC,0xFF44AA,0xFFDD44,0xFFFFFF];
            for(var _fp=0;_fp<4;_fp++){
                var _flower=new THREE.Mesh(new THREE.SphereGeometry(0.25,6,4),toon(_flcols[(_fi+_fp)%5]));
                _flower.position.set(_fs*(TRACK_W+3+_fp*0.7),0.25,-_fz+_fp*0.5); raceGroup.add(_flower);
            }
            // Green stem
            var _stem=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.5,4),toon(0x33AA33));
            _stem.position.set(_fs*(TRACK_W+4),0.25,-_fz); raceGroup.add(_stem);
        }
        for(var _li=0;_li<5;_li++){var _lz=_d4Z*(_li+0.5)/5;
            // Loop decorations (large torus rings around track)
            var _loop=new THREE.Mesh(new THREE.TorusGeometry(8,0.25,8,24),toon(0x00DD66,{emissive:0x00AA44,emissiveIntensity:0.2}));
            _loop.position.set(0,4,-_lz); _loop.rotation.y=Math.PI/2; raceGroup.add(_loop);
        }
    } else if(ri===5){
        // Flame Valley — boosts and conveyors, fast paced
        add(16,'flat');add(10,'boost');add(8,'coins',{count:10});
        add(14,'ramp',{endY:5});add(10,'coins',{count:12});add(14,'ramp',{endY:0});
        add(20,'conveyor',{count:6});add(6,'flat');
        add(10,'boost');add(12,'coins',{count:15});
        add(18,'spinners',{count:4});add(6,'flat');
        add(10,'springs',{count:5});add(8,'flat');
        add(16,'rollers',{count:3});add(10,'coins',{count:18});
        add(10,'boost');add(14,'flat');
        add(20,'hammers',{count:4});add(8,'coins',{count:10});
        add(12,'fallingBlocks',{count:6});add(10,'flat');
        // Track 5 decorations — Flame Valley / Lava streams, fire particles, volcanic rocks
        var _d5Z=0;for(var _di=0;_di<segs.length;_di++) _d5Z=Math.max(_d5Z,segs[_di].endZ);
        for(var _lvi=0;_lvi<2;_lvi++){var _lvs=(_lvi===0?-1:1);
            // Lava streams alongside track (orange+red glowing planes)
            var _lava=new THREE.Mesh(new THREE.BoxGeometry(3,0.1,_d5Z),toon(0xFF4400,{emissive:0xFF2200,emissiveIntensity:0.6}));
            _lava.position.set(_lvs*(TRACK_W+3),0.05,-_d5Z/2); raceGroup.add(_lava);
            var _lava2=new THREE.Mesh(new THREE.BoxGeometry(2,0.12,_d5Z),toon(0xFF6600,{emissive:0xFF4400,emissiveIntensity:0.8}));
            _lava2.position.set(_lvs*(TRACK_W+3.5),0.07,-_d5Z/2); raceGroup.add(_lava2);
        }
        for(var _fpi=0;_fpi<18;_fpi++){var _fpz=_d5Z*Math.random();
            // Fire particle meshes (small orange emissive spheres above lava)
            var _fcol=[0xFF6600,0xFF4400,0xFFAA00,0xFF8800][_fpi%4];
            var _fire=new THREE.Mesh(new THREE.SphereGeometry(0.2,4,4),toon(_fcol,{emissive:_fcol,emissiveIntensity:0.9}));
            _fire.position.set((_fpi%2===0?-1:1)*(TRACK_W+2+Math.random()*3),0.5+Math.random()*2,-_fpz); raceGroup.add(_fire);
        }
        for(var _vri=0;_vri<8;_vri++){var _vrz=_d5Z*(_vri+0.5)/8,_vrs=(_vri%2===0?-1:1);
            // Volcanic rock formations (dark irregular boxes/spheres)
            var _rock=new THREE.Mesh(new THREE.SphereGeometry(0.8+Math.random()*0.6,6,5),toon(0x333333));
            _rock.position.set(_vrs*(TRACK_W+5+Math.random()*2),0.6,-_vrz); raceGroup.add(_rock);
            var _rock2=new THREE.Mesh(new THREE.BoxGeometry(0.8,1.2,0.8),toon(0x2A2A2A));
            _rock2.position.set(_vrs*(TRACK_W+6),0.6,-_vrz+1); raceGroup.add(_rock2);
        }
    } else if(ri===6){
        // Ice Slide — wide track, springs, lots of coins
        add(20,'flat',{width:14});add(12,'coins',{count:25});
        add(10,'boost');add(10,'springs',{count:6});
        add(16,'ramp',{endY:3});add(12,'coins',{count:15});add(16,'ramp',{endY:0});
        add(14,'flat',{width:14});add(10,'boost');
        add(20,'bumpers',{count:10});add(10,'coins',{count:20});
        add(12,'springs',{count:4});add(8,'flat');
        add(18,'platforms',{count:8});add(10,'coins',{count:15});
        add(14,'ramp',{endY:4});add(10,'boost');add(14,'ramp',{endY:0});
        add(16,'pendulums',{count:3});add(12,'coins',{count:20});add(10,'flat');
        // Track 6 decorations — Ice Slide / Icicles, crystals, snow mounds
        var _d6Z=0;for(var _di=0;_di<segs.length;_di++) _d6Z=Math.max(_d6Z,segs[_di].endZ);
        for(var _ici=0;_ici<14;_ici++){var _icz=_d6Z*(_ici+0.5)/14,_ics=(_ici%2===0?-1:1);
            // Icicle decorations hanging from above (thin inverted cones)
            var _icicle=new THREE.Mesh(new THREE.ConeGeometry(0.2,2+Math.random(),5),toon(0xAADDFF,{transparent:true,opacity:0.7}));
            _icicle.rotation.x=Math.PI; _icicle.position.set(_ics*(TRACK_W+2+Math.random()*3),6+Math.random()*2,-_icz); raceGroup.add(_icicle);
        }
        for(var _ci=0;_ci<8;_ci++){var _cz=_d6Z*(_ci+0.5)/8,_cs=(_ci%2===0?-1:1);
            // Frozen crystal formations (transparent blue boxes)
            var _cryst=new THREE.Mesh(new THREE.BoxGeometry(0.6,1.5+Math.random(),0.6),toon(0x88CCFF,{transparent:true,opacity:0.5}));
            _cryst.rotation.y=Math.random()*Math.PI; _cryst.position.set(_cs*(TRACK_W+4),0.8,-_cz); raceGroup.add(_cryst);
            var _cryst2=new THREE.Mesh(new THREE.BoxGeometry(0.4,1+Math.random(),0.4),toon(0xAADDFF,{transparent:true,opacity:0.4}));
            _cryst2.rotation.y=Math.random()*Math.PI; _cryst2.position.set(_cs*(TRACK_W+4.5),0.6,-_cz+0.5); raceGroup.add(_cryst2);
        }
        for(var _smi=0;_smi<10;_smi++){var _smz=_d6Z*(_smi+0.5)/10,_sms=(_smi%2===0?-1:1);
            // Snow mounds (white half-spheres along edges)
            var _snow=new THREE.Mesh(new THREE.SphereGeometry(1+Math.random()*0.5,8,4,0,Math.PI*2,0,Math.PI/2),toon(0xFFFFFF));
            _snow.position.set(_sms*(TRACK_W+4),0,-_smz); raceGroup.add(_snow);
        }
    } else if(ri===7){
        // Rainbow Sky — aerial platforms, coins everywhere
        add(14,'flat');add(10,'coins',{count:15});add(10,'boost');
        add(16,'ramp',{endY:6});add(24,'platforms',{count:10});
        add(10,'coins',{count:20});add(16,'ramp',{endY:3});
        add(10,'springs',{count:6});add(12,'coins',{count:15});
        add(14,'ramp',{endY:6});add(20,'platforms',{count:8});add(14,'ramp',{endY:0});
        add(10,'boost');add(12,'coins',{count:25});
        add(18,'spinners',{count:3});add(8,'flat');
        add(10,'springs',{count:4});add(10,'coins',{count:20});
        add(16,'pendulums',{count:3});add(10,'boost');
        add(12,'coins',{count:15});add(10,'flat');
        // Track 7 decorations — Rainbow Sky / Rainbow arch, stars, cloud puffs
        var _d7Z=0;for(var _di=0;_di<segs.length;_di++) _d7Z=Math.max(_d7Z,segs[_di].endZ);
        // Rainbow arch over midpoint (7 colored torus segments)
        var _rbCols=[0xFF0000,0xFF8800,0xFFFF00,0x00FF00,0x0088FF,0x0000FF,0x8800FF];
        for(var _rbi=0;_rbi<7;_rbi++){
            var _rbArc=new THREE.Mesh(new THREE.TorusGeometry(7+_rbi*0.6,0.3,8,20,Math.PI),toon(_rbCols[_rbi],{emissive:_rbCols[_rbi],emissiveIntensity:0.2}));
            _rbArc.position.set(0,0,-_d7Z*0.5); _rbArc.rotation.y=Math.PI/2; raceGroup.add(_rbArc);
        }
        for(var _sti=0;_sti<16;_sti++){var _stz=_d7Z*Math.random();
            // Star decorations (small gold emissive spheres floating)
            var _star=new THREE.Mesh(new THREE.SphereGeometry(0.25,6,4),toon(0xFFDD00,{emissive:0xFFCC00,emissiveIntensity:0.8}));
            _star.position.set((Math.random()-0.5)*(TRACK_W+8)*2,4+Math.random()*5,-_stz); raceGroup.add(_star);
        }
        for(var _cli=0;_cli<12;_cli++){var _clz=_d7Z*(_cli+0.5)/12,_cls=(_cli%2===0?-1:1);
            // Cloud puffs along edges (white spheres clustered)
            for(var _cp=0;_cp<3;_cp++){
                var _cloud=new THREE.Mesh(new THREE.SphereGeometry(1+Math.random()*0.5,8,6),toon(0xFFFFFF,{transparent:true,opacity:0.6}));
                _cloud.position.set(_cls*(TRACK_W+4+_cp*1.2),3+Math.random()*2,-_clz+_cp*0.8); raceGroup.add(_cloud);
            }
        }
    } else if(ri===8){
        // Mushroom Kingdom — Mario pipes, goombas, classic platforming
        add(20,'flat');add(14,'pipes',{count:4});add(8,'flat');
        add(10,'coins',{count:12});add(12,'goombas',{count:5});
        add(8,'flat');add(12,'ramp',{endY:3});
        add(16,'platforms',{count:5});add(12,'ramp',{endY:0});
        add(10,'pipes',{count:3});add(8,'coins',{count:10});
        add(14,'goombas',{count:6});add(8,'flat');
        add(10,'boost');add(12,'coins',{count:15});
        add(16,'spinners',{count:2});add(8,'flat');
        add(10,'pipes',{count:5});add(12,'goombas',{count:4});
        add(10,'questionBlocks',{count:5});
        add(10,'coins',{count:18});add(10,'flat');
        // Track 8 decorations — Mushroom Kingdom / Giant mushrooms, question blocks, brick walls
        var _d8Z=0;for(var _di=0;_di<segs.length;_di++) _d8Z=Math.max(_d8Z,segs[_di].endZ);
        for(var _mi=0;_mi<10;_mi++){var _mz=_d8Z*(_mi+0.5)/10,_ms=(_mi%2===0?-1:1);
            // Giant mushroom decorations (red+white dome on stick)
            var _mStalk=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.35,3,8),toon(0xFFEEDD));
            _mStalk.position.set(_ms*(TRACK_W+5),1.5,-_mz); raceGroup.add(_mStalk);
            var _mCap=new THREE.Mesh(new THREE.SphereGeometry(1.2,10,6,0,Math.PI*2,0,Math.PI/2),toon(0xFF2222));
            _mCap.position.set(_ms*(TRACK_W+5),3,-_mz); raceGroup.add(_mCap);
            // White dots on mushroom cap
            for(var _dot=0;_dot<3;_dot++){
                var _wdot=new THREE.Mesh(new THREE.SphereGeometry(0.2,6,4),toon(0xFFFFFF));
                _wdot.position.set(_ms*(TRACK_W+5)+Math.sin(_dot*2.1)*0.7,3.2+Math.cos(_dot*2.1)*0.3,-_mz+Math.cos(_dot*1.5)*0.5); raceGroup.add(_wdot);
            }
        }
        for(var _qi=0;_qi<8;_qi++){var _qz=_d8Z*(_qi+0.5)/8,_qs=(_qi%2===0?-1:1);
            // Question mark blocks (yellow cubes)
            var _qBlock=new THREE.Mesh(new THREE.BoxGeometry(1.2,1.2,1.2),toon(0xFFCC00,{emissive:0xFFAA00,emissiveIntensity:0.2}));
            _qBlock.position.set(_qs*(TRACK_W+3),3.5,-_qz); raceGroup.add(_qBlock);
            // ? mark (small white plane)
            var _qMark=new THREE.Mesh(new THREE.PlaneGeometry(0.6,0.8),toon(0xFFFFFF,{side:THREE.DoubleSide}));
            _qMark.position.set(_qs*(TRACK_W+3),3.5,-_qz+0.61); raceGroup.add(_qMark);
        }
        for(var _bi=0;_bi<6;_bi++){var _bz=_d8Z*(_bi+0.5)/6,_bs=(_bi%2===0?-1:1);
            // Brick pattern on walls (brown boxes stacked)
            for(var _br=0;_br<3;_br++){
                var _brick=new THREE.Mesh(new THREE.BoxGeometry(1.8,0.6,0.6),toon(0xAA5533));
                _brick.position.set(_bs*(TRACK_W+2.5),0.3+_br*0.65,-_bz+(_br%2)*0.4); raceGroup.add(_brick);
            }
        }
    } else if(ri===9){
        // Lava Castle — conveyors, falling blocks, pipes, fast pace
        add(16,'flat');add(10,'pipes',{count:3});
        add(14,'ramp',{endY:4});add(10,'goombas',{count:4});add(14,'ramp',{endY:0});
        add(18,'conveyor',{count:5});add(6,'flat');
        add(12,'pipes',{count:6});add(10,'coins',{count:12});
        add(16,'fallingBlocks',{count:8});add(6,'flat');
        add(10,'boost');add(12,'goombas',{count:6});
        add(8,'coins',{count:15});add(10,'pipes',{count:4});
        add(14,'hammers',{count:4});add(8,'flat');
        add(10,'springs',{count:4});add(12,'coins',{count:20});
        add(10,'goombas',{count:5});add(10,'flat');
        // Track 9 decorations — Lava Castle / Castle walls, torches, chains
        var _d9Z=0;for(var _di=0;_di<segs.length;_di++) _d9Z=Math.max(_d9Z,segs[_di].endZ);
        for(var _cwi=0;_cwi<10;_cwi++){var _cwz=_d9Z*(_cwi+0.5)/10,_cws=(_cwi%2===0?-1:1);
            // Castle wall segments along edges (gray crenellated boxes)
            var _wall=new THREE.Mesh(new THREE.BoxGeometry(1.5,3,3),toon(0x888888));
            _wall.position.set(_cws*(TRACK_W+4),1.5,-_cwz); raceGroup.add(_wall);
            // Crenellation on top
            for(var _cr=0;_cr<2;_cr++){
                var _cren=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.8,0.6),toon(0x888888));
                _cren.position.set(_cws*(TRACK_W+4)+(_cr-0.5)*0.8,3.4,-_cwz+(_cr-0.5)*1); raceGroup.add(_cren);
            }
        }
        for(var _tci=0;_tci<12;_tci++){var _tcz=_d9Z*(_tci+0.5)/12,_tcs=(_tci%2===0?-1:1);
            // Torch brackets (orange emissive on walls)
            var _torch=new THREE.Mesh(new THREE.SphereGeometry(0.3,6,4),toon(0xFF6600,{emissive:0xFF4400,emissiveIntensity:0.8}));
            _torch.position.set(_tcs*(TRACK_W+3.2),2.5,-_tcz); raceGroup.add(_torch);
            var _bracket=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,0.6,4),toon(0x555555));
            _bracket.rotation.z=Math.PI/2*_tcs; _bracket.position.set(_tcs*(TRACK_W+3.5),2.2,-_tcz); raceGroup.add(_bracket);
        }
        for(var _chi=0;_chi<8;_chi++){var _chz=_d9Z*(_chi+0.5)/8;
            // Chains hanging from above (gray cylinder links)
            for(var _cl=0;_cl<4;_cl++){
                var _link=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,0.5,4),toon(0x777777));
                _link.position.set((_chi%2===0?-1:1)*(TRACK_W+2),6-_cl*0.6,-_chz);
                _link.rotation.z=_cl%2===0?0:Math.PI/4; raceGroup.add(_link);
            }
        }
    } else if(ri===10){
        // Cloud Heaven — lots of platforms, springs, coins
        add(18,'flat',{width:14});add(10,'coins',{count:20});
        add(10,'springs',{count:5});add(8,'flat');
        add(16,'ramp',{endY:5});add(20,'platforms',{count:8});
        add(10,'coins',{count:15});add(16,'ramp',{endY:2});
        add(10,'pipes',{count:3});add(12,'goombas',{count:4});
        add(10,'boost');add(8,'flat');
        add(14,'ramp',{endY:6});add(22,'platforms',{count:10});add(14,'ramp',{endY:0});
        add(10,'springs',{count:6});add(12,'coins',{count:25});
        add(10,'questionBlocks',{count:4});
        add(10,'pipes',{count:4});add(10,'coins',{count:15});add(10,'flat');
        // Track 10 decorations — Cloud Heaven / Angel statues, harps, sun beams
        var _d10Z=0;for(var _di=0;_di<segs.length;_di++) _d10Z=Math.max(_d10Z,segs[_di].endZ);
        for(var _agi=0;_agi<8;_agi++){var _agz=_d10Z*(_agi+0.5)/8,_ags=(_agi%2===0?-1:1);
            // Angel statue decorations (white sphere head + cone body + wings)
            var _abody=new THREE.Mesh(new THREE.ConeGeometry(0.7,2,8),toon(0xFFFFFF));
            _abody.position.set(_ags*(TRACK_W+5),1,-_agz); raceGroup.add(_abody);
            var _ahead=new THREE.Mesh(new THREE.SphereGeometry(0.4,8,6),toon(0xFFEEDD));
            _ahead.position.set(_ags*(TRACK_W+5),2.3,-_agz); raceGroup.add(_ahead);
            // Halo
            var _halo=new THREE.Mesh(new THREE.TorusGeometry(0.35,0.05,6,12),toon(0xFFDD00,{emissive:0xFFCC00,emissiveIntensity:0.6}));
            _halo.position.set(_ags*(TRACK_W+5),2.8,-_agz); _halo.rotation.x=Math.PI/2; raceGroup.add(_halo);
        }
        for(var _hi=0;_hi<6;_hi++){var _hz=_d10Z*(_hi+0.5)/6,_hs=(_hi%2===0?-1:1);
            // Harp shapes (gold torus + cylinder)
            var _hFrame=new THREE.Mesh(new THREE.TorusGeometry(1,0.08,6,12,Math.PI),toon(0xFFD700));
            _hFrame.position.set(_hs*(TRACK_W+3),3,-_hz); raceGroup.add(_hFrame);
            var _hBase=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,2,4),toon(0xFFD700));
            _hBase.position.set(_hs*(TRACK_W+3),2,-_hz); raceGroup.add(_hBase);
        }
        for(var _sbi=0;_sbi<6;_sbi++){var _sbz=_d10Z*(_sbi+0.5)/6;
            // Sun beams (transparent yellow planes angled down)
            var _beam=new THREE.Mesh(new THREE.PlaneGeometry(2,8),toon(0xFFFF88,{transparent:true,opacity:0.15,side:THREE.DoubleSide}));
            _beam.position.set((_sbi%2===0?-1:1)*(TRACK_W+2),5,-_sbz);
            _beam.rotation.z=(_sbi%2===0?1:-1)*0.3; _beam.rotation.y=Math.PI/4; raceGroup.add(_beam);
        }
    } else {
        // Bowser Castle — everything, max difficulty
        add(14,'flat');add(12,'pipes',{count:5});add(10,'goombas',{count:6});
        add(14,'ramp',{endY:5});add(10,'coins',{count:12});add(14,'ramp',{endY:0});
        add(18,'spinners',{count:4});add(6,'flat');
        add(14,'pipes',{count:6});add(12,'conveyor',{count:5});
        add(10,'goombas',{count:8});add(8,'coins',{count:15});
        add(16,'hammers',{count:5});add(6,'flat');
        add(12,'fallingBlocks',{count:10});add(10,'boost');
        add(14,'ramp',{endY:6});add(24,'platforms',{count:10});add(14,'ramp',{endY:0});
        add(10,'springs',{count:5});add(12,'pendulums',{count:4});
        add(10,'pipes',{count:4});add(12,'goombas',{count:6});
        add(10,'coins',{count:25});add(10,'flat');
        // Track 11 decorations — Bowser Castle / Skulls, dark banners, iron cages
        var _d11Z=0;for(var _di=0;_di<segs.length;_di++) _d11Z=Math.max(_d11Z,segs[_di].endZ);
        for(var _ski=0;_ski<10;_ski++){var _skz=_d11Z*(_ski+0.5)/10,_sks=(_ski%2===0?-1:1);
            // Skull decorations (white sphere with black eye holes)
            var _skull=new THREE.Mesh(new THREE.SphereGeometry(0.6,8,6),toon(0xEEEEDD));
            _skull.position.set(_sks*(TRACK_W+4),2.5,-_skz); raceGroup.add(_skull);
            // Eye sockets
            for(var _ei=0;_ei<2;_ei++){
                var _eye=new THREE.Mesh(new THREE.SphereGeometry(0.15,6,4),toon(0x111111));
                _eye.position.set(_sks*(TRACK_W+4)+(_ei-0.5)*0.3,2.6,-_skz+0.45); raceGroup.add(_eye);
            }
            // Jaw
            var _jaw=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.15,0.3),toon(0xDDDDCC));
            _jaw.position.set(_sks*(TRACK_W+4),1.95,-_skz+0.3); raceGroup.add(_jaw);
        }
        for(var _bni=0;_bni<12;_bni++){var _bnz=_d11Z*(_bni+0.5)/12,_bns=(_bni%2===0?-1:1);
            // Dark banners (purple planes hanging)
            var _banner=new THREE.Mesh(new THREE.PlaneGeometry(1.5,3),toon(0x440066,{side:THREE.DoubleSide}));
            _banner.position.set(_bns*(TRACK_W+3),4,-_bnz); raceGroup.add(_banner);
            // Banner pole
            var _pole=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,1.8,4),toon(0x444444));
            _pole.rotation.z=Math.PI/2; _pole.position.set(_bns*(TRACK_W+3),5.5,-_bnz); raceGroup.add(_pole);
        }
        for(var _cgi=0;_cgi<6;_cgi++){var _cgz=_d11Z*(_cgi+0.5)/6;
            // Iron cage frames (cylinder grids)
            var _side2=(_cgi%2===0?-1:1);
            for(var _bar=0;_bar<4;_bar++){
                var _vbar=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,3,4),toon(0x555555));
                _vbar.position.set(_side2*(TRACK_W+5)+(_bar-1.5)*0.5,1.5,-_cgz); raceGroup.add(_vbar);
            }
            var _hbar=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,2,4),toon(0x555555));
            _hbar.rotation.z=Math.PI/2; _hbar.position.set(_side2*(TRACK_W+5),3,-_cgz); raceGroup.add(_hbar);
            var _hbar2=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,2,4),toon(0x555555));
            _hbar2.rotation.z=Math.PI/2; _hbar2.position.set(_side2*(TRACK_W+5),0,-_cgz); raceGroup.add(_hbar2);
        }
    }


    trackLength=cz; trackSegments=segs;
    const sm=1+ri*0.2;

    for(let si=0;si<segs.length;si++){
        const seg=segs[si], len=seg.endZ-seg.startZ, hw=seg.width;
        const midZ=seg.startZ+len/2, midY=(seg.startY+seg.endY)/2;

        if(seg.type==='ramp'){
            const fl=new THREE.Mesh(new THREE.BoxGeometry(hw*2,0.5,len),toon(theme[si%2]));
            fl.position.set(0,midY-0.25,-midZ);
            fl.rotation.x=Math.atan2(seg.endY-seg.startY,len);
            fl.receiveShadow=true; raceGroup.add(fl);
        } else if(seg.type!=='platforms'){
            const fl=new THREE.Mesh(new THREE.BoxGeometry(hw*2,0.5,len),toon(theme[si%2]));
            fl.position.set(0,seg.floorY-0.25,-midZ); fl.receiveShadow=true; raceGroup.add(fl);
        }
        if(seg.type!=='narrow'&&seg.type!=='platforms'){
            const wg=new THREE.BoxGeometry(0.5,2,len);
            [-1,1].forEach(side=>{
                const w=new THREE.Mesh(wg,toon(0x9977DD,{transparent:true,opacity:0.45}));
                w.position.set(side*hw,seg.floorY+0.75,-midZ); raceGroup.add(w);
            });
        }
        if(seg.type==='narrow'){
            const rg=new THREE.CylinderGeometry(0.06,0.06,len,4);
            [-1,1].forEach(side=>{
                const rail=new THREE.Mesh(rg,toon(0xFFCC00));
                rail.rotation.x=Math.PI/2; rail.position.set(side*hw,seg.floorY+0.6,-midZ); raceGroup.add(rail);
            });
        }
        buildObs(seg,ri,sm);
    }
    // Finish
    for(let i=0;i<10;i++){
        const c=new THREE.Mesh(new THREE.BoxGeometry(TRACK_W*2/10,0.08,0.6),toon(i%2===0?0x222222:0xffffff));
        c.position.set(-TRACK_W+TRACK_W/5+i*TRACK_W*2/10,0.04,-trackLength); raceGroup.add(c);
    }
    // Finish arch gate — large golden arch with glow
    const arch=new THREE.Mesh(new THREE.TorusGeometry(6,0.5,8,24,Math.PI),toon(0xFFD700,{emissive:0xFFAA00,emissiveIntensity:0.4}));
    arch.position.set(0,0,-trackLength); arch.rotation.y=Math.PI/2; raceGroup.add(arch);
    // Inner glow ring
    var archGlow=new THREE.Mesh(new THREE.TorusGeometry(6,0.2,6,24,Math.PI),new THREE.MeshBasicMaterial({color:0xFFDD44,transparent:true,opacity:0.3}));
    archGlow.position.copy(arch.position);archGlow.rotation.copy(arch.rotation);raceGroup.add(archGlow);
    // GOAL text above arch
    var goalCvs=document.createElement('canvas');goalCvs.width=256;goalCvs.height=64;
    var goalCtx2=goalCvs.getContext('2d');
    goalCtx2.fillStyle='rgba(0,0,0,0.6)';goalCtx2.fillRect(0,0,256,64);
    goalCtx2.fillStyle='#FFD700';goalCtx2.font='bold 40px sans-serif';goalCtx2.textAlign='center';
    goalCtx2.fillText('🏁 GOAL',128,46);
    var goalTex=new THREE.CanvasTexture(goalCvs);
    var goalSign=new THREE.Sprite(new THREE.SpriteMaterial({map:goalTex,transparent:true}));
    goalSign.scale.set(8,2,1);goalSign.position.set(0,8,-trackLength);raceGroup.add(goalSign);
    // Pillars on both sides
    [-1,1].forEach(function(s){
        var pillar=new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.5,7,8),toon(0xFFD700,{emissive:0xFFAA00,emissiveIntensity:0.3}));
        pillar.position.set(s*6,3.5,-trackLength);raceGroup.add(pillar);
    });
    // ---- Scatter power-up items along every track ----
    var _pitems=['star','shield','magnet'];
    for(var _pii=0;_pii<4;_pii++){
        var _piZ=20+_pii*trackLength/5;
        var _piType=_pitems[_pii%3];
        var _piG=new THREE.Group();
        if(_piType==='star'){
            var _psCore=new THREE.Mesh(new THREE.OctahedronGeometry(0.5,0),toon(0xFFDD00,{emissive:0xFFAA00,emissiveIntensity:0.6}));
            _piG.add(_psCore);
            var _psGlow=new THREE.Mesh(new THREE.SphereGeometry(0.6,8,6),toon(0xFFFF88,{transparent:true,opacity:0.3}));
            _piG.add(_psGlow);
        } else if(_piType==='shield'){
            var _pbCore=new THREE.Mesh(new THREE.SphereGeometry(0.5,10,8),toon(0x4488FF,{transparent:true,opacity:0.5,emissive:0x2266CC,emissiveIntensity:0.3}));
            _piG.add(_pbCore);
        } else {
            var _pmArc=new THREE.Mesh(new THREE.TorusGeometry(0.35,0.1,6,10,Math.PI),toon(0xFF2222,{emissive:0xCC0000,emissiveIntensity:0.3}));
            _piG.add(_pmArc);
            var _pmT1=new THREE.Mesh(new THREE.SphereGeometry(0.12,6,4),toon(0xCCCCCC));
            _pmT1.position.set(-0.35,0,0); _piG.add(_pmT1);
            var _pmT2=new THREE.Mesh(new THREE.SphereGeometry(0.12,6,4),toon(0xCCCCCC));
            _pmT2.position.set(0.35,0,0); _piG.add(_pmT2);
        }
        var _piFloorY=getFloorY(_piZ)||0;
        _piG.position.set((Math.sin(_pii*2.3))*3,_piFloorY+3,-_piZ);
        raceGroup.add(_piG);
        raceCoins.push({mesh:_piG,z:_piZ,x:(Math.sin(_pii*2.3))*3,fy:_piFloorY+3,collected:false,bobPhase:_pii*1.1,type:_piType});
    }
    return segs;
}

// ============================================================
//  OBSTACLE BUILDER
// ============================================================
function buildObs(seg,ri,sm){
    const len=seg.endZ-seg.startZ, hw=seg.width, fy=seg.floorY||0;

    if(seg.type==='spinners') for(let i=0;i<seg.count;i++){
        const oz=seg.startZ+(i+1)*len/(seg.count+1), al=hw*0.85;
        const piv=new THREE.Group(); piv.position.set(0,fy+1.2,-oz);
        const pl=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.35,1.2,8),toon(0x666666));
        pl.position.set(0,-0.6,0); pl.castShadow=true; piv.add(pl);
        const arm=new THREE.Mesh(new THREE.BoxGeometry(al*2,0.55,0.55),toon(0xFF4444)); arm.castShadow=true; piv.add(arm);
        [-1,1].forEach(s=>{const cp=new THREE.Mesh(new THREE.SphereGeometry(0.45,8,6),toon(0xCC0000));cp.position.x=s*al;cp.castShadow=true;piv.add(cp);});
        raceGroup.add(piv);
        obstacleObjects.push({type:'spinner',mesh:piv,data:{z:oz,fy,armLen:al,speed:(0.012+ri*0.004)*(i%2===0?1:-1)*sm,angle:i*Math.PI/Math.max(seg.count,1)}});
    }
    if(seg.type==='hammers') for(let i=0;i<seg.count;i++){
        const oz=seg.startZ+(i+1)*len/(seg.count+1), side=i%2===0?-1:1, al=4+ri*0.5;
        const pg=new THREE.Group(); pg.position.set(side*(hw+1),fy+5,-oz);
        pg.add(new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,5,6),toon(0x888888)));
        const sw=new THREE.Group();
        const rod=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,al,4),toon(0x999999)); rod.position.y=-al/2; sw.add(rod);
        const hd=new THREE.Mesh(new THREE.SphereGeometry(0.9,10,8),toon(0xFF6633)); hd.position.y=-al; hd.castShadow=true; sw.add(hd);
        [-1,1].forEach(s=>{
            const ew=new THREE.Mesh(new THREE.SphereGeometry(0.14,6,4),toon(0xffffff)); ew.position.set(s*0.28,-al+0.18,0.7); sw.add(ew);
            const eb=new THREE.Mesh(new THREE.SphereGeometry(0.08,4,4),toon(0x222222)); eb.position.set(s*0.28,-al+0.14,0.78); sw.add(eb);
        });
        pg.add(sw); raceGroup.add(pg);
        obstacleObjects.push({type:'hammer',mesh:pg,swing:sw,data:{z:oz,fy,armLen:al,side,speed:(0.016+ri*0.004)*sm,angle:0,pivotX:side*(hw+1),pivotY:fy+5}});
    }
    if(seg.type==='rollers') for(let i=0;i<seg.count;i++){
        const oz=seg.startZ+(i+1)*len/(seg.count+1);
        const rl=new THREE.Mesh(new THREE.CylinderGeometry(0.8,0.8,hw*1.8,12),toon(0xE74C3C));
        rl.rotation.z=Math.PI/2; rl.position.set(0,fy+0.8,-oz); rl.castShadow=true; raceGroup.add(rl);
        obstacleObjects.push({type:'roller',mesh:rl,data:{z:oz,fy,radius:0.8,speed:0.035*sm}});
    }
    if(seg.type==='bumpers') for(let i=0;i<seg.count;i++){
        const oz=seg.startZ+Math.random()*len, ox=(Math.random()-0.5)*hw*1.4, r=0.5+Math.random()*0.3;
        const bm=new THREE.Mesh(new THREE.SphereGeometry(r,10,8),toon(0xFF69B4,{emissive:0xFF1493,emissiveIntensity:0.15}));
        bm.position.set(ox,fy+r,-oz); bm.castShadow=true; raceGroup.add(bm);
        obstacleObjects.push({type:'bumper',mesh:bm,data:{z:oz,fy,x:ox,radius:r,pulse:Math.random()*Math.PI*2}});
    }
    if(seg.type==='pendulums') for(let i=0;i<seg.count;i++){
        const oz=seg.startZ+(i+1)*len/(seg.count+1), chainLen=5+ri*0.5;
        const pg=new THREE.Group(); pg.position.set(0,fy+8,-oz);
        pg.add(new THREE.Mesh(new THREE.BoxGeometry(hw*1.6,0.4,0.4),toon(0x888888)));
        const arm=new THREE.Group();
        const chain=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,chainLen,4),toon(0xAAAAAA));
        chain.position.set(0,-chainLen/2,0); arm.add(chain);
        const ball=new THREE.Mesh(new THREE.SphereGeometry(1.0,10,8),toon(0x9933FF)); ball.position.y=-chainLen; ball.castShadow=true; arm.add(ball);
        pg.add(arm); raceGroup.add(pg);
        obstacleObjects.push({type:'pendulum',mesh:pg,arm,data:{z:oz,fy,chainLen,speed:(0.013+ri*0.003)*sm,angle:i*0.8,pivotY:fy+8}});
    }
    if(seg.type==='platforms') for(let i=0;i<seg.count;i++){
        const oz=seg.startZ+(i+0.5)*len/seg.count;
        const pw=5+Math.random()*3, pd=3.5;
        const pm=new THREE.Mesh(new THREE.BoxGeometry(pw,0.5,pd),toon(0x44AADD));
        pm.position.set(0,fy-0.25,-oz); pm.castShadow=true; pm.receiveShadow=true; raceGroup.add(pm);
        const moveRange=hw*0.35;
        pm.position.x=(i%2===0?-1:1)*moveRange*0.5;
        obstacleObjects.push({type:'platform',mesh:pm,data:{z:oz,fy,width:pw,depth:pd,moveRange,speed:(0.008+ri*0.003)*sm*(i%2===0?1:-1),phase:i*Math.PI/seg.count}});
    }
    if(seg.type==='conveyor') for(let i=0;i<seg.count;i++){
        const oz=seg.startZ+(i+1)*len/(seg.count+1);
        const beltLen=6, beltW=hw*1.2;
        const belt=new THREE.Mesh(new THREE.BoxGeometry(beltW,0.15,beltLen),toon(0x555555));
        belt.position.set(0,fy+0.08,-oz); raceGroup.add(belt);
        const dir=(i%2===0)?1:-1;
        for(let a=0;a<3;a++){
            const arr=new THREE.Mesh(new THREE.ConeGeometry(0.3,0.6,4),toon(0xFFFF00,{transparent:true,opacity:0.5}));
            arr.rotation.x=dir>0?0:Math.PI; arr.rotation.z=Math.PI;
            arr.position.set((a-1)*2,fy+0.2,-oz); raceGroup.add(arr);
        }
        obstacleObjects.push({type:'conveyor',mesh:belt,data:{z:oz,fy,halfLen:beltLen/2,halfW:beltW/2,pushX:dir*(0.04+ri*0.01)*sm,pushZ:0}});
    }
    if(seg.type==='fallingBlocks') for(let i=0;i<seg.count;i++){
        const oz=seg.startZ+Math.random()*len, ox=(Math.random()-0.5)*hw*1.4;
        const bSize=1.2+Math.random()*0.8;
        const block=new THREE.Mesh(new THREE.BoxGeometry(bSize,bSize,bSize),toon(0xFF8844));
        block.position.set(ox,fy+12+Math.random()*5,-oz); block.castShadow=true; raceGroup.add(block);
        const shadow=new THREE.Mesh(new THREE.CircleGeometry(bSize*0.6,8),toon(0xFF0000,{transparent:true,opacity:0,side:THREE.DoubleSide}));
        shadow.rotation.x=-Math.PI/2; shadow.position.set(ox,fy+0.05,-oz); raceGroup.add(shadow);
        obstacleObjects.push({type:'fallingBlock',mesh:block,shadow,data:{z:oz,fy,x:ox,size:bSize,baseY:fy+12+Math.random()*5,fallSpeed:0,falling:false,onGround:false,timer:100+Math.random()*160,resetTimer:0,warningTime:60}});
    }
    // ---- Coins (Sonic-style gold rings) ----
    if(seg.type==='coins') for(let i=0;i<(seg.count||10);i++){
        const oz=seg.startZ+(i+0.5)*len/(seg.count||10);
        const ox=(Math.sin(i*1.7))*hw*0.5;
        const coinG=(typeof _makeCinematicCoinMesh==='function')?_makeCinematicCoinMesh(1.04):new THREE.Group();
        coinG.position.set(ox,fy+1.2,-oz);
        raceGroup.add(coinG);
        raceCoins.push({mesh:coinG,z:oz,x:ox,fy:fy,collected:false,bobPhase:i*0.5});
    }
    // ---- Boost pads ----
    if(seg.type==='boost'){
        const padCount=3;
        for(let i=0;i<padCount;i++){
            const oz=seg.startZ+(i+1)*len/(padCount+1);
            const padW=hw*1.2, padD=3;
            const pad=new THREE.Mesh(new THREE.BoxGeometry(padW,0.15,padD),toon(0x00CCFF,{emissive:0x0088FF,emissiveIntensity:0.5}));
            pad.position.set(0,fy+0.08,-oz); pad.receiveShadow=true; raceGroup.add(pad);
            // Arrow indicators
            for(let a=0;a<3;a++){
                const arr=new THREE.Mesh(new THREE.ConeGeometry(0.4,0.8,4),toon(0xFFFF00,{emissive:0xFFDD00,emissiveIntensity:0.4,transparent:true,opacity:0.7}));
                arr.rotation.x=Math.PI; arr.position.set((a-1)*2.5,fy+0.25,-oz);
                raceGroup.add(arr);
            }
            obstacleObjects.push({type:'boost',mesh:pad,data:{z:oz,fy:fy,halfW:padW/2,halfD:padD/2,strength:0.35}});
        }
    }
    // ---- Spring pads ----
    if(seg.type==='springs') for(let i=0;i<(seg.count||3);i++){
        const oz=seg.startZ+(i+1)*len/((seg.count||3)+1);
        const ox=(i%2===0?-1:1)*hw*0.25*(i%3);
        const sg2=new THREE.Group();
        // Base cylinder
        const base2=new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.7,0.3,10),toon(0xFF4444));
        base2.position.y=0.15; sg2.add(base2);
        // Spring coil (stacked torus)
        for(let c=0;c<3;c++){
            const coil=new THREE.Mesh(new THREE.TorusGeometry(0.35,0.06,6,12),toon(0xCCCCCC));
            coil.position.y=0.4+c*0.18; coil.rotation.x=Math.PI/2; sg2.add(coil);
        }
        // Top plate
        const top2=new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.5,0.15,10),toon(0xFF6666,{emissive:0xFF2222,emissiveIntensity:0.3}));
        top2.position.y=1.0; sg2.add(top2);
        sg2.position.set(ox,fy,-oz);
        raceGroup.add(sg2);
        obstacleObjects.push({type:'spring',mesh:sg2,data:{z:oz,fy:fy,x:ox,radius:0.7,jumpForce:0.5,anim:0}});
    }
    // ---- Mario Pipes (green warp pipes as obstacles) ----
    if(seg.type==='pipes') for(let i=0;i<(seg.count||3);i++){
        const oz=seg.startZ+(i+1)*len/((seg.count||3)+1);
        const ox=(i%2===0?-1:1)*hw*0.3*(0.5+Math.random()*0.5);
        const pH=2.0+Math.random()*1.5;
        const pg=new THREE.Group();
        // Pipe body
        const body2=new THREE.Mesh(new THREE.CylinderGeometry(0.8,0.8,pH,12),toon(0x33AA33));
        body2.position.y=pH/2; body2.castShadow=true; pg.add(body2);
        // Pipe rim (wider top)
        const rim2=new THREE.Mesh(new THREE.CylinderGeometry(1.0,1.0,0.4,12),toon(0x228822));
        rim2.position.y=pH+0.2; rim2.castShadow=true; pg.add(rim2);
        // Dark inside
        const hole=new THREE.Mesh(new THREE.CircleGeometry(0.7,12),toon(0x111111));
        hole.rotation.x=-Math.PI/2; hole.position.y=pH+0.41; pg.add(hole);
        // Highlight stripe
        const stripe=new THREE.Mesh(new THREE.CylinderGeometry(0.82,0.82,0.15,12),toon(0x55CC55));
        stripe.position.y=pH*0.6; pg.add(stripe);
        pg.position.set(ox,fy,-oz);
        raceGroup.add(pg);
        obstacleObjects.push({type:'pipe',mesh:pg,data:{z:oz,fy:fy,x:ox,radius:1.0,height:pH}});
    }
    // ---- Goombas (walking mushroom enemies) ----
    if(seg.type==='goombas') for(let i=0;i<(seg.count||3);i++){
        const oz=seg.startZ+(i+1)*len/((seg.count||3)+1);
        const ox=(Math.random()-0.5)*hw*1.0;
        const gg=new THREE.Group();
        // Body — brown mushroom cap
        const cap=new THREE.Mesh(new THREE.SphereGeometry(0.55,10,8),toon(0x8B4513));
        cap.scale.set(1.2,0.7,1.2); cap.position.y=0.7; cap.castShadow=true; gg.add(cap);
        // Stem/body
        const stem=new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.4,0.5,8),toon(0xFFDDAA));
        stem.position.y=0.3; gg.add(stem);
        // Angry eyes
        [-1,1].forEach(function(s){
            var ew2=new THREE.Mesh(new THREE.SphereGeometry(0.12,6,4),toon(0xffffff));
            ew2.position.set(s*0.2,0.75,0.4); gg.add(ew2);
            var ep2=new THREE.Mesh(new THREE.SphereGeometry(0.07,4,4),toon(0x111111));
            ep2.position.set(s*0.2,0.73,0.48); gg.add(ep2);
            // Angry eyebrows
            var brow=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.04,0.04),toon(0x111111));
            brow.position.set(s*0.2,0.88,0.44); brow.rotation.z=s*0.4; gg.add(brow);
        });
        // Feet
        [-1,1].forEach(function(s){
            var ft=new THREE.Mesh(new THREE.SphereGeometry(0.15,6,4),toon(0x222222));
            ft.position.set(s*0.2,0.08,0); ft.scale.set(1,0.5,1.3); gg.add(ft);
        });
        gg.position.set(ox,fy,-oz);
        raceGroup.add(gg);
        obstacleObjects.push({type:'goomba',mesh:gg,data:{z:oz,fy:fy,x:ox,startX:ox,radius:0.6,walkDir:i%2===0?1:-1,walkRange:hw*0.6,walkSpeed:(0.02+ri*0.003)*sm,phase:i*Math.PI}});
    }
    // ---- Question Blocks (hit from below for coins/items) ----
    if(seg.type==='questionBlocks') for(var qi=0;qi<(seg.count||3);qi++){
        var qoz=seg.startZ+(qi+1)*len/((seg.count||3)+1);
        var qox=(qi%2===0?-1:1)*hw*0.2*(1+qi%3);
        var qbH=4; // height above floor
        var qg=new THREE.Group();
        // Yellow box body
        var qBox=new THREE.Mesh(new THREE.BoxGeometry(2,2,2),toon(0xFFCC00,{emissive:0xFFAA00,emissiveIntensity:0.2}));
        qg.add(qBox);
        // ? mark on front face (small white plane)
        var qMark=new THREE.Mesh(new THREE.PlaneGeometry(0.8,1.0),toon(0xFFFFFF,{side:THREE.DoubleSide}));
        qMark.position.set(0,0,1.01); qg.add(qMark);
        // ? mark on back
        var qMark2=new THREE.Mesh(new THREE.PlaneGeometry(0.8,1.0),toon(0xFFFFFF,{side:THREE.DoubleSide}));
        qMark2.position.set(0,0,-1.01); qg.add(qMark2);
        qg.position.set(qox,fy+qbH,-qoz);
        raceGroup.add(qg);
        obstacleObjects.push({type:'questionBlock',mesh:qg,data:{z:qoz,fy:fy,x:qox,baseY:fy+qbH,used:false,_bouncing:false,_bounceT:0,_coinMeshes:[]}});
        // Place a power-up item on top of every other ? block
        if(qi%2===0){
            var _itemTypes=['star','shield','magnet'];
            var _itemType=_itemTypes[qi%3];
            var _itemG=new THREE.Group();
            if(_itemType==='star'){
                // Gold star
                var _starCore=new THREE.Mesh(new THREE.OctahedronGeometry(0.5,0),toon(0xFFDD00,{emissive:0xFFAA00,emissiveIntensity:0.6}));
                _itemG.add(_starCore);
                var _starGlow=new THREE.Mesh(new THREE.SphereGeometry(0.6,8,6),toon(0xFFFF88,{transparent:true,opacity:0.3}));
                _itemG.add(_starGlow);
            } else if(_itemType==='shield'){
                // Blue transparent sphere
                var _shCore=new THREE.Mesh(new THREE.SphereGeometry(0.5,10,8),toon(0x4488FF,{transparent:true,opacity:0.5,emissive:0x2266CC,emissiveIntensity:0.3}));
                _itemG.add(_shCore);
            } else {
                // Red magnet (horseshoe shape = torus arc + cylinders)
                var _magArc=new THREE.Mesh(new THREE.TorusGeometry(0.35,0.1,6,10,Math.PI),toon(0xFF2222,{emissive:0xCC0000,emissiveIntensity:0.3}));
                _itemG.add(_magArc);
                var _magTip1=new THREE.Mesh(new THREE.SphereGeometry(0.12,6,4),toon(0xCCCCCC));
                _magTip1.position.set(-0.35,0,0); _itemG.add(_magTip1);
                var _magTip2=new THREE.Mesh(new THREE.SphereGeometry(0.12,6,4),toon(0xCCCCCC));
                _magTip2.position.set(0.35,0,0); _itemG.add(_magTip2);
            }
            _itemG.position.set(qox,fy+qbH+1.8,-qoz);
            raceGroup.add(_itemG);
            raceCoins.push({mesh:_itemG,z:qoz,x:qox,fy:fy+qbH+1.8,collected:false,bobPhase:qi*0.7,type:_itemType});
        }
    }
}
