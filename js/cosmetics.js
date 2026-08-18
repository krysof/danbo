// cosmetics.js — DANBO World Offline Cosmetic Shop
// Cute pastel shop. Buy with coins, own forever, equip for looks only (no stats).
// Saves to localStorage. Integrates with coins + Explorer reward unlocks.

var Cosmetics=(function(){
    var KEY='danbo_shop';
    function load(){
        try{var s=localStorage.getItem(KEY);if(s){var o=JSON.parse(s)||{};return norm(o);}}catch(e){}
        return norm({});
    }
    function norm(o){
        o.owned=o.owned||{};                  // id -> true
        o.equipment=o.equipment||{hair:null,accessory:null,glasses:null,hat:null,halo:null,back:null,footprint:null};
        if(typeof o.coins==='number'&&typeof coins!=='undefined')coins=o.coins; // restore persistent coins
        return o;
    }
    var data=load();
    function save(){ data.coins=(typeof coins!=='undefined')?coins:0; try{localStorage.setItem(KEY,JSON.stringify(data));}catch(e){} }
    // expose
    return {
        data:function(){return data;},
        save:save,
        isOwned:function(id){ if(data.owned[id])return true; var ex=_EXTERNAL_OWN[id]; if(ex&&typeof Explorer!=='undefined'&&Explorer.data().cosmetics&&Explorer.data().cosmetics[ex])return true; return false; },
        equipment:function(){return data.equipment;},
        equip:function(cat,id){data.equipment[cat]=id;save();if(typeof _applyCosmetics==='function')_applyCosmetics();},
        unequip:function(cat){data.equipment[cat]=null;save();if(typeof _applyCosmetics==='function')_applyCosmetics();},
        buy:function(id){
            var it=_ITEM_BY_ID[id]; if(!it)return false;
            if(Cosmetics.isOwned(id))return true;
            if(typeof coins==='undefined'||coins<it.price)return false;
            coins-=it.price; data.owned[id]=true; save();
            var ce=document.getElementById('coin-hud'); if(ce)ce.textContent='\u2B50 '+coins;
            return true;
        }
    };
})();

// ---- which shop ids are already granted by Explorer rewards ----
var _EXTERNAL_OWN={
    hat_explorer:'cosmetic_explorer_hat', hat_astronaut:'cosmetic_space_helmet',
    halo_sakura:'cosmetic_sakura_halo', halo_cloud:'cosmetic_cloud_halo', halo_rainbow:'cosmetic_rainbow_halo',
    fp_rainbow:'cosmetic_rainbow_footprints'
};

// ---- catalog ----
var _CATS=[
    {id:'hair',name:'\u53D1\u578B'},{id:'accessory',name:'\u53D1\u9970'},{id:'glasses',name:'\u773C\u955C'},
    {id:'hat',name:'\u5E3D\u5B50'},{id:'halo',name:'\u5149\u73AF'},{id:'back',name:'\u80CC\u9970'},{id:'footprint',name:'\u811A\u5370\u7279\u6548'}
];
var _ITEMS=[
    // hair — male
    {id:'hair_m_short',cat:'hair',gender:'male',price:300,name:'\u77ED\u53D1'},
    {id:'hair_m_spiky',cat:'hair',gender:'male',price:500,name:'\u523A\u731F\u5934'},
    {id:'hair_m_sport',cat:'hair',gender:'male',price:800,name:'\u8FD0\u52A8\u77ED\u53D1'},
    {id:'hair_m_samurai',cat:'hair',gender:'male',price:1500,name:'\u6B66\u58EB\u53D1\u578B'},
    // hair — female
    {id:'hair_f_twin',cat:'hair',gender:'female',price:300,name:'\u53CC\u9A6C\u5C3E'},
    {id:'hair_f_long',cat:'hair',gender:'female',price:500,name:'\u957F\u76F4\u53D1'},
    {id:'hair_f_curly',cat:'hair',gender:'female',price:800,name:'\u5377\u53D1'},
    {id:'hair_f_princess',cat:'hair',gender:'female',price:1500,name:'\u516C\u4E3B\u53D1\u578B'},
    // accessory (both)
    {id:'acc_pink_clip',cat:'accessory',price:200,name:'\u7C89\u8272\u53D1\u5361'},
    {id:'acc_sakura_clip',cat:'accessory',price:500,name:'\u6A31\u82B1\u53D1\u5361'},
    {id:'acc_star_clip',cat:'accessory',price:800,name:'\u661F\u661F\u53D1\u5361'},
    {id:'acc_cat_ears',cat:'accessory',price:1200,name:'\u732B\u8033\u53D1\u7BAE'},
    {id:'acc_bunny_ears',cat:'accessory',price:1200,name:'\u5154\u8033\u53D1\u7BAE'},
    {id:'acc_crown',cat:'accessory',price:3000,name:'\u7687\u51A0'},
    // glasses
    {id:'glasses_round',cat:'glasses',price:500,name:'\u5706\u6846\u773C\u955C'},
    {id:'glasses_sun',cat:'glasses',price:800,name:'\u58A8\u955C'},
    {id:'glasses_heart',cat:'glasses',price:1200,name:'\u7231\u5FC3\u773C\u955C'},
    {id:'glasses_star',cat:'glasses',price:1500,name:'\u661F\u661F\u773C\u955C'},
    // hat
    {id:'hat_straw',cat:'hat',price:500,name:'\u8349\u5E3D'},
    {id:'hat_beret',cat:'hat',price:1000,name:'\u8D1D\u96F7\u5E3D'},
    {id:'hat_explorer',cat:'hat',price:1500,name:'\u63A2\u9669\u5BB6\u5E3D'},
    {id:'hat_astronaut',cat:'hat',price:3000,name:'\u5B87\u822A\u5934\u76D4'},
    // halo
    {id:'halo_star',cat:'halo',price:2000,name:'\u661F\u661F\u5149\u73AF'},
    {id:'halo_sakura',cat:'halo',price:2500,name:'\u6A31\u82B1\u5149\u73AF'},
    {id:'halo_cloud',cat:'halo',price:2500,name:'\u4E91\u6735\u5149\u73AF'},
    {id:'halo_rainbow',cat:'halo',price:5000,name:'\u5F69\u8679\u5149\u73AF'},
    // back
    {id:'back_small_wings',cat:'back',price:3000,name:'\u5C0F\u7FC5\u8180'},
    {id:'back_angel',cat:'back',price:8000,name:'\u5929\u4F7F\u7FC5\u8180'},
    {id:'back_devil',cat:'back',price:8000,name:'\u6076\u9B54\u7FC5\u8180'},
    {id:'back_rocket',cat:'back',price:12000,name:'\u706B\u7BAD\u80CC\u5305'},
    // footprint
    {id:'fp_sakura',cat:'footprint',price:3000,name:'\u6A31\u82B1\u811A\u5370'},
    {id:'fp_snow',cat:'footprint',price:3000,name:'\u96EA\u82B1\u811A\u5370'},
    {id:'fp_flame',cat:'footprint',price:3000,name:'\u706B\u7130\u811A\u5370'},
    {id:'fp_rainbow',cat:'footprint',price:5000,name:'\u5F69\u8679\u811A\u5370'}
];
var _ITEM_BY_ID={}; for(var _ii=0;_ii<_ITEMS.length;_ii++)_ITEM_BY_ID[_ITEMS[_ii].id]=_ITEMS[_ii];

// ============================================================
//  COSMETIC 3D BUILDERS  (attached in body-local space)
//  Return a THREE.Object3D, or null for footprints (handled by spawner).
// ============================================================
function _cosTip(){return (typeof toon==='function');}
function _buildCosmetic(id){
    if(!_cosTip())return null;
    var g=new THREE.Group();
    switch(id){
        // ---------------- HAIR ----------------
        case 'hair_m_short':{
            var m=toon(0x3A2A1A);
            for(var i=0;i<8;i++){var a=i/8*Math.PI*2;var t=new THREE.Mesh(new THREE.SphereGeometry(0.16,6,5),m);t.position.set(Math.cos(a)*0.34,1.18,Math.sin(a)*0.30-0.02);t.scale.set(1,0.7,1);g.add(t);}
            return g;}
        case 'hair_m_spiky':{
            var m2=toon(0x2A2A2A);
            for(var s=0;s<9;s++){var sa=s/9*Math.PI*2;var sp=new THREE.Mesh(new THREE.ConeGeometry(0.07,0.3,4),m2);sp.position.set(Math.cos(sa)*0.22,1.34,Math.sin(sa)*0.2);sp.rotation.z=Math.cos(sa)*0.5;sp.rotation.x=-Math.sin(sa)*0.4;g.add(sp);}
            return g;}
        case 'hair_m_sport':{
            var m3=toon(0x5A3A1A);var cap=new THREE.Mesh(new THREE.SphereGeometry(0.5,14,10,0,Math.PI*2,0,Math.PI/2),m3);cap.position.set(0,1.12,0);cap.scale.set(1,0.7,1);g.add(cap);
            var band=new THREE.Mesh(new THREE.TorusGeometry(0.42,0.04,6,18),toon(0xFFFFFF));band.position.set(0,1.18,0);band.rotation.x=Math.PI/2;g.add(band);return g;}
        case 'hair_m_samurai':{
            var m4=toon(0x1A1A22);var base=new THREE.Mesh(new THREE.SphereGeometry(0.46,12,10,0,Math.PI*2,0,Math.PI/2),m4);base.position.set(0,1.1,0);base.scale.set(1,0.8,1);g.add(base);
            var bun=new THREE.Mesh(new THREE.SphereGeometry(0.13,8,6),m4);bun.position.set(0,1.55,-0.05);g.add(bun);
            var tie=new THREE.Mesh(new THREE.TorusGeometry(0.1,0.03,6,12),toon(0xCC3333));tie.position.set(0,1.42,-0.05);tie.rotation.x=Math.PI/2;g.add(tie);return g;}
        case 'hair_f_twin':{
            var m5=toon(0x6A3A2A);var top=new THREE.Mesh(new THREE.SphereGeometry(0.46,12,10,0,Math.PI*2,0,Math.PI*0.6),m5);top.position.set(0,1.08,0);top.scale.set(1,0.8,1);g.add(top);
            [-1,1].forEach(function(sd){var pts=[];for(var k=0;k<=6;k++){var t=k/6;pts.push(new THREE.Vector3(sd*(0.5+t*0.2),1.1-t*0.9,-0.05));}var tail=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),10,0.1,6,false),m5);g.add(tail);
                var rb=new THREE.Mesh(new THREE.TorusGeometry(0.1,0.03,6,12),toon(0xFF7FB0));rb.position.set(sd*0.5,1.08,-0.05);rb.rotation.y=Math.PI/2;g.add(rb);});return g;}
        case 'hair_f_long':{
            var m6=toon(0x3A2A3A);var top6=new THREE.Mesh(new THREE.SphereGeometry(0.48,12,10,0,Math.PI*2,0,Math.PI*0.6),m6);top6.position.set(0,1.08,0);top6.scale.set(1,0.8,1);g.add(top6);
            var back=new THREE.Mesh(new THREE.BoxGeometry(0.7,1.0,0.18),m6);back.position.set(0,0.55,-0.4);g.add(back);return g;}
        case 'hair_f_curly':{
            var m7=toon(0x7A4A2A);for(var c=0;c<14;c++){var ca=c/14*Math.PI*2;var cu=new THREE.Mesh(new THREE.SphereGeometry(0.14,7,6),m7);cu.position.set(Math.cos(ca)*0.42,1.05+Math.sin(c*1.5)*0.12,Math.sin(ca)*0.38-0.05);g.add(cu);}return g;}
        case 'hair_f_princess':{
            var m8=toon(0xE8C040);var top8=new THREE.Mesh(new THREE.SphereGeometry(0.48,12,10,0,Math.PI*2,0,Math.PI*0.6),m8);top8.position.set(0,1.08,0);top8.scale.set(1,0.85,1);g.add(top8);
            [-1,1].forEach(function(sd){var pts=[];for(var k=0;k<=7;k++){var t=k/7;pts.push(new THREE.Vector3(sd*(0.45+Math.sin(t*3)*0.1),1.05-t*1.0,-0.05));}g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),12,0.11,6,false),m8));});
            var tiara=new THREE.Mesh(new THREE.TorusGeometry(0.34,0.03,6,18,Math.PI),toon(0xFFD86B,{emissive:0xCC9A00,emissiveIntensity:0.3}));tiara.position.set(0,1.2,0.18);tiara.rotation.x=Math.PI/2;g.add(tiara);return g;}
        // ---------------- ACCESSORY ----------------
        case 'acc_pink_clip':{var cl=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.06,0.04),toon(0xFF7FB0));cl.position.set(0.28,1.12,0.42);g.add(cl);return g;}
        case 'acc_sakura_clip':{var fl=new THREE.Group();for(var p=0;p<5;p++){var pa=p/5*Math.PI*2;var pet=new THREE.Mesh(new THREE.CircleGeometry(0.06,8),toon(0xFFB6CE,{side:THREE.DoubleSide}));pet.position.set(Math.cos(pa)*0.06,0,Math.sin(pa)*0.06);pet.rotation.x=-Math.PI/2;fl.add(pet);}fl.position.set(0.3,1.12,0.4);g.add(fl);return g;}
        case 'acc_star_clip':{var st=new THREE.Mesh(new THREE.OctahedronGeometry(0.1,0),toon(0xFFE066,{emissive:0xCC9A00,emissiveIntensity:0.3}));st.position.set(0.3,1.14,0.4);g.add(st);return g;}
        case 'acc_cat_ears':{[-1,1].forEach(function(sd){var e=new THREE.Mesh(new THREE.ConeGeometry(0.14,0.26,4),toon(0x444444));e.position.set(sd*0.26,1.42,0);g.add(e);var inr=new THREE.Mesh(new THREE.ConeGeometry(0.08,0.16,4),toon(0xFFB6CE));inr.position.set(sd*0.26,1.4,0.04);g.add(inr);});return g;}
        case 'acc_bunny_ears':{[-1,1].forEach(function(sd){var e=new THREE.Mesh(new THREE.CapsuleGeometry?new THREE.CapsuleGeometry(0.07,0.3,4,8):new THREE.CylinderGeometry(0.07,0.07,0.4,8),toon(0xFFFFFF));e.position.set(sd*0.18,1.55,0);e.rotation.z=sd*0.18;g.add(e);var inr=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,0.34,6),toon(0xFFB6CE));inr.position.set(sd*0.18,1.55,0.05);inr.rotation.z=sd*0.18;g.add(inr);});return g;}
        case 'acc_crown':{var band=new THREE.Mesh(new THREE.CylinderGeometry(0.33,0.33,0.16,16,1,true),toon(0xFFD23F,{emissive:0xCC9A00,emissiveIntensity:0.35,side:THREE.DoubleSide}));band.position.set(0,1.34,0);g.add(band);for(var t2=0;t2<6;t2++){var ta=t2/6*Math.PI*2;var sp=new THREE.Mesh(new THREE.ConeGeometry(0.06,0.16,4),toon(0xFFD23F,{emissive:0xCC9A00,emissiveIntensity:0.35}));sp.position.set(Math.cos(ta)*0.33,1.45,Math.sin(ta)*0.33);g.add(sp);}return g;}
        // ---------------- GLASSES ----------------
        case 'glasses_round':{[-1,1].forEach(function(sd){var r=new THREE.Mesh(new THREE.TorusGeometry(0.12,0.025,6,16),toon(0x333333));r.position.set(sd*0.2,0.9,0.6);g.add(r);});var br=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.02,0.02),toon(0x333333));br.position.set(0,0.9,0.6);g.add(br);return g;}
        case 'glasses_sun':{[-1,1].forEach(function(sd){var l=new THREE.Mesh(new THREE.CircleGeometry(0.13,16),toon(0x111122,{side:THREE.DoubleSide}));l.position.set(sd*0.2,0.9,0.62);g.add(l);});var br2=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.05,0.03),toon(0x111111));br2.position.set(0,0.93,0.6);g.add(br2);return g;}
        case 'glasses_heart':{[-1,1].forEach(function(sd){var h=new THREE.Mesh(new THREE.SphereGeometry(0.12,8,6),toon(0xFF5588,{transparent:true,opacity:0.85}));h.position.set(sd*0.2,0.9,0.6);h.scale.set(1,0.9,0.4);g.add(h);});return g;}
        case 'glasses_star':{[-1,1].forEach(function(sd){var st=new THREE.Mesh(new THREE.OctahedronGeometry(0.13,0),toon(0xFFE066,{emissive:0xCC9A00,emissiveIntensity:0.3}));st.position.set(sd*0.2,0.9,0.6);st.scale.set(1,1,0.4);g.add(st);});return g;}
        // ---------------- HAT ----------------
        case 'hat_straw':{var brim=new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.6,0.06,18),toon(0xE8C878));brim.position.set(0,1.3,0);g.add(brim);var top=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.34,0.28,16),toon(0xDDB868));top.position.set(0,1.45,0);g.add(top);var rb=new THREE.Mesh(new THREE.TorusGeometry(0.32,0.03,6,16),toon(0xCC5544));rb.position.set(0,1.36,0);rb.rotation.x=Math.PI/2;g.add(rb);return g;}
        case 'hat_beret':{var b=new THREE.Mesh(new THREE.SphereGeometry(0.42,14,10,0,Math.PI*2,0,Math.PI/2),toon(0xCC3355));b.position.set(0.05,1.34,0);b.scale.set(1,0.5,1);g.add(b);var nub=new THREE.Mesh(new THREE.SphereGeometry(0.05,6,5),toon(0xCC3355));nub.position.set(0.05,1.5,0);g.add(nub);return g;}
        case 'hat_explorer':{var brim=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.54,0.06,18),toon(0x8B6A40));brim.position.set(0,1.3,0);g.add(brim);var top=new THREE.Mesh(new THREE.CylinderGeometry(0.32,0.36,0.32,16),toon(0xA07A4A));top.position.set(0,1.46,0);g.add(top);var bd=new THREE.Mesh(new THREE.TorusGeometry(0.34,0.035,6,16),toon(0x5A4028));bd.position.set(0,1.36,0);bd.rotation.x=Math.PI/2;g.add(bd);return g;}
        case 'hat_astronaut':{var helm=new THREE.Mesh(new THREE.SphereGeometry(0.55,16,14),new THREE.MeshPhongMaterial({color:0xFFFFFF,shininess:80}));helm.position.set(0,1.15,0);g.add(helm);var vis=new THREE.Mesh(new THREE.SphereGeometry(0.5,16,12,Math.PI*0.2,Math.PI*0.6,Math.PI*0.35,Math.PI*0.4),new THREE.MeshPhongMaterial({color:0x224488,shininess:120}));vis.position.set(0,1.15,0.04);g.add(vis);return g;}
        // ---------------- HALO ----------------
        case 'halo_star':{var ring=new THREE.Mesh(new THREE.TorusGeometry(0.4,0.04,8,24),new THREE.MeshBasicMaterial({color:0xFFE066,transparent:true,opacity:0.9}));ring.position.set(0,1.85,0);ring.rotation.x=Math.PI/2;ring.userData._spin=1;g.add(ring);for(var s3=0;s3<6;s3++){var sa=s3/6*Math.PI*2;var st=new THREE.Mesh(new THREE.OctahedronGeometry(0.07,0),new THREE.MeshBasicMaterial({color:0xFFF2A0}));st.position.set(Math.cos(sa)*0.4,1.85,Math.sin(sa)*0.4);g.add(st);}g.userData._spin=true;return g;}
        case 'halo_sakura':{var ring=new THREE.Mesh(new THREE.TorusGeometry(0.4,0.04,8,24),new THREE.MeshBasicMaterial({color:0xFFB6CE,transparent:true,opacity:0.9}));ring.position.set(0,1.85,0);ring.rotation.x=Math.PI/2;g.add(ring);for(var p2=0;p2<8;p2++){var pa=p2/8*Math.PI*2;var pet=new THREE.Mesh(new THREE.CircleGeometry(0.06,8),new THREE.MeshBasicMaterial({color:0xFF9FC0,transparent:true,opacity:0.9,side:THREE.DoubleSide}));pet.position.set(Math.cos(pa)*0.4,1.85,Math.sin(pa)*0.4);pet.rotation.x=-Math.PI/2;g.add(pet);}g.userData._spin=true;return g;}
        case 'halo_cloud':{for(var cl2=0;cl2<6;cl2++){var ca=cl2/6*Math.PI*2;var pf=new THREE.Mesh(new THREE.SphereGeometry(0.12,8,6),new THREE.MeshBasicMaterial({color:0xFFFFFF,transparent:true,opacity:0.85}));pf.position.set(Math.cos(ca)*0.36,1.85,Math.sin(ca)*0.36);g.add(pf);}g.userData._spin=true;return g;}
        case 'halo_rainbow':{var cols=[0xFF5555,0xFFAA33,0xFFE033,0x55CC55,0x55AAFF,0xAA66FF];for(var rc=0;rc<cols.length;rc++){var ra=rc/cols.length*Math.PI*2;var seg=new THREE.Mesh(new THREE.SphereGeometry(0.09,8,6),new THREE.MeshBasicMaterial({color:cols[rc]}));seg.position.set(Math.cos(ra)*0.4,1.85,Math.sin(ra)*0.4);g.add(seg);}g.userData._spin=true;return g;}
        // ---------------- BACK ----------------
        case 'back_small_wings':{[-1,1].forEach(function(sd){var w=new THREE.Mesh(new THREE.SphereGeometry(0.22,8,6),new THREE.MeshBasicMaterial({color:0xFFFFFF,transparent:true,opacity:0.9}));w.position.set(sd*0.3,0.85,-0.5);w.scale.set(0.4,0.7,0.18);w.rotation.z=sd*0.4;g.add(w);});return g;}
        case 'back_angel':{[-1,1].forEach(function(sd){for(var f=0;f<3;f++){var w=new THREE.Mesh(new THREE.SphereGeometry(0.3-f*0.05,8,6),new THREE.MeshBasicMaterial({color:0xFFFFFF,transparent:true,opacity:0.92}));w.position.set(sd*(0.36+f*0.12),0.95-f*0.18,-0.5);w.scale.set(0.4,0.9,0.16);w.rotation.z=sd*(0.5+f*0.15);g.add(w);}});return g;}
        case 'back_devil':{[-1,1].forEach(function(sd){var w=new THREE.Mesh(new THREE.SphereGeometry(0.3,8,6),new THREE.MeshBasicMaterial({color:0x3a1030,transparent:true,opacity:0.92}));w.position.set(sd*0.36,0.92,-0.5);w.scale.set(0.45,0.85,0.16);w.rotation.z=sd*0.5;g.add(w);for(var sp=0;sp<3;sp++){var spike=new THREE.Mesh(new THREE.ConeGeometry(0.05,0.16,4),toon(0x551133));spike.position.set(sd*(0.5+sp*0.12),1.05-sp*0.22,-0.5);spike.rotation.z=sd*-0.6;g.add(spike);}});return g;}
        case 'back_rocket':{var body=new THREE.Mesh(new THREE.CapsuleGeometry?new THREE.CapsuleGeometry(0.16,0.5,6,10):new THREE.CylinderGeometry(0.16,0.16,0.7,10),toon(0xDDDDEE));body.position.set(0,0.8,-0.5);g.add(body);var tip=new THREE.Mesh(new THREE.ConeGeometry(0.16,0.2,10),toon(0xCC4444));tip.position.set(0,1.2,-0.5);g.add(tip);var flame=new THREE.Mesh(new THREE.ConeGeometry(0.12,0.3,8),new THREE.MeshBasicMaterial({color:0xFFAA33,transparent:true,opacity:0.85}));flame.position.set(0,0.4,-0.5);flame.rotation.x=Math.PI;g.add(flame);return g;}
        default:return null;
    }
}

// ============================================================
//  APPLY EQUIPMENT TO THE PLAYER
// ============================================================
var _cosLastMesh=null,_cosSpinGroups=[];
function _cosBody(){ return (typeof playerEgg!=='undefined'&&playerEgg&&playerEgg.mesh&&playerEgg.mesh.userData)?playerEgg.mesh.userData.body:null; }
function _applyCosmetics(previewCat,previewId){
    var body=_cosBody(); if(!body)return;
    // remove old root
    if(body.userData._cosRoot){body.remove(body.userData._cosRoot);}
    var root=new THREE.Group();body.userData._cosRoot=root;body.add(root);
    _cosSpinGroups=[];
    var eq=Cosmetics.equipment();
    var cats=['hair','accessory','glasses','hat','halo','back']; // footprint handled separately
    for(var i=0;i<cats.length;i++){
        var cat=cats[i];
        var id=(previewCat===cat)?previewId:eq[cat];
        if(!id)continue;
        var obj=_buildCosmetic(id);
        if(obj){root.add(obj);if(obj.userData&&obj.userData._spin)_cosSpinGroups.push(obj);}
    }
    // Keep the player marker centered above the tallest equipped item. Hats, helmets
    // and halos must never be pierced or covered by the downward-pointing arrow.
    if(typeof _updatePlayerArrowClearance==='function')_updatePlayerArrowClearance(root);
    _cosLastMesh=playerEgg.mesh;
}

// ============================================================
//  FOOTPRINT SPAWNER  (world-space fading particles)
// ============================================================
var _fpParticles=[],_fpTick=0;
function _spawnFootprint(type){
    if(!playerEgg||!playerEgg.mesh)return;
    var p=playerEgg.mesh.position;
    var col,rise=false;
    if(type==='fp_sakura')col=0xFFB6CE;
    else if(type==='fp_snow')col=0xFFFFFF;
    else if(type==='fp_flame'){col=0xFF8833;rise=true;}
    else if(type==='fp_rainbow')col=[0xFF5555,0xFFE033,0x55CC55,0x55AAFF,0xAA66FF][Math.floor(Math.random()*5)];
    else return;
    var geo=(type==='fp_sakura')?new THREE.CircleGeometry(0.16,6):new THREE.SphereGeometry(0.12,6,5);
    var m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.85,depthWrite:false,side:THREE.DoubleSide}));
    m.position.set(p.x+(Math.random()-0.5)*0.4,0.1,p.z+(Math.random()-0.5)*0.4);
    if(geo.type==='CircleGeometry')m.rotation.x=-Math.PI/2;
    scene.add(m);
    _fpParticles.push({mesh:m,life:30,max:30,vy:rise?0.03:0,rot:(Math.random()-0.5)*0.2});
}
function _updateFootprints(){
    for(var i=_fpParticles.length-1;i>=0;i--){
        var fp=_fpParticles[i];fp.life--;
        if(fp.life<=0){scene.remove(fp.mesh);_fpParticles.splice(i,1);continue;}
        var t=fp.life/fp.max;fp.mesh.material.opacity=t*0.85;
        fp.mesh.position.y+=fp.vy;fp.mesh.rotation.z+=fp.rot;
        var sc=0.6+t*0.4;fp.mesh.scale.set(sc,sc,sc);
    }
}

// ============================================================
//  SHOP UI — an in-world boutique cabinet with a real 3D try-on stage
// ============================================================
window._shopOpen=false;
var _shopCat='hair',_shopSel=null,_shopPreview=null;
var _SHOP_CAT_VISUAL={
    hair:{glyph:'\u2726',label:'\u53D1\u578B',color:'#D98A64',soft:'#FFE2C9'},
    accessory:{glyph:'\u273F',label:'\u53D1\u9970',color:'#E56F8D',soft:'#FFDCE7'},
    glasses:{glyph:'\u25C9',label:'\u773C\u955C',color:'#5487A9',soft:'#D8EFFF'},
    hat:{glyph:'\u25B2',label:'\u5E3D\u5B50',color:'#B57948',soft:'#F5D6AD'},
    halo:{glyph:'\u25CC',label:'\u5149\u73AF',color:'#DAA62D',soft:'#FFF0B4'},
    back:{glyph:'\u7FBD',label:'\u80CC\u9970',color:'#7D79B8',soft:'#E6E2FF'},
    footprint:{glyph:'\u2737',label:'\u811A\u5370',color:'#5A9E88',soft:'#D8F2E9'}
};
function _coinsNow(){return (typeof coins!=='undefined')?coins:0;}
function _shopEnsureStyles(){
    if(document.getElementById('shop-cinematic-style'))return;
    var style=document.createElement('style');style.id='shop-cinematic-style';
    style.textContent=
    '#shop-overlay{position:fixed;inset:0;z-index:150;display:flex;align-items:center;justify-content:center;padding:22px;box-sizing:border-box;'+
      'background:radial-gradient(circle at 50% 36%,rgba(56,74,94,.24),rgba(20,23,35,.72) 72%);'+
      'backdrop-filter:blur(7px) saturate(.9);-webkit-backdrop-filter:blur(7px) saturate(.9);font-family:system-ui,-apple-system,"Segoe UI",sans-serif;perspective:1400px;}'+
    '#shop-card{position:relative;width:min(960px,96vw);height:min(650px,91vh);min-height:440px;display:flex;flex-direction:column;overflow:hidden;'+
      'border:1px solid rgba(255,244,214,.72);border-radius:30px;background:linear-gradient(145deg,#FFF8E9 0%,#F4E7CE 48%,#E8D4B1 100%);'+
      'box-shadow:0 34px 80px rgba(8,13,24,.54),0 8px 18px rgba(45,27,14,.34),inset 0 2px 0 #fff,inset 0 -5px 12px rgba(106,70,38,.16);'+
      'transform:rotateX(.45deg);animation:shopCabinetIn .34s cubic-bezier(.2,.8,.2,1) both;}'+
    '#shop-card:before{content:"";position:absolute;inset:7px;z-index:4;pointer-events:none;border-radius:24px;border:2px solid rgba(145,86,45,.38);'+
      'box-shadow:inset 0 0 0 1px rgba(255,255,255,.75),0 0 0 1px rgba(91,50,28,.16);}'+
    '@keyframes shopCabinetIn{from{opacity:0;transform:translateY(22px) rotateX(4deg) scale(.97)}to{opacity:1;transform:translateY(0) rotateX(.45deg) scale(1)}}'+
    '.shop-header{position:relative;z-index:5;min-height:72px;padding:12px 18px 12px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px;box-sizing:border-box;'+
      'color:#FFF8E6;background:linear-gradient(180deg,#B95647 0%,#8F352E 56%,#742821 100%);border-bottom:3px solid #D7A760;'+
      'box-shadow:inset 0 2px 0 rgba(255,255,255,.24),inset 0 -7px 13px rgba(63,18,17,.32),0 5px 13px rgba(83,46,26,.28);}'+
    '.shop-header:after{content:"";position:absolute;left:0;right:0;bottom:-7px;height:8px;background:linear-gradient(90deg,#F5DBA5,#B7783D 12%,#F2C875 27%,#A96533 47%,#F4D48F 68%,#A56532 86%,#F3D89E);box-shadow:0 2px 5px rgba(63,37,18,.3);}'+
    '.shop-brand{display:flex;align-items:center;min-width:0;gap:12px;text-shadow:0 2px 2px rgba(70,17,13,.45);}'+
    '.shop-brand-mark{width:43px;height:43px;flex:none;display:grid;place-items:center;border-radius:14px;color:#8C332B;font-size:22px;'+
      'background:radial-gradient(circle at 34% 25%,#FFFBE9,#F7D58C 54%,#C4843E 100%);border:2px solid #FFE9B6;'+
      'box-shadow:0 5px 9px rgba(52,20,13,.34),inset 0 3px 4px rgba(255,255,255,.8),inset 0 -4px 5px rgba(146,82,32,.28);transform:rotate(-3deg);}'+
    '.shop-title{font-family:"STKaiti","KaiTi","Noto Serif SC",serif;font-size:23px;font-weight:900;letter-spacing:.08em;white-space:nowrap;}'+
    '.shop-subtitle{margin-top:2px;color:#F3DDBB;font-size:10px;font-weight:700;letter-spacing:.22em;opacity:.92;}'+
    '.shop-head-actions{display:flex;align-items:center;gap:10px;flex:none;}'+
    '#shop-coins{height:36px;display:flex;align-items:center;gap:6px;padding:0 13px;border-radius:18px;color:#6D4514;font-weight:900;'+
      'background:linear-gradient(180deg,#FFF6C9,#EFC66B);border:1px solid #FFE8A3;box-shadow:0 4px 8px rgba(60,25,10,.27),inset 0 2px 2px #fff9d8,inset 0 -3px 4px rgba(160,99,29,.22);}'+
    '.shop-coin-gem{width:17px;height:17px;display:inline-block;background:linear-gradient(145deg,#FFF7A9,#F4B91E 55%,#C9830D);'+
      'clip-path:polygon(50% 0,62% 34%,100% 38%,70% 61%,80% 100%,50% 77%,20% 100%,30% 61%,0 38%,38% 34%);filter:drop-shadow(0 2px 1px rgba(113,66,8,.3));}'+
    '#shop-close{width:38px;height:38px;display:grid;place-items:center;border:0;border-radius:50%;cursor:pointer;color:#FFF8E6;font-size:23px;line-height:1;'+
      'background:linear-gradient(180deg,#CF7467,#8C302A);box-shadow:0 4px 8px rgba(49,17,14,.3),inset 0 2px 2px rgba(255,255,255,.26),inset 0 -3px 4px rgba(67,13,12,.28);transition:transform .16s,filter .16s;}'+
    '#shop-close:hover{transform:translateY(-1px) rotate(5deg);filter:brightness(1.08)}'+
    '.shop-main{position:relative;z-index:2;display:grid;grid-template-columns:250px minmax(0,1fr);flex:1;min-height:0;padding:18px 18px 12px;gap:16px;background:linear-gradient(105deg,rgba(255,251,235,.88),rgba(239,222,191,.68));}'+
    '.shop-preview{position:relative;min-height:0;overflow:hidden;border-radius:23px;border:1px solid rgba(130,82,44,.48);'+
      'background:radial-gradient(ellipse at 50% 28%,rgba(255,250,214,.98),rgba(167,205,207,.72) 48%,rgba(70,111,126,.88) 100%);'+
      'box-shadow:inset 0 2px 4px rgba(255,255,255,.9),inset 0 -16px 26px rgba(32,73,87,.27),0 9px 18px rgba(69,45,26,.22);}'+
    '.shop-preview:before{content:"";position:absolute;left:8%;right:8%;top:7px;height:35%;z-index:0;border-radius:50%;background:linear-gradient(105deg,rgba(255,255,255,.56),rgba(255,255,255,0) 55%);filter:blur(3px);transform:rotate(-4deg);}'+
    '.shop-preview:after{content:"";position:absolute;left:13%;right:13%;bottom:13px;height:10px;border-radius:50%;background:rgba(32,38,43,.25);filter:blur(7px);}'+
    '#shop-preview-canvas{position:absolute;inset:0;width:100%;height:100%;z-index:1;display:block;touch-action:none;}'+
    '.shop-preview-label{position:absolute;left:14px;right:14px;bottom:12px;z-index:3;padding:8px 10px;border-radius:14px;text-align:center;color:#643A25;font-size:12px;font-weight:800;letter-spacing:.04em;'+
      'background:linear-gradient(180deg,rgba(255,251,229,.94),rgba(232,207,164,.92));border:1px solid rgba(255,255,255,.86);box-shadow:0 4px 10px rgba(40,30,19,.22),inset 0 -2px 3px rgba(130,78,34,.14);}'+
    '.shop-catalog{min-width:0;min-height:0;display:flex;flex-direction:column;border-radius:22px;overflow:hidden;border:1px solid rgba(133,83,43,.35);'+
      'background:linear-gradient(180deg,rgba(255,251,239,.96),rgba(238,223,197,.94));box-shadow:0 8px 18px rgba(75,49,29,.18),inset 0 1px 0 #fff;}'+
    '#shop-cats{display:flex;gap:7px;padding:11px 11px 9px;overflow-x:auto;overflow-y:hidden;scrollbar-width:thin;background:linear-gradient(180deg,#E5C898,#C99D65);'+
      'border-bottom:1px solid rgba(102,57,29,.35);box-shadow:inset 0 2px 2px rgba(255,255,255,.42),inset 0 -4px 5px rgba(100,55,25,.13);}'+
    '.shop-cat{height:38px;min-width:70px;padding:0 11px;display:flex;align-items:center;justify-content:center;gap:5px;border:1px solid rgba(109,63,31,.34);border-radius:12px;cursor:pointer;color:#6D4027;'+
      'background:linear-gradient(180deg,#FFF9E9,#EFD9B5);box-shadow:0 3px 5px rgba(83,50,27,.19),inset 0 2px 1px #fff;white-space:nowrap;font-size:12px;font-weight:900;transition:transform .16s,box-shadow .16s;}'+
    '.shop-cat:hover{transform:translateY(-2px);box-shadow:0 5px 8px rgba(83,50,27,.25),inset 0 2px 1px #fff}.shop-cat.active{color:#FFF9E8;border-color:#F7D694;'+
      'background:linear-gradient(180deg,#C95E4D,#8F332C);box-shadow:0 5px 9px rgba(85,29,24,.3),inset 0 2px 2px rgba(255,255,255,.22),inset 0 -3px 4px rgba(70,17,14,.25);transform:translateY(-1px);}'+
    '.shop-cat-glyph{font-size:15px;line-height:1}'+
    '#shop-items{position:relative;flex:1;min-height:0;padding:14px 13px 24px;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:13px;align-content:start;'+
      'background:repeating-linear-gradient(180deg,rgba(255,250,236,.76) 0,rgba(255,250,236,.76) 144px,rgba(135,82,42,.16) 145px,rgba(255,255,255,.75) 149px,rgba(91,52,28,.14) 154px);}'+
    '.shop-item-card{position:relative;height:124px;box-sizing:border-box;padding:8px 8px 9px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;border:1px solid rgba(145,95,56,.28);border-radius:17px;cursor:pointer;text-align:center;color:#553822;'+
      'background:linear-gradient(145deg,rgba(255,255,250,.98),rgba(244,226,197,.95));box-shadow:0 7px 12px rgba(74,49,29,.18),inset 0 2px 2px #fff,inset 0 -4px 5px rgba(132,86,47,.12);transition:transform .18s,box-shadow .18s,border-color .18s;}'+
    '.shop-item-card:after{content:"";position:absolute;left:16%;right:16%;bottom:-6px;height:8px;border-radius:50%;z-index:-1;background:rgba(65,40,24,.2);filter:blur(4px);}'+
    '.shop-item-card:hover{transform:translateY(-4px) scale(1.015);box-shadow:0 12px 18px rgba(70,45,27,.24),inset 0 2px 2px #fff,inset 0 -4px 5px rgba(132,86,47,.12);}'+
    '.shop-item-card.selected{border:2px solid #B84338;transform:translateY(-4px);box-shadow:0 13px 20px rgba(117,43,35,.28),0 0 0 3px rgba(239,180,123,.43),inset 0 2px 2px #fff;}'+
    '.shop-item-card.equipped{border-color:#4F947A;box-shadow:0 8px 14px rgba(48,112,88,.25),inset 0 2px 2px #fff;}'+
    '.shop-item-visual{position:absolute;top:9px;width:58px;height:58px;display:grid;place-items:center;border-radius:50%;color:var(--shop-accent);font-family:serif;font-size:29px;font-weight:900;'+
      'background:radial-gradient(circle at 35% 25%,#fff 0 9%,var(--shop-soft) 35%,var(--shop-accent) 130%);border:1px solid rgba(255,255,255,.94);'+
      'box-shadow:0 7px 9px rgba(69,45,29,.24),inset 0 3px 4px rgba(255,255,255,.94),inset 0 -6px 8px rgba(82,54,35,.16);text-shadow:0 2px 1px rgba(255,255,255,.75);transform:perspective(90px) rotateX(-5deg);}'+
    '.shop-item-visual:after{content:"";position:absolute;left:13px;right:13px;bottom:-8px;height:6px;border-radius:50%;background:rgba(62,40,26,.26);filter:blur(3px);}'+
    '.shop-item-name{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:900;letter-spacing:.02em;}'+
    '.shop-item-price{margin-top:3px;color:#A46B14;font-size:11px;font-weight:800}.shop-item-price.owned{color:#47836D}.shop-item-price.equipped{color:#39705D}'+
    '.shop-foot{position:relative;z-index:5;min-height:66px;padding:10px 22px;display:flex;align-items:center;justify-content:space-between;gap:14px;box-sizing:border-box;'+
      'background:linear-gradient(180deg,#E3C18C,#BE8951);border-top:1px solid #F8DFAE;box-shadow:inset 0 2px 2px rgba(255,255,255,.42),0 -5px 12px rgba(73,41,21,.16);}'+
    '#shop-selname{min-width:0;color:#5D3824;font-size:13px;font-weight:800;text-shadow:0 1px rgba(255,255,255,.55)}'+
    '#shop-action{min-width:110px;padding:10px 22px;border:1px solid rgba(255,255,255,.58);border-radius:16px;cursor:pointer;color:#FFF9EB;font-size:14px;font-weight:900;letter-spacing:.08em;'+
      'box-shadow:0 6px 10px rgba(66,35,20,.27),inset 0 2px 2px rgba(255,255,255,.24),inset 0 -4px 5px rgba(60,19,15,.22);transition:transform .16s,filter .16s;}'+
    '#shop-action:hover{transform:translateY(-2px);filter:brightness(1.06)}#shop-action.buy{background:linear-gradient(180deg,#D76655,#96362F)}'+
    '#shop-action.equip{background:linear-gradient(180deg,#65B594,#397B63)}#shop-action.unequip{background:linear-gradient(180deg,#9B958B,#68645E)}'+
    '@media(max-width:680px){#shop-overlay{padding:10px}#shop-card{width:95vw;height:93dvh;min-height:500px;border-radius:25px}#shop-card:before{inset:5px;border-radius:20px}.shop-header{min-height:64px;padding:9px 12px 9px 16px;gap:7px}.shop-brand{gap:8px}.shop-brand-mark{width:36px;height:36px;border-radius:12px;font-size:18px}.shop-title{font-size:17px;letter-spacing:.02em}.shop-subtitle{display:none}.shop-head-actions{gap:5px}#shop-coins{height:32px;padding:0 9px;font-size:14px}#shop-close{width:33px;height:33px;font-size:21px}.shop-main{grid-template-columns:1fr;grid-template-rows:126px minmax(0,1fr);padding:14px 11px 8px;gap:9px}.shop-preview{border-radius:18px}.shop-preview-label{left:auto;right:9px;bottom:8px;width:132px;padding:6px 8px;font-size:10px}.shop-catalog{border-radius:17px}#shop-cats{padding:8px 8px 7px;gap:6px}.shop-cat{height:34px;min-width:64px;padding:0 9px;font-size:11px}#shop-items{padding:10px 9px 20px;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;background:repeating-linear-gradient(180deg,rgba(255,250,236,.76) 0,rgba(255,250,236,.76) 128px,rgba(135,82,42,.16) 129px,rgba(255,255,255,.75) 133px,rgba(91,52,28,.14) 137px)}.shop-item-card{height:113px;border-radius:15px}.shop-item-visual{top:7px;width:51px;height:51px;font-size:25px}.shop-item-name{font-size:12px}.shop-foot{min-height:58px;padding:8px 15px;gap:8px}#shop-selname{font-size:11px}#shop-action{min-width:92px;padding:9px 15px;font-size:12px}}'+
    '@media(max-width:390px){.shop-brand-mark{display:none}.shop-title{font-size:16px}#shop-coins{padding:0 7px}.shop-coin-gem{width:15px;height:15px}.shop-main{grid-template-rows:112px minmax(0,1fr)}.shop-preview-label{width:122px}}'+
    '@media(prefers-reduced-motion:reduce){#shop-card{animation:none}.shop-item-card,.shop-cat,#shop-action,#shop-close{transition:none}}';
    document.head.appendChild(style);
}
function _shopBuildPreviewEgg(){
    var g=new THREE.Group();
    var bodyMat=new THREE.MeshPhysicalMaterial({color:0xFFF0C9,roughness:0.38,metalness:0,clearcoat:0.24,clearcoatRoughness:0.5});
    var darkMat=new THREE.MeshStandardMaterial({color:0x272335,roughness:0.3});
    var whiteMat=new THREE.MeshPhysicalMaterial({color:0xFFFDF8,roughness:0.22,clearcoat:0.2});
    var blushMat=new THREE.MeshStandardMaterial({color:0xF28E91,roughness:0.48});
    var footMat=new THREE.MeshPhysicalMaterial({color:0xB9574F,roughness:0.3,clearcoat:0.58,clearcoatRoughness:0.25});
    var body=new THREE.Mesh(new THREE.SphereGeometry(0.66,28,22),bodyMat);body.position.y=0.77;body.scale.set(0.88,1.13,0.79);body.castShadow=true;g.add(body);
    [-1,1].forEach(function(s){
        var eyeWhite=new THREE.Mesh(new THREE.SphereGeometry(0.115,16,12),whiteMat);eyeWhite.position.set(s*0.205,0.97,0.493);eyeWhite.scale.set(.88,1.05,.42);g.add(eyeWhite);
        var eye=new THREE.Mesh(new THREE.SphereGeometry(0.067,14,10),darkMat);eye.position.set(s*0.205,0.97,0.562);eye.scale.set(.82,1,.45);g.add(eye);
        var shine=new THREE.Mesh(new THREE.SphereGeometry(0.018,8,6),whiteMat);shine.position.set(s*0.188,1.002,0.594);g.add(shine);
        var cheek=new THREE.Mesh(new THREE.SphereGeometry(0.07,12,8),blushMat);cheek.position.set(s*0.36,0.79,0.49);cheek.scale.set(1.2,.48,.25);g.add(cheek);
        var arm=new THREE.Mesh(new THREE.CapsuleGeometry(0.052,0.35,5,10),bodyMat);arm.position.set(s*0.67,0.7,0.01);arm.rotation.z=s*-0.23;arm.castShadow=true;g.add(arm);
        var hand=new THREE.Mesh(new THREE.SphereGeometry(0.105,14,10),bodyMat);hand.position.set(s*0.72,0.49,0.04);hand.castShadow=true;g.add(hand);
        var foot=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,11),footMat);foot.position.set(s*0.31,0.14,0.18);foot.scale.set(1.15,.55,1.55);foot.castShadow=true;g.add(foot);
    });
    var mouth=new THREE.Mesh(new THREE.TorusGeometry(0.07,0.013,6,16,Math.PI),darkMat);mouth.position.set(0,0.78,0.572);mouth.rotation.z=Math.PI;g.add(mouth);
    return g;
}
function _shopInitPreview(){
    var canvas=document.getElementById('shop-preview-canvas');if(!canvas||!window.THREE)return;
    try{
        var renderer=new THREE.WebGLRenderer({canvas:canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
        renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,_cosIsTouchLike()?1.25:1.65));
        renderer.outputColorSpace=THREE.SRGBColorSpace;
        renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=0.95;
        renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
        var previewScene=new THREE.Scene();
        var camera3d=new THREE.PerspectiveCamera(31,1,.1,20);camera3d.position.set(0,1.15,4.65);camera3d.lookAt(0,.82,0);
        var stage=new THREE.Group();previewScene.add(stage);
        var pedestal=new THREE.Mesh(new THREE.CylinderGeometry(.98,1.12,.22,32),new THREE.MeshPhysicalMaterial({color:0xD8A467,roughness:.38,clearcoat:.28,clearcoatRoughness:.38}));
        pedestal.position.y=-.03;pedestal.receiveShadow=true;stage.add(pedestal);
        var pedestalTop=new THREE.Mesh(new THREE.CylinderGeometry(.91,.93,.08,32),new THREE.MeshPhysicalMaterial({color:0xFFF0C8,roughness:.3,clearcoat:.35}));
        pedestalTop.position.y=.1;pedestalTop.receiveShadow=true;stage.add(pedestalTop);
        var egg=_shopBuildPreviewEgg();stage.add(egg);
        var hemi=new THREE.HemisphereLight(0xDDF4FF,0x6E4935,1.75);previewScene.add(hemi);
        var key=new THREE.DirectionalLight(0xFFE1AD,4.0);key.position.set(-3.5,5,4);key.castShadow=true;key.shadow.mapSize.set(512,512);previewScene.add(key);
        var rim=new THREE.PointLight(0x8EDCFF,2.3,8);rim.position.set(2.8,2.4,-2.4);previewScene.add(rim);
        _shopPreview={renderer:renderer,scene:previewScene,camera:camera3d,stage:stage,egg:egg,item:null,frame:0,start:performance.now()};
        function draw(now){
            if(!_shopPreview||_shopPreview.renderer!==renderer)return;
            var rect=canvas.getBoundingClientRect(),w=Math.max(1,Math.round(rect.width)),h=Math.max(1,Math.round(rect.height));
            if(canvas.width!==Math.round(w*renderer.getPixelRatio())||canvas.height!==Math.round(h*renderer.getPixelRatio())){
                renderer.setSize(w,h,false);camera3d.aspect=w/h;camera3d.updateProjectionMatrix();
            }
            var t=(now-_shopPreview.start)/1000;
            stage.position.y=Math.sin(t*1.45)*.025;stage.rotation.y=-.04+Math.sin(t*.65)*.055;
            if(_shopPreview.item&&_shopPreview.item.userData._shopPreviewSpin)_shopPreview.item.rotation.y=t*.65;
            renderer.render(previewScene,camera3d);
            _shopPreview.frame=requestAnimationFrame(draw);
        }
        _shopPreview.frame=requestAnimationFrame(draw);
    }catch(e){console.warn('[shop preview] 3D preview unavailable',e);}
}
function _shopBuildFootprintPreview(id){
    var g=new THREE.Group(),colors;
    if(id==='fp_sakura')colors=[0xFF91B9,0xFFD0E0];
    else if(id==='fp_snow')colors=[0xDDF6FF,0x9DDAFF];
    else if(id==='fp_flame')colors=[0xFFB13B,0xFF5A35];
    else colors=[0xFF6666,0xFFD34D,0x62D77D,0x61B5FF,0xAC7CFF];
    for(var i=0;i<9;i++){
        var material=new THREE.MeshPhysicalMaterial({color:colors[i%colors.length],roughness:.28,clearcoat:.45,emissive:colors[i%colors.length],emissiveIntensity:.08});
        var geometry=id==='fp_snow'?new THREE.OctahedronGeometry(.07,0):(id==='fp_flame'?new THREE.ConeGeometry(.06,.17,8):new THREE.SphereGeometry(.065,10,8));
        var mote=new THREE.Mesh(geometry,material),angle=i/9*Math.PI*2;
        mote.position.set(Math.cos(angle)*(.46+(i%2)*.1),.18+(i%3)*.07,Math.sin(angle)*(.34+(i%2)*.08)+.16);
        mote.scale.set(1,id==='fp_sakura'?.45:1,id==='fp_sakura'?1.35:1);
        mote.castShadow=true;g.add(mote);
    }
    g.userData._shopPreviewSpin=true;
    return g;
}
function _shopSetPreview(id){
    if(!_shopPreview)return;
    if(_shopPreview.item){
        _shopPreview.egg.remove(_shopPreview.item);
        _shopPreview.item.traverse(function(o){if(o.geometry)o.geometry.dispose();if(o.material){var a=Array.isArray(o.material)?o.material:[o.material];a.forEach(function(m){if(m&&m.dispose)m.dispose();});}});
        _shopPreview.item=null;
    }
    if(id){
        var cat=_ITEM_BY_ID[id]&&_ITEM_BY_ID[id].cat;
        var built=_buildCosmetic(id);
        if(!built&&cat==='footprint')built=_shopBuildFootprintPreview(id);
        if(built){
            if(cat==='hair'||cat==='hat')built.position.y=.23;
            else if(cat==='accessory'||cat==='halo')built.position.y=.17;
            else if(cat==='glasses')built.position.y=.035;
            _shopPreview.item=built;_shopPreview.egg.add(built);
        }
    }
    var label=document.querySelector('.shop-preview-label');
    if(label)label.textContent=id?(_ITEM_BY_ID[id].name+' \u00B7 \u5B9E\u65F6\u8BD5\u7A7F'):'\u9009\u62E9\u5546\u54C1 \u00B7 3D \u5B9E\u65F6\u8BD5\u7A7F';
}
function _shopDisposePreview(){
    if(!_shopPreview)return;
    cancelAnimationFrame(_shopPreview.frame);
    var renderer=_shopPreview.renderer,previewScene=_shopPreview.scene;
    previewScene.traverse(function(o){if(o.geometry)o.geometry.dispose();if(o.material){var a=Array.isArray(o.material)?o.material:[o.material];a.forEach(function(m){if(m&&m.dispose)m.dispose();});}});
    renderer.dispose();if(renderer.forceContextLoss)renderer.forceContextLoss();
    _shopPreview=null;
}
function _openShop(){
    if(window._shopOpen)return;
    window._shopOpen=true;_shopEnsureStyles();
    var ov=document.createElement('div');ov.id='shop-overlay';
    var card=document.createElement('div');card.id='shop-card';
    card.innerHTML=
        '<div class="shop-header">'+
          '<div class="shop-brand"><div class="shop-brand-mark">\u2726</div><div><div class="shop-title">'+_shopLocalizedName()+'</div><div class="shop-subtitle">DANBO BOUTIQUE \u00B7 \u539F\u521B\u5916\u89C2\u6536\u85CF</div></div></div>'+
          '<div class="shop-head-actions"><div id="shop-coins"><span class="shop-coin-gem"></span><span>'+_coinsNow()+'</span></div><button id="shop-close" type="button" aria-label="\u5173\u95ED">\u00D7</button></div>'+
        '</div>'+
        '<div class="shop-main">'+
          '<div class="shop-preview"><canvas id="shop-preview-canvas"></canvas><div class="shop-preview-label">\u9009\u62E9\u5546\u54C1 \u00B7 3D \u5B9E\u65F6\u8BD5\u7A7F</div></div>'+
          '<div class="shop-catalog"><div id="shop-cats"></div><div id="shop-items"></div></div>'+
        '</div>'+
        '<div id="shop-foot" class="shop-foot"><div id="shop-selname">\u9009\u62E9\u4E00\u4EF6\u5546\u54C1\uFF0C\u5728\u5C55\u53F0\u4E0A\u5B9E\u65F6\u8BD5\u7A7F</div><button id="shop-action" style="display:none;"></button></div>';
    ov.appendChild(card);document.body.appendChild(ov);
    document.getElementById('shop-close').onclick=_closeShop;
    ov.addEventListener('click',function(e){if(e.target===ov)_closeShop();});
    _shopCat='hair';_shopSel=null;
    _shopInitPreview();_shopRender();
}
function _closeShop(){
    _shopDisposePreview();
    var ov=document.getElementById('shop-overlay');if(ov&&ov.parentNode)ov.parentNode.removeChild(ov);
    window._shopOpen=false;_shopSel=null;
    _applyCosmetics(); // revert preview to actual equipped
}
function _shopRender(){
    var cc=document.getElementById('shop-coins');
    if(cc)cc.innerHTML='<span class="shop-coin-gem"></span><span>'+_coinsNow()+'</span>';
    var catBox=document.getElementById('shop-cats');if(!catBox)return;
    catBox.innerHTML='';
    _CATS.forEach(function(c){
        var meta=_SHOP_CAT_VISUAL[c.id]||{glyph:'\u2726'};
        var b=document.createElement('button');b.type='button';b.className='shop-cat'+(c.id===_shopCat?' active':'');
        b.innerHTML='<span class="shop-cat-glyph">'+meta.glyph+'</span><span>'+c.name+'</span>';
        b.onclick=function(){_shopCat=c.id;_shopSel=null;_shopSetPreview(null);_shopRender();};
        catBox.appendChild(b);
    });
    var grid=document.getElementById('shop-items');grid.innerHTML='';
    var list=_ITEMS.filter(function(it){return it.cat===_shopCat;});
    list.forEach(function(it){
        var owned=Cosmetics.isOwned(it.id);
        var equipped=Cosmetics.equipment()[it.cat]===it.id;
        var selected=it.id===_shopSel,meta=_SHOP_CAT_VISUAL[it.cat]||_SHOP_CAT_VISUAL.hair;
        var card=document.createElement('button');card.type='button';
        card.className='shop-item-card'+(selected?' selected':'')+(equipped?' equipped':'');
        card.style.setProperty('--shop-accent',meta.color);card.style.setProperty('--shop-soft',meta.soft);
        card.innerHTML='<span class="shop-item-visual">'+meta.glyph+'</span>'+
            '<span class="shop-item-name">'+it.name+'</span>'+
            '<span class="shop-item-price '+(equipped?'equipped':(owned?'owned':''))+'">'+
            (owned?(equipped?'\u25C6 \u5DF2\u88C5\u5907':'\u25C7 \u5DF2\u62E5\u6709'):('<span class="shop-coin-gem" style="width:11px;height:11px;"></span> '+it.price))+'</span>';
        card.onclick=function(){_shopSelectItem(it.id);};
        grid.appendChild(card);
    });
    _shopRenderAction();
}
function _shopSelectItem(id){
    _shopSel=id;
    var it=_ITEM_BY_ID[id];
    _applyCosmetics(it.cat,id); // live try-on preview on the player
    _shopSetPreview(id);        // and on the dedicated 3D boutique stage
    _shopRender();
}
function _shopRenderAction(){
    var nameEl=document.getElementById('shop-selname');
    var act=document.getElementById('shop-action');
    if(!act)return;
    if(!_shopSel){if(nameEl)nameEl.textContent='\u9009\u62E9\u4E00\u4EF6\u5546\u54C1\uFF0C\u5728\u5C55\u53F0\u4E0A\u5B9E\u65F6\u8BD5\u7A7F';act.style.display='none';return;}
    var it=_ITEM_BY_ID[_shopSel];
    var owned=Cosmetics.isOwned(_shopSel);
    var equipped=Cosmetics.equipment()[it.cat]===_shopSel;
    if(nameEl)nameEl.textContent=it.name+(owned?'':'  \u00B7  '+it.price+' \u91D1\u5E01');
    act.style.display='inline-block';
    act.className=owned?(equipped?'unequip':'equip'):'buy';
    act.textContent=owned?(equipped?'\u5378\u4E0B':'\u88C5\u5907'):'\u8D2D\u4E70';
    act.onclick=function(){
        if(!owned){
            if(Cosmetics.buy(_shopSel)){Cosmetics.equip(it.cat,_shopSel);_toast('\u8D2D\u4E70\u6210\u529F\uFF01','#7FC9A0');}
            else{_toast('\u91D1\u5E01\u4E0D\u8DB3\uFF01','#E0506A');}
        } else if(equipped){Cosmetics.unequip(it.cat);}
        else {Cosmetics.equip(it.cat,_shopSel);}
        _shopRender();
    };
}
function _toast(text,color){
    var t=document.createElement('div');t.textContent=text;
    t.style.cssText='position:fixed;left:50%;top:42%;transform:translateX(-50%);z-index:160;padding:10px 22px;border-radius:16px;'+
        'background:rgba(0,0,0,0.75);color:'+(color||'#fff')+';font:bold 18px system-ui,sans-serif;pointer-events:none;transition:opacity .6s;';
    document.body.appendChild(t);setTimeout(function(){t.style.opacity='0';},800);setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t);},1500);
}

// ============================================================
//  蛋宝杂货铺：可爱圆润的电影感店面 + 门口进入 + 老板在店内
// ============================================================
var _shopNPC=null,_shopDoorPos={x:8,z:-4.3},_shopDoorOut={x:0,z:1},_shopColliders=[],_shopTransformKey='';
function _shopDefaultDefinition(){
    return {
        id:'hope-grocery-store',type:'groceryStore',x:8,y:0,z:-8,w:5.4,d:5.4,h:6.4,
        enabled:true,rotationY:0,scale:1,
        interaction:{action:'enterShop',radius:2.5,doorLocalX:0,doorLocalZ:3.7,showPrompt:true},
        shop:{type:'cosmetic',spawnKeeper:true,showMapIcon:true}
    };
}
function _shopDefinition(){
    if(typeof _citySpecialObject==='function'){
        var def=_citySpecialObject('groceryStore');
        return def&&def.enabled!==false?def:null;
    }
    return (typeof currentCityStyle!=='undefined'&&currentCityStyle===0)?_shopDefaultDefinition():null;
}
function _shopDefinitionIndex(def){
    var list=typeof _citySpecialObjects==='function'?_citySpecialObjects():[];
    for(var i=0;i<list.length;i++)if(list[i]===def||list[i]&&def&&(list[i].id===def.id||list[i].type==='groceryStore'))return i;
    return -1;
}
function _shopRemoveCollider(){
    if(typeof cityColliders==='undefined'){_shopColliders.length=0;return;}
    for(var i=0;i<_shopColliders.length;i++){
        var index=cityColliders.indexOf(_shopColliders[i]);if(index>=0)cityColliders.splice(index,1);
    }
    _shopColliders.length=0;
}
function _shopApplyDefinition(def){
    if(!_shopNPC||!def)return;
    var x=Number(def.x)||0,y=Number(def.y)||0,z=Number(def.z)||0;
    var scale=Math.max(0.8,Math.min(1.25,Number(def.scale)||1));
    var radians=(Number(def.rotationY)||0)*Math.PI/180,cos=Math.cos(radians),sin=Math.sin(radians);
    var interaction=def.interaction||{},specialIndex=_shopDefinitionIndex(def);
    var transformKey=[x,y,z,scale,radians,Number(interaction.doorLocalX)||0,Number(interaction.doorLocalZ)||3.7,specialIndex].join('|');
    if(_shopTransformKey===transformKey&&_shopColliders.length&&typeof cityColliders!=='undefined'&&_shopColliders.every(function(item){return cityColliders.indexOf(item)>=0;}))return;
    _shopNPC.position.set(x,y,z);_shopNPC.rotation.y=radians;_shopNPC.scale.setScalar(scale);
    var localX=(Number(interaction.doorLocalX)||0)*scale;
    var localZ=(Number(interaction.doorLocalZ)||3.7)*scale;
    _shopDoorPos.x=x+cos*localX+sin*localZ;_shopDoorPos.z=z-sin*localX+cos*localZ;
    _shopDoorOut.x=sin;_shopDoorOut.z=cos;
    _shopNPC.userData.editorSpecialIndex=specialIndex;
    _shopNPC.userData.editorSpecialType='groceryStore';
    _shopNPC.traverse(function(item){
        item.userData=item.userData||{};
        item.userData.editorSpecialIndex=specialIndex;
        item.userData.editorSpecialType='groceryStore';
    });
    _shopRemoveCollider();
    if(typeof cityColliders!=='undefined'){
        var storeH=y+(Number(def.h)||6.4)*scale;
        function wall(localCenterX,localCenterZ,localHalfW,localHalfD){
            localCenterX*=scale;localCenterZ*=scale;localHalfW*=scale;localHalfD*=scale;
            var collider={
                x:x+cos*localCenterX+sin*localCenterZ,z:z-sin*localCenterX+cos*localCenterZ,
                hw:Math.abs(cos)*localHalfW+Math.abs(sin)*localHalfD,
                hd:Math.abs(sin)*localHalfW+Math.abs(cos)*localHalfD,
                h:storeH,_groceryStore:true
            };
            _shopColliders.push(collider);cityColliders.push(collider);
        }
        // Five wall sections preserve the real doorway gap even after rotation.
        wall(0,-2.5,2.7,.2);wall(-2.5,0,.2,2.7);wall(2.5,0,.2,2.7);
        wall(-1.55,2.5,.95,.2);wall(1.55,2.5,.95,.2);
    }
    _shopTransformKey=transformKey;
}
function _shopLocalizedName(){
    return typeof L==='function'?L('shopName'):{
        zhs:'\u86CB\u5B9D\u6742\u8D27\u94FA',zht:'\u86CB\u5BF6\u96DC\u8CA8\u8216',
        ja:'\u30C0\u30F3\u30DC\u96D1\u8CA8\u5E97',en:'Danbo General Store'
    }[_langCode]||'Danbo General Store';
}
function _shopLocalizedEnterDesc(){
    return typeof L==='function'?L('shopEnterDesc'):{
        zhs:'\u8FDB\u5165\u86CB\u5B9D\u6742\u8D27\u94FA\uFF1F',zht:'\u9032\u5165\u86CB\u5BF6\u96DC\u8CA8\u8216\uFF1F',
        ja:'\u30C0\u30F3\u30DC\u96D1\u8CA8\u5E97\u306B\u5165\u308A\u307E\u3059\u304B\uFF1F',en:'Enter the Danbo General Store?'
    }[_langCode]||'Enter the Danbo General Store?';
}
function _cosIsTouchLike(){
    return (('ontouchstart' in window)||(navigator.maxTouchPoints>0)||(window.matchMedia&&window.matchMedia('(hover:none)').matches));
}
function _cosMiniTop(){ return _cosIsTouchLike()?76:10; }
function _cosMiniSize(){ return _cosIsTouchLike()?118:200; }
function _layoutShopButton(){
    var b=document.getElementById('shop-btn');if(!b)return;
    if(_cosIsTouchLike()){
        var t=_cosMiniTop()+_cosMiniSize()+106;
        b.style.top=t+'px';b.style.right='14px';b.style.bottom='auto';
        b.style.width='42px';b.style.height='42px';b.style.lineHeight='42px';b.style.borderRadius='14px';
    }else{
        b.style.top='auto';b.style.right='12px';b.style.bottom='58px';
        b.style.width='40px';b.style.height='40px';b.style.lineHeight='40px';b.style.borderRadius='12px';
    }
}
function _ensureShopNPC(){
    var def=_shopDefinition();
    if(!def){if(_shopNPC)_shopNPC.visible=false;_shopRemoveCollider();return null;}
    if(_shopNPC&&_shopNPC.parent){_shopApplyDefinition(def);return _shopNPC;}
    var g=new THREE.Group();g.name='hope-city-cute-grocery-store';
    var HX=0, HZ=0, H=2.5, WH=4; // local house centre + half-size + wall height
    var low=!!(window.DANBO_VISUAL_QUALITY&&DANBO_VISUAL_QUALITY.low);
    var rounded=typeof _visualRoundedBoxGeometry==='function';
    function box(w,h,d,r){return rounded?_visualRoundedBoxGeometry(w,h,d,r||0.10):new THREE.BoxGeometry(w,h,d);}
    function add(geo,mat,x,y,z,name){
        var mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.name=name||'shop-detail';g.add(mesh);return mesh;
    }
    var wallMat=typeof _visualSurfaceMaterial==='function'?_visualSurfaceMaterial('facade',0xE9927E,{roughness:0.86,bumpScale:0.035,envMapIntensity:0.20}):toon(0xE9927E);
    var wallLight=typeof _visualSurfaceMaterial==='function'?_visualSurfaceMaterial('facade',0xF6B49A,{roughness:0.88,bumpScale:0.025,envMapIntensity:0.18}):toon(0xF6B49A);
    var trimMat=typeof softPBR==='function'?softPBR(0xFFF0D1,{roughness:0.62,metalness:0,clearcoat:low?0:0.08,envMapIntensity:0.30}):toon(0xFFF0D1);
    var trimPink=typeof softPBR==='function'?softPBR(0xD75D77,{roughness:0.54,metalness:0,clearcoat:low?0:0.14,clearcoatRoughness:0.46}):toon(0xD75D77);
    var roofMat=typeof _visualSurfaceMaterial==='function'?_visualSurfaceMaterial('roof',0xB84E68,{roughness:0.62,bumpScale:0.12,envMapIntensity:0.26}):toon(0xB84E68);
    var roofAccent=typeof softPBR==='function'?softPBR(0xE98591,{roughness:0.48,clearcoat:low?0:0.10,clearcoatRoughness:0.48}):toon(0xE98591);
    var doorMat=typeof softPBR==='function'?softPBR(0x79513F,{roughness:0.72,clearcoat:low?0:0.08,clearcoatRoughness:0.60}):toon(0x79513F);
    var stoneMat=typeof _visualSurfaceMaterial==='function'?_visualSurfaceMaterial('stone',0xCDBDA9,{roughness:0.92,bumpScale:0.055,envMapIntensity:0.14}):toon(0xCDBDA9);
    var woodMat=typeof softPBR==='function'?softPBR(0x9B6045,{roughness:0.76,metalness:0}):toon(0x9B6045);
    var goldMat=typeof softPBR==='function'?softPBR(0xE9B64A,{roughness:0.31,metalness:0.18,clearcoat:low?0:0.20,clearcoatRoughness:0.28}):toon(0xE9B64A);
    // Warm mineral-plaster walls retain the existing footprint and doorway trigger.
    var back=new THREE.Mesh(new THREE.BoxGeometry(H*2+0.4,WH,0.4),wallMat);back.position.set(HX,WH/2,HZ-H);g.add(back);
    var left=new THREE.Mesh(new THREE.BoxGeometry(0.4,WH,H*2+0.4),wallMat);left.position.set(HX-H,WH/2,HZ);g.add(left);
    var right=new THREE.Mesh(new THREE.BoxGeometry(0.4,WH,H*2+0.4),wallMat);right.position.set(HX+H,WH/2,HZ);g.add(right);
    var fL=new THREE.Mesh(box(H-0.6,WH,0.4,0.14),wallLight);fL.position.set(HX-(H/2+0.3),WH/2,HZ+H);g.add(fL);
    var fR=new THREE.Mesh(box(H-0.6,WH,0.4,0.14),wallLight);fR.position.set(HX+(H/2+0.3),WH/2,HZ+H);g.add(fR);
    var fTop=new THREE.Mesh(box(1.4,WH-2.4,0.4,0.12),wallLight);fTop.position.set(HX,WH-(WH-2.4)/2,HZ+H);g.add(fTop);
    // Soft stone plinth, attached corner stones and a properly framed rounded door
    // remove the old toy-box silhouette without changing collision/gameplay.
    add(box(5.35,0.40,5.34,0.16),stoneMat,HX,0.20,HZ,'shop-stone-plinth');
    [-1,1].forEach(function(side){
        add(box(0.34,3.60,0.52,0.10),trimMat,HX+side*2.43,1.88,HZ+H+0.12,'shop-corner-trim');
    });
    add(box(1.72,2.82,0.22,0.28),trimMat,HX,1.43,HZ+H+0.20,'shop-door-frame');
    var door=add(box(1.34,2.48,0.18,0.22),doorMat,HX,1.25,HZ+H+0.34,'shop-door');
    add(new THREE.SphereGeometry(0.085,low?8:14,low?6:10),goldMat,HX+0.42,1.20,HZ+H+0.47,'shop-door-knob');
    add(box(1.08,0.46,0.10,0.12),typeof softPBR==='function'?softPBR(0xFFD98C,{roughness:0.22,emissive:0xFFB867,emissiveIntensity:0.15}):toon(0xFFD98C),HX,2.02,HZ+H+0.47,'shop-door-window');
    var _shopGlass=typeof softPBR==='function'?softPBR(0x86CEE0,{pastelAmount:0.04,roughness:0.12,metalness:0.02,clearcoat:low?0.35:0.78,clearcoatRoughness:0.11,envMapIntensity:0.82,emissive:0x5CA6B8,emissiveIntensity:0.08}):toon(0xBFE8FF);
    [-1.5,1.5].forEach(function(wx){
        add(box(1.34,1.46,0.16,0.25),trimMat,HX+wx,2.16,HZ+H+0.22,'shop-window-frame');
        add(box(0.98,1.10,0.09,0.18),_shopGlass,HX+wx,2.16,HZ+H+0.34,'shop-window-glass');
        add(box(0.08,1.00,0.06,0.03),trimMat,HX+wx,2.16,HZ+H+0.42,'shop-window-mullion');
        add(box(0.90,0.07,0.06,0.03),trimMat,HX+wx,2.16,HZ+H+0.42,'shop-window-mullion');
        var planter=add(box(1.22,0.25,0.40,0.09),woodMat,HX+wx,1.44,HZ+H+0.52,'shop-flower-box');
        if(!low){
            [-0.34,0,0.34].forEach(function(offset,fi){
                var leaf=add(new THREE.SphereGeometry(0.15,10,7),typeof softPBR==='function'?softPBR(fi===1?0x70A45A:0x568D54,{roughness:0.83}):toon(0x568D54),HX+wx+offset,1.67,HZ+H+0.51,'shop-planter-leaf');
                leaf.scale.set(1.05,0.78,0.88);
                add(new THREE.SphereGeometry(0.09,10,7),typeof softPBR==='function'?softPBR(fi===1?0xFFD066:0xFF86A1,{roughness:0.48}):toon(0xFF86A1),HX+wx+offset,1.82+(fi%2)*0.04,HZ+H+0.56,'shop-planter-flower');
            });
        }
    });
    // Side windows continue the storefront language around the volume, so the
    // building does not turn back into a plain box when seen from the plaza.
    [-1,1].forEach(function(side){
        [-1.18,1.18].forEach(function(wz){
            add(box(0.16,1.30,1.30,0.22),trimMat,HX+side*(H+0.22),2.18,HZ+wz,'shop-side-window-frame');
            add(box(0.09,0.96,0.96,0.16),_shopGlass,HX+side*(H+0.33),2.18,HZ+wz,'shop-side-window-glass');
            add(box(0.06,0.08,0.88,0.025),trimMat,HX+side*(H+0.40),2.18,HZ+wz,'shop-side-window-mullion');
        });
    });
    var roof=new THREE.Mesh(typeof _visualGableRoofGeometry==='function'?_visualGableRoofGeometry(H*2+1.15,H*2+1.15,2.0):new THREE.ConeGeometry(H*1.7,2.0,4),roofMat);roof.position.set(HX,WH,HZ);roof.castShadow=true;g.add(roof);
    if(typeof _visualGableRoofGeometry==='function'){
        var _shopRidge=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.14,H*2+1.28,low?8:16),trimMat);_shopRidge.position.set(HX,WH+2.04,HZ);_shopRidge.rotation.x=Math.PI/2;g.add(_shopRidge);
    }
    // Scalloped striped awning brings the storefront forward and shades the face.
    var awningY=3.12,awningZ=HZ+H+0.62;
    add(box(4.58,0.18,0.82,0.09),trimMat,HX,awningY,awningZ-0.12,'shop-awning-frame');
    var stripeCount=low?5:9;
    for(var ai=0;ai<stripeCount;ai++){
        var aw=add(box(4.42/stripeCount+0.02,0.24,0.88,0.08),ai%2?trimMat:trimPink,HX-2.21+(ai+0.5)*4.42/stripeCount,awningY+0.10,awningZ,'shop-awning-stripe');
        aw.rotation.x=-0.12;
        var scallop=add(new THREE.SphereGeometry(0.16,low?8:12,low?6:8),ai%2?trimMat:trimPink,aw.position.x,awningY-0.05,awningZ+0.42,'shop-awning-scallop');
        scallop.scale.set(1.30,0.62,0.74);
    }
    // Localized door sign — warm, rounded and readable without a flat 2D slab.
    var sc=document.createElement('canvas');sc.width=640;sc.height=180;var sgx=sc.getContext('2d');
    var bg=sgx.createLinearGradient(0,0,0,180);bg.addColorStop(0,'#FFF7DE');bg.addColorStop(1,'#FFE6B8');
    sgx.fillStyle=bg;sgx.beginPath();sgx.moveTo(54,12);sgx.lineTo(586,12);sgx.quadraticCurveTo(628,12,628,54);
    sgx.lineTo(628,126);sgx.quadraticCurveTo(628,168,586,168);sgx.lineTo(54,168);sgx.quadraticCurveTo(12,168,12,126);
    sgx.lineTo(12,54);sgx.quadraticCurveTo(12,12,54,12);sgx.closePath();sgx.fill();
    sgx.lineWidth=10;sgx.strokeStyle='#C85C71';sgx.stroke();
    sgx.fillStyle='#EFB54F';sgx.beginPath();sgx.ellipse(72,90,25,33,0,0,Math.PI*2);sgx.fill();
    sgx.fillStyle='#FFF9E9';sgx.beginPath();sgx.ellipse(72,83,12,15,0,0,Math.PI*2);sgx.fill();
    var shopSignName=_shopLocalizedName();
    sgx.fillStyle='#8D4D41';sgx.font='800 '+(_langCode==='en'?40:(_langCode==='ja'?52:65))+'px system-ui,Segoe UI,sans-serif';sgx.textAlign='center';sgx.textBaseline='middle';
    sgx.fillText(shopSignName,355,92,490);
    var signTexture=new THREE.CanvasTexture(sc);if(THREE.SRGBColorSpace!==undefined)signTexture.colorSpace=THREE.SRGBColorSpace;
    if(typeof R!=='undefined'&&R.capabilities&&R.capabilities.getMaxAnisotropy)signTexture.anisotropy=Math.min(4,R.capabilities.getMaxAnisotropy());
    var signMat=new THREE.MeshBasicMaterial({map:signTexture,transparent:true,side:THREE.DoubleSide,toneMapped:false});
    add(box(3.72,1.10,0.18,0.25),woodMat,HX,3.82,HZ+H+0.28,'shop-sign-board');
    add(new THREE.PlaneGeometry(3.52,0.99),signMat,HX,3.82,HZ+H+0.39,'shop-sign-face');
    // Chimney, egg finial and small side emblem provide a friendly asymmetrical skyline.
    var chimney=add(box(0.48,1.18,0.52,0.10),wallLight,HX+1.55,5.10,HZ-0.75,'shop-chimney');
    add(box(0.64,0.18,0.68,0.07),trimMat,HX+1.55,5.72,HZ-0.75,'shop-chimney-cap');
    var finial=add(new THREE.SphereGeometry(0.25,low?10:18,low?8:12),goldMat,HX,6.13,HZ,'shop-egg-finial');finial.scale.set(0.84,1.18,0.84);
    if(!low){
        var sideSign=add(new THREE.CylinderGeometry(0.52,0.52,0.16,24),trimMat,HX-2.88,3.42,HZ+H+0.18,'shop-round-emblem');sideSign.rotation.x=Math.PI/2;
        var sideEgg=add(new THREE.SphereGeometry(0.28,16,12),goldMat,HX-2.88,3.42,HZ+H+0.30,'shop-round-emblem-egg');sideEgg.scale.set(0.82,1.10,0.40);
        add(new THREE.CylinderGeometry(0.055,0.055,0.78,10),woodMat,HX-2.66,3.42,HZ+H+0.02,'shop-sign-bracket').rotation.z=Math.PI/2;
    }
    // Rounded doorstep and two welcoming path stones sit on the actual entrance axis.
    add(box(1.72,0.18,0.72,0.14),stoneMat,HX,0.10,HZ+H+0.58,'shop-doorstep');
    add(new THREE.CylinderGeometry(0.72,0.78,0.12,low?14:24),stoneMat,HX,0.07,HZ+H+1.18,'shop-path-stone');
    g.traverse(function(item){if(item.isMesh){item.castShadow=true;item.receiveShadow=true;}});
    g.visible=false;scene.add(g);_shopNPC=g;_shopApplyDefinition(def);return g;
}
window._rebuildShopFromCityData=function(){
    _shopRemoveCollider();
    if(_shopNPC&&_shopNPC.parent)_shopNPC.parent.remove(_shopNPC);
    _shopNPC=null;_shopTransformKey='';
    return _ensureShopNPC();
};
window._moveShopEditorTarget=function(index,x,y,z){
    var list=typeof _citySpecialObjects==='function'?_citySpecialObjects():[];
    var def=list[Number(index)];
    if(!def||def.type!=='groceryStore')return false;
    def.x=Number(x)||0;def.y=Number(y)||0;def.z=Number(z)||0;
    _shopApplyDefinition(def);return true;
};
// elderly egg shopkeeper (蛋宝老板) — built fresh INSIDE the shop, faces +z
window._buildShopKeeper=function(){
    var keeper=new THREE.Group();
    var kb=new THREE.Mesh(new THREE.SphereGeometry(0.55,16,12),toon(0xFFF1D0));kb.position.y=0.62;kb.scale.set(1,1.08,1);keeper.add(kb);
    [-1,1].forEach(function(s){var br=new THREE.Mesh(new THREE.SphereGeometry(0.1,8,6),toon(0xFFFFFF));br.position.set(s*0.18,0.92,0.5);br.scale.set(1.3,0.6,0.6);keeper.add(br);});
    var mous=new THREE.Mesh(new THREE.SphereGeometry(0.16,10,7),toon(0xF0F0F0));mous.position.set(0,0.58,0.52);mous.scale.set(1.6,0.5,0.6);keeper.add(mous);
    [-1,1].forEach(function(s){var r=new THREE.Mesh(new THREE.TorusGeometry(0.1,0.02,6,14),toon(0x444444));r.position.set(s*0.18,0.78,0.52);keeper.add(r);var ey=new THREE.Mesh(new THREE.SphereGeometry(0.06,8,6),toon(0x222233));ey.position.set(s*0.18,0.78,0.5);keeper.add(ey);});
    var apron=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.5,0.1),toon(0x4A6FA5));apron.position.set(0,0.4,0.5);keeper.add(apron);
    var cap=new THREE.Mesh(new THREE.SphereGeometry(0.4,12,8,0,Math.PI*2,0,Math.PI/2),toon(0x8E2B2B));cap.position.set(0,1.16,0);cap.scale.set(1,0.6,1);keeper.add(cap);
    return keeper;
};
function _enterShopHouse(){ if(typeof _interiorEnter==='function')_interiorEnter(null,{shop:true}); }
function _ensureShopButton(){
    if(document.getElementById('shop-btn'))return;
    var b=document.createElement('div');b.id='shop-btn';b.textContent='\uD83C\uDFEA';
    b.style.cssText='position:fixed;bottom:58px;right:12px;z-index:55;width:40px;height:40px;border-radius:12px;'+
        'background:rgba(255,255,255,0.85);border:2px solid #FFB6CE;color:#C2477A;font-size:20px;line-height:40px;text-align:center;cursor:pointer;user-select:none;box-shadow:0 2px 8px rgba(0,0,0,0.2);';
    b.title=_shopLocalizedName();
    b.onclick=function(){ if(window._interiorActive&&window._interiorShop&&window._shopNearKeeper)_openShop(); };
    document.body.appendChild(b);
    _layoutShopButton();
}
function _maybeAutoShopConfirm(mode){
    if(window._shopOpen||window._worldMapOpen)return false;
    if(typeof showPortalConfirm!=='function')return false;
    if(typeof _portalConfirmOpen!=='undefined'&&_portalConfirmOpen)return false;
    var isDoor=(mode==='door'&&window._nearShopDoor&&!window._interiorActive);
    var isKeeper=(mode==='keeper'&&window._interiorActive&&window._interiorShop&&window._shopNearKeeper);
    if(!isDoor&&!isKeeper)return false;
    var type=isDoor?'shopHouse':'shopKeeper';
    var key='hidden:'+type+':-97';
    if(typeof _portalDismissed!=='undefined'&&_portalDismissed===key)return false;
    showPortalConfirm({
        name:isDoor?'\uD83C\uDFEA '+_shopLocalizedName():'\uD83C\uDFEA \u9009\u8D2D',
        desc:isDoor?_shopLocalizedEnterDesc():'\u548C\u8001\u677F\u9009\u8D2D\u5916\u89C2\uFF1F',
        raceIndex:-1,
        _hiddenType:type,
        _targetStyle:-97
    });
    return true;
}

// ============================================================
//  PER-TICK UPDATE  (called from gameloop)
// ============================================================
var _cosInited=false,_coinSaveTick=0;
function _cosUpdate(){
    if(typeof scene==='undefined')return;
    if(!_cosInited){_cosInited=true;_ensureShopButton();_applyCosmetics();}
    _layoutShopButton();
    if(typeof playerEgg!=='undefined'&&playerEgg&&playerEgg.mesh&&playerEgg.mesh!==_cosLastMesh){_applyCosmetics(_shopOpen?_shopSelCat():null,_shopOpen?_shopSel:null);}
    for(var i=0;i<_cosSpinGroups.length;i++){if(_cosSpinGroups[i])_cosSpinGroups[i].rotation.y+=0.03;}
    if(++_coinSaveTick>=120){_coinSaveTick=0;if(typeof coins!=='undefined'&&Cosmetics.data().coins!==coins)Cosmetics.save();}
    _updateFootprints();
    // INSIDE the shop: approach the keeper to browse
    if(window._interiorActive&&window._interiorShop&&window._shopKeeperPos&&playerEgg&&playerEgg.mesh){
        var kdx=playerEgg.mesh.position.x-window._shopKeeperPos.x,kdz=playerEgg.mesh.position.z-window._shopKeeperPos.z;
        window._shopNearKeeper=(kdx*kdx+kdz*kdz)<6.25;
        if(window._shopNearKeeper&&!window._shopOpen&&_maybeAutoShopConfirm('keeper'))_showShopPrompt(false);
        else _showShopPrompt(window._shopNearKeeper&&!window._shopOpen,'keeper');
    } else { window._shopNearKeeper=false; if(typeof _portalDismissed!=='undefined'&&_portalDismissed==='hidden:shopKeeper:-97')_portalDismissed=null; }
    if(window.DANBO_MAP_EDITOR_LIVE){
        var editorShopDef=_shopDefinition();_ensureShopNPC();
        if(_shopNPC)_shopNPC.visible=!!editorShopDef;
        window._nearShopDoor=false;_showShopPrompt(false);return;
    }
    var inCity=(typeof gameState!=='undefined'&&gameState==='city'&&!window._interiorActive);
    var sb=document.getElementById('shop-btn');if(sb)sb.style.display=(window._interiorActive&&window._interiorShop&&window._shopNearKeeper&&!window._shopOpen)?'block':'none';
    if(!inCity){ if(_shopNPC)_shopNPC.visible=false; window._nearShopDoor=false; if(!window._shopNearKeeper)_showShopPrompt(false); return; }
    var shopDef=_shopDefinition();
    _ensureShopNPC();
    var show=!!(shopDef&&_shopNPC);if(_shopNPC)_shopNPC.visible=show;
    if(show&&playerEgg&&playerEgg.mesh){
        var dx=playerEgg.mesh.position.x-_shopDoorPos.x,dz=playerEgg.mesh.position.z-_shopDoorPos.z;
        var radius=Math.max(1,Number(shopDef.interaction&&shopDef.interaction.radius)||2.5);
        window._nearShopDoor=(dx*dx+dz*dz)<radius*radius;
        if(window._nearShopDoor&&!window._shopOpen&&_maybeAutoShopConfirm('door'))_showShopPrompt(false);
        else _showShopPrompt(window._nearShopDoor&&!window._shopOpen&&(!shopDef.interaction||shopDef.interaction.showPrompt!==false),'door');
    } else { window._nearShopDoor=false; if(typeof _portalDismissed!=='undefined'&&_portalDismissed==='hidden:shopHouse:-97')_portalDismissed=null; _showShopPrompt(false); }
    // footprints while walking
    var eqfp=Cosmetics.equipment().footprint;
    if(eqfp&&playerEgg&&playerEgg.onGround){
        var sp=Math.abs(playerEgg.vx)+Math.abs(playerEgg.vz);
        if(sp>0.03){_fpTick++;if(_fpTick%6===0)_spawnFootprint(eqfp);}
    }
}
function _shopSelCat(){return _shopSel?_ITEM_BY_ID[_shopSel].cat:null;}
function _showShopPrompt(show,mode){
    var el=document.getElementById('shop-prompt');
    if(show){
        if(typeof _portalConfirmOpen!=='undefined'&&_portalConfirmOpen){if(el)el.style.display='none';return;}
        if(!el){el=document.createElement('div');el.id='shop-prompt';
            el.style.cssText='position:fixed;left:50%;bottom:120px;transform:translateX(-50%);z-index:58;padding:8px 18px;border-radius:18px;'+
                'background:rgba(255,255,255,0.92);border:2px solid #FFB6CE;color:#C2477A;font:bold 16px system-ui,sans-serif;box-shadow:0 3px 12px rgba(0,0,0,0.25);cursor:pointer;';
            document.body.appendChild(el);}
        if(mode==='keeper'){
            el.textContent='\uD83C\uDFEA \u8D70\u8FD1\u8001\u677F\uFF0C\u70B9\u51FB\u786E\u8BA4\u9009\u8D2D';
            el.onclick=function(){if(typeof _portalDismissed!=='undefined')_portalDismissed=null;if(typeof showPortalConfirm==='function')showPortalConfirm({name:'\uD83C\uDFEA \u9009\u8D2D',desc:'\u548C\u8001\u677F\u9009\u8D2D\u5916\u89C2\uFF1F',raceIndex:-1,_hiddenType:'shopKeeper',_targetStyle:-97});else _openShop();};
        }
        else {
            el.textContent='\uD83C\uDFEA \u8D70\u8FD1\u5165\u53E3\uFF0C\u70B9\u51FB\u786E\u8BA4';
            el.onclick=function(){if(typeof _portalDismissed!=='undefined')_portalDismissed=null;if(typeof showPortalConfirm==='function')showPortalConfirm({name:'\uD83C\uDFEA '+_shopLocalizedName(),desc:_shopLocalizedEnterDesc(),raceIndex:-1,_hiddenType:'shopHouse',_targetStyle:-97});else _enterShopHouse();};
        }
        el.style.display='block';
    } else if(el)el.style.display='none';
}
// expose update + E key (enter shop at door / browse near keeper inside)
Cosmetics.update=_cosUpdate;
window.addEventListener('keydown',function(e){
    if(e.code!=='KeyE'&&e.key!=='e'&&e.key!=='E')return;
    if(window._shopOpen)return;
    if(typeof gameState==='undefined'||gameState!=='city'||window._worldMapOpen)return;
    if(window._interiorActive){ if(window._interiorShop&&window._shopNearKeeper)_openShop(); return; }
    if(window._nearShopDoor)_enterShopHouse();
});
