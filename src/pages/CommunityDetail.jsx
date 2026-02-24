import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, Lock, Settings, Plus, ArrowLeft, Share2, Shield
} from 'lucide-react';
import ModerationDashboard from '@/components/moderation/ModerationDashboard';
import CommunityModerationSettings from '@/components/moderation/CommunityModerationSettings';
import PostApprovalQueue from '@/components/moderation/PostApprovalQueue';
import MemberManager from '@/components/moderation/MemberManager';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PostCard from '@/components/feed/PostCard';
import CreatePostModal from '@/components/feed/CreatePostModal';
import { motion } from 'framer-motion';

export default function CommunityDetail() {
  const [user, setUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const communityId = urlParams.get('id');

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

  const { data: community, isLoading: communityLoading } = useQuery({
    queryKey: ['community', communityId],
    queryFn: async () => {
      const communities = await base44.entities.Community.filter({ id: communityId });
      return communities[0];
    },
    enabled: !!communityId
  });

  const { data: members } = useQuery({
    queryKey: ['community-members', communityId],
    queryFn: () => base44.entities.CommunityMember.filter(
      { community_id: communityId },
      '-created_date',
      10
    ),
    enabled: !!communityId
  });

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ['community-posts', communityId],
    queryFn: async () => {
      const allPosts = await base44.entities.Post.filter({ community_id: communityId }, '-created_date', 50);
      // Moderators/owners see all; regular members only see approved posts
      if (isOwner || members?.some(m => m.user_id === user?.id && ['moderator', 'admin'].includes(m.role))) {
        return allPosts;
      }
      return allPosts.filter(p => !p.approval_status || p.approval_status === 'approved');
    },
    enabled: !!communityId
  });

  const isMember = members?.some(m => m.user_id === user?.id);
  const isOwner = community?.owner_id === user?.id;
  const memberData = members?.find(m => m.user_id === user?.id);
  const isModerator = memberData?.role === 'moderator' || memberData?.role === 'admin' || isOwner;
  const canModerate = isModerator || isOwner;

  const joinMutation = useMutation({
    mutationFn: async () => {
      if (isMember) {
        const membership = members.find(m => m.user_id === user.id);
        if (membership) {
          await base44.entities.CommunityMember.delete(membership.id);
        }
      } else {
        await base44.entities.CommunityMember.create({
          community_id: communityId,
          user_id: user.id,
          user_name: user.full_name,
          user_avatar: user.avatar
        });
      }
      // Update member count
      await base44.entities.Community.update(communityId, {
        members_count: isMember 
          ? (community.members_count || 1) - 1 
          : (community.members_count || 0) + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-members'] });
      queryClient.invalidateQueries({ queryKey: ['community'] });
    }
  });

  const categoryColors = {
    technology: 'from-blue-500 to-cyan-500',
    art: 'from-pink-500 to-rose-500',
    music: 'from-purple-500 to-violet-500',
    sports: 'from-green-500 to-emerald-500',
    gaming: 'from-indigo-500 to-purple-500',
    lifestyle: 'from-amber-500 to-orange-500',
    education: 'from-teal-500 to-cyan-500',
    business: 'from-slate-500 to-zinc-500',
    health: 'from-lime-500 to-green-500',
    travel: 'from-sky-500 to-blue-500',
    food: 'from-orange-500 to-red-500',
    other: 'from-gray-500 to-slate-500'
  };

  if (communityLoading || !community) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Skeleton className="h-48 rounded-3xl mb-6" />
        <Skeleton className="h-20 rounded-2xl mb-6" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Back button */}
      <Link to={createPageUrl('Communities')} className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back to Communities
      </Link>

      {/* Cover & Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        {/* Cover */}
        <div className={`relative h-48 rounded-3xl overflow-hidden bg-gradient-to-r ${categoryColors[community.category] || categoryColors.other}`}>
          {community.cover_image && (
            <img 
              src={community.cover_image} 
              alt=""
              className="w-full h-full object-cover opacity-80"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          
          {/* Community icon */}
          <div className="absolute bottom-4 left-4 flex items-end gap-4">
            <div className="w-20 h-20 rounded-2xl bg-white shadow-xl flex items-center justify-center text-4xl overflow-hidden">
              {community.icon ? (
                <img src={community.icon} alt="" className="w-full h-full object-cover" />
              ) : (
                '🌟'
              )}
            </div>
            <div className="pb-1">
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                {community.name}
                {community.is_private && <Lock className="w-5 h-5" />}
              </h1>
              <p className="text-white/80 text-sm">{community.members_count || 0} members</p>
            </div>
          </div>

          {/* Actions */}
          <div className="absolute top-4 right-4 flex gap-2">
            {canModerate && (
              <Button 
                size="icon" 
                variant="secondary" 
                className="rounded-full bg-white/20 backdrop-blur hover:bg-white/30 border-0"
                onClick={() => setActiveTab(activeTab === 'moderation' ? 'posts' : 'moderation')}
              >
                <Shield className="w-4 h-4 text-white" />
              </Button>
            )}
            <Button size="icon" variant="secondary" className="rounded-full bg-white/20 backdrop-blur hover:bg-white/30 border-0">
              <Share2 className="w-4 h-4 text-white" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Description & Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl p-5 border border-slate-100 mb-6"
      >
        <p className="text-slate-600 mb-4">{community.description}</p>
        
        <div className="flex items-center justify-between">
          <div className="flex -space-x-2">
            {members?.slice(0, 5).map((member, i) => (
              <Avatar key={member.id} className="w-8 h-8 border-2 border-white">
                <AvatarImage src={member.user_avatar} />
                <AvatarFallback className="text-xs bg-gradient-to-br from-violet-400 to-pink-400 text-white">
                  {member.user_name?.[0]}
                </AvatarFallback>
              </Avatar>
            ))}
            {(community.members_count || 0) > 5 && (
              <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs text-slate-600">
                +{(community.members_count || 0) - 5}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {user && (
              <>
                {isMember && (
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    className="rounded-full gap-2 bg-gradient-to-r from-violet-500 to-pink-500 text-white"
                  >
                    <Plus className="w-4 h-4" />
                    Post
                  </Button>
                )}
                <Button
                  onClick={() => joinMutation.mutate()}
                  variant={isMember ? "outline" : "default"}
                  className={`rounded-full ${
                    isMember 
                      ? '' 
                      : 'bg-gradient-to-r from-violet-500 to-pink-500 text-white'
                  }`}
                >
                  {isMember ? 'Leave' : 'Join'}
                </Button>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Content Section */}
      <div className="space-y-6">
        {activeTab === 'posts' ? (
          <>
            <h2 className="text-lg font-semibold text-slate-800">Posts</h2>
            
            {postsLoading ? (
              Array(3).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-80 rounded-3xl" />
              ))
            ) : posts?.length > 0 ? (
              posts.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <PostCard post={post} currentUserId={user?.id} communityId={communityId} />
                </motion.div>
              ))
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
                <Users className="w-16 h-16 mx-auto text-slate-200 mb-4" />
                <h3 className="font-medium text-slate-600 mb-2">No posts yet</h3>
                {isMember && (
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-full"
                  >
                    Create the first post
                  </Button>
                )}
              </div>
            )}
          </>
        ) : activeTab === 'moderation' && canModerate ? (
          <Tabs defaultValue="approval">
            <TabsList className="bg-slate-800/50 p-1 rounded-xl mb-6 border border-cyan-500/20 flex flex-wrap gap-1">
              <TabsTrigger value="approval" className="rounded-lg data-[state=active]:bg-slate-700 data-[state=active]:text-cyan-400 text-slate-400 text-xs">
                Post Approval
              </TabsTrigger>
              <TabsTrigger value="members" className="rounded-lg data-[state=active]:bg-slate-700 data-[state=active]:text-cyan-400 text-slate-400 text-xs">
                Members
              </TabsTrigger>
              <TabsTrigger value="reports" className="rounded-lg data-[state=active]:bg-slate-700 data-[state=active]:text-cyan-400 text-slate-400 text-xs">
                Reports
              </TabsTrigger>
              <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-slate-700 data-[state=active]:text-cyan-400 text-slate-400 text-xs">
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="approval">
              <PostApprovalQueue community={community} user={user} />
            </TabsContent>

            <TabsContent value="members">
              <MemberManager community={community} user={user} />
            </TabsContent>

            <TabsContent value="reports">
              <ModerationDashboard community={community} user={user} />
            </TabsContent>

            <TabsContent value="settings">
              <CommunityModerationSettings community={community} />
            </TabsContent>
          </Tabs>
        ) : null}
      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        user={user}
        communities={[community]}
        onPostCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['community-posts'] });
          setShowCreateModal(false);
        }}
      />
    </div>
  );
}