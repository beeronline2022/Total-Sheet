const form = document.getElementById('searchForm');
const input = document.getElementById('searchInput');
const button = document.getElementById('searchButton');
const hint = document.getElementById('resultsHint');
const countLabel = document.getElementById('resultsCount');
const grid = document.getElementById('resultsGrid');
const tabsBar = document.getElementById('tabsBar');

let lastKeyword = '';
let selectedTab = ''; // '' = ค้นทุกแท็บ

document.addEventListener('DOMContentLoaded', () => {
  loadTabs();
});

async function loadTabs() {
  if (!API_URL || API_URL.includes('วาง_URL')) {
    showHint('ยังไม่ได้ตั้งค่า API_URL ใน config.js', true);
    return;
  }

  try {
    const response = await fetch(`${API_URL}?action=sheets&key=${encodeURIComponent(ACCESS_KEY)}`);
    const result = await response.json();

    if (!result.ok) {
      // เช่น ยังไม่ได้ตั้ง DASHBOARD_ALLOWED_EMAILS หรือบัญชีไม่มีสิทธิ์
      showHint(result.error || 'ไม่สามารถเข้าถึงข้อมูลได้', true);
      return;
    }

    renderTabs(result.sheets.map(s => s.name));
    runSearch(''); // แสดงข้อมูลทั้งหมด (ทุกแท็บ) ทันทีตั้งแต่เปิดหน้าเว็บ
  } catch (err) {
    showHint('เชื่อมต่อ API ไม่สำเร็จ: ' + err.message, true);
  }
}

function renderTabs(tabNames) {
  tabsBar.innerHTML = '';
  tabsBar.hidden = false;

  tabsBar.appendChild(createTabPill('ทั้งหมด', ''));
  tabNames.forEach(name => tabsBar.appendChild(createTabPill(name, name)));

  updateTabPillStates();
}

function createTabPill(label, value) {
  const pill = document.createElement('button');
  pill.type = 'button';
  pill.className = 'tab-pill';
  pill.textContent = label;
  pill.dataset.value = value;
  pill.setAttribute('aria-pressed', 'false');
  pill.addEventListener('click', () => {
    selectedTab = value;
    updateTabPillStates();
    runSearch(input.value.trim());
  });
  return pill;
}

function updateTabPillStates() {
  Array.from(tabsBar.children).forEach(pill => {
    const isActive = pill.dataset.value === selectedTab;
    pill.setAttribute('aria-pressed', String(isActive));
  });
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  runSearch(input.value.trim());
});

async function runSearch(keyword) {
  if (!API_URL || API_URL.includes('วาง_URL')) {
    showHint('ยังไม่ได้ตั้งค่า API_URL ใน config.js', true);
    return;
  }

  lastKeyword = keyword;
  setLoading(true);

  try {
    const parts = ['action=search', `q=${encodeURIComponent(keyword)}`, `key=${encodeURIComponent(ACCESS_KEY)}`];
    if (selectedTab) parts.push(`sheet=${encodeURIComponent(selectedTab)}`);
    const url = `${API_URL}?${parts.join('&')}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('เชื่อมต่อ API ไม่สำเร็จ (' + response.status + ')');

    const result = await response.json();
    if (!result.ok) throw new Error(result.error || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');

    renderResults(result.results);
  } catch (err) {
    showHint('เกิดข้อผิดพลาด: ' + err.message, true);
  } finally {
    setLoading(false);
  }
}

function renderResults(rows) {
  grid.innerHTML = '';

  if (!rows || rows.length === 0) {
    countLabel.hidden = true;
    showHint('ไม่พบข้อมูลที่ตรงกับคำค้นหา', false);
    return;
  }

  hint.hidden = true;
  countLabel.hidden = false;
  countLabel.textContent = `พบ ${rows.length} รายการ`;

  rows.forEach(row => grid.appendChild(buildRawCard(row)));
}

function buildRawCard(row) {
  const card = document.createElement('div');
  card.className = 'result-card';

  const meta = document.createElement('div');
  meta.className = 'result-card__meta';
  meta.textContent = `${row.sheet} · แถวที่ ${row.row}`;
  card.appendChild(meta);

  const cellsWrap = document.createElement('div');
  cellsWrap.className = 'result-card__cells';
  row.cells
    .filter(cell => cell.trim() !== '')
    .forEach(cell => {
      const cellEl = document.createElement('span');
      cellEl.className = 'result-card__cell';
      cellEl.innerHTML = highlightMatch(cell, lastKeyword);
      cellsWrap.appendChild(cellEl);
    });
  card.appendChild(cellsWrap);

  return card;
}

function highlightMatch(text, keyword) {
  const safeText = escapeHtml(text);
  if (!keyword) return safeText;

  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedKeyword})`, 'ig');
  return safeText.replace(regex, '<mark>$1</mark>');
}

function showHint(message, isError) {
  hint.textContent = message;
  hint.hidden = false;
  hint.classList.toggle('results__hint--error', !!isError);
  countLabel.hidden = true;
  grid.innerHTML = '';
}

function setLoading(isLoading) {
  button.disabled = isLoading;
  button.textContent = isLoading ? 'กำลังค้นหา...' : 'ค้นหา';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
