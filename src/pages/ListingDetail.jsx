import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  ArrowLeft, Heart, Share2, MessageCircle, Coins, 
  ChevronLeft, ChevronRight, Shield, Clock
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function ListingDetail() {
  const [user, setUser] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const navigate = useNavigate();

  const urlParams = new URLSearchParams(window.location.search);
  const listingId = urlParams.get('id');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (e) {
        console.log('Not logged in');
      }
    };
    loadUser();
  }, []);

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', listingId],
    queryFn: async () => {
      const listings = await base44.entities.MarketplaceListing.filter({ id: listingId });
      return listings[0];
    },
    enabled: !!listingId
  });

  const conditionLabels = {
    new: 'Brand New',
    like_new: 'Like New',
    good: 'Good Condition',
    fair: 'Fair Condition',
    poor: 'Poor Condition'
  };

  const conditionColors = {
    new: 'bg-green-100 text-green-700',
    like_new: 'bg-emerald-100 text-emerald-700',
    good: 'bg-blue-100 text-blue-700',
    fair: 'bg-amber-100 text-amber-700',
    poor: 'bg-red-100 text-red-700'
  };

  const nextImage = () => {
    if (listing?.images?.length > 1) {
      setCurrentImageIndex((prev) => 
        prev === listing.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (listing?.images?.length > 1) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? listing.images.length - 1 : prev - 1
      );
    }
  };

  if (isLoading || !listing) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Skeleton className="h-96 rounded-3xl mb-6" />
        <Skeleton className="h-24 rounded-2xl mb-4" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Back button */}
      <Link 
        to={createPageUrl('Marketplace')} 
        className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Marketplace
      </Link>

      {/* Image Gallery */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative aspect-square rounded-3xl overflow-hidden bg-slate-100 mb-6"
      >
        {listing.images?.length > 0 ? (
          <>
            <AnimatePresence mode="wait">
              <motion.img
                key={currentImageIndex}
                src={listing.images[currentImageIndex]}
                alt={listing.title}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full object-cover"
              />
            </AnimatePresence>

            {listing.images.length > 1 && (
              <>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/80 backdrop-blur hover:bg-white"
                  onClick={prevImage}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/80 backdrop-blur hover:bg-white"
                  onClick={nextImage}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>

                {/* Dots */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {listing.images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImageIndex(i)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        i === currentImageIndex 
                          ? 'bg-white w-6' 
                          : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-8xl">🛍️</span>
          </div>
        )}

        {/* Quick actions */}
        <div className="absolute top-4 right-4 flex gap-2">
          <Button
            size="icon"
            variant="secondary"
            className="rounded-full bg-white/80 backdrop-blur hover:bg-white"
            onClick={() => setIsFavorited(!isFavorited)}
          >
            <Heart className={`w-5 h-5 ${isFavorited ? 'fill-rose-500 text-rose-500' : ''}`} />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="rounded-full bg-white/80 backdrop-blur hover:bg-white"
          >
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
      </motion.div>

      {/* Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-slate-100 p-6 mb-4"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">{listing.title}</h1>
            <div className="flex items-center gap-3">
              {listing.condition && (
                <Badge className={`${conditionColors[listing.condition]} border-0`}>
                  {conditionLabels[listing.condition]}
                </Badge>
              )}
              <Badge variant="outline" className="flex items-center gap-1 text-slate-500">
                <Clock className="w-3 h-3" />
                {listing.created_date && formatDistanceToNow(new Date(listing.created_date), { addSuffix: true })}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            {listing.currency === 'TOKEN' ? (
              <div className="flex items-center gap-2 text-2xl font-bold text-amber-600">
                <Coins className="w-6 h-6" />
                {listing.price_in_tokens?.toLocaleString()} VIBE
              </div>
            ) : (
              <p className="text-2xl font-bold text-slate-900">
                ${listing.price?.toLocaleString()}
              </p>
            )}
            {listing.currency === 'USD' && listing.price_in_tokens && (
              <p className="text-sm text-slate-400 flex items-center justify-end gap-1">
                or <Coins className="w-3 h-3" /> {listing.price_in_tokens} VIBE
              </p>
            )}
          </div>
        </div>

        <p className="text-slate-600 leading-relaxed mb-6">{listing.description}</p>

        {/* Seller */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
          <Link 
            to={createPageUrl(`Profile?id=${listing.seller_id}`)}
            className="flex items-center gap-3"
          >
            <Avatar className="w-12 h-12">
              <AvatarImage src={listing.seller_avatar} />
              <AvatarFallback className="bg-gradient-to-br from-violet-400 to-pink-400 text-white">
                {listing.seller_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-slate-800">{listing.seller_name}</p>
              <p className="text-sm text-slate-500">Seller</p>
            </div>
          </Link>
          <Button variant="outline" className="rounded-full gap-2">
            <MessageCircle className="w-4 h-4" />
            Message
          </Button>
        </div>
      </motion.div>

      {/* Trust Badge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-100 mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <Shield className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-green-800">Protected Purchase</p>
            <p className="text-sm text-green-600">All transactions are secured with blockchain escrow</p>
          </div>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex gap-3"
      >
        <Button className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white text-lg font-semibold">
          Buy Now
        </Button>
        <Button variant="outline" className="flex-1 h-14 rounded-2xl text-lg font-semibold">
          Make Offer
        </Button>
      </motion.div>
    </div>
  );
}