import fs from 'node:fs';
import path from 'node:path';

export type WordRegister = 'formal' | 'neutral' | 'informal';

export type WordExample = {
  text: string;
  tags: string[];
};

export type WordPack = {
  word: string;
  slug: string;
  register: WordRegister;
  audioRef: string | null;
  collocations: string[];
  examples: WordExample[];
  source: 'json' | 'csv';
};

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, 'data/content');
const JSON_FILE = path.join(CONTENT_DIR, 'word-packs.json');
const CSV_FILE = path.join(CONTENT_DIR, 'word-packs.csv');

export const ALLOWED_REGISTERS: WordRegister[] = ['formal', 'neutral', 'informal'];

function splitCsv(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function normaliseCollocations(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return Array.from(new Set(raw.map((value) => String(value).trim()).filter(Boolean)));
  }

  if (typeof raw === 'string') {
    return Array.from(
      new Set(
        raw
          .replace(/\|/g, ';')
          .split(/[,;]+/)
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    );
  }

  return [];
}

function normaliseExamples(raw: unknown): WordExample[] {
  const cleaned: WordExample[] = [];

  if (!raw) return cleaned;

  const entries = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? (() => {
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })()
      : [];

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const text = String((entry as Record<string, unknown>).text ?? '').trim();
    const tagsRaw = (entry as Record<string, unknown>).tags;
    const tags: string[] = [];
    if (Array.isArray(tagsRaw)) {
      for (const tag of tagsRaw) {
        const trimmed = String(tag ?? '').trim();
        if (trimmed) tags.push(trimmed);
      }
    }
    if (!text || tags.length === 0) continue;
    cleaned.push({ text, tags });
  }

  return cleaned;
}

function parseJsonFile(filePath: string): WordPack[] {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf8');
  if (!raw.trim()) return [];

  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];

    return data
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const word = String((entry as Record<string, unknown>).word ?? '').trim().toLowerCase();
        const slug = String((entry as Record<string, unknown>).slug ?? '').trim();
        if (!word || !slug) return null;
        const register = String((entry as Record<string, unknown>).register ?? 'neutral')
          .trim()
          .toLowerCase() as WordRegister;
        const normalisedRegister: WordRegister = ALLOWED_REGISTERS.includes(register)
          ? register
          : 'neutral';
        const audioValue = (entry as Record<string, unknown>).audioRef ?? '';
        const audioRef = audioValue ? String(audioValue).trim() : null;

        return {
          word,
          slug,
          register: normalisedRegister,
          audioRef,
          collocations: normaliseCollocations((entry as Record<string, unknown>).collocations),
          examples: normaliseExamples((entry as Record<string, unknown>).examples),
          source: 'json' as const,
        } satisfies WordPack;
      })
      .filter((entry): entry is WordPack => Boolean(entry));
  } catch {
    return [];
  }
}

function parseCsvFile(filePath: string): WordPack[] {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length <= 1) return [];

  const headers = splitCsv(lines[0]).map((header) => header.trim());
  const packs: WordPack[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = splitCsv(lines[i]);
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = values[index] ?? '';
    });

    const word = (record.word ?? '').trim().toLowerCase();
    const slug = (record.slug ?? '').trim();
    if (!word || !slug) continue;
    const register = (record.register ?? 'neutral').trim().toLowerCase() as WordRegister;
    const normalisedRegister: WordRegister = ALLOWED_REGISTERS.includes(register) ? register : 'neutral';
    const audioRef = (record.audioRef ?? '').trim() || null;

    packs.push({
      word,
      slug,
      register: normalisedRegister,
      audioRef,
      collocations: normaliseCollocations(record.collocations ?? ''),
      examples: normaliseExamples(record.examples ?? ''),
      source: 'csv',
    });
  }

  return packs;
}

export function loadWordPacks(): WordPack[] {
  const merged = new Map<string, WordPack>();

  for (const pack of parseJsonFile(JSON_FILE)) {
    merged.set(`${pack.word}::${pack.slug}`, pack);
  }

  for (const pack of parseCsvFile(CSV_FILE)) {
    merged.set(`${pack.word}::${pack.slug}`, pack);
  }

  return Array.from(merged.values()).sort((a, b) => a.word.localeCompare(b.word));
}
