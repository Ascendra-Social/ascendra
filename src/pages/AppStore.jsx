import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Filter, Sparkles, TrendingUp, Package } from 'lucide-react';
import AppMarketplaceCard from '@/components/appstore/AppMarketplaceCard';
import AppDetailModal from '@/components/appstore/AppDetailModal';
import CreateAppListingModal from '@/components/appstore/CreateAppListingModal';
import { motion } from 'framer-motion';

export default function AppStore() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedApp, setSelectedApp] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
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

  const { data: apps, isLoading } = useQuery({
    queryKey: ['apps', selectedCategory],
    queryFn: async () => {
      if (selectedCategory === 'all') {
        return await base44.entities.AppMarketplace.filter(
          { status: 'published' },
          '-created_date',
          100
        );
      }
      return await base44.entities.AppMarketplace.filter(
        { status: 'published', category: selectedCategory },
        '-created_date',
        100
      );
    }
  });

  const { data: myApps } = useQuery({
    queryKey: ['my-apps', user?.id],
    queryFn: () => base44.entities.AppMarketplace.filter({ developer_id: user?.id }, '-created_date'),
    enabled: !!user
  });

  const { data: featuredApps } = useQuery({
    queryKey: ['featured-apps'],
    queryFn: () => base44.entities.AppMarketplace.filter(
      { status: 'published', featured: true },
      '-downloads',
      5
    )
  });

  const categories = [
    { value: 'all', label: 'All', icon: Package },
    { value: 'integration', label: 'Integrations', icon: Sparkles },
    { value: 'game', label: 'Games', icon: Package },
    { value: 'productivity', label: 'Productivity', icon: TrendingUp },
    { value: 'social', label: 'Social', icon: Package },
    { value: 'finance', label: 'Finance', icon: Package },
    { value: 'education', label: 'Education', icon: Package },
    { value: 'entertainment', label: 'Entertainment', icon: Package },
    { value: 'utility', label: 'Utility', icon: Package }
  ];

  const filteredApps = apps?.filter(app =>
    app.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAppClick = (app) => {
    setSelectedApp(app);
    setShowDetailModal(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-purple-600 bg-clip-text text-transparent mb-2">
            App Marketplace
          </h1>
          <p className="text-slate-600">Discover and install apps, integrations, and games</p>
        </div>
        {user && (
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white"
          >
            <Plus className="w-5 h-5 mr-2" />
            List Your App
          </Button>
        )}
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative"
      >
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search apps, integrations, games..."
          className="pl-12 h-12 rounded-xl border-slate-200"
        />
      </motion.div>

      {/* Featured Apps */}
      {featuredApps && featuredApps.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-cyan-50 to-purple-50 rounded-2xl p-6 border border-cyan-100"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-cyan-600" />
            <h2 className="text-xl font-semibold text-slate-900">Featured Apps</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredApps.slice(0, 3).map((app) => (
              <AppMarketplaceCard key={app.id} app={app} onClick={() => handleAppClick(app)} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Category Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="w-full overflow-x-auto flex justify-start bg-white border border-slate-200">
            {categories.map((cat) => (
              <TabsTrigger key={cat.value} value={cat.value} className="flex items-center gap-2">
                <cat.icon className="w-4 h-4" />
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Apps Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        ) : filteredApps && filteredApps.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredApps.map((app) => (
              <AppMarketplaceCard key={app.id} app={app} onClick={() => handleAppClick(app)} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No apps found</p>
            <p className="text-slate-400 text-sm">Try adjusting your search or filters</p>
          </div>
        )}
      </motion.div>

      {/* My Apps */}
      {myApps && myApps.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="border-t border-slate-200 pt-6"
        >
          <h2 className="text-xl font-semibold text-slate-900 mb-4">My Apps</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myApps.map((app) => (
              <AppMarketplaceCard key={app.id} app={app} onClick={() => handleAppClick(app)} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Modals */}
      <AppDetailModal
        app={selectedApp}
        open={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedApp(null);
        }}
        user={user}
      />

      <CreateAppListingModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        user={user}
      />
    </div>
  );
}