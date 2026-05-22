#!/bin/bash
echo ""
echo "🐛 Starting WormGPT Enhanced..."

# Verify Gemini API Key configuration
if [ -z "$GEMINI_API_KEY" ]; then
  echo "⚠️  WARNING: GEMINI_API_KEY is not defined in your environment."
  echo "   Please set it using: export GEMINI_API_KEY='your-key'"
  echo "   Alternatively, provide it directly in the application workspace settings."
fi

# Start backend
echo "🔌 Starting backend server..."
cd "$(dirname "$0")/server"
node index.js &
SERVER_PID=$!
cd ..

sleep 1

# Open browser
if command -v xdg-open &>/dev/null; then xdg-open http://localhost:3001
elif command -v open &>/dev/null; then open http://localhost:3001
fi

echo ""
echo "╔═══════════════════════════════════════╗"
echo "║  🐛 WormGPT Enhanced Running!         ║"
echo "║                                       ║"
echo "║  → http://localhost:3001              ║"
echo "║  Access Code: WormGPT                 ║"
echo "║                                       ║"
echo "║  Press Ctrl+C to stop                 ║"
echo "╚═══════════════════════════════════════╝"
echo ""

# Keep alive
wait $SERVER_PID
