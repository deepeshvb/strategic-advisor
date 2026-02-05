# Setup Guide

## Prerequisites

Before running this application, you need to have Node.js installed on your system.

### Installing Node.js

1. **Download Node.js**:
   - Visit https://nodejs.org/
   - Download the LTS (Long Term Support) version for Windows
   - The installer includes npm (Node Package Manager)

2. **Install Node.js**:
   - Run the downloaded installer
   - Follow the installation wizard
   - Make sure to check the box that says "Automatically install the necessary tools"

3. **Verify Installation**:
   Open a new PowerShell or Command Prompt window and run:
   ```bash
   node --version
   npm --version
   ```
   You should see version numbers for both commands.

## Running the Application

Once Node.js is installed, follow these steps:

### 1. Install Dependencies

Open PowerShell or Command Prompt in the project directory and run:

```bash
cd C:\Users\deepe\strategic-coworker-app
npm install
```

This will install all required packages (React, Vite, Tailwind CSS, etc.)

### 2. Start Development Server

After installation completes, start the development server:

```bash
npm run dev
```

### 3. Open the Application

Once the server starts, you'll see output like:

```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Open your browser and navigate to `http://localhost:5173`

## Application Features

### 📱 Chat Interface
- Natural conversation with your AI strategic coworker
- Ask about priorities, emails, meetings, and more
- Context-aware responses based on your communication channels
- Quick action buttons for common queries

### 📊 Dashboard
- Overview of all connected communication channels
- Real-time priority task list with completion tracking
- AI-generated insights about your communication patterns
- Channel sync status and unread counts

### ⚙️ Settings
- Connect/disconnect communication channels
- Configure AI assistant preferences
- Set up notifications and daily digest
- Manage API keys for AI providers

## Customization

### Adding Real Integrations

The current app uses mock data. To integrate with real services:

1. **Email (Gmail)**:
   - Set up Google Cloud project
   - Enable Gmail API
   - Implement OAuth2 authentication
   - Create backend endpoint to fetch emails

2. **Microsoft Teams**:
   - Register app in Azure AD
   - Request Microsoft Graph API permissions
   - Implement OAuth2 flow
   - Use Graph API to fetch Teams messages

3. **Calendar Integration**:
   - Use Google Calendar API or Microsoft Graph
   - Fetch upcoming events
   - Sync meeting data

### Adding AI Provider

To enable real AI conversations:

1. **OpenAI Integration**:
   ```typescript
   // In src/services/aiService.ts
   import OpenAI from 'openai';
   
   const openai = new OpenAI({
     apiKey: process.env.VITE_OPENAI_API_KEY,
   });
   
   export async function generateResponse(message: string, context: any) {
     const response = await openai.chat.completions.create({
       model: 'gpt-4',
       messages: [
         { role: 'system', content: 'You are a strategic coworker...' },
         { role: 'user', content: message }
       ],
     });
     return response.choices[0].message.content;
   }
   ```

2. **Create `.env` file**:
   ```
   VITE_OPENAI_API_KEY=your-api-key-here
   ```

## Troubleshooting

### Port 5173 is already in use
If port 5173 is occupied, Vite will automatically try the next available port.

### Module not found errors
Run `npm install` again to ensure all dependencies are installed.

### TypeScript errors
The project uses strict TypeScript. Check the terminal for specific error messages.

### Build fails
Try deleting `node_modules` and `package-lock.json`, then run `npm install` again.

## Production Build

To create a production build:

```bash
npm run build
```

The optimized files will be in the `dist` folder. You can deploy these to any static hosting service:
- Vercel
- Netlify
- AWS S3 + CloudFront
- Azure Static Web Apps
- GitHub Pages

## Next Steps

1. ✅ Install Node.js (if not already installed)
2. ✅ Run `npm install`
3. ✅ Run `npm run dev`
4. ✅ Open http://localhost:5173
5. Explore the chat interface and dashboard
6. Configure real integrations (optional)
7. Add AI provider integration (optional)
8. Deploy to production (optional)

## Support

For issues or questions:
- Check the main README.md for project overview
- Review the code comments in the source files
- Common issues are addressed in this guide

Enjoy your Strategic Coworker AI assistant! 🚀
