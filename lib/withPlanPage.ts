// lib/withPlanPage.ts
import type { GetServerSideProps, GetServerSidePropsContext } from 'next';
import { supabaseServer } from '@/lib/supabaseServer';
import type { PlanId } from '@/types/pricing';
import { hasPlan } from '@/lib/planAccess';

type GuardOpts = {
  redirectTo?: string; // default: /pricing
};

async function getUserPlan(
  ctx: GetServerSidePropsContext
): Promise<{ userId: string | null; plan: PlanId }> {
  const supabase = supabaseServer(ctx.req as any, ctx.res as any);
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  if (!user) return { userId: null, plan: 'free' };

  // Minimal, safe default: read from profiles.plan_id if present, else 'free'
  // Adjust table/column names if your schema differs.
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan_id')
    .eq('id', user.id)
    .maybeSingle();

  const plan = (profile?.plan_id as PlanId | undefined) ?? 'free';
  return { userId: user.id, plan };
}

/**
 * Simple drop-in: blocks access and redirects if the user lacks the required plan.
 * Use this when the page has NO existing getServerSideProps.
 */
export function requirePlanSSR(min: PlanId, opts?: GuardOpts): GetServerSideProps {
  const redirectTo = opts?.redirectTo ?? '/pricing';
  return async (ctx) => {
    const { plan } = await getUserPlan(ctx);

    if (!hasPlan(plan, min)) {
      const from = encodeURIComponent(ctx.resolvedUrl ?? '/');
      const need = encodeURIComponent(min);
      return {
        redirect: { destination: `${redirectTo}?from=${from}&need=${need}`, permanent: false },
      };
    }

    return { props: { __plan: plan } };
  };
}

/**
 * Composable wrapper: keep your existing getServerSideProps and add plan checking.
 * Example:
 * export const getServerSideProps = withPlanPage('starter')(async (ctx) => {
 *   // ...your original GSSP code...
 *   return { props: { ... } };
 * });
 */
export function withPlanPage(min: PlanId, opts?: GuardOpts) {
  const redirectTo = opts?.redirectTo ?? '/pricing';
  return function wrap<T extends Record<string, any>>(
    gssp: GetServerSideProps<T>
  ): GetServerSideProps<T & { __plan: PlanId }> {
    return async (ctx) => {
      const { plan } = await getUserPlan(ctx);

      if (!hasPlan(plan, min)) {
        const from = encodeURIComponent(ctx.resolvedUrl ?? '/');
        const need = encodeURIComponent(min);
        return {
          redirect: { destination: `${redirectTo}?from=${from}&need=${need}`, permanent: false },
        } as any;
      }

      const result = await gssp(ctx);
      if ('props' in result) {
        return {
          ...result,
          props: { ...(result.props as object), __plan: plan } as any,
        };
      }
      return result as any;
    };
  };
}
