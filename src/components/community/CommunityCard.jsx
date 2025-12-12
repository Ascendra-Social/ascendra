import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Users, Lock } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';

export default function CommunityCard({ community, isMember, onJoin }) {
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
    >
      <Link to={createPageUrl(`CommunityDetail?id=${community.id}`)}>
        <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300">
          {/* Cover */}
          <div className={`relative h-24 bg-gradient-to-r ${categoryColors[community.category] || categoryColors.other}`}>
            {community.cover_image && (
              <img 
                src={community.cover_image} 
                alt=""
                className="w-full h-full object-cover opacity-80"
              />
            )}
            {community.is_private && (
              <Badge className="absolute top-2 right-2 bg-black/30 backdrop-blur-sm border-0 text-white">
                <Lock className="w-3 h-3 mr-1" />
                Private
              </Badge>
            )}
          </div>

          {/* Icon */}
          <div className="relative px-4 -mt-8">
            <div className="w-16 h-16 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center text-3xl overflow-hidden">
              {community.icon ? (
                <img src={community.icon} alt="" className="w-full h-full object-cover" />
              ) : (
                '🌟'
              )}
            </div>
          </div>

          {/* Info */}
          <div className="p-4 pt-2">
            <h3 className="font-bold text-slate-800 text-lg">{community.name}</h3>
            <p className="text-sm text-slate-500 line-clamp-2 mt-1">{community.description}</p>

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-1 text-slate-400">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">{community.members_count?.toLocaleString() || 0} members</span>
              </div>

              <Button
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onJoin && !isMember) onJoin(community.id);
                }}
                className={`rounded-full px-4 ${
                  isMember 
                    ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' 
                    : 'bg-gradient-to-r from-violet-500 to-pink-500 text-white'
                }`}
              >
                {isMember ? 'Joined' : 'Join'}
              </Button>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}