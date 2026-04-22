'use client';
import { useState, useOptimistic, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { UploadModal } from './UploadModal';
import { PostCard } from './PostCard';
import { useInView } from 'react-intersection-observer';

export function FolkFeed({ familyId, profile }: { familyId: string, profile: any }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const { ref, inView } = useInView();

  // Optimistic logic: Merges real posts with temporary ones instantly
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
  
  // RATIONAL: Remove the .eq('likes.user_id') filter. 
  // We want ALL posts in the family, regardless of if you liked them.
  const { data, error } = await supabase
    .from('posts')
    .select(`
      *, 
      profiles(display_name, avatar_url), 
      likes(count),
      user_like:likes(user_id)
    `)
    .eq('family_id', familyId)
    .order('created_at', { ascending: false })
    .range(page * 10, (page + 1) * 10 - 1);
  
  if (error) {
    console.error("Fetch error:", error);
    return;
  }

  if (data) {
    setPosts((prev) => [...prev, ...data]);
    setPage((prev) => prev + 1);
  }
};

  useEffect(() => {
    if (inView && userId) fetchPosts();
  }, [inView, userId]);

  return (
    <>
      <UploadModal 
        familyId={familyId} 
        addOptimistic={addOptimisticPost} 
        profile={profile} 
      />
      <div className="flex flex-col">
        {optimisticPosts.map((post) => (
          <PostCard key={post.id} post={post} userId={userId} />
        ))}
        <div ref={ref} className="h-24 flex items-center justify-center text-zinc-400 text-sm italic">
          {posts.length > 0 ? "Folk Archive" : "Post something to start the feed..."}
        </div>
      </div>
    </>
  );
}