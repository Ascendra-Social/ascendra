import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Shield, AlertCircle, CheckCircle, XCircle, ArrowLeft, 
  Flag, Users, FileText, Settings, TrendingUp
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';

export default function CommunityModeration() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newRule, setNewRule] = useState('');
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const communityId = urlParams.get('id');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Check if user is admin/moderator of this community
        const memberships = await base44.entities.CommunityMember.filter({
          community_id: communityId,
          user_id: currentUser.id
        });
        
        if (memberships[0]?.role === 'admin' || memberships[0]?.role === 'moderator') {
          setIsAdmin(true);
        } else {
          window.location.href = createPageUrl('Communities');
        }
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, [communityId]);

  const { data: community } = useQuery({
    queryKey: ['community', communityId],
    queryFn: async () => {
      const communities = await base44.entities.Community.filter({ id: communityId });
      return communities[0];
    },
    enabled: !!communityId
  });

  const { data: flaggedContent, isLoading } = useQuery({
    queryKey: ['community-moderation', communityId],
    queryFn: async () => {
      // Get all posts from this community
      const posts = await base44.entities.Post.filter({ community_id: communityId });
      const postIds = posts.map(p => p.id);
      
      // Get moderation records for these posts
      const allModeration = await base44.entities.ContentModeration.list();
      return allModeration.filter(m => 
        m.moderation_status === 'flagged' && postIds.includes(m.content_id)
      );
    },
    enabled: !!communityId && isAdmin
  });

  const { data: violationStats } = useQuery({
    queryKey: ['community-violations', communityId],
    queryFn: async () => {
      const posts = await base44.entities.Post.filter({ community_id: communityId });
      const postIds = posts.map(p => p.id);
      const allModeration = await base44.entities.ContentModeration.list();
      const violations = allModeration.filter(m => postIds.includes(m.content_id));
      
      return {
        total: violations.length,
        removed: violations.filter(v => v.moderation_status === 'removed').length,
        flagged: violations.filter(v => v.moderation_status === 'flagged').length,
        byType: violations.reduce((acc, v) => {
          acc[v.violation_type] = (acc[v.violation_type] || 0) + 1;
          return acc;
        }, {})
      };
    },
    enabled: !!communityId && isAdmin
  });

  const approveMutation = useMutation({
    mutationFn: (id) => base44.entities.ContentModeration.update(id, {
      moderation_status: 'approved'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-moderation'] });
    }
  });

  const removeMutation = useMutation({
    mutationFn: async (moderation) => {
      await base44.entities.ContentModeration.update(moderation.id, {
        moderation_status: 'removed'
      });
      if (moderation.content_id) {
        await base44.entities.Post.delete(moderation.content_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-moderation'] });
      queryClient.invalidateQueries({ queryKey: ['community-violations'] });
    }
  });

  const addRuleMutation = useMutation({
    mutationFn: async () => {
      const currentRules = community.rules || [];
      await base44.entities.Community.update(communityId, {
        rules: [...currentRules, newRule]
      });
    },
    onSuccess: () => {
      setNewRule('');
      queryClient.invalidateQueries({ queryKey: ['community'] });
    }
  });

  const removeRuleMutation = useMutation({
    mutationFn: async (ruleIndex) => {
      const currentRules = community.rules || [];
      await base44.entities.Community.update(communityId, {
        rules: currentRules.filter((_, i) => i !== ruleIndex)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community'] });
    }
  });

  const violationColors = {
    hate_speech: 'bg-red-100 text-red-700',
    harassment: 'bg-orange-100 text-orange-700',
    fear_based: 'bg-yellow-100 text-yellow-700',
    misinformation: 'bg-purple-100 text-purple-700',
    spam: 'bg-blue-100 text-blue-700',
    violence: 'bg-red-100 text-red-700'
  };

  if (!isAdmin || !community) {
    return <Skeleton className="h-screen" />;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link to={createPageUrl(`CommunityDetail?id=${communityId}`)} className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Community
        </Link>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-3xl">
            {community.icon || '🛡️'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{community.name} - Moderation</h1>
            <p className="text-slate-500">Manage content, rules, and community safety</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-5 border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Flag className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{violationStats?.flagged || 0}</p>
              <p className="text-sm text-slate-500">Flagged</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl p-5 border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{violationStats?.removed || 0}</p>
              <p className="text-sm text-slate-500">Removed</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl p-5 border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{violationStats?.total || 0}</p>
              <p className="text-sm text-slate-500">Total Checks</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-2xl p-5 border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{community.members_count || 0}</p>
              <p className="text-sm text-slate-500">Members</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="flagged">
        <TabsList className="bg-slate-100/80 p-1 rounded-2xl mb-6">
          <TabsTrigger value="flagged" className="rounded-xl px-6 data-[state=active]:bg-white">
            <Flag className="w-4 h-4 mr-2" />
            Flagged Content
          </TabsTrigger>
          <TabsTrigger value="rules" className="rounded-xl px-6 data-[state=active]:bg-white">
            <FileText className="w-4 h-4 mr-2" />
            Rules & Guidelines
          </TabsTrigger>
          <TabsTrigger value="stats" className="rounded-xl px-6 data-[state=active]:bg-white">
            <TrendingUp className="w-4 h-4 mr-2" />
            Statistics
          </TabsTrigger>
        </TabsList>

        {/* Flagged Content */}
        <TabsContent value="flagged" className="space-y-4">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)
          ) : flaggedContent?.length > 0 ? (
            flaggedContent.map((item) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Badge className={`${violationColors[item.violation_type]} border mb-2`}>
                      {item.violation_type?.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <p className="text-sm text-slate-600">
                      {item.created_date && formatDistanceToNow(new Date(item.created_date), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-500">Severity</div>
                    <div className={`text-2xl font-bold ${item.severity > 0.7 ? 'text-red-500' : item.severity > 0.4 ? 'text-orange-500' : 'text-yellow-500'}`}>
                      {Math.round(item.severity * 100)}%
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 mb-3">
                  <p className="text-slate-700">{item.content_text}</p>
                </div>

                <div className="bg-violet-50 rounded-xl p-3 mb-4">
                  <p className="text-sm text-violet-700">
                    <strong>AI Analysis:</strong> {item.ai_explanation}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => approveMutation.mutate(item.id)} variant="outline" className="flex-1 rounded-xl gap-2 text-green-600 border-green-200 hover:bg-green-50">
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </Button>
                  <Button onClick={() => removeMutation.mutate(item)} className="flex-1 rounded-xl gap-2 bg-red-500 text-white hover:bg-red-600">
                    <XCircle className="w-4 h-4" />
                    Remove
                  </Button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <Shield className="w-16 h-16 mx-auto text-green-200 mb-4" />
              <h3 className="text-lg font-medium text-slate-600">No flagged content</h3>
              <p className="text-slate-400">Your community is safe and clean!</p>
            </div>
          )}
        </TabsContent>

        {/* Rules */}
        <TabsContent value="rules">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Community Rules</h3>
            
            <div className="space-y-3 mb-6">
              {community.rules?.map((rule, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Badge className="mt-0.5">{index + 1}</Badge>
                    <p className="text-slate-700">{rule}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removeRuleMutation.mutate(index)} className="text-red-500 hover:text-red-600">
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <Label>Add New Rule</Label>
              <Textarea
                placeholder="Enter community rule..."
                value={newRule}
                onChange={(e) => setNewRule(e.target.value)}
                className="rounded-xl"
              />
              <Button onClick={() => addRuleMutation.mutate()} disabled={!newRule.trim()} className="bg-violet-500 text-white rounded-xl">
                Add Rule
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Statistics */}
        <TabsContent value="stats">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Violation Breakdown</h3>
            
            <div className="space-y-3">
              {Object.entries(violationStats?.byType || {}).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Badge className={violationColors[type]}>
                      {type.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <span className="text-2xl font-bold text-slate-800">{count}</span>
                </div>
              ))}
              
              {Object.keys(violationStats?.byType || {}).length === 0 && (
                <p className="text-center text-slate-400 py-8">No violations recorded</p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}