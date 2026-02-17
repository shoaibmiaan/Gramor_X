import { ALLOWED_REGISTERS, WordPack } from './word-packs';

const MAX_EXAMPLE_LENGTH = 180;
const PROFANITY_LIST = ['damn', 'hell', 'shit', 'bloody'];

function containsProfanity(value: string): boolean {
  const lower = value.toLowerCase();
  return PROFANITY_LIST.some((term) => lower.includes(term));
}

export function validateWordPacks(packs: WordPack[]): string[] {
  const issues: string[] = [];
  if (packs.length === 0) {
    issues.push('No word packs defined. Add entries to data/content/word-packs.(json|csv).');
    return issues;
  }

  const seen = new Set<string>();

  for (const pack of packs) {
    const key = `${pack.word}::${pack.slug}`;
    if (seen.has(key)) {
      issues.push(`Duplicate pack detected for ${key}.`);
    } else {
      seen.add(key);
    }

    if (!ALLOWED_REGISTERS.includes(pack.register)) {
      issues.push(`Invalid register "${pack.register}" on ${key}.`);
    }

    if (!pack.collocations.length) {
      issues.push(`Missing collocations for ${key}.`);
    } else {
      const collocationSet = new Set<string>();
      for (const collocation of pack.collocations) {
        const trimmed = collocation.trim();
        if (!trimmed) {
          issues.push(`Empty collocation entry on ${key}.`);
          continue;
        }
        if (collocationSet.has(trimmed.toLowerCase())) {
          issues.push(`Duplicate collocation "${trimmed}" inside ${key}.`);
        } else {
          collocationSet.add(trimmed.toLowerCase());
        }
        if (containsProfanity(trimmed)) {
          issues.push(`Profanity detected in collocation "${trimmed}" on ${key}.`);
        }
      }
    }

    if (!pack.examples.length) {
      issues.push(`Missing IELTS-tagged examples for ${key}.`);
    } else {
      for (const example of pack.examples) {
        if (example.text.length > MAX_EXAMPLE_LENGTH) {
          issues.push(
            `Example on ${key} exceeds ${MAX_EXAMPLE_LENGTH} characters: "${example.text.slice(0, 40)}…"`,
          );
        }
        if (!example.tags.length) {
          issues.push(`Example on ${key} is missing tags.`);
        } else if (!example.tags.some((tag) => tag.toLowerCase().startsWith('ielts'))) {
          issues.push(`Example on ${key} lacks an IELTS-prefixed tag.`);
        }
        if (containsProfanity(example.text)) {
          issues.push(`Profanity detected in example on ${key}.`);
        }
      }
    }

    if (pack.audioRef && !/^https?:\/\//.test(pack.audioRef)) {
      issues.push(`Audio reference for ${key} must be an absolute URL.`);
    }
  }

  return issues;
}

export function summarizeValidation(packs: WordPack[]): { issues: string[]; total: number } {
  const issues = validateWordPacks(packs);
  return { issues, total: packs.length };
}

export { MAX_EXAMPLE_LENGTH };
export const PROFANITY_TERMS = PROFANITY_LIST;
