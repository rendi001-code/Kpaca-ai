async function callOpenRouter(prompt){
  try{
    const apiKey = atob(localStorage.getItem('kpaca_ai_api_key') || '');
    if(!apiKey) { alert('API Key belum diset. Buka Owner Panel'); return; }
    const lang = localStorage.getItem('kpaca_ai_lang') || 'id';
    const system = `Kamu adalah KPACA AI. WAJIB jawab dalam bahasa: ${lang}`;
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {"Authorization": "Bearer " + apiKey, "Content-Type": "application/json", "HTTP-Referer": window.location.origin, "X-Title": "KPACA AI"},
      body: JSON.stringify({model: document.getElementById('model-select')?.value || CONFIG.default_models[0],
      messages: [{role: "system", content: system}, {role: "user", content: prompt}], stream: true})
    });
    if(!res.ok) throw new Error("API Error: " + res.status); return res.body;
  }catch(e){ console.error("Error AI:", e); alert("Gagal hubungi OpenRouter. Cek API Key") }
}
async function aiTeam(prompt, agents=["Asisten", "Programmer", "Penulis", "Analis"]){
  return Promise.all(agents.map(a => callOpenRouter(`${a}: ${prompt}`)))
}
