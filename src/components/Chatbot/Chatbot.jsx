import { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { processMessage } from '../../utils/chatEngine';
import './Chatbot.css';

const QUICK_ACTIONS = [
  "What do I have today?",
  "Am I free at 3pm?",
  "Next class?",
  "Study plan",
  "Help",
];

export default function Chatbot() {
  const { state } = useAppContext();
  const { events, onboardingData } = state;

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: `Hey${onboardingData?.name ? `, ${onboardingData.name}` : ''}! 👋 I'm your calendar assistant. Ask me about your schedule, study tips, or anything else!`,
    }
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  function sendMessage(text) {
    const msgText = text || input.trim();
    if (!msgText) return;

    const userMsg = { id: Date.now(), type: 'user', text: msgText };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    // Simulate AI thinking time
    setTimeout(() => {
      const response = processMessage(msgText, events, onboardingData);
      const botMsg = { id: Date.now() + 1, type: 'bot', text: response };
      setMessages(prev => [...prev, botMsg]);
      setTyping(false);
    }, 600 + Math.random() * 800);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function renderMessageText(text) {
    // Simple markdown-like bold rendering
    return text.split('\n').map((line, i) => (
      <span key={i}>
        {line.split(/(\*\*.*?\*\*)/).map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j}>{part.slice(2, -2)}</strong>;
          }
          return part;
        })}
        {i < text.split('\n').length - 1 && <br />}
      </span>
    ));
  }

  return (
    <>
      <button
        className={`chatbot-fab ${open ? 'open' : ''}`}
        onClick={() => setOpen(!open)}
        title="Chat with AI Assistant"
      >
        {open ? '✕' : '🤖'}
      </button>

      {open && (
        <div className="chatbot-panel">
          <div className="chat-header">
            <div className="chat-header-icon">🤖</div>
            <div className="chat-header-info">
              <div className="chat-header-title">CalBot</div>
              <div className="chat-header-status">Your calendar assistant</div>
            </div>
          </div>

          <div className="chat-messages">
            {messages.map(msg => (
              <div key={msg.id} className={`chat-message ${msg.type}`}>
                {renderMessageText(msg.text)}
              </div>
            ))}
            {typing && (
              <div className="typing-indicator">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-quick-actions">
            {QUICK_ACTIONS.map(q => (
              <button key={q} className="quick-action" onClick={() => sendMessage(q)}>{q}</button>
            ))}
          </div>

          <div className="chat-input-container">
            <input
              ref={inputRef}
              className="chat-input"
              type="text"
              placeholder="Ask me anything..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              className="chat-send-btn"
              onClick={() => sendMessage()}
              disabled={!input.trim()}
            >↑</button>
          </div>
        </div>
      )}
    </>
  );
}
