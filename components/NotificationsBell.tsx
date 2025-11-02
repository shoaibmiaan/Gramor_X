import * as React from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { Button } from '@/components/design-system/Button';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationsBellProps {
  className?: string;
}

export const NotificationsBell: React.FC<NotificationsBellProps> = ({ className }) => {
  const { unreadCount, markAllAsRead } = useNotifications();

  return (
    <div className={`relative ${className}`}>
      <Button
        as={Link}
        href="/notifications"
        variant="ghost"
        size="sm"
        className="relative p-2"
        onClick={markAllAsRead}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>
    </div>
  );
};