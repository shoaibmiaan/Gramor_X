// pages/api/activities/export.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { parse } from 'json2csv';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user from auth token
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Fetch user activities
    const { data: activities, error } = await supabaseAdmin
      .from('user_activities')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Format data for CSV
    const formattedActivities = activities.map(activity => ({
      Date: new Date(activity.created_at).toLocaleString(),
      Type: activity.activity_type.replace(/_/g, ' '),
      Description: activity.description,
      IP_Address: activity.ip_address,
      User_Agent: activity.user_agent,
      Metadata: JSON.stringify(activity.metadata),
      Related_Table: activity.related_table,
      Related_ID: activity.related_id,
    }));

    // Convert to CSV
    const csv = parse(formattedActivities);

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=gramorx-activities-${user.id}-${new Date().toISOString().split('T')[0]}.csv`);

    return res.status(200).send(csv);
  } catch (error) {
    console.error('Export error:', error);
    return res.status(500).json({ error: 'Failed to export activities' });
  }
}