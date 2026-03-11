import type { IconName } from '@/components/design-system/Icon';

export type HomeBadgeTone = 'success' | 'accent' | 'info' | 'neutral' | 'warning';

export interface HomeModuleStatus {
  code: 'live' | 'expanded' | 'core' | 'beta' | 'coming-soon';
  label: string;
  tone: HomeBadgeTone;
}

export interface HomeAvailability {
  isAvailable: boolean;
  label: string;
  reason?: string;
}

export interface HomeModule {
  id: string;
  icon: IconName;
  title: string;
  description: string;
  bullets: string[];
  href: string;
  status: HomeModuleStatus;
  availability: HomeAvailability;
  metadata?: Record<string, string | number | boolean>;
}

export interface HomeQuickLink {
  label: string;
  description: string;
  href: string;
  icon: IconName;
  availability: HomeAvailability;
  actionLabel: string;
}

export interface HomeReleaseHighlight {
  id: string;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  statusLabel: string;
}

export interface HomeTestimonial {
  initials: string;
  name: string;
  meta: string;
  quote: string;
  resultLabel: string;
}

export interface HomeOverviewPayload {
  generatedAt: string;
  modules: HomeModule[];
  quickLinks: HomeQuickLink[];
  releaseHighlights: HomeReleaseHighlight[];
  testimonials: HomeTestimonial[];
  metadata?: {
    freePlanName: string;
    freePlanMonthlyPrice: number;
    boosterPlanName: string;
    boosterPlanMonthlyPrice: number;
  };
}
