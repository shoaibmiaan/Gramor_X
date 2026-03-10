import Link from 'next/link';

type NotAvailableYetProps = {
  feature: string;
};

export default function NotAvailableYet({ feature }: NotAvailableYetProps) {
  return (
    <main className="mx-auto flex min-h-[50vh] w-full max-w-2xl flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <h1 className="text-2xl font-semibold">Not available yet</h1>
      <p className="text-sm text-muted-foreground">
        {feature} is still in development. Please check back after this feature moves out of
        incomplete status.
      </p>
      <Link href="/listening" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
        Back to Listening hub
      </Link>
    </main>
  );
}
