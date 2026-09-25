/**
 * AIOS Chat - Interface de conversation IA
 * Interface Liquid Glass révolutionnaire (Apple + Google)
 * Auteur : Martial Zinsou
 */
import { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import { Card, Button, Input, Spinner } from '../../components/ui';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  model?: string;
  tokens?: number;
}

interface AIModel {
  id: string;
  name: string;
  type: string;
}

export default function AiosChat() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: 'Bonjour ! Je suis votre assistant AIOS. Comment puis-je vous aider aujourd\'hui ?', timestamp: new Date().toISOString() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState('gpt-4');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    api<any[]>('/aios/models').then(setModels).catch(() => {});
  }, []);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      const response = await api<{ message: Message }>('/aios/chat', {
        method: 'POST',
        body: { message: currentInput, model: selectedModel, history: messages }
      });
      setMessages(prev => [...prev, response.message]);
    } catch (err) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Erreur lors de la génération de la réponse. Veuillez réessayer.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* Sidebar Models */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} flex flex-col border-r border-white/[0.06] transition-all duration-300`} style={{ background: 'rgba(10,10,12,0.8)', backdropFilter: 'blur(40px)' }}>
        <div className="p-4 border-b border-white/[0.08]">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">Modèles IA</h3>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white/50 hover:text-white transition">
              {sidebarOpen ? '◀' : '▶'}
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {models.map((model) => (
            <button
              key={model.id}
              onClick={() => setSelectedModel(model.id)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition ${selectedModel === model.id ? 'text-white' : 'text-white/60 hover:text-white'}`}
              style={{ background: selectedModel === model.id ? 'linear-gradient(135deg, rgba(0,113,227,0.2), rgba(168,85,247,0.1))' : 'transparent' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🧠</span>
                <span className="truncate">{model.name}</span>
                <span className="text-xs text-white/40 ml-auto">{model.type}</span>
              </div>
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-white/[0.08]">
          <button className="btn-secondary w-full text-xs" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? 'Masquer' : 'Modèles'} ▼
          </button>
        </div>
      </aside>

      {/* Chat Area */}
      <main className="flex-1 flex flex-col">
        <div className="flex h-full flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${msg.role === 'user' ? 'bg-gradient-to-br from-sky-500 to-blue-600' : 'bg-gradient-to-br from-purple-500 to-pink-500'}`}>
                  {msg.role === 'user' ? '👤' : '🤖'}
                </div>
                <div className={`max-w-[70%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                  <div className="card px-4 py-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-white whitespace-pre-wrap">{msg.content}</p>
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-white/30">
                      <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                      {msg.model && <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-white/50">{msg.model}</span>}
                      {msg.tokens && <span className="text-[9px] text-white/40">{msg.tokens} tokens</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-white/[0.06] p-4" style={{ background: 'rgba(10,10,12,0.6)', backdropFilter: 'blur(40px)' }}>
            <form onSubmit={sendMessage} className="flex gap-3">
              <div className="flex-1 flex items-center gap-2">
                <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="input w-auto text-sm py-1.5" style={{ width: 'auto', minWidth: '180px' }}>
                  {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Messagez AIOS…"
                  className="input flex-1"
                  disabled={loading}
                />
                <Button type="submit" variant="primary" disabled={loading || !input.trim()}>
                  {loading ? 'Génération…' : 'Envoyer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}