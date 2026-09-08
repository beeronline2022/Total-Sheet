# เว็บค้นหาข้อมูลจาก Google Sheet (CS : TOSM 2026)

โครงสร้างโปรเจกต์:

```
sheet-search/
├── backend/
│   └── Code.gs        # Apps Script — Dashboard API เดิม + เพิ่ม action=search สำหรับค้นหาทุกแท็บ
└── frontend/
    ├── index.html      # หน้าเว็บหลัก
    ├── style.css       # ดีไซน์
    ├── script.js       # เรียก API และแสดงผลลัพธ์
    └── config.js       # ใส่ URL ของ API ที่ deploy แล้ว
```

## ภาพรวมสถาปัตยกรรม

GitHub Pages โฮสต์ได้เฉพาะไฟล์ static (HTML/CSS/JS) จึงรัน Google Apps Script บนนั้นไม่ได้โดยตรง
วิธีที่ใช้งานได้คือแยกสองส่วน:

1. **Backend** — Apps Script ผูกกับไฟล์ CS : TOSM 2026 deploy เป็น Web App จะได้ URL สำหรับเรียกแบบ API
2. **Frontend** — ไฟล์ static ใน `frontend/` วางบน GitHub Pages แล้วเรียก URL จากข้อ 1 ผ่าน `fetch()`

`Code.gs` เป็นโค้ด Dashboard เดิมที่มีอยู่แล้วในไฟล์ (มีระบบตรวจสิทธิ์ผู้ใช้ด้วยอีเมลและ cache อยู่ก่อนแล้ว) เพิ่มเติมด้วย action ใหม่สำหรับค้นหาแบบเต็มข้อความทุกแท็บ โดยใช้ auth/cache pattern เดียวกับของเดิมทั้งหมด

## ขั้นตอนที่ 1: ตั้งค่า Backend (Apps Script)

1. เปิดไฟล์ CS : TOSM 2026 → เมนู **Extensions > Apps Script**
2. วางโค้ดจาก `backend/Code.gs` แทนที่โค้ดเดิม (เป็นโค้ดเดิม + เพิ่มฟังก์ชันค้นหาเข้าไป ไม่เสียของเดิม)
3. ไปที่ **Project Settings** (ไอคอนรูปเฟือง) → **Script Properties** → เพิ่ม property ชื่อ `DASHBOARD_ALLOWED_EMAILS` ค่าเป็นอีเมลที่อนุญาต คั่นด้วย comma เช่น `you@company.com, teammate@company.com`
4. กด **Deploy > New deployment**
   - เลือกประเภท **Web app**
   - **Execute as: User accessing the web app** (สำคัญ — ต้องเลือกแบบนี้ ไม่ใช่ Me เพราะโค้ดต้องรู้ว่าใครเรียกจริง)
   - **Who has access: Anyone within [ชื่อองค์กร]** (อย่าเลือก Anyone เพราะจะทำให้ตรวจสอบอีเมลไม่ได้ผล)
5. กด Deploy แล้วคัดลอก **Web app URL** ที่ได้ (รูปแบบ `https://script.google.com/macros/s/xxxxx/exec`)

> ทดสอบก่อนได้โดยเปิด URL นั้นในเบราว์เซอร์ต่อท้ายด้วย `?action=sheets` ถ้าตั้งค่าถูกต้องควรเห็น JSON รายชื่อแท็บกลับมา ถ้าเจอ error เรื่องสิทธิ์ ให้กลับไปเช็ค Script Properties

## ขั้นตอนที่ 2: ตั้งค่า Frontend

1. เปิดไฟล์ `frontend/config.js`
2. แทนที่ค่า `API_URL` ด้วย Web app URL ที่ได้จากขั้นตอนที่ 1

```js
const API_URL = 'https://script.google.com/macros/s/xxxxx/exec';
```

ผู้ใช้ที่เข้าเว็บต้อง login ด้วยบัญชี Google ที่อยู่ใน `DASHBOARD_ALLOWED_EMAILS` ถึงจะดึงข้อมูลได้ ถ้ายังไม่ได้ login เบราว์เซอร์จะขึ้นหน้าให้ login ก่อน

## ขั้นตอนที่ 3: อัปโหลดขึ้น GitHub Pages

1. สร้าง repository ใหม่บน GitHub
2. อัปโหลดเฉพาะไฟล์ในโฟลเดอร์ `frontend/` ทั้งหมด (`index.html`, `style.css`, `script.js`, `config.js`) ไว้ที่ root ของ repo (หรือโฟลเดอร์ `/docs` ก็ได้)
3. ไปที่ repo → **Settings > Pages**
4. เลือก Source เป็น branch และโฟลเดอร์ที่วางไฟล์ไว้ → Save
5. รอสักครู่ GitHub จะให้ URL เว็บไซต์มา เช่น `https://username.github.io/sheet-search/`

โค้ดของ `Code.gs` ไม่ต้องอัปโหลดขึ้น GitHub เพราะรันอยู่ฝั่ง Apps Script อยู่แล้ว (เก็บไว้ใน repo เป็น reference ได้ แต่ไม่มีผลต่อการทำงาน)

## API ที่ใช้

| Action | ตัวอย่าง URL | คืนค่า |
|---|---|---|
| รายชื่อแท็บ | `?action=sheets` | `{ ok, sheets: [{name, rowCount}], updatedAt }` |
| ข้อมูลทั้งแท็บ (ตารางเดียว) | `?action=sheet&name=ชื่อแท็บ` | `{ ok, headers, rows, updatedAt }` |
| ค้นหาทุกเซลล์ ทุกแท็บ | `?action=search&q=คำค้นหา` | `{ ok, results: [{sheet, row, cells}], truncated, updatedAt }` |
| ค้นหาเฉพาะแท็บเดียว | `?action=search&q=คำค้นหา&sheet=ชื่อแท็บ` | เหมือนด้านบน แต่เจาะจงแท็บ |

ทุก action ต้องผ่าน `requireAuthorizedUser_()` ก่อนเสมอ ถ้าอีเมลไม่อยู่ใน allowlist จะได้ `{ ok: false, error: "..." }` กลับมา

## หมายเหตุ

- แท็บที่อยู่ใน `HIDDEN_SHEETS` (ในโค้ดคือ `'ชีต12'`) จะไม่ถูกดึงมาแสดงหรือค้นหาเลย เพิ่ม/แก้ชื่อแท็บที่ต้องการซ่อนได้ที่ตัวแปรนี้
- ผลการค้นหาจำกัดไว้ที่ 200 แถวต่อครั้ง แก้ได้ที่ `SEARCH_RESULT_LIMIT` ใน `Code.gs`
- มี cache 5 นาที (`CACHE_SECONDS`) ทั้งฝั่ง dashboard เดิมและฝั่งค้นหาใหม่ ถ้าแก้ข้อมูลในชีทแล้วเว็บยังไม่อัปเดต ให้รอ cache หมดอายุหรือปรับค่านี้ให้สั้นลง
- เนื่องจากมีระบบตรวจอีเมลอยู่แล้ว ไม่จำเป็นต้องเปิด Web app แบบ "Anyone" — ควรคงไว้ที่ "Anyone within organization" เสมอเพื่อความปลอดภัยของข้อมูลอ่อนไหวในไฟล์ (เบอร์โทร, ticket, ยอดเงิน)
