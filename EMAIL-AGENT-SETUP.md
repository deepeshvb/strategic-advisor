# Agent Email Address – Send Questions via Email

## Agent Email Address (working, tested)

**`agent@parse.lobstermoltys.com`**

Send any question, request, or update to this address. You will receive a reply with **live data** from your configured channels (email, Teams, etc.). The agent will:
- Process your question (e.g. "Review Paul Suresh's emails and summarize...")
- Fetch relevant data (enterprise-wide or employee-specific)
- Reply via email to the sender

---

## Setup Steps (SendGrid Inbound Parse)

### 1. Verify your domain in SendGrid

1. Go to [SendGrid Dashboard](https://app.sendgrid.com) → **Settings** → **Sender Authentication**
2. If `lobstermoltys.com` is not verified, add it and complete DNS verification

### 2. Add Inbound Parse host

1. Go to **Settings** → **Inbound Parse**
2. Click **Add Host & URL**
3. **Hostname:** `parse` (or `agent` or `inbox`)
4. **Domain:** `lobstermoltys.com`
5. **Destination URL:** `https://webhook.lobstermoltys.com/webhook/email`
6. Leave **"POST the raw, full MIME message"** unchecked (default format gives parsed `text`/`html` fields)
7. Save

### 3. Add MX record

Add this MX record for your receiving subdomain:

| Type | Host | Value | Priority |
|------|------|-------|----------|
| MX | parse (or agent) | mx.sendgrid.net | 10 |

So for `parse.lobstermoltys.com`, the host would be `parse` and the full receiving address would be `agent@parse.lobstermoltys.com` (or `you@parse.lobstermoltys.com` – any local-part works).

### 4. Wait for DNS propagation

MX records can take 5–60 minutes to propagate.

### 5. Configure reply sending (required)

The agent must send replies via email. Add one of these to `.env.backend`:

**Option A – SendGrid (recommended):**
1. Go to [SendGrid](https://app.sendgrid.com) → **Settings** → **API Keys** → **Create API Key**
2. Create a key with **Mail Send** permission
3. Add to `.env.backend`:
   ```
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxx (your real key, starts with SG.)
   SENDGRID_FROM=agent@lobstermoltys.com
   ```
4. Verify `SENDGRID_FROM` in SendGrid Sender Authentication

**Option B – Outlook/Office 365:**
```
EMAIL_USER=deepesh.vellore@jerseytechpartners.com
EMAIL_PASSWORD=your-app-password
EMAIL_PROVIDER=outlook
```

### 6. Test

Send an email to **agent@parse.lobstermoltys.com** with e.g.:

- **Subject:** Test (or **Brief**, **Status**, **Briefing** for a live briefing)
- **Body:** What's happening across my companies?

You should receive a reply from the Strategic Advisor with **live data** from configured channels (emails, Teams) within a few minutes.

---

## Alternative: Mailgun, Postmark, etc.

Any inbound email service that can POST to a webhook works. Configure it to:

- **URL:** `https://webhook.lobstermoltys.com/webhook/email`
- **Format:** Either form-urlencoded (SendGrid style) or raw MIME, depending on what the backend expects

The backend expects `from`, `subject`, and `text` (or `plain` or `Body`) in the POST body.
