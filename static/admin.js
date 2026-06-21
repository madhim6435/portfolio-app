/* ===================================================
   admin.js – לוח בקרה (עובד מול API)
   =================================================== */

let data = null;

// ── API helpers ──
async function apiLoad() {
  const res = await fetch('/api/portfolio');
  if (!res.ok) throw new Error('Failed to load');
  data = await res.json();
}

async function apiSave() {
  const res = await fetch('/api/portfolio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Save failed: ' + res.status);
}

function apiUpload(file) {
  return new Promise((resolve, reject) => {
    const MAX = 1200;
    const img = new Image();
    img.onload = function() {
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        const ratio = Math.min(MAX / w, MAX / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// ── Data helpers ──
function getCats() {
  return data.categories || [];
}

function catLabel(val) {
  const c = getCats().find(x => x.value === val);
  return c ? c.label : val;
}

// ── Tab switching ──
document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById('tab' + btn.dataset.tab.charAt(0).toUpperCase() + btn.dataset.tab.slice(1)).classList.add('active');
  });
});

// ── Logout ──
document.getElementById('logoutBtn').addEventListener('click', () => {
  window.location.href = '/logout';
});

// ═══════════════════════════════════════════
//  PROJECTS
// ═══════════════════════════════════════════

let editingId = null;

function renderProjects() {
  const tbody = document.getElementById('projectsBody');
  const empty = document.getElementById('emptyProjects');
  tbody.innerHTML = '';
  const projects = data.projects || [];
  if (!projects.length) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  projects.forEach(p => {
    const thumb = p.image
      ? `<img class="thumb" src="${p.image}" alt="${p.title}">`
      : `<div class="thumb-placeholder"><i class="fas ${p.icon || 'fa-image'}"></i></div>`;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${thumb}</td>
      <td><strong>${p.title}</strong></td>
      <td>${catLabel(p.category)}</td>
      <td style="color:var(--text-muted)">${p.desc}</td>
      <td><div class="table-actions">
        <button class="edit-btn" data-id="${p.id}"><i class="fas fa-edit"></i></button>
        <button class="delete-btn" data-id="${p.id}"><i class="fas fa-trash"></i></button>
      </div></td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('.edit-btn').forEach(b => b.addEventListener('click', () => openProject(parseInt(b.dataset.id))));
  tbody.querySelectorAll('.delete-btn').forEach(b => b.addEventListener('click', () => deleteProject(parseInt(b.dataset.id))));
}

function openProject(id) {
  editingId = id || null;
  document.getElementById('projectModalTitle').textContent = id ? 'עריכת פרויקט' : 'פרויקט חדש';
  document.getElementById('projectSaveBtn').textContent = id ? 'עדכון' : 'הוספה';
  if (id) {
    const p = (data.projects || []).find(x => x.id === id);
    if (p) {
      document.getElementById('projectId').value = p.id;
      document.getElementById('projTitle').value = p.title;
      document.getElementById('projDesc').value = p.desc;
      updateCategoryDropdown(document.getElementById('projCategory'), p.category);
      if (p.image) { showPreview(p.image); } else { clearPreview(); }
    }
  } else {
    document.getElementById('projectForm').reset();
    document.getElementById('projectId').value = '';
    updateCategoryDropdown(document.getElementById('projCategory'));
    clearPreview();
  }
  document.getElementById('projectModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeProjectModal() {
  document.getElementById('projectModal').classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('addProjectBtn').addEventListener('click', () => openProject(null));
document.getElementById('modalClose').addEventListener('click', closeProjectModal);
document.getElementById('modalOverlay').addEventListener('click', closeProjectModal);

document.getElementById('projImage').addEventListener('change', async function() {
  const file = this.files[0];
  if (!file) return;
  const url = await apiUpload(file);
  showPreview(url);
});

document.getElementById('removeImageBtn').addEventListener('click', () => { clearPreview(); document.getElementById('projImage').value = ''; });

function showPreview(url) {
  document.getElementById('previewImg').src = url;
  document.getElementById('previewImg').style.display = 'block';
  document.getElementById('removeImageBtn').style.display = 'inline-block';
}
function clearPreview() {
  document.getElementById('previewImg').src = '';
  document.getElementById('previewImg').style.display = 'none';
  document.getElementById('removeImageBtn').style.display = 'none';
}

document.getElementById('projectForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const id = document.getElementById('projectId').value ? parseInt(document.getElementById('projectId').value) : Date.now();
  const title = document.getElementById('projTitle').value.trim();
  const category = document.getElementById('projCategory').value;
  const desc = document.getElementById('projDesc').value.trim();
  const imgSrc = document.getElementById('previewImg').src || '';
  if (!title || !desc) return;
  if (!data.projects) data.projects = [];
  const existing = data.projects.find(p => p.id === id);
  const project = {
    id, title, category, desc,
    image: imgSrc && (imgSrc.startsWith('data:') || imgSrc.startsWith('http')) ? imgSrc : (existing ? existing.image : ''),
    icon: existing ? existing.icon : 'fa-image',
    bg: existing ? existing.bg : randomBg()
  };
  if (existing) Object.assign(existing, project);
  else data.projects.push(project);
  await apiSave();
  renderProjects();
  closeProjectModal();
  feedback('✅ נשמר');
});

function randomBg() {
  return ['#1a1a2e','#16213e','#0f3460'][Math.floor(Math.random() * 3)];
}

function deleteProject(id) {
  if (!confirm('למחוק?')) return;
  data.projects = data.projects.filter(p => p.id !== id);
  apiSave().then(() => { renderProjects(); feedback('✅ נמחק'); });
}

function updateCategoryDropdown(select, selected) {
  const cats = getCats();
  select.innerHTML = cats.map(c => `<option value="${c.value}"${c.value === selected ? ' selected' : ''}>${c.label}</option>`).join('');
}

// ═══════════════════════════════════════════
//  ABOUT
// ═══════════════════════════════════════════

function renderAbout() {
  const a = data.about || {};
  document.getElementById('aboutName').value = a.name || '';
  document.getElementById('aboutRole').value = a.role || '';
  document.getElementById('aboutEmail').value = a.email || '';
  document.getElementById('aboutPhone').value = a.phone || '';
  document.getElementById('aboutLocation').value = a.location || '';
  document.getElementById('aboutHeroDesc').value = a.heroDesc || '';
  document.getElementById('aboutBio1').value = a.bio1 || '';
  document.getElementById('aboutBio2').value = a.bio2 || '';
  document.getElementById('aboutSkills').value = (a.skills || []).join('\n');
  document.getElementById('aboutStats').value = (a.stats || []).map(s => `${s.num}|${s.label}`).join('\n');
  if (a.photo) { showAboutPhoto(a.photo); } else { clearAboutPhoto(); }
}

document.getElementById('aboutForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  data.about = {
    name: document.getElementById('aboutName').value.trim(),
    role: document.getElementById('aboutRole').value.trim(),
    email: document.getElementById('aboutEmail').value.trim(),
    phone: document.getElementById('aboutPhone').value.trim(),
    location: document.getElementById('aboutLocation').value.trim(),
    heroDesc: document.getElementById('aboutHeroDesc').value.trim(),
    bio1: document.getElementById('aboutBio1').value.trim(),
    bio2: document.getElementById('aboutBio2').value.trim(),
    skills: document.getElementById('aboutSkills').value.split('\n').map(s => s.trim()).filter(Boolean),
    stats: document.getElementById('aboutStats').value.split('\n').map(line => { const p = line.split('|'); return p.length === 2 ? { num: p[0].trim(), label: p[1].trim() } : null; }).filter(Boolean),
    photo: (data.about && data.about.photo) || ''
  };
  await apiSave();
  feedback('✅ נשמר');
});

document.getElementById('aboutPhoto').addEventListener('change', async function() {
  const file = this.files[0];
  if (!file) return;
  const url = await apiUpload(file);
  if (!data.about) data.about = {};
  data.about.photo = url;
  await apiSave();
  showAboutPhoto(url);
  feedback('✅ תמונת פרופיל נשמרה');
});

document.getElementById('removeAboutPhotoBtn').addEventListener('click', async function() {
  clearAboutPhoto();
  document.getElementById('aboutPhoto').value = '';
  if (data.about) data.about.photo = '';
  await apiSave();
  feedback('תמונה הוסרה');
});

function showAboutPhoto(url) {
  document.getElementById('aboutPhotoImg').src = url;
  document.getElementById('aboutPhotoImg').style.display = 'block';
  document.getElementById('removeAboutPhotoBtn').style.display = 'inline-block';
}
function clearAboutPhoto() {
  document.getElementById('aboutPhotoImg').src = '';
  document.getElementById('aboutPhotoImg').style.display = 'none';
  document.getElementById('removeAboutPhotoBtn').style.display = 'none';
}

// ═══════════════════════════════════════════
//  SETTINGS (Categories + Backup)
// ═══════════════════════════════════════════

function renderCategories() {
  const cats = getCats();
  const container = document.getElementById('categoriesList');
  container.innerHTML = '';
  cats.forEach((c, i) => {
    const div = document.createElement('div');
    div.className = 'category-item';
    div.innerHTML = `<span class="cat-label">${c.label}</span> <span class="cat-value">(${c.value})</span>
      <button class="cat-del" data-index="${i}"><i class="fas fa-times"></i></button>`;
    container.appendChild(div);
  });
  container.querySelectorAll('.cat-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.index);
      const cat = cats[idx];
      const used = (data.projects || []).some(p => p.category === cat.value);
      if (used && !confirm(`הקטגוריה "${cat.label}" משויכת לפרויקטים. למחוק?`)) return;
      if (!used && !confirm(`למחוק "${cat.label}"?`)) return;
      cats.splice(idx, 1);
      await apiSave();
      renderCategories();
      renderProjects();
      updateCategoryDropdown(document.getElementById('projCategory'));
    });
  });
}

document.getElementById('addCategoryBtn').addEventListener('click', async () => {
  const value = document.getElementById('newCategoryValue').value.trim().toLowerCase().replace(/\s+/g, '-');
  const label = document.getElementById('newCategoryLabel').value.trim();
  if (!value || !label) { feedback('❌ הזן ערך ותווית', true); return; }
  const cats = getCats();
  if (cats.some(c => c.value === value)) { feedback('❌ כבר קיים', true); return; }
  cats.push({ value, label });
  data.categories = cats;
  await apiSave();
  document.getElementById('newCategoryValue').value = '';
  document.getElementById('newCategoryLabel').value = '';
  renderCategories();
  updateCategoryDropdown(document.getElementById('projCategory'));
  feedback('✅ נוספה');
});

// Backup
document.getElementById('exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'portfolio-backup.json';
  a.click();
});

document.getElementById('importBtn').addEventListener('click', () => {
  document.getElementById('importFileInput').click();
});
document.getElementById('importFileInput').addEventListener('change', async function() {
  const file = this.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const imported = JSON.parse(text);
    if (!imported.projects) { feedback('❌ קובץ לא תקין', true); return; }
    data = imported;
    await apiSave();
    renderAll();
    feedback('✅ יובא');
  } catch (_) { feedback('❌ קובץ לא תקין', true); }
  this.value = '';
});

// ═══════════════════════════════════════════
//  DESIGN
// ═══════════════════════════════════════════

function renderDesign() {
  const t = data.theme || {};
  document.getElementById('designAccent').value = t.accent || '#e94560';
  document.getElementById('designBg').value = t.bg || '#0d0d0d';
  document.getElementById('designSurface').value = t.surface || '#141414';
  document.getElementById('designCard').value = t.card || '#1a1a1a';
  document.getElementById('designText').value = t.text || '#f0f0f0';
  document.getElementById('designTextMuted').value = t.textMuted || '#888888';
  document.getElementById('designBorder').value = t.border || '#2a2a2a';
  document.getElementById('designRadius').value = t.radius || 12;
  document.getElementById('designRadiusVal').textContent = (t.radius || 12) + 'px';
  document.getElementById('designSiteName').value = t.siteName || '';
  document.getElementById('designHeroTitle').value = t.heroTitle || '';
  document.getElementById('designCta').value = t.ctaText || '';
  document.getElementById('designPortfolioSub').value = t.portfolioSub || '';
  document.getElementById('designShowStats').checked = t.showStats !== false;
  document.getElementById('designShowAbout').checked = t.showAbout !== false;
  applyTheme(t);
}

function readTheme() {
  return {
    accent: document.getElementById('designAccent').value,
    bg: document.getElementById('designBg').value,
    surface: document.getElementById('designSurface').value,
    card: document.getElementById('designCard').value,
    text: document.getElementById('designText').value,
    textMuted: document.getElementById('designTextMuted').value,
    border: document.getElementById('designBorder').value,
    radius: parseInt(document.getElementById('designRadius').value),
    siteName: document.getElementById('designSiteName').value.trim(),
    heroTitle: document.getElementById('designHeroTitle').value.trim(),
    ctaText: document.getElementById('designCta').value.trim(),
    portfolioSub: document.getElementById('designPortfolioSub').value.trim(),
    showStats: document.getElementById('designShowStats').checked,
    showAbout: document.getElementById('designShowAbout').checked
  };
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

function adjust(hex, amt) {
  const n = parseInt(hex.replace('#', ''), 16);
  const s = c => Math.min(255, Math.max(0, c + amt));
  return `#${(1 << 24 | s((n >> 16) & 255) << 16 | s((n >> 8) & 255) << 8 | s(n & 255)).toString(16).slice(1)}`;
}

function applyTheme(t) {
  const r = document.documentElement.style;
  r.setProperty('--accent', t.accent);
  r.setProperty('--accent-rgb', hexToRgb(t.accent));
  r.setProperty('--accent-hover', adjust(t.accent, 20));
  r.setProperty('--bg', t.bg);
  r.setProperty('--surface', t.surface);
  r.setProperty('--card', t.card);
  r.setProperty('--card-hover', adjust(t.card, 8));
  r.setProperty('--text', t.text);
  r.setProperty('--text-muted', t.textMuted);
  r.setProperty('--border', t.border);
  r.setProperty('--radius', t.radius + 'px');
  r.setProperty('--radius-sm', Math.max(4, t.radius - 4) + 'px');
}

document.querySelectorAll('#tabDesign input[type="color"]').forEach(inp => {
  inp.addEventListener('input', () => applyTheme(readTheme()));
});
document.getElementById('designRadius').addEventListener('input', function() {
  document.getElementById('designRadiusVal').textContent = this.value + 'px';
  applyTheme(readTheme());
});

document.getElementById('saveDesignBtn').addEventListener('click', async () => {
  data.theme = readTheme();
  await apiSave();
  feedback('✅ עיצוב נשמר');
});

document.getElementById('resetDesignBtn').addEventListener('click', async () => {
  if (!confirm('לאפס עיצוב?')) return;
  data.theme = {
    accent: '#e94560', bg: '#0d0d0d', surface: '#141414', card: '#1a1a1a',
    text: '#f0f0f0', textMuted: '#888888', border: '#2a2a2a', radius: 12,
    siteName: '', heroTitle: '', ctaText: '', portfolioSub: '',
    showStats: true, showAbout: true
  };
  await apiSave();
  renderDesign();
  feedback('✅ אופס');
});

// ═══════════════════════════════════════════
//  SHARE TAB
// ═══════════════════════════════════════════

function renderShare() {
  const prefix = document.getElementById('urlPrefix');
  const urlInput = document.getElementById('publicUrl');
  const usernameInput = document.getElementById('usernameInput');
  const usernameStatus = document.getElementById('usernameStatus');

  const baseUrl = window.location.origin;
  const username = window.PORTFOLIO_USER.username;

  prefix.textContent = baseUrl + '/u/';
  usernameInput.value = username;
  urlInput.value = baseUrl + '/u/' + username;
  document.getElementById('openUrlBtn').href = baseUrl + '/u/' + username;
}

document.getElementById('copyUrlBtn').addEventListener('click', () => {
  const input = document.getElementById('publicUrl');
  input.select();
  navigator.clipboard.writeText(input.value).then(() => feedback('✅ הועתק'));
});

document.getElementById('updateUsernameBtn').addEventListener('click', async () => {
  const input = document.getElementById('usernameInput');
  const status = document.getElementById('usernameStatus');
  const val = input.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 50);
  if (!val) { status.textContent = '❌ לא תקין'; status.style.color = '#e94560'; return; }
  status.textContent = '⏳ בודק...';
  const check = await fetch('/api/portfolio/check-username', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: val })
  });
  const result = await check.json();
  if (!result.valid) {
    status.textContent = '❌ תפוס או לא תקין';
    status.style.color = '#e94560';
    return;
  }
  const save = await fetch('/api/portfolio/update-username', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: val })
  });
  const saveResult = await save.json();
  if (saveResult.error) {
    status.textContent = '❌ ' + saveResult.error;
    status.style.color = '#e94560';
    return;
  }
  window.PORTFOLIO_USER.username = val;
  status.textContent = '✅ נשמר!';
  status.style.color = '#2ecc71';
  renderShare();
  feedback('✅ כינוי נשמר');
});

// ═══════════════════════════════════════════
//  FEEDBACK
// ═══════════════════════════════════════════

function feedback(msg, isError) {
  const existing = document.querySelector('.toast-feedback');
  if (existing) existing.remove();
  const div = document.createElement('div');
  div.className = 'toast-feedback';
  div.textContent = msg;
  div.style.cssText = `
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    background: ${isError ? '#e94560' : '#2ecc71'}; color: #fff;
    padding: 12px 28px; border-radius: 50px; font-weight: 600;
    z-index: 999; box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    animation: modalIn 0.3s ease; direction: rtl;
  `;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}

// ═══════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════

async function renderAll() {
  renderProjects();
  renderAbout();
  renderCategories();
  renderDesign();
  renderShare();
}

(async function init() {
  try {
    await apiLoad();
    renderAll();
  } catch (e) {
    document.getElementById('dashboard').innerHTML = '<div class="login-screen"><div class="login-card"><h1>שגיאה</h1><p>לא ניתן לטעון את הנתונים</p></div></div>';
  }
})();
