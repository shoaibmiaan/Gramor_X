// components/activity/ActivityTimeline.tsx
import * as React from "react";
import { Card } from "@/components/design-system/Card";
import { Badge } from "@/components/design-system/Badge";
import { Button } from "@/components/design-system/Button";
import { RecentActivity } from "@/pages/dashboard/activity";
import {
  Activity,
  Clock,
  ExternalLink,
  FileText,
  Mic,
  Headphones,
  BookOpen,
  User,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface ActivityTimelineProps {
  activities: RecentActivity[];
  loading: boolean;
  filters: any;
}

export default function ActivityTimeline({ activities, loading, filters }: ActivityTimelineProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login':
      case 'logout':
        return <User className="h-4 w-4" />;
      case 'task_created':
      case 'task_completed':
      case 'task_updated':
        return <CheckCircle className="h-4 w-4" />;
      case 'writing_submitted':
        return <FileText className="h-4 w-4" />;
      case 'speaking_completed':
        return <Mic className="h-4 w-4" />;
      case 'listening_completed':
        return <Headphones className="h-4 w-4" />;
      case 'reading_completed':
        return <BookOpen className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    if (type.includes('task')) return 'blue';
    if (type.includes('writing')) return 'purple';
    if (type.includes('speaking')) return 'pink';
    if (type.includes('listening')) return 'orange';
    if (type.includes('reading')) return 'teal';
    if (type.includes('login') || type.includes('logout')) return 'green';
    return 'gray';
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return past.toLocaleDateString();
  };

  const getActivityTypeLabel = (type: string) => {
    return type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No activities yet</h3>
        <p className="text-muted-foreground mb-4">
          Start your learning journey to see activities here
        </p>
        <Button variant="solid" tone="primary">
          Start Learning
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Recent Activities</h3>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {activities.length} activities
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {activities.map((activity, index) => (
          <div key={activity.id} className="relative pl-8 pb-6 last:pb-0">
            {/* Timeline line */}
            {index < activities.length - 1 && (
              <div className="absolute left-[15px] top-[24px] bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
            )}

            {/* Timeline dot */}
            <div className={`absolute left-0 top-1 w-7 h-7 rounded-full flex items-center justify-center ${
              getActivityColor(activity.activity_type) === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30' :
              getActivityColor(activity.activity_type) === 'green' ? 'bg-green-100 dark:bg-green-900/30' :
              getActivityColor(activity.activity_type) === 'purple' ? 'bg-purple-100 dark:bg-purple-900/30' :
              getActivityColor(activity.activity_type) === 'pink' ? 'bg-pink-100 dark:bg-pink-900/30' :
              getActivityColor(activity.activity_type) === 'orange' ? 'bg-orange-100 dark:bg-orange-900/30' :
              'bg-gray-100 dark:bg-gray-800'
            }`}>
              <div className={`${
                getActivityColor(activity.activity_type) === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                getActivityColor(activity.activity_type) === 'green' ? 'text-green-600 dark:text-green-400' :
                getActivityColor(activity.activity_type) === 'purple' ? 'text-purple-600 dark:text-purple-400' :
                getActivityColor(activity.activity_type) === 'pink' ? 'text-pink-600 dark:text-pink-400' :
                getActivityColor(activity.activity_type) === 'orange' ? 'text-orange-600 dark:text-orange-400' :
                'text-gray-600 dark:text-gray-400'
              }`}>
                {getActivityIcon(activity.activity_type)}
              </div>
            </div>

            {/* Activity content */}
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">
                    {getActivityTypeLabel(activity.activity_type)}
                  </span>
                  <Badge variant="outline" size="sm">
                    {getTimeAgo(activity.created_at)}
                  </Badge>
                </div>
                <p className="text-sm text-foreground mb-2">{activity.description}</p>

                {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                  <div className="text-xs text-muted-foreground bg-gray-50 dark:bg-gray-800/50 p-2 rounded">
                    {Object.entries(activity.metadata).map(([key, value]) => (
                      <div key={key} className="flex">
                        <span className="font-medium w-20">{key}:</span>
                        <span className="flex-1">{JSON.stringify(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {activity.related_table && activity.related_id && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    // Navigate to related item
                    console.log('Navigate to:', activity.related_table, activity.related_id);
                  }}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {activities.length >= 20 && (
        <div className="mt-6 pt-6 border-t border-border">
          <Button variant="soft" className="w-full">
            Load More Activities
          </Button>
        </div>
      )}
    </Card>
  );
}