// /functions/activities/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const url = new URL(req.url)
    const path = url.pathname.split('/').pop()

    switch (path) {
      case 'get-activities':
        return await handleGetActivities(req, supabaseClient, user)
      case 'create-task':
        return await handleCreateTask(req, supabaseClient, user)
      case 'get-tasks':
        return await handleGetTasks(req, supabaseClient, user)
      case 'update-task':
        return await handleUpdateTask(req, supabaseClient, user)
      default:
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// Get user activities
async function handleGetActivities(req: Request, supabase: any, user: any) {
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')
  const activityType = searchParams.get('type')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')

  let query = supabase
    .from('user_activities')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (activityType) {
    query = query.eq('activity_type', activityType)
  }
  if (startDate) {
    query = query.gte('created_at', startDate)
  }
  if (endDate) {
    query = query.lte('created_at', endDate)
  }

  const { data, error } = await query

  if (error) throw error

  // Format dates for frontend
  const activities = data.map((activity: any) => ({
    ...activity,
    created_at: new Date(activity.created_at).toISOString(),
    formatted_date: new Date(activity.created_at).toLocaleString(),
  }))

  return new Response(JSON.stringify({ activities }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Create task for Codex
async function handleCreateTask(req: Request, supabase: any, user: any) {
  const body = await req.json()
  const {
    title,
    description,
    priority = 'medium',
    due_date,
    module,
    task_type,
    reference_id,
    reference_table,
  } = body

  // Find Codex user (assuming Codex has email 'codex@system.com')
  const { data: codexUser, error: codexError } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', 'codex@system.com')
    .single()

  if (codexError || !codexUser) {
    throw new Error('Codex user not found. Please create a user with email codex@system.com')
  }

  // Create task using database function
  const { data: taskData, error: taskError } = await supabase.rpc(
    'create_task_with_activity',
    {
      p_title: title,
      p_description: description,
      p_created_by: user.id,
      p_assigned_to: codexUser.id,
      p_priority: priority,
      p_due_date: due_date,
      p_module: module,
      p_task_type: task_type,
      p_reference_id: reference_id,
      p_reference_table: reference_table,
    }
  )

  if (taskError) throw taskError

  return new Response(
    JSON.stringify({
      message: 'Task created successfully',
      task_id: taskData,
      assigned_to: {
        id: codexUser.id,
        email: codexUser.email,
      },
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}

// Get tasks (assigned to user or created by user)
async function handleGetTasks(req: Request, supabase: any, user: any) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const assigned = searchParams.get('assigned') === 'true'

  let query = supabase
    .from('task_assignments')
    .select(`
      *,
      creator:profiles!task_assignments_created_by_fkey (id, email, full_name, avatar_url),
      assignee:profiles!task_assignments_assigned_to_fkey (id, email, full_name, avatar_url),
      comments:task_comments(count),
      comments_details:task_comments(*, commenter:profiles(id, full_name, avatar_url))
    `)

  if (assigned) {
    query = query.eq('assigned_to', user.id)
  } else {
    query = query.or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`)
  }

  if (status) {
    query = query.eq('status', status)
  }

  query = query.order('created_at', { ascending: false })

  const { data: tasks, error } = await query

  if (error) throw error

  return new Response(JSON.stringify({ tasks }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Update task status
async function handleUpdateTask(req: Request, supabase: any, user: any) {
  const { task_id, status, comment } = await req.json()

  // Update task status
  const { data: task, error: updateError } = await supabase
    .from('task_assignments')
    .update({
      status,
      ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {}),
    })
    .eq('id', task_id)
    .select()
    .single()

  if (updateError) throw updateError

  // Add comment if provided
  if (comment) {
    const { error: commentError } = await supabase
      .from('task_comments')
      .insert({
        task_id,
        user_id: user.id,
        comment,
        metadata: { status_change: status },
      })

    if (commentError) throw commentError
  }

  // Log activity
  await supabase.rpc('log_user_activity', {
    p_user_id: user.id,
    p_activity_type: 'task_updated',
    p_description: `Updated task "${task.title}" status to ${status}`,
    p_metadata: {
      task_id,
      old_status: task.status,
      new_status: status,
      comment: comment || null,
    },
    p_related_table: 'task_assignments',
    p_related_id: task_id,
  })

  return new Response(
    JSON.stringify({
      message: 'Task updated successfully',
      task,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}