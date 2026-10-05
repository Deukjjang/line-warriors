import {UNITS} from './data.js';
const noiseBuffers=new WeakMap();
function noiseBuffer(context){
  if(noiseBuffers.has(context))return noiseBuffers.get(context);
  const buffer=context.createBuffer(1,context.sampleRate,context.sampleRate),data=buffer.getChannelData(0);
  let seed=34271;
  for(let i=0;i<data.length;i++){seed=(seed*1664525+1013904223)>>>0;data[i]=seed/2147483648-1;}
  noiseBuffers.set(context,buffer);return buffer;
}
function envelope(context,output,when,duration,peak){
  const gain=context.createGain();gain.gain.setValueAtTime(0.0001,when);
  gain.gain.linearRampToValueAtTime(peak,when+0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001,when+duration);
  gain.connect(output);return gain;
}
function pitched(c,out,time,start,end,duration,volume,type='sine'){
  const oscillator=c.createOscillator(),gain=envelope(c,out,time,duration,volume);
  oscillator.type=type;oscillator.frequency.setValueAtTime(start,time);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(12,end),time+duration);
  oscillator.connect(gain);oscillator.start(time);oscillator.stop(time+duration+0.01);
  oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
}
function burst(c,out,time,duration,volume,frequency,filterType='lowpass'){
  const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=envelope(c,out,time,duration,volume);
  source.buffer=noiseBuffer(c);filter.type=filterType;filter.frequency.setValueAtTime(frequency,time);filter.Q.value=0.8;
  source.connect(filter);filter.connect(gain);source.start(time,0.13,duration);source.stop(time+duration+0.01);
  source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
}
export function renderEffect(c,out,flavor,when=c.currentTime,volume=1){
  const tone=(a,b,d,v,type='sine',delay=0)=>pitched(c,out,when+delay,a,b,d,v*volume,type);
  const noise=(d,v,f,type='lowpass',delay=0)=>burst(c,out,when+delay,d,v*volume,f,type);
  switch(flavor){
    case 'gunshot': noise(.045,.38,4200,'highpass');tone(175,58,.12,.2);noise(.13,.08,1100,'bandpass',.02);break;
    case 'cannonShot': tone(95,24,.52,.42);noise(.12,.3,2100);noise(.45,.11,380,'lowpass',.035);break;
    case 'laserShot': tone(1800,290,.18,.11,'sawtooth');tone(850,140,.24,.1,'triangle');noise(.08,.06,5000,'highpass');break;
    case 'arrowShot': noise(.08,.13,3100,'bandpass');tone(430,190,.095,.09,'triangle');break;
    case 'shield': tone(240,520,.45,.07,'triangle');tone(480,1040,.55,.05,'sine',.06);break;
    case 'clubSwing': noise(.17,.09,1700,'bandpass');tone(230,100,.13,.025,'triangle');break;
    case 'clubImpact': tone(155,48,.24,.32);noise(.095,.28,1700,'bandpass');tone(510,240,.06,.075,'triangle');tone(95,65,.13,.06,'sine',.025);break;
    case 'stoneThrow': noise(.16,.095,2700,'bandpass');tone(1050,680,.12,.035,'sine');break;
    case 'stoneImpact': noise(.085,.33,1400,'highpass');tone(770,510,.095,.13,'triangle');tone(235,120,.16,.095);break;
    case 'mammothWindup': tone(125,180,.3,.11,'sawtooth');noise(.24,.085,420);tone(64,50,.22,.085);break;
    case 'mammothImpact': tone(105,32,.42,.45);noise(.19,.34,600);tone(165,74,.23,.14,'triangle');noise(.32,.085,240,'lowpass',.035);break;
    case 'slam': tone(95,28,.5,.48);noise(.28,.4,900);tone(160,55,.28,.17,'triangle');break;
    case 'meteor': noise(.65,.4,1450);tone(85,25,.64,.45);noise(.18,.24,3300,'highpass');break;
    case 'repair': tone(330,440,.19,.05,'sine');tone(440,660,.22,.05,'sine',.08);break;
    case 'spawn': tone(360,220,.08,.035,'triangle');break;
    case 'warning': tone(170,150,.2,.055,'sawtooth');break;
  }
}
export class BattleAudio {
  constructor(settings){this.settings=settings;this.context=null;this.output=null;this.last=new Map();this.note=0;this.nextNote=0;}
  wake(){
    try{
      if(!this.context){
        this.context=new(window.AudioContext||window.webkitAudioContext)();
        const limiter=this.context.createDynamicsCompressor();limiter.threshold.value=-16;limiter.knee.value=15;limiter.ratio.value=8;limiter.attack.value=.003;limiter.release.value=.12;
        const volume=this.context.createGain();volume.gain.value=.72;limiter.connect(volume);volume.connect(this.context.destination);this.output=limiter;
      }
      if(this.context.state==='suspended')this.context.resume().catch(()=>{});
    }catch{}
  }
  effect(e){
    if(!this.settings().sound||!this.context||this.context.state!=='running')return;
    let flavor=e.type;
    const mammoth=e.kind===2||e.kind===4,projectile=e.projectile??UNITS[e.kind]?.projectile;
    if(e.type==='attack')flavor=mammoth?'mammothWindup':e.kind===1?null:'clubSwing';
    if(e.type==='shot')flavor=projectile==='stone'?'stoneThrow':projectile==='arrow'?'arrowShot':projectile==='bullet'?'gunshot':['laser','plasma'].includes(projectile)?'laserShot':'cannonShot';
    if(e.type==='impact')flavor=mammoth?'mammothImpact':projectile==='stone'?'stoneImpact':['shell','missile','drone','plasma'].includes(projectile)?'cannonShot':'clubImpact';
    if(e.type==='attack'&&projectile)flavor=null;
    if(e.type==='meteor')flavor=null;
    if(e.type==='meteor-impact'||e.type==='bombard-impact')flavor='meteor';
    if(!flavor||!['gunshot','cannonShot','laserShot','arrowShot','shield','clubSwing','clubImpact','stoneThrow','stoneImpact','mammothWindup','mammothImpact','slam','meteor','repair','spawn','warning'].includes(flavor))return;
    const now=this.context.currentTime,last=this.last.get(flavor)??-10;
    if(now-last<(mammoth ? 0.1 : 0.045))return;this.last.set(flavor,now);
    renderEffect(this.context,this.output,flavor,now,e.team===1 ? 0.8 : 1);
  }
  music(time){
    if(this.settings().music&&this.context?.state==='running'&&time>this.nextNote){
      this.nextNote=time+.65;const note=[196,246.94,293.66,246.94,220,196,146.83,196][this.note++%8];
      pitched(this.context,this.output,this.context.currentTime,note,note,.3,.025,'triangle');
    }
  }
  pause(){if(this.context?.state==='running')this.context.suspend().catch(()=>{});}
}
