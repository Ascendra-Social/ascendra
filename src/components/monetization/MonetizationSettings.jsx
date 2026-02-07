import React, { useState } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Lock, Eye } from 'lucide-react';

export default function MonetizationSettings({ isPremium, setIsPremium, accessPrice, setAccessPrice, previewDuration, setPreviewDuration, isVideo }) {
  return (
    <div className="space-y-4 p-4 bg-slate-900/50 border border-cyan-500/20 rounded-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-cyan-400" />
          <Label className="text-slate-300">Enable Monetization</Label>
        </div>
        <Switch
          checked={isPremium}
          onCheckedChange={setIsPremium}
        />
      </div>

      {isPremium && (
        <>
          <div>
            <Label className="text-slate-300 flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-amber-400" />
              Access Price ($ASC)
            </Label>
            <Input
              type="number"
              placeholder="e.g., 50"
              value={accessPrice}
              onChange={(e) => setAccessPrice(e.target.value)}
              className="bg-slate-800 border-cyan-500/20 text-white"
            />
            <p className="text-xs text-slate-500 mt-1">
              Set a fair price for your premium content
            </p>
          </div>

          {isVideo && (
            <div>
              <Label className="text-slate-300 flex items-center gap-2 mb-2">
                <Eye className="w-4 h-4 text-purple-400" />
                Preview Duration (seconds)
              </Label>
              <Input
                type="number"
                placeholder="e.g., 15"
                value={previewDuration}
                onChange={(e) => setPreviewDuration(e.target.value)}
                className="bg-slate-800 border-cyan-500/20 text-white"
              />
              <p className="text-xs text-slate-500 mt-1">
                How long users can watch before payment
              </p>
            </div>
          )}

          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
            <p className="text-xs text-slate-300 mb-2">💡 Pricing Tips:</p>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• Images: 10-50 $ASC</li>
              <li>• Short videos: 25-100 $ASC</li>
              <li>• Tutorials/Courses: 100-500 $ASC</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}