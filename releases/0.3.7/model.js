import {UNITS,SKILLS,WEAPONS,WORLD,stageData} from './data.js';
export {UNITS,SKILLS,UPGRADES} from './data.js';
export {freshSave,validateSave} from './save.js';
export {upgradeCost,buyUpgrade} from './shop.js';
export function settle(p,b){
  if(b.settled||!b.outcome)return 0;b.settled=true;
  const full=65+b.stage*16;let reward=0;
  if(b.outcome==='win'){reward=p.cleared.includes(b.stage)?Math.floor(full*.35):full;if(!p.cleared.includes(b.stage))p.cleared.push(b.stage);p.unlocked=Math.max(p.unlocked,Math.min(50,b.stage+1));p.records.wins=Math.min(100000000,p.records.wins+1);if(b.time<=86400){const old=p.records.bestTimes[b.stage];p.records.bestTimes[b.stage]=old===undefined?b.time:Math.min(old,b.time);}}
  else if(b.outcome==='loss'){reward=Math.min(Math.floor(full*.25),Math.floor(b.kills*1.5+(1-b.base[1]/b.baseMax[1])*full*.15));p.records.losses=Math.min(100000000,p.records.losses+1);}
  if(b.outcome!=='quit'){p.records.kills=Math.min(100000000,p.records.kills+b.kills);p.records.bossKills=Math.min(100000000,p.records.bossKills+b.bossKills);}
  p.coins=Math.min(10000000,p.coins+reward);return reward;
}
export class Battle{
  constructor(stage,progress,random=Math.random){
    this.data=stageData(stage);this.era=this.data.era;this.roster=this.data.roster;this.stage=stage;this.random=random;this.time=0;
    this.food=this.era.startFood+progress.upgrades[3]*10;this.cap=this.era.cap;this.income=this.era.income+progress.upgrades[0]*.6;this.attackBonus=1+progress.upgrades[2]*.05;
    this.baseMax=[Math.round(this.era.baseHp*(1+progress.upgrades[1]*.1)),this.data.enemyBase];this.base=[...this.baseMax];
    this.units=[];this.nextId=1;this.cd=[0,0,0];this.skillCd=[0,0,0];this.skillIds=[...progress.equippedSkills];this.trophy=15;this.enemyFood=15;this.enemyTimer=3;this.rush=0;this.shield=0;this.kills=0;this.bossKills=0;this.events=[];this.bossSpawned=false;this.outcome=null;this.settled=false;this.projectiles=[];this.pending=[];this.paused=false;this.usedItems=new Set();
    this.enemyFood=this.era.startFood+10;this.enemyPlan=0;
    const w=progress.weapons[this.era.index];this.turrets=[w.equipped?{...WEAPONS[this.era.index],damage:WEAPONS[this.era.index].damage*(1+w.level*.15),level:w.level,cd:.5,attack:0}:null,this.data.enemyWeapon?{...WEAPONS[this.era.index],damage:WEAPONS[this.era.index].damage*.65,level:0,cd:1,attack:0}:null];
  }
  add(kind,team){
    if(typeof kind==='string')kind=UNITS.findIndex(u=>u.id===kind);const d=UNITS[kind];if(!d)throw new Error('Invalid unit');const scale=team===1&&!d.boss?this.data.enemyScale:1;
    const u={id:this.nextId++,kind,team,x:team?WORLD.bases[1]-15:WORLD.bases[0]+15,hp:d.hp*scale,maxHp:d.hp*scale,damage:d.damage*(team?scale:this.attackBonus),cooldown:.2,windup:0,pattern:6+this.random()*3,attackFlash:0,attack:null,hurt:0,bossShield:0};this.units.push(u);this.events.push({type:'spawn',x:u.x,kind,team,id:u.id});return u;
  }
  count(team){return this.units.filter(u=>u.team===team&&u.hp>0).length;}
  spawn(slot){if(this.paused||this.outcome||!Number.isInteger(slot)||slot<0||slot>2||this.cd[slot]>0||this.food<UNITS[this.roster[slot]].cost||this.count(0)>=WORLD.armyLimit)return false;const kind=this.roster[slot],d=UNITS[kind];this.food-=d.cost;this.cd[slot]=d.cd;this.add(kind,0);return true;}
  useItem(id,p){
    if(this.paused||this.outcome||this.usedItems.has(id)||!p.inventory[id])return false;
    if(id==='food'){if(this.food>=this.cap)return false;this.food=Math.min(this.cap,this.food+60);}
    else if(id==='repair'){if(this.base[0]>=this.baseMax[0])return false;this.base[0]=Math.min(this.baseMax[0],this.base[0]+this.baseMax[0]*.2);this.events.push({type:'repair',x:WORLD.bases[0]});}
    else if(id==='horn'){if(this.count(0)===0||this.rush>=6)return false;this.rush=Math.max(this.rush,6);this.events.push({type:'rush'});}else return false;
    p.inventory[id]--;this.usedItems.add(id);return true;
  }
  skill(slot){
    if(!Number.isInteger(slot)||slot<0||slot>2)return false;
    const s=SKILLS.find(s=>s.id===this.skillIds[slot]);if(this.paused||this.outcome||!s||this.skillCd[slot]>0||this.trophy<s.cost)return false;
    if(s.id==='repair'&&this.base[0]>=this.baseMax[0]||s.id==='reinforce'&&this.count(0)>15)return false;
    this.trophy-=s.cost;this.skillCd[slot]=s.cd;const enemies=this.units.filter(u=>u.team===1&&u.hp>0),x=enemies.length?Math.min(...enemies.map(u=>u.x)):WORLD.bases[1];
    if(s.id==='meteor'){this.pending.push({remaining:.65,type:'meteor-impact',x,damage:(105+this.era.index*65)*this.attackBonus});this.events.push({type:'meteor',x,flight:.65});}
    if(s.id==='rush'){this.rush=8;this.events.push({type:'rush'});}
    if(s.id==='repair'){this.base[0]=Math.min(this.baseMax[0],this.base[0]+this.baseMax[0]*.25);this.events.push({type:'repair',x:WORLD.bases[0]});}
    if(s.id==='shield'){this.shield=8;this.events.push({type:'shield'});}
    if(s.id==='reinforce'){for(let i=0;i<3;i++)this.add(this.roster[0],0);this.events.push({type:'reinforce',x:WORLD.bases[0]+35});}
    if(s.id==='bombardment'){for(let i=0;i<3;i++)this.pending.push({remaining:.7+i*.45,type:'bombard-impact',x:Math.min(590,x+i*35),damage:(90+this.era.index*45)*this.attackBonus});this.events.push({type:'bombardment',x});}return true;
  }
  hurt(target,damage,ignoreArmor=false){const d=UNITS[target.kind],reduction=ignoreArmor?0:Math.min(.6,d.armor+(target.bossShield>0?.2:0));target.hp-=Math.max(1,damage*(1-reduction)*(target.team===0&&this.shield>0?.6:1));target.hurt=.16;}
  impact(strike){
    const target=strike.targetId===null?null:this.units.find(v=>v.id===strike.targetId&&v.hp>0);if(strike.targetId!==null&&!target)return;
    const d=strike.weapon?WEAPONS.find(w=>w.id===strike.weapon):UNITS[strike.kind];
    if(target){const candidates=this.units.filter(v=>v.team!==strike.team&&v.hp>0&&v.id!==target.id&&Math.abs(v.x-target.x)<(d.pierce?85:65)).sort((a,b)=>Math.abs(a.x-target.x)-Math.abs(b.x-target.x));const victims=[target,...candidates.slice(0,Math.max(0,(d.splash||d.pierce||1)-1))];for(const v of victims){const defender=UNITS[v.kind],counter=!strike.weapon&&!d.boss&&!defender.boss?({frontline:{support:1.4},support:{heavy:1.4},heavy:{frontline:1.25}}[d.formationRole]?.[defender.formationRole]??1):1;this.hurt(v,strike.damage*counter*(defender.boss?.75:1)*(v===target?1:.65),d.ignoreArmor);}}
    else this.base[1-strike.team]-=strike.damage*(strike.team===1&&this.shield>0?.6:1);this.events.push({...strike,type:'impact',x:target?target.x:strike.to});
  }
  launch(strike,d){strike={...strike,projectile:d.projectile};if(d.projectile){const flight=Math.max(.08,Math.abs(strike.to-strike.x)/(d.projectile==='stone'?780:d.projectile==='shell'?520:1300));this.projectiles.push({...strike,remaining:flight});this.events.push({...strike,type:'shot',flight,emittedAt:this.time});}else this.impact(strike);}
  step(dt){
    if(this.outcome||this.paused)return;dt=Math.min(Math.max(dt,0),.1);this.time+=dt;this.food=Math.min(this.cap,this.food+this.income*dt);this.trophy=Math.min(120,this.trophy+.7*dt);this.rush=Math.max(0,this.rush-dt);this.shield=Math.max(0,this.shield-dt);this.cd=this.cd.map(v=>Math.max(0,v-dt));this.skillCd=this.skillCd.map(v=>Math.max(0,v-dt));
    for(const p of this.projectiles){p.remaining-=dt;if(p.remaining<=0)this.impact(p);}this.projectiles=this.projectiles.filter(p=>p.remaining>0);
    for(const p of this.pending){p.remaining-=dt;if(p.remaining<=0){const victims=this.units.filter(u=>u.team===1&&u.hp>0&&Math.abs(u.x-p.x)<105).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x)).slice(0,6);for(const u of victims)this.hurt(u,p.damage*(UNITS[u.kind].boss?.75:1));if(Math.abs(WORLD.bases[1]-p.x)<100)this.base[1]-=p.damage*.4;this.events.push({...p,type:p.type});}}this.pending=this.pending.filter(p=>p.remaining>0);
    if(this.data.boss!==null&&!this.bossSpawned&&this.time>=20){this.add(this.data.boss,1);this.bossSpawned=true;}
    this.enemyFood=Math.min(this.cap,this.enemyFood+this.data.enemyIncome*dt);this.enemyTimer-=dt;
    if(this.enemyTimer<=0){
      const wave=this.data.enemyWave,active=this.time%wave.period<wave.active;
      const slot=this.data.enemyPattern[this.enemyPlan%this.data.enemyPattern.length],kind=this.roster[slot];
      if(active&&this.enemyFood>=UNITS[kind].cost&&this.count(1)<WORLD.armyLimit){this.enemyFood-=UNITS[kind].cost;this.add(kind,1);this.enemyPlan++;this.enemyTimer=wave.interval;}
      else this.enemyTimer=.2;
    }
    for(const [team,t] of this.turrets.entries()){
      if(!t)continue;t.cd-=dt;t.attack=Math.max(0,t.attack-dt);
      const target=this.units.filter(u=>u.team!==team&&u.hp>0&&Math.abs(u.x-WORLD.bases[team])<=t.range).sort((a,b)=>Math.abs(a.x-WORLD.bases[team])-Math.abs(b.x-WORLD.bases[team]))[0];
      const cycle=t.sling??t.weaponCycle;
      if(cycle){
        cycle.elapsed+=dt;
        const rounds=t.burst??1;
        while((cycle.rounds??0)<rounds&&cycle.elapsed>=cycle.releaseAt+(cycle.rounds??0)*.06){
          cycle.rounds=(cycle.rounds??0)+1;cycle.released=true;t.attack=.35;
          this.events.push({type:'turret-attack',x:WORLD.bases[team],to:cycle.strike.to,weapon:t.id,team,emittedAt:this.time});
          this.launch({...cycle.strike,damage:cycle.strike.damage/rounds},t);
        }
        if(cycle.elapsed>=cycle.total){if(t.id==='wood-sling')t.sling=null;else t.weaponCycle=null;}
      }
      if(target&&t.cd<=0&&!t.sling&&!t.weaponCycle){
        t.cd=1/t.rate;
        const strike={id:'turret-'+team,weapon:t.id,x:WORLD.bases[team],to:target.x,targetId:target.id,damage:t.damage,team};
        t.aimX=target.x;const preparation={elapsed:0,releaseAt:t.prepare,total:t.prepare+t.recovery,released:false,rounds:0,strike};
        if(t.id==='wood-sling')t.sling=preparation;else t.weaponCycle=preparation;
      }
    }
    for(const u of this.units){
      if(u.hp<=0)continue;u.moving=false;const d=UNITS[u.kind],direction=u.team?-1:1,boost=u.team===0&&this.rush>0?1.6:1;u.attackFlash=Math.max(0,u.attackFlash-dt);u.hurt=Math.max(0,u.hurt-dt);u.bossShield=Math.max(0,u.bossShield-dt);u.cooldown-=dt*boost;
      if(u.attack){const a=u.attack;a.elapsed+=dt*boost;if(!a.released&&a.elapsed>=d.windup){a.released=true;u.attackFlash=.16;this.launch({id:u.id,kind:u.kind,x:u.x,to:a.to,targetId:a.targetId,damage:u.damage,team:u.team},d);}if(a.elapsed>=d.windup+d.recovery)u.attack=null;continue;}
      const enemies=this.units.filter(v=>v.team!==u.team&&v.hp>0);let target=enemies.sort((a,b)=>Math.abs(a.x-u.x)-Math.abs(b.x-u.x))[0];const baseX=WORLD.bases[1-u.team];if(!target||Math.abs(baseX-u.x)<Math.abs(target.x-u.x))target=null;const tx=target?target.x:baseX,reach=d.range+d.radius+(target?UNITS[target.kind].radius:30),inRange=Math.abs(tx-u.x)<=reach;
      if(d.boss){u.pattern-=dt;if(u.windup>0){u.windup-=dt;if(u.windup<=0){if(d.pattern==='charge')u.x=Math.max(WORLD.bases[0]+20,u.x-35);if(d.pattern==='shield')u.bossShield=4;const centre=['bombard','beam'].includes(d.pattern)?u.patternX:u.x;const victims=enemies.filter(v=>Math.abs(v.x-centre)<105).sort((a,b)=>Math.abs(a.x-centre)-Math.abs(b.x-centre)).slice(0,4);for(const v of victims)this.hurt(v,u.damage*1.5);if(Math.abs(WORLD.bases[0]-centre)<105)this.base[0]-=u.damage*(d.pattern==='siege'?2:1.5);this.events.push({type:'slam',id:u.id,kind:u.kind,x:centre,team:u.team,pattern:d.pattern});u.pattern=9;}continue;}if(u.pattern<=0&&Math.abs(tx-u.x)<Math.max(180,d.range+40)){u.windup=1.4;u.patternX=tx;this.events.push({type:'warning',x:['bombard','beam'].includes(d.pattern)?tx:u.x,kind:u.kind});continue;}}
      if(!inRange){const oldX=u.x,cover=d.formationRole==='support'&&!d.boss&&this.units.some(v=>v.team===u.team&&v.hp>0&&!UNITS[v.kind].boss&&UNITS[v.kind].formationRole!=='support'&&(v.x-u.x)*direction>0&&(v.x-u.x)*direction<36);if(!cover)u.x=Math.max(WORLD.bases[0],Math.min(WORLD.bases[1],u.x+direction*d.speed*boost*dt));const distance=Math.abs(u.x-oldX);u.moving=distance>0;u.walkDistance=(u.walkDistance??0)+distance;}else if(u.cooldown<=0){u.cooldown=1/d.rate;u.attack={elapsed:0,released:false,targetId:target?target.id:null,to:tx};this.events.push({type:'attack',id:u.id,kind:u.kind,x:u.x,to:tx,team:u.team});}
    }
    for(const u of this.units)if(u.hp<=0){if(u.team===1){this.kills++;if(UNITS[u.kind].boss)this.bossKills++;this.trophy=Math.min(120,this.trophy+(UNITS[u.kind].boss?25:6));}this.events.push({type:'death',x:u.x,team:u.team,kind:u.kind});}this.units=this.units.filter(u=>u.hp>0);this.base=this.base.map(v=>Math.max(0,v));if(this.base[0]<=0)this.outcome='loss';else if(this.base[1]<=0)this.outcome='win';
  }
}
