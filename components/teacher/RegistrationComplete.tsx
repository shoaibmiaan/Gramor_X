import * as React from 'react';
import Link from 'next/link';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';

export const RegistrationComplete: React.FC = () => {
  return (
    <Card className="p-8 space-y-4 card-surface">
      <div className="flex items-center gap-3">
        <Badge variant="success">Pending Approval</Badge>
        <h1 className="text-xl font-semibold">Thanks! Your application is under review.</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        We’ll email you once an admin approves your profile. Until then, you can update your info from the registration page.
      </p>
      <div className="flex gap-3">
        <Link href="/teacher/register" className="nav-pill">
          <Button variant="secondary">Edit Registration</Button>
        </Link>
        <Link href="/" className="nav-pill">
          <Button>Go Home</Button>
        </Link>
      </div>
    </Card>
  );
};
