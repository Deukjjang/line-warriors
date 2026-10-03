const BUILD_ID="line-warriors-05f6b74865d65afc";
const FILES=["app.js","assets-v3/ally.png","assets-v3/apc.png","assets-v3/archer.png","assets-v3/armored.png","assets-v3/autocannon.png","assets-v3/background.png","assets-v3/base-future.png","assets-v3/base-gunpowder.png","assets-v3/base-medieval.png","assets-v3/base-modern.png","assets-v3/base-prehistoric.png","assets-v3/bg-future.png","assets-v3/bg-gunpowder.png","assets-v3/bg-medieval.png","assets-v3/bg-modern.png","assets-v3/bigcannon.png","assets-v3/bossmammoth.png","assets-v3/cannon.png","assets-v3/catapult.png","assets-v3/chief.png","assets-v3/club.png","assets-v3/core.png","assets-v3/crossbow.png","assets-v3/drone.png","assets-v3/enemy.png","assets-v3/fort-cannon.png","assets-v3/helicopter.png","assets-v3/knight.png","assets-v3/laser-turret.png","assets-v3/laser.png","assets-v3/mammoth.png","assets-v3/motions/archer.png","assets-v3/motions/armored.png","assets-v3/motions/cannon.png","assets-v3/motions/club.png","assets-v3/motions/drone.png","assets-v3/motions/knight.png","assets-v3/motions/laser.png","assets-v3/motions/mammoth.png","assets-v3/motions/musket.png","assets-v3/motions/rifle.png","assets-v3/motions/robot.png","assets-v3/motions/sling.png","assets-v3/motions/sniper.png","assets-v3/motions/sword.png","assets-v3/motions/tank.png","assets-v3/musket.png","assets-v3/ram.png","assets-v3/rifle.png","assets-v3/robot.png","assets-v3/satellite.png","assets-v3/sling.png","assets-v3/sniper.png","assets-v3/sword.png","assets-v3/tank.png","assets-v3/wagon.png","assets-v3/wood-sling.png","assets-v4/walk/archer.png","assets-v4/walk/armored.png","assets-v4/walk/cannon.png","assets-v4/walk/club.png","assets-v4/walk/drone.png","assets-v4/walk/knight.png","assets-v4/walk/laser.png","assets-v4/walk/mammoth.png","assets-v4/walk/musket.png","assets-v4/walk/rifle.png","assets-v4/walk/robot.png","assets-v4/walk/sling.png","assets-v4/walk/sniper.png","assets-v4/walk/sword.png","assets-v4/walk/tank.png","assets/ally.png","assets/background.png","assets/bossmammoth.png","assets/chief.png","assets/club.png","assets/enemy.png","assets/mammoth.png","assets/motions/club.png","assets/motions/mammoth.png","assets/motions/sling.png","assets/sling.png","audio.js","combat-effects.js","data.js","icons/apple-touch-icon.png","icons/icon-192.png","icons/icon-512.png","index.html","lobby.js","manifest.webmanifest","mobile.css","model.js","movement.js","pwa.js","save.js","shop.js","styles.css","vendor/LUCIDE-LICENSE","vendor/PHASER-LICENSE.md","vendor/lucide.min.js","vendor/phaser.min.js","version.js"];
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
