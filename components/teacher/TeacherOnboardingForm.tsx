import * as React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { Input } from '@/components/design-system/Input';
import { Select } from '@/components/design-system/Select';
import { Textarea } from '@/components/design-system/Textarea';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { teacherRegisterSchema } from '@/lib/validation/teacher';  // Validation schema
import { useTeacherProfile } from '@/hooks/useTeacherProfile'; // Custom hook to get teacher profile
import { useSWR } from 'swr';
import { z } from 'zod';

type Props = {
  subjectsOptions: string[];
};

const TeacherOnboardingForm: React.FC<Props> = ({ subjectsOptions }) => {
  const router = useRouter();
  const { profile, isLoading, refresh } = useTeacherProfile();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teacherData, setTeacherData] = useState({
    teacher_subjects: [] as string[],
    teacher_bio: '',
    teacher_experience_years: 0,
    teacher_cv_url: '',
  });

  // Handle form field changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTeacherData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const options = e.target.selectedOptions;
    const values = Array.from(options).map((opt) => opt.value);
    setTeacherData((prev) => ({ ...prev, teacher_subjects: values }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    // Validate form data
    const validation = teacherRegisterSchema.safeParse(teacherData);
    if (!validation.success) {
      setError(validation.error.issues.map((issue) => issue.message).join(', '));
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/teacher/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.data),
      });

      if (!response.ok) {
        const responseData = await response.json();
        throw new Error(responseData?.error || 'Registration failed');
      }

      await refresh(); // Refresh the teacher profile after success
      router.push('/teacher'); // Navigate to teacher page after successful submission
    } catch (err: any) {
      setError(err.message || 'An error occurred during submission');
    } finally {
      setSubmitting(false);
    }
  };

  // Conditional rendering based on the profile state
  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!profile) {
    return <div>You need to be logged in to register as a teacher.</div>;
  }

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Teacher Registration</h1>
        <Badge variant="secondary">Step 1 of 1</Badge>
      </div>

      {error && (
        <div className="rounded-ds-2xl border border-border p-3 text-sm">
          <span className="text-red-600">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm">Subjects you teach</label>
          <Select
            name="teacher_subjects"
            multiple
            value={teacherData.teacher_subjects}
            onChange={handleSubjectChange}
            className="w-full"
          >
            {subjectsOptions.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">Select one or more subjects you teach.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm">Years of Experience</label>
            <Input
              name="teacher_experience_years"
              type="number"
              min={0}
              max={50}
              placeholder="Enter your experience"
              value={teacherData.teacher_experience_years}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="text-sm">CV URL (optional)</label>
            <Input
              name="teacher_cv_url"
              type="url"
              placeholder="https://your-cv-link.com"
              value={teacherData.teacher_cv_url}
              onChange={handleInputChange}
            />
          </div>
        </div>

        <div>
          <label className="text-sm">Short Bio</label>
          <Textarea
            name="teacher_bio"
            rows={6}
            placeholder="Describe your background and experience"
            value={teacherData.teacher_bio}
            onChange={handleInputChange}
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

export default TeacherOnboardingForm;
