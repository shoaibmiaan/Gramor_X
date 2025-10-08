// /lib/speaking/uploadSpeakingBlob.ts
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { uploadWithRetry } from '@/lib/upload/supabase';

export type SpeakingUploadResult = {
  signedUrl: string;
  path: string;
  attemptId: string;
  clipId?: string;
};

/**
 * Uploads an audio blob to Supabase Storage and returns the storage path with a signed URL.
 * Bucket: "speaking"   Default path: <userId>/<attemptId>/<ctx>/<timestamp>.webm
 */
export async function uploadSpeakingBlob(
  blob: Blob,
  ctx: 'p1' | 'p2' | 'p3' | 'chat',
  attemptId: string,
  pathOverride?: string,
): Promise<SpeakingUploadResult> {
  const { data: sess } = await supabaseBrowser.auth.getSession();
  const userId = sess.session?.user?.id;
  if (!userId) throw new Error('Unauthorized');

  const bucket = 'speaking';
  const timestamp = Date.now();
  const safeCtx = ctx || 'p1';
  const relativePath = pathOverride?.replace(/^\/+/, '') || `${userId}/${attemptId}/${safeCtx}/${timestamp}.webm`;

  await uploadWithRetry(
    () =>
      supabaseBrowser.storage.from(bucket).upload(relativePath, blob, {
        contentType: blob.type || 'audio/webm',
        upsert: Boolean(pathOverride),
      }),
    { maxAttempts: 4, baseDelayMs: 500 },
  );

  const { data: signed, error: signedErr } = await supabaseBrowser.storage
    .from(bucket)
    .createSignedUrl(relativePath, 60 * 60 * 24);

  if (signedErr) throw signedErr;

  return {
    signedUrl: signed.signedUrl,
    path: relativePath,
    attemptId,
    clipId: undefined,
  };
}
