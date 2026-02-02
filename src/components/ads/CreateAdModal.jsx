import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  TrendingUp, X, Loader2, Image, Coins, Target
} from 'lucide-react';
import AdvancedTargeting from './AdvancedTargeting';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function CreateAdModal({ isOpen, onClose, user, wallet, ad, onCreated, businessId, businessName, businessAvatar }) {
  const [formData, setFormData] = useState(ad || {
    title: '',
    description: '',
    cta_text: 'Learn More',
    cta_url: '',
    budget_tokens: '',
    cost_per_impression: '1',
    target_audience: [],
    target_locations: [],
    target_age_min: '',
    target_age_max: '',
    target_gender: 'all',
    target_languages: [],
    target_interests: [],
    target_behaviors: [],
    target_communities: []
  });
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(ad?.media_url || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleMediaSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    setError('');
    
    if (!formData.title.trim() || !formData.budget_tokens) {
      setError('Title and budget are required');
      return;
    }

    const budget = parseInt(formData.budget_tokens);
    if (budget > (wallet?.balance || 0)) {
      setError('Insufficient token balance');
      return;
    }

    setIsSubmitting(true);
    try {
      let mediaUrl = ad?.media_url || '';
      if (mediaFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: mediaFile });
        mediaUrl = file_url;
      }

      // Deduct tokens from wallet
      await base44.entities.TokenWallet.update(wallet.id, {
        balance: (wallet.balance || 0) - budget
      });

      // Record transaction
      await base44.entities.TokenTransaction.create({
        user_id: user.id,
        type: 'spending',
        amount: -budget,
        description: `Ad campaign: ${formData.title}`,
        reference_id: ad?.id || 'pending'
      });

      const adData = {
        ...formData,
        business_id: businessId || user.id,
        business_name: businessName || user.business_name || user.full_name,
        business_avatar: businessAvatar || user.avatar,
        media_url: mediaUrl,
        budget_tokens: budget,
        cost_per_impression: parseFloat(formData.cost_per_impression) || 1,
        status: 'active',
        start_date: new Date().toISOString()
      };

      if (ad) {
        await base44.entities.Ad.update(ad.id, adData);
      } else {
        await base44.entities.Ad.create(adData);
      }

      if (onCreated) onCreated();
    } catch (error) {
      console.error('Error creating ad:', error);
      setError('Failed to create ad campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  const estimatedImpressions = formData.budget_tokens && formData.cost_per_impression
    ? Math.floor(parseFloat(formData.budget_tokens) / parseFloat(formData.cost_per_impression))
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl rounded-3xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-violet-500" />
            {ad ? 'Edit Ad Campaign' : 'Create Ad Campaign'}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {error && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Token Balance */}
          <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-700 font-medium">Available Balance</p>
                <p className="text-2xl font-bold text-amber-800">
                  {wallet?.balance?.toLocaleString() || 0} VIBE
                </p>
              </div>
              <Coins className="w-8 h-8 text-amber-500" />
            </div>
          </div>

          {/* Media Upload */}
          <div>
            <Label className="text-sm text-slate-600 mb-2 block">Ad Image/Video</Label>
            {mediaPreview ? (
              <div className="relative rounded-xl overflow-hidden">
                <img src={mediaPreview} alt="" className="w-full h-64 object-cover" />
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute top-2 right-2 rounded-full bg-black/50 hover:bg-black/70"
                  onClick={() => {
                    setMediaFile(null);
                    setMediaPreview(null);
                  }}
                >
                  <X className="w-4 h-4 text-white" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-64 rounded-xl border-2 border-dashed border-slate-200 cursor-pointer hover:border-violet-300 hover:bg-violet-50 transition-all">
                <Image className="w-12 h-12 text-slate-400 mb-2" />
                <p className="text-sm text-slate-500">Click to upload</p>
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleMediaSelect}
                />
              </label>
            )}
          </div>

          {/* Title & Description */}
          <div>
            <Label htmlFor="title" className="text-sm text-slate-600 mb-2 block">
              Ad Title
            </Label>
            <Input
              id="title"
              placeholder="Catchy headline for your ad"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="h-12 rounded-xl"
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-sm text-slate-600 mb-2 block">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Tell people about your product or service..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="min-h-[80px] rounded-xl resize-none"
            />
          </div>

          {/* CTA */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-slate-600 mb-2 block">Button Text</Label>
              <Input
                placeholder="Learn More"
                value={formData.cta_text}
                onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                className="h-12 rounded-xl"
              />
            </div>
            <div>
              <Label className="text-sm text-slate-600 mb-2 block">Button URL</Label>
              <Input
                placeholder="https://..."
                value={formData.cta_url}
                onChange={(e) => setFormData({ ...formData, cta_url: e.target.value })}
                className="h-12 rounded-xl"
              />
            </div>
          </div>

          {/* Budget */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-slate-600 mb-2 block flex items-center gap-2">
                <Coins className="w-4 h-4" />
                Total Budget (Tokens)
              </Label>
              <Input
                type="number"
                placeholder="1000"
                value={formData.budget_tokens}
                onChange={(e) => setFormData({ ...formData, budget_tokens: e.target.value })}
                className="h-12 rounded-xl"
              />
            </div>
            <div>
              <Label className="text-sm text-slate-600 mb-2 block">Cost per Impression</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="1"
                value={formData.cost_per_impression}
                onChange={(e) => setFormData({ ...formData, cost_per_impression: e.target.value })}
                className="h-12 rounded-xl"
              />
            </div>
          </div>

          {/* Estimated Reach */}
          {estimatedImpressions > 0 && (
            <div className="p-4 bg-violet-50 rounded-xl">
              <p className="text-sm text-violet-700 mb-1">Estimated Reach</p>
              <p className="text-2xl font-bold text-violet-800">
                ~{estimatedImpressions.toLocaleString()} impressions
              </p>
            </div>
          )}

          {/* Advanced Targeting */}
          <div>
            <Label className="text-sm text-slate-600 mb-3 block flex items-center gap-2">
              <Target className="w-4 h-4" />
              Advanced Targeting
            </Label>
            <AdvancedTargeting formData={formData} setFormData={setFormData} />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 pt-0 border-t border-slate-100">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.title.trim() || !formData.budget_tokens}
            className="bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-xl px-6"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>{ad ? 'Update' : 'Launch'} Campaign</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}