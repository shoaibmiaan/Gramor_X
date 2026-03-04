// components/dashboard/SavedItems.tsx
import React from 'react';
import Link from 'next/link';
import { useUser } from '@/hooks/useUser';
import { useSavedItems } from '@/hooks/useSavedItems';
import { Skeleton } from '@/components/design-system/Skeleton';

export function SavedItems() {
  const { user, isLoading: userLoading } = useUser();
  const userId = user?.id ?? null;

  // Guard: only call the query hook when we have a logged-in user (prevents QueryClient error)
  const { items = [], isLoading, error } = userId
    ? useSavedItems(userId)
    : { items: [], isLoading: false, error: null };

  if (userLoading || isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }

  if (!user) {
    return <p className="text-sm text-muted-foreground py-4">Sign in to see saved items.</p>;
  }

  if (error) {
    return <p className="text-sm text-danger py-4">Could not load saved items.</p>;
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No saved items yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((item: any) => (
        <li key={item.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
          <Link
            href={`/${item.category || 'content'}/${item.resource_id}`}
            className="text-sm underline hover:text-primary"
          >
            {(item.category ?? 'bookmark')}: {item.resource_id}
          </Link>
          <span className="text-xs text-muted-foreground">
            {new Date(item.created_at).toLocaleDateString()}
          </span>
        </li>
      ))}
    </ul>
  );
}