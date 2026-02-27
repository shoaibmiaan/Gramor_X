import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { StreakIndicator } from '@/components/design-system/StreakIndicator';
import Icon from '@/components/design-system/Icon';
import type { Profile } from '@/types/profile';

interface HeroSectionProps {
  profile: Profile | null;
  profileAvatarUrl: string | null;
  goalBand: number | null;
  targetStudyTime: string;
  streak: number;
  shields: number;
  topBadges: any[];
  onClaimShield: () => void;
  onUseShield: () => void;
  onOpenAICoach: () => void;
  onOpenStudyBuddy: () => void;
  onOpenMistakesBook: () => void;
  onOpenWhatsAppTasks: () => void;
  onShareDashboard: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  profile,
  profileAvatarUrl,
  goalBand,
  targetStudyTime,
  streak,
  shields,
  topBadges,
  onClaimShield,
  onUseShield,
  onOpenAICoach,
  onOpenStudyBuddy,
  onOpenMistakesBook,
  onOpenWhatsAppTasks,
  onShareDashboard,
}) => {
  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-4">
        {profileAvatarUrl ? (
          <Image
            src={profileAvatarUrl}
            alt={profile?.full_name ? `${profile.full_name} avatar` : 'Profile avatar'}
            width={64}
            height={64}
            className="h-16 w-16 rounded-full object-cover ring-2 ring-primary/40"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-h3 font-semibold text-primary">
            {(profile?.full_name || 'Learner')
              .split(' ')
              .slice(0, 2)
              .map((p) => p.charAt(0).toUpperCase())
              .join('') || 'L'}
          </div>
        )}

        <div className="space-y-2">
          <div>
            <h1 className="font-slab text-display text-gradient-primary">
              Welcome back, {profile?.full_name || 'Learner'}
            </h1>
            <p className="text-grayish">
              Every module below is wired into your IELTS goal—choose where to dive in next.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-small text-muted-foreground">
            <span>
              Preferred language: {(profile?.preferred_language ?? 'en').toUpperCase()}
            </span>
            {typeof goalBand === 'number' ? (
              <span>• Target band {goalBand.toFixed(1)}</span>
            ) : (
              <span>• Set your goal to unlock tailored guidance</span>
            )}
            {targetStudyTime ? <span>• Study rhythm: {targetStudyTime}</span> : null}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-start gap-3 md:items-end">
        <div className="flex flex-wrap items-center gap-3">
          <StreakIndicator value={streak} />
          {streak >= 7 && (
            <Badge variant="success" size="sm">
              🔥 {streak}-day streak!
            </Badge>
          )}
          <Badge size="sm">🛡 {shields}</Badge>
          <Button onClick={onClaimShield} variant="secondary" className="rounded-ds-xl">
            Claim Shield
          </Button>
          {shields > 0 && (
            <Button onClick={onUseShield} variant="secondary" className="rounded-ds-xl">
              Use Shield
            </Button>
          )}
        </div>

        {topBadges.length ? (
          <div className="flex flex-wrap items-center gap-2 text-2xl">
            {topBadges.map((meta) => (
              <span key={meta.id} aria-label={meta.name} title={meta.name}>
                {meta.icon}
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={onOpenAICoach}
            variant="soft"
            tone="primary"
            size="sm"
            className="rounded-ds-xl"
            leadingIcon={<Icon name="Sparkles" size={16} className="text-primary" />}
          >
            AI Coach
          </Button>
          <Button
            onClick={onOpenStudyBuddy}
            variant="soft"
            tone="secondary"
            size="sm"
            className="rounded-ds-xl"
            leadingIcon={<Icon name="Users" size={16} className="text-secondary" />}
          >
            Study Buddy
          </Button>
          <Button
            onClick={onOpenMistakesBook}
            variant="soft"
            tone="success"
            size="sm"
            className="rounded-ds-xl"
            leadingIcon={<Icon name="NotebookPen" size={16} className="text-success" />}
          >
            Mistakes Book
          </Button>
          <Button
            onClick={onOpenWhatsAppTasks}
            variant="soft"
            tone="info"
            size="sm"
            className="rounded-ds-xl"
            leadingIcon={<Icon name="MessageCircle" size={16} className="text-electricBlue" />}
          >
            WhatsApp Tasks
          </Button>
          <Button
            onClick={onShareDashboard}
            variant="ghost"
            size="sm"
            className="rounded-ds-xl"
            leadingIcon={<Icon name="Share2" size={16} />}
          >
            Share progress
          </Button>
        </div>
      </div>
    </div>
  );
};