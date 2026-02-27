import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import Icon from '@/components/design-system/Icon';
import SavedItems from '@/components/dashboard/SavedItems';
import WhatsAppOptIn from '@/components/dashboard/WhatsAppOptIn';
import ShareLinkCard from '@/components/dashboard/ShareLinkCard';

export const SavedWhatsAppSection: React.FC = () => {
  return (
    <div className="mt-10 grid gap-6 md:grid-cols-2" id="saved-items">
      <Card className="rounded-ds-2xl p-6 space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-slab text-h2">Saved for later</h2>
            <p className="text-grayish">Jump back to lessons and drills you flagged.</p>
          </div>
          <Link href="/saved" className="shrink-0">
            <Button variant="ghost" size="sm" className="rounded-ds-xl">
              Manage saved items
            </Button>
          </Link>
        </div>
        <SavedItems />
      </Card>

      <div className="space-y-4">
        <ShareLinkCard />
        <Card className="flex flex-col gap-4 rounded-ds-2xl border border-border/60 bg-card/60 p-5">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-electricBlue/15 text-electricBlue">
              <Icon name="MessageCircle" size={18} />
            </span>
            <div className="space-y-1">
              <h4 className="font-semibold text-foreground">WhatsApp Tasks</h4>
              <p className="text-sm text-muted-foreground">
                Receive daily micro-tasks and reminders via WhatsApp.
              </p>
              <p className="text-xs text-muted-foreground">
                Also available in the AI workspace section above.
              </p>
            </div>
          </div>
          <WhatsAppOptIn />
        </Card>
      </div>
    </div>
  );
};