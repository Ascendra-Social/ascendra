import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Filter, Grid, List, Coins } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import ListingCard from '@/components/marketplace/ListingCard';
import CreateListingModal from '@/components/marketplace/CreateListingModal';
import { motion } from 'framer-motion';

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'home', label: 'Home & Garden' },
  { value: 'art', label: 'Art' },
  { value: 'collectibles', label: 'Collectibles' },
  { value: 'services', label: 'Services' },
  { value: 'digital', label: 'Digital Goods' },
  { value: 'other', label: 'Other' },
];

export default function Marketplace() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [currency, setCurrency] = useState('all');
  const [location, setLocation] = useState('');
  const [shipping, setShipping] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  const { data: listings, isLoading, refetch } = useQuery({
    queryKey: ['listings', category, currency],
    queryFn: async () => {
      let query = { status: 'active' };
      if (category !== 'all') query.category = category;
      if (currency !== 'all') query.currency = currency;
      
      return base44.entities.MarketplaceListing.filter(query, '-created_date', 50);
    }
  });

  const filteredListings = listings?.filter(listing => {
    const matchesSearch = listing.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         listing.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = !location || listing.location?.toLowerCase().includes(location.toLowerCase());
    const matchesShipping = shipping === 'all' || listing.shipping_options?.includes(shipping);
    
    return matchesSearch && matchesLocation && matchesShipping;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Marketplace</h1>
          <p className="text-slate-500">Buy & sell with VIBE tokens or USD</p>
        </div>
        {user && (
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-full gap-2"
          >
            <Plus className="w-4 h-4" />
            Sell Something
          </Button>
        )}
      </div>

      {/* Currency Toggle */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Badge 
          onClick={() => setCurrency('all')}
          className={`cursor-pointer px-4 py-2 rounded-full ${
            currency === 'all' 
              ? 'bg-violet-500 text-white' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All
        </Badge>
        <Badge 
          onClick={() => setCurrency('USD')}
          className={`cursor-pointer px-4 py-2 rounded-full ${
            currency === 'USD' 
              ? 'bg-green-500 text-white' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          💵 USD
        </Badge>
        <Badge 
          onClick={() => setCurrency('TOKEN')}
          className={`cursor-pointer px-4 py-2 rounded-full flex items-center gap-1 ${
            currency === 'TOKEN' 
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Coins className="w-3 h-3" />
          VIBE Tokens
        </Badge>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search listings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 rounded-2xl border-slate-200 bg-white"
            />
          </div>

          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full md:w-48 h-12 rounded-2xl">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <Input
            placeholder="Filter by location..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="h-10 rounded-xl border-slate-200"
          />

          <Select value={shipping} onValueChange={setShipping}>
            <SelectTrigger className="w-full md:w-48 h-10 rounded-xl">
              <SelectValue placeholder="Shipping" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Shipping</SelectItem>
              <SelectItem value="local_pickup">Local Pickup</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="express">Express</SelectItem>
              <SelectItem value="international">International</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Listings Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-2xl" />
          ))}
        </div>
      ) : filteredListings?.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredListings.map((listing, i) => (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <ListingCard listing={listing} />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center mb-6">
            <span className="text-5xl">🛍️</span>
          </div>
          <h3 className="text-xl font-semibold text-slate-700 mb-2">No listings found</h3>
          <p className="text-slate-500 mb-6">Be the first to sell something!</p>
          {user && (
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-full"
            >
              Create Listing
            </Button>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateListingModal 
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          user={user}
          onCreated={() => {
            refetch();
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}