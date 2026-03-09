# Permanent Cloudflare Tunnel Setup

Get a **fixed URL** that never changes so you only configure Twilio once.

---

## Requirements

You need **one** of these:

| Option | Cost | Effort |
|--------|------|--------|
| **A. Domain in Cloudflare** | Free DNS; domain $1–15/year | One-time setup |
| **B. ngrok paid** | $8/month | Easiest, no domain |
| **C. Cloudflare Workers dev** | Free | May work if you have workers.dev |

---

## Option A: Permanent Cloudflare Tunnel (with domain)

### Step 1: Get a domain

- **Cloudflare Registrar:** https://dash.cloudflare.com → Domain Registration (at-cost, no mark-up)
- **Or use any domain** you own and add it to Cloudflare (free DNS)

### Step 2: Add domain to Cloudflare (if not already)

1. Go to https://dash.cloudflare.com
2. Add a site → Enter your domain
3. Choose a plan (Free) → Continue
4. Update nameservers at your registrar as instructed

### Step 3: Create the tunnel

```powershell
cd c:\Users\deepe\strategic-coworker-app
.\cloudflared.exe tunnel login
.\cloudflared.exe tunnel create strategic-advisor
```

Note the tunnel ID from the output (e.g. `abc123-def456-ghi789`).

### Step 4: Create config file

Create `C:\Users\deepe\.cloudflared\config.yml`:

```yaml
url: http://localhost:3000
tunnel: YOUR_TUNNEL_ID
credentials-file: C:\Users\deepe\.cloudflared\YOUR_TUNNEL_ID.json
```

Replace `YOUR_TUNNEL_ID` with the ID from Step 3.

### Step 5: Route DNS (creates permanent URL)

```powershell
.\cloudflared.exe tunnel route dns strategic-advisor webhook.YOURDOMAIN.com
```

Replace `YOURDOMAIN.com` with your domain (e.g. `webhook.jerseytechpartners.com`).

This creates a CNAME so `https://webhook.yourdomain.com` always points to your tunnel.

### Step 6: Run the tunnel

```powershell
.\cloudflared.exe tunnel run strategic-advisor
```

**Permanent Twilio webhook URL:**
```
https://webhook.yourdomain.com/webhook/whatsapp
```

### Step 7: Install as Windows service (auto-start)

```powershell
# Run as Administrator
cloudflared service install
net start cloudflared
```

---

## Option B: ngrok paid (simplest, no domain)

1. Go to https://dashboard.ngrok.com/billing/subscription
2. Upgrade to paid ($8/mo)
3. Reserve a subdomain: https://dashboard.ngrok.com/cloud-edge/domains
4. Run: `ngrok http 3000 --domain=yourname.ngrok-free.app`
5. Use in Twilio: `https://yourname.ngrok-free.app/webhook/whatsapp`

---

## Option C: Try workers.dev (free, may work)

If you have a Cloudflare account, you may have a free `workers.dev` subdomain:

1. Go to https://dash.cloudflare.com → Workers & Pages
2. Check if you have a workers.dev subdomain
3. If yes, you can try routing: `cloudflared tunnel route dns strategic-advisor webhook.YOURNAME.workers.dev`

---

## Troubleshooting

### "Could not find zone for hostname"
- The domain must be in your Cloudflare account
- Use the exact format: `subdomain.yourdomain.com`

### "Tunnel not found"
- Run `.\cloudflared.exe tunnel list` to see tunnel names
- Use the exact name: `strategic-advisor`

### Still getting Twilio default message
1. **Verify tunnel is reachable:** Open `https://YOUR-TUNNEL-URL/webhook/whatsapp` in a browser (GET). You should see JSON confirming the endpoint is reachable.
2. **Check backend logs:** When you send a WhatsApp message, the backend console should show `📥 Webhook received from Twilio`. If not, Twilio isn't reaching your server.
3. **Check Twilio webhook logs:** https://console.twilio.com → Monitor → Logs → Webhooks — see if Twilio got 200 or an error.
4. **Ensure URL ends with /webhook/whatsapp** (no trailing slash)
5. **Method must be POST** in Twilio sandbox settings
