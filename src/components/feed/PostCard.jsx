import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { 
  Heart, MessageCircle, Share2, Bookmark, MoreHorizontal,
  Coins, Sparkles, Wand2, RefreshCw
} from 'lucide-react';
import AIAssistantModal from '@/components/ai/AIAssistantModal';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

export default function PostCard({ post, currentUserId, onLike, onComment }) {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [showComments, setShowComments] = useState(false);
  const [showAIRepost, setShowAIRepost] = useState(false);

  const handleLike = async () => {
    if (isLiked) {
      setLikesCount(prev => prev - 1);
    } else {
      setLikesCount(prev => prev + 1);
    }
    setIsLiked(!isLiked);
    if (onLike) onLike(post.id, !isLiked);
  };

  const handleAIRepost = (result) => {
    // Open create post page with AI-generated repost content
    const repostContent = result.content;
    localStorage.setItem('repost_draft', JSON.stringify({
      content: repostContent,
      original_author: post.author_name,
      media_url: post.media_url,
      media_type: post.media_type
    }));
    window.location.href = createPageUrl('CreatePost');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <Link 
          to={createPageUrl(`Profile?id=${post.author_id}`)}
          className="flex items-center gap-3"
        >
          <Avatar className="w-11 h-11 ring-2 ring-violet-100">
            <AvatarImage src={post.author_avatar} />
            <AvatarFallback className="bg-gradient-to-br from-violet-400 to-pink-400 text-white">
              {post.author_name?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-slate-800 flex items-center gap-1.5">
              {post.author_name}
              {post.positivity_score > 0.8 && (
                <Sparkles className="w-4 h-4 text-amber-500" />
              )}
            </p>
            <p className="text-xs text-slate-400">
              {post.created_date && formatDistanceToNow(new Date(post.created_date), { addSuffix: true })}
            </p>
          </div>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <MoreHorizontal className="w-5 h-5 text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuItem onClick={() => setShowAIRepost(true)}>
              <Wand2 className="w-4 h-4 mr-2 text-violet-500" />
              Repost with AI
            </DropdownMenuItem>
            <DropdownMenuItem>Save post</DropdownMenuItem>
            <DropdownMenuItem>Copy link</DropdownMenuItem>
            <DropdownMenuItem className="text-red-500">Report</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      {post.content && (
        <div className="px-4 pb-3">
          <p className="text-slate-700 leading-relaxed">{post.content}</p>
        </div>
      )}

      {/* Media */}
      {post.media_url && post.media_type !== 'none' && (
        <div className="relative">
          {post.media_type === 'video' ? (
            <video 
              src={post.media_url} 
              className="w-full aspect-video object-cover"
              controls
            />
          ) : (
            <img 
              src={post.media_url} 
              alt="" 
              className="w-full aspect-square object-cover"
            />
          )}
        </div>
      )}

      {/* Token Earnings Badge */}
      {post.tokens_earned > 0 && (
        <div className="px-4 pt-3">
          <Badge className="bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border-amber-200 rounded-full px-3">
            <Coins className="w-3 h-3 mr-1" />
            Earned {post.tokens_earned} VIBE
          </Badge>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between p-4 border-t border-slate-50 mt-2">
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleLike}
            className={`rounded-full gap-2 ${isLiked ? 'text-rose-500' : 'text-slate-500'}`}
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-rose-500' : ''}`} />
            <span className="font-medium">{likesCount}</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowComments(!showComments)}
            className="rounded-full gap-2 text-slate-500"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="font-medium">{post.comments_count || 0}</span>
          </Button>
          <Button variant="ghost" size="sm" className="rounded-full gap-2 text-slate-500">
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full text-slate-400">
          <Bookmark className="w-5 h-5" />
        </Button>
      </div>
    </motion.div>
  );
}