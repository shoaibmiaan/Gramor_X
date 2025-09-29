'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/design-system/Input';
import { Textarea } from '@/components/design-system/Textarea';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { supabase } from '@/lib/supabaseClient'; // Replaced supabaseBrowser

export default function TeacherOnboardingForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    subjectExpertise: '',
    teachingExperience: '',
    linkedIn: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; fullName: string; email: string } | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (mounted) {
          if (!user) {
            router.push('/login?next=/teacher/welcome');
            return;
          }
          setUser({
            id: user.id,
            fullName: user.user_metadata?.full_name || '',
            email: user.email || '',
          });
          setFormData((prev) => ({
            ...prev,
            fullName: user.user_metadata?.full_name || '',
            linkedIn: user.user_metadata?.linkedIn || '',
          }));
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
        if (mounted) setError('Failed to load user data. Please sign in.');
      }
    };

    fetchUser();

    return () => {
      mounted = false;
    };
  }, [router]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Please sign in to submit the form.');
      }

      const response = await fetch('/api/teacher/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: user?.id,
          fullName: formData.fullName,
          subjectExpertise: formData.subjectExpertise,
          teachingExperience: formData.teachingExperience,
          linkedIn: formData.linkedIn,
        }),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || 'Failed to submit onboarding form');
      }

      router.push('/teacher/dashboard');
    } catch (err) {
      console.error('Form submission error:', err);
      setError(err.message || 'Failed to submit form. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return <Alert variant="warning">Please sign in to complete onboarding.</Alert>;
  if (error) return <Alert variant="warning" className="m-6">{error}</Alert>;

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-xl font-semibold text-foreground mb-4">Teacher Onboarding</h2>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <Input
          label="Full Name"
          name="fullName"
          placeholder="Enter your full name"
          value={formData.fullName}
          onChange={handleInputChange}
          required
        />
        <Input
          label="Subject Expertise"
          name="subjectExpertise"
          placeholder="e.g., IELTS Writing"
          value={formData.subjectExpertise}
          onChange={handleInputChange}
          required
        />
        <Textarea
          label="Teaching Experience"
          name="teachingExperience"
          placeholder="Describe your years of teaching and certifications"
          value={formData.teachingExperience}
          onChange={handleInputChange}
          rows={4}
          required
        />
        <Input
          label="LinkedIn / Portfolio (optional)"
          name="linkedIn"
          placeholder="https://..."
          value={formData.linkedIn}
          onChange={handleInputChange}
        />
        <Button
          type="submit"
          tone="primary"
          disabled={submitting}
          loading={submitting}
          loadingText="Submitting..."
        >
          Submit for Approval
        </Button>
      </form>
    </div>
  );
}