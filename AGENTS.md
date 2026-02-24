# AGENTS.md

## Cursor Cloud specific instructions

### Project overview
Strategic Advisor is a React + TypeScript SPA (Vite) with an optional Express voice API server. Data is stored in browser localStorage — no database required.

### Services

| Service | Command | Port | Notes |
|---|---|---|---|
| Vite dev server (frontend) | `npm run dev` | 5173 | Required. Binds `0.0.0.0`. |
| Express voice API server | `npm run api` | 3001 | Optional. Only needed for voice features. Proxied via Vite at `/api/voice`. |
| Both concurrently | `npm run start` | 5173 + 3001 | Uses `concurrently`. |

### Key caveats

- **Missing npm dependencies**: `react-markdown`, `remark-gfm`, and `date-fns` are imported in the source code but not listed in `package.json`. They must be installed separately via `npm install react-markdown remark-gfm date-fns` or the dev server will fail to resolve those imports.
- **`npm run build` (tsc) fails**: The codebase has ~70 pre-existing TypeScript strict-mode errors (unused vars, missing types, type mismatches). The Vite dev server (`npm run dev`) works fine because it uses esbuild which skips full type checking.
- **`npm run lint` fails**: ~100 pre-existing ESLint errors (unused vars, `no-explicit-any`). This is expected in the current codebase state.
- **AI features require external services**: Chat responses will show "Local LLM not available" unless Ollama is running locally or `VITE_ANTHROPIC_API_KEY` is set in a `.env` file. The UI itself loads and functions with synthetic/demo data regardless.
- **First-time setup wizard**: On first load, the app shows a setup wizard asking for an admin phone number and name. Enter any values (e.g., `+1 555-123-4567`, `Demo User`) to proceed to the main interface. Data is stored in localStorage.
- **No automated test suite**: The project has no test runner or test files configured.
