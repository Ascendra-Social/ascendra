import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Check, X, Eye, Clock, UserCheck } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from 'date-fns';

export default function VerificationReview() {
  const [user, setUser] = useState(null);
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        if (currentUser.role !== 'admin') {
          window.location.href = '/';
        }
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  const { data: verifications, isLoading } = useQuery({
    queryKey: ['verifications'],
    queryFn: () => base44.entities.IDVerification.list('-created_date'),
    enabled: !!user
  });

  const approveMutation = useMutation({
    mutationFn: async (verification) => {
      await base44.entities.IDVerification.update(verification.id, {
        status: 'approved',
        reviewed_by: user.email,
        reviewed_date: new Date().toISOString()
      });

      // Update user verification status
      const users = await base44.entities.User.filter({ id: verification.user_id });
      if (users[0]) {
        await base44.entities.User.update(users[0].id, {
          is_verified: true
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verifications'] });
      setSelectedVerification(null);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ verification, reason }) => {
      await base44.entities.IDVerification.update(verification.id, {
        status: 'rejected',
        rejection_reason: reason,
        reviewed_by: user.email,
        reviewed_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verifications'] });
      setSelectedVerification(null);
      setRejectionReason('');
    }
  });

  const pendingVerifications = verifications?.filter(v => v.status === 'pending') || [];
  const approvedVerifications = verifications?.filter(v => v.status === 'approved') || [];
  const rejectedVerifications = verifications?.filter(v => v.status === 'rejected') || [];

  if (!user || isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Skeleton className="h-32 rounded-3xl mb-6" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ID Verification Review</h1>
          <p className="text-slate-500 text-sm">Review and approve user verifications</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="rounded-2xl border-slate-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Pending</p>
                <p className="text-3xl font-bold text-amber-600">{pendingVerifications.length}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Approved</p>
                <p className="text-3xl font-bold text-green-600">{approvedVerifications.length}</p>
              </div>
              <UserCheck className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Rejected</p>
                <p className="text-3xl font-bold text-red-600">{rejectedVerifications.length}</p>
              </div>
              <X className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="bg-slate-100/80 p-1 rounded-2xl mb-6">
          <TabsTrigger value="pending" className="rounded-xl data-[state=active]:bg-white">
            Pending ({pendingVerifications.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="rounded-xl data-[state=active]:bg-white">
            Approved ({approvedVerifications.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="rounded-xl data-[state=active]:bg-white">
            Rejected ({rejectedVerifications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pendingVerifications.length > 0 ? (
            <div className="grid gap-4">
              {pendingVerifications.map(verification => (
                <Card key={verification.id} className="rounded-2xl border-slate-100 hover:border-violet-200 transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-slate-800">{verification.user_name}</h3>
                          <Badge className="bg-amber-100 text-amber-700">Pending</Badge>
                          <Badge variant="outline" className="capitalize">{verification.document_type.replace('_', ' ')}</Badge>
                        </div>
                        <p className="text-sm text-slate-500 mb-3">{verification.user_email}</p>
                        <p className="text-xs text-slate-400">
                          Submitted {formatDistanceToNow(new Date(verification.created_date), { addSuffix: true })}
                        </p>
                      </div>
                      <Button
                        onClick={() => setSelectedVerification(verification)}
                        className="bg-violet-500 text-white rounded-xl gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Review
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 mx-auto text-slate-200 mb-4" />
              <p className="text-slate-500">No pending verifications</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved">
          {approvedVerifications.map(v => (
            <Card key={v.id} className="rounded-2xl border-slate-100 mb-4">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">{v.user_name}</p>
                    <p className="text-sm text-slate-500">{v.user_email}</p>
                  </div>
                  <Badge className="bg-green-100 text-green-700">Approved</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="rejected">
          {rejectedVerifications.map(v => (
            <Card key={v.id} className="rounded-2xl border-slate-100 mb-4">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-slate-800">{v.user_name}</p>
                    <p className="text-sm text-slate-500">{v.user_email}</p>
                  </div>
                  <Badge className="bg-red-100 text-red-700">Rejected</Badge>
                </div>
                {v.rejection_reason && (
                  <p className="text-sm text-slate-600 mt-2">Reason: {v.rejection_reason}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Review Modal */}
      {selectedVerification && (
        <Dialog open={!!selectedVerification} onOpenChange={() => setSelectedVerification(null)}>
          <DialogContent className="sm:max-w-3xl rounded-3xl p-0 overflow-hidden">
            <DialogHeader className="p-6 pb-4 border-b border-slate-100">
              <DialogTitle>Review Verification</DialogTitle>
            </DialogHeader>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">User Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Name</p>
                    <p className="font-medium">{selectedVerification.user_name}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Email</p>
                    <p className="font-medium">{selectedVerification.user_email}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Document Type</p>
                    <p className="font-medium capitalize">{selectedVerification.document_type.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Submitted</p>
                    <p className="font-medium">
                      {formatDistanceToNow(new Date(selectedVerification.created_date), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 mb-3">Documents</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500 mb-2">Front of Document</p>
                    <img
                      src={selectedVerification.document_front_url}
                      alt="Document front"
                      className="w-full rounded-xl border border-slate-200"
                    />
                  </div>
                  {selectedVerification.document_back_url && (
                    <div>
                      <p className="text-sm text-slate-500 mb-2">Back of Document</p>
                      <img
                        src={selectedVerification.document_back_url}
                        alt="Document back"
                        className="w-full rounded-xl border border-slate-200"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-500 mb-2">Selfie Verification</p>
                <img
                  src={selectedVerification.selfie_url}
                  alt="Selfie"
                  className="w-64 rounded-xl border border-slate-200 mx-auto"
                />
              </div>

              {selectedVerification.status === 'pending' && (
                <div>
                  <p className="text-sm text-slate-600 mb-2">Rejection Reason (if rejecting)</p>
                  <Textarea
                    placeholder="Explain why this verification is being rejected..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="rounded-xl resize-none"
                    rows={3}
                  />
                </div>
              )}
            </div>

            {selectedVerification.status === 'pending' && (
              <div className="flex gap-3 p-6 pt-0 border-t border-slate-100">
                <Button
                  onClick={() => rejectMutation.mutate({ 
                    verification: selectedVerification, 
                    reason: rejectionReason 
                  })}
                  disabled={!rejectionReason.trim()}
                  variant="outline"
                  className="flex-1 rounded-xl gap-2 text-red-600 border-red-200 hover:bg-red-50"
                >
                  <X className="w-4 h-4" />
                  Reject
                </Button>
                <Button
                  onClick={() => approveMutation.mutate(selectedVerification)}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl gap-2"
                >
                  <Check className="w-4 h-4" />
                  Approve
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}