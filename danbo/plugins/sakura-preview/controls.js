// Independent input owner for the preview. No bindings or saves from the main
// game are changed; pointer IDs and gamepad edges prevent stuck/duplicate input.
export function movement(x, forward, yaw){
 const n=Math.max(1,Math.hypot(x,forward));x/=n;forward/=n;
 return {x:Math.cos(yaw)*x-Math.sin(yaw)*forward,z:-Math.sin(yaw)*x-Math.cos(yaw)*forward};
}
export class PreviewControls{
 constructor({canvas,stick,knob,jump,start,reset,portrait,isStarted}){
  Object.assign(this,{canvas,stick,knob,start,reset,portrait,isStarted});this.keys=new Set();this.joy={x:0,y:0};this.look={x:0,y:0};this.jumpQueued=false;this.ui=false;this.padPrev=[];this.neutral=false;this.stickId=null;this.lookId=null;this.last=null;
  this.abort=new AbortController();const on=(target,type,fn,extra={})=>target.addEventListener(type,fn,{signal:this.abort.signal,...extra});
  const editable=e=>e?.closest?.('button,select,a,input');
  on(window,'keydown',e=>{
   if(e.code==='Escape'){this.ui=!this.ui;this.release();if(this.ui)document.querySelector('#locale')?.focus();else document.activeElement?.blur();return;}
   if(!isStarted()||editable(e.target)||this.ui)return;
   if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
   this.keys.add(e.code);if(!e.repeat&&e.code==='Space')this.jumpQueued=true;if(!e.repeat&&e.code==='KeyR')reset();if(!e.repeat&&e.code==='KeyP')portrait();
  });
  on(window,'keyup',e=>this.keys.delete(e.code));
  on(window,'blur',()=>this.release());on(window,'gamepaddisconnected',()=>this.release());on(document,'visibilitychange',()=>{if(document.hidden)this.release();});
  on(stick,'pointerdown',e=>{if(this.stickId!==null||!isStarted())return;e.preventDefault();this.stickId=e.pointerId;stick.setPointerCapture(e.pointerId);this.stickMove(e);});
  on(stick,'pointermove',e=>{if(e.pointerId===this.stickId)this.stickMove(e);});
  const endStick=e=>{if(e.pointerId===this.stickId){this.stickId=null;this.joy={x:0,y:0};knob.style.transform='';}};
  for(const event of ['pointerup','pointercancel','lostpointercapture'])on(stick,event,endStick);
  on(jump,'pointerdown',e=>{e.preventDefault();if(isStarted())this.jumpQueued=true;});
  on(jump,'click',e=>{if(e.detail===0&&isStarted())this.jumpQueued=true;});
  on(canvas,'pointerdown',e=>{if(this.lookId!==null||!isStarted()||e.button>0)return;this.ui=false;document.activeElement?.blur();this.lookId=e.pointerId;this.last={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
  on(canvas,'pointermove',e=>{if(this.lookId!==e.pointerId||!this.last)return;this.look.x+=e.clientX-this.last.x;this.look.y+=e.clientY-this.last.y;this.last={x:e.clientX,y:e.clientY};});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])on(canvas,event,e=>{if(e.pointerId===this.lookId){this.lookId=null;this.last=null;}});
  on(document,'pointerdown',e=>{if(editable(e.target)){this.keys.clear();this.jumpQueued=false;}}, {capture:true});
 }
 stickMove(e){const b=this.stick.getBoundingClientRect(),dx=(e.clientX-b.left-b.width/2)/40,dy=(e.clientY-b.top-b.height/2)/40,n=Math.max(1,Math.hypot(dx,dy));this.joy={x:dx/n,y:dy/n};this.knob.style.transform=`translate(${this.joy.x*32}px,${this.joy.y*32}px)`;}
 release(){this.keys.clear();this.joy={x:0,y:0};this.look={x:0,y:0};this.jumpQueued=false;this.stickId=null;this.lookId=null;this.last=null;this.knob.style.transform='';this.neutral=true;}
 read(dt){
  const pad=Array.from(navigator.getGamepads?.()||[]).find(p=>p?.connected&&p.mapping==='standard'),down=pad?pad.buttons.map(b=>b.pressed):[],edge=i=>down[i]&&!this.padPrev[i];
  let px=pad?.axes[0]||0,py=pad?.axes[1]||0;const dead=v=>Math.abs(v)<.18?0:Math.sign(v)*(Math.abs(v)-.18)/.82;
  px=dead(px);py=dead(py);if(down[14])px=-1;if(down[15])px=1;if(down[12])py=-1;if(down[13])py=1;
  if(this.neutral){if(!down.some(Boolean)&&!px&&!py)this.neutral=false;this.padPrev=down;px=py=0;}
  else if(pad){
   if(edge(9)){this.ui=!this.ui;this.keys.clear();if(this.ui)document.getElementById('locale').focus();else document.activeElement?.blur();}
   if(!this.isStarted()||this.ui){
    const items=[...document.querySelectorAll('button,select,a')].filter(e=>!e.disabled&&!e.hidden&&e.getClientRects().length);
    const active=document.activeElement,i=items.indexOf(active);const dir=(edge(15)||edge(13)?1:edge(14)||edge(12)?-1:0);
    if(dir&&items.length){if(active?.tagName==='SELECT'&&(edge(14)||edge(15))){active.selectedIndex=(active.selectedIndex+dir+active.options.length)%active.options.length;active.dispatchEvent(new Event('change'));}else items[(i+dir+items.length)%items.length]?.focus();}
    if(edge(0)){if(!this.isStarted()&&(!active||active===document.body))this.start();else active?.click();}
    if(edge(1)){this.ui=false;document.activeElement?.blur();}px=py=0;
   }else{
    this.look.x+=dead(pad.axes[2]||0)*dt*700;this.look.y+=dead(pad.axes[3]||0)*dt*480;if(edge(0))this.jumpQueued=true;if(edge(3))this.portrait();if(edge(8))this.reset();
   }
  }
  this.padPrev=down;const k=this.keys,blocked=this.ui||!this.isStarted();
  const x=blocked?0:(k.has('KeyD')||k.has('ArrowRight')?1:0)-(k.has('KeyA')||k.has('ArrowLeft')?1:0)+this.joy.x+px;
  const f=blocked?0:(k.has('KeyW')||k.has('ArrowUp')?1:0)-(k.has('KeyS')||k.has('ArrowDown')?1:0)-this.joy.y-py;
  const result={x,f,lookX:this.look.x,lookY:this.look.y,jump:!blocked&&this.jumpQueued,run:k.has('ShiftLeft')||k.has('ShiftRight')||!!down[4]};this.look.x=this.look.y=0;this.jumpQueued=false;return result;
 }
 dispose(){this.release();this.abort.abort();}
}
