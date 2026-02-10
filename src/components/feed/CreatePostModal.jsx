import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  Image, Video, X, Loader2, Sparkles, Wand2
} from 'lucide-react';
import AIAssistantModal from '@/components/ai/AIAssistantModal';
import AIImageGenerator from '@/components/ai/AIImageGenerator';
import { moderateContent } from '@/components/moderation/ContentModerationCheck';
import { AlertCircle, Shield } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CreatePostModal({ isOpen, onClose, user, communities = [], onPostCreated }) {
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState('none');
  const [communityId, setCommunityId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiMode, setAIMode] = useState('caption');
  const [showImageGenerator, setShowImageGenerator] = useState(false);
  const [moderationResult, setModerationResult] = useState(null);

  const handleMediaSelect = (e, type) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      setMediaType(type);
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  const handleAIApply = (result) => {
    if (result.type === 'text') {
      setContent(result.content);
    } else if (result.type === 'image') {
      setMediaPreview(result.url);
      setMediaType('image');
    }
  };

  const handleGeneratedImage = (url) => {
    setMediaPreview(url);
    setMediaType('image');
  };

  const handleSubmit = async () => {
    console.log('=== POST SUBMIT STARTED ===');
    console.log('User object:', user);
    
    if (!user?.id) {
      alert('You must be logged in to create a post');
      return;
    }
    
    if (!content.trim() && !mediaFile) {
      console.log('No content or media, returning');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      let mediaUrl = null;
      if (mediaFile) {
        console.log('Uploading file...');
        const { file_url } = await base44.integrations.Core.UploadFile({ file: mediaFile });
        mediaUrl = file_url;
        console.log('File uploaded:', mediaUrl);
      } else if (mediaPreview && !mediaPreview.startsWith('blob:')) {
        mediaUrl = mediaPreview;
        console.log('Using existing media:', mediaUrl);
      }

      const postData = { 
        author_id: user.id,
        content 
      };

      if (mediaUrl) {
        postData.media_url = mediaUrl;
        postData.media_type = mediaType;
      }

      if (communityId && communityId !== '') {
        postData.community_id = communityId;
      }

      console.log('Creating post with data:', postData);
      const post = await base44.entities.Post.create(postData);
      console.log('Post created successfully:', post);

      setContent('');
      setMediaFile(null);
      setMediaPreview(null);
      setMediaType('none');
      setCommunityId('');
      setModerationResult(null);
      console.log('Calling onPostCreated callback');
      if (onPostCreated) onPostCreated(post);
      console.log('Closing modal');
      onClose();
    } catch (error) {
      console.error('=== POST CREATION ERROR ===', error);
      alert('Failed to create post: ' + (error.message || JSON.stringify(error)));
    } finally {
      setIsSubmitting(false);
      console.log('=== POST SUBMIT ENDED ===');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg rounded-3xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-slate-100">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            Create Post
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-4">
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
                    This content violates our community guidelines. Please revise your post to be more positive and respectful.
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Avatar className="w-12 h-12 ring-2 ring-violet-100">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback className="bg-gradient-to-br from-violet-400 to-pink-400 text-white">
                {user?.full_name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold text-slate-800">{user?.full_name}</p>
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

          <div className="relative">
            <Textarea
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] resize-none border-0 focus-visible:ring-0 text-lg placeholder:text-slate-300"
            />
            
            {/* AI Helper */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute bottom-2 right-2 rounded-full gap-2 text-violet-500 hover:text-violet-600 hover:bg-violet-50"
              onClick={() => {
                setAIMode(mediaPreview ? 'caption' : 'caption');
                setShowAIModal(true);
              }}
            >
              <Wand2 className="w-4 h-4" />
              AI Help
            </Button>
          </div>

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
                }}
              >
                <X className="w-4 h-4 text-white" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-14 right-2 rounded-full gap-2 bg-white/90 backdrop-blur hover:bg-white"
                onClick={() => {
                  setAIMode('enhance');
                  setShowAIModal(true);
                }}
              >
                <Wand2 className="w-4 h-4 text-violet-500" />
                Enhance
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="flex gap-2">
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

              <Button 
                variant="ghost" 
                size="sm" 
                className="rounded-full gap-2"
                onClick={() => setShowImageGenerator(true)}
              >
                <Sparkles className="w-5 h-5 text-pink-500" />
                AI Image
              </Button>
            
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
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || (!content.trim() && !mediaFile)}
              className="bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-full px-6"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Post'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* AI Assistant Modal */}
      <AIAssistantModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        mode={aiMode}
        imageUrl={mediaPreview}
        existingContent={content}
        onApply={handleAIApply}
      />

      {/* AI Image Generator */}
      <AIImageGenerator
        isOpen={showImageGenerator}
        onClose={() => setShowImageGenerator(false)}
        onImageGenerated={handleGeneratedImage}
      />
    </Dialog>
  );
}