import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingUp, ExternalLink, BadgeCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';

export default function AdCard({ ad, currentUserId }) {
  const [hasViewed, setHasViewed] = useState(false);

  React.useEffect(() => {
    const recordImpression = async () => {
      if (!currentUserId || hasViewed) return;
      
      try {
        // Check if user already viewed this ad
        const existing = await base44.entities.AdImpression.filter({
          ad_id: ad.id,
          user_id: currentUserId
        });
        
        if (existing.length === 0) {
          // Record impression
          await base44.entities.AdImpression.create({
            ad_id: ad.id,
            user_id: currentUserId,
            clicked: false
          });

          // Update ad stats and deduct tokens
          const newImpressions = (ad.impressions || 0) + 1;
          const newSpent = (ad.spent_tokens || 0) + (ad.cost_per_impression || 1);
          
          await base44.entities.Ad.update(ad.id, {
            impressions: newImpressions,
            spent_tokens: newSpent,
            status: newSpent >= ad.budget_tokens ? 'completed' : ad.status
          });

          // Reward user for viewing ad
          const userWallet = await base44.entities.TokenWallet.filter({ user_id: currentUserId });
          if (userWallet[0]) {
            const rewardAmount = 0.5; // Users get rewarded for viewing ads
            await base44.entities.TokenWallet.update(userWallet[0].id, {
              balance: (userWallet[0].balance || 0) + rewardAmount
            });

            await base44.entities.TokenTransaction.create({
              user_id: currentUserId,
              type: 'ad_reward',
              amount: rewardAmount,
              description: 'Ad viewing reward',
              reference_id: ad.id
            });
          }

          setHasViewed(true);
        }
      } catch (e) {
        console.log('Failed to record impression');
      }
    };

    recordImpression();
  }, [ad, currentUserId, hasViewed]);

  const handleClick = async () => {
    if (!currentUserId) return;

    try {
      // Record click
      const impressions = await base44.entities.AdImpression.filter({
        ad_id: ad.id,
        user_id: currentUserId
      });
      
      if (impressions[0]) {
        await base44.entities.AdImpression.update(impressions[0].id, {
          clicked: true
        });
      }

      // Update ad click count
      await base44.entities.Ad.update(ad.id, {
        clicks: (ad.clicks || 0) + 1
      });

      // Open URL
      if (ad.cta_url) {
        window.open(ad.cta_url, '_blank');
      }
    } catch (e) {
      console.log('Failed to record click');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-violet-50 to-pink-50 rounded-3xl border-2 border-violet-100 overflow-hidden"
    >
      <div className="p-3 bg-white/80 backdrop-blur border-b border-violet-100">
        <Badge className="bg-violet-100 text-violet-700 text-xs">
          <TrendingUp className="w-3 h-3 mr-1" />
          Sponsored
        </Badge>
      </div>

      {/* Business Header */}
      <div className="flex items-center gap-3 p-4 pb-3">
        <Avatar className="w-11 h-11 ring-2 ring-violet-100">
          <AvatarImage src={ad.business_avatar} />
          <AvatarFallback className="bg-gradient-to-br from-violet-400 to-pink-400 text-white">
            {ad.business_name?.[0] || 'B'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold text-slate-800 flex items-center gap-1.5">
            {ad.business_name}
            <BadgeCheck className="w-4 h-4 text-blue-500" />
          </p>
          <p className="text-xs text-slate-400">Sponsored</p>
        </div>
      </div>

      {/* Ad Content */}
      {ad.description && (
        <div className="px-4 pb-3">
          <p className="text-slate-700 leading-relaxed">{ad.description}</p>
        </div>
      )}

      {/* Media */}
      {ad.media_url && (
        <div className="relative">
          <img 
            src={ad.media_url} 
            alt={ad.title} 
            className="w-full aspect-video object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-6">
            <div>
              <h3 className="text-white font-bold text-xl mb-2">{ad.title}</h3>
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="p-4">
        <Button
          onClick={handleClick}
          className="w-full bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-xl h-12 gap-2 hover:from-violet-600 hover:to-pink-600"
        >
          {ad.cta_text || 'Learn More'}
          <ExternalLink className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}