const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Kunci kamu sudah dimasukkan
const GEMINI_KEY = "AQ.Ab8RN6J75NpXI65O0unXVSrUKIDBz8z0jfYPWXp1CfEIafXB2w";
const SUPABASE_URL = "https://safwstugkkfpnfbabakw.supabase.co";
const SUPABASE_KEY = "sb_publishable_3MQCz-f8AvoiBOtCfRY0PQ_ASRpiVav";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.set('trust proxy', 1);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

app.get('/', (req, res) => req.cookies.user_id ? res.redirect('/chat') : res.sendFile(path.join(__dirname, 'public/index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public/register.html')));
app.get('/chat', async (req, res) => {
  if(!req.cookies.user_id) return res.redirect('/login');
  try {
    const { data } = await supabase.from('users').select('id').eq('id', req.cookies.user_id).single();
    data ? res.sendFile(path.join(__dirname, 'public/chat.html')) : res.clearCookie('user_id').redirect('/login');
  } catch {
    res.clearCookie('user_id').redirect('/login');
  }
});

app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if(!username||!email||!password) return res.send('<script>alert("Isi semua kolom!");history.back();</script>');
  try {
    const hash = await bcrypt.hash(password,10);
    const { error } = await supabase.from('users').insert([{username,email,password:hash}]);
    if(error) return res.send('<script>alert("Sudah dipakai!");history.back();</script>');
    res.redirect('/login');
  } catch {
    res.send('<script>alert("Kesalahan pendaftaran!");history.back();</script>');
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const { data:user, error } = await supabase.from('users').select('*').eq('username',username).single();
    if(error||!user||!await bcrypt.compare(password, user.password)) return res.send('<script>alert("Salah nama atau sandi!");history.back();</script>');
    res.cookie('user_id', user.id, { maxAge: 86400000, secure: true, httpOnly: true, sameSite:'lax' });
    res.redirect('/chat');
  } catch {
    res.send('<script>alert("Kesalahan masuk!");history.back();</script>');
  }
});

// Panggil Gemini
app.post('/api/chat', async (req, res) => {
  if(!req.cookies.user_id) return res.json({jawaban: "Masuk dulu!"});
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        contents: [{ parts: [{ text: req.body.message }] }],
        generationConfig: { temperature: 0.7 }
      })
    });
    const hasil = await r.json();
    if(hasil.error) throw new Error(hasil.error.message);
    let teks = hasil.candidates[0].content.parts[0].text;
    teks = teks.replace(/\*\*/g,'').replace(/###/g,'');
    res.json({jawaban: teks});
  } catch (e) {
    res.json({jawaban: "Kesalahan: " + e.message});
  }
});

app.get('/logout', (req,res) => { res.clearCookie('user_id'); res.redirect('/'); });

app.listen(PORT, ()=>console.log("Siap di port", PORT));
module.exports = app;
