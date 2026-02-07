import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
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

    // Add to creator wallet
    const wallets = await base44.entities.TokenWallet.filter({ user_id: user.id });
    if (wallets.length > 0) {
      await base44.entities.TokenWallet.update(wallets[0].id, {
        balance: wallets[0].balance + milestone.payout_amount
      });
    }

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
    return Response.json({ error: error.message }, { status: 500 });
  }
});