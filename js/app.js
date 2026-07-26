const screens=[...document.querySelectorAll('.screen')];
const routeButtons=[...document.querySelectorAll('[data-route]')];
function show(route, smooth=true){const target=document.getElementById(route)?route:'home';screens.forEach(s=>s.classList.toggle('active',s.id===target));document.querySelectorAll('.bottom-nav [data-route]').forEach(b=>b.classList.toggle('active',b.dataset.route===target));history.replaceState(null,'',`#${target}`);window.scrollTo({top:0,behavior:smooth?'smooth':'auto'});}
routeButtons.forEach(b=>b.addEventListener('click',e=>{e.preventDefault();show(b.dataset.route)}));
window.addEventListener('hashchange',()=>show(location.hash.slice(1),false));show(location.hash.slice(1)||'home',false);

const departure=new Date('2026-10-08T00:00:00+09:00');
const days=Math.max(0,Math.ceil((departure-new Date())/86400000));
document.getElementById('countdown').textContent=days;

const checks={passport:'パスポートの有効期限',insurance:'海外旅行保険',sagrada:'サグラダ・ファミリア予約',ave:'AVEの並び席',esim:'eSIM・海外通信'};
const checklist=document.getElementById('checklist');
function updateProgress(){const done=Object.keys(checks).filter(k=>localStorage.getItem(`espana-${k}`)==='1').length;document.getElementById('checkProgress').textContent=`${done} / ${Object.keys(checks).length}`;}
Object.entries(checks).forEach(([key,text])=>{const label=document.createElement('label');label.innerHTML=`<input type="checkbox"><span>${text}</span>`;const input=label.querySelector('input');input.checked=localStorage.getItem(`espana-${key}`)==='1';input.addEventListener('change',()=>{localStorage.setItem(`espana-${key}`,input.checked?'1':'0');updateProgress()});checklist.appendChild(label)});updateProgress();
const notes=document.getElementById('notes');notes.value=localStorage.getItem('espana-notes')||'';notes.addEventListener('input',()=>localStorage.setItem('espana-notes',notes.value));

const tripDays={
'2026-10-08':{city:'Tokyo / Narita',title:'出発の日',img:'images/departure.png',items:[['Day','東京で過ごす','夜便に備えて余裕を持って移動'],['22:30','QR809 成田発','ドーハへ向けて出発']]},
'2026-10-09':{city:'Madrid',title:'マドリード到着',img:'images/madrid.png',items:[['Morning','QR147','ドーハからマドリードへ'],['Afternoon','ホテルへ','Puerta del Sol 周辺'],['Evening','最初の街歩き','無理のないペースで']]},
'2026-10-10':{city:'Madrid',title:'芸術とフラメンコ',img:'images/corral.png',items:[['Morning','王宮・美術館','マドリードの文化を楽しむ'],['21:30','Corral de la Morería','Dinner + Show']]},
'2026-10-11':{city:'Madrid → Barcelona',title:'AVEで移動',img:'images/madrid.png',items:[['Morning','Atochaへ','余裕をもって駅へ'],['Train','AVE','Madrid → Barcelona']]},
'2026-10-13':{city:'Barcelona',title:'旅のハイライト',img:'images/sagrada.png',items:[['Morning','サグラダ・ファミリア','受難のファサード候補'],['19:00','Cinc Sentits','特別なディナー']]},
'2026-10-14':{city:'Barcelona → Doha',title:'スペイン最終日',img:'images/selfie.png',items:[['Morning','最後の街歩き','買い物とカフェ'],['16:35','QR146','ドーハへ']]},
'2026-10-15':{city:'Doha → Narita',title:'帰国の日',img:'images/flight.png',items:[['Flight','QR806','成田へ'],['19:10','成田到着','おつかれさまでした']]}
};
function key(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function renderItems(el,items){el.innerHTML='';items.forEach(([time,title,desc])=>{const li=document.createElement('li');li.innerHTML=`<time>${time}</time><div><b>${title}</b><small>${desc}</small></div>`;el.appendChild(li)})}
function renderToday(){const now=new Date(),day=tripDays[key(now)];let data;if(day)data=day;else if(now<departure)data={city:'Before the journey',title:'旅が始まるまで',img:'images/planning.png',items:[['Next','サグラダ予約','10月13日午前候補'],['Check','AVEの並び席','2名並びを確認'],['Pack','通信と荷物','eSIM・変換プラグ']]};else data={city:'Our memories',title:'旅を振り返る',img:'images/selfie.png',items:[['Photos','写真を選ぶ','お気に入りをアルバムへ'],['Diary','言葉を残す','旅の空気を短い日記に']]};document.getElementById('todayPlace').textContent=data.city;document.getElementById('todayChip').textContent=day?key(now).slice(5).replace('-','/'):days+' days';renderItems(document.getElementById('todayList'),data.items);document.getElementById('todayCity').textContent=data.city;document.getElementById('todayTitle').textContent=data.title;document.getElementById('todayHero').src=data.img;renderItems(document.getElementById('todaySchedule'),data.items)}
renderToday();
