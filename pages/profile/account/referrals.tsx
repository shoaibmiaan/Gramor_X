import * as React from 'react';
import Head from 'next/head';
import type { NextPage } from 'next';

import { Container } from '@/components/design-system/Container';
import ReferralCard from '@/components/account/ReferralCard';

const ReferralsPage: NextPage = () => (
  <>
    <Head>
      <title>Referrals · Account · GramorX</title>
      <meta
        name="description"
        content="Share your referral link and earn premium credits when friends join GramorX."
      />
    </Head>
    <main className="min-h-screen bg-background text-foreground py-8">
      <Container className="max-w-3xl">
        <h1 className="text-h2 font-semibold">Referrals</h1>
        <p className="mt-1 text-small text-muted-foreground">
          Share your code with friends and both of you receive premium credits
          when they join GramorX.
        </p>

        <ReferralCard className="mt-6" />
      </Container>
    </main>
  </>
);

export default ReferralsPage;
