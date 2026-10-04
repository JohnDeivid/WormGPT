import React, { useState, useRef, useCallback } from 'react';
import {
  ArrowLeft, FileText, Download, MessageSquare, ZoomIn, ZoomOut
} from 'lucide-react';
import { ContractCanvas } from './ContractCanvas';
import { ContractDocument } from './ContractDocument';
import { SelectionPopup } from './SelectionPopup';
import { ContractSidebar } from './ContractSidebar';
import {
  buildContractSystemPrompt,
  getDocumentText,
} from './contractUtils';
import type { SelectionInfo } from './contractUtils';
import './ContratosEditor.css';

// ── Server URL (mirrors App.tsx logic)
const isDev = window.location.port && window.location.port !== '3001';
const SERVER_URL = isDev
  ? `http://${window.location.hostname}:3001`
  : window.location.origin;

interface ContractsWorkspaceProps {
  onExit: () => void;
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3.0;

export const ContractsWorkspace: React.FC<ContractsWorkspaceProps> = ({ onExit }) => {
  // ── Canvas state ──
  const [zoom, setZoom] = useState(0.75);

  // ── Selection state ──
  const [selection, setSelection] = useState<SelectionInfo>({ text: '', rangeRect: null, range: null });
  const [showPopup, setShowPopup] = useState(false);

  // ── Sidebar ──
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ── Document ref (to read content) ──
  const documentRef = useRef<HTMLDivElement>(null);

  // ── Document content tracking ──
  const documentTextRef = useRef('');
  const documentHtmlRef = useRef('');

  const handleDocumentChange = useCallback((html: string, text: string) => {
    documentHtmlRef.current = html;
    documentTextRef.current = text;
  }, []);

  // ── Selection handling ──
  const handleSelectionChange = useCallback((info: SelectionInfo) => {
    if (info.text && info.text.length > 2 && info.rangeRect) {
      setSelection(info);
      setShowPopup(true);
    } else {
      // Don't immediately hide — let popup handle its own close
    }
  }, []);

  // ── AI Edit (for selection popup) ──
  const handleApplyEdit = useCallback(async (instruction: string, selectedText: string): Promise<string> => {
    const docText = documentRef.current
      ? getDocumentText(documentRef.current)
      : documentTextRef.current;

    const systemPrompt = buildContractSystemPrompt(docText, selectedText);

    const res = await fetch(`${SERVER_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        messages: [{ role: 'user', content: instruction }],
        systemPrompt,
        stream: false,
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Extract content from various response shapes
    return (
      data?.choices?.[0]?.message?.content ||
      data?.content ||
      data?.text ||
      data?.response ||
      ''
    );
  }, []);

  // ── System prompt builder for sidebar ──
  const buildSidebarSystemPrompt = useCallback((): string => {
    const docText = documentRef.current
      ? getDocumentText(documentRef.current)
      : documentTextRef.current;
    return buildContractSystemPrompt(docText, selection.text || undefined);
  }, [selection.text]);

  // ── Zoom controls ──
  const zoomIn = () => setZoom(z => Math.min(z + 0.1, MAX_ZOOM));
  const zoomOut = () => setZoom(z => Math.max(z - 0.1, MIN_ZOOM));
  const zoomReset = () => setZoom(0.75);
  const handleZoomChange = (z: number) => setZoom(z);

  // ── Export PDF ──
  const handleExportPDF = useCallback(() => {
    window.print();
  }, []);

  // ── Prevent popup from closing while typing in it ──
  const closePopup = useCallback(() => {
    setShowPopup(false);
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: '#0f0f0f',
        color: '#f1f5f9',
        fontFamily: 'Inter, -apple-system, sans-serif',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* ════════════════════════════════════════════════
          TOP TOOLBAR
      ════════════════════════════════════════════════ */}
      <div
        style={{
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          background: 'rgba(10,10,10,0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          flexShrink: 0,
          zIndex: 100,
          gap: 12,
        }}
      >
        {/* Left — Back + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <button
            onClick={onExit}
            title="Volver al Chat"
            style={{
              width: 32, height: 32, borderRadius: 8, border: 'none',
              background: 'transparent', color: '#475569', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s', flexShrink: 0,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.color = '#e2e8f0'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#475569'; }}
          >
            <ArrowLeft size={18} />
          </button>

          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: 'rgba(220,38,38,0.12)',
              border: '1px solid rgba(220,38,38,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <FileText size={15} color="#ef4444" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: 700, color: '#e2e8f0',
                letterSpacing: -0.3, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                Contrato de Servicios
              </div>
            </div>
            <div style={{
              padding: '2px 8px', borderRadius: 20,
              background: 'rgba(220,38,38,0.1)',
              border: '1px solid rgba(220,38,38,0.2)',
              fontSize: 9, fontWeight: 700, color: '#ef4444',
              letterSpacing: 0.5, textTransform: 'uppercase',
              flexShrink: 0,
            }}>
              DRAFT
            </div>
          </div>
        </div>

        {/* Center — Zoom controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <button
            onClick={zoomOut}
            title="Alejar (−)"
            style={toolbarBtnStyle}
            onMouseEnter={e => hoverIn(e)} onMouseLeave={e => hoverOut(e)}
          >
            <ZoomOut size={15} />
          </button>

          <div
            onClick={zoomReset}
            title="Restablecer zoom"
            style={{
              minWidth: 52, padding: '4px 6px', textAlign: 'center',
              fontSize: 12, fontWeight: 700, color: '#64748b',
              fontFamily: 'monospace', cursor: 'pointer', borderRadius: 6,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#e2e8f0'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#64748b'; }}
          >
            {Math.round(zoom * 100)}%
          </div>

          <button
            onClick={zoomIn}
            title="Acercar (+)"
            style={toolbarBtnStyle}
            onMouseEnter={e => hoverIn(e)} onMouseLeave={e => hoverOut(e)}
          >
            <ZoomIn size={15} />
          </button>
        </div>

        {/* Right — Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' }}>
          <button
            onClick={handleExportPDF}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '0 12px', height: 32, borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'transparent', color: '#64748b',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color = '#e2e8f0'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#64748b'; }}
          >
            <Download size={14} />
            Exportar PDF
          </button>

          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />

          <button
            onClick={() => setSidebarOpen(o => !o)}
            title="Inspector IA"
            style={{
              width: 32, height: 32, borderRadius: 8,
              border: sidebarOpen ? '1px solid rgba(220,38,38,0.4)' : '1px solid rgba(255,255,255,0.08)',
              background: sidebarOpen ? 'rgba(220,38,38,0.12)' : 'transparent',
              color: sidebarOpen ? '#ef4444' : '#64748b',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s', position: 'relative',
            }}
          >
            <MessageSquare size={15} />
            {!sidebarOpen && (
              <span style={{
                position: 'absolute', top: 6, right: 6,
                width: 6, height: 6, borderRadius: '50%',
                background: '#ef4444',
                animation: 'pulseDot 2s ease-in-out infinite',
              }} />
            )}
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          MAIN AREA: Canvas + Sidebar
      ════════════════════════════════════════════════ */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        {/* ── Infinite Canvas (Takes full width always) ── */}
        <ContractCanvas zoom={zoom} onZoomChange={handleZoomChange}>
          <div style={{ filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.6))' }}>
            <ContractDocument
              documentRef={documentRef}
              onSelectionChange={handleSelectionChange}
              onDocumentChange={handleDocumentChange}
            />
          </div>
        </ContractCanvas>

        {/* ── Selection Popup (rendered at viewport level) ── */}
        {showPopup && selection.text && selection.rangeRect && (
          <SelectionPopup
            selection={selection}
            onClose={closePopup}
            onApplyEdit={handleApplyEdit}
          />
        )}

        {/* ── AI Inspector Sidebar (Floating overlay) ── */}
        <div style={{
          position: 'absolute',
          top: 16,
          right: sidebarOpen ? 16 : -400,
          bottom: 16,
          zIndex: 60,
          transition: 'right 0.3s cubic-bezier(0.16,1,0.3,1)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <ContractSidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            selectedText={selection.text}
            documentTitle="Contrato de Servicios"
            serverUrl={SERVER_URL}
            defaultModel="gemini-2.5-flash"
            onApplyEdit={handleApplyEdit}
            buildSystemPrompt={buildSidebarSystemPrompt}
          />
        </div>
      </div>

      {/* ── Keyboard shortcuts hint ── */}
      <div style={{
        position: 'absolute',
        bottom: 14,
        right: sidebarOpen ? 374 : 14,
        display: 'flex',
        gap: 6,
        transition: 'right 0.28s cubic-bezier(0.16,1,0.3,1)',
        zIndex: 50,
        pointerEvents: 'none',
      }}>
        {[
          ['Space + Drag', 'Mover'],
          ['Scroll', 'Zoom'],
          ['Clic Medio', 'Mover'],
        ].map(([key, label]) => (
          <div key={key} style={{
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 6,
            padding: '3px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 10,
            color: 'rgba(255,255,255,0.3)',
          }}>
            <span style={{
              padding: '1px 5px',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 4,
              fontSize: 9,
              fontFamily: 'monospace',
              color: 'rgba(255,255,255,0.4)',
            }}>{key}</span>
            {label}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulseDot {
          0%,100% { opacity:1; transform:scale(1); }
          50% { opacity:0.5; transform:scale(0.8); }
        }
      `}</style>
    </div>
  );
};

// ── Shared toolbar button style ──
const toolbarBtnStyle: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 7,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'transparent',
  color: '#64748b',
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.15s',
};

function hoverIn(e: React.MouseEvent) {
  const el = e.currentTarget as HTMLElement;
  el.style.background = 'rgba(255,255,255,0.08)';
  el.style.color = '#e2e8f0';
}
function hoverOut(e: React.MouseEvent) {
  const el = e.currentTarget as HTMLElement;
  el.style.background = 'transparent';
  el.style.color = '#64748b';
}
