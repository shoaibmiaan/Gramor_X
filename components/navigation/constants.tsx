// components/navigation/constants.ts
import type { IconName } from '@/components/design-system/Icon';
import { Icon as DSIcon } from '@/components/design-system/Icon';
import type * as React from 'react';

// Keep consumer compatibility: expose a React component under `Icon`
type IconComponent = React.FC<React.SVGProps<SVGSVGElement>>;
const withName = (name: IconName): IconComponent => (props) => <DSIcon name={name} {...props} />;

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
