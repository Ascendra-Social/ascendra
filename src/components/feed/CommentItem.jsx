import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Heart, Coins, Loader2, CornerDownRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function CommentItem({ comment, currentUserId, postId, onReply }) {
  const [isLiked, setIsLiked] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replies, setReplies] = useState([]);
  const [showReplies, setShowReplies] = useState(false);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [tipAmount, setTipAmount] = useState('');
  const [tipMessage, setTipMessage] = useState('');
  const queryClient = useQueryClient();

  const loadReplies = async () => {
    setRepliesLoading(true);
    const data = await base44.entities.Comment.filter({ post_id: postId, parent_comment_id: comment.id }, 'created_date', 20);
    setReplies(data);
    setRepliesLoading(false);
    setShowReplies(true);
  };

  const submitReply = async () => {
    if (!replyText.trim()) return;
    const currentUser = await base44.auth.me().catch(() => null);
    if (!currentUser) return;
    const reply = await base44.entities.Comment.create({
      post_id: postId,
      parent_comment_id: comment.id,
      author_id: currentUser.id,
      author_name: currentUser.full_name || 'User',
      author_avatar: currentUser.avatar || '',
      content: replyText.trim()
    });
    setReplies(prev => [...prev, reply]);
    setReplyText('');
    setShowReplyInput(false);
    setShowReplies(true);
  };

  const { data: wallet } = useQuery({
    queryKey: ['wallet', currentUserId],
    queryFn: async () => {
      const wallets = await base44.entities.TokenWallet.filter({ user_id: currentUserId });
      return wallets[0];
    },
    enabled: !!currentUserId && showTipModal
  });

  const tipMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(tipAmount);
      
      if (amount > (wallet?.balance || 0)) {
        throw new Error('Insufficient balance');
      }

      if (amount < 1) {
        throw new Error('Minimum tip is 1 $ASC');
      }

      // Create tip record
      await base44.entities.Tip.create({
        tipper_id: currentUserId,
        tipper_name: (await base44.auth.me()).full_name,
        recipient_id: comment.author_id,
        amount: amount,
        message: tipMessage || ''
      });

      // Deduct from tipper wallet
      await base44.entities.TokenWallet.update(wallet.id, {
        balance: (wallet.balance || 0) - amount
      });

      // Add to creator wallet
      const recipientWallets = await base44.entities.TokenWallet.filter({ user_id: comment.author_id });
      if (recipientWallets[0]) {
        await base44.entities.TokenWallet.update(recipientWallets[0].id, {
          balance: (recipientWallets[0].balance || 0) + amount,
          lifetime_earnings: (recipientWallets[0].lifetime_earnings || 0) + amount
        });
      }

      // Record transactions
      await base44.entities.TokenTransaction.create({
        user_id: currentUserId,
        type: 'spending',
        amount: -amount,
        description: `Tip to ${comment.author_name}`
      });

      await base44.entities.TokenTransaction.create({
        user_id: comment.author_id,
        type: 'earning',
        amount: amount,
        description: `Tip from supporter`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast.success('Tip sent!');
      setShowTipModal(false);
      setTipAmount('');
      setTipMessage('');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to send tip');
    }
  });

  return (
    <>
      <div className="flex gap-3 py-3">
        <Avatar className="w-8 h-8">
          <AvatarImage src={comment.author_avatar} />
          <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-purple-400 text-white text-xs">
            {comment.author_name?.[0] || 'U'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="bg-slate-800/50 rounded-2xl px-4 py-2 border border-cyan-500/20">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-white text-sm">{comment.author_name}</span>
              <span className="text-xs text-slate-400">
                {comment.created_date && formatDistanceToNow(new Date(comment.created_date), { addSuffix: true })}
              </span>
            </div>
            <p className="text-slate-300 text-sm">{comment.content}</p>
          </div>

          <div className="flex items-center gap-3 mt-2 ml-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsLiked(!isLiked)}
              className={`h-7 px-2 ${isLiked ? 'text-rose-400' : 'text-slate-400'}`}
            >
              <Heart className={`w-3 h-3 mr-1 ${isLiked ? 'fill-rose-400' : ''}`} />
              <span className="text-xs">Like</span>
            </Button>

            {currentUserId && currentUserId !== comment.author_id && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTipModal(true)}
                className="h-7 px-2 text-slate-400 hover:text-cyan-400"
              >
                <Coins className="w-3 h-3 mr-1" />
                <span className="text-xs">Tip</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tip Modal */}
      <Dialog open={showTipModal} onOpenChange={setShowTipModal}>
        <DialogContent className="bg-slate-800 border-cyan-500/20">
          <DialogHeader>
            <DialogTitle className="text-white">Send a Tip to {comment.author_name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-slate-900/50 rounded-lg border border-cyan-500/20">
              <p className="text-xs text-slate-400 mb-1">Recipient Wallet</p>
              <p className="text-sm text-slate-200 font-mono break-all">
                {comment.author_id}
              </p>
            </div>

            <div>
              <label className="text-sm text-slate-300 mb-2 block">
                Amount ($ASC)
              </label>
              <Input
                type="number"
                min="1"
                placeholder="Enter amount"
                value={tipAmount}
                onChange={(e) => setTipAmount(e.target.value)}
                className="bg-slate-900/50 border-cyan-500/20 text-white"
              />
              {wallet && (
                <p className="text-xs text-slate-400 mt-1">
                  Available: {wallet.balance} $ASC
                </p>
              )}
            </div>

            <div>
              <label className="text-sm text-slate-300 mb-2 block">
                Message (optional)
              </label>
              <Textarea
                placeholder="Add a supportive message..."
                value={tipMessage}
                onChange={(e) => setTipMessage(e.target.value)}
                className="bg-slate-900/50 border-cyan-500/20 text-white"
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => tipMutation.mutate()}
                disabled={tipMutation.isPending || !tipAmount}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500"
              >
                {tipMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Coins className="w-4 h-4 mr-2" />
                    Send Tip
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowTipModal(false)}
                className="border-cyan-500/20"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}