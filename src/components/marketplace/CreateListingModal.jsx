import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ShoppingBag, X, Loader2, Image, Plus, Coins, Wand2, MapPin } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import AIAssistantModal from '@/components/ai/AIAssistantModal';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  'electronics', 'clothing', 'home', 'art', 
  'collectibles', 'services', 'digital', 'other'
];

const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
];

export default function CreateListingModal({ isOpen, onClose, user, onCreated }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    condition: 'good',
    location: '',
    shipping_options: [],
    allows_offers: true
  });
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setImages(prev => [...prev, ...files]);
    const previews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...previews]);
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleAIApply = (result) => {
    if (result.type === 'listing' && result.data) {
      setFormData({
        ...formData,
        title: result.data.title || formData.title,
        description: result.data.description || formData.description,
      });
      if (result.data.price_range) {
        const priceMatch = result.data.price_range.match(/\d+/);
        if (priceMatch) {
          setFormData(prev => ({ ...prev, price: priceMatch[0] }));
        }
      }
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.price) return;
    
    setIsSubmitting(true);
    try {
      const imageUrls = [];
      for (const image of images) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: image });
        imageUrls.push(file_url);
      }

      await base44.entities.MarketplaceListing.create({
        ...formData,
        price: parseFloat(formData.price) || 0,
        images: imageUrls,
        seller_id: user.id,
        seller_name: user.full_name,
        seller_avatar: user.avatar,
        status: 'active'
      });

      if (onCreated) onCreated();
    } catch (error) {
      console.error('Error creating listing:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg rounded-3xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-cyan-500" />
            Create Listing
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* Images */}
          <div>
            <Label className="text-sm text-slate-600 mb-2 block">Photos</Label>
            <div className="grid grid-cols-4 gap-2">
              {imagePreviews.map((preview, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
                  <img src={preview} alt="" className="w-full h-full object-cover" />
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute top-1 right-1 rounded-full bg-black/50 hover:bg-black/70 w-6 h-6"
                    onClick={() => removeImage(i)}
                  >
                    <X className="w-3 h-3 text-white" />
                  </Button>
                </div>
              ))}
              {imagePreviews.length < 4 && (
                <label className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-violet-300 hover:bg-violet-50 transition-colors">
                  <Plus className="w-6 h-6 text-slate-400" />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                </label>
              )}
            </div>
          </div>

          {/* AI Generate button */}
          <Button
            onClick={() => setShowAIModal(true)}
            variant="outline"
            className="w-full h-12 rounded-xl gap-2 border-cyan-200 text-cyan-600 hover:bg-cyan-50"
          >
            <Wand2 className="w-4 h-4" />
            Generate with AI
          </Button>

          {/* Title */}
          <div>
            <Label htmlFor="title" className="text-sm text-slate-600 mb-2 block">Title</Label>
            <Input
              id="title"
              placeholder="What are you selling?"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="h-12 rounded-xl"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-sm text-slate-600 mb-2 block">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your item..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="min-h-[80px] rounded-xl resize-none"
            />
          </div>

          {/* Price */}
          <div>
            <Label className="text-sm text-slate-600 mb-2 block">Price ($ASC)</Label>
            <div className="relative">
              <Coins className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500" />
              <Input
                type="number"
                placeholder="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="h-12 rounded-xl pl-10"
              />
            </div>
          </div>

          {/* Category & Condition */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-slate-600 mb-2 block">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Select" />
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
            <div>
              <Label className="text-sm text-slate-600 mb-2 block">Condition</Label>
              <Select
                value={formData.condition}
                onValueChange={(value) => setFormData({ ...formData, condition: value })}
              >
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map(cond => (
                    <SelectItem key={cond.value} value={cond.value}>
                      {cond.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Location */}
          <div>
            <Label className="text-sm text-slate-600 mb-2 block">Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="City, State or ZIP"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="h-12 rounded-xl pl-10"
              />
            </div>
          </div>

          {/* Shipping Options */}
          <div>
            <Label className="text-sm text-slate-600 mb-2 block">Shipping Options</Label>
            <div className="grid grid-cols-2 gap-3">
              {['local_pickup', 'standard', 'express', 'international'].map(opt => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.shipping_options.includes(opt)}
                    onCheckedChange={(checked) => {
                      const newOptions = checked
                        ? [...formData.shipping_options, opt]
                        : formData.shipping_options.filter(o => o !== opt);
                      setFormData({ ...formData, shipping_options: newOptions });
                    }}
                  />
                  <span className="text-sm text-slate-700 capitalize">{opt.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Allow Offers */}
          <div className="flex items-center justify-between">
            <Label htmlFor="offers" className="text-sm text-slate-600">Allow Offers</Label>
            <Switch
              id="offers"
              checked={formData.allows_offers}
              onCheckedChange={(checked) => setFormData({ ...formData, allows_offers: checked })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 pt-0">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.title.trim() || !formData.price}
            className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl px-6"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'List Item'
            )}
          </Button>
        </div>
      </DialogContent>

      {/* AI Assistant Modal */}
      <AIAssistantModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        mode="listing"
        imageUrl={imagePreviews[0]}
        existingContent={formData.description}
        onApply={handleAIApply}
      />
    </Dialog>
  );
}