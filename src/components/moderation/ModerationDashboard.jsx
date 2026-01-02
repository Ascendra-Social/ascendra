import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Eye, Check, X, Ban, AlertTriangle, Clock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDistanceToNow } from 'date-fns';

export default function ModerationDashboard({ community, user }) {
  const [selectedReport, setSelectedReport] = useState(null);
  const [resolution, setResolution] = useState('');
  const queryClient = useQueryClient();

  const { data: reports, isLoading } = useQuery({
    queryKey: ['community-reports', community.id],
    queryFn: () => base44.entities.CommunityReport.filter({ community_id: community.id }, '-created_date')
  });

  const { data: moderationActions } = useQuery({
    queryKey: ['moderation-actions', community.id],
    queryFn: () => base44.entities.CommunityModerationAction.filter({ community_id: community.id }, '-created_date', 20)
  });

  const resolveReportMutation = useMutation({
    mutationFn: async ({ reportId, status, action }) => {
      // Update report status
      await base44.entities.CommunityReport.update(reportId, {
        status: 'resolved',
        resolution,
        resolved_by: user.email,
        resolved_date: new Date().toISOString()
      });

      // Log moderation action
      if (action) {
        await base44.entities.CommunityModerationAction.create({
          community_id: community.id,
          moderator_id: user.id,
          moderator_name: user.full_name,
          action_type: action,
          target_user_id: selectedReport.reported_user_id,
          target_content_id: selectedReport.reported_content_id,
          reason: selectedReport.reason,
          notes: resolution
        });

        // Execute the action
        if (action === 'remove_post') {
          await base44.entities.Post.delete(selectedReport.reported_content_id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-reports'] });
      queryClient.invalidateQueries({ queryKey: ['moderation-actions'] });
      setSelectedReport(null);
      setResolution('');
    }
  });

  const dismissReportMutation = useMutation({
    mutationFn: async (reportId) => {
      await base44.entities.CommunityReport.update(reportId, {
        status: 'dismissed',
        resolved_by: user.email,
        resolved_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-reports'] });
      setSelectedReport(null);
    }
  });

  const pendingReports = reports?.filter(r => r.status === 'pending') || [];
  const resolvedReports = reports?.filter(r => r.status === 'resolved') || [];

  const reasonColors = {
    hate_speech: 'bg-red-100 text-red-700',
    harassment: 'bg-orange-100 text-orange-700',
    spam: 'bg-yellow-100 text-yellow-700',
    misinformation: 'bg-purple-100 text-purple-700',
    violence: 'bg-red-100 text-red-700',
    inappropriate_content: 'bg-pink-100 text-pink-700',
    other: 'bg-slate-100 text-slate-700'
  };

  if (isLoading) {
    return <Skeleton className="h-96 rounded-2xl" />;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="rounded-xl border-slate-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Pending Reports</p>
                <p className="text-2xl font-bold text-amber-600">{pendingReports.length}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-slate-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Total Reports</p>
                <p className="text-2xl font-bold text-slate-800">{reports?.length || 0}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-slate-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Actions Taken</p>
                <p className="text-2xl font-bold text-green-600">{moderationActions?.length || 0}</p>
              </div>
              <Shield className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports */}
      <Tabs defaultValue="pending">
        <TabsList className="bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="pending" className="rounded-lg data-[state=active]:bg-white">
            Pending ({pendingReports.length})
          </TabsTrigger>
          <TabsTrigger value="resolved" className="rounded-lg data-[state=active]:bg-white">
            Resolved ({resolvedReports.length})
          </TabsTrigger>
          <TabsTrigger value="actions" className="rounded-lg data-[state=active]:bg-white">
            Recent Actions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3 mt-4">
          {pendingReports.length > 0 ? (
            pendingReports.map(report => (
              <Card key={report.id} className="rounded-xl border-slate-100 hover:border-violet-200 transition-all cursor-pointer" onClick={() => setSelectedReport(report)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={reasonColors[report.reason]}>
                          {report.reason.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline">{report.reported_content_type}</Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">
                        Reported by <span className="font-medium">{report.reporter_name}</span>
                      </p>
                      {report.description && (
                        <p className="text-sm text-slate-500 line-clamp-2">{report.description}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-2">
                        {formatDistanceToNow(new Date(report.created_date), { addSuffix: true })}
                      </p>
                    </div>
                    <Button size="sm" className="rounded-xl gap-2">
                      <Eye className="w-4 h-4" />
                      Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <Shield className="w-16 h-16 mx-auto text-slate-200 mb-4" />
              <p className="text-slate-500">No pending reports</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="resolved" className="space-y-3 mt-4">
          {resolvedReports.map(report => (
            <Card key={report.id} className="rounded-xl border-slate-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Badge className={reasonColors[report.reason]}>
                      {report.reason.replace('_', ' ')}
                    </Badge>
                    <p className="text-sm text-slate-600 mt-2">
                      Resolved by {report.resolved_by}
                    </p>
                  </div>
                  <Badge className="bg-green-100 text-green-700">Resolved</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="actions" className="space-y-3 mt-4">
          {moderationActions?.map(action => (
            <Card key={action.id} className="rounded-xl border-slate-100">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-800 capitalize">
                      {action.action_type.replace('_', ' ')}
                    </p>
                    <p className="text-sm text-slate-500">
                      by {action.moderator_name}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {formatDistanceToNow(new Date(action.created_date), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Review Modal */}
      {selectedReport && (
        <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
          <DialogContent className="sm:max-w-2xl rounded-3xl p-0 overflow-hidden">
            <DialogHeader className="p-6 pb-4 border-b border-slate-100">
              <DialogTitle>Review Report</DialogTitle>
            </DialogHeader>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-slate-500 mb-2">Reason</p>
                <Badge className={reasonColors[selectedReport.reason]}>
                  {selectedReport.reason.replace('_', ' ')}
                </Badge>
              </div>

              <div>
                <p className="text-sm text-slate-500 mb-2">Details</p>
                <p className="text-sm text-slate-700">{selectedReport.description || 'No additional details provided'}</p>
              </div>

              <div>
                <p className="text-sm text-slate-500 mb-2">Resolution Notes</p>
                <Textarea
                  placeholder="Add notes about your decision..."
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="rounded-xl resize-none"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 pt-0 border-t border-slate-100">
              <Button
                onClick={() => dismissReportMutation.mutate(selectedReport.id)}
                variant="outline"
                className="flex-1 rounded-xl gap-2"
              >
                <X className="w-4 h-4" />
                Dismiss
              </Button>
              <Button
                onClick={() => resolveReportMutation.mutate({ 
                  reportId: selectedReport.id, 
                  action: 'remove_post' 
                })}
                className="flex-1 bg-red-500 text-white rounded-xl gap-2 hover:bg-red-600"
              >
                <Ban className="w-4 h-4" />
                Remove Content
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}