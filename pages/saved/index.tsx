import { Container } from '@/components/design-system/Container';
import { SavedList } from '@/components/saved/List';
import { useLocale } from '@/lib/locale';

export default function SavedPage() {
  const { t } = useLocale();
  return (
    <section className="bg-lightBg/40 py-16 dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
      <Container className="max-w-5xl">
        <header className="mb-8 flex flex-col gap-2">
          <span className="text-caption uppercase tracking-[0.28em] text-mutedText">{t('saved.hero.eyebrow')}</span>
          <h1 className="text-h1 font-slab">{t('saved.hero.title')}</h1>
          <p className="max-w-2xl text-body text-mutedText">{t('saved.hero.subtitle')}</p>
        </header>
        <SavedList />
      </Container>
    </section>
  );
}
