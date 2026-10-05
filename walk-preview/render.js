import {upperPoint} from './gait.js';

const PARTS={
 body:{rect:[15,10,590,640],anchor:[315,560]},
 nearUpper:{rect:[700,120,265,490],a:[794,208],b:[829,531],width:1.5},
 nearLower:{rect:[235,680,185,285],a:[338,755],b:[335,963],width:1.05,clip:[[260,690],[412,690],[412,867],[371,963],[283,963],[252,880]]},
 nearFoot:{rect:[246,943,248,98],anchor:[335,978],scale:[.14,8.1/58]},
 farUpper:{rect:[709,681,230,371],a:[793,762],b:[814,994],width:1.2},
 farLower:{rect:[220,1100,190,317],a:[317,1182],b:[331,1400],width:1.02,clip:[[238,1110],[392,1110],[388,1310],[356,1400],[289,1400],[238,1325]]},
 farFoot:{rect:[224,1383,270,99],anchor:[332,1420],scale:[.13,.15]},
 joint:{rect:[721,1242,145,154],anchor:[793.5,1319]}
};

function piece(ctx,image,part,scaleX,scaleY){
 const [x,y,w,h]=part.rect,[ax,ay]=part.anchor;
 ctx.scale(scaleX,scaleY);ctx.drawImage(image,x,y,w,h,x-ax,y-ay,w,h);
}

function segment(ctx,image,part,a,b){
 const [sx,sy]=part.a,[ex,ey]=part.b,sourceAngle=Math.atan2(ey-sy,ex-sx);
 const targetAngle=Math.atan2(b.y-a.y,b.x-a.x),scale=Math.hypot(b.x-a.x,b.y-a.y)/Math.hypot(ex-sx,ey-sy);
 const [x,y,w,h]=part.rect;
 ctx.save();ctx.translate(a.x,a.y);ctx.rotate(targetAngle-Math.PI/2);ctx.scale(scale*part.width,scale);ctx.rotate(Math.PI/2-sourceAngle);
 // The lower-leg source includes a foot; retain only the shin when using the separate foot layer.
 if(part.clip){ctx.beginPath();part.clip.forEach(([x,y],i)=>i?ctx.lineTo(x-sx,y-sy):ctx.moveTo(x-sx,y-sy));ctx.closePath();ctx.clip();}
 ctx.drawImage(image,x,y,w,h,x-sx,y-sy,w,h);ctx.restore();
}

function leg(ctx,image,pose,far){
 const foot=PARTS[far?'farFoot':'nearFoot'];
 ctx.save();ctx.translate(pose.ankle.x,pose.ankle.y);ctx.rotate(pose.angle);piece(ctx,image,foot,...foot.scale);ctx.restore();
 segment(ctx,image,PARTS[far?'farUpper':'nearUpper'],pose.hip,pose.knee);
 segment(ctx,image,PARTS[far?'farLower':'nearLower'],pose.knee,pose.ankle);
 ctx.save();ctx.translate(pose.knee.x,pose.knee.y);if(far)ctx.filter='brightness(.84)';piece(ctx,image,PARTS.joint,.16,.16);ctx.restore();
}

const BODY_GRID=Array.from({length:13},(_,row)=>Array.from({length:11},(_,col)=>({x:15+590*col/10,y:10+640*row/12})));

function triangle(ctx,image,source,target){
 const [a,b,c]=source,[p,q,r]=target;
 const ux=b.x-a.x,uy=b.y-a.y,vx=c.x-a.x,vy=c.y-a.y,det=ux*vy-uy*vx;
 const ax=((q.x-p.x)*vy-(r.x-p.x)*uy)/det,bx=((r.x-p.x)*ux-(q.x-p.x)*vx)/det;
 const ay=((q.y-p.y)*vy-(r.y-p.y)*uy)/det,by=((r.y-p.y)*ux-(q.y-p.y)*vx)/det;
 const cx=(p.x+q.x+r.x)/3,cy=(p.y+q.y+r.y)/3;
 const area=Math.abs((q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x))/2;
 const inset=Math.min(...target.map((v,i)=>2*area/(3*Math.hypot(v.x-target[(i+1)%3].x,v.y-target[(i+1)%3].y))));
 const expansion=1+3/inset;
 ctx.save();ctx.beginPath();
 target.forEach((v,i)=>{
  // Subpixel overlap avoids hairline gaps between adjacent painted triangles.
  const x=cx+(v.x-cx)*expansion,y=cy+(v.y-cy)*expansion;
  if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);
 });
 ctx.closePath();ctx.clip();ctx.transform(ax,ay,bx,by,p.x-ax*a.x-bx*a.y,p.y-ay*a.x-by*a.y);
 const [x,y,w,h]=PARTS.body.rect;ctx.drawImage(image,x,y,w,h,x,y,w,h);ctx.restore();
}

function upperBody(ctx,image,pose){
 const points=BODY_GRID.map(row=>row.map(v=>upperPoint(v.x,v.y,pose.upper)));
 ctx.save();ctx.translate(pose.hip.x,pose.hip.y);ctx.rotate(pose.lean);ctx.scale(.275,.275);ctx.translate(-315,-560);
 for(let y=0;y<12;y++)for(let x=0;x<10;x++){
  const s=BODY_GRID,t=points;
  triangle(ctx,image,[s[y][x],s[y][x+1],s[y+1][x]],[t[y][x],t[y][x+1],t[y+1][x]]);
  triangle(ctx,image,[s[y][x+1],s[y+1][x+1],s[y+1][x]],[t[y][x+1],t[y+1][x+1],t[y+1][x]]);
 }
 ctx.restore();
}

export function renderWalker(ctx,image,pose,{x,y,scale=1,direction=1}={}){
 ctx.save();ctx.translate(x,y);ctx.scale(scale*direction,scale);
 leg(ctx,image,pose.legs[1],true);leg(ctx,image,pose.legs[0],false);
 upperBody(ctx,image,pose);
 ctx.restore();
}
