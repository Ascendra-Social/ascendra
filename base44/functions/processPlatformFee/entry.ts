import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const PLATFORM_FEE_PERCENTAGE = 1; // 1% platform fee
const PLATFORM_WALLET_ID = Deno.env.get('PLATFORM_WALLET_ID') || 'platform_system_account';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { transaction_amount, transaction_type, description, from_user_id, to_user_id } = await req.json();

    if (!transaction_amount || transaction_amount <= 0) {
      return Response.json({ error: 'Invalid transaction amount' }, { status: 400 });
    }

    // Calculate 1% fee using integer arithmetic to avoid rounding errors
    const amountInCents = Math.round(transaction_amount * 100);
    const feeInCents = Math.floor(amountInCents * PLATFORM_FEE_PERCENTAGE / 100);
    const netInCents = amountInCents - feeInCents;
    
    const feeAmount = feeInCents / 100;
    const netAmount = netInCents / 100;
    const grossAmount = transaction_amount;

    // Get or create platform wallet
    let platformWallets = await base44.asServiceRole.entities.TokenWallet.filter({ 
      user_id: PLATFORM_WALLET_ID 
    });
    
    if (platformWallets.length === 0) {
      await base44.asServiceRole.entities.TokenWallet.create({
        user_id: PLATFORM_WALLET_ID,
        balance: feeAmount
      });
    } else {
      await base44.asServiceRole.entities.TokenWallet.update(platformWallets[0].id, {
        balance: platformWallets[0].balance + feeAmount
      });
    }

    // Audit log
    console.log('[AUDIT] Platform Fee:', {
      timestamp: new Date().toISOString(),
      transaction_type: transaction_type,
      from_user_id: from_user_id,
      to_user_id: to_user_id,
      gross_amount: grossAmount,
      fee_amount: feeAmount,
      net_amount: netAmount
    });

    // Record platform fee transaction with gross and fee tracking
    await base44.asServiceRole.entities.TokenTransaction.create({
      user_id: PLATFORM_WALLET_ID,
      type: 'earning',
      amount: feeAmount,
      gross_amount: grossAmount,
      fee_amount: feeAmount,
      description: `Platform fee (1%): ${description || transaction_type}`
    });

    // Record fee deduction from sender if specified
    if (from_user_id) {
      await base44.asServiceRole.entities.TokenTransaction.create({
        user_id: from_user_id,
        type: 'spending',
        amount: -feeAmount,
        gross_amount: grossAmount,
        fee_amount: feeAmount,
        description: `Platform fee (1%): ${description || transaction_type}`
      });
    }

    return Response.json({ 
      success: true,
      original_amount: transaction_amount,
      fee_amount: feeAmount,
      net_amount: netAmount,
      platform_wallet_id: PLATFORM_WALLET_ID
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});