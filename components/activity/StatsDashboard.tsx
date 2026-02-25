// components/activity/StatsDashboard.tsx
import * as React from "react";
import { Card } from "@/components/design-system/Card";
import { Badge } from "@/components/design-system/Badge";
import { ActivityStats } from "@/pages/dashboard/activity";
import {
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Mic,
  Headphones,
  BookOpen,
  TrendingUp,
  Calendar,
} from "lucide-react";

interface StatsDashboardProps {
  stats: ActivityStats;
  loading: boolean;
}

export default function StatsDashboard({ stats, loading }: StatsDashboardProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="p-4">
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Activities",
      value: stats.totalActivities,
      icon: <Activity className="h-5 w-5" />,
      color: "blue",
      change: "+12%",
    },
    {
      title: "Today's Activities",
      value: stats.todayActivities,
      icon: <Clock className="h-5 w-5" />,
      color: "green",
      change: "+5",
    },
    {
      title: "Pending Tasks",
      value: stats.pendingTasks,
      icon: <AlertCircle className="h-5 w-5" />,
      color: "yellow",
      subValue: stats.overdueTasks > 0 ? `${stats.overdueTasks} overdue` : undefined,
    },
    {
      title: "Completed Tasks",
      value: stats.completedTasks,
      icon: <CheckCircle className="h-5 w-5" />,
      color: "purple",
      change: "78%",
    },
    {
      title: "Current Streak",
      value: `${stats.streakDays} days`,
      icon: <TrendingUp className="h-5 w-5" />,
      color: "orange",
      badge: stats.streakDays > 0 ? "Active" : "Inactive",
    },
  ];

  const moduleCards = [
    {
      title: "Writing",
      value: stats.writingAttempts,
      icon: <FileText className="h-5 w-5" />,
      color: "indigo",
    },
    {
      title: "Speaking",
      value: stats.speakingAttempts,
      icon: <Mic className="h-5 w-5" />,
      color: "pink",
    },
    {
      title: "Listening",
      value: stats.listeningAttempts,
      icon: <Headphones className="h-5 w-5" />,
      color: "orange",
    },
    {
      title: "Reading",
      value: stats.readingAttempts,
      icon: <BookOpen className="h-5 w-5" />,
      color: "teal",
    },
  ];

  const getColorClasses = (color: string) => {
    const classes = {
      blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
      green: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
      yellow: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400",
      purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
      orange: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
      indigo: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400",
      pink: "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400",
      teal: "bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400",
    };
    return classes[color as keyof typeof classes] || classes.blue;
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Activity Overview</h2>
        <div className="text-sm text-muted-foreground">
          Last active: {stats.lastActive ? new Date(stats.lastActive).toLocaleDateString() : 'Never'}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-lg ${getColorClasses(stat.color)}`}>
                {stat.icon}
              </div>
              {stat.change && (
                <span className="text-xs font-medium text-green-600 dark:text-green-400">
                  {stat.change}
                </span>
              )}
              {stat.badge && (
                <Badge variant={stat.badge === "Active" ? "success" : "neutral"} size="sm">
                  {stat.badge}
                </Badge>
              )}
            </div>
            <p className="text-2xl font-bold mt-3">{stat.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{stat.title}</p>
            {stat.subValue && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {stat.subValue}
              </p>
            )}
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {moduleCards.map((module, index) => (
          <Card key={index} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${getColorClasses(module.color)}`}>
                {module.icon}
              </div>
              <div>
                <p className="text-2xl font-bold">{module.value}</p>
                <p className="text-sm text-muted-foreground">{module.title}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}