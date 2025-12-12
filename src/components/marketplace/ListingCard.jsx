import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Heart, Coins, MapPin } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';

export default function ListingCard({ listing }) {
  const conditionColors = {
    new: 'bg-green-100 text-green-700',
    like_new: 'bg-emerald-100 text-emerald-700',
    good: 'bg-blue-100 text-blue-700',
    fair: 'bg-amber-100 text-amber-700',
    poor: 'bg-red-100 text-red-700'
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      className="group"
    >
      <Link to={createPageUrl(`ListingDetail?id=${listing.id}`)}>
        <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300">
          {/* Image */}
          <div className="relative aspect-square overflow-hidden">
            {listing.images?.[0] ? (
              <img 
                src={listing.images[0]} 
                alt={listing.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                <span className="text-4xl">🛍️</span>
              </div>
            )}
            
            {/* Favorite button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white w-8 h-8"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <Heart className="w-4 h-4 text-slate-500" />
            </Button>

            {/* Condition badge */}
            {listing.condition && (
              <Badge className={`absolute bottom-2 left-2 ${conditionColors[listing.condition]} border-0 text-xs`}>
                {listing.condition.replace('_', ' ')}
              </Badge>
            )}
          </div>

          {/* Info */}
          <div className="p-4">
            <h3 className="font-semibold text-slate-800 truncate">{listing.title}</h3>
            
            <div className="flex items-center gap-2 mt-2">
              {listing.currency === 'TOKEN' ? (
                <span className="text-lg font-bold text-amber-600 flex items-center gap-1">
                  <Coins className="w-4 h-4" />
                  {listing.price_in_tokens?.toLocaleString()} VIBE
                </span>
              ) : (
                <span className="text-lg font-bold text-slate-900">
                  ${listing.price?.toLocaleString()}
                </span>
              )}
            </div>

            {/* Seller */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-50">
              <Avatar className="w-6 h-6">
                <AvatarImage src={listing.seller_avatar} />
                <AvatarFallback className="text-xs bg-gradient-to-br from-violet-400 to-pink-400 text-white">
                  {listing.seller_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-slate-500 truncate">{listing.seller_name}</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}