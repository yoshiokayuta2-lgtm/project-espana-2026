const screens=[...document.querySelectorAll('.screen')];
const routeButtons=[...document.querySelectorAll('[data-route]')];
const navButtons=[...document.querySelectorAll('.desktop-nav [data-route],.mobile-nav [data-route]')];
const validRoutes=new Set(screens.map(screen=>screen.id));

function show(route, smooth=true){
  const target=validRoutes.has(route)?route:'home';
  screens.forEach(screen=>screen.classList.toggle('active',screen.id===target));
  navButtons.forEach(button=>button.classList.toggle('active',button.dataset.route===target));
  history.replaceState(null,'',`#${target}`);
  window.scrollTo({top:0,behavior:smooth?'smooth':'auto'});
}
routeButtons.forEach(button=>button.addEventListener('click',event=>{
  event.preventDefault();
  show(button.dataset.route);
}));
window.addEventListener('hashchange',()=>show(location.hash.slice(1),false));
show(location.hash.slice(1)||'home',false);

const departure=new Date('2026-10-08T00:00:00+09:00');
const diff=Math.ceil((departure-new Date())/86400000);
document.getElementById('countdown').textContent=diff>=0?String(diff):'0';

const checks=['passport','insurance','sagrada','ave','esim'];
const labels={
  passport:'パスポート（有効期限確認）',
  insurance:'海外旅行保険（カード付帯を確認）',
  sagrada:'サグラダ・ファミリア予約',
  ave:'AVEの並び席を確認',
  esim:'eSIM・海外通信の準備'
};
function setCheck(key,value){
  localStorage.setItem(`espana-check-${key}`,value?'1':'0');
  document.querySelectorAll(`[data-check="${key}"]`).forEach(input=>input.checked=value);
}
function bindCheck(input,key){
  input.checked=localStorage.getItem(`espana-check-${key}`)==='1';
  input.addEventListener('change',()=>setCheck(key,input.checked));
}
document.querySelectorAll('[data-check]').forEach(input=>bindCheck(input,input.dataset.check));
const fullChecklist=document.getElementById('fullChecklist');
checks.forEach(key=>{
  const label=document.createElement('label');
  label.className='check-row';
  label.innerHTML=`<input type="checkbox" data-check="${key}"><span>${labels[key]}</span>`;
  fullChecklist.appendChild(label);
  bindCheck(label.querySelector('input'),key);
});

const notes=document.getElementById('notes');
notes.value=localStorage.getItem('espana-notes')||'';
notes.addEventListener('input',()=>localStorage.setItem('espana-notes',notes.value));

let expenses=[];
try{expenses=JSON.parse(localStorage.getItem('espana-expenses')||'[]')}catch{expenses=[]}
const expenseList=document.getElementById('expenseList');
const budgetTotal=document.getElementById('budgetTotal');
function renderExpenses(){
  expenseList.innerHTML='';
  const total=expenses.reduce((sum,item)=>sum+item.amount,0);
  expenses.forEach((item,index)=>{
    const li=document.createElement('li');
    const name=document.createElement('span');
    name.textContent=item.name;
    const remove=document.createElement('button');
    remove.type='button';remove.dataset.index=index;remove.setAttribute('aria-label',`${item.name}を削除`);
    remove.style.cssText='border:0;background:none;cursor:pointer';
    remove.textContent=`¥${item.amount.toLocaleString()} ×`;
    li.append(name,remove);expenseList.appendChild(li);
  });
  budgetTotal.textContent=`¥${total.toLocaleString()}`;
  localStorage.setItem('espana-expenses',JSON.stringify(expenses));
}
document.getElementById('addExpense').addEventListener('click',()=>{
  const name=document.getElementById('expenseName');
  const amount=document.getElementById('expenseAmount');
  const value=Number(amount.value);
  if(!name.value.trim()||!Number.isFinite(value)||value<=0)return;
  expenses.push({name:name.value.trim(),amount:Math.round(value)});
  name.value='';amount.value='';renderExpenses();
});
expenseList.addEventListener('click',event=>{
  const button=event.target.closest('[data-index]');
  if(!button)return;
  expenses.splice(Number(button.dataset.index),1);
  renderExpenses();
});
renderExpenses();

// v2.2 — date-aware Today screen
const tripDays=[
  {date:'2026-10-08',city:'Tokyo / Narita',title:'出発の日',items:[['Day','東京で過ごす','夜便に備えて余裕を持って移動'],['22:30','QR809 成田発','ドーハへ向けて出発']]},
  {date:'2026-10-09',city:'Madrid',title:'マドリード到着',items:[['Morning','QR147 ドーハ発','マドリードへ'],['Afternoon','ホテルへ移動','Puerta del Sol 周辺'],['Evening','街歩き','体調を優先して軽めに']]},
  {date:'2026-10-10',city:'Madrid',title:'アートとフラメンコ',items:[['Morning','マドリード観光','王宮・美術館候補'],['21:30','Corral de la Morería','Dinner + Show']]},
  {date:'2026-10-11',city:'Madrid → Barcelona',title:'AVEで都市を移動',items:[['Morning','Atochaへ','余裕を持って駅へ'],['Train','AVE','Madrid → Barcelona'],['Evening','ホテルチェックイン','Plaça Catalunya 周辺']]},
  {date:'2026-10-12',city:'Barcelona',title:'バルセロナを歩く',items:[['Morning','旧市街散策','ゴシック地区候補'],['Afternoon','建築と街歩き','無理のないペースで'],['Evening','自由時間','翌日に備える']]},
  {date:'2026-10-13',city:'Barcelona',title:'旅のハイライト',items:[['Morning','サグラダ・ファミリア','受難のファサードの塔付き候補'],['19:00','Cinc Sentits','テイスティングメニュー']]},
  {date:'2026-10-14',city:'Barcelona → Doha',title:'スペイン最終日',items:[['Morning','最後の街歩き','買い物・カフェ'],['16:35','QR146 バルセロナ発','ドーハへ']]},
  {date:'2026-10-15',city:'Doha → Narita',title:'帰国の日',items:[['Flight','QR806','ドーハから成田へ'],['19:10','成田到着','おつかれさまでした']]}
];
function dateKey(date){
  const y=date.getFullYear();
  const m=String(date.getMonth()+1).padStart(2,'0');
  const d=String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
function renderToday(){
  const now=new Date();
  const key=dateKey(now);
  const day=tripDays.find(item=>item.date===key);
  const city=document.getElementById('todayCity');
  const date=document.getElementById('todayDate');
  const count=document.getElementById('todayCountdown');
  const list=document.getElementById('todaySchedule');
  const lead=document.getElementById('todayLead');
  if(!city||!date||!list)return;
  list.innerHTML='';
  const remaining=Math.ceil((departure-now)/86400000);
  count.textContent=remaining>0?remaining:'0';
  if(day){
    city.textContent=day.city;
    date.textContent=day.title;
    lead.textContent='今日の予定を時間順に表示しています。';
    count.parentElement.style.display='none';
    day.items.forEach(([time,title,description],index)=>{
      const li=document.createElement('li');
      if(index===0)li.classList.add('is-now');
      li.innerHTML=`<time>${time}</time><p><b>${title}</b><small>${description}</small></p>`;
      list.appendChild(li);
    });
  }else if(now<departure){
    city.textContent='Before the journey';
    date.textContent='出発までの準備';
    const prep=[['Next','サグラダ・ファミリア予約','10月13日午前候補'],['Check','AVEの並び席','2名並びで取れているか確認'],['Pack','海外通信','eSIMまたはローミング']];
    prep.forEach(([time,title,description])=>{const li=document.createElement('li');li.innerHTML=`<time>${time}</time><p><b>${title}</b><small>${description}</small></p>`;list.appendChild(li)});
  }else{
    city.textContent='After the journey';
    date.textContent='思い出を残す';
    count.parentElement.style.display='none';
    [['Photos','写真を選ぶ','お気に入りをアルバムへ'],['Diary','短い日記を書く','旅の空気を言葉に'],['Share','二人で振り返る','Project España を完成させる']].forEach(([time,title,description])=>{const li=document.createElement('li');li.innerHTML=`<time>${time}</time><p><b>${title}</b><small>${description}</small></p>`;list.appendChild(li)});
  }
}
renderToday();

// v2.2 — reservation detail modal
const reservations={
  corral:{eyebrow:'MADRID · OCT 10 · 21:30',title:'Corral de la Morería',summary:'ディナーとフラメンコショー。ハネムーンであることは連絡済みです。',details:[['予約番号','W10102026084153'],['内容','Dinner + Show'],['ショー','支払い済み'],['注意','レストランに最低利用額あり'],['変更・取消','48時間前までを推奨']],map:'https://maps.google.com/?q=Corral+de+la+Moreria+Madrid'},
  cinc:{eyebrow:'BARCELONA · OCT 13 · 19:00',title:'Cinc Sentits',summary:'地元の旬を生かしたテイスティングメニュー。ハネムーンであることは連絡済みです。',details:[['日時','2026年10月13日 19:00'],['住所',"Carrer d'Entença, 60"],['電話','+34 93 323 94 90'],['到着目安','18:50'],['注意','ベジタリアンメニューなし']],map:'https://maps.google.com/?q=Cinc+Sentits+Barcelona',site:'https://cincsentits.com/'}
};
const modal=document.getElementById('reservationModal');
function closeModal(){if(!modal)return;modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open')}
function openModal(key){
  const data=reservations[key];if(!data||!modal)return;
  document.getElementById('modalEyebrow').textContent=data.eyebrow;
  document.getElementById('modalTitle').textContent=data.title;
  document.getElementById('modalSummary').textContent=data.summary;
  const details=document.getElementById('modalDetails');details.innerHTML='';
  data.details.forEach(([term,value])=>{const row=document.createElement('div');row.innerHTML=`<dt>${term}</dt><dd>${value}</dd>`;details.appendChild(row)});
  const actions=document.getElementById('modalActions');actions.innerHTML=`<a href="${data.map}" target="_blank" rel="noopener">Google Maps</a>${data.site?`<a class="secondary-link" href="${data.site}" target="_blank" rel="noopener">公式サイト</a>`:''}`;
  modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');
  modal.querySelector('.modal-close').focus();
}
document.querySelectorAll('.open-detail').forEach(button=>button.addEventListener('click',()=>openModal(button.dataset.reservation)));
document.querySelectorAll('[data-close-modal]').forEach(button=>button.addEventListener('click',closeModal));
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeModal()});
