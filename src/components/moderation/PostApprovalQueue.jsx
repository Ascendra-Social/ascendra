import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Clock, Eye } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDistanceToNow } from 'date-fns';

export default function PostApprovalQueue({ community, user }) {
  const [selectedPost, setSelectedPost] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const queryClient = useQueryClient();

  const { data: pendingPosts, isLoading } = useQuery({
    queryKey: ['pending-posts', community.id],
    queryFn: () => base44.entities.Post.filter({ community_id: community.id, approval_status: 'pending' }, '-created_date', 50)
  });

  const approveMutation = useMutation({
    mutationFn: async (postId) => {
      await base44.entities.Post.update(postId, { approval_status: 'approved' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-posts', community.id] });
      queryClient.invalidateQueries({ queryKey: ['community-posts', community.id] });
      setSelectedPost(null);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (postId) => {
      await base44.entities.Post.update(postId, { approval_status: 'rejected' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-posts', community.id] });
      setSelectedPost(null);
      setRejectionReason('');
    }
  });

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;

  if (!pendingPosts?.length) {
    return (
      <div className="text-center py-16 bg-slate-800/30 rounded-2xl border border-slate-700">
        <Check className="w-16 h-16 mx-auto text-green-400 mb-4" />
        <h3 className="text-lg font-semibold text-white mb-1">All caught up!</h3>
        <p className="text-slate-400">No posts waiting for approval</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-semibold text-slate-300">{pendingPosts.length} post{pendingPosts.length !== 1 ? 's' : ''} awaiting approval</span>
      </div>

      {pendingPosts.map(post => (
        <Card key={post.id} className="bg-slate-800/50 border-slate-700 rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-start gap-3 mb-3">
              <Avatar className="w-9 h-9">
                <AvatarImage src={post.author_avatar} />
                <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-purple-400 text-white text-sm">{post.author_name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm">{post.author_name}</p>
                <p className="text-xs text-slate-400">{formatDistanceToNow(new Date(post.created_date), { addSuffix: true })}</p>
              </div>
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">Pending</Badge>
            </div>

            <p className="text-slate-300 text-sm mb-3 line-clamp-3">{post.content}</p>

            {post.media_url && (
              <div className="mb-3 rounded-xl overflow-hidden max-h-40">
                {post.media_type === 'video' ? (
                  <video src={post.media_url} className="w-full h-40 object-cover" />
                ) : (
                  <img src={post.media_url} alt="" className="w-full h-40 object-cover" />
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => approveMutation.mutate(post.id)}
                disabled={approveMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl gap-2"
              >
                <Check className="w-4 h-4" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedPost(post)}
                className="flex-1 border-red-500/40 text-red-400 hover:bg-red-500/10 rounded-xl gap-2"
              >
                <X className="w-4 h-4" />
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Reject dialog */}
      <Dialog open={!!selectedPost} onOpenChange={() => { setSelectedPost(null); setRejectionReason(''); }}>
        <DialogContent className="bg-slate-900 border-slate-700 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-white">Reject Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-slate-400 text-sm">Optionally add a reason. The post will be removed from the queue.</p>
            <Textarea
              placeholder="Reason for rejection (optional)..."
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white rounded-xl resize-none"
              rows={3}
            />
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setSelectedPost(null)} className="flex-1 border-slate-600 text-slate-300 rounded-xl">
                Cancel
              </Button>
              <Button
                onClick={() => rejectMutation.mutate(selectedPost.id)}
                disabled={rejectMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl"
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}