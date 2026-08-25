const CACHE='espana-v4.4.3';
const ASSETS=['./','index.html','css/style.css?v=4.4.3','js/app.js?v=4.4.3','manifest.webmanifest','icons/icon-180.png','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png','images/planning.png','images/madrid.png','images/corral.png','images/sagrada.png','images/selfie.png','images/departure.png','images/flight.png','images/couple.png'];
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put('./',copy));return response}).catch(()=>caches.match('./')));
    return;
  }
  event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy))}return response}).catch(()=>caches.match(request)));
});
