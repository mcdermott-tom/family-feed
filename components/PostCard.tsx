'use client';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, X, Heart, Trash2 } from 'lucide-react';
import { LikeButton } from './LikeButton';
import { supabase } from '@/lib/supabase';

export function PostCard({ post, userId }: { post: any, userId: string | null }) {
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  if (!post) return null;

  const handleDelete = async () => {
    if (!confirm("Remove this post permanently?")) return;
    setIsDeleting(true);
    const { error } = await supabase.from('posts').delete().eq('id', post.id);
    if (error) {
        alert("Failed to delete.");
        setIsDeleting(false);
    }
  };

  const images = Array.isArray(post.image_url) ? post.image_url : post.image_url ? post.image_url.split(',') : [];
  const likeCount = post.likes?.[0]?.count || 0;
  const initialLiked = post.user_like && post.user_like.length > 0;

  return (
    <>
      {fullscreenImage && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4" onClick={() => setFullscreenImage(null)}>
          <button className="absolute top-6 right-6 text-white"><X size={32} /></button>
          <img src={fullscreenImage} alt="" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" />
        </div>
      )}

      <div className={`border-b border-zinc-100 dark:border-zinc-800 p-5 bg-white dark:bg-black text-black dark:text-white ${post.is_optimistic || isDeleting ? 'opacity-40' : ''}`}>
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                    {post.profiles?.avatar_url ? (
                        <img src={post.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-zinc-400">
                            {post.profiles?.display_name?.charAt(0) || 'F'}
                        </div>
                    )}
                </div>
                <div className="flex flex-col">
                    <span className="font-bold text-[15px] flex items-center gap-2">
                    {post.profiles?.display_name || 'Folk Member'}
                    {post.is_optimistic && <Loader2 size={12} className="animate-spin text-blue-500" />}
                    </span>
                    <span className="text-xs text-zinc-400 font-medium">
                    {post.is_optimistic ? "Uploading..." : `${formatDistanceToNow(new Date(post.created_at))} ago`}
                    </span>
                </div>
            </div>
            
            {/* RATIONAL: Only show delete to the owner */}
            {userId === post.user_id && !post.is_optimistic && (
                <button 
                    onClick={handleDelete}
                    className="p-2 text-zinc-300 hover:text-red-500 transition-colors"
                >
                    <Trash2 size={18} />
                </button>
            )}
        </div>
        
        <p className="text-[16px] mb-4 leading-relaxed whitespace-pre-wrap">{post.content}</p>

        {images.length > 0 && (
          <div className={`grid gap-1 mb-4 rounded-3xl overflow-hidden border border-zinc-100 dark:border-zinc-800 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {images.map((src: string, i: number) => (
              <div key={i} className="relative aspect-square bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
                <img 
                  src={src} 
                  alt="" 
                  onClick={() => !post.is_optimistic && setFullscreenImage(src)}
                  className={`w-full h-full object-cover ${!post.is_optimistic ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`} 
                />
              </div>
            ))}
          </div>
        )}

        <div className="mt-2">
          {!post.is_optimistic && (
             <LikeButton postId={post.id} initialLiked={initialLiked} initialCount={likeCount} userId={userId} />
          )}
        </div>
      </div>
    </>
  );
}