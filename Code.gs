// ใส่ ID ของไฟล์ Google Sheet ตรงนี้ (คัดลอกจากลิงก์ไฟล์ ส่วนระหว่าง /d/ กับ /edit)
const SPREADSHEET_ID = '1LDHINffP0_p9QlMppzzH-ivgod8tybYhWtuyqllNefM'; // CS : TOSM 2026

const CACHE_SECONDS = 300;
const HIDDEN_SHEETS = ['ชีต12']; // เพิ่มชื่อชีตที่ไม่ต้องการให้ขึ้นเมนูได้ที่นี่
const ALLOWED_EMAILS_PROPERTY = 'DASHBOARD_ALLOWED_EMAILS';
const SEARCH_RESULT_LIMIT = 200; // จำกัดจำนวนผลลัพธ์การค้นหาต่อครั้ง

function doGet(e) {
  const callback = (e.parameter.callback || '').replace(/[^A-Za-z0-9_]/g, '');
  const action = e.parameter.action || 'sheets';
  let payload;
  try {
    requireAuthorizedUser_();
    if (action === 'sheet') {
      payload = getSheetData_(e.parameter.name);
    } else if (action === 'search') {
      payload = searchAll_(e.parameter.q, e.parameter.sheet);
    } else {
      payload = getSheets_();
    }
  } catch (error) {
    payload = { ok: false, error: error.message };
  }
  const output = callback ? `${callback}(${JSON.stringify(payload)});` : JSON.stringify(payload);
  return ContentService.createTextOutput(output).setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}

/** ตรวจสิทธิ์จากรายการอีเมลใน Script Properties (คั่นด้วย comma หรือขึ้นบรรทัดใหม่) */
function requireAuthorizedUser_() {
  const email = Session.getActiveUser().getEmail().trim().toLowerCase();
  const rawAllowedEmails = PropertiesService.getScriptProperties().getProperty(ALLOWED_EMAILS_PROPERTY) || '';
  const allowedEmails = rawAllowedEmails.split(/[\s,;]+/).filter(Boolean).map(value => value.toLowerCase());

  if (!allowedEmails.length) {
    throw new Error('ผู้ดูแลยังไม่ได้กำหนดรายชื่อผู้มีสิทธิ์');
  }
  if (!email) {
    throw new Error('ไม่สามารถยืนยันอีเมล Google ได้ กรุณาเข้าสู่ระบบด้วยบัญชีองค์กรที่ได้รับอนุญาต');
  }
  if (!allowedEmails.includes(email)) {
    throw new Error(`บัญชี ${email} ไม่มีสิทธิ์เข้าถึง Dashboard นี้`);
  }
  return email;
}

function getSheets_() {
  const sheetList = getSpreadsheet_().getSheets()
    .filter(sheet => !HIDDEN_SHEETS.includes(sheet.getName()))
    .map(sheet => ({ name: sheet.getName(), rowCount: countRecords_(sheet) }));
  return { ok: true, sheets: sheetList, updatedAt: new Date().toISOString() };
}

function getSheetData_(name) {
  if (!name) throw new Error('ไม่พบชื่อชีต');
  const sheet = getSpreadsheet_().getSheetByName(name);
  if (!sheet || HIDDEN_SHEETS.includes(name)) throw new Error('ไม่พบชีตที่ร้องขอ');
  const cache = CacheService.getScriptCache(); const key = `dashboard:${name}`;
  const saved = cache.get(key); if (saved) return JSON.parse(saved);
  const values = sheet.getDataRange().getDisplayValues();
  const headers = (values.shift() || []).map((header, i) => header.trim() || `คอลัมน์ ${i + 1}`);
  const rows = values.filter(row => row.some(cell => cell.trim())).map(row => {
    const record = {}; headers.forEach((header, i) => record[header] = row[i] || ''); return record;
  });
  const payload = { ok: true, headers, rows, updatedAt: new Date().toISOString() };
  cache.put(key, JSON.stringify(payload), CACHE_SECONDS);
  return payload;
}

/**
 * ค้นหาแบบเต็มข้อความทุกเซลล์ ในทุกแท็บที่ไม่ถูกซ่อน (หรือเฉพาะแท็บที่ระบุ)
 * ใช้กับไฟล์ที่มีหลายแท็บ/หลายตารางปะปนกัน ไม่ยึด header เป็นหลัก
 */
function searchAll_(keyword, sheetFilter) {
  const kw = (keyword || '').toString().trim().toLowerCase();
  const sheets = getSpreadsheet_().getSheets()
    .filter(sheet => !HIDDEN_SHEETS.includes(sheet.getName()))
    .filter(sheet => !sheetFilter || sheet.getName() === sheetFilter);

  const results = [];
  for (const sheet of sheets) {
    const values = getRawValues_(sheet);
    for (let r = 0; r < values.length; r++) {
      const row = values[r];
      if (row.every(cell => !cell.trim())) continue;
      if (kw && !row.some(cell => cell.toLowerCase().includes(kw))) continue;

      results.push({ sheet: sheet.getName(), row: r + 1, cells: row });
      if (results.length >= SEARCH_RESULT_LIMIT) {
        return { ok: true, results, truncated: true, updatedAt: new Date().toISOString() };
      }
    }
  }
  return { ok: true, results, truncated: false, updatedAt: new Date().toISOString() };
}

/** ดึงค่าดิบทั้งชีต แบบมี cache แยกจาก dashboard cache */
function getRawValues_(sheet) {
  const cache = CacheService.getScriptCache();
  const key = `raw:${sheet.getName()}`;
  const saved = cache.get(key);
  if (saved) return JSON.parse(saved);
  const values = sheet.getDataRange().getDisplayValues();
  cache.put(key, JSON.stringify(values), CACHE_SECONDS);
  return values;
}

/** เปิดไฟล์ Sheet ตาม SPREADSHEET_ID ที่กำหนดไว้ด้านบน (ใช้แทน getActive() เพราะเป็นโปรเจกต์แยกต่างหาก) */
function getSpreadsheet_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function countRecords_(sheet) {
  const lastRow = sheet.getLastRow(); if (lastRow < 2) return 0;
  return sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getDisplayValues()
    .filter(row => row.some(cell => cell.trim())).length;
}
