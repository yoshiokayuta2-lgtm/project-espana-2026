const screens=[...document.querySelectorAll('.screen')];
const routeButtons=[...document.querySelectorAll('[data-route]')];
function show(route,smooth=true){const target=document.getElementById(route)?route:'home';screens.forEach(s=>s.classList.toggle('active',s.id===target));document.querySelectorAll('.bottom-nav [data-route]').forEach(b=>b.classList.toggle('active',b.dataset.route===target));history.replaceState(null,'',`#${target}`);window.scrollTo({top:0,behavior:smooth?'smooth':'auto'});setTimeout(observeReveals,60)}
routeButtons.forEach(b=>b.addEventListener('click',e=>{e.preventDefault();show(b.dataset.route)}));window.addEventListener('hashchange',()=>show(location.hash.slice(1),false));show(location.hash.slice(1)||'home',false);
const departure=new Date('2026-10-08T00:00:00+09:00');const days=Math.max(0,Math.ceil((departure-new Date())/86400000));document.getElementById('countdown').textContent=days;
const checks={passport:'パスポートの有効期限',insurance:'海外旅行保険',sagrada:'サグラダ・ファミリア予約',ave:'AVEの並び席',esim:'eSIM・海外通信'};
const checklist=document.getElementById('checklist');
const packingStorageKey='espana-packing-v1';
let customPacking=[];
try{customPacking=JSON.parse(localStorage.getItem(packingStorageKey)||'[]');if(!Array.isArray(customPacking))customPacking=[]}catch{customPacking=[]}
function progressCounts(){
  const fixedDone=Object.keys(checks).filter(k=>localStorage.getItem(`espana-${k}`)==='1').length;
  const customDone=customPacking.filter(x=>x.done).length;
  return {done:fixedDone+customDone,total:Object.keys(checks).length+customPacking.length};
}
function updateProgress(){
  const {done,total}=progressCounts();
  document.getElementById('checkProgress').textContent=`${done} / ${total}`;
  const detail=document.getElementById('checkProgressDetail');if(detail)detail.textContent=`${done} / ${total}`;
}
Object.entries(checks).forEach(([key,text])=>{
  const label=document.createElement('label');label.innerHTML=`<input type="checkbox"><span>${text}</span>`;
  const input=label.querySelector('input');input.checked=localStorage.getItem(`espana-${key}`)==='1';
  input.addEventListener('change',()=>{localStorage.setItem(`espana-${key}`,input.checked?'1':'0');updateProgress()});checklist.appendChild(label)
});
const customPackingEl=document.getElementById('customPacking');
const packingEmpty=document.getElementById('packingEmpty');
function savePacking(){localStorage.setItem(packingStorageKey,JSON.stringify(customPacking));renderPacking()}
function renderPacking(){
  customPackingEl.textContent='';
  customPacking.forEach(item=>{
    const row=document.createElement('div');row.className=`packing-item${item.done?' done':''}`;
    const label=document.createElement('label');
    const input=document.createElement('input');input.type='checkbox';input.checked=!!item.done;
    const span=document.createElement('span');span.textContent=item.text;
    input.addEventListener('change',()=>{item.done=input.checked;savePacking()});
    label.append(input,span);
    const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label',`${item.text}を削除`);
    remove.addEventListener('click',()=>{customPacking=customPacking.filter(x=>x.id!==item.id);savePacking()});
    row.append(label,remove);customPackingEl.appendChild(row);
  });
  packingEmpty.hidden=customPacking.length>0;updateProgress();
}
document.getElementById('packingForm').addEventListener('submit',e=>{
  e.preventDefault();const input=document.getElementById('packingInput');const text=input.value.trim();if(!text)return;
  customPacking.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),text,done:false});input.value='';savePacking();input.focus();
});
renderPacking();
const notes=document.getElementById('notes');notes.value=localStorage.getItem('espana-notes')||'';notes.addEventListener('input',()=>localStorage.setItem('espana-notes',notes.value));
const tripDays={'2026-10-08':{city:'Tokyo / Narita',title:'出発の日',img:'images/departure.png',items:[['Day','東京で過ごす','夜便に備えて余裕を持って移動'],['22:30','QR809 成田発','ドーハへ向けて出発']]},'2026-10-09':{city:'Madrid',title:'マドリード到着',img:'images/madrid.png',items:[['Morning','QR147','ドーハからマドリードへ'],['Afternoon','ホテルへ','Puerta del Sol 周辺'],['Evening','最初の街歩き','無理のないペースで']]},'2026-10-10':{city:'Madrid',title:'芸術とフラメンコ',img:'images/corral.png',items:[['Morning','王宮・美術館','マドリードの文化を楽しむ'],['21:30','Corral de la Morería','Dinner + Show']]},'2026-10-11':{city:'Madrid → Barcelona',title:'AVEで移動',img:'images/madrid.png',items:[['Morning','Atochaへ','余裕をもって駅へ'],['Train','AVE','Madrid → Barcelona']]},'2026-10-12':{city:'Barcelona',title:'バルセロナを歩く',img:'images/madrid.png',items:[['Morning','旧市街散策','ゴシック地区候補'],['Afternoon','ガウディ建築','街の空気を楽しむ']]},'2026-10-13':{city:'Barcelona',title:'旅のハイライト',img:'images/sagrada.png',items:[['Morning','サグラダ・ファミリア','受難のファサード候補'],['19:00','Cinc Sentits','特別なディナー']]},'2026-10-14':{city:'Barcelona → Doha',title:'スペイン最終日',img:'images/selfie.png',items:[['Morning','最後の街歩き','買い物とカフェ'],['16:35','QR146','ドーハへ']]},'2026-10-15':{city:'Doha → Narita',title:'帰国の日',img:'images/flight.png',items:[['Flight','QR806','成田へ'],['19:10','成田到着','おつかれさまでした']]}};
function key(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}function renderItems(el,items){el.innerHTML='';items.forEach(([time,title,desc])=>{const li=document.createElement('li');li.innerHTML=`<time>${time}</time><div><b>${title}</b><small>${desc}</small></div>`;el.appendChild(li)})}
function renderToday(){const now=new Date(),day=tripDays[key(now)];let data;if(day)data=day;else if(now<departure)data={city:'Before the journey',title:'旅が始まるまで',img:'images/planning.png',items:[['Next','サグラダ予約','10月13日午前候補'],['Check','AVEの並び席','2名並びを確認'],['Pack','通信と荷物','eSIM・変換プラグ']]};else data={city:'Our memories',title:'旅を振り返る',img:'images/selfie.png',items:[['Photos','写真を選ぶ','お気に入りをアルバムへ'],['Diary','言葉を残す','旅の空気を短い日記に']]};document.getElementById('todayPlace').textContent=data.city;document.getElementById('todayHomeTitle').textContent=data.title;document.getElementById('todayChip').textContent=day?key(now).slice(5).replace('-','/'):days+' days';document.getElementById('todayHomeImage').src=data.img;renderItems(document.getElementById('todayList'),data.items);document.getElementById('todayCity').textContent=data.city;document.getElementById('todayTitle').textContent=data.title;document.getElementById('todayHero').src=data.img;renderItems(document.getElementById('todaySchedule'),data.items)}renderToday();
const opening=document.getElementById('opening');function openOpening(){opening.classList.add('open');opening.setAttribute('aria-hidden','false');document.body.style.overflow='hidden'}function closeOpening(){opening.classList.remove('open');opening.setAttribute('aria-hidden','true');document.body.style.overflow='';sessionStorage.setItem('espana-opening','seen')}document.getElementById('openingEnter').addEventListener('click',closeOpening);document.getElementById('openingSkip').addEventListener('click',closeOpening);document.getElementById('replayOpening').addEventListener('click',openOpening);if(!sessionStorage.getItem('espana-opening'))openOpening();
function observeReveals(){const els=document.querySelectorAll('.screen.active .reveal:not(.visible)');if(!('IntersectionObserver'in window)){els.forEach(e=>e.classList.add('visible'));return}const obs=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');obs.unobserve(entry.target)}}),{threshold:.12});els.forEach(e=>obs.observe(e))}observeReveals();
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));

// Souvenir list: stored only on this device.
const souvenirStorageKey='espana-souvenirs-v1';
const souvenirForm=document.getElementById('souvenirForm');
const souvenirList=document.getElementById('souvenirList');
const souvenirEmpty=document.getElementById('souvenirEmpty');
const souvenirSummary=document.getElementById('souvenirSummary');
const souvenirProgress=document.getElementById('souvenirProgress');
let souvenirFilter='all';
let souvenirs=[];
try{souvenirs=JSON.parse(localStorage.getItem(souvenirStorageKey)||'[]');if(!Array.isArray(souvenirs))souvenirs=[]}catch{souvenirs=[]}
function saveSouvenirs(){localStorage.setItem(souvenirStorageKey,JSON.stringify(souvenirs));renderSouvenirs()}
function souvenirMatches(item){if(souvenirFilter==='all')return true;if(souvenirFilter==='open')return !item.done;return item.owner===souvenirFilter}
function renderSouvenirs(){
  souvenirList.textContent='';
  const visible=[...souvenirs].filter(souvenirMatches).sort((a,b)=>Number(a.done)-Number(b.done)||b.created-a.created);
  visible.forEach(item=>{
    const row=document.createElement('article');row.className=`souvenir-item${item.done?' done':''}`;
    const check=document.createElement('input');check.type='checkbox';check.className='souvenir-check';check.checked=!!item.done;check.setAttribute('aria-label',`${item.person}を購入済みにする`);check.addEventListener('change',()=>{item.done=check.checked;saveSouvenirs()});
    const main=document.createElement('div');main.className='souvenir-main';
    const person=document.createElement('b');person.textContent=`${item.person} × ${item.qty || 1}`;
    const owner=document.createElement('small');owner.className='souvenir-owner';owner.textContent=item.owner;
    main.append(person,owner);
    if(item.gift){const gift=document.createElement('small');gift.textContent=item.gift;main.appendChild(gift)}
    if(item.memo){const memo=document.createElement('em');memo.textContent=item.memo;main.appendChild(memo)}
    const actions=document.createElement('div');actions.className='souvenir-actions';
    const edit=document.createElement('button');edit.type='button';edit.textContent='✎';edit.title='編集';edit.addEventListener('click',()=>{
      const next=prompt('渡す相手を編集',item.person);if(next===null)return;const trimmed=next.trim();if(!trimmed)return;item.person=trimmed;saveSouvenirs();
    });
    const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.title='削除';remove.addEventListener('click',()=>{if(confirm(`${item.person}をリストから削除しますか？`)){souvenirs=souvenirs.filter(x=>x.id!==item.id);saveSouvenirs()}});
    actions.append(edit,remove);row.append(check,main,actions);souvenirList.appendChild(row);
  });
  const done=souvenirs.filter(x=>x.done).length;
  souvenirSummary.textContent=`${done} / ${souvenirs.length}件 購入済み`;
  souvenirProgress.textContent=`${souvenirs.length}件`;
  souvenirEmpty.hidden=visible.length>0;
}
souvenirForm.addEventListener('submit',e=>{
  e.preventDefault();
  const person=document.getElementById('souvenirPerson').value.trim();if(!person)return;
  souvenirs.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),person,owner:document.getElementById('souvenirOwner').value,qty:Math.max(1,Number(document.getElementById('souvenirQty').value)||1),gift:document.getElementById('souvenirItem').value.trim(),memo:document.getElementById('souvenirMemo').value.trim(),done:false,created:Date.now()});
  saveSouvenirs();souvenirForm.reset();document.getElementById('souvenirQty').value='1';document.getElementById('souvenirPerson').focus();
});
document.querySelectorAll('#souvenirFilters [data-filter]').forEach(button=>button.addEventListener('click',()=>{souvenirFilter=button.dataset.filter;document.querySelectorAll('#souvenirFilters [data-filter]').forEach(b=>b.classList.toggle('active',b===button));renderSouvenirs()}));
renderSouvenirs();


// Emergency information: stored only on this device.
const emergencyStorageKey='espana-emergency-v1';
let emergencyData={};
try{emergencyData=JSON.parse(localStorage.getItem(emergencyStorageKey)||'{}')||{}}catch{emergencyData={}}
const emergencyFields=[...document.querySelectorAll('[data-emergency-field]')];
function normalizePhone(value){return value.replace(/[^+\d]/g,'')}
function updateEmergencyCallLinks(){
  const insurance=normalizePhone(emergencyData.insurancePhone||'');
  const card=normalizePhone(emergencyData.cardPhone||'');
  const insuranceLink=document.getElementById('insuranceCallLink');const cardLink=document.getElementById('cardCallLink');
  if(insurance){insuranceLink.href=`tel:${insurance}`;insuranceLink.classList.remove('disabled');document.getElementById('insuranceCallLabel').textContent=emergencyData.insurancePhone}
  else{insuranceLink.href='#';insuranceLink.classList.add('disabled');document.getElementById('insuranceCallLabel').textContent='番号を登録'}
  if(card){cardLink.href=`tel:${card}`;cardLink.classList.remove('disabled');document.getElementById('cardCallLabel').textContent=emergencyData.cardPhone}
  else{cardLink.href='#';cardLink.classList.add('disabled');document.getElementById('cardCallLabel').textContent='番号を登録'}
}
emergencyFields.forEach(input=>{
  const key=input.dataset.emergencyField;input.value=emergencyData[key]||'';
  input.addEventListener('input',()=>{
    emergencyData[key]=input.value;localStorage.setItem(emergencyStorageKey,JSON.stringify(emergencyData));updateEmergencyCallLinks();
    const status=document.getElementById('emergencySaveStatus');status.textContent='保存しました';clearTimeout(window.__emergencyTimer);window.__emergencyTimer=setTimeout(()=>status.textContent='入力すると自動保存されます。',1300);
  });
});
document.querySelectorAll('.mini-call.disabled').forEach(link=>link.addEventListener('click',e=>{if(link.classList.contains('disabled')){e.preventDefault();document.querySelector('[data-emergency-field="'+(link.id==='cardCallLink'?'cardPhone':'insurancePhone')+'"]').focus()}}));
updateEmergencyCallLinks();

// v4.0 name migration for data saved in older versions.
(function migrateOwnerNames(){
  try{
    let changed=false;
    souvenirs.forEach(item=>{if(item.owner==='佑太'){item.owner='Yuta';changed=true}if(item.owner==='裕子'){item.owner='Yuko';changed=true}if(item.owner==='二人'){item.owner='Together';changed=true}});
    if(changed){localStorage.setItem('espana-souvenirs-v1',JSON.stringify(souvenirs));renderSouvenirs()}
  }catch{}
})();

// Memories: photos are compressed and stored in IndexedDB on this device only.
const memoryDbName='espana-memories-db';
const memoryStore='photos';
const memoryDayLabels={
  '2026-10-08':'Day 1 · Oct 8','2026-10-09':'Day 2 · Oct 9','2026-10-10':'Day 3 · Oct 10','2026-10-11':'Day 4 · Oct 11',
  '2026-10-12':'Day 5 · Oct 12','2026-10-13':'Day 6 · Oct 13','2026-10-14':'Day 7 · Oct 14','2026-10-15':'Day 8 · Oct 15'
};
function openMemoryDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open(memoryDbName,1);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(memoryStore)){const store=db.createObjectStore(memoryStore,{keyPath:'id'});store.createIndex('day','day')}};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function memoryAll(){const db=await openMemoryDb();return new Promise((resolve,reject)=>{const req=db.transaction(memoryStore,'readonly').objectStore(memoryStore).getAll();req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error)})}
async function memoryPut(item){const db=await openMemoryDb();return new Promise((resolve,reject)=>{const req=db.transaction(memoryStore,'readwrite').objectStore(memoryStore).put(item);req.onsuccess=()=>resolve();req.onerror=()=>reject(req.error)})}
async function memoryDelete(id){const db=await openMemoryDb();return new Promise((resolve,reject)=>{const req=db.transaction(memoryStore,'readwrite').objectStore(memoryStore).delete(id);req.onsuccess=()=>resolve();req.onerror=()=>reject(req.error)})}
function fileToCompressedBlob(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(reader.error);reader.onload=()=>{const img=new Image();img.onerror=()=>reject(new Error('画像を読み込めませんでした'));img.onload=()=>{const max=1600;const scale=Math.min(1,max/Math.max(img.width,img.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,canvas.width,canvas.height);canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('画像を保存できませんでした')),'image/jpeg',.82)};img.src=reader.result};reader.readAsDataURL(file)})}
const memoryGallery=document.getElementById('memoryGallery');
const memoryEmpty=document.getElementById('memoryEmpty');
const memoryStatus=document.getElementById('memoryStatus');
let memoryObjectUrls=[];
function clearMemoryUrls(){memoryObjectUrls.forEach(URL.revokeObjectURL);memoryObjectUrls=[]}
function openMemoryModal(src,caption){const modal=document.getElementById('memoryModal');document.getElementById('memoryModalImage').src=src;document.getElementById('memoryModalCaption').textContent=caption||'';modal.hidden=false;document.body.classList.add('memory-modal-open')}
function closeMemoryModal(){const modal=document.getElementById('memoryModal');modal.hidden=true;document.getElementById('memoryModalImage').src='';document.body.classList.remove('memory-modal-open')}
document.getElementById('memoryModalClose').addEventListener('click',closeMemoryModal);document.getElementById('memoryModal').addEventListener('click',e=>{if(e.target.id==='memoryModal')closeMemoryModal()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMemoryModal()});
async function renderMemories(){
  if(!memoryGallery)return;
  clearMemoryUrls();memoryGallery.textContent='';
  let items=[];try{items=await memoryAll()}catch{memoryStatus.textContent='このブラウザでは写真保存を利用できません。';return}
  items.sort((a,b)=>a.day.localeCompare(b.day)||a.created-b.created);
  const grouped={};items.forEach(item=>(grouped[item.day]??=[]).push(item));
  Object.entries(grouped).forEach(([day,photos])=>{
    const section=document.createElement('section');section.className='memory-day';
    const head=document.createElement('div');head.className='memory-day-head';head.innerHTML=`<h2>${memoryDayLabels[day]||day}</h2><span>${photos.length} photos</span>`;
    const grid=document.createElement('div');grid.className='memory-grid';
    photos.forEach(item=>{
      const figure=document.createElement('figure');figure.className='memory-card';
      const url=URL.createObjectURL(item.blob);memoryObjectUrls.push(url);
      const img=document.createElement('img');img.src=url;img.alt=item.caption||memoryDayLabels[item.day]||'思い出の写真';img.loading='lazy';img.addEventListener('click',()=>openMemoryModal(url,item.caption));
      const del=document.createElement('button');del.className='memory-delete';del.type='button';del.textContent='×';del.setAttribute('aria-label','写真を削除');del.addEventListener('click',async()=>{if(confirm('この写真を端末内のアルバムから削除しますか？')){await memoryDelete(item.id);renderMemories()}});
      figure.append(img,del);if(item.caption){const cap=document.createElement('figcaption');cap.textContent=item.caption;figure.appendChild(cap)}grid.appendChild(figure)
    });section.append(head,grid);memoryGallery.appendChild(section)
  });
  const count=items.length;document.getElementById('memoryCount').textContent=`${count}枚`;document.getElementById('memoryProgress').textContent=`${count}枚`;memoryEmpty.hidden=count>0;
}
document.getElementById('memoryForm').addEventListener('submit',async e=>{
  e.preventDefault();const files=[...document.getElementById('memoryFiles').files];if(!files.length){memoryStatus.textContent='追加する写真を選んでください。';return}
  const day=document.getElementById('memoryDay').value;const caption=document.getElementById('memoryCaption').value.trim();const button=e.currentTarget.querySelector('button[type="submit"]');button.disabled=true;memoryStatus.textContent=`${files.length}枚を保存しています…`;
  try{for(const [index,file] of files.entries()){const blob=await fileToCompressedBlob(file);await memoryPut({id:`${Date.now()}-${index}-${Math.random().toString(36).slice(2,7)}`,day,caption,blob,created:Date.now()+index})}document.getElementById('memoryFiles').value='';document.getElementById('memoryCaption').value='';memoryStatus.textContent=`${files.length}枚をこの端末に保存しました。`;await renderMemories()}catch(error){console.error(error);memoryStatus.textContent='保存できませんでした。端末の空き容量や写真形式を確認してください。'}finally{button.disabled=false}
});
renderMemories();
