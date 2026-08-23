(function(){
    'use strict';
    if(!window.DANBO_PLUGIN_HOST){console.warn('[ability-card] Plugin host missing');return;}

    function esc(s){
        return String(s===undefined||s===null?'':s).replace(/[&<>"']/g,function(c){
            return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
        });
    }

    window.DANBO_PLUGIN_HOST.register({
        id:'ability-card',
        version:'0.1.0',
        name:{zhs:'角色能力卡测试',en:'Ability Card Demo'},
        description:'Example minigame plugin. It receives only the selected character snapshot and a network-room API.',
        create:function(ctx){
            var ch=ctx.character;
            var panel=document.createElement('div');
            panel.style.cssText='position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(86vw,420px);max-height:76vh;overflow:auto;border-radius:24px;padding:18px;background:rgba(255,250,235,.96);box-shadow:0 18px 50px rgba(54,39,20,.35);border:3px solid rgba(255,255,255,.85);font-family:Segoe UI,Arial,sans-serif;color:#4a3524;text-align:left;';
            var abilities=(ch.abilities||[]).slice(0,6).map(function(a){
                return '<li><b>'+esc(a.name)+'</b> <span style="opacity:.68">'+esc(a.inputDescription||a.type||'')+'</span></li>';
            }).join('') || '<li>无特殊能力</li>';
            panel.innerHTML=
                '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">'+
                  '<div style="font-size:42px;line-height:1">'+esc(ch.icon||'🥚')+'</div>'+
                  '<div><div style="font-size:20px;font-weight:900;">'+esc(ch.displayName||ch.name)+'</div>'+
                  '<div style="font-size:13px;opacity:.75;">ID #'+esc(ch.index)+' · '+esc(ch.name)+' · '+esc(ch.country)+'</div></div>'+
                '</div>'+
                '<div style="padding:10px 12px;border-radius:16px;background:rgba(255,220,150,.45);margin-bottom:12px;">'+
                  '<b>插件收到的角色数据</b><br>'+ 
                  '<span style="font-size:13px;opacity:.8;">jump '+esc(ch.stats.jumpForce)+' · speed '+esc(ch.stats.maxSpeed)+' · abilities '+esc((ch.abilities||[]).length)+' · room '+esc(ctx.net?ctx.net.mode:'none')+'</span>'+
                '</div>'+
                '<ol style="padding-left:22px;margin:8px 0 16px;line-height:1.7;">'+abilities+'</ol>'+
                '<button data-close style="width:100%;border:0;border-radius:18px;padding:12px;font-size:16px;font-weight:900;background:#ffcf66;color:#5b3512;box-shadow:0 4px 0 #d89b2c;">完成测试</button>';
            ctx.mount.appendChild(panel);
            if(ctx.net)ctx.net.send('plugin.ready',{pluginId:ctx.pluginId,characterId:ch.id});
            panel.querySelector('[data-close]').addEventListener('click',function(){
                ctx.api.play('confirm');
                if(ctx.net)ctx.net.send('plugin.finishIntent',{characterId:ch.id});
                ctx.api.finish({status:'ok',characterId:ch.id});
            });
            return {
                destroy:function(){ if(panel&&panel.parentNode)panel.parentNode.removeChild(panel); }
            };
        }
    });
})();
