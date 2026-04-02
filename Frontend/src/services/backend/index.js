import { createLocalBackend } from './localBackend';
import { createFirebaseBackend } from './firebaseBackend';
import { createFastApiBackend } from './fastapiBackend';

export function getBackendAdapter() {
  const mode = import.meta.env.MODE;
  const configuredProvider = import.meta.env.VITE_BACKEND_PROVIDER;
  const modeProviderMap = {
    localdev: 'local',
    firebase: 'firebase',
    fastapi: 'fastapi',
  };
  const provider = modeProviderMap[mode] || configuredProvider;

  if (provider === 'fastapi') {
    return createFastApiBackend();
  }

  if (provider === 'firebase') {
    return createFirebaseBackend();
  }

  if (provider !== 'local') {
    console.warn(`Unknown backend provider "${provider}". Falling back to local adapter.`);
  }

  return createLocalBackend();
}
