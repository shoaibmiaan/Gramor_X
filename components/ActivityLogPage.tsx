// components/ActivityLogPage.tsx
import React, { useState, useEffect } from 'react'
import {
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Box,
  Tabs,
  Tab,
  IconButton,
  Badge,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  LinearProgress,
} from '@mui/material'
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineDot,
  TimelineConnector,
  TimelineContent,
  TimelineOppositeContent,
} from '@mui/lab'
import {
  CheckCircle,
  Assignment,
  Create,
  Login,
  Logout,
  Update,
  Comment,
  Schedule,
  PriorityHigh,
  FilterList,
  Refresh,
  Add,
  Visibility,
  Edit,
  ChatBubble,
  Notifications,
  TaskAlt,
  PendingActions,
} from '@mui/icons-material'
import { supabase } from '../lib/supabaseClient'

interface Activity {
  id: string
  activity_type: string
  description: string
  metadata: any
  created_at: string
  formatted_date: string
  related_table?: string
  related_id?: string
}

interface Task {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string
  created_at: string
  updated_at: string
  completed_at?: string
  creator: {
    id: string
    full_name: string
    email: string
    avatar_url?: string
  }
  assignee: {
    id: string
    full_name: string
    email: string
    avatar_url?: string
  }
  comments_count: number
  comments_details?: Array<{
    id: string
    comment: string
    created_at: string
    commenter: {
      id: string
      full_name: string
      avatar_url?: string
    }
  }>
}

const ActivityLogPage: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [codexTasks, setCodexTasks] = useState<Task[]>([])
  const [openTaskDialog, setOpenTaskDialog] = useState(false)
  const [openTaskDetail, setOpenTaskDetail] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState({
    activities: false,
    tasks: false,
    codexTasks: false,
  })
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    due_date: '',
    module: '',
    task_type: '',
    reference_id: '',
    reference_table: '',
  })
  const [newComment, setNewComment] = useState<Record<string, string>>({})
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    fetchUser()
    fetchActivities()
    fetchUserTasks()
    fetchCodexTasks()
  }, [])

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  const fetchActivities = async () => {
    setLoading(prev => ({ ...prev, activities: true }))
    try {
      const { data, error } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setActivities(data || [])
    } catch (error) {
      console.error('Error fetching activities:', error)
    } finally {
      setLoading(prev => ({ ...prev, activities: false }))
    }
  }

  const fetchUserTasks = async () => {
    setLoading(prev => ({ ...prev, tasks: true }))
    try {
      const { data, error } = await supabase
        .from('task_assignments')
        .select(`
          *,
          creator:profiles!task_assignments_created_by_fkey (id, email, full_name, avatar_url),
          assignee:profiles!task_assignments_assigned_to_fkey (id, email, full_name, avatar_url),
          comments:task_comments(count)
        `)
        .or(`created_by.eq.${user?.id},assigned_to.eq.${user?.id}`)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTasks(data || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(prev => ({ ...prev, tasks: false }))
    }
  }

  const fetchCodexTasks = async () => {
    setLoading(prev => ({ ...prev, codexTasks: true }))
    try {
      // Get Codex user ID
      const { data: codexUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', 'codex@system.com')
        .single()

      if (codexUser) {
        const { data, error } = await supabase
          .from('task_assignments')
          .select(`
            *,
            creator:profiles!task_assignments_created_by_fkey (id, email, full_name, avatar_url),
            assignee:profiles!task_assignments_assigned_to_fkey (id, email, full_name, avatar_url),
            comments:task_comments(count)
          `)
          .eq('assigned_to', codexUser.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        setCodexTasks(data || [])
      }
    } catch (error) {
      console.error('Error fetching Codex tasks:', error)
    } finally {
      setLoading(prev => ({ ...prev, codexTasks: false }))
    }
  }

  const handleCreateTask = async () => {
    try {
      const { data, error } = await supabase.rpc('create_task_with_activity', {
        p_title: newTask.title,
        p_description: newTask.description,
        p_created_by: user.id,
        p_assigned_to: 'codex@system.com',
        p_priority: newTask.priority,
        p_due_date: newTask.due_date || null,
        p_module: newTask.module || null,
        p_task_type: newTask.task_type || null,
        p_reference_id: newTask.reference_id || null,
        p_reference_table: newTask.reference_table || null,
      })

      if (error) throw error

      setOpenTaskDialog(false)
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
        module: '',
        task_type: '',
        reference_id: '',
        reference_table: '',
      })

      fetchUserTasks()
      fetchCodexTasks()
      fetchActivities()
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  const handleUpdateTaskStatus = async (taskId: string, status: Task['status'], comment?: string) => {
    try {
      const { error } = await supabase
        .from('task_assignments')
        .update({
          status,
          ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {}),
        })
        .eq('id', taskId)

      if (error) throw error

      if (comment) {
        await supabase.from('task_comments').insert({
          task_id: taskId,
          user_id: user.id,
          comment,
          metadata: { status_change: status },
        })
      }

      fetchUserTasks()
      fetchCodexTasks()
      fetchActivities()
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const handleAddComment = async (taskId: string) => {
    const comment = newComment[taskId]
    if (!comment?.trim()) return

    try {
      const { error } = await supabase.from('task_comments').insert({
        task_id: taskId,
        user_id: user.id,
        comment,
      })

      if (error) throw error

      setNewComment(prev => ({ ...prev, [taskId]: '' }))
      fetchUserTasks()
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login':
        return <Login color="success" />
      case 'logout':
        return <Logout color="warning" />
      case 'task_created':
        return <Assignment color="primary" />
      case 'task_completed':
        return <CheckCircle color="success" />
      case 'attempt_submitted':
        return <TaskAlt color="info" />
      case 'profile_updated':
        return <Update color="info" />
      default:
        return <Create />
    }
  }

  const getStatusColor = (status: Task['status']) => {
    const colors = {
      pending: 'warning',
      in_progress: 'info',
      completed: 'success',
      cancelled: 'error',
      review: 'secondary',
    }
    return colors[status] || 'default'
  }

  const getPriorityColor = (priority: Task['priority']) => {
    const colors = {
      low: 'success',
      medium: 'warning',
      high: 'error',
      urgent: 'error',
    }
    return colors[priority] || 'default'
  }

  const renderActivityTimeline = () => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6">Recent Activities</Typography>
          <IconButton onClick={fetchActivities} size="small">
            <Refresh />
          </IconButton>
        </Box>
        {loading.activities ? (
          <LinearProgress />
        ) : activities.length === 0 ? (
          <Typography color="textSecondary" align="center" py={3}>
            No activities found
          </Typography>
        ) : (
          <Timeline>
            {activities.map((activity, index) => (
              <TimelineItem key={activity.id}>
                <TimelineOppositeContent color="textSecondary">
                  {new Date(activity.created_at).toLocaleString()}
                </TimelineOppositeContent>
                <TimelineSeparator>
                  <TimelineDot>{getActivityIcon(activity.activity_type)}</TimelineDot>
                  {index < activities.length - 1 && <TimelineConnector />}
                </TimelineSeparator>
                <TimelineContent>
                  <Typography variant="body1">{activity.description}</Typography>
                  {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                    <Typography variant="caption" color="textSecondary">
                      {JSON.stringify(activity.metadata)}
                    </Typography>
                  )}
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        )}
      </CardContent>
    </Card>
  )

  const renderTaskCard = (task: Task) => (
    <Card key={task.id} sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h6">{task.title}</Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              {task.description}
            </Typography>
            <Box display="flex" gap={1} mt={1}>
              <Chip
                label={task.status.replace('_', ' ')}
                color={getStatusColor(task.status) as any}
                size="small"
              />
              <Chip
                label={task.priority}
                color={getPriorityColor(task.priority) as any}
                size="small"
              />
              {task.due_date && (
                <Chip
                  icon={<Schedule />}
                  label={new Date(task.due_date).toLocaleDateString()}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
          <Box display="flex" flexDirection="column" alignItems="flex-end">
            <Avatar
              src={task.assignee.avatar_url}
              sx={{ width: 32, height: 32, mb: 1 }}
            >
              {task.assignee.full_name?.charAt(0) || task.assignee.email?.charAt(0)}
            </Avatar>
            <Typography variant="caption">
              Assigned to: {task.assignee.full_name || task.assignee.email}
            </Typography>
          </Box>
        </Box>

        <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" color="textSecondary">
            Created: {new Date(task.created_at).toLocaleDateString()}
            {task.completed_at && ` • Completed: ${new Date(task.completed_at).toLocaleDateString()}`}
          </Typography>
          <Box>
            <IconButton
              size="small"
              onClick={() => setOpenTaskDetail(openTaskDetail === task.id ? null : task.id)}
            >
              <Visibility />
            </IconButton>
            {task.assigned_to === user.id && task.status !== 'completed' && (
              <IconButton
                size="small"
                onClick={() => handleUpdateTaskStatus(task.id, 'completed', 'Task completed')}
              >
                <CheckCircle />
              </IconButton>
            )}
          </Box>
        </Box>

        {openTaskDetail === task.id && (
          <Box mt={2}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              Comments ({task.comments_count})
            </Typography>
            <Box display="flex" gap={1} mb={2}>
              <TextField
                fullWidth
                size="small"
                placeholder="Add a comment..."
                value={newComment[task.id] || ''}
                onChange={(e) =>
                  setNewComment(prev => ({ ...prev, [task.id]: e.target.value }))
                }
              />
              <Button
                variant="contained"
                size="small"
                onClick={() => handleAddComment(task.id)}
              >
                Add
              </Button>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  )

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Activity & Task Dashboard
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)}>
          <Tab label="Activity Timeline" />
          <Tab label="My Tasks" />
          <Tab label="Codex Tasks" />
          <Tab label="Create Task" />
        </Tabs>
      </Box>

      {activeTab === 0 && renderActivityTimeline()}

      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Typography variant="h6">My Tasks</Typography>
                  <Box>
                    <Chip
                      label={`Pending: ${tasks.filter(t => t.status === 'pending').length}`}
                      color="warning"
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    <Chip
                      label={`Completed: ${tasks.filter(t => t.status === 'completed').length}`}
                      color="success"
                      size="small"
                    />
                  </Box>
                </Box>
                {loading.tasks ? (
                  <LinearProgress />
                ) : tasks.length === 0 ? (
                  <Typography color="textSecondary" align="center" py={3}>
                    No tasks found
                  </Typography>
                ) : (
                  tasks.map(renderTaskCard)
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Typography variant="h6">Tasks Assigned to Codex</Typography>
                  <Badge badgeContent={codexTasks.length} color="primary">
                    <Assignment />
                  </Badge>
                </Box>
                {loading.codexTasks ? (
                  <LinearProgress />
                ) : codexTasks.length === 0 ? (
                  <Typography color="textSecondary" align="center" py={3}>
                    No tasks assigned to Codex
                  </Typography>
                ) : (
                  codexTasks.map(renderTaskCard)
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Create New Task for Codex
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Task Title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Description"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={newTask.priority}
                    label="Priority"
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="urgent">Urgent</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Due Date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Module"
                  value={newTask.module}
                  onChange={(e) => setNewTask({ ...newTask, module: e.target.value })}
                  placeholder="e.g., writing, speaking"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Task Type"
                  value={newTask.task_type}
                  onChange={(e) => setNewTask({ ...newTask, task_type: e.target.value })}
                  placeholder="e.g., review, correction"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Link to Existing Content (Optional)
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Reference ID"
                      value={newTask.reference_id}
                      onChange={(e) => setNewTask({ ...newTask, reference_id: e.target.value })}
                      placeholder="UUID of existing item"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Reference Table"
                      value={newTask.reference_table}
                      onChange={(e) => setNewTask({ ...newTask, reference_table: e.target.value })}
                      placeholder="e.g., attempts, writing_submissions"
                    />
                  </Grid>
                </Grid>
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleCreateTask}
                  disabled={!newTask.title || !newTask.description}
                  startIcon={<Add />}
                >
                  Assign to Codex
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      <Dialog open={openTaskDialog} onClose={() => setOpenTaskDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Task</DialogTitle>
        <DialogContent>
          {/* Task form content */}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTaskDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateTask} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}

export default ActivityLogPage