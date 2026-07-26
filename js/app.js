const screens=[...document.querySelectorAll('.screen')];
const routeButtons=[...document.querySelectorAll('[data-route]')];
const navButtons=[...document.querySelectorAll('.desktop-nav [data-route],.mobile-nav [data-route]')];
const validRoutes=new Set(screens.map(s=>s.id));
function show(route){
  const target=validRoutes.has(route)?route:'home';
  screens.forEach(s=>s.classList.toggle('active',s.id===target));
  navButtons.forEach(b=>b.classList.toggle('active',b.dataset.route===target));
  history.replaceState(null,'','#'+target);
  window.scrollTo({top:0,behavior:'smooth'});
}
routeButtons.forEach(b=>b.addEventListener('click',e=>{if(b.tagName==='A')e.preventDefault();show(b.dataset.route)}));
show(location.hash.slice(1)||'home');

const departure=new Date('2026-10-08T00:00:00+09:00');
const diff=Math.ceil((departure-new Date())/86400000);
document.getElementById('countdown').textContent=diff>0?diff:diff===0?'0':'—';

const checks=['passport','insurance','sagrada','ave','esim'];
function bindCheck(el,key){
  el.checked=localStorage.getItem('espana-check-'+key)==='1';
  el.addEventListener('change',()=>{
    localStorage.setItem('espana-check-'+key,el.checked?'1':'0');
    document.querySelectorAll(`[data-check="${key}"]`).forEach(other=>other.checked=el.checked);
  });
}
document.querySelectorAll('[data-check]').forEach(el=>bindCheck(el,el.dataset.check));
const labels={passport:'パスポート（有効期限確認）',insurance:'海外旅行保険（カード付帯を確認）',sagrada:'サグラダ・ファミリア予約',ave:'AVEの並び席を確認',esim:'eSIM・海外通信の準備'};
const fullChecklist=document.getElementById('fullChecklist');
checks.forEach(key=>{
  const label=document.createElement('label');
  label.className='check-row';
  label.innerHTML=`<input type="checkbox" data-check="${key}"><span>${labels[key]}</span>`;
  fullChecklist.appendChild(label);
  bindCheck(label.querySelector('input'),key);
});
const style=document.createElement('style');
style.textContent='.check-row{display:flex;gap:10px;align-items:center;padding:12px 0;border-top:1px solid var(--line)}';
document.head.appendChild(style);

const notes=document.getElementById('notes');
notes.value=localStorage.getItem('espana-notes')||'';
notes.addEventListener('input',()=>localStorage.setItem('espana-notes',notes.value));

let expenses=JSON.parse(localStorage.getItem('espana-expenses')||'[]');
const expenseList=document.getElementById('expenseList');
const budgetTotal=document.getElementById('budgetTotal');
function renderExpenses(){
  expenseList.innerHTML='';
  let total=0;
  expenses.forEach((item,index)=>{
    total+=item.amount;
    const li=document.createElement('li');
    li.innerHTML=`<span>${item.name}</span><button aria-label="削除" data-index="${index}" style="border:0;background:none;cursor:pointer">¥${item.amount.toLocaleString()} ×</button>`;
    expenseList.appendChild(li);
  });
  budgetTotal.textContent='¥'+total.toLocaleString();
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
expenseList.addEventListener('click',e=>{const b=e.target.closest('[data-index]');if(!b)return;expenses.splice(Number(b.dataset.index),1);renderExpenses()});
renderExpenses();
