const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

function tambahPesan(teks, pengirim) {
  const el = document.createElement('div');
  el.className = `message ${pengirim}`;
  el.textContent = teks;
  chatBox.appendChild(el);
  chatBox.scrollTop = chatBox.scrollHeight;
}

async function kirimPesan() {
  const teks = userInput.value.trim();
  if (!teks) return;

  tambahPesan(teks, 'user');
  userInput.value = '';

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: teks })
    });
    const data = await res.json();
    tambahPesan(data.jawaban, 'ai');
  } catch (e) {
    tambahPesan('Gagal terhubung ke peladen', 'ai');
  }
}

sendBtn.addEventListener('click', kirimPesan);
userInput.addEventListener('keydown', e => e.key === 'Enter' && kirimPesan());
