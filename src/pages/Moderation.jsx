import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Shield, AlertCircle, CheckCircle, XCircle, Eye, Trash2, Flag
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';

export default function Moderation() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (currentUser.role !== 'admin') {
          window.location.href = '/';
          return;
        }
        setUser(currentUser);
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  const { data: flaggedContent, isLoading } = useQuery({
    queryKey: ['moderation-flagged'],
    queryFn: () => base44.entities.ContentModeration.filter(
      { moderation_status: 'flagged' },
      '-created_date',
      50
    ),
    enabled: !!user
  });

  const { data: removedContent } = useQuery({
    queryKey: ['moderation-removed'],
    queryFn: () => base44.entities.ContentModeration.filter(
      { moderation_status: 'removed' },
      '-created_date',
      50
    ),
    enabled: !!user
  });

  const approveMutation = useMutation({
    mutationFn: (id) => base44.entities.ContentModeration.update(id, {
      moderation_status: 'approved'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation-flagged'] });
    }
  });

  const removeMutation = useMutation({
    mutationFn: async (moderation) => {
      await base44.entities.ContentModeration.update(moderation.id, {
        moderation_status: 'removed'
      });
      // Also remove the actual post if exists
      if (moderation.content_id) {
        await base44.entities.Post.delete(moderation.content_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation-flagged'] });
      queryClient.invalidateQueries({ queryKey: ['moderation-removed'] });
    }
  });

  const violationColors = {
    hate_speech: 'bg-red-100 text-red-700 border-red-200',
    harassment: 'bg-orange-100 text-orange-700 border-orange-200',
    fear_based: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    misinformation: 'bg-purple-100 text-purple-700 border-purple-200',
    spam: 'bg-blue-100 text-blue-700 border-blue-200',
    violence: 'bg-red-100 text-red-700 border-red-200',
    none: 'bg-gray-100 text-gray-700 border-gray-200'
  };

  if (!user) {
    return <Skeleton className="h-screen" />;
  }

  const ContentCard = ({ item, showActions = true }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-200 p-5"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <Badge className={`${violationColors[item.violation_type]} border mb-2`}>
            {item.violation_type?.replace('_', ' ').toUpperCase()}
          </Badge>
          <p className="text-sm text-slate-600">
            {item.created_date && formatDistanceToNow(new Date(item.created_date), { addSuffix: true })}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-slate-500">Severity</div>
          <div className={`text-2xl font-bold ${
            item.severity > 0.7 ? 'text-red-500' : 
            item.severity > 0.4 ? 'text-orange-500' : 
            'text-yellow-500'
          }`}>
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

      {showActions && (
        <div className="flex gap-2">
          <Button
            onClick={() => approveMutation.mutate(item.id)}
            variant="outline"
            className="flex-1 rounded-xl gap-2 text-green-600 border-green-200 hover:bg-green-50"
          >
            <CheckCircle className="w-4 h-4" />
            Approve
          </Button>
          <Button
            onClick={() => removeMutation.mutate(item)}
            className="flex-1 rounded-xl gap-2 bg-red-500 text-white hover:bg-red-600"
          >
            <Trash2 className="w-4 h-4" />
            Remove
          </Button>
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Content Moderation</h1>
          <p className="text-slate-500">AI-powered safety & community protection</p>
        </div>
      </div>

      <Tabs defaultValue="flagged">
        <TabsList className="bg-slate-100/80 p-1 rounded-2xl mb-6">
          <TabsTrigger value="flagged" className="rounded-xl px-6 data-[state=active]:bg-white">
            <Flag className="w-4 h-4 mr-2" />
            Flagged ({flaggedContent?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="removed" className="rounded-xl px-6 data-[state=active]:bg-white">
            <XCircle className="w-4 h-4 mr-2" />
            Removed ({removedContent?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flagged" className="space-y-4">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))
          ) : flaggedContent?.length > 0 ? (
            flaggedContent.map(item => (
              <ContentCard key={item.id} item={item} />
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <Shield className="w-16 h-16 mx-auto text-green-200 mb-4" />
              <h3 className="text-lg font-medium text-slate-600">No flagged content</h3>
              <p className="text-slate-400">All content is safe and approved!</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="removed" className="space-y-4">
          {removedContent?.length > 0 ? (
            removedContent.map(item => (
              <ContentCard key={item.id} item={item} showActions={false} />
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <XCircle className="w-16 h-16 mx-auto text-slate-200 mb-4" />
              <h3 className="text-lg font-medium text-slate-600">No removed content</h3>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}