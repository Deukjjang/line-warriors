export const UNITS = [
  {name:'몽둥이병',role:'전선 유지',cost:15,hp:70,damage:10,range:25,radius:13,windup:0.18,recovery:0.26,rate:1.05,speed:38,cd:0.65,height:66,key:'club'},
  {name:'돌팔매병',role:'원거리 공격',cost:25,hp:44,damage:14,range:155,radius:12,windup:0.24,recovery:0.3,rate:0.8,speed:32,cd:1.1,height:64,key:'sling'},
  {name:'매머드',role:'탱커 · 엄니 공격',cost:60,hp:310,damage:22,range:38,radius:30,windup:0.32,recovery:0.38,rate:0.65,speed:24,cd:3.5,height:88,key:'mammoth'},
  {name:'우두머리 원시인',hp:620,damage:30,range:62,radius:22,windup:0.28,recovery:0.35,rate:0.7,speed:22,height:105,key:'chief',boss:true},
  {name:'거대 매머드',hp:1080,damage:40,range:70,radius:40,windup:0.35,recovery:0.4,rate:0.6,speed:19,height:125,key:'bossmammoth',boss:true}
];
export const SKILLS = [
  {name:'운석',cost:60,cd:18}, {name:'돌격',cost:35,cd:20}, {name:'수리',cost:50,cd:24}
];
export const UPGRADES = [
  {name:'고기 생산',detail:'초당 +0.6',cost:55},
  {name:'기지 체력',detail:'기본 체력 +10%',cost:55},
  {name:'유닛 공격력',detail:'기본 공격력 +5%',cost:65},
  {name:'시작 고기',detail:'+10',cost:45}
];
export function freshSave() { return {version:1,coins:0,unlocked:1,cleared:[],upgrades:[0,0,0,0],settings:{sound:true,music:false}}; }
export function validateSave(p) {
  const integer = (v,min,max) => Number.isInteger(v) && v>=min && v<=max;
  if (!p || typeof p!=='object' || p.version!==1 || !integer(p.coins,0,10000000) || !integer(p.unlocked,1,10)
    || !Array.isArray(p.upgrades) || p.upgrades.length!==4 || p.upgrades.some(v=>!integer(v,0,8))
    || !Array.isArray(p.cleared) || p.cleared.length>10 || p.cleared.some(v=>!integer(v,1,p.unlocked))
    || new Set(p.cleared).size!==p.cleared.length
    || !p.settings || typeof p.settings.sound!=='boolean' || typeof p.settings.music!=='boolean') throw new Error('올바른 라인워리어즈 저장 데이터가 아닙니다.');
  return {version:1,coins:p.coins,unlocked:p.unlocked,cleared:[...p.cleared],upgrades:[...p.upgrades],settings:{sound:p.settings.sound,music:p.settings.music}};
}
export function upgradeCost(p,i) { return Math.ceil(UPGRADES[i].cost*1.38**p.upgrades[i]); }
export function buyUpgrade(p,i) {
  if (!Number.isInteger(i) || i<0 || i>3 || p.upgrades[i]>=8 || p.coins<upgradeCost(p,i)) return false;
  p.coins-=upgradeCost(p,i);p.upgrades[i]++;return true;
}
export function settle(p,b) {
  if (b.settled || !b.outcome) return 0;
  b.settled=true;
  const full=65+b.stage*16;
  let reward=0;
  if(b.outcome==='win') {
    reward=p.cleared.includes(b.stage)?Math.floor(full*0.35):full;
    if(!p.cleared.includes(b.stage)) p.cleared.push(b.stage);
    p.unlocked=Math.max(p.unlocked,Math.min(10,b.stage+1));
  } else if(b.outcome==='loss') {
    reward=Math.min(Math.floor(full*0.25),Math.floor(b.kills*1.5+(1-b.base[1]/b.baseMax[1])*full*0.15));
  }
  p.coins=Math.min(10000000,p.coins+reward); return reward;
}
export class Battle {
  constructor(stage,progress,random=Math.random) {
    if(!Number.isInteger(stage)||stage<1||stage>10) throw new Error('Invalid stage');
    this.stage=stage;this.random=random;this.time=0;this.food=35+progress.upgrades[3]*10;
    this.cap=160;this.income=7.2+progress.upgrades[0]*0.6;this.attackBonus=1+progress.upgrades[2]*0.05;
    this.baseMax=[Math.round(700*(1+progress.upgrades[1]*0.1)),400+stage*65];this.base=[...this.baseMax];
    this.units=[];this.nextId=1;this.cd=[0,0,0];this.skillCd=[0,0,0];this.trophy=15;
    this.enemyFood=15;this.enemyTimer=3;this.rush=0;this.kills=0;this.events=[];this.bossSpawned=false;
    this.outcome=null;this.settled=false;this.projectiles=[];
  }
  add(kind,team) {
    const d=UNITS[kind];const scale=team===1 && !d.boss ? 1+(this.stage-1)*0.028 : 1;
    const u={id:this.nextId++,kind,team,x:team?925:75,hp:d.hp*scale,maxHp:d.hp*scale,damage:d.damage*(team?scale:this.attackBonus),cooldown:0.2,windup:0,pattern:6+this.random()*3,attackFlash:0,attack:null,hurt:0};
    this.units.push(u);this.events.push({type:'spawn',x:u.x,kind,team});return u;
  }
  spawn(kind) {
    if(this.outcome || !Number.isInteger(kind)||kind<0||kind>2 || this.cd[kind]>0 || this.food<UNITS[kind].cost || this.units.filter(u=>u.team===0&&u.hp>0).length>=18) return false;
    this.food-=UNITS[kind].cost;this.cd[kind]=UNITS[kind].cd;this.add(kind,0);return true;
  }
  skill(kind) {
    if(this.outcome || !Number.isInteger(kind)||kind<0||kind>2 || this.skillCd[kind]>0 || this.trophy<SKILLS[kind].cost) return false;
    this.trophy-=SKILLS[kind].cost;this.skillCd[kind]=SKILLS[kind].cd;
    if(kind===0) {
      const enemies=this.units.filter(u=>u.team===1&&u.hp>0);
      const x=enemies.length?Math.min(...enemies.map(u=>u.x)):900;
      for(const u of enemies) if(Math.abs(u.x-x)<160) u.hp-=105*this.attackBonus*(UNITS[u.kind].boss?0.75:1);
      this.events.push({type:'meteor',x});
    } else if(kind===1) {this.rush=8;this.events.push({type:'rush'});}
    else {this.base[0]=Math.min(this.baseMax[0],this.base[0]+this.baseMax[0]*0.25);this.events.push({type:'repair',x:60});}
    return true;
  }
  impact(strike) {
    const target=strike.targetId===null?null:this.units.find(v=>v.id===strike.targetId&&v.hp>0);
    if(strike.targetId!==null&&!target)return;
    const damage=strike.damage*(target&&UNITS[target.kind].boss?0.75:1);
    if(target){target.hp-=damage;target.hurt=0.16;}else this.base[1-strike.team]-=damage;
    this.events.push({type:'impact',id:strike.id,kind:strike.kind,x:target?target.x:strike.to,targetId:strike.targetId,team:strike.team});
  }
  step(dt) {
    if(this.outcome)return;
    dt=Math.min(Math.max(dt,0),0.1);this.time+=dt;
    this.food=Math.min(this.cap,this.food+this.income*dt);this.trophy=Math.min(120,this.trophy+0.7*dt);
    this.rush=Math.max(0,this.rush-dt);
    this.cd=this.cd.map(v=>Math.max(0,v-dt));this.skillCd=this.skillCd.map(v=>Math.max(0,v-dt));
    for(const p of this.projectiles){p.remaining-=dt;if(p.remaining<=0)this.impact(p);}
    this.projectiles=this.projectiles.filter(p=>p.remaining>0);
    const bossStage=this.stage===5||this.stage===10;
    if(bossStage&&!this.bossSpawned&&this.time>=20) {this.add(this.stage===5?3:4,1);this.bossSpawned=true;}
    this.enemyFood=Math.min(160,this.enemyFood+(3.9+this.stage*0.32)*(bossStage?0.72:1)*dt);
    this.enemyTimer-=dt;
    if(this.enemyTimer<=0) {
      const r=this.random();const kind=this.stage<3?(r<0.72?0:1):(r<0.25?2:r<0.58?1:0);
      if(this.enemyFood>=UNITS[kind].cost && this.units.filter(u=>u.team===1&&u.hp>0).length<18) {this.enemyFood-=UNITS[kind].cost;this.add(kind,1);}
      this.enemyTimer=0.9+this.random()*0.8;
    }
    for(const u of this.units) {
      if(u.hp<=0)continue;
      const d=UNITS[u.kind];const direction=u.team?-1:1;
      u.attackFlash=Math.max(0,u.attackFlash-dt);
      u.hurt=Math.max(0,u.hurt-dt);
      const boost=u.team===0&&this.rush>0?1.6:1;
      u.cooldown-=dt*boost;
      if(u.attack){
        const a=u.attack;a.elapsed+=dt*boost;
        if(!a.released&&a.elapsed>=d.windup){
          a.released=true;u.attackFlash=0.16;
          const strike={id:u.id,kind:u.kind,x:u.x,to:a.to,targetId:a.targetId,damage:u.damage,team:u.team};
          if(d.range>100){
            const flight=0.24+Math.abs(a.to-u.x)/600;
            this.projectiles.push({...strike,remaining:flight});
            this.events.push({...strike,type:'shot',flight});
          }else this.impact(strike);
        }
        if(a.elapsed>=d.windup+d.recovery)u.attack=null;
        continue;
      }
      const enemies=this.units.filter(v=>v.team!==u.team&&v.hp>0);
      let target=enemies.sort((a,b)=>Math.abs(a.x-u.x)-Math.abs(b.x-u.x))[0];
      const baseX=u.team?60:940;
      if(!target || Math.abs(baseX-u.x)<Math.abs(target.x-u.x))target=null;
      const tx=target?target.x:baseX;
      const reach=d.range+d.radius+(target?UNITS[target.kind].radius:35);
      const inRange=Math.abs(tx-u.x)<=reach;
      if(d.boss) {
        u.pattern-=dt;
        if(u.windup>0) {
          u.windup-=dt;
          if(u.windup<=0) {
            if(u.kind===4)u.x=Math.max(65,u.x-40);
            const victims=enemies.filter(v=>Math.abs(v.x-u.x)<115).sort((a,b)=>Math.abs(a.x-u.x)-Math.abs(b.x-u.x)).slice(0,4);
            for(const v of victims){v.hp-=u.damage*1.6;v.hurt=0.16;}
            if(Math.abs(60-u.x)<115)this.base[0]-=u.damage*1.6;
            this.events.push({type:'slam',id:u.id,kind:u.kind,x:u.x,team:u.team});u.pattern=9;
          }
          continue;
        }
        if(u.pattern<=0&&Math.abs(tx-u.x)<180) {u.windup=1.4;this.events.push({type:'warning',x:u.x});continue;}
      }
      if(!inRange) {u.x+=direction*d.speed*boost*dt;u.x=Math.max(60,Math.min(940,u.x));}
      else if(u.cooldown<=0) {
        u.cooldown=1/d.rate;
        u.attack={elapsed:0,released:false,targetId:target?target.id:null,to:tx};
        this.events.push({type:'attack',id:u.id,kind:u.kind,x:u.x,to:tx,team:u.team});
      }
    }
    for(const u of this.units) if(u.hp<=0) {
      if(u.team===1) {this.kills++;this.trophy=Math.min(120,this.trophy+(UNITS[u.kind].boss?25:6));}
      this.events.push({type:'death',x:u.x,team:u.team});
    }
    this.units=this.units.filter(u=>u.hp>0);
    this.base=this.base.map(v=>Math.max(0,v));
    if(this.base[0]<=0)this.outcome='loss';else if(this.base[1]<=0)this.outcome='win';
  }
}
