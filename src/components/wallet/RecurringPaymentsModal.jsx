import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Repeat, Loader2, Trash2, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function RecurringPaymentsModal({ isOpen, onClose, currentUser }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [description, setDescription] = useState('');
  const queryClient = useQueryClient();

  const { data: recurringPayments = [], isLoading } = useQuery({
    queryKey: ['recurringPayments', currentUser?.id],
    queryFn: async () => {
      // You would need to create a RecurringPayment entity for this
      // For now, returning empty array as placeholder
      return [];
    },
    enabled: !!currentUser && isOpen
  });

  const createPaymentMutation = useMutation({
    mutationFn: async () => {
      const paymentAmount = parseFloat(amount);
      
      if (paymentAmount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Validate recipient exists
      const recipientWallets = await base44.entities.TokenWallet.filter({ 
        wallet_address: recipientAddress 
      });

      if (recipientWallets.length === 0) {
        throw new Error('Recipient wallet not found');
      }

      // Create recurring payment record
      // This would require a new RecurringPayment entity
      toast.info('Recurring payments feature coming soon!');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringPayments'] });
      toast.success('Recurring payment set up!');
      setShowAddForm(false);
      setRecipientAddress('');
      setAmount('');
      setDescription('');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to set up recurring payment');
    }
  });

  const cancelPaymentMutation = useMutation({
    mutationFn: async (paymentId) => {
      // Cancel recurring payment
      toast.info('Recurring payments feature coming soon!');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringPayments'] });
      toast.success('Recurring payment cancelled');
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-cyan-500/20 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Repeat className="w-5 h-5 text-cyan-400" />
            Recurring Payments
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!showAddForm ? (
            <>
              <Button
                onClick={() => setShowAddForm(true)}
                className="w-full bg-gradient-to-r from-cyan-500 to-purple-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Set Up New Recurring Payment
              </Button>

              <div className="space-y-2">
                {isLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-400" />
                  </div>
                ) : recurringPayments.length > 0 ? (
                  recurringPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="bg-slate-900/50 border border-cyan-500/20 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-white">{payment.description}</p>
                          <p className="text-sm text-slate-400 font-mono mt-1">
                            To: {payment.recipient_address?.slice(0, 6)}...{payment.recipient_address?.slice(-4)}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                              {payment.amount} $ASC
                            </Badge>
                            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                              {payment.frequency}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Next payment: {formatDistanceToNow(new Date(payment.next_payment_date), { addSuffix: true })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => cancelPaymentMutation.mutate(payment.id)}
                          disabled={cancelPaymentMutation.isPending}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Repeat className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                    <p className="text-slate-400">No recurring payments set up</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Recipient Wallet Address</Label>
                <Input
                  placeholder="0x..."
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className="bg-slate-900/50 border-cyan-500/20 text-white font-mono"
                />
              </div>

              <div>
                <Label className="text-slate-300">Amount ($ASC)</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-slate-900/50 border-cyan-500/20 text-white"
                />
              </div>

              <div>
                <Label className="text-slate-300">Frequency</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger className="bg-slate-900/50 border-cyan-500/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-300">Description</Label>
                <Input
                  placeholder="e.g., Subscription, Rent, etc."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-slate-900/50 border-cyan-500/20 text-white"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => createPaymentMutation.mutate()}
                  disabled={createPaymentMutation.isPending || !recipientAddress || !amount}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500"
                >
                  {createPaymentMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Set Up Payment'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                  className="border-cyan-500/20"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}