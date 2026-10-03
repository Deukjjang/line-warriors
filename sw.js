const BUILD_ID="line-warriors-6c62561d38975639";
const FILES=["app.js","assets/ally.png","assets/background.png","assets/bossmammoth.png","assets/chief.png","assets/club.png","assets/enemy.png","assets/mammoth.png","assets/motions/club.png","assets/motions/mammoth.png","assets/motions/sling.png","assets/sling.png","audio.js","icons/apple-touch-icon.png","icons/icon-192.png","icons/icon-512.png","index.html","manifest.webmanifest","mobile.css","model.js","pwa.js","styles.css","vendor/LUCIDE-LICENSE","vendor/PHASER-LICENSE.md","vendor/lucide.min.js","vendor/phaser.min.js","version.js"];
const scopeTag=encodeURIComponent(new URL(self.registration.scope).pathname);
const prefix='lw-pwa-'+scopeTag+'-';
const cacheName=prefix+BUILD_ID;
const base=new URL('./',self.location.href);
const urls=new Set(FILES.map(file=>new URL(file,base).href));

self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(cacheName);
  try{await cache.addAll([...urls].map(url=>new Request(url,{cache:'reload'})));}
  catch(error){await caches.delete(cacheName);throw error;}
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  for(const name of await caches.keys())if(name.startsWith(prefix)&&name!==cacheName)await caches.delete(name);
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 const url=new URL(request.url);
 if(url.origin!==base.origin||!url.pathname.startsWith(base.pathname))return;
 const isEntry=request.mode==='navigate'&&(url.pathname===base.pathname||url.pathname===base.pathname+'index.html');
 const clean=new URL(url);clean.search='';clean.hash='';
 const key=isEntry?new URL('index.html',base).href:clean.href;
 if(!urls.has(key))return;
 event.respondWith((async()=>{
  const saved=await caches.match(key,{cacheName});
  return saved||fetch(request);
 })());
});
