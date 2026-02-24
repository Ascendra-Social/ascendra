import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lightbulb, Bug, Loader2, Coins, Info } from 'lucide-react';
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

export default function CreateFeatureRequestModal({ isOpen, onClose, user, defaultType = 'feature' }) {
  const isBug = defaultType === 'bug';
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    steps_to_reproduce: '',
    expected_behavior: '',
    actual_behavior: '',
    category: isBug ? 'bug_fix' : 'feature',
    priority: 'medium',
    initial_pledge: ''
  });
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        request_type: defaultType,
        author_id: user.id,
        author_name: user.full_name
      };
      if (isBug) {
        payload.steps_to_reproduce = formData.steps_to_reproduce;
        payload.expected_behavior = formData.expected_behavior;
        payload.actual_behavior = formData.actual_behavior;
      }

      const request = await base44.entities.FeatureRequest.create(payload);

      if (formData.initial_pledge && parseFloat(formData.initial_pledge) > 0) {
        const pledgeAmount = parseFloat(formData.initial_pledge);
        await base44.entities.FeatureRequestPledge.create({
          request_id: request.id,
          user_id: user.id,
          user_name: user.full_name,
          amount_asc: pledgeAmount
        });
        await base44.entities.FeatureRequest.update(request.id, {
          total_pledged_asc: pledgeAmount,
          upvotes_count: 1,
          votes_count: 1
        });
        const wallets = await base44.entities.TokenWallet.filter({ user_id: user.id });
        if (wallets[0]) {
          await base44.entities.TokenWallet.update(wallets[0].id, {
            balance: (wallets[0].balance || 0) - pledgeAmount
          });
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
      toast.success(isBug ? 'Bug report submitted!' : 'Feature request created!');
      onClose();
    },
    onError: () => {
      toast.error('Failed to submit. Try again.');
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
      <DialogContent className="sm:max-w-lg rounded-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isBug ? (
              <><Bug className="w-5 h-5 text-red-500" /> Report a Bug</>
            ) : (
              <><Lightbulb className="w-5 h-5 text-cyan-500" /> Suggest a Feature</>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder={isBug ? "Brief summary of the bug" : "Brief title for your suggestion"}
              required
            />
          </div>

          <div>
            <Label>{isBug ? 'What happened?' : 'Description'} *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder={isBug ? "Describe the bug in detail..." : "Describe your suggestion in detail..."}
              rows={3}
              required
            />
          </div>

          {isBug && (
            <>
              <div>
                <Label>Steps to Reproduce</Label>
                <Textarea
                  value={formData.steps_to_reproduce}
                  onChange={(e) => setFormData({...formData, steps_to_reproduce: e.target.value})}
                  placeholder={"1. Go to...\n2. Click on...\n3. See error"}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Expected Behavior</Label>
                  <Textarea
                    value={formData.expected_behavior}
                    onChange={(e) => setFormData({...formData, expected_behavior: e.target.value})}
                    placeholder="What should happen?"
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Actual Behavior</Label>
                  <Textarea
                    value={formData.actual_behavior}
                    onChange={(e) => setFormData({...formData, actual_behavior: e.target.value})}
                    placeholder="What actually happens?"
                    rows={2}
                  />
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={(val) => setFormData({...formData, category: val})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(val) => setFormData({...formData, priority: val})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Pledge $ASC to Escrow (Optional)</Label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                value={formData.initial_pledge}
                onChange={(e) => setFormData({...formData, initial_pledge: e.target.value})}
                placeholder="0"
                className="pl-10"
              />
              <Coins className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            <div className="flex items-start gap-1.5 mt-1.5 text-xs text-slate-400">
              <Info className="w-3 h-3 mt-0.5 shrink-0 text-cyan-500" />
              <span>Tokens are held in escrow and paid out to the developer who completes this request.</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className={isBug
                ? "bg-gradient-to-r from-red-500 to-orange-500 text-white"
                : "bg-gradient-to-r from-cyan-500 to-purple-500 text-white"
              }
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isBug ? 'Submit Bug Report' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}