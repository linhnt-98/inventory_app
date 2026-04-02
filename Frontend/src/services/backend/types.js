/**
 * Backend contract notes:
 * - Adapters expose the same method names/signatures regardless of provider.
 * - Methods return plain JS objects so the UI layer stays backend-agnostic.
 * - Result shape: { ok: boolean, data?: object, error?: string }
 */

export function ok(data = {}) {
  return { ok: true, data };
}

export function fail(error) {
  return { ok: false, error };
}
