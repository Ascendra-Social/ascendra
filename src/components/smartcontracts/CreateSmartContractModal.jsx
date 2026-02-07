import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileCode, Sparkles, Loader2, Plus, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function CreateSmartContractModal({ isOpen, onClose, user }) {
  const [contractName, setContractName] = useState('');
  const [description, setDescription] = useState('');
  const [contractType, setContractType] = useState('engagement_rewards');
  const [totalBudget, setTotalBudget] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
  
  // Engagement requirements
  const [likeRequired, setLikeRequired] = useState(false);
  const [likeReward, setLikeReward] = useState('');
  const [shareRequired, setShareRequired] = useState(false);
  const [shareReward, setShareReward] = useState('');
  const [commentRequired, setCommentRequired] = useState(false);
  const [commentReward, setCommentReward] = useState('');
  const [followRequired, setFollowRequired] = useState(false);
  const [followReward, setFollowReward] = useState('');

  const queryClient = useQueryClient();

  const generateWithAI = async () => {
    if (!aiPrompt) {
      toast.error('Please describe what you want the contract to do');
      return;
    }

    setGeneratingAI(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a smart contract specification for a social media engagement campaign.

User request: ${aiPrompt}

Provide a JSON response with:
- contract_name: A catchy name for this campaign
- description: Clear description of the contract
- engagement_requirements: Which actions are required (like, share, comment, follow) and suggested reward amounts in $ASC tokens
- recommended_budget: Total budget suggestion based on expected engagement

Be creative and consider fair reward amounts. A typical like might be worth 1-5 $ASC, shares 5-15 $ASC, comments 10-25 $ASC.`,
        response_json_schema: {
          type: "object",
          properties: {
            contract_name: { type: "string" },
            description: { type: "string" },
            engagement_requirements: {
              type: "object",
              properties: {
                like_required: { type: "boolean" },
                like_reward: { type: "number" },
                share_required: { type: "boolean" },
                share_reward: { type: "number" },
                comment_required: { type: "boolean" },
                comment_reward: { type: "number" },
                follow_required: { type: "boolean" },
                follow_reward: { type: "number" }
              }
            },
            recommended_budget: { type: "number" }
          }
        }
      });

      // Apply AI suggestions
      setContractName(result.contract_name);
      setDescription(result.description);
      setTotalBudget(result.recommended_budget.toString());
      
      const req = result.engagement_requirements;
      setLikeRequired(req.like_required);
      setLikeReward(req.like_reward?.toString() || '');
      setShareRequired(req.share_required);
      setShareReward(req.share_reward?.toString() || '');
      setCommentRequired(req.comment_required);
      setCommentReward(req.comment_reward?.toString() || '');
      setFollowRequired(req.follow_required);
      setFollowReward(req.follow_reward?.toString() || '');

      toast.success('AI generated contract template!');
    } catch (error) {
      toast.error('Failed to generate contract');
    } finally {
      setGeneratingAI(false);
    }
  };

  const createContractMutation = useMutation({
    mutationFn: async () => {
      const budget = parseFloat(totalBudget);
      
      if (budget <= 0) {
        throw new Error('Budget must be greater than 0');
      }

      // Verify user has sufficient balance
      const wallets = await base44.entities.TokenWallet.filter({ user_id: user.id });
      if (wallets.length === 0 || wallets[0].balance < budget) {
        throw new Error('Insufficient balance');
      }

      // Deduct budget from wallet
      await base44.entities.TokenWallet.update(wallets[0].id, {
        balance: wallets[0].balance - budget
      });

      // Create transaction
      await base44.entities.TokenTransaction.create({
        user_id: user.id,
        type: 'spending',
        amount: -budget,
        description: `Smart contract deposit: ${contractName}`
      });

      // Create contract
      const contract = await base44.entities.SmartContract.create({
        creator_id: user.id,
        creator_name: user.full_name,
        contract_name: contractName,
        description,
        contract_type: contractType,
        total_budget: budget,
        engagement_requirements: {
          like_required: likeRequired,
          like_reward: parseFloat(likeReward) || 0,
          share_required: shareRequired,
          share_reward: parseFloat(shareReward) || 0,
          comment_required: commentRequired,
          comment_reward: parseFloat(commentReward) || 0,
          follow_required: followRequired,
          follow_reward: parseFloat(followReward) || 0
        },
        status: 'active',
        start_date: new Date().toISOString()
      });

      return contract;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Smart contract created!');
      onClose();
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create contract');
    }
  });

  const resetForm = () => {
    setContractName('');
    setDescription('');
    setTotalBudget('');
    setAiPrompt('');
    setLikeRequired(false);
    setLikeReward('');
    setShareRequired(false);
    setShareReward('');
    setCommentRequired(false);
    setCommentReward('');
    setFollowRequired(false);
    setFollowReward('');
  };

  const totalRewards = 
    (likeRequired ? parseFloat(likeReward) || 0 : 0) +
    (shareRequired ? parseFloat(shareReward) || 0 : 0) +
    (commentRequired ? parseFloat(commentReward) || 0 : 0) +
    (followRequired ? parseFloat(followReward) || 0 : 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-cyan-500/20 max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <FileCode className="w-5 h-5 text-cyan-400" />
            Create Smart Contract
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="ai" className="space-y-4">
          <TabsList className="bg-slate-900/50 border border-cyan-500/20">
            <TabsTrigger value="ai" className="data-[state=active]:bg-cyan-500/20">
              <Sparkles className="w-4 h-4 mr-2" />
              AI Assistant
            </TabsTrigger>
            <TabsTrigger value="manual" className="data-[state=active]:bg-cyan-500/20">
              <FileCode className="w-4 h-4 mr-2" />
              Manual Setup
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="space-y-4">
            <div>
              <Label className="text-slate-300">Describe Your Campaign</Label>
              <Textarea
                placeholder="E.g., I want to reward users who like and share my new product launch post. Budget is 1000 $ASC"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="bg-slate-900/50 border-cyan-500/20 text-white h-24"
              />
            </div>

            <Button
              onClick={generateWithAI}
              disabled={generatingAI}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
            >
              {generatingAI ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Contract with AI
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <div>
              <Label className="text-slate-300">Contract Name</Label>
              <Input
                placeholder="E.g., Product Launch Rewards"
                value={contractName}
                onChange={(e) => setContractName(e.target.value)}
                className="bg-slate-900/50 border-cyan-500/20 text-white"
              />
            </div>

            <div>
              <Label className="text-slate-300">Description</Label>
              <Textarea
                placeholder="Describe what this contract does..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-slate-900/50 border-cyan-500/20 text-white"
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Contract Details */}
        {(contractName || aiPrompt) && (
          <div className="space-y-4 pt-4 border-t border-cyan-500/20">
            <div>
              <Label className="text-slate-300">Total Budget ($ASC)</Label>
              <Input
                type="number"
                placeholder="1000"
                value={totalBudget}
                onChange={(e) => setTotalBudget(e.target.value)}
                className="bg-slate-900/50 border-cyan-500/20 text-white"
              />
            </div>

            <div>
              <Label className="text-slate-300 mb-3 block">Engagement Requirements & Rewards</Label>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-slate-900/50 border border-cyan-500/20 rounded-lg">
                  <Checkbox
                    checked={likeRequired}
                    onCheckedChange={setLikeRequired}
                    id="like"
                  />
                  <Label htmlFor="like" className="flex-1 text-white cursor-pointer">Like</Label>
                  {likeRequired && (
                    <Input
                      type="number"
                      placeholder="Reward"
                      value={likeReward}
                      onChange={(e) => setLikeReward(e.target.value)}
                      className="w-24 bg-slate-800 border-cyan-500/20 text-white"
                    />
                  )}
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-900/50 border border-cyan-500/20 rounded-lg">
                  <Checkbox
                    checked={shareRequired}
                    onCheckedChange={setShareRequired}
                    id="share"
                  />
                  <Label htmlFor="share" className="flex-1 text-white cursor-pointer">Share</Label>
                  {shareRequired && (
                    <Input
                      type="number"
                      placeholder="Reward"
                      value={shareReward}
                      onChange={(e) => setShareReward(e.target.value)}
                      className="w-24 bg-slate-800 border-cyan-500/20 text-white"
                    />
                  )}
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-900/50 border border-cyan-500/20 rounded-lg">
                  <Checkbox
                    checked={commentRequired}
                    onCheckedChange={setCommentRequired}
                    id="comment"
                  />
                  <Label htmlFor="comment" className="flex-1 text-white cursor-pointer">Comment</Label>
                  {commentRequired && (
                    <Input
                      type="number"
                      placeholder="Reward"
                      value={commentReward}
                      onChange={(e) => setCommentReward(e.target.value)}
                      className="w-24 bg-slate-800 border-cyan-500/20 text-white"
                    />
                  )}
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-900/50 border border-cyan-500/20 rounded-lg">
                  <Checkbox
                    checked={followRequired}
                    onCheckedChange={setFollowRequired}
                    id="follow"
                  />
                  <Label htmlFor="follow" className="flex-1 text-white cursor-pointer">Follow</Label>
                  {followRequired && (
                    <Input
                      type="number"
                      placeholder="Reward"
                      value={followReward}
                      onChange={(e) => setFollowReward(e.target.value)}
                      className="w-24 bg-slate-800 border-cyan-500/20 text-white"
                    />
                  )}
                </div>
              </div>
            </div>

            {totalRewards > 0 && (
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Reward per completion:</span>
                  <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                    {totalRewards} $ASC
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-slate-300">Est. participants:</span>
                  <span className="text-white font-semibold">
                    {totalBudget && totalRewards > 0 ? Math.floor(parseFloat(totalBudget) / totalRewards) : 0}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => createContractMutation.mutate()}
                disabled={createContractMutation.isPending || !contractName || !totalBudget}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500"
              >
                {createContractMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Deploy Contract
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
        )}
      </DialogContent>
    </Dialog>
  );
}