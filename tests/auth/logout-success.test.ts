import { strict as assert } from 'node:assert';

import { signOutAndRedirect } from '@/lib/auth';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

(async () => {
  const oldFetch = global.fetch;
  const oldWindow = (global as any).window;
  const oldLocalStorage = (global as any).localStorage;
  const oldSessionStorage = (global as any).sessionStorage;
  const originalSignOut = supabaseBrowser.auth.signOut;

  let redirectedTo = '';

  (supabaseBrowser.auth.signOut as typeof originalSignOut) = async () => ({ error: null } as any);
  (global as any).fetch = async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) });
  (global as any).window = { location: { replace: (path: string) => { redirectedTo = path; } } };
  (global as any).localStorage = { removeItem: () => {} };
  (global as any).sessionStorage = { removeItem: () => {} };

  try {
    await signOutAndRedirect();
    assert.equal(redirectedTo, '/login?signedout=1');
    console.log('logout redirect verified');
  } finally {
    (supabaseBrowser.auth.signOut as typeof originalSignOut) = originalSignOut;
    global.fetch = oldFetch;
    (global as any).window = oldWindow;
    (global as any).localStorage = oldLocalStorage;
    (global as any).sessionStorage = oldSessionStorage;
  }
})();
