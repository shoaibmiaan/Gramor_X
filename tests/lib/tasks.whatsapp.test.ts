import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

process.env.WHATSAPP_TASKS_SIGNING_SECRET = 'unit-test-secret';

const modulePromise = import('../../lib/tasks/whatsapp');

describe('whatsapp task helpers', () => {
  it('builds confirmation message with personalization', async () => {
    const { buildWhatsAppTaskMessage } = await modulePromise;
    const message = buildWhatsAppTaskMessage('optInConfirmation', {
      userName: 'Sara',
      url: 'https://gramorx.com/tasks',
    });

    assert.match(message, /Sara/);
    assert.match(message, /WhatsApp study tasks/);
    assert.ok(message.endsWith('\nhttps://gramorx.com/tasks'));
  });

  it('signs payloads when dispatching tasks', async () => {
    const { dispatchWhatsAppTask, buildWhatsAppTaskMessage } = await modulePromise;
    const calls: any[] = [];
    const supabase: any = {
      functions: {
        invoke: async (name: string, options: any) => {
          calls.push({ name, options });
          return { data: { ok: true }, error: null };
        },
      },
    };

    const message = buildWhatsAppTaskMessage('taskReminder', {
      taskName: 'Writing Prompt',
      dueAt: 'tonight',
      url: 'https://gramorx.com/app',
    });

    const response = await dispatchWhatsAppTask(supabase, {
      userId: 'user-123',
      type: 'task',
      message,
      metadata: { origin: 'unit-test' },
    });

    assert.equal(response.error, null);
    assert.equal(calls.length, 1);

    const [{ name, options }] = calls;
    assert.equal(name, 'whatsapp-tasks');
    assert.equal(options.headers['content-type'], 'application/json');
    assert.equal(typeof options.body, 'string');

    const expectedSignature = createHmac('sha256', 'unit-test-secret')
      .update(options.body)
      .digest('hex');
    assert.equal(options.headers['x-gramorx-signature'], expectedSignature);

    const parsed = JSON.parse(options.body);
    assert.deepEqual(parsed, {
      userId: 'user-123',
      type: 'task',
      message,
      metadata: { origin: 'unit-test' },
    });
  });
});
