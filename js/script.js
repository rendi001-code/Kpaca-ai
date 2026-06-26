const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

function addMessage(text, isUser, isLoading=false) {
  const div = document.createElement('div');
  if(isLoading){
    div.className='message proses';
    div.innerHTML='<span>Sedang berpikir</span><span class="typing"><span></span><span></span><span></span></span>';
  } else {
    div.className=`message ${isUser?'user':'ai'}`;
    div.textContent=text;
  }
  chatBox.appendChild(div);
  chatBox.scrollTop=chatBox.scrollHeight;
  return div;
}

async function sendMessage(){
  const teks=userInput.value.trim();
  if(!teks) return;
  addMessage(teks,true);
  userInput.value='';
  const muatan=addMessage('',false,true);
  try{
    const res=await fetch('/api/chat',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({message:teks})
    });
    const hasil=await res.json();
    chatBox.removeChild(muatan);
    addMessage(hasil.jawaban||"Maaf, belum bisa menjawab.",false);
  }catch(e){
    chatBox.removeChild(muatan);
    addMessage("⚠️ Gangguan sambungan.",false);
  }
}

sendBtn.addEventListener('click',sendMessage);
userInput.addEventListener('keypress',e=>e.key==='Enter'&&sendMessage());
