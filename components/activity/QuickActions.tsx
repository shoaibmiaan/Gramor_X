// components/activity/QuickActions.tsx
import * as React from "react";
import { Card } from "@/components/design-system/Card";
import { Button } from "@/components/design-system/Button";
import { ActivityStats } from "@/pages/dashboard/activity";
import {
  Plus,
  FileText,
  Mic,
  Headphones,
  BookOpen,
  Target,
  TrendingUp,
  Download,
  Share2,
  Bell,
} from "lucide-react";

interface QuickActionsProps {
  stats: ActivityStats;
  onTaskCreate: () => void;
  onViewAllTasks: () => void;
}

export default function QuickActions({ stats, onTaskCreate, onViewAllTasks }: QuickActionsProps) {
  const quickActions = [
    {
      icon: <FileText className="h-4 w-4" />,
      label: "Start Writing",
      description: "Practice task 2 essay",
      color: "indigo",
      href: "/writing/practice",
    },
    {
      icon: <Mic className="h-4 w-4" />,
      label: "Speaking Practice",
      description: "Part 2 cue card",
      color: "pink",
      href: "/speaking/practice",
    },
    {
      icon: <Headphones className="h-4 w-4" />,
      label: "Listening Exercise",
      description: "Section 3 practice",
      color: "orange",
      href: "/listening/practice",
    },
    {
      icon: <BookOpen className="h-4 w-4" />,
      label: "Reading Passage",
      description: "Academic passage 1",
      color: "teal",
      href: "/reading/practice",
    },
  ];

  const getColorClasses = (color: string) => {
    const classes = {
      indigo: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400",
      pink: "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400",
      orange: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
      teal: "bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400",
    };
    return classes[color as keyof typeof classes] || classes.indigo;
  };

  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Target className="h-5 w-5 text-primary" />
        Quick Actions
      </h3>

      <div className="space-y-3">
        {/* Create Task Button */}
        <Button
          variant="solid"
          tone="primary"
          className="w-full"
          onClick={onTaskCreate}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create New Task
        </Button>

        {/* Practice Actions */}
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action, index) => (
            <a
              key={index}
              href={action.href}
              className="block p-3 border border-border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${getColorClasses(action.color)}`}>
                  {action.icon}
                </div>
                <div>
                  <p className="text-sm font-medium">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* View All Tasks */}
        <Button
          variant="outline"
          className="w-full"
          onClick={onViewAllTasks}
        >
          View All Tasks ({stats.pendingTasks + stats.completedTasks})
        </Button>

        {/* Additional Actions */}
        <div className="pt-4 border-t border-border">
          <h4 className="text-sm font-medium mb-2">More Actions</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" size="sm" className="justify-start">
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </Button>
            <Button variant="ghost" size="sm" className="justify-start">
              <Share2 className="mr-2 h-4 w-4" />
              Share Progress
            </Button>
            <Button variant="ghost" size="sm" className="justify-start">
              <Bell className="mr-2 h-4 w-4" />
              Set Reminder
            </Button>
            <Button variant="ghost" size="sm" className="justify-start">
              <TrendingUp className="mr-2 h-4 w-4" />
              View Analytics
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}