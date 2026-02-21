import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { 
  Heart, MessageCircle, Share2, Bookmark, Volume2, VolumeX,
  Play, Coins, Sparkles, X, Send, Copy, Repeat2, MessageSquare, CornerDownRight
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from 'framer-motion';

export default function ReelCard({ reel, isActive }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(reel.likes_count || 0);
  const [commentsCount, setCommentsCount] = useState(reel.comments_count || 0);
  const [showHeart, setShowHeart] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null); // { commentId, authorName }
  const [replyText, setReplyText] = useState('');
  const [expandedReplies, setExpandedReplies] = useState({});
  const [repliesMap, setRepliesMap] = useState({});
  const [user, setUser] = useState(null);
  const lastTap = useRef(0);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) {
      videoRef.current.muted = false;
      videoRef.current.play().catch(() => {
        // Autoplay with sound blocked, fallback to muted
        videoRef.current.muted = true;
        setIsMuted(true);
        videoRef.current.play().catch(() => {});
      });
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isActive]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const handleVideoClick = () => {
    const now = Date.now();
    const delta = now - lastTap.current;
    lastTap.current = now;
    if (delta < 300) {
      // Double tap = like
      handleLike();
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 800);
    } else {
      // Single tap = mute/unmute
      setIsMuted(prev => !prev);
    }
  };

  const handleLike = async () => {
    if (isLiked) return;
    setIsLiked(true);
    const newCount = likesCount + 1;
    setLikesCount(newCount);
    await base44.entities.Post.update(reel.id, { likes_count: newCount });
  };

  const handleSave = () => {
    setIsSaved(prev => !prev);
    // Could persist to a Like/Bookmark entity here
  };

  const handleShare = () => {
    setShowShare(true);
  };

  const handleRepost = async () => {
    if (!user) return;
    await base44.entities.Post.create({
      content: `Reposted: ${reel.content || ''}`,
      media_url: reel.media_url || '',
      media_type: reel.media_type || 'none',
      is_reel: true,
      author_id: user.id,
      author_name: user.full_name || 'User',
      author_avatar: user.avatar || ''
    });
    setShowShare(false);
  };

  const handleShareInMessages = () => {
    const reelLink = `${window.location.origin}${createPageUrl('Reels')}`;
    window.location.href = createPageUrl(`Messages?share=${reel.id}`);
    setShowShare(false);
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}${window.location.pathname}`;
    navigator.clipboard.writeText(link);
    setShowShare(false);
  };

  const loadComments = async () => {
    const data = await base44.entities.Comment.filter({ post_id: reel.id }, '-created_date', 20);
    setComments(data);
  };

  const openComments = () => {
    setShowComments(true);
    loadComments();
  };

  const submitComment = async () => {
    if (!commentText.trim()) return;
    const currentUser = user || await base44.auth.me().catch(() => null);
    if (!currentUser) return;
    const comment = await base44.entities.Comment.create({
      post_id: reel.id,
      author_id: currentUser.id,
      author_name: currentUser.full_name || 'User',
      author_avatar: currentUser.avatar || '',
      content: commentText.trim()
    });
    const newCount = commentsCount + 1;
    setCommentsCount(newCount);
    await base44.entities.Post.update(reel.id, { comments_count: newCount });
    setComments(prev => [comment, ...prev]);
    setCommentText('');
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
          playsInline
          onClick={handleVideoClick}
        />
      ) : (
        <div
          className="h-full w-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center"
          onClick={handleVideoClick}
        >
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

      {/* Play indicator */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-20 h-20 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-10 h-10 text-white ml-1" />
          </div>
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />

      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <h2 className="text-white font-bold text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          Reels
        </h2>
        {/* Mute indicator (tap anywhere to toggle) */}
        <div className="rounded-full bg-white/10 backdrop-blur-sm p-2">
          {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
        </div>
      </div>

      {/* Right actions */}
      <div className="absolute right-4 bottom-24 flex flex-col items-center gap-5">
        {/* Like */}
        <div className="flex flex-col items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLike}
            className="rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 w-12 h-12"
          >
            <Heart className={`w-7 h-7 ${isLiked ? 'text-rose-500 fill-rose-500' : 'text-white'}`} />
          </Button>
          <span className="text-white text-sm font-medium mt-1">{likesCount}</span>
        </div>

        {/* Comment */}
        <div className="flex flex-col items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={openComments}
            className="rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 w-12 h-12"
          >
            <MessageCircle className="w-7 h-7 text-white" />
          </Button>
          <span className="text-white text-sm font-medium mt-1">{commentsCount}</span>
        </div>

        {/* Share */}
        <div className="flex flex-col items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShare}
            className="rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 w-12 h-12"
          >
            <Share2 className="w-7 h-7 text-white" />
          </Button>
        </div>

        {/* Save */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSave}
          className="rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 w-12 h-12"
        >
          <Bookmark className={`w-7 h-7 ${isSaved ? 'text-amber-400 fill-amber-400' : 'text-white'}`} />
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

      {/* Share Panel */}
      <AnimatePresence>
        {showShare && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="absolute inset-x-0 bottom-0 bg-slate-900/95 backdrop-blur-md rounded-t-3xl z-50"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <h3 className="text-white font-semibold">Share</h3>
              <button onClick={() => setShowShare(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-4 py-3 space-y-2 pb-8">
              <button
                onClick={handleRepost}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                  <Repeat2 className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Repost</p>
                  <p className="text-xs text-slate-400">Share to your reel feed</p>
                </div>
              </button>
              <button
                onClick={handleShareInMessages}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Share in Messages</p>
                  <p className="text-xs text-slate-400">Send to a conversation</p>
                </div>
              </button>
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Copy className="w-5 h-5 text-amber-400" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Copy Link</p>
                  <p className="text-xs text-slate-400">Copy reel link to clipboard</p>
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comments Panel */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="absolute inset-x-0 bottom-0 h-2/3 bg-slate-900/95 backdrop-blur-md rounded-t-3xl z-50 flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <h3 className="text-white font-semibold">{commentsCount} Comments</h3>
              <button onClick={() => setShowComments(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
              {comments.length === 0 ? (
                <p className="text-slate-400 text-center py-8 text-sm">No comments yet. Be the first!</p>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="flex gap-3">
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarImage src={c.author_avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-purple-400 text-white text-xs">
                        {c.author_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="text-sm font-semibold text-white">{c.author_name} </span>
                      <span className="text-sm text-slate-300">{c.content}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-4 py-3 border-t border-slate-700 flex gap-2">
              <input
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitComment()}
                placeholder="Add a comment..."
                className="flex-1 bg-slate-800 rounded-full px-4 py-2 text-sm text-white placeholder-slate-400 outline-none"
              />
              <Button
                size="icon"
                onClick={submitComment}
                disabled={!commentText.trim()}
                className="rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}