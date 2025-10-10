#!/usr/bin/env python3
"""Generate a 1,000-word IELTS-friendly vocabulary bank.

The script pulls moderately advanced English vocabulary from ``wordfreq``,
uses WordNet to find definitions, sample sentences, and synonyms, and then
creates both a JSON dataset for local inspection and an SQL seed file for
Supabase. Running the script multiple times is idempotent because the
resulting SQL uses upserts on the unique ``word`` column.
"""
from __future__ import annotations

import json
import textwrap
from pathlib import Path
from typing import List, Sequence

import nltk
from nltk.corpus import wordnet as wn
from wordfreq import top_n_list, zipf_frequency

OUTPUT_JSON = Path('data/word-bank.json')
OUTPUT_SQL = Path('supabase/seed/word_bank.sql')
TARGET_COUNT = 1000

SKIP_WORDS = {
    'the', 'be', 'and', 'of', 'a', 'in', 'to', 'have', 'it', 'i', 'that', 'for', 'you',
    'he', 'with', 'on', 'do', 'say', 'this', 'they', 'at', 'but', 'we', 'his', 'from',
    'not', 'by', 'she', 'or', 'as', 'what', 'go', 'their', 'can', 'who', 'get', 'if',
    'would', 'her', 'all', 'my', 'make', 'about', 'know', 'will', 'as', 'up', 'one',
    'time', 'year', 'so', 'think', 'when', 'which', 'them', 'some', 'me', 'people',
    'take', 'out', 'into', 'just', 'see', 'him', 'your', 'come', 'could', 'now', 'than',
    'like', 'other', 'how', 'then', 'its', 'our', 'two', 'more', 'these', 'want', 'way',
    'look', 'first', 'also', 'new', 'because', 'day', 'use', 'man', 'find', 'here',
    'thing', 'give', 'many', 'well'
}

# Ensure corpora exist (download silently on first run)
nltk.download('wordnet', quiet=True)
nltk.download('omw-1.4', quiet=True)


def pick_synset(word: str):
    """Pick the most informative synset for a word."""
    synsets = wn.synsets(word)
    if not synsets:
        return None
    # Prefer adjectives/adverbs/nouns/verbs relevant to IELTS descriptions
    synsets.sort(key=lambda s: (
        0 if s.pos() in {'a', 's'} else 1 if s.pos() == 'n' else 2 if s.pos() == 'v' else 3,
        -len(s.examples()),
        len(s.definition()),
    ))
    return synsets[0]


def humanise_example(word: str, definition: str) -> str:
    base = definition.split(';')[0].split(',')[0].strip()
    if len(base) > 120:
        base = base[:117] + '…'
    return f"During IELTS prep, you might say, '{word.capitalize()} helps you {base}.'"


def cleanse_example(word: str, examples: Sequence[str], definition: str) -> str:
    for ex in examples:
        ex = ex.strip()
        if not ex:
            continue
        if len(ex) > 160:
            ex = ex[:157] + '…'
        if word.lower() not in ex.lower():
            ex = f"{ex} ({word})"
        return ex
    return humanise_example(word, definition)


def collect_words() -> List[dict]:
    chosen = []
    seen = set()
    candidates = top_n_list('en', n=12000)

    for raw in candidates:
        candidate = raw.lower()
        if candidate in SKIP_WORDS:
            continue
        if not candidate.isalpha():
            continue
        synset = pick_synset(candidate)
        if not synset:
            continue
        base = synset.lemmas()[0].name().replace('_', ' ').lower()
        if ' ' in base or not base.isalpha():
            continue
        if len(base) < 4:
            continue
        if base in seen or base in SKIP_WORDS:
            continue
        freq = zipf_frequency(base, 'en')
        if freq < 2.5 or freq > 4.8:
            continue
        definition = synset.definition().replace('"', '"').strip()
        if not definition:
            continue
        examples = cleanse_example(base, synset.examples(), definition)
        lemmas = {
            lemma.replace('_', ' ')
            for sense in wn.synsets(base)
            for lemma in sense.lemma_names()
        }
        synonyms = sorted({lemma for lemma in lemmas if lemma.lower() != base})[:6]
        lexname = synset.lexname().replace('.', ' ')
        interest = (
            f"Connect '{base}' with IELTS speaking or writing by describing {lexname.replace('_', ' ')} situations."
        )

        chosen.append({
            'word': base,
            'meaning': definition,
            'example': examples,
            'synonyms': synonyms,
            'interest': interest,
            'frequency': round(freq, 2),
        })
        seen.add(base)
        if len(chosen) >= TARGET_COUNT:
            break

    if len(chosen) < TARGET_COUNT:
        raise RuntimeError(f'Only collected {len(chosen)} words; adjust filters.')
    return chosen


def write_json(words: Sequence[dict]) -> None:
    OUTPUT_JSON.write_text(json.dumps(words, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def sql_array(items: Sequence[str]) -> str:
    if not items:
        return "'{}'::text[]"
    return f"ARRAY[{', '.join(sql_literal(item) for item in items)}]"


def chunked(seq: Sequence[dict], size: int) -> List[Sequence[dict]]:
    return [seq[i:i + size] for i in range(0, len(seq), size)]


def write_sql(words: Sequence[dict]) -> None:
    header = textwrap.dedent(
        """
        -- Auto-generated by tools/generate_word_bank.py
        -- Contains 1,000 IELTS-friendly vocabulary entries.
        -- Safe to re-run; uses UPSERT semantics to refresh content.
        """
    ).strip()

    lines = [header, '']
    chunk_size = 100
    for chunk in chunked(list(words), chunk_size):
        values = []
        for entry in chunk:
            values.append(
                '  ('
                f"{sql_literal(entry['word'])}, "
                f"{sql_literal(entry['meaning'])}, "
                f"{sql_literal(entry['example'])}, "
                f"{sql_array(entry['synonyms'])}, "
                f"{sql_literal(entry['interest'])}"
                ')'
            )
        lines.append('insert into public.words (word, meaning, example, synonyms, interest_hook) values')
        lines.append(',\n'.join(values) + '\n' + 'on conflict (word) do update set'
                    " meaning = excluded.meaning,"
                    " example = excluded.example,"
                    " synonyms = excluded.synonyms,"
                    " interest_hook = excluded.interest_hook;\n")
    OUTPUT_SQL.write_text('\n'.join(lines), encoding='utf-8')


def main() -> None:
    words = collect_words()
    write_json(words)
    write_sql(words)
    print(f'Generated {len(words)} entries into {OUTPUT_JSON} and {OUTPUT_SQL}')


if __name__ == '__main__':
    main()
