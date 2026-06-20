/* ===================================================
   script.js – אתר ראשי (קורא מ-localStorage)
   =================================================== */

// ── Defaults (used as fallback) ──
const DEFAULTS = {
  projects: [
    { id: 1, title: 'Royal Beauty', category: 'logo', desc: 'לוגו למותג קוסמטיקה יוקרתי', image: '', icon: 'fa-crown', bg: '#1a1a2e' },
    { id: 2, title: 'Cafe Noir', category: 'branding', desc: 'מיתוג מלא לבית קפה בתל אביב', image: '', icon: 'fa-mug-hot', bg: '#16213e' },
    { id: 3, title: 'TechStart', category: 'web', desc: 'עיצוב ממשק לסטארטאפ טכנולוגי', image: '', icon: 'fa-laptop-code', bg: '#0f3460' },
    { id: 4, title: 'GreenLeaf Organics', category: 'print', desc: 'חוברת מוצרים לחברת טבע', image: '', icon: 'fa-id-card', bg: '#1a1a2e' },
    { id: 5, title: 'AI Nexus', category: 'logo', desc: 'לוגו עתידני לחברת AI', image: '', icon: 'fa-robot', bg: '#16213e' },
    { id: 6, title: 'FitZone', category: 'branding', desc: 'מיתוג מלא לרשת חדרי כושר', image: '', icon: 'fa-dumbbell', bg: '#0f3460' },
    { id: 7, title: 'ShopLocal', category: 'web', desc: 'עיצוב חנות אונליין למותג אופנה', image: '', icon: 'fa-store', bg: '#1a1a2e' },
    { id: 8, title: 'Harmony Festival', category: 'print', desc: 'פליירים וכרזות לפסטיבל מוזיקה', image: '', icon: 'fa-calendar-alt', bg: '#16213e' }
  ],
  about: {
    name: 'יעל כהן',
    role: 'מעצבת גרפית עם תשוקה למיתוג',
    email: 'yael@cohen-design.co.il',
    phone: '050-123-4567',
    location: 'תל אביב, ישראל',
    heroDesc: 'לוגואים, מיתוג עסקי, עיצובי רשת, חומרי דפוס ועוד – כל מה שעסק צריך כדי להיראות במיטבו',
    bio1: 'מעצבת גרפית עם 8 שנות ניסיון בעיצוב מיתוג, דפוס ודיגיטל. מאמינה שעיצוב טוב מתחיל בהבנה עמוקה של המותג ושל קהל היעד.',
    bio2: 'עבדתי עם עשרות עסקים בישראל – מסטארטאפים צעירים ועד חברות ותיקות – עזרתי להם ליצור זהות ויזואלית שמושכת לקוחות ומשאירה רושם.',
    skills: ['Adobe Photoshop', 'Adobe Illustrator', 'Figma', 'InDesign', 'After Effects', 'Lightroom'],
    stats: [
      { num: '150+', label: 'פרויקטים' },
      { num: '80+', label: 'לקוחות מרוצים' },
      { num: '8', label: 'שנות ניסיון' },
      { num: '15', label: 'מדינות' }
    ],
  }
};

function getData() {
  try {
    const raw = localStorage.getItem('portfolio_data');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.projects && parsed.about) return parsed;
    }
  } catch (_) {}
  return DEFAULTS;
}

const data = getData();
const a = data.about;

// ─── Apply theme ───
const theme = data.theme || {};
if (theme.accent) {
  const r = document.documentElement.style;
  r.setProperty('--accent', theme.accent);
  r.setProperty('--accent-rgb', (() => { const n = parseInt(theme.accent.replace('#',''), 16); return `${(n>>16)&255}, ${(n>>8)&255}, ${n&255}`; })());
  r.setProperty('--accent-hover', (() => { const n = parseInt(theme.accent.replace('#',''), 16); const s = (c) => Math.min(255, Math.max(0, c + 20)); return `#${(1<<24|s((n>>16)&255)<<16|s((n>>8)&255)<<8|s(n&255)).toString(16).slice(1)}`; })());
  r.setProperty('--bg', theme.bg || '#0d0d0d');
  r.setProperty('--surface', theme.surface || '#141414');
  r.setProperty('--card-bg', theme.card || '#1a1a1a');
  r.setProperty('--text', theme.text || '#f0f0f0');
  r.setProperty('--text-muted', theme.textMuted || '#888');
  r.setProperty('--border', theme.border || '#2a2a2a');
  if (theme.radius) r.setProperty('--radius', theme.radius + 'px');
}
if (theme.siteName) {
  document.querySelector('.logo').innerHTML = theme.siteName.replace(/(\S+)$/, '<span>$1</span>');
}
if (theme.heroTitle) {
  document.getElementById('heroTitle').textContent = theme.heroTitle;
}
if (theme.ctaText) {
  document.querySelector('.hero .btn').textContent = theme.ctaText;
}
if (theme.portfolioSub) {
  document.getElementById('portfolioSubtitle').textContent = theme.portfolioSub;
}
if (theme.showStats === false) {
  document.querySelector('.stats').style.display = 'none';
}
if (theme.showAbout === false) {
  document.getElementById('about').style.display = 'none';
}

// ─── Hero ───
document.getElementById('heroTitle').innerHTML = (a.role || DEFAULTS.about.role).replace(/\n/g, '<br>');
document.getElementById('heroDesc').textContent = a.heroDesc || DEFAULTS.about.heroDesc;

// ─── Categories ───
const cats = data.categories || [
  { value: 'logo', label: 'לוגו' },
  { value: 'branding', label: 'מיתוג' },
  { value: 'web', label: 'עיצוב רשת' },
  { value: 'print', label: 'דפוס' }
];
const catMap = {};
cats.forEach(c => { catMap[c.value] = c.label; });

// Build filter buttons
const filtersContainer = document.getElementById('filters');
filtersContainer.innerHTML = `<button class="filter active" data-filter="all">הכל</button>`;
cats.forEach(c => {
  const btn = document.createElement('button');
  btn.className = 'filter';
  btn.dataset.filter = c.value;
  btn.textContent = c.label;
  filtersContainer.appendChild(btn);
});

// ─── Portfolio Grid ───
const grid = document.getElementById('grid');
data.projects.forEach(p => {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.category = p.category;

  const imgContent = p.image
    ? `<img src="${p.image}" alt="${p.title}" style="width:100%;height:100%;object-fit:cover">`
    : `<i class="fas ${p.icon || 'fa-image'}" style="font-size:3rem;color:var(--accent)"></i>`;

  card.innerHTML = `
    <div class="card-img" style="background:${p.bg || '#1a1a2e'}">${imgContent}</div>
    <div class="card-body">
      <span class="tag">${catMap[p.category] || p.category}</span>
      <h3>${p.title}</h3>
      <p>${p.desc}</p>
    </div>`;
  grid.appendChild(card);
});

// ─── About ───
document.getElementById('aboutName').textContent = a.name || DEFAULTS.about.name;
document.getElementById('aboutBio1').textContent = a.bio1 || DEFAULTS.about.bio1;
document.getElementById('aboutBio2').textContent = a.bio2 || DEFAULTS.about.bio2;
if (a.photo) {
  const container = document.getElementById('aboutPhotoContainer');
  container.innerHTML = `<img src="${a.photo}" alt="${a.name || 'תמונת פרופיל'}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`;
  container.style.overflow = 'hidden';
}

const skillsList = document.getElementById('skillsList');
(a.skills || DEFAULTS.about.skills).forEach(s => {
  const li = document.createElement('li');
  li.innerHTML = `<i class="fas fa-check-circle"></i> ${s}`;
  skillsList.appendChild(li);
});

// ─── Stats ───
const statsContainer = document.getElementById('statsContainer');
(a.stats || DEFAULTS.about.stats).forEach(s => {
  const div = document.createElement('div');
  div.className = 'stat';
  div.innerHTML = `<span class="num">${s.num}</span><span class="label">${s.label}</span>`;
  statsContainer.appendChild(div);
});

// ─── Contact ───
document.getElementById('contactEmail').innerHTML = `<i class="fas fa-envelope"></i> ${a.email || DEFAULTS.about.email}`;
document.getElementById('contactPhone').innerHTML = `<i class="fas fa-phone"></i> ${a.phone || DEFAULTS.about.phone}`;
document.getElementById('contactLocation').innerHTML = `<i class="fas fa-map-marker-alt"></i> ${a.location || DEFAULTS.about.location}`;

// ─── Footer ───
document.getElementById('footerName').textContent = a.name || DEFAULTS.about.name;

// ─── Hamburger ───
const hamburger = document.getElementById('hamburger');
const nav = document.querySelector('.nav');
hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('active');
  nav.classList.toggle('open');
});
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('active');
    nav.classList.remove('open');
  });
});

// ─── Filter ───
const filterButtons = document.querySelectorAll('.filter');
const cards = document.querySelectorAll('.card');

filterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    filterButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.filter;
    cards.forEach(card => {
      if (filter === 'all' || card.dataset.category === filter) {
        card.style.display = 'block';
        card.style.animation = 'none';
        void card.offsetHeight;
        card.style.animation = 'modalIn 0.4s ease';
      } else {
        card.style.display = 'none';
      }
    });
  });
});

// ─── Modal with Navigation ───
const modal = document.getElementById('modal');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose = document.getElementById('modalClose');
const modalPrev = document.getElementById('modalPrev');
const modalNext = document.getElementById('modalNext');
const modalCounter = document.getElementById('modalCounter');
const modalTag = document.getElementById('modalTag');
const modalTitle = document.getElementById('modalTitle');
const modalDesc = document.getElementById('modalDesc');
const modalImg = document.querySelector('.modal-img');
let currentCardIndex = 0;

function getVisibleCards() {
  return [...document.querySelectorAll('.card')].filter(c => c.style.display !== 'none');
}

function openModal(index) {
  const visible = getVisibleCards();
  if (!visible.length) return;
  currentCardIndex = Math.max(0, Math.min(index, visible.length - 1));
  const card = visible[currentCardIndex];
  const tag = card.querySelector('.tag').textContent;
  const title = card.querySelector('h3').textContent;
  const desc = card.querySelector('p').textContent;
  const bg = card.querySelector('.card-img').style.background;
  const inner = card.querySelector('.card-img').innerHTML;

  modalTag.textContent = tag;
  modalTitle.textContent = title;
  modalDesc.textContent = desc;
  modalImg.innerHTML = inner;
  modalImg.style.background = bg;
  modalCounter.textContent = `${currentCardIndex + 1} / ${visible.length}`;

  modalPrev.style.display = visible.length > 1 ? 'flex' : 'none';
  modalNext.style.display = visible.length > 1 ? 'flex' : 'none';

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

cards.forEach((card, i) => {
  card.addEventListener('click', () => {
    const visible = getVisibleCards();
    const idx = visible.indexOf(card);
    openModal(idx);
  });
});

function closeModal() {
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

function modalPrevItem() {
  const visible = getVisibleCards();
  if (visible.length <= 1) return;
  currentCardIndex = (currentCardIndex - 1 + visible.length) % visible.length;
  openModal(currentCardIndex);
}

function modalNextItem() {
  const visible = getVisibleCards();
  if (visible.length <= 1) return;
  currentCardIndex = (currentCardIndex + 1) % visible.length;
  openModal(currentCardIndex);
}

modalPrev.addEventListener('click', modalPrevItem);
modalNext.addEventListener('click', modalNextItem);
modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', closeModal);
document.addEventListener('keydown', e => {
  if (!modal.classList.contains('open')) return;
  if (e.key === 'Escape') closeModal();
  if (e.key === 'ArrowRight') modalPrevItem();
  if (e.key === 'ArrowLeft') modalNextItem();
});

// ─── Contact Form ───
document.getElementById('contactForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const btn = this.querySelector('.btn');
  const original = btn.innerHTML;
  btn.innerHTML = 'נשלח! <i class="fas fa-check"></i>';
  btn.style.background = '#2ecc71';
  setTimeout(() => {
    btn.innerHTML = original;
    btn.style.background = '';
    this.reset();
  }, 2500);
});
