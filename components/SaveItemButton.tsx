import React, { useEffect, useState } from 'react';
import { Button } from '@/components/design-system/Button';
import { emitUserEvent } from '@/lib/analytics/user';

type Props = {
  resourceId: string;
  type?: string;
  category: string;
};

export const SaveItemButton: React.FC<Props> = ({ resourceId, type = '', category }) => {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!resourceId) return;
    (async () => {
      try {
        const url = `/api/saved/by-category/${category}?resource_id=${resourceId}${type ? `&type=${type}` : ''}`;
        const res = await fetch(url);
        if (active && res.ok) {
          const data = await res.json();
          setSaved(Array.isArray(data) && data.length > 0);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [resourceId, type, category]);

  const toggle = async () => {
    if (!resourceId) return;
    const body: Record<string, string> = { resource_id: resourceId };
    if (type) body.type = type;

    if (saved) {
      const res = await fetch(`/api/saved/by-category/${category}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSaved(false);
        void emitUserEvent('saved_remove', { step: null, delta: -1, category, resourceId });
      }
    } else {
      const res = await fetch(`/api/saved/by-category/${category}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) setSaved(true);
    }
  };

  return (
    <Button
      variant={saved ? 'primary' : 'secondary'}
      size="sm"
      onClick={toggle}
      disabled={loading}
      className={`rounded-ds ${saved ? 'bg-accent/20 text-accent hover:bg-accent/30' : ''}`}
      leadingIcon={<i className={`${saved ? 'fas' : 'far'} fa-bookmark`} aria-hidden="true" />}
    >
      {saved ? 'Saved' : 'Save'}
    </Button>
  );
};

export default SaveItemButton;
