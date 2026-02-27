import React from 'react';
import { Card } from '@/components/design-system/Card';
import { Icon } from '@/components/design-system/Icon';
import { Button } from '@/components/design-system/Button';

interface AIRecommendationWidgetProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  iconName?: string;
  className?: string;
}

export const AIRecommendationWidget: React.FC<AIRecommendationWidgetProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  iconName = 'zap',
  className = '',
}) => {
  return (
    <Card className={`p-4 border-l-4 border-l-primary ${className}`}>
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/10 p-2">
          <Icon name={iconName} className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold">{title}</h4>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          {actionLabel && onAction && (
            <Button
              size="sm"
              variant="link"
              className="mt-2 h-auto p-0 text-xs font-medium text-primary"
              onClick={onAction}
            >
              {actionLabel}
              <Icon name="arrow-right" className="ml-1 h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};