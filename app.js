import {Battle,UNITS,SKILLS,UPGRADES,freshSave,validateSave,settle,upgradeCost,buyUpgrade} from './model.js';
import {BattleAudio} from './audio.js';
import {VERSION} from './version.js';
import {startPwa} from './pwa.js';
const $=id=>document.getElementById(id);
const icon=name=>`<i data-lucide="${name}"></i>`;
const refreshIcons=()=>window.lucide.createIcons();
const SAVE_KEY='line-warriors-v1';
let progress=freshSave();let storageWarning=false;
try {const raw=localStorage.getItem(SAVE_KEY);if(raw)progress=validateSave(JSON.parse(raw));}catch{storageWarning=true;}
let battle=new Battle(progress.unlocked,progress);let paused=false;let ready=false;let scene;let resultShown=false;
const persist=()=>{try{localStorage.setItem(SAVE_KEY,JSON.stringify(progress));}catch{toast('자동 저장이 불가능합니다. 설정에서 저장코드를 보관해 주세요.');}};
let toastTimer;
function toast(text){$('toast').textContent=text;$('toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.display='none',3500);}
const audio=new BattleAudio(()=>progress.settings);
document.addEventListener('pointerdown',()=>audio.wake());
$('pause').innerHTML=icon('pause');$('campaign').innerHTML=icon('map')+'전장';$('upgrades').innerHTML=icon('swords')+'강화';$('settings').innerHTML=icon('settings')+'설정';
$('units').innerHTML=UNITS.slice(0,3).map((u,i)=>`<button class="unit-button" id="unit-${i}" aria-label="${u.name} 생산"><div class="cooldown"></div><img src="assets/${u.key}.png" alt=""><div class="unit-copy"><strong>${u.name}</strong><small>${u.role}</small><span class="price">고기 ${u.cost}</span></div></button>`).join('');
$('skills').innerHTML=SKILLS.map((s,i)=>`<button class="skill-button" id="skill-${i}" aria-label="${s.name}">${icon(['flame','zap','wrench'][i])}<span>${s.name}</span><small></small></button>`).join('');refreshIcons();
UNITS.slice(0,3).forEach((_,i)=>$(`unit-${i}`).onclick=()=>{if(!paused&&ready){battle.spawn(i);updateHud();}});
SKILLS.forEach((_,i)=>$(`skill-${i}`).onclick=()=>{if(!paused&&ready){battle.skill(i);updateHud();}});
function show(html){paused=true;scene?.tweens.pauseAll();audio.pause();$('modal-content').innerHTML=html;if(!$('modal').open)$('modal').showModal();refreshIcons();updateHud();}
function hide(){if($('modal').open)$('modal').close();paused=!!battle.outcome;if(!paused)scene?.tweens.resumeAll();audio.wake();updateHud();}
function heading(title){return `<div class="modal-heading"><h2>${title}</h2><button class="close" id="close-modal" aria-label="닫기">${icon('x')}</button></div>`;}
function wireClose(){const b=$('close-modal');if(b)b.onclick=()=>battle.outcome?showResult():hide();}
function confirmAction(title,text,callback){show(`${heading(title)}<p>${text}</p><div class="modal-actions"><button class="secondary" id="cancel-action">취소</button><button class="primary" id="confirm-action">확인</button></div>`);wireClose();$('cancel-action').onclick=hide;$('confirm-action').onclick=callback;}
function start(stage){battle=new Battle(stage,progress);paused=false;resultShown=false;scene?.clearActors();audio.nextNote=0;if($('modal').open)$('modal').close();audio.wake();updateHud();}
function pauseMenu(){if(battle.outcome){showResult();return;}show(`${heading('잠시 쉬어가기')}<p>${battle.stage} 스테이지 · 원시 시대</p><div class="modal-actions"><button class="primary" id="resume">계속하기</button><button class="secondary" id="restart">다시 시작</button></div><div class="modal-actions"><button class="secondary" id="quit">전투 포기</button></div>`);wireClose();$('resume').onclick=hide;$('restart').onclick=()=>confirmAction('다시 시작','현재 전투를 종료하고 같은 스테이지를 다시 시작합니다. 보상은 지급되지 않습니다.',()=>start(battle.stage));$('quit').onclick=()=>confirmAction('전투 포기','현재 전투를 포기합니다. 보상은 지급되지 않습니다.',()=>{battle.outcome='quit';finish();});}
$('pause').onclick=pauseMenu;
function campaignMenu(){show(`${heading('원시의 전장')}<p>별 ${progress.cleared.length} / 10 · 5, 10 스테이지는 보스 전투</p><div class="stage-grid">${Array.from({length:10},(_,i)=>{const s=i+1;return `<button data-stage="${s}" class="${s===battle.stage?'selected ':''}${s%5===0?'boss':''}" ${s>progress.unlocked?'disabled':''}>${s>progress.unlocked?icon('lock'):s}<small>${progress.cleared.includes(s)?'★':s%5===0?'보스':'전투'}</small></button>`;}).join('')}</div>`);wireClose();document.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>{const s=Number(b.dataset.stage);if(battle.time>5&&!battle.outcome)confirmAction('전장 변경','진행 중인 전투를 종료합니다. 보상은 지급되지 않습니다.',()=>start(s));else start(s);});}
$('campaign').onclick=campaignMenu;
function upgradesMenu(){show(`${heading('영구 강화')}<p>보유 금화 <strong>${progress.coins}</strong></p>${UPGRADES.map((u,i)=>`<div class="upgrade-row"><div><strong>${u.name} <span>${progress.upgrades[i]} / 8</span></strong><small>${u.detail}</small></div><button data-upgrade="${i}" ${progress.upgrades[i]>=8||progress.coins<upgradeCost(progress,i)?'disabled':''}>${progress.upgrades[i]>=8?'최대 단계':upgradeCost(progress,i)+' 금화'}</button></div>`).join('')}`);wireClose();document.querySelectorAll('[data-upgrade]').forEach(b=>b.onclick=()=>{if(buyUpgrade(progress,Number(b.dataset.upgrade))){persist();upgradesMenu();toast('다음 전투부터 강화가 적용됩니다.');}});}
$('upgrades').onclick=upgradesMenu;
function settingsMenu(){show(`${heading('설정')}<label class="setting-row">효과음<input id="sound" type="checkbox" ${progress.settings.sound?'checked':''}></label><label class="setting-row">배경음<input id="music" type="checkbox" ${progress.settings.music?'checked':''}></label><div class="save-transfer"><label for="save-code">저장코드</label><textarea id="save-code" spellcheck="false" aria-label="저장코드"></textarea><div class="modal-actions"><button id="export" class="secondary">${icon('upload')} 내보내기</button><button id="import" class="secondary">${icon('download')} 불러오기</button></div><div id="import-error" class="import-error" role="status"></div></div><div class="version">라인워리어즈 0.2.0 · 원시의 시작</div>`);wireClose();['sound','music'].forEach(id=>$(id).onchange=()=>{progress.settings[id]=$(id).checked;persist();});$('export').onclick=()=>{const code='LW2.'+btoa(JSON.stringify(progress));$('save-code').value=code;$('save-code').select();try{navigator.clipboard?.writeText(code).catch(()=>{});}catch{}toast('저장코드를 준비했습니다.');};$('import').onclick=()=>{try{const raw=$('save-code').value.trim();if(!raw.startsWith('LW2.')||raw.length>12000)throw new Error('올바른 저장코드가 아닙니다.');const imported=validateSave(JSON.parse(atob(raw.slice(4))));confirmAction('저장 불러오기','현재 진행 상황과 진행 중인 전투가 이 저장 데이터로 교체됩니다.',()=>{progress=imported;persist();start(progress.unlocked);toast('저장 데이터를 불러왔습니다.');});}catch(e){$('import-error').textContent=e.message==='올바른 라인워리어즈 저장 데이터가 아닙니다.'?e.message:'저장코드를 확인해 주세요.';}};}
$('settings').onclick=settingsMenu;
let lastReward=0;
function finish(){if(!resultShown){lastReward=settle(progress,battle);persist();resultShown=true;}showResult();}
function showResult(){const win=battle.outcome==='win',quit=battle.outcome==='quit';show(`<img class="defeat-art" src="assets/${win?'club':battle.stage===10?'bossmammoth':'chief'}.png" alt=""><h2>${win?(battle.stage===10?'원시 시대 정복!':'승리!'):quit?'전투 종료':'다시 도전해요'}</h2><p>${battle.stage} 스테이지 · ${Math.floor(battle.time)}초 · 적 처치 ${battle.kills}</p><div class="reward">+ ${lastReward} 금화</div><div class="modal-actions"><button class="secondary" id="result-upgrade">강화</button><button class="primary" id="result-next">${win?(battle.stage===10?'전장 선택':'다음 전투'):'재도전'}</button></div><div class="modal-actions"><button class="secondary" id="result-map">전장</button></div>`);$('result-upgrade').onclick=upgradesMenu;$('result-next').onclick=()=>win&&battle.stage===10?campaignMenu():start(win?battle.stage+1:battle.stage);$('result-map').onclick=campaignMenu;}
$('modal').addEventListener('cancel',e=>{e.preventDefault();if(battle.outcome)showResult();else hide();});
window.lineWarriorsBack=()=>{if($('modal').open){if(!battle.outcome)hide();return;}pauseMenu();};
window.lineWarriorsPause=()=>{if(ready&&!battle.outcome)pauseMenu();};
document.addEventListener('visibilitychange',()=>{if(document.hidden){audio.pause();if(ready&&!battle.outcome)pauseMenu();}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('modal').open)pauseMenu();});
function updateHud(){
  $('coin-label').innerHTML=icon('coins')+progress.coins;$('stage-label').textContent=`${battle.stage} / 10`;
  $('clock').textContent=`${String(Math.floor(battle.time/60)).padStart(2,'0')}:${String(Math.floor(battle.time%60)).padStart(2,'0')}`;
  for(const [i,id] of ['ally','enemy'].entries()){$(`${id}-hp`).textContent=Math.ceil(battle.base[i]);$(`${id}-bar`).value=battle.base[i]/battle.baseMax[i];}
  $('food').textContent=`${Math.floor(battle.food)} / ${battle.cap}`;$('income').textContent=`+${battle.income.toFixed(1)} / 초`;$('trophy').textContent=Math.floor(battle.trophy);
  const count=battle.units.filter(u=>u.team===0).length;$('army-count').textContent=`${count} / 18`;
  UNITS.slice(0,3).forEach((u,i)=>{const btn=$(`unit-${i}`);btn.disabled=!ready||paused||!!battle.outcome||battle.food<u.cost||battle.cd[i]>0||count>=18;btn.querySelector('.price').textContent=battle.cd[i]>0?`${battle.cd[i].toFixed(1)}초`:`고기 ${u.cost}`;btn.querySelector('.cooldown').style.height=`${battle.cd[i]/u.cd*100}%`;});
  SKILLS.forEach((s,i)=>{const btn=$(`skill-${i}`);btn.disabled=!ready||paused||!!battle.outcome||battle.trophy<s.cost||battle.skillCd[i]>0;btn.querySelector('small').textContent=battle.skillCd[i]>0?`${Math.ceil(battle.skillCd[i])}초`:s.cost;});
  refreshIcons();
}
class Battlefield extends Phaser.Scene {
  constructor(){super('battle');this.actors=new Map();this.accumulator=0;this.hudTime=0;this.noticeUntil=0;}
  preload(){for(const key of ['club','sling','mammoth','chief','bossmammoth','ally','enemy','background'])this.load.image(key,`assets/${key}.png`);for(const key of ['club','sling','mammoth'])this.load.spritesheet(key+'-attack',`assets/motions/${key}.png`,{frameWidth:512,frameHeight:256});this.load.on('loaderror',()=>{$('loading').textContent='이미지를 불러오지 못했습니다. 새로고침해 주세요.';});}
  create(){scene=this;this.bg=this.add.image(0,0,'background').setDepth(0);this.ally=this.add.image(0,0,'ally').setOrigin(.5,1).setDepth(2);this.enemy=this.add.image(0,0,'enemy').setOrigin(.5,1).setDepth(2);this.lines=this.add.graphics().setDepth(6);ready=['club','sling','mammoth','chief','bossmammoth','ally','enemy','background'].every(k=>this.textures.exists(k));if(ready)$('loading').remove();updateHud();if(storageWarning)toast('기존 저장 데이터를 읽지 못했습니다. 설정에서 저장코드를 불러올 수 있습니다.');}
  clearActors(){this.tweens.killAll();for(const a of this.transients||[])a.destroy();this.transients=new Set();this.tweens.resumeAll();for(const a of this.actors.values())a.destroy();this.actors.clear();this.accumulator=0;this.offset=undefined;this.noticeUntil=0;$('battle-notice').style.display='none';}
  layout(){
    const w=this.scale.width,h=this.scale.height;
    this.span=Math.min(1000,Math.max(490,w));this.factor=w/this.span;
    const players=battle.units.filter(u=>u.team===0),enemy=battle.units.filter(u=>u.team===1);
    const front=players.length?Math.max(...players.map(u=>u.x)):enemy.length?Math.min(...enemy.map(u=>u.x)):120;
    const desired=Math.max(0,Math.min(1000-this.span,front-this.span*.43));
    this.offset=this.offset===undefined?desired:this.offset+(desired-this.offset)*.05;
    this.ground=h*.81;this.project=x=>(x-this.offset)*this.factor;
    const bgWidth=Math.max(1000*this.factor,h*2);
    this.bg.setPosition(this.project(500),h/2).setDisplaySize(bgWidth,bgWidth/2);
    for(const [img,x] of [[this.ally,60],[this.enemy,940]]){
      const height=Math.min(155,h*.44)*this.factor,tex=img.texture.getSourceImage();
      img.setPosition(this.project(x),this.ground+7).setDisplaySize(height*tex.width/tex.height,height);
    }
    $('front-marker').style.left=`${Math.min(100,front/1000*100)}%`;
  }
  effects(e){const x=this.project(e.x??500),y=this.ground-35*this.factor;audio.effect(e);
    if(e.type==='warning'){this.noticeUntil=this.time.now+1500;$('battle-notice').textContent='보스 공격 준비!';$('battle-notice').style.display='block';}
    if(e.type==='spawn'&&e.kind>2){this.noticeUntil=this.time.now+3000;$('battle-notice').textContent=UNITS[e.kind].name+' 등장!';$('battle-notice').style.display='block';}
    if(e.type==='shot'){const dot=this.add.circle(x,y-18*this.factor,4*this.factor,0xc6c4b6).setStrokeStyle(2,0x594f43).setDepth(8);this.track(dot);const flight={t:0},end=this.project(e.to),startY=dot.y;this.tweens.add({targets:flight,t:1,duration:e.flight*1000,onUpdate:()=>dot.setPosition(x+(end-x)*flight.t,startY+18*this.factor*flight.t-Math.sin(Math.PI*flight.t)*70*this.factor),onComplete:()=>dot.destroy()});}
    if(e.type==='impact'||e.type==='death'){const heavy=e.kind===2||e.kind===4;if(heavy)this.cameras.main.shake(100,.002);for(let i=0;i<6;i++){const dot=this.add.circle(x,y,heavy?4:2,heavy?0xcba26c:0xffe4a0,.9).setDepth(8);this.track(dot);this.tweens.add({targets:dot,x:x+(i-2.5)*9*this.factor,y:y-12-Math.sin(i)*18,alpha:0,duration:260+i*25,onComplete:()=>dot.destroy()});}}
    if(e.type==='meteor'){const dot=this.add.circle(x-50,-30,13,0xe89a34).setDepth(8);this.tweens.add({targets:dot,x,y:this.ground-15,duration:260,onComplete:()=>{dot.destroy();this.cameras.main.shake(180,.005);const burst=this.add.circle(x,this.ground-20,90*this.factor,0xffb94f,.6).setDepth(7);this.tweens.add({targets:burst,alpha:0,scale:1.4,duration:350,onComplete:()=>burst.destroy()});}});}
    if(e.type==='slam')this.cameras.main.shake(150,.005);
    if(e.type==='repair'){const glow=this.add.circle(this.project(60),this.ground-45,45,0x78d793,.5).setDepth(8);this.tweens.add({targets:glow,alpha:0,scale:1.5,duration:450,onComplete:()=>glow.destroy()});}
  }
  track(object){this.transients??=new Set();this.transients.add(object);object.once('destroy',()=>this.transients.delete(object));return object;}
  update(_,delta){if(!ready)return;this.layout();
    if(!paused&&!battle.outcome){this.accumulator+=Math.min(delta/1000,.1);while(this.accumulator>=1/60){battle.step(1/60);this.accumulator-=1/60;}audio.music(battle.time);}
    this.lines.clear();const live=new Set();
    for(const u of battle.units){live.add(u.id);const d=UNITS[u.kind];let a=this.actors.get(u.id);if(!a){a=this.add.sprite(0,0,u.kind<3?d.key+'-attack':d.key).setOrigin(.5,1);this.actors.set(u.id,a);}const phase=u.attack?(u.attack.elapsed<d.windup?1:u.attack.elapsed<d.windup+.12?2:3):0;if(u.kind<3)a.setFrame(phase);const direction=u.team?-1:1,lunge=phase===2?(u.kind===2?15:9):phase===1?-3:0;const x=this.project(u.x),height=d.height*this.factor,y=this.ground+(u.id%3)*4+(u.attack?0:Math.sin(battle.time*9+u.id)*1.6);a.setFlipX(u.team===1).setDisplaySize(height*a.frame.realWidth/a.frame.realHeight,height).setPosition(x+direction*(lunge-(u.hurt>0?4:0))*this.factor,y).setAngle(u.kind>2?direction*(phase===2?10:phase===1?-5:0):0).setDepth(3+(u.id%3)*.1);if(u.hurt>0)a.setTint(0xffb29b);else a.clearTint();
      this.lines.fillStyle(u.team?0xbd5a50:0x438c79,.65);this.lines.fillEllipse(x,y+2,25*this.factor,5*this.factor);
      if(u.hp<u.maxHp||d.boss){const width=(d.boss?58:32)*this.factor;this.lines.fillStyle(0x193d2e,.55);this.lines.fillRect(x-width/2,y-height-8,width,4);this.lines.fillStyle(u.team?0xe26357:0x63ba85,1);this.lines.fillRect(x-width/2,y-height-8,width*Math.max(0,u.hp/u.maxHp),4);}
      if(u.windup>0){this.lines.fillStyle(0xe95c45,.16+.1*Math.sin(battle.time*15));this.lines.fillEllipse(x,this.ground,230*this.factor,35);this.lines.lineStyle(2,0xf67149,.9);this.lines.strokeEllipse(x,this.ground,230*this.factor,35);}
      if(battle.rush>0&&u.team===0){this.lines.lineStyle(2,0x9be5ad,.8);this.lines.strokeCircle(x,y-height/2,height*.55);}
    }
    for(const [id,a] of this.actors)if(!live.has(id)){a.destroy();this.actors.delete(id);}
    for(const e of battle.events.splice(0))this.effects(e);
    if(this.time.now>this.noticeUntil)$('battle-notice').style.display='none';
    if(this.time.now-this.hudTime>100){updateHud();this.hudTime=this.time.now;}
    if(battle.outcome&&!resultShown)finish();
  }
}
const field=$('field');
const game=new Phaser.Game({type:Phaser.CANVAS,parent:'field',width:field.clientWidth,height:field.clientHeight,backgroundColor:'#82b8c6',scene:Battlefield,audio:{noAudio:true},render:{antialias:true},scale:{mode:Phaser.Scale.RESIZE}});
new ResizeObserver(()=>game.scale.resize(field.clientWidth,field.clientHeight)).observe(field);
window.__LW={snapshot:()=>({stage:battle.stage,time:battle.time,food:battle.food,units:battle.units.map(u=>({id:u.id,kind:u.kind,team:u.team,x:u.x,hp:u.hp,attack:u.attack,frame:scene?.actors.get(u.id)?.frame.name})),outcome:battle.outcome,paused,ready,textures:scene?.textures.getTextureKeys(),progress:JSON.parse(JSON.stringify(progress))})};
updateHud();
startPwa(toast);
