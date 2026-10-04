import React, { useEffect, useRef, useState } from "react";
import { MapPin, Layers, Ruler, AlertTriangle, Crosshair } from "lucide-react";

declare global {
  interface Window {
    maplibregl: any;
  }
}

interface Point {
  lat?: number;
  lon?: number;
  query?: string;
  label?: string;
  zoom?: number;
}

interface MapEmbedProps {
  points?: Point[];
  lat?: number;
  lon?: number;
  query?: string;
  label?: string;
  zoom?: number;
}

let maplibreLoaded = false;
let maplibreLoadPromise: Promise<void> | null = null;

function loadMapLibre(): Promise<void> {
  if (maplibreLoaded) return Promise.resolve();
  if (maplibreLoadPromise) return maplibreLoadPromise;
  maplibreLoadPromise = new Promise((resolve, reject) => {
    if (!document.querySelector('link[href*="maplibre-gl"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css";
      document.head.appendChild(link);
    }
    if (!document.querySelector('script[src*="maplibre-gl"]')) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js";
      script.onload = () => { maplibreLoaded = true; resolve(); };
      script.onerror = reject;
      document.head.appendChild(script);
    } else {
      maplibreLoaded = true;
      resolve();
    }
  });
  return maplibreLoadPromise;
}

async function geocode(query: string): Promise<{ lat: number; lon: number; displayName: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`;
    const res = await fetch(url, { headers: { "Accept-Language": "es,en" } });
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), displayName: data[0].display_name };
    }
  } catch (e) {
    console.warn("[MapEmbed] Geocoding failed:", e);
  }
  return null;
}

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

type MapStyle = "dark" | "light" | "color" | "satellite" | "hacker" | "natural";

const STYLE_URLS: Record<string, any> = {
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  color: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
  hacker: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  natural: {
    version: 8,
    sources: { "esri-topo": { type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"], tileSize: 256 } },
    layers: [{ id: "topo-layer", type: "raster", source: "esri-topo", minzoom: 0, maxzoom: 22 }]
  },
  satellite: {
    version: 8,
    sources: { "esri-satellite": { type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], tileSize: 256 } },
    layers: [{ id: "satellite-layer", type: "raster", source: "esri-satellite", minzoom: 0, maxzoom: 22 }]
  }
};

const MapEmbed: React.FC<MapEmbedProps> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  
  const targetMarkersRef = useRef<any[]>([]);
  const lineMarkersRef = useRef<any[]>([]);
  
  const userMarkerRef = useRef<any>(null);
  const userLineMarkerRef = useRef<any>(null);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [mapStyle, setMapStyle] = useState<MapStyle>("dark");
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  
  const [resolvedPoints, setResolvedPoints] = useState<{ lat: number; lon: number; label: string }[]>([]);
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [distanceActive, setDistanceActive] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const defaultCenter: [number, number] = [-70, 20];

  const clearLineAndLabels = (sourceId: string, markersRef: React.MutableRefObject<any[]>) => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    if (map.getLayer(sourceId + '-layer')) map.removeLayer(sourceId + '-layer');
    if (map.getSource(sourceId)) map.removeSource(sourceId);
  };

  const drawLine = (coordsArray: {lat: number, lon: number}[], sourceId: string, markersRef: React.MutableRefObject<any[]>, color: string = '#ef4444') => {
    const map = mapRef.current;
    if (!map || coordsArray.length < 2) return;
    
    clearLineAndLabels(sourceId, markersRef);
    
    const layerId = sourceId + '-layer';
    const lineCoords = coordsArray.map(c => [c.lon, c.lat]);
    
    map.addSource(sourceId, {
      type: 'geojson',
      data: { type: 'Feature', geometry: { type: 'LineString', coordinates: lineCoords } }
    });
    
    map.addLayer({
      id: layerId,
      type: 'line',
      source: sourceId,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': color, 'line-width': 3, 'line-dasharray': [2, 2] }
    });

    // Add labels
    const ml = window.maplibregl;
    for (let i = 0; i < coordsArray.length - 1; i++) {
      const p1 = coordsArray[i];
      const p2 = coordsArray[i+1];
      const dist = getDistanceFromLatLonInKm(p1.lat, p1.lon, p2.lat, p2.lon);
      const text = dist < 1 ? `${(dist * 1000).toFixed(0)} m` : `${dist.toFixed(1)} km`;
      
      const el = document.createElement("div");
      el.className = "map-distance-label";
      el.innerText = text;
      
      const marker = new ml.Marker({ element: el })
        .setLngLat([(p1.lon + p2.lon) / 2, (p1.lat + p2.lat) / 2])
        .addTo(map);
      markersRef.current.push(marker);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        await loadMapLibre();
        if (cancelled || !containerRef.current) return;

        const pts = props.points && props.points.length > 0 
          ? props.points 
          : (props.lat != null || props.query ? [props] : []);
        
        const newPts: {lat: number, lon: number, label: string}[] = [];
        
        for (const p of pts) {
          if (p.lat != null && p.lon != null) {
            newPts.push({ lat: p.lat, lon: p.lon, label: p.label || p.query || "Ubicación" });
          } else if (p.query) {
            const geo = await geocode(p.query);
            if (geo && !cancelled) {
              newPts.push({ lat: geo.lat, lon: geo.lon, label: p.label || geo.displayName });
            }
          }
        }
        
        if (cancelled) return;
        setResolvedPoints(newPts);

        const ml = window.maplibregl;
        const center = newPts.length > 0 ? [newPts[0].lon, newPts[0].lat] : defaultCenter;
        const zoom = newPts.length > 0 ? (props.zoom || 13) : 2;

        const map = new ml.Map({
          container: containerRef.current,
          style: STYLE_URLS[mapStyle],
          center,
          zoom,
          attributionControl: false,
        });
        
        mapRef.current = map;
        map.addControl(new ml.NavigationControl({ showCompass: false }), "bottom-right");
        map.addControl(new ml.AttributionControl({ compact: true }), "bottom-left");

        map.on("load", () => {
          if (cancelled) return;
          
          if (newPts.length > 0) {
            const bounds = new ml.LngLatBounds();
            newPts.forEach((p, idx) => {
              const el = document.createElement("div");
              el.className = "map-target-marker";
              if (newPts.length > 1) {
                el.innerText = (idx + 1).toString();
                el.style.display = 'flex';
                el.style.alignItems = 'center';
                el.style.justifyContent = 'center';
                el.style.color = 'white';
                el.style.fontSize = '10px';
                el.style.fontWeight = 'bold';
              }
              const marker = new ml.Marker({ element: el, anchor: "bottom" })
                .setLngLat([p.lon, p.lat])
                .addTo(map);
              marker.setPopup(new ml.Popup({ offset: 25, closeButton: false, className: 'wormgpt-map-popup' })
                .setHTML(`<div>${p.label}</div>`));
              
              if (newPts.length === 1) marker.togglePopup();
              targetMarkersRef.current.push(marker);
              bounds.extend([p.lon, p.lat]);
            });

            if (newPts.length > 1) {
              drawLine(newPts, 'multi-point-line', lineMarkersRef, '#3b82f6');
              map.fitBounds(bounds, { padding: 50, duration: 0 });
            }
          }
          setStatus("ready");
        });
        map.on("error", () => setStatus("error"));
      } catch (e) {
        console.error("[MapEmbed] Init error:", e);
        if (!cancelled) setStatus("error");
      }
    };
    init();
    
    return () => {
      cancelled = true;
      if (mapRef.current) { try { mapRef.current.remove(); } catch {} mapRef.current = null; }
    };
  }, [props.points]);

  useEffect(() => {
    if (mapRef.current && status === "ready") {
      mapRef.current.setStyle(STYLE_URLS[mapStyle]);
      mapRef.current.once("styledata", () => {
        if (resolvedPoints.length > 1) {
          drawLine(resolvedPoints, 'multi-point-line', lineMarkersRef, '#3b82f6');
        }
        if (distanceActive && userCoords && resolvedPoints.length > 0) {
          drawLine([userCoords, resolvedPoints[0]], 'user-distance-line', userLineMarkerRef, '#ef4444');
        }
      });
    }
  }, [mapStyle]);

  const toggleDistance = () => {
    if (!mapRef.current || resolvedPoints.length === 0) return;
    const map = mapRef.current;
    const ml = window.maplibregl;
    
    if (distanceActive) {
      // Turn off
      setDistanceActive(false);
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      clearLineAndLabels('user-distance-line', userLineMarkerRef);
      // Reset bounds
      if (resolvedPoints.length > 1) {
        const bounds = new ml.LngLatBounds();
        resolvedPoints.forEach(p => bounds.extend([p.lon, p.lat]));
        map.fitBounds(bounds, { padding: 50, duration: 1000 });
      } else {
        map.flyTo({ center: [resolvedPoints[0].lon, resolvedPoints[0].lat], zoom: props.zoom || 13, duration: 1000 });
      }
      return;
    }

    // Turn on
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("Geolocalización no soportada.");
      return;
    }
    
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userC = { lat: position.coords.latitude, lon: position.coords.longitude };
        setUserCoords(userC);
        setDistanceActive(true);
        
        const el = document.createElement("div");
        el.className = "map-user-marker";
        userMarkerRef.current = new ml.Marker({ element: el, anchor: "bottom" })
          .setLngLat([userC.lon, userC.lat])
          .setPopup(new ml.Popup({ offset: 25, closeButton: false, className: 'wormgpt-map-popup' }).setHTML(`<div>Mi Ubicación</div>`))
          .addTo(map);
        
        // Draw line to the first point
        drawLine([userC, resolvedPoints[0]], 'user-distance-line', userLineMarkerRef, '#ef4444');
        
        const bounds = new ml.LngLatBounds();
        bounds.extend([userC.lon, userC.lat]);
        resolvedPoints.forEach(p => bounds.extend([p.lon, p.lat]));
        map.fitBounds(bounds, { padding: 60, duration: 1000 });
        
        setStatus("ready");
      },
      (error) => {
        console.error("[MapEmbed] Geo Error:", error);
        setGeoError("Permiso denegado.");
        setStatus("ready");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const getHeaderTitle = () => {
    if (resolvedPoints.length === 0) return "Localizando...";
    if (resolvedPoints.length === 1) return resolvedPoints[0].label;
    return `${resolvedPoints.length} lugares enlazados`;
  };

  return (
    <div className={`relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-lg mb-4 ${mapStyle === 'hacker' ? 'map-hacker-mode' : ''}`}>
      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900/80 border-b border-zinc-800 backdrop-blur-md z-10 relative">
        <MapPin size={14} className={resolvedPoints.length > 0 ? "text-red-500" : "text-zinc-500"} />
        <span className="text-xs text-zinc-300 font-medium truncate max-w-[50%]">
          {getHeaderTitle()}
        </span>
        
        <div className="ml-auto flex items-center gap-2">
          {geoError && (
            <span className="text-xs text-amber-500 flex items-center gap-1" title={geoError}>
              <AlertTriangle size={12} /> {geoError}
            </span>
          )}
          
          {resolvedPoints.length > 0 && (
            <button 
              onClick={toggleDistance}
              className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors ${distanceActive ? 'bg-red-500/20 text-red-400' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
              title="Comparar mi distancia"
            >
              <Crosshair size={14} />
              <span className="hidden sm:inline">{distanceActive ? 'Ocultar Distancia' : 'Mi Distancia'}</span>
            </button>
          )}
          
          <div className="relative">
            <button 
              onClick={() => setShowStyleMenu(!showStyleMenu)}
              className={`flex items-center justify-center p-1.5 rounded transition-colors ${showStyleMenu ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
              title="Estilo del mapa"
            >
              <Layers size={14} />
            </button>
            {showStyleMenu && (
              <div className="absolute right-0 top-full mt-1 w-32 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden py-1 z-50">
                {(Object.keys(STYLE_URLS) as MapStyle[]).map(s => (
                  <button
                    key={s}
                    onClick={() => { setMapStyle(s); setShowStyleMenu(false); }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors capitalize ${mapStyle === s ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="relative h-[400px] bg-zinc-950">
        <div ref={containerRef} className="w-full h-full" />
        {status === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-sm z-20 gap-3">
            <div className="w-6 h-6 border-2 border-zinc-700 border-t-red-500 rounded-full animate-spin" />
            <span className="text-xs text-zinc-400">Procesando mapa...</span>
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 z-20 gap-2 text-zinc-500">
            <AlertTriangle size={24} />
            <span className="text-xs">Error al cargar el mapa</span>
          </div>
        )}
      </div>
    </div>
  );
};
export default MapEmbed;
