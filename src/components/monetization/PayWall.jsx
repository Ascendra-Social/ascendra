import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Unlock, Loader2, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

export default function PayWall({ post, user, children }) {
  const queryClient = useQueryClient();

  const { data: hasPurchased = false, isLoading } = useQuery({
    queryKey: ['content-purchase', post.id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      if (post.author_id === user.id) return true; // Creator always has access
      
      const purchases = await base44.entities.ContentPurchase.filter({
        user_id: user.id,
        content_id: post.id
      });
      return purchases.length > 0;
    },
    enabled: !!post.is_premium && !!user
  });

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error('Please sign in to purchase');
      }

      // Check wallet balance
      const wallets = await base44.entities.TokenWallet.filter({ user_id: user.id });
      if (wallets.length === 0 || wallets[0].balance < post.access_price) {
        throw new Error('Insufficient balance');
      }

      // Deduct from buyer
      await base44.entities.TokenWallet.update(wallets[0].id, {
        balance: wallets[0].balance - post.access_price
      });

      // Add to creator
      const creatorWallets = await base44.entities.TokenWallet.filter({ 
        user_id: post.author_id 
      });
      if (creatorWallets.length > 0) {
        await base44.entities.TokenWallet.update(creatorWallets[0].id, {
          balance: creatorWallets[0].balance + post.access_price
        });
      }

      // Create purchase record
      await base44.entities.ContentPurchase.create({
        user_id: user.id,
        content_id: post.id,
        creator_id: post.author_id,
        amount_paid: post.access_price,
        contract_id: post.smart_contract_id
      });

      // Update post stats
      await base44.entities.Post.update(post.id, {
        total_revenue: (post.total_revenue || 0) + post.access_price,
        purchase_count: (post.purchase_count || 0) + 1
      });

      // Create transactions
      await base44.entities.TokenTransaction.create({
        user_id: user.id,
        type: 'spending',
        amount: -post.access_price,
        description: `Purchased: ${post.content.slice(0, 50)}`
      });

      await base44.entities.TokenTransaction.create({
        user_id: post.author_id,
        type: 'earning',
        amount: post.access_price,
        description: `Content sale: ${post.content.slice(0, 50)}`
      });

      // Record payout in smart contract if exists
      if (post.smart_contract_id) {
        await base44.entities.SmartContractPayout.create({
          contract_id: post.smart_contract_id,
          user_id: post.author_id,
          user_name: post.author_name,
          engagement_type: 'custom',
          amount_paid: post.access_price,
          content_id: post.id,
          verification_data: 'Content purchase',
          status: 'completed'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-purchase'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Content unlocked!');
    },
    onError: (error) => {
      toast.error(error.message || 'Purchase failed');
    }
  });

  if (!post.is_premium) {
    return children;
  }

  if (isLoading) {
    return (
      <div className="relative">
        <div className="blur-sm">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (hasPurchased) {
    return children;
  }

  return (
    <div className="relative">
      <div className="blur-md pointer-events-none">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl">
        <div className="text-center p-6">
          <Lock className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
          <h3 className="text-white font-semibold mb-2">Premium Content</h3>
          <p className="text-slate-300 text-sm mb-4">
            Unlock this {post.is_reel ? 'reel' : 'post'} for
          </p>
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-lg px-6 py-2 mb-4">
            <DollarSign className="w-4 h-4 mr-1" />
            {post.access_price} $ASC
          </Badge>
          {!user ? (
            <Button
              onClick={() => base44.auth.redirectToLogin()}
              className="bg-gradient-to-r from-cyan-500 to-purple-500"
            >
              Sign In to Purchase
            </Button>
          ) : (
            <Button
              onClick={() => purchaseMutation.mutate()}
              disabled={purchaseMutation.isPending}
              className="bg-gradient-to-r from-cyan-500 to-purple-500"
            >
              {purchaseMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4 mr-2" />
                  Unlock Now
                </>
              )}
            </Button>
          )}
          {post.purchase_count > 0 && (
            <p className="text-slate-400 text-xs mt-3">
              {post.purchase_count} {post.purchase_count === 1 ? 'person has' : 'people have'} unlocked this
            </p>
          )}
        </div>
      </div>
    </div>
  );
}