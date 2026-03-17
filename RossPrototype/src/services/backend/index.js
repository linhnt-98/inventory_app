import { createLocalBackend } from './localBackend';
import { createFirebaseBackend } from './firebaseBackend';

export function getBackendAdapter() {
  const provider = import.meta.env.VITE_BACKEND_PROVIDER || 'local';

  if (provider === 'firebase') {
    return createFirebaseBackend();
  }

  if (provider !== 'local') {
    console.warn(`Unknown backend provider "${provider}". Falling back to local adapter.`);
  }

  return createLocalBackend();
}
