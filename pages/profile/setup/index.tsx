'use client';

import React from 'react';

import { ProfileSetupLayout } from './ProfileSetupLayout';
import { ProfileSetupProvider } from './useProfileSetup';

export default function ProfileSetupPage() {
  return (
    <ProfileSetupProvider>
      <ProfileSetupLayout />
    </ProfileSetupProvider>
  );
}

