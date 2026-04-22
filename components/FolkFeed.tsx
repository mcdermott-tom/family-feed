'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PostCard } from './PostCard';
import { UploadModal } from './UploadModal';

export function FolkFeed({ familyId, profile }: { familyId: string, profile: any }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('posts')
      .select(`*, profiles(display_name, avatar_url), likes(count), user_like:likes(user_id)`)
      .eq('family_id', familyId)
      .order('created_at', { ascending: false });
    
    if (data) setPosts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();

    // RATIONAL: Real-time subscription ensures the feed updates instantly
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'posts', filter: `family_id=eq.${familyId}` }, 
        () => fetchPosts() // Re-fetch or manually prepend for speed
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'posts' },
        (payload) => setPosts(current => current.filter(p => p.id !== payload.old.id))
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [familyId]);

  const addOptimistic = (newPost: any) => {
    setPosts(current => [newPost, ...current]);
  };

  if (loading) return <div className="p-10 text-center text-zinc-400 animate-pulse uppercase text-xs font-bold tracking-widest">Gathering the archive...</div>;

  return (
    <div>
      <UploadModal familyId={familyId} profile={profile} addOptimistic={addOptimistic} />
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