import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Send, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function SendTokensModal({ isOpen, onClose, userWallet, currentUser }) {
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const queryClient = useQueryClient();

  const sendTokensMutation = useMutation({
    mutationFn: async () => {
      const sendAmount = parseFloat(amount);
      
      if (sendAmount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      if (sendAmount > userWallet.balance) {
        throw new Error('Insufficient balance');
      }

      // Find recipient wallet
      const recipientWallets = await base44.entities.TokenWallet.filter({ 
        wallet_address: recipientAddress 
      });

      if (recipientWallets.length === 0) {
        throw new Error('Recipient wallet not found');
      }

      const recipientWallet = recipientWallets[0];

      if (recipientWallet.user_id === currentUser.id) {
        throw new Error('Cannot send tokens to yourself');
      }

      // Deduct from sender
      await base44.entities.TokenWallet.update(userWallet.id, {
        balance: userWallet.balance - sendAmount
      });

      // Add to recipient
      await base44.entities.TokenWallet.update(recipientWallet.id, {
        balance: (recipientWallet.balance || 0) + sendAmount
      });

      // Create transactions
      await base44.entities.TokenTransaction.create({
        user_id: currentUser.id,
        type: 'transfer_out',
        amount: -sendAmount,
        description: `Sent to ${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}${message ? ': ' + message : ''}`
      });

      await base44.entities.TokenTransaction.create({
        user_id: recipientWallet.user_id,
        type: 'transfer_in',
        amount: sendAmount,
        description: `Received from ${currentUser.full_name}${message ? ': ' + message : ''}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Tokens sent successfully!');
      onClose();
      setRecipientAddress('');
      setAmount('');
      setMessage('');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to send tokens');
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-cyan-500/20">
        <DialogHeader>
          <DialogTitle className="text-white">Send $ASC Tokens</DialogTitle>
        </DialogHeader>

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
              step="0.01"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-slate-900/50 border-cyan-500/20 text-white"
            />
            <p className="text-xs text-slate-400 mt-1">
              Available: {userWallet?.balance || 0} $ASC
            </p>
          </div>

          <div>
            <Label className="text-slate-300">Message (optional)</Label>
            <Textarea
              placeholder="Add a note..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-slate-900/50 border-cyan-500/20 text-white"
              rows={3}
            />
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200">
              Double-check the recipient address. Token transfers cannot be reversed.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => sendTokensMutation.mutate()}
              disabled={sendTokensMutation.isPending || !recipientAddress || !amount}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500"
            >
              {sendTokensMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Tokens
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="border-cyan-500/20"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}