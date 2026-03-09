// Redirect to the actual Voice API server (plain Node, no tsx)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('./voice-server.cjs');
