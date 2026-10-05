import {Battle,settle} from './model.js';
import {UNITS,ERAS,SKILLS,ITEMS,WEAPONS,WORLD} from './data.js';
import {freshSave,loadSave,migrateSave,replaceSave,SAVE_KEY} from './save.js';
import {Lobby} from './lobby.js';
import {CombatEffects} from './combat-effects.js';
import {BattleAudio} from './audio.js';
import {VERSION} from './version.js';
import {startPwa} from './pwa.js';
import {fortressLayout,unitPose,TRAVEL_FRAME} from './movement.js';
import {FortressMounts} from './mounting.js';
const $=id=>document.getElementById(id),icon=id=>`<i data-lucide="${id}"></i>`,icons=()=>window.lucide.createIcons();
let progress=freshSave(),storageWarning=false,storageBlocked=false;
try{progress=loadSave(localStorage,()=>{storageWarning=true;storageBlocked=true;});}catch{storageWarning=true;storageBlocked=true;}
let battle=new Battle(progress.unlocked,progress),paused=true,ready=false,active=false,scene,resultShown=false,speed=1,lastReward=0,toastTimer;
function toast(text){$('toast').textContent=text;$('toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.display='none',3800);}
function persist(){try{if(storageBlocked)throw new Error();localStorage.setItem(SAVE_KEY,JSON.stringify(progress));}catch{toast('자동 저장이 불가능합니다. 설정에서 저장코드를 내보내 주세요.');}updateCoins();}
function updateCoins(){$('coin-label').innerHTML=icon('coins')+progress.coins;icons();}
const audio=new BattleAudio(()=>progress.settings);
document.addEventListener('pointerdown',()=>audio.wake());
const lobby=new Lobby({getProgress:()=>progress,persist,start,toast});
function setPaused(value){paused=value;battle.paused=value;if(value)audio.pause();else audio.wake();}
function heading(title){return `<div class="modal-heading"><h2>${title}</h2><button class="close" id="close-modal" aria-label="닫기">${icon('x')}</button></div>`;}
function show(html){setPaused(true);$('modal-content').innerHTML=html;if(!$('modal').open)$('modal').showModal();icons();const close=$('close-modal');if(close)close.onclick=()=>battle.outcome&&active?showResult():hide();updateHud();}
function hide(){if($('modal').open)$('modal').close();setPaused(!active||!!battle.outcome);updateHud();}
function confirmAction(title,text,callback){show(`${heading(title)}<p>${text}</p><div class="modal-actions"><button id="cancel-action">취소</button><button class="primary" id="confirm-action">확인</button></div>`);$('cancel-action').onclick=()=>active?pauseMenu():hide();$('confirm-action').onclick=callback;}
function goLobby(view='home'){active=false;setPaused(true);if($('modal').open)$('modal').close();scene?.clearActors();$('battle-screen').hidden=true;$('lobby').hidden=false;lobby.open(view);updateCoins();}
function start(stage){
  if(stage>progress.unlocked)return;if(!ready){toast('이미지를 준비하고 있습니다. 잠시 기다려 주세요.');return;}
  battle=new Battle(stage,progress);active=true;resultShown=false;speed=1;scene?.clearActors();audio.nextNote=0;
  $('lobby').hidden=true;$('battle-screen').hidden=false;if($('modal').open)$('modal').close();setPaused(false);renderCommands();resize();updateHud();
}
function renderCommands(){
  $('units').innerHTML=battle.roster.map((k,i)=>{const u=UNITS[k];return `<button class="unit-button" id="unit-${i}" aria-label="${u.name} 생산"><div class="cooldown"></div><img src="assets-v3/${u.key}.png" alt=""><div class="unit-copy"><strong>${u.name}</strong><small>${u.role}</small><span class="price"></span></div></button>`;}).join('');
  $('skills').innerHTML=battle.skillIds.map((id,i)=>{const s=SKILLS.find(s=>s.id===id);return `<button class="skill-button" id="skill-${i}" aria-label="${s.name}" title="${s.detail}">${icon(s.icon)}<span>${s.name}</span><small></small></button>`;}).join('');
  $('items').innerHTML=ITEMS.map(i=>`<button id="item-${i.id}" aria-label="${i.name}" title="${i.detail}">${icon(i.icon)}<span>${i.name}</span><b></b></button>`).join('');
  for(let i=0;i<3;i++){$('unit-'+i).onclick=()=>{if(active&&!paused&&ready){battle.spawn(i);updateHud();}};$('skill-'+i).onclick=()=>{if(active&&!paused&&ready){if(!battle.skill(i))toast('사용 조건을 확인해 주세요.');updateHud();}};}
  ITEMS.forEach(i=>$('item-'+i.id).onclick=()=>{if(active&&!paused&&battle.useItem(i.id,progress)){persist();updateHud();}else toast('지금은 사용할 수 없습니다.');});icons();
}
function pauseMenu(){if(!active)return;if(battle.outcome){showResult();return;}show(`${heading('잠시 쉬어가기')}<p>${battle.era.name} 시대 · ${battle.stage} 전장</p><div class="modal-actions"><button class="primary" id="resume">계속하기</button><button id="restart">다시 시작</button></div><div class="modal-actions"><button id="quit">${icon('house')}로비로</button></div>`);$('resume').onclick=hide;$('restart').onclick=()=>confirmAction('다시 시작','현재 전투를 포기하고 다시 시작합니다. 사용한 소모품은 반환되지 않습니다.',()=>start(battle.stage));$('quit').onclick=()=>confirmAction('전투 포기','현재 전투를 종료합니다. 금화 보상은 지급되지 않습니다.',()=>{battle.outcome='quit';settle(progress,battle);persist();goLobby();});}
function finish(){if(!resultShown){lastReward=settle(progress,battle);persist();resultShown=true;}showResult();}
function showResult(){const win=battle.outcome==='win';show(`<img class="result-art" src="assets-v3/${win?UNITS[battle.roster[2]].key:UNITS[battle.data.boss??battle.era.bosses[0]].key}.png" alt=""><h2 class="result-title">${win?(battle.stage===50?'모든 시대 정복!':'승리!'):'다시 도전해요'}</h2><p class="result-detail">${battle.era.name} · ${battle.stage} 전장 · ${Math.floor(battle.time)}초 · 적 처치 ${battle.kills}</p><div class="reward">+ ${lastReward} 금화</div><div class="modal-actions"><button id="result-lobby">${icon('house')}로비</button><button class="primary" id="result-next">${win&&battle.stage<50?'다음 전장':'재도전'}</button></div><div class="modal-actions"><button id="result-shop">${icon('shopping-bag')}상점</button><button id="result-map">${icon('map')}전장 선택</button></div>`);$('result-lobby').onclick=()=>goLobby();$('result-next').onclick=()=>start(win&&battle.stage<50?battle.stage+1:battle.stage);$('result-shop').onclick=()=>goLobby('shop');$('result-map').onclick=()=>goLobby('campaign');}
function settingsMenu(){show(`${heading('설정')}<label class="setting-row">효과음<input id="sound" type="checkbox" ${progress.settings.sound?'checked':''}></label><label class="setting-row">배경음<input id="music" type="checkbox" ${progress.settings.music?'checked':''}></label><div class="save-transfer"><label for="save-code">저장코드</label><textarea id="save-code" spellcheck="false" aria-label="저장코드"></textarea><div class="modal-actions"><button id="export">${icon('upload')}내보내기</button><button id="import">${icon('download')}불러오기</button></div><div id="import-error" class="import-error" role="status"></div></div><div class="version">라인워리어즈 ${VERSION} · 오프라인 지원</div>`);
  for(const id of ['sound','music'])$(id).onchange=()=>{progress.settings[id]=$(id).checked;persist();};
  $('export').onclick=()=>{const code='LW2.'+btoa(JSON.stringify(progress));$('save-code').value=code;$('save-code').select();navigator.clipboard?.writeText(code).catch(()=>{});toast('저장코드를 준비했습니다.');};
  $('import').onclick=()=>{try{const raw=$('save-code').value.trim();if(!raw.startsWith('LW2.')||raw.length>20000)throw new Error();const imported=migrateSave(JSON.parse(atob(raw.slice(4))));confirmAction('저장 불러오기','현재 진행 상황을 가져온 저장 데이터로 교체합니다.',()=>{try{progress=replaceSave(localStorage,imported);storageBlocked=false;updateCoins();goLobby();toast('저장 데이터를 불러왔습니다.');}catch{toast('원본 백업 또는 저장 공간을 확보하지 못했습니다. 현재 기록을 유지합니다.');}});}catch{$('import-error').textContent='올바른 저장코드인지 확인해 주세요.';}};
}
$('settings').innerHTML=icon('settings');$('settings').onclick=settingsMenu;$('pause').innerHTML=icon('pause');$('pause').onclick=pauseMenu;
for(const s of [1,2])$('speed-'+s).onclick=()=>{if(active&&!paused&&!battle.outcome){speed=s;updateHud();}};
$('modal').addEventListener('cancel',e=>{e.preventDefault();if(active&&battle.outcome)showResult();else hide();});
window.lineWarriorsBack=()=>{if($('modal').open)hide();else pauseMenu();};window.lineWarriorsPause=()=>{if(active&&!battle.outcome)pauseMenu();};
document.addEventListener('visibilitychange',()=>{if(document.hidden){audio.pause();if(active&&!battle.outcome)pauseMenu();}});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active&&!$('modal').open)pauseMenu();});
function updateHud(){
  if(!active)return;$('stage-label').textContent=`${battle.stage} / 50`;$('era-label').textContent=battle.era.name+' 시대';$('clock').textContent=`${String(Math.floor(battle.time/60)).padStart(2,'0')}:${String(Math.floor(battle.time%60)).padStart(2,'0')}`;
  for(const [i,id]of ['ally','enemy'].entries()){$(id+'-hp').textContent=Math.ceil(battle.base[i]);$(id+'-bar').value=battle.base[i]/battle.baseMax[i];}
  $('food').textContent=`${Math.floor(battle.food)} / ${battle.cap}`;$('income').textContent=`+${battle.income.toFixed(1)} / 초`;$('trophy').textContent=Math.floor(battle.trophy);const count=battle.count(0);$('army-count').textContent=`${count} / 18`;
  battle.roster.forEach((k,i)=>{const u=UNITS[k],btn=$('unit-'+i);if(!btn)return;btn.disabled=!ready||paused||!!battle.outcome||battle.food<u.cost||battle.cd[i]>0||count>=18;btn.querySelector('.price').textContent=battle.cd[i]>0?battle.cd[i].toFixed(1)+'초':'식량 '+u.cost;btn.querySelector('.cooldown').style.height=Math.min(100,battle.cd[i]/u.cd*100)+'%';});
  battle.skillIds.forEach((id,i)=>{const s=SKILLS.find(s=>s.id===id),btn=$('skill-'+i);if(!btn)return;btn.disabled=!ready||paused||!!battle.outcome||battle.trophy<s.cost||battle.skillCd[i]>0||(id==='repair'&&battle.base[0]>=battle.baseMax[0])||(id==='reinforce'&&count>15);btn.querySelector('small').textContent=battle.skillCd[i]>0?Math.ceil(battle.skillCd[i])+'초':s.cost;});
  ITEMS.forEach(i=>{const btn=$('item-'+i.id);if(!btn)return;btn.querySelector('b').textContent=progress.inventory[i.id];btn.disabled=paused||!!battle.outcome||!progress.inventory[i.id]||battle.usedItems.has(i.id)||(i.id==='food'&&battle.food>=battle.cap)||(i.id==='repair'&&battle.base[0]>=battle.baseMax[0])||(i.id==='horn'&&(count===0||battle.rush>=6));});
  for(const s of [1,2]){$('speed-'+s).setAttribute('aria-pressed',String(speed===s));$('speed-'+s).disabled=paused||!!battle.outcome;}
}
class Battlefield extends Phaser.Scene{
  constructor(){super('battle');this.actors=new Map();this.accumulator=0;this.hudTime=0;this.noticeUntil=0;}
  preload(){
    const keys=[...UNITS.map(u=>u.key),'ally','enemy',...ERAS.map(e=>e.background),...ERAS.map(e=>'base-'+e.id),...WEAPONS.map(w=>w.id)];
    for(const key of keys)this.load.image(key,`assets-v3/${key}.png`);
    for(const u of UNITS.filter(u=>!u.boss))this.load.spritesheet(u.key+'-attack',`assets-v3/motions/${u.key}.png`,{frameWidth:768,frameHeight:512});
    for(const u of UNITS)this.load.spritesheet(u.key+(u.air?'-flight':'-walk'),`assets-v5/travel/${u.key}.png`,{frameWidth:TRAVEL_FRAME.width,frameHeight:TRAVEL_FRAME.height});
    this.load.json('travel-meta','assets-v5/travel/metadata.json');
    this.load.on('progress',p=>{$('loading').textContent=`전장 준비 ${Math.round(p*100)}%`;if($('asset-status'))$('asset-status').textContent=`이미지 준비 ${Math.round(p*100)}%`;});this.load.on('loaderror',()=>{storageWarning=true;});
  }
  create(){scene=this;this.bg=this.add.image(0,0,'background').setDepth(0);this.bases=[this.add.image(0,0,'base-prehistoric').setOrigin(.5,1).setDepth(2),this.add.image(0,0,'base-prehistoric').setOrigin(.5,1).setDepth(2)];this.mounting=new FortressMounts(this);this.effects=new CombatEffects(this);this.lines=this.add.graphics().setDepth(9);
    this.travel=this.cache.json.get('travel-meta');
    ready=!!this.travel&&UNITS.every(u=>this.textures.exists(u.key)&&this.textures.exists(u.key+(u.air?'-flight':'-walk'))&&this.travel[u.key])&&UNITS.filter(u=>!u.boss).every(u=>this.textures.exists(u.key+'-attack'))&&ERAS.every(e=>this.textures.exists('base-'+e.id)&&this.textures.exists(e.background));
    if(ready){$('loading').remove();$('asset-status')?.remove();lobby.render();}else toast('일부 이미지를 불러오지 못했습니다. 새로고침해 주세요.');if(storageWarning)toast('저장 또는 이미지 정보를 확인해 주세요. 기존 저장 데이터는 덮어쓰지 않았습니다.');
  }
  clearActors(){for(const a of this.actors.values())a.destroy();this.actors.clear();this.effects?.clear();this.accumulator=0;this.noticeUntil=0;this.shakeUntil=0;this.cameras.main.setScroll(0,0);$('battle-notice').style.display='none';}
  layout(){
    const w=this.scale.width,h=this.scale.height,dpr=currentDpr;this.dpr=dpr;const margin=20*dpr;this.factor=(w-margin*2)/WORLD.width;this.mobileFactor=window.innerWidth<=960?.9:1;this.baseUnitScale=Math.min(1.35,Math.max(.8,w/dpr/640))*dpr;this.unitScale=this.baseUnitScale*this.mobileFactor;this.ground=h*.82;this.project=x=>margin+x*this.factor;
    this.bg.setTexture(battle.era.background);const source=this.bg.texture.getSourceImage(),bgscale=Math.max(w/source.width,h/source.height);this.bg.setPosition(w/2,h/2).setDisplaySize(source.width*bgscale,source.height*bgscale);
    const baseKey='base-'+battle.era.id,baseSource=this.textures.get(baseKey).getSourceImage(),fort=fortressLayout(w,h,dpr,baseSource.height/baseSource.width,this.mobileFactor<1),baseWidth=fort.width;
    for(let team=0;team<2;team++){
      const img=this.bases[team];img.setTexture(baseKey);const height=fort.height,x=fort.centres[team];img.setPosition(x,this.ground+3*dpr).setDisplaySize(baseWidth,height).setFlipX(team===1);if(team===1)img.setTint(0xffd1c5);else img.clearTint();
    }
    this.fortLayout={fort,ground:this.ground+3*dpr,dpr,era:battle.era.id,baseKey,bases:this.bases};
  }
  unitHeight(kind){return Math.min((UNITS[kind]?.height??66)*this.baseUnitScale,this.scale.height*.38)*this.mobileFactor;}
  update(_,delta){
    if(!ready||!active)return;this.layout();
    if(!paused&&!battle.outcome){this.accumulator+=Math.min(delta/1000,.1)*speed;while(this.accumulator>=1/60){battle.step(1/60);this.accumulator-=1/60;if(battle.outcome)break;}audio.music(battle.time);}
    this.mounting.render({...this.fortLayout,turrets:battle.turrets,project:this.project,unitScale:this.unitScale});
    const g=this.lines,dpr=this.dpr;g.clear();const live=new Set();
    for(const u of battle.units){
      live.add(u.id);const d=UNITS[u.kind];let a=this.actors.get(u.id);if(!a){a=this.add.sprite(0,0,d.boss?d.key:d.key+'-attack').setOrigin(.5,1);this.actors.set(u.id,a);}
      const height=this.unitHeight(u.kind),travelHeight=height/this.travel[d.key].scale,stride=this.travel[d.key].stride/TRAVEL_FRAME.height*travelHeight/this.factor;
      const pose=unitPose(d,u,{stride,time:battle.time}),phase=pose.phase;if(a.texture.key!==pose.texture)a.setTexture(pose.texture);if(!d.boss||d.air||u.moving&&!u.attack)a.setFrame(pose.frame);
      const direction=u.team?-1:1,lunge=phase===2?(d.projectile?-4:d.key==='mammoth'?10:6):phase===1?-2:0,x=this.project(u.x),air=d.air?25*this.unitScale:0,y=this.ground+(u.id%3)*3*dpr-air+(d.air?Math.sin(battle.time*5+u.id)*2*dpr:0);
      const drawHeight=d.air||u.moving&&!u.attack?travelHeight:height;
      a.setFlipX(u.team===1).setDisplaySize(drawHeight*a.frame.realWidth/a.frame.realHeight,drawHeight).setPosition(x+direction*(lunge-(u.hurt>0?4:0))*dpr,y).setAngle(d.boss?direction*(phase===2?7:phase===1?-4:0):0).setDepth(3+(u.id%3)*.1);
      if(u.hurt>0)a.setTint(0xffb59c);else if(u.team===1)a.setTint(0xffddd0);else a.clearTint();g.fillStyle(u.team?0xa14d41:0x204d35,.28);g.fillEllipse(x,this.ground+4*dpr,26*this.unitScale,5*dpr);
      if(u.hp<u.maxHp||d.boss){const width=(d.boss?54:30)*this.unitScale;g.fillStyle(0x25372a,.8);g.fillRect(x-width/2,y-height-7*dpr,width,4*dpr);g.fillStyle(u.team?0xec7563:0x7bd591,1);g.fillRect(x-width/2,y-height-7*dpr,width*Math.max(0,u.hp/u.maxHp),4*dpr);}
      if(battle.shield>0&&u.team===0||u.bossShield>0){g.lineStyle(2*dpr,0x8dd9ff,.7);g.strokeEllipse(x,y-height/2,height*.85,height*1.08);}
      if(battle.rush>0&&u.team===0){g.lineStyle(2*dpr,0xffd85b,.7);for(let i=0;i<3;i++)g.lineBetween(x-12*dpr-i*6*dpr,y-height*.4+i*5*dpr,x-28*dpr-i*5*dpr,y-height*.4+i*5*dpr);}
      if(u.windup>0){g.lineStyle(2*dpr,0xff5f43,.65+.2*Math.sin(battle.time*20));g.strokeEllipse(this.project(u.patternX??u.x),this.ground,180*this.factor,24*this.unitScale);}
    }
    for(const [id,a]of this.actors)if(!live.has(id)){a.destroy();this.actors.delete(id);}
    for(const e of battle.events.splice(0)){audio.effect(e);this.effects.emit(e,battle.time,{project:this.project,ground:this.ground,unitScale:this.unitScale,weaponOrigin:team=>this.mounting.origin(team)});if(['meteor-impact','bombard-impact','slam'].includes(e.type))this.shakeUntil=battle.time+.18;if(e.type==='warning'){this.noticeUntil=battle.time+1.5;$('battle-notice').textContent='보스 공격 준비!';$('battle-notice').style.display='block';}if(e.type==='spawn'&&UNITS[e.kind]?.boss){this.noticeUntil=battle.time+3;$('battle-notice').textContent=UNITS[e.kind].name+' 등장!';$('battle-notice').style.display='block';}}
    const shake=Math.max(0,(this.shakeUntil??0)-battle.time)/.18;this.cameras.main.setScroll(Math.sin(battle.time*90)*2*dpr*shake,Math.cos(battle.time*75)*dpr*shake);
    this.effects.render(battle.time,{project:this.project,ground:this.ground,unitScale:this.unitScale,dpr,unitHeight:k=>this.unitHeight(k),weaponOrigin:team=>this.mounting.origin(team)});
    if(battle.time>this.noticeUntil)$('battle-notice').style.display='none';if(this.time.now-this.hudTime>100){updateHud();this.hudTime=this.time.now;}if(battle.outcome&&!resultShown)finish();
  }
}
const field=$('field');let currentDpr=Math.min(3,window.devicePixelRatio||1);
const game=new Phaser.Game({type:Phaser.CANVAS,parent:'field',width:Math.round(390*currentDpr),height:Math.round(330*currentDpr),backgroundColor:'#91bfab',scene:Battlefield,audio:{noAudio:true},render:{antialias:true},scale:{mode:Phaser.Scale.NONE}});
function resize(){if(field.clientWidth<1||field.clientHeight<1)return;currentDpr=Math.min(3,window.devicePixelRatio||1);game.scale.resize(Math.round(field.clientWidth*currentDpr),Math.round(field.clientHeight*currentDpr));}
new ResizeObserver(resize).observe(field);window.addEventListener('resize',resize);
window.__LW={snapshot:()=>({stage:battle.stage,era:battle.era.id,time:battle.time,food:battle.food,trophy:battle.trophy,speed,units:battle.units.map(u=>({id:u.id,kind:u.kind,team:u.team,x:u.x,hp:u.hp,attack:u.attack,moving:u.moving,walkDistance:u.walkDistance,texture:scene?.actors.get(u.id)?.texture.key,renderY:scene?.actors.get(u.id)?.y,frame:scene?.actors.get(u.id)?.frame.name})),outcome:battle.outcome,paused,active,ready,textures:scene?.textures.getTextureKeys(),effects:scene?.effects.active.length,basePositions:WORLD.bases.map(x=>scene?.project?.(x)),fortresses:scene?.bases.map(b=>({x:b.x,y:b.y,width:b.displayWidth,height:b.displayHeight})),mounts:scene?.mounting.snapshot(),ground:scene?.ground,progress:structuredClone(progress)})};
goLobby();startPwa(toast);
