'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient'; // Replaced supabaseBrowser
import { Button } from '@/components/design-system/Button';
import { Input } from '@/components/design-system/Input';
import { Textarea } from '@/components/design-system/Textarea';
import { Alert } from '@/components/design-system/Alert';

interface AssignTaskModalProps {
  cohortId: string;
  onClose: () => void;
  onSuccess?: () => void;
  /** If provided, called instead of default POST to /api/teacher/assignments */
  customSubmit?: (data: { title: string; description: string; dueDate: string }) => Promise<void>;
}

export const AssignTaskModal: React.FC<AssignTaskModalProps> = ({
  cohortId,
  onClose,
  onSuccess,
  customSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string } | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (mounted) setUser(user ? { id: user.id } : null);
      } catch (err) {
        console.error('Failed to fetch user:', err);
        if (mounted) setError('Failed to load user data. Please sign in.');
      }
    };

    fetchUser();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (customSubmit) {
        await customSubmit({ title, description, dueDate });
      } else {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          throw new Error('Please sign in to assign tasks.');
        }

        const res = await fetch('/api/teacher/assignments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ cohortId, title, description, dueDate }),
        });

        if (!res.ok) {
          const { error } = await res.json();
          throw new Error(error || 'Failed to assign task');
        }

        onSuccess?.();
        onClose();
      }
    } catch (err) {
      console.error('Assignment error:', err);
      setError((err as Error).message || 'Failed to assign task. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return <Alert variant="warning">Please sign in to assign tasks.</Alert>;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background p-6 rounded-lg max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">Assign New Task</h2>
        {error && <Alert variant="warning" className="mb-4">{error}</Alert>}
        <form onSubmit={handleSubmit} className="grid gap-4">
          <Input
            label="Task Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            required
          />
          <Input
            label="Due Date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />
          <div className="flex gap-2 mt-4">
            <Button
              type="submit"
              tone="primary"
              disabled={submitting}
              loading={submitting}
              loadingText="Assigning..."
            >
              Assign Task
            </Button>
            <Button type="button" tone="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};