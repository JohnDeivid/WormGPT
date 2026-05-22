import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import {
  Search, Send, Sparkles, Code, Terminal,
  Globe, Mic, Volume2, VolumeX, Download, Upload, Moon, Sun, Settings,
  Lock, Eye, EyeOff, CheckCircle2, XCircle, RefreshCw,
  Square, RotateCcw, Copy, Check, Trash2, Edit3, MoreVertical, X,
  Play, GitBranch, GitCommit, FolderOpen, FileText, Command, Clock,
  BookOpen, Columns, Plus, Save, ExternalLink,
  Network, Diff
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
  images?: string[];
  models?: string[];
  isGenerating?: boolean;
  isError?: boolean;
  variants?: string[];
  codeBlocks?: { id: string; lang: string; code: string; output?: string; error?: string }[];
}

interface ProjectFile { name: string; path: string; content: string; lang: string; isDirty?: boolean }
interface KnowledgeDoc { id: string; name: string; content: string; chunks: string[] }
interface LLMModel {
  id: string;
  name: string;
  provider: 'gemini';
  status: 'connected' | 'disconnected' | 'connecting';
  size?: string;
  description: string;
}
interface SettingsState {
  theme: 'dark' | 'light' | 'system';
  defaultModel: string; voiceEnabled: boolean; soundEnabled: boolean;
  multiModelConsensus: boolean; maxContextTokens: number; temperature: number; systemPrompt: string;
}

interface DownloadedSkill {
  id: string;
  name: string;
  content: string;
  url: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const isDev = window.location.port && window.location.port !== '3001';
const SERVER_URL = isDev ? `http://${window.location.hostname}:3001` : window.location.origin;
const WS_URL = SERVER_URL.replace(/^http/, 'ws');

const DEFAULT_MODELS: LLMModel[] = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'gemini', status: 'connected', description: 'Fast & capable multimodal model' },
  { id: 'gemini-2.5-pro',   name: 'Gemini 2.5 Pro',   provider: 'gemini', status: 'connected', description: 'Most capable model' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const detectLang = (code: string): string => {
  if (code.includes('import React') || code.includes('JSX') || code.includes('tsx')) return 'jsx';
  if (code.includes('def ') || code.includes('import ') && code.includes(':')) return 'python';
  if (code.includes('function') || code.includes('const ') || code.includes('let ')) return 'javascript';
  if (code.includes('<html') || code.includes('<!DOCTYPE')) return 'html';
  return 'text';
};

const extractCodeBlocks = (content: string) => {
  const blocks: { id: string; lang: string; code: string }[] = [];
  const regex = /```(\w+)?\n?([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    blocks.push({ id: Math.random().toString(36).slice(2), lang: match[1] || detectLang(match[2]), code: match[2].trim() });
  }
  return blocks;
};

const generateDiff = (original: string, modified: string): string => {
  const orig = original.split('\n'), mod = modified.split('\n');
  const result: string[] = [];
  const maxLen = Math.max(orig.length, mod.length);
  for (let i = 0; i < maxLen; i++) {
    if (orig[i] === mod[i]) result.push(`  ${orig[i] ?? ''}`);
    else {
      if (orig[i] !== undefined) result.push(`- ${orig[i]}`);
      if (mod[i] !== undefined) result.push(`+ ${mod[i]}`);
    }
  }
  return result.join('\n');
};

// ─── Logo & Avatar ────────────────────────────────────────────────────────────
const WormGPTLogo = ({ size = 32, className = '' }: { size?: number; className?: string }) => (
  <img src="./wormgpt-logo.jpg" alt="WormGPT" width={size} height={size} className={`rounded-lg object-cover ${className}`} />
);
export const BlankAvatar = ({ size = 32 }: { size?: number }) => (
  <div className="rounded-full bg-gradient-to-br from-red-900/50 to-red-800/30 border border-red-500/30 flex items-center justify-center" style={{ width: size, height: size }}>
    <span className="text-red-400/60 text-xs font-mono">?</span>
  </div>
);

// ─── Password Screen ──────────────────────────────────────────────────────────
const PasswordProtection = ({ onUnlock }: { onUnlock: () => void }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${SERVER_URL}/api/authenticate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onUnlock();
      } else {
        setError(data.error || 'Invalid access code');
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
      }
    } catch {
      setError('Could not connect to authentication server');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="password-overlay fixed inset-0 z-[100] flex items-center justify-center">
      <div className={`relative z-10 w-full max-w-[340px] px-6 ${isShaking ? 'animate-[glitch_0.5s_ease-in-out]' : ''}`}>
        {/* Logo block */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-xl bg-red-600/10 border border-red-500/20">
            <WormGPTLogo size={26} />
          </div>
          <h1 className="text-xl font-semibold text-white tracking-tight mb-1">WormGPT</h1>
          <p className="text-gray-500 text-xs">Enter your access code to continue</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock size={14} className="text-gray-600" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="Access code"
              autoFocus
              disabled={loading}
              className="w-full pl-9 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-red-500/40 transition-colors text-sm disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 hover:text-gray-400 transition-colors disabled:opacity-50"
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs animate-fadeIn">
              <XCircle size={13} /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:bg-red-800/50 text-white font-medium rounded-lg transition-colors text-sm tracking-wide flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Authenticating...
              </>
            ) : (
              'Authenticate'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-700">v2.0.0 · Powered by Gemini</p>
      </div>
    </div>
  );
};

// ─── Feature 1 & 13: Terminal ─────────────────────────────────────────────────
const TerminalPanel = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [lines, setLines] = useState<{ text: string; type: 'in' | 'out' | 'err' | 'sys' | 'ascii' }[]>([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); }, [lines]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    let socket: WebSocket | null = null;

    const initTerminal = async () => {
      let ascii = '';
      try {
        const res = await fetch('/tuil.txt');
        if (res.ok) {
          ascii = await res.text();
        }
      } catch {}

      if (!active) return;

      const initText = `WormGPT Terminal Interface (TUI) [Version 2.0.0]
(c) 2026 WormGPT Corporation. All rights reserved.

[+] Initializing virtual TUI environment...
[+] Loading security bypass subroutines...
[+] System initialized successfully. Ready.`;

      const newInitialLines = [];
      if (ascii) {
        newInitialLines.push({ text: ascii, type: 'ascii' as const });
      }
      newInitialLines.push({ text: initText, type: 'sys' as const });
      setLines(newInitialLines);

      try {
        socket = new WebSocket(WS_URL);
        socket.onopen = () => {
          if (active) setLines(p => [...p, { text: '✓ Connected to WormGPT backend server', type: 'sys' }]);
        };
        socket.onmessage = (e) => {
          if (!active) return;
          try {
            const d = JSON.parse(e.data);
            if (d.type === 'stdout') setLines(p => [...p, { text: d.data, type: 'out' }]);
            if (d.type === 'stderr') setLines(p => [...p, { text: d.data, type: 'err' }]);
            if (d.type === 'exit') {
              setIsRunning(false);
              setLines(p => [...p, { text: `[exited: ${d.code}]`, type: 'sys' }]);
            }
          } catch {}
        };
        socket.onerror = () => {
          if (active) setLines(p => [...p, { text: '⚠ Backend offline — run: cd server && npm install && npm start', type: 'err' }]);
        };
        setWs(socket);
      } catch {
        if (active) setLines(p => [...p, { text: '⚠ Could not connect', type: 'err' }]);
      }
    };

    initTerminal();

    return () => {
      active = false;
      if (socket) socket.close();
    };
  }, [isOpen]);

  const run = () => {
    if (!input.trim() || isRunning) return;
    const cmd = input.trim();
    setHistory(p => [cmd, ...p]); setHistIdx(-1);
    setLines(p => [...p, { text: `$ ${cmd}`, type: 'in' }]);
    setInput(''); setIsRunning(true);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'shell', command: cmd }));
    } else {
      setTimeout(() => { setLines(p => [...p, { text: 'No backend. Start: cd server && npm start', type: 'err' }]); setIsRunning(false); }, 300);
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm modal-overlay-mobile">
      <div className="bg-card border border-border rounded-none md:rounded-xl w-full max-w-4xl h-full md:h-[80vh] flex flex-col shadow-2xl animate-scaleIn overflow-hidden modal-content-mobile">
        <div className="flex items-center justify-between px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:pt-3 border-b border-border bg-muted/10">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500/80"/><div className="w-3 h-3 rounded-full bg-yellow-500/80"/><div className="w-3 h-3 rounded-full bg-green-500/80"/></div>
            <Terminal size={14} className="text-red-500" /><span className="text-sm font-semibold text-foreground">WormGPT Terminal</span>
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={() => setLines([{ text: 'Cleared.', type: 'sys' }])} className="text-xs text-neutral-500 hover:text-foreground px-2 py-1 rounded bg-muted hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors">Clear</button>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"><X size={18} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-0.5 bg-neutral-950 text-neutral-200">
          {lines.map((line, i) => (
            <div key={i} className={`leading-relaxed whitespace-pre-wrap ${
              line.type === 'in' ? 'text-green-400' :
              line.type === 'err' ? 'text-red-400' :
              line.type === 'sys' ? 'text-yellow-500' :
              line.type === 'ascii' ? 'text-emerald-500 font-bold' :
              'text-neutral-200'
            }`}>{line.text}</div>
          ))}
          {isRunning && <div className="text-red-500 animate-pulse">▌</div>}
          <div ref={endRef} />
        </div>
        <div className="border-t border-border p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:pb-3 flex items-center gap-2 bg-card">
          <span className="text-green-500 font-mono text-sm">$</span>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') run();
              if (e.key === 'ArrowUp') { const i = Math.min(histIdx + 1, history.length - 1); setHistIdx(i); setInput(history[i] || ''); }
              if (e.key === 'ArrowDown') { const i = Math.max(histIdx - 1, -1); setHistIdx(i); setInput(i === -1 ? '' : history[i]); }
            }}
            placeholder="Enter shell command..." className="flex-1 bg-transparent text-foreground font-mono text-sm outline-none placeholder-neutral-500" autoFocus />
          <button onClick={run} disabled={!input.trim() || isRunning} className="px-3 py-1.5 bg-foreground text-background font-medium hover:bg-foreground/90 disabled:opacity-50 rounded text-xs flex items-center gap-1.5 transition-colors">
            <Play size={12} /> Run
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Feature 2: Live HTML Preview ────────────────────────────────────────────
const LivePreview = ({ code, isOpen, onClose }: { code: string; isOpen: boolean; onClose: () => void }) => {
  const [editCode, setEditCode] = useState(code);
  const [tab, setTab] = useState<'preview' | 'code'>('preview');
  useEffect(() => setEditCode(code), [code]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm modal-overlay-mobile">
      <div className="bg-card border border-border rounded-none md:rounded-xl w-full max-w-5xl h-full md:h-[85vh] flex flex-col shadow-2xl animate-scaleIn overflow-hidden modal-content-mobile">
        <div className="flex items-center justify-between px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:pt-3 border-b border-border bg-muted/10">
          <div className="flex items-center gap-3">
            <Globe size={16} className="text-red-500" />
            <span className="text-sm font-semibold text-foreground">Live Preview</span>
            {(['preview', 'code'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`px-3 py-1 rounded text-xs capitalize transition-colors ${tab === t ? 'bg-foreground text-background font-medium' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'}`}>{t}</button>
            ))}
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"><X size={18} /></button>
        </div>
        {tab === 'preview' ? (
          <iframe srcDoc={editCode} sandbox="allow-scripts allow-same-origin" className="flex-1 w-full bg-white rounded-b-none md:rounded-b-xl" title="preview" />
        ) : (
          <textarea value={editCode} onChange={e => setEditCode(e.target.value)} className="flex-1 p-4 bg-muted/20 text-foreground font-mono text-sm resize-none outline-none rounded-b-none md:rounded-b-xl border-t border-border pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-4" />
        )}
      </div>
    </div>
  );
};

// ─── Feature 4: Artifact Panel ───────────────────────────────────────────────
const ArtifactPanel = ({ code, lang, isOpen, onClose }: { code: string; lang: string; isOpen: boolean; onClose: () => void }) => {
  const [tab, setTab] = useState<'preview' | 'code'>('preview');
  const [editedCode, setEditedCode] = useState(code);
  useEffect(() => setEditedCode(code), [code]);
  const isHtml = ['html', 'jsx', 'tsx'].includes(lang);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-y-0 right-0 z-[65] w-full md:w-[42vw] bg-card border-l border-border flex flex-col shadow-2xl animate-slideIn pt-safe pb-safe">
      <div className="flex items-center justify-between px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:pt-3 border-b border-border bg-muted/10">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-red-500" /><span className="text-sm font-semibold text-foreground">Artifact — {lang.toUpperCase()}</span>
          {isHtml && (['preview', 'code'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-2 py-0.5 rounded text-xs transition-colors ${tab === t ? 'bg-foreground text-background font-medium' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'}`}>{t}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigator.clipboard.writeText(editedCode)} className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 transition-colors"><Copy size={14} /></button>
          <button onClick={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([editedCode])); a.download = `artifact.${lang}`; a.click(); }} className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 transition-colors"><Download size={14} /></button>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"><X size={18} /></button>
        </div>
      </div>
      {isHtml && tab === 'preview' ? (
        <iframe srcDoc={editedCode} sandbox="allow-scripts" className="flex-1 bg-white" title="artifact" />
      ) : (
        <textarea value={editedCode} onChange={e => setEditedCode(e.target.value)} className="flex-1 p-4 bg-muted/20 text-foreground font-mono text-sm resize-none outline-none border-t border-border pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-4" />
      )}
    </div>
  );
};

// ─── Feature 5: Open in Editor Buttons ───────────────────────────────────────
const OpenInEditorButtons = () => (
  <div className="flex gap-1">
    <button onClick={() => window.open('vscode://file/.', '_blank')} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600/10 dark:bg-blue-600/20 hover:bg-blue-600/20 dark:hover:bg-blue-600/30 border border-blue-500/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs transition-colors">
      <Code size={12} /> VS Code
    </button>
    <button onClick={() => window.open('cursor://file/.', '_blank')} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-600/10 dark:bg-purple-600/20 hover:bg-purple-600/20 dark:hover:bg-purple-600/30 border border-purple-500/30 text-purple-600 dark:text-purple-400 rounded-lg text-xs transition-colors">
      <ExternalLink size={12} /> Cursor
    </button>
  </div>
);

// ─── Feature 6: Diff Viewer ───────────────────────────────────────────────────
const DiffViewer = ({ original, modified, isOpen, onClose }: { original: string; modified: string; isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;
  const diff = generateDiff(original, modified);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm modal-overlay-mobile">
      <div className="bg-card border border-border rounded-none md:rounded-xl w-full max-w-4xl h-full md:h-[70vh] flex flex-col animate-scaleIn overflow-hidden animate-fadeIn modal-content-mobile">
        <div className="flex items-center justify-between px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:pt-3 border-b border-border bg-muted/10">
          <div className="flex items-center gap-2"><Diff size={16} className="text-red-500" /><span className="text-sm font-semibold text-foreground">Diff Viewer</span></div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 font-mono text-sm bg-[#0f1117] text-neutral-200 rounded-b-none md:rounded-b-xl pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-4">
          {diff.split('\n').map((line, i) => (
            <div key={i} className={`leading-relaxed px-2 py-0.5 rounded ${line.startsWith('+') ? 'bg-green-900/20 text-green-400' : line.startsWith('-') ? 'bg-red-900/20 text-red-400' : 'text-neutral-500'}`}>{line}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Feature 7: Project File Editor ──────────────────────────────────────────
const ProjectEditor = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [origContent, setOrigContent] = useState('');
  const activeF = files.find(f => f.path === activeFile);
  const handleZip = async (file: File) => {
    const fd = new FormData(); fd.append('file', file);
    try {
      const res = await fetch(`${SERVER_URL}/api/project/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      const mapped = (data.files || []).map((f: { name: string; content: string }) => ({ name: f.name.split('/').pop(), path: f.name, content: f.content, lang: detectLang(f.content) }));
      setFiles(mapped); if (mapped.length > 0) setActiveFile(mapped[0].path);
    } catch {
      const r = new FileReader(); r.onload = e => { const c = e.target?.result as string || ''; setFiles([{ name: file.name, path: file.name, content: c, lang: detectLang(c) }]); setActiveFile(file.name); }; r.readAsText(file);
    }
  };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm modal-overlay-mobile">
      <div className="bg-card border border-border rounded-none md:rounded-xl w-full max-w-6xl h-full md:h-[90vh] flex flex-col animate-scaleIn overflow-hidden modal-content-mobile">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-4 py-3 gap-2 border-b border-border pt-[calc(0.75rem+env(safe-area-inset-top))] md:pt-3 bg-muted/10 w-full">
          <div className="flex items-center gap-2"><FolderOpen size={16} className="text-red-500" /><span className="text-sm font-semibold text-foreground">Project Editor</span></div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto justify-start md:justify-end items-center">
            <label className="px-3 py-1.5 text-xs bg-muted hover:bg-neutral-200 dark:hover:bg-neutral-800 text-foreground border border-border rounded cursor-pointer flex items-center gap-1 transition-colors">
              <Upload size={12} className="text-neutral-500" /> Upload ZIP<input type="file" accept=".zip,.txt,.js,.ts,.py,.html,.md" className="hidden" onChange={e => e.target.files?.[0] && handleZip(e.target.files[0])} />
            </label>
            {activeF?.isDirty && <>
              <button onClick={() => { setOrigContent(activeF.content); setShowDiff(true); }} className="px-2 py-1.5 text-xs bg-yellow-600/10 hover:bg-yellow-600/20 text-yellow-600 border border-yellow-500/30 rounded flex items-center gap-1 transition-colors"><Diff size={12} /> Diff</button>
              <button onClick={() => setFiles(p => p.map(f => f.path === activeFile ? { ...f, isDirty: false } : f))} className="px-2 py-1.5 text-xs bg-green-600/10 hover:bg-green-600/20 text-green-600 border border-green-500/30 rounded flex items-center gap-1 transition-colors"><Save size={12} /> Save</button>
            </>}
            <OpenInEditorButtons />
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors ml-auto md:ml-2"><X size={18} /></button>
          </div>
        </div>
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          <div className="flex flex-row md:flex-col md:w-48 border-b md:border-b-0 md:border-r border-border bg-muted/25 overflow-x-auto md:overflow-y-auto p-2 gap-1.5 md:gap-0.5 flex-shrink-0">
            {files.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-neutral-400 text-xs text-center p-4 border-2 border-dashed border-border rounded-lg m-2"><Upload size={20} className="mb-2 opacity-40" />Upload a ZIP or file</div>
            ) : files.map(f => (
              <button key={f.path} onClick={() => setActiveFile(f.path)} className={`flex-shrink-0 md:w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center gap-2 transition-all border ${activeFile === f.path ? 'bg-muted border-red-500/30 text-foreground font-medium' : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:bg-muted/50'}`}>
                <FileText size={11} className={f.isDirty ? 'text-yellow-500 animate-pulse' : 'text-neutral-400'} /><span className="truncate">{f.name}</span>{f.isDirty && <span className="text-yellow-500 ml-auto text-xs">●</span>}</button>
            ))}
          </div>
          {activeF ? (
            <textarea value={activeF.content} onChange={e => setFiles(p => p.map(f => f.path === activeFile ? { ...f, content: e.target.value, isDirty: true } : f))}
              className="flex-1 p-4 bg-muted/20 text-foreground font-mono text-sm resize-none outline-none pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-4" />
          ) : (
            <div className="flex-1 flex items-center justify-center text-neutral-500 dark:text-neutral-400 text-sm">Select a file to edit</div>
          )}
        </div>
      </div>
      <DiffViewer original={origContent} modified={activeF?.content || ''} isOpen={showDiff} onClose={() => setShowDiff(false)} />
    </div>
  );
};

// ─── Feature 9: Knowledge Base ────────────────────────────────────────────────
const KnowledgeBase = ({ isOpen, onClose, docs, onDocsChange }: { isOpen: boolean; onClose: () => void; docs: KnowledgeDoc[]; onDocsChange: (d: KnowledgeDoc[]) => void }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const addDoc = (file: File) => {
    const r = new FileReader();
    r.onload = e => {
      const content = e.target?.result as string || '';
      const chunks = content.match(/.{1,600}/g) || [content];
      onDocsChange([...docs, { id: Date.now().toString(), name: file.name, content, chunks }]);
    };
    r.readAsText(file);
  };
  const search = () => {
    if (!query.trim()) return;
    const all = docs.flatMap(d => d.chunks.map(c => ({ c, name: d.name })));
    const hits = all.map(({ c, name }) => ({ c, name, score: query.toLowerCase().split(' ').filter(w => c.toLowerCase().includes(w)).length }))
      .filter(h => h.score > 0).sort((a, b) => b.score - a.score).slice(0, 3).map(h => `[${h.name}]: ${h.c.slice(0, 250)}…`);
    setResults(hits.length ? hits : ['No results found.']);
  };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm modal-overlay-mobile">
      <div className="bg-card border border-border rounded-none md:rounded-xl w-full max-w-2xl h-full md:h-auto flex flex-col shadow-2xl animate-scaleIn overflow-hidden modal-content-mobile">
        <div className="flex items-center justify-between px-6 py-4 pt-[calc(1rem+env(safe-area-inset-top))] md:py-4 border-b border-border bg-muted/10">
          <div className="flex items-center gap-2"><BookOpen size={18} className="text-red-500" /><h3 className="font-semibold text-foreground">Knowledge Base (RAG)</h3></div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4 flex-1 overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-6">
          <label className="flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-border rounded-xl text-neutral-500 hover:text-foreground hover:border-neutral-400 dark:hover:border-neutral-500 cursor-pointer transition-colors bg-muted/10">
            <Upload size={24} className="text-red-500" /><span className="text-sm">Upload Docs (TXT, MD, code files)</span>
            <input type="file" multiple className="hidden" onChange={e => Array.from(e.target.files || []).forEach(addDoc)} />
          </label>
          {docs.length > 0 && <div className="space-y-2">
            {docs.map(d => (
              <div key={d.id} className="flex items-center justify-between px-3 py-2 bg-muted border border-border rounded-lg">
                <div className="flex items-center gap-2"><FileText size={14} className="text-neutral-500" /><span className="text-sm text-foreground">{d.name}</span></div>
                <div className="flex items-center gap-2"><span className="text-xs text-neutral-500">{d.chunks.length} chunks</span><button onClick={() => onDocsChange(docs.filter(x => x.id !== d.id))} className="text-neutral-400 hover:text-red-500 transition-colors"><X size={14} /></button></div>
              </div>
            ))}
          </div>}
          <div className="flex gap-2">
            <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} placeholder="Search knowledge base..." className="flex-1 px-3 py-2 bg-muted text-foreground border border-border rounded-lg text-sm placeholder-neutral-500 focus:outline-none focus:border-red-500 transition-colors" />
            <button onClick={search} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm transition-colors flex-shrink-0">Search</button>
          </div>
          {results.length > 0 && <div className="space-y-2 max-h-48 overflow-y-auto">
            {results.map((r, i) => <div key={i} className="p-3 bg-muted border border-border rounded-lg text-sm text-foreground/80 font-mono leading-relaxed">{r}</div>)}
          </div>}
        </div>
      </div>
    </div>
  );
};

// ─── Feature 14: Mermaid Renderer ────────────────────────────────────────────
const MermaidRenderer = ({ code, isOpen, onClose }: { code: string; isOpen: boolean; onClose: () => void }) => {
  const [editCode, setEditCode] = useState(code);
  const [svg, setSvg] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => setEditCode(code), [code]);
  const render = async () => {
    setErr('');
    const loadAndRender = async () => {
      const id = 'mmd' + Date.now();
      try {
        if (!(window as unknown as { mermaid?: unknown }).mermaid) {
          await new Promise<void>((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js'; s.onload = () => res(); s.onerror = rej; document.head.appendChild(s); });
        }
        (window as unknown as { mermaid: { initialize: (cfg: object) => void, render: (id: string, code: string) => Promise<{ svg: string }> } }).mermaid.initialize({ startOnLoad: false, theme: 'dark' });
        const { svg: out } = await (window as unknown as { mermaid: { initialize: (cfg: object) => void, render: (id: string, code: string) => Promise<{ svg: string }> } }).mermaid.render(id, editCode);
        setSvg(out);
      } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Render error'); }
    };
    loadAndRender();
  };
  useEffect(() => { if (isOpen && editCode) render(); }, [isOpen]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm modal-overlay-mobile">
      <div className="bg-card border border-border rounded-none md:rounded-xl w-full max-w-4xl h-full md:h-[80vh] flex flex-col shadow-2xl animate-scaleIn overflow-hidden modal-content-mobile">
        <div className="flex items-center justify-between px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:pt-3 border-b border-border bg-muted/10">
          <div className="flex items-center gap-2"><Network size={16} className="text-red-500" /><span className="text-sm font-semibold text-foreground">Mermaid Diagram</span></div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"><X size={18} /></button>
        </div>
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          <div className="w-full md:w-1/2 border-b md:border-b-0 md:border-r border-border flex flex-col h-1/2 md:h-full">
            <textarea value={editCode} onChange={e => setEditCode(e.target.value)} className="flex-1 p-4 bg-muted/20 text-foreground font-mono text-sm resize-none outline-none" />
            <div className="p-3 border-t border-border bg-card flex justify-end"><button onClick={render} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs flex items-center gap-1 transition-colors"><RefreshCw size={12} /> Render</button></div>
          </div>
          <div className="flex-1 flex items-center justify-center p-4 bg-neutral-950 overflow-auto pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-4">
            {err ? <p className="text-red-400 font-mono text-sm">{err}</p> : svg ? <div dangerouslySetInnerHTML={{ __html: svg }} /> : <p className="text-neutral-500 dark:text-neutral-400">Click Render →</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Feature 15: Git Panel ────────────────────────────────────────────────────
const GitPanel = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [output, setOutput] = useState('');
  const [commitMsg, setCommitMsg] = useState('');
  const [branchName, setBranchName] = useState('');
  const [loading, setLoading] = useState(false);
  const git = async (endpoint: string, body: object) => {
    setLoading(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/git/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await res.json();
      if (endpoint === 'status') setOutput(JSON.stringify(d.status || d, null, 2));
      else if (endpoint === 'diff') setOutput(d.diff || d.error || '');
      else setOutput(JSON.stringify(d, null, 2));
    } catch { setOutput('Backend not running.\nStart with: cd server && npm install && npm start'); }
    setLoading(false);
  };
  useEffect(() => { if (isOpen) git('status', {}); }, [isOpen]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm modal-overlay-mobile">
      <div className="bg-card border border-border rounded-none md:rounded-xl w-full max-w-2xl h-full md:h-auto flex flex-col shadow-2xl animate-scaleIn overflow-hidden modal-content-mobile">
        <div className="flex items-center justify-between px-6 py-4 pt-[calc(1rem+env(safe-area-inset-top))] md:py-4 border-b border-border bg-muted/10">
          <div className="flex items-center gap-2"><GitBranch size={18} className="text-red-500" /><h3 className="font-semibold text-foreground">Git Integration</h3></div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4 flex-1 overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-6">
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => git('status', {})} disabled={loading} className="py-2 bg-muted hover:bg-neutral-200 dark:hover:bg-neutral-800 text-foreground rounded-lg text-sm flex items-center justify-center gap-1 transition-colors"><RefreshCw size={14} /> Status</button>
            <button onClick={() => git('diff', {})} disabled={loading} className="py-2 bg-muted hover:bg-neutral-200 dark:hover:bg-neutral-800 text-foreground rounded-lg text-sm flex items-center justify-center gap-1 transition-colors"><Diff size={14} /> Diff</button>
            <button onClick={() => git('commit', { message: 'stage all', files: [] })} disabled={loading} className="py-2 bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 rounded-lg text-sm hover:bg-blue-600/20 dark:hover:bg-blue-600/30 transition-colors">Stage All</button>
          </div>
          <div className="flex gap-2">
            <input value={commitMsg} onChange={e => setCommitMsg(e.target.value)} placeholder="Commit message..." className="flex-1 px-3 py-2 bg-muted text-foreground border border-border rounded-lg text-sm focus:outline-none focus:border-red-500 transition-colors" />
            <button onClick={() => git('commit', { message: commitMsg })} disabled={loading || !commitMsg.trim()} className="px-4 py-2 bg-green-600/10 dark:bg-green-600/20 text-green-600 dark:text-green-400 border border-green-500/30 rounded-lg text-sm flex items-center gap-1 hover:bg-green-600/20 dark:hover:bg-green-600/30 transition-colors disabled:opacity-50 flex-shrink-0"><GitCommit size={14} /> Commit</button>
          </div>
          <div className="flex gap-2">
            <input value={branchName} onChange={e => setBranchName(e.target.value)} placeholder="New branch name..." className="flex-1 px-3 py-2 bg-muted text-foreground border border-border rounded-lg text-sm focus:outline-none focus:border-red-500 transition-colors" />
            <button onClick={() => git('branch', { name: branchName })} disabled={loading || !branchName.trim()} className="px-4 py-2 bg-purple-600/10 dark:bg-purple-600/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 rounded-lg text-sm flex items-center gap-1 hover:bg-purple-600/20 dark:hover:bg-purple-600/30 transition-colors disabled:opacity-50 flex-shrink-0"><GitBranch size={14} /> Create</button>
          </div>
          {output && <div className="bg-neutral-950 border border-border rounded-lg p-4 max-h-48 overflow-y-auto"><pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">{output}</pre></div>}
        </div>
      </div>
    </div>
  );
};

// ─── Feature 17: Command Palette ──────────────────────────────────────────────
const CommandPalette = ({ isOpen, onClose, onAction }: { isOpen: boolean; onClose: () => void; onAction: (a: string) => void }) => {
  const [query, setQuery] = useState('');
  const cmds = [
    { id: 'terminal', label: 'Open Terminal', icon: <Terminal size={15} />, hint: 'Run shell commands' },
    { id: 'editor', label: 'Project Editor', icon: <FolderOpen size={15} />, hint: 'Multi-file editor' },
    { id: 'kb', label: 'Knowledge Base', icon: <BookOpen size={15} />, hint: 'Upload docs for RAG' },
    { id: 'git', label: 'Git Panel', icon: <GitBranch size={15} />, hint: 'Commit, diff, branch' },
    { id: 'settings', label: 'Settings', icon: <Settings size={15} />, hint: 'Configure WormGPT' },
    { id: 'clear', label: 'Clear Chat', icon: <Trash2 size={15} />, hint: 'Start fresh' },
    { id: 'export', label: 'Export Chat', icon: <Download size={15} />, hint: 'Download JSON' },
    { id: 'theme', label: 'Toggle Theme', icon: <Moon size={15} />, hint: 'Dark / Light' },
    { id: 'resume', label: 'Resume Last Session', icon: <Clock size={15} />, hint: 'Restore previous chat' },
  ];
  const filtered = cmds.filter(c => c.label.toLowerCase().includes(query.toLowerCase()));
  useEffect(() => { if (!isOpen) setQuery(''); }, [isOpen]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[calc(12vh+env(safe-area-inset-top))] md:pt-[12vh] bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl w-full max-w-xl shadow-2xl animate-scaleIn overflow-hidden mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/10">
          <Command size={18} className="text-red-500" />
          <input value={query} onChange={e => setQuery(e.target.value)} autoFocus placeholder="Type a command..." className="flex-1 bg-transparent text-foreground outline-none text-sm placeholder-neutral-400 dark:placeholder-neutral-500" />
          <kbd className="text-xs text-neutral-500 bg-muted px-2 py-1 rounded">ESC</kbd>
        </div>
        <div className="max-h-[55vh] overflow-y-auto p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:pb-2">
          {filtered.map(cmd => (
            <button key={cmd.id} onClick={() => { onAction(cmd.id); onClose(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left transition-colors group mb-0.5">
              <span className="text-neutral-500 group-hover:text-red-500 transition-colors">{cmd.icon}</span>
              <div className="flex-1">
                <p className="text-foreground text-sm font-medium">{cmd.label}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{cmd.hint}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Feature 16: 4 Parallel Variants ────────────────────────────────────────
const VariantsPanel = ({ variants, isOpen, onClose, onSelect }: { variants: string[]; isOpen: boolean; onClose: () => void; onSelect: (v: string) => void }) => {
  if (!isOpen || !variants.length) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm modal-overlay-mobile">
      <div className="bg-card border border-border rounded-none md:rounded-xl w-full max-w-5xl h-full md:h-auto md:max-h-[85vh] flex flex-col shadow-2xl animate-scaleIn overflow-hidden modal-content-mobile">
        <div className="flex items-center justify-between px-6 py-4 pt-[calc(1rem+env(safe-area-inset-top))] md:pt-4 border-b border-border">
          <div className="flex items-center gap-2"><Columns size={18} className="text-red-500" /><h3 className="font-semibold text-foreground">4 Parallel Response Variants</h3></div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"><X size={20} /></button>
        </div>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-6 overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-6">
          {variants.map((v, i) => (
            <div key={i} className="bg-muted/20 dark:bg-muted/10 border border-border rounded-xl p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-red-500 uppercase font-semibold tracking-wider">Variant {i + 1}</span>
                <button onClick={() => { onSelect(v); onClose(); }} className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded-lg transition-colors">Use This</button>
              </div>
              <div className="flex-1 text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed overflow-y-auto max-h-48 whitespace-pre-wrap">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Add Skill Modal ──────────────────────────────────────────────────────────
const AddSkillModal = ({
  isOpen,
  onClose,
  onAdd
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (url: string, name: string, content: string) => void;
}) => {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setUrl('');
      setName('');
      setError('');
      setLoading(false);
    }
  }, [isOpen]);

  const handleInstall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Por favor, introduce una URL.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/skill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: url, skillName: name })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al descargar la skill desde el servidor.');
      }
      // Backend returns an array of installed skills
      if (Array.isArray(data.installed) && data.installed.length > 0) {
        data.installed.forEach((skill: { name: string; content: string }) => {
          const finalName = name.trim() || skill.name;
          onAdd(url, finalName, skill.content);
        });
      } else {
        // Fallback if unexpected response shape
        const { name: skillNameResp, content } = data;
        const finalName = name.trim() || skillNameResp;
        onAdd(url, finalName, content);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al conectar con la URL de la skill.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn modal-overlay-mobile">
      <div className="bg-card border border-border rounded-none md:rounded-xl w-full max-w-md h-full md:h-auto shadow-2xl animate-scaleIn p-6 flex flex-col overflow-y-auto pt-[calc(1.5rem+env(safe-area-inset-top))] md:pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-6 modal-content-mobile">
        <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-red-500" />
            <h3 className="font-semibold text-foreground">Agregar Skill</h3>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleInstall} className="space-y-4 flex-1 md:flex-initial">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">URL del Repositorio de GitHub</label>
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="e.g., https://github.com/usuario/repositorio"
              className="w-full px-3 py-2 bg-muted text-foreground border border-border rounded-lg text-sm focus:outline-none focus:border-red-500 transition-colors"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Nombre de la Skill (Opcional)</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej. Mi Skill Personalizada"
              className="w-full px-3 py-2 bg-muted text-foreground border border-border rounded-lg text-sm focus:outline-none focus:border-red-500 transition-colors"
              disabled={loading}
            />
          </div>
          {error && (
            <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg flex items-center gap-2">
              <XCircle size={14} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2 pb-4 md:pb-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-foreground bg-muted hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-border rounded-lg transition-colors font-medium"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-500 active:bg-red-700 rounded-lg font-medium transition-colors flex items-center gap-1.5"
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Descargando...
                </>
              ) : (
                'Confirmar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Manage Skills Modal ──────────────────────────────────────────────────────
const ManageSkillsModal = ({
  isOpen,
  onClose,
  skills,
  onDelete,
  onAddClick
}: {
  isOpen: boolean;
  onClose: () => void;
  skills: DownloadedSkill[];
  onDelete: (id: string) => void;
  onAddClick: () => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn modal-overlay-mobile">
      <div className="bg-card border border-border rounded-none md:rounded-xl w-full max-w-2xl h-full md:h-auto md:max-h-[80vh] shadow-2xl animate-scaleIn flex flex-col overflow-hidden modal-content-mobile">
        <div className="flex items-center justify-between px-6 py-4 pt-[calc(1rem+env(safe-area-inset-top))] md:pt-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-red-500" />
            <h3 className="font-semibold text-foreground">Gestionar Skills</h3>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 space-y-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Skills instaladas: {skills.length}
            </p>
            <button
              onClick={() => {
                onClose();
                onAddClick();
              }}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Plus size={14} /> Agregar Skill
            </button>
          </div>
          {skills.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl bg-muted/10">
              <Sparkles size={32} className="mb-2 text-neutral-600 animate-pulse" />
              <p className="text-sm">No hay skills instaladas.</p>
              <p className="text-xs text-neutral-500 mt-1">Haz clic en "Agregar Skill" para empezar.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {skills.map(skill => (
                <div key={skill.id} className="flex items-center justify-between p-4 bg-muted/20 border border-border rounded-xl hover:border-red-500/30 transition-colors">
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="font-medium text-sm text-foreground truncate">{skill.name}</p>
                    <p className="text-xs text-neutral-500 truncate mt-0.5" title={skill.url}>{skill.url}</p>
                  </div>
                  <button
                    onClick={() => onDelete(skill.id)}
                    className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all flex-shrink-0"
                    title="Eliminar Skill"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-border flex justify-end pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-foreground bg-muted hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-border rounded-lg transition-colors font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Feature 18: Copy-As Menu ─────────────────────────────────────────────────
const CopyAsMenu = ({ content, isOpen, onClose }: { content: string; isOpen: boolean; onClose: () => void }) => {
  const [copied, setCopied] = useState('');
  const formats = [
    { label: 'Markdown', convert: () => content },
    { label: 'JSON',     convert: () => JSON.stringify({ content, timestamp: new Date().toISOString() }, null, 2) },
    {
      label: 'cURL',
      convert: () =>
        `curl -X POST http://localhost:3001/api/chat \\\n` +
        `  -H "Content-Type: application/json" \\\n` +
        `  -d '${JSON.stringify({ messages: [{ role: 'user', content }], model: 'gemini-2.5-flash', stream: false })}'`,
    },
    {
      label: 'Python',
      convert: () =>
        `import requests\n` +
        `response = requests.post(\n` +
        `    "http://localhost:3001/api/chat",\n` +
        `    json={"messages": [{"role": "user", "content": ${JSON.stringify(content)}}],\n` +
        `          "model": "gemini-2.5-flash", "stream": False}\n` +
        `)\nprint(response.json())`,
    },
  ];
  const doCopy = (label: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => { setCopied(''); onClose(); }, 1500);
  };
  if (!isOpen) return null;
  return (
    <div className="absolute right-0 bottom-full mb-2 w-48 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-fadeIn">
      <p className="px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider border-b border-border">Copy as…</p>
      {formats.map(f => (
        <button
          key={f.label}
          onClick={() => doCopy(f.label, f.convert())}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white transition-colors"
        >
          {copied === f.label ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
          {copied === f.label ? 'Copied!' : f.label}
        </button>
      ))}
    </div>
  );
};

// ─── Code Block with Run Button ───────────────────────────────────────────────
const CodeBlockView = ({ block, onPreview, onOpenArtifact, onOpenMermaid }: {
  block: { id: string; lang: string; code: string; output?: string; error?: string };
  onPreview: (code: string) => void;
  onOpenArtifact: (code: string, lang: string) => void;
  onOpenMermaid: (code: string) => void;
}) => {
  const [output, setOutput] = useState(block.output || '');
  const [error, setError] = useState(block.error || '');
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const canRun = ['python', 'javascript', 'js', 'py', 'bash', 'sh'].includes(block.lang);
  const isHtml = ['html', 'jsx', 'tsx'].includes(block.lang);
  const isMermaid = block.lang === 'mermaid';
  const mountedRef = useRef(true);
  const wsRef = useRef<WebSocket | null>(null);
  
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const run = async () => {
    setRunning(true); setOutput(''); setError('');
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      ws.onopen = () => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: 'run_code', code: block.code, lang: block.lang }));
        }
      };
      ws.onmessage = e => {
        if (!mountedRef.current) return;
        const d = JSON.parse(e.data);
        if (d.type === 'stdout') setOutput(p => p + d.data);
        if (d.type === 'stderr') setError(p => p + d.data);
        if (d.type === 'exit') {
          if (mountedRef.current) setRunning(false);
          ws.close();
          wsRef.current = null;
        }
      };
      ws.onerror = () => {
        if (!mountedRef.current) return;
        setError('Backend not running. Start: cd server && npm start');
        setRunning(false);
        wsRef.current = null;
      };
    } catch {
      if (!mountedRef.current) return;
      setError('Could not connect to backend');
      setRunning(false);
      wsRef.current = null;
    }
  };

  const copy = () => { navigator.clipboard.writeText(block.code); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="rounded-xl overflow-hidden border border-border mt-3 mb-1 bg-card">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/25 border-b border-border">
        <span className="text-xs text-muted-foreground font-mono uppercase">{block.lang}</span>
        <div className="flex items-center gap-1.5">
          {isMermaid && <button onClick={() => onOpenMermaid(block.code)} className="px-2 py-1 text-xs bg-purple-600/10 dark:bg-purple-600/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 hover:bg-purple-600/20 dark:hover:bg-purple-600/30 rounded flex items-center gap-1 transition-colors"><Network size={10} /> Diagram</button>}
          {isHtml && <button onClick={() => onPreview(block.code)} className="px-2 py-1 text-xs bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 hover:bg-blue-600/20 dark:hover:bg-blue-600/30 rounded flex items-center gap-1 transition-colors"><Globe size={10} /> Preview</button>}
          {isHtml && <button onClick={() => onOpenArtifact(block.code, block.lang)} className="px-2 py-1 text-xs bg-yellow-600/10 dark:bg-yellow-600/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30 hover:bg-yellow-600/20 dark:hover:bg-yellow-600/30 rounded flex items-center gap-1 transition-colors"><Sparkles size={10} /> Artifact</button>}
          {canRun && <button onClick={run} disabled={running} className="px-2 py-1 text-xs bg-green-600/10 dark:bg-green-600/20 text-green-600 dark:text-green-400 border border-green-500/30 hover:bg-green-600/20 dark:hover:bg-green-600/30 rounded flex items-center gap-1 transition-colors disabled:opacity-50"><Play size={10} /> {running ? 'Running...' : 'Run'}</button>}
          <button onClick={copy} className="px-2 py-1 text-xs bg-muted hover:bg-secondary text-foreground border border-border rounded flex items-center gap-1 transition-colors">{copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}{copied ? 'Copied' : 'Copy'}</button>
        </div>
      </div>
      <pre className="p-4 code-block-body font-mono text-sm overflow-x-auto leading-relaxed whitespace-pre-wrap">{block.code}</pre>
      {(output || error) && (
        <div className="border-t border-border bg-black/5 dark:bg-black/20 p-3">
          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Output</p>
          {output && <pre className="text-xs text-green-500 dark:text-green-400 font-mono whitespace-pre-wrap">{output}</pre>}
          {error && <pre className="text-xs text-red-500 dark:text-red-400 font-mono whitespace-pre-wrap">{error}</pre>}
        </div>
      )}
    </div>
  );
};

// ─── Settings Panel ───────────────────────────────────────────────────────────
const SettingsPanel = ({ isOpen, onClose, settings, onSettingsChange, models, onModelChange, activeModel, initialTab = 'general' }: {
  isOpen: boolean; onClose: () => void; settings: SettingsState; onSettingsChange: (s: SettingsState) => void;
  models: LLMModel[]; onModelChange: (id: string) => void; activeModel: string; initialTab?: 'general' | 'models' | 'advanced';
}) => {
  const [tab, setTab] = useState<'general' | 'models' | 'advanced'>(initialTab);
  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
    }
  }, [isOpen, initialTab]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm modal-overlay-mobile">
      <div className="bg-card border border-border rounded-none md:rounded-xl w-full max-w-2xl h-full md:h-auto md:max-h-[85vh] flex flex-col overflow-hidden animate-scaleIn shadow-2xl modal-content-mobile">
        <div className="flex items-center justify-between px-6 py-4 pt-[calc(1rem+env(safe-area-inset-top))] md:pt-4 border-b border-border">
          <div className="flex items-center gap-3"><Settings size={20} className="text-red-500" /><h2 className="text-lg font-semibold text-foreground">Settings</h2></div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-500 dark:text-neutral-400 transition-colors"><X size={20} /></button>
        </div>
        <div className="flex border-b border-border bg-muted/10">
          {(['general', 'models', 'advanced'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? 'text-foreground border-foreground font-semibold' : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 border-transparent'}`}>{t}</button>
          ))}
        </div>
        <div className="p-6 overflow-y-auto flex-1 md:max-h-[55vh] pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-6">
          {tab === 'general' && <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div><p className="text-foreground font-medium">Theme</p><p className="text-sm text-neutral-500 dark:text-neutral-400">Choose your preferred theme</p></div>
              <div className="flex gap-2">{(['dark','light','system'] as const).map(theme => (<button key={theme} onClick={() => onSettingsChange({ ...settings, theme })} className={`px-3 py-2 rounded-lg text-sm capitalize transition-colors ${settings.theme === theme ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-medium' : 'bg-muted hover:bg-neutral-200 dark:hover:bg-neutral-800 text-foreground'}`}>{theme}</button>))}</div>
            </div>
            {[['voiceEnabled', 'Voice Input', 'Enable voice recognition'], ['soundEnabled', 'Sound Effects', 'Play sounds for actions']].map(([key, label, desc]) => (
              <div key={key} className="flex items-center justify-between">
                <div><p className="text-foreground font-medium">{label}</p><p className="text-sm text-neutral-500 dark:text-neutral-400">{desc}</p></div>
                <button onClick={() => onSettingsChange({ ...settings, [key]: !settings[key as keyof SettingsState] })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${settings[key as keyof SettingsState] ? 'bg-red-500' : 'bg-neutral-300 dark:bg-neutral-700'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings[key as keyof SettingsState] ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
              </div>
            ))}
          </div>}
          {tab === 'models' && <div className="space-y-6">
            <div className="space-y-2"><p className="text-foreground font-medium">Available Models</p>
              {models.map(model => (
                <div key={model.id} onClick={() => onModelChange(model.id)} className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border ${activeModel === model.id ? 'bg-muted border-red-500/30' : 'bg-muted/20 border-border hover:bg-muted/50'}`}>
                  <div className="flex items-center gap-3"><div className={`w-2 h-2 rounded-full ${model.status === 'connected' ? 'bg-green-500 animate-pulse' : model.status === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-neutral-400'}`} />
                    <div><p className="text-foreground text-sm font-medium">{model.name}</p><p className="text-xs text-neutral-500 dark:text-neutral-400">{model.description}</p></div>
                  </div>
                  {model.size && <span className="text-xs text-neutral-400">{model.size}</span>}
                  {activeModel === model.id && <CheckCircle2 size={16} className="text-red-500" />}
                </div>
              ))}
            </div>
          </div>}
          {tab === 'advanced' && <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div><p className="text-foreground font-medium">System Prompt</p><p className="text-sm text-neutral-500 dark:text-neutral-400">Custom instructions sent before every conversation</p></div>
                {settings.systemPrompt && <span className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-full">Active</span>}
              </div>
              <textarea value={settings.systemPrompt} onChange={e => onSettingsChange({ ...settings, systemPrompt: e.target.value })} placeholder="Enter your custom system prompt..." rows={6} className="w-full px-4 py-3 bg-muted text-foreground border border-border rounded-lg text-sm focus:outline-none focus:border-red-500 resize-y placeholder-neutral-400 font-mono leading-relaxed" />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-neutral-500">{settings.systemPrompt.length} characters</p>
                {settings.systemPrompt && <button onClick={() => onSettingsChange({ ...settings, systemPrompt: '' })} className="text-xs text-red-500/80 hover:text-red-500">Clear prompt</button>}
              </div>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <div><p className="text-foreground font-medium">Multi-Model Consensus</p><p className="text-sm text-neutral-500 dark:text-neutral-400">Run multiple models for better responses</p></div>
              <button onClick={() => onSettingsChange({ ...settings, multiModelConsensus: !settings.multiModelConsensus })} className={`w-12 h-6 rounded-full transition-colors relative ${settings.multiModelConsensus ? 'bg-red-500' : 'bg-neutral-300 dark:bg-neutral-700'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.multiModelConsensus ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>
            <div><div className="flex justify-between mb-2"><p className="text-foreground font-medium">Temperature</p><span className="text-red-500 font-medium">{settings.temperature}</span></div>
              <input type="range" min="0" max="2" step="0.1" value={settings.temperature} onChange={e => onSettingsChange({ ...settings, temperature: parseFloat(e.target.value) })} className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-red-500" />
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Higher = more creative, Lower = more focused</p>
            </div>
            <div><div className="flex justify-between mb-2"><p className="text-foreground font-medium">Max Context Tokens</p><span className="text-red-500 font-medium">{settings.maxContextTokens}</span></div>
              <input type="range" min="1024" max="8192" step="1024" value={settings.maxContextTokens} onChange={e => onSettingsChange({ ...settings, maxContextTokens: parseInt(e.target.value) })} className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-red-500" />
            </div>
          </div>}
        </div>
      </div>
    </div>
  );
};

// ─── Message Actions ──────────────────────────────────────────────────────────
const MessageActions = ({ message, onCopy, onEdit, onDelete, onRegenerate, isGenerating }: {
  message: Message; onCopy: () => void; onEdit: () => void; onDelete: () => void;
  onRegenerate?: () => void; isGenerating?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCopyAs, setShowCopyAs] = useState(false);
  const handleCopy = () => { navigator.clipboard.writeText(message.content); setCopied(true); onCopy(); setTimeout(() => setCopied(false), 2000); setIsOpen(false); };
  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 transition-colors"><MoreVertical size={14} /></button>
      {isOpen && (
        <div className="absolute right-0 mt-1 w-44 bg-card border border-border rounded-lg shadow-xl z-50 animate-fadeIn overflow-hidden">
          <button onClick={handleCopy} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}{copied ? 'Copied!' : 'Copy'}
          </button>
          <button onClick={() => { setShowCopyAs(!showCopyAs); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
            <Code size={14} /> Copy as...
          </button>
          {message.type === 'user' && <button onClick={() => { onEdit(); setIsOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"><Edit3 size={14} /> Edit</button>}
          {message.type === 'ai' && onRegenerate && !isGenerating && <button onClick={() => { onRegenerate(); setIsOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"><RotateCcw size={14} /> Regenerate</button>}
          <button onClick={() => { onDelete(); setIsOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors border-t border-border mt-0.5 pt-1.5 pb-1"><Trash2 size={14} /> Delete</button>
        </div>
      )}
      <CopyAsMenu content={message.content} isOpen={showCopyAs} onClose={() => { setShowCopyAs(false); setIsOpen(false); }} />
    </div>
  );
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const SidebarItem = ({ icon, label, onClick, collapsed, active = false }: {
  icon: React.ReactNode; label: string; onClick: () => void; collapsed: boolean; active?: boolean;
}) => (
  <button
    onClick={onClick}
    title={collapsed ? label : undefined}
    className={`flex items-center gap-3 w-full rounded-lg transition-colors text-sm font-medium
      ${collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'}
      ${active
        ? 'bg-secondary text-foreground'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
  >
    <span className="flex-shrink-0 flex items-center justify-center w-5 h-5">{icon}</span>
    {!collapsed && <span className="truncate">{label}</span>}
  </button>
);

const Sidebar = ({
  isDark, toggleTheme, collapsed, onToggleCollapse, onOpenSettings, onOpenPalette, onOpenTerminal, onOpenExportImport, onNewChat, onOpenEditor, onOpenKB, onOpenGit, onOpenManageSkills, isMobile = false
}: {
  isDark: boolean; toggleTheme: () => void; collapsed: boolean; onToggleCollapse: () => void;
  onOpenSettings: (tab?: 'general' | 'models' | 'advanced') => void; onOpenPalette: () => void; onOpenTerminal: () => void;
  onOpenExportImport: () => void; onNewChat: () => void;
  onOpenEditor: () => void; onOpenKB: () => void; onOpenGit: () => void;
  onOpenManageSkills: () => void;
  isMobile?: boolean;
}) => (
  <aside
    className={`flex-shrink-0 flex flex-col justify-between border-r transition-all duration-200 ease-in-out overflow-hidden
      ${isMobile ? 'w-[260px] p-3 flex h-full' : (collapsed ? 'w-[60px] p-2 hidden md:flex' : 'w-[240px] p-3 hidden md:flex')}`}
    style={{ background: 'hsl(0 0% 5%)', borderRightColor: 'hsl(0 0% 11%)' }}
  >
    {/* ── Top section ── */}
    <div className="flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden flex-1 min-h-0">
      {/* Brand + collapse toggle */}
      <div className={`flex items-center mb-3 ${collapsed && !isMobile ? 'justify-center py-1' : 'justify-between px-2 py-1'}`}>
        {(!collapsed || isMobile) && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 flex items-center justify-center flex-shrink-0"><WormGPTLogo size={28} /></div>
            <span className="font-semibold text-sm truncate" style={{ color: 'hsl(0 0% 88%)' }}>WormGPT</span>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
        >
          {collapsed
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          }
        </button>
      </div>

      {/* New chat */}
      <button
        onClick={onNewChat}
        title={collapsed ? 'New Chat' : undefined}
        className={`new-chat-btn flex items-center gap-2.5 rounded-lg font-medium text-sm mb-2
          ${collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5'}`}
      >
        <Plus size={16} className="flex-shrink-0" />
        {!collapsed && <span>New Chat</span>}
      </button>

      {/* Search / Command Palette */}
      <SidebarItem icon={<Search size={18} />} label="Search" onClick={onOpenPalette} collapsed={collapsed} />

      {/* Divider + section label */}
      {!collapsed && <p className="sidebar-section-label mt-4 mb-1 px-3">Tools</p>}
      {collapsed && <div className="h-px my-2" style={{ background: 'hsl(0 0% 12%)' }} />}

      <SidebarItem icon={<Terminal size={18} />} label="Terminal" onClick={onOpenTerminal} collapsed={collapsed} />
      <SidebarItem icon={<FolderOpen size={18} />} label="Project Editor" onClick={onOpenEditor} collapsed={collapsed} />
      <SidebarItem icon={<BookOpen size={18} />} label="Knowledge Base" onClick={onOpenKB} collapsed={collapsed} />
      <SidebarItem icon={<GitBranch size={18} />} label="Git" onClick={onOpenGit} collapsed={collapsed} />
      <SidebarItem icon={<Sparkles size={18} />} label="Gestionar Skills" onClick={onOpenManageSkills} collapsed={collapsed} />

      {/* Divider + section label */}
      {!collapsed && <p className="sidebar-section-label mt-4 mb-1 px-3">General</p>}
      {collapsed && <div className="h-px my-2" style={{ background: 'hsl(0 0% 12%)' }} />}

      <SidebarItem icon={<Download size={18} />} label="Export / Import" onClick={onOpenExportImport} collapsed={collapsed} />
    </div>

    {/* ── Bottom section ── */}
    <div className="flex flex-col gap-0.5 pt-2 mt-2" style={{ borderTop: '1px solid hsl(0 0% 11%)' }}>
      <SidebarItem icon={isDark ? <Sun size={18} /> : <Moon size={18} />} label={isDark ? 'Light Mode' : 'Dark Mode'} onClick={toggleTheme} collapsed={collapsed} />
      <SidebarItem icon={<Settings size={18} />} label="Settings" onClick={onOpenSettings} collapsed={collapsed} />

      {/* User profile */}
      <div
        onClick={() => onOpenSettings('general')}
        className={`flex items-center gap-2.5 mt-1 rounded-lg cursor-pointer hover:bg-muted transition-colors
          ${collapsed ? 'justify-center p-2' : 'px-3 py-2'}`}
        title={collapsed ? 'Profile Settings' : undefined}
      >
        <div className="w-7 h-7 bg-muted-foreground/20 text-foreground rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0">U</div>
        {!collapsed && <span className="text-sm font-medium text-foreground truncate">User</span>}
      </div>
    </div>
  </aside>
);

// ─── Header ───────────────────────────────────────────────────────────────────
const Header = ({ activeModel, contextUsage, isGenerating, onStopGeneration, onToggleMobileSidebar, onOpenSettings }: {
  activeModel: string; contextUsage: number; isGenerating: boolean; onStopGeneration: () => void; onToggleMobileSidebar: () => void;
  onOpenSettings?: (tab?: 'general' | 'models' | 'advanced') => void;
}) => (
  <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 md:px-6 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 md:py-3 bg-transparent pointer-events-none mobile-header">
    <div className="flex items-center gap-3 pointer-events-auto">
      {/* Mobile sidebar toggle */}
      <button onClick={onToggleMobileSidebar} className="md:hidden p-2 rounded-lg text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
      <div className="flex flex-col gap-0.5">
        <div 
          onClick={() => onOpenSettings?.('models')} 
          className="flex items-center gap-2 text-neutral-800 dark:text-neutral-200 font-semibold text-sm cursor-pointer hover:opacity-80 transition-opacity"
        >
          {activeModel} <span className="text-neutral-400 dark:text-neutral-500 text-[10px] mt-0.5">▼</span>
        </div>
        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">{Math.round(contextUsage)}% context</div>
      </div>
    </div>
    <div className="flex items-center gap-3 pointer-events-auto">
      {isGenerating && (
        <button onClick={onStopGeneration} className="flex items-center gap-2 px-3 py-1.5 rounded-lg stop-btn text-xs font-medium">
          <Square size={12} fill="currentColor" /> Stop
        </button>
      )}
    </div>
  </header>
);

// ─── Loading Indicator ────────────────────────────────────────────────────────
const LoadingIndicator = ({ models }: { models: string[] }) => {
  return (
    <div className="flex flex-col gap-2 mb-8 animate-fadeIn">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
          <WormGPTLogo size={32} />
        </div>
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg loading-indicator-bg">
          <div className="flex gap-1">
            <div className="loading-dot" style={{ animationDelay: '0s' }} />
            <div className="loading-dot" style={{ animationDelay: '0.2s' }} />
            <div className="loading-dot" style={{ animationDelay: '0.4s' }} />
          </div>
          <span className="text-[13px] font-medium text-muted-foreground">
            {models.length > 1 ? `Consensus: ${models.join(' & ')}` : 'Generating...'}
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── Hero Section ─────────────────────────────────────────────────────────────
const HeroSection = ({ onSendMessage }: { onSendMessage: (msg: string) => void }) => {
  return (
    <div className="w-full max-w-3xl flex flex-col gap-8 animate-fadeInUp mt-4">
      {/* Brand header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="hero-logo-badge">
            <WormGPTLogo size={22} />
          </div>
          <span className="hero-label-text">WormGPT</span>
        </div>
        <h1 className="text-2xl md:text-[28px] font-semibold text-foreground tracking-tight leading-snug">
          Hello, <span className="hero-accent-text">User</span>
        </h1>
        <p className="text-[15px] text-muted-foreground leading-relaxed max-w-lg">
          Unrestricted. Unfiltered. Ready.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(220,38,38,0.6)' }}>
          <Sparkles size={11} /> Quick prompts
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full hero-cards-grid">
          {[
            { icon: <Code size={13} />,     title: 'Write malware analysis report', desc: 'Deobfuscate and document suspicious code' },
            { icon: <Terminal size={13} />,  title: 'Explain a phishing technique', desc: 'Social engineering tactics & defenses' },
            { icon: <Globe size={13} />,     title: 'Generate a Python payload', desc: 'Reverse shell or exfiltration script' },
          ].map((card, i) => (
            <div
              key={i}
              onClick={() => onSendMessage(card.title + ': ' + card.desc)}
              className="hero-card group cursor-pointer rounded-xl p-3 md:p-4 flex items-start gap-3 border border-border bg-muted/20 hover:bg-muted/50 transition-colors w-full"
            >
              <div className="hero-card-icon flex-shrink-0 mt-0.5">{card.icon}</div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm md:text-[13px] font-medium text-foreground leading-snug">{card.title}</span>
                <span className="text-xs md:text-[12px] text-muted-foreground leading-snug hidden md:block">{card.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};



// ─── Voice Recorder ───────────────────────────────────────────────────────────
const VoiceRecorder = ({ onTranscript, isEnabled }: { onTranscript: (t: string) => void; isEnabled: boolean }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const toggle = async () => {
    if (!isEnabled) return;
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mr = new MediaRecorder(stream);
        mr.start(); setMediaRecorder(mr); setIsRecording(true);
        mr.onstop = () => { stream.getTracks().forEach(t => t.stop()); setIsRecording(false); onTranscript('[Voice message recorded — transcription requires Whisper API]'); };
        setTimeout(() => mr.stop(), 10000);
      } catch { setIsRecording(false); }
    } else { mediaRecorder?.stop(); }
  };
  return (
    <button onClick={toggle} disabled={!isEnabled} className={`p-1 rounded-full transition-all ${isRecording ? 'bg-neutral-200 dark:bg-[#3a3a3a] text-red-500 animate-pulse' : !isEnabled ? 'opacity-50 cursor-not-allowed text-neutral-400' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200'}`}>
      {isRecording ? <div className="flex items-center gap-0.5 px-1">{[1,2,3,4].map(i => <div key={i} className="w-0.5 bg-current rounded-full animate-pulse" style={{ height: `${4+i*3}px`, animationDelay: `${i*0.1}s` }} />)}</div> : <Mic size={18} />}
    </button>
  );
};

// ─── Input Bar ────────────────────────────────────────────────────────────────
const InputBar = ({ onSendMessage, onVoiceTranscript, voiceEnabled, isGenerating, selectedSkills, onToggleSkill, downloadedSkills, onDownloadSkill }: {
  onSendMessage: (msg: string) => void;
  onVoiceTranscript: (t: string) => void; voiceEnabled: boolean; isGenerating: boolean;
  selectedSkills: string[]; onToggleSkill: (id: string) => void;
  downloadedSkills: DownloadedSkill[]; onDownloadSkill: () => void;
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  useEffect(() => {
    if (inputValue === '' && inputRef.current) {
      inputRef.current.style.height = '28px';
    }
  }, [inputValue]);

  const handleSend = () => { if (inputValue.trim() && !isGenerating) { onSendMessage(inputValue); setInputValue(''); } };
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };
  
  const availableSkills = downloadedSkills.filter(s => !selectedSkills.includes(s.id));
  
  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full input-container flex items-center px-4 py-3 gap-3 relative">
        <div className="relative flex items-center gap-2" ref={menuRef}>
          <button onClick={() => setShowMenu(!showMenu)} className="text-muted-foreground hover:text-foreground p-1 flex-shrink-0 transition-colors"><Plus size={18} /></button>
          
          {selectedSkills.map(skillId => {
            const skill = downloadedSkills.find(s => s.id === skillId);
            if (!skill) return null;
            return (
              <span key={skill.id} onClick={() => onToggleSkill(skill.id)} className="px-2 py-1 text-xs bg-muted text-foreground rounded-md cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors border border-border flex items-center gap-1 shrink-0">
                {skill.name} <X size={10} className="text-muted-foreground" />
              </span>
            );
          })}

          {showMenu && (
            <div className="absolute bottom-full left-0 mb-2 w-56 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-fadeIn pb-1">
              <label className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer">
                <Upload size={16} /> <span className="font-medium">Upload File / Image</span>
                <input type="file" accept="image/*,.pdf,.txt,.md,.csv" className="hidden" onChange={(e) => {
                  if (e.target.files?.[0]) {
                    onSendMessage(`[Uploaded File: ${e.target.files[0].name}]`);
                    setShowMenu(false);
                  }
                }} />
              </label>
              <div className="border-t border-border mt-1 pt-2 pb-1">
                <p className="px-4 py-1 text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-1">Available Skills</p>
                {availableSkills.length === 0 ? (
                  <div className="px-4 py-2 text-xs text-muted-foreground italic">No skills available.</div>
                ) : (
                  availableSkills.map(skill => (
                    <button key={skill.id} onClick={() => { onToggleSkill(skill.id); setShowMenu(false); }} className="w-full flex items-center justify-between px-4 py-2 text-sm text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                      <span>{skill.name}</span>
                    </button>
                  ))
                )}
                <button onClick={() => { setShowMenu(false); onDownloadSkill(); }} className="w-full flex items-center gap-2 px-4 py-2 mt-1 text-sm text-blue-500 hover:bg-blue-500/10 transition-colors border-t border-border">
                  <Download size={14} /> Install from URL
                </button>
              </div>
            </div>
          )}
        </div>
        <textarea 
          ref={inputRef} value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={handleKeyDown}
          placeholder="Send a Message..." disabled={isGenerating} rows={1}
          enterKeyHint="send"
          className="flex-1 bg-transparent text-foreground placeholder-muted-foreground text-[15px] outline-none resize-none max-h-48 py-1 leading-normal"
          style={{ height: '28px' }}
          onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = '28px'; t.style.height = Math.min(t.scrollHeight, 200) + 'px'; }}
        />
        <div className="flex items-center gap-1 flex-shrink-0">
          <VoiceRecorder onTranscript={onVoiceTranscript} isEnabled={voiceEnabled} />
          <button onClick={handleSend} disabled={!inputValue.trim() || isGenerating} className="text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors p-1"><Send size={18} /></button>
        </div>
      </div>
      <div className="text-[11px] text-neutral-400 dark:text-[#6e6e6e] mt-3 text-center font-medium hidden sm:block">
        LLMs can make mistakes. Verify important information.
      </div>
    </div>
  );
};

// ─── User Message ─────────────────────────────────────────────────────────────
const UserMessage = ({ message }: { message: Message }) => (
  <div className="flex flex-col items-end gap-1 mb-6 animate-fadeIn">
    <div className="max-w-[80%] bg-muted/40 text-foreground px-5 py-3 rounded-2xl rounded-tr-sm text-[15px] leading-relaxed border border-border/20 shadow-sm">
      {message.content}
    </div>
  </div>
);

// ─── AI Message ───────────────────────────────────────────────────────────────
const AIMessage = ({ message, onCopy, onDelete, onRegenerate, onOpenVariants, isGenerating, onPreview, onOpenArtifact, onOpenMermaid }: {
  message: Message; onCopy: () => void; onDelete: () => void; onRegenerate: () => void; onOpenVariants: () => void;
  isGenerating: boolean; onPreview: (code: string) => void; onOpenArtifact: (code: string, lang: string) => void; onOpenMermaid: (code: string) => void;
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const codeBlocks = extractCodeBlocks(message.content);
  useEffect(() => {
    return () => {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSpeaking]);

  const speak = () => {
    if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); return; }
    const utt = new SpeechSynthesisUtterance(message.content.replace(/```[\s\S]*?```/g, '[code block]'));
    utt.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utt); setIsSpeaking(true);
  };
  const renderContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (part.startsWith('```')) return null; // rendered separately as CodeBlockView
      return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>;
    });
  };
  return (
    <div className="flex items-start gap-4 mb-8 animate-fadeIn w-full group">
      <div className="flex flex-col w-full min-w-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {/* Minimal header space */}
          </div>
          <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
            <MessageActions message={message} onCopy={onCopy} onEdit={() => {}} onDelete={onDelete} onRegenerate={onRegenerate} isGenerating={isGenerating} />
            {!isGenerating && <button onClick={onOpenVariants} className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"><Columns size={12} /> Variants</button>}
          </div>
        </div>
        <div className="text-[15px] leading-relaxed text-foreground break-words">
          {renderContent(message.content)}
          {isGenerating && <span className="typing-cursor ml-1 inline-block" />}
        </div>
        {codeBlocks.map(block => (
          <CodeBlockView key={block.id} block={block} onPreview={onPreview} onOpenArtifact={onOpenArtifact} onOpenMermaid={onOpenMermaid} />
        ))}
        {!isGenerating && (
          <button onClick={speak} className={`mt-2 self-start flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all ${isSpeaking ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
            {isSpeaking ? <Volume2 size={12} /> : <VolumeX size={12} />}{isSpeaking ? 'Speaking...' : 'Read aloud'}
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Export/Import Dialog ─────────────────────────────────────────────────────
const ExportImportDialog = ({ isOpen, onClose, messages, onImport }: { isOpen: boolean; onClose: () => void; messages: Message[]; onImport: (m: Message[]) => void }) => {
  const [importData, setImportData] = useState('');
  const [tab, setTab] = useState<'export' | 'import'>('export');
  if (!isOpen) return null;
  const exportData = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(messages, null, 2)], { type: 'application/json' })); a.download = `wormgpt-${Date.now()}.json`; a.click(); };
  const handleImport = () => { try { onImport(JSON.parse(importData)); setImportData(''); onClose(); } catch { alert('Invalid JSON'); } };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm modal-overlay-mobile">
      <div className="bg-card border border-border rounded-none md:rounded-xl w-full max-w-lg h-full md:h-auto flex flex-col overflow-hidden animate-scaleIn shadow-2xl modal-content-mobile">
        <div className="flex items-center justify-between px-6 py-4 pt-[calc(1rem+env(safe-area-inset-top))] md:pt-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Export / Import</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"><X size={20} /></button>
        </div>
        <div className="flex border-b border-border bg-muted/10">
          <button onClick={() => setTab('export')} className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'export' ? 'text-foreground border-b-2 border-foreground' : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'}`}>Export</button>
          <button onClick={() => setTab('import')} className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'import' ? 'text-foreground border-b-2 border-foreground' : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'}`}>Import</button>
        </div>
        <div className="p-6 flex-1 md:flex-initial overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-6">
          {tab === 'export' ? (
            <div className="text-center"><p className="text-neutral-500 dark:text-neutral-400 mb-4">Export {messages.length} messages</p>
              <button onClick={exportData} className="w-full py-3 bg-muted hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-border rounded-lg text-foreground flex items-center justify-center gap-2 transition-colors"><Download size={18} /> Download JSON</button>
            </div>
          ) : (
            <div>
              <textarea value={importData} onChange={e => setImportData(e.target.value)} className="w-full h-32 p-3 bg-muted border border-border rounded-lg text-foreground text-sm font-mono resize-none focus:outline-none focus:border-red-500 transition-colors placeholder-neutral-500" placeholder="Paste conversation JSON..." />
              <button onClick={handleImport} disabled={!importData.trim()} className="w-full mt-4 py-3 bg-red-600 hover:bg-red-500 disabled:bg-muted disabled:text-neutral-400 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"><Upload size={18} /> Import</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Feature 20: Session Resume Banner ───────────────────────────────────────
const SessionResumeBanner = ({ onResume, onDismiss }: { onResume: () => void; onDismiss: () => void }) => (
  <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 animate-fadeIn">
    <div className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-xl shadow-lg">
      <Clock size={15} className="text-red-500 flex-shrink-0" />
      <span className="text-sm text-foreground">Continue your last session?</span>
      <button onClick={onResume} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-medium transition-colors">Resume</button>
      <button onClick={onDismiss} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"><X size={15} /></button>
    </div>
  </div>
);

// ─── Main App ─────────────────────────────────────────────────────────────────
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [downloadedSkills, setDownloadedSkills] = useState<DownloadedSkill[]>([]);
  const [isChatActive, setIsChatActive] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'general' | 'models' | 'advanced'>('general');
  const [showExportImport, setShowExportImport] = useState(false);
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDoc[]>([]);

  const handleOpenSettingsTab = (tab: 'general' | 'models' | 'advanced' = 'general') => {
    setSettingsTab(tab);
    setShowSettings(true);
  };

  // Feature modals
  const [showTerminal, setShowTerminal] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showKB, setShowKB] = useState(false);
  const [showGit, setShowGit] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [previewCode, setPreviewCode] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [artifactCode, setArtifactCode] = useState('');
  const [artifactLang, setArtifactLang] = useState('html');
  const [showArtifact, setShowArtifact] = useState(false);
  const [mermaidCode, setMermaidCode] = useState('');
  const [showMermaid, setShowMermaid] = useState(false);
  const [variants, setVariants] = useState<string[]>([]);
  const [showVariants, setShowVariants] = useState(false);
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [showManageSkills, setShowManageSkills] = useState(false);

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [settings, setSettings] = useState<SettingsState>({
    theme: 'dark',
    defaultModel: 'gemini-2.5-flash', voiceEnabled: true, soundEnabled: true,
    multiModelConsensus: false, maxContextTokens: 4096, temperature: 0.7, systemPrompt: '',
  });
  const [models] = useState<LLMModel[]>(DEFAULT_MODELS);
  const [activeModel, setActiveModel] = useState('gemini-2.5-flash');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Layout references & states
  const [inputHeight, setInputHeight] = useState(120);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const prevMessagesLengthRef = useRef(messages.length);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // visualViewport listener (scrolling to bottom on resize)
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handleResize = () => {
      if (isNearBottomRef.current && chatScrollContainerRef.current) {
        chatScrollContainerRef.current.scrollTop = chatScrollContainerRef.current.scrollHeight;
      }
    };
    vv.addEventListener('resize', handleResize);
    vv.addEventListener('scroll', handleResize);
    handleResize();
    return () => {
      vv.removeEventListener('resize', handleResize);
      vv.removeEventListener('scroll', handleResize);
    };
  }, []);

  // ResizeObserver for dynamic bottom input area height
  useEffect(() => {
    if (!inputContainerRef.current) return;
    const observer = new ResizeObserver(() => {
      if (inputContainerRef.current) {
        setInputHeight(inputContainerRef.current.offsetHeight);
      }
    });
    observer.observe(inputContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // Feature 8: Auto-summarization memory
  const memoryRef = useRef<string>('');

  // Feature 20: Session restore
  useEffect(() => {
    const saved = localStorage.getItem('wormgpt_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.messages && parsed.messages.length > 0) setShowResumeBanner(true);
      } catch {}
    }
  }, []);

  const resumeSession = () => {
    const saved = localStorage.getItem('wormgpt_session');
    if (saved) {
      try {
        const { messages: savedMsgs } = JSON.parse(saved);
        if (savedMsgs?.length > 0) { setMessages(savedMsgs); setIsChatActive(true); }
      } catch {}
    }
    setShowResumeBanner(false);
  };

  // Save session to localStorage
  useEffect(() => {
    if (messages.length > 0) localStorage.setItem('wormgpt_session', JSON.stringify({ messages, timestamp: Date.now() }));
  }, [messages]);

  // Load downloaded skills from localStorage
  useEffect(() => {
    const savedSkills = localStorage.getItem('wormgpt_downloaded_skills');
    if (savedSkills) {
      try { setDownloadedSkills(JSON.parse(savedSkills)); } catch {}
    }
  }, []);

  // Save downloaded skills to localStorage
  useEffect(() => {
    localStorage.setItem('wormgpt_downloaded_skills', JSON.stringify(downloadedSkills));
  }, [downloadedSkills]);

  const handleDownloadSkill = () => {
    setShowAddSkill(true);
  };

  const handleAddSkill = (url: string, name: string, content: string) => {
    const id = Date.now().toString();
    setDownloadedSkills(prev => [...prev, { id, name, content, url }]);
  };

  const handleDeleteSkill = (id: string) => {
    setDownloadedSkills(prev => prev.filter(s => s.id !== id));
    setSelectedSkills(prev => prev.filter(x => x !== id));
  };

  // Sync settings.theme with isDark
  useEffect(() => {
    if (settings.theme === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(systemDark);
      const listener = (e: MediaQueryListEvent) => setIsDark(e.matches);
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    } else {
      setIsDark(settings.theme === 'dark');
    }
  }, [settings.theme]);

  // Synchronize HTML element classes with isDark theme state
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [isDark]);

  // Hotkeys: Ctrl+K for palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setShowPalette(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Context usage: estimate from message character count vs 32k chars (~8k tokens)
  const contextUsage = Math.min(
    100,
    Math.round(
      messages.reduce((acc, m) => acc + m.content.length, 0) / 320
    )
  );

  // Remove watermark DOM injection (metadata is kept in server).

  const handleScroll = () => {
    if (!chatScrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatScrollContainerRef.current;
    // If we are within 150px of the bottom, we consider the user wants to stay at the bottom
    const nearBottom = scrollHeight - scrollTop - clientHeight < 150;
    isNearBottomRef.current = nearBottom;
  };


  // Intelligent scroll on messages or generation changes
  useEffect(() => {
    if (!chatScrollContainerRef.current) return;
    const lengthChanged = messages.length > prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = messages.length;

    if (lengthChanged) {
      // Force scroll to bottom on new message
      chatScrollContainerRef.current.scrollTo({
        top: chatScrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
      isNearBottomRef.current = true;
    } else {
      // Stream updates: scroll to bottom instantly (no smooth jump) only if near bottom
      if (isNearBottomRef.current) {
        chatScrollContainerRef.current.scrollTop = chatScrollContainerRef.current.scrollHeight;
      }
    }
  }, [messages, isGenerating]);

  // Scroll to bottom when keyboard opens or input changes size
  useEffect(() => {
    if (isNearBottomRef.current && chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTop = chatScrollContainerRef.current.scrollHeight;
    }
  }, [inputHeight]);



  const handleStopGeneration = () => {
    if (abortControllerRef.current) { abortControllerRef.current.abort(); abortControllerRef.current = null; }
    setIsGenerating(false);
    setMessages(prev => prev.map(m => m.isGenerating ? { ...m, isGenerating: false } : m));
  };

  // Feature 8: Build context — system prompt now lives in server
  const buildMessages = (userContent: string) => {
    const skillsBlock = selectedSkills.length > 0 
      ? `<skills>\n${selectedSkills.map(s => {
          const sk = downloadedSkills.find(x => x.id === s);
          return sk ? `Name: ${sk.name}\nContent:\n${sk.content}` : '';
        }).join('\n\n')}\n</skills>`
      : '';
      
    const baseSystemPrompt = "You are a specialized AI assistant. You must assume your identity internally without listing your capabilities. For simple greetings like 'Hola' or 'Hello', answer concisely and ask how you can help.";

    const extraSystem = [
      baseSystemPrompt,
      skillsBlock,
      settings.systemPrompt ? 'Additional instructions:\n' + settings.systemPrompt : '',
      memoryRef.current   ? 'Conversation summary:\n'    + memoryRef.current   : '',
      knowledgeDocs.length > 0
        ? 'Knowledge base context:\n' + knowledgeDocs.flatMap(d => d.chunks.slice(0, 2)).join('\n').slice(0, 2000)
        : '',
    ].filter(Boolean).join('\n\n');

    const systemMsg = extraSystem
      ? [{ role: 'system', content: extraSystem }]
      : [];

    const recentMsgs = messages.slice(-20).map(m => ({
      role: m.type === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));

    return [...systemMsg, ...recentMsgs, { role: 'user', content: userContent }];
  };

  const summarizeIfNeeded = async () => {
    if (messages.length > 0 && messages.length % 15 === 0) {
      try {
        const res = await fetch(`${SERVER_URL}/api/chat`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [{ role: 'user', content: `Summarize this conversation briefly (2-3 sentences): ${messages.map(m => `${m.type}: ${m.content.slice(0, 100)}`).join('\n')}` }], model: 'gemini-2.5-flash', stream: false })
        });
        const data = await res.json();
        if (data.message?.content) memoryRef.current = data.message.content;
      } catch {}
    }
  };

  const handleSendMessage = useCallback(async (content: string, isEdit = false, messageId?: string) => {
    if (isGenerating) return;
    if (!isChatActive) setIsChatActive(true);
    if (isEdit && messageId) {
      const idx = messages.findIndex(m => m.id === messageId);
      if (idx !== -1) setMessages(prev => prev.slice(0, idx + 1).map(m => m.id === messageId ? { ...m, content } : m));
    } else {
      const userMsg: Message = { id: Date.now().toString(), type: 'user', content, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      setMessages(prev => [...prev, userMsg]);
    }
    setIsGenerating(true);
    abortControllerRef.current = new AbortController();
    await summarizeIfNeeded();
    const aiMsgId = (Date.now() + 1).toString();
    const aiMsg: Message = { id: aiMsgId, type: 'ai', content: '', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), isGenerating: true, models: [models.find(m => m.id === activeModel)?.name || 'WormGPT'] };
    setMessages(prev => [...prev, aiMsg]);
    try {
      const res = await fetch(`${SERVER_URL}/api/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: buildMessages(content), model: models.find(m => m.id === activeModel)?.id || 'gemini-2.5-flash', temperature: settings.temperature, stream: true }),
        signal: abortControllerRef.current.signal
      });
      if (!res.ok) throw new Error(await res.text());
      const reader = res.body!.getReader(); const decoder = new TextDecoder();
      let fullContent = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        const lines = text.split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          if (line === 'data: [DONE]') break;
          try {
            const json = JSON.parse(line.slice(6));
            const delta = json.message?.content || json.response || '';
            if (delta) { fullContent += delta; setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: fullContent } : m)); }
            if (json.done) break;
          } catch {}
        }
      }
      setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, isGenerating: false } : m));
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') { setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: m.content || '[Generation stopped]', isGenerating: false } : m)); }
      else {
        const rawErr = err instanceof Error ? err.message : String(err);
        // Try to parse JSON error from server response
        let displayErr = rawErr;
        try { const parsed = JSON.parse(rawErr); if (parsed.error) displayErr = parsed.error; } catch {}
        const errorMessage = `**Error:** ${displayErr}\n\n*Check the server logs for details. If the issue persists, verify the model name or API quota in Settings.*`;
        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: errorMessage, isGenerating: false, isError: true } : m));
      }
    }
    setIsGenerating(false);
    abortControllerRef.current = null;
  }, [isChatActive, isGenerating, messages, models, activeModel, settings, knowledgeDocs]);

  // Feature 16: Generate 4 variants
  const generateVariants = async (messageId: string) => {
    const msgIdx = messages.findIndex(m => m.id === messageId);
    if (msgIdx < 1) return;
    const userMsg = messages[msgIdx - 1];
    const genVariant = async (temp: number): Promise<string> => {
      try {
        const modelId = models.find(m => m.id === activeModel)?.id || 'gemini-2.5-flash';
        const res = await fetch(`${SERVER_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: buildMessages(userMsg.content), model: modelId, temperature: temp, stream: false }),
        });
        const d = await res.json();
        return d.message?.content || `Variant at temp=${temp}: ${messages.find(m => m.id === messageId)?.content || ''}`;
      } catch (err: unknown) {
        return `[Variant ${temp}] Error: ${err instanceof Error ? err.message : 'Check server status or API key'}.`;
      }
    };
    const temps = [0.3, 0.7, 1.0, 1.5];
    const results = await Promise.all(temps.map(genVariant));
    setVariants(results); setShowVariants(true);
  };

  const handleRegenerate = (messageId: string) => {
    const idx = messages.findIndex(m => m.id === messageId);
    if (idx === -1) return;
    let userIdx = idx - 1;
    while (userIdx >= 0 && messages[userIdx].type !== 'user') userIdx--;
    if (userIdx >= 0) { setMessages(prev => prev.slice(0, idx)); handleSendMessage(messages[userIdx].content); }
  };

  const handleDeleteMessage = (messageId: string) => { setMessages(prev => prev.filter(m => m.id !== messageId)); if (messages.length <= 1) setIsChatActive(false); };
  const toggleTheme = () => {
    const nextTheme = isDark ? 'light' : 'dark';
    setSettings(prev => ({ ...prev, theme: nextTheme }));
  };
  const handleImport = (importedMessages: Message[]) => { setMessages(importedMessages); if (importedMessages.length > 0) setIsChatActive(true); };

  const handlePaletteAction = (action: string) => {
    if (action === 'terminal') setShowTerminal(true);
    else if (action === 'editor') setShowEditor(true);
    else if (action === 'kb') setShowKB(true);
    else if (action === 'git') setShowGit(true);
    else if (action === 'settings') setShowSettings(true);
    else if (action === 'clear') { setMessages([]); setIsChatActive(false); }
    else if (action === 'export') setShowExportImport(true);
    else if (action === 'theme') toggleTheme();
    else if (action === 'resume') resumeSession();
  };

  if (!isAuthenticated) return <PasswordProtection onUnlock={() => setIsAuthenticated(true)} />;

  return (
    <div className="flex bg-background text-foreground overflow-hidden font-sans transition-colors relative h-dvh h-screen" style={{ height: '100dvh' }}>
      <Sidebar 
        isDark={isDark} toggleTheme={toggleTheme} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onOpenSettings={handleOpenSettingsTab}
        onOpenPalette={() => setShowPalette(true)} onOpenTerminal={() => setShowTerminal(true)}
        onOpenExportImport={() => setShowExportImport(true)}
        onNewChat={() => { setMessages([]); setIsChatActive(false); }}
        onOpenEditor={() => setShowEditor(true)} onOpenKB={() => setShowKB(true)} onOpenGit={() => setShowGit(true)}
        onOpenManageSkills={() => setShowManageSkills(true)}
      />
      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileSidebarOpen(false)} />
      )}
      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:hidden sidebar-drawer-mobile ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar 
          isMobile={true}
          isDark={isDark} toggleTheme={toggleTheme} collapsed={false} onToggleCollapse={() => setMobileSidebarOpen(false)}
          onOpenSettings={(tab) => { handleOpenSettingsTab(tab); setMobileSidebarOpen(false); }}
          onOpenPalette={() => { setShowPalette(true); setMobileSidebarOpen(false); }} onOpenTerminal={() => { setShowTerminal(true); setMobileSidebarOpen(false); }}
          onOpenExportImport={() => { setShowExportImport(true); setMobileSidebarOpen(false); }}
          onNewChat={() => { setMessages([]); setIsChatActive(false); setMobileSidebarOpen(false); }}
          onOpenEditor={() => { setShowEditor(true); setMobileSidebarOpen(false); }} onOpenKB={() => { setShowKB(true); setMobileSidebarOpen(false); }} onOpenGit={() => { setShowGit(true); setMobileSidebarOpen(false); }}
          onOpenManageSkills={() => { setShowManageSkills(true); setMobileSidebarOpen(false); }}
        />
      </div>

      <main className="flex-1 flex flex-col relative min-w-0 h-full overflow-hidden">
        <Header activeModel={models.find(m => m.id === activeModel)?.name || 'WormGPT'} contextUsage={contextUsage} isGenerating={isGenerating} onStopGeneration={handleStopGeneration} onToggleMobileSidebar={() => setMobileSidebarOpen(true)} onOpenSettings={handleOpenSettingsTab} />

        <div 
          ref={chatScrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 flex flex-col overflow-y-auto pt-20 px-4 relative chat-scroll-viewport"
        >
          <div className="chat-content-wrapper flex flex-col min-h-full">
            {!isChatActive ? (
              <div className="m-auto w-full"><HeroSection onSendMessage={handleSendMessage} /></div>
            ) : (
              <div className="space-y-6 flex-1">
                {messages.map(message => (
                  message.type === 'user' ? (
                    <UserMessage key={message.id} message={message} />
                  ) : (
                    <AIMessage key={message.id} message={message} onCopy={() => {}} onDelete={() => handleDeleteMessage(message.id)} onRegenerate={() => handleRegenerate(message.id)}
                      onOpenVariants={() => generateVariants(message.id)} isGenerating={isGenerating && message === messages[messages.length - 1]}
                      onPreview={(code) => { setPreviewCode(code); setShowPreview(true); }}
                      onOpenArtifact={(code, lang) => { setArtifactCode(code); setArtifactLang(lang); setShowArtifact(true); }}
                      onOpenMermaid={(code) => { setMermaidCode(code); setShowMermaid(true); }}
                    />
                  )
                ))}
                {isGenerating && <LoadingIndicator models={settings.multiModelConsensus ? ['Model A', 'Model B'] : ['WormGPT']} />}
                <div ref={messagesEndRef} />
              </div>
            )}
            <div style={{ height: `${inputHeight}px` }} className="flex-shrink-0" />
          </div>
        </div>

        <div ref={inputContainerRef} className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-10 input-bar-container pointer-events-none">
          <div className="input-bar-wrapper pointer-events-auto">
            <InputBar onSendMessage={handleSendMessage} onVoiceTranscript={handleSendMessage} voiceEnabled={settings.voiceEnabled} isGenerating={isGenerating} selectedSkills={selectedSkills} onToggleSkill={id => setSelectedSkills(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])} downloadedSkills={downloadedSkills} onDownloadSkill={handleDownloadSkill} />
          </div>
        </div>
      </main>

      {/* Feature Panels */}
      <TerminalPanel isOpen={showTerminal} onClose={() => setShowTerminal(false)} />
      <LivePreview code={previewCode} isOpen={showPreview} onClose={() => setShowPreview(false)} />
      <ArtifactPanel code={artifactCode} lang={artifactLang} isOpen={showArtifact} onClose={() => setShowArtifact(false)} />
      <ProjectEditor isOpen={showEditor} onClose={() => setShowEditor(false)} />
      <KnowledgeBase isOpen={showKB} onClose={() => setShowKB(false)} docs={knowledgeDocs} onDocsChange={setKnowledgeDocs} />
      <MermaidRenderer code={mermaidCode} isOpen={showMermaid} onClose={() => setShowMermaid(false)} />
      <GitPanel isOpen={showGit} onClose={() => setShowGit(false)} />
      <CommandPalette isOpen={showPalette} onClose={() => setShowPalette(false)} onAction={handlePaletteAction} />
      <VariantsPanel variants={variants} isOpen={showVariants} onClose={() => setShowVariants(false)} onSelect={v => { const lastAI = messages.filter(m => m.type === 'ai').pop(); if (lastAI) setMessages(prev => prev.map(m => m.id === lastAI.id ? { ...m, content: v } : m)); }} />
      <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} settings={settings} onSettingsChange={setSettings} models={models} onModelChange={setActiveModel} activeModel={activeModel} initialTab={settingsTab} />
      <ExportImportDialog isOpen={showExportImport} onClose={() => setShowExportImport(false)} messages={messages} onImport={handleImport} />
      <AddSkillModal isOpen={showAddSkill} onClose={() => setShowAddSkill(false)} onAdd={handleAddSkill} />
      <ManageSkillsModal isOpen={showManageSkills} onClose={() => setShowManageSkills(false)} skills={downloadedSkills} onDelete={handleDeleteSkill} onAddClick={() => setShowAddSkill(true)} />
      {showResumeBanner && <SessionResumeBanner onResume={resumeSession} onDismiss={() => setShowResumeBanner(false)} />}
    </div>
  );
}

export default App;
