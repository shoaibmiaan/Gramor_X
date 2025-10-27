import React, { type ComponentProps } from 'react';
import { Container } from '@/components/design-system/Container';
import { Badge } from '@/components/design-system/Badge';
import { Card } from '@/components/design-system/Card';
import { Icon } from '@/components/design-system/Icon';
import { Button } from '@/components/design-system/Button';

const highlightPills = [
  'Guest preview ready',
  'Design tokens only',
  'Admin authoring flow',
] as const;

type FeatureItem = {
  name: string;
  file: string;
  summary: string;
  icon: string;
};

type BadgeVariant = ComponentProps<typeof Badge>['variant'];

type FeatureGroup = {
  label: string;
  title: string;
  description: string;
  icon: string;
  accent: {
    iconBg: string;
    iconText: string;
    badgeVariant: BadgeVariant;
  };
  items: FeatureItem[];
};

const groups: FeatureGroup[] = [
  {
    label: 'Pages',
    title: 'Ship-ready surfaces',
    description:
      'Cover browse, detail, and authoring in one cohesive module so product and content can ship together.',
    icon: 'LayoutDashboard',
    accent: {
      iconBg: 'bg-electricBlue/15',
      iconText: 'text-electricBlue',
      badgeVariant: 'info',
    },
    items: [
      {
        name: 'VocabularyBrowser',
        file: '/vocabulary/index.tsx',
        summary: 'Interactive grid with search, filters, and infinite scroll to explore IELTS-ready vocabulary.',
        icon: 'Search',
      },
      {
        name: 'WordDetailPage',
        file: '/vocabulary/[word].tsx',
        summary: 'Headword view with IPA, audio, senses, examples, and frequency data in DS containers.',
        icon: 'BookText',
      },
      {
        name: 'NewSenseForm',
        file: '/admin/vocabulary/new-sense.tsx',
        summary: 'Admin form using DS inputs, selects, and cards to add fresh senses without leaving the app.',
        icon: 'FilePlus2',
      },
    ],
  },
  {
    label: 'Components',
    title: 'Reusable building blocks',
    description:
      'Filters, cards, pronunciation, and lists snap into any page while staying aligned with DS spacing tokens.',
    icon: 'Layers',
    accent: {
      iconBg: 'bg-purpleVibe/15',
      iconText: 'text-purpleVibe',
      badgeVariant: 'accent',
    },
    items: [
      {
        name: 'Filters',
        file: 'components/vocab/Filters.tsx',
        summary: 'Search + POS + level + category strip with badges and icon buttons for quick resets.',
        icon: 'Filter',
      },
      {
        name: 'WordCard',
        file: 'components/vocab/WordCard.tsx',
        summary: 'Compact vocabulary card with POS, CEFR level, and category badges using DS shadows.',
        icon: 'IdCard',
      },
      {
        name: 'SenseList',
        file: 'components/vocab/SenseList.tsx',
        summary: 'Typography-driven list of senses and synonyms separated with DS rhythm + separators.',
        icon: 'ListChecks',
      },
      {
        name: 'PronunciationBar',
        file: 'components/vocab/PronunciationBar.tsx',
        summary: 'Horizontal IPA + audio controls with icon buttons for playback and saving.',
        icon: 'AudioLines',
      },
    ],
  },
  {
    label: 'Support',
    title: 'Data & loading layer',
    description:
      'Consistent fetching, caching, and pagination hooks keep the browser fast across infinite scroll.',
    icon: 'ServerCog',
    accent: {
      iconBg: 'bg-success/15',
      iconText: 'text-success',
      badgeVariant: 'success',
    },
    items: [
      {
        name: 'useInfiniteQuery',
        file: 'lib/hooks/useInfiniteQuery.ts',
        summary: 'Generic infinite-query hook with error handling tailored to vocabulary fetch patterns.',
        icon: 'Infinity',
      },
      {
        name: 'api',
        file: 'lib/db/api.ts',
        summary: 'Shared fetch wrapper enforcing consistent error messaging and caching heuristics.',
        icon: 'CloudCog',
      },
    ],
  },
];

export const VocabularyFeature: React.FC = () => {
  return (
    <Container>
      <div className="mx-auto max-w-3xl text-center">
        <Badge variant="info" size="sm" className="inline-flex items-center gap-2">
          <Icon name="Sparkles" size={16} className="text-electricBlue" />
          Vocabulary intelligence
        </Badge>
        <h2 className="mt-4 font-slab text-3xl font-semibold text-foreground sm:text-4xl">
          A launch-ready vocabulary module for home
        </h2>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">
          Drop this module onto the homepage to spotlight the new browser, detail surface, and admin authoring flow—all built
          on design-system tokens.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {highlightPills.map((pill) => (
          <Badge
            key={pill}
            variant="neutral"
            size="sm"
            className="uppercase tracking-[0.3em] text-[0.65rem] sm:text-[0.7rem]"
          >
            {pill}
          </Badge>
        ))}
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {groups.map((group) => (
          <Card
            key={group.label}
            padding="lg"
            className="h-full border-border/60 bg-white/80 shadow-md backdrop-blur dark:bg-dark/70"
          >
            <div className="flex items-start gap-4">
              <span
                className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${group.accent.iconBg} ${group.accent.iconText}`}
              >
                <Icon name={group.icon} size={24} />
              </span>
              <div>
                <Badge
                  variant={group.accent.badgeVariant}
                  size="xs"
                  className="uppercase tracking-[0.35em] text-[0.6rem]"
                >
                  {group.label}
                </Badge>
                <h3 className="mt-2 text-xl font-semibold text-foreground">{group.title}</h3>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{group.description}</p>

            <ul className="mt-6 space-y-4">
              {group.items.map((item) => (
                <li key={item.name} className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-muted/40 text-foreground/80">
                    <Icon name={item.icon} size={18} />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{item.name}</span>
                      <Badge variant="neutral" size="xs" className="font-mono text-[0.6rem] tracking-tight">
                        {item.file}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.summary}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <div className="mt-12 rounded-ds-2xl border border-dashed border-electricBlue/40 bg-electricBlue/10 p-6 sm:flex sm:items-center sm:justify-between sm:gap-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-electricBlue">Review it live</p>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Jump straight into the browser or open the admin form to add senses as you QA the experience.
          </p>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 sm:mt-0">
          <Button
            href="/vocabulary"
            variant="soft"
            tone="info"
            className="rounded-ds-xl"
            trailingIcon={<Icon name="ArrowUpRight" size={16} />}
          >
            Open vocabulary browser
          </Button>
          <Button
            href="/admin/vocabulary/new-sense"
            variant="soft"
            tone="default"
            className="rounded-ds-xl"
            trailingIcon={<Icon name="Plus" size={16} />}
          >
            Add a new sense
          </Button>
        </div>
      </div>
    </Container>
  );
};

export default VocabularyFeature;
