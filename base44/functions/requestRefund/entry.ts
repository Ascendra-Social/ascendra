import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * User-initiated refund request
 * 
 * Allows users to request refunds for:
 * - Content purchases
 * - Failed services
 * - Marketplace orders
 * - Subscriptions
 * 
 * Process:
 * 1. Validate refund eligibility (time window, status)
 * 2. Create refund request record
 * 3. Auto-approve if within policy OR queue for admin review
 * 4. Process refund via reverseTransaction if approved
 */

const AUTO_APPROVE_WINDOW_HOURS = 24; // Auto-approve within 24 hours
const REFUND_WINDOW_DAYS = 30; // Can request refund within 30 days

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transaction_id, reason, type } = await req.json();

    if (!transaction_id || !reason) {
      return Response.json({ 
        error: 'transaction_id and reason are required' 
      }, { status: 400 });
    }

    // 1. Fetch original transaction
    const transaction = await base44.entities.TokenTransaction.get(transaction_id);

    if (!transaction) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // 2. Verify ownership
    if (transaction.user_id !== user.id) {
      return Response.json({ error: 'Not your transaction' }, { status: 403 });
    }

    // 3. Check if already reversed or pending refund
    if (transaction.status === 'reversed') {
      return Response.json({ error: 'Transaction already refunded' }, { status: 400 });
    }

    // Check for existing refund request
    const existingRequests = await base44.entities.TokenTransaction.filter({
      reference_id: transaction_id,
      type: 'refund_request'
    });

    if (existingRequests.length > 0) {
      return Response.json({ error: 'Refund already requested' }, { status: 400 });
    }

    // 4. Validate refund window
    const transactionDate = new Date(transaction.created_date);
    const now = new Date();
    const hoursSinceTransaction = (now - transactionDate) / (1000 * 60 * 60);
    const daysSinceTransaction = hoursSinceTransaction / 24;

    if (daysSinceTransaction > REFUND_WINDOW_DAYS) {
      return Response.json({ 
        error: `Refund window expired. Refunds are only available within ${REFUND_WINDOW_DAYS} days.` 
      }, { status: 400 });
    }

    // 5. Validate transaction type is refundable
    const refundableTypes = ['spending', 'purchase', 'transfer_out'];
    if (!refundableTypes.includes(transaction.type)) {
      return Response.json({ 
        error: `Transaction type '${transaction.type}' is not refundable` 
      }, { status: 400 });
    }

    // 6. Determine auto-approval eligibility
    const autoApprove = hoursSinceTransaction <= AUTO_APPROVE_WINDOW_HOURS;

    // 7. Create refund request record
    const refundRequest = await base44.entities.TokenTransaction.create({
      user_id: user.id,
      type: 'refund_request',
      amount: 0, // No balance change yet
      description: `Refund request: ${reason}`,
      reference_id: transaction_id,
      status: autoApprove ? 'approved' : 'pending'
    });

    // 8. If auto-approved, process refund immediately
    if (autoApprove) {
      const reversalResult = await base44.functions.invoke('reverseTransaction', {
        transaction_id,
        reason: `Auto-approved refund: ${reason}`
      });

      if (reversalResult.data.success) {
        // Update refund request status
        await base44.entities.TokenTransaction.update(refundRequest.id, {
          status: 'completed'
        });

        return Response.json({
          success: true,
          refund_status: 'approved',
          refund_request_id: refundRequest.id,
          reversal_transaction_id: reversalResult.data.reversal_transaction_id,
          refunded_amount: reversalResult.data.reversed_amount,
          message: 'Refund approved and processed automatically'
        });
      } else {
        // Reversal failed - mark request as failed
        await base44.entities.TokenTransaction.update(refundRequest.id, {
          status: 'failed'
        });

        return Response.json({
          error: 'Refund processing failed',
          details: reversalResult.data.error
        }, { status: 500 });
      }
    }

    // 9. Queue for admin review
    return Response.json({
      success: true,
      refund_status: 'pending_review',
      refund_request_id: refundRequest.id,
      message: 'Refund request submitted for review. You will be notified once processed.',
      estimated_review_time: '24-48 hours'
    });

  } catch (error) {
    console.error('Refund request error:', error);
    return Response.json({ 
      error: error.message || 'Failed to process refund request',
      details: error.stack
    }, { status: 500 });
  }
});