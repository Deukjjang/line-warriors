import {SKILLS,ITEMS,WEAPONS,UPGRADES} from './data.js';
export const upgradeCost=(p,i)=>UPGRADES[i]?Math.ceil(UPGRADES[i].cost*1.38**p.upgrades[i]):Infinity;
export function buyUpgrade(p,i){if(!Number.isInteger(i)||i<0||i>3||p.upgrades[i]>=8||p.coins<upgradeCost(p,i))return false;p.coins-=upgradeCost(p,i);p.upgrades[i]++;return true;}
export function buySkill(p,id){const s=SKILLS.find(s=>s.id===id);if(!s||s.era>Math.floor((p.unlocked-1)/10)||p.ownedSkills.includes(id)||p.coins<s.price)return false;p.coins-=s.price;p.ownedSkills.push(id);return true;}
export function equipSkill(p,slot,id){if(!Number.isInteger(slot)||slot<0||slot>2||!p.ownedSkills.includes(id)||p.equippedSkills.some((s,i)=>s===id&&i!==slot))return false;p.equippedSkills[slot]=id;return true;}
export function buyItem(p,id){const item=ITEMS.find(i=>i.id===id);if(!item||p.inventory[id]>=99||p.coins<item.price)return false;p.coins-=item.price;p.inventory[id]++;return true;}
export const weaponCost=(p,era)=>p.weapons[era]?Math.ceil((70+era*45)*1.6**p.weapons[era].level):Infinity;
export function buyWeaponUpgrade(p,era){if(!Number.isInteger(era)||era<0||era>4||era>Math.floor((p.unlocked-1)/10)||p.weapons[era].level>=5||p.coins<weaponCost(p,era))return false;p.coins-=weaponCost(p,era);p.weapons[era].level++;return true;}
export function equipWeapon(p,era,id){if(!Number.isInteger(era)||era<0||era>4||era>Math.floor((p.unlocked-1)/10)||(id!==null&&id!==WEAPONS[era].id))return false;p.weapons[era].equipped=id;return true;}
