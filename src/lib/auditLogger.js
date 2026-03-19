/**
 * Centralized Audit Logging System
 * 
 * Provides consistent audit trail for all financial operations.
 * 
 * Usage:
 * import { AuditLogger } from '@/lib/auditLogger';
 * 
 * const logger = new AuditLogger(base44, user, request);
 * 
 * await logger.log({
 *   event_type: 'transaction_created',
 *   target_id: transaction.id,
 *   target_type: 'transaction',
 *   action: 'User purchased content',
 *   amount: 100,
 *   before_state: { balance: 1000 },
 *   after_state: { balance: 900 }
 * });
 */

export class AuditLogger {
  constructor(base44, user, request = null) {
    this.base44 = base44;
    this.user = user;
    this.request = request;
    this.requestId = this.generateRequestId();
  }

  /**
   * Generate unique request ID for correlation
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract metadata from request
   */
  extractMetadata() {
    if (!this.request) return {};

    const headers = this.request.headers;
    
    return {
      ip_address: headers.get('x-forwarded-for') || 
                  headers.get('x-real-ip') || 
                  'unknown',
      user_agent: headers.get('user-agent') || 'unknown',
      referer: headers.get('referer') || null,
      origin: headers.get('origin') || null
    };
  }

  /**
   * Log an audit event
   */
  async log(event) {
    try {
      const metadata = this.extractMetadata();

      const auditLog = {
        event_type: event.event_type,
        actor_id: this.user?.id || 'system',
        actor_name: this.user?.full_name || 'System',
        actor_role: this.user?.role || 'system',
        target_id: event.target_id,
        target_type: event.target_type,
        action: event.action,
        amount: event.amount || null,
        before_state: event.before_state || null,
        after_state: event.after_state || null,
        metadata: {
          ...metadata,
          ...event.metadata
        },
        reason: event.reason || null,
        status: event.status || 'success',
        error_message: event.error_message || null,
        ip_address: metadata.ip_address,
        user_agent: metadata.user_agent,
        request_id: this.requestId
      };

      await this.base44.asServiceRole.entities.AuditLog.create(auditLog);

      return auditLog;
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Don't throw - audit logging failures shouldn't break business logic
    }
  }

  /**
   * Log transaction creation
   */
  async logTransaction(transaction, beforeWallet, afterWallet) {
    return this.log({
      event_type: 'transaction_created',
      target_id: transaction.id,
      target_type: 'transaction',
      action: `Created ${transaction.type} transaction: ${transaction.description}`,
      amount: transaction.amount,
      before_state: { 
        wallet_balance: beforeWallet?.balance,
        wallet_version: beforeWallet?.version
      },
      after_state: { 
        wallet_balance: afterWallet?.balance,
        wallet_version: afterWallet?.version,
        transaction_status: transaction.status
      },
      metadata: {
        transaction_type: transaction.type,
        reference_id: transaction.reference_id
      }
    });
  }

  /**
   * Log transaction reversal
   */
  async logReversal(originalTx, reversalTx, reason) {
    return this.log({
      event_type: 'transaction_reversed',
      target_id: originalTx.id,
      target_type: 'transaction',
      action: `Reversed transaction: ${originalTx.description}`,
      amount: reversalTx.amount,
      reason,
      before_state: { status: originalTx.status },
      after_state: { 
        status: 'reversed',
        reversal_transaction_id: reversalTx.id
      },
      metadata: {
        original_amount: originalTx.amount,
        reversal_amount: reversalTx.amount
      }
    });
  }

  /**
   * Log wallet update
   */
  async logWalletUpdate(walletId, beforeBalance, afterBalance, reason) {
    return this.log({
      event_type: 'wallet_updated',
      target_id: walletId,
      target_type: 'wallet',
      action: `Wallet balance updated: ${beforeBalance} → ${afterBalance}`,
      amount: afterBalance - beforeBalance,
      reason,
      before_state: { balance: beforeBalance },
      after_state: { balance: afterBalance }
    });
  }

  /**
   * Log refund request
   */
  async logRefundRequest(transactionId, amount, reason, status = 'pending') {
    return this.log({
      event_type: 'refund_requested',
      target_id: transactionId,
      target_type: 'refund',
      action: `Refund requested for transaction ${transactionId}`,
      amount,
      reason,
      status
    });
  }

  /**
   * Log admin action
   */
  async logAdminAction(action, targetId, targetType, reason, changes = {}) {
    return this.log({
      event_type: 'admin_override',
      target_id: targetId,
      target_type: targetType,
      action,
      reason,
      before_state: changes.before,
      after_state: changes.after,
      metadata: {
        is_admin_action: true
      }
    });
  }

  /**
   * Log security alert
   */
  async logSecurityAlert(alert, targetId, targetType, severity = 'medium') {
    return this.log({
      event_type: 'security_alert',
      target_id: targetId,
      target_type: targetType,
      action: alert,
      status: 'pending',
      metadata: {
        severity,
        requires_review: true
      }
    });
  }

  /**
   * Log purchase
   */
  async logPurchase(purchaseId, amount, itemType, itemId) {
    return this.log({
      event_type: 'purchase_completed',
      target_id: purchaseId,
      target_type: 'purchase',
      action: `Purchased ${itemType} (${itemId}) for ${amount} tokens`,
      amount,
      metadata: {
        item_type: itemType,
        item_id: itemId
      }
    });
  }

  /**
   * Log contract milestone
   */
  async logMilestone(contractId, milestoneId, amount, status) {
    return this.log({
      event_type: 'contract_milestone_completed',
      target_id: milestoneId,
      target_type: 'contract',
      action: `Milestone completed: ${amount} tokens paid`,
      amount,
      status,
      metadata: {
        contract_id: contractId
      }
    });
  }
}

/**
 * Helper function to create audit logger instance
 */
export function createAuditLogger(base44, user, request = null) {
  return new AuditLogger(base44, user, request);
}

/**
 * Middleware to automatically log all backend function calls
 */
export async function auditLogMiddleware(req, handler) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  const logger = new AuditLogger(base44, user, req);

  try {
    const result = await handler(base44, user, logger);
    return result;
  } catch (error) {
    // Log the error
    await logger.log({
      event_type: 'security_alert',
      target_type: 'system',
      action: 'Function execution failed',
      status: 'failed',
      error_message: error.message,
      metadata: {
        stack: error.stack
      }
    });
    throw error;
  }
}