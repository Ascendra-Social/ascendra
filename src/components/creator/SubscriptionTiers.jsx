import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Check, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function SubscriptionTiers({ creatorId, currentUserId }) {
  const queryClient = useQueryClient();

  const { data: tiers, isLoading } = useQuery({
    queryKey: ['creator-tiers', creatorId],
    queryFn: () => base44.entities.CreatorTier.filter({ creator_id: creatorId, is_active: true })
  });

  const { data: mySubscription } = useQuery({
    queryKey: ['my-subscription', creatorId, currentUserId],
    queryFn: async () => {
      const subs = await base44.entities.CreatorSubscription.filter({
        subscriber_id: currentUserId,
        creator_id: creatorId,
        status: 'active'
      });
      return subs[0];
    },
    enabled: !!currentUserId
  });

  const { data: wallet } = useQuery({
    queryKey: ['wallet', currentUserId],
    queryFn: async () => {
      const wallets = await base44.entities.TokenWallet.filter({ user_id: currentUserId });
      return wallets[0];
    },
    enabled: !!currentUserId
  });

  const subscribeMutation = useMutation({
    mutationFn: async ({ tier, billingCycle }) => {
      const price = billingCycle === 'monthly' ? tier.price_monthly : tier.price_annual;
      
      if (price > (wallet?.balance || 0)) {
        throw new Error('Insufficient balance');
      }

      // Calculate next billing date
      const now = new Date();
      const nextBilling = new Date(now);
      if (billingCycle === 'monthly') {
        nextBilling.setMonth(nextBilling.getMonth() + 1);
      } else {
        nextBilling.setFullYear(nextBilling.getFullYear() + 1);
      }

      // Create subscription
      await base44.entities.CreatorSubscription.create({
        subscriber_id: currentUserId,
        creator_id: creatorId,
        tier_id: tier.id,
        tier_name: tier.name,
        billing_cycle: billingCycle,
        amount_paid: price,
        status: 'active',
        start_date: now.toISOString(),
        next_billing_date: nextBilling.toISOString()
      });

      // Update tier subscriber count
      await base44.entities.CreatorTier.update(tier.id, {
        subscriber_count: (tier.subscriber_count || 0) + 1
      });

      // Deduct from subscriber wallet
      await base44.entities.TokenWallet.update(wallet.id, {
        balance: (wallet.balance || 0) - price
      });

      // Add to creator wallet
      const creatorWallets = await base44.entities.TokenWallet.filter({ user_id: creatorId });
      if (creatorWallets[0]) {
        await base44.entities.TokenWallet.update(creatorWallets[0].id, {
          balance: (creatorWallets[0].balance || 0) + price,
          lifetime_earnings: (creatorWallets[0].lifetime_earnings || 0) + price
        });
      }

      // Record transactions
      await base44.entities.TokenTransaction.create({
        user_id: currentUserId,
        type: 'spending',
        amount: -price,
        description: `Subscription: ${tier.name} (${billingCycle})`
      });

      await base44.entities.TokenTransaction.create({
        user_id: creatorId,
        type: 'earning',
        amount: price,
        description: `New subscriber: ${tier.name}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-tiers'] });
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast.success('Subscribed successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to subscribe');
    }
  });

  if (isLoading) return null;
  if (!tiers || tiers.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Crown className="w-5 h-5 text-cyan-400" />
        <h3 className="text-lg font-semibold text-white">Exclusive Memberships</h3>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {tiers.map((tier, i) => (
          <motion.div
            key={tier.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="bg-slate-800/50 border-cyan-500/20 hover:border-cyan-500/40 transition-all">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-lg font-bold text-white">{tier.name}</h4>
                  {tier.exclusive_badge && (
                    <Badge className="bg-gradient-to-r from-cyan-500 to-purple-500">
                      {tier.exclusive_badge}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-slate-300">{tier.description}</p>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {tier.benefits?.map((benefit, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                      <Check className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-cyan-500/20">
                  <div className="text-center mb-3">
                    <p className="text-2xl font-bold text-white">
                      {tier.price_monthly} $ASC
                      <span className="text-sm text-slate-400">/month</span>
                    </p>
                    {tier.price_annual && (
                      <p className="text-sm text-slate-400">
                        or {tier.price_annual} $ASC/year
                      </p>
                    )}
                  </div>

                  {mySubscription?.tier_id === tier.id ? (
                    <Button disabled className="w-full bg-slate-700">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Subscribed
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <Button
                        onClick={() => subscribeMutation.mutate({ tier, billingCycle: 'monthly' })}
                        disabled={subscribeMutation.isPending || !currentUserId}
                        className="w-full bg-gradient-to-r from-cyan-500 to-purple-500"
                      >
                        {subscribeMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Subscribe Monthly'
                        )}
                      </Button>
                      {tier.price_annual && (
                        <Button
                          onClick={() => subscribeMutation.mutate({ tier, billingCycle: 'annual' })}
                          disabled={subscribeMutation.isPending || !currentUserId}
                          variant="outline"
                          className="w-full border-cyan-500/30"
                        >
                          Subscribe Annually
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-500 text-center">
                  {tier.subscriber_count || 0} subscribers
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}