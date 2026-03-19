import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from 'npm:@solana/web3.js@1.87.6';

/**
 * Verify Blockchain State Integration
 * 
 * Periodically checks that database state matches blockchain state:
 * - Validates payout transaction hashes exist on-chain
 * - Confirms wallet balances match blockchain
 * - Detects and reports state mismatches
 * - Auto-reconciles where possible
 * 
 * Should be run as a scheduled automation (e.g., hourly)
 */

const SOLANA_RPC_ENDPOINT = 'https://api.devnet.solana.com'; // Change to mainnet in production

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admin can run verification
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const connection = new Connection(SOLANA_RPC_ENDPOINT, 'confirmed');

    const results = {
      timestamp: new Date().toISOString(),
      checks_performed: 0,
      issues_found: [],
      reconciled: [],
      summary: {
        total_payouts: 0,
        verified_payouts: 0,
        failed_payouts: 0,
        missing_tx_hash: 0,
        wallet_mismatches: 0
      }
    };

    // 1. Verify Smart Contract Payouts
    const payouts = await base44.asServiceRole.entities.SmartContractPayout.filter({
      status: 'completed'
    }, '-created_date', 100);

    results.summary.total_payouts = payouts.length;

    for (const payout of payouts) {
      results.checks_performed++;

      // Check if transaction hash exists
      if (!payout.transaction_hash) {
        results.summary.missing_tx_hash++;
        results.issues_found.push({
          type: 'missing_transaction_hash',
          payout_id: payout.id,
          amount: payout.amount,
          recipient_id: payout.recipient_id,
          severity: 'high',
          message: 'Payout marked completed but no blockchain transaction hash'
        });
        continue;
      }

      try {
        // Verify transaction exists on-chain
        const tx = await connection.getTransaction(payout.transaction_hash, {
          maxSupportedTransactionVersion: 0
        });

        if (!tx) {
          results.summary.failed_payouts++;
          results.issues_found.push({
            type: 'transaction_not_found',
            payout_id: payout.id,
            transaction_hash: payout.transaction_hash,
            severity: 'critical',
            message: 'Transaction hash not found on blockchain'
          });

          // Auto-update payout status to failed
          await base44.asServiceRole.entities.SmartContractPayout.update(payout.id, {
            status: 'failed',
            error_message: 'Transaction not found on blockchain'
          });

          results.reconciled.push({
            payout_id: payout.id,
            action: 'marked_as_failed',
            reason: 'Transaction not found on-chain'
          });

          continue;
        }

        // Check if transaction failed on-chain
        if (tx.meta?.err) {
          results.summary.failed_payouts++;
          results.issues_found.push({
            type: 'transaction_failed_on_chain',
            payout_id: payout.id,
            transaction_hash: payout.transaction_hash,
            error: tx.meta.err,
            severity: 'high',
            message: 'Transaction failed on blockchain but marked as completed in DB'
          });

          // Update payout status
          await base44.asServiceRole.entities.SmartContractPayout.update(payout.id, {
            status: 'failed',
            error_message: JSON.stringify(tx.meta.err)
          });

          results.reconciled.push({
            payout_id: payout.id,
            action: 'marked_as_failed',
            reason: 'Transaction failed on-chain',
            error: tx.meta.err
          });

          continue;
        }

        // Verify amount matches
        if (tx.meta?.postBalances && tx.meta?.preBalances) {
          // Calculate transferred amount (this is simplified - real implementation needs token account parsing)
          const transferredLamports = Math.abs(
            tx.meta.postBalances[1] - tx.meta.preBalances[1]
          );
          const transferredTokens = transferredLamports / LAMPORTS_PER_SOL;

          // Allow small rounding differences
          const amountDiff = Math.abs(transferredTokens - payout.amount);
          if (amountDiff > 0.001) {
            results.issues_found.push({
              type: 'amount_mismatch',
              payout_id: payout.id,
              db_amount: payout.amount,
              blockchain_amount: transferredTokens,
              difference: amountDiff,
              severity: 'medium',
              message: 'Payout amount in DB does not match blockchain transfer'
            });
          }
        }

        results.summary.verified_payouts++;

      } catch (error) {
        results.issues_found.push({
          type: 'verification_error',
          payout_id: payout.id,
          error: error.message,
          severity: 'medium',
          message: 'Error verifying transaction on blockchain'
        });
      }
    }

    // 2. Verify Wallet Balances (sample check)
    const wallets = await base44.asServiceRole.entities.TokenWallet.filter({}, '-updated_date', 10);

    for (const wallet of wallets) {
      if (!wallet.wallet_address) continue;

      results.checks_performed++;

      try {
        const publicKey = new PublicKey(wallet.wallet_address);
        const balance = await connection.getBalance(publicKey);
        const onChainTokens = balance / LAMPORTS_PER_SOL;

        // Allow 1% difference for fees and timing
        const threshold = wallet.balance * 0.01;
        const diff = Math.abs(wallet.balance - onChainTokens);

        if (diff > threshold) {
          results.summary.wallet_mismatches++;
          results.issues_found.push({
            type: 'wallet_balance_mismatch',
            wallet_id: wallet.id,
            user_id: wallet.user_id,
            db_balance: wallet.balance,
            blockchain_balance: onChainTokens,
            difference: diff,
            severity: 'high',
            message: 'Wallet balance in DB does not match blockchain'
          });
        }

      } catch (error) {
        // Wallet might not exist on-chain yet, which is OK
        if (!error.message.includes('Invalid public key')) {
          results.issues_found.push({
            type: 'wallet_verification_error',
            wallet_id: wallet.id,
            error: error.message,
            severity: 'low',
            message: 'Error verifying wallet on blockchain'
          });
        }
      }
    }

    // 3. Check for stale pending payouts
    const pendingPayouts = await base44.asServiceRole.entities.SmartContractPayout.filter({
      status: 'pending'
    });

    const staleThresholdMs = 60 * 60 * 1000; // 1 hour
    const now = new Date();

    for (const payout of pendingPayouts) {
      const age = now - new Date(payout.created_date);
      if (age > staleThresholdMs) {
        results.issues_found.push({
          type: 'stale_pending_payout',
          payout_id: payout.id,
          age_hours: Math.round(age / (60 * 60 * 1000)),
          severity: 'medium',
          message: 'Payout has been pending for over 1 hour'
        });
      }
    }

    // Generate summary report
    const report = {
      ...results,
      health_score: calculateHealthScore(results),
      recommendations: generateRecommendations(results)
    };

    // Log verification to audit trail
    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'security_alert',
      actor_id: 'system',
      actor_name: 'Blockchain Verification System',
      actor_role: 'system',
      target_type: 'system',
      action: 'Blockchain state verification completed',
      metadata: {
        checks_performed: results.checks_performed,
        issues_found: results.issues_found.length,
        reconciled: results.reconciled.length,
        health_score: report.health_score
      },
      status: results.issues_found.length === 0 ? 'success' : 'pending'
    });

    return Response.json(report);

  } catch (error) {
    console.error('Blockchain verification error:', error);
    return Response.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});

function calculateHealthScore(results) {
  const totalChecks = results.checks_performed;
  if (totalChecks === 0) return 100;

  const criticalIssues = results.issues_found.filter(i => i.severity === 'critical').length;
  const highIssues = results.issues_found.filter(i => i.severity === 'high').length;
  const mediumIssues = results.issues_found.filter(i => i.severity === 'medium').length;

  const score = 100 - (
    (criticalIssues * 20) +
    (highIssues * 10) +
    (mediumIssues * 5)
  );

  return Math.max(0, score);
}

function generateRecommendations(results) {
  const recommendations = [];

  if (results.summary.missing_tx_hash > 0) {
    recommendations.push({
      priority: 'high',
      action: 'Investigate payouts without transaction hashes',
      details: `${results.summary.missing_tx_hash} completed payouts are missing blockchain transaction references`
    });
  }

  if (results.summary.failed_payouts > 0) {
    recommendations.push({
      priority: 'critical',
      action: 'Review failed blockchain transactions',
      details: `${results.summary.failed_payouts} payouts have failed or missing transactions`
    });
  }

  if (results.summary.wallet_mismatches > 0) {
    recommendations.push({
      priority: 'high',
      action: 'Reconcile wallet balances',
      details: `${results.summary.wallet_mismatches} wallets show balance discrepancies with blockchain`
    });
  }

  const stalePayouts = results.issues_found.filter(i => i.type === 'stale_pending_payout').length;
  if (stalePayouts > 0) {
    recommendations.push({
      priority: 'medium',
      action: 'Process stale pending payouts',
      details: `${stalePayouts} payouts have been pending for over 1 hour`
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'info',
      action: 'All systems operational',
      details: 'No issues detected. Database state matches blockchain.'
    });
  }

  return recommendations;
}