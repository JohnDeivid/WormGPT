import { useEffect, useRef, useState } from 'react';

interface MonitorSeguridadProps {
  command: string;
  status: 'pending_approval' | 'running' | 'success' | 'error';
  output?: string;
  exitCode?: number;
  lastLine?: string;
}

export default function MonitorSeguridad({ command, status, output, exitCode, lastLine }: MonitorSeguridadProps) {
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [elapsed, setElapsed] = useState(0);

  // Auto-scroll logs to keep up with terminal output
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [status, elapsed, output, lastLine]);

  // Real-time stopwatch during active execution phases
  useEffect(() => {
    let interval: any;
    const start = Date.now();
    setElapsed(0); 

    if (status === 'pending_approval' || status === 'running') {
      interval = setInterval(() => {
        setElapsed((Date.now() - start) / 1000);
      }, 100);
    }

    return () => clearInterval(interval);
  }, [status]);

  // Dynamic error keyword scanner on the live-streamed terminal output
  const lowerLine = (lastLine || '').toLowerCase();
  const isErrorLine = 
    lowerLine.includes('error') || 
    lowerLine.includes('failed') || 
    lowerLine.includes('exception') || 
    lowerLine.includes('fatal') || 
    lowerLine.includes('cannot') ||
    lowerLine.includes('no se encuentra') ||
    lowerLine.includes('invalid') ||
    lowerLine.includes('err:');

  return (
    <div className="w-full my-3 font-sans bg-transparent">
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .pulse-text { animation: pulseText 1.2s infinite; }
        @keyframes pulseText { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        .terminal-blink { animation: termBlink 1s infinite; }
        @keyframes termBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .fade-in-up { animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div 
        ref={logContainerRef}
        className="flex flex-col gap-3 text-[14px] text-[#cccccc] tracking-wide max-w-full"
      >
        {/* ========================================================================= */}
        {/* PHASE 1: PENDING APPROVAL */}
        {/* ========================================================================= */}
        {status === 'pending_approval' && (
          <div className="flex flex-col gap-2.5 p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 fade-in-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-yellow-400 font-semibold text-sm">
                <span className="pulse-text">⏳</span>
                <span>Esperando aprobación para ejecutar...</span>
              </div>
              <span className="font-mono text-[11px] text-yellow-500/60 bg-yellow-500/10 px-2 py-0.5 rounded-full">
                {elapsed.toFixed(1)}s
              </span>
            </div>
            
            <div className="font-mono text-xs bg-black/60 border border-white/5 rounded-lg p-3 text-yellow-200/90 overflow-x-auto no-scrollbar">
              <span className="text-yellow-500/60 mr-1.5 select-none">$</span>
              <code>{command}</code>
            </div>
            <p className="text-[11px] text-neutral-400 italic">
              * Haz clic en "Submit" en la ventana de confirmación para iniciar el comando de forma segura.
            </p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PHASE 2: RUNNING (ACTIVE EXECUTION WITH LIVE TAIL) */}
        {/* ========================================================================= */}
        {status === 'running' && (
          <div className="flex flex-col gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5 fade-in-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
                <span className="pulse-text text-red-500">⟳</span>
                <span>Ejecutando comando en terminal local...</span>
              </div>
              <span className="font-mono text-[11px] text-red-500/60 bg-red-500/10 px-2 py-0.5 rounded-full">
                {elapsed.toFixed(1)}s
              </span>
            </div>

            {/* Static command block */}
            <div className="font-mono text-xs bg-black/65 border border-white/5 rounded-lg p-3 text-neutral-400 overflow-x-auto no-scrollbar">
              <span className="text-red-500/50 mr-1.5 select-none">$</span>
              <code>{command}</code>
            </div>

            {/* Real-time live output terminal tail */}
            <div className="flex flex-col gap-1.5 bg-black/50 border border-white/5 rounded-lg p-3.5 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/5 pb-1.5 mb-1.5">
                <div className="text-[10px] text-[#777777] uppercase tracking-wider font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                  <span>Flujo de salida en tiempo real</span>
                </div>
                {isErrorLine && (
                  <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider bg-red-500/15 px-2 py-0.5 rounded">
                    ⚠️ Posible Error Detectado
                  </span>
                )}
              </div>

              {lastLine ? (
                <div className="flex items-start gap-2 font-mono text-[13px] leading-relaxed">
                  <span className="text-green-500 font-bold select-none">❯</span>
                  <div className="flex-1 flex flex-wrap items-center gap-1 text-left min-w-0">
                    <span className={`break-all ${isErrorLine ? 'text-red-400 font-semibold bg-red-500/5 px-1.5 py-0.5 rounded border border-red-500/10' : 'text-neutral-200'}`}>
                      {lastLine}
                    </span>
                    <span className="terminal-blink inline-block w-2.5 h-4 bg-green-500 ml-1"></span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 font-mono text-xs text-neutral-500 italic">
                  <span>Conectando con la terminal...</span>
                  <span className="terminal-blink inline-block w-2 h-3.5 bg-neutral-600"></span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PHASE 3: COMPLETED (SUCCESS OR ERROR OUTPUT LOGS) */}
        {/* ========================================================================= */}
        {(status === 'success' || status === 'error') && (
          <div className="flex flex-col gap-2.5 fade-in-up">
            {/* Minimal final status badge */}
            <div className="flex items-center gap-2.5 text-xs">
              {status === 'success' ? (
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  <span>✓</span>
                  <span>Completado con éxito (Exit 0)</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-red-400 font-semibold bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-full">
                  <span>✗</span>
                  <span>Error en ejecución (Exit {exitCode ?? 1})</span>
                </span>
              )}
              <code className="text-neutral-500 font-mono text-[11px] truncate max-w-xs">{command}</code>
            </div>

            {/* Output log content */}
            <div className="flex flex-col border border-white/5 rounded-xl bg-black/45 overflow-hidden">
              <div className="flex items-center justify-between bg-white/5 px-4 py-2 border-b border-white/5">
                <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-semibold">
                  Salida del sistema
                </span>
                <span className="text-[10px] font-mono text-neutral-500 select-none">
                  {output ? `${(output.length / 1024).toFixed(2)} KB` : '0 KB'}
                </span>
              </div>
              <pre className="w-full text-left p-4 bg-transparent text-[13px] font-mono text-[#cccccc] whitespace-pre-wrap max-h-[300px] overflow-y-auto no-scrollbar border-0 outline-none leading-relaxed">
                {output || <span className="text-neutral-600 italic">No hubo salida estándar o error del sistema.</span>}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
