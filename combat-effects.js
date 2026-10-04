export class CombatEffects{
  constructor(scene){this.scene=scene;this.graphics=scene.add.graphics().setDepth(7);this.active=[];}
  clear(){this.active=[];this.graphics.clear();}
  emit(e,time,layout){
    if(e.type==='shot'&&e.weapon&&layout){
      const muzzle=layout.weaponOrigin?.(e.team);
      // Store world-space launch coordinates so recoil and later resize cannot drag a fired shot.
      if(muzzle)e={...e,weaponStart:{x:(muzzle.x-layout.project(0))/(layout.project(1)-layout.project(0)),elevation:(layout.ground-muzzle.y)/layout.unitScale}};
    }
    const life=e.type==='shot'?e.flight:e.type==='meteor'?.65:e.type==='warning'?1.4:e.type==='bombardment'?1.8:e.type==='repair'||e.type==='shield'||e.type==='rush'?1.1:.6;
    if(['shot','impact','death','meteor','meteor-impact','bombard-impact','slam','warning','repair','shield','rush','reinforce','bombardment','turret-attack'].includes(e.type)){this.active.push({...e,born:time,life});if(this.active.length>140)this.active.splice(0,this.active.length-140);}
  }
  render(time,{project,ground,unitScale,dpr,unitHeight,weaponOrigin}){
    const g=this.graphics;g.clear();this.active=this.active.filter(e=>time-e.born<e.life);
    for(const e of this.active){const age=Math.max(0,time-e.born),t=Math.min(1,age/e.life),fade=1-t,x=project(e.x??320),y=ground-34*unitScale;
      if(e.type==='shot'){
        const dir=e.team?-1:1,sourceHeight=e.weapon?65*unitScale:unitHeight(e.kind)*.6;
        const muzzle=e.weapon?weaponOrigin?.(e.team):null;
        const sx=e.weaponStart?project(e.weaponStart.x):muzzle?.x??x+dir*18*unitScale,sy=e.weaponStart?ground-e.weaponStart.elevation*unitScale:muzzle?.y??ground-sourceHeight,end=project(e.to),ey=ground-36*unitScale;
        const arc=['shell','rock','missile','drone'].includes(e.projectile)?Math.sin(t*Math.PI)*28*unitScale:Math.sin(t*Math.PI)*3*unitScale;
        const px=sx+(end-sx)*t,py=sy+(ey-sy)*t-arc;
        const color=e.projectile==='laser'?0x7ffcff:e.projectile==='plasma'?0xffa237:e.projectile==='arrow'?0xd9c3a3:0xffd484;
        if(e.projectile==='stone'){g.lineStyle(2*dpr,0xe8e8d6,.4);g.lineBetween(px-dir*12*dpr,py,px,py);g.fillStyle(0xaeb6ab,1);g.fillCircle(px,py,3.2*dpr);g.lineStyle(dpr,0x474c40,1);g.strokeCircle(px,py,3.2*dpr);}
        else{g.lineStyle((e.projectile==='laser'?4:2)*dpr,color,.85);g.lineBetween(px-dir*18*dpr,py+2*dpr,px,py);g.lineStyle(dpr,0xffffff,1);g.lineBetween(px-dir*8*dpr,py,px,py);if(['shell','plasma','missile'].includes(e.projectile)){g.fillStyle(color,1);g.fillCircle(px,py,4*dpr);}}
        continue;
      }
      if(e.type==='turret-attack'){
        const muzzle=weaponOrigin?.(e.team);if(!muzzle)continue;
        const color=e.weapon==='laser-turret'?0x7ffcff:0xffd484;
        g.fillStyle(color,fade*.9);g.fillCircle(muzzle.x,muzzle.y,(4+3*t)*dpr*fade);
        g.lineStyle(dpr,0xfff2cd,fade);g.strokeCircle(muzzle.x,muzzle.y,(4+10*t)*dpr);continue;
      }
      if(e.type==='meteor'){
        const px=x-75*dpr*(1-t),py=-40*dpr+(ground+25*dpr)*t;
        for(let i=0;i<6;i++){g.fillStyle(i%2?0xffe28e:0xff7639,.75-i*.09);g.fillCircle(px-i*6*dpr,py-i*15*dpr,(14-i)*dpr);}
        g.fillStyle(0x5b392c,1);g.fillCircle(px,py,12*dpr);g.fillStyle(0xffcb63,1);g.fillCircle(px+3*dpr,py-2*dpr,7*dpr);continue;
      }
      if(e.type==='warning'||e.type==='bombardment'){
        g.lineStyle(2*dpr,e.type==='warning'?0xe7523e:0xe4a544,.65+Math.sin(age*20)*.2);g.strokeEllipse(x,ground,105*unitScale,22*unitScale);g.lineBetween(x-16*dpr,ground,x+16*dpr,ground);g.lineBetween(x,ground-10*dpr,x,ground+10*dpr);continue;
      }
      if(['repair','shield','rush','reinforce'].includes(e.type)){
        const color=e.type==='repair'?0x64df96:e.type==='shield'?0x81dbff:0xffdf70;
        const cx=e.type==='repair'?project(44):x;
        g.lineStyle(3*dpr,color,fade);g.strokeEllipse(cx,ground-25*unitScale,(65+45*t)*unitScale,(80+40*t)*unitScale);
        for(let i=0;i<12;i++){const a=i*Math.PI/6+age*2,rx=cx+Math.cos(a)*38*unitScale,ry=ground-10*unitScale-((age*80+i*13)%100)*unitScale;g.fillStyle(color,fade);g.fillRect(rx-2*dpr,ry-5*dpr,4*dpr,10*dpr);if(e.type==='repair')g.fillRect(rx-5*dpr,ry-2*dpr,10*dpr,4*dpr);}continue;
      }
      const big=['meteor-impact','bombard-impact','slam'].includes(e.type),heavy=big||['shell','plasma','missile'].includes(e.projectile)||e.kind===2||e.kind===4;
      const cy=big?ground-8*dpr:y,r=(big?70:heavy?28:15)*unitScale;
      const color=e.projectile==='laser'?0x7df6ff:e.type==='death'?0xb4ac92:0xffba4b;
      if(big){g.fillStyle(0xff9e3b,fade*.28);g.fillCircle(x,cy,r*t);g.lineStyle(3*dpr,0xffd280,fade);g.strokeEllipse(x,ground,r*2*(.3+t),r*.6*(.3+t));g.lineStyle(2*dpr,0xe97a39,fade*.7);g.strokeCircle(x,cy,r*.85*t);}
      g.fillStyle(color,fade*.8);g.fillCircle(x,cy,(heavy?12:7)*unitScale*fade);
      for(let i=0;i<(big?18:8);i++){const a=i*2.39996,travel=(.15+t)*r,px=x+Math.cos(a)*travel,py=cy+Math.sin(a)*travel-age*22*unitScale;g.lineStyle((i%3+1)*dpr,color,fade);g.lineBetween(px,py,px-Math.cos(a)*9*dpr*fade,py-Math.sin(a)*9*dpr*fade);}
      g.lineStyle(2*dpr,0xfff2c4,fade);g.strokeCircle(x,cy,(5+25*t)*unitScale);
    }
  }
}
