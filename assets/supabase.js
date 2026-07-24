import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
export const supabase = createClient(CONFIG.supabase_url, CONFIG.supabase_key)
export async function signup(n,e,p){ let {data,error}=await supabase.auth.signUp({email:e,password:p,options:{data:{name:n}}}); if(error)throw error; await supabase.from('profiles').insert([{id:data.user.id,name:n,email:e}]); return data; }
export async function signin(e,p){ let {data,error}=await supabase.auth.signInWithPassword({email:e,password:p}); if(error)throw error; return data; }
export async function getUser(){ return (await supabase.auth.getUser()).data.user }
export async function logout(){ await supabase.auth.signOut() }
export async function checkAuth(){ const user = await getUser(); if(!user &&!window.location.pathname.includes('login.html') &&!window.location.pathname.includes('register.html')){ window.location = 'login.html'; } }
export async function createChat(u,t){ let {data}=await supabase.from('chats').insert([{user_id:u,title:t}]).select().single(); return data; }
export async function saveMessage(c,r,co){ await supabase.from('messages').insert([{chat_id:c,role:r,content:co}]) }
export async function getChats(u){ let {data}=await supabase.from('chats').select('*').eq('user_id',u).order('created_at',{ascending:false}); return data; }
export async function saveTheme(u,t){ await supabase.from('profiles').update({theme:t}).eq('id',u) }
export async function getTheme(u){ let {data}=await supabase.from('profiles').select('theme').eq('id',u).single(); return data?.theme||'dark'; }
