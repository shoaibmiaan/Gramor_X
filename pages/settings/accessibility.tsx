'use client';

import type { GetServerSideProps } from 'next';
import React from 'react';

import SettingsLayout from '@/components/layouts/SettingsLayout';
import AccessibilitySettingsCard from '@/components/settings/Accessibility';
import { requireAuthenticatedPage } from '@/lib/ssr/requireAuthenticatedPage';

export default function AccessibilitySettingsPage() {
  return (
    <SettingsLayout title="Accessibility" description="Adjust contrast and readability options.">
      <AccessibilitySettingsCard />
    </SettingsLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) =>
  requireAuthenticatedPage(ctx, {});
