import { useState } from 'react';
import { useRouter } from 'next/router';

import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';
import { track } from '@/lib/analytics/track';

interface BookmarkToggleProps {
  promptId: string;
  promptSlug: string;
  promptPart: string;
  difficulty: string;
  tags: string[];
  initialBookmarked?: boolean;
  signedIn: boolean;
  loginHref?: string;
  onToggle?: (bookmarked: boolean) => void;
}

export function BookmarkToggle({
  promptId,
  promptSlug,
  promptPart,
  difficulty,
  tags,
  initialBookmarked = false,
  signedIn,
  loginHref,
  onToggle,
}: BookmarkToggleProps) {
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const returnTo = loginHref ?? `${router.asPath || '/speaking/library'}`;

  if (!signedIn) {
    return (
      <Button
        variant="soft"
        tone="primary"
        size="sm"
        href={`/welcome?from=${encodeURIComponent(returnTo)}`}
        leadingIcon={<Icon name="Bookmark" size={16} />}
      >
        Save
      </Button>
    );
  }

  const handleToggle = async () => {
    if (loading) return;
    const next = !bookmarked;
    setLoading(true);
    setError(null);
    setBookmarked(next);

    try {
      const res = await fetch('/api/speaking/prompts/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ promptId, bookmark: next }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Failed to update bookmark');
      }

      if (next) {
        track('prompt_bookmarked', {
          prompt_slug: promptSlug,
          part: promptPart,
          difficulty,
          tags: tags.join(','),
        });
      } else {
        track('prompt_unbookmarked', {
          prompt_slug: promptSlug,
          part: promptPart,
          difficulty,
          tags: tags.join(','),
        });
      }

      onToggle?.(next);
    } catch (err: any) {
      setBookmarked(!next);
      setError(err.message ?? 'Unable to update bookmark');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="soft"
        tone={bookmarked ? 'accent' : 'default'}
        size="sm"
        iconOnly
        shape="circle"
        aria-label={bookmarked ? 'Remove bookmark' : 'Save prompt'}
        onClick={handleToggle}
        loading={loading}
        leadingIcon={<Icon name={bookmarked ? 'BookmarkCheck' : 'Bookmark'} size={16} />}
      />
      {error && <span className="text-caption text-danger" role="alert">{error}</span>}
    </div>
  );
}

export default BookmarkToggle;
