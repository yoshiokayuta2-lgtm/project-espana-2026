const CACHE='espana-v4.4.7';
const ASSETS=['./','index.html','css/style.css?v=4.4.7','js/app.js?v=4.4.7','manifest.webmanifest','icons/icon-180.png','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png','images/planning.png?v=4.4.7','images/madrid.png?v=4.4.7','images/corral.png?v=4.4.7','images/sagrada.png?v=4.4.7','images/selfie.png?v=4.4.7','images/departure.png?v=4.4.7','images/flight.png?v=4.4.7','images/couple.png?v=4.4.7'];
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
