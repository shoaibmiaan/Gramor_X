import React from 'react';
import dynamic from 'next/dynamic';
import { Container } from '@/components/design-system/Container';
import { useUser } from '@/hooks/useUser';

const WhatsAppTasksPanel = dynamic(() => import('@/components/innovation/WhatsAppTasksPanel'), { ssr: false });

export default function WhatsAppTasksPage() {
  const { user } = useUser();
  return (
    <Container>
      <div className="py-12">
        <h1 className="font-slab text-h1 mb-4">WhatsApp Tasks</h1>
        <p className="text-muted-foreground mb-6">Manage daily micro-tasks and schedule reminders via WhatsApp.</p>
        <WhatsAppTasksPanel userId={user?.id ?? null} onClose={() => { /* no-op */ }} />
      </div>
    </Container>
  );
}
