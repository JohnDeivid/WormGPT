import { useEffect, useRef, useState } from 'react';

// ─── Narrative Loading Lines ──────────────────────────────────────────────────
// These lines are displayed sequentially with a typewriter effect while
// WormGPT's terminal command is being executed.
const NARRATIVE_LINES = [
  '> Conectando con la terminal...',
  '> Verificando permisos del sistema...',
  '> Analizando entorno y dependencias...',
  '> Ejecutando instrucciones...',
  '> Procesando salida del comando...',
  '> Esperando respuesta del sistema...',
  '> Recopilando resultados...',
  '> Finalizando operación...',
];

interface NarrativeLoadingProps {
  /** The shell command being executed — shown at the top of the block */
  command: string;
  /** Current status of the tool call */
  status: 'running' | 'pending_approval';
}

export default function NarrativeLoading({ command, status }: NarrativeLoadingProps) {
  // Which narrative lines have been fully typed
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  // The line currently being typed out character-by-character
  const [currentLine, setCurrentLine] = useState('');
  // Index into the NARRATIVE_LINES array
  const lineIndexRef = useRef(0);
  // Character index within the current line
  const charIndexRef = useRef(0);
  // Ref for the scrollable container
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever content changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [visibleLines, currentLine]);

  // Typewriter effect — types one character at a time, then moves to the next line
  useEffect(() => {
    if (status !== 'running') return;

    const typeInterval = setInterval(() => {
      const lineIdx = lineIndexRef.current;
      // If we've exhausted all lines, loop back around
      const actualIdx = lineIdx % NARRATIVE_LINES.length;
      const fullLine = NARRATIVE_LINES[actualIdx];
      const charIdx = charIndexRef.current;

      if (charIdx < fullLine.length) {
        // Type the next character
        setCurrentLine(fullLine.slice(0, charIdx + 1));
        charIndexRef.current = charIdx + 1;
      } else {
        // Line complete → commit it and move to the next
        setVisibleLines(prev => [...prev, fullLine]);
        setCurrentLine('');
        charIndexRef.current = 0;
        lineIndexRef.current = lineIdx + 1;
      }
    }, 35); // 35ms per character — fast but readable

    return () => clearInterval(typeInterval);
  }, [status]);

  return (
    <div className="narrative-loading-block my-3">
      {/* Command header */}
      <div className="narrative-loading-header">
        <span className="narrative-loading-icon">❯</span>
        <code className="narrative-loading-cmd">{command}</code>
        <span className="narrative-loading-badge">
          {status === 'running' ? 'Ejecutando...' : 'Pendiente'}
        </span>
      </div>

      {/* Typewriter log area */}
      <div ref={containerRef} className="narrative-loading-body">
        {visibleLines.map((line, i) => (
          <div key={i} className="narrative-loading-line">{line}</div>
        ))}
        {currentLine && (
          <div className="narrative-loading-line narrative-loading-typing">
            {currentLine}
            <span className="narrative-loading-cursor">▌</span>
          </div>
        )}
      </div>
    </div>
  );
}
