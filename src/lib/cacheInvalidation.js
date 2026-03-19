/**
 * Centralized React Query cache invalidation strategy
 * Ensures dependent queries are invalidated together
 */

export const invalidateWalletQueries = (queryClient, userId) => {
  return Promise.all([
    // Invalidate all wallet queries (with or without userId)
    queryClient.invalidateQueries({ queryKey: ['wallet', userId] }),
    queryClient.invalidateQueries({ queryKey: ['wallet'] }),
    // Invalidate all transaction queries (matches all limit variations)
    queryClient.invalidateQueries({ 
      predicate: (query) => query.queryKey[0] === 'transactions' && (!userId || query.queryKey[1] === userId)
    })
  ]);
};

export const invalidatePostQueries = (queryClient, postId) => {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['posts'] }),
    queryClient.invalidateQueries({ queryKey: ['post', postId] }),
    queryClient.invalidateQueries({ queryKey: ['feed'] }),
    queryClient.invalidateQueries({ queryKey: ['trending'] })
  ]);
};

export const invalidateContractQueries = (queryClient, contractId) => {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['contracts'] }),
    queryClient.invalidateQueries({ queryKey: ['contract', contractId] }),
    queryClient.invalidateQueries({ queryKey: ['contractPayouts', contractId] })
  ]);
};

export const invalidateMarketplaceQueries = (queryClient) => {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['listings'] }),
    queryClient.invalidateQueries({ queryKey: ['marketplace'] })
  ]);
};

export const invalidateUserQueries = (queryClient, userId) => {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['user', userId] }),
    queryClient.invalidateQueries({ queryKey: ['followers', userId] }),
    queryClient.invalidateQueries({ queryKey: ['following', userId] })
  ]);
};

export const invalidateFinancialQueries = (queryClient, userId) => {
  return Promise.all([
    invalidateWalletQueries(queryClient, userId),
    queryClient.invalidateQueries({ queryKey: ['purchases', userId] }),
    queryClient.invalidateQueries({ queryKey: ['earnings', userId] })
  ]);
};