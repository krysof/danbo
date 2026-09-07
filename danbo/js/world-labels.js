// Screen-resolution text anchored in the world, outside the low-DPR 3D/AO/Bloom
// pipeline. No canvas text textures, extra WebGL renderer or high-DPR scene pass.
(function(){
    'use strict';
    var layer=document.getElementById('world-label-layer');
    var entries=new Set(),candidates=[],placed=[],visibleCount=0,lastWidth=0,lastHeight=0,world=new THREE.Vector3(),projected=new THREE.Vector3(),eye=new THREE.Vector3();
    var MAX_VISIBLE=32;
    function create(kind,owner){
        var anchor=new THREE.Object3D();
        var element=document.createElement('div');element.className='world-label world-label-'+kind;element.hidden=true;
        var primary=document.createElement('span');primary.className='world-label-primary';element.appendChild(primary);
        var secondary=document.createElement('span');secondary.className='world-label-secondary';secondary.hidden=true;element.appendChild(secondary);
        layer.appendChild(element);
        var entry={anchor:anchor,owner:owner||null,kind:kind,element:element,primary:primary,secondary:secondary,opacity:1,local:false,x:0,y:0,distance:0,dirty:true,width:0,height:0};
        anchor._worldLabel=entry;entries.add(entry);return anchor;
    }
    function setText(anchor,name,line){
        var e=anchor&&anchor._worldLabel;if(!e)return;
        // Player-supplied text is never interpreted as HTML.
        e.primary.textContent=String(name||'').slice(0,e.kind==='chat'?80:32);
        e.secondary.textContent=String(line||'').slice(0,80);e.secondary.hidden=!line;e.dirty=true;
    }
    function dispose(anchor){
        var e=anchor&&anchor._worldLabel;if(!e)return;
        e.element.remove();entries.delete(e);anchor._worldLabel=null;
    }
    function visibility(object){
        for(var node=object;node;node=node.parent){if(!node.visible)return false;if(node===scene)return true;}
        return false;
    }
    function hide(){layer.hidden=true;visibleCount=0;}
    function update(){
        var plugin=window.DANBO_PLUGIN_HOST&&DANBO_PLUGIN_HOST.getActive&&DANBO_PLUGIN_HOST.getActive();
        if((gameState!=='city'&&gameState!=='racing'&&gameState!=='raceIntro')||window._accountPanelOpen||window._journeyPanelOpen||window._multiplayerPanelOpen||window._danboPluginTransition||(plugin&&!plugin.integratedScene)){hide();return;}
        layer.hidden=false;
        var width=layer.clientWidth,height=layer.clientHeight;
        if(!width||!height){hide();return;}
        var resized=width!==lastWidth||height!==lastHeight;lastWidth=width;lastHeight=height;
        eye.setFromMatrixPosition(camera.matrixWorld);candidates.length=0;
        entries.forEach(function(e){
            e.show=false;
            if(!e.anchor.parent){dispose(e.anchor);return;}
            if(!visibility(e.anchor)||(e.owner&&!visibility(e.owner))||e.opacity<=0)return;
            e.anchor.getWorldPosition(world);e.distance=world.distanceToSquared(eye);
            if(!e.local&&e.distance>45*45)return;
            projected.copy(world).project(camera);
            if(projected.z<-1||projected.z>1||Math.abs(projected.x)>1||Math.abs(projected.y)>1)return;
            e.x=Math.round((projected.x*.5+.5)*width);e.y=Math.round((-.5*projected.y+.5)*height);
            candidates.push(e);
        });
        // Keep the local player's tag and nearby conversations readable without
        // turning a full room into dozens of overlapping DOM updates.
        candidates.sort(function(a,b){return Number(b.local)-Number(a.local)||(a.kind==='chat'?0:1)-(b.kind==='chat'?0:1)||a.distance-b.distance;});
        placed.length=0;visibleCount=0;
        var bounds=layer.getBoundingClientRect?layer.getBoundingClientRect():{left:0,top:0};
        ['city-hud','journey-task','minimap-wrap','map-btn','lb-btn'].forEach(function(id){
            var hud=document.getElementById(id);if(!hud||!hud.getBoundingClientRect)return;
            var r=hud.getBoundingClientRect();if(r.width>0&&r.height>0)placed.push({left:r.left-bounds.left,right:r.right-bounds.left,top:r.top-bounds.top,bottom:r.bottom-bounds.top});
        });
        for(var i=0;i<Math.min(MAX_VISIBLE,candidates.length);i++){
            var e=candidates[i];
            // Measure only on new/changed text or viewport changes, never on
            // ordinary movement. Native text is not scaled to fit a sprite.
            if(e.dirty||resized){e.element.hidden=false;e.width=e.element.offsetWidth;e.height=e.element.offsetHeight;e.dirty=false;}
            var x=Math.max(e.width/2+6,Math.min(width-e.width/2-6,e.x)),y=e.y;
            var left=x-e.width/2,right=x+e.width/2,found=false,step=e.height+7;
            for(var trial=0;trial<5;trial++){
                var offset=trial===0?0:Math.ceil(trial/2)*step*(trial%2?-1:1);
                if(Math.abs(offset)>96)continue;y=e.y+offset;
                if(y-e.height<6||y>height-6)continue;
                found=true;
                for(var j=0;j<placed.length;j++){
                    var p=placed[j];if(left<p.right+6&&right>p.left-6&&y>p.top-6&&y-e.height<p.bottom+6){found=false;break;}
                }
                if(found)break;
            }
            // Do not let a crowd cover the player's tag, or float text far away
            // from its speaker just to squeeze every label onto the screen.
            if(!found)continue;
            e.show=true;visibleCount++;
            placed.push({left:left,right:right,top:y-e.height,bottom:y});
            e.element.style.left=x+'px';e.element.style.top=y+'px';e.element.style.opacity=String(e.opacity);
        }
        entries.forEach(function(e){if(e.element.hidden===e.show)e.element.hidden=!e.show;});
    }
    window.DANBO_WORLD_LABELS={create:create,setText:setText,dispose:dispose,update:update,hide:hide,
        setOpacity:function(anchor,value){if(anchor&&anchor._worldLabel)anchor._worldLabel.opacity=Math.max(0,Math.min(1,value));},
        setLocal:function(anchor,value){if(anchor&&anchor._worldLabel)anchor._worldLabel.local=!!value;},
        stats:function(){return{registered:entries.size,visible:visibleCount,limit:MAX_VISIBLE};}};
})();
