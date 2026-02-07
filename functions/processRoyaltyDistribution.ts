import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { contract_id, revenue_amount } = await req.json();

    // Get contract
    const contracts = await base44.asServiceRole.entities.SmartContract.filter({ 
      id: contract_id 
    });
    if (contracts.length === 0) {
      return Response.json({ error: 'Contract not found' }, { status: 404 });
    }
    const contract = contracts[0];

    if (contract.contract_type !== 'royalty_distribution') {
      return Response.json({ error: 'Not a royalty contract' }, { status: 400 });
    }

    if (contract.status !== 'active') {
      return Response.json({ error: 'Contract not active' }, { status: 400 });
    }

    const royaltyConfig = contract.royalty_config;
    if (!royaltyConfig || !royaltyConfig.beneficiaries) {
      return Response.json({ error: 'Invalid royalty configuration' }, { status: 400 });
    }

    // Validate percentages sum to 100
    const totalPercentage = royaltyConfig.beneficiaries.reduce(
      (sum, b) => sum + b.percentage, 
      0
    );
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return Response.json({ error: 'Percentages must sum to 100' }, { status: 400 });
    }

    const payouts = [];

    // Distribute to beneficiaries
    for (const beneficiary of royaltyConfig.beneficiaries) {
      const amount = (revenue_amount * beneficiary.percentage) / 100;

      // Add to wallet
      const wallets = await base44.asServiceRole.entities.TokenWallet.filter({ 
        user_id: beneficiary.user_id 
      });
      if (wallets.length > 0) {
        await base44.asServiceRole.entities.TokenWallet.update(wallets[0].id, {
          balance: wallets[0].balance + amount
        });
      }

      // Create transaction
      await base44.asServiceRole.entities.TokenTransaction.create({
        user_id: beneficiary.user_id,
        type: 'earning',
        amount: amount,
        description: `Royalty from ${contract.contract_name} (${beneficiary.percentage}%)`
      });

      // Create payout record
      const payout = await base44.asServiceRole.entities.SmartContractPayout.create({
        contract_id: contract_id,
        user_id: beneficiary.user_id,
        user_name: beneficiary.user_name || 'Unknown',
        engagement_type: 'custom',
        amount_paid: amount,
        verification_data: `Royalty split: ${beneficiary.percentage}%`,
        status: 'completed'
      });

      payouts.push({
        user_id: beneficiary.user_id,
        percentage: beneficiary.percentage,
        amount: amount
      });
    }

    // Update contract stats
    await base44.asServiceRole.entities.SmartContract.update(contract_id, {
      spent_amount: (contract.spent_amount || 0) + revenue_amount,
      total_payouts: (contract.total_payouts || 0) + payouts.length
    });

    return Response.json({ 
      success: true,
      total_distributed: revenue_amount,
      payouts: payouts
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});