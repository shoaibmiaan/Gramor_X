import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import Link from 'next/link';

import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import SettingsLayout from '@/components/settings/SettingsLayout';
import { withPageAuth } from '@/lib/requirePageAuth';

export default function ProfileSettingsPage() {
  return (
    <>
      <Head>
        <title>Profile · Settings · GramorX</title>
      </Head>

      <SettingsLayout
        activeTab="profile"
        title="Profile"
        description="Update your personal details, preferences, and study setup."
      >
        <Card className="rounded-ds-2xl p-5">
          <p className="text-small text-muted-foreground">
            Profile editing is available on the dedicated profile page.
          </p>
          <div className="mt-4">
            <Button asChild variant="soft" size="sm">
              <Link href="/profile">Open profile editor</Link>
            </Button>
          </div>
        </Card>
      </SettingsLayout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = withPageAuth();
