import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ReelCard from '@/components/reels/ReelCard';
import { Loader2, Plus, X, Upload } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function Reels() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newReelContent, setNewReelContent] = useState('');
  const [newReelFile, setNewReelFile] = useState(null);
  const [creating, setCreating] = useState(false);
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

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

  const handleCreateReel = async () => {
    if (!newReelContent.trim() && !newReelFile) return;
    setCreating(true);
    let media_url = '';
    let media_type = 'none';
    if (newReelFile) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: newReelFile });
      media_url = file_url;
      media_type = newReelFile.type.startsWith('video') ? 'video' : 'image';
    }
    await base44.entities.Post.create({
      content: newReelContent,
      media_url,
      media_type,
      is_reel: true,
      author_id: user.id,
      author_name: user.full_name || 'User',
      author_avatar: user.avatar || ''
    });
    queryClient.invalidateQueries({ queryKey: ['reels'] });
    setNewReelContent('');
    setNewReelFile(null);
    setShowCreate(false);
    setCreating(false);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!reels?.length) {
    return (
      <div className="relative h-screen flex flex-col items-center justify-center bg-gradient-to-br from-violet-600 to-pink-600 text-white p-8">
        <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mb-6">
          <span className="text-5xl">🎬</span>
        </div>
        <h2 className="text-2xl font-bold mb-2">No Reels Yet</h2>
        <p className="text-white/70 text-center mb-6">Be the first to create a positive reel and earn $ASC tokens!</p>
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-white text-violet-600 font-bold rounded-full px-8 hover:bg-white/90"
        >
          <Plus className="w-5 h-5 mr-2" /> Create Reel
        </Button>

        {/* Create Reel Modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-end lg:items-center justify-center">
            <div className="bg-slate-900 rounded-t-3xl lg:rounded-2xl w-full lg:max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-bold text-lg">Create Reel</h2>
                <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <Textarea
                value={newReelContent}
                onChange={e => setNewReelContent(e.target.value)}
                placeholder="What's your reel about?"
                className="bg-slate-800 border-slate-700 text-white resize-none rounded-xl"
                rows={3}
              />
              <div>
                <input ref={fileInputRef} type="file" accept="video/*,image/*" className="hidden" onChange={e => setNewReelFile(e.target.files[0])} />
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300">
                  <Upload className="w-4 h-4" />
                  {newReelFile ? newReelFile.name : 'Upload video or image'}
                </button>
              </div>
              <Button onClick={handleCreateReel} disabled={creating || (!newReelContent.trim() && !newReelFile)} className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post Reel'}
              </Button>
            </div>
          </div>
        )}
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