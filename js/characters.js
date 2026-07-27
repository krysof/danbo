// characters.js — DANBO World
const CHARACTERS = [
    // SF2 select screen layout: top row L→R, bottom row L→R
    {name:'\u7ECF\u5178\u86CB\u5B9D',type:'egg',color:0xFFFDF2,accent:0xEF4A5B,icon:'\uD83E\uDD5A',portrait:'#FFFDF2',sf2:'Ryu',country:'Japan',flag:'\uD83C\uDDEF\uD83C\uDDF5',mapX:360,mapY:52},
    {name:'\u91CE\u725B',type:'bull',color:0xFFD1A0,accent:0xFF8A55,icon:'\uD83D\uDC03',portrait:'#FFD1A0',sf2:'E.Honda',country:'Japan',flag:'\uD83C\uDDEF\uD83C\uDDF5',mapX:360,mapY:52},
    {name:'\u732B\u4ED4',type:'cat',color:0x72E889,accent:0x65C7FF,icon:'\uD83D\uDC31',portrait:'#72E889',sf2:'Blanka',country:'Brazil',flag:'\uD83C\uDDE7\uD83C\uDDF7',mapX:95,mapY:155},
    {name:'\u9E21\u516C',type:'rooster',color:0xBFEA7C,accent:0xFF7BA3,icon:'\uD83D\uDC13',portrait:'#BFEA7C',sf2:'Guile',country:'USA',flag:'\uD83C\uDDFA\uD83C\uDDF8',mapX:70,mapY:55},
    {name:'\u72D7\u4ED4',type:'dog',color:0xFF7E86,accent:0xFFE066,icon:'\uD83D\uDC36',portrait:'#FF7E86',sf2:'Ken',country:'USA',flag:'\uD83C\uDDFA\uD83C\uDDF8',mapX:70,mapY:55},
    {name:'\u9A6C\u9A9D',type:'monkey',color:0x72A8FF,accent:0xFFD66B,icon:'\uD83D\uDC35',portrait:'#72A8FF',sf2:'Chun-Li',country:'China',flag:'\uD83C\uDDE8\uD83C\uDDF3',mapX:310,mapY:55},
    {name:'\u5927\u718A',type:'bear',color:0xCFA06A,accent:0xF7C95A,icon:'\uD83D\uDC3B',portrait:'#CFA06A',sf2:'Zangief',country:'Russia',flag:'\uD83C\uDDF7\uD83C\uDDFA',mapX:290,mapY:18},
    {name:'\u66F1\u7534',type:'cockroach',color:0xC9A64F,accent:0xFFFFFF,icon:'\uD83E\uDEB3',portrait:'#C9A64F',sf2:'Dhalsim',country:'India',flag:'\uD83C\uDDEE\uD83C\uDDF3',mapX:278,mapY:88},
];
let selectedChar = 0;
// Apply localized character names
for(var _ci=0;_ci<CHARACTERS.length;_ci++){CHARACTERS[_ci].name=I18N.charNames[_langCode][_ci]||CHARACTERS[_ci].name;}
const AI_COLORS=[0xFFAA44,0x66DD66,0xFF5555,0x88CCDD,0xEEEE55,0xCC88CC,0xFFBBCC,0xAA88BB,0xFF8855,0x77BBFF,0xBB88FF,0xFFCC88,0xAAFF77,0xFF77AA,0x77DDDD,0xDDAA55];

// ---- SF2 Character Select Grid ----
const charGrid = document.getElementById('char-grid');
const portraitCanvas = document.getElementById('portrait-canvas');
const portraitCtx = portraitCanvas ? portraitCanvas.getContext('2d') : null;
const portraitName = document.getElementById('portrait-name');

function _setupHiDPICanvas(canvas,fallbackW,fallbackH){
    if(!canvas)return null;
    var dpr=Math.min(window.devicePixelRatio||1,3);
    var cs=window.getComputedStyle?getComputedStyle(canvas):null;
    var cssW=(cs&&parseFloat(cs.width))||canvas.clientWidth||fallbackW||canvas.width||1;
    var cssH=(cs&&parseFloat(cs.height))||canvas.clientHeight||fallbackH||canvas.height||1;
    if(!canvas.style.width&&fallbackW)canvas.style.width=fallbackW+'px';
    if(!canvas.style.height&&fallbackH)canvas.style.height=fallbackH+'px';
    var bw=Math.max(1,Math.round(cssW*dpr));
    var bh=Math.max(1,Math.round(cssH*dpr));
    if(canvas.width!==bw)canvas.width=bw;
    if(canvas.height!==bh)canvas.height=bh;
    var ctx=canvas.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.imageSmoothingEnabled=true;
    if(ctx.imageSmoothingQuality)ctx.imageSmoothingQuality='high';
    return {ctx:ctx,w:cssW,h:cssH,dpr:dpr};
}

function _drawCuteRoundPortrait(ctx,ch,W,H){
    var ac='#'+((ch.accent||0).toString(16)).padStart(6,'0');
    ctx.clearRect(0,0,W,H);
    var bg=ctx.createLinearGradient(0,0,W,H);
    bg.addColorStop(0,'#FFF4FB');bg.addColorStop(0.5,'#FFEEDC');bg.addColorStop(1,'#DFF3FF');
    ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    for(var bi=0;bi<13;bi++){
        var bx=16+((bi*43)%Math.max(28,W-32));
        var by=18+((bi*67)%Math.max(34,H-48));
        var br=4+(bi%4)*3;
        ctx.beginPath();ctx.arc(bx,by,br,0,Math.PI*2);
        ctx.fillStyle=bi%2?'rgba(255,255,255,0.48)':'rgba(255,160,205,0.18)';
        ctx.fill();
    }
    var cx=W/2,cy=H*0.54;
    var rx=54,ry=64;
    if(ch.type==='cat'||ch.type==='bull'){rx=62;ry=58;}
    else if(ch.type==='bear'){rx=68;ry=68;}
    else if(ch.type==='cockroach'){rx=44;ry=70;}
    else if(ch.type==='monkey'){rx=50;ry=66;}

    function ear(x,y,r,col){ctx.fillStyle=col||ch.portrait;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
    if(ch.type==='dog'){[-1,1].forEach(function(s){ctx.fillStyle=ch.portrait;ctx.beginPath();ctx.ellipse(cx+s*48,cy-52,14,28,s*0.3,0,Math.PI*2);ctx.fill();});}
    else if(ch.type==='cat'){[-1,1].forEach(function(s){ctx.fillStyle=ch.portrait;ctx.beginPath();ctx.moveTo(cx+s*30,cy-64);ctx.lineTo(cx+s*52,cy-30);ctx.lineTo(cx+s*16,cy-38);ctx.closePath();ctx.fill();});}
    else if(ch.type==='bear'){[-1,1].forEach(function(s){ear(cx+s*42,cy-58,16,ch.portrait);});}
    else if(ch.type==='monkey'){[-1,1].forEach(function(s){ear(cx+s*50,cy-22,17,'#FFD5AF');});}
    else if(ch.type==='bull'){[-1,1].forEach(function(s){ctx.fillStyle='#FFF0C8';ctx.beginPath();ctx.moveTo(cx+s*33,cy-48);ctx.quadraticCurveTo(cx+s*68,cy-58,cx+s*58,cy-78);ctx.quadraticCurveTo(cx+s*50,cy-57,cx+s*25,cy-42);ctx.closePath();ctx.fill();});}
    else if(ch.type==='rooster'){ctx.fillStyle='#FF6F7D';for(var ri=0;ri<3;ri++){ctx.beginPath();ctx.arc(cx-10+ri*10,cy-70+Math.abs(ri-1)*4,10,0,Math.PI*2);ctx.fill();}}
    else if(ch.type==='cockroach'){[-1,1].forEach(function(s){ctx.strokeStyle='#7A552A';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(cx+s*12,cy-58);ctx.quadraticCurveTo(cx+s*42,cy-92,cx+s*55,cy-74);ctx.stroke();});}

    ctx.beginPath();ctx.ellipse(cx,cy+ry*0.82,rx*0.84,12,0,0,Math.PI*2);
    ctx.fillStyle='rgba(126,96,135,0.14)';ctx.fill();
    [-1,1].forEach(function(s){
        ctx.beginPath();ctx.ellipse(cx+s*(rx*0.86),cy+20,12,28,s*0.18,0,Math.PI*2);
        ctx.fillStyle=ch.portrait;ctx.fill();
    });
    [-1,1].forEach(function(s){
        ctx.beginPath();ctx.ellipse(cx+s*25,cy+ry*0.86,17,9,0,0,Math.PI*2);
        ctx.fillStyle=ac;ctx.fill();
    });
    ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);
    ctx.fillStyle=ch.portrait;ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.86)';ctx.lineWidth=4;ctx.stroke();
    ctx.beginPath();ctx.ellipse(cx-18,cy-30,rx*0.25,ry*0.16,-0.35,0,Math.PI*2);
    ctx.fillStyle='rgba(255,255,255,0.28)';ctx.fill();

    if(ch.type==='egg'){
        ctx.strokeStyle='#FFFBEF';ctx.lineWidth=3;ctx.beginPath();
        ctx.moveTo(cx-28,cy-56);ctx.lineTo(cx-20,cy-68);ctx.lineTo(cx-9,cy-56);ctx.lineTo(cx+2,cy-70);ctx.lineTo(cx+13,cy-56);ctx.lineTo(cx+24,cy-66);ctx.lineTo(cx+32,cy-56);ctx.stroke();
    }

    [-1,1].forEach(function(s){
        ctx.beginPath();ctx.ellipse(cx+s*20,cy-15,8,20,0,0,Math.PI*2);
        ctx.fillStyle='#171A2A';ctx.fill();
        ctx.beginPath();ctx.arc(cx+s*17,cy-23,2.8,0,Math.PI*2);
        ctx.fillStyle='#fff';ctx.fill();
        ctx.beginPath();ctx.ellipse(cx+s*20,cy-4,3,2,0,0,Math.PI*2);
        ctx.fillStyle='#4056A5';ctx.fill();
    });
    [-1,1].forEach(function(s){
        ctx.beginPath();ctx.ellipse(cx+s*34,cy+10,11,7,0,0,Math.PI*2);
        ctx.fillStyle='rgba(255,125,165,0.46)';ctx.fill();
    });
    ctx.beginPath();ctx.arc(cx,cy+13,13,0.18*Math.PI,0.82*Math.PI);
    ctx.strokeStyle='#2B202B';ctx.lineWidth=2.5;ctx.stroke();
}

function drawPortrait(ch) {
    if (!portraitCanvas) return;
    var hd=_setupHiDPICanvas(portraitCanvas,220,260);
    if(!hd)return;
    var portraitCtx=hd.ctx;
    var W=hd.w, H=hd.h;
    if(typeof DANBO_CUTE_STYLE!=='undefined'&&String(DANBO_CUTE_STYLE).indexOf('round-minimal')===0){
        _drawCuteRoundPortrait(portraitCtx,ch,W,H);
        return;
    }
    var _ac='#'+((ch.accent||0).toString(16)).padStart(6,'0');
    portraitCtx.clearRect(0,0,W,H);
    var bg=portraitCtx.createLinearGradient(0,0,W,H);
    bg.addColorStop(0,'#FFF2FA');bg.addColorStop(0.45,'#FFE7D6');bg.addColorStop(1,'#DDEEFF');
    portraitCtx.fillStyle=bg;portraitCtx.fillRect(0,0,W,H);
    // Pastel bubbles/stars make the select portrait feel like a toy-card illustration.
    for(var _bgi=0;_bgi<12;_bgi++){
        var _bx=18+((_bgi*47)%Math.max(30,W-36));
        var _by=18+((_bgi*73)%Math.max(40,H-54));
        var _br=4+(_bgi%4)*3;
        portraitCtx.beginPath();portraitCtx.arc(_bx,_by,_br,0,Math.PI*2);
        portraitCtx.fillStyle=_bgi%2?'rgba(255,255,255,0.42)':'rgba(255,180,210,0.20)';
        portraitCtx.fill();
    }
    var cx=W/2,cy=H*0.52;
    // Body shape varies by character type
    var rx=55,ry=70;
    if(ch.type==='monkey'){rx=42;ry=75;} // Chun-Li: slim
    else if(ch.type==='cat'||ch.type==='bull'){rx=65;ry=60;} // Blanka/Honda: round
    else if(ch.type==='bear'){rx=72;ry=72;} // Zangief: 1.5x big
    else if(ch.type==='cockroach'){rx=30;ry=78;} // Dhalsim: thin tall
    // Drop shadow + tiny limbs behind the round body.
    portraitCtx.beginPath();portraitCtx.ellipse(cx,cy+ry*0.84,rx*0.88,12,0,0,Math.PI*2);
    portraitCtx.fillStyle='rgba(130,95,130,0.16)';portraitCtx.fill();
    [-1,1].forEach(function(s){
        portraitCtx.beginPath();portraitCtx.ellipse(cx+s*(rx*0.86),cy+20,13,34,s*0.20,0,Math.PI*2);
        portraitCtx.fillStyle=ch.portrait;portraitCtx.fill();
        portraitCtx.strokeStyle='rgba(255,255,255,0.65)';portraitCtx.lineWidth=2;portraitCtx.stroke();
        portraitCtx.beginPath();portraitCtx.ellipse(cx+s*(rx*0.78),cy+54,13,8,0,0,Math.PI*2);
        portraitCtx.fillStyle=_ac;portraitCtx.fill();
    });
    // Body
    portraitCtx.beginPath();portraitCtx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);
    portraitCtx.fillStyle=ch.portrait;portraitCtx.fill();
    portraitCtx.strokeStyle='rgba(255,255,255,0.78)';portraitCtx.lineWidth=3;portraitCtx.stroke();
    portraitCtx.beginPath();portraitCtx.ellipse(cx-18,cy-32,rx*0.28,ry*0.18,-0.35,0,Math.PI*2);
    portraitCtx.fillStyle='rgba(255,255,255,0.30)';portraitCtx.fill();
    // Eyes
    var _eyeY=cy-12;
    [-1,1].forEach(function(s){
        portraitCtx.beginPath();portraitCtx.ellipse(cx+s*18,_eyeY,10,12,0,0,Math.PI*2);
        portraitCtx.fillStyle='#fff';portraitCtx.fill();
        portraitCtx.beginPath();portraitCtx.arc(cx+s*18,_eyeY+1,6,0,Math.PI*2);
        portraitCtx.fillStyle='#111';portraitCtx.fill();
        portraitCtx.beginPath();portraitCtx.arc(cx+s*16,_eyeY-3,2,0,Math.PI*2);
        portraitCtx.fillStyle='#fff';portraitCtx.fill();
    });
    // Smile
    portraitCtx.beginPath();portraitCtx.arc(cx,cy+12,14,0.15*Math.PI,0.85*Math.PI);
    portraitCtx.strokeStyle='#333';portraitCtx.lineWidth=2.5;portraitCtx.stroke();
    // Blush
    [-1,1].forEach(function(s){
        portraitCtx.beginPath();portraitCtx.ellipse(cx+s*32,cy+8,10,6,0,0,Math.PI*2);
        portraitCtx.fillStyle='rgba(255,125,160,0.42)';portraitCtx.fill();
    });
    // Small shiny badge/sticker on the chest.
    portraitCtx.save();
    portraitCtx.translate(cx+26,cy+35);portraitCtx.rotate(0.25);
    portraitCtx.beginPath();
    for(var _sti=0;_sti<10;_sti++){
        var _sa=-Math.PI/2+_sti*Math.PI/5;
        var _sr=_sti%2===0?10:4.5;
        var _sx=Math.cos(_sa)*_sr,_sy=Math.sin(_sa)*_sr;
        if(_sti===0)portraitCtx.moveTo(_sx,_sy);else portraitCtx.lineTo(_sx,_sy);
    }
    portraitCtx.closePath();portraitCtx.fillStyle=_ac;portraitCtx.fill();
    portraitCtx.strokeStyle='rgba(255,255,255,0.8)';portraitCtx.lineWidth=1.5;portraitCtx.stroke();
    portraitCtx.restore();
    // ---- Character-specific SF2 features ----
    var _ac='#'+((ch.accent||0).toString(16)).padStart(6,'0');
    if(ch.type==='egg'){
        // Ryu: eggshell + red headband
        portraitCtx.strokeStyle='#FFFFF0';portraitCtx.lineWidth=2.5;
        portraitCtx.beginPath();
        portraitCtx.moveTo(cx-35,cy-55);portraitCtx.lineTo(cx-28,cy-65);portraitCtx.lineTo(cx-15,cy-52);
        portraitCtx.lineTo(cx-5,cy-68);portraitCtx.lineTo(cx+8,cy-54);portraitCtx.lineTo(cx+20,cy-66);
        portraitCtx.lineTo(cx+30,cy-53);portraitCtx.lineTo(cx+38,cy-58);portraitCtx.stroke();
        // Red headband
        portraitCtx.strokeStyle='#CC2222';portraitCtx.lineWidth=5;
        portraitCtx.beginPath();portraitCtx.arc(cx,cy-48,38,0.7*Math.PI,0.3*Math.PI);portraitCtx.stroke();
        // Trailing ends
        portraitCtx.beginPath();portraitCtx.moveTo(cx+36,cy-42);portraitCtx.quadraticCurveTo(cx+50,cy-35,cx+55,cy-25);
        portraitCtx.strokeStyle='#CC2222';portraitCtx.lineWidth=4;portraitCtx.stroke();
    } else if(ch.type==='dog'){
        // Ken: floppy ears + blonde spiky hair
        [-1,1].forEach(function(s){
            portraitCtx.beginPath();portraitCtx.ellipse(cx+s*45,cy-50,16,28,s*0.3,0,Math.PI*2);
            portraitCtx.fillStyle=ch.portrait;portraitCtx.fill();
        });
        // Blonde spiky hair
        for(var ki=0;ki<5;ki++){
            portraitCtx.beginPath();portraitCtx.moveTo(cx-20+ki*10,cy-60);
            portraitCtx.lineTo(cx-15+ki*10,cy-80-Math.random()*10);portraitCtx.lineTo(cx-10+ki*10,cy-60);
            portraitCtx.fillStyle='#FFDD44';portraitCtx.fill();
        }
        portraitCtx.beginPath();portraitCtx.ellipse(cx,cy+6,12,8,0,0,Math.PI*2);
        portraitCtx.fillStyle='#333';portraitCtx.fill();
        // Protruding brown muzzle/snout below nose
        portraitCtx.beginPath();portraitCtx.ellipse(cx,cy+18,18,12,0,0,Math.PI*2);
        portraitCtx.fillStyle='#8B5E3C';portraitCtx.fill();
        // Small pink tongue hanging out
        portraitCtx.beginPath();portraitCtx.ellipse(cx+4,cy+30,5,8,0.15,0,Math.PI*2);
        portraitCtx.fillStyle='#FF8899';portraitCtx.fill();
    } else if(ch.type==='bull'){
        // Buffalo (野牛) — Honda
        // Big bull horns (牛魔王 style) — horizontal then curve up
        [-1,1].forEach(function(s){
            // Thick horn going outward then curving up
            portraitCtx.beginPath();
            portraitCtx.moveTo(cx+s*22,cy-40);
            portraitCtx.quadraticCurveTo(cx+s*60,cy-38,cx+s*65,cy-65);
            portraitCtx.lineTo(cx+s*58,cy-62);
            portraitCtx.quadraticCurveTo(cx+s*50,cy-38,cx+s*22,cy-34);
            portraitCtx.closePath();
            portraitCtx.fillStyle='#444';portraitCtx.fill();
            // Horn tip lighter
            portraitCtx.beginPath();portraitCtx.arc(cx+s*63,cy-63,4,0,Math.PI*2);
            portraitCtx.fillStyle='#CCBB88';portraitCtx.fill();
        });
        // Wider muzzle/snout area (darker oval below nostrils)
        portraitCtx.beginPath();portraitCtx.ellipse(cx,cy+14,24,14,0,0,Math.PI*2);
        portraitCtx.fillStyle='#3A2518';portraitCtx.fill();
        // Nose ring
        portraitCtx.beginPath();portraitCtx.arc(cx,cy+22,6,0,Math.PI);
        portraitCtx.strokeStyle='#CCAA00';portraitCtx.lineWidth=3;portraitCtx.stroke();
        // Bigger nostrils
        [-1,1].forEach(function(s){
            portraitCtx.beginPath();portraitCtx.ellipse(cx+s*10,cy+12,6,5,0,0,Math.PI*2);
            portraitCtx.fillStyle='#1A0A00';portraitCtx.fill();
        });
        // Face paint
        portraitCtx.fillStyle='rgba(34,68,170,0.4)';
        portraitCtx.fillRect(cx-38,cy-8,16,4);portraitCtx.fillRect(cx+22,cy-8,16,4);
        portraitCtx.fillStyle='rgba(204,34,34,0.4)';
        portraitCtx.fillRect(cx-38,cy-2,16,4);portraitCtx.fillRect(cx+22,cy-2,16,4);
        // Topknot
        portraitCtx.beginPath();portraitCtx.arc(cx,cy-68,10,0,Math.PI*2);
        portraitCtx.fillStyle='#222';portraitCtx.fill();
    } else if(ch.type==='cat'){
        // Blanka: pointed ears UP + orange wild mane + fangs
        [-1,1].forEach(function(s){
            portraitCtx.beginPath();portraitCtx.moveTo(cx+s*30,cy-60);
            portraitCtx.lineTo(cx+s*50,cy-30);portraitCtx.lineTo(cx+s*15,cy-35);
            portraitCtx.fillStyle=ch.portrait;portraitCtx.fill();
        });
        // Orange wild mane
        for(var bi=0;bi<8;bi++){
            var ba=bi/8*Math.PI-Math.PI/2;
            portraitCtx.beginPath();portraitCtx.moveTo(cx+Math.cos(ba)*30,cy-50+Math.sin(ba)*15);
            portraitCtx.lineTo(cx+Math.cos(ba)*55,cy-55+Math.sin(ba)*25);
            portraitCtx.lineTo(cx+Math.cos(ba+0.3)*35,cy-48+Math.sin(ba+0.3)*15);
            portraitCtx.fillStyle='#FF8800';portraitCtx.fill();
        }
        // 3 darker green horizontal stripe marks on body
        portraitCtx.fillStyle='rgba(20,80,20,0.45)';
        for(var si=0;si<3;si++){
            portraitCtx.fillRect(cx-rx*0.7,cy+si*14-10,rx*1.4,5);
        }
        // Vertical slit pupils (override round pupils)
        [-1,1].forEach(function(s){
            portraitCtx.beginPath();portraitCtx.ellipse(cx+s*18,_eyeY,10,12,0,0,Math.PI*2);
            portraitCtx.fillStyle='#fff';portraitCtx.fill();
            // Vertical slit
            portraitCtx.fillStyle='#111';portraitCtx.fillRect(cx+s*18-2,_eyeY-8,4,16);
            // Highlight
            portraitCtx.beginPath();portraitCtx.arc(cx+s*16,_eyeY-3,2,0,Math.PI*2);
            portraitCtx.fillStyle='#fff';portraitCtx.fill();
        });
        // Fangs
        [-1,1].forEach(function(s){
            portraitCtx.beginPath();portraitCtx.moveTo(cx+s*10,cy+18);portraitCtx.lineTo(cx+s*8,cy+28);
            portraitCtx.lineTo(cx+s*12,cy+18);portraitCtx.fillStyle='#fff';portraitCtx.fill();
        });
        // Whiskers
        [-1,1].forEach(function(s){for(var w=-1;w<=1;w++){
            portraitCtx.beginPath();portraitCtx.moveTo(cx+s*20,cy+8+w*6);portraitCtx.lineTo(cx+s*55,cy+4+w*8);
            portraitCtx.strokeStyle='rgba(0,0,0,0.3)';portraitCtx.lineWidth=1;portraitCtx.stroke();
        }});
    } else if(ch.type==='rooster'){
        // Guile: comb + blonde flat-top + beak
        for(var ri=0;ri<3;ri++){
            portraitCtx.beginPath();portraitCtx.arc(cx-10+ri*10,cy-68+Math.abs(ri-1)*5,10,0,Math.PI*2);
            portraitCtx.fillStyle='#FF3333';portraitCtx.fill();
        }
        // Blonde flat-top
        portraitCtx.fillStyle='#FFDD44';portraitCtx.fillRect(cx-25,cy-78,50,16);
        // Bigger wings on sides
        [-1,1].forEach(function(s){
            portraitCtx.beginPath();
            portraitCtx.moveTo(cx+s*rx*0.6,cy-10);
            portraitCtx.quadraticCurveTo(cx+s*rx*1.6,cy-20,cx+s*rx*1.4,cy+15);
            portraitCtx.quadraticCurveTo(cx+s*rx*1.2,cy+25,cx+s*rx*0.6,cy+20);
            portraitCtx.closePath();
            portraitCtx.fillStyle='#4A5E28';portraitCtx.fill();
            portraitCtx.strokeStyle='rgba(0,0,0,0.15)';portraitCtx.lineWidth=1;portraitCtx.stroke();
        });
        // More tail feathers spread wider
        for(var tf=-2;tf<=2;tf++){
            portraitCtx.beginPath();
            portraitCtx.moveTo(cx+tf*6,cy+ry*0.7);
            portraitCtx.quadraticCurveTo(cx+tf*14,cy+ry+20,cx+tf*18,cy+ry+35);
            portraitCtx.lineTo(cx+tf*12,cy+ry+30);
            portraitCtx.quadraticCurveTo(cx+tf*8,cy+ry+15,cx+tf*4,cy+ry*0.7);
            portraitCtx.closePath();
            portraitCtx.fillStyle=tf%2===0?'#556B2F':'#6B8E23';portraitCtx.fill();
        }
        // Beak
        portraitCtx.beginPath();portraitCtx.moveTo(cx-6,cy+4);portraitCtx.lineTo(cx+6,cy+4);
        portraitCtx.lineTo(cx,cy+16);portraitCtx.fillStyle='#FFAA00';portraitCtx.fill();
        // Wattle
        portraitCtx.beginPath();portraitCtx.ellipse(cx,cy+28,8,12,0,0,Math.PI*2);
        portraitCtx.fillStyle='#FF3333';portraitCtx.fill();
    } else if(ch.type==='monkey'){
        // Chun-Li: round ears + hair buns with white ribbons
        [-1,1].forEach(function(s){
            portraitCtx.beginPath();portraitCtx.arc(cx+s*55,cy-5,18,0,Math.PI*2);
            portraitCtx.fillStyle='#FFCC88';portraitCtx.fill();
            portraitCtx.beginPath();portraitCtx.arc(cx+s*55,cy-5,12,0,Math.PI*2);
            portraitCtx.fillStyle='#D4956B';portraitCtx.fill();
        });
        // Hair buns
        [-1,1].forEach(function(s){
            portraitCtx.beginPath();portraitCtx.arc(cx+s*38,cy-55,14,0,Math.PI*2);
            portraitCtx.fillStyle='#222';portraitCtx.fill();
            // White ribbon
            portraitCtx.beginPath();portraitCtx.moveTo(cx+s*38,cy-42);portraitCtx.lineTo(cx+s*42,cy-30);
            portraitCtx.lineTo(cx+s*34,cy-30);portraitCtx.fillStyle='#fff';portraitCtx.fill();
        });
        // Lighter belly patch (peach oval on lower body center)
        portraitCtx.beginPath();portraitCtx.ellipse(cx,cy+15,20,28,0,0,Math.PI*2);
        portraitCtx.fillStyle='#FFDCB0';portraitCtx.fill();
        portraitCtx.beginPath();portraitCtx.ellipse(cx,cy+10,25,18,0,0,Math.PI*2);
        portraitCtx.fillStyle='#FFCC88';portraitCtx.fill();
    } else if(ch.type==='bear'){
        // Bear with boar mask (Inosuke style) — Zangief
        // Round bear ears
        [-1,1].forEach(function(s){
            portraitCtx.beginPath();portraitCtx.arc(cx+s*38,cy-55,14,0,Math.PI*2);
            portraitCtx.fillStyle='#6B4A2A';portraitCtx.fill();
            portraitCtx.beginPath();portraitCtx.arc(cx+s*38,cy-55,8,0,Math.PI*2);
            portraitCtx.fillStyle='#AA7755';portraitCtx.fill();
        });
        // Boar mask
        portraitCtx.beginPath();portraitCtx.ellipse(cx,cy+2,30,22,0,0,Math.PI*2);
        portraitCtx.fillStyle='#DDCCAA';portraitCtx.fill();
        // Snout
        portraitCtx.beginPath();portraitCtx.ellipse(cx,cy+12,14,10,0,0,Math.PI*2);
        portraitCtx.fillStyle='#CCBB99';portraitCtx.fill();
        [-1,1].forEach(function(s){
            portraitCtx.beginPath();portraitCtx.arc(cx+s*5,cy+12,3,0,Math.PI*2);
            portraitCtx.fillStyle='#885544';portraitCtx.fill();
        });
        // Tusks
        [-1,1].forEach(function(s){
            portraitCtx.beginPath();portraitCtx.moveTo(cx+s*10,cy+18);portraitCtx.lineTo(cx+s*8,cy+28);
            portraitCtx.lineTo(cx+s*14,cy+20);portraitCtx.fillStyle='#FFFFF0';portraitCtx.fill();
        });
        // Bigger paw shapes on sides
        [-1,1].forEach(function(s){
            portraitCtx.beginPath();portraitCtx.ellipse(cx+s*rx*0.95,cy+20,18,22,s*0.2,0,Math.PI*2);
            portraitCtx.fillStyle='#6B4A2A';portraitCtx.fill();
            // Paw pads
            for(var pi=0;pi<3;pi++){
                portraitCtx.beginPath();portraitCtx.arc(cx+s*(rx*0.85+pi*5),cy+12+pi*6,3,0,Math.PI*2);
                portraitCtx.fillStyle='#AA7755';portraitCtx.fill();
            }
        });
        // Chest hair
        portraitCtx.fillStyle='rgba(139,69,19,0.5)';
        portraitCtx.beginPath();portraitCtx.ellipse(cx,cy+15,20,12,0,0,Math.PI*2);portraitCtx.fill();
        // Scars
        portraitCtx.strokeStyle='rgba(200,100,100,0.5)';portraitCtx.lineWidth=2;
        portraitCtx.beginPath();portraitCtx.moveTo(cx-15,cy-5);portraitCtx.lineTo(cx-5,cy+10);portraitCtx.stroke();
        portraitCtx.beginPath();portraitCtx.moveTo(cx+10,cy);portraitCtx.lineTo(cx+20,cy+12);portraitCtx.stroke();
        // Small claw marks
        [-1,1].forEach(function(s){
            portraitCtx.strokeStyle='rgba(60,30,10,0.5)';portraitCtx.lineWidth=1.5;
            for(var ci=0;ci<3;ci++){
                portraitCtx.beginPath();
                portraitCtx.moveTo(cx+s*(rx*0.7)+ci*4,cy+32);
                portraitCtx.lineTo(cx+s*(rx*0.7)+ci*4+s*3,cy+40);
                portraitCtx.stroke();
            }
        });
    } else if(ch.type==='cockroach'){
        // Wing cases on back (two translucent brown ovals behind body)
        [-1,1].forEach(function(s){
            portraitCtx.beginPath();portraitCtx.ellipse(cx+s*18,cy+10,16,35,s*0.2,0,Math.PI*2);
            portraitCtx.fillStyle='rgba(139,105,20,0.3)';portraitCtx.fill();
            portraitCtx.strokeStyle='rgba(92,46,10,0.3)';portraitCtx.lineWidth=1;portraitCtx.stroke();
        });
        // Dhalsim: antennae + skull necklace
        [-1,1].forEach(function(s){
            portraitCtx.beginPath();portraitCtx.moveTo(cx+s*10,cy-55);
            portraitCtx.quadraticCurveTo(cx+s*35,cy-85,cx+s*45,cy-70);
            portraitCtx.strokeStyle='#5C2E0A';portraitCtx.lineWidth=3;portraitCtx.stroke();
            portraitCtx.beginPath();portraitCtx.arc(cx+s*45,cy-70,5,0,Math.PI*2);
            portraitCtx.fillStyle='#8B6040';portraitCtx.fill();
        });
        // Skull necklace
        for(var si=0;si<3;si++){
            portraitCtx.beginPath();portraitCtx.arc(cx-12+si*12,cy+35,5,0,Math.PI*2);
            portraitCtx.fillStyle='#fff';portraitCtx.fill();
            portraitCtx.beginPath();portraitCtx.arc(cx-12+si*12,cy+35,2,0,Math.PI*2);
            portraitCtx.fillStyle='#333';portraitCtx.fill();
        }
    }
}

