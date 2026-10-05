export const STRIDE=88;
export const STANCE=.62;
const wrap=x=>((x%1)+1)%1;

function foot(distance,offset){
 const phase=wrap(distance/STRIDE+offset),half=STRIDE*STANCE/2;
 if(phase<STANCE)return {phase,planted:true,sole:{x:half-STRIDE*phase,y:0},angle:0};
 const s=(phase-STANCE)/(1-STANCE),ease=s*s*(3-2*s);
 // Match the stance velocity at both ends of the swing, avoiding a foot snap.
 const x=-half+2*half*ease-STRIDE*(1-STANCE)*(2*s*s*s-3*s*s+s);
 return {phase,planted:false,sole:{x,y:-10*Math.sin(Math.PI*s)**2},angle:.12*Math.sin(2*Math.PI*s)};
}

function knee(hip,ankle){
 const upper=40,lower=39,dx=ankle.x-hip.x,dy=ankle.y-hip.y,d=Math.hypot(dx,dy);
 const along=(upper*upper-lower*lower+d*d)/(2*d),bend=Math.sqrt(Math.max(0,upper*upper-along*along));
 return {x:hip.x+dx/d*along+dy/d*bend,y:hip.y+dy/d*along-dx/d*bend};
}

export function walkPose(distance){
 const phase=wrap(distance/STRIDE),hip={x:0,y:-77+1.2*Math.cos(4*Math.PI*phase)};
 const legs=[0,.5].map((offset,i)=>{
  const f=foot(distance,offset),h={x:i===0?8:-8,y:hip.y},ankle={x:f.sole.x,y:f.sole.y-8.1};
  return {...f,hip:h,ankle,knee:knee(h,ankle)};
 });
 return {phase,hip,legs,lean:.006*Math.sin(2*Math.PI*phase)};
}
