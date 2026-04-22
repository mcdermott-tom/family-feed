'use client';
import { Heart } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface LikeButtonProps {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
  userId: string | null;
}

export function LikeButton({ postId, initialLiked, initialCount, userId }: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);

  const toggleLike = async () => {
    if (!userId) return;
    
    // Save previous state for rollback
    const wasLiked = liked;
    const prevCount = count;

    // Optimistic Update
    setLiked(!wasLiked);
    setCount(prev => wasLiked ? prev - 1 : prev + 1);

    try {
      if (wasLiked) {
        await supabase.from('likes').delete().match({ post_id: postId, user_id: userId });
      } else {
        await supabase.from('likes').insert({ post_id: postId, user_id: userId });
      }
    } catch (err) {
      // Rollback on failure
      setLiked(wasLiked);
      setCount(prevCount);
      console.error("Sync failed:", err);
    }
  };

  return (
    <button onClick={toggleLike} className="group flex items-center gap-2 transition-transform active:scale-125">
      <Heart 
        className={`transition-colors duration-200 ${liked ? "fill-red-500 text-red-500" : "text-zinc-400 group-hover:text-red-400"}`} 
        size={22} 
      />
      {count > 0 && <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">{count}</span>}
    </button>
  );
}