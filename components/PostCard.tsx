'use client';
import { formatDistanceToNow } from 'date-fns';
import { LikeButton } from './LikeButton';

export function PostCard({ post, userId }: { post: any, userId: string | null }) {
  if (!post) return null;

  const images = Array.isArray(post.image_url) 
    ? post.image_url 
    : post.image_url ? post.image_url.split(',') : [];

  const likeCount = post.likes?.[0]?.count || 0;
  
  // If the user_like array has items, it means the current user has liked it
  const initialLiked = post.user_like && post.user_like.length > 0;

  return (
    <div className="border-b border-zinc-100 dark:border-zinc-800 p-5 bg-white dark:bg-black text-black dark:text-white">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800" />
        <div className="flex flex-col">
          <span className="font-bold text-[15px] leading-tight">
            {post.profiles?.display_name || 'Family Member'}
          </span>
          <span className="text-xs text-zinc-500">
            {post.created_at ? formatDistanceToNow(new Date(post.created_at)) : 'Just now'} ago
          </span>
        </div>
      </div>
      
      <p className="text-[15px] mb-4 leading-normal whitespace-pre-wrap">{post.content}</p>

      {images.length > 0 && (
        <div className={`grid gap-1 mb-4 rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 ${
          images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
        }`}>
          {images.map((src: string, i: number) => (
            <img 
              key={i} 
              src={src} 
              alt="Post content" 
              className={`w-full object-cover ${images.length === 3 && i === 0 ? 'row-span-2 h-full' : 'aspect-square'}`} 
            />
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center gap-2">
        <LikeButton 
          postId={post.id} 
          initialLiked={initialLiked} 
          userId={userId} 
        />
        {likeCount > 0 && (
          <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            {likeCount}
          </span>
        )}
      </div>
    </div>
  );
}