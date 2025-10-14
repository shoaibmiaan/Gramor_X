'use client';

import React from 'react';

import { ProfileSetupLayout } from '@/features/profile/setup/ProfileSetupLayout';
import { ProfileSetupProvider } from '@/features/profile/setup/useProfileSetup';

export default function ProfileSetupPage() {
  return (
    <ProfileSetupProvider>
      <ProfileSetupLayout />
    </ProfileSetupProvider>
  );
}

