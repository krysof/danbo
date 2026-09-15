// Shared toy/ceramic art direction. Each scene owns its cache.
(function(){
    'use strict';
    function pastel(hex){var c=new THREE.Color(hex),hsl={};c.getHSL(hsl);if(hsl.s>.48)c.setHSL(hsl.h,.48,Math.max(hsl.l,.67));return c.getHex();}
    function create(){
        var geometries=new Set(),materials=new Set(),gc={},mc={};
        function geometry(key,make){if(!gc[key]){gc[key]=make();geometries.add(gc[key]);}return gc[key];}
        function material(color){if(!mc[color]){mc[color]=new THREE.MeshStandardMaterial({color:color,roughness:.7,metalness:0});materials.add(mc[color]);}return mc[color];}
        function rounded(w,h,d){return geometry(['box',w,h,d].join(':'),function(){
            var r=Math.min(w,h,d)*.18,g=new THREE.BoxGeometry(w,h,d,3,3,3),p=g.attributes.position,v=new THREE.Vector3(),c=new THREE.Vector3();
            for(var i=0;i<p.count;i++){v.fromBufferAttribute(p,i);c.set(Math.max(-w/2+r,Math.min(w/2-r,v.x)),Math.max(-h/2+r,Math.min(h/2-r,v.y)),Math.max(-d/2+r,Math.min(d/2-r,v.z)));v.sub(c).normalize().multiplyScalar(r).add(c);p.setXYZ(i,v.x,v.y,v.z);}
            g.computeVertexNormals();return g;
        });}
        function mesh(parent,g,color,x,y,z){var m=new THREE.Mesh(g,material(color));m.position.set(x||0,y||0,z||0);parent.add(m);return m;}
        function box(parent,w,h,d,color,x,y,z){return mesh(parent,rounded(w,h,d),color,x,y,z);}
        function soft(parent,color,x,y,z,sx,sy,sz){var m=mesh(parent,geometry('sphere',function(){return new THREE.SphereGeometry(1,16,12);}),color,x,y,z);m.scale.set(sx,sy,sz);return m;}
        function dispose(){geometries.forEach(function(g){g.dispose();});materials.forEach(function(m){m.dispose();});geometries.clear();materials.clear();gc={};mc={};}
        return {geometry:geometry,material:material,rounded:rounded,mesh:mesh,box:box,soft:soft,dispose:dispose};
    }
    window.DanboMinigameArt={create:create,pastel:pastel};
})();
