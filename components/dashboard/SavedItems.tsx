import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import Icon from '@/components/design-system/Icon';

interface SavedItem {
  id: string;
  title: string;
  type: 'lesson' | 'drill' | 'vocab' | 'mock';
  url: string;
}

// Mock data – replace with actual data fetching
const mockSavedItems: SavedItem[] = [
  { id: '1', title: 'Reading: Skimming techniques', type: 'lesson', url: '/learning/skills/reading/1' },
  { id: '2', title: 'Writing Task 2: Opinion essays', type: 'drill', url: '/writing/drills/opinion' },
  { id: '3', title: 'Vocabulary: Environment', type: 'vocab', url: '/vocabulary/topics/environment' },
];

const getIconForType = (type: SavedItem['type']) => {
  switch (type) {
    case 'lesson':
      return 'video';
    case 'drill':
      return 'edit-3';
    case 'vocab':
      return 'book-open';
    case 'mock':
      return 'file-text';
    default:
      return 'bookmark';
  }
};

const SavedItems: React.FC = () => {
  return (
    <div className="space-y-3">
      {mockSavedItems.length > 0 ? (
        mockSavedItems.map((item) => (
          <Link key={item.id} href={item.url} className="block">
            <div className="flex items-center gap-3 rounded-lg border border-border p-3 transition hover:bg-muted/50">
              <div className="rounded-full bg-primary/10 p-2">
                <Icon name={getIconForType(item.type)} className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs capitalize text-muted-foreground">{item.type}</p>
              </div>
              <Icon name="arrow-right" className="h-4 w-4 text-muted-foreground" />
            </div>
          </Link>
        ))
      ) : (
        <p className="text-center text-sm text-muted-foreground">No saved items yet.</p>
      )}
      <div className="pt-2 text-center">
        <Link href="/saved">
          <Button variant="ghost" size="sm" className="rounded-ds-xl">
            View all saved
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default SavedItems;