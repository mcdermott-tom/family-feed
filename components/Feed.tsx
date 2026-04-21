'use client';
import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { supabase } from '@/lib/supabase';
import { PostCard } from './PostCard';

export function Feed() {
  const [posts, setPosts] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const { ref, inView } = useInView();

  const fetchPosts = async () => {
    // UPDATED: Added likes(count) to the select string
    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles(display_name), likes(count)')
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
    if (inView) fetchPosts();
  }, [inView]);

  return (
    <div className="flex flex-col">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      <div ref={ref} className="h-20 flex items-center justify-center text-zinc-500 text-sm font-medium">
        {posts.length > 0 ? "Loading more..." : "No posts found. Add one above!"}
      </div>
    </div>
  );
}