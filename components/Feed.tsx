'use client';
import { useEffect, useState, useOptimistic } from 'react';
import { useInView } from 'react-intersection-observer';
import { supabase } from '@/lib/supabase';
import { PostCard } from './PostCard';

interface FeedProps {
  familyId: string;
  avatarUrl?: string | null;
  displayName?: string | null;
}

export function Feed({ familyId, avatarUrl, displayName }: FeedProps) {
  const [posts, setPosts] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const { ref, inView } = useInView();

  // THE OPTIMISTIC STATE: Prepend temp posts to the real posts array
  const [optimisticPosts, addOptimisticPost] = useOptimistic(
    posts,
    (state, newPost: any) => [newPost, ...state]
  );

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, []);

  const fetchPosts = async () => {
    if (!userId || !familyId) return;
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *, 
        profiles(display_name, avatar_url), 
        likes(count),
        user_like:likes(user_id)
      `)
      .eq('family_id', familyId)
      .eq('likes.user_id', userId) 
      .order('created_at', { ascending: false })
      .range(page * 10, (page + 1) * 10 - 1);
    
    if (!error && data) {
      setPosts((prev) => [...prev, ...data]);
      setPage((prev) => prev + 1);
    }
  };

  useEffect(() => {
    if (inView && userId && familyId) fetchPosts();
  }, [inView, userId, familyId]);

  return (
    <div className="flex flex-col">
      {/* RATIONAL: Always render the combined list. */}
      {optimisticPosts.map((post) => (
        <PostCard key={post.id} post={post} userId={userId} />
      ))}
      <div ref={ref} className="h-24 flex items-center justify-center text-zinc-400 text-sm italic">
        {posts.length > 0 ? "Folk Archive" : "Establishing..."}
      </div>
    </div>
  );
}