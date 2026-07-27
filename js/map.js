// map.js — DANBO World Map System (MiniMap + World Map)
// Cute pastel, Kirby-ish, kid-friendly navigation. No realistic/military look.
// Reads existing globals (playerEgg, cityNPCs, cityCoins, cityChests, portals,
// warpPipeMeshes, currentCityStyle, CITY_STYLES, gameState) — no extra wiring needed.

var _mapVisited=(function(){try{var s=localStorage.getItem('danbo_map_v1');if(s)return JSON.parse(s)||{};}catch(e){}return {};})();
function _mapSaveVisited(){try{localStorage.setItem('danbo_map_v1',JSON.stringify(_mapVisited));}catch(e){}}
function _markCityVisited(key){ if(_mapVisited[key])return; _mapVisited[key]=true; _mapSaveVisited(); }

// ---- mini map state ----
var _miniCanvas=null,_miniCtx=null,_miniSize=200;
var _miniRanges=[25,50,100], _miniRangeIdx=1;     // default 50m
var _miniFollow=true;                              // default: rotate with player
window._worldMapOpen=false;

function _isMobileMap(){ return (window.innerWidth||1024)<700; }
function _mapMiniTop(){ return _isMobileMap()?76:10; }
function _mapMiniSize(){ return _isMobileMap()?118:200; }
function _mapButtonSize(){ return _isMobileMap()?42:40; }
function _layoutMapFloatingButtons(){
    var top=_mapMiniTop(), size=_mapMiniSize(), btn=_mapButtonSize();
    var wrap=document.getElementById('minimap-wrap');
    if(wrap){
        wrap.style.top=top+'px';wrap.style.right=(_isMobileMap()?8:10)+'px';
        wrap.style.width=size+'px';wrap.style.height=size+'px';
    }
    var mb=document.getElementById('map-btn');
    if(mb){
        mb.style.top=(top+size+10)+'px';mb.style.right=(_isMobileMap()?14:12)+'px';
        mb.style.width=btn+'px';mb.style.height=btn+'px';mb.style.lineHeight=btn+'px';
    }
    var lb=document.getElementById('lb-btn');
    if(lb){
        lb.style.top=(top+size+btn+18)+'px';lb.style.right=(_isMobileMap()?14:12)+'px';
        lb.style.width=btn+'px';lb.style.height=btn+'px';lb.style.lineHeight=btn+'px';
        lb.style.background='rgba(255,255,255,0.85)';lb.style.border='2px solid #FFD86B';lb.style.color='#B8860B';
    }
}

function _initMapUI(){
    if(_miniCanvas)return;
    _miniSize=_mapMiniSize();
    // mini-map
    var wrap=document.createElement('div');wrap.id='minimap-wrap';
    wrap.style.cssText='position:fixed;top:'+_mapMiniTop()+'px;right:'+(_isMobileMap()?8:10)+'px;z-index:54;width:'+_miniSize+'px;height:'+_miniSize+'px;'+
        'border-radius:50%;box-shadow:0 4px 18px rgba(0,0,0,0.35);border:4px solid #FFFFFF;background:#BFE8C8;cursor:pointer;overflow:hidden;';
    var cv=document.createElement('canvas');cv.width=_miniSize;cv.height=_miniSize;cv.style.cssText='width:100%;height:100%;display:block;';
    wrap.appendChild(cv);document.body.appendChild(wrap);
    _miniCanvas=cv;_miniCtx=cv.getContext('2d');
    // click = toggle follow/north rotation mode
    wrap.addEventListener('click',function(){_miniFollow=!_miniFollow;});
    // wheel = zoom 25/50/100
    wrap.addEventListener('wheel',function(e){e.preventDefault();_miniRangeIdx=(_miniRangeIdx+(e.deltaY>0?1:-1)+_miniRanges.length)%_miniRanges.length;},{passive:false});

    // buttons (stacked under the mini-map): world map + reuse leaderboard
    var mb=document.createElement('div');mb.id='map-btn';mb.textContent='\uD83D\uDDFA\uFE0F';
    var btn=_mapButtonSize();
    mb.style.cssText='position:fixed;top:'+(_mapMiniTop()+_miniSize+10)+'px;right:'+(_isMobileMap()?14:12)+'px;z-index:55;width:'+btn+'px;height:'+btn+'px;border-radius:12px;'+
        'background:rgba(255,255,255,0.85);border:2px solid #FFB6CE;color:#444;font-size:21px;line-height:'+btn+'px;text-align:center;cursor:pointer;user-select:none;box-shadow:0 2px 8px rgba(0,0,0,0.2);';
    mb.onclick=_toggleWorldMap;document.body.appendChild(mb);
    var lb=document.getElementById('lb-btn');
    if(lb)_layoutMapFloatingButtons();
}

// ---- per-frame mini map draw ----
function _miniProject(dx,dz,ry,ppm,cx,cy){
    var sx,sy;
    if(_miniFollow){
        var ahead=dx*Math.sin(ry)+dz*Math.cos(ry);
        var side =dx*Math.cos(ry)-dz*Math.sin(ry);
        sx=cx+side*ppm; sy=cy-ahead*ppm;
    } else { sx=cx+dx*ppm; sy=cy+dz*ppm; }
    return [sx,sy];
}
function _updateMiniMap(){
    if(!_miniCanvas)_initMapUI();
    if(!_miniCanvas||typeof playerEgg==='undefined'||!playerEgg||!playerEgg.mesh)return;
    var desired=_mapMiniSize();
    if(desired!==_miniSize){
        _miniSize=desired;
        _miniCanvas.width=_miniSize;_miniCanvas.height=_miniSize;
    }
    _layoutMapFloatingButtons();
    _markCityVisited('c'+currentCityStyle);
    if(currentCityStyle<=4&&playerEgg.mesh.position.y>40)_markCityVisited('cloud');

    var S=_miniSize, cx=S/2, cy=S/2, R=S/2-8;
    var range=_miniRanges[_miniRangeIdx], ppm=R/range;
    var ctx=_miniCtx; ctx.clearRect(0,0,S,S);
    // soft pastel background disc
    ctx.save();ctx.beginPath();ctx.arc(cx,cy,R+6,0,Math.PI*2);ctx.clip();
    ctx.fillStyle='#CFEFD8';ctx.fillRect(0,0,S,S);
    // faint grid rings
    ctx.strokeStyle='rgba(255,255,255,0.5)';ctx.lineWidth=1;
    for(var rr=1;rr<=2;rr++){ctx.beginPath();ctx.arc(cx,cy,R*rr/2,0,Math.PI*2);ctx.stroke();}

    var px=playerEgg.mesh.position.x, pz=playerEgg.mesh.position.z, ry=playerEgg.mesh.rotation.y;
    function plotPoint(ex,ez,color,rad){
        var dx=ex-px,dz=ez-pz; if(dx*dx+dz*dz>range*range)return null;
        var p=_miniProject(dx,dz,ry,ppm,cx,cy);
        ctx.fillStyle=color;ctx.beginPath();ctx.arc(p[0],p[1],rad,0,Math.PI*2);ctx.fill();return p;
    }
    function plotIcon(ex,ez,emoji,ignoreRange){
        var dx=ex-px,dz=ez-pz; if(!ignoreRange&&dx*dx+dz*dz>range*range)return;
        var p=_miniProject(dx,dz,ry,ppm,cx,cy);
        // clamp to ring edge so off-range markers still hint direction
        var ddx=p[0]-cx,ddy=p[1]-cy,dd=Math.sqrt(ddx*ddx+ddy*ddy);
        if(dd>R){p[0]=cx+ddx/dd*R;p[1]=cy+ddy/dd*R;}
        ctx.font='16px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(emoji,p[0],p[1]);
    }
    // coins (yellow)
    if(typeof cityCoins!=='undefined')for(var i=0;i<cityCoins.length;i++){var c=cityCoins[i];if(c.collected||!c.mesh)continue;plotPoint(c.mesh.position.x,c.mesh.position.z,'#FFD23F',1.8);}
    // city NPCs (blue)
    if(typeof cityNPCs!=='undefined')for(var n=0;n<cityNPCs.length;n++){var npc=cityNPCs[n];if(npc&&npc.mesh)plotPoint(npc.mesh.position.x,npc.mesh.position.z,'#4FA3FF',2.4);}
    // chests (gold box) — show if within range OR already opened/discovered
    if(typeof cityChests!=='undefined')for(var h=0;h<cityChests.length;h++){var ch=cityChests[h];if(!ch)continue;var dx=ch.x-px,dz=ch.z-pz;var near=(dx*dx+dz*dz<=2500);/*50m*/ if(near||ch.opened)plotIcon(ch.x,ch.z,ch.opened?'\u2705':'\uD83D\uDCE6');}
    // warp pipes (🚪) and race portals (🏁)
    if(typeof warpPipeMeshes!=='undefined')for(var w=0;w<warpPipeMeshes.length;w++){var wp=warpPipeMeshes[w];if(wp)plotIcon(wp.x,wp.z,'\uD83D\uDEAA',true);}
    if(typeof portals!=='undefined')for(var po=0;po<portals.length;po++){var pt=portals[po];if(pt&&typeof pt.x==='number')plotIcon(pt.x,pt.z,'\uD83C\uDFC1',true);}

    // player arrow (green) at centre
    ctx.save();ctx.translate(cx,cy);
    if(!_miniFollow)ctx.rotate(ry); // north-up: arrow shows heading
    ctx.fillStyle='#2ECC71';ctx.strokeStyle='#fff';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(6,7);ctx.lineTo(0,3);ctx.lineTo(-6,7);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.restore();
    ctx.restore(); // unclip

    // white ring + range/mode label
    ctx.strokeStyle='#FFFFFF';ctx.lineWidth=4;ctx.beginPath();ctx.arc(cx,cy,R+4,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='rgba(60,60,80,0.75)';ctx.font='bold 11px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText(range+'m '+(_miniFollow?'\u25B2':'N'),cx,S-6);
}

// ============================================================
//  WORLD MAP (M key / map button) — node graph, cute pastel
// ============================================================
var _WORLD_NODES=[
    {key:'c0',style:0,x:0.50,y:0.56},
    {key:'c1',style:1,x:0.20,y:0.70},
    {key:'c2',style:2,x:0.80,y:0.70},
    {key:'c3',style:3,x:0.33,y:0.86},
    {key:'c4',style:4,x:0.67,y:0.86},
    {key:'c6',style:6,x:0.14,y:0.42},
    {key:'c7',style:7,x:0.86,y:0.42},
    {key:'cloud',style:'cloud',x:0.50,y:0.32},
    {key:'c5',style:5,x:0.50,y:0.12}
];
var _WORLD_LINKS=[['c0','c1'],['c0','c2'],['c0','c3'],['c0','c4'],['c0','c6'],['c0','c7'],['c0','cloud'],['cloud','c5']];
function _worldNodeName(node){
    if(node.style==='cloud')return '\u2601\uFE0F \u4E91\u4E2D\u754C';
    return (typeof CITY_STYLES!=='undefined'&&CITY_STYLES[node.style])?CITY_STYLES[node.style].name:('City'+node.style);
}
function _worldNodeVisited(node){ return !!_mapVisited[node.key]; }
function _worldNodeIsCurrent(node){
    if(node.style==='cloud')return (currentCityStyle<=4&&playerEgg&&playerEgg.mesh&&playerEgg.mesh.position.y>40);
    return node.style===currentCityStyle;
}
function _toggleWorldMap(){
    var ex=document.getElementById('worldmap-overlay');
    if(ex){_closeWorldMap();return;}
    window._worldMapOpen=true;
    var ov=document.createElement('div');ov.id='worldmap-overlay';
    ov.style.cssText='position:fixed;inset:0;z-index:140;display:flex;align-items:center;justify-content:center;'+
        'background:rgba(30,28,50,0.55);backdrop-filter:blur(2px);';
    var sz=Math.min(window.innerWidth,window.innerHeight)*0.82; sz=Math.min(sz,560);
    var panel=document.createElement('div');
    panel.style.cssText='position:relative;width:'+sz+'px;max-width:92vw;border-radius:24px;padding:14px;'+
        'background:linear-gradient(160deg,#FFF3FA,#EAF6FF);border:4px solid #FFB6CE;box-shadow:0 12px 50px rgba(0,0,0,0.4);'+
        'font-family:system-ui,Segoe UI,sans-serif;';
    var curName=(typeof CITY_STYLES!=='undefined'&&CITY_STYLES[currentCityStyle])?CITY_STYLES[currentCityStyle].name:'';
    var head='<div style="text-align:center;font-size:20px;font-weight:800;color:#E66AA0;margin:2px 0 8px;">\uD83D\uDDFA\uFE0F \u4E16\u754C\u5730\u56FE</div>'+
        '<div style="text-align:center;font-size:13px;color:#6a6a80;margin-bottom:8px;">\u5F53\u524D\u4F4D\u4E8E\uFF1A<b style="color:#E66AA0;">'+curName+'</b></div>';
    var cvSize=sz-28;
    panel.innerHTML=head+'<canvas id="worldmap-canvas" width="'+cvSize+'" height="'+cvSize+'" style="width:100%;display:block;"></canvas>'+
        '<div style="text-align:center;margin-top:6px;font-size:12px;color:#8a8aa0;">M \u952E \u6216 \u70B9\u51FB\u5173\u95ED \u00B7 \u672A\u5230\u8FBE\u57CE\u5E02\u663E\u793A ???</div>';
    ov.appendChild(panel);document.body.appendChild(ov);
    ov.addEventListener('click',function(e){if(e.target===ov)_closeWorldMap();});
    _drawWorldMap(cvSize);
}
function _closeWorldMap(){
    var ov=document.getElementById('worldmap-overlay');
    if(ov&&ov.parentNode)ov.parentNode.removeChild(ov);
    window._worldMapOpen=false;
}
function _drawWorldMap(size){
    var cv=document.getElementById('worldmap-canvas');if(!cv)return;
    var ctx=cv.getContext('2d');ctx.clearRect(0,0,size,size);
    function P(node){return [node.x*size,node.y*size];}
    var byKey={};_WORLD_NODES.forEach(function(n){byKey[n.key]=n;});
    // links
    ctx.strokeStyle='#F6C9DD';ctx.lineWidth=Math.max(4,size*0.012);ctx.lineCap='round';
    _WORLD_LINKS.forEach(function(l){var a=byKey[l[0]],b=byKey[l[1]];if(!a||!b)return;var pa=P(a),pb=P(b);ctx.beginPath();ctx.moveTo(pa[0],pa[1]);ctx.lineTo(pb[0],pb[1]);ctx.stroke();});
    // nodes
    var r=Math.max(22,size*0.072);
    _WORLD_NODES.forEach(function(n){
        var p=P(n),vis=_worldNodeVisited(n),cur=_worldNodeIsCurrent(n);
        ctx.beginPath();ctx.arc(p[0],p[1],r,0,Math.PI*2);
        ctx.fillStyle=cur?'#FFE08A':(vis?'#FFFFFF':'#D8D8E2');
        ctx.fill();
        ctx.lineWidth=cur?5:3;ctx.strokeStyle=cur?'#FF9F1C':(vis?'#FFB6CE':'#B9B9C8');ctx.stroke();
        if(cur){ctx.save();ctx.shadowColor='rgba(255,159,28,0.7)';ctx.shadowBlur=18;ctx.beginPath();ctx.arc(p[0],p[1],r,0,Math.PI*2);ctx.strokeStyle='#FF9F1C';ctx.lineWidth=3;ctx.stroke();ctx.restore();}
        // label
        ctx.textAlign='center';ctx.textBaseline='middle';
        if(vis){
            var nm=_worldNodeName(n);
            ctx.font='bold '+Math.round(r*0.62)+'px serif';ctx.fillText(nm.split(' ')[0],p[0],p[1]-r*0.12); // emoji
            ctx.font='bold '+Math.round(r*0.34)+'px system-ui,sans-serif';ctx.fillStyle=cur?'#9A5A00':'#555';
            ctx.fillText(nm.replace(/^\S+\s*/,''),p[0],p[1]+r*0.5);
        } else {
            ctx.fillStyle='#888';ctx.font='bold '+Math.round(r*0.8)+'px system-ui,sans-serif';ctx.fillText('???',p[0],p[1]);
        }
    });
}

// keyboard: M toggles world map
window.addEventListener('keydown',function(e){
    if((e.code==='KeyM'||e.key==='m'||e.key==='M')&&typeof gameState!=='undefined'&&gameState==='city'){
        e.preventDefault();_toggleWorldMap();
    }
});
