// components/activity/CreateTaskModal.tsx
'use client';

import * as React from "react";
import { Button } from "@/components/design-system/Button";
import { supabaseBrowser as supabase } from "@/lib/supabaseBrowser";
import { X, User, Calendar, AlertCircle, Tag } from "lucide-react";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId?: string;
}

export default function CreateTaskModal({ isOpen, onClose, onSuccess, userId }: CreateTaskModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [assignee, setAssignee] = React.useState<'codex' | 'self' | 'other'>('codex');
  const [otherUserEmail, setOtherUserEmail] = React.useState('');
  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    due_date: '',
    module: '',
    task_type: '',
    reference_id: '',
    reference_table: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setLoading(true);
    try {
      // Get assignee ID
      let assigneeId = userId; // Default to self

      if (assignee === 'codex') {
        const { data: codexUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', 'codex@system.com')
          .single();
        assigneeId = codexUser?.id || userId;
      } else if (assignee === 'other' && otherUserEmail) {
        const { data: otherUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', otherUserEmail)
          .single();
        if (otherUser) {
          assigneeId = otherUser.id;
        }
      }

      // Create task
      const { data, error } = await supabase.rpc('create_task_with_activity', {
        p_title: formData.title,
        p_description: formData.description,
        p_created_by: userId,
        p_assigned_to: assigneeId,
        p_priority: formData.priority,
        p_due_date: formData.due_date || null,
        p_module: formData.module || null,
        p_task_type: formData.task_type || null,
        p_reference_id: formData.reference_id || null,
        p_reference_table: formData.reference_table || null,
      });

      if (error) throw error;

      // Reset form
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
        module: '',
        task_type: '',
        reference_id: '',
        reference_table: '',
      });
      setAssignee('codex');
      setOtherUserEmail('');

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Create New Task</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Assign tasks to yourself, Codex AI, or other users
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Assignee Selection */}
          <div>
            <label className="block text-sm font-medium mb-3">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4" />
                Assign To
              </div>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                className={`p-4 border rounded-lg text-center transition-colors ${
                  assignee === 'codex'
                    ? 'border-primary bg-primary/10'
                    : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                onClick={() => setAssignee('codex')}
              >
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">AI</span>
                </div>
                <div className="text-sm font-medium">Codex AI</div>
                <div className="text-xs text-muted-foreground">Automated tasks</div>
              </button>

              <button
                type="button"
                className={`p-4 border rounded-lg text-center transition-colors ${
                  assignee === 'self'
                    ? 'border-primary bg-primary/10'
                    : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                onClick={() => setAssignee('self')}
              >
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-2">
                  <User className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-sm font-medium">Myself</div>
                <div className="text-xs text-muted-foreground">Personal tasks</div>
              </button>

              <button
                type="button"
                className={`p-4 border rounded-lg text-center transition-colors ${
                  assignee === 'other'
                    ? 'border-primary bg-primary/10'
                    : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                onClick={() => setAssignee('other')}
              >
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-2">
                  <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-sm font-medium">Other User</div>
                <div className="text-xs text-muted-foreground">Collaborate</div>
              </button>
            </div>

            {assignee === 'other' && (
              <div className="mt-4">
                <input
                  type="email"
                  placeholder="Enter user's email address"
                  className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg"
                  value={otherUserEmail}
                  onChange={(e) => setOtherUserEmail(e.target.value)}
                  required
                />
              </div>
            )}
          </div>

          {/* Task Details */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Task Title *
              </label>
              <input
                type="text"
                className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg"
                placeholder="e.g., Review writing submission #42"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Description *
              </label>
              <textarea
                className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg min-h-[100px]"
                placeholder="Describe the task in detail..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Priority
                </label>
                <select
                  className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg"
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value as any})}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Due Date
                </label>
                <input
                  type="date"
                  className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg"
                  value={formData.due_date}
                  onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Module
                </label>
                <select
                  className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg"
                  value={formData.module}
                  onChange={(e) => setFormData({...formData, module: e.target.value})}
                >
                  <option value="">Select module</option>
                  <option value="writing">Writing</option>
                  <option value="speaking">Speaking</option>
                  <option value="listening">Listening</option>
                  <option value="reading">Reading</option>
                  <option value="vocabulary">Vocabulary</option>
                  <option value="grammar">Grammar</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Task Type
                </label>
                <select
                  className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg"
                  value={formData.task_type}
                  onChange={(e) => setFormData({...formData, task_type: e.target.value})}
                >
                  <option value="">Select type</option>
                  <option value="review">Review</option>
                  <option value="practice">Practice</option>
                  <option value="correction">Correction</option>
                  <option value="study">Study</option>
                  <option value="feedback">Feedback</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Reference ID (Optional)
                </label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg"
                  placeholder="UUID of related item"
                  value={formData.reference_id}
                  onChange={(e) => setFormData({...formData, reference_id: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Reference Table
                </label>
                <select
                  className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg"
                  value={formData.reference_table}
                  onChange={(e) => setFormData({...formData, reference_table: e.target.value})}
                >
                  <option value="">Select table</option>
                  <option value="attempts">Attempts</option>
                  <option value="writing_submissions">Writing Submissions</option>
                  <option value="speaking_attempts">Speaking Attempts</option>
                  <option value="reading_attempts">Reading Attempts</option>
                  <option value="mistakes_book">Mistakes</option>
                </select>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white dark:bg-gray-900 pt-6 border-t border-gray-200 dark:border-gray-800">
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="solid"
                tone="primary"
                loading={loading}
                disabled={!formData.title || !formData.description}
              >
                Create Task
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}