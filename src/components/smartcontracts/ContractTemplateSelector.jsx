import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Eye, DollarSign, Coins, TrendingUp, Code } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

const templates = [
  {
    type: 'engagement_rewards',
    icon: Zap,
    title: 'Engagement Rewards',
    description: 'Pay users for likes, shares, comments, and follows',
    color: 'from-cyan-500 to-blue-500',
    difficulty: 'Easy'
  },
  {
    type: 'pay_per_view',
    icon: Eye,
    title: 'Pay-Per-View Content',
    description: 'Monetize reels and posts with one-time access fees',
    color: 'from-purple-500 to-pink-500',
    difficulty: 'Easy'
  },
  {
    type: 'royalty_distribution',
    icon: DollarSign,
    title: 'Royalty Distribution',
    description: 'Automatically split revenue among collaborators',
    color: 'from-green-500 to-emerald-500',
    difficulty: 'Medium'
  },
  {
    type: 'fan_tokens',
    icon: Coins,
    title: 'Fan Tokens',
    description: 'Create exclusive tokens for your most dedicated fans',
    color: 'from-amber-500 to-orange-500',
    difficulty: 'Advanced'
  },
  {
    type: 'milestone_payment',
    icon: TrendingUp,
    title: 'Milestone Payments',
    description: 'Release payments when specific goals are achieved',
    color: 'from-indigo-500 to-violet-500',
    difficulty: 'Medium'
  },
  {
    type: 'custom',
    icon: Code,
    title: 'Custom Contract',
    description: 'Build your own contract with AI assistance',
    color: 'from-rose-500 to-red-500',
    difficulty: 'Advanced'
  }
];

export default function ContractTemplateSelector({ onSelect }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((template, index) => (
        <motion.button
          key={template.type}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onSelect(template.type)}
          className="text-left p-5 bg-slate-800/50 border border-cyan-500/20 rounded-2xl hover:border-cyan-500/40 transition-all group"
        >
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${template.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
            <template.icon className="w-6 h-6 text-white" />
          </div>
          
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-white">{template.title}</h3>
            <Badge className="bg-slate-700/50 text-slate-300 text-xs border-slate-600">
              {template.difficulty}
            </Badge>
          </div>
          
          <p className="text-sm text-slate-400">{template.description}</p>
        </motion.button>
      ))}
    </div>
  );
}