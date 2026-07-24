import { getUser } from './supabase.js';
export async function checkAuth(){
  if(CONFIG.maintenance_mode){ window.location = 'maintenance.html'; return; }
  const user = await getUser();
  if(!user &&!window.location.pathname.includes('login') &&!window.location.pathname.includes('register') &&!window.location.pathname.includes('maintenance')){
    window.location = 'login.html';
  }
  return user;
}
