import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { 
  Home, Search, PlusSquare, ShoppingBag, MessageCircle, 
  User, Compass, Play, Wallet, Bell, Menu, X, Users, TrendingUp, Shield, Building2, Bug
} from 'lucide-react';
import CreateModal from '@/components/create/CreateModal';
import AIFloatingButton from '@/components/ai/AIFloatingButton';
import NotificationBell from '@/components/notifications/NotificationBell';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        // Update online status
        await base44.auth.updateMe({ 
          online_status: 'online',
          last_active: new Date().toISOString()
        });
      } catch (e) {
        console.log('Not logged in');
      }
    };
    loadUser();

    // Update last active periodically
    const interval = setInterval(() => {
      base44.auth.me().then(u => {
        if (u) base44.auth.updateMe({ last_active: new Date().toISOString() });
      }).catch(() => {});
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { name: 'Home', icon: Home, page: 'Home' },
    { name: 'Following', icon: Users, page: 'FollowingFeed' },
    { name: 'Explore', icon: Compass, page: 'Explore' },
    { name: 'Reels', icon: Play, page: 'Reels' },
    { name: 'Communities', icon: Users, page: 'Communities' },
    { name: 'App Store', icon: ShoppingBag, page: 'AppStore' },
    { name: 'Marketplace', icon: ShoppingBag, page: 'Marketplace' },
    { name: 'Messages', icon: MessageCircle, page: 'Messages' },
    { name: 'Wallet', icon: Wallet, page: 'Wallet' },
    { name: 'Smart Contracts', icon: TrendingUp, page: 'SmartContracts' },
    { name: 'Creator Dashboard', icon: TrendingUp, page: 'CreatorDashboard' },
    { name: 'Dev Bounty Board', icon: Bug, page: 'FeatureRequests' },
  ];

  const businessNavItems = user ? [
    { name: 'Create Business', icon: Building2, page: 'CreateBusinessPage' },
  ] : [];

  const adminNavItems = user?.role === 'admin' ? [
    { name: 'Verification Review', icon: Shield, page: 'VerificationReview' },
  ] : [];

  const isActive = (page) => currentPageName === page;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <style>{`
        :root {
          --primary: 34 211 238;
          --primary-gradient: linear-gradient(135deg, #22D3EE 0%, #A855F7 100%);
          --glass: rgba(15, 23, 42, 0.7);
        }
        .glass-effect {
          backdrop-filter: blur(20px);
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(34, 211, 238, 0.2);
        }
        .gradient-text {
          background: linear-gradient(135deg, #22D3EE 0%, #A855F7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .token-gradient {
          background: linear-gradient(135deg, #F59E0B 0%, #EF4444 100%);
        }
      `}</style>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-72 flex-col glass-effect border-r border-cyan-500/20 z-50" style={{minHeight: 0}}>
        <div className="p-6 shrink-0">
          <Link to={createPageUrl('Home')} className="flex items-center gap-3">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693b77daae7d72630553bc76/b38dd71b7_ChatGPTImageJan26202603_42_22PM.png" 
              alt="Ascendra" 
              className="h-16 w-auto object-contain"
            />
          </Link>
        </div>

        <nav className="flex-1 min-h-0 px-4 space-y-1 overflow-y-auto pb-2">
          {[...navItems, ...businessNavItems, ...adminNavItems].map((item) => (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              className={cn(
                "flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300",
                isActive(item.page)
                  ? "bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400"
                  : "text-slate-300 hover:bg-slate-800/50"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive(item.page) && "text-cyan-400")} />
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="px-4 pb-2">
          <button
            onClick={() => setShowCreate(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:to-purple-500/30 text-cyan-400 transition-all"
          >
            <PlusSquare className="w-5 h-5" />
            <span className="font-medium">Create</span>
          </button>
        </div>

        <div className="p-4 border-t border-cyan-500/20">
          {user ? (
            <Link 
              to={createPageUrl('Profile')}
              className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-800/50 transition-all"
            >
              <Avatar className="w-10 h-10 ring-2 ring-cyan-500/30">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-purple-400 text-white">
                  {user.full_name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-100 truncate">{user.full_name || 'User'}</p>
                <p className="text-sm text-slate-400 truncate">@{user.username || 'username'}</p>
              </div>
            </Link>
          ) : (
            <Button 
              onClick={() => base44.auth.redirectToLogin()}
              className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl"
            >
              Sign In
            </Button>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 glass-effect border-b border-cyan-500/20 z-50 flex items-center justify-between px-4">
        <Link to={createPageUrl('Home')} className="flex items-center gap-2">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693b77daae7d72630553bc76/b38dd71b7_ChatGPTImageJan26202603_42_22PM.png" 
            alt="Ascendra" 
            className="h-10 w-auto object-contain"
          />
        </Link>

        <div className="flex items-center gap-3">
          <NotificationBell user={user} />
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-xl"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-slate-300" /> : <Menu className="w-5 h-5 text-slate-300" />}
          </Button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute right-0 top-16 w-64 h-[calc(100vh-4rem)] glass-effect border-l border-cyan-500/20 p-4 overflow-y-auto" onClick={e => e.stopPropagation()}>
              <nav className="space-y-1">
                {[...navItems, ...businessNavItems, ...adminNavItems].map((item) => (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                      isActive(item.page)
                        ? "bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400"
                        : "text-slate-300 hover:bg-slate-800/50"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                ))}
              </nav>
            </div>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-20 glass-effect border-t border-cyan-500/20 z-50 flex items-center justify-around px-2 pb-4">
        {[
          { icon: Home, page: 'Home' },
          { icon: Compass, page: 'Explore' },
          { icon: Play, page: 'Reels' },
          { icon: User, page: 'Profile' },
        ].map((item) => (
          <Link
            key={item.page}
            to={createPageUrl(item.page)}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-xl transition-all",
              isActive(item.page) ? "text-cyan-400" : "text-slate-400"
            )}
          >
            <item.icon className="w-6 h-6" />
          </Link>
        ))}
        <button
          onClick={() => setShowCreate(true)}
          className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all text-slate-400"
        >
          <PlusSquare className="w-6 h-6" />
        </button>
      </nav>

      {/* Main Content */}
      <main className="lg:ml-72 pt-16 lg:pt-0 pb-24 lg:pb-8 min-h-screen">
        {children}
      </main>

      {/* AI Floating Button */}
      <AIFloatingButton />

      {/* Create Modal */}
      <CreateModal isOpen={showCreate} onClose={() => setShowCreate(false)} user={user} />
    </div>
  );
}