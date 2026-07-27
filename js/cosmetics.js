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
//  SHOP UI  (cute pastel)
// ============================================================
window._shopOpen=false;
var _shopCat='hair',_shopSel=null;
function _coinsNow(){return (typeof coins!=='undefined')?coins:0;}
function _openShop(){
    if(window._shopOpen)return;
    window._shopOpen=true;
    var ov=document.createElement('div');ov.id='shop-overlay';
    ov.style.cssText='position:fixed;inset:0;z-index:150;display:flex;align-items:center;justify-content:center;background:rgba(40,30,55,0.5);backdrop-filter:blur(2px);font-family:system-ui,Segoe UI,sans-serif;';
    var card=document.createElement('div');card.id='shop-card';
    card.style.cssText='width:min(680px,94vw);max-height:88vh;display:flex;flex-direction:column;border-radius:22px;overflow:hidden;'+
        'background:linear-gradient(160deg,#FFF3FA,#EAF6FF);border:4px solid #FFB6CE;box-shadow:0 14px 54px rgba(0,0,0,0.45);';
    card.innerHTML=
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#FFE3EF;">'+
          '<div style="font-size:19px;font-weight:800;color:#E66AA0;">\uD83C\uDFEA \u86CB\u5821\u57CE\u6742\u8D27\u94FA</div>'+
          '<div style="display:flex;align-items:center;gap:10px;">'+
            '<span id="shop-coins" style="font-weight:800;color:#B8860B;">\u2B50 '+_coinsNow()+'</span>'+
            '<span id="shop-close" style="cursor:pointer;font-size:20px;color:#888;">\u2715</span>'+
          '</div>'+
        '</div>'+
        '<div style="display:flex;flex:1;min-height:0;">'+
          '<div id="shop-cats" style="width:96px;background:#FBEAF2;padding:8px 6px;overflow:auto;"></div>'+
          '<div id="shop-items" style="flex:1;padding:10px;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;align-content:start;"></div>'+
        '</div>'+
        '<div id="shop-foot" style="padding:10px 16px;background:#FFF7FB;border-top:1px solid #FFD6E6;display:flex;align-items:center;justify-content:space-between;gap:10px;">'+
          '<div id="shop-selname" style="color:#666;font-size:14px;">\u9009\u62E9\u4E00\u4EF6\u5546\u54C1\u8BD5\u7A7F</div>'+
          '<button id="shop-action" style="display:none;"></button>'+
        '</div>';
    ov.appendChild(card);document.body.appendChild(ov);
    document.getElementById('shop-close').onclick=_closeShop;
    ov.addEventListener('click',function(e){if(e.target===ov)_closeShop();});
    _shopCat='hair';_shopSel=null;
    _shopRender();
}
function _closeShop(){
    var ov=document.getElementById('shop-overlay');if(ov&&ov.parentNode)ov.parentNode.removeChild(ov);
    window._shopOpen=false;_shopSel=null;
    _applyCosmetics(); // revert preview to actual equipped
}
function _shopRender(){
    var cc=document.getElementById('shop-coins');if(cc)cc.textContent='\u2B50 '+_coinsNow();
    var catBox=document.getElementById('shop-cats');if(!catBox)return;
    catBox.innerHTML='';
    _CATS.forEach(function(c){
        var b=document.createElement('div');b.textContent=c.name;
        b.style.cssText='padding:8px 4px;margin-bottom:4px;text-align:center;border-radius:10px;cursor:pointer;font-size:13px;font-weight:700;'+
            (c.id===_shopCat?'background:#FFB6CE;color:#fff;':'background:#fff;color:#A06;');
        b.onclick=function(){_shopCat=c.id;_shopSel=null;_shopRender();};
        catBox.appendChild(b);
    });
    var grid=document.getElementById('shop-items');grid.innerHTML='';
    var list=_ITEMS.filter(function(it){return it.cat===_shopCat;});
    list.forEach(function(it){
        var owned=Cosmetics.isOwned(it.id);
        var equipped=Cosmetics.equipment()[it.cat]===it.id;
        var card=document.createElement('div');
        card.style.cssText='background:#fff;border-radius:14px;padding:8px;border:2px solid '+(it.id===_shopSel?'#FF7FB0':(equipped?'#7FD0A0':'#FFE0EC'))+';cursor:pointer;text-align:center;';
        card.innerHTML='<div style="font-size:13px;font-weight:700;color:#555;margin-bottom:4px;">'+it.name+'</div>'+
            '<div style="font-size:12px;color:'+(owned?'#7FB07F':'#B8860B')+';">'+(owned?(equipped?'\u5DF2\u88C5\u5907':'\u5DF2\u62E5\u6709'):('\u2B50 '+it.price))+'</div>';
        card.onclick=function(){_shopSelectItem(it.id);};
        grid.appendChild(card);
    });
    _shopRenderAction();
}
function _shopSelectItem(id){
    _shopSel=id;
    var it=_ITEM_BY_ID[id];
    _applyCosmetics(it.cat,id); // live try-on preview
    _shopRender();
}
function _shopRenderAction(){
    var nameEl=document.getElementById('shop-selname');
    var act=document.getElementById('shop-action');
    if(!act)return;
    if(!_shopSel){if(nameEl)nameEl.textContent='\u9009\u62E9\u4E00\u4EF6\u5546\u54C1\u8BD5\u7A7F';act.style.display='none';return;}
    var it=_ITEM_BY_ID[_shopSel];
    var owned=Cosmetics.isOwned(_shopSel);
    var equipped=Cosmetics.equipment()[it.cat]===_shopSel;
    if(nameEl)nameEl.textContent=it.name+(owned?'':'  \u2B50 '+it.price);
    act.style.display='inline-block';
    act.style.cssText='display:inline-block;padding:8px 22px;border:none;border-radius:16px;font-size:15px;font-weight:800;cursor:pointer;color:#fff;'+
        (owned?(equipped?'background:#B0B0C0;':'background:#7FC9A0;'):'background:#FF7FB0;');
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
//  蛋堡城杂货铺：红房子(外观) + 门口进入 + 老板在店内
// ============================================================
var _shopNPC=null,_shopDoorPos={x:8,z:-5.5};
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
    if(_shopNPC)return;
    var g=new THREE.Group();
    var HX=8, HZ=-8, H=2.5, WH=4; // house centre + half-size + wall height
    var wallMat=typeof _visualSurfaceMaterial==='function'?_visualSurfaceMaterial('facade',0xCC4A48,{roughness:0.78}):toon(0xCC4A48);
    var trimMat=typeof softPBR==='function'?softPBR(0xF2E8D8,{roughness:0.42,envMapIntensity:0.32}):toon(0xF2E8D8);
    var roofMat=typeof _visualSurfaceMaterial==='function'?_visualSurfaceMaterial('roof',0x8E2B2B,{roughness:0.56}):toon(0x8E2B2B);
    var doorMat=typeof softPBR==='function'?softPBR(0x5A3A28,{roughness:0.78}):toon(0x5A3A28);
    var back=new THREE.Mesh(new THREE.BoxGeometry(H*2+0.4,WH,0.4),wallMat);back.position.set(HX,WH/2,HZ-H);g.add(back);
    var left=new THREE.Mesh(new THREE.BoxGeometry(0.4,WH,H*2+0.4),wallMat);left.position.set(HX-H,WH/2,HZ);g.add(left);
    var right=new THREE.Mesh(new THREE.BoxGeometry(0.4,WH,H*2+0.4),wallMat);right.position.set(HX+H,WH/2,HZ);g.add(right);
    var fL=new THREE.Mesh(new THREE.BoxGeometry(H-0.6,WH,0.4),wallMat);fL.position.set(HX-(H/2+0.3),WH/2,HZ+H);g.add(fL);
    var fR=new THREE.Mesh(new THREE.BoxGeometry(H-0.6,WH,0.4),wallMat);fR.position.set(HX+(H/2+0.3),WH/2,HZ+H);g.add(fR);
    var fTop=new THREE.Mesh(new THREE.BoxGeometry(1.4,WH-2.4,0.4),wallMat);fTop.position.set(HX,WH-(WH-2.4)/2,HZ+H);g.add(fTop);
    var door=new THREE.Mesh(new THREE.BoxGeometry(1.3,2.4,0.2),doorMat);door.position.set(HX,1.2,HZ+H+0.05);g.add(door);
    var _shopGlass=typeof softPBR==='function'?softPBR(0x3F8DAA,{pastelAmount:0.02,roughness:0.07,metalness:0.08,clearcoat:0.94,clearcoatRoughness:0.07,envMapIntensity:1.0}):toon(0xBFE8FF);
    [-1.5,1.5].forEach(function(wx){
        var wf=new THREE.Mesh(typeof _visualRoundedBoxGeometry==='function'?_visualRoundedBoxGeometry(1.10,1.10,0.12,0.18):new THREE.BoxGeometry(1.10,1.10,0.12),trimMat);wf.position.set(HX+wx,2.3,HZ+H+0.18);g.add(wf);
        var win=new THREE.Mesh(typeof _visualRoundedBoxGeometry==='function'?_visualRoundedBoxGeometry(0.78,0.78,0.08,0.12):new THREE.BoxGeometry(0.78,0.78,0.08),_shopGlass);win.position.set(HX+wx,2.3,HZ+H+0.28);g.add(win);
    });
    var roof=new THREE.Mesh(typeof _visualGableRoofGeometry==='function'?_visualGableRoofGeometry(H*2+1.15,H*2+1.15,2.0):new THREE.ConeGeometry(H*1.7,2.0,4),roofMat);roof.position.set(HX,WH,HZ);roof.castShadow=true;g.add(roof);
    if(typeof _visualGableRoofGeometry==='function'){var _shopRidge=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,H*2+1.28,12),trimMat);_shopRidge.position.set(HX,WH+2.04,HZ);_shopRidge.rotation.x=Math.PI/2;g.add(_shopRidge);}
    // door sign 【蛋堡城杂货铺】
    var sc=document.createElement('canvas');sc.width=320;sc.height=96;var sgx=sc.getContext('2d');
    sgx.fillStyle='#7A3B1E';sgx.fillRect(0,0,320,96);sgx.fillStyle='#F6E3C0';sgx.fillRect(6,6,308,84);
    sgx.fillStyle='#7A3B1E';sgx.font='bold 40px system-ui,Segoe UI,sans-serif';sgx.textAlign='center';sgx.textBaseline='middle';
    sgx.fillText('\u86CB\u5821\u57CE\u6742\u8D27\u94FA',160,50);
    var signMat=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(sc),transparent:true,side:THREE.DoubleSide});
    var sign=new THREE.Mesh(new THREE.PlaneGeometry(3.0,0.9),signMat);sign.position.set(HX,3.15,HZ+H+0.25);g.add(sign);
    var signBoard=new THREE.Mesh(new THREE.BoxGeometry(3.2,1.05,0.12),trimMat);signBoard.position.set(HX,3.15,HZ+H+0.18);g.add(signBoard);
    g.visible=false;scene.add(g);_shopNPC=g;
}
// elderly egg shopkeeper (蛋堡老板) — built fresh INSIDE the shop, faces +z
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
    b.title='\u86CB\u5821\u57CE\u6742\u8D27\u94FA';
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
        name:isDoor?'\uD83C\uDFEA \u86CB\u5821\u57CE\u6742\u8D27\u94FA':'\uD83C\uDFEA \u9009\u8D2D',
        desc:isDoor?'\u8FDB\u5165\u6742\u8D27\u94FA\uFF1F':'\u548C\u8001\u677F\u9009\u8D2D\u5916\u89C2\uFF1F',
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
    var inCity=(typeof gameState!=='undefined'&&gameState==='city'&&!window._interiorActive);
    var sb=document.getElementById('shop-btn');if(sb)sb.style.display=(window._interiorActive&&window._interiorShop&&window._shopNearKeeper&&!window._shopOpen)?'block':'none';
    if(!inCity){ if(_shopNPC)_shopNPC.visible=false; window._nearShopDoor=false; if(!window._shopNearKeeper)_showShopPrompt(false); return; }
    // red shop house only in Egg City (style 0)
    _ensureShopNPC();
    var show=(currentCityStyle===0);_shopNPC.visible=show;
    if(show&&playerEgg&&playerEgg.mesh){
        var dx=playerEgg.mesh.position.x-_shopDoorPos.x,dz=playerEgg.mesh.position.z-_shopDoorPos.z;
        window._nearShopDoor=(dx*dx+dz*dz)<5.0;
        if(window._nearShopDoor&&!window._shopOpen&&_maybeAutoShopConfirm('door'))_showShopPrompt(false);
        else _showShopPrompt(window._nearShopDoor&&!window._shopOpen,'door');
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
            el.onclick=function(){if(typeof _portalDismissed!=='undefined')_portalDismissed=null;if(typeof showPortalConfirm==='function')showPortalConfirm({name:'\uD83C\uDFEA \u86CB\u5821\u57CE\u6742\u8D27\u94FA',desc:'\u8FDB\u5165\u6742\u8D27\u94FA\uFF1F',raceIndex:-1,_hiddenType:'shopHouse',_targetStyle:-97});else _enterShopHouse();};
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
