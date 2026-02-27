'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Input } from '@/components/design-system/Input';
import { Textarea } from '@/components/design-system/Textarea';
import { Badge } from '@/components/design-system/Badge';
import { ProgressBar } from '@/components/design-system/ProgressBar';
import { Section } from '@/components/design-system/Section';
import { Tabs } from '@/components/design-system/Tabs';
import { Alert } from '@/components/design-system/Alert';
import { supabase } from '@/lib/supabaseClient';

export default function TeacherWelcome() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; fullName: string; email: string } | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    subjectExpertise: '',
    teachingExperience: '',
    linkedIn: '',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(40); // Example: static for now, update based on API if needed
  const [status, setStatus] = useState<'pending' | 'review' | 'approved'>('pending'); // Example: static for now

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
        if (mounted) setError('Failed to load user data. Please try again.');
      } finally {
        if (mounted) setLoading(false);
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
        console.error('No session for form submission:', sessionError);
        setError('Please sign in to submit the form.');
        router.push('/login?next=/teacher/welcome');
        return;
      }

      const res = await fetch('/api/teacher/onboarding', {
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

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || 'Failed to submit onboarding form');
      }

      // Update progress and status (example: adjust based on API response)
      setProgress(80);
      setStatus('review');
      router.push('/teacher/dashboard'); // Redirect to dashboard after submission
    } catch (err) {
      console.error('Form submission error:', err);
      setError(err.message || 'Failed to submit form. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading...</div>;
  if (error) return <Alert variant="warning" className="m-6">{error}</Alert>;

  return (
    <div className="container mx-auto max-w-4xl py-10">
      <Section>
        <h1 className="text-3xl font-bold text-foreground">👋 Welcome, Teacher!</h1>
        <p className="mt-2 text-muted-foreground">
          We’re excited to have you join GramorX as an educator. To get started, please
          complete your onboarding so we can approve your profile and unlock your dashboard.
        </p>
      </Section>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        {/* Left: Profile Setup Form */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-foreground">Onboarding Form</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Provide accurate details to help us verify your teaching profile.
          </p>
          <form className="grid gap-4" onSubmit={handleSubmit}>
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
              className="w-full mt-2"
              disabled={submitting}
              loading={submitting}
              loadingText="Submitting..."
            >
              Submit for Approval
            </Button>
          </form>
        </Card>

        {/* Right: Progress & Guidance */}
        <div className="flex flex-col gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground">Approval Progress</h2>
            <p className="text-sm text-muted-foreground mb-3">
              Once you submit your details, our admin team will review and notify you.
            </p>
            <ProgressBar value={progress} tone="info" />
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Badge tone={status === 'pending' ? 'warning' : 'success'}>
                  {status === 'pending' ? 'Pending' : 'Completed'}
                </Badge>{' '}
                Profile Information
              </li>
              <li>
                <Badge tone={status === 'review' ? 'warning' : 'default'}>
                  {status === 'review' ? 'In Review' : 'Waiting'}
                </Badge>{' '}
                Admin Review
              </li>
              <li>
                <Badge tone={status === 'approved' ? 'success' : 'default'}>
                  {status === 'approved' ? 'Unlocked' : 'Locked'}
                </Badge>{' '}
                Dashboard Access
              </li>
            </ul>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground">Helpful Links</h2>
            <Tabs
              items={[
                {
                  label: 'Guidelines',
                  content: (
                    <ul className="list-disc ml-5 text-sm space-y-1 text-muted-foreground">
                      <li>Complete all required fields honestly.</li>
                      <li>Attach certificates or references where possible.</li>
                      <li>Response time: typically 24–48 hours.</li>
                    </ul>
                  ),
                },
                {
                  label: 'FAQ',
                  content: (
                    <p className="text-sm text-muted-foreground">
                      Need help? Visit the{' '}
                      <a href="/support" className="text-accent">
                        Support Center
                      </a>
                      .
                    </p>
                  ),
                },
              ]}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}