#!/bin/bash

clear
echo ""
echo "========================================"
echo "  STRATEGIC ADVISOR - SERVER MODE"
echo "========================================"
echo ""
echo "  24/7 Monitoring Server"
echo "  Home Network Deployment"
echo ""
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ ERROR: Node.js is not installed!"
    echo "Please install from: https://nodejs.org"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ ERROR: Failed to install dependencies"
        exit 1
    fi
fi

echo ""
echo "========================================"
echo "  SERVER MODE CONFIGURATION"
echo "========================================"
echo ""

# Get local IP address
IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1 || echo "localhost")

echo "Local Network Access:"
echo "  http://$IP:5173"
echo "  http://localhost:5173"
echo ""
echo "This server will:"
echo "  ✓ Monitor all configured channels 24/7"
echo "  ✓ Send alerts when critical items detected"
echo "  ✓ Be accessible from any device on your network"
echo "  ✓ Continue monitoring even when browser is closed"
echo ""
echo "========================================"
echo ""

# Check if Ollama is running
if curl -s http://localhost:11434 > /dev/null 2>&1; then
    echo "✓ Ollama detected - Local LLM available"
else
    echo "⚠ Ollama not running - Using cloud API"
    echo "  Install: https://ollama.com/download"
fi

echo ""
echo "========================================"
echo "  STARTING SERVER..."
echo "========================================"
echo ""
echo "Server will run continuously."
echo "Press Ctrl+C to stop."
echo ""
echo "Browser will open automatically..."
echo ""

# Open browser after 2 seconds
sleep 2 && open "http://localhost:5173" &

# Start the server
npm run dev -- --host 0.0.0.0
