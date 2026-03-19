import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  TrendingUp, Users, Heart, MessageCircle, ShoppingBag, 
  ExternalLink, Download, Zap, Target, MapPin, Calendar, Coins
} from 'lucide-react';
import { toast } from 'sonner';

const objectiveIcons = {
  reach: TrendingUp,
  followers: Users,
  engagement: Heart,
  comments: MessageCircle,
  sales: ShoppingBag,
  website_visits: ExternalLink,
  app_installs: Download
};

const locations = ['United States', 'United Kingdom', 'Canada', 'Australia', 'India', 'Germany', 'France', 'Japan', 'Brazil', 'Mexico'];
const interests = ['Technology', 'Fashion', 'Gaming', 'Music', 'Art', 'Sports', 'Food', 'Travel', 'Fitness', 'Education'];

export default function BoostPostModal({ open, onClose, post, user }) {
  const [budget, setBudget] = useState(100);
  const [duration, setDuration] = useState(7);
  const [objective, setObjective] = useState('reach');
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(65);
  const [gender, setGender] = useState('all');
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [selectedInterests, setSelectedInterests] = useState([]);

  const queryClient = useQueryClient();

  const { data: wallet } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      const wallets = await base44.entities.TokenWallet.filter({ user_id: user?.id });
      return wallets[0];
    },
    enabled: !!user
  });

  const boostMutation = useMutation({
    mutationFn: async () => {
      // Process transaction through backend
      await base44.functions.invoke('processWalletTransaction', {
        transaction_type: 'post_promotion',
        amount: budget,
        description: `Boosted post - ${objective}`,
        reference_id: post.id
      });

      // Create promoted post
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + duration);

      return base44.entities.PromotedPost.create({
        post_id: post.id,
        user_id: user.id,
        user_name: user.full_name,
        budget_asc: budget,
        campaign_objective: objective,
        target_age_min: ageMin,
        target_age_max: ageMax,
        target_gender: gender,
        target_locations: selectedLocations,
        target_interests: selectedInterests,
        duration_days: duration,
        start_date: new Date().toISOString(),
        end_date: endDate.toISOString(),
        status: 'active'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Post boosted successfully! 🚀');
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to boost post');
    }
  });

  const estimatedReach = Math.floor(budget * 10 * (duration / 7));
  const costPerDay = (budget / duration).toFixed(2);

  const toggleLocation = (location) => {
    setSelectedLocations(prev => 
      prev.includes(location) 
        ? prev.filter(l => l !== location)
        : [...prev, location]
    );
  };

  const toggleInterest = (interest) => {
    setSelectedInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-500" />
            Boost Your Post
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="objective" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="objective">Objective</TabsTrigger>
            <TabsTrigger value="audience">Audience</TabsTrigger>
            <TabsTrigger value="budget">Budget</TabsTrigger>
          </TabsList>

          {/* Objective Tab */}
          <TabsContent value="objective" className="space-y-4">
            <div>
              <Label className="mb-3 block">Campaign Objective</Label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(objectiveIcons).map(([key, Icon]) => (
                  <button
                    key={key}
                    onClick={() => setObjective(key)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      objective === key
                        ? 'border-cyan-500 bg-cyan-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Icon className={`w-6 h-6 mb-2 ${objective === key ? 'text-cyan-500' : 'text-slate-400'}`} />
                    <p className="font-medium text-sm capitalize">
                      {key.replace('_', ' ')}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Audience Tab */}
          <TabsContent value="audience" className="space-y-4">
            <div>
              <Label className="mb-3 block">Age Range</Label>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  value={ageMin}
                  onChange={(e) => setAgeMin(Number(e.target.value))}
                  className="w-24"
                  min="13"
                  max="100"
                />
                <span className="text-slate-500">to</span>
                <Input
                  type="number"
                  value={ageMax}
                  onChange={(e) => setAgeMax(Number(e.target.value))}
                  className="w-24"
                  min="13"
                  max="100"
                />
              </div>
            </div>

            <div>
              <Label className="mb-3 block">Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger>
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

            <div>
              <Label className="mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Locations
              </Label>
              <div className="flex flex-wrap gap-2">
                {locations.map(location => (
                  <Badge
                    key={location}
                    onClick={() => toggleLocation(location)}
                    className={`cursor-pointer ${
                      selectedLocations.includes(location)
                        ? 'bg-cyan-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {location}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Interests
              </Label>
              <div className="flex flex-wrap gap-2">
                {interests.map(interest => (
                  <Badge
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`cursor-pointer ${
                      selectedInterests.includes(interest)
                        ? 'bg-purple-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Budget Tab */}
          <TabsContent value="budget" className="space-y-4">
            <div>
              <Label className="mb-3 flex items-center gap-2">
                <Coins className="w-4 h-4" />
                Budget (ASC Tokens)
              </Label>
              <div className="space-y-4">
                <Slider
                  value={[budget]}
                  onValueChange={(val) => setBudget(val[0])}
                  min={50}
                  max={5000}
                  step={50}
                  className="w-full"
                />
                <Input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <Label className="mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Duration (Days)
              </Label>
              <div className="space-y-4">
                <Slider
                  value={[duration]}
                  onValueChange={(val) => setDuration(val[0])}
                  min={1}
                  max={30}
                  step={1}
                  className="w-full"
                />
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            {/* Estimates */}
            <div className="bg-gradient-to-br from-cyan-50 to-purple-50 rounded-xl p-4 space-y-3">
              <h4 className="font-semibold text-slate-800">Campaign Estimates</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Estimated Reach</span>
                  <span className="font-semibold">{estimatedReach.toLocaleString()} people</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Cost per Day</span>
                  <span className="font-semibold">{costPerDay} $ASC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Your Balance</span>
                  <span className="font-semibold">{wallet?.balance || 0} $ASC</span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={() => boostMutation.mutate()}
            disabled={boostMutation.isPending || !wallet || wallet.balance < budget}
            className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 text-white"
          >
            {boostMutation.isPending ? 'Processing...' : `Boost for ${budget} $ASC`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}