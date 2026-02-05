import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Sparkles, TrendingUp, Users } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import PostCard from '@/components/feed/PostCard';
import CreatePostModal from '@/components/feed/CreatePostModal';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import AdCard from '@/components/ads/AdCard';
import { motion } from 'framer-motion';

export default function Home() {
  const [user, setUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState('foryou');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        // Show onboarding if user hasn't completed it
        if (!currentUser.onboarding_completed) {
          setShowOnboarding(true);
        }
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

  const { data: ads } = useQuery({
    queryKey: ['active-ads', user?.id],
    queryFn: async () => {
      const activeAds = await base44.entities.Ad.filter({ status: 'active' });
      
      if (!user) return activeAds;

      // Advanced filtering based on targeting
      return activeAds.filter(ad => {
        // Interest matching
        if (ad.target_interests?.length > 0 && user.interests?.length > 0) {
          const hasMatchingInterest = ad.target_interests.some(i => 
            user.interests.includes(i)
          );
          if (!hasMatchingInterest) return false;
        }

        // Behavior matching
        if (ad.target_behaviors?.length > 0) {
          // Check if user matches any behavior criteria
          const hasBehaviorMatch = ad.target_behaviors.some(behavior => {
            if (behavior === 'verified_users' && !user.is_verified) return false;
            // Add more behavior checks as needed
            return true;
          });
          if (!hasBehaviorMatch) return false;
        }

        // Language matching
        if (ad.target_languages?.length > 0 && user.language) {
          if (!ad.target_languages.includes(user.language)) return false;
        }

        // Gender matching
        if (ad.target_gender && ad.target_gender !== 'all' && user.gender) {
          if (ad.target_gender !== user.gender) return false;
        }

        return true;
      });
    },
    enabled: !!user
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
      {/* Onboarding Flow */}
      {showOnboarding && user && (
        <OnboardingFlow 
          user={user}
          onComplete={() => {
            setShowOnboarding(false);
            queryClient.invalidateQueries({ queryKey: ['posts'] });
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Feed</h1>
          <p className="text-slate-400 text-sm">Discover positive vibes</p>
        </div>
        {user && (
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-full gap-2"
          >
            <Plus className="w-4 h-4" />
            Create
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="bg-slate-800/50 p-1 rounded-2xl border border-cyan-500/20">
          <TabsTrigger 
            value="foryou" 
            className="rounded-xl px-6 text-slate-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/20 data-[state=active]:to-purple-500/20 data-[state=active]:text-cyan-400"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            For You
          </TabsTrigger>
          <TabsTrigger 
            value="following" 
            className="rounded-xl px-6 text-slate-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/20 data-[state=active]:to-purple-500/20 data-[state=active]:text-cyan-400"
          >
            <Users className="w-4 h-4 mr-2" />
            Following
          </TabsTrigger>
          <TabsTrigger 
            value="trending" 
            className="rounded-xl px-6 text-slate-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/20 data-[state=active]:to-purple-500/20 data-[state=active]:text-cyan-400"
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
            <div key={i} className="bg-slate-800/50 border border-cyan-500/20 rounded-3xl p-4 space-y-4">
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
          posts.map((post, i) => {
            // Insert ads every 5 posts
            const shouldShowAd = i > 0 && i % 5 === 0 && ads?.[Math.floor(i / 5) - 1];
            return (
              <React.Fragment key={post.id}>
                {shouldShowAd && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <AdCard ad={ads[Math.floor(i / 5) - 1]} currentUserId={user?.id} />
                  </motion.div>
                )}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <PostCard 
                    post={post} 
                    currentUserId={user?.id}
                  />
                </motion.div>
              </React.Fragment>
            );
          })
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center mb-4">
              <Sparkles className="w-10 h-10 text-cyan-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No posts yet</h3>
            <p className="text-slate-400 mb-6">Be the first to share something positive!</p>
            {user && (
              <Button 
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-full"
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