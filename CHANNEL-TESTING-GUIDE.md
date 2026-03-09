# Channel Testing Guide – Othain Group

This guide explains how to test the configured channels (Teams, Email, SharePoint, Calendar) for Othain Group with real data.

## Prerequisites

1. **Azure credentials** – Fill in `backend/companies-config.json` with:
   - Azure App (client) ID
   - Client Secret
   - Tenant ID
   - User Principal Name (e.g. `strategic-monitor@othaingroup.com`) for app-only access

2. **Config UI** – Or use Settings → Companies → Configure for each channel to enter credentials (they persist to `companies-config.json`).

## How to Test

### Option 1: Config Dashboard (UI)

1. Start the backend: `node backend/server.js` (from project root or `cd backend`)
2. Start the frontend: `npm run dev`
3. Open **Settings** → **Companies**
4. Select **Othain Group**
5. Click **Test Channels**

Results appear in a panel below the button. Each channel shows either real data or an error with a clear message.

### Option 2: Direct API Call

With the backend running on port 3000:

```bash
GET http://localhost:3000/api/test/channels?companyId=1
```

Or via browser: `http://localhost:3000/api/test/channels?companyId=1`

## Expected Response

Example JSON when credentials are valid:

```json
{
  "company": "Othain Group",
  "channels": {
    "teams": {
      "teams": [{"id": "...", "name": "Team Name"}],
      "unreadMessages": 5,
      "mentions": []
    },
    "email": {
      "unreadCount": 3,
      "messages": [...]
    },
    "calendar": {
      "todayEvents": [...],
      "upcoming": [...]
    },
    "sharepoint": {
      "sites": [...],
      "recentFiles": [...]
    }
  },
  "timestamp": "2026-02-12T..."
}
```

If a channel is not configured, you’ll see an error like:

```json
"teams": { "error": "Teams not configured. Add Azure App ID, Client Secret, Tenant ID to companies-config.json" }
```

## Azure App Permissions

The Azure app must have these **Application** permissions (admin consent required):

| Channel    | Permissions                                              |
|-----------|-----------------------------------------------------------|
| Teams     | Channel.ReadBasic.All, ChannelMessage.Read.All, Chat.Read.All, Team.ReadBasic.All |
| Email     | Mail.Read                                                 |
| Calendar  | Calendars.Read, User.Read.All                             |
| SharePoint| Sites.Read.All, Files.Read.All                            |

Use one Azure app for all channels when possible.

## Troubleshooting

- **"Failed to get access token"** – Check Client ID, Secret, and Tenant ID.
- **"Access denied"** – Verify admin consent is granted for the app.
- **"User not found"** – Ensure `userPrincipalName` exists and is correct.
- **Backend won’t start** – Stop any process using port 3000, then restart.
