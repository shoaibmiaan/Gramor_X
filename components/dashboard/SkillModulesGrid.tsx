import type { SkillModule } from '@/types/dashboard';
import { SkillModuleCard } from '@/components/cards/SkillModuleCard';

export function SkillModulesGrid({ modules }: { modules: SkillModule[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium">Skill Modules</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((module) => (
          <SkillModuleCard key={module.name} module={module} />
        ))}
      </div>
    </section>
  );
}
