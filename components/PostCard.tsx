'use client';
import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { X, Heart, Trash2, MessageCircle, Send } from 'lucide-react';
import { LikeButton } from './LikeButton';
import { supabase } from '@/lib/supabase';

export function PostCard({ post, userId }: { post: any, userId: string | null }) {
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  useEffect(() => {
    if (post.id.startsWith('temp-')) return;
    fetchComments();
    const channel = supabase.channel(`comments-${post.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${post.id}` }, () => fetchComments())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [post.id]);

  const fetchComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(display_name, avatar_url)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });
    if (data) setComments(data);
  };

  const handleAddComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    // LOGIC FIX: Fail early if userId is null to avoid DB crash
    if (!commentText.trim() || !userId) {
      console.warn("Comment blocked: Missing Text or UserID");
      return;
    }
    
    const { error } = await supabase.from('comments').insert({
      post_id: post.id,
      user_id: userId,
      content: commentText.trim()
    });

    if (!error) setCommentText("");
    else console.error("Comment failed:", error.message);
  };

  const getAvatar = (profile: any) => {
    return profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.display_name || 'F')}&background=random&color=fff`;
  };

  return (
    <div className={`border-b border-zinc-100 dark:border-zinc-800 p-5 bg-white dark:bg-black text-black dark:text-white ${post.id.startsWith('temp-') ? 'opacity-60' : 'opacity-100'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <img src={getAvatar(post.profiles)} className="w-10 h-10 rounded-full object-cover border border-zinc-100 dark:border-zinc-800" alt="" />
          <div className="flex flex-col">
            <span className="font-bold text-[15px]">{post.profiles?.display_name || 'Folk Member'}</span>
            <span className="text-xs text-zinc-400">
              {post.id.startsWith('temp-') ? 'Uploading...' : `${formatDistanceToNow(new Date(post.created_at))} ago`}
            </span>
          </div>
        </div>
        {userId === post.user_id && !post.id.startsWith('temp-') && (
          <button onClick={() => supabase.from('posts').delete().eq('id', post.id)} className="text-zinc-300 hover:text-red-500 transition-colors p-2">
            <Trash2 size={18} />
          </button>
        )}
      </div>

      <p className="text-[16px] mb-4 leading-relaxed whitespace-pre-wrap">{post.content}</p>

      {post.image_url?.length > 0 && (
        <div className={`grid gap-1 mb-4 rounded-3xl overflow-hidden border border-zinc-100 dark:border-zinc-800 ${post.image_url.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {post.image_url.map((src: string, i: number) => (
            <img key={i} src={src} className="aspect-square w-full h-full object-cover cursor-pointer" onClick={() => setFullscreenImage(src)} alt="" />
          ))}
        </div>
      )}

      <div className="flex items-center gap-6 mt-4">
        <LikeButton postId={post.id} initialLiked={post.user_like?.length > 0} initialCount={post.likes?.[0]?.count || 0} userId={userId} />
        <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-2 text-zinc-500 hover:text-black dark:hover:text-white transition-colors">
          <MessageCircle size={20} />
          <span className="text-sm font-bold tabular-nums">{comments.length}</span>
        </button>
      </div>

      {showComments && (
        <div className="mt-6 space-y-4 pt-4 border-t border-zinc-50 dark:border-zinc-900">
          {comments.map((c: any) => (
            <div key={c.id} className="flex gap-3 justify-between group">
              <div className="flex gap-3">
                <img src={getAvatar(c.profiles)} className="w-6 h-6 rounded-full object-cover" alt="" />
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-tighter">{c.profiles?.display_name}</span>
                  <p className="text-sm text-zinc-800 dark:text-zinc-200">{c.content}</p>
                </div>
              </div>
            </div>
          ))}
          
          <form onSubmit={handleAddComment} className="flex items-center gap-2 mt-2">
            <input 
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                // RATIONAL: Restore Cmd/Ctrl + Enter.
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleAddComment();
                }
              }}
              placeholder="Add a comment..."
              className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 p-2 px-4 rounded-xl text-sm outline-none focus:ring-1 ring-blue-500 text-black dark:text-white"
            />
            <button type="submit" disabled={!commentText.trim()} className="text-blue-500 disabled:opacity-20 active:scale-90 p-2">
                <Send size={18} />
            </button>
          </form>
        </div>
      )}

      {fullscreenImage && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4" onClick={() => setFullscreenImage(null)}>
          <img src={fullscreenImage} alt="" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" />
        </div>
      )}
    </div>
  );
}