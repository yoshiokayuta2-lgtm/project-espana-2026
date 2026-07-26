(() => {
  'use strict';

  const tripStart = new Date('2026-10-08T00:00:00+09:00');
  const tripEnd = new Date('2026-10-15T23:59:59+09:00');
  const checklistItems = [
    'パスポートと航空券を確認',
    '海外旅行保険の補償内容を保存',
    'カタール航空アプリを準備',
    'レストラン予約画面をスクリーンショット',
    '変換プラグ・充電器・モバイルバッテリー'
  ];

  const schedules = {
    before: {
      title: '旅が始まるまで',
      lead: '少しずつ準備する時間も、旅の一部。',
      city: 'Before the journey',
      place: 'Before the journey',
      chip: 'Planning',
      image: 'images/planning.png',
      items: [['Now', '旅程と予約内容を二人で確認'], ['Next', '持ち物リストを少しずつ完成'], ['Soon', 'スペインで叶えたいことを話す']]
    },
    '2026-10-08': {
      title: 'Our journey begins',
      lead: 'いよいよ出発。今夜、スペインへ。',
      city: 'Departure', place: 'Narita → Doha', chip: 'Oct 8', image: 'images/departure.png',
      items: [['Evening', '空港へ移動・チェックイン'], ['Flight', 'QR809 成田からドーハへ'], ['Night', '機内でゆっくり過ごす']]
    },
    '2026-10-09': {
      title: 'Hola, Madrid',
      lead: '最初の街に到着する日。',
      city: 'Madrid', place: 'Madrid', chip: 'Oct 9', image: 'images/madrid.png',
      items: [['Morning', 'QR147でマドリード到着'], ['Afternoon', 'ホテルへ移動・街歩き'], ['Evening', '最初のスペインディナー']]
    },
    '2026-10-10': {
      title: 'Madrid, art & flamenco',
      lead: '芸術と音楽に浸る一日。',
      city: 'Madrid', place: 'Madrid', chip: 'Oct 10', image: 'images/corral.png',
      items: [['11:00', '王宮（Palacio Real）'], ['Afternoon', '美術館と旧市街'], ['21:30', 'Corral de la Morería']]
    },
    '2026-10-11': {
      title: 'To Barcelona',
      lead: '列車で二つ目の街へ。',
      city: 'Madrid → Barcelona', place: 'AVE to Barcelona', chip: 'Oct 11', image: 'images/madrid.png',
      items: [['Morning', 'マドリードを出発'], ['Train', 'AVEでバルセロナへ'], ['Evening', 'ホテル周辺を散策']]
    },
    '2026-10-12': {
      title: 'Barcelona day',
      lead: '建築と街の色を楽しむ日。',
      city: 'Barcelona', place: 'Barcelona', chip: 'Oct 12', image: 'images/selfie.png',
      items: [['Morning', 'バルセロナ街歩き'], ['Afternoon', '市場・カフェ・建築'], ['Evening', '二人で自由時間']]
    },
    '2026-10-13': {
      title: 'The highlight',
      lead: 'ずっと楽しみにしていた景色へ。',
      city: 'Barcelona', place: 'Sagrada Família', chip: 'Oct 13', image: 'images/sagrada.png',
      items: [['Daytime', 'サグラダ・ファミリア'], ['Tower', '受難のファサード側'], ['19:00', 'Cinc Sentits']]
    },
    '2026-10-14': {
      title: 'Hasta luego, España',
      lead: '思い出を荷物に詰めて帰路へ。',
      city: 'Barcelona → Doha', place: 'Return flight', chip: 'Oct 14', image: 'images/flight.png',
      items: [['Morning', '最後のバルセロナ散策'], ['Airport', '空港へ移動'], ['16:35', 'QR146でドーハへ']]
    },
    '2026-10-15': {
      title: 'Welcome home',
      lead: '二人の最初の冒険が、思い出になる日。',
      city: 'Doha → Narita', place: 'Back home', chip: 'Oct 15', image: 'images/flight.png',
      items: [['Flight', 'QR806で成田へ'], ['19:10', '日本到着予定'], ['Home', '写真を見ながら旅を振り返る']]
    },
    after: {
      title: 'Our first adventure',
      lead: '旅は終わっても、思い出はここから増えていく。',
      city: 'Memories', place: 'Our memories', chip: 'Memories', image: 'images/selfie.png',
      items: [['Photos', 'お気に入りの写真を選ぶ'], ['Story', '二人だけの旅の記録を残す'], ['Next', '次の冒険を考える']]
    }
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function dateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function currentSchedule(now = new Date()) {
    if (now < tripStart) return schedules.before;
    if (now > tripEnd) return schedules.after;
    return schedules[dateKey(now)] || schedules.before;
  }

  function updateCountdown() {
    const el = $('#countdown');
    if (!el) return;
    const now = new Date();
    const days = Math.ceil((tripStart - now) / 86400000);
    el.textContent = days > 0 ? days : (now <= tripEnd ? '0' : '—');
  }

  function renderToday() {
    const data = currentSchedule();
    const map = {
      todayChip: data.chip,
      todayPlace: data.place,
      todayTitle: data.title,
      todayLead: data.lead,
      todayCity: data.city
    };
    Object.entries(map).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    });
    const hero = $('#todayHero');
    if (hero) hero.src = data.image;
    const homeImage = $('.today-card > img');
    if (homeImage) homeImage.src = data.image;

    const lists = [$('#todayList'), $('#todaySchedule')];
    lists.forEach(list => {
      if (!list) return;
      list.innerHTML = data.items.map(([time, text]) => `<li><time>${time}</time><span>${text}</span></li>`).join('');
    });
  }

  function navigate(route, push = true) {
    const target = document.getElementById(route) || document.getElementById('home');
    $$('.screen').forEach(section => section.classList.toggle('active', section === target));
    $$('.bottom-nav button').forEach(button => button.classList.toggle('active', button.dataset.route === target.id));
    if (push) history.replaceState(null, '', target.id === 'home' ? location.pathname : `#${target.id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setupRouting() {
    $$('[data-route]').forEach(el => el.addEventListener('click', () => navigate(el.dataset.route)));
    window.addEventListener('hashchange', () => navigate(location.hash.slice(1) || 'home', false));
    navigate(location.hash.slice(1) || 'home', false);
  }

  function setupChecklist() {
    const root = $('#checklist');
    if (!root) return;
    let state;
    try { state = JSON.parse(localStorage.getItem('espana-checklist') || '[]'); } catch { state = []; }
    if (!Array.isArray(state)) state = [];

    root.innerHTML = checklistItems.map((item, index) => `
      <label class="check-item ${state[index] ? 'done' : ''}">
        <input type="checkbox" data-index="${index}" ${state[index] ? 'checked' : ''}>
        <span>${item}</span>
      </label>`).join('');

    const updateProgress = () => {
      const checked = $$('input[type="checkbox"]', root).filter(input => input.checked).length;
      const progress = $('#checkProgress');
      if (progress) progress.textContent = `${checked} / ${checklistItems.length}`;
    };

    root.addEventListener('change', event => {
      if (!event.target.matches('input[type="checkbox"]')) return;
      const inputs = $$('input[type="checkbox"]', root);
      const nextState = inputs.map(input => input.checked);
      localStorage.setItem('espana-checklist', JSON.stringify(nextState));
      event.target.closest('.check-item').classList.toggle('done', event.target.checked);
      updateProgress();
    });
    updateProgress();
  }

  function setupNotes() {
    const notes = $('#notes');
    if (!notes) return;
    notes.value = localStorage.getItem('espana-notes') || '';
    notes.addEventListener('input', () => localStorage.setItem('espana-notes', notes.value));
  }

  updateCountdown();
  renderToday();
  setupRouting();
  setupChecklist();
  setupNotes();
})();
