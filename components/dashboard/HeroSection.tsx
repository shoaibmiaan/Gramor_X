import React, { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/design-system/Button';
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
  const [hover, setHover] = useState(false);
  const momentum = Math.min(100, Math.round(streak * 4.2 + (goalBand ?? 6) * 5));
  const color = momentum > 85 ? '#22c55e' : momentum > 65 ? '#eab308' : '#ef4444';

  return (
    <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-4">
        {profileAvatarUrl ? (
          <Image src={profileAvatarUrl} alt={profile?.full_name || 'Learner'} width={64} height={64} className="h-16 w-16 rounded-full ring-2 ring-primary/40" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-3xl font-semibold text-primary">
            {(profile?.full_name || 'L').slice(0, 2).toUpperCase()}
          </div>
        )}
        <div>
          <div className="text-4xl font-semibold text-foreground">Welcome back, {profile?.full_name || 'Learner'}</div>
          <p className="text-grayish">Your IELTS journey is on fire.</p>
        </div>
      </div>

      {/* Premium Momentum Ring */}
      <div
        className="relative flex h-32 w-32 cursor-pointer items-center justify-center transition-all hover:scale-105"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <svg className="h-32 w-32 -rotate-90 transition-all" viewBox="0 0 120 120">
          <circle className="text-slate-200 dark:text-slate-800" strokeWidth="14" fill="transparent" r="48" cx="60" cy="60" />
          <circle
            className="transition-all duration-700"
            stroke={color}
            strokeWidth="14"
            strokeDasharray="301"
            strokeDashoffset={301 - (momentum / 100) * 301}
            strokeLinecap="round"
            fill="transparent"
            r="48"
            cx="60"
            cy="60"
            style={{ filter: hover ? 'drop-shadow(0 0 18px currentColor)' : 'none' }}
          />
        </svg>
        <div className="absolute text-center">
          <div className="text-5xl font-bold transition-colors" style={{ color }}>{momentum}</div>
          <div className="text-xs font-medium uppercase tracking-[2px] text-slate-400">MOMENTUM</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={onOpenAICoach} variant="soft" tone="primary" leadingIcon={<Icon name="Sparkles" size={16} />}>AI Coach</Button>
        <Button onClick={onOpenStudyBuddy} variant="soft" tone="secondary" leadingIcon={<Icon name="Users" size={16} />}>Study Buddy</Button>
        <Button onClick={onOpenMistakesBook} variant="soft" tone="success" leadingIcon={<Icon name="NotebookPen" size={16} />}>Mistakes Book</Button>
        <Button onClick={onOpenWhatsAppTasks} variant="soft" tone="info" leadingIcon={<Icon name="MessageCircle" size={16} />}>WhatsApp Tasks</Button>
      </div>
    </div>
  );
};