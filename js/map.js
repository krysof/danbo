// map.js — DANBO World Map System (MiniMap + World Map)
// Cute pastel, Kirby-ish, kid-friendly navigation. No realistic/military look.
// Reads existing globals (playerEgg, cityNPCs, cityCoins, cityChests, portals,
// warpPipeMeshes, currentCityStyle, CITY_STYLES, gameState) — no extra wiring needed.

var _mapVisited=(function(){try{var s=localStorage.getItem('danbo_map_v1');if(s)return JSON.parse(s)||{};}catch(e){}return {};})();
function _mapSaveVisited(){try{localStorage.setItem('danbo_map_v1',JSON.stringify(_mapVisited));}catch(e){}}
function _markCityVisited(key){ if(_mapVisited[key])return; _mapVisited[key]=true; _mapSaveVisited(); }

// ---- mini map state ----
var _miniCanvas=null,_miniCtx=null,_miniSize=216,_miniDpr=1,_miniLastDraw=0;
var _miniRanges=[25,50,100], _miniRangeIdx=1;     // default 50m
// Navigation rule: the top of the mini-map is always geographic north.
// The map never rotates; only the player arrow shows the current heading.
var _miniFollow=false;
window._worldMapOpen=false;

function _isMobileMap(){ return (window.innerWidth||1024)<700; }
function _mapMiniTop(){ return _isMobileMap()?76:10; }
function _mapMiniSize(){ return _isMobileMap()?126:216; }
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
    var wrap=document.createElement('div');wrap.id='minimap-wrap';wrap.title='Mini Map · North Up';
    wrap.style.cssText='position:fixed;top:'+_mapMiniTop()+'px;right:'+(_isMobileMap()?8:10)+'px;z-index:54;width:'+_miniSize+'px;height:'+_miniSize+'px;'+
        'border-radius:50%;box-sizing:border-box;box-shadow:0 10px 28px rgba(20,31,45,.35),0 2px 7px rgba(0,0,0,.30),inset 0 2px 2px rgba(255,255,255,.85);'+
        'border:3px solid rgba(255,250,232,.96);background:linear-gradient(145deg,#F7E7B4 0%,#B47B3B 48%,#603A25 100%);cursor:pointer;overflow:hidden;';
    var cv=document.createElement('canvas');cv.style.cssText='width:100%;height:100%;display:block;border-radius:50%;';
    wrap.appendChild(cv);document.body.appendChild(wrap);
    _miniCanvas=cv;_miniCtx=cv.getContext('2d');
    // North-up is intentionally locked. Clicking the map cycles its range instead
    // of rotating the world, which keeps navigation orientation predictable.
    wrap.addEventListener('click',function(){_miniFollow=false;_miniRangeIdx=(_miniRangeIdx+1)%_miniRanges.length;});
    // wheel = zoom 25/50/100
    wrap.addEventListener('wheel',function(e){e.preventDefault();_miniRangeIdx=(_miniRangeIdx+(e.deltaY>0?1:-1)+_miniRanges.length)%_miniRanges.length;},{passive:false});

    // buttons (stacked under the mini-map): world map + reuse leaderboard
    var mb=document.createElement('div');mb.id='map-btn';mb.innerHTML='<span style="display:block;font-size:14px;line-height:15px;margin-top:5px;">\u25C8</span><span style="display:block;font-size:8px;font-weight:900;line-height:10px;letter-spacing:.4px;">MAP</span>';
    var btn=_mapButtonSize();
    mb.style.cssText='position:fixed;top:'+(_mapMiniTop()+_miniSize+10)+'px;right:'+(_isMobileMap()?14:12)+'px;z-index:55;width:'+btn+'px;height:'+btn+'px;border-radius:12px;'+
        'background:linear-gradient(145deg,#FFF9E8,#E9C77A);border:2px solid #8B5D2F;color:#5D3B24;font-size:17px;line-height:'+btn+'px;text-align:center;cursor:pointer;user-select:none;'+
        'box-shadow:0 5px 12px rgba(22,30,40,.26),inset 0 2px 2px rgba(255,255,255,.9);font-family:system-ui,Segoe UI,sans-serif;';
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
function _miniTheme(style){
    return [
        {top:'#A9E5D8',bottom:'#5AA9A2',land:'#B8D9A2',land2:'#8EBE82',path:'#E6D2AE',pathEdge:'#987A57',water:'#61BDD1',waterHi:'#B9F5F1',roof:'#C96F55',roof2:'#E9A06F',accent:'#F7C65B',ink:'#315A57',icon:'\u2726'},
        {top:'#F7D993',bottom:'#C68A45',land:'#E8BE70',land2:'#C79048',path:'#F3DEAD',pathEdge:'#A66B36',water:'#58AFC6',waterHi:'#BCEBF0',roof:'#B96B3F',roof2:'#E8A45A',accent:'#FFD164',ink:'#65452B',icon:'\u25C6'},
        {top:'#DDF7FF',bottom:'#73B7D2',land:'#BEE9ED',land2:'#88C9D5',path:'#F4FCFA',pathEdge:'#759EAB',water:'#4EA6CF',waterHi:'#D7FBFF',roof:'#6E98C8',roof2:'#B6D6ED',accent:'#D9F7FF',ink:'#385B74',icon:'\u2744'},
        {top:'#63545B',bottom:'#221E2A',land:'#4B3C43',land2:'#302932',path:'#78615A',pathEdge:'#241E24',water:'#FF6A37',waterHi:'#FFD061',roof:'#8F3A31',roof2:'#D86A3F',accent:'#FF9A4D',ink:'#FFF0D6',icon:'\u25B2'},
        {top:'#FFE2F0',bottom:'#C986B5',land:'#F1BBD3',land2:'#D996BC',path:'#FFF1CB',pathEdge:'#B97596',water:'#8CCBE4',waterHi:'#E3F9FF',roof:'#B66EAA',roof2:'#F2A2C8',accent:'#FFE066',ink:'#724865',icon:'\u2665'},
        {top:'#273B5B',bottom:'#0D1427',land:'#394860',land2:'#232D43',path:'#68758A',pathEdge:'#111827',water:'#4B78B8',waterHi:'#A8D4FF',roof:'#74849B',roof2:'#B5C3D4',accent:'#F3C96A',ink:'#EAF4FF',icon:'\u25D0'},
        {top:'#FFE8EF',bottom:'#C9879F',land:'#E9B9C5',land2:'#C9909F',path:'#FFF1DF',pathEdge:'#A86F78',water:'#65B4D0',waterHi:'#D4F7FF',roof:'#B96E76',roof2:'#E3A19D',accent:'#FFD4DF',ink:'#724C58',icon:'\u273F'},
        {top:'#F4FCFF',bottom:'#9ECBD8',land:'#E8F3F1',land2:'#BEDBDA',path:'#FFFFFF',pathEdge:'#91A8AD',water:'#579FC2',waterHi:'#D8F8FF',roof:'#738FA6',roof2:'#B8D2DE',accent:'#EAFDFF',ink:'#45636E',icon:'\u2732'}
    ][style]||{top:'#D8E7E4',bottom:'#789895',land:'#BFD1C7',land2:'#90A99B',path:'#ECE2CE',pathEdge:'#756B5A',water:'#62AFC0',waterHi:'#D5F7F5',roof:'#A46E57',roof2:'#D99A78',accent:'#F4CF69',ink:'#405B58',icon:'\u2726'};
}
function _miniRoundRect(ctx,x,y,w,h,r){
    r=Math.max(0,Math.min(r,w/2,h/2));ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}
function _miniDrawMarker(ctx,type,x,y,scale,theme){
    scale=scale||1;ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.shadowColor='rgba(15,24,35,.42)';ctx.shadowBlur=3;ctx.shadowOffsetY=2;
    if(type==='chest'){
        ctx.fillStyle='#7A4A28';_miniRoundRect(ctx,-7,-2,14,9,2);ctx.fill();ctx.fillStyle='#F4B83E';_miniRoundRect(ctx,-7,-5,14,6,3);ctx.fill();ctx.fillStyle='#FFF0A0';ctx.fillRect(-5,-4,10,1.5);ctx.fillStyle='#6C4427';ctx.fillRect(-1.4,-1,2.8,7);
    }else if(type==='opened'){
        ctx.fillStyle='#53B982';ctx.beginPath();ctx.arc(0,0,7,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#FFF';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-3,0);ctx.lineTo(-.5,3);ctx.lineTo(4,-3);ctx.stroke();
    }else if(type==='portal'){
        ctx.fillStyle=theme.accent;ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(7,0);ctx.lineTo(0,8);ctx.lineTo(-7,0);ctx.closePath();ctx.fill();ctx.strokeStyle='#FFF8DF';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle=theme.ink;ctx.beginPath();ctx.arc(0,0,2.3,0,Math.PI*2);ctx.fill();
    }else if(type==='shop'){
        ctx.fillStyle='#F5A68E';_miniRoundRect(ctx,-8,-4,16,11,3);ctx.fill();
        ctx.fillStyle='#FFF0CF';ctx.beginPath();ctx.moveTo(-9,-4);ctx.lineTo(0,-10);ctx.lineTo(9,-4);ctx.closePath();ctx.fill();
        ctx.fillStyle='#8C5945';_miniRoundRect(ctx,-2,1,4,6,1);ctx.fill();
        ctx.strokeStyle='#FFF8E6';ctx.lineWidth=1.4;ctx.strokeRect(-8,-4,16,11);
    }else{
        ctx.strokeStyle='#FFF8E6';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-5,7);ctx.lineTo(-5,-7);ctx.stroke();ctx.fillStyle='#F0645A';ctx.beginPath();ctx.moveTo(-4,-6);ctx.lineTo(7,-3);ctx.lineTo(-4,1);ctx.closePath();ctx.fill();ctx.strokeStyle='#8B3E35';ctx.lineWidth=1;ctx.stroke();
    }
    ctx.restore();
}
function _updateMiniMapLegacy(){
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
    var legacyShop=typeof _shopDefinition==='function'?_shopDefinition():null;
    if(legacyShop&&(!legacyShop.shop||legacyShop.shop.showMapIcon!==false))plotIcon(legacyShop.x,legacyShop.z,'\uD83C\uDFEA',true);

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

// Cinematic miniature-map renderer. It keeps the original controls, but replaces
// the flat dots and emoji with the actual streets, buildings, water and landmarks.
function _updateMiniMap(){
    if(!_miniCanvas)_initMapUI();
    if(!_miniCanvas||typeof playerEgg==='undefined'||!playerEgg||!playerEgg.mesh)return;
    var drawNow=(typeof performance!=='undefined'?performance.now():Date.now());
    // Preserve the original refresh rate: performance gains come from WebGL
    // submission batching, not from reducing the map's temporal quality.
    var drawInterval=(window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.low)?100:50;
    if(drawNow-_miniLastDraw<drawInterval)return;
    _miniLastDraw=drawNow;
    var desired=_mapMiniSize(),desiredDpr=(window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.low)?1:Math.min(2,window.devicePixelRatio||1);
    if(desired!==_miniSize||desiredDpr!==_miniDpr||_miniCanvas.width!==Math.round(desired*desiredDpr)){
        _miniSize=desired;_miniDpr=desiredDpr;_miniCanvas.width=Math.round(_miniSize*_miniDpr);_miniCanvas.height=Math.round(_miniSize*_miniDpr);
    }
    _layoutMapFloatingButtons();_markCityVisited('c'+currentCityStyle);
    if(currentCityStyle<=4&&playerEgg.mesh.position.y>40)_markCityVisited('cloud');

    var S=_miniSize,cx=S/2,cy=S/2,R=S/2-12,range=_miniRanges[_miniRangeIdx],ppm=R/range;
    var ctx=_miniCtx;ctx.setTransform(_miniDpr,0,0,_miniDpr,0,0);ctx.clearRect(0,0,S,S);
    var px=playerEgg.mesh.position.x,pz=playerEgg.mesh.position.z,ry=playerEgg.mesh.rotation.y;
    var theme=_miniTheme(currentCityStyle),low=window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.low;
    function projectWorld(ex,ez){return _miniProject(ex-px,ez-pz,ry,ppm,cx,cy);}
    function plotPoint(ex,ez,color,rad){
        var dx=ex-px,dz=ez-pz;if(dx*dx+dz*dz>range*range)return null;
        var p=projectWorld(ex,ez);ctx.fillStyle=color;ctx.beginPath();ctx.arc(p[0],p[1],rad,0,Math.PI*2);ctx.fill();return p;
    }
    function polygonRect(ex,ez,hw,hd,fill,stroke){
        if((ex-px)*(ex-px)+(ez-pz)*(ez-pz)>Math.pow(range+Math.max(hw,hd)*1.5,2))return false;
        var corners=[[ex-hw,ez-hd],[ex+hw,ez-hd],[ex+hw,ez+hd],[ex-hw,ez+hd]].map(function(q){return projectWorld(q[0],q[1]);});
        ctx.beginPath();ctx.moveTo(corners[0][0],corners[0][1]);for(var ci=1;ci<4;ci++)ctx.lineTo(corners[ci][0],corners[ci][1]);ctx.closePath();
        ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}return true;
    }
    function plotIcon(ex,ez,type,ignoreRange){
        var dx=ex-px,dz=ez-pz;if(!ignoreRange&&dx*dx+dz*dz>range*range)return;
        var p=projectWorld(ex,ez),ddx=p[0]-cx,ddy=p[1]-cy,dd=Math.sqrt(ddx*ddx+ddy*ddy);
        if(dd>R-8){p[0]=cx+ddx/dd*(R-8);p[1]=cy+ddy/dd*(R-8);}
        _miniDrawMarker(ctx,type,p[0],p[1],_isMobileMap()?.78:1,theme);
    }
    function strokeWorldLine(points,width,color,edge){
        ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=edge||color;ctx.lineWidth=edge?width+2.5:width;ctx.beginPath();
        for(var li=0;li<points.length;li++){var lp=projectWorld(points[li][0],points[li][1]);if(li)ctx.lineTo(lp[0],lp[1]);else ctx.moveTo(lp[0],lp[1]);}ctx.stroke();
    }

    ctx.save();ctx.beginPath();ctx.arc(cx,cy,R+5,0,Math.PI*2);ctx.clip();
    var bg=ctx.createLinearGradient(0,0,S,S);bg.addColorStop(0,theme.top);bg.addColorStop(1,theme.bottom);ctx.fillStyle=bg;ctx.fillRect(0,0,S,S);
    var landGlow=ctx.createRadialGradient(cx-R*.28,cy-R*.36,R*.05,cx,cy,R*1.15);landGlow.addColorStop(0,theme.land);landGlow.addColorStop(.72,theme.land2);landGlow.addColorStop(1,theme.bottom);ctx.fillStyle=landGlow;ctx.fillRect(0,0,S,S);
    if(!low){
        ctx.globalAlpha=.16;
        for(var patch=0;patch<9;patch++){
            var pa=patch*2.399+currentCityStyle*.31,pr=R*(.18+(patch%4)*.12),gx=cx+Math.cos(pa)*R*.58,gy=cy+Math.sin(pa)*R*.58;
            var pg=ctx.createRadialGradient(gx,gy,0,gx,gy,pr);pg.addColorStop(0,patch%2?'#FFFFFF':'#243640');pg.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=pg;ctx.fillRect(0,0,S,S);
        }
        ctx.globalAlpha=1;
    }
    ctx.strokeStyle='rgba(255,255,255,.20)';ctx.lineWidth=1;
    for(var rr=1;rr<=3;rr++){ctx.beginPath();ctx.arc(cx,cy,R*rr/3,0,Math.PI*2);ctx.stroke();}
    ctx.strokeStyle='rgba(25,42,50,.10)';ctx.setLineDash([2,5]);ctx.beginPath();ctx.arc(cx-R*.17,cy+R*.08,R*.72,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    // Each kingdom carries a restrained terrain motif beneath its real geometry.
    ctx.save();ctx.globalAlpha=low?.18:.28;ctx.lineCap='round';ctx.lineJoin='round';
    if(currentCityStyle===1){
        ctx.strokeStyle='#FFF0B9';ctx.lineWidth=2;
        for(var dune=0;dune<4;dune++){ctx.beginPath();ctx.arc(cx-35+dune*21,cy-12+dune*16,30+dune*3,.18,2.76);ctx.stroke();}
    }else if(currentCityStyle===2){
        ctx.strokeStyle='#F4FFFF';ctx.lineWidth=1.4;
        [[20,54,61,83,47,119],[178,57,145,83,164,119],[36,150,72,128,91,177]].forEach(function(q){ctx.beginPath();ctx.moveTo(q[0],q[1]);ctx.lineTo(q[2],q[3]);ctx.lineTo(q[4],q[5]);ctx.stroke();});
    }else if(currentCityStyle===3){
        ctx.strokeStyle='#FF9A4D';ctx.lineWidth=5;ctx.shadowColor='#FF5A27';ctx.shadowBlur=7;
        [[18,62,65,78,88,116],[190,62,152,91,126,132],[43,174,80,143,102,110]].forEach(function(q){ctx.beginPath();ctx.moveTo(q[0],q[1]);ctx.quadraticCurveTo(q[2],q[3],q[4],q[5]);ctx.stroke();});
        ctx.shadowColor='transparent';ctx.fillStyle='rgba(255,185,81,.32)';ctx.beginPath();ctx.arc(cx,cy,18,0,Math.PI*2);ctx.fill();
    }else if(currentCityStyle===4){
        ctx.strokeStyle='#FFF1CB';ctx.lineWidth=2.2;
        for(var swirl=0;swirl<3;swirl++){ctx.beginPath();ctx.arc(cx+(swirl-1)*45,cy+(swirl%2?30:-25),18+swirl*4,0,Math.PI*1.7);ctx.stroke();}
    }
    ctx.restore();

    if(currentCityStyle===0){
        [[[-150,0],[150,0]],[[0,-150],[0,150]]].forEach(function(line){strokeWorldLine(line,5,theme.water,theme.pathEdge);strokeWorldLine(line,3.2,theme.water);});
        [25,55].forEach(function(rad){var pts=[];for(var ai=0;ai<=64;ai++){var aa=ai/64*Math.PI*2;pts.push([Math.cos(aa)*rad,Math.sin(aa)*rad]);}strokeWorldLine(pts,5,theme.water,theme.pathEdge);strokeWorldLine(pts,3.2,theme.water);});
    }else if(currentCityStyle===6){
        strokeWorldLine([[0,-170],[0,170]],9,theme.water,theme.pathEdge);strokeWorldLine([[0,-170],[0,170]],6.4,theme.water);
    }else if(currentCityStyle===7){
        var snowLake=[];for(var sli=0;sli<=64;sli++){var sla=sli/64*Math.PI*2;snowLake.push([Math.cos(sla)*38,Math.sin(sla)*38]);}strokeWorldLine(snowLake,5,theme.water,theme.waterHi);strokeWorldLine(snowLake,3,theme.water);
    }else if(currentCityStyle===5){
        [[-200,0,28],[-200,-200,19]].forEach(function(cr){var cp=projectWorld(cr[0],cr[1]),sr=cr[2]*ppm;ctx.fillStyle='rgba(13,20,39,.26)';ctx.beginPath();ctx.arc(cp[0],cp[1],sr,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(208,229,255,.28)';ctx.lineWidth=2;ctx.stroke();});
    }
    var paths=typeof _getCityPaths==='function'?_getCityPaths(currentCityStyle):null;
    if(paths)for(var pi=0;pi<paths.length;pi++){
        var path=paths[pi];polygonRect(path.x,path.z,path.w/2,path.d/2,theme.path,theme.pathEdge);
        var pe1=path.w>path.d?projectWorld(path.x-path.w*.36,path.z):projectWorld(path.x,path.z-path.d*.36);
        var pe2=path.w>path.d?projectWorld(path.x+path.w*.36,path.z):projectWorld(path.x,path.z+path.d*.36);
        ctx.strokeStyle='rgba(255,255,255,.32)';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(pe1[0],pe1[1]);ctx.lineTo(pe2[0],pe2[1]);ctx.stroke();
    }
    if(typeof cityBuildingMeshes!=='undefined')for(var bi=0;bi<cityBuildingMeshes.length;bi++){
        var bld=cityBuildingMeshes[bi],shade=bi%3===0?theme.roof2:theme.roof;
        ctx.save();ctx.shadowColor='rgba(20,28,36,.34)';ctx.shadowBlur=2.5;ctx.shadowOffsetY=2;
        if(polygonRect(bld.x,bld.z,Math.max(.8,bld.hw),Math.max(.8,bld.hd),shade,'rgba(255,248,222,.62)')){
            var re1=bld.hw>=bld.hd?projectWorld(bld.x-bld.hw*.72,bld.z):projectWorld(bld.x,bld.z-bld.hd*.72);
            var re2=bld.hw>=bld.hd?projectWorld(bld.x+bld.hw*.72,bld.z):projectWorld(bld.x,bld.z+bld.hd*.72);
            ctx.shadowColor='transparent';ctx.strokeStyle='rgba(95,55,39,.42)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(re1[0],re1[1]);ctx.lineTo(re2[0],re2[1]);ctx.stroke();
        }
        ctx.restore();
    }
    if(typeof cityProps!=='undefined')for(var ti=0,drawn=0;ti<cityProps.length&&drawn<(low?34:72);ti++){
        var tree=cityProps[ti];if(!tree||tree.type!=='tree'||!tree.group)continue;
        var tp=projectWorld(tree.group.position.x,tree.group.position.z),tdx=tp[0]-cx,tdy=tp[1]-cy;if(tdx*tdx+tdy*tdy>R*R)continue;drawn++;
        ctx.fillStyle='rgba(28,52,37,.32)';ctx.beginPath();ctx.ellipse(tp[0]+1.2,tp[1]+1.8,3.7,2.4,0,0,Math.PI*2);ctx.fill();
        var tg=ctx.createRadialGradient(tp[0]-1,tp[1]-1,0,tp[0],tp[1],3.8);tg.addColorStop(0,'#A8D878');tg.addColorStop(.45,'#4C9B57');tg.addColorStop(1,'#286548');ctx.fillStyle=tg;ctx.beginPath();ctx.arc(tp[0],tp[1],3.5,0,Math.PI*2);ctx.fill();
    }
    if(currentCityStyle===0){
        var fountainDef=typeof _hopeFountainDefinition==='function'?_hopeFountainDefinition():{x:0,z:0,scale:1};
        var showFountain=fountainDef&&(!fountainDef.map||fountainDef.map.showIcon!==false);
        if(showFountain){
            var fountainScale=Math.max(.8,Math.min(1.25,Number(fountainDef.scale)||1));
            var fp=projectWorld(Number(fountainDef.x)||0,Number(fountainDef.z)||0);
            ctx.fillStyle=theme.waterHi;ctx.strokeStyle='#F8E7C5';ctx.lineWidth=2.2;ctx.beginPath();ctx.arc(fp[0],fp[1],7.2*fountainScale,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=theme.water;ctx.beginPath();ctx.arc(fp[0],fp[1],4.8*fountainScale,0,Math.PI*2);ctx.fill();ctx.fillStyle=theme.accent;ctx.beginPath();ctx.arc(fp[0],fp[1],1.8*fountainScale,0,Math.PI*2);ctx.fill();
        }
    }
    if(typeof cityCoins!=='undefined')for(var i=0;i<cityCoins.length;i++){var c=cityCoins[i];if(c.collected||!c.mesh)continue;var coin=plotPoint(c.mesh.position.x,c.mesh.position.z,'#FFE06B',1.8);if(coin){ctx.strokeStyle='#9B6E1D';ctx.lineWidth=.7;ctx.stroke();}}
    if(typeof cityNPCs!=='undefined')for(var n=0;n<cityNPCs.length;n++){var npc=cityNPCs[n];if(npc&&npc.mesh){var np=plotPoint(npc.mesh.position.x,npc.mesh.position.z,'#63C6FF',2.2);if(np){ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=.8;ctx.stroke();}}}
    if(typeof cityChests!=='undefined')for(var h=0;h<cityChests.length;h++){var ch=cityChests[h];if(!ch)continue;var dx=ch.x-px,dz=ch.z-pz,near=(dx*dx+dz*dz<=2500);if(near||ch.opened)plotIcon(ch.x,ch.z,ch.opened?'opened':'chest');}
    if(typeof warpPipeMeshes!=='undefined')for(var w=0;w<warpPipeMeshes.length;w++){var wp=warpPipeMeshes[w];if(wp)plotIcon(wp.x,wp.z,'portal',true);}
    if(typeof portals!=='undefined')for(var po=0;po<portals.length;po++){var pt=portals[po];if(pt&&typeof pt.x==='number')plotIcon(pt.x,pt.z,'race',true);}
    var mapShop=typeof _shopDefinition==='function'?_shopDefinition():null;
    if(mapShop&&(!mapShop.shop||mapShop.shop.showMapIcon!==false))plotIcon(mapShop.x,mapShop.z,'shop',true);

    ctx.save();ctx.translate(cx,cy+1);if(!_miniFollow)ctx.rotate(ry);
    ctx.shadowColor='rgba(20,28,38,.55)';ctx.shadowBlur=5;ctx.shadowOffsetY=2;ctx.fillStyle='#FFF8DF';ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(9,8);ctx.lineTo(0,4);ctx.lineTo(-9,8);ctx.closePath();ctx.fill();
    ctx.shadowColor='transparent';ctx.fillStyle=theme.accent;ctx.beginPath();ctx.moveTo(0,-8.5);ctx.lineTo(5.4,4.2);ctx.lineTo(0,1.5);ctx.lineTo(-5.4,4.2);ctx.closePath();ctx.fill();ctx.strokeStyle=theme.ink;ctx.lineWidth=1.2;ctx.stroke();ctx.restore();
    ctx.restore();

    ctx.strokeStyle='rgba(63,39,25,.82)';ctx.lineWidth=7;ctx.beginPath();ctx.arc(cx,cy,R+7,0,Math.PI*2);ctx.stroke();
    var ring=ctx.createLinearGradient(0,0,S,S);ring.addColorStop(0,'#FFF9DA');ring.addColorStop(.35,'#EACB7A');ring.addColorStop(.70,'#A86A34');ring.addColorStop(1,'#FFF2BD');
    ctx.strokeStyle=ring;ctx.lineWidth=4.5;ctx.beginPath();ctx.arc(cx,cy,R+5.2,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(cx,cy,R+2.3,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='rgba(38,46,55,.78)';ctx.strokeStyle='rgba(255,246,215,.78)';ctx.lineWidth=1;_miniRoundRect(ctx,cx-28,S-23,56,16,8);ctx.fill();ctx.stroke();
    ctx.fillStyle='#FFF7DF';ctx.font='800 '+(_isMobileMap()?8:10)+'px system-ui,Segoe UI,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(range+'m  '+(_miniFollow?'\u25B2':'N'),cx,S-15);
    var cityName=(CITY_STYLES&&CITY_STYLES[currentCityStyle])?CITY_STYLES[currentCityStyle].name:'';
    ctx.fillStyle='rgba(38,46,55,.82)';_miniRoundRect(ctx,cx-47,7,94,19,9.5);ctx.fill();ctx.strokeStyle='rgba(255,246,215,.72)';ctx.lineWidth=1;ctx.stroke();
    ctx.fillStyle='#FFF8E7';ctx.font='900 '+(_isMobileMap()?8.5:10.5)+'px system-ui,Segoe UI,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(theme.icon+'  '+cityName,cx,16.5);
    ctx.fillStyle='rgba(33,44,53,.80)';ctx.beginPath();ctx.arc(S-24,31,11,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(255,247,218,.8)';ctx.lineWidth=1.2;ctx.stroke();
    ctx.fillStyle='#FFF8E1';ctx.font='900 10px system-ui,sans-serif';ctx.fillText('N',S-24,30);ctx.strokeStyle=theme.accent;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(S-24,36);ctx.lineTo(S-24,31);ctx.stroke();
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
    if(node.style==='cloud'){var _cn={zhs:'\u2601\uFE0F 云栖蛋境',zht:'\u2601\uFE0F 雲棲蛋境',ja:'\u2601\uFE0F \u30AF\u30E9\u30A6\u30C9\u30A8\u30C3\u30B0',en:'\u2601\uFE0F Cloud Egg'};return _cn[_langCode]||_cn.en;}
    return (typeof CITY_STYLES!=='undefined'&&CITY_STYLES[node.style])?CITY_STYLES[node.style].name:('City'+node.style);
}
function _worldNodeVisited(node){ return !!_mapVisited[node.key]; }
function _worldNodeIsCurrent(node){
    if(node.style==='cloud')return (currentCityStyle<=4&&playerEgg&&playerEgg.mesh&&playerEgg.mesh.position.y>40);
    return node.style===currentCityStyle;
}
function _toggleWorldMapLegacy(){
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
function _closeWorldMapLegacy(){
    var ov=document.getElementById('worldmap-overlay');
    if(ov&&ov.parentNode)ov.parentNode.removeChild(ov);
    window._worldMapOpen=false;
}
function _drawWorldMapLegacy(size){
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

// ---- Cinematic 3D-styled check-in atlas ----
var _worldMapRAF=0;
function _worldMapCopy(){
    var all={
        zhs:{eyebrow:'DANBO WORLD · ADVENTURE ATLAS',title:'蛋宝世界 · 冒险打卡地图',here:'当前位置',progress:'探索进度',visited:'已打卡',current:'当前位置',locked:'未到达',hint:'按 M 键或点击空白区域关闭'},
        zht:{eyebrow:'DANBO WORLD · ADVENTURE ATLAS',title:'蛋寶世界 · 冒險打卡地圖',here:'目前位置',progress:'探索進度',visited:'已打卡',current:'目前位置',locked:'未到達',hint:'按 M 鍵或點擊空白區域關閉'},
        ja:{eyebrow:'DANBO WORLD · ADVENTURE ATLAS',title:'エッグワールド・冒険チェックイン地図',here:'現在地',progress:'探索進捗',visited:'チェック済み',current:'現在地',locked:'未到達',hint:'Mキーまたは外側をクリックして閉じる'},
        en:{eyebrow:'DANBO WORLD · ADVENTURE ATLAS',title:'DANBO World Adventure Atlas',here:'Current location',progress:'Exploration',visited:'Checked in',current:'You are here',locked:'Undiscovered',hint:'Press M or click outside to close'}
    };
    return all[_langCode]||all.en;
}
function _toggleWorldMap(){
    var ex=document.getElementById('worldmap-overlay');
    if(ex){_closeWorldMap();return;}
    window._worldMapOpen=true;
    var copy=_worldMapCopy(),ov=document.createElement('div');ov.id='worldmap-overlay';
    var panel=document.createElement('div');panel.className='worldmap-panel';
    var visitedCount=_WORLD_NODES.filter(_worldNodeVisited).length;
    var current=(typeof CITY_STYLES!=='undefined'&&CITY_STYLES[currentCityStyle])?CITY_STYLES[currentCityStyle].name:'';
    var progress=Math.round(visitedCount/_WORLD_NODES.length*100);
    panel.innerHTML='<button class="worldmap-close" type="button" aria-label="Close">×</button>'+
        '<div class="worldmap-header"><div><div class="worldmap-eyebrow">'+copy.eyebrow+'</div><div class="worldmap-title">'+copy.title+'</div>'+
        '<div class="worldmap-subline"><span class="worldmap-location">✦ '+copy.here+' · '+current+'</span></div></div>'+
        '<div class="worldmap-progress"><div class="worldmap-progress-top"><span>'+copy.progress+'</span><b class="worldmap-progress-value">'+visitedCount+' / '+_WORLD_NODES.length+'</b></div>'+
        '<div class="worldmap-progress-track"><i class="worldmap-progress-fill" style="width:'+progress+'%"></i></div></div></div>'+
        '<div class="worldmap-canvas-shell"><canvas id="worldmap-canvas"></canvas></div>'+
        '<div class="worldmap-footer"><div class="worldmap-legend"><span><i></i>'+copy.current+'</span><span><i></i>'+copy.visited+'</span><span><i></i>'+copy.locked+'</span></div><div>'+copy.hint+'</div></div>';
    ov.appendChild(panel);document.body.appendChild(ov);
    ov.addEventListener('click',function(e){if(e.target===ov)_closeWorldMap();});
    panel.querySelector('.worldmap-close').onclick=_closeWorldMap;
    _drawWorldMap();
    function animate(){if(!window._worldMapOpen)return;_drawWorldMap();_worldMapRAF=requestAnimationFrame(animate);}
    _worldMapRAF=requestAnimationFrame(animate);
}
function _closeWorldMap(){
    var ov=document.getElementById('worldmap-overlay');
    if(ov&&ov.parentNode)ov.parentNode.removeChild(ov);
    if(_worldMapRAF){cancelAnimationFrame(_worldMapRAF);_worldMapRAF=0;}
    window._worldMapOpen=false;
}
function _drawWorldMap(){
    var cv=document.getElementById('worldmap-canvas');if(!cv)return;
    var rect=cv.getBoundingClientRect(),W=Math.max(300,Math.round(rect.width)),H=Math.max(360,Math.round(rect.height));
    var dpr=(window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.low)?1:Math.min(2,window.devicePixelRatio||1);
    if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);}
    var ctx=cv.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
    var mobile=W/H<1,now=(typeof performance!=='undefined'?performance.now():Date.now())*.001;
    function P(node){
        if(mobile){
            var ps={c5:[.50,.08],cloud:[.50,.22],c6:[.22,.35],c7:[.78,.35],c0:[.50,.48],c1:[.18,.64],c2:[.82,.64],c3:[.32,.82],c4:[.68,.82]};
            var mp=ps[node.key]||[node.x,node.y];return [mp[0]*W,mp[1]*H];
        }
        return [node.x*W,node.y*H];
    }
    function roundRect(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
    var byKey={};_WORLD_NODES.forEach(function(n){byKey[n.key]=n;});
    var bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#82d3dc');bg.addColorStop(.48,'#5aaebd');bg.addColorStop(1,'#327787');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    var sun=ctx.createRadialGradient(W*.76,H*.10,2,W*.76,H*.10,W*.42);sun.addColorStop(0,'rgba(255,246,193,.72)');sun.addColorStop(.34,'rgba(255,221,145,.18)');sun.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=sun;ctx.fillRect(0,0,W,H);
    ctx.save();ctx.globalAlpha=.13;ctx.fillStyle='#ecfeff';
    for(var cl=0;cl<10;cl++){var cx=((cl*197)%1000)/1000*W,cy=(.07+((cl*83)%270)/1000)*H,cr=Math.max(10,W*.026);ctx.beginPath();ctx.ellipse(cx,cy,cr*1.8,cr*.52,0,0,Math.PI*2);ctx.fill();}
    ctx.restore();
    ctx.strokeStyle='rgba(228,252,252,.16)';ctx.lineWidth=1;
    for(var wb=0;wb<7;wb++){ctx.beginPath();for(var wx=0;wx<=W;wx+=12){var wy=H*(.34+wb*.09)+Math.sin(wx*.025+wb)*3;if(wx)ctx.lineTo(wx,wy);else ctx.moveTo(wx,wy);}ctx.stroke();}
    ctx.lineCap='round';
    _WORLD_LINKS.forEach(function(link,li){
        var a=byKey[link[0]],b=byKey[link[1]];if(!a||!b)return;var pa=P(a),pb=P(b),mx=(pa[0]+pb[0])*.5,my=(pa[1]+pb[1])*.5-Math.min(28,H*.035);
        ctx.strokeStyle='rgba(16,59,68,.30)';ctx.lineWidth=Math.max(5,W*.008);ctx.beginPath();ctx.moveTo(pa[0],pa[1]+8);ctx.quadraticCurveTo(mx,my,pb[0],pb[1]+8);ctx.stroke();
        ctx.strokeStyle='rgba(255,241,191,.72)';ctx.lineWidth=Math.max(2,W*.0032);ctx.setLineDash([8,7]);ctx.lineDashOffset=-(now*12+li*3);ctx.beginPath();ctx.moveTo(pa[0],pa[1]+8);ctx.quadraticCurveTo(mx,my,pb[0],pb[1]+8);ctx.stroke();ctx.setLineDash([]);
    });
    var r=Math.max(mobile?25:30,Math.min(W,H)*(mobile?.055:.075));
    var colors={0:['#9bd58f','#e9d6aa','#65bfd0'],1:['#deb667','#f2d68f','#ba7a3f'],2:['#bfeaf0','#edfaff','#6ec6da'],3:['#66545b','#a77b68','#ff7c42'],4:['#f3b7d1','#ffe1ed','#d884b5'],5:['#596b85','#a9b8ca','#394b67'],6:['#efb7c8','#ffe5ec','#d7839f'],7:['#dbecec','#f8ffff','#8ab9c7'],cloud:['#dff6ff','#ffffff','#95cfdf']};
    function landmark(style,x,y,s,vis){
        ctx.save();ctx.translate(x,y);ctx.globalAlpha=vis?1:.44;ctx.lineJoin='round';
        if(style===0){ctx.fillStyle='#e9ddd0';ctx.fillRect(-s*.11,-s*.32,s*.22,s*.46);ctx.fillStyle='#6bc3d5';ctx.beginPath();ctx.ellipse(0,s*.16,s*.30,s*.10,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f2c66d';ctx.beginPath();ctx.arc(0,-s*.34,s*.10,0,Math.PI*2);ctx.fill();}
        else if(style===1){ctx.fillStyle='#c98a48';ctx.beginPath();ctx.moveTo(0,-s*.38);ctx.lineTo(s*.34,s*.22);ctx.lineTo(-s*.34,s*.22);ctx.closePath();ctx.fill();ctx.strokeStyle='#f0c772';ctx.lineWidth=2;ctx.stroke();}
        else if(style===2){ctx.fillStyle='#bff6ff';[-.18,0,.18].forEach(function(dx,i){ctx.beginPath();ctx.moveTo(dx*s,-s*(.42-i*.07));ctx.lineTo((dx+.13)*s,s*.20);ctx.lineTo((dx-.13)*s,s*.20);ctx.closePath();ctx.fill();});}
        else if(style===3){ctx.fillStyle='#5a3c42';ctx.beginPath();ctx.moveTo(0,-s*.34);ctx.lineTo(s*.35,s*.24);ctx.lineTo(-s*.35,s*.24);ctx.closePath();ctx.fill();ctx.fillStyle='#ff8b46';ctx.beginPath();ctx.moveTo(-s*.12,-s*.12);ctx.lineTo(0,s*.18);ctx.lineTo(s*.10,-s*.10);ctx.closePath();ctx.fill();}
        else if(style===4){ctx.strokeStyle='#fff1c9';ctx.lineWidth=Math.max(2,s*.07);ctx.beginPath();ctx.arc(0,-s*.04,s*.23,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(0,s*.18);ctx.lineTo(0,s*.36);ctx.stroke();ctx.fillStyle='#f174a5';ctx.beginPath();ctx.arc(0,-s*.04,s*.13,0,Math.PI*2);ctx.fill();}
        else if(style===5){ctx.fillStyle='#f5e2a1';ctx.beginPath();ctx.arc(0,-s*.06,s*.28,.45,Math.PI*1.62);ctx.arc(s*.11,-s*.12,s*.24,Math.PI*1.55,.42,true);ctx.fill();}
        else if(style===6){ctx.fillStyle='#f487ac';for(var i=0;i<5;i++){var a=i/5*Math.PI*2;ctx.beginPath();ctx.ellipse(Math.cos(a)*s*.16,Math.sin(a)*s*.16,s*.14,s*.09,a,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#ffd76a';ctx.beginPath();ctx.arc(0,0,s*.09,0,Math.PI*2);ctx.fill();}
        else if(style===7){ctx.fillStyle='#edf9ff';ctx.beginPath();ctx.moveTo(0,-s*.38);ctx.lineTo(s*.30,s*.22);ctx.lineTo(-s*.30,s*.22);ctx.closePath();ctx.fill();ctx.strokeStyle='#8eb8cd';ctx.lineWidth=2;ctx.stroke();}
        else{ctx.fillStyle='#f7fdff';[[-.18,0],[0,-.10],[.18,0],[-.07,.10],[.09,.11]].forEach(function(q){ctx.beginPath();ctx.arc(q[0]*s,q[1]*s,s*.19,0,Math.PI*2);ctx.fill();});}
        ctx.restore();
    }
    _WORLD_NODES.forEach(function(n){
        var p=P(n),vis=_worldNodeVisited(n),cur=_worldNodeIsCurrent(n),col=colors[n.style]||colors.cloud,iw=r*1.18,ih=r*.50;
        ctx.save();ctx.shadowColor='rgba(7,28,35,.44)';ctx.shadowBlur=cur?18:10;ctx.shadowOffsetY=8;ctx.fillStyle='rgba(21,54,61,.50)';ctx.beginPath();ctx.ellipse(p[0],p[1]+r*.33,iw*1.08,ih*.85,0,0,Math.PI*2);ctx.fill();ctx.restore();
        var side=ctx.createLinearGradient(0,p[1],0,p[1]+r*.55);side.addColorStop(0,vis?col[1]:'#8b9aa0');side.addColorStop(1,vis?col[2]:'#52646c');ctx.fillStyle=side;ctx.beginPath();ctx.ellipse(p[0],p[1]+r*.16,iw,ih,0,0,Math.PI*2);ctx.fill();
        var top=ctx.createRadialGradient(p[0]-r*.35,p[1]-r*.32,2,p[0],p[1],iw);top.addColorStop(0,vis?'#f8ffe8':'#b5c1c4');top.addColorStop(.30,vis?col[0]:'#89999e');top.addColorStop(1,vis?col[2]:'#5c6d74');ctx.fillStyle=top;ctx.beginPath();ctx.ellipse(p[0],p[1],iw,ih,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=cur?'#ffe39b':'rgba(255,249,221,.72)';ctx.lineWidth=cur?3:1.4;ctx.stroke();
        landmark(n.style,p[0],p[1]-r*.15,r*.72,vis);
        if(cur){var pulse=1+Math.sin(now*3)*.09;ctx.strokeStyle='rgba(255,227,147,.72)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p[0],p[1],iw*pulse,ih*pulse,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#fff1b8';ctx.beginPath();ctx.moveTo(p[0],p[1]-r*.96);ctx.lineTo(p[0]-r*.11,p[1]-r*.70);ctx.lineTo(p[0]+r*.11,p[1]-r*.70);ctx.closePath();ctx.fill();}
        if(vis&&!cur){ctx.fillStyle='#70d2bd';ctx.strokeStyle='#eafff8';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(p[0]+iw*.72,p[1]-ih*.62,r*.18,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle='#fff';ctx.lineWidth=1.7;ctx.beginPath();ctx.moveTo(p[0]+iw*.65,p[1]-ih*.62);ctx.lineTo(p[0]+iw*.71,p[1]-ih*.53);ctx.lineTo(p[0]+iw*.80,p[1]-ih*.72);ctx.stroke();}
        var label=vis?_worldNodeName(n):'???';ctx.font='800 '+Math.max(8,Math.round(r*.24))+'px system-ui,sans-serif';var labelW=Math.min(mobile?W*.30:W*.17,Math.max(r*1.55,ctx.measureText(label).width+22)),labelY=p[1]+r*.63;
        ctx.fillStyle=cur?'rgba(47,56,44,.90)':'rgba(16,39,49,.78)';roundRect(p[0]-labelW/2,labelY,labelW,mobile?20:23,10);ctx.fill();ctx.strokeStyle=cur?'rgba(255,226,145,.84)':'rgba(238,250,244,.28)';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle=vis?'#fff8dd':'#b6c3c7';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,p[0],labelY+(mobile?10:11.5));
    });
}

// keyboard: M toggles world map
window.addEventListener('keydown',function(e){
    if((e.code==='KeyM'||e.key==='m'||e.key==='M')&&typeof gameState!=='undefined'&&gameState==='city'){
        e.preventDefault();_toggleWorldMap();
    }
});
