import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Wallet, Shield, Zap } from 'lucide-react';

export default function WalletConnectionModal({ isOpen, onClose }) {
  const { connected, publicKey } = useWallet();

  React.useEffect(() => {
    if (connected && publicKey) {
      onClose();
    }
  }, [connected, publicKey, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Connect Your Wallet
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center">
              <Wallet className="w-8 h-8 text-violet-600" />
            </div>
            <p className="text-slate-600">
              Connect your Solana wallet to manage your $ASC tokens
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-violet-50 rounded-xl">
              <Shield className="w-5 h-5 text-violet-600" />
              <p className="text-sm text-slate-700">Secure & encrypted</p>
            </div>
            <div className="flex items-center gap-3 p-3 bg-pink-50 rounded-xl">
              <Zap className="w-5 h-5 text-pink-600" />
              <p className="text-sm text-slate-700">Instant transactions</p>
            </div>
          </div>

          <div className="flex justify-center">
            <WalletMultiButton className="!bg-gradient-to-r !from-violet-500 !to-pink-500 !rounded-xl !px-6 !py-3 !text-white hover:opacity-90 transition-opacity" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}