#!/bin/bash

echo "========================================"
echo "  AUTO-START INSTALLATION (macOS)"
echo "========================================"
echo ""
echo "This will configure Strategic Advisor to:"
echo "  ✓ Start automatically when macOS starts"
echo "  ✓ Run in the background"
echo "  ✓ Monitor 24/7"
echo ""
read -p "Press Enter to continue, or Ctrl+C to cancel..."

# Get the current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SCRIPT_PATH="$SCRIPT_DIR/start-server-macos.sh"

# Make script executable
chmod +x "$SCRIPT_PATH"

# Create LaunchAgent plist
PLIST_PATH="$HOME/Library/LaunchAgents/com.strategicadvisor.monitor.plist"

cat > "$PLIST_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.strategicadvisor.monitor</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>$SCRIPT_PATH</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>$SCRIPT_DIR</string>
    <key>StandardOutPath</key>
    <string>$HOME/Library/Logs/strategic-advisor.log</string>
    <key>StandardErrorPath</key>
    <string>$HOME/Library/Logs/strategic-advisor-error.log</string>
</dict>
</plist>
EOF

# Load the launch agent
launchctl unload "$PLIST_PATH" 2>/dev/null
launchctl load "$PLIST_PATH"

echo ""
echo "✓ Auto-start configured successfully!"
echo ""
echo "Strategic Advisor will now:"
echo "  • Start automatically when macOS starts"
echo "  • Run in the background"
echo "  • Continue monitoring 24/7"
echo "  • Restart automatically if it crashes"
echo ""
echo "Logs available at:"
echo "  ~/Library/Logs/strategic-advisor.log"
echo ""
echo "To disable auto-start:"
echo "  launchctl unload ~/Library/LaunchAgents/com.strategicadvisor.monitor.plist"
echo "  rm ~/Library/LaunchAgents/com.strategicadvisor.monitor.plist"
echo ""
echo "To start now:"
echo "  ./start-server-macos.sh"
echo ""
