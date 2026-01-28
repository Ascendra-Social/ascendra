import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { TrendingUp, Users, MapPin, Heart, Target, Eye, MousePointer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from 'framer-motion';

export default function AdAnalytics({ ad }) {
  const { data: segmentAnalytics, isLoading } = useQuery({
    queryKey: ['segment-analytics', ad.id],
    queryFn: () => base44.entities.AdSegmentAnalytics.filter({ ad_id: ad.id }),
    staleTime: 60000,
    refetchOnWindowFocus: false,
    refetchInterval: false
  });

  const getTopSegments = (type) => {
    if (!segmentAnalytics) return [];
    return segmentAnalytics
      .filter(s => s.segment_type === type)
      .sort((a, b) => (b.clicks / (b.impressions || 1)) - (a.clicks / (a.impressions || 1)))
      .slice(0, 5);
  };

  const ageSegments = getTopSegments('age_group');
  const locationSegments = getTopSegments('location');
  const interestSegments = getTopSegments('interest');
  const behaviorSegments = getTopSegments('behavior');

  const overallCTR = ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(2) : 0;
  const overallCPM = ad.impressions > 0 ? ((ad.spent_tokens / ad.impressions) * 1000).toFixed(2) : 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const SegmentCard = ({ segment, icon: Icon }) => {
    const ctr = segment.impressions > 0 ? ((segment.clicks / segment.impressions) * 100).toFixed(2) : 0;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl border border-slate-100 hover:border-cyan-200 hover:bg-cyan-50/30 transition-all"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-cyan-500" />}
            <span className="font-medium text-slate-800 capitalize">
              {segment.segment_value.replace('_', ' ')}
            </span>
          </div>
          <Badge className={`${parseFloat(ctr) > 2 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
            {ctr}% CTR
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <p className="text-slate-500 text-xs">Impressions</p>
            <p className="font-semibold text-slate-800">{segment.impressions}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Clicks</p>
            <p className="font-semibold text-slate-800">{segment.clicks}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Spent</p>
            <p className="font-semibold text-slate-800">{segment.spent_tokens} 🪙</p>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Overview Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-xl border-slate-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">Total Impressions</p>
              <Eye className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{ad.impressions}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-slate-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">Total Clicks</p>
              <MousePointer className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{ad.clicks}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-slate-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">CTR</p>
              <TrendingUp className="w-4 h-4 text-cyan-500" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{overallCTR}%</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-slate-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">CPM</p>
              <Target className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{overallCPM} 🪙</p>
          </CardContent>
        </Card>
      </div>

      {/* Segment Performance */}
      <Card className="rounded-xl border-slate-100">
        <CardHeader>
          <CardTitle className="text-lg">Segment Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="age">
            <TabsList className="bg-slate-100 p-1 rounded-xl mb-6">
              <TabsTrigger value="age" className="rounded-lg data-[state=active]:bg-white text-sm">
                Age Groups
              </TabsTrigger>
              <TabsTrigger value="location" className="rounded-lg data-[state=active]:bg-white text-sm">
                Locations
              </TabsTrigger>
              <TabsTrigger value="interests" className="rounded-lg data-[state=active]:bg-white text-sm">
                Interests
              </TabsTrigger>
              <TabsTrigger value="behaviors" className="rounded-lg data-[state=active]:bg-white text-sm">
                Behaviors
              </TabsTrigger>
            </TabsList>

            <TabsContent value="age" className="space-y-3">
              {ageSegments.length > 0 ? (
                ageSegments.map(segment => (
                  <SegmentCard key={segment.id} segment={segment} icon={Users} />
                ))
              ) : (
                <p className="text-center text-slate-500 py-8">No age data yet</p>
              )}
            </TabsContent>

            <TabsContent value="location" className="space-y-3">
              {locationSegments.length > 0 ? (
                locationSegments.map(segment => (
                  <SegmentCard key={segment.id} segment={segment} icon={MapPin} />
                ))
              ) : (
                <p className="text-center text-slate-500 py-8">No location data yet</p>
              )}
            </TabsContent>

            <TabsContent value="interests" className="space-y-3">
              {interestSegments.length > 0 ? (
                interestSegments.map(segment => (
                  <SegmentCard key={segment.id} segment={segment} icon={Heart} />
                ))
              ) : (
                <p className="text-center text-slate-500 py-8">No interest data yet</p>
              )}
            </TabsContent>

            <TabsContent value="behaviors" className="space-y-3">
              {behaviorSegments.length > 0 ? (
                behaviorSegments.map(segment => (
                  <SegmentCard key={segment.id} segment={segment} icon={TrendingUp} />
                ))
              ) : (
                <p className="text-center text-slate-500 py-8">No behavior data yet</p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}