// SIMPAN DATA KPACA AI
const DB = {
  save: (key, val) => localStorage.setItem('kpaca_ai_' + key, JSON.stringify(val)),
  load: (key) => JSON.parse(localStorage.getItem('kpaca_ai_' + key) || 'null'),
  autoSave: () => setInterval(() => { /* auto save draft chat */ }, 5000)
}
DB.autoSave();
