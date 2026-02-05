# 🚀 Quick Start: Real Data Integration

Your Strategic Coworker AI is now ready to connect to your real communication channels!

## 📊 Current Status

**✅ Completed:**
- Claude AI integration (working)
- Voice transcription with proper cleanup
- Markdown rendering for beautiful chat responses
- Integration framework (ready for your APIs)
- Synthetic demo data (currently active)

**🔄 Next Step: Connect Your Real Data**

---

## 🎯 How It Works Now

### Demo Mode (Current State)
- App is using **synthetic demo data** to demonstrate functionality
- All screens show sample Teams messages, emails, and calendar events
- This allows you to test the AI and UI without connecting real accounts

### Real Data Mode (When You're Ready)
- Connect your actual Gmail, Teams, Slack, Discord, Jira, GitHub accounts
- App automatically switches to **real data** when integrations are configured
- Integration status shown on all screens (Chat & Dashboard)

---

## 🏃 Quick Setup Steps

### Option 1: Keep Using Demo Data (Recommended for Testing)
**No action needed!** The app works out of the box with realistic synthetic data.

### Option 2: Connect Real Integrations

#### Step 1: Choose Your Integrations
Pick which platforms you want to connect:
- ✉️ **Gmail** - Personal/work email
- 📧 **Microsoft** - Teams, Outlook, Calendar (all-in-one)
- 💼 **Slack** - Team workspace
- 🎮 **Discord** - Community servers
- 🎯 **Jira** - Project tickets
- 🐙 **GitHub** - Code & PRs

#### Step 2: Follow The Setup Guide
Open `REAL-INTEGRATIONS-SETUP.md` for detailed instructions on:
- Creating API credentials for each platform
- OAuth setup (where required)
- Adding API keys to your `.env` file

#### Step 3: Add Your API Keys
Update `.env` file (use `.env.example` as a template):
```env
# Example for Gmail
VITE_GMAIL_CLIENT_ID=your_client_id_here
VITE_GMAIL_CLIENT_SECRET=your_secret_here

# Example for Microsoft Teams
VITE_MICROSOFT_CLIENT_ID=your_client_id_here
VITE_MICROSOFT_CLIENT_SECRET=your_secret_here
```

#### Step 4: Restart & Connect
```bash
# Restart your dev server
npm run dev
```

The app will automatically:
- Detect configured integrations
- Show connection status on Dashboard and Chat screens
- Switch from synthetic data to real data
- Start fetching your actual messages, emails, and events

---

## 📍 Port Information

### Development Server
**Default Port:** `http://localhost:5173`

You can change this in `vite.config.ts` if needed.

### For OAuth Redirects
When setting up OAuth apps (Gmail, Microsoft, Slack, etc.), use:
```
http://localhost:5173/auth/{provider}/callback
```

Examples:
- Gmail: `http://localhost:5173/auth/gmail/callback`
- Microsoft: `http://localhost:5173/auth/microsoft/callback`
- Slack: `http://localhost:5173/auth/slack/callback`

---

## 🎨 What You'll See

### Integration Status Card
Both **Chat** and **Dashboard** now show an "Integration Status" card:

- **No Integrations:** Yellow warning with setup instructions
- **Integrations Connected:** Green checkmarks for each connected platform
- **Click "Setup Guide":** Toggle inline instructions

### Data Source Indicator
At the bottom of the Integration Status card:
- **Demo mode active** - Using synthetic data
- **Real data is being used** - Connected to your accounts

---

## 🧪 Testing Your Setup

### 1. Check Integration Status
- Open the app
- Look for the "Integration Status" card
- Should show yellow warning if no real integrations

### 2. Configure One Integration
- Start with Gmail or Microsoft Teams (most common)
- Follow `REAL-INTEGRATIONS-SETUP.md` instructions
- Add credentials to `.env`
- Restart dev server

### 3. Verify Connection
- Integration Status card should now show green checkmark
- Console logs will show "📊 Using REAL data from configured integrations"
- Ask Claude to "summarize my recent messages"
- Response should reference your actual data

### 4. Add More Integrations
- Repeat for Slack, Discord, GitHub, Jira as needed
- Each new integration appears in the status card
- All data automatically merged in Claude's analysis

---

## 🔍 Troubleshooting

### "No integrations configured" Warning
✅ **This is normal** if you haven't added API keys yet
✅ App works perfectly with demo data
✅ Follow `REAL-INTEGRATIONS-SETUP.md` when ready

### Integration Added But Not Showing
- Check `.env` file has correct `VITE_` prefix
- Verify no typos in environment variable names
- Restart dev server: `Ctrl+C` then `npm run dev`
- Check browser console for error messages

### OAuth Redirect Not Working
- Ensure redirect URI in OAuth app matches exactly
- Must include `http://` protocol
- Port must match (default: 5173)
- Try in incognito/private mode

### Console Shows Errors
- Check API credentials are valid and not expired
- Verify you have required permissions/scopes
- Look for rate limiting (too many requests)
- Check network tab in browser DevTools

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `REAL-INTEGRATIONS-SETUP.md` | **Complete setup guide** for all 8 integrations |
| `.env.example` | Template for environment variables |
| `QUICK-START-REAL-DATA.md` | **This file** - Quick reference |
| `README.md` | General project information |

---

## 🎯 Recommended Setup Order

### For Most Users:
1. **Microsoft Teams** (if you use Office 365)
   - Provides Teams, Outlook, and Calendar all at once
   - Single OAuth setup for multiple channels
   
2. **Gmail** (if personal email is important)
   - Simple OAuth setup
   - Widely documented

3. **Slack** (if your team uses it)
   - Easy bot token setup
   - Rich message data

### For Technical Teams:
4. **GitHub** (for code notifications and PRs)
5. **Jira** (for project tracking)

### Optional:
6. **Discord** (for community/gaming teams)

---

## 💡 Pro Tips

1. **Start with Demo Data**
   - Test all features with synthetic data first
   - Understand the UI and AI capabilities
   - Then add real integrations one at a time

2. **Use OAuth When Possible**
   - More secure than API keys
   - Easier token refresh
   - Better permission management

3. **Limit Permissions**
   - Only request scopes you actually need
   - Read-only access is sufficient for most use cases
   - Can always add more later

4. **Monitor API Usage**
   - Check each platform's rate limits
   - Set up email alerts for quota warnings
   - Adjust sync intervals if needed

5. **Keep Credentials Safe**
   - `.env` is in `.gitignore` (already configured)
   - Never commit API keys to GitHub
   - Rotate tokens regularly (every 90 days)

---

## ✅ You're All Set!

Your app is production-ready and can scale from:
- **Demo mode** (synthetic data) → Perfect for testing
- **Partial integration** (1-2 platforms) → Quick start
- **Full integration** (all 8 platforms) → Complete visibility

**Start with what you have, expand when you're ready!**

---

## 🆘 Need Help?

1. Check console logs for detailed error messages
2. Review `REAL-INTEGRATIONS-SETUP.md` for platform-specific guidance
3. Verify `.env` file format matches `.env.example`
4. Ensure dev server was restarted after `.env` changes

---

**Happy integrating! 🚀**
