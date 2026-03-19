import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Shield, Search, Download, Filter, Calendar, User, Activity } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export default function AuditLogs() {
  const [filters, setFilters] = useState({
    event_type: 'all',
    actor_id: '',
    target_type: 'all',
    status: 'all',
    search: ''
  });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['auditLogs', filters],
    queryFn: async () => {
      const query = {};
      
      if (filters.event_type !== 'all') query.event_type = filters.event_type;
      if (filters.actor_id) query.actor_id = filters.actor_id;
      if (filters.target_type !== 'all') query.target_type = filters.target_type;
      if (filters.status !== 'all') query.status = filters.status;

      const results = await base44.entities.AuditLog.filter(query, '-created_date', 100);

      if (filters.search) {
        return results.filter(log => 
          log.action.toLowerCase().includes(filters.search.toLowerCase()) ||
          log.actor_name.toLowerCase().includes(filters.search.toLowerCase())
        );
      }

      return results;
    }
  });

  const eventTypeColors = {
    transaction_created: 'bg-blue-500/10 text-blue-600',
    transaction_reversed: 'bg-orange-500/10 text-orange-600',
    wallet_updated: 'bg-green-500/10 text-green-600',
    refund_requested: 'bg-yellow-500/10 text-yellow-600',
    refund_approved: 'bg-green-500/10 text-green-600',
    purchase_completed: 'bg-purple-500/10 text-purple-600',
    admin_override: 'bg-red-500/10 text-red-600',
    security_alert: 'bg-red-500/10 text-red-600'
  };

  const statusColors = {
    success: 'bg-green-500/10 text-green-600',
    failed: 'bg-red-500/10 text-red-600',
    pending: 'bg-yellow-500/10 text-yellow-600'
  };

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'Event Type', 'Actor', 'Action', 'Amount', 'Status', 'IP Address'].join(','),
      ...logs.map(log => [
        new Date(log.created_date).toISOString(),
        log.event_type,
        log.actor_name,
        log.action,
        log.amount || 0,
        log.status,
        log.ip_address || 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20">
              <Shield className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Audit Logs</h1>
              <p className="text-slate-400">Complete trail of financial operations</p>
            </div>
          </div>

          <Button
            onClick={exportLogs}
            className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 border border-cyan-500/30"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <Card className="glass-effect border-cyan-500/20 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Filter className="w-5 h-5 text-cyan-400" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search actions..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10 bg-slate-800/50 border-slate-700 text-white"
                />
              </div>

              <Select
                value={filters.event_type}
                onValueChange={(value) => setFilters({ ...filters, event_type: value })}
              >
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="transaction_created">Transactions</SelectItem>
                  <SelectItem value="transaction_reversed">Reversals</SelectItem>
                  <SelectItem value="refund_requested">Refunds</SelectItem>
                  <SelectItem value="purchase_completed">Purchases</SelectItem>
                  <SelectItem value="admin_override">Admin Actions</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.target_type}
                onValueChange={(value) => setFilters({ ...filters, target_type: value })}
              >
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Targets</SelectItem>
                  <SelectItem value="transaction">Transactions</SelectItem>
                  <SelectItem value="wallet">Wallets</SelectItem>
                  <SelectItem value="contract">Contracts</SelectItem>
                  <SelectItem value="purchase">Purchases</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => setFilters({
                  event_type: 'all',
                  actor_id: '',
                  target_type: 'all',
                  status: 'all',
                  search: ''
                })}
                className="border-cyan-500/30 text-cyan-400"
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Logs List */}
        <div className="space-y-3">
          {isLoading ? (
            <Card className="glass-effect border-cyan-500/20">
              <CardContent className="p-8 text-center text-slate-400">
                Loading audit logs...
              </CardContent>
            </Card>
          ) : logs.length === 0 ? (
            <Card className="glass-effect border-cyan-500/20">
              <CardContent className="p-8 text-center text-slate-400">
                No audit logs found
              </CardContent>
            </Card>
          ) : (
            logs.map((log) => (
              <Card key={log.id} className="glass-effect border-cyan-500/20 hover:border-cyan-500/40 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={cn("text-xs", eventTypeColors[log.event_type] || 'bg-slate-500/10 text-slate-400')}>
                          {log.event_type.replace(/_/g, ' ')}
                        </Badge>
                        <Badge className={cn("text-xs", statusColors[log.status])}>
                          {log.status}
                        </Badge>
                        {log.amount && (
                          <Badge variant="outline" className="text-xs border-cyan-500/30 text-cyan-400">
                            {log.amount > 0 ? '+' : ''}{log.amount} $ASC
                          </Badge>
                        )}
                      </div>

                      <p className="text-white font-medium mb-1">{log.action}</p>

                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {log.actor_name} ({log.actor_role})
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(log.created_date).toLocaleString()}
                        </span>
                        {log.ip_address && (
                          <span className="flex items-center gap-1">
                            <Activity className="w-3 h-3" />
                            {log.ip_address}
                          </span>
                        )}
                      </div>

                      {log.reason && (
                        <p className="text-sm text-slate-400 mt-2">
                          <strong>Reason:</strong> {log.reason}
                        </p>
                      )}

                      {log.error_message && (
                        <p className="text-sm text-red-400 mt-2">
                          <strong>Error:</strong> {log.error_message}
                        </p>
                      )}

                      {(log.before_state || log.after_state) && (
                        <details className="mt-2">
                          <summary className="text-sm text-cyan-400 cursor-pointer hover:text-cyan-300">
                            View State Changes
                          </summary>
                          <div className="mt-2 p-3 bg-slate-800/50 rounded-lg text-xs">
                            {log.before_state && (
                              <div className="mb-2">
                                <strong className="text-slate-400">Before:</strong>
                                <pre className="text-slate-300 mt-1">{JSON.stringify(log.before_state, null, 2)}</pre>
                              </div>
                            )}
                            {log.after_state && (
                              <div>
                                <strong className="text-slate-400">After:</strong>
                                <pre className="text-slate-300 mt-1">{JSON.stringify(log.after_state, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        </details>
                      )}
                    </div>

                    <div className="text-right text-xs text-slate-500">
                      <div>ID: {log.request_id || log.id.slice(0, 8)}</div>
                      {log.target_id && (
                        <div className="mt-1">Target: {log.target_id.slice(0, 8)}</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}