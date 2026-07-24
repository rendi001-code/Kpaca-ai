async function callOpenRouter(prompt){
  const apiKey = CONFIG.default_api_key;
  const model = document.getElementById('model-select')?.value || "google/gemini-2.0-flash-exp:free";
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST", headers: {"Authorization": "Bearer " + apiKey, "Content-Type": "application/json"},
    body: JSON.stringify({ model: model, messages: [{role: "user", content: prompt}] })
  });
  return res.json();
}

async function generateImage(prompt){
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=` + Math.random();
}

function isImageRequest(text){
  const keywords = ['buatkan', 'gambar', 'foto', 'generate', 'buat', 'image', 'picture', 'robot', 'ai art', 'lukis'];
  return keywords.some(k => text.toLowerCase().includes(k));
}

function addMessage(role, content, msgId = Date.now()){
  const area = document.querySelector('#chat-area.max-w-3xl');
  document.getElementById('welcome')?.remove();
  const bubble = document.createElement('div');
  bubble.className = `flex ${role==='user'?'justify-end':'justify-start'} mb-4`;
  bubble.id = `msg-${msgId}`;
  bubble.innerHTML = `<div class="${role==='user'?'bg-[var(--neon)] text-[var(--neon-text)]':'glass'} p-3 rounded-2xl max-w-[80%]">${marked.parse(content)}</div>`;
  area.appendChild(bubble); area.scrollTop = area.scrollHeight;

  if(role === 'assistant' && content.includes('<img')){
    setTimeout(() => {
      const img = bubble.querySelector('img');
      if(img){
        const btn = document.createElement('button');
        btn.innerHTML = `<i data-lucide="download"></i> Download`;
        btn.className = "mt-2 text-sm px-3 py-1 rounded-lg glass hover:bg-white/10 flex items-center gap-2";
        btn.onclick = () => downloadImage(img.src, `kpaca-${Date.now()}.png`);
        bubble.querySelector('div').appendChild(btn);
        lucide.createIcons();
      }
    }, 100)
  }
}

async function downloadImage(url, filename){
  try{
    const res = await fetch(url);
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }catch(e){ alert("Gagal download. Coba tahan gambar > Simpan Gambar") }
}

function showLoading(){ addMessage('assistant', '<i>KPACA AI sedang berpikir...</i>', 'loading') }
