import * as React from 'react';
import { useRouter } from 'next/router';
import { teacherRegisterSchema, type TeacherRegisterInput } from '@/lib/validation/teacher';
import { z } from 'zod';
import { Input } from '@/components/design-system/Input';
import { Select } from '@/components/design-system/Select';
import { Textarea } from '@/components/design-system/Textarea';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { useTeacherProfile } from '@/hooks/useTeacherProfile';

type Props = {
  subjectsOptions: string[];
};

export const TeacherOnboardingForm: React.FC<Props> = ({ subjectsOptions }) => {
  const router = useRouter();
  const { refresh } = useTeacherProfile();
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const formRef = React.useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const fd = new FormData(formRef.current!);
    const payloadRaw = {
      teacher_subjects: fd.getAll('teacher_subjects').map(String).filter(Boolean),
      teacher_bio: String(fd.get('teacher_bio') || ''),
      teacher_experience_years: Number(fd.get('teacher_experience_years') || 0),
      teacher_cv_url: String(fd.get('teacher_cv_url') || ''),
    };

    const parsed = teacherRegisterSchema.safeParse(payloadRaw);
    if (!parsed.success) {
      setSubmitting(false);
      setError(parsed.error.issues.map(i => i.message).join(', '));
      return;
    }

    const r = await fetch('/api/teacher/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data satisfies TeacherRegisterInput),
    });

    const json = await r.json();
    if (!r.ok) {
      setSubmitting(false);
      setError(json?.error || 'Failed to submit');
      return;
    }

    await refresh();
    router.replace('/teacher'); // show pending screen
  };

  return (
    <Card className="p-6 space-y-6 card-surface">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Teacher Registration</h1>
        <Badge variant="secondary">Step 1 of 1</Badge>
      </div>

      {error ? (
        <div className="rounded-ds-2xl border border-border p-3 text-sm">
          {error}
        </div>
      ) : null}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm">Subjects you teach</label>
          <Select name="teacher_subjects" multiple className="w-full">
            {subjectsOptions.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">Select one or more.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm">Experience (years)</label>
            <Input
              name="teacher_experience_years"
              type="number"
              min={0}
              max={50}
              placeholder="e.g., 3"
            />
          </div>
          <div>
            <label className="text-sm">CV URL (optional)</label>
            <Input
              name="teacher_cv_url"
              type="url"
              placeholder="https://…"
            />
          </div>
        </div>

        <div>
          <label className="text-sm">Short Bio</label>
          <Textarea
            name="teacher_bio"
            rows={6}
            placeholder="Tell us about your teaching background, certifications, and achievements…"
          />
          <p className="text-xs text-muted-foreground">Min 50 characters.</p>
        </div>

        <div className="pt-2">
          <Button type="submit" disabled={submitting} className="btn">
            {submitting ? 'Submitting…' : 'Submit for Review'}
          </Button>
        </div>
      </form>
    </Card>
  );
};
