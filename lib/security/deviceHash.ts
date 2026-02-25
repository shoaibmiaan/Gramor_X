// Browser-only helper to generate a stable, privacy-safe device hash.
export async function computeDeviceHash(): Promise<string> {
  const ua = navigator.userAgent ?? '';
  const lang = navigator.language ?? '';
  const plat = (navigator as any).platform ?? '';
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  // Add a local salt so two users on same device don't collide
  const key = 'gx_device_salt';
  let salt = localStorage.getItem(key);
  if (!salt) {
    salt = crypto.getRandomValues(new Uint32Array(4)).toString();
    localStorage.setItem(key, salt);
  }
  const data = new TextEncoder().encode([ua, lang, plat, tz, salt].join('|'));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}
