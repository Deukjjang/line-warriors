export const WORLD={width:640,bases:[44,596],armyLimit:18};
const soldier=(id,name,role,cost,hp,damage,range,speed,height,extra={})=>({id,key:id,name,role,cost,hp,damage,range,speed,height,radius:height>85?25:13,windup:.24,recovery:.3,rate:1,cd:cost/22,armor:0,projectile:range>100?'bullet':null,...extra});
// Legacy numeric kinds 0..4 remain stable for old battle tooling.
export const UNITS=[
  soldier('club','몽둥이병','근접 · 전선 유지',15,70,10,25,38,66,{windup:.18,rate:1.05,cd:.65}),
  soldier('sling','새총병','원거리 · 빠른 돌탄',25,44,14,155,32,64,{rate:.8,cd:1.1,projectile:'stone'}),
  soldier('mammoth','매머드','중장갑 · 돌진 타격',60,310,22,38,24,88,{windup:.32,recovery:.38,rate:.65,cd:3.5,radius:30,armor:.12,splash:2}),
  soldier('chief','우두머리 원시인','충격파',0,620,30,62,22,105,{boss:true,rate:.7,radius:22,pattern:'slam'}),
  soldier('bossmammoth','거대 매머드','돌진 · 광역 충격',0,1080,40,70,19,125,{boss:true,rate:.6,radius:40,pattern:'charge'}),
  soldier('sword','검사','근접 · 빠른 검격',18,105,17,27,39,68,{armor:.1,rate:1.1}),
  soldier('archer','궁수','원거리 · 관통 화살',30,62,23,175,33,68,{projectile:'arrow',pierce:2,rate:.85}),
  soldier('knight','기사','중장갑 · 방어 돌파',72,440,37,40,28,93,{armor:.25,splash:2,rate:.7}),
  soldier('musket','머스킷병','원거리 · 강한 단발',22,140,32,150,32,70,{projectile:'bullet',rate:.8}),
  soldier('cannon','포병','광역 · 포격',44,115,52,190,24,78,{projectile:'shell',splash:3,rate:.48,windup:.4}),
  soldier('armored','중장갑병','중장갑 · 근접 방벽',80,580,45,36,24,80,{armor:.3,rate:.8,splash:2}),
  soldier('rifle','소총병','원거리 · 연속 사격',25,190,31,155,37,70,{projectile:'bullet',rate:1.4}),
  soldier('sniper','저격수','장거리 · 장갑 관통',45,110,100,220,28,72,{projectile:'bullet',pierce:2,ignoreArmor:true,rate:.48,windup:.45}),
  soldier('tank','탱크','중장갑 · 광역 포격',95,850,90,145,22,90,{armor:.35,projectile:'shell',splash:3,rate:.55,windup:.4}),
  soldier('laser','레이저병','관통 · 에너지 사격',30,260,56,170,39,74,{projectile:'laser',pierce:3,rate:1.1}),
  soldier('drone','드론조종사','원거리 · 유도 폭격',50,170,110,205,33,84,{projectile:'drone',splash:3,rate:.6}),
  soldier('robot','거대로봇','중장갑 · 플라스마 포',110,1200,140,135,25,105,{armor:.38,projectile:'plasma',splash:3,rate:.65}),
  soldier('ram','공성망치','공성 · 성문 강타',0,1500,64,55,20,110,{boss:true,armor:.2,pattern:'siege'}),
  soldier('catapult','투석기','범위 포격 · 지면 예고',0,1650,70,190,16,116,{boss:true,projectile:'rock',splash:3,pattern:'bombard',rate:.45,windup:.4}),
  soldier('wagon','장갑마차','돌격 · 연속 사격',0,2300,85,120,24,108,{boss:true,armor:.28,projectile:'bullet',pattern:'charge'}),
  soldier('bigcannon','대형대포','집중 포격 · 성문 압박',0,2300,90,195,14,112,{boss:true,projectile:'shell',splash:3,pattern:'siege',rate:.4,windup:.45}),
  soldier('apc','장갑차','기동 · 장갑 돌파',0,3300,120,140,28,105,{boss:true,armor:.32,projectile:'shell',pattern:'charge'}),
  soldier('helicopter','전투헬기','비행 · 미사일 폭격',0,2900,145,205,26,105,{boss:true,projectile:'missile',pattern:'bombard',air:true}),
  soldier('satellite','방어위성','비행 · 궤도 레이저',0,4100,160,225,20,110,{boss:true,projectile:'laser',pattern:'beam',air:true}),
  soldier('core','인공지능코어','보호막 · 에너지 폭발',0,5500,195,185,17,122,{boss:true,armor:.3,projectile:'plasma',pattern:'shield'})
];
export const BOSSES=UNITS.filter(u=>u.boss);
export const ERAS=[
  {id:'prehistoric',name:'원시',roster:[0,1,2],bosses:[3,4],baseHp:700,income:7.2,cap:160,startFood:35,background:'background',color:'#d6b04c'},
  {id:'medieval',name:'중세',roster:[5,6,7],bosses:[17,18],baseHp:1150,income:8.5,cap:190,startFood:45,background:'bg-medieval',color:'#64a77c'},
  {id:'gunpowder',name:'화약',roster:[8,9,10],bosses:[19,20],baseHp:1700,income:10,cap:220,startFood:55,background:'bg-gunpowder',color:'#d27755'},
  {id:'modern',name:'현대',roster:[11,12,13],bosses:[21,22],baseHp:2500,income:12,cap:270,startFood:65,background:'bg-modern',color:'#66aabb'},
  {id:'future',name:'미래',roster:[14,15,16],bosses:[23,24],baseHp:3600,income:14,cap:320,startFood:80,background:'bg-future',color:'#ab8ec2'}
].map((e,index)=>({...e,index}));
export const WEAPONS=[
  {id:'wood-sling',name:'목재 거대 새총',range:210,damage:12,rate:.65,projectile:'stone'},
  {id:'crossbow',name:'성벽 쇠뇌',range:245,damage:25,rate:.6,projectile:'arrow',pierce:2},
  {id:'fort-cannon',name:'성벽 대포',range:230,damage:45,rate:.4,projectile:'shell',splash:3},
  {id:'autocannon',name:'기관포',range:235,damage:20,rate:1.7,projectile:'bullet'},
  {id:'laser-turret',name:'레이저 포탑',range:260,damage:65,rate:.7,projectile:'laser',pierce:3}
];
export const SKILLS=[
  {id:'meteor',name:'운석',cost:60,cd:18,price:0,era:0,icon:'flame',detail:'착탄 지점의 적에게 광역 피해'},
  {id:'rush',name:'돌격',cost:35,cd:20,price:0,era:0,icon:'zap',detail:'8초 동안 이동과 공격 60% 강화'},
  {id:'repair',name:'수리',cost:50,cd:24,price:0,era:0,icon:'wrench',detail:'요새 최대 체력의 25% 회복'},
  {id:'shield',name:'방어막',cost:45,cd:22,price:180,era:1,icon:'shield',detail:'8초 동안 아군이 받는 피해 40% 감소'},
  {id:'reinforce',name:'지원 병력',cost:55,cd:24,price:260,era:1,icon:'users',detail:'현재 시대 기본 병사 3명 즉시 지원'},
  {id:'bombardment',name:'집중 포격',cost:80,cd:30,price:400,era:2,icon:'crosshair',detail:'예고된 지점에 3회 광역 포격'}
];
export const ITEMS=[{id:'food',name:'식량 보급',price:35,icon:'wheat',detail:'식량 +60'},{id:'repair',name:'긴급 수리',price:45,icon:'hammer',detail:'요새 체력 20% 회복'},{id:'horn',name:'전투 나팔',price:50,icon:'megaphone',detail:'6초 동안 돌격 효과'}];
export const UPGRADES=[{name:'식량 생산',detail:'초당 +0.6',cost:55},{name:'요새 체력',detail:'체력 +10%',cost:55},{name:'병사 공격력',detail:'공격력 +5%',cost:65},{name:'시작 식량',detail:'식량 +10',cost:45}];
export function stageData(stage){
  if(!Number.isInteger(stage)||stage<1||stage>50)throw new Error('Invalid stage');
  const era=ERAS[Math.floor((stage-1)/10)],local=(stage-1)%10+1;
  const mixes=[[.8,.2,0],[.65,.35,0],[.55,.4,.05],[.45,.35,.2],[.55,.35,.1],[.4,.45,.15],[.35,.4,.25],[.4,.3,.3],[.3,.35,.35],[.4,.35,.25]];
  return {stage,local,era,roster:era.roster,boss:local%5===0?era.bosses[local===5?0:1]:null,enemyMix:mixes[local-1],enemyScale:1+(local-1)*.035,enemyIncome:(4+local*.28)*(local%5===0?.74:1)*(1+era.index*.17),enemyBase:Math.round(era.baseHp*(.6+local*.08)),enemyWeapon:local>=4};
}
