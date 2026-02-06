# Quick Fixes

## ✅ Issue 1: Multi-Company Monitoring - FIXED!

**What Changed:**
- ✅ You can now monitor **multiple companies simultaneously**
- ✅ Checkboxes instead of radio buttons
- ✅ "Primary" company + multiple "Monitoring" companies
- ✅ Status shows: "X companies being monitored"

**How to Use:**
1. Go to **Settings** → **Companies**
2. **Check the boxes** next to companies you want to monitor
3. All checked companies will be actively monitored
4. Click **"Set as Primary"** on any monitored company to make it primary

**Example:**
```
☑ Othain Group         [Primary]
☑ Jersey Tech Partners [Monitoring]  
☑ Strivio LLC         [Monitoring]
```

---

## 🔧 Issue 2: Blank Integrations Page - Fix Steps

### Quick Fix: Restart App

**Step 1: Stop the server**
- In your terminal/PowerShell: Press **Ctrl+C**

**Step 2: Restart**
```powershell
npm run dev
```

**Step 3: Clear Browser Cache**
- Press **Ctrl+Shift+Delete**
- Select "Cached images and files"
- Click "Clear data"
- Refresh page (F5)

### If Still Blank: Check Browser Console

1. Press **F12** to open DevTools
2. Go to **Console** tab
3. Look for red error messages
4. Common errors and fixes:

**Error: "Cannot read property of undefined"**
- Fix: Restart app (`npm run dev`)

**Error: "Component did not render"**
- Fix: Hard refresh (Ctrl+Shift+R)

**Error: "Failed to fetch"**
- Fix: Check if dev server is running

### Manual Verification:

Navigate directly to Integrations:
1. Go to Settings
2. Click the **"Integrations"** tab (third tab)
3. Should see:
   - Gmail section
   - Microsoft 365 section
   - Slack section
   - Discord section
   - Jira section
   - GitHub section

### If Integrations Still Blank:

Check component is loading:
```powershell
# In browser console (F12), type:
document.querySelector('[data-component="integration-settings"]')
```

If null, the component isn't rendering. Try:
1. Close all browser tabs
2. Stop dev server (Ctrl+C)
3. Start fresh:
   ```powershell
   npm run dev
   ```
4. Open new browser window
5. Go to Settings → Integrations

---

## 🎯 After Restart - What You Should See:

### Companies Tab:
```
☐ Othain Group          [Start Monitoring]  [Edit] [Delete]
☐ Jersey Tech Partners  [Start Monitoring]  [Edit] [Delete]
☐ Strivio LLC          [Start Monitoring]  [Edit] [Delete]
```

Click checkboxes to enable monitoring!

### Integrations Tab:
```
┌─────────────────────────────────────────┐
│ Gmail (Personal Access)                  │
│ □ Enabled                                │
│ Status: Not Configured                   │
│ [Configure fields...]                    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Microsoft 365                            │
│ □ Enabled                                │
│ Status: Not Configured                   │
│ Backend Required ⚠️                      │
└─────────────────────────────────────────┘

[... more integrations ...]
```

---

## 💡 Pro Tips:

### Multi-Company Monitoring:
1. **Primary Company** - Main focus, shows in Company Selector
2. **Monitoring Companies** - Also tracked, data aggregated
3. **Inactive Companies** - Not monitored, data ignored

### Company Selector (Sidebar):
- Shows **Primary** company
- Drop-down lists **all monitored** companies
- Click to switch primary focus

### Strategic Queries Across Companies:
- "Compare performance across my companies"
- "Which company needs attention most?"
- "What conflicts exist in any company?"

---

## 🆘 Still Having Issues?

### Blank Integrations Page:

**Nuclear Option:**
```powershell
# Stop server
Ctrl+C

# Clear everything
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json

# Reinstall
npm install

# Restart
npm run dev
```

### Companies Not Saving:

**Clear localStorage:**
1. Press F12
2. Go to **Application** tab
3. Left sidebar → **Local Storage** → `http://localhost:5173`
4. Right-click → **Clear**
5. Refresh page (F5)

### Model Not Working:

**Re-pull Ollama model:**
```powershell
ollama pull llama3.1:8b
```

Then restart app.

---

## ✅ Verification Checklist:

After fixes, verify:

- [ ] Multiple companies can be checked simultaneously
- [ ] Status shows "X companies being monitored"
- [ ] Company selector shows primary company
- [ ] Integrations tab shows all integration sections
- [ ] Each integration has toggle and fields
- [ ] No console errors (F12)
- [ ] Local LLM still enabled and working
- [ ] Chat responds to queries

---

**If issues persist, let me know the specific error message from browser console (F12)!**
