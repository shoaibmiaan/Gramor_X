// lib/navigation/utils.ts
import { isFeatureEnabled } from '@/lib/constants/features';
import { flags } from '@/lib/flags';
import type { FeatureGate, NavItemConfig, NavigationContext, NavSectionConfig, SubscriptionTier } from './types';
import { TIER_ORDER } from './types';

const tierRank = (tier: SubscriptionTier) => TIER_ORDER.indexOf(tier);

export const isGateSatisfied = (gate: FeatureGate | undefined, ctx: NavigationContext): boolean => {
  if (!gate) return true;

  if (gate.requiresAuth && !ctx.isAuthenticated) {
    return false;
  }

  if (gate.minTier) {
    const requiredRank = tierRank(gate.minTier);
    if (requiredRank > tierRank(ctx.tier)) {
      return false;
    }
  }

  if (gate.flag && !flags.enabled(gate.flag)) {
    return false;
  }

  if (gate.featureToggle && !isFeatureEnabled(gate.featureToggle)) {
    return false;
  }

  return true;
};

export const filterNavItems = <T extends NavItemConfig>(items: readonly T[] | T[], ctx: NavigationContext): T[] => {
  return items.filter((item) => isGateSatisfied(item.featureGate, ctx));
};

export const filterNavSections = (sections: readonly NavSectionConfig[] | NavSectionConfig[], ctx: NavigationContext): NavSectionConfig[] => {
  return sections
    .filter((section) => isGateSatisfied(section.featureGate, ctx))
    .map((section) => ({
      ...section,
      items: filterNavItems(section.items, ctx),
    }))
    .filter((section) => section.items.length > 0);
};
