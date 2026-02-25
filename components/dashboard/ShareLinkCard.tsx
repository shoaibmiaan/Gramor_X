import React, { useState } from 'react';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import Icon from '@/components/design-system/Icon';
import { useToast } from '@/components/design-system/Toaster';

const ShareLinkCard: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const { success } = useToast();
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopy = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopied(true);
        success('Link copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Gramor_X Dashboard',
        url: shareUrl,
      }).catch(() => {});
    } else {
      handleCopy();
    }
  };

  return (
    <Card className="flex flex-col gap-4 rounded-ds-2xl border border-border/60 bg-card/60 p-5">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Icon name="Share2" size={18} />
        </span>
        <div className="space-y-1">
          <h4 className="font-semibold text-foreground">Share your progress</h4>
          <p className="text-sm text-muted-foreground">
            Let friends and mentors see how you're doing.
          </p>
        </div>
      </div>
      <Button
        onClick={handleShare}
        variant="outline"
        className="w-full rounded-ds-xl"
      >
        {copied ? 'Copied!' : 'Copy link / Share'}
      </Button>
    </Card>
  );
};

export default ShareLinkCard;