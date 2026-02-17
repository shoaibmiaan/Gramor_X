'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { z } from 'zod';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Input } from '@/components/design-system/Input';
import { Textarea } from '@/components/design-system/Textarea';
import { Select } from '@/components/design-system/Select';
import { Checkbox } from '@/components/design-system/Checkbox';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { Badge } from '@/components/design-system/Badge';
import OnboardingProgress from '@/components/teacher/OnboardingProgress';
import DocumentUploadStub from '@/components/teacher/DocumentUploadStub';

const FormSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  phone: z.string().min(8),
  country: z.string().min(2),
  city: z.string().min(2),
  subjects: z.array(z.string()).min(1),
  experienceYears: z.number().min(0).max(50),
  bio: z.string().min(50),
  languages: z.array(z.string()).min(1),
  availability: z.array(z.string()).min(1), // slots or days
  hourlyRate: z.number().min(0),
  linkedin: z.string().url().optional().or(z.literal('')),
  portfolio: z.string().url().optional().or(z.literal('')),
  agree: z.boolean().refine((v) => v, 'Consent required'),
  // documents handled by stub (frontend-only)
});

export default function TeacherOnboarding() {
  const router = useRouter();
  const [err, setErr] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  // Local state (frontend-only)
  const [subjects, setSubjects] = React.useState<string[]>([]);
  const [languages, setLanguages] = React.useState<string[]>([]);
  const [availability, setAvailability] = React.useState<string[]>([]);
  const [docCount, setDocCount] = React.useState(0);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      fullName: String(form.get('fullName') ?? ''),
      email: String(form.get('email') ?? ''),
      phone: String(form.get('phone') ?? ''),
      country: String(form.get('country') ?? ''),
      city: String(form.get('city') ?? ''),
      subjects,
      experienceYears: Number(form.get('experienceYears') ?? '0'),
      bio: String(form.get('bio') ?? ''),
      languages,
      availability,
      hourlyRate: Number(form.get('hourlyRate') ?? '0'),
      linkedin: String(form.get('linkedin') ?? ''),
      portfolio: String(form.get('portfolio') ?? ''),
      agree: Boolean(form.get('agree')),
    };

    const parsed = FormSchema.safeParse(payload);
    if (!parsed.success) {
      setErr(parsed.error.errors[0]?.message ?? 'Please fix the highlighted fields.');
      setLoading(false);
      return;
    }

    // FE-only: store locally to simulate submission + progress
    try {
      const percent = Math.min(100, 30 + subjects.length * 10 + (docCount > 0 ? 20 : 0) + (payload.bio.length > 80 ? 20 : 0));
      localStorage.setItem('teacher.onboarding.data', JSON.stringify({ ...payload, docCount }));
      localStorage.setItem('teacher.onboarding.percent', String(percent));
      setOk(true);
      setLoading(false);
      setTimeout(() => router.push('/teacher/pending'), 600);
    } catch (e) {
      setErr('Could not save locally. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Container className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Teacher Onboarding</h1>
          <p className="text-mutedText">Complete the form below. We’ll notify you once approved.</p>
        </div>
        <Badge variant="secondary">Frontend-only</Badge>
      </div>

      {ok && <Alert variant="success">Submitted! Redirecting to Pending…</Alert>}
      {err && <Alert variant="destructive">{err}</Alert>}

      <OnboardingProgress percentKey="teacher.onboarding.percent" />

      <form onSubmit={handleSubmit} className="grid gap-6">
        <Card className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <label className="text-sm font-medium">Full Name</label>
            <Input name="fullName" placeholder="Your full name" />
            <label className="text-sm font-medium">Email</label>
            <Input type="email" name="email" placeholder="you@gramorx.com" />
            <label className="text-sm font-medium">Phone</label>
            <Input name="phone" placeholder="+92 3XX XXXXXXX" />
          </div>
          <div className="space-y-3">
            <label className="text-sm font-medium">Country</label>
            <Input name="country" placeholder="Pakistan" />
            <label className="text-sm font-medium">City</label>
            <Input name="city" placeholder="Lahore" />
            <label className="text-sm font-medium">Years of Experience</label>
            <Input type="number" min={0} max={50} name="experienceYears" placeholder="3" />
          </div>
        </Card>

        <Card className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <label className="text-sm font-medium">Subjects</label>
            <Select
              multiple
              value={subjects}
              onChange={(v) => setSubjects(v as string[])}
              options={[
                { label: 'IELTS Speaking', value: 'speaking' },
                { label: 'IELTS Writing', value: 'writing' },
                { label: 'IELTS Reading', value: 'reading' },
                { label: 'IELTS Listening', value: 'listening' },
              ]}
              placeholder="Select one or more"
            />
            <label className="text-sm font-medium">Languages</label>
            <Select
              multiple
              value={languages}
              onChange={(v) => setLanguages(v as string[])}
              options={[
                { label: 'English', value: 'en' },
                { label: 'Urdu', value: 'ur' },
                { label: 'Punjabi', value: 'pa' },
                { label: 'Arabic', value: 'ar' },
              ]}
              placeholder="Select languages you can teach in"
            />
            <label className="text-sm font-medium">Availability</label>
            <Select
              multiple
              value={availability}
              onChange={(v) => setAvailability(v as string[])}
              options={[
                { label: 'Weekdays (Evening)', value: 'weekdays_eve' },
                { label: 'Weekdays (Morning)', value: 'weekdays_morn' },
                { label: 'Weekends', value: 'weekends' },
              ]}
              placeholder="Pick availability"
            />
          </div>
          <div className="space-y-3">
            <label className="text-sm font-medium">Hourly Rate (USD)</label>
            <Input type="number" min={0} name="hourlyRate" placeholder="10" />
            <label className="text-sm font-medium">LinkedIn (optional)</label>
            <Input name="linkedin" placeholder="https://linkedin.com/in/..." />
            <label className="text-sm font-medium">Portfolio / Website (optional)</label>
            <Input name="portfolio" placeholder="https://your.site" />
            <label className="text-sm font-medium">Teaching Bio</label>
            <Textarea name="bio" rows={6} placeholder="Share your teaching approach, achievements, and focus areas..." />
          </div>
        </Card>

        <Card id="documents" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Document Verification</h3>
            <Badge>{docCount} file(s) selected</Badge>
          </div>
          <DocumentUploadStub onCountChange={setDocCount} />
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox name="agree" />
            <span className="text-sm">
              I confirm all details are accurate and agree to GramorX terms & policies.
            </span>
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>{loading ? 'Submitting…' : 'Submit for Review'}</Button>
            <Link href="/teacher" className="btn">Back</Link>
          </div>
        </Card>
      </form>
    </Container>
  );
}
