// components/activity/TaskBoard.tsx
import * as React from "react";
import { Card } from "@/components/design-system/Card";
import { Badge } from "@/components/design-system/Badge";
import { Button } from "@/components/design-system/Button";
import { supabaseBrowser as supabase } from "@/lib/supabaseBrowser";
import { Task } from "@/pages/dashboard/activity";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  MessageSquare,
  Calendar,
  MoreVertical,
  Filter,
} from "lucide-react";

interface TaskBoardProps {
  tasks: Task[];
  loading: boolean;
  onTaskUpdate: () => void;
  filters: any;
}

export default function TaskBoard({ tasks, loading, onTaskUpdate, filters }: TaskBoardProps) {
  const [selectedTask, setSelectedTask] = React.useState<string | null>(null);
  const [commentInput, setCommentInput] = React.useState("");

  const handleStatusUpdate = async (taskId: string, newStatus: Task['status']) => {
    try {
      const { error } = await supabase
        .from('task_assignments')
        .update({
          status: newStatus,
          ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : {}),
        })
        .eq('id', taskId);

      if (error) throw error;

      // Log activity
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        await supabase.rpc('log_user_activity', {
          p_user_id: task.assigned_to.id,
          p_activity_type: 'task_updated',
          p_description: `Updated task "${task.title}" status to ${newStatus}`,
          p_metadata: {
            task_id: taskId,
            new_status: newStatus,
          },
          p_related_table: 'task_assignments',
          p_related_id: taskId,
        });
      }

      onTaskUpdate();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleAddComment = async (taskId: string) => {
    if (!commentInput.trim()) return;

    try {
      const { error } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          comment: commentInput,
        });

      if (error) throw error;

      setCommentInput("");
      onTaskUpdate();
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed': return 'green';
      case 'in_progress': return 'blue';
      case 'review': return 'purple';
      case 'cancelled': return 'red';
      default: return 'yellow';
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filters.taskStatus !== 'all' && task.status !== filters.taskStatus) {
      return false;
    }
    return true;
  });

  const tasksByStatus = {
    pending: filteredTasks.filter(t => t.status === 'pending'),
    in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
    review: filteredTasks.filter(t => t.status === 'review'),
    completed: filteredTasks.filter(t => t.status === 'completed'),
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const statusColumns = [
    { key: 'pending', title: 'To Do', color: 'yellow' },
    { key: 'in_progress', title: 'In Progress', color: 'blue' },
    { key: 'review', title: 'Review', color: 'purple' },
    { key: 'completed', title: 'Completed', color: 'green' },
  ];

  return (
    <div className="space-y-6">
      {/* Task Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statusColumns.map(({ key, title, color }) => (
          <Card key={key} className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{title}</span>
              <Badge
                variant={color as any}
                className="rounded-full"
              >
                {tasksByStatus[key as keyof typeof tasksByStatus].length}
              </Badge>
            </div>
            <div className="mt-2">
              {tasksByStatus[key as keyof typeof tasksByStatus]
                .slice(0, 2)
                .map(task => (
                  <div key={task.id} className="text-xs text-muted-foreground truncate">
                    {task.title}
                  </div>
                ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Task Board */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Task Board</h3>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline">
              <Filter className="h-3 w-3 mr-1" />
              Filter
            </Button>
            <Button size="sm" variant="outline">
              Sort
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {statusColumns.map(({ key, title, color }) => (
            <div key={key} className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">{title}</h4>
                <span className="text-xs text-muted-foreground">
                  {tasksByStatus[key as keyof typeof tasksByStatus].length}
                </span>
              </div>

              <div className="space-y-3">
                {tasksByStatus[key as keyof typeof tasksByStatus].map(task => (
                  <div
                    key={task.id}
                    className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant={getPriorityColor(task.priority) as any}
                            size="sm"
                          >
                            {task.priority}
                          </Badge>
                          {task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed' && (
                            <Badge variant="danger" size="sm">
                              Overdue
                            </Badge>
                          )}
                        </div>
                        <h5 className="font-medium text-sm mb-1">{task.title}</h5>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {task.description}
                        </p>
                      </div>
                      <button className="text-muted-foreground hover:text-foreground">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{task.assignee.full_name || task.assignee.email}</span>
                      </div>
                      {task.due_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(task.due_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                          onClick={() => setSelectedTask(
                            selectedTask === task.id ? null : task.id
                          )}
                        >
                          <MessageSquare className="h-3 w-3" />
                          {task.comments_count || 0}
                        </button>
                        {task.module && (
                          <Badge variant="outline" size="sm">
                            {task.module}
                          </Badge>
                        )}
                      </div>

                      {task.status !== 'completed' && (
                        <Button
                          size="sm"
                          variant="soft"
                          onClick={() => {
                            const nextStatus =
                              task.status === 'pending' ? 'in_progress' :
                              task.status === 'in_progress' ? 'review' :
                              task.status === 'review' ? 'completed' : 'completed';
                            handleStatusUpdate(task.id, nextStatus);
                          }}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {task.status === 'pending' ? 'Start' :
                           task.status === 'in_progress' ? 'Review' :
                           task.status === 'review' ? 'Complete' : 'Done'}
                        </Button>
                      )}
                    </div>

                    {/* Comment input */}
                    {selectedTask === task.id && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <textarea
                          className="w-full p-2 text-sm border border-border rounded mb-2"
                          placeholder="Add a comment..."
                          rows={2}
                          value={commentInput}
                          onChange={(e) => setCommentInput(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedTask(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleAddComment(task.id)}
                          >
                            Comment
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {tasksByStatus[key as keyof typeof tasksByStatus].length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    No tasks in {title.toLowerCase()}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}