# How to Get Your Anthropic API Key

## When Do You Need This?

You need an Anthropic API key if you want to use:
- ☁️ **Cloud API Only** mode
- 🔄 **Hybrid Mode** (local for sensitive, cloud for general queries)

You do **NOT** need an API key if using:
- 🔒 **Local Only** mode (100% private, uses Ollama)

---

## Step-by-Step Instructions

### 1. Create an Anthropic Account

1. Go to: **https://console.anthropic.com**
2. Click **"Sign Up"** (top right)
3. Enter your email and create a password
4. Verify your email address

### 2. Add Payment Method (Required for Production)

⚠️ **Note:** Anthropic requires a payment method for API access, even though you get free credits initially.

1. In the console, go to **"Settings"** → **"Billing"**
2. Click **"Add Payment Method"**
3. Enter your credit card details
4. You'll get **$5 in free credits** to start

**Cost Estimate:**
- Typical query: ~$0.01 - $0.05
- Your $5 credit = ~100-500 queries
- After that: Pay as you go

### 3. Generate API Key

1. In the console, go to **"Settings"** → **"API Keys"**
2. Click **"Create Key"**
3. Give it a name: `"Strategic Advisor App"`
4. Copy the key **immediately** (you can only see it once!)
   - It looks like: `sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 4. Add Key to Your .env File

1. Open your project folder: `c:\Users\deepe\strategic-coworker-app\`
2. Open the `.env` file in any text editor
3. Find this line:
   ```
   VITE_ANTHROPIC_API_KEY=your-api-key-here
   ```
4. Replace `your-api-key-here` with your actual key:
   ```
   VITE_ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
5. Save the file

### 5. Restart Your Dev Server

```powershell
# If the app is running, stop it first (Ctrl+C)
# Then restart:
npm run dev
```

Or just run:
```powershell
.\LAUNCH-NOW.bat
```

### 6. Enable Cloud API or Hybrid Mode

1. Open the app in your browser (http://localhost:5173)
2. Go to **Settings** → **Local LLM**
3. Click either:
   - **"Cloud API Only"** button (all queries use cloud)
   - **"Hybrid Mode"** button (smart routing)
4. You'll see confirmation that the mode is active

---

## Testing Your Setup

### Test Cloud API Mode:

1. Select **"Cloud API Only"** in settings
2. In chat, ask: **"Hello, are you working?"**
3. ✅ Should get a response from Claude
4. Check console (F12) for: `"Using cloud API..."`

### Test Hybrid Mode:

1. Select **"Hybrid Mode"** in settings
2. Ask a **sensitive query**: **"Summarize my company emails"**
   - ✅ Should use Local LLM
   - Console shows: `"Hybrid mode: Query classified as SENSITIVE"`
3. Ask a **general query**: **"What is strategic planning?"**
   - ✅ Should use Cloud API
   - Console shows: `"Hybrid mode: Query classified as GENERAL"`

---

## Troubleshooting

### Error: "invalid x-api-key"
- Your API key is incorrect
- Check for extra spaces or incomplete copy
- Regenerate key in console.anthropic.com

### Error: "VITE_ANTHROPIC_API_KEY not found"
- Make sure `.env` file is in the root directory
- Restart dev server after editing `.env`
- Key must start with `sk-ant-`

### Error: "401 authentication_error"
- API key is invalid or revoked
- Check billing is set up in Anthropic console
- Regenerate a new key

### High Costs?
- Switch to **Local Only** mode (free)
- Or use **Hybrid Mode** (only non-sensitive queries use cloud)
- Monitor usage: https://console.anthropic.com/settings/usage

---

## Privacy vs Cost Trade-offs

| Mode | Privacy | Cost | Speed | Setup |
|------|---------|------|-------|-------|
| **Local Only** | 🟢 100% Private | 🟢 $0 | 🟡 Moderate | Install Ollama |
| **Cloud API Only** | 🔴 Data Sent to Cloud | 🔴 ~$0.01-0.10/query | 🟢 Fast | API Key |
| **Hybrid** | 🟢 Sensitive = Private | 🟡 ~$0.005/query | 🟢 Fast | Both |

**Recommendation:** Use **Hybrid Mode** for best of both worlds!

---

## Need Help?

- Anthropic Documentation: https://docs.anthropic.com
- API Key Issues: support@anthropic.com
- App Settings: See `LAUNCH-GUIDE.md`
