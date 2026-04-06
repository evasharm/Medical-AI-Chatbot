const assistantPanel = document.getElementById('assistantPanel');
const openAssistantBtn = document.getElementById('openAssistantBtn');
const heroOpenBtn = document.getElementById('heroOpenBtn');
const heroDemoBtn = document.getElementById('heroDemoBtn');
const floatingAssistantBtn = document.getElementById('floatingAssistantBtn');
const closeAssistantBtn = document.getElementById('closeAssistantBtn');
const clearChatBtn = document.getElementById('clearChatBtn');
const chat = document.getElementById('chat');
const input = document.getElementById('input');
const sendBtn = document.getElementById('sendBtn');
const micBtn = document.getElementById('micBtn');
const speakToggle = document.getElementById('speakToggle');
const statusLine = document.getElementById('statusLine');
 
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let listening = false;
 
const state = {
  currentIntent: null,
  slots: {
    patient_name: null,
    date: null,
    time: null
  },
  conversation: []
};
 
function togglePanel(force) {
  const shouldOpen = typeof force === 'boolean' ? force : !assistantPanel.classList.contains('open');
  assistantPanel.classList.toggle('open', shouldOpen);
  assistantPanel.setAttribute('aria-hidden', String(!shouldOpen));
  if (shouldOpen) setTimeout(() => input.focus(), 150);
}
 
function timeStamp() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
 
function addMessage(role, text) {
  const wrapper = document.createElement('div');
  const bubble = document.createElement('div');
  bubble.className = `msg ${role}`;
  bubble.textContent = text;
 
  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = `${role === 'user' ? 'Caller' : 'Assistant'} · ${timeStamp()}`;
 
  wrapper.appendChild(bubble);
  wrapper.appendChild(meta);
  chat.appendChild(wrapper);
  chat.scrollTop = chat.scrollHeight;
 
  state.conversation.push({ role, text, at: new Date().toISOString() });
}
 
function setStatus(text) {
  statusLine.textContent = text;
}
 
function speak(text) {
  if (!speakToggle.checked || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 1;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}
 
function summarizeSlots() {
  const s = state.slots;
  return `Intent: ${state.currentIntent || '-'} | Name: ${s.patient_name || '-'} | Date: ${s.date || '-'} | Time: ${s.time || '-'}`;
}
 
async function interpret(message) {
  const response = await fetch('/api/interpret', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });
 
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || 'Request failed');
  return data;
}
 
async function handleMessage(message) {
  const text = String(message || '').trim();
  if (!text) return;
 
  addMessage('user', text);
  setStatus('Thinking...');
  input.value = '';
 
  try {
    const data = await interpret(text);
 
    // Local state from server session
    if (data.session) {
      state.currentIntent = data.session.intent;
      state.slots = { ...data.session.slots };
    }
 
    const reply = data.reply;
    addMessage('bot', reply);
    speak(reply);
    setStatus(`Mode: ${data.provider || 'unknown'} | ${summarizeSlots()}`);
 
    if (data.done) {
      // resetting server local state
      state.currentIntent = null;
      state.slots = { patient_name: null, date: null, time: null };
      setStatus('Appointment complete. Ready for next call.');
      console.log('FINAL RESULT:', reply);
    }
 
  } catch (err) {
    const reply = 'Sorry — I could not understand that. Please say the name, date, and time more clearly.';
    addMessage('bot', reply);
    speak(reply);
    setStatus(`Error: ${err.message}`);
  }
}
 
function clearChat() {
  chat.innerHTML = '';
  state.currentIntent = null;
  state.slots = { patient_name: null, date: null, time: null };
  state.conversation = [];
  setStatus('Ready.');
  addMessage('bot', 'Hello, this is the medical office assistant. I can help book or reschedule appointments.');
}
 
function initSpeech() {
  if (!SpeechRecognition) {
    micBtn.disabled = true;
    micBtn.title = 'Speech recognition not supported in this browser';
    micBtn.textContent = '×';
    return;
  }
 
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
 
  recognition.onstart = () => {
    listening = true;
    micBtn.textContent = '⏹';
    setStatus('Listening...');
  };
 
  recognition.onend = () => {
    listening = false;
    micBtn.textContent = '🎙';
    if (!statusLine.textContent.includes('Error:')) {
      setStatus('Ready.');
    }
  };
 
  recognition.onerror = (event) => {
    listening = false;
    micBtn.textContent = '🎙';
    setStatus(`Speech error: ${event.error}`);
  };
 
  recognition.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript || '';
    if (transcript) handleMessage(transcript);
  };
}
 
micBtn.addEventListener('click', () => {
  if (!recognition) return;
  if (listening) {
    recognition.stop();
    return;
  }
  recognition.start();
});
 
sendBtn.addEventListener('click', () => handleMessage(input.value));
input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    handleMessage(input.value);
  }
});
 
clearChatBtn.addEventListener('click', clearChat);
openAssistantBtn.addEventListener('click', () => togglePanel(true));
heroOpenBtn.addEventListener('click', () => togglePanel(true));
heroDemoBtn.addEventListener('click', () => {
  togglePanel(true);
  input.value = 'I want to book an appointment for Maria Gomez next Monday at 3 pm';
  input.focus();
});
floatingAssistantBtn.addEventListener('click', () => togglePanel(true));
closeAssistantBtn.addEventListener('click', () => togglePanel(false));
 
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') togglePanel(false);
});
 
document.addEventListener('click', (event) => {
  if (!assistantPanel.classList.contains('open')) return;
  const clickedInside =
    assistantPanel.contains(event.target) ||
    openAssistantBtn.contains(event.target) ||
    floatingAssistantBtn.contains(event.target) ||
    heroOpenBtn.contains(event.target) ||
    heroDemoBtn.contains(event.target);
});
 
initSpeech();
clearChat();
setStatus('Ready. Use speech or text.');