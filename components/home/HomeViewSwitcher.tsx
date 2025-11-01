// components/home/HomeViewSwitcher.tsx
import React from 'react';

import type { HomeProps } from '@/types/home';
import { useUserContext } from '@/context/UserContext';

import GuestHomeView from './GuestHomeView';
import MemberHomeView from './MemberHomeView';

export interface HomeViewSwitcherProps {
  home: HomeProps;
}

export const HomeViewSwitcher: React.FC<HomeViewSwitcherProps> = ({ home }) => {
  const { user } = useUserContext();
  const isLoggedIn = Boolean(user);
  const shouldShowMemberView = isLoggedIn || !home.user.isGuest;

  return shouldShowMemberView ? <MemberHomeView home={home} /> : <GuestHomeView home={home} />;
};

HomeViewSwitcher.displayName = 'HomeViewSwitcher';

export default HomeViewSwitcher;
