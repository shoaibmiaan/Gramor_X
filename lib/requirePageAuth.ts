import type { GetServerSideProps, GetServerSidePropsContext, GetServerSidePropsResult } from 'next';

import { createLoginDestination } from '@/lib/authRedirect';
import { getServerClient } from '@/lib/supabaseServer';

export function createAuthRedirect(resolvedUrl?: string) {
  return {
    redirect: {
      destination: createLoginDestination(resolvedUrl),
      permanent: false,
    },
  };
}

export async function requirePageAuth(
  ctx: GetServerSidePropsContext,
): Promise<GetServerSidePropsResult<{ userId: string }>> {
  const supabase = getServerClient(ctx.req, ctx.res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createAuthRedirect(ctx.resolvedUrl);
  }

  return {
    props: {
      userId: user.id,
    },
  };
}

export function withPageAuth<T extends Record<string, unknown> = Record<string, never>>(
  handler?: (
    ctx: GetServerSidePropsContext,
    userId: string,
  ) => Promise<GetServerSidePropsResult<T>>,
): GetServerSideProps<T> {
  return async (ctx) => {
    const authResult = await requirePageAuth(ctx);

    if ('redirect' in authResult || 'notFound' in authResult) {
      return authResult as GetServerSidePropsResult<T>;
    }

    if (!handler) {
      return {
        props: {} as T,
      };
    }

    return handler(ctx, authResult.props.userId);
  };
}
