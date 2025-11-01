// components/layouts/LearningLayout.tsx
import * as React from 'react';
import { GraduationCap, Lightbulb, Sparkles, PenSquare, Palette, Library } from 'lucide-react';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { LayoutHero } from '@/components/layouts/shared/LayoutHero';
import { LayoutSurface } from '@/components/layouts/shared/LayoutSurface';
import { LayoutQuickNav } from '@/components/layouts/shared/LayoutQuickNav';

const LearningLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const highlight = (
    <>
      <div className="flex items-center gap-2 text-foreground">
        <Badge variant="success">Next up</Badge>
        <span className="text-sm font-medium">Listening drills unlock in 2 lessons</span>
      </div>
      <div className="grid gap-3 pt-3 text-foreground">
        <div className="flex items-baseline justify-between rounded-xl bg-background/70 p-3 shadow-sm">
          <span className="text-sm text-mutedText">Lessons complete</span>
          <span className="text-xl font-semibold text-gradient-accent">18 / 24</span>
        </div>
        <div className="flex items-baseline justify-between rounded-xl bg-background/70 p-3 shadow-sm">
          <span className="text-sm text-mutedText">Studio drafts</span>
          <span className="text-xl font-semibold text-gradient-accent">6</span>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-neonGreen/10 via-background to-background text-foreground">
      <LayoutHero
        accent="learning"
        eyebrow="Learning & Studio"
        title="Move through lessons, drills, and creative IELTS practice"
        description="Master skills one module at a time and publish polished responses inside your personal studio."
        actions={(
          <>
            <Button href="/learning/skills" size="lg">
              Browse lessons
            </Button>
            <Button href="/content/studio" variant="soft" tone="accent" size="lg">
              Open studio workspace
            </Button>
          </>
        )}
        highlight={highlight}
      >
        <LayoutQuickNav
          ariaLabel="Learning sections"
          items={[
            { href: '/learning', label: 'Overview', icon: <GraduationCap className="h-4 w-4" /> },
            { href: '/learning/skills', label: 'Skills', icon: <Lightbulb className="h-4 w-4" /> },
            { href: '/learning/skills/lessons', label: 'Lessons', icon: <Library className="h-4 w-4" /> },
            { href: '/learning/strategies', label: 'Strategies', icon: <Sparkles className="h-4 w-4" /> },
            { href: '/content/studio', label: 'Studio', icon: <PenSquare className="h-4 w-4" /> },
            { href: '/learning/resources', label: 'Resources', icon: <Palette className="h-4 w-4" /> },
          ]}
        />
      </LayoutHero>

      <main>
        <LayoutSurface accent="learning">
          <div className="space-y-6 text-base leading-relaxed text-foreground">{children}</div>
        </LayoutSurface>
      </main>
    </div>
  );
};

export default LearningLayout;
export { LearningLayout };
