import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Play, Flame } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function TrendingReelsStrip() {
  const { data: reels } = useQuery({
    queryKey: ['trending-reels-strip'],
    queryFn: async () => {
      const all = await base44.entities.Post.filter({ is_reel: true }, '-likes_count', 8);
      return all;
    },
    initialData: []
  });

  if (!reels?.length) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Flame className="w-4 h-4 text-orange-400" />
        <span className="text-sm font-semibold text-slate-300">Trending Reels</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {reels.map(reel => (
          <Link key={reel.id} to={createPageUrl('Reels')} className="shrink-0 group">
            <div className="relative w-24 h-36 rounded-2xl overflow-hidden bg-gradient-to-br from-violet-600 to-pink-600">
              {reel.media_url ? (
                <video
                  src={reel.media_url}
                  className="w-full h-full object-cover"
                  muted
                  preload="metadata"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-2">
                  <p className="text-white text-xs text-center line-clamp-4">{reel.content}</p>
                </div>
              )}
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />
              <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1">
                <Avatar className="w-5 h-5">
                  <AvatarImage src={reel.author_avatar} />
                  <AvatarFallback className="text-xs bg-violet-500 text-white">{reel.author_name?.[0]}</AvatarFallback>
                </Avatar>
              </div>
              <div className="absolute top-2 right-2">
                <Play className="w-3 h-3 text-white fill-white" />
              </div>
              <div className="absolute bottom-8 right-2 text-white text-xs font-bold">
                {reel.likes_count > 999 ? `${(reel.likes_count/1000).toFixed(1)}k` : reel.likes_count || 0}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}