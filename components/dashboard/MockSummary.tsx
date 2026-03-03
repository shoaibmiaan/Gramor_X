// components/dashboard/MockSummary.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { DashboardCard } from './DashboardCard';
import type { MockSummaryData } from '@/lib/dashboard/getDashboardData';
import Icon from '@/components/design-system/Icon';
import { Button } from '@/components/design-system/Button';

interface MockSummaryProps {
  mock: MockSummaryData;
}

export const MockSummary: React.FC<MockSummaryProps> = ({ mock }) => {
  return (
    <DashboardCard title="Mock exams" subtitle="Track how close you are to your target band.">
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Attempts completed</span>
          <span className="font-semibold text-foreground">{mock.totalAttempts}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Best band</span>
          <span className="font-semibold text-emerald-600">
            {mock.bestBand ? `Band ${mock.bestBand}` : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Last attempt</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Icon name="Timer" size={14} />
            {mock.lastAttemptAt
              ? new Date(mock.lastAttemptAt).toLocaleDateString()
              : 'No mock taken yet'}
          </span>
        </div>

        <div className="mt-4 rounded-xl bg-muted/60 p-4 text-xs text-foreground">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <Icon name="BarChart3" size={16} className="mt-0.5" />
              <div>
                <p className="font-medium">Next step</p>
                <p className="text-muted-foreground">
                  Take a full mock under real timing to update your band estimate.
                </p>
              </div>
            </div>
            <Button asChild variant="secondary" size="sm" className="rounded-ds-xl">
              <Link href={mock.nextRecommendedMockHref}>Start</Link>
            </Button>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
};
