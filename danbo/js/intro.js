// intro.js — SF2-style animated title intro
// Phase 0-1.5s: Black screen, WAWE logo fades in/out
// Phase 1.5-2.5s: Dark street, lightning flash, two eggs appear
// Phase 2.5-3.5s: Characters face off with bounce
// Phase 3.5-5s: Classic egg fires beam, cockroach flies back
// Phase 5-7s: Camera pans up skyscraper, title appears with shake
// Phase 7s+: PRESS START blinks, start button fades in

var _introCanvas=document.getElementById('intro-canvas');
var _introCtx=_introCanvas?_introCanvas.getContext('2d'):null;
var _introStart=0;
var _introRunning=true;
var _introSkipped=false;

function _resizeIntroCanvas(){
    if(!_introCanvas)return;
    _introCanvas.width=_introCanvas.parentElement.offsetWidth*Math.min(devicePixelRatio,2);
    _introCanvas.height=_introCanvas.parentElement.offsetHeight*Math.min(devicePixelRatio,2);
}
_resizeIntroCanvas();
window.addEventListener('resize',_resizeIntroCanvas);

// Draw an egg character (simplified pixel-art style)
function _drawIntroEgg(ctx,x,y,size,color,accentColor,facingLeft,eyeOpen){
    var _bg=ctx.createRadialGradient(x-size*0.1,y-size*0.15,size*0.1,x,y,size*0.8);
    _bg.addColorStop(0,color);_bg.addColorStop(1,accentColor);
    ctx.fillStyle=_bg;
    ctx.beginPath();ctx.ellipse(x,y,size*0.6,size*0.8,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.15)';
    ctx.beginPath();ctx.ellipse(x-size*0.08,y-size*0.1,size*0.3,size*0.4,0,0,Math.PI*2);ctx.fill();
    var ex=facingLeft?-1:1;
    ctx.fillStyle='#fff';
    ctx.beginPath();ctx.ellipse(x+ex*size*0.18,y-size*0.2,size*0.16,size*0.2,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(x+ex*size*0.38,y-size*0.18,size*0.13,size*0.18,0,0,Math.PI*2);ctx.fill();
    if(eyeOpen){
        ctx.fillStyle='#111';
        ctx.beginPath();ctx.arc(x+ex*size*0.22,y-size*0.17,size*0.07,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.arc(x+ex*size*0.4,y-size*0.15,size*0.06,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#fff';
        ctx.beginPath();ctx.arc(x+ex*size*0.2,y-size*0.22,size*0.03,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.arc(x+ex*size*0.38,y-size*0.2,size*0.025,0,Math.PI*2);ctx.fill();
    }
    ctx.fillStyle='rgba(255,120,120,0.15)';
    ctx.beginPath();ctx.ellipse(x+ex*size*0.08,y+size*0.02,size*0.12,size*0.06,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(x+ex*size*0.42,y+size*0.04,size*0.1,size*0.05,0,0,Math.PI*2);ctx.fill();
    // Serious expression — slight frown
    if(eyeOpen){
        ctx.strokeStyle='rgba(80,40,20,0.4)';ctx.lineWidth=size*0.02;
        ctx.beginPath();ctx.moveTo(x+ex*size*0.15,y+size*0.1);ctx.lineTo(x+ex*size*0.35,y+size*0.08);ctx.stroke();
    }
}

// Draw a fist
function _drawFist(ctx,x,y,size,color){
    ctx.fillStyle=color;
    ctx.beginPath();
    ctx.arc(x,y,size,0,Math.PI*2);
    ctx.fill();
    ctx.fillStyle='#fff';
    ctx.beginPath();
    ctx.arc(x,y,size*0.4,0,Math.PI*2);
    ctx.fill();
}

// Draw skyscraper
// Draw skyscraper with fast-flickering windows (original style)
function _drawBuilding(ctx,x,y,w,h,color,windowColor){
    ctx.fillStyle=color;
    ctx.fillRect(x,y,w,h);
    ctx.fillStyle=windowColor;
    var ww=w*0.12,wh=h*0.03,gap=w*0.08;
    var cols=Math.floor((w-gap*2)/(ww+gap));
    var rows=Math.floor((h-gap*3)/(wh+gap*1.5));
    for(var r=0;r<rows;r++){
        for(var c=0;c<cols;c++){
            var wx=x+gap+c*(ww+gap);
            var wy=y+gap*2+r*(wh+gap*1.5);
            if(Math.random()>0.15) ctx.fillRect(wx,wy,ww,wh);
        }
    }
}

// Impact flash
function _drawFlash(ctx,x,y,size,alpha){
    var grad=ctx.createRadialGradient(x,y,0,x,y,size);
    grad.addColorStop(0,'rgba(255,255,200,'+alpha+')');
    grad.addColorStop(0.5,'rgba(255,200,100,'+alpha*0.5+')');
    grad.addColorStop(1,'rgba(255,100,50,0)');
    ctx.fillStyle=grad;
    ctx.fillRect(x-size,y-size,size*2,size*2);
}

// Draw lightning zigzag
function _drawLightning(ctx,x1,y1,x2,y2,alpha,thickness){
    ctx.strokeStyle='rgba(255,255,255,'+alpha+')';
    ctx.lineWidth=thickness;
    ctx.shadowColor='rgba(200,200,255,'+alpha+')';
    ctx.shadowBlur=20;
    ctx.beginPath();
    ctx.moveTo(x1,y1);
    var segments=8;
    var dx=(x2-x1)/segments;
    var dy=(y2-y1)/segments;
    for(var i=1;i<segments;i++){
        var ox=(Math.random()-0.5)*60;
        var oy=(Math.random()-0.5)*40;
        ctx.lineTo(x1+dx*i+ox,y1+dy*i+oy);
    }
    ctx.lineTo(x2,y2);
    ctx.stroke();
    ctx.shadowBlur=0;
}

// Draw sunset city background with setting sun
function _drawCityBG(ctx,W,H,panY){
    var skyGrad=ctx.createLinearGradient(0,0,0,H);
    skyGrad.addColorStop(0,'#1a0533');
    skyGrad.addColorStop(0.2,'#6B2FA0');
    skyGrad.addColorStop(0.4,'#CC4444');
    skyGrad.addColorStop(0.6,'#FF8844');
    skyGrad.addColorStop(0.8,'#FFCC66');
    skyGrad.addColorStop(1,'#FFE8AA');
    ctx.fillStyle=skyGrad;
    ctx.fillRect(0,0,W,H);
    // Setting sun — slowly drifts around
    var _st=Date.now()*0.0003;
    var sunX=W*0.78+Math.sin(_st*1.3)*W*0.06+Math.sin(_st*0.7)*W*0.03;
    var sunY=H*0.55+panY*0.3+Math.cos(_st*0.9)*H*0.04+Math.sin(_st*1.7)*H*0.02;
    var sunR=Math.min(W,H)*0.12;
    // Sun glow
    var sunGlow=ctx.createRadialGradient(sunX,sunY,sunR*0.5,sunX,sunY,sunR*3);
    sunGlow.addColorStop(0,'rgba(255,200,100,0.4)');sunGlow.addColorStop(1,'rgba(255,100,50,0)');
    ctx.fillStyle=sunGlow;ctx.fillRect(0,0,W,H);
    // Sun body
    var sunGrad=ctx.createRadialGradient(sunX,sunY,0,sunX,sunY,sunR);
    sunGrad.addColorStop(0,'#FFEE66');sunGrad.addColorStop(0.7,'#FF8833');sunGrad.addColorStop(1,'#FF5522');
    ctx.fillStyle=sunGrad;ctx.beginPath();ctx.arc(sunX,sunY,sunR,0,Math.PI*2);ctx.fill();
    // Sun animated face — expression changes over time
    var _sunT=Date.now()*0.001;
    var _sunPhase=Math.floor(_sunT/3)%5; // change every 3 seconds
    var _sunBlink=Math.sin(_sunT*3)>0.95; // occasional blink
    ctx.fillStyle='#552200';
    // Eyes — different per phase
    if(_sunBlink){
        // Blink: thin lines
        [-1,1].forEach(function(s){
            ctx.save();ctx.translate(sunX+s*sunR*0.3,sunY-sunR*0.1);
            ctx.fillRect(-sunR*0.12,-sunR*0.02,sunR*0.24,sunR*0.04);ctx.restore();
        });
    } else if(_sunPhase===0){
        // Happy squint
        [-1,1].forEach(function(s){
            ctx.save();ctx.translate(sunX+s*sunR*0.3,sunY-sunR*0.1);ctx.rotate(s*0.1);
            ctx.fillRect(-sunR*0.12,-sunR*0.03,sunR*0.24,sunR*0.06);ctx.restore();
        });
    } else if(_sunPhase===1){
        // Round surprised eyes
        [-1,1].forEach(function(s){
            ctx.beginPath();ctx.arc(sunX+s*sunR*0.3,sunY-sunR*0.1,sunR*0.1,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(sunX+s*sunR*0.3-sunR*0.03,sunY-sunR*0.13,sunR*0.04,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#552200';
        });
    } else if(_sunPhase===2){
        // Winking (one eye closed)
        ctx.beginPath();ctx.arc(sunX-sunR*0.3,sunY-sunR*0.1,sunR*0.08,0,Math.PI*2);ctx.fill();
        ctx.save();ctx.translate(sunX+sunR*0.3,sunY-sunR*0.1);
        ctx.fillRect(-sunR*0.12,-sunR*0.02,sunR*0.24,sunR*0.04);ctx.restore();
    } else if(_sunPhase===3){
        // Sleepy half-closed
        [-1,1].forEach(function(s){
            ctx.strokeStyle='#552200';ctx.lineWidth=sunR*0.06;ctx.lineCap='round';
            ctx.beginPath();ctx.arc(sunX+s*sunR*0.3,sunY-sunR*0.05,sunR*0.08,Math.PI*0.1,Math.PI*0.9);ctx.stroke();
        });
    } else {
        // Star eyes (excited)
        [-1,1].forEach(function(s){
            var _sx=sunX+s*sunR*0.3,_sy=sunY-sunR*0.1;
            for(var si=0;si<5;si++){
                var sa=si/5*Math.PI*2-Math.PI/2;
                ctx.beginPath();ctx.moveTo(_sx,_sy);
                ctx.lineTo(_sx+Math.cos(sa)*sunR*0.12,_sy+Math.sin(sa)*sunR*0.12);
                ctx.lineTo(_sx+Math.cos(sa+0.6)*sunR*0.05,_sy+Math.sin(sa+0.6)*sunR*0.05);
                ctx.fill();
            }
        });
    }
    // Mouth — different per phase
    ctx.strokeStyle='#552200';ctx.lineWidth=sunR*0.07;ctx.lineCap='round';
    if(_sunPhase===0){
        // Cheeky grin
        ctx.beginPath();ctx.moveTo(sunX-sunR*0.3,sunY+sunR*0.15);
        ctx.quadraticCurveTo(sunX,sunY+sunR*0.4,sunX+sunR*0.35,sunY+sunR*0.1);ctx.stroke();
    } else if(_sunPhase===1){
        // O mouth (surprised)
        ctx.fillStyle='#552200';ctx.beginPath();ctx.ellipse(sunX,sunY+sunR*0.2,sunR*0.12,sunR*0.15,0,0,Math.PI*2);ctx.fill();
    } else if(_sunPhase===2){
        // Tongue out wink
        ctx.beginPath();ctx.moveTo(sunX-sunR*0.25,sunY+sunR*0.15);
        ctx.quadraticCurveTo(sunX,sunY+sunR*0.35,sunX+sunR*0.3,sunY+sunR*0.15);ctx.stroke();
        ctx.fillStyle='#FF6666';ctx.beginPath();ctx.ellipse(sunX+sunR*0.05,sunY+sunR*0.35,sunR*0.08,sunR*0.12,0.2,0,Math.PI*2);ctx.fill();
    } else if(_sunPhase===3){
        // Zzz sleeping
        ctx.beginPath();ctx.moveTo(sunX-sunR*0.15,sunY+sunR*0.2);
        ctx.lineTo(sunX+sunR*0.15,sunY+sunR*0.2);ctx.stroke();
        ctx.fillStyle='rgba(255,255,255,0.5)';ctx.font=Math.floor(sunR*0.3)+'px sans-serif';
        ctx.fillText('z',sunX+sunR*0.5,sunY-sunR*0.3);
        ctx.fillText('Z',sunX+sunR*0.7,sunY-sunR*0.5);
    } else {
        // Big happy smile
        ctx.beginPath();ctx.arc(sunX,sunY+sunR*0.15,sunR*0.25,0,Math.PI);ctx.stroke();
    }
    // Blush (always)
    ctx.fillStyle='rgba(255,100,80,0.35)';
    ctx.beginPath();ctx.ellipse(sunX-sunR*0.45,sunY+sunR*0.2,sunR*0.15,sunR*0.1,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(sunX+sunR*0.5,sunY+sunR*0.15,sunR*0.15,sunR*0.1,0,0,Math.PI*2);ctx.fill();

    ctx.save();
    ctx.translate(0,panY);

    var bColors=['#5a3870','#4d2d65','#6a4080','#553575','#604078'];
    var bx=0;
    for(var bi=0;bi<8;bi++){
        var bw=W*0.12+bi*W*0.02;
        var bh=H*0.3+bi*H*0.08+(bi%3)*H*0.05;
        var bFullH=bh+panY*0.3+H; // full visible height
        var bTop=H-bh-panY*0.3;
        ctx.fillStyle=bColors[bi%bColors.length];
        ctx.fillRect(bx,bTop,bw,bFullH);
        ctx.fillStyle='rgba(255,210,90,0.8)';
        var _wRows=Math.floor(bFullH/(H*0.04));
        for(var wi=0;wi<6;wi++){
            for(var wj=0;wj<_wRows;wj++){
                if(Math.random()>0.25){
                    ctx.fillRect(bx+bw*0.15+wi*bw*0.13,bTop+H*0.02+wj*H*0.04,bw*0.08,H*0.02);
                }
            }
        }
        bx+=bw+W*0.01;
    }

    // Ground — dark warm
    ctx.fillStyle='#2a1a10';
    ctx.fillRect(0,H*0.82,W,H*0.2);
    ctx.fillStyle='#3a2a18';
    ctx.fillRect(0,H*0.82,W,H*0.01);

    ctx.restore();
}

// Wind rain particles
var _introRain=[];
for(var _ri=0;_ri<120;_ri++){
    _introRain.push({x:Math.random(),y:Math.random(),speed:0.012+Math.random()*0.018,len:10+Math.random()*14});
}
function _drawRain(ctx,W,H,alpha){
    if(alpha<=0)return;
    ctx.strokeStyle='rgba(180,200,255,'+alpha*0.35+')';
    ctx.lineWidth=1;
    for(var i=0;i<_introRain.length;i++){
        var r=_introRain[i];
        r.x+=0.006;r.y+=r.speed;
        if(r.y>1){r.y=0;r.x=Math.random();}
        if(r.x>1)r.x-=1;
        var rx=r.x*W,ry=r.y*H;
        ctx.beginPath();
        ctx.moveTo(rx,ry);
        ctx.lineTo(rx+r.len*1.0,ry+r.len);
        ctx.stroke();
    }
}

// Main intro render loop
function _renderIntro(now){
    if(!_introRunning||!_introCtx)return;
    if(!_introStart)_introStart=now;
    var t=(now-_introStart)/1000;
    var W=_introCanvas.width,H=_introCanvas.height;
    var ctx=_introCtx;
    var scale=Math.min(W,H)/600;

    ctx.clearRect(0,0,W,H);

    // ======== PHASE 0: Black screen + WAWE logo (0-1.5s) ========
    if(t<1.5){
        ctx.fillStyle='#000';
        ctx.fillRect(0,0,W,H);
        var logoAlpha=0;
        if(t<0.5){
            logoAlpha=t/0.5;
        } else if(t<1.0){
            logoAlpha=1;
        } else {
            logoAlpha=1-(t-1.0)/0.5;
        }
        if(logoAlpha>0){
            ctx.globalAlpha=logoAlpha;
            ctx.fillStyle='#FFFFFF';
            ctx.font='bold '+Math.floor(72*scale)+'px "Segoe UI","PingFang SC","Microsoft YaHei",sans-serif';
            ctx.textAlign='center';
            ctx.textBaseline='middle';
            ctx.fillText('WAWE',W/2,H/2);
            ctx.globalAlpha=1;
        }
        ctx.textBaseline='alphabetic';
        if(_introRunning) requestAnimationFrame(_renderIntro);
        return;
    }

    // Camera pan offset (phase 5+: pan up)
    var panY=0;
    if(t>6.5&&t<8.5){
        panY=(t-6.5)/2*H*0.8;
    } else if(t>=8.5){
        panY=H*0.8;
    }

    // ======== Background ========
    _drawCityBG(ctx,W,H,panY);
    // Wind rain effect during street scene
    if(t>=1.5&&t<8.5){
        var _rainAlpha=1;
        if(t<2)_rainAlpha=(t-1.5)/0.5;
        if(t>6.5)_rainAlpha=1-(t-6.5)/0.5;
        _drawRain(ctx,W,H,_rainAlpha);
    }

    // ======== PHASE 1: Lightning + silhouettes appear (1.5-2.5s) ========
    // Use min dimension for vertical positioning on portrait phones
    var _baseY=Math.min(H*0.72, H*0.5+150*scale);
    var cx=W*0.35, cy=_baseY;
    var rx=W*0.65, ry=_baseY;
    var eggSize=50*scale;

    if(t>=1.5&&t<2.5){
        var pt=t-1.5;
        ctx.save();
        ctx.translate(0,panY);

        // Lightning flash + thunder sound
        if(pt<0.5){
            var lAlpha=1-pt/0.5;
            _drawLightning(ctx,W*0.1,H*0.15,W*0.9,H*0.45,lAlpha,4*scale);
            _drawLightning(ctx,W*0.15,H*0.1,W*0.85,H*0.5,lAlpha*0.7,3*scale);
            _drawLightning(ctx,W*0.5,H*0.05,W*0.6,H*0.4,lAlpha*0.5,2*scale);
            if(!window._introThunderPlayed){
                window._introThunderPlayed=true;
                try{var _thCtx=ensureAudio();if(_thCtx&&sfxEnabled){var _tht=_thCtx.currentTime;
                    var _thb=_thCtx.createBuffer(1,Math.floor(_thCtx.sampleRate*0.5),_thCtx.sampleRate);
                    var _thd=_thb.getChannelData(0);
                    for(var _thi=0;_thi<_thd.length;_thi++){var _thp=_thi/_thd.length;_thd[_thi]=(Math.random()-0.5)*0.5*Math.exp(-_thp*3)*Math.sin(_thp*Math.PI*8);}
                    var _ths=_thCtx.createBufferSource();_ths.buffer=_thb;
                    var _thg=_thCtx.createGain();_thg.gain.value=0.2;
                    _ths.connect(_thg);_thg.connect(_thCtx.destination);_ths.start(_tht);_ths.stop(_tht+0.5);
                }}catch(e){}
            }
            // Screen flash
            if(pt<0.1){
                ctx.fillStyle='rgba(255,255,255,'+(0.6-pt*6)+')';
                ctx.fillRect(0,0,W,H);
            }
        }

        // Characters appear as silhouettes then light up
        var charAlpha=Math.min(1,pt/0.6);
        var litUp=Math.max(0,(pt-0.4)/0.6);
        ctx.globalAlpha=charAlpha;
        if(litUp<1){
            // Silhouette phase
            var silColor='rgba(10,10,20,'+(1-litUp)+')';
            _drawIntroEgg(ctx,cx,cy,eggSize,silColor,silColor,false,false);
            _drawIntroEgg(ctx,rx,ry,eggSize,silColor,silColor,true,false);
        }
        if(litUp>0){
            ctx.globalAlpha=charAlpha*litUp;
            _drawIntroEgg(ctx,cx,cy,eggSize,'#FFDD44','#FFAA00',false,litUp>0.5);
            _drawIntroEgg(ctx,rx,ry,eggSize,'#8B4513','#5C2E0A',true,litUp>0.5);
        }
        ctx.globalAlpha=1;
        ctx.restore();
    }

    // ======== PHASE 2: Face off with bounce + flight effects (2.5-5s) ========
    if(t>=2.5&&t<5){
        ctx.save();
        ctx.translate(0,panY);
        var bounce=Math.sin((t-2.5)*8)*4*scale;
        var _ft=(t-2.5);
        // Speed lines behind each character
        ctx.strokeStyle='rgba(255,255,200,0.3)';ctx.lineWidth=1.5*scale;
        for(var _sli=0;_sli<6;_sli++){
            var _slOff=(_ft*80+_sli*25)%120;
            var _slY=cy-eggSize+_sli*eggSize*0.4+bounce;
            ctx.globalAlpha=Math.max(0,1-_slOff/120)*0.4;
            ctx.beginPath();ctx.moveTo(cx-eggSize*0.8-_slOff*scale,_slY);ctx.lineTo(cx-eggSize*0.5,_slY);ctx.stroke();
            var _slY2=ry-eggSize+_sli*eggSize*0.4-bounce;
            ctx.beginPath();ctx.moveTo(rx+eggSize*0.8+_slOff*scale,_slY2);ctx.lineTo(rx+eggSize*0.5,_slY2);ctx.stroke();
        }
        ctx.globalAlpha=1;
        // Afterimage trails (semi-transparent copies offset behind)
        ctx.globalAlpha=0.15;
        _drawIntroEgg(ctx,cx-6*scale,cy+bounce+2*scale,eggSize,'#FFDD44','#FFAA00',false,true);
        _drawIntroEgg(ctx,rx+6*scale,ry-bounce+2*scale,eggSize,'#8B4513','#5C2E0A',true,true);
        ctx.globalAlpha=0.3;
        _drawIntroEgg(ctx,cx-3*scale,cy+bounce+1*scale,eggSize,'#FFDD44','#FFAA00',false,true);
        _drawIntroEgg(ctx,rx+3*scale,ry-bounce+1*scale,eggSize,'#8B4513','#5C2E0A',true,true);
        ctx.globalAlpha=1;
        // Aura glow around characters
        var _auraAlpha=0.15+Math.sin(_ft*6)*0.1;
        ctx.fillStyle='rgba(255,220,100,'+_auraAlpha+')';
        ctx.beginPath();ctx.arc(cx,cy+bounce,eggSize*1.3,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='rgba(139,69,19,'+_auraAlpha+')';
        ctx.beginPath();ctx.arc(rx,ry-bounce,eggSize*1.3,0,Math.PI*2);ctx.fill();
        // Main characters
        _drawIntroEgg(ctx,cx,cy+bounce,eggSize,'#FFDD44','#FFAA00',false,true);
        _drawIntroEgg(ctx,rx,ry-bounce,eggSize,'#8B4513','#5C2E0A',true,true);
        // White cat strolls across — walk, stop to watch, then run away
        var _catT=(t-2.5)/2.5; // 0 to 1 over 2.5 seconds
        // Movement: walk 0-0.3, stop 0.3-0.6 (watching), run 0.6-1.0
        var _catProgress;
        var _catStopped=false;
        var _catRunning=false;
        if(_catT<0.3){_catProgress=_catT/0.3*0.3;}
        // Cat meow when stopping
        if(_catT>=0.3&&_catT<0.35&&!window._introCatMeowed){
            window._introCatMeowed=true;
            try{var _mCtx=ensureAudio();if(_mCtx&&sfxEnabled){var _mt=_mCtx.currentTime;
                // Realistic cat meow — high pitch slide down with vibrato
                var _mo=_mCtx.createOscillator();var _mg=_mCtx.createGain();
                _mo.type='sine';_mo.frequency.setValueAtTime(900,_mt);_mo.frequency.exponentialRampToValueAtTime(1100,_mt+0.05);_mo.frequency.exponentialRampToValueAtTime(700,_mt+0.2);_mo.frequency.exponentialRampToValueAtTime(500,_mt+0.35);
                _mg.gain.setValueAtTime(0,_mt);_mg.gain.linearRampToValueAtTime(0.1,_mt+0.03);_mg.gain.linearRampToValueAtTime(0.12,_mt+0.1);_mg.gain.exponentialRampToValueAtTime(0.001,_mt+0.4);
                // Vibrato LFO
                var _mvib=_mCtx.createOscillator();var _mvg=_mCtx.createGain();
                _mvib.frequency.value=6;_mvg.gain.value=30;
                _mvib.connect(_mvg);_mvg.connect(_mo.frequency);_mvib.start(_mt);_mvib.stop(_mt+0.4);
                _mo.connect(_mg);_mg.connect(_mCtx.destination);_mo.start(_mt);_mo.stop(_mt+0.4);
            }}catch(e){}
        }
        else if(_catT<0.55){_catProgress=0.3;_catStopped=true;}
        else{_catProgress=0.3+(_catT-0.55)/0.45*0.7;_catRunning=true;} // run fast!
        var _catX=W*0.85-_catProgress*W*0.7; // right to left, leisurely
        var _catY=H*0.88;
        var _catS=12*scale;
        var _headDir=_catStopped?-1:1; // look left normally, look UP when stopped (watching fight)
        // Body
        ctx.fillStyle='#EEEEEE';
        ctx.beginPath();ctx.ellipse(_catX,_catY,_catS*1.2,_catS*0.6,0,0,Math.PI*2);ctx.fill();
        // Head — turns to look at fighters when stopped
        var _headX=_catX-_catS*1.0;
        var _headY=_catStopped?_catY-_catS*0.6:_catY-_catS*0.3;
        ctx.beginPath();ctx.arc(_headX,_headY,_catS*0.5,0,Math.PI*2);ctx.fill();
        // Ears
        ctx.beginPath();ctx.moveTo(_headX-_catS*0.3,_headY-_catS*0.4);ctx.lineTo(_headX-_catS*0.5,_headY-_catS*0.9);ctx.lineTo(_headX-_catS*0.1,_headY-_catS*0.5);ctx.fill();
        ctx.beginPath();ctx.moveTo(_headX+_catS*0.2,_headY-_catS*0.4);ctx.lineTo(_headX+_catS*0.3,_headY-_catS*0.9);ctx.lineTo(_headX+_catS*0.5,_headY-_catS*0.4);ctx.fill();
        // Tail (curved, sways when stopped)
        ctx.strokeStyle='#EEEEEE';ctx.lineWidth=_catS*0.2;ctx.lineCap='round';
        var _tailSway=_catStopped?Math.sin(t*5)*_catS*0.4:0;
        ctx.beginPath();ctx.moveTo(_catX+_catS*1.2,_catY);
        ctx.quadraticCurveTo(_catX+_catS*1.8,_catY-_catS*0.5+_tailSway,_catX+_catS*1.5+_tailSway*0.5,_catY-_catS*1.2);ctx.stroke();
        // Eyes — look up at fighters when stopped
        ctx.fillStyle='#44AA44';
        if(_catStopped){
            // Wide curious eyes looking up
            ctx.beginPath();ctx.ellipse(_headX-_catS*0.15,_headY-_catS*0.1,_catS*0.1,_catS*0.12,0,0,Math.PI*2);ctx.fill();
            ctx.beginPath();ctx.ellipse(_headX+_catS*0.15,_headY-_catS*0.1,_catS*0.1,_catS*0.12,0,0,Math.PI*2);ctx.fill();
        } else {
            ctx.beginPath();ctx.arc(_headX-_catS*0.2,_headY-_catS*0.05,_catS*0.08,0,Math.PI*2);ctx.fill();
        }
        // Legs — walk animation or sitting when stopped
        ctx.strokeStyle='#DDDDDD';ctx.lineWidth=_catS*0.15;
        if(_catStopped){
            // Sitting pose — front legs straight, back legs tucked
            ctx.beginPath();ctx.moveTo(_catX-_catS*0.6,_catY+_catS*0.2);ctx.lineTo(_catX-_catS*0.6,_catY+_catS*0.6);ctx.stroke();
            ctx.beginPath();ctx.moveTo(_catX-_catS*0.3,_catY+_catS*0.2);ctx.lineTo(_catX-_catS*0.3,_catY+_catS*0.6);ctx.stroke();
        } else {
            var _legPhase=_catRunning?_catProgress*80:_catProgress*30;
            for(var _li=0;_li<4;_li++){
                var _lx=_catX+(_li-1.5)*_catS*0.5;
                var _ly=_catY+_catS*0.5+Math.sin(_legPhase+_li*1.5)*_catS*(_catRunning?0.4:0.25);
                ctx.beginPath();ctx.moveTo(_lx,_catY+_catS*0.2);ctx.lineTo(_lx,_ly);ctx.stroke();
            }
        }
        ctx.restore();
    }

    // ======== PHASE 3: Beam attack (5-6.5s) ========
    if(t>=5&&t<6.5){
        ctx.save();
        ctx.translate(0,panY);
        var pt=t-5;

        if(pt<0.3){
            // Crouch and wind up — charge sound
            if(!window._introChargePlayed){
                window._introChargePlayed=true;
                try{var _chCtx=ensureAudio();if(_chCtx&&sfxEnabled){var _cht=_chCtx.currentTime;
                    var _cho=_chCtx.createOscillator();var _chg=_chCtx.createGain();
                    _cho.type='sine';_cho.frequency.setValueAtTime(100,_cht);_cho.frequency.exponentialRampToValueAtTime(800,_cht+0.4);
                    _chg.gain.setValueAtTime(0.08,_cht);_chg.gain.linearRampToValueAtTime(0.15,_cht+0.3);_chg.gain.exponentialRampToValueAtTime(0.001,_cht+0.5);
                    _cho.connect(_chg);_chg.connect(_chCtx.destination);_cho.start(_cht);_cho.stop(_cht+0.5);
                }}catch(e){}
            }
            var crouch=pt/0.3;
            var bodyX=cx-crouch*8*scale;
            var bodyY=cy+crouch*10*scale;
            _drawIntroEgg(ctx,bodyX,bodyY,eggSize*0.95,'#FFDD44','#FFAA00',false,true);
            _drawIntroEgg(ctx,rx,ry,eggSize,'#8B4513','#5C2E0A',true,true);
        } else if(pt<0.8){
            // Arms extend, beam fires — release sound
            if(!window._introFirePlayed){
                window._introFirePlayed=true;
                try{var _frCtx=ensureAudio();if(_frCtx&&sfxEnabled){var _frt=_frCtx.currentTime;
                    // Whoosh + bass boom
                    var _frb=_frCtx.createBuffer(1,Math.floor(_frCtx.sampleRate*0.4),_frCtx.sampleRate);
                    var _frd=_frb.getChannelData(0);
                    for(var _fri=0;_fri<_frd.length;_fri++){var _frp=_fri/_frd.length;_frd[_fri]=(Math.random()-0.5)*0.6*Math.exp(-_frp*4);}
                    var _frs=_frCtx.createBufferSource();_frs.buffer=_frb;
                    var _frg=_frCtx.createGain();_frg.gain.value=0.2;
                    _frs.connect(_frg);_frg.connect(_frCtx.destination);_frs.start(_frt);_frs.stop(_frt+0.4);
                    var _fro=_frCtx.createOscillator();var _frog=_frCtx.createGain();
                    _fro.type='sine';_fro.frequency.setValueAtTime(200,_frt);_fro.frequency.exponentialRampToValueAtTime(60,_frt+0.3);
                    _frog.gain.setValueAtTime(0.15,_frt);_frog.gain.exponentialRampToValueAtTime(0.001,_frt+0.35);
                    _fro.connect(_frog);_frog.connect(_frCtx.destination);_fro.start(_frt);_fro.stop(_frt+0.35);
                }}catch(e){}
            }
            var fire=(pt-0.3)/0.5;
            var bodyX=cx-5*scale;
            var bodyY=cy+8*scale;
            _drawIntroEgg(ctx,bodyX,bodyY,eggSize*0.95,'#FFDD44','#FFAA00',false,true);

            // Arms extending forward
            var armEndX=bodyX+eggSize*0.5+fire*eggSize*0.6;
            ctx.strokeStyle='#FFCC00';
            ctx.lineWidth=5*scale;
            ctx.beginPath();
            ctx.moveTo(bodyX+eggSize*0.35,bodyY-eggSize*0.05);
            ctx.lineTo(armEndX,bodyY-eggSize*0.1);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(bodyX+eggSize*0.35,bodyY+eggSize*0.1);
            ctx.lineTo(armEndX,bodyY+eggSize*0.05);
            ctx.stroke();
            // Hands
            _drawFist(ctx,armEndX+eggSize*0.1,bodyY-eggSize*0.1,eggSize*0.18,'#FFDD44');
            _drawFist(ctx,armEndX+eggSize*0.1,bodyY+eggSize*0.05,eggSize*0.18,'#FFDD44');

            // Draw cockroach FIRST (behind beam)
            _drawIntroEgg(ctx,rx,ry,eggSize,'#8B4513','#5C2E0A',true,true);
            // Half-circle at hands + rectangular beam (on top of enemy)
            var ebX=armEndX+eggSize*0.1;
            var beamLen=fire*W*0.7;
            var beamH=eggSize*0.5+fire*eggSize*1.0;
            var beamGrad=ctx.createLinearGradient(ebX,bodyY,ebX+beamLen,bodyY);
            beamGrad.addColorStop(0,'rgba(255,140,50,'+fire*0.9+')');
            beamGrad.addColorStop(0.5,'rgba(255,220,120,'+fire*0.7+')');
            beamGrad.addColorStop(1,'rgba(255,240,200,0)');
            ctx.fillStyle=beamGrad;
            ctx.fillRect(ebX,bodyY-beamH*0.5,beamLen,beamH);
            ctx.fillStyle='rgba(255,140,50,'+fire*0.9+')';
            ctx.beginPath();ctx.arc(ebX,bodyY,beamH*0.55,Math.PI*0.5,Math.PI*1.5);ctx.fill();
            ctx.fillStyle='rgba(255,240,200,'+fire*0.7+')';
            ctx.fillRect(ebX,bodyY-beamH*0.25,beamLen*0.8,beamH*0.5);
            ctx.beginPath();ctx.arc(ebX,bodyY,beamH*0.3,Math.PI*0.5,Math.PI*1.5);ctx.fill();
        } else {
            // Impact — explosion + cockroach flies back
            if(!window._introExpPlayed){
                window._introExpPlayed=true;
                try{var _exCtx=ensureAudio();if(_exCtx&&sfxEnabled){var _ext=_exCtx.currentTime;
                    var _exb=_exCtx.createBuffer(1,Math.floor(_exCtx.sampleRate*0.3),_exCtx.sampleRate);
                    var _exd=_exb.getChannelData(0);
                    for(var _exi=0;_exi<_exd.length;_exi++){var _exp2=_exi/_exd.length;_exd[_exi]=(Math.random()-0.5)*0.8*Math.exp(-_exp2*5)*Math.sin(_exp2*Math.PI*15);}
                    var _exs=_exCtx.createBufferSource();_exs.buffer=_exb;
                    var _exg=_exCtx.createGain();_exg.gain.value=0.25;
                    _exs.connect(_exg);_exg.connect(_exCtx.destination);_exs.start(_ext);_exs.stop(_ext+0.3);
                }}catch(e){}
            }
            var hit=(pt-0.8)/0.7;
            // Big fireball explosion (like the reference image)
            if(hit<0.6){
                var _fbP=hit/0.6; // 0 to 1
                var _fbR=eggSize*(1+_fbP*4); // grows big
                var _fbX=rx-eggSize*0.3;
                var _fbY=ry;
                // Outer orange glow
                var _fbGrad=ctx.createRadialGradient(_fbX,_fbY,0,_fbX,_fbY,_fbR);
                _fbGrad.addColorStop(0,'rgba(255,255,180,'+(1-_fbP*0.8)+')');
                _fbGrad.addColorStop(0.3,'rgba(255,220,80,'+(0.9-_fbP*0.6)+')');
                _fbGrad.addColorStop(0.6,'rgba(255,140,30,'+(0.8-_fbP*0.5)+')');
                _fbGrad.addColorStop(0.85,'rgba(200,60,10,'+(0.6-_fbP*0.4)+')');
                _fbGrad.addColorStop(1,'rgba(100,20,0,0)');
                ctx.fillStyle=_fbGrad;
                ctx.beginPath();ctx.arc(_fbX,_fbY,_fbR,0,Math.PI*2);ctx.fill();
                // Inner bright core
                var _coreR=_fbR*0.4*(1-_fbP*0.5);
                var _coreGrad=ctx.createRadialGradient(_fbX,_fbY-_fbR*0.1,0,_fbX,_fbY-_fbR*0.1,_coreR);
                _coreGrad.addColorStop(0,'rgba(255,255,240,'+(1-_fbP)+')');
                _coreGrad.addColorStop(1,'rgba(255,200,100,0)');
                ctx.fillStyle=_coreGrad;
                ctx.beginPath();ctx.arc(_fbX,_fbY-_fbR*0.1,_coreR,0,Math.PI*2);ctx.fill();
                // Flame tongues (random spikes)
                for(var _fti=0;_fti<8;_fti++){
                    var _fta=_fti/8*Math.PI*2+_fbP*2;
                    var _ftLen=_fbR*(0.8+Math.sin(_fta*3+_fbP*10)*0.4);
                    var _ftW=_fbR*0.15;
                    ctx.fillStyle='rgba(255,'+(120+Math.floor(Math.random()*80))+',20,'+(0.6-_fbP*0.5)+')';
                    ctx.beginPath();
                    ctx.moveTo(_fbX+Math.cos(_fta)*_fbR*0.5,_fbY+Math.sin(_fta)*_fbR*0.5);
                    ctx.lineTo(_fbX+Math.cos(_fta)*_ftLen+Math.cos(_fta+0.3)*_ftW,_fbY+Math.sin(_fta)*_ftLen+Math.sin(_fta+0.3)*_ftW);
                    ctx.lineTo(_fbX+Math.cos(_fta)*_ftLen-Math.cos(_fta+0.3)*_ftW,_fbY+Math.sin(_fta)*_ftLen-Math.sin(_fta+0.3)*_ftW);
                    ctx.fill();
                }
                // Smoke puffs rising
                if(_fbP>0.3){
                    var _smA=(1-_fbP)*0.5;
                    for(var _si2=0;_si2<4;_si2++){
                        ctx.fillStyle='rgba(80,60,40,'+_smA+')';
                        ctx.beginPath();
                        ctx.arc(_fbX+(_si2-1.5)*_fbR*0.3,_fbY-_fbR*(0.5+_fbP*0.8)+_si2*_fbR*0.15,_fbR*0.2+_si2*_fbR*0.05,0,Math.PI*2);
                        ctx.fill();
                    }
                }
            }
            var flashAlpha=Math.max(0,1-hit*3);
            if(flashAlpha>0) _drawFlash(ctx,rx-eggSize*0.5,ry-eggSize*0.2,eggSize*3,flashAlpha);
            _drawIntroEgg(ctx,cx+20*scale,cy,eggSize,'#FFDD44','#FFAA00',false,true);
            // Cockroach flies back and up spinning
            var flyX=rx+hit*W*0.3;
            var flyY=ry-Math.sin(hit*Math.PI)*H*0.3;
            var spin=hit*Math.PI*4;
            ctx.save();
            ctx.translate(flyX,flyY);
            ctx.rotate(spin);
            _drawIntroEgg(ctx,0,0,eggSize*(1-hit*0.3),'#8B4513','#5C2E0A',true,hit<0.5);
            ctx.restore();
            // Hit sparks
            if(hit<0.4){
                for(var si=0;si<5;si++){
                    var sa=si*Math.PI*2/5+hit*2;
                    var sr=hit*eggSize*4;
                    ctx.fillStyle='rgba(255,255,200,'+(0.8-hit*2)+')';
                    ctx.beginPath();
                    ctx.arc(rx-eggSize*0.3+Math.cos(sa)*sr,ry-eggSize*0.2+Math.sin(sa)*sr,3*scale,0,Math.PI*2);
                    ctx.fill();
                }
            }
        }
        ctx.restore();
    }

    // ======== PHASE 4: Pan up skyscraper + title (6.5-8.5s) ========
    if(t>6.5){
        var titleAlpha=Math.min(1,(t-7)/1.0);
        // Main skyscraper slides up from below
        var _slideIn=Math.min(1,(t-6.5)/1.0); // 0→1 over 1 second
        var _slideEase=_slideIn<0.5?2*_slideIn*_slideIn:1-Math.pow(-2*_slideIn+2,2)/2;
        var bldW=W*0.35,bldH=H*1.8;
        var bldX=(W-bldW)/2;
        var bldY=H-bldH+panY+H*(1-_slideEase); // starts below screen, slides up
        ctx.globalAlpha=_slideEase;
        _drawBuilding(ctx,bldX,bldY,bldW,bldH,'#3a2848','rgba(255,220,100,0.85)');
        ctx.fillStyle='#4a3858';
        ctx.fillRect(bldX+bldW*0.1,bldY,bldW*0.8,bldH*0.02);
        ctx.shadowColor='rgba(255,215,0,0.5)';
        ctx.shadowBlur=30*scale;
        ctx.fillStyle='rgba(255,215,0,0.08)';
        ctx.fillRect(bldX,bldY,bldW,bldH);
        ctx.shadowBlur=0;
        ctx.globalAlpha=1;

        // Title with screen shake
        if(titleAlpha>0){
            var shakeX=0,shakeY=0;
            if(t>7&&t<7.5){
                var shakeT=(t-7)/0.5;
                var shakeAmp=(1-shakeT)*8*scale;
                shakeX=Math.sin(shakeT*40)*shakeAmp;
                shakeY=Math.cos(shakeT*35)*shakeAmp;
            }
            ctx.save();
            ctx.translate(shakeX,shakeY);
            ctx.globalAlpha=titleAlpha;

            // Title shadow
            ctx.fillStyle='rgba(0,0,0,0.7)';
            ctx.font='bold '+Math.floor(52*scale)+'px "Segoe UI","PingFang SC","Microsoft YaHei",sans-serif';
            ctx.textAlign='center';
            ctx.fillText(L('title'),W/2+3*scale,H*0.35+3*scale);

            // Main title — gold metallic
            ctx.fillStyle='#FFD700';
            ctx.shadowColor='#FF8800';
            ctx.shadowBlur=25*scale;
            ctx.fillText(L('title'),W/2,H*0.35);
            ctx.shadowBlur=0;

            // Subtitle
            ctx.fillStyle='rgba(255,255,255,0.85)';
            ctx.font=Math.floor(16*scale)+'px "Segoe UI","PingFang SC",sans-serif';
            ctx.fillText('D A N B O   W O R L D',W/2,H*0.35+45*scale);

            // Slogan
            ctx.fillStyle='rgba(255,255,255,0.5)';
            ctx.font='italic '+Math.floor(12*scale)+'px "Segoe UI","PingFang SC",sans-serif';
            ctx.fillText(L('slogan'),W/2,H*0.35+70*scale);

            // Version
            ctx.fillStyle='rgba(255,255,255,0.4)';
            ctx.font=Math.floor(11*scale)+'px "Segoe UI",sans-serif';
            ctx.fillText(L('version'),W/2,H*0.35+95*scale);

            ctx.globalAlpha=1;
            ctx.restore();
        }
    }

    // ======== PHASE 5: PRESS START + button (8.5s+) ========
    if(t>8.5){
        if(!_introSkipped){_introSkipped=true;if(_introCanvas)_introCanvas.style.pointerEvents='none';}
        var btn=document.getElementById('start-btn');
        if(btn)btn.style.opacity='1';
        if(Math.floor(t*2)%2===0){
            ctx.fillStyle='rgba(255,255,255,0.9)';
            ctx.font='bold '+Math.floor(18*scale)+'px "Segoe UI",sans-serif';
            ctx.textAlign='center';
            ctx.fillText('PRESS START',W/2,H*0.75);
        }
    }

    if(_introRunning) requestAnimationFrame(_renderIntro);
}

// Start the intro animation
function _startIntro(){
    _introStart=0;
    _introRunning=true;
    _resizeIntroCanvas();
    requestAnimationFrame(_renderIntro);
}

// Skip intro (tap/click anywhere)
function _skipIntro(){
    if(_introSkipped)return;
    var _now=performance.now?performance.now():Date.now();
    var _elapsed=(_now-_introStart)/1000;
    if(_elapsed<1)return; // ignore taps in first second (prevents tap-to-start from skipping)
    if(_elapsed<5){
        // Before battle ends: skip to battle end (t=5s), not past it
        _introStart=_now-5000;
    } else {
        // After battle: skip to title (t=7.5s)
        _introSkipped=true;
        _introStart=_now-7500;
        var btn=document.getElementById('start-btn');
        if(btn)btn.style.opacity='1';
        if(_introCanvas)_introCanvas.style.pointerEvents='none';
    }
}

if(_introCanvas){
    _introCanvas.addEventListener('click',function(){
        if(!_introStart)return; // intro not started yet (tap-to-start screen)
        if(!_introSkipped){
            _skipIntro();
        } else {
            var btn=document.getElementById('start-btn');
            if(btn)btn.click();
        }
    });
    _introCanvas.addEventListener('touchstart',function(e){
        if(!_introStart)return;
        if((Date.now()-_introStart)>500){
            if(!_introSkipped){
                _skipIntro(); // skips to battle end or title depending on progress
            } else {
                var btn=document.getElementById('start-btn');
                if(btn)btn.click();
            }
        }
    },{passive:true});
}

// Show tap-to-start screen first (needed for iOS audio unlock)
var _tapStartShown=false;
function _showTapStart(){
    if(_tapStartShown)return;
    _tapStartShown=true;
    if(!_introCtx||!_introCanvas)return;
    _resizeIntroCanvas();
    var W=_introCanvas.width,H=_introCanvas.height;
    var ctx=_introCtx;
    var scale=Math.min(W,H)/600;
    // Black screen with tap prompt
    ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
    // Game title small
    ctx.fillStyle='rgba(255,215,0,0.6)';
    ctx.font='bold '+Math.floor(28*scale)+'px "Segoe UI","PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign='center';
    ctx.fillText(L('title'),W/2,H*0.35);
    // Tap to start text (multi-language)
    var _tapText={zhs:'\u70B9\u51FB\u5F00\u59CB',zht:'\u9EDE\u64CA\u958B\u59CB',ja:'\u30BF\u30C3\u30D7\u3057\u3066\u30B9\u30BF\u30FC\u30C8',en:'TAP TO START'};
    var _tapStr=_tapText[_langCode]||_tapText.en;
    ctx.fillStyle='rgba(255,255,255,0.8)';
    ctx.font='bold '+Math.floor(22*scale)+'px "Segoe UI","PingFang SC",sans-serif';
    // Blink effect
    function _blinkTap(){
        if(!_tapStartShown||_introStart)return;
        _resizeIntroCanvas();
        var W2=_introCanvas.width,H2=_introCanvas.height;
        ctx.fillStyle='#000';ctx.fillRect(0,0,W2,H2);
        ctx.fillStyle='rgba(255,215,0,0.6)';
        ctx.font='bold '+Math.floor(28*(H2/600))+'px "Segoe UI","PingFang SC","Microsoft YaHei",sans-serif';
        ctx.textAlign='center';
        ctx.fillText(L('title'),W2/2,H2*0.35);
        if(Math.floor(Date.now()/500)%2===0){
            ctx.fillStyle='rgba(255,255,255,0.8)';
            ctx.font='bold '+Math.floor(22*(H2/600))+'px "Segoe UI","PingFang SC",sans-serif';
            ctx.fillText(_tapStr,W2/2,H2*0.55);
        }
        requestAnimationFrame(_blinkTap);
    }
    _blinkTap();
}
function _onTapStart(){
    if(_introStart)return; // already started
    _unlockAudio();
    _startIntro();
    // Remove tap listeners
    _introCanvas.removeEventListener('click',_onTapStart);
    _introCanvas.removeEventListener('touchstart',_onTapStart);
    document.removeEventListener('keydown',_onTapStartKey);
}
function _onTapStartKey(e){
    if(_introStart&&!_introSkipped){_skipIntro();return;}
    if(!_introStart)_onTapStart();
}
if(_introCanvas){
    _introCanvas.addEventListener('click',function(){
        if(_introStart&&!_introSkipped){_skipIntro();return;}
        if(!_introStart)_onTapStart();
    });
    _introCanvas.addEventListener('touchstart',function(){
        if(_introStart&&!_introSkipped){_skipIntro();return;}
        _onTapStart();
    },{passive:true});
}
document.addEventListener('keydown',_onTapStartKey);
_showTapStart();
