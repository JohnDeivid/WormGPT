import React, { useEffect, useRef, useState, useCallback } from 'react';
import { applyTextToRange, extractEditFromResponse } from './contractUtils';
import type { SelectionInfo } from './contractUtils';

interface SelectionPopupProps {
  selection: SelectionInfo;
  onClose: () => void;
  onApplyEdit: (instruction: string, selectedText: string) => Promise<string>;
}

const QUICK_ACTIONS = [
  { label: '✦ Formal', prompt: 'Reescribe este texto en un tono más formal y profesional' },
  { label: '✦ Resumir', prompt: 'Resume este texto de manera concisa manteniendo el sentido legal' },
  { label: '+ Cláusula', prompt: 'Agrega una cláusula complementaria a este texto' },
  { label: '⇄ Traducir', prompt: 'Traduce este texto al inglés manteniendo el formato legal' },
];

export const SelectionPopup: React.FC<SelectionPopupProps> = ({
  selection,
  onClose,
  onApplyEdit,
}) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        if (!loading) onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose, loading]);

  const handleSubmit = useCallback(async (instruction: string) => {
    if (!instruction.trim() || !selection.range || loading) return;
    setLoading(true);
    setStatusMsg('Modificando...');
    try {
      const response = await onApplyEdit(instruction, selection.text);
      const { editText } = extractEditFromResponse(response);
      if (editText && selection.range) {
        applyTextToRange(selection.range, editText);
        setStatusMsg('✓ Cambio aplicado');
        setTimeout(onClose, 600);
      } else {
        setStatusMsg('Sin cambios detectados');
        setTimeout(onClose, 1500);
      }
    } catch {
      setStatusMsg('Error al aplicar cambio');
      setTimeout(onClose, 2000);
    } finally {
      setLoading(false);
    }
  }, [selection, onApplyEdit, onClose, loading]);

  if (!selection.rangeRect) return null;

  // Position popup above the selection
  const rect = selection.rangeRect;

  return (
    <div
      ref={popupRef}
      style={{
        position: 'fixed',
        top: Math.max(8, rect.top - 128),
        left: Math.max(8, Math.min(window.innerWidth - 376, rect.left + rect.width / 2 - 180)),
        zIndex: 9999,
        width: 360,
        pointerEvents: 'auto',
      }}
      className="selection-popup-root"
    >
      {/* Arrow */}
      <div
        style={{
          position: 'absolute',
          bottom: -7,
          left: Math.min(340, Math.max(20, rect.left + rect.width / 2 - (Math.max(8, Math.min(window.innerWidth - 376, rect.left + rect.width / 2 - 180))))),
          width: 14,
          height: 7,
          overflow: 'hidden',
        }}
      >
        <div style={{
          width: 14,
          height: 14,
          background: '#1a1a1a',
          border: '1px solid rgba(255,255,255,0.12)',
          transform: 'rotate(45deg) translate(-1px,-1px)',
          borderRadius: 2,
        }} />
      </div>

      <div style={{
        background: '#1a1a1a',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
        backdropFilter: 'blur(20px)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px 6px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: 'rgba(220,38,38,0.15)',
            border: '1px solid rgba(220,38,38,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 800,
            color: '#ef4444',
            fontFamily: 'monospace',
            flexShrink: 0,
          }}>W</div>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', flex: 1 }}>
            Editar con IA
          </span>
          <div style={{
            fontSize: 10,
            color: '#64748b',
            maxWidth: 160,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            "{selection.text.substring(0, 40)}{selection.text.length > 40 ? '…' : ''}"
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'flex', gap: 4, padding: '8px 10px 0', flexWrap: 'wrap' }}>
          {QUICK_ACTIONS.map(({ label, prompt }) => (
            <button
              key={label}
              onClick={() => handleSubmit(prompt)}
              disabled={loading}
              style={{
                padding: '4px 10px',
                borderRadius: 20,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent',
                color: '#94a3b8',
                fontSize: 11,
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'Inter, sans-serif',
                transition: 'all 0.15s',
                opacity: loading ? 0.5 : 1,
              }}
              onMouseEnter={e => { if (!loading) { (e.target as HTMLElement).style.background = 'rgba(220,38,38,0.1)'; (e.target as HTMLElement).style.color = '#ef4444'; (e.target as HTMLElement).style.borderColor = 'rgba(220,38,38,0.3)'; }}}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; (e.target as HTMLElement).style.color = '#94a3b8'; (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div style={{ padding: '8px 10px 10px', display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(input); } }}
            placeholder="¿Qué quieres cambiar?"
            disabled={loading}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              padding: '7px 12px',
              color: '#f1f5f9',
              fontSize: 13,
              outline: 'none',
              fontFamily: 'Inter, sans-serif',
            }}
          />
          <button
            onClick={() => handleSubmit(input)}
            disabled={loading || !input.trim()}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: 'none',
              background: loading || !input.trim() ? 'rgba(255,255,255,0.08)' : '#dc2626',
              color: loading || !input.trim() ? '#475569' : '#fff',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
          >
            {loading ? (
              <div style={{
                width: 12,
                height: 12,
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff',
                borderRadius: '50%',
                animation: 'spin 0.6s linear infinite',
              }} />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>

        {/* Status */}
        {statusMsg && (
          <div style={{
            padding: '4px 14px 8px',
            fontSize: 11,
            color: statusMsg.includes('✓') ? '#22c55e' : '#64748b',
          }}>
            {statusMsg}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .selection-popup-root { animation: popupSlideIn 0.15s cubic-bezier(0.16,1,0.3,1); }
        @keyframes popupSlideIn {
          from { opacity: 0; transform: translateY(6px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};
