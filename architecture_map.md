# WORMGPT — ARQUITECTURA LÓGICA Y MAPA DE ARCHIVOS
> Documento de referencia interno para el agente LLM. Fecha: 2026-09-02.

---

## 1. RAÍZ DEL WORKSPACE

```
ROOT = c:\Users\User Name\Downloads\WormGPT--main\
```

**Archivos sueltos en ROOT** (scripts de soporte/utilidad, NO son la app):
| Archivo | Propósito |
|---|---|
| `Worm.bat` | Launcher batch de la app |
| `Worm.ps1` | Script PowerShell principal de arranque (orquesta backend + frontend + túnel) |
| `run_tunnel.bat` | Lanza túnel ngrok/cloudflared |
| `setup_cloudflared.ps1` | Instala/configura cloudflared para túnel HTTPS |
| `start-serveo.bat` | Alternativa de túnel con Serveo |
| `ngrok.exe` | Binario ngrok para exposición pública |
| `extract.js` | Script utilitario Node.js (función auxiliar) |
| `gen_tuil.ps1` / `tui.ps1` / `tui.py` | Scripts de TUI (interfaz de texto) en PS y Python |
| `integrar.html` | HTML experimental (standalone, no parte de la app) |
| `.logs/` | Logs de backend, frontend y túnel |
| `implementation_plan.md` | Plan de implementación previo (referencia histórica) |
| `tunnel_url.txt` | URL pública actual del túnel guardada en disco |
| `.env` | Variables de entorno globales (NO usar, usar el .env de wormgpt_enhanced) |

---

## 2. DIRECTORIO PRINCIPAL DE LA APLICACIÓN

```
APP_ROOT = ROOT\WormGPT--main\WormgptWindows\wormgpt_enhanced\
```

> ⚠️ IMPORTANTE: El código real de la app está AQUÍ, no en ROOT directamente.
> Ruta completa: `c:\Users\User Name\Downloads\WormGPT--main\WormGPT--main\WormgptWindows\wormgpt_enhanced\`

### Archivos en APP_ROOT:
| Archivo | Propósito |
|---|---|
| `.env` | **VARIABLES DE ENTORNO ACTIVAS** (GEMINI_API_KEY, GROQ_API_KEY, TAVILY_API_KEY, OPENROUTER_API_KEY) |
| `.env.example` | Plantilla de variables |
| `start_all.bat` | Lanza backend + frontend en Windows |
| `dev.sh` / `start.sh` / `install.sh` | Scripts de arranque para Linux/Mac |
| `README.md` | Documentación del proyecto |

---

## 3. BACKEND (SERVER)

```
SERVER_DIR = APP_ROOT\server\
```

### 3.1 Archivo principal
| Archivo | Tamaño | Descripción |
|---|---|---|
| `server/index.js` | 81 KB / 1842 líneas | **MONOLITO PRINCIPAL DEL BACKEND** — Todo el servidor Express + WebSocket está aquí |
| `server/package.json` | — | `type: "module"`, `start: node index.js`, `dev: node --watch index.js` |

### 3.2 Dependencias del servidor
```
express, cors, ws (WebSocket), multer (upload archivos), adm-zip, 
simple-git, uuid, @google/generative-ai (Gemini SDK), rimraf
```

### 3.3 Estructura lógica de index.js (por bloques de líneas):

| Líneas | Bloque | Descripción |
|---|---|---|
| 1–19 | IMPORTS | express, cors, spawn, fs, path, ws, multer, adm-zip, simpleGit, GoogleGenerativeAI |
| 20–33 | SETUP | `__dirname`, `app`, `httpServer`, `wss`, `broadcastToWss()` |
| 34–89 | CONFIG / ENV LOADER | Lee API keys de múltiples rutas de `.env`. Keys: GEMINI, GROQ, TAVILY, OPENROUTER |
| 91–278 | SYSTEM_PROMPT | Prompt de sistema completo de WormGPT (instrucciones, reglas Docker, OSINT, mapas) |
| 280 | ACCESS_CODE | `process.env.ACCESS_CODE \|\| 'WormGPT'` |
| 282–339 | TOOL_DECLARATIONS | Function declarations para Gemini: `execute_command`, `read_file`, `write_file`, `search_web` |
| 341–356 | MIDDLEWARE | CORS, JSON parser, `/api` → skillRoute, multer upload |
| 358–492 | WEBSOCKET | Handler de WS: `run_code` (python/js/bash), `shell` (powershell), `kill` |
| 494–523 | POST /api/search | Endpoint Tavily search |
| 525–607 | SKILL LOADER | `loadSkillsContext()` — carga `skills/` siempre + `skills_library/` selectivamente por relevancia |
| 609–704 | TOOL EXECUTOR | `executeSharedToolCall()` — ejecuta read_file, write_file, search_web, execute_command |
| 706–721 | GET /api/ollama/models | Detecta modelos Ollama disponibles en localhost:11434 |
| 723–??? | POST /api/chat | **ENDPOINT PRINCIPAL DE CHAT** — Maneja providers: gemini, ollama, groq, openrouter |

### 3.4 Providers soportados en /api/chat:
- `gemini` → Google Gemini (default: `gemini-2.5-flash`) vía `@google/generative-ai` SDK
- `ollama` → Modelos locales vía `http://localhost:11434/api/chat`
- `groq` → Groq API (modelos rápidos)
- `openrouter` → OpenRouter (multi-proveedor)

### 3.5 Subdirectorios del server:
```
server/
├── src/
│   ├── skillRoute.js      ← Router Express para /api (skills management)
│   └── skillRoute.ts      ← Versión TypeScript (referencia, no compilada activamente)
├── skills/
│   ├── Generar prompt/
│   │   └── SKILL.md       ← Skill activa: generación de prompts
│   ├── programer/
│   │   └── SKILL.md       ← Skill activa: ayuda con programación
│   └── search_web.js      ← Helper de búsqueda web (autónomo)
├── skills_library/        ← 392 skills de ciberseguridad (Kali/OSINT/pentesting)
│   └── [nombre-de-skill]/ → Cada una tiene SKILL.md
├── uploads/               ← Imágenes subidas por el usuario (auto-guardadas por el servidor)
├── reports/               ← Reportes generados
├── test/                  ← Tests
├── maigret/               ← Herramienta OSINT Maigret
├── node_modules/
└── [carpetas Prueba_LLM, lol_LLM, etc.] ← Carpetas de prueba/desarrollo
```

---

## 4. FRONTEND (APP)

```
FRONTEND_DIR = APP_ROOT\app\
```

### 4.1 Stack tecnológico
```
React 19 + TypeScript + Vite 7 + TailwindCSS 3 + Radix UI + shadcn/ui
```

### 4.2 Archivos de configuración
| Archivo | Propósito |
|---|---|
| `app/package.json` | Dependencias front (react, radix-ui, lucide-react, xterm, prismjs, etc.) |
| `app/vite.config.ts` | Config Vite |
| `app/tailwind.config.js` | Config Tailwind |
| `app/tsconfig.json` | Config TypeScript |
| `app/index.html` | Punto de entrada HTML |
| `app/eslint.config.js` | ESLint config |

### 4.3 Árbol de src/
```
app/src/
├── main.tsx               ← Entry point React (monta App)
├── App.tsx                ← COMPONENTE PRINCIPAL (166 KB / mega-componente)
├── App.css                ← Estilos globales del App
├── index.css              ← CSS base / design tokens / Tailwind
├── lib/
│   └── utils.ts           ← Helper clsx/tailwind-merge
├── hooks/
│   └── use-mobile.ts      ← Hook para detectar mobile
└── components/
    ├── ContractCanvas.tsx       ← Canvas de contratos (drag & drop visual)
    ├── ContractDocument.tsx     ← Renderizado de documento de contrato
    ├── ContractSidebar.tsx      ← Sidebar del editor de contratos
    ├── ContractsWorkspace.tsx   ← Workspace completo de contratos
    ├── ContratosEditor.tsx      ← Editor principal de contratos (47 KB)
    ├── ContratosEditor.css      ← Estilos del editor de contratos
    ├── ExecutionTimeline.tsx    ← Timeline de ejecución de comandos/herramientas
    ├── LoadingIndicator.tsx     ← Indicador de carga simple
    ├── MapEmbed.tsx             ← Mapa embebido interactivo (Leaflet/OpenStreetMap)
    ├── MonitorSeguridad.tsx     ← Monitor de seguridad / OSINT dashboard
    ├── NarrativeLoading.tsx     ← Loading animado narrativo
    ├── SelectionPopup.tsx       ← Popup al seleccionar texto
    ├── contractUtils.ts         ← Utilidades para contratos
    └── ui/                      ← 53 componentes shadcn/ui
        ├── button.tsx, input.tsx, dialog.tsx, ...
        └── sidebar.tsx (21 KB — componente sidebar principal)
```

### 4.4 Dependencias frontend clave:
```
lucide-react        ← Iconos
xterm + xterm-addon-fit ← Terminal emulada en browser
prismjs             ← Syntax highlighting de código
react-markdown + remark-gfm ← Renderizado de Markdown con tablas
recharts            ← Gráficos
sonner              ← Toast notifications
next-themes         ← Dark/light mode
react-resizable-panels ← Panels redimensionables
```

---

## 5. CONFIGURACIÓN DE ENTORNO (.env)

**Ruta activa**: `APP_ROOT\.env`
```
GEMINI_API_KEY=...
GROQ_API_KEY=...
TAVILY_API_KEY=...
OPENROUTER_API_KEY=...
```

El servidor busca el `.env` en estas rutas (en orden):
1. `server/.env`
2. `server/../.env` ← **Esta es la que funciona** (`APP_ROOT/.env`)
3. `server/../../../../.env` (ROOT)
4. `process.cwd()/.env`

---

## 6. PUERTOS Y SERVICIOS

| Servicio | Puerto | Descripción |
|---|---|---|
| Backend (Express) | **`3001`** (`process.env.PORT \|\| 3001`) | API REST + WebSocket — línea L1819 en index.js |
| Frontend (Vite dev) | `5173` | Solo en desarrollo (`npm run dev` en app/) |
| Frontend (prod) | **`3001`** | En producción, Express sirve `app/dist/` estático (L1802) |
| Ollama (si activo) | `11434` | Modelos LLM locales |
| Túnel ngrok/cloudflared | dinámico | Expone backend al exterior |

---

## 7. FLUJO DE DATOS (CHAT)

```
User Browser
    │
    ├─[HTTP POST /api/chat]────► server/index.js
    │                              ├─ Carga .env (API keys)
    │                              ├─ Carga skills (skills/ + skills_library/)
    │                              ├─ Construye system prompt dinámico
    │                              ├─ Rutea a provider (gemini/ollama/groq/openrouter)
    │                              ├─ Si modelo llama tool → executeSharedToolCall()
    │                              │   ├─ execute_command → spawn PowerShell/sh
    │                              │   ├─ read_file → fs.readFileSync
    │                              │   ├─ write_file → fs.writeFileSync
    │                              │   └─ search_web → Tavily API
    │                              └─ Stream SSE → frontend
    │
    └─[WebSocket ws://]────────► server/index.js (wss)
                                   ├─ run_code → spawn python/node/bash
                                   └─ shell → spawn PowerShell (terminal interactiva)
```

---

## 8. DÓNDE BUSCAR CADA COSA

| Si necesitas editar... | Busca en... |
|---|---|
| System prompt / instrucciones del AI | `server/index.js` líneas 92–278 |
| Agregar nuevo provider de LLM | `server/index.js` bloque POST /api/chat |
| Agregar nueva tool (function call) | `server/index.js` TOOL_DECLARATIONS (L282) + executeSharedToolCall (L629) |
| Lógica de skills | `server/index.js` loadSkillsContext (L557) + `server/src/skillRoute.js` |
| Skills activas del agente | `server/skills/` (una carpeta por skill con SKILL.md) |
| Biblioteca de skills | `server/skills_library/` (392 skills de ciberseguridad) |
| API keys / entorno | `APP_ROOT/.env` |
| UI del chat (componente principal) | `app/src/App.tsx` |
| Estilos globales | `app/src/index.css` y `app/src/App.css` |
| Mapa interactivo | `app/src/components/MapEmbed.tsx` |
| Editor de contratos | `app/src/components/ContratosEditor.tsx` |
| Terminal embebida (xterm) | Dentro de `app/src/App.tsx` |
| Componentes UI reutilizables | `app/src/components/ui/` |
| WebSocket (terminal del browser) | `server/index.js` bloque wss.on('connection') (L361) |
| Scripts de inicio | `APP_ROOT/start_all.bat` o `ROOT/Worm.ps1` |
| Logs del servidor | `ROOT/.logs/backend.log`, `backend.err.log` |

---

## 9. NOTAS CRÍTICAS PARA EL AGENTE

1. **El servidor es un monolito**: Todo el backend está en UN solo archivo: `server/index.js` (1842 líneas). No hay separación de módulos salvo `skillRoute.js`.

2. **App.tsx es enorme**: `app/src/App.tsx` pesa 166 KB. Contiene virtualmente toda la lógica de UI del frontend. Buscar funciones específicas con `grep` antes de editar.

3. **ESM puro**: Ambos proyectos usan `"type": "module"`. No mezclar `require()` con `import`.

4. **Docker esperado**: El system prompt asume que existe un contenedor Docker llamado `kali-box` corriendo `kalilinux/kali-rolling`. El servidor intenta copiar imágenes ahí automáticamente.

5. **Múltiples .env**: Hay un `.env` en ROOT y otro en APP_ROOT. El activo es `APP_ROOT/.env`. El de ROOT es obsoleto.

6. **ACCESS_CODE**: El código de acceso es `'WormGPT'` (variable `ACCESS_CODE` en index.js L280).

7. **Puerto del servidor**: Para confirmar el puerto exacto, buscar `httpServer.listen(` en `server/index.js`.
