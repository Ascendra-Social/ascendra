import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Download, Loader2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const productTypeColors = {
  ebook: 'bg-blue-500/20 text-blue-400',
  course: 'bg-purple-500/20 text-purple-400',
  template: 'bg-cyan-500/20 text-cyan-400',
  audio: 'bg-pink-500/20 text-pink-400',
  video: 'bg-red-500/20 text-red-400',
  software: 'bg-green-500/20 text-green-400',
  art: 'bg-amber-500/20 text-amber-400',
  other: 'bg-slate-500/20 text-slate-400'
};

export default function DigitalProductsGrid({ creatorId, currentUserId }) {
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ['digital-products', creatorId],
    queryFn: () => base44.entities.DigitalProduct.filter({ creator_id: creatorId, is_active: true })
  });

  const { data: myPurchases } = useQuery({
    queryKey: ['my-purchases', currentUserId],
    queryFn: () => base44.entities.ProductPurchase.filter({ buyer_id: currentUserId }),
    enabled: !!currentUserId
  });

  const { data: wallet } = useQuery({
    queryKey: ['wallet', currentUserId],
    queryFn: async () => {
      const wallets = await base44.entities.TokenWallet.filter({ user_id: currentUserId });
      return wallets[0];
    },
    enabled: !!currentUserId
  });

  const purchaseMutation = useMutation({
    mutationFn: async (product) => {
      if (product.price > (wallet?.balance || 0)) {
        throw new Error('Insufficient balance');
      }

      // Process wallet transaction via backend
      await base44.functions.invoke('processWalletTransaction', {
        transaction_type: 'digital_product',
        amount: product.price,
        recipient_id: product.creator_id,
        description: `Purchased: ${product.title}`,
        reference_id: product.id
      });

      // Create purchase record
      const purchase = await base44.entities.ProductPurchase.create({
        buyer_id: currentUserId,
        product_id: product.id,
        product_title: product.title,
        creator_id: product.creator_id,
        amount_paid: product.price,
        download_url: product.file_url
      });

      // Update product sales count
      await base44.entities.DigitalProduct.update(product.id, {
        sales_count: (product.sales_count || 0) + 1
      });

      return purchase;
    },
    onSuccess: (purchase) => {
      queryClient.invalidateQueries({ queryKey: ['digital-products'] });
      queryClient.invalidateQueries({ queryKey: ['my-purchases'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast.success('Purchase successful! Check your purchases to download.');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to purchase');
    }
  });

  if (isLoading) return null;
  if (!products || products.length === 0) return null;

  const hasPurchased = (productId) => {
    return myPurchases?.some(p => p.product_id === productId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShoppingBag className="w-5 h-5 text-cyan-400" />
        <h3 className="text-lg font-semibold text-white">Digital Products</h3>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {products.map((product, i) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="bg-slate-800/50 border-cyan-500/20 hover:border-cyan-500/40 transition-all overflow-hidden">
              {product.thumbnail_url && (
                <div className="aspect-video bg-slate-900/50 overflow-hidden">
                  <img 
                    src={product.thumbnail_url} 
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-white line-clamp-2">{product.title}</h4>
                  <Badge className={productTypeColors[product.type]}>
                    {product.type}
                  </Badge>
                </div>
                <p className="text-sm text-slate-300 line-clamp-2">{product.description}</p>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-white">{product.price} $ASC</span>
                  {product.rating > 0 && (
                    <div className="flex items-center gap-1 text-sm text-slate-400">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      {product.rating.toFixed(1)}
                    </div>
                  )}
                </div>

                {hasPurchased(product.id) ? (
                  <Button
                    variant="outline"
                    className="w-full border-green-500/30 text-green-400"
                    disabled
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Purchased
                  </Button>
                ) : (
                  <Button
                    onClick={() => purchaseMutation.mutate(product)}
                    disabled={purchaseMutation.isPending || !currentUserId || product.creator_id === currentUserId}
                    className="w-full bg-gradient-to-r from-cyan-500 to-purple-500"
                  >
                    {purchaseMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        Buy Now
                      </>
                    )}
                  </Button>
                )}

                <p className="text-xs text-slate-500 text-center">
                  {product.sales_count || 0} sales
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}