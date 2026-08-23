// city.js — DANBO World
// ============================================================
//  CITY BUILDER
// ============================================================
const cityGroup = new THREE.Group();
scene.add(cityGroup);
const cityNPCs = []; // wandering AI eggs in city
const portals = [];  // {mesh, glow, name, desc, raceIndex, x, z}
const cityColliders = []; // {x,z,hw,hd} boxes for buildings
const cityBuildingMeshes = []; // all meshes per building [{body,roof,windows,door}]
const cityCoins = []; // {mesh, collected}
const cityProps = []; // {group, x, z, radius, type, grabbed, origY}

const CITY_SIZE = CITY_CONFIG.size;
var currentCityStyle=0;
var _prevCityStyle=0; // track previous city for earth return
var CITY_STYLES=(window.DANBO_CITY_REGISTRY&&DANBO_CITY_REGISTRY.getStyles)?DANBO_CITY_REGISTRY.getStyles():[];
if(!CITY_STYLES||!CITY_STYLES.length){
    // Fallback only: real editable city data lives in js/cities/*.js
    CITY_STYLES=CITY_THEME_DATA.map(function(st){return {
        name:st.nameKey,ground:st.ground,path:st.path,sky:st.sky,bColors:st.bColors,roof:st.roof,tree:st.tree,fog:st.fog
    };});
}
var WARP_PIPES=(window.DANBO_CITY_REGISTRY&&DANBO_CITY_REGISTRY.getWarpPipes?DANBO_CITY_REGISTRY.getWarpPipes():null)||[
    {x:0,z:-65,targetStyle:1,rot:0,label:'🏜️ 沙漠'},
    {x:65,z:0,targetStyle:2,rot:-Math.PI/2,label:'❄️ 冰雪'},
    {x:0,z:65,targetStyle:3,rot:Math.PI,label:'🔥 熔岩'},
    {x:-65,z:0,targetStyle:4,rot:Math.PI/2,label:'🍬 糖果'}
];
var warpPipeMeshes=[]; // {group, x, z, targetStyle, entered}
// Apply localized city names
for(var _si=0;_si<CITY_STYLES.length;_si++){CITY_STYLES[_si].name=I18N.cityNames[_langCode][_si]||CITY_STYLES[_si].name;}

function _getCityDef(style){
    return (window.DANBO_CITY_REGISTRY&&DANBO_CITY_REGISTRY.getCity)?DANBO_CITY_REGISTRY.getCity(style):null;
}
function _getCityLayout(style){
    var def=_getCityDef(style);
    return (def&&def.layout)||{};
}
function _getCityPaths(style){
    if(window.DANBO_CITY_REGISTRY&&DANBO_CITY_REGISTRY.getPathList)return DANBO_CITY_REGISTRY.getPathList(style);
    return null;
}
function _getCityBuildings(style){
    if(window.DANBO_CITY_REGISTRY&&DANBO_CITY_REGISTRY.getBuildingList)return DANBO_CITY_REGISTRY.getBuildingList(style);
    return null;
}
function _getCityNpc(style){
    var def=_getCityDef(style);
    return (def&&def.npc)||{};
}
function _getCityWildlife(style){
    var def=_getCityDef(style);
    return (def&&def.wildlife)||{};
}
function _getCityCollectibles(style){
    var def=_getCityDef(style);
    return (def&&def.collectibles)||{};
}
function _getCityFlora(style){
    var layout=_getCityLayout(style);
    return (layout&&layout.flora)||{};
}
function _cityLayoutHasFeature(layout,name){
    return !!(layout&&layout.features&&layout.features.indexOf(name)!==-1);
}
function _hopeFountainDefaultDefinition(){
    return {
        id:'hope-central-fountain',type:'cinematicFountain',x:0,y:0,z:0,w:20.3,d:20.3,h:9.7,
        enabled:true,rotationY:0,scale:1,
        water:{opacity:0.50,rippleStrength:1},
        jets:{count:8,height:1,spread:1,splashStrength:1},
        map:{showIcon:true}
    };
}
function _hopeFountainDefinition(includeDisabled){
    var layout=_getCityLayout(currentCityStyle),list=layout&&layout.specialObjects;
    if(Array.isArray(list)){
        for(var i=0;i<list.length;i++){
            var item=list[i];
            if(item&&(item.type==='cinematicFountain'||item.id==='hope-central-fountain'))return item.enabled===false&&!includeDisabled?null:item;
        }
    }
    // Hope City historically generated its fountain from the "fountain" feature.
    // Keep old maps working until the editor adopts that landmark into map data.
    if(currentCityStyle===0&&(_cityLayoutHasFeature(layout,'fountain')||!layout))return _hopeFountainDefaultDefinition();
    return null;
}
function _hopeFountainDefinitionIndex(def){
    var layout=_getCityLayout(currentCityStyle),list=layout&&layout.specialObjects;
    if(!Array.isArray(list))return -1;
    for(var i=0;i<list.length;i++)if(list[i]===def||list[i]&&(list[i].type==='cinematicFountain'||list[i].id==='hope-central-fountain'))return i;
    return -1;
}
function _hopeFountainNumber(group,key,fallback,min,max){
    var def=window._fountainDefinition,value=def&&def[group]&&Number(def[group][key]);
    value=Number.isFinite(value)?value:fallback;
    return Math.max(min,Math.min(max,value));
}
window._moveFountainEditorTarget=function(index,x,y,z){
    var layout=_getCityLayout(currentCityStyle),list=layout&&layout.specialObjects;
    var def=Array.isArray(list)?list[Number(index)]:null;
    if(!def||def.type!=='cinematicFountain'||!window._fountainGroup)return false;
    def.x=Number(x)||0;def.y=Number(y)||0;def.z=Number(z)||0;
    window._fountainGroup.position.set(def.x,def.y,def.z);
    if(window._fountainCollider){
        window._fountainCollider.x=def.x;window._fountainCollider.z=def.z;
        window._fountainCollider.h=def.y+8.8*window._fountainGroup.scale.x;
    }
    return true;
};

function _cityMixHex(a,b,t){
    if(typeof _mixHex==='function')return _mixHex(a,b,t);
    t=Math.max(0,Math.min(1,t));
    var ar=(a>>16)&255,ag=(a>>8)&255,ab=a&255;
    var br=(b>>16)&255,bg=(b>>8)&255,bb=b&255;
    var r=Math.round(ar+(br-ar)*t),g=Math.round(ag+(bg-ag)*t),bl=Math.round(ab+(bb-ab)*t);
    return (r<<16)|(g<<8)|bl;
}
var _cityPBRCache={};
function _citySharedPBR(key,color,opts){
    var q=(window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.mode)||'balanced';
    var cacheKey=q+'|'+key+'|'+(color>>>0).toString(16);
    if(!_cityPBRCache[cacheKey])_cityPBRCache[cacheKey]=softPBR(color,opts||{});
    return _cityPBRCache[cacheKey];
}
var _CITY_PBR_PROFILES=[
    {ground:'grass',path:'path',facade:'facade',roof:'roof',foundation:'stone',wood:'wood',metal:'metal',groundTile:2.07},
    {ground:'sand',path:'stone',facade:'facade',roof:'roof',foundation:'stone',wood:'wood',metal:'metal',groundTile:2.35},
    {ground:'snow',path:'ice',facade:'stone',roof:'ice',foundation:'stone',wood:'wood',metal:'metal',groundTile:2.10},
    {ground:'lava',path:'stone',facade:'stone',roof:'metal',foundation:'lava',wood:'wood',metal:'metal',groundTile:1.85},
    {ground:'candy',path:'path',facade:'candy',roof:'candy',foundation:'stone',wood:'wood',metal:'metal',groundTile:1.70},
    {ground:'lunar',path:'metal',facade:'metal',roof:'metal',foundation:'lunar',wood:'wood',metal:'metal',groundTile:2.80},
    {ground:'grass',path:'stone',facade:'facade',roof:'roof',foundation:'stone',wood:'wood',metal:'metal',groundTile:1.95},
    {ground:'snow',path:'stone',facade:'facade',roof:'wood',foundation:'stone',wood:'wood',metal:'metal',groundTile:2.15}
];
function _cityPBRProfile(style){return _CITY_PBR_PROFILES[style]||_CITY_PBR_PROFILES[0];}
function _citySurfaceMaterial(role,color,opts){
    opts=opts||{};
    var profile=_cityPBRProfile(currentCityStyle),kind=profile[role]||role||'stone';
    if(typeof _visualSurfaceMaterial==='function')return _visualSurfaceMaterial(kind,color,opts);
    return softPBR(color,opts);
}
function _cityUpgradeMaterialsToPBR(){
    // Custom Sakura, Snow and Moon landmarks predate the shared material system and
    // still construct many small pieces with MeshToon/Phong materials. Promote those
    // remaining surfaces after the city is built so every city participates in HDRI,
    // ACES, GTAO and physically based roughness without deleting any authored objects.
    if(!cityGroup||typeof softPBR!=='function')return;
    var replacements=new Map(),oldMaterials=[];
    function promote(material,mesh){
        if(!material||material.isMeshStandardMaterial||material.isMeshPhysicalMaterial||material.isMeshLambertMaterial||material.isMeshBasicMaterial||material.isSpriteMaterial)return material;
        if(!(material.isMeshToonMaterial||material.isMeshPhongMaterial))return material;
        if(replacements.has(material.uuid))return replacements.get(material.uuid);
        var color=material.color?material.color.getHex():0xFFFFFF;
        var isEmissive=!!(material.emissive&&material.emissive.getHex()!==0&&material.emissiveIntensity>0);
        var isWater=!!(material.transparent&&material.opacity<0.86&&material.color&&material.color.b>material.color.r*1.08&&material.color.b>material.color.g*0.92);
        var name=((mesh&&mesh.name)||'').toLowerCase();
        var isMetal=/(metal|rail|pole|ship|funnel|antenna|tank|barrel)/.test(name);
        var opts={
            roughness:isWater?0.10:(isEmissive?0.22:(isMetal?0.46:0.78)),
            metalness:isMetal?0.28:0,
            envMapIntensity:isWater?0.88:(isEmissive?0.48:(isMetal?0.52:0.20)),
            transparent:material.transparent,opacity:material.opacity,side:material.side,
            depthWrite:material.depthWrite,depthTest:material.depthTest,blending:material.blending,
            vertexColors:material.vertexColors,flatShading:material.flatShading,
            map:material.map||null,alphaMap:material.alphaMap||null,
            bumpMap:material.bumpMap||null,bumpScale:material.bumpScale||0,
            normalMap:material.normalMap||null,normalScale:material.normalScale||undefined,
            roughnessMap:material.roughnessMap||null,metalnessMap:material.metalnessMap||null,
            aoMap:material.aoMap||null,aoMapIntensity:material.aoMapIntensity||1,
            emissive:material.emissive?material.emissive.getHex():0,
            emissiveMap:material.emissiveMap||null,emissiveIntensity:material.emissiveIntensity||0
        };
        if(isWater){opts.clearcoat=0.72;opts.clearcoatRoughness=0.12;opts.ior=1.333;opts.depthWrite=false;}
        else if(isEmissive){opts.clearcoat=0.38;opts.clearcoatRoughness=0.22;}
        var next=softPBR(color,opts);next.name=(material.name||'city-material')+'-pbr';next.userData=Object.assign({},material.userData||{},{danboCityPBR:true});
        replacements.set(material.uuid,next);oldMaterials.push(material);return next;
    }
    cityGroup.traverse(function(object){
        if(!object||!object.material)return;
        if(Array.isArray(object.material))object.material=object.material.map(function(m){return promote(m,object);});
        else object.material=promote(object.material,object);
    });
    for(var i=0;i<oldMaterials.length;i++)if(oldMaterials[i]&&oldMaterials[i].dispose)oldMaterials[i].dispose();
    var previous=window.DANBO_CITY_PBR_STATS;
    var cumulative=(previous&&previous.style===currentCityStyle?previous.promoted:0)+replacements.size;
    window.DANBO_CITY_PBR_STATS={style:currentCityStyle,promoted:cumulative,profile:_cityPBRProfile(currentCityStyle)};
}
function _cityCanvasSign(text,bg,fg){
    var c=document.createElement('canvas');c.width=256;c.height=80;
    var ctx=c.getContext('2d');
    ctx.fillStyle='rgba(20,20,28,0.82)';ctx.fillRect(0,0,256,80);
    ctx.fillStyle='#'+('000000'+(bg>>>0).toString(16)).slice(-6);
    ctx.fillRect(6,6,244,68);
    ctx.strokeStyle='rgba(255,255,255,0.72)';ctx.lineWidth=3;ctx.strokeRect(10,10,236,60);
    ctx.fillStyle=fg||'#FFFFFF';ctx.font='bold 28px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(text,128,42);
    var tex=new THREE.CanvasTexture(c);tex.minFilter=THREE.LinearFilter;tex.magFilter=THREE.LinearFilter;
    return tex;
}

// Reuse identical props through InstancedMesh and batch opaque building parts.
// Unlike lowering model detail, this keeps the authored objects and changes only
// how the same pixels are submitted to WebGL. Buildings stay in separate batches
// so the existing near-camera fade can still operate per building.
function _optimizeCityInstances(){
    if(!cityGroup||typeof THREE.InstancedMesh!=='function')return;
    try{if(new URLSearchParams(location.search).has('mapEditorPreview'))return;}catch(e){}
    if(cityGroup.userData._danboInstancesOptimized)return;
    window.DANBO_DYNAMIC_CITY_INSTANCES=[];
    cityGroup.updateMatrixWorld(true);
    var cityInverse=new THREE.Matrix4().copy(cityGroup.matrixWorld).invert();
    var buildingMembers=new Set();
    var propRootByMesh=new Map();
    var excluded=new Set();
    var stats={drawsBefore:0,drawsAfter:0,instances:0,batches:0,batchedMeshes:0,dynamicInstances:0,
        instanceCandidates:0,batchCandidates:0,instanceGroups:0,batchGroups:0};

    function markTree(root,set){
        if(!root||!root.isObject3D)return;
        root.traverse(function(child){set.add(child);});
    }
    function eligible(mesh){
        return !!(mesh&&mesh.parent&&mesh.isMesh&&!mesh.isInstancedMesh&&!mesh.isBatchedMesh&&
            !mesh.isSkinnedMesh&&mesh.visible&&mesh.geometry&&mesh.material&&
            !Array.isArray(mesh.material)&&!mesh.material.transparent&&mesh.material.opacity>=1&&
            mesh.material.blending===THREE.NormalBlending&&mesh.renderOrder===0&&
            (!mesh.children||mesh.children.length===0)&&
            (!mesh.geometry.morphAttributes||Object.keys(mesh.geometry.morphAttributes).length===0)&&
            !(mesh.userData&&mesh.userData.noAO)&&
            !/(?:portal|coin|chest|water|ripple|foam|stream|droplet|glow|effect|fish|wheel)/i.test(mesh.name||''));
    }
    function primitiveGeometryKey(geometry){
        var parameters=geometry&&geometry.parameters;
        if(!parameters)return geometry.uuid;
        var parts=[],keys=Object.keys(parameters).sort();
        for(var i=0;i<keys.length;i++){
            var value=parameters[keys[i]];
            if(typeof value==='number'||typeof value==='string'||typeof value==='boolean')parts.push(keys[i]+'='+value);
        }
        // Shape/lathe/custom geometries cannot be proven equivalent cheaply.
        return parts.length?geometry.type+'|'+parts.join(','):geometry.uuid;
    }
    function opaqueMaterialKey(material){
        function colorValue(value){return value&&value.isColor?value.getHex():'';}
        function textureValue(value){return value&&value.isTexture?value.uuid:'';}
        return [material.type,colorValue(material.color),colorValue(material.emissive),material.emissiveIntensity,
            material.roughness,material.metalness,material.envMapIntensity,material.side,material.flatShading,
            material.vertexColors,material.toneMapped,material.fog,material.depthWrite,material.depthTest,
            material.colorWrite,material.alphaTest,material.polygonOffset,material.polygonOffsetFactor,
            material.polygonOffsetUnits,textureValue(material.map),textureValue(material.alphaMap),
            textureValue(material.lightMap),textureValue(material.bumpMap),textureValue(material.displacementMap),
            textureValue(material.normalMap),textureValue(material.aoMap),textureValue(material.roughnessMap),
            textureValue(material.metalnessMap),textureValue(material.emissiveMap),textureValue(material.gradientMap),
            material.aoMapIntensity,material.normalScale&&material.normalScale.x,material.normalScale&&material.normalScale.y].join('|');
    }
    function groupKey(mesh){
        return primitiveGeometryKey(mesh.geometry)+'|'+opaqueMaterialKey(mesh.material)+'|'+
            (mesh.castShadow?1:0)+'|'+(mesh.receiveShadow?1:0)+'|'+mesh.layers.mask;
    }
    function buildGroups(candidates,label,onCreated){
        var groups=new Map();
        candidates.forEach(function(mesh){
            if(!eligible(mesh))return;
            stats.instanceCandidates++;
            var key=groupKey(mesh);
            if(!groups.has(key))groups.set(key,[]);
            groups.get(key).push(mesh);
        });
        groups.forEach(function(items){
            if(items.length<2)return;
            stats.instanceGroups++;
            var first=items[0],instanced;
            try{
                instanced=new THREE.InstancedMesh(first.geometry,first.material,items.length);
                instanced.name='danbo-'+label+'-instances';
                instanced.castShadow=first.castShadow;
                instanced.receiveShadow=first.receiveShadow;
                instanced.layers.mask=first.layers.mask;
                instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
                var dynamic=false;
                for(var i=0;i<items.length;i++){
                    var source=items[i];
                    source.updateWorldMatrix(true,false);
                    var matrix=new THREE.Matrix4().multiplyMatrices(cityInverse,source.matrixWorld);
                    instanced.setMatrixAt(i,matrix);
                    var propRoot=propRootByMesh.get(source);
                    if(propRoot){
                        dynamic=true;
                        source.visible=false;
                        window.DANBO_DYNAMIC_CITY_INSTANCES.push({
                            source:source,root:propRoot,mesh:instanced,index:i,matrix:new THREE.Matrix4()
                        });
                        stats.dynamicInstances++;
                    }else if(source.parent){
                        source.parent.remove(source);
                    }
                }
                instanced.instanceMatrix.needsUpdate=true;
                instanced.frustumCulled=!dynamic;
                instanced.computeBoundingBox();
                instanced.computeBoundingSphere();
                cityGroup.add(instanced);
                stats.drawsBefore+=items.length;
                stats.drawsAfter++;
                stats.instances+=items.length;
                if(onCreated)onCreated(items,instanced);
            }catch(error){
                if(instanced&&instanced.dispose)instanced.dispose();
                console.warn('City instance group skipped:',error);
            }
        });
    }

    function geometryLayoutKey(geometry){
        var names=Object.keys(geometry.attributes||{}).sort(),parts=[];
        for(var i=0;i<names.length;i++){
            var attribute=geometry.attributes[names[i]];
            parts.push(names[i]+':'+attribute.itemSize+':'+(attribute.normalized?1:0));
        }
        return (geometry.getIndex()?1:0)+'|'+parts.join(',');
    }
    function buildBatches(candidates,label,onCreated){
        if(typeof THREE.BatchedMesh!=='function')return;
        var groups=new Map();
        candidates.forEach(function(mesh){
            if(!eligible(mesh))return;
            stats.batchCandidates++;
            var key=opaqueMaterialKey(mesh.material)+'|'+geometryLayoutKey(mesh.geometry)+'|'+
                (mesh.castShadow?1:0)+'|'+(mesh.receiveShadow?1:0)+'|'+mesh.layers.mask;
            if(!groups.has(key))groups.set(key,[]);
            groups.get(key).push(mesh);
        });
        groups.forEach(function(items){
            if(items.length<2)return;
            stats.batchGroups++;
            var first=items[0],batched;
            try{
                var geometries=new Map(),vertexCount=0,indexCount=0;
                items.forEach(function(item){
                    var geometry=item.geometry;
                    if(geometries.has(geometry.uuid))return;
                    geometries.set(geometry.uuid,geometry);
                    vertexCount+=geometry.getAttribute('position').count;
                    if(geometry.getIndex())indexCount+=geometry.getIndex().count;
                });
                batched=new THREE.BatchedMesh(items.length,vertexCount,indexCount,first.material);
                batched.name='danbo-'+label+'-batch';
                batched.castShadow=first.castShadow;
                batched.receiveShadow=first.receiveShadow;
                batched.layers.mask=first.layers.mask;
                batched.userData.editorBuildingIndex=first.userData.editorBuildingIndex;
                var geometryIds=new Map();
                geometries.forEach(function(geometry,key){geometryIds.set(key,batched.addGeometry(geometry));});
                for(var i=0;i<items.length;i++){
                    var source=items[i];
                    source.updateWorldMatrix(true,false);
                    var matrix=new THREE.Matrix4().multiplyMatrices(cityInverse,source.matrixWorld);
                    var instanceId=batched.addInstance(geometryIds.get(source.geometry.uuid));
                    batched.setMatrixAt(instanceId,matrix);
                    if(source.parent)source.parent.remove(source);
                }
                batched.computeBoundingBox();
                batched.computeBoundingSphere();
                cityGroup.add(batched);
                stats.drawsBefore+=items.length;
                stats.drawsAfter++;
                stats.batches++;
                stats.batchedMeshes+=items.length;
                if(onCreated)onCreated(items,batched);
            }catch(error){
                if(batched&&batched.dispose)batched.dispose();
                console.warn('City batch skipped:',error);
            }
        });
    }

    // Track every building member up front so the global pass cannot combine
    // separate buildings and accidentally tie their occlusion fades together.
    if(typeof cityBuildingMeshes!=='undefined')cityBuildingMeshes.forEach(function(building){
        (building.meshes||[]).forEach(function(root){markTree(root,buildingMembers);});
    });
    if(typeof cityProps!=='undefined')cityProps.forEach(function(item){
        var root=item&&(item.group||item.mesh);
        if(root&&root.isObject3D)root.traverse(function(child){
            if(child.isMesh)propRootByMesh.set(child,root);
        });
    });
    // Animals animate individual body parts (heads, wings, ears, legs), not just
    // their root transform. Removing those child meshes into a static batch makes
    // the animation loop lose references such as the pigeon's head and freezes
    // the remaining articulated motion. Keep these small animated hierarchies
    // intact; batching buildings and ordinary props still removes most draw calls.
    if(Array.isArray(window._cityAnimals))window._cityAnimals.forEach(function(animal){
        markTree(animal&&animal.group,excluded);
    });
    if(typeof cityCoins!=='undefined')cityCoins.forEach(function(item){markTree(item&&item.mesh,excluded);});
    if(typeof cityChests!=='undefined')cityChests.forEach(function(item){markTree(item&&(item.group||item.mesh),excluded);});
    if(typeof portals!=='undefined')portals.forEach(function(item){
        markTree(item&&(item.group||item.mesh),excluded);markTree(item&&item.glow,excluded);
    });
    if(typeof warpPipeMeshes!=='undefined')warpPipeMeshes.forEach(function(item){markTree(item&&(item.group||item.mesh),excluded);});
    [
        '_fountainPoolWater','_fountainInnerWater','_fountainTopWater','_fountainSpillWater',
        '_fountainWaterHighlights','_fountainRipples','_waterWheels','_moonEarth'
    ].forEach(function(key){
        var value=window[key];
        if(value&&value.isObject3D)markTree(value,excluded);
        else if(Array.isArray(value))value.forEach(function(item){markTree(item&&(item.group||item.mesh||item),excluded);});
    });

    // Preserve per-building material fade by creating separate batches. Unlike
    // InstancedMesh, BatchedMesh can combine the many differently-sized facade
    // primitives that share one material into one render-list entry.
    if(typeof cityBuildingMeshes!=='undefined')cityBuildingMeshes.forEach(function(building){
        var unique=new Set();
        (building.meshes||[]).forEach(function(root){if(root&&root.isObject3D)root.traverse(function(child){if(child.isMesh)unique.add(child);});});
        var removed=new Set(),replacements=[];
        buildBatches(Array.from(unique),'building',function(items,batched){
            items.forEach(function(item){removed.add(item);});
            replacements.push(batched);
        });
        building.meshes=Array.from(unique).filter(function(mesh){return mesh.parent&&!removed.has(mesh);}).concat(replacements);
    });

    // Movable props keep invisible source nodes whose matrices are mirrored each
    // frame. Static props can use larger BatchedMesh groups.
    var globalCandidates=[],dynamicCandidates=[];
    cityGroup.traverse(function(object){
        if(!buildingMembers.has(object)&&!excluded.has(object)&&eligible(object)){
            if(propRootByMesh.has(object))dynamicCandidates.push(object);
            else globalCandidates.push(object);
        }
    });
    buildGroups(dynamicCandidates,'dynamic-city');
    buildBatches(globalCandidates,'city');
    var dynamicRoots=new Map();
    window.DANBO_DYNAMIC_CITY_INSTANCES.forEach(function(binding){
        var entry=dynamicRoots.get(binding.root);
        if(!entry){
            binding.root.updateMatrix();
            entry={root:binding.root,bindings:[],localMatrix:binding.root.matrix.clone()};
            dynamicRoots.set(binding.root,entry);
        }
        entry.bindings.push(binding);
    });
    window.DANBO_DYNAMIC_CITY_INSTANCE_ROOTS=Array.from(dynamicRoots.values());
    window.DANBO_CITY_INSTANCE_STATS=stats;
    if(!window.DANBO_CITY_INSTANCE_HISTORY)window.DANBO_CITY_INSTANCE_HISTORY=[];
    window.DANBO_CITY_INSTANCE_HISTORY.push(stats);
    cityGroup.userData._danboInstancesOptimized=true;
}

function _syncDynamicCityInstances(){
    var entries=window.DANBO_DYNAMIC_CITY_INSTANCE_ROOTS;
    if(!entries||!entries.length||!cityGroup)return;
    cityGroup.updateWorldMatrix(true,false);
    var inverse=_syncDynamicCityInstances._inverse||(_syncDynamicCityInstances._inverse=new THREE.Matrix4());
    inverse.copy(cityGroup.matrixWorld).invert();
    var touched=_syncDynamicCityInstances._touched||(_syncDynamicCityInstances._touched=new Set());
    touched.clear();
    for(var i=0;i<entries.length;i++){
        var entry=entries[i],root=entry.root;
        root.updateMatrix();
        if(root.matrix.equals(entry.localMatrix))continue;
        entry.localMatrix.copy(root.matrix);
        root.updateMatrixWorld(true);
        for(var j=0;j<entry.bindings.length;j++){
            var binding=entry.bindings[j];
            if(!binding.mesh.parent)continue;
            binding.matrix.multiplyMatrices(inverse,binding.source.matrixWorld);
            binding.mesh.setMatrixAt(binding.index,binding.matrix);
            touched.add(binding.mesh);
        }
    }
    touched.forEach(function(mesh){mesh.instanceMatrix.needsUpdate=true;});
}
function _decorateDefaultBuilding(b,bMeshes,col,st,i){
    var dark=_cityMixHex(col,0x151515,0.32);
    var light=_cityMixHex(col,0xFFFFFF,0.26);
    var trim=_cityMixHex(st.roof||col,0xFFFFFF,0.12);
    var glow=(currentCityStyle===3)?0xFF8844:((currentCityStyle===2)?0xDDF8FF:((currentCityStyle===4)?0xFFEE88:0xFFE4A2));
    var trimM=toon(trim);
    var darkM=toon(dark);
    var lightM=toon(light);
    function add(mesh){cityGroup.add(mesh);bMeshes.push(mesh);return mesh;}

    // Roof lip, base plinth, and facade side strips immediately break the pure-box silhouette.
    var cap=new THREE.Mesh(new THREE.BoxGeometry(b.w+0.7,0.24,b.d+0.7),trimM);
    cap.position.set(b.x,b.h+0.12,b.z);cap.castShadow=true;add(cap);
    var plinth=new THREE.Mesh(new THREE.BoxGeometry(b.w+0.55,0.34,b.d+0.55),darkM);
    plinth.position.set(b.x,0.18,b.z);plinth.receiveShadow=true;add(plinth);
    [-1,1].forEach(function(sx){
        var colm=new THREE.Mesh(new THREE.BoxGeometry(0.18,b.h+0.1,0.22),lightM);
        colm.position.set(b.x+sx*(b.w/2+0.06),(b.h+0.1)/2,b.z+b.d/2+0.09);add(colm);
        var colm2=new THREE.Mesh(new THREE.BoxGeometry(0.18,b.h+0.1,0.22),lightM);
        colm2.position.set(b.x+sx*(b.w/2+0.06),(b.h+0.1)/2,b.z-b.d/2-0.09);add(colm2);
    });
    // Faux rounded toy-building corners: vertical cylinders soften the original box silhouettes.
    var cornerM=toon(_cityMixHex(light,0xFFFFFF,0.14));
    [-1,1].forEach(function(sx){
        [-1,1].forEach(function(sz){
            var corner=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,b.h+0.16,8),cornerM);
            corner.position.set(b.x+sx*(b.w/2+0.04),(b.h+0.16)/2,b.z+sz*(b.d/2+0.04));
            corner.castShadow=true;
            add(corner);
        });
    });

    // Horizontal floor bands and inset facade panels.
    for(var fy=3;fy<b.h-1;fy+=4){
        var band=new THREE.Mesh(new THREE.BoxGeometry(b.w+0.18,0.08,0.10),darkM);
        band.position.set(b.x,fy,b.z+b.d/2+0.11);add(band);
        var band2=new THREE.Mesh(new THREE.BoxGeometry(b.w+0.18,0.08,0.10),darkM);
        band2.position.set(b.x,fy,b.z-b.d/2-0.11);add(band2);
    }
    for(var vx=-b.w/2+2;vx<=b.w/2-2;vx+=3.2){
        var rib=new THREE.Mesh(new THREE.BoxGeometry(0.08,Math.max(2,b.h-2),0.08),lightM);
        rib.position.set(b.x+vx,b.h/2+0.4,b.z+b.d/2+0.13);add(rib);
    }

    // Door canopy + tiny shop-style sign.
    var awningColor=(currentCityStyle===4)?0xFF66AA:((currentCityStyle===3)?0xFF5522:((currentCityStyle===1)?0xCC8844:0x4488DD));
    var awn=new THREE.Mesh(new THREE.BoxGeometry(Math.min(b.w*0.7,4.2),0.18,0.85),toon(awningColor,{emissive:awningColor,emissiveIntensity:0.10}));
    awn.position.set(b.x,2.35,b.z+b.d/2+0.46);awn.rotation.x=-0.12;add(awn);
    if(i%2===0){
        var sNames=['DANBO','SHOP','CAFE','HOTEL','STAR','TOY'];
        var tex=_cityCanvasSign(sNames[i%sNames.length],awningColor,'#FFFFFF');
        var sign=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true}));
        sign.position.set(b.x,Math.min(b.h-1.5,4.2),b.z+b.d/2+0.20);
        sign.scale.set(3.2,1.0,1);cityGroup.add(sign);bMeshes.push(sign);
    }

    // Balconies and small railings on medium/tall buildings.
    if(b.h>9){
        var balconyM=toon(_cityMixHex(trim,0xFFFFFF,0.20));
        var railM=toon(dark);
        for(var by=5;by<b.h-1;by+=6){
            var bxCount=Math.max(1,Math.floor(b.w/4));
            for(var bx=0;bx<bxCount;bx++){
                var off=(bx-(bxCount-1)/2)*3.2;
                if(Math.abs(off)>b.w/2-1.2)continue;
                var deck=new THREE.Mesh(new THREE.BoxGeometry(1.6,0.12,0.60),balconyM);
                deck.position.set(b.x+off,by-0.55,b.z+b.d/2+0.42);add(deck);
                var rail=new THREE.Mesh(new THREE.BoxGeometry(1.65,0.32,0.06),railM);
                rail.position.set(b.x+off,by-0.25,b.z+b.d/2+0.73);add(rail);
            }
        }
    }

    // Rooftop props: water tanks, chimneys, antennas, neon halos.
    if(i%3===0){
        var tankG=new THREE.Group();tankG.position.set(b.x+(i%2?b.w*0.20:-b.w*0.20),b.h+0.45,b.z);
        var tank=new THREE.Mesh(new THREE.CylinderGeometry(0.45,0.45,0.7,10),toon(_cityMixHex(trim,0x777777,0.25)));
        tank.position.y=0.35;tankG.add(tank);
        for(var li=0;li<4;li++){var leg=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,0.5,4),darkM);leg.position.set((li<2?-0.28:0.28),-0.25,(li%2?-0.28:0.28));tankG.add(leg);}
        cityGroup.add(tankG);
        for(var tci=0;tci<tankG.children.length;tci++)bMeshes.push(tankG.children[tci]);
    }
    if(i%4===1){
        var ant=new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.018,2.4,5),toon(0x333333));
        ant.position.set(b.x+b.w*0.25,b.h+1.35,b.z-b.d*0.15);add(ant);
        var dish=new THREE.Mesh(new THREE.SphereGeometry(0.28,8,6),toon(0xCCCCCC));
        dish.position.set(b.x+b.w*0.25,b.h+0.75,b.z-b.d*0.15);dish.scale.set(1,0.35,0.7);add(dish);
    }
    if(i%5===2){
        var neon=new THREE.Mesh(new THREE.TorusGeometry(0.55,0.045,6,18),new THREE.MeshBasicMaterial({color:glow,transparent:true,opacity:0.55,blending:THREE.AdditiveBlending}));
        neon.position.set(b.x-b.w*0.25,b.h+0.45,b.z+b.d/2+0.18);neon.rotation.x=Math.PI/2;add(neon);
    }
}

function _decorateHopePremiumBuilding(b,bMeshes,col,i){
    var high=window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.high;
    var near=Math.abs(b.x)<72&&Math.abs(b.z)<72;
    var archetype=i%5;
    var stone=_citySharedPBR('trim-stone',0xDED6C8,{roughness:0.82,envMapIntensity:0.18});
    var stoneDark=_citySharedPBR('trim-stone-dark',0xAA9C87,{roughness:0.88,envMapIntensity:0.14});
    var glass=_citySharedPBR('window-glass',0x286E91,{roughness:0.10,metalness:0.03,clearcoat:0.68,clearcoatRoughness:0.13,envMapIntensity:0.72,emissive:0x061A24,emissiveIntensity:0.04});
    var shutter=_citySharedPBR('shutter',_cityMixHex(col,0x153A56,0.58),{roughness:0.66,clearcoat:0.08,envMapIntensity:0.24});
    var planter=_citySharedPBR('planter',0x806044,{roughness:0.88});
    var leaf=_citySharedPBR('leaf',0x2F6D35,{roughness:0.90});
    var flowerColor=[0xFFD04E,0xFF7DAA,0xF7F0D8,0x8FD7FF][i%4];
    var flower=_citySharedPBR('flower-'+(i%4),flowerColor,{roughness:0.70,emissive:0x2A1505,emissiveIntensity:0.025});
    function add(mesh){mesh.castShadow=true;mesh.receiveShadow=true;cityGroup.add(mesh);bMeshes.push(mesh);return mesh;}

    // A substantial mineral/stone ground course visually anchors tall buildings.
    var lowerColor=archetype%2?_cityMixHex(col,0xB8A98F,0.56):0xC8BBA5;
    var lowerMat=_citySharedPBR('hope-ground-course-'+archetype,lowerColor,{roughness:0.88,envMapIntensity:0.13});
    var lower=new THREE.Mesh(_visualRoundedBoxGeometry(b.w+0.20,1.34,b.d+0.20,0.20),lowerMat);
    lower.name='hope-building-ground-course';lower.position.set(b.x,0.67,b.z);add(lower);

    // Slender corner pilasters with fine masonry joints replace the old oversized block
    // corners. They catch the key light without making the facade look like stacked toys.
    if(high&&near){
        var qDummy=new THREE.Object3D(),qCorners=[[-1,-1],[-1,1],[1,-1],[1,1]];
        var qPillars=new THREE.InstancedMesh(new THREE.BoxGeometry(0.34,b.h+0.10,0.34),stone,4);
        var qCaps=new THREE.InstancedMesh(new THREE.BoxGeometry(0.46,0.26,0.46),stoneDark,8);
        qPillars.name='hope-corner-pilasters';qCaps.name='hope-pilaster-caps';
        qCorners.forEach(function(qc,qci){
            var qx=b.x+qc[0]*(b.w/2+0.02),qz=b.z+qc[1]*(b.d/2+0.02);
            qDummy.position.set(qx,(b.h+0.10)/2,qz);qDummy.scale.set(1,1,1);qDummy.updateMatrix();qPillars.setMatrixAt(qci,qDummy.matrix);
            qDummy.position.set(qx,0.15,qz);qDummy.updateMatrix();qCaps.setMatrixAt(qci*2,qDummy.matrix);
            qDummy.position.set(qx,b.h-0.15,qz);qDummy.updateMatrix();qCaps.setMatrixAt(qci*2+1,qDummy.matrix);
        });
        qPillars.instanceMatrix.needsUpdate=true;qCaps.instanceMatrix.needsUpdate=true;add(qPillars);add(qCaps);
        var qJointRows=Math.max(1,Math.floor((b.h-0.8)/1.45)),qJoints=new THREE.InstancedMesh(new THREE.BoxGeometry(0.38,0.035,0.38),stoneDark,qJointRows*4),qji=0;
        qJoints.name='hope-pilaster-masonry-joints';
        for(var qjr=0;qjr<qJointRows;qjr++){
            var qjy=0.72+qjr*1.45;
            qCorners.forEach(function(qc){
                qDummy.position.set(b.x+qc[0]*(b.w/2+0.02),qjy,b.z+qc[1]*(b.d/2+0.02));qDummy.updateMatrix();qJoints.setMatrixAt(qji++,qDummy.matrix);
            });
        }
        qJoints.instanceMatrix.needsUpdate=true;add(qJoints);
    }else{
        [-1,1].forEach(function(sx){[-1,1].forEach(function(sz){
            var q=new THREE.Mesh(_visualRoundedBoxGeometry(0.42,b.h+0.12,0.42,0.08),stone);
            q.position.set(b.x+sx*(b.w/2+0.02),(b.h+0.12)/2,b.z+sz*(b.d/2+0.02));add(q);
        });});
    }
    if(near){
        var beltStep=archetype===0?4.4:(archetype===3?3.6:4.0);
        for(var fy=3.05+(archetype%2)*0.38;fy<b.h-0.8;fy+=beltStep){
            var belt=new THREE.Mesh(_visualRoundedBoxGeometry(b.w+0.30,0.12,b.d+0.30,0.05),stoneDark);
            belt.position.set(b.x,fy,b.z);add(belt);
        }
    }

    // Distinct facade archetypes break the repeated-box skyline. Bays start above the
    // entrance and physically intersect the wall, so their windows and caps never float.
    if(high&&near&&b.h>8){
        var bayMat=_citySharedPBR('hope-bay-'+archetype,_cityMixHex(col,archetype===2?0xF0CDAA:0xFFF2DD,0.22),{roughness:0.84,envMapIntensity:0.16});
        function addBay(off,w){
            var bayBottom=3.15,bayH=Math.max(3.2,b.h-bayBottom-0.42),bayD=0.46;
            var bay=new THREE.Mesh(_visualRoundedBoxGeometry(w,bayH,bayD,0.16),bayMat);
            bay.name='hope-facade-bay-'+archetype;bay.position.set(b.x+off,bayBottom+bayH/2,b.z+b.d/2+bayD*0.22);add(bay);
            var bayBase=new THREE.Mesh(_visualRoundedBoxGeometry(w+0.18,0.18,0.68,0.07),stoneDark);
            bayBase.position.set(b.x+off,bayBottom+0.08,b.z+b.d/2+0.25);add(bayBase);
            var bayCap=new THREE.Mesh(_visualRoundedBoxGeometry(w+0.22,0.20,0.72,0.08),stone);
            bayCap.position.set(b.x+off,bayBottom+bayH-0.05,b.z+b.d/2+0.25);add(bayCap);
            for(var by=4.35;by<b.h-1.0;by+=3.35){
                var bf=new THREE.Mesh(_visualRoundedBoxGeometry(Math.min(0.92,w*0.52),1.18,0.16,0.09),stone);
                bf.position.set(b.x+off,by,b.z+b.d/2+0.48);add(bf);
                var bw=new THREE.Mesh(_visualRoundedBoxGeometry(Math.min(0.66,w*0.36),0.88,0.09,0.055),glass);
                bw.position.set(b.x+off,by,b.z+b.d/2+0.58);add(bw);
            }
        }
        if(archetype===0)addBay(0,Math.min(2.8,b.w*0.34));
        else if(archetype===1&&b.w>7){addBay(-b.w*0.23,Math.min(1.9,b.w*0.22));addBay(b.w*0.23,Math.min(1.9,b.w*0.22));}
        else if(archetype===2)addBay((i%2?-1:1)*b.w*0.23,Math.min(2.3,b.w*0.28));
        else if(archetype===3&&b.w>7.5){
            var turretX=b.x+(i%2?-1:1)*(b.w/2-0.62),turretZ=b.z+b.d/2+0.04;
            var turret=new THREE.Mesh(new THREE.CylinderGeometry(0.74,0.84,b.h+0.25,18),bayMat);
            turret.name='hope-corner-turret';turret.position.set(turretX,(b.h+0.25)/2,turretZ);add(turret);
            var turretRoof=new THREE.Mesh(new THREE.ConeGeometry(1.02,1.18,18),_citySharedPBR('hope-turret-roof',0x9E4B37,{roughness:0.62,envMapIntensity:0.34}));
            turretRoof.position.set(turretX,b.h+0.63,turretZ);add(turretRoof);
        }
    }

    // The old buildings only had front/back windows. Side elevations now use the same
    // inset glass, stone frames and deep reveals, so the model survives orbit cameras.
    if(high&&near){
        var sideFrames=[],sideWindows=[],sideDummy=new THREE.Object3D();
        for(var wy=2;wy<b.h-1;wy+=BUILDING_CONFIG.windowSpacingY){
            for(var wz=-b.d/2+1.5;wz<b.d/2-1;wz+=BUILDING_CONFIG.windowSpacingX){
                [-1,1].forEach(function(side){
                    sideDummy.position.set(b.x+side*(b.w/2+0.07),wy,b.z+wz);sideDummy.rotation.set(0,Math.PI/2,0);sideDummy.updateMatrix();sideFrames.push(sideDummy.matrix.clone());
                    sideDummy.position.set(b.x+side*(b.w/2+0.18),wy,b.z+wz);sideDummy.updateMatrix();sideWindows.push(sideDummy.matrix.clone());
                });
            }
        }
        if(sideFrames.length){
            var sideFrameMesh=new THREE.InstancedMesh(_visualRoundedBoxGeometry(1.18,1.35,0.18,0.17),stone,sideFrames.length);
            var sideWindowMesh=new THREE.InstancedMesh(_visualRoundedBoxGeometry(0.76,0.91,0.10,0.11),glass,sideWindows.length);
            for(var sf=0;sf<sideFrames.length;sf++){sideFrameMesh.setMatrixAt(sf,sideFrames[sf]);sideWindowMesh.setMatrixAt(sf,sideWindows[sf]);}
            sideFrameMesh.instanceMatrix.needsUpdate=true;sideWindowMesh.instanceMatrix.needsUpdate=true;
            add(sideFrameMesh);add(sideWindowMesh);
        }
    }

    if(high&&near&&i<12){
        for(var y=5;y<b.h-1;y+=6){
            for(var x=-b.w/2+1.5;x<b.w/2-1;x+=BUILDING_CONFIG.windowSpacingX){
                [-1,1].forEach(function(s){
                    var sh=new THREE.Mesh(_visualRoundedBoxGeometry(0.26,1.05,0.12,0.07),shutter);
                    sh.position.set(b.x+x+s*0.58,y,b.z+b.d/2+0.23);add(sh);
                });
                var box=new THREE.Mesh(_visualRoundedBoxGeometry(0.92,0.18,0.34,0.07),planter);
                box.position.set(b.x+x,y-0.68,b.z+b.d/2+0.34);add(box);
                var foliage=new THREE.Mesh(new THREE.IcosahedronGeometry(0.28,1),leaf);
                foliage.position.set(b.x+x,y-0.48,b.z+b.d/2+0.34);foliage.scale.set(1.55,0.48,0.70);add(foliage);
                var bloom=new THREE.Mesh(new THREE.IcosahedronGeometry(0.075,1),flower);bloom.position.set(b.x+x+(i%2?0.15:-0.15),y-0.31,b.z+b.d/2+0.39);add(bloom);
            }
        }
    }

    // A real balcony slab, balustrade and roof drainage replace the toy-flat facade.
    if(near&&b.h>14&&i%2===0){
        var deck=new THREE.Mesh(_visualRoundedBoxGeometry(Math.min(4.8,b.w-1),0.20,1.08,0.10),stone);
        deck.position.set(b.x,5.15,b.z+b.d/2+0.56);add(deck);
        var railTop=new THREE.Mesh(_visualRoundedBoxGeometry(Math.min(4.6,b.w-1.2),0.10,0.10,0.04),stoneDark);
        railTop.position.set(b.x,5.94,b.z+b.d/2+1.02);add(railTop);
        var bars=Math.max(4,Math.floor(Math.min(4.4,b.w-1.4)/0.55));
        for(var ri=0;ri<bars;ri++){var rx=(ri-(bars-1)/2)*0.55;var rail=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,0.72,7),stoneDark);rail.position.set(b.x+rx,5.56,b.z+b.d/2+1.02);add(rail);}
    }
    var pipeM=_citySharedPBR('drain-pipe',0x756E63,{roughness:0.58,metalness:0.20});
    var pipe=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,b.h-0.4,10),pipeM);
    pipe.position.set(b.x+b.w/2-0.45,b.h/2,b.z+b.d/2+0.19);add(pipe);

    // Roofline variation: grounded chimneys and caps interrupt the identical gable rhythm.
    if(near&&i%3!==1){
        var chimneyMat=_citySharedPBR('hope-chimney',_cityMixHex(col,0x6E4336,0.58),{roughness:0.91,envMapIntensity:0.10});
        var chimney=new THREE.Mesh(_visualRoundedBoxGeometry(0.48,1.20,0.48,0.08),chimneyMat);
        chimney.position.set(b.x+(i%2?-1:1)*b.w*0.23,b.h+0.72,b.z-b.d*0.12);add(chimney);
        var chimneyCap=new THREE.Mesh(_visualRoundedBoxGeometry(0.62,0.16,0.62,0.06),stoneDark);
        chimneyCap.position.set(chimney.position.x,b.h+1.32,chimney.position.z);add(chimneyCap);
    }
}

function _buildHopeCinematicPlaza(){
    var high=window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.high;
    var paving=_visualSurfaceMaterial('path',0xA89A84,{roughness:0.72,normalScale:new THREE.Vector2(0.72,0.72),envMapIntensity:0.34});
    var edge=_visualSurfaceMaterial('stone',0xC7BBA6,{roughness:0.76,normalScale:new THREE.Vector2(0.45,0.45)});
    var garden=_visualSurfaceMaterial('grass',0x326B39,{roughness:0.94,normalScale:new THREE.Vector2(0.55,0.55)});
    var plaza=new THREE.Mesh(new THREE.CircleGeometry(17.2,high?96:48),paving);
    if(typeof _visualScaleUVToMeters==='function')_visualScaleUVToMeters(plaza.geometry,34.4,34.4,2.2);
    plaza.rotation.x=-Math.PI/2;plaza.position.y=0.075;plaza.receiveShadow=true;plaza.name='hope-cinematic-stone-plaza';cityGroup.add(plaza);
    var curb=new THREE.Mesh(new THREE.TorusGeometry(17.25,0.24,high?12:7,high?96:48),edge);
    curb.rotation.x=Math.PI/2;curb.position.y=0.13;curb.receiveShadow=true;cityGroup.add(curb);

    // Curved planted quarters preserve the existing layout while giving the fountain a
    // layered garden composition instead of a flat grass sheet.
    for(var s=0;s<4;s++){
        var bed=new THREE.Mesh(new THREE.RingGeometry(12.0,16.55,high?48:24,1,s*Math.PI/2+0.16,Math.PI/2-0.32),garden);
        bed.rotation.x=-Math.PI/2;bed.position.y=0.115;bed.receiveShadow=true;cityGroup.add(bed);
    }
    var stoneGeo=_visualRoundedBoxGeometry(0.95,0.13,1.18,0.10),stoneMesh=new THREE.InstancedMesh(stoneGeo,edge,high?88:48),d=new THREE.Object3D();
    for(var i=0;i<stoneMesh.count;i++){
        var a=i/stoneMesh.count*Math.PI*2,r=11.25;
        d.position.set(Math.cos(a)*r,0.11,Math.sin(a)*r);d.rotation.set(0,-a,0);d.scale.set(1,0.80,1);d.updateMatrix();stoneMesh.setMatrixAt(i,d.matrix);
    }
    stoneMesh.castShadow=true;stoneMesh.receiveShadow=true;stoneMesh.name='hope-plaza-cut-stone-ring';cityGroup.add(stoneMesh);

    var rnd=typeof _visualSeededRandom==='function'?_visualSeededRandom(202607133):Math.random;
    var flowerGeo=new THREE.OctahedronGeometry(0.075,0),stemGeo=new THREE.CylinderGeometry(0.012,0.018,0.22,5),stemMat=softPBR(0x315D2C,{roughness:0.90});
    var flowerMats=[0xFFCF45,0xFF759E,0xF7F0E0,0x8ED7FF].map(function(c){return softPBR(c,{roughness:0.64,emissive:_cityMixHex(c,0x000000,0.80),emissiveIntensity:0.06});});
    for(var fc=0;fc<flowerMats.length;fc++){
        var count=high?44:18,flowers=new THREE.InstancedMesh(flowerGeo,flowerMats[fc],count),stems=new THREE.InstancedMesh(stemGeo,stemMat,count),fd=new THREE.Object3D(),sd=new THREE.Object3D();
        for(var fi=0;fi<count;fi++){
            var sector=Math.floor(rnd()*4),ang=sector*Math.PI/2+0.22+rnd()*(Math.PI/2-0.44),rad=12.6+rnd()*3.1,fs=0.62+rnd()*0.58;
            var fx=Math.cos(ang)*rad,fz=Math.sin(ang)*rad,fh=0.23+rnd()*0.08;
            fd.position.set(fx,fh+0.10,fz);fd.rotation.set(0,rnd()*Math.PI*2,0);fd.scale.set(fs,fs*0.44,fs);fd.updateMatrix();flowers.setMatrixAt(fi,fd.matrix);
            sd.position.set(fx,fh*0.52+0.11,fz);sd.scale.set(1,fh/0.22,1);sd.updateMatrix();stems.setMatrixAt(fi,sd.matrix);
        }
        flowers.castShadow=true;cityGroup.add(stems);cityGroup.add(flowers);
    }
    var shrubCount=high?56:24,shrubMat=softPBR(0x4E8D43,{roughness:0.88,envMapIntensity:0.20}),shrubs=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.48,1),shrubMat,shrubCount),hd=new THREE.Object3D();
    for(var shi=0;shi<shrubCount;shi++){
        var ss=Math.floor(rnd()*4),sa=ss*Math.PI/2+0.25+rnd()*(Math.PI/2-0.50),sr=13.0+rnd()*3.0,sc=0.62+rnd()*0.72;
        hd.position.set(Math.cos(sa)*sr,0.43,Math.sin(sa)*sr);hd.rotation.set(0,rnd()*Math.PI*2,0);hd.scale.set(sc,0.78*sc,sc);hd.updateMatrix();shrubs.setMatrixAt(shi,hd.matrix);
    }
    shrubs.castShadow=true;shrubs.receiveShadow=true;cityGroup.add(shrubs);

    // Art-directed trees and lamps make the central view intentional; random city flora
    // remains outside this ring. Everything is instanced to keep the mobile draw budget low.
    var treePos=[[-16,-13],[16,-13],[-19,10],[19,10],[-11,-20],[11,-20],[-23,-2],[23,-2]];
    if(!high)treePos=treePos.slice(0,4);
    var trunkMat=_visualSurfaceMaterial('bark',0x6C4933,{roughness:0.94,normalScale:new THREE.Vector2(0.45,0.45)});
    var crownMat=softPBR(0x357A3C,{roughness:0.84,clearcoat:0.05,envMapIntensity:0.24});
    var trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25,0.42,3.4,12),trunkMat,treePos.length),crowns=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.38,2),crownMat,treePos.length*4),td=new THREE.Object3D(),cn=0;
    treePos.forEach(function(tp,ti){
        cityColliders.push({x:tp[0],z:tp[1],hw:0.48,hd:0.48,h:3.4});
        td.position.set(tp[0],1.70,tp[1]);td.rotation.set(0,ti*0.47,0);td.scale.set(1,1,1);td.updateMatrix();trunks.setMatrixAt(ti,td.matrix);
        for(var l=0;l<4;l++){
            var la=l/4*Math.PI*2+ti*0.61,lr=l===0?0:1.02;
            td.position.set(tp[0]+Math.cos(la)*lr,4.25+(l%2)*0.62,tp[1]+Math.sin(la)*lr);td.rotation.set(0,la,0);td.scale.set(l===0?1.25:0.92,l===0?0.94:0.76,l===0?1.18:0.92);td.updateMatrix();crowns.setMatrixAt(cn++,td.matrix);
        }
    });
    trunks.castShadow=trunks.receiveShadow=crowns.castShadow=true;cityGroup.add(trunks);cityGroup.add(crowns);

    var lampCount=8,poleMat=softPBR(0x2B2A29,{roughness:0.34,metalness:0.62}),bulbMat=new THREE.MeshBasicMaterial({color:0xFFD38A}),poles=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.055,0.11,4.55,10),poleMat,lampCount),bulbs=new THREE.InstancedMesh(new THREE.SphereGeometry(0.22,12,8),bulbMat,lampCount);
    for(var li=0;li<lampCount;li++){
        var lang=li/lampCount*Math.PI*2+Math.PI/8,lr=18.4;
        td.position.set(Math.cos(lang)*lr,2.28,Math.sin(lang)*lr);td.scale.set(1,1,1);td.updateMatrix();poles.setMatrixAt(li,td.matrix);
        td.position.set(Math.cos(lang)*lr,4.65,Math.sin(lang)*lr);td.scale.set(1,1.35,1);td.updateMatrix();bulbs.setMatrixAt(li,td.matrix);
    }
    poles.castShadow=true;cityGroup.add(poles);cityGroup.add(bulbs);
}

function buildCity() {
    var st=CITY_STYLES[currentCityStyle];
    var cityLayout=_getCityLayout(currentCityStyle);
    var cityGroundMode=cityLayout.ground||(currentCityStyle===5?'moon':(currentCityStyle===7?'snowIsland':'plain'));
    // Ground
    if(cityGroundMode==='moon'){
        // Moon: large flat ground plane
        var moonGroundGeo=new THREE.PlaneGeometry(MOON_CITY_SIZE*2,MOON_CITY_SIZE*2,16,16);
        if(typeof _visualScaleUVToMeters==='function')_visualScaleUVToMeters(moonGroundGeo,MOON_CITY_SIZE*2,MOON_CITY_SIZE*2,_cityPBRProfile(5).groundTile);
        var moonGround=new THREE.Mesh(moonGroundGeo,_citySurfaceMaterial('ground',st.ground,{roughness:0.96,bumpScale:0.16,envMapIntensity:0.18}));
        moonGround.rotation.x=-Math.PI/2;moonGround.receiveShadow=true;
        moonGround.name='moon-pbr-regolith-ground';
        cityGroup.add(moonGround);
        // Subtle surface detail — darker patches on flat ground
        var _moonPatchMat=_citySurfaceMaterial('ground',0x666677,{roughness:0.98,bumpScale:0.20,envMapIntensity:0.10});
        for(var pi=0;pi<15;pi++){
            var ppx=(Math.random()-0.5)*MOON_CITY_SIZE*1.6;
            var ppz=(Math.random()-0.5)*MOON_CITY_SIZE*1.6;
            var pr=8+Math.random()*16;
            var patch=new THREE.Mesh(new THREE.CircleGeometry(pr,window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.high?32:16),_moonPatchMat);
            patch.rotation.x=-Math.PI/2;
            patch.position.set(ppx,0.02,ppz);
            patch.receiveShadow=true;patch.name='moon-regolith-crater-patch';
            cityGroup.add(patch);
        }
    } else if(cityGroundMode==='snowIsland'){
    // Snow Village: irregular island rising from dark lake
    var _snowGR=CITY_SIZE*0.8; // island radius ~128
    var _islandY=3; // island surface height
    // Irregular island base (bumpy edges using multiple overlapping cylinders)
    var _iBaseM=_citySurfaceMaterial('foundation',0x887766,{roughness:0.96,bumpScale:0.14,envMapIntensity:0.10});
    var snowGround=new THREE.Mesh(new THREE.CylinderGeometry(_snowGR,_snowGR+8,_islandY+1,12),_iBaseM);
    snowGround.position.y=_islandY/2-0.5;snowGround.castShadow=true;cityGroup.add(snowGround);
    // Extra bumps for irregular coastline
    for(var _ib=0;_ib<8;_ib++){
        var _ibA=_ib/8*Math.PI*2+Math.random()*0.5;
        var _ibR=_snowGR*0.7+Math.random()*_snowGR*0.35;
        var _ibS=15+Math.random()*25;
        var bump=new THREE.Mesh(new THREE.CylinderGeometry(_ibS,_ibS+5,_islandY+1,8),_iBaseM);
        bump.position.set(Math.sin(_ibA)*_ibR,_islandY/2-0.5,Math.cos(_ibA)*_ibR);
        cityGroup.add(bump);
    }
    // Snow surface (slightly irregular with patches)
    var _snowSurfaceMat=_citySurfaceMaterial('ground',0xDCE7F4,{roughness:0.66,bumpScale:0.055,clearcoat:0.08,clearcoatRoughness:0.72,envMapIntensity:0.34});
    var snowSurface=new THREE.Mesh(new THREE.CylinderGeometry(_snowGR-2,_snowGR,0.3,window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.high?32:16),_snowSurfaceMat);
    snowSurface.position.y=_islandY+0.05;cityGroup.add(snowSurface);
    // Snow bumps on top for each coastline bump
    for(var _ib2=0;_ib2<8;_ib2++){
        var _ibA2=_ib2/8*Math.PI*2+Math.random()*0.5;
        var _ibR2=_snowGR*0.7+Math.random()*_snowGR*0.35;
        var _ibS2=14+Math.random()*24;
        var sbump=new THREE.Mesh(new THREE.CylinderGeometry(_ibS2-1,_ibS2,0.2,12),_snowSurfaceMat);
        sbump.position.set(Math.sin(_ibA2)*_ibR2,_islandY+0.05,Math.cos(_ibA2)*_ibR2);
        cityGroup.add(sbump);
    }
    // Earthy ground patches (Shirakawa-go style — brown soil showing through snow)
    for(var _dp=0;_dp<25;_dp++){
        var _dpA=Math.random()*Math.PI*2;
        var _dpR=Math.random()*(_snowGR-15);
        var _dpSize=4+Math.random()*8;
        var patch=new THREE.Mesh(new THREE.CylinderGeometry(_dpSize,_dpSize+1,0.06,8),
            _citySurfaceMaterial('foundation',[0x8899AA,0x778899,0x99AABB,0x667788][_dp%4],{roughness:0.96,bumpScale:0.10}));
        patch.position.set(Math.sin(_dpA)*_dpR,_islandY+0.08,Math.cos(_dpA)*_dpR);
        cityGroup.add(patch);
    }
    // Dirt paths on island
    var _pathM7=_citySurfaceMaterial('path',0xAA9977,{roughness:0.90,bumpScale:0.09}); // warm amber path (street light glow)
    [{w:3,d:200,x:0,z:0},{w:150,d:3,x:0,z:0},{w:100,d:2.5,x:0,z:-40},{w:100,d:2.5,x:0,z:40}].forEach(function(p7){
        var path7=new THREE.Mesh(new THREE.BoxGeometry(p7.w,0.06,p7.d),_pathM7);
        path7.position.set(p7.x,_islandY+0.04,p7.z);cityGroup.add(path7);
    });
    } else {
    const groundGeo = new THREE.PlaneGeometry(CITY_SIZE*2, CITY_SIZE*2, 32, 32);
    if(typeof _visualScaleUVToMeters==='function')_visualScaleUVToMeters(groundGeo,CITY_SIZE*2,CITY_SIZE*2,_cityPBRProfile(currentCityStyle).groundTile);
    const groundMat=_citySurfaceMaterial('ground',st.ground,{roughness:currentCityStyle===4?0.52:(currentCityStyle===2?0.70:0.96),bumpScale:currentCityStyle===3?0.18:0.11,envMapIntensity:currentCityStyle===4?0.38:0.20});
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI/2; ground.receiveShadow = true;
    cityGroup.add(ground);
    }

    if(currentCityStyle===0)_buildHopeCinematicPlaza();

    // Paths — data is now editable in js/cities/common-layout.js or each city file.
    var cityPathList=_getCityPaths(currentCityStyle);
    if(cityPathList&&cityPathList.length){
    const pathM = _citySurfaceMaterial('path',st.path,{roughness:currentCityStyle===2?0.42:0.86,bumpScale:0.08,envMapIntensity:currentCityStyle===2?0.42:0.24});
    cityPathList.forEach((p,pathIndex)=>{
        var pathGeo=typeof _visualRoundedRectGeometry==='function'?_visualRoundedRectGeometry(p.w,p.d,Math.min(1.6,Math.min(p.w,p.d)*0.22)):new THREE.BoxGeometry(p.w,0.06,p.d);
        const path=new THREE.Mesh(pathGeo,pathM);
        if(typeof _visualRoundedRectGeometry==='function'){path.rotation.x=-Math.PI/2;path.position.set(p.x,0.068,p.z);}
        else path.position.set(p.x,0.03,p.z);
        path.name='danbo-editor-path-'+pathIndex;
        path.userData.editorPathIndex=pathIndex;
        path.receiveShadow=true; cityGroup.add(path);
    });
    }
    // Sakura City: 銀山温泉 — high terrain + deep gorge + ryokan facing river
    if(currentCityStyle===6){
    var _sPathM=_citySurfaceMaterial('path',0xAA9977,{roughness:0.86,bumpScale:0.10});
    var _cliffM=_citySurfaceMaterial('foundation',0x665544,{roughness:0.98,bumpScale:0.20});
    var _grassM=_citySurfaceMaterial('ground',0x88AA66,{roughness:0.95,bumpScale:0.12});
    var _pH=8; // plateau height
    // === Left plateau ===
    var _leftPlat=new THREE.Mesh(new THREE.BoxGeometry(120,_pH,280),_cliffM);
    _leftPlat.position.set(-68,_pH/2,0);_leftPlat.castShadow=true;cityGroup.add(_leftPlat);
    var _leftGrass=new THREE.Mesh(new THREE.BoxGeometry(120,0.3,280),_grassM);
    _leftGrass.position.set(-68,_pH-0.05,0);cityGroup.add(_leftGrass);
    cityColliders.push({x:-68,z:0,hw:60,hd:140,h:_pH});
    // === Right plateau ===
    var _rightPlat=new THREE.Mesh(new THREE.BoxGeometry(120,_pH,280),_cliffM);
    _rightPlat.position.set(68,_pH/2,0);_rightPlat.castShadow=true;cityGroup.add(_rightPlat);
    var _rightGrass=new THREE.Mesh(new THREE.BoxGeometry(120,0.3,280),_grassM);
    _rightGrass.position.set(68,_pH-0.05,0);cityGroup.add(_rightGrass);
    cityColliders.push({x:68,z:0,hw:60,hd:140,h:_pH});
    // === Paths on plateaus ===
    // Paths between trees and ryokan
    var _lpth=new THREE.Mesh(new THREE.BoxGeometry(8,0.06,240),_sPathM);
    _lpth.position.set(-22,_pH+0.03,0);cityGroup.add(_lpth);
    var _rpth=new THREE.Mesh(new THREE.BoxGeometry(8,0.06,240),_sPathM);
    _rpth.position.set(22,_pH+0.03,0);cityGroup.add(_rpth);
    // === Background mountains ===
    var _hillM=_citySurfaceMaterial('ground',0x447744,{roughness:0.98,bumpScale:0.16});
    [[-90,0,-60,30,40],[-110,0,50,35,45],[90,0,-50,32,42],[100,0,60,28,35]].forEach(function(hp){
        var hill=new THREE.Mesh(new THREE.ConeGeometry(hp[3],hp[4],6),_hillM);
        hill.position.set(hp[0],hp[4]/2,hp[2]);cityGroup.add(hill);
    });
    }

    // ---- Buildings (not on moon) — organized blocks along streets ----
    if(currentCityStyle!==5){
    const bColors = st.bColors;
    const buildings = _getCityBuildings(currentCityStyle) || [];
    buildings.forEach((b,i)=>{
        // Sakura/Snow: skip ALL default buildings — custom layout built below
        if(currentCityStyle===6||currentCityStyle===7)return;
        const col = bColors[i%bColors.length];
        var _hopeFacadeColor=currentCityStyle===0?_cityMixHex(col,0xF7E7D2,0.10):col;
        const bodyMat=_citySurfaceMaterial('facade',_hopeFacadeColor,{roughness:currentCityStyle===4?0.56:0.84,bumpScale:currentCityStyle===3?0.065:0.026,envMapIntensity:currentCityStyle===4?0.34:0.20,vertexColors:true});
        var useRoundedBody=typeof _visualRoundedBoxGeometry==='function'&&!(window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.low);
        var _bodyGeo=useRoundedBody?_visualRoundedBoxGeometry(b.w,b.h,b.d,0.34):new THREE.BoxGeometry(b.w,b.h,b.d,2,2,2);
        if(typeof _visualBoxWorldUV==='function')_visualBoxWorldUV(_bodyGeo,currentCityStyle===1?2.4:(currentCityStyle===4?1.8:3.0));
        if(typeof _visualAddVerticalDirtVertexColors==='function')_visualAddVerticalDirtVertexColors(_bodyGeo,currentCityStyle===3?0.26:0.18);
        const bm = new THREE.Mesh(_bodyGeo, bodyMat);
        bm.name='city-'+currentCityStyle+'-pbr-building-body';
        bm.position.set(b.x, b.h/2, b.z); bm.castShadow=true; bm.receiveShadow=true;
        cityGroup.add(bm);
        const bMeshes = [bm]; // collect all meshes for this building
        if(typeof _visualRoundedBoxGeometry==='function'){
            var _baseMat=_citySurfaceMaterial('foundation',_cityMixHex(col,currentCityStyle===3?0x3A2724:0xD8D0C4,currentCityStyle===3?0.48:0.72),{roughness:0.88,normalScale:new THREE.Vector2(0.30,0.30),bumpScale:0.055});
            var _baseGeo=_visualRoundedBoxGeometry(b.w+0.52,0.48,b.d+0.52,0.18);
            var _foundation=new THREE.Mesh(_baseGeo,_baseMat);_foundation.position.set(b.x,0.24,b.z);_foundation.castShadow=true;_foundation.receiveShadow=true;cityGroup.add(_foundation);bMeshes.push(_foundation);
            var _corniceColor=_cityMixHex(col,0xFFF7EA,0.62);
            var _corniceMat=_citySharedPBR('cornice-'+currentCityStyle,_corniceColor,{roughness:currentCityStyle===4?0.44:0.72,clearcoat:currentCityStyle===4?0.18:0,clearcoatRoughness:0.56,envMapIntensity:currentCityStyle===4?0.36:0.18});
            var _cornice=new THREE.Mesh(_visualRoundedBoxGeometry(b.w+0.38,0.30,b.d+0.38,0.12),_corniceMat);
            _cornice.position.set(b.x,b.h-0.15,b.z);_cornice.castShadow=true;cityGroup.add(_cornice);bMeshes.push(_cornice);
        }
        // Roof — Japanese style for Sakura City
        if(currentCityStyle===6){
            // 和式屋根: wide flat overhanging roof (box wider than building)
            var _jrW=b.w*1.4,_jrD=b.d*1.4,_jrH=0.4;
            var jRoof=new THREE.Mesh(new THREE.BoxGeometry(_jrW,_jrH,_jrD),toon(0x333333));
            jRoof.position.set(b.x,b.h+_jrH/2,b.z);jRoof.castShadow=true;cityGroup.add(jRoof);bMeshes.push(jRoof);
            // Slight upward curve at edges (second thinner layer)
            var jRoof2=new THREE.Mesh(new THREE.BoxGeometry(_jrW+1,0.15,_jrD+1),toon(0x444444));
            jRoof2.position.set(b.x,b.h+_jrH+0.08,b.z);cityGroup.add(jRoof2);bMeshes.push(jRoof2);
            // Ridge beam on top
            var jRidge=new THREE.Mesh(new THREE.BoxGeometry(_jrW*0.8,0.2,0.2),toon(0x222222));
            jRidge.position.set(b.x,b.h+_jrH+0.25,b.z);cityGroup.add(jRidge);bMeshes.push(jRidge);
            // Engawa (wooden porch around base)
            var engawa=new THREE.Mesh(new THREE.BoxGeometry(b.w+1.5,0.15,b.d+1.5),toon(0xBB9966));
            engawa.position.set(b.x,0.08,b.z);cityGroup.add(engawa);bMeshes.push(engawa);
        } else if(currentCityStyle===0&&typeof _visualGableRoofGeometry==='function'){
        var _hopeRoofPalette=[0xA94C35,0xB96343,0x8E5143,0xC06B45,0x955746];
        var _hopeRoofColor=_cityMixHex(st.roof,_hopeRoofPalette[i%_hopeRoofPalette.length],0.44);
        var roofMat=(currentCityStyle===0&&typeof _visualSurfaceMaterial==='function')?_visualSurfaceMaterial('roof',_hopeRoofColor,{roughness:0.60,envMapIntensity:0.42}):toon(st.roof);
        var _roofW=b.w+1.45,_roofD=b.d+1.45,_roofH=BUILDING_CONFIG.roofHeight;
        var _roofTurn=i%3===1;
        const roof = new THREE.Mesh(_roofTurn?_visualGableRoofGeometry(_roofD,_roofW,_roofH):_visualGableRoofGeometry(_roofW,_roofD,_roofH),roofMat);
        roof.name='hope-gable-roof-'+(_roofTurn?'cross':'longitudinal');
        roof.position.set(b.x,b.h,b.z);roof.castShadow=true;roof.receiveShadow=true;
        if(_roofTurn)roof.rotation.y=Math.PI/2;
        cityGroup.add(roof); bMeshes.push(roof);
        var _ridgeMat=_citySharedPBR('roof-ridge-'+(i%5),_cityMixHex(_hopeRoofColor,0x33251F,0.28),{roughness:0.66,clearcoat:0.06,clearcoatRoughness:0.68});
        var _ridge=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.14,(_roofTurn?_roofW:_roofD)+0.12,12),_ridgeMat);
        _ridge.position.set(b.x,b.h+_roofH+0.05,b.z);
        if(_roofTurn)_ridge.rotation.z=Math.PI/2;else _ridge.rotation.x=Math.PI/2;
        _ridge.castShadow=true;cityGroup.add(_ridge);bMeshes.push(_ridge);
        [-1,1].forEach(function(side){
            var _eave=new THREE.Mesh(_roofTurn?_visualRoundedBoxGeometry(_roofW+0.10,0.22,0.22,0.06):_visualRoundedBoxGeometry(0.22,0.22,_roofD+0.10,0.06),_corniceMat);
            _eave.position.set(_roofTurn?b.x:b.x+side*_roofW/2,b.h+0.05,_roofTurn?b.z+side*_roofD/2:b.z);
            _eave.castShadow=true;cityGroup.add(_eave);bMeshes.push(_eave);
        });
        } else {
        var roofMat=_citySurfaceMaterial('roof',st.roof,{roughness:currentCityStyle===4?0.40:(currentCityStyle===2?0.48:0.68),bumpScale:0.10,clearcoat:currentCityStyle===4?0.28:0.05,clearcoatRoughness:0.42,envMapIntensity:currentCityStyle===4?0.48:0.30});
        const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(b.w,b.d)*BUILDING_CONFIG.roofHeightMul, BUILDING_CONFIG.roofHeight, 4), roofMat);
        roof.position.set(b.x, b.h+BUILDING_CONFIG.roofHeight/2, b.z); roof.rotation.y=Math.PI/4; roof.castShadow=true;
        cityGroup.add(roof); bMeshes.push(roof);
        }
        // Windows — warm shouji for Sakura City, blue glass for others
        const winM=_citySharedPBR('window-main-'+currentCityStyle,currentCityStyle===3?0x462C32:(currentCityStyle===4?0xA8DBF5:0x3F8DAA),{pastelAmount:0.02,roughness:0.11,metalness:0.03,clearcoat:0.68,clearcoatRoughness:0.13,ior:1.46,envMapIntensity:0.72,emissive:currentCityStyle===3?0x341008:0x071923,emissiveIntensity:currentCityStyle===3?0.10:0.025});
        var _windowFrameMat=_citySharedPBR('window-frame-'+currentCityStyle,_cityMixHex(col,0xF1ECE3,0.64),{pastelAmount:0.02,roughness:0.72,envMapIntensity:0.16});
        var _warmWindowMat=_citySharedPBR('window-warm-'+currentCityStyle,currentCityStyle===2?0xB9EFFF:0xE9B66D,{pastelAmount:0.01,roughness:0.16,metalness:0.02,clearcoat:0.54,clearcoatRoughness:0.18,envMapIntensity:0.48,emissive:currentCityStyle===2?0x4D91B8:0xD88035,emissiveIntensity:0.22});
        var _hopeLow=window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.low;
        var _patternX=[1.0,1.18,0.88,1.08,1.28][i%5],_patternY=[1.0,1.10,0.92,1.06,1.16][i%5];
        var _winStepY=BUILDING_CONFIG.windowSpacingY*(_hopeLow?1.45:_patternY);
        var _winStepX=BUILDING_CONFIG.windowSpacingX*(_hopeLow?1.35:_patternX);
        var _winGeo=typeof _visualRoundedBoxGeometry==='function'?_visualRoundedBoxGeometry(BUILDING_CONFIG.windowSize.w*0.78,BUILDING_CONFIG.windowSize.h*0.76,BUILDING_CONFIG.windowSize.d,0.065):new THREE.BoxGeometry(BUILDING_CONFIG.windowSize.w,BUILDING_CONFIG.windowSize.h,BUILDING_CONFIG.windowSize.d);
        if(typeof _visualRoundedBoxGeometry==='function'){
            var _frontBackWindows=[],_frontBackWarmWindows=[],_frontBackFrames=[],_frontSills=[],_winDummy=new THREE.Object3D(),_patternIndex=0;
            for(let wy=2;wy<b.h-1;wy+=_winStepY){for(let wx=-b.w/2+1.5;wx<b.w/2-1;wx+=_winStepX){
                if(!_hopeLow){
                    _winDummy.position.set(b.x+wx,wy,b.z+b.d/2+0.07);_winDummy.updateMatrix();_frontBackFrames.push(_winDummy.matrix.clone());
                    _winDummy.position.set(b.x+wx,wy,b.z-b.d/2-0.07);_winDummy.updateMatrix();_frontBackFrames.push(_winDummy.matrix.clone());
                    _winDummy.position.set(b.x+wx,wy-0.56,b.z+b.d/2+0.25);_winDummy.updateMatrix();_frontSills.push(_winDummy.matrix.clone());
                }
                var _isWarm=!_hopeLow&&((i*11+_patternIndex*5)%13<2);
                _winDummy.position.set(b.x+wx,wy,b.z+b.d/2+0.17);_winDummy.updateMatrix();(_isWarm?_frontBackWarmWindows:_frontBackWindows).push(_winDummy.matrix.clone());
                _winDummy.position.set(b.x+wx,wy,b.z-b.d/2-0.17);_winDummy.updateMatrix();((!_isWarm&&((i+_patternIndex)%5===0))?_frontBackWarmWindows:_frontBackWindows).push(_winDummy.matrix.clone());
                _patternIndex++;
            }}
            if(_frontBackFrames.length){
                var _frameGeo=_visualRoundedBoxGeometry(BUILDING_CONFIG.windowSize.w*1.14,BUILDING_CONFIG.windowSize.h*1.10,BUILDING_CONFIG.windowSize.d*1.42,0.09);
                var _frameInstances=new THREE.InstancedMesh(_frameGeo,_windowFrameMat,_frontBackFrames.length);
                for(var _fbi=0;_fbi<_frontBackFrames.length;_fbi++)_frameInstances.setMatrixAt(_fbi,_frontBackFrames[_fbi]);
                _frameInstances.instanceMatrix.needsUpdate=true;
                _frameInstances.castShadow=true;cityGroup.add(_frameInstances);bMeshes.push(_frameInstances);
            }
            if(_frontSills.length){
                var _sillGeo=_visualRoundedBoxGeometry(BUILDING_CONFIG.windowSize.w*1.24,0.12,0.34,0.045);
                var _sillInstances=new THREE.InstancedMesh(_sillGeo,_windowFrameMat,_frontSills.length);
                for(var _fsi=0;_fsi<_frontSills.length;_fsi++)_sillInstances.setMatrixAt(_fsi,_frontSills[_fsi]);
                _sillInstances.instanceMatrix.needsUpdate=true;_sillInstances.castShadow=true;cityGroup.add(_sillInstances);bMeshes.push(_sillInstances);
            }
            if(_frontBackWindows.length){
                var _windowInstances=new THREE.InstancedMesh(_winGeo,winM,_frontBackWindows.length);
                for(var _wii=0;_wii<_frontBackWindows.length;_wii++)_windowInstances.setMatrixAt(_wii,_frontBackWindows[_wii]);
                _windowInstances.instanceMatrix.needsUpdate=true;
                cityGroup.add(_windowInstances);bMeshes.push(_windowInstances);
            }
            if(_frontBackWarmWindows.length){
                var _warmWindowInstances=new THREE.InstancedMesh(_winGeo,_warmWindowMat,_frontBackWarmWindows.length);
                _warmWindowInstances.name='hope-warm-window-panes';
                for(var _wwi=0;_wwi<_frontBackWarmWindows.length;_wwi++)_warmWindowInstances.setMatrixAt(_wwi,_frontBackWarmWindows[_wwi]);
                _warmWindowInstances.instanceMatrix.needsUpdate=true;cityGroup.add(_warmWindowInstances);bMeshes.push(_warmWindowInstances);
            }
        }else{
            for(let wy=2;wy<b.h-1;wy+=_winStepY){for(let wx=-b.w/2+1.5;wx<b.w/2-1;wx+=_winStepX){
                const win=new THREE.Mesh(_winGeo,winM);win.position.set(b.x+wx,wy,b.z+b.d/2+0.05);cityGroup.add(win);bMeshes.push(win);
                const win2=new THREE.Mesh(_winGeo,winM);win2.position.set(b.x+wx,wy,b.z-b.d/2-0.05);cityGroup.add(win2);bMeshes.push(win2);
            }}
        }
        // Door
        var doorMat=_citySurfaceMaterial(currentCityStyle===5?'metal':'wood',currentCityStyle===4?0xC66B91:0x885533,{roughness:currentCityStyle===4?0.48:0.86,bumpScale:0.06,envMapIntensity:0.20});
        if(typeof _visualRoundedBoxGeometry==='function'){
            var _doorFrame=new THREE.Mesh(_visualRoundedBoxGeometry(BUILDING_CONFIG.doorSize.w+0.42,BUILDING_CONFIG.doorSize.h+0.38,BUILDING_CONFIG.doorSize.d*1.65,0.22),_windowFrameMat);
            _doorFrame.position.set(b.x,(BUILDING_CONFIG.doorSize.h+0.38)/2,b.z+b.d/2+0.08);_doorFrame.castShadow=true;cityGroup.add(_doorFrame);bMeshes.push(_doorFrame);
        }
        const door=new THREE.Mesh(typeof _visualRoundedBoxGeometry==='function'?_visualRoundedBoxGeometry(BUILDING_CONFIG.doorSize.w,BUILDING_CONFIG.doorSize.h,BUILDING_CONFIG.doorSize.d,0.18):new THREE.BoxGeometry(BUILDING_CONFIG.doorSize.w,BUILDING_CONFIG.doorSize.h,BUILDING_CONFIG.doorSize.d), doorMat);
        door.position.set(b.x, BUILDING_CONFIG.doorSize.h/2, b.z+b.d/2+(typeof _visualRoundedBoxGeometry==='function'?0.19:0.07)); cityGroup.add(door); bMeshes.push(door);

        if(currentCityStyle===0)_decorateHopePremiumBuilding(b,bMeshes,col,i);
        else _decorateDefaultBuilding(b,bMeshes,col,st,i);

        cityColliders.push({x:b.x, z:b.z, hw:b.w/2+(useRoundedBody?0.85:0.5), hd:b.d/2+(useRoundedBody?1.05:0.5), h:b.h, roofR:Math.max(b.w,b.d)*BUILDING_CONFIG.roofHeightMul, roofH:BUILDING_CONFIG.roofHeight});
        for(var _ebi=0;_ebi<bMeshes.length;_ebi++){
            if(bMeshes[_ebi]&&bMeshes[_ebi].userData)bMeshes[_ebi].userData.editorBuildingIndex=i;
        }
        cityBuildingMeshes.push({meshes:bMeshes, x:b.x, z:b.z, hw:b.w/2, hd:b.d/2, h:b.h});
    });

    // ---- Trees ----
    var cityFlora=_getCityFlora(currentCityStyle);
    var _treeCount=(cityFlora&&cityFlora.treeCount!==undefined)?cityFlora.treeCount:((cityLayout&&cityLayout.treeCount!==undefined)?cityLayout.treeCount:(currentCityStyle===6?40:80)); // sakura: fewer random trees (river trees are separate)
    for(let i=0;i<_treeCount;i++){
        var tx,tz;
        if(currentCityStyle===6){
            // Sakura: background trees on outer plateau, away from path and buildings
            var _onLeft=Math.random()<0.5;
            tx=_onLeft?(-50-Math.random()*60):(50+Math.random()*60);
            tz=(Math.random()-0.5)*220;
        } else {
            tx=-CITY_SIZE+Math.random()*CITY_SIZE*2;tz=-CITY_SIZE+Math.random()*CITY_SIZE*2;
        }
        let skip=false;
        for(const c of cityColliders){
            if(c.hw>50)continue; // skip huge terrain colliders for tree placement
            if(DANBO_WASM.aabb2D(tx,tz,c.x,c.z,c.hw,c.hd,2)) skip=true;
        }
        if(currentCityStyle===0&&Math.hypot(tx,tz)<25)skip=true;
        if(DANBO_WASM.absDeltaLess(tx,0,10)&&currentCityStyle===6) skip=true; // avoid canyon
        else if(DANBO_WASM.aabb2D(tx,tz,0,0,4,4,0)) skip=true;
        if(skip) continue;
        const tg=new THREE.Group(); tg.position.set(tx,currentCityStyle===6?8:0,tz);
        if(currentCityStyle===6){
            // 大樱花树 — tall trunk, wide pink crown, weeping branches (垂樱)
            var _sakH=10+Math.random()*4; // tall trunk (above TPS camera)
            var _sakR=3+Math.random()*2; // crown radius 3-5
            var sakTrunk=new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.4,_sakH,8),toon(0x6B4226));
            sakTrunk.position.y=_sakH/2;sakTrunk.castShadow=true;tg.add(sakTrunk);
            // Main branches (2 angled trunks)
            for(var _bri2=0;_bri2<2;_bri2++){
                var _brA=_bri2*Math.PI+Math.random()*0.5;
                var branch=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.15,_sakH*0.5,4),toon(0x6B4226));
                branch.position.set(Math.cos(_brA)*0.3,_sakH*0.7,Math.sin(_brA)*0.3);
                branch.rotation.z=Math.cos(_brA)*0.5;branch.rotation.x=-Math.sin(_brA)*0.5;
                tg.add(branch);
            }
            // Large pink crown (2 overlapping spheres)
            var _petalColors=[0xFFAABB,0xFFBBCC,0xFFCCDD,0xFF99AA,0xFFDDEE];
            for(var _sci2=0;_sci2<3;_sci2++){
                var _scOff=_sci2*(Math.PI*2/3);
                var _scr=_sakR*(0.7+Math.random()*0.3);
                var sakC=new THREE.Mesh(new THREE.SphereGeometry(_scr,8,6),toon(_petalColors[_sci2%5],{transparent:true,opacity:0.85}));
                sakC.position.set(Math.cos(_scOff)*_sakR*0.3,_sakH+_sakR*0.4+Math.random(),Math.sin(_scOff)*_sakR*0.3);
                sakC.scale.y=0.6;sakC.castShadow=true;tg.add(sakC);
            }
            // 垂樱 Weeping branches — angled cylinders with petal tips
            for(var _wbi=0;_wbi<5;_wbi++){
                var _wbAngle=_wbi*(Math.PI*2/5)+Math.random()*0.5;
                var _wbLen=_sakR*1.2;
                var _wbMesh=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.05,_wbLen,3),toon(0x6B4226));
                _wbMesh.position.set(Math.cos(_wbAngle)*_wbLen*0.4,_sakH-_wbLen*0.3,Math.sin(_wbAngle)*_wbLen*0.4);
                _wbMesh.rotation.z=Math.cos(_wbAngle)*1.0;_wbMesh.rotation.x=-Math.sin(_wbAngle)*1.0;
                tg.add(_wbMesh);
                // Pink petal ball at tip
                var _wpc=new THREE.Mesh(new THREE.SphereGeometry(0.5,4,3),toon(_petalColors[_wbi%5],{transparent:true,opacity:0.8}));
                _wpc.position.set(Math.cos(_wbAngle)*_wbLen*0.7,_sakH-_wbLen*0.6,Math.sin(_wbAngle)*_wbLen*0.7);
                tg.add(_wpc);
            }
        } else {
        var _hopeTree=true;
        var _treeHigh=window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.high;
        var _treeSeg=_treeHigh?16:8;
        var _trunkH=3.25;
        var _trunkMat=_citySurfaceMaterial('wood',currentCityStyle===2?0x697A78:0x765039,{roughness:0.94,bumpScale:0.13,envMapIntensity:0.12});
        const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.27,0.43,_trunkH,_treeSeg),_trunkMat);
        trunk.position.y=_trunkH/2; trunk.castShadow=true; trunk.receiveShadow=true;tg.add(trunk);
        if(_treeHigh){
            for(var _hbi=0;_hbi<3;_hbi++){
                var _hba=_hbi/3*Math.PI*2+i*0.37;
                var _branch=new THREE.Mesh(new THREE.CylinderGeometry(0.075,0.14,1.95,8),_trunkMat);
                _branch.position.set(Math.cos(_hba)*0.38,_trunkH*0.82,Math.sin(_hba)*0.38);
                _branch.rotation.z=Math.cos(_hba)*0.68;_branch.rotation.x=-Math.sin(_hba)*0.68;_branch.castShadow=true;tg.add(_branch);
            }
        }
        var _leafColor=_cityMixHex(st.tree,currentCityStyle===4?0xFFB6D0:0x315C32,currentCityStyle===4?0.10:0.18);
        var _crownMat=softPBR(_leafColor,{roughness:currentCityStyle===2?0.68:0.86,clearcoat:currentCityStyle===2?0.12:0.05,clearcoatRoughness:0.80,envMapIntensity:currentCityStyle===2?0.32:0.20});
        var _crownLightMat=_citySharedPBR('tree-sunlit-'+currentCityStyle,_cityMixHex(_leafColor,currentCityStyle===4?0xFFD4E3:0x83B862,0.22),{roughness:0.90,envMapIntensity:0.14});
        var _crownR=2.15;
        var _crownGeo=new THREE.IcosahedronGeometry(_crownR,_treeHigh?2:1);
        if(_treeHigh){
            var _cp=_crownGeo.attributes.position;
            for(var _cvi=0;_cvi<_cp.count;_cvi++){
                var _cx=_cp.getX(_cvi),_cy=_cp.getY(_cvi),_cz=_cp.getZ(_cvi);
                var _cl=Math.sqrt(_cx*_cx+_cy*_cy+_cz*_cz)||1;
                var _warp=1+Math.sin(_cx*2.7+_cz*1.9+i)*0.105+Math.sin(_cy*3.3-_cz*2.1)*0.075;
                _cp.setXYZ(_cvi,_cx/_cl*_crownR*_warp,_cy/_cl*_crownR*_warp,_cz/_cl*_crownR*_warp);
            }
            _crownGeo.computeVertexNormals();
        }
        const crown=new THREE.Mesh(_crownGeo,_crownMat);
        crown.position.y=_trunkH+1.05;crown.scale.set(1.12,0.88,1.05);crown.castShadow=true;crown.receiveShadow=true;tg.add(crown);
        if(_treeHigh){
            for(var _lobe=0;_lobe<3;_lobe++){
                var _la=_lobe/3*Math.PI*2+i*0.71;
                var _lc=new THREE.Mesh(new THREE.IcosahedronGeometry(1.12,1),_lobe===1?_crownLightMat:_crownMat);
                _lc.position.set(Math.cos(_la)*1.68,_trunkH+0.88+(_lobe%2)*0.58,Math.sin(_la)*1.68);_lc.scale.set(1.20,0.80,1.04);_lc.castShadow=true;tg.add(_lc);
            }
        }
        }
        // Four guaranteed size tiers keep nearby trees from reading as duplicated props.
        // The index-based roll distributes saplings and landmarks in every city instead
        // of relying on a random draw that can accidentally produce a uniform grove.
        var _treeSizeRoll=((i*37+currentCityStyle*19)%100)/100;
        var _treeScale,_treeTier;
        if(currentCityStyle===6){
            if(_treeSizeRoll<0.18){_treeTier='sapling';_treeScale=0.66+Math.random()*0.16;}
            else if(_treeSizeRoll<0.42){_treeTier='young';_treeScale=0.84+Math.random()*0.14;}
            else if(_treeSizeRoll<0.80){_treeTier='medium';_treeScale=1.00+Math.random()*0.18;}
            else{_treeTier='landmark';_treeScale=1.22+Math.random()*0.26;}
        }else{
            if(_treeSizeRoll<0.18){_treeTier='sapling';_treeScale=0.50+Math.random()*0.16;}
            else if(_treeSizeRoll<0.42){_treeTier='young';_treeScale=0.72+Math.random()*0.18;}
            else if(_treeSizeRoll<0.80){_treeTier='medium';_treeScale=0.96+Math.random()*0.24;}
            else{_treeTier='landmark';_treeScale=1.32+Math.random()*0.34;}
        }
        // Saplings are slightly slender, while mature trees grow broader crowns.
        var _treeWidthVar=(_treeTier==='sapling'?0.78:(_treeTier==='young'?0.88:(_treeTier==='landmark'?1.04:0.94)))+Math.random()*0.18;
        var _treeDepthVar=(_treeTier==='sapling'?0.82:(_treeTier==='young'?0.90:(_treeTier==='landmark'?1.02:0.94)))+Math.random()*0.16;
        var _treeHeightVar=(_treeTier==='sapling'?0.94:(_treeTier==='young'?0.96:0.98))+Math.random()*0.16;
        tg.scale.set(_treeScale*_treeWidthVar,_treeScale*_treeHeightVar,_treeScale*_treeDepthVar);
        tg.rotation.y=Math.random()*Math.PI*2;
        tg.userData.treeScale=_treeScale;tg.userData.treeSizeTier=_treeTier;
        tg.userData.treeScale3D={x:tg.scale.x,y:tg.scale.y,z:tg.scale.z};
        cityGroup.add(tg);
        cityProps.push({group:tg, x:tx, z:tz, radius:TREE_CONFIG.collisionRadius*_treeScale*Math.max(_treeWidthVar,_treeDepthVar), type:'tree', grabbed:false, origY:tg.position.y, throwVx:0, throwVy:0, throwVz:0, throwTimer:0, weight:TREE_CONFIG.weight});
    }

// ---- Grand Roman Wishing Fountain (Trevi-style) — skip for Sakura City ----
    var _hopeFountainDef=currentCityStyle===0?(_hopeFountainDefinition(true)||_hopeFountainDefaultDefinition()):_hopeFountainDefaultDefinition();
    var _hopeFountainEnabled=!_hopeFountainDef||_hopeFountainDef.enabled!==false;
    if(currentCityStyle!==6&&currentCityStyle!==7){
    var _fountainChildStart=cityGroup.children.length;
    window._fountainDefinition=_hopeFountainDef;
    var _fountainWaterDef=_hopeFountainDef&&_hopeFountainDef.water||{};
    var _fountainJetDef=_hopeFountainDef&&_hopeFountainDef.jets||{};
    var _hopeFountainLow=window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.low;
    var _hopeFountainHigh=window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.high;
    var _fountainStoneTint=currentCityStyle===1?0xC6A878:(currentCityStyle===2?0xC9E5EC:(currentCityStyle===3?0x5B4641:(currentCityStyle===4?0xF2C8D9:0xBDB6A9)));
    var stoneM=_citySurfaceMaterial('foundation',_fountainStoneTint,{roughness:0.80,bumpScale:0.040,envMapIntensity:0.24});
    var stoneD=_citySurfaceMaterial('foundation',_cityMixHex(_fountainStoneTint,0x32343A,0.32),{roughness:0.94,bumpScale:0.050,envMapIntensity:0.12});
    var marbleM=_citySurfaceMaterial('foundation',_cityMixHex(_fountainStoneTint,0xFFFFFF,0.38),{roughness:0.57,bumpScale:0.022,clearcoat:0.08,clearcoatRoughness:0.74,envMapIntensity:0.32});
    var _wetStoneM=_citySurfaceMaterial('foundation',_cityMixHex(_fountainStoneTint,0x263A42,0.44),{roughness:0.48,bumpScale:0.028,clearcoat:0.12,clearcoatRoughness:0.55,envMapIntensity:0.38});
    var _waterSet=typeof _visualSurfaceTextureSet==='function'?_visualSurfaceTextureSet('water'):null;
    if(_waterSet)window._danboWaterBump=_waterSet.bumpMap;
    var _fountainWaterOpacity=Math.max(0.24,Math.min(0.72,Number(_fountainWaterDef.opacity)||0.50));
    var waterM=_hopeFountainLow?new THREE.MeshPhongMaterial({color:currentCityStyle===3?0xA34828:0x4D9EAE,shininess:78,bumpMap:_waterSet&&_waterSet.bumpMap,bumpScale:0.028,transparent:true,opacity:Math.max(0.32,_fountainWaterOpacity),depthWrite:false,side:THREE.DoubleSide}):new THREE.MeshPhysicalMaterial({color:currentCityStyle===3?0xA34828:0x4298AA,roughness:0.085,metalness:0.0,clearcoat:0.82,clearcoatRoughness:0.12,envMapIntensity:0.92,ior:1.333,transmission:0.10,thickness:0.55,bumpMap:_waterSet&&_waterSet.bumpMap,bumpScale:0.038,transparent:true,opacity:_fountainWaterOpacity,depthWrite:false,side:THREE.DoubleSide});
    var goldM=softPBR(currentCityStyle===2?0xA9C9D4:0xB78C3C,{roughness:0.38,metalness:0.42,envMapIntensity:0.68,emissive:currentCityStyle===3?0x401000:0x2B1700,emissiveIntensity:0.018});
    if(currentCityStyle===0){
        // Broad cut-stone terraces replace the former floating donut silhouette.
        [[10.15,9.70,0.18],[9.45,9.05,0.34],[8.75,8.35,0.50]].forEach(function(ti,idx){
            var terrace=new THREE.Mesh(new THREE.CylinderGeometry(ti[0],ti[1],0.22,currentCityStyle===0?96:32),idx===2?stoneM:stoneD);
            terrace.position.y=ti[2];terrace.receiveShadow=true;terrace.castShadow=true;cityGroup.add(terrace);
        });
    }
    // Outer pool — a profiled carved basin instead of a smooth inflated torus.
    var poolOuter;
    if(currentCityStyle===0){
        var _outerBasinProfile=[
            new THREE.Vector2(6.46,0.00),new THREE.Vector2(6.56,0.10),new THREE.Vector2(6.62,0.28),
            new THREE.Vector2(6.76,0.46),new THREE.Vector2(7.02,0.61),new THREE.Vector2(7.31,0.68),
            new THREE.Vector2(7.44,0.82),new THREE.Vector2(7.39,0.96),new THREE.Vector2(7.19,1.05),
            new THREE.Vector2(6.93,1.03),new THREE.Vector2(6.75,0.91),new THREE.Vector2(6.68,0.72)
        ];
        poolOuter=new THREE.Mesh(new THREE.LatheGeometry(_outerBasinProfile,_hopeFountainLow?40:96),stoneM);
        poolOuter.position.y=0.02;
    }else{
        poolOuter=new THREE.Mesh(new THREE.TorusGeometry(7,0.8,8,24),stoneM);
        poolOuter.position.y=0.4;poolOuter.rotation.x=Math.PI/2;
    }
    poolOuter.name=currentCityStyle===0?'hope-fountain-outer-basin':'';poolOuter.castShadow=true;poolOuter.receiveShadow=true;cityGroup.add(poolOuter);
    // Pool floor
    var poolFloor=new THREE.Mesh(new THREE.CylinderGeometry(6.5,6.5,0.15,currentCityStyle===0?40:24),_citySurfaceMaterial('foundation',currentCityStyle===3?0x6F392C:0x6C9FA6,{roughness:0.88,bumpScale:0.045,envMapIntensity:0.10}));
    poolFloor.position.y=0.08;poolFloor.receiveShadow=true;cityGroup.add(poolFloor);
    // Water surface
    var poolWater=new THREE.Mesh(currentCityStyle===0?new THREE.CircleGeometry(6.28,_hopeFountainLow?40:96):new THREE.CylinderGeometry(6.2,6.2,0.2,24),waterM);
    poolWater.name=currentCityStyle===0?'hope-fountain-main-water':'';
    if(currentCityStyle===0){poolWater.rotation.x=-Math.PI/2;poolWater.position.y=0.69;poolWater.userData.baseY=0.69;}
    else poolWater.position.y=0.6;
    poolWater.renderOrder=1;cityGroup.add(poolWater);
    window._fountainPoolWater=poolWater;
    var innerWaterRef=null;
    // Steps around the pool (3 tiers)
    for(var si=0;si<3;si++){
        var stepR=8+si*1.2;var stepH=0.2;
        var step=new THREE.Mesh(new THREE.TorusGeometry(stepR,currentCityStyle===0?0.19:0.5,currentCityStyle===0?10:6,currentCityStyle===0?72:24),si===0?stoneM:stoneD);
        step.position.y=currentCityStyle===0?0.24-si*0.10:0.15-si*0.12;step.rotation.x=Math.PI/2;
        step.castShadow=true;step.receiveShadow=true;cityGroup.add(step);
    }
    // Inner raised basin (second tier)
    var innerRim;
    if(currentCityStyle===0){
        var _innerBasinProfile=[
            new THREE.Vector2(2.92,0.00),new THREE.Vector2(3.04,0.08),new THREE.Vector2(3.10,0.26),
            new THREE.Vector2(3.28,0.42),new THREE.Vector2(3.53,0.50),new THREE.Vector2(3.68,0.62),
            new THREE.Vector2(3.66,0.76),new THREE.Vector2(3.50,0.85),new THREE.Vector2(3.27,0.82),
            new THREE.Vector2(3.12,0.68),new THREE.Vector2(3.05,0.48)
        ];
        innerRim=new THREE.Mesh(new THREE.LatheGeometry(_innerBasinProfile,_hopeFountainLow?32:72),marbleM);
        innerRim.position.y=0.74;
    }else{
        innerRim=new THREE.Mesh(new THREE.TorusGeometry(3.5,0.5,8,16),marbleM);
        innerRim.position.y=1.2;innerRim.rotation.x=Math.PI/2;
    }
    innerRim.name=currentCityStyle===0?'hope-fountain-inner-basin':'';innerRim.castShadow=true;innerRim.receiveShadow=true;cityGroup.add(innerRim);
    var innerFloor=new THREE.Mesh(new THREE.CylinderGeometry(3.2,3.2,0.8,currentCityStyle===0?48:16),stoneM);
    innerFloor.position.y=0.8;innerFloor.receiveShadow=true;cityGroup.add(innerFloor);
    var innerWater=new THREE.Mesh(currentCityStyle===0?new THREE.CircleGeometry(3.04,_hopeFountainLow?32:72):new THREE.CylinderGeometry(3,3,0.15,16),waterM);
    if(currentCityStyle===0){innerWater.rotation.x=-Math.PI/2;innerWater.position.y=1.48;innerWater.userData.baseY=1.48;}
    else innerWater.position.y=1.35;
    innerWater.renderOrder=1;cityGroup.add(innerWater);
    innerWaterRef=innerWater;
    window._fountainInnerWater=innerWater;
    if(currentCityStyle===0){
        // Darkened waterlines make the stone read as porous limestone that has
        // actually been in contact with water, rather than uniformly grey plastic.
        var _outerWetLine=new THREE.Mesh(new THREE.TorusGeometry(6.70,0.055,8,_hopeFountainLow?40:88),_wetStoneM);
        _outerWetLine.rotation.x=Math.PI/2;_outerWetLine.position.y=0.70;_outerWetLine.receiveShadow=true;cityGroup.add(_outerWetLine);
        var _innerWetLine=new THREE.Mesh(new THREE.TorusGeometry(3.10,0.042,8,_hopeFountainLow?32:64),_wetStoneM);
        _innerWetLine.rotation.x=Math.PI/2;_innerWetLine.position.y=1.46;cityGroup.add(_innerWetLine);

        // Vertical masonry joints and a thin carved band break the overly smooth
        // silhouette while remaining one instanced draw call.
        var _jointCount=_hopeFountainLow?16:32;
        var _jointGeo=new THREE.BoxGeometry(0.026,0.22,0.040);
        var _jointMesh=new THREE.InstancedMesh(_jointGeo,stoneD,_jointCount);
        var _jointDummy=new THREE.Object3D();
        for(var _ji=0;_ji<_jointCount;_ji++){
            var _ja=_ji/_jointCount*Math.PI*2;
            _jointDummy.position.set(Math.cos(_ja)*7.39,0.82,Math.sin(_ja)*7.39);
            _jointDummy.rotation.set(0,-_ja,0);_jointDummy.updateMatrix();
            _jointMesh.setMatrixAt(_ji,_jointDummy.matrix);
        }
        _jointMesh.name='hope-fountain-basin-masonry-joints';_jointMesh.castShadow=true;_jointMesh.receiveShadow=true;cityGroup.add(_jointMesh);
        var _carvedBand=new THREE.Mesh(new THREE.TorusGeometry(7.34,0.052,8,_hopeFountainLow?48:96),marbleM);
        _carvedBand.rotation.x=Math.PI/2;_carvedBand.position.y=0.89;_carvedBand.castShadow=true;cityGroup.add(_carvedBand);

        // A restrained procedural reflection layer adds moving sky streaks and
        // fine concentric distortion without turning the water into blue plastic.
        var _waterHighlightCanvas=document.createElement('canvas');_waterHighlightCanvas.width=_waterHighlightCanvas.height=_hopeFountainLow?128:256;
        var _whc=_waterHighlightCanvas.getContext('2d'),_whs=_waterHighlightCanvas.width;
        _whc.clearRect(0,0,_whs,_whs);
        var _whg=_whc.createRadialGradient(_whs*0.46,_whs*0.42,_whs*0.05,_whs*0.5,_whs*0.5,_whs*0.48);
        _whg.addColorStop(0,'rgba(232,252,255,.22)');_whg.addColorStop(.38,'rgba(187,235,244,.08)');_whg.addColorStop(1,'rgba(255,255,255,0)');
        _whc.fillStyle=_whg;_whc.fillRect(0,0,_whs,_whs);
        _whc.strokeStyle='rgba(225,251,255,.28)';_whc.lineWidth=_hopeFountainLow?1:1.35;
        for(var _wsi=0;_wsi<(_hopeFountainLow?9:18);_wsi++){
            var _wsr=_whs*(0.10+_wsi*0.018),_wsa=(_wsi*1.71)%6.28;
            _whc.beginPath();_whc.arc(_whs*.5,_whs*.5,_wsr,_wsa,_wsa+0.65+(_wsi%4)*0.18);_whc.stroke();
        }
        var _waterHighlightTex=new THREE.CanvasTexture(_waterHighlightCanvas);_waterHighlightTex.colorSpace=THREE.SRGBColorSpace;
        window._fountainWaterHighlights=[];
        [[6.18,0.713,0.14],[2.98,1.502,0.12]].forEach(function(_hi,_hii){
            var _hm=new THREE.MeshBasicMaterial({map:_waterHighlightTex,color:0xD9F8FF,transparent:true,opacity:_hi[2],depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false});
            var _hmesh=new THREE.Mesh(new THREE.CircleGeometry(_hi[0],_hopeFountainLow?32:72),_hm);
            _hmesh.rotation.x=-Math.PI/2;_hmesh.position.y=_hi[1];_hmesh.renderOrder=2;_hmesh.userData._phase=_hii*.5;
            cityGroup.add(_hmesh);window._fountainWaterHighlights.push(_hmesh);
        });
    }
    // Central pillar — preserve the original landmark but rebuild its silhouette in high mode.
    if(currentCityStyle===0){
        var _columnProfile=[
            new THREE.Vector2(1.18,0.00),new THREE.Vector2(1.34,0.13),new THREE.Vector2(1.34,0.34),
            new THREE.Vector2(1.04,0.50),new THREE.Vector2(0.78,0.68),new THREE.Vector2(0.62,0.94),
            new THREE.Vector2(0.56,4.58),new THREE.Vector2(0.66,4.86),new THREE.Vector2(0.92,5.04),
            new THREE.Vector2(1.06,5.24),new THREE.Vector2(0.92,5.43)
        ];
        var _column=new THREE.Mesh(new THREE.LatheGeometry(_columnProfile,window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.high?48:24),marbleM);
        _column.name='hope-fountain-sculpted-column';_column.position.y=1.28;_column.castShadow=true;_column.receiveShadow=true;cityGroup.add(_column);
        for(var fi=0;fi<12;fi++){
            var fa=fi/12*Math.PI*2;
            var groove=new THREE.Mesh(new THREE.CylinderGeometry(0.038,0.045,3.56,8),stoneD);
            groove.position.set(Math.cos(fa)*0.585,3.84,Math.sin(fa)*0.585);groove.castShadow=true;cityGroup.add(groove);
        }
        [2.08,5.02].forEach(function(_bandY,_bandIndex){
            var _columnBand=new THREE.Mesh(new THREE.TorusGeometry(_bandIndex?0.69:0.80,_bandIndex?0.055:0.075,10,_hopeFountainLow?28:56),_bandIndex?marbleM:stoneM);
            _columnBand.rotation.x=Math.PI/2;_columnBand.position.y=_bandY;_columnBand.castShadow=true;cityGroup.add(_columnBand);
        });
        var _reliefCount=_hopeFountainLow?4:8;
        for(var _rli=0;_rli<_reliefCount;_rli++){
            var _rla=_rli/_reliefCount*Math.PI*2;
            var _relief=new THREE.Mesh(new THREE.SphereGeometry(0.15,_hopeFountainLow?8:14,_hopeFountainLow?5:8),stoneM);
            _relief.scale.set(1.0,0.76,0.36);_relief.position.set(Math.cos(_rla)*1.16,1.80,Math.sin(_rla)*1.16);
            _relief.lookAt(0,1.80,0);_relief.castShadow=true;cityGroup.add(_relief);
        }
        var _bowlProfile=[new THREE.Vector2(0.30,0),new THREE.Vector2(0.40,0.08),new THREE.Vector2(0.58,0.17),new THREE.Vector2(0.82,0.27),new THREE.Vector2(0.86,0.38),new THREE.Vector2(0.66,0.48),new THREE.Vector2(0.34,0.56)];
        var _topBowl=new THREE.Mesh(new THREE.LatheGeometry(_bowlProfile,40),marbleM);_topBowl.name='hope-fountain-upper-bowl';_topBowl.position.y=6.66;_topBowl.castShadow=true;cityGroup.add(_topBowl);
        var _topWater=new THREE.Mesh(new THREE.CircleGeometry(0.71,_hopeFountainLow?20:40),waterM);
        _topWater.rotation.x=-Math.PI/2;_topWater.position.y=7.10;_topWater.renderOrder=2;cityGroup.add(_topWater);
        // A second sculpted spill tray strengthens the silhouette and gives the
        // falling water a believable stone edge instead of a bare shaft.
        var _spillProfile=[new THREE.Vector2(0.42,0),new THREE.Vector2(0.72,0.10),new THREE.Vector2(1.16,0.20),new THREE.Vector2(1.48,0.30),new THREE.Vector2(1.54,0.42),new THREE.Vector2(1.35,0.52),new THREE.Vector2(0.78,0.59)];
        var _spillBowl=new THREE.Mesh(new THREE.LatheGeometry(_spillProfile,48),marbleM);
        _spillBowl.name='hope-fountain-middle-spill-bowl';_spillBowl.position.y=5.62;_spillBowl.castShadow=true;_spillBowl.receiveShadow=true;cityGroup.add(_spillBowl);
        var _spillWater=new THREE.Mesh(new THREE.CircleGeometry(1.35,_hopeFountainLow?24:56),waterM);
        _spillWater.rotation.x=-Math.PI/2;_spillWater.position.y=6.12;_spillWater.renderOrder=2;cityGroup.add(_spillWater);
        var _spillShadow=new THREE.Mesh(new THREE.TorusGeometry(1.43,0.055,10,56),stoneD);
        _spillShadow.name='hope-fountain-carved-lip';_spillShadow.rotation.x=Math.PI/2;_spillShadow.position.y=5.98;cityGroup.add(_spillShadow);
        var _finialStem=new THREE.Mesh(new THREE.CylinderGeometry(0.26,0.34,0.72,20),marbleM);_finialStem.position.y=7.72;_finialStem.castShadow=true;cityGroup.add(_finialStem);
        var statueHead=new THREE.Mesh(new THREE.SphereGeometry(0.29,20,14),marbleM);statueHead.position.y=8.18;statueHead.castShadow=true;cityGroup.add(statueHead);
        var shell=new THREE.Mesh(new THREE.SphereGeometry(0.48,20,10,0,Math.PI*2,0,Math.PI/2),goldM);shell.position.y=8.36;shell.rotation.x=Math.PI;shell.castShadow=true;cityGroup.add(shell);
        var _finialPearl=new THREE.Mesh(new THREE.SphereGeometry(0.15,_hopeFountainLow?10:18,_hopeFountainLow?7:12),marbleM);
        _finialPearl.position.y=8.66;_finialPearl.castShadow=true;cityGroup.add(_finialPearl);
    }else{
        var colBase=new THREE.Mesh(new THREE.CylinderGeometry(1,1.2,0.6,8),marbleM);
        colBase.position.y=1.6;cityGroup.add(colBase);
        var colShaft=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.55,4,12),marbleM);
        colShaft.position.y=3.9;cityGroup.add(colShaft);
        for(var fi=0;fi<8;fi++){
            var fa=fi/8*Math.PI*2;
            var groove=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,3.6,4),stoneD);
            groove.position.set(Math.cos(fa)*0.52,3.9,Math.sin(fa)*0.52);cityGroup.add(groove);
        }
        var colCap=new THREE.Mesh(new THREE.CylinderGeometry(0.8,0.55,0.5,8),marbleM);
        colCap.position.y=6.1;cityGroup.add(colCap);
        var statueBody=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.5,1.2,8),marbleM);
        statueBody.position.y=7;cityGroup.add(statueBody);
        var statueHead=new THREE.Mesh(new THREE.SphereGeometry(0.3,8,6),marbleM);
        statueHead.position.y=7.8;cityGroup.add(statueHead);
        var shell=new THREE.Mesh(new THREE.SphereGeometry(0.5,8,4,0,Math.PI*2,0,Math.PI/2),goldM);
        shell.position.y=8.2;shell.rotation.x=Math.PI;cityGroup.add(shell);
    }
    if(currentCityStyle===0){
        var _foamMat=new THREE.MeshBasicMaterial({color:0xE7FBFF,transparent:true,opacity:0.28,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
        var _foamOuter=new THREE.Mesh(new THREE.TorusGeometry(6.12,0.065,8,72),_foamMat);_foamOuter.rotation.x=Math.PI/2;_foamOuter.position.y=0.72;cityGroup.add(_foamOuter);
        var _foamInner=new THREE.Mesh(new THREE.TorusGeometry(2.94,0.052,8,56),_foamMat);_foamInner.rotation.x=Math.PI/2;_foamInner.position.y=1.50;cityGroup.add(_foamInner);
        window._fountainRipples=[];
        var _rippleMat=new THREE.MeshBasicMaterial({color:0xDDFBFF,transparent:true,opacity:0.18,depthWrite:false,side:THREE.DoubleSide,blending:THREE.NormalBlending});
        var _rippleCount=window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.low?6:12;
        for(var _rpi=0;_rpi<_rippleCount;_rpi++){
            var _rpa=_rpi/_rippleCount*Math.PI*2,_rr=_rpi%3===0?4.75:2.72;
            var _ripple=new THREE.Mesh(new THREE.TorusGeometry(0.23+(_rpi%2)*0.08,0.018,6,24),_rippleMat.clone());
            _ripple.name='hope-fountain-water-ripple';_ripple.rotation.x=Math.PI/2;
            _ripple.position.set(Math.cos(_rpa)*_rr,_rr>3?0.724:1.512,Math.sin(_rpa)*_rr);
            _ripple.userData._phase=_rpi/_rippleCount;cityGroup.add(_ripple);window._fountainRipples.push(_ripple);
        }
        var _fallMat=new THREE.MeshPhysicalMaterial({color:0xB8F1F6,roughness:0.06,metalness:0,clearcoat:0.72,clearcoatRoughness:0.10,envMapIntensity:0.86,ior:1.333,transmission:_hopeFountainLow?0:0.12,thickness:0.18,transparent:true,opacity:_hopeFountainLow?0.34:0.32,depthWrite:false,side:THREE.DoubleSide,blending:THREE.NormalBlending});
        var _flowHighlightMat=new THREE.MeshBasicMaterial({color:0xE9FDFF,transparent:true,opacity:0.22,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
        var _requestedArcCount=Math.round(Number(_fountainJetDef.count)||8);
        var _arcCount=Math.max(4,Math.min(_hopeFountainLow?6:12,_requestedArcCount));
        var _jetHeight=Math.max(0.55,Math.min(1.55,Number(_fountainJetDef.height)||1));
        var _jetSpread=Math.max(0.68,Math.min(1.32,Number(_fountainJetDef.spread)||1));
        var _mainJetRadius=4.78*_jetSpread;
        var _mainArcCurves=[];
        for(var _wai=0;_wai<_arcCount;_wai++){
            var _waa=_wai/_arcCount*Math.PI*2;
            var _curve=new THREE.QuadraticBezierCurve3(
                new THREE.Vector3(Math.cos(_waa)*0.24,8.54,Math.sin(_waa)*0.24),
                new THREE.Vector3(Math.cos(_waa)*2.45*_jetSpread,8.54+0.84*_jetHeight,Math.sin(_waa)*2.45*_jetSpread),
                new THREE.Vector3(Math.cos(_waa)*_mainJetRadius,0.77,Math.sin(_waa)*_mainJetRadius)
            );
            _mainArcCurves.push(_curve);
            var _arc=new THREE.Mesh(new THREE.TubeGeometry(_curve,_hopeFountainLow?20:36,_hopeFountainLow?0.042:0.038,_hopeFountainLow?6:10,false),_fallMat);_arc.name='hope-fountain-water-arc';_arc.renderOrder=3;cityGroup.add(_arc);
            if(!_hopeFountainLow){
                var _arcHighlight=new THREE.Mesh(new THREE.TubeGeometry(_curve,36,0.010,6,false),_flowHighlightMat);
                _arcHighlight.name='hope-fountain-water-highlight';_arcHighlight.renderOrder=4;cityGroup.add(_arcHighlight);
            }
        }
        var _dropletsPerArc=_hopeFountainLow?3:(_hopeFountainHigh?6:4),_dropletCount=_arcCount*_dropletsPerArc;
        var _dropletMesh=new THREE.InstancedMesh(new THREE.SphereGeometry(_hopeFountainLow?0.042:0.036,_hopeFountainLow?5:8,_hopeFountainLow?4:6),_flowHighlightMat,_dropletCount);
        var _dropletDummy=new THREE.Object3D(),_dropletIndex=0;
        for(var _dai=0;_dai<_mainArcCurves.length;_dai++){
            for(var _di=0;_di<_dropletsPerArc;_di++){
                var _dt=0.17+(_di+0.35+(_dai%3)*0.13)/_dropletsPerArc*0.75;
                _dropletDummy.position.copy(_mainArcCurves[_dai].getPoint(Math.min(0.94,_dt)));
                var _ds=0.72+((_dai+_di)%3)*0.16;_dropletDummy.scale.set(_ds,_ds*1.55,_ds);
                _dropletDummy.updateMatrix();_dropletMesh.setMatrixAt(_dropletIndex++,_dropletDummy.matrix);
            }
        }
        _dropletMesh.name='hope-fountain-arc-droplets';_dropletMesh.renderOrder=4;cityGroup.add(_dropletMesh);
        // A slim upward crown jet sells the pressure source; the existing droplets
        // then break it into spray at the apex.
        var _crownCurve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(0,8.50,0),new THREE.Vector3(0.10,9.24,-0.06),new THREE.Vector3(0.02,9.68,0.02));
        var _crownJet=new THREE.Mesh(new THREE.TubeGeometry(_crownCurve,_hopeFountainLow?12:24,0.036,_hopeFountainLow?6:10,false),_fallMat);
        _crownJet.name='hope-fountain-crown-jet';_crownJet.renderOrder=3;cityGroup.add(_crownJet);

        // Discrete spill streams reveal the middle bowl and create layered water
        // motion. A single transparent cylinder looked like a glass sleeve.
        var _spillStreamCount=_hopeFountainLow?4:(_hopeFountainHigh?12:8);
        for(var _ssi=0;_ssi<_spillStreamCount;_ssi++){
            var _ssa=_ssi/_spillStreamCount*Math.PI*2;
            var _spillCurve=new THREE.QuadraticBezierCurve3(
                new THREE.Vector3(Math.cos(_ssa)*1.30,6.10,Math.sin(_ssa)*1.30),
                new THREE.Vector3(Math.cos(_ssa)*1.82,5.70,Math.sin(_ssa)*1.82),
                new THREE.Vector3(Math.cos(_ssa)*2.68,1.54,Math.sin(_ssa)*2.68)
            );
            var _spillStream=new THREE.Mesh(new THREE.TubeGeometry(_spillCurve,_hopeFountainLow?14:24,_hopeFountainLow?0.032:0.030,_hopeFountainLow?5:8,false),_fallMat);
            _spillStream.name='hope-fountain-spill-stream';_spillStream.renderOrder=3;cityGroup.add(_spillStream);
        }
        var _curtain=new THREE.Mesh(new THREE.CylinderGeometry(0.72,0.93,5.05,40,1,true),_fallMat.clone());
        _curtain.material.opacity=0.035;_curtain.position.y=4.10;_curtain.renderOrder=2;cityGroup.add(_curtain);

        // Soft impact crowns where the main arcs meet the outer pool.
        var _impactCount=_arcCount;
        for(var _ici=0;_ici<_impactCount;_ici++){
            var _ica=_ici/_impactCount*Math.PI*2;
            var _impactFoam=new THREE.Mesh(new THREE.RingGeometry(0.16,0.34,_hopeFountainLow?12:24),_foamMat.clone());
            _impactFoam.rotation.x=-Math.PI/2;_impactFoam.position.set(Math.cos(_ica)*_mainJetRadius,0.731,Math.sin(_ica)*_mainJetRadius);
            _impactFoam.material.opacity=0.18;_impactFoam.renderOrder=3;cityGroup.add(_impactFoam);
        }
    }
    // 4 lion head spouts around inner basin
    for(var li=0;li<4;li++){
        var la=li/4*Math.PI*2;
        var lx2=Math.cos(la)*3.3,lz2=Math.sin(la)*3.3;
        // Sculpted spout replaces the old box while keeping the same position and gameplay.
        if(currentCityStyle===0){
            var _spoutG=new THREE.Group();_spoutG.position.set(lx2,1.58,lz2);_spoutG.lookAt(lx2*2,1.48,lz2*2);
            _spoutG.name='hope-fountain-lion-spout';
            var lionMane=new THREE.Mesh(new THREE.SphereGeometry(0.39,18,12),stoneM);lionMane.scale.set(1.0,1.08,0.62);lionMane.castShadow=true;_spoutG.add(lionMane);
            var lionHead=new THREE.Mesh(new THREE.SphereGeometry(0.25,16,10),marbleM);lionHead.position.z=0.25;lionHead.scale.set(0.90,0.76,1.12);lionHead.castShadow=true;_spoutG.add(lionHead);
            for(var _lei=-1;_lei<=1;_lei+=2){
                var _lionEar=new THREE.Mesh(new THREE.SphereGeometry(0.105,_hopeFountainLow?8:12,_hopeFountainLow?5:8),stoneM);
                _lionEar.position.set(_lei*0.22,0.13,0.19);_lionEar.scale.set(0.86,1.10,0.56);_lionEar.castShadow=true;_spoutG.add(_lionEar);
                if(!_hopeFountainLow){
                    var _lionBrow=new THREE.Mesh(new THREE.SphereGeometry(0.055,10,7),stoneD);
                    _lionBrow.position.set(_lei*0.09,0.065,0.465);_lionBrow.scale.set(1.35,0.54,0.50);_spoutG.add(_lionBrow);
                }
            }
            var _lionNose=new THREE.Mesh(new THREE.SphereGeometry(0.085,_hopeFountainLow?8:14,_hopeFountainLow?5:8),stoneD);
            _lionNose.position.set(0,-0.005,0.49);_lionNose.scale.set(1.18,0.68,0.72);_spoutG.add(_lionNose);
            var _muzzle=new THREE.Mesh(new THREE.CylinderGeometry(0.105,0.15,0.28,14),stoneD);_muzzle.rotation.x=Math.PI/2;_muzzle.position.set(0,-0.06,0.48);_spoutG.add(_muzzle);
            cityGroup.add(_spoutG);
        }else{
            var lionHead=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.5,0.4),stoneD);
            lionHead.position.set(lx2,1.5,lz2);lionHead.lookAt(0,1.5,0);cityGroup.add(lionHead);
            var lionMane=new THREE.Mesh(new THREE.SphereGeometry(0.35,6,4),stoneM);
            lionMane.position.set(lx2,1.6,lz2);cityGroup.add(lionMane);
        }
        // Curved water jet from each lion mouth, landing with its own ripple.
        var jetDir=currentCityStyle===0?{x:Math.cos(la),z:Math.sin(la)}:{x:-Math.cos(la),z:-Math.sin(la)};
        var jet;
        if(currentCityStyle===0){
            var _jetCurve=new THREE.QuadraticBezierCurve3(
                new THREE.Vector3(lx2+jetDir.x*0.42,1.50,lz2+jetDir.z*0.42),
                new THREE.Vector3(lx2+jetDir.x*1.04,1.88,lz2+jetDir.z*1.04),
                new THREE.Vector3(lx2+jetDir.x*1.82,0.73,lz2+jetDir.z*1.82)
            );
            jet=new THREE.Mesh(new THREE.TubeGeometry(_jetCurve,20,0.040,7,false),_fallMat);
            jet.name='hope-fountain-spout-water';jet.renderOrder=3;
        }else{
            jet=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.04,1.5,6),waterM);
            jet.position.set(lx2+jetDir.x*0.8,1.3,lz2+jetDir.z*0.8);
            jet.rotation.z=Math.PI/2*Math.sign(jetDir.x||0.1);jet.rotation.x=Math.atan2(jetDir.z,jetDir.x);
        }
        cityGroup.add(jet);
        if(currentCityStyle===0){
            var _lionImpact=new THREE.Mesh(new THREE.RingGeometry(0.12,0.27,_hopeFountainLow?12:22),_foamMat.clone());
            _lionImpact.rotation.x=-Math.PI/2;_lionImpact.position.set(lx2+jetDir.x*1.82,0.734,lz2+jetDir.z*1.82);
            _lionImpact.material.opacity=0.17;_lionImpact.renderOrder=3;cityGroup.add(_lionImpact);
        }
    }
    // 8 small decorative columns around outer rim
    for(var ci2=0;ci2<8;ci2++){
        var ca=ci2/8*Math.PI*2;
        var cx2=Math.cos(ca)*7.5,cz2=Math.sin(ca)*7.5;
        var miniCol=new THREE.Mesh(new THREE.CylinderGeometry(currentCityStyle===0?0.13:0.15,currentCityStyle===0?0.19:0.18,currentCityStyle===0?1.48:2,currentCityStyle===0?16:6),marbleM);
        miniCol.position.set(cx2,currentCityStyle===0?1.18:1,cz2);miniCol.castShadow=true;cityGroup.add(miniCol);
        if(currentCityStyle===0){
            var _balBase=new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.29,0.16,_hopeFountainLow?10:16),stoneM);
            _balBase.position.set(cx2,0.46,cz2);_balBase.castShadow=true;cityGroup.add(_balBase);
            var _balNeck=new THREE.Mesh(new THREE.TorusGeometry(0.18,0.036,6,_hopeFountainLow?12:20),stoneD);
            _balNeck.rotation.x=Math.PI/2;_balNeck.position.set(cx2,1.78,cz2);cityGroup.add(_balNeck);
        }
        var miniCap=new THREE.Mesh(new THREE.SphereGeometry(currentCityStyle===0?0.19:0.22,currentCityStyle===0?14:6,currentCityStyle===0?10:4),stoneM);
        miniCap.position.set(cx2,currentCityStyle===0?1.91:2.1,cz2);miniCap.castShadow=true;cityGroup.add(miniCap);
    }
    // Scattered gold coins in the water
    for(var gi=0;gi<20;gi++){
        var ga=Math.random()*Math.PI*2;
        var gr=Math.random()*5.5;
        var coin=(typeof _makeCinematicCoinMesh==='function')?_makeCinematicCoinMesh(0.31):
            new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,0.03,8),goldM);
        coin.position.set(Math.cos(ga)*gr,0.55+Math.random()*0.15,Math.sin(ga)*gr);
        coin.rotation.x=-Math.PI/2+(Math.random()-0.5)*0.35;
        coin.rotation.z=Math.random()*Math.PI;
        cityGroup.add(coin);
    }
    // ---- Fountain water particle system ----
    var _fwParticles=[];
    var _fwMat=new THREE.MeshBasicMaterial({color:0xB9EEFF,transparent:true,opacity:currentCityStyle===0?0.30:0.6,depthWrite:false,blending:THREE.NormalBlending});
    // Central jet particles (spray from top shell)
    var _fountainLow=window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.low;
    for(var fpi=0;fpi<(currentCityStyle===0?(_fountainLow?24:52):120);fpi++){
        var fp=new THREE.Mesh(new THREE.SphereGeometry(currentCityStyle===0?0.055:0.25,currentCityStyle===0?6:4,currentCityStyle===0?4:3),_fwMat);
        fp.visible=false;
        cityGroup.add(fp);
        _fwParticles.push({mesh:fp,type:'jet',life:Math.floor(Math.random()*80),maxLife:70+Math.random()*40,
            vx:(Math.random()-0.5)*0.12,vy:0.12+Math.random()*0.08,vz:(Math.random()-0.5)*0.12,
            ox:0,oy:8.2,oz:0});
    }
    // Lion spout particles (4 lions, 20 particles each)
    for(var lli=0;lli<4;lli++){
        var lla=lli/4*Math.PI*2;
        var llx=Math.cos(lla)*3.3,llz=Math.sin(lla)*3.3;
        var _lionFlowSign=currentCityStyle===0?1:-1;
        var jdx=Math.cos(lla)*0.1*_lionFlowSign,jdz=Math.sin(lla)*0.1*_lionFlowSign;
        for(var lpi=0;lpi<(currentCityStyle===0?(_fountainLow?4:8):20);lpi++){
            var lp=new THREE.Mesh(new THREE.SphereGeometry(currentCityStyle===0?0.050:0.18,currentCityStyle===0?6:4,currentCityStyle===0?4:3),_fwMat);
            lp.visible=false;
            cityGroup.add(lp);
            _fwParticles.push({mesh:lp,type:'lion',life:Math.floor(Math.random()*40),maxLife:40+Math.random()*20,
                vx:jdx+(Math.random()-0.5)*0.03,vy:0.02+Math.random()*0.03,vz:jdz+(Math.random()-0.5)*0.03,
                ox:llx+jdx*4.2,oy:1.50,oz:llz+jdz*4.2,_lionAngle:lla});
        }
    }
    // Store reference for animation
    window._fountainParticles=_fwParticles;
    window._fountainSplashParticles=[];
    // Splash particle pool
    var _fsMat=new THREE.MeshBasicMaterial({color:0xC8F5FF,transparent:true,opacity:currentCityStyle===0?0.28:0.7,depthWrite:false,blending:THREE.NormalBlending});
    for(var fsi=0;fsi<(currentCityStyle===0?(_fountainLow?12:24):40);fsi++){
        var fsp=new THREE.Mesh(new THREE.SphereGeometry(currentCityStyle===0?0.080:0.3,currentCityStyle===0?6:4,currentCityStyle===0?4:3),_fsMat);
        fsp.visible=false;
        cityGroup.add(fsp);
        window._fountainSplashParticles.push({mesh:fsp,life:0,maxLife:0,vx:0,vy:0,vz:0});
    }

    // Treat the complete fountain as one editable functional landmark. Existing
    // meshes keep local coordinates, so animation, water particles and detail
    // proportions remain intact while the editor moves/rotates/scales the group.
    var _fountainBuiltChildren=cityGroup.children.slice(_fountainChildStart);
    var _fountainGroup=new THREE.Group();_fountainGroup.name='hope-central-fountain-landmark';cityGroup.add(_fountainGroup);
    for(var _fbc=0;_fbc<_fountainBuiltChildren.length;_fbc++)_fountainGroup.attach(_fountainBuiltChildren[_fbc]);
    var _fountainX=Number(_hopeFountainDef&&_hopeFountainDef.x)||0;
    var _fountainY=Number(_hopeFountainDef&&_hopeFountainDef.y)||0;
    var _fountainZ=Number(_hopeFountainDef&&_hopeFountainDef.z)||0;
    var _fountainScale=Math.max(0.80,Math.min(1.25,Number(_hopeFountainDef&&_hopeFountainDef.scale)||1));
    var _fountainRotation=(Number(_hopeFountainDef&&_hopeFountainDef.rotationY)||0)*Math.PI/180;
    var _fountainIndex=_hopeFountainDefinitionIndex(_hopeFountainDef);
    _fountainGroup.position.set(_fountainX,_fountainY,_fountainZ);_fountainGroup.rotation.y=_fountainRotation;_fountainGroup.scale.setScalar(_fountainScale);
    _fountainGroup.visible=_hopeFountainEnabled;
    _fountainGroup.userData.editorSpecialIndex=_fountainIndex;_fountainGroup.userData.editorSpecialType='cinematicFountain';
    _fountainGroup.traverse(function(item){
        item.userData=item.userData||{};item.userData.editorSpecialIndex=_fountainIndex;item.userData.editorSpecialType='cinematicFountain';
    });
    var _fountainCollider={x:_fountainX,z:_fountainZ,hw:1.5*_fountainScale,hd:1.5*_fountainScale,h:_fountainY+8.8*_fountainScale,_cinematicFountain:true};
    if(_hopeFountainEnabled)cityColliders.push(_fountainCollider);
    window._fountainGroup=_fountainGroup;window._fountainCollider=_fountainCollider;
    window._fountainRippleStrength=Math.max(0.35,Math.min(1.8,Number(_fountainWaterDef.rippleStrength)||1));
    window._fountainSplashStrength=Math.max(0.35,Math.min(1.8,Number(_fountainJetDef.splashStrength)||1));

    // ---- Streams & Canals (water city style 0) ----
    if(currentCityStyle===0){
        var streamMat=waterM.clone();streamMat.opacity=_hopeFountainLow?0.56:0.50;
        var bankMat=typeof _visualSurfaceMaterial==='function'?_visualSurfaceMaterial('stone',0xB8AA91,{roughness:0.82,bumpScale:0.12}):toon(0xB8AA91);
        // 4 canals radiating from central fountain to city edges
        var canalDirs=[{dx:1,dz:0},{dx:-1,dz:0},{dx:0,dz:1},{dx:0,dz:-1}];
        for(var cdi=0;cdi<4;cdi++){
            var cd=canalDirs[cdi];
            var cLen=CITY_SIZE*0.9;
            // Water surface
            var cw=cd.dx!==0?cLen:3;var ch=cd.dz!==0?cLen:3;
            var canal=new THREE.Mesh(new THREE.BoxGeometry(cw,0.15,ch),streamMat);
            canal.position.set(cd.dx*cLen/2+cd.dx*12,0.35,cd.dz*cLen/2+cd.dz*12);
            cityGroup.add(canal);
            // Stone banks on both sides
            var bOff=cd.dx!==0?0:1.8;var bOff2=cd.dz!==0?0:1.8;
            var bank1=new THREE.Mesh(new THREE.BoxGeometry(cd.dx!==0?cLen:0.5,0.4,cd.dz!==0?cLen:0.5),bankMat);
            bank1.position.set(cd.dx*cLen/2+cd.dx*12+bOff2,0.2,cd.dz*cLen/2+cd.dz*12+bOff);
            cityGroup.add(bank1);
            var bank2=new THREE.Mesh(new THREE.BoxGeometry(cd.dx!==0?cLen:0.5,0.4,cd.dz!==0?cLen:0.5),bankMat);
            bank2.position.set(cd.dx*cLen/2+cd.dx*12-bOff2,0.2,cd.dz*cLen/2+cd.dz*12-bOff);
            cityGroup.add(bank2);
        }
        // Ring canal around the fountain (inner)
        var ringCanal=new THREE.Mesh(new THREE.TorusGeometry(25,2.5,6,24),streamMat);
        ringCanal.rotation.x=Math.PI/2;ringCanal.position.y=0.3;cityGroup.add(ringCanal);
        var ringBank=new THREE.Mesh(new THREE.TorusGeometry(25,0.4,6,24),bankMat);
        ringBank.rotation.x=Math.PI/2;ringBank.position.y=0.4;cityGroup.add(ringBank);
        // Outer ring canal
        var ringCanal2=new THREE.Mesh(new THREE.TorusGeometry(55,2,6,32),streamMat);
        ringCanal2.rotation.x=Math.PI/2;ringCanal2.position.y=0.28;cityGroup.add(ringCanal2);
        var ringBank2=new THREE.Mesh(new THREE.TorusGeometry(55,0.35,6,32),bankMat);
        ringBank2.rotation.x=Math.PI/2;ringBank2.position.y=0.38;cityGroup.add(ringBank2);
        // Stone bridges over canals (inner ring)
        var bridgeMat=_visualSurfaceMaterial('path',0xC7B8A1,{roughness:0.78,normalScale:new THREE.Vector2(0.48,0.48)});
        for(var bri=0;bri<8;bri++){
            var bra=bri/8*Math.PI*2;var brr=25;
            var brx=Math.cos(bra)*brr,brz=Math.sin(bra)*brr;
            var bridge=new THREE.Mesh(new THREE.BoxGeometry(5,0.4,6),bridgeMat);
            bridge.position.set(brx,0.55,brz);bridge.rotation.y=bra;
            cityGroup.add(bridge);
            // Bridge railings
            var rail1=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.6,6),toon(0xAA9988));
            rail1.position.set(brx+Math.cos(bra+Math.PI/2)*2.2,0.8,brz+Math.sin(bra+Math.PI/2)*2.2);
            rail1.rotation.y=bra;cityGroup.add(rail1);
            var rail2=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.6,6),toon(0xAA9988));
            rail2.position.set(brx-Math.cos(bra+Math.PI/2)*2.2,0.8,brz-Math.sin(bra+Math.PI/2)*2.2);
            rail2.rotation.y=bra;cityGroup.add(rail2);
        }
        // Bridges over outer ring
        for(var bri2=0;bri2<6;bri2++){
            var bra2=bri2/6*Math.PI*2+Math.PI/6;var brr2=55;
            var bridge2=new THREE.Mesh(new THREE.BoxGeometry(5,0.4,5),bridgeMat);
            bridge2.position.set(Math.cos(bra2)*brr2,0.5,Math.sin(bra2)*brr2);
            bridge2.rotation.y=bra2;cityGroup.add(bridge2);
        }
        // Water wheels (Gagharv style)
        window._waterWheels=[];
        for(var wwi=0;wwi<4;wwi++){
            var wwa=wwi/4*Math.PI*2+Math.PI/4;var wwr=25;
            var wwG=new THREE.Group();
            // Wheel
            var wheel=new THREE.Mesh(new THREE.TorusGeometry(2.5,0.3,8,12),toon(0x8B6914));
            wheel.rotation.y=Math.PI/2;wwG.add(wheel);
            // Spokes
            for(var wsi=0;wsi<6;wsi++){
                var wsa=wsi/6*Math.PI*2;
                var spoke=new THREE.Mesh(new THREE.BoxGeometry(0.15,4.5,0.15),toon(0x8B6914));
                spoke.rotation.z=wsa;wwG.add(spoke);
            }
            // Paddles
            for(var wpi=0;wpi<8;wpi++){
                var wpa=wpi/8*Math.PI*2;
                var paddle=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.15,0.4),toon(0x6B4914));
                paddle.position.set(0,Math.sin(wpa)*2.3,Math.cos(wpa)*2.3);
                paddle.rotation.x=wpa;wwG.add(paddle);
            }
            // Support frame
            var frame1=new THREE.Mesh(new THREE.BoxGeometry(0.2,4,0.2),toon(0x665533));
            frame1.position.set(0.5,0,0);wwG.add(frame1);
            var frame2=new THREE.Mesh(new THREE.BoxGeometry(0.2,4,0.2),toon(0x665533));
            frame2.position.set(-0.5,0,0);wwG.add(frame2);
            wwG.position.set(Math.cos(wwa)*wwr,2,Math.sin(wwa)*wwr);
            wwG.rotation.y=wwa;
            cityGroup.add(wwG);
            window._waterWheels.push(wwG);
        }
    }
    // ---- Fish in all water areas (grabbable) ----
    if(currentCityStyle===0){
        window._cityFish=[];
        var fishColors=[0xFF6644,0xFFAA22,0xFFFFFF,0xFF4488,0x44AAFF,0x44DD88,0xFFDD44,0xDD66FF];
        // Spawn fish across fountain pool, inner canal, outer canal
        var _fishSpawns=[];
        // Fountain pool (8 fish)
        for(var _fsi=0;_fsi<8;_fsi++){var _fsa=_fsi/8*Math.PI*2;_fishSpawns.push({x:Math.cos(_fsa)*(1+Math.random()*4),z:Math.sin(_fsa)*(1+Math.random()*4),r:1+Math.random()*4});}
        // Inner ring canal (10 fish)
        for(var _fsi2=0;_fsi2<10;_fsi2++){var _fsa2=_fsi2/10*Math.PI*2;_fishSpawns.push({x:Math.cos(_fsa2)*25,z:Math.sin(_fsa2)*25,r:25});}
        // Outer ring canal (8 fish)
        for(var _fsi3=0;_fsi3<8;_fsi3++){var _fsa3=_fsi3/8*Math.PI*2;_fishSpawns.push({x:Math.cos(_fsa3)*55,z:Math.sin(_fsa3)*55,r:55});}
        // Radial canals (4 fish each direction)
        for(var _fsi4=0;_fsi4<4;_fsi4++){
            var _fcd=[{dx:1,dz:0},{dx:-1,dz:0},{dx:0,dz:1},{dx:0,dz:-1}][_fsi4];
            var _fcDist=15+Math.random()*50;
            _fishSpawns.push({x:_fcd.dx*_fcDist,z:_fcd.dz*_fcDist,r:_fcDist,_canal:true,_canalDir:_fsi4});
        }
        for(var fii=0;fii<_fishSpawns.length;fii++){
            var _fs=_fishSpawns[fii];
            var fishG=new THREE.Group();
            var fc=fishColors[fii%fishColors.length];
            var fishBody=new THREE.Mesh(new THREE.SphereGeometry(0.3,6,4),toon(fc));
            fishBody.scale.set(1,0.5,1.8);fishG.add(fishBody);
            var fishTail=new THREE.Mesh(new THREE.ConeGeometry(0.2,0.4,4),toon(fc));
            fishTail.rotation.x=Math.PI/2;fishTail.position.z=-0.5;fishG.add(fishTail);
            var fishEye=new THREE.Mesh(new THREE.SphereGeometry(0.06,4,3),toon(0x111111));
            fishEye.position.set(0.12,0.08,0.2);fishG.add(fishEye);
            fishG.position.set(_fs.x,0.4,_fs.z);
            fishG.rotation.y=Math.random()*Math.PI*2;
            cityGroup.add(fishG);
            var fish={group:fishG,angle:Math.atan2(_fs.z,_fs.x),radius:_fs.r,speed:0.003+Math.random()*0.005,
                jumpTimer:120+Math.floor(Math.random()*300),jumping:false,jumpVy:0,baseY:0.4,
                grabbed:false,throwVx:0,throwVy:0,throwVz:0,throwTimer:0,weight:3.0,
                _canal:_fs._canal||false,_canalDir:_fs._canalDir||0};
            window._cityFish.push(fish);
            cityProps.push({group:fishG,x:fishG.position.x,z:fishG.position.z,radius:0.5,
                type:'fish',grabbed:false,origY:0.4,throwVx:0,throwVy:0,throwVz:0,throwTimer:0,
                weight:3.0,_fishRef:fish});
        }
    }

    // ---- Lamp posts / Stone lanterns (sakura) ----
    for(let i=0;i<20;i++){
        const lx=(Math.random()-0.5)*CITY_SIZE*1.5, lz=(Math.random()-0.5)*CITY_SIZE*1.5;
        let skip2=false;
        for(const c of cityColliders) if(DANBO_WASM.aabb2D(lx,lz,c.x,c.z,c.hw,c.hd,1)) skip2=true;
        if(skip2) continue;
        const lg=new THREE.Group(); lg.position.set(lx,0,lz);
        if(currentCityStyle===6){
            // Stone lantern (toro) — shorter, stone pillar with warm lantern head
            var lanBase=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.3,0.6),toon(0x999999));
            lanBase.position.y=0.15;lg.add(lanBase);
            var lanPillar=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.12,1.5,6),toon(0x999999));
            lanPillar.position.y=1.05;lg.add(lanPillar);
            var lanHead=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.4,0.5),toon(0xFFDD88,{emissive:0xFFDD88,emissiveIntensity:0.4}));
            lanHead.position.y=2.0;lg.add(lanHead);
            var lanRoof=new THREE.Mesh(new THREE.ConeGeometry(0.45,0.3,4),toon(0x777777));
            lanRoof.position.y=2.35;lanRoof.rotation.y=Math.PI/4;lg.add(lanRoof);
        } else {
        const pole=new THREE.Mesh(new THREE.CylinderGeometry(LAMP_CONFIG.poleRadius.top,LAMP_CONFIG.poleRadius.bottom,LAMP_CONFIG.poleHeight,4),toon(0x555555));
        pole.position.y=LAMP_CONFIG.poleHeight/2; lg.add(pole);
        const lamp=new THREE.Mesh(new THREE.SphereGeometry(LAMP_CONFIG.lampRadius,6,4),toon(0xFFEE88,{emissive:0xFFDD44,emissiveIntensity:LAMP_CONFIG.emissiveIntensity}));
        lamp.position.y=LAMP_CONFIG.lampHeight; lg.add(lamp);
        }
        cityGroup.add(lg);
        cityProps.push({group:lg, x:lx, z:lz, radius:0.5, type:'lamp', grabbed:false, origY:0, throwVx:0, throwVy:0, throwVz:0, throwTimer:0, weight:1.5});
    }

    // ---- Benches ----
    for(let i=0;i<12;i++){
        const bx=(Math.random()-0.5)*CITY_SIZE*1.4, bz=(Math.random()-0.5)*CITY_SIZE*1.4;
        let skip3=false;
        for(const c of cityColliders) if(DANBO_WASM.aabb2D(bx,bz,c.x,c.z,c.hw,c.hd,1.5)) skip3=true;
        if(skip3) continue;
        const bg=new THREE.Group(); bg.position.set(bx,0,bz);
        const seat=new THREE.Mesh(new THREE.BoxGeometry(BENCH_CONFIG.seatSize.w,BENCH_CONFIG.seatSize.h,BENCH_CONFIG.seatSize.d),toon(0x8B5E3C));
        seat.position.y=BENCH_CONFIG.seatHeight; bg.add(seat);
        const back=new THREE.Mesh(new THREE.BoxGeometry(BENCH_CONFIG.backSize.w,BENCH_CONFIG.backSize.h,BENCH_CONFIG.backSize.d),toon(0x8B5E3C));
        back.position.y=BENCH_CONFIG.backHeight; back.position.z=-0.25; bg.add(back);
        const leg1=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.5,0.5),toon(0x555555));
        leg1.position.set(-0.8,0.25,0); bg.add(leg1);
        const leg2=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.5,0.5),toon(0x555555));
        leg2.position.set(0.8,0.25,0); bg.add(leg2);
        cityGroup.add(bg);
        cityProps.push({group:bg, x:bx, z:bz, radius:1.2, type:'bench', grabbed:false, origY:0, throwVx:0, throwVy:0, throwVz:0, throwTimer:0, weight:2.5});
    }
    // ---- City Animals: pigeons, rabbits, deer ----
    window._cityAnimals=[];
    // Pigeons (12) — fly and land
    for(var _pi=0;_pi<12;_pi++){
        var pg=new THREE.Group();
        var pbody=new THREE.Mesh(new THREE.SphereGeometry(0.2,6,4),toon(0xAAAAAA));
        pbody.scale.set(1,0.7,1.3);pg.add(pbody);
        var phead=new THREE.Mesh(new THREE.SphereGeometry(0.12,6,4),toon(0x999999));
        phead.position.set(0,0.15,0.2);pg.add(phead);
        pg.userData.animalParts={head:phead};
        // Eyes
        [-1,1].forEach(function(s){
            var peye=new THREE.Mesh(new THREE.SphereGeometry(0.03,4,3),toon(0xFF6600));
            peye.position.set(s*0.06,0.18,0.28);pg.add(peye);
        });
        // Beak
        var pbeak=new THREE.Mesh(new THREE.ConeGeometry(0.04,0.1,4),toon(0xFFAA44));
        pbeak.position.set(0,0.12,0.32);pbeak.rotation.x=-Math.PI/2;pg.add(pbeak);
        // Wings
        [-1,1].forEach(function(s){
            var pwing=new THREE.Mesh(new THREE.BoxGeometry(0.35,0.03,0.25),toon(0x888888));
            pwing.position.set(s*0.25,0.05,0);pwing.userData._side=s;pg.add(pwing);
        });
        // Tail
        var ptail=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.02,0.15),toon(0x777777));
        ptail.position.set(0,0.02,-0.25);pg.add(ptail);
        var px2=(Math.random()-0.5)*CITY_SIZE*1.2,pz2=(Math.random()-0.5)*CITY_SIZE*1.2;
        var py2=Math.random()*15+3;
        pg.position.set(px2,py2,pz2);
        cityGroup.add(pg);
        window._cityAnimals.push({group:pg,type:'pigeon',x:px2,y:py2,z:pz2,
            vx:(Math.random()-0.5)*0.1,vy:0,vz:(Math.random()-0.5)*0.1,
            state:'fly',stateTimer:120+Math.floor(Math.random()*180),
            flapPhase:Math.random()*Math.PI*2,targetY:py2});
    }
    // Seagulls (8) — white body, gray wing tips, yellow beak, fly higher
    for(var _si2=0;_si2<8;_si2++){
        var sg=new THREE.Group();
        sg.scale.set(1.5,1.5,1.5);
        var sbody=new THREE.Mesh(new THREE.SphereGeometry(0.22,6,4),toon(0xFFFFFF));
        sbody.scale.set(1,0.7,1.4);sg.add(sbody);
        var shead=new THREE.Mesh(new THREE.SphereGeometry(0.13,6,4),toon(0xFFFFFF));
        shead.position.set(0,0.16,0.22);sg.add(shead);
        [-1,1].forEach(function(s){
            var seye=new THREE.Mesh(new THREE.SphereGeometry(0.03,4,3),toon(0x111111));
            seye.position.set(s*0.07,0.19,0.3);sg.add(seye);
        });
        var sbeak=new THREE.Mesh(new THREE.ConeGeometry(0.04,0.12,4),toon(0xFFCC00));
        sbeak.position.set(0,0.12,0.34);sbeak.rotation.x=-Math.PI/2;sg.add(sbeak);
        [-1,1].forEach(function(s){
            var swing=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.03,0.28),toon(0x999999));
            swing.position.set(s*0.28,0.05,0);swing.userData._side=s;sg.add(swing);
        });
        var stail=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.02,0.18),toon(0xCCCCCC));
        stail.position.set(0,0.02,-0.28);sg.add(stail);
        var sx2=(Math.random()-0.5)*CITY_SIZE*1.2,sz2=(Math.random()-0.5)*CITY_SIZE*1.2;
        var sy2=10+Math.random()*15;
        sg.position.set(sx2,sy2,sz2);
        cityGroup.add(sg);
        window._cityAnimals.push({group:sg,type:'seagull',x:sx2,y:sy2,z:sz2,
            vx:(Math.random()-0.5)*0.08,vy:0,vz:(Math.random()-0.5)*0.08,
            state:'fly',stateTimer:200+Math.floor(Math.random()*200),
            flapPhase:Math.random()*Math.PI*2,targetY:sy2,diveTimer:0});
    }
    // Ducks (6) — green head, brown body, near fountain/center
    for(var _dki=0;_dki<6;_dki++){
        var dkg=new THREE.Group();
        var dkbody=new THREE.Mesh(new THREE.SphereGeometry(0.22,6,4),toon(0x8B6914));
        dkbody.scale.set(0.8,0.7,1.3);dkbody.position.y=0.15;dkg.add(dkbody);
        var dkhead=new THREE.Mesh(new THREE.SphereGeometry(0.12,6,4),toon(0x006633));
        dkhead.position.set(0,0.3,0.2);dkg.add(dkhead);
        [-1,1].forEach(function(s){
            var dkeye=new THREE.Mesh(new THREE.SphereGeometry(0.025,4,3),toon(0x111111));
            dkeye.position.set(s*0.06,0.33,0.28);dkg.add(dkeye);
        });
        var dkbeak=new THREE.Mesh(new THREE.ConeGeometry(0.04,0.1,4),toon(0xFF8800));
        dkbeak.position.set(0,0.26,0.32);dkbeak.rotation.x=-Math.PI/2;dkg.add(dkbeak);
        [-1,1].forEach(function(s){
            var dkwing=new THREE.Mesh(new THREE.BoxGeometry(0.28,0.03,0.2),toon(0x7A5B10));
            dkwing.position.set(s*0.2,0.18,0);dkwing.userData._side=s;dkg.add(dkwing);
        });
        var dktail=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.06,0.12),toon(0x8B6914));
        dktail.position.set(0,0.18,-0.28);dktail.rotation.x=0.3;dkg.add(dktail);
        [-1,1].forEach(function(s){
            var dkfoot=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.02,0.1),toon(0xFF6600));
            dkfoot.position.set(s*0.08,0.02,0.05);dkg.add(dkfoot);
        });
        var dkx=(Math.random()-0.5)*30,dkz=(Math.random()-0.5)*30;
        dkg.position.set(dkx,0.3,dkz);
        cityGroup.add(dkg);
        var _dkAnimal={group:dkg,type:'duck',x:dkx,y:0.3,z:dkz,
            vx:0,vy:0,vz:0,state:'swim',stateTimer:80+Math.floor(Math.random()*120),
            waddlePhase:Math.random()*Math.PI*2,moveDir:Math.random()*Math.PI*2};
        window._cityAnimals.push(_dkAnimal);
        var _dkProp={group:dkg,x:dkx,z:dkz,radius:0.6,type:'duck',grabbed:false,origY:0.3,throwVx:0,throwVy:0,throwVz:0,throwTimer:0,weight:0.4,_animal:_dkAnimal};
        _dkAnimal._propRef=_dkProp;
        cityProps.push(_dkProp);
    }
    // Eagles (3) — dark brown, large wingspan, fly very high
    for(var _ei2=0;_ei2<3;_ei2++){
        var eg=new THREE.Group();
        eg.scale.set(2.5,2.5,2.5);
        var ebody=new THREE.Mesh(new THREE.SphereGeometry(0.25,6,4),toon(0x3B2210));
        ebody.scale.set(1,0.6,1.5);eg.add(ebody);
        var ehead=new THREE.Mesh(new THREE.SphereGeometry(0.14,6,4),toon(0x3B2210));
        ehead.position.set(0,0.14,0.3);eg.add(ehead);
        [-1,1].forEach(function(s){
            var eeye=new THREE.Mesh(new THREE.SphereGeometry(0.03,4,3),toon(0xFFDD00));
            eeye.position.set(s*0.07,0.17,0.38);eg.add(eeye);
        });
        var ebeak=new THREE.Mesh(new THREE.ConeGeometry(0.05,0.14,4),toon(0xCCAA00));
        ebeak.position.set(0,0.1,0.42);ebeak.rotation.x=-Math.PI/2;eg.add(ebeak);
        [-1,1].forEach(function(s){
            var ewing=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.03,0.3),toon(0x4A3018));
            ewing.position.set(s*0.4,0.02,0);ewing.userData._side=s;eg.add(ewing);
        });
        var etail=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.03,0.2),toon(0x3B2210));
        etail.position.set(0,0,-0.35);eg.add(etail);
        var ex2=(Math.random()-0.5)*CITY_SIZE*1.5,ez2=(Math.random()-0.5)*CITY_SIZE*1.5;
        var ey2=20+Math.random()*20;
        eg.position.set(ex2,ey2,ez2);
        cityGroup.add(eg);
        window._cityAnimals.push({group:eg,type:'eagle',x:ex2,y:ey2,z:ez2,
            vx:(Math.random()-0.5)*0.04,vy:0,vz:(Math.random()-0.5)*0.04,
            state:'soar',stateTimer:9999,
            flapPhase:Math.random()*Math.PI*2,targetY:ey2,circleAngle:Math.random()*Math.PI*2});
    }
    // Crows (5) — all black, perch on buildings
    for(var _ci2=0;_ci2<5;_ci2++){
        var cg=new THREE.Group();
        cg.scale.set(0.8,0.8,0.8);
        var cbody=new THREE.Mesh(new THREE.SphereGeometry(0.2,6,4),toon(0x111111));
        cbody.scale.set(1,0.7,1.3);cg.add(cbody);
        var chead=new THREE.Mesh(new THREE.SphereGeometry(0.11,6,4),toon(0x0D0D15));
        chead.position.set(0,0.14,0.2);cg.add(chead);
        [-1,1].forEach(function(s){
            var ceye=new THREE.Mesh(new THREE.SphereGeometry(0.025,4,3),toon(0x222222));
            ceye.position.set(s*0.05,0.17,0.27);cg.add(ceye);
        });
        var cbeak=new THREE.Mesh(new THREE.ConeGeometry(0.03,0.1,4),toon(0x222222));
        cbeak.position.set(0,0.11,0.3);cbeak.rotation.x=-Math.PI/2;cg.add(cbeak);
        [-1,1].forEach(function(s){
            var cwing=new THREE.Mesh(new THREE.BoxGeometry(0.32,0.03,0.22),toon(0x1A0A2E));
            cwing.position.set(s*0.22,0.04,0);cwing.userData._side=s;cg.add(cwing);
        });
        var ctail=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.02,0.15),toon(0x111111));
        ctail.position.set(0,0.01,-0.24);cg.add(ctail);
        // Perch on a random building rooftop
        var crowCol=cityColliders[Math.floor(Math.random()*Math.min(cityColliders.length,20))];
        var cx2=crowCol.x+(Math.random()-0.5)*crowCol.hw*0.5;
        var cz2=crowCol.z+(Math.random()-0.5)*crowCol.hd*0.5;
        var cy2=(crowCol.h||5)+0.3;
        cg.position.set(cx2,cy2,cz2);
        cityGroup.add(cg);
        window._cityAnimals.push({group:cg,type:'crow',x:cx2,y:cy2,z:cz2,
            vx:0,vy:0,vz:0,state:'perch',stateTimer:100+Math.floor(Math.random()*200),
            flapPhase:Math.random()*Math.PI*2,spawnY:cy2,hopPhase:0});
    }
    // Rabbits (8) — compact, rounded woodland proportions.
    // A rabbit should read much smaller than a deer even though both remain easy to spot and grab.
    var _animalLow=!!(window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.low);
    var _animalSeg=_animalLow?10:18;
    var _rabbitFur=softPBR(0xE9D8C8,{pastelAmount:0.05,roughness:0.88,envMapIntensity:0.12});
    var _rabbitCream=softPBR(0xFFF6E8,{pastelAmount:0.01,roughness:0.82,envMapIntensity:0.10});
    var _rabbitPink=softPBR(0xF3AFC0,{pastelAmount:0.02,roughness:0.78,envMapIntensity:0.10});
    var _rabbitEye=softPBR(0x392F43,{pastelAmount:0,roughness:0.28,clearcoat:0.42,clearcoatRoughness:0.18,envMapIntensity:0.36});
    var _rabbitBodyGeo=new THREE.SphereGeometry(0.30,_animalSeg,_animalLow?8:14);
    var _rabbitHeadGeo=new THREE.SphereGeometry(0.24,_animalSeg,_animalLow?8:14);
    var _rabbitEarGeo=THREE.CapsuleGeometry?new THREE.CapsuleGeometry(0.055,0.25,_animalLow?3:6,_animalSeg):new THREE.CylinderGeometry(0.055,0.07,0.36,_animalSeg);
    var _rabbitInnerEarGeo=THREE.CapsuleGeometry?new THREE.CapsuleGeometry(0.027,0.20,_animalLow?3:5,_animalSeg):new THREE.CylinderGeometry(0.027,0.04,0.28,_animalSeg);
    var _rabbitSmallGeo=new THREE.SphereGeometry(1,_animalSeg,_animalLow?7:12);
    for(var _ri2=0;_ri2<8;_ri2++){
        var rg=new THREE.Group();
        rg.scale.setScalar(1.1);
        var rbody=new THREE.Mesh(_rabbitBodyGeo,_rabbitFur);
        rbody.scale.set(0.84,0.82,1.08);rbody.position.y=0.30;rg.add(rbody);
        var rhead=new THREE.Mesh(_rabbitHeadGeo,_rabbitFur);
        rhead.scale.set(1.02,0.94,0.94);rhead.position.set(0,0.57,0.17);rg.add(rhead);
        // Long but softly rounded ears, with visible pink insets.
        var _rEars=[];
        [-1,1].forEach(function(s){
            var rearGroup=new THREE.Group();
            rearGroup.position.set(s*0.105,0.82,0.11);rearGroup.rotation.z=s*0.12;rg.add(rearGroup);
            var rear=new THREE.Mesh(_rabbitEarGeo,_rabbitFur);
            rearGroup.add(rear);
            var rearIn=new THREE.Mesh(_rabbitInnerEarGeo,_rabbitPink);
            rearIn.position.set(0,0.005,0.048);rearIn.scale.set(0.82,0.92,0.42);rearGroup.add(rearIn);
            _rEars.push(rearGroup);
        });
        // Oversized glossy eyes with highlights.
        [-1,1].forEach(function(s){
            var reye=new THREE.Mesh(_rabbitSmallGeo,_rabbitEye);
            reye.scale.set(0.052,0.071,0.030);reye.position.set(s*0.085,0.60,0.383);rg.add(reye);
            var rshine=new THREE.Mesh(_rabbitSmallGeo,_rabbitCream);
            rshine.scale.setScalar(0.015);rshine.position.set(s*0.074,0.623,0.411);rg.add(rshine);
        });
        // Puffy muzzle, tiny nose and rosy cheeks give a friendly cartoon expression.
        [-1,1].forEach(function(s){
            var rmuzzle=new THREE.Mesh(_rabbitSmallGeo,_rabbitCream);
            rmuzzle.scale.set(0.063,0.050,0.040);rmuzzle.position.set(s*0.043,0.525,0.397);rg.add(rmuzzle);
            var rcheek=new THREE.Mesh(_rabbitSmallGeo,_rabbitPink);
            rcheek.scale.set(0.045,0.025,0.015);rcheek.position.set(s*0.142,0.525,0.360);rg.add(rcheek);
        });
        var rnose=new THREE.Mesh(_rabbitSmallGeo,_rabbitPink);
        rnose.scale.set(0.030,0.022,0.020);rnose.position.set(0,0.548,0.438);rg.add(rnose);
        // Rounded hind paws keep the silhouette grounded and toy-like.
        [-1,1].forEach(function(s){
            var rpaw=new THREE.Mesh(_rabbitSmallGeo,_rabbitCream);
            rpaw.scale.set(0.11,0.055,0.15);rpaw.position.set(s*0.17,0.075,0.16);rg.add(rpaw);
        });
        // Tail puff
        var rtail=new THREE.Mesh(_rabbitSmallGeo,_rabbitCream);
        rtail.scale.setScalar(0.095);rtail.position.set(0,0.31,-0.30);rg.add(rtail);
        rg.userData.animalParts={body:rbody,head:rhead,ears:_rEars,nose:rnose,tail:rtail,bodyBaseScale:new THREE.Vector3(0.84,0.82,1.08),headBaseY:0.57,tailBaseY:0.31};
        var rx3=(Math.random()-0.5)*60+(_ri2<3?(Math.random()-0.5)*20:0),rz3=(Math.random()-0.5)*60+(_ri2<3?(Math.random()-0.5)*20:0);
        rg.position.set(rx3,0,rz3);
        cityGroup.add(rg);
        var _rAnimal={group:rg,type:'rabbit',x:rx3,y:0,z:rz3,
            vx:0,vy:0,vz:0,state:'idle',stateTimer:60+Math.floor(Math.random()*120),
            hopPhase:0,moveDir:Math.random()*Math.PI*2};
        window._cityAnimals.push(_rAnimal);
        var _rProp={group:rg,x:rx3,z:rz3,radius:0.58,type:'rabbit',grabbed:false,origY:0,throwVx:0,throwVy:0,throwVz:0,throwTimer:0,weight:0.35,_animal:_rAnimal};
        _rAnimal._propRef=_rProp;
        cityProps.push(_rProp);
    }
    // Deer (6) — visibly taller than the rabbits, with an animated-film fawn silhouette.
    var _deerFur=softPBR(0xB97845,{pastelAmount:0.08,roughness:0.84,envMapIntensity:0.14});
    var _deerLight=softPBR(0xF5D5AE,{pastelAmount:0.04,roughness:0.86,envMapIntensity:0.10});
    var _deerInner=softPBR(0xE89A91,{pastelAmount:0.02,roughness:0.80,envMapIntensity:0.10});
    var _deerEye=softPBR(0x30283A,{pastelAmount:0,roughness:0.26,clearcoat:0.45,clearcoatRoughness:0.16,envMapIntensity:0.38});
    var _deerAntler=softPBR(0x76513A,{pastelAmount:0.02,roughness:0.88,envMapIntensity:0.08});
    var _deerHoof=softPBR(0x3D3435,{pastelAmount:0,roughness:0.90,envMapIntensity:0.06});
    var _deerSmallGeo=new THREE.SphereGeometry(1,_animalSeg,_animalLow?7:12);
    for(var _di2=0;_di2<6;_di2++){
        var dg=new THREE.Group();
        dg.scale.setScalar(1.65);
        var dbody=new THREE.Mesh(new THREE.SphereGeometry(0.4,_animalSeg,_animalLow?8:14),_deerFur);
        dbody.scale.set(0.72,0.62,1.15);dbody.position.y=0.72;dg.add(dbody);
        // White belly
        var dbelly=new THREE.Mesh(_deerSmallGeo,_deerLight);
        dbelly.scale.set(0.20,0.17,0.31);dbelly.position.set(0,0.68,0.38);dg.add(dbelly);
        // A short rounded neck and larger head make the deer elegant but approachable.
        var dneck=new THREE.Mesh(new THREE.CapsuleGeometry(0.13,0.28,_animalLow?3:6,_animalSeg),_deerFur);
        dneck.position.set(0,0.96,0.23);dneck.rotation.x=-0.28;dg.add(dneck);
        var dhead=new THREE.Mesh(new THREE.SphereGeometry(0.23,_animalSeg,_animalLow?8:14),_deerFur);
        dhead.scale.set(0.96,1.00,0.92);dhead.position.set(0,1.18,0.43);dg.add(dhead);
        var dmuzzle=new THREE.Mesh(_deerSmallGeo,_deerLight);
        dmuzzle.scale.set(0.125,0.085,0.14);dmuzzle.position.set(0,1.09,0.62);dg.add(dmuzzle);
        // Broad ears with warm inner ear panels.
        var _dEars=[];
        [-1,1].forEach(function(s){
            var dearGroup=new THREE.Group();
            dearGroup.position.set(s*0.19,1.32,0.39);dearGroup.rotation.z=-s*0.42;dg.add(dearGroup);
            var dear=new THREE.Mesh(new THREE.SphereGeometry(0.10,_animalSeg,_animalLow?7:12),_deerFur);
            dear.scale.set(1.05,0.42,0.50);dearGroup.add(dear);
            var dearIn=new THREE.Mesh(_deerSmallGeo,_deerInner);
            dearIn.scale.set(0.066,0.025,0.027);dearIn.position.set(s*0.015,0.005,0.055);dearGroup.add(dearIn);
            _dEars.push(dearGroup);
        });
        // Large glossy eyes, highlights and blush.
        [-1,1].forEach(function(s){
            var deye=new THREE.Mesh(_deerSmallGeo,_deerEye);
            deye.scale.set(0.058,0.078,0.033);deye.position.set(s*0.095,1.205,0.628);dg.add(deye);
            var dshine=new THREE.Mesh(_deerSmallGeo,_deerLight);
            dshine.scale.setScalar(0.016);dshine.position.set(s*0.082,1.232,0.658);dg.add(dshine);
            var dcheek=new THREE.Mesh(_deerSmallGeo,_deerInner);
            dcheek.scale.set(0.052,0.026,0.016);dcheek.position.set(s*0.155,1.105,0.590);dg.add(dcheek);
        });
        // Nose
        var dnose=new THREE.Mesh(_deerSmallGeo,_deerEye);
        dnose.scale.set(0.040,0.028,0.026);dnose.position.set(0,1.08,0.746);dg.add(dnose);
        // Small rounded antlers keep the species readable without overpowering the face.
        [-1,1].forEach(function(s){
            var antler=new THREE.Mesh(new THREE.CapsuleGeometry(0.025,0.20,_animalLow?2:4,8),_deerAntler);
            antler.position.set(s*0.095,1.45,0.38);antler.rotation.z=-s*0.20;dg.add(antler);
            var antlerTip=new THREE.Mesh(new THREE.CapsuleGeometry(0.020,0.10,_animalLow?2:4,8),_deerAntler);
            antlerTip.position.set(s*0.17,1.52,0.38);antlerTip.rotation.z=-s*0.78;dg.add(antlerTip);
        });
        // Four tapered legs use hip pivots so the diagonal gait reads naturally.
        var _dLegs=[];
        [
            {x:-0.12,z:0.25,name:'front-left',diagonal:1},
            {x:0.12,z:0.25,name:'front-right',diagonal:-1},
            {x:-0.12,z:-0.25,name:'back-left',diagonal:-1},
            {x:0.12,z:-0.25,name:'back-right',diagonal:1}
        ].forEach(function(lp){
            var dlegPivot=new THREE.Group();dlegPivot.position.set(lp.x,0.58,lp.z);dg.add(dlegPivot);
            dlegPivot.userData.legName=lp.name;
            dlegPivot.userData.diagonalPhase=lp.diagonal;
            dlegPivot.userData.baseY=0.58;
            var dleg=new THREE.Mesh(new THREE.CylinderGeometry(0.034,0.050,0.52,8),_deerFur);
            dleg.position.y=-0.26;dlegPivot.add(dleg);
            var dhoof=new THREE.Mesh(new THREE.SphereGeometry(0.052,8,_animalLow?5:7),_deerHoof);
            dhoof.scale.set(0.86,0.58,1.15);dhoof.position.set(0,-0.525,0.018);dlegPivot.add(dhoof);
            _dLegs.push(dlegPivot);
        });
        // Tail
        var dtail=new THREE.Mesh(_deerSmallGeo,_deerLight);
        dtail.scale.set(0.07,0.095,0.07);dtail.position.set(0,0.79,-0.49);dg.add(dtail);
        // Ordered fawn spots avoid noisy random placement and strengthen the animated-film pattern.
        [[-0.18,0.82,-0.12],[0.18,0.82,-0.12],[-0.16,0.72,0.05],[0.16,0.72,0.05],[-0.13,0.89,0.13],[0.13,0.89,0.13]].forEach(function(sp){
            var dspot=new THREE.Mesh(_deerSmallGeo,_deerLight);
            dspot.scale.set(0.045,0.034,0.022);dspot.position.set(sp[0],sp[1],sp[2]);
            dg.add(dspot);
        });
        dg.userData.animalParts={head:dhead,ears:_dEars,legs:_dLegs,tail:dtail,headBaseY:1.18};
        var dx3=(Math.random()-0.5)*80,dz3=(Math.random()-0.5)*80;
        dg.position.set(dx3,0,dz3);
        cityGroup.add(dg);
        var _dAnimal={group:dg,type:'deer',x:dx3,y:0,z:dz3,
            vx:0,vy:0,vz:0,state:'walk',stateTimer:120+Math.floor(Math.random()*180),
            walkPhase:0,moveDir:Math.random()*Math.PI*2};
        window._cityAnimals.push(_dAnimal);
        var _dProp={group:dg,x:dx3,z:dz3,radius:1.1,type:'deer',grabbed:false,origY:0,throwVx:0,throwVy:0,throwVz:0,throwTimer:0,weight:1.0,_animal:_dAnimal};
        _dAnimal._propRef=_dProp;
        cityProps.push(_dProp);
    }
    // ---- Ocean with waves (below city ground, waves must NOT reach y=0) ----
    var oceanGeo = new THREE.PlaneGeometry(CITY_SIZE*8, CITY_SIZE*8, 40, 40);
    var oceanMat = toon(0x2266AA, {transparent:true, opacity:0.7});
    var ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.rotation.x = -Math.PI/2;
    ocean.position.y = -4;
    window._oceanMesh = ocean;
    // Wave foam rings at different radii
    var _waveRings=[];
    for(var _wri=0;_wri<4;_wri++){
        var wr=CITY_SIZE+10+_wri*40;
        var wring=new THREE.Mesh(new THREE.TorusGeometry(wr,0.8,4,48),
            toon(0xAADDFF,{transparent:true,opacity:0.3+_wri*0.05}));
        wring.rotation.x=Math.PI/2;wring.position.y=-3.5;
        cityGroup.add(wring);_waveRings.push(wring);
    }
    window._waveRings=_waveRings;
    cityGroup.add(ocean);
    // ---- Boats (6) — on the ocean beyond city bounds ----
    var _boatColors=[0xCC3333,0x3366CC,0xFFCC00,0x33AA55,0xFF6600,0x9933CC];
    for(var _bi2=0;_bi2<6;_bi2++){
        var boatAngle=(_bi2/6)*Math.PI*2+Math.random()*0.5;
        var boatDist=180+Math.random()*170;
        var bx2=Math.cos(boatAngle)*boatDist,bz2=Math.sin(boatAngle)*boatDist;
        var btg=new THREE.Group();
        // Hull
        var hull=new THREE.Mesh(new THREE.BoxGeometry(2,0.6,5),toon(_boatColors[_bi2]));
        hull.scale.set(1,0.6,1);hull.position.y=0;btg.add(hull);
        // Cabin
        var cabin=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.8,1.5),toon(0xEEDDCC));
        cabin.position.set(0,0.6,-0.5);btg.add(cabin);
        // Mast
        var mast=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,3,4),toon(0x886644));
        mast.position.set(0,1.8,0.5);btg.add(mast);
        // Flag
        var flag=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.4,0.03),toon(0xFF4444));
        flag.position.set(0.4,3.0,0.5);btg.add(flag);
        btg.position.set(bx2,-3.5,bz2);
        btg.rotation.y=boatAngle+Math.PI/2;
        cityGroup.add(btg);
        window._cityAnimals.push({group:btg,type:'boat',x:bx2,y:-3.5,z:bz2,
            vx:0,vy:0,vz:0,state:'drift',stateTimer:9999,
            circleAngle:boatAngle,circleDist:boatDist,rockPhase:Math.random()*Math.PI*2});
    }
    // ---- Flying Fish (10) — on the ocean ----
    for(var _fi2=0;_fi2<10;_fi2++){
        var ffAngle=Math.random()*Math.PI*2;
        var ffDist=180+Math.random()*170;
        var ffx=Math.cos(ffAngle)*ffDist,ffz=Math.sin(ffAngle)*ffDist;
        var ffg=new THREE.Group();
        // Body
        var ffbody=new THREE.Mesh(new THREE.SphereGeometry(0.15,6,4),toon(0x6699CC));
        ffbody.scale.set(0.5,0.4,1.5);ffg.add(ffbody);
        // Tail fin
        var fftail=new THREE.Mesh(new THREE.BoxGeometry(0.02,0.12,0.12),toon(0x4477AA));
        fftail.position.set(0,0.02,-0.22);fftail.rotation.x=0.2;ffg.add(fftail);
        // Side fins
        [-1,1].forEach(function(s){
            var ffin=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.02,0.1),toon(0x88BBDD));
            ffin.position.set(s*0.1,0,0.05);ffin.userData._side=s;ffg.add(ffin);
        });
        ffg.position.set(ffx,-3.5,ffz);
        cityGroup.add(ffg);
        window._cityAnimals.push({group:ffg,type:'flyingFish',x:ffx,y:-3.5,z:ffz,
            vx:0,vy:0,vz:0,state:'underwater',stateTimer:30+Math.floor(Math.random()*120),
            jumpPhase:0,moveDir:Math.random()*Math.PI*2,jumpSpeed:0.08+Math.random()*0.04,
            baseX:ffx,baseZ:ffz});
    }
    // (Hidden entrances removed — moon only reachable from cloud world)
    } // end if not Sakura (fountain/canal/waterwheel/fish/lamp/bench/animals)

    // ===============================================================
    //  Sakura City — Ginzan Onsen (銀山温泉)
    // ===============================================================
    if(currentCityStyle===6){try{
        var _jWinM=_citySharedPBR('sakura-window',0xFFDD88,{roughness:0.16,clearcoat:0.44,clearcoatRoughness:0.18,envMapIntensity:0.44,emissive:0xFFAA44,emissiveIntensity:0.5});
        var _jStoneM=_citySurfaceMaterial('foundation',0x888888,{roughness:0.92,bumpScale:0.08});
        var _jRedM=_citySurfaceMaterial('wood',0xCC3333,{roughness:0.46,bumpScale:0.045,clearcoat:0.18,clearcoatRoughness:0.42,envMapIntensity:0.30});
        var _jDarkRoof=_citySurfaceMaterial('roof',0x333333,{roughness:0.72,bumpScale:0.11,envMapIntensity:0.26});
        var _jWoodM=_citySurfaceMaterial('wood',0xBB9966,{roughness:0.82,bumpScale:0.10,envMapIntensity:0.18});
        // Helper: build a Japanese building with roof, engawa, windows, collider
        function _buildJpn(x,z,w,d,h,wallColor){
            var col=wallColor||0xDDAA88;
            var bodyGeo=new THREE.BoxGeometry(w,h,d,2,2,2);if(typeof _visualBoxWorldUV==='function')_visualBoxWorldUV(bodyGeo,2.4);
            var body=new THREE.Mesh(bodyGeo,_citySurfaceMaterial('facade',col,{roughness:0.86,bumpScale:0.028,vertexColors:false}));
            body.position.set(x,h/2,z);body.castShadow=true;body.receiveShadow=true;cityGroup.add(body);
            var ms=[body];
            // Flat overhanging roof
            var rW=w*1.4,rD=d*1.4,rH=0.4;
            var roof=new THREE.Mesh(new THREE.BoxGeometry(rW,rH,rD),_jDarkRoof);
            roof.position.set(x,h+rH/2,z);roof.castShadow=true;cityGroup.add(roof);ms.push(roof);
            var roof2=new THREE.Mesh(new THREE.BoxGeometry(rW+0.8,0.15,rD+0.8),_jDarkRoof);
            roof2.position.set(x,h+rH+0.08,z);cityGroup.add(roof2);ms.push(roof2);
            // Ridge beam
            var ridge=new THREE.Mesh(new THREE.BoxGeometry(rW*0.7,0.18,0.18),_jDarkRoof);
            ridge.position.set(x,h+rH+0.22,z);cityGroup.add(ridge);ms.push(ridge);
            // Engawa porch
            var eng=new THREE.Mesh(new THREE.BoxGeometry(w+1.2,0.12,d+1.2),_jWoodM);
            eng.position.set(x,0.06,z);cityGroup.add(eng);ms.push(eng);
            // Warm shouji windows
            for(var wy=1.5;wy<h-0.5;wy+=2){
                for(var wx=-w/2+1.2;wx<w/2-0.8;wx+=2){
                    var wn=new THREE.Mesh(new THREE.BoxGeometry(0.8,1.2,0.15),_jWinM);
                    wn.position.set(x+wx,wy,z+d/2+0.08);cityGroup.add(wn);ms.push(wn);
                    var wn2=new THREE.Mesh(new THREE.BoxGeometry(0.8,1.2,0.15),_jWinM);
                    wn2.position.set(x+wx,wy,z-d/2-0.08);cityGroup.add(wn2);ms.push(wn2);
                }
            }
            // Noren curtain (door)
            var noren=new THREE.Mesh(new THREE.BoxGeometry(1.5,2,0.1),softPBR(0x884433,{roughness:0.96,sheen:0.12,sheenRoughness:0.92,sheenColor:new THREE.Color(0xAA6655)}));
            noren.position.set(x,1,z+d/2+0.1);cityGroup.add(noren);ms.push(noren);
            cityColliders.push({x:x,z:z,hw:w/2+0.5,hd:d/2+0.5,h:h});
            cityBuildingMeshes.push({meshes:ms,x:x,z:z,hw:w/2,hd:d/2,h:h});
        }
        // Helper: elevated Japanese building (on plateau)
        function _buildJpnElev(x,z,w,d,h,wallColor,baseY,faceDir){
            var _darkWood=_citySurfaceMaterial('wood',0x3E2723,{roughness:0.88,bumpScale:0.12,envMapIntensity:0.14});
            var _plaster=_citySurfaceMaterial('facade',(wallColor&&wallColor>0x100)?wallColor:0xF5F0E8,{roughness:0.88,bumpScale:0.028,envMapIntensity:0.15}); // white plaster unless special color
            var ms=[];
            var floors=Math.max(2,Math.round(h/3)); // ~3 units per floor
            var floorH=h/floors;
            // Per-floor construction (stepped slightly for upper floors)
            for(var fi=0;fi<floors;fi++){
                var _fw=w-fi*0.3, _fd=d-fi*0.3; // slight taper
                var _fy=baseY+fi*floorH;
                // Wall (white plaster)
                var wall=new THREE.Mesh(new THREE.BoxGeometry(_fw,floorH-0.15,_fd),_plaster);
                wall.position.set(x,_fy+floorH/2,z);wall.castShadow=true;wall.receiveShadow=true;
                cityGroup.add(wall);ms.push(wall);
                // Dark wood horizontal beam between floors
                var beam=new THREE.Mesh(new THREE.BoxGeometry(_fw+0.3,0.15,_fd+0.3),_darkWood);
                beam.position.set(x,_fy+floorH,z);cityGroup.add(beam);ms.push(beam);
                // Balcony on river-facing side (wooden platform + railing)
                if(fi>0){
                    var _balcSide=faceDir||0;
                    // Balcony extends on all visible sides
                    var balcony=new THREE.Mesh(new THREE.BoxGeometry(_fw+1.0,0.1,_fd+1.0),_darkWood);
                    balcony.position.set(x,_fy+0.05,z);cityGroup.add(balcony);ms.push(balcony);
                    // Railings (horizontal bars)
                    var _railH=0.8;
                    // Z-face railings
                    [-1,1].forEach(function(s){
                        // Top rail
                        var topR=new THREE.Mesh(new THREE.BoxGeometry(_fw+1,0.06,0.06),_darkWood);
                        topR.position.set(x,_fy+_railH,z+s*(_fd/2+0.5));cityGroup.add(topR);ms.push(topR);
                        // Mid rail
                        var midR=new THREE.Mesh(new THREE.BoxGeometry(_fw+1,0.06,0.06),_darkWood);
                        midR.position.set(x,_fy+_railH*0.5,z+s*(_fd/2+0.5));cityGroup.add(midR);ms.push(midR);
                    });
                    // X-face railings
                    [-1,1].forEach(function(s){
                        var topR2=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.06,_fd+1),_darkWood);
                        topR2.position.set(x+s*(_fw/2+0.5),_fy+_railH,z);cityGroup.add(topR2);ms.push(topR2);
                        var midR2=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.06,_fd+1),_darkWood);
                        midR2.position.set(x+s*(_fw/2+0.5),_fy+_railH*0.5,z);cityGroup.add(midR2);ms.push(midR2);
                    });
                }
                // Dark wood vertical posts on corners
                [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(function(c){
                    var post=new THREE.Mesh(new THREE.BoxGeometry(0.15,floorH,0.15),_darkWood);
                    post.position.set(x+c[0]*_fw/2,_fy+floorH/2,z+c[1]*_fd/2);cityGroup.add(post);ms.push(post);
                });
                // Lattice windows (格子窓) — dark grid over warm glow
                // Z faces
                for(var wz=-_fd/2+1.5;wz<_fd/2-1;wz+=2.5){
                    [-1,1].forEach(function(s){
                        // Warm glow behind
                        var glow=new THREE.Mesh(new THREE.BoxGeometry(_fw*0.01,floorH*0.55,1.5),_jWinM);
                        glow.position.set(x+s*(_fw/2+0.05),_fy+floorH*0.55,z+wz);cityGroup.add(glow);ms.push(glow);
                    });
                }
                // X faces
                for(var wx=-_fw/2+1.5;wx<_fw/2-1;wx+=2.5){
                    [-1,1].forEach(function(s){
                        var glow2=new THREE.Mesh(new THREE.BoxGeometry(1.5,floorH*0.55,_fd*0.01),_jWinM);
                        glow2.position.set(x+wx,_fy+floorH*0.55,z+s*(_fd/2+0.05));cityGroup.add(glow2);ms.push(glow2);
                    });
                }
            }
            // Roof — overhanging dark tile
            var rW=w*1.3,rD=d*1.3;
            var roof=new THREE.Mesh(new THREE.BoxGeometry(rW,0.4,rD),_jDarkRoof);
            roof.position.set(x,baseY+h+0.2,z);roof.castShadow=true;cityGroup.add(roof);ms.push(roof);
            var roof2=new THREE.Mesh(new THREE.BoxGeometry(rW+0.5,0.15,rD+0.5),_jDarkRoof);
            roof2.position.set(x,baseY+h+0.5,z);cityGroup.add(roof2);ms.push(roof2);
            // Ridge
            var ridge=new THREE.Mesh(new THREE.BoxGeometry(rW*0.6,0.2,0.2),_jDarkRoof);
            ridge.position.set(x,baseY+h+0.7,z);cityGroup.add(ridge);ms.push(ridge);
            // Ground floor noren
            var _norenSide=faceDir>0?1:(faceDir<0?-1:0);
            if(_norenSide){
                var noren=new THREE.Mesh(new THREE.BoxGeometry(0.08,1.8,1.2),toon(0x223366));
                noren.position.set(x+_norenSide*(w/2+0.1),baseY+1.2,z);cityGroup.add(noren);ms.push(noren);
            } else {
                var noren2=new THREE.Mesh(new THREE.BoxGeometry(1.2,1.8,0.08),toon(0x223366));
                noren2.position.set(x,baseY+1.2,z+d/2+0.1);cityGroup.add(noren2);ms.push(noren2);
            }
            cityColliders.push({x:x,z:z,hw:w/2+0.5,hd:d/2+0.5,h:baseY+h,y:baseY});
            cityBuildingMeshes.push({meshes:ms,x:x,z:z,hw:w/2,hd:d/2,h:baseY+h});
        }
        // Helper: stone lantern (toro), optionally elevated
        function _buildToro(x,z,elev){
            var _ty=elev||0;
            var tg=new THREE.Group();tg.position.set(x,_ty,z);
            tg.add(new THREE.Mesh(new THREE.BoxGeometry(0.5,0.25,0.5),_jStoneM));tg.children[0].position.y=0.12;
            tg.add(new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.1,1.4,6),_jStoneM));tg.children[1].position.y=0.95;
            tg.add(new THREE.Mesh(new THREE.BoxGeometry(0.45,0.35,0.45),toon(0xFFDD88,{emissive:0xFFDD88,emissiveIntensity:0.5})));tg.children[2].position.y=1.85;
            tg.add(new THREE.Mesh(new THREE.ConeGeometry(0.4,0.3,4),_jStoneM));tg.children[3].position.y=2.2;tg.children[3].rotation.y=Math.PI/4;
            cityGroup.add(tg);
        }

        // === 1. Mixed buildings — ryokan, shops, cafes (温泉街の建物) ===
        var _leftBlds=[
            // Left bank: all in one line (x=-25), alternating ryokan + shops
            {x:-30,z:-100,w:13,d:14,h:15,c:0,face:1},       // 能登屋旅館
            {x:-30,z:-85,w:10,d:11,h:8,c:0xEEDDBB,face:1},  // 伊豆の華 (warm wood shop)
            {x:-30,z:-70,w:13,d:14,h:14,c:0,face:1},        // 古山閣
            {x:-30,z:-55,w:10,d:11,h:8,c:0xDDCCAA,face:1},  // はいからさん通り
            // z=-36: 油屋 (built separately)
            {x:-30,z:-20,w:10,d:11,h:8,c:0xCCBB99,face:1},  // 酒茶房
            {x:-30,z:-5,w:13,d:14,h:13,c:0,face:1},         // 瀧見館
            {x:-30,z:10,w:10,d:11,h:8,c:0xEECCBB,face:1},   // 野川とうふ屋
            {x:-30,z:25,w:13,d:14,h:15,c:0,face:1},         // 永澤平八
            {x:-30,z:40,w:10,d:11,h:8,c:0xDDBBAA,face:1},   // 大正ロマン館
            {x:-30,z:55,w:13,d:14,h:12,c:0,face:1},         // 昭和館
            {x:-30,z:70,w:10,d:11,h:8,c:0xEEDDCC,face:1},   // カリー屋
            {x:-30,z:85,w:13,d:14,h:14,c:0,face:1},         // 銀山荘
            {x:-30,z:100,w:10,d:11,h:8,c:0xCCBBAA,face:1}   // まんじゅう屋
        ];
        var _rightBlds=[
            {x:30,z:-95,w:13,d:14,h:14,c:0,face:-1},        // 古勢起屋
            {x:30,z:-80,w:10,d:11,h:8,c:0xDDCCAA,face:-1},  // そば処
            {x:30,z:-65,w:13,d:14,h:13,c:0,face:-1},        // 仙峡の宿
            {x:30,z:-50,w:10,d:11,h:8,c:0xEECCBB,face:-1},  // 煎餅屋
            {x:30,z:-35,w:13,d:14,h:15,c:0,face:-1},        // 旅館藤屋
            {x:30,z:-20,w:10,d:11,h:8,c:0xCCBB99,face:-1},  // 足湯カフェ
            {x:30,z:-5,w:13,d:14,h:12,c:0,face:-1},         // 味よし旅館
            {x:30,z:10,w:10,d:11,h:8,c:0xDDBBAA,face:-1},   // だんご屋
            {x:30,z:25,w:13,d:14,h:15,c:0,face:-1},         // しろがね湯
            {x:30,z:40,w:10,d:11,h:8,c:0xEEDDBB,face:-1},   // 漬物屋
            {x:30,z:55,w:13,d:14,h:13,c:0,face:-1},         // 春木屋
            {x:30,z:70,w:10,d:11,h:8,c:0xDDCCAA,face:-1},   // アイス屋
            {x:30,z:85,w:13,d:14,h:14,c:0,face:-1},         // 小関館
            {x:30,z:100,w:10,d:11,h:8,c:0xCCBBAA,face:-1}   // 甘酒屋
        ];
        // Riverside weeping sakura (垂桜) — skip at bridge entrances
        var _allBridgeZ=[-60,-30,0,30,60];
        for(var _rsti=0;_rsti<14;_rsti++){
            var _rstZ=-100+_rsti*15+((_rsti%2)*7);
            // Skip if too close to any bridge
            var _nearBridge=false;
            for(var _nbi=0;_nbi<_allBridgeZ.length;_nbi++){if(DANBO_WASM.absDeltaLess(_rstZ,_allBridgeZ[_nbi],8))_nearBridge=true;}
            if(_nearBridge)continue;
            [[-11,0.3],[11,-0.3]].forEach(function(sxr){
                var sx=sxr[0],_lean=sxr[1];
                var _rstG=new THREE.Group();_rstG.position.set(sx,_pH,_rstZ);
                _rstG.rotation.z=_lean; // lean toward river
                var _rstH=5+Math.random()*2;
                var rstTrunk=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.35,_rstH,6),toon(0x6B4226));
                rstTrunk.position.y=_rstH/2;_rstG.add(rstTrunk);
                var _rstCols=[0xFFAABB,0xFFBBCC,0xFFCCDD];
                for(var _rsci=0;_rsci<3;_rsci++){
                    var _rscr=2+Math.random()*1.5;
                    var _rscOff=_rsci*(Math.PI*2/3);
                    var sakC=new THREE.Mesh(new THREE.SphereGeometry(_rscr,6,5),toon(_rstCols[_rsci],{transparent:true,opacity:0.85}));
                    sakC.position.set(Math.cos(_rscOff)*_rscr*0.3,_rstH+_rscr*0.3,Math.sin(_rscOff)*_rscr*0.3);
                    sakC.scale.y=0.6;_rstG.add(sakC);
                }
                // Weeping branches (垂樱) — long drooping branches with petal clusters
                for(var _wbi2=0;_wbi2<7;_wbi2++){
                    var _wbA=_wbi2*(Math.PI*2/7)+Math.random()*0.3;
                    var _wbL=3+Math.random()*2; // longer branches
                    var _wbM=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.05,_wbL,3),toon(0x6B4226));
                    _wbM.position.set(Math.cos(_wbA)*_wbL*0.35,_rstH-_wbL*0.35,Math.sin(_wbA)*_wbL*0.35);
                    _wbM.rotation.z=Math.cos(_wbA)*1.0;_wbM.rotation.x=-Math.sin(_wbA)*1.0;_rstG.add(_wbM);
                    // Multiple petal clusters along each branch
                    for(var _wpc2=0;_wpc2<3;_wpc2++){
                        var _wpD=0.3+_wpc2*0.25;
                        var _wpc=new THREE.Mesh(new THREE.SphereGeometry(0.4+_wpc2*0.15,4,3),toon(_rstCols[(_wbi2+_wpc2)%3],{transparent:true,opacity:0.8}));
                        _wpc.position.set(Math.cos(_wbA)*_wbL*_wpD,_rstH-_wbL*_wpD*0.8,Math.sin(_wbA)*_wbL*_wpD);_rstG.add(_wpc);
                    }
                }
                cityGroup.add(_rstG);
                cityBuildingMeshes.push({meshes:_rstG.children.slice(),x:sx,z:_rstZ,hw:3,hd:3,h:_pH+_rstH});
            });
        }
        var _allJpnB=[].concat(_leftBlds,_rightBlds);
        for(var _jbi=0;_jbi<_allJpnB.length;_jbi++){
            var jb=_allJpnB[_jbi];
            _buildJpnElev(jb.x,jb.z,jb.w,jb.d,jb.h,jb.c,_pH,jb.face||0);
        }

        // === 2. The Bathhouse (油屋) — large building at end of street ===
        var _bhX=-30,_bhZ=-40;
        // Build 油屋 using _buildJpnElev (same style as other ryokan but 8-story)
        _buildJpnElev(_bhX,_bhZ,14,14,24,0x8B2500,_pH,1);
        // Add red trim layers at 1/3 and 2/3 height (千と千寻 signature)
        var _by=_pH;
        var _bhRedTrim1=new THREE.Mesh(new THREE.BoxGeometry(15,0.5,15),_jRedM);
        _bhRedTrim1.position.set(_bhX,_by+8.5,_bhZ);cityGroup.add(_bhRedTrim1);
        var _bhRedTrim2=new THREE.Mesh(new THREE.BoxGeometry(14,0.5,14),_jRedM);
        _bhRedTrim2.position.set(_bhX,_by+16.5,_bhZ);cityGroup.add(_bhRedTrim2);
        // Corner lanterns (4)
        var _bhLP=[[-8,_by+24.5,8],[-8,_by+24.5,-8],[8,_by+24.5,8],[8,_by+24.5,-8]];
        for(var _bli2=0;_bli2<_bhLP.length;_bli2++){
            var lp=_bhLP[_bli2];
            var bLan=new THREE.Mesh(new THREE.SphereGeometry(0.6,6,4),toon(0xFF6644,{emissive:0xFF4422,emissiveIntensity:0.6}));
            bLan.position.set(_bhX+lp[0],lp[1],_bhZ+lp[2]);cityGroup.add(bLan);
        }
        // Bathhouse name sign
        var _bhSignC=document.createElement('canvas');_bhSignC.width=256;_bhSignC.height=64;
        var _bhCtx=_bhSignC.getContext('2d');
        _bhCtx.fillStyle='rgba(80,20,0,0.8)';_bhCtx.fillRect(0,0,256,64);
        _bhCtx.fillStyle='#FFD700';_bhCtx.font='bold 40px serif';_bhCtx.textAlign='center';
        _bhCtx.fillText('\u6CB9\u5C4B',128,46);
        var _bhTex=new THREE.CanvasTexture(_bhSignC);
        var _bhSign=new THREE.Sprite(new THREE.SpriteMaterial({map:_bhTex,transparent:true}));
        _bhSign.scale.set(5,1.5,1);_bhSign.position.set(_bhX,_by+14,_bhZ+7.5);cityGroup.add(_bhSign);

        // === 3. Deep gorge river (深い渓流) ===
        window._sakuraCanalWater=[];
        // Deep canyon floor
        var _canyonFloor=new THREE.Mesh(new THREE.BoxGeometry(16,0.3,260),toon(0x334433));
        _canyonFloor.position.set(0,0.15,0);cityGroup.add(_canyonFloor);
        // Stone embankment walls + railing posts with bridge gaps
        var _bridgeZones=[-60,-30,0,30,60]; // z positions of all bridges
        [-1,1].forEach(function(side){
            // Cliff wall (visual)
            var _embWall=new THREE.Mesh(new THREE.BoxGeometry(1.5,_pH,260),toon(0x887766));
            _embWall.position.set(side*8,_pH/2,0);_embWall.castShadow=true;cityGroup.add(_embWall);
            var _embCap=new THREE.Mesh(new THREE.BoxGeometry(2,0.4,260),toon(0x999888));
            _embCap.position.set(side*8,_pH+0.2,0);cityGroup.add(_embCap);
            // Stone texture strips
            for(var _esi=0;_esi<6;_esi++){
                var _esLine=new THREE.Mesh(new THREE.BoxGeometry(1.55,0.08,260),toon(0x776655));
                _esLine.position.set(side*8,1+_esi*1.2,0);cityGroup.add(_esLine);
            }
            // Railing posts along edge — skip at bridge positions
            for(var _rz=-120;_rz<=120;_rz+=3){
                // Check if this position overlaps a bridge
                var _atBridge=false;
                for(var _bci2=0;_bci2<_bridgeZones.length;_bci2++){
                    if(DANBO_WASM.absDeltaLess(_rz,_bridgeZones[_bci2],5))_atBridge=true;
                }
                if(_atBridge)continue;
                // Vertical post
                var _post=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,1.2,4),toon(0x887766));
                _post.position.set(side*8,_pH+0.6,_rz);cityGroup.add(_post);
                // Top ball
                var _ball=new THREE.Mesh(new THREE.SphereGeometry(0.18,4,3),toon(0x999888));
                _ball.position.set(side*8,_pH+1.2,_rz);cityGroup.add(_ball);
            }
            // Horizontal rail between posts (skip bridge gaps)
            for(var _rz2=-120;_rz2<=117;_rz2+=3){
                var _atB1=false,_atB2=false;
                for(var _bci3=0;_bci3<_bridgeZones.length;_bci3++){
                    if(DANBO_WASM.absDeltaLess(_rz2,_bridgeZones[_bci3],5))_atB1=true;
                    if(DANBO_WASM.absDeltaLess(_rz2+3,_bridgeZones[_bci3],5))_atB2=true;
                }
                if(_atB1||_atB2)continue;
                var _hRail=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.08,3),toon(0x887766));
                _hRail.position.set(side*8,_pH+1.0,_rz2+1.5);cityGroup.add(_hRail);
            }
            // Railing colliders — continuous thin walls, gap only at bridges
            // Sort bridge zones and create wall segments between them
            var _sortedBZ=_bridgeZones.slice().sort(function(a,b){return a-b;});
            var _wallStart=-125;
            for(var _bwi4=0;_bwi4<=_sortedBZ.length;_bwi4++){
                var _wallEnd=(_bwi4<_sortedBZ.length)?_sortedBZ[_bwi4]-5:125;
                if(_wallEnd>_wallStart+1){
                    var _wMid=(_wallStart+_wallEnd)/2;
                    var _wHalf=(_wallEnd-_wallStart)/2;
                    cityColliders.push({x:side*8,z:_wMid,hw:1.5,hd:_wHalf,h:_pH+1.3});
                }
                _wallStart=(_bwi4<_sortedBZ.length)?_sortedBZ[_bwi4]+5:999;
            }
        });
        // Water at bottom of gorge (y=2, plateau at y=8, so 6 units deep)
        for(var _rsi2=0;_rsi2<8;_rsi2++){
            var _rz2=-110+_rsi2*28;
            var rSeg=new THREE.Mesh(new THREE.BoxGeometry(14,0.15,30),toon(0x225566,{transparent:true,opacity:0.65}));
            rSeg.position.set(0,2,_rz2);cityGroup.add(rSeg);
            window._sakuraCanalWater.push(rSeg);
        }
        // Rocks in gorge
        for(var _rki=0;_rki<25;_rki++){
            var _rkx=(Math.random()-0.5)*12,_rkz=(Math.random()-0.5)*240;
            var sRock=new THREE.Mesh(new THREE.SphereGeometry(0.4+Math.random()*0.8,5,4),toon(0x667766));
            sRock.position.set(_rkx,0.3+Math.random()*1.5,_rkz);sRock.scale.set(1,0.6,1);cityGroup.add(sRock);
        }

        // === 4. Big bridges spanning gorge at plateau height ===
        // Wooden bridges (wide, at y=8)
        var _woodBridgeZs=[-60,0,60];
        for(var _wbi=0;_wbi<_woodBridgeZs.length;_wbi++){
            var _wbZ=_woodBridgeZs[_wbi];
            var _wbMeshes=[];
            var _wDeck=new THREE.Mesh(new THREE.BoxGeometry(18,0.4,6),_jWoodM);
            _wDeck.position.set(0,_pH-0.2,_wbZ);cityGroup.add(_wDeck);_wbMeshes.push(_wDeck);
            var _wSupport=new THREE.Mesh(new THREE.BoxGeometry(16,0.3,4),toon(0x775533));
            _wSupport.position.set(0,_pH-0.55,_wbZ);cityGroup.add(_wSupport);_wbMeshes.push(_wSupport);
            // Support pillars from ground
            [-5,0,5].forEach(function(px){
                var _pil=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.4,_pH,6),toon(0x664422));
                _pil.position.set(px,_pH/2,_wbZ);cityGroup.add(_pil);
            });
            [-1,1].forEach(function(s){
                var _wRail=new THREE.Mesh(new THREE.BoxGeometry(18,0.15,0.15),_jWoodM);
                _wRail.position.set(0,_pH+1,_wbZ+s*2.7);cityGroup.add(_wRail);
                for(var _wpi3=0;_wpi3<9;_wpi3++){
                    var _wpx2=-8+_wpi3*2;
                    var _wPost=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,1.2,4),_jWoodM);
                    _wPost.position.set(_wpx2,_pH+0.4,_wbZ+s*2.7);cityGroup.add(_wPost);
                }
            });
            cityColliders.push({x:0,z:_wbZ,hw:9,hd:3,h:_pH,_bridge:true});
            // Bridge railing colliders (prevent falling off sides)
            cityColliders.push({x:0,z:_wbZ+2.7,hw:9,hd:0.3,h:_pH+1.5});
            cityColliders.push({x:0,z:_wbZ-2.7,hw:9,hd:0.3,h:_pH+1.5});
            // Side walls at bridge entrance (fill gap between gorge railing and bridge)
            [-1,1].forEach(function(side){
                [-1,1].forEach(function(zs){
                    cityColliders.push({x:side*8,z:_wbZ+zs*3.5,hw:1.5,hd:1.5,h:_pH+1.5});
                });
            });
            cityBuildingMeshes.push({meshes:_wbMeshes,x:0,z:_wbZ,hw:9,hd:3,h:_pH});
        }
        // Red arched bridges (big, spanning gorge)
        var _redBridgeZs=[-30,30];
        for(var _rbzi=0;_rbzi<_redBridgeZs.length;_rbzi++){
            var _rbG=new THREE.Group();var _rbZ=_redBridgeZs[_rbzi];
            _rbG.position.set(0,0,_rbZ);
            var _rbSegs=10,_rbSpan=18,_rbBase=_pH-0.5,_rbArch=2;
            for(var _rbsi=0;_rbsi<_rbSegs;_rbsi++){
                var _rbt=_rbsi/_rbSegs;var _rbnt=(_rbsi+1)/_rbSegs;
                var _rbx=-_rbSpan/2+_rbt*_rbSpan,_rby=_rbBase+Math.sin(_rbt*Math.PI)*_rbArch;
                var _rbnx=-_rbSpan/2+_rbnt*_rbSpan,_rbny=_rbBase+Math.sin(_rbnt*Math.PI)*_rbArch;
                var _rbAng=Math.atan2(_rbny-_rby,_rbnx-_rbx);
                var _rbLen=DANBO_WASM.len2D(_rbnx-_rbx,_rbny-_rby);
                var _rbPlk=new THREE.Mesh(new THREE.BoxGeometry(_rbLen+0.3,0.35,6),_jRedM);
                _rbPlk.position.set((_rbx+_rbnx)/2,(_rby+_rbny)/2,0);_rbPlk.rotation.z=_rbAng;_rbG.add(_rbPlk);
            }
            [-1,1].forEach(function(s){
                for(var _rri=0;_rri<=8;_rri++){
                    var _rrt=_rri/8;var _rrx=-_rbSpan/2+_rrt*_rbSpan,_rry=_rbBase+Math.sin(_rrt*Math.PI)*_rbArch;
                    var rp=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.12,1.5,6),_jRedM);
                    rp.position.set(_rrx,_rry+0.75,s*2.8);_rbG.add(rp);
                    var rb3=new THREE.Mesh(new THREE.SphereGeometry(0.16,5,4),_jRedM);
                    rb3.position.set(_rrx,_rry+1.5,s*2.8);_rbG.add(rb3);
                    if(_rri<8){var _nrt2=(_rri+1)/8;var _nrx2=-_rbSpan/2+_nrt2*_rbSpan,_nry2=_rbBase+Math.sin(_nrt2*Math.PI)*_rbArch;
                    var _hrL2=DANBO_WASM.len2D(_nrx2-_rrx,_nry2-_rry);var _hrA2=Math.atan2(_nry2-_rry,_nrx2-_rrx);
                    var hr2=new THREE.Mesh(new THREE.BoxGeometry(_hrL2,0.1,0.1),_jRedM);
                    hr2.position.set((_rrx+_nrx2)/2,(_rry+_nry2)/2+1.4,s*2.8);hr2.rotation.z=_hrA2;_rbG.add(hr2);}
                }
            });
            cityGroup.add(_rbG);
            // Add all bridge meshes for camera occlusion (transparency when underneath)
            cityBuildingMeshes.push({meshes:_rbG.children.slice(),x:0,z:_rbZ,hw:9,hd:3,h:_rbBase+_rbArch});
            for(var _rbci=0;_rbci<6;_rbci++){var _rbcT=(_rbci+0.5)/6;
                var _rbcH=_rbBase+Math.sin(_rbcT*Math.PI)*_rbArch;
                cityColliders.push({x:-_rbSpan/2+_rbcT*_rbSpan,z:_rbZ,hw:_rbSpan/6/2+0.8,hd:3,h:_rbcH,_bridge:true});}
            // Red bridge railing colliders
            cityColliders.push({x:0,z:_rbZ+2.8,hw:9,hd:0.3,h:_rbBase+_rbArch+1.5});
            cityColliders.push({x:0,z:_rbZ-2.8,hw:9,hd:0.3,h:_rbBase+_rbArch+1.5});
            // Side walls at bridge entrance
            [-1,1].forEach(function(side){
                [-1,1].forEach(function(zs){
                    cityColliders.push({x:side*8,z:_rbZ+zs*3.5,hw:1.5,hd:1.5,h:_pH+1.5});
                });
            });
        }
        // Lanterns on plateau edges
        for(var _gli=0;_gli<14;_gli++){var _glz=-100+_gli*15;_buildToro(-10,_glz,_pH);_buildToro(10,_glz+8,_pH);}
        // Giant weeping sakura along gorge edge (しだれ桜 — cascading curtain style)
        var _petalCols=[0xFFAABB,0xFFBBCC,0xFFCCDD,0xFF99AA,0xFFDDEE];
        for(var _wli=0;_wli<10;_wli++){
            var _wlZ=-90+_wli*20+((_wli%2)*10);
            var _wlNearBr=false;
            for(var _wnbi=0;_wnbi<_allBridgeZ.length;_wnbi++){if(DANBO_WASM.absDeltaLess(_wlZ,_allBridgeZ[_wnbi],10))_wlNearBr=true;}
            if(_wlNearBr)continue;
            [[-10,0.2],[10,-0.2]].forEach(function(sxl){
                var _wlG=new THREE.Group();_wlG.position.set(sxl[0],_pH,_wlZ);
                _wlG.rotation.z=sxl[1];
                var _wlH=12+Math.random()*3; // very tall trunk (above TPS camera)
                // Thick trunk with fork
                var wlTrunk=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.5,_wlH,8),toon(0x5C3317));
                wlTrunk.position.y=_wlH/2;_wlG.add(wlTrunk);
                // Main branches reaching outward (2-3 thick angled branches)
                for(var _mbi=0;_mbi<3;_mbi++){
                    var _mbA=_mbi*(Math.PI*2/3)+Math.random()*0.5;
                    var mbr=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.2,3,4),toon(0x5C3317));
                    mbr.position.set(Math.cos(_mbA)*0.5,_wlH-1,Math.sin(_mbA)*0.5);
                    mbr.rotation.z=Math.cos(_mbA)*0.6;mbr.rotation.x=-Math.sin(_mbA)*0.6;
                    _wlG.add(mbr);
                }
                // Wide flower canopy (large flat spheres forming umbrella)
                for(var _wci=0;_wci<5;_wci++){
                    var _wcOff=_wci*(Math.PI*2/5);
                    var _wcR=3+Math.random()*1.5;
                    var wlCrown=new THREE.Mesh(new THREE.SphereGeometry(_wcR,7,5),toon(_petalCols[_wci],{transparent:true,opacity:0.8}));
                    wlCrown.position.set(Math.cos(_wcOff)*_wcR*0.4,_wlH+0.5,Math.sin(_wcOff)*_wcR*0.4);
                    wlCrown.scale.y=0.4;_wlG.add(wlCrown);
                }
                // Cascading flower curtains — long hanging branches like waterfall
                for(var _wbi3=0;_wbi3<14;_wbi3++){
                    var _wbAngle=_wbi3*(Math.PI*2/14)+Math.random()*0.2;
                    var _wbLen=5+Math.random()*3; // very long (5-8 units)
                    var _wbStartR=1.5+Math.random(); // start from edge of canopy
                    // Branch strand
                    var _wbStrand=new THREE.Mesh(new THREE.CylinderGeometry(0.015,0.035,_wbLen,3),toon(0x6B4226));
                    var _wsx=Math.cos(_wbAngle)*_wbStartR;
                    var _wsz=Math.sin(_wbAngle)*_wbStartR;
                    _wbStrand.position.set(_wsx,_wlH-_wbLen*0.4,_wsz);
                    _wbStrand.rotation.z=Math.cos(_wbAngle)*1.1;
                    _wbStrand.rotation.x=-Math.sin(_wbAngle)*1.1;
                    _wlG.add(_wbStrand);
                    // Dense petal clusters along each strand (4-5 per branch)
                    for(var _wlci=0;_wlci<5;_wlci++){
                        var _wld=0.15+_wlci*0.18;
                        var _pR=0.4+Math.random()*0.3;
                        var petal=new THREE.Mesh(new THREE.SphereGeometry(_pR,4,3),toon(_petalCols[(_wbi3+_wlci)%5],{transparent:true,opacity:0.75}));
                        petal.position.set(Math.cos(_wbAngle)*(_wbStartR+_wbLen*_wld*0.5),_wlH-_wbLen*_wld*0.85,Math.sin(_wbAngle)*(_wbStartR+_wbLen*_wld*0.5));
                        _wlG.add(petal);
                    }
                }
                cityGroup.add(_wlG);
                cityBuildingMeshes.push({meshes:_wlG.children.slice(),x:sxl[0],z:_wlZ,hw:5,hd:5,h:_pH+_wlH});
            });
        }
        // SKIP old bridge code
        if(false){
        // Three bridges at z=-40, z=0, z=40
        // Plateaus are at y=8, bridge starts at y=8 on both ends, arches to y=11
        var _bridgeZs=[-40,0,40];
        for(var _bzi=0;_bzi<_bridgeZs.length;_bzi++){
            var _bridgeG=new THREE.Group();
            var _bgZ=_bridgeZs[_bzi];
            _bridgeG.position.set(0,0,_bgZ);
            var _bSegs=10,_bSpan=18,_bBase=7.8,_bArch=1.8;
            // Arched deck segments
            for(var _bsi=0;_bsi<_bSegs;_bsi++){
                var _bt=_bsi/_bSegs;
                var _bx2=-_bSpan/2+_bt*_bSpan;
                var _by2=_bBase+Math.sin(_bt*Math.PI)*_bArch;
                var _bNext=(_bsi+1)/_bSegs;
                var _bnx=-_bSpan/2+_bNext*_bSpan;
                var _bny2=_bBase+Math.sin(_bNext*Math.PI)*_bArch;
                var _bAngle=Math.atan2(_bny2-_by2,_bnx-_bx2);
                var _bLen=DANBO_WASM.len2D(_bnx-_bx2,_bny2-_by2);
                var plank=new THREE.Mesh(new THREE.BoxGeometry(_bLen+0.3,0.35,7),_jRedM);
                plank.position.set((_bx2+_bnx)/2,(_by2+_bny2)/2,0);
                plank.rotation.z=_bAngle;_bridgeG.add(plank);
            }
            // Railings with handrails following arch
            [-1,1].forEach(function(s){
                for(var _rli=0;_rli<=8;_rli++){
                    var _rlt=_rli/8;
                    var _rlx=-_bSpan/2+_rlt*_bSpan;
                    var _rly=_bBase+Math.sin(_rlt*Math.PI)*_bArch;
                    var rPost=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.12,1.5,6),_jRedM);
                    rPost.position.set(_rlx,_rly+0.75,s*3.2);_bridgeG.add(rPost);
                    var rBall=new THREE.Mesh(new THREE.SphereGeometry(0.18,5,4),_jRedM);
                    rBall.position.set(_rlx,_rly+1.5,s*3.2);_bridgeG.add(rBall);
                    if(_rli<8){
                        var _nlt2=(_rli+1)/8;
                        var _nlx2=-_bSpan/2+_nlt2*_bSpan;
                        var _nly2=_bBase+Math.sin(_nlt2*Math.PI)*_bArch;
                        var _hLen2=DANBO_WASM.len2D(_nlx2-_rlx,_nly2-_rly);
                        var _hAng2=Math.atan2(_nly2-_rly,_nlx2-_rlx);
                        var hRail2=new THREE.Mesh(new THREE.BoxGeometry(_hLen2,0.12,0.12),_jRedM);
                        hRail2.position.set((_rlx+_nlx2)/2,(_rly+_nly2)/2+1.4,s*3.2);
                        hRail2.rotation.z=_hAng2;_bridgeG.add(hRail2);
                    }
                }
            });
            // Step colliders following arch — 8 overlapping segments
            for(var _bci=0;_bci<8;_bci++){
                var _bcT=(_bci+0.5)/8;
                var _bcX=-_bSpan/2+_bcT*_bSpan;
                var _bcH=_bBase+Math.sin(_bcT*Math.PI)*_bArch;
                cityColliders.push({x:_bcX,z:_bgZ,hw:_bSpan/8/2+0.8,hd:3.5,h:_bcH,_bridge:true});
            }
            cityGroup.add(_bridgeG);
        }

        } // end if(false) skip old bridges
        // === Hot Spring Pool on plateau ===
        var _onsenX=60,_onsenZ=-70;
        var _pool1=new THREE.Mesh(new THREE.CylinderGeometry(6,6,0.3,16),toon(0x66BBBB,{transparent:true,opacity:0.55}));
        _pool1.position.set(_onsenX,_pH+0.15,_onsenZ);cityGroup.add(_pool1);
        var _pEdge1=new THREE.Mesh(new THREE.TorusGeometry(7,0.6,6,16),_jStoneM);
        _pEdge1.position.set(_onsenX,_pH+0.35,_onsenZ);_pEdge1.rotation.x=Math.PI/2;cityGroup.add(_pEdge1);
        for(var _ori=0;_ori<6;_ori++){
            var _oa=_ori/6*Math.PI*2;
            var rock=new THREE.Mesh(new THREE.SphereGeometry(0.4+Math.random()*0.5,5,4),toon(0x777766));
            rock.position.set(_onsenX+Math.cos(_oa)*7.5,_pH+0.2,_onsenZ+Math.sin(_oa)*7.5);
            rock.scale.set(1,0.5,1);cityGroup.add(rock);
        }

        // === Fox Shrine (稲荷神社) ===
        var _shX=70,_shZ=40,_shY=_pH;
        // Stone path to shrine
        for(var _spi2=0;_spi2<8;_spi2++){
            var _spStep=new THREE.Mesh(new THREE.BoxGeometry(4,0.15,1.5),_jStoneM);
            _spStep.position.set(_shX,_shY+0.08,_shZ-20+_spi2*3);cityGroup.add(_spStep);
        }
        // 4 red torii gates — facing screen (+z direction)
        for(var _tgi2=0;_tgi2<4;_tgi2++){
            var _tgz2=_shZ-18+_tgi2*4;
            var _toriiG=new THREE.Group();_toriiG.position.set(_shX,_shY,_tgz2);
            [-1,1].forEach(function(s){
                var pil=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.22,5,8),_jRedM);
                pil.position.set(s*2,2.5,0);_toriiG.add(pil);
            });
            var tBeam=new THREE.Mesh(new THREE.BoxGeometry(5.5,0.3,0.4),_jRedM);
            tBeam.position.set(0,4.8,0);_toriiG.add(tBeam);
            var tBeam2=new THREE.Mesh(new THREE.BoxGeometry(4.5,0.2,0.3),_jRedM);
            tBeam2.position.set(0,4.2,0);_toriiG.add(tBeam2);
            cityGroup.add(_toriiG);
        }
        // Main shrine
        var _shrBody=new THREE.Mesh(new THREE.BoxGeometry(8,5,6),_jRedM);
        _shrBody.position.set(_shX,_shY+2.5,_shZ);cityGroup.add(_shrBody);
        cityColliders.push({x:_shX,z:_shZ,hw:4,hd:3,h:_shY+5});
        var _shrRoof=new THREE.Mesh(new THREE.ConeGeometry(6,3,4),_jDarkRoof);
        _shrRoof.position.set(_shX,_shY+6.5,_shZ);_shrRoof.rotation.y=Math.PI/4;cityGroup.add(_shrRoof);
        // Fox statues
        [-1,1].forEach(function(s){
            var fb=new THREE.Mesh(new THREE.ConeGeometry(0.4,1.5,6),toon(0xDDDDDD));
            fb.position.set(_shX+s*3,_shY+0.75,_shZ-10);cityGroup.add(fb);
            var fh=new THREE.Mesh(new THREE.SphereGeometry(0.35,6,4),toon(0xDDDDDD));
            fh.position.set(_shX+s*3,_shY+1.7,_shZ-10);cityGroup.add(fh);
            [-0.15,0.15].forEach(function(ex){
                var ear=new THREE.Mesh(new THREE.ConeGeometry(0.1,0.25,4),toon(0xDDDDDD));
                ear.position.set(_shX+s*3+ex,_shY+2.0,_shZ-10);cityGroup.add(ear);
            });
            var feye=new THREE.Mesh(new THREE.SphereGeometry(0.06,4,3),toon(0xCC0000));
            feye.position.set(_shX+s*3+s*0.15,_shY+1.75,_shZ-9.65);cityGroup.add(feye);
        });
        _buildToro(_shX-4,_shZ-12,_shY);_buildToro(_shX+4,_shZ-12,_shY);
        var _saisen=new THREE.Mesh(new THREE.BoxGeometry(1.5,0.8,0.8),toon(0x442200));
        _saisen.position.set(_shX,_shY+0.4,_shZ-6);cityGroup.add(_saisen);
        cityBuildingMeshes.push({meshes:[_shrBody,_shrRoof],x:_shX,z:_shZ,hw:4,hd:3,h:_shY+5});

        // (Lanterns already placed above with bridges)

        // === 7. Decorative high clouds (薄雲) ===
        for(var _dci=0;_dci<12;_dci++){
            var _dcg=new THREE.Group();
            var _dcx=(Math.random()-0.5)*300;
            var _dcy=40+Math.random()*30;
            var _dcz=(Math.random()-0.5)*300;
            var _dcParts=3+Math.floor(Math.random()*3);
            for(var _dcp=0;_dcp<_dcParts;_dcp++){
                var _dcr=6+Math.random()*8;
                var _dcm=new THREE.Mesh(new THREE.SphereGeometry(_dcr,6,4),
                    new THREE.MeshBasicMaterial({color:0xFFFFFF,transparent:true,opacity:0.25+Math.random()*0.15}));
                _dcm.position.set((Math.random()-0.5)*_dcr*2,Math.random()*2,(Math.random()-0.5)*_dcr);
                _dcm.scale.set(1.5,0.3,1);
                _dcg.add(_dcm);
            }
            _dcg.position.set(_dcx,_dcy,_dcz);
            cityGroup.add(_dcg);
        }

        // === 8. Massive Falling Petal Particles (満開の桜吹雪) ===
        window._sakuraPetals=[];
        var _petalMats=[toon(0xFFAABB),toon(0xFFBBCC),toon(0xFFCCDD),toon(0xFF99AA),toon(0xFFDDEE)];
        // The dense airborne layer is now a single animated GPU Points buffer in
        // visuals.js. The 60 floating water petals below remain authored meshes.
        // Some petals floating on water surface (static decoration)
        for(var _wpi=0;_wpi<60;_wpi++){
            var _wpx=(Math.random()-0.5)*14;
            var _wpz=(Math.random()-0.5)*240;
            var _wpMesh=new THREE.Mesh(new THREE.PlaneGeometry(0.25,0.25),_petalMats[_wpi%5]);
            _wpMesh.material.side=THREE.DoubleSide;
            _wpMesh.position.set(_wpx,1.15,_wpz);
            _wpMesh.rotation.x=-Math.PI/2+Math.random()*0.3;
            _wpMesh.rotation.z=Math.random()*Math.PI*2;
            cityGroup.add(_wpMesh);
        }

        // === 8. Stream Animals (溪流の生き物) ===
        window._sakuraStreamAnimals=[];
        // Ducks (8) swimming in the stream
        for(var _dki2=0;_dki2<8;_dki2++){
            var _dkg=new THREE.Group();
            var _dkBody=new THREE.Mesh(new THREE.SphereGeometry(0.22,6,4),toon(0x8B6914));
            _dkBody.scale.set(0.8,0.7,1.3);_dkBody.position.y=0.15;_dkg.add(_dkBody);
            var _dkHead=new THREE.Mesh(new THREE.SphereGeometry(0.12,6,4),toon(_dki2<4?0x006633:0xFFFFFF));
            _dkHead.position.set(0,0.3,0.2);_dkg.add(_dkHead);
            var _dkBeak=new THREE.Mesh(new THREE.ConeGeometry(0.04,0.1,4),toon(0xFF8800));
            _dkBeak.position.set(0,0.26,0.32);_dkBeak.rotation.x=-Math.PI/2;_dkg.add(_dkBeak);
            var _dkx=(Math.random()-0.5)*10,_dkz=(Math.random()-0.5)*200;
            _dkg.position.set(_dkx,1.3,_dkz);
            cityGroup.add(_dkg);
            window._sakuraStreamAnimals.push({group:_dkg,type:'duck',x:_dkx,y:1.3,z:_dkz,
                moveDir:Math.random()*Math.PI*2,speed:0.02+Math.random()*0.01,wobble:Math.random()*Math.PI*2});
        }
        // Koi fish (10) — visible through the water
        for(var _kfi=0;_kfi<10;_kfi++){
            var _kfg=new THREE.Group();
            var _kfBody=new THREE.Mesh(new THREE.SphereGeometry(0.18,6,4),toon([0xFF6600,0xFFFFFF,0xFF3333,0xFFAA00,0xFF8844][_kfi%5]));
            _kfBody.scale.set(0.5,0.4,1.5);_kfg.add(_kfBody);
            var _kfTail=new THREE.Mesh(new THREE.BoxGeometry(0.02,0.1,0.1),toon([0xFF6600,0xFFFFFF,0xFF3333,0xFFAA00,0xFF8844][_kfi%5]));
            _kfTail.position.set(0,0,-0.25);_kfg.add(_kfTail);
            var _kfx=(Math.random()-0.5)*10,_kfz=(Math.random()-0.5)*200;
            _kfg.position.set(_kfx,0.7,_kfz);
            cityGroup.add(_kfg);
            window._sakuraStreamAnimals.push({group:_kfg,type:'koi',x:_kfx,y:0.7,z:_kfz,
                angle:Math.random()*Math.PI*2,radius:2+Math.random()*4,speed:0.01+Math.random()*0.008,phase:Math.random()*Math.PI*2});
        }
        // Turtles (5) — on rocks or floating
        for(var _tti=0;_tti<5;_tti++){
            var _ttg=new THREE.Group();
            var _ttShell=new THREE.Mesh(new THREE.SphereGeometry(0.3,6,4),toon(0x556B2F));
            _ttShell.scale.set(1,0.5,1.2);_ttShell.position.y=0.15;_ttg.add(_ttShell);
            var _ttHead=new THREE.Mesh(new THREE.SphereGeometry(0.1,5,3),toon(0x8B8B00));
            _ttHead.position.set(0,0.15,0.3);_ttg.add(_ttHead);
            // 4 tiny legs
            [[-0.15,0,0.1],[0.15,0,0.1],[-0.15,0,-0.15],[0.15,0,-0.15]].forEach(function(lp){
                var leg=new THREE.Mesh(new THREE.SphereGeometry(0.05,4,3),toon(0x8B8B00));
                leg.position.set(lp[0],lp[1],lp[2]);_ttg.add(leg);
            });
            var _ttx=(Math.random()-0.5)*10,_ttz=(Math.random()-0.5)*180;
            _ttg.position.set(_ttx,1.1,_ttz);
            cityGroup.add(_ttg);
            window._sakuraStreamAnimals.push({group:_ttg,type:'turtle',x:_ttx,y:1.1,z:_ttz,
                moveDir:Math.random()*Math.PI*2,speed:0.005,timer:200+Math.floor(Math.random()*300)});
        }
        // Herons/cranes (3) — standing at stream edge
        for(var _hri=0;_hri<3;_hri++){
            var _hrg=new THREE.Group();
            var _hrBody=new THREE.Mesh(new THREE.SphereGeometry(0.25,6,4),toon(0xFFFFFF));
            _hrBody.scale.set(0.6,0.8,1);_hrBody.position.y=1.0;_hrg.add(_hrBody);
            var _hrNeck=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.05,0.8,4),toon(0xFFFFFF));
            _hrNeck.position.set(0,1.5,0.1);_hrg.add(_hrNeck);
            var _hrHead=new THREE.Mesh(new THREE.SphereGeometry(0.08,5,3),toon(0xFFFFFF));
            _hrHead.position.set(0,1.9,0.15);_hrg.add(_hrHead);
            var _hrBeak=new THREE.Mesh(new THREE.ConeGeometry(0.03,0.2,4),toon(0xFFAA00));
            _hrBeak.position.set(0,1.85,0.3);_hrBeak.rotation.x=-Math.PI/2;_hrg.add(_hrBeak);
            // Legs
            [-0.08,0.08].forEach(function(lx){
                var leg=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.8,4),toon(0x444444));
                leg.position.set(lx,0.4,0);_hrg.add(leg);
            });
            var _hrSide=(_hri%2===0)?-7.5:7.5;
            var _hrz=(Math.random()-0.5)*160;
            _hrg.position.set(_hrSide,1.0,_hrz);
            cityGroup.add(_hrg);
            window._sakuraStreamAnimals.push({group:_hrg,type:'heron',x:_hrSide,y:1.0,z:_hrz,
                timer:100+Math.floor(Math.random()*200),state:'stand'});
        }
    }catch(e){alert('Sakura build error: '+e.message);}
    }

    // ===============================================================
    //  Snow Village — 雪之乡 (地面=白川郷岛, 海=洞爺湖, 外围=温泉街)
    // ===============================================================
    if(currentCityStyle===7){try{
        var _snowM=_citySurfaceMaterial('ground',0xDDE4F0,{roughness:0.64,bumpScale:0.055,clearcoat:0.08,clearcoatRoughness:0.72,envMapIntensity:0.34}); // blue-tinted snow for twilight
        var _woodM7=_citySurfaceMaterial('wood',0x8B7355,{roughness:0.88,bumpScale:0.12,envMapIntensity:0.16});
        var _stoneM2=_citySurfaceMaterial('foundation',0x999999,{roughness:0.92,bumpScale:0.09});
        var _winM7=_citySharedPBR('snow-window',0xFFCC66,{roughness:0.14,clearcoat:0.52,clearcoatRoughness:0.16,envMapIntensity:0.42,emissive:0xFFAA33,emissiveIntensity:1.0}); // strong warm glow

        // Helper: Gassho-zukuri house (合掌造り) — built at island height
        var _by7=3; // island surface Y
        function _buildGassho(x,z,w,d,h){
            var ms=[];
            var wallGeo=new THREE.BoxGeometry(w,h*0.55,d,2,2,2);if(typeof _visualBoxWorldUV==='function')_visualBoxWorldUV(wallGeo,2.6);
            var wall=new THREE.Mesh(wallGeo,_citySurfaceMaterial('facade',0xF5F0E8,{roughness:0.90,bumpScale:0.030,envMapIntensity:0.15}));
            wall.position.set(x,_by7+h*0.275,z);wall.castShadow=true;wall.receiveShadow=true;cityGroup.add(wall);ms.push(wall);
            var _roofH=h*0.55,_roofW=w*1.2;
            [-1,1].forEach(function(s){
                var rp=new THREE.Mesh(new THREE.BoxGeometry(_roofW,0.3,d*1.1),_woodM7);
                rp.position.set(x+s*w*0.25,_by7+h*0.55+_roofH*0.4,z);rp.rotation.z=s*0.75;
                rp.castShadow=true;cityGroup.add(rp);ms.push(rp);
                var sr=new THREE.Mesh(new THREE.BoxGeometry(_roofW,0.15,d*1.15),_snowM);
                sr.position.set(x+s*w*0.25,_by7+h*0.55+_roofH*0.45,z);sr.rotation.z=s*0.75;cityGroup.add(sr);ms.push(sr);
            });
            var ridge=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.3,d*1.1),_woodM7);
            ridge.position.set(x,_by7+h*0.55+_roofH*0.75,z);cityGroup.add(ridge);ms.push(ridge);
            for(var wy=1.5;wy<h*0.5;wy+=2.5){
                for(var wx=-w/2+1.5;wx<w/2-1;wx+=2.5){
                    var wn=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.9,0.12),_winM7);
                    wn.position.set(x+wx,_by7+wy,z+d/2+0.06);cityGroup.add(wn);ms.push(wn);
                    var wn2=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.9,0.12),_winM7);
                    wn2.position.set(x+wx,_by7+wy,z-d/2-0.06);cityGroup.add(wn2);ms.push(wn2);
                }
            }
            var porch=new THREE.Mesh(new THREE.BoxGeometry(w+1,0.1,d+1),_citySurfaceMaterial('wood',0xBB9966,{roughness:0.84,bumpScale:0.10}));
            porch.position.set(x,_by7+0.05,z);cityGroup.add(porch);ms.push(porch);
            cityColliders.push({x:x,z:z,hw:w/2+0.5,hd:d/2+0.5,h:_by7+h*0.55});
            cityBuildingMeshes.push({meshes:ms,x:x,z:z,hw:w/2+1,hd:d/2+1,h:_by7+h});
        }

        // === 1. Deep Blue Lake (洞爺湖) — ring between island and outer shore ===
        var _snowIslandR=CITY_SIZE*0.8; // island radius ~128
        var _snowOuterR=CITY_SIZE*3; // outer shore inner edge (480)
        var _snowOuterW=80; // outer shore width
        // Lake water fills everything below ground
        var _lakeSize=CITY_SIZE*8;
        var lakeWater=new THREE.Mesh(new THREE.PlaneGeometry(_lakeSize,_lakeSize),toon(0x0A1A3A));
        lakeWater.rotation.x=-Math.PI/2;lakeWater.position.y=-0.5;cityGroup.add(lakeWater);
        window._snowCityWater=[lakeWater];

        // === 2. Gassho-zukuri village — spread across big island ===
        var _gasshoList=[];
        // Generate houses across island
        for(var _gx=-100;_gx<=100;_gx+=35){
            for(var _gz=-100;_gz<=100;_gz+=35){
                if(DANBO_WASM.len2D(_gx,_gz)>_snowIslandR-20)continue;
                var _gw=7+Math.floor(Math.random()*5);
                var _gd=8+Math.floor(Math.random()*5);
                var _gh=7+Math.floor(Math.random()*5);
                _gasshoList.push({x:_gx+(Math.random()-0.5)*20,z:_gz+(Math.random()-0.5)*20,w:_gw,d:_gd,h:_gh});
            }
        }
        for(var _gi2=0;_gi2<_gasshoList.length;_gi2++){
            var g2=_gasshoList[_gi2];
            _buildGassho(g2.x,g2.z,g2.w,g2.d,g2.h);
        }
        // Torii gate (on island surface)
        var _isH=3; // island surface height
        var torii7=new THREE.Group();torii7.position.set(0,_isH,-70);
        [-1,1].forEach(function(s){
            var tp=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.25,5,6),toon(0xCC3333));
            tp.position.set(s*2.5,2.5,0);torii7.add(tp);
        });
        torii7.add(new THREE.Mesh(new THREE.BoxGeometry(6,0.3,0.4),toon(0xCC3333)));torii7.children[2].position.y=4.8;
        cityGroup.add(torii7);

        // === 2a. Lake edge guardrails — wide dock gap ===
        for(var _gri=0;_gri<32;_gri++){
            var _grA=_gri/32*Math.PI*2;
            if(DANBO_WASM.absDeltaLess(_grA,Math.PI/2,1.2))continue; // very wide dock gap
            var _grX=Math.sin(_grA)*(_snowIslandR-3);
            var _grZ=Math.cos(_grA)*(_snowIslandR-3);
            // Post
            var gPost=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,1.5,4),_woodM7);
            gPost.position.set(_grX,_by7+0.75,_grZ);cityGroup.add(gPost);
            var _grA2=(_gri+1)/32*Math.PI*2;
            if(DANBO_WASM.absDeltaLess(_grA2,Math.PI/2,1.2))continue;
            var _grX2=Math.sin(_grA2)*(_snowIslandR-3);
            var _grZ2=Math.cos(_grA2)*(_snowIslandR-3);
            // Rail + thin collider
            var _rLen7=DANBO_WASM.len2D(_grX2-_grX,_grZ2-_grZ);
            var _rAng7=Math.atan2(_grX2-_grX,_grZ2-_grZ);
            var hRail7=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.1,_rLen7),_woodM7);
            hRail7.position.set((_grX+_grX2)/2,_by7+1.2,(_grZ+_grZ2)/2);
            hRail7.rotation.y=-_rAng7+Math.PI/2;cityGroup.add(hRail7);
            cityColliders.push({x:(_grX+_grX2)/2,z:(_grZ+_grZ2)/2,hw:Math.abs(_grX2-_grX)/2+0.5,hd:Math.abs(_grZ2-_grZ)/2+0.5,h:_by7+1.5});
        }
        // (horizontal rails now built inline above)

        // === 2b. Large Ferry Dock (大型游船码头) ===
        var _dockX=0,_dockZ=_snowIslandR-5;
        var _dockW=20,_dockL=40;
        var dock=new THREE.Mesh(new THREE.BoxGeometry(_dockW,0.5,_dockL),toon(0x998866));
        dock.position.set(_dockX,_by7-0.25,_dockZ+_dockL/2);cityGroup.add(dock);
        var dockEdge=new THREE.Mesh(new THREE.BoxGeometry(_dockW+2,0.3,_dockL+2),toon(0x888888));
        dockEdge.position.set(_dockX,_by7-0.4,_dockZ+_dockL/2);cityGroup.add(dockEdge);
        cityColliders.push({x:_dockX,z:_dockZ+_dockL/2,hw:_dockW/2+1,hd:_dockL/2+1,h:_by7,_bridge:true});
        // Dock support pillars
        for(var _dpi=0;_dpi<6;_dpi++){
            var dpil=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.6,_by7+1,6),toon(0x666655));
            dpil.position.set([-8,8,-8,8,0,0][_dpi],_by7/2-0.5,_dockZ+8+_dpi*6);cityGroup.add(dpil);
        }
        // Side railings
        [-1,1].forEach(function(s){
            var dRail=new THREE.Mesh(new THREE.BoxGeometry(0.15,1.2,_dockL),_woodM7);
            dRail.position.set(_dockX+s*(_dockW/2),_by7+0.6,_dockZ+_dockL/2);cityGroup.add(dRail);
        });

        // === 2c. Ferry/Cruise ship (游轮) at dock ===
        var _shipG=new THREE.Group();_shipG.position.set(_dockX+18,0,_dockZ+20);
        // Large hull
        var hull=new THREE.Mesh(new THREE.BoxGeometry(12,4,30),toon(0xEEEEFF));
        hull.position.y=2;hull.scale.set(1,0.7,1);_shipG.add(hull);
        var hullBot=new THREE.Mesh(new THREE.BoxGeometry(11,1.5,28),toon(0x334455));
        hullBot.position.y=0.3;_shipG.add(hullBot);
        // Main deck
        var deckS=new THREE.Mesh(new THREE.BoxGeometry(11,0.3,28),toon(0xBB9966));
        deckS.position.y=3.5;_shipG.add(deckS);
        // Cabin tier 1
        var cabin1=new THREE.Mesh(new THREE.BoxGeometry(9,3,20),toon(0xFFFFFF));
        cabin1.position.set(0,5,0);_shipG.add(cabin1);
        // Bridge (tier 2)
        var cabin2=new THREE.Mesh(new THREE.BoxGeometry(6,2,10),toon(0xF0F0F0));
        cabin2.position.set(0,7.5,-2);_shipG.add(cabin2);
        // Windows
        for(var _swi2=0;_swi2<8;_swi2++){
            [-1,1].forEach(function(s){
                var sw=new THREE.Mesh(new THREE.BoxGeometry(0.15,1,1.5),toon(0x88CCFF,{emissive:0x4488CC,emissiveIntensity:0.3}));
                sw.position.set(s*4.55,5,-7+_swi2*2);_shipG.add(sw);
            });
        }
        // Funnels
        var funnel1=new THREE.Mesh(new THREE.CylinderGeometry(0.8,1,4,8),toon(0xCC3333));
        funnel1.position.set(0,10,-3);_shipG.add(funnel1);
        var fStripe=new THREE.Mesh(new THREE.CylinderGeometry(0.85,1.05,0.5,8),toon(0xFFFFFF));
        fStripe.position.set(0,9,-3);_shipG.add(fStripe);
        // Deck railing + lifebuoys
        [-1,1].forEach(function(s){
            var dkR=new THREE.Mesh(new THREE.BoxGeometry(0.1,1,28),toon(0xDDDDDD));
            dkR.position.set(s*5.3,4,0);_shipG.add(dkR);
        });
        for(var _lbi7=0;_lbi7<3;_lbi7++){
            var lb=new THREE.Mesh(new THREE.TorusGeometry(0.4,0.12,6,12),toon(0xFF4422));
            lb.position.set(5.5,4.5,-6+_lbi7*6);lb.rotation.y=Math.PI/2;_shipG.add(lb);
        }
        cityGroup.add(_shipG);

        // === 3. Outer shore land ring (外围陆地) ===
        var _outerR=_snowOuterR;
        var _outerW=_snowOuterW;
        // Ring of snowy ground beyond the lake
        for(var _ori7=0;_ori7<32;_ori7++){
            var _orA=_ori7/32*Math.PI*2;
            var _orR=_outerR+_outerW/2;
            var _orX=Math.sin(_orA)*_orR,_orZ=Math.cos(_orA)*_orR;
            var _orGround=new THREE.Mesh(new THREE.BoxGeometry(25,0.5,_outerW),toon(0xE8EEF0));
            _orGround.position.set(_orX,0.25,_orZ);_orGround.rotation.y=-_orA;
            _orGround.receiveShadow=true;cityGroup.add(_orGround);
        }

        // === 4. Onsen town on outer shore (温泉街) ===
        for(var _osi=0;_osi<24;_osi++){
            var _oa7=_osi/24*Math.PI*2;
            var _ox7=Math.sin(_oa7)*(_outerR+_outerW/2);
            var _oz7=Math.cos(_oa7)*(_outerR+_outerW/2);
            if(_osi%3===0){
                var _rh7=8+Math.floor(Math.random()*5);
                var ms7=[];
                var wall7=new THREE.Mesh(new THREE.BoxGeometry(10,_rh7,12),toon(0xF5F0E8));
                wall7.position.set(_ox7,_rh7/2,_oz7);wall7.castShadow=true;cityGroup.add(wall7);ms7.push(wall7);
                var roof7=new THREE.Mesh(new THREE.BoxGeometry(12,0.4,14),toon(0x555555));
                roof7.position.set(_ox7,_rh7+0.2,_oz7);cityGroup.add(roof7);ms7.push(roof7);
                var srf7=new THREE.Mesh(new THREE.BoxGeometry(12,0.2,14),_snowM);
                srf7.position.set(_ox7,_rh7+0.5,_oz7);cityGroup.add(srf7);ms7.push(srf7);
                for(var _wy7=2;_wy7<_rh7-1;_wy7+=3){
                    for(var _wx7=-3;_wx7<=3;_wx7+=3){
                        var wn7=new THREE.Mesh(new THREE.BoxGeometry(1,1.5,0.15),_winM7);
                        wn7.position.set(_ox7+_wx7,_wy7,_oz7+6.1);cityGroup.add(wn7);ms7.push(wn7);
                    }
                }
                cityColliders.push({x:_ox7,z:_oz7,hw:6,hd:7,h:_rh7});
                cityBuildingMeshes.push({meshes:ms7,x:_ox7,z:_oz7,hw:6,hd:7,h:_rh7});
            } else {
                var sh7=new THREE.Mesh(new THREE.BoxGeometry(6,5,8),toon([0xEEDDBB,0xDDCCAA,0xCCBB99][_osi%3]));
                sh7.position.set(_ox7,2.5,_oz7);sh7.castShadow=true;cityGroup.add(sh7);
                var shR7=new THREE.Mesh(new THREE.BoxGeometry(7,0.3,9),toon(0x555555));
                shR7.position.set(_ox7,5.2,_oz7);cityGroup.add(shR7);
                var shSnow=new THREE.Mesh(new THREE.BoxGeometry(7,0.15,9),_snowM);
                shSnow.position.set(_ox7,5.4,_oz7);cityGroup.add(shSnow);
                cityColliders.push({x:_ox7,z:_oz7,hw:3.5,hd:4.5,h:5});
                cityBuildingMeshes.push({meshes:[sh7,shR7,shSnow],x:_ox7,z:_oz7,hw:3.5,hd:4.5,h:5});
            }
        }

        // === 4. Hot Springs on shore ===
        window._snowCitySteam=[];
        var _spR=_outerR+_outerW/2;
        [[_spR,40,6],[_spR,-50,4],[-_spR,30,5],[-_spR,-40,4]].forEach(function(sp){
            var pool=new THREE.Mesh(new THREE.CylinderGeometry(sp[2],sp[2],0.3,16),toon(0x66BBAA,{transparent:true,opacity:0.7}));
            pool.position.set(sp[0],0.2,sp[1]);cityGroup.add(pool);
            var edge=new THREE.Mesh(new THREE.TorusGeometry(sp[2]+0.5,0.5,6,16),_stoneM2);
            edge.position.set(sp[0],0.3,sp[1]);edge.rotation.x=Math.PI/2;cityGroup.add(edge);
            for(var _sti2=0;_sti2<12;_sti2++){
                var steam=new THREE.Mesh(new THREE.SphereGeometry(0.3+Math.random()*0.3,4,3),
                    new THREE.MeshBasicMaterial({color:0xFFFFFF,transparent:true,opacity:0.3}));
                var sx2=sp[0]+(Math.random()-0.5)*sp[2],sz2=sp[1]+(Math.random()-0.5)*sp[2];
                steam.position.set(sx2,0.5+Math.random()*3,sz2);cityGroup.add(steam);
                window._snowCitySteam.push({mesh:steam,x:sx2,y:0.5+Math.random()*3,z:sz2,
                    baseX:sp[0],baseZ:sp[1],radius:sp[2],vy:0.01+Math.random()*0.01});
            }
        });

        // === 6. Mountains (far surrounding) ===
        var _mtM=toon(0x667788);
        for(var _mi7=0;_mi7<12;_mi7++){
            var _ma7=_mi7/12*Math.PI*2;
            var _mr7=_snowOuterR+_outerW+30+Math.random()*50;
            var _mh7=40+Math.random()*35;
            var mt=new THREE.Mesh(new THREE.ConeGeometry(25+Math.random()*15,_mh7,6),_mtM);
            mt.position.set(Math.sin(_ma7)*_mr7,_mh7/2,Math.cos(_ma7)*_mr7);cityGroup.add(mt);
            var cap=new THREE.Mesh(new THREE.ConeGeometry(10+Math.random()*5,_mh7*0.2,6),_snowM);
            cap.position.set(Math.sin(_ma7)*_mr7,_mh7*0.85,Math.cos(_ma7)*_mr7);cityGroup.add(cap);
        }

        // === 7. Snow-covered conifers on island ===
        for(var _ti7=0;_ti7<100;_ti7++){
            var _ta7b=Math.random()*Math.PI*2;
            var _tr7b=Math.random()*(_snowIslandR-20);
            var tx7=Math.sin(_ta7b)*_tr7b,tz7=Math.cos(_ta7b)*_tr7b;
            var skip7=false;
            for(var _ci7=0;_ci7<cityColliders.length;_ci7++){
                var c7=cityColliders[_ci7];if(c7.hw>50)continue;
                if(DANBO_WASM.aabb2D(tx7,tz7,c7.x,c7.z,c7.hw,c7.hd,3))skip7=true;
            }
            if(skip7)continue;
            var tg7=new THREE.Group();tg7.position.set(tx7,_by7,tz7);
            var _th7=4+Math.random()*5;
            tg7.add(new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.25,_th7,6),toon(0x5C4033)));tg7.children[0].position.y=_th7/2;
            for(var _cl7=0;_cl7<3;_cl7++){
                var _cr7=2.2-_cl7*0.5,_cy7=_th7-0.5+_cl7*1.5;
                tg7.add(new THREE.Mesh(new THREE.ConeGeometry(_cr7,2.2,6),toon(0x2D5A3D)));tg7.children[tg7.children.length-1].position.y=_cy7;
                var sc7=new THREE.Mesh(new THREE.SphereGeometry(_cr7*0.7,4,3),_snowM);sc7.position.y=_cy7+0.9;sc7.scale.y=0.3;tg7.add(sc7);
            }
            cityGroup.add(tg7);
        }

        // === 8. Falling Snow ===
        // The full-density storm is rendered by a single GPU Points layer in
        // visuals.js instead of 3000 independently submitted transparent planes.
        window._snowParticles=[];

        // === 9. Warm street lanterns (暖かい街灯) — both sides of paths ===
        var _lanternGlow=new THREE.MeshBasicMaterial({color:0xFFCC44,transparent:true,opacity:0.9});
        for(var _sli7=0;_sli7<16;_sli7++){
            var _slz7=-100+_sli7*14;
            [-4,4].forEach(function(sx7){
                var tg8=new THREE.Group();tg8.position.set(sx7,_by7,_slz7);
                // Stone base
                tg8.add(new THREE.Mesh(new THREE.BoxGeometry(0.5,0.25,0.5),_stoneM2));tg8.children[0].position.y=0.12;
                // Post
                tg8.add(new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.1,1.5,6),_stoneM2));tg8.children[1].position.y=0.95;
                // Bright glowing lantern head
                tg8.add(new THREE.Mesh(new THREE.BoxGeometry(0.5,0.4,0.5),_lanternGlow));tg8.children[2].position.y=1.9;
                // Roof cap
                tg8.add(new THREE.Mesh(new THREE.ConeGeometry(0.45,0.3,4),_stoneM2));tg8.children[3].position.y=2.25;tg8.children[3].rotation.y=Math.PI/4;
                // Light sphere (glow halo)
                var halo=new THREE.Mesh(new THREE.SphereGeometry(1.5,6,4),new THREE.MeshBasicMaterial({color:0xFFDD88,transparent:true,opacity:0.08}));
                halo.position.y=1.9;tg8.add(halo);
                cityGroup.add(tg8);
            });
        }

    }catch(e){alert('Snow Village build error: '+e.message);}
    }

    } // end if not moon

    // ---- Moon City special decorations (FLAT) ----
    if(currentCityStyle===5){
        // Layout: Von Braun city on left (x<0), battlefield on right (x>0)
        var _moonCityHalf=MOON_CITY_SIZE; // 400
        // Craters on flat ground (outside city zone)
        for(var ci=0;ci<30;ci++){
            var crx=(Math.random()-0.5)*_moonCityHalf*1.8;
            var crz=(Math.random()-0.5)*_moonCityHalf*1.8;
            // Skip if inside Von Braun zone (x<-50) or too close to center
            if(crx<-50&&DANBO_WASM.absDeltaLess(crz,0,120))continue;
            var crr=3+Math.random()*8;
            var craterG=new THREE.Group();
            var crater=new THREE.Mesh(new THREE.CylinderGeometry(crr,crr*1.1,1,16),toon(0x555566));
            crater.position.y=-0.3;craterG.add(crater);
            var rim=new THREE.Mesh(new THREE.TorusGeometry(crr,0.8,6,16),toon(0x777788));
            rim.position.y=0.1;rim.rotation.x=Math.PI/2;craterG.add(rim);
            craterG.position.set(crx,0,crz);
            cityGroup.add(craterG);
        }
        // Apollo Lunar Module — flat positioned
        var apollo=new THREE.Group();
        var descent=new THREE.Mesh(new THREE.BoxGeometry(3,2,3),toon(0xCCAA44,{emissive:0x886622,emissiveIntensity:0.2}));
        descent.position.y=2;apollo.add(descent);
        for(var li=0;li<4;li++){
            var la=li/4*Math.PI*2+Math.PI/4;
            var leg=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,2.5,4),toon(0xAAAAAA));
            leg.position.set(Math.cos(la)*2,0.8,Math.sin(la)*2);
            leg.rotation.z=Math.cos(la)*0.3;leg.rotation.x=-Math.sin(la)*0.3;
            apollo.add(leg);
            var pad=new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.5,0.1,8),toon(0x999999));
            pad.position.set(Math.cos(la)*2.5,0.05,Math.sin(la)*2.5);
            apollo.add(pad);
        }
        var ascent=new THREE.Mesh(new THREE.BoxGeometry(2.2,1.8,2.2),toon(0xCCCCCC));
        ascent.position.y=3.8;apollo.add(ascent);
        var win=new THREE.Mesh(new THREE.CircleGeometry(0.4,8),toon(0x224466,{emissive:0x112233,emissiveIntensity:0.3}));
        win.position.set(0,4,1.12);apollo.add(win);
        var ant=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,2,4),toon(0xDDDDDD));
        ant.position.set(0.5,5.5,0);apollo.add(ant);
        var dish=new THREE.Mesh(new THREE.SphereGeometry(0.5,8,4,0,Math.PI*2,0,Math.PI/2),toon(0xDDDDDD));
        dish.position.set(0.5,6.5,0);dish.rotation.x=Math.PI;apollo.add(dish);
        var flagPole=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,3,4),toon(0xCCCCCC));
        flagPole.position.set(5,1.5,0);apollo.add(flagPole);
        var flag=new THREE.Mesh(new THREE.BoxGeometry(1.5,1,0.02),toon(0x2244AA));
        flag.position.set(5.8,2.8,0);apollo.add(flag);
        var stripes=new THREE.Mesh(new THREE.BoxGeometry(1.5,0.08,0.03),toon(0xDD2222));
        stripes.position.set(5.8,2.5,0.01);apollo.add(stripes);
        var stripes2=new THREE.Mesh(new THREE.BoxGeometry(1.5,0.08,0.03),toon(0xDD2222));
        stripes2.position.set(5.8,3.1,0.01);apollo.add(stripes2);
        // Place Apollo on flat ground (battlefield side)
        apollo.position.set(280,0,280);
        apollo.scale.set(3,3,3);
        cityGroup.add(apollo);
        // Lunar Rover — projected onto sphere
        var rover=new THREE.Group();
        var rBody=new THREE.Mesh(new THREE.BoxGeometry(2.5,0.3,1.2),toon(0xBBBBBB));
        rBody.position.y=0.8;rover.add(rBody);
        for(var wi=0;wi<4;wi++){
            var wx2=(wi%2===0?-1:1)*1.1;
            var wz2=(wi<2?-1:1)*0.7;
            var wheel=new THREE.Mesh(new THREE.TorusGeometry(0.35,0.08,6,12),toon(0x666666));
            wheel.position.set(wx2,0.35,wz2);wheel.rotation.y=Math.PI/2;
            rover.add(wheel);
        }
        var rDish=new THREE.Mesh(new THREE.SphereGeometry(0.4,8,4,0,Math.PI*2,0,Math.PI/2),toon(0xDDDDDD));
        rDish.position.set(0,1.5,0);rDish.rotation.x=Math.PI;rover.add(rDish);
        // Place rover on flat ground near Apollo
        rover.position.set(270,0,290);
        rover.scale.set(3,3,3);
        rover.rotateY(0.5);
        cityGroup.add(rover);
        // ---- Grand Lunar City "Von Braun" (Gundam-style) ----
        var lunarCity=new THREE.Group();
        var lcBase=toon(0x888899),lcWall=toon(0x667788),lcDark=toon(0x445566);
        var lcGlow=new THREE.MeshBasicMaterial({color:0x44AAFF,transparent:true,opacity:0.4});
        var lcWarm=new THREE.MeshBasicMaterial({color:0xFFCC66,transparent:true,opacity:0.35});
        // Crater rim (outer wall — raised)
        var craterRim=new THREE.Mesh(new THREE.TorusGeometry(18,3,8,24),toon(0x666677));
        craterRim.rotation.x=Math.PI/2;craterRim.position.y=2;lunarCity.add(craterRim);
        // Crater floor (sunken)
        var craterFloor=new THREE.Mesh(new THREE.CylinderGeometry(17,17,0.5,24),toon(0x555566));
        craterFloor.position.y=-3;lunarCity.add(craterFloor);
        // Crater inner wall (sloped)
        var craterWall=new THREE.Mesh(new THREE.CylinderGeometry(17,18.5,5,24,1,true),toon(0x556677));
        craterWall.position.y=-0.5;lunarCity.add(craterWall);
        // Main dome — large transparent geodesic
        var mainDome=new THREE.Mesh(new THREE.SphereGeometry(16,24,16,0,Math.PI*2,0,Math.PI/2),
            new THREE.MeshPhongMaterial({color:0x8899BB,transparent:true,opacity:0.18,side:THREE.DoubleSide}));
        mainDome.position.y=0;lunarCity.add(mainDome);
        // Dome wireframe for geodesic look
        var domeWire=new THREE.Mesh(new THREE.SphereGeometry(16.1,24,16,0,Math.PI*2,0,Math.PI/2),
            new THREE.MeshBasicMaterial({color:0x6688AA,wireframe:true,transparent:true,opacity:0.25}));
        lunarCity.add(domeWire);
        // Central tower (Anaheim Electronics HQ)
        var aeHQ=new THREE.Mesh(new THREE.CylinderGeometry(0.8,1.5,18,8),lcWall);aeHQ.position.y=9;lunarCity.add(aeHQ);
        var aeTop=new THREE.Mesh(new THREE.SphereGeometry(1.2,8,6),toon(0x99AABB));aeTop.position.y=18.5;lunarCity.add(aeTop);
        var aeAnt=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,8,4),toon(0xCCCCCC));aeAnt.position.y=23;lunarCity.add(aeAnt);
        // AE logo glow
        var aeLogo=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.6,0.1),lcGlow);aeLogo.position.set(0,14,1.55);lunarCity.add(aeLogo);
        // Tall needle spires (Gundam-style Von Braun skyline)
        for(var nsi=0;nsi<20;nsi++){
            var nsa=nsi/20*Math.PI*2+Math.random()*0.3;
            var nsr=3+Math.random()*14;
            var nsh=8+Math.random()*18;
            var nsw=0.15+Math.random()*0.3;
            var ns=new THREE.Mesh(new THREE.CylinderGeometry(nsw*0.3,nsw,nsh,5),toon(0x778899));
            ns.position.set(Math.cos(nsa)*nsr,nsh/2-1,Math.sin(nsa)*nsr);lunarCity.add(ns);
            // Spire tip glow
            if(Math.random()<0.5){
                var nsGlow=new THREE.Mesh(new THREE.SphereGeometry(0.2,4,3),new THREE.MeshBasicMaterial({color:0x88CCFF,transparent:true,opacity:0.6}));
                nsGlow.position.set(Math.cos(nsa)*nsr,nsh-0.5,Math.sin(nsa)*nsr);lunarCity.add(nsGlow);
            }
        }
        // Ring of tall buildings (commercial district) — skyscrapers with lights
        var _vbBldgMeshes=[]; // collect for occlusion
        for(var lbi=0;lbi<18;lbi++){
            var lba=lbi/18*Math.PI*2;var lbr=7+Math.random()*4;
            var lbh=4+Math.random()*8;var lbw=0.8+Math.random()*1.2;var lbd=0.8+Math.random()*1.0;
            var lbColor=[lcWall,lcDark,toon(0x556688),toon(0x667799),toon(0x5577AA)][lbi%5];
            var lb=new THREE.Mesh(new THREE.BoxGeometry(lbw,lbh,lbd),lbColor);
            lb.position.set(Math.cos(lba)*lbr,lbh/2-1,Math.sin(lba)*lbr);lunarCity.add(lb);_vbBldgMeshes.push(lb);
            // Window grid (warm yellow lights)
            var wRows=Math.floor(lbh/0.8);
            for(var wri=0;wri<wRows;wri++){
                for(var wci=0;wci<2;wci++){
                    if(Math.random()<0.3)continue; // some windows dark
                    var wc=Math.random()<0.7?0xFFCC66:0x88CCFF;
                    var wm=new THREE.Mesh(new THREE.BoxGeometry(lbw*0.3,0.2,0.05),new THREE.MeshBasicMaterial({color:wc,transparent:true,opacity:0.5+Math.random()*0.3}));
                    wm.position.set(Math.cos(lba)*lbr+(wci-0.5)*lbw*0.35,wri*0.8+0.3,Math.sin(lba)*lbr+lbd/2+0.03);
                    lunarCity.add(wm);_vbBldgMeshes.push(wm);
                }
            }
            // Rooftop antenna/light
            if(Math.random()<0.6){
                var rl=new THREE.Mesh(new THREE.SphereGeometry(0.12,4,3),new THREE.MeshBasicMaterial({color:Math.random()<0.5?0xFF4444:0x44FF44,transparent:true,opacity:0.8}));
                rl.position.set(Math.cos(lba)*lbr,lbh-0.5,Math.sin(lba)*lbr);lunarCity.add(rl);_vbBldgMeshes.push(rl);
            }
        }
        // Inner ring — tall residential towers with balcony lights
        for(var lri=0;lri<10;lri++){
            var lra=lri/10*Math.PI*2+0.3;var lrr=3.5+Math.random()*2.5;
            var lrh=3+Math.random()*5;
            var lr=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.7,lrh,6),lcWall);
            lr.position.set(Math.cos(lra)*lrr,lrh/2-1,Math.sin(lra)*lrr);lunarCity.add(lr);_vbBldgMeshes.push(lr);
            // Balcony ring lights
            for(var bli=0;bli<Math.floor(lrh/1.5);bli++){
                var blr=new THREE.Mesh(new THREE.TorusGeometry(0.55,0.04,4,8),new THREE.MeshBasicMaterial({color:0xFFCC66,transparent:true,opacity:0.4}));
                blr.position.set(Math.cos(lra)*lrr,bli*1.5+1,Math.sin(lra)*lrr);
                blr.rotation.x=Math.PI/2;lunarCity.add(blr);_vbBldgMeshes.push(blr);
            }
        }
        // Outer ring — shorter commercial blocks with neon signs
        for(var ori=0;ori<14;ori++){
            var ora=ori/14*Math.PI*2+0.15;var orr=13+Math.random()*3;
            var orh=2+Math.random()*3;var orw=1+Math.random()*1.5;
            var ob2=new THREE.Mesh(new THREE.BoxGeometry(orw,orh,orw*0.8),toon(0x556677));
            ob2.position.set(Math.cos(ora)*orr,orh/2-1,Math.sin(ora)*orr);lunarCity.add(ob2);_vbBldgMeshes.push(ob2);
            // Neon sign on front
            var neonC=[0xFF4488,0x44FFAA,0xFFAA22,0x44AAFF,0xFF66FF][ori%5];
            var neon=new THREE.Mesh(new THREE.BoxGeometry(orw*0.6,0.3,0.05),new THREE.MeshBasicMaterial({color:neonC,transparent:true,opacity:0.7}));
            neon.position.set(Math.cos(ora)*orr,orh*0.7,Math.sin(ora)*orr+orw*0.4+0.03);
            lunarCity.add(neon);_vbBldgMeshes.push(neon);
        }
        // Street lights along radial roads
        for(var sli=0;sli<16;sli++){
            var sla=sli/4*Math.PI/2;var slr=3+sli%4*4;
            var slPole=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,2,4),toon(0x888888));
            slPole.position.set(Math.cos(sla)*slr,1,Math.sin(sla)*slr);lunarCity.add(slPole);
            var slLight=new THREE.Mesh(new THREE.SphereGeometry(0.15,4,3),new THREE.MeshBasicMaterial({color:0xFFEECC,transparent:true,opacity:0.7}));
            slLight.position.set(Math.cos(sla)*slr,2.1,Math.sin(sla)*slr);lunarCity.add(slLight);_vbBldgMeshes.push(slLight);
        }
        // Spaceport — 4 large landing pads on crater rim
        for(var spi2=0;spi2<4;spi2++){
            var spa2=spi2/4*Math.PI*2+Math.PI/8;var spr=19;
            var sPad=new THREE.Mesh(new THREE.CylinderGeometry(3,3,0.3,12),toon(0x556666));
            sPad.position.set(Math.cos(spa2)*spr,1.5,Math.sin(spa2)*spr);lunarCity.add(sPad);
            // Pad markings
            var sMark=new THREE.Mesh(new THREE.RingGeometry(1.5,2,12),new THREE.MeshBasicMaterial({color:0xFFAA00,transparent:true,opacity:0.5,side:THREE.DoubleSide}));
            sMark.rotation.x=-Math.PI/2;sMark.position.set(Math.cos(spa2)*spr,1.7,Math.sin(spa2)*spr);lunarCity.add(sMark);
            // Control tower
            var sTower=new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.5,3,6),lcWall);
            sTower.position.set(Math.cos(spa2)*(spr+3),3,Math.sin(spa2)*(spr+3));lunarCity.add(sTower);
            var sLight=new THREE.Mesh(new THREE.SphereGeometry(0.3,4,3),lcGlow);
            sLight.position.set(Math.cos(spa2)*(spr+3),4.6,Math.sin(spa2)*(spr+3));lunarCity.add(sLight);
        }
        // Mass driver — long rail extending from city
        var mdGroup=new THREE.Group();
        var mdRail=new THREE.Mesh(new THREE.BoxGeometry(1.5,0.4,40),toon(0x556677));mdRail.position.z=20;mdGroup.add(mdRail);
        var mdRail2=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.8,40),toon(0x445566));mdRail2.position.set(-0.8,0.4,20);mdGroup.add(mdRail2);
        var mdRail3=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.8,40),toon(0x445566));mdRail3.position.set(0.8,0.4,20);mdGroup.add(mdRail3);
        // Electromagnetic coils along rail
        for(var mci=0;mci<8;mci++){
            var mc=new THREE.Mesh(new THREE.TorusGeometry(1.2,0.15,6,12),toon(0x4466AA));
            mc.position.set(0,0.8,mci*5+2);mc.rotation.y=Math.PI/2;mdGroup.add(mc);
        }
        mdGroup.position.set(22,0,0);mdGroup.rotation.y=Math.PI/4;lunarCity.add(mdGroup);
        // Solar panel arrays (large, on stilts)
        for(var sai=0;sai<6;sai++){
            var saa=sai/6*Math.PI*2+Math.PI/6;var sar=24+Math.random()*4;
            var saG=new THREE.Group();
            var saPole=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,5,4),toon(0x888888));saPole.position.y=2.5;saG.add(saPole);
            var saPanel=new THREE.Mesh(new THREE.BoxGeometry(5,0.08,2.5),toon(0x224488));saPanel.position.y=5.2;saG.add(saPanel);
            var saFrame=new THREE.Mesh(new THREE.BoxGeometry(5.2,0.15,0.1),toon(0x666666));saFrame.position.y=5.2;saG.add(saFrame);
            saG.position.set(Math.cos(saa)*sar,0,Math.sin(saa)*sar);
            saG.rotation.y=saa+Math.PI/2;lunarCity.add(saG);
        }
        // Fiber-optic light viaducts (glowing tubes inside dome)
        for(var fvi=0;fvi<6;fvi++){
            var fva=fvi/6*Math.PI*2;
            var fv=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,14,6),
                new THREE.MeshBasicMaterial({color:0x88CCFF,transparent:true,opacity:0.25}));
            fv.position.set(Math.cos(fva)*12,7,Math.sin(fva)*12);
            fv.rotation.z=Math.PI/2*0.3;fv.rotation.y=fva;lunarCity.add(fv);
        }
        // Place Von Braun on flat ground (left side, x<0)
        lunarCity.position.set(-200,0,0);
        lunarCity.scale.set(8,8,8);
        cityGroup.add(lunarCity);
        // Von Braun city doors — 4 entrances (N/S/E/W) on crater rim
        var _vbDoorAngles=[0,Math.PI/2,Math.PI,Math.PI*1.5];
        var _vbDoorR=18.5; // on crater rim
        for(var vdi=0;vdi<4;vdi++){
            var vda=_vbDoorAngles[vdi];
            var doorG=new THREE.Group();
            // Door frame
            var doorFrame=new THREE.Mesh(new THREE.BoxGeometry(3,4,0.5),toon(0x4466AA));
            doorFrame.position.y=2;doorG.add(doorFrame);
            // Door opening (glowing)
            var doorGlow=new THREE.Mesh(new THREE.BoxGeometry(2.2,3.2,0.3),new THREE.MeshBasicMaterial({color:0x44AAFF,transparent:true,opacity:0.4}));
            doorGlow.position.y=1.8;doorG.add(doorGlow);
            // Arch top
            var doorArch=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,0.5,8,1,false,0,Math.PI),toon(0x4466AA));
            doorArch.position.y=4;doorArch.rotation.z=Math.PI/2;doorArch.rotation.y=Math.PI/2;doorG.add(doorArch);
            // Position on rim
            doorG.position.set(Math.cos(vda)*_vbDoorR,1,Math.sin(vda)*_vbDoorR);
            doorG.rotation.y=vda+Math.PI; // face outward
            lunarCity.add(doorG);
        }
        // Von Braun collider zone (flat)
        window._moonShields=[];
        // AT Field shields around cities — MS and projectiles can't enter
        // doors: array of {angle, width} for player pass-through openings
        window._moonShields.push({x:-200,y:0,z:0,r:160,
            doors:[{a:0,w:0.25},{a:Math.PI/2,w:0.25},{a:Math.PI,w:0.25},{a:Math.PI*1.5,w:0.25}]
        }); // Von Braun dome
        window._moonCities=[
            {cx:-200,cy:0,cz:0,r:160,scale:8,name:{zhs:'\u51AF\u00B7\u5E03\u52B3\u6069',zht:'\u99AE\u00B7\u5E03\u52DE\u6069',ja:'\u30D5\u30A9\u30F3\u30FB\u30D6\u30E9\u30A6\u30F3',en:'Von Braun'},flatX:-200,flatZ:0}
        ];
        // ---- Granada (second city, far side) ----
        var granada=new THREE.Group();
        // Deep crater rim
        var grRim=new THREE.Mesh(new THREE.TorusGeometry(10,2,8,20),toon(0x556666));
        grRim.rotation.x=Math.PI/2;grRim.position.y=0.5;granada.add(grRim);
        // Crater bowl (sunken floor)
        var grFloor=new THREE.Mesh(new THREE.CylinderGeometry(9,9,0.5,20),toon(0x334455));
        grFloor.position.y=-3;granada.add(grFloor);
        // Crater inner wall (sloped)
        var grWall=new THREE.Mesh(new THREE.CylinderGeometry(9,10.5,4,20,1,true),toon(0x445566));
        grWall.position.y=-1;granada.add(grWall);
        // Blue glow from within (Granada's signature blue lighting)
        var grGlowFloor=new THREE.Mesh(new THREE.CircleGeometry(8,20),new THREE.MeshBasicMaterial({color:0x2244AA,transparent:true,opacity:0.15,side:THREE.DoubleSide}));
        grGlowFloor.rotation.x=-Math.PI/2;grGlowFloor.position.y=-2.5;granada.add(grGlowFloor);
        // Concentric ring lights (blue)
        for(var gri=0;gri<3;gri++){
            var grRing=new THREE.Mesh(new THREE.TorusGeometry(3+gri*2.5,0.08,6,24),new THREE.MeshBasicMaterial({color:0x4488FF,transparent:true,opacity:0.3}));
            grRing.rotation.x=Math.PI/2;grRing.position.y=-2.4;granada.add(grRing);
        }
        // Military hangars + barracks (inside crater)
        for(var ghi=0;ghi<6;ghi++){
            var gha=ghi/6*Math.PI*2;var ghr=5+Math.random()*2;
            var gh=new THREE.Mesh(new THREE.BoxGeometry(2,1.5,3),toon(0x445544));
            gh.position.set(Math.cos(gha)*ghr,-2,Math.sin(gha)*ghr);gh.rotation.y=gha;granada.add(gh);
            var ghd=new THREE.Mesh(new THREE.BoxGeometry(1.5,1.2,0.1),new THREE.MeshBasicMaterial({color:0x44AA44,transparent:true,opacity:0.3}));
            ghd.position.set(Math.cos(gha)*(ghr+1.5),-1.9,Math.sin(gha)*(ghr+1.5));ghd.rotation.y=gha;granada.add(ghd);
            // Hangar interior light
            var ghL=new THREE.Mesh(new THREE.SphereGeometry(0.2,4,3),new THREE.MeshBasicMaterial({color:0x88FF88,transparent:true,opacity:0.5}));
            ghL.position.set(Math.cos(gha)*(ghr+1.5),-1.2,Math.sin(gha)*(ghr+1.5));granada.add(ghL);
        }
        // Inner buildings — military command structures
        for(var gbi=0;gbi<8;gbi++){
            var gba=gbi/8*Math.PI*2+0.4;var gbr=2.5+Math.random()*2;
            var gbh=2+Math.random()*3;
            var gb2=new THREE.Mesh(new THREE.BoxGeometry(1,gbh,1),toon(0x556666));
            gb2.position.set(Math.cos(gba)*gbr,gbh/2-2.5,Math.sin(gba)*gbr);granada.add(gb2);
            // Blue window strips
            for(var gwi=0;gwi<Math.floor(gbh/0.8);gwi++){
                var gw=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.12,0.05),new THREE.MeshBasicMaterial({color:0x4488FF,transparent:true,opacity:0.5}));
                gw.position.set(Math.cos(gba)*gbr,gwi*0.8-2,Math.sin(gba)*gbr+0.53);granada.add(gw);
            }
        }
        var grTower=new THREE.Mesh(new THREE.CylinderGeometry(0.6,1.0,12,8),toon(0x556655));grTower.position.y=3;granada.add(grTower);
        // Tower top beacon
        var grBeacon=new THREE.Mesh(new THREE.SphereGeometry(0.4,6,4),new THREE.MeshBasicMaterial({color:0x44AAFF,transparent:true,opacity:0.7}));
        grBeacon.position.y=9.5;granada.add(grBeacon);
        // Granada spires (military comm towers)
        for(var gsi=0;gsi<10;gsi++){
            var gsa=gsi/10*Math.PI*2+0.2;var gsr=3+Math.random()*6;
            var gsh=5+Math.random()*12;
            var gs=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.18,gsh,4),toon(0x667766));
            gs.position.set(Math.cos(gsa)*gsr,gsh/2-2.5,Math.sin(gsa)*gsr);granada.add(gs);
            // Spire tip light
            if(Math.random()<0.5){
                var gsL=new THREE.Mesh(new THREE.SphereGeometry(0.12,4,3),new THREE.MeshBasicMaterial({color:0xFF4444,transparent:true,opacity:0.7}));
                gsL.position.set(Math.cos(gsa)*gsr,gsh-2,Math.sin(gsa)*gsr);granada.add(gsL);
            }
        }
        // Place Granada on flat ground (left side, behind Von Braun)
        granada.position.set(-200,0,-200);
        granada.scale.set(8,8,8);
        cityGroup.add(granada);
        // Granada city doors — 4 entrances (N/S/E/W) on rim
        var _grDoorR=10.5;
        for(var gdi=0;gdi<4;gdi++){
            var gda=gdi/4*Math.PI*2;
            var gdoorG=new THREE.Group();
            var gdFrame=new THREE.Mesh(new THREE.BoxGeometry(2.5,3.5,0.4),toon(0x446644));
            gdFrame.position.y=1.75;gdoorG.add(gdFrame);
            var gdGlow=new THREE.Mesh(new THREE.BoxGeometry(1.8,2.8,0.3),new THREE.MeshBasicMaterial({color:0x44FF88,transparent:true,opacity:0.4}));
            gdGlow.position.y=1.5;gdoorG.add(gdGlow);
            gdoorG.position.set(Math.cos(gda)*_grDoorR,0.5,Math.sin(gda)*_grDoorR);
            gdoorG.rotation.y=gda+Math.PI;
            granada.add(gdoorG);
        }
        // Granada collider zone (flat)
        window._moonCities.push({cx:-200,cy:0,cz:-200,r:100,scale:8,name:{zhs:'\u683C\u62C9\u7EB3\u8FBE',zht:'\u683C\u62C9\u7D0D\u9054',ja:'\u30B0\u30E9\u30CA\u30C0',en:'Granada'},flatX:-200,flatZ:-200});
        window._moonShields.push({x:-200,y:0,z:-200,r:100,
            doors:[{a:0,w:0.3},{a:Math.PI/2,w:0.3},{a:Math.PI,w:0.3},{a:Math.PI*1.5,w:0.3}]
        }); // Granada dome
        // Visible AT Field shield domes (translucent hexagonal-look spheres)
        var _shieldMat=new THREE.MeshBasicMaterial({color:0xFF8800,transparent:true,opacity:0.04,side:THREE.DoubleSide});
        var _shieldWire=new THREE.MeshBasicMaterial({color:0xFF6600,wireframe:true,transparent:true,opacity:0.06});
        // Von Braun shield dome
        var vbShield=new THREE.Mesh(new THREE.SphereGeometry(160,24,16,0,Math.PI*2,0,Math.PI/2),_shieldMat);
        vbShield.position.set(-200,0,0);scene.add(vbShield);
        var vbWire=new THREE.Mesh(new THREE.SphereGeometry(160.5,24,16,0,Math.PI*2,0,Math.PI/2),_shieldWire);
        vbWire.position.set(-200,0,0);scene.add(vbWire);
        // Granada shield dome
        var grShield=new THREE.Mesh(new THREE.SphereGeometry(100,20,12,0,Math.PI*2,0,Math.PI/2),_shieldMat);
        grShield.position.set(-200,0,-200);scene.add(grShield);
        var grWire2=new THREE.Mesh(new THREE.SphereGeometry(100.5,20,12,0,Math.PI*2,0,Math.PI/2),_shieldWire);
        grWire2.position.set(-200,0,-200);scene.add(grWire2);
        // Store for cleanup
        window._moonShieldDomes=[vbShield,vbWire,grShield,grWire2];
        // Moon city building colliders — flat box colliders
        window._moonBldgColliders=[];
        // Von Braun central tower
        cityColliders.push({x:-200,z:0,hw:12,hd:12,h:100});
        // Von Braun ring buildings
        for(var mbi=0;mbi<12;mbi++){
            var mba=mbi/12*Math.PI*2;var mbr=70;
            var mbx=-200+Math.cos(mba)*mbr;var mbz=Math.sin(mba)*mbr;
            cityColliders.push({x:mbx,z:mbz,hw:10,hd:10,h:50});
        }
        // Granada hangars
        for(var gci=0;gci<6;gci++){
            var gca=gci/6*Math.PI*2;var gcr=45;
            var gcx=-200+Math.cos(gca)*gcr;var gcz=-200+Math.sin(gca)*gcr;
            cityColliders.push({x:gcx,z:gcz,hw:10,hd:14,h:15});
        }
        // Granada central tower
        cityColliders.push({x:-200,z:-200,hw:8,hd:8,h:70});
        // Add moon city meshes to building occlusion array — per collider zone
        var _vbAllMeshes=[];lunarCity.traverse(function(c){if(c.isMesh)_vbAllMeshes.push(c);});
        var _grAllMeshes=[];granada.traverse(function(c){if(c.isMesh)_grAllMeshes.push(c);});
        // Von Braun central tower
        cityBuildingMeshes.push({meshes:_vbAllMeshes,x:-200,z:0,hw:12,hd:12,h:100});
        // Von Braun ring buildings — each ring building gets an occlusion entry
        for(var _obi=0;_obi<12;_obi++){
            var _oba2=_obi/12*Math.PI*2;var _obr2=70;
            cityBuildingMeshes.push({meshes:_vbAllMeshes,x:-200+Math.cos(_oba2)*_obr2,z:Math.sin(_oba2)*_obr2,hw:10,hd:10,h:50});
        }
        // Granada
        cityBuildingMeshes.push({meshes:_grAllMeshes,x:-200,z:-200,hw:8,hd:8,h:70});
        for(var _ogci=0;_ogci<6;_ogci++){
            var _ogca=_ogci/6*Math.PI*2;var _ogcr=45;
            cityBuildingMeshes.push({meshes:_grAllMeshes,x:-200+Math.cos(_ogca)*_ogcr,z:-200+Math.sin(_ogca)*_ogcr,hw:10,hd:14,h:15});
        }
        // Earth in sky — semi-realistic scale (Earth radius ~3.67x Moon)
        var earthGroup=new THREE.Group();
        var _earthR=29340; // Earth radius in game units (real ratio to moon)
        var earth=new THREE.Mesh(new THREE.SphereGeometry(1,32,24),new THREE.MeshBasicMaterial({color:0x3366CC,fog:false}));
        earthGroup.add(earth);
        for(var ei=0;ei<8;ei++){
            var ea=ei/8*Math.PI*2;
            var ep=(Math.random()-0.5)*Math.PI*0.7;
            var cont=new THREE.Mesh(new THREE.SphereGeometry(0.26+Math.random()*0.2,10,8),new THREE.MeshBasicMaterial({color:0x33AA44,fog:false}));
            cont.position.set(Math.cos(ea)*Math.cos(ep)*0.87,Math.sin(ep)*0.87,Math.sin(ea)*Math.cos(ep)*0.87);
            cont.scale.set(1,0.5,1);
            earthGroup.add(cont);
        }
        var iceCap1=new THREE.Mesh(new THREE.SphereGeometry(0.27,10,8),new THREE.MeshBasicMaterial({color:0xDDEEFF,fog:false}));
        iceCap1.position.set(0,0.93,0);earthGroup.add(iceCap1);
        var iceCap2=new THREE.Mesh(new THREE.SphereGeometry(0.2,10,8),new THREE.MeshBasicMaterial({color:0xDDEEFF,fog:false}));
        iceCap2.position.set(0,-0.93,0);earthGroup.add(iceCap2);
        var atmo=new THREE.Mesh(new THREE.SphereGeometry(1.07,32,24),new THREE.MeshBasicMaterial({color:0x6699FF,transparent:true,opacity:0.15,side:THREE.BackSide,fog:false}));
        earthGroup.add(atmo);
        var atmo2=new THREE.Mesh(new THREE.SphereGeometry(1.17,32,24),new THREE.MeshBasicMaterial({color:0x88BBFF,transparent:true,opacity:0.08,side:THREE.BackSide,fog:false}));
        earthGroup.add(atmo2);
        // Earth-Moon distance: visible in sky (close enough to see clearly)
        var _earthDist=800;
        earthGroup.position.set(_earthDist*0.5,_earthDist*0.8,-_earthDist*0.3);
        earthGroup.scale.set(60,60,60);
        scene.add(earthGroup);
        window._moonEarth=earthGroup;

        // ---- Solar System — Sun and planets at compressed but proportional distances ----
        // Sun and planets (compressed for visibility in moon sky)
        var _sunSolar=new THREE.Mesh(new THREE.SphereGeometry(30,24,16),new THREE.MeshBasicMaterial({color:0xFFEE44,fog:false}));
        _sunSolar.position.set(-600,500,300);
        scene.add(_sunSolar);
        window._sunSolar=_sunSolar;
        var _sunSolarGlow=new THREE.Mesh(new THREE.SphereGeometry(45,16,12),new THREE.MeshBasicMaterial({color:0xFFFF88,transparent:true,opacity:0.15,fog:false}));
        _sunSolarGlow.position.copy(_sunSolar.position);
        scene.add(_sunSolarGlow);
        window._sunSolarGlow=_sunSolarGlow;
        var _solarLight=new THREE.DirectionalLight(0xFFEECC,1.0);
        _solarLight.position.copy(_sunSolar.position).normalize().multiplyScalar(100);
        scene.add(_solarLight);
        window._solarLight=_solarLight;
        var _planets=[
            {name:'Mercury',color:0xAA9988,r:1,dist:200,angle:0.8},
            {name:'Venus',color:0xFFCC88,r:2,dist:300,angle:2.1},
            {name:'Mars',color:0xCC6644,r:1.5,dist:400,angle:3.5},
            {name:'Jupiter',color:0xDDAA66,r:8,dist:550,angle:1.2},
            {name:'Saturn',color:0xDDCC88,r:7,dist:700,angle:4.0},
            {name:'Uranus',color:0x88CCDD,r:4,dist:850,angle:5.5},
            {name:'Neptune',color:0x4466CC,r:3.5,dist:950,angle:0.3},
            {name:'Pluto',color:0xBBAA99,r:0.5,dist:1100,angle:2.8}
        ];
        window._solarPlanets=[];
        for(var _pi=0;_pi<_planets.length;_pi++){
            var _pl=_planets[_pi];
            var _pm=new THREE.Mesh(new THREE.SphereGeometry(_pl.r,12,8),new THREE.MeshBasicMaterial({color:_pl.color,fog:false}));
            var _pa=_pl.angle;
            var _pelev=(Math.random()-0.3)*0.2; // slight orbital inclination
            _pm.position.set(
                _sunSolar.position.x+Math.cos(_pa)*_pl.dist,
                Math.sin(_pelev)*_pl.dist*0.1+_pl.dist*0.3,
                _sunSolar.position.z+Math.sin(_pa)*_pl.dist
            );
            scene.add(_pm);
            window._solarPlanets.push({mesh:_pm,data:_pl});
            // Saturn rings
            if(_pl.name==='Saturn'){
                var ring=new THREE.Mesh(new THREE.RingGeometry(_pl.r*1.3,_pl.r*2.2,32),new THREE.MeshBasicMaterial({color:0xCCBB88,transparent:true,opacity:0.5,side:THREE.DoubleSide,fog:false}));
                ring.position.copy(_pm.position);
                ring.rotation.x=Math.PI*0.35;
                scene.add(ring);
            }
        }

        // ---- Nebulae (large colorful gas clouds in deep space) ----
        window._moonNebulae=[];
        var nebColors=[0x330044,0x220033,0x440022,0x110033,0x330033,0x220044,0x441122,0x112244];
        for(var ni=0;ni<20;ni++){
            var na=Math.random()*Math.PI*2;
            var ne2=(Math.random()-0.5)*Math.PI;
            var nd=500+Math.random()*800;
            var nnx=Math.cos(na)*Math.cos(ne2)*nd;
            var nny=Math.sin(ne2)*nd;
            var nnz=Math.sin(na)*Math.cos(ne2)*nd;
            var ns=20000+Math.random()*60000;
            var nc=nebColors[Math.floor(Math.random()*nebColors.length)];
            var neb=new THREE.Mesh(new THREE.SphereGeometry(ns,8,6),new THREE.MeshBasicMaterial({color:nc,transparent:true,opacity:0.08+Math.random()*0.06,fog:false,side:THREE.BackSide}));
            neb.position.set(nnx,nny,nnz);
            scene.add(neb);
            window._moonNebulae.push(neb);
        }

        // ---- Twinkling stars — surround the sphere ----
        window._moonStars=[];
        var starColors=[0xFFFFFF,0xFFFFFF,0xFFFFFF,0xCCDDFF,0xAABBFF,0xFFEECC,0xFFCCDD,0xDDCCFF];
        for(var sti=0;sti<500;sti++){
            var sa=Math.random()*Math.PI*2;
            var se=(Math.random()-0.5)*Math.PI;
            var sd=MOON_CITY_SIZE*4+Math.random()*MOON_CITY_SIZE*8;
            var sx=Math.cos(sa)*Math.cos(se)*sd;
            var sy=Math.sin(se)*sd;
            var sz=Math.sin(sa)*Math.cos(se)*sd;
            var ss=8+Math.random()*32;
            var sc=starColors[Math.floor(Math.random()*starColors.length)];
            var star=new THREE.Mesh(new THREE.SphereGeometry(ss,4,3),new THREE.MeshBasicMaterial({color:sc,fog:false,transparent:true}));
            star.position.set(sx,sy,sz);
            scene.add(star);
            window._moonStars.push({mesh:star,phase:Math.random()*Math.PI*2,speed:0.5+Math.random()*3});
        }
        // Footprints — flat positioned near Apollo
        var fpMat=toon(0x666677);
        for(var fi=0;fi<15;fi++){
            var ffx=270+(Math.random()-0.5)*20;
            var ffz=280+(Math.random()-0.5)*20;
            var fp=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.05,0.8),fpMat);
            fp.position.set(ffx,0.02,ffz);
            fp.rotation.y=Math.random()*Math.PI*2;
            cityGroup.add(fp);
        }
        // Moon rocks — flat positioned (outside city zones)
        for(var ri2=0;ri2<25;ri2++){
            var rrx=(Math.random()-0.5)*_moonCityHalf*1.8;
            var rrz=(Math.random()-0.5)*_moonCityHalf*1.8;
            // Skip if inside Von Braun zone
            if(rrx<-50&&DANBO_WASM.absDeltaLess(rrz,0,120))continue;
            var rs=1+Math.random()*3;
            var rock=new THREE.Mesh(new THREE.DodecahedronGeometry(rs,0),toon(0x888899));
            rock.position.set(rrx,rs*0.4,rrz);
            rock.rotation.set(Math.random(),Math.random(),Math.random());
            cityGroup.add(rock);
        }
        // ---- Large craters with rims (battlefield terrain) ----
        var _bigCraters=[];
        for(var bci=0;bci<15;bci++){
            var bcx=30+Math.random()*320;
            var bcz=(Math.random()-0.5)*600;
            var bcr=8+Math.random()*20;
            var bcG=new THREE.Group();
            // Crater depression (dark floor)
            var bcFloor=new THREE.Mesh(new THREE.CylinderGeometry(bcr*0.8,bcr,0.6,16),toon(0x444455));
            bcFloor.position.y=-0.5;bcG.add(bcFloor);
            // Raised rim
            var bcRim=new THREE.Mesh(new THREE.TorusGeometry(bcr,bcr*0.15,6,16),toon(0x777788));
            bcRim.rotation.x=Math.PI/2;bcRim.position.y=bcr*0.08;bcG.add(bcRim);
            // Scattered ejecta rocks around rim
            for(var bri=0;bri<5;bri++){
                var bra=Math.random()*Math.PI*2;
                var brr=bcr*0.9+Math.random()*bcr*0.4;
                var brs=0.5+Math.random()*1.5;
                var brk=new THREE.Mesh(new THREE.DodecahedronGeometry(brs,0),toon(0x666677));
                brk.position.set(Math.cos(bra)*brr,brs*0.3,Math.sin(bra)*brr);
                brk.rotation.set(Math.random(),Math.random(),Math.random());
                bcG.add(brk);
            }
            bcG.position.set(bcx,0,bcz);
            cityGroup.add(bcG);
            _bigCraters.push({x:bcx,z:bcz,r:bcr});
        }
        // ---- Apollo Lunar Rover (moving) ----
        window._moonRover=null;
        var roverG=new THREE.Group();
        var rvBody=new THREE.Mesh(new THREE.BoxGeometry(3,0.4,1.5),toon(0xBBBBBB));
        rvBody.position.y=0.9;roverG.add(rvBody);
        // Fenders
        var rvFender1=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.1,1.8),toon(0xAAAAAA));
        rvFender1.position.set(-0.9,0.7,0);roverG.add(rvFender1);
        var rvFender2=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.1,1.8),toon(0xAAAAAA));
        rvFender2.position.set(0.9,0.7,0);roverG.add(rvFender2);
        // Wheels (wire mesh)
        for(var rwi=0;rwi<4;rwi++){
            var rwx=(rwi%2===0?-1:1)*1.2;
            var rwz=(rwi<2?-1:1)*0.8;
            var rwh=new THREE.Mesh(new THREE.TorusGeometry(0.4,0.1,6,12),toon(0x555555));
            rwh.position.set(rwx,0.4,rwz);rwh.rotation.y=Math.PI/2;roverG.add(rwh);
        }
        // High-gain antenna dish
        var rvDish=new THREE.Mesh(new THREE.SphereGeometry(0.5,8,4,0,Math.PI*2,0,Math.PI/2),toon(0xDDDDDD));
        rvDish.position.set(0,1.8,0);rvDish.rotation.x=Math.PI;roverG.add(rvDish);
        var rvAnt=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,1.2,4),toon(0xCCCCCC));
        rvAnt.position.set(0,1.4,0);roverG.add(rvAnt);
        // Camera/TV on front
        var rvCam=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.3,0.4),toon(0x333333));
        rvCam.position.set(1.3,1.2,0);roverG.add(rvCam);
        // Seats (2 simple frames)
        var rvSeat1=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.5,0.8),toon(0x999999));
        rvSeat1.position.set(-0.3,1.1,0);roverG.add(rvSeat1);
        var rvSeat2=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.5,0.8),toon(0x999999));
        rvSeat2.position.set(0.5,1.1,0);roverG.add(rvSeat2);
        roverG.position.set(150,0,100);
        roverG.scale.set(3,3,3);
        cityGroup.add(roverG);
        window._moonRover={group:roverG,x:150,z:100,angle:0,speed:0.15,timer:0,turnTimer:0,targetAngle:0};
        // ---- Additional US flags scattered on battlefield ----
        var _flagPositions=[[100,0,50],[200,0,-80],[320,0,150],[80,0,-150],[250,0,250]];
        for(var fli=0;fli<_flagPositions.length;fli++){
            var fp2=_flagPositions[fli];
            var flG=new THREE.Group();
            var flPole=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,5,4),toon(0xCCCCCC));
            flPole.position.y=2.5;flG.add(flPole);
            // Flag — red/white/blue
            var flFlag=new THREE.Mesh(new THREE.BoxGeometry(2.5,1.5,0.03),toon(0x2244AA));
            flFlag.position.set(1.3,4.5,0);flG.add(flFlag);
            // Red stripes
            for(var fsi=0;fsi<4;fsi++){
                var fStr=new THREE.Mesh(new THREE.BoxGeometry(2.5,0.1,0.04),toon(0xDD2222));
                fStr.position.set(1.3,3.9+fsi*0.3,0.01);flG.add(fStr);
            }
            // White canton area
            var flCanton=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.7,0.04),toon(0xEEEEEE));
            flCanton.position.set(0.3,4.7,0.02);flG.add(flCanton);
            flG.position.set(fp2[0],fp2[1],fp2[2]);
            flG.scale.set(2,2,2);
            cityGroup.add(flG);
        }
        // ---- More footprint trails across battlefield ----
        var fpMat2=toon(0x555566);
        for(var fti=0;fti<40;fti++){
            var ftx=50+Math.random()*300;
            var ftz=(Math.random()-0.5)*400;
            var ftp=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.05,0.9),fpMat2);
            ftp.position.set(ftx,0.02,ftz);
            ftp.rotation.y=Math.random()*Math.PI*2;
            cityGroup.add(ftp);
        }
        // ---- Regolith mounds (small hills on battlefield) ----
        for(var rmi=0;rmi<20;rmi++){
            var rmx=20+Math.random()*350;
            var rmz=(Math.random()-0.5)*600;
            var rmr=2+Math.random()*5;
            var rmh=0.5+Math.random()*1.5;
            var mound=new THREE.Mesh(new THREE.SphereGeometry(rmr,8,4,0,Math.PI*2,0,Math.PI/2),toon(0x777788));
            mound.position.set(rmx,0,rmz);mound.scale.y=rmh/rmr;
            cityGroup.add(mound);
        }
        // ---- Return-to-Earth portal inside Von Braun city ----
        // Placed near the central tower, looks like a space elevator pad
        var earthPortalG=new THREE.Group();
        // Platform base
        var epBase=new THREE.Mesh(new THREE.CylinderGeometry(3,3.5,0.5,12),toon(0x4466AA));
        epBase.position.y=0.25;earthPortalG.add(epBase);
        // Glowing ring
        var epRing=new THREE.Mesh(new THREE.TorusGeometry(2.5,0.2,8,24),new THREE.MeshBasicMaterial({color:0x44AAFF,transparent:true,opacity:0.6}));
        epRing.rotation.x=Math.PI/2;epRing.position.y=0.6;earthPortalG.add(epRing);
        // Inner portal glow (Earth colors)
        var epInner=new THREE.Mesh(new THREE.CircleGeometry(2,16),new THREE.MeshBasicMaterial({color:0x3366CC,transparent:true,opacity:0.4,side:THREE.DoubleSide}));
        epInner.rotation.x=-Math.PI/2;epInner.position.y=0.7;earthPortalG.add(epInner);
        // Holographic Earth above portal
        var epEarth=new THREE.Mesh(new THREE.SphereGeometry(1.2,16,12),new THREE.MeshBasicMaterial({color:0x3366CC,transparent:true,opacity:0.35}));
        epEarth.position.y=4;earthPortalG.add(epEarth);
        var epCont=new THREE.Mesh(new THREE.SphereGeometry(0.5,8,6),new THREE.MeshBasicMaterial({color:0x33AA44,transparent:true,opacity:0.3}));
        epCont.position.set(0.3,4.2,0.5);earthPortalG.add(epCont);
        // Arch frame
        var epArch1=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,6,6),toon(0x4466AA));
        epArch1.position.set(-2.5,3,0);earthPortalG.add(epArch1);
        var epArch2=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,6,6),toon(0x4466AA));
        epArch2.position.set(2.5,3,0);earthPortalG.add(epArch2);
        var epArchTop=new THREE.Mesh(new THREE.BoxGeometry(5.5,0.3,0.3),toon(0x4466AA));
        epArchTop.position.y=6;earthPortalG.add(epArchTop);
        // Sign: "Earth" in holographic text style
        var epSign=new THREE.Mesh(new THREE.BoxGeometry(2,0.5,0.1),new THREE.MeshBasicMaterial({color:0x44CCFF,transparent:true,opacity:0.5}));
        epSign.position.set(0,6.5,0);earthPortalG.add(epSign);
        // Orbiting particles
        for(var epi=0;epi<6;epi++){
            var epPart=new THREE.Mesh(new THREE.SphereGeometry(0.12,4,3),new THREE.MeshBasicMaterial({color:0x88CCFF,transparent:true,opacity:0.7}));
            epPart.userData.orbitPhase=epi/6*Math.PI*2;
            earthPortalG.add(epPart);
        }
        // Place inside Von Braun, near central tower (local coords, will be scaled by 8)
        earthPortalG.position.set(-200+8*5,0,8*5); // offset from VB center
        cityGroup.add(earthPortalG);
        window._earthReturnPortal={group:earthPortalG,x:-200+8*5,z:8*5,ring:epRing,inner:epInner,earth:epEarth};
        // Add to portals array for proximity detection
        portals.push({mesh:earthPortalG,ring:epRing,inner:epInner,
            name:'\uD83C\uDF0D '+L('earthReturn'),desc:L('earthReturnDesc'),
            raceIndex:-1,x:-200+8*5,z:8*5,y:0,color:0x3366CC,_hiddenType:'earthReturn',_targetStyle:-99});
        // (Moon mini-game portals removed — races are Earth-only)
        // ---- Moon city props (inside Von Braun) ----
        // Oxygen tanks
        var _vbPropsData=[
            {type:'tank',x:-200+8*3,z:8*2},{type:'tank',x:-200-8*3,z:-8*2},
            {type:'tank',x:-200+8*7,z:-8*3},{type:'tank',x:-200-8*6,z:8*4},
            {type:'crate',x:-200+8*(-2),z:8*6},{type:'crate',x:-200+8*4,z:-8*5},
            {type:'crate',x:-200-8*5,z:-8*6},{type:'crate',x:-200+8*(-8),z:8*2},
            {type:'barrel',x:-200+8*6,z:8*7},{type:'barrel',x:-200-8*4,z:8*(-3)},
            {type:'antenna',x:-200+8*(-7),z:8*(-5)},{type:'antenna',x:-200+8*8,z:8*(-7)}
        ];
        for(var vpi=0;vpi<_vbPropsData.length;vpi++){
            var vpd=_vbPropsData[vpi];
            var vpG=new THREE.Group();
            if(vpd.type==='tank'){
                // Oxygen/fuel tank
                var tk=new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.4,2,8),toon(0xDDDDDD));
                tk.position.y=1;vpG.add(tk);
                var tkTop=new THREE.Mesh(new THREE.SphereGeometry(0.4,8,4),toon(0xCCCCCC));
                tkTop.position.y=2;vpG.add(tkTop);
                var tkValve=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,0.3,4),toon(0xCC2222));
                tkValve.position.y=2.3;vpG.add(tkValve);
                vpG.position.set(vpd.x,0,vpd.z);
                cityGroup.add(vpG);
                cityProps.push({group:vpG,x:vpd.x,z:vpd.z,radius:0.8,type:'tank',grabbed:false,origY:0,throwVx:0,throwVy:0,throwVz:0,throwTimer:0,weight:1.8});
            } else if(vpd.type==='crate'){
                // Supply crate
                var cr=new THREE.Mesh(new THREE.BoxGeometry(1.5,1.5,1.5),toon(0x887744));
                cr.position.y=0.75;vpG.add(cr);
                var crStripe=new THREE.Mesh(new THREE.BoxGeometry(1.55,0.15,1.55),toon(0xCC8833));
                crStripe.position.y=0.75;vpG.add(crStripe);
                vpG.position.set(vpd.x,0,vpd.z);
                cityGroup.add(vpG);
                cityProps.push({group:vpG,x:vpd.x,z:vpd.z,radius:1.0,type:'crate',grabbed:false,origY:0,throwVx:0,throwVy:0,throwVz:0,throwTimer:0,weight:2.5});
            } else if(vpd.type==='barrel'){
                // Fuel barrel
                var br=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,1.5,8),toon(0x336633));
                br.position.y=0.75;vpG.add(br);
                var brBand=new THREE.Mesh(new THREE.TorusGeometry(0.52,0.05,6,12),toon(0x888888));
                brBand.position.y=0.4;brBand.rotation.x=Math.PI/2;vpG.add(brBand);
                vpG.position.set(vpd.x,0,vpd.z);
                cityGroup.add(vpG);
                cityProps.push({group:vpG,x:vpd.x,z:vpd.z,radius:0.8,type:'barrel',grabbed:false,origY:0,throwVx:0,throwVy:0,throwVz:0,throwTimer:0,weight:2.0});
            } else if(vpd.type==='antenna'){
                // Communication antenna
                var anPole=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,4,4),toon(0xAAAAAA));
                anPole.position.y=2;vpG.add(anPole);
                var anDish=new THREE.Mesh(new THREE.SphereGeometry(0.8,8,4,0,Math.PI*2,0,Math.PI/2),toon(0xCCCCCC));
                anDish.position.y=4;anDish.rotation.x=Math.PI*0.7;vpG.add(anDish);
                vpG.position.set(vpd.x,0,vpd.z);
                cityGroup.add(vpG);
                cityProps.push({group:vpG,x:vpd.x,z:vpd.z,radius:0.6,type:'antenna',grabbed:false,origY:0,throwVx:0,throwVy:0,throwVz:0,throwTimer:0,weight:1.2});
            }
        }
        // ---- Mobile Suit battles in moon space ----
        window._moonGundams=[];
        window._moonBeams=[];
        window._moonMissiles=[];
        // MS units: 6 Gundam, 20 GM, 60 Zaku, 14 Dom = 100 Gundam-verse
        // Macross: 8 VF-1 Valkyrie, 1 SDF-1, 15 Zentradi pods, 6 Zentradi cruisers = 30 Macross
        var msUnits=[];
        msUnits.push({ms:'gundam',weapon:'rifle'});msUnits.push({ms:'gundam',weapon:'saber'});msUnits.push({ms:'gundam',weapon:'funnel'});msUnits.push({ms:'gundam',weapon:'rifle'});
        for(var gmi=0;gmi<12;gmi++){msUnits.push({ms:'gm',weapon:Math.random()<0.5?'rifle':Math.random()<0.5?'saber':'missile'});}
        var zakuColors=[0x336633,0x225522,0x447744,0xCC2222,0x882222,0x224488,0x335533,0x556655,0x443366,0x228844];
        for(var zki=0;zki<35;zki++){msUnits.push({ms:'zaku',weapon:Math.random()<0.35?'rifle':Math.random()<0.5?'missile':'saber',color:zakuColors[zki%zakuColors.length]});}
        for(var dmi=0;dmi<8;dmi++){msUnits.push({ms:'dom',weapon:Math.random()<0.5?'rifle':'missile'});}
        // Macross units
        for(var vfi=0;vfi<5;vfi++){msUnits.push({ms:'valkyrie',weapon:'rifle'});}
        msUnits.push({ms:'sdf1',weapon:'missile'});
        for(var zpi=0;zpi<10;zpi++){msUnits.push({ms:'zenPod',weapon:'rifle'});}
        for(var zci=0;zci<4;zci++){msUnits.push({ms:'zenCruiser',weapon:'missile'});}
        for(var gi=0;gi<msUnits.length;gi++){
            var mu=msUnits[gi];
            var gd=_buildMobileSuit(mu.ms,mu.weapon,mu.color);
            // Spawn above battlefield area (right side, x>0)
            var gAlt=30+Math.random()*60; // altitude above ground
            if(mu.ms==='sdf1')gAlt=200+Math.random()*100;
            if(mu.ms==='zenCruiser')gAlt=150+Math.random()*100;
            // Spread across entire battlefield area (all directions, avoid cities)
            var gAngle=Math.random()*Math.PI*2;
            var gDist=80+Math.random()*300;
            var gFlatX=Math.cos(gAngle)*gDist;
            var gFlatZ=Math.sin(gAngle)*gDist;
            // Avoid spawning inside city zones
            var _gInCity=false;
            if(DANBO_WASM.len2D(gFlatX+200,gFlatZ)<170)_gInCity=true;
            if(DANBO_WASM.len2D(gFlatX+200,gFlatZ+200)<110)_gInCity=true;
            if(_gInCity){gFlatX=100+Math.random()*250;gFlatZ=(Math.random()-0.5)*500;}
            gd.group.position.set(gFlatX,gAlt,gFlatZ);
            gd.group.scale.set(2,2,2);
            scene.add(gd.group);
            var faction;
            if(mu.ms==='gundam'||mu.ms==='gm')faction='efsf';
            else if(mu.ms==='valkyrie'||mu.ms==='sdf1')faction='unSpacy';
            else if(mu.ms==='zenPod'||mu.ms==='zenCruiser')faction='zentradi';
            else faction='zeon';
            // Faction-based spawn zones (formations)
            // Zeon: near cities (defenders), EFSF: north, UN Spacy: east, Zentradi: south
            var _fZone={efsf:{cx:300,cz:-350},unSpacy:{cx:350,cz:300},zentradi:{cx:-250,cz:350},zeon:{cx:-300,cz:-150}};
            var _fz=_fZone[faction];
            gFlatX=_fz.cx+(Math.random()-0.5)*400;
            gFlatZ=_fz.cz+(Math.random()-0.5)*400;
            // Random waypoint AI state
            var wpAngle=Math.random()*Math.PI*2;
            var wpElev=(Math.random()-0.5)*Math.PI*0.3;
            var wpR=50+Math.random()*100;
            if(mu.ms==='sdf1')wpR=200+Math.random()*100;
            if(mu.ms==='zenCruiser')wpR=150+Math.random()*100;
            window._moonGundams.push({group:gd.group,type:mu.weapon,ms:mu.ms,faction:faction,
                px:gFlatX,py:gAlt,pz:gFlatZ,
                wpAngle:wpAngle,wpElev:wpElev,wpR:wpR,
                wpTimer:30+Math.floor(Math.random()*60),
                speed:mu.ms==='sdf1'?1.0:mu.ms==='zenCruiser'?1.2:1.8+Math.random()*1.8,
                phase:Math.random()*Math.PI*2,
                actionTimer:Math.floor(Math.random()*30),
                funnels:gd.funnels||null,saberMesh:gd.saberMesh||null,weapon:gd.weapon||null,
                target:null,dodgeTimer:0,dodgeDir:null,
                hp:mu.ms==='sdf1'?50:mu.ms==='zenCruiser'?30:mu.ms==='gundam'?12:mu.ms==='dom'?10:8,
                hpMax:mu.ms==='sdf1'?50:mu.ms==='zenCruiser'?30:mu.ms==='gundam'?12:mu.ms==='dom'?10:8,
                _dead:false,_respawnTimer:0,_msType:mu.ms,_weaponType:mu.weapon,_color:mu.color
            });
        }
        // Pair up saber units for cross-faction duels
        var _allSabers=window._moonGundams.filter(function(g2){return g2.type==='saber';});
        for(var sp=0;sp<_allSabers.length;sp++){
            if(_allSabers[sp].duelPartner)continue;
            for(var sp2=sp+1;sp2<_allSabers.length;sp2++){
                if(_allSabers[sp2].duelPartner)continue;
                if(_allSabers[sp].faction!==_allSabers[sp2].faction){
                    _allSabers[sp].duelPartner=_allSabers[sp2];
                    _allSabers[sp2].duelPartner=_allSabers[sp];break;
                }
            }
        }
    }

    // Promote legacy landmark pieces after every city-specific builder has run.
    // This is what gives all eight cities full HDR/PBR material coverage rather
    // than limiting the authored surface response to Hope City alone.
    _cityUpgradeMaterialsToPBR();

    // This optimizer was introduced with the detailed city geometry, but the
    // build path never invoked it. Without this call Hope City submits well over
    // two thousand individual meshes per frame. It preserves every object and
    // combines compatible opaque geometry/material work.
    _optimizeCityInstances();
}

function _buildMobileSuit(msType,weaponType,customColor){
    var g=new THREE.Group();
    var gray=toon(0x666677);var darkGray=toon(0x333344);
    var glowMat=new THREE.MeshBasicMaterial({color:0x44AAFF,transparent:true,opacity:0.6});
    var result={group:g};
    if(msType==='gundam'){
        var w=toon(0xEEEEF0),b=toon(0x2244AA),r=toon(0xCC2222),y=toon(0xDDAA00);
        g.add(new THREE.Mesh(new THREE.BoxGeometry(1.8,2.0,1.0),w));
        var v1=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.3,0.15),r);v1.position.set(-0.45,0.5,0.55);g.add(v1);
        var v2=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.3,0.15),r);v2.position.set(0.45,0.5,0.55);g.add(v2);
        var wa2=new THREE.Mesh(new THREE.BoxGeometry(1.4,0.4,0.8),y);wa2.position.y=-1.2;g.add(wa2);
        var hd=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.8,0.8),w);hd.position.y=1.5;g.add(hd);
        var f1=new THREE.Mesh(new THREE.ConeGeometry(0.08,0.7,4),y);f1.position.set(-0.3,2.1,0.1);f1.rotation.z=0.5;g.add(f1);
        var f2=new THREE.Mesh(new THREE.ConeGeometry(0.08,0.7,4),y);f2.position.set(0.3,2.1,0.1);f2.rotation.z=-0.5;g.add(f2);
        var gvi=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.2,0.15),new THREE.MeshBasicMaterial({color:0x44FF88}));gvi.position.set(0,1.55,0.45);g.add(gvi);
        var ch=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.15,0.2),r);ch.position.set(0,1.2,0.35);g.add(ch);
        var s1=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.6,0.7),b);s1.position.set(-1.5,0.6,0);g.add(s1);
        var s2=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.6,0.7),b);s2.position.set(1.5,0.6,0);g.add(s2);
        [[-1.5,w],[1.5,w]].forEach(function(p){var a=new THREE.Mesh(new THREE.BoxGeometry(0.4,1.4,0.4),p[1]);a.position.set(p[0],-0.4,0);g.add(a);var h=new THREE.Mesh(new THREE.BoxGeometry(0.35,0.3,0.35),gray);h.position.set(p[0],-1.2,0);g.add(h);});
        [[-0.45,w,b,r],[0.45,w,b,r]].forEach(function(p){var u=new THREE.Mesh(new THREE.BoxGeometry(0.5,1.0,0.5),p[1]);u.position.set(p[0],-1.9,0);g.add(u);var l=new THREE.Mesh(new THREE.BoxGeometry(0.55,1.2,0.55),p[2]);l.position.set(p[0],-3.1,0);g.add(l);var ft=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.3,0.8),p[3]);ft.position.set(p[0],-3.85,0.1);g.add(ft);});
        var bp=new THREE.Mesh(new THREE.BoxGeometry(1.2,1.4,0.6),gray);bp.position.set(0,0.2,-0.8);g.add(bp);
        [[-0.35],[0.35]].forEach(function(p){var t=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.25,0.5,6),darkGray);t.position.set(p[0],-0.3,-1.1);g.add(t);var gl=new THREE.Mesh(new THREE.ConeGeometry(0.22,0.8,6),glowMat);gl.position.set(p[0],-0.9,-1.1);gl.rotation.x=Math.PI;g.add(gl);});
        var sh=new THREE.Group();sh.add(new THREE.Mesh(new THREE.BoxGeometry(0.15,2.0,1.2),w));var sht=new THREE.Mesh(new THREE.BoxGeometry(0.15,0.6,1.0),r);sht.position.y=0.8;sh.add(sht);var shc=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.15,0.8),y);shc.position.y=0.2;sh.add(shc);sh.position.set(-2.0,-0.3,0.3);g.add(sh);
    } else if(msType==='gm'){
        var bg=toon(0xCCBB99),r2=toon(0xCC3333),dkBg=toon(0xAA9977);
        g.add(new THREE.Mesh(new THREE.BoxGeometry(1.7,1.9,0.9),bg));
        var gwa=new THREE.Mesh(new THREE.BoxGeometry(1.3,0.4,0.7),dkBg);gwa.position.y=-1.15;g.add(gwa);
        var ghd=new THREE.Mesh(new THREE.BoxGeometry(0.85,0.75,0.75),bg);ghd.position.y=1.4;g.add(ghd);
        var gmvi=new THREE.Mesh(new THREE.BoxGeometry(0.65,0.2,0.15),new THREE.MeshBasicMaterial({color:0xFF4444}));gmvi.position.set(0,1.45,0.42);g.add(gmvi);
        var gs1=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.5,0.6),r2);gs1.position.set(-1.4,0.5,0);g.add(gs1);
        var gs2=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.5,0.6),r2);gs2.position.set(1.4,0.5,0);g.add(gs2);
        [[-1.4,bg],[1.4,bg]].forEach(function(p){var a=new THREE.Mesh(new THREE.BoxGeometry(0.38,1.3,0.38),p[1]);a.position.set(p[0],-0.4,0);g.add(a);var h=new THREE.Mesh(new THREE.BoxGeometry(0.32,0.28,0.32),gray);h.position.set(p[0],-1.15,0);g.add(h);});
        [[-0.42,bg,dkBg],[0.42,bg,dkBg]].forEach(function(p){var u=new THREE.Mesh(new THREE.BoxGeometry(0.48,0.95,0.48),p[1]);u.position.set(p[0],-1.8,0);g.add(u);var l=new THREE.Mesh(new THREE.BoxGeometry(0.5,1.1,0.5),p[2]);l.position.set(p[0],-2.95,0);g.add(l);var ft=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.28,0.7),p[2]);ft.position.set(p[0],-3.65,0.1);g.add(ft);});
        var gbp=new THREE.Mesh(new THREE.BoxGeometry(1.0,1.2,0.5),gray);gbp.position.set(0,0.1,-0.7);g.add(gbp);
        [[-0.3],[0.3]].forEach(function(p){var gt=new THREE.Mesh(new THREE.ConeGeometry(0.18,0.7,6),glowMat);gt.position.set(p[0],-0.7,-0.7);gt.rotation.x=Math.PI;g.add(gt);});
        var gsh=new THREE.Mesh(new THREE.BoxGeometry(0.12,1.6,1.0),r2);gsh.position.set(-1.9,-0.2,0.3);g.add(gsh);
    } else if(msType==='zaku'){
        var zc=toon(customColor||0x336633);var zdk=toon(0x224422);
        g.add(new THREE.Mesh(new THREE.BoxGeometry(1.7,1.9,0.9),zc));
        var zwa=new THREE.Mesh(new THREE.BoxGeometry(1.3,0.4,0.7),zdk);zwa.position.y=-1.15;g.add(zwa);
        var zhd=new THREE.Mesh(new THREE.SphereGeometry(0.55,8,6),zc);zhd.position.y=1.5;g.add(zhd);
        var zeye=new THREE.Mesh(new THREE.SphereGeometry(0.1,6,4),new THREE.MeshBasicMaterial({color:0xFF44AA}));zeye.position.set(0,1.5,0.5);g.add(zeye);
        var zt1=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,0.8,6),gray);zt1.position.set(0.3,1.2,0.3);zt1.rotation.z=0.5;g.add(zt1);
        var zt2=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,0.8,6),gray);zt2.position.set(-0.3,1.2,0.3);zt2.rotation.z=-0.5;g.add(zt2);
        var zs1=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.5,0.6),zc);zs1.position.set(-1.4,0.5,0);g.add(zs1);
        var zs2=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.7,0.8),zc);zs2.position.set(1.4,0.6,0);g.add(zs2);
        var zspk=new THREE.Mesh(new THREE.ConeGeometry(0.15,0.6,6),gray);zspk.position.set(1.4,1.1,0);g.add(zspk);
        [[-1.4,zc],[1.4,zc]].forEach(function(p){var a=new THREE.Mesh(new THREE.BoxGeometry(0.38,1.3,0.38),p[1]);a.position.set(p[0],-0.4,0);g.add(a);var h=new THREE.Mesh(new THREE.BoxGeometry(0.32,0.28,0.32),gray);h.position.set(p[0],-1.15,0);g.add(h);});
        [[-0.42,zc,zdk],[0.42,zc,zdk]].forEach(function(p){var u=new THREE.Mesh(new THREE.BoxGeometry(0.48,0.95,0.48),p[1]);u.position.set(p[0],-1.8,0);g.add(u);var l=new THREE.Mesh(new THREE.BoxGeometry(0.52,1.1,0.52),p[2]);l.position.set(p[0],-2.95,0);g.add(l);var ft=new THREE.Mesh(new THREE.BoxGeometry(0.52,0.28,0.7),p[2]);ft.position.set(p[0],-3.65,0.1);g.add(ft);});
        var zbp=new THREE.Mesh(new THREE.BoxGeometry(0.9,1.0,0.5),gray);zbp.position.set(0,0.1,-0.7);g.add(zbp);
        var zgl=new THREE.Mesh(new THREE.ConeGeometry(0.2,0.7,6),glowMat);zgl.position.set(0,-0.6,-0.7);zgl.rotation.x=Math.PI;g.add(zgl);
        var zsh=new THREE.Mesh(new THREE.CylinderGeometry(0.7,0.7,0.12,8),zc);zsh.rotation.z=Math.PI/2;zsh.position.set(-1.9,-0.2,0.3);g.add(zsh);
    } else if(msType==='dom'){
        var dc2=toon(0x332244);var dlc=toon(0x443355);var dblk=toon(0x1A1A2A);
        g.add(new THREE.Mesh(new THREE.BoxGeometry(2.0,2.0,1.1),dc2));
        var dwa=new THREE.Mesh(new THREE.BoxGeometry(1.5,0.4,0.9),dblk);dwa.position.y=-1.2;g.add(dwa);
        var dhd=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.7,0.7),dc2);dhd.position.y=1.5;g.add(dhd);
        var dvi=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.15,0.15),new THREE.MeshBasicMaterial({color:0xFF4444}));dvi.position.set(0,1.55,0.4);g.add(dvi);
        var ds1=new THREE.Mesh(new THREE.SphereGeometry(0.5,6,5),dlc);ds1.position.set(-1.5,0.6,0);g.add(ds1);
        var ds2=new THREE.Mesh(new THREE.SphereGeometry(0.5,6,5),dlc);ds2.position.set(1.5,0.6,0);g.add(ds2);
        var da1=new THREE.Mesh(new THREE.BoxGeometry(0.42,1.3,0.42),dc2);da1.position.set(-1.5,-0.4,0);g.add(da1);
        var da2=new THREE.Mesh(new THREE.BoxGeometry(0.42,1.3,0.42),dc2);da2.position.set(1.5,-0.4,0);g.add(da2);
        var dsk=new THREE.Mesh(new THREE.CylinderGeometry(0.8,1.4,1.8,8),dblk);dsk.position.y=-2.3;g.add(dsk);
        var dgl=new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.3,0.3,8),new THREE.MeshBasicMaterial({color:0x6644FF,transparent:true,opacity:0.4}));dgl.position.y=-3.3;g.add(dgl);
        var dbp=new THREE.Mesh(new THREE.BoxGeometry(1.1,1.2,0.5),gray);dbp.position.set(0,0.2,-0.8);g.add(dbp);
    } else if(msType==='valkyrie'){
        return _buildValkyrie();
    } else if(msType==='sdf1'){
        return _buildSDF1();
    } else if(msType==='zenPod'){
        return _buildZenPod();
    } else if(msType==='zenCruiser'){
        return _buildZenCruiser();
    }
    // Weapons (shared across all MS types)
    if(weaponType==='rifle'){
        var rf=new THREE.Group();var brl=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.1,2.5,6),gray);brl.rotation.x=Math.PI/2;brl.position.z=1.0;rf.add(brl);var rfgrp=new THREE.Mesh(new THREE.BoxGeometry(0.15,0.4,0.3),darkGray);rfgrp.position.set(0,-0.15,0);rf.add(rfgrp);rf.position.set(1.5,-1.0,0.5);g.add(rf);result.weapon=rf;
    } else if(weaponType==='saber'){
        var sb=new THREE.Group();sb.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,0.5,6),gray));
        var bld=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.02,2.5,6),new THREE.MeshBasicMaterial({color:msType==='zaku'||msType==='dom'?0xFF4466:0xFF88CC,transparent:true,opacity:0.8}));bld.position.y=1.5;sb.add(bld);
        sb.position.set(1.5,-0.5,0.8);sb.rotation.x=-0.3;g.add(sb);result.saberMesh=sb;
    } else if(weaponType==='funnel'){
        var funnels=[];
        for(var fi2=0;fi2<6;fi2++){var fnG=new THREE.Group();var fnBody=new THREE.Mesh(new THREE.ConeGeometry(0.35,0.9,4),toon(0x8866AA));fnG.add(fnBody);var fnGlow=new THREE.Mesh(new THREE.SphereGeometry(0.2,4,3),new THREE.MeshBasicMaterial({color:0xFF44FF,transparent:true,opacity:0.5}));fnGlow.position.y=-0.5;fnG.add(fnGlow);var fa2=fi2*Math.PI*2/6;fnG.position.set(Math.cos(fa2)*3,Math.sin(fa2)*2,Math.sin(fa2)*3);g.add(fnG);funnels.push({mesh:fnG,angle:fa2,dist:3+Math.random()});}
        result.funnels=funnels;
    } else if(weaponType==='missile'){
        [[-1.5],[1.5]].forEach(function(p){var pd=new THREE.Group();for(var mi=0;mi<3;mi++){var tb=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,0.8,6),darkGray);tb.position.set(0,0,mi*0.25-0.25);tb.rotation.x=Math.PI/2;pd.add(tb);}pd.position.set(p[0],1.1,0);g.add(pd);});
    }
    g.scale.set(0.4,0.4,0.4); // realistic proportions, visible at moon scale
    if(msType==='sdf1')g.scale.set(0.8,0.8,0.8);
    if(msType==='zenCruiser')g.scale.set(0.3,0.3,0.3);
    return result;
}
// ---- Macross units ----
function _buildValkyrie(){
    var g=new THREE.Group();
    var w=toon(0xEEEEEE),r=toon(0xCC2222),b=toon(0x2244AA),dk=toon(0x444455);
    // Fuselage
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.8,0.5,3.5),w));
    // Nose cone
    var nose=new THREE.Mesh(new THREE.ConeGeometry(0.35,1.5,6),w);nose.rotation.x=Math.PI/2;nose.position.z=2.5;g.add(nose);
    // Canopy
    var canopy=new THREE.Mesh(new THREE.SphereGeometry(0.25,6,4,0,Math.PI*2,0,Math.PI/2),new THREE.MeshBasicMaterial({color:0x44AAFF,transparent:true,opacity:0.6}));
    canopy.position.set(0,0.35,1.2);g.add(canopy);
    // Wings (swept)
    var wingL=new THREE.Mesh(new THREE.BoxGeometry(2.5,0.08,1.2),w);wingL.position.set(-1.5,0,-0.3);wingL.rotation.y=0.15;g.add(wingL);
    var wingR=new THREE.Mesh(new THREE.BoxGeometry(2.5,0.08,1.2),w);wingR.position.set(1.5,0,-0.3);wingR.rotation.y=-0.15;g.add(wingR);
    // Tail fins
    var tailV=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.8,0.6),b);tailV.position.set(0,0.4,-1.5);g.add(tailV);
    var tailL=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.06,0.5),w);tailL.position.set(-0.5,0,-1.5);g.add(tailL);
    var tailR=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.06,0.5),w);tailR.position.set(0.5,0,-1.5);g.add(tailR);
    // Engines
    var eng1=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.25,1.0,6),dk);eng1.rotation.x=Math.PI/2;eng1.position.set(-0.4,-0.15,-1.8);g.add(eng1);
    var eng2=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.25,1.0,6),dk);eng2.rotation.x=Math.PI/2;eng2.position.set(0.4,-0.15,-1.8);g.add(eng2);
    // Engine glow
    var gl1=new THREE.Mesh(new THREE.ConeGeometry(0.22,0.6,6),new THREE.MeshBasicMaterial({color:0x44AAFF,transparent:true,opacity:0.6}));gl1.rotation.x=-Math.PI/2;gl1.position.set(-0.4,-0.15,-2.4);g.add(gl1);
    var gl2=new THREE.Mesh(new THREE.ConeGeometry(0.22,0.6,6),new THREE.MeshBasicMaterial({color:0x44AAFF,transparent:true,opacity:0.6}));gl2.rotation.x=-Math.PI/2;gl2.position.set(0.4,-0.15,-2.4);g.add(gl2);
    // Red stripes
    var stripe=new THREE.Mesh(new THREE.BoxGeometry(0.82,0.06,0.4),r);stripe.position.set(0,0.28,0.5);g.add(stripe);
    g.scale.set(0.7,0.7,0.7);
    return {group:g};
}
function _buildSDF1(){
    var g=new THREE.Group();
    var w=toon(0xCCCCDD),dk=toon(0x555566),r=toon(0xCC2222);
    // Main body (long hull)
    g.add(new THREE.Mesh(new THREE.BoxGeometry(3,3,18),w));
    // Bridge tower
    var bridge=new THREE.Mesh(new THREE.BoxGeometry(1.5,2.5,2),dk);bridge.position.set(0,2.5,4);g.add(bridge);
    // Arm booms (Daedalus/Prometheus)
    var armL=new THREE.Mesh(new THREE.BoxGeometry(1.2,1.2,8),w);armL.position.set(-3.5,0,2);g.add(armL);
    var armR=new THREE.Mesh(new THREE.BoxGeometry(1.2,1.2,8),w);armR.position.set(3.5,0,2);g.add(armR);
    // Carrier decks at arm ends
    var deckL=new THREE.Mesh(new THREE.BoxGeometry(2.5,0.5,4),dk);deckL.position.set(-3.5,0.5,6.5);g.add(deckL);
    var deckR=new THREE.Mesh(new THREE.BoxGeometry(2.5,0.5,4),dk);deckR.position.set(3.5,0.5,6.5);g.add(deckR);
    // Main cannon (bow)
    var cannon=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.8,6,8),r);cannon.rotation.x=Math.PI/2;cannon.position.set(0,0,12);g.add(cannon);
    // Engine block
    var eng=new THREE.Mesh(new THREE.BoxGeometry(4,3,3),dk);eng.position.set(0,0,-9);g.add(eng);
    // Engine glow
    for(var ei=0;ei<4;ei++){var egl=new THREE.Mesh(new THREE.ConeGeometry(0.6,2,6),new THREE.MeshBasicMaterial({color:0x44CCFF,transparent:true,opacity:0.5}));egl.rotation.x=-Math.PI/2;egl.position.set(-1.2+ei*0.8,0,-11);g.add(egl);}
    // Antenna
    var ant=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,4,4),w);ant.position.set(0,4.5,4);g.add(ant);
    g.scale.set(0.8,0.8,0.8);
    return {group:g};
}
function _buildZenPod(){
    var g=new THREE.Group();
    var grn=toon(0x446644),dk=toon(0x334433);
    // Body (egg-shaped)
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.8,8,6),grn));
    // Legs
    var leg1=new THREE.Mesh(new THREE.BoxGeometry(0.2,1.5,0.2),dk);leg1.position.set(-0.5,-1.3,0);leg1.rotation.z=0.2;g.add(leg1);
    var leg2=new THREE.Mesh(new THREE.BoxGeometry(0.2,1.5,0.2),dk);leg2.position.set(0.5,-1.3,0);leg2.rotation.z=-0.2;g.add(leg2);
    // Eye
    var eye=new THREE.Mesh(new THREE.SphereGeometry(0.15,6,4),new THREE.MeshBasicMaterial({color:0xFF4444}));eye.position.set(0,0.2,0.75);g.add(eye);
    // Gun arm
    var gun=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,1.2,6),dk);gun.rotation.x=Math.PI/2;gun.position.set(0.7,0,0.5);g.add(gun);
    g.scale.set(0.5,0.5,0.5);
    return {group:g};
}
function _buildZenCruiser(){
    var g=new THREE.Group();
    var grn=toon(0x335533),dk=toon(0x223322),r=toon(0x884422);
    // Hull (elongated)
    g.add(new THREE.Mesh(new THREE.BoxGeometry(2,1.5,10),grn));
    // Bow
    var bow=new THREE.Mesh(new THREE.ConeGeometry(1.0,3,6),grn);bow.rotation.x=Math.PI/2;bow.position.z=6.5;g.add(bow);
    // Engine section
    var eng=new THREE.Mesh(new THREE.BoxGeometry(2.5,2,3),dk);eng.position.z=-5.5;g.add(eng);
    // Turrets
    for(var ti=0;ti<3;ti++){var turret=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,0.5,6),r);turret.position.set(0,1,ti*3-2);g.add(turret);}
    // Engine glow
    var egl=new THREE.Mesh(new THREE.ConeGeometry(0.8,2,6),new THREE.MeshBasicMaterial({color:0x44FF44,transparent:true,opacity:0.4}));egl.rotation.x=-Math.PI/2;egl.position.z=-7.5;g.add(egl);
    g.scale.set(0.3,0.3,0.3);
    return {group:g};
}
