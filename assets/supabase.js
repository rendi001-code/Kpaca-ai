import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
export const supabase = createClient(CONFIG.supabase_url, CONFIG.supabase_key)
supabase.auth.onAuthStateChange(async (event, session) => {
  if(event === 'SIGNED_IN' && session?.user){
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if(!data){ await supabase.from('profiles').insert([{id: session.user.id, email: session.user.email, name: session.user_metadata.full_name || session.user.email, lang: CONFIG.default_lang}]) }
    if(window.location.pathname.includes('login')) window.location = 'index.html';
  }
})
export async function signup(n,e,p){ let {data,error}=await supabase.auth.signUp({email:e,password:p}); if(error)throw error; await supabase.from('profiles').insert([{id:data.user.id,name:n,email:e,lang:'id'}]); return data; }
export async function signin(e,p){ let {data,error}=await supabase.auth.signInWithPassword({email:e,password:p}); if(error)throw error; return data; }
export async function getUser(){ return (await supabase.auth.getUser()).data.user }
export async function logout(){ await supabase.auth.signOut() }
export async function createChat(u,t){ let {data}=await supabase.from('chats').insert([{user_id:u,title:t}]).select().single(); return data; }
export async function saveMessage(c,r,co){ await supabase.from('messages').insert([{chat_id:c,role:r,content:co}]) }
export async function getChats(u){ let {data}=await supabase.from('chats').select('*').eq('user_id',u).order('created_at',{ascending:false}); return data; }
export async function getMessages(c){ let {data}=await supabase.from('messages').select('*').eq('chat_id',c).order('created_at'); return data; }
export async function uploadImage(f,u){ const n=`${u}/${Date.now()}.${f.name.split('.').pop()}`; await supabase.storage.from('kpaca-uploads').upload(n,f); return supabase.storage.from('kpaca-uploads').getPublicUrl(n).data.publicUrl; }
export async function saveTheme(u,t){ await supabase.from('profiles').update({theme:t}).eq('id',u) }
export async function getTheme(u){ let {data}=await supabase.from('profiles').select('theme').eq('id',u).single(); return data?.theme||'dark'; }
export async function saveLang(u,l){ await supabase.from('profiles').update({lang:l}).eq('id',u) }
export async function getLang(u){ let {data}=await supabase.from('profiles').select('lang').eq('id',u).single(); return data?.lang||'id'; }
