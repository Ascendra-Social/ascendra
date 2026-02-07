import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contract_id, engagement_type, content_id } = await req.json();

    // Get contract
    const contracts = await base44.entities.SmartContract.filter({ id: contract_id });
    if (contracts.length === 0) {
      return Response.json({ error: 'Contract not found' }, { status: 404 });
    }
    const contract = contracts[0];

    if (contract.status !== 'active') {
      return Response.json({ error: 'Contract not active' }, { status: 400 });
    }

    // Check if already rewarded
    const existingPayouts = await base44.entities.SmartContractPayout.filter({
      contract_id: contract_id,
      user_id: user.id,
      content_id: content_id,
      engagement_type: engagement_type
    });

    if (existingPayouts.length > 0) {
      return Response.json({ error: 'Already rewarded for this engagement' }, { status: 400 });
    }

    // Calculate reward amount
    const requirements = contract.engagement_requirements || {};
    let rewardAmount = 0;

    if (engagement_type === 'like' && requirements.like_required) {
      rewardAmount = requirements.like_reward || 0;
    } else if (engagement_type === 'share' && requirements.share_required) {
      rewardAmount = requirements.share_reward || 0;
    } else if (engagement_type === 'comment' && requirements.comment_required) {
      rewardAmount = requirements.comment_reward || 0;
    } else if (engagement_type === 'follow' && requirements.follow_required) {
      rewardAmount = requirements.follow_reward || 0;
    } else {
      return Response.json({ error: 'Invalid engagement type' }, { status: 400 });
    }

    if (rewardAmount <= 0) {
      return Response.json({ error: 'No reward configured' }, { status: 400 });
    }

    // Check contract budget
    const remaining = contract.total_budget - (contract.spent_amount || 0);
    if (remaining < rewardAmount) {
      return Response.json({ error: 'Insufficient contract budget' }, { status: 400 });
    }

    // Check security features
    const security = contract.security_features || {};
    
    // Check cooldown
    if (security.cooldown_period) {
      const cooldownMs = security.cooldown_period * 60 * 60 * 1000;
      const recentPayouts = await base44.entities.SmartContractPayout.filter({
        contract_id: contract_id,
        user_id: user.id
      });
      
      const lastPayout = recentPayouts
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
      
      if (lastPayout) {
        const timeSince = Date.now() - new Date(lastPayout.created_date).getTime();
        if (timeSince < cooldownMs) {
          return Response.json({ 
            error: 'Cooldown period not elapsed',
            retry_after: Math.ceil((cooldownMs - timeSince) / 1000 / 60) + ' minutes'
          }, { status: 429 });
        }
      }
    }

    // Check max payout per user
    if (security.max_payout_per_user) {
      const userPayouts = await base44.entities.SmartContractPayout.filter({
        contract_id: contract_id,
        user_id: user.id
      });
      const totalPaid = userPayouts.reduce((sum, p) => sum + p.amount_paid, 0);
      
      if (totalPaid + rewardAmount > security.max_payout_per_user) {
        return Response.json({ error: 'Max payout per user exceeded' }, { status: 400 });
      }
    }

    // Calculate 1% platform fee
    const feeAmount = (rewardAmount * 1) / 100;
    const netReward = rewardAmount - feeAmount;

    // Add to user wallet (net amount)
    const wallets = await base44.entities.TokenWallet.filter({ user_id: user.id });
    if (wallets.length > 0) {
      await base44.entities.TokenWallet.update(wallets[0].id, {
        balance: wallets[0].balance + netReward
      });
    } else {
      await base44.entities.TokenWallet.create({
        user_id: user.id,
        balance: netReward
      });
    }

    // Platform fee
    const platformWallets = await base44.asServiceRole.entities.TokenWallet.filter({ 
      user_id: 'platform' 
    });
    if (platformWallets.length > 0) {
      await base44.asServiceRole.entities.TokenWallet.update(platformWallets[0].id, {
        balance: platformWallets[0].balance + feeAmount
      });
    } else {
      await base44.asServiceRole.entities.TokenWallet.create({
        user_id: 'platform',
        balance: feeAmount
      });
    }

    // Create transaction
    await base44.entities.TokenTransaction.create({
      user_id: user.id,
      type: 'earning',
      amount: netReward,
      description: `${engagement_type} reward from ${contract.contract_name}`
    });

    // Platform fee transaction
    await base44.asServiceRole.entities.TokenTransaction.create({
      user_id: 'platform',
      type: 'earning',
      amount: feeAmount,
      description: `Platform fee (1%): Engagement reward`
    });

    // Create payout record
    await base44.entities.SmartContractPayout.create({
      contract_id: contract_id,
      user_id: user.id,
      user_name: user.full_name,
      engagement_type: engagement_type,
      amount_paid: rewardAmount,
      content_id: content_id,
      verification_data: `${engagement_type} on ${content_id}`,
      status: 'completed'
    });

    // Update contract stats
    await base44.entities.SmartContract.update(contract_id, {
      spent_amount: (contract.spent_amount || 0) + rewardAmount,
      total_participants: (contract.total_participants || 0) + 1,
      total_payouts: (contract.total_payouts || 0) + 1
    });

    return Response.json({ 
      success: true, 
      amount: rewardAmount,
      message: 'Reward processed successfully' 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});