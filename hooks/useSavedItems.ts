// hooks/useSavedItems.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import type { SavedItem } from '@/types/dashboard';

async function fetchSavedItems(userId: string): Promise<SavedItem[]> {
  const { data, error } = await supabase
    .from('saved_items')
    .select(`
      *,
      tags:saved_item_tags(tag)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Transform tags array into string[]
  return (data || []).map(item => ({
    ...item,
    tags: item.tags?.map((t: { tag: string }) => t.tag) || [],
  }));
}

async function addTag(itemId: string, tag: string): Promise<void> {
  const { error } = await supabase
    .from('saved_item_tags')
    .insert({ item_id: itemId, tag });
  if (error) throw error;
}

async function removeTag(itemId: string, tag: string): Promise<void> {
  const { error } = await supabase
    .from('saved_item_tags')
    .delete()
    .eq('item_id', itemId)
    .eq('tag', tag);
  if (error) throw error;
}

export function useSavedItems(userId: string | null) {
  const queryClient = useQueryClient();

  const savedItemsQuery = useQuery({
    queryKey: ['saved-items', userId],
    queryFn: () => fetchSavedItems(userId!),
    enabled: !!userId,
  });

  const addTagMutation = useMutation({
    mutationFn: ({ itemId, tag }: { itemId: string; tag: string }) => addTag(itemId, tag),
    onSuccess: (_, { itemId, tag }) => {
      queryClient.setQueryData(['saved-items', userId], (old: SavedItem[] | undefined) => {
        if (!old) return old;
        return old.map(item =>
          item.id === itemId
            ? { ...item, tags: [...(item.tags || []), tag] }
            : item
        );
      });
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: ({ itemId, tag }: { itemId: string; tag: string }) => removeTag(itemId, tag),
    onSuccess: (_, { itemId, tag }) => {
      queryClient.setQueryData(['saved-items', userId], (old: SavedItem[] | undefined) => {
        if (!old) return old;
        return old.map(item =>
          item.id === itemId
            ? { ...item, tags: (item.tags || []).filter(t => t !== tag) }
            : item
        );
      });
    },
  });

  return {
    items: savedItemsQuery.data || [],
    isLoading: savedItemsQuery.isLoading,
    error: savedItemsQuery.error,
    addTag: addTagMutation.mutate,
    removeTag: removeTagMutation.mutate,
  };
}