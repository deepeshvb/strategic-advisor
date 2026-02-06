# Local LLM Setup with Ollama - Complete Privacy

## 🔒 Why Local LLM?

**PRIVACY FIRST**: Your company's sensitive information NEVER leaves your computer.
- ✅ All AI processing happens locally
- ✅ No data sent to OpenAI, Anthropic, or any cloud service
- ✅ Complete control over your data
- ✅ No API costs
- ✅ Works offline
- ✅ Unlimited queries

---

## Quick Start (15 minutes)

### Step 1: Install Ollama

**Windows:**
1. Download from https://ollama.com/download/windows
2. Run the installer
3. Ollama will start automatically

**macOS:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Step 2: Start Ollama Service

Ollama should start automatically. To verify:

```bash
# Check if Ollama is running
curl http://localhost:11434

# Should return: "Ollama is running"
```

### Step 3: Download AI Model

**Recommended for Strategic Advisor:**

```bash
# Best quality (requires 48GB+ RAM)
ollama pull llama3.1:70b

# Good quality, faster (requires 16GB+ RAM)
ollama pull llama3.1:8b

# Fast and efficient (requires 8GB+ RAM)
ollama pull mistral:7b

# Lightweight option (requires 4GB+ RAM)
ollama pull phi3:3.8b
```

**Which model to choose:**
- **Have 48GB+ RAM?** → `llama3.1:70b` (best strategic reasoning)
- **Have 16GB RAM?** → `llama3.1:8b` (good balance)
- **Have 8GB RAM?** → `mistral:7b` (fast, capable)
- **Limited RAM?** → `phi3:3.8b` (lightweight)

### Step 4: Configure Strategic Advisor

The app will automatically detect Ollama and use it instead of cloud APIs.

**No configuration needed!** Just make sure:
1. Ollama is running
2. You've pulled a model
3. Restart the Strategic Advisor app

---

## Verification

### Test Ollama is Working

```bash
# List installed models
ollama list

# Test generation
ollama run llama3.1:8b "What are key strategies for IT consulting firms?"

# Should generate a response
```

### Test in Strategic Advisor

1. Start the app: `npm run dev`
2. Open `http://localhost:5173`
3. Click **Daily Briefing** or ask a question
4. Check browser console (F12) - should see:
   ```
   🧠 Generating response with LOCAL LLM (Ollama)...
   📍 Model: llama3.1:8b
   🔒 Privacy: All data processed locally, NEVER sent to cloud
   ✅ Local LLM response generated in XXXXms
   ```

---

## Model Comparison

| Model | Size | RAM Needed | Speed | Quality | Best For |
|-------|------|------------|-------|---------|----------|
| **llama3.1:70b** | 40GB | 48GB+ | Slow | Excellent | Deep strategic analysis |
| **llama3.1:8b** | 4.7GB | 16GB+ | Fast | Very Good | General use |
| **mistral:7b** | 4.1GB | 8GB+ | Very Fast | Good | Quick insights |
| **phi3:14b** | 7.9GB | 16GB+ | Fast | Good | Efficient reasoning |
| **phi3:3.8b** | 2.3GB | 4GB+ | Very Fast | Decent | Resource-constrained |

### Switching Models

**In the app:**
1. Go to **Settings** → **Local LLM**
2. Select your preferred model
3. Click **Save**

**From command line:**
```bash
# Pull a different model
ollama pull mistral:7b

# The app will detect it automatically
```

---

## Performance Optimization

### GPU Acceleration (Recommended)

Ollama automatically uses your GPU if available:
- **NVIDIA GPUs**: Detected automatically (CUDA)
- **AMD GPUs**: Supported on Linux (ROCm)
- **Apple Silicon (M1/M2/M3)**: Detected automatically (Metal)

**Check GPU usage:**
```bash
# NVIDIA
nvidia-smi

# Should show ollama process using GPU
```

### CPU-Only Mode

Works fine but slower:
- Reduce model size (use 8B instead of 70B)
- Increase `num_thread` parameter
- Close other applications during inference

### Memory Management

**Ollama keeps models in RAM:**
- Models stay loaded until system restart
- First query loads model (20-60 seconds)
- Subsequent queries are instant
- Configure timeout in Ollama settings

---

## Advanced Configuration

### Custom Model Parameters

Edit model settings for your needs:

```bash
# Create custom modelfile
cat > Modelfile <<EOF
FROM llama3.1:8b

# Customize for strategic advice
PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER num_predict 4000

SYSTEM """
You are a strategic advisor for CEOs...
"""
EOF

# Create custom model
ollama create strategic-advisor -f Modelfile

# Use it
ollama run strategic-advisor
```

Update app to use your custom model in **Settings** → **Local LLM**.

### Running Ollama as Service

**Windows (automatic):**
Ollama runs as Windows service, starts on boot.

**Linux systemd:**
```bash
sudo systemctl enable ollama
sudo systemctl start ollama
```

**macOS:**
```bash
# Launches automatically, or:
open /Applications/Ollama.app
```

---

## Troubleshooting

### "Ollama is not running"

**Check if running:**
```bash
curl http://localhost:11434
```

**Start Ollama:**
- Windows: Start from Start Menu
- macOS: Open Ollama app
- Linux: `ollama serve`

### "Model not found"

**List models:**
```bash
ollama list
```

**Pull missing model:**
```bash
ollama pull llama3.1:8b
```

### "Out of memory"

**Solutions:**
1. Switch to smaller model: `ollama pull phi3:3.8b`
2. Close other applications
3. Reduce `num_predict` in settings
4. Add more RAM (recommended for 70B model)

### "Slow generation"

**Optimize:**
1. Use GPU if available
2. Switch to smaller model (8B instead of 70B)
3. Reduce `num_predict` tokens
4. Ensure Ollama is using GPU: check with `nvidia-smi`

### "Connection refused"

**Check port:**
```bash
# Ollama default port: 11434
netstat -an | findstr 11434  # Windows
netstat -an | grep 11434     # macOS/Linux
```

**Change port if needed:**
```bash
# Set environment variable
export OLLAMA_HOST=0.0.0.0:11435

# Update app config to match
```

---

## Privacy Benefits

### What Stays Local (Everything!)

✅ All your company data  
✅ All email/Teams/Slack communications  
✅ All strategic queries and responses  
✅ All historical decisions  
✅ All metrics and sensitive information  

### No Cloud Transmission

❌ No data to OpenAI  
❌ No data to Anthropic  
❌ No data to Google  
❌ No data to Microsoft  
❌ No data to ANY third party  

**100% Privacy Guarantee**

---

## Cost Comparison

### Cloud API (Claude, GPT-4)
- **Cost**: $0.01-0.10 per request
- **Monthly**: $50-500+ depending on usage
- **Annual**: $600-6,000+
- **Privacy**: Data sent to third party

### Local LLM (Ollama)
- **Cost**: $0 per request
- **Monthly**: $0
- **Annual**: $0
- **Privacy**: 100% local, zero transmission
- **One-time**: Hardware cost if upgrading RAM/GPU

**ROI**: Local LLM pays for itself in 1-2 months for active users.

---

## Next Steps

1. ✅ Install Ollama
2. ✅ Pull recommended model: `ollama pull llama3.1:8b`
3. ✅ Verify it's working: `ollama run llama3.1:8b "test"`
4. ✅ Start Strategic Advisor app
5. ✅ App automatically detects and uses local LLM
6. ✅ All queries now 100% private!

---

## Support

- **Ollama Docs**: https://ollama.com/docs
- **Model Library**: https://ollama.com/library
- **GitHub Issues**: https://github.com/ollama/ollama/issues

**Need help?** Check the browser console for detailed error messages.

---

**🔒 Your company data is now 100% private with local AI processing!**
