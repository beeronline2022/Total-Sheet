const form = document.getElementById('searchForm');
const input = document.getElementById('searchInput');
const button = document.getElementById('searchButton');
const hint = document.getElementById('resultsHint');
const countLabel = document.getElementById('resultsCount');
const grid = document.getElementById('resultsGrid');
const tabsBar = document.getElementById('tabsBar');
const addToggle = document.getElementById('addToggle');
const addPanel = document.getElementById('addPanel');
const addSheetSelect = document.getElementById('addSheetSelect');
const addFields = document.getElementById('addFields');
const addSubmitButton = document.getElementById('addSubmitButton');
const addStatus = document.getElementById('addStatus');
const resultsSection = document.getElementById('resultsSection');

let lastKeyword = '';
let selectedTab = ''; // '' = ค้นทุกแท็บ
let jsonpCounter = 0;
let allTabNames = [];

document.addEventListener('DOMContentLoaded', () => {
  loadTabs();
});

/**
 * เรียก Apps Script ผ่านเทคนิค JSONP แทน fetch()
 * เพราะ Apps Script Web App ไม่ส่งค่า CORS header กลับมา ทำให้ fetch() อ่านผลลัพธ์ไม่ได้
 * แต่การโหลดผ่านแท็ก <script> ไม่ติดข้อจำกัด CORS จึงใช้วิธีนี้แทน
 */
function jsonpRequest(url) {
  return new Promise((resolve, reject) => {
    const callbackName = `jsonpCallback_${Date.now()}_${jsonpCounter++}`;
    const script = document.createElement('script');

    const cleanup = () => {
      delete window[callbackName];
      script.remove();
    };

    window[callbackName] = (data) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('เชื่อมต่อ API ไม่สำเร็จ'));
    };

    script.src = `${url}&callback=${callbackName}`;
    document.body.appendChild(script);
  });
}

async function loadTabs() {
  if (!API_URL || API_URL.includes('วาง_URL')) {
    showHint('ยังไม่ได้ตั้งค่า API_URL ใน config.js', true);
    return;
  }

  try {
    const result = await jsonpRequest(`${API_URL}?action=sheets&key=${encodeURIComponent(ACCESS_KEY)}`);

    if (!result.ok) {
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
  allTabNames = tabNames;
  tabsBar.innerHTML = '';
  tabsBar.hidden = false;

  tabsBar.appendChild(createTabPill('ทั้งหมด', ''));
  tabNames.forEach(name => tabsBar.appendChild(createTabPill(name, name)));

  updateTabPillStates();
  populateAddSheetSelect(tabNames);
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

    const result = await jsonpRequest(url);
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

/* ===== แถบเพิ่มข้อมูล ===== */

addToggle.addEventListener('click', () => {
  const isOpen = !addPanel.hidden;
  addPanel.hidden = isOpen;
  resultsSection.hidden = !isOpen;
  addToggle.setAttribute('aria-pressed', String(!isOpen));
  addToggle.textContent = isOpen ? '+ เพิ่มข้อมูล' : '× ปิดฟอร์ม';
});

function populateAddSheetSelect(tabNames) {
  addSheetSelect.innerHTML = '<option value="">-- เลือกแท็บ --</option>';
  tabNames.forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    addSheetSelect.appendChild(option);
  });
}

addSheetSelect.addEventListener('change', async () => {
  const sheetName = addSheetSelect.value;
  addFields.innerHTML = '';
  addSubmitButton.disabled = true;
  setAddStatus('', null);

  if (!sheetName) return;

  setAddStatus('กำลังโหลดคอลัมน์...', null);
  try {
    const url = `${API_URL}?action=headers&sheet=${encodeURIComponent(sheetName)}&key=${encodeURIComponent(ACCESS_KEY)}`;
    const result = await jsonpRequest(url);
    if (!result.ok) throw new Error(result.error || 'โหลดคอลัมน์ไม่สำเร็จ');

    renderAddFields(result.headers);
    addSubmitButton.disabled = false;
    setAddStatus('', null);
  } catch (err) {
    setAddStatus('เกิดข้อผิดพลาด: ' + err.message, 'error');
  }
});

function renderAddFields(headers) {
  addFields.innerHTML = '';
  headers.forEach(header => {
    const wrap = document.createElement('div');
    wrap.className = 'add-field';

    const label = document.createElement('label');
    label.textContent = header;
    label.setAttribute('for', `field-${header}`);

    const inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.id = `field-${header}`;
    inputEl.dataset.header = header;

    wrap.append(label, inputEl);
    addFields.appendChild(wrap);
  });
}

addSubmitButton.addEventListener('click', async () => {
  const sheetName = addSheetSelect.value;
  if (!sheetName) return;

  const data = {};
  addFields.querySelectorAll('input').forEach(inputEl => {
    data[inputEl.dataset.header] = inputEl.value;
  });

  addSubmitButton.disabled = true;
  setAddStatus('กำลังบันทึก...', null);

  try {
    const parts = [
      'action=add',
      `sheet=${encodeURIComponent(sheetName)}`,
      `data=${encodeURIComponent(JSON.stringify(data))}`,
      `key=${encodeURIComponent(ACCESS_KEY)}`
    ];
    const result = await jsonpRequest(`${API_URL}?${parts.join('&')}`);
    if (!result.ok) throw new Error(result.error || 'บันทึกไม่สำเร็จ');

    setAddStatus('บันทึกข้อมูลสำเร็จ', 'success');
    addFields.querySelectorAll('input').forEach(inputEl => { inputEl.value = ''; });

    // รีเฟรชผลค้นหาที่แสดงอยู่ ให้เห็นข้อมูลใหม่ทันที (เผื่อผู้ใช้สลับกลับไปดู)
    if (selectedTab === sheetName || !selectedTab) {
      runSearch(lastKeyword);
    }
  } catch (err) {
    setAddStatus('เกิดข้อผิดพลาด: ' + err.message, 'error');
  } finally {
    addSubmitButton.disabled = false;
  }
});

function setAddStatus(message, type) {
  addStatus.textContent = message;
  addStatus.className = 'add-panel__status' + (type ? ` add-panel__status--${type}` : '');
}
