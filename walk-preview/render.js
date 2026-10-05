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

export function renderWalker(ctx,image,pose,{x,y,scale=1,direction=1}={}){
 ctx.save();ctx.translate(x,y);ctx.scale(scale*direction,scale);
 leg(ctx,image,pose.legs[1],true);leg(ctx,image,pose.legs[0],false);
 ctx.save();ctx.translate(pose.hip.x,pose.hip.y);ctx.rotate(pose.lean);piece(ctx,image,PARTS.body,.275,.275);ctx.restore();
 ctx.restore();
}
