import { supabaseBrowser } from '@/lib/supabaseBrowser';

interface Params {
  exam: string;
  testSlug?: string;
  type?: string;
}

export async function recordFocusViolation(params: Params) {
  try {
    const { data } = await supabaseBrowser.auth.getUser();
    const userId = data.user?.id ?? null;
    await supabaseBrowser.from('exam_focus_violations').insert({
      user_id: userId,
      exam: params.exam,
      test_slug: params.testSlug ?? null,
      type: params.type ?? null,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('recordFocusViolation failed', err);
  }
}