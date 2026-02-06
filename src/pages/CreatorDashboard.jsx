import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, Crown, ShoppingBag, TrendingUp, DollarSign, 
  Users, Loader2, Edit2, Trash2, Upload 
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function CreatorDashboard() {
  const [user, setUser] = useState(null);
  const [showTierModal, setShowTierModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingTier, setEditingTier] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const queryClient = useQueryClient();

  const [tierForm, setTierForm] = useState({
    name: '',
    description: '',
    price_monthly: '',
    price_annual: '',
    benefits: [''],
    exclusive_badge: ''
  });

  const [productForm, setProductForm] = useState({
    title: '',
    description: '',
    type: 'ebook',
    price: '',
    thumbnail_url: '',
    file_url: ''
  });

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

  const { data: tiers } = useQuery({
    queryKey: ['my-tiers', user?.id],
    queryFn: () => base44.entities.CreatorTier.filter({ creator_id: user?.id }),
    enabled: !!user
  });

  const { data: products } = useQuery({
    queryKey: ['my-products', user?.id],
    queryFn: () => base44.entities.DigitalProduct.filter({ creator_id: user?.id }),
    enabled: !!user
  });

  const { data: subscriptions } = useQuery({
    queryKey: ['my-subscriptions', user?.id],
    queryFn: () => base44.entities.CreatorSubscription.filter({ creator_id: user?.id, status: 'active' }),
    enabled: !!user
  });

  const { data: sales } = useQuery({
    queryKey: ['my-sales', user?.id],
    queryFn: () => base44.entities.ProductPurchase.filter({ creator_id: user?.id }),
    enabled: !!user
  });

  const { data: tips } = useQuery({
    queryKey: ['my-tips', user?.id],
    queryFn: () => base44.entities.Tip.filter({ recipient_id: user?.id }),
    enabled: !!user
  });

  const createTierMutation = useMutation({
    mutationFn: async (data) => {
      if (editingTier) {
        await base44.entities.CreatorTier.update(editingTier.id, data);
      } else {
        await base44.entities.CreatorTier.create({
          ...data,
          creator_id: user.id
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tiers'] });
      toast.success(editingTier ? 'Tier updated!' : 'Tier created!');
      setShowTierModal(false);
      setEditingTier(null);
      resetTierForm();
    }
  });

  const createProductMutation = useMutation({
    mutationFn: async (data) => {
      if (editingProduct) {
        await base44.entities.DigitalProduct.update(editingProduct.id, data);
      } else {
        await base44.entities.DigitalProduct.create({
          ...data,
          creator_id: user.id,
          creator_name: user.full_name
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-products'] });
      toast.success(editingProduct ? 'Product updated!' : 'Product created!');
      setShowProductModal(false);
      setEditingProduct(null);
      resetProductForm();
    }
  });

  const deleteTierMutation = useMutation({
    mutationFn: (id) => base44.entities.CreatorTier.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tiers'] });
      toast.success('Tier deleted');
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id) => base44.entities.DigitalProduct.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-products'] });
      toast.success('Product deleted');
    }
  });

  const handleFileUpload = async (e, field) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setProductForm({ ...productForm, [field]: file_url });
        toast.success('File uploaded!');
      } catch (error) {
        toast.error('Upload failed');
      }
    }
  };

  const resetTierForm = () => {
    setTierForm({
      name: '',
      description: '',
      price_monthly: '',
      price_annual: '',
      benefits: [''],
      exclusive_badge: ''
    });
  };

  const resetProductForm = () => {
    setProductForm({
      title: '',
      description: '',
      type: 'ebook',
      price: '',
      thumbnail_url: '',
      file_url: ''
    });
  };

  const totalRevenue = [
    ...(subscriptions || []).map(s => s.amount_paid),
    ...(sales || []).map(s => s.amount_paid),
    ...(tips || []).map(t => t.amount)
  ].reduce((sum, val) => sum + val, 0);

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Creator Dashboard</h1>
        <p className="text-slate-400">Manage your monetization</p>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-slate-800/50 border-cyan-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-white">{totalRevenue} $ASC</p>
            <p className="text-sm text-slate-400">Total Revenue</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-cyan-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-cyan-400" />
            </div>
            <p className="text-2xl font-bold text-white">{subscriptions?.length || 0}</p>
            <p className="text-sm text-slate-400">Subscribers</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-cyan-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <ShoppingBag className="w-8 h-8 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-white">{sales?.length || 0}</p>
            <p className="text-sm text-slate-400">Sales</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-cyan-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-white">{tips?.length || 0}</p>
            <p className="text-sm text-slate-400">Tips Received</p>
          </CardContent>
        </Card>
      </div>

      {/* Management Tabs */}
      <Tabs defaultValue="tiers">
        <TabsList className="bg-slate-800/50 border border-cyan-500/20 mb-6">
          <TabsTrigger value="tiers" className="text-slate-400 data-[state=active]:text-cyan-400">
            <Crown className="w-4 h-4 mr-2" />
            Subscription Tiers
          </TabsTrigger>
          <TabsTrigger value="products" className="text-slate-400 data-[state=active]:text-cyan-400">
            <ShoppingBag className="w-4 h-4 mr-2" />
            Digital Products
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tiers">
          <div className="space-y-4">
            <Button
              onClick={() => setShowTierModal(true)}
              className="bg-gradient-to-r from-cyan-500 to-purple-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Tier
            </Button>

            <div className="grid md:grid-cols-2 gap-4">
              {tiers?.map((tier) => (
                <Card key={tier.id} className="bg-slate-800/50 border-cyan-500/20">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-white">{tier.name}</h3>
                        <p className="text-sm text-slate-300 mt-1">{tier.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditingTier(tier);
                            setTierForm(tier);
                            setShowTierModal(true);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteTierMutation.mutate(tier.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-bold text-white mb-2">
                      {tier.price_monthly} $ASC/month
                    </p>
                    <Badge className="bg-cyan-500/20 text-cyan-400">
                      {tier.subscriber_count || 0} subscribers
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="products">
          <div className="space-y-4">
            <Button
              onClick={() => setShowProductModal(true)}
              className="bg-gradient-to-r from-cyan-500 to-purple-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Product
            </Button>

            <div className="grid md:grid-cols-3 gap-4">
              {products?.map((product) => (
                <Card key={product.id} className="bg-slate-800/50 border-cyan-500/20">
                  {product.thumbnail_url && (
                    <img 
                      src={product.thumbnail_url} 
                      alt={product.title}
                      className="w-full aspect-video object-cover"
                    />
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-white">{product.title}</h3>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditingProduct(product);
                            setProductForm(product);
                            setShowProductModal(true);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteProductMutation.mutate(product.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-bold text-white mb-2">
                      {product.price} $ASC
                    </p>
                    <Badge className="bg-purple-500/20 text-purple-400">
                      {product.sales_count || 0} sales
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Tier Modal */}
      <Dialog open={showTierModal} onOpenChange={setShowTierModal}>
        <DialogContent className="bg-slate-800 border-cyan-500/20 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingTier ? 'Edit Tier' : 'Create Subscription Tier'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder="Tier name"
              value={tierForm.name}
              onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })}
              className="bg-slate-900/50 border-cyan-500/20 text-white"
            />
            <Textarea
              placeholder="Description"
              value={tierForm.description}
              onChange={(e) => setTierForm({ ...tierForm, description: e.target.value })}
              className="bg-slate-900/50 border-cyan-500/20 text-white"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                placeholder="Monthly price ($ASC)"
                value={tierForm.price_monthly}
                onChange={(e) => setTierForm({ ...tierForm, price_monthly: parseFloat(e.target.value) })}
                className="bg-slate-900/50 border-cyan-500/20 text-white"
              />
              <Input
                type="number"
                placeholder="Annual price ($ASC)"
                value={tierForm.price_annual}
                onChange={(e) => setTierForm({ ...tierForm, price_annual: parseFloat(e.target.value) })}
                className="bg-slate-900/50 border-cyan-500/20 text-white"
              />
            </div>
            <Input
              placeholder="Badge (optional)"
              value={tierForm.exclusive_badge}
              onChange={(e) => setTierForm({ ...tierForm, exclusive_badge: e.target.value })}
              className="bg-slate-900/50 border-cyan-500/20 text-white"
            />
            
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Benefits</label>
              {tierForm.benefits.map((benefit, i) => (
                <Input
                  key={i}
                  placeholder={`Benefit ${i + 1}`}
                  value={benefit}
                  onChange={(e) => {
                    const newBenefits = [...tierForm.benefits];
                    newBenefits[i] = e.target.value;
                    setTierForm({ ...tierForm, benefits: newBenefits });
                  }}
                  className="bg-slate-900/50 border-cyan-500/20 text-white"
                />
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTierForm({ ...tierForm, benefits: [...tierForm.benefits, ''] })}
                className="border-cyan-500/30"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Benefit
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => createTierMutation.mutate(tierForm)}
                disabled={createTierMutation.isPending}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500"
              >
                {createTierMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  editingTier ? 'Update' : 'Create'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowTierModal(false);
                  setEditingTier(null);
                  resetTierForm();
                }}
                className="border-cyan-500/30"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Product Modal */}
      <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
        <DialogContent className="bg-slate-800 border-cyan-500/20 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingProduct ? 'Edit Product' : 'Create Digital Product'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder="Product title"
              value={productForm.title}
              onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
              className="bg-slate-900/50 border-cyan-500/20 text-white"
            />
            <Textarea
              placeholder="Description"
              value={productForm.description}
              onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
              className="bg-slate-900/50 border-cyan-500/20 text-white"
            />
            <div className="grid grid-cols-2 gap-4">
              <Select value={productForm.type} onValueChange={(val) => setProductForm({ ...productForm, type: val })}>
                <SelectTrigger className="bg-slate-900/50 border-cyan-500/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ebook">eBook</SelectItem>
                  <SelectItem value="course">Course</SelectItem>
                  <SelectItem value="template">Template</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
                  <SelectItem value="art">Art</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Price ($ASC)"
                value={productForm.price}
                onChange={(e) => setProductForm({ ...productForm, price: parseFloat(e.target.value) })}
                className="bg-slate-900/50 border-cyan-500/20 text-white"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Thumbnail</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Thumbnail URL"
                  value={productForm.thumbnail_url}
                  onChange={(e) => setProductForm({ ...productForm, thumbnail_url: e.target.value })}
                  className="flex-1 bg-slate-900/50 border-cyan-500/20 text-white"
                />
                <label>
                  <Button variant="outline" className="border-cyan-500/30" asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'thumbnail_url')}
                  />
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-300">Product File</label>
              <div className="flex gap-2">
                <Input
                  placeholder="File URL"
                  value={productForm.file_url}
                  onChange={(e) => setProductForm({ ...productForm, file_url: e.target.value })}
                  className="flex-1 bg-slate-900/50 border-cyan-500/20 text-white"
                />
                <label>
                  <Button variant="outline" className="border-cyan-500/30" asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </span>
                  </Button>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'file_url')}
                  />
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => createProductMutation.mutate(productForm)}
                disabled={createProductMutation.isPending}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500"
              >
                {createProductMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  editingProduct ? 'Update' : 'Create'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowProductModal(false);
                  setEditingProduct(null);
                  resetProductForm();
                }}
                className="border-cyan-500/30"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}