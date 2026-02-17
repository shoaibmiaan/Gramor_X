import Head from 'next/head';
import * as React from 'react';

import { RoleGuard } from '@/components/auth/RoleGuard';
import { Alert } from '@/components/design-system/Alert';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Container } from '@/components/design-system/Container';
import { Heading } from '@/components/design-system/Heading';
import { Input } from '@/components/design-system/Input';
import { Select } from '@/components/design-system/Select';
import { Textarea } from '@/components/design-system/Textarea';
import { useToast } from '@/components/design-system/Toaster';
import { apiFetch } from '@/lib/db/api';

const PART_OF_SPEECH_OPTIONS = [
  { value: 'noun', label: 'Noun' },
  { value: 'verb', label: 'Verb' },
  { value: 'adjective', label: 'Adjective' },
  { value: 'adverb', label: 'Adverb' },
  { value: 'phrase', label: 'Phrase' },
  { value: 'preposition', label: 'Preposition' },
  { value: 'conjunction', label: 'Conjunction' },
];

const LEVEL_OPTIONS = [
  { value: '', label: 'No level specified' },
  { value: 'A1', label: 'A1 Beginner' },
  { value: 'A2', label: 'A2 Elementary' },
  { value: 'B1', label: 'B1 Intermediate' },
  { value: 'B2', label: 'B2 Upper-intermediate' },
  { value: 'C1', label: 'C1 Advanced' },
  { value: 'C2', label: 'C2 Mastery' },
];

const CATEGORY_OPTIONS = [
  { value: 'academic', label: 'Academic' },
  { value: 'business', label: 'Business' },
  { value: 'daily-life', label: 'Daily life' },
  { value: 'technology', label: 'Technology' },
  { value: 'travel', label: 'Travel' },
  { value: 'general', label: 'General' },
];

const REGISTER_OPTIONS = [
  { value: '', label: 'Neutral' },
  { value: 'formal', label: 'Formal' },
  { value: 'informal', label: 'Informal' },
  { value: 'academic', label: 'Academic' },
  { value: 'slang', label: 'Slang' },
];

const FREQUENCY_BANDS = [
  { value: '', label: 'Not set' },
  { value: 'very-low', label: 'Very low' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'very-high', label: 'Very high' },
];

const DEFAULT_FORM = {
  headword: '',
  slug: '',
  partOfSpeech: 'noun',
  level: '',
  category: 'academic',
  additionalCategories: '',
  definition: '',
  usageNotes: '',
  examples: '',
  synonyms: '',
  antonyms: '',
  ipa: '',
  audioUrl: '',
  rootForm: '',
  register: '',
  frequencyScore: '',
  frequencyBand: '',
  notes: '',
};

type FormState = typeof DEFAULT_FORM;
type FormErrors = Partial<Record<keyof FormState, string>>;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const parseList = (value: string) =>
  value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

export default function NewSenseForm() {
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [saving, setSaving] = React.useState(false);
  const { success, error: toastError } = useToast();

  const validate = React.useCallback((): FormErrors => {
    const next: FormErrors = {};
    if (!form.headword.trim()) next.headword = 'Headword is required.';
    if (!form.definition.trim()) next.definition = 'Definition is required.';
    if (!form.partOfSpeech) next.partOfSpeech = 'Select a part of speech.';
    return next;
  }, [form.definition, form.headword, form.partOfSpeech]);

  const handleChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setForm(DEFAULT_FORM);
    setErrors({});
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    const fallbackSlug = slugify(form.headword);
    const slug = form.slug.trim() || fallbackSlug;

    const categories = [
      form.category,
      ...parseList(form.additionalCategories),
    ].filter(Boolean);

    const payload = {
      headword: form.headword.trim(),
      slug,
      partOfSpeech: form.partOfSpeech,
      level: form.level || null,
      categories,
      definition: form.definition.trim(),
      usageNotes: form.usageNotes.trim() || null,
      pronunciation: {
        ipa: form.ipa.trim() || null,
        audioUrl: form.audioUrl.trim() || null,
      },
      rootForm: form.rootForm.trim() || null,
      register: form.register || null,
      frequencyScore: form.frequencyScore ? Number(form.frequencyScore) : null,
      frequencyBand: form.frequencyBand || null,
      examples: parseList(form.examples),
      synonyms: parseList(form.synonyms),
      antonyms: parseList(form.antonyms),
      notes: form.notes.trim() || null,
    };

    setSaving(true);
    try {
      await apiFetch('/api/admin/vocabulary/senses', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      success('Word sense created');
      handleReset();
    } catch (err) {
      const message = (err as Error)?.message ?? 'Could not save sense';
      toastError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <RoleGuard allow="admin">
      <Head>
        <title>New vocabulary sense • Admin</title>
      </Head>

      <main className="bg-background py-16">
        <Container className="flex max-w-4xl flex-col gap-6">
          <Heading as="h1" size="xl">
            Add a new vocabulary sense
          </Heading>

          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {Object.keys(errors).length > 0 && (
                <Alert variant="warning" title="Please fix the highlighted fields." />
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Headword"
                  value={form.headword}
                  onChange={(event) => handleChange('headword', event.target.value)}
                  onBlur={() => {
                    if (!form.slug) {
                      handleChange('slug', slugify(form.headword));
                    }
                  }}
                  required
                  error={errors.headword}
                />
                <Input
                  label="Slug"
                  value={form.slug}
                  onChange={(event) => handleChange('slug', event.target.value)}
                  hint="Auto-generated from the headword, but editable."
                />
                <Select
                  label="Part of speech"
                  value={form.partOfSpeech}
                  onChange={(event) => handleChange('partOfSpeech', event.target.value)}
                  options={PART_OF_SPEECH_OPTIONS}
                  required
                  error={errors.partOfSpeech}
                />
                <Select
                  label="Level"
                  value={form.level}
                  onChange={(event) => handleChange('level', event.target.value)}
                  options={LEVEL_OPTIONS}
                />
                <Select
                  label="Primary category"
                  value={form.category}
                  onChange={(event) => handleChange('category', event.target.value)}
                  options={CATEGORY_OPTIONS}
                />
                <Input
                  label="Additional categories"
                  value={form.additionalCategories}
                  onChange={(event) => handleChange('additionalCategories', event.target.value)}
                  hint="Comma separated list"
                />
              </div>

              <Textarea
                label="Definition"
                value={form.definition}
                onChange={(event) => handleChange('definition', event.target.value)}
                required
                error={errors.definition}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <Textarea
                  label="Usage notes"
                  value={form.usageNotes}
                  onChange={(event) => handleChange('usageNotes', event.target.value)}
                  hint="Context, register, collocations"
                />
                <Select
                  label="Register"
                  value={form.register}
                  onChange={(event) => handleChange('register', event.target.value)}
                  options={REGISTER_OPTIONS}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Textarea
                  label="Examples"
                  value={form.examples}
                  onChange={(event) => handleChange('examples', event.target.value)}
                  hint="One example per line"
                />
                <Textarea
                  label="Synonyms"
                  value={form.synonyms}
                  onChange={(event) => handleChange('synonyms', event.target.value)}
                  hint="Comma or newline separated"
                />
                <Textarea
                  label="Antonyms"
                  value={form.antonyms}
                  onChange={(event) => handleChange('antonyms', event.target.value)}
                  hint="Comma or newline separated"
                />
                <Textarea
                  label="Notes"
                  value={form.notes}
                  onChange={(event) => handleChange('notes', event.target.value)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="IPA"
                  value={form.ipa}
                  onChange={(event) => handleChange('ipa', event.target.value)}
                />
                <Input
                  label="Audio URL"
                  value={form.audioUrl}
                  onChange={(event) => handleChange('audioUrl', event.target.value)}
                  placeholder="https://..."
                />
                <Input
                  label="Root form"
                  value={form.rootForm}
                  onChange={(event) => handleChange('rootForm', event.target.value)}
                />
                <Input
                  label="Frequency score"
                  type="number"
                  value={form.frequencyScore}
                  onChange={(event) => handleChange('frequencyScore', event.target.value)}
                  min="0"
                  step="0.01"
                />
                <Select
                  label="Frequency band"
                  value={form.frequencyBand}
                  onChange={(event) => handleChange('frequencyBand', event.target.value)}
                  options={FREQUENCY_BANDS}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={handleReset}>
                  Reset
                </Button>
                <Button type="submit" loading={saving} loadingText="Saving">
                  Save sense
                </Button>
              </div>
            </form>
          </Card>
        </Container>
      </main>
    </RoleGuard>
  );
}
