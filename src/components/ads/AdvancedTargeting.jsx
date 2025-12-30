import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Target, Users, MapPin, Heart, TrendingUp, X } from 'lucide-react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LOCATIONS = [
  'United States', 'Canada', 'United Kingdom', 'Australia',
  'Germany', 'France', 'Spain', 'Italy', 'Japan', 'Mexico',
  'Brazil', 'India', 'South Korea', 'Netherlands', 'Sweden'
];

const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Italian', 
  'Portuguese', 'Japanese', 'Korean', 'Chinese', 'Arabic'
];

const GRANULAR_INTERESTS = [
  'Gaming', 'Fitness', 'Cooking', 'Travel', 'Photography',
  'Music Production', 'Fashion Design', 'Crypto', 'NFTs',
  'Meditation', 'Yoga', 'Reading', 'Writing', 'Podcasts',
  'Streaming', 'Content Creation', 'Entrepreneurship', 'Investing',
  'Tech Gadgets', 'Sustainable Living', 'Plant-based Diet',
  'Pet Care', 'Home Decor', 'DIY Projects', 'Gardening'
];

const BEHAVIORS = [
  { value: 'high_engager', label: 'High Engagers', desc: 'Users who frequently like, comment, and share' },
  { value: 'community_member', label: 'Community Members', desc: 'Active in communities' },
  { value: 'marketplace_buyer', label: 'Marketplace Buyers', desc: 'Made purchases in marketplace' },
  { value: 'content_creator', label: 'Content Creators', desc: 'Post regularly' },
  { value: 'early_adopter', label: 'Early Adopters', desc: 'New platform users' },
  { value: 'token_holder', label: 'Token Holders', desc: 'Have VIBE tokens in wallet' },
  { value: 'verified_users', label: 'Verified Users', desc: 'ID verified accounts' }
];

export default function AdvancedTargeting({ formData, setFormData }) {
  const [customInterest, setCustomInterest] = useState('');

  const { data: communities } = useQuery({
    queryKey: ['communities'],
    queryFn: () => base44.entities.Community.list('-members_count', 50)
  });

  const addCustomInterest = () => {
    if (customInterest.trim() && !formData.target_interests?.includes(customInterest.trim())) {
      setFormData({
        ...formData,
        target_interests: [...(formData.target_interests || []), customInterest.trim()]
      });
      setCustomInterest('');
    }
  };

  const removeInterest = (interest) => {
    setFormData({
      ...formData,
      target_interests: (formData.target_interests || []).filter(i => i !== interest)
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="demographics">
        <TabsList className="grid w-full grid-cols-3 bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="demographics" className="rounded-lg data-[state=active]:bg-white">
            <Users className="w-4 h-4 mr-2" />
            Demographics
          </TabsTrigger>
          <TabsTrigger value="interests" className="rounded-lg data-[state=active]:bg-white">
            <Heart className="w-4 h-4 mr-2" />
            Interests
          </TabsTrigger>
          <TabsTrigger value="behaviors" className="rounded-lg data-[state=active]:bg-white">
            <TrendingUp className="w-4 h-4 mr-2" />
            Behaviors
          </TabsTrigger>
        </TabsList>

        {/* Demographics Tab */}
        <TabsContent value="demographics" className="space-y-5 mt-5">
          {/* Age Range */}
          <div>
            <Label className="text-sm text-slate-600 mb-2 block">Age Range</Label>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                placeholder="Min age"
                value={formData.target_age_min || ''}
                onChange={(e) => setFormData({ ...formData, target_age_min: e.target.value })}
                className="h-11 rounded-xl"
              />
              <span className="text-slate-400">to</span>
              <Input
                type="number"
                placeholder="Max age"
                value={formData.target_age_max || ''}
                onChange={(e) => setFormData({ ...formData, target_age_max: e.target.value })}
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          {/* Gender */}
          <div>
            <Label className="text-sm text-slate-600 mb-2 block">Gender</Label>
            <Select
              value={formData.target_gender || 'all'}
              onValueChange={(value) => setFormData({ ...formData, target_gender: value })}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genders</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Locations */}
          <div>
            <Label className="text-sm text-slate-600 mb-3 block flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Target Locations
            </Label>
            <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto p-2">
              {LOCATIONS.map(loc => (
                <label key={loc} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.target_locations?.includes(loc)}
                    onCheckedChange={(checked) => {
                      const newLocations = checked
                        ? [...(formData.target_locations || []), loc]
                        : (formData.target_locations || []).filter(l => l !== loc);
                      setFormData({ ...formData, target_locations: newLocations });
                    }}
                  />
                  <span className="text-sm text-slate-700">{loc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Languages */}
          <div>
            <Label className="text-sm text-slate-600 mb-3 block">Languages</Label>
            <div className="grid grid-cols-2 gap-3">
              {LANGUAGES.map(lang => (
                <label key={lang} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.target_languages?.includes(lang)}
                    onCheckedChange={(checked) => {
                      const newLanguages = checked
                        ? [...(formData.target_languages || []), lang]
                        : (formData.target_languages || []).filter(l => l !== lang);
                      setFormData({ ...formData, target_languages: newLanguages });
                    }}
                  />
                  <span className="text-sm text-slate-700">{lang}</span>
                </label>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Interests Tab */}
        <TabsContent value="interests" className="space-y-5 mt-5">
          {/* Granular Interests */}
          <div>
            <Label className="text-sm text-slate-600 mb-3 block">Select Interests</Label>
            <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto p-2">
              {GRANULAR_INTERESTS.map(interest => (
                <label key={interest} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={formData.target_interests?.includes(interest)}
                    onCheckedChange={(checked) => {
                      const newInterests = checked
                        ? [...(formData.target_interests || []), interest]
                        : (formData.target_interests || []).filter(i => i !== interest);
                      setFormData({ ...formData, target_interests: newInterests });
                    }}
                  />
                  <span className="text-sm text-slate-700">{interest}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Custom Interests */}
          <div>
            <Label className="text-sm text-slate-600 mb-2 block">Add Custom Interest</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Rock Climbing, Vegan Cooking"
                value={customInterest}
                onChange={(e) => setCustomInterest(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCustomInterest()}
                className="h-11 rounded-xl"
              />
              <Button onClick={addCustomInterest} className="rounded-xl">
                Add
              </Button>
            </div>
          </div>

          {/* Selected Custom Interests */}
          {formData.target_interests?.length > 0 && (
            <div>
              <Label className="text-sm text-slate-600 mb-2 block">Selected Interests</Label>
              <div className="flex flex-wrap gap-2">
                {formData.target_interests.map(interest => (
                  <Badge key={interest} variant="outline" className="gap-2 pr-1">
                    {interest}
                    <button
                      onClick={() => removeInterest(interest)}
                      className="ml-1 hover:bg-slate-200 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Target Communities */}
          <div>
            <Label className="text-sm text-slate-600 mb-3 block">Target Specific Communities</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto p-2">
              {communities?.map(community => (
                <label key={community.id} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded-lg">
                  <Checkbox
                    checked={formData.target_communities?.includes(community.id)}
                    onCheckedChange={(checked) => {
                      const newCommunities = checked
                        ? [...(formData.target_communities || []), community.id]
                        : (formData.target_communities || []).filter(c => c !== community.id);
                      setFormData({ ...formData, target_communities: newCommunities });
                    }}
                  />
                  <div className="flex items-center gap-2">
                    {community.icon && (
                      <img src={community.icon} alt="" className="w-6 h-6 rounded-lg" />
                    )}
                    <span className="text-sm text-slate-700">{community.name}</span>
                    <Badge variant="outline" className="text-xs">{community.members_count || 0}</Badge>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Behaviors Tab */}
        <TabsContent value="behaviors" className="space-y-5 mt-5">
          <div className="space-y-3">
            {BEHAVIORS.map(behavior => (
              <label
                key={behavior.value}
                className="flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer hover:border-violet-300 transition-all"
              >
                <Checkbox
                  checked={formData.target_behaviors?.includes(behavior.value)}
                  onCheckedChange={(checked) => {
                    const newBehaviors = checked
                      ? [...(formData.target_behaviors || []), behavior.value]
                      : (formData.target_behaviors || []).filter(b => b !== behavior.value);
                    setFormData({ ...formData, target_behaviors: newBehaviors });
                  }}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-slate-800">{behavior.label}</p>
                  <p className="text-xs text-slate-500">{behavior.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}