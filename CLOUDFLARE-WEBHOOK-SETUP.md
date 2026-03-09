# Cloudflare Tunnel – Step-by-Step Setup for Twilio WhatsApp Webhook

This guide sets up Cloudflare Tunnel so Twilio can reach your webhook. No browser warning, no paid plan.

---

## Quick option (5 minutes)

**Requires:** Backend + Frontend running, cloudflared installed.

### 1. Download cloudflared
- Go to: https://github.com/cloudflare/cloudflared/releases/latest
- Download: **cloudflared-windows-amd64.exe**
- Rename to `cloudflared.exe` and put in `c:\Users\deepe\strategic-coworker-app\`

### 2. Log in (one-time)
```powershell
cd c:\Users\deepe\strategic-coworker-app
.\cloudflared.exe tunnel login
```
- Browser opens → sign in to Cloudflare (free) → pick a domain → Authorize

### 3. Start Backend & Frontend
- Run `START-BACKEND.bat`
- Run `START-CONFIG-UI.bat`

### 4. Start the tunnel (points to backend for webhooks)
```powershell
.\cloudflared.exe tunnel --url http://localhost:3000
```
- Leave this window open
- Copy the URL shown (e.g. `https://abc-xyz.trycloudflare.com`)

**Note:** Tunnel points to port 3000 (backend) so Twilio webhooks work directly. Config UI: use `http://YOUR-LAPTOP-IP:5173` on same WiFi.

### 5. Configure Twilio
- Go to: https://www.twilio.com/console/sms/whatsapp/sandbox
- Set **When a message comes in** to: `https://YOUR-URL/webhook/whatsapp`
- Save

### 6. Test
Send a WhatsApp message to **+1 415 523 8886**

---

## Full setup (persistent tunnel)

**Use this if you want a fixed URL that survives restarts.** Requires a domain added to Cloudflare.

---

## Prerequisites

- [ ] Backend running (`START-BACKEND.bat`)
- [ ] Frontend running (`START-CONFIG-UI.bat`)
- [ ] Free Cloudflare account: https://dash.cloudflare.com/sign-up

---

## Step 1: Download cloudflared

1. Open: **https://github.com/cloudflare/cloudflared/releases/latest**
2. Download: **cloudflared-windows-amd64.exe** (under Assets)
3. Rename to `cloudflared.exe`
4. Move to: `C:\Users\deepe\strategic-coworker-app\` (or any folder in your PATH)

**Or use PowerShell:**
```powershell
cd c:\Users\deepe\strategic-coworker-app
Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile "cloudflared.exe" -UseBasicParsing
```

---

## Step 2: Log in to Cloudflare

1. Open PowerShell or Command Prompt.
2. Run:
   ```powershell
   cd c:\Users\deepe\strategic-coworker-app
   .\cloudflared.exe tunnel login
   ```
3. A browser window opens.
4. Sign in or create a Cloudflare account.
5. Choose a domain (or skip if you don’t have one).
6. Click **Authorize**.
7. When you see “You have successfully logged in”, close the browser and return to the terminal.

---

## Step 3: Create a tunnel

Run:
```powershell
.\cloudflared.exe tunnel create strategic-advisor
```

You should see something like:
```
Created tunnel strategic-advisor with id abc123-def456-ghi789
```

Copy the tunnel ID (the part after `id`).

---

## Step 4: Create config file

1. In File Explorer, go to: `C:\Users\deepe\.cloudflared\`
   - If it doesn’t exist, create it.

2. Create or edit `config.yml` in that folder with this content:

```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: C:\Users\deepe\.cloudflared\YOUR_TUNNEL_ID.json

ingress:
  - hostname: YOUR_TUNNEL_ID.cfargotunnel.com
    service: http://localhost:5173
  - service: http_status:404
```

Replace `YOUR_TUNNEL_ID` with the ID from Step 3 in both places.

**Example:** If your tunnel ID is `abc123-def456-ghi789`:
```yaml
tunnel: abc123-def456-ghi789
credentials-file: C:\Users\deepe\.cloudflared\abc123-def456-ghi789.json

ingress:
  - hostname: abc123-def456-ghi789.cfargotunnel.com
    service: http://localhost:5173
  - service: http_status:404
```

If you don’t have a hostname yet, use a simpler config:

```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: C:\Users\deepe\.cloudflared\YOUR_TUNNEL_ID.json

ingress:
  - service: http://localhost:5173
```

---

## Step 4b: Route DNS (requires domain in Cloudflare)

If you have a domain in Cloudflare, run:
```powershell
.\cloudflared.exe tunnel route dns strategic-advisor gateway.yourdomain.com
```
Replace `yourdomain.com` with your domain. This creates a CNAME record so `https://gateway.yourdomain.com` points to your tunnel.

---

## Step 5: Start the tunnel

```powershell
.\cloudflared.exe tunnel run strategic-advisor
```

The tunnel will start and show something like:
```
INF Connection established
INF | Your quick Tunnel has been created! Visit it at:
INF | https://abc123-def456-ghi789.cfargotunnel.com
```

Copy the `https://...` URL.

---

## Step 6: Configure Twilio webhook

1. Go to: **https://www.twilio.com/console/sms/whatsapp/sandbox**
2. In **“When a message comes in”**, set:
   ```
   https://YOUR-TUNNEL-ID.cfargotunnel.com/webhook/whatsapp
   ```
3. Method: **POST**
4. Save.

---

## Step 7: Test

1. Ensure backend and frontend are running.
2. Ensure the Cloudflare tunnel is running (`cloudflared tunnel run strategic-advisor`).
3. Send a WhatsApp message to **+1 415 523 8886**.

You should get a reply from the agent.

---

## Troubleshooting

### "Tunnel not found"
- Run `.\cloudflared.exe tunnel list` and confirm the tunnel name.
- Use the exact tunnel name in `tunnel run`.

### "Credentials file not found"
- Ensure the credentials file exists at `C:\Users\deepe\.cloudflared\TUNNEL_ID.json`.
- The tunnel ID in `config.yml` must match the filename.

### Still getting "configure your whatsapp sandbox url"
- Confirm the tunnel URL: `https://YOUR-ID.cfargotunnel.com/webhook/whatsapp`.
- Confirm the backend is running: `http://localhost:3000/health`.
- Confirm the frontend is running: `http://localhost:5173`.
- Confirm the tunnel is running and the `config.yml` points to `http://localhost:5173` (Vite proxies `/webhook` to the backend).

### Port 5173 vs 3000
The tunnel points to **port 5173** (frontend). The Vite proxy forwards `/webhook` to port 3000 (backend). Both must be running.

---

## Run everything at startup

1. **Backend:** `START-BACKEND.bat`
2. **Frontend:** `START-CONFIG-UI.bat`
3. **Tunnel:** `.\cloudflared.exe tunnel run strategic-advisor`

Keep the tunnel window open.

---

## Optional: Run tunnel as a Windows service

```powershell
# Install service (run as Administrator)
cloudflared service install

# Start service
net start cloudflared
```

The tunnel will start automatically with Windows.

---

## Summary

| What | URL/Command |
|------|-------------|
| **Twilio webhook URL** | `https://YOUR-TUNNEL-ID.cfargotunnel.com/webhook/whatsapp` |
| **Config UI (mobile)** | `https://YOUR-TUNNEL-ID.cfargotunnel.com` |
| **Start tunnel** | `.\cloudflared.exe tunnel run strategic-advisor` |
