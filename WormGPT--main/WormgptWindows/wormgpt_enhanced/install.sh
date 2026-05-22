#!/bin/bash
set -e

echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║          WormGPT Enhanced Installer       ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Install from https://nodejs.org (v18+)"
  exit 1
fi
NODE_VER=$(node -v | cut -c2- | cut -d. -f1)
if [ "$NODE_VER" -lt 18 ]; then
  echo "❌ Node.js 18+ required. Current: $(node -v)"
  exit 1
fi
echo "✅ Node.js $(node -v)"

# Check Gemini API Configuration
echo ""
echo "⚙️  Configuring Google Gemini Integration..."
if [ -z "$GEMINI_API_KEY" ]; then
  echo "⚠️  NOTE: GEMINI_API_KEY environment variable is not set."
  echo "   You can set it in your system environment or directly inside the app settings later."
else
  echo "✅ GEMINI_API_KEY is configured in your environment."
fi

# Install frontend deps
echo ""
echo "📦 Installing frontend dependencies..."
cd app
npm install --silent
echo "✅ Frontend deps installed"

# Build frontend
echo "🔨 Building frontend..."
npm run build --silent
echo "✅ Frontend built"

# Install server deps
echo ""
echo "📦 Installing server dependencies..."
cd ../server
npm install --silent
echo "✅ Server deps installed"

cd ..

echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║  ✅  Installation Complete!               ║"
echo "║                                           ║"
echo "║  Run:  ./start.sh                         ║"
echo "║  Open: http://localhost:3001              ║"
echo "║  Pass: WormGPT                            ║"
echo "╚═══════════════════════════════════════════╝"
echo ""
