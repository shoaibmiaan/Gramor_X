// pages/teacher/welcome.tsx
'use client';

import React from 'react';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Input } from '@/components/design-system/Input';
import { Textarea } from '@/components/design-system/Textarea';
import { Badge } from '@/components/design-system/Badge';
import { ProgressBar } from '@/components/design-system/ProgressBar';
import { Section } from '@/components/design-system/Section';
import { Tabs } from '@/components/design-system/Tabs';

export default function TeacherWelcome() {
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
          <form className="grid gap-4">
            <Input label="Full Name" placeholder="Enter your full name" required />
            <Input label="Subject Expertise" placeholder="e.g., IELTS Writing" required />
            <Textarea
              label="Teaching Experience"
              placeholder="Describe your years of teaching and certifications"
              rows={4}
              required
            />
            <Input label="LinkedIn / Portfolio (optional)" placeholder="https://..." />
            <Button type="submit" tone="primary" className="w-full mt-2">
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
            <ProgressBar value={40} tone="info" />
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Badge tone="warning">Pending</Badge> Profile Information
              </li>
              <li>
                <Badge tone="default">Waiting</Badge> Admin Review
              </li>
              <li>
                <Badge tone="default">Locked</Badge> Dashboard Access
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
                      Need help? Visit the <a href="/support" className="text-accent">Support Center</a>.
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
