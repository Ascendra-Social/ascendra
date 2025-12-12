import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Users, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import CommunityCard from '@/components/community/CommunityCard';
import CreateCommunityModal from '@/components/community/CreateCommunityModal';
import { motion } from 'framer-motion';

export default function Communities() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('discover');
  const [showCreateModal, setShowCreateModal] = useState(false);
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

  const { data: communities, isLoading } = useQuery({
    queryKey: ['communities'],
    queryFn: () => base44.entities.Community.list('-members_count', 50)
  });

  const { data: memberships } = useQuery({
    queryKey: ['my-memberships', user?.id],
    queryFn: () => base44.entities.CommunityMember.filter({ user_id: user?.id }),
    enabled: !!user
  });

  const joinMutation = useMutation({
    mutationFn: async (communityId) => {
      await base44.entities.CommunityMember.create({
        community_id: communityId,
        user_id: user.id,
        user_name: user.full_name,
        user_avatar: user.avatar
      });
      // Update member count
      const community = communities?.find(c => c.id === communityId);
      if (community) {
        await base44.entities.Community.update(communityId, {
          members_count: (community.members_count || 0) + 1
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-memberships'] });
      queryClient.invalidateQueries({ queryKey: ['communities'] });
    }
  });

  const memberCommunityIds = new Set(memberships?.map(m => m.community_id) || []);

  const filteredCommunities = communities?.filter(c => {
    const matchesSearch = c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         c.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'joined') {
      return matchesSearch && memberCommunityIds.has(c.id);
    }
    return matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Communities</h1>
          <p className="text-slate-500">Find your tribe</p>
        </div>
        {user && (
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-full gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Community
          </Button>
        )}
      </div>

      {/* Search & Tabs */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search communities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 rounded-2xl border-slate-200 bg-white"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-100/80 p-1 rounded-2xl">
            <TabsTrigger 
              value="discover" 
              className="rounded-xl px-6 data-[state=active]:bg-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Discover
            </TabsTrigger>
            <TabsTrigger 
              value="joined" 
              className="rounded-xl px-6 data-[state=active]:bg-white"
            >
              <Users className="w-4 h-4 mr-2" />
              Joined
            </TabsTrigger>
            <TabsTrigger 
              value="trending" 
              className="rounded-xl px-6 data-[state=active]:bg-white"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Trending
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Communities Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(6).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : filteredCommunities?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCommunities.map((community, i) => (
            <motion.div
              key={community.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <CommunityCard 
                community={community}
                isMember={memberCommunityIds.has(community.id)}
                onJoin={() => joinMutation.mutate(community.id)}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center mb-6">
            <Users className="w-12 h-12 text-violet-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-700 mb-2">
            {activeTab === 'joined' ? "You haven't joined any communities" : "No communities found"}
          </h3>
          <p className="text-slate-500 mb-6">
            {activeTab === 'joined' 
              ? "Explore and join communities that match your interests!" 
              : "Be the first to create a community!"}
          </p>
          {user && activeTab !== 'joined' && (
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-full"
            >
              Create Community
            </Button>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateCommunityModal 
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          user={user}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['communities'] });
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}