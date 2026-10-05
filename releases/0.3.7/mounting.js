// Anchors follow the roof surfaces in the existing fortress artwork.
export const MOUNT_PROFILES={
  prehistoric:{offset:.18,roof:.39,split:.73,muzzle:[.88,.22],metal:0x827363,bolt:0xe2b06c},
  medieval:{offset:.17,roof:.44,split:.72,muzzle:[.97,.335],metal:0x69737d,bolt:0xc6c9c6},
  gunpowder:{offset:.18,roof:.36,split:.66,muzzle:[.97,.19],metal:0x76654e,bolt:0xd5b15f},
  modern:{offset:.16,roof:.36,split:.65,muzzle:[.98,.29],metal:0x596351,bolt:0xc6c9bc},
  future:{offset:.17,roof:.37,split:.66,muzzle:[.96,.26],metal:0x727d86,bolt:0x5be6ed}
};

export function installedMount(fort,ground,dpr,aspect,team,era){
  const p=MOUNT_PROFILES[era],surfaceY=ground-fort.height*(1-p.roof);
  const embed=era==='prehistoric'?.23:.16;
  const height=Math.min(fort.width*.29*aspect,Math.max(1,(surfaceY-56*dpr)/(1-embed)));
  const width=height/aspect;
  const x=fort.centres[team]+(team?-1:1)*fort.width*p.offset;
  return {x,y:surfaceY+height*embed,width,height,surfaceY,coverY:surfaceY+height*.025,dpr};
}

export function weaponParts(fit,team,attack,era,cooldown=0,target,cycle){
  const p=MOUNT_PROFILES[era],dir=team?-1:1;
  const recoil=era==='prehistoric'&&cycle!==undefined?0:attack>0?Math.sin(Math.PI*Math.max(0,Math.min(1,(.35-attack)/.35)))*Math.min(fit.width*.028,3*fit.dpr):0;
  const head={x:fit.x-dir*recoil,y:fit.y-fit.height*(1-p.split),width:fit.width,height:fit.height*p.split,angle:0};
  const elapsed=.35-attack;
  const draw=attack>0?Math.cos(Math.PI*Math.min(1,elapsed/.12))*Math.exp(-elapsed*18):cooldown>0&&cooldown<.3?1-cooldown/.3:0;
  let sling=era==='prehistoric'?{
    pouch:{x:head.x-dir*fit.width*(.30+.16*draw),y:fit.y-fit.height*.48},
    forks:[{x:head.x+dir*fit.width*.12,y:fit.y-fit.height*.87},{x:head.x+dir*fit.width*.37,y:fit.y-fit.height*.85}],draw
  }:null;
  let muzzle={x:head.x+dir*(p.muzzle[0]-.5)*fit.width,y:fit.y-(1-p.muzzle[1])*fit.height};
  if(sling&&cycle!==undefined){
    muzzle={x:fit.x+dir*fit.width*.245,y:fit.y-fit.height*.86};
    const aim=target??{x:muzzle.x+dir*300,y:muzzle.y+80},dx=aim.x-muzzle.x,dy=aim.y-muzzle.y,length=Math.hypot(dx,dy)||1;
    const axis={x:dx/length,y:dy/length},elapsed=cycle?.elapsed??0;
    let pull=.12,phase='idle';
    if(cycle){
      if(elapsed<.22){const p=elapsed/.22;pull=.12+.30*p*p*(3-2*p);phase='draw';}
      else if(elapsed<.30){const p=(elapsed-.22)/.08;pull=.42*(1-p*p);phase='release';}
      else{const p=Math.min(1,(elapsed-.30)/.35);pull=.12*p+.025*Math.sin(p*Math.PI*6)*(1-p);phase='recover';}
    }
    sling={...sling,axis,phase,loaded:!!cycle&&elapsed<.30,draw:pull,
      pouch:{x:muzzle.x-axis.x*fit.width*pull,y:muzzle.y-axis.y*fit.width*pull},
      flutter:phase==='recover'?Math.sin((elapsed-.30)*55)*Math.exp(-(elapsed-.30)*10)*fit.width*.025:0};
  }
  let visual=null;
  if(era!=='prehistoric'&&cycle!==undefined){
    const releaseAt=cycle?.releaseAt??0,total=cycle?.total??1,elapsed=Math.max(0,cycle?.elapsed??0);
    const active=!!cycle&&elapsed<total,preparing=active&&elapsed<releaseAt;
    const progress=preparing?Math.min(1,elapsed/Math.max(.001,releaseAt)):0;
    const since=elapsed-releaseAt,recovery=active&&!preparing?Math.min(1,since/Math.max(.001,total-releaseAt)):0;
    // Rotate about the frame's existing bottom joint; transform the muzzle with that same pose.
    const joint={x:fit.x,y:fit.y-fit.height*(1-p.split)};
    const local={x:dir*(p.muzzle[0]-.5)*fit.width,y:(p.muzzle[1]-p.split)*fit.height};
    const aim=target??{x:joint.x+dir*300,y:joint.y+local.y};
    const dx=aim.x-joint.x,dy=aim.y-joint.y,distance=Math.hypot(dx,dy)||1;
    const angle=Math.atan2(dy,dx)-(team?Math.PI:0)-dir*Math.asin(Math.max(-1,Math.min(1,local.y/distance)));
    const cos=Math.cos(angle),sin=Math.sin(angle),axis={x:dir*cos,y:dir*sin};
    const pulse=(age,duration)=>age>=0&&age<duration?Math.sin(Math.PI*age/duration)*(1-age/duration):0;
    let kick=0,phase=preparing?(era==='future'?'charge':'draw'):active?'recover':'idle';
    if(active&&!preparing){
      if(era==='modern'){
        for(const offset of [0,.06,.12])kick+=pulse(since-offset,.05);
        if(since<.17)phase='burst';
      }else kick=pulse(since,era==='gunpowder'?.24:era==='medieval'?.10:.12);
      if(era==='medieval'&&since<.08)phase='release';
      if(era==='gunpowder'&&since<.12)phase='fire';
      if(era==='future')phase=since<.14?'beam':'afterglow';
    }
    const recoil=kick*Math.min(fit.width*(era==='gunpowder'?.15:era==='modern'?.04:.025),(era==='gunpowder'?14:4)*fit.dpr);
    head.x=joint.x-axis.x*recoil;head.y=joint.y-axis.y*recoil;head.angle=angle*180/Math.PI;
    const point=(x,y)=>({x:head.x+cos*x-sin*y,y:head.y+sin*x+cos*y});
    muzzle=point(local.x,local.y);
    const draw=era==='medieval'&&preparing?progress*progress*(3-2*progress):0;
    visual={phase,axis,recoil,draw,charge:era==='future'&&preparing?progress:0,recovery,
      afterglow:era==='future'&&active&&!preparing?1-recovery:0,
      loaded:era==='medieval'&&preparing,elapsed,releaseAt,total,released:!!cycle?.released,
      string:point(local.x-dir*fit.width*(.36+.34*draw),local.y),
      rail:[point(dir*fit.width*(.24-.5),local.y),point(dir*fit.width*(.83-.5),local.y)],
      limbs:[point(dir*fit.width*(.535-.5),fit.height*(.075-p.split)),point(dir*fit.width*(.68-.5),fit.height*(.60-p.split))]};
  }
  return {sling,visual,base:{x:fit.x,y:fit.y,width:fit.width,height:fit.height*(1-p.split+.04),angle:0},head,muzzle};
}

export class FortressMounts{
  constructor(scene){
    this.scene=scene;this.states=[];
    this.contact=scene.add.graphics().setDepth(2.1);
    this.fasteners=scene.add.graphics().setDepth(2.35);
    this.cords=scene.add.graphics().setDepth(2.25);
    this.stones=scene.add.graphics().setDepth(2.27);
    this.actors=[0,1].map(()=>({
      base:scene.add.image(0,0,'wood-sling').setOrigin(.5,1).setDepth(2.15),
      head:scene.add.image(0,0,'wood-sling').setOrigin(.5,1).setDepth(2.2),
      pouch:scene.add.image(0,0,'wood-sling').setOrigin(.5,.5).setDepth(2.26),
      wall:scene.add.image(0,0,'base-prehistoric').setOrigin(.5,1).setDepth(2.3)
    }));
    this.masks=this.actors.map(a=>{
      const head=scene.add.graphics().setVisible(false),pouch=scene.add.graphics().setVisible(false);
      return {head,pouch,headMask:head.createGeometryMask(),pouchMask:pouch.createGeometryMask()};
    });
  }
  frames(key,era){
    const t=this.scene.textures.get(key),s=t.getSourceImage(),p=MOUNT_PROFILES[era];
    if(!t.has('installed-head')){
      const split=Math.round(s.height*p.split),cut=Math.round(s.height*(p.split-.04));
      t.add('installed-head',0,0,0,s.width,split);
      t.add('installed-base',0,0,cut,s.width,s.height-cut);
      if(era==='prehistoric')t.add('installed-pouch',0,0,Math.round(s.height*.40),Math.round(s.width*.35),Math.round(s.height*.24));
    }
  }
  render({fort,ground,dpr,era,baseKey,bases,turrets,project,unitScale}){
    this.contact.clear();this.fasteners.clear();this.cords.clear();this.stones.clear();this.states=[];
    const p=MOUNT_PROFILES[era],source=this.scene.textures.get(baseKey).getSourceImage();
    for(let team=0;team<2;team++){
      const a=this.actors[team],t=turrets[team];
      for(const image of Object.values(a))image.setVisible(!!t);
      if(!t){this.states.push({visible:false});continue;}
      this.frames(t.id,era);const s=this.scene.textures.get(t.id).getSourceImage();
      const fit=installedMount(fort,ground,dpr,s.height/s.width,team,era);
      const aim=project&&t.aimX!==undefined?{x:project(t.aimX),y:ground-3*dpr-36*unitScale}:undefined;
      const parts=weaponParts(fit,team,t.attack,era,t.cd,aim,era==='prehistoric'?t.sling??null:t.weaponCycle??null);
      for(const key of ['base','head']){
        const v=parts[key],img=a[key];img.setTexture(t.id,'installed-'+key).setPosition(v.x,v.y).setDisplaySize(v.width,v.height).setFlipX(team===1).setAngle(v.angle);
        if(team)img.setTint(0xffc6b4);else img.clearTint();
      }
      if(parts.sling){
        a.head.setCrop();
        const {pouch,forks}=parts.sling,g=this.cords;
        a.pouch.setTexture(t.id,'installed-pouch').setPosition(pouch.x,pouch.y).setDisplaySize(fit.width*.35,fit.height*.24).setFlipX(team===1);
        if(team)a.pouch.setTint(0xffc6b4);else a.pouch.clearTint();
        // Clip only the frame and leather, leaving baked connecting ropes out of the animated pieces.
        const masks=this.masks[team],dir=team?-1:1;
        const polygon=(graphics,points,map)=>{graphics.clear().fillStyle(0xffffff,1);graphics.beginPath();points.forEach(([x,y],i)=>{const v=map(x,y);if(i)graphics.lineTo(v.x,v.y);else graphics.moveTo(v.x,v.y);});graphics.closePath();graphics.fillPath();};
        polygon(masks.head,[[.58,.01],[.72,0],[.76,.16],[.80,.32],[.83,.28],[.83,.01],[1,0],[1,.27],[.86,.48],[.71,.73],[.47,.73],[.56,.53],[.65,.36]],(x,y)=>({x:parts.head.x+dir*(x-.5)*fit.width,y:fit.y+(y-1)*fit.height}));
        polygon(masks.pouch,[[.01,.46],[.12,.49],[.22,.49],[.30,.46],[.30,.57],[.22,.63],[.13,.64],[.05,.58]],(x,y)=>({x:pouch.x+dir*(x-.175)*fit.width,y:pouch.y+(y-.52)*fit.height}));
        a.head.setMask(masks.headMask);a.pouch.setMask(masks.pouchMask);
        for(const f of forks){
          const mx=(f.x+pouch.x)/2,my=(f.y+pouch.y)/2+(parts.sling.flutter??0);
          for(const [width,color] of [[4,0x38251b],[2,0xd0ac74]]){g.lineStyle(width*dpr,color,1);g.beginPath();g.moveTo(f.x,f.y);g.lineTo(mx,my);g.lineTo(pouch.x,pouch.y);g.strokePath();}
        }
        if(parts.sling.loaded){this.stones.fillStyle(0x414b43,1);this.stones.fillCircle(pouch.x,pouch.y,fit.width*.054);this.stones.fillStyle(0xb5bfae,1);this.stones.fillCircle(pouch.x-dpr,pouch.y-dpr,fit.width*.039);}
      }else{
        a.head.setCrop().clearMask();a.pouch.setVisible(false).clearMask();
        const v=parts.visual,m=parts.muzzle,g=this.cords;
        if(era==='medieval'&&v){
          // Retain the painted mechanism, bow and pedestal, excluding the baked bolt and spanning ropes.
          const mask=this.masks[team],dir=team?-1:1,angle=parts.head.angle*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle);
          const polygons=[
            [[0,.19],[.15,.16],[.29,.24],[.29,.39],[.25,.54],[.15,.58],[0,.54]],
            [[.50,0],[.62,.01],[.73,.065],[.80,.13],[.85,.22],[.86,.29],[.79,.29],[.77,.23],[.73,.17],[.66,.12],[.58,.10],[.50,.10]],
            [[.77,.355],[.87,.355],[.87,.48],[.81,.58],[.72,.65],[.64,.67],[.62,.58],[.70,.55],[.76,.48]],
            [[.23,.36],[.80,.36],[.80,.47],[.48,.47],[.27,.39],[.23,.39]],
            [[.23,.48],[.33,.44],[.40,.49],[.51,.56],[.60,.61],[.60,.72],[.20,.72]]
          ];
          // Canvas clipping retains one path, so all retained regions must share that path.
          mask.head.clear().fillStyle(0xffffff,1).beginPath();
          for(const polygon of polygons){
            polygon.forEach(([x,y],i)=>{
              const lx=dir*(x-.5)*fit.width,ly=(y-p.split)*fit.height;
              const px=parts.head.x+cos*lx-sin*ly,py=parts.head.y+sin*lx+cos*ly;
              if(i)mask.head.lineTo(px,py);else mask.head.moveTo(px,py);
            });mask.head.closePath();
          }
          mask.head.fillPath();
          a.head.setMask(mask.headMask);
          const [railStart,railEnd]=v.rail;
          for(const [width,color] of [[fit.height*.052,0x392b21],[fit.height*.032,0xa5753d]]){
            g.lineStyle(Math.max(dpr,width),color,1);g.lineBetween(railStart.x,railStart.y,railEnd.x,railEnd.y);
          }
          for(const [width,color] of [[4,0x302a23],[2,0xd2c2a0]]){
            g.lineStyle(Math.min(width*dpr,fit.width*width*.009),color,1);g.beginPath();g.moveTo(v.limbs[0].x,v.limbs[0].y);g.lineTo(v.string.x,v.string.y);g.lineTo(v.limbs[1].x,v.limbs[1].y);g.strokePath();
          }
          if(v.loaded){
            const end={x:m.x-v.axis.x*fit.width*.035,y:m.y-v.axis.y*fit.width*.035};
            g.lineStyle(3*dpr,0x493e2d,1);g.lineBetween(v.string.x,v.string.y,end.x,end.y);
            g.lineStyle(dpr,0xe2d4ae,1);g.lineBetween(v.string.x,v.string.y,end.x,end.y);
            this.stones.fillStyle(0xc6c9c6,1);this.stones.fillTriangle(end.x,end.y,end.x-v.axis.x*6*dpr-v.axis.y*3*dpr,end.y-v.axis.y*6*dpr+v.axis.x*3*dpr,end.x-v.axis.x*6*dpr+v.axis.y*3*dpr,end.y-v.axis.y*6*dpr-v.axis.x*3*dpr);
          }
        }
        if(era==='future'&&v&&(v.charge>0||v.afterglow>0)){
          const glow=v.charge||v.afterglow*.5;
          this.stones.fillStyle(0x5be6ed,glow*.22);this.stones.fillCircle(m.x,m.y,(4+7*glow)*dpr);
          this.stones.lineStyle(2*dpr,0x5be6ed,glow*.9);this.stones.strokeCircle(m.x,m.y,(3+4*v.charge)*dpr);
          this.stones.fillStyle(0xdfffff,glow);this.stones.fillCircle(m.x,m.y,(1+2*glow)*dpr);
          for(const side of [-1,1]){
            const x=m.x-v.axis.x*fit.width*.16+side*v.axis.y*4*dpr,y=m.y-v.axis.y*fit.width*.16-side*v.axis.x*4*dpr;
            g.lineStyle(2*dpr,0x5be6ed,glow);g.lineBetween(x,y,x-v.axis.x*fit.width*.12,y-v.axis.y*fit.width*.12);
          }
        }
      }
      // Reuse the actual wall face in front of the mount foot, preserving its texture and perspective.
      const wall=bases[team],cropY=Math.round((fit.coverY-(ground-fort.height))/fort.height*source.height);
      a.wall.setTexture(baseKey).setPosition(wall.x,wall.y).setDisplaySize(fort.width,fort.height).setFlipX(team===1).setCrop(0,cropY,source.width,source.height-cropY);
      if(team)a.wall.setTint(0xffd1c5);else a.wall.clearTint();
      this.contact.fillStyle(0x211c18,.38);this.contact.fillEllipse(fit.x,fit.surfaceY+2*dpr,fit.width*.8,Math.max(3*dpr,fit.height*.06));
      const strapW=Math.min(5*dpr,fit.width*.065),strapH=Math.min(17*dpr,fit.height*.23);
      for(const side of [-1,1]){
        const x=fit.x+side*fit.width*.22-strapW/2,y=fit.surfaceY-strapH*.23;
        this.fasteners.fillStyle(p.metal,1);this.fasteners.lineStyle(dpr,0x2c2825,1);
        this.fasteners.fillRoundedRect(x,y,strapW,strapH,dpr);this.fasteners.strokeRoundedRect(x,y,strapW,strapH,dpr);
        this.fasteners.fillStyle(p.bolt,1);for(const v of [.2,.75])this.fasteners.fillCircle(x+strapW/2,y+strapH*v,Math.max(.65*dpr,strapW*.17));
      }
      this.states.push({...fit,visible:true,sling:parts.sling,visual:parts.visual,base:parts.base,head:parts.head,muzzle:parts.muzzle,occlusion:true});
    }
  }
  origin(team){return this.states[team]?.muzzle;}
  snapshot(){return this.states.map((s,team)=>{
    if(!s.visible)return {visible:false};const a=this.actors[team];
    const pose=img=>({x:img.x,y:img.y,width:img.displayWidth,height:img.displayHeight,angle:img.angle});
    return {...structuredClone(s),base:pose(a.base),head:pose(a.head),layers:{headFrame:a.head.frame.name,baseFrame:a.base.frame.name,headPixels:a.head.frame.height,basePixels:a.base.frame.height,wallCropped:a.wall.isCropped,wallFlip:a.wall.flipX,weaponFlip:a.head.flipX}};
  });}
}
