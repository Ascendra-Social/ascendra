import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  Coins, TrendingUp, ArrowUpRight, ArrowDownLeft, 
  Clock, Sparkles, Gift, ShoppingBag, Zap, Wallet as WalletIcon, Send, Repeat, Filter
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import TokenBalance from '@/components/wallet/TokenBalance';
import TransactionFilters from '@/components/wallet/TransactionFilters';
import SendTokensModal from '@/components/wallet/SendTokensModal';
import RecurringPaymentsModal from '@/components/wallet/RecurringPaymentsModal';
import WalletConnectionModal from '@/components/wallet/WalletConnectionModal';
import { formatDistanceToNow, isAfter, isBefore } from 'date-fns';
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
  const [connectedWallet, setConnectedWallet] = useState(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [filters, setFilters] = useState({
    type: 'all',
    dateFrom: null,
    dateTo: null,
    minAmount: '',
    maxAmount: ''
  });

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

  // Fetch on-chain token balance
  const { data: tokenBalance, isLoading: balanceLoading } = useQuery({
    queryKey: ['solana-balance', publicKey?.toString()],
    queryFn: async () => {
      if (!publicKey || !connected) return 0;
      
      try {
        const mintPubkey = new PublicKey(ASCENDRA_TOKEN_MINT);
        
        // Get all token accounts for this wallet
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: TOKEN_PROGRAM_ID
        });
        
        // Find the Ascendra token account
        const ascendraAccount = tokenAccounts.value.find(
          account => account.account.data.parsed.info.mint === ASCENDRA_TOKEN_MINT
        );
        
        if (!ascendraAccount) return 0;
        
        const balance = ascendraAccount.account.data.parsed.info.tokenAmount.uiAmount;
        return balance || 0;
      } catch (error) {
        console.error('Error fetching token balance:', error);
        return 0;
      }
    },
    enabled: !!publicKey && connected,
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      const wallets = await base44.entities.TokenWallet.filter({ 
        user_id: user?.id,
        token_contract_address: ASCENDRA_TOKEN_MINT
      });
      if (wallets.length === 0) {
        // Create wallet record
        const newWallet = await base44.entities.TokenWallet.create({
          user_id: user.id,
          token_contract_address: ASCENDRA_TOKEN_MINT,
          balance: tokenBalance || 0,
          lifetime_earnings: 0,
          pending_earnings: 0,
          wallet_address: publicKey?.toString() || ''
        });
        return newWallet;
      }
      // Return wallet with live balance
      const dbWallet = wallets.reduce((max, w) => (w.balance > max.balance ? w : max), wallets[0]);
      return {
        ...dbWallet,
        balance: tokenBalance || dbWallet.balance,
        wallet_address: publicKey?.toString() || dbWallet.wallet_address
      };
    },
    enabled: !!user && !balanceLoading
  });

  const { data: allTransactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: () => base44.entities.TokenTransaction.filter(
      { user_id: user?.id },
      '-created_date',
      200
    ),
    enabled: !!user
  });

  // Apply filters
  const transactions = allTransactions?.filter(tx => {
    // Type filter
    if (filters.type !== 'all' && tx.type !== filters.type) return false;

    // Date range filter
    if (filters.dateFrom && isBefore(new Date(tx.created_date), filters.dateFrom)) return false;
    if (filters.dateTo && isAfter(new Date(tx.created_date), filters.dateTo)) return false;

    // Amount range filter
    const amount = Math.abs(tx.amount);
    if (filters.minAmount && amount < parseFloat(filters.minAmount)) return false;
    if (filters.maxAmount && amount > parseFloat(filters.maxAmount)) return false;

    return true;
  }) || [];

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
      {/* Multi-Wallet Connection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/50 border border-cyan-500/20 rounded-2xl p-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
              <WalletIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">
                {connectedWallet ? connectedWallet.wallet : 'Connect Wallet'}
              </h3>
              <p className="text-sm text-slate-400">
                {connectedWallet
                  ? `${connectedWallet.address.slice(0, 6)}...${connectedWallet.address.slice(-4)}`
                  : 'MetaMask, Phantom, Coinbase & more'}
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowConnectModal(true)}
            className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl h-10 px-4"
          >
            {connectedWallet ? 'Switch' : 'Connect'}
          </Button>
        </div>
      </motion.div>

      {/* Token Balance */}
      <TokenBalance 
        wallet={wallet}
        onDeposit={() => {}}
        onWithdraw={() => {}}
      />

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-2 gap-3"
      >
        <Button
          onClick={() => setShowSendModal(true)}
          className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white h-14"
        >
          <Send className="w-5 h-5 mr-2" />
          Send Tokens
        </Button>
        <Button
          onClick={() => setShowRecurringModal(true)}
          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white h-14"
        >
          <Repeat className="w-5 h-5 mr-2" />
          Recurring Payments
        </Button>
      </motion.div>

      {/* Tokenomics Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-2xl p-5 border border-cyan-500/20"
      >
        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
          <Zap className="w-5 h-5 text-cyan-400" />
          How You Earn $ASC
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-slate-300">
            <div className="w-2 h-2 rounded-full bg-cyan-400" />
            Receive tips from content
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <div className="w-2 h-2 rounded-full bg-purple-400" />
            Sell digital goods on marketplace
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            Engage with boosted content
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            And much more to come!
          </div>
        </div>
      </motion.div>

      {/* Earnings Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-slate-800/50 border border-cyan-500/20 rounded-2xl p-8 text-center"
      >
        <h3 className="font-semibold text-white mb-2">Earnings Breakdown</h3>
        <p className="text-slate-400">Coming Soon</p>
      </motion.div>

      {/* Transaction History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-slate-800/50 border border-cyan-500/20 rounded-2xl overflow-hidden"
      >
        <div className="p-5 border-b border-cyan-500/20">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">Transaction History</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="text-cyan-400 hover:text-cyan-300"
            >
              <Filter className="w-4 h-4 mr-2" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="p-4 border-b border-cyan-500/20">
            <TransactionFilters filters={filters} onFiltersChange={setFilters} />
          </div>
        )}

        <div className="divide-y divide-cyan-500/10">
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
                  className="p-4 flex items-center gap-3 hover:bg-slate-700/30 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-xl ${colorClass.split(' ')[1].replace('-100', '-500/20')} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${colorClass.split(' ')[0].replace('-600', '-400')}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">
                      {tx.description || tx.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {tx.created_date && formatDistanceToNow(new Date(tx.created_date), { addSuffix: true })}
                    </p>
                  </div>
                  <span className={`font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                    {isPositive ? '+' : '-'}{Math.abs(tx.amount)} $ASC
                  </span>
                </motion.div>
              );
            })
          ) : (
            <div className="p-8 text-center">
              <Clock className="w-12 h-12 mx-auto text-slate-600 mb-3" />
              <p className="text-slate-400">No transactions yet</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Modals */}
      <WalletConnectionModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onConnected={(w) => setConnectedWallet(w)}
      />

      <SendTokensModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        userWallet={wallet}
        currentUser={user}
      />

      <RecurringPaymentsModal
        isOpen={showRecurringModal}
        onClose={() => setShowRecurringModal(false)}
        currentUser={user}
      />
    </div>
  );
}

export default function Wallet() {
  return <WalletContent />;
}