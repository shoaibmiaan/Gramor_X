// pages/dashboard/activity/index.tsx
'use client';

import * as React from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { Container } from "@/components/design-system/Container";
import { Button } from "@/components/design-system/Button";
import { Badge } from "@/components/design-system/Badge";
import { Card } from "@/components/design-system/Card";
import { Tabs } from "@/components/design-system/Tabs";
import { supabaseBrowser as supabase } from "@/lib/supabaseBrowser";
import ActivityTimeline from "@/components/activity/ActivityTimeline";
import TaskBoard from "@/components/activity/TaskBoard";
import StatsDashboard from "@/components/activity/StatsDashboard";
import CreateTaskModal from "@/components/activity/CreateTaskModal";
import QuickActions from "@/components/activity/QuickActions";

// Icons
import {
  Activity,
  Timeline,
  Tasks,
  BarChart3,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  Users,
  Target,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  FileText,
  Mic,
  Headphones,
  BookOpen,
  Plus,
} from "lucide-react";

interface ActivityStats {
  totalActivities: number;
  todayActivities: number;
  pendingTasks: number;
  completedTasks: number;
  overdueTasks: number;
  writingAttempts: number;
  speakingAttempts: number;
  listeningAttempts: number;
  readingAttempts: number;
  streakDays: number;
  lastActive: string;
}

interface RecentActivity {
  id: string;
  activity_type: string;
  description: string;
  metadata: any;
  created_at: string;
  related_table?: string;
  related_id?: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  module?: string;
  task_type?: string;
  reference_id?: string;
  reference_table?: string;
  creator: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  assignee: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  comments_count: number;
}

export default function ActivityHomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState("timeline");
  const [stats, setStats] = React.useState<ActivityStats>({
    totalActivities: 0,
    todayActivities: 0,
    pendingTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    writingAttempts: 0,
    speakingAttempts: 0,
    listeningAttempts: 0,
    readingAttempts: 0,
    streakDays: 0,
    lastActive: '',
  });
  const [recentActivities, setRecentActivities] = React.useState<RecentActivity[]>([]);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState({
    stats: true,
    activities: true,
    tasks: true,
  });
  const [showCreateTaskModal, setShowCreateTaskModal] = React.useState(false);
  const [filters, setFilters] = React.useState({
    dateRange: '7d',
    activityType: 'all',
    taskStatus: 'all',
  });
  const [user, setUser] = React.useState<any>(null);

  // Fetch user data
  React.useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!mounted) return;

      if (sessionData.session?.user) {
        setUser(sessionData.session.user);
      }
    })();

    return () => { mounted = false; };
  }, []);

  // Fetch all data
  const fetchAllData = React.useCallback(async () => {
    if (!user?.id) return;

    setLoading({ stats: true, activities: true, tasks: true });

    try {
      // Fetch stats
      await fetchStats(user.id);

      // Fetch recent activities
      await fetchRecentActivities(user.id);

      // Fetch tasks
      await fetchTasks(user.id);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading({ stats: false, activities: false, tasks: false });
    }
  }, [user]);

  React.useEffect(() => {
    if (user?.id) {
      fetchAllData();
    }
  }, [user, fetchAllData]);

  const fetchStats = async (userId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    // Total activities
    const { count: totalActivities } = await supabase
      .from('user_activities')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Today's activities
    const { count: todayActivities } = await supabase
      .from('user_activities')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', todayStr);

    // Task stats
    const { data: tasksData } = await supabase
      .from('task_assignments')
      .select('status')
      .eq('assigned_to', userId);

    const taskStats = {
      pending: 0,
      completed: 0,
      overdue: 0,
    };

    tasksData?.forEach(task => {
      if (task.status === 'pending') {
        taskStats.pending++;
        // Check if overdue
        if (task.due_date && new Date(task.due_date) < new Date()) {
          taskStats.overdue++;
        }
      } else if (task.status === 'completed') {
        taskStats.completed++;
      }
    });

    // Module attempt counts
    const { count: writingAttempts } = await supabase
      .from('writing_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: speakingAttempts } = await supabase
      .from('speaking_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: listeningAttempts } = await supabase
      .from('attempts_listening')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: readingAttempts } = await supabase
      .from('reading_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Streak
    const { data: streakData } = await supabase
      .from('streaks')
      .select('current')
      .eq('user_id', userId)
      .single();

    const { data: lastActivity } = await supabase
      .from('user_activities')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    setStats({
      totalActivities: totalActivities || 0,
      todayActivities: todayActivities || 0,
      pendingTasks: taskStats.pending,
      completedTasks: taskStats.completed,
      overdueTasks: taskStats.overdue,
      writingAttempts: writingAttempts || 0,
      speakingAttempts: speakingAttempts || 0,
      listeningAttempts: listeningAttempts || 0,
      readingAttempts: readingAttempts || 0,
      streakDays: streakData?.current || 0,
      lastActive: lastActivity?.created_at || '',
    });
  };

  const fetchRecentActivities = async (userId: string) => {
    const { data } = await supabase
      .from('user_activities')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    setRecentActivities(data || []);
  };

  const fetchTasks = async (userId: string) => {
    const { data } = await supabase
      .from('task_assignments')
      .select(`
        *,
        creator:profiles!task_assignments_created_by_fkey (id, email, full_name, avatar_url),
        assignee:profiles!task_assignments_assigned_to_fkey (id, email, full_name, avatar_url),
        comments:task_comments(count)
      `)
      .or(`created_by.eq.${userId},assigned_to.eq.${userId}`)
      .order('created_at', { ascending: false });

    setTasks(data || []);
  };

  const handleTaskCreated = () => {
    setShowCreateTaskModal(false);
    if (user?.id) {
      fetchTasks(user.id);
      fetchStats(user.id);
    }
  };

  const handleTaskUpdated = () => {
    if (user?.id) {
      fetchTasks(user.id);
      fetchStats(user.id);
    }
  };

  const handleExportActivities = async () => {
    try {
      const response = await fetch('/api/activities/export', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `activities-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const getActivityTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      login: 'Login',
      logout: 'Logout',
      task_created: 'Task Created',
      task_completed: 'Task Completed',
      task_updated: 'Task Updated',
      attempt_submitted: 'Attempt Submitted',
      writing_submitted: 'Writing Submitted',
      speaking_completed: 'Speaking Completed',
      listening_completed: 'Listening Completed',
      reading_completed: 'Reading Completed',
      profile_updated: 'Profile Updated',
      course_enrolled: 'Course Enrolled',
      lesson_completed: 'Lesson Completed',
      streak_updated: 'Streak Updated',
      achievement_earned: 'Achievement Earned',
    };
    return labels[type] || type.replace(/_/g, ' ');
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login': return <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
      </div>;
      case 'task_created': return <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>;
      case 'writing_submitted': return <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
        <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
      </div>;
      case 'speaking_completed': return <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
        <Mic className="w-5 h-5 text-pink-600 dark:text-pink-400" />
      </div>;
      case 'listening_completed': return <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
        <Headphones className="w-5 h-5 text-orange-600 dark:text-orange-400" />
      </div>;
      default: return <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <Activity className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </div>;
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'yellow',
      in_progress: 'blue',
      completed: 'green',
      cancelled: 'red',
      review: 'purple',
    };
    return colors[status as keyof typeof colors] || 'gray';
  };

  return (
    <>
      <Head>
        <title>Activity Dashboard · GramorX</title>
        <meta
          name="description"
          content="Track your learning progress, view activity history, and manage tasks."
        />
      </Head>

      <main className="bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90 min-h-screen">
        <Container className="py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <Activity className="h-8 w-8 text-primary" />
                  </div>
                  Activity Dashboard
                </h1>
                <p className="text-muted-foreground mt-2">
                  Track your learning progress, view activity history, and manage tasks
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={fetchAllData}
                  loading={loading.stats || loading.activities || loading.tasks}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportActivities}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
                <Button
                  variant="solid"
                  tone="primary"
                  onClick={() => setShowCreateTaskModal(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Task
                </Button>
              </div>
            </div>
          </div>

          {/* Stats Overview */}
          <StatsDashboard stats={stats} loading={loading.stats} />

          {/* Main Content Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Left Column - Quick Actions & Filters */}
            <div className="lg:col-span-1 space-y-6">
              <QuickActions
                stats={stats}
                onTaskCreate={() => setShowCreateTaskModal(true)}
                onViewAllTasks={() => {
                  setActiveTab('tasks');
                  document.getElementById('tasks-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
              />

              {/* Filters */}
              <Card className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <Filter className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold">Filters</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Date Range
                    </label>
                    <select
                      className="w-full p-2 border border-border rounded-lg bg-background"
                      value={filters.dateRange}
                      onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
                    >
                      <option value="today">Today</option>
                      <option value="7d">Last 7 Days</option>
                      <option value="30d">Last 30 Days</option>
                      <option value="90d">Last 90 Days</option>
                      <option value="all">All Time</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Activity Type
                    </label>
                    <select
                      className="w-full p-2 border border-border rounded-lg bg-background"
                      value={filters.activityType}
                      onChange={(e) => setFilters({...filters, activityType: e.target.value})}
                    >
                      <option value="all">All Activities</option>
                      <option value="task">Tasks</option>
                      <option value="writing">Writing</option>
                      <option value="speaking">Speaking</option>
                      <option value="listening">Listening</option>
                      <option value="reading">Reading</option>
                      <option value="system">System</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Task Status
                    </label>
                    <select
                      className="w-full p-2 border border-border rounded-lg bg-background"
                      value={filters.taskStatus}
                      onChange={(e) => setFilters({...filters, taskStatus: e.target.value})}
                    >
                      <option value="all">All Tasks</option>
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="review">Review</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                  <Button variant="soft" className="w-full" onClick={fetchAllData}>
                    Apply Filters
                  </Button>
                </div>
              </Card>

              {/* Recent Achievements */}
              <Card className="p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Target className="h-5 w-5 text-accent" />
                  Recent Achievements
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-success/10 rounded-lg">
                    <div className="p-2 bg-success/20 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">7-Day Streak</p>
                      <p className="text-xs text-muted-foreground">Keep it up!</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-blue-500/10 rounded-lg">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Writing Master</p>
                      <p className="text-xs text-muted-foreground">10+ submissions</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Tabs Navigation */}
              <div className="bg-card border border-border rounded-xl p-1">
                <div className="flex space-x-1">
                  <button
                    className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-colors ${activeTab === 'timeline' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setActiveTab('timeline')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Timeline className="h-4 w-4" />
                      Activity Timeline
                    </div>
                  </button>
                  <button
                    className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-colors ${activeTab === 'tasks' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setActiveTab('tasks')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Tasks className="h-4 w-4" />
                      Task Board ({tasks.length})
                    </div>
                  </button>
                  <button
                    className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-colors ${activeTab === 'analytics' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setActiveTab('analytics')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Analytics
                    </div>
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div id="tasks-section">
                {activeTab === 'timeline' && (
                  <ActivityTimeline
                    activities={recentActivities}
                    loading={loading.activities}
                    filters={filters}
                  />
                )}

                {activeTab === 'tasks' && (
                  <TaskBoard
                    tasks={tasks}
                    loading={loading.tasks}
                    onTaskUpdate={handleTaskUpdated}
                    filters={filters}
                  />
                )}

                {activeTab === 'analytics' && (
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Activity Analytics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                        <p className="text-sm text-blue-600 dark:text-blue-400">Most Active Day</p>
                        <p className="text-2xl font-bold mt-1">Monday</p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                        <p className="text-sm text-green-600 dark:text-green-400">Avg. Daily Activities</p>
                        <p className="text-2xl font-bold mt-1">12</p>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                        <p className="text-sm text-purple-600 dark:text-purple-400">Peak Hour</p>
                        <p className="text-2xl font-bold mt-1">7 PM</p>
                      </div>
                      <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                        <p className="text-sm text-orange-600 dark:text-orange-400">Task Completion Rate</p>
                        <p className="text-2xl font-bold mt-1">78%</p>
                      </div>
                    </div>
                    <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                      <p className="text-muted-foreground">Activity charts coming soon...</p>
                    </div>
                  </Card>
                )}
              </div>

              {/* Upcoming Tasks */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Upcoming Tasks
                  </h3>
                  <Badge variant="outline">{stats.pendingTasks} pending</Badge>
                </div>

                <div className="space-y-3">
                  {tasks
                    .filter(task => task.status === 'pending' && task.due_date)
                    .slice(0, 3)
                    .map(task => (
                      <div key={task.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            task.priority === 'urgent' ? 'bg-red-100 dark:bg-red-900/30' :
                            task.priority === 'high' ? 'bg-orange-100 dark:bg-orange-900/30' :
                            task.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                            'bg-green-100 dark:bg-green-900/30'
                          }`}>
                            <AlertCircle className={`h-4 w-4 ${
                              task.priority === 'urgent' ? 'text-red-600 dark:text-red-400' :
                              task.priority === 'high' ? 'text-orange-600 dark:text-orange-400' :
                              task.priority === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
                              'text-green-600 dark:text-green-400'
                            }`} />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{task.title}</p>
                            <p className="text-xs text-muted-foreground">
                              Due {new Date(task.due_date!).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="soft"
                          onClick={() => router.push(`/dashboard/tasks/${task.id}`)}
                        >
                          View
                        </Button>
                      </div>
                    ))}

                  {tasks.filter(task => task.status === 'pending' && task.due_date).length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      No upcoming tasks
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>

          {/* Recent Comments */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Recent Comments & Feedback
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">AI</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">AI Feedback</p>
                    <p className="text-xs text-muted-foreground">2 hours ago</p>
                  </div>
                </div>
                <p className="text-sm">"Great vocabulary improvement in your last essay. Try varying sentence structures more."</p>
              </div>

              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                    <span className="text-green-600 dark:text-green-400 font-semibold">T</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Teacher Review</p>
                    <p className="text-xs text-muted-foreground">Yesterday</p>
                  </div>
                </div>
                <p className="text-sm">"Your pronunciation has improved significantly. Focus on intonation patterns."</p>
              </div>

              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 dark:text-purple-400 font-semibold">C</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Codex System</p>
                    <p className="text-xs text-muted-foreground">3 days ago</p>
                  </div>
                </div>
                <p className="text-sm">"Task #42 has been completed. New writing prompts are available in your queue."</p>
              </div>
            </div>
          </Card>
        </Container>

        {/* Create Task Modal */}
        {showCreateTaskModal && (
          <CreateTaskModal
            isOpen={showCreateTaskModal}
            onClose={() => setShowCreateTaskModal(false)}
            onSuccess={handleTaskCreated}
            userId={user?.id}
          />
        )}
      </main>
    </>
  );
}