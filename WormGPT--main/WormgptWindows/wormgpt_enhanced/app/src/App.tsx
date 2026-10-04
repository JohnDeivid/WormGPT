import React, { useState, useEffect, useRef, useCallback, Component } from 'react';
import './App.css';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import {
  X, Settings, Check, Lock,
  Trash2, Search, Send, Sparkles, Code, Terminal, Mic, Copy, Download, Globe,
  Volume2, VolumeX, Upload, Moon, Sun, Eye, EyeOff, CheckCircle2, XCircle, RefreshCw,
  Square, RotateCcw, Edit3, MoreVertical,
  Play, GitBranch, GitCommit, FolderOpen, FileText, Command, Clock,
  BookOpen, Columns, Plus, Save, ExternalLink, Maximize, Minimize,
  Network, Diff
} from 'lucide-react';
import ExecutionTimeline, { type ToolEvent } from './components/ExecutionTimeline';
import MapEmbed from './components/MapEmbed';

// ─── Error Boundary ───────────────────────────────────────────────────────────
class TimelineBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error?: string }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error?.message || 'Unknown error' };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ExecutionTimeline Error]', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="my-2 px-3 py-2 rounded border border-red-900/40 bg-red-950/20 text-red-400 text-xs font-mono">
          ⚠ Tool panel error: {this.state.error}
        </div>
      );
    }
    return this.props.children;
  }
}


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
  toolEvents?: ToolEvent[];
}

interface ProjectFile { name: string; path: string; content: string; lang: string; isDirty?: boolean }
interface KnowledgeDoc { id: string; name: string; content: string; chunks: string[] }
interface LLMModel {
  id: string;
  name: string;
  provider: 'gemini' | 'openrouter' | 'ollama' | 'openai' | 'anthropic';
  status: 'connected' | 'disconnected' | 'connecting';
  size?: string;
  description: string;
}

interface SettingsState {
  theme: 'dark' | 'light' | 'system' | 'wse';
  defaultModel: string; voiceEnabled: boolean; soundEnabled: boolean;
  multiModelConsensus: boolean; maxContextTokens: number; temperature: number; systemPrompt: string;
  chatBackgroundImage?: string;
  chatBackgroundBrightness?: number;
  terminalBackgroundImage?: string;
  terminalBackgroundBrightness?: number;
  apiKeys?: Record<string, string>;
  _version?: number;
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
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', status: 'connected', description: 'OpenAI Most Capable Model' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', status: 'connected', description: 'OpenAI Fast Model' },
  { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet', provider: 'anthropic', status: 'connected', description: 'Anthropic Most Intelligent Model' },
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', provider: 'gemini', status: 'connected', description: 'Fast & capable multimodal model' },
  { id: 'gemini-3.6-pro', name: 'Gemini 3.6 Pro', provider: 'gemini', status: 'connected', description: 'Most capable model' },
  { id: 'openrouter-auto', name: 'OpenRouter (Free Auto-Rotation)', provider: 'openrouter', status: 'connected', description: 'Rotación automática entre modelos gratuitos' },
  { id: 'google/gemini-3.6-flash:free', name: 'OR: Gemini 3.6 Flash (Free)', provider: 'openrouter', status: 'connected', description: 'Google Gemini 3.6 Flash gratuito' },
  { id: 'google/gemma-4-26b-a4b:free', name: 'OR: Gemma 4 26B (Free)', provider: 'openrouter', status: 'connected', description: 'Google Gemma 4 gratuito' },
  { id: 'openai/gpt-oss-20b:free', name: 'OR: GPT OSS 20B (Free)', provider: 'openrouter', status: 'connected', description: 'OpenAI OSS alternativo' },
  { id: 'nvidia/nemotron-nano-9b-v2:free', name: 'OR: Nemotron Nano 9B (Free)', provider: 'openrouter', status: 'connected', description: 'Nvidia Nemotron gratuito' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const detectLang = (code: string): string => {
  if (code.includes('import React') || code.includes('JSX') || code.includes('tsx')) return 'jsx';
  if (code.includes('def ') || code.includes('import ') && code.includes(':')) return 'python';
  if (code.includes('function') || code.includes('const ') || code.includes('let ')) return 'javascript';
  if (code.includes('<html') || code.includes('<!DOCTYPE')) return 'html';
  return 'text';
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
  <img src="./wormgpt-logo.svg" alt="WormGPT" width={size} height={size} className={`rounded-lg object-cover ${className}`} />
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

const TerminalPanel = ({ isOpen, onClose, settings }: { isOpen: boolean; onClose: () => void; settings?: SettingsState }) => {
  const [input, setInput] = useState('');
  const [histIdx, setHistIdx] = useState(-1);
  const [history, setHistory] = useState<string[]>([]);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const termRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const term = new XTerm({
      allowTransparency: true,
      theme: { background: settings?.terminalBackgroundImage ? 'rgba(0,0,0,0)' : '#08080a', foreground: '#d4d4d8', cursor: '#ef4444' },
      fontFamily: 'monospace', fontSize: 13, cursorBlink: true, convertEol: true
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    if (termRef.current) { term.open(termRef.current); fitAddon.fit(); }
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;
    term.writeln('\x1b[36;1m[Terminal Initialized]\x1b[0m');

    let active = true;
    const connect = () => {
      const socket = new WebSocket(WS_URL);
      wsRef.current = socket;
      socket.onopen = () => { if (active) term.writeln('\x1b[32m✓ Conectado al servidor backend\x1b[0m'); };
      socket.onmessage = (e) => {
        if (!active) return;
        try {
          const d = JSON.parse(e.data);
          if (d.type === 'stdout' || d.type === 'stderr') {
            const color = d.type === 'stderr' ? '\x1b[31m' : '';
            const reset = d.type === 'stderr' ? '\x1b[0m' : '';
            term.write(color + d.data + reset);
          }
          if (d.type === 'agent_cmd') { term.writeln(`\n\x1b[34;1m[WormGPT ❯]\x1b[0m \x1b[32m${d.data}\x1b[0m`); }
          if (d.type === 'exit') { setIsRunning(false); term.writeln(`\n\x1b[33m[proceso terminado con código: ${d.code}]\x1b[0m`); }
        } catch { }
      };
      socket.onerror = () => { if (active) term.writeln('\x1b[31m⚠ Conexión perdida con el servidor\x1b[0m'); };
      socket.onclose = () => { if (active) setTimeout(connect, 3000); };
    };
    connect();
    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);
    return () => {
      active = false;
      window.removeEventListener('resize', handleResize);
      if (wsRef.current) wsRef.current.close();
      term.dispose();
    };
  }, []);

  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.theme = {
        ...xtermRef.current.options.theme,
        background: settings?.terminalBackgroundImage ? 'rgba(0,0,0,0)' : '#08080a'
      };
    }
  }, [settings?.terminalBackgroundImage]);

  useEffect(() => { if (isOpen) setTimeout(() => fitAddonRef.current?.fit(), 100); }, [isOpen, isFullScreen]);

  const run = () => {
    if (!input.trim() || isRunning) return;
    const cmd = input.trim();
    setHistory(p => [cmd, ...p]);
    setHistIdx(-1);
    setInput('');
    setIsRunning(true);
    xtermRef.current?.writeln(`\x1b[32m$ ${cmd}\x1b[0m`);
    if (wsRef.current && wsRef.current.readyState === 1) wsRef.current.send(JSON.stringify({ type: 'shell', command: cmd }));
    else { setTimeout(() => { xtermRef.current?.writeln('\x1b[31mNo backend connection.\x1b[0m'); setIsRunning(false); }, 300); }
  };

  return (
    <div className={`fixed inset-0 z-[70] items-center justify-center bg-black/50 backdrop-blur-sm modal-overlay-mobile ${isOpen ? 'flex' : 'hidden'}`}>
      <div className={`bg-[#0a0a0c] border border-zinc-800/60 flex flex-col shadow-2xl overflow-hidden modal-content-mobile transition-all duration-300 ${isFullScreen ? 'w-full h-full rounded-none' : 'md:rounded-xl max-w-4xl w-full h-full md:h-[80vh]'}`}>
        <div className="flex items-center justify-between px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:pt-3 border-b border-zinc-800/60 bg-[#0d0d10]">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-zinc-700" /><div className="w-3 h-3 rounded-full bg-zinc-700" /><div className="w-3 h-3 rounded-full bg-zinc-700" /></div>
            <Terminal size={14} className="text-zinc-400" /><span className="text-sm font-semibold text-zinc-300 tracking-wide">Terminal</span>
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={() => { xtermRef.current?.clear(); xtermRef.current?.writeln('\x1b[36;1m[Terminal Cleared]\x1b[0m'); }} className="text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors border border-zinc-700/50">Clear</button>
            <button onClick={() => setIsFullScreen(!isFullScreen)} className="text-zinc-500 hover:text-zinc-300 transition-colors p-1">{isFullScreen ? <Minimize size={16} /> : <Maximize size={16} />}</button>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 ml-1"><X size={18} /></button>
          </div>
        </div>
        <div className="flex-1 w-full bg-[#08080a] p-2 overflow-hidden relative" style={settings?.terminalBackgroundImage ? { backgroundImage: `url(${settings.terminalBackgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
          {settings?.terminalBackgroundImage && <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: 'black', opacity: 1 - (settings.terminalBackgroundBrightness ?? 0.5) }} />}
           <div ref={termRef} className="w-full h-full relative z-10" />
           {isRunning && <div className="absolute bottom-2 right-4 w-3 h-3 bg-red-500 animate-pulse rounded-full z-20" title="Proceso en ejecución" />}
        </div>
        <div className="border-t border-zinc-800/60 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:pb-3 flex items-center gap-2 bg-[#050505]">
          <span className="text-zinc-400 font-bold font-mono text-sm flex-shrink-0">~/project$</span>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') run();
              if (e.key === 'ArrowUp') { const idx = Math.min(histIdx + 1, history.length - 1); setHistIdx(idx); setInput(history[idx] || ''); }
              if (e.key === 'ArrowDown') { const idx = Math.max(histIdx - 1, -1); setHistIdx(idx); setInput(idx === -1 ? '' : history[idx]); }
            }}
            placeholder="Enter shell command..."
            className="flex-1 bg-transparent text-zinc-200 font-mono text-sm outline-none placeholder-zinc-700"
            autoFocus={isOpen} />
          <button onClick={run} disabled={!input.trim() || isRunning} className="px-3 py-1.5 bg-zinc-800 text-zinc-300 border border-zinc-700 font-medium hover:bg-zinc-700 disabled:opacity-40 rounded text-xs flex items-center gap-1.5 transition-colors flex-shrink-0"><Play size={12} /> Run</button>
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
    <button onClick={() => window.open('vscode://file/.', '_blank')} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-zinc-100 rounded-lg text-xs transition-colors">
      <Code size={12} /> VS Code
    </button>
    <button onClick={() => window.open('cursor://file/.', '_blank')} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-zinc-100 rounded-lg text-xs transition-colors">
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
                <div className="flex-1 flex items-center justify-center min-h-full px-4 pt-12 pb-24">
                  <HeroSection />
                </div>
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
            <button onClick={() => git('commit', { message: commitMsg })} disabled={loading || !commitMsg.trim()} className="px-4 py-2 bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-lg text-sm flex items-center gap-1 hover:bg-zinc-700 hover:border-zinc-600 transition-colors disabled:opacity-50 flex-shrink-0"><GitCommit size={14} /> Commit</button>
          </div>
          <div className="flex gap-2">
            <input value={branchName} onChange={e => setBranchName(e.target.value)} placeholder="New branch name..." className="flex-1 px-3 py-2 bg-muted text-foreground border border-border rounded-lg text-sm focus:outline-none focus:border-red-500 transition-colors" />
            <button onClick={() => git('branch', { name: branchName })} disabled={loading || !branchName.trim()} className="px-4 py-2 bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-lg text-sm flex items-center gap-1 hover:bg-zinc-700 hover:border-zinc-600 transition-colors disabled:opacity-50 flex-shrink-0"><GitBranch size={14} /> Create</button>
          </div>
          {output && <div className="bg-black border border-[#222] rounded-lg p-3 max-h-48 overflow-y-auto"><pre className="text-xs text-zinc-300 font-mono whitespace-pre-wrap">{output}</pre></div>}
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
    { label: 'JSON', convert: () => JSON.stringify({ content, timestamp: new Date().toISOString() }, null, 2) },
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
          {isMermaid && <button onClick={() => onOpenMermaid(block.code)} className="px-2 py-1 text-xs bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 rounded flex items-center gap-1 transition-colors"><Network size={10} /> Diagram</button>}
          {isHtml && <button onClick={() => onPreview(block.code)} className="px-2 py-1 text-xs bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 rounded flex items-center gap-1 transition-colors"><Eye size={10} /> Preview</button>}
          {isHtml && <button onClick={() => onOpenArtifact(block.code, block.lang)} className="px-2 py-1 text-xs bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 rounded flex items-center gap-1 transition-colors"><Code size={10} /> Artifact</button>}
          {canRun && <button onClick={run} disabled={running} className="px-2 py-1 text-xs bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 rounded flex items-center gap-1 transition-colors disabled:opacity-40"><Play size={10} /> {running ? 'Running...' : 'Run'}</button>}
          <button onClick={copy} className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded flex items-center gap-1 transition-colors">{copied ? <Check size={10} className="text-red-400" /> : <Copy size={10} />}{copied ? 'Copied' : 'Copy'}</button>
        </div>
      </div>
      <pre className="p-4 code-block-body font-mono text-sm overflow-x-auto leading-relaxed whitespace-pre-wrap">{block.code}</pre>
      {(output || error) && (
        <div className="border-t border-[#1a1a1a] bg-black p-3">
          <p className="text-[10px] text-zinc-600 mb-1.5 uppercase tracking-widest font-mono">Output</p>
          {output && <pre className="text-xs text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed">{output}</pre>}
          {error && <pre className="text-xs text-red-400 font-mono whitespace-pre-wrap leading-relaxed">{error}</pre>}
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
              <div className="flex gap-2">{(['dark', 'wse', 'light', 'system'] as const).map(theme => (<button key={theme} onClick={() => onSettingsChange({ ...settings, theme })} className={`px-3 py-2 rounded-lg text-sm capitalize transition-colors ${settings.theme === theme ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-medium' : 'bg-muted hover:bg-neutral-200 dark:hover:bg-neutral-800 text-foreground'}`}>{theme === 'wse' ? 'OLED' : theme}</button>))}</div>
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
            <div className="flex flex-col gap-3 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div><p className="text-foreground font-medium">Chat Background</p><p className="text-sm text-neutral-500 dark:text-neutral-400">Custom background for the main chat</p></div>
                <div className="flex items-center gap-3">
                  {settings.chatBackgroundImage && <button onClick={() => onSettingsChange({ ...settings, chatBackgroundImage: undefined })} className="text-xs text-red-500 hover:underline">Remove</button>}
                  <label className="px-3 py-1.5 text-xs bg-muted hover:bg-neutral-200 dark:hover:bg-neutral-800 text-foreground border border-border rounded cursor-pointer transition-colors">
                    Upload<input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => onSettingsChange({ ...settings, chatBackgroundImage: reader.result as string });
                        reader.readAsDataURL(file);
                      }
                    }} />
                  </label>
                </div>
              </div>
              {settings.chatBackgroundImage && (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-neutral-500">Brightness</span>
                  <input type="range" min="0.1" max="1" step="0.05" value={settings.chatBackgroundBrightness ?? 0.5} onChange={e => onSettingsChange({ ...settings, chatBackgroundBrightness: parseFloat(e.target.value) })} className="flex-1 accent-red-500" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div><p className="text-foreground font-medium">Terminal Background</p><p className="text-sm text-neutral-500 dark:text-neutral-400">Custom background for the terminal</p></div>
                <div className="flex items-center gap-3">
                  {settings.terminalBackgroundImage && <button onClick={() => onSettingsChange({ ...settings, terminalBackgroundImage: undefined })} className="text-xs text-red-500 hover:underline">Remove</button>}
                  <label className="px-3 py-1.5 text-xs bg-muted hover:bg-neutral-200 dark:hover:bg-neutral-800 text-foreground border border-border rounded cursor-pointer transition-colors">
                    Upload<input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => onSettingsChange({ ...settings, terminalBackgroundImage: reader.result as string });
                        reader.readAsDataURL(file);
                      }
                    }} />
                  </label>
                </div>
              </div>
              {settings.terminalBackgroundImage && (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-neutral-500">Brightness</span>
                  <input type="range" min="0.1" max="1" step="0.05" value={settings.terminalBackgroundBrightness ?? 0.5} onChange={e => onSettingsChange({ ...settings, terminalBackgroundBrightness: parseFloat(e.target.value) })} className="flex-1 accent-red-500" />
                </div>
              )}
            </div>
          </div>}
          {tab === 'models' && <div className="space-y-6">
            {/* ── Cloud Models ── */}
            <div className="space-y-2">
              <p className="text-foreground font-medium flex items-center gap-2">
                <Globe size={14} className="text-blue-400" /> Cloud Models
              </p>
              {models.filter(m => m.provider !== 'ollama').map(model => (
                <div key={model.id} onClick={() => onModelChange(model.id)} className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border ${activeModel === model.id ? 'bg-muted border-red-500/30' : 'bg-muted/20 border-border hover:bg-muted/50'}`}>
                  <div className="flex items-center gap-3"><div className={`w-2 h-2 rounded-full ${model.status === 'connected' ? 'bg-green-500 animate-pulse' : model.status === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-neutral-400'}`} />
                    <div><p className="text-foreground text-sm font-medium">{model.name}</p><p className="text-xs text-neutral-500 dark:text-neutral-400">{model.description}</p></div>
                  </div>
                  {activeModel === model.id && <CheckCircle2 size={16} className="text-red-500" />}
                </div>
              ))}
            </div>

            {/* ── Local / Ollama Models ── */}
            <div className="space-y-2">
              <p className="text-foreground font-medium flex items-center gap-2">
                <Terminal size={14} className="text-emerald-400" /> Local Models (Ollama)
                <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-mono border ${models.some(m => m.provider === 'ollama') ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-neutral-500 border-neutral-700 bg-neutral-800/30'}`}>
                  {models.some(m => m.provider === 'ollama') ? '● Online' : '○ Offline'}
                </span>
              </p>
              {models.filter(m => m.provider === 'ollama').length === 0 ? (
                <div className="p-4 rounded-lg border border-dashed border-border text-center text-sm text-neutral-500">
                  <p className="font-mono text-xs mb-1">No local models found</p>
                  <p className="text-xs">Run: <code className="text-emerald-400 bg-black/30 px-1 rounded">ollama pull tinyllama</code></p>
                </div>
              ) : (
                models.filter(m => m.provider === 'ollama').map(model => (
                  <div key={model.id} onClick={() => onModelChange(model.id)} className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border ${activeModel === model.id ? 'bg-muted border-emerald-500/30' : 'bg-muted/20 border-border hover:bg-muted/50'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <div>
                        <p className="text-foreground text-sm font-medium font-mono">{model.name}</p>
                        <p className="text-xs text-neutral-500">{model.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {model.size && <span className="text-[10px] text-emerald-400 bg-emerald-400/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono">{model.size}</span>}
                      {activeModel === model.id && <CheckCircle2 size={16} className="text-emerald-500" />}
                    </div>
                  </div>
                ))
              )}
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
  const [openUpwards, setOpenUpwards] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleCopy = () => { navigator.clipboard.writeText(message.content); setCopied(true); onCopy(); setTimeout(() => setCopied(false), 2000); setIsOpen(false); };
  
  const toggleMenu = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setOpenUpwards(window.innerHeight - rect.bottom < 250);
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative">
      <button ref={buttonRef} onClick={toggleMenu} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 transition-colors"><MoreVertical size={14} /></button>
      {isOpen && (
        <div className={`absolute right-0 ${openUpwards ? 'bottom-full mb-1' : 'top-full mt-1'} w-44 bg-card border border-border rounded-lg shadow-xl z-[9999] animate-fadeIn overflow-hidden`}>
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
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
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
const Header = ({ activeModel, activeSubModel, contextUsage, isGenerating, onStopGeneration, onToggleMobileSidebar, onOpenSettings }: {
  activeModel: string; activeSubModel?: string; contextUsage: number; isGenerating: boolean; onStopGeneration: () => void; onToggleMobileSidebar: () => void;
  onOpenSettings?: (tab?: 'general' | 'models' | 'advanced') => void;
}) => (
  <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 md:px-6 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 md:py-3 bg-transparent pointer-events-none mobile-header">
    <div className="flex items-center gap-3 pointer-events-auto">
      {/* Mobile sidebar toggle */}
      <button onClick={onToggleMobileSidebar} className="md:hidden p-2 rounded-lg text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
      </button>
      <div className="flex flex-col gap-0.5">
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

const HeroSection = () => {
  return (
    <div className="w-full max-w-3xl flex flex-col items-center justify-center gap-6 animate-fadeInUp mt-12 mb-8">
      <WormGPTLogo size={56} className="mb-2" />
      <p className="text-[14px] text-muted-foreground leading-relaxed text-center flex items-center justify-center flex-wrap gap-1.5">
        Highlight any text and press
        <kbd className="px-1.5 py-0.5 rounded-md bg-[#252525] border border-[#333] text-zinc-300 font-sans text-[11px] shadow-sm">Option</kbd>
        <kbd className="px-1.5 py-0.5 rounded-md bg-[#252525] border border-[#333] text-zinc-300 font-sans text-[11px] shadow-sm">K</kbd>
        to chat about it
      </p>
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
      {isRecording ? <div className="flex items-center gap-0.5 px-1">{[1, 2, 3, 4].map(i => <div key={i} className="w-0.5 bg-current rounded-full animate-pulse" style={{ height: `${4 + i * 3}px`, animationDelay: `${i * 0.1}s` }} />)}</div> : <Mic size={18} />}
    </button>
  );
};

// ─── Input Bar ────────────────────────────────────────────────────────────────
export interface PendingImage {
  base64: string;
  mimeType: string;
  preview: string;
  name: string;
}

const InputBar = ({ onSendMessage, onVoiceTranscript, voiceEnabled, isGenerating, selectedSkills, onToggleSkill, downloadedSkills, onDownloadSkill, activeModelId, activeSubModel, onSelectModel, apiKeys, onSaveApiKey, isEmptyState }: {
  onSendMessage: (msg: string, isEdit?: boolean, msgId?: string, image?: PendingImage) => void;
  onVoiceTranscript: (t: string) => void; voiceEnabled: boolean; isGenerating: boolean;
  selectedSkills: string[]; onToggleSkill: (id: string) => void;
  downloadedSkills: DownloadedSkill[]; onDownloadSkill: () => void;
  activeModelId?: string; activeSubModel?: string; 
  onSelectModel?: (id: string) => void;
  apiKeys?: Record<string, string>; onSaveApiKey?: (provider: string, key: string) => void;
  isEmptyState?: boolean;
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [showModelPopup, setShowModelPopup] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [editingKeyProvider, setEditingKeyProvider] = useState<string | null>(null);
  const [tempKey, setTempKey] = useState('');
  const modelPopupRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeMode, setActiveMode] = useState<string | null>(null);

  const MODES = [
    { label: 'Búsqueda OSINT', mode: 'osint' },
    { label: 'Malware', mode: 'malware' },
    { label: 'Phishing', mode: 'phishing' },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
      if (modelPopupRef.current && !modelPopupRef.current.contains(event.target as Node)) {
        setShowModelPopup(false);
      }
    };
    if (showMenu || showModelPopup) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu, showModelPopup]);

  useEffect(() => {
    if (inputValue === '' && inputRef.current) {
      inputRef.current.style.height = '28px';
    }
  }, [inputValue]);

  const handleSend = () => { 
    if (inputValue.trim() && !isGenerating) { 
      const finalMsg = activeMode ? `[Modo: ${MODES.find(m => m.mode === activeMode)?.label}]\n${inputValue}` : inputValue;
      onSendMessage(finalMsg, false, undefined, pendingImage || undefined); 
      setInputValue(''); 
      setPendingImage(null);
      setActiveMode(null);
      setIsExpanded(false);
      if (inputRef.current) {
        inputRef.current.style.height = '28px';
      }
    } 
  };
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  const availableSkills = downloadedSkills.filter(s => !selectedSkills.includes(s.id));

  return (
    <div className="w-full flex flex-col items-center">
      <div className={`w-full input-container flex flex-col px-4 py-3 gap-2 relative rounded-2xl border border-border shadow-sm bg-[#111113] dark:bg-[#111113] transition-all duration-300 ${isExpanded ? 'expanded-input' : ''}`}>
        <div className={`flex-1 flex flex-col bg-transparent rounded-lg transition-all duration-300 ${isExpanded ? 'min-h-[380px]' : ''}`}>
          {pendingImage && (
            <div className="relative mb-3 w-28 h-28 shrink-0 animate-fadeIn">
              <img src={pendingImage.preview} alt="preview" className="w-full h-full object-cover rounded-lg shadow-md border-2 border-zinc-700/50" />
              <button onClick={() => setPendingImage(null)} className="absolute -top-2 -right-2 bg-neutral-800 dark:bg-zinc-800 text-neutral-300 hover:text-red-400 rounded-full w-6 h-6 p-0 flex items-center justify-center shadow-md border border-neutral-700 transition-colors">
                <X size={14} />
              </button>
            </div>
          )}
          {activeMode && (
            <div className="flex items-center gap-1.5 mb-2 animate-fadeIn">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-[#555] bg-[#1e1e1e] border border-[#2a2a2a]">
                {MODES.find(m => m.mode === activeMode)?.label}
                <button onClick={() => setActiveMode(null)} className="ml-0.5 text-[#444] hover:text-[#666] transition-colors leading-none">&times;</button>
              </span>
            </div>
          )}
          <textarea
            ref={inputRef} value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Send a Message..." disabled={isGenerating} rows={1}
            enterKeyHint="send"
            className={`w-full bg-transparent text-foreground placeholder-muted-foreground text-[15px] outline-none resize-none py-1 leading-normal transition-all duration-300 ${isExpanded ? 'min-h-[350px] max-h-[85vh]' : 'max-h-48'}`}
            style={{ height: isExpanded ? 'auto' : '28px' }}
            onDoubleClick={() => setIsExpanded(prev => !prev)}
            onInput={e => {
              const t = e.target as HTMLTextAreaElement;
              if (!isExpanded) {
                t.style.height = '28px';
                t.style.height = Math.min(t.scrollHeight, 200) + 'px';
              }
            }}
          />
        </div>

        <div className="flex justify-between items-center w-full">
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
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const base64Data = (reader.result as string).split(',')[1];
                        setPendingImage({
                          base64: base64Data,
                          mimeType: file.type,
                          preview: URL.createObjectURL(file),
                          name: file.name
                        });
                      };
                      reader.readAsDataURL(file);
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

          <div className="flex items-center gap-2 flex-shrink-0 relative">
            {activeModelId && (
              <div
                ref={modelPopupRef}
                className="relative flex items-center"
              >
                <div
                  onClick={() => { setShowModelPopup(!showModelPopup); setModelSearch(''); setEditingKeyProvider(null); }}
                  className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400 font-medium text-xs cursor-pointer hover:opacity-80 transition-opacity bg-muted/50 px-2 py-1 rounded-md border border-border/50 shrink-0 max-w-[180px]"
                  title="Change Model"
                >
                  <span className="truncate max-w-[110px] shrink-0">
                    {(() => {
                      const am = DEFAULT_MODELS.find(m => m.id === activeModelId);
                      if (!am) return 'WormGPT';
                      if (am.provider === 'openrouter') {
                        const cleanName = am.name.replace(/^OR:\s*/, '').replace(/\s*\(Free\)$/i, '');
                        return <><span className="text-[9px] opacity-60 font-bold mr-1">OP</span>{cleanName}</>;
                      }
                      return am.name;
                    })()}
                  </span>
                  {activeModelId === 'openrouter-auto' && activeSubModel ? (
                    <span className="text-zinc-500 font-mono text-[10px] truncate max-w-[50px] shrink-0">
                      › {activeSubModel.split('/').pop()?.replace(/:free$/, '')}
                    </span>
                  ) : null}
                  <span className="text-[9px] mt-0.5 shrink-0 ml-0.5">▾</span>
                </div>
                
                {showModelPopup && (
                  <div className="absolute bottom-full right-0 mb-2 w-80 bg-[#141416] border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-fadeIn flex flex-col">
                    <div className="p-3 border-b border-zinc-800">
                      <input 
                        type="text" placeholder="Search models..." value={modelSearch} onChange={e => setModelSearch(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-500 transition-colors placeholder-zinc-600"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-72 overflow-y-auto py-1">
                      {DEFAULT_MODELS.filter(m => m.name.toLowerCase().includes(modelSearch.toLowerCase()) || m.provider.toLowerCase().includes(modelSearch.toLowerCase())).map(m => {
                        const isStrictKeyModel = m.provider === 'openai' || m.provider === 'anthropic';
                        const hasKey = !!apiKeys?.[m.provider];
                        const isSelected = activeModelId === m.id;
                        const isExpanded = editingKeyProvider === m.id;
                        return (
                          <div key={m.id}>
                            <button 
                              onClick={() => {
                                if (isStrictKeyModel && !hasKey) {
                                  // Don't switch yet — expand API key form
                                  setEditingKeyProvider(prev => prev === m.id ? null : m.id);
                                  setTempKey('');
                                } else {
                                  if (onSelectModel) onSelectModel(m.id);
                                  setShowModelPopup(false);
                                  setEditingKeyProvider(null);
                                }
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors ${isSelected ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'}`}
                            >
                              <div className="flex items-center gap-2.5">
                                {m.provider === 'openai' && <img src="https://upload.wikimedia.org/wikipedia/commons/4/4d/OpenAI_Logo.svg" alt="OpenAI" className="w-3.5 h-3.5 brightness-0 invert opacity-70" />}
                                {m.provider === 'anthropic' && <img src="https://upload.wikimedia.org/wikipedia/commons/4/47/Anthropic_logo.svg" alt="Claude" className="w-3.5 h-3.5 brightness-0 invert opacity-70" />}
                                {m.provider === 'gemini' && <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 shrink-0" />}
                                {m.provider === 'openrouter' && <div className="w-3.5 h-3.5 rounded-full bg-zinc-600 shrink-0 flex items-center justify-center text-[8px] text-zinc-300 font-bold">OR</div>}
                                {m.provider === 'ollama' && <div className="w-3.5 h-3.5 rounded-full bg-zinc-700 shrink-0" />}
                                <span className="truncate text-left font-medium">{m.name}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                {isStrictKeyModel && !hasKey && <span className="text-[10px] text-amber-500/80 font-normal">API Key</span>}
                                {!isStrictKeyModel && !hasKey && (
                                  <button onClick={(e) => { e.stopPropagation(); setEditingKeyProvider(prev => prev === m.id ? null : m.id); setTempKey(''); }} className="text-[10px] text-zinc-500 hover:text-zinc-300 bg-zinc-800/50 hover:bg-zinc-700/50 px-1.5 py-0.5 rounded transition-colors" title="Set Custom API Key">🔑 Key</button>
                                )}
                                {hasKey && (
                                  <button onClick={(e) => { e.stopPropagation(); setEditingKeyProvider(prev => prev === m.id ? null : m.id); setTempKey(''); }} className="text-[10px] text-emerald-500/80 hover:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors" title="Edit API Key">✓ Key</button>
                                )}
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" />}
                              </div>
                            </button>
                            
                            {isExpanded && (
                              <div className="mx-3 mb-3 mt-1 p-3 bg-zinc-900 rounded-lg border border-zinc-700/50">
                                <p className="text-[11px] text-zinc-400 mb-2">Enter your {m.provider} API key to use this model</p>
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="password" placeholder="API Key..." value={tempKey} onChange={e => setTempKey(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter' && tempKey.trim()) {
                                        if (onSaveApiKey) onSaveApiKey(m.provider, tempKey.trim());
                                        if (onSelectModel) onSelectModel(m.id);
                                        setEditingKeyProvider(null);
                                        setShowModelPopup(false);
                                      }
                                    }}
                                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-zinc-500"
                                    autoFocus
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!tempKey.trim()) return;
                                      if (onSaveApiKey) onSaveApiKey(m.provider, tempKey.trim());
                                      if (onSelectModel) onSelectModel(m.id);
                                      setEditingKeyProvider(null);
                                      setShowModelPopup(false);
                                    }}
                                    className="bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap"
                                  >
                                    Save
                                  </button>
                                </div>
                                {hasKey && (
                                  <div className="flex justify-between items-center mt-2">
                                    <span className="text-[10px] text-emerald-500">✓ Key saved</span>
                                    <div className="flex items-center gap-2">
                                      <button onClick={(e) => { e.stopPropagation(); if (onSaveApiKey) onSaveApiKey(m.provider, ''); }} className="text-[10px] text-red-400 hover:text-red-300">Remove Key</button>
                                      <button onClick={(e) => { e.stopPropagation(); if (onSelectModel) onSelectModel(m.id); setEditingKeyProvider(null); setShowModelPopup(false); }} className="text-[10px] text-zinc-400 hover:text-zinc-200">Use existing</button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
            <VoiceRecorder onTranscript={onVoiceTranscript} isEnabled={voiceEnabled} />
            <button onClick={handleSend} disabled={!inputValue.trim() || isGenerating} className="text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors bg-foreground/5 hover:bg-foreground/10 rounded-full w-8 h-8 p-0 flex items-center justify-center ml-1 shrink-0"><Send size={16} /></button>
          </div>
        </div>
      </div>
      {isEmptyState && (
        <div className="flex items-center justify-center gap-2.5 mt-3 animate-fadeInUp w-full">
          {MODES.map(item => (
            <button
              key={item.mode}
              onClick={() => { setActiveMode(item.mode); inputRef.current?.focus(); }}
              className={`text-[11px] px-2.5 py-1 border transition-colors ${
                activeMode === item.mode
                  ? 'border-zinc-600 text-zinc-300 bg-zinc-800/60'
                  : 'border-zinc-700/70 text-zinc-500 bg-transparent hover:border-zinc-600 hover:text-zinc-400'
              }`}
              style={{ borderRadius: '4px', fontWeight: 400 }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── User Message ─────────────────────────────────────────────────────────────
const UserMessage = ({ message }: { message: Message }) => (
  <div className="flex flex-col items-end gap-1 mb-6 animate-fadeIn">
    {message.images && message.images.length > 0 && (
      <div className="mb-2 max-w-[85%]">
        <img 
          src={message.images[0]} 
          alt="User attachment" 
          className="rounded-2xl shadow-md border border-zinc-700/50 object-cover max-h-64"
        />
      </div>
    )}
    <div className="max-w-[85%] bg-[#1e1e1e] text-zinc-50 px-5 py-3.5 rounded-2xl rounded-tr-sm text-[15px] leading-relaxed shadow-md border border-zinc-800/80">
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
  // ─── Markdown Renderer ────────────────────────────────────────────────────
  const renderMarkdown = (content: string): React.ReactNode => {
    // ── Parse geo-map tags FIRST, before anything else ──────────────────────
    const geoTagRegex = /<geo-map([^>]*)\/?>/gi;
    let geoMatch: RegExpExecArray | null;
    let geoLastIndex = 0;
    let geoSegments: Array<{ text?: string; map?: Array<{ lat?: number; lon?: number; query?: string; label?: string; zoom?: number }> }> = [];
    let tmpContent = content;
    // Collect geo-map tags and surrounding text
    geoTagRegex.lastIndex = 0;
    while ((geoMatch = geoTagRegex.exec(tmpContent)) !== null) {
      if (geoMatch.index > geoLastIndex) {
        geoSegments.push({ text: tmpContent.slice(geoLastIndex, geoMatch.index) });
      }
      const attrs = geoMatch[1];
      const getAttr = (name: string) => { const m = attrs.match(new RegExp(`${name}=["']([^"']*)["']`)); return m ? m[1] : undefined; };
      const latStr = getAttr('lat'); const lonStr = getAttr('lon');
      const query = getAttr('query'); const label = getAttr('label'); const zoomStr = getAttr('zoom');
      geoSegments.push({ map: [{
        lat: latStr ? parseFloat(latStr) : undefined,
        lon: lonStr ? parseFloat(lonStr) : undefined,
        query, label,
        zoom: zoomStr ? parseInt(zoomStr) : 13,
      }]});
      geoLastIndex = geoMatch.index + geoMatch[0].length;
    }
    if (geoLastIndex < tmpContent.length) geoSegments.push({ text: tmpContent.slice(geoLastIndex) });

    // Group consecutive maps
    const groupedSegments: typeof geoSegments = [];
    for (const seg of geoSegments) {
      const last = groupedSegments[groupedSegments.length - 1];
      if (seg.map) {
        if (last && last.map) {
          last.map.push(...seg.map);
        } else {
          groupedSegments.push(seg);
        }
      } else if (seg.text) {
        if (seg.text.trim() === '' && last && last.map) {
          // ignore whitespace between map tags
        } else {
          groupedSegments.push(seg);
        }
      }
    }

    // If there are geo-map tags, render maps + rest
    if (groupedSegments.some(s => s.map)) {
      return groupedSegments.map((seg, idx) => {
        if (seg.map) {
          return <MapEmbed key={`map-${idx}`} points={seg.map} />;
        }
        if (seg.text && seg.text.trim()) {
          return <span key={`txt-${idx}`}>{renderMarkdownInner(seg.text)}</span>;
        }
        return null;
      });
    }
    // No geo tags — render normally
    return renderMarkdownInner(content);
  };

  const renderMarkdownInner = (content: string): React.ReactNode => {
    // Split out code blocks first to render them inline (supports unclosed blocks while streaming)
    const segments = content.split(/(```[\s\S]*?(?:```|$))/g);
    return segments.map((seg, si) => {
      if (seg.startsWith('```')) {
        const lines = seg.split('\n');
        const header = lines[0];
        const lang = header.slice(3).trim() || detectLang(seg);
        
        let codeLines = lines.slice(1);
        if (codeLines.length > 0 && /^```\s*$/.test(codeLines[codeLines.length - 1])) {
          codeLines.pop();
        }
        
        const code = codeLines.join('\n');
        const block = { id: `block-${si}`, lang, code };
        return (
          <div key={`code-${si}`} className="my-4 animate-fadeIn">
            <CodeBlockView block={block} onPreview={onPreview} onOpenArtifact={onOpenArtifact} onOpenMermaid={onOpenMermaid} />
          </div>
        );
      }

      // Process line-by-line for block elements
      const lines = seg.split('\n');
      const nodes: React.ReactNode[] = [];
      let i = 0;
      while (i < lines.length) {
        const line = lines[i];

        // Horizontal rule — suppress visual rule, use spacing instead
        if (/^---+$|^===+$|^\*\*\*+$/.test(line.trim())) {
          nodes.push(<div key={`${si}-hr-${i}`} className="mt-3" />);
          i++; continue;
        }

        // Heading ## / # / ###
        const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          const text = headingMatch[2];
          const sizeMap: Record<number, string> = { 1: 'text-[17px] font-bold mt-3 mb-1', 2: 'text-[16px] font-bold mt-2.5 mb-1', 3: 'text-[15px] font-semibold mt-2 mb-0.5', 4: 'text-sm font-semibold mt-1.5 mb-0.5', 5: 'text-sm font-medium mt-1', 6: 'text-xs font-medium mt-1' };
          nodes.push(<div key={`${si}-h-${i}`} className={sizeMap[level] || 'font-semibold'}>{renderInline(text)}</div>);
          i++; continue;
        }

        // Unordered list
        if (/^[\*\-\+]\s/.test(line)) {
          const listItems: React.ReactNode[] = [];
          while (i < lines.length && /^[\*\-\+]\s/.test(lines[i])) {
            listItems.push(<li key={i} className="flex gap-1.5 leading-[1.65]"><span className="mt-1.5 w-1 h-1 rounded-full bg-zinc-500 flex-shrink-0" /><span>{renderInline(lines[i].replace(/^[\*\-\+]\s/, ''))}</span></li>);
            i++;
          }
          nodes.push(<ul key={`${si}-ul-${i}`} className="pl-4 my-1 space-y-0">{listItems}</ul>);
          continue;
        }

        // Ordered list
        if (/^\d+\.\s/.test(line)) {
          const listItems: React.ReactNode[] = [];
          while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
            listItems.push(<li key={i} className="ml-4 leading-[1.65]">{renderInline(lines[i].replace(/^\d+\.\s/, ''))}</li>);
            i++;
          }
          nodes.push(<ol key={`${si}-ol-${i}`} className="list-decimal pl-5 my-1 space-y-0">{listItems}</ol>);
          continue;
        }

        // Empty line → add top margin to next element (no <br> for cleaner look)
        if (!line.trim()) {
          nodes.push(<div key={`${si}-sp-${i}`} className="mt-2" />);
          i++; continue;
        }

        // Table
        if (line.trim().startsWith('|')) {
          const tableRows: React.ReactNode[] = [];
          let isHeader = true;
          while (i < lines.length && lines[i].trim().startsWith('|')) {
            const rowLine = lines[i].trim();
            // Separator line (e.g., |---|---|)
            if (/^\|[\s\-:|]+\|$/.test(rowLine) && rowLine.includes('-')) {
              isHeader = false;
              i++;
              continue;
            }
            const cells = rowLine.split('|').filter((_, index, array) => index !== 0 && index !== array.length - 1);
            const CellTag = isHeader ? 'th' : 'td';
            const cellClass = isHeader 
              ? 'px-4 py-2 border-b border-zinc-800 bg-zinc-900/50 font-semibold text-zinc-200' 
              : 'px-4 py-2 border-b border-zinc-800/50 text-zinc-300';
            
            tableRows.push(
              <tr key={i} className="transition-colors hover:bg-zinc-800/20">
                {cells.map((cell, idx) => (
                  <CellTag key={idx} className={cellClass}>{renderInline(cell.trim())}</CellTag>
                ))}
              </tr>
            );
            i++;
          }
          nodes.push(
            <div key={`${si}-table-${i}`} className="my-4 w-full overflow-x-auto rounded-xl border border-zinc-800">
              <table className="w-full text-sm text-left border-collapse">
                <tbody>
                  {tableRows}
                </tbody>
              </table>
            </div>
          );
          continue;
        }

        // Regular paragraph line
        nodes.push(<div key={`${si}-p-${i}`} className="leading-[1.7] text-[15px] text-zinc-300">{renderInline(line)}</div>);
        i++;
      }
      return <span key={si}>{nodes}</span>;
    });
  };

  // Inline markdown: **bold**, *italic*, `code`, [link](url)
  const renderInline = (text: string): React.ReactNode => {
    const pattern = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g;
    const parts: React.ReactNode[] = [];
    let last = 0;
    let match;
    let idx = 0;
    while ((match = pattern.exec(text)) !== null) {
      if (match.index > last) parts.push(text.slice(last, match.index));
      const token = match[0];
      if (token.startsWith('**') || token.startsWith('__')) {
        parts.push(<strong key={idx++} className="font-semibold text-foreground">{token.slice(2, -2)}</strong>);
      } else if (token.startsWith('*') || token.startsWith('_')) {
        parts.push(<em key={idx++} className="italic">{token.slice(1, -1)}</em>);
      } else if (token.startsWith('`')) {
        parts.push(<code key={idx++} className="px-1 py-px bg-zinc-800 text-red-400 rounded text-[13px] font-mono">{token.slice(1, -1)}</code>);
      } else if (token.startsWith('[')) {
        const linkText = token.match(/\[([^\]]+)\]/)?.[1] || '';
        const href = token.match(/\(([^)]+)\)/)?.[1] || '#';
        parts.push(<a key={idx++} href={href} target="_blank" rel="noopener noreferrer" className="text-red-400 underline hover:text-red-300 transition-colors">{linkText}</a>);
      }
      last = match.index + token.length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts.length > 0 ? parts : text;
  };
  return (
    <div className="flex items-start gap-4 mb-8 animate-fadeIn w-full group">
      <div className="flex flex-col w-full min-w-0">
        {/* Tool events shown ABOVE main text (they're the process steps) */}
        {message.toolEvents && message.toolEvents.length > 0 && (
          <TimelineBoundary>
            <ExecutionTimeline events={message.toolEvents} isGenerating={isGenerating && !message.content} />
          </TimelineBoundary>
        )}

        {/* Main response text */}
        {(message.content || isGenerating) && (
          <div className="text-[15px] leading-relaxed text-foreground break-words">
            {renderMarkdown(message.content)}
            {isGenerating && !message.content && <span className="typing-cursor ml-1 inline-block" />}
            {isGenerating && message.content && <span className="typing-cursor ml-0.5 inline-block" />}
          </div>
        )}

        {/* Actions row — only when done */}
        {!isGenerating && (
          <div className="flex items-center justify-between mt-2">
            <button onClick={speak} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all ${isSpeaking ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
              {isSpeaking ? <Volume2 size={12} /> : <VolumeX size={12} />}{isSpeaking ? 'Speaking...' : 'Read aloud'}
            </button>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={onOpenVariants} className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"><Columns size={12} /> Variants</button>
              <MessageActions message={message} onCopy={onCopy} onEdit={() => { }} onDelete={onDelete} onRegenerate={onRegenerate} isGenerating={isGenerating} />
            </div>
          </div>
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

  // Terminal is now encapsulated in TerminalPanel component
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

  const [settings, setSettings] = useState<SettingsState>(() => {
    const saved = localStorage.getItem('wormgpt_settings');
    const CURRENT_VERSION = 2;
    const defaults: SettingsState = {
      theme: 'dark', defaultModel: 'gemini-3.6-flash', voiceEnabled: true, soundEnabled: true,
      multiModelConsensus: false, maxContextTokens: 4096, temperature: 0.7, systemPrompt: '',
      chatBackgroundBrightness: 0.5,
      terminalBackgroundBrightness: 0.5,
      _version: CURRENT_VERSION
    };
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // If the saved version doesn't match, discard stale fields and use defaults
        if (parsed._version !== CURRENT_VERSION) {
          // Preserve safe user preferences across versions
          const { theme, systemPrompt, apiKeys, chatBackgroundImage, chatBackgroundBrightness, terminalBackgroundImage, terminalBackgroundBrightness } = parsed;
          return { ...defaults, ...(theme && { theme }), ...(systemPrompt && { systemPrompt }), ...(apiKeys && { apiKeys }), ...(chatBackgroundImage && { chatBackgroundImage }), ...(chatBackgroundBrightness !== undefined && { chatBackgroundBrightness }), ...(terminalBackgroundImage && { terminalBackgroundImage }), ...(terminalBackgroundBrightness !== undefined && { terminalBackgroundBrightness }) };
        }
        // Remove legacy fields that may cause issues
        delete parsed.backgroundImage;
        delete parsed.backgroundBrightness;
        return { ...defaults, ...parsed };
      } catch {}
    }
    return defaults;
  });

  useEffect(() => {
    localStorage.setItem('wormgpt_settings', JSON.stringify(settings));
  }, [settings]);
  const [models, setModels] = useState<LLMModel[]>(DEFAULT_MODELS);
  const [ollamaAvailable, setOllamaAvailable] = useState(false);
  const [activeModel, setActiveModel] = useState('gemini-3.6-flash');
  const [activeSubModel, setActiveSubModel] = useState<string | undefined>(undefined);

  // Fetch Ollama models on mount
  useEffect(() => {
    fetch(`${SERVER_URL}/api/ollama/models`)
      .then(r => r.json())
      .then(data => {
        setOllamaAvailable(data.available);
        if (data.available && data.models?.length > 0) {
          const ollamaModels: LLMModel[] = data.models.map((m: { id: string; name: string; size?: string }) => ({
            id: m.id,
            name: m.name,
            provider: 'ollama' as const,
            status: 'connected' as const,
            size: m.size,
            description: `Local model${m.size ? ` · ${m.size}` : ''}`,
          }));
          setModels(prev => [...prev.filter(m => m.provider !== 'ollama'), ...ollamaModels]);
        }
      })
      .catch(() => setOllamaAvailable(false));
  }, []);
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
      } catch { }
    }
  }, []);

  const resumeSession = () => {
    const saved = localStorage.getItem('wormgpt_session');
    if (saved) {
      try {
        const { messages: savedMsgs } = JSON.parse(saved);
        if (savedMsgs?.length > 0) { setMessages(savedMsgs); setIsChatActive(true); }
      } catch { }
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
      try { setDownloadedSkills(JSON.parse(savedSkills)); } catch { }
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
      setIsDark(settings.theme === 'dark' || settings.theme === 'wse');
    }
  }, [settings.theme]);

  // Synchronize HTML element classes with isDark theme state
  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light', 'wse');
    if (settings.theme === 'wse') {
      document.documentElement.classList.add('wse');
    } else if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.add('light');
    }
  }, [isDark, settings.theme]);

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
      // New message added — always scroll to bottom
      chatScrollContainerRef.current.scrollTo({
        top: chatScrollContainerRef.current.scrollHeight,
        behavior: 'instant' as ScrollBehavior
      });
      isNearBottomRef.current = true;
    } else if (isGenerating && isNearBottomRef.current) {
      // Streaming update — only scroll if user is already near bottom
      chatScrollContainerRef.current.scrollTop = chatScrollContainerRef.current.scrollHeight;
    }
    // If user has scrolled up to read, do nothing during streaming
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
  const buildMessages = (userContent: string, userImage?: PendingImage) => {
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
      memoryRef.current ? 'Conversation summary:\n' + memoryRef.current : '',
      knowledgeDocs.length > 0
        ? 'Knowledge base context:\n' + knowledgeDocs.flatMap(d => d.chunks.slice(0, 2)).join('\n').slice(0, 2000)
        : '',
    ].filter(Boolean).join('\n\n');

    const systemMsg = extraSystem
      ? [{ role: 'system', content: extraSystem }]
      : [];

    const recentMsgs = messages.slice(-20).map((m, index, arr) => {
      // Token saving: truncate long old messages, keep full for last few
      let content = m.content;
      if (index < arr.length - 4 && content.length > 1000) {
        content = content.slice(0, 500) + '\n...[Truncated for context size]';
      }
      return {
        role: m.type === 'user' ? 'user' : 'assistant',
        content: content,
        // Strip images from history (token savings)
        images: undefined
      };
    });

    const userMsgFormatted: any = { role: 'user', content: userContent };
    
    // Only pass the new image along with the current request
    if (userImage) {
      userMsgFormatted.images = [
        {
          mimeType: userImage.mimeType,
          data: userImage.base64,
          name: userImage.name
        }
      ];
    }

    return [...systemMsg, ...recentMsgs, userMsgFormatted];
  };

  const summarizeIfNeeded = async () => {
    if (messages.length > 0 && messages.length % 15 === 0) {
      try {
        const res = await fetch(`${SERVER_URL}/api/chat`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [{ role: 'user', content: `Summarize this conversation briefly (2-3 sentences): ${messages.map(m => `${m.type}: ${m.content.slice(0, 100)}`).join('\n')}` }], model: 'gemini-3.6-flash', stream: false })
        });
        const data = await res.json();
        if (data.message?.content) memoryRef.current = data.message.content;
      } catch { }
    }
  };

  const handleSendMessage = useCallback(async (content: string, isEdit = false, messageId?: string, userImage?: PendingImage) => {
    if (isGenerating) return;
    setActiveSubModel(undefined);
    if (!isChatActive) setIsChatActive(true);
    if (isEdit && messageId) {
      const idx = messages.findIndex(m => m.id === messageId);
      if (idx !== -1) setMessages(prev => prev.slice(0, idx + 1).map(m => m.id === messageId ? { ...m, content } : m));
    } else {
      const userMsg: Message = { 
        id: Date.now().toString(), 
        type: 'user', 
        content, 
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        images: userImage ? [userImage.preview] : undefined // store object URL for UI render
      };
      setMessages(prev => [...prev, userMsg]);
    }
    setIsGenerating(true);
    abortControllerRef.current = new AbortController();
    await summarizeIfNeeded();
    const aiMsgId = (Date.now() + 1).toString();
    const aiMsg: Message = { id: aiMsgId, type: 'ai', content: '', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), isGenerating: true, models: [models.find(m => m.id === activeModel)?.name || 'WormGPT'] };
    setMessages(prev => [...prev, aiMsg]);
    try {
      const selectedModel = models.find(m => m.id === activeModel);
      const res = await fetch(`${SERVER_URL}/api/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: buildMessages(content, userImage), model: selectedModel?.id || 'gemini-3.6-flash', provider: selectedModel?.provider || 'gemini', temperature: settings.temperature, stream: true, apiKey: settings.apiKeys?.[selectedModel?.provider || 'gemini'] || undefined }),
        signal: abortControllerRef.current.signal
      });
      if (!res.ok) throw new Error(await res.text());
      const reader = res.body!.getReader(); const decoder = new TextDecoder();
      let fullContent = '';
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line.startsWith('data: ')) continue;
          if (line === 'data: [DONE]') break;
          try {
            const json = JSON.parse(line.slice(6));
            if (json.activeModel) {
              setActiveSubModel(json.activeModel);
              continue;
            }
            if (json.toolEvent) {
              setMessages(prev => prev.map(m => {
                if (m.id !== aiMsgId) return m;
                const existingEvents = m.toolEvents || [];
                const eventIdx = existingEvents.findIndex(e => e.id === json.toolEvent.id);
                let newEvents = [...existingEvents];
                if (eventIdx >= 0) newEvents[eventIdx] = { ...newEvents[eventIdx], ...json.toolEvent };
                else newEvents.push(json.toolEvent);
                return { ...m, toolEvents: newEvents };
              }));
              continue;
            }
            const delta = json.message?.content || json.response || '';
            if (delta) { fullContent += delta; setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: fullContent } : m)); }
            if (json.done) break;
          } catch (e) {
            console.error('Error parsing SSE JSON:', e, line);
          }
        }
      }
      setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, isGenerating: false } : m));
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') { setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: m.content || '[Generation stopped]', isGenerating: false } : m)); }
      else {
        const rawErr = err instanceof Error ? err.message : String(err);
        // Try to parse JSON error from server response
        let displayErr = rawErr;
        try { const parsed = JSON.parse(rawErr); if (parsed.error) displayErr = parsed.error; } catch { }
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
        const modelId = models.find(m => m.id === activeModel)?.id || 'gemini-3.6-flash';
        const modelProvider = models.find(m => m.id === activeModel)?.provider || 'gemini';
        const res = await fetch(`${SERVER_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: buildMessages(userMsg.content), model: modelId, provider: modelProvider, temperature: temp, stream: false }),
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
    const nextTheme = settings.theme === 'dark' ? 'wse' : settings.theme === 'wse' ? 'light' : 'dark';
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
        {settings.chatBackgroundImage && (
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `url(${settings.chatBackgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
            <div className="absolute inset-0" style={{ backgroundColor: 'black', opacity: 1 - (settings.chatBackgroundBrightness ?? 0.5) }} />
          </div>
        )}
        <Header activeModel={models.find(m => m.id === activeModel)?.name || 'WormGPT'} activeSubModel={activeSubModel} contextUsage={contextUsage} isGenerating={isGenerating} onStopGeneration={handleStopGeneration} onToggleMobileSidebar={() => setMobileSidebarOpen(true)} onOpenSettings={handleOpenSettingsTab} />

        <div
          ref={chatScrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 flex flex-col overflow-y-auto pt-20 px-4 relative chat-scroll-viewport"
        >
          <div className="chat-content-wrapper flex flex-col min-h-full">
            {!isChatActive ? (
              <div className="m-auto w-full pb-20"><HeroSection /></div>
            ) : (
              <div className="space-y-6 flex-1">
                {messages.map(message => (
                  message.type === 'user' ? (
                    <UserMessage key={message.id} message={message} />
                  ) : (
                    <AIMessage key={message.id} message={message} onCopy={() => { }} onDelete={() => handleDeleteMessage(message.id)} onRegenerate={() => handleRegenerate(message.id)}
                      onOpenVariants={() => generateVariants(message.id)} isGenerating={isGenerating && message === messages[messages.length - 1]}
                      onPreview={(code) => { setPreviewCode(code); setShowPreview(true); }}
                      onOpenArtifact={(code, lang) => { setArtifactCode(code); setArtifactLang(lang); setShowArtifact(true); }}
                      onOpenMermaid={(code) => { setMermaidCode(code); setShowMermaid(true); }}
                    />
                  )
                ))}
                {/* Only show the pulsing loader if the very last AI message has no content yet (no streaming has started) */}
                {isGenerating && (() => {
                  const lastMsg = messages[messages.length - 1];
                  return lastMsg?.type === 'ai' && !lastMsg.content && !(lastMsg.toolEvents?.length)
                    ? <LoadingIndicator models={settings.multiModelConsensus ? ['Model A', 'Model B'] : ['WormGPT']} />
                    : null;
                })()}
                <div ref={messagesEndRef} />
              </div>
            )}
            <div style={{ height: `${inputHeight + 40}px` }} className="flex-shrink-0" />
          </div>
        </div>

        <div ref={inputContainerRef} className={`absolute left-0 right-0 px-4 input-bar-container pointer-events-none transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${!isChatActive ? 'bottom-[8vh]' : 'bottom-[22px]'}`}>
          <div className="input-bar-wrapper pointer-events-auto max-w-3xl mx-auto w-full">
            <InputBar 
              isEmptyState={!isChatActive}
              onSendMessage={handleSendMessage} onVoiceTranscript={handleSendMessage} voiceEnabled={settings.voiceEnabled} isGenerating={isGenerating} 
              selectedSkills={selectedSkills} onToggleSkill={id => setSelectedSkills(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])} downloadedSkills={downloadedSkills} onDownloadSkill={handleDownloadSkill}
              activeModelId={activeModel}
              activeSubModel={activeSubModel}
              onSelectModel={setActiveModel}
              apiKeys={settings.apiKeys}
              onSaveApiKey={(provider, key) => setSettings(prev => {
                if (!key) {
                  // Empty key = remove it
                  const newKeys = { ...prev.apiKeys };
                  delete newKeys[provider];
                  return { ...prev, apiKeys: newKeys };
                }
                return { ...prev, apiKeys: { ...prev.apiKeys, [provider]: key } };
              })}
            />
          </div>
        </div>
        {/* Fixed footer disclaimer */}
        <div className="absolute bottom-0 left-0 right-0 h-[20px] flex items-center justify-center pointer-events-none">
          <span className="text-[10px] text-zinc-500 font-medium">LLMs can make mistakes. Verify important information.</span>
        </div>
      </main>

      {/* Feature 1 & 13: Full Screen Terminal */}
      <TerminalPanel isOpen={showTerminal} onClose={() => setShowTerminal(false)} settings={settings} />
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
