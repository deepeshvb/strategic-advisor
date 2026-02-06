# 📱 Mobile → Laptop LLM Connection

## Use Laptop's Local LLM from Your Mobile

Your mobile can use the Ollama LLM running on your laptop over the network!

---

## 🎯 Why This Matters

**Privacy + Performance:**
- Sensitive queries processed locally (not sent to cloud)
- Use powerful laptop hardware
- No API costs for local queries
- Mobile benefits from laptop's LLM

---

## ⚙️ Setup (One Time)

### Step 1: Configure Ollama on Laptop

**Make Ollama accessible on network:**

**Windows:**
```powershell
# Stop Ollama
taskkill /F /IM ollama.exe

# Set environment variable
setx OLLAMA_HOST "0.0.0.0:11434"

# Restart Ollama
ollama serve
```

**macOS/Linux:**
```bash
# Add to ~/.bashrc or ~/.zshrc
export OLLAMA_HOST=0.0.0.0:11434

# Restart terminal and Ollama
ollama serve
```

### Step 2: Get Your Laptop's IP Address

**Windows:**
```powershell
ipconfig
# Look for "IPv4 Address" under your network adapter
# Example: 10.1.10.93
```

**macOS:**
```bash
ifconfig | grep "inet "
# Look for your local network IP
# Example: 10.1.10.93
```

### Step 3: Configure Mobile App

1. **Open app on mobile**: `http://YOUR_LAPTOP_IP:5173`
2. **Login**
3. **Go to**: Settings → LLM Strategy
4. **Select**: 🏠 Local LLM (Ollama)
5. **In "Ollama Server URL" field**, enter:
   ```
   http://YOUR_LAPTOP_IP:11434
   ```
   Example: `http://10.1.10.93:11434`
6. **Click**: "Save & Test Connection"
7. ✅ Should show: "Connected to Ollama at http://10.1.10.93:11434"

---

## 🔄 How It Works

```
Your Mobile Phone
     ↓
Your Query
     ↓
[WiFi Network]
     ↓
Your Laptop (running Ollama)
     ↓
Local LLM Processing
     ↓
[WiFi Network]
     ↓
Response to Mobile
```

**Benefits:**
- ✅ Processing stays on your network
- ✅ No cloud API needed
- ✅ Private and secure
- ✅ Use laptop's powerful hardware
- ✅ Works on same WiFi network

---

## 🎯 Usage Scenarios

### Scenario 1: At Home

**Setup:**
- Laptop at home running Ollama
- Mobile connected to home WiFi
- Mobile configured with laptop IP

**Usage:**
```
📱 Mobile → Settings → LLM Strategy → Local LLM
🎤 Ask question
💻 Laptop processes with Ollama
📱 Mobile receives response
```

### Scenario 2: At Office

**Setup:**
- Laptop at office running Ollama
- Mobile on office WiFi
- Same configuration works

**Usage:**
```
📱 Same as home!
Works on any network where both devices are connected
```

### Scenario 3: On the Go

**When NOT on same network:**
```
📱 Mobile → Settings → LLM Strategy → Cloud API Only
🎤 Ask question
☁️ Uses Claude API
📱 Mobile receives response
```

**Switch back when home:**
```
📱 Settings → LLM Strategy → Local LLM
✅ Back to using laptop's Ollama
```

---

## 🧪 Testing Connection

### Test 1: Can Mobile Reach Laptop?

**From mobile browser:**
```
http://YOUR_LAPTOP_IP:11434
```

**Expected:**
```
Ollama is running
```

**If you see this:** ✅ Network connection works!

**If you don't see this:**
- Check laptop firewall
- Verify both on same WiFi
- Check OLLAMA_HOST is set to 0.0.0.0

### Test 2: Query from Mobile

1. **Open Strategic Advisor on mobile**
2. **Ensure**: Settings → LLM Strategy → Local LLM selected
3. **Ask**: "Hello, are you working?"
4. **Check**: Should get response processed by laptop

**Debug:**
- Check laptop console (where Ollama is running)
- Should see incoming request when you query
- Mobile app console shows which LLM is being used

---

## 🔐 Security Considerations

### Network Security:

**This is SAFE because:**
- ✅ Only accessible on your private network
- ✅ Not exposed to internet
- ✅ Both devices authenticated
- ✅ All traffic stays local

**Additional Security:**
- Use home/office WiFi only (not public WiFi)
- Don't expose Ollama to internet
- Keep laptop firewall enabled for other ports

---

## ⚙️ Configuration Options

### Option 1: Always Use Laptop LLM (Recommended)

**Mobile Settings:**
```
LLM Strategy: Local LLM
Ollama URL: http://LAPTOP_IP:11434
```

**When it works:**
- At home on WiFi
- At office on WiFi
- Anywhere on same network as laptop

**When it doesn't:**
- Outside network (automatically falls back to error)
- Laptop offline

### Option 2: Smart Switching

**At home/office:**
```
LLM Strategy: Local LLM
Ollama URL: http://LAPTOP_IP:11434
```

**When traveling:**
```
LLM Strategy: Cloud API Only
```

**Manually switch based on location!**

---

## 🎓 Pro Tips

### Tip 1: Check Connection Before Querying

**In Settings → LLM Strategy:**
- Look for: "✅ Connected to Ollama at..."
- Green = working
- Yellow = not connected

### Tip 2: Use Fast Models on Laptop

**For mobile use, recommend:**
```
llama3.1:8b (fast, good quality)
phi3:medium (very fast, smaller)
mistral:7b (fast, efficient)
```

**Avoid large models:**
```
llama3.1:70b (too slow for mobile experience)
```

### Tip 3: Keep Laptop Awake

**So mobile can always reach it:**
- Disable laptop sleep when on AC power
- Or wake laptop before using mobile

### Tip 4: Static IP for Laptop (Optional)

**Instead of changing IP each time:**
1. Router settings → DHCP
2. Reserve IP for laptop's MAC address
3. Laptop always gets same IP
4. Mobile config never changes!

---

## 🆘 Troubleshooting

### "Cannot connect to Ollama"

**Check:**
1. **Laptop Ollama running?**
   ```powershell
   # On laptop
   ollama list
   # Should show models
   ```

2. **Same WiFi?**
   - Both devices on same network
   - Not on guest network

3. **Firewall?**
   ```powershell
   # Windows - Allow port 11434
   netsh advfirewall firewall add rule name="Ollama" dir=in action=allow protocol=TCP localport=11434
   ```

4. **Correct IP?**
   - Run `ipconfig` on laptop
   - Update mobile config if IP changed

### "Slow responses from mobile"

**Normal!** Mobile → Laptop adds network latency:
- Local laptop: ~1-2 seconds
- Mobile → Laptop: ~3-5 seconds

**If too slow:**
- Use smaller/faster model
- Check WiFi signal strength
- Or switch to Cloud API for queries

### "Sometimes works, sometimes doesn't"

**Likely:** Laptop IP changed

**Fix:**
1. Check laptop IP: `ipconfig`
2. Update mobile: Settings → LLM Strategy → Ollama URL
3. Save & Test Connection

**Permanent fix:** Set static IP for laptop

---

## 📊 Comparison

### Local LLM (via Laptop):

**Pros:**
- ✅ Private (stays on network)
- ✅ No API costs
- ✅ Works offline (on local network)
- ✅ Can use powerful models

**Cons:**
- ❌ Only works on same network
- ❌ Requires laptop running
- ❌ Slightly slower than cloud
- ❌ Need to configure connection

### Cloud API:

**Pros:**
- ✅ Works anywhere
- ✅ Very fast responses
- ✅ Always available
- ✅ No local setup needed

**Cons:**
- ❌ Requires API key
- ❌ Costs per query
- ❌ Data sent to cloud
- ❌ Requires internet

### Recommended: Switch Based on Location

**At Home/Office:**
```
Use: Local LLM (laptop)
Why: Private, free, good quality
```

**Traveling/Outside:**
```
Use: Cloud API
Why: Always works, fast, convenient
```

---

## 🎉 You're Set Up!

Now you can:

✅ **Use laptop's LLM from mobile** (same network)  
✅ **Keep sensitive queries private** (local processing)  
✅ **Save on API costs** (no cloud charges)  
✅ **Switch easily** between local and cloud  
✅ **Enjoy powerful laptop hardware** from mobile  

---

## 📞 Quick Reference

**Laptop IP Check:**
```powershell
ipconfig
```

**Mobile Configuration:**
```
Settings → LLM Strategy
Select: Local LLM
URL: http://LAPTOP_IP:11434
Save & Test
```

**Test Connection:**
```
Mobile browser: http://LAPTOP_IP:11434
Should see: "Ollama is running"
```

**Switch to Cloud:**
```
Settings → LLM Strategy
Select: Cloud API Only
```

---

**Your mobile now has access to powerful local LLM processing via your laptop!** 💻📱🔒
