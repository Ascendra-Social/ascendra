import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Coins, Heart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function TipButton({ post, currentUserId, className }) {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const queryClient = useQueryClient();

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ['wallet', currentUserId],
    queryFn: async () => {
      // Filter for Ascendra Social token wallets only
      const wallets = await base44.entities.TokenWallet.filter({ 
        user_id: currentUserId,
        token_contract_address: 'ASC_MAINNET_V1'
      });
      // Return the wallet with the highest balance
      if (wallets.length === 0) return null;
      return wallets.reduce((max, w) => (w.balance > max.balance ? w : max), wallets[0]);
    },
    enabled: !!currentUserId && isOpen,
    retry: false
  });

  const tipMutation = useMutation({
    mutationFn: async () => {
      const tipAmount = parseFloat(amount);
      
      console.log('Starting tip mutation', { tipAmount, wallet, currentUserId, recipientId: post.author_id });
      
      if (!wallet) {
        throw new Error('Wallet not loaded');
      }

      if (tipAmount > (wallet?.balance || 0)) {
        throw new Error('Insufficient balance');
      }

      if (tipAmount < 1) {
        throw new Error('Minimum tip is 1 $ASC');
      }

      const currentUser = await base44.auth.me();

      // Create tip record
      await base44.entities.Tip.create({
        tipper_id: currentUserId,
        tipper_name: currentUser.full_name,
        recipient_id: post.author_id,
        post_id: post.id,
        amount: tipAmount,
        message: message || ''
      });

      // Update tipper wallet via auth.updateMe (since RLS may block direct updates)
      // Note: This won't work for TokenWallet - need service role or proper RLS
      console.log('Updating tipper wallet', wallet.id);

      // Deduct from tipper wallet
      await base44.entities.TokenWallet.update(wallet.id, {
        balance: (wallet.balance || 0) - tipAmount
      });

      // Add to creator wallet
      const creatorWallets = await base44.entities.TokenWallet.filter({ user_id: post.author_id });
      if (creatorWallets[0]) {
        console.log('Updating creator wallet', creatorWallets[0].id);
        await base44.entities.TokenWallet.update(creatorWallets[0].id, {
          balance: (creatorWallets[0].balance || 0) + tipAmount,
          lifetime_earnings: (creatorWallets[0].lifetime_earnings || 0) + tipAmount
        });
      }

      // Record transactions
      await base44.entities.TokenTransaction.create({
        user_id: currentUserId,
        type: 'spending',
        amount: -tipAmount,
        description: `Tip to ${post.author_name}`
      });

      await base44.entities.TokenTransaction.create({
        user_id: post.author_id,
        type: 'earning',
        amount: tipAmount,
        description: `Tip from supporter`
      });

      console.log('Tip mutation completed successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast.success('Tip sent!');
      setIsOpen(false);
      setAmount('');
      setMessage('');
    },
    onError: (error) => {
      console.error('Tip mutation error:', error);
      toast.error(error.message || 'Failed to send tip');
    }
  });

  if (!currentUserId || currentUserId === post.author_id) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={className}
      >
        <Heart className="w-4 h-4 mr-1" />
        Tip
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-slate-800 border-cyan-500/20">
          <DialogHeader>
            <DialogTitle className="text-white">Send a Tip to {post.author_name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-slate-900/50 rounded-lg border border-cyan-500/20">
              <p className="text-xs text-slate-400 mb-1">Recipient Wallet</p>
              <p className="text-sm text-slate-200 font-mono break-all">
                {post.author_id}
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
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-slate-900/50 border-cyan-500/20 text-white"
              />
              {wallet && (
                <p className="text-xs text-slate-400 mt-1">
                  Available: {wallet.balance.toLocaleString()} $ASC
                </p>
              )}
              <div className="flex gap-2 mt-2">
                {[10, 50, 100, 500].map((preset) => (
                  <Button
                    key={preset}
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(preset.toString())}
                    disabled={wallet && preset > wallet.balance}
                    className="border-cyan-500/20 hover:bg-cyan-500/10 text-xs"
                  >
                    {preset}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-300 mb-2 block">
                Message (optional)
              </label>
              <Textarea
                placeholder="Add a supportive message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="bg-slate-900/50 border-cyan-500/20 text-white"
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  console.log('Send tip clicked', { amount, wallet, walletLoading, isPending: tipMutation.isPending });
                  tipMutation.mutate();
                }}
                disabled={tipMutation.isPending || !amount || walletLoading || !wallet || parseFloat(amount) > (wallet?.balance || 0)}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500"
              >
                {tipMutation.isPending || walletLoading ? (
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
                onClick={() => setIsOpen(false)}
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