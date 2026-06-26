const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Pengaturan
const API_KEY = process.env.API_KEY || "";
const SUPABASE_URL = process.env.SUPABASE_URL || "https://safwstugkkfpnfbabakw.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "sb_publishable_3MQCz-f8AvoiBOtCfRY0PQ_ASRpiVav";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const API_URL = "https://api.openai.com/v1/chat/completions";
const AI_MODEL = "gpt-3.5-turbo";

app.set('trust proxy', 1);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

// Halaman
app.get('/', (req, res) => {
  if(req.cookies.user_id) return res.redirect('/chat');
  res.sendFile(path.join(__dirname, 'public/index.html'));
});
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public/register.html')));
app.get('/chat', async (req, res) => {
  if(!req.cookies.user_id) return res.redirect('/login');
  // Cek apakah pengguna benar ada
  const { data } = await supabase.from('users').select('id').eq('id', req.cookies.user_id).single();
  if(!data) { res.clearCookie('user_id'); return res.redirect('/login'); }
  res.sendFile(path.join(__dirname, 'public/chat.html'));
});

// Daftar
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if(!username||!email||!password) return res.send('<script>alert("Isi semua!");history.back();</script>');
  const hash = await bcrypt.hash(password,10);
  const { error } = await supabase.from('users').insert([{username,email,password:hash}]);
  if(error) return res.send('<script>alert("Sudah dipakai!");history.back();</script>');
  res.redirect('/login');
});

// Masuk pakai KUKI, bukan sesi
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const { data:user, error } = await supabase.from('users').select('*').eq('username',username).single();
  if(error||!user||!await bcrypt.compare(password, user.password)) {
    return res.send('<script>alert("Salah!");history.back();</script>');
  }
  // Simpan ID di kukinya
  res.cookie('user_id', user.id, { maxAge: 86400000, secure: true, httpOnly: true, sameSite:'lax' });
  res.redirect('/chat');
});

// Obrolan
app.post('/api/chat', async (req, res) => {
  if(!req.cookies.user_id) return res.json({jawaban:"Masuk dulu!"});
  if(!API_KEY) return res.json({jawaban:"Kunci kosong!"});
  try {
    const r = await fetch(API_URL, {
      method:"POST",
      headers:{"Authorization":`Bearer ${API_KEY}`,"Content-Type":"application/json"},
      body:JSON.stringify({model:AI_MODEL,messages:[{role:"user",content:req.body.message}]})
    });
    const d = await r.json();
    res.json({jawaban:d.choices?.[0]?.message?.content||"Kosong"});
  } catch(e) { res.json({jawaban:"Salah: "+e.message}); }
});

// Keluar
app.get('/logout', (req,res) => { res.clearCookie('user_id'); res.redirect('/'); });

app.listen(PORT, ()=>console.log("Siap"));
module.exports = app;
