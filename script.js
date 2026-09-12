const heroTitle = document.getElementById('heroTitle');
const booksSection = document.getElementById('booksSection');
const booksGrid = document.getElementById('booksGrid');
const booksHint = document.getElementById('booksHint');
const workspace = document.getElementById('workspace');
const backButton = document.getElementById('backButton');
const tabsBar = document.getElementById('tabsBar');

const form = document.getElementById('searchForm');
const input = document.getElementById('searchInput');
const button = document.getElementById('searchButton');
const hint = document.getElementById('resultsHint');
const countLabel = document.getElementById('resultsCount');
const grid = document.getElementById('resultsGrid');

const addToggle = document.getElementById('addToggle');
const addPanel = document.getElementById('addPanel');
const addPanelSheetName = document.getElementById('addPanelSheetName');
const addFields = document.getElementById('addFields');
const addSubmitButton = document.getElementById('addSubmitButton');
const addStatus = document.getElementById('addStatus');

const manageToggle = document.getElementById('manageToggle');
const managePanel = document.getElementById('managePanel');
const manageChips = document.getElementById('manageChips');
const manageStatus = document.getElementById('manageStatus');

const trashToggle = document.getElementById('trashToggle');
const trashPanel = document.getElementById('trashPanel');
const trashList = document.getElementById('trashList');
const trashStatus = document.getElementById('trashStatus');

const resultsSection = document.getElementById('resultsSection');

let currentBook = '';
let selectedSheet = ''; // '' = ทุกแท็บในไฟล์นี้
let lastKeyword = '';
let jsonpCounter = 0;

document.addEventListener('DOMContentLoaded', () => {
  loadBooks();
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

function apiUrl(params) {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`);
  parts.push(`key=${encodeURIComponent(ACCESS_KEY)}`);
  return `${API_URL}?${parts.join('&')}`;
}

/* ===== ขั้นที่ 1: เลือกไฟล์ (โหลดเร็ว ไม่แตะเนื้อหาในชีตเลย) ===== */

async function loadBooks() {
  if (!API_URL || API_URL.includes('วาง_URL')) {
    booksHint.textContent = 'ยังไม่ได้ตั้งค่า API_URL ใน config.js';
    return;
  }

  booksHint.textContent = 'กำลังโหลดรายชื่อไฟล์...';
  try {
    const result = await jsonpRequest(apiUrl({ action: 'books' }));
    if (!result.ok) throw new Error(result.error || 'โหลดรายชื่อไฟล์ไม่สำเร็จ');

    booksHint.textContent = '';
    renderBooks(result.books);
  } catch (err) {
    booksHint.textContent = 'เกิดข้อผิดพลาด: ' + err.message;
  }
}

function renderBooks(books) {
  booksGrid.innerHTML = '';
  books.forEach(book => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'book-card';
    card.innerHTML = `<span class="book-card__name">${escapeHtml(book)}</span><span class="book-card__arrow">→</span>`;
    card.addEventListener('click', () => openBook(book));
    booksGrid.appendChild(card);
  });
}

async function openBook(book) {
  currentBook = book;
  selectedSheet = '';
  lastKeyword = '';
  input.value = '';

  booksSection.hidden = true;
  workspace.hidden = false;
  heroTitle.innerHTML = escapeHtml(book);

  addPanel.hidden = true;
  managePanel.hidden = true;
  trashPanel.hidden = true;
  addToggle.setAttribute('aria-pressed', 'false');
  addToggle.textContent = '+ เพิ่มข้อมูล';
  manageToggle.hidden = true;
  manageToggle.setAttribute('aria-pressed', 'false');
  manageToggle.textContent = 'จัดการคอลัมน์';
  trashToggle.setAttribute('aria-pressed', 'false');
  trashToggle.textContent = '🗑 ถังขยะ';

  showHint('กำลังโหลดรายชื่อแท็บ...', false);
  tabsBar.innerHTML = '';

  try {
    const result = await jsonpRequest(apiUrl({ action: 'sheets', book }));
    if (!result.ok) throw new Error(result.error || 'โหลดแท็บไม่สำเร็จ');

    renderTabs(result.sheets);
    showHint('เลือกแท็บด้านบน หรือพิมพ์คำค้นหาแล้วกด Enter', false);
  } catch (err) {
    showHint('เกิดข้อผิดพลาด: ' + err.message, true);
  }
}

backButton.addEventListener('click', () => {
  currentBook = '';
  selectedSheet = '';
  workspace.hidden = true;
  booksSection.hidden = false;
  heroTitle.innerHTML = 'เลือกไฟล์ที่ต้องการ<br>เพื่อเริ่มค้นหา';
});

/* ===== ขั้นที่ 2: เลือกแท็บ ===== */

function renderTabs(sheets) {
  tabsBar.innerHTML = '';
  tabsBar.appendChild(createTabPill('ทั้งหมดในไฟล์นี้', ''));
  sheets.forEach(s => tabsBar.appendChild(createTabPill(s.name, s.name)));
  updateTabPillStates();
  populateAddFieldsPlaceholder();
}

function createTabPill(label, sheetName) {
  const pill = document.createElement('button');
  pill.type = 'button';
  pill.className = 'tab-pill';
  pill.textContent = label;
  pill.dataset.sheet = sheetName;
  pill.setAttribute('aria-pressed', 'false');
  pill.addEventListener('click', () => {
    selectedSheet = sheetName;
    updateTabPillStates();
    manageToggle.hidden = !selectedSheet; // จัดการคอลัมน์ได้เฉพาะตอนเลือกแท็บเดียว
    managePanel.hidden = true;
    manageToggle.setAttribute('aria-pressed', 'false');
    manageToggle.textContent = 'จัดการคอลัมน์';
    if (addToggle.getAttribute('aria-pressed') === 'true') loadAddFields();
    runSearch(input.value.trim());
  });
  return pill;
}

function updateTabPillStates() {
  Array.from(tabsBar.children).forEach(pill => {
    pill.setAttribute('aria-pressed', String(pill.dataset.sheet === selectedSheet));
  });
}

/* ===== ขั้นที่ 3: ค้นหา / แสดงผล ===== */

form.addEventListener('submit', (e) => {
  e.preventDefault();
  runSearch(input.value.trim());
});

async function runSearch(keyword) {
  if (!currentBook) return;

  lastKeyword = keyword;
  setLoading(true);

  try {
    const url = apiUrl({ action: 'search', q: keyword, book: currentBook, sheet: selectedSheet || undefined });
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

  const body = document.createElement('div');
  body.className = 'result-card__body';

  const meta = document.createElement('div');
  meta.className = 'result-card__meta';
  meta.textContent = `${row.sheet} · แถวที่ ${row.row}`;
  body.appendChild(meta);

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
  body.appendChild(cellsWrap);
  card.appendChild(body);

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'result-card__delete';
  deleteBtn.textContent = '🗑';
  deleteBtn.title = 'ลบแถวนี้ออกจากชีตจริง';
  deleteBtn.addEventListener('click', () => deleteRow(row, card, deleteBtn));
  card.appendChild(deleteBtn);

  return card;
}

async function deleteRow(row, cardEl, buttonEl) {
  const confirmed = confirm(`ยืนยันลบข้อมูลแถวที่ ${row.row} ในแท็บ "${row.sheet}" ออกจากชีตจริง?\n\nการลบนี้ย้อนกลับไม่ได้`);
  if (!confirmed) return;

  buttonEl.disabled = true;
  try {
    const url = apiUrl({ action: 'deleteRow', book: currentBook, sheet: row.sheet, row: row.row });
    const result = await jsonpRequest(url);
    if (!result.ok) throw new Error(result.error || 'ลบไม่สำเร็จ');

    cardEl.remove();
    if (!grid.children.length) {
      countLabel.hidden = true;
      showHint('ไม่พบข้อมูลที่ตรงกับคำค้นหา', false);
    } else {
      countLabel.textContent = `พบ ${grid.children.length} รายการ`;
    }
  } catch (err) {
    alert('เกิดข้อผิดพลาด: ' + err.message);
    buttonEl.disabled = false;
  }
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

function populateAddFieldsPlaceholder() {
  addFields.innerHTML = '';
  setAddStatus('', null);
}

addToggle.addEventListener('click', () => {
  const isOpen = !addPanel.hidden;
  addPanel.hidden = isOpen;
  managePanel.hidden = true;
  trashPanel.hidden = true;
  manageToggle.setAttribute('aria-pressed', 'false');
  manageToggle.textContent = 'จัดการคอลัมน์';
  trashToggle.setAttribute('aria-pressed', 'false');
  trashToggle.textContent = '🗑 ถังขยะ';
  addToggle.setAttribute('aria-pressed', String(!isOpen));
  addToggle.textContent = isOpen ? '+ เพิ่มข้อมูล' : '× ปิดฟอร์ม';

  if (!isOpen) loadAddFields();
});

async function loadAddFields() {
  if (!selectedSheet) {
    addPanelSheetName.textContent = '(กรุณาเลือกแท็บใดแท็บหนึ่งด้านบนก่อน)';
    addFields.innerHTML = '';
    addSubmitButton.disabled = true;
    return;
  }

  addPanelSheetName.textContent = selectedSheet;
  addFields.innerHTML = '';
  addSubmitButton.disabled = true;
  setAddStatus('กำลังโหลดคอลัมน์...', null);

  try {
    const url = apiUrl({ action: 'headers', book: currentBook, sheet: selectedSheet });
    const result = await jsonpRequest(url);
    if (!result.ok) throw new Error(result.error || 'โหลดคอลัมน์ไม่สำเร็จ');

    renderAddFields(result.headers);
    addSubmitButton.disabled = false;
    setAddStatus('', null);
  } catch (err) {
    setAddStatus('เกิดข้อผิดพลาด: ' + err.message, 'error');
  }
}

function renderAddFields(headers) {
  addFields.innerHTML = '';
  headers.forEach(header => {
    const wrap = document.createElement('div');
    wrap.className = 'add-field';

    const label = document.createElement('label');
    label.textContent = header.name;
    label.setAttribute('for', `field-${header.name}`);
    wrap.appendChild(label);

    wrap.appendChild(buildFieldInput(header));
    addFields.appendChild(wrap);
  });
}

/**
 * สร้างช่องกรอกให้เหมาะกับแต่ละคอลัมน์:
 * - ถ้าชื่อคอลัมน์มีคำว่า "วันที่" หรือ "date" → ใช้ปฏิทินเลือกวันที่
 * - ถ้าคอลัมน์มี options (ตั้ง Data Validation แบบเลือกจากรายการไว้ในชีตอยู่แล้ว) → ใช้ dropdown ตามนั้น
 * - นอกนั้น → ช่องกรอกข้อความปกติ
 */
function buildFieldInput(header) {
  const isDateColumn = /วันที่|date/i.test(header.name);

  if (header.options && header.options.length > 0) {
    const select = document.createElement('select');
    select.id = `field-${header.name}`;
    select.dataset.header = header.name;

    const blankOption = document.createElement('option');
    blankOption.value = '';
    blankOption.textContent = '-- เลือก --';
    select.appendChild(blankOption);

    header.options.forEach(optionValue => {
      const option = document.createElement('option');
      option.value = optionValue;
      option.textContent = optionValue;
      select.appendChild(option);
    });

    return select;
  }

  const inputEl = document.createElement('input');
  inputEl.type = isDateColumn ? 'date' : 'text';
  inputEl.id = `field-${header.name}`;
  inputEl.dataset.header = header.name;
  return inputEl;
}

addSubmitButton.addEventListener('click', async () => {
  if (!selectedSheet) return;

  const data = {};
  addFields.querySelectorAll('input, select').forEach(fieldEl => {
    data[fieldEl.dataset.header] = fieldEl.value;
  });

  addSubmitButton.disabled = true;
  setAddStatus('กำลังบันทึก...', null);

  try {
    const url = apiUrl({
      action: 'add',
      book: currentBook,
      sheet: selectedSheet,
      data: JSON.stringify(data)
    });
    const result = await jsonpRequest(url);
    if (!result.ok) throw new Error(result.error || 'บันทึกไม่สำเร็จ');

    setAddStatus('บันทึกข้อมูลสำเร็จ', 'success');
    addFields.querySelectorAll('input, select').forEach(fieldEl => { fieldEl.value = ''; });
    runSearch(lastKeyword);
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

/* ===== แถบจัดการคอลัมน์ (ลบคอลัมน์) ===== */

manageToggle.addEventListener('click', () => {
  if (!selectedSheet) return;
  const isOpen = !managePanel.hidden;
  managePanel.hidden = isOpen;
  addPanel.hidden = true;
  trashPanel.hidden = true;
  addToggle.setAttribute('aria-pressed', 'false');
  addToggle.textContent = '+ เพิ่มข้อมูล';
  trashToggle.setAttribute('aria-pressed', 'false');
  trashToggle.textContent = '🗑 ถังขยะ';
  manageToggle.setAttribute('aria-pressed', String(!isOpen));
  manageToggle.textContent = isOpen ? 'จัดการคอลัมน์' : 'ปิดหน้าจัดการ';

  if (!isOpen) loadManageColumns();
});

async function loadManageColumns() {
  manageChips.innerHTML = '';
  setManageStatus('กำลังโหลดคอลัมน์...', null);
  try {
    const url = apiUrl({ action: 'headers', book: currentBook, sheet: selectedSheet });
    const result = await jsonpRequest(url);
    if (!result.ok) throw new Error(result.error || 'โหลดคอลัมน์ไม่สำเร็จ');

    renderManageChips(result.headers);
    setManageStatus('', null);
  } catch (err) {
    setManageStatus('เกิดข้อผิดพลาด: ' + err.message, 'error');
  }
}

function renderManageChips(headers) {
  manageChips.innerHTML = '';
  if (headers.length === 0) {
    manageChips.innerHTML = '<p class="manage-panel__status">ไม่มีคอลัมน์ในแท็บนี้</p>';
    return;
  }
  headers.forEach(header => {
    const name = header.name;
    const chip = document.createElement('span');
    chip.className = 'manage-chip';

    const label = document.createElement('span');
    label.textContent = name;

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'manage-chip__delete';
    delBtn.textContent = '×';
    delBtn.title = `ลบคอลัมน์ "${name}"`;
    delBtn.addEventListener('click', () => deleteColumn(name, chip, delBtn));

    chip.append(label, delBtn);
    manageChips.appendChild(chip);
  });
}

async function deleteColumn(header, chipEl, buttonEl) {
  const confirmed = confirm(`ยืนยันลบคอลัมน์ "${header}" ออกจากแท็บ "${selectedSheet}" ทั้งคอลัมน์?\n\nข้อมูลทุกแถวในคอลัมน์นี้จะหายไปด้วย และย้อนกลับไม่ได้`);
  if (!confirmed) return;

  buttonEl.disabled = true;
  try {
    const url = apiUrl({ action: 'deleteColumn', book: currentBook, sheet: selectedSheet, column: header });
    const result = await jsonpRequest(url);
    if (!result.ok) throw new Error(result.error || 'ลบคอลัมน์ไม่สำเร็จ');

    chipEl.remove();
    setManageStatus(`ลบคอลัมน์ "${header}" สำเร็จ`, 'success');
    runSearch(lastKeyword); // รีเฟรชผลลัพธ์ให้เห็นว่าคอลัมน์หายไปแล้ว
  } catch (err) {
    setManageStatus('เกิดข้อผิดพลาด: ' + err.message, 'error');
    buttonEl.disabled = false;
  }
}

function setManageStatus(message, type) {
  manageStatus.textContent = message;
  manageStatus.className = 'manage-panel__status' + (type ? ` manage-panel__status--${type}` : '');
}

/* ===== แถบถังขยะ / กู้คืนข้อมูล ===== */

trashToggle.addEventListener('click', () => {
  const isOpen = !trashPanel.hidden;
  trashPanel.hidden = isOpen;
  addPanel.hidden = true;
  managePanel.hidden = true;
  addToggle.setAttribute('aria-pressed', 'false');
  addToggle.textContent = '+ เพิ่มข้อมูล';
  manageToggle.setAttribute('aria-pressed', 'false');
  manageToggle.textContent = 'จัดการคอลัมน์';
  trashToggle.setAttribute('aria-pressed', String(!isOpen));
  trashToggle.textContent = isOpen ? '🗑 ถังขยะ' : '× ปิดถังขยะ';

  if (!isOpen) loadTrash();
});

async function loadTrash() {
  trashList.innerHTML = '';
  setTrashStatus('กำลังโหลดรายการที่ลบล่าสุด...', null);
  try {
    const url = apiUrl({ action: 'trash', book: currentBook });
    const result = await jsonpRequest(url);
    if (!result.ok) throw new Error(result.error || 'โหลดถังขยะไม่สำเร็จ');

    renderTrashItems(result.items);
    setTrashStatus(result.items.length === 0 ? 'ยังไม่มีรายการที่ถูกลบในไฟล์นี้' : '', null);
  } catch (err) {
    setTrashStatus('เกิดข้อผิดพลาด: ' + err.message, 'error');
  }
}

function renderTrashItems(items) {
  trashList.innerHTML = '';
  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'trash-item';

    const info = document.createElement('div');
    info.className = 'trash-item__info';

    const meta = document.createElement('div');
    meta.className = 'trash-item__meta';
    const typeLabel = item.type === 'row' ? 'ลบแถว' : 'ลบคอลัมน์';
    meta.textContent = `${typeLabel} · ${item.sheetName} · ${formatDeletedAt(item.deletedAt)}`;

    const preview = document.createElement('div');
    preview.className = 'trash-item__preview';
    preview.textContent = item.preview;

    info.append(meta, preview);

    const restoreBtn = document.createElement('button');
    restoreBtn.type = 'button';
    restoreBtn.className = 'trash-item__restore';
    restoreBtn.textContent = 'กู้คืน';
    restoreBtn.addEventListener('click', () => restoreTrashItem(item, row, restoreBtn));

    row.append(info, restoreBtn);
    trashList.appendChild(row);
  });
}

function formatDeletedAt(isoString) {
  try {
    const d = new Date(isoString);
    return d.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
  } catch (e) {
    return isoString;
  }
}

async function restoreTrashItem(item, rowEl, buttonEl) {
  buttonEl.disabled = true;
  buttonEl.textContent = 'กำลังกู้คืน...';
  try {
    const url = apiUrl({ action: 'restore', book: currentBook, id: item.id });
    const result = await jsonpRequest(url);
    if (!result.ok) throw new Error(result.error || 'กู้คืนไม่สำเร็จ');

    rowEl.remove();
    setTrashStatus(result.message, 'success');

    // ถ้ากำลังดูแท็บเดียวกับที่เพิ่งกู้คืนอยู่ ให้รีเฟรชผลลัพธ์ให้เห็นข้อมูลที่กลับมาทันที
    if (selectedSheet === item.sheetName || !selectedSheet) {
      runSearch(lastKeyword);
    }
  } catch (err) {
    setTrashStatus('เกิดข้อผิดพลาด: ' + err.message, 'error');
    buttonEl.disabled = false;
    buttonEl.textContent = 'กู้คืน';
  }
}

function setTrashStatus(message, type) {
  trashStatus.textContent = message;
  trashStatus.className = 'trash-panel__status' + (type ? ` trash-panel__status--${type}` : '');
}
