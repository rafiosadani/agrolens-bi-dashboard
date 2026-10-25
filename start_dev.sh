#!/bin/bash
# ==============================================================================
# AgroLens (AgroFarm BI & Executive Analytics Hub) - Development Launcher
# Starts FastAPI backend (port 8001) and Next.js frontend (port 3001)
# ==============================================================================

echo "🌾 Starting AgroLens BI Dashboard Suite..."
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Trap to kill both processes on Ctrl+C
cleanup() {
    echo -e "\n🛑 Stopping AgroLens Services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM

# 1. Start Python FastAPI Backend on port 8001 (isolated from Agrosync Hub port 8000)
echo "🚀 [1/2] Launching Backend Analytics Engine (FastAPI on http://localhost:8001)..."
cd "$PROJECT_DIR/backend"
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload &
BACKEND_PID=$!

# 2. Start Next.js Frontend on port 3001 (isolated from Agrosync Hub port 3000)
echo "✨ [2/2] Launching Frontend Executive UI (Next.js on http://localhost:3001)..."
cd "$PROJECT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo -e "\n✅ AgroLens is up and running!"
echo "   📊 Executive UI:  http://localhost:3001"
echo "   ⚡ API Engine:    http://localhost:8001"
echo "   📚 Swagger Docs:  http://localhost:8001/api/v1/docs"
echo -e "   Press Ctrl+C to terminate both servers.\n"

wait $BACKEND_PID $FRONTEND_PID
