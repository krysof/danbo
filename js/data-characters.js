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
    spin:{force:0.6, vy:0.35, squash:0.3, throwTimer:50, bounces:2},
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
    {name:'egg',sf2:'Ryu',color:0xF5F5F0,accent:0xCC2222,icon:'\uD83E\uDD5A',country:'Japan',flag:'\uD83C\uDDEF\uD83C\uDDF5',mapX:360,mapY:52,
     bodyShape:'normal',portraitRx:55,portraitRy:70,miniRx:0.32,miniRy:0.38},
    {name:'bull',sf2:'E.Honda',color:0x4A3728,accent:0x2244AA,icon:'\uD83D\uDC03',country:'Japan',flag:'\uD83C\uDDEF\uD83C\uDDF5',mapX:360,mapY:52,
     bodyShape:'round',portraitRx:65,portraitRy:60,miniRx:0.38,miniRy:0.34},
    {name:'cat',sf2:'Blanka',color:0x33AA33,accent:0xFF8800,icon:'\uD83D\uDC31',country:'Brazil',flag:'\uD83C\uDDE7\uD83C\uDDF7',mapX:95,mapY:155,
     bodyShape:'round',portraitRx:65,portraitRy:60,miniRx:0.38,miniRy:0.34},
    {name:'rooster',sf2:'Guile',color:0x556B2F,accent:0xFFDD44,icon:'\uD83D\uDC13',country:'USA',flag:'\uD83C\uDDFA\uD83C\uDDF8',mapX:70,mapY:55,
     bodyShape:'normal',portraitRx:55,portraitRy:70,miniRx:0.32,miniRy:0.38},
    {name:'dog',sf2:'Ken',color:0xCC2222,accent:0xFFDD44,icon:'\uD83D\uDC36',country:'USA',flag:'\uD83C\uDDFA\uD83C\uDDF8',mapX:70,mapY:55,
     bodyShape:'normal',portraitRx:55,portraitRy:70,miniRx:0.32,miniRy:0.38},
    {name:'monkey',sf2:'Chun-Li',color:0x2255CC,accent:0xFFFFFF,icon:'\uD83D\uDC35',country:'China',flag:'\uD83C\uDDE8\uD83C\uDDF3',mapX:310,mapY:55,
     bodyShape:'slim',portraitRx:42,portraitRy:75,miniRx:0.25,miniRy:0.42},
    {name:'bear',sf2:'Zangief',color:0x8B6B4A,accent:0x8B4513,icon:'\uD83D\uDC3B',country:'Russia',flag:'\uD83C\uDDF7\uD83C\uDDFA',mapX:290,mapY:18,
     bodyShape:'big',portraitRx:72,portraitRy:72,miniRx:0.42,miniRy:0.40},
    {name:'cockroach',sf2:'Dhalsim',color:0x8B6914,accent:0xFFFFFF,icon:'\uD83E\uDEB3',country:'India',flag:'\uD83C\uDDEE\uD83C\uDDF3',mapX:278,mapY:88,
     bodyShape:'thin',portraitRx:30,portraitRy:78,miniRx:0.20,miniRy:0.42}
];

// ---- Special move parameters per character ----
var MOVE_PARAMS={
    // ================================================================
    // Ryu (egg) — 波动拳, 升龙拳, 旋风腿
    // ================================================================
    egg:{
        hadouken:{
            trigger:'ffR',input:'→→+R',        // forward-forward + punch
            name:'HADOUKEN!',type:'projectile',shout:'HADOUKEN!',
            text:{zhs:'波动拳！',zht:'波動拳！',ja:'波動拳！',en:'HADOUKEN!'},
            speed:0.35,life:120,color:0xFF4422,ringColor:0xFF8866,
            burns:true,           // hit causes fire
            damage:10,stunDmg:15, // damage & stun
            cd:25                 // cooldown frames
        },
        shoryuken:{
            trigger:'bfR',input:'↓↑+R',        // down-up + punch
            name:'SHORYUKEN!',type:'shoryuken',shout:'SHORYUKEN!',
            text:{zhs:'升龙拳！',zht:'昇龍拳！',ja:'昇龍拳！',en:'SHORYUKEN!'},
            jumpMul:1.6,fwdSpeed:0.15,duration:65,
            damage:20,stunDmg:15,
            cd:30
        },
        tatsumaki:{
            trigger:'bfT',input:'←→+T',        // back-forward + kick
            name:'Tatsumaki Senpukyaku!',type:'tatsumaki',shout:'Tatsumaki Senpukyaku!',
            text:{zhs:'龙卷旋风脚！',zht:'龍卷旋風腳！',ja:'竇巻旋風脚！',en:'Tatsumaki!'},
            duration:94,hitForce:0.5,hitVy:0.3,
            damage:12,stunDmg:15,hitCD:12,
            cd:40
        }
    },
    // ================================================================
    // Ken (dog) — 波动拳, 升龙拳(火), 旋风腿
    // ================================================================
    dog:{
        hadouken:{
            trigger:'ffR',input:'→→+R',
            name:'Hadouken!',type:'projectile',shout:'Hadouken!',
            text:{zhs:'波动拳！',zht:'波動拳！',ja:'波動拳！',en:'Hadouken!'},
            speed:0.35,life:120,color:0x4488FF,ringColor:0x88AAFF,
            burns:false,
            damage:10,stunDmg:15,
            cd:25
        },
        shoryuken:{
            trigger:'bfR',input:'↓↑+R',
            name:'Shoryuken!',type:'shoryuken',shout:'Shoryuken!',
            text:{zhs:'升龙拳！',zht:'昇龍拳！',ja:'昇龍拳！',en:'Shoryuken!'},
            jumpMul:1.7,fwdSpeed:0.35,duration:75,
            fire:true,            // Ken shoryuken sets target on fire
            damage:22,stunDmg:15,
            cd:30
        },
        tatsumaki:{
            trigger:'bfT',input:'←→+T',
            name:'Tatsumaki Senpukyaku!',type:'tatsumaki',shout:'Tatsumaki Senpukyaku!',
            text:{zhs:'龙卷旋风脚！',zht:'龍卷旋風腳！',ja:'竇巻旋風脚！',en:'Tatsumaki!'},
            duration:94,hitForce:0.5,hitVy:0.3,
            damage:12,stunDmg:15,hitCD:12,
            cd:40
        }
    },
    // ================================================================
    // Honda/Buffalo (bull) — 百裂掌, 头锤
    // ================================================================
    bull:{
        hyakuretsu:{
            trigger:'alwaysR',input:'R (always)',   // normal punch = hyakuretsu
            name:'Hohoho!',type:'hyakuretsu',shout:'Hohoho!',
            text:{zhs:'嗬嗬嗬！',zht:'嗬嗬嗬！',ja:'ホホホ！',en:'Hohoho!'},
            cd:4,range:2.5,hitForce:0.5,hitVy:0.25,
            damage:8,stunDmg:10
        },
        headbutt:{
            trigger:'bfR',input:'←→+R',        // back-forward + punch
            name:'Dosukoi!',type:'dash',shout:'Dosukoi!',
            text:{zhs:'误会！',zht:'誤會！',ja:'どすこい！',en:'Dosukoi!'},
            speed:2,duration:60,cd:70,
            damage:15,stunDmg:20
        }
    },
    // ================================================================
    // Blanka (cat) — 电击, 滚动攻击
    // ================================================================
    cat:{
        electric:{
            trigger:'alwaysR',input:'R (always)',   // normal punch = electric
            name:'ELECTRIC!',type:'electric',shout:'ELECTRIC!',
            text:{zhs:'嗷嗷嗷！',zht:'嗷嗷嗷！',ja:'ガウガウ！',en:'GRAAAH!'},
            duration:60,range:2.5,
            damage:8,stunDmg:15,
            electrocuteDuration:90 // frames target is electrocuted
        },
        roll:{
            trigger:'bfR',input:'←→+R',        // back-forward + punch
            name:'GRAAAH!',type:'roll',shout:'GRAAAH!',
            text:{zhs:'嗷嗷嗷！',zht:'嗷嗷嗷！',ja:'ガウガウ！',en:'GRAAAH!'},
            speed:3,duration:60,cd:35,
            damage:15,stunDmg:20
        }
    },
    // ================================================================
    // Guile (rooster) — 音速手刀, 闪光飞踢
    // ================================================================
    rooster:{
        sonicBoom:{
            trigger:'ffR',input:'→→+R',        // forward-forward + punch
            name:'Sonic Boom!',type:'projectile',shout:'Sonic Boom!',
            text:{zhs:'音速手刀！',zht:'音速手刀！',ja:'ソニックブーム！',en:'Sonic Boom!'},
            speed:0.5,life:100,color:0xFFDD44,ringColor:0xFFFF88,
            damage:10,stunDmg:15,
            cd:20
        },
        somersault:{
            trigger:'bfT',input:'←→+T',        // back-forward + kick
            name:'Somersault Kick!',type:'somersault',shout:'Somersault Kick!',
            text:{zhs:'闪光飞踢！',zht:'閃光飛踢！',ja:'サマーソルト！',en:'Somersault!'},
            jumpMul:1.6,duration:65,arcSpeed:0.2,arcLife:30,
            damage:18,stunDmg:20,
            cd:35
        }
    },
    // ================================================================
    // Chun-Li (monkey) — 气功拳, 百裂脚, 回旋鸟踢
    // ================================================================
    monkey:{
        kikouken:{
            trigger:'ffR',input:'→→+R',        // forward-forward + punch
            name:'Kikouken!',type:'projectile',shout:'Kikouken!',
            text:{zhs:'气功拳！',zht:'氣功拳！',ja:'気功拳！',en:'Kikouken!'},
            speed:0.5,life:100,color:0x88BBFF,ringColor:0x88FF88,
            damage:10,stunDmg:15,
            cd:20
        },
        hyakuretsuKick:{
            trigger:'alwaysT',input:'T (always)',   // normal kick = hyakuretsu kick
            name:'Hyakuretsu Kick!',type:'hyakuretsuKick',shout:'Hyakuretsu Kick!',
            text:{zhs:'百裂脚！',zht:'百裂腳！',ja:'百裂脚！',en:'Lightning Kick!'},
            cd:4,range:2.5,hitForce:0.5,hitVy:0.25,
            damage:8,stunDmg:10
        },
        spinningBird:{
            trigger:'bfT',input:'←→+T',        // back-forward + kick
            name:'Spinning Bird Kick!',type:'spinningBird',shout:'Spinning Bird Kick!',
            text:{zhs:'回旋鸟踢！',zht:'回旋鳥踢！',ja:'スピニングバード！',en:'Spinning Bird!'},
            jumpMul:1.2,duration:60,
            damage:15,stunDmg:15,
            cd:35
        }
    },
    // ================================================================
    // Zangief/Bear (bear) — 回旋双臂, 螺旋打桩
    // ================================================================
    bear:{
        lariat:{
            trigger:'RT',input:'R+T (hold)',   // punch + kick held together
            name:'Double Lariat!',type:'lariat',shout:'Double Lariat!',
            text:{zhs:'双回旋臂！',zht:'雙回旋臂！',ja:'ダブルラリアット！',en:'Double Lariat!'},
            duration:60,hitForce:0.5,hitVy:0.3,
            damage:12,stunDmg:15,hitCD:12,
            cd:40
        },
        piledriver:{
            trigger:'fbfF',input:'→←→+F',       // forward-back-forward + grab
            name:'Piledriver!',type:'piledriver',shout:'Piledriver!',
            text:{zhs:'螺旋打桩！',zht:'螺旋打樁！',ja:'パイルドライバー！',en:'Piledriver!'},
            range:5.0,riseFrames:40,pauseFrames:8,slamFrames:12,maxHeight:15,
            damage:35,stunDmg:50, // devastating
            cd:80
        }
    },
    // ================================================================
    // Dhalsim (cockroach) — 瑜伽火球, 瑜伽火焰, 长手长脚(被动)
    // ================================================================
    cockroach:{
        yogaFire:{
            trigger:'ffR',input:'→→+R',        // forward-forward + punch
            name:'Yoga Fire!',type:'projectile',shout:'Yoga Fire!',
            text:{zhs:'瑜伽火球！',zht:'瑜伽火球！',ja:'ヨガファイヤー！',en:'Yoga Fire!'},
            speed:0.2,life:180,color:0xFF6600,ringColor:0xFFAA00,
            burns:true,
            damage:10,stunDmg:15,
            cd:30
        },
        yogaFlame:{
            trigger:'bfR',input:'←→+R',        // back-forward + punch
            name:'Yoga Flame!',type:'yogaFlame',shout:'Yoga Flame!',
            text:{zhs:'瑜伽火焰！',zht:'瑜伽火焰！',ja:'ヨガフレイム！',en:'Yoga Flame!'},
            duration:60,range:4,
            damage:15,stunDmg:20,
            fireDuration:120,     // 2 seconds on fire
            fireStun:90,          // 1.5 seconds frozen
            cd:40
        },
        // Passive: extended attack range
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
