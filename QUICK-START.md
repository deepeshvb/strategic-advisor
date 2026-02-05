# Quick Start Guide

## Option 1: Automated Installation (Recommended)

1. **Install Node.js** (if not already installed):
   - Download from: https://nodejs.org/
   - Install the LTS (Long Term Support) version
   - Restart your computer after installation

2. **Run the installation script**:
   - Double-click `install-and-run.bat`
   - The script will automatically:
     - Check for Node.js
     - Install all dependencies
     - Start the development server
     - Open the app in your browser

## Option 2: Manual Installation

Open PowerShell or Command Prompt in this folder and run:

```powershell
# Install dependencies
npm install

# Start the development server
npm run dev
```

Then open your browser to: http://localhost:5173

## Option 3: Testing Without Build (Standalone HTML)

If you want to preview the UI design without installing anything:

1. Open `standalone-demo.html` in your web browser
2. This version has limited functionality but shows the UI design

Note: The standalone version uses mock data and doesn't have full React functionality.

## What You'll See

### Chat Interface
- Conversational AI assistant
- Ask questions like:
  - "What are my priorities today?"
  - "Summarize my unread emails"
  - "What should I focus on next?"

### Dashboard
- Connected communication channels
- Priority task list
- AI-generated insights
- Real-time sync status

### Settings
- Connect/disconnect channels
- Configure AI preferences
- Manage integrations

## Troubleshooting

### "npm is not recognized"
- Node.js is not installed or not in your PATH
- Install Node.js from https://nodejs.org/
- Restart your terminal/computer after installation

### Port 5173 already in use
- Another application is using this port
- Vite will automatically use the next available port
- Check the terminal output for the actual URL

### Installation fails
- Check your internet connection
- Try running as Administrator
- Delete `node_modules` folder and try again

### TypeScript errors
- Make sure all dependencies installed correctly
- Run `npm install` again

## Next Steps

1. ✅ Get the app running
2. Explore the chat interface
3. Check out the dashboard
4. Review the Settings page
5. Read `README.md` for customization options
6. See `SETUP.md` for integration details

## Need Help?

- Check `SETUP.md` for detailed setup instructions
- Review `README.md` for feature documentation
- Look at the source code in `src/` folder

Enjoy your Strategic Coworker! 🚀
