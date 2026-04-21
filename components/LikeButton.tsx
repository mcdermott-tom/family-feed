'use client';
import { Heart } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export function LikeButton({ 
  postId, 
  initialLiked, 
  userId 
}: { 
  postId: string, 
  initialLiked: boolean, 
  userId: string | null 
}) {
  const [liked, setLiked] = useState(initialLiked);

  const toggleLike = async () => {
    const previouslyLiked = liked;
    setLiked(!previouslyLiked); 

    try {
      if (previouslyLiked) {
        // Remove our specific like
        await supabase
          .from('likes')
          .delete()
          .match({ post_id: postId, user_id: userId });
      } else {
        // Add our specific like
        await supabase
          .from('likes')
          .insert({ post_id: postId, user_id: userId });
      }
    } catch (err) {
      setLiked(previouslyLiked);
      console.error("Like operation failed:", err);
    }
  };

  return (
    <button 
      onClick={toggleLike} 
      className="group flex items-center gap-1 transition-transform active:scale-125"
    >
      <Heart 
        className={`transition-colors ${liked ? "fill-red-500 text-red-500" : "text-zinc-400 group-hover:text-zinc-600"}`} 
        size={20} 
      />
    </button>
  );
}