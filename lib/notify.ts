import type { NextApiRequest, NextApiResponse } from 'next';

import type { EnqueueBodyInput } from '@/types/notifications';

import {
  dispatchPending,
  enqueueEvent as handleEnqueueEvent,
  getNotificationContact,
  queueNotificationEvent,
} from './notify/index';

export type { NotificationContact, EnqueueResult } from './notify/index';

type Payload = Record<string, any>;

export async function notify(topic: string, payload: Payload = {}) {
  if (process.env.NODE_ENV !== 'production') {
    console.info('[notify]', topic, payload);
  }
  return { ok: true };
}

export async function enqueueEvent(
  req: NextApiRequest,
  res: NextApiResponse,
  body: EnqueueBodyInput,
) {
  return handleEnqueueEvent(req, res, body);
}

export { queueNotificationEvent, getNotificationContact, dispatchPending };
