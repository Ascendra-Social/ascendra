import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { DollarSign, Coins, MessageSquare, Send } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function MakeOfferModal({ isOpen, onClose, listing, user }) {
  const [offerAmount, setOfferAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!offerAmount || parseFloat(offerAmount) <= 0) return;

    setIsSubmitting(true);
    try {
      await base44.entities.ListingOffer.create({
        listing_id: listing.id,
        buyer_id: user.id,
        buyer_name: user.full_name,
        buyer_avatar: user.avatar,
        offer_amount: parseFloat(offerAmount),
        message: message
      });

      onClose();
      setOfferAmount('');
      setMessage('');
    } catch (error) {
      console.error('Failed to submit offer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle>Make an Offer</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-slate-600">Listing Price</Label>
            <div className="flex items-center gap-2 mt-1 text-slate-700">
              <Coins className="w-4 h-4 text-cyan-500" />
              <span className="font-semibold">{listing.price} $ASC</span>
            </div>
          </div>

          <div>
            <Label>Your Offer Amount ($ASC)</Label>
            <div className="relative mt-1">
              <Input
                type="number"
                placeholder="Enter amount"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                className="rounded-xl pl-10"
              />
              <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500" />
            </div>
          </div>

          <div>
            <Label>Message (Optional)</Label>
            <Textarea
              placeholder="Tell the seller why they should accept your offer..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="rounded-xl mt-1 resize-none"
              rows={3}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !offerAmount}
            className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl gap-2"
          >
            <Send className="w-4 h-4" />
            Send Offer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}