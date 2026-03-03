import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ContractTemplateSelector from './ContractTemplateSelector';
import AIContractBuilder from './AIContractBuilder';
import { FileCode, ArrowLeft, Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CreateSmartContractModal({ isOpen, onClose, user }) {
  const [step, setStep] = useState('select'); // select, build, finalize
  const [contractType, setContractType] = useState('');
  const [contractData, setContractData] = useState(null);
  const [totalBudget, setTotalBudget] = useState('');
  const [maxPayoutPerUser, setMaxPayoutPerUser] = useState('');
  const [cooldownHours, setCooldownHours] = useState('24');
  const [linkedContentId, setLinkedContentId] = useState('');

  const queryClient = useQueryClient();

  const handleTemplateSelect = (type) => {
    setContractType(type);
    setStep('build');
  };

  const handleAIGenerated = (data) => {
    setContractData(data);
    setTotalBudget(data.budget?.toString() || '');
    setStep('finalize');
  };

  const createContractMutation = useMutation({
    mutationFn: async () => {
      const budget = parseFloat(totalBudget);
      
      if (budget <= 0) {
        throw new Error('Budget must be greater than 0');
      }

      const wallets = await base44.entities.TokenWallet.filter({ user_id: user.id });
      if (wallets.length === 0 || wallets[0].balance < budget) {
        throw new Error('Insufficient balance');
      }

      await base44.entities.TokenWallet.update(wallets[0].id, {
        balance: wallets[0].balance - budget
      });

      await base44.entities.TokenTransaction.create({
        user_id: user.id,
        type: 'spending',
        amount: -budget,
        description: `Smart contract deposit: ${contractData.name}`
      });

      const contract = await base44.entities.SmartContract.create({
        creator_id: user.id,
        creator_name: user.full_name,
        contract_name: contractData.name,
        description: contractData.description,
        contract_type: contractType,
        total_budget: budget,
        ...contractData.config,
        security_features: {
          max_payout_per_user: parseFloat(maxPayoutPerUser) || undefined,
          cooldown_period: parseFloat(cooldownHours) || 24,
          audit_trail: true,
          require_kyc: false
        },
        status: 'active',
        start_date: new Date().toISOString()
      });

      return contract;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Smart contract deployed successfully!');
      onClose();
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create contract');
    }
  });

  const resetForm = () => {
    setStep('select');
    setContractType('');
    setContractData(null);
    setTotalBudget('');
    setMaxPayoutPerUser('');
    setCooldownHours('24');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-cyan-500/20 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {step !== 'select' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setStep(step === 'finalize' ? 'build' : 'select')}
                className="text-slate-400 hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <DialogTitle className="text-white flex items-center gap-2">
              <FileCode className="w-5 h-5 text-cyan-400" />
              Create Smart Contract
              {step === 'build' && ` - ${contractType.replace(/_/g, ' ')}`}
            </DialogTitle>
          </div>
        </DialogHeader>

        {step === 'select' && (
          <div>
            <p className="text-slate-400 mb-6">Choose a contract template to get started</p>
            <ContractTemplateSelector onSelect={handleTemplateSelect} />
          </div>
        )}

        {step === 'build' && (
          <AIContractBuilder
            contractType={contractType}
            onContractGenerated={handleAIGenerated}
          />
        )}

        {step === 'finalize' && contractData && (
          <div className="space-y-4">
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-2">{contractData.name}</h3>
              <p className="text-sm text-slate-400">{contractData.description}</p>
            </div>

            <div>
              <Label className="text-slate-300">Total Budget ($ASC)</Label>
              <Input
                type="number"
                placeholder={contractData.budget}
                value={totalBudget}
                onChange={(e) => setTotalBudget(e.target.value)}
                className="bg-slate-900/50 border-cyan-500/20 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Max Payout per User ($ASC)</Label>
                <Input
                  type="number"
                  placeholder="Optional"
                  value={maxPayoutPerUser}
                  onChange={(e) => setMaxPayoutPerUser(e.target.value)}
                  className="bg-slate-900/50 border-cyan-500/20 text-white"
                />
              </div>

              <div>
                <Label className="text-slate-300">Cooldown Period (hours)</Label>
                <Input
                  type="number"
                  value={cooldownHours}
                  onChange={(e) => setCooldownHours(e.target.value)}
                  className="bg-slate-900/50 border-cyan-500/20 text-white"
                />
              </div>
            </div>

            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">Security Features:</span>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  Protected
                </Badge>
              </div>
              <ul className="mt-2 space-y-1 text-xs text-slate-400">
                <li>✓ Audit trail enabled</li>
                <li>✓ Cooldown period enforced</li>
                {maxPayoutPerUser && <li>✓ Per-user payout limits</li>}
              </ul>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => createContractMutation.mutate()}
                disabled={createContractMutation.isPending || !totalBudget}
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