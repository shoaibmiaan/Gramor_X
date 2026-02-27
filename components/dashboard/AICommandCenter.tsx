import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const prompts = [
  'How do I improve Writing coherence?',
  'Create a 7-day study sprint',
  'Analyze my weak skills',
];

export function AICommandCenter() {
  return (
    <div className="fixed bottom-6 right-6 z-30 w-[320px]">
      <Card className="space-y-3 border-indigo-200 dark:border-indigo-700">
        <h3 className="text-base font-medium">Ask GramorX AI</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Context-aware assistant with prompts based on your dashboard activity.
        </p>
        <div className="flex flex-wrap gap-2">
          {prompts.map((prompt) => (
            <Button key={prompt} variant="ghost" className="h-auto rounded-lg px-2 py-1 text-xs">
              {prompt}
            </Button>
          ))}
        </div>
        <Button className="w-full">Open AI Command Center</Button>
      </Card>
    </div>
  );
}
