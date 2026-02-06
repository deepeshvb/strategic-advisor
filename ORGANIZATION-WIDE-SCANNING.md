# Organization-Wide Communication Scanning Setup

## Overview

Your Strategic Advisor is designed to scan ALL communications across your organization—not just your personal inbox. This gives you a CEO-level view of what's really happening: conflicts between teams, misalignments, hidden risks, and opportunities.

## Architecture

### What Gets Scanned

1. **Corporate Email (All Mailboxes)**
   - Every employee's inbox and sent items
   - All distribution lists and group emails
   - Cross-department threads

2. **Microsoft Teams (All Channels)**
   - Public channels across all teams
   - Private team conversations (with proper permissions)
   - Direct messages (if admin access configured)

3. **Slack (All Workspaces)**
   - All public channels
   - Private channels where you have access
   - Direct messages (with appropriate permissions)

4. **Calendars (Organization-Wide)**
   - All meeting schedules
   - Meeting attendees and patterns
   - Who's meeting with whom

## Required Permissions

### Microsoft 365 / Exchange (for Email + Teams)

You need **Application Permissions** (not delegated) to scan all mailboxes:

```
Application Permissions needed:
- Mail.Read (read all mailboxes)
- Mail.ReadBasic.All (read basic properties)
- ChannelMessage.Read.All (read all Teams channels)
- Chat.Read.All (read Teams chats - requires admin consent)
- Calendars.Read (read all calendars)
- User.Read.All (read user profiles)
```

**Setup:**
1. Azure AD admin creates an App Registration
2. Grant **Application Permissions** (not Delegated)
3. Admin must consent for entire organization
4. Use Client Credentials flow (app-only authentication)

### Google Workspace (for Gmail)

Requires **Domain-Wide Delegation**:

```
OAuth Scopes needed:
- https://www.googleapis.com/auth/gmail.readonly (all mailboxes)
- https://www.googleapis.com/auth/calendar.readonly (all calendars)
- https://www.googleapis.com/auth/admin.directory.user.readonly (user list)
```

**Setup:**
1. Create Service Account in Google Cloud
2. Enable Domain-Wide Delegation
3. Super Admin grants access via Admin Console
4. Add scopes to allowed API access

### Slack (All Workspaces)

```
Bot Token Scopes needed:
- channels:history (public channels)
- channels:read (channel info)
- groups:history (private channels)
- im:history (DMs - requires admin)
- users:read (user info)
```

## Privacy & Compliance

### Important Considerations

1. **Legal Requirements**
   - Ensure compliance with employee privacy laws in your jurisdiction
   - May require employee notification/consent
   - Check company policies on email monitoring

2. **Data Security**
   - All data processed locally or in secure cloud environment
   - No raw message content stored permanently
   - Only insights and summaries retained

3. **Access Control**
   - Only CEO (and designated executives) have access to insights
   - Credentials stored in secure `.env` file
   - Regular credential rotation recommended

4. **Transparency**
   - Consider notifying employees that organization-wide communication analysis is in use
   - Focus messaging on "improving coordination" and "identifying process bottlenecks"

## Configuration

### Environment Variables

Add to your `.env`:

```env
# Organization-wide scanning enabled
VITE_SCAN_ALL_MAILBOXES=true
VITE_SCAN_ALL_TEAMS=true
VITE_SCAN_ALL_SLACK=true

# Microsoft 365 (Application Permissions)
VITE_MICROSOFT_TENANT_ID=your-tenant-id
VITE_MICROSOFT_CLIENT_ID=your-app-id
VITE_MICROSOFT_CLIENT_SECRET=your-app-secret
VITE_MICROSOFT_GRAPH_SCOPE=.default

# Google Workspace (Service Account)
VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL=scanner@your-domain.iam.gserviceaccount.com
VITE_GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./service-account-key.json
VITE_GOOGLE_DOMAIN=your-company.com

# Slack (Bot with extended permissions)
VITE_SLACK_BOT_TOKEN=xoxb-your-bot-token
VITE_SLACK_WORKSPACE_ID=your-workspace-id
```

## How It Works

### Data Collection Flow

1. **Scheduled Scanning** (every 5-15 minutes)
   ```
   → Fetch all new emails across all mailboxes
   → Fetch all new Teams/Slack messages
   → Fetch calendar updates
   → Extract metadata (sender, recipient, topic, sentiment)
   ```

2. **Analysis Pipeline**
   ```
   → Identify cross-team threads (same topic, different channels)
   → Detect conflicts (contradictory statements)
   → Extract action items and deadlines
   → Classify urgency and importance
   → Map team relationships and communication patterns
   ```

3. **CEO Briefing Generation**
   ```
   → Synthesize insights from all sources
   → Identify what requires CEO attention
   → Format as conversational strategic briefing
   → Highlight conflicts and misalignments
   ```

### Example Insights

**Cross-Team Conflict Detection:**
"I'm seeing misalignment between Product and Sales. Product team discussing a Q3 launch in their channel, but Sales has been promising clients Q2 delivery in 8 different email threads this week."

**Hidden Bottlenecks:**
"Design team mentioned as a blocker in 15 conversations across Engineering, Product, and Marketing. They're overwhelmed but haven't escalated to leadership."

**Cultural Signals:**
"Executive team communications are collaborative and aligned. But middle management shows passive-aggressive patterns in cross-department threads—suggests execution issues below leadership level."

## Getting Started

### Phase 1: Personal Inbox (Current)
- Start with just your own email and Teams
- Validate the system works
- Refine the insights you want

### Phase 2: Key Teams
- Add scanning for your direct reports' inboxes
- Add executive team's communications
- Monitor specific high-priority teams

### Phase 3: Organization-Wide
- Enable full scanning after legal/privacy review
- Set up comprehensive monitoring
- Configure daily CEO briefings

## Best Practices

1. **Start Small**: Begin with executive team, expand gradually
2. **Focus on Patterns**: Don't get lost in individual messages
3. **Act on Insights**: Use the information to improve coordination
4. **Review Regularly**: Weekly review of what insights are most valuable
5. **Protect Privacy**: Use insights for organizational health, not individual surveillance

## Support

For setup assistance with organization-wide permissions:
- Microsoft 365: Contact your IT admin or Microsoft support
- Google Workspace: Work with Google Workspace admin
- Slack: Contact Slack Enterprise Grid support for advanced permissions

---

**Note**: Organization-wide scanning requires enterprise-level administrative access. Work with your IT/security team to implement properly and ensure compliance with all relevant policies and regulations.
