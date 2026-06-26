  const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Ambil nilai dari pengaturan Vercel
const API_KEY = process.env.API_KEY || "";
const SESSION_SECRET = process.env.SESSION_SECRET || "ubah-menjadi-kalimat-acak-panjang";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const API_URL = "https://api.openai.com/v1/chat/completions";
const AI_MODEL = "gpt-3.5-turbo";

// Pengaturan dasar
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 86400000, secure: process.env.VERCEL === '1' }
}));

// Halaman situs
app.get('/', (req, res) => req.session.user ? res.sendFile(path.join(__dirname, 'public/chat.html')) : res.sendFile(path.join(__dirname, 'public/index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public/register.html')));
app.get('/chat', (req, res) => req.session.user ? res.sendFile(path.join(__dirname, 'public/chat.html')) : res.redirect('/login'));

// Pendaftaran akun simpan ke Supabase
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  const hashPass = await bcrypt.hash(password, 10);

  const { error } = await supabase.from('users').insert([
    { username, email, password: hashPass }
  ]);

  if (error) {
    return res.send('<script>alert("Nama pengguna atau email sudah dipakai!");history.back();</script>');
  }
  res.redirect('/login');
});

// Pemeriksaan masuk
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const { data: user } = await supabase.from('users').select('*').eq('username', username).single();

  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.send('<script>alert("Nama pengguna atau sandi salah!");history.back();</script>');
  }
  req.session.user = { username: user.username };
  res.redirect('/chat');
});

// Sambungan ke AI
app.post('/api/chat', async (req, res) => {
  if (!req.session.user) return res.json({ jawaban: "Anda harus masuk dulu." });
  if (!API_KEY) return res.json({ jawaban: "Kunci API belum diatur." });

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

// Keluar akun
app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

// Mulai jalankan
app.listen(PORT, () => console.log(`✅ KPACA AI siap!`));
module.exports = app;
