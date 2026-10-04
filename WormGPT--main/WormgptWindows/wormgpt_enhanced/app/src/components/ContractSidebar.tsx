import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, X, Send, FileText } from 'lucide-react';

interface ContractMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isError?: boolean;
}

interface ContractSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string;
  documentTitle: string;
  serverUrl: string;
  defaultModel: string;
  onApplyEdit: (instruction: string, selectedText: string) => Promise<string>;
  buildSystemPrompt: () => string;
}

const TOOL_SUGGESTIONS = [
  'Redacta una cláusula de penalización por retrasos',
  'Revisa la sección de pagos y hazla más clara',
  'Cambia los montos a dólares americanos',
  'Agrega una cláusula de resolución de conflictos',
  '¿Qué significa la cláusula 3.3?',
  'Traduce todo el contrato al inglés',
];

export const ContractSidebar: React.FC<ContractSidebarProps> = ({
  isOpen,
  onClose,
  selectedText,
  // documentTitle,
  serverUrl,
  defaultModel,
  // onApplyEdit,
  buildSystemPrompt,
}) => {
  const [messages, setMessages] = useState<ContractMessage[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const sendMessage = useCallback(async (text: string) => {
    const content = text.trim();
    if (!content || isGenerating) return;

    setShowSuggestions(false);
    setInput('');

    const userMsg: ContractMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsGenerating(true);

    const aiMsgId = `a-${Date.now()}`;
    setMessages(prev => [...prev, { id: aiMsgId, role: 'assistant', content: '', timestamp: new Date().toISOString() }]);

    try {
      abortRef.current = new AbortController();

      // Build context-aware messages
      const contextMessages = [
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: content }
      ];

      const res = await fetch(`${serverUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          model: defaultModel,
          messages: contextMessages,
          systemPrompt: buildSystemPrompt(),
          stream: true,
        }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed?.choices?.[0]?.delta?.content
                ?? parsed?.delta?.text
                ?? parsed?.content
                ?? '';
              if (delta) {
                accumulated += delta;
                setMessages(prev =>
                  prev.map(m =>
                    m.id === aiMsgId ? { ...m, content: accumulated } : m
                  )
                );
              }
            } catch { /* skip malformed */ }
          }
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: m.content + '\n\n_[Interrumpido]_' } : m));
      } else {
        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: 'Error al conectar con el asistente. Verifica la conexión.', isError: true } : m));
      }
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  }, [isGenerating, messages, serverUrl, defaultModel, buildSystemPrompt]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div
      style={{
        width: isOpen ? 360 : 0,
        minWidth: isOpen ? 360 : 0,
        opacity: isOpen ? 1 : 0,
        overflow: 'hidden',
        transition: 'width 0.28s cubic-bezier(0.16,1,0.3,1), min-width 0.28s cubic-bezier(0.16,1,0.3,1), opacity 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'rgba(17, 17, 17, 0.85)',
        backdropFilter: 'blur(30px)',
        position: 'relative',
      }}
    >
      {/* ── Header ── */}
      <div style={{
        height: 52,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
        background: 'rgba(255,255,255,0.015)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={14} color="#ef4444" />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', letterSpacing: -0.2 }}>Inspector IA</span>
          {selectedText && (
            <div style={{
              padding: '2px 8px',
              borderRadius: 20,
              background: 'rgba(220,38,38,0.1)',
              border: '1px solid rgba(220,38,38,0.2)',
              fontSize: 10,
              color: '#ef4444',
              fontWeight: 600,
              letterSpacing: 0.3,
              textTransform: 'uppercase',
            }}>
              Selección activa
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            width: 28, height: 28, borderRadius: 7, border: 'none',
            background: 'transparent', color: '#475569', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.color = '#e2e8f0'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#475569'; }}
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Context indicator ── */}
      {selectedText && (
        <div style={{
          margin: '10px 12px 0',
          padding: '8px 12px',
          background: 'rgba(220,38,38,0.06)',
          border: '1px solid rgba(220,38,38,0.15)',
          borderRadius: 8,
          borderLeft: '3px solid rgba(220,38,38,0.5)',
          fontSize: 11,
          color: '#94a3b8',
          lineHeight: 1.5,
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Texto seleccionado</div>
          <div style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', fontFamily: 'monospace' }}>
            "{selectedText.substring(0, 180)}{selectedText.length > 180 ? '…' : ''}"
          </div>
        </div>
      )}

      {/* ── Messages ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
        className="contract-chat-scroll"
      >
        {/* Empty state */}
        {messages.length === 0 && (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '20px 16px',
          }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: 'rgba(220,38,38,0.08)',
              border: '1px solid rgba(220,38,38,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              boxShadow: '0 0 30px rgba(220,38,38,0.08)',
            }}>
              <FileText size={24} color="#ef4444" />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>
              Asistente de Contratos
            </div>
            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6, maxWidth: 220, marginBottom: 20 }}>
              Selecciona texto en el documento o escríbeme directamente. Tengo acceso completo al contrato.
            </div>
            {showSuggestions && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                {TOOL_SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.07)',
                      background: 'rgba(255,255,255,0.03)',
                      color: '#64748b',
                      fontSize: 11,
                      cursor: 'pointer',
                      fontFamily: 'Inter, sans-serif',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                      lineHeight: 1.4,
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(220,38,38,0.06)'; (e.currentTarget as HTMLElement).style.color = '#e2e8f0'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(220,38,38,0.2)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; (e.currentTarget as HTMLElement).style.color = '#64748b'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Message list */}
        {messages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, animation: 'msgIn 0.2s ease' }}>
            {msg.role === 'user' ? (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: '12px 12px 4px 12px',
                  padding: '10px 14px',
                  maxWidth: '88%',
                  fontSize: 13,
                  color: '#e2e8f0',
                  lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {msg.content}
                </div>
              </div>
            ) : (
              <div style={{
                fontSize: 13,
                color: msg.isError ? '#f87171' : '#cbd5e1',
                lineHeight: 1.65,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {msg.content || (
                  <span style={{ opacity: 0.4, fontStyle: 'italic' }}>Generando...</span>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isGenerating && messages[messages.length - 1]?.role !== 'assistant' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 6, height: 6,
                borderRadius: '50%',
                background: '#475569',
                animation: `typeBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ── */}
      <div style={{
        padding: '10px 12px 14px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
        background: 'rgba(255,255,255,0.01)',
      }}>
        <div style={{
          background: '#191919',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 12,
          overflow: 'hidden',
          transition: 'border-color 0.2s',
        }}
          onFocus={() => {}}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isGenerating}
            placeholder={selectedText ? `Instrucción sobre "${selectedText.substring(0, 30)}…"` : 'Escribe una instrucción...'}
            rows={2}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#f1f5f9',
              fontSize: 13,
              fontFamily: 'Inter, sans-serif',
              lineHeight: 1.5,
              padding: '10px 12px 4px',
              resize: 'none',
              maxHeight: 100,
            }}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '4px 8px 8px',
          }}>
            <div style={{ fontSize: 10, color: '#334155' }}>
              Enter ↵ para enviar · Shift+Enter para nueva línea
            </div>
            <button
              onClick={() => sendMessage(input)}
              disabled={isGenerating || !input.trim()}
              style={{
                width: 30, height: 30,
                borderRadius: 8,
                border: 'none',
                background: isGenerating || !input.trim() ? 'rgba(255,255,255,0.06)' : '#dc2626',
                color: isGenerating || !input.trim() ? '#334155' : '#fff',
                cursor: isGenerating || !input.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >
              <Send size={13} />
            </button>
          </div>
        </div>
        {isGenerating && (
          <button
            onClick={() => abortRef.current?.abort()}
            style={{
              marginTop: 6,
              width: '100%',
              padding: '5px',
              borderRadius: 7,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'transparent',
              color: '#475569',
              fontSize: 11,
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            ✕ Detener generación
          </button>
        )}
      </div>

      <style>{`
        @keyframes msgIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes typeBounce { 0%,60%,100% { transform: translateY(0); opacity:.4; } 30% { transform: translateY(-6px); opacity:1; } }
        .contract-chat-scroll::-webkit-scrollbar { width: 4px; }
        .contract-chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .contract-chat-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 10px; }
      `}</style>
    </div>
  );
};
