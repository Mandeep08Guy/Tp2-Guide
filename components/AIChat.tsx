import React, { useState, useRef, useEffect } from 'react';
import { askAIQuestion } from '../services/geminiService';

interface Message {
  text: string;
  isUser: boolean;
}

const RichTextRenderer: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  return (
    <div className="space-y-4">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-2" />;
        
        if (trimmed.toLowerCase().includes('💡 pro tip')) {
          return (
            <div key={idx} className="bg-amber-50/80 border-2 border-amber-200 rounded-2xl p-4 my-6 shadow-sm">
              <div className="flex items-center gap-3 font-black text-amber-800 text-xs uppercase tracking-widest mb-1">
                <span>💡</span> Elite Optimization
              </div>
              <p className="text-stone-700 text-sm font-semibold leading-relaxed">
                {renderInline(trimmed.replace(/💡 pro tip:?/gi, '').trim())}
              </p>
            </div>
          );
        }
        if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
          return <div key={idx} className="font-black text-stone-900 mt-8 mb-2 border-b border-amber-100 pb-1 text-sm">{renderInline(trimmed)}</div>;
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex gap-4 pl-3 py-1.5 border-l-4 border-amber-200/50 ml-2">
              <span className="text-amber-500 font-black">•</span>
              <span className="text-stone-700 text-sm font-medium">{renderInline(trimmed.substring(2))}</span>
            </div>
          );
        }
        return <p key={idx} className="text-stone-600 font-medium text-sm leading-relaxed">{renderInline(line)}</p>;
      })}
    </div>
  );
};

const renderInline = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-black text-stone-950">{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="bg-stone-900 text-amber-400 px-1.5 py-0.5 rounded text-[11px] font-mono">{part.slice(1, -1)}</code>;
    return part;
  });
};

interface AIChatProps {
  activeContext: string;
  externalMessage?: string | null;
  onMessageHandled?: () => void;
}

const AIChat: React.FC<AIChatProps> = ({ activeContext, externalMessage, onMessageHandled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize or Reset Chat when Context Changes
  useEffect(() => {
    setMessages([
      { text: `Protocol activated for **${activeContext}**. \n\nI can assist with specific questions about this topic.`, isUser: false }
    ]);
  }, [activeContext]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping, isOpen]);

  useEffect(() => {
    if (externalMessage) {
      setIsOpen(true);
      handleMessage(externalMessage);
      onMessageHandled?.();
    }
  }, [externalMessage]);

  const handleMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;
    
    setMessages(prev => [...prev, { text, isUser: true }]);
    setIsTyping(true);
    setInput(''); // Clear input if it was user typed

    try {
      const response = await askAIQuestion(activeContext, text);
      setMessages(prev => [...prev, { text: response, isUser: false }]);
    } catch (err) {
      setMessages(prev => [...prev, { text: "Network signal lost. Please try asking again.", isUser: false }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col items-end">
      {isOpen && (
        <div className="bg-white w-[350px] sm:w-[450px] h-[500px] sm:h-[600px] max-h-[80vh] rounded-[3rem] shadow-2xl border-4 border-amber-50 overflow-hidden mb-6 flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="bg-stone-900 p-6 flex justify-between items-center text-white shrink-0">
            <div className="flex items-center gap-3 overflow-hidden">
               <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-xl shrink-0">🎓</div>
               <div className="truncate">
                 <h3 className="font-black text-sm">Concierge</h3>
                 <p className="text-[10px] text-amber-200/60 font-black uppercase tracking-widest truncate">{activeContext}</p>
               </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/20">×</button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-stone-50/50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-5 py-4 rounded-2xl text-sm leading-relaxed shadow-sm ${m.isUser ? 'bg-amber-500 text-stone-950 font-bold rounded-tr-sm' : 'bg-white text-stone-600 border border-stone-100 rounded-tl-sm'}`}>
                  {m.isUser ? m.text : <RichTextRenderer text={m.text} />}
                </div>
              </div>
            ))}
            {isTyping && (
               <div className="flex justify-start">
                 <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm border border-stone-100 flex gap-1">
                   <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"></div>
                   <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                   <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                 </div>
               </div>
            )}
          </div>

          <div className="p-4 bg-white border-t border-amber-50 shrink-0">
            <div className="flex gap-2">
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleMessage(input)}
                placeholder="Ask..."
                className="flex-1 bg-stone-100 rounded-2xl px-4 py-3 text-sm font-bold text-stone-900 outline-none focus:ring-2 focus:ring-amber-200"
              />
              <button 
                onClick={() => handleMessage(input)}
                disabled={isTyping || !input.trim()}
                className="w-12 h-12 bg-stone-900 text-amber-500 rounded-2xl flex items-center justify-center text-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                ➜
              </button>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => setIsOpen(!isOpen)} className={`w-16 h-16 rounded-[2rem] shadow-xl flex items-center justify-center text-3xl transition-all hover:scale-110 active:scale-90 border-[4px] ${isOpen ? 'bg-stone-900 border-stone-800 text-white' : 'bg-amber-500 border-white text-white'}`}>
        {isOpen ? '×' : '🎓'}
      </button>
    </div>
  );
};

export default AIChat;