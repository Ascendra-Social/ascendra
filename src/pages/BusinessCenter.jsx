import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, TrendingUp, Eye, MousePointer, Coins, 
  Play, Pause, Edit, Trash2, Briefcase, BarChart3
} from 'lucide-react';
import AdAnalytics from '@/components/ads/AdAnalytics';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CreateAdModal from '@/components/ads/CreateAdModal';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

export default function BusinessCenter() {
  const [user, setUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [viewingAnalytics, setViewingAnalytics] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        if (currentUser.account_type !== 'business') {
          // Redirect or show upgrade prompt
        }
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

  const { data: ads, isLoading } = useQuery({
    queryKey: ['business-ads', user?.id],
    queryFn: () => base44.entities.Ad.filter(
      { business_id: user?.id },
      '-created_date'
    ),
    enabled: !!user
  });

  const pauseAdMutation = useMutation({
    mutationFn: ({ adId, status }) => 
      base44.entities.Ad.update(adId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-ads'] });
    }
  });

  const deleteAdMutation = useMutation({
    mutationFn: (adId) => base44.entities.Ad.delete(adId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-ads'] });
    }
  });

  const stats = {
    totalSpent: ads?.reduce((sum, ad) => sum + (ad.spent_tokens || 0), 0) || 0,
    totalImpressions: ads?.reduce((sum, ad) => sum + (ad.impressions || 0), 0) || 0,
    totalClicks: ads?.reduce((sum, ad) => sum + (ad.clicks || 0), 0) || 0,
    activeAds: ads?.filter(ad => ad.status === 'active').length || 0
  };

  const statusColors = {
    active: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-slate-100 text-slate-700',
    draft: 'bg-blue-100 text-blue-700'
  };

  if (!user || isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Skeleton className="h-32 rounded-3xl mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array(4).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Business Center</h1>
            <p className="text-slate-500 text-sm">Manage your ad campaigns</p>
          </div>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-full gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Ad
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="rounded-2xl border-slate-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-500">Token Balance</p>
              <Coins className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-slate-800">
              {wallet?.balance?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-slate-400 mt-1">VIBE Tokens</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-500">Total Spent</p>
              <TrendingUp className="w-4 h-4 text-violet-500" />
            </div>
            <p className="text-2xl font-bold text-slate-800">
              {stats.totalSpent.toLocaleString()}
            </p>
            <p className="text-xs text-slate-400 mt-1">tokens</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-500">Impressions</p>
              <Eye className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-slate-800">
              {stats.totalImpressions.toLocaleString()}
            </p>
            <p className="text-xs text-slate-400 mt-1">total views</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-500">Click Rate</p>
              <MousePointer className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-slate-800">
              {stats.totalImpressions > 0 
                ? ((stats.totalClicks / stats.totalImpressions) * 100).toFixed(1)
                : 0}%
            </p>
            <p className="text-xs text-slate-400 mt-1">{stats.totalClicks} clicks</p>
          </CardContent>
        </Card>
      </div>

      {/* Ads List */}
      <Card className="rounded-3xl border-slate-100">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="flex items-center justify-between">
            <span>Your Ad Campaigns</span>
            <Badge variant="outline">{ads?.length || 0} total</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {ads?.length > 0 ? (
            <div className="space-y-4">
              {ads.map((ad, i) => (
                <motion.div
                  key={ad.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-violet-200 hover:bg-violet-50/30 transition-all"
                >
                  {ad.media_url && (
                    <img 
                      src={ad.media_url} 
                      alt="" 
                      className="w-20 h-20 rounded-xl object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-800 truncate">
                        {ad.title}
                      </h3>
                      <Badge className={statusColors[ad.status]}>
                        {ad.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500 mb-2 line-clamp-1">
                      {ad.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {ad.impressions || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MousePointer className="w-3 h-3" />
                        {ad.clicks || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Coins className="w-3 h-3" />
                        {ad.spent_tokens || 0} / {ad.budget_tokens}
                      </span>
                      <span>
                        {formatDistanceToNow(new Date(ad.created_date), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setViewingAnalytics(ad)}
                      className="rounded-full"
                      title="View Analytics"
                    >
                      <BarChart3 className="w-4 h-4" />
                    </Button>
                    {ad.status === 'active' ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => pauseAdMutation.mutate({ adId: ad.id, status: 'paused' })}
                        className="rounded-full"
                      >
                        <Pause className="w-4 h-4" />
                      </Button>
                    ) : ad.status === 'paused' ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => pauseAdMutation.mutate({ adId: ad.id, status: 'active' })}
                        className="rounded-full"
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingAd(ad);
                        setShowCreateModal(true);
                      }}
                      className="rounded-full"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteAdMutation.mutate(ad.id)}
                      className="rounded-full text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center mb-4">
                <TrendingUp className="w-8 h-8 text-violet-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                No ads yet
              </h3>
              <p className="text-slate-500 mb-6">
                Create your first ad campaign to reach more customers
              </p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-full"
              >
                Create Your First Ad
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Ad Modal */}
      <CreateAdModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingAd(null);
        }}
        user={user}
        wallet={wallet}
        ad={editingAd}
        onCreated={() => {
          setShowCreateModal(false);
          setEditingAd(null);
          queryClient.invalidateQueries({ queryKey: ['business-ads'] });
        }}
      />

      {/* Analytics Modal */}
      {viewingAnalytics && (
        <Dialog open={!!viewingAnalytics} onOpenChange={() => setViewingAnalytics(null)}>
          <DialogContent className="sm:max-w-4xl rounded-3xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
            <DialogHeader className="p-6 pb-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <DialogTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-violet-500" />
                {viewingAnalytics.title} - Analytics
              </DialogTitle>
            </DialogHeader>
            <div className="p-6">
              <AdAnalytics ad={viewingAnalytics} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}