import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * Reverse/rollback a completed transaction
 * 
 * Use cases:
 * - Failed purchase after wallet deduction
 * - Refund requests
 * - Error recovery
 * - Dispute resolution
 * 
 * Process:
 * 1. Validate original transaction exists and is reversible
 * 2. Create reversal transaction records
 * 3. Restore wallet balances using optimistic locking
 * 4. Update original transaction status to 'reversed'
 * 5. Handle platform fee reversal if applicable
 */

const PLATFORM_WALLET_ID = Deno.env.get('PLATFORM_WALLET_ID');
const MAX_REVERSAL_RETRIES = 3;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transaction_id, reason } = await req.json();

    if (!transaction_id) {
      return Response.json({ error: 'transaction_id is required' }, { status: 400 });
    }

    // 1. Fetch original transaction
    const originalTx = await base44.asServiceRole.entities.TokenTransaction.get(transaction_id);

    if (!originalTx) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // 2. Validate transaction is reversible
    if (originalTx.status === 'reversed') {
      return Response.json({ error: 'Transaction already reversed' }, { status: 400 });
    }

    if (originalTx.status === 'failed') {
      return Response.json({ error: 'Cannot reverse failed transaction' }, { status: 400 });
    }

    // Only admin or the transaction owner can reverse
    const canReverse = user.role === 'admin' || user.id === originalTx.user_id;
    if (!canReverse) {
      return Response.json({ error: 'Unauthorized to reverse this transaction' }, { status: 403 });
    }

    // 3. Determine reversal amounts
    const reversalAmount = originalTx.amount; // Net amount
    const reversalGrossAmount = originalTx.gross_amount || originalTx.amount;
    const reversalFeeAmount = originalTx.fee_amount || 0;

    // 4. Reverse wallet balances with retry logic
    const reverseWalletBalance = async (userId, amount, retryCount = 0) => {
      try {
        const wallets = await base44.asServiceRole.entities.TokenWallet.filter({
          user_id: userId
        });

        if (!wallets.length) {
          throw new Error(`Wallet not found for user ${userId}`);
        }

        const wallet = wallets.reduce((max, w) => w.balance > max.balance ? w : max);

        // Restore balance (reverse the original operation)
        const newBalance = wallet.balance - amount; // Invert the original operation
        const newVersion = wallet.version + 1;

        await base44.asServiceRole.entities.TokenWallet.update(wallet.id, {
          balance: newBalance,
          version: newVersion,
          updated_date: new Date().toISOString()
        });

        return { wallet, newBalance };
      } catch (error) {
        if (retryCount < MAX_REVERSAL_RETRIES && error.message.includes('Version')) {
          // Retry on version conflict
          await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, retryCount)));
          return reverseWalletBalance(userId, amount, retryCount + 1);
        }
        throw error;
      }
    };

    // 5. Create reversal transaction records
    const reversalDescription = `Reversal of transaction ${transaction_id}${reason ? `: ${reason}` : ''}`;

    // Reverse the user's transaction
    const userReversalTx = await base44.asServiceRole.entities.TokenTransaction.create({
      user_id: originalTx.user_id,
      type: originalTx.type === 'spending' ? 'refund' : 'reversal',
      amount: -reversalAmount, // Opposite sign
      gross_amount: -reversalGrossAmount,
      fee_amount: -reversalFeeAmount,
      description: reversalDescription,
      reference_id: transaction_id,
      status: 'completed'
    });

    // 6. Reverse wallet balance
    await reverseWalletBalance(originalTx.user_id, reversalAmount);

    // 7. Reverse platform fee if applicable
    if (reversalFeeAmount > 0 && PLATFORM_WALLET_ID) {
      await reverseWalletBalance(PLATFORM_WALLET_ID, reversalFeeAmount);

      await base44.asServiceRole.entities.TokenTransaction.create({
        user_id: PLATFORM_WALLET_ID,
        type: 'fee_reversal',
        amount: -reversalFeeAmount,
        description: `Fee reversal for ${reversalDescription}`,
        reference_id: transaction_id,
        status: 'completed'
      });
    }

    // 8. Handle counterparty reversal (for transfers, tips, purchases)
    if (['transfer_out', 'tip', 'purchase'].includes(originalTx.type)) {
      // Find the counterparty transaction
      const counterpartyTxs = await base44.asServiceRole.entities.TokenTransaction.filter({
        reference_id: originalTx.reference_id,
        type: originalTx.type === 'transfer_out' ? 'transfer_in' : 
              originalTx.type === 'tip' ? 'creator_reward' : 'sale'
      });

      if (counterpartyTxs.length > 0) {
        const counterpartyTx = counterpartyTxs[0];

        // Reverse counterparty balance
        await reverseWalletBalance(counterpartyTx.user_id, counterpartyTx.amount);

        // Create counterparty reversal record
        await base44.asServiceRole.entities.TokenTransaction.create({
          user_id: counterpartyTx.user_id,
          type: 'reversal',
          amount: -counterpartyTx.amount,
          gross_amount: -(counterpartyTx.gross_amount || counterpartyTx.amount),
          fee_amount: -(counterpartyTx.fee_amount || 0),
          description: `Reversal of ${counterpartyTx.type} transaction`,
          reference_id: transaction_id,
          status: 'completed'
        });

        // Mark counterparty transaction as reversed
        await base44.asServiceRole.entities.TokenTransaction.update(counterpartyTx.id, {
          status: 'reversed',
          updated_date: new Date().toISOString()
        });
      }
    }

    // 9. Mark original transaction as reversed
    await base44.asServiceRole.entities.TokenTransaction.update(transaction_id, {
      status: 'reversed',
      updated_date: new Date().toISOString()
    });

    // 10. Create audit log
    await base44.asServiceRole.entities.TokenTransaction.create({
      user_id: user.id,
      type: 'admin_action',
      amount: 0,
      description: `Admin ${user.full_name} reversed transaction ${transaction_id}${reason ? `: ${reason}` : ''}`,
      reference_id: transaction_id,
      status: 'completed'
    });

    return Response.json({
      success: true,
      reversal_transaction_id: userReversalTx.id,
      original_transaction_id: transaction_id,
      reversed_amount: reversalAmount,
      reversed_fee: reversalFeeAmount,
      message: 'Transaction reversed successfully'
    });

  } catch (error) {
    console.error('Transaction reversal error:', error);
    return Response.json({ 
      error: error.message || 'Failed to reverse transaction',
      details: error.stack
    }, { status: 500 });
  }
});