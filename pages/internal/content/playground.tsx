import { useEffect, useMemo, useState } from 'react';
import type { GetStaticProps, NextPage } from 'next';
import Head from 'next/head';
import clsx from 'clsx';

import { loadWordPacks, type WordPack } from '@/lib/content/word-packs';

const REGISTER_LABEL: Record<WordPack['register'], string> = {
  formal: 'Formal register',
  neutral: 'Neutral register',
  informal: 'Informal register',
};

type PlaygroundProps = {
  packs: WordPack[];
};

const PlaygroundPage: NextPage<PlaygroundProps> = ({ packs }) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return packs;

    return packs.filter((pack) => {
      if (pack.word.includes(needle)) return true;
      if (pack.slug.toLowerCase().includes(needle)) return true;
      if (pack.collocations.some((item) => item.toLowerCase().includes(needle))) return true;
      return pack.examples.some((example) => example.text.toLowerCase().includes(needle));
    });
  }, [packs, query]);

  const [activeSlug, setActiveSlug] = useState<string>(() => packs[0]?.slug ?? '');

  useEffect(() => {
    if (!filtered.some((pack) => pack.slug === activeSlug)) {
      setActiveSlug(filtered[0]?.slug ?? '');
    }
  }, [filtered, activeSlug]);

  const active = filtered.find((pack) => pack.slug === activeSlug) ?? filtered[0] ?? null;

  return (
    <>
      <Head>
        <title>Word Pack Playground · Internal Tools</title>
      </Head>
      <main className="px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <header className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Word Pack Playground</h1>
            <p className="mt-2 max-w-2xl text-base text-slate-600">
              Preview collocations, IELTS-tagged examples, and audio references sourced from the CSV/JSON packs.
              Search for a word to review its drill set before publishing.
            </p>
          </header>

          <section className="grid gap-6 lg:grid-cols-[320px,1fr]">
            <aside className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-4">
                <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="word-search">
                  Filter packs
                </label>
                <input
                  id="word-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by word, slug, or collocation"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring focus:ring-indigo-100"
                />
              </div>
              <ul className="max-h-[520px] overflow-y-auto p-2">
                {filtered.map((pack) => {
                  const isActive = pack.slug === activeSlug;
                  return (
                    <li key={pack.slug} className="mb-1 last:mb-0">
                      <button
                        type="button"
                        onClick={() => setActiveSlug(pack.slug)}
                        className={clsx(
                          'flex w-full flex-col rounded-md px-3 py-2 text-left transition',
                          isActive
                            ? 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200'
                            : 'bg-white text-slate-700 hover:bg-slate-50',
                        )}
                      >
                        <span className="text-sm font-medium">{pack.word}</span>
                        <span className="text-xs text-slate-500">{pack.slug}</span>
                      </button>
                    </li>
                  );
                })}
                {filtered.length === 0 && (
                  <li className="px-3 py-4 text-sm text-slate-500">No packs match your query.</li>
                )}
              </ul>
            </aside>

            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              {active ? (
                <div className="space-y-6">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-semibold text-slate-900">{active.word}</h2>
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-600">
                        {REGISTER_LABEL[active.register]}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        Source: {active.source.toUpperCase()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">Slug: {active.slug}</p>
                    {active.audioRef ? (
                      <audio
                        controls
                        src={active.audioRef}
                        className="mt-4 w-full rounded border border-slate-200"
                      >
                        Your browser does not support the audio element.
                      </audio>
                    ) : (
                      <p className="mt-4 text-sm text-slate-500">No audio reference provided.</p>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Collocations</h3>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {active.collocations.map((item) => (
                        <li
                          key={item}
                          className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">IELTS Examples</h3>
                    <div className="mt-3 space-y-4">
                      {active.examples.map((example) => (
                        <article key={example.text} className="rounded-md border border-slate-200 p-4">
                          <p className="text-sm text-slate-700">{example.text}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {example.tags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-slate-600"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  Select or create a pack to preview its drills.
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
};

export const getStaticProps: GetStaticProps<PlaygroundProps> = async () => {
  const packs = loadWordPacks();
  return {
    props: {
      packs,
    },
  };
};

export default PlaygroundPage;
