// ui.js — DANBO World
// ---- SF2 World Map ----
function _drawSF2Map(highlightX,highlightY){
    var mc=document.getElementById('sf2-map-canvas');if(!mc)return;
    var dpr=Math.min(window.devicePixelRatio||1,3);
    var W=400,H=220;
    if(mc.width!==Math.round(W*dpr))mc.width=Math.round(W*dpr);
    if(mc.height!==Math.round(H*dpr))mc.height=Math.round(H*dpr);
    var ctx=mc.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.imageSmoothingEnabled=true;
    if(ctx.imageSmoothingQuality)ctx.imageSmoothingQuality='high';
    ctx.clearRect(0,0,W,H);
    // ---- Original DANBO World map (NOT Earth) — a dreamy egg archipelago ----
    // Magical ocean gradient
    var _og=ctx.createLinearGradient(0,0,0,H);
    _og.addColorStop(0,'#243A6E');_og.addColorStop(0.45,'#3E6FA6');_og.addColorStop(1,'#66C3C9');
    ctx.fillStyle=_og;ctx.fillRect(0,0,W,H);
    // Twinkling stars in the upper dream-sky
    for(var _st=0;_st<26;_st++){
        var _sx=(_st*97+13)%W, _sy=(_st*53+7)%(H*0.42);
        var _tw=0.35+0.4*Math.abs(Math.sin(Date.now()*0.002+_st));
        ctx.fillStyle='rgba(255,255,255,'+_tw.toFixed(2)+')';
        ctx.fillRect(_sx,_sy,1.4,1.4);
    }
    // Soft water shimmer bands
    ctx.strokeStyle='rgba(255,255,255,0.05)';ctx.lineWidth=1;
    for(var _wb=0;_wb<5;_wb++){
        var _wy=H*0.55+_wb*10;
        ctx.beginPath();
        for(var _wx=0;_wx<=W;_wx+=8)ctx.lineTo(_wx,_wy+Math.sin(_wx*0.05+_wb)*2);
        ctx.stroke();
    }
    // Island helper: soft egg-shaped land with sandy rim + drop shadow
    function _isle(cx,cy,rx,ry,grass,sand){
        ctx.save();
        ctx.fillStyle='rgba(10,20,40,0.28)';
        ctx.beginPath();ctx.ellipse(cx+2,cy+ry*0.28+3,rx*1.02,ry*0.5,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=sand||'#F3E3A8';
        ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=grass||'#7BD88A';
        ctx.beginPath();ctx.ellipse(cx,cy-ry*0.14,rx*0.84,ry*0.80,0,0,Math.PI*2);ctx.fill();
        ctx.restore();
    }
    // Faint dotted travel routes from the central homeland to the outer isles
    var _hub={x:200,y:110};
    var _routes=[[110,55],[300,52],[200,34],[335,120],[95,165],[55,105],[320,175]];
    ctx.strokeStyle='rgba(255,240,200,0.22)';ctx.lineWidth=1;ctx.setLineDash([2,4]);
    for(var _r=0;_r<_routes.length;_r++){
        ctx.beginPath();ctx.moveTo(_hub.x,_hub.y);
        ctx.quadraticCurveTo((_hub.x+_routes[_r][0])/2,(_hub.y+_routes[_r][1])/2-14,_routes[_r][0],_routes[_r][1]);
        ctx.stroke();
    }
    ctx.setLineDash([]);
    // ---- Islands — an original DANBO World arrangement (NOT based on Earth) ----
    // A central homeland ringed by dreamy themed isles.
    // 1) Central homeland — Flower Isle (花朵蛋)
    _isle(200,110,72,50,'#8FE39B','#F5E6B0');
    // little castle + flower on the homeland
    ctx.fillStyle='#FFF4E0';ctx.fillRect(192,88,16,16);
    ctx.fillStyle='#E86A8A';ctx.beginPath();ctx.moveTo(200,82);ctx.lineTo(208,90);ctx.lineTo(192,90);ctx.closePath();ctx.fill();
    ctx.fillStyle='#FF6FA0';for(var _fp=0;_fp<5;_fp++){var _fa=_fp/5*Math.PI*2;ctx.beginPath();ctx.arc(224+Math.cos(_fa)*4,112+Math.sin(_fa)*4,2.6,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle='#FFD84D';ctx.beginPath();ctx.arc(224,112,2.4,0,Math.PI*2);ctx.fill();
    // 2) Forest Isle (森林蛋) — upper left
    _isle(110,55,34,24,'#4FB06E','#E9D89A');
    ctx.fillStyle='#2E8B57';[-10,0,10].forEach(function(dx){ctx.beginPath();ctx.moveTo(110+dx,41);ctx.lineTo(104+dx,55);ctx.lineTo(116+dx,55);ctx.closePath();ctx.fill();});
    // 3) Crystal Isle (水晶蛋) — upper right
    _isle(300,52,32,22,'#9DE4EC','#DFF6F8');
    ctx.fillStyle='#5FD6E8';ctx.beginPath();ctx.moveTo(300,38);ctx.lineTo(307,50);ctx.lineTo(300,62);ctx.lineTo(293,50);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.75)';ctx.beginPath();ctx.moveTo(300,40);ctx.lineTo(304,49);ctx.lineTo(300,49);ctx.closePath();ctx.fill();
    // 4) Sky/Angel Isle (天使蛋) — floating on a cloud, top-center
    ctx.fillStyle='rgba(255,255,255,0.92)';
    [[-14,4],[0,0],[14,4],[-6,8],[7,8]].forEach(function(o){ctx.beginPath();ctx.arc(200+o[0],40+o[1],9,0,Math.PI*2);ctx.fill();});
    _isle(200,34,22,13,'#CFE9FF','#EAF5FF');
    ctx.fillStyle='#FFE58A';ctx.font='9px sans-serif';ctx.textAlign='center';ctx.fillText('\u2728',200,32);
    // 5) Candy Isle (糖心蛋) — right
    _isle(335,120,34,24,'#F7B6D2','#FBE0EC');
    ['#FF6FA0','#FFD84D','#7BD8FF'].forEach(function(col,ci){ctx.fillStyle=col;ctx.beginPath();ctx.arc(325+ci*10,118,3.4,0,Math.PI*2);ctx.fill();});
    // 6) Star Isle (星愿蛋) — lower left
    _isle(95,165,30,22,'#B9A7F0','#E7DEFA');
    ctx.fillStyle='#FFD84D';ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillText('\u2b50',95,169);
    // 7) Rock Isle (岩石蛋) — left
    _isle(55,105,26,20,'#B89B6E','#E7D6A8');
    ctx.fillStyle='#8A7350';ctx.beginPath();ctx.arc(49,101,6,0,Math.PI*2);ctx.arc(61,103,7,0,Math.PI*2);ctx.fill();
    // 8) Wind Isle (风行蛋) — lower right
    _isle(320,175,24,18,'#BFEAD0','#E4F6EC');
    ctx.strokeStyle='#7FD8B0';ctx.lineWidth=2;ctx.beginPath();ctx.arc(320,173,7,0.4,Math.PI*1.7);ctx.stroke();ctx.beginPath();ctx.arc(320,173,3.5,Math.PI*1.2,Math.PI*2.6);ctx.stroke();
    // Decorative compass rose (bottom-left) — original, not lat/long grid
    ctx.save();ctx.translate(24,H-26);
    ctx.strokeStyle='rgba(255,240,200,0.5)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,9,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='rgba(255,240,200,0.7)';
    ctx.beginPath();ctx.moveTo(0,-11);ctx.lineTo(3,0);ctx.lineTo(-3,0);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(0,11);ctx.lineTo(3,0);ctx.lineTo(-3,0);ctx.closePath();ctx.fill();
    ctx.restore();
    // Highlight marker
    if(highlightX!==undefined){
        ctx.fillStyle='#FF4444';
        ctx.beginPath();ctx.arc(highlightX,highlightY,6,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#FFD700';ctx.lineWidth=2;
        ctx.beginPath();ctx.arc(highlightX,highlightY,10,0,Math.PI*2);ctx.stroke();
        var pulse=Math.sin(Date.now()*0.005)*3;
        ctx.strokeStyle='rgba(255,215,0,0.4)';ctx.lineWidth=1;
        ctx.beginPath();ctx.arc(highlightX,highlightY,14+pulse,0,Math.PI*2);ctx.stroke();
    }
}

// ---- SF2 Airplane Animation ----
var _planeAnim=null;
function _startPlaneAnim(fromX,fromY,toX,toY,callback){
    var pc=document.getElementById('sf2-plane-canvas');if(!pc)return callback();
    pc.style.display='block';
    var pctx=pc.getContext('2d');
    pc.width=pc.parentElement.offsetWidth;pc.height=pc.parentElement.offsetHeight;
    // Plane engine sound
    var _planeCtx=ensureAudio();
    var _planeNodes=[];
    if(_planeCtx&&sfxEnabled){try{
        // Jet whoosh — filtered noise + rising pitch
        var dur=1.5;
        var nb=_planeCtx.createBuffer(1,Math.floor(_planeCtx.sampleRate*dur),_planeCtx.sampleRate);
        var nd=nb.getChannelData(0);
        for(var si=0;si<nd.length;si++){var p=si/nd.length;nd[si]=(Math.random()-0.5)*0.3*Math.exp(-p*1.5)*(0.3+0.7*Math.sin(p*Math.PI));}
        var ns=_planeCtx.createBufferSource();ns.buffer=nb;
        var flt=_planeCtx.createBiquadFilter();flt.type='bandpass';flt.frequency.setValueAtTime(400,_planeCtx.currentTime);flt.frequency.exponentialRampToValueAtTime(2000,_planeCtx.currentTime+dur*0.7);flt.Q.value=1.5;
        var ng=_planeCtx.createGain();ng.gain.setValueAtTime(0,_planeCtx.currentTime);ng.gain.linearRampToValueAtTime(0.12,_planeCtx.currentTime+0.15);ng.gain.setValueAtTime(0.1,_planeCtx.currentTime+dur*0.6);ng.gain.exponentialRampToValueAtTime(0.005,_planeCtx.currentTime+dur);
        ns.connect(flt);flt.connect(ng);ng.connect(_planeCtx.destination);ns.start();ns.stop(_planeCtx.currentTime+dur);
        _planeNodes.push(ns);
        // Engine hum
        var eo=_planeCtx.createOscillator();eo.type='sawtooth';eo.frequency.setValueAtTime(80,_planeCtx.currentTime);eo.frequency.exponentialRampToValueAtTime(200,_planeCtx.currentTime+dur*0.8);
        var eg=_planeCtx.createGain();eg.gain.setValueAtTime(0,_planeCtx.currentTime);eg.gain.linearRampToValueAtTime(0.04,_planeCtx.currentTime+0.1);eg.gain.setValueAtTime(0.03,_planeCtx.currentTime+dur*0.6);eg.gain.exponentialRampToValueAtTime(0.003,_planeCtx.currentTime+dur);
        eo.connect(eg);eg.connect(_planeCtx.destination);eo.start();eo.stop(_planeCtx.currentTime+dur);
        _planeNodes.push(eo);
    }catch(e){}}
    // Start from character's country on map, fly off screen
    var _mapEl=document.getElementById('sf2-map-canvas');
    var sx,sy;
    if(_mapEl){
        var _mapRect=_mapEl.getBoundingClientRect();
        var _pcRect=pc.parentElement.getBoundingClientRect();
        sx=_mapRect.left-_pcRect.left+fromX/400*_mapRect.width;
        sy=_mapRect.top-_pcRect.top+fromY/220*_mapRect.height;
    } else {
        sx=fromX/400*pc.width;sy=fromY/220*pc.height*0.6+pc.height*0.15;
    }
    // Hardcoded endpoint: fly off screen right
    var ex=pc.width+60;
    var ey=pc.height*0.3;
    var t=0;
    _planeAnim=setInterval(function(){
        t+=0.02;
        pctx.clearRect(0,0,pc.width,pc.height);
        var cx=sx+(ex-sx)*t;var cy=sy+(ey-sy)*t-Math.sin(t*Math.PI)*50;
        // Trail
        pctx.strokeStyle='rgba(255,255,255,0.3)';pctx.lineWidth=2;
        pctx.beginPath();pctx.moveTo(sx,sy);
        pctx.quadraticCurveTo((sx+cx)/2,Math.min(sy,cy)-40,cx,cy);
        pctx.stroke();
        // Plane
        pctx.fillStyle='#FFFFFF';
        pctx.beginPath();
        var dx=ex-sx,dy=ey-sy;
        var angle=Math.atan2(dy-Math.cos(t*Math.PI)*50*(Math.PI),dx);
        pctx.save();pctx.translate(cx,cy);pctx.rotate(angle);
        pctx.moveTo(12,0);pctx.lineTo(-10,-7);pctx.lineTo(-6,0);pctx.lineTo(-10,7);
        pctx.closePath();pctx.fill();pctx.restore();
        if(t>=1){
            clearInterval(_planeAnim);_planeAnim=null;
            pc.style.display='none';
            callback();
        }
    },30);
}

function _updateSF2Select(idx){
    var ch=CHARACTERS[idx];
    drawPortrait(ch);
    // Update name (egg characters have no nationality — name only, no flag/English)
    var nameEl=document.getElementById('sf2-char-name');
    if(nameEl)nameEl.textContent=ch.name;
    // Update the DANBO World island map
    _drawSF2Map(ch.mapX,ch.mapY);
    // The current select screen uses the same real-time 3D mascot model as gameplay.
    if(typeof window._update3DCharacterSelect==='function')window._update3DCharacterSelect(idx);
}

function _drawCuteMiniPortrait(ctx,ch,size){
    var cx=size/2,cy=size*0.50;
    var rx=size*0.31,ry=size*0.35;
    if(ch.type==='cat'||ch.type==='bull'){rx=size*0.35;ry=size*0.32;}
    else if(ch.type==='bear'){rx=size*0.38;ry=size*0.37;}
    else if(ch.type==='cockroach'){rx=size*0.33;ry=size*0.33;}
    var ac='#'+((ch.accent||0).toString(16)).padStart(6,'0');
    // Tiny species cues behind the face, kept very simple.
    if(ch.type==='dog'){[-1,1].forEach(function(s){ctx.fillStyle=ch.portrait;ctx.beginPath();ctx.ellipse(cx+s*size*0.25,cy-size*0.25,size*0.07,size*0.14,s*0.25,0,Math.PI*2);ctx.fill();});}
    else if(ch.type==='cat'){[-1,1].forEach(function(s){ctx.fillStyle=ch.portrait;ctx.beginPath();ctx.moveTo(cx+s*size*0.15,cy-size*0.35);ctx.lineTo(cx+s*size*0.27,cy-size*0.15);ctx.lineTo(cx+s*size*0.07,cy-size*0.2);ctx.closePath();ctx.fill();});}
    else if(ch.type==='bear'){[-1,1].forEach(function(s){ctx.fillStyle=ch.portrait;ctx.beginPath();ctx.arc(cx+s*size*0.22,cy-size*0.29,size*0.09,0,Math.PI*2);ctx.fill();});}
    else if(ch.type==='monkey'){[-1,1].forEach(function(s){ctx.fillStyle='#FFD5AF';ctx.beginPath();ctx.arc(cx+s*size*0.25,cy-size*0.08,size*0.09,0,Math.PI*2);ctx.fill();});}
    else if(ch.type==='bull'){ctx.strokeStyle='#5AA84A';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(cx,cy-size*0.30);ctx.lineTo(cx,cy-size*0.42);ctx.stroke();[-1,1].forEach(function(s){ctx.fillStyle='#6FBF5A';ctx.beginPath();ctx.ellipse(cx+s*size*0.10,cy-size*0.42,size*0.11,size*0.05,s*0.6,0,Math.PI*2);ctx.fill();});}
    else if(ch.type==='rooster'){ctx.fillStyle='#FF6F7D';for(var ri=0;ri<3;ri++){ctx.beginPath();ctx.arc(cx-size*0.06+ri*size*0.06,cy-size*0.38,size*0.04,0,Math.PI*2);ctx.fill();}}
    [-1,1].forEach(function(s){ctx.fillStyle=ac;ctx.beginPath();ctx.ellipse(cx+s*size*0.13,cy+ry*0.82,size*0.085,size*0.04,0,0,Math.PI*2);ctx.fill();});
    ctx.fillStyle=ch.portrait;ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.62)';ctx.lineWidth=1.2;ctx.stroke();
    if(ch.type==='bear'){[[-0.16,-0.02],[0.18,0.12]].forEach(function(o){ctx.fillStyle='#9A928A';ctx.beginPath();ctx.arc(cx+o[0]*size,cy+o[1]*size,size*0.05,0,Math.PI*2);ctx.fill();});}
    [-1,1].forEach(function(s){
        ctx.fillStyle='#171A2A';ctx.beginPath();ctx.ellipse(cx+s*size*0.10,cy-size*0.06,size*0.035,size*0.085,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(cx+s*size*0.085,cy-size*0.095,size*0.011,0,Math.PI*2);ctx.fill();
    });
    [-1,1].forEach(function(s){ctx.fillStyle='rgba(255,125,165,0.45)';ctx.beginPath();ctx.ellipse(cx+s*size*0.17,cy+size*0.04,size*0.045,size*0.028,0,0,Math.PI*2);ctx.fill();});
}

function _drawMiniPortrait(ch,size){
    var dpr=Math.min(window.devicePixelRatio||1,3);
    var c=document.createElement('canvas');c.width=Math.round(size*dpr);c.height=Math.round(size*dpr);
    c.style.width=size+'px';c.style.height=size+'px';
    var ctx=c.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.imageSmoothingEnabled=true;
    if(ctx.imageSmoothingQuality)ctx.imageSmoothingQuality='high';
    // This canvas is displayed only by the optional classic arcade selector, so
    // deliberately keep the original SF-inspired character details here. The
    // current cinematic selector continues to use the full real-time 3D models.
    var cx=size/2,cy=size*0.48;
    // Body shape varies by character type
    var rx=size*0.32,ry=size*0.38;
    if(ch.type==='monkey'){rx=size*0.25;ry=size*0.42;} // Chun-Li: slim
    else if(ch.type==='cat'||ch.type==='bull'){rx=size*0.38;ry=size*0.34;} // Blanka/Honda: round
    else if(ch.type==='bear'){rx=size*0.42;ry=size*0.40;} // Zangief: 1.5x big
    else if(ch.type==='cockroach'){rx=size*0.2;ry=size*0.42;} // Dhalsim: thin
    ctx.fillStyle=ch.portrait;ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);ctx.fill();
    // Eyes
    var ey=cy-size*0.06;
    [-1,1].forEach(function(s){
        ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(cx+s*size*0.1,ey,size*0.055,size*0.065,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#111';ctx.beginPath();ctx.arc(cx+s*size*0.1,ey+1,size*0.03,0,Math.PI*2);ctx.fill();
    });
    // Type features (simplified)
    if(ch.type==='egg'){ctx.strokeStyle='#CC2222';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy-size*0.28,size*0.22,0.7*Math.PI,0.3*Math.PI);ctx.stroke();}
    else if(ch.type==='dog'){for(var ki=0;ki<3;ki++){ctx.fillStyle='#FFDD44';ctx.beginPath();ctx.moveTo(cx-size*0.1+ki*size*0.1,cy-size*0.35);ctx.lineTo(cx-size*0.07+ki*size*0.1,cy-size*0.45);ctx.lineTo(cx-size*0.04+ki*size*0.1,cy-size*0.35);ctx.fill();}ctx.fillStyle='#8B5E3C';ctx.beginPath();ctx.ellipse(cx,cy+size*0.12,size*0.1,size*0.07,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#FF8899';ctx.beginPath();ctx.ellipse(cx+size*0.02,cy+size*0.19,size*0.03,size*0.05,0,0,Math.PI*2);ctx.fill();}
    else if(ch.type==='bull'){ctx.fillStyle='#3A2518';ctx.beginPath();ctx.ellipse(cx,cy+size*0.08,size*0.14,size*0.08,0,0,Math.PI*2);ctx.fill();[-1,1].forEach(function(s){ctx.fillStyle='#1A0A00';ctx.beginPath();ctx.arc(cx+s*size*0.05,cy+size*0.06,size*0.03,0,Math.PI*2);ctx.fill();});ctx.fillStyle='#222';ctx.beginPath();ctx.arc(cx,cy-size*0.4,size*0.06,0,Math.PI*2);ctx.fill();}
    else if(ch.type==='cat'){[-1,1].forEach(function(s){ctx.fillStyle=ch.portrait;ctx.beginPath();ctx.moveTo(cx+s*size*0.15,cy-size*0.35);ctx.lineTo(cx+s*size*0.28,cy-size*0.15);ctx.lineTo(cx+s*size*0.08,cy-size*0.2);ctx.fill();});for(var bi=0;bi<5;bi++){ctx.fillStyle='#FF8800';ctx.beginPath();var ba=bi/5*Math.PI-Math.PI/2;ctx.arc(cx+Math.cos(ba)*size*0.2,cy-size*0.3+Math.sin(ba)*size*0.08,size*0.04,0,Math.PI*2);ctx.fill();}ctx.fillStyle='rgba(20,80,20,0.4)';for(var si=0;si<3;si++){ctx.fillRect(cx-rx*0.6,cy+si*size*0.08-size*0.05,rx*1.2,size*0.03);}[-1,1].forEach(function(s){ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(cx+s*size*0.1,ey,size*0.055,size*0.065,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#111';ctx.fillRect(cx+s*size*0.1-1,ey-size*0.05,2,size*0.1);});}
    else if(ch.type==='rooster'){ctx.fillStyle='#FFDD44';ctx.fillRect(cx-size*0.14,cy-size*0.45,size*0.28,size*0.08);ctx.fillStyle='#FF3333';for(var ri=0;ri<3;ri++){ctx.beginPath();ctx.arc(cx-size*0.06+ri*size*0.06,cy-size*0.4,size*0.04,0,Math.PI*2);ctx.fill();}[-1,1].forEach(function(s){ctx.fillStyle='#4A5E28';ctx.beginPath();ctx.moveTo(cx+s*rx*0.5,cy-size*0.04);ctx.quadraticCurveTo(cx+s*rx*1.4,cy-size*0.08,cx+s*rx*1.2,cy+size*0.1);ctx.quadraticCurveTo(cx+s*rx*1.0,cy+size*0.14,cx+s*rx*0.5,cy+size*0.1);ctx.closePath();ctx.fill();});}
    else if(ch.type==='monkey'){[-1,1].forEach(function(s){ctx.fillStyle='#222';ctx.beginPath();ctx.arc(cx+s*size*0.22,cy-size*0.3,size*0.07,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(cx+s*size*0.22,cy-size*0.24);ctx.lineTo(cx+s*size*0.25,cy-size*0.16);ctx.lineTo(cx+s*size*0.19,cy-size*0.16);ctx.fill();});ctx.fillStyle='#FFDCB0';ctx.beginPath();ctx.ellipse(cx,cy+size*0.08,size*0.12,size*0.16,0,0,Math.PI*2);ctx.fill();}
    else if(ch.type==='bear'){[-1,1].forEach(function(s){ctx.fillStyle=ch.portrait;ctx.beginPath();ctx.arc(cx+s*size*0.14,cy-size*0.3,size*0.1,0,Math.PI*2);ctx.fill();});[-1,1].forEach(function(s){ctx.fillStyle='#6B4A2A';ctx.beginPath();ctx.ellipse(cx+s*rx*0.9,cy+size*0.1,size*0.08,size*0.1,s*0.2,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(60,30,10,0.5)';ctx.lineWidth=1;for(var ci=0;ci<2;ci++){ctx.beginPath();ctx.moveTo(cx+s*(rx*0.7)+ci*3,cy+size*0.18);ctx.lineTo(cx+s*(rx*0.7)+ci*3+s*2,cy+size*0.23);ctx.stroke();}});}
    else if(ch.type==='cockroach'){[-1,1].forEach(function(s){ctx.fillStyle='rgba(139,105,20,0.3)';ctx.beginPath();ctx.ellipse(cx+s*size*0.1,cy+size*0.02,size*0.08,size*0.18,s*0.15,0,Math.PI*2);ctx.fill();});[-1,1].forEach(function(s){ctx.strokeStyle='#5C2E0A';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(cx+s*size*0.05,cy-size*0.3);ctx.quadraticCurveTo(cx+s*size*0.2,cy-size*0.5,cx+s*size*0.25,cy-size*0.4);ctx.stroke();});for(var si=0;si<3;si++){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(cx-size*0.06+si*size*0.06,cy+size*0.2,size*0.025,0,Math.PI*2);ctx.fill();}}
    return c;
}
CHARACTERS.forEach((ch,i) => {
    const cell = document.createElement('div');
    cell.className = 'char-cell' + (i===0?' selected':'');
    cell.dataset.charIndex=String(i);
    cell.setAttribute('role','button');
    cell.setAttribute('tabindex','0');
    cell.setAttribute('aria-label',ch.name);
    cell.style.setProperty('--card-rgb',((ch.accent>>16)&255)+','+((ch.accent>>8)&255)+','+(ch.accent&255));
    var miniCanvas=_drawMiniPortrait(ch,96);
    miniCanvas.className='char-icon-canvas';
    miniCanvas.setAttribute('aria-hidden','true');
    cell.appendChild(miniCanvas);
    var num=document.createElement('span');num.className='char-number';num.textContent=String(i+1).padStart(2,'0');cell.appendChild(num);
    var fallback=document.createElement('span');fallback.className='char-fallback';fallback.textContent=ch.icon;cell.appendChild(fallback);
    var label=document.createElement('span');label.className='char-label';label.textContent=ch.name;cell.appendChild(label);
    cell.addEventListener('click', () => {
        document.querySelectorAll('.char-cell').forEach(c=>c.classList.remove('selected'));
        cell.classList.add('selected');
        selectedChar = i;
        _updateSF2Select(i);
        if(typeof window._play3DSelectCardGesture==='function')window._play3DSelectCardGesture(i);
        playMenuMove();
    });
    cell.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();cell.click();}});
    if (charGrid) charGrid.appendChild(cell);
});
if (portraitCtx) _updateSF2Select(0);

// ---- Select-screen presentation switch ----
// Cinematic remains the default. Classic now selects a real 3D arcade-fighter
// costume shared by the preview and the playable character.
(function(){
    var screen=document.getElementById('select-screen');
    var toggle=document.getElementById('select-style-toggle');
    if(!screen||!toggle)return;
    function normalize(value){return value==='classic'?'classic':'cinematic';}
    function setStyle(value,persist){
        value=normalize(value);
        screen.classList.toggle('select-style-classic',value==='classic');
        screen.classList.toggle('select-style-cinematic',value==='cinematic');
        screen.dataset.selectStyle=value;
        window.DANBO_SELECTED_CHARACTER_STYLE=value;
        var qualityLabel=document.getElementById('select-quality-label');
        if(qualityLabel)qualityLabel.textContent=value==='classic'?'ARCADE LEGACY':'CINEMATIC 3D';
        toggle.querySelectorAll('[data-select-style]').forEach(function(button){
            var active=button.dataset.selectStyle===value;
            button.classList.toggle('active',active);
            button.setAttribute('aria-pressed',active?'true':'false');
        });
        if(persist!==false)try{localStorage.setItem('danbo_select_style',value);}catch(e){}
        requestAnimationFrame(function(){_updateSF2Select(typeof selectedChar==='number'?selectedChar:0);});
        window.dispatchEvent(new CustomEvent('danbo-select-style',{detail:{style:value}}));
    }
    toggle.addEventListener('click',function(event){
        var button=event.target.closest('[data-select-style]');
        if(button)setStyle(button.dataset.selectStyle,true);
    });
    var initial='cinematic';
    try{initial=normalize(new URLSearchParams(location.search).get('selectStyle')||localStorage.getItem('danbo_select_style'));}catch(e){}
    window._setCharacterSelectStyle=setStyle;
    setStyle(initial,false);

    // On narrow screens the confirmation row must escape the roster panel's
    // overflow clipping before it can be fixed above mobile browser chrome.
    // Moving the existing node preserves its click handler and translated text.
    var confirmRow=document.querySelector('.select-confirm-row');
    if(confirmRow&&confirmRow.parentNode){
        var confirmHome=document.createComment('select-confirm-home');
        confirmRow.parentNode.insertBefore(confirmHome,confirmRow);
        var mobileQuery=window.matchMedia('(max-width:700px)');
        var iosBrowser=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
        document.documentElement.classList.toggle('danbo-ios-browser',iosBrowser);
        function syncConfirmPlacement(){
            if(mobileQuery.matches){
                if(confirmRow.parentNode!==screen)screen.appendChild(confirmRow);
            }else if(confirmHome.parentNode&&confirmRow.parentNode!==confirmHome.parentNode){
                confirmHome.parentNode.insertBefore(confirmRow,confirmHome.nextSibling);
            }
        }
        if(mobileQuery.addEventListener)mobileQuery.addEventListener('change',syncConfirmPlacement);
        else if(mobileQuery.addListener)mobileQuery.addListener(syncConfirmPlacement);
        syncConfirmPlacement();
    }
})();

// ---- State ----
let gameState = 'menu'; // menu, city, raceIntro, racing, raceResult
let coins = 0, nearPortal = null, countdownTimer = null;
// ---- Tower of Babel state ----
var _babylonTriggered=false, _babylonTower=null, _babylonRising=false, _babylonRiseY=-52;
var _earthquakeTimer=0, _earthquakeIntensity=0;
var _babylonPromptDismissed=false;
var _babylonElevator=false, _babylonElevDir=0, _babylonElevY=0; // elevator ride state
var _moonPipePromptOpen=false, _moonPipeDismissed=false; // moon pipe prompt state
let raceCoinScore = 0;
let finishedEggs=[], playerFinished=false, trackLength=0, currentRaceIndex=-1;

// ---- Jump charge system ----
var _jumpCharging=false, _jumpCharge=0, _jumpChargeMax=60, _jumpChargeBar=null;
