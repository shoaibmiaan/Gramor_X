// components/navigation/constants.ts
import type { IconName } from '@/components/design-system/Icon';
import { Icon as DSIcon } from '@/components/design-system/Icon';
import type * as React from 'react';
import { flags } from '@/lib/flags';

// Keep consumer compatibility: expose a React component under `Icon`
type IconComponent = React.FC<React.SVGProps<SVGSVGElement>>;
const withName = (name: IconName): IconComponent => {
  const NamedIcon = (props) => <DSIcon name={name} {...props} />;
  NamedIcon.displayName = `Icon(${name})`;
  return NamedIcon;
};

export type ModuleLink = {
  label: string;
  href: string;
  desc?: string;
  /** DS Icon component wrapper so existing callers can do <Item.Icon /> */
  Icon?: IconComponent;
  badge?: string;
  tone?: 'purple' | 'blue' | 'orange' | 'green';
  kbd?: string;
};

export const MODULE_LINKS: ModuleLink[] = [
  { label: 'Listening', href: '/listening', desc: 'Audio comprehension drills', Icon: withName('Headphones'), badge: 'AI', tone: 'blue',   kbd: 'L' },
  { label: 'Reading',   href: '/reading',   desc: 'Short passages & skimming', Icon: withName('BookOpen'),                        tone: 'purple', kbd: 'R' },
  { label: 'Writing',   href: '/writing',   desc: 'Prompts, structure & style', Icon: withName('PenSquare'),                      tone: 'orange', kbd: 'W' },
  { label: 'Speaking',  href: '/speaking',  desc: 'Pronunciation & fluency',   Icon: withName('MicVocal'),                        tone: 'green',  kbd: 'S' },
];

export const NAV: ReadonlyArray<{ href: string; label: string }> = [
  { href: '/predictor', label: 'Band Predictor' },
  { href: '/pricing',   label: 'Pricing' },
];

const baseUserMenuLinks: { id: string; href: string; label: string }[] = [
  { id: 'account',   href: '/account',           label: 'Account' },
  { id: 'saved',     href: '/saved',             label: 'Saved items' },
  { id: 'settings',  href: '/settings',          label: 'Settings' },
  { id: 'billing',   href: '/account/billing',   label: 'Billing' },
  { id: 'referrals', href: '/account/referrals', label: 'Referrals' },
];

if (flags.enabled('notifications')) {
  baseUserMenuLinks.splice(3, 0, { id: 'notifications', href: '/notifications', label: 'Notifications' });
}

export const USER_MENU_LINKS: ReadonlyArray<{ id: string; href: string; label: string }> = baseUserMenuLinks;
