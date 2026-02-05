import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import CreateFeatureRequestModal from '@/components/features/CreateFeatureRequestModal';
import FeatureRequestCard from '@/components/features/FeatureRequestCard';
import { Lightbulb, Plus, TrendingUp, Code, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function FeatureRequests() {
  const [user, setUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
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
    queryFn: () => base44.entities.FeatureRequest.list('-total_pledged_asc', 100),
    enabled: !!user
  });

  const filteredRequests = requests?.filter(req => {
    if (activeTab === 'all') return true;
    if (activeTab === 'open') return req.status === 'open';
    if (activeTab === 'in_progress') return req.status === 'in_progress';
    if (activeTab === 'completed') return req.status === 'completed';
    return true;
  }) || [];

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Lightbulb className="w-8 h-8 animate-pulse text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/50 border border-cyan-500/20 rounded-3xl p-6 mb-6"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold gradient-text mb-2">Feature Requests</h1>
            <p className="text-slate-300">
              Suggest improvements, pledge $ASC tokens, and earn by building requested features
            </p>
          </div>
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Request
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="p-4 bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-2xl">
            <p className="text-sm text-cyan-700 mb-1">Open Requests</p>
            <p className="text-2xl font-bold text-cyan-800">
              {requests?.filter(r => r.status === 'open').length || 0}
            </p>
          </div>
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl">
            <p className="text-sm text-blue-700 mb-1">In Progress</p>
            <p className="text-2xl font-bold text-blue-800">
              {requests?.filter(r => r.status === 'in_progress').length || 0}
            </p>
          </div>
          <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl">
            <p className="text-sm text-emerald-700 mb-1">Completed</p>
            <p className="text-2xl font-bold text-emerald-800">
              {requests?.filter(r => r.status === 'completed').length || 0}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Requests List */}
      <div className="space-y-4">
        {isLoading ? (
          Array(5).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))
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
            <p className="text-slate-400">No feature requests yet</p>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="mt-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white"
            >
              Create the First One
            </Button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateFeatureRequestModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          user={user}
        />
      )}
    </div>
  );
}