import React, { useState, useRef, useEffect } from 'react';
import { Send, BookOpen, Star, Sparkles, Cpu, GitBranch } from 'lucide-react';
import type { Message, Book } from './types';
import { sendMessage } from './services/chatApi';

// ─── Typewriter Effect ─────────────────────────────────────────────────────────
const DynamicText = ({ text, speed = 15 }: { text: string; speed?: number }) => {
  const [displayedText, setDisplayedText] = useState('');
  const indexRef = useRef(0);

  useEffect(() => {
    setDisplayedText('');
    indexRef.current = 0;

    const interval = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayedText(prev => prev + text.charAt(indexRef.current));
        indexRef.current += 1;
      } else {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return <span>{displayedText}</span>;
};

// ─── Book Card ─────────────────────────────────────────────────────────────────
const BookCard = ({ book }: { book: Book }) => {
  const hasReason = book.description.includes('*Why it matches:');
  const mainDesc = hasReason ? book.description.split('\n\n*Why it matches:')[0] : book.description;
  const reasonText = hasReason ? book.description.split('*Why it matches: ')[1]?.replace(/\*/g, '') : null;

  return (
    <div className="book-card">
      <div className="book-cover-container">
        <img src={book.coverImage} alt={book.title} className="book-cover" />
        {book.rating && (
          <div className="rating-tag">
            <Star size={13} className="rating-star" />
            {book.rating.toFixed(1)}
          </div>
        )}
      </div>
      <div className="book-info">
        <span className="book-category">{book.category}</span>
        <h4 className="book-title">{book.title}</h4>
        <p className="book-author">by {book.author}</p>
        <p className="book-desc">{mainDesc}</p>
        {reasonText && (
          <div className="book-reason">
            💡 {reasonText}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── App ───────────────────────────────────────────────────────────────────────
function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'bot',
      content: "Hiiya!! I am Bryaxis, the keeper of books. Name me your interests or mood, and I will handpick recommendations for yoohoo!",
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (text: string = inputValue) => {
    if (!text.trim()) return;

    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await sendMessage([...messages, newUserMessage]);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'bot',
          content: response.reply,
          recommendations: response.recommendations,
        },
      ]);
    } catch (error: any) {
      console.error('Book Nook API error:', error);

      let errorMsg = "Unable to connect to Bryaxis. Please make sure the backend is running.";
      if (error?.message?.includes('429')) {
        errorMsg = "Bryaxis is receiving too many requests! Please wait a moment and try again.";
      }

      setMessages(prev => [
        ...prev,
        { id: Date.now().toString(), role: 'bot', content: `⚠️ ${errorMsg}` },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedPrompts = [
    { label: "✨ Fantasy Adventure", text: "Recommend an epic fantasy book with magic" },
    { label: "🕵️ Thriller", text: "Give me a top-rated mystery thriller" },
    { label: "💖 Cozy Romance", text: "I want a cozy, witty romance book" },
    { label: "💡 Self-Help", text: "Recommend a high-impact self-help book" },
    { label: "🎲 Surprise Me", text: "Surprise me with a great book recommendation" },
  ];

  return (
    <div className="app-container">
      <div className="chat-container">

        {/* Retro header */}
        <div className="chat-header">
          <div className="header-left">
            <div className="header-icon">
              <BookOpen size={16} />
            </div>
            <div>
              <h1 className="chat-title">Bryaxis's home</h1>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              className="status-badge"
              style={{
                background: 'rgba(74, 222, 128, 0.15)',
                color: '#4ade80',
                border: '1px solid #4ade8040',
              }}
            >
              <Cpu size={11} /> Gemini via API
            </div>

            {/* LangGraph badge */}
            <div
              className="status-badge"
              style={{
                background: 'rgba(139, 92, 246, 0.15)',
                color: '#a78bfa',
                border: '1px solid rgba(139, 92, 246, 0.25)',
              }}
            >
              <GitBranch size={11} /> LangGraph
            </div>

            <div className="window-controls">
              <div className="win-btn">_</div>
              <div className="win-btn">□</div>
              <div className="win-btn">✕</div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="chat-messages">
          {messages.map(msg => (
            <div key={msg.id} className={`message-wrapper ${msg.role}`}>
              {msg.role === 'bot' && (
                <div className="message-avatar bot">
                  <BookOpen size={18} />
                </div>
              )}

              <div className={msg.role === 'bot' ? 'bot-container' : ''}>
                <div className={`message ${msg.role}`}>
                  {msg.role === 'bot' ? (
                    <DynamicText text={msg.content} speed={15} />
                  ) : (
                    msg.content
                  )}
                </div>

                {msg.recommendations && (
                  <div className="recommendations">
                    {msg.recommendations.map(book => (
                      <BookCard key={book.id} book={book} />
                    ))}
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="message-avatar user">
                  <Sparkles size={18} />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="message-wrapper bot">
              <div className="message-avatar bot">
                <BookOpen size={18} />
              </div>
              <div className="message bot">
                <div className="typing-indicator">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="chat-input-container">
          <div className="suggested-prompts">
            {suggestedPrompts.map(prompt => (
              <button
                key={prompt.label}
                className="prompt-chip"
                onClick={() => handleSend(prompt.text)}
              >
                {prompt.label}
              </button>
            ))}
          </div>

          <div className="input-form">
            <input
              type="text"
              className="chat-input"
              placeholder="Ask for a book by genre, mood, topic, or author..."
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isTyping}
            />
            <button
              className="send-button"
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isTyping}
              title="Send message"
            >
              <Send size={18} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
