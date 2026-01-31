import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  Coins, TrendingUp, ArrowUpRight, ArrowDownLeft, 
  Clock, Sparkles, Gift, ShoppingBag, Zap, Wallet as WalletIcon 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import TokenBalance from '@/components/wallet/TokenBalance';
import WalletProvider from '@/components/wallet/WalletProvider';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';

const transactionIcons = {
  earning: Sparkles,
  spending: ShoppingBag,
  transfer_in: ArrowDownLeft,
  transfer_out: ArrowUpRight,
  ad_reward: Gift,
  creator_reward: Zap,
  purchase: ShoppingBag,
  sale: Coins
};

const transactionColors = {
  earning: 'text-green-600 bg-green-100',
  spending: 'text-red-600 bg-red-100',
  transfer_in: 'text-blue-600 bg-blue-100',
  transfer_out: 'text-orange-600 bg-orange-100',
  ad_reward: 'text-amber-600 bg-amber-100',
  creator_reward: 'text-cyan-600 bg-cyan-100',
  purchase: 'text-pink-600 bg-pink-100',
  sale: 'text-emerald-600 bg-emerald-100'
};

function WalletContent() {
  const [user, setUser] = useState(null);
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [solBalance, setSolBalance] = useState(0);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  // Fetch SOL balance when wallet is connected
  useEffect(() => {
    const fetchBalance = async () => {
      if (connected && publicKey) {
        try {
          const balance = await connection.getBalance(publicKey);
          setSolBalance(balance / LAMPORTS_PER_SOL);
        } catch (error) {
          console.error('Failed to fetch SOL balance:', error);
        }
      }
    };
    fetchBalance();
    
    // Refresh balance every 30 seconds
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [connected, publicKey, connection]);

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      const wallets = await base44.entities.TokenWallet.filter({ user_id: user?.id });
      if (wallets.length === 0) {
        // Create wallet if doesn't exist
        const newWallet = await base44.entities.TokenWallet.create({
          user_id: user.id,
          balance: 100, // Starting bonus
          lifetime_earnings: 100,
          pending_earnings: 0,
          wallet_address: `0x${Math.random().toString(16).slice(2, 42)}`
        });
        return newWallet;
      }
      return wallets[0];
    },
    enabled: !!user
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: () => base44.entities.TokenTransaction.filter(
      { user_id: user?.id },
      '-created_date',
      50
    ),
    enabled: !!user
  });

  const earningsBreakdown = [
    { label: 'Content Creation', amount: 1250, icon: Sparkles, color: 'violet' },
    { label: 'Ad Engagement', amount: 480, icon: Gift, color: 'amber' },
    { label: 'Referrals', amount: 150, icon: TrendingUp, color: 'green' },
    { label: 'Marketplace Sales', amount: 320, icon: ShoppingBag, color: 'pink' },
  ];

  if (!user || walletLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Phantom Wallet Connection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-5 border border-slate-100"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <WalletIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Phantom Wallet</h3>
              <p className="text-sm text-slate-500">
                {connected ? 'Connected' : 'Connect your wallet'}
              </p>
            </div>
          </div>
          <WalletMultiButton className="!bg-gradient-to-r !from-cyan-500 !to-purple-500 !rounded-xl !h-10" />
        </div>

        {connected && publicKey && (
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Wallet Address</span>
              <span className="text-sm font-mono text-slate-800">
                {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">SOL Balance</span>
              <span className="text-sm font-semibold text-slate-800">
                {solBalance.toFixed(4)} SOL
              </span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Token Balance */}
      <TokenBalance 
        wallet={wallet}
        onDeposit={() => {}}
        onWithdraw={() => {}}
      />

      {/* Tokenomics Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-r from-cyan-50 to-purple-50 rounded-2xl p-5 border border-cyan-100"
      >
        <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Zap className="w-5 h-5 text-cyan-500" />
          How You Earn ASCENDRA
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <div className="w-2 h-2 rounded-full bg-cyan-400" />
            50% of ad revenue to users
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <div className="w-2 h-2 rounded-full bg-purple-400" />
            Engagement rewards
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            Content creation bonuses
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            Marketplace transactions
          </div>
        </div>
      </motion.div>

      {/* Earnings Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl p-5 border border-slate-100"
      >
        <h3 className="font-semibold text-slate-800 mb-4">Earnings Breakdown</h3>
        <div className="space-y-3">
          {earningsBreakdown.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-${item.color}-100 flex items-center justify-center`}>
                  <item.icon className={`w-5 h-5 text-${item.color}-600`} />
                </div>
                <span className="text-slate-700">{item.label}</span>
              </div>
              <span className="font-semibold text-slate-800">{item.amount} ASCENDRA</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Transaction History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
      >
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Transaction History</h3>
        </div>

        <div className="divide-y divide-slate-50">
          {transactionsLoading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="p-4 flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            ))
          ) : transactions?.length > 0 ? (
            transactions.map((tx, i) => {
              const Icon = transactionIcons[tx.type] || Coins;
              const colorClass = transactionColors[tx.type] || 'text-slate-600 bg-slate-100';
              const isPositive = ['earning', 'transfer_in', 'ad_reward', 'creator_reward', 'sale'].includes(tx.type);
              
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-xl ${colorClass.split(' ')[1]} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${colorClass.split(' ')[0]}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">
                      {tx.description || tx.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {tx.created_date && formatDistanceToNow(new Date(tx.created_date), { addSuffix: true })}
                    </p>
                  </div>
                  <span className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {isPositive ? '+' : '-'}{Math.abs(tx.amount)} ASCENDRA
                  </span>
                </motion.div>
              );
            })
          ) : (
            <div className="p-8 text-center">
              <Clock className="w-12 h-12 mx-auto text-slate-200 mb-3" />
              <p className="text-slate-500">No transactions yet</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function Wallet() {
  return (
    <WalletProvider>
      <WalletContent />
    </WalletProvider>
  );
}