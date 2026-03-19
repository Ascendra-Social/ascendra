import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, Shield, Zap, Check, ExternalLink, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const WALLETS = [
  {
    id: 'metamask',
    name: 'MetaMask',
    description: 'Ethereum & EVM chains',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg',
    chains: ['ETH', 'BNB', 'MATIC'],
    popular: true,
    connect: async () => {
      try {
        if (typeof window === 'undefined' || !window.ethereum?.isMetaMask) {
          window.open('https://metamask.io/download/', '_blank');
          throw new Error('MetaMask not installed. Opening download page...');
        }
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        return { address: accounts[0], wallet: 'MetaMask' };
      } catch (err) {
        if (err.code === 4001) {
          throw new Error('Connection request rejected');
        }
        throw err;
      }
    }
  },
  {
    id: 'phantom',
    name: 'Phantom',
    description: 'Solana & multi-chain',
    icon: 'https://phantom.app/img/phantom-logo.svg',
    chains: ['SOL', 'ETH', 'MATIC'],
    popular: true,
    connect: async () => {
      try {
        if (typeof window === 'undefined' || !window.solana?.isPhantom) {
          window.open('https://phantom.app/', '_blank');
          throw new Error('Phantom not installed. Opening download page...');
        }
        const resp = await window.solana.connect();
        return { address: resp.publicKey.toString(), wallet: 'Phantom' };
      } catch (err) {
        if (err.message?.includes('User rejected')) {
          throw new Error('Connection request rejected');
        }
        throw err;
      }
    }
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    description: 'Multi-chain support',
    icon: 'https://www.coinbase.com/img/favicon/favicon.ico',
    chains: ['ETH', 'SOL', 'BTC'],
    popular: false,
    connect: async () => {
      try {
        if (typeof window === 'undefined' || !window.ethereum?.isCoinbaseWallet) {
          window.open('https://www.coinbase.com/wallet', '_blank');
          throw new Error('Coinbase Wallet not installed. Opening download page...');
        }
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        return { address: accounts[0], wallet: 'Coinbase Wallet' };
      } catch (err) {
        if (err.code === 4001) {
          throw new Error('Connection request rejected');
        }
        throw err;
      }
    }
  },
  {
    id: 'trustwallet',
    name: 'Trust Wallet',
    description: 'BNB Chain & multi-chain',
    icon: 'https://trustwallet.com/assets/images/favicon.png',
    chains: ['BNB', 'ETH', 'SOL'],
    popular: false,
    connect: async () => {
      try {
        if (typeof window === 'undefined' || !window.ethereum?.isTrust) {
          window.open('https://trustwallet.com/', '_blank');
          throw new Error('Trust Wallet not installed. Opening download page...');
        }
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        return { address: accounts[0], wallet: 'Trust Wallet' };
      } catch (err) {
        if (err.code === 4001) {
          throw new Error('Connection request rejected');
        }
        throw err;
      }
    }
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    description: 'Connect any mobile wallet',
    icon: 'https://walletconnect.com/favicon.ico',
    chains: ['ETH', 'BNB', 'MATIC', 'SOL'],
    popular: false,
    connect: async () => {
      toast.info('WalletConnect QR scanning coming soon!');
      throw new Error('WalletConnect integration coming soon');
    }
  },
];

const CHAIN_COLORS = {
  ETH: 'bg-blue-100 text-blue-700',
  SOL: 'bg-purple-100 text-purple-700',
  BNB: 'bg-yellow-100 text-yellow-700',
  MATIC: 'bg-violet-100 text-violet-700',
  BTC: 'bg-orange-100 text-orange-700',
};

export default function WalletConnectionModal({ isOpen, onClose, onConnected }) {
  const [connecting, setConnecting] = useState(null);
  const [connected, setConnected] = useState(null);

  const handleConnect = async (wallet) => {
    setConnecting(wallet.id);
    try {
      const result = await wallet.connect();
      setConnected(result);
      toast.success(`${result.wallet} connected!`);
      if (onConnected) onConnected(result);
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      if (!err.message.includes('coming soon')) {
        toast.error(err.message || `Failed to connect ${wallet.name}`);
      }
    } finally {
      setConnecting(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-3xl bg-slate-900 border border-cyan-500/20 text-white p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-slate-700/50">
          <DialogTitle className="text-xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            Connect Wallet
          </DialogTitle>
          <p className="text-sm text-slate-400 mt-1">Choose your preferred wallet to get started</p>
        </DialogHeader>

        <div className="p-4 space-y-2 max-h-[420px] overflow-y-auto">
          {WALLETS.map((wallet) => (
            <button
              key={wallet.id}
              onClick={() => handleConnect(wallet)}
              disabled={!!connecting}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 hover:border-cyan-500/30 transition-all group text-left"
            >
              <img
                src={wallet.icon}
                alt={wallet.name}
                className="w-10 h-10 rounded-xl object-contain bg-white p-1"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-100">{wallet.name}</span>
                  {wallet.popular && (
                    <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs px-2 py-0">
                      Popular
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{wallet.description}</p>
                <div className="flex gap-1 mt-1.5">
                  {wallet.chains.map(chain => (
                    <span key={chain} className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${CHAIN_COLORS[chain]}`}>
                      {chain}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex-shrink-0">
                {connecting === wallet.id ? (
                  <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                ) : connected?.wallet === wallet.name ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-slate-700/50">
          <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Secure</span>
            <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Instant</span>
            <span className="flex items-center gap-1"><ExternalLink className="w-3.5 h-3.5" /> Non-custodial</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}