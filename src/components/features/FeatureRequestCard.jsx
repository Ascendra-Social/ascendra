import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ArrowUp, Coins, CheckCircle, Clock, User, Loader2,
  Code, AlertCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const categoryColors = {
  feature: 'bg-cyan-100 text-cyan-700',
  improvement: 'bg-purple-100 text-purple-700',
  bug_fix: 'bg-red-100 text-red-700',
  ui_ux: 'bg-pink-100 text-pink-700',
  performance: 'bg-green-100 text-green-700',
  integration: 'bg-blue-100 text-blue-700',
  other: 'bg-slate-100 text-slate-700'
};

const statusConfig = {
  open: { label: 'Open', color: 'bg-green-100 text-green-700', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: Code },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: AlertCircle }
};

export default function FeatureRequestCard({ request, user, wallet }) {
  const [pledgeAmount, setPledgeAmount] = useState('');
  const [showPledgeInput, setShowPledgeInput] = useState(false);
  const queryClient = useQueryClient();

  const { data: userPledge } = useQuery({
    queryKey: ['user-pledge', request.id, user.id],
    queryFn: async () => {
      const pledges = await base44.entities.FeatureRequestPledge.filter({
        request_id: request.id,
        user_id: user.id
      });
      return pledges[0];
    },
    enabled: !!user
  });

  const pledgeMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(pledgeAmount);
      
      if (amount > (wallet?.balance || 0)) {
        throw new Error('Insufficient balance');
      }

      // Create pledge
      await base44.entities.FeatureRequestPledge.create({
        request_id: request.id,
        user_id: user.id,
        user_name: user.full_name,
        amount_asc: amount
      });

      // Update request total
      await base44.entities.FeatureRequest.update(request.id, {
        total_pledged_asc: (request.total_pledged_asc || 0) + amount,
        votes_count: (request.votes_count || 0) + 1
      });

      // Deduct from wallet
      await base44.entities.TokenWallet.update(wallet.id, {
        balance: (wallet.balance || 0) - amount
      });

      // Record transaction
      await base44.entities.TokenTransaction.create({
        user_id: user.id,
        type: 'spending',
        amount: -amount,
        description: `Pledged to: ${request.title}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-requests'] });
      queryClient.invalidateQueries({ queryKey: ['user-pledge'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast.success('Pledge added!');
      setPledgeAmount('');
      setShowPledgeInput(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to pledge');
    }
  });

  const claimMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.FeatureRequest.update(request.id, {
        status: 'in_progress',
        developer_id: user.id,
        developer_name: user.full_name,
        claimed_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-requests'] });
      toast.success('Request claimed! Good luck!');
    }
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      // Update request status
      await base44.entities.FeatureRequest.update(request.id, {
        status: 'completed',
        completed_date: new Date().toISOString()
      });

      // Transfer pledged tokens to developer
      const wallets = await base44.entities.TokenWallet.filter({ user_id: user.id });
      if (wallets[0]) {
        await base44.entities.TokenWallet.update(wallets[0].id, {
          balance: (wallets[0].balance || 0) + (request.total_pledged_asc || 0),
          lifetime_earnings: (wallets[0].lifetime_earnings || 0) + (request.total_pledged_asc || 0)
        });
      }

      // Mark pledges as paid
      const pledges = await base44.entities.FeatureRequestPledge.filter({ request_id: request.id });
      for (const pledge of pledges) {
        await base44.entities.FeatureRequestPledge.update(pledge.id, { status: 'paid' });
      }

      // Record transaction
      await base44.entities.TokenTransaction.create({
        user_id: user.id,
        type: 'earning',
        amount: request.total_pledged_asc || 0,
        description: `Completed: ${request.title}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-requests'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast.success('Congrats! Tokens transferred to your wallet!');
    }
  });

  const statusInfo = statusConfig[request.status] || statusConfig.open;
  const StatusIcon = statusInfo.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800 mb-2">{request.title}</h3>
              <div className="flex flex-wrap gap-2">
                <Badge className={categoryColors[request.category]}>
                  {request.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
                <Badge className={statusInfo.color}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusInfo.label}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-amber-600 font-bold text-lg">
                <Coins className="w-5 h-5" />
                {request.total_pledged_asc || 0}
              </div>
              <p className="text-xs text-slate-500">$ASC Pledged</p>
            </div>
          </div>

          <p className="text-sm text-slate-600 mt-2">{request.description}</p>

          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {request.author_name}
            </div>
            <div className="flex items-center gap-1">
              <ArrowUp className="w-3 h-3" />
              {request.votes_count || 0} votes
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(request.created_date), { addSuffix: true })}
            </div>
          </div>

          {request.developer_name && (
            <div className="mt-3 p-2 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700">
                <Code className="w-3 h-3 inline mr-1" />
                Being developed by {request.developer_name}
              </p>
            </div>
          )}
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex gap-2">
            {/* Pledge/Vote Button */}
            {request.status === 'open' && !userPledge && (
              showPledgeInput ? (
                <div className="flex gap-2 flex-1">
                  <Input
                    type="number"
                    min="1"
                    placeholder="$ASC amount"
                    value={pledgeAmount}
                    onChange={(e) => setPledgeAmount(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => pledgeMutation.mutate()}
                    disabled={pledgeMutation.isPending || !pledgeAmount}
                    size="sm"
                  >
                    {pledgeMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Pledge'
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowPledgeInput(false);
                      setPledgeAmount('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPledgeInput(true)}
                  className="flex-1"
                >
                  <Coins className="w-4 h-4 mr-2" />
                  Pledge $ASC
                </Button>
              )
            )}

            {userPledge && (
              <div className="flex-1 p-2 bg-amber-50 rounded-lg">
                <p className="text-xs text-amber-700">
                  You pledged {userPledge.amount_asc} $ASC
                </p>
              </div>
            )}

            {/* Claim Button (for developers) */}
            {request.status === 'open' && !request.developer_id && (
              <Button
                size="sm"
                onClick={() => claimMutation.mutate()}
                disabled={claimMutation.isPending}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white"
              >
                {claimMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Code className="w-4 h-4 mr-2" />
                    Claim & Build
                  </>
                )}
              </Button>
            )}

            {/* Complete Button (for assigned developer) */}
            {request.status === 'in_progress' && request.developer_id === user.id && (
              <Button
                size="sm"
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white"
              >
                {completeMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Complete
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}