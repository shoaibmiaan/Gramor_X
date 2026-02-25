import React, { useMemo, useState } from 'react';
import clsx from 'clsx';

import { Button } from '@/components/design-system/Button';
import type { ReviewComment as ReviewCommentItem } from '@/types/review-comments';
import styles from './ReviewComments.module.css';

export type SubmitReviewComment = {
  message: string;
  parentId?: string | null;
  name?: string;
};

type ReviewCommentsProps = {
  comments: ReviewCommentItem[];
  onSubmit: (payload: SubmitReviewComment) => Promise<void> | void;
  submitting?: boolean;
  error?: string | null;
  canComment?: boolean;
  initialAuthorName?: string;
};

type ReviewCommentNode = ReviewCommentItem & { replies: ReviewCommentNode[] };

function toTree(comments: ReviewCommentItem[]): ReviewCommentNode[] {
  const map = new Map<string, ReviewCommentNode>();
  const roots: ReviewCommentNode[] = [];

  comments.forEach((comment) => {
    map.set(comment.id, { ...comment, replies: [] });
  });

  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortNodes = (list: ReviewCommentNode[]) => {
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    list.forEach((child) => sortNodes(child.replies));
  };
  sortNodes(roots);

  return roots;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  try {
    return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return date.toLocaleString();
  }
}

export function ReviewComments({
  comments,
  onSubmit,
  submitting = false,
  error,
  canComment = true,
  initialAuthorName = '',
}: ReviewCommentsProps) {
  const [message, setMessage] = useState('');
  const [name, setName] = useState(initialAuthorName);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const tree = useMemo(() => toTree(comments), [comments]);

  const activeError = error ?? localError;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canComment) return;
    setLocalError(null);
    setSuccessMessage(null);

    const trimmed = message.trim();
    if (!trimmed) {
      setLocalError('Please write a comment before submitting.');
      return;
    }
    if (trimmed.length > 2000) {
      setLocalError('Comments must be under 2000 characters.');
      return;
    }

    try {
      await onSubmit({
        message: trimmed,
        parentId: replyTo ?? null,
        name: name.trim() ? name.trim() : undefined,
      });
      setMessage('');
      setSuccessMessage(replyTo ? 'Reply posted.' : 'Comment posted.');
      setReplyTo(null);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Could not post comment.');
    }
  }

  function startReply(id: string) {
    setReplyTo(id);
    setSuccessMessage(null);
    setLocalError(null);
  }

  function cancelReply() {
    setReplyTo(null);
  }

  return (
    <section aria-labelledby="review-comments-heading" className="space-y-6">
      <div className="space-y-1">
        <h2 id="review-comments-heading" className="text-h4 font-semibold text-foreground">
          Discussion
        </h2>
        <p className="text-small text-muted-foreground">
          Share feedback and ask questions about this attempt.
        </p>
      </div>

      <div className="space-y-5" aria-live="polite">
        {tree.length === 0 ? (
          <p className="rounded-xl border border-border bg-background/40 p-4 text-small text-muted-foreground">
            No comments yet. Be the first to start the discussion.
          </p>
        ) : (
          <ol className="space-y-4" aria-label="Comment thread">
            {tree.map((comment) => (
              <CommentNode
                key={comment.id}
                node={comment}
                canReply={canComment}
                onReply={startReply}
                activeReplyId={replyTo}
              />
            ))}
          </ol>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" aria-label="Add comment">
        <div className="flex flex-col gap-2">
          <label htmlFor="review-comment-name" className="text-small font-medium text-foreground">
            Name (optional)
          </label>
          <input
            id="review-comment-name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value.slice(0, 80))}
            placeholder="e.g., Coach Sara"
            autoComplete="name"
            disabled={!canComment}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-body text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="review-comment-message" className="text-small font-medium text-foreground">
            Comment
          </label>
          <textarea
            id="review-comment-message"
            name="message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Offer specific, actionable feedback."
            required
            rows={4}
            aria-required="true"
            aria-invalid={activeError ? 'true' : 'false'}
            aria-describedby={activeError ? 'review-comment-error' : undefined}
            disabled={!canComment}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-body text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
        </div>

        {replyTo && (
          <div className="flex flex-wrap items-center gap-3 text-small text-muted-foreground">
            <span>Replying to a comment.</span>
            <Button type="button" variant="secondary" size="sm" onClick={cancelReply} className="rounded-ds">
              Cancel reply
            </Button>
          </div>
        )}

        {(activeError || successMessage) && (
          <p
            id="review-comment-error"
            role={activeError ? 'alert' : undefined}
            className={clsx('text-small', activeError ? 'text-danger' : 'text-success')}
          >
            {activeError ?? successMessage}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            variant="primary"
            disabled={submitting || !canComment}
            className="rounded-ds"
          >
            {submitting ? 'Posting…' : replyTo ? 'Post reply' : 'Post comment'}
          </Button>
          {!canComment && (
            <span className="text-small text-muted-foreground">Comments are disabled for this attempt.</span>
          )}
        </div>
      </form>
    </section>
  );
}

type CommentNodeProps = {
  node: ReviewCommentNode;
  canReply: boolean;
  onReply: (id: string) => void;
  activeReplyId: string | null;
};

function CommentNode({ node, canReply, onReply, activeReplyId }: CommentNodeProps) {
  const name = node.authorName?.trim() || 'Reviewer';
  const role = node.authorRole?.trim();
  const timestamp = formatDate(node.createdAt);

  return (
    <li className="rounded-xl border border-border bg-background/60 p-4 shadow-sm" aria-live="polite">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{name}</p>
          {role && <p className="text-xs uppercase tracking-wide text-muted-foreground">{role}</p>}
        </div>
        <time className="text-xs text-muted-foreground" dateTime={new Date(node.createdAt).toISOString()}>
          {timestamp}
        </time>
      </header>

      <p className="mt-3 whitespace-pre-wrap text-body leading-relaxed text-foreground">{node.body}</p>

      {canReply && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onReply(node.id)}
          className={clsx('mt-3 rounded-ds px-3 py-1 text-small', {
            'bg-primary/10 text-primary': activeReplyId === node.id,
          })}
          aria-pressed={activeReplyId === node.id}
        >
          Reply
        </Button>
      )}

        {node.replies.length > 0 && (
          <ol className={clsx('mt-4 space-y-3', styles.replies)} aria-label="Replies">
          {node.replies.map((child) => (
            <CommentNode
              key={child.id}
              node={child}
              canReply={canReply}
              onReply={onReply}
              activeReplyId={activeReplyId}
            />
          ))}
        </ol>
      )}
    </li>
  );
}

export default ReviewComments;
