async function callOpenRouter(prompt){
  let apiKey = localStorage.getItem('kpaca_ai_api_key');
  if(!apiKey) { apiKey = CONFIG.default_api_key; localStorage.setItem('kpaca_ai_api_key', btoa(apiKey)); } else { apiKey = atob(apiKey); }
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST", headers: {"Authorization": "Bearer " + apiKey, "Content-Type": "application/json"},
    body: JSON.stringify({ model: document.getElementById('model-select')?.value || "google/gemini-2.0-flash-exp:free", messages: [{role: "user", content: prompt}] })
  });
  return res.json();
}
