// src/components/VoiceAssistant/VoiceAssistant.jsx
// Full voice assistant: Web Speech API input + SpeechSynthesis output + Gemini backend
import { useState, useRef, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Mic, MicOff, Send, X, Bot, Square, Lock } from 'lucide-react';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const hasSpeechRecognition = !!SpeechRecognition;
const hasSpeechSynthesis = 'speechSynthesis' in window;

const SESSION_ID = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('sess_' + Math.random().toString(36).substring(2, 11));

const SUGGESTED_QUESTIONS = [
  "What task is assigned to me?",
  "Explain my task step by step",
  "When is my deadline?",
  "When is my next review meeting?",
  "What should I improve?",
];

export default function VoiceAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', text: "Hi! I'm your AI Intern Coordinator. Ask me anything about your tasks, deadlines, or feedback! You can also use the mic button to speak." },
  ]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('idle'); // idle | listening | processing | speaking
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Stop speaking when panel closes
  useEffect(() => {
    if (!isOpen && hasSpeechSynthesis) {
      synthRef.current.cancel();
      setStatus('idle');
    }
  }, [isOpen]);

  const speak = (text) => {
    if (!hasSpeechSynthesis) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    const voices = synthRef.current.getVoices();
    const preferred = voices.find(v => v.name.includes('Samantha') || v.name.includes('Google UK English Female') || v.name.includes('Microsoft Zira'));
    if (preferred) utterance.voice = preferred;
    utterance.onstart = () => setStatus('speaking');
    utterance.onend = () => setStatus('idle');
    utterance.onerror = () => setStatus('idle');
    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (hasSpeechSynthesis) synthRef.current.cancel();
    setStatus('idle');
  };

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    const userMsg = { role: 'user', text: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setStatus('processing');

    try {
      const { data } = await api.post('/assistant/chat', { question: text.trim(), sessionId: SESSION_ID });
      const aiText = data.data.text;
      const isMock = data.data.isMock;
      setMessages(prev => [...prev, { role: 'ai', text: aiText, isMock }]);
      speak(aiText);
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Sorry, I could not connect. Please try again.';
      setMessages(prev => [...prev, { role: 'ai', text: errMsg, isError: true }]);
      setStatus('idle');
      toast.error('AI assistant error. Check your connection.');
    }
  };

  const startListening = () => {
    if (!hasSpeechRecognition) {
      toast.error('Speech recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    stopSpeaking();
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-IN';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => { setIsListening(true); setStatus('listening'); };
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
      setStatus('processing');
      sendMessage(transcript);
    };
    recognition.onerror = (event) => {
      setIsListening(false);
      setStatus('idle');
      if (event.error !== 'aborted') {
        const msgs = {
          'no-speech': 'No speech detected. Please try again.',
          'not-allowed': 'Microphone access denied. Please allow microphone permissions.',
          'network': 'Network error during speech recognition.',
        };
        toast.error(msgs[event.error] || `Speech error: ${event.error}`);
      }
    };
    recognition.onend = () => { setIsListening(false); if (status === 'listening') setStatus('idle'); };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setStatus('idle');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const statusLabels = { idle: 'Ready', listening: 'Listening...', processing: 'Thinking...', speaking: 'Speaking...' };

  return (
    <>
      {/* Floating Action Button */}
      <div className="voice-fab">
        <button
          className={`voice-fab-btn ${status}`}
          onClick={() => setIsOpen(!isOpen)}
          title="AI Voice Assistant"
        >
          {isOpen ? <X size={24} color="white" /> : <Bot size={26} color="white" />}
        </button>
        {!isOpen && (
          <div style={{ position: 'absolute', bottom: '70px', right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', fontSize: 12, whiteSpace: 'nowrap', color: 'var(--text-secondary)', boxShadow: 'var(--shadow-md)' }}>
            AI Assistant
          </div>
        )}
      </div>

      {/* Voice Panel */}
      {isOpen && (
        <div className="voice-panel animate-slide-up">
          <div className="voice-panel-header">
            <div className="voice-status">
              <div className={`voice-dot ${status}`} />
              <span>{statusLabels[status]}</span>
              {status === 'speaking' && (
                <button onClick={stopSpeaking} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Square size={11} /> Stop
                </button>
              )}
            </div>
            <div className="voice-controls">
              {!hasSpeechRecognition && (
                <span style={{ fontSize: 10, color: 'var(--warning)', background: 'rgba(255,217,61,0.1)', padding: '2px 8px', borderRadius: 10 }}>
                  Text only
                </span>
              )}
              <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Suggested Questions */}
          {messages.length === 1 && (
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  style={{ background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 16, padding: '4px 10px', fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer', transition: 'var(--transition)' }}
                  onMouseEnter={e => e.target.style.borderColor = 'var(--primary)'}
                  onMouseLeave={e => e.target.style.borderColor = 'var(--border)'}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Messages */}
          <div className="voice-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`voice-msg ${msg.role}`} style={msg.isError ? { color: 'var(--accent)' } : {}}>
                {msg.isMock && (
                  <div style={{ fontSize: 10, color: 'var(--warning)', marginBottom: 4, fontWeight: 600 }}>
                    [MOCK — Configure GEMINI_API_KEY for real AI]
                  </div>
                )}
                {msg.text}
              </div>
            ))}
            {status === 'processing' && (
              <div className="voice-msg ai">
                <span style={{ display: 'inline-flex', gap: 3 }}>
                  {[0, 0.2, 0.4].map((d, i) => (
                    <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary-light)', display: 'inline-block', animation: `blink 1s ${d}s infinite` }} />
                  ))}
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Row */}
          <div className="voice-input-row">
            <input
              className="voice-text-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type or speak a question..."
              disabled={status === 'processing'}
            />
            <button
              className={`voice-mic-btn ${isListening ? 'listening' : 'idle'}`}
              onClick={isListening ? stopListening : startListening}
              title={isListening ? 'Stop listening' : 'Start voice input'}
              disabled={status === 'processing' || !hasSpeechRecognition}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            <button
              className="btn-primary btn-sm"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || status === 'processing'}
              style={{ padding: '8px 12px', display: 'flex', alignItems: 'center' }}
            >
              <Send size={15} />
            </button>
          </div>

          <div style={{ padding: '6px 16px 10px', fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <Lock size={10} /> Questions processed securely on our server · Text only stored (no audio)
          </div>
        </div>
      )}
    </>
  );
}
