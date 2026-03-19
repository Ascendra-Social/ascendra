import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export const useWalletData = (userId) => {
  return useQuery({
    queryKey: ['wallet', userId],
    queryFn: async () => {
      const wallets = await base44.entities.TokenWallet.filter({ 
        user_id: userId,
        token_contract_address: 'ATF7deyT7FdS7GHip1Btv8t6Mj9vhsfzffoMZhE2vvwR'
      });
      if (wallets.length === 0) return null;
      return wallets.reduce((max, w) => (w.balance > max.balance ? w : max), wallets[0]);
    },
    enabled: !!userId,
    retry: false,
    staleTime: 10000 // 10 seconds
  });
};

export const useTransactionHistory = (userId, limit = 50) => {
  return useQuery({
    queryKey: ['transactions', userId, limit],
    queryFn: () => base44.entities.TokenTransaction.filter({ user_id: userId }, '-created_date', limit),
    enabled: !!userId,
    staleTime: 30000 // 30 seconds
  });
};