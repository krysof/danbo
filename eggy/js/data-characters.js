// ============================================================
//  data-characters.js — Character stats & move parameters
// ============================================================

// ---- Physics constants ----
var CHAR_PHYSICS={
    GRAVITY:0.018, JUMP_FORCE:0.28, MOVE_ACCEL:0.016, MAX_SPEED:0.22, FRICTION:0.92
};

// ---- Stun system ----
var STUN_CONFIG={
    threshold:100,
    damage:{light:8,medium:15,heavy:25,slam:40,special:20},
    hitStunFrames:5,
    grabRange:2.5,
    piledriverRange:5.0
};

// ---- Combat constants (centralized) ----
var COMBAT={
    // Projectile hit
    projectile:{knockbackMul:0.8, vy:0.15, squash:0.5, throwTimer:25, bounces:1, stunDmg:15, npcStunTimer:50, fireDuration:120},
    // Shoryuken/uppercut hit
    shoryuken:{force:0.6, vy:0.4, squash:0.3, throwTimer:50, bounces:2, stunDmg:15, kenFireDuration:90},
    // Tatsumaki/spin hit
    spin:{force:0.6, vy:0.35, squash:0.3, throwTimer:50, bounces:2, stunDmg:15},
    // Rapid hit (hyakuretsu)
    rapidHit:{force:0.5, vy:0.25, squash:0.3, throwTimer:45, bounces:2, stunDmg:10},
    // Blanka roll hit
    blankaRoll:{throwTimer:45, bounces:2, stunDmg:10},
    // Honda dash hit
    hondaDash:{throwTimer:45, bounces:2, stunDmg:10},
    // Somersault kick hit
    somersault:{force:0.6, vy:0.35, squash:0.3, throwTimer:50, bounces:2, stunDmg:20},
    // Electric
    electric:{electrocuteDuration:90},
    // Yoga flame
    yogaFlame:{fireDuration:120, fireStun:90, stunDmg:20},
    // Normal punch hit
    punch:{throwTimer:30, bounces:1, squash:0.4, stunDmg:10, aerialStunDmg:30},
    // Normal kick hit
    kick:{throwTimer:45, bounces:2, squash:0.3, stunDmg:10, aerialStunDmg:30},
    // Body slam
    bodySlam:{baseThrowTimer:40, bounces:2, stunDmg:50},
    // Piledriver
    piledriver:{throwTimer:80, bounces:3, stunTimer:180},
    // Grab/throw
    grab:{stunDmg:20, throwTimer:50, bounces:2, squash:0.3},
    // Stomp/dive attack
    stomp:{baseVy:0.2, throwTimer:20, bounces:1, squash:0.4, stunDmg:30},
    // Prop/object impact
    propImpact:{throwTimer:15, bounces:1, squash:0.4},
    // NPC throw
    npcThrow:{throwTotal:60, throwTimer:60, bounces:2},
    // NPC piledriver
    npcPiledriver:{throwTimer:40, bounces:1, stunDmg:50},
    // NPC body slam
    npcBodySlam:{throwTimer:40, bounces:2, stunTimer:80}
};

// ---- Character definitions ----
var CHAR_DEFS=[
    {name:'egg',color:0xF5F5F0,accent:0xCC2222,icon:'\uD83E\uDD5A',mapX:200,mapY:110,
     bodyShape:'normal',portraitRx:55,portraitRy:70,miniRx:0.32,miniRy:0.38},
    {name:'bull',color:0xBFE8A0,accent:0x8FD16A,icon:'\uD83D\uDC03',mapX:110,mapY:55,
     bodyShape:'round',portraitRx:65,portraitRy:60,miniRx:0.38,miniRy:0.34},
    {name:'cat',color:0xD6F5FF,accent:0x9FE6F5,icon:'\uD83D\uDC31',mapX:300,mapY:52,
     bodyShape:'round',portraitRx:65,portraitRy:60,miniRx:0.38,miniRy:0.34},
    {name:'rooster',color:0x556B2F,accent:0xFFDD44,icon:'\uD83D\uDC13',mapX:200,mapY:34,
     bodyShape:'normal',portraitRx:55,portraitRy:70,miniRx:0.32,miniRy:0.38},
    {name:'dog',color:0xCC2222,accent:0xFFDD44,icon:'\uD83D\uDC36',mapX:335,mapY:120,
     bodyShape:'normal',portraitRx:55,portraitRy:70,miniRx:0.32,miniRy:0.38},
    {name:'monkey',color:0x2255CC,accent:0xFFFFFF,icon:'\uD83D\uDC35',mapX:95,mapY:165,
     bodyShape:'slim',portraitRx:42,portraitRy:75,miniRx:0.25,miniRy:0.42},
    {name:'bear',color:0x8B6B4A,accent:0x8B4513,icon:'\uD83D\uDC3B',mapX:55,mapY:105,
     bodyShape:'big',portraitRx:72,portraitRy:72,miniRx:0.42,miniRy:0.40},
    {name:'cockroach',color:0xFFA040,accent:0xFF7A1A,icon:'\uD83E\uDEB3',mapX:320,mapY:175,
     bodyShape:'thin',portraitRx:30,portraitRy:78,miniRx:0.20,miniRy:0.42}
];

// ---- Special move parameters per character ----
var MOVE_PARAMS={
    // ================================================================
    // 花朵蛋 (egg) — 微弱蛋拳(→→+R) / 花朵蛋拳(↓↑+R) / 百花拳击(←→+T)
    // ================================================================
    egg:{
        // 微弱蛋拳：一发轻柔的蛋能量弹，威力很小、不点燃
        weakPunch:{
            trigger:'ffR',input:'→→+R',        // forward-forward + punch
            name:'微弱蛋拳',type:'projectile',shout:'微弱蛋拳！',
            text:{zhs:'微弱蛋拳！',zht:'微弱蛋拳！',ja:'ふんわりエッグパンチ！',en:'Tiny Egg Punch!'},
            speed:0.3,life:80,color:0xFFE1B0,ringColor:0xFFF3D6,
            burns:false,          // gentle — no fire
            damage:4,stunDmg:6,   // weak damage & stun
            cd:22                 // cooldown frames
        },
        // 花朵蛋拳：向上升腾、绽放花朵的上升重击
        shoryuken:{
            trigger:'bfR',input:'↓↑+R',        // down-up + punch
            name:'花朵蛋拳',type:'shoryuken',shout:'花朵蛋拳！',
            text:{zhs:'花朵蛋拳！',zht:'花朵蛋拳！',ja:'フラワーエッグアッパー！',en:'Flower Egg Uppercut!'},
            jumpMul:1.6,fwdSpeed:0.15,duration:65,
            damage:20,stunDmg:15,
            cd:30
        },
        // 百花拳击：旋转散花的连环击
        tatsumaki:{
            trigger:'bfT',input:'←→+T',        // back-forward + kick
            name:'百花拳击',type:'tatsumaki',shout:'百花拳击！',
            text:{zhs:'百花拳击！',zht:'百花拳擊！',ja:'ひゃっかエッグスピン！',en:'Hundred Flowers Spin!'},
            duration:94,hitForce:0.5,hitVy:0.3,
            damage:12,stunDmg:15,hitCD:12,
            cd:40
        }
    },
    // ================================================================
    // 糖心蛋 (dog) — 甜蜜蛋拳(→→+R) / 糖心攻击(↓↑+R) / 爱心糖果拳(←→+T)
    // ================================================================
    dog:{
        // 甜蜜蛋拳：甜蜜能量弹
        hadouken:{
            trigger:'ffR',input:'→→+R',
            name:'甜蜜蛋拳',type:'projectile',shout:'甜蜜蛋拳！',
            text:{zhs:'甜蜜蛋拳！',zht:'甜蜜蛋拳！',ja:'スイートエッグパンチ！',en:'Sweet Egg Punch!'},
            speed:0.35,life:120,color:0x4488FF,ringColor:0x88AAFF,
            burns:false,
            damage:10,stunDmg:15,
            cd:25
        },
        // 糖心攻击：上升重击，命中点燃
        shoryuken:{
            trigger:'bfR',input:'↓↑+R',
            name:'糖心攻击',type:'shoryuken',shout:'糖心攻击！',
            text:{zhs:'糖心攻击！',zht:'糖心攻擊！',ja:'キャンディハートアタック！',en:'Candy Heart Strike!'},
            jumpMul:1.7,fwdSpeed:0.35,duration:75,
            fire:true,            // this uppercut sets target on fire
            damage:22,stunDmg:15,
            cd:30
        },
        // 爱心糖果拳：旋转连击
        tatsumaki:{
            trigger:'bfT',input:'←→+T',
            name:'爱心糖果拳',type:'tatsumaki',shout:'爱心糖果拳！',
            text:{zhs:'爱心糖果拳！',zht:'愛心糖果拳！',ja:'ラブキャンディパンチ！',en:'Love Candy Punch!'},
            duration:94,hitForce:0.5,hitVy:0.3,
            damage:12,stunDmg:15,hitCD:12,
            cd:40
        }
    },
    // ================================================================
    // 森林蛋 (bull) — 叶片蛋拳(R) / 森林摇摆(←→+R)
    // ================================================================
    bull:{
        // 叶片蛋拳：连打的叶片乱拳（原百裂掌）
        hyakuretsu:{
            trigger:'alwaysR',input:'R (always)',   // normal punch = leaf flurry
            name:'叶片蛋拳',type:'hyakuretsu',shout:'叶片蛋拳！',
            text:{zhs:'叶片蛋拳！',zht:'葉片蛋拳！',ja:'リーフエッグパンチ！',en:'Leaf Egg Punch!'},
            cd:4,range:2.5,hitForce:0.5,hitVy:0.25,
            damage:8,stunDmg:10
        },
        // 森林摇摆：稳沉的冲撞（原头槌冲撞）
        headbutt:{
            trigger:'bfR',input:'←→+R',        // back-forward + punch
            name:'森林摇摆',type:'dash',shout:'森林摇摆！',
            text:{zhs:'森林摇摆！',zht:'森林搖擺！',ja:'フォレストスウェイ！',en:'Forest Sway!'},
            speed:2,duration:60,cd:70,
            damage:15,stunDmg:20
        }
    },
    // ================================================================
    // 水晶蛋 (cat) — 冰晶蛋拳(R) / 冰冻水晶(←→+R)
    // ================================================================
    cat:{
        // 冰晶蛋拳：近身冰晶脉冲
        electric:{
            trigger:'alwaysR',input:'R (always)',   // normal punch = crystal zap
            name:'冰晶蛋拳',type:'electric',shout:'冰晶蛋拳！',
            text:{zhs:'冰晶蛋拳！',zht:'冰晶蛋拳！',ja:'クリスタルエッグパンチ！',en:'Crystal Egg Punch!'},
            duration:60,range:2.5,
            damage:8,stunDmg:15,
            electrocuteDuration:90 // frames target is frozen
        },
        // 冰冻水晶：滚动冲撞
        roll:{
            trigger:'bfR',input:'←→+R',        // back-forward + punch
            name:'冰冻水晶',type:'roll',shout:'冰冻水晶！',
            text:{zhs:'冰冻水晶！',zht:'冰凍水晶！',ja:'フローズンクリスタル！',en:'Frozen Crystal!'},
            speed:3,duration:60,cd:35,
            damage:15,stunDmg:20
        }
    },
    // ================================================================
    // 天使蛋 (rooster) — 温暖蛋拳(→→+R) / 天使一击(←→+T)
    // ================================================================
    rooster:{
        // 温暖蛋拳：一道温暖的能量刀弹
        sonicBoom:{
            trigger:'ffR',input:'→→+R',        // forward-forward + punch
            name:'温暖蛋拳',type:'projectile',shout:'温暖蛋拳！',
            text:{zhs:'温暖蛋拳！',zht:'溫暖蛋拳！',ja:'ウォームエッグパンチ！',en:'Warm Egg Punch!'},
            speed:0.5,life:100,color:0xFFDD44,ringColor:0xFFFF88,
            damage:10,stunDmg:15,
            cd:20
        },
        // 天使一击：腾空后翻踢
        somersault:{
            trigger:'bfT',input:'←→+T',        // back-forward + kick
            name:'天使一击',type:'somersault',shout:'天使一击！',
            text:{zhs:'天使一击！',zht:'天使一擊！',ja:'エンジェルストライク！',en:'Angel Strike!'},
            jumpMul:1.6,duration:65,arcSpeed:0.2,arcLife:30,
            damage:18,stunDmg:20,
            cd:35
        }
    },
    // ================================================================
    // 星愿蛋 (monkey) — 心愿蛋拳(→→+R) / 星星攻击(T) / 希望光芒(←→+T)
    // ================================================================
    monkey:{
        // 心愿蛋拳：星光能量弹
        kikouken:{
            trigger:'ffR',input:'→→+R',        // forward-forward + punch
            name:'心愿蛋拳',type:'projectile',shout:'心愿蛋拳！',
            text:{zhs:'心愿蛋拳！',zht:'心願蛋拳！',ja:'ウィッシュエッグパンチ！',en:'Wish Egg Punch!'},
            speed:0.5,life:100,color:0x88BBFF,ringColor:0x88FF88,
            damage:10,stunDmg:15,
            cd:20
        },
        // 星星攻击：连续踢击
        hyakuretsuKick:{
            trigger:'alwaysT',input:'T (always)',   // normal kick = rapid kicks
            name:'星星攻击',type:'hyakuretsuKick',shout:'星星攻击！',
            text:{zhs:'星星攻击！',zht:'星星攻擊！',ja:'スターアタック！',en:'Star Strike!'},
            cd:4,range:2.5,hitForce:0.5,hitVy:0.25,
            damage:8,stunDmg:10
        },
        // 希望光芒：旋转升空踢
        spinningBird:{
            trigger:'bfT',input:'←→+T',        // back-forward + kick
            name:'希望光芒',type:'spinningBird',shout:'希望光芒！',
            text:{zhs:'希望光芒！',zht:'希望光芒！',ja:'ホープレイ！',en:'Ray of Hope!'},
            jumpMul:1.2,duration:60,
            damage:15,stunDmg:15,
            cd:35
        }
    },
    // ================================================================
    // 岩石蛋 (bear) — 碎石蛋拳(R+T) / 巨石蛋腿(→←→+F)
    // ================================================================
    bear:{
        // 碎石蛋拳：双臂横扫的碎石重击
        lariat:{
            trigger:'RT',input:'R+T (hold)',   // punch + kick held together
            name:'碎石蛋拳',type:'lariat',shout:'碎石蛋拳！',
            text:{zhs:'碎石蛋拳！',zht:'碎石蛋拳！',ja:'ロックエッグパンチ！',en:'Rubble Egg Punch!'},
            duration:60,hitForce:0.5,hitVy:0.3,
            damage:12,stunDmg:15,hitCD:12,
            cd:40
        },
        // 巨石蛋腿：擒抱后高高举起再重砸
        piledriver:{
            trigger:'fbfF',input:'→←→+F',       // forward-back-forward + grab
            name:'巨石蛋腿',type:'piledriver',shout:'巨石蛋腿！',
            text:{zhs:'巨石蛋腿！',zht:'巨石蛋腿！',ja:'ボルダーエッグスラム！',en:'Boulder Egg Slam!'},
            range:5.0,riseFrames:40,pauseFrames:8,slamFrames:12,maxHeight:15,
            damage:35,stunDmg:50, // devastating
            cd:80
        }
    },
    // ================================================================
    // 风行蛋 (cockroach) — 旋风拳(→→+R) / 风行一击(←→+R) / 狂风呼啸(被动:攻击范围加长)
    // ================================================================
    cockroach:{
        // 旋风拳：缓慢飞行的旋风能量弹
        yogaFire:{
            trigger:'ffR',input:'→→+R',        // forward-forward + punch
            name:'旋风拳',type:'projectile',shout:'旋风拳！',
            text:{zhs:'旋风拳！',zht:'旋風拳！',ja:'トルネードパンチ！',en:'Whirlwind Punch!'},
            speed:0.2,life:180,color:0xFF6600,ringColor:0xFFAA00,
            burns:true,
            damage:10,stunDmg:15,
            cd:30
        },
        // 风行一击：近身范围爆发
        yogaFlame:{
            trigger:'bfR',input:'←→+R',        // back-forward + punch
            name:'风行一击',type:'yogaFlame',shout:'风行一击！',
            text:{zhs:'风行一击！',zht:'風行一擊！',ja:'ウィンドストライク！',en:'Wind Strike!'},
            duration:60,range:4,
            damage:15,stunDmg:20,
            fireDuration:120,     // 2 seconds effect
            fireStun:90,          // 1.5 seconds frozen
            cd:40
        },
        // 狂风呼啸（被动）：攻击范围加长
        extendedRange:2.5,
        // Slower attack speed
        punchCD:32,kickCD:36,punchAnim:28,kickAnim:28,
        comboTimerPunch:40,comboTimerKick:45,
        // Normal punch/kick damage (long range)
        normalPunchDmg:6,normalKickDmg:8
    }
};

// ---- Common move damage values ----
var COMMON_DAMAGE={
    normalPunch:5,          // basic punch hit
    normalKick:6,           // basic kick hit
    finisherPunch:12,       // 3rd combo punch
    finisherKick:15,        // 3rd combo kick
    aerialHit:10,           // air attack
    throwBase:8,            // normal throw
    chargeThrowMax:20,      // max charge throw
    bodySlam:25,            // jump + down slam
    grabDamage:0            // grab itself does no damage
};

// ---- NPC AI special move chances ----
var NPC_MOVE_CHANCE={
    hadouken:0.02,shoryuken:0.008,tatsumaki:0.008,
    hyakuretsu:0.02,headbutt:0.008,
    electric:0.01,roll:0.006,
    sonicBoom:0.015,somersault:0.008,
    kikouken:0.015,hyakuretsuKick:0.015,spinningBird:0.006,
    lariat:0.008,piledriver:0.008,
    yogaFire:0.02,yogaFlame:0.006
};

// ---- Trigger helpers ----
function _findMove(charType,trigger){
    var moves=MOVE_PARAMS[charType];if(!moves)return null;
    for(var key in moves){var m=moves[key];if(m&&m.trigger===trigger)return m;}
    return null;
}
function _getMoves(charType){
    var moves=MOVE_PARAMS[charType];if(!moves)return [];
    var r=[];for(var key in moves){var m=moves[key];if(m&&m.trigger)r.push(m);}return r;
}
function _hasMove(charType,trigger){return !!_findMove(charType,trigger);}
function _playMoveSFX(md){
    if(!md||!md.sfx||!sfxEnabled)return;
    try{var c=ensureAudio();if(!c)return;var t=c.currentTime;var s=md.sfx;
        var o=c.createOscillator();var g=c.createGain();
        o.type=s.type||'sine';o.frequency.setValueAtTime(s.freqStart||300,t);
        o.frequency.exponentialRampToValueAtTime(Math.max(s.freqEnd||150,1),t+(s.dur||0.3)*0.8);
        g.gain.setValueAtTime(s.gain||0.1,t);g.gain.exponentialRampToValueAtTime(0.001,t+(s.dur||0.3));
        o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+(s.dur||0.3));
    }catch(e){}
}
function _shoutMoveData(egg,md){
    if(!md||!egg)return;var txt=md.shout||'';
    if(md.text){txt=md.text[_langCode]||md.text.en||txt;}
    if(typeof _showChatBubble==='function')_showChatBubble(egg,txt,60);
}
