import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, X, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function CreateAppListingModal({ open, onClose, user, editApp = null }) {
  const [formData, setFormData] = useState(editApp || {
    title: '',
    description: '',
    category: 'integration',
    price: 0,
    currency: 'ASCENDRA',
    version: '1.0.0',
    features: [],
    demo_url: '',
    documentation_url: '',
    github_url: '',
    icon_url: '',
    images: []
  });
  const [newFeature, setNewFeature] = useState('');
  const [uploading, setUploading] = useState(false);

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data) => {
      if (editApp) {
        return await base44.entities.AppMarketplace.update(editApp.id, data);
      } else {
        return await base44.entities.AppMarketplace.create({
          ...data,
          developer_id: user.id,
          developer_name: user.full_name,
          developer_avatar: user.avatar
        });
      }
    },
    onSuccess: () => {
      toast.success(editApp ? 'App updated!' : 'App listed successfully!');
      queryClient.invalidateQueries(['apps']);
      onClose();
    },
    onError: (error) => {
      toast.error('Failed to save app', { description: error.message });
    }
  });

  const handleSubmit = (status = 'draft') => {
    if (!formData.title || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }
    createMutation.mutate({ ...formData, status });
  };

  const handleImageUpload = async (e, type = 'images') => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (type === 'icon') {
        setFormData({ ...formData, icon_url: file_url });
      } else {
        setFormData({ ...formData, images: [...(formData.images || []), file_url] });
      }
      toast.success('Image uploaded!');
    } catch (error) {
      toast.error('Upload failed');
    }
    setUploading(false);
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData({ 
        ...formData, 
        features: [...(formData.features || []), newFeature.trim()] 
      });
      setNewFeature('');
    }
  };

  const removeFeature = (index) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editApp ? 'Edit App Listing' : 'Create App Listing'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>App Icon</Label>
            <div className="flex items-center gap-4 mt-2">
              {formData.icon_url ? (
                <div className="relative">
                  <img src={formData.icon_url} alt="Icon" className="w-20 h-20 rounded-xl object-cover border" />
                  <button
                    onClick={() => setFormData({ ...formData, icon_url: '' })}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-cyan-500 transition-colors">
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'icon')} />
                  <Upload className="w-6 h-6 text-slate-400" />
                </label>
              )}
            </div>
          </div>

          <div>
            <Label>Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="My Awesome App"
            />
          </div>

          <div>
            <Label>Description *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what your app does..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category *</Label>
              <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="integration">Integration</SelectItem>
                  <SelectItem value="game">Game</SelectItem>
                  <SelectItem value="productivity">Productivity</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                  <SelectItem value="utility">Utility</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Version</Label>
              <Input
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                placeholder="1.0.0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Price</Label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={formData.currency} onValueChange={(val) => setFormData({ ...formData, currency: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ASCENDRA">ASCENDRA</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Features</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                placeholder="Add a feature..."
                onKeyPress={(e) => e.key === 'Enter' && addFeature()}
              />
              <Button type="button" onClick={addFeature} size="icon">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.features?.map((feature, i) => (
                <Badge key={i} variant="secondary" className="pl-3 pr-1">
                  {feature}
                  <button onClick={() => removeFeature(i)} className="ml-2">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label>Screenshots</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {formData.images?.map((img, i) => (
                <div key={i} className="relative">
                  <img src={img} alt={`Screenshot ${i + 1}`} className="w-full h-24 object-cover rounded-lg border" />
                  <button
                    onClick={() => setFormData({ ...formData, images: formData.images.filter((_, idx) => idx !== i) })}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {(!formData.images || formData.images.length < 4) && (
                <label className="w-full h-24 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-cyan-500 transition-colors">
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                  <Upload className="w-6 h-6 text-slate-400" />
                </label>
              )}
            </div>
          </div>

          <div>
            <Label>Demo URL (optional)</Label>
            <Input
              value={formData.demo_url}
              onChange={(e) => setFormData({ ...formData, demo_url: e.target.value })}
              placeholder="https://demo.example.com"
            />
          </div>

          <div>
            <Label>Documentation URL (optional)</Label>
            <Input
              value={formData.documentation_url}
              onChange={(e) => setFormData({ ...formData, documentation_url: e.target.value })}
              placeholder="https://docs.example.com"
            />
          </div>

          <div>
            <Label>GitHub URL (optional)</Label>
            <Input
              value={formData.github_url}
              onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
              placeholder="https://github.com/username/repo"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => handleSubmit('draft')}
              variant="outline"
              disabled={createMutation.isPending}
              className="flex-1"
            >
              Save as Draft
            </Button>
            <Button
              onClick={() => handleSubmit('published')}
              disabled={createMutation.isPending}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white"
            >
              {editApp ? 'Update & Publish' : 'Publish Now'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}