export type ReviewComment = {
  id: string;
  attemptId?: string;
  parentId: string | null;
  authorId?: string | null;
  authorName: string | null;
  authorRole: string | null;
  body: string;
  createdAt: string;
  updatedAt?: string | null;
};

export type ReviewCommentPayload = {
  message: string;
  parentId?: string | null;
  name?: string;
};

export type ReviewAttemptSummary = {
  id: string;
  examType: 'reading' | 'listening' | 'writing' | 'speaking';
  status: string;
  startedAt: string;
  submittedAt: string | null;
  goalBand: number | null;
};
