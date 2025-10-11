import { supabaseBrowser } from '@/lib/supabaseBrowser';

const HTTP_REGEX = /^https?:\/\//i;

export const AVATAR_BUCKET = 'avatars';

export function isStoragePath(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.length > 0 && !HTTP_REGEX.test(value);
}

export async function createSignedAvatarUrl(path: string, expiresInSeconds = 60 * 60) {
  const { data, error } = await supabaseBrowser.storage.from(AVATAR_BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data?.signedUrl ?? null;
}

export async function uploadAvatarViaSignedUrl(userId: string, file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const objectPath = `${userId}/avatar-${Date.now()}.${ext}`;

  const { data: signedData, error: signErr } = await supabaseBrowser.storage
    .from(AVATAR_BUCKET)
    .createSignedUploadUrl(objectPath);

  if (signErr) throw signErr;

  const token = signedData?.token;
  if (!token) throw new Error('Failed to obtain upload token');

  const { error: uploadErr } = await supabaseBrowser.storage
    .from(AVATAR_BUCKET)
    .uploadToSignedUrl(objectPath, token, file);

  if (uploadErr) throw uploadErr;

  const signedUrl = await createSignedAvatarUrl(objectPath);

  return { path: objectPath, signedUrl };
}

export async function resolveAvatarUrl(value: string | null | undefined) {
  if (!value) return { signedUrl: null, path: null } as const;
  if (isStoragePath(value)) {
    try {
      const signedUrl = await createSignedAvatarUrl(value);
      return { signedUrl, path: value } as const;
    } catch (error) {
      console.warn('Failed to create signed avatar URL', error);
      return { signedUrl: null, path: value } as const;
    }
  }
  return { signedUrl: value, path: null } as const;
}
