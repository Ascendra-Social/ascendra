import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, AlertCircle, CheckCircle2, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function AIContractBuilder({ contractType, onContractGenerated }) {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedContract, setGeneratedContract] = useState(null);
  const [securityScore, setSecurityScore] = useState(null);

  const getPromptTemplate = () => {
    const templates = {
      engagement_rewards: 'E.g., I want to reward 10 $ASC for every like and 50 $ASC for shares on my product launch post',
      pay_per_view: 'E.g., Charge 25 $ASC to view my exclusive cooking tutorial reel with a 30-second preview',
      royalty_distribution: 'E.g., Split revenue from my digital product 60% to me, 30% to designer, 10% to marketer',
      fan_tokens: 'E.g., Create 1000 fan tokens at 100 $ASC each with exclusive perks like early access and meet & greets',
      milestone_payment: 'E.g., Release 500 $ASC when I hit 1000 followers, 1000 $ASC at 5000 followers',
      custom: 'Describe any contract logic you need...'
    };
    return templates[contractType] || templates.custom;
  };

  const generateContract = async () => {
    if (!prompt) {
      toast.error('Please describe your contract requirements');
      return;
    }

    setGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a smart contract specialist. Generate a secure, fair contract based on user requirements.

Contract Type: ${contractType}
User Requirements: ${prompt}

Provide a JSON response with:
1. contract_name: Clear, professional name
2. description: Detailed explanation
3. Configuration object specific to the contract type
4. security_recommendations: Array of security best practices
5. estimated_budget: Suggested total budget
6. risk_level: low/medium/high

For ${contractType}:
${contractType === 'engagement_rewards' ? '- Include engagement_requirements with boolean flags and reward amounts' : ''}
${contractType === 'pay_per_view' ? '- Include pay_per_view_config with price_per_view, preview_duration' : ''}
${contractType === 'royalty_distribution' ? '- Include royalty_config with beneficiaries array (user_id, percentage), distribution_frequency' : ''}
${contractType === 'fan_tokens' ? '- Include fan_token_config with token_name, total_supply, price_per_token, benefits array' : ''}
${contractType === 'milestone_payment' ? '- Include milestone_config with milestones array (description, target_value, payout_amount)' : ''}

Ensure percentages sum to 100%, prices are reasonable, and include security measures like max_payout_per_user and cooldown_period.`,
        response_json_schema: {
          type: "object",
          properties: {
            contract_name: { type: "string" },
            description: { type: "string" },
            configuration: { type: "object" },
            security_recommendations: { 
              type: "array",
              items: { type: "string" }
            },
            estimated_budget: { type: "number" },
            risk_level: { 
              type: "string",
              enum: ["low", "medium", "high"]
            }
          }
        }
      });

      // Security scoring
      const securityFeatures = {
        has_cooldown: result.configuration.security_features?.cooldown_period > 0,
        has_max_payout: result.configuration.security_features?.max_payout_per_user > 0,
        reasonable_amounts: result.estimated_budget < 100000,
        risk_level: result.risk_level
      };
      
      const score = Object.values(securityFeatures).filter(v => v === true).length * 20;
      setSecurityScore(score);
      setGeneratedContract(result);
      
      toast.success('Contract generated successfully!');
    } catch (error) {
      toast.error('Failed to generate contract');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const approveContract = () => {
    if (generatedContract) {
      onContractGenerated({
        name: generatedContract.contract_name,
        description: generatedContract.description,
        config: generatedContract.configuration,
        budget: generatedContract.estimated_budget
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-slate-300">Describe Your Contract Requirements</Label>
        <Textarea
          placeholder={getPromptTemplate()}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="bg-slate-900/50 border-cyan-500/20 text-white h-32 mt-2"
        />
      </div>

      <Button
        onClick={generateContract}
        disabled={generating || !prompt}
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
      >
        {generating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            AI is analyzing your requirements...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Contract with AI
          </>
        )}
      </Button>

      {generatedContract && (
        <div className="space-y-4 pt-4 border-t border-cyan-500/20">
          <div className="bg-slate-900/50 border border-cyan-500/20 rounded-xl p-4">
            <h3 className="font-semibold text-white mb-2">{generatedContract.contract_name}</h3>
            <p className="text-sm text-slate-400 mb-4">{generatedContract.description}</p>

            <div className="flex items-center gap-2 mb-4">
              <Badge className={`${
                generatedContract.risk_level === 'low' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                generatedContract.risk_level === 'medium' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                'bg-red-500/20 text-red-400 border-red-500/30'
              }`}>
                Risk: {generatedContract.risk_level}
              </Badge>
              
              <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                <Shield className="w-3 h-3 mr-1" />
                Security: {securityScore}%
              </Badge>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-3 mb-4">
              <p className="text-xs text-slate-400 mb-2">Estimated Budget:</p>
              <p className="text-2xl font-bold text-white">{generatedContract.estimated_budget} $ASC</p>
            </div>

            {generatedContract.security_recommendations?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  Security Recommendations
                </p>
                <ul className="space-y-1">
                  {generatedContract.security_recommendations.map((rec, i) => (
                    <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                      <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <Button
            onClick={approveContract}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Approve & Continue
          </Button>
        </div>
      )}
    </div>
  );
}