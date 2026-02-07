import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Image, Video, X, Loader2, Sparkles, ArrowLeft, Play, DollarSign
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from 'framer-motion';
import { moderateContent } from '@/components/moderation/ContentModerationCheck';
import MonetizationSettings from '@/components/monetization/MonetizationSettings';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Shield } from 'lucide-react';

export default function CreatePost() {
  const [user, setUser] = useState(null);
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState('none');
  const [communityId, setCommunityId] = useState('');
  const [isReel, setIsReel] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [moderationResult, setModerationResult] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [accessPrice, setAccessPrice] = useState('');
  const [previewDuration, setPreviewDuration] = useState('10');
  const navigate = useNavigate();

  // Check for repost draft
  useEffect(() => {
    const draft = localStorage.getItem('repost_draft');
    if (draft) {
      const data = JSON.parse(draft);
      setContent(data.content);
      if (data.media_url) {
        setMediaPreview(data.media_url);
        setMediaType(data.media_type);
      }
      localStorage.removeItem('repost_draft');
    }
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  const { data: communities } = useQuery({
    queryKey: ['my-communities', user?.id],
    queryFn: async () => {
      const memberships = await base44.entities.CommunityMember.filter({ user_id: user?.id });
      const communityIds = memberships.map(m => m.community_id);
      if (communityIds.length === 0) return [];
      const allCommunities = await base44.entities.Community.list();
      return allCommunities.filter(c => communityIds.includes(c.id));
    },
    enabled: !!user
  });

  const handleMediaSelect = (e, type) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      setMediaType(type);
      setMediaPreview(URL.createObjectURL(file));
      if (type === 'video') {
        setIsReel(true);
      }
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() && !mediaFile) return;
    
    setIsSubmitting(true);
    setModerationResult(null);
    
    try {
      // Content Moderation
      const moderation = await moderateContent(
        content,
        mediaPreview,
        'post',
        user.id
      );

      if (!moderation.approved) {
        setModerationResult({
          blocked: true,
          reason: moderation.explanation,
          violation: moderation.violation_type
        });
        setIsSubmitting(false);
        return;
      }

      if (moderation.flagged) {
        setModerationResult({
          blocked: false,
          flagged: true,
          reason: moderation.explanation
        });
      }

      let mediaUrl = '';
      if (mediaFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: mediaFile });
        mediaUrl = file_url;
      }

      let positivityScore = moderation.safety_score || 0.5;
      if (content.trim()) {
        try {
          const analysis = await base44.integrations.Core.InvokeLLM({
            prompt: `Rate the positivity of this social media post on a scale of 0 to 1, where 0 is very negative/fear-based and 1 is very positive/uplifting. Return only a JSON object.

Post: "${content}"`,
            response_json_schema: {
              type: "object",
              properties: {
                score: { type: "number" }
              }
            }
          });
          positivityScore = analysis.score || 0.5;
        } catch (e) {
          console.log('Positivity analysis failed');
        }
      }

      // Create smart contract if premium
      let contractId = null;
      if (isPremium && parseFloat(accessPrice) > 0) {
        const contract = await base44.entities.SmartContract.create({
          creator_id: user.id,
          creator_name: user.full_name,
          contract_name: `Content: ${content.slice(0, 30)}...`,
          description: 'Pay-per-view content monetization',
          contract_type: 'pay_per_view',
          total_budget: 0,
          pay_per_view_config: {
            price_per_view: parseFloat(accessPrice),
            content_id: null,
            preview_duration: parseFloat(previewDuration)
          },
          status: 'active',
          start_date: new Date().toISOString()
        });
        contractId = contract.id;
      }

      await base44.entities.Post.create({
        author_id: user.id,
        author_name: user.full_name,
        author_avatar: user.avatar,
        content,
        media_url: mediaUrl,
        media_type: mediaType,
        is_reel: isReel,
        community_id: communityId || null,
        positivity_score: positivityScore,
        is_premium: isPremium,
        access_price: isPremium ? parseFloat(accessPrice) : 0,
        preview_duration: parseFloat(previewDuration),
        smart_contract_id: contractId
      });

      navigate(createPageUrl(isReel ? 'Reels' : 'Home'));
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-slate-800">Create Post</h1>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || (!content.trim() && !mediaFile)}
            className="bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-full px-5"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Post'
            )}
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Moderation Alert */}
          {moderationResult && (
            <Alert variant={moderationResult.blocked ? "destructive" : "default"} className="rounded-xl">
              {moderationResult.blocked ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
              <AlertDescription>
                <strong>
                  {moderationResult.blocked ? 'Content Blocked' : 'Content Flagged for Review'}
                </strong>
                <p className="text-sm mt-1">{moderationResult.reason}</p>
                {moderationResult.blocked && (
                  <p className="text-xs mt-2 opacity-80">
                    This content violates our community guidelines. Please revise to be more positive and respectful.
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Avatar className="w-12 h-12 ring-2 ring-violet-100">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="bg-gradient-to-br from-violet-400 to-pink-400 text-white">
                {user.full_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold text-slate-800">{user.full_name}</p>
              <Select value={communityId} onValueChange={setCommunityId}>
                <SelectTrigger className="w-fit h-7 text-xs border-0 bg-slate-100 rounded-full px-3 mt-1">
                  <SelectValue placeholder="Post to Feed" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Your Feed</SelectItem>
                  {communities?.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[150px] resize-none border-0 focus-visible:ring-0 text-lg placeholder:text-slate-300 p-0"
          />

          {mediaPreview && (
            <div className="relative rounded-2xl overflow-hidden">
              {mediaType === 'video' ? (
                <video src={mediaPreview} className="w-full rounded-2xl" controls />
              ) : (
                <img src={mediaPreview} alt="" className="w-full rounded-2xl" />
              )}
              <Button
                size="icon"
                variant="secondary"
                className="absolute top-2 right-2 rounded-full bg-black/50 hover:bg-black/70"
                onClick={() => {
                  setMediaFile(null);
                  setMediaPreview(null);
                  setMediaType('none');
                  setIsReel(false);
                }}
              >
                <X className="w-4 h-4 text-white" />
              </Button>
            </div>
          )}

          {/* Reel Toggle */}
          {mediaType === 'video' && (
            <div className="flex items-center justify-between py-3 px-4 bg-gradient-to-r from-violet-50 to-pink-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 flex items-center justify-center">
                  <Play className="w-5 h-5 text-white" />
                </div>
                <div>
                  <Label className="font-medium">Post as Reel</Label>
                  <p className="text-sm text-slate-500">Short-form video for discovery</p>
                </div>
              </div>
              <Switch
                checked={isReel}
                onCheckedChange={setIsReel}
              />
            </div>
          )}

          {/* Monetization Settings */}
          <MonetizationSettings
            isPremium={isPremium}
            setIsPremium={setIsPremium}
            accessPrice={accessPrice}
            setAccessPrice={setAccessPrice}
            previewDuration={previewDuration}
            setPreviewDuration={setPreviewDuration}
            isVideo={mediaType === 'video'}
          />
        </div>

        {/* Media Options */}
        <div className="flex items-center gap-2 p-4 border-t border-slate-100">
          <input
            type="file"
            id="image-upload"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleMediaSelect(e, 'image')}
          />
          <label htmlFor="image-upload">
            <Button variant="ghost" size="sm" className="rounded-full gap-2" asChild>
              <span>
                <Image className="w-5 h-5 text-violet-500" />
                Photo
              </span>
            </Button>
          </label>
          
          <input
            type="file"
            id="video-upload"
            accept="video/*"
            className="hidden"
            onChange={(e) => handleMediaSelect(e, 'video')}
          />
          <label htmlFor="video-upload">
            <Button variant="ghost" size="sm" className="rounded-full gap-2" asChild>
              <span>
                <Video className="w-5 h-5 text-pink-500" />
                Video
              </span>
            </Button>
          </label>

          <div className="flex-1" />

          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Sparkles className="w-4 h-4" />
            <span>Positive content gets boosted!</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}