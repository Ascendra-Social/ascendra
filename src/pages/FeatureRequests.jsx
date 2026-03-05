import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import CreateFeatureRequestModal from '@/components/features/CreateFeatureRequestModal';
import FeatureRequestCard from '@/components/features/FeatureRequestCard';
import { Lightbulb, Plus, Bug, TrendingUp, CheckCircle, Coins, Users, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function FeatureRequests() {
  const [user, setUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState('feature');
  const [activeTab, setActiveTab] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => base44.auth.redirectToLogin());
  }, []);

  const { data: wallet } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      const wallets = await base44.entities.TokenWallet.filter({ user_id: user?.id });
      return wallets[0];
    },
    enabled: !!user
  });

  const { data: requests, isLoading } = useQuery({
    queryKey: ['feature-requests'],
    queryFn: () => base44.entities.FeatureRequest.list('-created_date', 200),
    enabled: !!user
  });

  const filteredRequests = (requests || []).filter(req => {
    const statusMatch = activeTab === 'all' || req.status === activeTab;
    const typeMatch = typeFilter === 'all' || req.request_type === typeFilter || 
      (typeFilter === 'feature' && !req.request_type);
    return statusMatch && typeMatch;
  });

  const totalPledged = (requests || []).reduce((sum, r) => sum + (r.total_pledged_asc || 0), 0);

  const openCreate = (type) => {
    setCreateType(type);
    setShowCreateModal(true);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Lightbulb className="w-8 h-8 animate-pulse text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-cyan-500/20 rounded-3xl p-6 mb-6 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-purple-500/5 pointer-events-none" />
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold gradient-text mb-2">Dev Bounty Board</h1>
            <p className="text-slate-300 text-sm max-w-lg">
              Submit bugs & feature requests. Vote to reach consensus. Pledge $ASC into escrow. Developers claim & earn.
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Button
            onClick={() => openCreate('feature')}
            className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl"
          >
            <Lightbulb className="w-4 h-4 mr-2" />
            Request Feature
          </Button>
          <Button
            onClick={() => openCreate('bug')}
            variant="outline"
            className="border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-xl"
          >
            <Bug className="w-4 h-4 mr-2" />
            Report Bug
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Open', value: (requests || []).filter(r => r.status === 'open').length, color: 'from-green-500/20 to-green-600/20', textColor: 'text-green-400', icon: TrendingUp },
            { label: 'In Progress', value: (requests || []).filter(r => r.status === 'in_progress').length, color: 'from-blue-500/20 to-blue-600/20', textColor: 'text-blue-400', icon: Users },
            { label: 'Completed', value: (requests || []).filter(r => r.status === 'completed').length, color: 'from-emerald-500/20 to-emerald-600/20', textColor: 'text-emerald-400', icon: CheckCircle },
            { label: 'Total Escrowed', value: `${totalPledged} $ASC`, color: 'from-amber-500/20 to-amber-600/20', textColor: 'text-amber-400', icon: Lock },
          ].map((stat, i) => (
            <div key={i} className={`p-3 bg-gradient-to-br ${stat.color} rounded-2xl border border-white/5`}>
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={`w-3.5 h-3.5 ${stat.textColor}`} />
                <p className={`text-xs ${stat.textColor}`}>{stat.label}</p>
              </div>
              <p className={`text-xl font-bold ${stat.textColor}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* How it works */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {[
          { step: '1', title: 'Submit & Pledge', desc: 'Submit a request and pledge $ASC tokens into a smart contract escrow pool.', color: 'text-cyan-400' },
          { step: '2', title: 'Vote & Reach Consensus', desc: 'Community votes upvote/downvote. Once majority agrees, the bounty is unlocked for developers.', color: 'text-purple-400' },
          { step: '3', title: 'Claim & Earn', desc: 'Developers claim the bounty, build the feature/fix, and earn all escrowed $ASC upon completion.', color: 'text-amber-400' },
        ].map(item => (
          <div key={item.step} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4">
            <div className={`text-2xl font-black mb-2 ${item.color}`}>{item.step}</div>
            <h3 className="text-white font-semibold text-sm mb-1">{item.title}</h3>
            <p className="text-slate-400 text-xs leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex gap-2">
          {['all', 'feature', 'bug'].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                typeFilter === t
                  ? 'bg-cyan-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {t === 'all' ? 'All Types' : t === 'feature' ? '✨ Features' : '🐛 Bugs'}
            </button>
          ))}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="w-full grid grid-cols-4 bg-slate-800/60">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Requests List */}
      <div className="space-y-4">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)
        ) : filteredRequests.length > 0 ? (
          filteredRequests.map((request) => (
            <FeatureRequestCard
              key={request.id}
              request={request}
              user={user}
              wallet={wallet}
            />
          ))
        ) : (
          <div className="text-center py-16">
            <Lightbulb className="w-16 h-16 mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400 mb-4">No requests yet</p>
            <div className="flex justify-center gap-3">
              <Button onClick={() => openCreate('feature')} className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white">
                <Lightbulb className="w-4 h-4 mr-2" /> Request Feature
              </Button>
              <Button onClick={() => openCreate('bug')} variant="outline" className="border-red-500/50 text-red-400">
                <Bug className="w-4 h-4 mr-2" /> Report Bug
              </Button>
            </div>
          </div>
        )}
      </div>

      <CreateFeatureRequestModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        user={user}
        defaultType={createType}
      />
    </div>
  );
}