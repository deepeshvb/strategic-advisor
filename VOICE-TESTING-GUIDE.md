# Voice Note & Voice Readout Testing Guide

This guide explains how to test voice notes from your phone, scheduled voice briefings, and critical-item voice alerts.

---

## 1. Voice Notes from Phone → Agent

### How It Works

1. **Send a voice note** to your Strategic AI Advisor WhatsApp number (the Twilio sandbox number).
2. The backend receives the audio via Twilio webhook (`MediaUrl0`, `NumMedia`).
3. Audio is downloaded, converted from OGG to WAV if needed (WhatsApp sends OGG), and transcribed with **Groq** or **OpenAI Whisper**.
4. The transcribed text is sent to Claude for processing (same as a typed message).
5. You receive the response via WhatsApp (text).

### Setup Requirements

1. **Transcription API key** (choose one):
   - **Groq (recommended, free tier):** Get key at https://console.groq.com → add to `.env.backend`:
     ```
     GROQ_API_KEY=gsk_your-groq-key-here
     ```
   - **OpenAI Whisper:** Get key at https://platform.openai.com/api-keys → add to `.env.backend`:
     ```
     OPENAI_API_KEY=sk-your-openai-key-here
     ```

2. **ffmpeg** (for OGG → WAV conversion):
   - WhatsApp sends OGG; Whisper needs WAV/MP3.
   - **Option A:** Install ffmpeg on your system and ensure it's in PATH.
   - **Option B:** Use the `ffmpeg-static` package (installed via `npm install ffmpeg-static`).

3. **Dependencies** (if not already installed):
   ```bash
   npm install ffmpeg-static
   ```

### How to Test

1. Open WhatsApp and go to your conversation with the Strategic AI Advisor number.
2. **Hold the microphone button** and record a voice message, e.g.:
   - *"What's happening across my companies?"*
   - *"Summarize Vishnu's recent emails"*
   - *"Give me a brief"*
3. Send the voice note.
4. You should receive:
   - An acknowledgment: *"Got it, processing your request..."*
   - Then the full response after the agent fetches data and asks Claude.

### Troubleshooting

| Issue | Fix |
|-------|-----|
| "Voice notes require GROQ_API_KEY or OPENAI_API_KEY" | Add `GROQ_API_KEY` (free at console.groq.com) or `OPENAI_API_KEY` to `.env.backend` |
| "ffmpeg failed" or conversion errors | Install ffmpeg: `winget install ffmpeg` (Windows) or `brew install ffmpeg` (Mac) |
| No response after voice note | Check `webhook-requests.log` and backend logs for `MediaUrl0` / `NumMedia` |
| Transcription empty | Ensure you speak clearly; check Whisper API logs |
| **Voice note – "couldn't transcribe"** | 1) Add GROQ_API_KEY (free) or OPENAI_API_KEY to .env.backend. 2) Install ffmpeg: `winget install Gyan.FFmpeg`. 3) **Restart the backend** – if using the Windows service, run: `Stop-ScheduledTask StrategicAdvisorBackend; Start-ScheduledTask StrategicAdvisorBackend` (in PowerShell as Admin). Or use START-BACKEND.bat. 4) Check http://localhost:3000/api/voice-notes/check |
| **"Call me now" – no call received** | 1) **Config Dashboard** → General → Contact Information → set **Phone Number** (E.164 format, e.g. +17324214636) and **Save**. 2) **Twilio trial**: verify your number at [Verified Caller IDs](https://console.twilio.com/us1/develop/phone-numbers/manage/verified). 3) **Twilio "from" number must have Voice**: In [Phone Numbers → Manage](https://console.twilio.com/us1/develop/phone-numbers/manage/incoming), check your number has **Voice** capability. If it's SMS-only, buy a Voice-capable number. 4) Check backend logs for `📞 Initiating voice call` and any Twilio error codes. 5) Check [Twilio Monitor → Call Logs](https://console.twilio.com/us1/monitor/logs/calls) for call status. |

---

## 2. Scheduled Voice Readouts

### How It Works

- **Morning briefing (default 8:00 AM):** WhatsApp + email + **voice call**.
- **Evening summary (default 6:00 PM):** Email + **voice call**.

The voice call uses Twilio Voice with a natural voice (Polly.Matthew-Neural) to read a short briefing.

### Configuration

- **Times & Voice toggles:** Config Dashboard → General → Daily Briefings:
  - Morning Briefing Time / Evening Summary Time
  - **Voice call with morning briefing** – toggle on/off
  - **Voice call with evening summary** – toggle on/off
  - **Call me now** – on-demand voice call button
- Or set in `config.json`:
  ```json
  "briefings": {
    "morningTime": "08:00",
    "eveningTime": "18:00"
  }
  ```

- **Disable voice:**  
  Voice is enabled by default. To disable:
  - **Config Dashboard** → General → Daily Briefings → uncheck "Voice call with morning/evening briefing"
  - Or in `config.json`: `"voiceMorning": false` or `"voiceEvening": false`
  - Or via env: `VOICE_MORNING_BRIEFING=false`, `VOICE_EVENING_BRIEFING=false`

### Required Environment

- `CEO_PHONE_NUMBER` – number called for voice briefings
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` – Twilio credentials

### How to Test

1. **Wait for morning/evening:**  
   The cron runs at the configured times.

2. **Quick test (WhatsApp):**  
   Send a WhatsApp message: **`call`** or **`call me`**  
   - You receive a test voice call immediately.

3. **Quick test (Config UI):**  
   Config Dashboard → General → Daily Briefings → **Call me now**  
   - Initiates a voice call to your configured phone number.

---

## 3. Critical-Item Voice Alerts

### How It Works

When the monitoring engine detects **critical** items (urgency score ≥ 10), it:

1. Triggers a **voice call** with the alert summary
2. Sends SMS
3. Sends WhatsApp

This is implemented in `backend/monitoring/monitor-engine.ts` via `voiceService.makeEmergencyCall()`.

### When It Triggers

- Depends on the monitoring logic and urgency scoring
- Typically: high-priority emails, urgent mentions, or other critical items

### Configuration

- **Quiet hours:** Alerts can be suppressed during quiet hours in config:
  ```json
  "monitoring": {
    "quietHoursEnabled": true,
    "quietHoursStart": "22:00",
    "quietHoursEnd": "07:00"
  }
  ```

- **CEO phone:** `CEO_PHONE_NUMBER` – number called for critical alerts

---

## Quick Reference

| Command | Action |
|--------|--------|
| Send voice note | Voice → transcribed → Claude → WhatsApp response |
| `call` / `call me` | Immediate test voice call |
| `brief` | Email briefing |
| `critical` | Show urgent items |
| `help` | List all commands |

---

## Optional: Voice Response Instead of Text

To return voice instead of text for a WhatsApp response, you would need to:

1. Generate the response text with Claude
2. Send it to a TTS service (e.g. Twilio Voice, ElevenLabs, Google TTS)
3. Either:
   - Send an audio file via WhatsApp, or
   - Initiate a voice call and play the response

This is not implemented yet. If you want it, we can add it as a follow-up feature.
