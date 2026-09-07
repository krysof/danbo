// Network appearances use only shipped catalogue geometry. No remote textures,
// model URLs or footprints. Multiplayer applies a near-player rendering budget.
(function(){
    'use strict';
    var categories=['hair','accessory','glasses','hat','halo','back'];
    function selected(){
        var out={},eq=typeof Cosmetics!=='undefined'?Cosmetics.equipment():{};
        categories.forEach(function(cat){var id=eq[cat],it=typeof _ITEM_BY_ID!=='undefined'&&_ITEM_BY_ID[id];if(it&&it.cat===cat)out[cat]=id;});
        return JSON.stringify(out);
    }
    function clear(avatar){
        var body=avatar&&avatar.userData.body,root=body&&body.userData._netCosRoot;
        if(root){body.remove(root);disposeTransientObject3D(root);delete body.userData._netCosRoot;}
    }
    function apply(avatar,raw){
        clear(avatar);var body=avatar&&avatar.userData.body;if(!body)return false;
        var eq={};try{if(typeof raw==='string'&&raw.length<=512)eq=JSON.parse(raw)||{};}catch(_){}
        var root=new THREE.Group();root.userData.spin=[];
        categories.forEach(function(cat){
            var id=eq[cat],it=typeof _ITEM_BY_ID!=='undefined'&&_ITEM_BY_ID[id];
            if(!it||it.cat!==cat)return;
            var part=_buildCosmetic(id);if(!part)return;
            root.add(part);if(part.userData._spin)root.userData.spin.push(part);
        });
        if(!root.children.length)return false;
        body.userData._netCosRoot=root;body.add(root);return true;
    }
    function tick(avatar,dt){var body=avatar&&avatar.userData.body,root=body&&body.userData._netCosRoot;if(root)root.userData.spin.forEach(function(g){g.rotation.y+=dt*0.65;});}
    window.DANBO_APPEARANCE={selected:selected,apply:apply,clear:clear,tick:tick};
})();
