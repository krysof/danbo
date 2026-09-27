// Scene-only adapter. The main game owns its renderer, player, input, audio,
// networking, fixed timestep and saves; this module never starts another loop.
import * as THREE from 'three';
import * as L from './upstream/src/world/layout.js';
import {createContext} from './upstream/src/core/ctx.js';
import {batchStatic} from './upstream/src/core/batch2.js';

export async function buildStation({camera,renderer,low,onProgress}){
 const root=new THREE.Group();root.name='danbo-sakura-station';
 const quality={petals:low?0.16:0.3,pixelRatio:renderer.getPixelRatio()};
 const ctx=createContext({scene:root,camera,renderer,quality,audio:null,sunDir:new THREE.Vector3(...L.SUN_DIR).normalize()});
 const modules=['environment','street','poles','railway','station','plaza','shopsA','houses','sakura','trains','crossing','props','petals'];
 try{
  for(let i=0;i<modules.length;i++){
   onProgress?.(Math.round(i/(modules.length+1)*100));await new Promise(r=>setTimeout(r,0));
   await (await import('./upstream/src/world/'+modules[i]+'.js')).build(ctx);
  }
  const wire=ctx.wires.build();if(wire)root.add(wire);
  onProgress?.(94);await new Promise(r=>setTimeout(r,0));
  const batch=batchStatic(ctx.staticRoot,{mat:ctx.mat,nearCell:32,farCell:160});
  // Layer 1 in the source means "no outline". The main game's renderer has no
  // separate cel-outline camera pass, so every city mesh belongs on layer 0.
  root.traverse(o=>o.layers.set(0));
  const roofs=[[-7,40,-39,-35.4,4.2,4.75],[-7,40,-50.6,-47,4.2,4.75],[-4.6,12.6,-36.2,-24.4,4.65,7.8]];
  const v=new THREE.Vector3(),target=new THREE.Vector3(),desired=new THREE.Vector3();let dead=false;
  const api={root,ctx,batch,
   // The 120-second train schedule shares a wall-clock phase across clients,
   // rather than restarting at each player's arrival (clocks must agree).
   update(dt,player){if(dead)return;const time=(Date.now()/1000)%86400;if(player)ctx.player.position.copy(player);ctx.time=time;ctx.shared.uTime.value=time;ctx.shared.uGust.value=.5+.28*Math.sin(time*.37);quality.pixelRatio=renderer.getPixelRatio();ctx.wires.setResolution(innerWidth*quality.pixelRatio,innerHeight*quality.pixelRatio);for(const fn of ctx._updates)fn(dt,time);ctx.physics.refreshDynamic();},
   floor(x,z,feetY){return ctx.physics.groundHeight(x,z,feetY)+.01;},
   resolve(egg,oldX,oldZ){
    const pos=egg.mesh.position,dx=pos.x-oldX,dz=pos.z-oldZ,steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.16)),q={x:oldX,z:oldZ};
    for(let i=0;i<steps;i++){q.x+=dx/steps;q.z+=dz/steps;ctx.physics.resolve(q,egg.radius||.48,Math.max(pos.y,egg._prevY),1.5);}
    pos.x=THREE.MathUtils.clamp(q.x,L.WORLD.play.x0+.6,L.WORLD.play.x1-.6);pos.z=THREE.MathUtils.clamp(q.z,L.WORLD.play.z0+.6,L.WORLD.play.z1-.6);
    if(Math.abs(pos.x-(oldX+dx))>.01)egg.vx*=egg.throwTimer>0?-.25:0;
    if(Math.abs(pos.z-(oldZ+dz))>.01)egg.vz*=egg.throwTimer>0?-.25:0;
   },
   camera(pos,yaw,pitch,distance){
    target.copy(pos);target.y+=1.0;desired.set(Math.sin(yaw)*distance*Math.cos(pitch),Math.sin(pitch)*distance,Math.cos(yaw)*distance*Math.cos(pitch)).add(target);
    for(let i=1;i<=32;i++){v.copy(target).lerp(desired,i/32);const q={x:v.x,z:v.z};ctx.physics.resolve(q,.22,v.y-.2,.4);const hit=roofs.some(b=>v.x>b[0]-.2&&v.x<b[1]+.2&&v.z>b[2]-.2&&v.z<b[3]+.2&&v.y>b[4]-.2&&v.y<b[5]+.2);if(hit||Math.hypot(q.x-v.x,q.z-v.z)>.035){desired.lerp(target,1-Math.max(.13,(i-1)/32));break;}}
    const inward=desired.distanceToSquared(target)<camera.position.distanceToSquared(target)-.1;camera.position.lerp(desired,inward?1:.2);camera.lookAt(target);
   },
   dispose(){dead=true;ctx._updates.length=0;ctx.physics.dynamic.length=0;}
  };
  api.update(0,new THREE.Vector3(1.6,0,29));return api;
 }catch(error){
  // A failed build has not been attached to the live city. Release its private
  // GPU objects here; successful cities use the shared main-game disposer.
  const geometries=new Set(),materials=new Set(),textures=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of [].concat(o.material||[])){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());ctx._updates.length=0;throw error;
 }
}
