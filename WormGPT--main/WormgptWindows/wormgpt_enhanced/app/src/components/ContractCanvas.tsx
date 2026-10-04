import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { clamp } from './contractUtils';

interface ContractCanvasProps {
  children: ReactNode;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3.0;
const ZOOM_SENSITIVITY = 0.001;

export const ContractCanvas: React.FC<ContractCanvasProps> = ({ children, zoom, onZoomChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePan, setIsSpacePan] = useState(false);
  const panStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const zoomRef = useRef(zoom);

  // Keep zoomRef in sync
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  // On first render, center the document
  useEffect(() => {
    if (!containerRef.current) return;
    const w = containerRef.current.clientWidth;
    setTranslate({ x: (w - 794 * zoom) / 2, y: 60 });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Wheel Zoom ──
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = -e.deltaY * ZOOM_SENSITIVITY;
    const prevZoom = zoomRef.current;
    const newZoom = clamp(prevZoom + delta * prevZoom, MIN_ZOOM, MAX_ZOOM);
    const ratio = newZoom / prevZoom;

    // Zoom toward cursor
    setTranslate(prev => ({
      x: mouseX - (mouseX - prev.x) * ratio,
      y: mouseY - (mouseY - prev.y) * ratio,
    }));

    onZoomChange(newZoom);
  }, [onZoomChange]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // ── Spacebar detection ──
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        setIsSpacePan(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePan(false);
        setIsPanning(false);
        panStart.current = null;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // ── Mouse events for panning ──
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Middle mouse button (button 1) OR spacebar held
    if (e.button === 1 || isSpacePan) {
      e.preventDefault();
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, tx: translate.x, ty: translate.y };
    }
  }, [isSpacePan, translate]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning || !panStart.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setTranslate({ x: panStart.current.tx + dx, y: panStart.current.ty + dy });
  }, [isPanning]);

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      panStart.current = null;
    }
  }, [isPanning]);

  // ── Touch pan ──
  const touchStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        tx: translate.x,
        ty: translate.y,
      };
    }
  }, [translate]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current || e.touches.length !== 1) return;
    e.preventDefault();
    const dx = e.touches[0].clientX - touchStart.current.x;
    const dy = e.touches[0].clientY - touchStart.current.y;
    setTranslate({ x: touchStart.current.tx + dx, y: touchStart.current.ty + dy });
  }, []);

  const handleTouchEnd = useCallback(() => {
    touchStart.current = null;
  }, []);

  const cursor = isPanning ? 'grabbing' : isSpacePan ? 'grab' : 'default';

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        cursor,
        userSelect: isPanning ? 'none' : 'auto',
        background: '#171717',
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
        `,
        backgroundSize: '32px 32px',
        backgroundPosition: `${translate.x}px ${translate.y}px`, // This makes grid pan with canvas!
      }}
    >
      {/* Canvas content */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          willChange: 'transform',
          // Don't transition during drag — only smooth when using buttons
        }}
      >
        {children}
      </div>

      {/* Zoom % indicator bottom-left */}
      <div style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8,
        padding: '4px 10px',
        fontSize: 11,
        fontWeight: 600,
        color: 'rgba(255,255,255,0.5)',
        fontFamily: 'monospace',
        pointerEvents: 'none',
        zIndex: 10,
      }}>
        {Math.round(zoom * 100)}%
      </div>

      {/* Pan hint */}
      {isSpacePan && (
        <div style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          padding: '5px 14px',
          fontSize: 11,
          color: 'rgba(255,255,255,0.6)',
          fontFamily: 'Inter, sans-serif',
          pointerEvents: 'none',
          zIndex: 10,
        }}>
          Arrastra para mover el canvas
        </div>
      )}
    </div>
  );
};
