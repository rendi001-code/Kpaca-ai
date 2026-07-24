async function callOpenRouter(prompt){
  let apiKey = localStorage.getItem('kpaca_ai_api_key');
  if(!apiKey) { apiKey = CONFIG.default_api_key; localStorage.setItem('kpaca_ai_api_key', btoa(apiKey)); } else { apiKey = atob(apiKey); }
  const model = document.getElementById('model-select')?.value || "google/gemini-2.0-flash-exp:free";
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST", headers: {"Authorization": "Bearer " + apiKey, "Content-Type": "application/json"},
    body: JSON.stringify({ model: model, messages: [{role: "user", content: prompt}] })
  });
  return res.json();
}
async function generateImage(prompt){ const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${Math.floor(Math.random()*10000)}`; return url; }
function addMessage(role, content, msgId = Date.now()){
  const area = document.querySelector('#chat-area.max-w-3xl');
  document.getElementById('welcome')?.remove();
  const bubble = document.createElement('div');
  bubble.className = `flex ${role==='user'?'justify-end':'justify-start'} mb-4 message-bubble`;
  bubble.id = `msg-${msgId}`;
  bubble.innerHTML = `<div class="${role==='user'?'bg-[var(--neon)] text-[var(--neon-text)]':'glass'} p-3 rounded-2xl max-w-[80%] select-text">${content.replace(/\n/g,'<br>')}</div>`;
  area.appendChild(bubble); area.scrollTop = area.scrollHeight;
  let pressTimer;
  bubble.addEventListener('touchstart', () => { pressTimer = setTimeout(() => showMessageMenu(msgId, content, role), 500); });
  bubble.addEventListener('touchend', () => clearTimeout(pressTimer));
  bubble.addEventListener('contextmenu', (e) => { e.preventDefault(); showMessageMenu(msgId, content, role); });
}
function showMessageMenu(msgId, content, role){
  document.querySelectorAll('.message-actions').forEach(el => el.remove());
  const msgEl = document.getElementById(`msg-${msgId}`);
  const menu = document.createElement('div');
  menu.className = 'message-actions';
  let editBtn = role === 'user'? `<button onclick="editMsg('${msgId}')"><i data-lucide="edit-3" class="w-4 h-4"></i> Edit</button>` : '';
  menu.innerHTML = `<div class="flex gap-2 border-b border-[var(--border)] pb-1 mb-1"><button onclick="copyText('${msgId}')"><i data-lucide="copy" class="w-4 h-4"></i> Copy</button><button onclick="speakText('${msgId}')"><i data-lucide="volume-2" class="w-4 h-4"></i> Listen</button><button onclick="quoteText('${msgId}')"><i data-lucide="quote" class="w-4 h-4"></i> Quote</button></div>${editBtn}<button onclick="likeMsg('${msgId}')"><i data-lucide="thumbs-up" class="w-4 h-4"></i> Like</button><button onclick="dislikeMsg('${msgId}')"><i data-lucide="thumbs-down" class="w-4 h-4"></i> Dislike</button><button onclick="selectText('${msgId}')"><i data-lucide="mouse-pointer" class="w-4 h-4"></i> Select Text</button><button onclick="shareMsg('${content.replace(/'/g,"\\'")}')"><i data-lucide="share" class="w-4 h-4"></i> Share</button><button onclick="favoriteMsg('${msgId}')"><i data-lucide="bookmark" class="w-4 h-4"></i> Favorites</button><button onclick="deleteMsg('${msgId}')" class="text-red-400"><i data-lucide="trash" class="w-4 h-4"></i> Delete</button>`;
  msgEl.appendChild(menu); menu.style.display = 'block'; menu.style.top = '-10px'; menu.style.right = '10px'; lucide.createIcons();
  setTimeout(() => document.addEventListener('click', () => menu.remove(), {once:true}), 100);
}
window.copyText = (id) => { navigator.clipboard.writeText(document.getElementById(`msg-${id}`).innerText); alert('Disalin!'); }
window.speakText = (id) => { const text = document.getElementById(`msg-${id}`).innerText; speechSynthesis.speak(new SpeechSynthesisUtterance(text)); }
window.quoteText = (id) => { const text = document.getElementById(`msg-${id}`).innerText; document.getElementById('prompt').value = `> ${text}\n\n`; }
window.editMsg = async (id) => { const msgEl = document.getElementById(`msg-${id}`); const oldText = msgEl.innerText; const newText = prompt('Edit pesan kamu:', oldText); if(newText && newText!== oldText){ msgEl.querySelector('div').innerHTML = newText.replace(/\n/g,'<br>'); showLoading(); const res = await callOpenRouter(`User mengedit pesannya menjadi: ${newText}. Jawab ulang.`); const aiReply = res.choices[0].message.content; document.querySelector('#chat-area.max-w-3xl div:last-child').remove(); addMessage('assistant', aiReply, Date.now()); } }
window.likeMsg = (id) => { alert('👍 Liked') }
window.dislikeMsg = (id) => { alert('👎 Disliked') }
window.selectText = (id) => { const range = document.createRange(); range.selectNodeContents(document.getElementById(`msg-${id}`)); window.getSelection().removeAllRanges(); window.getSelection().addRange(range); }
window.shareMsg = (text) => { navigator.share? navigator.share({text}) : alert('Share: ' + text) }
window.favoriteMsg = (id) => { localStorage.setItem(`fav-${id}`, '1'); alert('Ditambah ke Favorites') }
window.deleteMsg = (id) => { if(confirm('Hapus pesan ini?')) document.getElementById(`msg-${id}`).remove(); }
function showLoading(){ addMessage('assistant', '<i>KPACA AI sedang mengetik...</i>', 'loading') }
