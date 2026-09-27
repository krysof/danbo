// A real city region, not an iframe or another game. Only this lightweight
// registration loads at boot; town builders load on the first transfer to city 8.
(function(){
 'use strict';
 var ID=8,runtime=null,pending=null,loadSerial=0;
 var names={zhs:'🌸 樱花车站',zht:'🌸 櫻花車站',ja:'🌸 桜の駅',en:'🌸 Sakura Station'};
 Object.keys(names).forEach(function(lang){I18N.cityNames[lang][ID]=names[lang];});
 var style={name:names[_langCode]||names.en,ground:0xB8C9A1,path:0xD9D0C1,sky:0x9CC4EA,bColors:[0xE8DCC6],roof:0x7D7C87,tree:0xEBA6C2,fog:0xDDE9F3};
 CITY_STYLES[ID]=style;
 var paths=[{x:0,z:59,w:7,d:118},{x:8,z:-15,w:34,d:22},{x:17,z:-37.5,w:47,d:4},{x:17,z:-48.5,w:47,d:4},{x:0,z:-93,w:182,d:5},{x:-12,z:-48,w:6,d:84}];
 DANBO_CITY_REGISTRY.registerCity({id:ID,slug:'sakura-station',nameKey:'city8',style:style,layout:{paths:paths,buildings:[],specialObjects:[]},npc:{count:0},collectibles:{coinCount:0}});
 function active(){return currentCityStyle===ID&&!!runtime;}
 function build(){
  if(pending)return pending;var serial=++loadSerial;
  pending=import('../plugins/sakura-preview/city-runtime.js?v=20260927.2').then(function(module){return module.buildStation({camera:camera,renderer:R,low:!!(window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.low),onProgress:function(n){_setCityTransferStatus(n+'%');}});}).then(function(result){
   if(serial!==loadSerial){result.dispose();throw new Error('Station load cancelled');}
   runtime=result;cityGroup.add(result.root);return result;
  }).finally(function(){pending=null;});return pending;
 }
 function clear(){++loadSerial;if(runtime)runtime.dispose();runtime=null;}
 function floor(x,z,y){return runtime?runtime.floor(x,z,y):.01;}
 function contents(){
  var spots=[[1.6,23],[.4,5],[4,-13],[-10,-18],[16,-36.9],[-20,-93],[-35,-93],[30,-93]];
  spots.forEach(function(p){var mesh=_makeCinematicCoinMesh(.94),y=floor(p[0],p[1],10)+1.2;mesh.position.set(p[0],y,p[1]);cityGroup.add(mesh);cityCoins.push({mesh:mesh,collected:false,baseY:y});});
  [[-2,10],[7,-12],[14,-37],[27,55],[-12,-70],[-20,-93]].forEach(function(p,i){var skin=CHARACTERS[(i+1)%CHARACTERS.length],npc=createEgg(p[0],p[1],skin.color,skin.accent,false,undefined,skin.type);npc.mesh.position.y=floor(p[0],p[1],10);npc.cityNPC=true;npc.aiTargetX=p[0];npc.aiTargetZ=p[1];npc.aiWanderTimer=120+i*21;cityNPCs.push(npc);});
  // Map silhouettes only: collision comes from the town's oriented spatial grid.
  for(var z=15;z<120;z+=23)for(var side=-1;side<=1;side+=2)cityBuildingMeshes.push({x:side*13,z:z,hw:7,hd:8,h:8,meshes:[]});
  cityBuildingMeshes.push({x:4,z:-30,hw:8,hd:5.25,h:6,meshes:[]});
 }
 function gate(){
  if(currentCityStyle!==0&&currentCityStyle!==ID)return;
  var to=currentCityStyle===ID?0:ID,x=currentCityStyle===ID?1.6:-15,z=currentCityStyle===ID?40:16;
  var group=new THREE.Group(),pink=0xF2A6C5;
  var base=new THREE.Mesh(new THREE.CylinderGeometry(2.3,2.5,.25,24),softPBR(0xEFE3DD));base.position.y=.12;group.add(base);
  var ring=new THREE.Mesh(new THREE.TorusGeometry(1.8,.16,8,36),softPBR(pink,{emissive:0xAC4F85,emissiveIntensity:.3}));ring.position.y=2.15;group.add(ring);
  var glow=new THREE.Mesh(new THREE.CircleGeometry(1.6,32),new THREE.MeshBasicMaterial({color:0xAEF5E2,transparent:true,opacity:.22,side:THREE.DoubleSide,depthWrite:false}));glow.position.y=2.15;group.add(glow);
  var sign=_danboMakePortalSign(group,CITY_STYLES[to].name,pink,{x:0,y:4.6,z:0});group.position.set(x,.01,z);group.name='sakura-station-gate';cityGroup.add(group);
  warpPipeMeshes.push({group:group,sign:sign,x:x,z:z,y:.01,targetStyle:to,_cooldown:false});
 }
 function arrive(){
  if(!active()||!playerEgg)return;playerEgg.mesh.position.set(1.6,floor(1.6,29,10)+.2,29);playerEgg.vx=playerEgg.vy=playerEgg.vz=0;playerEgg.onGround=false;playerEgg.mesh.rotation.y=Math.PI;
  _setViewMode(1);_tpsCamYaw=0;_tpsCamPitch=.25;_tpsCamDist=7;camera.position.set(1.6,3.8,36);camera.lookAt(1.6,1,29);
  if(window.DANBO_MULTIPLAYER)DANBO_MULTIPLAYER.flushState();
 }
 function theme(){if(!active())return;scene.fog=new THREE.FogExp2(0xDDE9F3,.0018);sun.intensity=2.0;scene.children.forEach(function(light){if(light.isHemisphereLight){light.color.setHex(0xDDE9FF);light.groundColor.setHex(0xB8A1AA);light.intensity=1.1;}});}
 function update(dt){if(active())runtime.update(dt,playerEgg&&playerEgg.mesh.position);}
 // A named route in the existing MAP panel is also usable on a narrow phone
 // screen, where the plaza gate can be outside the camera's field of view.
 function mapRoute(){
  if(typeof gameState==='undefined'||gameState!=='city'||!playerEgg||(currentCityStyle!==0&&currentCityStyle!==ID))return null;
  var target=currentCityStyle===ID?0:ID,p=playerEgg;
  var verb={zhs:'前往',zht:'前往',ja:'移動',en:'Travel'};
  return {target:target,label:CITY_STYLES[target].name+' · '+(verb[_langCode]||verb.en)+' →',
   enabled:!(_pipeTraveling||window._danboPluginTransition||p.alive===false||p.heldBy||p._networkHeldBy||p.holding||p.holdingProp||p.holdingObs||p._networkHolding||p._networkFlight||p.throwTimer>0||p._stunTimer>0||p._hitStun>0||p._piledriverLocked||p._hondaDash||p._blankaSpinTimer||p._tatsuActive||p._shoryuActive||p._guileSomersault||p._blankaShock||p._yogaFlame||p._hyakuretsuTimer||p._hyakuretsuKickTimer)};
 }
 function travelFromMap(){
  var route=mapRoute();if(!route||!route.enabled)return false;
  var p=playerEgg.mesh.position;
  _closeWorldMap();if(typeof _releaseGameplayControls==='function')_releaseGameplayControls();
  return startPipeTravel(p.x,p.z,route.target,p.y);
 }
 function cameraUpdate(){if(!active()||!playerEgg||_viewMode===2)return false;var p=playerEgg.mesh.position,yaw=_tpsCamMode?_tpsCamYaw:0,pitch=_tpsCamMode?Math.max(.05,Math.min(1.1,_tpsCamPitch)):.6,dist=_tpsCamMode?Math.max(2,Math.min(15,_tpsCamDist)):Math.max(3,Math.min(26,17*_cameraZoom));runtime.camera(p,yaw,pitch,dist);sun.position.set(p.x+RENDER_CONFIG.sunPos.x,RENDER_CONFIG.sunPos.y,p.z+RENDER_CONFIG.sunPos.z);sun.target.position.set(p.x,0,p.z);return true;}
 window.DANBO_STATION={id:ID,active:active,build:build,clear:clear,floor:floor,contents:contents,gate:gate,arrive:arrive,theme:theme,update:update,mapRoute:mapRoute,travelFromMap:travelFromMap,camera:cameraUpdate,resolve:function(egg,x,z){if(active())runtime.resolve(egg,x,z);},getRuntime:function(){return runtime;}};
})();
