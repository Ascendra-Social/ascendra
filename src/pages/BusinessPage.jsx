import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import CreateAdModal from '@/components/ads/CreateAdModal';
import { 
  Building2, MapPin, Globe, Mail, Phone, Users, 
  TrendingUp, CheckCircle, Loader2, Plus
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function BusinessPage() {
  const [searchParams] = useSearchParams();
  const businessId = searchParams.get('id');
  const [user, setUser] = useState(null);
  const [showCreateAd, setShowCreateAd] = useState(false);
  const queryClient = useQueryClient();

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

  const { data: business, isLoading } = useQuery({
    queryKey: ['business', businessId],
    queryFn: async () => {
      const businesses = await base44.entities.BusinessPage.filter({ id: businessId });
      return businesses[0];
    },
    enabled: !!businessId
  });

  const { data: ads } = useQuery({
    queryKey: ['business-ads', businessId],
    queryFn: () => base44.entities.Ad.filter(
      { business_id: businessId },
      '-created_date',
      20
    ),
    enabled: !!businessId
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.BusinessPage.update(business.id, {
        followers_count: (business.followers_count || 0) + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business', businessId] });
    }
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Skeleton className="w-full h-64 rounded-3xl mb-6" />
        <Skeleton className="w-full h-96 rounded-3xl" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <Building2 className="w-16 h-16 mx-auto text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-slate-800 mb-2">Business Not Found</h2>
        <p className="text-slate-500">This business page doesn't exist or has been removed.</p>
      </div>
    );
  }

  const isOwner = user && business.owner_id === user.id;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Cover & Profile */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-slate-100 overflow-hidden"
      >
        {business.cover_image_url && (
          <div className="h-48 bg-gradient-to-br from-cyan-500 to-purple-500">
            <img 
              src={business.cover_image_url} 
              alt={business.business_name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <div className="p-6">
          <div className="flex items-start gap-4 -mt-16 mb-4">
            {business.logo_url ? (
              <img 
                src={business.logo_url}
                alt={business.business_name}
                className="w-24 h-24 rounded-2xl border-4 border-white bg-white object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl border-4 border-white bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                <Building2 className="w-12 h-12 text-white" />
              </div>
            )}
            
            <div className="flex-1 mt-14">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-slate-800">{business.business_name}</h1>
                {business.verified && (
                  <CheckCircle className="w-6 h-6 text-cyan-500 fill-cyan-500" />
                )}
              </div>
              <Badge className="bg-slate-100 text-slate-600">
                {business.business_category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
            </div>

            {isOwner ? (
              <Button 
                onClick={() => setShowCreateAd(true)}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white mt-14"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Ad
              </Button>
            ) : (
              <Button 
                onClick={() => followMutation.mutate()}
                disabled={followMutation.isPending}
                className="mt-14"
              >
                {followMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Users className="w-4 h-4 mr-2" />
                )}
                Follow
              </Button>
            )}
          </div>

          {business.description && (
            <p className="text-slate-600 mb-4">{business.description}</p>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-slate-500">
            {business.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {business.location}
              </div>
            )}
            {business.website && (
              <a 
                href={business.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-cyan-500"
              >
                <Globe className="w-4 h-4" />
                Website
              </a>
            )}
            {business.email && (
              <a 
                href={`mailto:${business.email}`}
                className="flex items-center gap-2 hover:text-cyan-500"
              >
                <Mail className="w-4 h-4" />
                {business.email}
              </a>
            )}
            {business.phone && (
              <a 
                href={`tel:${business.phone}`}
                className="flex items-center gap-2 hover:text-cyan-500"
              >
                <Phone className="w-4 h-4" />
                {business.phone}
              </a>
            )}
          </div>

          <div className="flex gap-6 mt-4 pt-4 border-t border-slate-100">
            <div>
              <p className="text-2xl font-bold text-slate-800">{business.followers_count || 0}</p>
              <p className="text-sm text-slate-500">Followers</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{ads?.length || 0}</p>
              <p className="text-sm text-slate-500">Active Ads</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="ads" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="ads" className="flex-1">Ads</TabsTrigger>
          <TabsTrigger value="about" className="flex-1">About</TabsTrigger>
        </TabsList>

        <TabsContent value="ads" className="space-y-4 mt-6">
          {ads && ads.length > 0 ? (
            ads.map(ad => (
              <motion.div
                key={ad.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-slate-100 p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-800">{ad.title}</h3>
                    <Badge className={
                      ad.status === 'active' ? 'bg-green-100 text-green-700' :
                      ad.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-slate-100 text-slate-600'
                    }>
                      {ad.status}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Budget</p>
                    <p className="font-semibold">{ad.budget_tokens} $ASC</p>
                  </div>
                </div>
                {ad.description && (
                  <p className="text-slate-600 text-sm mb-3">{ad.description}</p>
                )}
                <div className="flex gap-4 text-sm text-slate-500">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    {ad.impressions || 0} impressions
                  </div>
                  <div>
                    {ad.clicks || 0} clicks
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12">
              <TrendingUp className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">No active ads</p>
              {isOwner && (
                <Button 
                  onClick={() => setShowCreateAd(true)}
                  className="mt-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white"
                >
                  Create Your First Ad
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="about" className="mt-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-100 p-6"
          >
            <h3 className="font-semibold text-slate-800 mb-4">About</h3>
            <div className="space-y-3 text-slate-600">
              {business.description && <p>{business.description}</p>}
              <div className="pt-4 space-y-2 border-t border-slate-100">
                {business.business_category && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Category:</span>
                    <span className="font-medium">
                      {business.business_category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Create Ad Modal */}
      {showCreateAd && (
        <CreateAdModal
          isOpen={showCreateAd}
          onClose={() => setShowCreateAd(false)}
          user={user}
          businessId={business.id}
          businessName={business.business_name}
          businessAvatar={business.logo_url}
        />
      )}
    </div>
  );
}