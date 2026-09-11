// วาง Web app URL ที่ deploy จาก Apps Script ไว้ตรงนี้
// ตัวอย่าง: https://script.google.com/macros/s/AKfycb.../exec
const API_URL = 'https://script.google.com/macros/s/AKfycbwJwIBv9d-X0n5ua8Gkzz8S7AmxYlu2Y1lwFEF1Fb7gAZoNQ0_cK6TJtLYHowY_IwnX/exec';

// รหัสเข้าถึง ต้องตรงกับค่าที่ตั้งไว้ใน Script Properties ชื่อ DASHBOARD_ACCESS_KEY
const ACCESS_KEY = 'a07pxG9js452JLCQAc3F';

// ต้องตรงกับค่าที่ตั้งไว้ตอน Deploy: Execute as: 'Me', Access: 'Anyone'
// (เปลี่ยนจาก 'Anyone within organization' เป็น 'Anyone' เพื่อให้ fetch()/JSONP ทำงานได้
//  โดยไม่ติดปัญหา CORS/login redirect — ใช้รหัสลับด้านบนแทนการเช็คอีเมล)
//
// สำคัญ: ทุกครั้งที่แก้ Code.gs แล้ว Deploy ใหม่ ให้ตรวจสอบว่าแก้ deployment
// รายการเดียวกับที่ URL นี้ชี้ไปเสมอ (เช็คได้ที่ Deploy > Manage deployments)
