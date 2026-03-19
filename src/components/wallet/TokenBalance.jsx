import React from 'react';
import { Coins, TrendingUp, ArrowUpRight, ArrowDownLeft, Wallet } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';

export default function TokenBalance({ wallet, onDeposit, onWithdraw }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden"
    >
      {/* Main balance card */}
      <div className="relative bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 rounded-3xl p-8 text-white">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
            <span className="font-medium text-white/80">ASCENDRA Token Balance</span>
          </div>

          <div className="mb-8">
            <p className="text-5xl font-bold mb-2">
              {(wallet?.balance ?? 0).toLocaleString()}
              <span className="text-2xl ml-2 text-white/70">$ASC</span>
            </p>
            <p className="text-white/60 text-sm flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              ≈ ${((wallet?.balance || 0) * 0.10).toFixed(2)} USD
            </p>
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={onDeposit}
              className="flex-1 bg-white text-cyan-600 hover:bg-white/90 rounded-xl h-12 font-semibold"
            >
              <ArrowDownLeft className="w-5 h-5 mr-2" />
              Deposit
            </Button>
            <Button 
              onClick={onWithdraw}
              className="flex-1 bg-white/20 backdrop-blur text-white hover:bg-white/30 border-0 rounded-xl h-12 font-semibold"
            >
              <ArrowUpRight className="w-5 h-5 mr-2" />
              Withdraw
            </Button>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-sm text-slate-500">Lifetime Earnings</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            {(wallet?.lifetime_earnings ?? 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <Coins className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-sm text-slate-500">Pending</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            {(wallet?.pending_earnings ?? 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Wallet address */}
      {wallet?.wallet_address && (
        <div className="mt-4 bg-slate-50 rounded-2xl p-4 flex items-center gap-3">
          <Wallet className="w-5 h-5 text-slate-400" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400 mb-1">Wallet Address</p>
            <p className="text-sm font-mono text-slate-600 truncate">{wallet.wallet_address}</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}