import {walkPose,STRIDE} from './gait.js';
import {renderWalker} from './render.js';
import {RIGS} from './all-rigs.js';

const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const wrap=x=>((x%1)+1)%1;
const point=([x,y])=>({x,y});
function rotate(p,c,angle,scale=1){const dx=p.x-c.x,dy=p.y-c.y,co=Math.cos(angle)*scale,si=Math.sin(angle)*scale;return {x:c.x+dx*co-dy*si,y:c.y+dx*si+dy*co};}

export function limbPose(source,phase,offset,stride){
 const body=walkPose(STRIDE*wrap(phase)),f=walkPose(STRIDE*wrap(phase+offset)).legs[0];
 const depth=(source.bottom??512)-source.ankle[1],height=512-depth-source.hip[1];
 const hip={x:source.hip[0],y:source.hip[1]+body.hip.y+77};
 const sole={x:hip.x+f.sole.x*stride/STRIDE,y:512+f.sole.y*Math.min(1.8,height/77)};
 const ankle={x:sole.x,y:sole.y-depth};
 return {hip,sole,ankle,planted:f.planted,angle:f.angle};
}

export function articulatedPoint(p,profile,phase){
 const beat=2*Math.PI*wrap(phase),waist=point(profile.waist),head=point(profile.head),grip=point(profile.grip);
 const height=waist.y-(profile.top??0),weight=1-smooth(waist.y-height*.17,waist.y,p.y);
 const h=(1-smooth(head.y+height*.15,head.y+height*.4,p.y))*smooth(head.x-100,head.x-20,p.x)*(1-smooth(head.x+60,head.x+170,p.x));
 const hand=(1-h)*(1-smooth(grip.y+height*.15,waist.y,p.y));
 const t=rotate(p,waist,.028*Math.sin(beat)),q=rotate(p,head,.025*Math.sin(beat-.65)),r=rotate(p,grip,.045*Math.sin(beat-.4));
 return {x:p.x+weight*(t.x-p.x)+h*(q.x-p.x)+hand*(r.x-p.x),
  y:p.y+weight*(t.y-p.y)+h*(q.y-p.y)+hand*(r.y-p.y)+weight*.8*Math.cos(2*beat-.35)};
}

export const wheelAngle=(distance,radius)=>distance/radius;

function polygon(ctx,vertices){ctx.moveTo(...vertices[0]);for(const v of vertices.slice(1))ctx.lineTo(...v);ctx.closePath();}
function canvas(){const c=document.createElement('canvas');c.width=768;c.height=512;return c;}
function cut(image,masks,inverse=false){
 const c=canvas(),ctx=c.getContext('2d');
 if(inverse){
  ctx.drawImage(image,0,0);ctx.globalCompositeOperation='destination-out';
  for(const mask of masks){ctx.beginPath();polygon(ctx,mask);ctx.fill();}
 }else{ctx.beginPath();for(const mask of masks)polygon(ctx,mask);ctx.clip();ctx.drawImage(image,0,0);}
 return c;
}
function bounds(c){
 const data=c.getContext('2d').getImageData(0,0,768,512).data;let left=768,top=512,right=0,bottom=0;
 for(let y=0;y<512;y++)for(let x=0;x<768;x++)if(data[(y*768+x)*4+3]>96){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
 return {left,top,right,bottom,height:bottom-top+1};
}

function triangle(ctx,image,source,target){
 const [a,b,c]=source,[p,q,r]=target,ux=b.x-a.x,uy=b.y-a.y,vx=c.x-a.x,vy=c.y-a.y,det=ux*vy-uy*vx;
 const ax=((q.x-p.x)*vy-(r.x-p.x)*uy)/det,bx=((r.x-p.x)*ux-(q.x-p.x)*vx)/det;
 const ay=((q.y-p.y)*vy-(r.y-p.y)*uy)/det,by=((r.y-p.y)*ux-(q.y-p.y)*vx)/det;
 const area=Math.abs((q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x))/2;if(area<.001)return;
 const cx=(p.x+q.x+r.x)/3,cy=(p.y+q.y+r.y)/3;
 const inset=Math.min(...target.map((v,i)=>2*area/(3*Math.hypot(v.x-target[(i+1)%3].x,v.y-target[(i+1)%3].y))));
 const expansion=1+1.5/inset;ctx.save();ctx.beginPath();
 target.forEach((v,i)=>{const x=cx+(v.x-cx)*expansion,y=cy+(v.y-cy)*expansion;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.closePath();ctx.clip();
 ctx.transform(ax,ay,bx,by,p.x-ax*a.x-bx*a.y,p.y-ay*a.x-by*a.y);ctx.drawImage(image,0,0);ctx.restore();
}

function skin(ctx,image,deform,box={left:0,top:0,right:768,bottom:512},columns=12,rows=12){
 const grid=Array.from({length:rows+1},(_,y)=>Array.from({length:columns+1},(_,x)=>({x:box.left+(box.right-box.left)*x/columns,y:box.top+(box.bottom-box.top)*y/rows})));
 const target=grid.map(row=>row.map(deform));
 for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
  triangle(ctx,image,[grid[y][x],grid[y][x+1],grid[y+1][x]],[target[y][x],target[y][x+1],target[y+1][x]]);
  triangle(ctx,image,[grid[y][x+1],grid[y+1][x+1],grid[y+1][x]],[target[y][x+1],target[y+1][x+1],target[y+1][x]]);
 }
}

function drawLimb(ctx,part,phase,stride){
 const s=part.source;
 // A continuous shear retains the original boots/armor; it cannot fold at a knee.
 skin(ctx,part.image,v=>limbPoint(v,s,phase,stride),part.box,10,14);
}

export function limbPoint(v,source,phase,stride){
 const p=limbPose(source,phase,source.offset,stride),weight=smooth(source.hip[1],source.ankle[1]-12,v.y),bob=p.hip.y-source.hip[1];
 return {x:v.x+weight*(p.ankle.x-source.ankle[0]),y:v.y+weight*(p.ankle.y-source.ankle[1])+(1-weight)*bob};
}

function distanceToBone(x,y,a,b){
 const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));
 return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t);
}

function splitLimbs(source,profile){
 const pixels=source.getContext('2d').getImageData(0,0,768,512),body=canvas(),output=profile.limbs.map(()=>canvas());
 const data=output.map(c=>c.getContext('2d').createImageData(768,512)),bodyData=new ImageData(new Uint8ClampedArray(pixels.data),768,512);
 const cutY=Math.min(...profile.limbs.map(s=>s.hip[1]))-8;
 const keep=canvas(),keepContext=keep.getContext('2d');keepContext.beginPath();
 for(const [x,y,w,h] of profile.keep??[])keepContext.rect(x,y,w,h);
 for(const p of profile.keepPolygons??[])polygon(keepContext,p);
 keepContext.fill();const protectedPixels=keepContext.getImageData(0,0,768,512).data;
 for(let y=cutY;y<512;y++)for(let x=0;x<768;x++){
  const index=(y*768+x)*4;if(!pixels.data[index+3]||protectedPixels[index+3]>128)continue;
  let nearest=0,best=Infinity;
  profile.limbs.forEach((s,i)=>{
   const d=Math.min(distanceToBone(x,y,s.hip,s.knee),distanceToBone(x,y,s.knee,s.ankle),Math.hypot(x-s.ankle[0],Math.max(0,y-s.ankle[1])*.3));
   if(d<best){best=d;nearest=i;}
  });
  data[nearest].data.set(pixels.data.subarray(index,index+4),index);
  if(y>cutY+12)bodyData.data[index+3]=0;
 }
 body.getContext('2d').putImageData(bodyData,0,0);
 const parts=output.map((image,i)=>{
  image.getContext('2d').putImageData(data[i],0,0);const box=bounds(image);
  return {image,box,source:{...profile.limbs[i],bottom:box.bottom+1}};
 });
 return {body,parts};
}

function wheel(ctx,image,[x,y,radius],distance){
 ctx.save();ctx.translate(x,y);ctx.rotate(wheelAngle(distance,radius));ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.clip();
 ctx.drawImage(image,x-radius,y-radius,2*radius,2*radius,-radius,-radius,2*radius,2*radius);ctx.restore();
}

export function prepareRig(key,image,approvedImage){
 const profile=RIGS[key],source=canvas(),ctx=source.getContext('2d');
 if(image.width>=3072)ctx.drawImage(image,0,0,768,512,0,0,768,512);
 else{const scale=Math.min(744/image.width,512/image.height);ctx.drawImage(image,(768-image.width*scale)/2,512-image.height*scale,image.width*scale,image.height*scale);}
 const box=bounds(source),split=profile.limbs?splitLimbs(source,profile):{body:cut(source,profile.rotor?[profile.rotor.mask]:[],true),parts:[]};
 const {body,parts}=split,stride=profile.type==='approved'?STRIDE*Math.min(500,box.height)/225:profile.type==='vehicle'?2*Math.PI*(profile.wheels.reduce((s,w)=>s+w[2],0)/profile.wheels.length):box.height*.38;
 return {key,profile,source,body,parts,stride,box,approvedImage};
}

export function paintRig(ctx,rig,phase){
 const {profile:p,source,body,parts,stride}=rig,beat=2*Math.PI*phase;
 if(p.type==='approved'){renderWalker(ctx,rig.approvedImage,walkPose(STRIDE*phase),{x:384,y:511,scale:Math.min(500,rig.box.height)/225});return;}
 if(parts.length){
  for(const part of parts.filter(p=>p.source.offset===.5))drawLimb(ctx,part,phase,stride);
  for(const part of parts.filter(p=>p.source.offset!==.5))drawLimb(ctx,part,phase,stride);
  const motion={...p,top:rig.box.top};
  skin(ctx,body,v=>{
   const q=articulatedPoint(v,motion,phase);q.y+=walkPose(STRIDE*phase).hip.y+77;return q;
  });
 }else if(p.type==='vehicle'||p.type==='mechanical'){
  const floor=p.type==='mechanical'?480:Math.min(...p.wheels.map(w=>w[1]-w[2]*.3));
  skin(ctx,source,v=>({x:v.x+.65*Math.sin(beat)*(1-smooth(floor-70,floor,v.y)),y:v.y+1.5*Math.cos(2*beat)*(1-smooth(floor-70,floor,v.y))}));
 }else{
  skin(ctx,body,v=>({x:v.x+.9*Math.sin(beat),y:v.y+2*Math.sin(beat)+.006*Math.sin(beat-.6)*(v.x-384)}));
  if(p.rotor){
   const rotor=cut(source,[p.rotor.mask]),[x,y]=p.rotor.hub;
   ctx.save();ctx.translate(x,y);ctx.transform(Math.cos(beat),.13*Math.sin(beat),0,1,0,0);ctx.drawImage(rotor,-x,-y);ctx.restore();
  }
 }
 for(const w of p.wheels??[])wheel(ctx,source,w,phase*2*Math.PI*w[2]);
 if(p.tracks){
  const [left,top,right,bottom]=p.tracks;ctx.save();ctx.beginPath();ctx.rect(left,top,right-left,bottom-top);ctx.clip();ctx.strokeStyle='rgba(52,48,34,.8)';ctx.lineWidth=3;
  const shift=phase*stride%18;for(let x=left-18-shift;x<right+18;x+=18){ctx.beginPath();ctx.moveTo(x,bottom-3);ctx.lineTo(x+6,bottom-10);ctx.stroke();}ctx.restore();
 }
}
