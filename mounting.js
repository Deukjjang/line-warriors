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
  const embed=.16;
  const height=Math.min(fort.width*.29*aspect,Math.max(1,(surfaceY-56*dpr)/(1-embed)));
  const width=height/aspect;
  const x=fort.centres[team]+(team?-1:1)*fort.width*p.offset;
  return {x,y:surfaceY+height*embed,width,height,surfaceY,coverY:surfaceY+height*.025,dpr};
}

export function weaponParts(fit,team,attack,era){
  const p=MOUNT_PROFILES[era],dir=team?-1:1;
  const recoil=attack>0?Math.sin(Math.PI*Math.max(0,Math.min(1,(.35-attack)/.35)))*Math.min(fit.width*.028,3*fit.dpr):0;
  const head={x:fit.x-dir*recoil,y:fit.y-fit.height*(1-p.split),width:fit.width,height:fit.height*p.split,angle:0};
  return {base:{x:fit.x,y:fit.y,width:fit.width,height:fit.height*(1-p.split+.04),angle:0},head,
    muzzle:{x:head.x+dir*(p.muzzle[0]-.5)*fit.width,y:fit.y-(1-p.muzzle[1])*fit.height}};
}

export class FortressMounts{
  constructor(scene){
    this.scene=scene;this.states=[];
    this.contact=scene.add.graphics().setDepth(2.1);
    this.fasteners=scene.add.graphics().setDepth(2.35);
    this.actors=[0,1].map(()=>({
      base:scene.add.image(0,0,'wood-sling').setOrigin(.5,1).setDepth(2.15),
      head:scene.add.image(0,0,'wood-sling').setOrigin(.5,1).setDepth(2.2),
      wall:scene.add.image(0,0,'base-prehistoric').setOrigin(.5,1).setDepth(2.3)
    }));
  }
  frames(key,era){
    const t=this.scene.textures.get(key),s=t.getSourceImage(),p=MOUNT_PROFILES[era];
    if(!t.has('installed-head')){
      const split=Math.round(s.height*p.split),cut=Math.round(s.height*(p.split-.04));
      t.add('installed-head',0,0,0,s.width,split);
      t.add('installed-base',0,0,cut,s.width,s.height-cut);
    }
  }
  render({fort,ground,dpr,era,baseKey,bases,turrets}){
    this.contact.clear();this.fasteners.clear();this.states=[];
    const p=MOUNT_PROFILES[era],source=this.scene.textures.get(baseKey).getSourceImage();
    for(let team=0;team<2;team++){
      const a=this.actors[team],t=turrets[team];
      for(const image of Object.values(a))image.setVisible(!!t);
      if(!t){this.states.push({visible:false});continue;}
      this.frames(t.id,era);const s=this.scene.textures.get(t.id).getSourceImage();
      const fit=installedMount(fort,ground,dpr,s.height/s.width,team,era),parts=weaponParts(fit,team,t.attack,era);
      for(const key of ['base','head']){
        const v=parts[key],img=a[key];img.setTexture(t.id,'installed-'+key).setPosition(v.x,v.y).setDisplaySize(v.width,v.height).setFlipX(team===1).setAngle(0);
        if(team)img.setTint(0xffc6b4);else img.clearTint();
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
      this.states.push({...fit,visible:true,base:parts.base,head:parts.head,muzzle:parts.muzzle,occlusion:true});
    }
  }
  origin(team){return this.states[team]?.muzzle;}
  snapshot(){return this.states.map((s,team)=>{
    if(!s.visible)return {visible:false};const a=this.actors[team];
    const pose=img=>({x:img.x,y:img.y,width:img.displayWidth,height:img.displayHeight,angle:img.angle});
    return {...structuredClone(s),base:pose(a.base),head:pose(a.head),layers:{headFrame:a.head.frame.name,baseFrame:a.base.frame.name,headPixels:a.head.frame.height,basePixels:a.base.frame.height,wallCropped:a.wall.isCropped,wallFlip:a.wall.flipX,weaponFlip:a.head.flipX}};
  });}
}
