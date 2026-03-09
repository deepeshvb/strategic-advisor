# Gmail "Sign in with Google" setup

To use **Sign in with Google** for Gmail (no App Password), you need a Google Cloud OAuth client and env vars.

## 1. Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project.
3. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
4. If prompted, configure the **OAuth consent screen** (External, add your email as test user).
5. Application type: **Web application**.
6. **Authorized redirect URIs**: add your backend callback URL, e.g.  
   - Local: `http://localhost:3000/api/auth/google/callback`  
   - Production: `https://your-backend.example.com/api/auth/google/callback`
7. Copy the **Client ID** and **Client secret**.

## 2. Environment variables

In `.env` or `.env.backend` in the **project root** (or wherever the backend loads env from):

```env
# Gmail OAuth (optional – only if you use "Sign in with Google")
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Required for OAuth callback – Google must redirect to the backend
BACKEND_URL=http://localhost:3000
# If your frontend is on another origin:
FRONTEND_URL=http://localhost:5173
```

- **BACKEND_URL**: Must match the host/port where the backend runs and must match the redirect URI you added in Google Cloud (e.g. `http://localhost:3000`). Required so the OAuth callback hits the backend.
- **FRONTEND_URL**: Where to send the user after success/error (e.g. your Config page).

## 3. Use in the app

1. Open **Config** → select a company → **Additional mailboxes (Gmail / IMAP)** → **Configure**.
2. Click **+ Add mailbox**, choose **Gmail / Google Workspace**.
3. Click **Sign in with Google** (no App Password needed).
4. Complete sign-in in the browser; you’ll be redirected back and the mailbox will be added.

If these env vars are not set, the **Sign in with Google** link will redirect to the Config page with an error asking you to set `GOOGLE_CLIENT_ID`.
