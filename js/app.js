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

// v4.3 Fun: Coin Flip, Achievements and 100 practical Spanish phrases.
const funStore={
  get(key,fallback){try{const value=JSON.parse(localStorage.getItem(key));return value??fallback}catch{return fallback}},
  set(key,value){localStorage.setItem(key,JSON.stringify(value))}
};
const coin=document.getElementById('coin');
const flipCoinButton=document.getElementById('flipCoin');
if(flipCoinButton)flipCoinButton.addEventListener('click',()=>{
  if(coin.classList.contains('flipping'))return;
  const winner=Math.random()<.5?'Yuta':'Yuko';
  const topic=document.getElementById('coinTopic').value;
  coin.querySelector('.coin-front').textContent=winner[0];coin.querySelector('.coin-back').textContent=winner[0];
  document.getElementById('coinResult').textContent='コインが決めています…';
  coin.classList.add('flipping');
  setTimeout(()=>{coin.classList.remove('flipping');document.getElementById('coinResult').textContent=`✨ ${topic}は ${winner} が決める！`;funStore.set('espana-last-coin',{winner,topic,date:Date.now()})},1150);
});

const phraseRows=`
greeting|Hola.|オラ|こんにちは|お店やホテルで最初に
greeting|Buenos días.|ブエノス ディアス|おはようございます|午前中のあいさつ
greeting|Buenas tardes.|ブエナス タルデス|こんにちは|午後のあいさつ
greeting|Buenas noches.|ブエナス ノーチェス|こんばんは／おやすみなさい|夜のあいさつ
greeting|Adiós.|アディオス|さようなら|別れ際に
greeting|Hasta luego.|アスタ ルエゴ|またあとで|気軽な別れ際に
greeting|Por favor.|ポル ファボール|お願いします|依頼するとき
greeting|Gracias.|グラシアス|ありがとう|いつでも使える
greeting|Muchas gracias.|ムーチャス グラシアス|本当にありがとう|丁寧に感謝するとき
greeting|De nada.|デ ナダ|どういたしまして|お礼を言われたとき
greeting|Perdón.|ペルドン|すみません|軽く謝る・呼びかける
greeting|Disculpe.|ディスクルペ|失礼します|丁寧に声をかける
greeting|No entiendo.|ノ エンティエンド|わかりません|聞き取れないとき
greeting|¿Puede repetirlo?|プエデ レペティルロ|もう一度言っていただけますか？|聞き返すとき
greeting|Más despacio, por favor.|マス デスパシオ ポル ファボール|もう少しゆっくりお願いします|会話が速いとき
greeting|¿Habla inglés?|アブラ イングレス|英語を話せますか？|英語で確認したいとき
greeting|Hablo un poco de español.|アブロ ウン ポコ デ エスパニョール|スペイン語を少し話します|会話の最初に
greeting|Mucho gusto.|ムーチョ グスト|はじめまして|自己紹介で
food|Una mesa para dos, por favor.|ウナ メサ パラ ドス ポル ファボール|2人用の席をお願いします|レストランの受付で
food|Tenemos una reserva.|テネモス ウナ レセルバ|予約しています|予約名を伝える前に
food|La reserva está a nombre de Yuta.|ラ レセルバ エスタ ア ノンブレ デ ユウタ|Yutaの名前で予約しています|予約確認で
food|¿Tiene una mesa libre?|ティエネ ウナ メサ リブレ|空いている席はありますか？|予約なしで入店するとき
food|El menú, por favor.|エル メヌ ポル ファボール|メニューをお願いします|席について
food|¿Tiene menú en inglés?|ティエネ メヌ エン イングレス|英語のメニューはありますか？|メニュー確認
food|¿Qué recomienda?|ケ レコミエンダ|おすすめは何ですか？|料理を選ぶとき
food|Quisiera esto.|キシエラ エスト|これをお願いします|指さして注文
food|Para mí, esto.|パラ ミ エスト|私はこれにします|注文時
food|Para compartir.|パラ コンパルティル|シェアします|料理を二人で分けるとき
food|Sin cebolla, por favor.|シン セボージャ ポル ファボール|玉ねぎ抜きでお願いします|苦手な食材を外す
food|Sin picante, por favor.|シン ピカンテ ポル ファボール|辛くしないでください|辛さを避けたいとき
food|¿Esto lleva frutos secos?|エスト ジェバ フルートス セコス|これはナッツが入っていますか？|アレルギー確認
food|Soy alérgico a...|ソイ アレルヒコ ア|…にアレルギーがあります|男性が伝える場合
food|Soy alérgica a...|ソイ アレルヒカ ア|…にアレルギーがあります|女性が伝える場合
food|Agua sin gas, por favor.|アグア シン ガス ポル ファボール|炭酸なしの水をお願いします|水を注文
food|Agua con gas, por favor.|アグア コン ガス ポル ファボール|炭酸水をお願いします|水を注文
food|Dos copas de vino tinto.|ドス コパス デ ビノ ティント|赤ワインを2杯ください|ワイン注文
food|Una cerveza, por favor.|ウナ セルベサ ポル ファボール|ビールを1杯お願いします|飲み物注文
food|¡Salud!|サルー|乾杯！|グラスを合わせるとき
food|Está muy rico.|エスタ ムイ リコ|とてもおいしいです|感想を伝える
food|La cuenta, por favor.|ラ クエンタ ポル ファボール|お会計をお願いします|食事の最後に
food|¿Podemos pagar por separado?|ポデモス パガール ポル セパラード|別々に払えますか？|個別会計を確認
food|¿Aceptan tarjeta?|アセプタン タルヘタ|カードは使えますか？|支払い前に
food|¿El servicio está incluido?|エル セルビシオ エスタ インクルイド|サービス料は含まれていますか？|会計確認
hotel|Tenemos una reserva para dos noches.|テネモス ウナ レセルバ パラ ドス ノーチェス|2泊で予約しています|チェックイン時
hotel|Quisiera hacer el check-in.|キシエラ アセル エル チェックイン|チェックインをお願いします|フロントで
hotel|Quisiera hacer el check-out.|キシエラ アセル エル チェックアウト|チェックアウトをお願いします|出発時
hotel|¿A qué hora es el desayuno?|ア ケ オラ エス エル デサジュノ|朝食は何時ですか？|ホテルで
hotel|¿Dónde está el ascensor?|ドンデ エスタ エル アセンソール|エレベーターはどこですか？|館内で
hotel|¿Cuál es la contraseña del wifi?|クアル エス ラ コントラセーニャ デル ワイファイ|Wi-Fiのパスワードは何ですか？|ホテルで
hotel|La habitación está muy fría.|ラ アビタシオン エスタ ムイ フリア|部屋がとても寒いです|室温の相談
hotel|La habitación está muy caliente.|ラ アビタシオン エスタ ムイ カリエンテ|部屋がとても暑いです|室温の相談
hotel|No funciona el aire acondicionado.|ノ フンシオナ エル アイレ アコンディシオナード|エアコンが動きません|設備トラブル
hotel|No hay agua caliente.|ノ アイ アグア カリエンテ|お湯が出ません|設備トラブル
hotel|Necesitamos dos toallas más.|ネセシタモス ドス トアージャス マス|タオルを2枚追加でお願いします|フロントへ
hotel|¿Puede guardar nuestro equipaje?|プエデ グアルダール ヌエストロ エキパヘ|荷物を預かってもらえますか？|チェックイン前後
hotel|¿Puede llamar a un taxi?|プエデ ジャマール ア ウン タクシ|タクシーを呼んでもらえますか？|ホテルから移動
hotel|¿Hay una caja fuerte?|アイ ウナ カハ フエルテ|金庫はありますか？|部屋の設備確認
hotel|¿Puede ayudarnos?|プエデ アジュダールノス|手伝っていただけますか？|困ったとき
shopping|¿Cuánto cuesta?|クアント クエスタ|いくらですか？|値段を聞く
shopping|Solo estoy mirando.|ソロ エストイ ミランド|見ているだけです|店員に声をかけられたとき
shopping|Me gusta este.|メ グスタ エステ|これが気に入りました|商品を選ぶ
shopping|¿Tiene otro color?|ティエネ オトロ コロール|別の色はありますか？|色違いを探す
shopping|¿Tiene una talla más grande?|ティエネ ウナ タージャ マス グランデ|もう1サイズ大きいものはありますか？|服を買う
shopping|¿Tiene una talla más pequeña?|ティエネ ウナ タージャ マス ペケーニャ|もう1サイズ小さいものはありますか？|服を買う
shopping|¿Puedo probármelo?|プエド プロバルメロ|試着できますか？|服を買う
shopping|Me lo llevo.|メ ロ ジェボ|これを買います|購入を決めたとき
shopping|¿Puede envolverlo para regalo?|プエデ エンボルベールロ パラ レガロ|プレゼント用に包めますか？|お土産購入
shopping|¿Tiene una bolsa?|ティエネ ウナ ボルサ|袋はありますか？|会計時
shopping|No necesito bolsa.|ノ ネセシト ボルサ|袋はいりません|会計時
shopping|¿Dónde está la caja?|ドンデ エスタ ラ カハ|レジはどこですか？|店内で
shopping|¿Puedo pagar en efectivo?|プエド パガール エン エフェクティボ|現金で払えますか？|支払い時
shopping|¿Me da un recibo?|メ ダ ウン レシボ|レシートをいただけますか？|支払い後
transport|¿Dónde está la estación?|ドンデ エスタ ラ エスタシオン|駅はどこですか？|道を尋ねる
transport|¿Dónde está la parada de autobús?|ドンデ エスタ ラ パラダ デ アウトブス|バス停はどこですか？|移動時
transport|¿Dónde está la parada de taxis?|ドンデ エスタ ラ パラダ デ タクシス|タクシー乗り場はどこですか？|移動時
transport|Dos billetes, por favor.|ドス ビジェテス ポル ファボール|切符を2枚お願いします|券売窓口で
transport|¿Este tren va a Barcelona?|エステ トレン バ ア バルセロナ|この列車はバルセロナへ行きますか？|列車確認
transport|¿A qué hora sale?|ア ケ オラ サレ|何時に出発しますか？|時刻確認
transport|¿A qué hora llega?|ア ケ オラ ジェガ|何時に到着しますか？|時刻確認
transport|¿De qué andén sale?|デ ケ アンデン サレ|何番ホームから出ますか？|駅で
transport|¿Dónde hacemos transbordo?|ドンデ アセモス トランスボルド|どこで乗り換えますか？|乗換確認
transport|¿Se puede ir andando?|セ プエデ イル アンダンド|歩いて行けますか？|街歩き
transport|A este lugar, por favor.|ア エステ ルガール ポル ファボール|この場所までお願いします|タクシーで画面を見せる
transport|Pare aquí, por favor.|パレ アキ ポル ファボール|ここで止めてください|タクシーで
transport|¿Cuánto tarda?|クアント タルダ|どれくらい時間がかかりますか？|所要時間確認
transport|Estamos perdidos.|エスタモス ペルディドス|道に迷いました|二人で迷ったとき
trouble|¿Dónde está el baño?|ドンデ エスタ エル バニョ|トイレはどこですか？|最重要フレーズ
trouble|Necesito ayuda.|ネセシト アジュダ|助けが必要です|緊急時
trouble|Llame a la policía, por favor.|ジャメ ア ラ ポリシア ポル ファボール|警察を呼んでください|事件・盗難時
trouble|Llame a una ambulancia.|ジャメ ア ウナ アンブランシア|救急車を呼んでください|体調不良時
trouble|Necesito un médico.|ネセシト ウン メディコ|医師が必要です|医療機関で
trouble|¿Dónde está la farmacia?|ドンデ エスタ ラ ファルマシア|薬局はどこですか？|薬が必要なとき
trouble|Me duele aquí.|メ ドゥエレ アキ|ここが痛いです|指さして伝える
trouble|He perdido mi pasaporte.|エ ペルディド ミ パサポルテ|パスポートをなくしました|紛失時
trouble|Me han robado la cartera.|メ アン ロバド ラ カルテラ|財布を盗まれました|盗難時
trouble|Mi tarjeta no funciona.|ミ タルヘタ ノ フンシオナ|カードが使えません|支払いトラブル
trouble|No tengo conexión a internet.|ノ テンゴ コネクシオン ア インテルネット|インターネットにつながりません|通信トラブル
trouble|¿Puede escribirlo?|プエデ エスクリビールロ|書いていただけますか？|聞き取れないとき
trouble|¿Puede mostrármelo en el mapa?|プエデ モストラールメロ エン エル マパ|地図で見せてもらえますか？|場所確認
trouble|Te quiero.|テ キエロ|大好きだよ|二人だけの旅で`.trim().split('\n').map((row,index)=>{const [category,spanish,reading,japanese,scene]=row.split('|');return{id:index+1,category,spanish,reading,japanese,scene,rarity:index===99?'Secret':index%17===0?'Super Rare':index%7===0?'Rare':'Common'}});
const phraseMap=new Map(phraseRows.map(p=>[p.id,p]));
let favoritePhrases=funStore.get('espana-phrase-favorites',[]);if(!Array.isArray(favoritePhrases))favoritePhrases=[];
let currentPhrase=null;
function showPhrase(p){currentPhrase=p;document.getElementById('phraseNumber').textContent=`No.${String(p.id).padStart(3,'0')} · ${p.category.toUpperCase()}`;document.getElementById('phraseSpanish').textContent=p.spanish;document.getElementById('phraseReading').textContent=p.reading;document.getElementById('phraseJapanese').textContent=p.japanese;document.getElementById('phraseScene').textContent=`使う場面：${p.scene}`;const r=document.getElementById('phraseRarity');r.textContent=p.rarity.toUpperCase();r.className='phrase-rarity '+(p.rarity==='Rare'?'rare':p.rarity==='Super Rare'?'super':p.rarity==='Secret'?'secret':'');document.getElementById('favoritePhrase').classList.toggle('active',favoritePhrases.includes(p.id));document.getElementById('favoritePhrase').textContent=favoritePhrases.includes(p.id)?'♥':'♡'}
const drawPhrase=document.getElementById('drawPhrase');if(drawPhrase)drawPhrase.addEventListener('click',()=>{let pool=phraseRows;const n=Math.random();if(n<.01)pool=phraseRows.filter(p=>p.rarity==='Secret');else if(n<.10)pool=phraseRows.filter(p=>p.rarity==='Super Rare');else if(n<.30)pool=phraseRows.filter(p=>p.rarity==='Rare');else pool=phraseRows.filter(p=>p.rarity==='Common');showPhrase(pool[Math.floor(Math.random()*pool.length)]);funStore.set('espana-last-phrase',currentPhrase.id)});
document.getElementById('favoritePhrase')?.addEventListener('click',()=>{if(!currentPhrase)return;favoritePhrases=favoritePhrases.includes(currentPhrase.id)?favoritePhrases.filter(id=>id!==currentPhrase.id):[...favoritePhrases,currentPhrase.id];funStore.set('espana-phrase-favorites',favoritePhrases);showPhrase(currentPhrase);renderPhraseBook()});
const lastPhrase=phraseMap.get(funStore.get('espana-last-phrase',0));if(lastPhrase)showPhrase(lastPhrase);
let phraseFilter='favorites';
function renderPhraseBook(){const list=document.getElementById('phraseList');if(!list)return;list.textContent='';let rows=phraseFilter==='favorites'?phraseRows.filter(p=>favoritePhrases.includes(p.id)):phraseFilter==='all'?phraseRows:phraseRows.filter(p=>p.category===phraseFilter);document.getElementById('phraseBookCount').textContent=`${favoritePhrases.length} favorites`;if(!rows.length){const empty=document.createElement('p');empty.className='phrase-empty';empty.textContent='お気に入りはまだありません。ガチャで気に入った言葉に♡を付けよう。';list.appendChild(empty);return}rows.forEach(p=>{const row=document.createElement('article');row.className='phrase-row';row.innerHTML=`<div><h3>${p.spanish}</h3><p>${p.reading} · ${p.japanese}</p><small>${p.scene}</small></div><button aria-label="お気に入り">${favoritePhrases.includes(p.id)?'♥':'♡'}</button>`;row.querySelector('button').addEventListener('click',()=>{favoritePhrases=favoritePhrases.includes(p.id)?favoritePhrases.filter(id=>id!==p.id):[...favoritePhrases,p.id];funStore.set('espana-phrase-favorites',favoritePhrases);renderPhraseBook();if(currentPhrase?.id===p.id)showPhrase(p)});list.appendChild(row)})}
document.getElementById('togglePhraseBook')?.addEventListener('click',()=>{const panel=document.getElementById('phraseBookPanel');panel.hidden=!panel.hidden;document.getElementById('togglePhraseBook').querySelector('span').textContent=panel.hidden?'＋':'−';if(!panel.hidden){renderPhraseBook();setTimeout(()=>panel.scrollIntoView({behavior:'smooth',block:'start'}),30)}});
document.querySelectorAll('[data-phrase-filter]').forEach(button=>button.addEventListener('click',()=>{phraseFilter=button.dataset.phraseFilter;document.querySelectorAll('[data-phrase-filter]').forEach(b=>b.classList.toggle('active',b===button));renderPhraseBook()}));

const achievements=[
['journey','✈️','旅の予約完了','航空券とホテルを押さえた'],['journey','🧳','準備スタート','持ち物リストを作った'],['journey','🇪🇸','スペイン到着','二人でスペインの地を踏んだ'],['journey','🏛️','Hola Madrid','マドリードの街を歩いた'],['journey','🚄','AVE Journey','高速鉄道で街を移動した'],['journey','🌊','Hola Barcelona','バルセロナに到着した'],['journey','⛪','夢の聖堂','サグラダ・ファミリアを見た'],['journey','🎨','Art Lovers','スペインの美術館を訪れた'],['journey','💃','Flamenco Night','本場のフラメンコを見た'],
['food','🥘','Paella Time','パエリアを食べた'],['food','🍷','¡Salud!','スペインワインで乾杯した'],['food','🍖','Jamón Lover','生ハムを味わった'],['food','🍮','Sweet Spain','スペインのデザートを食べた'],['food','☕','Bar Breakfast','バルで朝食を楽しんだ'],['food','🫒','Tapas Hopping','タパスを3種類以上食べた'],['food','🍽️','Special Dinner','二人で特別なディナーを楽しんだ'],['food','🧀','Local Flavor','現地のチーズを食べた'],
['couple','📸','First Selfie','旅の最初のツーショット'],['couple','📷','50 Memories','写真を50枚以上撮った'],['couple','🌇','Sunset Together','二人で夕日を見た'],['couple','🗺️','Lost Together','二人で道に迷った'],['couple','😂','Big Laugh','旅先で大笑いした'],['couple','❤️','Perfect Team','一日けんかせず過ごした'],['couple','💌','Secret Letter','Yukoへの手紙を読んだ'],['couple','🪙','Coin Decided','コインで何かを決めた'],['couple','🗣️','Spanish Challenge','スペイン語を実際に使った'],['couple','🎁','Gift Hunter','大切な人のお土産を買った'],
['hidden','🦎','Gaudí Lizard','有名なトカゲを見つけた'],['hidden','🎸','Street Music','路上ライブに出会った'],['hidden','🌧️','Rainy Spain','スペインで雨に降られた'],['hidden','⭐','Spanish Stars','二人で星空を見た'],['hidden','🌅','Early Birds','旅先で日の出を見た'],['hidden','🚶','20,000 Steps','一日2万歩以上歩いた'],['hidden','🧭','No Plan Hour','予定を決めずに1時間歩いた'],['hidden','🤝','Local Help','現地の人に助けてもらった'],['hidden','💖','Te quiero','スペインで「大好き」と伝えた']
].map((a,i)=>({id:i+1,category:a[0],icon:a[1],title:a[2],desc:a[3]}));
let achieved=funStore.get('espana-achievements',[]);if(!Array.isArray(achieved))achieved=[];let achievementFilter='all';
function renderAchievements(){const grid=document.getElementById('achievementGrid');if(!grid)return;grid.textContent='';const visible=achievementFilter==='all'?achievements:achievements.filter(a=>a.category===achievementFilter);visible.forEach(a=>{const done=achieved.includes(a.id);const button=document.createElement('button');button.className=`achievement${done?' done':''}`;button.innerHTML=`<span class="achievement-icon">${a.icon}</span><b>${a.title}</b><small>${a.desc}</small><span class="tick">${done?'✓':''}</span>`;button.addEventListener('click',()=>{achieved=done?achieved.filter(id=>id!==a.id):[...achieved,a.id];funStore.set('espana-achievements',achieved);renderAchievements()});grid.appendChild(button)});document.getElementById('achievementCount').textContent=`${achieved.length} / ${achievements.length}`;document.getElementById('achievementBar').style.width=`${achieved.length/achievements.length*100}%`}
document.querySelectorAll('[data-ach-filter]').forEach(button=>button.addEventListener('click',()=>{achievementFilter=button.dataset.achFilter;document.querySelectorAll('[data-ach-filter]').forEach(b=>b.classList.toggle('active',b===button));renderAchievements()}));renderAchievements();
