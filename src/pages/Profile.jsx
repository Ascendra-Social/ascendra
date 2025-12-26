import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Settings, Grid, Bookmark, Coins, Users, 
  MessageCircle, Edit2, Camera, Check, LogOut
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import PostCard from '@/components/feed/PostCard';
import { motion } from 'framer-motion';

export default function Profile() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const profileId = urlParams.get('id');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        if (!profileId) {
          setEditData({
            username: user.username || '',
            bio: user.bio || ''
          });
        }
      } catch (e) {
        if (!profileId) {
          base44.auth.redirectToLogin();
        }
      }
    };
    loadUser();
  }, [profileId]);

  const { data: profileUser, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', profileId],
    queryFn: async () => {
      if (profileId) {
        const users = await base44.entities.User.filter({ id: profileId });
        return users[0];
      }
      return currentUser;
    },
    enabled: !!profileId || !!currentUser
  });

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ['user-posts', profileUser?.id],
    queryFn: () => base44.entities.Post.filter(
      { author_id: profileUser?.id },
      '-created_date',
      50
    ),
    enabled: !!profileUser
  });

  const { data: wallet } = useQuery({
    queryKey: ['profile-wallet', profileUser?.id],
    queryFn: async () => {
      const wallets = await base44.entities.TokenWallet.filter({ user_id: profileUser?.id });
      return wallets[0];
    },
    enabled: !!profileUser
  });

  const { data: followData } = useQuery({
    queryKey: ['follow-data', profileUser?.id],
    queryFn: async () => {
      const followers = await base44.entities.Follow.filter({ following_id: profileUser?.id });
      const following = await base44.entities.Follow.filter({ follower_id: profileUser?.id });
      const isFollowing = currentUser 
        ? followers.some(f => f.follower_id === currentUser.id)
        : false;
      return { 
        followers: followers.length, 
        following: following.length,
        isFollowing 
      };
    },
    enabled: !!profileUser
  });

  const { data: mutualData } = useQuery({
    queryKey: ['mutual-data', profileUser?.id, currentUser?.id],
    queryFn: async () => {
      if (!currentUser || profileUser?.id === currentUser.id) return null;
      
      // Get mutual friends
      const userFollowing = await base44.entities.Follow.filter({ follower_id: currentUser.id });
      const profileFollowing = await base44.entities.Follow.filter({ follower_id: profileUser.id });
      const mutualFriendIds = userFollowing
        .filter(f => profileFollowing.some(pf => pf.following_id === f.following_id))
        .map(f => f.following_id);
      
      // Get mutual communities
      const userCommunities = await base44.entities.CommunityMember.filter({ user_id: currentUser.id });
      const profileCommunities = await base44.entities.CommunityMember.filter({ user_id: profileUser.id });
      const mutualCommunityIds = userCommunities
        .filter(uc => profileCommunities.some(pc => pc.community_id === uc.community_id))
        .map(uc => uc.community_id);
      
      return {
        mutualFriends: mutualFriendIds.length,
        mutualCommunities: mutualCommunityIds.length
      };
    },
    enabled: !!profileUser && !!currentUser && profileUser?.id !== currentUser?.id
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (followData?.isFollowing) {
        const follows = await base44.entities.Follow.filter({
          follower_id: currentUser.id,
          following_id: profileUser.id
        });
        if (follows[0]) {
          await base44.entities.Follow.delete(follows[0].id);
        }
      } else {
        await base44.entities.Follow.create({
          follower_id: currentUser.id,
          following_id: profileUser.id
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-data'] });
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setIsEditing(false);
    }
  });

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.auth.updateMe({ avatar: file_url });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    }
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.auth.updateMe({ banner: file_url });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    }
  };

  const isOwnProfile = !profileId || profileId === currentUser?.id;
  const user = isOwnProfile ? currentUser : profileUser;

  if (profileLoading || !user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex flex-col items-center mb-8">
          <Skeleton className="w-28 h-28 rounded-full mb-4" />
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    );
  }

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-slate-400',
    away: 'bg-yellow-500'
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Banner */}
      <div className="relative -mx-4 -mt-6 mb-6 h-48 md:h-64 bg-gradient-to-br from-violet-400 to-pink-400 overflow-hidden">
        {user?.banner && (
          <img src={user.banner} alt="" className="w-full h-full object-cover" />
        )}
        {isOwnProfile && (
          <label className="absolute bottom-4 right-4 cursor-pointer">
            <Button size="sm" className="bg-white/90 backdrop-blur hover:bg-white text-slate-700 rounded-full gap-2">
              <Camera className="w-4 h-4" />
              Edit Banner
            </Button>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleBannerUpload}
            />
          </label>
        )}
      </div>

      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center mb-8 -mt-20"
      >
        {/* Avatar */}
        <div className="relative mb-4">
          <Avatar className="w-28 h-28 ring-4 ring-white shadow-xl">
            <AvatarImage src={user.avatar} />
            <AvatarFallback className="text-3xl bg-gradient-to-br from-violet-400 to-pink-400 text-white">
              {user.full_name?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
          {/* Online Status Indicator */}
          <div className={`absolute bottom-2 right-2 w-6 h-6 ${statusColors[user.online_status || 'offline']} rounded-full border-4 border-white`} />
          {isOwnProfile && (
            <label className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-violet-500 flex items-center justify-center cursor-pointer hover:bg-violet-600 transition-colors">
              <Camera className="w-4 h-4 text-white" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </label>
          )}
        </div>

        {/* Name & Username */}
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          {user.full_name}
          {user.is_verified && (
            <Badge className="bg-blue-500 text-white rounded-full w-5 h-5 p-0 flex items-center justify-center">
              <Check className="w-3 h-3" />
            </Badge>
          )}
        </h1>
        <p className="text-slate-500 mb-1">@{user.username || 'username'}</p>
        {user.online_status === 'online' && (
          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 mb-2">
            🟢 Online
          </Badge>
        )}
        {user.online_status === 'away' && (
          <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50 mb-2">
            🟡 Away
          </Badge>
        )}

        {/* Bio */}
        {isEditing ? (
          <div className="w-full max-w-sm mt-4 space-y-3">
            <Input
              placeholder="Username"
              value={editData.username}
              onChange={(e) => setEditData({ ...editData, username: e.target.value })}
              className="rounded-xl"
            />
            <Textarea
              placeholder="Bio"
              value={editData.bio}
              onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
              className="rounded-xl resize-none"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => setIsEditing(false)}
                variant="outline"
                className="flex-1 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={() => updateProfileMutation.mutate(editData)}
                className="flex-1 bg-violet-500 text-white rounded-xl"
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          user.bio && (
            <p className="text-slate-600 text-center mt-3 max-w-sm">{user.bio}</p>
          )
        )}

        {/* Stats */}
        <div className="flex items-center gap-8 mt-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-800">{posts?.length || 0}</p>
            <p className="text-sm text-slate-500">Posts</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-800">{followData?.followers || 0}</p>
            <p className="text-sm text-slate-500">Followers</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-800">{followData?.following || 0}</p>
            <p className="text-sm text-slate-500">Following</p>
          </div>
        </div>

        {/* Mutual Connections */}
        {mutualData && (mutualData.mutualFriends > 0 || mutualData.mutualCommunities > 0) && (
          <div className="flex items-center gap-4 mt-4 text-sm text-slate-600">
            {mutualData.mutualFriends > 0 && (
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{mutualData.mutualFriends} mutual friend{mutualData.mutualFriends !== 1 ? 's' : ''}</span>
              </div>
            )}
            {mutualData.mutualCommunities > 0 && (
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{mutualData.mutualCommunities} mutual communit{mutualData.mutualCommunities !== 1 ? 'ies' : 'y'}</span>
              </div>
            )}
          </div>
        )}

        {/* Token Balance Badge */}
        {wallet && (
          <Badge className="mt-4 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border-amber-200 px-4 py-2 rounded-full">
            <Coins className="w-4 h-4 mr-1" />
            {wallet.balance?.toLocaleString() || 0} VIBE
          </Badge>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          {isOwnProfile ? (
            <>
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                className="rounded-full gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </Button>
              <Link to={createPageUrl('Wallet')}>
                <Button className="rounded-full gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                  <Coins className="w-4 h-4" />
                  Wallet
                </Button>
              </Link>
              <Button
                onClick={() => base44.auth.logout()}
                variant="ghost"
                size="icon"
                className="rounded-full"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => followMutation.mutate()}
                className={`rounded-full px-6 ${
                  followData?.isFollowing
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'bg-gradient-to-r from-violet-500 to-pink-500 text-white'
                }`}
              >
                {followData?.isFollowing ? 'Following' : 'Follow'}
              </Button>
              <Button variant="outline" className="rounded-full gap-2">
                <MessageCircle className="w-4 h-4" />
                Message
              </Button>
            </>
          )}
        </div>
      </motion.div>

      {/* Content Tabs */}
      <Tabs defaultValue="posts">
        <TabsList className="w-full bg-slate-100/80 p-1 rounded-2xl mb-6">
          <TabsTrigger value="posts" className="flex-1 rounded-xl data-[state=active]:bg-white">
            <Grid className="w-4 h-4 mr-2" />
            Posts
          </TabsTrigger>
          <TabsTrigger value="saved" className="flex-1 rounded-xl data-[state=active]:bg-white">
            <Bookmark className="w-4 h-4 mr-2" />
            Saved
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-6">
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
                <PostCard post={post} currentUserId={currentUser?.id} />
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12">
              <Grid className="w-16 h-16 mx-auto text-slate-200 mb-4" />
              <h3 className="font-medium text-slate-600">No posts yet</h3>
            </div>
          )}
        </TabsContent>

        <TabsContent value="saved">
          <div className="text-center py-12">
            <Bookmark className="w-16 h-16 mx-auto text-slate-200 mb-4" />
            <h3 className="font-medium text-slate-600">No saved posts</h3>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}