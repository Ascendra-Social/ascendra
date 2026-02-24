import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import PostCard from '@/components/feed/PostCard';
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

export default function FollowingFeed() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => base44.auth.redirectToLogin());
  }, []);

  const { data: followedIds, isLoading: followLoading } = useQuery({
    queryKey: ['following-ids', currentUser?.id],
    queryFn: async () => {
      const follows = await base44.entities.Follow.filter({ follower_id: currentUser.id });
      return follows.map(f => f.following_id);
    },
    enabled: !!currentUser,
    initialData: []
  });

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ['following-posts', followedIds],
    queryFn: async () => {
      if (!followedIds || followedIds.length === 0) return [];
      // Fetch posts from all followed users in parallel
      const results = await Promise.all(
        followedIds.map(uid =>
          base44.entities.Post.filter({ author_id: uid, is_reel: false }, '-created_date', 20)
        )
      );
      const all = results.flat();
      all.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      return all.slice(0, 50);
    },
    enabled: !!followedIds && followedIds.length > 0,
    initialData: []
  });

  const isLoading = followLoading || postsLoading;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
          <Users className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Following</h1>
          <p className="text-sm text-slate-400">Posts from people you follow</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          {Array(3).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-3xl bg-slate-800/50" />
          ))}
        </div>
      ) : followedIds.length === 0 ? (
        <div className="text-center py-24">
          <Users className="w-16 h-16 mx-auto text-slate-600 mb-4" />
          <h3 className="font-semibold text-slate-300 text-lg mb-2">Follow people to see their posts</h3>
          <p className="text-slate-500 mb-6 text-sm">Discover creators and follow them to build your feed</p>
          <Link to={createPageUrl('Explore')}>
            <Button className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-full px-6">
              Explore Users
            </Button>
          </Link>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-24">
          <Users className="w-16 h-16 mx-auto text-slate-600 mb-4" />
          <h3 className="font-semibold text-slate-300 text-lg mb-2">No posts yet</h3>
          <p className="text-slate-500 text-sm">The people you follow haven't posted anything yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <PostCard post={post} currentUserId={currentUser?.id} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}