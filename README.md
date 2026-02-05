# Strategic Coworker - AI Communication Assistant

An intelligent React application that monitors your company's communication channels (email, Teams, Slack, calendar) and acts as your strategic coworker, helping you prioritize and manage daily tasks through conversational AI.

## Features

### 🤖 Intelligent Chat Interface
- Natural conversation with AI assistant
- Context-aware responses based on your communication channels
- Quick action buttons for common queries
- Real-time message streaming

### 📊 Comprehensive Dashboard
- Overview of all connected communication channels
- Priority task management with completion tracking
- AI-generated insights and trends
- Real-time sync status for all integrations

### ⚙️ Flexible Settings
- Easy channel connection/disconnection
- Multiple integration options (Gmail, Outlook, Teams, Slack, Calendars)
- AI assistant configuration
- Smart notifications and daily digest settings

### 🎯 Priority Management
- Automatic priority detection (Urgent, High, Medium, Low)
- Source tracking (Email, Teams, etc.)
- Due date monitoring
- Task completion tracking

### 💡 AI-Powered Insights
- Communication volume analysis
- Meeting pattern detection
- Focus time recommendations
- Stakeholder activity tracking

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
src/
├── components/
│   ├── ChatInterface.tsx      # Main chat UI component
│   ├── Dashboard.tsx           # Dashboard with insights and priorities
│   └── Settings.tsx            # Configuration and integrations
├── services/
│   └── mockData.ts            # Mock data and AI response generator
├── types.ts                   # TypeScript type definitions
├── App.tsx                    # Main application component
├── index.css                  # Global styles
└── main.tsx                   # Application entry point
```

## Configuration

### API Integration

To connect real communication channels, you'll need to:

1. Set up OAuth2 authentication for each service
2. Configure API credentials in the Settings page
3. Implement backend API endpoints for:
   - Email fetching (Gmail API, Microsoft Graph API)
   - Teams/Slack integration
   - Calendar synchronization

### AI Provider

Configure your AI provider (OpenAI, Anthropic, etc.) in the Settings page:
- Add your API key
- The app will use this for intelligent conversation and analysis

## Features to Implement

This is a frontend demo with mock data. To make it production-ready:

1. **Backend API**:
   - Authentication service
   - Channel integration endpoints
   - AI conversation API
   - Data persistence

2. **Real Integrations**:
   - Microsoft Graph API (Outlook, Teams, Calendar)
   - Gmail API
   - Slack API
   - Other communication platforms

3. **AI Enhancement**:
   - OpenAI/Anthropic integration
   - Context-aware prompting
   - Semantic search across messages
   - Automatic summarization

4. **Security**:
   - OAuth2 flows
   - Token management
   - Data encryption
   - Privacy controls

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Adding New Channels

To add support for a new communication channel:

1. Add the channel type to `types.ts`
2. Update `mockData.ts` with sample data
3. Add the integration UI in `Settings.tsx`
4. Implement the API connector

## Contributing

This is a starter template. Feel free to fork and customize for your needs!

## License

MIT License - feel free to use this for your own projects.

## Support

For questions or issues, please open an issue in the repository.

---

Built with ❤️ using React and TypeScript
