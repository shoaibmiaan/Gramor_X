import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import Link from 'next/link';

import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import SettingsLayout from '@/components/settings/SettingsLayout';
import { withPageAuth } from '@/lib/requirePageAuth';

export default function AccountSettingsPage() {
  return (
    <>
      <Head>
        <title>Account · Settings · GramorX</title>
      </Head>

      <SettingsLayout
        activeTab="account"
        title="Account"
        description="Access your account hub for activity, referrals, and account tools."
      >
        <Card className="rounded-ds-2xl p-5">
          <p className="text-small text-muted-foreground">
            Manage account-level actions from your account hub.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="soft">
              <Link href="/profile/account">Open account hub</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/profile/account/activity">View activity</Link>
            </Button>
          </div>
        </Card>
      </SettingsLayout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = withPageAuth();
