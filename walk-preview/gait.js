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
 const beat=2*Math.PI*phase;
 return {phase,hip,legs,lean:.012*Math.sin(beat),upper:{
  torso:.028*Math.sin(beat),
  head:.025*Math.sin(beat-.65),
  grip:.045*Math.sin(beat-.4),
  lift:.8*Math.cos(2*beat-.35)
 }};
}

const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
function turn(x,y,cx,cy,angle){
 const c=Math.cos(angle),s=Math.sin(angle),dx=x-cx,dy=y-cy;
 return {x:cx+dx*c-dy*s,y:cy+dx*s+dy*c};
}

// Smooth skin weights keep the painted neck, shoulders and two-handed grip connected.
export function upperPoint(x,y,upper){
 const waist=1-smooth(475,560,y),head=smooth(305,375,x)*(1-smooth(335,420,y));
 const grip=(1-head)*(1-smooth(460,530,y));
 const t=turn(x,y,315,530,upper.torso),h=turn(x,y,400,345,upper.head),g=turn(x,y,300,420,upper.grip);
 return {x:x+waist*(t.x-x)+head*(h.x-x)+grip*(g.x-x),
  y:y+waist*(t.y-y)+head*(h.y-y)+grip*(g.y-y)+waist*upper.lift/.275};
}
