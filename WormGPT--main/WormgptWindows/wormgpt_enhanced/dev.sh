#!/bin/bash
echo "🔧 WormGPT Dev Mode (hot-reload)..."

# Verify Gemini API Key configuration
if [ -z "$GEMINI_API_KEY" ]; then
  echo "⚠️  WARNING: GEMINI_API_KEY is not defined in your environment."
fi

# Start backend
cd "$(dirname "$0")/server" && node index.js &
cd ..

# Start frontend dev server
cd "$(dirname "$0")/app" && npm run dev
