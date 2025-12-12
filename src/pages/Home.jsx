import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Sparkles, TrendingUp, Users } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import PostCard from '@/components/feed/PostCard';
import CreatePostModal from '@/components/feed/CreatePostModal';
import { motion } from 'framer-motion';

export default function Home() {
  const [user, setUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState('foryou');
  const queryClient = useQueryClient();

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

  const { data: posts, isLoading } = useQuery({
    queryKey: ['posts', activeTab],
    queryFn: async () => {
      const allPosts = await base44.entities.Post.filter(
        { is_reel: false },
        '-created_date',
        50
      );
      
      // Sort by positivity score for "For You" to promote positive content
      if (activeTab === 'foryou') {
        return allPosts.sort((a, b) => {
          const scoreA = (a.positivity_score || 0.5) * 0.6 + (a.engagement_score || 0) * 0.4;
          const scoreB = (b.positivity_score || 0.5) * 0.6 + (b.engagement_score || 0) * 0.4;
          return scoreB - scoreA;
        });
      }
      return allPosts;
    }
  });

  const { data: communities } = useQuery({
    queryKey: ['user-communities'],
    queryFn: async () => {
      if (!user) return [];
      const memberships = await base44.entities.CommunityMember.filter({ user_id: user.id });
      const communityIds = memberships.map(m => m.community_id);
      if (communityIds.length === 0) return [];
      const allCommunities = await base44.entities.Community.list();
      return allCommunities.filter(c => communityIds.includes(c.id));
    },
    enabled: !!user
  });

  const handlePostCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Feed</h1>
          <p className="text-slate-500 text-sm">Discover positive vibes</p>
        </div>
        {user && (
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-full gap-2"
          >
            <Plus className="w-4 h-4" />
            Create
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="bg-slate-100/80 p-1 rounded-2xl">
          <TabsTrigger 
            value="foryou" 
            className="rounded-xl px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            For You
          </TabsTrigger>
          <TabsTrigger 
            value="following" 
            className="rounded-xl px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <Users className="w-4 h-4 mr-2" />
            Following
          </TabsTrigger>
          <TabsTrigger 
            value="trending" 
            className="rounded-xl px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Trending
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Posts */}
      <div className="space-y-6">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-3xl p-4 space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-11 h-11 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
          ))
        ) : posts?.length > 0 ? (
          posts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <PostCard 
                post={post} 
                currentUserId={user?.id}
              />
            </motion.div>
          ))
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center mb-4">
              <Sparkles className="w-10 h-10 text-violet-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No posts yet</h3>
            <p className="text-slate-500 mb-6">Be the first to share something positive!</p>
            {user && (
              <Button 
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-full"
              >
                Create your first post
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      <CreatePostModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        user={user}
        communities={communities || []}
        onPostCreated={handlePostCreated}
      />
    </div>
  );
}