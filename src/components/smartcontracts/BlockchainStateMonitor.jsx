import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Activity, AlertTriangle, CheckCircle2, XCircle, RefreshCw, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

export default function BlockchainStateMonitor() {
  const [lastVerification, setLastVerification] = useState(null);
  const queryClient = useQueryClient();

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('verifyBlockchainState', {});
      return response.data;
    },
    onSuccess: (data) => {
      setLastVerification(data);
      queryClient.invalidateQueries({ queryKey: ['blockchainVerification'] });
    }
  });

  const handleVerify = () => {
    verifyMutation.mutate();
  };

  const healthScore = lastVerification?.health_score || null;
  const issues = lastVerification?.issues_found || [];
  const reconciled = lastVerification?.reconciled || [];
  const recommendations = lastVerification?.recommendations || [];

  const getHealthColor = (score) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/10 text-red-500';
      case 'high': return 'bg-orange-500/10 text-orange-500';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500';
      default: return 'bg-blue-500/10 text-blue-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="glass-effect border-cyan-500/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20">
                <Shield className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <CardTitle className="text-white">Blockchain State Verification</CardTitle>
                <p className="text-sm text-slate-400">Monitor database and blockchain synchronization</p>
              </div>
            </div>

            <Button
              onClick={handleVerify}
              disabled={verifyMutation.isPending}
              className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 border border-cyan-500/30"
            >
              {verifyMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Verify Now
            </Button>
          </div>
        </CardHeader>

        {healthScore !== null && (
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400">System Health Score</span>
                  <span className={cn("text-2xl font-bold", getHealthColor(healthScore))}>
                    {healthScore}%
                  </span>
                </div>
                <Progress value={healthScore} className="h-2" />
              </div>

              <div className="grid grid-cols-4 gap-4 pt-4 border-t border-slate-700">
                <div>
                  <div className="text-2xl font-bold text-white">
                    {lastVerification.summary.total_payouts}
                  </div>
                  <div className="text-xs text-slate-400">Total Payouts</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-400">
                    {lastVerification.summary.verified_payouts}
                  </div>
                  <div className="text-xs text-slate-400">Verified</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-400">
                    {lastVerification.summary.failed_payouts}
                  </div>
                  <div className="text-xs text-slate-400">Failed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-400">
                    {lastVerification.summary.missing_tx_hash}
                  </div>
                  <div className="text-xs text-slate-400">Missing TX</div>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card className="glass-effect border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.map((rec, idx) => (
              <Alert key={idx} className="bg-slate-800/50 border-slate-700">
                <AlertDescription>
                  <div className="flex items-start gap-3">
                    {rec.priority === 'critical' && <XCircle className="w-5 h-5 text-red-500 mt-0.5" />}
                    {rec.priority === 'high' && <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />}
                    {rec.priority === 'medium' && <Activity className="w-5 h-5 text-yellow-500 mt-0.5" />}
                    {rec.priority === 'info' && <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />}
                    <div>
                      <div className="font-semibold text-white">{rec.action}</div>
                      <div className="text-sm text-slate-400 mt-1">{rec.details}</div>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Issues Found */}
      {issues.length > 0 && (
        <Card className="glass-effect border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Issues Detected ({issues.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {issues.map((issue, idx) => (
              <div key={idx} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={cn("text-xs", getSeverityColor(issue.severity))}>
                        {issue.severity}
                      </Badge>
                      <span className="text-xs text-slate-500">{issue.type.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-sm text-white">{issue.message}</p>
                    {issue.payout_id && (
                      <p className="text-xs text-slate-400 mt-1">Payout ID: {issue.payout_id}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Auto-Reconciled */}
      {reconciled.length > 0 && (
        <Card className="glass-effect border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              Auto-Reconciled ({reconciled.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {reconciled.map((rec, idx) => (
              <div key={idx} className="p-3 bg-green-500/5 rounded-lg border border-green-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="text-xs bg-green-500/10 text-green-400">
                    {rec.action.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <p className="text-sm text-white">{rec.reason}</p>
                <p className="text-xs text-slate-400 mt-1">Payout ID: {rec.payout_id}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {lastVerification && (
        <div className="text-center text-xs text-slate-500">
          Last verified: {new Date(lastVerification.timestamp).toLocaleString()}
        </div>
      )}
    </div>
  );
}