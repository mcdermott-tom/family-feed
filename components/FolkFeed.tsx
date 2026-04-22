'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { PostCard } from './PostCard';
import { UploadModal } from './UploadModal';

export function FolkFeed({ familyId, profile }: { familyId: string, profile: any }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // RATIONAL: useCallback ensures this function can be passed to children 
  // without triggering unnecessary re-renders.
  const fetchPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from('posts')
      .select(`*, profiles(display_name, avatar_url), likes(count), user_like:likes(user_id)`)
      .eq('family_id', familyId)
      .order('created_at', { ascending: false });
    
    if (error) console.error("Fetch error:", error.message);
    if (data) setPosts(data);
    setLoading(false);
  }, [familyId]);

  useEffect(() => {
    fetchPosts();

    // RATIONAL: Listen for any changes to the posts table for this family
    const channel = supabase
      .channel(`room-${familyId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'posts', filter: `family_id=eq.${familyId}` }, 
        () => fetchPosts()
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'posts' },
        (payload) => setPosts(current => current.filter(p => p.id !== payload.old.id))
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [familyId, fetchPosts]);

  const addOptimistic = (newPost: any) => {
    setPosts(current => [{
      ...newPost,
      profiles: {
        display_name: profile.display_name,
        avatar_url: profile.avatar_url
      },
      likes: [{ count: 0 }],
      user_like: []
    }, ...current]);
  };

  if (loading) return (
    <div className="p-10 text-center text-zinc-400 animate-pulse uppercase text-[10px] font-black tracking-[0.3em]">
      Gathering the archive...
    </div>
  );

  return (
    <div>
      <UploadModal 
        familyId={familyId} 
        profile={profile} 
        addOptimistic={addOptimistic} 
        onSuccess={fetchPosts} // Pass the refresh trigger
      />
      <div className="flex flex-col">
        {posts.length > 0 ? (
          posts.map(post => (
            <PostCard key={post.id} post={post} userId={profile.id} />
          ))
        ) : (
          <div className="p-20 text-center text-zinc-400 text-sm italic">
            No history yet. Start the thread above.
          </div>
        )}
      </div>
    </div>
  );
}