// ============================================================
//  data-races.js — Race track & obstacle configuration
// ============================================================

var RACE_CONFIG={
    trackWidth:10,
    floorThemes:[[0x6EC850,0x5DB83A],[0xE8C170,0xD4A84B],[0x88BBEE,0x6699CC],[0xDD7799,0xCC5577]],
    coinSpacing:4,
    raceEggCount:12,
    finishLineWidth:12
};

// ---- Obstacle type parameters ----
var OBSTACLE_PARAMS={
    spinner:{
        baseSpeed:0.012,speedPerRace:0.004,
        armWidthRatio:0.85, // fraction of track half-width
        hitStrBase:0.22,hitStrPerT:0.08,
        hitVy:0.1,squash:0.65
    },
    hammer:{
        baseSpeed:0.016,speedPerRace:0.004,
        baseArmLen:4,armLenPerRace:0.5,
        hitVxMul:0.35,hitVy:0.22,squash:0.55
    },
    roller:{
        baseSpeed:0.035,
        radius:0.8,
        hitVy:0.16,hitVz:0.05,squash:0.7
    },
    bumper:{
        baseRadius:0.5,radiusRandom:0.3,
        bounceForce:0.3,hitVy:0.15,squash:0.6
    },
    pendulum:{
        baseSpeed:0.013,speedPerRace:0.003,
        baseChainLen:5,chainLenPerRace:0.5,
        hitForce:0.25,hitVy:0.18,squash:0.6
    },
    platform:{
        moveRangeRatio:0.35, // fraction of track half-width
        baseSpeed:0.008,speedPerRace:0.003,
        width:3,height:0.4,depth:3
    },
    conveyor:{
        basePush:0.04,pushPerRace:0.01
    },
    fallingBlock:{
        baseHeight:12,heightRandom:5,
        resetTimer:90,
        fallSpeed:0.3,riseSpeed:0.05
    },
    boost:{strength:0.35},
    spring:{jumpForce:0.5},
    pipe:{baseHeight:2.0,heightRandom:1.5},
    goomba:{
        baseSpeed:0.02,speedPerRace:0.003,
        walkRangeRatio:0.6, // fraction of track half-width
        hitVx:0.15,hitVy:0.12,squash:0.6
    },
    questionBlock:{
        height:4, // height above floor
        size:2, // box size
        bounceFrames:8,
        coinCount:3, // coins dropped on hit
        coinArcForce:0.15
    }
};

// ---- Platformer mini-game config ----
var PLATFORMER_CONFIG={
    tileSize:2,
    gravity:0.025,
    jumpForce:0.38,
    maxSpeed:0.18,
    levelWidth:200,
    levelHeight:20,
    enemySpots:[12,25,35,50,60,72,88,100,112,128,138,148,158,168,178],
    goombaSpeed:0.04,
    koopaSpeed:0.06,
    fireballSpeed:0.3,
    fireballLife:180,
    starDuration:600,
    timeLimit:300,
    npcCount:4,
    npcColors:[0xFF8844,0x44AAFF,0xFFDD44,0xFF44AA],
    npcAccents:[0xFFCC00,0xFFAA44,0xFF8800,0xFFDD00],
    gaps:[[20,23],[48,51],[82,84],[125,128],[160,163]],
    brickPlatforms:[[8,13,5],[27,33,6],[40,45,4],[58,64,5],[75,80,6],[95,102,4],[110,116,5],[135,142,6],[150,156,4],[170,176,5]],
    questionBlocks:[[10,5],[30,6],[42,4],[60,5],[77,8],[98,4],[113,5],[138,8],[153,4],[173,7]],
    pipes:[[16,3],[38,4],[68,3],[90,5],[120,3],[145,4],[165,3]],
    mushroomChance:0.3 // chance of mushroom vs star from question block
};
