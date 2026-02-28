import type { GetServerSidePropsContext, GetServerSidePropsResult } from 'next';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export async function requireAuthenticatedPage<P>(
  ctx: GetServerSidePropsContext,
  props: P,
): Promise<GetServerSidePropsResult<P>> {
  const supabase = createSupabaseServerClient({ req: ctx.req, res: ctx.res });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = encodeURIComponent(ctx.resolvedUrl || '/');
    return {
      redirect: {
        destination: `/login?next=${next}`,
        permanent: false,
      },
    };
  }

  return { props };
}
