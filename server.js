    const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Ambil dari pengaturan Vercel
const API_KEY = process.env.API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

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
  const { data } = await supabase.from('users').select('id').eq('id', req.cookies.user_id).single();
  data ? res.sendFile(path.join(__dirname, 'public/chat.html')) : res.clearCookie('user_id').redirect('/login');
});

app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if(!username||!email||!password) return res.send('<script>alert("Isi semua kolom!");history.back();</script>');
  const hash = await bcrypt.hash(password,10);
  const { error } = await supabase.from('users').insert([{username,email,password:hash}]);
  if(error) return res.send('<script>alert("Sudah dipakai!");history.back();</script>');
  res.redirect('/login');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const { data:user, error } = await supabase.from('users').select('*').eq('username',username).single();
  if(error||!user||!await bcrypt.compare(password, user.password)) return res.send('<script>alert("Salah nama atau sandi!");history.back();</script>');
  res.cookie('user_id', user.id, { maxAge: 86400000, secure: true, httpOnly: true, sameSite:'lax' });
  res.redirect('/chat');
});

app.post('/api/chat', async (req, res) => {
  if(!req.cookies.user_id) return res.json({jawaban: "Masuk dulu!"});
  if(!API_KEY) return res.json({jawaban: "Kunci API belum diatur!"});

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method:"POST",
      headers:{
        "Authorization":`Bearer ${API_KEY}`,
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{role:"user", content: req.body.message}]
      })
    });
    const hasil = await r.json();
    if(hasil.error) throw new Error(hasil.error.message);
    res.json({jawaban: hasil.choices[0].message.content});
  } catch (e) {
    res.json({jawaban: "Kesalahan: " + e.message});
  }
});

app.get('/logout', (req,res) => { res.clearCookie('user_id'); res.redirect('/'); });

app.listen(PORT, ()=>console.log("Siap"));
module.exports = app;
