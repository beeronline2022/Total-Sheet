// วาง Web app URL ที่ deploy จาก Apps Script ของไฟล์ CS : TOSM 2026 ไว้ตรงนี้
// ตัวอย่าง: https://script.google.com/macros/s/AKfycb.../exec
const API_URL = 'https://script.google.com/macros/s/AKfycbx7mtGBeHUX_DNtOcf9NRRw0lFhjLEBSFi5H5tOQtGxoQ2iweAP6mdXP_-6INWuoeYs/exec';

// รหัสเข้าถึง ต้องตรงกับค่าที่ตั้งไว้ใน Script Properties ชื่อ DASHBOARD_ACCESS_KEY
// (ตั้งค่าคนละที่กับที่นี่ก็ได้ แต่ค่าต้องเหมือนกันเป๊ะ)
const ACCESS_KEY = 'วาง_รหัสลับของคุณตรงนี้';

// ต้องตรงกับค่าที่ตั้งไว้ตอน Deploy: Execute as: 'Me', Access: 'Anyone'
// (เปลี่ยนจาก 'Anyone within organization' เป็น 'Anyone' เพื่อให้ fetch() ทำงานได้
//  โดยไม่ติดปัญหา CORS/login redirect — ใช้รหัสลับด้านบนแทนการเช็คอีเมล)
