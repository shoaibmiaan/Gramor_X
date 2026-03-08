import type { IconName } from '@/components/design-system/Icon';

export type TileAction =
  | { label: string; href: string; action?: never }
  | { label: string; action: () => void; href?: never };

export type InnovationTile = {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  accent?: 'primary' | 'secondary' | 'success' | 'info';
  badge?: string;
  meta?: string;
  primary: TileAction;
  secondary?: TileAction;
};

export type ActionItem = {
  id: string;
  title: string;
  caption: string;
  icon: IconName;
  accent: NonNullable<InnovationTile['accent']>;
  primary: TileAction;
  secondary?: TileAction;
  chip?: string | null;
  done?: boolean;
};
