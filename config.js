// วาง Web app URL ที่ deploy จาก Apps Script ของไฟล์ CS : TOSM 2026 ไว้ตรงนี้
// ตัวอย่าง: https://script.google.com/macros/s/AKfycb.../exec
const API_URL = 'https://script.google.com/macros/s/AKfycbx7mtGBeHUX_DNtOcf9NRRw0lFhjLEBSFi5H5tOQtGxoQ2iweAP6mdXP_-6INWuoeYs/exec';

// ต้องตรงกับค่าที่ตั้งไว้ตอน Deploy: Execute as: 'Me', Access: 'Anyone within [องค์กร]'
// (หรือ 'Anyone with Google account' ถ้าบัญชีไม่ใช่ Google Workspace)
// ผู้ใช้ต้อง login ด้วยบัญชี Google ที่อยู่ใน DASHBOARD_ALLOWED_EMAILS ถึงจะเรียกข้อมูลได้