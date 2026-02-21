import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from 'lucide-react';
import CommentItem from './CommentItem';
import { toast } from 'sonner';

export default function CommentsSection({ postId, currentUserId }) {
  const [newComment, setNewComment] = useState('');
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => base44.entities.Comment.filter({ post_id: postId }, '-created_date'),
    enabled: !!postId
  });

  const createCommentMutation = useMutation({
    mutationFn: async () => {
      const currentUser = await base44.auth.me();
      const result = await base44.entities.Comment.create({
        post_id: postId,
        author_id: currentUserId,
        author_name: currentUser.full_name,
        author_avatar: currentUser.avatar,
        content: newComment
      });
      return { result, currentUser };
    },
    onSuccess: async ({ result, currentUser }) => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      
      // Update post comments count and notify post author
      const posts = await base44.entities.Post.filter({ id: postId });
      if (posts[0]) {
        await base44.entities.Post.update(postId, {
          comments_count: (posts[0].comments_count || 0) + 1
        });
        // Notify post author
        if (posts[0].author_id && posts[0].author_id !== currentUserId) {
          base44.entities.Notification.create({
            recipient_id: posts[0].author_id,
            sender_id: currentUserId,
            sender_name: currentUser.full_name,
            sender_avatar: currentUser.avatar,
            type: 'comment',
            content_id: postId,
            content_preview: newComment.slice(0, 80)
          }).catch(() => {});
        }
      }
      
      setNewComment('');
      toast.success('Comment posted!');
    },
    onError: (error) => {
      console.error('=== COMMENT ERROR ===', error);
      toast.error('Failed to post comment: ' + (error.message || JSON.stringify(error)));
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newComment.trim()) {
      createCommentMutation.mutate();
    }
  };

  return (
    <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-4">
      {/* Comment Input */}
      {currentUserId && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="flex-1 bg-white border-slate-200 rounded-xl resize-none"
            rows={2}
          />
          <Button 
            type="submit"
            disabled={!newComment.trim() || createCommentMutation.isPending}
            className="self-end bg-gradient-to-r from-violet-500 to-pink-500 rounded-xl"
          >
            {createCommentMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      )}

      {/* Comments List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-4">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" />
          </div>
        ) : comments.length > 0 ? (
          comments.filter(c => !c.parent_comment_id).map(comment => (
            <CommentItem 
              key={comment.id} 
              comment={comment} 
              currentUserId={currentUserId}
              postId={postId}
            />
          ))
        ) : (
          <p className="text-center text-slate-400 py-4 text-sm">
            No comments yet. Be the first to comment!
          </p>
        )}
      </div>
    </div>
  );
}