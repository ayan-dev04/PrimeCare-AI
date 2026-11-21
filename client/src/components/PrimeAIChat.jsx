import React, { useState, useRef, useEffect } from 'react';
import API from '../api'; // Adjust relative path to point to your api.js file

/**
 * PrimeAIChat – Professional floating AI assistant widget for PrimeCare Hospital.
 */
export default function PrimeAIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // { role: 'user'|'assistant', text }
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-scroll to latest message
  const messagesEndRef = useRef(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const toggleChat = () => setOpen((prev) => !prev);

  /** Send a user message to the PrimeAI backend using Axios api.js */
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await API.post('/ai/chat', { query: text });
      const data = res.data;

      const reply = data.success
        ? data.reply
        : 'Sorry, I could not process that request.';
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    } catch (err) {
      console.error('[PrimeAI Chat Error]:', err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Unable to reach PrimeAI. Please try again.' },
      ]);
    }

    setLoading(false);
  };

  /** Allow Enter to send (Shift+Enter for newline) */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {/* ──────────── Chat Window ──────────── */}
      {open && (
        <div
          className="w-80 sm:w-96 h-[480px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          style={{
            animation: 'primeai-slide-up 0.3s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          {/* ── Header ── */}
          <div className="bg-indigo-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                <img
                  src="/logo.jpeg"
                  alt="PrimeCare"
                  className="w-6 h-6 object-contain"
                />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-wide">PrimeAI Assistant</h3>
                <p className="text-[11px] text-indigo-200 font-medium">
                  Powered by Google Gemini
                </p>
              </div>
            </div>
            <button
              onClick={toggleChat}
              className="w-8 h-8 rounded-lg hover:bg-white/15 flex items-center justify-center transition-colors duration-200"
              aria-label="Close PrimeAI"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ── Messages Area ── */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50/60">
            {messages.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 opacity-70">
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center">
                  <img src="/logo.jpeg" alt="" className="w-9 h-9 object-contain" />
                </div>
                <p className="text-sm text-slate-500 max-w-[220px] leading-relaxed">
                  Hi! I'm <span className="font-semibold text-indigo-700">PrimeAI</span>. Ask me about symptoms, doctors, departments, or hospital services.
                </p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center mr-2 mt-1 shrink-0">
                    <img src="/logo.jpeg" alt="" className="w-4 h-4 object-contain" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-2xl rounded-br-md shadow-md'
                    : 'bg-white text-slate-700 rounded-2xl rounded-bl-md shadow-sm border border-slate-100'
                    }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start items-end gap-2">
                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <img src="/logo.jpeg" alt="" className="w-4 h-4 object-contain" />
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Input Footer ── */}
          <div className="px-4 py-3 bg-white border-t border-slate-100 shrink-0">
            <div className="flex items-end gap-2 bg-slate-50 rounded-2xl border border-slate-200 px-3 py-2 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all duration-200">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask PrimeAI about symptoms, doctors, or departments..."
                className="flex-1 bg-transparent resize-none text-sm text-slate-700 placeholder-slate-400 focus:outline-none max-h-24 leading-relaxed"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shrink-0"
                aria-label="Send message"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────── Floating Trigger Button ──────────── */}
      <button
        onClick={toggleChat}
        className={`group w-16 h-16 rounded-2xl bg-white shadow-xl border border-slate-200 flex items-center justify-center transition-all duration-300 hover:shadow-2xl hover:scale-105 hover:border-indigo-300 ${open ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'
          }`}
        aria-label="Open PrimeAI chat"
      >
        <img
          src="/logo.jpeg"
          alt="PrimeCare AI"
          className="w-10 h-10 object-contain p-0.5 transition-transform duration-300 group-hover:scale-110"
        />
      </button>

      <style>{`
        @keyframes primeai-slide-up {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}