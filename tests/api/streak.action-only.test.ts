/**
 * @vitest-environment node
 */
import httpMocks from 'node-mocks-http';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUserStreakMock = vi.fn();
const completeTodayMock = vi.fn();

vi.mock('@/lib/streak', async () => {
  const actual = await vi.importActual<any>('@/lib/streak');
  return {
    ...actual,
    getUserStreak: getUserStreakMock,
    completeToday: completeTodayMock,
  };
});

const supabaseStub = {
  auth: {
    getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })),
  },
};

vi.mock('@/lib/supabaseServer', () => ({
  createSupabaseServerClient: vi.fn(() => supabaseStub),
}));

import handler from '@/pages/api/streak';

describe('/api/streak action-only behavior', () => {
  beforeEach(() => {
    getUserStreakMock.mockReset();
    completeTodayMock.mockReset();
    getUserStreakMock.mockResolvedValue({ current_streak: 3 });
    completeTodayMock.mockResolvedValue({ current_streak: 4 });
  });

  it('does not increment streak without activityType', async () => {
    const req = httpMocks.createRequest({ method: 'POST', body: {} });
    const res = httpMocks.createResponse();

    await handler(req as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(completeTodayMock).not.toHaveBeenCalled();
    expect(getUserStreakMock).toHaveBeenCalled();
  });

  it('increments streak for actionable activityType', async () => {
    const req = httpMocks.createRequest({
      method: 'POST',
      body: { activityType: 'writing', metadata: { attemptId: 'a-1' } },
    });
    const res = httpMocks.createResponse();

    await handler(req as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(completeTodayMock).toHaveBeenCalledWith(supabaseStub, 'user-1', 'writing', { attemptId: 'a-1' });
  });

  it('ignores non-actionable activityType', async () => {
    const req = httpMocks.createRequest({ method: 'POST', body: { activityType: 'dashboard' } });
    const res = httpMocks.createResponse();

    await handler(req as any, res as any);

    expect(res.statusCode).toBe(200);
    expect(completeTodayMock).not.toHaveBeenCalled();
    expect(getUserStreakMock).toHaveBeenCalled();
  });
});
