// Account requests stay inside DANBO_ACCOUNT's server-origin/token boundary.
(function(root){
    'use strict';
    function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
    function text(s){return esc(UI_T(s));}
    function button(action,label,selected,disabled){return '<button class="rr-menu-btn" data-action="'+action+'"'+(selected?' aria-pressed="true"':'')+(disabled?' disabled':'')+'>'+text(label)+'</button>';}
    function account(){return root.DANBO_ACCOUNT;}
    function user(){var a=account();return a&&a.getUser?a.getUser():null;}
    function request(path,body){var a=account();return a&&a.request?a.request('/rocket-road'+path,body):Promise.reject(new Error(UI_T('排行榜暂时不可用')));}
    function identity(){var u=user();return u&&u.kind==='account'?u.id:null;}
    function focusKey(panel){var active=document.activeElement;return active&&panel.contains&&panel.contains(active)&&active.getAttribute('data-action');}
    function restoreFocus(panel,key){var el=key&&panel.querySelector('[data-action="'+key+'"]');if(el&&el.focus&&!el.disabled)el.focus();}
    function tabs(mode){return '<div class="rr-board-tabs">'+button('board-global','全服排行',mode==='global')+button('board-local','本地记录',mode==='local')+'</div>';}
    function row(entry){return '<div'+(entry.isMe?' class="rr-board-me"':'')+'><b>#'+entry.rank+'</b><span>'+esc(entry.characterName)+'</span><strong>'+entry.score+'<small>'+ (entry.timeMs/1000).toFixed(2)+' s</small></strong></div>';}
    var methods={
        startGame:function(stage){
            stage=Math.max(0,Math.min(5,stage|0));
            if(stage>this.getUnlockedStage())return this.localStartGame(stage);
            var self=this,seq=this.runSequence=(this.runSequence||0)+1,owner=identity();
            this.runTicket=null;this.pendingScore=null;this.submitStatus='';this.boardSequence=(this.boardSequence||0)+1;
            if(!owner)return this.localStartGame(stage);
            // Unlock audio on the user's click, not after awaiting the network.
            var ac=this.ensureAudio();if(ac&&ac.state==='suspended'&&ac.resume)ac.resume();
            this.onBlur();this.stopMusic();this.state='preparing';this.hud.style.display='none';this.touchLayer.style.display='none';
            this.countdownEl.style.display='none';this.stageEl.style.display='none';this.panel.style.display='grid';
            this.panel.innerHTML='<h1 class="rr-title">'+text('准备比赛')+'</h1><p class="rr-sub" role="status">'+text('正在连接排行榜…')+'</p>'+button('local-start','只玩本地')+button('title','返回标题');
            this.preparingStage=stage;
            var timer,timeout=new Promise(function(resolve){timer=setTimeout(function(){resolve(null);},3500);});
            this.startPromise=Promise.race([request('/runs',{stage:stage,version:root.DanboRocketRules.VERSION}).catch(function(){return null;}),timeout]).then(function(ticket){
                clearTimeout(timer);
                if(!self.running||self.state!=='preparing'||self.runSequence!==seq)return;
                if(ticket&&ticket.version===root.DanboRocketRules.VERSION&&ticket.stage===stage&&identity()===owner){
                    self.runTicket={runId:ticket.runId,version:ticket.version,expiresAt:ticket.expiresAt,owner:owner};
                }
                self.localStartGame(stage);
                self.showToast(UI_T(self.runTicket?'本局通关将参加全服排行':'排行榜未连接，本局保存在本地'));
            });
            return this.startPromise;
        },
        finishLeaderboard:function(win){
            this.scoreMode=this.scoreMode||'global';this.boardStage=this.stageId;
            this.submitStatus=win?'本局成绩已保存在本地':'未通关成绩保存在本地';
            if(win&&this.runTicket&&this.sim&&this.sim.finished&&identity()===this.runTicket.owner){
                this.pendingScore={ticket:this.runTicket,inputs:this.replay.map(function(r){return r.slice();}),seq:this.runSequence};
                this.submitScore();
            }else this.renderSubmitStatus();
        },
        renderSubmitStatus:function(){
            if(!this.running||this.state!=='result')return;
            var el=this.panel.querySelector('[data-submit-status]');if(!el)return;
            el.innerHTML=text(this.submitStatus||'本局成绩已保存在本地');
            var retry=this.panel.querySelector('[data-action="submit-retry"]');if(retry)retry.hidden=!this.submitCanRetry;
        },
        submitScore:function(){
            var self=this,pending=this.pendingScore;
            if(!pending||this.submitting===pending)return;
            if(identity()!==pending.ticket.owner){this.submitCanRetry=false;this.submitStatus='账号已变化，成绩仅保存在本地';this.renderSubmitStatus();return;}
            this.submitting=pending;this.submitCanRetry=false;this.submitStatus='正在验证成绩…';this.renderSubmitStatus();
            // Capture a particular run; retries/results from older races must not affect a newer race.
            this.submitPromise=request('/submit',{runId:pending.ticket.runId,version:pending.ticket.version,inputs:pending.inputs}).then(function(receipt){
                if(!self.running||self.pendingScore!==pending)return;
                self.pendingScore=null;self.submitCanRetry=false;self.submitStatus='全服成绩已验证并保存';self.boardData=null;
                self.verifiedReceipt=receipt;self.renderSubmitStatus();
                if(self.state==='scores'&&self.scoreMode==='global')self.showScores();
            }).catch(function(error){
                if(!self.running||self.pendingScore!==pending)return;
                self.submitCanRetry=(!error.status||error.status===429||error.status>=500)&&Date.now()<pending.ticket.expiresAt;
                self.submitStatus=self.submitCanRetry?'上传未完成，可重试；本地成绩已保存':'本局未计入全服排行，本地成绩已保存';
                self.renderSubmitStatus();
            }).then(function(){if(self.submitting===pending)self.submitting=null;});
            return this.submitPromise;
        },
        showScores:function(){
            this.toast.style.display='none';this.toastTimer=0;
            this.scoreMode=this.scoreMode||'global';this.boardPeriod=this.boardPeriod||'all';
            this.boardStage=this.boardStage==null?this.stageId:this.boardStage;
            var seq=this.boardSequence=(this.boardSequence||0)+1,key=focusKey(this.panel);
            if(this.scoreMode==='local'){
                this.localShowScores();
                this.panel.innerHTML=this.panel.innerHTML.replace('</h1>','</h1>'+tabs('local'));
                restoreFocus(this.panel,key);return;
            }
            this.stopMusic();this.state='scores';this.hud.style.display='none';this.touchLayer.style.display='none';this.panel.style.display='grid';
            this.countdownEl.style.display='none';this.stageEl.style.display='none';this.boardData=null;this.boardError=false;
            this.renderBoard();restoreFocus(this.panel,key);
            var self=this,owner=identity(),path='/board?stage='+this.boardStage+'&period='+this.boardPeriod+'&page='+(this.scoresPage||0);
            this.boardPromise=request(path).then(function(data){
                if(!self.running||self.state!=='scores'||self.boardSequence!==seq||identity()!==owner)return;
                if(data.version!==root.DanboRocketRules.VERSION)throw new Error('version');
                self.boardData=data;self.scoresPage=data.page;self.renderBoard();
            }).catch(function(){
                if(!self.running||self.state!=='scores'||self.boardSequence!==seq)return;
                self.boardError=true;self.renderBoard();
            });
            return this.boardPromise;
        },
        renderBoard:function(){
            var key=focusKey(this.panel),data=this.boardData,page=data?data.page:0,pages=data?data.pages:1;
            var rows=data?(data.entries.length?data.entries.map(row).join(''):'<p>'+text('还没有通关记录，来拿第一名吧！')+'</p>'):
                '<p role="status">'+text(this.boardError?'排行榜暂时不可用':'正在读取排行…')+'</p>';
            var me=data&&data.me;
            this.panel.innerHTML='<h1 class="rr-title">🏆 '+text('全服排行')+'</h1>'+tabs('global')+
                '<div class="rr-board-tabs">'+button('board-all','总榜',this.boardPeriod==='all')+button('board-week','周榜',this.boardPeriod==='week')+'</div>'+
                '<div class="rr-page-nav rr-stage-nav">'+button('board-stage-prev','上一关',false,this.boardStage===0)+'<b>STAGE '+(this.boardStage+1)+'</b>'+button('board-stage-next','下一关',false,this.boardStage===5)+'</div>'+
                '<div class="rr-list rr-score-list rr-global-list">'+rows+'</div>'+
                '<p class="rr-small rr-my-rank">'+(me?text('我的排名')+' #'+me.rank+' · '+me.score+' · '+(me.timeMs/1000).toFixed(2)+' s':text(identity()?'我的排名：尚未上榜':'游客可查看排行；注册后可上榜'))+'</p>'+
                '<div class="rr-page-nav">'+button('scores-prev','上一页',false,!data||page===0)+'<span>'+(page+1)+' / '+pages+'</span>'+button('scores-next','下一页',false,!data||page===pages-1)+'</div>'+
                button('board-refresh','刷新排行')+button('title','返回标题')+
                '<p class="rr-small">'+text(this.boardPeriod==='week'?'四服共用 · 周一 00:00 UTC 更新':'四服共用 · 每人每关保留最佳成绩')+'</p>';
            restoreFocus(this.panel,key);
        },
        handleLeaderboardAction:function(action){
            if(action==='local-start'){
                this.runSequence++;this.runTicket=null;this.localStartGame(this.preparingStage);this.showToast(UI_T('本局成绩保存在本地'));return true;
            }
            if(action==='submit-retry'){this.submitScore();return true;}
            if(action==='title'){this.runSequence=(this.runSequence||0)+1;this.boardSequence=(this.boardSequence||0)+1;return false;}
            if(action==='scores'){this.boardStage=this.stageId;this.scoresPage=0;return false;}
            if(action.indexOf('board-')!==0)return false;
            if(action==='board-global')this.scoreMode='global';
            else if(action==='board-local')this.scoreMode='local';
            else if(action==='board-all')this.boardPeriod='all';
            else if(action==='board-week')this.boardPeriod='week';
            else if(action==='board-stage-prev')this.boardStage=Math.max(0,this.boardStage-1);
            else if(action==='board-stage-next')this.boardStage=Math.min(5,this.boardStage+1);
            this.scoresPage=0;this.showScores();return true;
        }
    };
    root.DanboRocketBoard={install:function(proto){
        proto.localStartGame=proto.startGame;proto.localShowScores=proto.showScores;
        Object.keys(methods).forEach(function(k){proto[k]=methods[k];});
    }};
})(window);
