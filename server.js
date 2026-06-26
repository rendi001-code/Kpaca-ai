const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ⚠️ Ambil rahasia dari pengaturan Vercel, jangan tulis di sini!
const API_KEY = process.env.API_KEY || "";
const SESSION_SECRET = process.env.SESSION_SECRET || "ubah-menjadi-kalimat-acak-panjang";
const API_URL = "https://api.openai.com/v1/chat/completions";
const AI_MODEL = "gpt-3.5-turbo";

// Simpan pengguna di ingatan (di Vercel akan kosong ulang tiap mulai ulang)
let users = [];

// Pengaturan
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 86400000, secure: process.env.VERCEL === '1' }
}));

// Halaman
app.get('/', (req, res) => req.session.user ? res.sendFile(path.join(__dirname, 'public/chat.html')) : res.sendFile(path.join(__dirname, 'public/index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public/register.html')));
app.get('/chat', (req, res) => req.session.user ? res.sendFile(path.join(__dirname, 'public/chat.html')) : res.redirect('/login'));

// Daftar
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (users.find(u => u.username === username || u.email === email)) {
    return res.send('<script>alert("Sudah ada yang pakai nama/email ini!");history.back();</script>');
  }
  const hashPass = await bcrypt.hash(password, 10);
  users.push({ username, email, password: hashPass });
  res.redirect('/login');
});

// Masuk
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.send('<script>alert("Nama atau sandi salah!");history.back();</script>');
  }
  req.session.user = { username: user.username };
  res.redirect('/chat');
});

// Jalur obrolan AI
app.post('/api/chat', async (req, res) => {
  if (!req.session.user) return res.json({ jawaban: "Anda harus masuk dulu." });
  if (!API_KEY) return res.json({ jawaban: "Kunci API belum diatur di pengaturan." });

  try {
    const r = await fetch(API_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: AI_MODEL, messages: [{ role: "user", content: req.body.message }] })
    });
    const d = await r.json();
    res.json({ jawaban: d.choices?.[0]?.message?.content || "Tidak ada jawaban." });
  } catch (e) {
    res.json({ jawaban: "Salah sambung: " + e.message });
  }
});

// Keluar
app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

// Mulai
app.listen(PORT, () => console.log(`✅ KPACA AI siap!`));
module.exports = app; // untuk Vercel
