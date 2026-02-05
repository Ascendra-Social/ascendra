import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lightbulb, Loader2, Coins } from 'lucide-react';
import { toast } from 'sonner';

const categories = [
  { value: 'feature', label: 'New Feature' },
  { value: 'improvement', label: 'Improvement' },
  { value: 'bug_fix', label: 'Bug Fix' },
  { value: 'ui_ux', label: 'UI/UX' },
  { value: 'performance', label: 'Performance' },
  { value: 'integration', label: 'Integration' },
  { value: 'other', label: 'Other' }
];

export default function CreateFeatureRequestModal({ isOpen, onClose, user }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'feature',
    initial_pledge: ''
  });
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      const request = await base44.entities.FeatureRequest.create({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        author_id: user.id,
        author_name: user.full_name
      });

      // If user pledged tokens
      if (formData.initial_pledge && parseFloat(formData.initial_pledge) > 0) {
        const pledgeAmount = parseFloat(formData.initial_pledge);
        
        // Create pledge
        await base44.entities.FeatureRequestPledge.create({
          request_id: request.id,
          user_id: user.id,
          user_name: user.full_name,
          amount_asc: pledgeAmount
        });

        // Update request total
        await base44.entities.FeatureRequest.update(request.id, {
          total_pledged_asc: pledgeAmount,
          votes_count: 1
        });

        // Deduct from wallet
        const wallets = await base44.entities.TokenWallet.filter({ user_id: user.id });
        if (wallets[0]) {
          await base44.entities.TokenWallet.update(wallets[0].id, {
            balance: (wallets[0].balance || 0) - pledgeAmount
          });

          // Record transaction
          await base44.entities.TokenTransaction.create({
            user_id: user.id,
            type: 'spending',
            amount: -pledgeAmount,
            description: `Pledged to: ${formData.title}`
          });
        }
      }

      return request;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-requests'] });
      toast.success('Feature request created!');
      onClose();
      setFormData({ title: '', description: '', category: 'feature', initial_pledge: '' });
    },
    onError: () => {
      toast.error('Failed to create request');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Title and description are required');
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-cyan-500" />
            Suggest a Feature
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="Brief title for your suggestion"
              required
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Describe your suggestion in detail..."
              rows={5}
              required
            />
          </div>

          <div>
            <Label>Category</Label>
            <Select value={formData.category} onValueChange={(val) => setFormData({...formData, category: val})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Initial Pledge (Optional)</Label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                value={formData.initial_pledge}
                onChange={(e) => setFormData({...formData, initial_pledge: e.target.value})}
                placeholder="0"
                className="pl-10"
              />
              <Coins className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            <p className="text-xs text-slate-500 mt-1">Pledge $ASC tokens to support this request</p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={createMutation.isPending}
              className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Submit Request'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}