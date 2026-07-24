import { getUser } from './supabase.js';
export async function checkAuth(){
  if(CONFIG.maintenance_mode){ window.location = 'maintenance.html'; return; }
  const user = await getUser();
  if(!user &&!window.location.pathname.includes('login.html') &&!window.location.pathname.includes('register.html')){
    window.location = 'login.html';
  }
}
