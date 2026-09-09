// วาง Web app URL ที่ deploy จาก Apps Script ของไฟล์ CS : TOSM 2026 ไว้ตรงนี้
// ตัวอย่าง: https://script.google.com/macros/s/AKfycb.../exec
const API_URL = 'https://script.google.com/macros/s/AKfycbxePy-cUUFNfPBbF9alIlDhTsg-wlObjJt1iZ1J-3DImnWDn_9NX2ADWnbi2_CyZmTf/exec';
 
// รหัสเข้าถึง ต้องตรงกับค่าที่ตั้งไว้ใน Script Properties ชื่อ DASHBOARD_ACCESS_KEY
const ACCESS_KEY = 'a07pxG9js452JLCQAc3F';
 
// ต้องตรงกับค่าที่ตั้งไว้ตอน Deploy: Execute as: 'Me', Access: 'Anyone'
// (เปลี่ยนจาก 'Anyone within organization' เป็น 'Anyone' เพื่อให้ fetch() ทำงานได้
//  โดยไม่ติดปัญหา CORS/login redirect — ใช้รหัสลับด้านบนแทนการเช็คอีเมล)