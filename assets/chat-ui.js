export function addMessage(role, content){
  const area = document.getElementById('chat-area');
  document.getElementById('welcome')?.remove();
  const bubble = document.createElement('div');
  bubble.className = `flex ${role==='user'?'justify-end':'justify-start'} mb-4`;
  bubble.innerHTML = `<div class="${role==='user'?'bg-[var(--neon)] text-[var(--neon-text)]':'glass'} p-3 rounded-2xl max-w-[80%]">${content.replace(/\n/g,'<br>')}</div>`;
  area.appendChild(bubble); area.scrollTop = area.scrollHeight;
}
export function showLoading(){ addMessage('assistant', '<i>KPACA AI sedang mengetik...</i>') }
