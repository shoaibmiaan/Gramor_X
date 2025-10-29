import { useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Input } from '@/components/design-system/Input';
import { Textarea } from '@/components/design-system/Textarea';
import { Button } from '@/components/design-system/Button';
import { useToast } from '@/components/design-system/Toaster';
import { Section } from '@/components/design-system/Section';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { useUserContext } from '@/context/UserContext';

interface Review {
  id: number;
  content: string;
  created_at: string;
  comments: { id: number; content: string }[];
}

export default function PeerReviewPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReview, setNewReview] = useState('');
  const [comment, setComment] = useState<Record<number, string>>({});
  const { error: toastError, success: toastSuccess } = useToast();
  const { user, loading: userLoading } = useUserContext();
  const isLoggedIn = useMemo(() => Boolean(user?.id), [user?.id]);

  useEffect(() => {
    fetchReviews();
  }, []);

  async function fetchReviews() {
    const { data } = await supabase
      .from('peer_reviews')
      .select('id, content, created_at, comments:peer_review_comments(id, content)')
      .order('created_at', { ascending: false })
      .returns<Review[]>();
    setReviews(data ?? []);
  }

  async function submitReview() {
    const content = newReview.trim();
    if (!content) return;

    if (!isLoggedIn) {
      return toastError('Please sign in to share a review.');
    }

    const { error } = await supabase.from('peer_reviews').insert({ content });
    if (error) return toastError('Could not submit review');
    setNewReview('');
    toastSuccess('Review shared');
    fetchReviews();
  }

  async function submitComment(reviewId: number) {
    const text = comment[reviewId]?.trim();
    if (!text) return;

    if (!isLoggedIn) {
      return toastError('Please sign in to comment.');
    }

    await supabase.from('peer_review_comments').insert({ review_id: reviewId, content: text });
    setComment((c) => ({ ...c, [reviewId]: '' }));
    fetchReviews();
  }

  return (
    <Section>
      <Container>
        <Card className="p-6 mb-6 space-y-2">
          <Textarea value={newReview} onChange={(e) => setNewReview(e.target.value)} placeholder="Share your work for review" />
          <Button
            onClick={submitReview}
            fullWidth
            className="px-4 py-3 text-body"
            disabled={!newReview.trim() || userLoading}
          >
            Share
          </Button>
        </Card>
        {reviews.map((r) => (
          <Card key={r.id} className="p-4 mb-4 space-y-2">
            <p className="whitespace-pre-wrap">{r.content}</p>
            <div className="space-y-1">
              {r.comments?.map((c) => (
                <div key={c.id} className="text-small text-muted-foreground">{c.content}</div>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={comment[r.id] || ''}
                onChange={(e) => setComment({ ...comment, [r.id]: e.target.value })}
                placeholder="Add a comment"
              />
              <Button
                onClick={() => submitComment(r.id)}
                fullWidth
                className="px-4 py-3 text-body sm:w-auto"
                disabled={!comment[r.id]?.trim() || userLoading}
              >
                Comment
              </Button>
            </div>
          </Card>
        ))}
      </Container>
    </Section>
  );
}
