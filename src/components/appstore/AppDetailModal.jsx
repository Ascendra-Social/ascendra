import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Star, Download, ExternalLink, Github, FileText, 
  Coins, Check, ShoppingCart, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

export default function AppDetailModal({ app, open, onClose, user }) {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const queryClient = useQueryClient();

  const { data: hasPurchased } = useQuery({
    queryKey: ['app-purchase', app?.id, user?.id],
    queryFn: async () => {
      if (!app || !user) return false;
      const purchases = await base44.entities.AppPurchase.filter({
        app_id: app.id,
        buyer_id: user.id
      });
      return purchases.length > 0;
    },
    enabled: !!app && !!user && open
  });

  const { data: reviews } = useQuery({
    queryKey: ['app-reviews', app?.id],
    queryFn: () => base44.entities.AppReview.filter({ app_id: app?.id }, '-created_date', 20),
    enabled: !!app && open
  });

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      setIsPurchasing(true);
      
      // Check wallet balance
      const wallets = await base44.entities.TokenWallet.filter({ user_id: user.id });
      const wallet = wallets[0];
      
      if (app.currency === 'ASCENDRA' && wallet.balance < app.price) {
        throw new Error('Insufficient ASCENDRA tokens');
      }

      // Deduct from buyer
      if (app.currency === 'ASCENDRA') {
        await base44.entities.TokenWallet.update(wallet.id, {
          balance: wallet.balance - app.price
        });

        // Record buyer transaction
        await base44.entities.TokenTransaction.create({
          user_id: user.id,
          type: 'purchase',
          amount: -app.price,
          description: `Purchased ${app.title}`,
          reference_id: app.id
        });

        // Credit developer
        const devWallets = await base44.entities.TokenWallet.filter({ user_id: app.developer_id });
        if (devWallets.length > 0) {
          await base44.entities.TokenWallet.update(devWallets[0].id, {
            balance: devWallets[0].balance + app.price,
            lifetime_earnings: devWallets[0].lifetime_earnings + app.price
          });

          await base44.entities.TokenTransaction.create({
            user_id: app.developer_id,
            type: 'sale',
            amount: app.price,
            description: `Sale of ${app.title}`,
            reference_id: app.id
          });
        }
      }

      // Create purchase record
      await base44.entities.AppPurchase.create({
        app_id: app.id,
        app_title: app.title,
        buyer_id: user.id,
        developer_id: app.developer_id,
        amount: app.price,
        currency: app.currency
      });

      // Update download count
      await base44.entities.AppMarketplace.update(app.id, {
        downloads: (app.downloads || 0) + 1
      });
    },
    onSuccess: () => {
      toast.success('Purchase successful!', {
        description: 'The app has been added to your library'
      });
      queryClient.invalidateQueries(['app-purchase']);
      queryClient.invalidateQueries(['apps']);
      queryClient.invalidateQueries(['wallet']);
      setIsPurchasing(false);
      onClose();
    },
    onError: (error) => {
      toast.error('Purchase failed', {
        description: error.message
      });
      setIsPurchasing(false);
    }
  });

  if (!app) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-100 to-purple-100 flex items-center justify-center border border-slate-200">
              {app.icon_url ? (
                <img src={app.icon_url} alt={app.title} className="w-16 h-16 rounded-xl object-cover" />
              ) : (
                <span className="text-3xl font-bold bg-gradient-to-br from-cyan-600 to-purple-600 bg-clip-text text-transparent">
                  {app.title[0]}
                </span>
              )}
            </div>
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-2">{app.title}</DialogTitle>
              <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={app.developer_avatar} />
                  <AvatarFallback>{app.developer_name?.[0] || 'D'}</AvatarFallback>
                </Avatar>
                <span>{app.developer_name}</span>
                <span className="text-slate-400">•</span>
                <span>v{app.version}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-gradient-to-r from-cyan-100 to-purple-100 text-cyan-700 border-0">
                  {app.category}
                </Badge>
                {app.featured && (
                  <Badge className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white border-0">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Featured
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-xl bg-slate-50">
              <div className="flex items-center justify-center gap-1 text-amber-500 mb-1">
                <Star className="w-4 h-4 fill-amber-500" />
                <span className="font-bold text-slate-900">
                  {app.rating > 0 ? app.rating.toFixed(1) : 'New'}
                </span>
              </div>
              <p className="text-xs text-slate-500">{app.reviews_count} reviews</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-slate-50">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Download className="w-4 h-4 text-cyan-500" />
                <span className="font-bold text-slate-900">
                  {app.downloads > 0 ? app.downloads.toLocaleString() : '0'}
                </span>
              </div>
              <p className="text-xs text-slate-500">Downloads</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-slate-50">
              <div className="flex items-center justify-center gap-1 mb-1">
                {app.price === 0 ? (
                  <span className="font-bold text-green-600">Free</span>
                ) : (
                  <>
                    <span className="font-bold bg-gradient-to-r from-cyan-600 to-purple-600 bg-clip-text text-transparent">
                      {app.price}
                    </span>
                    {app.currency === 'ASCENDRA' && <Coins className="w-4 h-4 text-cyan-500" />}
                  </>
                )}
              </div>
              <p className="text-xs text-slate-500">{app.currency === 'ASCENDRA' ? 'ASCENDRA' : 'USD'}</p>
            </div>
          </div>

          {/* Images */}
          {app.images && app.images.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {app.images.slice(0, 4).map((img, i) => (
                <img 
                  key={i} 
                  src={img} 
                  alt={`Screenshot ${i + 1}`}
                  className="w-full h-48 object-cover rounded-xl border border-slate-200"
                />
              ))}
            </div>
          )}

          <Tabs defaultValue="description" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>
            
            <TabsContent value="description" className="space-y-4">
              <p className="text-slate-700 leading-relaxed">{app.description}</p>
              
              <div className="flex gap-3">
                {app.demo_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={app.demo_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Demo
                    </a>
                  </Button>
                )}
                {app.documentation_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={app.documentation_url} target="_blank" rel="noopener noreferrer">
                      <FileText className="w-4 h-4 mr-2" />
                      Docs
                    </a>
                  </Button>
                )}
                {app.github_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={app.github_url} target="_blank" rel="noopener noreferrer">
                      <Github className="w-4 h-4 mr-2" />
                      GitHub
                    </a>
                  </Button>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="features" className="space-y-2">
              {app.features && app.features.length > 0 ? (
                app.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-slate-50">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">{feature}</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-center py-8">No features listed</p>
              )}
            </TabsContent>
            
            <TabsContent value="reviews" className="space-y-4">
              {reviews && reviews.length > 0 ? (
                reviews.map((review) => (
                  <div key={review.id} className="p-4 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={review.user_avatar} />
                        <AvatarFallback>{review.user_name?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{review.user_name}</p>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3 h-3 ${i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`}
                            />
                          ))}
                        </div>
                      </div>
                      {review.verified_purchase && (
                        <Badge variant="outline" className="text-xs">
                          <Check className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    {review.review_text && (
                      <p className="text-sm text-slate-600">{review.review_text}</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-center py-8">No reviews yet</p>
              )}
            </TabsContent>
          </Tabs>

          {/* Purchase Button */}
          <div className="sticky bottom-0 bg-white pt-4 border-t border-slate-200">
            {hasPurchased ? (
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white" disabled>
                <Check className="w-5 h-5 mr-2" />
                Already Purchased
              </Button>
            ) : (
              <Button 
                onClick={() => purchaseMutation.mutate()}
                disabled={isPurchasing || !user}
                className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white"
              >
                {isPurchasing ? (
                  'Processing...'
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    {app.price === 0 ? 'Install for Free' : `Purchase for ${app.price} ${app.currency === 'ASCENDRA' ? 'ASCENDRA' : 'USD'}`}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}