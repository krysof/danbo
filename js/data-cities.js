// ============================================================
//  data-cities.js — City configuration & style data
// ============================================================

var CITY_CONFIG={
    size:160,           // half-size of city ground
    moonSize:400,       // half-size of moon city
    npcCount:36,        // NPCs in ground cities
    moonNpcCount:24,    // NPCs on moon
    coinCount:180,      // coins in ground cities
    moonCoinCount:200,  // coins on moon
    buildingCount:40,   // approximate buildings
    treeCount:80,
    lampCount:20,
    benchCount:12,
    fountainRadius:7,
    fountainInnerRadius:3.5,
    fountainPillarHeight:6.1,
    fountainLionCount:4,
    fountainColumnCount:8,
    fountainCoins:20,
    waterParticlesCentral:120,
    waterParticlesLion:80
};

// ---- City style themes ----
var CITY_THEME_DATA=[
    {id:0,nameKey:'city0',ground:0x7ADDA5,path:0xFFE8B8,sky:0x9FDBFF,
     bColors:[0xFF9FC6,0x82D0FF,0xFFE88A,0xB9EA95,0xFFC6A6,0xCDB8FF,0xFFB8DE,0x9BEAE2],
     roof:0xFF85AD,tree:0x70D878,fog:0xDFF7FF},
    {id:1,nameKey:'city1',ground:0xDDCC88,path:0xCCBB77,sky:0xFFCC66,
     bColors:[0xDDAA66,0xCC9955,0xEEBB77,0xBB8844,0xDDCC88,0xCCAA55,0xEECC99,0xBB9966],
     roof:0xAA6633,tree:0x88AA44,fog:0xFFEECC},
    {id:2,nameKey:'city2',ground:0xDDEEFF,path:0xBBCCDD,sky:0xAABBDD,
     bColors:[0xAADDFF,0x88BBEE,0xCCEEFF,0x99CCEE,0xBBDDFF,0x77AADD,0xDDEEFF,0xAABBCC],
     roof:0x6699BB,tree:0x88CCAA,fog:0xCCDDEE},
    {id:3,nameKey:'city3',ground:0xB5655F,path:0xD28A64,sky:0xFF8A68,
     bColors:[0xE46E6E,0xC95C5C,0xF08076,0xB95B5B,0xD6706A,0xA54E50,0xE68674,0xC97568],
     roof:0x8C4A48,tree:0xC99062,fog:0xFFB391},
    {id:4,nameKey:'city4',ground:0xFFCFE4,path:0xFFEAF4,sky:0xFFD8EC,
     bColors:[0xFFC2D9,0x91CBFF,0xFFF192,0xCCF4BA,0xFFD3B5,0xDACBFF,0xFFB8D8,0xB9F2EC],
     roof:0xFF8ABB,tree:0xFFAAC9,fog:0xFFF2FB},
    {id:5,nameKey:'city5',ground:0x444455,path:0x555566,sky:0x111122,
     bColors:[0x666677,0x555566,0x777788,0x444455,0x888899,0x333344,0x666688,0x555577],
     roof:0x333344,tree:0x556655,fog:0x222233},
    {id:6,nameKey:'city6',ground:0xEBD6CA,path:0xF5DED2,sky:0xBFE8FF,
     bColors:[0xE8A7A7,0xF5C8B8,0xEBC1B6,0xDDC7B8,0xEED8CF,0xD5B5A8,0xF4D2C6,0xEBC7BA],
     roof:0xB96A6A,tree:0xFFB6D0,fog:0xF6ECFF},
    {id:7,nameKey:'city7',ground:0xE8EEF0,path:0xCCDDE8,sky:0xC0D0DD,
     bColors:[0xF5F0E8,0xE8DDD0,0xDDD5C8,0xF0EBE0,0xE0D8CC,0xD8D0C0,0xEEE8DD,0xE5DDD0],
     roof:0x8B7355,tree:0x2D5A3D,fog:null} // twilight — dark sky with warm lights
];

// ---- Portal positions per city ----
var PORTAL_POSITIONS={
    warpPipes:[
        {x:0,z:-145,targetOffset:0},
        {x:145,z:0,targetOffset:1},
        {x:0,z:145,targetOffset:2},
        {x:-145,z:0,targetOffset:3},
        {x:105,z:-105,targetOffset:4},
        {x:-105,z:105,targetOffset:5}
    ],
    platformerPortal:{x:0,z:-15},
    rocketRoadPortal:{x:15,z:-15}
};

// ---- Cloud world parameters ----
var CLOUD_CONFIG={
    startY:22,      // roof level
    endY:42,        // cloud world height
    cloudParts:3,   // parts per cloud
    cloudScale:{min:2,max:4},
    staircaseSteps:12
};

// ---- Camera parameters ----
var CAMERA_CONFIG={
    zoomMin:0.04, zoomMax:1000,
    followSmooth:0.08, minHeight:3,
    yOffset:10, zOffset:14,
    shakeMultX:2, shakeMultY:1.5, shakeMultZ:2
};

// ---- Renderer / lighting parameters ----
var RENDER_CONFIG={
    fogNear:80, fogFar:400,
    fogColor:0x87CEEB,
    sunColor:0xFFF2D6, sunIntensity:1.68,
    sunPos:{x:60,y:80,z:40},
    shadowMapSize:4096, shadowBias:-0.001,
    shadowRange:120, shadowNear:1, shadowFar:300,
    ambientIntensity:0.44,
    hemiSkyColor:0xDDF4FF, hemiGroundColor:0x73866A, hemiIntensity:0.66,
    pixelRatioMin:1.0, pixelRatioMax:2.0,
    toneExposure:1.09
};

// ---- Portal (race entrance) parameters ----
var PORTAL_CONFIG={
    ringRadius:2, ringThickness:0.3,
    glowRadius:2.2, glowThickness:0.15,
    baseHeight:2.5, baseRadius:2.5,
    triggerDist:(window.DANBO_WASM&&DANBO_WASM.configValue?DANBO_WASM.configValue(1):7.6),
    confirmDist:(window.DANBO_WASM&&DANBO_WASM.configValue?DANBO_WASM.configValue(2):5.8),
    particleRadius:1.8
};

// ---- Warp pipe parameters ----
var PIPE_CONFIG={
    radius:3, height:8,
    ringRadius:3, ringThickness:0.4,
    travelDuration:180
};

// ---- Tree parameters ----
var TREE_CONFIG={
    trunkRadius:{min:0.2,max:0.3}, trunkHeight:2,
    crownRadius:1.5, crownScaleY:0.7,
    collisionRadius:1.2, weight:3.0
};

// ---- Building parameters ----
var BUILDING_CONFIG={
    roofHeightMul:0.6, roofHeight:3,
    windowSpacingY:3, windowSpacingX:2.5,
    windowSize:{w:1,h:1.2,d:0.1},
    doorSize:{w:1.5,h:2.2,d:0.15}
};

// ---- Lamp post parameters ----
var LAMP_CONFIG={
    poleRadius:{top:0.06,bottom:0.08}, poleHeight:4,
    lampRadius:0.25, lampHeight:4.2,
    emissiveIntensity:0.3
};

// ---- Bench parameters ----
var BENCH_CONFIG={
    seatSize:{w:2,h:0.15,d:0.6}, seatHeight:0.5,
    backSize:{w:2,h:0.8,d:0.1}, backHeight:0.9
};
