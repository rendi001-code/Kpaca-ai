// api/index.js - KPACA AI Serverless API for Vercel

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
    origin: ['*'],
    credentials: true
}));
app.use(express.json());

// Inisialisasi Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

const JWT_SECRET = process.env.JWT_SECRET || 'kpaca001';

// ===== MIDDLEWARE AUTH =====
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token.' });
        }
        req.user = user;
        next();
    });
};

// ===== FUNCTION GENERATE OTP =====
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// ===== ENDPOINT REGISTER =====
app.post('/api/register', async (req, res) => {
    try {
        const { email, password, full_name } = req.body;

        if (!email || !password || !full_name) {
            return res.status(400).json({ error: 'Semua field harus diisi' });
        }

        const { data: existingUser } = await supabase
            .from('users')
            .select('email')
            .eq('email', email)
            .single();

        if (existingUser) {
            return res.status(400).json({ error: 'Email sudah terdaftar' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        const { data: user, error } = await supabase
            .from('users')
            .insert([
                {
                    email,
                    password: hashedPassword,
                    full_name,
                    is_verified: false,
                    otp_code: otp,
                    otp_expires: expiresAt.toISOString()
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('Error register:', error);
            return res.status(500).json({ error: 'Gagal registrasi' });
        }

        try {
            await axios.post(
                'https://api.emailjs.com/api/v1.0/email/send',
                {
                    service_id: process.env.EMAILJS_SERVICE_ID,
                    template_id: process.env.EMAILJS_TEMPLATE_ID,
                    user_id: process.env.EMAILJS_PUBLIC_KEY,
                    template_params: {
                        to_email: email,
                        otp_code: otp,
                        subject: '🔐 Verifikasi Email KPACA AI',
                        message: `Kode OTP Anda: ${otp}\n\nKode ini berlaku 5 menit.`
                    }
                }
            );
            console.log('Email OTP terkirim ke:', email);
        } catch (emailError) {
            console.error('EmailJS error:', emailError.response?.data || emailError.message);
        }

        await supabase
            .from('chat_sessions')
            .insert([
                {
                    user_id: user.id,
                    title: 'Chat Baru',
                    is_active: true
                }
            ]);

        res.status(201).json({
            message: 'Registrasi berhasil. Cek email untuk OTP.',
            user: { id: user.id, email: user.email, full_name: user.full_name }
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ===== ENDPOINT SEND OTP =====
app.post('/api/send-otp', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email wajib diisi' });
        }

        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        const { error } = await supabase
            .from('users')
            .update({ 
                otp_code: otp,
                otp_expires: expiresAt.toISOString()
            })
            .eq('email', email);

        if (error) {
            console.error('Error saving OTP:', error);
            return res.status(500).json({ error: 'Gagal menyimpan OTP' });
        }

        try {
            await axios.post(
                'https://api.emailjs.com/api/v1.0/email/send',
                {
                    service_id: process.env.EMAILJS_SERVICE_ID,
                    template_id: process.env.EMAILJS_TEMPLATE_ID,
                    user_id: process.env.EMAILJS_PUBLIC_KEY,
                    template_params: {
                        to_email: email,
                        otp_code: otp,
                        subject: '🔐 Kode Verifikasi KPACA AI',
                        message: `Kode OTP Anda: ${otp}\n\nKode ini berlaku 5 menit.`
                    }
                }
            );
            console.log('OTP baru terkirim ke:', email);
        } catch (emailError) {
            console.error('EmailJS error:', emailError.response?.data || emailError.message);
        }

        res.json({ 
            message: 'OTP telah dikirim ke email Anda',
            otp_sent: true
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ===== ENDPOINT VERIFY OTP =====
app.post('/api/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ error: 'Email dan OTP wajib diisi' });
        }

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) {
            return res.status(400).json({ error: 'Email tidak ditemukan' });
        }

        if (user.otp_code !== otp) {
            return res.status(400).json({ error: 'Kode OTP salah' });
        }

        const now = new Date();
        const expires = new Date(user.otp_expires);
        if (now > expires) {
            return res.status(400).json({ error: 'OTP sudah kadaluarsa' });
        }

        const { error: updateError } = await supabase
            .from('users')
            .update({ 
                is_verified: true,
                otp_code: null,
                otp_expires: null
            })
            .eq('email', email);

        if (updateError) {
            console.error('Error updating user:', updateError);
            return res.status(500).json({ error: 'Gagal verifikasi' });
        }

        res.json({ message: '✅ Verifikasi berhasil! Silakan login.' });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ===== ENDPOINT LOGIN =====
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email dan password wajib diisi' });
        }

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) {
            return res.status(401).json({ error: 'Email atau password salah' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Email atau password salah' });
        }

        if (!user.is_verified) {
            const otp = generateOTP();
            const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
            
            await supabase
                .from('users')
                .update({ 
                    otp_code: otp,
                    otp_expires: expiresAt.toISOString()
                })
                .eq('email', email);

            try {
                await axios.post(
                    'https://api.emailjs.com/api/v1.0/email/send',
                    {
                        service_id: process.env.EMAILJS_SERVICE_ID,
                        template_id: process.env.EMAILJS_TEMPLATE_ID,
                        user_id: process.env.EMAILJS_PUBLIC_KEY,
                        template_params: {
                            to_email: email,
                            otp_code: otp,
                            subject: '🔐 Verifikasi Email KPACA AI',
                            message: `Kode OTP Anda: ${otp}\n\nKode ini berlaku 5 menit.`
                        }
                    }
                );
            } catch (emailError) {
                console.error('EmailJS error:', emailError.message);
            }

            return res.status(403).json({ 
                error: 'Email belum diverifikasi. Cek email untuk OTP.',
                needsVerification: true
            });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, full_name: user.full_name },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login berhasil',
            token,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name
            }
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ===== ENDPOINT CHAT =====
app.post('/api/chat', authenticateToken, async (req, res) => {
    try {
        const { session_id, message, mode = 'default' } = req.body;

        if (!session_id || !message) {
            return res.status(400).json({ error: 'Session ID dan pesan wajib diisi' });
        }

        const systemPrompts = {
            default: 'Kamu adalah asisten AI yang helpful, ramah, dan informatif. Berikan jawaban yang jelas dan bermanfaat.',
            programmer: 'Kamu adalah senior programmer dengan pengalaman 10+ tahun. Berikan kode yang clean, efisien, dan sertakan penjelasan detail. Gunakan best practices dan design patterns yang tepat.',
            guru: 'Kamu adalah guru yang sabar dan ramah. Jelaskan semua konsep dengan cara yang sederhana, gunakan analogi yang mudah dipahami anak-anak. Berikan contoh konkret dalam kehidupan sehari-hari.',
            kreatif: 'Kamu adalah copywriter kreatif dan ahli storytelling. Buat konten yang engaging, persuasif, dan penuh imajinasi. Gunakan gaya bahasa yang hidup dan menarik.'
        };

        const systemPrompt = systemPrompts[mode] || systemPrompts.default;

        const { data: history } = await supabase
            .from('chats')
            .select('role, content')
            .eq('session_id', session_id)
            .order('created_at', { ascending: false })
            .limit(10);

        const messages = [
            { role: 'system', content: systemPrompt }
        ];

        if (history) {
            history.reverse().forEach(msg => {
                messages.push({ role: msg.role, content: msg.content });
            });
        }

        messages.push({ role: 'user', content: message });

        await supabase
            .from('chats')
            .insert([{ session_id, role: 'user', content: message }]);

        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: 'mistralai/mistral-7b-instruct:free',
                messages: messages,
                temperature: 0.7,
                max_tokens: 1000
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'HTTP-Referer': 'https://kpaca-aii-5e92.vercel.app',
                    'X-Title': 'KPACA AI',
                    'Content-Type': 'application/json'
                }
            }
        );

        const aiResponse = response.data.choices[0].message.content;

        await supabase
            .from('chats')
            .insert([{ session_id, role: 'assistant', content: aiResponse }]);

        res.json({ response: aiResponse, session_id });

    } catch (error) {
        console.error('Chat error:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Gagal memproses chat',
            details: error.response?.data || error.message
        });
    }
});

// ===== ENDPOINT GENERATE IMAGE =====
app.post('/api/generate', authenticateToken, async (req, res) => {
    try {
        const { prompt, session_id } = req.body;

        if (!prompt || !session_id) {
            return res.status(400).json({ error: 'Prompt dan session ID wajib diisi' });
        }

        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: 'stability-ai/sdxl:free',
                messages: [
                    {
                        role: 'user',
                        content: `Generate an image based on this prompt: ${prompt}. Return ONLY the image URL in the response.`
                    }
                ],
                temperature: 0.8
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'HTTP-Referer': 'https://kpaca-aii-5e92.vercel.app',
                    'X-Title': 'KPACA AI',
                    'Content-Type': 'application/json'
                },
                timeout: 60000
            }
        );

        let imageUrl = null;
        try {
            const content = response.data.choices[0].message.content;
            const urlMatch = content.match(/https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp)/i);
            if (urlMatch) {
                imageUrl = urlMatch[0];
            } else {
                imageUrl = content.trim();
            }
        } catch (parseError) {
            console.error('Error parsing image URL:', parseError);
            throw new Error('Gagal memproses URL gambar');
        }

        if (!imageUrl) {
            throw new Error('Tidak ada URL gambar yang dihasilkan');
        }

        await supabase
            .from('chats')
            .insert([{ session_id, role: 'assistant_image', content: imageUrl }]);

        res.json({ image_url: imageUrl, session_id });

    } catch (error) {
        console.error('Generate image error:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Gagal generate gambar',
            details: error.response?.data || error.message
        });
    }
});

// ===== ENDPOINT GET CHAT HISTORY =====
app.get('/api/chats/:session_id', authenticateToken, async (req, res) => {
    try {
        const { session_id } = req.params;

        const { data: chats, error } = await supabase
            .from('chats')
            .select('*')
            .eq('session_id', session_id)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching chats:', error);
            return res.status(500).json({ error: 'Gagal mengambil riwayat chat' });
        }

        res.json({ chats });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ===== ENDPOINT GET SESSIONS =====
app.get('/api/sessions', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const { data: sessions, error } = await supabase
            .from('chat_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching sessions:', error);
            return res.status(500).json({ error: 'Gagal mengambil sesi chat' });
        }

        res.json({ sessions });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ===== ENDPOINT CREATE NEW SESSION =====
app.post('/api/sessions', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { title = 'Chat Baru' } = req.body;

        await supabase
            .from('chat_sessions')
            .update({ is_active: false })
            .eq('user_id', userId)
            .eq('is_active', true);

        const { data: session, error } = await supabase
            .from('chat_sessions')
            .insert([{ user_id: userId, title, is_active: true }])
            .select()
            .single();

        if (error) {
            console.error('Error creating session:', error);
            return res.status(500).json({ error: 'Gagal membuat sesi baru' });
        }

        res.json({ message: 'Sesi baru berhasil dibuat', session });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ===== ENDPOINT GET USER PROFILE =====
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, full_name, is_verified, created_at')
            .eq('id', userId)
            .single();

        if (error || !user) {
            return res.status(404).json({ error: 'User tidak ditemukan' });
        }

        res.json({ user });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ===== ENDPOINT UPDATE PROFILE =====
app.put('/api/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { full_name } = req.body;

        if (!full_name) {
            return res.status(400).json({ error: 'Nama lengkap wajib diisi' });
        }

        const { data: user, error } = await supabase
            .from('users')
            .update({ full_name })
            .eq('id', userId)
            .select('id, email, full_name, is_verified, created_at')
            .single();

        if (error) {
            console.error('Error updating profile:', error);
            return res.status(500).json({ error: 'Gagal update profile' });
        }

        res.json({ user });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ===== ENDPOINT CHANGE PASSWORD =====
app.put('/api/change-password', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { current_password, new_password } = req.body;

        if (!current_password || !new_password) {
            return res.status(400).json({ error: 'Password saat ini dan baru wajib diisi' });
        }

        if (new_password.length < 6) {
            return res.status(400).json({ error: 'Password minimal 6 karakter' });
        }

        const { data: user, error } = await supabase
            .from('users')
            .select('password')
            .eq('id', userId)
            .single();

        if (error || !user) {
            return res.status(404).json({ error: 'User tidak ditemukan' });
        }

        const validPassword = await bcrypt.compare(current_password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Password saat ini salah' });
        }

        const hashedPassword = await bcrypt.hash(new_password, 10);

        const { error: updateError } = await supabase
            .from('users')
            .update({ password: hashedPassword })
            .eq('id', userId);

        if (updateError) {
            console.error('Error updating password:', updateError);
            return res.status(500).json({ error: 'Gagal update password' });
        }

        res.json({ message: 'Password berhasil diubah' });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ===== EXPORT for Vercel =====
module.exports = app;
