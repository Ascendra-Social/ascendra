import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Heart, MessageCircle, Share2, Bookmark, Volume2, VolumeX,
  Play, Pause, Coins, Sparkles
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from 'framer-motion';

export default function ReelCard({ reel, isActive, onLike }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [showHeart, setShowHeart] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [isActive]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleDoubleTap = () => {
    if (!isLiked) {
      setIsLiked(true);
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 800);
      if (onLike) onLike(reel.id);
    }
  };

  return (
    <div className="relative h-full w-full bg-black flex items-center justify-center">
      {/* Video */}
      {reel.media_url ? (
        <video
          ref={videoRef}
          src={reel.media_url}
          className="h-full w-full object-cover"
          loop
          muted={isMuted}
          playsInline
          onClick={togglePlay}
          onDoubleClick={handleDoubleTap}
        />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center">
          <p className="text-white text-xl font-medium p-8 text-center">{reel.content}</p>
        </div>
      )}

      {/* Double tap heart animation */}
      <AnimatePresence>
        {showHeart && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <Heart className="w-32 h-32 text-white fill-white drop-shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Play/Pause indicator */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-20 h-20 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-10 h-10 text-white ml-1" />
          </div>
        </div>
      )}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />

      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <h2 className="text-white font-bold text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          Reels
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMuted(!isMuted)}
          className="rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20"
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </Button>
      </div>

      {/* Right actions */}
      <div className="absolute right-4 bottom-24 flex flex-col items-center gap-5">
        <div className="flex flex-col items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsLiked(!isLiked)}
            className="rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 w-12 h-12"
          >
            <Heart className={`w-7 h-7 ${isLiked ? 'text-rose-500 fill-rose-500' : 'text-white'}`} />
          </Button>
          <span className="text-white text-sm font-medium mt-1">{reel.likes_count || 0}</span>
        </div>

        <div className="flex flex-col items-center">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 w-12 h-12"
          >
            <MessageCircle className="w-7 h-7 text-white" />
          </Button>
          <span className="text-white text-sm font-medium mt-1">{reel.comments_count || 0}</span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 w-12 h-12"
        >
          <Share2 className="w-7 h-7 text-white" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 w-12 h-12"
        >
          <Bookmark className="w-7 h-7 text-white" />
        </Button>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-4 left-4 right-20">
        <Link 
          to={createPageUrl(`Profile?id=${reel.author_id}`)}
          className="flex items-center gap-3 mb-3"
        >
          <Avatar className="w-10 h-10 ring-2 ring-white/50">
            <AvatarImage src={reel.author_avatar} />
            <AvatarFallback className="bg-gradient-to-br from-violet-400 to-pink-400 text-white">
              {reel.author_name?.[0]}
            </AvatarFallback>
          </Avatar>
          <span className="text-white font-semibold">{reel.author_name}</span>
          <Button size="sm" variant="outline" className="rounded-full border-white/50 text-white text-xs h-7 px-4 bg-white/10 hover:bg-white/20">
            Follow
          </Button>
        </Link>

        {reel.content && (
          <p className="text-white/90 text-sm line-clamp-2 mb-2">{reel.content}</p>
        )}

        {reel.tokens_earned > 0 && (
          <Badge className="bg-gradient-to-r from-amber-500/80 to-orange-500/80 text-white border-0 rounded-full">
            <Coins className="w-3 h-3 mr-1" />
            +{reel.tokens_earned} $ASC earned
          </Badge>
        )}
      </div>
    </div>
  );
}