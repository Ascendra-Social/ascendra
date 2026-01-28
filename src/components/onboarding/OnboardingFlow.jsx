import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Sparkles, Camera, Users, ShoppingBag, ArrowRight, 
  Check, X, Upload
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { motion, AnimatePresence } from 'framer-motion';

export default function OnboardingFlow({ user, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    bio: user?.bio || ''
  });
  const [selectedCommunities, setSelectedCommunities] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const queryClient = useQueryClient();

  const { data: communities } = useQuery({
    queryKey: ['onboarding-communities'],
    queryFn: () => base44.entities.Community.list('-members_count', 12)
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    }
  });

  const joinCommunitiesMutation = useMutation({
    mutationFn: async () => {
      for (const communityId of selectedCommunities) {
        await base44.entities.CommunityMember.create({
          community_id: communityId,
          user_id: user.id,
          user_name: user.full_name,
          user_avatar: user.avatar
        });
      }
    }
  });

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.auth.updateMe({ avatar: file_url });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    }
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.auth.updateMe({ banner: file_url });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      await updateProfileMutation.mutateAsync(profileData);
    } else if (currentStep === 2 && selectedCommunities.length > 0) {
      await joinCommunitiesMutation.mutateAsync();
    }

    if (currentStep === steps.length - 1) {
      await base44.auth.updateMe({ 
        onboarding_completed: true,
        interests: selectedCategories 
      });
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    if (currentStep === steps.length - 1) {
      base44.auth.updateMe({ onboarding_completed: true });
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const steps = [
    {
      title: 'Welcome to Ascendra! 🎉',
      subtitle: 'Your positive social marketplace',
      icon: Sparkles,
      content: (
        <div className="space-y-6 text-center">
          <div className="w-32 h-32 mx-auto flex items-center justify-center">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693b77daae7d72630553bc76/b38dd71b7_ChatGPTImageJan26202603_42_22PM.png" 
              alt="Ascendra" 
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">
              Welcome to Ascendra
            </h3>
            <p className="text-slate-600">
              A social platform that rewards positivity and authentic connections. 
              Let's get you started!
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-left">
            <div className="p-4 bg-cyan-50 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-cyan-200 flex items-center justify-center mb-2">
                <Sparkles className="w-4 h-4 text-cyan-600" />
              </div>
              <p className="text-sm font-medium text-slate-800">Earn Tokens</p>
              <p className="text-xs text-slate-500">For positive content</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-purple-200 flex items-center justify-center mb-2">
                <Users className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-sm font-medium text-slate-800">Join Communities</p>
              <p className="text-xs text-slate-500">Find your tribe</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-amber-200 flex items-center justify-center mb-2">
                <ShoppingBag className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-sm font-medium text-slate-800">Marketplace</p>
              <p className="text-xs text-slate-500">Buy & sell securely</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Set Up Your Profile',
      subtitle: 'Make a great first impression',
      icon: Camera,
      content: (
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="w-24 h-24 ring-4 ring-cyan-100">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-cyan-400 to-purple-400 text-white">
                  {user?.full_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center cursor-pointer hover:bg-cyan-600 transition-colors">
                <Camera className="w-4 h-4 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </label>
            </div>
            
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <span>
                  <Upload className="w-4 h-4" />
                  Upload Banner
                </span>
              </Button>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBannerUpload}
              />
            </label>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Username
              </label>
              <Input
                placeholder="Choose a unique username"
                value={profileData.username}
                onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                className="h-12 rounded-xl"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Bio
              </label>
              <Textarea
                placeholder="Tell us about yourself..."
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                className="rounded-xl resize-none"
                rows={3}
              />
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Join Communities',
      subtitle: 'Connect with like-minded people',
      icon: Users,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 text-center">
            Select communities that match your interests
          </p>
          <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
            {communities?.slice(0, 8).map(community => (
              <button
                key={community.id}
                onClick={() => {
                  setSelectedCommunities(prev => 
                    prev.includes(community.id)
                      ? prev.filter(id => id !== community.id)
                      : [...prev, community.id]
                  );
                }}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectedCommunities.includes(community.id)
                    ? 'border-cyan-500 bg-cyan-50'
                    : 'border-slate-200 hover:border-cyan-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  {community.icon ? (
                    <img src={community.icon} className="w-10 h-10 rounded-lg" alt="" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-purple-400" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate text-sm">
                      {community.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {community.members_count || 0} members
                    </p>
                  </div>
                  {selectedCommunities.includes(community.id) && (
                    <Check className="w-5 h-5 text-cyan-500 flex-shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs text-center text-slate-500">
            {selectedCommunities.length} selected
          </p>
        </div>
      )
    },
    {
      title: 'Explore the Marketplace',
      subtitle: 'What are you interested in?',
      icon: ShoppingBag,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 text-center">
            Select categories you'd like to see
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {['electronics', 'clothing', 'home', 'art', 'collectibles', 'services', 'digital', 'other'].map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategories(prev =>
                    prev.includes(cat)
                      ? prev.filter(c => c !== cat)
                      : [...prev, cat]
                  );
                }}
                className={`px-4 py-2 rounded-full border-2 transition-all ${
                  selectedCategories.includes(cat)
                    ? 'border-cyan-500 bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                    : 'border-slate-200 text-slate-700 hover:border-cyan-300'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
          
          <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-green-800">You're all set!</p>
                <p className="text-sm text-green-600">Start exploring Ascendra</p>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;
  const CurrentStepIcon = steps[currentStep].icon;

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-2xl rounded-3xl p-0 overflow-hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Progress bar */}
        <div className="p-6 pb-0">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between items-center mt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center">
                <CurrentStepIcon className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">{steps[currentStep].title}</h3>
                <p className="text-sm text-slate-500">{steps[currentStep].subtitle}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {currentStep + 1} of {steps.length}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {steps[currentStep].content}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center p-6 pt-0 border-t border-slate-100">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="text-slate-500"
          >
            Skip
          </Button>
          <Button
            onClick={handleNext}
            className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl px-6 gap-2"
            disabled={updateProfileMutation.isPending || joinCommunitiesMutation.isPending}
          >
            {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}