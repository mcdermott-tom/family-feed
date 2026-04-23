'use client';
import { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Heart, Trash2, MessageCircle, Send, CornerDownRight, X } from 'lucide-react';
import { LikeButton } from './LikeButton';
import { supabase } from '@/lib/supabase';

export function PostCard({ post, userId }: { post: any, userId: string | null }) {
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(display_name, avatar_url), comment_likes(count), user_like:comment_likes(user_id)')
      .eq('post_id', post.id);
    
    if (data) {
      const sorted = data.sort((a: any, b: any) => {
        const aCount = a.comment_likes?.[0]?.count || 0;
        const bCount = b.comment_likes?.[0]?.count || 0;
        if (bCount !== aCount) return bCount - aCount;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
      setComments(sorted);
    }
  }, [post.id]);

  useEffect(() => {
    if (post.id.startsWith('temp-')) return;
    fetchComments();
    const channel = supabase.channel(`comments-${post.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${post.id}` }, () => fetchComments())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comment_likes' }, () => fetchComments())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [post.id, fetchComments]);

  const handleToggleCommentLike = async (commentId: string, hasLiked: boolean) => {
    if (!userId) return;
    if (hasLiked) {
      await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', userId);
    } else {
      await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: userId });
    }
    fetchComments();
  };

  const handleAddComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentText.trim() || !userId) return;
    
    const { error } = await supabase.from('comments').insert({
      post_id: post.id,
      user_id: userId,
      content: commentText.trim(),
      parent_id: replyingTo 
    });

    if (!error) {
      setCommentText("");
      setReplyingTo(null);
      fetchComments(); 
    }
  };

  const getAvatar = (profile: any) => {
    return profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.display_name || 'F')}&background=random&color=fff`;
  };

  const isLikedByMe = post.user_like?.some((l: any) => l.user_id === userId);
  const rootComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId: string) => comments.filter(c => c.parent_id === parentId);

  const likerNames = post.likes?.map((l: any) => l.profiles?.display_name).filter(Boolean) || [];
  const likeDisplay = likerNames.length > 3 
    ? `${likerNames.slice(0, 2).join(', ')} and ${likerNames.length - 2} others`
    : likerNames.join(', ');

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

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-6">
          <LikeButton postId={post.id} initialLiked={isLikedByMe} initialCount={likerNames.length} userId={userId} />
          <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-2 text-zinc-500 hover:text-black dark:hover:text-white transition-colors">
            <MessageCircle size={20} />
            <span className="text-sm font-bold tabular-nums">{comments.length}</span>
          </button>
        </div>
        {likerNames.length > 0 && (
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight px-2">Liked by {likeDisplay}</p>
        )}
      </div>

      {showComments && (
        <div className="mt-6 space-y-6 pt-4 border-t border-zinc-50 dark:border-zinc-900">
          {rootComments.map((c: any) => {
            const hasLikedByMe = c.user_like?.some((l: any) => l.user_id === userId);
            const likeCount = c.comment_likes?.[0]?.count || 0;
            const replies = getReplies(c.id);

            return (
              <div key={c.id} className="space-y-4">
                <div className="flex gap-3 justify-between group items-start">
                  <div className="flex gap-3">
                    <img src={getAvatar(c.profiles)} className="w-6 h-6 rounded-full object-cover" alt="" />
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-tighter">{c.profiles?.display_name}</span>
                      <p className="text-sm text-zinc-800 dark:text-zinc-200">{c.content}</p>
                      <button 
                        onClick={() => { setReplyingTo(c.id); setCommentText(`@${c.profiles?.display_name.split(' ')[0]} `); }}
                        className="text-[10px] font-black text-blue-500 uppercase mt-1 text-left hover:underline"
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleToggleCommentLike(c.id, !!hasLikedByMe)}
                    className={`flex items-center gap-1 p-1 transition-all active:scale-125 ${hasLikedByMe ? 'text-red-500' : 'text-zinc-300 hover:text-zinc-400'}`}
                  >
                    <span className="text-[10px] font-black tabular-nums">{likeCount > 0 ? likeCount : ''}</span>
                    <Heart size={12} className={hasLikedByMe ? 'fill-current' : ''} />
                  </button>
                </div>

                {replies.length > 0 && (
                  <div className="ml-8 space-y-3 border-l-2 border-zinc-50 dark:border-zinc-900 pl-4">
                    {replies.map((reply: any) => {
                        const replyLikedByMe = reply.user_like?.some((l: any) => l.user_id === userId);
                        const replyLikeCount = reply.comment_likes?.[0]?.count || 0;
                        return (
                            <div key={reply.id} className="flex gap-3 justify-between items-start opacity-80 group/reply">
                                <div className="flex gap-2">
                                    <CornerDownRight size={14} className="text-zinc-300 mt-1" />
                                    <img src={getAvatar(reply.profiles)} className="w-5 h-5 rounded-full object-cover" alt="" />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-zinc-500 uppercase">{reply.profiles?.display_name}</span>
                                        <p className="text-xs text-zinc-800 dark:text-zinc-200">{reply.content}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleToggleCommentLike(reply.id, !!replyLikedByMe)}
                                    className={`flex items-center gap-1 p-1 transition-all active:scale-125 ${replyLikedByMe ? 'text-red-500' : 'text-zinc-200 group-hover/reply:text-zinc-400'}`}
                                >
                                    <span className="text-[9px] font-black tabular-nums">{replyLikeCount > 0 ? replyLikeCount : ''}</span>
                                    <Heart size={10} className={replyLikedByMe ? 'fill-current' : ''} />
                                </button>
                            </div>
                        );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          
          <form onSubmit={handleAddComment} className="flex flex-col gap-2 mt-2">
            {replyingTo && (
                <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/10 px-3 py-1 rounded-lg">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">Replying to thread...</span>
                    <button onClick={() => { setReplyingTo(null); setCommentText(""); }} className="text-zinc-400"><X size={12} /></button>
                </div>
            )}
            <div className="flex items-center gap-2">
                <input 
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (e.metaKey || e.ctrlKey) {
                          e.preventDefault();
                          handleAddComment();
                        } else {
                          e.preventDefault(); 
                        }
                      }
                    }}
                    placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
                    className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 p-2 px-4 rounded-xl text-sm outline-none focus:ring-1 ring-blue-500 text-black dark:text-white font-medium"
                />
                <button type="submit" disabled={!commentText.trim()} className="text-blue-500 disabled:opacity-20 active:scale-90 p-2">
                    <Send size={18} />
                </button>
            </div>
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