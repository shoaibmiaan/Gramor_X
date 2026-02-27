// components/reading/MobileBlock.tsx
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';
import { useRouter } from 'next/router';

export const MobileBlock: React.FC = () => {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="max-w-md p-8 text-center space-y-6">
        <div className="flex justify-center">
          <Icon name="smartphone" className="h-12 w-12 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">Desktop Only</h2>
        <p className="text-muted-foreground">
          This mock test is designed for a larger screen. Please switch to a
          desktop or laptop computer for the full IELTS simulation experience.
        </p>
        <div className="flex flex-col gap-3">
          <Button
            variant="primary"
            onClick={() => router.push('/mock/reading')}
            className="w-full"
          >
            Back to Mocks
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="w-full"
          >
            I'm on desktop (reload)
          </Button>
        </div>
      </Card>
    </div>
  );
};