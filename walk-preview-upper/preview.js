import {STRIDE,walkPose} from './gait.js';
import {renderWalker} from './render.js';
const image=src=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error(src));i.src=src;});
const rig=await image('club-rig.png'),old=await image('../assets-v4/walk/club.png'),background=await image('../assets-v3/background.png');
const stages=['old','new'].map(id=>document.getElementById(id)),thumbs=[];
let elapsed=0,paused=false,speed=1,direction=1,last=performance.now();

function size(canvas){
 const box=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,3);
 const width=Math.round(box.width*dpr),height=Math.round(box.height*dpr);
 if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
 return {ctx:canvas.getContext('2d'),width:box.width,height:box.height,dpr};
}

function stage(canvas,updated){
 const {ctx,width,height,dpr}=size(canvas);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
 const factor=Math.max(width/background.width,height/background.height);ctx.drawImage(background,(width-background.width*factor)/2,(height-background.height*factor)/2,background.width*factor,background.height*factor);
 const ground=height-27,scale=Math.min(1.03,(height-45)/225),distance=elapsed*STRIDE/.95;
 ctx.fillStyle='rgba(85,92,42,.15)';ctx.fillRect(0,ground,width,height-ground);
 ctx.strokeStyle='rgba(78,89,39,.32)';ctx.lineWidth=2;ctx.beginPath();
 for(let x=-70-(distance*scale*direction%70);x<width+70;x+=70){ctx.moveTo(x,ground+7);ctx.lineTo(x+18,ground+7);}
 ctx.stroke();ctx.fillStyle='rgba(39,65,36,.18)';ctx.beginPath();ctx.ellipse(width/2,ground+2,33*scale,4*scale,0,0,Math.PI*2);ctx.fill();
 if(updated)renderWalker(ctx,rig,walkPose(distance),{x:width/2,y:ground,scale,direction});
 else{
  const frame=Math.floor(distance/(6*225/66))%4,h=225*scale,w=h*768/512;
  ctx.save();ctx.translate(width/2,ground);ctx.scale(direction,1);ctx.drawImage(old,frame*768,0,768,512,-w/2,-h,w,h);ctx.restore();
 }
}

function paint(){stage(stages[0],false);stage(stages[1],true);}
function setPause(value){paused=value;const b=document.getElementById('pause');b.innerHTML=`<i data-lucide="${paused?'play':'pause'}"></i>`;b.setAttribute('aria-label',paused?'재생':'일시정지');b.title=paused?'재생':'일시정지';lucide.createIcons();}
document.getElementById('pause').onclick=()=>setPause(!paused);
document.getElementById('reset').onclick=()=>{elapsed=0;paint();};
document.getElementById('step').onclick=()=>{setPause(true);elapsed=(Math.floor(elapsed/.95*8+1e-8)+1)*.95/8;paint();};
for(const b of document.querySelectorAll('[data-speed]'))b.onclick=()=>{speed=Number(b.dataset.speed);for(const v of document.querySelectorAll('[data-speed]'))v.setAttribute('aria-pressed',String(v===b));};
for(const b of document.querySelectorAll('[data-direction]'))b.onclick=()=>{direction=Number(b.dataset.direction);for(const v of document.querySelectorAll('[data-direction]'))v.setAttribute('aria-pressed',String(v===b));paint();paintThumbs();};

for(let i=0;i<8;i++){
 const item=document.createElement('div'),canvas=document.createElement('canvas'),label=document.createElement('span');
 canvas.width=240;canvas.height=320;canvas.setAttribute('aria-label',`자세 ${i+1}`);label.className='pose-number';label.textContent=String(i+1);item.append(canvas,label);document.getElementById('poses').append(item);thumbs.push(canvas);
}
function paintThumbs(){for(const [i,canvas]of thumbs.entries()){const ctx=canvas.getContext('2d');ctx.clearRect(0,0,240,320);renderWalker(ctx,rig,walkPose(i*STRIDE/8),{x:120,y:308,scale:1.25,direction});}}
paintThumbs();paint();lucide.createIcons();document.getElementById('status').textContent='';
window.__walkSample={snapshot:()=>({elapsed,paused,speed,direction,pose:walkPose(elapsed*STRIDE/.95),ready:true}),
 renderFrame:index=>{
  const frame=document.createElement('canvas');frame.width=768;frame.height=512;
  renderWalker(frame.getContext('2d'),rig,walkPose(index*STRIDE/8),{x:384,y:511,scale:2.1});
  return frame.toDataURL('image/png');
 },
 renderSheet:()=>{
  const sheet=document.createElement('canvas');sheet.width=768*8;sheet.height=512;const ctx=sheet.getContext('2d');
  for(let i=0;i<8;i++)renderWalker(ctx,rig,walkPose(i*STRIDE/8),{x:768*i+384,y:511,scale:2.1});
  return sheet.toDataURL('image/png');
 }
};
function tick(now){if(!paused&&document.visibilityState==='visible')elapsed+=Math.min((now-last)/1000,.05)*speed;last=now;paint();requestAnimationFrame(tick);}
requestAnimationFrame(tick);
