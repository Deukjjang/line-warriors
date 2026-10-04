export async function startPwa(notify){
 if(!window.isSecureContext||!('serviceWorker' in navigator))return;
 try{
  const registration=await navigator.serviceWorker.register(new URL('./sw.js',document.baseURI),{updateViaCache:'none'});
  let announced=false;
  const watched=new WeakSet();
  const installed=()=>{
   if(announced)return;announced=true;
   if(!navigator.serviceWorker.controller)notify('오프라인 저장 완료');
  };
  const watch=worker=>{
   if(!worker||watched.has(worker))return;
   watched.add(worker);
   const updating=!!navigator.serviceWorker.controller;
   worker.addEventListener('statechange',()=>{
    if(worker.state==='installed'){
     if(updating)notify('업데이트 준비 완료 · 게임을 닫고 다시 열어 주세요');
     else installed();
    }
   });
  };
  watch(registration.installing);
  registration.addEventListener('updatefound',()=>watch(registration.installing));
  if(registration.waiting)notify('업데이트 준비 완료 · 게임을 닫고 다시 열어 주세요');
 }catch{
  notify('오프라인 저장에 실패했습니다. 인터넷 연결 상태에서 다시 실행해 주세요.');
 }
}
