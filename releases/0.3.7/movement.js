export function fortressLayout(width,height,dpr,aspect,mobile=width/dpr<=960){
  const size=Math.min(width*.52,440*dpr,height*.72/aspect)*(mobile?.88:1);
  return {width:size,height:size*aspect,centres:[0,width],mounts:[size*.27,width-size*.27]};
}

export function mountLayout(fort,ground,fieldHeight,dpr,aspect,team){
  const width=Math.min(fort.width*.42,fieldHeight*.32/aspect),height=width*aspect;
  return {x:fort.mounts[team],y:Math.max(ground-fort.height*.68,56*dpr+height),width,height};
}

export const TRAVEL_FRAMES=8;
export const TRAVEL_FRAME={width:384,height:256};

export function unitPose(data,unit,{stride=data.height/66*32,time}={}){
  const phase=unit.attack?(unit.attack.elapsed<data.windup?1:unit.attack.elapsed<data.windup+.1?2:3):0;
  if(data.air)return {texture:data.key+'-flight',frame:Math.floor(typeof time==='number'?time*12:(unit.walkDistance??0)/stride*TRAVEL_FRAMES+1e-9)%TRAVEL_FRAMES,phase};
  if(unit.attack)return {texture:data.boss?data.key:data.key+'-attack',frame:phase,phase};
  if(unit.moving)return {texture:data.key+(data.air?'-flight':'-walk'),frame:Math.floor((unit.walkDistance??0)/stride*TRAVEL_FRAMES+1e-9)%TRAVEL_FRAMES,phase:0};
  return {texture:data.boss?data.key:data.key+'-attack',frame:0,phase:0};
}
