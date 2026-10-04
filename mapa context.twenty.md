# 🗺️ Mapa de Contexto — Twenty CRM (Open Source)
> Última actualización: 23 Sep 2026  
> Entorno: WSL2 — Kali Linux (`kali-linux`) · Usuario: `osintuser`

---

## 🖥️ Entorno de ejecución

| Componente | Estado | Detalle |
|---|---|---|
| WSL2 distro | ✅ Funcionando | `kali-linux` — Running, Version 2 |
| `docker-desktop` (distro) | ⏸️ Detenido | Instalado pero no corriendo actualmente |
| NVM | ✅ Instalado | `/home/osintuser/.nvm/` |
| Node.js `v20.20.2` | ✅ Disponible | Vía NVM — es la versión activa por defecto |
| Node.js `v24.5.0` | ✅ Instalado | Vía NVM — disponible pero no activa |
| yarn `4.13.0` | ✅ Funciona | `/home/osintuser/.nvm/versions/node/v20.20.2/bin/yarn` |
| npm `11.11.0` | ⚠️ Conflicto | Viene de Windows vía PATH heredado (`/mnt/c/...`) |

> [!WARNING]
> NVM **no se carga automáticamente** en sesiones no-interactivas (scripts, llamadas externas).  
> Requiere `source /home/osintuser/.nvm/nvm.sh` antes de usar `node` o `yarn` desde fuera de la terminal.

---

## 📁 Repositorio — `/home/osintuser/twenty/`

### Raíz del repo

| Archivo / Carpeta | Estado | Notas |
|---|---|---|
| `package.json` | ✅ Existe | version `0.2.1`, define workspaces y script `start` |
| `yarn.lock` | ✅ Existe | Lockfile de dependencias |
| `yarn.config.cjs` | ✅ Existe | Configuración de yarn |
| `nx.json` | ✅ Existe | Configuración de Nx (monorepo) |
| `tsconfig.base.json` | ✅ Existe | TypeScript base config |
| `jest.preset.js` | ✅ Existe | Configuración global de tests |
| `node_modules/` | ✅ Existe | Dependencias ya descargadas |
| `packages/` | ✅ Existe | Contiene todos los sub-proyectos |
| `AGENTS.md` | ✅ Existe | Guía para agentes de IA |
| `CLAUDE.md` | ✅ Existe | Instrucciones específicas para Claude |
| `LICENSE` | ✅ Existe | Licencia del proyecto |
| `README.md` | ✅ Existe | Documentación principal |
| `.env` (raíz) | ❌ No existe | Sin archivo de entorno en la raíz |

---

## 📦 Packages (`/home/osintuser/twenty/packages/`)

| Package | Última modificación | Estado |
|---|---|---|
| `twenty-front` | 22 Sep 2026 | ✅ Presente — tiene `node_modules/`, `src/`, `.env` propio |
| `twenty-server` | 22 Sep 2026 | ✅ Presente — tiene `node_modules/`, `src/`, `.env` propio |
| `twenty-ui` | 15 Sep 2026 | ✅ Presente |
| `twenty-shared` | 19 Sep 2026 | ✅ Presente |
| `twenty-emails` | 19 Sep 2026 | ✅ Presente |
| `twenty-sdk` | 19 Sep 2026 | ✅ Presente |
| `twenty-website` | 19 Sep 2026 | ✅ Presente |
| `twenty-zapier` | 20 Sep 2026 | ✅ Presente |
| `twenty-utils` | 15 Sep 2026 | ✅ Presente |
| `twenty-docs` | 15 Sep 2026 | ✅ Presente |
| `twenty-e2e-testing` | 15 Sep 2026 | ✅ Presente |
| `twenty-cli` | 15 Sep 2026 | ✅ Presente |
| `twenty-client-sdk` | 17 Sep 2026 | ✅ Presente |
| `twenty-codex-plugin` | 15 Sep 2026 | ✅ Presente |
| `twenty-front-component-renderer` | 15 Sep 2026 | ✅ Presente |
| `twenty-oxlint-rules` | 15 Sep 2026 | ✅ Presente |
| `twenty-claude-skills` | 15 Sep 2026 | ✅ Presente |
| `twenty-apps` | 15 Sep 2026 | ✅ Presente |
| `twenty-docker` | 15 Sep 2026 | ✅ Presente — contiene docker-compose |
| `create-twenty-app` | 19 Sep 2026 | ✅ Presente |

---

## 📄 Archivos `.env` relevantes

| Archivo | Estado | Notas |
|---|---|---|
| `packages/twenty-front/.env` | ✅ Existe | 310 bytes — configurado (modificado 22 Sep) |
| `packages/twenty-front/.env.example` | ✅ Existe | 310 bytes — plantilla |
| `packages/twenty-server/.env` | ✅ Existe | 6258 bytes — configurado (modificado 22 Sep) |
| `packages/twenty-server/.env.example` | ✅ Existe | 6258 bytes — plantilla completa |
| `packages/twenty-server/.env.test` | ✅ Existe | Config para tests |
| `packages/twenty-server/.env.e2e-testing-server` | ✅ Existe | Config para e2e |
| `packages/twenty-docker/.env.example` | ✅ Existe | Plantilla para Docker |

> [!NOTE]
> Los `.env` de `twenty-front` y `twenty-server` fueron modificados el **22 Sep** — el usuario ya los configuró.

---

## 🐳 Docker (`packages/twenty-docker/`)

| Archivo | Estado | Notas |
|---|---|---|
| `docker-compose.yml` | ✅ Existe | Setup completo: `server`, `db` (postgres), `redis` |
| `docker-compose.dev.yml` | ✅ Existe | Variante para desarrollo |
| `Makefile` | ✅ Existe | Comandos rápidos |
| `.env.example` | ✅ Existe | Variables necesarias para docker-compose |
| `grafana/` | ✅ Existe | Monitoring |
| `helm/` | ✅ Existe | Deploy Kubernetes |
| `k8s/` | ✅ Existe | Manifiestos K8s |
| `podman/` | ✅ Existe | Alternativa a Docker |
| `twenty/` | ✅ Existe | |
| `twenty-app-dev/` | ✅ Existe | |
| `twenty-postgres-spilo/` | ✅ Existe | Postgres con Spilo |

---

## ⚠️ Problemas identificados

| Problema | Severidad | Estado |
|---|---|---|
| `node` no encontrado en sesiones no-interactivas | 🟡 Medio | NVM no se carga por defecto fuera de terminal — no afecta uso normal |
| `yarn` apunta a Windows (`/mnt/c/...`) en sesiones no-interactivas | 🟡 Medio | Mismo origen que arriba |
| `corepack` de Windows incompatible en Linux (`/bin/sh^M`) | 🟡 Medio | Consecuencia del PATH heredado |
| Error inicial `Wsl/Service/CreateInstance/CreateVm/0x80070005b4` | ✅ Resuelto | Era timeout de arranque, WSL funciona bien |
| Error que reportó el usuario con yarn | ❓ Sin confirmar | Pendiente de detalles exactos del comando que falló |

---

## 🚀 Script de arranque (según `package.json`)

```bash
# Desde ~/twenty con NVM cargado:
source ~/.nvm/nvm.sh
npx concurrently --kill-others \
  'npx nx run-many -t start -p twenty-server twenty-front' \
  'npx wait-on tcp:3000 && npx nx run twenty-server:worker'
```

---

## ❓ Pendiente de confirmar

- [ ] Error exacto que ocurrió al ejecutar yarn (qué comando, qué output)
- [ ] Si PostgreSQL y Redis están corriendo (necesarios para el server)
- [ ] Si el `.env` de `twenty-server` tiene `PG_DATABASE_URL` y `APP_SECRET` configurados
