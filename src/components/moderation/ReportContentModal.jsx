import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Flag, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const REPORT_REASONS = [
  { value: 'hate_speech', label: 'Hate Speech', desc: 'Discriminatory or offensive content' },
  { value: 'harassment', label: 'Harassment', desc: 'Personal attacks or bullying' },
  { value: 'spam', label: 'Spam', desc: 'Repetitive or promotional content' },
  { value: 'misinformation', label: 'Misinformation', desc: 'False or misleading information' },
  { value: 'violence', label: 'Violence', desc: 'Violent or graphic content' },
  { value: 'inappropriate_content', label: 'Inappropriate Content', desc: 'Sexual or explicit content' },
  { value: 'other', label: 'Other', desc: 'Other rule violations' }
];

export default function ReportContentModal({ 
  isOpen, 
  onClose, 
  contentId, 
  contentType,
  contentAuthorId,
  communityId,
  user 
}) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const queryClient = useQueryClient();

  const reportMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.CommunityReport.create({
        community_id: communityId,
        reported_content_id: contentId,
        reported_content_type: contentType,
        reported_user_id: contentAuthorId,
        reporter_id: user.id,
        reporter_name: user.full_name,
        reason,
        description,
        status: 'pending'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setReason('');
      setDescription('');
      onClose();
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg rounded-3xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-500" />
            Report Content
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-5">
          <div>
            <Label className="text-sm text-slate-600 mb-3 block">Why are you reporting this?</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              <div className="space-y-3">
                {REPORT_REASONS.map(r => (
                  <label
                    key={r.value}
                    className="flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer hover:border-violet-300 transition-all"
                  >
                    <RadioGroupItem value={r.value} id={r.value} className="mt-1" />
                    <div>
                      <p className="font-medium text-slate-800">{r.label}</p>
                      <p className="text-xs text-slate-500">{r.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="description" className="text-sm text-slate-600 mb-2 block">
              Additional Details (Optional)
            </Label>
            <Textarea
              id="description"
              placeholder="Provide more context about this report..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl resize-none"
              rows={4}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 pt-0 border-t border-slate-100">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={() => reportMutation.mutate()}
            disabled={!reason || reportMutation.isPending}
            className="bg-red-500 text-white rounded-xl gap-2 hover:bg-red-600"
          >
            {reportMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Flag className="w-4 h-4" />
                Submit Report
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}