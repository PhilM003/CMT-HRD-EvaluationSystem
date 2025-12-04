require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3005; // ใช้ Port 3005 ตามที่ตกลงกัน
const FRONTEND_URL = 'http://localhost:5173'; 

const DB_FILE = path.join(__dirname, 'db.json');

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// --- Database Helper ---
const readDb = () => {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = { evaluations: [], employees: [], users: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  try {
    const data = fs.readFileSync(DB_FILE);
    const json = JSON.parse(data);
    if (!json.evaluations) json.evaluations = [];
    if (!json.employees) json.employees = [];
    if (!json.users || json.users.length === 0) {
        json.users = [
            { username: 'admin', password: '1234', name: 'Admin User', role: 'admin' },
            { username: 'assess', password: '1234', name: 'Head of Dept', role: 'assessor' },
            { username: 'hr', password: '1234', name: 'HR Manager', role: 'hr' },
            { username: 'ceo', password: '1234', name: 'CEO', role: 'approver' }
        ];
    }
    return json;
  } catch (err) {
    return { evaluations: [], employees: [], users: [] };
  }
};

const writeDb = (data) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

// --- Email Config ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // ตรวจสอบไฟล์ .env ว่าใส่ email ถูกต้อง
    pass: process.env.EMAIL_PASS  // ตรวจสอบไฟล์ .env ว่าใส่ App Password ถูกต้อง
  }
});

const sendEmail = async (to, subject, htmlContent) => {
  if (!to) return;
  try {
    await transporter.sendMail({
      from: '"Evaluation System" <no-reply@evalsystem.com>',
      to: to,
      subject: subject,
      html: htmlContent
    });
    console.log(`✅ Email sent to ${to}`);
  } catch (error) {
    console.error('❌ Email Error:', error);
  }
};

// Style ของปุ่มในอีเมล
const btnStyle = "background-color: #1e293b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-family: sans-serif; box-shadow: 0 4px 6px rgba(0,0,0,0.1);";

// --- Route: Send Email (สำหรับ Frontend เรียกใช้) ---
app.post('/send-email', async (req, res) => {
  const { to, subject, html, link } = req.body;
  
  // สร้าง HTML Email Template สวยงาม
  let emailBody = `
    <div style="background-color: #f3f4f6; padding: 40px 20px; font-family: 'Sarabun', sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
        <h2 style="color: #1e293b; margin-top: 0; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px;">
           Evaluation System Notification
        </h2>
        <div style="font-size: 16px; color: #334155; line-height: 1.6; margin-top: 20px;">
           ${html}
        </div>
  `;

  if (link) {
      emailBody += `
        <div style="text-align: center; margin-top: 30px; margin-bottom: 20px;">
           <a href="${link}" style="${btnStyle}">
              ✍️ คลิกเพื่อตรวจสอบและลงนาม
           </a>
        </div>
        <p style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 20px;">
           หากปุ่มกดไม่ได้ สามารถคลิกที่ลิงก์นี้: <br>
           <a href="${link}" style="color: #3b82f6;">${link}</a>
        </p>
      `;
  }

  emailBody += `</div></div>`;

  try {
      await sendEmail(to, subject, emailBody);
      res.json({ success: true, message: 'Email sent' });
  } catch (err) {
      res.status(500).json({ error: err.message });
  }
});

// ==========================================
// แก้ไข ROUTES: ลบ /api ออกเพื่อให้ตรงกับ Frontend
// ==========================================

// --- Evaluations ---
app.get('/evaluations', (req, res) => { // ลบ /api ออก
  const db = readDb();
  res.json(db.evaluations);
});

app.get('/evaluations/:id', (req, res) => { // ลบ /api ออก
    const db = readDb();
    const item = db.evaluations.find(e => e.id === req.params.id);
    if(item) res.json(item);
    else res.status(404).json({message: "Not found"});
});

app.post('/evaluations', (req, res) => { // ลบ /api ออก
  const db = readDb();
  const newItem = { id: Date.now().toString(), ...req.body };
  db.evaluations.push(newItem);
  writeDb(db);
  res.json(newItem);
});

app.put('/evaluations/:id', (req, res) => { // ลบ /api ออก
  const db = readDb();
  const index = db.evaluations.findIndex(e => e.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'Not found' });

  // อัปเดตข้อมูล
  const updatedItem = { ...db.evaluations[index], ...req.body };
  db.evaluations[index] = updatedItem;
  writeDb(db);
  
  // (Optional: ลบ Logic ส่งเมลอัตโนมัติตรงนี้ออก เพื่อให้ Frontend เป็นคนสั่งส่งผ่าน /send-email อย่างเดียว จะได้ไม่ซ้ำซ้อน)

  res.json(updatedItem);
});

app.delete('/evaluations/:id', (req, res) => { // ลบ /api ออก
    const db = readDb();
    const newEvals = db.evaluations.filter(e => e.id !== req.params.id);
    db.evaluations = newEvals;
    writeDb(db);
    res.json({success: true});
});

// --- Employees ---
app.get('/employees', (req, res) => res.json(readDb().employees)); // ลบ /api ออก
app.post('/employees', (req, res) => {
    const db = readDb();
    const newEmp = req.body;
    const idx = db.employees.findIndex(e => e.id === newEmp.id);
    if(idx !== -1) db.employees[idx] = newEmp;
    else db.employees.push(newEmp);
    writeDb(db);
    res.json({success: true});
});
app.put('/employees/:id', (req, res) => { 
    const db = readDb();
    const idx = db.employees.findIndex(e => e.id === req.params.id);
    if(idx !== -1) { db.employees[idx] = req.body; writeDb(db); }
    res.json({success: true});
});
app.delete('/employees/:id', (req, res) => {
    const db = readDb();
    db.employees = db.employees.filter(e => e.id !== req.params.id);
    writeDb(db);
    res.json({success: true});
});

// --- Users ---
app.get('/users', (req, res) => res.json(readDb().users)); // ลบ /api ออก

// Start Server
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT} (Custom Node Server)`));