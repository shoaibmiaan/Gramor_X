import React, { useState } from 'react';
import { Button } from '@/components/design-system/Button';
import { Input } from '@/components/design-system/Input';
import { useToast } from '@/components/design-system/Toaster';

const WhatsAppOptIn: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [optedIn, setOptedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  const handleOptIn = async () => {
    if (!phone || phone.length < 10) {
      error('Please enter a valid phone number.');
      return;
    }

    setLoading(true);
    try {
      // Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setOptedIn(true);
      success('Opted in successfully! You’ll receive daily tasks on WhatsApp.');
    } catch (err) {
      error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (optedIn) {
    return (
      <div className="rounded-lg bg-success/10 p-4 text-center">
        <p className="text-sm font-medium text-success">✅ You're opted in!</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Check WhatsApp for your daily tasks.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Input
        type="tel"
        placeholder="+92 300 1234567"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        disabled={loading}
      />
      <Button
        onClick={handleOptIn}
        loading={loading}
        className="w-full rounded-ds-xl"
      >
        Opt in via WhatsApp
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        We'll send you daily micro‑tasks and reminders. No spam.
      </p>
    </div>
  );
};

export default WhatsAppOptIn;