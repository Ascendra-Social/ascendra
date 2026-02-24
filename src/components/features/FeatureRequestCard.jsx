import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ArrowUp, ArrowDown, Coins, CheckCircle, Clock, User, Loader2,
  Code, AlertCircle, Bug, Lightbulb, Lock, Unlock, Shield, ChevronDown, ChevronUp
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const categoryColors = {
  feature: 'bg-cyan-900/40 text-cyan-400 border-cyan-500/30',
  improvement: 'bg-purple-900/40 text-purple-400 border-purple-500/30',
  bug_fix: 'bg-red-900/40 text-red-400 border-red-500/30',
  ui_ux: 'bg-pink-900/40 text-pink-400 border-pink-500/30',
  performance: 'bg-green-900/40 text-green-400 border-green-500/30',
  integration: 'bg-blue-900/40 text-blue-400 border-blue-500/30',
  other: 'bg-slate-800/40 text-slate-400 border-slate-500/30'
};

const priorityColors = {
  low: 'text-slate-400',
  medium: 'text-yellow-400',
  high: 'text-orange-400',
  critical: 'text-red-400'
};

const statusConfig = {
  open: { label: 'Open', color: 'bg-green-900/40 text-green-400 border-green-500/30', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-blue-900/40 text-blue-400 border-blue-500/30', icon: Code },
  completed: { label: 'Completed', color: 'bg-emerald-900/40 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-900/40 text-red-400 border-red-500/30', icon: AlertCircle }
};

const CONSENSUS_THRESHOLD = 10; // upvotes needed for majority

export default function FeatureRequestCard({ request, user, wallet }) {
  const [pledgeAmount, setPledgeAmount] = useState('');
  const [showPledgeInput, setShowPledgeInput] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const queryClient = useQueryClient();

  const { data: userPledge } = useQuery({
    queryKey: ['user-pledge', request.id, user.id],
    queryFn: async () => {
      const pledges = await base44.entities.FeatureRequestPledge.filter({ request_id: request.id, user_id: user.id });
      return pledges[0] || null;
    },
    enabled: !!user
  });

  const { data: userVote } = useQuery({
    queryKey: ['user-vote-request', request.id, user.id],
    queryFn: async () => {
      const votes = await base44.entities.FeatureRequestVote.filter({ request_id: request.id, user_id: user.id });
      return votes[0] || null;
    },
    enabled: !!user
  });

  const voteMutation = useMutation({
    mutationFn: async (voteType) => {
      if (userVote) {
        if (userVote.vote_type === voteType) {
          // Remove vote
          await base44.entities.FeatureRequestVote.delete(userVote.id);
          const delta = voteType === 'upvote' ? -1 : 0;
          await base44.entities.FeatureRequest.update(request.id, {
            upvotes_count: Math.max(0, (request.upvotes_count || 0) + (voteType === 'upvote' ? -1 : 0)),
            downvotes_count: Math.max(0, (request.downvotes_count || 0) + (voteType === 'downvote' ? -1 : 0)),
            votes_count: Math.max(0, (request.votes_count || 0) - 1)
          });
          return;
        } else {
          // Change vote
          await base44.entities.FeatureRequestVote.update(userVote.id, { vote_type: voteType });
          await base44.entities.FeatureRequest.update(request.id, {
            upvotes_count: (request.upvotes_count || 0) + (voteType === 'upvote' ? 1 : -1),
            downvotes_count: (request.downvotes_count || 0) + (voteType === 'downvote' ? 1 : -1),
          });
          return;
        }
      }
      await base44.entities.FeatureRequestVote.create({ request_id: request.id, user_id: user.id, vote_type: voteType });
      await base44.entities.FeatureRequest.update(request.id, {
        upvotes_count: (request.upvotes_count || 0) + (voteType === 'upvote' ? 1 : 0),
        downvotes_count: (request.downvotes_count || 0) + (voteType === 'downvote' ? 1 : 0),
        votes_count: (request.votes_count || 0) + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-requests'] });
      queryClient.invalidateQueries({ queryKey: ['user-vote-request', request.id, user.id] });
    }
  });

  const pledgeMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(pledgeAmount);
      if (!amount || amount <= 0) throw new Error('Enter a valid amount');
      if (amount > (wallet?.balance || 0)) throw new Error('Insufficient $ASC balance');
      await base44.entities.FeatureRequestPledge.create({
        request_id: request.id, user_id: user.id, user_name: user.full_name, amount_asc: amount
      });
      await base44.entities.FeatureRequest.update(request.id, {
        total_pledged_asc: (request.total_pledged_asc || 0) + amount
      });
      await base44.entities.TokenWallet.update(wallet.id, {
        balance: (wallet.balance || 0) - amount
      });
      await base44.entities.TokenTransaction.create({
        user_id: user.id, type: 'spending', amount: -amount,
        description: `Pledged to: ${request.title}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-requests'] });
      queryClient.invalidateQueries({ queryKey: ['user-pledge', request.id, user.id] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast.success('$ASC pledged to escrow!');
      setPledgeAmount('');
      setShowPledgeInput(false);
    },
    onError: (e) => toast.error(e.message || 'Failed to pledge')
  });

  const claimMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.FeatureRequest.update(request.id, {
        status: 'in_progress', developer_id: user.id,
        developer_name: user.full_name, claimed_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-requests'] });
      toast.success('Bounty claimed! Build it and earn the $ASC!');
    }
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.FeatureRequest.update(request.id, {
        status: 'completed', completed_date: new Date().toISOString()
      });
      const wallets = await base44.entities.TokenWallet.filter({ user_id: user.id });
      if (wallets[0] && request.total_pledged_asc > 0) {
        await base44.entities.TokenWallet.update(wallets[0].id, {
          balance: (wallets[0].balance || 0) + (request.total_pledged_asc || 0),
          lifetime_earnings: (wallets[0].lifetime_earnings || 0) + (request.total_pledged_asc || 0)
        });
        const pledges = await base44.entities.FeatureRequestPledge.filter({ request_id: request.id });
        for (const pledge of pledges) {
          await base44.entities.FeatureRequestPledge.update(pledge.id, { status: 'paid' });
        }
        await base44.entities.TokenTransaction.create({
          user_id: user.id, type: 'earning', amount: request.total_pledged_asc || 0,
          description: `Completed bounty: ${request.title}`
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-requests'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast.success('Bounty completed! $ASC transferred to your wallet!');
    }
  });

  const upvotes = request.upvotes_count || 0;
  const downvotes = request.downvotes_count || 0;
  const threshold = request.consensus_threshold || CONSENSUS_THRESHOLD;
  const hasConsensus = upvotes >= threshold && upvotes > downvotes;
  const consensusProgress = Math.min(100, (upvotes / threshold) * 100);
  const statusInfo = statusConfig[request.status] || statusConfig.open;
  const StatusIcon = statusInfo.icon;
  const isBug = request.request_type === 'bug';
  const isMine = request.author_id === user.id;
  const isMyBounty = request.developer_id === user.id;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="bg-slate-800/50 border border-slate-700/50 hover:border-cyan-500/30 transition-all rounded-2xl overflow-hidden">
        <CardContent className="p-5">
          {/* Header row */}
          <div className="flex items-start gap-3 mb-3">
            {/* Vote column */}
            <div className="flex flex-col items-center gap-1 pt-1">
              <button
                onClick={() => voteMutation.mutate('upvote')}
                disabled={voteMutation.isPending}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  userVote?.vote_type === 'upvote'
                    ? 'bg-cyan-500 text-white'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-cyan-400'
                }`}
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <span className={`text-sm font-bold ${upvotes > downvotes ? 'text-cyan-400' : 'text-slate-400'}`}>
                {upvotes - downvotes}
              </span>
              <button
                onClick={() => voteMutation.mutate('downvote')}
                disabled={voteMutation.isPending}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  userVote?.vote_type === 'downvote'
                    ? 'bg-red-500 text-white'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-red-400'
                }`}
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-white text-sm leading-snug">{request.title}</h3>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isBug ? (
                    <Bug className="w-4 h-4 text-red-400" />
                  ) : (
                    <Lightbulb className="w-4 h-4 text-cyan-400" />
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-2">
                <Badge variant="outline" className={`text-xs ${statusInfo.color}`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusInfo.label}
                </Badge>
                <Badge variant="outline" className={`text-xs ${categoryColors[request.category] || categoryColors.other}`}>
                  {(request.category || 'other').replace('_', ' ')}
                </Badge>
                {request.priority && request.priority !== 'medium' && (
                  <Badge variant="outline" className={`text-xs border-slate-600 ${priorityColors[request.priority]}`}>
                    {request.priority}
                  </Badge>
                )}
              </div>

              <p className="text-slate-300 text-xs leading-relaxed line-clamp-2">{request.description}</p>
            </div>

            {/* Escrow amount */}
            <div className="shrink-0 text-right">
              <div className={`flex items-center gap-1 font-bold text-base ${request.total_pledged_asc > 0 ? 'text-amber-400' : 'text-slate-600'}`}>
                <Lock className="w-4 h-4" />
                {request.total_pledged_asc || 0}
              </div>
              <p className="text-xs text-slate-500">$ASC escrow</p>
            </div>
          </div>

          {/* Consensus progress bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500 flex items-center gap-1">
                {hasConsensus ? (
                  <><Unlock className="w-3 h-3 text-green-400" /><span className="text-green-400 font-medium">Consensus reached! Open for dev claiming.</span></>
                ) : (
                  <><Shield className="w-3 h-3" />Needs {threshold - upvotes > 0 ? threshold - upvotes : 0} more upvotes for consensus</>
                )}
              </span>
              <span className="text-xs text-slate-500">{upvotes}/{threshold}</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${hasConsensus ? 'bg-green-400' : 'bg-gradient-to-r from-cyan-500 to-purple-500'}`}
                style={{ width: `${consensusProgress}%` }}
              />
            </div>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
            <span className="flex items-center gap-1"><User className="w-3 h-3" />{request.author_name}</span>
            <span className="flex items-center gap-1"><ArrowUp className="w-3 h-3" />{upvotes} up · {downvotes} down</span>
            <span>{formatDistanceToNow(new Date(request.created_date), { addSuffix: true })}</span>
          </div>

          {/* Developer assigned info */}
          {request.developer_name && request.status === 'in_progress' && (
            <div className="mb-3 px-3 py-2 bg-blue-900/30 border border-blue-500/20 rounded-xl flex items-center gap-2">
              <Code className="w-4 h-4 text-blue-400 shrink-0" />
              <p className="text-xs text-blue-300">Being built by <strong>{request.developer_name}</strong></p>
            </div>
          )}

          {/* Bug details expandable */}
          {isBug && (request.steps_to_reproduce || request.expected_behavior) && (
            <div className="mb-3">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1"
              >
                {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showDetails ? 'Hide' : 'Show'} bug details
              </button>
              {showDetails && (
                <div className="mt-2 space-y-2 text-xs bg-slate-900/50 rounded-xl p-3 border border-slate-700/50">
                  {request.steps_to_reproduce && (
                    <div>
                      <p className="text-slate-400 font-medium mb-0.5">Steps to Reproduce:</p>
                      <p className="text-slate-300 whitespace-pre-wrap">{request.steps_to_reproduce}</p>
                    </div>
                  )}
                  {request.expected_behavior && (
                    <div>
                      <p className="text-slate-400 font-medium mb-0.5">Expected:</p>
                      <p className="text-slate-300">{request.expected_behavior}</p>
                    </div>
                  )}
                  {request.actual_behavior && (
                    <div>
                      <p className="text-slate-400 font-medium mb-0.5">Actual:</p>
                      <p className="text-slate-300">{request.actual_behavior}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {/* Pledge */}
            {request.status === 'open' && !userPledge && !isMine && (
              showPledgeInput ? (
                <div className="flex gap-2 flex-1">
                  <Input
                    type="number" min="1"
                    placeholder="$ASC amount"
                    value={pledgeAmount}
                    onChange={(e) => setPledgeAmount(e.target.value)}
                    className="flex-1 h-8 text-sm bg-slate-700 border-slate-600"
                  />
                  <Button size="sm" onClick={() => pledgeMutation.mutate()} disabled={pledgeMutation.isPending || !pledgeAmount} className="bg-amber-500 hover:bg-amber-600 text-black h-8">
                    {pledgeMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Pledge'}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8" onClick={() => { setShowPledgeInput(false); setPledgeAmount(''); }}>✕</Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setShowPledgeInput(true)} className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 h-8 text-xs">
                  <Coins className="w-3 h-3 mr-1" /> Add to Escrow
                </Button>
              )
            )}

            {userPledge && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-900/30 border border-amber-500/20 rounded-lg">
                <Lock className="w-3 h-3 text-amber-400" />
                <span className="text-xs text-amber-300">You pledged {userPledge.amount_asc} $ASC</span>
              </div>
            )}

            {/* Claim bounty - only available when consensus reached and no developer yet */}
            {request.status === 'open' && !request.developer_id && hasConsensus && (
              <Button
                size="sm"
                onClick={() => claimMutation.mutate()}
                disabled={claimMutation.isPending}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white h-8 text-xs"
              >
                {claimMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Code className="w-3 h-3 mr-1" /> Claim Bounty</>}
              </Button>
            )}

            {/* No consensus yet notice for devs */}
            {request.status === 'open' && !request.developer_id && !hasConsensus && (
              <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-slate-500">
                <Shield className="w-3 h-3" /> Awaiting community consensus to unlock
              </div>
            )}

            {/* Mark complete */}
            {request.status === 'in_progress' && isMyBounty && (
              <Button
                size="sm"
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white h-8 text-xs"
              >
                {completeMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <><CheckCircle className="w-3 h-3 mr-1" /> Mark Complete & Claim $ASC</>}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}