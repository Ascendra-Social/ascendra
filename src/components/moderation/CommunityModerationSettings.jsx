import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Plus, X, Save, AlertTriangle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function CommunityModerationSettings({ community }) {
  const [rules, setRules] = useState(community.rules || []);
  const [newRule, setNewRule] = useState('');
  const [settings, setSettings] = useState({
    moderation_enabled: community.moderation_enabled ?? true,
    auto_mod_hate_speech: community.auto_mod_hate_speech ?? true,
    auto_mod_spam: community.auto_mod_spam ?? true,
    auto_mod_harassment: community.auto_mod_harassment ?? true,
    require_post_approval: community.require_post_approval ?? false,
    min_account_age_days: community.min_account_age_days ?? 0,
    verified_users_only: community.verified_users_only ?? false
  });

  const queryClient = useQueryClient();

  const updateSettingsMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Community.update(community.id, {
        rules,
        ...settings
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', community.id] });
    }
  });

  const addRule = () => {
    if (newRule.trim()) {
      setRules([...rules, newRule.trim()]);
      setNewRule('');
    }
  };

  const removeRule = (index) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Community Rules */}
      <Card className="rounded-2xl border-slate-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-violet-500" />
            Community Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {rules.map((rule, index) => (
              <div key={index} className="flex items-start gap-2 p-3 rounded-xl border border-slate-100">
                <Badge variant="outline" className="mt-0.5">{index + 1}</Badge>
                <p className="flex-1 text-sm text-slate-700">{rule}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRule(index)}
                  className="rounded-full h-8 w-8"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Add a new rule..."
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addRule()}
              className="rounded-xl"
            />
            <Button onClick={addRule} className="rounded-xl gap-2">
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Moderation Settings */}
      <Card className="rounded-2xl border-slate-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Auto-Moderation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Enable Moderation</Label>
              <p className="text-xs text-slate-500">Turn on/off all moderation features</p>
            </div>
            <Switch
              checked={settings.moderation_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, moderation_enabled: checked })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Auto-Flag Hate Speech</Label>
              <p className="text-xs text-slate-500">Automatically detect and flag hateful content</p>
            </div>
            <Switch
              checked={settings.auto_mod_hate_speech}
              onCheckedChange={(checked) => setSettings({ ...settings, auto_mod_hate_speech: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Auto-Flag Spam</Label>
              <p className="text-xs text-slate-500">Detect repetitive or promotional content</p>
            </div>
            <Switch
              checked={settings.auto_mod_spam}
              onCheckedChange={(checked) => setSettings({ ...settings, auto_mod_spam: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Auto-Flag Harassment</Label>
              <p className="text-xs text-slate-500">Flag personal attacks and bullying</p>
            </div>
            <Switch
              checked={settings.auto_mod_harassment}
              onCheckedChange={(checked) => setSettings({ ...settings, auto_mod_harassment: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Posting Requirements */}
      <Card className="rounded-2xl border-slate-100">
        <CardHeader>
          <CardTitle>Posting Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Require Post Approval</Label>
              <p className="text-xs text-slate-500">All posts must be approved by moderators</p>
            </div>
            <Switch
              checked={settings.require_post_approval}
              onCheckedChange={(checked) => setSettings({ ...settings, require_post_approval: checked })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Verified Users Only</Label>
              <p className="text-xs text-slate-500">Only ID-verified users can post</p>
            </div>
            <Switch
              checked={settings.verified_users_only}
              onCheckedChange={(checked) => setSettings({ ...settings, verified_users_only: checked })}
            />
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Minimum Account Age (days)</Label>
            <Input
              type="number"
              min="0"
              value={settings.min_account_age_days}
              onChange={(e) => setSettings({ ...settings, min_account_age_days: parseInt(e.target.value) || 0 })}
              className="rounded-xl"
            />
            <p className="text-xs text-slate-500 mt-1">0 = no restriction</p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button
        onClick={() => updateSettingsMutation.mutate()}
        disabled={updateSettingsMutation.isPending}
        className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white gap-2"
      >
        <Save className="w-4 h-4" />
        Save Moderation Settings
      </Button>
    </div>
  );
}