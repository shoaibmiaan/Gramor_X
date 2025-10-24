import * as React from 'react';
import Head from 'next/head';
import type { NextPage } from 'next';

import ReferralCard from '@/components/account/ReferralCard';

const ReferralsPage: NextPage = () => (
  <>
    <Head>
      <title>Account — Referrals</title>
    </Head>
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-h1 font-semibold">Referrals</h1>
        <p className="text-small text-muted-foreground">
          Share your code with friends and both of you receive premium credits when they join GramorX.
        </p>

        <ReferralCard className="mt-6" />
      </div>
    </main>
  </>
);

export default ReferralsPage;
