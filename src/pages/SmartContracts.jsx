import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CreateSmartContractModal from '@/components/smartcontracts/CreateSmartContractModal';
import BlockchainStateMonitor from '@/components/smartcontracts/BlockchainStateMonitor';
import { 
  FileCode, Plus, Zap, Users, TrendingUp, DollarSign, 
  Clock, CheckCircle, Pause, Play, XCircle 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const statusConfig = {
  draft: { icon: Clock, color: 'text-slate-400 bg-slate-400/20', label: 'Draft' },
  active: { icon: Play, color: 'text-green-400 bg-green-400/20', label: 'Active' },
  paused: { icon: Pause, color: 'text-amber-400 bg-amber-400/20', label: 'Paused' },
  completed: { icon: CheckCircle, color: 'text-blue-400 bg-blue-400/20', label: 'Completed' },
  cancelled: { icon: XCircle, color: 'text-red-400 bg-red-400/20', label: 'Cancelled' }
};

export default function SmartContracts() {
  const [user, setUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState('my_contracts');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (e) {
        console.log('Not logged in');
      }
    };
    loadUser();
  }, []);

  const { data: myContracts = [], isLoading: myLoading } = useQuery({
    queryKey: ['contracts', 'my', user?.id],
    queryFn: () => base44.entities.SmartContract.filter(
      { creator_id: user?.id },
      '-created_date',
      50
    ),
    enabled: !!user && activeTab === 'my_contracts'
  });

  const { data: activeContracts = [], isLoading: activeLoading } = useQuery({
    queryKey: ['contracts', 'active'],
    queryFn: () => base44.entities.SmartContract.filter(
      { status: 'active' },
      '-created_date',
      50
    ),
    enabled: activeTab === 'discover'
  });

  const { data: myPayouts = [], isLoading: payoutsLoading } = useQuery({
    queryKey: ['payouts', user?.id],
    queryFn: () => base44.entities.SmartContractPayout.filter(
      { user_id: user?.id },
      '-created_date',
      50
    ),
    enabled: !!user && activeTab === 'earnings'
  });

  const totalEarned = myPayouts.reduce((sum, p) => sum + p.amount_paid, 0);

  const getContractTypeLabel = (type) => {
    const labels = {
      engagement_rewards: 'Engagement Rewards',
      pay_per_view: 'Pay-Per-View',
      royalty_distribution: 'Royalty Distribution',
      fan_tokens: 'Fan Tokens',
      milestone_payment: 'Milestone Payment',
      subscription_split: 'Subscription Split',
      custom: 'Custom'
    };
    return labels[type] || type;
  };

  const ContractCard = ({ contract }) => {
    const StatusIcon = statusConfig[contract.status]?.icon || FileCode;
    const statusColor = statusConfig[contract.status]?.color || 'text-slate-400';
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/50 border border-cyan-500/20 rounded-2xl p-6 hover:border-cyan-500/40 transition-all"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-slate-700/50 text-slate-300 text-xs border-slate-600">
                {getContractTypeLabel(contract.contract_type)}
              </Badge>
              <Badge className={statusColor}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusConfig[contract.status]?.label}
              </Badge>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">
              {contract.contract_name}
            </h3>
            <p className="text-sm text-slate-400">{contract.description}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-xs text-slate-400">Budget</p>
            <p className="text-white font-semibold">{contract.total_budget} $ASC</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Spent</p>
            <p className="text-white font-semibold">{contract.spent_amount || 0} $ASC</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Participants</p>
            <p className="text-white font-semibold">{contract.total_participants || 0}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Payouts</p>
            <p className="text-white font-semibold">{contract.total_payouts || 0}</p>
          </div>
        </div>

        {contract.engagement_requirements && (
          <div className="flex flex-wrap gap-2 mb-3">
            {contract.engagement_requirements.like_required && (
              <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30">
                Like: {contract.engagement_requirements.like_reward} $ASC
              </Badge>
            )}
            {contract.engagement_requirements.share_required && (
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                Share: {contract.engagement_requirements.share_reward} $ASC
              </Badge>
            )}
            {contract.engagement_requirements.comment_required && (
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                Comment: {contract.engagement_requirements.comment_reward} $ASC
              </Badge>
            )}
            {contract.engagement_requirements.follow_required && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                Follow: {contract.engagement_requirements.follow_reward} $ASC
              </Badge>
            )}
          </div>
        )}

        {contract.security_features && (
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>🔒 Security enabled</span>
            {contract.security_features.cooldown_period && (
              <span>• {contract.security_features.cooldown_period}h cooldown</span>
            )}
          </div>
        )}

        <p className="text-xs text-slate-500 mt-4">
          Created {formatDistanceToNow(new Date(contract.created_date), { addSuffix: true })}
        </p>
      </motion.div>
    );
  };

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 text-center">
        <div className="bg-slate-800/50 border border-cyan-500/20 rounded-2xl p-8">
          <FileCode className="w-16 h-16 mx-auto text-cyan-400 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Sign in to access Smart Contracts</h2>
          <p className="text-slate-400 mb-6">Create and manage engagement reward campaigns</p>
          <Button
            onClick={() => base44.auth.redirectToLogin()}
            className="bg-gradient-to-r from-cyan-500 to-purple-500"
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileCode className="w-7 h-7 text-cyan-400" />
            Smart Contracts
          </h1>
          <p className="text-slate-400 text-sm">Create engagement-based reward campaigns</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Contract
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-300 text-sm">My Contracts</p>
              <p className="text-2xl font-bold text-white">{myContracts.length}</p>
            </div>
            <FileCode className="w-10 h-10 text-cyan-400" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-300 text-sm">Total Earned</p>
              <p className="text-2xl font-bold text-white">{totalEarned} $ASC</p>
            </div>
            <DollarSign className="w-10 h-10 text-purple-400" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-300 text-sm">Campaigns Joined</p>
              <p className="text-2xl font-bold text-white">{myPayouts.length}</p>
            </div>
            <Zap className="w-10 h-10 text-green-400" />
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800/50 p-1 rounded-2xl border border-cyan-500/20 mb-6">
          <TabsTrigger value="my_contracts" className="rounded-xl data-[state=active]:bg-cyan-500/20">
            My Contracts
          </TabsTrigger>
          <TabsTrigger value="discover" className="rounded-xl data-[state=active]:bg-cyan-500/20">
            Discover
          </TabsTrigger>
          <TabsTrigger value="earnings" className="rounded-xl data-[state=active]:bg-cyan-500/20">
            My Earnings
          </TabsTrigger>
          {user?.role === 'admin' && (
            <TabsTrigger value="monitoring" className="rounded-xl data-[state=active]:bg-cyan-500/20">
              Blockchain Monitor
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="my_contracts" className="space-y-4">
          {myLoading ? (
            Array(3).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))
          ) : myContracts.length > 0 ? (
            myContracts.map(contract => (
              <ContractCard key={contract.id} contract={contract} />
            ))
          ) : (
            <div className="text-center py-16">
              <FileCode className="w-16 h-16 mx-auto text-slate-600 mb-4" />
              <p className="text-slate-400">No contracts yet. Create your first one!</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="discover" className="space-y-4">
          {activeLoading ? (
            Array(3).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))
          ) : activeContracts.length > 0 ? (
            activeContracts.map(contract => (
              <ContractCard key={contract.id} contract={contract} />
            ))
          ) : (
            <div className="text-center py-16">
              <Zap className="w-16 h-16 mx-auto text-slate-600 mb-4" />
              <p className="text-slate-400">No active campaigns right now</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="earnings" className="space-y-4">
          {payoutsLoading ? (
            Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))
          ) : myPayouts.length > 0 ? (
            myPayouts.map(payout => (
              <motion.div
                key={payout.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-slate-800/50 border border-cyan-500/20 rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-white capitalize">
                    {payout.engagement_type} Reward
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatDistanceToNow(new Date(payout.created_date), { addSuffix: true })}
                  </p>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  +{payout.amount_paid} $ASC
                </Badge>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-16">
              <DollarSign className="w-16 h-16 mx-auto text-slate-600 mb-4" />
              <p className="text-slate-400">No earnings yet. Start engaging with campaigns!</p>
            </div>
          )}
        </TabsContent>

        {user?.role === 'admin' && (
          <TabsContent value="monitoring">
            <BlockchainStateMonitor />
          </TabsContent>
        )}
      </Tabs>

      {/* Create Modal */}
      <CreateSmartContractModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        user={user}
      />
    </div>
  );
}