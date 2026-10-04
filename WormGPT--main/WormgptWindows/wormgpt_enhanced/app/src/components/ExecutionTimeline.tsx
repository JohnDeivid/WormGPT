import { useState, useEffect, useRef } from 'react';
import { ChevronRight, Terminal, Globe, Check, AlertCircle, Clock, Copy, Loader2, FilePen } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────
export type ToolEventType = 'thinking' | 'command' | 'search' | 'file' | 'info';
export type ToolEventStatus = 'running' | 'success' | 'error' | 'done';

export interface ToolEvent {
  id: string;
  type: ToolEventType;
  status: ToolEventStatus;
  text: string;
  subtext?: string;
  output?: string;
  exitCode?: number;
  timestamp?: number;
}

interface Props {
  events: ToolEvent[];
  isGenerating?: boolean;
}

// ─── Typewriter ────────────────────────────────────────────────────────────────
function TypewriterText({ text, speed = 'normal' }: { text: string; speed?: 'fast' | 'normal' }) {
  const [displayed, setDisplayed] = useState('');
  const idx = useRef(0);

  useEffect(() => {
    if (!text) { setDisplayed(''); idx.current = 0; return; }
    if (idx.current > text.length) idx.current = 0;

    const tickMs = speed === 'fast' ? 8 : 18;
    const interval = setInterval(() => {
      if (idx.current >= text.length) { clearInterval(interval); return; }
      const remaining = text.length - idx.current;
      const chunk = speed === 'fast' ? Math.max(3, Math.floor(remaining / 5)) : Math.max(1, Math.floor(remaining / 12));
      idx.current = Math.min(idx.current + chunk, text.length);
      setDisplayed(text.substring(0, idx.current));
    }, tickMs);

    return () => clearInterval(interval);
  }, [text, speed]);

  return <>{displayed}</>;
}

// ─── Elapsed Time Badge ────────────────────────────────────────────────────────
function ElapsedBadge({ startTime, isRunning }: { startTime?: number; isRunning: boolean }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) return;
    if (!isRunning) {
      setElapsed(Math.round((Date.now() - startTime) / 1000));
      return;
    }
    const interval = setInterval(() => {
      setElapsed(Math.round((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, isRunning]);

  if (!startTime || elapsed === 0) return null;

  const formatTime = (s: number) => {
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-zinc-500 bg-zinc-800/50 px-1.5 py-0.5 rounded ml-2 tabular-nums">
      <Clock size={9} className="opacity-60" />
      {formatTime(elapsed)}
    </span>
  );
}

// ─── Status Dot ────────────────────────────────────────────────────────────────
// ─── Language Icon ──────────────────────────────────────────────────────────
const LANG_ICONS: Record<string, string> = {
  py:   'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg',
  js:   'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg',
  ts:   'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg',
  tsx:  'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg',
  jsx:  'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg',
  html: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg',
  css:  'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg',
  json: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/json/json-original.svg',
  md:   'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/markdown/markdown-original.svg',
  sh:   'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/bash/bash-original.svg',
  bash: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/bash/bash-original.svg',
  rs:   'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/rust/rust-original.svg',
  go:   'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original-wordmark.svg',
  java: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg',
  kt:   'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kotlin/kotlin-original.svg',
  rb:   'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ruby/ruby-original.svg',
  php:  'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/php/php-original.svg',
  cs:   'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/csharp/csharp-original.svg',
  cpp:  'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg',
  c:    'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/c/c-original.svg',
  yml:  'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/yaml/yaml-original.svg',
  yaml: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/yaml/yaml-original.svg',
  sql:  'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg',
  xml:  'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/xml/xml-original.svg',
  vue:  'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vuejs/vuejs-original.svg',
  svelte: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/svelte/svelte-original.svg',
  dart: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/dart/dart-original.svg',
  swift: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/swift/swift-original.svg',
  dockerfile: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg',
};

function getLangIcon(filename: string): string | null {
  const lower = filename.toLowerCase();
  if (lower === 'dockerfile') return LANG_ICONS['dockerfile'];
  const ext = lower.split('.').pop() || '';
  return LANG_ICONS[ext] || null;
}

function StatusDot({ status, type, filename }: { status: ToolEventStatus; type: ToolEventType; filename?: string }) {
  if (status === 'running') {
    return (
      <div className="relative w-[18px] h-[18px] flex items-center justify-center">
        <Loader2 size={14} className="animate-spin text-red-500" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="w-[18px] h-[18px] flex items-center justify-center">
        <AlertCircle size={13} className="text-red-400" />
      </div>
    );
  }

  // The file event will use the default FilePen icon below

  const iconMap: Record<ToolEventType, React.ReactNode> = {
    thinking: <img src="./wormgpt-logo.svg" alt="WormGPT" width={14} height={14} className="rounded-sm object-cover" />,
    command:  <Terminal size={12} className="text-zinc-300" />,
    file:     <FilePen size={11} className="text-zinc-300" />,
    search:   <Globe size={12} className="text-zinc-300" />,
    info:     <Check size={12} className="text-zinc-400" />,
  };

  return (
    <div className={`w-[18px] h-[18px] flex items-center justify-center rounded-full ${
      type === 'command' ? '' : 'bg-zinc-800/80 border border-zinc-700/50'
    }`}>
      {iconMap[type] || <Check size={12} className="text-zinc-500" />}
    </div>
  );
}

function getEventLabel(type: ToolEventType, subtext?: string) {
  if (type === 'file') {
    if (subtext?.toLowerCase().includes('escribiendo') || subtext?.toLowerCase().includes('guardado')) {
      return 'Edited';
    }
    return 'Read';
  }
  switch (type) {
    case 'thinking': return 'Thinking';
    case 'command':  return 'Terminal';
    case 'search':   return 'Web Search';
    case 'info':     return 'System Info';
    default:         return 'Action';
  }
}

// ─── Terminal Spinner ────────────────────────────────────────────────────────
function TerminalSpinner() {
  const [frame, setFrame] = useState(0);
  const frames = ['\u280b', '\u2819', '\u2839', '\u2838', '\u283c', '\u2834', '\u2826', '\u2827', '\u2807', '\u280f'];
  useEffect(() => {
    const timer = setInterval(() => setFrame(f => (f + 1) % frames.length), 80);
    return () => clearInterval(timer);
  }, []);
  return <span className="font-mono text-red-500 text-[16px] leading-none">{frames[frame]}</span>;
}

// ─── EventRow — Claude Code style ──────────────────────────────────────────────
function EventRow({ event }: { event: ToolEvent }) {
  const isRunning = event.status === 'running';
  const isError = event.status === 'error';
  const isSuccess = event.status === 'success' || event.status === 'done';
  const isOsint = /exiftool|exifread|nmap|mosint|maigret|theharvester|sherlock/i.test(event.text || '');
  const [collapsed, setCollapsed] = useState(isSuccess && !isError && !isOsint);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isSuccess && !isError && !isOsint) {
      setCollapsed(true);
    }
  }, [isSuccess, isError, isOsint]);

  const label = getEventLabel(event.type, event.subtext);
  const isFileEdit = event.type === 'file' && label === 'Edited';
  const fileLines = isFileEdit && event.output ? event.output.split('\n').length : 0;

  return (
    <div className={`relative flex gap-2.5 text-[13px] ${event.type !== 'thinking' ? 'ml-7' : ''}`} style={{ fontFamily: "'Inter', 'SF Pro Text', system-ui, sans-serif" }}>
      {/* Removed vertical connector line as per user request */}

      {/* Left column: status dot (hidden for file events per user request) */}
      {event.type !== 'file' && (
        <div className="relative flex flex-col items-center pt-[3px] z-10 shrink-0">
          <StatusDot status={event.status} type={event.type} filename={event.text} />
        </div>
      )}

      {/* Right column: content */}
      <div className="flex-1 min-w-0 pb-3">
        {/* Header line: label + main text + elapsed badge */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`font-semibold tracking-wider capitalize ${
            event.type === 'file' ? 'text-[12px] text-zinc-400' : 'text-[12px] text-zinc-500'
          } ${
            isRunning ? '!text-red-500' :
            isError ? '!text-red-400' : ''
          }`}>
            {label}
          </span>

          {/* Language icon inline with filename for file events */}
          {event.type === 'file' && (() => {
            const iconUrl = getLangIcon(event.text || '');
            return iconUrl ? (
              <img src={iconUrl} alt="" width={13} height={13} className="object-contain shrink-0" />
            ) : null;
          })()}

          <span className={`font-medium leading-snug break-words ${
            isError ? 'text-red-300' :
            isRunning ? 'text-zinc-200' :
            'text-zinc-300'
          } ${event.type === 'thinking' ? 'text-[15px]' : ''}`}>
            <TypewriterText text={event.text} />
          </span>

          {isFileEdit && isSuccess && fileLines > 0 && (
            <span className="text-emerald-500 font-mono text-[10px] ml-0.5">+{fileLines}</span>
          )}

          {event.type === 'file' && event.output && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="ml-1 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer outline-none"
            >
              <ChevronRight size={13} className={`transition-transform duration-150 ${!collapsed ? 'rotate-90' : ''}`} />
            </button>
          )}

          <ElapsedBadge startTime={event.timestamp} isRunning={isRunning} />
        </div>

        {/* Subtext: hide for file events (no path noise) */}
        {event.subtext && event.type !== 'file' && (
          <div className="mt-1 text-[11px] font-mono text-zinc-500 leading-snug break-all">
            <TypewriterText text={event.subtext} speed="fast" />
          </div>
        )}

        {/* Expandable output block */}
        {event.output && (
          <div className="mt-2">
            {event.type !== 'file' && (
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCollapsed(!collapsed)}
                  className={`inline-flex items-center gap-1 text-[11px] font-medium transition-colors select-none px-0 ${
                    isError ? 'text-red-400/70 hover:text-red-300' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <ChevronRight size={11} className={`transition-transform duration-150 ${!collapsed ? 'rotate-90' : ''}`} />
                  {collapsed ? 'Show output' : 'Hide output'}
                  {isSuccess && event.exitCode !== undefined && (
                    <span className={`ml-1.5 px-1 py-px rounded text-[10px] font-mono ${
                      event.exitCode === 0
                        ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/40'
                        : 'bg-red-900/30 text-red-400 border border-red-800/40'
                    }`}>
                      exit {event.exitCode}
                    </span>
                  )}
                </button>
              </div>
            )}

            {!collapsed && (
              <div className={`group/copybox relative mt-1.5 rounded-none overflow-hidden border ${
                isError
                  ? 'border-red-800/40 bg-red-950/30'
                  : 'border-[#222] bg-black'
              }`}>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(event.output || '');
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 bg-[#111] text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors rounded opacity-0 group-hover/copybox:opacity-100 border border-black z-20"
                  title="Copy to clipboard"
                >
                  {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />} {copied ? 'Copied!' : 'Copy'}
                </button>
                <pre className={`p-3 font-mono text-[11px] leading-[1.6] whitespace-pre-wrap break-all overflow-x-auto max-h-[300px] overflow-y-auto relative z-10 ${
                  isError ? 'text-red-400' : 'text-zinc-300'
                }`}>
                  <TypewriterText text={event.output} speed="fast" />
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ExecutionTimeline({ events, isGenerating }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [events.length]);

  if (events.length === 0) return null;

  return (
    <div className="my-3 py-3 pl-1">
      <div className="flex flex-col">
        {events.map((event) => (
          <EventRow
            key={event.id}
            event={event}
          />
        ))}
        {isGenerating && (
          <div className="relative flex gap-2.5 text-[13px]">
            <div className="relative flex flex-col items-center pt-[2px] z-10 shrink-0">
              <div className="w-[14px] h-[14px] flex items-center justify-center">
                <TerminalSpinner />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="text-zinc-400 text-[13px] animate-pulse">
                Processing…
              </span>
            </div>
          </div>
        )}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
