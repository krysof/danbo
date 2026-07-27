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
    // Ocean gradient — sunset warm
    var _og=ctx.createLinearGradient(0,0,0,H);
    _og.addColorStop(0,'#553366');_og.addColorStop(0.5,'#884455');_og.addColorStop(1,'#CC7744');
    ctx.fillStyle=_og;ctx.fillRect(0,0,W,H);
    // Draw continent with path
    function _land(pts,color){
        ctx.fillStyle=color||'#7BC67E';ctx.beginPath();ctx.moveTo(pts[0],pts[1]);
        for(var i=2;i<pts.length;i+=2)ctx.lineTo(pts[i],pts[i+1]);
        ctx.closePath();ctx.fill();
        ctx.strokeStyle='#6AB86D';ctx.lineWidth=0.8;ctx.stroke();
    }
    // North America
    _land([40,18, 55,12, 75,10, 95,15, 105,25, 110,40, 105,55, 95,65, 85,75, 75,85, 65,90, 55,88, 45,80, 35,65, 30,50, 32,35]);
    // Central America
    _land([65,90, 72,95, 78,105, 75,112, 68,108, 62,100, 60,95]);
    // South America
    _land([78,112, 90,108, 105,115, 115,125, 120,140, 118,160, 112,175, 105,185, 95,190, 85,185, 80,170, 78,155, 80,140, 82,125]);
    // Europe
    _land([178,18, 195,15, 210,18, 220,25, 225,35, 222,48, 215,55, 205,52, 195,48, 188,42, 182,35, 175,28]);
    // UK
    _land([170,22, 176,20, 178,28, 175,32, 170,30]);
    // Africa
    _land([190,65, 200,60, 215,62, 225,70, 230,85, 228,100, 225,115, 220,130, 212,142, 200,148, 192,145, 185,135, 182,120, 180,105, 182,90, 185,78]);
    // Middle East
    _land([228,55, 240,50, 252,55, 255,65, 250,75, 240,78, 232,72, 228,62]);
    // Russia/North Asia
    _land([225,10, 250,8, 280,10, 310,12, 340,15, 360,18, 370,25, 365,35, 350,38, 330,35, 310,32, 290,30, 270,28, 250,25, 235,22, 228,18],'#1a5a2a');
    // China/East Asia
    _land([280,35, 300,32, 320,38, 340,42, 350,50, 348,62, 340,70, 330,75, 318,72, 305,68, 295,60, 285,52, 278,45]);
    // India
    _land([265,68, 278,62, 290,68, 295,80, 290,95, 282,105, 272,108, 265,100, 260,88, 258,78]);
    // Southeast Asia
    _land([320,78, 330,75, 340,80, 345,90, 340,98, 332,95, 325,88]);
    // Japan
    _land([355,45, 360,40, 365,42, 368,50, 365,58, 360,62, 355,58, 352,52]);
    // Indonesia
    _land([325,105, 335,102, 345,105, 355,108, 350,114, 340,112, 330,110]);
    // Australia
    _land([335,140, 355,135, 370,140, 378,150, 375,165, 365,172, 350,175, 338,170, 332,158, 330,148]);
    // New Zealand
    _land([382,168, 386,165, 388,172, 385,178, 382,175]);
    // Greenland
    _land([115,5, 130,3, 140,8, 138,18, 128,22, 118,18, 112,12]);
    // Grid lines
    ctx.strokeStyle='rgba(100,150,255,0.06)';ctx.lineWidth=0.5;
    for(var gi=0;gi<W;gi+=50){ctx.beginPath();ctx.moveTo(gi,0);ctx.lineTo(gi,H);ctx.stroke();}
    for(var gj=0;gj<H;gj+=44){ctx.beginPath();ctx.moveTo(0,gj);ctx.lineTo(W,gj);ctx.stroke();}
    // Equator
    ctx.strokeStyle='rgba(100,150,255,0.12)';ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.moveTo(0,H*0.5);ctx.lineTo(W,H*0.5);ctx.stroke();ctx.setLineDash([]);
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
    // Update name
    var nameEl=document.getElementById('sf2-char-name');
    if(nameEl)nameEl.textContent=ch.name;
    // Update flag
    var flagEl=document.getElementById('sf2-country-flag');
    if(flagEl)flagEl.textContent=ch.flag;
    // Update map
    _drawSF2Map(ch.mapX,ch.mapY);
}

function _drawCuteMiniPortrait(ctx,ch,size){
    var cx=size/2,cy=size*0.50;
    var rx=size*0.31,ry=size*0.35;
    if(ch.type==='cat'||ch.type==='bull'){rx=size*0.35;ry=size*0.32;}
    else if(ch.type==='bear'){rx=size*0.38;ry=size*0.37;}
    else if(ch.type==='cockroach'){rx=size*0.26;ry=size*0.38;}
    var ac='#'+((ch.accent||0).toString(16)).padStart(6,'0');
    // Tiny species cues behind the face, kept very simple.
    if(ch.type==='dog'){[-1,1].forEach(function(s){ctx.fillStyle=ch.portrait;ctx.beginPath();ctx.ellipse(cx+s*size*0.25,cy-size*0.25,size*0.07,size*0.14,s*0.25,0,Math.PI*2);ctx.fill();});}
    else if(ch.type==='cat'){[-1,1].forEach(function(s){ctx.fillStyle=ch.portrait;ctx.beginPath();ctx.moveTo(cx+s*size*0.15,cy-size*0.35);ctx.lineTo(cx+s*size*0.27,cy-size*0.15);ctx.lineTo(cx+s*size*0.07,cy-size*0.2);ctx.closePath();ctx.fill();});}
    else if(ch.type==='bear'){[-1,1].forEach(function(s){ctx.fillStyle=ch.portrait;ctx.beginPath();ctx.arc(cx+s*size*0.22,cy-size*0.29,size*0.09,0,Math.PI*2);ctx.fill();});}
    else if(ch.type==='monkey'){[-1,1].forEach(function(s){ctx.fillStyle='#FFD5AF';ctx.beginPath();ctx.arc(cx+s*size*0.25,cy-size*0.08,size*0.09,0,Math.PI*2);ctx.fill();});}
    else if(ch.type==='bull'){[-1,1].forEach(function(s){ctx.fillStyle='#FFF0C8';ctx.beginPath();ctx.moveTo(cx+s*size*0.16,cy-size*0.26);ctx.quadraticCurveTo(cx+s*size*0.36,cy-size*0.34,cx+s*size*0.30,cy-size*0.45);ctx.quadraticCurveTo(cx+s*size*0.25,cy-size*0.33,cx+s*size*0.12,cy-size*0.22);ctx.closePath();ctx.fill();});}
    else if(ch.type==='rooster'){ctx.fillStyle='#FF6F7D';for(var ri=0;ri<3;ri++){ctx.beginPath();ctx.arc(cx-size*0.06+ri*size*0.06,cy-size*0.38,size*0.04,0,Math.PI*2);ctx.fill();}}
    else if(ch.type==='cockroach'){[-1,1].forEach(function(s){ctx.strokeStyle='#7A552A';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(cx+s*size*0.06,cy-size*0.32);ctx.quadraticCurveTo(cx+s*size*0.22,cy-size*0.50,cx+s*size*0.28,cy-size*0.40);ctx.stroke();});}
    [-1,1].forEach(function(s){ctx.fillStyle=ac;ctx.beginPath();ctx.ellipse(cx+s*size*0.13,cy+ry*0.82,size*0.085,size*0.04,0,0,Math.PI*2);ctx.fill();});
    ctx.fillStyle=ch.portrait;ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.62)';ctx.lineWidth=1.2;ctx.stroke();
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
    if(typeof DANBO_CUTE_STYLE!=='undefined'&&String(DANBO_CUTE_STYLE).indexOf('round-minimal')===0){
        _drawCuteMiniPortrait(ctx,ch,size);
        return c;
    }
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
    var miniCanvas=_drawMiniPortrait(ch,56);
    miniCanvas.style.cssText='border-radius:6px;';
    miniCanvas.className='char-icon-canvas';
    cell.appendChild(miniCanvas);
    cell.addEventListener('click', () => {
        document.querySelectorAll('.char-cell').forEach(c=>c.classList.remove('selected'));
        cell.classList.add('selected');
        selectedChar = i;
        _updateSF2Select(i);
        playMenuMove();
    });
    if (charGrid) charGrid.appendChild(cell);
});
if (portraitCtx) _updateSF2Select(0);

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
