import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, X, Loader2, Image } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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

const CATEGORIES = [
  'technology', 'art', 'music', 'sports', 'gaming', 
  'lifestyle', 'education', 'business', 'health', 
  'travel', 'food', 'other'
];

export default function CreateCommunityModal({ isOpen, onClose, user, onCreated }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    is_private: false
  });
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCoverSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.description.trim()) return;
    
    setIsSubmitting(true);
    try {
      let coverUrl = '';
      if (coverFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: coverFile });
        coverUrl = file_url;
      }

      const community = await base44.entities.Community.create({
        ...formData,
        cover_image: coverUrl,
        owner_id: user.id,
        members_count: 1
      });

      // Auto-join the creator
      await base44.entities.CommunityMember.create({
        community_id: community.id,
        user_id: user.id,
        user_name: user.full_name,
        user_avatar: user.avatar,
        role: 'admin'
      });

      if (onCreated) onCreated(community);
    } catch (error) {
      console.error('Error creating community:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg rounded-3xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-slate-100">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-violet-500" />
            Create Community
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* Cover Image */}
          <div>
            <Label className="text-sm text-slate-600 mb-2 block">Cover Image</Label>
            <div className="relative h-32 rounded-2xl overflow-hidden bg-gradient-to-r from-violet-100 to-pink-100">
              {coverPreview ? (
                <>
                  <img src={coverPreview} alt="" className="w-full h-full object-cover" />
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute top-2 right-2 rounded-full bg-black/50 hover:bg-black/70 w-8 h-8"
                    onClick={() => {
                      setCoverFile(null);
                      setCoverPreview(null);
                    }}
                  >
                    <X className="w-4 h-4 text-white" />
                  </Button>
                </>
              ) : (
                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-violet-200/50 transition-colors">
                  <Image className="w-8 h-8 text-violet-400 mb-2" />
                  <span className="text-sm text-violet-500">Add cover image</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverSelect}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Name */}
          <div>
            <Label htmlFor="name" className="text-sm text-slate-600 mb-2 block">
              Community Name
            </Label>
            <Input
              id="name"
              placeholder="Enter community name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-12 rounded-xl"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-sm text-slate-600 mb-2 block">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="What's this community about?"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="min-h-[80px] rounded-xl resize-none"
            />
          </div>

          {/* Category */}
          <div>
            <Label className="text-sm text-slate-600 mb-2 block">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Private toggle */}
          <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-xl">
            <div>
              <Label className="font-medium">Private Community</Label>
              <p className="text-sm text-slate-500">Only approved members can see posts</p>
            </div>
            <Switch
              checked={formData.is_private}
              onCheckedChange={(checked) => setFormData({ ...formData, is_private: checked })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 pt-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.name.trim() || !formData.description.trim()}
            className="bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-xl px-6"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Create'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}