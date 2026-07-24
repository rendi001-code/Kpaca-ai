// LOGIKA UTAMA KPACA AI
document.title = CONFIG.app_name;

// Cek maintenance
if(CONFIG.maintenance && !window.location.href.includes('maintenance.html')){
  window.location = 'maintenance.html';
}

// Toast Notifikasi
function toast(msg){ 
  const t = document.createElement('div');
  t.className = 'fixed bottom-4 right-4 glass p-3 rounded-lg neon';
  t.innerText = msg; document.body.appendChild(t);
  setTimeout(()=>t.remove(), 3000);
}

// Shortcut Ctrl+K
document.addEventListener('keydown', e => {
  if(e.ctrlKey && e.key === 'k'){ e.preventDefault(); document.getElementById('prompt')?.focus(); }
})

// Register PWA
if('serviceWorker' in navigator){ navigator.serviceWorker.register('/sw.js'); }
