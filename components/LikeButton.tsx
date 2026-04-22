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
    
    const wasLiked = liked;
    const prevCount = count;

    setLiked(!wasLiked);
    setCount(prev => wasLiked ? prev - 1 : prev + 1);

    try {
      if (wasLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({ post_id: postId, user_id: userId });
        if (error) throw error;
      }
    } catch (err) {
      setLiked(wasLiked);
      setCount(prevCount);
      console.error("Like sync failed:", err);
    }
  };

  return (
    <button onClick={toggleLike} className="group flex items-center gap-2 transition-transform active:scale-125 p-2">
      <Heart 
        className={`transition-colors duration-200 ${liked ? "fill-red-500 text-red-500" : "text-zinc-400 group-hover:text-red-400"}`} 
        size={22} 
      />
      {count > 0 && <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">{count}</span>}
    </button>
  );
}