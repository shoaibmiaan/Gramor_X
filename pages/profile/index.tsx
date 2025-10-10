'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Toggle } from '@/components/design-system/Toggle';
import { StreakIndicator } from '@/components/design-system/StreakIndicator';
import { SavedItems } from '@/components/dashboard/SavedItems';
import { useStreak } from '@/hooks/useStreak';
import Image from "next/image";
import { supabase } from '@/lib/supabaseClient'; // Now using the single source of truth for supabase
import { useToast } from '@/components/design-system/Toaster';
import type { Profile } from '@/types/profile';
import { Badge } from '@/components/design-system/Badge';
import type { Badge as BadgeType } from '@/data/badges';
import { getUserBadges } from '@/lib/gamification';
import { useLocale } from '@/lib/locale';

export default function ProfilePage() {
  const router = useRouter();
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [commOptIn, setCommOptIn] = useState(true);
  const [historyText, setHistoryText] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { error: toastError, success: toastSuccess } = useToast();
  const { current: streak } = useStreak();
  const [earnedBadges, setEarnedBadges] = useState<BadgeType[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          router.replace('/login');
          return;
        }

        setUserId(session.user.id);

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (error || !data || (data as any).draft) {
          router.replace('/profile/setup');
          return;
        }

        setProfile(data as Profile);
        setCommOptIn((data as any).marketing_opt_in ?? true);
        setHistoryText((data as any).study_history ?? '');

        // Load user badges as well (from the other branch)
        try {
          const userBadges = await getUserBadges(session.user.id);
          setEarnedBadges(userBadges);
        } catch (e) {
          console.warn('Failed to load badges', e);
        }

        setLoading(false);
      } catch (e) {
        console.error('Error during profile fetch:', e);
        router.replace('/profile/setup');
      }
    })();
    return () => { mounted = false; };
  }, [router]);

  const triggerUpload = () => fileRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toastError(t('profile.toasts.photo.invalidType'));
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toastError(t('profile.toasts.photo.tooLarge'));
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = pub.publicUrl;
      const { error: updErr } = await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      if (updErr) throw updErr;
      const { error: profErr } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', userId);
      if (profErr) throw profErr;
      setProfile((p) => (p ? { ...p, avatar_url: publicUrl } : p));
      window.dispatchEvent(new CustomEvent('profile:avatar-changed', { detail: { url: publicUrl } }));
      toastSuccess(t('profile.toasts.photo.updated'));
    } catch (err: any) {
      console.error(err);
      toastError(err?.message || t('profile.toasts.photo.failure'));
    } finally {
      setUploading(false);
    }
  };

  const requestExport = async () => {
    try {
      const res = await fetch('/api/account/export');
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      const blob = new Blob([JSON.stringify(json, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'export.json';
      a.click();
      URL.revokeObjectURL(url);
      toastSuccess(t('profile.toasts.export.ready'));
    } catch (err: any) {
      toastError(err?.message || t('profile.toasts.export.failure'));
    }
  };

  const requestDeletion = async () => {
    if (!window.confirm(t('profile.confirm.delete'))) return;
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      await supabase.auth.signOut();
      router.replace('/');
    } catch (err: any) {
      toastError(err?.message || t('profile.toasts.delete.failure'));
    }
  };

  if (loading) {
    return (
      <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          <Card className="p-6 rounded-ds-2xl max-w-xl mx-auto">{t('profile.loading')}</Card>
        </Container>
      </section>
    );
  }

  return (
    <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
      <Container>
        <div className="max-w-xl mx-auto space-y-6">
          <Card className="p-6 rounded-ds-2xl">
            <div className="flex items-center justify-between mb-6">
              <h1 className="font-slab text-display">{t('profile.title')}</h1>
              <div className="flex items-center gap-2">
                <StreakIndicator value={streak} />
                {earnedBadges.map((b) => (
                  <Badge key={b.id} size="sm">
                    {b.icon}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="h-20 w-20 rounded-full bg-vibrantPurple/10 flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={t('profile.photo.alt')}
                    width={80}
                    height={80}
                    className="h-20 w-20 object-cover"
                  />
                ) : (
                  <span className="text-h2 font-semibold text-vibrantPurple">
                    {profile?.full_name?.[0] || 'U'}
                  </span>
                )}
              </div>
              <div>
                <button
                  onClick={triggerUpload}
                  className="text-small px-4 py-2 rounded-ds bg-vibrantPurple/10 hover:bg-vibrantPurple/15 font-medium"
                  disabled={uploading}
                >
                  {uploading ? t('profile.photo.uploading') : t('profile.photo.change')}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleFile}
                />
              </div>
            </div>
            <div className="space-y-2 text-body">
              <p>
                <strong>{t('profile.fields.name')}</strong> {profile?.full_name}
              </p>
              <p>
                <strong>{t('profile.fields.country')}</strong> {profile?.country ?? '—'}
              </p>
              <p>
                <strong>{t('profile.fields.englishLevel')}</strong> {profile?.english_level ?? '—'}
              </p>
              <p>
                <strong>{t('profile.fields.goalBand')}</strong>{' '}
                {profile?.goal_band ? profile.goal_band.toFixed(1) : '—'}
              </p>
              <p>
                <strong>{t('profile.fields.studyPreferences')}</strong>{' '}
                {profile?.study_prefs?.join(', ') || '—'}
              </p>
              <p>
                <strong>{t('profile.fields.timeCommitment')}</strong> {profile?.time_commitment ?? '—'}
              </p>
              <p>
                <strong>{t('profile.fields.language')}</strong>{' '}
                {profile?.preferred_language ?? '—'}
              </p>
              {profile?.exam_date && (
                <p>
                  <strong>{t('profile.fields.examDate')}</strong> {profile.exam_date}
                </p>
              )}
            </div>
            <Button href="/profile/setup" variant="secondary" className="mt-6">
              {t('profile.actions.edit')}
            </Button>
          </Card>

          {/* Other components remain unchanged */}

        </div>
      </Container>
    </section>
  );
}
