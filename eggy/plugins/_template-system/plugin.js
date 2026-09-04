// ============================================================
//  SYSTEM PLUGIN TEMPLATE  (常驻系统插件模板)
// ------------------------------------------------------------
//  Copy this folder to plugins/<your-id>/, change the id below and
//  in plugin.json, then build your feature using ONLY ctx.api.
//  Do NOT read/write global game state (coins, playerEgg, scene) directly.
//  Full contract: PLUGIN_COLLAB_ARCHITECTURE.md
// ============================================================
(function(){
    'use strict';
    if(!window.DANBO_PLUGIN_HOST||!window.DANBO_PLUGIN_HOST.registerSystem){
        console.warn('[template-system] plugin host / registerSystem missing');
        return;
    }

    window.DANBO_PLUGIN_HOST.registerSystem({
        id:'_template-system',
        version:'0.1.0',
        autoStart:true,

        // create(ctx) runs once when the system starts.
        // Keep it light: set up state + register hooks. Heavy work goes in onFrame,
        // guarded so it only runs when the world is actually ready.
        create:function(ctx){
            var api=ctx.api;
            var started=false;

            // Example: react to coin changes.
            // api.economy.onChanged(function(coins){ /* ... */ });

            // Per-frame logic. Runs only while in a city (host gates the dispatch).
            api.lifecycle.onFrame(function(dt){
                if(!api.player.exists())return;      // world not ready yet
                if(!api.world.isInCity())return;     // only act in the city
                if(!started){
                    started=true;
                    // one-time lazy init that needs the scene/player, e.g.:
                    // var g=new ctx.THREE.Group(); ... api.player.attachToBody(g,'my-token');
                }
                // var st=api.player.getState(); // {x,z,y,vx,vz,grounded}
                // ...your feature logic per frame...
            });

            // Clean up anything you created (host also auto-clears HUDs + attachments).
            api.lifecycle.onDestroy(function(){
                api.player.clearAttachment('my-token');
            });

            return {
                // Optional: update(dt) also runs each frame if you prefer it over onFrame.
                destroy:function(){ /* optional extra teardown */ }
            };
        }
    });
})();
