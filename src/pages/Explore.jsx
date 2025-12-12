import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Search, TrendingUp, Sparkles, Users, Hash } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import CommunityCard from '@/components/community/CommunityCard';
import { motion } from 'framer-motion';

export default function Explore() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('trending');

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ['explore-posts'],
    queryFn: async () => {
      const allPosts = await base44.entities.Post.list('-engagement_score', 20);
      return allPosts.filter(p => p.media_url && p.media_type === 'image');
    }
  });

  const { data: communities, isLoading: communitiesLoading } = useQuery({
    queryKey: ['explore-communities'],
    queryFn: () => base44.entities.Community.list('-members_count', 12)
  });

  const trendingTopics = [
    { tag: 'positivity', count: '12.5K' },
    { tag: 'mindfulness', count: '8.2K' },
    { tag: 'creativity', count: '6.8K' },
    { tag: 'wellness', count: '5.4K' },
    { tag: 'gratitude', count: '4.1K' },
  ];

  const filteredPosts = posts?.filter(post => 
    post.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.author_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Search Header */}
      <div className="mb-8">
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search posts, communities, people..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-14 rounded-2xl border-slate-200 bg-white text-lg"
          />
        </div>
      </div>

      {/* Trending Topics */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-violet-500" />
          Trending Topics
        </h2>
        <div className="flex flex-wrap gap-2">
          {trendingTopics.map((topic, i) => (
            <motion.div
              key={topic.tag}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <Badge 
                className="px-4 py-2 rounded-full bg-gradient-to-r from-violet-100 to-pink-100 text-violet-700 border-0 cursor-pointer hover:from-violet-200 hover:to-pink-200 transition-all"
              >
                <Hash className="w-3 h-3 mr-1" />
                {topic.tag}
                <span className="ml-2 text-violet-400">{topic.count}</span>
              </Badge>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100/80 p-1 rounded-2xl mb-6">
          <TabsTrigger 
            value="trending" 
            className="rounded-xl px-6 data-[state=active]:bg-white"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Discover
          </TabsTrigger>
          <TabsTrigger 
            value="communities" 
            className="rounded-xl px-6 data-[state=active]:bg-white"
          >
            <Users className="w-4 h-4 mr-2" />
            Communities
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trending">
          {/* Image Grid */}
          {postsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Array(9).fill(0).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-2xl" />
              ))}
            </div>
          ) : filteredPosts?.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filteredPosts.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link to={createPageUrl(`PostDetail?id=${post.id}`)}>
                    <div className="relative aspect-square rounded-2xl overflow-hidden group">
                      <img 
                        src={post.media_url} 
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      
                      {post.positivity_score > 0.8 && (
                        <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center">
                          <Sparkles className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Search className="w-16 h-16 mx-auto text-slate-200 mb-4" />
              <h3 className="text-lg font-medium text-slate-600">No results found</h3>
              <p className="text-slate-400">Try a different search term</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="communities">
          {communitiesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array(6).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-2xl" />
              ))}
            </div>
          ) : communities?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {communities.map((community, i) => (
                <motion.div
                  key={community.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <CommunityCard community={community} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Users className="w-16 h-16 mx-auto text-slate-200 mb-4" />
              <h3 className="text-lg font-medium text-slate-600">No communities yet</h3>
              <p className="text-slate-400">Be the first to create one!</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}