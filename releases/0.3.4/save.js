import {ERAS,SKILLS,ITEMS,WEAPONS} from './data.js';
export const SAVE_KEY='line-warriors-v1';
const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
const fail=()=>{throw new Error('올바른 라인워리어즈 저장 데이터가 아닙니다.');};
export function freshSave(){return {version:2,coins:0,unlocked:1,cleared:[],upgrades:[0,0,0,0],settings:{sound:true,music:false},ownedSkills:['meteor','rush','repair'],equippedSkills:['meteor','rush','repair'],inventory:{food:0,repair:0,horn:0},weapons:ERAS.map((e,i)=>({level:0,equipped:WEAPONS[i].id})),records:{wins:0,losses:0,kills:0,bossKills:0,bestTimes:{}}};}
function common(p,max){
  if(!p||typeof p!=='object'||!integer(p.coins,0,10000000)||!integer(p.unlocked,1,max)||!Array.isArray(p.upgrades)||p.upgrades.length!==4||p.upgrades.some(v=>!integer(v,0,8))||!Array.isArray(p.cleared)||p.cleared.length>max||p.cleared.some(v=>!integer(v,1,p.unlocked))||new Set(p.cleared).size!==p.cleared.length||!p.settings||typeof p.settings.sound!=='boolean'||typeof p.settings.music!=='boolean')fail();
}
export function migrateSave(p){
  if(p?.version===2)return validateSave(p);
  if(p?.version!==1)fail();common(p,10);
  const n=freshSave();for(const k of ['coins','unlocked','cleared','upgrades','settings'])n[k]=structuredClone(p[k]);
  if(n.cleared.includes(10))n.unlocked=11;return validateSave(n);
}
export function validateSave(p){
  if(p?.version!==2)fail();common(p,50);
  const era=Math.floor((p.unlocked-1)/10);
  if(!Array.isArray(p.ownedSkills)||p.ownedSkills.length<3||p.ownedSkills.length>6||new Set(p.ownedSkills).size!==p.ownedSkills.length||p.ownedSkills.some(id=>!SKILLS.some(s=>s.id===id&&s.era<=era))||['meteor','rush','repair'].some(id=>!p.ownedSkills.includes(id)))fail();
  if(!Array.isArray(p.equippedSkills)||p.equippedSkills.length!==3||new Set(p.equippedSkills).size!==3||p.equippedSkills.some(id=>!p.ownedSkills.includes(id)))fail();
  if(!p.inventory||Object.keys(p.inventory).length!==3||ITEMS.some(i=>!integer(p.inventory[i.id],0,99)))fail();
  if(!Array.isArray(p.weapons)||p.weapons.length!==5||p.weapons.some((w,i)=>!w||!integer(w.level,0,5)||(w.equipped!==null&&w.equipped!==WEAPONS[i].id)||(i>era&&w.level!==0)))fail();
  const r=p.records;if(!r||['wins','losses','kills','bossKills'].some(k=>!integer(r[k],0,100000000))||!r.bestTimes||typeof r.bestTimes!=='object'||Array.isArray(r.bestTimes)||Object.entries(r.bestTimes).some(([s,t])=>!/^\d+$/.test(s)||!integer(Number(s),1,50)||!p.cleared.includes(Number(s))||!Number.isFinite(t)||t<0||t>86400))fail();
  return structuredClone({version:2,coins:p.coins,unlocked:p.unlocked,cleared:p.cleared,upgrades:p.upgrades,settings:{sound:p.settings.sound,music:p.settings.music},ownedSkills:p.ownedSkills,equippedSkills:p.equippedSkills,inventory:p.inventory,weapons:p.weapons.map(w=>({level:w.level,equipped:w.equipped})),records:{wins:r.wins,losses:r.losses,kills:r.kills,bossKills:r.bossKills,bestTimes:r.bestTimes}});
}
function backupRaw(storage,key,raw){
  const previous=storage.getItem(key);if(previous===raw)return;
  if(previous!==null){let suffix=1;while(storage.getItem(key+'-'+suffix)!==null)suffix++;key+='-'+suffix;}
  storage.setItem(key,raw);
}
export function loadSave(storage,onWriteError=()=>{}){
  const raw=storage.getItem(SAVE_KEY);if(!raw)return freshSave();let old,p;
  try{old=JSON.parse(raw);p=migrateSave(old);}catch(error){
    try{backupRaw(storage,SAVE_KEY+'-rejected-backup',raw);}catch(writeError){onWriteError(writeError);}
    throw error;
  }
  if(old.version===1){
    try{backupRaw(storage,SAVE_KEY+'-backup',raw);storage.setItem(SAVE_KEY,JSON.stringify(p));}catch(error){onWriteError(error);}
  }
  return p;
}
export function replaceSave(storage,p){
  const next=validateSave(p),raw=storage.getItem(SAVE_KEY);
  // A confirmed recovery/import must preserve the raw current save first.
  if(raw!==null)backupRaw(storage,SAVE_KEY+'-recovery-backup',raw);
  storage.setItem(SAVE_KEY,JSON.stringify(next));return next;
}
