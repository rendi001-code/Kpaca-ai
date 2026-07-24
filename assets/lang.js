const LANG = {
  id: { new_chat: "Chat Baru", send: "Kirim" },
  en: { new_chat: "New Chat", send: "Send" },
  ms: { new_chat: "Sembang Baru", send: "Hantar" },
  ar: { new_chat: "دردشة جديدة", send: "إرسال" }
}
function setLanguage(lang){ localStorage.setItem('kpaca_ai_lang', lang); document.querySelectorAll('[data-lang]').forEach(el => el.innerText = LANG[lang][el.dataset.lang]); }
