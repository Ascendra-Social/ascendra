import React, { useState, useEffect, useRef } from 'react';
// Note: Create functionality moved to Layout CreateModal
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ReelCard from '@/components/reels/ReelCard';
import { Loader2 } from 'lucide-react';

export default function Reels() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: reels, isLoading } = useQuery({
    queryKey: ['reels'],
    queryFn: async () => {
      const allReels = await base44.entities.Post.filter(
        { is_reel: true },
        '-created_date',
        50
      );
      
      // Sort by positivity - promote positive content, demote fear-based
      return allReels.sort((a, b) => {
        // Combine positivity score with engagement for ranking
        const scoreA = (a.positivity_score || 0.5) * 0.7 + (a.engagement_score || 0) * 0.3;
        const scoreB = (b.positivity_score || 0.5) * 0.7 + (b.engagement_score || 0) * 0.3;
        return scoreB - scoreA;
      });
    }
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const itemHeight = container.clientHeight;
      const newIndex = Math.round(scrollTop / itemHeight);
      if (newIndex !== currentIndex) {
        setCurrentIndex(newIndex);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [currentIndex]);


  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!reels?.length) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-violet-600 to-pink-600 text-white p-8">
        <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mb-6">
          <span className="text-5xl">🎬</span>
        </div>
        <h2 className="text-2xl font-bold mb-2">No Reels Yet</h2>
        <p className="text-white/70 text-center">Be the first to create a positive reel and earn $ASC tokens!</p>
        <p className="text-white/50 text-sm mt-2">Tap the + button in the navigation to get started.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div 
        ref={containerRef}
        className="h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {reels.map((reel, index) => (
          <div 
            key={reel.id}
            className="h-screen w-full snap-start"
            style={{ scrollSnapAlign: 'start' }}
          >
            <ReelCard 
              reel={reel}
              isActive={index === currentIndex}
            />
          </div>
        ))}
      </div>


    </div>
  );
}