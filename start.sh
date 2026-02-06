#!/bin/bash

echo "========================================"
echo "  Strategic Advisor - Launch Script"
echo "========================================"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "[1/3] Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo ""
        echo "ERROR: Failed to install dependencies"
        echo "Please ensure Node.js and npm are installed"
        exit 1
    fi
else
    echo "[1/3] Dependencies already installed ✓"
fi

echo ""
echo "[2/3] Checking Ollama status..."
if curl -s http://localhost:11434 > /dev/null 2>&1; then
    echo "Ollama is running! Privacy mode available ✓"
else
    echo ""
    echo "⚠️  WARNING: Ollama is not running"
    echo ""
    echo "For PRIVACY MODE, please:"
    echo "1. Install Ollama: curl -fsSL https://ollama.com/install.sh | sh"
    echo "2. Start Ollama: ollama serve"
    echo "3. Download a model: ollama pull llama3.1:8b"
    echo "4. Restart this script"
    echo ""
    echo "Press Enter to continue anyway (will use cloud API if configured)..."
    read
fi

echo ""
echo "[3/3] Starting Strategic Advisor..."
echo ""
echo "App will launch at: http://localhost:5173"
echo ""
echo "==========================================="
echo "  FIRST-TIME SETUP:"
echo "==========================================="
echo "1. Go to Settings > Local LLM"
echo "2. Check Ollama status"
echo "3. Select your model"
echo "4. Enable Local LLM"
echo "5. Verify Companies tab shows your 3 companies"
echo "==========================================="
echo ""

# Try to open browser (different commands for different OS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    open http://localhost:5173
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open http://localhost:5173 2>/dev/null
fi

npm run dev
