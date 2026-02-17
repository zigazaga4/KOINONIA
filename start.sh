#!/bin/bash

# Start Koinonia server and frontend in a single terminal

cleanup() {
  echo ""
  echo "Shutting down..."
  kill $SERVER_PID $FRONTEND_PID 2>/dev/null
  wait $SERVER_PID $FRONTEND_PID 2>/dev/null
  exit 0
}

trap cleanup SIGINT SIGTERM

DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Starting Koinonia server..."
cd "$DIR/server" && bun run start.ts &
SERVER_PID=$!

echo "Starting Koinonia frontend..."
cd "$DIR/frontend" && npx expo start --web &
FRONTEND_PID=$!

echo ""
echo "Server PID: $SERVER_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Press Ctrl+C to stop both."
echo ""

wait
