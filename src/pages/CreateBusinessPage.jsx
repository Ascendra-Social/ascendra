import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Upload, Loader2, CheckCircle } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const categories = [
  'retail', 'food_beverage', 'technology', 'health_wellness', 
  'education', 'entertainment', 'finance', 'real_estate', 
  'automotive', 'services', 'other'
];

export default function CreateBusinessPage() {
  const { user, isLoadingAuth } = useAuth();
  const [formData, setFormData] = useState({
    business_name: '',
    business_category: '',
    description: '',
    website: '',
    email: '',
    phone: '',
    location: ''
  });
  const [logoFile, setLogoFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [coverPreview, setCoverPreview] = useState('');
  const [uploading, setUploading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview('');
      return;
    }
    const nextUrl = URL.createObjectURL(logoFile);
    setLogoPreview(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [logoFile]);

  useEffect(() => {
    if (!coverFile) {
      setCoverPreview('');
      return;
    }
    const nextUrl = URL.createObjectURL(coverFile);
    setCoverPreview(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [coverFile]);

  const createBusinessMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error('You must be logged in to create a business page.');
      }

      setUploading(true);

      let logoUrl = '';
      let coverUrl = '';

      if (logoFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: logoFile });
        logoUrl = file_url;
      }

      if (coverFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: coverFile });
        coverUrl = file_url;
      }

      return base44.entities.BusinessPage.create({
        owner_id: user.id,
        ...formData,
        logo_url: logoUrl,
        cover_image_url: coverUrl,
      });
    },
    onSuccess: (business) => {
      setUploading(false);
      toast.success('Business page created! Pending review.');
      navigate(createPageUrl(`BusinessPage?id=${business.id}`));
    },
    onError: (error) => {
      setUploading(false);
      toast.error(error?.message || 'Failed to create business page');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.business_name || !formData.business_category) {
      toast.error('Please fill in required fields');
      return;
    }
    createBusinessMutation.mutate();
  };

  if (isLoadingAuth || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-slate-100 p-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Create Business Page</h1>
            <p className="text-slate-500 text-sm">Get verified and start advertising</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo Upload */}
          <div>
            <Label>Business Logo</Label>
            <div className="mt-2 flex items-center gap-4">
              {logoPreview && (
                <img 
                  src={logoPreview} 
                  className="w-20 h-20 rounded-xl object-cover"
                  alt="Logo preview"
                />
              )}
              <label className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">Upload Logo</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setLogoFile(e.target.files[0])}
                />
              </label>
            </div>
          </div>

          {/* Cover Image Upload */}
          <div>
            <Label>Cover Image</Label>
            <div className="mt-2">
              {coverPreview && (
                <img 
                  src={coverPreview} 
                  className="w-full h-40 rounded-xl object-cover mb-2"
                  alt="Cover preview"
                />
              )}
              <label className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors inline-flex">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">Upload Cover</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setCoverFile(e.target.files[0])}
                />
              </label>
            </div>
          </div>

          <div>
            <Label>Business Name *</Label>
            <Input
              value={formData.business_name}
              onChange={(e) => setFormData({...formData, business_name: e.target.value})}
              placeholder="Enter business name"
              required
            />
          </div>

          <div>
            <Label>Category *</Label>
            <Select 
              value={formData.business_category} 
              onValueChange={(val) => setFormData({...formData, business_category: val})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Tell us about your business"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Website</Label>
              <Input
                value={formData.website}
                onChange={(e) => setFormData({...formData, website: e.target.value})}
                placeholder="https://example.com"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>

          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="contact@business.com"
            />
          </div>

          <div>
            <Label>Location</Label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              placeholder="City, Country"
            />
          </div>

          <Button
            type="submit"
            disabled={createBusinessMutation.isPending || uploading}
            className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white h-12 text-base"
          >
            {uploading || createBusinessMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Create Business Page
              </>
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}