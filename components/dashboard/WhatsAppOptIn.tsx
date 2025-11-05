import React, { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/design-system/Card";
import { Input } from "@/components/design-system/Input";
import { Button } from "@/components/design-system/Button";

export function WhatsAppOptIn() {
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/whatsapp/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError((j as any)?.error || "Request failed");
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch (err: any) {
      setError(err?.message || "Request failed");
      setStatus("error");
    }
  };

  return (
    <Card className="p-6 rounded-ds-2xl">
      <h2 className="font-slab text-h2 mb-4">WhatsApp updates</h2>

      {status === "success" ? (
        <div>
          <p className="text-small text-grayish dark:text-muted-foreground mb-4">
            You&apos;re subscribed to WhatsApp reminders.
          </p>
          <div className="flex gap-2">
            <Link href="/profile#whatsapp">
              <Button variant="primary" className="rounded-ds-xl">
                Update number
              </Button>
            </Link>
            <Link href="/whatsapp-tasks">
              <Button variant="ghost" className="rounded-ds-xl">
                Manage tasks
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-4 sm:flex sm:items-end">
          <Input
            label="Phone number"
            placeholder="+14155552671"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="sm:flex-1"
            error={error || undefined}
          />
          <Button
            type="submit"
            variant="primary"
            className="rounded-ds-xl"
            disabled={status === "loading"}
          >
            {status === "loading" ? "Submitting..." : "Subscribe"}
          </Button>
          <Link href="/whatsapp-tasks" className="sm:ml-2">
            <Button type="button" variant="ghost" className="rounded-ds-xl">
              Manage tasks
            </Button>
          </Link>
        </form>
      )}
    </Card>
  );
}

export default WhatsAppOptIn;
