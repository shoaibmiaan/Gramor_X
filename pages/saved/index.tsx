import { Container } from '@/components/design-system/Container';
import { SavedList } from '@/components/saved/List';

export default function SavedPage() {
  return (
    <section className="bg-lightBg/40 py-16 dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
      <Container className="max-w-5xl">
        <header className="mb-8 flex flex-col gap-2">
          <span className="text-caption uppercase tracking-[0.28em] text-mutedText">Library</span>
          <h1 className="text-h1 font-slab">Saved items</h1>
          <p className="max-w-2xl text-body text-mutedText">
            All of your bookmarked lessons, practice sets, and AI feedback in one place. Open items
            to resume where you left off or remove them when you’re done.
          </p>
        </header>
        <SavedList />
      </Container>
    </section>
  );
}
