import type { NextApiRequest, NextApiResponse } from 'next';
import { EnqueueBody, type EnqueueBodyInput } from '@/types/notifications';
import { supabaseService } from './supabaseServer';
import { NotificationService } from './notificationService';

export async function enqueueEvent(
  req: NextApiRequest,
  res: NextApiResponse,
  body: EnqueueBodyInput
) {
  try {
    const service = new NotificationService(supabaseService());
    
    // Check rate limit
    const rateLimit = parseInt(process.env.NOTIFICATIONS_ENQUEUE_LIMIT || '5');
    const allowed = await service.checkRateLimit(body.user_id, body.event_key, rateLimit);
    
    if (!allowed) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    // Record the event
    await service.recordEvent(body.user_id, body.event_key, body.idempotency_key);

    // Process notification based on channels and preferences
    const notification = await processNotification(body);
    
    return res.status(202).json({ 
      success: true, 
      notification,
      eventKey: body.event_key 
    });
  } catch (error) {
    console.error('Error enqueueing event:', error);
    return res.status(500).json({ 
      error: 'Failed to enqueue notification event' 
    });
  }
}

async function processNotification(body: EnqueueBodyInput) {
  const service = new NotificationService(supabaseService());
  
  // Get user preferences
  const { data: preferences } = await supabaseService()
    .from('notifications_opt_in')
    .select('*')
    .eq('user_id', body.user_id)
    .single();

  // Check if within quiet hours
  if (!body.bypass_quiet_hours && isWithinQuietHours(preferences)) {
    return { status: 'deferred', reason: 'quiet_hours' };
  }

  // Determine which channels to use
  const channelsToUse = determineChannels(body.channels, preferences);
  
  // Create in-app notification
  if (channelsToUse.has('in_app')) {
    const message = generateMessage(body.event_key, body.payload, body.locale);
    const url = generateUrl(body.event_key, body.payload);
    
    return await service.createNotification(body.user_id, {
      message,
      url,
    });
  }

  // TODO: Implement other channels (email, WhatsApp, etc.)
  return { status: 'enqueued', channels: Array.from(channelsToUse) };
}

function isWithinQuietHours(preferences: any): boolean {
  if (!preferences?.quiet_hours_start || !preferences?.quiet_hours_end) {
    return false;
  }

  const now = new Date();
  const tz = preferences.timezone || 'UTC';
  const currentTime = now.toLocaleTimeString('en-US', { 
    timeZone: tz, 
    hour12: false 
  });

  return currentTime >= preferences.quiet_hours_start && 
         currentTime <= preferences.quiet_hours_end;
}

function determineChannels(
  requestedChannels: string[] = [],
  preferences: any
): Set<string> {
  const channels = new Set<string>();
  
  // Always include in-app notifications
  channels.add('in_app');

  // Add requested channels if user has opted in
  if (requestedChannels.includes('email') && preferences?.email_opt_in !== false) {
    channels.add('email');
  }
  
  if (requestedChannels.includes('whatsapp') && preferences?.wa_opt_in) {
    channels.add('whatsapp');
  }

  return channels;
}

function generateMessage(eventKey: string, payload: any, locale: string): string {
  const messages: Record<string, string> = {
    'welcome': `Welcome to GramorX! Get started with your learning journey.`,
    'streak_milestone': `Great job! You've maintained a ${payload?.streak} day streak.`,
    'study_reminder': `Time for your daily practice! Keep your streak going.`,
    'assignment_due': `Assignment "${payload?.title}" is due soon.`,
    'nudge_manual': payload?.message || `You have a new notification.`,
  };

  return messages[eventKey] || `You have a new notification.`;
}

function generateUrl(eventKey: string, payload: any): string | undefined {
  const urls: Record<string, string> = {
    'welcome': '/welcome',
    'streak_milestone': '/learning',
    'study_reminder': '/practice',
    'assignment_due': `/assignments/${payload?.id}`,
  };

  return urls[eventKey];
}