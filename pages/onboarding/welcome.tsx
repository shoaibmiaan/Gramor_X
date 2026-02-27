import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import { Container } from '@/components/design-system/Container';
import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';
import { useUser } from '@/hooks/useUser';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { cn } from '@/lib/utils';

type Language = 'en' | 'ur';

const WELCOME_MESSAGES = {
  en: [
    'Welcome, {name}! Your personal AI Mentor is initializing...',
    'Analyzing your learning style...',
    'Preparing your custom IELTS roadmap...',
    'Almost ready...',
  ],
  ur: [
    '{name}، خوش آمدید! آپ کا ذاتی AI رہنما تیار ہو رہا ہے...',
    'آپ کے سیکھنے کے انداز کا تجزیہ کیا جا رہا ہے...',
    'آپ کا ذاتی IELTS روڈ میپ تیار کیا جا رہا ہے...',
    'بس تھوڑی دیر...',
  ],
};

const WelcomePage: NextPage = () => {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [profile, setProfile] = useState<{ full_name?: string | null } | null>(null);
  const [language, setLanguage] = useState<Language | null>(null);
  const [saving, setSaving] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!showLoading) return;
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % 4);
    }, 2000);
    return () => clearInterval(interval);
  }, [showLoading]);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabaseBrowser
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();
      if (data) setProfile(data);
    };
    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (!showLoading) return;
    const timer = setTimeout(() => {
      router.push('/onboarding/target-band');
    }, 4000);
    return () => clearTimeout(timer);
  }, [showLoading, router]);

  const handleLanguageSelect = async (selected: Language) => {
    setSaving(true);
    try {
      const res = await fetch('/api/onboarding/language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: selected }),
      });
      if (!res.ok) throw new Error('Failed to save language');
      setLanguage(selected);
      setShowLoading(true);
    } catch (err) {
      // Log error but proceed for UX
    } finally {
      setSaving(false);
    }
  };

  if (userLoading) {
    return (
      <Container className="flex min-h-screen items-center justify-center">
        <div className="text-center">Loading...</div>
      </Container>
    );
  }

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Learner';

  if (!showLoading) {
    return (
      <Container className="flex min-h-screen flex-col items-center justify-center py-10">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card/80 p-8 text-center shadow-xl backdrop-blur-md">
          <h1 className="mb-2 text-2xl font-bold">Welcome to GramorX</h1>
          <p className="mb-6 text-muted-foreground">
            Choose your preferred language for instructions and reminders.
          </p>

          <div className="grid gap-4">
            <button
              onClick={() => handleLanguageSelect('en')}
              disabled={saving}
              className={cn(
                'flex items-center gap-3 rounded-xl border p-4 text-left transition-all',
                language === 'en'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              )}
              aria-label="Select English"
            >
              <span className="text-2xl">🇬🇧</span>
              <div>
                <p className="font-semibold">English</p>
                <p className="text-xs text-muted-foreground">
                  Interface, reminders, and lessons in English.
                </p>
              </div>
            </button>

            <button
              onClick={() => handleLanguageSelect('ur')}
              disabled={saving}
              className={cn(
                'flex items-center gap-3 rounded-xl border p-4 text-left transition-all',
                language === 'ur'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              )}
              aria-label="Select Urdu + English mix"
            >
              <span className="text-2xl">🇵🇰</span>
              <div>
                <p className="font-semibold">اردو + English mix</p>
                <p className="text-xs text-muted-foreground">
                  Interface in Urdu with IELTS practice mostly kept bilingual.
                </p>
              </div>
            </button>
          </div>

          {saving && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Icon name="loader" className="h-4 w-4 animate-spin" />
              <span className="text-sm">Saving...</span>
            </div>
          )}
        </div>
      </Container>
    );
  }

  const messages = language === 'en' ? WELCOME_MESSAGES.en : WELCOME_MESSAGES.ur;
  const currentMessage = messages[messageIndex].replace('{name}', displayName);

  return (
    <Container className="flex min-h-screen flex-col items-center justify-center py-10">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card/80 p-8 text-center shadow-xl backdrop-blur-md">
        <div className="mb-6 flex justify-center">
          <div className="relative h-20 w-20">
            <div className="absolute inset-0 rounded-full border-4 border-primary/30" />
            <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
          </div>
        </div>

        <h1 className="mb-2 text-2xl font-bold">GramorX AI Mentor</h1>
        <p className="text-lg font-medium text-primary">{currentMessage}</p>
        <p className="mt-4 text-xs text-muted-foreground">
          We're setting up your personalised IELTS study plan.
        </p>
      </div>
    </Container>
  );
};

export default WelcomePage;