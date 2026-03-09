# Which script should I run?

## Quick reference

| What you want | Run this |
|---------------|----------|
| **Restart just the backend** (e.g. after editing .env) | **RESTART-BACKEND-ONLY.bat** |
| **Start backend only** (one window, no kill) | **START-BACKEND.bat** |
| **Open config dashboard** (backend + frontend + browser) | **OPEN-CONFIG-DASHBOARD.bat** |
| **Voice API + Dev Server** (Siri shortcuts, no main backend) | **RESTART-EVERYTHING.bat** |
| **Full stack** (backend + frontend + Voice API) | Start **START-BACKEND.bat**, then **RESTART-EVERYTHING.bat** (or start Voice API separately) |

---

## What each script does

### RESTART-BACKEND-ONLY.bat *(use this to “stop/start the backend”)*
- Stops **all** Node processes.
- Starts **only** the main backend (`backend\server.js` on **port 3000**).
- Use when: you changed `.env` / `.env.backend`, or you just want a clean backend restart.
- Does **not** start the frontend or Voice API.

### START-BACKEND.bat
- Starts the main backend (port 3000) in a new window. Does **not** kill anything first.
- Use when: nothing is running and you only need the backend.

### OPEN-CONFIG-DASHBOARD.bat
- Starts backend (3000) + frontend (5173) and opens the config dashboard in your browser.
- Use when: you want to use the Configuration Dashboard UI.

### RESTART-EVERYTHING.bat
- Stops **all** Node processes.
- Starts **Voice API** (port 3001) and **Dev Server** (port 5173).
- Does **not** start the main backend (3000). Use for Siri / voice shortcuts stack only.
- If you need the full app (config, WhatsApp, monitoring), also run **START-BACKEND.bat** or **OPEN-CONFIG-DASHBOARD.bat**.

### RESTART-BACKEND.bat
- For when the backend is installed as a **Windows scheduled task** (`StrategicAdvisorBackend`). Stops and starts that task.
- If you run the backend manually with START-BACKEND.bat, use **RESTART-BACKEND-ONLY.bat** instead.

---

## Ports

- **3000** – Main backend (API, WhatsApp, monitoring, config).
- **3001** – Voice API (Siri shortcuts: `/api/voice/critical`, etc.).
- **5173** – Frontend (Vite dev server + config dashboard).
