// lib/navigation/types.ts
import type { IconName } from '@/components/design-system/Icon';
import type { FeatureToggleKey } from '@/lib/constants/features';
import type { FeatureFlagKey } from '@/lib/flags';

export type SubscriptionTier = 'free' | 'seedling' | 'rocket' | 'owl';

export const TIER_ORDER: readonly SubscriptionTier[] = ['free', 'seedling', 'rocket', 'owl'] as const;

export type FeatureGate = {
  /** Optional Supabase-authenticated requirement */
  requiresAuth?: boolean;
  /** Minimum subscription tier required to see this item */
  minTier?: SubscriptionTier;
  /** Legacy feature flag keys backed by lib/flags */
  flag?: FeatureFlagKey;
  /** Config-driven toggle, see lib/constants/features */
  featureToggle?: FeatureToggleKey;
};

export type NavItemConfig = {
  id: string;
  label: string;
  href: string;
  description?: string;
  icon?: IconName;
  badge?: string;
  external?: boolean;
  kbd?: string;
  target?: string;
  tier?: SubscriptionTier;
  featureGate?: FeatureGate;
};

export type NavSectionConfig = {
  id: string;
  label: string;
  description?: string;
  icon?: IconName;
  badge?: string;
  featureGate?: FeatureGate;
  items: NavItemConfig[];
};

type HeaderCtaItem = { label: string; href: string };

export type HeaderNavigationSchema = {
  main: NavItemConfig[];
  aiTools: NavItemConfig[];
  profile: NavItemConfig[];
  cta?: {
    guest?: HeaderCtaItem | null;
    authed?: HeaderCtaItem | null;
  };
  optional?: {
    themeToggle?: boolean;
    localeSwitch?: boolean;
    notifications?: boolean;
  };
};

export type FooterNavigationSchema = NavSectionConfig[];

export type FloatingNavigationSchema = {
  quickActions: NavItemConfig[];
};

export type AppNavigationSchema = {
  header: HeaderNavigationSchema;
  sidebar: NavSectionConfig[];
  footer: FooterNavigationSchema;
  floating: FloatingNavigationSchema;
};

export type NavigationContext = {
  isAuthenticated: boolean;
  tier: SubscriptionTier;
};
