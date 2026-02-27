import * as React from 'react';
import Link from 'next/link';
import { Bell, Check, ExternalLink } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/design-system/DropdownMenu';
import { Button } from '@/components/design-system/Button';
import { useNotifications } from '@/hooks/useNotifications';
import { formatTimestamp } from '@/lib/utils';

export const NotificationsDropdown: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } = useNotifications();

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative p-2">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs"
            >
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            notifications.slice(0, 5).map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex flex-col items-start p-3"
                asChild
              >
                {notification.url ? (
                  <Link
                    href={notification.url}
                    className="w-full"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <p className="text-sm font-medium flex-1">
                        {notification.message}
                      </p>
                      {!notification.read && (
                        <div className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-blue-500" />
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTimestamp(notification.createdAt)}
                    </p>
                  </Link>
                ) : (
                  <div 
                    className="w-full"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <p className="text-sm font-medium flex-1">
                        {notification.message}
                      </p>
                      {!notification.read && (
                        <Check className="h-3 w-3" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTimestamp(notification.createdAt)}
                    </p>
                  </div>
                )}
              </DropdownMenuItem>
            ))
          )}
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href="/notifications"
            className="flex items-center justify-center text-sm font-medium"
          >
            View all notifications
            <ExternalLink className="ml-1 h-3 w-3" />
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};