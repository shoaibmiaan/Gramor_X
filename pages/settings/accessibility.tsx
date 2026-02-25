'use client';

import Head from 'next/head';
import React from 'react';

import { Container } from '@/components/design-system/Container';
import AccessibilitySettingsCard from '@/components/settings/Accessibility';

export default function AccessibilitySettingsPage() {
  return (
    <>
      <Head>
        <title>Accessibility · Settings · GramorX</title>
        <meta
          name="description"
          content="Toggle the high-contrast theme to boost legibility and focus visibility."
        />
      </Head>

      <div className="py-6">
        <Container className="space-y-6">
          <header className="space-y-1">
            <h1 className="text-h2 font-bold text-foreground">Accessibility</h1>
            <p className="text-small text-muted-foreground">
              Adjust contrast for the interface and preview focus visibility.
            </p>
          </header>

          <AccessibilitySettingsCard />
        </Container>
      </div>
    </>
  );
}
