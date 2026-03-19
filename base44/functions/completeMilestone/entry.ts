import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  const MAX_RETRIES = 3;
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const base44 = createClientFromRequest(req);
      const user = await base44.auth.me();

      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { contract_id, milestone_index } = await req.json();

      // Get contract
      const contracts = await base44.entities.SmartContract.filter({ id: contract_id });
      if (contracts.length === 0) {
        return Response.json({ error: 'Contract not found' }, { status: 404 });
      }
      const contract = contracts[0];

      // Only creator can complete milestones
      if (contract.creator_id !== user.id) {
        return Response.json({ error: 'Only creator can complete milestones' }, { status: 403 });
      }

      if (contract.contract_type !== 'milestone_payment') {
        return Response.json({ error: 'Not a milestone contract' }, { status: 400 });
      }

      const milestoneConfig = contract.milestone_config;
      if (!milestoneConfig || !milestoneConfig.milestones) {
        return Response.json({ error: 'Invalid milestone configuration' }, { status: 400 });
      }

      const milestone = milestoneConfig.milestones[milestone_index];
      if (!milestone) {
        return Response.json({ error: 'Milestone not found' }, { status: 404 });
      }

      if (milestone.completed) {
        return Response.json({ error: 'Milestone already completed' }, { status: 400 });
      }

      // Check budget
      const remaining = contract.total_budget - (contract.spent_amount || 0);
      if (remaining < milestone.payout_amount) {
        return Response.json({ error: 'Insufficient contract budget' }, { status: 400 });
      }

      // Get creator wallet with version
      const wallets = await base44.entities.TokenWallet.filter({ user_id: user.id });
      if (wallets.length === 0) {
        return Response.json({ error: 'Wallet not found' }, { status: 400 });
      }
      const creatorWallet = wallets[0];
      const creatorVersion = creatorWallet.version || 0;

      // Atomic update with version checking
      const walletUpdate = await base44.entities.TokenWallet.filter({
        id: creatorWallet.id,
        version: creatorVersion
      });
      
      if (walletUpdate.length === 0) {
        throw new Error('OPTIMISTIC_LOCK_FAILED');
      }

      await base44.entities.TokenWallet.update(creatorWallet.id, {
        balance: creatorWallet.balance + milestone.payout_amount,
        lifetime_earnings: (creatorWallet.lifetime_earnings || 0) + milestone.payout_amount,
        version: creatorVersion + 1
      });

      // Audit log
      console.log('[AUDIT] Milestone Completion:', {
        timestamp: new Date().toISOString(),
        user_id: user.id,
        contract_id: contract_id,
        milestone_index: milestone_index,
        payout_amount: milestone.payout_amount
      });

      // Create transaction
      await base44.entities.TokenTransaction.create({
        user_id: user.id,
        type: 'earning',
        amount: milestone.payout_amount,
        description: `Milestone completed: ${milestone.description}`
      });

      // Create payout record
      await base44.entities.SmartContractPayout.create({
        contract_id: contract_id,
        user_id: user.id,
        user_name: user.full_name,
        engagement_type: 'custom',
        amount_paid: milestone.payout_amount,
        verification_data: `Milestone ${milestone_index}: ${milestone.description}`,
        status: 'completed'
      });

      // Mark milestone as completed
      milestoneConfig.milestones[milestone_index].completed = true;

      // Update contract
      await base44.entities.SmartContract.update(contract_id, {
        milestone_config: milestoneConfig,
        spent_amount: (contract.spent_amount || 0) + milestone.payout_amount,
        total_payouts: (contract.total_payouts || 0) + 1
      });

      // Check if all milestones completed
      const allCompleted = milestoneConfig.milestones.every(m => m.completed);
      if (allCompleted) {
        await base44.entities.SmartContract.update(contract_id, {
          status: 'completed'
        });
      }

      return Response.json({ 
        success: true,
        amount: milestone.payout_amount,
        all_completed: allCompleted
      });
    } catch (error) {
      if (error.message === 'OPTIMISTIC_LOCK_FAILED' && attempt < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
        continue;
      }
      return Response.json({ error: error.message }, { status: 500 });
    }
  }
  
  return Response.json({ error: 'Transaction failed after retries' }, { status: 500 });
});